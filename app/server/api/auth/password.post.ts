import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { users } from '~/server/db/schema'
import { hashPassword, verifyPassword } from '~/server/utils/password'
import { createSession, revokeAllUserSessions } from '~/server/utils/session'

interface ChangePasswordBody {
  current_password: string
  new_password    : string
}

// Changement de son propre mot de passe. Révoque toutes les sessions existantes
// (déconnecte les autres appareils) puis en recrée une pour rester connecté.
export default defineEventHandler(async (event): Promise<{ ok: true }> => {
  const user = await requireUser(event)
  const { current_password, new_password } = await readBody<ChangePasswordBody>(event)

  if (!current_password || !new_password) {
    throw createError({ statusCode: 400, message: 'Mot de passe actuel et nouveau requis' })
  }
  if (new_password.length < 10) {
    throw createError({ statusCode: 400, message: 'Le nouveau mot de passe doit faire au moins 10 caractères' })
  }

  const ok = await verifyPassword(current_password, user.password_hash)
  if (!ok) throw createError({ statusCode: 401, message: 'Mot de passe actuel incorrect' })

  const db = useDb()
  await db.update(users)
    .set({ password_hash: await hashPassword(new_password), must_change_password: false })
    .where(eq(users.id, user.id))

  await revokeAllUserSessions(user.id)
  await createSession(event, user.id)

  return { ok: true }
})
