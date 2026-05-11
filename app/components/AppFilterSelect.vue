<script lang="ts">
export interface FilterOption {
  id      : string
  label   : string
  disabled: boolean
}
</script>

<script setup lang="ts">
const props = defineProps<{
  label  : string
  options: FilterOption[]
}>()

const modelValue = defineModel<string[]>({ default: () => [] })

const isOpen  = ref(false)
const wrapRef = ref<HTMLElement | null>(null)

function toggleOption(id: string): void {
  const opt      = props.options.find(o => o.id === id)
  const selected = modelValue.value.includes(id)
  // On peut désélectionner une option désactivée, mais pas la sélectionner
  if (opt?.disabled && !selected) return
  modelValue.value = selected
    ? modelValue.value.filter(v => v !== id)
    : [...modelValue.value, id]
}

function onDocClick(e: MouseEvent): void {
  if (wrapRef.value && !wrapRef.value.contains(e.target as Node)) {
    isOpen.value = false
  }
}

onMounted(()  => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <div ref="wrapRef" class="filter-drop" :class="{ open: isOpen, active: modelValue.length > 0 }">
    <!-- Trigger -->
    <button class="filter-drop-trigger" @click="isOpen = !isOpen">
      <span class="filter-drop-label">{{ label }}</span>
      <span v-if="modelValue.length" class="filter-drop-count">{{ modelValue.length }}</span>
      <svg class="filter-drop-arrow" xmlns="http://www.w3.org/2000/svg" width="10" height="10"
           viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
           stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </button>

    <!-- Dropdown -->
    <div v-if="isOpen" class="filter-drop-menu">
      <button
        v-for="opt in options"
        :key="opt.id"
        class="filter-drop-option"
        :class="{
          selected: modelValue.includes(opt.id),
          disabled: opt.disabled && !modelValue.includes(opt.id),
        }"
        @click.stop="toggleOption(opt.id)"
      >
        <span class="filter-drop-checkbox">
          <svg v-if="modelValue.includes(opt.id)"
               xmlns="http://www.w3.org/2000/svg" width="9" height="9"
               viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3.5"
               stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </span>
        {{ opt.label }}
      </button>
    </div>
  </div>
</template>
