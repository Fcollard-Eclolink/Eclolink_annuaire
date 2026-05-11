interface AgencyCreate {
  name: string
}

export default defineEventHandler(async (event): Promise<Agency> => {
  const body = await readBody<AgencyCreate>(event)
  if (!body.name?.trim()) throw createError({ statusCode: 400, message: 'Le nom est requis' })

  const res = await sbFetch(event, '/rest/v1/eclolink_agencies', {
    method : 'POST',
    body   : JSON.stringify({ id: crypto.randomUUID(), ...body, name: body.name.trim() }),
    headers: { Prefer: 'return=representation' },
  })

  const rows = (await res.json()) as Agency[]
  if (!rows[0]) throw createError({ statusCode: 500, message: 'Erreur lors de la création' })
  return rows[0]
})
