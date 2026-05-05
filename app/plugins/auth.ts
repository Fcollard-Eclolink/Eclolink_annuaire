// Plugin universel : s'exécute côté serveur ET client.
// Côté serveur, useRequestFetch() forward les cookies httpOnly du navigateur
// vers l'appel interne /api/auth/me — sans ça, getCookie() ne voit rien.
// Côté client, $fetch transmet déjà les cookies automatiquement.
export default defineNuxtPlugin(async () => {
  const { user } = useAuth()

  if (!user.value) {
    // useRequestFetch() = $fetch avec les headers de la requête entrante (SSR)
    const fetch = useRequestFetch()
    user.value = await fetch<{ id: string; email: string }>('/api/auth/me')
      .catch(() => null)
  }
})
