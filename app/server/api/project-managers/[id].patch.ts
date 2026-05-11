interface ProjectManagerPatch {
  first_name?: string
  last_name ?: string
  agency    ?: string | null
}

export default defineEventHandler(async (event): Promise<ProjectManager> => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requis' })

  const body = await readBody<ProjectManagerPatch>(event)
  if (body.first_name !== undefined && !body.first_name.trim()) {
    throw createError({ statusCode: 400, message: 'Le prénom est requis' })
  }
  if (body.last_name !== undefined && !body.last_name.trim()) {
    throw createError({ statusCode: 400, message: 'Le nom est requis' })
  }

  const res = await sbFetch(event, `/rest/v1/eclolink_project_managers?id=eq.${encodeURIComponent(id)}`, {
    method : 'PATCH',
    body   : JSON.stringify(body),
    headers: { Prefer: 'return=representation' },
  })

  const rows = (await res.json()) as ProjectManager[]
  if (!rows[0]) throw createError({ statusCode: 404, message: 'Chef de projet introuvable' })
  return rows[0]
})
