# Historia — ouverture de paquets de cartes d'Histoire

Prototype d'un site d'ouverture de paquets « hyper satisfaisant ». Chaque carte est un article
d'Histoire de Wikipédia (FR) illustré. La rareté vient du nombre de vues de l'article, et des
variantes spéciales sont tirées indépendamment.

## Lancer le projet

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # build statique dans dist/
```

- **Mode normal** : 1 paquet toutes les 15 minutes, cumulable sans limite. Les cartes sont
  enregistrées dans le cahier (stockage du navigateur).
- **Mode test** (interrupteur en haut à droite, ou `?mode=test`) : ouvertures illimitées, rien
  n'est enregistré, et l'onglet **Effets** montre tous les cadres et variantes.

## Données (`public/cards.json`)

Les cartes sont précalculées par `scripts/build-cards.mjs` :

1. **Wikidata** : personnages historiques morts au plus tard en 2000 (fonction, titre de noblesse,
   grade militaire ou métier « historique ») ; batailles, guerres, révolutions, traités, empires,
   dynasties, civilisations… Seuls les éléments **avec illustration** (P18) et un article sur
   fr.wikipedia sont retenus.
2. **Vues** : total des 12 derniers mois complets (API Wikimedia Pageviews), relevé une seule
   fois, sans mise à jour.
3. On garde les **3 000** articles les plus vus. Le Nº de collection suit le classement
   (Nº 0001 = le plus consulté).
4. Description courte = description Wikidata, ou à défaut la première phrase de l'article.
   Signature = P109, illustration alternative = 2ᵉ image ou images liées.

```bash
npm run cards                 # nécessite un accès à *.wikimedia.org / wikidata.org
npm run cards -- --target 3000
npm run cards:sample          # petit jeu d'exemple hors-ligne
```

La GitHub Action **Build card set** (`.github/workflows/build-cards.yml`) exécute le script et
commite le résultat. On peut la relancer à la main depuis l'onglet *Actions*.

## Règles

### Raretés (plus consulté = plus rare, en percentiles)

| Rareté (sigle) | Part du corpus | ≈ sur 3 000 |
|-------------|---------------:|------------:|
| Commune (C) | 58 %   | 1 740 |
| Peu commune (UC) | 25 %   | 750 |
| Rare (R) | 11 %   | 330 |
| Ultra Rare (UR) | 4,5 %  | 135 |
| Légendaire (L) | 1,2 %  | 36 |
| Mythique (M) | 0,3 %  | 9 |

### Paquet de 7 cartes

| Emplacement | Tirage |
|---|---|
| 1 à 5 | Commune 94 % · Peu commune 6 % |
| 6 | Peu commune 84 % · Rare 12 % · Ultra Rare 3,2 % · Légendaire 0,8 % |
| 7 (rare garantie) | Rare 78 % · Ultra Rare 17 % · Légendaire 4 % · Mythique 1 % |
| **God pack** (1 / 1 500) | 7 cartes Rare+ : Rare 55 % · Ultra Rare 30 % · Légendaire 12 % · Mythique 3 % |

### Finitions (selon la rareté)

Chaque carte reçoit une finition, tirée selon sa rareté (poids C / UC / R / UR / L / M) :

| Finition | Aspect | Disponible |
|---|---|---|
| Mat | sans reflet | C → R |
| Reverse Holo | le fond de la carte brille, l’illustration reste mate | C → R |
| Holo | film arc-en-ciel sur l’illustration | R → M |
| Cosmos · Verre brisé · Cold Foil | foils thématiques : étoiles, éclats, ondes | R → M |
| Gravé | micro-relief granuleux et doré | UR → M |
| Gold · Rainbow · Ghost · Starlight | finitions extrêmes | UR → M (pas de Gold horizontale) |

Les poids exacts sont dans `src/game/variants.ts` ; l’onglet *Effets* (mode test) affiche les chances.

**Full Art** (1 / 60, dès UC) se combine avec n’importe quelle finition.

### Variantes spéciales (au plus une par carte)

| Variante | Chance |
|---|---|
| Signée (si la page a une signature ; toujours numérotée) | 1 / 300 |
| Silhouette dorée (portraits détourés) | 1 / 500 |
| Alternate Art | 1 / 250 |
| Black Label (carte noire brillante) | 1 / 400 |

### Numérotées (cumulables avec une variante)

| Tirage | Chance par carte |
|---|---|
| /100 | 1 / 5 000 |
| /50 | 1 / 10 000 |
| /10 | 1 / 40 000 |
| 1 / 1 | 1 / 200 000 |

Pour le prototype, les numéros sont **simulés** : sans serveur, l'unicité mondiale n'est pas
garantie.

### Doublons

Une carte n'est un doublon que si **la même carte avec la même variante** (et le même numéro) est
déjà dans le cahier. Une autre variante compte comme une nouvelle entrée.

## Structure

```
src/game/        règles : raretés, variantes, tirage des paquets, sauvegarde
src/components/  Card (effets holo/3D), PackVisual (déchirure), PackOpening, Binder, Showcase
src/styles/      card.css (cadres & effets), opening.css (mise en scène), app.css
scripts/         build-cards.mjs (précalcul), sample-cards.mjs (jeu d'exemple)
```
