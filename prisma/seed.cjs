/* eslint-disable */
const { PrismaClient, AllowedRole } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
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
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
