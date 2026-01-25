
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SOURCE_DASHBOARD_ID = 'cmk4lieih000ilunozpkskvfz'; // The one with 48 widgets
const TARGET_USER_ID = 'cmk0l5jms0000luxqfs3f7zay'; // tim.cederroth@gmail.com

async function main() {
  console.log('Starting migration...');

  // 1. Verify dashboard exists
  const dashboard = await prisma.dashboard.findUnique({
    where: { id: SOURCE_DASHBOARD_ID },
  });

  if (!dashboard) {
    throw new Error(`Dashboard ${SOURCE_DASHBOARD_ID} not found`);
  }

  console.log(`Found dashboard "${dashboard.name}" currently owned by ${dashboard.userId}`);

  // 2. Unset isDefault for all of target user's current dashboards
  const updateResult = await prisma.dashboard.updateMany({
    where: { userId: TARGET_USER_ID },
    data: { isDefault: false },
  });
  
  console.log(`Unset default status for ${updateResult.count} existing dashboards of the target user.`);

  // 3. Transfer ownership and set as default
  const updatedDashboard = await prisma.dashboard.update({
    where: { id: SOURCE_DASHBOARD_ID },
    data: {
      userId: TARGET_USER_ID,
      isDefault: true,
      updatedAt: new Date(),
    },
  });

  console.log(`Successfully transferred dashboard ${updatedDashboard.id} to user ${updatedDashboard.userId} and set as default.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
