import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { technologies } from '~/server/db/schema'

export default defineEventHandler(async (event): Promise<{ ok: boolean }> => {
  await requireRole(event, WRITE_ROLES)
  const id = requireId(event)

  await useDb().delete(technologies).where(eq(technologies.id, id))
  return { ok: true }
})
