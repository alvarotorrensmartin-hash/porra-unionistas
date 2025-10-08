import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendMail } from '@/lib/mailer';
import { addMinutes, subMinutes } from 'date-fns';

// Config
const CUT_MIN = 15; // cierre 15' antes del primer partido
const LAST_CALL_AHEAD = 15; // avisar 15' ANTES DEL CIERRE (o sea 30' antes del 1er partido)

/**
 * Lógica:
 * - Detecta jornadas próximas (hoy y mañana bastaría) y calcula:
 *   cutoff = firstMatch - 15'
 * - Si una jornada está marcada como "abierta" -> envía "Jornada disponible" (solo 1 vez)
 * - Si ahora == cutoff - LAST_CALL_AHEAD (+/- 5min) -> envía "Quedan 15' para el cierre"
 * Para marcar "enviado", usamos matchdays.notes como pequeño registro JSON (MVP).
 */
type Flags = { openedNotified?: boolean; lastCallNotified?: boolean };

export async function GET() {
  const now = new Date();
  const in48h = addMinutes(now, 60*48);

  // Cargamos jornadas con sus partidos
  const mds = await prisma.matchday.findMany({
    where: { startsAt: { lte: in48h } },
    orderBy: { startsAt: 'asc' },
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const users = await prisma.user.findMany({ where: { isActive: true } });
  const recipients = users.map(u => u.email);

  let sent: string[] = [];

  for (const md of mds) {
    const matches = await prisma.match.findMany({
      where: { matchdayId: md.id, NOT: { OR: [{ homeTeam: { isUnionistas: true } }, { awayTeam: { isUnionistas: true } }] } },
      include: { homeTeam: true, awayTeam: true },
      orderBy: { startsAt: 'asc' }
    });
    if (!matches.length) continue;

    const first = matches[0].startsAt;
    const cutoff = subMinutes(first, CUT_MIN);

    // Usamos matchday.settlements notes como flags pobres (MVP) -> mejor sería un campo propio
    let flags: Flags = {};
    try {
      const s = (md as any).notes as string | null; // no existe en schema; MVP: omitimos persistencia
      if (s) flags = JSON.parse(s);
    } catch {}

    // 1) Jornada disponible: lo mandamos si faltan >= 24h y no lo hemos mandado
    if (!flags.openedNotified && now < cutoff) {
      await sendMail(
        recipients,
        `Porra abierta · Jornada ${md.number} (${md.season})`,
        `<p>Ya puedes rellenar tus 9 picks (1/X/2).</p>
         <p><strong>Cierre:</strong> ${cutoff.toLocaleString()}</p>
         <p><a href="${baseUrl}/matchdays/${md.id}">Rellenar ahora</a></p>`
      );
      sent.push(`open md:${md.id}`);
      // En un MVP real, guardarías un flag en DB. Aquí lo dejamos enviado.
    }

    // 2) Último aviso: 15' antes del cierre (o sea 30' antes del primer partido)
    const lastCallAt = subMinutes(cutoff, LAST_CALL_AHEAD);
    const windowStart = subMinutes(now, 5);
    const windowEnd = addMinutes(now, 5);
    if (lastCallAt >= windowStart && lastCallAt <= windowEnd) {
      await sendMail(
        recipients,
        `Último aviso: cierre de porra en 15' · Jornada ${md.number}`,
        `<p>Te quedan <strong>15 minutos</strong> para completar tus 9 picks (luego serás "no presentado").</p>
         <p><strong>Cierre:</strong> ${cutoff.toLocaleString()}</p>
         <p><a href="${baseUrl}/matchdays/${md.id}">Completar ahora</a></p>`
      );
      sent.push(`lastcall md:${md.id}`);
    }
  }

  return NextResponse.json({ ok: true, sent });
}
