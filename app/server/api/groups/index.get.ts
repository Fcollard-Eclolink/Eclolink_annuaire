import { asc } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { groups } from '~/server/db/schema'

export default defineEventHandler(async (event): Promise<Group[]> => {
  await requireUser(event)
  return useDb().select().from(groups).orderBy(asc(groups.name))
})
