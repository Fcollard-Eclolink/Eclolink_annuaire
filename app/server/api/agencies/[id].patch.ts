interface AgencyPatch {
  name?: string
}

export default defineEventHandler(async (event): Promise<Agency> => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requis' })

  const body = await readBody<AgencyPatch>(event)
  if (body.name !== undefined && !body.name.trim()) {
    throw createError({ statusCode: 400, message: 'Le nom est requis' })
  }

  const res = await sbFetch(event, `/rest/v1/eclolink_agencies?id=eq.${encodeURIComponent(id)}`, {
    method : 'PATCH',
    body   : JSON.stringify(body),
    headers: { Prefer: 'return=representation' },
  })

  const rows = (await res.json()) as Agency[]
  if (!rows[0]) throw createError({ statusCode: 404, message: 'Agence introuvable' })
  return rows[0]
})
