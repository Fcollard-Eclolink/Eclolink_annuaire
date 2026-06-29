interface ClientPatch {
  name                 ?: string
  agency               ?: string | null
  contact_name         ?: string | null
  contact_email        ?: string | null
  contact_phone        ?: string | null
  notes                ?: string | null
  monthly_quota_minutes?: number | null
  monthly_amount       ?: number | null
}

export default defineEventHandler(async (event): Promise<Client> => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requis' })

  const body = await readBody<ClientPatch>(event)

  const safePayload: Record<string, unknown> = {}
  if (body.name                  !== undefined) safePayload.name                  = requireString(body.name, 'Nom', 200)
  if (body.agency                !== undefined) safePayload.agency                = clampString(body.agency, 200)
  if (body.contact_name          !== undefined) safePayload.contact_name          = clampString(body.contact_name, 200)
  if (body.contact_email         !== undefined) safePayload.contact_email         = validateOptionalEmail(body.contact_email, 'Email de contact')
  if (body.contact_phone         !== undefined) safePayload.contact_phone         = clampString(body.contact_phone, 50)
  if (body.notes                 !== undefined) safePayload.notes                 = clampString(body.notes, 5000)
  if (body.monthly_quota_minutes !== undefined) safePayload.monthly_quota_minutes = validateOptionalNonNegativeNumber(body.monthly_quota_minutes, 'Quota mensuel')
  if (body.monthly_amount        !== undefined) safePayload.monthly_amount        = validateOptionalNonNegativeNumber(body.monthly_amount, 'Montant forfait')

  const res = await sbFetch(event, `/rest/v1/eclolink_clients?id=eq.${encodeURIComponent(id)}`, {
    method : 'PATCH',
    body   : JSON.stringify(safePayload),
    headers: { Prefer: 'return=representation' },
  })

  const rows = (await res.json()) as Client[]
  if (!rows[0]) throw createError({ statusCode: 404, message: 'Client introuvable' })
  return rows[0]
})
