<script setup lang="ts">
import type { Site, Group, ProjectManager } from '~/server/utils/types'
import type { FilterOption } from '~/components/AppFilterSelect.vue'
import { techTags } from '~/composables/useTechBadge'

interface ActiveFilterChip {
  category: 'group' | 'tech' | 'agency' | 'pm'
  value   : string
  label   : string
  catLabel: string
}

definePageMeta({ middleware: 'auth' })

// ── Modales lourdes : code-splitting (chunks séparés, chargés à l'ouverture) ──
const AppGroupFormModal = defineAsyncComponent(() => import('~/components/AppGroupFormModal.vue'))
const AppSiteFormModal  = defineAsyncComponent(() => import('~/components/AppSiteFormModal.vue'))

// ── Chargement initial via cache partagé useReferenceData ─────────
const refs = useReferenceData()
const loadError = ref<unknown>(null)
try {
  // dnsProviders : différé jusqu'à l'ouverture d'une modale site (non nécessaire au render initial)
  await Promise.all([
    refs.loadGroups(),
    refs.loadSites(),
    refs.loadProjectManagers(),
    refs.loadClients(),
    refs.loadTechnologies(),
    refs.loadHosters(),
    refs.loadWebServers(),
  ])
} catch (e: unknown) {
  loadError.value = e
}

const groups              = refs.groups
const sites               = refs.sites
const pms                 = refs.projectManagers
const clients             = refs.clients
const fetchedTechs        = refs.technologies
const fetchedHosters      = refs.hosters
const fetchedWebServers   = refs.webServers
const fetchedDnsProviders = refs.dnsProviders

const hasError  = computed(() => !!loadError.value)
const reloading = ref(false)

async function reloadAll(): Promise<void> {
  reloading.value = true
  await Promise.all([refs.refreshGroups(), refs.refreshSites(), refs.refreshProjectManagers()])
  reloading.value = false
}

// ── Lookup cheffes de projet ──────────────────────────────────────
const pmById = computed(() => {
  const map = new Map<string, ProjectManager>()
  for (const pm of pms.value) map.set(pm.id, pm)
  return map
})

// ── Groupage des sites ────────────────────────────────────────────
const sitesByGroup = computed(() => {
  const map = new Map<string, Site[]>()
  for (const s of sites.value) {
    const key = s.group_id ?? '__none__'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(s)
  }
  for (const list of map.values()) {
    list.sort((a: Site, b: Site): number => a.name.localeCompare(b.name, 'fr', { numeric: true }))
  }
  return map
})

// ── Recherche ─────────────────────────────────────────────────────
const { query, inputRef, isActive, results, serverLabel, focus, clear } =
  useSearch(sites, groups)

function onSearchKeydown(e: KeyboardEvent): void {
  if (e.key === 'Escape') clear()
}

function onGlobalKeydown(e: KeyboardEvent): void {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    focus()
  }
}

onMounted(()  => document.addEventListener('keydown', onGlobalKeydown))
onUnmounted(() => document.removeEventListener('keydown', onGlobalKeydown))

// ── Déplier / Replier tous ────────────────────────────────────────
const expandAllTick    = ref(0)
const collapseAllTick  = ref(0)
function expandAll():   void { expandAllTick.value++   }
function collapseAll(): void { collapseAllTick.value++ }

// ── Filtres (multi-sélection) ─────────────────────────────────────
const filterGroups   = ref<string[]>([])
const filterTechs    = ref<string[]>([])
const filterAgencies = ref<string[]>([])
const filterPms      = ref<string[]>([])

interface FilterOpts {
  groups  : string[]
  techs   : string[]
  agencies: string[]
  pms     : string[]
}

function matchesCombination(s: Site, opts: FilterOpts): boolean {
  if (opts.groups.length   && !opts.groups.includes(s.group_id ?? ''))                          return false
  if (opts.techs.length    && !opts.techs.some((t: string) => techTags(s).includes(t)))         return false
  if (opts.agencies.length && !opts.agencies.includes(s.agency ?? ''))                          return false
  if (opts.pms.length      && !opts.pms.includes(s.project_manager_id ?? ''))                   return false
  return true
}

const baseSitesForGroup   = computed((): Site[] =>
  sites.value.filter((s: Site) => matchesCombination(s, { groups: [], techs: filterTechs.value, agencies: filterAgencies.value, pms: filterPms.value })),
)
const baseSitesForTech    = computed((): Site[] =>
  sites.value.filter((s: Site) => matchesCombination(s, { groups: filterGroups.value, techs: [], agencies: filterAgencies.value, pms: filterPms.value })),
)
const baseSitesForAgency  = computed((): Site[] =>
  sites.value.filter((s: Site) => matchesCombination(s, { groups: filterGroups.value, techs: filterTechs.value, agencies: [], pms: filterPms.value })),
)
const baseSitesForPm      = computed((): Site[] =>
  sites.value.filter((s: Site) => matchesCombination(s, { groups: filterGroups.value, techs: filterTechs.value, agencies: filterAgencies.value, pms: [] })),
)

const filterGroupOptions = computed((): FilterOption[] =>
  groups.value.map((g: Group): FilterOption => ({
    id: g.id, label: g.name,
    disabled: !baseSitesForGroup.value.some((s: Site) => s.group_id === g.id),
  })),
)
const filterTechOptions = computed((): FilterOption[] => {
  const allTechs = new Set<string>()
  for (const s of sites.value) for (const t of techTags(s)) allTechs.add(t)
  return [...allTechs].sort().map((t: string): FilterOption => ({
    id: t, label: t,
    disabled: !baseSitesForTech.value.some((s: Site) => techTags(s).includes(t)),
  }))
})
const filterAgencyOptions = computed((): FilterOption[] => {
  const allAgencies = new Set<string>()
  for (const s of sites.value) if (s.agency) allAgencies.add(s.agency)
  return [...allAgencies].sort().map((a: string): FilterOption => ({
    id: a, label: a,
    disabled: !baseSitesForAgency.value.some((s: Site) => s.agency === a),
  }))
})
const filterPmOptions = computed((): FilterOption[] =>
  pms.value.map((pm: ProjectManager): FilterOption => ({
    id: pm.id, label: `${pm.first_name} ${pm.last_name}`,
    disabled: !baseSitesForPm.value.some((s: Site) => s.project_manager_id === pm.id),
  })),
)

const filteredSitesByGroup = computed((): Map<string, Site[]> => {
  const result = new Map<string, Site[]>()
  for (const [groupId, list] of sitesByGroup.value) {
    result.set(groupId, list.filter((s: Site) => matchesCombination(s, {
      groups: filterGroups.value, techs: filterTechs.value,
      agencies: filterAgencies.value, pms: filterPms.value,
    })))
  }
  return result
})
const filteredGroups = computed((): Group[] =>
  groups.value.filter((g: Group): boolean => {
    if (filterGroups.value.length && !filterGroups.value.includes(g.id)) return false
    if (filterTechs.value.length || filterAgencies.value.length || filterPms.value.length) {
      return (filteredSitesByGroup.value.get(g.id) ?? []).length > 0
    }
    return true
  }),
)
const filteredUngrouped = computed((): Site[] => {
  if (filterGroups.value.length) return []
  return (sitesByGroup.value.get('__none__') ?? []).filter((s: Site) => matchesCombination(s, {
    groups: [], techs: filterTechs.value, agencies: filterAgencies.value, pms: filterPms.value,
  }))
})

// ── Filtres actifs (chips) ────────────────────────────────────────
const activeFilterChips = computed((): ActiveFilterChip[] => {
  const chips: ActiveFilterChip[] = []
  for (const id of filterGroups.value) {
    const g = groups.value.find((g: Group) => g.id === id)
    if (g) chips.push({ category: 'group', value: id, label: g.name, catLabel: 'Serveur' })
  }
  for (const t of filterTechs.value)
    chips.push({ category: 'tech', value: t, label: t, catLabel: 'Techno' })
  for (const a of filterAgencies.value)
    chips.push({ category: 'agency', value: a, label: a, catLabel: 'Agence' })
  for (const id of filterPms.value) {
    const pm = pms.value.find((p: ProjectManager) => p.id === id)
    if (pm) chips.push({ category: 'pm', value: id, label: `${pm.first_name} ${pm.last_name}`, catLabel: 'Cheffe' })
  }
  return chips
})

function removeFilterChip(chip: ActiveFilterChip): void {
  switch (chip.category) {
    case 'group':  filterGroups.value   = filterGroups.value.filter((v: string) => v !== chip.value);   break
    case 'tech':   filterTechs.value    = filterTechs.value.filter((v: string) => v !== chip.value);    break
    case 'agency': filterAgencies.value = filterAgencies.value.filter((v: string) => v !== chip.value); break
    case 'pm':     filterPms.value      = filterPms.value.filter((v: string) => v !== chip.value);      break
  }
}

function clearAllFilters(): void {
  filterGroups.value = []; filterTechs.value = []
  filterAgencies.value = []; filterPms.value = []
}

// ── CRUD serveurs ─────────────────────────────────────────────────
const {
  deleteTarget: deleteGroup, deleteLoading: deleteGroupLoading, deleteError: deleteGroupError,
  openDeleteConfirm: openDeleteGroup, closeDeleteConfirm: closeDeleteGroup, confirmDelete: confirmDeleteGroup,
  editTarget: editGroup, editForm: editGroupForm, editLoading: editGroupLoading, editError: editGroupError,
  openEditModal: openEditGroupRaw, closeEditModal: closeEditGroup, saveEdit: saveGroupEdit,
  isAddOpen: isAddGroupOpen, addForm: addGroupForm, addLoading: addGroupLoading, addError: addGroupError,
  openAddModal: openAddGroupRaw, closeAddModal: closeAddGroup, confirmAdd: confirmAddGroup,
} = useGroupCrud(groups, sites)

// ── CRUD sites ────────────────────────────────────────────────────
const {
  deleteTarget: deleteSite, deleteLoading: deleteSiteLoading, deleteError: deleteSiteError,
  openDeleteConfirm: openDeleteSite, closeDeleteConfirm: closeDeleteSite, confirmDelete: confirmDeleteSite,
  editTarget: editSite, editForm: editSiteForm, editLoading: editSiteLoading, editError: editSiteError,
  openEditModal: openEditSiteRaw, closeEditModal: closeEditSite, saveEdit: saveSiteEdit,
  isAddOpen: isAddSiteOpen, addForm: addSiteForm, addLoading: addSiteLoading, addError: addSiteError,
  openAddModal: openAddSiteRaw, closeAddModal: closeAddSite, confirmAdd: confirmAddSite,
} = useSiteCrud(sites)

// ── Wrappers : load dnsProviders à la 1re ouverture d'une modale site ─
function openAddGroup(): void { openAddGroupRaw() }
function openEditGroup(g: Parameters<typeof openEditGroupRaw>[0]): void { openEditGroupRaw(g) }

function openAddSite(): void { void refs.loadDnsProviders(); openAddSiteRaw() }
function openEditSite(s: Parameters<typeof openEditSiteRaw>[0]): void { void refs.loadDnsProviders(); openEditSiteRaw(s) }
</script>

<template>
  <div class="app-wrap">

    <AppHeader title="Annuaire des serveurs" />

    <!-- ── Toolbar ──────────────────────────────────────────────── -->
    <div class="toolbar">
      <div class="search-bar-wrap">
        <svg class="search-bar-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14"
             viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          ref="inputRef"
          v-model="query"
          type="text"
          placeholder="Rechercher un site, URL, serveur... (Ctrl+K)"
          autocomplete="off"
          @keydown="onSearchKeydown"
        >
        <button v-if="isActive" class="search-bar-clear" title="Effacer" @click="clear">&#10005;</button>
        <kbd v-else class="search-kbd">Ctrl K</kbd>
      </div>
      <div class="toolbar-actions">
        <button class="btn icon-only" :disabled="reloading" title="Recharger les données" @click="reloadAll">
          <svg :class="{ spinning: reloading }" xmlns="http://www.w3.org/2000/svg" width="14" height="14"
               viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
            <path d="M21 3v5h-5"/>
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
            <path d="M8 16H3v5"/>
          </svg>
        </button>
        <button class="btn" @click="openAddGroup">+ Serveur</button>
        <button class="btn primary" @click="openAddSite">+ Site</button>
      </div>
    </div>

    <div v-if="hasError" class="load-error">
      Impossible de charger les données.
    </div>

    <template v-else>

      <!-- ── Filtres + expand/collapse ─────────────────────────── -->
      <div v-if="!isActive" class="filters-row">
        <div class="filters-left">
          <AppFilterSelect v-model="filterGroups"   label="Serveur"     :options="filterGroupOptions" />
          <AppFilterSelect v-model="filterTechs"    label="Technologie" :options="filterTechOptions" />
          <AppFilterSelect v-model="filterAgencies" label="Agence"      :options="filterAgencyOptions" />
          <AppFilterSelect v-model="filterPms"      label="Cheffe"      :options="filterPmOptions" />
        </div>
        <div class="filters-right">
          <button class="btn" title="Déplier tous les serveurs" @click="expandAll">Déplier</button>
          <button class="btn" title="Replier tous les serveurs" @click="collapseAll">Replier</button>
        </div>
      </div>

      <!-- ── Filtres actifs ────────────────────────────────────── -->
      <div v-if="!isActive && activeFilterChips.length" class="active-filters">
        <button
          v-for="chip in activeFilterChips"
          :key="`${chip.category}:${chip.value}`"
          class="active-filter-chip"
          :title="`Retirer : ${chip.catLabel} · ${chip.label}`"
          @click="removeFilterChip(chip)"
        >
          {{ chip.label }}
          <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2.5"
               stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <button class="active-filters-clear" @click="clearAllFilters">Tout effacer</button>
      </div>

      <!-- ── Résultats de recherche ──────────────────────────────── -->
      <div v-if="isActive" class="search-results">
        <p v-if="!results.length" class="search-results-empty">Aucun site ne correspond à « {{ query.trim() }} ».</p>
        <AppSiteRow
          v-for="site in results"
          :key="site.id"
          :site="site"
          :pm-by-id="pmById"
          :highlight-query="query"
          :server-label="serverLabel(site)"
          @edit="openEditSite"
          @delete="openDeleteSite"
        />
      </div>

      <!-- ── Vue normale : blocs serveurs ───────────────────────── -->
      <template v-else>
        <div class="servers-list">
          <AppServerBlock
            v-for="group in filteredGroups"
            :key="group.id"
            :group="group"
            :sites="filteredSitesByGroup.get(group.id) ?? []"
            :pm-by-id="pmById"
            :hosters="fetchedHosters"
            :web-servers="fetchedWebServers"
            :expand-all-tick="expandAllTick"
            :collapse-all-tick="collapseAllTick"
            @edit-group="openEditGroup"
            @delete-group="openDeleteGroup"
            @edit-site="openEditSite"
            @delete-site="openDeleteSite"
          />

          <AppServerBlock
            v-if="filteredUngrouped.length"
            :group="{ id: '__none__', name: 'Sans serveur', hoster: null, ip_public: null, ip_local: null, web_server: null }"
            :sites="filteredUngrouped"
            :pm-by-id="pmById"
            :hosters="fetchedHosters"
            :web-servers="fetchedWebServers"
            :name-is-muted="true"
            :expand-all-tick="expandAllTick"
            :collapse-all-tick="collapseAllTick"
            @edit-site="openEditSite"
            @delete-site="openDeleteSite"
          />

          <div v-if="!filteredGroups.length && !filteredUngrouped.length" class="empty-state">
            Aucun site enregistré.
          </div>
        </div>
      </template>
    </template>

    <!-- ── Confirmations suppression (légères, inline) ──────────── -->
    <Teleport to="body">
      <Transition name="modal">
        <AppConfirmModal
          v-if="deleteGroup"
          title="Supprimer le serveur"
          :loading="deleteGroupLoading"
          :error="deleteGroupError"
          @confirm="confirmDeleteGroup"
          @cancel="closeDeleteGroup"
        >
          <p class="modal-msg">
            Supprimer <strong>{{ deleteGroup.name }}</strong> ?
            Les sites associés seront détachés mais pas supprimés.
          </p>
        </AppConfirmModal>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="modal">
        <AppConfirmModal
          v-if="deleteSite"
          title="Supprimer le site"
          :loading="deleteSiteLoading"
          :error="deleteSiteError"
          @confirm="confirmDeleteSite"
          @cancel="closeDeleteSite"
        >
          <p class="modal-msg">
            Supprimer <strong>{{ deleteSite.name }}</strong> définitivement ?
          </p>
        </AppConfirmModal>
      </Transition>
    </Teleport>

    <!-- ── Modales lourdes : code-splittées via defineAsyncComponent ── -->
    <Teleport to="body">
      <Transition name="modal">
        <AppGroupFormModal
          v-if="editGroup"
          title="Modifier le serveur"
          :form="editGroupForm"
          :error="editGroupError"
          :loading="editGroupLoading"
          :hosters="fetchedHosters"
          :web-servers="fetchedWebServers"
          submit-label="Enregistrer"
          submit-loading-label="Enregistrement…"
          @close="closeEditGroup"
          @submit="saveGroupEdit"
        />
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="modal">
        <AppGroupFormModal
          v-if="isAddGroupOpen"
          title="Ajouter un serveur"
          :form="addGroupForm"
          :error="addGroupError"
          :loading="addGroupLoading"
          :hosters="fetchedHosters"
          :web-servers="fetchedWebServers"
          submit-label="Créer"
          submit-loading-label="Création…"
          @close="closeAddGroup"
          @submit="confirmAddGroup"
        />
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="modal">
        <AppSiteFormModal
          v-if="isAddSiteOpen"
          title="Ajouter un site"
          :form="addSiteForm"
          :error="addSiteError"
          :loading="addSiteLoading"
          :groups="groups"
          :project-managers="pms"
          :clients="clients"
          :technologies="fetchedTechs"
          :hosters="fetchedHosters"
          :dns-providers="fetchedDnsProviders"
          submit-label="Créer"
          submit-loading-label="Création…"
          @close="closeAddSite"
          @submit="confirmAddSite"
        />
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="modal">
        <AppSiteFormModal
          v-if="editSite"
          title="Modifier le site"
          :form="editSiteForm"
          :error="editSiteError"
          :loading="editSiteLoading"
          :groups="groups"
          :project-managers="pms"
          :clients="clients"
          :technologies="fetchedTechs"
          :hosters="fetchedHosters"
          :dns-providers="fetchedDnsProviders"
          submit-label="Enregistrer"
          submit-loading-label="Enregistrement…"
          @close="closeEditSite"
          @submit="saveSiteEdit"
        />
      </Transition>
    </Teleport>

  </div>
</template>
