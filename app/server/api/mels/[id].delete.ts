import { mels } from '~/server/db/schema'
import { deleteAndReturn } from '~/server/utils/db-crud'

export default defineEventHandler(async (event): Promise<{ ok: boolean }> => {
  await requireRole(event, WRITE_ROLES)
  const id = requireId(event)
  await deleteAndReturn<Mel>(mels, mels.id, id)
  return { ok: true }
})
