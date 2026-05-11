<script setup lang="ts">
import type { Technology, Agency, Hoster, WebServer, DnsProvider, ProjectManager, Client, Site } from '~/server/utils/types'
import { techTags } from '~/composables/useTechBadge'

definePageMeta({ middleware: 'auth' })

const { user, logout } = useAuth()

// ── Tabs ──────────────────────────────────────────────────────
type TabId = 'technologies' | 'agencies' | 'hosters' | 'web-servers' | 'dns-providers' | 'project-managers' | 'clients'

const activeTab = ref<TabId>('technologies')

const tabs: { id: TabId; label: string }[] = [
  { id: 'technologies',    label: 'Technologies'   },
  { id: 'agencies',        label: 'Agences'        },
  { id: 'hosters',         label: 'Hébergeurs'     },
  { id: 'web-servers',     label: 'Serveurs web'   },
  { id: 'dns-providers',   label: 'DNS'            },
  { id: 'project-managers', label: 'Cheffes de projet' },
  { id: 'clients',         label: 'Clients'        },
]

// ── Data fetching ─────────────────────────────────────────────
const { data: technologies, refresh: refreshTechs }     = await useFetch<Technology[]>('/api/technologies')
const { data: agencies,     refresh: refreshAgencies }   = await useFetch<Agency[]>('/api/agencies')
const { data: hosters,      refresh: refreshHosters }    = await useFetch<Hoster[]>('/api/hosters')
const { data: webServers,   refresh: refreshWebServers } = await useFetch<WebServer[]>('/api/web-servers')
const { data: dnsProviders, refresh: refreshDns }        = await useFetch<DnsProvider[]>('/api/dns-providers')
const { data: pms,          refresh: refreshPms }        = await useFetch<ProjectManager[]>('/api/project-managers')
const { data: clients,      refresh: refreshClients }    = await useFetch<Client[]>('/api/clients')
const { data: sites }                                    = await useFetch<Site[]>('/api/sites')

// Peuple le state partagé pour que techTags() fonctionne
const refTechs = useState<Technology[]>('ref:techs', () => [])
watchEffect(() => { if (technologies.value) refTechs.value = technologies.value })

// Nombre de sites par technologie
const techSiteCount = computed((): Map<string, number> => {
  const map = new Map<string, number>()
  for (const site of sites.value ?? []) {
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
  } catch (e: unknown) {
    modalError.value = e instanceof Error ? e.message : 'Erreur'
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
  } catch (e: unknown) {
    modalError.value = e instanceof Error ? e.message : 'Erreur'
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
  } catch (e: unknown) {
    modalError.value = e instanceof Error ? e.message : 'Erreur'
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
  } catch (e: unknown) { modalError.value = e instanceof Error ? e.message : 'Erreur' }
  finally { modalLoading.value = false }
}

async function confirmAgencyEdit(): Promise<void> {
  if (!agencyEditTarget.value) return
  modalLoading.value = true; modalError.value = null
  try {
    await $fetch(`/api/agencies/${agencyEditTarget.value.id}`, { method: 'PATCH', body: { name: agencyName.value.trim() } })
    await refreshAgencies()
    agencyEditTarget.value = null
  } catch (e: unknown) { modalError.value = e instanceof Error ? e.message : 'Erreur' }
  finally { modalLoading.value = false }
}

async function confirmAgencyDelete(): Promise<void> {
  if (!agencyDeleteTarget.value) return
  modalLoading.value = true; modalError.value = null
  try {
    await $fetch(`/api/agencies/${agencyDeleteTarget.value.id}`, { method: 'DELETE' })
    await refreshAgencies()
    agencyDeleteTarget.value = null
  } catch (e: unknown) { modalError.value = e instanceof Error ? e.message : 'Erreur' }
  finally { modalLoading.value = false }
}

// ── Generic Logo Entity CRUD (Hoster / WebServer / DnsProvider) ─
interface LogoForm { name: string; simpleicons_slug: string }

function makeLogoCrud<T extends { id: string; name: string; simpleicons_slug: string | null }>(
  apiPath: string,
  data: Ref<T[] | null>,
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
    } catch (e: unknown) { modalError.value = e instanceof Error ? e.message : 'Erreur' }
    finally { modalLoading.value = false }
  }

  async function confirmEdit(): Promise<void> {
    if (!editTarget.value) return
    modalLoading.value = true; modalError.value = null
    try {
      await $fetch(`${apiPath}/${editTarget.value.id}`, { method: 'PATCH', body: { name: form.value.name.trim(), simpleicons_slug: form.value.simpleicons_slug.trim() || null } })
      await refresh(); editTarget.value = null
    } catch (e: unknown) { modalError.value = e instanceof Error ? e.message : 'Erreur' }
    finally { modalLoading.value = false }
  }

  async function confirmDelete(): Promise<void> {
    if (!deleteTarget.value) return
    modalLoading.value = true; modalError.value = null
    try {
      await $fetch(`${apiPath}/${deleteTarget.value.id}`, { method: 'DELETE' })
      await refresh(); deleteTarget.value = null
    } catch (e: unknown) { modalError.value = e instanceof Error ? e.message : 'Erreur' }
    finally { modalLoading.value = false }
  }

  return { addOpen, editTarget, deleteTarget, form, openAdd, openEdit, closeAdd, closeEdit, closeDelete, confirmAdd, confirmEdit, confirmDelete }
}

const hosterCrud    = makeLogoCrud<Hoster>('/api/hosters', hosters, refreshHosters)
const webServerCrud = makeLogoCrud<WebServer>('/api/web-servers', webServers, refreshWebServers)
const dnsCrud       = makeLogoCrud<DnsProvider>('/api/dns-providers', dnsProviders, refreshDns)

// ── Project Managers CRUD ─────────────────────────────────────
interface PmForm { first_name: string; last_name: string; agency: string }

const pmAddOpen      = ref(false)
const pmEditTarget   = ref<ProjectManager | null>(null)
const pmDeleteTarget = ref<ProjectManager | null>(null)
const pmForm         = ref<PmForm>({ first_name: '', last_name: '', agency: '' })

function openPmAdd(): void  { pmForm.value = { first_name: '', last_name: '', agency: '' }; pmAddOpen.value = true; resetModal() }
function openPmEdit(p: ProjectManager): void { pmForm.value = { first_name: p.first_name, last_name: p.last_name, agency: p.agency ?? '' }; pmEditTarget.value = p; resetModal() }
function closePmAdd():    void { pmAddOpen.value = false }
function closePmEdit():   void { pmEditTarget.value = null }
function closePmDelete(): void { pmDeleteTarget.value = null }

async function confirmPmAdd(): Promise<void> {
  modalLoading.value = true; modalError.value = null
  try {
    await $fetch('/api/project-managers', { method: 'POST', body: { first_name: pmForm.value.first_name.trim(), last_name: pmForm.value.last_name.trim(), agency: pmForm.value.agency.trim() || null } })
    await refreshPms(); pmAddOpen.value = false
  } catch (e: unknown) { modalError.value = e instanceof Error ? e.message : 'Erreur' }
  finally { modalLoading.value = false }
}

async function confirmPmEdit(): Promise<void> {
  if (!pmEditTarget.value) return
  modalLoading.value = true; modalError.value = null
  try {
    await $fetch(`/api/project-managers/${pmEditTarget.value.id}`, { method: 'PATCH', body: { first_name: pmForm.value.first_name.trim(), last_name: pmForm.value.last_name.trim(), agency: pmForm.value.agency.trim() || null } })
    await refreshPms(); pmEditTarget.value = null
  } catch (e: unknown) { modalError.value = e instanceof Error ? e.message : 'Erreur' }
  finally { modalLoading.value = false }
}

async function confirmPmDelete(): Promise<void> {
  if (!pmDeleteTarget.value) return
  modalLoading.value = true; modalError.value = null
  try {
    await $fetch(`/api/project-managers/${pmDeleteTarget.value.id}`, { method: 'DELETE' })
    await refreshPms(); pmDeleteTarget.value = null
  } catch (e: unknown) { modalError.value = e instanceof Error ? e.message : 'Erreur' }
  finally { modalLoading.value = false }
}

// ── Clients CRUD ──────────────────────────────────────────────
interface ClientForm { name: string; agency: string; contact_name: string; contact_email: string; notes: string }

const clientAddOpen      = ref(false)
const clientEditTarget   = ref<Client | null>(null)
const clientDeleteTarget = ref<Client | null>(null)
const clientForm         = ref<ClientForm>({ name: '', agency: '', contact_name: '', contact_email: '', notes: '' })

function openClientAdd(): void { clientForm.value = { name: '', agency: '', contact_name: '', contact_email: '', notes: '' }; clientAddOpen.value = true; resetModal() }
function openClientEdit(c: Client): void { clientForm.value = { name: c.name, agency: c.agency ?? '', contact_name: c.contact_name ?? '', contact_email: c.contact_email ?? '', notes: c.notes ?? '' }; clientEditTarget.value = c; resetModal() }
function closeClientAdd():    void { clientAddOpen.value = false }
function closeClientEdit():   void { clientEditTarget.value = null }
function closeClientDelete(): void { clientDeleteTarget.value = null }

async function confirmClientAdd(): Promise<void> {
  modalLoading.value = true; modalError.value = null
  try {
    await $fetch('/api/clients', { method: 'POST', body: { name: clientForm.value.name.trim(), agency: clientForm.value.agency.trim() || null, contact_name: clientForm.value.contact_name.trim() || null, contact_email: clientForm.value.contact_email.trim() || null, notes: clientForm.value.notes.trim() || null } })
    await refreshClients(); clientAddOpen.value = false
  } catch (e: unknown) { modalError.value = e instanceof Error ? e.message : 'Erreur' }
  finally { modalLoading.value = false }
}

async function confirmClientEdit(): Promise<void> {
  if (!clientEditTarget.value) return
  modalLoading.value = true; modalError.value = null
  try {
    await $fetch(`/api/clients/${clientEditTarget.value.id}`, { method: 'PATCH', body: { name: clientForm.value.name.trim(), agency: clientForm.value.agency.trim() || null, contact_name: clientForm.value.contact_name.trim() || null, contact_email: clientForm.value.contact_email.trim() || null, notes: clientForm.value.notes.trim() || null } })
    await refreshClients(); clientEditTarget.value = null
  } catch (e: unknown) { modalError.value = e instanceof Error ? e.message : 'Erreur' }
  finally { modalLoading.value = false }
}

async function confirmClientDelete(): Promise<void> {
  if (!clientDeleteTarget.value) return
  modalLoading.value = true; modalError.value = null
  try {
    await $fetch(`/api/clients/${clientDeleteTarget.value.id}`, { method: 'DELETE' })
    await refreshClients(); clientDeleteTarget.value = null
  } catch (e: unknown) { modalError.value = e instanceof Error ? e.message : 'Erreur' }
  finally { modalLoading.value = false }
}

// ── Helpers ───────────────────────────────────────────────────
function simpleIconUrl(slug: string): string {
  return `https://cdn.simpleicons.org/${slug}`
}
</script>

<template>
  <div class="admin-wrap">

    <header class="admin-header">
      <h1>Administration</h1>
      <div style="display:flex;align-items:center;gap:12px">
        <NuxtLink to="/" class="btn">← Annuaire</NuxtLink>
        <span class="user-email">{{ user?.email }}</span>
        <button class="btn" @click="logout">Déconnexion</button>
      </div>
    </header>

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

    <!-- ── Cheffes de projet ────────────────────────────────────── -->
    <div v-if="activeTab === 'project-managers'" class="admin-section">
      <div class="admin-section-header">
        <span class="admin-section-title">Cheffes de projet ({{ pms?.length ?? 0 }})</span>
        <button class="btn primary" @click="openPmAdd">+ Ajouter</button>
      </div>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>Prénom</th><th>Nom</th><th>Agence</th><th></th></tr></thead>
          <tbody>
            <tr v-if="!pms?.length">
              <td colspan="4" class="admin-empty">Aucune cheffe de projet.</td>
            </tr>
            <tr v-for="p in pms" :key="p.id">
              <td>{{ p.first_name }}</td>
              <td>{{ p.last_name }}</td>
              <td>{{ p.agency || '—' }}</td>
              <td>
                <div class="admin-row-actions">
                  <button class="icon-btn" title="Modifier" @click="openPmEdit(p)">&#9998;</button>
                  <button class="icon-btn del" title="Supprimer" @click="pmDeleteTarget = p; resetModal()">&#10005;</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- ── Clients ──────────────────────────────────────────────── -->
    <div v-if="activeTab === 'clients'" class="admin-section">
      <div class="admin-section-header">
        <span class="admin-section-title">Clients ({{ clients?.length ?? 0 }})</span>
        <button class="btn primary" @click="openClientAdd">+ Ajouter</button>
      </div>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead><tr><th>Nom</th><th>Agence</th><th>Contact</th><th></th></tr></thead>
          <tbody>
            <tr v-if="!clients?.length">
              <td colspan="4" class="admin-empty">Aucun client.</td>
            </tr>
            <tr v-for="c in clients" :key="c.id">
              <td>{{ c.name }}</td>
              <td>{{ c.agency || '—' }}</td>
              <td>{{ c.contact_name || '—' }}</td>
              <td>
                <div class="admin-row-actions">
                  <button class="icon-btn" title="Modifier" @click="openClientEdit(c)">&#9998;</button>
                  <button class="icon-btn del" title="Supprimer" @click="clientDeleteTarget = c; resetModal()">&#10005;</button>
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
        <div v-if="techAddOpen || techEditTarget" class="modal-overlay" @click.self="techAddOpen ? closeTechAdd() : closeTechEdit()">
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
        <div v-if="agencyAddOpen || agencyEditTarget" class="modal-overlay" @click.self="agencyAddOpen ? closeAgencyAdd() : closeAgencyEdit()">
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
        <div v-if="hosterCrud.addOpen.value || hosterCrud.editTarget.value" class="modal-overlay" @click.self="hosterCrud.addOpen.value ? hosterCrud.closeAdd() : hosterCrud.closeEdit()">
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
        <div v-if="webServerCrud.addOpen.value || webServerCrud.editTarget.value" class="modal-overlay" @click.self="webServerCrud.addOpen.value ? webServerCrud.closeAdd() : webServerCrud.closeEdit()">
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
        <div v-if="dnsCrud.addOpen.value || dnsCrud.editTarget.value" class="modal-overlay" @click.self="dnsCrud.addOpen.value ? dnsCrud.closeAdd() : dnsCrud.closeEdit()">
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

      <!-- Modale Add/Edit PM -->
      <Transition name="modal">
        <div v-if="pmAddOpen || pmEditTarget" class="modal-overlay" @click.self="pmAddOpen ? closePmAdd() : closePmEdit()">
          <div class="modal-card">
            <h3 class="modal-title">{{ pmAddOpen ? 'Ajouter une cheffe de projet' : 'Modifier la cheffe de projet' }}</h3>
            <p v-if="modalError" class="modal-error">{{ modalError }}</p>
            <form @submit.prevent="pmAddOpen ? confirmPmAdd() : confirmPmEdit()">
              <div class="field"><label>Prénom *</label><input v-model="pmForm.first_name" type="text" required></div>
              <div class="field"><label>Nom *</label><input v-model="pmForm.last_name" type="text" required></div>
              <div class="field">
                <label>Agence</label>
                <select v-model="pmForm.agency" class="field-input">
                  <option value="">— Aucune —</option>
                  <option v-for="a in agencies" :key="a.id" :value="a.name">{{ a.name }}</option>
                </select>
              </div>
              <div class="modal-btns">
                <button type="button" class="btn" :disabled="modalLoading" @click="pmAddOpen ? closePmAdd() : closePmEdit()">Annuler</button>
                <button type="submit" class="btn primary" :disabled="modalLoading">
                  <span v-if="modalLoading" class="spinner" />
                  {{ modalLoading ? 'Enregistrement…' : (pmAddOpen ? 'Créer' : 'Enregistrer') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
      <Transition name="modal">
        <AppConfirmModal v-if="pmDeleteTarget" title="Supprimer la cheffe de projet" :loading="modalLoading" confirm-label="Supprimer" @confirm="confirmPmDelete" @cancel="closePmDelete">
          <p class="modal-msg">Supprimer <strong>{{ pmDeleteTarget.first_name }} {{ pmDeleteTarget.last_name }}</strong> définitivement ?</p>
        </AppConfirmModal>
      </Transition>

      <!-- Modale Add/Edit Client -->
      <Transition name="modal">
        <div v-if="clientAddOpen || clientEditTarget" class="modal-overlay" @click.self="clientAddOpen ? closeClientAdd() : closeClientEdit()">
          <div class="modal-card">
            <h3 class="modal-title">{{ clientAddOpen ? 'Ajouter un client' : 'Modifier le client' }}</h3>
            <p v-if="modalError" class="modal-error">{{ modalError }}</p>
            <form @submit.prevent="clientAddOpen ? confirmClientAdd() : confirmClientEdit()">
              <div class="field"><label>Nom *</label><input v-model="clientForm.name" type="text" required></div>
              <div class="field">
                <label>Agence</label>
                <select v-model="clientForm.agency" class="field-input">
                  <option value="">— Aucune —</option>
                  <option v-for="a in agencies" :key="a.id" :value="a.name">{{ a.name }}</option>
                </select>
              </div>
              <div class="field"><label>Nom contact</label><input v-model="clientForm.contact_name" type="text"></div>
              <div class="field"><label>Email contact</label><input v-model="clientForm.contact_email" type="email"></div>
              <div class="field"><label>Notes</label><textarea v-model="clientForm.notes" class="field-input" rows="3" /></div>
              <div class="modal-btns">
                <button type="button" class="btn" :disabled="modalLoading" @click="clientAddOpen ? closeClientAdd() : closeClientEdit()">Annuler</button>
                <button type="submit" class="btn primary" :disabled="modalLoading">
                  <span v-if="modalLoading" class="spinner" />
                  {{ modalLoading ? 'Enregistrement…' : (clientAddOpen ? 'Créer' : 'Enregistrer') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
      <Transition name="modal">
        <AppConfirmModal v-if="clientDeleteTarget" title="Supprimer le client" :loading="modalLoading" confirm-label="Supprimer" @confirm="confirmClientDelete" @cancel="closeClientDelete">
          <p class="modal-msg">Supprimer <strong>{{ clientDeleteTarget.name }}</strong> définitivement ?</p>
        </AppConfirmModal>
      </Transition>

    </Teleport>
  </div>
</template>
