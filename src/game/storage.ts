import type { Pull, Serial, VariantId } from './types';

export const PACK_INTERVAL_MS = 15 * 60 * 1000;
const KEY = 'historia.save.v1';

export interface Entry {
  id: string;
  variant: VariantId;
  serial?: Serial;
  count: number;
  first: number;
  last: number;
}

export interface SaveData {
  stock: number;
  /** Timestamp from which the next pack is being earned. */
  lastAccrual: number;
  opened: number;
  collection: Record<string, Entry>;
}

/** Same card + same variant + same serial = duplicate. Anything else is a new entry. */
export function entryKey(id: string, variant: VariantId, serial?: Serial): string {
  return serial ? `${id}|${variant}|${serial.num}/${serial.of}` : `${id}|${variant}`;
}

export function freshSave(now = Date.now()): SaveData {
  return { stock: 1, lastAccrual: now, opened: 0, collection: {} };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as SaveData;
      if (typeof s.stock === 'number' && s.collection) return s;
    }
  } catch {
    /* storage unavailable or corrupted */
  }
  return freshSave();
}

export function writeSave(s: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

/** Packs accumulate without cap: one every 15 minutes. */
export function accrue(s: SaveData, now = Date.now()): SaveData {
  const earned = Math.floor((now - s.lastAccrual) / PACK_INTERVAL_MS);
  if (earned <= 0) return s;
  return { ...s, stock: s.stock + earned, lastAccrual: s.lastAccrual + earned * PACK_INTERVAL_MS };
}

export function msUntilNext(s: SaveData, now = Date.now()): number {
  return Math.max(0, s.lastAccrual + PACK_INTERVAL_MS - now);
}

/** Adds pulls to the collection and flags the ones never seen before. */
export function addPulls(s: SaveData, pulls: Pull[], now = Date.now()): { save: SaveData; pulls: Pull[] } {
  const collection = { ...s.collection };
  const marked = pulls.map((p) => {
    const key = entryKey(p.card.id, p.variant, p.serial);
    const prev = collection[key];
    collection[key] = prev
      ? { ...prev, count: prev.count + 1, last: now }
      : { id: p.card.id, variant: p.variant, serial: p.serial, count: 1, first: now, last: now };
    return { ...p, isNew: !prev };
  });
  return { save: { ...s, collection, opened: s.opened + 1 }, pulls: marked };
}

export function markNewAgainst(s: SaveData, pulls: Pull[]): Pull[] {
  return pulls.map((p) => ({ ...p, isNew: !s.collection[entryKey(p.card.id, p.variant, p.serial)] }));
}
