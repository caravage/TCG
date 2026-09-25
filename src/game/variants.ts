import type { CardData, Finish, Look, Rarity, Serial, Special } from './types';

/**
 * A card's look has three independent parts:
 *  - a finish (foil), whose odds depend on the card's rarity;
 *  - Full Art, which combines with any finish (Peu commune and above);
 *  - at most one special treatment (Black Label, Alternate Art, Silhouette dorée, Signée).
 * Numbered prints are rolled separately; signed cards are always numbered.
 */

export interface FinishInfo {
  id: Finish;
  label: string;
  blurb: string;
  /** Suspense / particle level (0-3). */
  hit: number;
  /** Weight per rarity, C → M (0 = not available at that rarity). Themed foils share one row. */
  weights: [number, number, number, number, number, number];
}

/** The three themed foils are one tier of the pyramid with three looks, picked at random. */
export const THEMED_FOILS: Finish[] = ['cosmos', 'shattered', 'cold'];
const THEMED_WEIGHTS: FinishInfo['weights'] = [0, 0, 5, 27, 30, 30];

export const FINISHES: FinishInfo[] = [
  { id: 'normal', label: 'Mat', blurb: 'Finition mate, sans reflet.', hit: 0, weights: [96.5, 96.5, 82.5, 0, 0, 0] },
  { id: 'reverse', label: 'Reverse Holo', blurb: 'Le fond de la carte brille, l’illustration reste mate.', hit: 0, weights: [3.5, 3.5, 3.5, 0, 0, 0] },
  { id: 'holo', label: 'Holo', blurb: 'L’illustration est couverte d’un film arc-en-ciel.', hit: 0, weights: [0, 0, 9, 58, 50, 44] },
  { id: 'cosmos', label: 'Cosmos', blurb: 'Foil étoilé : une nuée d’étoiles dans le reflet.', hit: 1, weights: THEMED_WEIGHTS },
  { id: 'shattered', label: 'Verre brisé', blurb: 'Foil à éclats de verre qui accrochent la lumière.', hit: 1, weights: THEMED_WEIGHTS },
  { id: 'cold', label: 'Cold Foil', blurb: 'Foil argenté à ondes concentriques.', hit: 1, weights: THEMED_WEIGHTS },
  { id: 'etched', label: 'Gravé', blurb: 'Micro-relief granuleux et doré qui capte la lumière.', hit: 1, weights: [0, 0, 0, 12, 14, 16] },
  { id: 'gold', label: 'Gold', blurb: 'Entièrement dorée.', hit: 3, weights: [0, 0, 0, 1.2, 2, 3] },
  { id: 'rainbow', label: 'Rainbow', blurb: 'Reflets iridescents multicolores intenses.', hit: 3, weights: [0, 0, 0, 0.9, 1.6, 2.6] },
  { id: 'ghost', label: 'Ghost', blurb: 'Visuel argenté, presque invisible.', hit: 3, weights: [0, 0, 0, 0.6, 1.4, 2.4] },
  { id: 'starlight', label: 'Starlight', blurb: 'Paillettes 3D scintillantes.', hit: 3, weights: [0, 0, 0, 0.3, 1, 2] },
];

export const FINISH_BY_ID = Object.fromEntries(FINISHES.map((f) => [f.id, f])) as Record<Finish, FinishInfo>;

export interface SpecialInfo {
  id: Special;
  label: string;
  blurb: string;
  chance: number;
  hit: number;
}

/** Rolled rarest first; the first hit wins. All specials are for Rare and above. */
export const SPECIALS: SpecialInfo[] = [
  { id: 'signed', label: 'Signée', blurb: 'Porte la signature du personnage. Toujours numérotée.', chance: 1 / 3000, hit: 2 },
  { id: 'goldsil', label: 'Silhouette dorée', blurb: 'Le personnage est frappé à la feuille d’or.', chance: 1 / 2000, hit: 2 },
  { id: 'altart', label: 'Alternate Art', blurb: 'Illustration alternative, cadre orné.', chance: 1 / 1500, hit: 2 },
  { id: 'blacklabel', label: 'Black Label', blurb: 'Carte noire brillante.', chance: 1 / 1000, hit: 2 },
];
export const SPECIAL_BY_ID = Object.fromEntries(SPECIALS.map((s) => [s.id, s])) as Record<Special, SpecialInfo>;

export const SPECIAL_MIN_RARITY = 2;
export const FULL_ART = { label: 'Full Art', blurb: 'L’illustration couvre toute la carte.', chance: 1 / 60, minRarity: 1, hit: 1 };

/** Finishes as rolled: the themed foils count once. */
const ROLLED = FINISHES.filter((f) => !THEMED_FOILS.includes(f.id) || f.id === THEMED_FOILS[0]);
const rowTotal = (r: Rarity) => ROLLED.reduce((s, f) => s + f.weights[r], 0);

/** Chance for a card of rarity `r` to get finish `f`. */
export function finishChance(f: Finish, r: Rarity): number {
  const w = FINISH_BY_ID[f].weights[r];
  return (THEMED_FOILS.includes(f) ? w / THEMED_FOILS.length : w) / rowTotal(r);
}

function rollFinish(card: CardData, rnd: () => number): Finish {
  let x = rnd() * rowTotal(card.r);
  for (const f of ROLLED) {
    if (x < f.weights[card.r]) {
      return THEMED_FOILS.includes(f.id) ? THEMED_FOILS[Math.floor(rnd() * THEMED_FOILS.length)] : f.id;
    }
    x -= f.weights[card.r];
  }
  return ROLLED.find((f) => f.weights[card.r] > 0)!.id;
}

function specialAllowed(s: Special, card: CardData): boolean {
  if (card.r < SPECIAL_MIN_RARITY) return false;
  if (s === 'signed') return !!card.sig;
  if (s === 'goldsil') return !!card.m;
  return true;
}

/** Combinations whose effects would cancel out are resolved to a sensible finish. */
function reconcile(look: Look): Look {
  const f = look.finish;
  // Reverse lights up the card background, which a Full Art covers entirely.
  if (look.full && f === 'reverse') look.finish = 'normal';
  // Black Label paints the card black: it cannot also be gold, silver or rainbow paper.
  if (look.special === 'blacklabel' && (f === 'gold' || f === 'ghost' || f === 'rainbow')) look.finish = 'holo';
  // A gold silhouette would vanish on a gold card.
  if (look.special === 'goldsil' && f === 'gold') look.finish = 'holo';
  return look;
}

export function rollLook(card: CardData, rnd: () => number): Look {
  const finish = rollFinish(card, rnd);
  const full = card.r >= FULL_ART.minRarity && rnd() < FULL_ART.chance;
  let special: Special | undefined;
  for (const s of SPECIALS) {
    if (specialAllowed(s.id, card) && rnd() < s.chance) {
      special = s.id;
      break;
    }
  }
  return reconcile({ finish, ...(full ? { full } : {}), ...(special ? { special } : {}) });
}

export function lookHit(look: Look): number {
  return Math.max(
    FINISH_BY_ID[look.finish].hit,
    look.full ? FULL_ART.hit : 0,
    look.special ? SPECIAL_BY_ID[look.special].hit : 0,
  );
}

/** "Holo · Full Art · Signée", or "Mat". */
export function lookLabel(look: Look): string {
  const parts = [FINISH_BY_ID[look.finish].label];
  if (look.full) parts.push(FULL_ART.label);
  if (look.special) parts.push(SPECIAL_BY_ID[look.special].label);
  return parts.join(' · ');
}

/** Numbered prints, independent from the look. Numbers are simulated (no server yet). */
export const SERIALS: { of: number; chance: number; hit: number }[] = [
  { of: 1, chance: 1 / 200_000, hit: 4 },
  { of: 10, chance: 1 / 40_000, hit: 3 },
  { of: 50, chance: 1 / 10_000, hit: 2 },
  { of: 100, chance: 1 / 5_000, hit: 2 },
];

export function rollSerial(rnd: () => number): Serial | undefined {
  let x = rnd();
  for (const s of SERIALS) {
    if (x < s.chance) return { of: s.of, num: 1 + Math.floor(rnd() * s.of) };
    x -= s.chance;
  }
  return undefined;
}

/** Signed cards are always numbered: 1/1 1 %, /10 9 %, /50 30 %, /100 60 %. */
export function rollSignedSerial(rnd: () => number): Serial {
  const x = rnd();
  const of = x < 0.01 ? 1 : x < 0.1 ? 10 : x < 0.4 ? 50 : 100;
  return { of, num: 1 + Math.floor(rnd() * of) };
}

export function serialHit(serial?: Serial): number {
  return serial ? SERIALS.find((s) => s.of === serial.of)?.hit ?? 2 : 0;
}

/** Collection sort order of looks (plainest first). */
export function lookRank(look: Look): number {
  return (
    FINISHES.findIndex((f) => f.id === look.finish) +
    (look.full ? 20 : 0) +
    (look.special ? 40 + SPECIALS.findIndex((s) => s.id === look.special) : 0)
  );
}
