import { NextResponse } from 'next/server';

export async function GET() {
  console.log('[NOTIFY] Test: Jornada disponible / Quedan 15 minutos');
  return NextResponse.json({ ok: true });
}
