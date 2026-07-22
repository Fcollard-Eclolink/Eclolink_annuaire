<script setup lang="ts">
import type { ActivityLog } from '~/server/utils/types'
import '~/assets/css/logs.css'

definePageMeta({ middleware: 'auth' })

// Consultation réservée aux sysadmins et développeurs.
const { user } = useAuth()
const canView  = ['sysadmin', 'dev'].includes(user.value?.role ?? '')
if (!canView) await navigateTo('/')

// useRequestFetch : forwarde les cookies httpOnly lors du rendu SSR (sinon 401).
const requestFetch = useRequestFetch()

const ACTION_LABELS: Record<string, string> = {
  create: 'Création',
  update: 'Mise à jour',
  delete: 'Suppression',
}
const RESOURCE_LABELS: Record<string, string> = {
  maintenance       : 'Maintenance',
  client            : 'Client',
  site              : 'Site',
  group             : 'Serveur',
  technology        : 'Technologie',
  user              : 'Utilisateur',
  agency            : 'Agence',
  hoster            : 'Hébergeur',
  'web-server'      : 'Serveur web',
  'dns-provider'    : 'DNS',
  database          : 'Base de données',
  'maintenance-type': 'Type de maintenance',
}

const page    = ref(1)
const loading = ref(false)
const logs    = ref<ActivityLog[]>([])

async function fetchLogs(): Promise<void> {
  loading.value = true
  try {
    logs.value = await requestFetch<ActivityLog[]>(`/api/logs?page=${page.value}`)
  } finally {
    loading.value = false
  }
}

if (canView) await fetchLogs()

async function prevPage(): Promise<void> {
  if (page.value <= 1) return
  page.value--
  await fetchLogs()
}
async function nextPage(): Promise<void> {
  if (logs.value.length < 50) return
  page.value++
  await fetchLogs()
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="logs-page">
    <div class="logs-header">
      <h1 class="logs-title">Journal d'activité</h1>
      <p class="logs-hint">Conservé 2 mois · 50 entrées par page</p>
    </div>

    <div class="logs-table-wrap">
      <table class="logs-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Utilisateur</th>
            <th>Action</th>
            <th>Ressource</th>
            <th>Détail</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="5" class="logs-empty"><span class="spinner" /> Chargement…</td>
          </tr>
          <tr v-else-if="!logs.length">
            <td colspan="5" class="logs-empty">Aucune activité enregistrée.</td>
          </tr>
          <tr v-for="log in logs" :key="log.id" class="logs-row">
            <td class="logs-date">{{ formatDate(log.created_at) }}</td>
            <td class="logs-user">{{ log.user_email }}</td>
            <td>
              <span class="logs-action-badge" :data-action="log.action">
                {{ ACTION_LABELS[log.action] ?? log.action }}
              </span>
            </td>
            <td>{{ RESOURCE_LABELS[log.resource_type] ?? log.resource_type }}</td>
            <td class="logs-label">{{ log.resource_label ?? log.resource_id ?? '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="logs-pagination">
      <button class="btn" :disabled="page <= 1 || loading" @click="prevPage">← Précédent</button>
      <span class="logs-page-num">Page {{ page }}</span>
      <button class="btn" :disabled="logs.length < 50 || loading" @click="nextPage">Suivant →</button>
    </div>
  </div>
</template>
