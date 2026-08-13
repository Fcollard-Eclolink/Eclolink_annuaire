<script setup lang="ts">
import type { MelItem, Site, Group } from '~/server/utils/types'

const props = defineProps<{
  items    : MelItem[]
  site    ?: Site
  group   ?: Group
  loading  : boolean
}>()

const emit = defineEmits<{
  toggle: [item: MelItem]
}>()

/** Groupe une liste d'items par section, en préservant l'ordre d'apparition. */
function groupBySection(items: MelItem[]): { section: string; items: MelItem[] }[] {
  const groups: { section: string; items: MelItem[] }[] = []
  for (const item of items) {
    let group = groups.find(g => g.section === item.section)
    if (!group) { group = { section: item.section, items: [] }; groups.push(group) }
    group.items.push(item)
  }
  return groups
}

const todo = computed((): { section: string; items: MelItem[] }[] =>
  groupBySection(props.items.filter(i => !i.is_done)),
)
const done = computed((): { section: string; items: MelItem[] }[] =>
  groupBySection(props.items.filter(i => i.is_done)),
)
</script>

<template>
  <div class="mel-detail">
    <template v-if="loading">
      <p class="mel-detail-loading">Chargement…</p>
    </template>
    <template v-else>
      <h2 class="mel-detail-title">{{ site?.name ?? '— Site supprimé —' }}</h2>

      <div class="mel-detail-links">
        <a v-if="safeHref(site?.url)" class="site-link-btn" :href="safeHref(site?.url)"
           target="_blank" rel="noopener noreferrer" title="Visiter le site">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
        </a>
        <a v-if="safeHref(site?.bo_url)" class="site-link-btn" :href="safeHref(site?.bo_url)"
           target="_blank" rel="noopener noreferrer" title="Back-office">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
               fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
          </svg>
        </a>
        <a v-if="safeHref(site?.gitlab_url)" class="site-link-btn site-link-btn--gitlab" :href="safeHref(site?.gitlab_url)"
           target="_blank" rel="noopener noreferrer" title="GitLab">
          <img src="https://cdn.simpleicons.org/gitlab/FC6D26" width="13" height="13" alt="GitLab">
        </a>
      </div>

      <div class="mel-detail-server">
        <div v-if="group" class="info-row"><span class="info-label">Serveur</span><span class="info-val">{{ group.name }}</span></div>
        <div v-if="site?.php_version" class="info-row"><span class="info-label">PHP</span><span class="info-val">{{ site.php_version }}</span></div>
      </div>

      <div class="mel-detail-body">
        <div class="mel-detail-column">
          <h3 class="mel-detail-column-title">Reste à faire ({{ items.filter(i => !i.is_done).length }})</h3>
          <p v-if="!todo.length" class="mel-detail-empty">🎉 Tout est fait.</p>
          <div v-for="group in todo" :key="group.section" class="mel-detail-section">
            <h4 class="mel-detail-section-title">{{ group.section }}</h4>
            <label v-for="item in group.items" :key="item.id" class="mel-detail-item">
              <input type="checkbox" :checked="item.is_done" @change="emit('toggle', item)">
              <span>{{ item.label }}</span>
            </label>
          </div>
        </div>

        <div class="mel-detail-column">
          <h3 class="mel-detail-column-title">Déjà fait ({{ items.filter(i => i.is_done).length }})</h3>
          <p v-if="!done.length" class="mel-detail-empty">Rien de fait pour l'instant.</p>
          <div v-for="group in done" :key="group.section" class="mel-detail-section">
            <h4 class="mel-detail-section-title">{{ group.section }}</h4>
            <label v-for="item in group.items" :key="item.id" class="mel-detail-item mel-detail-item--done">
              <input type="checkbox" :checked="item.is_done" @change="emit('toggle', item)">
              <span>{{ item.label }}</span>
            </label>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
