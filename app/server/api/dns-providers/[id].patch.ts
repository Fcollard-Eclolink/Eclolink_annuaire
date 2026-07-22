import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { dnsProviders } from '~/server/db/schema'

interface DnsProviderPatch {
  name            ?: string
  simpleicons_slug?: string | null
}

export default defineEventHandler(async (event): Promise<DnsProvider> => {
  await requireRole(event, WRITE_ROLES)
  const id = requireId(event)

  const body = await readBody<DnsProviderPatch>(event)
  const db   = useDb()

  const patch: Partial<typeof dnsProviders.$inferInsert> = {}
  if (body.name             !== undefined) patch.name             = requireString(body.name, 'Nom', 200)
  if (body.simpleicons_slug !== undefined) patch.simpleicons_slug = clampString(body.simpleicons_slug, 100)

  if (Object.keys(patch).length === 0) {
    const [existing] = await db.select().from(dnsProviders).where(eq(dnsProviders.id, id)).limit(1)
    if (!existing) throw createError({ statusCode: 404, message: 'Fournisseur DNS introuvable' })
    return existing
  }

  const [row] = await db.update(dnsProviders).set(patch).where(eq(dnsProviders.id, id)).returning()
  if (!row) throw createError({ statusCode: 404, message: 'Fournisseur DNS introuvable' })
  return row
})
