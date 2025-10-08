import { prisma } from '@/lib/db';
import { subMinutes, addMinutes } from 'date-fns';

export type HomeAlert = {
  kind: 'info' | 'warning' | 'danger' | 'success';
  title: string;
  text?: string;
  href?: string;
  cutoff?: string; // para el contador regresivo
};

/**
 * Devuelve el banner más relevante para la Home:
 * - Jornada abierta (con enlace y cuenta atrás)
 * - Último aviso (15' antes del corte)
 * - Jornada cerrada más reciente (por si alguien llega tarde)
 */
export async function getHomeAlert(): Promise<HomeAlert | null> {
  // Buscamos la jornada más próxima por fecha de inicio
  const md = await prisma.matchday.findFirst({
    orderBy: { startsAt: 'asc' },
  });
  if (!md) return null;

  // Buscamos los partidos (excluyendo los de Unionistas)
  const matches = await prisma.match.findMany({
    where: {
      matchdayId: md.id,
      NOT: {
        OR: [
          { homeTeam: { isUnionistas: true } },
          { awayTeam: { isUnionistas: true } },
        ],
      },
    },
    orderBy: { startsAt: 'asc' },
  });
  if (!matches.length) return null;

  const first = matches[0].startsAt;
  const cutoff = subMinutes(first, 15);
  const lastCallAt = subMinutes(cutoff, 15);
  const now = new Date();
  const href = `/matchdays/${md.id}`;

  // Jornada abierta
  if (now < cutoff) {
    const inLastCallWindow =
      now >= subMinutes(lastCallAt, 5) && now <= addMinutes(lastCallAt, 5);

    if (inLastCallWindow) {
      return {
        kind: 'warning',
        title: `¡Último aviso! Cierre en 15' — Jornada ${md.number} (${md.season})`,
        text: `Completa tus 9 picks antes de las ${cutoff.toLocaleString()}.`,
        href,
        cutoff: cutoff.toISOString(),
      };
    }

    return {
      kind: 'info',
      title: `Jornada ${md.number} (${md.season}) disponible`,
      text: `El corte es ${cutoff.toLocaleString()}. Rellena tus 9 picks.`,
      href,
      cutoff: cutoff.toISOString(),
    };
  }

  // Jornada cerrada
  return {
    kind: 'danger',
    title: `Jornada ${md.number} (${md.season}) cerrada`,
    text: `Ya no se pueden enviar picks. Revisa tu puntuación o espera a la próxima.`,
    href,
  };
}

