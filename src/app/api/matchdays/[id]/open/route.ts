import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(_: Request, { params }: { params: { id: string }}) {
  const id = Number(params.id);
  // In a real app you'd set a flag like "isOpen". Here we just simulate sending notifications.
  console.log(`[OPEN] Matchday ${id}: Jornada disponible`);
  return NextResponse.json({ ok: true, message: 'Jornada disponible' });
}
