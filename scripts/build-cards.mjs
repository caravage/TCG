#!/usr/bin/env node
/**
 * Builds public/cards.json from Wikidata + French Wikipedia.
 *
 *   1. Wikidata (SPARQL): history-related items that have an illustration (P18) and a
 *      French Wikipedia article — historical figures who died up to 2000, battles, wars,
 *      revolutions, treaties, empires, dynasties…
 *   2. Wikimedia pageviews: views of each French article over the last 12 full months.
 *   3. Keeps the TARGET most viewed articles and assigns rarity by percentile
 *      (most viewed = rarest).
 *   4. Resolves image thumbnails (Commons), signatures (P109) and alternate images.
 *
 * Usage: node scripts/build-cards.mjs [--target 3000]
 * Intermediate responses are cached in .cache/ so reruns are cheap.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const args = process.argv.slice(2);
const argVal = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};

const TARGET = Number(argVal('target', 3000));
const MAX_CANDIDATES = Number(argVal('candidates', 9000));
const UA = 'HistoriaTCG/0.1 (https://github.com/caravage/TCG; card set builder)';
const CACHE = '.cache';
const DEATH_YEAR_MAX = 2000;

// Keep in sync with src/game/rarity.ts (shares of the corpus, rarest first).
const TIERS = [
  { r: 5, share: 0.003 },
  { r: 4, share: 0.012 },
  { r: 3, share: 0.045 },
  { r: 2, share: 0.11 },
  { r: 1, share: 0.25 },
  { r: 0, share: 0.58 },
];

mkdirSync(CACHE, { recursive: true });

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchRetry(url, init = {}, { tries = 6, okStatuses = [] } = {}) {
  let wait = 2000;
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { ...init, headers: { 'User-Agent': UA, 'Api-User-Agent': UA, ...(init.headers || {}) } });
      if (res.ok || okStatuses.includes(res.status)) return res;
      if (i >= tries || (res.status < 500 && res.status !== 429)) {
        throw new Error(`HTTP ${res.status} for ${url.slice(0, 160)}: ${(await res.text()).slice(0, 300)}`);
      }
      const retryAfter = Number(res.headers.get('retry-after'));
      await sleep(retryAfter ? retryAfter * 1000 : wait);
    } catch (e) {
      if (i >= tries) throw e;
      await sleep(wait);
    }
    wait *= 2;
  }
}

function cached(name, key, fn) {
  const file = `${CACHE}/${name}-${createHash('sha1').update(key).digest('hex').slice(0, 16)}.json`;
  if (existsSync(file)) return Promise.resolve(JSON.parse(readFileSync(file, 'utf8')));
  return fn().then((v) => {
    writeFileSync(file, JSON.stringify(v));
    return v;
  });
}

async function pool(items, concurrency, fn) {
  const out = new Array(items.length);
  let next = 0;
  let done = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
      if (++done % 500 === 0) console.log(`  … ${done}/${items.length}`);
    }
  });
  await Promise.all(workers);
  return out;
}

const chunks = (arr, n) => Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

// ---------------------------------------------------------------------------
// 1. Candidates from Wikidata
// ---------------------------------------------------------------------------
const WDQS = 'https://query.wikidata.org/sparql';
const QLEVER = 'https://qlever.cs.uni-freiburg.de/api/wikidata';

const PREFIXES = `PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX schema: <http://schema.org/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
`;

async function sparql(label, query) {
  return cached('sparql', query, async () => {
    for (const endpoint of [WDQS, QLEVER]) {
      try {
        const t = Date.now();
        const res = await fetchRetry(
          endpoint,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/sparql-results+json' },
            body: new URLSearchParams({ query: PREFIXES + query }),
          },
          { tries: 3 },
        );
        const json = await res.json();
        const rows = json.results.bindings.map((b) => Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v.value])));
        console.log(`  ${label}: ${rows.length} rows via ${endpoint.includes('qlever') ? 'QLever' : 'WDQS'} (${Date.now() - t} ms)`);
        return rows;
      } catch (e) {
        console.warn(`  ${label}: ${endpoint} failed — ${String(e.message || e).slice(0, 200)}`);
      }
    }
    throw new Error(`SPARQL query "${label}" failed on every endpoint`);
  });
}

const FR_ARTICLE = `?article schema:about ?item ; schema:isPartOf <https://fr.wikipedia.org/> ; schema:name ?title .`;

// Historical figures: must hold a position, a noble title, a military rank or a
// "history-making" occupation, and have died by 2000.
const PEOPLE_GROUPS = {
  positions: '?item wdt:P39 ?x .',
  nobility: '?item wdt:P97 ?x .',
  military: '?item wdt:P410 ?x .',
  occupations: `VALUES ?x { wd:Q82955 wd:Q116 wd:Q189290 wd:Q47064 wd:Q1402561 wd:Q11900058 wd:Q3242115 wd:Q193391 wd:Q372436 wd:Q1097498 }
    ?item wdt:P106 ?x .`,
};

function peopleQuery(entry, minSitelinks) {
  return `SELECT DISTINCT ?item ?title ?sl WHERE {
    ${entry}
    ?item wikibase:sitelinks ?sl .
    FILTER(?sl >= ${minSitelinks})
    ?item wdt:P31 wd:Q5 .
    ?item wdt:P18 ?img .
    ?item wdt:P570 ?death .
    FILTER(YEAR(?death) <= ${DEATH_YEAR_MAX})
    ${FR_ARTICLE}
  }`;
}

// Events and polities (direct instances only, to keep the queries fast).
const EVENT_CLASSES = [
  'Q178561', // battle
  'Q1261499', // naval battle
  'Q188055', // siege
  'Q198', // war
  'Q103495', // world war
  'Q8465', // civil war
  'Q10931', // revolution
  'Q131569', // treaty
  'Q3024240', // historical country
  'Q48349', // empire
  'Q164950', // dynasty
  'Q8432', // civilization
  'Q45382', // coup d'état
  'Q3199915', // massacre
  'Q41397', // genocide
  'Q11514315', // historical period
  'Q13418847', // historical event
  'Q124757', // riot
  'Q645883', // military operation
  'Q831663', // military campaign
];

function eventsQuery(minSitelinks) {
  return `SELECT DISTINCT ?item ?title ?sl WHERE {
    VALUES ?cls { ${EVENT_CLASSES.map((c) => `wd:${c}`).join(' ')} }
    ?item wdt:P31 ?cls .
    ?item wikibase:sitelinks ?sl .
    FILTER(?sl >= ${minSitelinks})
    ?item wdt:P18 ?img .
    FILTER NOT EXISTS { ?item wdt:P580|wdt:P585|wdt:P571 ?d . FILTER(YEAR(?d) > ${DEATH_YEAR_MAX}) }
    ${FR_ARTICLE}
  }`;
}

async function getCandidates() {
  console.log('1. Wikidata candidates');
  const byId = new Map();
  const add = (rows, kind) => {
    for (const row of rows) {
      const id = row.item.replace('http://www.wikidata.org/entity/', '');
      const sl = Number(row.sl);
      if (!byId.has(id)) byId.set(id, { id, title: row.title, sl, kind });
    }
  };
  for (const [label, entry] of Object.entries(PEOPLE_GROUPS)) {
    add(await sparql(`people/${label}`, peopleQuery(entry, 30)), 'person');
  }
  add(await sparql('events', eventsQuery(12)), 'event');

  const all = [...byId.values()].sort((a, b) => b.sl - a.sl);
  console.log(`  → ${all.length} unique candidates (${all.filter((c) => c.kind === 'person').length} people)`);
  return all.slice(0, MAX_CANDIDATES);
}

// ---------------------------------------------------------------------------
// 2. Page views
// ---------------------------------------------------------------------------
function lastTwelveMonths() {
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0)); // last day of previous month
  const start = new Date(Date.UTC(end.getUTCFullYear() - 1, end.getUTCMonth() + 1, 1));
  const f = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
  return { start: f(start), end: f(end) };
}

async function getViews(candidates) {
  const { start, end } = lastTwelveMonths();
  console.log(`2. Page views ${start} → ${end} for ${candidates.length} articles`);
  const views = await pool(candidates, 24, async (c) => {
    const title = encodeURIComponent(c.title.replace(/ /g, '_'));
    const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/fr.wikipedia.org/all-access/user/${title}/monthly/${start}/${end}`;
    return cached('views', url, async () => {
      const res = await fetchRetry(url, {}, { okStatuses: [404] });
      if (res.status === 404) return 0;
      const json = await res.json();
      return json.items.reduce((s, it) => s + it.views, 0);
    });
  });
  candidates.forEach((c, i) => (c.views = views[i]));
  return { start, end };
}

// ---------------------------------------------------------------------------
// 3. Entity details (descriptions, images, signatures)
// ---------------------------------------------------------------------------
const ALT_IMAGE_PROPS = ['P6802', 'P2716', 'P158', 'P94', 'P41', 'P1442', 'P242'];

// Occupations that alone do not make someone a historical figure (e.g. Elvis Presley has a
// military rank). Such people are kept only with a position, a title or a history occupation.
const EXCLUDED_OCCUPATIONS = new Set([
  'Q177220', 'Q33999', 'Q10800557', 'Q10798782', 'Q2259451', 'Q639669', 'Q488205', 'Q2252262', 'Q937857',
  'Q2066131', 'Q11338576', 'Q378622', 'Q484188', 'Q16266334', 'Q4610556', 'Q245068', 'Q3665646', 'Q10833314',
  'Q2309784', 'Q2526255', 'Q3282637', 'Q753110', 'Q130857', 'Q855091',
]);
const HISTORY_OCCUPATIONS = new Set([
  'Q82955', 'Q116', 'Q189290', 'Q1402561', 'Q11900058', 'Q3242115', 'Q193391', 'Q372436', 'Q1097498',
  'Q1397808', 'Q201788',
]);

const claimFiles = (claims, prop) =>
  (claims?.[prop] || [])
    .filter((c) => c.rank !== 'deprecated' && c.mainsnak?.datavalue?.value)
    .sort((a, b) => (b.rank === 'preferred') - (a.rank === 'preferred'))
    .map((c) => c.mainsnak.datavalue.value);

function claimYear(claims, ...props) {
  for (const p of props) {
    const v = claimFiles(claims, p).find((x) => x?.time);
    const m = v && /^([+-])(\d+)-/.exec(v.time);
    if (m) return (m[1] === '-' ? -1 : 1) * Number(m[2]);
  }
  return null;
}

async function getEntities(ids) {
  console.log(`3. Wikidata entities for ${ids.length} items`);
  const out = new Map();
  await pool(chunks(ids, 50), 4, async (batch) => {
    const url = `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=descriptions|claims&languages=fr&ids=${batch.join('|')}`;
    const json = await cached('entities-v2', url, async () => {
      const res = await fetchRetry(url);
      const j = await res.json();
      // Only keep what we need, the full claims are huge.
      const slim = {};
      for (const [id, e] of Object.entries(j.entities || {})) {
        slim[id] = {
          desc: e.descriptions?.fr?.value || '',
          img: claimFiles(e.claims, 'P18'),
          sig: claimFiles(e.claims, 'P109')[0] || null,
          alt: ALT_IMAGE_PROPS.flatMap((p) => claimFiles(e.claims, p)),
          occ: claimFiles(e.claims, 'P106').map((v) => v.id),
          office: claimFiles(e.claims, 'P39').length + claimFiles(e.claims, 'P97').length > 0,
          born: claimYear(e.claims, 'P569'),
          died: claimYear(e.claims, 'P570'),
          start: claimYear(e.claims, 'P580', 'P585', 'P571'),
          end: claimYear(e.claims, 'P582', 'P576'),
        };
      }
      return slim;
    });
    for (const [id, e] of Object.entries(json)) out.set(id, e);
  });
  return out;
}

async function getThumbs(files, width) {
  const uniq = [...new Set(files.filter(Boolean))];
  console.log(`  thumbnails (${width}px) for ${uniq.length} files`);
  const out = new Map();
  await pool(chunks(uniq, 50), 4, async (batch) => {
    const titles = batch.map((f) => `File:${f}`).join('|');
    const url = `https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&prop=imageinfo&iiprop=url|mime&iiurlwidth=${width}&titles=${encodeURIComponent(titles)}`;
    const json = await cached('thumbs', url, async () => (await fetchRetry(url)).json());
    const norm = new Map((json.query?.normalized || []).map((n) => [n.to, n.from]));
    for (const page of json.query?.pages || []) {
      const info = page.imageinfo?.[0];
      if (!info?.thumburl || !/^image\//.test(info.mime || '')) continue;
      const from = (norm.get(page.title) || page.title).replace(/^File:/, '');
      out.set(from, info.thumburl);
      out.set(page.title.replace(/^File:/, ''), info.thumburl);
    }
  });
  return out;
}

async function getExtracts(titles) {
  if (!titles.length) return new Map();
  console.log(`  extracts for ${titles.length} articles without description`);
  const out = new Map();
  await pool(chunks(titles, 20), 3, async (batch) => {
    const url = `https://fr.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&prop=extracts&exintro=1&explaintext=1&exsentences=1&exlimit=20&redirects=1&titles=${encodeURIComponent(batch.join('|'))}`;
    const json = await cached('extracts', url, async () => (await fetchRetry(url)).json());
    const norm = new Map([...(json.query?.normalized || []), ...(json.query?.redirects || [])].map((n) => [n.to, n.from]));
    for (const page of json.query?.pages || []) {
      if (page.extract) out.set(norm.get(page.title) || page.title, page.extract);
    }
  });
  return out;
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------
const cleanTitle = (t) => t.replace(/\s*\([^)]*\)\s*$/, '');

function cleanDesc(d) {
  let s = (d || '').replace(/\s+/g, ' ').trim();
  if (s.length > 150) s = s.slice(0, 147).replace(/\s+\S*$/, '') + '…';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function assignRarity(cards) {
  let i = 0;
  const n = cards.length;
  let acc = 0;
  for (const tier of TIERS) {
    acc += tier.share;
    const until = tier.r === 0 ? n : Math.max(i + 1, Math.round(acc * n));
    for (; i < until && i < n; i++) cards[i].r = tier.r;
  }
}

async function main() {
  const candidates = await getCandidates();
  const period = await getViews(candidates);

  const ranked = candidates.filter((c) => c.views > 0).sort((a, b) => b.views - a.views);
  const pre = ranked.slice(0, Math.ceil(TARGET * 1.3));

  const entities = await getEntities(pre.map((c) => c.id));
  const isOffTopic = (c) => {
    const e = entities.get(c.id);
    if (!e || c.kind !== 'person') return false;
    if (e.office || e.occ.some((o) => HISTORY_OCCUPATIONS.has(o))) return false;
    return e.occ.some((o) => EXCLUDED_OCCUPATIONS.has(o));
  };
  const offTopic = pre.filter(isOffTopic);
  console.log(`  excluded ${offTopic.length} off-topic people: ${offTopic.slice(0, 15).map((c) => c.title).join(', ')}…`);
  const shortlist = pre.filter((c) => !isOffTopic(c));
  const mainThumbs = await getThumbs(shortlist.map((c) => entities.get(c.id)?.img[0]), 500);

  const withImage = shortlist.filter((c) => mainThumbs.has(entities.get(c.id)?.img[0])).slice(0, TARGET);
  console.log(`4. ${withImage.length} cards with an illustration`);

  const altFiles = withImage.map((c) => {
    const e = entities.get(c.id);
    return [...e.img.slice(1), ...e.alt].find((f) => f && f !== e.img[0]);
  });
  const altThumbs = await getThumbs(altFiles, 500);
  const sigThumbs = await getThumbs(withImage.map((c) => entities.get(c.id).sig), 400);
  const extracts = await getExtracts(withImage.filter((c) => !entities.get(c.id).desc).map((c) => c.title));

  const cards = withImage.map((c, i) => {
    const e = entities.get(c.id);
    const card = {
      id: c.id,
      n: i + 1,
      t: cleanTitle(c.title),
      d: cleanDesc(e.desc || extracts.get(c.title) || ''),
      img: mainThumbs.get(e.img[0]),
      views: c.views,
      r: 0,
      url: `https://fr.wikipedia.org/wiki/${encodeURIComponent(c.title.replace(/ /g, '_'))}`,
    };
    // Card orientation and dates for the timeline: people are portraits, events are landscapes.
    card.k = c.kind === 'person' ? 'p' : 'e';
    const y1 = c.kind === 'person' ? e.born : e.start;
    const y2 = c.kind === 'person' ? e.died : e.end;
    if (y1 != null) card.y1 = y1;
    if (y2 != null && y2 !== y1) card.y2 = y2;
    const alt = altThumbs.get(altFiles[i]);
    if (alt) card.alt = alt;
    const sig = e.sig && sigThumbs.get(e.sig);
    if (sig) card.sig = sig;
    return card;
  });
  assignRarity(cards);

  const out = { version: 2, generatedAt: new Date().toISOString(), period: `${period.start}-${period.end}`, cards };
  writeFileSync('public/cards.json', JSON.stringify(out));

  const counts = [0, 1, 2, 3, 4, 5].map((r) => cards.filter((c) => c.r === r).length);
  console.log(`\nWrote public/cards.json — ${cards.length} cards`);
  console.log(`  by rarity (C→M): ${counts.join(' / ')}`);
  console.log(`  with signature: ${cards.filter((c) => c.sig).length}, with alternate art: ${cards.filter((c) => c.alt).length}`);
  console.log(`  events (landscape): ${cards.filter((c) => c.k === 'e').length}, with dates: ${cards.filter((c) => c.y1 != null).length}`);
  console.log(`  top 10: ${cards.slice(0, 10).map((c) => `${c.t} (${c.views})`).join(', ')}`);
  console.log(`  bottom: ${cards.slice(-3).map((c) => `${c.t} (${c.views})`).join(', ')}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
