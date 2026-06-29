<script setup lang="ts">
import type { Agency, ProjectManager } from '~/server/utils/types'

export interface ClientForm {
  name                : string
  agency              : string
  contact_name        : string
  contact_email       : string
  contact_phone       : string
  notes               : string
  monthly_quota_hours : number | string
  monthly_amount      : number | string
  project_manager_id  : string
}

defineProps<{
  title             : string
  form              : ClientForm
  error             : string | null
  loading           : boolean
  agencies          : Agency[]
  projectManagers   : ProjectManager[]
  submitLabel       : string
  submitLoadingLabel: string
}>()

const emit = defineEmits<{ close: []; submit: [] }>()
</script>

<template>
  <div class="modal-overlay" v-modal-close="() => emit('close')">
    <div class="modal-card">
      <h3 class="modal-title">{{ title }}</h3>
      <p v-if="error" class="modal-error">{{ error }}</p>
      <form @submit.prevent="emit('submit')">
        <div class="field">
          <label>Nom *</label>
          <input v-model="form.name" type="text" required>
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
          <label>Cheffe de projet</label>
          <AppSelect
            v-model="form.project_manager_id"
            :options="projectManagers.map((pm: ProjectManager) => ({ value: pm.id, label: `${pm.first_name} ${pm.last_name}` }))"
            placeholder="— Aucune —"
          />
        </div>
        <div class="field">
          <label>Nom contact</label>
          <input v-model="form.contact_name" type="text">
        </div>
        <div class="field">
          <label>Email contact</label>
          <input v-model="form.contact_email" type="email">
        </div>
        <div class="field">
          <label>Téléphone contact</label>
          <input v-model="form.contact_phone" type="tel" placeholder="ex: 01 23 45 67 89">
        </div>
        <div class="field">
          <label>Quota mensuel (heures)</label>
          <input v-model.number="form.monthly_quota_hours" type="number" min="0" step="0.5" placeholder="ex: 40">
        </div>
        <div class="field">
          <label>Montant du forfait mensuel (€)</label>
          <input v-model.number="form.monthly_amount" type="number" min="0" step="0.01" placeholder="ex: 850">
        </div>
        <div class="field">
          <label>Notes</label>
          <textarea v-model="form.notes" class="field-input" rows="3" />
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
