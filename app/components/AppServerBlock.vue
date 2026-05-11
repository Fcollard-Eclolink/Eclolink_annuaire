<script setup lang="ts">
import type { Group, Site, ProjectManager } from '~/server/utils/types'
import { HOSTERS, WEB_SERVERS } from '~/utils/selectOptions'

const props = defineProps<{
  group          : Group
  sites          : Site[]
  pmById         : Map<string, ProjectManager>
  defaultOpen   ?: boolean
  nameIsMuted   ?: boolean
  expandAllTick ?: number
  collapseAllTick?: number
}>()

const emit = defineEmits<{
  'edit-group'  : [group: Group]
  'delete-group': [group: Group]
  'edit-site'   : [site: Site]
  'delete-site' : [site: Site]
}>()

// ── Expansion avec persistance localStorage (scoped par user) ─────
const { load: loadExpand, isOpen: isGroupOpen, setOpen, toggle: toggleGroup } = useServerExpand()

onMounted(loadExpand)

const isOpen = computed(() => isGroupOpen(props.group.id))
function toggle(): void { toggleGroup(props.group.id) }

watch(() => props.expandAllTick,   () => { setOpen(props.group.id, true)  })
watch(() => props.collapseAllTick, () => { setOpen(props.group.id, false) })

// ── Popover infos serveur ─────────────────────────────────────────
const isInfoOpen  = ref(false)
const infoWrapRef = ref<HTMLElement | null>(null)

function toggleInfo(e: MouseEvent): void {
  e.stopPropagation()
  if (!isInfoOpen.value) {
    // Ferme tous les autres popovers (serveurs + sites) avant d'ouvrir
    document.dispatchEvent(new CustomEvent('info-popover:close'))
  }
  isInfoOpen.value = !isInfoOpen.value
}

function onDocClick(e: MouseEvent): void {
  if (infoWrapRef.value && !infoWrapRef.value.contains(e.target as Node)) {
    isInfoOpen.value = false
  }
}

function onCloseAll(): void {
  isInfoOpen.value = false
}

onMounted(() => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('info-popover:close', onCloseAll as EventListener)
})
onUnmounted(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('info-popover:close', onCloseAll as EventListener)
})

// ── Ouvrir tous les sites ─────────────────────────────────────────
const isOpenAllOpen  = ref(false)
const sitesWithUrl   = computed(() => props.sites.filter(s => s.url))

function openAllSites(): void {
  isOpenAllOpen.value = false
  for (const site of sitesWithUrl.value) {
    const a = document.createElement('a')
    a.href       = site.url!
    a.target     = '_blank'
    a.rel        = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }
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
  } catch { /* ignore */ }
}

// ── Helpers ───────────────────────────────────────────────────────
function hasGroupInfo(g: Group): boolean {
  return !!(g.hoster || g.ip_public || g.ip_local || g.web_server)
}

function webServerKey(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('nginx'))     return 'nginx'
  if (n.includes('apache'))    return 'apache'
  if (n.includes('caddy'))     return 'caddy'
  if (n.includes('litespeed')) return 'litespeed'
  if (n.includes('iis'))       return 'iis'
  return 'other'
}

function logoSlug(name: string, list: { label: string; slug: string }[]): string | null {
  const n = name.toLowerCase()
  return list.find(o => o.label.toLowerCase() === n)?.slug ?? null
}
</script>

<template>
  <div class="server-block">
    <!-- En-tête -->
    <div class="server-header-row">
      <button class="server-toggle" :class="{ open: isOpen }" @click="toggle">
        <span class="server-chevron">&#9654;</span>
        <span class="server-name" :class="{ muted: nameIsMuted }">{{ group.name }}</span>
        <span class="server-count">{{ sites.length }}</span>
      </button>

      <div class="server-actions" @click.stop>
        <!-- Popover ℹ -->
        <div v-if="hasGroupInfo(group)" ref="infoWrapRef" class="info-wrap">
          <button
            class="icon-btn"
            :class="{ active: isInfoOpen }"
            title="Informations"
            @click="toggleInfo"
          >&#x2139;</button>

          <div v-if="isInfoOpen" class="info-popover">
            <div v-if="group.hoster" class="info-row">
              <span class="info-label">Hébergeur</span>
              <span class="info-val-wrap">
                <img
                  v-if="logoSlug(group.hoster, HOSTERS)"
                  :src="`https://cdn.simpleicons.org/${logoSlug(group.hoster, HOSTERS)}`"
                  width="13" height="13" :alt="group.hoster"
                  @error="($event.target as HTMLImageElement).style.display='none'"
                >
                <span class="info-val">{{ group.hoster }}</span>
              </span>
            </div>
            <div v-if="group.ip_public" class="info-row">
              <span class="info-label">IP publique</span>
              <div class="info-val-wrap">
                <span class="info-val">{{ group.ip_public }}</span>
                <button
                  class="copy-btn" :class="{ copied: copiedField === 'pub' }"
                  title="Copier" @click.stop="copyIp(group.ip_public!, 'pub')"
                >
                  <svg v-if="copiedField !== 'pub'"
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
                  class="copy-btn" :class="{ copied: copiedField === 'loc' }"
                  title="Copier" @click.stop="copyIp(group.ip_local!, 'loc')"
                >
                  <svg v-if="copiedField !== 'loc'"
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
                <img
                  v-if="logoSlug(group.web_server, WEB_SERVERS)"
                  :src="`https://cdn.simpleicons.org/${logoSlug(group.web_server, WEB_SERVERS)}`"
                  width="12" height="12" :alt="group.web_server"
                  @error="($event.target as HTMLImageElement).style.display='none'"
                >
                {{ group.web_server }}
              </span>
            </div>
          </div>
        </div>

        <!-- Ouvrir tous les sites -->
        <button
          v-if="sitesWithUrl.length"
          class="icon-btn"
          title="Ouvrir tous les sites"
          @click="isOpenAllOpen = true"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
        </button>

        <button class="icon-btn" title="Modifier"    @click="emit('edit-group', group)">&#9998;</button>
        <button class="icon-btn del" title="Supprimer" @click="emit('delete-group', group)">&#10005;</button>
      </div>
    </div>

    <!-- Sites -->
    <div v-if="isOpen" class="server-body">
      <div v-if="!sites.length" class="empty-group">Aucun site dans ce serveur.</div>
      <AppSiteRow
        v-for="site in sites"
        :key="site.id"
        :site="site"
        :pm-by-id="pmById"
        @edit="emit('edit-site', $event)"
        @delete="emit('delete-site', $event)"
      />
    </div>
  </div>

  <!-- Modale confirmation ouvrir tous les sites -->
  <Teleport to="body">
    <Transition name="modal">
      <AppConfirmModal
        v-if="isOpenAllOpen"
        title="Ouvrir tous les sites"
        :loading="false"
        confirm-label="Ouvrir"
        @confirm="openAllSites"
        @cancel="isOpenAllOpen = false"
      >
        <p class="modal-msg">
          Ouvrir <strong>{{ sitesWithUrl.length }}</strong>
          site{{ sitesWithUrl.length > 1 ? 's' : '' }} de
          <strong>{{ group.name }}</strong> dans de nouveaux onglets ?
        </p>
      </AppConfirmModal>
    </Transition>
  </Teleport>
</template>
