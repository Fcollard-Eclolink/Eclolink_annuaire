import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { webServers } from '~/server/db/schema'

export default defineEventHandler(async (event): Promise<{ ok: boolean }> => {
  await requireRole(event, WRITE_ROLES)
  const id = requireId(event)

  await useDb().delete(webServers).where(eq(webServers.id, id))
  return { ok: true }
})
