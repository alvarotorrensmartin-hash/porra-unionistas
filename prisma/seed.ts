import { PrismaClient, Role } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Example teams; mark Unionistas true so its matches are excluded by UI/logic
  const teamsData = [
    { name: 'Unionistas de Salamanca CF', shortName: 'Unionistas', isUnionistas: true },
    { name: 'Deportivo', shortName: 'Dépor' },
    { name: 'Celta Fortuna', shortName: 'Celta B' },
    { name: 'CD Lugo', shortName: 'Lugo' },
    { name: 'SD Ponferradina', shortName: 'Ponfe' },
    { name: 'Real Oviedo Vetusta', shortName: 'Oviedo B' },
    { name: 'CD Arenteiro', shortName: 'Arenteiro' },
    { name: 'Racing de Ferrol Promesas', shortName: 'Ferrol B' },
    { name: 'CD Ourense', shortName: 'Ourense' },
    { name: 'UD Logroñés', shortName: 'UDL' },
    { name: 'CD Teruel', shortName: 'Teruel' }
  ];
  await prisma.team.createMany({ data: teamsData });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@unionistas.com' },
    create: { email: 'admin@unionistas.com', displayName: 'Admin', role: Role.admin },
    update: {}
  });

  // Create a sample matchday with 10 matches including one with Unionistas; UI will exclude that one
  const md = await prisma.matchday.create({
    data: { season: '2025-26', number: 1, startsAt: new Date(Date.now() + 7*24*3600*1000) }
  });

  const teams = await prisma.team.findMany();
  const find = (name:string) => teams.find(t => t.name === name)!;

  const pairs = [
    ['Deportivo','Celta Fortuna'],
    ['CD Lugo','SD Ponferradina'],
    ['Real Oviedo Vetusta','CD Arenteiro'],
    ['Racing de Ferrol Promesas','CD Ourense'],
    ['UD Logroñés','CD Teruel'],
    // include Unionistas match (excluded in UI logic)
    ['Unionistas de Salamanca CF','Deportivo']
  ];

  for (const [home, away] of pairs) {
    await prisma.match.create({
      data: {
        matchdayId: md.id,
        homeTeamId: find(home).id,
        awayTeamId: find(away).id,
        startsAt: new Date(Date.now() + 8*24*3600*1000) // +8 days
      }
    });
  }

  console.log('Seed completed. Admin user:', admin.email);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
