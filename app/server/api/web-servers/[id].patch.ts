import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { webServers } from '~/server/db/schema'

interface WebServerPatch {
  name            ?: string
  simpleicons_slug?: string | null
}

export default defineEventHandler(async (event): Promise<WebServer> => {
  await requireRole(event, WRITE_ROLES)
  const id = requireId(event)

  const body = await readBody<WebServerPatch>(event)
  const db   = useDb()

  const patch: Partial<typeof webServers.$inferInsert> = {}
  if (body.name             !== undefined) patch.name             = requireString(body.name, 'Nom', 200)
  if (body.simpleicons_slug !== undefined) patch.simpleicons_slug = clampString(body.simpleicons_slug, 100)

  if (Object.keys(patch).length === 0) {
    const [existing] = await db.select().from(webServers).where(eq(webServers.id, id)).limit(1)
    if (!existing) throw createError({ statusCode: 404, message: 'Serveur web introuvable' })
    return existing
  }

  const [row] = await db.update(webServers).set(patch).where(eq(webServers.id, id)).returning()
  if (!row) throw createError({ statusCode: 404, message: 'Serveur web introuvable' })
  return row
})
