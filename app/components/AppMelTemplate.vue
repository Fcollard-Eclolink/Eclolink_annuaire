<script setup lang="ts">
import type { MelStep } from '~/server/utils/types'

const NEW_SECTION = '__new__'

const refs           = useReferenceData()
const steps          = refs.melSteps
const refreshMelSteps = refs.refreshMelSteps
const { add: toast }  = useToast()

function extractError(e: unknown): string {
  if (e && typeof e === 'object') {
    const obj = e as { data?: { message?: string; statusMessage?: string }; message?: string }
    return obj.data?.message ?? obj.data?.statusMessage ?? obj.message ?? 'Erreur'
  }
  return 'Erreur'
}

// ── Suppression instantanée avec "undo" (3s) ─────────────────────
// Le step disparaît immédiatement de l'affichage ; la suppression réelle
// (DELETE serveur) n'est déclenchée qu'après le délai, sauf restauration.
const hiddenStepIds = ref<Set<string>>(new Set())
const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>()

const visibleSteps = computed((): MelStep[] =>
  steps.value.filter(s => !hiddenStepIds.value.has(s.id)),
)

/** Groupes affichés dans l'ordre d'apparition des sections (pas triés alphabétiquement). */
const grouped = computed((): { section: string; items: MelStep[] }[] => {
  const groups: { section: string; items: MelStep[] }[] = []
  for (const step of visibleSteps.value) {
    let group = groups.find(g => g.section === step.section)
    if (!group) { group = { section: step.section, items: [] }; groups.push(group) }
    group.items.push(step)
  }
  return groups
})

/** Sections déjà présentes dans le modèle — alimente les deux dropdowns (ajout + édition). */
const knownSections = computed((): string[] =>
  [...new Set(steps.value.map(s => s.section))],
)
const sectionOptions = computed(() => [
  ...knownSections.value.map(s => ({ value: s, label: s })),
  { value: NEW_SECTION, label: '+ Nouvelle section…' },
])

function resolvedSection(choice: string, custom: string): string {
  return choice === NEW_SECTION ? custom.trim() : choice
}

// ── Ajout ───────────────────────────────────────────────────────
const newSectionChoice = ref('')
const newSectionCustom = ref('')
const newLabel         = ref('')
const adding           = ref(false)

const newSectionValue = computed((): string => resolvedSection(newSectionChoice.value, newSectionCustom.value))

async function addStep(): Promise<void> {
  const section = newSectionValue.value
  if (!section || !newLabel.value.trim()) return
  adding.value = true
  try {
    await $fetch('/api/mel-steps', { method: 'POST', body: { section, label: newLabel.value } })
    await refreshMelSteps()
    newLabel.value         = ''
    newSectionChoice.value = section // reste sur la même section pour enchaîner les étapes
    newSectionCustom.value = ''
  } catch (e) { toast(extractError(e), 'error') }
  finally { adding.value = false }
}

// ── Édition ───────────────────────────────────────────────────────
const editingId         = ref<string | null>(null)
const editSectionChoice = ref('')
const editSectionCustom = ref('')
const editLabel         = ref('')

const editSectionValue = computed((): string => resolvedSection(editSectionChoice.value, editSectionCustom.value))

function startEdit(step: MelStep): void {
  editingId.value         = step.id
  editSectionChoice.value = step.section
  editSectionCustom.value = ''
  editLabel.value         = step.label
}
function cancelEdit(): void {
  editingId.value = null
}
async function saveEdit(): Promise<void> {
  if (!editingId.value) return
  const section = editSectionValue.value
  if (!section || !editLabel.value.trim()) return
  try {
    await $fetch(`/api/mel-steps/${editingId.value}`, {
      method: 'PATCH',
      body  : { section, label: editLabel.value },
    })
    await refreshMelSteps()
    editingId.value = null
  } catch (e) { toast(extractError(e), 'error') }
}

function removeStep(step: MelStep): void {
  hiddenStepIds.value = new Set([...hiddenStepIds.value, step.id])
  pendingTimers.set(step.id, setTimeout(() => void commitDelete(step.id), 3000))
  toast('Étape supprimée.', 'error', {
    durationMs: 3000,
    action    : { label: 'Restaurer', onClick: () => restoreStep(step.id) },
  })
}

async function commitDelete(id: string): Promise<void> {
  pendingTimers.delete(id)
  try {
    await $fetch(`/api/mel-steps/${id}`, { method: 'DELETE' })
    await refreshMelSteps()
  } catch (e) { toast(extractError(e), 'error') }
  hiddenStepIds.value = new Set([...hiddenStepIds.value].filter(x => x !== id))
}

function restoreStep(id: string): void {
  const timer = pendingTimers.get(id)
  if (timer) { clearTimeout(timer); pendingTimers.delete(id) }
  hiddenStepIds.value = new Set([...hiddenStepIds.value].filter(x => x !== id))
}

// ── Réordonnancement (échange de sort_order avec le voisin visible) ─
async function move(step: MelStep, direction: -1 | 1): Promise<void> {
  const idx      = visibleSteps.value.findIndex(s => s.id === step.id)
  const neighbor = visibleSteps.value[idx + direction]
  if (!neighbor) return
  try {
    await Promise.all([
      $fetch(`/api/mel-steps/${step.id}`,     { method: 'PATCH', body: { sort_order: neighbor.sort_order } }),
      $fetch(`/api/mel-steps/${neighbor.id}`, { method: 'PATCH', body: { sort_order: step.sort_order } }),
    ])
    await refreshMelSteps()
  } catch (e) { toast(extractError(e), 'error') }
}
</script>

<template>
  <div class="mel-template">
    <p class="mel-template-hint">
      Modèle des étapes d'une mise en ligne. Chaque nouvelle MEL en repart avec une copie figée.
    </p>

    <div v-if="!visibleSteps.length" class="admin-empty">Aucune étape définie dans le modèle.</div>

    <div v-for="group in grouped" :key="group.section" class="mel-template-section">
      <h3 class="mel-template-section-title">{{ group.section }}</h3>
      <ul class="mel-template-list">
        <li v-for="step in group.items" :key="step.id" class="mel-template-row" :class="{ 'mel-template-row--editing': editingId === step.id }">

          <!-- Édition : même disposition que le formulaire d'ajout ci-dessous -->
          <div v-if="editingId === step.id" class="mel-template-form">
            <div class="field">
              <label>Section</label>
              <AppSelect v-model="editSectionChoice" :options="sectionOptions" placeholder="— Choisir —" />
              <input v-if="editSectionChoice === NEW_SECTION" v-model="editSectionCustom" type="text" placeholder="Nom de la nouvelle section">
            </div>
            <div class="field">
              <label>Étape</label>
              <textarea v-model="editLabel" class="field-input" rows="2" placeholder="Étape" />
            </div>
            <div class="mel-template-row-actions">
              <button type="button" class="btn" @click="cancelEdit">Annuler</button>
              <button type="button" class="btn primary" :disabled="!editSectionValue || !editLabel.trim()" @click="saveEdit">Enregistrer</button>
            </div>
          </div>

          <template v-else>
            <span class="mel-template-label">{{ step.label }}</span>
            <div class="mel-template-row-actions">
              <button class="icon-btn" title="Monter" @click="move(step, -1)">&#8593;</button>
              <button class="icon-btn" title="Descendre" @click="move(step, 1)">&#8595;</button>
              <button class="icon-btn" title="Modifier" @click="startEdit(step)">&#9998;</button>
              <button class="icon-btn del" title="Supprimer" @click="removeStep(step)">&#10005;</button>
            </div>
          </template>
        </li>
      </ul>
    </div>

    <!-- Ajout : section et étape jamais sur la même ligne -->
    <form class="mel-template-form mel-template-add" @submit.prevent="addStep">
      <div class="field">
        <label>Section</label>
        <AppSelect v-model="newSectionChoice" :options="sectionOptions" placeholder="— Choisir —" />
        <input v-if="newSectionChoice === NEW_SECTION" v-model="newSectionCustom" type="text" placeholder="Nom de la nouvelle section">
      </div>
      <div class="field">
        <label>Étape</label>
        <textarea v-model="newLabel" class="field-input" rows="2" placeholder="ex: Pointer le domaine" />
      </div>
      <button type="submit" class="btn primary" :disabled="adding || !newSectionValue || !newLabel.trim()">
        <span v-if="adding" class="spinner" />
        {{ adding ? 'Ajout…' : '+ Étape' }}
      </button>
    </form>
  </div>
</template>
