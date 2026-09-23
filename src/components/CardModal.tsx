import { RARITIES } from '../game/rarity';
import { FINISH_BY_ID, FULL_ART, SPECIAL_BY_ID } from '../game/variants';
import type { Entry } from '../game/storage';
import type { CardData, Look, Serial } from '../game/types';
import { Card, RarityBadge } from './Card';

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
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal__body" onClick={(e) => e.stopPropagation()}>
        <Card card={card} look={look} serial={serial} width={380} />
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
