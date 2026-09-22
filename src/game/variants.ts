import type { CardData, Serial, VariantId } from './types';

export interface VariantInfo {
  id: VariantId;
  label: string;
  /** Chance per card. Signed is rolled separately, only on cards with a signature. */
  chance: number;
  /** Suspense / particle level (0-3). */
  hit: number;
  blurb: string;
}

export const SIGNED_CHANCE = 1 / 300;

export const VARIANTS: VariantInfo[] = [
  { id: 'reverse', label: 'Reverse Holo', chance: 0.08, hit: 0, blurb: 'Le cadre scintille, pas l’illustration.' },
  { id: 'holo', label: 'Holo', chance: 0.04, hit: 0, blurb: 'L’illustration est holographique.' },
  { id: 'bw', label: 'Noir & Blanc', chance: 0.015, hit: 1, blurb: 'Tirage argentique monochrome.' },
  { id: 'neon', label: 'Néon', chance: 0.01, hit: 1, blurb: 'Contours lumineux façon enseigne au néon.' },
  { id: 'etched', label: 'Foil gravé', chance: 0.008, hit: 1, blurb: 'Texture métallique gravée en relief.' },
  { id: 'fullart', label: 'Full Art', chance: 1 / 250, hit: 2, blurb: 'L’illustration couvre toute la carte.' },
  { id: 'altart', label: 'Alternate Art', chance: 1 / 500, hit: 2, blurb: 'Illustration alternative, cadre orné.' },
  { id: 'gold', label: 'Gold', chance: 1 / 1250, hit: 3, blurb: 'Entièrement dorée.' },
  { id: 'rainbow', label: 'Rainbow', chance: 1 / 5000, hit: 3, blurb: 'Prisme arc-en-ciel galactique.' },
];

export const VARIANT_BY_ID: Record<VariantId, VariantInfo> = {
  normal: { id: 'normal', label: 'Normale', chance: 0, hit: 0, blurb: '' },
  signed: { id: 'signed', label: 'Signée', chance: SIGNED_CHANCE, hit: 2, blurb: 'Porte la signature du personnage.' },
  ...Object.fromEntries(VARIANTS.map((v) => [v.id, v])),
} as Record<VariantId, VariantInfo>;

/** Display order (rarest last). */
export const VARIANT_ORDER: VariantId[] = [
  'normal', 'reverse', 'holo', 'bw', 'neon', 'etched', 'fullart', 'altart', 'signed', 'gold', 'rainbow',
];

export function rollVariant(card: CardData, rnd: () => number): VariantId {
  if (card.sig && rnd() < SIGNED_CHANCE) return 'signed';
  let x = rnd();
  for (const v of VARIANTS) {
    if (x < v.chance) return v.id;
    x -= v.chance;
  }
  return 'normal';
}

/** Numbered prints, independent from the variant. Numbers are simulated (no server yet). */
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

export function serialHit(serial?: Serial): number {
  return serial ? SERIALS.find((s) => s.of === serial.of)?.hit ?? 2 : 0;
}
