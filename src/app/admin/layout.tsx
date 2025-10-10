export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { prisma } from '@/lib/db';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createSupabaseServerClient();

  // Usuario autenticado (Supabase)
  const { data: authData } = await supabase.auth.getUser();
  const email = authData.user?.email?.toLowerCase();

  if (!email) {
    redirect('/login'); // o '/' si aún no tienes /login
  }

  // Usuario interno + rol
  const me = await prisma.user.findUnique({
    where: { email },
    select: { role: true },
  });

  if (!me || me.role !== 'admin') {
    redirect('/');
  }

  return <>{children}</>;
}
