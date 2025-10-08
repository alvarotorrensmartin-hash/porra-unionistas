import Link from 'next/link';

export default function Home() {
  return (
    <section>
      <h1>Porra Grupo 1 (sin Unionistas)</h1>
      <p>Rellena tus picks 1/X/2. El corte se realiza 15 minutos antes del primer partido de la jornada.</p>
      <div style={{display:'flex', gap:12, marginTop:12, flexWrap:'wrap'}}>
        <Link className="btn primary" href="/matchdays">Rellenar ahora</Link>
        <Link className="btn" href="/leaderboard">Ver clasificación</Link>
      </div>
    </section>
  );
}
