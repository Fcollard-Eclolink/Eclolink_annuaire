import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Client Drizzle singleton. Créé hors contexte de requête → lit process.env
// directement (NUXT_DATABASE_URL est exposé par Nitro dans l'environnement).
// La base n'est jointe QUE par le serveur : aucune RLS, connexion de confiance.

type Database = ReturnType<typeof drizzle<typeof schema>>

let _db: Database | null = null

export function useDb(): Database {
  if (_db) return _db

  const url = process.env.NUXT_DATABASE_URL ?? process.env.DATABASE_URL
  if (!url) throw createError({ statusCode: 500, message: 'DATABASE_URL manquant' })

  const client = postgres(url)
  _db = drizzle(client, { schema })
  return _db
}

export { schema }
