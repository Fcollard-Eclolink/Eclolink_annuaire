/**
 * Directive globale `v-modal-close` — appelle la fonction passée quand l'utilisateur
 * clique sur l'overlay de modale, en ignorant les clics qui ont commencé à l'intérieur
 * de la modale et terminé sur l'overlay (drag-out, sélection de texte qui sort, etc.).
 *
 * Usage : <div class="modal-overlay" v-modal-close="() => emit('close')">
 */
const cleanups = new WeakMap<HTMLElement, () => void>()

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive<HTMLElement, () => void>('modal-close', {
    mounted(el, binding): void {
      let mousedownOnOverlay = false

      const onMousedown = (e: MouseEvent): void => {
        mousedownOnOverlay = e.target === el
      }
      const onMouseup = (e: MouseEvent): void => {
        if (mousedownOnOverlay && e.target === el) binding.value()
        mousedownOnOverlay = false
      }

      el.addEventListener('mousedown', onMousedown)
      el.addEventListener('mouseup',   onMouseup)
      cleanups.set(el, (): void => {
        el.removeEventListener('mousedown', onMousedown)
        el.removeEventListener('mouseup',   onMouseup)
      })
    },
    unmounted(el): void {
      cleanups.get(el)?.()
      cleanups.delete(el)
    },
  })
})
