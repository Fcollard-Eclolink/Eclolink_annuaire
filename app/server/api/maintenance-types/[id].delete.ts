import { maintenanceTypes } from '~/server/db/schema'
import { deleteAndReturn } from '~/server/utils/db-crud'

export default defineEventHandler(async (event): Promise<{ ok: boolean; label?: string }> => {
  await requireRole(event, WRITE_ROLES)
  const id = requireId(event)

  const row = await deleteAndReturn<MaintenanceType>(maintenanceTypes, maintenanceTypes.id, id)
  return { ok: true, label: row?.label }
})
