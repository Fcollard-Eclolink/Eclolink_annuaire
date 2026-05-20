<script setup lang="ts">
import type { Hoster, WebServer } from '~/server/utils/types'
import type { GroupForm } from '~/composables/useGroupCrud'

defineProps<{
  title      : string
  form       : GroupForm
  error      : string | null
  loading    : boolean
  hosters    : Hoster[]
  webServers : WebServer[]
  submitLabel: string
  submitLoadingLabel: string
}>()

const emit = defineEmits<{ close: []; submit: [] }>()
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-card">
      <h3 class="modal-title">{{ title }}</h3>
      <p v-if="error" class="modal-error">{{ error }}</p>
      <form @submit.prevent="emit('submit')">
        <div class="field">
          <label>Nom *</label>
          <input v-model="form.name" type="text" placeholder="Nom du serveur" required>
        </div>
        <div class="field">
          <label>Hébergeur</label>
          <AppIconSelect
            v-model="form.hoster"
            :options="hosters.map((h: Hoster) => ({ value: h.name, label: h.name, slug: h.simpleicons_slug }))"
          />
        </div>
        <div class="field">
          <label>IP publique</label>
          <input v-model="form.ip_public" type="text" placeholder="1.2.3.4">
        </div>
        <div class="field">
          <label>IP locale</label>
          <input v-model="form.ip_local" type="text" placeholder="192.168.x.x">
        </div>
        <div class="field">
          <label>Serveur web</label>
          <AppIconSelect
            v-model="form.web_server"
            :options="webServers.map((ws: WebServer) => ({ value: ws.name, label: ws.name, slug: ws.simpleicons_slug }))"
          />
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
