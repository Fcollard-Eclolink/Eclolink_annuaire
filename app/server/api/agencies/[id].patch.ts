import { agencies } from '~/server/db/schema'
import { patchOrFetch } from '~/server/utils/db-crud'

interface AgencyPatch {
  name?: string
}

export default defineEventHandler(async (event): Promise<Agency> => {
  await requireRole(event, WRITE_ROLES)
  const id = requireId(event)
  const body = await readBody<AgencyPatch>(event)

  const patch: Partial<typeof agencies.$inferInsert> = {}
  if (body.name !== undefined) patch.name = requireString(body.name, 'Nom', 200)

  return patchOrFetch<Agency>(agencies, agencies.id, id, patch, 'Agence introuvable')
})
