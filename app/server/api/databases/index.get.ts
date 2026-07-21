import { asc } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { databases } from '~/server/db/schema'

export default defineEventHandler(async (event): Promise<Bdd[]> => {
  await requireUser(event)
  return useDb().select().from(databases).orderBy(asc(databases.name))
})
