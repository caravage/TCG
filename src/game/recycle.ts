import type { Look, Rarity, Serial } from './types';

/** Parchemins earned by recycling one copy, before multipliers. C → M. */
export const BASE_VALUE: Record<Rarity, number> = { 0: 1, 1: 3, 2: 10, 3: 40, 4: 150, 5: 600 };

const FINISH_MULT: Record<Look['finish'], number> = {
  normal: 1,
  reverse: 1.5,
  holo: 2,
  cosmos: 3,
  shattered: 3,
  cold: 3,
  etched: 4,
  gold: 15,
  rainbow: 15,
  starlight: 15,
};
const SPECIAL_MULT = { blacklabel: 10, altart: 10, goldsil: 10, signed: 20 } as const;
const SERIAL_MULT: Record<number, number> = { 100: 10, 50: 20, 10: 50, 1: 200 };

/**
 * Price of one pack. A pack is worth ~70 on average when fully recycled (driven by its rare
 * hits), ~20 without a hit: recycling can never pay for more packs than it consumed.
 */
export const PACK_PRICE = 100;

/** Parchemins given once to every player, so the shop is reachable from the start. */
export const WELCOME_PARCHMENTS = 200;

export function recycleValue(r: Rarity, look: Look, serial?: Serial): number {
  let v = BASE_VALUE[r] * FINISH_MULT[look.finish];
  if (look.full) v *= 3;
  if (look.special) v *= SPECIAL_MULT[look.special];
  // Signed cards are always numbered: the number only adds value when it is the 1 of 1.
  if (look.special === 'signed') {
    if (serial?.of === 1) v *= 5;
  } else if (serial) v *= SERIAL_MULT[serial.of] ?? 10;
  return Math.max(1, Math.round(v));
}
