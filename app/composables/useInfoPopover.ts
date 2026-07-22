import type { Ref } from 'vue'

// Popover "infos" partagé (serveurs, sites) : ouverture exclusive (ferme les
// autres via l'évènement `info-popover:close`), fermeture au clic extérieur,
// et positionnement adaptatif (flip vers le haut) via useFlipUp.
export function useInfoPopover(): {
  isOpen : Ref<boolean>
  wrapRef: Ref<HTMLElement | null>
  btnRef : Ref<HTMLElement | null>
  openUp : Ref<boolean>
  toggle : (e: MouseEvent) => void
} {
  const isOpen  = ref(false)
  const wrapRef = ref<HTMLElement | null>(null)
  const btnRef  = ref<HTMLElement | null>(null)

  const { openUp } = useFlipUp(btnRef, isOpen, 220)

  function toggle(e: MouseEvent): void {
    e.stopPropagation()
    // Ferme tous les autres popovers avant d'ouvrir celui-ci.
    if (!isOpen.value) document.dispatchEvent(new CustomEvent('info-popover:close'))
    isOpen.value = !isOpen.value
  }

  function onDocClick(e: MouseEvent): void {
    if (wrapRef.value && !wrapRef.value.contains(e.target as Node)) isOpen.value = false
  }
  function onCloseAll(): void { isOpen.value = false }

  onMounted(() => {
    document.addEventListener('click', onDocClick)
    document.addEventListener('info-popover:close', onCloseAll as EventListener)
  })
  onUnmounted(() => {
    document.removeEventListener('click', onDocClick)
    document.removeEventListener('info-popover:close', onCloseAll as EventListener)
  })

  return { isOpen, wrapRef, btnRef, openUp, toggle }
}
