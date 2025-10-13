// src/app/api/matchdays/[id]/settle/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendMail } from '@/lib/mailer';
import type { Sign } from '@prisma/client';

const ECON = {
  poolBase: 15.0,
  worstSingle: 10.0,
  secondSingle: 5.0,
  worstTiedSplit: 7.5,
};

type RouteCtx = { params: { id: string } };

export async function GET(_req: Request, ctx: RouteCtx) {
  const idNum = Number(ctx.params.id);
  if (!Number.isFinite(idNum)) {
    return NextResponse.json({ ok: false, error: 'Matchday id inválido' }, { status: 400 });
  }

  // 1) Partidos de la jornada que NO incluyen a Unionistas (solo campos necesarios)
  const matches = await prisma.match.findMany({
    where: {
      matchdayId: idNum,
      NOT: {
        OR: [
          { homeTeam: { isUnionistas: true } },
          { awayTeam: { isUnionistas: true } },
        ],
      },
    },
    select: {
      id: true,
      result: true, // Sign | null
    },
  });

  if (!matches.length) {
    return NextResponse.json({ ok: true, worst: [], second: [], note: 'No hay partidos válidos' });
  }

  // Mapa matchId -> resultado real (solo si existe)
  const realSigns = new Map<number, Sign>();
  for (const m of matches) {
    if (m.result) realSigns.set(m.id, m.result);
  }

  // 2) Usuarios activos
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, email: true, displayName: true },
  });

  if (!users.length) {
    return NextResponse.json({ ok: true, worst: [], second: [], note: 'No hay usuarios activos' });
  }

  // 3) Para cada usuario, contamos picks y puntos comparando con realSigns
  type Tot = {
    userId: string;
    email: string;
    display: string;
    points: number;
    picks: number;
  };

  const totals: Tot[] = [];

  for (const u of users) {
    const preds = await prisma.prediction.findMany({
      where: {
        userId: u.id,
        match: {
          matchdayId: idNum,
          NOT: {
            OR: [
              { homeTeam: { isUnionistas: true } },
              { awayTeam: { isUnionistas: true } },
            ],
          },
        },
      },
      select: { matchId: true, predSign: true },
    });

    let points = 0;
    for (const p of preds) {
      const real = realSigns.get(p.matchId);
      if (real && p.predSign === real) points += 1;
    }

    totals.push({
      userId: u.id,
      email: u.email,
      display: u.displayName ?? u.email,
      points,
      picks: preds.length,
    });
  }

  // 4) Reglas de perdedores (MVP)
  const notPresented = totals.filter((t) => t.picks < 9);
  let worstGroup: Tot[] = [];
  let secondGroup: Tot[] = [];

  if (notPresented.length > 0) {
    worstGroup = notPresented;

    const presented = totals.filter((t) => t.picks >= 9);
    if (presented.length > 0) {
      const minPts = Math.min(...presented.map((t) => t.points));
      secondGroup = presented.filter((t) => t.points === minPts);
    }
  } else {
    const minPts = Math.min(...totals.map((t) => t.points));
    worstGroup = totals.filter((t) => t.points === minPts);

    if (worstGroup.length === 1) {
      const remaining = totals.filter((t) => t.points !== minPts);
      if (remaining.length > 0) {
        const secondMin = Math.min(...remaining.map((t) => t.points));
        secondGroup = remaining.filter((t) => t.points === secondMin);
      }
    }
  }

  // 5) Importes
  let worstAmount = 0;
  let secondAmount = 0;

  if (notPresented.length > 0) {
    worstAmount = ECON.worstTiedSplit;
    secondAmount = secondGroup.length ? ECON.secondSingle : 0;
  } else {
    if (worstGroup.length >= 2) {
      worstAmount = ECON.worstTiedSplit;
      secondAmount = 0;
    } else {
      worstAmount = ECON.worstSingle;
      secondAmount = secondGroup.length ? ECON.secondSingle : 0;
    }
  }

  // 6) Info jornada para el asunto de los mails
  const md = await prisma.matchday.findUnique({
    where: { id: idNum },
    select: { number: true, season: true },
  });

  const title = `Liquidación Jornada ${md?.number ?? ''} (${md?.season ?? ''})`;

  // 7) Emails (no bloquear por fallo)
  const tasks: Promise<unknown>[] = [];

  if (worstGroup.length) {
    tasks.push(
      sendMail(
        worstGroup.map((x) => x.email),
        `${title} – Te toca pagar (peor resultado)`,
        `<p>Has quedado en el grupo de <strong>peor resultado</strong> esta jornada.</p>
         <p>Importe a pagar: <strong>${worstAmount.toFixed(2)} €</strong></p>`
      )
    );
  }

  if (secondGroup.length) {
    tasks.push(
      sendMail(
        secondGroup.map((x) => x.email),
        `${title} – Te toca pagar (segundo peor)`,
        `<p>Has quedado en el grupo de <strong>segundo peor resultado</strong> esta jornada.</p>
         <p>Importe a pagar: <strong>${secondAmount.toFixed(2)} €</strong></p>`
      )
    );
  }

  const resumen = totals
    .map((t) => `${t.display}: ${t.points} pts${t.picks < 9 ? ' (no presentado)' : ''}`)
    .join('<br>');

  tasks.push(
    sendMail(
      users.map((u) => u.email),
      `${title} – Resumen`,
      `<p>Resumen de puntos:</p><p>${resumen}</p>`
    )
  );

  await Promise.allSettled(tasks);

  return NextResponse.json({
    ok: true,
    worst: worstGroup.map((x) => ({ user: x.display, amount: worstAmount })),
    second: secondGroup.map((x) => ({ user: x.display, amount: secondAmount })),
  });
}
