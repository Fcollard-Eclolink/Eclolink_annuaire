# Eclolink Annuaire — CLAUDE.md

Contexte permanent pour toutes les sessions Claude sur ce projet.

---

## Projet

Annuaire interne Eclolink des serveurs et sites web.

- **v1** (branche `main`) — application statique HTML/JS/CSS, Supabase REST direct
- **v2** (branche `v2-dev`) — Nuxt 3 + Vue 3 + Docker, Supabase via server routes sécurisées

---

## Stack technique v2

| Couche | Technologie | Version |
|---|---|---|
| Framework | Nuxt | `^3.21.0` (LTS jusqu'au 31/07/2026) |
| UI | Vue | `^3.5.33` |
| Routeur | Vue Router | `^4.5.0` |
| Backend | Nitro (intégré Nuxt) | auto |
| HTTP serveur | H3 (intégré Nitro) | auto |
| Base de données | Supabase (REST + Auth) | — |
| Conteneur | Docker + Docker Compose | — |

**Aucune dépendance UI externe** (pas de Nuxt UI, pas de Tailwind, pas de Pinia).
CSS vanilla avec variables CSS (`assets/css/main.css`).

---

## Architecture des fichiers

```
app/
  server/
    utils/
      supabase.ts     ← helpers auth + sbFetch() + interfaces Supabase
      types.ts        ← interfaces métier partagées (Site, Group)
    api/
      auth/
        login.post.ts   ← POST email+password → cookies httpOnly
        logout.post.ts  ← révocation Supabase + effacement cookies
        me.get.ts       ← validation session → retourne { id, email }
      sites/
        index.get.ts    ← GET eclolink_sites (authentifié)
      groups/
        index.get.ts    ← GET eclolink_groups (authentifié)
  composables/
    useAuth.ts          ← useState('auth:user') + logout()
  plugins/
    auth.ts             ← initialise user au démarrage (useRequestFetch)
  middleware/
    auth.ts             ← redirige /login si user null
  pages/
    login.vue           ← page publique
    index.vue           ← page protégée (middleware: 'auth')
  assets/css/main.css
  app.vue
  nuxt.config.ts
```

---

## Base de données Supabase

### Tables

| Table | Colonnes principales |
|---|---|
| `eclolink_groups` | `id`, `name`, `hoster`, `ip_local`, `ip_public`, `web_server` |
| `eclolink_sites` | `id`, `name`, `url`, `bo_url`, `gitlab_url`, `agency`, `group_id`, `php_version`, `dns_zone`, `go_live_date`, `technologies`, `project_manager_id`, `notes` |
| `eclolink_project_managers` | `id`, `first_name`, `last_name`, `agency` |

### Accès

Toutes les requêtes Supabase passent **exclusivement** par les server routes Nuxt (`server/api/`).
Le client ne contacte jamais Supabase directement.
L'utilitaire `sbFetch()` dans `server/utils/supabase.ts` gère l'auth + le refresh automatique.

---

## Règles de sécurité — NON NÉGOCIABLES

### Authentification
- Les tokens Supabase (`access_token`, `refresh_token`) sont stockés **uniquement** dans des cookies `httpOnly`.
- Un cookie `httpOnly` est **invisible au JavaScript côté client** — protection XSS.
- `secure: true` en production, `sameSite: 'lax'` toujours.
- Le refresh du token est géré **côté serveur** dans `sbFetch()` de façon transparente.
- Le logout révoque le token côté Supabase **avant** d'effacer les cookies.

### Données exposées au client
- `/api/auth/me` ne retourne que `{ id, email }` — jamais les tokens.
- Les server routes ne retournent jamais de champs sensibles (tokens, clés, mots de passe).

### Variables d'environnement
- `SUPABASE_URL` et `SUPABASE_KEY` sont des variables **serveur uniquement** (dans `runtimeConfig`, pas `runtimeConfig.public`).
- Le client ne connaît jamais l'URL ni la clé Supabase.
- `.env` est dans `.gitignore` — ne jamais commiter de secrets.

### Validation des entrées
- Toute entrée utilisateur dans les server routes est validée avant utilisation (`readBody` avec type générique).
- Les champs requis sont vérifiés explicitement (pas de confiance aveugle).

### Review automatique
- Un hook agent Claude (`PreToolUse` sur `git push`) analyse chaque push pour détecter des failles de sécurité.
- Secrets exposés, injections, auth non sécurisée → push bloqué automatiquement.

---

## Règles TypeScript — STRICTES

### Zéro `any`
- **Interdit** : `: any`, `as any`, `<any>`, paramètres sans type, `any` implicite.
- Chaque `res.json()` est casté explicitement : `(await res.json()) as MonType`.
- Les interfaces Supabase sont dans `server/utils/supabase.ts` (`SupabaseTokenData`, `SupabaseUser`).
- Les interfaces métier sont dans `server/utils/types.ts` (`Site`, `Group`).

### Typage complet
- Toutes les fonctions ont leurs paramètres et retours typés.
- `defineEventHandler` indique son type de retour : `Promise<Site[]>`, `Promise<SupabaseUser>`, etc.
- `useState` est toujours générique : `useState<SupabaseUser | null>(...)`.

### Patterns à suivre
```ts
// ✅ Correct — cast explicite depuis json()
const data = (await res.json()) as SupabaseTokenData

// ✅ Correct — type de retour déclaré
export default defineEventHandler(async (event): Promise<Site[]> => { ... })

// ✅ Correct — destructuration de runtimeConfig
const { supabaseUrl, supabaseKey } = useRuntimeConfig()

// ❌ Interdit
const data = await res.json()          // any implicite
const x: any = something               // any explicite
function foo(x) { ... }                // paramètre non typé
```

### Vérification
Avant chaque push : `npm run typecheck` (alias `nuxt typecheck`).

---

## Règles de stabilité

### Gestion des erreurs
- Toutes les erreurs serveur passent par `createError({ statusCode, message })` — jamais de throw raw.
- Les opérations non critiques (ex: révocation token au logout) utilisent `.catch(() => undefined)`.
- Les erreurs de fetch réseau sont toujours catchées et transformées en réponse structurée.

### Cookies et session
- L'accès token expire en `expires_in` secondes (1h par défaut Supabase).
- Le refresh token est valide 30 jours (`maxAge: 60 * 60 * 24 * 30`).
- `sbFetch()` retry automatiquement avec un nouveau token si le serveur répond 401.

### SSR / Hydratation
- `useRequestFetch()` est utilisé dans le plugin auth pour forwarder les cookies httpOnly lors du rendu SSR.
- `$fetch` nu ne forward pas les cookies en SSR — toujours utiliser `useRequestFetch()` dans les plugins/server-side composables.
- `useState` persiste l'état entre SSR et client via le payload Nuxt (pas de double fetch).

### Middleware
- Le middleware `auth` ne bloque jamais `/login` (guard explicite `if (to.path === '/login') return`).
- `definePageMeta({ middleware: 'auth' })` est déclaré explicitement sur chaque page protégée.

---

## Règles de scalabilité

### Server routes
- Chaque ressource a sa propre route dans `server/api/<ressource>/index.get.ts`.
- Les utilitaires partagés (auth, types) sont dans `server/utils/`.
- `sbFetch()` est le seul point d'entrée vers Supabase — toute nouvelle route l'utilise.

### Composables
- `useAuth()` est le seul composable d'authentification — pas de duplication de logique auth.
- Les nouveaux composables suivent le pattern `useState` + actions async.

### Nouvelles entités
Pour ajouter une nouvelle entité (ex: `eclolink_X`) :
1. Ajouter l'interface dans `server/utils/types.ts`
2. Créer `server/api/X/index.get.ts` qui utilise `sbFetch()`
3. Utiliser `useFetch<X[]>('/api/X')` dans la page correspondante

### Ajout de pages
- Toute nouvelle page protégée déclare `definePageMeta({ middleware: 'auth' })`.
- Les types de données utilisés dans `useFetch<T>` viennent de `server/utils/types.ts`.

---

## Workflow git

### Branches
- `main` — v1 statique (production)
- `v2-dev` — v2 Nuxt (développement actif)

### Avant chaque commit
- Vérifier l'absence de `any` dans les fichiers modifiés.
- Vérifier que les variables d'environnement ne sont pas hardcodées.

### Avant chaque push
- Le hook agent Claude vérifie automatiquement sécurité + qualité.
- Push bloqué si : secrets exposés, injections, tokens côté client, auth non sécurisée.

### Convention de commit
```
type(scope): description courte

Corps optionnel détaillant le pourquoi.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```
Types : `feat`, `fix`, `chore`, `refactor`, `docs`

---

## Docker

```yaml
# docker-compose.yml
# ./app monté en volume pour hot-reload
# node_modules isolé via volume anonyme
# Variables d'env injectées depuis .env racine via ${SUPABASE_URL}
```

**Commandes** :
- Démarrer : `docker-compose up --build`
- Hot-reload : automatique (volume mount `./app:/app`)
- Accès : `http://localhost:3000`
