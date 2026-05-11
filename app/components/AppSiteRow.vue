<script setup lang="ts">
import type { Site, ProjectManager } from '~/server/utils/types'
import { techTags, techIconUrl, techIconSvg } from '~/composables/useTechBadge'

const props = defineProps<{
  site          : Site
  pmById        : Map<string, ProjectManager>
  highlightQuery?: string
  serverLabel   ?: string
}>()

const emit = defineEmits<{
  edit  : [site: Site]
  delete: [site: Site]
}>()

// ── Popover infos ─────────────────────────────────────────────────
const isInfoOpen = ref(false)
const wrapRef    = ref<HTMLElement | null>(null)

function toggleInfo(e: MouseEvent): void {
  e.stopPropagation()
  if (!isInfoOpen.value) {
    // Ferme tous les autres popovers site avant d'ouvrir celui-ci
    document.dispatchEvent(new CustomEvent('info-popover:close'))
  }
  isInfoOpen.value = !isInfoOpen.value
}

function onDocClick(e: MouseEvent): void {
  if (wrapRef.value && !wrapRef.value.contains(e.target as Node)) {
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

// ── Helpers ───────────────────────────────────────────────────────
const pm = computed(() =>
  props.site.project_manager_id
    ? (props.pmById.get(props.site.project_manager_id) ?? null)
    : null
)

function hasSiteInfo(site: Site): boolean {
  return !!(site.dns_zone || site.php_version || site.go_live_date || pm.value || site.notes)
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c),
  )
}

const highlightedName = computed((): string => {
  const escaped = escapeHtml(props.site.name)
  const q = props.highlightQuery?.trim()
  if (!q) return escaped
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return escaped.replace(re, '<mark class="search-hl">$1</mark>')
})
</script>

<template>
  <div class="site-row">
    <!-- Info principale -->
    <div class="site-info">
      <!-- eslint-disable-next-line vue/no-v-html -->
      <span class="site-name" v-html="highlightedName" />
      <div class="site-meta">
        <!-- Nom du serveur (visible en mode recherche) -->
        <span v-if="serverLabel" class="site-server-label">{{ serverLabel }}</span>
        <span v-if="serverLabel && (site.url || site.bo_url || site.gitlab_url || site.agency || site.technologies)"
              class="site-meta-sep" />
        <!-- URL -->
        <a v-if="site.url" class="site-link-btn" :href="site.url"
           target="_blank" rel="noopener noreferrer" title="Visiter le site">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
        </a>
        <!-- Back-office -->
        <a v-if="site.bo_url" class="site-link-btn" :href="site.bo_url"
           target="_blank" rel="noopener noreferrer" title="Back-office">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
          </svg>
        </a>
        <!-- GitLab -->
        <a v-if="site.gitlab_url" class="site-link-btn site-link-btn--gitlab" :href="site.gitlab_url"
           target="_blank" rel="noopener noreferrer" title="GitLab">
          <img src="https://cdn.simpleicons.org/gitlab/FC6D26" width="13" height="13" alt="GitLab">
        </a>
        <!-- Séparateur si liens ET tags -->
        <span
          v-if="!serverLabel && (site.url || site.bo_url || site.gitlab_url) && (site.agency || site.technologies)"
          class="site-meta-sep"
        />
        <!-- Agence -->
        <span v-if="site.agency" class="site-tag--agency">{{ site.agency }}</span>
        <!-- Technologies -->
        <span v-for="tech in techTags(site)" :key="tech" class="site-tech-badge">
          <img v-if="techIconUrl(tech)" :src="techIconUrl(tech)" width="11" height="11" :alt="tech"
               @error="($event.target as HTMLImageElement).style.display='none'">
          <!-- eslint-disable-next-line vue/no-v-html -->
          <span v-else-if="techIconSvg(tech)" class="tech-svg-icon" v-html="techIconSvg(tech)" />
          {{ tech }}
        </span>
      </div>
    </div>

    <!-- Actions droite -->
    <div class="site-actions" @click.stop>
      <!-- Popover ℹ -->
      <div v-if="hasSiteInfo(site)" ref="wrapRef" class="info-wrap">
        <button
          class="icon-btn"
          :class="{ active: isInfoOpen }"
          title="Informations"
          @click="toggleInfo"
        >&#x2139;</button>
        <div v-if="isInfoOpen" class="info-popover">
          <div v-if="pm" class="info-row">
            <span class="info-label">Cheffe de projet</span>
            <span class="info-val">{{ pm.first_name }} {{ pm.last_name }}</span>
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
      <button class="icon-btn" title="Modifier"   @click="emit('edit', site)">&#9998;</button>
      <button class="icon-btn del" title="Supprimer" @click="emit('delete', site)">&#10005;</button>
    </div>
  </div>
</template>
