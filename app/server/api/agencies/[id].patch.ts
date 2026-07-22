import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { agencies } from '~/server/db/schema'

interface AgencyPatch {
  name?: string
}

export default defineEventHandler(async (event): Promise<Agency> => {
  await requireRole(event, WRITE_ROLES)
  const id = requireId(event)

  const body = await readBody<AgencyPatch>(event)
  const db   = useDb()

  const patch: Partial<typeof agencies.$inferInsert> = {}
  if (body.name !== undefined) patch.name = requireString(body.name, 'Nom', 200)

  if (Object.keys(patch).length === 0) {
    const [existing] = await db.select().from(agencies).where(eq(agencies.id, id)).limit(1)
    if (!existing) throw createError({ statusCode: 404, message: 'Agence introuvable' })
    return existing
  }

  const [row] = await db.update(agencies).set(patch).where(eq(agencies.id, id)).returning()
  if (!row) throw createError({ statusCode: 404, message: 'Agence introuvable' })
  return row
})
