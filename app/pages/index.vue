<script setup lang="ts">
import type { Group, Site, ProjectManager } from '~/server/utils/types'

definePageMeta({ middleware: 'auth' })

const { user, logout } = useAuth()

// ── Chargement ────────────────────────────────────────────────────
const [
  { data: groups,  error: errGroups },
  { data: sites,   error: errSites  },
  { data: pms,     error: errPms    },
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

// ── Popovers (serveurs + sites) ───────────────────────────────────
// Identifiant namespaced : 'g-<groupId>' pour les serveurs, 's-<siteId>' pour les sites
const openPopoverId = ref<string | null>(null)

function togglePopover(id: string): void {
  openPopoverId.value = openPopoverId.value === id ? null : id
}

function closePopover(): void {
  openPopoverId.value = null
}

onMounted(()  => document.addEventListener('click', closePopover))
onUnmounted(() => document.removeEventListener('click', closePopover))

// Infos serveur
function hasGroupInfo(group: Group): boolean {
  return !!(group.hoster || group.ip_public || group.ip_local || group.web_server)
}

// Infos site (bo_url et gitlab_url sont des boutons directs, pas dans le popover)
function hasSiteInfo(site: Site): boolean {
  return !!(
    site.dns_zone || site.php_version || site.go_live_date ||
    site.project_manager_id || site.notes
  )
}

// Technologies : supporte JSON array ["a","b"] ET CSV "a, b"
function techTags(site: Site): string[] {
  if (!site.technologies) return []
  const raw = site.technologies.trim()
  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed)) {
        return (parsed as unknown[])
          .map(v => String(v).trim())
          .filter(Boolean)
      }
    } catch { /* fallback CSV */ }
  }
  return raw.split(',').map(t => t.trim()).filter(Boolean)
}

// Logo simpleicons.org pour une technologie (null = pas de logo connu)
const TECH_ICONS: Record<string, { slug: string; color: string }> = {
  wordpress:    { slug: 'wordpress',   color: '21759b' },
  woocommerce:  { slug: 'woocommerce', color: '96588A' },
  wpbakery:     { slug: 'wpbakery',    color: '522D80' },
  elementor:    { slug: 'elementor',   color: '92003B' },
  divi:         { slug: 'divi',        color: '7EBEC5' },
  shopify:      { slug: 'shopify',     color: '7AB55C' },
  prestashop:   { slug: 'prestashop',  color: 'DF0067' },
  drupal:       { slug: 'drupal',      color: '0678BE' },
  joomla:       { slug: 'joomla',      color: '5091CD' },
  magento:      { slug: 'magento',     color: 'EE672F' },
  vue:          { slug: 'vuedotjs',    color: '42B883' },
  nuxt:         { slug: 'nuxtdotjs',   color: '00DC82' },
  react:        { slug: 'react',       color: '61DAFB' },
  nextjs:       { slug: 'nextdotjs',   color: '000000' },
  laravel:      { slug: 'laravel',     color: 'FF2D20' },
  symfony:      { slug: 'symfony',     color: '000000' },
  php:          { slug: 'php',         color: '777BB4' },
  typescript:   { slug: 'typescript',  color: '3178C6' },
  javascript:   { slug: 'javascript',  color: 'F7DF1E' },
  docker:       { slug: 'docker',      color: '2496ED' },
  sass:         { slug: 'sass',        color: 'CC6699' },
}

function techIconUrl(tech: string): string | null {
  const n = tech.toLowerCase()
  const key = Object.keys(TECH_ICONS).find(k => n.includes(k))
  if (!key) return null
  const { slug, color } = TECH_ICONS[key]!
  return `https://cdn.simpleicons.org/${slug}/${color}`
}

// ── Badge serveur web ─────────────────────────────────────────────
function webServerKey(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('nginx'))     return 'nginx'
  if (n.includes('apache'))    return 'apache'
  if (n.includes('caddy'))     return 'caddy'
  if (n.includes('litespeed')) return 'litespeed'
  if (n.includes('iis'))       return 'iis'
  return 'other'
}

// ── Copie IP ──────────────────────────────────────────────────────
const copiedField = ref<string | null>(null)

async function copyIp(text: string, fieldId: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    copiedField.value = fieldId
    setTimeout(() => {
      if (copiedField.value === fieldId) copiedField.value = null
    }, 1500)
  } catch { /* ignore — pas de permission clipboard */ }
}

// ── Suppression serveur ───────────────────────────────────────────
const deleteGroupTarget  = ref<Group | null>(null)
const deleteGroupLoading = ref(false)
const deleteGroupError   = ref('')

function openDeleteGroupConfirm(group: Group): void {
  deleteGroupTarget.value = group
  deleteGroupError.value  = ''
}

function closeDeleteGroupConfirm(): void {
  if (deleteGroupLoading.value) return
  deleteGroupTarget.value = null
}

async function confirmDeleteGroup(): Promise<void> {
  if (!deleteGroupTarget.value) return
  deleteGroupLoading.value = true
  deleteGroupError.value   = ''
  try {
    await $fetch(`/api/groups/${deleteGroupTarget.value.id}`, { method: 'DELETE' })
    const id = deleteGroupTarget.value.id
    if (groups.value) groups.value = groups.value.filter(g => g.id !== id)
    if (sites.value) {
      for (const s of sites.value) {
        if (s.group_id === id) s.group_id = null
      }
    }
    deleteGroupTarget.value = null
  } catch {
    deleteGroupError.value = 'Erreur lors de la suppression.'
  } finally {
    deleteGroupLoading.value = false
  }
}

// ── Édition serveur ───────────────────────────────────────────────
interface GroupEditForm {
  name      : string
  hoster    : string
  ip_local  : string
  ip_public : string
  web_server: string
}

const editGroupTarget  = ref<Group | null>(null)
const editGroupForm    = ref<GroupEditForm>({ name: '', hoster: '', ip_local: '', ip_public: '', web_server: '' })
const editGroupLoading = ref(false)
const editGroupError   = ref('')

function openEditGroupModal(group: Group): void {
  editGroupTarget.value = group
  editGroupForm.value   = {
    name      : group.name,
    hoster    : group.hoster    ?? '',
    ip_local  : group.ip_local  ?? '',
    ip_public : group.ip_public ?? '',
    web_server: group.web_server ?? '',
  }
  editGroupError.value = ''
}

function closeEditGroupModal(): void {
  if (editGroupLoading.value) return
  editGroupTarget.value = null
}

async function saveGroupEdit(): Promise<void> {
  if (!editGroupTarget.value) return
  if (!editGroupForm.value.name.trim()) {
    editGroupError.value = 'Le nom est requis.'
    return
  }
  editGroupLoading.value = true
  editGroupError.value   = ''
  try {
    const updated = await $fetch<Group>(`/api/groups/${editGroupTarget.value.id}`, {
      method: 'PATCH',
      body  : {
        name      : editGroupForm.value.name.trim(),
        hoster    : editGroupForm.value.hoster.trim()     || null,
        ip_local  : editGroupForm.value.ip_local.trim()   || null,
        ip_public : editGroupForm.value.ip_public.trim()  || null,
        web_server: editGroupForm.value.web_server.trim() || null,
      },
    })
    if (groups.value) {
      const idx = groups.value.findIndex(g => g.id === editGroupTarget.value!.id)
      if (idx !== -1) groups.value[idx] = updated
    }
    editGroupTarget.value = null
  } catch {
    editGroupError.value = 'Erreur lors de la sauvegarde.'
  } finally {
    editGroupLoading.value = false
  }
}

// ── Suppression site ──────────────────────────────────────────────
const deleteSiteTarget  = ref<Site | null>(null)
const deleteSiteLoading = ref(false)
const deleteSiteError   = ref('')

function openDeleteSiteConfirm(site: Site): void {
  deleteSiteTarget.value = site
  deleteSiteError.value  = ''
}

function closeDeleteSiteConfirm(): void {
  if (deleteSiteLoading.value) return
  deleteSiteTarget.value = null
}

async function confirmDeleteSite(): Promise<void> {
  if (!deleteSiteTarget.value) return
  deleteSiteLoading.value = true
  deleteSiteError.value   = ''
  try {
    await $fetch(`/api/sites/${deleteSiteTarget.value.id}`, { method: 'DELETE' })
    const id = deleteSiteTarget.value.id
    if (sites.value) sites.value = sites.value.filter(s => s.id !== id)
    deleteSiteTarget.value = null
  } catch {
    deleteSiteError.value = 'Erreur lors de la suppression.'
  } finally {
    deleteSiteLoading.value = false
  }
}

// ── Édition site ──────────────────────────────────────────────────
interface SiteEditForm {
  name              : string
  url               : string
  bo_url            : string
  gitlab_url        : string
  agency            : string
  group_id          : string
  php_version       : string
  dns_zone          : string
  go_live_date      : string
  technologies      : string
  project_manager_id: string
  notes             : string
}

const editSiteTarget  = ref<Site | null>(null)
const editSiteForm    = ref<SiteEditForm>({
  name: '', url: '', bo_url: '', gitlab_url: '', agency: '',
  group_id: '', php_version: '', dns_zone: '', go_live_date: '',
  technologies: '', project_manager_id: '', notes: '',
})
const editSiteLoading = ref(false)
const editSiteError   = ref('')

function openEditSiteModal(site: Site): void {
  editSiteTarget.value = site
  editSiteForm.value   = {
    name              : site.name,
    url               : site.url               ?? '',
    bo_url            : site.bo_url            ?? '',
    gitlab_url        : site.gitlab_url        ?? '',
    agency            : site.agency            ?? '',
    group_id          : site.group_id          ?? '',
    php_version       : site.php_version       ?? '',
    dns_zone          : site.dns_zone          ?? '',
    go_live_date      : site.go_live_date      ?? '',
    technologies      : site.technologies      ?? '',
    project_manager_id: site.project_manager_id ?? '',
    notes             : site.notes             ?? '',
  }
  editSiteError.value = ''
}

function closeEditSiteModal(): void {
  if (editSiteLoading.value) return
  editSiteTarget.value = null
}

async function saveSiteEdit(): Promise<void> {
  if (!editSiteTarget.value) return
  if (!editSiteForm.value.name.trim()) {
    editSiteError.value = 'Le nom est requis.'
    return
  }
  editSiteLoading.value = true
  editSiteError.value   = ''
  try {
    const f = editSiteForm.value
    const updated = await $fetch<Site>(`/api/sites/${editSiteTarget.value.id}`, {
      method: 'PATCH',
      body  : {
        name              : f.name.trim(),
        url               : f.url.trim()               || null,
        bo_url            : f.bo_url.trim()            || null,
        gitlab_url        : f.gitlab_url.trim()        || null,
        agency            : f.agency.trim()            || null,
        group_id          : f.group_id                 || null,
        php_version       : f.php_version.trim()       || null,
        dns_zone          : f.dns_zone.trim()          || null,
        go_live_date      : f.go_live_date             || null,
        technologies      : f.technologies.trim()      || null,
        project_manager_id: f.project_manager_id       || null,
        notes             : f.notes.trim()             || null,
      },
    })
    if (sites.value) {
      const idx = sites.value.findIndex(s => s.id === editSiteTarget.value!.id)
      if (idx !== -1) sites.value[idx] = updated
    }
    editSiteTarget.value = null
  } catch {
    editSiteError.value = 'Erreur lors de la sauvegarde.'
  } finally {
    editSiteLoading.value = false
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

            <!-- Actions : infos + modifier + supprimer -->
            <div class="server-actions" @click.stop>

              <!-- Bouton ℹ + popover -->
              <div v-if="hasGroupInfo(group)" class="info-wrap">
                <button
                  class="icon-btn"
                  :class="{ active: openPopoverId === 'g-' + group.id }"
                  title="Informations"
                  @click="togglePopover('g-' + group.id)"
                >&#x2139;</button>

                <div v-if="openPopoverId === 'g-' + group.id" class="info-popover">
                  <div v-if="group.hoster" class="info-row">
                    <span class="info-label">Hébergeur</span>
                    <span class="info-val">{{ group.hoster }}</span>
                  </div>
                  <div v-if="group.ip_public" class="info-row">
                    <span class="info-label">IP publique</span>
                    <div class="info-val-wrap">
                      <span class="info-val">{{ group.ip_public }}</span>
                      <button
                        class="copy-btn"
                        :class="{ copied: copiedField === 'pub-' + group.id }"
                        title="Copier"
                        @click.stop="copyIp(group.ip_public!, 'pub-' + group.id)"
                      >
                        <svg v-if="copiedField !== 'pub-' + group.id"
                             xmlns="http://www.w3.org/2000/svg" width="12" height="12"
                             viewBox="0 0 24 24" fill="none" stroke="currentColor"
                             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <rect x="9" y="2" width="13" height="13" rx="2" ry="2"/>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                        <svg v-else xmlns="http://www.w3.org/2000/svg" width="12" height="12"
                             viewBox="0 0 24 24" fill="none" stroke="currentColor"
                             stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div v-if="group.ip_local" class="info-row">
                    <span class="info-label">IP locale</span>
                    <div class="info-val-wrap">
                      <span class="info-val">{{ group.ip_local }}</span>
                      <button
                        class="copy-btn"
                        :class="{ copied: copiedField === 'loc-' + group.id }"
                        title="Copier"
                        @click.stop="copyIp(group.ip_local!, 'loc-' + group.id)"
                      >
                        <svg v-if="copiedField !== 'loc-' + group.id"
                             xmlns="http://www.w3.org/2000/svg" width="12" height="12"
                             viewBox="0 0 24 24" fill="none" stroke="currentColor"
                             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <rect x="9" y="2" width="13" height="13" rx="2" ry="2"/>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                        <svg v-else xmlns="http://www.w3.org/2000/svg" width="12" height="12"
                             viewBox="0 0 24 24" fill="none" stroke="currentColor"
                             stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div v-if="group.web_server" class="info-row">
                    <span class="info-label">Serveur web</span>
                    <span :class="['ws-badge', 'ws-' + webServerKey(group.web_server)]">
                      {{ group.web_server }}
                    </span>
                  </div>
                </div>
              </div>

              <button
                class="icon-btn"
                title="Modifier"
                @click="openEditGroupModal(group)"
              >&#9998;</button>
              <button
                class="icon-btn del"
                title="Supprimer"
                @click="openDeleteGroupConfirm(group)"
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
                <div class="site-meta">
                  <!-- Bouton URL -->
                  <a v-if="site.url" class="site-link-btn" :href="site.url"
                     target="_blank" rel="noopener noreferrer" title="Visiter le site">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
                         fill="none" stroke="currentColor" stroke-width="2"
                         stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                    </svg>
                  </a>
                  <!-- Bouton Back-office -->
                  <a v-if="site.bo_url" class="site-link-btn" :href="site.bo_url"
                     target="_blank" rel="noopener noreferrer" title="Back-office">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
                         fill="none" stroke="currentColor" stroke-width="2"
                         stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                    </svg>
                  </a>
                  <!-- Bouton GitLab -->
                  <a v-if="site.gitlab_url" class="site-link-btn site-link-btn--gitlab" :href="site.gitlab_url"
                     target="_blank" rel="noopener noreferrer" title="GitLab">
                    <img src="https://cdn.simpleicons.org/gitlab/FC6D26" width="13" height="13" alt="GitLab">
                  </a>
                  <!-- Séparateur visuel si liens ET tags -->
                  <span
                    v-if="(site.url || site.bo_url || site.gitlab_url) && (site.agency || site.technologies)"
                    class="site-meta-sep"
                  />
                  <!-- Tag agence -->
                  <span v-if="site.agency" class="site-tag site-tag--agency">{{ site.agency }}</span>
                  <!-- Badges technologie -->
                  <span v-for="tech in techTags(site)" :key="tech" class="site-tech-badge">
                    <img v-if="techIconUrl(tech)" :src="techIconUrl(tech)" width="11" height="11" :alt="tech">
                    {{ tech }}
                  </span>
                </div>
              </div>
              <div class="site-actions" @click.stop>
                <div v-if="hasSiteInfo(site)" class="info-wrap">
                  <button
                    class="icon-btn"
                    :class="{ active: openPopoverId === 's-' + site.id }"
                    title="Informations"
                    @click="togglePopover('s-' + site.id)"
                  >&#x2139;</button>
                  <div v-if="openPopoverId === 's-' + site.id" class="info-popover">
                    <div v-if="site.project_manager_id && pmById.get(site.project_manager_id)" class="info-row">
                      <span class="info-label">Cheffe de projet</span>
                      <span class="info-val">
                        {{ pmById.get(site.project_manager_id)!.first_name }}
                        {{ pmById.get(site.project_manager_id)!.last_name }}
                      </span>
                    </div>
                    <div v-if="site.dns_zone" class="info-row">
                      <span class="info-label">Zone DNS</span>
                      <span class="info-val">{{ site.dns_zone }}</span>
                    </div>
                    <div v-if="site.php_version" class="info-row">
                      <span class="info-label">PHP</span>
                      <span class="info-val">{{ site.php_version }}</span>
                    </div>
                    <div v-if="site.go_live_date" class="info-row">
                      <span class="info-label">Mise en ligne</span>
                      <span class="info-val">{{ site.go_live_date }}</span>
                    </div>
                    <div v-if="site.notes" class="info-row info-row--notes">
                      <span class="info-label">Notes</span>
                      <span class="info-val">{{ site.notes }}</span>
                    </div>
                  </div>
                </div>
                <button class="icon-btn" title="Modifier" @click="openEditSiteModal(site)">&#9998;</button>
                <button class="icon-btn del" title="Supprimer" @click="openDeleteSiteConfirm(site)">&#10005;</button>
              </div>
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
                <div class="site-meta">
                  <!-- Bouton URL -->
                  <a v-if="site.url" class="site-link-btn" :href="site.url"
                     target="_blank" rel="noopener noreferrer" title="Visiter le site">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
                         fill="none" stroke="currentColor" stroke-width="2"
                         stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                    </svg>
                  </a>
                  <!-- Bouton Back-office -->
                  <a v-if="site.bo_url" class="site-link-btn" :href="site.bo_url"
                     target="_blank" rel="noopener noreferrer" title="Back-office">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
                         fill="none" stroke="currentColor" stroke-width="2"
                         stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                    </svg>
                  </a>
                  <!-- Bouton GitLab -->
                  <a v-if="site.gitlab_url" class="site-link-btn site-link-btn--gitlab" :href="site.gitlab_url"
                     target="_blank" rel="noopener noreferrer" title="GitLab">
                    <img src="https://cdn.simpleicons.org/gitlab/FC6D26" width="13" height="13" alt="GitLab">
                  </a>
                  <!-- Séparateur visuel si liens ET tags -->
                  <span
                    v-if="(site.url || site.bo_url || site.gitlab_url) && (site.agency || site.technologies)"
                    class="site-meta-sep"
                  />
                  <!-- Tag agence -->
                  <span v-if="site.agency" class="site-tag site-tag--agency">{{ site.agency }}</span>
                  <!-- Badges technologie -->
                  <span v-for="tech in techTags(site)" :key="tech" class="site-tech-badge">
                    <img v-if="techIconUrl(tech)" :src="techIconUrl(tech)" width="11" height="11" :alt="tech">
                    {{ tech }}
                  </span>
                </div>
              </div>
              <div class="site-actions" @click.stop>
                <div v-if="hasSiteInfo(site)" class="info-wrap">
                  <button
                    class="icon-btn"
                    :class="{ active: openPopoverId === 's-' + site.id }"
                    title="Informations"
                    @click="togglePopover('s-' + site.id)"
                  >&#x2139;</button>
                  <div v-if="openPopoverId === 's-' + site.id" class="info-popover">
                    <div v-if="site.project_manager_id && pmById.get(site.project_manager_id)" class="info-row">
                      <span class="info-label">Cheffe de projet</span>
                      <span class="info-val">
                        {{ pmById.get(site.project_manager_id)!.first_name }}
                        {{ pmById.get(site.project_manager_id)!.last_name }}
                      </span>
                    </div>
                    <div v-if="site.dns_zone" class="info-row">
                      <span class="info-label">Zone DNS</span>
                      <span class="info-val">{{ site.dns_zone }}</span>
                    </div>
                    <div v-if="site.php_version" class="info-row">
                      <span class="info-label">PHP</span>
                      <span class="info-val">{{ site.php_version }}</span>
                    </div>
                    <div v-if="site.go_live_date" class="info-row">
                      <span class="info-label">Mise en ligne</span>
                      <span class="info-val">{{ site.go_live_date }}</span>
                    </div>
                    <div v-if="site.notes" class="info-row info-row--notes">
                      <span class="info-label">Notes</span>
                      <span class="info-val">{{ site.notes }}</span>
                    </div>
                  </div>
                </div>
                <button class="icon-btn" title="Modifier" @click="openEditSiteModal(site)">&#9998;</button>
                <button class="icon-btn del" title="Supprimer" @click="openDeleteSiteConfirm(site)">&#10005;</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Aucune donnée -->
        <div v-if="!groups?.length && !ungrouped.length" class="empty-state">
          Aucun site enregistré.
        </div>

      </div>
    </template>

    <!-- ── Modale confirmation suppression SERVEUR ───────────────── -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="deleteGroupTarget" class="modal-overlay" @click.self="closeDeleteGroupConfirm">
          <div class="modal-card">
            <h3 class="modal-title">Supprimer le serveur</h3>
            <p class="modal-msg">
              Supprimer <strong>{{ deleteGroupTarget.name }}</strong> ?
              Les sites associés seront détachés mais pas supprimés.
            </p>
            <p v-if="deleteGroupError" class="modal-error">{{ deleteGroupError }}</p>
            <div class="modal-btns">
              <button class="btn" :disabled="deleteGroupLoading" @click="closeDeleteGroupConfirm">
                Annuler
              </button>
              <button class="btn btn-danger" :disabled="deleteGroupLoading" @click="confirmDeleteGroup">
                <span v-if="deleteGroupLoading" class="spinner spinner-dark" />
                {{ deleteGroupLoading ? 'Suppression…' : 'Supprimer' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Modale édition SERVEUR ────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="editGroupTarget" class="modal-overlay" @click.self="closeEditGroupModal">
          <div class="modal-card">
            <h3 class="modal-title">Modifier le serveur</h3>
            <p v-if="editGroupError" class="modal-error">{{ editGroupError }}</p>
            <form @submit.prevent="saveGroupEdit">
              <div class="field">
                <label for="edit-group-name">Nom *</label>
                <input id="edit-group-name" v-model="editGroupForm.name" type="text" placeholder="Nom du serveur" required>
              </div>
              <div class="field">
                <label for="edit-group-hoster">Hébergeur</label>
                <input id="edit-group-hoster" v-model="editGroupForm.hoster" type="text" placeholder="OVH, Gandi…">
              </div>
              <div class="field">
                <label for="edit-group-ip-public">IP publique</label>
                <input id="edit-group-ip-public" v-model="editGroupForm.ip_public" type="text" placeholder="1.2.3.4">
              </div>
              <div class="field">
                <label for="edit-group-ip-local">IP locale</label>
                <input id="edit-group-ip-local" v-model="editGroupForm.ip_local" type="text" placeholder="192.168.x.x">
              </div>
              <div class="field">
                <label for="edit-group-web-server">Serveur web</label>
                <input id="edit-group-web-server" v-model="editGroupForm.web_server" type="text" placeholder="nginx, apache…">
              </div>
              <div class="modal-btns">
                <button type="button" class="btn" :disabled="editGroupLoading" @click="closeEditGroupModal">
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

    <!-- ── Modale confirmation suppression SITE ─────────────────── -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="deleteSiteTarget" class="modal-overlay" @click.self="closeDeleteSiteConfirm">
          <div class="modal-card">
            <h3 class="modal-title">Supprimer le site</h3>
            <p class="modal-msg">
              Supprimer <strong>{{ deleteSiteTarget.name }}</strong> définitivement ?
            </p>
            <p v-if="deleteSiteError" class="modal-error">{{ deleteSiteError }}</p>
            <div class="modal-btns">
              <button class="btn" :disabled="deleteSiteLoading" @click="closeDeleteSiteConfirm">
                Annuler
              </button>
              <button class="btn btn-danger" :disabled="deleteSiteLoading" @click="confirmDeleteSite">
                <span v-if="deleteSiteLoading" class="spinner spinner-dark" />
                {{ deleteSiteLoading ? 'Suppression…' : 'Supprimer' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Modale édition SITE ───────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="editSiteTarget" class="modal-overlay" @click.self="closeEditSiteModal">
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
                <label for="es-gitlab-url">GitLab</label>
                <input id="es-gitlab-url" v-model="editSiteForm.gitlab_url" type="text" placeholder="https://gitlab.com/…">
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
                <label for="es-tech">Technologies <span style="font-weight:400;color:var(--text-muted)">(séparées par des virgules)</span></label>
                <input id="es-tech" v-model="editSiteForm.technologies" type="text" placeholder="Vue, Nuxt, WordPress…">
              </div>
              <div class="field">
                <label for="es-notes">Notes</label>
                <textarea id="es-notes" v-model="editSiteForm.notes" class="field-input" placeholder="Informations complémentaires…" />
              </div>
              <div class="modal-btns">
                <button type="button" class="btn" :disabled="editSiteLoading" @click="closeEditSiteModal">
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
