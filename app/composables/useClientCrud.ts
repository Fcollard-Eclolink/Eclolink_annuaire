import type { Client } from '~/server/utils/types'
import type { ClientForm } from '~/components/AppClientFormModal.vue'

const EMPTY: ClientForm = {
  name: '', agency: '', contact_name: '', contact_email: '', contact_phone: '',
  notes: '', monthly_quota_hours: '', monthly_amount: '', project_manager_id: '',
}

function bodyFromForm(f: ClientForm): Record<string, unknown> {
  const quotaH = typeof f.monthly_quota_hours === 'number' ? f.monthly_quota_hours : parseFloat(String(f.monthly_quota_hours))
  const amount = typeof f.monthly_amount === 'number'      ? f.monthly_amount      : parseFloat(String(f.monthly_amount))
  return {
    name                 : f.name.trim(),
    agency               : f.agency.trim()        || null,
    contact_name         : f.contact_name.trim()  || null,
    contact_email        : f.contact_email.trim() || null,
    contact_phone        : f.contact_phone.trim() || null,
    notes                : f.notes.trim()         || null,
    monthly_quota_minutes: !isNaN(quotaH) && quotaH > 0  ? Math.round(quotaH * 60) : null,
    monthly_amount       : !isNaN(amount) && amount >= 0 ? amount : null,
    project_manager_id   : f.project_manager_id || null,
  }
}

function extractError(e: unknown): string {
  if (e && typeof e === 'object') {
    const obj = e as { data?: { message?: string; statusMessage?: string }; message?: string }
    return obj.data?.message ?? obj.data?.statusMessage ?? obj.message ?? 'Erreur'
  }
  return 'Erreur'
}

export function useClientCrud() {
  const { add: toast }       = useToast()
  const { refreshClients }   = useReferenceData()
  const { user }             = useAuth()

  const addOpen      = ref(false)
  const editTarget   = ref<Client | null>(null)
  const deleteTarget = ref<Client | null>(null)
  const form         = ref<ClientForm>({ ...EMPTY })
  const loading      = ref(false)
  const error        = ref<string | null>(null)

  function resetState(): void {
    loading.value = false
    error.value   = null
  }

  function openAdd(): void {
    form.value = { ...EMPTY }
    // Auto-fill : cheffe de projet → pré-remplir son propre compte (modifiable)
    if (user.value && ['pm', 'sysadmin'].includes(user.value.role)) {
      form.value.project_manager_id = user.value.id
    }
    addOpen.value = true
    resetState()
  }

  function openEdit(c: Client): void {
    form.value = {
      name                : c.name,
      agency              : c.agency        ?? '',
      contact_name        : c.contact_name  ?? '',
      contact_email       : c.contact_email ?? '',
      contact_phone       : c.contact_phone ?? '',
      notes               : c.notes         ?? '',
      monthly_quota_hours : c.monthly_quota_minutes != null ? String(c.monthly_quota_minutes / 60) : '',
      monthly_amount      : c.monthly_amount        != null ? String(c.monthly_amount)             : '',
      project_manager_id  : c.project_manager_id    ?? '',
    }
    editTarget.value = c
    resetState()
  }

  function openDelete(c: Client): void {
    deleteTarget.value = c
    resetState()
  }

  function closeAdd():    void { if (!loading.value) addOpen.value      = false }
  function closeEdit():   void { if (!loading.value) editTarget.value   = null  }
  function closeDelete(): void { if (!loading.value) deleteTarget.value = null  }

  async function confirmAdd(): Promise<void> {
    loading.value = true; error.value = null
    try {
      await $fetch<Client>('/api/clients', { method: 'POST', body: bodyFromForm(form.value) })
      await refreshClients()
      addOpen.value = false
      toast('Client ajouté.')
    } catch (e: unknown) {
      error.value = extractError(e)
      toast(error.value, 'error')
    } finally { loading.value = false }
  }

  async function confirmEdit(): Promise<void> {
    if (!editTarget.value) return
    loading.value = true; error.value = null
    try {
      await $fetch<Client>(`/api/clients/${editTarget.value.id}`, { method: 'PATCH', body: bodyFromForm(form.value) })
      await refreshClients()
      editTarget.value = null
      toast('Client mis à jour.')
    } catch (e: unknown) {
      error.value = extractError(e)
      toast(error.value, 'error')
    } finally { loading.value = false }
  }

  async function confirmDelete(): Promise<Client | null> {
    if (!deleteTarget.value) return null
    const deleted = deleteTarget.value
    loading.value = true; error.value = null
    try {
      await $fetch(`/api/clients/${deleted.id}`, { method: 'DELETE' })
      await refreshClients()
      deleteTarget.value = null
      toast('Client supprimé.')
      return deleted
    } catch (e: unknown) {
      error.value = extractError(e)
      toast(error.value, 'error')
      return null
    } finally { loading.value = false }
  }

  return {
    addOpen, editTarget, deleteTarget, form, loading, error,
    openAdd, openEdit, openDelete,
    closeAdd, closeEdit, closeDelete,
    confirmAdd, confirmEdit, confirmDelete,
  }
}
