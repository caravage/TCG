import { useMemo, useState, type CSSProperties } from 'react';
import { RARITIES } from '../game/rarity';
import { lookRank } from '../game/variants';
import type { Entry, SaveData } from '../game/storage';
import type { CardData, Rarity } from '../game/types';
import { Card, RarityBadge } from './Card';
import { CardModal } from './CardModal';

interface Props {
  cards: CardData[];
  byId: Map<string, CardData>;
  save: SaveData;
  testMode: boolean;
}

type Sort = 'number' | 'rarity' | 'recent';

interface Selected {
  card: CardData;
  entry?: Entry;
}

export function Binder({ cards, byId, save, testMode }: Props) {
  const [rarity, setRarity] = useState<Rarity | 'all'>('all');
  const [specialOnly, setSpecialOnly] = useState(false);
  const [showMissing, setShowMissing] = useState(false);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('number');
  const [selected, setSelected] = useState<Selected | null>(null);

  const entries = useMemo(
    () => Object.values(save.collection).filter((e) => byId.has(e.id)),
    [save.collection, byId],
  );
  const ownedIds = useMemo(() => new Set(entries.map((e) => e.id)), [entries]);

  const stats = useMemo(() => {
    const perRarity = RARITIES.map((r) => ({
      ...r,
      total: cards.filter((c) => c.r === r.id).length,
      owned: cards.filter((c) => c.r === r.id && ownedIds.has(c.id)).length,
    }));
    const specials = entries.filter((e) => e.finish !== 'normal' || e.full || e.special || e.serial).length;
    const copies = entries.reduce((s, e) => s + e.count, 0);
    return { perRarity, specials, copies };
  }, [cards, entries, ownedIds]);

  const q = query.trim().toLowerCase();
  const matchCard = (c: CardData) =>
    (rarity === 'all' || c.r === rarity) && (!q || c.t.toLowerCase().includes(q) || c.d.toLowerCase().includes(q));

  const visibleEntries = useMemo(() => {
    const list = entries.filter((e) => {
      const c = byId.get(e.id)!;
      return matchCard(c) && (!specialOnly || e.finish !== 'normal' || e.full || e.special || e.serial);
    });
    const variantRank = (e: Entry) => lookRank(e) + (e.serial ? 100 - Math.log10(e.serial.of) : 0);
    list.sort((a, b) => {
      const ca = byId.get(a.id)!;
      const cb = byId.get(b.id)!;
      if (sort === 'recent') return b.last - a.last;
      if (sort === 'rarity') return cb.r - ca.r || variantRank(b) - variantRank(a) || ca.n - cb.n;
      return ca.n - cb.n || variantRank(a) - variantRank(b);
    });
    return list;
  }, [entries, byId, rarity, specialOnly, q, sort]);

  const missing = useMemo(
    () => (showMissing ? cards.filter((c) => !ownedIds.has(c.id) && matchCard(c)) : []),
    [showMissing, cards, ownedIds, rarity, q],
  );

  const total = cards.length;
  const pct = total ? Math.round((ownedIds.size / total) * 1000) / 10 : 0;

  return (
    <section className="binder">
      <div className="binder__hero">
        <div>
          <h1 className="binder__title">Cahier de collection</h1>
          <p className="binder__sub">
            {ownedIds.size} / {total} cartes découvertes · {stats.copies} exemplaires · {stats.specials} variantes spéciales
            {' · '}
            {save.opened} paquets ouverts
            {testMode && <em> — mode test : les ouvertures ne sont pas ajoutées ici</em>}
          </p>
        </div>
        <div className="progress-ring" style={{ '--pct': pct } as CSSProperties}>
          <span>{pct}%</span>
        </div>
      </div>

      <div className="rarity-bars">
        {stats.perRarity.map((r) => (
          <button
            key={r.id}
            className={`rarity-bar r-${r.key} ${rarity === r.id ? 'is-active' : ''}`}
            onClick={() => setRarity(rarity === r.id ? 'all' : r.id)}
          >
            <span className="rarity-bar__label">
              <RarityBadge rarity={r.id} /> {r.label}
            </span>
            <span className="rarity-bar__count">
              {r.owned}/{r.total}
            </span>
            <span className="rarity-bar__track">
              <span style={{ width: `${r.total ? (r.owned / r.total) * 100 : 0}%` }} />
            </span>
          </button>
        ))}
      </div>

      <div className="filters">
        <input className="search" placeholder="Rechercher un nom…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <option value="number">Tri : numéro</option>
          <option value="rarity">Tri : rareté</option>
          <option value="recent">Tri : récentes</option>
        </select>
        <label className="check">
          <input type="checkbox" checked={specialOnly} onChange={(e) => setSpecialOnly(e.target.checked)} />
          Variantes spéciales
        </label>
        <label className="check">
          <input type="checkbox" checked={showMissing} onChange={(e) => setShowMissing(e.target.checked)} />
          Afficher les manquantes
        </label>
      </div>

      {visibleEntries.length === 0 && missing.length === 0 && (
        <div className="empty">
          {entries.length === 0 ? 'Ton cahier est vide — ouvre ton premier paquet !' : 'Aucune carte ne correspond.'}
        </div>
      )}

      <div className="grid">
        {visibleEntries.map((e) => {
          const c = byId.get(e.id)!;
          return (
            <div key={`${e.id}|${e.finish}|${e.full ?? ''}|${e.special ?? ''}|${e.serial?.num ?? ''}`} className="grid__item" onClick={() => setSelected({ card: c, entry: e })}>
              <Card card={c} look={e} serial={e.serial} width={188} />
              {e.count > 1 && <span className="badge-count">×{e.count}</span>}
            </div>
          );
        })}
        {missing.map((c) => (
          <div key={c.id} className={`grid__item grid__missing r-${RARITIES[c.r].key}`}>
            <div className="missing">
              <span className="missing__no">Nº {String(c.n).padStart(4, '0')}</span>
              <RarityBadge rarity={c.r} />
              <span className="missing__q">?</span>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <CardModal
          card={selected.card}
          look={selected.entry ?? { finish: 'normal' }}
          serial={selected.entry?.serial}
          entry={selected.entry}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}
