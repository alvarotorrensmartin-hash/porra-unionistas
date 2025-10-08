import Link from 'next/link';
import { prisma } from '@/lib/db';
import Card from '@/components/Card';

export default async function MatchdaysPage() {
  const mds = await prisma.matchday.findMany({ orderBy: [{ season: 'desc' }, { number: 'asc' }] });

  return (
    <section>
      <div className="section-title">
        <span className="dot" /> <h2 style={{margin:0}}>Jornadas</h2>
      </div>

      <div className="grid">
        {mds.map(md => (
          <Card
            key={md.id}
            title={`Jornada ${md.number}`}
            subtitle={`${md.season} · ${new Date(md.startsAt).toLocaleString()}`}
            badge="Grupo 1"
          >
            <div className="row" style={{justifyContent:'space-between', marginTop:10}}>
              <Link className="btn" href={`/matchdays/${md.id}`}>Abrir jornada</Link>
              <Link className="btn ghost" href={`/api/matchdays/${md.id}/settle`}>Recalcular (admin)</Link>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}



