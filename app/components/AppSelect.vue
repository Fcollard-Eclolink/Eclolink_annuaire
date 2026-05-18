<script setup lang="ts">
const props = defineProps<{
  options    : { value: string; label: string }[]
  placeholder?: string
  searchable ?: boolean
}>()

const modelValue = defineModel<string>({ default: '' })
const isOpen     = ref(false)
const query      = ref('')
const wrapRef    = ref<HTMLElement | null>(null)
const searchRef  = ref<HTMLInputElement | null>(null)

const selected = computed(() =>
  props.options.find(o => o.value === modelValue.value) ?? null,
)

const filteredOptions = computed(() => {
  if (!props.searchable || !query.value.trim()) return props.options
  const q = query.value.trim().toLowerCase()
  return props.options.filter(o => o.label.toLowerCase().includes(q))
})

function open(): void {
  isOpen.value = true
  query.value  = ''
  nextTick(() => searchRef.value?.focus())
}

function select(value: string): void {
  modelValue.value = value
  isOpen.value     = false
  query.value      = ''
}

function onDocClick(e: MouseEvent): void {
  if (wrapRef.value && !wrapRef.value.contains(e.target as Node)) {
    isOpen.value = false
    query.value  = ''
  }
}

onMounted(()  => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <div ref="wrapRef" class="icon-select" :class="{ open: isOpen }">
    <button type="button" class="icon-select-trigger" @click.stop="isOpen ? (isOpen = false) : open()">
      <span v-if="selected" class="icon-select-val">{{ selected.label }}</span>
      <span v-else class="icon-select-placeholder">{{ placeholder ?? '— Aucun —' }}</span>
      <svg class="icon-select-arrow" xmlns="http://www.w3.org/2000/svg" width="12" height="12"
           viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round">
        <path d="m6 9 6 6 6-6"/>
      </svg>
    </button>

    <div v-if="isOpen" class="icon-select-dropdown">
      <!-- Search bar -->
      <div v-if="searchable" class="select-search-wrap">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round" class="select-search-icon">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          ref="searchRef"
          v-model="query"
          type="text"
          class="select-search-input"
          placeholder="Rechercher…"
          @click.stop
          @keydown.escape.stop="isOpen = false"
        >
      </div>

      <button type="button" class="icon-select-option" :class="{ selected: !modelValue }"
              @click="select('')">
        <span class="icon-select-none">{{ placeholder ?? '— Aucun —' }}</span>
      </button>
      <button
        v-for="opt in filteredOptions"
        :key="opt.value"
        type="button"
        class="icon-select-option"
        :class="{ selected: opt.value === modelValue }"
        @click="select(opt.value)"
      >{{ opt.label }}</button>
      <div v-if="searchable && filteredOptions.length === 0" class="select-search-empty">
        Aucun résultat
      </div>
    </div>
  </div>
</template>
