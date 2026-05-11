<script setup lang="ts">
defineProps<{
  title        : string
  loading      : boolean
  error       ?: string
  dangerLabel ?: string
  confirmLabel?: string   // si fourni → bouton primary au lieu de danger
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
        <button
          :class="['btn', confirmLabel ? 'primary' : 'btn-danger']"
          :disabled="loading"
          @click="emit('confirm')"
        >
          <span v-if="loading" class="spinner" :class="confirmLabel ? '' : 'spinner-dark'" />
          {{ loading ? (confirmLabel ? 'En cours…' : 'Suppression…') : (confirmLabel ?? dangerLabel ?? 'Supprimer') }}
        </button>
      </div>
    </div>
  </div>
</template>
