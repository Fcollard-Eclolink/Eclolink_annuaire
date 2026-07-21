import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { groups } from '~/server/db/schema'

interface GroupPatch {
  name       ?: string
  hoster     ?: string | null
  ip_local   ?: string | null
  ip_public  ?: string | null
  web_server ?: string | null
  database_id?: string | null
}

export default defineEventHandler(async (event): Promise<Group> => {
  await requireRole(event, WRITE_ROLES)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requis' })

  const body = await readBody<GroupPatch>(event)
  const db   = useDb()

  const patch: Partial<typeof groups.$inferInsert> = {}
  if (body.name        !== undefined) patch.name        = requireString(body.name, 'Nom', 200)
  if (body.hoster      !== undefined) patch.hoster      = clampString(body.hoster, 200)
  if (body.ip_local    !== undefined) patch.ip_local    = clampString(body.ip_local, 100)
  if (body.ip_public   !== undefined) patch.ip_public   = clampString(body.ip_public, 100)
  if (body.web_server  !== undefined) patch.web_server  = clampString(body.web_server, 200)
  if (body.database_id !== undefined) patch.database_id = body.database_id ?? null

  if (Object.keys(patch).length === 0) {
    const [existing] = await db.select().from(groups).where(eq(groups.id, id)).limit(1)
    if (!existing) throw createError({ statusCode: 404, message: 'Serveur introuvable' })
    return existing
  }

  const [row] = await db.update(groups).set(patch).where(eq(groups.id, id)).returning()
  if (!row) throw createError({ statusCode: 404, message: 'Serveur introuvable' })
  return row
})
