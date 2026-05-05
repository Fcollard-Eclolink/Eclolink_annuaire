export default defineEventHandler(async (event) => {
  // Révocation côté Supabase (best effort — si le token est déjà expiré c'est ok)
  const token = getAccessToken(event)
  if (token) {
    const config = useRuntimeConfig()
    await fetch(`${config.supabaseUrl}/auth/v1/logout`, {
      method  : 'POST',
      headers : { apikey: config.supabaseKey, Authorization: `Bearer ${token}` },
    }).catch(() => {})
  }

  clearTokenCookies(event)
  return { ok: true }
})
