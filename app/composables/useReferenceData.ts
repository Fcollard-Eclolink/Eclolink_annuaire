import type { Ref } from 'vue'
import type {
  Technology, Hoster, WebServer, DnsProvider, Agency,
  UserProfile, Client, Site, Group, MaintenanceType, Maintenance, Bdd, ActivityLog,
  MelStep, MelSummary,
} from '~/server/utils/types'

export function useReferenceData() {
  const technologies     = useState<Technology[]>('ref:technologies',  () => [])
  const hosters          = useState<Hoster[]>('ref:hosters',           () => [])
  const webServers       = useState<WebServer[]>('ref:webServers',     () => [])
  const dnsProviders     = useState<DnsProvider[]>('ref:dnsProviders', () => [])
  const agencies         = useState<Agency[]>('ref:agencies',          () => [])
  const userProfiles     = useState<UserProfile[]>('ref:users',        () => [])
  const clients          = useState<Client[]>('ref:clients',           () => [])
  const sites            = useState<Site[]>('ref:sites',               () => [])
  const groups           = useState<Group[]>('ref:groups',             () => [])
  const maintenanceTypes = useState<MaintenanceType[]>('ref:mtTypes',  () => [])
  const maintenances     = useState<Maintenance[]>('ref:maintenances', () => [])
  const databases        = useState<Bdd[]>('ref:databases',            () => [])
  const melSteps         = useState<MelStep[]>('ref:melSteps',         () => [])
  const mels             = useState<MelSummary[]>('ref:mels',          () => [])

  // Vues filtrées par rôle (réactives)
  // Dropdowns : on exclut les comptes désactivés.
  const devUsers = computed((): UserProfile[] =>
    userProfiles.value.filter((u: UserProfile): boolean => u.is_active !== false && ['dev', 'sysadmin'].includes(u.role)),
  )
  const pmUsers = computed((): UserProfile[] =>
    userProfiles.value.filter((u: UserProfile): boolean => u.is_active !== false && ['pm', 'sysadmin'].includes(u.role)),
  )

  const loaded = useState<Record<string, boolean>>('ref:loaded', () => ({}))
  const requestFetch = useRequestFetch()

  async function load<T>(key: string, url: string, target: Ref<T[]>): Promise<void> {
    if (loaded.value[key]) return
    target.value = await requestFetch<T[]>(url)
    loaded.value = { ...loaded.value, [key]: true }
  }

  async function refresh<T>(key: string, url: string, target: Ref<T[]>): Promise<void> {
    target.value = await requestFetch<T[]>(url)
    loaded.value = { ...loaded.value, [key]: true }
  }

  return {
    technologies, hosters, webServers, dnsProviders, agencies,
    userProfiles, devUsers, pmUsers,
    clients, sites, groups,
    maintenanceTypes, maintenances, databases,
    melSteps, mels,

    loadTechnologies    : (): Promise<void> => load('technologies',  '/api/technologies',      technologies),
    loadHosters         : (): Promise<void> => load('hosters',       '/api/hosters',           hosters),
    loadWebServers      : (): Promise<void> => load('webServers',    '/api/web-servers',       webServers),
    loadDnsProviders    : (): Promise<void> => load('dnsProviders',  '/api/dns-providers',     dnsProviders),
    loadAgencies        : (): Promise<void> => load('agencies',      '/api/agencies',          agencies),
    loadUserProfiles    : (): Promise<void> => load('users',         '/api/users',             userProfiles),
    loadClients         : (): Promise<void> => load('clients',       '/api/clients',           clients),
    loadSites           : (): Promise<void> => load('sites',         '/api/sites',             sites),
    loadGroups          : (): Promise<void> => load('groups',        '/api/groups',            groups),
    loadMaintenanceTypes: (): Promise<void> => load('mtTypes',       '/api/maintenance-types', maintenanceTypes),
    loadMaintenances    : (): Promise<void> => load('maintenances',  '/api/maintenances',      maintenances),
    loadDatabases       : (): Promise<void> => load('databases',     '/api/databases',         databases),
    loadMelSteps        : (): Promise<void> => load('melSteps',      '/api/mel-steps',         melSteps),
    loadMels            : (): Promise<void> => load('mels',          '/api/mels',              mels),

    refreshTechnologies    : (): Promise<void> => refresh('technologies',  '/api/technologies',      technologies),
    refreshHosters         : (): Promise<void> => refresh('hosters',       '/api/hosters',           hosters),
    refreshWebServers      : (): Promise<void> => refresh('webServers',    '/api/web-servers',       webServers),
    refreshDnsProviders    : (): Promise<void> => refresh('dnsProviders',  '/api/dns-providers',     dnsProviders),
    refreshAgencies        : (): Promise<void> => refresh('agencies',      '/api/agencies',          agencies),
    refreshUserProfiles    : (): Promise<void> => refresh('users',         '/api/users',             userProfiles),
    refreshClients         : (): Promise<void> => refresh('clients',       '/api/clients',           clients),
    refreshSites           : (): Promise<void> => refresh('sites',         '/api/sites',             sites),
    refreshGroups          : (): Promise<void> => refresh('groups',        '/api/groups',            groups),
    refreshMaintenanceTypes: (): Promise<void> => refresh('mtTypes',       '/api/maintenance-types', maintenanceTypes),
    refreshMaintenances    : (): Promise<void> => refresh('maintenances',  '/api/maintenances',      maintenances),
    refreshDatabases       : (): Promise<void> => refresh('databases',     '/api/databases',         databases),
    refreshMelSteps        : (): Promise<void> => refresh('melSteps',      '/api/mel-steps',         melSteps),
    refreshMels            : (): Promise<void> => refresh('mels',          '/api/mels',              mels),
  }
}
