import { RARITIES } from '../game/rarity';
import { SERIALS, VARIANT_BY_ID, VARIANT_ORDER } from '../game/variants';
import type { CardData, Rarity } from '../game/types';
import { Card } from './Card';

/** Test-mode gallery: every rarity frame, every variant and every numbered print. */
export function Showcase({ cards }: { cards: CardData[] }) {
  const pick = (r: Rarity) => cards.find((c) => c.r === r && c.k !== 'e') ?? cards.find((c) => c.r === r) ?? cards[0];
  const withSig = cards.find((c) => c.sig) ?? cards[0];
  const withAlt = cards.find((c) => c.alt) ?? cards[0];
  const withMask = cards.find((c) => c.m && c.r >= 3) ?? cards.find((c) => c.m) ?? cards[0];
  const hero = pick(4);
  const event = cards.find((c) => c.k === 'e' && c.r >= 3) ?? cards.find((c) => c.k === 'e');

  return (
    <section className="binder showcase">
      <h1 className="binder__title">Galerie des effets</h1>
      <p className="binder__sub">Mode test — tous les cadres de rareté, variantes et numérotations.</p>

      <h2 className="showcase__h">Raretés</h2>
      <div className="grid">
        {RARITIES.map((r) => (
          <div key={r.id} className="grid__item">
            <Card card={pick(r.id)} variant="normal" width={188} />
            <div className="showcase__label">{r.label}</div>
          </div>
        ))}
      </div>

      {event && (
        <>
          <h2 className="showcase__h">Événements (cartes horizontales)</h2>
          <div className="grid">
            {(['normal', 'holo', 'fullart', 'rainbow'] as const).map((v) => (
              <div key={v} className="grid__item">
                <Card card={event} variant={v} width={188} />
                <div className="showcase__label">{VARIANT_BY_ID[v].label}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="showcase__h">Variantes</h2>
      <div className="grid">
        {VARIANT_ORDER.filter((v) => v !== 'normal').map((v) => {
          const card =
            v === 'signed' ? withSig : v === 'altart' ? withAlt : v === 'bgholo' || v === 'goldsil' ? withMask : hero;
          const info = VARIANT_BY_ID[v];
          return (
            <div key={v} className="grid__item">
              <Card card={card} variant={v} width={188} />
              <div className="showcase__label">
                {info.label}
                <small>1 / {Math.round(1 / info.chance).toLocaleString('fr-FR')}</small>
              </div>
            </div>
          );
        })}
      </div>

      <h2 className="showcase__h">Numérotées</h2>
      <div className="grid">
        {[...SERIALS].reverse().map((s) => (
          <div key={s.of} className="grid__item">
            <Card card={pick(3)} variant={s.of === 1 ? 'gold' : 'normal'} serial={{ of: s.of, num: Math.ceil(s.of / 3) }} width={188} />
            <div className="showcase__label">
              /{s.of}
              <small>1 / {Math.round(1 / s.chance).toLocaleString('fr-FR')}</small>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
