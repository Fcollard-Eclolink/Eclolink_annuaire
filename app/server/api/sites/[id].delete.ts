import { sites } from '~/server/db/schema'
import { deleteAndReturn } from '~/server/utils/db-crud'

export default defineEventHandler(async (event): Promise<{ ok: boolean; name?: string }> => {
  await requireRole(event, WRITE_ROLES)
  const id = requireId(event)

  const row = await deleteAndReturn<Site>(sites, sites.id, id)
  return { ok: true, name: row?.name }
})
