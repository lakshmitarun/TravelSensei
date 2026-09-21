import fs from 'fs';
import path from 'path';

const envContent = fs.readFileSync(path.resolve('.env.local'), 'utf-8');
let apiKey = '';
let baseUrl = 'https://api.railradar.in/v1';

for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed.startsWith('RAILRADAR_API_KEY=')) apiKey = trimmed.split('=')[1].trim();
  if (trimmed.startsWith('RAILRADAR_API_BASE_URL=')) baseUrl = trimmed.split('=')[1].trim();
}

const NON_PASSENGER_NAME_PATTERNS = [
  /\bsiding\b/i,
  /\bsdg\b/i,
  /\/sdg\b/i,
  /\bcabin\b/i,
  /\bpanel\b/i,
  /\bgoods\b/i,
  /\byard\b/i,
  /\bmarshalling\b/i,
  /\bloco shed\b/i,
  /\bdepot\b/i,
  /\basbestos\b/i,
  /\bindustries\b/i,
  /\bprivate limited\b/i,
  /\bpvt ltd\b/i,
  /\bfci\b/i,
  /\bworkshop\b/i,
];

function isPassengerStation(station) {
  if (station.isActive === false) return false;
  const code = (station.code || station.stationCode || '').toUpperCase().trim();
  if (code.startsWith('XX-')) return false;
  const name = (station.name || station.stationName || '').trim();
  if (NON_PASSENGER_NAME_PATTERNS.some(p => p.test(name))) return false;
  return true;
}

const METROPOLITAN_CLUSTER_ALIASES = {
  hyderabad: ['Secunderabad', 'Kacheguda'],
  secunderabad: ['Hyderabad', 'Kacheguda'],
  delhi: ['Nizamuddin', 'New Delhi'],
  'new delhi': ['Nizamuddin', 'Delhi'],
  kolkata: ['Howrah', 'Sealdah'],
  howrah: ['Kolkata', 'Sealdah'],
  mumbai: ['Bandra', 'Kurla'],
  chennai: ['Tambaram'],
  bangalore: ['Yesvantpur'],
  bengaluru: ['Yesvantpur'],
};

const MAJOR_NATIONAL_HUBS = new Set([
  'NDLS', 'NZM', 'DLI', 'ANVT',
  'SC', 'HYB', 'KCG',
  'CSMT', 'MMCT', 'BDTS', 'LTT',
  'HWH', 'SDAH',
  'MAS', 'MS',
  'SBC', 'YPR',
  'NGP', 'BPL', 'ET', 'CNB', 'PRYJ', 'DDU', 'BZA', 'BRC', 'RTM', 'PUNE', 'GTL'
]);

function scoreStation(station, query) {
  let score = 0;
  const q = query.toLowerCase().trim();
  const code = station.code.toUpperCase();
  const name = station.name.toLowerCase();
  const city = (station.city || '').toLowerCase();

  if (station.isActive === true) score += 30;
  if (typeof station.popularity === 'number' && station.popularity > 0) {
    score += Math.min(50, station.popularity * 5);
  }
  if (MAJOR_NATIONAL_HUBS.has(code)) score += 50;

  if (code === q.toUpperCase()) {
    score += 150;
  } else if (code.startsWith(q.toUpperCase())) {
    score += 40;
  }

  if (name === q) {
    score += 80;
  } else if (name.startsWith(q)) {
    score += 45;
  } else if (name.includes(q)) {
    score += 25;
  }

  if (city === q) {
    score += 35;
  } else if (city.includes(q)) {
    score += 15;
  }

  if (/\b(central|terminus|termini)\b/i.test(name)) {
    score += 40;
  } else if (/\b(jn|junction)\b/i.test(name)) {
    score += 30;
  }

  if (name.includes('new delhi') || code === 'NDLS') {
    score += 45;
  } else if (name === 'delhi jn' || code === 'DLI') {
    score += 35;
  } else if (name.includes('nizamuddin') || code === 'NZM') {
    score += 35;
  }

  if (name.includes('cantt') || name.includes('cantonment') || code === 'DEC') {
    score += 5;
  }

  if (name.includes('halt')) {
    score -= 40;
  }

  return score;
}

const rawCache = new Map();

async function fetchFromRailRadar(term) {
  if (rawCache.has(term.toLowerCase())) return rawCache.get(term.toLowerCase());
  const url = `${baseUrl}/lookup/search/stations?q=${encodeURIComponent(term)}&limit=40`;
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' }
  });
  if (!res.ok) return [];
  const json = await res.json();
  const list = Array.isArray(json) ? json : json.data || [];
  rawCache.set(term.toLowerCase(), list);
  return list;
}

async function searchStationsLogic(query, limit = 10) {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const rawResults = await fetchFromRailRadar(trimmed);
  const combined = [...rawResults];

  const aliases = METROPOLITAN_CLUSTER_ALIASES[trimmed.toLowerCase()];
  if (aliases && aliases.length > 0) {
    for (const alias of aliases) {
      const aliasResults = await fetchFromRailRadar(alias);
      combined.push(...aliasResults);
    }
  }

  const seenCodes = new Set();
  const deduped = [];
  for (const s of combined) {
    const code = (s.code || s.stationCode || '').toUpperCase().trim();
    if (code && !seenCodes.has(code)) {
      seenCodes.add(code);
      deduped.push(s);
    }
  }

  const passengerStations = deduped.filter(isPassengerStation);

  const normalized = passengerStations.map(s => ({
    code: (s.code || s.stationCode || '').toUpperCase().trim(),
    name: (s.name || s.stationName || '').trim(),
    city: s.city ? s.city.trim() : undefined,
    state: s.state ? s.state.trim() : undefined,
    popularity: typeof s.popularity === 'number' ? s.popularity : 0,
    isActive: typeof s.isActive === 'boolean' ? s.isActive : true,
  }));

  normalized.sort((a, b) => scoreStation(b, trimmed) - scoreStation(a, trimmed));

  return normalized.slice(0, limit);
}

async function runTests() {
  console.log('--- Test 1: Search "Hyderabad" ---');
  const hydResults = await searchStationsLogic('Hyderabad', 5);
  console.log('Results count:', hydResults.length);
  hydResults.forEach((s, idx) => console.log(`${idx + 1}. [${s.code}] ${s.name} (${s.city})`));

  const hasHYSG = hydResults.some(s => s.code === 'HYSG');
  console.log('Contains HYSG?', hasHYSG ? 'FAIL: HYSG found' : 'PASS: HYSG excluded');

  const hasSC = hydResults.some(s => s.code === 'SC');
  const hasHYB = hydResults.some(s => s.code === 'HYB');
  const hasKCG = hydResults.some(s => s.code === 'KCG');
  console.log('Contains SC?', hasSC, '| Contains HYB?', hasHYB, '| Contains KCG?', hasKCG);

  console.log('\n--- Test 2: Search "Delhi" ---');
  const delhiResults = await searchStationsLogic('Delhi', 5);
  console.log('Results count:', delhiResults.length);
  delhiResults.forEach((s, idx) => console.log(`${idx + 1}. [${s.code}] ${s.name} (${s.city})`));

  const hasNDLS = delhiResults.some(s => s.code === 'NDLS');
  const hasDLI = delhiResults.some(s => s.code === 'DLI');
  const hasNZM = delhiResults.some(s => s.code === 'NZM');
  const decIndex = delhiResults.findIndex(s => s.code === 'DEC');
  console.log('Contains NDLS?', hasNDLS, '| Contains DLI?', hasDLI, '| Contains NZM?', hasNZM);
  console.log('Is DEC prioritized as primary?', decIndex === 0 ? 'FAIL: DEC is #1' : 'PASS: DEC is not #1 (rank: ' + (decIndex === -1 ? 'outside top 5' : '#' + (decIndex + 1)) + ')');

  console.log('\n--- Test 3: Search "HYSG" directly ---');
  const hysgDirect = await searchStationsLogic('HYSG', 5);
  console.log('Searching "HYSG" returns:', hysgDirect.map(s => s.code));
  console.log('Is inactive HYSG excluded?', !hysgDirect.some(s => s.code === 'HYSG') ? 'PASS' : 'FAIL');
}

runTests();
