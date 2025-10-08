import { prisma } from '@/lib/db';
import { subMinutes, addMinutes } from 'date-fns';

export type MatchdayAlert =
  | { kind: 'info';    title: string; text?: string }
  | { kind: 'warning'; title: string; text?: string }
  | { kind: 'danger';  title: string; text?: string }
  | { kind: 'success'; title: string; text?: string };

export async function getMatchdayAlerts(mdId: number) : Promise<MatchdayAlert[]> {
  const alerts: MatchdayAlert[] = [];
  const md = await prisma.matchday.findUnique({ where: { id: mdId } });
  if (!md) return alerts;

  // Usuario actual (MVP): simulamos admin@unionistas.com
  const user = await prisma.user.findFirst({ where: { email: 'admin@unionistas.com' } });
  const matches = await prisma.match.findMany({
    where: { matchdayId: mdId, NOT: { OR: [{ homeTeam: { isUnionistas: true } }, { awayTeam: { isUnionistas: true } }] } },
    orderBy: { startsAt: 'asc' }
  });
  if (!matches.length) return alerts;

  const now = new Date();
  const first = matches[0].startsAt;
  const cutoff = subMinutes(first, 15);
  const lastCallAt = subMinutes(cutoff, 15);
  const inWindow = (t: Date) => t >= subMinutes(now, 5) && t <= addMinutes(now, 5);

  const picksCount = user ? await prisma.prediction.count({
    where: { userId: user.id, match: { matchdayId: mdId } }
  }) : 0;

  if (now < cutoff) {
    // Jornada abierta
    alerts.push({
      kind: 'info',
      title: 'Jornada disponible',
      text: `Puedes rellenar tus 9 picks. El corte es ${cutoff.toLocaleString()}.`
    });
    if (inWindow(lastCallAt)) {
      alerts.push({
        kind: 'warning',
        title: 'Quedan 15 minutos para el cierre',
        text: 'Si no completas los 9 picks, constará como no presentado.'
      });
    }
    if (picksCount < 9) {
      alerts.push({
        kind: 'warning',
        title: `Te faltan ${9 - picksCount} picks`,
        text: 'Completa los 9 para evitar ser no presentado.'
      });
    } else {
      alerts.push({ kind: 'success', title: '¡Porra completada!', text: 'Puedes editar hasta el corte.' });
    }
  } else {
    // Jornada cerrada
    alerts.push({ kind: 'danger', title: 'Jornada cerrada', text: 'Ya no se pueden enviar picks.' });
    if (picksCount < 9) {
      alerts.push({
        kind: 'danger',
        title: 'No presentado',
        text: 'Esta jornada te tocaría pagar como último.'
      });
    } else {
      // Intento de aviso “te toca pagar” tras resultados cargados
      // Calcular puntos del usuario y mínimos para estimar si paga
      const scores = await prisma.predictionScore.aggregate({
        _sum: { points: true },
        where: { prediction: { userId: user?.id, match: { matchdayId: mdId } } }
      });
      const myPts = scores._sum.points || 0;
      const allUsers = await prisma.user.findMany({ where: { isActive: true } });
      const totals: number[] = [];
      for (const u of allUsers) {
        const agg = await prisma.predictionScore.aggregate({
          _sum: { points: true },
          where: { prediction: { userId: u.id, match: { matchdayId: mdId } } }
        });
        totals.push(agg._sum.points || 0);
      }
      if (totals.length) {
        const min = Math.min(...totals);
        const seconds = totals.filter(x => x !== min);
        const secondMin = seconds.length ? Math.min(...seconds) : null;

        if (myPts === min) {
          alerts.push({ kind: 'danger', title: 'Te toca pagar (peor resultado)', text: 'Según los puntos actuales.' });
        } else if (secondMin !== null && myPts === secondMin) {
          alerts.push({ kind: 'warning', title: 'Te toca pagar (segundo peor)', text: 'Según los puntos actuales.' });
        }
      }
    }
  }

  return alerts;
}
