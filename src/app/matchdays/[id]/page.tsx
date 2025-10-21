// src/app/matchdays/[id]/page.tsx
import { prisma } from '@/lib/db';
import { createSupabaseServer } from '@/lib/supabaseServer';
import { redirect, notFound } from 'next/navigation';
import type { Match, Matchday, Team, Sign } from '@prisma/client';

export const dynamic = 'force-dynamic';

type MatchWithTeams = Match & { homeTeam: Team; awayTeam: Team };

export default async function MatchdayPage({
  params,
}: {
  params: { id: string };
}) {
  const mdId = Number(params.id);
  if (!Number.isFinite(mdId)) notFound();

  // ✅ sesión obligatoria
  const supabase = createSupabaseServer();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');
  const userId = session.user.id;

  // ✅ datos de la jornada + partidos
  const md: Matchday | null = await prisma.matchday.findUnique({
    where: { id: mdId },
  });
  if (!md) notFound();

  const matches: MatchWithTeams[] = await prisma.match.findMany({
    where: { matchdayId: mdId },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { id: 'asc' },
  });

  // ✅ pronósticos existentes del usuario (para pre-seleccionar)
  const preds = await prisma.prediction.findMany({
    where: { userId, match: { matchdayId: mdId } },
    select: { matchId: true, predSign: true },
  });
  const initial: Record<number, Sign> = {};
  for (const p of preds) initial[p.matchId] = p.predSign;

  // ⛳️ Server Action – guarda picks SIN usar API externa (adiós 404)
  async function savePicks(formData: FormData) {
    'use server';

    // de nuevo validamos sesión aquí dentro (cada Server Action corre aislada)
    const supa = createSupabaseServer();
    const { data: { session: s } } = await supa.auth.getSession();
    if (!s) redirect('/login');
    const uid = s.user.id;

    // leemos todas las entradas pick-<id>
    const entries = Array.from(formData.entries())
      .filter(([k]) => k.startsWith('pick-')) as Array<[string, FormDataEntryValue]>;

    for (const [key, val] of entries) {
      const matchId = Number(key.replace('pick-', ''));
      const raw = String(val);
      // normalizamos al enum Sign
      const sign: Sign | null =
        raw === 'ONE' ? 'ONE' :
        raw === 'X'   ? 'X'   :
        raw === 'TWO' ? 'TWO' : null;

      if (!Number.isFinite(matchId) || !sign) continue;

      await prisma.prediction.upsert({
        where: { userId_matchId: { userId: uid, matchId } }, // requiere @@unique([userId, matchId])
        update: { predSign: sign },
        create: { userId: uid, matchId, predSign: sign },
      });
    }

    redirect(`/matchdays/${mdId}`); // vuelta a la página
  }

  return (
    <main className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          Jornada {md.number} — {md.season}
        </h1>
        <p className="text-sm opacity-70">
          Inicio: {new Date(md.startsAt).toLocaleString()}
        </p>
      </header>

      <form action={savePicks} className="space-y-3">
        <table className="min-w-full border border-gray-300 text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-2 py-2 text-left">Partido</th>
              <th className="border px-2 py-2 w-48">Tu pronóstico</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((m) => (
              <tr key={m.id}>
                <td className="border px-2 py-2">
                  {m.homeTeam.name} vs {m.awayTeam.name}
                </td>
                <td className="border px-2 py-2">
                  <select
                    name={`pick-${m.id}`}
                    defaultValue={initial[m.id] ?? ''}
                    className="border rounded px-2 py-1 w-full bg-black/10"
                  >
                    <option value="">—</option>
                    <option value="ONE">1</option>
                    <option value="X">X</option>
                    <option value="TWO">2</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button
          type="submit"
          className="bg-amber-500 text-black font-medium px-4 py-2 rounded hover:bg-amber-400"
        >
          Guardar pronósticos
        </button>
      </form>
    </main>
  );
}
