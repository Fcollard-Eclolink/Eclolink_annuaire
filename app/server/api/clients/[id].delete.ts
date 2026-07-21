import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { clients } from '~/server/db/schema'

export default defineEventHandler(async (event): Promise<{ ok: boolean }> => {
  await requireRole(event, WRITE_ROLES)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requis' })

  await useDb().delete(clients).where(eq(clients.id, id))
  return { ok: true }
})
