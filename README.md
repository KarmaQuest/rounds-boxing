# 🥊 ROUNDS — Répertoire de la boxe

Un site type *BoxeRec*, mais stylisé : thème dark néon, animations
(Framer Motion), loaders, skeletons et un système de filtres ultra-rapide
et partageable.

## ✨ Fonctionnalités

- **Répertoire de boxeurs** avec filtres instantanés côté client :
  recherche (insensible aux accents), chips de catégories de poids, pays,
  sliders « victoires minimum » et « % KO minimum », tri. **Les filtres
  sont synchronisés dans l'URL** → partageables, back/forward OK.
- **Profil boxeur** : hero, palmarès (V-D-N, % KO), barre de palmarès
  animée, fiche technique (taille, allonge, garde, âge), ceintures, bio,
  et ses combats à venir / récents.
- **Page combats** : affiches à venir avec **cotes** (The Odds API) et
  résultats récents.
- **Animations** : loader d'intro plein écran (une fois par session),
  révélation au scroll, compteurs animés, hover néon, transitions de
  grille avec `AnimatePresence` + `layout`, skeletons shimmer.

## 🧱 Stack

- **Next.js 16** (App Router, route handlers, React Server Components)
- **Tailwind CSS v4** (design system custom dark néon)
- **Framer Motion** (animations)
- **TanStack Query** (data fetching côté client)
- TypeScript strict

## 🗄️ Stratégie multi-API (le cœur du projet)

BoxRec n'a pas d'API officielle. ROUNDS agrège plusieurs sources avec
**bascule automatique** :

| Besoin | Source primaire | Secours | Gratuit |
| --- | --- | --- | --- |
| Profils boxeurs | Big Balls Sports Data | TheSportsDB → mock | 1 000 req/j |
| Combats à venir + cotes | The Odds API | mock | 500 crédits/mois |
| Résultats récents | mock (TheSportsDB quand dispo) | — | — |

Architecture dans `lib/data/` :

```
lib/data/
├── types.ts          # types partagés (Fighter, Fight, …)
├── cache.ts          # cache TTL en mémoire (profils 24h, cotes 10 min)
├── quota.ts          # quota quotidien par provider + circuit breaker
├── index.ts          # API publique (searchBoxeurs, getBoxeur, …)
└── providers/
    ├── provider.ts   # interface DataProvider
    ├── router.ts     # ProviderRouter : fallback + quota + cache
    ├── mock.ts       # jeu de données de démo (24 boxeurs, combats)
    ├── bigballs.ts   # Big Balls Sports Data (BBS_API_KEY)
    ├── thesportsdb.ts# TheSportsDB (THESPORTSDB_API_KEY)
    └── oddsapi.ts    # The Odds API (ODDS_API_KEY)
```

Comment ça marche : le `ProviderRouter` essaie les sources par ordre de
priorité, **saute celles dont le quota quotidien est épuisé** (persisté
dans `.data/quota.json`), **ouvre un circuit** 10 min en cas de 429 ou
d'erreurs répétées, et **met chaque réponse en cache TTL** — ce qui réduit
considérablement le nombre de requêtes réellement envoyées aux APIs.
Les clés restent **côté serveur** (route handlers) ; le client passe par
`/api/boxeurs` et `/api/combats`.

## 🚀 Démarrage

```bash
npm install
npm run dev        # http://localhost:3000
```

Sans clé API, tout fonctionne avec les données de démo. Pour activer les
vraies sources :

```bash
cp .env.example .env.local
# remplis BBS_API_KEY / THESPORTSDB_API_KEY / ODDS_API_KEY
```

## 📜 Scripts

```bash
npm run dev     # dev (Turbopack)
npm run build   # build de production + typecheck
npm run start   # serveur de prod
npm run lint    # ESLint
```

## 🔜 Idées de suite

- Page « tale of the tape » : comparateur côte à côte de deux boxeurs
- Recherche floue (fuzzy) plus poussée
- Pagination / virtualisation pour les 12 000 profils Big Balls
- Historique complet des combats par boxeur (quand les APIs le fournissent)
- Internationalisation, thème clair, PWA

---

*Démo — sans clé API, les palmarès affichés sont approximatifs et datés de
mi-2026. Projet Next.js / React / Tailwind / Framer Motion.*
