import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { technologies } from '~/server/db/schema'

interface TechnologyPatch {
  label           ?: string
  simpleicons_slug?: string | null
  svg             ?: string | null
  sort_order      ?: number
}

export default defineEventHandler(async (event): Promise<Technology> => {
  await requireRole(event, WRITE_ROLES)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requis' })

  const body = await readBody<TechnologyPatch>(event)
  const db   = useDb()

  const patch: Partial<typeof technologies.$inferInsert> = {}
  if (body.label            !== undefined) patch.label            = requireString(body.label, 'Label', 200)
  if (body.simpleicons_slug !== undefined) patch.simpleicons_slug = clampString(body.simpleicons_slug, 100)
  if (body.svg              !== undefined) patch.svg              = body.svg ? sanitizeSvg(body.svg) : null
  if (body.sort_order       !== undefined) patch.sort_order       = validateOptionalNonNegativeNumber(body.sort_order, 'Ordre') ?? 0

  if (Object.keys(patch).length === 0) {
    const [existing] = await db.select().from(technologies).where(eq(technologies.id, id)).limit(1)
    if (!existing) throw createError({ statusCode: 404, message: 'Technologie introuvable' })
    return existing
  }

  const [row] = await db.update(technologies).set(patch).where(eq(technologies.id, id)).returning()
  if (!row) throw createError({ statusCode: 404, message: 'Technologie introuvable' })
  return row
})
