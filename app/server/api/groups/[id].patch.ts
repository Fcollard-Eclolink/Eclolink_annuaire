interface GroupPatch {
  name      ?: string
  hoster    ?: string | null
  ip_local  ?: string | null
  ip_public ?: string | null
  web_server?: string | null
}

export default defineEventHandler(async (event): Promise<Group> => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requis' })

  const body = await readBody<GroupPatch>(event)
  if (body.name !== undefined && !body.name.trim()) {
    throw createError({ statusCode: 400, message: 'Le nom est requis' })
  }

  const res  = await sbFetch(event, `/rest/v1/eclolink_groups?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body  : JSON.stringify(body),
  })

  const rows = (await res.json()) as Group[]
  if (!rows[0]) throw createError({ statusCode: 404, message: 'Serveur introuvable' })
  return rows[0]
})
