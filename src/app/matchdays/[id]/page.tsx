import { prisma } from '@/lib/db';
import { computeCutoff } from '@/lib/cutoff';
import { revalidatePath } from 'next/cache';
import { Sign } from '@prisma/client';

/* ==== FORMATO DE FECHAS ==== */
const fmt = (d: Date) =>
  new Date(d).toLocaleString('es-ES', {
    timeZone: 'Europe/Madrid',
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

/* ==== LABELS DE SIGNOS ==== */
function signLabel(s: Sign) {
  if (s === 'X') return 'X';
  if (s === 'ONE') return '1';
  return '2'; // 'TWO'
}

/* ==== COMPONENTE PRINCIPAL ==== */
export default async function MatchdayPage({ params }: { params: { id: string } }) {
  const mdId = Number(params.id);
  const md = await prisma.matchday.findUnique({ where: { id: mdId } });
  if (!md) return <div>No existe la jornada</div>;

  const matches = await prisma.match.findMany({
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
  const now = new Date();
  const closed = now >= cutoffAt;

  /* ==== ACCIÓN DE GUARDAR ==== */
  async function save(formData: FormData) {
    'use server';
    const entries = matches
      .map((m) => {
        const v = formData.get(`match_${m.id}`)?.toString() || '';
        return { matchId: m.id, predSign: v };
      })
      .filter((x) => x.predSign);

    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/predictions/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchdayId: mdId, picks: entries }),
    });

    revalidatePath(`/matchdays/${mdId}`);
  }

  /* ==== RENDER ==== */
  return (
    <section>
      <h2>Jornada {md.number} · {md.season}</h2>
      <p>
        <span className="badge">Corte:</span> {fmt(cutoffAt)}{' '}
        {closed && <strong>(CERRADA)</strong>}
      </p>

      {/* ALERTAS */}
      {!closed ? (
        <div className="alert-available">
          <strong>Jornada disponible</strong><br />
          Puedes rellenar tus picks. El corte es {fmt(cutoffAt)}.
        </div>
      ) : (
        <div className="alert-warning">
          <strong>Jornada cerrada</strong><br />
          Ya no puedes modificar tus picks.
        </div>
      )}

      {!closed && (
        <div className="alert-warning">
          <strong>Te faltan {matches.length} picks</strong><br />
          Completa todos los partidos para evitar ser no presentado.
        </div>
      )}

      {/* FORMULARIO */}
      <form action={save}>
        <table className="table" style={{ marginTop: '12px', width: '100%' }}>
          <thead>
            <tr>
              <th>Partido</th>
              <th>Fecha</th>
              <th style={{ width: 140, textAlign: 'center' }}>Tu pick</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((m) => (
              <tr key={m.id}>
                <td>
                  <strong>{m.homeTeam.shortName || m.homeTeam.name}</strong> —{' '}
                  {m.awayTeam.shortName || m.awayTeam.name}
                </td>
                <td>{fmt(m.startsAt)}</td>
                <td style={{ textAlign: 'center' }}>
                  {closed ? (
                    <em>Bloqueado</em>
                  ) : (
                    <select name={`match_${m.id}`} defaultValue="" required
  style={{
    padding: '6px 8px',
    borderRadius: 8,
    background: 'var(--u-elev)',
    color: 'var(--u-text)',
    border: '1px solid var(--u-border)',
  }}
>
  <option value="" disabled>Selecciona</option>
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
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginTop: 16,
            }}
          >
            <button className="btn-primary" type="submit">
              Guardar porra
            </button>
          </div>
        )}
      </form>
    </section>
  );
}
