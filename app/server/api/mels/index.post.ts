import { asc } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { melItems, melSteps, mels } from '~/server/db/schema'
import { assertRow } from '~/server/utils/db-crud'

interface MelCreate {
  site_id: string
}

export default defineEventHandler(async (event): Promise<Mel> => {
  await requireRole(event, WRITE_ROLES)
  const body    = await readBody<MelCreate>(event)
  const siteId  = requireString(body.site_id, 'Site', 50)

  const db  = useDb()
  const [row] = await db.insert(mels).values({ id: crypto.randomUUID(), site_id: siteId }).returning()
  const created = assertRow(row, 'Erreur lors de la création')

  const steps = await db.select().from(melSteps).orderBy(asc(melSteps.sort_order))
  if (steps.length) {
    await db.insert(melItems).values(steps.map(s => ({
      id        : crypto.randomUUID(),
      mel_id    : created.id,
      section   : s.section,
      label     : s.label,
      sort_order: s.sort_order,
    })))
  }

  return created
})
