<script setup lang="ts">
const props = defineProps<{
  options    : { id: string; label: string }[]
  placeholder?: string
}>()

const modelValue = defineModel<string>({ default: '' })
const isOpen     = ref(false)
const wrapRef    = ref<HTMLElement | null>(null)

const selectedIds = computed((): string[] => {
  if (!modelValue.value.trim()) return []
  return modelValue.value.split(',').map(v => v.trim()).filter(Boolean)
})

function isSelected(opt: { id: string }): boolean {
  return selectedIds.value.includes(opt.id)
}

function toggle(opt: { id: string }): void {
  const next = isSelected(opt)
    ? selectedIds.value.filter(v => v !== opt.id)
    : [...selectedIds.value, opt.id]
  modelValue.value = next.join(',')
}

const selectedOpts = computed(() =>
  selectedIds.value
    .map(id => props.options.find(o => o.id === id))
    .filter((o): o is { id: string; label: string } => o !== undefined),
)

function onDocClick(e: MouseEvent): void {
  if (wrapRef.value && !wrapRef.value.contains(e.target as Node))
    isOpen.value = false
}

onMounted(()  => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <div ref="wrapRef" class="icon-select tech-select" :class="{ open: isOpen }">

    <button type="button" class="tech-select-trigger" @click.stop="isOpen = !isOpen">
      <div v-if="selectedOpts.length" class="tech-select-pills">
        <span v-for="opt in selectedOpts" :key="opt.id" class="tech-select-pill">
          {{ opt.label }}
        </span>
      </div>
      <span v-else class="icon-select-placeholder">{{ placeholder ?? '— Aucun —' }}</span>
      <svg class="icon-select-arrow" xmlns="http://www.w3.org/2000/svg" width="12" height="12"
           viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round">
        <path d="m6 9 6 6 6-6"/>
      </svg>
    </button>

    <div v-if="isOpen" class="icon-select-dropdown tech-select-dropdown">
      <button
        v-for="opt in options"
        :key="opt.id"
        type="button"
        class="icon-select-option tech-select-option"
        :class="{ selected: isSelected(opt) }"
        @click="toggle(opt)"
      >
        <span class="tech-select-opt-label">{{ opt.label }}</span>
        <svg v-if="isSelected(opt)" class="tech-select-check"
             xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" stroke-width="2.5"
             stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 6 9 17l-5-5"/>
        </svg>
      </button>
    </div>

  </div>
</template>
