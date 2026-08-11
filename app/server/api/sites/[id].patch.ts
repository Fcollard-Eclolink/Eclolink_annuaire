import { sites } from '~/server/db/schema'
import { patchOrFetch } from '~/server/utils/db-crud'

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
  client_id         ?: string | null
  registrar         ?: string | null
  notes             ?: string | null
  has_maintenance   ?: boolean
  wp_api_key        ?: string | null
}

export default defineEventHandler(async (event): Promise<Site> => {
  await requireRole(event, WRITE_ROLES)
  const id = requireId(event)

  const body = await readBody<SitePatch>(event)

  // Seuls les champs fournis sont touchés ; chacun est validé.
  const patch: Partial<typeof sites.$inferInsert> = {}
  if (body.name            !== undefined) patch.name            = requireString(body.name, 'Nom', 200)
  if (body.url             !== undefined) patch.url             = validateOptionalHttpUrl(body.url,        'URL')
  if (body.bo_url          !== undefined) patch.bo_url          = validateOptionalHttpUrl(body.bo_url,     'URL back-office')
  if (body.gitlab_url      !== undefined) patch.gitlab_url      = validateOptionalHttpUrl(body.gitlab_url, 'URL GitLab')
  if (body.agency          !== undefined) patch.agency          = clampString(body.agency, 200)
  if (body.group_id        !== undefined) patch.group_id        = body.group_id ?? null
  if (body.php_version     !== undefined) patch.php_version      = clampString(body.php_version, 20)
  if (body.dns_zone        !== undefined) patch.dns_zone         = clampString(body.dns_zone, 100)
  if (body.go_live_date    !== undefined) patch.go_live_date     = validateOptionalIsoDate(body.go_live_date, 'Date de mise en ligne')
  if (body.technologies    !== undefined) patch.technologies     = clampString(body.technologies, 2000)
  if (body.client_id       !== undefined) patch.client_id        = body.client_id ?? null
  if (body.registrar       !== undefined) patch.registrar        = clampString(body.registrar, 100)
  if (body.notes           !== undefined) patch.notes            = clampString(body.notes, 5000)
  if (body.has_maintenance !== undefined) patch.has_maintenance  = !!body.has_maintenance
  if (body.wp_api_key      !== undefined) patch.wp_api_key       = clampString(body.wp_api_key, 100)

  return patchOrFetch<Site>(sites, sites.id, id, patch, 'Site introuvable')
})
