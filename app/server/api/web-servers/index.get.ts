import { asc } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { webServers } from '~/server/db/schema'

export default defineEventHandler(async (event): Promise<WebServer[]> => {
  await requireUser(event)
  return useDb().select().from(webServers).orderBy(asc(webServers.name))
})
