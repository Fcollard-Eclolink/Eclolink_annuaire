import type { Ref } from 'vue'
import type { Site } from '~/server/utils/types'
import type { SiteEditForm } from '~/components/AppSiteFormModal.vue'

const EMPTY: SiteEditForm = {
  name: '', url: '', bo_url: '', gitlab_url: '', agency: '',
  group_id: '', php_version: '', dns_zone: '', go_live_date: '',
  technologies: '', client_id: '', registrar: '', notes: '',
  has_maintenance: false, wp_api_key: '',
}

function toForm(s: Site): SiteEditForm {
  return {
    name           : s.name,
    url            : s.url            ?? '',
    bo_url         : s.bo_url         ?? '',
    gitlab_url     : s.gitlab_url     ?? '',
    agency         : s.agency         ?? '',
    group_id       : s.group_id       ?? '',
    php_version    : s.php_version    ?? '',
    dns_zone       : s.dns_zone       ?? '',
    go_live_date   : s.go_live_date   ?? '',
    technologies   : s.technologies   ?? '',
    client_id      : s.client_id      ?? '',
    registrar      : s.registrar      ?? '',
    notes          : s.notes          ?? '',
    has_maintenance: s.has_maintenance,
    wp_api_key     : s.wp_api_key     ?? '',
  }
}

function toBody(f: SiteEditForm): Record<string, string | boolean | null> {
  return {
    name: f.name.trim(),
    ...trimOrNull(f, ['url', 'bo_url', 'gitlab_url', 'agency', 'php_version', 'dns_zone', 'technologies', 'registrar', 'notes', 'wp_api_key']),
    group_id       : f.group_id     || null,
    go_live_date   : f.go_live_date || null,
    client_id      : f.client_id    || null,
    has_maintenance: f.has_maintenance,
  }
}

export function useSiteCrud(sites: Ref<Site[]>) {
  return useCrudModal<Site, SiteEditForm>({
    emptyForm: () => ({ ...EMPTY }),
    toForm,
    validate: (f) => (f.name.trim() ? null : 'Le nom est requis.'),
    create: async (f) => {
      const created = await $fetch<Site>('/api/sites', { method: 'POST', body: toBody(f) })
      sites.value = [...sites.value, created].sort((a, b) => a.name.localeCompare(b.name, 'fr', { numeric: true }))
      return created
    },
    update: async (target, f) => {
      const updated = await $fetch<Site>(`/api/sites/${target.id}`, { method: 'PATCH', body: toBody(f) })
      const idx = sites.value.findIndex(s => s.id === target.id)
      if (idx !== -1) { const next = sites.value.slice(); next[idx] = updated; sites.value = next }
      return updated
    },
    remove: async (target) => {
      await $fetch(`/api/sites/${target.id}`, { method: 'DELETE' })
      sites.value = sites.value.filter(s => s.id !== target.id)
    },
    createdMsg: 'Site créé.',
    updatedMsg: 'Site mis à jour.',
    deletedMsg: 'Site supprimé.',
  })
}
