import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { users } from '~/server/db/schema'
import { hashPassword } from '~/server/utils/password'
import { revokeAllUserSessions } from '~/server/utils/session'

interface ResetBody {
  new_password: string
}

// Réinitialisation du mot de passe d'un compte — RÉSERVÉ AUX SYSADMINS.
// Force le changement au prochain login et révoque les sessions existantes.
export default defineEventHandler(async (event): Promise<{ ok: true }> => {
  await requireRole(event, ['sysadmin'])
  const id = requireId(event)

  const { new_password } = await readBody<ResetBody>(event)
  if (!new_password || new_password.length < 10) {
    throw createError({ statusCode: 400, message: 'Le mot de passe doit faire au moins 10 caractères' })
  }

  const db = useDb()
  const [row] = await db.update(users)
    .set({ password_hash: await hashPassword(new_password), must_change_password: true })
    .where(eq(users.id, id))
    .returning({ id: users.id, email: users.email })

  if (!row) throw createError({ statusCode: 404, message: 'Profil introuvable' })

  await revokeAllUserSessions(id)
  void logActivity(event, 'update', 'user', id, row.email)
  return { ok: true }
})
