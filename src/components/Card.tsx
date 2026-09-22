import { useState, type CSSProperties } from 'react';
import { formatDates, timelinePos } from '../game/dates';
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
const FRAME_SHINE: VariantId[] = ['bw', 'etched', 'gold', 'rainbow'];
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
  const landscape = isLandscape(card);
  const full = FULL_LAYOUT.includes(variant);
  // Art déco touches grow with rarity: filets from UR, arch + sun rays from L.
  const deco = card.r >= 3;
  const grand = card.r >= 4;
  // Alternate art uses the article's second image, or a re-framed crop of the main one.
  const sources = variant === 'altart' ? [card.alt, card.img] : [card.img];
  const classes = [
    'card',
    landscape ? 'is-landscape' : 'is-portrait',
    `r-${rarity.key}`,
    `v-${variant}`,
    full ? 'is-full' : '',
    grand && !full ? 'is-grand' : '',
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
    width: landscape ? width * 1.4 : width,
    height: landscape ? width : width * 1.4,
  } as CSSProperties;

  return (
    <div ref={ref} className={classes} style={style} onClick={onClick}>
      <div className="card__rotator">
        <div className="card__flipper">
          <div className="card__face card__front">
            <div className="card__bg" />
            {grand && !full && <div className="card__rays" />}
            {FRAME_SHINE.includes(variant) && <div className="fx fx--frameshine" />}
            {deco && !full && <div className="card__filets" />}
            <div className="card__layout">
              <div className="card__frame">
                <div className="card__art">
                  <CardArt sources={sources} name={card.t} />
                  {variant === 'signed' && card.sig && (
                    <img className="card__sig" src={card.sig} alt="" draggable={false} />
                  )}
                  {ART_SHINE.includes(variant) && <div className="fx fx--artshine" />}
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
                <div className="card__name">{card.t}</div>
                <div className="card__desc">{card.d}</div>
                <Timeline card={card} />
              </div>
            </div>
            {variant === 'etched' && <div className="fx fx--etch" />}
            {variant === 'rainbow' && <div className="fx fx--rainbow" />}
            {(SPARKLES.includes(variant) || oneOfOne) && <div className="fx fx--sparkle" />}
            {(SWEEP.includes(variant) || oneOfOne) && <div className="fx fx--sweep" />}
            {(CORNERS.includes(variant) || oneOfOne) && <div className="fx fx--corners" />}
            <RarityBadge rarity={card.r} gem={grand} className="card__badge" />
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

/** Mini timeline engraved in the plaque: where the card sits in history. */
function Timeline({ card }: { card: CardData }) {
  const dates = formatDates(card);
  const no = `Nº ${String(card.n).padStart(4, '0')}`;
  const a = card.y1 ?? card.y2;
  const b = card.y2 ?? card.y1;
  return (
    <div className="card__time">
      {a != null && b != null && (
        <div className="tl">
          <div className="tl__axis" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="tl__tick" style={{ left: `${i * 20}%` }} />
          ))}
          <div
            className="tl__span"
            style={{ left: `${timelinePos(a) * 100}%`, width: `${(timelinePos(b) - timelinePos(a)) * 100}%` }}
          />
          <div className="tl__dot" style={{ left: `${timelinePos(a) * 100}%` }} />
        </div>
      )}
      <div className="card__meta">
        <span>{dates ?? ''}</span>
        <span>{no}</span>
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
