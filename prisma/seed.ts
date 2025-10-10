import { PrismaClient, AllowedRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Admin (upsert por email)
  await prisma.user.upsert({
    where: { email: 'admin@unionistas.com' },
    update: {},
    create: {
      email: 'admin@unionistas.com',
      displayName: 'Admin',
      role: AllowedRole.admin,
      isActive: true,
    },
  });

  // Jugador ejemplo
  await prisma.user.upsert({
    where: { email: 'jugador@unionistas.com' },
    update: {},
    create: {
      email: 'jugador@unionistas.com',
      displayName: 'Jugador Demo',
      role: AllowedRole.player,
      isActive: true,
    },
  });
}

main()
  .catch((e) => {
    console.error('❌ Error ejecutando seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

