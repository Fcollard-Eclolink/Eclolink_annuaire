// Plugin universel : s'exécute côté serveur ET client.
// Côté serveur, les cookies httpOnly sont lisibles par le server route /api/auth/me.
// Côté client, $fetch transmet automatiquement les cookies de session.
export default defineNuxtPlugin(async () => {
  const { user } = useAuth()

  // On ne re-fetch que si l'état n'est pas déjà hydraté depuis le serveur
  if (!user.value) {
    user.value = await $fetch<{ id: string; email: string }>('/api/auth/me')
      .catch(() => null)
  }
})
