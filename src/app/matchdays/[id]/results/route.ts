// src/app/api/matchdays/[id]/results/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import type { Sign } from '@prisma/client';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const mdId = Number(params.id);

  const form = await req.formData();
  const matchIds = form.getAll('matchId') as string[];
  const results = form.getAll('result') as string[];

  for (let i = 0; i < matchIds.length; i++) {
    const matchId = Number(matchIds[i]);
    const r = results[i];

    const val: Sign | null =
      r === 'ONE' ? 'ONE' : r === 'TWO' ? 'TWO' : r === 'X' ? 'X' : null;

    await prisma.match.update({
      where: { id: matchId },
      data: { result: val },
    });
  }

  // Opcional: revalidar la página de la jornada
  revalidatePath(`/matchdays/${mdId}`);

  // Volver a la página de la jornada
  return NextResponse.redirect(new URL(`/matchdays/${mdId}`, req.url), 303);
}
