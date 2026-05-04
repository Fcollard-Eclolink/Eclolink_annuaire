# CLAUDE.md — Eclolink Annuaire

Référence complète du projet pour éviter de relire le repo entre les sessions.

---

## Vue d'ensemble

Annuaire interne de serveurs et sites web pour l'agence Eclolink.
- **Hébergement** : GitHub Pages (statique, aucun build)
- **Backend** : Supabase (PostgreSQL + Auth + REST API — pas de SDK, appels fetch directs)
- **Auth** : JWT Supabase avec refresh token, stocké dans `localStorage` (`eclolink_session`)
- **Architecture JS** : fonctions globales ES6+, pas de modules, chargées séquentiellement via `<script src="...">` dans `index.html`
- **CSS** : native CSS nesting (pas de BEM `&__`), variables custom pour le thème clair/sombre

---

## Structure des fichiers

```
index.html              Point d'entrée unique
style.css               @import des 5 fichiers CSS
config.js               SUPABASE_URL + SUPABASE_KEY (non versionné)

css/
  variables.css         Tokens CSS (--bg, --surface, --text, etc.) thème clair + sombre
  base.css              Reset, layout (.wrap max-width:720px), watermark version
  components.css        Boutons, tags, tooltips, filtres, toast
  cards.css             .group-card, .site-row, .group-actions, .row-actions
  modals.css            Overlay, modal, formulaires, login, tech-select, custom-select

js/
  auth.js               Session localStorage, login/logout, tryRefreshToken, initAuth
  api.js                sbGet/sbInsert/sbUpdate/sbDelete + handleResponse (401 → refresh)
  theme.js              initTheme/applyTheme/toggleTheme, SVG_SUN, SVG_MOON
  techs.js              TECHS[], HOSTERS[], DNS_PROVIDERS[], TECH_BY_ID Map, SVG constants
  agencies.js           AGENCIES[] (liste statique des agences)
  state.js              Variables globales, esc(), hl(), uid(), toast(), formatDate()
  render.js             render(), rowHTML(), toggleServerInfo(), toggleSiteInfo(), positionTooltip()
  filters.js            toggleFilter(), renderFilterDropdown(), renderFilterChips(), applyFilterChange()
  modals.js             openServerModal(), openSiteModal(), saveModal(), deleteServer(), deleteSite()
  projectManagers.js    openPmModal(), addNewPm(), onPmBlur(), onPmAgencyChange(), togglePmSite(), deletePm()
  app.js                normalizeGroup(), normalizeSite(), normalizePm(), fetchData(), load(), raccourcis
```

---

## Base de données Supabase

### Table `eclolink_groups` (serveurs)
| Colonne      | Type    | Notes                        |
|-------------|---------|------------------------------|
| id           | TEXT PK | `crypto.randomUUID()`        |
| name         | TEXT    | Requis                       |
| hoster       | TEXT    | OVH / Gandi / Namebay / IONOS|
| ip_public    | TEXT    |                              |
| ip_local     | TEXT    |                              |
| web_server   | TEXT    | apache / nginx               |

### Table `eclolink_sites` (sites)
| Colonne             | Type    | Notes                              |
|--------------------|---------|------------------------------------|
| id                  | TEXT PK | `crypto.randomUUID()`              |
| name                | TEXT    | Requis                             |
| url                 | TEXT    |                                    |
| bo_url              | TEXT    | Lien back-office                   |
| gitlab_url          | TEXT    |                                    |
| php_version         | TEXT    | Ex : "PHP 8.2"                     |
| agency              | TEXT    | Valeur de AGENCIES[]               |
| go_live_date        | TEXT    | Format ISO `YYYY-MM-DD`            |
| dns_zone            | TEXT    | cloudflare / gandi / ovh           |
| group_id            | TEXT FK | → eclolink_groups.id               |
| project_manager_id  | TEXT FK | → eclolink_project_managers.id     |
| technologies        | TEXT    | JSON stringifié `["wordpress",...]`|
| notes               | TEXT    |                                    |

### Table `eclolink_project_managers` (cheffes de projet)
| Colonne     | Type    | Notes                         |
|------------|---------|-------------------------------|
| id          | TEXT PK | `crypto.randomUUID()`         |
| first_name  | TEXT    | Requis (affiché dans tooltip) |
| last_name   | TEXT    |                               |
| agency      | TEXT    | Valeur de AGENCIES[]          |

---

## Référentiels statiques (dans `js/`)

### `js/techs.js`

**TECHS[]** — technologies disponibles (id, label, slug Simple Icons ou svg inline) :
`wordpress, divi, elementor, wpbakery, prestashop, woocommerce, drupal, symfony, laravel, nuxt, vue, directus, next, react, docker`

**HOSTERS[]** — hébergeurs (value, label, slug Simple Icons) :
`gandi, ionos, namebay, ovh`

**DNS_PROVIDERS[]** — fournisseurs DNS :
`cloudflare, gandi, ovh`

**Constantes SVG** (toutes dans ce fichier) :
- `SI` → `https://cdn.simpleicons.org`
- `SVG_EXT` → icône lien externe
- `SVG_GL` → logo GitLab
- `SVG_COPY` → icône copier
- `SVG_SITE` → planète (lien site)
- `SVG_BO` → clé à molette (back-office)
- `TECH_BY_ID` → `Map` pour O(1) lookup par id

### `js/agencies.js`
`AGENCIES[]` : `['Eclolink', 'Mister Harry', 'I-Com', 'Album']`
→ Modifier ici pour ajouter/retirer une agence

---

## Variables globales (js/state.js)

```js
let groups          = [];          // tableaux normalisés depuis Supabase
let sites           = [];
let projectManagers = [];          // [{ id, first_name, last_name }]
let collapsed       = {};          // { groupId: true } persité dans localStorage
let modalMode       = null;        // 'server' | 'site'
let editId          = null;        // id en cours d'édition
let preGroupId      = null;        // groupe pré-sélectionné à l'ouverture modale site
let pendingDelete   = null;        // { type: 'server' | 'site' | 'project_manager', id }
let activeFilters   = { servers: [], techs: [], agencies: [], pms: [] };
```

---

## Flux d'authentification

1. `initAuth()` → lit `localStorage['eclolink_session']`
2. Si token proche d'expiration (< 60s) → `tryRefreshToken()` → si échec → `showLogin()`
3. Sur 401 API → `handleResponse()` tente `tryRefreshToken()` → si échec → `clearSession(); showLogin()`
4. Auto-sync toutes les 5 min via `setInterval(silentRefresh, 300000)` — silencieux, pas de toast

---

## Normalisation des données

```js
normalizeGroup(g) → { ...g, hoster:'', ip_local:'', ip_public:'', web_server:'' }
normalizeSite(s)  → { ...s, groupId: s.group_id, bo_url:'', gitlab_url:'',
                       php_version:'', agency:'', go_live_date:'',
                       dns_zone:'', technologies: tryParseJSON(s.technologies) }
```

---

## Règles de développement importantes

### Ne jamais muter les tableaux source
```js
// ✅ Toujours
[...groups].sort(...)
// ❌ Jamais
groups.sort(...)
```

### Trier à l'affichage, pas à la source
Les TECHS, HOSTERS, DNS_PROVIDERS, AGENCIES sont déclarés dans n'importe quel ordre.
Le tri alphabétique se fait **au moment du rendu** (`.sort((a,b) => a.label.localeCompare(b.label,'fr'))`).

### Échappement HTML
Toujours utiliser `esc(str)` avant d'injecter du texte dans du HTML.
Pour la recherche avec highlight : `hl(text, q)` — fait le split sur le texte original AVANT d'échapper.

### Tooltips / popovers
- Positionnement partagé : `positionTooltip(tt, btn)` dans `render.js`
- Les tooltips sont des `div` fixes dans `index.html` (`#server-tooltip`, `#site-tooltip`)
- Fermeture via `document.addEventListener('click')` dans `app.js`
- **Piège** : un `onclick` dans une zone qui se ferme au clic extérieur doit appeler `event.stopPropagation()`

### Custom select (modals)
`customSelectHTML(inputId, options, selectedValue, placeholder)` — options peuvent avoir une propriété `icon` (HTML string).
Les dropdowns sont `position:fixed`, positionnés via `getBoundingClientRect()` dans `toggleCustomSelect()`.

### Dropdowns filtres
`toggleFilterDropdown(type)` toggle la classe `open` sur le `filter-dd-${type}` ET sur le `filter-btn-${type}` (pour la rotation de la flèche CSS).

---

## CSS — Thème

Variables principales : `--bg`, `--surface`, `--border`, `--text`, `--text-muted`, `--hover`, `--link`, `--btn-primary-bg/color`, `--del-hover-*`
Thème appliqué via `data-theme="dark"` sur `<html>`, persisté dans `localStorage['eclolink_theme']`.

---

## Raccourcis clavier

| Raccourci       | Action                  |
|----------------|-------------------------|
| `Ctrl+K`        | Focus barre de recherche |
| `Ctrl+Shift+G`  | Nouveau serveur          |
| `Ctrl+Shift+S`  | Nouveau site             |
| `Escape`        | Fermer modale            |
| `Enter`         | Valider modale           |

---

## Versioning

Format : `X.Y.Z` affiché dans `.watermark-version` dans `index.html`
- **X** → refonte logicielle majeure
- **Y** → nouvelle fonctionnalité
- **Z** → ajout mineur / correctif / polish UI

Version courante : **v1.7.3**

À chaque `git push`, mettre à jour le numéro dans `index.html`.
