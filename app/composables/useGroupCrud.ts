import type { Ref } from 'vue'
import type { Group, Site } from '~/server/utils/types'
import type { GroupForm } from '~/components/AppGroupFormModal.vue'

const EMPTY: GroupForm = { name: '', hoster: '', ip_local: '', ip_public: '', web_server: '', database_id: '' }

function toForm(g: Group): GroupForm {
  return {
    name       : g.name,
    hoster     : g.hoster      ?? '',
    ip_local   : g.ip_local    ?? '',
    ip_public  : g.ip_public   ?? '',
    web_server : g.web_server  ?? '',
    database_id: g.database_id ?? '',
  }
}

function toBody(f: GroupForm): Record<string, unknown> {
  return {
    name: f.name.trim(),
    ...trimOrNull(f, ['hoster', 'ip_local', 'ip_public', 'web_server']),
    database_id: f.database_id || null,
  }
}

export function useGroupCrud(groups: Ref<Group[]>, sites: Ref<Site[]>) {
  return useCrudModal<Group, GroupForm>({
    emptyForm: () => ({ ...EMPTY }),
    toForm,
    validate: (f) => (f.name.trim() ? null : 'Le nom est requis.'),
    create: async (f) => {
      const created = await $fetch<Group>('/api/groups', { method: 'POST', body: toBody(f) })
      groups.value = [...groups.value, created].sort((a, b) => a.name.localeCompare(b.name, 'fr', { numeric: true }))
      return created
    },
    update: async (target, f) => {
      const updated = await $fetch<Group>(`/api/groups/${target.id}`, { method: 'PATCH', body: toBody(f) })
      const idx = groups.value.findIndex(g => g.id === target.id)
      if (idx !== -1) { const next = groups.value.slice(); next[idx] = updated; groups.value = next }
      return updated
    },
    remove: async (target) => {
      await $fetch(`/api/groups/${target.id}`, { method: 'DELETE' })
      groups.value = groups.value.filter(g => g.id !== target.id)
      for (const s of sites.value) {
        if (s.group_id === target.id) s.group_id = null
      }
    },
    createdMsg: 'Serveur créé.',
    updatedMsg: 'Serveur mis à jour.',
    deletedMsg: 'Serveur supprimé.',
  })
}
