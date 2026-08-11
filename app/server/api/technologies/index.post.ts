import { useDb } from '~/server/db'
import { technologies } from '~/server/db/schema'
import { assertRow } from '~/server/utils/db-crud'

interface TechnologyCreate {
  label           : string
  simpleicons_slug?: string | null
  svg             ?: string | null
  sort_order      ?: number
}

export default defineEventHandler(async (event): Promise<Technology> => {
  await requireRole(event, WRITE_ROLES)
  const body = await readBody<TechnologyCreate>(event)

  const [row] = await useDb().insert(technologies).values({
    id              : crypto.randomUUID(),
    label           : requireString(body.label, 'Label', 200),
    simpleicons_slug: clampString(body.simpleicons_slug, 100),
    // Sanitize SVG : strip event handlers, scripts, javascript: URLs (XSS)
    svg             : body.svg ? sanitizeSvg(body.svg) : null,
    sort_order      : validateOptionalNonNegativeNumber(body.sort_order, 'Ordre') ?? 0,
  }).returning()

  return assertRow(row, 'Erreur lors de la création')
})
