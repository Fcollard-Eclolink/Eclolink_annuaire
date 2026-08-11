import { databases } from '~/server/db/schema'
import { patchOrFetch } from '~/server/utils/db-crud'

interface BddPatch {
  name ?: string
  type ?: string | null
  notes?: string | null
}

export default defineEventHandler(async (event): Promise<Bdd> => {
  await requireRole(event, WRITE_ROLES)
  const id = requireId(event)
  const body = await readBody<BddPatch>(event)

  const patch: Partial<typeof databases.$inferInsert> = {}
  if (body.name  !== undefined) patch.name  = requireString(body.name, 'Nom', 200)
  if (body.type  !== undefined) patch.type  = clampString(body.type, 100)
  if (body.notes !== undefined) patch.notes = clampString(body.notes, 5000)

  return patchOrFetch<Bdd>(databases, databases.id, id, patch, 'Base de données introuvable')
})
