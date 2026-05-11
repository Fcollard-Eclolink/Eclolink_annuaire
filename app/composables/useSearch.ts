import type { Ref } from 'vue'
import type { Site, Group } from '~/server/utils/types'

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c),
  )
}

export function useSearch(
  sites : Ref<Site[]  | null>,
  groups: Ref<Group[] | null>,
) {
  const query    = ref('')
  const inputRef = ref<HTMLInputElement | null>(null)

  const isActive = computed(() => query.value.trim().length > 0)

  const results = computed((): Site[] => {
    if (!isActive.value || !sites.value) return []
    const q = query.value.trim().toLowerCase()
    return sites.value.filter(s => s.name.toLowerCase().includes(q))
  })

  /** Retourne le nom HTML avec la portion recherchée encadrée par <mark>. */
  function highlightName(name: string): string {
    const q = query.value.trim()
    if (!q) return escapeHtml(name)
    const escaped = escapeHtml(name)
    const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    return escaped.replace(re, '<mark class="search-hl">$1</mark>')
  }

  /** Retourne le nom du serveur pour un site (ou chaîne vide). */
  function serverLabel(site: Site): string {
    if (!site.group_id || !groups.value) return ''
    return groups.value.find(g => g.id === site.group_id)?.name ?? ''
  }

  function focus(): void {
    inputRef.value?.focus()
  }

  function clear(): void {
    query.value = ''
  }

  return { query, inputRef, isActive, results, highlightName, serverLabel, focus, clear }
}
