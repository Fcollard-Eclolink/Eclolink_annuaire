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
  has_maintenance   ?: boolean
}

export default defineEventHandler(async (event): Promise<Site> => {
  const body = await readBody<SiteCreate>(event)

  // Validation : nom requis + URLs strictement http(s) + date ISO
  const safePayload = {
    id                : crypto.randomUUID(),
    name              : requireString(body.name, 'Nom', 200),
    url               : validateOptionalHttpUrl(body.url,        'URL'),
    bo_url            : validateOptionalHttpUrl(body.bo_url,     'URL back-office'),
    gitlab_url        : validateOptionalHttpUrl(body.gitlab_url, 'URL GitLab'),
    agency            : clampString(body.agency,                 200),
    group_id          : body.group_id ?? null,
    php_version       : clampString(body.php_version,            20),
    dns_zone          : clampString(body.dns_zone,               100),
    go_live_date      : validateOptionalIsoDate(body.go_live_date, 'Date de mise en ligne'),
    technologies      : clampString(body.technologies,           2000),
    project_manager_id: body.project_manager_id ?? null,
    client_id         : body.client_id          ?? null,
    registrar         : clampString(body.registrar,              100),
    notes             : clampString(body.notes,                  5000),
    has_maintenance   : body.has_maintenance ?? false,
  }

  const res = await sbFetch(event, '/rest/v1/eclolink_sites', {
    method : 'POST',
    body   : JSON.stringify(safePayload),
    headers: { Prefer: 'return=representation' },
  })

  const rows = (await res.json()) as Site[]
  if (!rows[0]) throw createError({ statusCode: 500, message: 'Erreur lors de la création' })
  return rows[0]
})
