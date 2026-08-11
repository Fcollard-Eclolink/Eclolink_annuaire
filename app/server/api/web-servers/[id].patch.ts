import { webServers } from '~/server/db/schema'
import { patchOrFetch } from '~/server/utils/db-crud'

interface WebServerPatch {
  name            ?: string
  simpleicons_slug?: string | null
}

export default defineEventHandler(async (event): Promise<WebServer> => {
  await requireRole(event, WRITE_ROLES)
  const id = requireId(event)
  const body = await readBody<WebServerPatch>(event)

  const patch: Partial<typeof webServers.$inferInsert> = {}
  if (body.name             !== undefined) patch.name             = requireString(body.name, 'Nom', 200)
  if (body.simpleicons_slug !== undefined) patch.simpleicons_slug = clampString(body.simpleicons_slug, 100)

  return patchOrFetch<WebServer>(webServers, webServers.id, id, patch, 'Serveur web introuvable')
})
