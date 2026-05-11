<script setup lang="ts">
import type { Group, Site, ProjectManager, Client } from '~/server/utils/types'
import type { SiteEditForm } from '~/composables/useSiteCrud'

definePageMeta({ middleware: 'auth' })

const { user, logout } = useAuth()

// ── Chargement ────────────────────────────────────────────────────
const [
  { data: groups,  error: errGroups, refresh: refreshGroups },
  { data: sites,   error: errSites,  refresh: refreshSites  },
  { data: pms,     error: errPms,    refresh: refreshPms    },
  { data: clients },
] = await Promise.all([
  useFetch<Group[]>('/api/groups'),
  useFetch<Site[]>('/api/sites'),
  useFetch<ProjectManager[]>('/api/project-managers'),
  useFetch<Client[]>('/api/clients'),
])

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
      <div style="display:flex;align-items:center;gap:12px">
        <span class="user-email">{{ user?.email }}</span>
        <button class="btn" @click="logout">Déconnexion</button>
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
          placeholder="Rechercher un site…"
          autocomplete="off"
          @keydown="onSearchKeydown"
        >
        <button v-if="isActive" class="search-bar-clear" title="Effacer" @click="clear">&#10005;</button>
        <kbd v-else class="search-kbd">Ctrl K</kbd>
      </div>
      <!-- Actions -->
      <div class="toolbar-actions">
        <button class="btn" :disabled="reloading" title="Recharger les données" @click="reloadAll">
          <svg :class="{ spinning: reloading }" xmlns="http://www.w3.org/2000/svg" width="14" height="14"
               viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
            <path d="M21 3v5h-5"/>
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
            <path d="M8 16H3v5"/>
          </svg>
          Recharger
        </button>
        <button class="btn" @click="openAddGroup">+ Serveur</button>
        <button class="btn primary" @click="openAddSite">+ Site</button>
      </div>
    </div>

    <div v-if="hasError" class="load-error">
      Impossible de charger les données.
    </div>

    <template v-else>

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
            v-for="group in groups"
            :key="group.id"
            :group="group"
            :sites="sitesByGroup.get(group.id) ?? []"
            :pm-by-id="pmById"
            @edit-group="openEditGroup"
            @delete-group="openDeleteGroup"
            @edit-site="openEditSite"
            @delete-site="openDeleteSite"
          />

          <!-- Sites sans serveur -->
          <AppServerBlock
            v-if="ungrouped.length"
            :group="{ id: '__none__', name: 'Sans serveur', hoster: null, ip_public: null, ip_local: null, web_server: null }"
            :sites="ungrouped"
            :pm-by-id="pmById"
            :name-is-muted="true"
            @edit-site="openEditSite"
            @delete-site="openDeleteSite"
          />

          <div v-if="!groups?.length && !ungrouped.length" class="empty-state">
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
                <AppIconSelect v-model="editGroupForm.hoster" :options="HOSTERS" />
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
                <AppIconSelect v-model="editGroupForm.web_server" :options="WEB_SERVERS" />
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
                <AppIconSelect v-model="addGroupForm.hoster" :options="HOSTERS" />
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
                <AppIconSelect v-model="addGroupForm.web_server" :options="WEB_SERVERS" />
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
                <label for="as-group">Serveur</label>
                <select id="as-group" v-model="addSiteForm.group_id" class="field-input">
                  <option value="">— Aucun —</option>
                  <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
                </select>
              </div>
              <div class="field">
                <label for="as-pm">Cheffe de projet</label>
                <select id="as-pm" v-model="addSiteForm.project_manager_id" class="field-input">
                  <option value="">— Aucune —</option>
                  <option v-for="pm in pms" :key="pm.id" :value="pm.id">
                    {{ pm.first_name }} {{ pm.last_name }}
                  </option>
                </select>
              </div>
              <div class="field">
                <label for="as-client">Client</label>
                <select id="as-client" v-model="addSiteForm.client_id" class="field-input">
                  <option value="">— Aucun —</option>
                  <option v-for="c in clients" :key="c.id" :value="c.id">{{ c.name }}</option>
                </select>
              </div>
              <div class="field">
                <label for="as-php">Version PHP</label>
                <input id="as-php" v-model="addSiteForm.php_version" type="text" placeholder="8.2">
              </div>
              <div class="field">
                <label>Zone DNS</label>
                <AppIconSelect v-model="addSiteForm.dns_zone" :options="DNS_PROVIDERS" />
              </div>
              <div class="field">
                <label>Registrar</label>
                <AppIconSelect v-model="addSiteForm.registrar" :options="HOSTERS" />
              </div>
              <div class="field">
                <label>Mise en ligne</label>
                <AppDateInput v-model="addSiteForm.go_live_date" />
              </div>
              <div class="field">
                <label>Technologies</label>
                <AppTechSelect v-model="addSiteForm.technologies" />
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
                <label for="es-group">Serveur</label>
                <select id="es-group" v-model="editSiteForm.group_id" class="field-input">
                  <option value="">— Aucun —</option>
                  <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
                </select>
              </div>
              <div class="field">
                <label for="es-pm">Cheffe de projet</label>
                <select id="es-pm" v-model="editSiteForm.project_manager_id" class="field-input">
                  <option value="">— Aucune —</option>
                  <option v-for="pm in pms" :key="pm.id" :value="pm.id">
                    {{ pm.first_name }} {{ pm.last_name }}
                  </option>
                </select>
              </div>
              <div class="field">
                <label for="es-client">Client</label>
                <select id="es-client" v-model="editSiteForm.client_id" class="field-input">
                  <option value="">— Aucun —</option>
                  <option v-for="c in clients" :key="c.id" :value="c.id">{{ c.name }}</option>
                </select>
              </div>
              <div class="field">
                <label for="es-php">Version PHP</label>
                <input id="es-php" v-model="editSiteForm.php_version" type="text" placeholder="8.2">
              </div>
              <div class="field">
                <label>Zone DNS</label>
                <AppIconSelect v-model="editSiteForm.dns_zone" :options="DNS_PROVIDERS" />
              </div>
              <div class="field">
                <label>Registrar</label>
                <AppIconSelect v-model="editSiteForm.registrar" :options="HOSTERS" />
              </div>
              <div class="field">
                <label>Mise en ligne</label>
                <AppDateInput v-model="editSiteForm.go_live_date" />
              </div>
              <div class="field">
                <label>Technologies</label>
                <AppTechSelect v-model="editSiteForm.technologies" />
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
