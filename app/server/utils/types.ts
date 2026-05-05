// ── Entités métier partagées (server-side) ────────────────────────

export interface Site {
  id                 : string
  name               : string
  url                : string | null
  bo_url             : string | null
  gitlab_url         : string | null
  agency             : string | null
  group_id           : string | null
  notes              : string | null
  php_version        : string | null
  dns_zone           : string | null
  go_live_date       : string | null
  technologies       : string | null
  project_manager_id : string | null
}

export interface Group {
  id        : string
  name      : string
  hoster    : string | null
  ip_public : string | null
  ip_local  : string | null
  web_server: string | null
}
