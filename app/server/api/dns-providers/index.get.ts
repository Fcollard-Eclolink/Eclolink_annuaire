import { asc } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { dnsProviders } from '~/server/db/schema'

export default defineEventHandler(async (event): Promise<DnsProvider[]> => {
  await requireUser(event)
  return useDb().select().from(dnsProviders).orderBy(asc(dnsProviders.name))
})
