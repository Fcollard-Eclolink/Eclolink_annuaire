import { asc } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { technologies } from '~/server/db/schema'

export default defineEventHandler(async (event): Promise<Technology[]> => {
  await requireUser(event)
  return useDb().select().from(technologies).orderBy(asc(technologies.label))
})
