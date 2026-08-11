import type { Ref } from 'vue'
import type { Group, Site } from '~/server/utils/types'

export interface GroupForm {
  name       : string
  hoster     : string
  ip_local   : string
  ip_public  : string
  web_server : string
  database_id: string
}

const EMPTY: GroupForm = { name: '', hoster: '', ip_local: '', ip_public: '', web_server: '', database_id: '' }

export function useGroupCrud(
  groups: Ref<Group[]>,
  sites : Ref<Site[]>,
) {
  const { add: toast } = useToast()

  const loading = ref(false)
  const error   = ref('')

  // ── Suppression ───────────────────────────────────────────────
  const deleteTarget = ref<Group | null>(null)

  function openDeleteConfirm(group: Group): void {
    deleteTarget.value = group
    error.value = ''
  }

  function closeDeleteConfirm(): void {
    if (loading.value) return
    deleteTarget.value = null
  }

  async function confirmDelete(): Promise<void> {
    if (!deleteTarget.value) return
    loading.value = true
    error.value   = ''
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
      toast('Serveur supprimé.')
    } catch {
      error.value = 'Erreur lors de la suppression.'
      toast('Erreur lors de la suppression.', 'error')
    } finally {
      loading.value = false
    }
  }

  // ── Édition ───────────────────────────────────────────────────
  const editTarget = ref<Group | null>(null)
  const editForm   = ref<GroupForm>({ ...EMPTY })

  function openEditModal(group: Group): void {
    editTarget.value = group
    editForm.value   = {
      name       : group.name,
      hoster     : group.hoster      ?? '',
      ip_local   : group.ip_local    ?? '',
      ip_public  : group.ip_public   ?? '',
      web_server : group.web_server  ?? '',
      database_id: group.database_id ?? '',
    }
    error.value = ''
  }

  function closeEditModal(): void {
    if (loading.value) return
    editTarget.value = null
  }

  async function saveEdit(): Promise<void> {
    if (!editTarget.value) return
    if (!editForm.value.name.trim()) { error.value = 'Le nom est requis.'; return }
    loading.value = true
    error.value   = ''
    try {
      const updated = await $fetch<Group>(`/api/groups/${editTarget.value.id}`, {
        method: 'PATCH',
        body  : {
          name       : editForm.value.name.trim(),
          ...trimOrNull(editForm.value, ['hoster', 'ip_local', 'ip_public', 'web_server']),
          database_id: editForm.value.database_id || null,
        },
      })
      if (groups.value) {
        const idx = groups.value.findIndex(g => g.id === editTarget.value!.id)
        if (idx !== -1) groups.value[idx] = updated
      }
      editTarget.value = null
      toast('Serveur mis à jour.')
    } catch {
      error.value = 'Erreur lors de la sauvegarde.'
      toast('Erreur lors de la sauvegarde.', 'error')
    } finally {
      loading.value = false
    }
  }

  // ── Création ──────────────────────────────────────────────────
  const isAddOpen = ref(false)
  const addForm   = ref<GroupForm>({ ...EMPTY })

  function openAddModal(): void {
    addForm.value = { ...EMPTY }
    error.value = ''
    isAddOpen.value = true
  }

  function closeAddModal(): void {
    if (loading.value) return
    isAddOpen.value = false
  }

  async function confirmAdd(): Promise<void> {
    if (!addForm.value.name.trim()) { error.value = 'Le nom est requis.'; return }
    loading.value = true
    error.value   = ''
    try {
      const created = await $fetch<Group>('/api/groups', {
        method: 'POST',
        body  : {
          name       : addForm.value.name.trim(),
          ...trimOrNull(addForm.value, ['hoster', 'ip_local', 'ip_public', 'web_server']),
          database_id: addForm.value.database_id || null,
        },
      })
      if (groups.value) groups.value = [...groups.value, created]
        .sort((a, b) => a.name.localeCompare(b.name, 'fr', { numeric: true }))
      isAddOpen.value = false
      toast('Serveur créé.')
    } catch {
      error.value = 'Erreur lors de la création.'
      toast('Erreur lors de la création.', 'error')
    } finally {
      loading.value = false
    }
  }

  return {
    loading, error,
    deleteTarget, openDeleteConfirm, closeDeleteConfirm, confirmDelete,
    editTarget, editForm, openEditModal, closeEditModal, saveEdit,
    isAddOpen, addForm, openAddModal, closeAddModal, confirmAdd,
  }
}
