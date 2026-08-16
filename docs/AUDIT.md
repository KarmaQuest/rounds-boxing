# AUDIT — ROUNDS 🥊

> **Audit complet « niveau agence »** — état des lieux honnête du projet au
> 15/08/2026, avant mise en production. Chaque point a une sévérité
> (P0 = bloque la prod, P1 = à faire avant lancement, P2 = à planifier).

---

## Synthèse (scorecard)

| Axe | Note | Verdict |
| --- | --- | --- |
| Sécurité | 6/10 | Correct pour un MVP, trous de hardening |
| Performance | 6/10 | **Problème majeur : cache/quota inadaptés au serverless** |
| SEO | 4/10 | Métadonnées basiques seulement |
| Accessibilité | 7/10 | Contrastes AA, focus visible, skip-link, reduced-motion (reste : tests lecteurs d'écran) |
| Robustesse / code | 8/10 | TS strict + lint propres + 80 tests unitaires/intégration |
| UX / finition | 7/10 | Très bon pour un MVP, quelques états manquants |
| Données | 6/10 | Stratégie multi-API solide, limites de sources assumées |
| Production | 3/10 | Rien de branché : déploiement, analytics, monitoring, legal |

**Verdict : le site est un MVP fonctionnel et bien construit, mais PAS
encore « niveau agence ».** Il faut traiter les P0/P1 ci-dessous avant un
lancement public sérieux.

> **Mise à jour (15/08/2026, même session, 3e passe — features/design)** :
> P0+P1 **FAITS** (sécurité, performance, SEO, a11y, tests 80, error.tsx,
> monitoring quotas, P2 : comparateur, quotas, recherche floue, gros combats,
> pagination, PWA). Nouveau : **comptes utilisateurs** (JWT + SQLite
> `better-sqlite3`, proxy Next 16, pages connexion/inscription, dashboard
> profil + favoris avec étoile sur les cartes), **actualités boxe** (5 flux
> RSS/Atom + 5 chaînes YouTube via `videos.xml` public, `/api/news`, section
> accueil, cache 15 min, sources en panne = skip), **design** : menu plein
> écran style rive.app (burger animé, cascade), loader rideau style
> eszterbial.com (bandes verticales paires ↑ / impaires ↓), utilitaires
> d'animation boutons/liens (`.sheen`, `.hover-lift`, `.press`,
> `.link-underline`) partout. **Passes de finition (même journée)** : fix
> menu invisible (containing block du `backdrop-filter` → overlay sorti du
> header, vérifié plein écran desktop + mobile), fix erreur React
> « Cannot update Router while rendering Directory » (router.replace sorti
> de l'updater de setFilters → useEffect), loader rendu côté serveur (le
> site n'apparaît qu'après le rideau, cookie `rounds_loader_seen`),
> transitions de page (PageTransition keyed par pathname), badges « Top x »
> sur toutes les cartes. Reste avant lancement : choix déploiement +
> env vars Redis (Upstash) + `JWT_SECRET`, CGU The Odds API, analytics
> (différés), historique des combats (2.2/2.3, dépend des sources), bascule
> SQLite → store distant si Vercel, « Source : mock » conservé (choix produit).

---

## 1. Sécurité

### P0 — Fuite d'informations internes dans les erreurs API
`app/api/boxeurs/route.ts` et `app/api/combats/route.ts` renvoient
`detail: String(err)` dans la réponse : URLs internes, messages de providers
et stack traces en clair. **Fix :** logger côté serveur, renvoyer un message
générique au client (`{ error: "Service temporairement indisponible" }`).

### P1 — Pas de rate limiting / anti-scraping sur /api/*
Un site public = n'importe qui peut marteler `/api/boxeurs` et **brûler les
quotas des APIs payantes/gratuites** (surtout Odds API : 16 req/j !).
**Fix :** rate limiting par IP (ex. `@upstash/ratelimit` ou middleware
maison + compteur), cache-control sur les réponses, et limiter la fréquence
de refetch côté client.

### P1 — Pas de security headers
`next.config.ts` est vide : pas de CSP, `X-Content-Type-Options`,
`Referrer-Policy`, `Permissions-Policy`, HSTS… **Fix :** `headers()` dans
next.config + CSP stricte (le site n'utilise pas d'inline JS hors Next).

### P2 — Validation des query params trop laxiste
`limit` accepte `-5` ou `1e9`, `sort` inconnu passe silencieusement.
**Fix :** clamps (`limit` 1..500), whitelist des tris/catégories, rejeter
les NaN. Impact faible mais propre.

### ✅ Déjà bons
- Clés API uniquement côté serveur (route handlers), `.env.local` gitignoré.
- URLs des APIs fixes (pas d'input utilisateur dans les fetch → pas de SSRF).
- `server-only` sur toute la couche données.
- Circuit breaker + quota protègent les fournisseurs des boucles.

---

## 2. Performance

### P0 — Cache mémoire + fichier quota **inadaptés au serverless**
`cache.ts` (Map en mémoire) et `quota.ts` (écriture fs synchrone dans
`.data/quota.json`) fonctionnent en Node persistant (dev, serveur dédié)
mais **pas sur Vercel/serverless** : chaque instance lambda a sa propre
mémoire et son propre filesystem éphémère → compteurs de quota par instance
(consommation réelle sous-estimée, dépassement possible), cache perdu à
chaque cold start (appels API dupliqués, latence). ⚠️ Depuis l'étape 3.1b,
`ShardsFightsProvider` lit aussi `public/data/` par `fs` — **la cible
VM/container (a) devient la recommandation** : tout marche tel quel.
**Fix (b) sinon :** basculer cache + quota vers un store partagé (Upstash
Redis, KV de Vercel, ou Postgres) avec une interface `Cache`/`Quota`
abstraite (facile : déjà isolés dans 2 modules), et copier `public/data/`
vers un store/objet accessible en runtime.

### P1 — Écriture synchrone du quota à chaque requête
`writeFileSync` à chaque `consume()` → contention sous charge même en Node.
**Fix :** débounce l'écriture (flush toutes les 30 s / à la fermeture),
ou le store partagé du point ci-dessus.

### P2 — Bundle client
framer-motion + lucide + TanStack Query sont chargés globalement.
framer-motion ~100-120 KB gzip. **Fix si besoin :** `next/dynamic` sur les
composants lourds (directory, combats), tree-shaking lucide (déjà OK en
v1.31), vérifier avec `@next/bundle-analyzer` avant de conclure.

### P2 — Payload `/api/boxeurs`
Renvoie 124 fiches complètes (bios, titres) à chaque load. OK aujourd'hui,
mais prévoir des champs allégés (`?fields=`) quand on paginera (12 000+).

### ✅ Déjà bons
- Fonts via `next/font` (self-hosted, zéro CLS), avatars CSS (pas d'images).
- RSC + Suspense, pages statiques pour `/` et `/combats`.
- Cache TTL agressif côté données (24 h profils, 10 min cotes).

---

## 3. SEO

### P1 — Pas de sitemap, robots.txt, canonical, JSON-LD, OG images
- `app/sitemap.ts` (générer depuis les 124 slug + pages statiques).
- `app/robots.ts`.
- `canonical` dans metadata (les URL de filtres `/boxeurs?q=…` devraient être
  `noindex` — ce sont des variantes de la même page).
- **OG images par boxeur** : `app/boxeurs/[slug]/opengraph-image.tsx` avec
  avatar + palmarès (grosse valeur pour le partage).
- JSON-LD `Person` (boxeur) et `SportsEvent` (combat).

### P2 — « Source : mock » affiché publiquement
Le répertoire affiche « Source : mock ». En prod, soit masquer, soit
renommer (« Données de démo ») — surtout si on ajoute le noindex des pages
filtres, il faut aussi éviter que Google indexe du contenu de démo.

### ✅ Déjà bons
- Metadata title/description/OG basiques par page, `lang="fr"`, HTML
  sémantique (h1 → h3 corrects).

---

## 4. Accessibilité (WCAG)

### P1 — Contraste insuffisant
`fog` (#6d6d7d) et `mist` (#a2a2b3) sur fond `ink` (#07070c) : ratio ≈ 3:1,
sous le 4.5:1 exigé (AA) pour du texte courant. **Fix :** éclaircir
`fog`/`mist` (≥ #9aa0b5 / #b8bccb) ou les réserver aux éléments décoratifs
(méta-textes ≥ 18 px, etc.). Vérifier aussi `text-fog` sur `panel-2`.

### P1 — Focus visible
Les `Chip`, cartes `FighterCard`, boutons du nav sont des éléments custom :
le focus par défaut est souvent masqué (le pill du nav recouvre le focus).
**Fix :** styles `:focus-visible` globaux (anneau néon) + `outline` visible
sur cartes et chips.

### P1 — Icônes décoratives lues par les lecteurs d'écran
5 icônes lucide sans `aria-hidden` (Search, Crown, Trophy, MapPin…).
**Fix :** `aria-hidden="true"` sur toutes les icônes décoratives (texte
porteur adjacent déjà présent).

### P2 — Pas de skip-link, loader non testé en reduced-motion
- Ajouter un « Aller au contenu » (focusable, visible au focus).
- Le loader d'intro s'affiche même avec `prefers-reduced-motion` : le
  masquer ou le neutraliser dans ce cas.
- Emoji drapeaux/🥊 lus par les lecteurs d'écran : les drapeaux dans les
  `<option>` sont utiles, le 🥊 du logo est décoratif.

### ✅ Déjà bons
- `prefers-reduced-motion` géré dans `Reveal` et `Counter`.
- Langue fr, landmarks (`header`, `nav`, `main`, `footer`), labels de
  formulaire, `<label>` autour des sliders, `alt`/rôle des avatars ok.

---

## 5. Robustesse / qualité de code

### P1 — Zéro test
Pas de script `test` ni de framework. Le cœur (fusion multi-source, quota,
circuit breaker, `applyFilters`) est parfaitement testable — voir
`TASKS.md` 1.5 (Vitest installé comme skill). **Fix :** priorité haute,
c'est ce qui protège la stratégie multi-API.

### P1 — Pas d'`error.tsx` ni d'ErrorBoundary client
Une erreur runtime côté client → écran blanc. **Fix :** `app/error.tsx`
global + `app/boxeurs/[slug]/error.tsx` avec fallback stylé + bouton retry.

### P2 — Combats mock « à venir » avec dates figées
Les 6 combats mock ont des dates fixes (sept. → déc. 2026) : une fois
passées, ils resteront affichés. **Fix :** filtrer `status upcoming` avec
`date > now` dans le routeur (et le mock).

### P2 — `mergeFighter` : le mock écrase toujours
Par design aujourd'hui (Big Balls renvoie `record: null`), mais le jour où
Big Balls publiera de vrais palmarès il faudra **prioriser la source réelle
quand elle a des combats**. Logique à rendre paramétrable dès maintenant
(simple champ `recordPriority`).

### ✅ Déjà bons
- TS strict, ESLint 0 erreur, `npm run build` vert.
- Erreurs 404 propres (pas de `loading.tsx` sur routes dynamiques).
- États vides / erreurs gérés dans le répertoire (message + reset).

---

## 6. Données & multi-API

### ✅ Points forts
- Routeur multi-source : fusion, enrichissement mock, dédup, cotes réelles
  prioritaires — validé en live.
- Quota + circuit breaker + cache TTL.
- Schémas API documentés et validés (voir CONTEXT.md §4.3).
- **Résultats OFFICIELS des 7 organisations** (IBF/WBA/WBC/WBO/CSAC/NSAC/FFBoxe)
  via `boxingdatasource-pipeline` → `public/data/fights/*.json` (1853 combats),
  lus en statique par `ShardsFightsProvider` (priorité 3, zéro réseau,
  dédup inter-sources par id SHA-256) — le mock ne sert plus que les
  combats à venir et l'enrichissement des stars (TASKS 2.6).
- **Combats à venir À JOUR (2.7)** : la fiction du mock (cotes inventées,
  dates figées) est écartée quand l'Odds API répond ; le label source ne
  ment plus (« oddsapi », pas « oddsapi + mock »).
- **Combats à venir triés par date (2.9)** : du plus proche au plus lointain
  (l'importance ne départage plus que les égalités) et **date réelle
  conservée** quand le mock enrichit.
- **Combats terminés → Résultats récents (2.9)** : l'endpoint `/scores/` de
  The Odds API (`completed: true`) fait basculer les combats à venir qui ont
  eu lieu en résultats récents (winner déduit des scores), triés par date
  décroissante.
- **Ceintures par organisation (2.8 + 2.9)** : historique dérivé des shards
  (victoires en combat de titre) + **statut ACTUEL curé** par org
  (`belt-status.ts`, ex. Usyk : WBA/WBC/IBF/WBO « Vacant » après abandon
  2025-2026) — plus de sous-entendu « il détient » quand il a renoncé.
- **Fiche technique corrigée (2.9)** : les défauts d'API (Orthodoxe,
  allonge 0) n'écrasent plus les données curées — ordre de confiance
  Wikipedia > Big Balls > mock > TheSportsDB, garde spécifique prime
  (Usyk : Southpaw · 198 d'allonge).
- **Toute la carrière d'un boxeur (2.9)** : `getBoxerFights` lit TOUS les
  shards (pas seulement le top-30 mondial) — Usyk : Dubois 2025 → 2018.
- **Répertoire crédible (2.7)** : tri par défaut hybride (rang → palmarès →
  nom) et fusion sans troncature — les 24 stars (avec vrais records
  Wikipedia) ouvrent la liste, fini les 0-0-0 en page 1.

### ⚠️ Limites à assumer (produit)
- Big Balls : `record` null → les boxeurs non-mock affichent 0-0-0 (honnête
  mais pauvre). Prévoir un badge « palmarès à venir ».
- Les 100 premiers profils Big Balls seulement (limit API ≤ 100) → voir
  pagination (TASKS 2.1).
- TheSportsDB : recherche par nom uniquement.
- Odds API : cotes uniquement ; le volume de combats est réel mais
  hétérogène (beaucoup d'affiches mineures) → mise en avant des gros
  combats (TASKS 1.4).

---

## 7. Légal / produit (à ne pas oublier)

- **The Odds API** : le plan gratuit est pour du dev/test ; un usage
  commercial du site (cotes publiques) impose leur plan payant. **À valider
  avant lancement.**
- **Big Balls** : le plan gratuit couvre « a real app » selon leur page —
  vérifier les CGU pour un site public à fort trafic.
- **TheSportsDB** : gratuit, données crowd-sourced (attribution souhaitable).
- **Noms de boxeurs réels** : données factuelles publiques (type BoxRec),
  mais ajouter une mention « palmarès non officiels / sources variées »
  (déjà en footer pour la démo, à garder en prod).
- Logo « ROUNDS » : à vérifier s'il n'entre pas en collision avec une marque.

---

## 8. Plan de remise à niveau (ordre recommandé)

### P0 — avant tout déploiement
1. **Sécurité API** : erreurs génériques + rate limiting + security headers — ✅ **FAIT**.
2. **Serverless ou pas ?** Décider la cible de déploiement (voir §2) :
   - VM/container (Node long-running) → cache/quota actuels OK ;
   - Vercel → cache + quota abstraits (drivers mémoire/Redis) — ✅ code FAIT,
     il reste à créer le store Upstash et poser les env vars.

### P1 — avant lancement public
3. SEO : sitemap, robots, canonical, OG images boxeurs, JSON-LD, noindex des
   pages filtres — ✅ **FAIT**.
4. A11y : contrastes AA, `:focus-visible`, `aria-hidden` icônes, skip-link,
   loader reduced-motion — ✅ **FAIT**.
5. Tests du routeur + `applyFilters` + quota (Vitest) — ✅ **FAIT** (72 tests).
6. `error.tsx` global + par page — ✅ **FAIT** (retry + fallback stylé).
7. « Source : mock » — conservé (choix de l'utilisateur) ; noindex des pages
   filtres déjà en place — ✅.
8. Vérifier les CGU The Odds API (plan payant si usage commercial) — ⏳ à valider par l'utilisateur.
9. Monitoring des quotas (alerte 80 % + `/api/health` + `/debug`) — ✅ **FAIT** ;
   Analytics (Plausible/Vercel) — ⏳ volontairement différé (choix utilisateur).

### P2 — ensuite
10. Pagination du répertoire (offset/limit API + « Charger plus », `?page=`) — ✅ **FAIT** (virtualisation 12 000+ : plus tard).
11. Historique complet des combats (TASKS 2.2), records réels (TASKS 2.3) — ⏳ dépend des sources (Big Balls publiera `record`/`bouts`). ➡️ **Résultats officiels récents déjà en ligne** (TASKS 2.6, shards du pipeline, 1853 combats) ; il manque l'historique par boxeur sur la page profil.
12. Comparateur tale-of-the-tape (TASKS 1.1), dashboard quotas (TASKS 1.2) — ✅ **FAITS**.
13. Recherche floue + autocomplete (TASKS 1.3) — ✅ **FAITE** (Levenshtein, client + API).
14. Mise en avant des gros combats (TASKS 1.4) — ✅ **FAITE** (`fightImportance`).
15. PWA (manifest + icône SVG + SW network-first en prod) — ✅ **FAIT** (base).

---

*Notes : audit effectué le 15/08/2026 sur la base du code présent, du
CONTEXT.md et de tests runtime. Les notes/priorités sont à revalider après
chaque grosse évolution (nouveau provider, refactor du routeur…).*
