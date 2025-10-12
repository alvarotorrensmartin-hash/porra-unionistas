import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// ✅ Recalcula todos los puntos (o solo los de una jornada si se pasa ?md=ID)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mdParam = url.searchParams.get("md"); // opcional: /api/scores/recalc?md=3

  try {
    // 🧠 Obtenemos todas las predicciones con su partido y signo real
    const predictions = await prisma.prediction.findMany({
      where: mdParam ? { match: { matchdayId: Number(mdParam) } } : {},
      include: { match: true },
    });

    let updated = 0;

    // 🔁 Recorremos todas las predicciones y actualizamos puntuación
    for (const pred of predictions) {
      const correct =
        pred.match?.result && pred.predSign === pred.match.result ? 1 : 0;

      await prisma.predictionScore.upsert({
        where: { predictionId: pred.id },
        update: { points: correct },
        create: { predictionId: pred.id, points: correct },
      });

      updated++;
    }

    return NextResponse.json({
      ok: true,
      updated,
      scope: mdParam ? `Jornada ${mdParam}` : "Todas las jornadas",
    });
  } catch (err) {
    console.error("❌ Error recalculando puntos:", err);
    return NextResponse.json(
      { ok: false, error: "Error al recalcular puntos" },
      { status: 500 }
    );
  }
}
