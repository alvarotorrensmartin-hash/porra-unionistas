export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { prisma } from '@/lib/db';
import Card from '@/components/Card';
import { Medal } from '@/components/Medal';

export default async function LeaderboardPage() {
  const users = await prisma.user.findMany({});
  const rows: { user: string; points: number }[] = [];
  for (const u of users) {
    const scores = await prisma.predictionScore.aggregate({
      _sum: { points: true },
      where: { prediction: { userId: u.id } }
    });
    rows.push({ user: u.displayName || u.email, points: scores._sum.points || 0 });
  }
  rows.sort((a,b)=>b.points - a.points);

  return (
    <section>
      <div className="section-title">
        <span className="dot" /> <h2 style={{margin:0}}>Clasificación general</h2>
      </div>

      <Card title="Top Unionistas" subtitle="Medallero en vivo" badge="🏆">
        <table className="table" style={{marginTop:10}}>
          <thead>
            <tr>
              <th style={{width:60}}>Pos</th>
              <th>Usuario</th>
              <th style={{width:120, textAlign:'right'}}>Puntos</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r,i)=>(
              <tr key={r.user}>
                <td>
                  <div className="row">
                    <span style={{width:26,textAlign:'center'}}>{i+1}</span>
                    <Medal place={i+1} />
                  </div>
                </td>
                <td>{r.user}</td>
                <td style={{textAlign:'right', fontWeight:700, color:'var(--u-accent)'}}>{r.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </section>
  );
}

