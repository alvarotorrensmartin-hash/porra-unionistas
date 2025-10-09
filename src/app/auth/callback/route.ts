import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options } as any);
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options, maxAge: 0 } as any);
        },
      },
    }
  );

  // 1) Intercambia el code del magic link por sesión
  const { error } = await supabase.auth.exchangeCodeForSession(url.toString()); // <- string
  if (error) return NextResponse.redirect(new URL('/login?e=auth', url));

  // 2) Usuario autenticado
  const { data: { user } } = await supabase.auth.getUser();
  const email = (user?.email ?? '').toLowerCase();
  if (!email) return NextResponse.redirect(new URL('/login?e=noemail', url));

  // 3) VERIFICAR lista blanca con SQL directo (evita el error de TS)
  type AllowedRow = { is_active: boolean; role: string } | { is_active: boolean } | Record<string, any>;
  const rows = await prisma.$queryRaw<AllowedRow[]>`
    SELECT is_active, role
    FROM "AllowedEmail"
    WHERE email = ${email}
    LIMIT 1
  `;
  const allowed = rows[0] as any;

  if (!allowed || allowed.is_active !== true) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL('/no-autorizado', url));
  }

  // 4) Asegura el usuario interno (ajusta displayName a tu modelo)
  const displayName =
    (user?.user_metadata as any)?.name ||
    email;

  await prisma.user.upsert({
    where: { email },
    update: {
      // si quieres refrescar nombre cada login:
      // displayName,
    },
    create: {
      email,
      displayName, // si tu User lo requiere; si no, puedes omitirlo
    },
  });

  // 5) Adelante
  const next = url.searchParams.get('next') ?? '/matchdays';
  return NextResponse.redirect(new URL(next, url));
}

