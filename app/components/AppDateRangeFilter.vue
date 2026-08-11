<script setup lang="ts">
const from = defineModel<string>('from', { default: '' })
const to   = defineModel<string>('to',   { default: '' })

const isActive = computed((): boolean => !!from.value || !!to.value)

function clear(): void {
  from.value = ''
  to.value   = ''
}
</script>

<template>
  <div class="date-range-picker" :class="{ active: isActive }">
    <input v-model="from" type="date" :max="to || undefined">
    <span class="date-range-sep">→</span>
    <input v-model="to" type="date" :min="from || undefined">
    <button
      v-if="isActive"
      type="button"
      class="date-range-clear"
      title="Effacer le filtre date"
      @click="clear"
    >&#10005;</button>
  </div>
</template>
