import type { Ref } from 'vue'

// Positionnement adaptatif : détermine si un panneau (dropdown / popover) doit
// s'ouvrir vers le HAUT faute de place suffisante en dessous du déclencheur.
// À l'ouverture, mesure l'espace viewport sous/au-dessus du trigger.
export function useFlipUp(
  triggerRef: Ref<HTMLElement | null>,
  isOpen: Ref<boolean>,
  estimatedHeight = 280,
): { openUp: Ref<boolean> } {
  const openUp = ref(false)

  watch(isOpen, (open: boolean): void => {
    if (!open) { openUp.value = false; return }
    void nextTick((): void => {
      const el = triggerRef.value
      if (!el) return
      const rect       = el.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top
      // Bascule vers le haut seulement si ça manque en bas ET qu'il y a plus de place en haut.
      openUp.value = spaceBelow < estimatedHeight && spaceAbove > spaceBelow
    })
  })

  return { openUp }
}
