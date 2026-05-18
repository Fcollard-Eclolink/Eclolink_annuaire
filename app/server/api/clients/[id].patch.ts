interface ClientPatch {
  name                 ?: string
  agency               ?: string | null
  contact_name         ?: string | null
  contact_email        ?: string | null
  notes                ?: string | null
  monthly_quota_minutes?: number | null
}

export default defineEventHandler(async (event): Promise<Client> => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requis' })

  const body = await readBody<ClientPatch>(event)
  if (body.name !== undefined && !body.name.trim()) {
    throw createError({ statusCode: 400, message: 'Le nom est requis' })
  }

  const res = await sbFetch(event, `/rest/v1/eclolink_clients?id=eq.${encodeURIComponent(id)}`, {
    method : 'PATCH',
    body   : JSON.stringify(body),
    headers: { Prefer: 'return=representation' },
  })

  const rows = (await res.json()) as Client[]
  if (!rows[0]) throw createError({ statusCode: 404, message: 'Client introuvable' })
  return rows[0]
})
