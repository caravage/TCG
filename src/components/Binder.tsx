import { useMemo, useState, type CSSProperties } from 'react';
import { RARITIES } from '../game/rarity';
import { VARIANT_BY_ID, VARIANT_ORDER } from '../game/variants';
import type { Entry, SaveData } from '../game/storage';
import type { CardData, Rarity } from '../game/types';
import { Card, Pips } from './Card';

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
    const specials = entries.filter((e) => e.variant !== 'normal' || e.serial).length;
    const copies = entries.reduce((s, e) => s + e.count, 0);
    return { perRarity, specials, copies };
  }, [cards, entries, ownedIds]);

  const q = query.trim().toLowerCase();
  const matchCard = (c: CardData) =>
    (rarity === 'all' || c.r === rarity) && (!q || c.t.toLowerCase().includes(q) || c.d.toLowerCase().includes(q));

  const visibleEntries = useMemo(() => {
    const list = entries.filter((e) => {
      const c = byId.get(e.id)!;
      return matchCard(c) && (!specialOnly || e.variant !== 'normal' || e.serial);
    });
    const variantRank = (e: Entry) => VARIANT_ORDER.indexOf(e.variant) + (e.serial ? 20 - Math.log10(e.serial.of) : 0);
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
              <Pips rarity={r.id} /> {r.label}
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
            <div key={`${e.id}|${e.variant}|${e.serial?.num ?? ''}`} className="grid__item" onClick={() => setSelected({ card: c, entry: e })}>
              <Card card={c} variant={e.variant} serial={e.serial} width={188} />
              {e.count > 1 && <span className="badge-count">×{e.count}</span>}
            </div>
          );
        })}
        {missing.map((c) => (
          <div key={c.id} className={`grid__item grid__missing r-${RARITIES[c.r].key}`}>
            <div className="missing">
              <span className="missing__no">Nº {String(c.n).padStart(4, '0')}</span>
              <Pips rarity={c.r} />
              <span className="missing__q">?</span>
            </div>
          </div>
        ))}
      </div>

      {selected && <CardModal {...selected} onClose={() => setSelected(null)} />}
    </section>
  );
}

function CardModal({ card, entry, onClose }: Selected & { onClose: () => void }) {
  const variant = entry?.variant ?? 'normal';
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal__body" onClick={(e) => e.stopPropagation()}>
        <Card card={card} variant={variant} serial={entry?.serial} width={380} />
        <div className="modal__info">
          <div className="modal__no">Nº {String(card.n).padStart(4, '0')}</div>
          <h2>{card.t}</h2>
          <p className="modal__desc">{card.d}</p>
          <dl>
            <dt>Rareté</dt>
            <dd>{RARITIES[card.r].label}</dd>
            <dt>Variante</dt>
            <dd>
              {VARIANT_BY_ID[variant].label}
              {VARIANT_BY_ID[variant].blurb && <small> — {VARIANT_BY_ID[variant].blurb}</small>}
            </dd>
            {entry?.serial && (
              <>
                <dt>Numérotation</dt>
                <dd>
                  {entry.serial.num} / {entry.serial.of}
                </dd>
              </>
            )}
            <dt>Vues sur 12 mois</dt>
            <dd>{card.views.toLocaleString('fr-FR')}</dd>
            {entry && (
              <>
                <dt>Exemplaires</dt>
                <dd>{entry.count}</dd>
                <dt>Obtenue le</dt>
                <dd>{new Date(entry.first).toLocaleString('fr-FR')}</dd>
              </>
            )}
          </dl>
          <a className="btn btn--ghost" href={card.url} target="_blank" rel="noreferrer">
            Lire l’article sur Wikipédia ↗
          </a>
          <button className="btn btn--primary" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
