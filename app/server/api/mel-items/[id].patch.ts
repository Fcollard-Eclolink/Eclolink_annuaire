import { melItems } from '~/server/db/schema'
import { patchOrFetch } from '~/server/utils/db-crud'

interface MelItemPatch {
  is_done: boolean
}

export default defineEventHandler(async (event): Promise<MelItem> => {
  await requireRole(event, WRITE_ROLES)
  const id   = requireId(event)
  const body = await readBody<MelItemPatch>(event)

  return patchOrFetch<MelItem>(melItems, melItems.id, id, {
    is_done: !!body.is_done,
    done_at: body.is_done ? new Date().toISOString() : null,
  }, 'Étape introuvable')
})
