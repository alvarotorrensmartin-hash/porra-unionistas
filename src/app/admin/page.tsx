export const dynamic = "force-dynamic";
export const revalidate = 0;

import { prisma } from "@/lib/db";
import type { Matchday } from "@prisma/client";
import Link from "next/link";
import { revalidatePath } from "next/cache";

export default async function AdminPage() {
  const mds: Matchday[] = await prisma.matchday.findMany({
    orderBy: [{ season: "desc" }, { number: "asc" }],
  });

  // ✅ Server Action para recalcular
  async function handleRecalc() {
    "use server";

    // Base URL robusta (local o Vercel)
    const base =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
      process.env.VERCEL_URL?.replace(/\/+$/, "")?.replace(/^https?:\/\//, "")
        ? `https://${process.env.VERCEL_URL?.replace(/\/+$/, "")}`
        : "http://localhost:3000";

    const res = await fetch(`${base}/api/scores/recalc`, {
      method: "POST",
      // evita cache en Server Actions
      cache: "no-store",
    });

    // Opcional: manejar errores
    if (!res.ok) {
      console.error("Recalc failed", await res.text());
    }

    // Revalida páginas que muestran puntos/clasificación
    revalidatePath("/leaderboard");
    revalidatePath("/matchdays");
  }

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-6">Panel de Administración</h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Acciones rápidas</h2>
        <ul className="list-disc list-inside space-y-2">
          <li>
            <Link href="/admin/access" className="text-blue-600 hover:underline">
              🛡️ Gestión de accesos (lista blanca)
            </Link>
          </li>
          <li>
            <Link href="/api/notifications/test" className="text-blue-600 hover:underline">
              📢 Probar notificaciones
            </Link>
          </li>
          <li>
            <a href="/admin/access" className="underline">
              Gestionar acceso (lista blanca)
            </a>
          </li>
          <li>
            <a href="/api/notifications/test">Probar notificaciones</a>
          </li>
        </ul>

        {/* ✅ Botón para recalcular puntuaciones */}
        <div className="mt-6">
          <form action={handleRecalc}>
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
            >
              🔄 Recalcular puntuaciones
            </button>
          </form>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">📆 Jornadas</h2>

        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-300 text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-3 py-2 text-left">Temporada</th>
                <th className="border px-3 py-2 text-left">Jornada</th>
                <th className="border px-3 py-2 text-left">Inicio</th>
                <th className="border px-3 py-2 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {mds.map((md: Matchday) => (
                <tr key={md.id}>
                  <td className="border px-3 py-2">{md.season}</td>
                  <td className="border px-3 py-2">{md.number}</td>
                  <td className="border px-3 py-2">
                    {new Date(md.startsAt).toLocaleString()}
                  </td>
                  <td className="border px-3 py-2 space-x-2">
                    <a
                      className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                      href={`/api/matchdays/${md.id}/open`}
                    >
                      Abrir
                    </a>
                    <a
                      className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                      href={`/api/matchdays/${md.id}/close`}
                    >
                      Cerrar (forzar)
                    </a>
                    <a
                      className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                      href={`/api/matchdays/${md.id}/settle`}
                    >
                      Liquidar
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
