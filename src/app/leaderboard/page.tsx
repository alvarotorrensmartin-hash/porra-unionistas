// src/app/leaderboard/page.tsx
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";

export default async function LeaderboardPage() {
  // 1) Traer todos los usuarios
  const users = await prisma.user.findMany({
    orderBy: [{ displayName: "asc" }],
    select: { id: true, displayName: true },
  });

  // 2) Calcular puntos por usuario (1 punto por acierto de signo)
  const rows: { user: string; points: number }[] = [];

  for (const u of users) {
    const preds = await prisma.prediction.findMany({
      where: { userId: u.id },
      include: {
        match: { select: { result: true } },
      },
    });

    const points = preds.reduce((sum, p) => {
      const result = p.match?.result; // puede ser null si el partido no está liquidado
      if (!result) return sum;
      return sum + (result === p.predSign ? 1 : 0);
    }, 0);

    rows.push({ user: u.displayName, points });
  }

  // 3) Ordenar de mayor a menor
  rows.sort((a, b) => b.points - a.points);

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Clasificación</h1>
      <table className="min-w-full border border-gray-300 text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-3 py-2 text-left">Usuario</th>
            <th className="border px-3 py-2 text-left">Puntos</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.user}>
              <td className="border px-3 py-2">{r.user}</td>
              <td className="border px-3 py-2">{r.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}


