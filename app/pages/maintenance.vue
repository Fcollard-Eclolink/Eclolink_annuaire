<script setup lang="ts">
import type { Maintenance, Site, UserProfile, MaintenanceType, Client, Group } from '~/server/utils/types'
import type { FilterOption } from '~/components/AppFilterSelect.vue'
import type { FilterDef } from '~/components/AppFilterBar.vue'
import '~/assets/css/maintenance.css'
import '~/assets/css/admin.css'

definePageMeta({ middleware: 'auth' })

// ── Data fetching via cache partagé ───────────────────────────
const refs = useReferenceData()
await Promise.all([
  refs.loadMaintenances(),
  refs.loadSites(),
  refs.loadUserProfiles(),
  refs.loadMaintenanceTypes(),
  refs.loadClients(),
  refs.loadGroups(),
])

const maintenances        = refs.maintenances
const sites               = refs.sites
const devUsers            = refs.devUsers
const maintenanceTypes    = refs.maintenanceTypes
const clients             = refs.clients
const groups              = refs.groups
const refreshMaintenances = refs.refreshMaintenances

// Auto-fill : si l'utilisateur connecté est dev/sysadmin, pré-remplir son nom
const { user } = useAuth()

// ── Lookup maps ───────────────────────────────────────────────
const siteById = computed((): Map<string, Site> => {
  const m = new Map<string, Site>()
  for (const s of sites.value) m.set(s.id, s)
  return m
})
const devById = computed((): Map<string, UserProfile> => {
  const m = new Map<string, UserProfile>()
  for (const d of devUsers.value) m.set(d.user_id, d)
  return m
})
const typeById = computed((): Map<string, MaintenanceType> => {
  const m = new Map<string, MaintenanceType>()
  for (const t of maintenanceTypes.value) m.set(t.id, t)
  return m
})
const clientById = computed((): Map<string, Client> => {
  const m = new Map<string, Client>()
  for (const c of clients.value) m.set(c.id, c)
  return m
})
const groupById = computed((): Map<string, Group> => {
  const m = new Map<string, Group>()
  for (const g of groups.value) m.set(g.id, g)
  return m
})

// ── Helpers ───────────────────────────────────────────────────
function parseTypes(csv: string | null): string[] {
  if (!csv?.trim()) return []
  return csv.split(',').map((v: string) => v.trim()).filter(Boolean)
}
function typeLabels(m: Maintenance): string[] {
  return parseTypes(m.types).map((id: string): string => typeById.value.get(id)?.label ?? id)
}
function siteName(id: string): string {
  return siteById.value.get(id)?.name ?? '— Site supprimé —'
}
function devName(id: string | null): string {
  if (!id) return '—'
  const d = devById.value.get(id)
  return d ? `${d.first_name} ${d.last_name}` : '—'
}
function clientName(id: string | null): string {
  if (!id) return '—'
  return clientById.value.get(id)?.name ?? '—'
}
function groupName(id: string | null): string {
  if (!id) return '—'
  return groupById.value.get(id)?.name ?? '—'
}
function formatDuration(minutes: number | null): string {
  if (minutes == null || minutes <= 0) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${m} min`
}
function formatDate(iso: string): string {
  if (!iso) return ''
  const p = iso.split('-')
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso
}

// ── Recherche → Filtres ──────────────────────────────────────
// Pipeline : maintenances → searched (AppSearchBar) → afterFilters (AppFilterBar) → filtered (+ incident + date range)
const searched      = ref<Maintenance[]>([])
const afterFilters  = ref<Maintenance[]>([])
const onlyIncidents = ref(false)
const dateFrom      = ref<string>('')  // ISO YYYY-MM-DD
const dateTo        = ref<string>('')

const filterDefs = computed((): FilterDef<Maintenance>[] => {
  const present = new Set<string>()
  for (const m of maintenances.value) {
    const ag = siteById.value.get(m.site_id)?.agency
    if (ag) present.add(ag)
  }
  const agencyOpts: FilterOption[] = [...present].sort().map((a: string): FilterOption => ({
    id: a, label: a, disabled: false,
  }))
  const devOpts: FilterOption[] = devUsers.value.map((d: UserProfile): FilterOption => ({
    id: d.user_id, label: `${d.first_name} ${d.last_name}`.trim() || d.user_id, disabled: false,
  }))
  const typeOpts: FilterOption[] = maintenanceTypes.value.map((t: MaintenanceType): FilterOption => ({
    id: t.id, label: t.label, disabled: false,
  }))
  const clientOpts: FilterOption[] = clients.value.map((c: Client): FilterOption => ({
    id: c.id, label: c.name, disabled: false,
  }))

  return [
    {
      key: 'agency', label: 'Agences', options: agencyOpts,
      match: (m: Maintenance, selected: string[]): boolean =>
        selected.includes(siteById.value.get(m.site_id)?.agency ?? ''),
    },
    {
      key: 'dev', label: 'Développeurs', options: devOpts,
      match: (m: Maintenance, selected: string[]): boolean =>
        !!m.developer_id && selected.includes(m.developer_id),
    },
    {
      key: 'client', label: 'Clients', options: clientOpts,
      match: (m: Maintenance, selected: string[]): boolean =>
        !!m.client_id && selected.includes(m.client_id),
    },
    {
      key: 'type', label: 'Types', options: typeOpts,
      match: (m: Maintenance, selected: string[]): boolean => {
        const ids = parseTypes(m.types)
        return selected.some((id: string): boolean => ids.includes(id))
      },
    },
  ]
})

const filtered = computed((): Maintenance[] => {
  let list = afterFilters.value
  if (onlyIncidents.value) list = list.filter((m: Maintenance): boolean => m.has_incident)
  if (dateFrom.value)      list = list.filter((m: Maintenance): boolean => m.intervention_date >= dateFrom.value)
  if (dateTo.value)        list = list.filter((m: Maintenance): boolean => m.intervention_date <= dateTo.value)
  return list
})

// ── CRUD ──────────────────────────────────────────────────────
interface MaintenanceForm {
  site_id               : string
  client_id             : string
  developer_id          : string
  intervention_date     : string
  has_incident          : boolean
  types                 : string
  notes                 : string
  duration_minutes      : number | string
  is_monthly_maintenance: boolean
}

function emptyForm(): MaintenanceForm {
  const today = new Date().toISOString().slice(0, 10)
  return {
    site_id: '', client_id: '', developer_id: '', intervention_date: today,
    has_incident: false, types: '', notes: '', duration_minutes: '',
    is_monthly_maintenance: false,
  }
}

const addOpen      = ref(false)
const editTarget   = ref<Maintenance | null>(null)
const deleteTarget = ref<Maintenance | null>(null)
const form         = ref<MaintenanceForm>(emptyForm())
const modalLoading = ref(false)
const modalError   = ref<string | null>(null)
const { add: toast } = useToast()

function resetModal(): void {
  modalLoading.value = false
  modalError.value   = null
}

function extractError(e: unknown): string {
  if (e && typeof e === 'object') {
    const obj = e as { data?: { message?: string; statusMessage?: string }; message?: string }
    return obj.data?.message ?? obj.data?.statusMessage ?? obj.message ?? 'Erreur'
  }
  return 'Erreur'
}

// Auto-fill : dev/sysadmin → pré-remplir son propre nom comme développeur (modifiable)
function fillDefaultDeveloper(): void {
  if (user.value && ['dev', 'sysadmin'].includes(user.value.role)) {
    form.value.developer_id = user.value.id
  }
}

function openAdd(): void {
  form.value = emptyForm()
  fillDefaultDeveloper()
  addOpen.value = true
  resetModal()
}
function openEdit(m: Maintenance): void {
  form.value = {
    site_id               : m.site_id,
    client_id             : m.client_id ?? '',
    developer_id          : m.developer_id ?? '',
    intervention_date     : m.intervention_date,
    has_incident          : m.has_incident,
    types                 : m.types ?? '',
    notes                 : m.notes ?? '',
    duration_minutes      : m.duration_minutes != null ? String(m.duration_minutes) : '',
    is_monthly_maintenance: m.is_monthly_maintenance,
  }
  editTarget.value = m
  resetModal()
}
function closeAdd():    void { addOpen.value = false; lockedSiteId.value = null }
function closeEdit():   void { editTarget.value = null }
function closeDelete(): void { deleteTarget.value = null }

// Auto-fill client_id depuis le site sélectionné (uniquement si client encore vide)
watch((): string => form.value.site_id, (newSiteId: string): void => {
  if (!newSiteId) return
  if (form.value.client_id) return // on n'écrase pas un client déjà choisi
  const site = siteById.value.get(newSiteId)
  if (site?.client_id) form.value.client_id = site.client_id
})

function bodyFromForm(): Record<string, unknown> {
  const dur = typeof form.value.duration_minutes === 'number'
    ? form.value.duration_minutes
    : parseInt(String(form.value.duration_minutes), 10)
  return {
    site_id               : form.value.site_id,
    client_id             : form.value.client_id || null,
    developer_id          : form.value.developer_id || null,
    intervention_date     : form.value.intervention_date,
    has_incident          : form.value.has_incident,
    types                 : form.value.types.trim() || null,
    notes                 : form.value.notes.trim() || null,
    duration_minutes      : !isNaN(dur) && dur > 0 ? dur : null,
    is_monthly_maintenance: form.value.is_monthly_maintenance,
  }
}

async function confirmAdd(): Promise<void> {
  modalLoading.value = true; modalError.value = null
  try {
    await $fetch('/api/maintenances', { method: 'POST', body: bodyFromForm() })
    await refreshMaintenances()
    closeAdd()
    toast('Intervention créée.')
  } catch (e: unknown) { modalError.value = extractError(e); toast(extractError(e), 'error') }
  finally { modalLoading.value = false }
}
async function confirmEdit(): Promise<void> {
  if (!editTarget.value) return
  modalLoading.value = true; modalError.value = null
  try {
    await $fetch(`/api/maintenances/${editTarget.value.id}`, { method: 'PATCH', body: bodyFromForm() })
    await refreshMaintenances()
    editTarget.value = null
    toast('Intervention mise à jour.')
  } catch (e: unknown) { modalError.value = extractError(e); toast(extractError(e), 'error') }
  finally { modalLoading.value = false }
}
async function confirmDelete(): Promise<void> {
  if (!deleteTarget.value) return
  modalLoading.value = true; modalError.value = null
  try {
    await $fetch(`/api/maintenances/${deleteTarget.value.id}`, { method: 'DELETE' })
    await refreshMaintenances()
    deleteTarget.value = null
    toast('Intervention supprimée.')
  } catch (e: unknown) { modalError.value = extractError(e); toast(extractError(e), 'error') }
  finally { modalLoading.value = false }
}

/** Différencie "aucune intervention en base" de "filtre trop restrictif". */
const isFiltering = computed((): boolean =>
  maintenances.value.length > 0 && filtered.value.length === 0,
)

// ── Sous-onglets ─────────────────────────────────────────────
type TabId = 'interventions' | 'sites'
const activeTab = ref<TabId>('interventions')
const tabs: { id: TabId; label: string }[] = [
  { id: 'interventions', label: 'Interventions'        },
  { id: 'sites',         label: 'Sites sous maintenance' },
]

/** Sites avec contrat de maintenance mensuelle (checklist mise à jour). */
const maintenanceSites = computed((): Site[] =>
  sites.value
    .filter((s: Site): boolean => s.has_maintenance)
    .sort((a: Site, b: Site): number => a.name.localeCompare(b.name, 'fr', { numeric: true })),
)

/** Map<site_id, intervention> des validations de maintenance mensuelle du mois courant.
 *  ⚠ Seules les interventions explicitement marquées `is_monthly_maintenance: true`
 *  (créées via le bouton ✓ de la checklist) comptent ici. Une intervention classique
 *  (incident, bug fix...) sur un site sous maintenance ne le retire PAS de la liste à faire. */
const currentMonthBySite = computed((): Map<string, Maintenance> => {
  const prefix = currentMonthPrefix()
  const map    = new Map<string, Maintenance>()
  for (const m of maintenances.value) {
    if (!m.is_monthly_maintenance) continue
    if (!m.intervention_date.startsWith(prefix)) continue
    const existing = map.get(m.site_id)
    if (!existing || m.intervention_date > existing.intervention_date) {
      map.set(m.site_id, m)
    }
  }
  return map
})

// ── Filtres pour l'onglet "Sites sous maintenance" ──────────────
// Pipeline : maintenanceSites → sitesFiltered (par AppFilterBar) → todoSites / doneSites
const sitesFiltered = ref<Site[]>([])

const sitesFilterDefs = computed((): FilterDef<Site>[] => {
  // Serveurs : uniquement ceux qui hébergent au moins un site sous maintenance
  const presentGroups = new Set<string>()
  for (const s of maintenanceSites.value) if (s.group_id) presentGroups.add(s.group_id)
  const groupOpts: FilterOption[] = groups.value
    .filter((g: Group): boolean => presentGroups.has(g.id))
    .map((g: Group): FilterOption => ({ id: g.id, label: g.name, disabled: false }))

  // Clients : ceux liés à au moins un site sous maintenance
  const presentClients = new Set<string>()
  for (const s of maintenanceSites.value) if (s.client_id) presentClients.add(s.client_id)
  const clientOpts: FilterOption[] = clients.value
    .filter((c: Client): boolean => presentClients.has(c.id))
    .map((c: Client): FilterOption => ({ id: c.id, label: c.name, disabled: false }))

  // Agences : idem
  const presentAgencies = new Set<string>()
  for (const s of maintenanceSites.value) if (s.agency) presentAgencies.add(s.agency)
  const agencyOpts: FilterOption[] = [...presentAgencies].sort().map((a: string): FilterOption => ({
    id: a, label: a, disabled: false,
  }))

  return [
    {
      key: 'group', label: 'Serveur', options: groupOpts,
      match: (s: Site, selected: string[]): boolean => selected.includes(s.group_id ?? ''),
    },
    {
      key: 'client', label: 'Client', options: clientOpts,
      match: (s: Site, selected: string[]): boolean => selected.includes(s.client_id ?? ''),
    },
    {
      key: 'agency', label: 'Agence', options: agencyOpts,
      match: (s: Site, selected: string[]): boolean => selected.includes(s.agency ?? ''),
    },
  ]
})

const todoSites = computed((): Site[] =>
  sitesFiltered.value.filter((s: Site): boolean => !currentMonthBySite.value.has(s.id)),
)
const doneSites = computed((): { site: Site; maintenance: Maintenance }[] =>
  sitesFiltered.value
    .map((s: Site): { site: Site; maintenance: Maintenance | undefined } => ({
      site       : s,
      maintenance: currentMonthBySite.value.get(s.id),
    }))
    .filter((row): row is { site: Site; maintenance: Maintenance } => row.maintenance !== undefined)
    .sort((a, b): number => b.maintenance.intervention_date.localeCompare(a.maintenance.intervention_date)),
)

const monthLabel = computed((): string => currentMonthLabel())

const lockedSiteId = ref<string | null>(null)
function openAddForSite(site: Site): void {
  form.value         = emptyForm()
  form.value.site_id = site.id
  form.value.is_monthly_maintenance = true  // marque cette intervention comme validation mensuelle
  // Type "Maintenance" auto-sélectionné (créer ce type dans Admin s'il n'existe pas encore).
  const maintenanceType = maintenanceTypes.value.find((t: MaintenanceType) => t.label === 'Maintenance')
  if (maintenanceType) form.value.types = maintenanceType.id
  // client_id auto-rempli par le watch sur form.site_id
  fillDefaultDeveloper()
  lockedSiteId.value = site.id
  addOpen.value      = true
  resetModal()
}

</script>

<template>
  <div class="maintenance-wrap">

    <AppHeader title="Maintenance" />

    <!-- Sous-onglets -->
    <div class="admin-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="admin-tab"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >{{ tab.label }}</button>
    </div>

    <!-- ════════════════════════════════════════════════════════════ -->
    <!-- Onglet "Interventions"                                       -->
    <!-- ════════════════════════════════════════════════════════════ -->
    <template v-if="activeTab === 'interventions'">

    <!-- Toolbar -->
    <div class="toolbar">
      <AppSearchBar
        v-model:results="searched"
        :items="maintenances"
        :fields="[(m) => siteName(m.site_id)]"
        placeholder="Rechercher un site"
      />
      <div class="toolbar-actions">
        <button class="btn primary" @click="openAdd">+ Intervention</button>
      </div>
    </div>

    <!-- Filtres -->
    <AppFilterBar
      v-model:results="afterFilters"
      :items="searched"
      :filters="filterDefs"
    >
      <template #after>
        <AppDateRangeFilter v-model:from="dateFrom" v-model:to="dateTo" />
        <label class="maintenance-incident-toggle">
          <input v-model="onlyIncidents" type="checkbox">
          <span>Avec incident</span>
        </label>
      </template>
    </AppFilterBar>

    <!-- Tableau -->
    <div class="admin-table-wrap">
      <table class="admin-table maintenance-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Site</th>
            <th>Client</th>
            <th>Développeur</th>
            <th>Durée</th>
            <th>Type(s)</th>
            <th>Incident</th>
            <th>Liens</th>
            <th>Notes</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!filtered.length">
            <td colspan="10" class="admin-empty">
              {{ isFiltering ? 'Aucune intervention ne correspond aux filtres.' : 'Aucune intervention enregistrée.' }}
            </td>
          </tr>
          <tr v-for="m in filtered" :key="m.id">
            <td class="maintenance-date">{{ formatDate(m.intervention_date) }}</td>
            <td>{{ siteName(m.site_id) }}</td>
            <td>
              <NuxtLink v-if="m.client_id" :to="`/clients/${m.client_id}`" class="maintenance-client-link">{{ clientName(m.client_id) }}</NuxtLink>
              <span v-else>—</span>
            </td>
            <td>{{ devName(m.developer_id) }}</td>
            <td class="maintenance-duration">{{ formatDuration(m.duration_minutes) }}</td>
            <td>
              <div class="maintenance-type-pills">
                <span
                  v-for="lbl in typeLabels(m)"
                  :key="lbl"
                  class="maintenance-type-pill"
                  :style="{ '--pill-hue': typePillHue(lbl) }"
                >{{ lbl }}</span>
              </div>
            </td>
            <td class="maintenance-incident-cell">
              <span v-if="m.has_incident" class="maintenance-incident-dot" title="Incident">!</span>
            </td>
            <td>
              <div class="maintenance-links">
                <a
                  v-if="siteById.get(m.site_id)?.url"
                  :href="siteById.get(m.site_id)?.url ?? '#'"
                  target="_blank"
                  rel="noopener"
                  class="icon-btn"
                  title="Ouvrir le site"
                  @click.stop
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
                       fill="none" stroke="currentColor" stroke-width="2"
                       stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="2" y1="12" x2="22" y2="12"/>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                  </svg>
                </a>
                <a
                  v-if="safeHref(siteById.get(m.site_id)?.bo_url)"
                  :href="safeHref(siteById.get(m.site_id)?.bo_url)"
                  target="_blank"
                  rel="noopener"
                  class="icon-btn"
                  title="Ouvrir le back-office"
                  @click.stop
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
                       fill="none" stroke="currentColor" stroke-width="2"
                       stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                  </svg>
                </a>
              </div>
            </td>
            <td class="maintenance-notes">{{ m.notes || '—' }}</td>
            <td>
              <div class="admin-row-actions">
                <button class="icon-btn" title="Modifier" @click="openEdit(m)">&#9998;</button>
                <button class="icon-btn del" title="Supprimer" @click="deleteTarget = m; resetModal()">&#10005;</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    </template>

    <!-- ════════════════════════════════════════════════════════════ -->
    <!-- Onglet "Sites sous maintenance"                              -->
    <!-- ════════════════════════════════════════════════════════════ -->
    <template v-if="activeTab === 'sites'">
      <p class="maintenance-todo-header">
        Maintenance mensuelle — <strong>{{ monthLabel }}</strong>
        ({{ doneSites.length }}/{{ maintenanceSites.length }})
      </p>

      <!-- Filtres : serveur / client / agence -->
      <AppFilterBar
        v-model:results="sitesFiltered"
        :items="maintenanceSites"
        :filters="sitesFilterDefs"
      />

      <!-- ── À faire ce mois ─────────────────────────────────── -->
      <h3 class="maintenance-todo-subtitle">À faire ({{ todoSites.length }})</h3>
      <div class="admin-table-wrap">
        <table class="admin-table maintenance-sites-table">
          <thead>
            <tr>
              <th></th>
              <th>Site</th>
              <th>Serveur</th>
              <th>Client</th>
              <th>Agence</th>
              <th>WordPress</th>
              <th class="maintenance-sites-link-col">Site</th>
              <th class="maintenance-sites-link-col">BO</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!maintenanceSites.length">
              <td colspan="8" class="admin-empty">Aucun site sous contrat de maintenance.</td>
            </tr>
            <tr v-else-if="!todoSites.length">
              <td colspan="8" class="admin-empty">🎉 Tous les sites sous maintenance ont été traités ce mois-ci.</td>
            </tr>
            <tr v-for="s in todoSites" :key="s.id" class="maintenance-todo-row">
              <td class="maintenance-todo-check-cell">
                <button
                  class="maintenance-todo-check"
                  title="Marquer comme fait"
                  @click="openAddForSite(s)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                       fill="none" stroke="currentColor" stroke-width="2.5"
                       stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </button>
              </td>
              <td>{{ s.name }}</td>
              <td>{{ groupName(s.group_id) }}</td>
              <td>
                <NuxtLink v-if="s.client_id" :to="`/clients/${s.client_id}`" class="maintenance-client-link">{{ clientName(s.client_id) }}</NuxtLink>
                <span v-else>—</span>
              </td>
              <td>{{ s.agency || '—' }}</td>
              <td><AppWpStatus :site="s" /></td>
              <td class="maintenance-sites-link-cell">
                <a
                  v-if="safeHref(s.url)"
                  :href="safeHref(s.url)"
                  target="_blank"
                  rel="noopener"
                  class="icon-btn"
                  title="Ouvrir le site"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
                       fill="none" stroke="currentColor" stroke-width="2"
                       stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="2" y1="12" x2="22" y2="12"/>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                  </svg>
                </a>
                <span v-else class="maintenance-sites-muted">—</span>
              </td>
              <td class="maintenance-sites-link-cell">
                <a
                  v-if="safeHref(s.bo_url)"
                  :href="safeHref(s.bo_url)"
                  target="_blank"
                  rel="noopener"
                  class="icon-btn"
                  title="Ouvrir le back-office"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
                       fill="none" stroke="currentColor" stroke-width="2"
                       stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                  </svg>
                </a>
                <span v-else class="maintenance-sites-muted">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- ── Fait ce mois ──────────────────────────────────────── -->
      <h3 class="maintenance-todo-subtitle">Fait ce mois ({{ doneSites.length }})</h3>
      <div class="admin-table-wrap">
        <table class="admin-table maintenance-sites-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Site</th>
              <th>Serveur</th>
              <th>Client</th>
              <th>Développeur</th>
              <th>WordPress</th>
              <th>Type(s)</th>
              <th>Incident</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!doneSites.length">
              <td colspan="8" class="admin-empty">Aucune maintenance enregistrée ce mois.</td>
            </tr>
            <tr v-for="row in doneSites" :key="row.site.id">
              <td class="maintenance-date">{{ formatDate(row.maintenance.intervention_date) }}</td>
              <td>{{ row.site.name }}</td>
              <td>{{ groupName(row.site.group_id) }}</td>
              <td>
                <NuxtLink v-if="row.site.client_id" :to="`/clients/${row.site.client_id}`" class="maintenance-client-link">{{ clientName(row.site.client_id) }}</NuxtLink>
                <span v-else>—</span>
              </td>
              <td>{{ devName(row.maintenance.developer_id) }}</td>
              <td><AppWpStatus :site="row.site" /></td>
              <td>
                <div class="maintenance-type-pills">
                  <span
                    v-for="lbl in typeLabels(row.maintenance)"
                    :key="lbl"
                    class="maintenance-type-pill"
                    :style="{ '--pill-hue': typePillHue(lbl) }"
                  >{{ lbl }}</span>
                </div>
              </td>
              <td class="maintenance-incident-cell">
                <span v-if="row.maintenance.has_incident" class="maintenance-incident-dot" title="Incident">!</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- ════════════════════════════════════════════════════════════ -->
    <!-- MODALES                                                     -->
    <!-- ════════════════════════════════════════════════════════════ -->
    <Teleport to="body">

      <!-- Add / Edit -->
      <Transition name="modal">
        <div v-if="addOpen || editTarget" class="modal-overlay" v-modal-close="() => addOpen ? closeAdd() : closeEdit()">
          <div class="modal-card">
            <h3 class="modal-title">
              <template v-if="lockedSiteId">Maintenance — {{ siteName(lockedSiteId) }}</template>
              <template v-else-if="addOpen">Ajouter une intervention</template>
              <template v-else>Modifier l'intervention</template>
            </h3>
            <p v-if="modalError" class="modal-error">{{ modalError }}</p>
            <form @submit.prevent="addOpen ? confirmAdd() : confirmEdit()">
              <div v-if="!lockedSiteId" class="field">
                <label>Site *</label>
                <AppSelect
                  v-model="form.site_id"
                  :options="sites.map((s: Site) => ({ value: s.id, label: s.name }))"
                  placeholder="— Sélectionner —"
                  searchable
                />
              </div>
              <div class="field">
                <label>Client</label>
                <AppSelect
                  v-model="form.client_id"
                  :options="clients.map((c: Client) => ({ value: c.id, label: c.name }))"
                  placeholder="— Aucun —"
                  searchable
                />
              </div>
              <div class="field">
                <label>Date d'intervention *</label>
                <AppDateInput v-model="form.intervention_date" />
              </div>
              <div class="field">
                <label>Durée (minutes)</label>
                <input v-model.number="form.duration_minutes" type="number" min="0" placeholder="ex: 90">
              </div>
              <div class="field">
                <label>Développeur</label>
                <AppSelect
                  v-model="form.developer_id"
                  :options="devUsers.map((d: UserProfile) => ({ value: d.user_id, label: d.job_title ? `${d.first_name} ${d.last_name} — ${d.job_title}` : (`${d.first_name} ${d.last_name}`.trim() || d.user_id) }))"
                  placeholder="— Aucun —"
                />
              </div>
              <div class="field">
                <label>Type(s) d'intervention</label>
                <AppMultiSelect
                  v-model="form.types"
                  :options="maintenanceTypes.map((t: MaintenanceType) => ({ id: t.id, label: t.label }))"
                  placeholder="— Aucun —"
                />
              </div>
              <div class="field">
                <label class="maintenance-incident-toggle">
                  <input v-model="form.has_incident" type="checkbox">
                  <span>Incident pendant l'intervention</span>
                </label>
              </div>
              <div class="field">
                <label>Notes</label>
                <textarea v-model="form.notes" class="field-input" rows="3" placeholder="Commentaire optionnel..." />
              </div>
              <div class="modal-btns">
                <button type="button" class="btn" :disabled="modalLoading" @click="addOpen ? closeAdd() : closeEdit()">Annuler</button>
                <button type="submit" class="btn primary" :disabled="modalLoading || !form.site_id || !form.intervention_date">
                  <span v-if="modalLoading" class="spinner" />
                  {{ modalLoading ? 'Enregistrement…' : (addOpen ? 'Créer' : 'Enregistrer') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>

      <!-- Delete -->
      <Transition name="modal">
        <AppConfirmModal
          v-if="deleteTarget"
          title="Supprimer l'intervention"
          :loading="modalLoading"
          confirm-label="Supprimer"
          @confirm="confirmDelete"
          @cancel="closeDelete"
        >
          <p class="modal-msg">
            Supprimer l'intervention du <strong>{{ formatDate(deleteTarget.intervention_date) }}</strong>
            sur <strong>{{ siteName(deleteTarget.site_id) }}</strong> ?
          </p>
        </AppConfirmModal>
      </Transition>

    </Teleport>
  </div>
</template>
