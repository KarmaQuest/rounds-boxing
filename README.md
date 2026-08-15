# 🥊 ROUNDS — Les records de la boxe

Un site type *BoxeRec*, stylisé : thème **dark néon**, animations
(Framer Motion), loader d'intro, menu plein écran, filtres ultra-rapides
et partageables. En **test** — rien n'est déployé.

## ✨ Fonctionnalités

- **Répertoire de boxeurs** : filtres instantanés côté client (recherche
  insensible aux accents, **typos tolérées** via Levenshtein + autocomplete,
  catégories de poids, pays, sliders victoires/% KO, 6 tris), synchronisés
  dans l'URL (`?q=&cat=&pays=&v=&ko=&tri=`) et **pagines** (24/page,
  « Charger plus »).
- **Profils boxeurs** : hero (avatar, surnom, rang), palmarès V-D-N + % KO,
  fiche technique, ceintures, bio, combats à venir/récents, lien BoxRec,
  **carte OG de partage générée** (avatar + palmarès).
- **Combats** : affiches à venir avec **cotes réelles** (The Odds API),
  résultats récents, section « Les affiches du moment » (gros combats
  classés par enjeu).
- **Comparateur « Tale of the Tape »** : deux boxeurs côte à côte, stats
  gagnantes en or, partage par URL.
- **Comptes utilisateurs** : inscription / connexion JWT (cookie httpOnly),
  dashboard (profil, mot de passe), **favoris boxeurs** (étoile sur les
  cartes).
- **Actualités boxe** : section « L'actu boxe » sur l'accueil — 5 flux
  RSS/Atom + 5 chaînes YouTube (via le flux public `videos.xml`, sans clé
  API), triées par date, miniatures, cache 15 min.
- **SEO** : sitemap.xml (127 URLs), robots.txt, canonical, noindex des
  pages filtres, JSON-LD (Person / SportsEvent / WebSite).
- **PWA (base)** : manifest, icône SVG, service worker network-first.
- **Design** : loader rideau style eszterbial.com, menu plein écran style
  rive.app, transitions de page, badges « Top x », utilitaires
  `.sheen` / `.press` / `.hover-lift` / `.link-underline`.
- **A11y** : contrastes AA, `:focus-visible`, skip-link, `aria-hidden` sur
  les icônes, `prefers-reduced-motion` respecté.

## 🧱 Stack

| Brique | Version | Usage |
| --- | --- | --- |
| Next.js | 16 (App Router, Turbopack) | Framework, RSC, route handlers |
| React | 19 | UI |
| TypeScript | 5 (strict) | Typage |
| Tailwind CSS | 4 (`@theme`) | Style |
| Framer Motion | 13 | Animations |
| TanStack Query | 5 | Data fetching client |
| better-sqlite3 | 13 | Base locale (comptes, favoris) |
| jose | 6 | JWT HS256 |
| fast-xml-parser | 5 | RSS / Atom / YouTube |
| Vitest | 4 | Tests (80) |

## 🗄️ Stratégie multi-API

BoxRec n'a pas d'API officielle. ROUNDS agrège plusieurs sources avec
**fusion + bascule automatique** :

| Besoin | Source primaire | Secours | Gratuit |
| --- | --- | --- | --- |
| Profils boxeurs | Big Balls Sports Data | TheSportsDB → mock | 1 000 req/j |
| Combats à venir + cotes | The Odds API | mock | 500 crédits/mois |
| Résultats récents | mock (TheSportsDB quand dispo) | — | — |

Architecture (`lib/data/`) : `ProviderRouter` qui interroge toutes les
sources capables puis **fusionne** (dédup par slug, le mock enrichit les
stars, les cotes réelles priment), **saute les providers au quota épuisé**
(persisté dans `.data/quota.json`), **ouvre un circuit** 10 min en cas de
429/erreurs, et **cache chaque réponse TTL** (profils 24 h, cotes 10 min,
news 15 min). Le cache et les quotas ont des drivers mémoire (dev/VM) et
Redis Upstash (serverless), activé par les variables `UPSTASH_*`.

Les clés API vivent **uniquement côté serveur** (`.env.local`, gitignoré) ;
le client passe par `/api/*` (rate-limited par IP).

## 🚀 Démarrage

```bash
npm install
npm run dev        # http://localhost:3000
```

Sans clé API, tout fonctionne avec les données de démo. Pour activer les
vraies sources : copier `.env.example` → `.env.local` et remplir
`BBS_API_KEY`, `THESPORTSDB_API_KEY`, `ODDS_API_KEY` (limites optionnelles
`*_DAILY_LIMIT`). Auth : `JWT_SECRET` (obligatoire en prod).

## 📜 Scripts

```bash
npm run dev     # dev (Turbopack, hot reload)
npm run build   # build + typecheck
npm start       # serveur de prod
npm run lint    # ESLint (0 erreur)
npm test        # Vitest (80 tests)
```

## 🔀 Workflow git (agence)

- **`main`** : stable / déployable (protégée — pas de push direct).
- **`develop`** : intégration, branche de travail courante.
- **`feature/*`** : une branche par tâche, fusionnée dans `develop`.
- Règles : build + lint + tests verts avant fusion, commits conventionnels
  (`feat:` / `fix:` / `docs:` / `refactor:` / `chore:`).

## 📚 Docs

- `docs/CONTEXT.md` — contexte complet du projet (stack, architecture,
  décisions, pièges)
- `docs/TASKS.md` — feuille de route priorisée
- `docs/AUDIT.md` — audit « niveau agence » (sécurité, perf, SEO, a11y…)

---

*Démo — sans clé API, les palmarès affichés sont approximatifs (données de
mi-2026). Projet Next.js / React / Tailwind / Framer Motion.*
