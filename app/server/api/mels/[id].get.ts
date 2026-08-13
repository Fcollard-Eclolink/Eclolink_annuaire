import { asc, eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { melItems, mels } from '~/server/db/schema'

export default defineEventHandler(async (event): Promise<Mel & { items: MelItem[] }> => {
  await requireUser(event)
  const id = requireId(event)

  const db = useDb()
  const [mel] = await db.select().from(mels).where(eq(mels.id, id)).limit(1)
  if (!mel) throw createError({ statusCode: 404, message: 'Mise en ligne introuvable' })

  const items = await db.select().from(melItems).where(eq(melItems.mel_id, id)).orderBy(asc(melItems.sort_order))
  return { ...mel, items }
})
