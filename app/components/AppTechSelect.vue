<script setup lang="ts">
import { TECHS } from '~/utils/selectOptions'
import type { TechOption } from '~/utils/selectOptions'

const modelValue = defineModel<string>({ default: '' })
const isOpen     = ref(false)
const wrapRef    = ref<HTMLElement | null>(null)

/** Parse modelValue (CSV ou JSON array) → labels normalisés */
const selectedLabels = computed((): string[] => {
  if (!modelValue.value.trim()) return []
  const raw = modelValue.value.trim()
  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed))
        return (parsed as unknown[]).map(v => String(v).trim()).filter(Boolean)
    } catch { /* fallback */ }
  }
  return raw.split(',').map(t => t.trim()).filter(Boolean)
})

function findTech(val: string): TechOption | undefined {
  const v = val.toLowerCase()
  return TECHS.find(t => t.label.toLowerCase() === v || t.id === v || v.includes(t.id))
}

function isSelected(opt: TechOption): boolean {
  return selectedLabels.value.some(v => {
    const vl = v.toLowerCase()
    return vl === opt.label.toLowerCase() || vl === opt.id
  })
}

function toggle(opt: TechOption): void {
  const next = isSelected(opt)
    ? selectedLabels.value.filter(v => {
        const vl = v.toLowerCase()
        return vl !== opt.label.toLowerCase() && vl !== opt.id
      })
    : [...selectedLabels.value, opt.label]
  modelValue.value = next.join(', ')
}

const selectedOpts = computed(() =>
  selectedLabels.value
    .map(v => findTech(v))
    .filter((t): t is TechOption => t !== undefined),
)

function onDocClick(e: MouseEvent): void {
  if (wrapRef.value && !wrapRef.value.contains(e.target as Node))
    isOpen.value = false
}

onMounted(()  => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))

function iconUrl(slug: string): string {
  return `https://cdn.simpleicons.org/${slug}`
}
</script>

<template>
  <div ref="wrapRef" class="icon-select tech-select" :class="{ open: isOpen }">

    <!-- Déclencheur -->
    <button type="button" class="tech-select-trigger" @click.stop="isOpen = !isOpen">
      <div v-if="selectedOpts.length" class="tech-select-pills">
        <span v-for="opt in selectedOpts" :key="opt.id" class="tech-select-pill">
          <img v-if="opt.slug" :src="iconUrl(opt.slug)" width="11" height="11" :alt="opt.label"
               @error="($event.target as HTMLImageElement).style.display='none'">
          <!-- eslint-disable-next-line vue/no-v-html -->
          <span v-else-if="opt.svg" class="tech-svg-icon" v-html="opt.svg" />
          {{ opt.label }}
        </span>
      </div>
      <span v-else class="icon-select-placeholder">— Aucune —</span>
      <svg class="icon-select-arrow" xmlns="http://www.w3.org/2000/svg" width="12" height="12"
           viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round">
        <path d="m6 9 6 6 6-6"/>
      </svg>
    </button>

    <!-- Dropdown -->
    <div v-if="isOpen" class="icon-select-dropdown tech-select-dropdown">
      <button
        v-for="opt in TECHS"
        :key="opt.id"
        type="button"
        class="icon-select-option tech-select-option"
        :class="{ selected: isSelected(opt) }"
        @click="toggle(opt)"
      >
        <img v-if="opt.slug" :src="iconUrl(opt.slug)" width="14" height="14" :alt="opt.label"
             @error="($event.target as HTMLImageElement).style.display='none'">
        <!-- eslint-disable-next-line vue/no-v-html -->
        <span v-else-if="opt.svg" class="tech-svg-icon" v-html="opt.svg" />
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
