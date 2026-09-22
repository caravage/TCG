import { useState, type CSSProperties } from 'react';
import { RARITIES } from '../game/rarity';
import { VARIANT_BY_ID } from '../game/variants';
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
const ART_SHINE: VariantId[] = ['holo', 'inverted', 'signed', 'fullart', 'altart', 'rainbow'];
const FRAME_SHINE: VariantId[] = ['reverse', 'bw', 'etched', 'gold', 'rainbow'];
const SPARKLES: VariantId[] = ['fullart', 'altart', 'signed', 'gold', 'rainbow'];

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
  const img = variant === 'altart' && card.alt ? card.alt : card.img;
  const classes = [
    'card',
    `r-${rarity.key}`,
    `v-${variant}`,
    FULL_LAYOUT.includes(variant) ? 'is-full' : '',
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
                <CardArt src={img} name={card.t} />
                {variant === 'signed' && card.sig && <img className="card__sig" src={card.sig} alt="" draggable={false} />}
                {ART_SHINE.includes(variant) && <div className="fx fx--artshine" />}
              </div>
              <header className="card__head">
                <span className="card__name">{card.t}</span>
                <Pips rarity={card.r} />
              </header>
              <div className="card__desc">{card.d}</div>
              <footer className="card__foot">
                <span className="card__no">Nº {String(card.n).padStart(4, '0')}</span>
                <span className="card__rarity">{rarity.label}</span>
                {variant !== 'normal' && <span className="card__variant">{VARIANT_BY_ID[variant].label}</span>}
              </footer>
            </div>
            {variant === 'etched' && <div className="fx fx--etch" />}
            {variant === 'rainbow' && <div className="fx fx--rainbow" />}
            {(SPARKLES.includes(variant) || oneOfOne) && <div className="fx fx--sparkle" />}
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
            {variant === 'signed' && <div className="card__seal">Signée</div>}
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

function CardArt({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false);
  if (failed || !src) {
    return (
      <div className="card__fallback">
        <span>{name.charAt(0)}</span>
      </div>
    );
  }
  return <img className="card__img" src={src} alt={name} loading="lazy" draggable={false} onError={() => setFailed(true)} />;
}

export function Pips({ rarity }: { rarity: number }) {
  return (
    <span className="pips" aria-label={RARITIES[rarity].label}>
      {Array.from({ length: rarity + 1 }, (_, i) => (
        <i key={i} />
      ))}
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
