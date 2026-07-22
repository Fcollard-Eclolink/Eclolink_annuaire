import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { sites } from '~/server/db/schema'

export default defineEventHandler(async (event): Promise<{ ok: boolean }> => {
  await requireRole(event, WRITE_ROLES)
  const id = requireId(event)

  await useDb().delete(sites).where(eq(sites.id, id))
  return { ok: true }
})
