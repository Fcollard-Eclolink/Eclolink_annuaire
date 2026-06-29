<script setup lang="ts">
/**
 * Champ date avec saisie masquée (JJ/MM/AAAA) + bouton calendrier qui ouvre
 * le même popover custom que AppDateRangeFilter (style unifié).
 *
 * v-model attend une chaîne ISO (YYYY-MM-DD) ou ''.
 */
const modelValue = defineModel<string>({ default: '' })

const displayValue = ref<string>('')
const isOpen       = ref(false)
const viewedMonth  = ref<Date>(new Date())
const wrapRef      = ref<HTMLElement | null>(null)

function isoToDisplay(iso: string): string {
  if (!iso) return ''
  const p = iso.split('-')
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : ''
}

function displayToIso(display: string): string {
  const d = display.replace(/\D/g, '')
  return d.length === 8 ? `${d.slice(4,8)}-${d.slice(2,4)}-${d.slice(0,2)}` : ''
}

// Sync depuis le modèle (changement externe / reset du formulaire)
watch(modelValue, (iso: string): void => {
  if (displayToIso(displayValue.value) !== iso) displayValue.value = isoToDisplay(iso)
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

function open(): void {
  if (modelValue.value) {
    const [y, m] = modelValue.value.split('-')
    viewedMonth.value = new Date(Number(y), Number(m) - 1, 1)
  } else {
    viewedMonth.value = new Date()
  }
  isOpen.value = true
}
function close(): void { isOpen.value = false }

function selectDay(iso: string): void {
  modelValue.value = iso
  isOpen.value     = false
}

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function selectToday(): void {
  selectDay(todayIso())
}

function onDocClick(e: MouseEvent): void {
  if (wrapRef.value && !wrapRef.value.contains(e.target as Node)) close()
}

onMounted (() => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <div ref="wrapRef" class="date-input-wrap">
    <input
      type="text"
      inputmode="numeric"
      :value="displayValue"
      placeholder="JJ/MM/AAAA"
      maxlength="10"
      @input="onInput"
    >
    <button
      type="button"
      class="date-cal-btn"
      :class="{ active: isOpen }"
      title="Choisir une date"
      @click.stop="isOpen ? close() : open()"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
           fill="none" stroke="currentColor" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    </button>

    <div v-if="isOpen" class="calendar-popover" @click.stop>
      <div class="calendar-popover-presets">
        <button type="button" class="calendar-popover-preset" @click="selectToday">Aujourd'hui</button>
      </div>
      <AppCalendarGrid
        v-model:month="viewedMonth"
        :from="modelValue"
        :to="modelValue"
        @select="selectDay"
      />
    </div>
  </div>
</template>
