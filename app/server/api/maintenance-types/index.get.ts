import { asc } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { maintenanceTypes } from '~/server/db/schema'

export default defineEventHandler(async (event): Promise<MaintenanceType[]> => {
  await requireUser(event)
  return useDb().select().from(maintenanceTypes).orderBy(asc(maintenanceTypes.label))
})
