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
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requis' })

  const body = await readBody<MaintenancePatch>(event)

  const safePayload: Record<string, unknown> = {}
  if (body.site_id                !== undefined) safePayload.site_id                = requireString(body.site_id, 'Site', 50)
  if (body.client_id              !== undefined) safePayload.client_id              = body.client_id    ?? null
  if (body.developer_id           !== undefined) safePayload.developer_id           = body.developer_id ?? null
  if (body.intervention_date      !== undefined) safePayload.intervention_date      = requireIsoDate(body.intervention_date, 'Date d\'intervention')
  if (body.has_incident           !== undefined) safePayload.has_incident           = !!body.has_incident
  if (body.types                  !== undefined) safePayload.types                  = clampString(body.types, 500)
  if (body.notes                  !== undefined) safePayload.notes                  = clampString(body.notes, 5000)
  if (body.duration_minutes       !== undefined) safePayload.duration_minutes      = validateOptionalNonNegativeNumber(body.duration_minutes, 'Durée')
  if (body.is_monthly_maintenance !== undefined) safePayload.is_monthly_maintenance = !!body.is_monthly_maintenance

  const res = await sbFetch(event, `/rest/v1/eclolink_maintenances?id=eq.${encodeURIComponent(id)}`, {
    method : 'PATCH',
    body   : JSON.stringify(safePayload),
    headers: { Prefer: 'return=representation' },
  })

  const rows = (await res.json()) as Maintenance[]
  if (!rows[0]) throw createError({ statusCode: 404, message: 'Intervention introuvable' })
  void logActivity(event, 'update', 'maintenance', rows[0].id, rows[0].site_id)
  return rows[0]
})
