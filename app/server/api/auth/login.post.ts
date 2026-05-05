interface LoginBody {
  email   : string
  password: string
}

export default defineEventHandler(async (event) => {
  const { email, password } = await readBody<LoginBody>(event)

  if (!email || !password) {
    throw createError({ statusCode: 400, message: 'Email et mot de passe requis' })
  }

  const { supabaseUrl, supabaseKey } = useRuntimeConfig()

  const res = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method  : 'POST',
      headers : { apikey: supabaseKey, 'Content-Type': 'application/json' },
      body    : JSON.stringify({ email, password }),
    },
  )

  if (!res.ok) {
    throw createError({ statusCode: 401, message: 'Email ou mot de passe incorrect' })
  }

  const data = (await res.json()) as SupabaseTokenData
  setTokenCookies(event, data)

  return { ok: true }
})
