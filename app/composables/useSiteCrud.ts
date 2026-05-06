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
  project_manager_id: string
  notes             : string
}

const EMPTY_FORM: SiteEditForm = {
  name: '', url: '', bo_url: '', gitlab_url: '', agency: '',
  group_id: '', php_version: '', dns_zone: '', go_live_date: '',
  technologies: '', project_manager_id: '', notes: '',
}

export function useSiteCrud(sites: Ref<Site[] | null>) {
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
    } catch {
      deleteError.value = 'Erreur lors de la suppression.'
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
      project_manager_id: site.project_manager_id ?? '',
      notes             : site.notes             ?? '',
    }
    editError.value = ''
  }

  function closeEditModal(): void {
    if (editLoading.value) return
    editTarget.value = null
  }

  async function saveEdit(): Promise<void> {
    if (!editTarget.value) return
    if (!editForm.value.name.trim()) {
      editError.value = 'Le nom est requis.'
      return
    }
    editLoading.value = true
    editError.value   = ''
    try {
      const f = editForm.value
      const updated = await $fetch<Site>(`/api/sites/${editTarget.value.id}`, {
        method: 'PATCH',
        body  : {
          name              : f.name.trim(),
          url               : f.url.trim()          || null,
          bo_url            : f.bo_url.trim()        || null,
          gitlab_url        : f.gitlab_url.trim()    || null,
          agency            : f.agency.trim()        || null,
          group_id          : f.group_id             || null,
          php_version       : f.php_version.trim()   || null,
          dns_zone          : f.dns_zone.trim()      || null,
          go_live_date      : f.go_live_date         || null,
          technologies      : f.technologies.trim()  || null,
          project_manager_id: f.project_manager_id   || null,
          notes             : f.notes.trim()         || null,
        },
      })
      if (sites.value) {
        const idx = sites.value.findIndex(s => s.id === editTarget.value!.id)
        if (idx !== -1) sites.value[idx] = updated
      }
      editTarget.value = null
    } catch {
      editError.value = 'Erreur lors de la sauvegarde.'
    } finally {
      editLoading.value = false
    }
  }

  return {
    deleteTarget, deleteLoading, deleteError,
    openDeleteConfirm, closeDeleteConfirm, confirmDelete,
    editTarget, editForm, editLoading, editError,
    openEditModal, closeEditModal, saveEdit,
  }
}
