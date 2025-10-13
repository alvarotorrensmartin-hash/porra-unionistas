import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { prisma } from '@/lib/db';

const roleMap = { admin: 'ADMIN', player: 'PLAYER' } as const;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const joinMode = process.env.JOIN_MODE ?? 'open';
  const inviteCodeEnv = (process.env.INVITE_CODE || '').trim();

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

  const { data, error } = await supabase.auth.exchangeCodeForSession(url);
  if (error) return NextResponse.redirect(new URL('/login?e=auth', url));

  const email = (data.user?.email ?? '').toLowerCase();
  const meta = data.user?.user_metadata as { displayName?: string; inviteCode?: string } | null;

  if (!email) return NextResponse.redirect(new URL('/login?e=noemail', url));

  // Control de acceso según modo
  if (joinMode === 'invite') {
    if (!meta?.inviteCode || meta.inviteCode.trim() !== inviteCodeEnv) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL('/no-autorizado', url));
    }
  } else if (joinMode === 'whitelist') {
    const allowed = await prisma.allowedEmail.findUnique({ where: { email } });
    if (!allowed || !allowed.isActive) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL('/no-autorizado', url));
    }
  }

  const displayName = (meta?.displayName || '').trim() || email;

  // Crea/actualiza el usuario interno
  await prisma.user.upsert({
    where: { email },
    update: {
      displayName, // si quieres, ponlo solo si está vacío
      isActive: true,
    },
    create: {
      email,
      displayName,
      isActive: true,
    },
  });

  return NextResponse.redirect(new URL('/matchdays', url));
}
