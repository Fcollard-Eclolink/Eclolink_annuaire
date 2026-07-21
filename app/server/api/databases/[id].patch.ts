import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { databases } from '~/server/db/schema'

interface BddPatch {
  name ?: string
  type ?: string | null
  notes?: string | null
}

export default defineEventHandler(async (event): Promise<Bdd> => {
  await requireRole(event, WRITE_ROLES)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requis' })

  const body = await readBody<BddPatch>(event)
  const db   = useDb()

  const patch: Partial<typeof databases.$inferInsert> = {}
  if (body.name  !== undefined) patch.name  = requireString(body.name, 'Nom', 200)
  if (body.type  !== undefined) patch.type  = clampString(body.type, 100)
  if (body.notes !== undefined) patch.notes = clampString(body.notes, 5000)

  if (Object.keys(patch).length === 0) {
    const [existing] = await db.select().from(databases).where(eq(databases.id, id)).limit(1)
    if (!existing) throw createError({ statusCode: 404, message: 'Base de données introuvable' })
    return existing
  }

  const [row] = await db.update(databases).set(patch).where(eq(databases.id, id)).returning()
  if (!row) throw createError({ statusCode: 404, message: 'Base de données introuvable' })
  return row
})
