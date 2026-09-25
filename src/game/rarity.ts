import type { Rarity } from './types';

export interface RarityInfo {
  id: Rarity;
  key: string;
  label: string;
  /** Initials shown on the card. */
  short: string;
  /**
   * Share of the corpus in this tier (by page-view percentile, most viewed = rarest). Sized with
   * the slot odds so that one specific card gets harder to find at every step up.
   */
  share: number;
}

export const RARITIES: RarityInfo[] = [
  { id: 0, key: 'common', label: 'Commune', short: 'C', share: 0.4 },
  { id: 1, key: 'uncommon', label: 'Peu commune', short: 'UC', share: 0.25 },
  { id: 2, key: 'rare', label: 'Rare', short: 'R', share: 0.22 },
  { id: 3, key: 'ultra', label: 'Ultra Rare', short: 'UR', share: 0.09 },
  { id: 4, key: 'legendary', label: 'Légendaire', short: 'L', share: 0.03 },
  { id: 5, key: 'mythic', label: 'Mythique', short: 'M', share: 0.01 },
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
    [1, 0.86],
    [2, 0.115],
    [3, 0.02],
    [4, 0.0045],
    [5, 0.0005],
  ],
  // Slot 7, rare guaranteed
  rare: [
    [2, 0.84],
    [3, 0.13],
    [4, 0.025],
    [5, 0.005],
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
