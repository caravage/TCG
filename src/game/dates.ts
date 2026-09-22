import type { CardData } from './types';

const fmtYear = (y: number) => (y < 0 ? `${-y} av. J.-C.` : String(y));

/** "1769 – 1821", "1815", "69 – 30 av. J.-C." or null when unknown. */
export function formatDates(c: CardData): string | null {
  if (c.y1 == null) return c.y2 != null ? fmtYear(c.y2) : null;
  if (c.y2 == null) return fmtYear(c.y1);
  if (c.y1 < 0 && c.y2 < 0) return `${-c.y1} – ${-c.y2} av. J.-C.`;
  return `${fmtYear(c.y1)} – ${fmtYear(c.y2)}`;
}

/** Timeline ticks, evenly spaced: the scale stretches recent centuries where most cards live. */
export const TIMELINE_TICKS = [-1000, 0, 1000, 1500, 1800, 2000];

/** Position of a year on the card timeline, 0 → 1. */
export function timelinePos(y: number): number {
  const t = TIMELINE_TICKS;
  if (y <= t[0]) return 0;
  if (y >= t[t.length - 1]) return 1;
  for (let i = 0; i < t.length - 1; i++) {
    if (y <= t[i + 1]) return (i + (y - t[i]) / (t[i + 1] - t[i])) / (t.length - 1);
  }
  return 1;
}
