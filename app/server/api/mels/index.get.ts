import { desc } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { melItems, mels } from '~/server/db/schema'

export default defineEventHandler(async (event): Promise<MelSummary[]> => {
  await requireUser(event)
  const db = useDb()

  const rows  = await db.select().from(mels).orderBy(desc(mels.created_at))
  const items = await db.select({ mel_id: melItems.mel_id, is_done: melItems.is_done }).from(melItems)

  const counts = new Map<string, { total: number; done: number }>()
  for (const item of items) {
    const c = counts.get(item.mel_id) ?? { total: 0, done: 0 }
    c.total += 1
    if (item.is_done) c.done += 1
    counts.set(item.mel_id, c)
  }

  return rows.map(row => ({
    ...row,
    total_items: counts.get(row.id)?.total ?? 0,
    done_items : counts.get(row.id)?.done ?? 0,
  }))
})
