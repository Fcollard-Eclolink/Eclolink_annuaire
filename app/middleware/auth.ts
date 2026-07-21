export default defineNuxtRouteMiddleware((to) => {
  if (to.path === '/login') return

  const { user } = useAuth()
  if (!user.value) return navigateTo('/login')

  // Changement de mot de passe forcé (1er login ou reset par un admin).
  if (user.value.must_change_password && to.path !== '/change-password') {
    return navigateTo('/change-password')
  }
})
