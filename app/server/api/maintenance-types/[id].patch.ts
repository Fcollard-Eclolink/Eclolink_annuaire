import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { maintenanceTypes } from '~/server/db/schema'

interface MaintenanceTypePatch {
  label?: string
}

export default defineEventHandler(async (event): Promise<MaintenanceType> => {
  await requireRole(event, WRITE_ROLES)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requis' })

  const body = await readBody<MaintenanceTypePatch>(event)
  const db   = useDb()

  const patch: Partial<typeof maintenanceTypes.$inferInsert> = {}
  if (body.label !== undefined) patch.label = requireString(body.label, 'Label', 200)

  if (Object.keys(patch).length === 0) {
    const [existing] = await db.select().from(maintenanceTypes).where(eq(maintenanceTypes.id, id)).limit(1)
    if (!existing) throw createError({ statusCode: 404, message: 'Type de maintenance introuvable' })
    return existing
  }

  const [row] = await db.update(maintenanceTypes).set(patch).where(eq(maintenanceTypes.id, id)).returning()
  if (!row) throw createError({ statusCode: 404, message: 'Type de maintenance introuvable' })
  return row
})
