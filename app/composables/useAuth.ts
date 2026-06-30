import type { SupabaseUser } from '~/server/utils/supabase'

export const useAuth = () => {
  const user = useState<SupabaseUser | null>('auth:user', () => null)

  async function logout(): Promise<void> {
    await $fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined)
    user.value = null
    await navigateTo('/login')
  }

  return { user, logout }
}
