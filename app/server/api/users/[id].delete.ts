import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { users, maintenances, clients } from '~/server/db/schema'
import { formatUserLabel, logActivity } from '~/server/utils/activity-log'

// Suppression définitive d'un compte — RÉSERVÉ AUX SYSADMINS.
// Détache d'abord les références sans cascade (developer_id / project_manager_id),
// puis supprime. Les sessions (cascade) et les logs (set null) sont gérés par la DB.
export default defineEventHandler(async (event): Promise<{ ok: boolean }> => {
  const actor = await requireRole(event, ['sysadmin'])
  const id = requireId(event)

  if (id === actor.id) {
    throw createError({ statusCode: 400, message: 'Vous ne pouvez pas supprimer votre propre compte' })
  }

  const db = useDb()
  const [target] = await db.select({
    first_name: users.first_name,
    last_name : users.last_name,
    role      : users.role,
    email     : users.email,
  }).from(users).where(eq(users.id, id)).limit(1)
  if (!target) throw createError({ statusCode: 404, message: 'Profil introuvable' })

  await db.update(maintenances).set({ developer_id: null }).where(eq(maintenances.developer_id, id))
  await db.update(clients).set({ project_manager_id: null }).where(eq(clients.project_manager_id, id))

  const deleted = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id })
  if (!deleted.length) throw createError({ statusCode: 404, message: 'Profil introuvable' })

  await logActivity(event, 'delete', 'user', id, formatUserLabel(target))
  return { ok: true }
})
