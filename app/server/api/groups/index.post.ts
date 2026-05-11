interface GroupCreate {
  name      : string
  hoster    ?: string | null
  ip_local  ?: string | null
  ip_public ?: string | null
  web_server?: string | null
}

export default defineEventHandler(async (event): Promise<Group> => {
  const body = await readBody<GroupCreate>(event)
  if (!body.name?.trim()) {
    throw createError({ statusCode: 400, message: 'Le nom est requis' })
  }

  const res = await sbFetch(event, '/rest/v1/eclolink_groups', {
    method : 'POST',
    body   : JSON.stringify({ id: crypto.randomUUID(), ...body, name: body.name.trim() }),
    headers: { Prefer: 'return=representation' },
  })

  const rows = (await res.json()) as Group[]
  if (!rows[0]) throw createError({ statusCode: 500, message: 'Erreur lors de la création' })
  return rows[0]
})
