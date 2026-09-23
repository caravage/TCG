import { RARITIES } from '../game/rarity';
import { FINISHES, FULL_ART, SERIALS, SPECIALS, finishChance } from '../game/variants';
import type { CardData, Look, Rarity, Serial } from '../game/types';
import { Card } from './Card';

const pct = (x: number) => (x >= 0.01 ? `${Math.round(x * 1000) / 10} %` : `1 / ${Math.round(1 / x).toLocaleString('fr-FR')}`);

/** Which rarities a finish exists at, e.g. "C → R". */
function availability(weights: number[]): string {
  const idx = weights.map((w, i) => (w > 0 ? i : -1)).filter((i) => i >= 0);
  const a = RARITIES[idx[0]].short;
  const b = RARITIES[idx[idx.length - 1]].short;
  return a === b ? a : `${a} → ${b}`;
}

interface ItemProps {
  card: CardData;
  look: Look;
  label: string;
  sub?: string;
  serial?: Serial;
}

function Item({ card, look, label, sub, serial }: ItemProps) {
  return (
    <div className="grid__item">
      <Card card={card} look={look} serial={serial} width={188} />
      <div className="showcase__label">
        {label}
        {sub && <small>{sub}</small>}
      </div>
    </div>
  );
}

/** Test-mode gallery: every rarity, finish, special treatment and numbered print. */
export function Showcase({ cards }: { cards: CardData[] }) {
  const pick = (r: Rarity) => cards.find((c) => c.r === r && c.k !== 'e') ?? cards.find((c) => c.r === r) ?? cards[0];
  const withSig = cards.find((c) => c.sig && c.k !== 'e') ?? cards[0];
  const withAlt = cards.find((c) => c.alt && c.k !== 'e') ?? cards[0];
  const withMask = cards.find((c) => c.m && c.r >= 3) ?? cards.find((c) => c.m) ?? cards[0];
  const event = cards.find((c) => c.k === 'e' && c.r >= 3) ?? cards.find((c) => c.k === 'e');

  return (
    <section className="binder showcase">
      <h1 className="binder__title">Galerie des effets</h1>
      <p className="binder__sub">Mode test — raretés, finitions, Full Art, variantes spéciales et numérotations.</p>

      <h2 className="showcase__h">Raretés (mat)</h2>
      <div className="grid">
        {RARITIES.map((r) => (
          <Item key={r.id} card={pick(r.id)} look={{ finish: 'normal' }} label={r.label} />
        ))}
      </div>

      {event && (
        <>
          <h2 className="showcase__h">Événements (cartes horizontales)</h2>
          <div className="grid">
            <Item card={event} look={{ finish: 'normal' }} label="Mat" />
            <Item card={event} look={{ finish: 'holo' }} label="Holo" />
            <Item card={event} look={{ finish: 'shattered' }} label="Verre brisé" />
            <Item card={event} look={{ finish: 'holo', full: true }} label="Holo · Full Art" />
            <Item card={event} look={{ finish: 'gold' }} label="Gold" />
          </div>
        </>
      )}

      <h2 className="showcase__h">Finitions (selon la rareté)</h2>
      <div className="grid">
        {FINISHES.map((f) => {
          const rs = f.weights.map((w, i) => (w > 0 ? i : -1)).filter((i) => i >= 0);
          const r = rs[rs.length - 1] as Rarity;
          const card = pick(f.id === 'normal' || f.id === 'reverse' ? 2 : r);
          return (
            <Item
              key={f.id}
              card={card}
              look={{ finish: f.id }}
              label={f.label}
              sub={`${availability(f.weights)} · ${pct(finishChance(f.id, r))} en ${RARITIES[r].short}`}
            />
          );
        })}
      </div>

      <h2 className="showcase__h">Full Art (combinable, dès UC)</h2>
      <div className="grid">
        <Item card={pick(1)} look={{ finish: 'normal', full: true }} label="Mat · Full Art" sub={pct(FULL_ART.chance)} />
        <Item card={pick(2)} look={{ finish: 'reverse', full: true }} label="Reverse · Full Art" />
        <Item card={pick(3)} look={{ finish: 'cosmos', full: true }} label="Cosmos · Full Art" />
        <Item card={pick(4)} look={{ finish: 'gold', full: true }} label="Gold · Full Art" />
      </div>

      <h2 className="showcase__h">Variantes spéciales</h2>
      <div className="grid">
        {SPECIALS.map((s) => {
          const card = s.id === 'signed' ? withSig : s.id === 'altart' ? withAlt : s.id === 'goldsil' ? withMask : pick(3);
          return (
            <Item
              key={s.id}
              card={card}
              look={{ finish: card.r >= 3 ? 'holo' : 'normal', special: s.id }}
              serial={s.id === 'signed' ? { of: 50, num: 17 } : undefined}
              label={s.label}
              sub={pct(s.chance)}
            />
          );
        })}
      </div>

      <h2 className="showcase__h">Numérotées</h2>
      <div className="grid">
        {[...SERIALS].reverse().map((s) => (
          <Item
            key={s.of}
            card={pick(3)}
            look={{ finish: s.of === 1 ? 'gold' : 'holo' }}
            serial={{ of: s.of, num: Math.ceil(s.of / 3) }}
            label={`/${s.of}`}
            sub={pct(s.chance)}
          />
        ))}
      </div>
    </section>
  );
}
