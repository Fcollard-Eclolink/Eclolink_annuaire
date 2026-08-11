import type { Ref } from 'vue'
import type { Site } from '~/server/utils/types'

export interface SiteEditForm {
  name              : string
  url               : string
  bo_url            : string
  gitlab_url        : string
  agency            : string
  group_id          : string
  php_version       : string
  dns_zone          : string
  go_live_date      : string
  technologies      : string
  client_id         : string
  registrar         : string
  notes             : string
  has_maintenance   : boolean
}

const EMPTY_FORM: SiteEditForm = {
  name: '', url: '', bo_url: '', gitlab_url: '', agency: '',
  group_id: '', php_version: '', dns_zone: '', go_live_date: '',
  technologies: '', client_id: '', registrar: '', notes: '',
  has_maintenance: false,
}

function formBody(f: SiteEditForm): Record<string, string | boolean | null> {
  return {
    name: f.name.trim(),
    ...trimOrNull(f, ['url', 'bo_url', 'gitlab_url', 'agency', 'php_version', 'dns_zone', 'technologies', 'registrar', 'notes']),
    group_id       : f.group_id     || null,
    go_live_date   : f.go_live_date || null,
    client_id      : f.client_id    || null,
    has_maintenance: f.has_maintenance,
  }
}

export function useSiteCrud(sites: Ref<Site[]>) {
  const { add: toast } = useToast()

  // ── Suppression ───────────────────────────────────────────────
  const deleteTarget  = ref<Site | null>(null)
  const deleteLoading = ref(false)
  const deleteError   = ref('')

  function openDeleteConfirm(site: Site): void {
    deleteTarget.value = site
    deleteError.value  = ''
  }

  function closeDeleteConfirm(): void {
    if (deleteLoading.value) return
    deleteTarget.value = null
  }

  async function confirmDelete(): Promise<void> {
    if (!deleteTarget.value) return
    deleteLoading.value = true
    deleteError.value   = ''
    try {
      await $fetch(`/api/sites/${deleteTarget.value.id}`, { method: 'DELETE' })
      const id = deleteTarget.value.id
      if (sites.value) sites.value = sites.value.filter(s => s.id !== id)
      deleteTarget.value = null
      toast('Site supprimé.')
    } catch {
      deleteError.value = 'Erreur lors de la suppression.'
      toast('Erreur lors de la suppression.', 'error')
    } finally {
      deleteLoading.value = false
    }
  }

  // ── Édition ───────────────────────────────────────────────────
  const editTarget  = ref<Site | null>(null)
  const editForm    = ref<SiteEditForm>({ ...EMPTY_FORM })
  const editLoading = ref(false)
  const editError   = ref('')

  function openEditModal(site: Site): void {
    editTarget.value = site
    editForm.value   = {
      name              : site.name,
      url               : site.url               ?? '',
      bo_url            : site.bo_url            ?? '',
      gitlab_url        : site.gitlab_url        ?? '',
      agency            : site.agency            ?? '',
      group_id          : site.group_id          ?? '',
      php_version       : site.php_version       ?? '',
      dns_zone          : site.dns_zone          ?? '',
      go_live_date      : site.go_live_date      ?? '',
      technologies      : site.technologies      ?? '',
      client_id         : site.client_id         ?? '',
      registrar         : site.registrar         ?? '',
      notes             : site.notes             ?? '',
      has_maintenance   : site.has_maintenance,
    }
    editError.value = ''
  }

  function closeEditModal(): void {
    if (editLoading.value) return
    editTarget.value = null
  }

  async function saveEdit(): Promise<void> {
    if (!editTarget.value) return
    if (!editForm.value.name.trim()) { editError.value = 'Le nom est requis.'; return }
    const targetId = editTarget.value.id
    editLoading.value = true
    editError.value   = ''
    try {
      const updated = await $fetch<Site>(`/api/sites/${targetId}`, {
        method: 'PATCH', body: formBody(editForm.value),
      })
      const idx = sites.value.findIndex((s: Site): boolean => s.id === targetId)
      if (idx !== -1) {
        // Nouvelle ref d'array (pas de mutation en place) pour les watchers shallow.
        const next = sites.value.slice()
        next[idx]  = updated
        sites.value = next
      }
      editTarget.value = null
      toast('Site mis à jour.')
    } catch (e: unknown) {
      console.error('[useSiteCrud] saveEdit failed', e)
      const msg = e instanceof Error ? e.message : 'Erreur lors de la sauvegarde.'
      editError.value = msg
      toast(msg, 'error')
    } finally {
      editLoading.value = false
    }
  }

  // ── Création ──────────────────────────────────────────────────
  const isAddOpen  = ref(false)
  const addForm    = ref<SiteEditForm>({ ...EMPTY_FORM })
  const addLoading = ref(false)
  const addError   = ref('')

  function openAddModal(): void {
    addForm.value   = { ...EMPTY_FORM }
    addError.value  = ''
    isAddOpen.value = true
  }

  function closeAddModal(): void {
    if (addLoading.value) return
    isAddOpen.value = false
  }

  async function confirmAdd(): Promise<void> {
    if (!addForm.value.name.trim()) { addError.value = 'Le nom est requis.'; return }
    addLoading.value = true
    addError.value   = ''
    try {
      const created = await $fetch<Site>('/api/sites', {
        method: 'POST', body: formBody(addForm.value),
      })
      if (sites.value) sites.value = [...sites.value, created]
        .sort((a, b) => a.name.localeCompare(b.name, 'fr', { numeric: true }))
      isAddOpen.value = false
      toast('Site créé.')
    } catch {
      addError.value = 'Erreur lors de la création.'
      toast('Erreur lors de la création.', 'error')
    } finally {
      addLoading.value = false
    }
  }

  return {
    deleteTarget, deleteLoading, deleteError,
    openDeleteConfirm, closeDeleteConfirm, confirmDelete,
    editTarget, editForm, editLoading, editError,
    openEditModal, closeEditModal, saveEdit,
    isAddOpen, addForm, addLoading, addError,
    openAddModal, closeAddModal, confirmAdd,
  }
}
