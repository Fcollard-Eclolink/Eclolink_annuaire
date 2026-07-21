// Migration des données Supabase → PostgreSQL auto-hébergé.
//
// Copie les tables métier/référence dans l'ordre des dépendances. N'importe PAS
// les comptes (décision : reset propre — recréés via bootstrap + admin), ni les
// logs d'activité (transient), ni la table legacy eclolink_interventions.
// Les FK vers les utilisateurs (developer_id, project_manager_id) sont forcées à
// null puisque la nouvelle table users démarre vide.
//
// Prérequis : le schéma cible doit être migré (npm run db:migrate) et vide.
//
// Usage (depuis app/) :
//   SOURCE_DATABASE_URL="postgres://postgres:<pwd>@db.<ref>.supabase.co:5432/postgres" \
//   NUXT_DATABASE_URL="postgres://eclolink:<pwd>@localhost:5432/eclolink" \
//   node scripts/migrate-from-supabase.mjs

import postgres from 'postgres'

const SRC_URL = process.env.SOURCE_DATABASE_URL
const DST_URL = process.env.NUXT_DATABASE_URL ?? process.env.DATABASE_URL

if (!SRC_URL || !DST_URL) {
  console.error('❌ SOURCE_DATABASE_URL (Supabase) et NUXT_DATABASE_URL (cible) sont requis.')
  process.exit(1)
}

// Ordre = respect des clés étrangères de la cible.
const TABLES = [
  { name: 'eclolink_databases' },
  { name: 'eclolink_agencies' },
  { name: 'eclolink_hosters' },
  { name: 'eclolink_web_servers' },
  { name: 'eclolink_dns_providers' },
  { name: 'eclolink_technologies' },
  { name: 'eclolink_maintenance_types' },
  { name: 'eclolink_clients',      nullCols: ['project_manager_id'] },
  { name: 'eclolink_groups' },
  { name: 'eclolink_sites' },
  { name: 'eclolink_maintenances', nullCols: ['developer_id'] },
]

const src = postgres(SRC_URL, { ssl: 'require' })
const dst = postgres(DST_URL)

try {
  for (const t of TABLES) {
    const rows = await src`select * from ${src(t.name)}`
    if (!rows.length) { console.log(`• ${t.name}: 0 ligne`); continue }

    const cleaned = rows.map((r) => {
      const o = { ...r }
      for (const c of t.nullCols ?? []) o[c] = null
      return o
    })

    await dst`insert into ${dst(t.name)} ${dst(cleaned)} on conflict (id) do nothing`
    console.log(`✓ ${t.name}: ${cleaned.length} ligne(s)`)
  }
  console.log('\n✅ Migration des données terminée.')
  console.log('→ Créez le 1er compte via POST /api/auth/bootstrap, puis les autres via /admin.')
} catch (err) {
  console.error('\n❌ Échec de la migration :', err)
  process.exitCode = 1
} finally {
  await src.end({ timeout: 5 })
  await dst.end({ timeout: 5 })
}
