<script setup lang="ts">
import type { SelectOption } from '~/utils/selectOptions'

const props = defineProps<{
  options    : SelectOption[]
  placeholder?: string
}>()

const modelValue = defineModel<string>({ default: '' })
const isOpen     = ref(false)
const wrapRef    = ref<HTMLElement | null>(null)

const selected = computed(() =>
  props.options.find(o => o.value === modelValue.value) ?? null,
)

function select(value: string): void {
  modelValue.value = value
  isOpen.value     = false
}

function onDocClick(e: MouseEvent): void {
  if (wrapRef.value && !wrapRef.value.contains(e.target as Node)) {
    isOpen.value = false
  }
}

onMounted(()  => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))

function iconUrl(slug: string): string {
  return `https://cdn.simpleicons.org/${slug}`
}
</script>

<template>
  <div ref="wrapRef" class="icon-select" :class="{ open: isOpen }">
    <!-- Déclencheur -->
    <button type="button" class="icon-select-trigger" @click.stop="isOpen = !isOpen">
      <span v-if="selected" class="icon-select-val">
        <img :src="iconUrl(selected.slug)" width="14" height="14" :alt="selected.label"
             @error="($event.target as HTMLImageElement).style.display='none'">
        {{ selected.label }}
      </span>
      <span v-else class="icon-select-placeholder">{{ placeholder ?? '— Aucun —' }}</span>
      <svg class="icon-select-arrow" xmlns="http://www.w3.org/2000/svg" width="12" height="12"
           viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round">
        <path d="m6 9 6 6 6-6"/>
      </svg>
    </button>

    <!-- Dropdown -->
    <div v-if="isOpen" class="icon-select-dropdown">
      <button type="button" class="icon-select-option" :class="{ selected: !modelValue }"
              @click="select('')">
        <span class="icon-select-none">{{ placeholder ?? '— Aucun —' }}</span>
      </button>
      <button
        v-for="opt in options"
        :key="opt.value"
        type="button"
        class="icon-select-option"
        :class="{ selected: opt.value === modelValue }"
        @click="select(opt.value)"
      >
        <img :src="iconUrl(opt.slug)" width="14" height="14" :alt="opt.label"
             @error="($event.target as HTMLImageElement).style.display='none'">
        {{ opt.label }}
      </button>
    </div>
  </div>
</template>
