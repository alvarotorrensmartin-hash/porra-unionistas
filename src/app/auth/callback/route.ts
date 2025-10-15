// src/app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
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
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: "", ...options, maxAge: 0 });
        },
      },
    }
  );

  // Intercambia el "code" del magic link por una sesión
  const { data, error } = await supabase.auth.exchangeCodeForSession(
    url.toString() // <- aquí el fix del tipo
  );
  if (error) {
    return NextResponse.redirect(new URL("/login?e=auth", url));
  }

  const email = (data.user?.email ?? "").toLowerCase();
  if (!email) {
    return NextResponse.redirect(new URL("/login?e=noemail", url));
  }

  // Lee el Nick que guardamos en /login
  const raw = cookieStore.get("pending_display_name")?.value;
  const displayNameFromCookie = raw ? decodeURIComponent(raw) : undefined;

  // Crea o actualiza el usuario interno
  await prisma.user.upsert({
    where: { email },
    update: {
      ...(displayNameFromCookie ? { displayName: displayNameFromCookie } : {}),
      isActive: true,
    },
    create: {
      email,
      displayName: displayNameFromCookie ?? email,
      isActive: true,
    },
  });

  // Borra la cookie temporal del Nick
  if (raw) {
    cookieStore.set({
      name: "pending_display_name",
      value: "",
      path: "/",
      maxAge: 0,
    });
  }

  // Adelante a la app
  return NextResponse.redirect(new URL("/matchdays", url));
}
