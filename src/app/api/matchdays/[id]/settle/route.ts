import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendMail } from '@/lib/mailer';

const ECON = {
  poolBase: 15.00,
  worstSingle: 10.00,
  secondSingle: 5.00,
  worstTiedSplit: 7.50,
};

export async function GET(_: Request, { params }: { params: { id: string }}) {
  const id = Number(params.id);

  // 1) Puntuaciones (igual que antes)
  const matches = await prisma.match.findMany({
    where: { matchdayId: id, NOT: { OR: [{ homeTeam: { isUnionistas: true } }, { awayTeam: { isUnionistas: true } }] } },
  });
  const users = await prisma.user.findMany({ where: { isActive: true } });

  const realSigns = new Map<number, string>();
  for (const m of matches) {
    let sign: string | null = null;
    if (m.federationOutcome) sign = m.federationOutcome;
    else if (m.goalsHome != null && m.goalsAway != null) {
      sign = m.goalsHome === m.goalsAway ? 'X' : (m.goalsHome > m.goalsAway ? 'ONE' : 'TWO');
    }
    if (sign) realSigns.set(m.id, sign);
  }

  for (const u of users) {
    for (const m of matches) {
      const pred = await prisma.prediction.findUnique({ where: { matchId_userId: { matchId: m.id, userId: u.id } } });
      const sign = realSigns.get(m.id);
      if (!sign || !pred) continue;
      const pts = pred.predSign === sign ? 1 : 0;
      await prisma.predictionScore.upsert({
        where: { predictionId: pred.id },
        update: { points: pts },
        create: { predictionId: pred.id, points: pts }
      });
    }
  }

  // 2) Sumar puntos por usuario en la jornada
  const totals: { userId: string; email: string; display: string; points: number; picks: number }[] = [];
  for (const u of users) {
    const picks = await prisma.prediction.count({ where: { userId: u.id, match: { matchdayId: id } } });
    const agg = await prisma.predictionScore.aggregate({
      _sum: { points: true },
      where: { prediction: { userId: u.id, match: { matchdayId: id } } }
    });
    totals.push({
      userId: u.id,
      email: u.email,
      display: u.displayName || u.email,
      points: agg._sum.points || 0,
      picks,
    });
  }

  // 3) Reglas de perdedores (MVP):
  // - No presentados (picks < 9) => últimos automáticos
  // - Si hay >=2 últimos (empatados al peor) => cada uno paga 7,5€ y NO hay segundos peores
  // - Si hay 1 peor => paga 10€; y si hay 1 segundo peor => 5€. Si hay >=2 segundos peores => cada uno 5€.
  const notPresented = totals.filter(t => t.picks < 9);
  let worstGroup: typeof totals = [];
  let secondGroup: typeof totals = [];

  if (notPresented.length > 0) {
    worstGroup = notPresented;
    // Entre los presentados (picks=9), calculamos los segundos peores por puntos
    const presented = totals.filter(t => t.picks >= 9);
    if (presented.length > 0) {
      const minPts = Math.min(...presented.map(t => t.points));
      secondGroup = presented.filter(t => t.points === minPts);
    }
  } else {
    const minPts = Math.min(...totals.map(t => t.points));
    worstGroup = totals.filter(t => t.points === minPts);
    if (worstGroup.length === 1) {
      const remaining = totals.filter(t => t.points !== minPts);
      if (remaining.length) {
        const secondMin = Math.min(...remaining.map(t => t.points));
        secondGroup = remaining.filter(t => t.points === secondMin);
      }
    }
  }

  // 4) Montar mensajes e importes
  let worstAmount = 0;
  let secondAmount = 0;
  if (notPresented.length > 0) {
    // varios últimos automáticos => 7,5€ c/u (no hay segundos si no hay presentados que pierdan por puntos)
    worstAmount = ECON.worstTiedSplit;
    secondAmount = secondGroup.length ? ECON.secondSingle : 0;
  } else {
    if (worstGroup.length >= 2) {
      worstAmount = ECON.worstTiedSplit;
      secondAmount = 0;
    } else {
      worstAmount = ECON.worstSingle;
      secondAmount = secondGroup.length ? ECON.secondSingle : 0;
    }
  }

  const md = await prisma.matchday.findUnique({ where: { id } });
  const title = `Liquidación Jornada ${md?.number} (${md?.season})`;

  // 5) Enviar emails (si hay grupos)
  if (worstGroup.length) {
    await sendMail(
      worstGroup.map(x => x.email),
      `${title} – Te toca pagar (peor resultado)`,
      `<p>Has quedado en el grupo de <strong>peor resultado</strong> esta jornada.</p>
       <p>Importe a pagar: <strong>${worstAmount.toFixed(2)} €</strong></p>`
    );
  }
  if (secondGroup.length) {
    await sendMail(
      secondGroup.map(x => x.email),
      `${title} – Te toca pagar (segundo peor)`,
      `<p>Has quedado en el grupo de <strong>segundo peor resultado</strong> esta jornada.</p>
       <p>Importe a pagar: <strong>${secondAmount.toFixed(2)} €</strong></p>`
    );
  }

  // (Opcional) Enviar resumen a todos
  const all = totals.map(t => `${t.display}: ${t.points} pts${t.picks < 9 ? ' (no presentado)' : ''}`).join('<br>');
  await sendMail(
    users.map(u => u.email),
    `${title} – Resumen`,
    `<p>Resumen de puntos:</p><p>${all}</p>`
  );

  return NextResponse.json({
    ok: true,
    worst: worstGroup.map(x => ({ user: x.display, amount: worstAmount })),
    second: secondGroup.map(x => ({ user: x.display, amount: secondAmount })),
  });
}

