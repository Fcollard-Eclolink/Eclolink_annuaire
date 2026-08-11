import { useDb } from '~/server/db'
import { agencies } from '~/server/db/schema'
import { assertRow } from '~/server/utils/db-crud'

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

  return assertRow(row, 'Erreur lors de la création')
})
