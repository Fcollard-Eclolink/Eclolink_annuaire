<script setup lang="ts">
defineProps<{
  title      : string
  loading    : boolean
  error     ?: string
  dangerLabel?: string
}>()

const emit = defineEmits<{
  confirm: []
  cancel : []
}>()
</script>

<template>
  <div class="modal-overlay" @click.self="emit('cancel')">
    <div class="modal-card">
      <h3 class="modal-title">{{ title }}</h3>
      <slot />
      <p v-if="error" class="modal-error">{{ error }}</p>
      <div class="modal-btns">
        <button class="btn" :disabled="loading" @click="emit('cancel')">
          Annuler
        </button>
        <button class="btn btn-danger" :disabled="loading" @click="emit('confirm')">
          <span v-if="loading" class="spinner spinner-dark" />
          {{ loading ? 'Suppression…' : (dangerLabel ?? 'Supprimer') }}
        </button>
      </div>
    </div>
  </div>
</template>
