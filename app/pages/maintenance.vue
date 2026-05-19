<script setup lang="ts">
import type { Maintenance, Site, Developer, MaintenanceType, Client } from '~/server/utils/types'
import type { FilterOption } from '~/components/AppFilterSelect.vue'

definePageMeta({ middleware: 'auth' })


// ── Data fetching ─────────────────────────────────────────────
const { data: maintenances,     refresh: refreshMaintenances } = await useFetch<Maintenance[]>('/api/maintenances')
const { data: sites }                                          = await useFetch<Site[]>('/api/sites')
const { data: developers }                                     = await useFetch<Developer[]>('/api/developers')
const { data: maintenanceTypes }                               = await useFetch<MaintenanceType[]>('/api/maintenance-types')
const { data: clients }                                        = await useFetch<Client[]>('/api/clients')

// ── Lookup maps ───────────────────────────────────────────────
const siteById = computed((): Map<string, Site> => {
  const m = new Map<string, Site>()
  for (const s of sites.value ?? []) m.set(s.id, s)
  return m
})
const devById = computed((): Map<string, Developer> => {
  const m = new Map<string, Developer>()
  for (const d of developers.value ?? []) m.set(d.id, d)
  return m
})
const typeById = computed((): Map<string, MaintenanceType> => {
  const m = new Map<string, MaintenanceType>()
  for (const t of maintenanceTypes.value ?? []) m.set(t.id, t)
  return m
})
const clientById = computed((): Map<string, Client> => {
  const m = new Map<string, Client>()
  for (const c of clients.value ?? []) m.set(c.id, c)
  return m
})

// ── Helpers ───────────────────────────────────────────────────
function parseTypes(csv: string | null): string[] {
  if (!csv?.trim()) return []
  return csv.split(',').map(v => v.trim()).filter(Boolean)
}
function typeLabels(m: Maintenance): string[] {
  return parseTypes(m.types).map(id => typeById.value.get(id)?.label ?? id)
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

// ── Quota mensuel par client ──────────────────────────────────
interface ClientQuota {
  client  : Client
  used    : number  // minutes consommées ce mois-ci
  quota   : number  // quota en minutes (0 = illimité)
  pct     : number  // pourcentage (0-100+)
}

const currentMonthQuotas = computed((): ClientQuota[] => {
  const now   = new Date()
  const year  = now.getFullYear()
  const month = now.getMonth() + 1
  const prefix = `${year}-${String(month).padStart(2, '0')}`

  // Somme des minutes par client pour le mois courant
  const usedByClient = new Map<string, number>()
  for (const m of maintenances.value ?? []) {
    if (!m.client_id || !m.duration_minutes) continue
    if (!m.intervention_date.startsWith(prefix)) continue
    usedByClient.set(m.client_id, (usedByClient.get(m.client_id) ?? 0) + m.duration_minutes)
  }

  // Ne lister que les clients avec quota défini OU avec du temps consommé ce mois-ci
  return (clients.value ?? [])
    .filter(c => c.monthly_quota_minutes != null || (usedByClient.get(c.id) ?? 0) > 0)
    .map(c => {
      const used  = usedByClient.get(c.id) ?? 0
      const quota = c.monthly_quota_minutes ?? 0
      const pct   = quota > 0 ? Math.round((used / quota) * 100) : 0
      return { client: c, used, quota, pct }
    })
    .sort((a, b) => a.client.name.localeCompare(b.client.name))
})

// ── Filtres ───────────────────────────────────────────────────
const query           = ref('')
const filterSites     = ref<string[]>([])
const filterDevs      = ref<string[]>([])
const filterTypes     = ref<string[]>([])
const filterClients   = ref<string[]>([])
const onlyIncidents   = ref(false)

const siteOptions = computed((): FilterOption[] =>
  (sites.value ?? []).map(s => ({ id: s.id, label: s.name, disabled: false })),
)
const devOptions = computed((): FilterOption[] =>
  (developers.value ?? []).map(d => ({ id: d.id, label: `${d.first_name} ${d.last_name}`, disabled: false })),
)
const typeOptions = computed((): FilterOption[] =>
  (maintenanceTypes.value ?? []).map(t => ({ id: t.id, label: t.label, disabled: false })),
)
const clientOptions = computed((): FilterOption[] =>
  (clients.value ?? []).map(c => ({ id: c.id, label: c.name, disabled: false })),
)

const filtered = computed((): Maintenance[] => {
  const q = query.value.trim().toLowerCase()
  return (maintenances.value ?? []).filter(m => {
    if (filterSites.value.length && !filterSites.value.includes(m.site_id)) return false
    if (filterDevs.value.length && (!m.developer_id || !filterDevs.value.includes(m.developer_id))) return false
    if (filterClients.value.length && (!m.client_id || !filterClients.value.includes(m.client_id))) return false
    if (filterTypes.value.length) {
      const ids = parseTypes(m.types)
      if (!filterTypes.value.some(f => ids.includes(f))) return false
    }
    if (onlyIncidents.value && !m.has_incident) return false
    if (q) {
      const hay = [siteName(m.site_id), devName(m.developer_id), clientName(m.client_id), m.notes ?? '', ...typeLabels(m)]
        .join(' ').toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
})

function clearAllFilters(): void {
  filterSites.value   = []
  filterDevs.value    = []
  filterTypes.value   = []
  filterClients.value = []
  onlyIncidents.value = false
  query.value         = ''
}

// ── CRUD ──────────────────────────────────────────────────────
interface MaintenanceForm {
  site_id          : string
  client_id        : string
  developer_id     : string
  intervention_date: string
  has_incident     : boolean
  types            : string
  notes            : string
  duration_minutes : number | string
}

function emptyForm(): MaintenanceForm {
  const today = new Date().toISOString().slice(0, 10)
  return { site_id: '', client_id: '', developer_id: '', intervention_date: today, has_incident: false, types: '', notes: '', duration_minutes: '' }
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

function openAdd(): void {
  form.value = emptyForm()
  addOpen.value = true
  resetModal()
}
function openEdit(m: Maintenance): void {
  form.value = {
    site_id          : m.site_id,
    client_id        : m.client_id ?? '',
    developer_id     : m.developer_id ?? '',
    intervention_date: m.intervention_date,
    has_incident     : m.has_incident,
    types            : m.types ?? '',
    notes            : m.notes ?? '',
    duration_minutes : m.duration_minutes != null ? String(m.duration_minutes) : '',
  }
  editTarget.value = m
  resetModal()
}
function closeAdd():    void { addOpen.value = false }
function closeEdit():   void { editTarget.value = null }
function closeDelete(): void { deleteTarget.value = null }

function bodyFromForm(): Record<string, unknown> {
  const dur = typeof form.value.duration_minutes === 'number'
    ? form.value.duration_minutes
    : parseInt(String(form.value.duration_minutes), 10)
  return {
    site_id          : form.value.site_id,
    client_id        : form.value.client_id || null,
    developer_id     : form.value.developer_id || null,
    intervention_date: form.value.intervention_date,
    has_incident     : form.value.has_incident,
    types            : form.value.types.trim() || null,
    notes            : form.value.notes.trim() || null,
    duration_minutes : !isNaN(dur) && dur > 0 ? dur : null,
  }
}

async function confirmAdd(): Promise<void> {
  modalLoading.value = true; modalError.value = null
  try {
    await $fetch('/api/maintenances', { method: 'POST', body: bodyFromForm() })
    await refreshMaintenances()
    addOpen.value = false
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

const hasActiveFilters = computed(() =>
  query.value.trim() !== '' || filterSites.value.length > 0 || filterDevs.value.length > 0
  || filterTypes.value.length > 0 || filterClients.value.length > 0 || onlyIncidents.value,
)
</script>

<template>
  <div class="maintenance-wrap">

    <AppHeader title="Maintenance" />

    <!-- Toolbar -->
    <div class="toolbar">
      <div class="search-bar-wrap">
        <svg class="search-bar-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14"
             viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input v-model="query" type="text" placeholder="Rechercher (site, dev, type, notes)..." autocomplete="off">
        <button v-if="query" class="search-bar-clear" title="Effacer" @click="query = ''">&#10005;</button>
      </div>
      <div class="toolbar-actions">
        <button class="btn primary" @click="openAdd">+ Intervention</button>
      </div>
    </div>

    <!-- Filtres -->
    <div class="maintenance-filters">
      <AppFilterSelect v-model="filterSites"   label="Sites"        :options="siteOptions" />
      <AppFilterSelect v-model="filterDevs"    label="Développeurs" :options="devOptions" />
      <AppFilterSelect v-model="filterClients" label="Clients"      :options="clientOptions" />
      <AppFilterSelect v-model="filterTypes"   label="Types"        :options="typeOptions" />
      <label class="maintenance-incident-toggle">
        <input v-model="onlyIncidents" type="checkbox">
        <span>Avec incident</span>
      </label>
      <button v-if="hasActiveFilters" class="btn ghost" @click="clearAllFilters">Réinitialiser</button>
    </div>

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
              {{ hasActiveFilters ? 'Aucune intervention ne correspond aux filtres.' : 'Aucune intervention enregistrée.' }}
            </td>
          </tr>
          <tr v-for="m in filtered" :key="m.id">
            <td class="maintenance-date">{{ formatDate(m.intervention_date) }}</td>
            <td>{{ siteName(m.site_id) }}</td>
            <td>{{ clientName(m.client_id) }}</td>
            <td>{{ devName(m.developer_id) }}</td>
            <td class="maintenance-duration">{{ formatDuration(m.duration_minutes) }}</td>
            <td>
              <div class="maintenance-type-pills">
                <span v-for="lbl in typeLabels(m)" :key="lbl" class="maintenance-type-pill">{{ lbl }}</span>
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
                  v-if="siteById.get(m.site_id)?.bo_url"
                  :href="siteById.get(m.site_id)?.bo_url ?? '#'"
                  target="_blank"
                  rel="noopener"
                  class="icon-btn"
                  title="Ouvrir le back-office"
                  @click.stop
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
                       fill="none" stroke="currentColor" stroke-width="2"
                       stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                    <circle cx="12" cy="12" r="3"/>
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

    <!-- ════════════════════════════════════════════════════════════ -->
    <!-- MODALES                                                     -->
    <!-- ════════════════════════════════════════════════════════════ -->
    <Teleport to="body">

      <!-- Add / Edit -->
      <Transition name="modal">
        <div v-if="addOpen || editTarget" class="modal-overlay" @click.self="addOpen ? closeAdd() : closeEdit()">
          <div class="modal-card">
            <h3 class="modal-title">{{ addOpen ? 'Ajouter une intervention' : 'Modifier l\'intervention' }}</h3>
            <p v-if="modalError" class="modal-error">{{ modalError }}</p>
            <form @submit.prevent="addOpen ? confirmAdd() : confirmEdit()">
              <div class="field">
                <label>Site *</label>
                <AppSelect
                  v-model="form.site_id"
                  :options="(sites ?? []).map(s => ({ value: s.id, label: s.name }))"
                  placeholder="— Sélectionner —"
                  searchable
                />
              </div>
              <div class="field">
                <label>Client</label>
                <AppSelect
                  v-model="form.client_id"
                  :options="(clients ?? []).map(c => ({ value: c.id, label: c.name }))"
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
                  :options="(developers ?? []).map(d => ({ value: d.id, label: d.job_title ? `${d.first_name} ${d.last_name} — ${d.job_title}` : `${d.first_name} ${d.last_name}` }))"
                  placeholder="— Aucun —"
                />
              </div>
              <div class="field">
                <label>Type(s) d'intervention</label>
                <AppMultiSelect
                  v-model="form.types"
                  :options="(maintenanceTypes ?? []).map(t => ({ id: t.id, label: t.label }))"
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
