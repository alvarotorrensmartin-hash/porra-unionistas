# Porra 1ª RFEF (Grupo 1) – MVP

MVP interno para picks **1/X/2** con **corte 15'** antes del primer partido de la jornada.
Excluye automáticamente los partidos de **Unionistas**.

## Requisitos
- Node 18+
- PostgreSQL (o Supabase)
- `DATABASE_URL` configurada

## Puesta en marcha
```bash
cp .env.example .env
# Edita DATABASE_URL a tu Postgres/Supabase
npm i
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

- Abre http://localhost:3000
- Usuario de pruebas: `admin@unionistas.com` (simulado; sin auth real aún).

## Estructura
- App Router en `src/app`
- Prisma en `prisma/`
- API:
  - `POST /api/predictions/bulk` – guarda picks (requiere estar antes del `cutoff_at`)
  - `GET /api/matchdays/:id/open` – dispara recordatorio "Jornada disponible" (stub)
  - `GET /api/matchdays/:id/close` – cierra porra y marca **no presentados** (log)
  - `GET /api/matchdays/:id/settle` – recalcula puntos (stub liquidación)

## Siguientes pasos (rápidos)
- Integrar **auth** (Supabase magic link).
- Implementar **liquidación económica** completa (según documento).
- Enviar **emails** reales (Resend) y/o Telegram.
- Panel Admin para cargar resultados / importar CSV.
