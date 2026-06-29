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
  client_id         ?: string | null
  registrar         ?: string | null
  notes             ?: string | null
  has_maintenance   ?: boolean
}

export default defineEventHandler(async (event): Promise<Site> => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requis' })

  const body = await readBody<SitePatch>(event)

  // Construction d'un payload validé clé par clé : seuls les champs fournis sont touchés
  const safePayload: Record<string, unknown> = {}
  if (body.name               !== undefined) safePayload.name         = requireString(body.name, 'Nom', 200)
  if (body.url                !== undefined) safePayload.url          = validateOptionalHttpUrl(body.url,        'URL')
  if (body.bo_url             !== undefined) safePayload.bo_url       = validateOptionalHttpUrl(body.bo_url,     'URL back-office')
  if (body.gitlab_url         !== undefined) safePayload.gitlab_url   = validateOptionalHttpUrl(body.gitlab_url, 'URL GitLab')
  if (body.agency             !== undefined) safePayload.agency       = clampString(body.agency,                 200)
  if (body.group_id           !== undefined) safePayload.group_id     = body.group_id ?? null
  if (body.php_version        !== undefined) safePayload.php_version  = clampString(body.php_version,            20)
  if (body.dns_zone           !== undefined) safePayload.dns_zone     = clampString(body.dns_zone,               100)
  if (body.go_live_date       !== undefined) safePayload.go_live_date = validateOptionalIsoDate(body.go_live_date, 'Date de mise en ligne')
  if (body.technologies       !== undefined) safePayload.technologies = clampString(body.technologies,           2000)
  if (body.project_manager_id !== undefined) safePayload.project_manager_id = body.project_manager_id ?? null
  if (body.client_id          !== undefined) safePayload.client_id    = body.client_id ?? null
  if (body.registrar          !== undefined) safePayload.registrar    = clampString(body.registrar,              100)
  if (body.notes              !== undefined) safePayload.notes        = clampString(body.notes,                  5000)
  if (body.has_maintenance    !== undefined) safePayload.has_maintenance = !!body.has_maintenance

  const res  = await sbFetch(event, `/rest/v1/eclolink_sites?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body  : JSON.stringify(safePayload),
  })

  const rows = (await res.json()) as Site[]
  if (!rows[0]) throw createError({ statusCode: 404, message: 'Site introuvable' })
  return rows[0]
})
