import { asc } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { sites } from '~/server/db/schema'

export default defineEventHandler(async (event): Promise<Site[]> => {
  await requireUser(event)
  return useDb().select().from(sites).orderBy(asc(sites.name))
})
