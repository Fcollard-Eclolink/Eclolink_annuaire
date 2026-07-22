import { count, sql } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { users } from '~/server/db/schema'
import { hashPassword } from '~/server/utils/password'
import { createSession } from '~/server/utils/session'

interface BootstrapBody {
  email      : string
  password   : string
  first_name?: string
  last_name ?: string
}

// Amorçage du 1er compte sysadmin. Ne fonctionne QUE si la table users est vide
// (auto-désactivation ensuite) → sûr à laisser en place.
export default defineEventHandler(async (event): Promise<{ ok: true }> => {
  const ip = getClientIp(event)
  checkRateLimit({ key: `bootstrap:${ip}`, limit: 5, windowMs: 15 * 60 * 1000 })

  const body  = await readBody<BootstrapBody>(event)
  const email = validateOptionalEmail(body.email, 'Email')?.toLowerCase()
  if (!email) throw createError({ statusCode: 400, message: 'Email requis' })
  if (!body.password || body.password.length < 10) {
    throw createError({ statusCode: 400, message: 'Le mot de passe doit faire au moins 10 caractères' })
  }

  const password_hash = await hashPassword(body.password)
  const db = useDb()

  // Transaction + verrou consultatif : sérialise d'éventuels bootstraps concurrents
  // (sinon deux requêtes pourraient toutes deux voir 0 compte et créer 2 sysadmins).
  const userId = await db.transaction(async (tx): Promise<string | null> => {
    await tx.execute(sql`select pg_advisory_xact_lock(4242)`)
    const [stats] = await tx.select({ n: count() }).from(users)
    if ((stats?.n ?? 0) > 0) {
      throw createError({ statusCode: 403, message: 'Amorçage déjà effectué' })
    }
    const [row] = await tx.insert(users).values({
      email,
      password_hash,
      first_name          : clampString(body.first_name, 100) ?? '',
      last_name           : clampString(body.last_name, 100) ?? '',
      role                : 'sysadmin',
      is_active           : true,
      must_change_password: false,
    }).returning({ id: users.id })
    return row?.id ?? null
  })

  if (userId) await createSession(event, userId)
  return { ok: true }
})
