export default defineEventHandler(async (event) => {
  const { email, password } = await readBody<{ email: string; password: string }>(event)

  if (!email || !password) {
    throw createError({ statusCode: 400, message: 'Email et mot de passe requis' })
  }

  const config = useRuntimeConfig()

  const res = await fetch(
    `${config.supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method  : 'POST',
      headers : { apikey: config.supabaseKey, 'Content-Type': 'application/json' },
      body    : JSON.stringify({ email, password }),
    },
  )

  if (!res.ok) {
    throw createError({ statusCode: 401, message: 'Email ou mot de passe incorrect' })
  }

  const data = await res.json()

  setTokenCookies(event, data)

  // On ne renvoie rien de sensible au client
  return { ok: true }
})
