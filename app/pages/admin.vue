<script setup lang="ts">
import type { Technology, Agency, Hoster, WebServer, DnsProvider, UserProfile, Site, MaintenanceType, Bdd, Group } from '~/server/utils/types'
import { techTags } from '~/composables/useTechBadge'

definePageMeta({ middleware: 'auth' })

const { user } = useAuth()

// ── Tabs ──────────────────────────────────────────────────────
type TabId = 'technologies' | 'agencies' | 'hosters' | 'web-servers' | 'dns-providers' | 'databases' | 'users' | 'maintenance-types'

const activeTab = ref<TabId>('technologies')

const tabs: { id: TabId; label: string }[] = [
  { id: 'technologies',    label: 'Technologies'     },
  { id: 'agencies',        label: 'Agences'          },
  { id: 'hosters',         label: 'Hébergeurs'       },
  { id: 'web-servers',     label: 'Serveurs web'     },
  { id: 'dns-providers',   label: 'DNS'              },
  { id: 'databases',       label: 'Bases de données' },
  { id: 'users',           label: 'Utilisateurs'     },
  { id: 'maintenance-types', label: 'Types maintenance' },
]

// ── Data fetching via cache partagé ───────────────────────────
const refs = useReferenceData()
await Promise.all([
  refs.loadTechnologies(),
  refs.loadAgencies(),
  refs.loadHosters(),
  refs.loadWebServers(),
  refs.loadDnsProviders(),
  refs.loadUserProfiles(),
  refs.loadMaintenanceTypes(),
  refs.loadDatabases(),
  refs.loadGroups(),
  // sites : différé jusqu'à l'activation de l'onglet "Technologies"
])

const technologies     = refs.technologies
const agencies         = refs.agencies
const hosters          = refs.hosters
const webServers       = refs.webServers
const dnsProviders     = refs.dnsProviders
const userProfiles     = refs.userProfiles
const maintenanceTypes = refs.maintenanceTypes
const sites            = refs.sites
const databases        = refs.databases
const groups           = refs.groups

const refreshTechs             = refs.refreshTechnologies
const refreshAgencies          = refs.refreshAgencies
const refreshHosters           = refs.refreshHosters
const refreshWebServers        = refs.refreshWebServers
const refreshDns               = refs.refreshDnsProviders
const refreshUsers             = refs.refreshUserProfiles
const refreshMaintenanceTypes  = refs.refreshMaintenanceTypes
const refreshDatabases         = refs.refreshDatabases
const refreshGroups            = refs.refreshGroups

// Lazy fetch sites uniquement quand l'onglet Technologies est activé (seul consommateur)
watch((): TabId => activeTab.value, (tab: TabId): void => {
  if (tab === 'technologies') void refs.loadSites()
}, { immediate: true })

// Nombre de sites par technologie
const techSiteCount = computed((): Map<string, number> => {
  const map = new Map<string, number>()
  for (const site of sites.value) {
    for (const tag of techTags(site)) {
      map.set(tag, (map.get(tag) ?? 0) + 1)
    }
  }
  return map
})

// ── Generic CRUD state ────────────────────────────────────────
const modalLoading = ref(false)
const modalError   = ref<string | null>(null)

function resetModal(): void {
  modalLoading.value = false
  modalError.value   = null
}

const { add: toast } = useToast()

// ── Technologies CRUD ─────────────────────────────────────────
interface TechForm {
  label           : string
  simpleicons_slug: string
  svg             : string
  sort_order      : number
}

const techAddOpen   = ref(false)
const techEditTarget = ref<Technology | null>(null)
const techDeleteTarget = ref<Technology | null>(null)
const techForm      = ref<TechForm>({ label: '', simpleicons_slug: '', svg: '', sort_order: 0 })

function openTechAdd(): void {
  techForm.value = { label: '', simpleicons_slug: '', svg: '', sort_order: (technologies.value?.length ?? 0) + 1 }
  techAddOpen.value = true
  resetModal()
}
function openTechEdit(t: Technology): void {
  techForm.value = { label: t.label, simpleicons_slug: t.simpleicons_slug ?? '', svg: t.svg ?? '', sort_order: t.sort_order }
  techEditTarget.value = t
  resetModal()
}
function closeTechAdd():  void { techAddOpen.value = false }
function closeTechEdit(): void { techEditTarget.value = null }
function closeTechDelete(): void { techDeleteTarget.value = null }

async function confirmTechAdd(): Promise<void> {
  modalLoading.value = true; modalError.value = null
  try {
    await $fetch('/api/technologies', {
      method: 'POST',
      body  : {
        label           : techForm.value.label.trim(),
        simpleicons_slug: techForm.value.simpleicons_slug.trim() || null,
        svg             : techForm.value.svg.trim() || null,
        sort_order      : techForm.value.sort_order,
      },
    })
    await refreshTechs()
    techAddOpen.value = false
    toast('Technologie ajoutée.')
  } catch (e: unknown) {
    modalError.value = e instanceof Error ? e.message : 'Erreur'
    toast(modalError.value, 'error')
  } finally {
    modalLoading.value = false
  }
}

async function confirmTechEdit(): Promise<void> {
  if (!techEditTarget.value) return
  modalLoading.value = true; modalError.value = null
  try {
    await $fetch(`/api/technologies/${techEditTarget.value.id}`, {
      method: 'PATCH',
      body  : {
        label           : techForm.value.label.trim(),
        simpleicons_slug: techForm.value.simpleicons_slug.trim() || null,
        svg             : techForm.value.svg.trim() || null,
        sort_order      : techForm.value.sort_order,
      },
    })
    await refreshTechs()
    techEditTarget.value = null
    toast('Technologie mise à jour.')
  } catch (e: unknown) {
    modalError.value = e instanceof Error ? e.message : 'Erreur'
    toast(modalError.value, 'error')
  } finally {
    modalLoading.value = false
  }
}

async function confirmTechDelete(): Promise<void> {
  if (!techDeleteTarget.value) return
  modalLoading.value = true; modalError.value = null
  try {
    await $fetch(`/api/technologies/${techDeleteTarget.value.id}`, { method: 'DELETE' })
    await refreshTechs()
    techDeleteTarget.value = null
    toast('Technologie supprimée.')
  } catch (e: unknown) {
    modalError.value = e instanceof Error ? e.message : 'Erreur'
    toast(modalError.value, 'error')
  } finally {
    modalLoading.value = false
  }
}

// ── Agencies CRUD ─────────────────────────────────────────────
const agencyAddOpen    = ref(false)
const agencyEditTarget = ref<Agency | null>(null)
const agencyDeleteTarget = ref<Agency | null>(null)
const agencyName       = ref('')

function openAgencyAdd(): void  { agencyName.value = ''; agencyAddOpen.value = true; resetModal() }
function openAgencyEdit(a: Agency): void { agencyName.value = a.name; agencyEditTarget.value = a; resetModal() }
function closeAgencyAdd():    void { agencyAddOpen.value = false }
function closeAgencyEdit():   void { agencyEditTarget.value = null }
function closeAgencyDelete(): void { agencyDeleteTarget.value = null }

async function confirmAgencyAdd(): Promise<void> {
  modalLoading.value = true; modalError.value = null
  try {
    await $fetch('/api/agencies', { method: 'POST', body: { name: agencyName.value.trim() } })
    await refreshAgencies()
    agencyAddOpen.value = false
    toast('Agence ajoutée.')
  } catch (e: unknown) { modalError.value = e instanceof Error ? e.message : 'Erreur'; toast(modalError.value, 'error') }
  finally { modalLoading.value = false }
}

async function confirmAgencyEdit(): Promise<void> {
  if (!agencyEditTarget.value) return
  modalLoading.value = true; modalError.value = null
  try {
    await $fetch(`/api/agencies/${agencyEditTarget.value.id}`, { method: 'PATCH', body: { name: agencyName.value.trim() } })
    await refreshAgencies()
    agencyEditTarget.value = null
    toast('Agence mise à jour.')
  } catch (e: unknown) { modalError.value = e instanceof Error ? e.message : 'Erreur'; toast(modalError.value, 'error') }
  finally { modalLoading.value = false }
}

async function confirmAgencyDelete(): Promise<void> {
  if (!agencyDeleteTarget.value) return
  modalLoading.value = true; modalError.value = null
  try {
    await $fetch(`/api/agencies/${agencyDeleteTarget.value.id}`, { method: 'DELETE' })
    await refreshAgencies()
    agencyDeleteTarget.value = null
    toast('Agence supprimée.')
  } catch (e: unknown) { modalError.value = e instanceof Error ? e.message : 'Erreur'; toast(modalError.value, 'error') }
  finally { modalLoading.value = false }
}

// ── Generic Logo Entity CRUD (Hoster / WebServer / DnsProvider) ─
interface LogoForm { name: string; simpleicons_slug: string }

function makeLogoCrud<T extends { id: string; name: string; simpleicons_slug: string | null }>(
  apiPath: string,
  _data: Ref<T[]>,
  refresh: () => Promise<void>,
) {
  const addOpen      = ref(false)
  const editTarget   = ref<T | null>(null)
  const deleteTarget = ref<T | null>(null)
  const form         = ref<LogoForm>({ name: '', simpleicons_slug: '' })

  function openAdd():       void { form.value = { name: '', simpleicons_slug: '' }; addOpen.value = true; resetModal() }
  function openEdit(e: T):  void { form.value = { name: e.name, simpleicons_slug: e.simpleicons_slug ?? '' }; editTarget.value = e; resetModal() }
  function closeAdd():      void { addOpen.value = false }
  function closeEdit():     void { editTarget.value = null }
  function closeDelete():   void { deleteTarget.value = null }

  async function confirmAdd(): Promise<void> {
    modalLoading.value = true; modalError.value = null
    try {
      await $fetch(apiPath, { method: 'POST', body: { name: form.value.name.trim(), simpleicons_slug: form.value.simpleicons_slug.trim() || null } })
      await refresh(); addOpen.value = false
      toast(`${form.value.name.trim()} ajouté.`)
    } catch (e: unknown) { modalError.value = e instanceof Error ? e.message : 'Erreur'; toast(modalError.value, 'error') }
    finally { modalLoading.value = false }
  }

  async function confirmEdit(): Promise<void> {
    if (!editTarget.value) return
    modalLoading.value = true; modalError.value = null
    try {
      await $fetch(`${apiPath}/${editTarget.value.id}`, { method: 'PATCH', body: { name: form.value.name.trim(), simpleicons_slug: form.value.simpleicons_slug.trim() || null } })
      await refresh(); editTarget.value = null
      toast(`${form.value.name.trim()} mis à jour.`)
    } catch (e: unknown) { modalError.value = e instanceof Error ? e.message : 'Erreur'; toast(modalError.value, 'error') }
    finally { modalLoading.value = false }
  }

  async function confirmDelete(): Promise<void> {
    if (!deleteTarget.value) return
    modalLoading.value = true; modalError.value = null
    try {
      await $fetch(`${apiPath}/${deleteTarget.value.id}`, { method: 'DELETE' })
      await refresh(); deleteTarget.value = null
      toast('Entrée supprimée.')
    } catch (e: unknown) { modalError.value = e instanceof Error ? e.message : 'Erreur'; toast(modalError.value, 'error') }
    finally { modalLoading.value = false }
  }

  return { addOpen, editTarget, deleteTarget, form, openAdd, openEdit, closeAdd, closeEdit, closeDelete, confirmAdd, confirmEdit, confirmDelete }
}

const hosterCrud    = makeLogoCrud<Hoster>('/api/hosters', hosters, refreshHosters)
const webServerCrud = makeLogoCrud<WebServer>('/api/web-servers', webServers, refreshWebServers)
const dnsCrud       = makeLogoCrud<DnsProvider>('/api/dns-providers', dnsProviders, refreshDns)

// ── Users CRUD (édition profil uniquement — les comptes sont créés dans Supabase) ──
const ROLE_LABELS: Record<string, string> = {
  sysadmin: 'Sysadmin',
  dev     : 'Développeur',
  pm      : 'Cheffe de projet',
  crea    : 'Créatif',
  viewer  : 'Lecteur',
}

interface UserForm { first_name: string; last_name: string; role: string; agency: string; job_title: string }

const userEditTarget   = ref<UserProfile | null>(null)
const userForm         = ref<UserForm>({ first_name: '', last_name: '', role: 'viewer', agency: '', job_title: '' })

function openUserEdit(u: UserProfile): void {
  userForm.value = {
    first_name: u.first_name,
    last_name : u.last_name,
    role      : u.role,
    agency    : u.agency    ?? '',
    job_title : u.job_title ?? '',
  }
  userEditTarget.value = u
  resetModal()
}
function closeUserEdit(): void { userEditTarget.value = null }

async function confirmUserEdit(): Promise<void> {
  if (!userEditTarget.value) return
  modalLoading.value = true; modalError.value = null
  try {
    await $fetch(`/api/users/${userEditTarget.value.user_id}`, {
      method: 'PATCH',
      body  : {
        first_name: userForm.value.first_name.trim(),
        last_name : userForm.value.last_name.trim(),
        role      : userForm.value.role,
        agency    : userForm.value.agency.trim()    || null,
        job_title : userForm.value.job_title.trim() || null,
      },
    })
    await refreshUsers()
    userEditTarget.value = null
    toast('Profil mis à jour.')
  } catch (e: unknown) { modalError.value = e instanceof Error ? e.message : 'Erreur'; toast(modalError.value, 'error') }
  finally { modalLoading.value = false }
}

// ── Maintenance Types CRUD ────────────────────────────────────
interface MtForm { label: string }

const mtAddOpen      = ref(false)
const mtEditTarget   = ref<MaintenanceType | null>(null)
const mtDeleteTarget = ref<MaintenanceType | null>(null)
const mtForm         = ref<MtForm>({ label: '' })

function openMtAdd(): void  { mtForm.value = { label: '' }; mtAddOpen.value = true; resetModal() }
function openMtEdit(m: MaintenanceType): void { mtForm.value = { label: m.label }; mtEditTarget.value = m; resetModal() }
function closeMtAdd():    void { mtAddOpen.value = false }
function closeMtEdit():   void { mtEditTarget.value = null }
function closeMtDelete(): void { mtDeleteTarget.value = null }

async function confirmMtAdd(): Promise<void> {
  modalLoading.value = true; modalError.value = null
  try {
    await $fetch('/api/maintenance-types', { method: 'POST', body: { label: mtForm.value.label.trim() } })
    await refreshMaintenanceTypes(); mtAddOpen.value = false
    toast('Type de maintenance ajouté.')
  } catch (e: unknown) { modalError.value = e instanceof Error ? e.message : 'Erreur'; toast(modalError.value, 'error') }
  finally { modalLoading.value = false }
}
async function confirmMtEdit(): Promise<void> {
  if (!mtEditTarget.value) return
  modalLoading.value = true; modalError.value = null
  try {
    await $fetch(`/api/maintenance-types/${mtEditTarget.value.id}`, { method: 'PATCH', body: { label: mtForm.value.label.trim() } })
    await refreshMaintenanceTypes(); mtEditTarget.value = null
    toast('Type de maintenance mis à jour.')
  } catch (e: unknown) { modalError.value = e instanceof Error ? e.message : 'Erreur'; toast(modalError.value, 'error') }
  finally { modalLoading.value = false }
}
async function confirmMtDelete(): Promise<void> {
  if (!mtDeleteTarget.value) return
  modalLoading.value = true; modalError.value = null
  try {
    await $fetch(`/api/maintenance-types/${mtDeleteTarget.value.id}`, { method: 'DELETE' })
    await refreshMaintenanceTypes(); mtDeleteTarget.value = null
    toast('Type de maintenance supprimé.')
  } catch (e: unknown) { modalError.value = e instanceof Error ? e.message : 'Erreur'; toast(modalError.value, 'error') }
  finally { modalLoading.value = false }
}

// ── Databases (BDD) CRUD ──────────────────────────────────────
interface BddForm { name: string; type: string; notes: string; server_ids: string }

const bddAddOpen      = ref(false)
const bddEditTarget   = ref<Bdd | null>(null)
const bddDeleteTarget = ref<Bdd | null>(null)
const bddForm         = ref<BddForm>({ name: '', type: '', notes: '', server_ids: '' })

/** Serveurs actuellement rattachés à une BDD. */
function serversForBdd(bddId: string): Group[] {
  return groups.value.filter((g: Group): boolean => g.database_id === bddId)
}
function serverIdsCsv(bddId: string): string {
  return serversForBdd(bddId).map((g: Group): string => g.id).join(',')
}

function openBddAdd(): void {
  bddForm.value = { name: '', type: '', notes: '', server_ids: '' }
  bddAddOpen.value = true
  resetModal()
}
function openBddEdit(b: Bdd): void {
  bddForm.value = { name: b.name, type: b.type ?? '', notes: b.notes ?? '', server_ids: serverIdsCsv(b.id) }
  bddEditTarget.value = b
  resetModal()
}
function closeBddAdd():    void { bddAddOpen.value = false }
function closeBddEdit():   void { bddEditTarget.value = null }
function closeBddDelete(): void { bddDeleteTarget.value = null }

function bddBody(): Record<string, string | null> {
  return {
    name : bddForm.value.name.trim(),
    type : bddForm.value.type.trim()  || null,
    notes: bddForm.value.notes.trim() || null,
  }
}

/** Rattache les serveurs sélectionnés à la BDD et détache ceux retirés (un serveur = une seule BDD). */
async function applyServerAssignment(bddId: string, selectedCsv: string): Promise<void> {
  const selected = new Set(selectedCsv.split(',').map((s: string) => s.trim()).filter(Boolean))
  const current  = new Set(serversForBdd(bddId).map((g: Group): string => g.id))
  const toAttach = [...selected].filter((id: string): boolean => !current.has(id))
  const toDetach = [...current].filter((id: string): boolean => !selected.has(id))
  await Promise.all([
    ...toAttach.map((id: string) => $fetch(`/api/groups/${id}`, { method: 'PATCH', body: { database_id: bddId } })),
    ...toDetach.map((id: string) => $fetch(`/api/groups/${id}`, { method: 'PATCH', body: { database_id: null } })),
  ])
}

async function confirmBddAdd(): Promise<void> {
  modalLoading.value = true; modalError.value = null
  try {
    const created = await $fetch<Bdd>('/api/databases', { method: 'POST', body: bddBody() })
    await applyServerAssignment(created.id, bddForm.value.server_ids)
    await Promise.all([refreshDatabases(), refreshGroups()])
    bddAddOpen.value = false
    toast('Base de données ajoutée.')
  } catch (e: unknown) { modalError.value = e instanceof Error ? e.message : 'Erreur'; toast(modalError.value, 'error') }
  finally { modalLoading.value = false }
}
async function confirmBddEdit(): Promise<void> {
  if (!bddEditTarget.value) return
  modalLoading.value = true; modalError.value = null
  try {
    await $fetch(`/api/databases/${bddEditTarget.value.id}`, { method: 'PATCH', body: bddBody() })
    await applyServerAssignment(bddEditTarget.value.id, bddForm.value.server_ids)
    await Promise.all([refreshDatabases(), refreshGroups()])
    bddEditTarget.value = null
    toast('Base de données mise à jour.')
  } catch (e: unknown) { modalError.value = e instanceof Error ? e.message : 'Erreur'; toast(modalError.value, 'error') }
  finally { modalLoading.value = false }
}
async function confirmBddDelete(): Promise<void> {
  if (!bddDeleteTarget.value) return
  modalLoading.value = true; modalError.value = null
  try {
    await $fetch(`/api/databases/${bddDeleteTarget.value.id}`, { method: 'DELETE' })
    await Promise.all([refreshDatabases(), refreshGroups()])
    bddDeleteTarget.value = null
    toast('Base de données supprimée.')
  } catch (e: unknown) { modalError.value = e instanceof Error ? e.message : 'Erreur'; toast(modalError.value, 'error') }
  finally { modalLoading.value = false }
}

// ── Helpers ───────────────────────────────────────────────────
function simpleIconUrl(slug: string): string {
  return `https://cdn.simpleicons.org/${slug}`
}
</script>

<template>
  <div class="admin-wrap">

    <AppHeader title="Administration" />

    <!-- Tabs -->
    <div class="admin-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="admin-tab"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >{{ tab.label }}</button>
    </div>

    <!-- ── Technologies ─────────────────────────────────────────── -->
    <div v-if="activeTab === 'technologies'" class="admin-section">
      <div class="admin-section-header">
        <span class="admin-section-title">Technologies ({{ technologies?.length ?? 0 }})</span>
        <button class="btn primary" @click="openTechAdd">+ Ajouter</button>
      </div>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Label</th>
              <th>Icône</th>
              <th>Sites</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!technologies?.length">
              <td colspan="4" class="admin-empty">Aucune technologie.</td>
            </tr>
            <tr v-for="t in technologies" :key="t.id">
              <td>{{ t.label }}</td>
              <td>
                <div class="admin-logo-cell">
                  <img v-if="t.simpleicons_slug" :src="simpleIconUrl(t.simpleicons_slug)" class="admin-logo-preview" :alt="t.label" @error="($event.target as HTMLImageElement).style.display='none'">
                  <!-- eslint-disable-next-line vue/no-v-html -->
                  <span v-else-if="t.svg" class="admin-svg-preview" v-html="t.svg" />
                  <span style="font-size:11px;color:var(--text-muted)">{{ t.simpleicons_slug || (t.svg ? 'SVG' : '—') }}</span>
                </div>
              </td>
              <td>{{ techSiteCount.get(t.label) ?? 0 }}</td>
              <td>
                <div class="admin-row-actions">
                  <button class="icon-btn" title="Modifier" @click="openTechEdit(t)">&#9998;</button>
                  <button class="icon-btn del" title="Supprimer" @click="techDeleteTarget = t; resetModal()">&#10005;</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── Agences ──────────────────────────────────────────────── -->
    <div v-if="activeTab === 'agencies'" class="admin-section">
      <div class="admin-section-header">
        <span class="admin-section-title">Agences ({{ agencies?.length ?? 0 }})</span>
        <button class="btn primary" @click="openAgencyAdd">+ Ajouter</button>
      </div>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>Nom</th><th></th></tr></thead>
          <tbody>
            <tr v-if="!agencies?.length">
              <td colspan="2" class="admin-empty">Aucune agence.</td>
            </tr>
            <tr v-for="a in agencies" :key="a.id">
              <td>{{ a.name }}</td>
              <td>
                <div class="admin-row-actions">
                  <button class="icon-btn" title="Modifier" @click="openAgencyEdit(a)">&#9998;</button>
                  <button class="icon-btn del" title="Supprimer" @click="agencyDeleteTarget = a; resetModal()">&#10005;</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── Hébergeurs ───────────────────────────────────────────── -->
    <div v-if="activeTab === 'hosters'" class="admin-section">
      <div class="admin-section-header">
        <span class="admin-section-title">Hébergeurs ({{ hosters?.length ?? 0 }})</span>
        <button class="btn primary" @click="hosterCrud.openAdd()">+ Ajouter</button>
      </div>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>Nom</th><th>Icône</th><th></th></tr></thead>
          <tbody>
            <tr v-if="!hosters?.length">
              <td colspan="3" class="admin-empty">Aucun hébergeur.</td>
            </tr>
            <tr v-for="h in hosters" :key="h.id">
              <td>{{ h.name }}</td>
              <td>
                <div class="admin-logo-cell">
                  <img v-if="h.simpleicons_slug" :src="simpleIconUrl(h.simpleicons_slug)" class="admin-logo-preview" :alt="h.name" @error="($event.target as HTMLImageElement).style.display='none'">
                  <span style="font-size:11px;color:var(--text-muted)">{{ h.simpleicons_slug || '—' }}</span>
                </div>
              </td>
              <td>
                <div class="admin-row-actions">
                  <button class="icon-btn" title="Modifier" @click="hosterCrud.openEdit(h)">&#9998;</button>
                  <button class="icon-btn del" title="Supprimer" @click="hosterCrud.deleteTarget.value = h; resetModal()">&#10005;</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── Serveurs web ─────────────────────────────────────────── -->
    <div v-if="activeTab === 'web-servers'" class="admin-section">
      <div class="admin-section-header">
        <span class="admin-section-title">Serveurs web ({{ webServers?.length ?? 0 }})</span>
        <button class="btn primary" @click="webServerCrud.openAdd()">+ Ajouter</button>
      </div>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>Nom</th><th>Icône</th><th></th></tr></thead>
          <tbody>
            <tr v-if="!webServers?.length">
              <td colspan="3" class="admin-empty">Aucun serveur web.</td>
            </tr>
            <tr v-for="ws in webServers" :key="ws.id">
              <td>{{ ws.name }}</td>
              <td>
                <div class="admin-logo-cell">
                  <img v-if="ws.simpleicons_slug" :src="simpleIconUrl(ws.simpleicons_slug)" class="admin-logo-preview" :alt="ws.name" @error="($event.target as HTMLImageElement).style.display='none'">
                  <span style="font-size:11px;color:var(--text-muted)">{{ ws.simpleicons_slug || '—' }}</span>
                </div>
              </td>
              <td>
                <div class="admin-row-actions">
                  <button class="icon-btn" title="Modifier" @click="webServerCrud.openEdit(ws)">&#9998;</button>
                  <button class="icon-btn del" title="Supprimer" @click="webServerCrud.deleteTarget.value = ws; resetModal()">&#10005;</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── DNS ─────────────────────────────────────────────────── -->
    <div v-if="activeTab === 'dns-providers'" class="admin-section">
      <div class="admin-section-header">
        <span class="admin-section-title">DNS ({{ dnsProviders?.length ?? 0 }})</span>
        <button class="btn primary" @click="dnsCrud.openAdd()">+ Ajouter</button>
      </div>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>Nom</th><th>Icône</th><th></th></tr></thead>
          <tbody>
            <tr v-if="!dnsProviders?.length">
              <td colspan="3" class="admin-empty">Aucun provider DNS.</td>
            </tr>
            <tr v-for="d in dnsProviders" :key="d.id">
              <td>{{ d.name }}</td>
              <td>
                <div class="admin-logo-cell">
                  <img v-if="d.simpleicons_slug" :src="simpleIconUrl(d.simpleicons_slug)" class="admin-logo-preview" :alt="d.name" @error="($event.target as HTMLImageElement).style.display='none'">
                  <span style="font-size:11px;color:var(--text-muted)">{{ d.simpleicons_slug || '—' }}</span>
                </div>
              </td>
              <td>
                <div class="admin-row-actions">
                  <button class="icon-btn" title="Modifier" @click="dnsCrud.openEdit(d)">&#9998;</button>
                  <button class="icon-btn del" title="Supprimer" @click="dnsCrud.deleteTarget.value = d; resetModal()">&#10005;</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── Bases de données ─────────────────────────────────────── -->
    <div v-if="activeTab === 'databases'" class="admin-section">
      <div class="admin-section-header">
        <span class="admin-section-title">Bases de données ({{ databases?.length ?? 0 }})</span>
        <button class="btn primary" @click="openBddAdd">+ Ajouter</button>
      </div>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>Nom</th><th>Type</th><th>Serveurs</th><th>Notes</th><th></th></tr></thead>
          <tbody>
            <tr v-if="!databases?.length">
              <td colspan="5" class="admin-empty">Aucune base de données.</td>
            </tr>
            <tr v-for="b in databases" :key="b.id">
              <td>{{ b.name }}</td>
              <td>{{ b.type || '—' }}</td>
              <td>
                <span v-if="serversForBdd(b.id).length" class="admin-bdd-servers">
                  {{ serversForBdd(b.id).map(g => g.name).join(', ') }}
                </span>
                <span v-else style="color:var(--text-muted)">—</span>
              </td>
              <td class="admin-bdd-notes">{{ b.notes || '—' }}</td>
              <td>
                <div class="admin-row-actions">
                  <button class="icon-btn" title="Modifier" @click="openBddEdit(b)">&#9998;</button>
                  <button class="icon-btn del" title="Supprimer" @click="bddDeleteTarget = b; resetModal()">&#10005;</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── Utilisateurs ──────────────────────────────────────────── -->
    <div v-if="activeTab === 'users'" class="admin-section">
      <div class="admin-section-header">
        <span class="admin-section-title">Utilisateurs ({{ userProfiles?.length ?? 0 }})</span>
        <span class="admin-section-hint">Les comptes sont créés dans le dashboard Supabase.</span>
      </div>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>Prénom</th><th>Nom</th><th>Rôle</th><th>Titre</th><th>Agence</th><th></th></tr></thead>
          <tbody>
            <tr v-if="!userProfiles?.length">
              <td colspan="6" class="admin-empty">Aucun profil. Les utilisateurs apparaissent ici après leur premier login.</td>
            </tr>
            <tr v-for="u in userProfiles" :key="u.user_id">
              <td>{{ u.first_name || '—' }}</td>
              <td>{{ u.last_name  || '—' }}</td>
              <td><span class="admin-role-badge" :data-role="u.role">{{ ROLE_LABELS[u.role] ?? u.role }}</span></td>
              <td>{{ u.job_title || '—' }}</td>
              <td>{{ u.agency    || '—' }}</td>
              <td>
                <div class="admin-row-actions">
                  <button class="icon-btn" title="Modifier" @click="openUserEdit(u)">&#9998;</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── Types maintenance ────────────────────────────────────── -->
    <div v-if="activeTab === 'maintenance-types'" class="admin-section">
      <div class="admin-section-header">
        <span class="admin-section-title">Types maintenance ({{ maintenanceTypes?.length ?? 0 }})</span>
        <button class="btn primary" @click="openMtAdd">+ Ajouter</button>
      </div>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>Label</th><th></th></tr></thead>
          <tbody>
            <tr v-if="!maintenanceTypes?.length">
              <td colspan="2" class="admin-empty">Aucun type de maintenance.</td>
            </tr>
            <tr v-for="m in maintenanceTypes" :key="m.id">
              <td>{{ m.label }}</td>
              <td>
                <div class="admin-row-actions">
                  <button class="icon-btn" title="Modifier" @click="openMtEdit(m)">&#9998;</button>
                  <button class="icon-btn del" title="Supprimer" @click="mtDeleteTarget = m; resetModal()">&#10005;</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ════════════════════════════════════════════════════════════ -->
    <!-- MODALES                                                     -->
    <!-- ════════════════════════════════════════════════════════════ -->
    <Teleport to="body">

      <!-- Modale Add/Edit Technologie -->
      <Transition name="modal">
        <div v-if="techAddOpen || techEditTarget" class="modal-overlay" v-modal-close="() => techAddOpen ? closeTechAdd() : closeTechEdit()">
          <div class="modal-card">
            <h3 class="modal-title">{{ techAddOpen ? 'Ajouter une technologie' : 'Modifier la technologie' }}</h3>
            <p v-if="modalError" class="modal-error">{{ modalError }}</p>
            <form @submit.prevent="techAddOpen ? confirmTechAdd() : confirmTechEdit()">
              <div class="field">
                <label>Label *</label>
                <input v-model="techForm.label" type="text" placeholder="WordPress" required>
              </div>
              <div class="field">
                <label>Simpleicons slug</label>
                <input v-model="techForm.simpleicons_slug" type="text" placeholder="wordpress">
                <div v-if="techForm.simpleicons_slug" class="admin-slug-preview">
                  <img :src="simpleIconUrl(techForm.simpleicons_slug)" width="16" height="16" alt="preview" @error="($event.target as HTMLImageElement).style.display='none'">
                  <span style="font-size:11px;color:var(--text-muted)">preview</span>
                </div>
                <p class="admin-slug-hint">Laisser vide si SVG custom fourni ci-dessous</p>
              </div>
              <div class="field">
                <label>SVG custom</label>
                <textarea v-model="techForm.svg" class="field-input" placeholder="<svg>…</svg>" rows="3" />
                <p class="admin-slug-hint">Utilisé uniquement si aucun slug simpleicons</p>
              </div>
              <div class="modal-btns">
                <button type="button" class="btn" :disabled="modalLoading" @click="techAddOpen ? closeTechAdd() : closeTechEdit()">Annuler</button>
                <button type="submit" class="btn primary" :disabled="modalLoading">
                  <span v-if="modalLoading" class="spinner" />
                  {{ modalLoading ? 'Enregistrement…' : (techAddOpen ? 'Créer' : 'Enregistrer') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>

      <!-- Modale Delete Technologie -->
      <Transition name="modal">
        <AppConfirmModal
          v-if="techDeleteTarget"
          title="Supprimer la technologie"
          :loading="modalLoading"
          confirm-label="Supprimer"
          @confirm="confirmTechDelete"
          @cancel="closeTechDelete"
        >
          <p class="modal-msg">Supprimer <strong>{{ techDeleteTarget.label }}</strong> définitivement ?</p>
        </AppConfirmModal>
      </Transition>

      <!-- Modale Add/Edit Agence -->
      <Transition name="modal">
        <div v-if="agencyAddOpen || agencyEditTarget" class="modal-overlay" v-modal-close="() => agencyAddOpen ? closeAgencyAdd() : closeAgencyEdit()">
          <div class="modal-card">
            <h3 class="modal-title">{{ agencyAddOpen ? 'Ajouter une agence' : 'Modifier l\'agence' }}</h3>
            <p v-if="modalError" class="modal-error">{{ modalError }}</p>
            <form @submit.prevent="agencyAddOpen ? confirmAgencyAdd() : confirmAgencyEdit()">
              <div class="field">
                <label>Nom *</label>
                <input v-model="agencyName" type="text" placeholder="Eclolink" required>
              </div>
              <div class="modal-btns">
                <button type="button" class="btn" :disabled="modalLoading" @click="agencyAddOpen ? closeAgencyAdd() : closeAgencyEdit()">Annuler</button>
                <button type="submit" class="btn primary" :disabled="modalLoading">
                  <span v-if="modalLoading" class="spinner" />
                  {{ modalLoading ? 'Enregistrement…' : (agencyAddOpen ? 'Créer' : 'Enregistrer') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>

      <!-- Modale Delete Agence -->
      <Transition name="modal">
        <AppConfirmModal
          v-if="agencyDeleteTarget"
          title="Supprimer l'agence"
          :loading="modalLoading"
          confirm-label="Supprimer"
          @confirm="confirmAgencyDelete"
          @cancel="closeAgencyDelete"
        >
          <p class="modal-msg">Supprimer <strong>{{ agencyDeleteTarget.name }}</strong> définitivement ?</p>
        </AppConfirmModal>
      </Transition>

      <!-- Modale Add/Edit Logo Entity (Hébergeur / Serveur web / DNS) -->
      <Transition name="modal">
        <div v-if="hosterCrud.addOpen.value || hosterCrud.editTarget.value" class="modal-overlay" v-modal-close="() => hosterCrud.addOpen.value ? hosterCrud.closeAdd() : hosterCrud.closeEdit()">
          <div class="modal-card">
            <h3 class="modal-title">{{ hosterCrud.addOpen.value ? 'Ajouter un hébergeur' : 'Modifier l\'hébergeur' }}</h3>
            <p v-if="modalError" class="modal-error">{{ modalError }}</p>
            <form @submit.prevent="hosterCrud.addOpen.value ? hosterCrud.confirmAdd() : hosterCrud.confirmEdit()">
              <div class="field"><label>Nom *</label><input v-model="hosterCrud.form.value.name" type="text" placeholder="OVH" required></div>
              <div class="field">
                <label>Simpleicons slug</label>
                <input v-model="hosterCrud.form.value.simpleicons_slug" type="text" placeholder="ovh">
                <div v-if="hosterCrud.form.value.simpleicons_slug" class="admin-slug-preview">
                  <img :src="simpleIconUrl(hosterCrud.form.value.simpleicons_slug)" width="16" height="16" alt="preview" @error="($event.target as HTMLImageElement).style.display='none'">
                </div>
              </div>
              <div class="modal-btns">
                <button type="button" class="btn" :disabled="modalLoading" @click="hosterCrud.addOpen.value ? hosterCrud.closeAdd() : hosterCrud.closeEdit()">Annuler</button>
                <button type="submit" class="btn primary" :disabled="modalLoading">
                  <span v-if="modalLoading" class="spinner" />
                  {{ modalLoading ? 'Enregistrement…' : (hosterCrud.addOpen.value ? 'Créer' : 'Enregistrer') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
      <Transition name="modal">
        <AppConfirmModal v-if="hosterCrud.deleteTarget.value" title="Supprimer l'hébergeur" :loading="modalLoading" confirm-label="Supprimer" @confirm="hosterCrud.confirmDelete" @cancel="hosterCrud.closeDelete">
          <p class="modal-msg">Supprimer <strong>{{ hosterCrud.deleteTarget.value.name }}</strong> ?</p>
        </AppConfirmModal>
      </Transition>

      <!-- Serveur web modales -->
      <Transition name="modal">
        <div v-if="webServerCrud.addOpen.value || webServerCrud.editTarget.value" class="modal-overlay" v-modal-close="() => webServerCrud.addOpen.value ? webServerCrud.closeAdd() : webServerCrud.closeEdit()">
          <div class="modal-card">
            <h3 class="modal-title">{{ webServerCrud.addOpen.value ? 'Ajouter un serveur web' : 'Modifier le serveur web' }}</h3>
            <p v-if="modalError" class="modal-error">{{ modalError }}</p>
            <form @submit.prevent="webServerCrud.addOpen.value ? webServerCrud.confirmAdd() : webServerCrud.confirmEdit()">
              <div class="field"><label>Nom *</label><input v-model="webServerCrud.form.value.name" type="text" placeholder="Nginx" required></div>
              <div class="field">
                <label>Simpleicons slug</label>
                <input v-model="webServerCrud.form.value.simpleicons_slug" type="text" placeholder="nginx">
                <div v-if="webServerCrud.form.value.simpleicons_slug" class="admin-slug-preview">
                  <img :src="simpleIconUrl(webServerCrud.form.value.simpleicons_slug)" width="16" height="16" alt="preview" @error="($event.target as HTMLImageElement).style.display='none'">
                </div>
              </div>
              <div class="modal-btns">
                <button type="button" class="btn" :disabled="modalLoading" @click="webServerCrud.addOpen.value ? webServerCrud.closeAdd() : webServerCrud.closeEdit()">Annuler</button>
                <button type="submit" class="btn primary" :disabled="modalLoading">
                  <span v-if="modalLoading" class="spinner" />
                  {{ modalLoading ? 'Enregistrement…' : (webServerCrud.addOpen.value ? 'Créer' : 'Enregistrer') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
      <Transition name="modal">
        <AppConfirmModal v-if="webServerCrud.deleteTarget.value" title="Supprimer le serveur web" :loading="modalLoading" confirm-label="Supprimer" @confirm="webServerCrud.confirmDelete" @cancel="webServerCrud.closeDelete">
          <p class="modal-msg">Supprimer <strong>{{ webServerCrud.deleteTarget.value.name }}</strong> ?</p>
        </AppConfirmModal>
      </Transition>

      <!-- DNS modales -->
      <Transition name="modal">
        <div v-if="dnsCrud.addOpen.value || dnsCrud.editTarget.value" class="modal-overlay" v-modal-close="() => dnsCrud.addOpen.value ? dnsCrud.closeAdd() : dnsCrud.closeEdit()">
          <div class="modal-card">
            <h3 class="modal-title">{{ dnsCrud.addOpen.value ? 'Ajouter un provider DNS' : 'Modifier le provider DNS' }}</h3>
            <p v-if="modalError" class="modal-error">{{ modalError }}</p>
            <form @submit.prevent="dnsCrud.addOpen.value ? dnsCrud.confirmAdd() : dnsCrud.confirmEdit()">
              <div class="field"><label>Nom *</label><input v-model="dnsCrud.form.value.name" type="text" placeholder="Cloudflare" required></div>
              <div class="field">
                <label>Simpleicons slug</label>
                <input v-model="dnsCrud.form.value.simpleicons_slug" type="text" placeholder="cloudflare">
                <div v-if="dnsCrud.form.value.simpleicons_slug" class="admin-slug-preview">
                  <img :src="simpleIconUrl(dnsCrud.form.value.simpleicons_slug)" width="16" height="16" alt="preview" @error="($event.target as HTMLImageElement).style.display='none'">
                </div>
              </div>
              <div class="modal-btns">
                <button type="button" class="btn" :disabled="modalLoading" @click="dnsCrud.addOpen.value ? dnsCrud.closeAdd() : dnsCrud.closeEdit()">Annuler</button>
                <button type="submit" class="btn primary" :disabled="modalLoading">
                  <span v-if="modalLoading" class="spinner" />
                  {{ modalLoading ? 'Enregistrement…' : (dnsCrud.addOpen.value ? 'Créer' : 'Enregistrer') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
      <Transition name="modal">
        <AppConfirmModal v-if="dnsCrud.deleteTarget.value" title="Supprimer le provider DNS" :loading="modalLoading" confirm-label="Supprimer" @confirm="dnsCrud.confirmDelete" @cancel="dnsCrud.closeDelete">
          <p class="modal-msg">Supprimer <strong>{{ dnsCrud.deleteTarget.value.name }}</strong> ?</p>
        </AppConfirmModal>
      </Transition>

      <!-- Modale Add/Edit BDD -->
      <Transition name="modal">
        <div v-if="bddAddOpen || bddEditTarget" class="modal-overlay" v-modal-close="() => bddAddOpen ? closeBddAdd() : closeBddEdit()">
          <div class="modal-card">
            <h3 class="modal-title">{{ bddAddOpen ? 'Ajouter une base de données' : 'Modifier la base de données' }}</h3>
            <p v-if="modalError" class="modal-error">{{ modalError }}</p>
            <form @submit.prevent="bddAddOpen ? confirmBddAdd() : confirmBddEdit()">
              <div class="field"><label>Nom *</label><input v-model="bddForm.name" type="text" placeholder="DB Prod OVH" required></div>
              <div class="field">
                <label>Type / moteur</label>
                <input v-model="bddForm.type" type="text" placeholder="MySQL, PostgreSQL, MariaDB…">
              </div>
              <div class="field">
                <label>Serveurs rattachés</label>
                <AppMultiSelect
                  v-model="bddForm.server_ids"
                  :options="groups.map((g: Group) => ({ id: g.id, label: g.name }))"
                  placeholder="— Aucun serveur —"
                />
                <p class="admin-slug-hint">Un serveur ne peut être rattaché qu'à une seule BDD ; le sélectionner ici le détache de sa BDD précédente.</p>
              </div>
              <div class="field">
                <label>Notes</label>
                <textarea v-model="bddForm.notes" class="field-input" rows="3" placeholder="Informations complémentaires…" />
              </div>
              <div class="modal-btns">
                <button type="button" class="btn" :disabled="modalLoading" @click="bddAddOpen ? closeBddAdd() : closeBddEdit()">Annuler</button>
                <button type="submit" class="btn primary" :disabled="modalLoading">
                  <span v-if="modalLoading" class="spinner" />
                  {{ modalLoading ? 'Enregistrement…' : (bddAddOpen ? 'Créer' : 'Enregistrer') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
      <Transition name="modal">
        <AppConfirmModal v-if="bddDeleteTarget" title="Supprimer la base de données" :loading="modalLoading" confirm-label="Supprimer" @confirm="confirmBddDelete" @cancel="closeBddDelete">
          <p class="modal-msg">
            Supprimer <strong>{{ bddDeleteTarget.name }}</strong> définitivement ?
            Les serveurs rattachés seront détachés (non supprimés).
          </p>
        </AppConfirmModal>
      </Transition>

      <!-- Modale Edit Utilisateur -->
      <Transition name="modal">
        <div v-if="userEditTarget" class="modal-overlay" v-modal-close="closeUserEdit">
          <div class="modal-card">
            <h3 class="modal-title">Modifier le profil</h3>
            <p v-if="modalError" class="modal-error">{{ modalError }}</p>
            <form @submit.prevent="confirmUserEdit">
              <div class="field"><label>Prénom</label><input v-model="userForm.first_name" type="text"></div>
              <div class="field"><label>Nom</label><input v-model="userForm.last_name" type="text"></div>
              <div class="field">
                <label>Rôle *</label>
                <AppSelect
                  v-model="userForm.role"
                  :options="Object.entries(ROLE_LABELS).map(([v, l]) => ({ value: v, label: l }))"
                  placeholder="— Choisir —"
                />
              </div>
              <div class="field">
                <label>Titre de poste</label>
                <input v-model="userForm.job_title" type="text" placeholder="Développeur full-stack">
              </div>
              <div class="field">
                <label>Agence</label>
                <AppSelect
                  v-model="userForm.agency"
                  :options="agencies.map((a: Agency) => ({ value: a.name, label: a.name }))"
                  placeholder="— Aucune —"
                />
              </div>
              <div class="modal-btns">
                <button type="button" class="btn" :disabled="modalLoading" @click="closeUserEdit">Annuler</button>
                <button type="submit" class="btn primary" :disabled="modalLoading">
                  <span v-if="modalLoading" class="spinner" />
                  {{ modalLoading ? 'Enregistrement…' : 'Enregistrer' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>

      <!-- Modale Add/Edit Type maintenance -->
      <Transition name="modal">
        <div v-if="mtAddOpen || mtEditTarget" class="modal-overlay" v-modal-close="() => mtAddOpen ? closeMtAdd() : closeMtEdit()">
          <div class="modal-card">
            <h3 class="modal-title">{{ mtAddOpen ? 'Ajouter un type de maintenance' : 'Modifier le type' }}</h3>
            <p v-if="modalError" class="modal-error">{{ modalError }}</p>
            <form @submit.prevent="mtAddOpen ? confirmMtAdd() : confirmMtEdit()">
              <div class="field"><label>Label *</label><input v-model="mtForm.label" type="text" placeholder="Maj WordPress" required></div>
              <div class="modal-btns">
                <button type="button" class="btn" :disabled="modalLoading" @click="mtAddOpen ? closeMtAdd() : closeMtEdit()">Annuler</button>
                <button type="submit" class="btn primary" :disabled="modalLoading">
                  <span v-if="modalLoading" class="spinner" />
                  {{ modalLoading ? 'Enregistrement…' : (mtAddOpen ? 'Créer' : 'Enregistrer') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
      <Transition name="modal">
        <AppConfirmModal v-if="mtDeleteTarget" title="Supprimer le type" :loading="modalLoading" confirm-label="Supprimer" @confirm="confirmMtDelete" @cancel="closeMtDelete">
          <p class="modal-msg">Supprimer <strong>{{ mtDeleteTarget.label }}</strong> définitivement ?</p>
        </AppConfirmModal>
      </Transition>

    </Teleport>
  </div>
</template>

<style src="~/assets/css/admin.css"></style>
