export type Rarity = 0 | 1 | 2 | 3 | 4 | 5;

/** A card as produced by scripts/build-cards.mjs (public/cards.json). */
export interface CardData {
  /** Wikidata id, e.g. "Q517". */
  id: string;
  /** Collector number (1 = most viewed). */
  n: number;
  /** Display name. */
  t: string;
  /** Short description. */
  d: string;
  /** Main illustration URL. */
  img: string;
  /** Alternate illustration URL (enables Alternate Art). */
  alt?: string;
  /** Signature image URL (enables Signed). */
  sig?: string;
  /** Popularity: median of yearly page views since 2016 (drives rarity). */
  views: number;
  /** Page views over the last 12 months. */
  v12?: number;
  r: Rarity;
  /** Wikipedia article URL. */
  url: string;
  /** 'p' = person (portrait card), 'e' = event or polity (landscape card). */
  k?: 'p' | 'e';
  /** Birth / start year (negative = BC). */
  y1?: number;
  /** Death / end year. */
  y2?: number;
  /** 1 when public/masks/<id>.png (subject cut-out) exists. */
  m?: 1;
  /** Focal point of the subject (object-position %, from the mask). */
  fx?: number;
  fy?: number;
}

export interface CardSet {
  version: number;
  generatedAt: string;
  sample?: boolean;
  period?: string;
  cards: CardData[];
}

export type Finish =
  | 'normal'
  | 'reverse'
  | 'holo'
  | 'cosmos'
  | 'shattered'
  | 'cold'
  | 'etched'
  | 'gold'
  | 'rainbow'
  | 'ghost'
  | 'starlight';

export type Special = 'blacklabel' | 'altart' | 'goldsil' | 'signed';

/** How a printed card looks: finish + optional Full Art + optional special treatment. */
export interface Look {
  finish: Finish;
  full?: boolean;
  special?: Special;
}

export interface Serial {
  num: number;
  of: number;
}

export interface Pull extends Look {
  uid: string;
  card: CardData;
  serial?: Serial;
  /** 0 = nothing special, 4 = 1 of 1. Drives suspense and particles. */
  hit: number;
  isNew?: boolean;
}

export interface Pack {
  god: boolean;
  pulls: Pull[];
}
