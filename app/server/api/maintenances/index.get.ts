import { desc } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { maintenances } from '~/server/db/schema'

export default defineEventHandler(async (event): Promise<Maintenance[]> => {
  await requireUser(event)
  return useDb().select().from(maintenances)
    .orderBy(desc(maintenances.intervention_date), desc(maintenances.created_at))
})
