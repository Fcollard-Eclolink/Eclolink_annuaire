import type { AuthUser } from '~/server/utils/types'

// Plugin universel : s'exécute côté serveur ET client.
// useRequestFetch() forward les cookies httpOnly de la requête entrante (SSR)
// vers l'appel interne /api/auth/me — sans ça, getCookie() ne voit rien.
export default defineNuxtPlugin(async (): Promise<void> => {
  const { user } = useAuth()

  if (!user.value) {
    const fetchWithCookies = useRequestFetch()
    user.value = await fetchWithCookies<AuthUser>('/api/auth/me')
      .catch(() => null)
  }
})
