import type { ActivityLog } from '~/server/utils/types'

export default defineEventHandler(async (event): Promise<ActivityLog[]> => {
  // Auto-cleanup : supprime les entrées de plus de 2 mois (fire-and-forget)
  const cutoff = new Date()
  cutoff.setMonth(cutoff.getMonth() - 2)
  sbFetch(event, `/rest/v1/eclolink_activity_logs?created_at=lt.${cutoff.toISOString()}`, {
    method: 'DELETE',
  }).catch(() => undefined)

  const query  = getQuery(event)
  const page   = Math.max(1, parseInt(String(query.page ?? '1')))
  const limit  = 50
  const offset = (page - 1) * limit

  const res = await sbFetch(
    event,
    `/rest/v1/eclolink_activity_logs?select=*&order=created_at.desc&limit=${limit}&offset=${offset}`,
    { headers: { Prefer: 'count=exact' } },
  )

  return (await res.json()) as ActivityLog[]
})
