interface SitePatch {
  name              ?: string
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
  notes             ?: string | null
}

export default defineEventHandler(async (event): Promise<Site> => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requis' })

  const body = await readBody<SitePatch>(event)
  if (body.name !== undefined && !body.name.trim()) {
    throw createError({ statusCode: 400, message: 'Le nom est requis' })
  }

  const res  = await sbFetch(event, `/rest/v1/eclolink_sites?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body  : JSON.stringify(body),
  })

  const rows = (await res.json()) as Site[]
  if (!rows[0]) throw createError({ statusCode: 404, message: 'Site introuvable' })
  return rows[0]
})
