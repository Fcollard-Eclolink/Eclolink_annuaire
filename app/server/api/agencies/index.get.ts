import { asc } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { agencies } from '~/server/db/schema'

export default defineEventHandler(async (event): Promise<Agency[]> => {
  await requireUser(event)
  return useDb().select().from(agencies).orderBy(asc(agencies.name))
})
