import { useState, type CSSProperties } from 'react';
import { formatDates } from '../game/dates';
import { RARITIES } from '../game/rarity';
import type { CardData, Finish, Look, Serial } from '../game/types';
import { useTilt } from './useTilt';

export interface CardProps {
  card: CardData;
  look: Look;
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

/** Every image a card may show, for preloading before the reveal. */
export function cardImages(card: CardData, look: Look): string[] {
  const out = [card.img];
  if (look.special === 'altart' && card.alt) out.push(card.alt);
  if (look.special === 'signed' && card.sig) out.push(card.sig);
  if (card.m) out.push(`${import.meta.env.BASE_URL}masks/${card.id}.png`);
  return out;
}

// Which effect layers each finish uses.
const ART_FILM: Finish[] = ['holo', 'rainbow', 'starlight'];
const THEMED: Finish[] = ['cosmos', 'shattered', 'cold'];
const CARD_SHINE: Finish[] = ['etched', 'gold', 'rainbow', 'ghost'];
const SPARKLES: Finish[] = ['gold', 'cosmos', 'starlight'];
const SWEEP: Finish[] = ['gold', 'etched', 'ghost'];

export function Card({
  card,
  look,
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
  const { finish, full = false, special } = look;
  const oneOfOne = serial?.of === 1;
  // Landscape cards stay portrait while face down so the reveal keeps its surprise.
  const landscape = isLandscape(card) && !faceDown;
  const mask = card.m ? `url(${import.meta.env.BASE_URL}masks/${card.id}.png)` : undefined;
  // Alternate art uses the article's second image, or a re-framed crop of the main one.
  const sources = special === 'altart' ? [card.alt, card.img] : [card.img];
  const classes = [
    'card',
    landscape ? 'is-landscape' : 'is-portrait',
    `r-${rarity.key}`,
    `f-${finish}`,
    full ? 'is-full' : '',
    special ? `s-${special}` : '',
    special === 'altart' && !card.alt ? 'alt-crop' : '',
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
    ...(card.fx != null ? { '--fx': `${card.fx}%`, '--fy': `${card.fy}%` } : {}),
    width: landscape ? width * 1.4 : width,
    height: landscape ? width : width * 1.4,
  } as CSSProperties;

  const sparkles = SPARKLES.includes(finish) || full || special === 'goldsil' || oneOfOne;
  const sweep = SWEEP.includes(finish) || special === 'blacklabel' || oneOfOne;
  const corners = finish === 'gold' || special === 'signed' || special === 'altart' || oneOfOne;

  return (
    <div ref={ref} className={classes} style={style} onClick={onClick}>
      <div className="card__rotator">
        <div className="card__flipper">
          <div className="card__face card__front">
            <div className="card__bg" />
            <div className="card__line" />
            {CARD_SHINE.includes(finish) && <div className="fx fx--frameshine" />}
            <div className="card__layout">
              <div className="card__frame">
                <div className="card__art">
                  <CardArt sources={sources} name={card.t} />
                  {special === 'signed' && card.sig && (
                    <img className="card__sig" src={card.sig} alt="" draggable={false} />
                  )}
                  {(ART_FILM.includes(finish) || (full && finish === 'normal')) && <div className="fx fx--artshine" />}
                  {THEMED.includes(finish) && <div className={`fx fx--theme fx--${finish}`} />}
                  {special === 'goldsil' && (
                    <>
                      <div className="fx fx--goldsil" />
                      <div className="fx fx--goldsil-shine" />
                    </>
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
                  <RarityMark rarity={card.r} />
                </div>
                <div className="card__desc">{card.d}</div>
                <CardMeta card={card} />
              </div>
            </div>
            {finish === 'etched' && <div className="fx fx--etch" />}
            {finish === 'rainbow' && <div className="fx fx--rainbow" />}
            {finish === 'starlight' && <div className="fx fx--starlight" />}
            {sparkles && <div className="fx fx--sparkle" />}
            {sweep && <div className="fx fx--sweep" />}
            {corners && <div className="fx fx--corners" />}
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
function CardMeta({ card }: { card: CardData }) {
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
function RarityMark({ rarity }: { rarity: number }) {
  const r = RARITIES[rarity];
  return (
    <span className="rmark" title={r.label}>
      <span className="rmark__txt">{r.short}</span>
    </span>
  );
}

export function RarityBadge({ rarity, className = '' }: { rarity: number; className?: string }) {
  const r = RARITIES[rarity];
  return (
    <span className={`rbadge rb-${r.key} ${className}`} title={r.label}>
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
