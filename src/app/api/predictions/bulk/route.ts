import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Sign } from '@prisma/client';

// Normaliza valores que puedan venir del front
function normalizeSign(v: string): Sign | null {
  const s = v.toUpperCase();
  if (s === 'ONE' || s === '_1' || s === '1') return 'ONE';
  if (s === 'X') return 'X';
  if (s === 'TWO' || s === '_2' || s === '2') return 'TWO';
  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      matchdayId: number;
      picks: { matchId: number; predSign: string }[];
    };

    // Autenticación (Supabase SSR)
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options, maxAge: 0 });
          },
        },
      }
    );

    const { data: auth } = await supabase.auth.getUser();
    const email = auth.user?.email?.toLowerCase();
    if (!email) {
      return NextResponse.json({ ok: false, error: 'NO_AUTH' }, { status: 401 });
    }

    // Buscar/crear el usuario interno
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        displayName: email,
      },
      select: { id: true },
    });

    // Validación básica
    if (!Array.isArray(body.picks) || body.picks.length === 0) {
      return NextResponse.json({ ok: false, error: 'NO_PICKS' }, { status: 400 });
    }

    // Upsert de cada pick usando la clave compuesta CORRECTA: userId_matchId
    for (const p of body.picks) {
      const sign = normalizeSign(p.predSign);
      if (!sign) continue;

      await prisma.prediction.upsert({
        where: { userId_matchId: { userId: user.id, matchId: p.matchId } },
        update: { predSign: sign },
        create: { userId: user.id, matchId: p.matchId, predSign: sign },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('bulk predictions error', e);
    return NextResponse.json({ ok: false, error: 'SERVER_ERROR' }, { status: 500 });
  }
}
