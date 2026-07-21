import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { hosters } from '~/server/db/schema'

interface HosterPatch {
  name            ?: string
  simpleicons_slug?: string | null
}

export default defineEventHandler(async (event): Promise<Hoster> => {
  await requireRole(event, WRITE_ROLES)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requis' })

  const body = await readBody<HosterPatch>(event)
  const db   = useDb()

  const patch: Partial<typeof hosters.$inferInsert> = {}
  if (body.name             !== undefined) patch.name             = requireString(body.name, 'Nom', 200)
  if (body.simpleicons_slug !== undefined) patch.simpleicons_slug = clampString(body.simpleicons_slug, 100)

  if (Object.keys(patch).length === 0) {
    const [existing] = await db.select().from(hosters).where(eq(hosters.id, id)).limit(1)
    if (!existing) throw createError({ statusCode: 404, message: 'Hébergeur introuvable' })
    return existing
  }

  const [row] = await db.update(hosters).set(patch).where(eq(hosters.id, id)).returning()
  if (!row) throw createError({ statusCode: 404, message: 'Hébergeur introuvable' })
  return row
})
