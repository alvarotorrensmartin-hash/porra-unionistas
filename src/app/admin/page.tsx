export const dynamic = "force-dynamic";
export const revalidate = 0;

import { prisma } from "@/lib/db";
import type { Matchday } from "@prisma/client";
import Link from "next/link";
import { revalidatePath } from "next/cache";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || '';

export default async function AdminPage() {
  const mds: Matchday[] = await prisma.matchday.findMany({
    orderBy: [{ season: "desc" }, { number: "asc" }],
  });

  // Recalcular TODO (global)
  async function handleRecalcAll() {
    "use server";
    await fetch(`${BASE}/api/scores/recalc`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}) // sin matchdayId => recalcula todo
    });
    revalidatePath('/admin');
  }

  // Recalc + Liquidar una jornada concreta
  async function handleSettleOne(formData: FormData) {
    "use server";
    const idStr = formData.get('matchdayId')?.toString();
    if (!idStr) return;
    const id = Number(idStr);

    // 1) Recalc sólo esa jornada
    await fetch(`${BASE}/api/scores/recalc`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchdayId: id })
    });

    // 2) Liquidar (usa tu endpoint actual; si más adelante lo pasas a POST, cambia aquí)
    await fetch(`${BASE}/api/matchdays/${id}/settle`, { method: "GET" });

    revalidatePath('/admin');
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
        </ul>

        {/* Recalcular global */}
        <div className="mt-4">
          <form action={handleRecalcAll}>
            <button
              type="submit"
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 transition"
            >
              🔄 Recalcular puntuaciones (todas)
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

                    {/* ✅ Botón combinado: recalc + liquidar */}
                    <form action={handleSettleOne} className="inline">
                      <input type="hidden" name="matchdayId" value={String(md.id)} />
                      <button
                        type="submit"
                        className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                        title="Recalcula y liquida esta jornada"
                      >
                        Liquidar
                      </button>
                    </form>

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
