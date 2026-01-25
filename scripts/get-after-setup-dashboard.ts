
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const dashboard = await prisma.dashboard.findFirst({
    where: {
      name: 'After Setup',
    },
    select: {
      layout: true,
    },
  });

  if (!dashboard) {
    console.error('Dashboard "After Setup" not found');
    process.exit(1);
  }

  console.log(dashboard.layout);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
