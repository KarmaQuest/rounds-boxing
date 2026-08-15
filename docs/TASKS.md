# TASKS — ROUNDS 🥊

> **Feuille de route.** Toutes les tâches identifiées, priorisées par valeur /
> effort. Chaque tâche liste son objectif, les fichiers concernés et ses
> critères d'acceptation. Dernière mise à jour : 15/08/2026.

---

## Phase 1 — Court terme (fonctionnalités qui complètent l'existant)

### 1.1 Comparateur « Tale of the Tape » — ✅ FAIT
- **Objectif** : page `/comparateur?boxeurA=&boxeurB=` affichant deux boxeurs côte à côte (fiches techniques, palmarès, barres animées) — la fonctionnalité emblématique des sites de boxe.
- **Fichiers** : `app/comparateur/page.tsx`, `components/comparateur/comparator.tsx` (réutilise `Avatar`, `RecordBar`, `RecordNumbers`).
- **Acceptation** : ✅ 2 sélecteurs synchronisés dans l'URL, stats gagnantes en or, états vide/chargement/erreur, lien footer.

### 1.2 Dashboard quotas API — ✅ FAIT
- **Objectif** : voir en direct l'usage des quotas par provider (ex. `/api/health` + encart discret en pied de page ou page debug).
- **Fichiers** : `app/api/health/route.ts`, `app/debug/page.tsx` (noindex, lien footer « État des sources »), alerte console à 80 % dans `quota.ts`.
- **Acceptation** : ✅ `/api/health` + `/debug` affichent `bigballs 10/1000`, `oddsapi 2/16`, `thesportsdb 11/500`, `mock 0/0` ; warning serveur à 80 % du quota.

### 1.3 Recherche floue + autocomplete — ✅ FAIT
- **Objectif** : fuzzy matching (typos tolérées) sur la recherche du répertoire + suggestions déroulantes pendant la frappe.
- **Fichiers** : `lib/data/utils.ts` (`levenshtein`, `fuzzyScore`, `fuzzyMatch`, `fuzzySuggest`), `components/directory/filters.tsx` (dropdown 5 suggestions), API `/api/boxeurs?q=` aussi floue (fusion recherche + liste complète).
- **Acceptation** : ✅ « uzyk » et « canlo » trouvent Usyk / Canelo (client ET API, testé), dropdown au focus.

### 1.4 Mise en avant des gros combats — ✅ FAIT
- **Objectif** : sur `/combats`, trier / épingler les affiches avec enjeu (titre en jeu, boxeurs connus, cotes serrées) au lieu de l'ordre chronologique brut.
- **Fichiers** : `fightImportance()` dans `lib/data/utils.ts` (titre, palmarès, cotes serrées, gros marchés), tri dans `router.ts`, section « Les affiches du moment » dans `app/combats/page.tsx` + `components/combats/tabs.tsx`.
- **Acceptation** : ✅ superfights en tête + section dédiée (score ≥ 3), le reste chronologique.

### 1.6 Comptes utilisateurs (email + mot de passe, JWT) — ✅ FAIT
- **Objectif** : inscription / connexion / déconnexion sécurisées, session persistante.
- **Fichiers** : `lib/auth/` (`db.ts` SQLite `better-sqlite3`, `password.ts` scrypt+sel, `jwt.ts` jose HS256, `session.ts`, `constants.ts`), routes `/api/auth/{register,login,logout,me,password}`, `proxy.ts` (Next 16, protège `/dashboard` + `/api/favorites/*`), pages `/connexion` + `/inscription`.
- **Acceptation** : ✅ register→cookie httpOnly→me ; mauvais mdp → 401 (réponse identique, pas de fuite d'existence) ; logout ; changement de mot de passe ; `/dashboard` redirige si non connecté (307 → `/connexion?next=`).

### 1.7 Dashboard utilisateur + favoris — ✅ FAIT
- **Objectif** : profil (email, date d'inscription) + liste des boxeurs favoris (étoile sur les cartes du répertoire).
- **Fichiers** : `app/dashboard/page.tsx`, `components/auth/{auth-form,change-password,logout-button,account-chip,favorite-button}.tsx`, routes `/api/favorites` + `/api/favorites/[slug]` (PUT/DELETE/GET), table `favorites` SQLite.
- **Acceptation** : ✅ star sur les cartes (état chargé via `/api/favorites`), favoris listés sur le dashboard.

### 1.8 Actualités boxe (articles RSS + vidéos YouTube) — ✅ FAIT
- **Objectif** : section « L’actu boxe » sur l’accueil avec les dernières actualités en texte et vidéo.
- **Fichiers** : `lib/news/` (`sources.ts`, `types.ts`, `parse.ts` fast-xml-parser RSS/Atom/YT, `index.ts` agrégateur + cache 15 min), `app/api/news/route.ts` (rate-limit, `type=all|articles|videos`, `limit`), `components/home/news.tsx` (onglets + grille, client-side).
- **Sources** : 5 flux articles (Bad Left Hook, World Boxing News, Boxing News Online, Boxing Social, Boxing Insider) + 5 chaînes YT via `videos.xml` public (DAZN, Top Rank, Matchroom, Sky Sports Boxing, iFL TV). ⚠️ BoxingScene / BoxingNews24 / The Ring répondent 403 (Cloudflare) — laissées de côté.
- **Acceptation** : ✅ articles + vidéos triés par date, miniatures YT, une source en panne ne casse jamais la page (timeout 8 s + skip), cache 15 min, 0 erreur en prod.

### 1.9 Design : menu Rive + loader Eszterbial + animations boutons — ✅ FAIT
- **Objectif** : menu plein écran style rive.app (burger animé → croix, liens en cascade), loader style eszterbial.com (rideau de bandes verticales qui s’écartent), chaque bouton/lien animé.
- **Fichiers** : `components/navbar.tsx` (réécrit : burger + overlay + cascade + scroll lock + Échap), `components/loader.tsx` (réécrit : 14 bandes, paires ↑ / impaires ↓, 1×/session, reduced-motion sauté), `app/globals.css` (`.sheen`, `.hover-lift`, `.press`, `.link-underline`, transitions globales `a`/`button` sans transform pour ne pas casser framer-motion).
- **Acceptation** : ✅ menu ouvert à toutes les tailles d’écran, active state sur le lien courant, overlay accessible (Échap, aria), loader rideau vérifié en prod.

### 1.5 Tests unitaires du routeur (le plus important pour la robustesse) — ✅ FAIT
- **Objectif** : couvrir la fusion multi-source : enrichissement mock, primauté des cotes réelles, dédup par slug, quota épuisé, circuit breaker, cache.
- **Fichiers** : `vitest.config.ts` (stub `server-only`), `lib/data/providers/router.test.ts`, `lib/data/utils.test.ts`, `lib/data/quota.test.ts`. `npm test` (Vitest 4).
- **Acceptation** : ✅ 61 tests — fusion/dédup, `recordPriority`, quota épuisé, circuit 3 échecs / 429 immédiat, cache hit/miss, tri/limite combats, `applyFilters`, persistance disque du quota (flush 5 s, rollover de jour), `fetchJson`.

---

## Phase 2 — Moyen terme (données & montée en charge)

### 2.1 Pagination / virtualisation du répertoire — ✅ FAIT (base)
- **Objectif** : exploiter les 12 213 profils Big Balls sans écraser le client.
- **Fichiers** : `lib/data/types.ts` (`offset`), `lib/data/index.ts` (fetch max + slice stable), `app/api/boxeurs/route.ts` (`offset` clampé), `components/directory/directory.tsx` (`useInfiniteQuery` 24/page + « Charger plus » + param `page` dans l'URL).
- **Acceptation** : ✅ pagination API cohérente (24/page), bouton « Charger plus », URL `?page=N`. (Virtualisation + dédup inter-pages pour 12 000+ : plus tard.)

### 2.2 Historique complet des combats par boxeur — ⏳ dépend des sources
- **Objectif** : timeline complète (tous les combats d'un boxeur) sur la page profil — dépend des sources : Big Balls publiera `record` et `bouts` (Nevada d'abord), sinon compléter le mock.
- **Fichiers** : `lib/data/types.ts` (nouveau type `FightHistory`), `lib/data/providers/*`, page `[slug]`.
- **Acceptation** : un boxeur du mock affiche ≥ 10 combats avec méthode/round/date.

### 2.3 Records réels quand Big Balls les publiera — ⏳ dépend de Big Balls (recordPriority déjà en place)
- **Objectif** : brancher `GET /v1/athletes/:id/record?sport=boxing` (annoncé « coming soon ») et cesser de dépendre du mock pour les palmarès.
- **Fichiers** : `bigballs.ts` (nouvelle méthode `getRecord`), fusion dans `router.ts`.
- **Acceptation** : le palmarès affiché vient de la source réelle quand dispo, le mock reste le fallback.

### 2.4 SEO & partage — ✅ FAIT (sauf carte OG par combat, à la demande)
- **Objectif** : sitemap.xml, opengraph-image (cartes de partage par boxeur), JSON-LD (Person/SportsEvent).
- **Fichiers** : `app/sitemap.ts` (127 URLs), `app/robots.ts`, `app/opengraph-image.tsx` + `app/boxeurs/[slug]/opengraph-image.tsx` (Anton via `public/fonts/`), `components/json-ld.tsx`, `lib/site.ts` (`NEXT_PUBLIC_SITE_URL`), canonical + noindex des URL filtrées (`/boxeurs?q=…` → `noindex, follow`).
- **Acceptation** : ✅ chaque profil a une carte OG (avatar + palmarès, 1200×630) ; JSON-LD `Person` (boxeur), `SportsEvent` (combats), `WebSite` (accueil).

### 2.5 Améliorations UX/animations
- **Objectif** : transitions de page (View Transitions ou AnimatePresence autour de `main`), marquee des grands noms, micro-animations KO, dark/light toggle, respect `prefers-reduced-motion` partout.
- **Fichiers** : `app/layout.tsx`, `components/`, `app/globals.css`.
- **Fait partiellement (15/08/2026)** : menu Rive + loader Eszterbial + animations boutons/liens (voir 1.9). Reste : transitions de page, marquee, dark/light toggle.

---

## Phase 3 — Plus tard (polissage & produit)

- **3.1** Historique & filtrage par organisation de ceintures (WBC/WBA/IBF/WBO) sur le répertoire.
- **3.2** Favoris — ✅ **FAIT** (compte requis, voir 1.7) : étoile sur les cartes + liste sur le dashboard. Améliorations possibles : favoris hors compte (localStorage), bouton sur les profils boxeur.
- **3.3** Notifications de combats à venir (web push) pour les boxeurs suivis.
- **3.4** Internationalisation (FR/EN) via `next-intl` ou `react-i18next`.
- **3.5** Thème clair en plus du dark néon.
- **3.6** PWA (manifest, offline, icônes) — ✅ **FAIT** (base) : `app/manifest.ts`, `app/icon.svg`, `public/sw.js` (network-first), enregistrement SW uniquement en prod (`components/sw-register.tsx`).
- **3.7** Déploiement : Vercel (env vars à configurer), domaine, analytics (Plausible/Vercel Analytics).
- **3.8** Espace admin (non essentiel en solo) : gérer les données éditoriales du mock sans toucher au code.
- **3.9** Backend persistant — ✅ **FAIT (base)** : SQLite (`better-sqlite3`, `.data/rounds.db`) pour comptes/favoris ; le cache API reste en mémoire/Redis. Sync périodique des APIs si le volume monte.

---

## Journal de conception (interviews) — 15/08/2026

Chaque évolution de conception est cadrée par un entretien avec
l'utilisateur, puis documentée ici (décisions → implémentation).

### Loader & chargement de page (session 15/08/2026)

**Problème** : « je vois la page avant le loader à chaque nouveau
chargement » — révélation du site mal synchronisée avec le chargement.

**Interview** (3 questions, réponses utilisateur) :

| Question | Réponse choisie |
| --- | --- |
| Quand révéler le site ? | **À `window.load`** (tout est chargé : HTML, styles, polices, images non-lazy) — pas à une durée fixe |
| Que faire sur navigation interne (clic lien) ? | **Distinguer** : rideau uniquement sur les vrais chargements (F5 / nouvel onglet) ; sur les clics internes, **fade smooth du contenu** (transition de page) |
| Styles critiques inline pour l'anti-flash ? | **Simple, sans inline** — on garde le CSS normal (flash résiduel possible en dev, absent en prod où Next inline le CSS critique) |

**Décisions d'architecture retenues** :
- **Bus d'événements JS propre** (`lib/page-events.ts`) :
  - `PageReadySignal` (layout, client) émet **`rounds:page-ready`** au
    `window.load` + un paint (`requestAnimationFrame`).
  - `AppLoader` écoute l'événement → lève le rideau (temps minimal
    d'affichage du logo : 1,5 s) — **filet de sécurité 6 s** si l'événement
    ne part jamais (jamais de site bloqué).
  - Émission sans écouteur = no-op ; désabonnement propre (cleanup).
- **Rideau** : rendu SSR (`visible = true` initial) → couvre le site dès le
  premier paint ; site révélé uniquement au `window.load` + min 1,5 s.
- **Navigation SPA** : plus de rejeu du rideau — `PageTransition` (fade
  keyé par pathname) gère le changement de page.
- `prefers-reduced-motion` : rideau retiré immédiatement (aucune animation).

**Vérifié en navigateur (headless)** : rideau présent 500 ms → 2 s,
révélé ~3,5 s ; clic interne sans rideau avec fade ; retour accueil OK.

---

## Conventions à respecter en travaillant sur ces tâches

- **Typecheck/build** : `npm run build` doit passer avant de conclure une tâche.
- **Tests** : `npm test` (Vitest) doit passer — le `server-only` est stubé dans `vitest.config.ts` (alias vers `test/stubs/server-only.ts`).
- **Lint** : `npm run lint` à 0 erreur (apostrophes → `'`, pas de composant dans le render, pas de setState synchrone dans un effet, `motion.*` seulement en client).
- **Next.js 16** : `params` en Promise, `PageProps<'/route'>` / `RouteContext<'/api/...'>`, `useSearchParams` sous `<Suspense>`, pas de `loading.tsx` sur routes dynamiques si on veut de vrais 404.
- **Données** : tout passe par `lib/data/index.ts` (jamais de fetch API direct depuis le client), clés uniquement dans `.env.local`.
- **Multi-API** : respecter le pattern « le mock enrichit, les APIs réelles donnent la profondeur » ; ajouter une source = implémenter `DataProvider` + l'enregistrer dans `index.ts`.
