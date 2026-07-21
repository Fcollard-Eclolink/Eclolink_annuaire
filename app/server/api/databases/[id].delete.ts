import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { databases } from '~/server/db/schema'

export default defineEventHandler(async (event): Promise<{ ok: boolean }> => {
  await requireRole(event, WRITE_ROLES)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requis' })

  await useDb().delete(databases).where(eq(databases.id, id))
  return { ok: true }
})
