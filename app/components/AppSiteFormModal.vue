<script setup lang="ts">
import type { Group, Client, Technology, Hoster, DnsProvider, Agency } from '~/server/utils/types'

export interface SiteEditForm {
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
  client_id         : string
  registrar         : string
  notes             : string
  has_maintenance   : boolean
  wp_api_key        : string
}

defineProps<{
  title             : string
  form              : SiteEditForm
  error             : string | null
  loading           : boolean
  groups            : Group[]
  clients           : Client[]
  agencies          : Agency[]
  technologies      : Technology[]
  hosters           : Hoster[]
  dnsProviders      : DnsProvider[]
  submitLabel       : string
  submitLoadingLabel: string
}>()

const emit = defineEmits<{ close: []; submit: [] }>()

function generateWpKey(): string {
  return crypto.randomUUID().replace(/-/g, '')
}
</script>

<template>
  <div class="modal-overlay" v-modal-close="() => emit('close')">
    <div class="modal-card modal-card--scroll" style="max-width:680px">
      <h3 class="modal-title">{{ title }}</h3>
      <form @submit.prevent="emit('submit')">
        <p v-if="error" class="modal-error">{{ error }}</p>
        <div class="site-form-grid">
          <div class="field field--full">
            <label>Nom *</label>
            <input v-model="form.name" type="text" placeholder="Nom du site" required>
          </div>
          <div class="field">
            <label>URL</label>
            <input v-model="form.url" type="text" placeholder="https://exemple.fr">
          </div>
          <div class="field">
            <label>Back-office</label>
            <input v-model="form.bo_url" type="text" placeholder="https://exemple.fr/admin">
          </div>
          <div class="field">
            <label>GitLab</label>
            <input v-model="form.gitlab_url" type="text" placeholder="https://gitlab.com/…">
          </div>
          <div class="field">
            <label>Agence</label>
            <AppSelect
              v-model="form.agency"
              :options="agencies.map((a: Agency) => ({ value: a.name, label: a.name }))"
              placeholder="— Aucune —"
            />
          </div>
          <div class="field">
            <label>Serveur</label>
            <AppSelect
              v-model="form.group_id"
              :options="groups.map((g: Group) => ({ value: g.id, label: g.name }))"
              placeholder="— Aucun —"
            />
          </div>
          <div class="field">
            <label>Client</label>
            <AppSelect
              v-model="form.client_id"
              :options="clients.map((c: Client) => ({ value: c.id, label: c.name }))"
              placeholder="— Aucun —"
            />
          </div>
          <div class="field">
            <label>Version PHP</label>
            <input v-model="form.php_version" type="text" placeholder="8.2">
          </div>
          <div class="field">
            <label>Mise en ligne</label>
            <input v-model="form.go_live_date" type="date">
          </div>
          <div class="field">
            <label>Zone DNS</label>
            <AppIconSelect
              v-model="form.dns_zone"
              :options="dnsProviders.map((d: DnsProvider) => ({ value: d.name, label: d.name, slug: d.simpleicons_slug }))"
            />
          </div>
          <div class="field">
            <label>Registrar</label>
            <AppIconSelect
              v-model="form.registrar"
              :options="hosters.map((h: Hoster) => ({ value: h.name, label: h.name, slug: h.simpleicons_slug }))"
            />
          </div>
          <div class="field field--full">
            <label>Technologies</label>
            <AppTechSelect v-model="form.technologies" :techs="technologies" />
          </div>
          <div class="field field--full">
            <label class="checkbox-row">
              <input v-model="form.has_maintenance" type="checkbox">
              <span>Sous contrat de maintenance</span>
            </label>
          </div>
          <div class="field field--full">
            <label>Clé API statut WordPress <span class="field-hint">(mu-plugin — voir docs/eclolink-status-plugin.php)</span></label>
            <div class="wp-key-row">
              <input v-model="form.wp_api_key" type="text" placeholder="Clé partagée à coller dans wp-config.php">
              <button type="button" class="btn" @click="form.wp_api_key = generateWpKey()">Générer</button>
            </div>
          </div>
          <div class="field field--full">
            <label>Notes</label>
            <textarea v-model="form.notes" class="field-input" placeholder="Informations complémentaires…" />
          </div>
        </div>
        <div class="modal-btns">
          <button type="button" class="btn" :disabled="loading" @click="emit('close')">Annuler</button>
          <button type="submit" class="btn primary" :disabled="loading">
            <span v-if="loading" class="spinner" />
            {{ loading ? submitLoadingLabel : submitLabel }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
