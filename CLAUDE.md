# Eclolink Annuaire — CLAUDE.md

Contexte permanent pour toutes les sessions Claude sur ce projet.

---

## Projet

Annuaire interne Eclolink des serveurs et sites web.

- **v1** (branche `main`) — application statique HTML/JS/CSS, Supabase REST direct.
- **v2** (branche `v2-dev`) — Nuxt + Vue + Docker, **PostgreSQL auto-hébergé** via
  Drizzle ORM, **authentification maison** (sessions serveur). **Plus aucune dépendance
  Supabase** (migration réalisée — voir `docs/MIGRATION-SELF-HOSTED.md`).

---

## Stack technique v2

| Couche | Technologie | Version |
|---|---|---|
| Framework | Nuxt | `^4.4.6` |
| UI | Vue | `^3.5.33` |
| Routeur | Vue Router | `^4.5.0` |
| Backend | Nitro (intégré Nuxt) | auto |
| HTTP serveur | H3 (intégré Nitro) | auto |
| Base de données | PostgreSQL (auto-hébergé) | 16 |
| ORM | Drizzle ORM + `postgres` (driver) | `^0.45` / `^3.4` |
| Migrations | drizzle-kit | `^0.31` |
| Conteneur | Docker + Docker Compose | — |

**Aucune dépendance UI externe** (pas de Nuxt UI, pas de Tailwind, pas de Pinia).
CSS vanilla avec variables CSS (`assets/css/`). Seules dépendances runtime ajoutées :
`drizzle-orm`, `postgres`. Le hash des mots de passe utilise `node:crypto` (scrypt) —
aucune dépendance native.

---

## Architecture des fichiers

```
app/
  drizzle.config.ts     ← config drizzle-kit (dialect postgres, schema, migrations)
  server/
    db/
      schema.ts         ← schéma Drizzle (toutes les tables) — propriétés en snake_case
      index.ts          ← client Drizzle singleton : useDb()
      migrations/       ← migrations SQL versionnées (drizzle-kit generate)
    utils/
      auth.ts           ← getSessionUser / requireUser / requireRole / toAuthUser + WRITE_ROLES
      session.ts        ← createSession / resolveSessionUser / revoke* (sessions en base)
      password.ts       ← hashPassword / verifyPassword (scrypt)
      activity-log.ts   ← logActivity() (insert Drizzle, identité via session)
      rate-limit.ts     ← checkRateLimit / getClientIp
      validation.ts     ← requireString, clampString, validateOptional* …
      sanitize.ts       ← sanitizeSvg (XSS)
      types.ts          ← interfaces métier (Site, Group, Client, AuthUser, UserProfile…)
    api/
      auth/             ← login, logout, me, password (change self), bootstrap (1er admin)
      users/            ← index.get, index.post, [id].patch, [id]/reset-password.post
      sites/ groups/ clients/ technologies/ agencies/ hosters/ web-servers/
      dns-providers/ databases/ maintenance-types/ maintenances/  ← GET/POST/PATCH/DELETE
      logs/             ← index.get (journal d'activité)
  composables/
    useAuth.ts          ← useState('auth:user') : AuthUser + logout()
    useReferenceData.ts ← cache partagé (useState) des données de référence ; devUsers/pmUsers
    useTechBadge.ts     ← techTags(), techIconUrl() — lit useState('ref:techs')
    useSearch.ts / useSiteCrud.ts / useGroupCrud.ts / useServerExpand.ts
  plugins/
    auth.ts             ← initialise user au démarrage (useRequestFetch → /api/auth/me)
  middleware/
    auth.ts             ← redirige /login si non connecté ; /change-password si must_change_password
  components/           ← AppServerBlock, AppSiteRow, AppSelect, AppIconSelect, AppTechSelect,
                          AppFilterSelect, AppFilterBar, AppMultiSelect, AppDateInput,
                          AppConfirmModal, AppClientFormModal, AppGroupFormModal…
  pages/
    login.vue           ← page publique
    change-password.vue ← changement de mot de passe (forcé si must_change_password)
    index.vue / admin.vue / maintenance.vue / logs.vue
    clients/index.vue / clients/[id].vue
  assets/css/           ← main.css importe la base ; les CSS de page sont importés en
                          `import '~/assets/css/*.css'` dans le <script setup> concerné
  app.vue
  nuxt.config.ts        ← runtimeConfig: { databaseUrl, sessionSecret }
Dockerfile              ← image DEV (npm run dev, volume monté)
Dockerfile.prod         ← build PROD multi-stage (runner = node .output/server/index.mjs)
docker-compose.yml      ← DEV  : postgres + app (hot-reload)
docker-compose.prod.yml ← PROD : postgres + migrate (profil) + app
scripts/backup.sh       ← pg_dump + rétention 30j
app/scripts/migrate-from-supabase.mjs ← import ponctuel des données (npm run db:import)
```

---

## Base de données (PostgreSQL + Drizzle)

### Accès
- **Toutes** les requêtes passent par les server routes Nuxt (`server/api/`). Le client ne
  contacte jamais la base directement.
- Point d'entrée unique : **`useDb()`** (`server/db/index.ts`), client Drizzle singleton
  (driver `postgres`, lit `process.env.NUXT_DATABASE_URL`).
- **Pas de RLS** : la base n'est jointe que par le serveur Nitro (connexion de confiance).
  L'autorisation est **applicative** (`requireRole`, voir Sécurité).
- Le schéma Drizzle utilise des **noms de propriétés en snake_case** (= noms de colonnes) :
  les objets renvoyés sont donc sérialisés en snake_case, identiques aux contrats JSON du
  client. Les `created_at` sont en `mode: 'string'` ; les timestamps de `sessions` restent
  des `Date` (calculs d'expiration).

### Migrations
- `npm run db:generate` (depuis `app/`) → génère le SQL dans `server/db/migrations/`.
- `npm run db:migrate` → applique les migrations (lit `NUXT_DATABASE_URL`).
- Ne jamais éditer une migration déjà appliquée : modifier `schema.ts` puis régénérer.

### Tables (`server/db/schema.ts`)

| Table | Colonnes principales |
|---|---|
| `eclolink_users` | `id`(uuid), `email`(unique), `password_hash`, `first_name`, `last_name`, `role`, `agency`, `job_title`, `is_active`, `must_change_password`, `created_at`, `last_login_at` |
| `eclolink_sessions` | `id`, `token_hash`(unique), `user_id`→users, `expires_at`, `last_seen_at`, `user_agent`, `ip` |
| `eclolink_groups` | `id`(text), `name`, `hoster`, `ip_local`, `ip_public`, `web_server`, `database_id`→databases |
| `eclolink_sites` | `id`(text), `name`, `url`, `bo_url`, `gitlab_url`, `agency`, `group_id`, `php_version`, `dns_zone`, `go_live_date`, `technologies`, `client_id`→clients, `registrar`, `notes`, `has_maintenance` |
| `eclolink_clients` | `id`(text), `name`, `agency`, `contact_name`, `contact_email`, `contact_phone`, `notes`, `monthly_quota_minutes`, `monthly_amount`, `project_manager_id`→users |
| `eclolink_technologies` | `id`, `label`, `simpleicons_slug`, `svg`, `sort_order` |
| `eclolink_agencies` / `eclolink_hosters` / `eclolink_web_servers` / `eclolink_dns_providers` | `id`, `name`, (`simpleicons_slug`) |
| `eclolink_databases` | `id`, `name`, `type`, `notes` |
| `eclolink_maintenance_types` | `id`, `label` |
| `eclolink_maintenances` | `id`, `site_id`→sites, `client_id`→clients, `developer_id`→users, `intervention_date`, `has_incident`, `types`(CSV), `notes`, `duration_minutes`, `is_monthly_maintenance`, `created_at` |
| `eclolink_activity_logs` | `id`, `user_id`→users, `user_email`, `action`, `resource_type`, `resource_id`, `resource_label`, `created_at` |

> Les développeurs et cheffes de projet **ne sont plus des tables séparées** : ce sont des
> `eclolink_users` filtrés par `role` (`useReferenceData` → `devUsers` / `pmUsers`).
> IDs `text` conservés pour groups/sites/clients (historique) ; `uuid` ailleurs.

---

## Authentification & autorisation (maison)

### Sessions
- Login (`/api/auth/login`) : vérifie l'email + le mot de passe (scrypt), crée une session.
- **Token opaque** (`randomBytes(32)`) posé dans un cookie `httpOnly` `eclo_session` ; seul
  son **SHA-256** est stocké en base (fuite DB ⇒ session inutilisable).
- Cookie : `httpOnly`, `secure` en prod, `sameSite: 'lax'`, TTL 30 j **glissant**.
- **Révocable** : logout, désactivation de compte (`is_active=false`), changement de mdp
  (révoque toutes les sessions puis en recrée une).
- `resolveSessionUser()` vérifie session non expirée **et** `user.is_active`.

### Mots de passe
- Hash **scrypt** (`node:crypto`), salt unique, comparaison en temps constant (`timingSafeEqual`).
- Format stocké : `scrypt$<saltHex>$<keyHex>`. `password_hash` n'est **jamais** exposé au client.
- Minimum 10 caractères. `must_change_password` force le passage par `/change-password`.

### Comptes
- **Pas d'inscription publique.** Le 1er sysadmin est créé via `POST /api/auth/bootstrap`
  (ne fonctionne QUE si la table `users` est vide → auto-désactivant).
- Ensuite les comptes sont gérés par un **sysadmin** via `/admin` (onglet Utilisateurs) :
  `POST /api/users`, `PATCH /api/users/[id]` (profil/rôle/`is_active`),
  `POST /api/users/[id]/reset-password`.

### Autorisation par rôle — OBLIGATOIRE sur chaque route
Il n'y a plus de garde implicite (l'ancien `sbFetch` a disparu). **Chaque** route doit
appeler explicitement une garde, sinon elle est publique :
- Lectures (`GET`) : `await requireUser(event)` (tout authentifié, y compris `viewer`).
- Mutations (`POST`/`PATCH`/`DELETE`) : `await requireRole(event, WRITE_ROLES)` avec
  `WRITE_ROLES = ['sysadmin','dev','pm','crea']` (⇒ `viewer` en lecture seule).
- Gestion des comptes (`/api/users/*`, sauf `GET`) : `requireRole(event, ['sysadmin'])`.
- Garde anti-verrouillage : un sysadmin ne peut ni se rétrograder ni se désactiver lui-même.

Rôles : `sysadmin | dev | pm | crea | viewer`.

---

## Données de référence dynamiques

Technologies, hébergeurs, serveurs web, DNS, agences, bases, clients, sites, groupes,
maintenances et utilisateurs sont chargés via le composable **`useReferenceData()`**
(cache `useState` partagé, méthodes `load*` / `refresh*`). `devUsers` / `pmUsers` en
dérivent (filtre par `role` + exclusion des comptes `is_active=false`).

`useTechBadge` lit `useState('ref:techs')` — `techTags(site)` parse le champ `technologies`
(CSV ou JSON), normalise les IDs legacy (`LEGACY_IDS`), déduplique.

---

## Page Admin (`/admin`)

Onglets : Technologies · Agences · Hébergeurs · Serveurs web · DNS · Bases de données ·
**Utilisateurs** · Types maintenance. Chaque onglet : tableau + Ajouter + Edit/Supprimer +
modales. L'onglet Utilisateurs gère la création de comptes, l'édition profil/rôle, la
réinitialisation de mot de passe et l'activation/désactivation.

---

## Composants UI

- **`AppSelect`** — dropdown simple (Serveur, Cheffe de projet, Client, Agence, Rôle).
- **`AppIconSelect`** — dropdown avec logo simpleicons (Hébergeur, Serveur web, DNS, Registrar).
- **`AppTechSelect`** — multi-select technologies (pills), reçoit `:techs`.
- **`AppFilterSelect`** — multi-select à checkboxes pour les filtres (`FilterOption` exporté).
- **`AppDateInput`** — saisie masquée JJ/MM/AAAA, stocke en ISO `YYYY-MM-DD`.

Tous les dropdowns partagent le même style : `font-size: 13px`, `height: 34px`,
`padding: 0 12px`, options `7px 12px`.

---

## Règles TypeScript — STRICTES

### Zéro `any`
- **Interdit** : `: any`, `as any`, `<any>`, paramètres sans type, `any` implicite.
- Interfaces métier dans `server/utils/types.ts` (`Site`, `Group`, `Client`, `AuthUser`,
  `UserProfile`, `Technology`, `Agency`, `Hoster`, `WebServer`, `DnsProvider`, `Bdd`,
  `Maintenance`, `MaintenanceType`, `ActivityLog`).
- Types Drizzle inférés : `typeof table.$inferSelect` / `$inferInsert` ; `User`/`Session`
  exportés depuis `schema.ts`.

### Typage complet
- `defineEventHandler` déclare son type de retour : `Promise<Site[]>`, `Promise<AuthUser>`, etc.
- `useState` toujours générique : `useState<AuthUser | null>(...)`.
- Les interfaces (`Site`, `Agency`…) sont auto-importées dans les routes serveur.
  **Exception** : `Client` entre en collision avec le type global DOM `Client` → l'importer
  explicitement (`import type { Client } from '~/server/utils/types'`).

### Vérification
- `@types/node` est installé (scrypt/Buffer). Avant chaque push : `npm run typecheck`
  (**depuis `app/`**).

---

## Règles de stabilité

- Toutes les erreurs serveur via `createError({ statusCode, message })` — jamais de throw raw.
- Opérations non critiques : `.catch(() => undefined)` (ex. purge des logs).
- **PATCH sans champ fourni** → renvoie la ligne existante (no-op), pas d'erreur.
- **SSR** : `useRequestFetch()` dans le plugin auth pour forwarder les cookies httpOnly ;
  `useState` persiste l'état via le payload Nuxt.
- **Middleware** `auth` : ne bloque jamais `/login` ; redirige vers `/change-password` si
  `must_change_password`. `definePageMeta({ middleware: 'auth' })` sur chaque page protégée.

---

## Règles de scalabilité

### Ajouter une nouvelle entité de référence `eclolink_X`
1. Déclarer la table dans `server/db/schema.ts` (snake_case), puis `npm run db:generate`.
2. Ajouter l'interface dans `server/utils/types.ts`.
3. Créer les routes `server/api/X/` : `index.get` (`requireUser` + `orderBy`),
   `index.post` / `[id].patch` / `[id].delete` (`requireRole(WRITE_ROLES)`), via `useDb()`.
4. Ajouter l'onglet dans `admin.vue` et une entrée `load*/refresh*` dans `useReferenceData`.

### Server routes
- Pattern : `index.get.ts`, `index.post.ts`, `[id].patch.ts`, `[id].delete.ts`.
- `useDb()` + tables de `schema.ts` importés explicitement ; gardes (`requireUser`/
  `requireRole`) et helpers de validation auto-importés depuis `server/utils/`.
- GET triés (`asc(name)` ; `label` pour technologies/maintenance-types ; users par nom).

---

## Sécurité — NON NÉGOCIABLE

- Mots de passe : scrypt + salt unique + comparaison temps constant ; jamais exposés.
- Sessions : token opaque, stocké **hashé**, cookie `httpOnly/secure/sameSite=lax`, révocables.
- Rate-limit login (5 tentatives / 15 min / IP) ; message générique (anti-énumération).
- Autorisation par rôle sur **toutes** les mutations ; routes users réservées `sysadmin`.
- Aucune SQL concaténée à la main (Drizzle paramétré) → anti-injection.
- Secrets hors dépôt : `NUXT_DATABASE_URL`, `NUXT_SESSION_SECRET` en `runtimeConfig` (serveur
  uniquement, jamais `runtimeConfig.public`) ; `.env` est gitignore. HTTPS forcé en prod.
- Entrées validées avant usage (`readBody` typé + helpers `validation.ts`).
- SVG utilisateur (technologies) passé par `sanitizeSvg`.

---

## Workflow git

### Branches
- `main` — v1 statique (production) · `v2-dev` — v2 (développement actif).

### Avant chaque commit / push
- Pas de `any`, pas de secret hardcodé, `npm run typecheck` vert (depuis `app/`).
- Un hook agent Claude (`PreToolUse` sur `git push`) analyse sécurité + qualité.

### Convention de commit
```
type(scope): description courte

Corps optionnel détaillant le pourquoi.
```
Types : `feat`, `fix`, `chore`, `refactor`, `docs`.
**Ne jamais signer les commits** (pas de `Co-Authored-By`, aucune mention de l'assistant).

---

## Docker

- **Dev** : `docker compose up --build` — Postgres + app en `npm run dev` (volume `./app`
  monté). Migrer : `docker compose exec app npm run db:migrate`.
- **Prod** : `docker compose -f docker-compose.prod.yml up -d --build` (image `Dockerfile.prod`
  multi-stage). Migrer : `... --profile migrate run --rm migrate`. Config via `.env`
  (voir `.env.example`). Runbook complet : `docs/MIGRATION-SELF-HOSTED.md` §12.
- Accès : `http://localhost:3000`.
