import type { Client } from '~/server/utils/types'
import { asc } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { clients } from '~/server/db/schema'

export default defineEventHandler(async (event): Promise<Client[]> => {
  await requireUser(event)
  return useDb().select().from(clients).orderBy(asc(clients.name))
})
