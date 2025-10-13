// src/app/api/scores/recalc/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// 👇 tu lógica real de recálculo métela aquí dentro
async function doRecalc(): Promise<{ ok: boolean; updated: number; scope: string }> {
  // ... tu código actual que recalcule y devuelva { ok, updated, scope }
  return { ok: true, updated: 0, scope: "Todas las jornadas" }; // <- placeholder
}

export async function GET() {
  const result = await doRecalc();
  return NextResponse.json(result);
}

// ✅ Acepta también POST para el botón del Admin
export async function POST() {
  const result = await doRecalc();
  return NextResponse.json(result);
}
