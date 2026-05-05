export interface AuthUser {
  id    : string
  email : string
}

export const useAuth = () => {
  const user = useState<AuthUser | null>('auth:user', () => null)

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    user.value = null
    await navigateTo('/login')
  }

  return { user, logout }
}
