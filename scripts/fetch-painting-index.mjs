#!/usr/bin/env node
/*
 * Fetch a list of ~1500 famous painting titles from Wikidata for the
 * autocomplete dropdown. The query orders by number of sitelinks (how many
 * Wikipedia editions cover the work) as a fame proxy, so the top of the list
 * is dominated by canonical works. The 12 catalogue paintings from
 * assets/game.js are merged in unconditionally so the answer is always in the
 * dropdown.
 *
 * Run from repo root: node scripts/fetch-painting-index.mjs
 * Output: assets/painting-index.json (sorted alphabetically, deduped)
 */

import { writeFile } from 'node:fs/promises';

const ENDPOINT = 'https://query.wikidata.org/sparql';
const UA = 'Brushstroke/1.0 (https://github.com/nikrich/brushstroke; jannik811@gmail.com)';

const SPARQL = `
SELECT DISTINCT ?paintingLabel WHERE {
  ?painting wdt:P31 wd:Q3305213 .
  ?painting wikibase:sitelinks ?sitelinks .
  FILTER(?sitelinks >= 6)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en" . }
}
ORDER BY DESC(?sitelinks)
LIMIT 2000
`;

// The 12 catalogue titles — must be in the index regardless of what Wikidata returns.
const CATALOGUE = [
  'The Starry Night',
  'The Great Wave off Kanagawa',
  'Girl with a Pearl Earring',
  'The Scream',
  'American Gothic',
  'Mona Lisa',
  'The Birth of Venus',
  'The Kiss',
  'A Sunday on La Grande Jatte',
  'Café Terrace at Night',
  'Wanderer above the Sea of Fog',
  'Las Meninas',
];

function cleanTitle(s) {
  if (!s) return null;
  let t = s.trim();
  // Strip Wikidata Q-id labels (rdfs:label fallback when no English name)
  if (/^Q\d+$/.test(t)) return null;
  // Strip trailing parenthetical disambiguators: "Mona Lisa (1503)" → "Mona Lisa"
  t = t.replace(/\s*\([^)]*\)\s*$/, '').trim();
  // Drop empties + things that are obviously not titles
  if (t.length < 2 || t.length > 120) return null;
  if (/^\d+$/.test(t)) return null;
  return t;
}

async function main() {
  process.stdout.write('Querying Wikidata SPARQL endpoint... ');
  const url = `${ENDPOINT}?query=${encodeURIComponent(SPARQL)}&format=json`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json' } });
  if (!res.ok) throw new Error(`SPARQL ${res.status} ${res.statusText}`);
  const json = await res.json();
  const rows = json.results.bindings;
  process.stdout.write(`${rows.length} rows\n`);

  const seen = new Map(); // lowercase -> canonical-cased title
  let kept = 0;
  let dropped = 0;
  for (const r of rows) {
    const cleaned = cleanTitle(r.paintingLabel?.value);
    if (!cleaned) { dropped++; continue; }
    const key = cleaned.toLowerCase();
    if (seen.has(key)) { dropped++; continue; }
    seen.set(key, cleaned);
    kept++;
  }

  // Merge catalogue titles (idempotent — already-present ones are no-ops)
  let added = 0;
  for (const t of CATALOGUE) {
    const key = t.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, t);
      added++;
    }
  }

  const titles = Array.from(seen.values()).sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));

  const out = 'assets/painting-index.json';
  await writeFile(out, JSON.stringify(titles, null, 0) + '\n');
  console.log(`Wrote ${titles.length} titles to ${out}`);
  console.log(`  ${kept} from Wikidata, ${dropped} dropped (dupes/garbage), ${added} catalogue titles added`);

  // Verify every catalogue title is present
  const missing = CATALOGUE.filter(t => !seen.has(t.toLowerCase()));
  if (missing.length) {
    console.error('MISSING from index:', missing);
    process.exit(2);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
