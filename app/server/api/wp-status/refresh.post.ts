// Relance manuelle de la tâche planifiée check-wp-updates — réservé dev/sysadmin
// (les autres rôles n'ont pas besoin de forcer une vérification hors du cron quotidien).
interface CheckWpResult { total: number; checked: number }

export default defineEventHandler(async (event): Promise<CheckWpResult> => {
  await requireRole(event, ['sysadmin', 'dev'])

  const { result } = await runTask<CheckWpResult>('check-wp-updates')
  return assertRow(result, 'Erreur lors de la vérification WordPress')
})
