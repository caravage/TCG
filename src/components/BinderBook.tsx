import { useEffect, useMemo, useState } from 'react';
import { lookRank } from '../game/variants';
import type { Entry } from '../game/storage';
import type { CardData } from '../game/types';
import { Card, RarityBadge, isLandscape } from './Card';

const PER_PAGE = 9;
const PER_SPREAD = PER_PAGE * 2;
const SLOT_W = 132;

interface Props {
  cards: CardData[];
  entriesById: Map<string, Entry[]>;
  query: string;
  onOpen: (card: CardData, entry: Entry) => void;
}

/** Best version of a card owned: rarest look, numbered prints first. */
function bestEntry(list: Entry[]): Entry {
  return [...list].sort((a, b) => lookRank(b) + (b.serial ? 100 : 0) - (lookRank(a) + (a.serial ? 100 : 0)))[0];
}

/** A real binder: two facing pages of nine pockets, cards in collector-number order. */
export function BinderBook({ cards, entriesById, query, onOpen }: Props) {
  const spreads = Math.max(1, Math.ceil(cards.length / PER_SPREAD));
  const [spread, setSpread] = useState(0);
  const [dir, setDir] = useState<'next' | 'prev'>('next');

  const go = (to: number) => {
    const t = Math.min(spreads - 1, Math.max(0, to));
    if (t === spread) return;
    setDir(t > spread ? 'next' : 'prev');
    setSpread(t);
  };

  // Clamp when the card list shrinks (rarity filter).
  useEffect(() => setSpread((s) => Math.min(s, spreads - 1)), [spreads]);

  // Searching jumps to the page holding the first match.
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) return;
    const i = cards.findIndex((c) => c.t.toLowerCase().includes(q));
    if (i >= 0) go(Math.floor(i / PER_SPREAD));
  }, [query, cards]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === 'ArrowRight') go(spread + 1);
      if (e.key === 'ArrowLeft') go(spread - 1);
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  });

  const nextOwned = useMemo(() => {
    const from = (spread + 1) * PER_SPREAD;
    const i = cards.findIndex((c, k) => k >= from && entriesById.has(c.id));
    return i >= 0 ? Math.floor(i / PER_SPREAD) : -1;
  }, [cards, entriesById, spread]);

  const start = spread * PER_SPREAD;
  const pages = [cards.slice(start, start + PER_PAGE), cards.slice(start + PER_PAGE, start + PER_SPREAD)];
  const q = query.trim().toLowerCase();

  return (
    <div className="book">
      <div className="book__nav">
        <button className="btn btn--ghost" disabled={spread === 0} onClick={() => go(spread - 1)} aria-label="Pages précédentes">
          ‹
        </button>
        <span className="book__label">
          Pages {spread * 2 + 1}–{spread * 2 + 2} sur {spreads * 2}
        </span>
        <button className="btn btn--ghost" disabled={spread >= spreads - 1} onClick={() => go(spread + 1)} aria-label="Pages suivantes">
          ›
        </button>
        <input
          className="book__range"
          type="range"
          min={0}
          max={spreads - 1}
          value={spread}
          onChange={(e) => go(Number(e.target.value))}
          aria-label="Aller à la page"
        />
        <button className="btn btn--ghost" disabled={nextOwned < 0} onClick={() => go(nextOwned)}>
          Prochaine carte obtenue
        </button>
      </div>

      <div key={spread} className={`book__spread turn-${dir}`}>
        {pages.map((page, pi) => (
          <div key={pi} className={`book__page book__page--${pi ? 'right' : 'left'}`}>
            {Array.from({ length: PER_PAGE }, (_, k) => {
              const c = page[k];
              if (!c) return <div key={k} className="pocket pocket--blank" />;
              const list = entriesById.get(c.id);
              const hit = q && c.t.toLowerCase().includes(q);
              if (!list) {
                return (
                  <div key={k} className={`pocket pocket--empty ${hit ? 'is-hit' : ''}`}>
                    <span className="pocket__no">Nº {String(c.n).padStart(4, '0')}</span>
                    <RarityBadge rarity={c.r} />
                    <span className="pocket__q">?</span>
                  </div>
                );
              }
              const e = bestEntry(list);
              return (
                <div key={k} className={`pocket ${hit ? 'is-hit' : ''}`} onClick={() => onOpen(c, e)}>
                  <Card card={c} look={e} serial={e.serial} width={isLandscape(c) ? SLOT_W / 1.4 : SLOT_W} />
                  {list.length > 1 && <span className="pocket__versions">{list.length} versions</span>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
