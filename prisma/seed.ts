// prisma/seed.ts
import { PrismaClient, AllowedRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Crea/asegura un admin
  await prisma.user.upsert({
    where: { email: 'admin@unionistas.com' },
    create: {
      email: 'admin@unionistas.com',
      displayName: 'Admin',
      role: 'admin' as any,   // <- sin importar enums, evita errores
      isActive: true,
    },
    update: {},
  });

  // Si quieres, añade alguno más:
  // await prisma.user.upsert({
  //   where: { email: 'torrensmartin@hotmail.com' },
  //   create: {
  //     email: 'torrensmartin@hotmail.com',
  //     displayName: 'Jugador',
  //     role: 'player' as any,
  //     isActive: true,
  //   },
  //   update: {},
  // });

  console.log('Seed OK');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

