import type { Client } from '~/server/utils/types'
import { clients } from '~/server/db/schema'
import { deleteAndReturn } from '~/server/utils/db-crud'

export default defineEventHandler(async (event): Promise<{ ok: boolean; name?: string }> => {
  await requireRole(event, WRITE_ROLES)
  const id = requireId(event)

  const row = await deleteAndReturn<Client>(clients, clients.id, id)
  return { ok: true, name: row?.name }
})
