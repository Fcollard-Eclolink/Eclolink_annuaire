import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { maintenances } from '~/server/db/schema'

interface MaintenancePatch {
  site_id               ?: string
  client_id             ?: string | null
  developer_id          ?: string | null
  intervention_date     ?: string
  has_incident          ?: boolean
  types                 ?: string | null
  notes                 ?: string | null
  duration_minutes      ?: number | null
  is_monthly_maintenance?: boolean
}

export default defineEventHandler(async (event): Promise<Maintenance> => {
  await requireRole(event, WRITE_ROLES)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requis' })

  const body = await readBody<MaintenancePatch>(event)
  const db   = useDb()

  const patch: Partial<typeof maintenances.$inferInsert> = {}
  if (body.site_id                !== undefined) patch.site_id                = requireString(body.site_id, 'Site', 50)
  if (body.client_id              !== undefined) patch.client_id              = body.client_id ?? null
  if (body.developer_id           !== undefined) patch.developer_id           = body.developer_id ?? null
  if (body.intervention_date      !== undefined) patch.intervention_date      = requireIsoDate(body.intervention_date, 'Date d\'intervention')
  if (body.has_incident           !== undefined) patch.has_incident           = !!body.has_incident
  if (body.types                  !== undefined) patch.types                  = clampString(body.types, 500)
  if (body.notes                  !== undefined) patch.notes                  = clampString(body.notes, 5000)
  if (body.duration_minutes       !== undefined) patch.duration_minutes       = validateOptionalNonNegativeNumber(body.duration_minutes, 'Durée')
  if (body.is_monthly_maintenance !== undefined) patch.is_monthly_maintenance = !!body.is_monthly_maintenance

  if (Object.keys(patch).length === 0) {
    const [existing] = await db.select().from(maintenances).where(eq(maintenances.id, id)).limit(1)
    if (!existing) throw createError({ statusCode: 404, message: 'Intervention introuvable' })
    return existing
  }

  const [row] = await db.update(maintenances).set(patch).where(eq(maintenances.id, id)).returning()
  if (!row) throw createError({ statusCode: 404, message: 'Intervention introuvable' })
  void logActivity(event, 'update', 'maintenance', row.id, row.site_id)
  return row
})
