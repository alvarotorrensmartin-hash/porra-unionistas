// src/app/matchdays/page.tsx
import { prisma } from '@/lib/db';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export default async function MatchdaysIndexPage() {
  // ✅ Requiere sesión
  const supabase = createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  // ✅ Cargamos jornadas (ordena por temporada desc y número asc)
  const matchdays = await prisma.matchday.findMany({
    orderBy: [{ season: 'desc' }, { number: 'asc' }],
  });

  // ✅ Calculamos "Rellenar ahora": la próxima jornada (startsAt en el futuro)
  const now = new Date();
  let targetId: number | null = null;

  const upcoming = matchdays.find(md => md.startsAt > now);
  if (upcoming) {
    targetId = upcoming.id;
  } else if (matchdays.length) {
    // si no hay futuras, usa la última (para revisar/editar)
    targetId = matchdays[matchdays.length - 1].id;
  }

  return (
    <main className="p-8 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Jornadas</h1>
        {targetId && (
          <Link
            href={`/matchdays/${targetId}`}
            className="bg-amber-500 text-black font-medium px-4 py-2 rounded hover:bg-amber-400"
          >
            Rellenar ahora
          </Link>
        )}
      </header>

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
            {matchdays.map(md => (
              <tr key={md.id}>
                <td className="border px-3 py-2">{md.season}</td>
                <td className="border px-3 py-2">{md.number}</td>
                <td className="border px-3 py-2">
                  {new Date(md.startsAt).toLocaleString()}
                </td>
                <td className="border px-3 py-2">
                  <Link
                    href={`/matchdays/${md.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    Rellenar/Ver pronósticos
                  </Link>
                </td>
              </tr>
            ))}

            {matchdays.length === 0 && (
              <tr>
                <td className="border px-3 py-6 text-center text-gray-500" colSpan={4}>
                  No hay jornadas aún.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
