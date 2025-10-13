// src/app/api/predictions/bulk/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/supabaseServer';

// Espera body: { matchdayId: number, picks: Array<{ matchId: number, predSign: 'ONE'|'X'|'TWO' }> }
export async function POST(req: Request) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ ok: false, error: 'UNAUTHENTICATED' }, { status: 401 });
    }

    const body = await req.json();
    const matchdayId = Number(body.matchdayId);
    const picks = Array.isArray(body.picks) ? body.picks : [];

    if (!matchdayId || picks.length === 0) {
      return NextResponse.json({ ok: false, error: 'BAD_REQUEST' }, { status: 400 });
    }

    // Validar que todos los matches pertenecen a esa jornada
    const validMatchIds = new Set(
      (
        await prisma.match.findMany({
          where: { matchdayId },
          select: { id: true },
        })
      ).map((m) => m.id)
    );

    let count = 0;
    for (const p of picks) {
      const matchId = Number(p.matchId);
      const predSign = p.predSign as 'ONE' | 'X' | 'TWO';
      if (!validMatchIds.has(matchId)) continue;
      if (!['ONE', 'X', 'TWO'].includes(predSign)) continue;

      // IMPORTANTE: el where debe usar el nombre real del índice único compuesto
      // En tu schema es: @@unique([userId, matchId])  => Prisma lo llama userId_matchId
      await prisma.prediction.upsert({
        where: { userId_matchId: { userId: user.id, matchId } },
        update: { predSign },
        create: { userId: user.id, matchId, predSign },
      });
      count++;
    }

    return NextResponse.json({ ok: true, saved: count });
  } catch (e: any) {
    console.error('bulk predictions error', e);
    return NextResponse.json({ ok: false, error: 'INTERNAL' }, { status: 500 });
  }
}
