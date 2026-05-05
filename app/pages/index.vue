<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { user, logout } = useAuth()

interface Group {
  id         : string
  name       : string
  hoster     : string | null
  ip_public  : string | null
  ip_local   : string | null
  web_server : string | null
}

interface Site {
  id                 : string
  name               : string
  url                : string | null
  bo_url             : string | null
  agency             : string | null
  group_id           : string | null
  notes              : string | null
}

// Chargement en parallèle
const [{ data: groups, error: errGroups }, { data: sites, error: errSites }] =
  await Promise.all([
    useFetch<Group[]>('/api/groups'),
    useFetch<Site[]>('/api/sites'),
  ])

const hasError = computed(() => errGroups.value || errSites.value)

// Sites indexés par group_id pour accès O(1)
const sitesByGroup = computed(() => {
  const map = new Map<string, Site[]>()
  if (!sites.value) return map
  for (const s of sites.value) {
    const key = s.group_id ?? '__none__'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(s)
  }
  // Tri alphabétique dans chaque groupe
  for (const list of map.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name, 'fr', { numeric: true }))
  }
  return map
})

const ungrouped = computed(() => sitesByGroup.value.get('__none__') ?? [])

// État ouvert/fermé de chaque groupe (tous ouverts par défaut)
const openGroups = ref<Set<string>>(new Set())

watch(groups, (list) => {
  if (!list) return
  for (const g of list) openGroups.value.add(g.id)
  if (ungrouped.value.length) openGroups.value.add('__none__')
}, { immediate: true })

function toggle(id: string) {
  if (openGroups.value.has(id)) openGroups.value.delete(id)
  else openGroups.value.add(id)
}

function siteCount(groupId: string) {
  return sitesByGroup.value.get(groupId)?.length ?? 0
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
        <div
          v-for="group in groups"
          :key="group.id"
          class="server-block"
        >
          <!-- En-tête cliquable -->
          <button
            class="server-header"
            :class="{ open: openGroups.has(group.id) }"
            @click="toggle(group.id)"
          >
            <span class="server-chevron">&#9654;</span>
            <span class="server-name">{{ group.name }}</span>
            <span class="server-count">{{ siteCount(group.id) }}</span>
          </button>

          <!-- Sites du serveur -->
          <div v-if="openGroups.has(group.id)" class="server-body">
            <div
              v-if="!sitesByGroup.has(group.id)"
              class="empty-group"
            >
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
        <div
          v-if="ungrouped.length"
          class="server-block"
        >
          <button
            class="server-header"
            :class="{ open: openGroups.has('__none__') }"
            @click="toggle('__none__')"
          >
            <span class="server-chevron">&#9654;</span>
            <span class="server-name muted">Sans serveur</span>
            <span class="server-count">{{ ungrouped.length }}</span>
          </button>
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

  </div>
</template>
