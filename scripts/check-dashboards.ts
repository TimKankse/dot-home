
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const dashboards = await prisma.dashboard.findMany({
    include: {
      user: true
    }
  });

  console.log(`Found ${dashboards.length} dashboards:`);
  
  for (const d of dashboards) {
    let widgetCount = 0;
    try {
      const layout = JSON.parse(d.layout);
      widgetCount = layout.widgets?.length || 0;
    } catch (e) {
      console.log(`Error parsing layout for dashboard ${d.id}`);
    }

    console.log(`- ID: ${d.id}`);
    console.log(`  Name: ${d.name}`);
    console.log(`  User: ${d.user.email} (${d.userId})`);
    console.log(`  IsDefault: ${d.isDefault}`);
    console.log(`  CreatedAt: ${d.createdAt.toISOString()}`);
    console.log(`  Widget Count: ${widgetCount}`);
    console.log('---');
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
