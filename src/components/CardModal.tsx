import { useEffect, useState, type CSSProperties } from 'react';
import { formatDates } from '../game/dates';
import { loadExtracts } from '../game/extracts';
import { RARITIES } from '../game/rarity';
import { FINISH_BY_ID, FULL_ART, SPECIAL_BY_ID } from '../game/variants';
import type { Entry } from '../game/storage';
import type { CardData, Look, Serial } from '../game/types';
import { Card, RarityBadge, isLandscape } from './Card';

interface Props {
  card: CardData;
  look: Look;
  serial?: Serial;
  entry?: Entry;
  onClose: () => void;
}

/** Card sheet: the only place where the special effect is named. */
export function CardModal({ card, look, serial, entry, onClose }: Props) {
  const finish = FINISH_BY_ID[look.finish];
  const special = look.special ? SPECIAL_BY_ID[look.special] : null;
  const [flipped, setFlipped] = useState(false);
  const [extract, setExtract] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    loadExtracts().then((x) => alive && setExtract(x[card.id] ?? ''));
    return () => {
      alive = false;
    };
  }, [card.id]);
  const W = 380;
  const size = isLandscape(card) ? { width: W * 1.4, height: W } : { width: W, height: W * 1.4 };
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal__body" onClick={(e) => e.stopPropagation()}>
        <div className="sheet">
          <div className={`sheet__flip ${flipped ? 'is-flipped' : ''}`} style={size as CSSProperties}>
            <div className="sheet__front">
              <Card card={card} look={look} serial={serial} width={W} />
            </div>
            <div className="sheet__back" style={{ '--rc': `var(--rc-${RARITIES[card.r].key})` } as CSSProperties}>
              <div className="sheet__kicker">Le saviez-vous ?</div>
              <h3>{card.t}</h3>
              <div className="sheet__dates">{formatDates(card) ?? ''}</div>
              <p className="sheet__text">
                {extract === null ? 'Chargement…' : extract || card.d || 'Pas d’extrait disponible.'}
              </p>
              <div className="sheet__src">Extrait de Wikipédia · Nº {String(card.n).padStart(4, '0')}</div>
            </div>
          </div>
          <button className="btn btn--ghost sheet__turn" onClick={() => setFlipped((f) => !f)}>
            {flipped ? 'Voir la carte' : 'Retourner la carte'}
          </button>
        </div>
        <div className="modal__info">
          <div className="modal__no">Nº {String(card.n).padStart(4, '0')}</div>
          <h2>{card.t}</h2>
          <p className="modal__desc">{card.d}</p>
          <dl>
            <dt>Rareté</dt>
            <dd>
              <RarityBadge rarity={card.r} />
              {RARITIES[card.r].label}
            </dd>
            <dt>Finition</dt>
            <dd>
              <span className="modal__effect">{finish.label}</span>
              <small> — {finish.blurb}</small>
            </dd>
            {look.full && (
              <>
                <dt>Format</dt>
                <dd>
                  <span className="modal__effect">{FULL_ART.label}</span>
                  <small> — {FULL_ART.blurb}</small>
                </dd>
              </>
            )}
            {special && (
              <>
                <dt>Variante</dt>
                <dd>
                  <span className="modal__effect">{special.label}</span>
                  <small> — {special.blurb}</small>
                </dd>
              </>
            )}
            {serial && (
              <>
                <dt>Numérotation</dt>
                <dd>
                  {serial.of === 1 ? 'Exemplaire unique (1/1)' : `${serial.num} / ${serial.of}`}
                </dd>
              </>
            )}
            <dt>Vues par an</dt>
            <dd>
              {card.views.toLocaleString('fr-FR')}
              <small> (médiane depuis 2016{card.v12 != null ? ` · ${card.v12.toLocaleString('fr-FR')} sur 12 mois` : ''})</small>
            </dd>
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
