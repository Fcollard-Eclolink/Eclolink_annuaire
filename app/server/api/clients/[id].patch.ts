import type { Client } from '~/server/utils/types'
import { clients } from '~/server/db/schema'
import { patchOrFetch } from '~/server/utils/db-crud'

interface ClientPatch {
  name                 ?: string
  agency               ?: string | null
  contact_name         ?: string | null
  contact_email        ?: string | null
  contact_phone        ?: string | null
  notes                ?: string | null
  monthly_quota_minutes?: number | null
  monthly_amount       ?: number | null
  project_manager_id   ?: string | null
}

export default defineEventHandler(async (event): Promise<Client> => {
  await requireRole(event, WRITE_ROLES)
  const id = requireId(event)

  const body = await readBody<ClientPatch>(event)

  const patch: Partial<typeof clients.$inferInsert> = {}
  if (body.name                  !== undefined) patch.name                  = requireString(body.name, 'Nom', 200)
  if (body.agency                !== undefined) patch.agency                = clampString(body.agency, 200)
  if (body.contact_name          !== undefined) patch.contact_name          = clampString(body.contact_name, 200)
  if (body.contact_email         !== undefined) patch.contact_email         = validateOptionalEmail(body.contact_email, 'Email de contact')
  if (body.contact_phone         !== undefined) patch.contact_phone         = clampString(body.contact_phone, 50)
  if (body.notes                 !== undefined) patch.notes                 = clampString(body.notes, 5000)
  if (body.monthly_quota_minutes !== undefined) patch.monthly_quota_minutes = validateOptionalNonNegativeNumber(body.monthly_quota_minutes, 'Quota mensuel')
  if (body.monthly_amount        !== undefined) patch.monthly_amount        = validateOptionalNonNegativeNumber(body.monthly_amount, 'Montant forfait')
  if (body.project_manager_id    !== undefined) patch.project_manager_id    = body.project_manager_id ?? null

  return patchOrFetch<Client>(clients, clients.id, id, patch, 'Client introuvable')
})
