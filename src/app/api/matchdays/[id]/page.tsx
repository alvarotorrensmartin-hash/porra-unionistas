// src/app/matchdays/[id]/page.tsx
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { notFound } from 'next/navigation';
import type { Match, Team, Matchday, Sign } from '@prisma/client';

export const dynamic = 'force-dynamic';

type MatchWithTeams = Match & { homeTeam: Team; awayTeam: Team };

async function saveResults(formData: FormData) {
  'use server';

  const mdId = Number(formData.get('mdId'));
  const ids = formData.getAll('matchId') as string[];
  const results = formData.getAll('result') as string[];

  // Guardar resultados (1, X, 2) en la columna Match.result
  for (let i = 0; i < ids.length; i++) {
    const id = Number(ids[i]);
    const r = results[i];
    const val: Sign | null =
      r === 'ONE' ? 'ONE' : r === 'TWO' ? 'TWO' : r === 'X' ? 'X' : null;

    await prisma.match.update({
      where: { id },
      data: { result: val },
    });
  }

  // Recalcular puntuaciones de esa jornada (opcional)
  // await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/scores/recalc?id=${mdId}`, { method: 'POST' });

  revalidatePath(`/matchdays/${mdId}`);
}

export default async function MatchdayPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);

  const md = await prisma.matchday.findUnique({
    where: { id },
  });
  if (!md) return notFound();

  const matches: MatchWithTeams[] = await prisma.match.findMany({
    where: { matchdayId: id },
    orderBy: { startsAt: 'asc' },
    include: {
      homeTeam: true,
      awayTeam: true,
    },
  });

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">
        Resultados jornada {md.number} ({md.season})
      </h1>

      <form action={saveResults} className="space-y-4">
        <input type="hidden" name="mdId" value={md.id} />

        <table className="min-w-full border border-gray-300 text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-3 py-2 text-left">Partido</th>
              <th className="border px-3 py-2 text-left">Resultado</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((m) => (
              <tr key={m.id}>
                <td className="border px-3 py-2">
                  {m.homeTeam.shortName ?? m.homeTeam.name} –{' '}
                  {m.awayTeam.shortName ?? m.awayTeam.name}
                </td>
                <td className="border px-3 py-2">
                  <input type="hidden" name="matchId" value={m.id} />
                  <select
                    name="result"
                    defaultValue={m.result ?? ''}
                    className="border rounded p-1"
                  >
                    <option value="">(sin resultado)</option>
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
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Guardar resultados
        </button>
      </form>
    </main>
  );
}
