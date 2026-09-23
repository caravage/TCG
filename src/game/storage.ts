import type { Finish, Look, Pull, Serial } from './types';

export const PACK_INTERVAL_MS = 15 * 60 * 1000;
const KEY = 'historia.save.v1';

export interface Entry extends Look {
  id: string;
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

/** Same card + same look + same serial = duplicate. Anything else is a new entry. */
export function entryKey(id: string, look: Look, serial?: Serial): string {
  const parts = [id, look.finish, look.full ? 'full' : '', look.special ?? ''];
  if (serial) parts.push(`${serial.num}/${serial.of}`);
  return parts.join('|');
}

const FINISH_IDS: Finish[] = ['normal', 'reverse', 'holo', 'cosmos', 'shattered', 'cold', 'etched', 'gold', 'rainbow', 'ghost', 'starlight'];

/** Saves made before looks had three parts stored a single `variant`. */
function migrate(s: SaveData): SaveData {
  const collection: Record<string, Entry> = {};
  for (const raw of Object.values(s.collection) as (Entry & { variant?: string })[]) {
    let look: Look = { finish: raw.finish ?? 'normal', full: raw.full, special: raw.special };
    if (raw.variant) {
      const v = raw.variant;
      look = { finish: FINISH_IDS.includes(v as Finish) ? (v as Finish) : 'normal' };
      if (v === 'fullart') look.full = true;
      if (v === 'altart' || v === 'signed' || v === 'goldsil') look.special = v;
    }
    const { variant: _unused, ...rest } = raw;
    void _unused;
    const e: Entry = { ...rest, finish: look.finish };
    if (look.full) e.full = true;
    else delete e.full;
    if (look.special) e.special = look.special;
    else delete e.special;
    const key = entryKey(e.id, e, e.serial);
    const prev = collection[key];
    collection[key] = prev ? { ...prev, count: prev.count + e.count, first: Math.min(prev.first, e.first) } : e;
  }
  return { ...s, collection };
}

export function freshSave(now = Date.now()): SaveData {
  return { stock: 1, lastAccrual: now, opened: 0, collection: {} };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as SaveData;
      if (typeof s.stock === 'number' && s.collection) return migrate(s);
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
export function addPulls(s: SaveData, pulls: Pull[], packs = 1, now = Date.now()): { save: SaveData; pulls: Pull[] } {
  const collection = { ...s.collection };
  const marked = pulls.map((p) => {
    const key = entryKey(p.card.id, p, p.serial);
    const prev = collection[key];
    const look: Look = { finish: p.finish, ...(p.full ? { full: true } : {}), ...(p.special ? { special: p.special } : {}) };
    collection[key] = prev
      ? { ...prev, count: prev.count + 1, last: now }
      : { id: p.card.id, ...look, serial: p.serial, count: 1, first: now, last: now };
    return { ...p, isNew: !prev };
  });
  return { save: { ...s, collection, opened: s.opened + packs }, pulls: marked };
}

export function markNewAgainst(s: SaveData, pulls: Pull[]): Pull[] {
  const seen = new Set<string>();
  return pulls.map((p) => {
    const key = entryKey(p.card.id, p, p.serial);
    const isNew = !s.collection[key] && !seen.has(key);
    seen.add(key);
    return { ...p, isNew };
  });
}
