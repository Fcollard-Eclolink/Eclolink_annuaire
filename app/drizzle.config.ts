import { defineConfig } from 'drizzle-kit'

declare const process: { env: Record<string, string | undefined> }

// Config drizzle-kit — `generate` (SQL depuis schema.ts) ne se connecte pas ;
// `migrate`/`push` utilisent dbCredentials.url (NUXT_DATABASE_URL / DATABASE_URL).

export default defineConfig({
  dialect       : 'postgresql',
  schema        : './server/db/schema.ts',
  out           : './server/db/migrations',
  dbCredentials : {
    url: process.env.NUXT_DATABASE_URL ?? process.env.DATABASE_URL ?? 'postgres://localhost:5432/placeholder',
  },
})
