import { prisma } from '../src/lib/db';
import { runAutomaticIntegrationMigration } from '../src/lib/automatic-integration-migration';

const shouldApply = process.argv.includes('--apply');

async function main() {
  const result = await runAutomaticIntegrationMigration({ dryRun: !shouldApply });
  console.log(
    shouldApply
      ? 'Integration config migration (apply)'
      : 'Integration config migration (report only)',
  );
  console.log('Summary:');
  for (const [action, count] of Object.entries(result.actions)) {
    console.log(`  ${action}: ${count}`);
  }
  result.planned
    .filter((item) => item.action !== 'blocked')
    .forEach((item) => {
      console.log(`  [${item.action}] ${item.widgetType}/${item.widgetName}${item.reason ? ` — ${item.reason}` : ''}`);
    });
  if (result.blocked.length) {
    console.log(`  blocked configurations: ${result.blocked.length}`);
    result.blocked.forEach((item) => {
      console.log(`    ${item.widgetType}/${item.widgetName} — ${item.reason || 'Unknown reason'}`);
    });
  }

  if (!shouldApply) {
    console.log('No data changed. The application applies this migration automatically at startup.');
    return;
  }
  if (result.backupPath) console.log(`Database backup created: ${result.backupPath}`);
  console.log(`Changed dashboards: ${result.changedDashboards}`);
  console.log(`Changed personal widget configs: ${result.changedPersonalConfigs}`);
  console.log(`Created integrations: ${result.createdIntegrations}`);
  console.log(`Repaired integrations: ${result.repairedIntegrations}`);
}

main()
  .catch((error) => {
    console.error('Integration config migration failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
