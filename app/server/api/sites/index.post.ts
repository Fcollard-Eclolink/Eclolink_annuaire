interface SiteCreate {
  name              : string
  url               ?: string | null
  bo_url            ?: string | null
  gitlab_url        ?: string | null
  agency            ?: string | null
  group_id          ?: string | null
  php_version       ?: string | null
  dns_zone          ?: string | null
  go_live_date      ?: string | null
  technologies      ?: string | null
  project_manager_id?: string | null
  client_id         ?: string | null
  registrar         ?: string | null
  notes             ?: string | null
}

export default defineEventHandler(async (event): Promise<Site> => {
  const body = await readBody<SiteCreate>(event)
  if (!body.name?.trim()) {
    throw createError({ statusCode: 400, message: 'Le nom est requis' })
  }

  const res = await sbFetch(event, '/rest/v1/eclolink_sites', {
    method : 'POST',
    body   : JSON.stringify({ id: crypto.randomUUID(), ...body, name: body.name.trim() }),
    headers: { Prefer: 'return=representation' },
  })

  const rows = (await res.json()) as Site[]
  if (!rows[0]) throw createError({ statusCode: 500, message: 'Erreur lors de la création' })
  return rows[0]
})
