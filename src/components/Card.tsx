import { useState, type CSSProperties } from 'react';
import { RARITIES } from '../game/rarity';
import type { CardData, Serial, VariantId } from '../game/types';
import { useTilt } from './useTilt';

export interface CardProps {
  card: CardData;
  variant: VariantId;
  serial?: Serial;
  width?: number;
  interactive?: boolean;
  faceDown?: boolean;
  /** Glow shown on the back before reveal (0-4). */
  hint?: number;
  className?: string;
  onClick?: () => void;
}

const FULL_LAYOUT: VariantId[] = ['fullart', 'altart'];
const ART_SHINE: VariantId[] = ['holo', 'signed', 'fullart', 'altart', 'rainbow'];
const FRAME_SHINE: VariantId[] = ['reverse', 'bw', 'etched', 'gold', 'rainbow'];
const SPARKLES: VariantId[] = ['fullart', 'altart', 'signed', 'gold', 'rainbow'];
const CORNERS: VariantId[] = ['gold', 'altart', 'signed'];
const SWEEP: VariantId[] = ['gold', 'fullart', 'altart', 'etched'];

export function Card({
  card,
  variant,
  serial,
  width = 280,
  interactive = true,
  faceDown = false,
  hint = 0,
  className = '',
  onClick,
}: CardProps) {
  const ref = useTilt<HTMLDivElement>(interactive);
  const rarity = RARITIES[card.r];
  const oneOfOne = serial?.of === 1;
  // Alternate art uses the article's second image, or a re-framed crop of the main one.
  const sources = variant === 'altart' ? [card.alt, card.img] : [card.img];
  const classes = [
    'card',
    `r-${rarity.key}`,
    `v-${variant}`,
    FULL_LAYOUT.includes(variant) ? 'is-full' : '',
    variant === 'altart' && !card.alt ? 'alt-crop' : '',
    serial ? 'is-numbered' : '',
    oneOfOne ? 'is-oneofone' : '',
    faceDown ? 'is-down' : '',
    hint ? `hint-${hint}` : '',
    interactive ? 'is-interactive' : '',
    className,
  ].join(' ');

  return (
    <div ref={ref} className={classes} style={{ '--w': `${width}px` } as CSSProperties} onClick={onClick}>
      <div className="card__rotator">
        <div className="card__flipper">
          <div className="card__face card__front">
            <div className="card__bg" />
            {FRAME_SHINE.includes(variant) && <div className="fx fx--frameshine" />}
            <div className="card__layout">
              <div className="card__art">
                <CardArt sources={sources} name={card.t} />
                {variant === 'signed' && card.sig && <img className="card__sig" src={card.sig} alt="" draggable={false} />}
                {ART_SHINE.includes(variant) && <div className="fx fx--artshine" />}
              </div>
              <header className="card__head">
                <span className="card__name">{card.t}</span>
                <RarityBadge rarity={card.r} />
              </header>
              <div className="card__desc">{card.d}</div>
              <footer className="card__foot">
                <span className="card__no">Nº {String(card.n).padStart(4, '0')}</span>
                <span className="card__set">Historia · I</span>
              </footer>
            </div>
            {variant === 'etched' && <div className="fx fx--etch" />}
            {variant === 'rainbow' && <div className="fx fx--rainbow" />}
            {(SPARKLES.includes(variant) || oneOfOne) && <div className="fx fx--sparkle" />}
            {(SWEEP.includes(variant) || oneOfOne) && <div className="fx fx--sweep" />}
            {(CORNERS.includes(variant) || oneOfOne) && <div className="fx fx--corners" />}
            {serial && (
              <div className="card__serial">
                {oneOfOne ? (
                  <>
                    <b>1</b>/<b>1</b>
                  </>
                ) : (
                  <>
                    <b>{serial.num}</b>/{serial.of}
                  </>
                )}
              </div>
            )}
            {variant === 'signed' && <div className="card__seal">H</div>}
            <div className="fx fx--glare" />
          </div>
          <div className="card__face card__back">
            <CardBack />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Tries each source in turn; shows a monogram only if every image fails. */
function CardArt({ sources, name }: { sources: (string | undefined)[]; name: string }) {
  const list = sources.filter((s): s is string => !!s);
  const [idx, setIdx] = useState(0);
  if (idx >= list.length) {
    return (
      <div className="card__fallback">
        <span>{name.charAt(0)}</span>
      </div>
    );
  }
  return (
    <img
      key={list[idx]}
      className="card__img"
      src={list[idx]}
      alt={name}
      loading="lazy"
      draggable={false}
      onError={() => setIdx((i) => i + 1)}
    />
  );
}

export function RarityBadge({ rarity }: { rarity: number }) {
  const r = RARITIES[rarity];
  return (
    <span className={`rbadge rb-${r.key}`} title={r.label}>
      {r.short}
    </span>
  );
}

export function CardBack() {
  return (
    <div className="back">
      <div className="back__pattern" />
      <div className="back__ring">
        <div className="back__emblem">H</div>
      </div>
      <div className="back__title">HISTORIA</div>
      <div className="back__sub">Chroniques de Wikipédia</div>
    </div>
  );
}
