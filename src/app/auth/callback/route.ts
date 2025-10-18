// src/app/auth/callback/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { prisma } from '@/lib/db';

export async function GET(request: Request) {
  const url = new URL(request.url);
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

  // ⛳️ Aquí estaba el fallo: pásale un string, no un objeto URL
  const { data, error } = await supabase.auth.exchangeCodeForSession(request.url);
  if (error) {
    return NextResponse.redirect(new URL('/login?e=auth', url));
  }

  const email = (data.user?.email ?? '').toLowerCase();
  if (!email) {
    return NextResponse.redirect(new URL('/login?e=noemail', url));
  }

  // Si mantienes la whitelist, descomenta este bloque:
  // const allowed = await prisma.allowedEmail.findUnique({ where: { email } });
  // if (!allowed || !allowed.isActive) {
  //   await supabase.auth.signOut();
  //   return NextResponse.redirect(new URL('/no-autorizado', url));
  // }

  // Asegura el usuario interno (crea si no existe)
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      displayName: data.user.user_metadata?.displayName || email.split('@')[0],
    },
  });

  return NextResponse.redirect(new URL('/matchdays', url));
}
