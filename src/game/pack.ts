import { GOD_PACK_CHANCE, SLOT_ODDS, rollOdds } from './rarity';
import { VARIANT_BY_ID, rollSerial, rollSignedSerial, rollVariant, serialHit } from './variants';
import type { CardData, Pack, Pull, Rarity } from './types';

export type Pools = CardData[][];

export function buildPools(cards: CardData[]): Pools {
  const pools: Pools = [[], [], [], [], [], []];
  for (const c of cards) pools[c.r].push(c);
  return pools;
}

function pickFrom(pools: Pools, r: Rarity, exclude: Set<string>, rnd: () => number): CardData {
  // Fall back to the closest non-empty tier (only matters with tiny sample data).
  const order = [r, r - 1, r + 1, r - 2, r + 2, r - 3, r + 3, r - 4, r + 4, r - 5, r + 5].filter(
    (x) => x >= 0 && x <= 5,
  );
  for (const tier of order) {
    const pool = pools[tier];
    if (!pool.length) continue;
    for (let tries = 0; tries < 8; tries++) {
      const c = pool[Math.floor(rnd() * pool.length)];
      if (!exclude.has(c.id)) return c;
    }
    return pool[Math.floor(rnd() * pool.length)];
  }
  throw new Error('Aucune carte disponible');
}

export function rarityHit(r: Rarity): number {
  return r >= 5 ? 3 : r === 4 ? 2 : r === 3 ? 1 : 0;
}

let uidCounter = 0;

export function makePull(card: CardData, rnd: () => number): Pull {
  const variant = rollVariant(card, rnd);
  const serial = rollSerial(rnd) ?? (variant === 'signed' ? rollSignedSerial(rnd) : undefined);
  const hit = Math.max(rarityHit(card.r), VARIANT_BY_ID[variant].hit, serialHit(serial));
  return { uid: `${Date.now().toString(36)}-${(uidCounter++).toString(36)}`, card, variant, serial, hit };
}

export function openPack(pools: Pools, rnd: () => number = Math.random): Pack {
  const god = rnd() < GOD_PACK_CHANCE;
  const slots = god
    ? Array(7).fill(SLOT_ODDS.god)
    : [...Array(5).fill(SLOT_ODDS.common), SLOT_ODDS.uncommon, SLOT_ODDS.rare];
  const seen = new Set<string>();
  let pulls = slots.map((odds) => {
    const card = pickFrom(pools, rollOdds(odds, rnd), seen, rnd);
    seen.add(card.id);
    return makePull(card, rnd);
  });
  // Build suspense: best cards last.
  const score = (p: Pull) => p.card.r * 10 + p.hit;
  if (god) pulls = pulls.sort((a, b) => score(a) - score(b));
  else pulls = [...pulls.slice(0, 5).sort((a, b) => score(a) - score(b)), ...pulls.slice(5)];
  return { god, pulls };
}
