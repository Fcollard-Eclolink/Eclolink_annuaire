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
CSS vanilla avec variables CSS (`assets/css/`).

---

## Architecture des fichiers

```
app/
  server/
    utils/
      supabase.ts     ← helpers auth + sbFetch() + interfaces Supabase
      types.ts        ← interfaces métier partagées (Site, Group, Technology, Agency…)
    api/
      auth/           ← login, logout, me
      sites/          ← GET, POST, PATCH, DELETE
      groups/         ← GET, POST, PATCH, DELETE
      project-managers/ ← GET, POST, PATCH, DELETE
      clients/        ← GET, POST, PATCH, DELETE
      technologies/   ← GET, POST, PATCH, DELETE
      agencies/       ← GET, POST, PATCH, DELETE
      hosters/        ← GET, POST, PATCH, DELETE
      web-servers/    ← GET, POST, PATCH, DELETE
      dns-providers/  ← GET, POST, PATCH, DELETE
  composables/
    useAuth.ts        ← useState('auth:user') + logout()
    useTechBadge.ts   ← techTags(), techIconUrl(), techIconSvg() — lit useState('ref:techs')
    useSearch.ts
    useSiteCrud.ts
    useGroupCrud.ts
    useServerExpand.ts
  plugins/
    auth.ts           ← initialise user au démarrage (useRequestFetch)
  middleware/
    auth.ts           ← redirige /login si user null
  components/
    AppServerBlock.vue
    AppSiteRow.vue
    AppFilterSelect.vue  ← dropdown multi-select avec checkboxes (filtres)
    AppSelect.vue        ← dropdown custom simple (sans icônes)
    AppIconSelect.vue    ← dropdown custom avec icônes simpleicons
    AppTechSelect.vue    ← multi-select technologies (pills)
    AppDateInput.vue     ← saisie date masquée JJ/MM/AAAA
    AppConfirmModal.vue
  pages/
    login.vue         ← page publique
    index.vue         ← page protégée (middleware: 'auth')
    admin.vue         ← page protégée, CRUD données de référence
  assets/css/
    main.css          ← importe tous les fichiers CSS
    variables.css
    base.css
    layout.css        ← toolbar, filtres, filter-drop-*
    modals.css        ← modales, icon-select, tech-select
    servers.css       ← server-block, site-row
    sites.css
    admin.css         ← styles page /admin
  app.vue
  nuxt.config.ts
```

---

## Base de données Supabase

### Tables

| Table | Colonnes principales |
|---|---|
| `eclolink_groups` | `id`, `name`, `hoster`, `ip_local`, `ip_public`, `web_server` |
| `eclolink_sites` | `id`, `name`, `url`, `bo_url`, `gitlab_url`, `agency`, `group_id`, `php_version`, `dns_zone`, `go_live_date`, `technologies`, `project_manager_id`, `client_id`, `registrar`, `notes` |
| `eclolink_project_managers` | `id`, `first_name`, `last_name`, `agency` |
| `eclolink_clients` | `id`, `name`, `agency`, `contact_name`, `contact_email`, `notes` |
| `eclolink_technologies` | `id`, `label`, `simpleicons_slug`, `svg`, `sort_order` |
| `eclolink_agencies` | `id`, `name` |
| `eclolink_hosters` | `id`, `name`, `simpleicons_slug` |
| `eclolink_web_servers` | `id`, `name`, `simpleicons_slug` |
| `eclolink_dns_providers` | `id`, `name`, `simpleicons_slug` |

Toutes les tables ont RLS activé avec une policy `allow_all_authenticated` (accès complet aux utilisateurs authentifiés).

### Accès

Toutes les requêtes Supabase passent **exclusivement** par les server routes Nuxt (`server/api/`).
Le client ne contacte jamais Supabase directement.
L'utilitaire `sbFetch()` dans `server/utils/supabase.ts` gère l'auth + le refresh automatique.

---

## Données de référence dynamiques

Les listes technologies, hébergeurs, serveurs web, DNS providers et agences sont stockées en base et **ne sont plus des constantes statiques**. `selectOptions.ts` ne contient plus que les interfaces `SelectOption` et `TechOption`.

### Pattern de chargement dans `index.vue`

```ts
// Chargé dans le Promise.all initial
const { data: fetchedTechs }        = await useFetch<Technology[]>('/api/technologies')
const { data: fetchedHosters }      = await useFetch<Hoster[]>('/api/hosters')
const { data: fetchedWebServers }   = await useFetch<WebServer[]>('/api/web-servers')
const { data: fetchedDnsProviders } = await useFetch<DnsProvider[]>('/api/dns-providers')

// State partagé pour useTechBadge
const refTechs = useState<Technology[]>('ref:techs', () => [])
watchEffect(() => { if (fetchedTechs.value) refTechs.value = fetchedTechs.value })
```

### `useTechBadge`

- Lit `useState('ref:techs')` — peuplé par `index.vue` et `admin.vue` au chargement.
- `techTags(site)` : parse le champ `technologies` (CSV ou JSON), normalise les anciens IDs legacy (`wpbakery` → "WP Bakery", `next` → "Next.js"), déduplique.
- Table de correspondance `LEGACY_IDS` pour les anciens IDs qui ne matchent pas par normalisation seule.

### `AppServerBlock`

Reçoit `hosters?: Hoster[]` et `webServers?: WebServer[]` en props (passées depuis `index.vue`).

### `AppTechSelect`

Reçoit `techs?: Technology[]` en prop (passée depuis `index.vue`).

---

## Page Admin (`/admin`)

Page protégée avec 7 onglets : Technologies · Agences · Hébergeurs · Serveurs web · DNS · Cheffes de projet · Clients.

Chaque onglet : tableau + bouton Ajouter + Edit/Supprimer par ligne + modales add/edit/delete.

L'onglet Technologies affiche le nombre de sites utilisant chaque technologie (calculé client-side via `techTags`).

---

## Composants UI

### `AppSelect`
Dropdown custom simple (sans icônes). Utilisé pour Serveur, Cheffe de projet, Client, Agence.
```vue
<AppSelect v-model="form.group_id" :options="groups.map(g => ({ value: g.id, label: g.name }))" placeholder="— Aucun —" />
```

### `AppIconSelect`
Dropdown custom avec logo simpleicons. Utilisé pour Hébergeur, Serveur web, Zone DNS, Registrar.
```vue
<AppIconSelect v-model="form.hoster" :options="hosters.map(h => ({ value: h.name, label: h.name, slug: h.simpleicons_slug }))" />
```

### `AppTechSelect`
Multi-select technologies avec pills. Reçoit `:techs` depuis les données dynamiques.

### `AppFilterSelect`
Dropdown multi-select avec checkboxes pour les filtres. Interface `FilterOption` exportée depuis le composant.

### `AppDateInput`
Saisie masquée JJ/MM/AAAA. Stocke en ISO (`YYYY-MM-DD`) dans le modèle. Le bouton calendrier utilise un `<input type="date">` caché.

### Style des dropdowns
Tous les dropdowns (`icon-select`, `tech-select`, `filter-drop`) partagent le même style visuel : `font-size: 13px`, `height: 34px`, `padding: 0 12px`, options `7px 12px`.

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
- Les interfaces métier sont dans `server/utils/types.ts` (`Site`, `Group`, `Technology`, `Agency`, `Hoster`, `WebServer`, `DnsProvider`, `ProjectManager`, `Client`).

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
- `definePageMeta({ middleware: 'auth' })` est déclaré explicitement sur chaque page protégée (`index.vue`, `admin.vue`).

---

## Règles de scalabilité

### Server routes
- Chaque ressource a sa propre route dans `server/api/<ressource>/`.
- Pattern complet : `index.get.ts`, `index.post.ts`, `[id].patch.ts`, `[id].delete.ts`.
- Les utilitaires partagés (auth, types) sont dans `server/utils/`.
- `sbFetch()` est le seul point d'entrée vers Supabase — toute nouvelle route l'utilise.
- Toutes les routes GET trient par `name.asc` (ou `label.asc` pour technologies, `first_name.asc` pour project-managers).

### Nouvelles entités de référence
Pour ajouter une nouvelle table de référence (ex: `eclolink_X`) :
1. Créer la table Supabase avec RLS + policy `allow_all_authenticated`
2. Ajouter l'interface dans `server/utils/types.ts`
3. Créer les 4 routes dans `server/api/X/` (GET trié, POST, PATCH, DELETE)
4. Ajouter l'onglet dans `admin.vue`
5. Charger via `useFetch` dans les pages qui en ont besoin

### Composables
- `useAuth()` est le seul composable d'authentification.
- `useTechBadge` lit `useState('ref:techs')` — ne pas importer TECHS statiques.
- Les nouveaux composables suivent le pattern `useState` + actions async.

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

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
Types : `feat`, `fix`, `chore`, `refactor`, `docs`

---

## Docker

```yaml
# docker-compose.yml
# ./app monté en volume pour hot-reload
# node_modules isolé via volume anonyme
# Variables d'env injectées depuis .env racine via ${SUPABASE_URL}
# Port 24678 exposé pour Vite HMR (hot-reload navigateur)
```

**Commandes** :
- Démarrer : `docker-compose up --build`
- Hot-reload : automatique (volume mount `./app:/app`, HMR port 24678)
- Accès : `http://localhost:3000`
