<script setup lang="ts">
import type { Group, Mel, MelItem, MelSummary, Site } from '~/server/utils/types'
import { techTags, techIconUrl, techIconSvg } from '~/composables/useTechBadge'
import '~/assets/css/mel.css'

definePageMeta({ middleware: 'auth' })

const refs = useReferenceData()
await Promise.all([refs.loadMels(), refs.loadMelSteps(), refs.loadSites(), refs.loadGroups()])

const mels   = refs.mels
const sites  = refs.sites
const groups = refs.groups

const { add: toast } = useToast()

function extractError(e: unknown): string {
  if (e && typeof e === 'object') {
    const obj = e as { data?: { message?: string; statusMessage?: string }; message?: string }
    return obj.data?.message ?? obj.data?.statusMessage ?? obj.message ?? 'Erreur'
  }
  return 'Erreur'
}

const siteById = computed((): Map<string, Site> => {
  const m = new Map<string, Site>()
  for (const s of sites.value) m.set(s.id, s)
  return m
})
const groupById = computed((): Map<string, Group> => {
  const m = new Map<string, Group>()
  for (const g of groups.value) m.set(g.id, g)
  return m
})

function siteName(id: string): string {
  return siteById.value.get(id)?.name ?? '— Site supprimé —'
}
function siteTechs(id: string): string[] {
  const site = siteById.value.get(id)
  return site ? techTags(site) : []
}

type MelStatus = 'todo' | 'doing' | 'done'
const STATUS_LABELS: Record<MelStatus, string> = {
  todo : 'Pas commencé',
  doing: 'Commencé',
  done : 'Terminé',
}
function melStatus(m: MelSummary): MelStatus {
  if (m.done_items === 0) return 'todo'
  if (m.done_items >= m.total_items) return 'done'
  return 'doing'
}
function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return `${d.toLocaleDateString('fr-FR')} ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
}

// ── Vue active : null = modèle (home), sinon MEL sélectionnée ────
const activeMelId    = ref<string | null>(null)
const activeDetail   = ref<(Mel & { items: MelItem[] }) | null>(null)
const detailLoading  = ref(false)

function selectTemplate(): void {
  activeMelId.value  = null
  activeDetail.value = null
}

async function selectMel(id: string): Promise<void> {
  activeMelId.value   = id
  detailLoading.value = true
  try {
    activeDetail.value = await $fetch<Mel & { items: MelItem[] }>(`/api/mels/${id}`)
  } catch (e) { toast(extractError(e), 'error') }
  finally { detailLoading.value = false }
}

async function onToggle(item: MelItem): Promise<void> {
  if (!activeDetail.value) return
  const idx  = activeDetail.value.items.findIndex(i => i.id === item.id)
  const next = !item.is_done
  if (idx !== -1) {
    activeDetail.value.items[idx] = { ...item, is_done: next, done_at: next ? new Date().toISOString() : null }
  }
  try {
    await $fetch(`/api/mel-items/${item.id}`, { method: 'PATCH', body: { is_done: next } })
  } catch (e) {
    if (idx !== -1) activeDetail.value.items[idx] = item
    toast(extractError(e), 'error')
  }
}

// ── Nouvelle mise en ligne ────────────────────────────────────────
const newOpen    = ref(false)
const newSiteId  = ref('')
const newLoading = ref(false)
const newError   = ref<string | null>(null)

const siteOptions = computed(() =>
  sites.value.map((s: Site) => ({ value: s.id, label: s.name })),
)

function openNew():  void { newSiteId.value = ''; newError.value = null; newOpen.value = true }
function closeNew(): void { newOpen.value = false }

async function confirmNew(): Promise<void> {
  if (!newSiteId.value) return
  newLoading.value = true; newError.value = null
  try {
    const created = await $fetch<Mel>('/api/mels', { method: 'POST', body: { site_id: newSiteId.value } })
    await refs.refreshMels()
    closeNew()
    await selectMel(created.id)
    toast('Mise en ligne créée.')
  } catch (e) { newError.value = extractError(e); toast(newError.value, 'error') }
  finally { newLoading.value = false }
}

// ── Suppression d'une mise en ligne ────────────────────────────────
const deleteTarget  = ref<Mel | null>(null)
const deleteLoading = ref(false)

async function confirmDelete(): Promise<void> {
  if (!deleteTarget.value) return
  deleteLoading.value = true
  try {
    await $fetch(`/api/mels/${deleteTarget.value.id}`, { method: 'DELETE' })
    await refs.refreshMels()
    if (activeMelId.value === deleteTarget.value.id) selectTemplate()
    deleteTarget.value = null
    toast('Mise en ligne supprimée.')
  } catch (e) { toast(extractError(e), 'error') }
  finally { deleteLoading.value = false }
}
</script>

<template>
  <div class="mel-wrap">
    <AppHeader title="Mise en ligne" />

    <div class="mel-layout">
      <aside class="mel-sidebar">
        <button class="btn primary mel-new-btn" @click="openNew">+ Nouvelle mise en ligne</button>

        <button class="mel-history-item" :class="{ active: activeMelId === null }" @click="selectTemplate">
          <span class="mel-history-site">Modèle</span>
        </button>

        <p v-if="!mels.length" class="mel-history-empty">Aucune mise en ligne encore créée.</p>
        <div
          v-for="m in mels"
          :key="m.id"
          class="mel-history-card"
          :class="{ active: activeMelId === m.id }"
          role="button"
          tabindex="0"
          @click="selectMel(m.id)"
          @keydown.enter="selectMel(m.id)"
        >
          <button class="icon-btn del mel-history-delete" title="Supprimer" @click.stop="deleteTarget = m">&#10005;</button>
          <span class="mel-history-site">
            <span class="mel-status-dot" :class="`mel-status-dot--${melStatus(m)}`" :title="STATUS_LABELS[melStatus(m)]" />
            {{ siteName(m.site_id) }}
          </span>
          <span class="mel-history-date">{{ formatDateTime(m.created_at) }}</span>
          <div v-if="siteTechs(m.site_id).length" class="site-meta mel-history-techs">
            <span v-for="tech in siteTechs(m.site_id)" :key="tech" class="site-tech-badge">
              <img v-if="techIconUrl(tech)" :src="techIconUrl(tech) ?? undefined" width="11" height="11" :alt="tech"
                   @error="($event.target as HTMLImageElement).style.display='none'">
              <!-- eslint-disable-next-line vue/no-v-html -->
              <span v-else-if="techIconSvg(tech)" class="tech-svg-icon" v-html="techIconSvg(tech)" />
              {{ tech }}
            </span>
          </div>
        </div>
      </aside>

      <section class="mel-content">
        <AppMelTemplate v-if="activeMelId === null" />
        <AppMelDetail
          v-else
          :items="activeDetail?.items ?? []"
          :site="activeDetail ? siteById.get(activeDetail.site_id) : undefined"
          :group="activeDetail ? groupById.get(siteById.get(activeDetail.site_id)?.group_id ?? '') : undefined"
          :loading="detailLoading"
          @toggle="onToggle"
        />
      </section>
    </div>

    <Teleport to="body">
      <Transition name="modal">
        <div v-if="newOpen" class="modal-overlay" v-modal-close="closeNew">
          <div class="modal-card modal-card--fit">
            <h3 class="modal-title">Nouvelle mise en ligne</h3>
            <p v-if="newError" class="modal-error">{{ newError }}</p>
            <form @submit.prevent="confirmNew">
              <div class="field">
                <label>Site *</label>
                <AppSelect v-model="newSiteId" :options="siteOptions" placeholder="Rechercher un site…" searchable />
              </div>
              <div class="modal-btns">
                <button type="button" class="btn" :disabled="newLoading" @click="closeNew">Annuler</button>
                <button type="submit" class="btn primary" :disabled="newLoading || !newSiteId">
                  <span v-if="newLoading" class="spinner" />
                  {{ newLoading ? 'Création…' : 'Créer' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>

      <Transition name="modal">
        <AppConfirmModal
          v-if="deleteTarget"
          title="Supprimer la mise en ligne"
          :loading="deleteLoading"
          confirm-label="Supprimer"
          @confirm="confirmDelete"
          @cancel="deleteTarget = null"
        >
          <p class="modal-msg">Supprimer la mise en ligne de <strong>{{ siteName(deleteTarget.site_id) }}</strong> ?</p>
        </AppConfirmModal>
      </Transition>
    </Teleport>
  </div>
</template>
