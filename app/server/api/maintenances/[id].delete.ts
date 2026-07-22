import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { maintenances } from '~/server/db/schema'

export default defineEventHandler(async (event): Promise<{ ok: boolean }> => {
  await requireRole(event, WRITE_ROLES)
  const id = requireId(event)

  await useDb().delete(maintenances).where(eq(maintenances.id, id))
  return { ok: true }
})
