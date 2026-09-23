import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { openPack, type Pools } from '../game/pack';
import { RARITIES } from '../game/rarity';
import { FINISH_BY_ID, FULL_ART, SPECIAL_BY_ID } from '../game/variants';
import type { Pack, Pull } from '../game/types';
import { Card, cardImages, isLandscape } from './Card';
import { BulkOpening } from './BulkOpening';
import { CardModal } from './CardModal';
import { PackVisual } from './PackVisual';
import { PALETTES, burst } from './particles';

interface Props {
  pools: Pools;
  canOpen: boolean;
  testMode: boolean;
  stock: number;
  onCommit: (pulls: Pull[], packs?: number) => Pull[];
  onGoBinder: () => void;
}

type Phase = 'idle' | 'burst' | 'reveal' | 'summary' | 'bulk';

/** Packs opened at once by « Tout ouvrir » (keeps the page light). */
const BULK_MAX = 50;
const TEST_BULK = 10;

const RARITY_GLOW = ['#d9d5cb', '#2e9e6b', '#2f6fd6', '#8a4be0', '#e8741a', '#d6243a'];

export function particleColors(p: Pull): string[] {
  if (p.finish === 'gold' || p.special === 'goldsil' || p.serial?.of === 1) return PALETTES.gold;
  if (p.finish === 'rainbow' || p.finish === 'starlight') return ['#ff6b6b', '#ffd36b', '#7dff9b', '#6be4ff', '#8a7dff', '#ff7de9'];
  return PALETTES[RARITIES[p.card.r].key as keyof typeof PALETTES];
}

/** Big announcement for a hit, e.g. "Légendaire · Gold · 7/10". */
function hitTitle(p: Pull): string | null {
  if (p.serial?.of === 1) return 'Exemplaire unique · 1 sur 1';
  const parts: string[] = [];
  if (p.card.r >= 3) parts.push(RARITIES[p.card.r].label);
  if (FINISH_BY_ID[p.finish].hit >= 1) parts.push(FINISH_BY_ID[p.finish].label);
  if (p.full) parts.push(FULL_ART.label);
  if (p.special) parts.push(SPECIAL_BY_ID[p.special].label);
  if (p.serial) parts.push(`Numérotée ${p.serial.num}/${p.serial.of}`);
  return parts.length ? parts.join(' · ') : null;
}

export function PackOpening({ pools, canOpen, testMode, stock, onCommit, onGoBinder }: Props) {
  const [pack, setPack] = useState<Pack>(() => openPack(pools));
  const [packKey, setPackKey] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [pulls, setPulls] = useState<Pull[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [charging, setCharging] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [flash, setFlash] = useState(0);
  const [sheet, setSheet] = useState<Pull | null>(null);
  const [bulk, setBulk] = useState<{ pulls: Pull[]; packs: number; gods: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const busy = useRef(false);

  // New card pool (e.g. data reloaded) → reroll the waiting pack.
  useEffect(() => {
    setPack(openPack(pools));
  }, [pools]);

  // Download every picture of the waiting pack before it is torn, so no card flips onto a blank.
  useEffect(() => {
    for (const p of pack.pulls) {
      for (const src of cardImages(p.card, p)) {
        const img = new Image();
        img.decoding = 'async';
        img.src = src;
      }
    }
  }, [pack]);

  const best = useMemo(() => pack.pulls.reduce((m, p) => Math.max(m, p.card.r), 0), [pack]);

  const onTorn = () => {
    const committed = onCommit(pack.pulls);
    setPulls(committed);
    setIndex(0);
    setFlipped(false);
    setPhase('burst');
    const rect = document.querySelector('.pack')?.getBoundingClientRect();
    if (rect) {
      burst(rect.left + rect.width / 2, rect.top + rect.height * 0.15, pack.god ? 3 : 1, pack.god ? PALETTES.gold : [RARITY_GLOW[best], '#fff']);
    }
    setTimeout(() => setPhase('reveal'), pack.god ? 1600 : 950);
  };

  const current = pulls[index];

  const reveal = useCallback(() => {
    if (!current || busy.current) return;
    const doFlip = () => {
      setCharging(false);
      setFlipped(true);
      busy.current = false;
      if (current.hit >= 1) {
        const r = cardRef.current?.getBoundingClientRect();
        if (r) {
          const level = current.hit;
          setTimeout(() => burst(r.left + r.width / 2, r.top + r.height / 2, level, particleColors(current)), 180);
          if (level >= 3) setTimeout(() => setFlash((f) => f + 1), 120);
        }
      }
    };
    busy.current = true;
    if (current.hit >= 1) {
      setCharging(true);
      setTimeout(doFlip, 650 + current.hit * 420);
    } else {
      doFlip();
    }
  }, [current]);

  const next = useCallback(() => {
    if (busy.current) return;
    busy.current = true;
    setLeaving(true);
    setTimeout(() => {
      setLeaving(false);
      setFlipped(false);
      busy.current = false;
      if (index + 1 >= pulls.length) setPhase('summary');
      else setIndex(index + 1);
    }, 360);
  }, [index, pulls.length]);

  const advance = useCallback(() => {
    if (phase !== 'reveal') return;
    if (!flipped) reveal();
    else next();
  }, [phase, flipped, reveal, next]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault();
        advance();
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [advance]);

  const newPack = () => {
    setPack(openPack(pools));
    setPackKey((k) => k + 1);
    setPulls([]);
    setPhase('idle');
  };

  const bulkCount = testMode ? TEST_BULK : Math.min(stock, BULK_MAX);

  const openAll = () => {
    const packs = Array.from({ length: bulkCount - 1 }, () => openPack(pools));
    packs.unshift(pack); // the pack on screen is part of the batch
    const pulls = onCommit(packs.flatMap((p) => p.pulls), packs.length);
    setBulk({ pulls, packs: packs.length, gods: packs.filter((p) => p.god).length });
    setPhase('bulk');
  };

  const leaveBulk = () => {
    setBulk(null);
    newPack();
  };

  const skipAll = () => {
    busy.current = false;
    setCharging(false);
    setPhase('summary');
  };

  const title = current && flipped ? hitTitle(current) : null;
  const bigHit = !!current && flipped && current.hit >= 2;

  return (
    <section className={`opening phase-${phase} ${charging ? 'is-charging' : ''} ${bigHit ? 'is-bighit' : ''}`}>
      <div className="stage-bg" />
      {flash > 0 && <div key={flash} className="flash" />}

      {(phase === 'idle' || phase === 'burst') && (
        <div className="opening__pack">
          <PackVisual
            key={packKey}
            god={pack.god}
            disabled={!canOpen}
            glow={pack.god ? '#ffd766' : RARITY_GLOW[best]}
            onTorn={onTorn}
          />
          {phase === 'idle' && (
            <div className="opening__hint">
              {canOpen ? (
                <>
                  <span className="hint-gesture" />
                  Glisse sur le haut du paquet pour le déchirer
                  {!testMode && <small>{stock} paquet{stock > 1 ? 's' : ''} en réserve</small>}
                  {bulkCount >= 2 && (
                    <button className="btn btn--ghost opening__all" onClick={openAll}>
                      Tout ouvrir ({bulkCount} paquets)
                    </button>
                  )}
                </>
              ) : (
                <>Plus de paquet en réserve — le prochain arrive bientôt.</>
              )}
            </div>
          )}
          {phase === 'burst' && pack.god && <div className="godpack-banner">God Pack !</div>}
        </div>
      )}

      {phase === 'reveal' && current && (
        <div className="reveal">
          <div className="reveal__counter">
            {index + 1} / {pulls.length}
          </div>
          <div className="reveal__stage" onClick={advance}>
            {bigHit && <div className="rays" style={{ '--ray': particleColors(current)[0] } as CSSProperties} />}
            {pulls.slice(index + 1, index + 3).map((p, i) => (
              <div key={p.uid} className="reveal__under" style={{ '--i': i + 1 } as CSSProperties}>
                <Card card={p.card} look={p} faceDown interactive={false} width={330} />
              </div>
            ))}
            <div
              key={current.uid}
              ref={cardRef}
              className={`reveal__current ${leaving ? 'is-leaving' : ''} ${charging ? 'is-charging' : ''} charge-${current.hit}`}
            >
              <Card
                card={current.card}
                look={current}
                serial={current.serial}
                faceDown={!flipped}
                hint={flipped ? 0 : current.hit}
                interactive={flipped}
                width={330}
              />
              {flipped && current.isNew && <span className="badge-new">Nouveau</span>}
            </div>
          </div>
          <div className={`reveal__title ${title ? 'is-on' : ''} hit-${current.hit}`}>{title ?? ' '}</div>
          <div className="reveal__help">{flipped ? 'Clique pour la carte suivante' : 'Clique pour révéler'}</div>
          <div className="tray">
            {pulls.map((p, i) => (
              <div key={p.uid} className={`tray__slot ${i < index || (i === index && flipped) ? 'is-filled' : ''}`}>
                {(i < index || (i === index && flipped)) && (
                  <Card card={p.card} look={p} serial={p.serial} width={isLandscape(p.card) ? 44 : 62} interactive={false} />
                )}
              </div>
            ))}
            <button className="btn btn--ghost tray__skip" onClick={skipAll}>
              Tout révéler
            </button>
          </div>
        </div>
      )}

      {phase === 'bulk' && bulk && (
        <BulkOpening
          pulls={bulk.pulls}
          packs={bulk.packs}
          godPacks={bulk.gods}
          particleColors={particleColors}
          canOpenMore={canOpen}
          onAgain={leaveBulk}
          onGoBinder={onGoBinder}
        />
      )}

      {phase === 'summary' && (
        <div className="summary">
          <h2 className="summary__title">{pack.god ? 'God Pack !' : 'Paquet ouvert'}</h2>
          {testMode && <p className="summary__sub">Mode test — ces cartes ne sont pas enregistrées.</p>}
          <div className="summary__grid">
            {pulls.map((p, i) => (
              <div
                key={p.uid}
                className="summary__item"
                style={{ '--d': `${i * 70}ms` } as CSSProperties}
                onClick={() => setSheet(p)}
              >
                <Card card={p.card} look={p} serial={p.serial} width={196} />
                {p.isNew && <span className="badge-new">Nouveau</span>}
              </div>
            ))}
          </div>
          <div className="summary__actions">
            <button className="btn btn--primary" disabled={!canOpen} onClick={newPack}>
              {canOpen ? 'Ouvrir un autre paquet' : 'Plus de paquet en réserve'}
            </button>
            <button className="btn btn--ghost" onClick={onGoBinder}>
              Voir le cahier
            </button>
          </div>
          <p className="summary__tip">Clique sur une carte pour voir sa fiche.</p>
        </div>
      )}
      {sheet && (
        <CardModal card={sheet.card} look={sheet} serial={sheet.serial} onClose={() => setSheet(null)} />
      )}
    </section>
  );
}
