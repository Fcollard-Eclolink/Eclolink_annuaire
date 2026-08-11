import type { Ref } from 'vue'

/** Ouverture/fermeture (clic extérieur) + bascule vers le haut, partagées par les dropdowns custom. */
export function useDropdown(): {
  isOpen    : Ref<boolean>
  wrapRef   : Ref<HTMLElement | null>
  triggerRef: Ref<HTMLElement | null>
  openUp    : Ref<boolean>
} {
  const isOpen     = ref(false)
  const wrapRef    = ref<HTMLElement | null>(null)
  const triggerRef = ref<HTMLElement | null>(null)

  function onDocClick(e: MouseEvent): void {
    if (wrapRef.value && !wrapRef.value.contains(e.target as Node)) isOpen.value = false
  }

  onMounted  (() => document.addEventListener('click', onDocClick))
  onUnmounted(() => document.removeEventListener('click', onDocClick))

  const { openUp } = useFlipUp(triggerRef, isOpen)

  return { isOpen, wrapRef, triggerRef, openUp }
}
