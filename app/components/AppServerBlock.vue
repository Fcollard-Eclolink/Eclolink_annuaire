<script setup lang="ts">
import type { Group, Site, ProjectManager } from '~/server/utils/types'

const props = defineProps<{
  group      : Group
  sites      : Site[]
  pmById     : Map<string, ProjectManager>
  defaultOpen?: boolean
  nameIsMuted?: boolean
}>()

const emit = defineEmits<{
  'edit-group'  : [group: Group]
  'delete-group': [group: Group]
  'edit-site'   : [site: Site]
  'delete-site' : [site: Site]
}>()

// ── Expansion ─────────────────────────────────────────────────────
const isOpen = ref(props.defaultOpen ?? true)
function toggle(): void { isOpen.value = !isOpen.value }

// ── Popover infos serveur ─────────────────────────────────────────
const isInfoOpen = ref(false)
const infoWrapRef = ref<HTMLElement | null>(null)

function toggleInfo(e: MouseEvent): void {
  e.stopPropagation()
  isInfoOpen.value = !isInfoOpen.value
}

function onDocClick(e: MouseEvent): void {
  if (infoWrapRef.value && !infoWrapRef.value.contains(e.target as Node)) {
    isInfoOpen.value = false
  }
}

onMounted(()  => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))

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
</script>

<template>
  <div class="server-block">
    <!-- En-tête -->
    <div class="server-header-row">
      <button class="server-toggle" :class="{ open: isOpen }" @click="toggle">
        <span class="server-chevron">&#9654;</span>
        <span class="server-name" :class="{ muted: nameIsMuted }">
          {{ group.name }}
        </span>
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
              <span class="info-val">{{ group.hoster }}</span>
            </div>
            <div v-if="group.ip_public" class="info-row">
              <span class="info-label">IP publique</span>
              <div class="info-val-wrap">
                <span class="info-val">{{ group.ip_public }}</span>
                <button
                  class="copy-btn"
                  :class="{ copied: copiedField === 'pub' }"
                  title="Copier"
                  @click.stop="copyIp(group.ip_public!, 'pub')"
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
                  class="copy-btn"
                  :class="{ copied: copiedField === 'loc' }"
                  title="Copier"
                  @click.stop="copyIp(group.ip_local!, 'loc')"
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
                {{ group.web_server }}
              </span>
            </div>
          </div>
        </div>

        <button class="icon-btn" title="Modifier"   @click="emit('edit-group', group)">&#9998;</button>
        <button class="icon-btn del" title="Supprimer" @click="emit('delete-group', group)">&#10005;</button>
      </div>
    </div>

    <!-- Sites -->
    <div v-if="isOpen" class="server-body">
      <div v-if="!sites.length" class="empty-group">
        Aucun site dans ce serveur.
      </div>
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
</template>
