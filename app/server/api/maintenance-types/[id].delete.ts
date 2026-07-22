import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { maintenanceTypes } from '~/server/db/schema'

export default defineEventHandler(async (event): Promise<{ ok: boolean }> => {
  await requireRole(event, WRITE_ROLES)
  const id = requireId(event)

  await useDb().delete(maintenanceTypes).where(eq(maintenanceTypes.id, id))
  return { ok: true }
})
