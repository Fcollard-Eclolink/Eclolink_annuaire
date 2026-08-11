import type { Client } from '~/server/utils/types'
import { useDb } from '~/server/db'
import { clients } from '~/server/db/schema'
import { assertRow } from '~/server/utils/db-crud'

interface ClientCreate {
  name                 : string
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
  const body = await readBody<ClientCreate>(event)

  const values = {
    id                   : crypto.randomUUID(),
    name                 : requireString(body.name, 'Nom', 200),
    agency               : clampString(body.agency, 200),
    contact_name         : clampString(body.contact_name, 200),
    contact_email        : validateOptionalEmail(body.contact_email, 'Email de contact'),
    contact_phone        : clampString(body.contact_phone, 50),
    notes                : clampString(body.notes, 5000),
    monthly_quota_minutes: validateOptionalNonNegativeNumber(body.monthly_quota_minutes, 'Quota mensuel'),
    monthly_amount       : validateOptionalNonNegativeNumber(body.monthly_amount,        'Montant forfait'),
    project_manager_id   : body.project_manager_id ?? null,
  }

  const [row] = await useDb().insert(clients).values(values).returning()
  return assertRow(row, 'Erreur lors de la création')
})
