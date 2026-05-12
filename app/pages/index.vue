<script setup lang="ts">
import type { Group, Site, ProjectManager, Client, Technology, Hoster, WebServer, DnsProvider } from '~/server/utils/types'
import type { SiteEditForm } from '~/composables/useSiteCrud'
import type { FilterOption } from '~/components/AppFilterSelect.vue'
import { techTags } from '~/composables/useTechBadge'

interface ActiveFilterChip {
  category: 'group' | 'tech' | 'agency' | 'pm'
  value   : string
  label   : string
  catLabel: string
}

definePageMeta({ middleware: 'auth' })

const { user, logout } = useAuth()
const { isDark, init: initDark, toggle: toggleDark } = useDarkMode()
onMounted(initDark)

// ── Chargement ────────────────────────────────────────────────────
const [
  { data: groups,       error: errGroups,  refresh: refreshGroups  },
  { data: sites,        error: errSites,   refresh: refreshSites   },
  { data: pms,          error: errPms,     refresh: refreshPms     },
  { data: clients },
  { data: fetchedTechs },
  { data: fetchedHosters },
  { data: fetchedWebServers },
  { data: fetchedDnsProviders },
] = await Promise.all([
  useFetch<Group[]>('/api/groups'),
  useFetch<Site[]>('/api/sites'),
  useFetch<ProjectManager[]>('/api/project-managers'),
  useFetch<Client[]>('/api/clients'),
  useFetch<Technology[]>('/api/technologies'),
  useFetch<Hoster[]>('/api/hosters'),
  useFetch<WebServer[]>('/api/web-servers'),
  useFetch<DnsProvider[]>('/api/dns-providers'),
])

// Populate shared state for useTechBadge
const refTechs = useState<Technology[]>('ref:techs', () => [])
watchEffect(() => { if (fetchedTechs.value) refTechs.value = fetchedTechs.value })

const hasError     = computed(() => errGroups.value || errSites.value || errPms.value)
const reloading    = ref(false)

async function reloadAll(): Promise<void> {
  reloading.value = true
  await Promise.all([refreshGroups(), refreshSites(), refreshPms()])
  reloading.value = false
}

// ── Lookup cheffes de projet ──────────────────────────────────────
const pmById = computed(() => {
  const map = new Map<string, ProjectManager>()
  for (const pm of pms.value ?? []) map.set(pm.id, pm)
  return map
})

// ── Groupage des sites ────────────────────────────────────────────
const sitesByGroup = computed(() => {
  const map = new Map<string, Site[]>()
  if (!sites.value) return map
  for (const s of sites.value) {
    const key = s.group_id ?? '__none__'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(s)
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name, 'fr', { numeric: true }))
  }
  return map
})

const ungrouped = computed(() => sitesByGroup.value.get('__none__') ?? [])

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

/** Retourne true si le site satisfait toutes les catégories données (AND inter-cat, OR intra-cat). */
function matchesCombination(s: Site, opts: {
  groups   : string[]
  techs    : string[]
  agencies : string[]
  pms      : string[]
}): boolean {
  if (opts.groups.length   && !opts.groups.includes(s.group_id ?? ''))                 return false
  if (opts.techs.length    && !opts.techs.some(t => techTags(s).includes(t)))          return false
  if (opts.agencies.length && !opts.agencies.includes(s.agency ?? ''))                 return false
  if (opts.pms.length      && !opts.pms.includes(s.project_manager_id ?? ''))          return false
  return true
}

// Sites de base pour calculer les options désactivées (on exclut la catégorie concernée)
const baseSitesForGroup   = computed(() =>
  (sites.value ?? []).filter(s => matchesCombination(s, { groups: [], techs: filterTechs.value, agencies: filterAgencies.value, pms: filterPms.value }))
)
const baseSitesForTech    = computed(() =>
  (sites.value ?? []).filter(s => matchesCombination(s, { groups: filterGroups.value, techs: [], agencies: filterAgencies.value, pms: filterPms.value }))
)
const baseSitesForAgency  = computed(() =>
  (sites.value ?? []).filter(s => matchesCombination(s, { groups: filterGroups.value, techs: filterTechs.value, agencies: [], pms: filterPms.value }))
)
const baseSitesForPm      = computed(() =>
  (sites.value ?? []).filter(s => matchesCombination(s, { groups: filterGroups.value, techs: filterTechs.value, agencies: filterAgencies.value, pms: [] }))
)

// Options des filtres avec état disabled
const filterGroupOptions = computed((): FilterOption[] =>
  (groups.value ?? []).map(g => ({
    id: g.id, label: g.name,
    disabled: !baseSitesForGroup.value.some(s => s.group_id === g.id),
  }))
)
const filterTechOptions = computed((): FilterOption[] => {
  const allTechs = new Set<string>()
  for (const s of sites.value ?? []) for (const t of techTags(s)) allTechs.add(t)
  return [...allTechs].sort().map(t => ({
    id: t, label: t,
    disabled: !baseSitesForTech.value.some(s => techTags(s).includes(t)),
  }))
})
const filterAgencyOptions = computed((): FilterOption[] => {
  const allAgencies = new Set<string>()
  for (const s of sites.value ?? []) if (s.agency) allAgencies.add(s.agency)
  return [...allAgencies].sort().map(a => ({
    id: a, label: a,
    disabled: !baseSitesForAgency.value.some(s => s.agency === a),
  }))
})
const filterPmOptions = computed((): FilterOption[] =>
  (pms.value ?? []).map(pm => ({
    id: pm.id, label: `${pm.first_name} ${pm.last_name}`,
    disabled: !baseSitesForPm.value.some(s => s.project_manager_id === pm.id),
  }))
)

// Vue filtrée
const filteredSitesByGroup = computed(() => {
  const result = new Map<string, Site[]>()
  for (const [groupId, list] of sitesByGroup.value) {
    result.set(groupId, list.filter(s => matchesCombination(s, {
      groups: filterGroups.value, techs: filterTechs.value,
      agencies: filterAgencies.value, pms: filterPms.value,
    })))
  }
  return result
})
const filteredGroups = computed(() =>
  (groups.value ?? []).filter(g => {
    if (filterGroups.value.length && !filterGroups.value.includes(g.id)) return false
    if (filterTechs.value.length || filterAgencies.value.length || filterPms.value.length) {
      return (filteredSitesByGroup.value.get(g.id) ?? []).length > 0
    }
    return true
  })
)
const filteredUngrouped = computed(() => {
  if (filterGroups.value.length) return []
  return (sitesByGroup.value.get('__none__') ?? []).filter(s => matchesCombination(s, {
    groups: [], techs: filterTechs.value, agencies: filterAgencies.value, pms: filterPms.value,
  }))
})

// ── Filtres actifs (chips) ────────────────────────────────────────
const activeFilterChips = computed((): ActiveFilterChip[] => {
  const chips: ActiveFilterChip[] = []
  for (const id of filterGroups.value) {
    const g = (groups.value ?? []).find(g => g.id === id)
    if (g) chips.push({ category: 'group', value: id, label: g.name, catLabel: 'Serveur' })
  }
  for (const t of filterTechs.value)
    chips.push({ category: 'tech', value: t, label: t, catLabel: 'Techno' })
  for (const a of filterAgencies.value)
    chips.push({ category: 'agency', value: a, label: a, catLabel: 'Agence' })
  for (const id of filterPms.value) {
    const pm = (pms.value ?? []).find(p => p.id === id)
    if (pm) chips.push({ category: 'pm', value: id, label: `${pm.first_name} ${pm.last_name}`, catLabel: 'Cheffe' })
  }
  return chips
})

function removeFilterChip(chip: ActiveFilterChip): void {
  switch (chip.category) {
    case 'group':  filterGroups.value   = filterGroups.value.filter(v => v !== chip.value);   break
    case 'tech':   filterTechs.value    = filterTechs.value.filter(v => v !== chip.value);    break
    case 'agency': filterAgencies.value = filterAgencies.value.filter(v => v !== chip.value); break
    case 'pm':     filterPms.value      = filterPms.value.filter(v => v !== chip.value);      break
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
  openEditModal: openEditGroup, closeEditModal: closeEditGroup, saveEdit: saveGroupEdit,
  isAddOpen: isAddGroupOpen, addForm: addGroupForm, addLoading: addGroupLoading, addError: addGroupError,
  openAddModal: openAddGroup, closeAddModal: closeAddGroup, confirmAdd: confirmAddGroup,
} = useGroupCrud(groups, sites)

// ── CRUD sites ────────────────────────────────────────────────────
const {
  deleteTarget: deleteSite, deleteLoading: deleteSiteLoading, deleteError: deleteSiteError,
  openDeleteConfirm: openDeleteSite, closeDeleteConfirm: closeDeleteSite, confirmDelete: confirmDeleteSite,
  editTarget: editSite, editForm: editSiteForm, editLoading: editSiteLoading, editError: editSiteError,
  openEditModal: openEditSite, closeEditModal: closeEditSite, saveEdit: saveSiteEdit,
  isAddOpen: isAddSiteOpen, addForm: addSiteForm, addLoading: addSiteLoading, addError: addSiteError,
  openAddModal: openAddSite, closeAddModal: closeAddSite, confirmAdd: confirmAddSite,
} = useSiteCrud(sites)
</script>

<template>
  <div class="app-wrap">

    <header class="app-header">
      <h1>Annuaire des serveurs</h1>
      <div style="display:flex;align-items:center;gap:8px">
        <button class="btn icon-only" :title="isDark ? 'Mode clair' : 'Mode sombre'" @click="toggleDark">
          <!-- Lune (mode clair actif → proposer sombre) -->
          <svg v-if="!isDark" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
          <!-- Soleil (mode sombre actif → proposer clair) -->
          <svg v-else xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
        </button>
        <NuxtLink to="/admin" class="btn icon-only" title="Administration">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        </NuxtLink>
        <button class="btn icon-only" title="Déconnexion" @click="logout">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>
    </header>

    <!-- ── Toolbar ──────────────────────────────────────────────── -->
    <div class="toolbar">
      <!-- Barre de recherche -->
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
      <!-- Actions -->
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

          <!-- Blocs serveurs -->
          <AppServerBlock
            v-for="group in filteredGroups"
            :key="group.id"
            :group="group"
            :sites="filteredSitesByGroup.get(group.id) ?? []"
            :pm-by-id="pmById"
            :hosters="fetchedHosters ?? []"
            :web-servers="fetchedWebServers ?? []"
            :expand-all-tick="expandAllTick"
            :collapse-all-tick="collapseAllTick"
            @edit-group="openEditGroup"
            @delete-group="openDeleteGroup"
            @edit-site="openEditSite"
            @delete-site="openDeleteSite"
          />

          <!-- Sites sans serveur -->
          <AppServerBlock
            v-if="filteredUngrouped.length"
            :group="{ id: '__none__', name: 'Sans serveur', hoster: null, ip_public: null, ip_local: null, web_server: null }"
            :sites="filteredUngrouped"
            :pm-by-id="pmById"
            :hosters="fetchedHosters ?? []"
            :web-servers="fetchedWebServers ?? []"
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

    <!-- ── Modale confirmation suppression SERVEUR ───────────────── -->
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

    <!-- ── Modale confirmation suppression SITE ─────────────────── -->
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

    <!-- ── Modale édition SERVEUR ────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="editGroup" class="modal-overlay" @click.self="closeEditGroup">
          <div class="modal-card">
            <h3 class="modal-title">Modifier le serveur</h3>
            <p v-if="editGroupError" class="modal-error">{{ editGroupError }}</p>
            <form @submit.prevent="saveGroupEdit">
              <div class="field">
                <label for="eg-name">Nom *</label>
                <input id="eg-name" v-model="editGroupForm.name" type="text" placeholder="Nom du serveur" required>
              </div>
              <div class="field">
                <label>Hébergeur</label>
                <AppIconSelect v-model="editGroupForm.hoster" :options="(fetchedHosters ?? []).map(h => ({ value: h.name, label: h.name, slug: h.simpleicons_slug }))" />
              </div>
              <div class="field">
                <label for="eg-ip-public">IP publique</label>
                <input id="eg-ip-public" v-model="editGroupForm.ip_public" type="text" placeholder="1.2.3.4">
              </div>
              <div class="field">
                <label for="eg-ip-local">IP locale</label>
                <input id="eg-ip-local" v-model="editGroupForm.ip_local" type="text" placeholder="192.168.x.x">
              </div>
              <div class="field">
                <label>Serveur web</label>
                <AppIconSelect v-model="editGroupForm.web_server" :options="(fetchedWebServers ?? []).map(ws => ({ value: ws.name, label: ws.name, slug: ws.simpleicons_slug }))" />
              </div>
              <div class="modal-btns">
                <button type="button" class="btn" :disabled="editGroupLoading" @click="closeEditGroup">
                  Annuler
                </button>
                <button type="submit" class="btn primary" :disabled="editGroupLoading">
                  <span v-if="editGroupLoading" class="spinner" />
                  {{ editGroupLoading ? 'Enregistrement…' : 'Enregistrer' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Modale ajout SERVEUR ─────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="isAddGroupOpen" class="modal-overlay" @click.self="closeAddGroup">
          <div class="modal-card">
            <h3 class="modal-title">Ajouter un serveur</h3>
            <p v-if="addGroupError" class="modal-error">{{ addGroupError }}</p>
            <form @submit.prevent="confirmAddGroup">
              <div class="field">
                <label for="ag-name">Nom *</label>
                <input id="ag-name" v-model="addGroupForm.name" type="text" placeholder="Nom du serveur" required>
              </div>
              <div class="field">
                <label>Hébergeur</label>
                <AppIconSelect v-model="addGroupForm.hoster" :options="(fetchedHosters ?? []).map(h => ({ value: h.name, label: h.name, slug: h.simpleicons_slug }))" />
              </div>
              <div class="field">
                <label for="ag-ip-public">IP publique</label>
                <input id="ag-ip-public" v-model="addGroupForm.ip_public" type="text" placeholder="1.2.3.4">
              </div>
              <div class="field">
                <label for="ag-ip-local">IP locale</label>
                <input id="ag-ip-local" v-model="addGroupForm.ip_local" type="text" placeholder="192.168.x.x">
              </div>
              <div class="field">
                <label>Serveur web</label>
                <AppIconSelect v-model="addGroupForm.web_server" :options="(fetchedWebServers ?? []).map(ws => ({ value: ws.name, label: ws.name, slug: ws.simpleicons_slug }))" />
              </div>
              <div class="modal-btns">
                <button type="button" class="btn" :disabled="addGroupLoading" @click="closeAddGroup">
                  Annuler
                </button>
                <button type="submit" class="btn primary" :disabled="addGroupLoading">
                  <span v-if="addGroupLoading" class="spinner" />
                  {{ addGroupLoading ? 'Création…' : 'Créer' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Modale ajout SITE ─────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="isAddSiteOpen" class="modal-overlay" @click.self="closeAddSite">
          <div class="modal-card modal-card--scroll" style="max-width:520px">
            <h3 class="modal-title">Ajouter un site</h3>
            <form @submit.prevent="confirmAddSite">
              <p v-if="addSiteError" class="modal-error">{{ addSiteError }}</p>
              <div class="field">
                <label for="as-name">Nom *</label>
                <input id="as-name" v-model="addSiteForm.name" type="text" placeholder="Nom du site" required>
              </div>
              <div class="field">
                <label for="as-url">URL</label>
                <input id="as-url" v-model="addSiteForm.url" type="text" placeholder="https://exemple.fr">
              </div>
              <div class="field">
                <label for="as-bo-url">Back-office</label>
                <input id="as-bo-url" v-model="addSiteForm.bo_url" type="text" placeholder="https://exemple.fr/admin">
              </div>
              <div class="field">
                <label for="as-gitlab">GitLab</label>
                <input id="as-gitlab" v-model="addSiteForm.gitlab_url" type="text" placeholder="https://gitlab.com/…">
              </div>
              <div class="field">
                <label for="as-agency">Agence</label>
                <input id="as-agency" v-model="addSiteForm.agency" type="text" placeholder="Eclolink…">
              </div>
              <div class="field">
                <label>Serveur</label>
                <AppSelect
                  v-model="addSiteForm.group_id"
                  :options="(groups ?? []).map(g => ({ value: g.id, label: g.name }))"
                  placeholder="— Aucun —"
                />
              </div>
              <div class="field">
                <label>Cheffe de projet</label>
                <AppSelect
                  v-model="addSiteForm.project_manager_id"
                  :options="(pms ?? []).map(pm => ({ value: pm.id, label: `${pm.first_name} ${pm.last_name}` }))"
                  placeholder="— Aucune —"
                />
              </div>
              <div class="field">
                <label>Client</label>
                <AppSelect
                  v-model="addSiteForm.client_id"
                  :options="(clients ?? []).map(c => ({ value: c.id, label: c.name }))"
                  placeholder="— Aucun —"
                />
              </div>
              <div class="field">
                <label for="as-php">Version PHP</label>
                <input id="as-php" v-model="addSiteForm.php_version" type="text" placeholder="8.2">
              </div>
              <div class="field">
                <label>Zone DNS</label>
                <AppIconSelect v-model="addSiteForm.dns_zone" :options="(fetchedDnsProviders ?? []).map(d => ({ value: d.name, label: d.name, slug: d.simpleicons_slug }))" />
              </div>
              <div class="field">
                <label>Registrar</label>
                <AppIconSelect v-model="addSiteForm.registrar" :options="(fetchedHosters ?? []).map(h => ({ value: h.name, label: h.name, slug: h.simpleicons_slug }))" />
              </div>
              <div class="field">
                <label>Mise en ligne</label>
                <AppDateInput v-model="addSiteForm.go_live_date" />
              </div>
              <div class="field">
                <label>Technologies</label>
                <AppTechSelect v-model="addSiteForm.technologies" :techs="fetchedTechs ?? []" />
              </div>
              <div class="field">
                <label for="as-notes">Notes</label>
                <textarea id="as-notes" v-model="addSiteForm.notes" class="field-input" placeholder="Informations complémentaires…" />
              </div>
              <div class="modal-btns">
                <button type="button" class="btn" :disabled="addSiteLoading" @click="closeAddSite">
                  Annuler
                </button>
                <button type="submit" class="btn primary" :disabled="addSiteLoading">
                  <span v-if="addSiteLoading" class="spinner" />
                  {{ addSiteLoading ? 'Création…' : 'Créer' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Modale édition SITE ───────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="editSite" class="modal-overlay" @click.self="closeEditSite">
          <div class="modal-card modal-card--scroll" style="max-width:520px">
            <h3 class="modal-title">Modifier le site</h3>
            <form @submit.prevent="saveSiteEdit">
              <p v-if="editSiteError" class="modal-error">{{ editSiteError }}</p>
              <div class="field">
                <label for="es-name">Nom *</label>
                <input id="es-name" v-model="editSiteForm.name" type="text" placeholder="Nom du site" required>
              </div>
              <div class="field">
                <label for="es-url">URL</label>
                <input id="es-url" v-model="editSiteForm.url" type="text" placeholder="https://exemple.fr">
              </div>
              <div class="field">
                <label for="es-bo-url">Back-office</label>
                <input id="es-bo-url" v-model="editSiteForm.bo_url" type="text" placeholder="https://exemple.fr/admin">
              </div>
              <div class="field">
                <label for="es-gitlab">GitLab</label>
                <input id="es-gitlab" v-model="editSiteForm.gitlab_url" type="text" placeholder="https://gitlab.com/…">
              </div>
              <div class="field">
                <label for="es-agency">Agence</label>
                <input id="es-agency" v-model="editSiteForm.agency" type="text" placeholder="Eclolink…">
              </div>
              <div class="field">
                <label>Serveur</label>
                <AppSelect
                  v-model="editSiteForm.group_id"
                  :options="(groups ?? []).map(g => ({ value: g.id, label: g.name }))"
                  placeholder="— Aucun —"
                />
              </div>
              <div class="field">
                <label>Cheffe de projet</label>
                <AppSelect
                  v-model="editSiteForm.project_manager_id"
                  :options="(pms ?? []).map(pm => ({ value: pm.id, label: `${pm.first_name} ${pm.last_name}` }))"
                  placeholder="— Aucune —"
                />
              </div>
              <div class="field">
                <label>Client</label>
                <AppSelect
                  v-model="editSiteForm.client_id"
                  :options="(clients ?? []).map(c => ({ value: c.id, label: c.name }))"
                  placeholder="— Aucun —"
                />
              </div>
              <div class="field">
                <label for="es-php">Version PHP</label>
                <input id="es-php" v-model="editSiteForm.php_version" type="text" placeholder="8.2">
              </div>
              <div class="field">
                <label>Zone DNS</label>
                <AppIconSelect v-model="editSiteForm.dns_zone" :options="(fetchedDnsProviders ?? []).map(d => ({ value: d.name, label: d.name, slug: d.simpleicons_slug }))" />
              </div>
              <div class="field">
                <label>Registrar</label>
                <AppIconSelect v-model="editSiteForm.registrar" :options="(fetchedHosters ?? []).map(h => ({ value: h.name, label: h.name, slug: h.simpleicons_slug }))" />
              </div>
              <div class="field">
                <label>Mise en ligne</label>
                <AppDateInput v-model="editSiteForm.go_live_date" />
              </div>
              <div class="field">
                <label>Technologies</label>
                <AppTechSelect v-model="editSiteForm.technologies" :techs="fetchedTechs ?? []" />
              </div>
              <div class="field">
                <label for="es-notes">Notes</label>
                <textarea id="es-notes" v-model="editSiteForm.notes" class="field-input" placeholder="Informations complémentaires…" />
              </div>
              <div class="modal-btns">
                <button type="button" class="btn" :disabled="editSiteLoading" @click="closeEditSite">
                  Annuler
                </button>
                <button type="submit" class="btn primary" :disabled="editSiteLoading">
                  <span v-if="editSiteLoading" class="spinner" />
                  {{ editSiteLoading ? 'Enregistrement…' : 'Enregistrer' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>
