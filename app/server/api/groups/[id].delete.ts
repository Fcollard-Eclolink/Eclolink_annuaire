import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { groups, sites } from '~/server/db/schema'
import { deleteAndReturn } from '~/server/utils/db-crud'

export default defineEventHandler(async (event): Promise<{ ok: boolean; name?: string }> => {
  await requireRole(event, WRITE_ROLES)
  const id = requireId(event)

  // Détache les sites du groupe avant suppression
  await useDb().update(sites).set({ group_id: null }).where(eq(sites.group_id, id))
  const row = await deleteAndReturn<Group>(groups, groups.id, id)

  return { ok: true, name: row?.name }
})
