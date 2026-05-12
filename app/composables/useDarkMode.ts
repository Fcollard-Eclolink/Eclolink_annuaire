const STORAGE_KEY = 'eclolink:theme'

function apply(dark: boolean): void {
  if (import.meta.client) {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  }
}

export function useDarkMode() {
  const isDark = useState<boolean>('darkMode', () => false)

  function init(): void {
    if (!import.meta.client) return
    const stored = localStorage.getItem(STORAGE_KEY)
    const dark = stored ? stored === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
    isDark.value = dark
    apply(dark)
  }

  function toggle(): void {
    isDark.value = !isDark.value
    apply(isDark.value)
    if (import.meta.client)
      localStorage.setItem(STORAGE_KEY, isDark.value ? 'dark' : 'light')
  }

  return { isDark, init, toggle }
}
