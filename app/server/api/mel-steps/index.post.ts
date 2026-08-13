import { useDb } from '~/server/db'
import { melSteps } from '~/server/db/schema'
import { assertRow } from '~/server/utils/db-crud'

interface MelStepCreate {
  section: string
  label  : string
}

export default defineEventHandler(async (event): Promise<MelStep> => {
  await requireRole(event, WRITE_ROLES)
  const body = await readBody<MelStepCreate>(event)

  const db = useDb()
  const existing  = await db.select().from(melSteps)
  const nextOrder = existing.reduce((max, s) => Math.max(max, s.sort_order), -1) + 1

  const [row] = await db.insert(melSteps).values({
    id        : crypto.randomUUID(),
    section   : requireString(body.section, 'Section', 200),
    label     : requireString(body.label, 'Étape', 500),
    sort_order: nextOrder,
  }).returning()

  return assertRow(row, 'Erreur lors de la création')
})
