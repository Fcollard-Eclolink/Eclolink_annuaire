import type { Client } from '~/server/utils/types'
import type { ClientForm } from '~/components/AppClientFormModal.vue'

const EMPTY: ClientForm = {
  name: '', agency: '', contact_name: '', contact_email: '', contact_phone: '',
  notes: '', monthly_quota_hours: '', monthly_amount: '', project_manager_id: '',
}

function toForm(c: Client): ClientForm {
  return {
    name               : c.name,
    agency             : c.agency        ?? '',
    contact_name       : c.contact_name  ?? '',
    contact_email      : c.contact_email ?? '',
    contact_phone      : c.contact_phone ?? '',
    notes              : c.notes         ?? '',
    monthly_quota_hours: c.monthly_quota_minutes != null ? String(c.monthly_quota_minutes / 60) : '',
    monthly_amount     : c.monthly_amount        != null ? String(c.monthly_amount)             : '',
    project_manager_id : c.project_manager_id    ?? '',
  }
}

function toBody(f: ClientForm): Record<string, unknown> {
  const quotaH = typeof f.monthly_quota_hours === 'number' ? f.monthly_quota_hours : parseFloat(String(f.monthly_quota_hours))
  const amount = typeof f.monthly_amount === 'number'      ? f.monthly_amount      : parseFloat(String(f.monthly_amount))
  return {
    name: f.name.trim(),
    ...trimOrNull(f, ['agency', 'contact_name', 'contact_email', 'contact_phone', 'notes']),
    monthly_quota_minutes: !isNaN(quotaH) && quotaH > 0  ? Math.round(quotaH * 60) : null,
    monthly_amount       : !isNaN(amount) && amount >= 0 ? amount : null,
    project_manager_id   : f.project_manager_id || null,
  }
}

export function useClientCrud() {
  const { refreshClients } = useReferenceData()
  const { user }           = useAuth()

  const crud = useCrudModal<Client, ClientForm>({
    emptyForm: () => ({ ...EMPTY }),
    toForm,
    create: async (f) => {
      const created = await $fetch<Client>('/api/clients', { method: 'POST', body: toBody(f) })
      await refreshClients()
      return created
    },
    update: async (target, f) => {
      const updated = await $fetch<Client>(`/api/clients/${target.id}`, { method: 'PATCH', body: toBody(f) })
      await refreshClients()
      return updated
    },
    remove: async (target) => {
      await $fetch(`/api/clients/${target.id}`, { method: 'DELETE' })
      await refreshClients()
    },
    createdMsg: 'Client ajouté.',
    updatedMsg: 'Client mis à jour.',
    deletedMsg: 'Client supprimé.',
  })

  // Auto-fill : cheffe de projet / sysadmin → pré-remplir son propre compte (modifiable)
  function openAdd(): void {
    crud.openAdd(
      user.value && ['pm', 'sysadmin'].includes(user.value.role)
        ? { project_manager_id: user.value.id }
        : undefined,
    )
  }

  return { ...crud, openAdd }
}
