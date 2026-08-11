<script setup lang="ts">
import type { Client, Maintenance, Site, UserProfile, MaintenanceType } from '~/server/utils/types'
import '~/assets/css/clients.css'
import '~/assets/css/admin.css'
import '~/assets/css/maintenance.css'

definePageMeta({ middleware: 'auth' })

// Modales lourdes : code-splittées
const AppClientFormModal      = defineAsyncComponent(() => import('~/components/AppClientFormModal.vue'))
const AppClientSitesAddModal  = defineAsyncComponent(() => import('~/components/AppClientSitesAddModal.vue'))

const route  = useRoute()
const router = useRouter()
const clientId = computed((): string => String(route.params.id))

const refs = useReferenceData()
await Promise.all([
  refs.loadClients(),
  refs.loadMaintenances(),
  refs.loadSites(),
  refs.loadUserProfiles(),
  refs.loadMaintenanceTypes(),
  refs.loadAgencies(),
])

const clients          = refs.clients
const maintenances     = refs.maintenances
const sites            = refs.sites
const devUsers         = refs.devUsers
const pmUsers          = refs.pmUsers
const maintenanceTypes = refs.maintenanceTypes
const agencies         = refs.agencies

const clientPmName = computed((): string => {
  const id = client.value?.project_manager_id
  if (!id) return ''
  const pm = pmUsers.value.find((p: UserProfile): boolean => p.user_id === id)
  return pm ? `${pm.first_name} ${pm.last_name}`.trim() : ''
})

// CRUD client
const {
  editTarget   : clientEditTarget,
  deleteTarget : clientDeleteTarget,
  form         : clientForm,
  loading      : clientLoading,
  error        : clientError,
  openEdit     : openClientEdit,
  openDelete   : openClientDelete,
  closeEdit    : closeClientEdit,
  closeDelete  : closeClientDelete,
  confirmEdit  : confirmClientEdit,
  confirmDelete: confirmClientDelete,
} = useClientCrud()

async function handleDelete(): Promise<void> {
  const deleted = await confirmClientDelete()
  if (deleted) await router.push('/clients')
}

const client = computed((): Client | null =>
  clients.value.find((c: Client): boolean => c.id === clientId.value) ?? null,
)

// ── Lookup maps ──────────────────────────────────────────────
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

// ── Helpers ──────────────────────────────────────────────────
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
function formatDate(iso: string): string {
  if (!iso) return ''
  const p = iso.split('-')
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso
}
// ── Interventions du client ──────────────────────────────────
const clientMaintenances = computed((): Maintenance[] =>
  maintenances.value
    .filter((m: Maintenance): boolean => m.client_id === clientId.value)
    .sort((a: Maintenance, b: Maintenance): number => b.intervention_date.localeCompare(a.intervention_date)),
)

// ── Sites du client ──────────────────────────────────────────
const clientSites = computed((): Site[] =>
  sites.value
    .filter((s: Site): boolean => s.client_id === clientId.value)
    .sort((a: Site, b: Site): number => a.name.localeCompare(b.name, 'fr', { numeric: true })),
)

const availableSites = computed((): Site[] =>
  sites.value
    .filter((s: Site): boolean => s.client_id !== clientId.value)
    .sort((a: Site, b: Site): number => a.name.localeCompare(b.name, 'fr', { numeric: true })),
)

const clientByIdMap = computed((): Map<string, Client> => {
  const m = new Map<string, Client>()
  for (const c of clients.value) m.set(c.id, c)
  return m
})

function siteInterventionCount(siteId: string): number {
  let n = 0
  for (const m of clientMaintenances.value) {
    if (m.site_id === siteId) n++
  }
  return n
}

// ── Lien / délien de sites avec le client ───────────────────
const { add: toast }   = useToast()
const sitesPickerOpen  = ref(false)
const sitesPickerLoading = ref(false)
const sitesPickerError = ref<string | null>(null)
const removingSiteId   = ref<string | null>(null)

function openSitesPicker(): void {
  sitesPickerError.value   = null
  sitesPickerLoading.value = false
  sitesPickerOpen.value    = true
}
function closeSitesPicker(): void {
  if (sitesPickerLoading.value) return
  sitesPickerOpen.value = false
}

async function attachSites(ids: string[]): Promise<void> {
  sitesPickerLoading.value = true
  sitesPickerError.value   = null
  try {
    await Promise.all(ids.map((id: string) => $fetch(`/api/sites/${id}`, {
      method: 'PATCH',
      body  : { client_id: clientId.value },
    })))
    await refs.refreshSites()
    sitesPickerOpen.value = false
    toast(`${ids.length} site${ids.length > 1 ? 's' : ''} ajouté${ids.length > 1 ? 's' : ''}.`)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erreur lors de l\'ajout'
    sitesPickerError.value = msg
    toast(msg, 'error')
  } finally {
    sitesPickerLoading.value = false
  }
}

async function detachSite(siteId: string): Promise<void> {
  removingSiteId.value = siteId
  try {
    await $fetch(`/api/sites/${siteId}`, { method: 'PATCH', body: { client_id: null } })
    await refs.refreshSites()
    toast('Site dissocié.')
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erreur lors du retrait'
    toast(msg, 'error')
  } finally {
    removingSiteId.value = null
  }
}

/** Nombre de sites sous contrat de maintenance pour ce client. */
const maintenanceSitesCount = computed((): number =>
  clientSites.value.filter((s: Site): boolean => s.has_maintenance).length,
)

// ── Quota mois courant ───────────────────────────────────────
const currentMonth      = computed((): string => currentMonthPrefix())
const monthLabel        = computed((): string => currentMonthLabel())

const usedThisMonth = computed((): number => {
  let total = 0
  for (const m of clientMaintenances.value) {
    if (m.duration_minutes && m.intervention_date.startsWith(currentMonth.value)) {
      total += m.duration_minutes
    }
  }
  return total
})

const quotaPct = computed((): number => {
  const c = client.value
  if (!c?.monthly_quota_minutes) return 0
  return Math.round((usedThisMonth.value / c.monthly_quota_minutes) * 100)
})

const quotaClassName = computed((): string => quotaClass(quotaPct.value))

</script>

<template>
  <div class="app-wrap">

    <AppHeader title="Fiche client" />

    <div v-if="!client" class="empty-state">
      Client introuvable.
      <div style="margin-top: var(--sp-16)">
        <NuxtLink to="/clients" class="btn">← Retour à la liste</NuxtLink>
      </div>
    </div>

    <template v-else>
      <!-- Bouton retour -->
      <div class="client-back">
        <NuxtLink to="/clients" class="client-back-link">← Retour aux clients</NuxtLink>
      </div>

      <!-- Carte infos client -->
      <div class="client-detail-header">
        <div class="client-detail-header-left">
          <div class="client-detail-title-wrap">
            <h2 class="client-detail-title">{{ client.name }}</h2>
            <span v-if="maintenanceSitesCount" class="client-card-badge">
              {{ maintenanceSitesCount }} site{{ maintenanceSitesCount > 1 ? 's' : '' }} sous maintenance
            </span>
          </div>
          <div v-if="client.agency" class="client-detail-subtitle">{{ client.agency }}</div>
        </div>
        <div class="client-detail-actions">
          <button class="btn" @click="openClientEdit(client)">Modifier</button>
          <button class="btn btn-danger" @click="openClientDelete(client)">Supprimer</button>
        </div>
      </div>

      <div class="client-detail-grid">

        <!-- Infos -->
        <div class="client-detail-card">
          <h3 class="client-detail-card-title">Informations</h3>
          <dl class="client-info-list">
            <div class="client-info-row">
              <dt>Cheffe de projet</dt>
              <dd>{{ clientPmName || '—' }}</dd>
            </div>
            <div class="client-info-row">
              <dt>Contact</dt>
              <dd>{{ client.contact_name || '—' }}</dd>
            </div>
            <div class="client-info-row">
              <dt>Email</dt>
              <dd>
                <a v-if="client.contact_email" :href="`mailto:${client.contact_email}`" class="client-info-link">{{ client.contact_email }}</a>
                <span v-else>—</span>
              </dd>
            </div>
            <div class="client-info-row">
              <dt>Téléphone</dt>
              <dd>
                <a v-if="client.contact_phone" :href="`tel:${client.contact_phone.replace(/\s/g, '')}`" class="client-info-link">{{ client.contact_phone }}</a>
                <span v-else>—</span>
              </dd>
            </div>
            <div class="client-info-row">
              <dt>Sites sous maintenance</dt>
              <dd>{{ maintenanceSitesCount }} / {{ clientSites.length }}</dd>
            </div>
            <div class="client-info-row">
              <dt>Quota mensuel</dt>
              <dd>{{ client.monthly_quota_minutes != null ? formatDuration(client.monthly_quota_minutes) : '—' }}</dd>
            </div>
            <div class="client-info-row">
              <dt>Forfait mensuel</dt>
              <dd>{{ client.monthly_amount != null ? `${client.monthly_amount} €` : '—' }}</dd>
            </div>
            <div v-if="client.notes" class="client-info-row client-info-row--notes">
              <dt>Notes</dt>
              <dd>{{ client.notes }}</dd>
            </div>
          </dl>
        </div>

        <!-- Consommation du mois courant -->
        <div class="client-detail-card client-quota-block">
          <h3 class="client-detail-card-title">
            Consommation — {{ monthLabel }}
          </h3>
          <template v-if="client.monthly_quota_minutes">
            <div class="client-quota-header">
              <span class="client-quota-time">
                {{ formatDuration(usedThisMonth) }} / {{ formatDuration(client.monthly_quota_minutes) }}
              </span>
              <span class="client-quota-pct">{{ quotaPct }} %</span>
            </div>
            <div class="quota-bar-wrap">
              <div class="quota-bar-fill" :class="quotaClassName" :style="{ width: Math.min(quotaPct, 100) + '%' }" />
            </div>
          </template>
          <div v-else class="client-quota-no-quota">
            {{ formatDuration(usedThisMonth) }} consommé ce mois — aucun quota défini.
          </div>
        </div>

      </div>

      <!-- Sites du client -->
      <div class="client-detail-card">
        <div class="client-sites-header">
          <h3 class="client-detail-card-title" style="margin-bottom: 0">
            Sites
            <span class="client-detail-card-count">{{ clientSites.length }}</span>
          </h3>
          <button class="btn primary" @click="openSitesPicker">+ Site</button>
        </div>

        <div v-if="!clientSites.length" class="admin-empty">
          Aucun site associé à ce client.
        </div>

        <div v-else class="client-sites-list">
          <div v-for="s in clientSites" :key="s.id" class="client-site-row">
            <div class="client-site-info">
              <div class="client-site-name">{{ s.name }}</div>
              <div v-if="s.url" class="client-site-url">{{ s.url }}</div>
            </div>
            <div class="client-site-meta">
              <span v-if="s.has_maintenance" class="client-card-badge">Maintenance</span>
              <span v-if="s.agency" class="client-site-agency">{{ s.agency }}</span>
              <span class="client-site-count">{{ siteInterventionCount(s.id) }} intervention{{ siteInterventionCount(s.id) > 1 ? 's' : '' }}</span>
              <a v-if="safeHref(s.url)" :href="safeHref(s.url)" target="_blank" rel="noopener" class="icon-btn" title="Ouvrir le site">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
                     fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                  <polyline points="15 3 21 3 21 9"/>
                  <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </a>
              <button
                class="icon-btn del"
                title="Dissocier ce site du client"
                :disabled="removingSiteId === s.id"
                @click="detachSite(s.id)"
              >&#10005;</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Historique interventions -->
      <div class="client-detail-card">
        <h3 class="client-detail-card-title">
          Historique des interventions
          <span class="client-detail-card-count">{{ clientMaintenances.length }}</span>
        </h3>

        <div v-if="!clientMaintenances.length" class="admin-empty">
          Aucune intervention enregistrée pour ce client.
        </div>

        <div v-else class="admin-table-wrap" style="margin-top: var(--sp-12)">
          <table class="admin-table maintenance-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Site</th>
                <th>Développeur</th>
                <th>Durée</th>
                <th>Type(s)</th>
                <th>Incident</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in clientMaintenances" :key="m.id">
                <td class="maintenance-date">{{ formatDate(m.intervention_date) }}</td>
                <td>{{ siteName(m.site_id) }}</td>
                <td>{{ devName(m.developer_id) }}</td>
                <td class="maintenance-duration">{{ formatDuration(m.duration_minutes) }}</td>
                <td>
                  <div class="maintenance-type-pills">
                    <span
                      v-for="label in typeLabels(m)"
                      :key="label"
                      class="maintenance-type-pill"
                      :style="{ '--pill-hue': typePillHue(label) }"
                    >{{ label }}</span>
                  </div>
                </td>
                <td class="maintenance-incident-cell">
                  <span v-if="m.has_incident" class="maintenance-incident-dot">!</span>
                </td>
                <td class="maintenance-notes">{{ m.notes || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </template>

    <!-- Modale ajout de sites au client -->
    <Teleport to="body">
      <Transition name="modal">
        <AppClientSitesAddModal
          v-if="sitesPickerOpen && client"
          :client-name="client.name"
          :available-sites="availableSites"
          :client-by-id="clientByIdMap"
          :loading="sitesPickerLoading"
          :error="sitesPickerError"
          @close="closeSitesPicker"
          @submit="attachSites"
        />
      </Transition>
    </Teleport>

    <!-- Modale édition -->
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
          @confirm="handleDelete"
          @cancel="closeClientDelete"
        >
          <p class="modal-msg">
            Supprimer <strong>{{ clientDeleteTarget.name }}</strong> définitivement ?
            Cette action est irréversible.
          </p>
        </AppConfirmModal>
      </Transition>
    </Teleport>

  </div>
</template>
