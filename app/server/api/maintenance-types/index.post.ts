interface MaintenanceTypeCreate {
  label: string
}

export default defineEventHandler(async (event): Promise<MaintenanceType> => {
  const body = await readBody<MaintenanceTypeCreate>(event)
  if (!body.label?.trim()) throw createError({ statusCode: 400, message: 'Le label est requis' })

  const res = await sbFetch(event, '/rest/v1/eclolink_maintenance_types', {
    method : 'POST',
    body   : JSON.stringify({
      id   : crypto.randomUUID(),
      label: body.label.trim(),
    }),
    headers: { Prefer: 'return=representation' },
  })

  const rows = (await res.json()) as MaintenanceType[]
  if (!rows[0]) throw createError({ statusCode: 500, message: 'Erreur lors de la création' })
  return rows[0]
})
