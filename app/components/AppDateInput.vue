<script setup lang="ts">
const modelValue = defineModel<string>({ default: '' })
const datePickerRef = ref<HTMLInputElement | null>(null)

function openPicker(): void {
  datePickerRef.value?.showPicker?.()
}
</script>

<template>
  <div class="date-input-wrap">
    <input
      type="text"
      :value="modelValue"
      placeholder="AAAA-MM-JJ"
      @input="modelValue = ($event.target as HTMLInputElement).value"
    >
    <button type="button" class="date-cal-btn" title="Choisir une date" @click="openPicker">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
           fill="none" stroke="currentColor" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    </button>
    <!-- Input date caché, déclenché par le bouton calendrier -->
    <input
      ref="datePickerRef"
      type="date"
      :value="modelValue"
      class="date-hidden-picker"
      tabindex="-1"
      aria-hidden="true"
      @change="modelValue = ($event.target as HTMLInputElement).value"
    >
  </div>
</template>
