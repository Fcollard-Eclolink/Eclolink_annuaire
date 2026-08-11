import { useDb } from '~/server/db'
import { hosters } from '~/server/db/schema'
import { assertRow } from '~/server/utils/db-crud'

interface HosterCreate {
  name            : string
  simpleicons_slug?: string | null
}

export default defineEventHandler(async (event): Promise<Hoster> => {
  await requireRole(event, WRITE_ROLES)
  const body = await readBody<HosterCreate>(event)

  const [row] = await useDb().insert(hosters).values({
    id              : crypto.randomUUID(),
    name            : requireString(body.name, 'Nom', 200),
    simpleicons_slug: clampString(body.simpleicons_slug, 100),
  }).returning()

  return assertRow(row, 'Erreur lors de la création')
})
