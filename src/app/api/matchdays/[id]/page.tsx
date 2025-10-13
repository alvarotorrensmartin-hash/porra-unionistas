// src/app/matchdays/[id]/page.tsx
export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { computeCutoff } from '@/lib/cutoff';
import type { Match, Team, Matchday, Sign } from '@prisma/client';

type MatchWithTeams = Match & { homeTeam: Team; awayTeam: Team };

function signLabel(s: Sign | null) {
  if (!s) return '';
  if (s === 'ONE') return '1';
  if (s === 'TWO') return '2';
  return 'X';
}

// ---- Server Action: guardar resultados oficiales (admin) ----
async function saveResults(formData: FormData) {
  'use server';

  const ids = formData.getAll('matchId') as string[];
  const results = formData.getAll('result') as string[];

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

  const mdId = Number(formData.get('mdId'));
  revalidatePath(`/matchdays/${mdId}`);
}

// ---- Server Action: guardar picks del usuario ----
async function savePicks(formData: FormData) {
  'use server';

  const mdId = Number(formData.get('mdId'));
  // Las opciones del formulario vienen como pick_<matchId>
  // Recorremos los matchId enviados para formar el payload
  const matchIds = (formData.getAll('matchId') as string[]).map(Number);

  const picks = matchIds
    .map((mid) => {
      const v = formData.get(`pick_${mid}`)?.toString() || '';
      // Permitimos solo valores válidos del enum
      if (!['ONE', 'X', 'TWO'].includes(v)) return null;
      return { matchId: mid, predSign: v };
    })
    .filter(Boolean) as { matchId: number; predSign: 'ONE' | 'X' | 'TWO' }[];

  if (picks.length === 0) return;

  // RUTA RELATIVA => funciona en local y producción
  await fetch('/api/predictions/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ matchdayId: mdId, picks }),
  });

  revalidatePath(`/matchdays/${mdId}`);
}

export default async function MatchdayPage({
  params,
}: {
  params: { id: string };
}) {
  const mdId = Number(params.id);

  const md = await prisma.matchday.findUnique({ where: { id: mdId } });
  if (!md) return notFound();

  // Partidos sin Unionistas
  const matches: MatchWithTeams[] = await prisma.match.findMany({
    where: {
      matchdayId: mdId,
      NOT: {
        OR: [
          { homeTeam: { isUnionistas: true } },
          { awayTeam: { isUnionistas: true } },
        ],
      },
    },
    include: { homeTeam: true, awayTeam: true },
    orderBy: { startsAt: 'asc' },
  });

  const firstStarts = matches.length ? matches[0].startsAt : md.startsAt;
  const cutoffAt = computeCutoff(firstStarts);
  const closed = new Date() >= cutoffAt;

  // Usuario actual (para mostrar sus picks)
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Picks actuales del usuario para esta jornada
  let userPreds = new Map<number, Sign>();
  if (user) {
    const preds = await prisma.prediction.findMany({
      where: {
        userId: user.id,
        match: { matchdayId: mdId },
      },
      select: { matchId: true, predSign: true },
    });
    userPreds = new Map(preds.map((p) => [p.matchId, p.predSign]));
  }

  return (
    <main className="p-4 space-y-8">
      <header className="space-y-1">
        <h2 className="text-2xl font-bold">
          Jornada {md.number} · {md.season}
        </h2>
        <p>
          <span className="inline-block rounded bg-emerald-100 text-emerald-800 px-2 py-0.5 text-sm">
            Corte: {cutoffAt.toLocaleString()}
          </span>{' '}
          {closed && (
            <strong className="text-red-600 ml-2">(CERRADA)</strong>
          )}
        </p>
      </header>

      {/* ----- Bloque: Porras de usuario ----- */}
      <section className="space-y-3">
        <h3 className="text-xl font-semibold">Tu porra</h3>
        {!user && (
          <p className="text-sm">
            Debes{' '}
            <a className="text-blue-600 underline" href="/login">
              iniciar sesión
            </a>{' '}
            para guardar tus picks.
          </p>
        )}

        <form action={savePicks} className="space-y-3">
          <input type="hidden" name="mdId" value={mdId} />
          {/* Para poder reconstruir la lista en server action */}
          {matches.map((m) => (
            <input key={`hid_${m.id}`} type="hidden" name="matchId" value={m.id} />
          ))}

          <table className="min-w-full border border-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="border px-3 py-2 text-left">Partido</th>
                <th className="border px-3 py-2 text-left">Fecha</th>
                <th className="border px-3 py-2 text-left">Tu pick</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m) => (
                <tr key={m.id}>
                  <td className="border px-3 py-2">
                    {m.homeTeam.shortName || m.homeTeam.name} vs{' '}
                    {m.awayTeam.shortName || m.awayTeam.name}
                  </td>
                  <td className="border px-3 py-2">
                    {new Date(m.startsAt).toLocaleString()}
                  </td>
                  <td className="border px-3 py-2">
                    {closed ? (
                      <em className="text-gray-500">Bloqueado</em>
                    ) : (
                      <select
                        name={`pick_${m.id}`}
                        defaultValue={userPreds.get(m.id) ?? ''}
                        required
                        className="border rounded px-2 py-1"
                        disabled={!user}
                      >
                        <option value="" disabled>
                          Selecciona
                        </option>
                        <option value="ONE">1</option>
                        <option value="X">X</option>
                        <option value="TWO">2</option>
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!closed && (
            <button
              type="submit"
              disabled={!user}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Guardar porra
            </button>
          )}
        </form>
      </section>

      {/* ----- Bloque: Resultados oficiales (admin) ----- */}
      <section className="space-y-3">
        <h3 className="text-xl font-semibold">Resultados oficiales (admin)</h3>
        <form action={saveResults} className="space-y-3">
          <input type="hidden" name="mdId" value={mdId} />
          <table className="min-w-full border border-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="border px-3 py-2 text-left">Partido</th>
                <th className="border px-3 py-2 text-left">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m) => (
                <tr key={`res_${m.id}`}>
                  <td className="border px-3 py-2">
                    {m.homeTeam.shortName || m.homeTeam.name} vs{' '}
                    {m.awayTeam.shortName || m.awayTeam.name}
                  </td>
                  <td className="border px-3 py-2">
                    <input type="hidden" name="matchId" value={m.id} />
                    <select
                      name="result"
                      defaultValue={m.result ?? ''}
                      className="border rounded px-2 py-1"
                    >
                      <option value="">—</option>
                      <option value="ONE">1</option>
                      <option value="X">X</option>
                      <option value="TWO">2</option>
                    </select>
                    <span className="ml-2 text-gray-500">
                      Actual: {signLabel(m.result) || '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button
            type="submit"
            className="bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700"
          >
            Guardar resultados
          </button>
        </form>
      </section>
    </main>
  );
}
