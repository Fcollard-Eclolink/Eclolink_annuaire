import type { SupabaseUser } from '~/server/utils/supabase'

export const useAuth = () => {
  // useState est persisté entre SSR et client via le payload Nuxt
  const user = useState<SupabaseUser | null>('auth:user', () => null)

  async function logout(): Promise<void> {
    await $fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined)
    user.value = null
    await navigateTo('/login')
  }

  return { user, logout }
}
