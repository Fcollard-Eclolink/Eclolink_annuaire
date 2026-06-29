<script setup lang="ts">
/**
 * Filtre par plage de dates — bouton qui ouvre un calendrier popover.
 *
 * - 1er clic sur un jour → définit le début (en attente d'un 2e clic)
 * - 2e clic → définit la fin (auto-swap si avant) ou plage = ce seul jour si même jour
 * - Presets : aujourd'hui, 7 derniers jours, ce mois
 */
const from = defineModel<string>('from', { default: '' })
const to   = defineModel<string>('to',   { default: '' })

const isOpen       = ref(false)
const viewedMonth  = ref<Date>(new Date())
const pendingStart = ref<string | null>(null)
const wrapRef      = ref<HTMLElement | null>(null)

function dateToIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function isoToDisplay(iso: string): string {
  if (!iso) return ''
  const p = iso.split('-')
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : ''
}

const buttonLabel = computed((): string => {
  if (!from.value && !to.value) return 'Toutes dates'
  if (from.value && from.value === to.value) return isoToDisplay(from.value)
  return `${isoToDisplay(from.value) || '…'} → ${isoToDisplay(to.value) || '…'}`
})

const isActive = computed((): boolean => !!from.value || !!to.value)

function selectDay(iso: string): void {
  if (pendingStart.value === null) {
    pendingStart.value = iso
    from.value         = iso
    to.value           = ''
  } else {
    const a = pendingStart.value
    if (a <= iso) { from.value = a;   to.value = iso }
    else          { from.value = iso; to.value = a   }
    pendingStart.value = null
    isOpen.value       = false
  }
}

function open(): void {
  pendingStart.value = null
  if (from.value) {
    const [y, m] = from.value.split('-')
    viewedMonth.value = new Date(Number(y), Number(m) - 1, 1)
  } else {
    viewedMonth.value = new Date()
  }
  isOpen.value = true
}
function close(): void {
  isOpen.value       = false
  pendingStart.value = null
}

function clear(): void {
  from.value = ''
  to.value   = ''
  pendingStart.value = null
}

function preset(p: 'today' | '7d' | 'month'): void {
  const today = new Date()
  const todayIso = dateToIso(today)
  if (p === 'today') {
    from.value = todayIso; to.value = todayIso
  } else if (p === '7d') {
    const s = new Date(today); s.setDate(today.getDate() - 6)
    from.value = dateToIso(s); to.value = todayIso
  } else {
    const s = new Date(today.getFullYear(), today.getMonth(), 1)
    from.value = dateToIso(s); to.value = todayIso
  }
  pendingStart.value = null
  isOpen.value       = false
}

function onDocClick(e: MouseEvent): void {
  if (wrapRef.value && !wrapRef.value.contains(e.target as Node)) close()
}

onMounted (() => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <div ref="wrapRef" class="date-range-picker" :class="{ open: isOpen, active: isActive }">
    <button type="button" class="date-range-trigger" @click.stop="isOpen ? close() : open()">
      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
           fill="none" stroke="currentColor" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
      <span class="date-range-trigger-label">{{ buttonLabel }}</span>
      <span
        v-if="isActive"
        class="date-range-clear"
        role="button"
        title="Effacer le filtre date"
        @click.stop="clear"
      >&#10005;</span>
    </button>

    <div v-if="isOpen" class="calendar-popover" @click.stop>
      <div class="calendar-popover-presets">
        <button type="button" class="calendar-popover-preset" @click="preset('today')">Aujourd'hui</button>
        <button type="button" class="calendar-popover-preset" @click="preset('7d')">7 derniers jours</button>
        <button type="button" class="calendar-popover-preset" @click="preset('month')">Ce mois</button>
      </div>

      <AppCalendarGrid
        v-model:month="viewedMonth"
        :from="from"
        :to="to"
        :pending="pendingStart ?? undefined"
        @select="selectDay"
      />
    </div>
  </div>
</template>
