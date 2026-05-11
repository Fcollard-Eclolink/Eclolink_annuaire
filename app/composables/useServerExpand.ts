/**
 * Persistance de l'état déplié/replié des blocs serveur dans localStorage.
 * Inspiré de la v1 : un seul JSON par utilisateur, une seule clé.
 *
 * Clé : `eclolink_collapsed_<userId>`
 * Valeur : JSON array des groupId *repliés* (les non-listés sont ouverts par défaut).
 *
 * useState() assure que toutes les instances d'AppServerBlock partagent
 * le même état réactif sans double-lecture du localStorage.
 */
export function useServerExpand() {
  const { user } = useAuth()

  // État partagé (singleton Nuxt) — tableau des groupId repliés
  const collapsed = useState<string[]>('srv:collapsed', () => [])
  const loaded    = useState<boolean>('srv:collapsed:loaded', () => false)

  function storageKey(): string | null {
    return user.value ? `eclolink_collapsed_${user.value.id}` : null
  }

  /** À appeler une seule fois au montage du premier bloc. */
  function load(): void {
    if (loaded.value || !import.meta.client) return
    loaded.value = true
    const key = storageKey()
    if (!key) return
    try {
      const raw = localStorage.getItem(key)
      if (raw) collapsed.value = JSON.parse(raw) as string[]
    } catch { /* ignore */ }
  }

  function save(): void {
    if (!import.meta.client) return
    const key = storageKey()
    if (!key) return
    try {
      localStorage.setItem(key, JSON.stringify(collapsed.value))
    } catch { /* ignore */ }
  }

  function isOpen(groupId: string): boolean {
    return !collapsed.value.includes(groupId)
  }

  function setOpen(groupId: string, open: boolean): void {
    const idx = collapsed.value.indexOf(groupId)
    if (open && idx >= 0) {
      collapsed.value.splice(idx, 1)
      save()
    } else if (!open && idx < 0) {
      collapsed.value.push(groupId)
      save()
    }
  }

  function toggle(groupId: string): void {
    setOpen(groupId, !isOpen(groupId))
  }

  return { load, isOpen, setOpen, toggle }
}
