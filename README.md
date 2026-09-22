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

| Rareté      | Part du corpus | ≈ sur 3 000 |
|-------------|---------------:|------------:|
| Commune     | 58 %   | 1 740 |
| Peu commune | 25 %   | 750 |
| Rare        | 11 %   | 330 |
| Épique      | 4,5 %  | 135 |
| Légendaire  | 1,2 %  | 36 |
| Mythique    | 0,3 %  | 9 |

### Paquet de 7 cartes

| Emplacement | Tirage |
|---|---|
| 1 à 5 | Commune 94 % · Peu commune 6 % |
| 6 | Peu commune 84 % · Rare 12 % · Épique 3,2 % · Légendaire 0,8 % |
| 7 (rare garantie) | Rare 78 % · Épique 17 % · Légendaire 4 % · Mythique 1 % |
| **God pack** (1 / 1 500) | 7 cartes Rare+ : Rare 55 % · Épique 30 % · Légendaire 12 % · Mythique 3 % |

### Variantes (par carte, indépendantes de la rareté)

| Variante | Chance |
|---|---|
| Reverse Holo | 8 % |
| Holo | 4 % |
| Noir & Blanc | 1,5 % |
| Couleurs inversées | 1 % |
| Foil gravé | 0,8 % |
| Full Art | 1 / 250 |
| Alternate Art | 1 / 500 (si l'article a une 2ᵉ image) |
| Signée | 1 / 300 (seulement si la page a une signature) |
| Gold | 1 / 1 250 |
| Rainbow | 1 / 5 000 |

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
