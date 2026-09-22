import { RARITIES } from '../game/rarity';
import { VARIANT_BY_ID } from '../game/variants';
import type { Entry } from '../game/storage';
import type { CardData, Serial, VariantId } from '../game/types';
import { Card, RarityBadge } from './Card';

interface Props {
  card: CardData;
  variant: VariantId;
  serial?: Serial;
  entry?: Entry;
  onClose: () => void;
}

/** Card sheet: the only place where the special effect is named. */
export function CardModal({ card, variant, serial, entry, onClose }: Props) {
  const v = VARIANT_BY_ID[variant];
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal__body" onClick={(e) => e.stopPropagation()}>
        <Card card={card} variant={variant} serial={serial} width={380} />
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
            <dt>Effet</dt>
            <dd>
              {variant === 'normal' ? (
                'Aucun'
              ) : (
                <>
                  <span className="modal__effect">{v.label}</span>
                  {v.blurb && <small> — {v.blurb}</small>}
                </>
              )}
            </dd>
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
