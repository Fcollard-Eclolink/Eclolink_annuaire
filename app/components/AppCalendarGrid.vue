<script setup lang="ts">
/**
 * Grille de calendrier pure (sans popover, sans trigger).
 *
 * Le parent contrôle :
 * - `v-model:month` : le mois affiché (Date arbitraire dans ce mois)
 * - `:from`, `:to`  : ISO YYYY-MM-DD des bornes de la sélection (peut être identiques)
 * - `:pending`      : ISO d'un jour en attente (1er clic d'une plage non finalisée)
 *
 * Émet `select(iso)` à chaque clic sur un jour. La logique de sélection
 * (single / range / pending) est laissée au parent.
 */
const props = defineProps<{
  from   ?: string
  to     ?: string
  pending?: string
}>()

const month = defineModel<Date>('month', { default: () => new Date() })

const emit = defineEmits<{ select: [iso: string] }>()

const WEEKDAYS = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di']

function dateToIso(d: Date): string {
  const y   = d.getFullYear()
  const m   = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const monthLabel = computed((): string =>
  month.value.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
)

interface DayCell { iso: string; day: number; inMonth: boolean; isToday: boolean }

const weeks = computed((): DayCell[][] => {
  const year       = month.value.getFullYear()
  const monthIdx   = month.value.getMonth()
  const firstDay   = new Date(year, monthIdx, 1)
  const startOff   = (firstDay.getDay() + 6) % 7  // lundi = 0
  const start      = new Date(year, monthIdx, 1 - startOff)
  const todayIso   = dateToIso(new Date())

  const result: DayCell[][] = []
  for (let w = 0; w < 6; w++) {
    const week: DayCell[] = []
    for (let d = 0; d < 7; d++) {
      const dt = new Date(start)
      dt.setDate(start.getDate() + w * 7 + d)
      const iso = dateToIso(dt)
      week.push({ iso, day: dt.getDate(), inMonth: dt.getMonth() === monthIdx, isToday: iso === todayIso })
    }
    result.push(week)
  }
  return result
})

function isStart  (iso: string): boolean { return !!props.from && iso === props.from }
function isEnd    (iso: string): boolean { return !!props.to   && iso === props.to }
function isPending(iso: string): boolean { return iso === props.pending }
function isInRange(iso: string): boolean {
  if (!props.from || !props.to) return false
  return iso > props.from && iso < props.to
}

function prevMonth(): void {
  const d = new Date(month.value)
  d.setMonth(d.getMonth() - 1)
  month.value = d
}
function nextMonth(): void {
  const d = new Date(month.value)
  d.setMonth(d.getMonth() + 1)
  month.value = d
}
</script>

<template>
  <div class="calendar-grid">
    <!-- Navigation mois -->
    <div class="calendar-grid-month">
      <button type="button" class="calendar-grid-nav" title="Mois précédent" @click="prevMonth">‹</button>
      <span class="calendar-grid-month-label">{{ monthLabel }}</span>
      <button type="button" class="calendar-grid-nav" title="Mois suivant" @click="nextMonth">›</button>
    </div>

    <!-- En-tête jours de la semaine -->
    <div class="calendar-grid-weekdays">
      <span v-for="(w, i) in WEEKDAYS" :key="i">{{ w }}</span>
    </div>

    <!-- Grille des jours -->
    <div class="calendar-grid-days">
      <template v-for="(week, wi) in weeks" :key="wi">
        <button
          v-for="day in week"
          :key="day.iso"
          type="button"
          class="calendar-grid-day"
          :class="{
            'out-month' : !day.inMonth,
            'is-today'  : day.isToday,
            'is-start'  : isStart(day.iso),
            'is-end'    : isEnd(day.iso),
            'in-range'  : isInRange(day.iso),
            'is-pending': isPending(day.iso) && !to,
          }"
          @click="emit('select', day.iso)"
        >{{ day.day }}</button>
      </template>
    </div>
  </div>
</template>
