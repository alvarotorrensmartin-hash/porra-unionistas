import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { Sign } from '@prisma/client';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const matchdayId: number | undefined =
      typeof body?.matchdayId === 'number' ? body.matchdayId : undefined;

    // 1) Seleccionamos partidos a recalcular (sólo de esa jornada si viene)
    const matchWhere = matchdayId
      ? {
          matchdayId,
          NOT: {
            OR: [
              { homeTeam: { isUnionistas: true } },
              { awayTeam: { isUnionistas: true } },
            ],
          },
        }
      : {
          NOT: {
            OR: [
              { homeTeam: { isUnionistas: true } },
              { awayTeam: { isUnionistas: true } },
            ],
          },
        };

    const matches = await prisma.match.findMany({
      where: matchWhere,
      select: { id: true, result: true }, // result: Sign | null
    });

    // 2) Mapa matchId -> resultado real
    const real = new Map<number, Sign>();
    for (const m of matches) {
      if (m.result) real.set(m.id, m.result);
    }

    // 3) Predicciones afectadas (filtradas por esos partidos)
    const matchIds = matches.map(m => m.id);
    if (matchIds.length === 0) {
      return NextResponse.json({ ok: true, updated: 0 });
    }

    const preds = await prisma.prediction.findMany({
      where: { matchId: { in: matchIds } },
      select: { id: true, matchId: true, predSign: true },
    });

    // 4) Borrar puntuaciones previas de esas predicciones
    await prisma.predictionScore.deleteMany({
      where: { predictionId: { in: preds.map(p => p.id) } },
    });

    // 5) Insertar puntuaciones nuevas
    let inserted = 0;
    for (const p of preds) {
      const r = real.get(p.matchId);
      if (!r) continue;
      const pts = p.predSign === r ? 1 : 0;
      await prisma.predictionScore.create({
        data: { predictionId: p.id, points: pts },
      });
      inserted++;
    }

    return NextResponse.json({ ok: true, updated: inserted });
  } catch (err) {
    console.error('[scores/recalc] ERROR', err);
    return NextResponse.json({ ok: false, error: 'recalc_failed' }, { status: 500 });
  }
}
