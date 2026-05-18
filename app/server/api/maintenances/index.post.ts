interface MaintenanceCreate {
  site_id          : string
  client_id        ?: string | null
  developer_id     ?: string | null
  intervention_date: string
  has_incident     ?: boolean
  types            ?: string | null
  notes            ?: string | null
  duration_minutes ?: number | null
}

export default defineEventHandler(async (event): Promise<Maintenance> => {
  const body = await readBody<MaintenanceCreate>(event)
  if (!body.site_id?.trim()) {
    throw createError({ statusCode: 400, message: 'Le site est requis' })
  }
  if (!body.intervention_date?.trim()) {
    throw createError({ statusCode: 400, message: 'La date d’intervention est requise' })
  }

  const res = await sbFetch(event, '/rest/v1/eclolink_maintenances', {
    method : 'POST',
    body   : JSON.stringify({
      id               : crypto.randomUUID(),
      site_id          : body.site_id,
      client_id        : body.client_id ?? null,
      developer_id     : body.developer_id ?? null,
      intervention_date: body.intervention_date,
      has_incident     : body.has_incident ?? false,
      types            : body.types ?? null,
      notes            : body.notes ?? null,
      duration_minutes : body.duration_minutes ?? null,
    }),
    headers: { Prefer: 'return=representation' },
  })

  const rows = (await res.json()) as Maintenance[]
  if (!rows[0]) throw createError({ statusCode: 500, message: 'Erreur lors de la création' })
  return rows[0]
})
