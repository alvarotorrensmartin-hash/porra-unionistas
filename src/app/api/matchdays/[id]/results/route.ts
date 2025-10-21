import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Sign } from "@prisma/client";

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const mdId = Number(ctx.params.id);
  if (Number.isNaN(mdId)) {
    return NextResponse.json({ ok: false, error: "Bad matchday id" }, { status: 400 });
  }

  // Supabase server client (para saber quién es el usuario que postea)
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

  const { data: auth } = await supabase.auth.getUser();
  const email = auth.user?.email?.toLowerCase() ?? "";
  if (!email) {
    // no autenticado
    const back = new URL(`/login?e=session`, process.env.NEXT_PUBLIC_SITE_URL);
    return NextResponse.redirect(back);
  }

  // Busca tu User interno por email
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const back = new URL(`/login?e=nointuser`, process.env.NEXT_PUBLIC_SITE_URL);
    return NextResponse.redirect(back);
  }

  // Leemos el form data (viene del formulario)
  const form = await req.formData();
  const ids = form.getAll("matchId") as string[];
  const signs = form.getAll("predSign") as string[];

  if (ids.length !== signs.length) {
    return NextResponse.json({ ok: false, error: "Mismatched arrays" }, { status: 400 });
  }

  // Guarda/actualiza cada pick
  for (let i = 0; i < ids.length; i++) {
    const matchId = Number(ids[i]);
    const s = signs[i];
    // convierte a enum Sign válido
    const pred: Sign | null =
      s === "ONE" ? "ONE" : s === "TWO" ? "TWO" : s === "X" ? "X" : null;

    if (!matchId || !pred) continue;

    // Asegura que el match pertenezca a la jornada por seguridad
    const match = await prisma.match.findFirst({
      where: { id: matchId, matchdayId: mdId },
      select: { id: true },
    });
    if (!match) continue;

    // upsert por la unique compuesta @@unique([userId, matchId])
    await prisma.prediction.upsert({
      where: { userId_matchId: { userId: user.id, matchId } }, // <- OJO: orden userId_matchId
      update: { predSign: pred },
      create: { userId: user.id, matchId, predSign: pred },
    });
  }

  // vuelve a la jornada
  const back = new URL(`/matchdays/${mdId}`, process.env.NEXT_PUBLIC_SITE_URL);
  return NextResponse.redirect(back);
}
