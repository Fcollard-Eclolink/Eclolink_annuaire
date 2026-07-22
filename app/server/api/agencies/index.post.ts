import { useDb } from '~/server/db'
import { agencies } from '~/server/db/schema'

interface AgencyCreate {
  name: string
}

export default defineEventHandler(async (event): Promise<Agency> => {
  await requireRole(event, WRITE_ROLES)
  const body = await readBody<AgencyCreate>(event)

  const [row] = await useDb().insert(agencies).values({
    id  : crypto.randomUUID(),
    name: requireString(body.name, 'Nom', 200),
  }).returning()

  if (!row) throw createError({ statusCode: 500, message: 'Erreur lors de la création' })
  return row
})
