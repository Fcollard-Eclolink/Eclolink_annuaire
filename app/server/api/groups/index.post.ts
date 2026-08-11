import { useDb } from '~/server/db'
import { groups } from '~/server/db/schema'
import { assertRow } from '~/server/utils/db-crud'

interface GroupCreate {
  name       : string
  hoster     ?: string | null
  ip_local   ?: string | null
  ip_public  ?: string | null
  web_server ?: string | null
  database_id?: string | null
}

export default defineEventHandler(async (event): Promise<Group> => {
  await requireRole(event, WRITE_ROLES)
  const body = await readBody<GroupCreate>(event)

  const [row] = await useDb().insert(groups).values({
    id         : crypto.randomUUID(),
    name       : requireString(body.name, 'Nom', 200),
    hoster     : clampString(body.hoster, 200),
    ip_local   : clampString(body.ip_local, 100),
    ip_public  : clampString(body.ip_public, 100),
    web_server : clampString(body.web_server, 200),
    database_id: body.database_id ?? null,
  }).returning()

  return assertRow(row, 'Erreur lors de la création')
})
