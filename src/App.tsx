import { useCallback, useEffect, useMemo, useState } from 'react';
import { Binder } from './components/Binder';
import { Header, type Tab } from './components/Header';
import { PackOpening } from './components/PackOpening';
import { Shop, type DuplicateSummary } from './components/Shop';
import { Showcase } from './components/Showcase';
import { PACK_PRICE, recycleValue } from './game/recycle';
import { buildPools } from './game/pack';
import { accrue, addPulls, buyPacks, loadSave, markNewAgainst, recycleEntry, writeSave, type SaveData } from './game/storage';
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
  const [shopOpen, setShopOpen] = useState(false);

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

  const update = useCallback((fn: (s: SaveData) => SaveData) => {
    setSave((s) => {
      const next = fn(s);
      writeSave(next);
      return next;
    });
  }, []);

  /** Value of one copy of a collection entry. */
  const entryValue = useCallback(
    (key: string, s: SaveData = save) => {
      const e = s.collection[key];
      const c = e && byId.get(e.id);
      return e && c ? recycleValue(c.r, e, e.serial) : 0;
    },
    [byId, save],
  );

  const duplicates: DuplicateSummary = useMemo(() => {
    let copies = 0;
    let value = 0;
    for (const [key, e] of Object.entries(save.collection)) {
      if (e.count > 1) {
        copies += e.count - 1;
        value += (e.count - 1) * entryValue(key);
      }
    }
    return { copies, value };
  }, [save.collection, entryValue]);

  const recycle = useCallback(
    (key: string, n: number) => update((s) => recycleEntry(s, key, n, entryValue(key, s))),
    [update, entryValue],
  );

  /** Keeps one copy of every card in every version, recycles the identical extras. */
  const recycleDuplicates = useCallback(
    () =>
      update((s) =>
        Object.entries(s.collection).reduce(
          (acc, [key, e]) => (e.count > 1 ? recycleEntry(acc, key, e.count - 1, entryValue(key, s)) : acc),
          s,
        ),
      ),
    [update, entryValue],
  );

  const buy = useCallback((n: number) => update((s) => buyPacks(s, n, PACK_PRICE)), [update]);

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
        onShop={() => setShopOpen(true)}
      />
      {shopOpen && !testMode && (
        <Shop
          parchments={save.parchments}
          duplicates={duplicates}
          onBuy={buy}
          onRecycleDuplicates={recycleDuplicates}
          onClose={() => setShopOpen(false)}
        />
      )}
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
        {set && tab === 'binder' && (
          <Binder
            cards={set.cards}
            byId={byId}
            save={save}
            testMode={testMode}
            duplicates={duplicates}
            entryValue={entryValue}
            onRecycle={recycle}
            onRecycleDuplicates={recycleDuplicates}
            onShop={() => setShopOpen(true)}
          />
        )}
        {set && tab === 'showcase' && testMode && <Showcase cards={set.cards} />}
      </main>
    </div>
  );
}
