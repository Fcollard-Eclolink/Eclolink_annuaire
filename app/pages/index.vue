<script setup lang="ts">
import type { Group, Site, ProjectManager } from '~/server/utils/types'
import type { SiteEditForm } from '~/composables/useSiteCrud'

definePageMeta({ middleware: 'auth' })

const { user, logout } = useAuth()

// ── Chargement ────────────────────────────────────────────────────
const [
  { data: groups, error: errGroups },
  { data: sites,  error: errSites  },
  { data: pms,    error: errPms    },
] = await Promise.all([
  useFetch<Group[]>('/api/groups'),
  useFetch<Site[]>('/api/sites'),
  useFetch<ProjectManager[]>('/api/project-managers'),
])

const hasError = computed(() => errGroups.value || errSites.value || errPms.value)

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

// ── CRUD serveurs ─────────────────────────────────────────────────
const {
  deleteTarget: deleteGroup, deleteLoading: deleteGroupLoading, deleteError: deleteGroupError,
  openDeleteConfirm: openDeleteGroup, closeDeleteConfirm: closeDeleteGroup, confirmDelete: confirmDeleteGroup,
  editTarget: editGroup, editForm: editGroupForm, editLoading: editGroupLoading, editError: editGroupError,
  openEditModal: openEditGroup, closeEditModal: closeEditGroup, saveEdit: saveGroupEdit,
} = useGroupCrud(groups, sites)

// ── CRUD sites ────────────────────────────────────────────────────
const {
  deleteTarget: deleteSite, deleteLoading: deleteSiteLoading, deleteError: deleteSiteError,
  openDeleteConfirm: openDeleteSite, closeDeleteConfirm: closeDeleteSite, confirmDelete: confirmDeleteSite,
  editTarget: editSite, editForm: editSiteForm, editLoading: editSiteLoading, editError: editSiteError,
  openEditModal: openEditSite, closeEditModal: closeEditSite, saveEdit: saveSiteEdit,
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

    <div v-if="hasError" class="load-error">
      Impossible de charger les données.
    </div>

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
                <label for="eg-hoster">Hébergeur</label>
                <input id="eg-hoster" v-model="editGroupForm.hoster" type="text" placeholder="OVH, Gandi…">
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
                <label for="eg-web-server">Serveur web</label>
                <input id="eg-web-server" v-model="editGroupForm.web_server" type="text" placeholder="nginx, apache…">
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

    <!-- ── Modale édition SITE ───────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="editSite" class="modal-overlay" @click.self="closeEditSite">
          <div class="modal-card" style="max-width:520px">
            <h3 class="modal-title">Modifier le site</h3>
            <p v-if="editSiteError" class="modal-error">{{ editSiteError }}</p>
            <form @submit.prevent="saveSiteEdit">
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
                <label for="es-php">Version PHP</label>
                <input id="es-php" v-model="editSiteForm.php_version" type="text" placeholder="8.2">
              </div>
              <div class="field">
                <label for="es-dns">Zone DNS</label>
                <input id="es-dns" v-model="editSiteForm.dns_zone" type="text" placeholder="OVH, Cloudflare…">
              </div>
              <div class="field">
                <label for="es-golive">Mise en ligne</label>
                <input id="es-golive" v-model="editSiteForm.go_live_date" type="date">
              </div>
              <div class="field">
                <label for="es-tech">
                  Technologies
                  <span style="font-weight:400;color:var(--text-muted)">(séparées par des virgules)</span>
                </label>
                <input id="es-tech" v-model="editSiteForm.technologies" type="text" placeholder="Vue, Nuxt, WordPress…">
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
