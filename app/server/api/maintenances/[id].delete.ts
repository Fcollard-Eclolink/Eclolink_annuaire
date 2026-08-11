import { maintenances } from '~/server/db/schema'
import { maintenanceLabel } from '~/server/utils/activity-log'
import { deleteAndReturn } from '~/server/utils/db-crud'

export default defineEventHandler(async (event): Promise<{ ok: boolean; label?: string; is_monthly_maintenance?: boolean }> => {
  await requireRole(event, WRITE_ROLES)
  const id = requireId(event)

  const row = await deleteAndReturn<Maintenance>(maintenances, maintenances.id, id)
  return {
    ok                    : true,
    label                 : row && await maintenanceLabel(row),
    is_monthly_maintenance: row?.is_monthly_maintenance,
  }
})
