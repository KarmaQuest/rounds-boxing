# Sources de données boxe — recherche (16/08/2026)

> Recherche exhaustive des datasets/APIs **gratuits et à jour** pour combler
> les manques de ROUNDS : **vrais palmarès** (Big Balls renvoie `record:
> null`), **historique des combats** (TASKS 2.2/2.3), et compléments de bio.
> **État : le POC Wikipedia est intégré** (provider `wikipedia`, snapshot
> committé) — voir la section « ✅ Intégré » ci-dessous.

---

## Les besoins à combler

| Besoin | État actuel |
| --- | --- |
| Records (V-D-N-KO) réels | Mock uniquement (approximatif, daté) |
| Historique des combats par boxeur | Mock (6 combats) — TASKS 2.2/2.3 en attente |
| Combats à venir + cotes | ✅ The Odds API (réel) → programmation officielle vérifiée (shards IBF/WBC, zéro mock) |
| Profils / bio | ✅ Big Balls (1000 req/j gratuit) + mock |
| Fiche technique (taille, allonge, garde) | Mock (approximatif) |

---

## Sources évaluées

### ✅ RECOMMANDÉ — Wikipedia (infobox + palmarès)

**Ce que c'est** : les articles des boxeurs contiennent une infobox
`{{Infobox Boxeur}}` (fr) / `{{Infobox boxer}}` (en) avec exactement les
champs de ROUNDS, et souvent une section **« Boxing record »** (historique
complet des combats avec adversaire, résultat, round, date).

**Vérifié en live** (16/08/2026, via l'API `action=parse`) :
- Canelo : `combats = 68`, `victoires = 63`, `KO = 39`, `défaites = 3`,
  `matchs nuls = 2`, + `taille`, `allonge`, `catégorie`, `style`, `titres`
- Couverture des 24 boxeurs du mock : **≥ 7/24 confirmés** (Usyk, Fury,
  Joshua, Dubois, Opetaia, Canelo, Crawford) — les autres n'ont pas pu être
  re-testés (rate-limit temporaire de l'API), mais le modèle d'infobox est
  le même pour tous les boxeurs notables. Usyk/Fury/Joshua/Opetaia ont en
  plus la section historique des combats.

**Pourquoi c'est la meilleure option** :
- **Gratuit et légal** : contenu CC BY-SA (attribution à mentionner)
- **À jour** : mis à jour par la communauté après chaque combat
- **Aucune clé API** : endpoint public `https://{lang}.wikipedia.org/w/api.php`
- **Couvre exactement le modèle `BoxerRecord`** de ROUNDS + fiche technique
  (allonge, garde) + titres + historique complet → débloque TASKS 2.2/2.3
  pour les boxeurs connus

**Limites** :
- Couverture : les grands noms seulement (pas les 12 000 profils BoxRec)
- API à utiliser avec **prudence** : User-Agent obligatoire, ~1 req/s max,
  **cache long** (24 h+) — vérifié : l'API répond « too many requests »
  après une rafale
- Wikitext à parser (infobox + templates) → parser dédié à écrire + tests
- Attribution CC BY-SA requise (footer + page)

---

### ✅ Wikidata (SPARQL) — complément bio

**Ce que c'est** : base de connaissances structurée (CC0).

**Vérifié en live** :
- **19 533 boxeurs** (occupation Q11338576 « boxer » + sous-classes)
- Mais **seulement 80 avec ID BoxRec** (P396) et **2 avec records**
  (P1352) → **inutilisable pour les palmarès**
- Par contre : bio riche pour les stars (hauteur, poids, BoxRec ID,
  naissance, surnom, image) — complément utile du mock

**Verdict** : bio des stars seulement. Légal (CC0), gratuit, aucune clé.
Intégration légère (SPARQL ponctuel + cache) si on veut enrichir les fiches.

---

### ✅ Déjà intégrés (pour mémoire)

| Source | Rôle | Statut |
| --- | --- | --- |
| The Odds API | Cotes des combats à venir | ✅ 500 crédits/mois, cache 10 min (repli : programmation shards IBF/WBC vérifiée par IA) |
| Big Balls | Profils boxeurs | ✅ 1000 req/j gratuit ; `record` promis « bientôt » (les suivre) |
| TheSportsDB | Recherche par nom | ✅ Gratuit, couverture boxe inégale |

---

### ❌ Écartés (vérifié)

| Source | Pourquoi |
| --- | --- |
| boxingundefeated/open-boxing-data | **Vide** : README + FUNDING seulement (0,0 Mo), inactif depuis 08/2025, aucune licence |
| serp-ai/boxing-punch-recognition-dataset | **Vide** (0,1 Mo) et **hors sujet** : dataset de vision par ordinateur pour entraîner une IA de reconnaissance de coups — pas des records |
| boxing/boxrec (npm, scraper BoxRec) | **Cassé** : le README indique « not working, or working very poorly » (captchas Cloudflare, login requis). Et légalement gris (TOS BoxRec interdisent le scraping) |
| Kaggle « Boxing Matches » (mexwell, 24 Mo) | Périmé (10/2023), **licence inconnue** — risqué |
| Kaggle « Professional Boxers » (328 boxeurs) | MIT ✅ mais petit, note d'utilisabilité 0,5/1, qualité douteuse |
| Kaggle « Predict the Winner » | CC0 ✅ mais 2022 → périmé |
| Mendeley « Boxing Data » (NSAC/CSCA) | Purse data 2019 → périmé et hors sujet (bourses, pas records) |
| BoxMAC, Roboflow, Olympic punch (Kaggle) | Vision par ordinateur → hors sujet |

---

## Options payantes/freemium (si besoin un jour)

À évaluer via un comparateur si on veut une API clé-en-main : API-Sports
(boxing/mma), boxing-data.com (RapidAPI), DataSportsGroup, Tapology.
⚠️ CGU à vérifier (comme The Odds API) avant tout usage commercial.

---

## ✅ Intégré — provider « wikipedia » (POC validé, 16/08/2026)

Le POC est devenu une vraie source, dans la stratégie multi-provider :

- **`lib/data/providers/wikipedia-parse.ts`** : parser d'infobox fr/en
  (record V-D-N-KO, taille, allonge, garde, catégorie, surnom) + **23 tests**
  (fractions de pouces, pieds+pouces, `{{plainlist|}}` multi-ligne, champs
  vides = invaincu, tirets EN, « Fausse patte » = Southpaw…)
- **`lib/data/providers/wikipedia.ts`** : provider `wikipedia` (priorité 2,
  gratuit, illimité) branché dans `lib/data/index.ts`
- **SNAPSHOT committé** `wikipedia-records.json` : les palmarès des **24
  stars** (généré par `scripts/refresh-wikipedia.ts`, `npx tsx`).
  **Zéro requête réseau en runtime** → répertoire instantané, aucun risque
  de rate-limit en production. Rafraîchissement : relancer le script et
  committer le JSON (dataset, comme les autres sources).
- **Fusion routeur** : le palmarès réel prime sur le mock ; les données
  physiques d'une source réelle priment aussi (le mock ne comble que les
  trous) ; le label source suit le palmarès retenu.
- **Attribution CC BY-SA** ajoutée au footer.

**Vérifié en live** (API `/api/boxeurs`) : Usyk **25-0-0** (KO 16, Southpaw,
191/198 cm, « The Cat », Poids lourds), Crawford **42-0-0** (KO 31, Southpaw,
173/188 cm, « Bud »), Inoue **33-0-0** (KO 27, 165/171 cm, « The Monster »)…
vs mock : 23-0-0 / 41-0-0 / 29-0-0 — les vrais palmarès s'affichent.

## Recommandations restantes

1. **Wikidata** en complément bio (léger, si besoin) — non prioritaire.
2. **Garder le mock** comme dernier recours (boxeur sans page Wikipedia).
3. **Historique des combats par boxeur** (TASKS 2.2/2.3) : la section
   « Boxing record » des articles Wikipedia est exploitable — prochaine
   étape naturelle du même provider.
