<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { user, logout } = useAuth()

interface Site {
  id                 : string
  name               : string
  url                : string | null
  bo_url             : string | null
  groupId            : string | null
  agency             : string | null
  notes              : string | null
}

const { data: sites, status, error, refresh } = await useFetch<Site[]>('/api/sites')
</script>

<template>
  <div class="app-wrap">

    <header class="app-header">
      <h1>Annuaire des serveurs</h1>
      <div style="display:flex;align-items:center;gap:12px">
        <span style="font-size:13px;color:var(--text-muted)">{{ user?.email }}</span>
        <button class="btn" @click="logout">Déconnexion</button>
      </div>
    </header>

    <!-- Chargement -->
    <div v-if="status === 'pending'" class="empty-state">Chargement…</div>

    <!-- Erreur -->
    <div v-else-if="error" class="load-error">
      Impossible de charger les sites.<br>
      <button class="btn" style="margin-top:12px" @click="refresh">Réessayer</button>
    </div>

    <!-- Liste -->
    <template v-else>
      <div v-if="!sites?.length" class="empty-state">
        Aucun site enregistré.
      </div>

      <div v-else class="sites-list">
        <div v-for="site in sites" :key="site.id" class="site-card">
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
          <span v-if="site.agency" style="font-size:12px;color:var(--text-muted);flex-shrink:0">
            {{ site.agency }}
          </span>
        </div>
      </div>
    </template>

  </div>
</template>
