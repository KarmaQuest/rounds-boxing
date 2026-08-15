# CONTEXT — ROUNDS 🥊

> **Fichier de contexte du projet.** Tout ce qui a été mis en place jusqu'ici,
> pour reprendre le travail sans rien perdre. Dernière mise à jour : 15/08/2026.

## 1. Vue d'ensemble

**ROUNDS** est un site type *BoxeRec* mais stylisé : thème **dark néon**,
animations (Framer Motion), loader d'intro, skeletons, et un **système de
filtres ultra-rapide** (instantané côté client, synchronisé dans l'URL).

BoxRec n'ayant pas d'API officielle, le site agrège **3 APIs de boxe** avec
une couche de routage intelligente : fusion multi-source, bascule automatique
en cas de limite atteinte, quota quotidien et cache TTL.

Le projet vit dans **`boxing-app/`** (sous-dossier du workspace, car le nom
du dossier racine « Freebuff » contient des majuscules, interdites par npm).

## 2. Stack technique

| Brique | Version | Usage |
| --- | --- | --- |
| Next.js | 16.3.1 (App Router, Turbopack) | Framework, RSC, route handlers |
| React | 19.2.8 | UI |
| TypeScript | 5.x (strict) | Typage |
| Tailwind CSS | 4 (design system via `@theme`) | Style |
| Framer Motion | 13 | Animations |
| TanStack Query | 5 | Data fetching côté client |
| lucide-react | 1.31 | Icônes |
| better-sqlite3 | 13 | Base locale `.data/rounds.db` (comptes, favoris) |
| jose | 6 | JWT HS256 (sessions) |
| fast-xml-parser | 5 | Parsing RSS / Atom / YouTube (actualités) |
| `server-only` | — | Garde-fou : la couche données reste serveur |

⚠️ **Next.js 16 a des changements de conventions** (voir `AGENTS.md` dans le
projet) : `params` est une Promise, on type avec `PageProps<'/route'>` /
`RouteContext<'/api/...'>`, les route handlers GET ne sont pas cachés par
défaut, et `motion.*` ne peut pas être appelé depuis un composant serveur.

## 3. Structure du projet

```
boxing-app/
├── app/
│   ├── layout.tsx            # fonts (Anton+Inter), QueryProviders, Loader, Nav, Footer
│   ├── page.tsx              # accueil : hero, stats animées, top 5 p4p, combats, multi-sources
│   ├── globals.css           # design system dark néon (thème, utilitaires, keyframes)
│   ├── not-found.tsx         # 404 stylisé
│   ├── sitemap.ts            # sitemap.xml (pages + profils)
│   ├── robots.ts             # robots.txt (/api/ disallow + sitemap)
│   ├── opengraph-image.tsx   # carte OG générique (Anton, dark néon)
│   ├── boxeurs/
│   │   ├── page.tsx          # répertoire (header + Directory dans <Suspense>)
│   │   └── [slug]/page.tsx   # profil boxeur (SSR, SEO, JSON-LD Person, lien BoxRec)
│   │   └── [slug]/opengraph-image.tsx # carte OG par boxeur (avatar + palmarès)
│   ├── combats/page.tsx      # combats : onglets À venir / Résultats (+ JSON-LD SportsEvent)
│   ├── comparateur/page.tsx  # tale of the tape (TASKS 1.1)
│   ├── connexion/page.tsx    # connexion (compte JWT)
│   ├── inscription/page.tsx  # inscription
│   ├── dashboard/page.tsx    # profil + favoris (protégé par proxy.ts)
│   ├── debug/page.tsx        # dashboard quotas (TASKS 1.2, noindex)
│   ├── manifest.ts           # manifest PWA
│   ├── icon.svg              # favicon / icône PWA
│   ├── error.tsx             # ErrorBoundary global (retry)
│   └── api/
│       ├── boxeurs/route.ts          # GET /api/boxeurs (filtres serveur)
│       ├── boxeurs/[slug]/route.ts   # GET /api/boxeurs/:slug (404 si inconnu)
│       └── combats/route.ts          # GET /api/combats?scope=upcoming|recent
│       └── health/route.ts           # GET /api/health (quotas par provider)
│       └── news/route.ts             # GET /api/news?type=all|articles|videos
│       └── auth/                     # register, login, logout, me, password
│       └── favorites/                # GET/PUT/DELETE par slug (compte requis)
├── proxy.ts                  # Next 16 : protège /dashboard + /api/favorites/* (JWT cookie)
├── components/
│   ├── loader.tsx            # rideau de bandes verticales style eszterbial.com (1×/session, reduced-motion)
│   ├── navbar.tsx            # menu plein écran style rive.app (burger animé, cascade)
│   ├── auth/                 # account-chip, auth-form, favorite-button, change-password, logout-button
│   ├── home/news.tsx         # section « L’actu boxe » (onglets articles/vidéos)
│   ├── footer.tsx
│   ├── reveal.tsx / counter.tsx      # animations réutilisables
│   ├── avatar.tsx            # avatar dégradé généré (initiales)
│   ├── skeleton.tsx          # skeletons shimmer
│   ├── record-bar.tsx        # barre V/D/N animée + grands chiffres
│   ├── fighter-card.tsx / fight-card.tsx
│   ├── directory/            # filters.tsx (barre + autocomplete flou) + directory.tsx (pagination « Charger plus »)
│   ├── home/hero.tsx         # hero animé
│   ├── combats/tabs.tsx      # + section « Les affiches du moment »
│   ├── comparateur/comparator.tsx # tale of the tape (2 sélecteurs + tableau)
│   ├── json-ld.tsx           # injection JSON-LD
│   └── sw-register.tsx       # enregistre le service worker (prod uniquement)
├── lib/
│   ├── utils.ts              # cn(), formatDate, formatOdds, formatCm
│   ├── site.ts               # SITE_URL (NEXT_PUBLIC_SITE_URL, fallback localhost)
│   ├── auth/                 # db.ts (SQLite), password.ts (scrypt), jwt.ts (jose), session.ts, constants.ts
│   ├── news/                 # sources.ts, parse.ts (RSS/Atom/YT), index.ts (agrégateur + cache 15 min)
│   └── data/                 # ← LA couche données (cœur du projet)
│       ├── types.ts          # Fighter, Fight, WeightClass, FighterFilters…
│       ├── utils.ts          # slugify, flagForCountry, koPct, applyFilters, dedupe
│       ├── cache.ts          # TTL cache en mémoire (profils 24h, cotes 10 min)
│       ├── quota.ts          # quota quotidien par provider + circuit breaker (fichier .data/quota.json)
│       ├── index.ts          # API publique : searchBoxeurs, getBoxeur, getCombatsAvenir/Recents
│       └── providers/
│           ├── provider.ts   # interface DataProvider + Catégories
│           ├── router.ts     # ProviderRouter : fusion multi-source, quota, circuit, cache
│           ├── mock.ts       # 24 boxeurs de démo + combats (filet de sécurité + enrichissement)
│           ├── bigballs.ts   # Big Balls Sports Data (validé live)
│           ├── thesportsdb.ts# TheSportsDB (validé live)
│           └── oddsapi.ts    # The Odds API (validé live)
├── .env.local                # ⚠️ clés API (gitignoré) — NE JAMAIS COMMITER
├── .env.example              # modèle des variables
├── .data/quota.json          # compteurs de quota (gitignoré, créé au runtime)
├── vitest.config.ts          # Vitest (alias server-only → test/stubs/)
├── test/stubs/server-only.ts # stub du package server-only pour les tests
└── public/fonts/Anton-Regular.ttf # police des OG images (self-hosted)

Tests : `lib/data/utils.test.ts`, `lib/data/quota.test.ts`, `lib/data/providers/router.test.ts`, `lib/data/index.test.ts` (intégration), `lib/news/parse.test.ts` (8)
Composant : `components/json-ld.tsx` (injection JSON-LD)
```

## 4. Stratégie multi-API (le cœur du projet)

### 4.1 Les 3 sources réelles + le mock

| Besoin | Source primaire | Secours | Limite gratuite |
| --- | --- | --- | --- |
| Profils boxeurs | **Big Balls Sports Data** | TheSportsDB → mock | 1 000 req/j (2 000 avec GitHub) |
| Combats à venir + cotes | **The Odds API** | mock | 500 crédits/mois (~16 req/j) |
| Résultats récents | mock (TheSportsDB quand il le fournira) | — | — |
| Enrichissement (palmarès, ceintures, bios) | **mock** (jeu de données) | — | — |

### 4.2 Comment fonctionne le `ProviderRouter`

Le routeur **n'interroge pas qu'une seule source** : il collecte les résultats
de **toutes** les sources capables puis les **fusionne** (`lib/data/providers/router.ts`) :

1. **Fusion boxeurs** : dédup par `slug` ; le mock (priorité la plus basse)
   arrive en dernier et **enrichit** les stars : un Usyk venu de Big Balls
   garde sa taille/dob réels mais reçoit son palmarès 23-0, ses ceintures et
   sa bio depuis le mock. `mergeFighter(existing, incoming, "first")` : le
   palmarès réel prime dès qu'il contient des combats (Big Balls renvoie
   `record: null` tant que les résultats ne sont pas publiés → le mock
   enrichit ; `recordPriority` est paramétrable et testé). L'ID **BoxRec**
   (`external_ids.boxrec`) est préservé.
2. **Fusion combats** : dédup par paire de noms (`fightKey`), on garde la
   fiche la plus riche (venue, titre, catégorie du mock) mais **les cotes
   réelles priment** (Odds API).
3. **Quota** : `quota.isAvailable(name, limit)` → un provider au quota épuisé
   est sauté. `dailyLimit = 0` = illimité (mock). Persisté dans `.data/quota.json`.
4. **Circuit breaker** : 429 / 3 échecs consécutifs → circuit ouvert 10 min,
   le provider est ignoré et on bascule au suivant.
5. **Cache TTL** par provider + clé (`cache.ts`) : profils 24 h, recherche 1 h,
   cotes 10 min, résultats 24 h → les limites gratuites suffisent largement.

Les providers sans clé API sont filtrés par `isActive()` — sans `.env.local`
le site tourne 100 % sur le mock.

### 4.3 Schémas API réels (validés en live le 15/08/2026)

**Big Balls** (`bigballs.ts`) — `https://api.bigballsdata.com`
- Enveloppe : `{ data, meta, error }` (à déballer !)
- `GET /v1/athletes?sport=boxing&limit={1..100}` → liste (12 213 profils au total, limit max 100)
- `GET /v1/athletes?sport=boxing&name={nom}` → recherche par **mot contenu** (« usyk » → Oleksandr Usyk)
- Champs : `name` (surnom entre guillemets : `"Irish" Teddy Mann`), `nationality`, `dob`, `height_cm`, `reach_cm`, `stance`, `weight_class`, `current_ranking`, `record` (null), `external_ids.{wikidata,boxrec}`
- Auth : header `Authorization: Bearer <key>`

**TheSportsDB** (`thesportsdb.ts`) — `https://www.thesportsdb.com/api/v1/json/123/...`
- Clé libre `123` (30 req/min)
- `searchplayers.php?p={nom}` → `{ player: [...] }` — champs : `strPlayer`, `strNationality`, **`dateBorn`** (pas `strBirthDate`), `strHeight`, `strWeight`, `strSport` (« Fighting »), `strDescriptionFR/EN`
- Pas de liste fiable ni de records boxe → `listFighters`/`getRecentFights` renvoient `[]`

**The Odds API** (`oddsapi.ts`) — `https://api.the-odds-api.com/v4/sports/boxing_boxing/odds/`
- ⚠️ La clé sport est **`boxing_boxing`**, PAS `boxing`
- Paramètres : `apiKey`, `regions=eu,uk`, `markets=h2h`, `oddsFormat=decimal`
- Réponse : `[{ id, commence_time, home_team, away_team, bookmakers: [{ markets: [{ key: 'h2h', outcomes: [{ name, price }] }] }] }]` — on garde la **meilleure cote** par boxeur (le outcome « Draw » est ignoré)
- 500 crédits/mois gratuits → cache 10 min, ne jamais appeler en boucle

## 5. Modèle de données (extrait `lib/data/types.ts`)

```ts
interface Fighter {
  id, slug, name, nickname?, country, flag, weightClass,
  stance: "Orthodoxe" | "Southpaw" | "Switch",
  heightCm, reachCm, age, debutYear,
  record: { wins, losses, draws, ko },
  titles: string[], rank?, promoter?, bio?, boxrecId?, source?
}
interface Fight {
  id, date (ISO), status: "upcoming" | "finished",
  weightClass?, title?, venue?, location?,
  fighters: [{ fighterId?, name, flag?, record? }, …2],
  outcome?: { winnerIndex?, method, round?, time? },
  odds?: [number, number], source?
}
```

- 16 catégories de poids, de « Poids lourds » à « Poids mi-mouches »
- `applyFilters()` (filtres + tris) vit dans `lib/data/utils.ts` et est partagé serveur/client

## 6. Design system (dark néon)

- Couleurs (Tailwind v4 `@theme`) : `ink` (fond quasi noir #07070c), `panel`/`panel-2`/`panel-3` (cartes), `line` (bordures), **`neon` (#ff2e2e)**, `gold` (#f2b53c), `win`/`loss`/`draw` (V/D/N), `snow`/`mist`/`fog` (textes)
- Typo : **Anton** (display, uppercase) + **Inter** (texte)
- Utilitaires : `text-glow-red`, `text-glow-gold`, `ring-glow`, `panel-glow`, `bg-grid`, `bg-vignette`, `mask-fade-b`, `.shimmer`, `.range-neon` (sliders), `.thin-scroll`
- Keyframes : `shimmer`, `pulse-soft`, `float-slow`

## 7. Fonctionnalités livrées

- **Répertoire filtrable** : recherche (insensible aux accents), chips catégories, pays, sliders « victoires min » / « % KO min », tri — **tout est instantané côté client** (la liste est chargée 1× via React Query) et **synchronisé dans l'URL** (`?q=&cat=&pays=&v=&ko=&tri=`) → partageable
- **Profil boxeur** : hero (avatar, surnom, rang p4p, ceintures), palmarès (V-D-N, % KO, total combats), barre animée, fiche technique (taille, allonge, garde, âge, début pro, nationalité), bio, ses combats à venir/récents, **lien BoxRec** quand l'ID existe
- **Combats** : onglets animés « À venir (avec cotes) » / « Résultats récents », section « Les affiches du moment » (gros combats en tête, `fightImportance`)
- **Animations** : loader d'intro « ROUND 1 » (🥊, 1× par session via sessionStorage, **sauté si `prefers-reduced-motion`**), révélation au scroll (`Reveal`), compteurs (`Counter`), hover néon, `AnimatePresence` + `layout` sur les grilles, skeletons shimmer, 404 stylisé
- **Comparateur tale of the tape** (`/comparateur?boxeurA=&boxeurB=`) : 2 sélecteurs, stats gagnantes en or, partage par URL
- **Recherche floue** : `levenshtein`/`fuzzyMatch`/`fuzzySuggest` — « uzyk » et « canlo » trouvent Usyk / Canelo (client ET API) + autocomplete 5 suggestions
- **Pagination** du répertoire : `useInfiniteQuery` 24/page, « Charger plus », `?page=N`, offset/limit côté API
- **PWA (base)** : manifest, icône SVG, service worker network-first (prod uniquement)
- **Comptes (JWT + SQLite)** : inscription/connexion/déconnexion, cookie httpOnly 7 jours, scrypt+sel, `proxy.ts` protège le dashboard, changement de mot de passe
- **Dashboard + favoris** : profil (email, date), étoile sur les cartes du répertoire, liste sur le dashboard (table `favorites` SQLite)
- **Actualités boxe** : section « L’actu boxe » sur l’accueil — 5 flux RSS/Atom (Bad Left Hook, WBN, Boxing News Online, Boxing Social, Boxing Insider) + 5 chaînes YouTube via `videos.xml` public (DAZN, Top Rank, Matchroom, Sky, iFL TV), triées par date, miniatures, cache 15 min, source en panne = skip sans casser la page
- **Design (session 15/08/2026)** : menu plein écran style rive.app (burger → croix, liens en cascade, scroll lock, Échap), loader style eszterbial.com (rideau de 16 bandes verticales paires ↑ / impaires ↓, coutures `border-white/10`), utilitaires `.sheen` / `.hover-lift` / `.press` / `.link-underline` appliqués aux boutons/liens
- **Transitions de page** : `components/page-transition.tsx` (AnimatePresence keyed par pathname, `mode="wait"`, fondu + léger décalage)
- **Badges « Top x »** : sur toutes les cartes boxeur avec un `rank` (or + couronne pour ≤ 5, neutre au-delà)
- **Loader rendu côté serveur** : rideau dans le HTML SSR (le site n'est jamais visible avant le loader) ; le layout ne le rend que si le cookie `rounds_loader_seen` est absent (posé par le client après la 1re lecture → plus de flash aux retours)
- **Fix menu invisible** : le `backdrop-filter` du header créait un containing block qui effondrait le `fixed` de l'overlay (hauteur 0) → l'overlay est désormais un FRÈRE du header
- **Dashboard quotas** : `/debug` + `/api/health` + alerte console à 80 %
- **ErrorBoundaries** : `error.tsx` global + par boxeur (bouton retry)
- **Multi-sources** : fusion + enrichissement (voir §4), section explicative sur l'accueil
- **Tests (Vitest)** : `npm test` → 80 tests (routeur : fusion, quota, circuit, cache ; `applyFilters` ; persistance disque du quota ; parser news RSS/Atom/YT)
- **SEO** : sitemap.xml (127 URLs), robots.txt, canonical partout, **noindex des URL filtrées** `/boxeurs?…`, OG images (générique + par boxeur, police Anton self-hosted), JSON-LD (Person / SportsEvent / WebSite)

## 8. État de vérification (15/08/2026)

| Vérification | Résultat |
| --- | --- |
| `npm run build` (TypeScript inclus) | ✅ |
| `npm run lint` (ESLint) | ✅ 0 problème |
| `npm test` (Vitest) | ✅ 80 tests |
| Pages : `/`, `/boxeurs`, `/combats`, `/boxeurs/[slug]`, `/comparateur`, `/debug` | ✅ 200 |
| Pagination API (`limit=24&offset=0/24/48`) | ✅ 24/page cohérentes |
| Recherche floue API (`q=uzyk`, `q=canlo`) | ✅ Usyk / Canelo trouvés |
| `/sitemap.xml` · `/robots.txt` · `/manifest.webmanifest` · `/icon.svg` · `/sw.js` | ✅ 200 |
| OG images (`/opengraph-image`, `/boxeurs/[slug]/opengraph-image`) | ✅ PNG 1200×630 |
| JSON-LD (Person/SportsEvent/WebSite) + noindex filtres + noindex `/debug` | ✅ vérifié en prod |
| `/api/health` | ✅ quotas en direct (bigballs/oddsapi/thesportsdb/mock) |
| `/api/news?type=articles|videos` | ✅ articles RSS réels + vidéos YT avec miniatures |
| Auth (register/login/logout/me) + favoris PUT/DELETE | ✅ vérifié en prod (cookie httpOnly, 401 sans session) |
| `/dashboard` sans session | ✅ 307 → `/connexion?next=/dashboard` (proxy) |
| `/connexion` `/inscription` `/comparateur` `/debug` | ✅ 200 |
| 404 profil inconnu (prod) | ✅ 404 (⚠️ avec `loading.tsx` le streaming renvoyait 200 → supprimé volontairement) |
| `/api/boxeurs` | ✅ source `bigballs + mock`, 124 boxeurs |
| `/api/boxeurs?q=canelo` | ✅ source `bigballs + thesportsdb + mock` |
| `/api/combats?scope=upcoming` | ✅ source `oddsapi + mock`, cotes réelles |
| Rendu navigateur (Chrome headless) | ✅ hydratation OK, compteurs/chips/cartes présents |

## 9. Lancement & configuration

```bash
cd boxing-app
npm install
npm run dev        # http://localhost:3000 (Turbopack)
```

- **Sans clés** : tout fonctionne sur le mock (24 boxeurs, combats, cotes).
- **Avec clés** : copier `.env.example` → `.env.local`, remplir `BBS_API_KEY`,
  `THESPORTSDB_API_KEY`, `ODDS_API_KEY` (+ limites optionnelles
  `BBS_DAILY_LIMIT`, `THESPORTSDB_DAILY_LIMIT`, `ODDS_DAILY_LIMIT`).
- Les clés ne vivent **que côté serveur** (route handlers) ; le client passe
  par `/api/*`.

## 10. Décisions & pièges rencontrés

1. **Nom du dossier** : le workspace s'appelle « Freebuff » (majuscules) → npm refuse, le projet est dans `boxing-app/`.
2. **`server-only`** : la couche données est marquée `import "server-only"` pour ne jamais fuir côté client.
3. **Lint `react-hooks/set-state-in-effect`** : les setState doivent être dans des callbacks (timers/animate), jamais synchrones dans l'effet.
4. **`react-hooks/static-components`** : ne jamais définir un composant dans le render (cf. `FighterSide` sorti de `FightCard`).
5. **Apostrophes françaises** : la règle `react/no-unescaped-entities` interdit `'` dans le JSX → utiliser `'` (U+2019).
6. **`motion.*` dans un RSC** plante le prerender (`createMotionComponent`) → les composants animés sont en `"use client"`.
7. **`useSearchParams`** doit être sous `<Suspense>` (page `/boxeurs`).
8. **Big Balls** : toujours déballer `{ data, … }`, `limit` ≤ 100, recherche par mot, `record` null.
9. **Odds API** : clé sport `boxing_boxing`.
10. **404 + `loading.tsx`** : streaming → statut 200 ; pour de vrais 404 SEO, pas de `loading.tsx` sur les routes dynamiques.
11. **Quota 0 = illimité** : le mock a `dailyLimit: 0`, le routeur ne passe pas par le quota dans ce cas.
12. **API keys dans le chat** : l'utilisateur a collé ses clés (chat privé, jamais partagé) — elles sont dans `.env.local` (gitignoré), pas dans le code.
13. **Actualités** : BoxingScene / BoxingNews24 / The Ring répondent 403 (Cloudflare) aux bots → sources de repli (Bad Left Hook, WBN, Boxing News Online, Boxing Social, Boxing Insider). Chaînes YT via le flux public `videos.xml?channel_id=` (aucune clé API), IDs résolus depuis les pages chaînes.
14. **SQLite + serverless** : `better-sqlite3` (native) convient à la VM/container ; sur Vercel il faudra basculer les comptes vers un store distant (Turso/PlanetScale/Postgres).
15. **`proxy.ts`** (Next 16) ne peut pas importer la base SQLite (environnement séparé) → les constantes de session vivent dans `lib/auth/constants.ts` sans dépendances.
16. **Transitions globales `a`/`button`** : volontairement SANS `transform` (framer-motion pilote `transform` en JS ; une transition CSS dessus créerait des conflits) — les effets d'enfoncement passent par `.press` (:active) et `.sheen`/`.hover-lift` en hover.
17. **`JWT_SECRET`** : requis en production (fallback dev seulement). `NEXT_PUBLIC_SITE_URL` à ajouter à `.env.example` (fichier bloqué en lecture ici).

## 11. Notes de sécurité

- `.env.local` et `.data/` sont dans `.gitignore` ✅
- Jamais de clé en dur dans le code, jamais de fetch client direct vers les APIs (toujours via `/api/*`)
- Si un jour le chat ou le repo est partagé : **régénérer les clés** (Big Balls recommande de tourner une clé partagée publiquement)

## 12. Workflow git (agence) — depuis le 15/08/2026

Dépôt : **`github.com/KarmaQuest/rounds-boxing`** (privé). Branche par
défaut : `main`.

- **`main`** : stable, version déployable. On n'y pousse que des fusions
  validées (release), jamais de travail en cours.
- **`develop`** : intégration. Toute feature y fusionne une fois terminée.
  C'est LA branche de travail courante.
- **`feature/*`** : une branche par tâche (ex. `feature/comparateur`),
  créée depuis `develop`, fusionnée dans `develop` quand finie. Nommer en
  anglais court.
- Règles : chaque tâche = `feature/*` → `develop` (jamais direct sur
  `main`) ; typecheck + lint + tests verts avant fusion (`npm run build`,
  `npm run lint`, `npm test`) ; messages de commit conventionnels
  (`feat:` / `fix:` / `docs:` / `refactor:` / `chore:`).

Démarrage d'une tâche :
```bash
git checkout develop && git pull
# branche de travail…
```

## 13. Docs & Skills (15/08/2026)

- **`docs/CONTEXT.md`** (ce fichier) : tout le contexte du projet.
- **`docs/TASKS.md`** : la feuille de route priorisée (court/moyen/long terme).
- **`.agents/skills/`** — 7 skills communautaires installés via `npx skills` (écosystème Agent Skills, compatible Freebuff) :

  | Skill | Couvre | Source |
  | --- | --- | --- |
  | `nextjs-app-router-patterns` | App Router, RSC, streaming, data fetching | wshobson/agents (27K) |
  | `nextjs-turbopack` | Next 16 + Turbopack | affaan-m/ecc (7.5K) |
  | `nextjs-react-typescript` | React 19 + TS strict | mindrally/skills (4.6K) |
  | `tailwind-css-patterns` | Tailwind v4, design system | giuseppe-trisciuoglio (15K) |
  | `framer-motion` | Animations, layouts, reduced-motion | mindrally/skills |
  | `vitest-testing` | Tests unitaires (tâche 1.5) | secondsky/claude-skills |
  | `openapi-spec-generation` | Génération de specs OpenAPI (routes /api/* et APIs externes) | wshobson/agents (14K) |

  ⚠️ Skills non vérifiés par défaut : toujours jeter un œil au `SKILL.md` avant de les laisser exécuter du code. Le skill `ziniao-openapi-explorer` a été installé puis **retiré** : il était spécifique à la plateforme Ziniao (pas un skill OpenAPI général).
  
  💡 GSAP : il existe un skill **officiel** `greensock/gsap-skills@gsap-core` (core + ScrollTrigger gratuits) — non installé car GSAP n'est pas encore une stack du projet.
