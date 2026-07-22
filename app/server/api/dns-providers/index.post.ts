import { useDb } from '~/server/db'
import { dnsProviders } from '~/server/db/schema'

interface DnsProviderCreate {
  name            : string
  simpleicons_slug?: string | null
}

export default defineEventHandler(async (event): Promise<DnsProvider> => {
  await requireRole(event, WRITE_ROLES)
  const body = await readBody<DnsProviderCreate>(event)

  const [row] = await useDb().insert(dnsProviders).values({
    id              : crypto.randomUUID(),
    name            : requireString(body.name, 'Nom', 200),
    simpleicons_slug: clampString(body.simpleicons_slug, 100),
  }).returning()

  if (!row) throw createError({ statusCode: 500, message: 'Erreur lors de la création' })
  return row
})
