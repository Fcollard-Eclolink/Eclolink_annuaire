<script setup lang="ts">
import type { Client, Agency, MaintenanceType, UserProfile } from '~/server/utils/types'
import type { FilterOption } from '~/components/AppFilterSelect.vue'
import type { FilterDef } from '~/components/AppFilterBar.vue'

definePageMeta({ middleware: 'auth' })

// Modale lourde : code-splittée
const AppClientFormModal = defineAsyncComponent(() => import('~/components/AppClientFormModal.vue'))

const refs = useReferenceData()
await Promise.all([
  refs.loadClients(),
  refs.loadMaintenances(),
  refs.loadSites(),
  refs.loadAgencies(),
  refs.loadMaintenanceTypes(),
  refs.loadUserProfiles(),
])

const clients          = refs.clients
const maintenances     = refs.maintenances
const sites            = refs.sites
const agencies         = refs.agencies
const maintenanceTypes = refs.maintenanceTypes
const pmUsers          = refs.pmUsers

const pmById = computed((): Map<string, UserProfile> => {
  const m = new Map<string, UserProfile>()
  for (const pm of pmUsers.value) m.set(pm.user_id, pm)
  return m
})

function pmName(id: string | null): string {
  if (!id) return ''
  const pm = pmById.value.get(id)
  return pm ? `${pm.first_name} ${pm.last_name}`.trim() : ''
}

/** Pour chaque client, nombre de sites sous contrat de maintenance. */
const maintenanceSitesByClient = computed((): Map<string, number> => {
  const map = new Map<string, number>()
  for (const s of sites.value) {
    if (!s.client_id || !s.has_maintenance) continue
    map.set(s.client_id, (map.get(s.client_id) ?? 0) + 1)
  }
  return map
})

// ── CRUD ─────────────────────────────────────────────────────
const {
  addOpen      : clientAddOpen,
  editTarget   : clientEditTarget,
  deleteTarget : clientDeleteTarget,
  form         : clientForm,
  loading      : clientLoading,
  error        : clientError,
  openAdd      : openClientAdd,
  openEdit     : openClientEdit,
  openDelete   : openClientDelete,
  closeAdd     : closeClientAdd,
  closeEdit    : closeClientEdit,
  closeDelete  : closeClientDelete,
  confirmAdd   : confirmClientAdd,
  confirmEdit  : confirmClientEdit,
  confirmDelete: confirmClientDelete,
} = useClientCrud()

// ── Recherche → Filtres ──────────────────────────────────────
// Pipeline réactif : clients → searched (par AppSearchBar) → filtered (par AppFilterBar)
const searched = ref<Client[]>([])
const filtered = ref<Client[]>([])

function parseTypes(csv: string | null): string[] {
  if (!csv?.trim()) return []
  return csv.split(',').map((v: string) => v.trim()).filter(Boolean)
}

/** IDs des types d'intervention déjà rencontrés sur les interventions d'un client. */
const maintTypesByClient = computed((): Map<string, Set<string>> => {
  const map = new Map<string, Set<string>>()
  for (const m of maintenances.value) {
    if (!m.client_id) continue
    const ids = parseTypes(m.types)
    if (!ids.length) continue
    if (!map.has(m.client_id)) map.set(m.client_id, new Set())
    const set = map.get(m.client_id)!
    for (const id of ids) set.add(id)
  }
  return map
})

const filterDefs = computed((): FilterDef<Client>[] => {
  const maintOpts: FilterOption[] = maintenanceTypes.value.map((t: MaintenanceType): FilterOption => ({
    id: t.id, label: t.label, disabled: false,
  }))

  const presentAgencies = new Set<string>()
  for (const c of clients.value) if (c.agency) presentAgencies.add(c.agency)
  const agencyOpts: FilterOption[] = agencies.value
    .filter((a: Agency): boolean => presentAgencies.has(a.name))
    .map((a: Agency): FilterOption => ({ id: a.name, label: a.name, disabled: false }))

  const clientOpts: FilterOption[] = clients.value.map((c: Client): FilterOption => ({
    id: c.id, label: c.name, disabled: false,
  }))

  const presentPms = new Set<string>()
  for (const c of clients.value) if (c.project_manager_id) presentPms.add(c.project_manager_id)
  const pmOpts: FilterOption[] = pmUsers.value
    .filter((pm: UserProfile): boolean => presentPms.has(pm.user_id))
    .map((pm: UserProfile): FilterOption => ({ id: pm.user_id, label: `${pm.first_name} ${pm.last_name}`.trim(), disabled: false }))

  return [
    {
      key: 'maintTypes', label: 'Type de maintenance', options: maintOpts,
      match: (c: Client, selected: string[]): boolean => {
        const types = maintTypesByClient.value.get(c.id)
        if (!types) return false
        return selected.some((t: string): boolean => types.has(t))
      },
    },
    {
      key: 'pm', label: 'Cheffe', options: pmOpts,
      match: (c: Client, selected: string[]): boolean => selected.includes(c.project_manager_id ?? ''),
    },
    {
      key: 'agency', label: 'Agence', options: agencyOpts,
      match: (c: Client, selected: string[]): boolean => selected.includes(c.agency ?? ''),
    },
    {
      key: 'client', label: 'Clients', options: clientOpts,
      match: (c: Client, selected: string[]): boolean => selected.includes(c.id),
    },
  ]
})

// ── Consommation du mois courant ─────────────────────────────
const currentMonthUsed = computed((): Map<string, number> => {
  const prefix = currentMonthPrefix()
  const map    = new Map<string, number>()
  for (const m of maintenances.value) {
    if (!m.client_id || !m.duration_minutes) continue
    if (!m.intervention_date.startsWith(prefix)) continue
    map.set(m.client_id, (map.get(m.client_id) ?? 0) + m.duration_minutes)
  }
  return map
})

function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null || minutes <= 0) return '0 min'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} h`
  return `${h} h ${m} min`
}

function quotaPct(client: Client): number {
  if (!client.monthly_quota_minutes) return 0
  const used = currentMonthUsed.value.get(client.id) ?? 0
  return Math.round((used / client.monthly_quota_minutes) * 100)
}

function quotaClass(pct: number): string {
  if (pct >= 100) return 'quota-bar-over'
  if (pct >= 80)  return 'quota-bar-warn'
  return ''
}

function countMaintenancesThisMonth(clientId: string): number {
  const prefix = currentMonthPrefix()
  let n = 0
  for (const m of maintenances.value) {
    if (m.client_id === clientId && m.intervention_date.startsWith(prefix)) n++
  }
  return n
}

// Empêcher la navigation quand on clique sur les boutons d'action
function handleEdit(e: Event, c: Client): void {
  e.preventDefault()
  e.stopPropagation()
  openClientEdit(c)
}
function handleDelete(e: Event, c: Client): void {
  e.preventDefault()
  e.stopPropagation()
  openClientDelete(c)
}
</script>

<template>
  <div class="app-wrap">

    <AppHeader title="Clients" />

    <!-- Toolbar -->
    <div class="toolbar">
      <AppSearchBar
        v-model:results="searched"
        :items="clients"
        :fields="['name', 'agency', 'contact_name', 'contact_email']"
        placeholder="Rechercher"
      />
      <div class="toolbar-actions">
        <button class="btn primary" @click="openClientAdd">+ Client</button>
      </div>
    </div>

    <!-- Filtres -->
    <AppFilterBar
      v-model:results="filtered"
      :items="searched"
      :filters="filterDefs"
    />

    <!-- Grille des clients -->
    <div v-if="!filtered.length" class="empty-state">
      Aucun client ne correspond.
    </div>

    <div v-else class="clients-grid">
      <NuxtLink
        v-for="c in filtered"
        :key="c.id"
        :to="`/clients/${c.id}`"
        class="client-card"
      >
        <div class="client-card-top">
          <div class="client-card-header">
            <div class="client-card-name-wrap">
              <span class="client-card-name">{{ c.name }}</span>
              <span v-if="maintenanceSitesByClient.get(c.id)" class="client-card-badge">
                {{ maintenanceSitesByClient.get(c.id) }} site{{ (maintenanceSitesByClient.get(c.id) ?? 0) > 1 ? 's' : '' }} sous maintenance
              </span>
              <span v-if="pmName(c.project_manager_id)" class="client-card-pm" title="Cheffe de projet">
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24"
                     fill="none" stroke="currentColor" stroke-width="2"
                     stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                {{ pmName(c.project_manager_id) }}
              </span>
            </div>
            <span v-if="c.agency" class="client-card-agency">{{ c.agency }}</span>
          </div>

          <div class="client-card-actions">
            <button class="icon-btn" title="Modifier" @click="handleEdit($event, c)">&#9998;</button>
            <button class="icon-btn del" title="Supprimer" @click="handleDelete($event, c)">&#10005;</button>
          </div>
        </div>

        <div class="client-card-contact">
          <span v-if="c.contact_name">{{ c.contact_name }}</span>
          <span v-if="c.contact_email" class="client-card-email">{{ c.contact_email }}</span>
        </div>

        <div v-if="c.monthly_quota_minutes" class="client-card-quota">
          <div class="client-card-quota-header">
            <span class="client-card-quota-label">Quota ce mois</span>
            <span class="client-card-quota-time">
              {{ formatDuration(currentMonthUsed.get(c.id)) }} / {{ formatDuration(c.monthly_quota_minutes) }}
            </span>
          </div>
          <div class="quota-bar-wrap">
            <div
              class="quota-bar-fill"
              :class="quotaClass(quotaPct(c))"
              :style="{ width: Math.min(quotaPct(c), 100) + '%' }"
            />
          </div>
        </div>

        <div class="client-card-footer">
          <span class="client-card-meta">
            {{ countMaintenancesThisMonth(c.id) }} intervention{{ countMaintenancesThisMonth(c.id) > 1 ? 's' : '' }} ce mois
          </span>
          <span v-if="c.monthly_amount != null" class="client-card-amount">{{ c.monthly_amount }} €/mois</span>
        </div>
      </NuxtLink>
    </div>

    <!-- Modale Add/Edit -->
    <Teleport to="body">
      <Transition name="modal">
        <AppClientFormModal
          v-if="clientAddOpen"
          title="Ajouter un client"
          :form="clientForm"
          :error="clientError"
          :loading="clientLoading"
          :agencies="agencies"
          :project-managers="pmUsers"
          submit-label="Créer"
          submit-loading-label="Création…"
          @close="closeClientAdd"
          @submit="confirmClientAdd"
        />
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="modal">
        <AppClientFormModal
          v-if="clientEditTarget"
          title="Modifier le client"
          :form="clientForm"
          :error="clientError"
          :loading="clientLoading"
          :agencies="agencies"
          :project-managers="pmUsers"
          submit-label="Enregistrer"
          submit-loading-label="Enregistrement…"
          @close="closeClientEdit"
          @submit="confirmClientEdit"
        />
      </Transition>
    </Teleport>

    <!-- Modale suppression -->
    <Teleport to="body">
      <Transition name="modal">
        <AppConfirmModal
          v-if="clientDeleteTarget"
          title="Supprimer le client"
          :loading="clientLoading"
          confirm-label="Supprimer"
          @confirm="confirmClientDelete"
          @cancel="closeClientDelete"
        >
          <p class="modal-msg">
            Supprimer <strong>{{ clientDeleteTarget.name }}</strong> définitivement ?
          </p>
        </AppConfirmModal>
      </Transition>
    </Teleport>

  </div>
</template>

<style src="~/assets/css/clients.css"></style>
