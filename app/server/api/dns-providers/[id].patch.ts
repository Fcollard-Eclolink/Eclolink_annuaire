interface DnsProviderPatch {
  name            ?: string
  simpleicons_slug?: string | null
}

export default defineEventHandler(async (event): Promise<DnsProvider> => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requis' })

  const body = await readBody<DnsProviderPatch>(event)
  if (body.name !== undefined && !body.name.trim()) {
    throw createError({ statusCode: 400, message: 'Le nom est requis' })
  }

  const res = await sbFetch(event, `/rest/v1/eclolink_dns_providers?id=eq.${encodeURIComponent(id)}`, {
    method : 'PATCH',
    body   : JSON.stringify(body),
    headers: { Prefer: 'return=representation' },
  })

  const rows = (await res.json()) as DnsProvider[]
  if (!rows[0]) throw createError({ statusCode: 404, message: 'Fournisseur DNS introuvable' })
  return rows[0]
})
