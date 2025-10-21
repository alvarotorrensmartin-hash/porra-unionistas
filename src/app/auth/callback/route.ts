import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
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

  // ¡IMPORTANTE!: la API de ssr espera un string, no un objeto URL.
  const { data, error } = await supabase.auth.exchangeCodeForSession(req.url);
  if (error) {
    // vuelve al login con error
    const back = new URL("/login?e=auth", process.env.NEXT_PUBLIC_SITE_URL);
    return NextResponse.redirect(back);
  }

  const email = data.user?.email?.toLowerCase() ?? "";
  if (!email) {
    const back = new URL("/login?e=noemail", process.env.NEXT_PUBLIC_SITE_URL);
    return NextResponse.redirect(back);
  }

  // Opcional: recoge un displayName que hayas puesto en cookie temporal
  const displayFromCookie = cookies().get("displayName")?.value?.trim();

  // Asegura usuario interno (upsert por email)
  await prisma.user.upsert({
    where: { email },
    update: {
      // si dejaste displayName como obligatorio, sólo lo tocamos si viene cookie
      ...(displayFromCookie ? { displayName: displayFromCookie } : {}),
      isActive: true,
    },
    create: {
      email,
      displayName: displayFromCookie || email.split("@")[0],
      isActive: true,
    },
  });

  // redirige a la app
  const to = new URL("/matchdays", process.env.NEXT_PUBLIC_SITE_URL);
  return NextResponse.redirect(to);
}
