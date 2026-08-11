<script setup lang="ts">
import type { Site, Client } from '~/server/utils/types'

const props = defineProps<{
  clientName        : string
  /** Sites disponibles à associer (ceux déjà liés au client courant sont exclus). */
  availableSites    : Site[]
  clientById        : Map<string, Client>
  loading           : boolean
  error             : string | null
}>()

const emit = defineEmits<{
  close : []
  submit: [ids: string[]]
}>()

const query    = ref('')
const selected = ref<Set<string>>(new Set())
const searchRef = ref<HTMLInputElement | null>(null)

const filtered = computed((): Site[] => {
  const q = query.value.trim().toLowerCase()
  if (!q) return props.availableSites
  return props.availableSites.filter((s: Site): boolean =>
    s.name.toLowerCase().includes(q)
    || (s.url?.toLowerCase().includes(q) ?? false)
    || (s.agency?.toLowerCase().includes(q) ?? false),
  )
})

function toggle(id: string): void {
  if (selected.value.has(id)) selected.value.delete(id)
  else                        selected.value.add(id)
  // Force reactivity (Set mutations are non-reactive natively)
  selected.value = new Set(selected.value)
}

function isSelected(id: string): boolean {
  return selected.value.has(id)
}

function submit(): void {
  if (!selected.value.size) return
  emit('submit', [...selected.value])
}

function currentClientNameOf(site: Site): string | null {
  if (!site.client_id) return null
  return props.clientById.get(site.client_id)?.name ?? null
}

onMounted(() => {
  nextTick(() => searchRef.value?.focus())
})
</script>

<template>
  <div class="modal-overlay" v-modal-close="() => emit('close')">
    <div class="modal-card modal-card--scroll" style="max-width:520px">
      <h3 class="modal-title">Ajouter des sites à <strong>{{ clientName }}</strong></h3>
      <p v-if="error" class="modal-error">{{ error }}</p>

      <!-- Barre de recherche -->
      <div class="sites-picker-search">
        <svg class="search-bar-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14"
             viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          ref="searchRef"
          v-model="query"
          type="search"
          placeholder="Rechercher un site (nom, URL, agence)…"
          autocomplete="off"
        >
      </div>

      <!-- Liste des sites -->
      <div class="sites-picker-list">
        <div v-if="!filtered.length" class="sites-picker-empty">
          Aucun site disponible.
        </div>

        <button
          v-for="s in filtered"
          :key="s.id"
          type="button"
          class="sites-picker-row"
          :class="{ selected: isSelected(s.id) }"
          @click="toggle(s.id)"
        >
          <span class="sites-picker-checkbox">
            <svg v-if="isSelected(s.id)" xmlns="http://www.w3.org/2000/svg" width="11" height="11"
                 viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"
                 stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 6 9 17l-5-5"/>
            </svg>
          </span>
          <span class="sites-picker-info">
            <span class="sites-picker-name">{{ s.name }}</span>
            <span v-if="s.url" class="sites-picker-url">{{ s.url }}</span>
          </span>
          <span v-if="currentClientNameOf(s)" class="sites-picker-current">
            actuellement chez {{ currentClientNameOf(s) }}
          </span>
        </button>
      </div>

      <div class="modal-btns">
        <button type="button" class="btn" :disabled="loading" @click="emit('close')">
          Annuler
        </button>
        <button type="button" class="btn primary" :disabled="loading || !selected.size" @click="submit">
          <span v-if="loading" class="spinner" />
          {{ loading ? 'Ajout…' : `Ajouter${selected.size ? ` (${selected.size})` : ''}` }}
        </button>
      </div>
    </div>
  </div>
</template>
