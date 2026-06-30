interface MaintenanceCreate {
  site_id               : string
  client_id             ?: string | null
  developer_id          ?: string | null
  intervention_date     : string
  has_incident          ?: boolean
  types                 ?: string | null
  notes                 ?: string | null
  duration_minutes      ?: number | null
  is_monthly_maintenance?: boolean
}

export default defineEventHandler(async (event): Promise<Maintenance> => {
  const body = await readBody<MaintenanceCreate>(event)

  const safePayload = {
    id                    : crypto.randomUUID(),
    site_id               : requireString(body.site_id, 'Site', 50),
    client_id             : body.client_id ?? null,
    developer_id          : body.developer_id ?? null,
    intervention_date     : requireIsoDate(body.intervention_date, 'Date d\'intervention'),
    has_incident          : !!body.has_incident,
    types                 : clampString(body.types, 500),
    notes                 : clampString(body.notes, 5000),
    duration_minutes      : validateOptionalNonNegativeNumber(body.duration_minutes, 'Durée'),
    is_monthly_maintenance: !!body.is_monthly_maintenance,
  }

  const res = await sbFetch(event, '/rest/v1/eclolink_maintenances', {
    method : 'POST',
    body   : JSON.stringify(safePayload),
    headers: { Prefer: 'return=representation' },
  })

  const rows = (await res.json()) as Maintenance[]
  if (!rows[0]) throw createError({ statusCode: 500, message: 'Erreur lors de la création' })
  void logActivity(event, 'create', 'maintenance', rows[0].id, rows[0].site_id)
  return rows[0]
})
