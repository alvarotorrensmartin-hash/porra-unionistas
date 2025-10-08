import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const Body = z.object({
  matchdayId: z.number(),
  picks: z.array(z.object({
    matchId: z.number(),
    predSign: z.enum(['ONE','X','TWO'])
  }))
});

export async function POST(req: Request) {
  try {
    const body = Body.parse(await req.json());
    // TODO: replace with authenticated user
    const user = await prisma.user.findFirst({ where: { email: 'admin@unionistas.com' }});
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 });

    // Check cutoff
    const matches = await prisma.match.findMany({
      where: { matchdayId: body.matchdayId },
      orderBy: { startsAt: 'asc' }
    });
    if (!matches.length) return NextResponse.json({ error: 'No matches' }, { status: 400 });
    const cutoffAt = new Date(matches[0].startsAt.getTime() - 15*60*1000);
    if (new Date() >= cutoffAt) {
      return NextResponse.json({ error: 'Closed by cutoff' }, { status: 403 });
    }

    for (const p of body.picks) {
      await prisma.prediction.upsert({
        where: { matchId_userId: { matchId: p.matchId, userId: user.id } },
        update: { predSign: p.predSign },
        create: { matchId: p.matchId, userId: user.id, predSign: p.predSign }
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e:any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
