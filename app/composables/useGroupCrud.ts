import type { Ref } from 'vue'
import type { Group, Site } from '~/server/utils/types'

interface GroupForm {
  name      : string
  hoster    : string
  ip_local  : string
  ip_public : string
  web_server: string
}

const EMPTY: GroupForm = { name: '', hoster: '', ip_local: '', ip_public: '', web_server: '' }

export function useGroupCrud(
  groups: Ref<Group[] | null>,
  sites : Ref<Site[]  | null>,
) {
  // ── Suppression ───────────────────────────────────────────────
  const deleteTarget  = ref<Group | null>(null)
  const deleteLoading = ref(false)
  const deleteError   = ref('')

  function openDeleteConfirm(group: Group): void {
    deleteTarget.value = group
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
      await $fetch(`/api/groups/${deleteTarget.value.id}`, { method: 'DELETE' })
      const id = deleteTarget.value.id
      if (groups.value) groups.value = groups.value.filter(g => g.id !== id)
      if (sites.value) {
        for (const s of sites.value) {
          if (s.group_id === id) s.group_id = null
        }
      }
      deleteTarget.value = null
    } catch {
      deleteError.value = 'Erreur lors de la suppression.'
    } finally {
      deleteLoading.value = false
    }
  }

  // ── Édition ───────────────────────────────────────────────────
  const editTarget  = ref<Group | null>(null)
  const editForm    = ref<GroupForm>({ ...EMPTY })
  const editLoading = ref(false)
  const editError   = ref('')

  function openEditModal(group: Group): void {
    editTarget.value = group
    editForm.value   = {
      name      : group.name,
      hoster    : group.hoster     ?? '',
      ip_local  : group.ip_local   ?? '',
      ip_public : group.ip_public  ?? '',
      web_server: group.web_server ?? '',
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
    editLoading.value = true
    editError.value   = ''
    try {
      const updated = await $fetch<Group>(`/api/groups/${editTarget.value.id}`, {
        method: 'PATCH',
        body  : {
          name      : editForm.value.name.trim(),
          hoster    : editForm.value.hoster.trim()     || null,
          ip_local  : editForm.value.ip_local.trim()   || null,
          ip_public : editForm.value.ip_public.trim()  || null,
          web_server: editForm.value.web_server.trim() || null,
        },
      })
      if (groups.value) {
        const idx = groups.value.findIndex(g => g.id === editTarget.value!.id)
        if (idx !== -1) groups.value[idx] = updated
      }
      editTarget.value = null
    } catch {
      editError.value = 'Erreur lors de la sauvegarde.'
    } finally {
      editLoading.value = false
    }
  }

  // ── Création ──────────────────────────────────────────────────
  const isAddOpen  = ref(false)
  const addForm    = ref<GroupForm>({ ...EMPTY })
  const addLoading = ref(false)
  const addError   = ref('')

  function openAddModal(): void {
    addForm.value = { ...EMPTY }
    addError.value = ''
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
      const created = await $fetch<Group>('/api/groups', {
        method: 'POST',
        body  : {
          name      : addForm.value.name.trim(),
          hoster    : addForm.value.hoster.trim()     || null,
          ip_local  : addForm.value.ip_local.trim()   || null,
          ip_public : addForm.value.ip_public.trim()  || null,
          web_server: addForm.value.web_server.trim() || null,
        },
      })
      if (groups.value) groups.value = [...groups.value, created]
        .sort((a, b) => a.name.localeCompare(b.name, 'fr', { numeric: true }))
      isAddOpen.value = false
    } catch {
      addError.value = 'Erreur lors de la création.'
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
