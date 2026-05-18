interface MaintenanceTypePatch {
  label?: string
}

export default defineEventHandler(async (event): Promise<MaintenanceType> => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requis' })

  const body = await readBody<MaintenanceTypePatch>(event)
  if (body.label !== undefined && !body.label.trim()) {
    throw createError({ statusCode: 400, message: 'Le label est requis' })
  }

  const res = await sbFetch(event, `/rest/v1/eclolink_maintenance_types?id=eq.${encodeURIComponent(id)}`, {
    method : 'PATCH',
    body   : JSON.stringify(body),
    headers: { Prefer: 'return=representation' },
  })

  const rows = (await res.json()) as MaintenanceType[]
  if (!rows[0]) throw createError({ statusCode: 404, message: 'Type de maintenance introuvable' })
  return rows[0]
})
