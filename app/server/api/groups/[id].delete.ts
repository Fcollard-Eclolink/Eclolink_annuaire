import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { groups, sites } from '~/server/db/schema'

export default defineEventHandler(async (event): Promise<{ ok: boolean }> => {
  await requireRole(event, WRITE_ROLES)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requis' })

  const db = useDb()
  // Détache les sites du groupe avant suppression
  await db.update(sites).set({ group_id: null }).where(eq(sites.group_id, id))
  await db.delete(groups).where(eq(groups.id, id))

  return { ok: true }
})
