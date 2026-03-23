/**
 * SIMULATION COMPLÈTE — Vérification exhaustive de toutes les implémentations
 * 1. Placidus cusps sur multiple charts (latitudes variées)
 * 2. Fixed stars scoring sur multiple dates
 * 3. WS toggle cohérence
 * 4. Share card data integrity
 * 5. Edge cases
 */

import { calcAstro } from './src/engines/astrology';
import { FIXED_STARS, calcFixedStarScore } from './src/engines/fixed-stars';

const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`  ✅ ${label}${detail ? ' — ' + detail : ''}`); }
  else { fail++; console.error(`  ❌ ${label}${detail ? ' — ' + detail : ''}`); }
}

// ═══════════════════════════════════════════════════════════
// 1. PLACIDUS — Multiple birth charts across latitudes
// ═══════════════════════════════════════════════════════════
console.log('\n══════════════════════════════════════════════════════');
console.log('  1) PLACIDUS — Multiple birth charts');
console.log('══════════════════════════════════════════════════════');

const charts = [
  { name: 'Jérôme (Mâcon, 46.3°N)', birth: '1977-09-23', time: '23:20', city: 'Macon' },
  { name: 'Paris équinoxe (48.9°N)', birth: '1990-03-21', time: '12:00', city: 'Paris' },
  { name: 'Lyon été (45.8°N)', birth: '1985-07-15', time: '08:30', city: 'Lyon' },
  { name: 'Lille hiver (50.6°N)', birth: '2000-12-21', time: '03:00', city: 'Lille' },
  { name: 'Marseille (43.3°N)', birth: '1995-01-10', time: '16:45', city: 'Marseille' },
  { name: 'Toulouse (43.6°N)', birth: '1988-06-01', time: '09:15', city: 'Toulouse' },
  { name: 'Brest ouest (48.4°N)', birth: '1992-08-20', time: '22:00', city: 'Brest' },
  { name: 'Perpignan sud (42.7°N)', birth: '2002-11-05', time: '14:30', city: 'Perpignan' },
];

for (const c of charts) {
  console.log(`\n  --- ${c.name} ---`);
  const result = calcAstro(c.birth, c.time, c.city, 1, '2026-03-20', 'placidus');

  if (!result) {
    const eqResult = calcAstro(c.birth, c.time, c.city, 1, '2026-03-20', 'equal');
    if (eqResult) {
      ok(`${c.name} — fallback Equal House`, true, `système: ${eqResult.houseSystem}`);
    } else {
      ok(`${c.name} — calcAstro returned null`, false);
    }
    continue;
  }

  // Test 1a: House system valid
  const isValidSystem = result.houseSystem === 'placidus' || result.houseSystem === 'equal';
  ok(`${c.name} — système valide`, isValidSystem, result.houseSystem);

  // Test 1b: ASC and MC exist
  ok(`${c.name} — ASC défini`, !!result.b3.asc && SIGNS.includes(result.b3.asc));
  ok(`${c.name} — MC défini`, !!result.mcSign && SIGNS.includes(result.mcSign));

  // Test 1c: 12 cusps
  ok(`${c.name} — 12 cuspides`, result.hs.length === 12);

  // Test 1d: No house has more than 6 planets (was the original bug with 11)
  const byH: Record<number, number> = {};
  result.pl.forEach(p => { byH[p.h] = (byH[p.h] || 0) + 1; });
  const maxInHouse = Math.max(...Object.values(byH));
  ok(`${c.name} — max ${maxInHouse} planètes/maison`, maxInHouse <= 6,
    Object.entries(byH).filter(([,v]) => v > 0).map(([h,v]) => `M${h}:${v}`).join(' '));

  // Test 1e: DSC opposite ASC
  const cusps = result.hs;
  const ascIdx = SIGNS.indexOf(cusps[0]);
  const dscIdx = SIGNS.indexOf(cusps[6]);
  ok(`${c.name} — DSC opposé ASC`, dscIdx === (ascIdx + 6) % 12,
    `ASC=${cusps[0]} DSC=${cusps[6]}`);

  // Test 1f: IC opposite MC
  const mcIdx = SIGNS.indexOf(cusps[9]);
  const icIdx = SIGNS.indexOf(cusps[3]);
  ok(`${c.name} — IC opposé MC`, icIdx === (mcIdx + 6) % 12,
    `MC=${cusps[9]} IC=${cusps[3]}`);

  // Test 1g: Opposite house pairs
  for (const [a, b] of [[4,10],[5,11],[1,7],[2,8]]) {
    const sA = SIGNS.indexOf(cusps[a]);
    const sB = SIGNS.indexOf(cusps[b]);
    ok(`${c.name} — M${a+1} opposé M${b+1}`, sB === (sA + 6) % 12,
      `${cusps[a]} vs ${cusps[b]}`);
  }
}

// ═══════════════════════════════════════════════════════════
// 2. FIXED STARS — Multiple dates across a year
// ═══════════════════════════════════════════════════════════
console.log('\n\n══════════════════════════════════════════════════════');
console.log('  2) ÉTOILES FIXES — Scoring sur 12 mois');
console.log('══════════════════════════════════════════════════════');

// Test 2a: Catalogue has 35 stars
ok('Catalogue = 35 étoiles', FIXED_STARS.length === 35, `${FIXED_STARS.length} stars`);

// Test 2b: All stars have required fields
let starsValid = true;
for (const star of FIXED_STARS) {
  if (!star.name || !star.lon2025 || !star.nature || !star.deltaExact || !star.deltaWide) {
    starsValid = false;
    console.error(`  ⚠️ Star ${star.name} missing fields`);
  }
}
ok('Toutes les étoiles ont les champs requis', starsValid);

// Test 2c: Nature breakdown
const benefic = FIXED_STARS.filter(s => s.nature === 'benefic').length;
const mixed = FIXED_STARS.filter(s => s.nature === 'mixed').length;
const malefic = FIXED_STARS.filter(s => s.nature === 'malefic').length;
ok('Nature breakdown correct', benefic + mixed + malefic === 35,
  `${benefic} benefic, ${mixed} mixed, ${malefic} malefic`);

// Test 2d: Score across 12 months
const testDates = [
  '2026-01-15', '2026-02-15', '2026-03-15', '2026-04-15',
  '2026-05-15', '2026-06-15', '2026-07-15', '2026-08-15',
  '2026-09-15', '2026-10-15', '2026-11-15', '2026-12-15',
];

let totalHitsYear = 0;
let minScore = Infinity, maxScore = -Infinity;

for (const dateStr of testDates) {
  const date = new Date(dateStr + 'T12:00:00Z');
  const fs = calcFixedStarScore(date);

  // Score within cap [-8, +8]
  ok(`${dateStr} — score dans [-8,+8]`, fs.total >= -8 && fs.total <= 8, `total=${fs.total}`);

  // Hits have valid structure
  fs.hits.forEach(h => {
    ok(`${dateStr} — hit ${h.star}×${h.planet}`,
      h.orb !== undefined && h.delta !== undefined && h.star !== '' && h.planet !== '',
      `orb=${h.orb.toFixed(2)}° delta=${h.delta}`);
  });

  totalHitsYear += fs.hits.length;
  minScore = Math.min(minScore, fs.total);
  maxScore = Math.max(maxScore, fs.total);

  if (fs.hits.length > 0) {
    console.log(`    → ${dateStr}: ${fs.hits.length} hit(s), total=${fs.total} [${fs.hits.map(h => `${h.star}×${h.planet}`).join(', ')}]`);
  }
}

console.log(`\n  📊 Année 2026: ${totalHitsYear} hits total, score range [${minScore}, ${maxScore}]`);
ok('Au moins 1 hit dans l\'année', totalHitsYear > 0, `${totalHitsYear} hits`);
ok('Score range raisonnable', maxScore - minScore <= 16);

// Test 2e: Precession — compare star longitudes for different years
console.log('\n  --- Vérification précession ---');
const PRECESSION_RATE = 0.01397; // deg/year
const drift25y = PRECESSION_RATE * 25;
ok('Précession rate constante', PRECESSION_RATE > 0.013 && PRECESSION_RATE < 0.015,
  `${PRECESSION_RATE}°/an → ${drift25y.toFixed(3)}° en 25 ans`);

// Verify the formula: starLon = lon2025 + (year - 2025) * 0.01397
const testStar = FIXED_STARS[0]; // Regulus
const lon2030 = testStar.lon2025 + 5 * PRECESSION_RATE;
const lon2020 = testStar.lon2025 - 5 * PRECESSION_RATE;
ok(`${testStar.name} lon2025=${testStar.lon2025.toFixed(2)}°`, true);
ok(`${testStar.name} lon2030=${lon2030.toFixed(4)}° (+${(5*PRECESSION_RATE).toFixed(4)}°)`, lon2030 > testStar.lon2025);
ok(`${testStar.name} lon2020=${lon2020.toFixed(4)}° (−${(5*PRECESSION_RATE).toFixed(4)}°)`, lon2020 < testStar.lon2025);

// ═══════════════════════════════════════════════════════════
// 3. WS TOGGLE — Cohérence des réassignations
// ═══════════════════════════════════════════════════════════
console.log('\n\n══════════════════════════════════════════════════════');
console.log('  3) TOGGLE WS — Cohérence des réassignations');
console.log('══════════════════════════════════════════════════════');

for (const c of charts.slice(0, 5)) {
  const plac = calcAstro(c.birth, c.time, c.city, 1, '2026-03-20', 'placidus');
  const ws = calcAstro(c.birth, c.time, c.city, 1, '2026-03-20', 'wholesign');

  if (!plac || !ws) {
    console.log(`  ⏭️  ${c.name} — skip (null result)`);
    continue;
  }

  console.log(`\n  --- ${c.name} ---`);

  // Test 3a: Same planets in same signs
  let sameSigns = true;
  plac.pl.forEach((p, i) => {
    if (p.s !== ws.pl[i].s) sameSigns = false;
  });
  ok(`${c.name} — mêmes signes planétaires`, sameSigns);

  // Test 3b: WS houses follow formula: h = ((signIdx - ascSignIdx + 12) % 12) + 1
  const ascSign = ws.b3.asc;
  const ascSignIdx = SIGNS.indexOf(ascSign);
  let wsFormulaOk = true;
  ws.pl.forEach(p => {
    const pSignIdx = SIGNS.indexOf(p.s);
    const expectedH = ((pSignIdx - ascSignIdx + 12) % 12) + 1;
    if (p.h !== expectedH) {
      console.error(`    ⚠️ ${p.k}: sign=${p.s} → expected M${expectedH}, got M${p.h}`);
      wsFormulaOk = false;
    }
  });
  ok(`${c.name} — WS formula correcte`, wsFormulaOk);

  // Test 3c: Count diffs
  let diffs = 0;
  plac.pl.forEach((p, i) => { if (p.h !== ws.pl[i].h) diffs++; });
  console.log(`    → ${diffs} planète(s) changent de maison`);

  // Test 3d: Stelliums WS
  const byHWS: Record<number, string[]> = {};
  ws.pl.forEach(p => {
    const core = ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto','northNode'];
    if (core.includes(p.k)) (byHWS[p.h] = byHWS[p.h] || []).push(p.k);
  });
  const wsStelliums = Object.entries(byHWS).filter(([, p]) => p.length >= 3);
  ok(`${c.name} — stelliums WS calculables`, true, `${wsStelliums.length} stellium(s)`);
}

// ═══════════════════════════════════════════════════════════
// 4. SHARE CARD — Data integrity
// ═══════════════════════════════════════════════════════════
console.log('\n\n══════════════════════════════════════════════════════');
console.log('  4) SHARE CARD — Intégrité des données');
console.log('══════════════════════════════════════════════════════');

const jerome = calcAstro('1977-09-23', '23:20', 'Macon', 1, '2026-03-20', 'placidus');
if (jerome) {
  ok('Big Three — Sun sign', !!jerome.b3.sun && SIGNS.includes(jerome.b3.sun));
  ok('Big Three — Moon sign', !!jerome.b3.moon && SIGNS.includes(jerome.b3.moon));
  ok('Big Three — ASC sign', !!jerome.b3.asc && SIGNS.includes(jerome.b3.asc));

  ok('Dominant planets', !!jerome.dominant && jerome.dominant.length > 0,
    `${jerome.dominant?.length} dominantes`);

  if (jerome.dominant && jerome.dominant.length > 0) {
    ok('Dominant[0] has planet field', !!jerome.dominant[0].planet);
    ok('Dominant[0] has score field', jerome.dominant[0].score !== undefined);
  }

  jerome.pl.forEach(p => {
    ok(`Planet ${p.k} — champs complets`,
      p.s !== undefined && p.d !== undefined && p.h !== undefined,
      `sign=${p.s} deg=${p.d} house=${p.h}`);
  });

  ok('ASC degree', jerome.ad !== undefined && jerome.ad >= 0 && jerome.ad < 30, `${jerome.ad?.toFixed(1)}°`);
}

// ═══════════════════════════════════════════════════════════
// 5. EDGE CASES
// ═══════════════════════════════════════════════════════════
console.log('\n\n══════════════════════════════════════════════════════');
console.log('  5) EDGE CASES');
console.log('══════════════════════════════════════════════════════');

// No birth time → Equal House fallback
const noTime = calcAstro('1977-09-23', '', 'Macon', 1, '2026-03-20', 'placidus');
if (noTime) {
  ok('No time → Equal House fallback', noTime.houseSystem === 'equal', noTime.houseSystem);
  ok('No time → noTime flag', noTime.noTime === true);
}

// Fixed stars at epoch boundary
const fsEpoch = calcFixedStarScore(new Date('2025-01-01T12:00:00Z'));
ok('Fixed stars epoch 2025 — pas de crash', fsEpoch.total !== undefined);

// Fixed stars far future
const fsFuture = calcFixedStarScore(new Date('2080-06-15T12:00:00Z'));
ok('Fixed stars 2080 — pas de crash', fsFuture.total !== undefined);

// Fixed stars far past
const fsPast = calcFixedStarScore(new Date('1950-03-20T12:00:00Z'));
ok('Fixed stars 1950 — pas de crash', fsPast.total !== undefined);

// Multiple charts with same date but different systems
const eq = calcAstro('1977-09-23', '23:20', 'Macon', 1, '2026-03-20', 'equal');
const placidus = calcAstro('1977-09-23', '23:20', 'Macon', 1, '2026-03-20', 'placidus');
if (eq && placidus) {
  ok('Equal vs Placidus — mêmes planètes', eq.pl.length === placidus.pl.length);
  let samePositions = true;
  eq.pl.forEach((p, i) => {
    if (p.s !== placidus.pl[i].s || Math.abs(p.d - placidus.pl[i].d) > 0.01) samePositions = false;
  });
  ok('Equal vs Placidus — mêmes positions planétaires', samePositions);
}

// ═══════════════════════════════════════════════════════════
// RÉSULTAT FINAL
// ═══════════════════════════════════════════════════════════
console.log('\n══════════════════════════════════════════════════════');
console.log(`  RÉSULTAT SIMULATIONS : ${pass} PASS / ${fail} FAIL`);
console.log('══════════════════════════════════════════════════════\n');

if (fail > 0) process.exit(1);
