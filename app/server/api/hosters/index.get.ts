import { asc } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { hosters } from '~/server/db/schema'

export default defineEventHandler(async (event): Promise<Hoster[]> => {
  await requireUser(event)
  return useDb().select().from(hosters).orderBy(asc(hosters.name))
})
