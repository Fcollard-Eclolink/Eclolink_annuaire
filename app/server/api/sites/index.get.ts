import { asc } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { sites } from '~/server/db/schema'

export default defineEventHandler(async (event): Promise<Site[]> => {
  const actor = await requireUser(event)
  const rows  = await useDb().select().from(sites).orderBy(asc(sites.name))

  // La clé API WordPress ne sert qu'à la gestion des sites (WRITE_ROLES) —
  // un viewer n'en a pas besoin et ne doit pas pouvoir la lire.
  if (!WRITE_ROLES.includes(actor.role)) return rows.map((r): Site => ({ ...r, wp_api_key: null }))
  return rows
})
