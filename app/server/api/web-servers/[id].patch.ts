interface WebServerPatch {
  name            ?: string
  simpleicons_slug?: string | null
}

export default defineEventHandler(async (event): Promise<WebServer> => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requis' })

  const body = await readBody<WebServerPatch>(event)
  if (body.name !== undefined && !body.name.trim()) {
    throw createError({ statusCode: 400, message: 'Le nom est requis' })
  }

  const res = await sbFetch(event, `/rest/v1/eclolink_web_servers?id=eq.${encodeURIComponent(id)}`, {
    method : 'PATCH',
    body   : JSON.stringify(body),
    headers: { Prefer: 'return=representation' },
  })

  const rows = (await res.json()) as WebServer[]
  if (!rows[0]) throw createError({ statusCode: 404, message: 'Serveur web introuvable' })
  return rows[0]
})
