import { useCallback, useEffect, useMemo, useState } from 'react';
import { Binder } from './components/Binder';
import { Header, type Tab } from './components/Header';
import { PackOpening } from './components/PackOpening';
import { Showcase } from './components/Showcase';
import { buildPools } from './game/pack';
import { accrue, addPulls, loadSave, markNewAgainst, writeSave, type SaveData } from './game/storage';
import type { CardSet, Pull } from './game/types';

const MODE_KEY = 'historia.mode';

function loadMode(): boolean {
  try {
    return new URLSearchParams(location.search).get('mode') === 'test' || localStorage.getItem(MODE_KEY) === 'test';
  } catch {
    return false;
  }
}

export function App() {
  const [set, setSet] = useState<CardSet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('open');
  const [testMode, setTestMode] = useState(loadMode);
  const [save, setSave] = useState<SaveData>(() => accrue(loadSave()));
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}cards.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((s: CardSet) => setSet(s))
      .catch((e) => setError(String(e)));
  }, []);

  // Earn packs over time.
  useEffect(() => {
    const t = setInterval(() => {
      setNow(Date.now());
      setSave((s) => {
        const next = accrue(s);
        if (next !== s) writeSave(next);
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!testMode) setTab((t) => (t === 'showcase' ? 'open' : t));
    try {
      localStorage.setItem(MODE_KEY, testMode ? 'test' : 'normal');
    } catch {
      /* ignore */
    }
  }, [testMode]);

  const pools = useMemo(() => (set ? buildPools(set.cards) : null), [set]);
  const byId = useMemo(() => new Map(set?.cards.map((c) => [c.id, c]) ?? []), [set]);

  const canOpen = testMode || save.stock > 0;

  /** Consumes packs and records their cards (normal mode only). */
  const commitPack = useCallback(
    (pulls: Pull[], packs = 1): Pull[] => {
      if (testMode) return markNewAgainst(save, pulls);
      const res = addPulls({ ...save, stock: Math.max(0, save.stock - packs) }, pulls, packs);
      setSave(res.save);
      writeSave(res.save);
      return res.pulls;
    },
    [save, testMode],
  );

  return (
    <div className={`app ${testMode ? 'is-test' : ''}`}>
      <Header
        tab={tab}
        onTab={setTab}
        testMode={testMode}
        onTestMode={setTestMode}
        save={save}
        now={now}
        sample={!!set?.sample}
      />
      <main className="main">
        {error && <div className="notice">Impossible de charger les cartes : {error}</div>}
        {!set && !error && <div className="loading">Chargement des archives…</div>}
        {set && pools && tab === 'open' && (
          <PackOpening
            pools={pools}
            canOpen={canOpen}
            testMode={testMode}
            stock={save.stock}
            onCommit={commitPack}
            onGoBinder={() => setTab('binder')}
          />
        )}
        {set && tab === 'binder' && <Binder cards={set.cards} byId={byId} save={save} testMode={testMode} />}
        {set && tab === 'showcase' && testMode && <Showcase cards={set.cards} />}
      </main>
    </div>
  );
}
