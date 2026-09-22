import type { Rarity } from './types';

export interface RarityInfo {
  id: Rarity;
  key: string;
  label: string;
  /** Initials shown on the card. */
  short: string;
  /** Share of the corpus in this tier (by page-view percentile, most viewed = rarest). */
  share: number;
}

export const RARITIES: RarityInfo[] = [
  { id: 0, key: 'common', label: 'Commune', short: 'C', share: 0.58 },
  { id: 1, key: 'uncommon', label: 'Peu commune', short: 'UC', share: 0.25 },
  { id: 2, key: 'rare', label: 'Rare', short: 'R', share: 0.11 },
  { id: 3, key: 'epic', label: 'Ultra Rare', short: 'UR', share: 0.045 },
  { id: 4, key: 'legendary', label: 'Légendaire', short: 'L', share: 0.012 },
  { id: 5, key: 'mythic', label: 'Mythique', short: 'M', share: 0.003 },
];

type Odds = [Rarity, number][];

/** Rarity odds for each slot type of a 7-card pack. */
export const SLOT_ODDS: Record<'common' | 'uncommon' | 'rare' | 'god', Odds> = {
  // Slots 1-5
  common: [
    [0, 0.94],
    [1, 0.06],
  ],
  // Slot 6
  uncommon: [
    [1, 0.84],
    [2, 0.12],
    [3, 0.032],
    [4, 0.008],
  ],
  // Slot 7, rare guaranteed
  rare: [
    [2, 0.78],
    [3, 0.17],
    [4, 0.04],
    [5, 0.01],
  ],
  // Every slot of a god pack
  god: [
    [2, 0.55],
    [3, 0.3],
    [4, 0.12],
    [5, 0.03],
  ],
};

export const GOD_PACK_CHANCE = 1 / 1500;

export function rollOdds(odds: Odds, rnd: () => number): Rarity {
  let x = rnd();
  for (const [r, p] of odds) {
    if (x < p) return r;
    x -= p;
  }
  return odds[odds.length - 1][0];
}
