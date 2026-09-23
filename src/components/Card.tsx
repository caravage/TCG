import { useState, type CSSProperties } from 'react';
import { formatDates } from '../game/dates';
import { RARITIES } from '../game/rarity';
import type { CardData, Serial, VariantId } from '../game/types';
import { useTilt } from './useTilt';

export interface CardProps {
  card: CardData;
  variant: VariantId;
  serial?: Serial;
  /** Short side in px (width of a portrait card, height of a landscape one). */
  width?: number;
  interactive?: boolean;
  faceDown?: boolean;
  /** Glow shown on the back before reveal (0-4). */
  hint?: number;
  className?: string;
  onClick?: () => void;
}

export const isLandscape = (card: CardData) => card.k === 'e';

const FULL_LAYOUT: VariantId[] = ['fullart', 'altart'];
const ART_SHINE: VariantId[] = ['holo', 'signed', 'fullart', 'altart', 'rainbow'];
const FRAME_SHINE: VariantId[] = ['etched', 'gold', 'rainbow'];
const SPARKLES: VariantId[] = ['fullart', 'altart', 'signed', 'gold', 'rainbow'];
const CORNERS: VariantId[] = ['gold', 'altart', 'signed'];
const SWEEP: VariantId[] = ['bw', 'gold', 'fullart', 'altart', 'etched'];

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
  // Landscape cards stay portrait while face down so the reveal keeps its surprise.
  const landscape = isLandscape(card) && !faceDown;
  const mask = card.m ? `url(${import.meta.env.BASE_URL}masks/${card.id}.png)` : undefined;
  const full = FULL_LAYOUT.includes(variant);
  // Alternate art uses the article's second image, or a re-framed crop of the main one.
  const sources = variant === 'altart' ? [card.alt, card.img] : [card.img];
  const classes = [
    'card',
    landscape ? 'is-landscape' : 'is-portrait',
    `r-${rarity.key}`,
    `v-${variant}`,
    full ? 'is-full' : '',
    variant === 'altart' && !card.alt ? 'alt-crop' : '',
    serial ? 'is-numbered' : '',
    oneOfOne ? 'is-oneofone' : '',
    faceDown ? 'is-down' : '',
    hint ? `hint-${hint}` : '',
    interactive ? 'is-interactive' : '',
    className,
  ].join(' ');
  const style = {
    '--w': `${width}px`,
    ...(mask ? { '--mask': mask } : {}),
    width: landscape ? width * 1.4 : width,
    height: landscape ? width : width * 1.4,
  } as CSSProperties;

  return (
    <div ref={ref} className={classes} style={style} onClick={onClick}>
      <div className="card__rotator">
        <div className="card__flipper">
          <div className="card__face card__front">
            <div className="card__bg" />
            <div className="card__line" />
            {FRAME_SHINE.includes(variant) && <div className="fx fx--frameshine" />}
            <div className="card__layout">
              <div className="card__frame">
                <div className="card__art">
                  <CardArt sources={sources} name={card.t} />
                  {variant === 'signed' && card.sig && (
                    <img className="card__sig" src={card.sig} alt="" draggable={false} />
                  )}
                  {ART_SHINE.includes(variant) && <div className="fx fx--artshine" />}
                  {variant === 'bgholo' && <div className="fx fx--bgholo" />}
                  {variant === 'goldsil' && (
                    <>
                      <div className="fx fx--goldsil" />
                      <div className="fx fx--goldsil-shine" />
                    </>
                  )}
                  {landscape && (
                    <div className="card__top">
                      <span className="card__brand">HISTORIA</span>
                      <RarityMark rarity={card.r} chip />
                    </div>
                  )}
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
                </div>
              </div>
              <div className="card__plaque">
                <div className="card__titlerow">
                  <div className={`card__name ${nameSize(card.t)}`}>{card.t}</div>
                  {!landscape && <RarityMark rarity={card.r} />}
                </div>
                <div className="card__desc">{card.d}</div>
                <Timeline card={card} />
              </div>
            </div>
            {variant === 'etched' && <div className="fx fx--etch" />}
            {variant === 'rainbow' && <div className="fx fx--rainbow" />}
            {(SPARKLES.includes(variant) || oneOfOne) && <div className="fx fx--sparkle" />}
            {(SWEEP.includes(variant) || oneOfOne) && <div className="fx fx--sweep" />}
            {(CORNERS.includes(variant) || oneOfOne) && <div className="fx fx--corners" />}
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

/** Long titles shrink instead of being cut. */
function nameSize(t: string): string {
  if (t.length > 40) return 'name--xs';
  if (t.length > 28) return 'name--s';
  if (t.length > 18) return 'name--m';
  return '';
}

/** Dates and collector number under the description. */
function Timeline({ card }: { card: CardData }) {
  const dates = formatDates(card);
  return (
    <div className="card__meta">
      <span>{dates ?? ''}</span>
      <span>Nº {String(card.n).padStart(4, '0')}</span>
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

/** The rarity letter printed on the card; a highlight runs across it as the card tilts. */
function RarityMark({ rarity, chip = false }: { rarity: number; chip?: boolean }) {
  const r = RARITIES[rarity];
  return (
    <span className={`rmark ${chip ? 'rmark--chip' : ''}`} title={r.label}>
      <span className="rmark__txt">{r.short}</span>
    </span>
  );
}

export function RarityBadge({ rarity, gem = false, className = '' }: { rarity: number; gem?: boolean; className?: string }) {
  const r = RARITIES[rarity];
  return (
    <span className={`rbadge rb-${r.key} ${gem ? 'rbadge--gem' : ''} ${className}`} title={r.label}>
      <span>{r.short}</span>
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
