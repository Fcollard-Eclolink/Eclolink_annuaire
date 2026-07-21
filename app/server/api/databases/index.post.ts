import { useDb } from '~/server/db'
import { databases } from '~/server/db/schema'

interface BddCreate {
  name : string
  type ?: string | null
  notes?: string | null
}

export default defineEventHandler(async (event): Promise<Bdd> => {
  await requireRole(event, WRITE_ROLES)
  const body = await readBody<BddCreate>(event)

  const [row] = await useDb().insert(databases).values({
    id   : crypto.randomUUID(),
    name : requireString(body.name, 'Nom', 200),
    type : clampString(body.type, 100),
    notes: clampString(body.notes, 5000),
  }).returning()

  if (!row) throw createError({ statusCode: 500, message: 'Erreur lors de la création' })
  return row
})
