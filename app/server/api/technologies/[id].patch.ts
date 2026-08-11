import { technologies } from '~/server/db/schema'
import { patchOrFetch } from '~/server/utils/db-crud'

interface TechnologyPatch {
  label           ?: string
  simpleicons_slug?: string | null
  svg             ?: string | null
  sort_order      ?: number
}

export default defineEventHandler(async (event): Promise<Technology> => {
  await requireRole(event, WRITE_ROLES)
  const id = requireId(event)
  const body = await readBody<TechnologyPatch>(event)

  const patch: Partial<typeof technologies.$inferInsert> = {}
  if (body.label            !== undefined) patch.label            = requireString(body.label, 'Label', 200)
  if (body.simpleicons_slug !== undefined) patch.simpleicons_slug = clampString(body.simpleicons_slug, 100)
  if (body.svg              !== undefined) patch.svg              = body.svg ? sanitizeSvg(body.svg) : null
  if (body.sort_order       !== undefined) patch.sort_order       = validateOptionalNonNegativeNumber(body.sort_order, 'Ordre') ?? 0

  return patchOrFetch<Technology>(technologies, technologies.id, id, patch, 'Technologie introuvable')
})
