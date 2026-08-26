export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { ensureAutomaticIntegrationMigration } = await import(
    '@/lib/automatic-integration-migration'
  );
  const result = await ensureAutomaticIntegrationMigration();
  if (
    result.changedDashboards ||
    result.changedPersonalConfigs ||
    result.createdIntegrations ||
    result.repairedIntegrations
  ) {
    console.info('Legacy integration configuration migrated', {
      changedDashboards: result.changedDashboards,
      changedPersonalConfigs: result.changedPersonalConfigs,
      createdIntegrations: result.createdIntegrations,
      repairedIntegrations: result.repairedIntegrations,
      backupPath: result.backupPath,
    });
  }
  if (result.blocked.length) {
    console.warn(
      `${result.blocked.length} legacy widget configuration(s) could not be migrated; reusable credentials will remain redacted from browser responses.`,
    );
  }
}
