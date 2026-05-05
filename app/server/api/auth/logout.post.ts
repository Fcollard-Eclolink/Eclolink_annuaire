export default defineEventHandler(async (event) => {
  const token = getAccessToken(event)

  if (token) {
    const { supabaseUrl, supabaseKey } = useRuntimeConfig()
    // Révocation best-effort — si le token est déjà expiré c'est ok
    await fetch(`${supabaseUrl}/auth/v1/logout`, {
      method  : 'POST',
      headers : { apikey: supabaseKey, Authorization: `Bearer ${token}` },
    }).catch(() => undefined)
  }

  clearTokenCookies(event)
  return { ok: true }
})
