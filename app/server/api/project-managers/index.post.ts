interface ProjectManagerCreate {
  first_name: string
  last_name : string
  agency    ?: string | null
}

export default defineEventHandler(async (event): Promise<ProjectManager> => {
  const body = await readBody<ProjectManagerCreate>(event)
  if (!body.first_name?.trim()) throw createError({ statusCode: 400, message: 'Le prénom est requis' })
  if (!body.last_name?.trim())  throw createError({ statusCode: 400, message: 'Le nom est requis' })

  const res = await sbFetch(event, '/rest/v1/eclolink_project_managers', {
    method : 'POST',
    body   : JSON.stringify({
      id        : crypto.randomUUID(),
      ...body,
      first_name: body.first_name.trim(),
      last_name : body.last_name.trim(),
    }),
    headers: { Prefer: 'return=representation' },
  })

  const rows = (await res.json()) as ProjectManager[]
  if (!rows[0]) throw createError({ statusCode: 500, message: 'Erreur lors de la création' })
  return rows[0]
})
