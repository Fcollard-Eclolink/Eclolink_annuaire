<script setup lang="ts">
const modelValue   = defineModel<string>({ default: '' })
const datePickerRef = ref<HTMLInputElement | null>(null)
const displayValue  = ref('')

function isoToDisplay(iso: string): string {
  if (!iso) return ''
  const p = iso.split('-')
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : ''
}

function displayToIso(display: string): string {
  const d = display.replace(/\D/g, '')
  return d.length === 8 ? `${d.slice(4,8)}-${d.slice(2,4)}-${d.slice(0,2)}` : ''
}

// Sync depuis le modèle (changement externe ou reset du formulaire)
watch(modelValue, (iso) => {
  if (displayToIso(displayValue.value) !== iso)
    displayValue.value = isoToDisplay(iso)
}, { immediate: true })

function onInput(e: Event): void {
  const input  = e.target as HTMLInputElement
  const digits = input.value.replace(/\D/g, '').slice(0, 8)

  let formatted = digits
  if (digits.length > 2) formatted = `${digits.slice(0,2)}/${digits.slice(2)}`
  if (digits.length > 4) formatted = `${digits.slice(0,2)}/${digits.slice(2,4)}/${digits.slice(4)}`

  displayValue.value = formatted
  input.value        = formatted
  modelValue.value   = displayToIso(formatted)
}

function onCalendarChange(e: Event): void {
  const iso = (e.target as HTMLInputElement).value
  modelValue.value  = iso
  displayValue.value = isoToDisplay(iso)
}

function openPicker(): void {
  datePickerRef.value?.showPicker?.()
}
</script>

<template>
  <div class="date-input-wrap">
    <input
      type="text"
      inputmode="numeric"
      :value="displayValue"
      placeholder="JJ/MM/AAAA"
      maxlength="10"
      @input="onInput"
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
    <input
      ref="datePickerRef"
      type="date"
      :value="modelValue"
      class="date-hidden-picker"
      tabindex="-1"
      aria-hidden="true"
      @change="onCalendarChange"
    >
  </div>
</template>
