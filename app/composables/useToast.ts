export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id     : string
  message: string
  type   : ToastType
}

export function useToast() {
  const toasts = useState<Toast[]>('toasts', () => [])

  function add(message: string, type: ToastType = 'success'): void {
    const id = Math.random().toString(36).slice(2)
    toasts.value.push({ id, message, type })
    setTimeout(() => remove(id), 3500)
  }

  function remove(id: string): void {
    const idx = toasts.value.findIndex(t => t.id === id)
    if (idx !== -1) toasts.value.splice(idx, 1)
  }

  return { toasts, add, remove }
}
