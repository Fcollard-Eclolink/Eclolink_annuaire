import { maintenanceTypes } from '~/server/db/schema'
import { patchOrFetch } from '~/server/utils/db-crud'

interface MaintenanceTypePatch {
  label?: string
}

export default defineEventHandler(async (event): Promise<MaintenanceType> => {
  await requireRole(event, WRITE_ROLES)
  const id = requireId(event)
  const body = await readBody<MaintenanceTypePatch>(event)

  const patch: Partial<typeof maintenanceTypes.$inferInsert> = {}
  if (body.label !== undefined) patch.label = requireString(body.label, 'Label', 200)

  return patchOrFetch<MaintenanceType>(maintenanceTypes, maintenanceTypes.id, id, patch, 'Type de maintenance introuvable')
})
