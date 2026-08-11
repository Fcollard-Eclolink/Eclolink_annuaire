<script setup lang="ts" generic="T">
/**
 * Barre de recherche réutilisable.
 *
 * Usage :
 * <AppSearchBar
 *   v-model:query="searchQuery"
 *   v-model:results="filteredItems"
 *   :items="rawItems"
 *   :fields="['name', 'email', (item) => item.relatedThing.name]"
 *   placeholder="Rechercher"
 * />
 *
 * - `fields` accepte des clés directes (`keyof T`) ou des fonctions `(item) => string`
 *   pour les valeurs calculées (ex: nom du site via un Map lookup).
 * - Raccourci Ctrl+K + filtrage débounce 500ms.
 * - Émet en continu les résultats filtrés via `v-model:results`.
 */
type FieldGetter<T> = keyof T | ((item: T) => string)

const DEBOUNCE_MS = 500

const props = withDefaults(defineProps<{
  items       : T[]
  fields      : FieldGetter<T>[]
  placeholder?: string
}>(), {
  placeholder: 'Rechercher',
})

const query    = defineModel<string>('query',   { default: '' })
const results  = defineModel<T[]>('results',    { default: () => [] })
const inputRef = ref<HTMLInputElement | null>(null)

const isActive = computed((): boolean => query.value.trim().length > 0)

function getValue(item: T, field: FieldGetter<T>): string {
  if (typeof field === 'function') return field(item)
  const val = item[field]
  return val == null ? '' : String(val)
}

const searchQuery = ref<string>(query.value)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(query, (q: string): void => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  if (q === '') {
    searchQuery.value = ''
    return
  }
  debounceTimer = setTimeout((): void => {
    searchQuery.value = q
    debounceTimer = null
  }, DEBOUNCE_MS)
})

// watch (pas watchEffect) : `fields` peut changer de ref à chaque render parent
// (literal inline) → tracker provoquerait une boucle infinie.
function runFilter(): void {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) {
    results.value = props.items
    return
  }
  results.value = props.items.filter((item: T): boolean =>
    props.fields.some((field: FieldGetter<T>): boolean =>
      getValue(item, field).toLowerCase().includes(q),
    ),
  )
}

watch(
  [searchQuery, (): T[] => props.items],
  (): void => runFilter(),
  { immediate: true },
)

function clear(): void {
  query.value = ''
}

function focus(): void {
  inputRef.value?.focus()
}

function onGlobalKeydown(e: KeyboardEvent): void {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    focus()
  }
}

onMounted((): void => {
  document.addEventListener('keydown', onGlobalKeydown)
})

onUnmounted((): void => {
  document.removeEventListener('keydown', onGlobalKeydown)
  if (debounceTimer) clearTimeout(debounceTimer)
})

defineExpose({ focus, clear })
</script>

<template>
  <div class="search-bar-wrap">
    <svg class="search-bar-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14"
         viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
    </svg>
    <input
      ref="inputRef"
      v-model="query"
      type="text"
      :placeholder="placeholder"
      autocomplete="off"
      @keydown.escape="clear"
    >
    <button v-if="isActive" class="search-bar-clear" title="Effacer" @click="clear">&#10005;</button>
    <kbd v-else class="search-kbd">Ctrl K</kbd>
  </div>
</template>
