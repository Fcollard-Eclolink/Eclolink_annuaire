interface MaintenancePatch {
  site_id          ?: string
  client_id        ?: string | null
  developer_id     ?: string | null
  intervention_date?: string
  has_incident     ?: boolean
  types            ?: string | null
  notes            ?: string | null
  duration_minutes ?: number | null
}

export default defineEventHandler(async (event): Promise<Maintenance> => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requis' })

  const body = await readBody<MaintenancePatch>(event)
  if (body.site_id !== undefined && !body.site_id.trim()) {
    throw createError({ statusCode: 400, message: 'Le site est requis' })
  }
  if (body.intervention_date !== undefined && !body.intervention_date.trim()) {
    throw createError({ statusCode: 400, message: 'La date d’intervention est requise' })
  }

  const res = await sbFetch(event, `/rest/v1/eclolink_maintenances?id=eq.${encodeURIComponent(id)}`, {
    method : 'PATCH',
    body   : JSON.stringify(body),
    headers: { Prefer: 'return=representation' },
  })

  const rows = (await res.json()) as Maintenance[]
  if (!rows[0]) throw createError({ statusCode: 404, message: 'Intervention introuvable' })
  return rows[0]
})
