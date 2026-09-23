import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { lookLabel } from '../game/variants';
import type { Pull } from '../game/types';
import { Card, cardImages } from './Card';
import { CardModal } from './CardModal';
import { burst } from './particles';

interface Props {
  pulls: Pull[];
  packs: number;
  godPacks: number;
  particleColors: (p: Pull) => string[];
  canOpenMore: boolean;
  onAgain: () => void;
  onGoBinder: () => void;
}

type State = 'down' | 'charging' | 'up';

/** Many packs at once: the ordinary cards are laid out face up, the hits wait face down. */
export function BulkOpening({ pulls, packs, godPacks, particleColors, canOpenMore, onAgain, onGoBinder }: Props) {
  // Best hits last so the grid builds up to them.
  const hits = useMemo(
    () => pulls.filter((p) => p.hit >= 1).sort((a, b) => a.hit - b.hit || a.card.r - b.card.r),
    [pulls],
  );
  const rest = useMemo(
    () => pulls.filter((p) => p.hit < 1).sort((a, b) => b.card.r - a.card.r || Number(!!b.isNew) - Number(!!a.isNew)),
    [pulls],
  );
  const [state, setState] = useState<Record<string, State>>({});
  const [sheet, setSheet] = useState<Pull | null>(null);
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  const auto = useRef<number[]>([]);

  useEffect(() => {
    for (const p of hits) for (const src of cardImages(p.card, p)) new Image().src = src;
    return () => auto.current.forEach(clearTimeout);
  }, [hits]);

  const reveal = (p: Pull) => {
    if ((state[p.uid] ?? 'down') !== 'down') return;
    setState((s) => ({ ...s, [p.uid]: 'charging' }));
    const t = window.setTimeout(() => {
      setState((s) => ({ ...s, [p.uid]: 'up' }));
      const r = refs.current[p.uid]?.getBoundingClientRect();
      if (r) setTimeout(() => burst(r.left + r.width / 2, r.top + r.height / 2, Math.min(p.hit, 3), particleColors(p)), 150);
    }, 450 + p.hit * 300);
    auto.current.push(t);
  };

  const revealAll = () => {
    hits
      .filter((p) => (state[p.uid] ?? 'down') === 'down')
      .forEach((p, i) => auto.current.push(window.setTimeout(() => reveal(p), i * 650)));
  };

  const left = hits.filter((p) => (state[p.uid] ?? 'down') !== 'up').length;
  const fresh = pulls.filter((p) => p.isNew).length;

  return (
    <div className="bulk">
      <div className="bulk__head">
        <h2 className="summary__title">
          {packs} paquets ouverts{godPacks ? ` · ${godPacks} God Pack${godPacks > 1 ? 's' : ''} !` : ''}
        </h2>
        <p className="bulk__sub">
          {pulls.length} cartes · {fresh} nouvelles · {hits.length} hit{hits.length > 1 ? 's' : ''}
          {left ? ` dont ${left} encore cachée${left > 1 ? 's' : ''}` : ''}
        </p>
      </div>

      {hits.length > 0 && (
        <section className="bulk__section">
          <div className="bulk__bar">
            <h3>Les hits</h3>
            {left > 0 && (
              <button className="btn btn--primary" onClick={revealAll}>
                Tout révéler
              </button>
            )}
          </div>
          <p className="bulk__help">{left ? 'Clique sur une carte pour la retourner.' : 'Clique sur une carte pour voir sa fiche.'}</p>
          <div className="bulk__hits">
            {hits.map((p, i) => {
              const st = state[p.uid] ?? 'down';
              return (
                <div
                  key={p.uid}
                  ref={(el) => {
                    refs.current[p.uid] = el;
                  }}
                  className={`bulk__hit ${st === 'charging' ? `is-charging charge-${p.hit}` : ''}`}
                  style={{ '--d': `${i * 40}ms` } as CSSProperties}
                  onClick={() => (st === 'up' ? setSheet(p) : reveal(p))}
                >
                  <Card
                    card={p.card}
                    look={p}
                    serial={p.serial}
                    faceDown={st !== 'up'}
                    hint={st === 'up' ? 0 : p.hit}
                    interactive={st === 'up'}
                    width={170}
                  />
                  {st === 'up' && <span className="bulk__label">{lookLabel(p)}</span>}
                  {st === 'up' && p.isNew && <span className="badge-new">Nouveau</span>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="bulk__section">
        <div className="bulk__bar">
          <h3>Le reste ({rest.length})</h3>
        </div>
        <div className="bulk__rest">
          {rest.map((p) => (
            <div key={p.uid} className="bulk__card" onClick={() => setSheet(p)}>
              <Card card={p.card} look={p} serial={p.serial} width={112} />
              {p.isNew && <span className="badge-new">Nouveau</span>}
            </div>
          ))}
        </div>
      </section>

      <div className="summary__actions">
        <button className="btn btn--primary" disabled={!canOpenMore} onClick={onAgain}>
          {canOpenMore ? 'Continuer' : 'Plus de paquet en réserve'}
        </button>
        <button className="btn btn--ghost" onClick={onGoBinder}>
          Voir le cahier
        </button>
      </div>

      {sheet && <CardModal card={sheet.card} look={sheet} serial={sheet.serial} onClose={() => setSheet(null)} />}
    </div>
  );
}
