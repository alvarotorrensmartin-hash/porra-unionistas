import { prisma } from '@/lib/db';
import Link from 'next/link';

export default async function AdminPage() {
  const mds = await prisma.matchday.findMany({ orderBy: [{ season: 'desc' }, { number: 'asc' }] });
  return (
    <section>
      <h2>Admin</h2>
      <p>Acciones rápidas</p>
      <ul>
        <li><Link href="/api/notifications/test">Probar notificaciones</Link></li>
      </ul>
      <h3>Jornadas</h3>
      <table>
        <thead><tr><th>Temporada</th><th>Jornada</th><th>Inicio</th><th>API</th></tr></thead>
        <tbody>
          {mds.map(md => (
            <tr key={md.id}>
              <td>{md.season}</td>
              <td>{md.number}</td>
              <td>{new Date(md.startsAt).toLocaleString()}</td>
              <td style={{display:'flex', gap:8}}>
                <a className="btn" href={`/api/matchdays/${md.id}/open`}>Abrir</a>
                <a className="btn" href={`/api/matchdays/${md.id}/close`}>Cerrar (forzar)</a>
                <a className="btn" href={`/api/matchdays/${md.id}/settle`}>Liquidar</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
