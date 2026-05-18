interface DeveloperCreate {
  first_name: string
  last_name : string
  agency    ?: string | null
  job_title ?: string | null
}

export default defineEventHandler(async (event): Promise<Developer> => {
  const body = await readBody<DeveloperCreate>(event)
  if (!body.first_name?.trim()) throw createError({ statusCode: 400, message: 'Le prénom est requis' })
  if (!body.last_name?.trim())  throw createError({ statusCode: 400, message: 'Le nom est requis' })

  const res = await sbFetch(event, '/rest/v1/eclolink_developers', {
    method : 'POST',
    body   : JSON.stringify({
      id        : crypto.randomUUID(),
      first_name: body.first_name.trim(),
      last_name : body.last_name.trim(),
      agency    : body.agency?.trim()    || null,
      job_title : body.job_title?.trim() || null,
    }),
    headers: { Prefer: 'return=representation' },
  })

  const rows = (await res.json()) as Developer[]
  if (!rows[0]) throw createError({ statusCode: 500, message: 'Erreur lors de la création' })
  return rows[0]
})
