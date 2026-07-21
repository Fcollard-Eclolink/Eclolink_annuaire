# Migration Eclolink Annuaire — Sortie de Supabase vers serveurs Eclolink

Plan de migration : suppression complète de Supabase (base **et** auth), réhébergement
sur l'infrastructure Eclolink, reconstruction d'une authentification maison sécurisée
avec comptes multiples, rôles, et synchronisation dev / cheffes de projet.

> **Décisions actées**
> - Couche d'accès BDD : **Drizzle ORM** (typé bout-en-bout, migrations versionnées)
> - Sessions : **serveur, stockées en base** (token opaque révocable, cookie httpOnly)
> - Comptes : **créés par un admin**, sans email (pas de SMTP, pas d'inscription publique)
> - Moteur BDD : **PostgreSQL** (confirmé) — même moteur que Supabase, migration schéma/données 1:1

---

## 1. Choix du moteur : PostgreSQL (confirmé)

Supabase **est** un PostgreSQL managé. Migrer vers un Postgres auto-hébergé est le chemin
le moins risqué :

- Schéma et données transférables quasi 1:1 (`pg_dump`/`pg_restore`).
- Types identiques : `uuid`, `timestamptz`, `boolean`, `text` — aucune réécriture de logique.
- Drizzle a le meilleur support Postgres.

Cible retenue : **PostgreSQL 16** en conteneur Docker. Driver Drizzle `postgres`.

---

## 2. Architecture cible

```
Serveur Eclolink (Docker Compose)
├── service  db        → PostgreSQL 16 (volume persistant + backups)
├── service  app       → Nuxt/Nitro (build production, plus "npm run dev")
└── reverse proxy      → HTTPS (Nginx/Traefik/Caddy) devant l'app
```

Changements transverses :
- **`docker-compose.yml`** : ajout service `db`, suppression des vars `NUXT_SUPABASE_*`,
  ajout `DATABASE_URL` + `SESSION_SECRET` + `NODE_ENV=production`.
- **`Dockerfile`** : passer en build multi-stage `nuxt build` → `node .output/server`
  (aujourd'hui il lance `npm run dev`, inadapté à la prod).
- **`nuxt.config.ts`** : `runtimeConfig` = `{ databaseUrl, sessionSecret }` au lieu de
  `supabaseUrl/supabaseKey`.

---

## 3. Nouveau schéma d'authentification

Aujourd'hui l'identité est éclatée : `auth.users` (Supabase, invisible) + table
`eclolink_user_profiles`. On **fusionne** en une seule table maîtresse.

### 3.1 Table `eclolink_users` (remplace auth.users + eclolink_user_profiles)

| Colonne | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | `gen_random_uuid()` |
| `email` | `text` unique, not null | identifiant de login (lowercase) |
| `password_hash` | `text` not null | scrypt (voir §4.1) |
| `first_name` | `text` | |
| `last_name` | `text` | |
| `role` | `text` not null | `sysadmin \| dev \| pm \| crea \| viewer` (CHECK) |
| `agency` | `text` null | |
| `job_title` | `text` null | |
| `is_active` | `boolean` not null default true | désactivation = ban immédiat |
| `must_change_password` | `boolean` not null default true | force le changement au 1er login |
| `created_at` | `timestamptz` default now() | |
| `last_login_at` | `timestamptz` null | |

> ⚠️ `eclolink_maintenances.developer_id` et `eclolink_clients.project_manager_id`
> pointent déjà vers `user_id`. Après fusion ils référencent `eclolink_users.id`
> (ajouter les FK, absentes aujourd'hui car cross-schema sous Supabase).

### 3.2 Table `eclolink_sessions` (nouvelle)

| Colonne | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `token_hash` | `text` unique not null | SHA-256 du token opaque (jamais le token en clair) |
| `user_id` | `uuid` FK → users, `on delete cascade` | |
| `created_at` | `timestamptz` default now() | |
| `expires_at` | `timestamptz` not null | expiration absolue |
| `last_seen_at` | `timestamptz` | pour le renouvellement glissant |
| `user_agent` | `text` null | traçabilité |
| `ip` | `text` null | traçabilité |

Index sur `token_hash` et `user_id`. Purge des sessions expirées (cron ou lazy).

---

## 4. Reconstruction de l'auth (max sécurité, zéro dépendance ajoutée)

### 4.1 Hash des mots de passe — `node:crypto` scrypt

Choix **scrypt** (intégré à Node, aucune dépendance native à compiler sous Alpine) :

```ts
// server/utils/password.ts
import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto'
// hash: `scrypt$N$salt$key` — vérif via timingSafeEqual (anti timing-attack)
```

- Salt aléatoire 16 octets par mot de passe.
- Comparaison en temps constant (`timingSafeEqual`).
- Alternative gold-standard : argon2id (`@node-rs/argon2`) si on accepte une dépendance
  native — non retenu par défaut pour rester zéro-dép et éviter les soucis de build Docker.

### 4.2 Sessions opaques révocables

- Login OK → `token = randomBytes(32).toString('base64url')`.
- On stocke **uniquement** `sha256(token)` en base (fuite DB = pas de session utilisable).
- Cookie `httpOnly, secure(prod), sameSite=lax, path=/` contenant le token en clair.
- Chaque requête : `sha256(cookie)` → lookup session valide + `is_active` user + non expirée.
- **Révocation instantanée** : delete session (logout), ou `is_active=false` (ban), ou
  invalidation de toutes les sessions au changement de rôle/mot de passe.
- Renouvellement glissant : maj `last_seen_at`, prolongation `expires_at` si proche.

### 4.3 Réécriture des routes `server/api/auth/`

| Route | Avant (Supabase) | Après |
|---|---|---|
| `login.post.ts` | `/auth/v1/token` | vérifie email+scrypt, crée session, pose cookie. **Garde le rate-limit IP existant** (5/15min). |
| `logout.post.ts` | `/auth/v1/logout` | delete session courante + clear cookie |
| `me.get.ts` | `/auth/v1/user` + profil | résout la session → renvoie `{id,email,first_name,last_name,role,agency,job_title,must_change_password}` |
| `password.post.ts` | *(nouveau)* | changement de mot de passe (self), invalide les autres sessions |

### 4.4 Remplacement de `sbFetch` → helper session

`server/utils/supabase.ts` disparaît. Nouveau `server/utils/auth.ts` :
`getSessionUser(event)` (lookup session), `requireUser(event)`, `requireRole(event, roles)`.
`activity-log.ts` n'extrait plus l'user du JWT (`atob`) mais de la session résolue.

---

## 5. Autorisation par rôle (faille actuelle à combler)

Aujourd'hui : **tout utilisateur authentifié peut tout faire**, y compris se promouvoir
sysadmin via `PATCH /api/users/[id]`. À corriger.

### Matrice proposée (à valider)

| Ressource | sysadmin | dev / pm / crea | viewer |
|---|---|---|---|
| Sites, groups, clients, maintenances… (lecture) | ✅ | ✅ | ✅ |
| Sites, groups, clients, maintenances… (écriture) | ✅ | ✅ | ❌ |
| Données de référence (techs, hosters, agencies…) | ✅ | ✅ (à décider) | ❌ |
| **Utilisateurs** (créer/éditer rôle/reset mdp/désactiver) | ✅ | ❌ | ❌ |
| Logs d'activité | ✅ | ✅ (à décider) | ✅/❌ |

Implémentation : `requireRole(event, ['sysadmin'])` en tête des routes users, et
`requireRole(event, ['sysadmin','dev','pm','crea'])` sur toutes les mutations. Le middleware
client `auth.ts` peut en plus masquer les actions selon `user.role` (défense en profondeur).

---

## 6. Couche données Drizzle (remplace le REST PostgREST)

### 6.1 Mise en place
- Deps : `drizzle-orm`, `postgres` (driver), `drizzle-kit` (dev, migrations).
- `server/db/schema.ts` : toutes les tables (le schéma versionné qui **n'existe pas
  aujourd'hui** — bénéfice secondaire de la migration).
- `server/db/index.ts` : client singleton (`drizzle(postgres(DATABASE_URL))`).
- `drizzle-kit generate` → migrations SQL dans `server/db/migrations/`.

### 6.2 Traduction PostgREST → Drizzle
Le code actuel encode les requêtes dans des URLs (`?select=*&order=name.asc&col=eq.val`).
Chaque route est réécrite en requête Drizzle typée. **Les contrats JSON des routes restent
identiques** → le client (pages/composables) n'est quasiment pas touché.

Exemples de correspondance :
- `?order=name.asc` → `.orderBy(asc(t.name))`
- `?role=eq.dev` → `.where(eq(users.role,'dev'))`
- `?created_at=lt.<iso>` (purge logs) → `.where(lt(logs.createdAt, cutoff))`
- `Prefer: return=representation` → `.returning()`
- `Prefer: count=exact` (pagination logs) → `count()` séparé

### 6.3 Périmètre (12 entités + logs, ~44 routes)
users, clients, sites, maintenances, maintenance-types, groups, agencies, hosters,
web-servers, dns-providers, technologies, databases, activity_logs. Chaque dossier
`server/api/<entité>/` : `index.get/post`, `[id].patch/delete` → Drizzle.

---

## 7. Comptes multiples, rôles & sync dev / cheffes de projet

**La synchro est déjà en place** (commit `7a2106d`) : les listes ne viennent plus de tables
séparées mais des rôles. `useReferenceData.ts` calcule `devUsers` (role ∈ dev/sysadmin) et
`pmUsers` (role ∈ pm/sysadmin), consommés par le dropdown développeur (maintenance) et le
dropdown cheffe de projet (formulaire client). **Rien à recréer côté sync** — elle découle
automatiquement de la table `eclolink_users`.

Ce qui **manque** et doit être ajouté (le cœur de « plusieurs comptes ») :

1. **`POST /api/users`** (nouveau, sysadmin) : créer un compte (email + mdp temporaire +
   `must_change_password=true` + rôle + agence + poste).
2. **`POST /api/users/[id]/reset-password`** (nouveau, sysadmin) : redéfinir un mdp.
3. **`PATCH /api/users/[id]`** : ajouter `is_active` (désactiver un compte) — et
   **verrouiller en sysadmin** (aujourd'hui ouvert à tous).
4. **Onglet « Utilisateurs » dans `/admin`** : liste + création + édition rôle/agence/poste
   + reset mdp + activer/désactiver. Groupe les gens par spécialité via le champ `role`.
5. **Page « changer mon mot de passe »** + redirection forcée si `must_change_password`.

Ajouter un rôle = ajouter une valeur au CHECK + au `VALID_ROLES` + aux filtres
`useReferenceData`. Extensible sans refonte.

---

## 8. Migration des données

1. **Export Supabase** : `pg_dump` du schéma `public` (toutes les `eclolink_*`) +
   `auth.users` (pour récupérer emails et éventuellement les hash).
2. **Import** dans le Postgres cible.
3. **Fusion identité** : construire `eclolink_users` depuis `auth.users` (id, email) +
   `eclolink_user_profiles` (first_name, last_name, role, agency, job_title) joints sur
   `user_id`.
4. **Mots de passe — DÉCISION : reset propre.** Les comptes ne sont **pas** importés
   (à la date d'analyse : 0 profil, `auth.users` = 1 compte, aucune FK utilisateur
   utilisée). On repart de zéro : `POST /api/auth/bootstrap` crée le 1er sysadmin,
   puis les comptes sont créés via `/admin` (mdp temporaire + `must_change_password`).
   Les colonnes `developer_id` / `project_manager_id` sont importées à `null`
   (script `db:import`) — à ré-associer après recréation des comptes si besoin.
5. **FK** : recréer les contraintes `developer_id`/`project_manager_id` → `users.id`.
6. **Contrôle** : comptes de lignes par table avant/après, tests de login.

---

## 9. Déploiement & exploitation

- `docker-compose.yml` : service `db` (postgres:16, volume `pgdata`, healthcheck),
  service `app` en build prod, dépendance `app → db`.
- **Backups** : cron `pg_dump` quotidien hors conteneur + rétention.
- **Secrets** : `DATABASE_URL`, `SESSION_SECRET` (long, aléatoire) dans `.env` (déjà
  gitignore), jamais en `runtimeConfig.public`.
- **HTTPS** obligatoire (cookies `secure`) via reverse proxy.
- **Typecheck** : `npm run typecheck` s'exécute depuis `app/` (pas la racine).

---

## 10. Ordre d'exécution proposé (par lots testables)

1. **Confirmer le moteur BDD** + monter Postgres en local/Docker.
2. **Drizzle + schéma** : `schema.ts`, client, 1re migration (toutes tables + `users` +
   `sessions`). ← débloque tout le reste.
3. **Auth maison** : `password.ts`, `auth.ts` (sessions), réécriture routes `auth/`,
   suppression `supabase.ts`. Test login/logout/me.
4. **Autorisation** : `requireRole`, verrouillage routes users + mutations.
5. **Réécriture CRUD** entité par entité vers Drizzle (contrats JSON inchangés),
   `typecheck` après chaque lot.
6. **Gestion comptes** : routes `POST users` / reset / `is_active` + onglet admin
   + changement de mdp self.
7. **Migration des données** réelle (dump → import → fusion → mdp).
8. **Docker prod + backups + HTTPS**, recette complète, bascule.

---

## 11. Checklist sécurité (objectif « maximum »)

- [ ] Mots de passe : scrypt + salt unique + comparaison temps constant.
- [ ] Tokens de session opaques, stockés **hashés**, cookie `httpOnly/secure/sameSite`.
- [ ] Révocation : logout, désactivation compte, invalidation à la rotation mdp/rôle.
- [ ] Rate-limit login conservé (5/15min par IP) + envisager lockout par compte.
- [ ] Autorisation par rôle sur **toutes** les mutations (fin du « tout authentifié = tout »).
- [ ] Routes users réservées `sysadmin`.
- [ ] Aucune requête SQL concaténée à la main (Drizzle paramétré) → anti-injection.
- [ ] Secrets hors dépôt, `SESSION_SECRET` fort, HTTPS forcé.
- [ ] Pas de champ sensible renvoyé au client (`password_hash`, `token_hash` jamais exposés).
- [ ] Logs d'activité conservés (déjà en place) + purge > 2 mois.

---

## 12. Runbook de bascule (production)

Fichiers livrés : `Dockerfile.prod`, `docker-compose.prod.yml`, `.env.example`,
`scripts/backup.sh`, `app/scripts/migrate-from-supabase.mjs`.

1. **Config** : copier `.env.example` → `.env`, remplir `POSTGRES_*`,
   `NUXT_DATABASE_URL`, `NUXT_SESSION_SECRET` (`openssl rand -base64 48`).
2. **Démarrer la base + l'app** : `docker compose -f docker-compose.prod.yml up -d --build`
3. **Créer le schéma** : `docker compose -f docker-compose.prod.yml --profile migrate run --rm migrate`
4. **Importer les données Supabase** (depuis `app/`, ou via un conteneur jetable) :
   ```sh
   SOURCE_DATABASE_URL="postgres://postgres:<pwd>@db.<ref>.supabase.co:5432/postgres" \
   NUXT_DATABASE_URL="postgres://eclolink:<pwd>@localhost:5432/eclolink" \
   npm run db:import
   ```
   (copie référence + métier ; exclut comptes / logs / `eclolink_interventions`).
5. **1er compte admin** :
   ```sh
   curl -X POST http://localhost:3000/api/auth/bootstrap \
     -H 'Content-Type: application/json' \
     -d '{"email":"admin@eclolink.com","password":"<mdp fort>"}'
   ```
6. **Créer les comptes équipe** via `/admin` (onglet Utilisateurs), affecter les rôles.
7. **Recette** : login, lecture annuaire, CRUD, changement de mdp forcé, rôles.
8. **HTTPS** : reverse proxy devant `app:3000` (cookies `secure`).
9. **Backups** : planifier `scripts/backup.sh` (cron quotidien).
10. **Décommissionner Supabase** une fois la recette validée.

> Table legacy `eclolink_interventions` (1 ligne, aucune route) : non migrée. La
> consulter dans Supabase avant décommissionnement si son contenu doit être conservé.
```
