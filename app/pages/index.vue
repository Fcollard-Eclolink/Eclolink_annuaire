<script setup lang="ts">
import type { Group, Site } from '~/server/utils/types'

definePageMeta({ middleware: 'auth' })

const { user, logout } = useAuth()

// ── Chargement ────────────────────────────────────────────────────
const [{ data: groups, error: errGroups }, { data: sites, error: errSites }] =
  await Promise.all([
    useFetch<Group[]>('/api/groups'),
    useFetch<Site[]>('/api/sites'),
  ])

const hasError = computed(() => errGroups.value || errSites.value)

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

// ── Ouverture / fermeture des blocs ──────────────────────────────
const openGroups = ref<Set<string>>(new Set())

watch(groups, (list) => {
  if (!list) return
  for (const g of list) openGroups.value.add(g.id)
  if (ungrouped.value.length) openGroups.value.add('__none__')
}, { immediate: true })

function toggle(id: string): void {
  if (openGroups.value.has(id)) openGroups.value.delete(id)
  else openGroups.value.add(id)
}

function siteCount(groupId: string): number {
  return sitesByGroup.value.get(groupId)?.length ?? 0
}

// ── Suppression ───────────────────────────────────────────────────
const deleteTarget  = ref<Group | null>(null)
const deleteLoading = ref(false)
const deleteError   = ref('')

function openDeleteConfirm(group: Group): void {
  deleteTarget.value = group
  deleteError.value  = ''
}

function closeDeleteConfirm(): void {
  if (deleteLoading.value) return
  deleteTarget.value = null
}

async function confirmDelete(): Promise<void> {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  deleteError.value   = ''
  try {
    await $fetch(`/api/groups/${deleteTarget.value.id}`, { method: 'DELETE' })
    const id = deleteTarget.value.id
    if (groups.value) groups.value = groups.value.filter(g => g.id !== id)
    // Les sites détachés passent dans "Sans serveur"
    if (sites.value) {
      for (const s of sites.value) {
        if (s.group_id === id) s.group_id = null
      }
    }
    deleteTarget.value = null
  } catch {
    deleteError.value = 'Erreur lors de la suppression.'
  } finally {
    deleteLoading.value = false
  }
}

// ── Édition ───────────────────────────────────────────────────────
interface EditForm {
  name      : string
  hoster    : string
  ip_local  : string
  ip_public : string
  web_server: string
}

const editTarget  = ref<Group | null>(null)
const editForm    = ref<EditForm>({ name: '', hoster: '', ip_local: '', ip_public: '', web_server: '' })
const editLoading = ref(false)
const editError   = ref('')

function openEditModal(group: Group): void {
  editTarget.value = group
  editForm.value   = {
    name      : group.name,
    hoster    : group.hoster    ?? '',
    ip_local  : group.ip_local  ?? '',
    ip_public : group.ip_public ?? '',
    web_server: group.web_server ?? '',
  }
  editError.value = ''
}

function closeEditModal(): void {
  if (editLoading.value) return
  editTarget.value = null
}

async function saveEdit(): Promise<void> {
  if (!editTarget.value) return
  if (!editForm.value.name.trim()) {
    editError.value = 'Le nom est requis.'
    return
  }
  editLoading.value = true
  editError.value   = ''
  try {
    const updated = await $fetch<Group>(`/api/groups/${editTarget.value.id}`, {
      method: 'PATCH',
      body  : {
        name      : editForm.value.name.trim(),
        hoster    : editForm.value.hoster.trim()     || null,
        ip_local  : editForm.value.ip_local.trim()   || null,
        ip_public : editForm.value.ip_public.trim()  || null,
        web_server: editForm.value.web_server.trim() || null,
      },
    })
    if (groups.value) {
      const idx = groups.value.findIndex(g => g.id === editTarget.value!.id)
      if (idx !== -1) groups.value[idx] = updated
    }
    editTarget.value = null
  } catch {
    editError.value = 'Erreur lors de la sauvegarde.'
  } finally {
    editLoading.value = false
  }
}
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

    <!-- Erreur -->
    <div v-if="hasError" class="load-error">
      Impossible de charger les données.
    </div>

    <!-- Liste groupée -->
    <template v-else>
      <div class="servers-list">

        <!-- Un bloc par serveur -->
        <div v-for="group in groups" :key="group.id" class="server-block">

          <div class="server-header-row">
            <!-- Zone cliquable : toggle -->
            <button
              class="server-toggle"
              :class="{ open: openGroups.has(group.id) }"
              @click="toggle(group.id)"
            >
              <span class="server-chevron">&#9654;</span>
              <span class="server-name">{{ group.name }}</span>
              <span class="server-count">{{ siteCount(group.id) }}</span>
            </button>

            <!-- Actions : modifier + supprimer -->
            <div class="server-actions">
              <button
                class="icon-btn"
                title="Modifier"
                @click="openEditModal(group)"
              >&#9998;</button>
              <button
                class="icon-btn del"
                title="Supprimer"
                @click="openDeleteConfirm(group)"
              >&#10005;</button>
            </div>
          </div>

          <!-- Sites -->
          <div v-if="openGroups.has(group.id)" class="server-body">
            <div v-if="!sitesByGroup.has(group.id)" class="empty-group">
              Aucun site dans ce serveur.
            </div>
            <div
              v-for="site in sitesByGroup.get(group.id)"
              :key="site.id"
              class="site-row"
            >
              <div class="site-info">
                <span class="site-name">{{ site.name }}</span>
                <a
                  v-if="site.url"
                  :href="site.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="site-url"
                >{{ site.url }}</a>
              </div>
              <span v-if="site.agency" class="site-agency">{{ site.agency }}</span>
            </div>
          </div>
        </div>

        <!-- Sites sans serveur -->
        <div v-if="ungrouped.length" class="server-block">
          <div class="server-header-row">
            <button
              class="server-toggle"
              :class="{ open: openGroups.has('__none__') }"
              @click="toggle('__none__')"
            >
              <span class="server-chevron">&#9654;</span>
              <span class="server-name muted">Sans serveur</span>
              <span class="server-count">{{ ungrouped.length }}</span>
            </button>
          </div>
          <div v-if="openGroups.has('__none__')" class="server-body">
            <div
              v-for="site in ungrouped"
              :key="site.id"
              class="site-row"
            >
              <div class="site-info">
                <span class="site-name">{{ site.name }}</span>
                <a
                  v-if="site.url"
                  :href="site.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="site-url"
                >{{ site.url }}</a>
              </div>
              <span v-if="site.agency" class="site-agency">{{ site.agency }}</span>
            </div>
          </div>
        </div>

        <!-- Aucune donnée -->
        <div v-if="!groups?.length && !ungrouped.length" class="empty-state">
          Aucun site enregistré.
        </div>

      </div>
    </template>

    <!-- ── Modale confirmation suppression ──────────────────────── -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="deleteTarget" class="modal-overlay" @click.self="closeDeleteConfirm">
          <div class="modal-card">
            <h3 class="modal-title">Supprimer le serveur</h3>
            <p class="modal-msg">
              Supprimer <strong>{{ deleteTarget.name }}</strong> ?
              Les sites associés seront détachés mais pas supprimés.
            </p>
            <p v-if="deleteError" class="modal-error">{{ deleteError }}</p>
            <div class="modal-btns">
              <button class="btn" :disabled="deleteLoading" @click="closeDeleteConfirm">
                Annuler
              </button>
              <button class="btn btn-danger" :disabled="deleteLoading" @click="confirmDelete">
                <span v-if="deleteLoading" class="spinner spinner-dark" />
                {{ deleteLoading ? 'Suppression…' : 'Supprimer' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Modale édition serveur ────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="editTarget" class="modal-overlay" @click.self="closeEditModal">
          <div class="modal-card">
            <h3 class="modal-title">Modifier le serveur</h3>
            <p v-if="editError" class="modal-error">{{ editError }}</p>

            <form @submit.prevent="saveEdit">
              <div class="field">
                <label for="edit-name">Nom *</label>
                <input id="edit-name" v-model="editForm.name" type="text" placeholder="Nom du serveur" required>
              </div>
              <div class="field">
                <label for="edit-hoster">Hébergeur</label>
                <input id="edit-hoster" v-model="editForm.hoster" type="text" placeholder="OVH, Gandi…">
              </div>
              <div class="field">
                <label for="edit-ip-public">IP publique</label>
                <input id="edit-ip-public" v-model="editForm.ip_public" type="text" placeholder="1.2.3.4">
              </div>
              <div class="field">
                <label for="edit-ip-local">IP locale</label>
                <input id="edit-ip-local" v-model="editForm.ip_local" type="text" placeholder="192.168.x.x">
              </div>
              <div class="field">
                <label for="edit-web-server">Serveur web</label>
                <input id="edit-web-server" v-model="editForm.web_server" type="text" placeholder="nginx, apache…">
              </div>

              <div class="modal-btns">
                <button type="button" class="btn" :disabled="editLoading" @click="closeEditModal">
                  Annuler
                </button>
                <button type="submit" class="btn primary" :disabled="editLoading">
                  <span v-if="editLoading" class="spinner" />
                  {{ editLoading ? 'Enregistrement…' : 'Enregistrer' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>
