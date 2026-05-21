<script setup lang="ts">
import type { Maintenance, Site, Developer, MaintenanceType, Client } from '~/server/utils/types'
import type { FilterOption } from '~/components/AppFilterSelect.vue'
import type { FilterDef } from '~/components/AppFilterBar.vue'

definePageMeta({ middleware: 'auth' })

// ── Data fetching via cache partagé ───────────────────────────
const refs = useReferenceData()
await Promise.all([
  refs.loadMaintenances(),
  refs.loadSites(),
  refs.loadDevelopers(),
  refs.loadMaintenanceTypes(),
  refs.loadClients(),
])

const maintenances        = refs.maintenances
const sites               = refs.sites
const developers          = refs.developers
const maintenanceTypes    = refs.maintenanceTypes
const clients             = refs.clients
const refreshMaintenances = refs.refreshMaintenances

// ── Lookup maps ───────────────────────────────────────────────
const siteById = computed((): Map<string, Site> => {
  const m = new Map<string, Site>()
  for (const s of sites.value) m.set(s.id, s)
  return m
})
const devById = computed((): Map<string, Developer> => {
  const m = new Map<string, Developer>()
  for (const d of developers.value) m.set(d.id, d)
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
// Pipeline : maintenances → searched (AppSearchBar) → afterFilters (AppFilterBar) → filtered (+ incident toggle)
const searched      = ref<Maintenance[]>([])
const afterFilters  = ref<Maintenance[]>([])
const onlyIncidents = ref(false)

const filterDefs = computed((): FilterDef<Maintenance>[] => {
  const present = new Set<string>()
  for (const m of maintenances.value) {
    const ag = siteById.value.get(m.site_id)?.agency
    if (ag) present.add(ag)
  }
  const agencyOpts: FilterOption[] = [...present].sort().map((a: string): FilterOption => ({
    id: a, label: a, disabled: false,
  }))
  const devOpts: FilterOption[] = developers.value.map((d: Developer): FilterOption => ({
    id: d.id, label: `${d.first_name} ${d.last_name}`, disabled: false,
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
  if (!onlyIncidents.value) return afterFilters.value
  return afterFilters.value.filter((m: Maintenance): boolean => m.has_incident)
})

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

/** Différencie "aucune intervention en base" de "filtre trop restrictif". */
const isFiltering = computed((): boolean =>
  maintenances.value.length > 0 && filtered.value.length === 0,
)
</script>

<template>
  <div class="maintenance-wrap">

    <AppHeader title="Maintenance" />

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
                  :options="developers.map((d: Developer) => ({ value: d.id, label: d.job_title ? `${d.first_name} ${d.last_name} — ${d.job_title}` : `${d.first_name} ${d.last_name}` }))"
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

<style src="~/assets/css/maintenance.css"></style>
<style src="~/assets/css/admin.css"></style>
