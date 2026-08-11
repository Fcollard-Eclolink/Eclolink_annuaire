import { useDb } from '~/server/db'
import { sites } from '~/server/db/schema'
import { assertRow } from '~/server/utils/db-crud'

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
  client_id         ?: string | null
  registrar         ?: string | null
  notes             ?: string | null
  has_maintenance   ?: boolean
}

export default defineEventHandler(async (event): Promise<Site> => {
  await requireRole(event, WRITE_ROLES)
  const body = await readBody<SiteCreate>(event)

  const [row] = await useDb().insert(sites).values({
    id             : crypto.randomUUID(),
    name           : requireString(body.name, 'Nom', 200),
    url            : validateOptionalHttpUrl(body.url,        'URL'),
    bo_url         : validateOptionalHttpUrl(body.bo_url,     'URL back-office'),
    gitlab_url     : validateOptionalHttpUrl(body.gitlab_url, 'URL GitLab'),
    agency         : clampString(body.agency, 200),
    group_id       : body.group_id ?? null,
    php_version    : clampString(body.php_version, 20),
    dns_zone       : clampString(body.dns_zone, 100),
    go_live_date   : validateOptionalIsoDate(body.go_live_date, 'Date de mise en ligne'),
    technologies   : clampString(body.technologies, 2000),
    client_id      : body.client_id ?? null,
    registrar      : clampString(body.registrar, 100),
    notes          : clampString(body.notes, 5000),
    has_maintenance: body.has_maintenance ?? false,
  }).returning()

  return assertRow(row, 'Erreur lors de la création')
})
