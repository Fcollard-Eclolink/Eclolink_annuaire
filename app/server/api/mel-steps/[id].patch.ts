import { melSteps } from '~/server/db/schema'
import { patchOrFetch } from '~/server/utils/db-crud'

interface MelStepPatch {
  section   ?: string
  label     ?: string
  sort_order?: number
}

export default defineEventHandler(async (event): Promise<MelStep> => {
  await requireRole(event, WRITE_ROLES)
  const id   = requireId(event)
  const body = await readBody<MelStepPatch>(event)

  const patch: Partial<typeof melSteps.$inferInsert> = {}
  if (body.section !== undefined)    patch.section    = requireString(body.section, 'Section', 200)
  if (body.label !== undefined)      patch.label      = requireString(body.label, 'Étape', 500)
  if (body.sort_order !== undefined) patch.sort_order = body.sort_order

  return patchOrFetch<MelStep>(melSteps, melSteps.id, id, patch, 'Étape introuvable')
})
