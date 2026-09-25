import { PACK_PRICE } from '../game/recycle';

export interface DuplicateSummary {
  copies: number;
  value: number;
}

interface Props {
  parchments: number;
  duplicates: DuplicateSummary;
  onBuy: (n: number) => void;
  onRecycleDuplicates: () => void;
  onClose: () => void;
}

/** Recycling counter: turn duplicates into parchemins, parchemins into packs. */
export function Shop({ parchments, duplicates, onBuy, onRecycleDuplicates, onClose }: Props) {
  const affordable = Math.floor(parchments / PACK_PRICE);
  return (
    <div className="modal" onClick={onClose}>
      <div className="shop" onClick={(e) => e.stopPropagation()}>
        <h2 className="shop__title">Atelier de recyclage</h2>
        <p className="shop__balance">
          <b>{parchments.toLocaleString('fr-FR')}</b> parchemins
        </p>

        <section className="shop__block">
          <h3>Recycler les doublons</h3>
          <p>
            Garde un exemplaire de chaque carte dans chaque version, et recycle toutes les copies identiques en trop.
            Une carte vaut plus selon sa rareté, sa finition, son Full Art, sa variante et sa numérotation.
          </p>
          <button className="btn btn--primary" disabled={!duplicates.copies} onClick={onRecycleDuplicates}>
            {duplicates.copies
              ? `Recycler ${duplicates.copies} doublon${duplicates.copies > 1 ? 's' : ''} (+${duplicates.value.toLocaleString('fr-FR')})`
              : 'Aucun doublon identique'}
          </button>
        </section>

        <section className="shop__block">
          <h3>Acheter des paquets</h3>
          <p>Un paquet coûte {PACK_PRICE} parchemins. Il rejoint ta réserve.</p>
          <div className="shop__buy">
            {[1, 5, 10].map((n) => (
              <button key={n} className="btn btn--ghost" disabled={affordable < n} onClick={() => onBuy(n)}>
                {n} paquet{n > 1 ? 's' : ''} · {(n * PACK_PRICE).toLocaleString('fr-FR')}
              </button>
            ))}
          </div>
        </section>

        <button className="btn btn--ghost shop__close" onClick={onClose}>
          Fermer
        </button>
      </div>
    </div>
  );
}
