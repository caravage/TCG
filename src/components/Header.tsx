import { msUntilNext, type SaveData } from '../game/storage';

export type Tab = 'open' | 'binder' | 'showcase';

interface Props {
  tab: Tab;
  onTab: (t: Tab) => void;
  testMode: boolean;
  onTestMode: (v: boolean) => void;
  save: SaveData;
  now: number;
  sample: boolean;
  onShop: () => void;
}

function fmt(ms: number) {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function Header({ tab, onTab, testMode, onTestMode, save, now, sample, onShop }: Props) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand__mark">H</span>
        <div>
          <div className="brand__name">Historia</div>
          <div className="brand__tag">Cartes d’Histoire · Wikipédia</div>
        </div>
      </div>

      <nav className="tabs">
        <button className={tab === 'open' ? 'is-active' : ''} onClick={() => onTab('open')}>
          Ouvrir
        </button>
        <button className={tab === 'binder' ? 'is-active' : ''} onClick={() => onTab('binder')}>
          Cahier
        </button>
        {testMode && (
          <button className={tab === 'showcase' ? 'is-active' : ''} onClick={() => onTab('showcase')}>
            Effets
          </button>
        )}
      </nav>

      <div className="topbar__right">
        {sample && <span className="chip chip--warn" title="Données d'exemple : lancez npm run cards">Exemple</span>}
        {testMode ? (
          <span className="stock stock--test">
            <b>∞</b> paquets · rien n’est enregistré
          </span>
        ) : (
          <span className="stock">
            <b>{save.stock}</b> paquet{save.stock > 1 ? 's' : ''}
            <span className="stock__timer">+1 dans {fmt(msUntilNext(save, now))}</span>
          </span>
        )}
        {!testMode && (
          <button className="parch" onClick={onShop} title="Atelier de recyclage : recycler des cartes, acheter des paquets">
            <b>{save.parchments.toLocaleString('fr-FR')}</b> parchemins
          </button>
        )}
        <label className="switch" title="Mode test : ouvertures illimitées, sans enregistrement">
          <input type="checkbox" checked={testMode} onChange={(e) => onTestMode(e.target.checked)} />
          <span className="switch__track">
            <span className="switch__thumb" />
          </span>
          <span className="switch__label">Mode test</span>
        </label>
      </div>
    </header>
  );
}
