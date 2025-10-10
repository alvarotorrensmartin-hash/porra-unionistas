import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer"; // <-- usa el helper
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const supabase = createSupabaseServerClient();

  // Intercambia el "code" del magic link por una sesión
  // (si tu versión de @supabase/ssr acepta URL completa, usa directamente `req.url`)
  const code = url.searchParams.get("code") ?? "";
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchange error:", error.message);
    return NextResponse.redirect(new URL("/login?e=auth", url.origin));
  }

  const email = data.user?.email?.toLowerCase();
  if (!email) {
    return NextResponse.redirect(new URL("/login?e=noemail", url.origin));
  }

  // Comprueba lista blanca
  const allowed = await prisma.allowedEmail.findUnique({ where: { email } });
  if (!allowed || !allowed.isActive) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/no-autorizado", url.origin));
  }

  // Crea/actualiza el usuario interno (UUID automático, role por defecto 'player')
  const display =
    (data.user.user_metadata as any)?.full_name ||
    email.split("@")[0];

  await prisma.user.upsert({
    where: { email },
    update: { displayName: display },
    create: {
      email,
      displayName: display,
      // role: allowed.role  // ← si quieres mapear el rol desde AllowedEmail, descomenta esto
    },
  });

  // Redirige a la app
  return NextResponse.redirect(new URL("/matchdays", url.origin));
}



