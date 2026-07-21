import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { users, maintenances, clients } from '~/server/db/schema'

// Suppression définitive d'un compte — RÉSERVÉ AUX SYSADMINS.
// Détache d'abord les références sans cascade (developer_id / project_manager_id),
// puis supprime. Les sessions (cascade) et les logs (set null) sont gérés par la DB.
export default defineEventHandler(async (event): Promise<{ ok: boolean }> => {
  const actor = await requireRole(event, ['sysadmin'])
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requis' })

  if (id === actor.id) {
    throw createError({ statusCode: 400, message: 'Vous ne pouvez pas supprimer votre propre compte' })
  }

  const db = useDb()
  await db.update(maintenances).set({ developer_id: null }).where(eq(maintenances.developer_id, id))
  await db.update(clients).set({ project_manager_id: null }).where(eq(clients.project_manager_id, id))

  const deleted = await db.delete(users).where(eq(users.id, id)).returning({ id: users.id })
  if (!deleted.length) throw createError({ statusCode: 404, message: 'Profil introuvable' })

  void logActivity(event, 'delete', 'user', id, null)
  return { ok: true }
})
