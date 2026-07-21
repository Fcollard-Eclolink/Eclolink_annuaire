import { useDb } from '~/server/db'
import { maintenanceTypes } from '~/server/db/schema'

interface MaintenanceTypeCreate {
  label: string
}

export default defineEventHandler(async (event): Promise<MaintenanceType> => {
  await requireRole(event, WRITE_ROLES)
  const body = await readBody<MaintenanceTypeCreate>(event)
  if (!body.label?.trim()) throw createError({ statusCode: 400, message: 'Le label est requis' })

  const [row] = await useDb().insert(maintenanceTypes).values({
    id   : crypto.randomUUID(),
    label: body.label.trim(),
  }).returning()

  if (!row) throw createError({ statusCode: 500, message: 'Erreur lors de la création' })
  return row
})
