interface ClientCreate {
  name                 : string
  agency               ?: string | null
  contact_name         ?: string | null
  contact_email        ?: string | null
  notes                ?: string | null
  monthly_quota_minutes?: number | null
}

export default defineEventHandler(async (event): Promise<Client> => {
  const body = await readBody<ClientCreate>(event)
  if (!body.name?.trim()) throw createError({ statusCode: 400, message: 'Le nom est requis' })

  const res = await sbFetch(event, '/rest/v1/eclolink_clients', {
    method : 'POST',
    body   : JSON.stringify({ id: crypto.randomUUID(), ...body, name: body.name.trim(), monthly_quota_minutes: body.monthly_quota_minutes ?? null }),
    headers: { Prefer: 'return=representation' },
  })

  const rows = (await res.json()) as Client[]
  if (!rows[0]) throw createError({ statusCode: 500, message: 'Erreur lors de la création' })
  return rows[0]
})
