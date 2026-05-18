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
  client_id          : string | null
  registrar          : string | null
}

export interface Client {
  id                    : string
  name                  : string
  agency                : string | null
  contact_name          : string | null
  contact_email         : string | null
  notes                 : string | null
  monthly_quota_minutes : number | null
}

export interface Group {
  id        : string
  name      : string
  hoster    : string | null
  ip_public : string | null
  ip_local  : string | null
  web_server: string | null
}

export interface ProjectManager {
  id        : string
  first_name: string
  last_name : string
  agency    : string | null
}

export interface Technology {
  id              : string
  label           : string
  simpleicons_slug: string | null
  svg             : string | null
  sort_order      : number
}

export interface Agency {
  id  : string
  name: string
}

export interface Hoster {
  id              : string
  name            : string
  simpleicons_slug: string | null
}

export interface WebServer {
  id              : string
  name            : string
  simpleicons_slug: string | null
}

export interface DnsProvider {
  id              : string
  name            : string
  simpleicons_slug: string | null
}

export interface Developer {
  id        : string
  first_name: string
  last_name : string
  agency    : string | null
  job_title : string | null
}

export interface MaintenanceType {
  id   : string
  label: string
}

export interface Maintenance {
  id               : string
  site_id          : string
  client_id        : string | null
  developer_id     : string | null
  intervention_date: string
  has_incident     : boolean
  types            : string | null
  notes            : string | null
  duration_minutes : number | null
  created_at       : string
}

