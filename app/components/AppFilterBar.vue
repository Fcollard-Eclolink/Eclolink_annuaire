<script lang="ts">
import type { FilterOption } from '~/components/AppFilterSelect.vue'

export interface FilterDef<T> {
  key    : string
  label  : string
  options: FilterOption[]
  /** Renvoie `true` si l'item passe ce filtre. Reçoit les ids sélectionnés. */
  match  : (item: T, selectedIds: string[]) => boolean
}
</script>

<script setup lang="ts" generic="T">
/**
 * Barre de filtres réutilisable.
 *
 * Usage :
 * <AppFilterBar
 *   v-model:results="filtered"
 *   :items="searched"
 *   :filters="[
 *     { key: 'agency', label: 'Agence', options: agencyOpts,
 *       match: (c, ids) => ids.includes(c.agency ?? '') },
 *     { key: 'maintenance', label: 'Maintenance', options: maintOpts,
 *       match: (c, ids) => ids.some(id => clientTypes.get(c.id)?.has(id)) },
 *   ]"
 * />
 *
 * - Chaque filtre déclare son propre matcher → la combinaison est en AND
 *   inter-filtres, OR intra-filtre (selon ce que fait le matcher).
 * - Le bouton "Réinitialiser" apparaît dès qu'au moins un filtre est actif.
 */
const props = defineProps<{
  items      : T[]
  filters    : FilterDef<T>[]
  resetLabel?: string
}>()

const results    = defineModel<T[]>('results', { default: () => [] })
const selections = ref<Record<string, string[]>>({})

const hasActive = computed((): boolean =>
  Object.values(selections.value).some((v: string[]): boolean => v.length > 0),
)

watchEffect((): void => {
  results.value = props.items.filter((item: T): boolean =>
    props.filters.every((f: FilterDef<T>): boolean => {
      const selected = selections.value[f.key] ?? []
      if (!selected.length) return true
      return f.match(item, selected)
    }),
  )
})

function selectionFor(key: string): string[] {
  return selections.value[key] ?? []
}

function updateSelection(key: string, value: string[]): void {
  selections.value = { ...selections.value, [key]: value }
}

function clear(): void {
  selections.value = {}
}

defineExpose({ clear })
</script>

<template>
  <div class="filters-row">
    <div class="filters-left">
      <AppFilterSelect
        v-for="f in filters"
        :key="f.key"
        :model-value="selectionFor(f.key)"
        :label="f.label"
        :options="f.options"
        @update:model-value="updateSelection(f.key, $event)"
      />
      <!-- Slot pour ajouter des contrôles personnalisés (toggle, checkbox, etc.) -->
      <slot name="after" />
      <button v-if="hasActive" class="btn" @click="clear">
        {{ resetLabel ?? 'Réinitialiser' }}
      </button>
    </div>
  </div>
</template>
