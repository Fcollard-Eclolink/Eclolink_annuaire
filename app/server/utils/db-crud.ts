import type { PgColumn, PgTable } from 'drizzle-orm/pg-core'
import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db'

/** PATCH générique : no-op → fetch-or-404, sinon update-or-404. */
export async function patchOrFetch<T>(
  table: PgTable,
  idColumn: PgColumn,
  id: string,
  patch: Record<string, unknown>,
  notFoundMessage: string,
): Promise<T> {
  const db = useDb()
  if (Object.keys(patch).length === 0) {
    const [existing] = await db.select().from(table).where(eq(idColumn, id)).limit(1)
    if (!existing) throw createError({ statusCode: 404, message: notFoundMessage })
    return existing as T
  }
  const [row] = await db.update(table).set(patch).where(eq(idColumn, id)).returning()
  if (!row) throw createError({ statusCode: 404, message: notFoundMessage })
  return row as T
}

/** Vérifie qu'un insert/update a bien renvoyé une ligne, sinon 500. */
export function assertRow<T>(row: T | undefined, message: string): T {
  if (!row) throw createError({ statusCode: 500, message })
  return row
}

/** DELETE : renvoie la ligne supprimée (undefined si absente) — alimente le label du journal d'activité. */
export async function deleteAndReturn<T>(table: PgTable, idColumn: PgColumn, id: string): Promise<T | undefined> {
  const [row] = await useDb().delete(table).where(eq(idColumn, id)).returning()
  return row as T | undefined
}
