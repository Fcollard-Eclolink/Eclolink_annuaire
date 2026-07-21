import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { users } from '~/server/db/schema'
import { verifyPassword } from '~/server/utils/password'
import { createSession } from '~/server/utils/session'

interface LoginBody {
  email   : string
  password: string
}

export default defineEventHandler(async (event): Promise<{ ok: true }> => {
  const { email, password } = await readBody<LoginBody>(event)

  if (!email || !password) {
    throw createError({ statusCode: 400, message: 'Email et mot de passe requis' })
  }

  // Rate limit : max 5 tentatives par IP sur 15 min. Throw 429 si dépassé.
  const ip = getClientIp(event)
  checkRateLimit({
    key     : `login:${ip}`,
    limit   : 5,
    windowMs: 15 * 60 * 1000,
  })

  const normalized = email.trim().toLowerCase()
  const db         = useDb()
  const rows       = await db.select().from(users).where(eq(users.email, normalized)).limit(1)
  const user       = rows[0]

  // On vérifie le hash seulement si le compte existe. Message générique dans
  // tous les cas (email inexistant / mauvais mdp / compte désactivé) → pas
  // d'énumération des comptes.
  const passwordOk = user ? await verifyPassword(password, user.password_hash) : false
  if (!user || !user.is_active || !passwordOk) {
    throw createError({ statusCode: 401, message: 'Email ou mot de passe incorrect' })
  }

  await createSession(event, user.id)
  await db.update(users).set({ last_login_at: new Date().toISOString() }).where(eq(users.id, user.id))

  // Login OK → on remet le compteur à zéro pour cette IP
  clearRateLimit(`login:${ip}`)

  return { ok: true }
})
