<script setup lang="ts">
import type { Group, ProjectManager, Client, Technology, Hoster, DnsProvider } from '~/server/utils/types'
import type { SiteEditForm } from '~/composables/useSiteCrud'

defineProps<{
  title             : string
  form              : SiteEditForm
  error             : string | null
  loading           : boolean
  groups            : Group[]
  projectManagers   : ProjectManager[]
  clients           : Client[]
  technologies      : Technology[]
  hosters           : Hoster[]
  dnsProviders      : DnsProvider[]
  submitLabel       : string
  submitLoadingLabel: string
}>()

const emit = defineEmits<{ close: []; submit: [] }>()
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-card modal-card--scroll" style="max-width:520px">
      <h3 class="modal-title">{{ title }}</h3>
      <form @submit.prevent="emit('submit')">
        <p v-if="error" class="modal-error">{{ error }}</p>
        <div class="field">
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
          <input v-model="form.agency" type="text" placeholder="Eclolink…">
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
          <label>Cheffe de projet</label>
          <AppSelect
            v-model="form.project_manager_id"
            :options="projectManagers.map((pm: ProjectManager) => ({ value: pm.id, label: `${pm.first_name} ${pm.last_name}` }))"
            placeholder="— Aucune —"
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
        <div class="field">
          <label>Mise en ligne</label>
          <AppDateInput v-model="form.go_live_date" />
        </div>
        <div class="field">
          <label>Technologies</label>
          <AppTechSelect v-model="form.technologies" :techs="technologies" />
        </div>
        <div class="field">
          <label>Notes</label>
          <textarea v-model="form.notes" class="field-input" placeholder="Informations complémentaires…" />
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
