import { asc } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { melSteps } from '~/server/db/schema'

export default defineEventHandler(async (event): Promise<MelStep[]> => {
  await requireUser(event)
  return useDb().select().from(melSteps).orderBy(asc(melSteps.sort_order))
})
