import type { AuthUser } from '~/server/utils/types'

export const useAuth = () => {
  const user = useState<AuthUser | null>('auth:user', () => null)

  async function logout(): Promise<void> {
    await $fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined)
    user.value = null
    await navigateTo('/login')
  }

  return { user, logout }
}
