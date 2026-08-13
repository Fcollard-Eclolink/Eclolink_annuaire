export type ToastType = 'success' | 'error'

export interface ToastAction {
  label  : string
  onClick: () => void
}

export interface Toast {
  id     : string
  message: string
  type   : ToastType
  action?: ToastAction
}

export function useToast() {
  const toasts = useState<Toast[]>('toasts', () => [])

  function add(message: string, type: ToastType = 'success', opts?: { action?: ToastAction; durationMs?: number }): void {
    const id = Math.random().toString(36).slice(2)
    toasts.value.push({ id, message, type, action: opts?.action })
    setTimeout(() => remove(id), opts?.durationMs ?? 3500)
  }

  function remove(id: string): void {
    const idx = toasts.value.findIndex(t => t.id === id)
    if (idx !== -1) toasts.value.splice(idx, 1)
  }

  return { toasts, add, remove }
}
