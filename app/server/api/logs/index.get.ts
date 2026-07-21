import type { ActivityLog } from '~/server/utils/types'
import { desc, lt } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { activityLogs } from '~/server/db/schema'

export default defineEventHandler(async (event): Promise<ActivityLog[]> => {
  await requireUser(event)
  const db = useDb()

  // Auto-cleanup : supprime les entrées de plus de 2 mois (fire-and-forget)
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - 2)
  void Promise.resolve(
    db.delete(activityLogs).where(lt(activityLogs.created_at, cutoff.toISOString())),
  ).catch(() => undefined)

  const query  = getQuery(event)
  const page   = Math.max(1, parseInt(String(query.page ?? '1')))
  const limit  = 50
  const offset = (page - 1) * limit

  return db.select().from(activityLogs)
    .orderBy(desc(activityLogs.created_at))
    .limit(limit)
    .offset(offset)
})
