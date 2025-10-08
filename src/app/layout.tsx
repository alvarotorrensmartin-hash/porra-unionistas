import './globals.css';
import Link from 'next/link';
import type { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        <header className="header">
          <div className="header-inner">
            <Link href="/" className="brand">
              <span className="badge">PORRA</span>
              <span>Unionistas · Grupo 1</span>
            </Link>
            <nav className="nav">
              <Link className="btn ghost" href="/matchdays">Jornadas</Link>
              <Link className="btn ghost" href="/leaderboard">Clasificación</Link>
              <Link className="btn" href="/admin">Admin</Link>
              <Link className="btn primary" href="/matchdays">Rellenar ahora</Link>
            </nav>
          </div>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
