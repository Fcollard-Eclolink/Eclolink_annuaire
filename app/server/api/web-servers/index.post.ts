interface WebServerCreate {
  name            : string
  simpleicons_slug?: string | null
}

export default defineEventHandler(async (event): Promise<WebServer> => {
  const body = await readBody<WebServerCreate>(event)
  if (!body.name?.trim()) throw createError({ statusCode: 400, message: 'Le nom est requis' })

  const res = await sbFetch(event, '/rest/v1/eclolink_web_servers', {
    method : 'POST',
    body   : JSON.stringify({ id: crypto.randomUUID(), ...body, name: body.name.trim() }),
    headers: { Prefer: 'return=representation' },
  })

  const rows = (await res.json()) as WebServer[]
  if (!rows[0]) throw createError({ statusCode: 500, message: 'Erreur lors de la création' })
  return rows[0]
})
