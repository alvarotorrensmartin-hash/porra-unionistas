import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(_: Request, { params }: { params: { id: string }}) {
  const id = Number(params.id);
  const matches = await prisma.match.findMany({ where: { matchdayId: id }, orderBy: { startsAt: 'asc' } });
  if (!matches.length) return NextResponse.json({ error: 'No matches' }, { status: 400 });
  const cutoffAt = new Date(matches[0].startsAt.getTime() - 15*60*1000);
  const users = await prisma.user.findMany({ where: { isActive: true } });

  for (const u of users) {
    const count = await prisma.prediction.count({ where: { userId: u.id, match: { matchdayId: id, homeTeam: { isUnionistas: false }, awayTeam: { isUnionistas: false } } } });
    if (count < 9) {
      // Marking "no presentado" conceptually; you could store a row in settlements or a log.
      console.log(`[CLOSE] User ${u.email} NO PRESENTADO en matchday ${id}`);
    }
  }
  return NextResponse.json({ ok: true, cutoffAt });
}
