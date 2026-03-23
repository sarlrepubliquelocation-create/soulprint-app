/**
 * test-r26-sprints.ts — Simulation complète des 3 sprints R26
 * Sprint 1 : Phases lunaires (NL/PL)
 * Sprint 2 : Progressions secondaires
 * Sprint 3 : Retour lunaire mensuel
 *
 * Usage : npx ts-node --esm test-r26-sprints.ts
 */

import { getUpcomingLunarPhases } from './src/engines/moon';
import { calcProgressions } from './src/engines/progressions';
import { calcLunarReturn } from './src/engines/lunar-return';
import { calcChart, SIGNS } from './src/engines/astrology';

// === Profils de test (villes françaises) ===
const PROFILES = [
  { name: 'Jérôme (Paris)',    bd: '1982-09-15', lat: 48.8566, lon: 2.3522,  city: 'Paris' },
  { name: 'Marie (Lyon)',      bd: '1990-03-21', lat: 45.7640, lon: 4.8357,  city: 'Lyon' },
  { name: 'Paul (Marseille)',  bd: '1975-12-25', lat: 43.2965, lon: 5.3698,  city: 'Marseille' },
  { name: 'Sophie (Toulouse)', bd: '1998-07-04', lat: 43.6047, lon: 1.4442,  city: 'Toulouse' },
  { name: 'Lucas (Lille)',     bd: '2000-01-01', lat: 50.6292, lon: 3.0573,  city: 'Lille' },
];

const today = new Date('2026-03-20T14:00:00Z');

let passed = 0;
let failed = 0;
const errors: string[] = [];

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++;
  } else {
    failed++;
    errors.push(`❌ ${msg}`);
  }
}

console.log('═══════════════════════════════════════');
console.log('  SIMULATION R26 — 3 SPRINTS');
console.log('═══════════════════════════════════════\n');

// ── Sprint 1 : Phases lunaires ──
console.log('── SPRINT 1 : Phases lunaires (NL/PL) ──\n');

// Test 1.1 : getUpcomingLunarPhases retourne 2 résultats
const phases = getUpcomingLunarPhases(today, 'Vierge');
assert(phases.length === 2, `S1.1 — Doit retourner 2 phases, reçu ${phases.length}`);

// Test 1.2 : On a bien une NL et une PL
const types = phases.map(p => p.type);
assert(types.includes('new_moon'), 'S1.2a — Doit contenir une Nouvelle Lune');
assert(types.includes('full_moon'), 'S1.2b — Doit contenir une Pleine Lune');

// Test 1.3 : Les dates sont dans le futur
for (const p of phases) {
  assert(p.date.getTime() > today.getTime(), `S1.3 — ${p.type} doit être dans le futur (${p.date.toISOString()})`);
  assert(p.daysUntil > 0, `S1.3b — daysUntil > 0, reçu ${p.daysUntil}`);
  assert(p.daysUntil <= 30, `S1.3c — daysUntil ≤ 30 (cycle lunaire), reçu ${p.daysUntil}`);
}

// Test 1.4 : Signe valide
for (const p of phases) {
  assert(p.signFr.length > 0, `S1.4a — signFr non vide pour ${p.type}`);
  assert(p.degInSign >= 0 && p.degInSign < 30, `S1.4b — degInSign dans [0,30) : ${p.degInSign}`);
}

// Test 1.5 : Maison natale calculée (on a passé ascSign='Vierge')
for (const p of phases) {
  assert(p.natalHouse !== null && p.natalHouse >= 1 && p.natalHouse <= 12,
    `S1.5 — natalHouse dans [1,12] pour ${p.type}, reçu ${p.natalHouse}`);
}

// Test 1.6 : Sans ASC → natalHouse null
const phasesNoAsc = getUpcomingLunarPhases(today, null);
for (const p of phasesNoAsc) {
  assert(p.natalHouse === null, `S1.6 — Sans ASC, natalHouse doit être null, reçu ${p.natalHouse}`);
}

// Test 1.7 : Plusieurs mois — vérifier que les dates avancent
const months = ['2026-01-15', '2026-04-15', '2026-07-15', '2026-10-15'];
for (const m of months) {
  const d = new Date(m + 'T12:00:00Z');
  const ph = getUpcomingLunarPhases(d, 'Bélier');
  assert(ph.length === 2, `S1.7 — ${m} : 2 phases, reçu ${ph.length}`);
  for (const p of ph) {
    assert(p.date.getTime() > d.getTime(), `S1.7b — ${m} ${p.type} dans le futur`);
  }
}

console.log(`Sprint 1 : ${phases.length} phases trouvées`);
phases.forEach(p => {
  console.log(`  ${p.type === 'new_moon' ? '🌑 NL' : '🌕 PL'} ${p.signFr} ${p.degInSign}° — ${p.date.toLocaleDateString('fr-FR')} (dans ${p.daysUntil}j) — Maison ${p.natalHouse}`);
});

// ── Sprint 2 : Progressions secondaires ──
console.log('\n── SPRINT 2 : Progressions secondaires ──\n');

for (const prof of PROFILES) {
  const [by, bm, bday] = prof.bd.split('-').map(Number);
  const astro = calcChart(by, bm, bday, 12, 0, prof.lat, prof.lon);

  const prog = calcProgressions(prof.bd, today, astro);

  // Test 2.1 : Résultat non null
  assert(prog !== null, `S2.1 — ${prof.name} : progressions non null`);

  // Test 2.2 : Soleil progressé — signe valide
  assert(SIGNS.includes(prog.progressed.sunSign), `S2.2 — ${prof.name} : sunSign valide (${prog.progressed.sunSign})`);

  // Test 2.3 : Lune progressée — signe valide
  assert(SIGNS.includes(prog.progressed.moonSign), `S2.3 — ${prof.name} : moonSign valide (${prog.progressed.moonSign})`);

  // Test 2.4 : Mars progressé — signe valide
  assert(SIGNS.includes(prog.progressed.marsSign), `S2.4 — ${prof.name} : marsSign valide (${prog.progressed.marsSign})`);

  // Test 2.5 : Longitudes dans [0, 360)
  assert(prog.progressed.sunLongitude >= 0 && prog.progressed.sunLongitude < 360,
    `S2.5a — ${prof.name} : sunLong dans [0,360) : ${prog.progressed.sunLongitude}`);
  assert(prog.progressed.moonLongitude >= 0 && prog.progressed.moonLongitude < 360,
    `S2.5b — ${prof.name} : moonLong dans [0,360) : ${prog.progressed.moonLongitude}`);

  // Test 2.6 : Score total dans le cap
  assert(prog.totalScore >= -15 && prog.totalScore <= 15,
    `S2.6 — ${prof.name} : totalScore dans [-15,15] : ${prog.totalScore}`);

  // Test 2.7 : progressionsScore dans le cap ±16
  assert(prog.progressionsScore >= -16 && prog.progressionsScore <= 16,
    `S2.7 — ${prof.name} : progressionsScore dans [-16,16] : ${prog.progressionsScore}`);

  // Test 2.8 : solarArcScore dans le cap ±8
  assert(prog.solarArcScore >= -8 && prog.solarArcScore <= 8,
    `S2.8 — ${prof.name} : solarArcScore dans [-8,8] : ${prog.solarArcScore}`);

  // Test 2.9 : Cache fonctionne (2e appel = même cacheKey)
  const prog2 = calcProgressions(prof.bd, today, astro);
  assert(prog2.cacheKey === prog.cacheKey, `S2.9 — ${prof.name} : cache key identique`);

  console.log(`  ${prof.name} : ☀ ${prog.progressed.sunSign} ☽ ${prog.progressed.moonSign} ♂ ${prog.progressed.marsSign} | Score: ${prog.totalScore} | Aspects: ${prog.aspects.length} | SA: ${prog.solarArcAspects.length}`);
}

// ── Sprint 3 : Retour lunaire ──
console.log('\n── SPRINT 3 : Retour lunaire mensuel ──\n');

for (const prof of PROFILES) {
  const [by, bm, bday] = prof.bd.split('-').map(Number);
  const astro = calcChart(by, bm, bday, 12, 0, prof.lat, prof.lon);

  const lr = calcLunarReturn(astro, today, prof.city);

  // Test 3.1 : Résultat non null
  assert(lr !== null, `S3.1 — ${prof.name} : lunarReturn non null`);

  // Test 3.2 : lrDate dans le passé récent (< 28 jours)
  if (lr.lrDate) {
    const daysSince = (today.getTime() - lr.lrDate.getTime()) / 86400000;
    assert(daysSince >= 0 && daysSince <= 28,
      `S3.2 — ${prof.name} : dernier LR il y a ${daysSince.toFixed(1)}j (doit être 0-28)`);
  } else {
    assert(false, `S3.2 — ${prof.name} : lrDate est null`);
  }

  // Test 3.3 : daysUntilNext dans [0, 28]
  assert(lr.daysUntilNext >= 0 && lr.daysUntilNext <= 28,
    `S3.3 — ${prof.name} : daysUntilNext dans [0,28] : ${lr.daysUntilNext}`);

  // Test 3.4 : moonSignFr non vide
  assert(lr.moonSignFr.length > 0, `S3.4 — ${prof.name} : moonSignFr non vide (${lr.moonSignFr})`);

  // Test 3.5 : lrAsc calculé (on passe birthCity)
  if (lr.lrAsc) {
    assert(lr.lrAsc.longitude >= 0 && lr.lrAsc.longitude < 360,
      `S3.5a — ${prof.name} : ASC LR longitude dans [0,360) : ${lr.lrAsc.longitude}`);
    assert(lr.lrAsc.natalHouse >= 1 && lr.lrAsc.natalHouse <= 12,
      `S3.5b — ${prof.name} : ASC LR maison dans [1,12] : ${lr.lrAsc.natalHouse}`);
    assert(lr.lrAsc.signFr.length > 0, `S3.5c — ${prof.name} : signFr non vide`);
    assert(lr.lrAsc.theme.length > 0, `S3.5d — ${prof.name} : theme non vide`);
  } else {
    assert(false, `S3.5 — ${prof.name} : lrAsc est null`);
  }

  // Test 3.6 : Vérifier que la Lune est bien revenue à sa position natale au moment du LR
  if (lr.lrDate) {
    // Importation inline via astrology
    const { getPlanetLongitudeForDate } = await import('./src/engines/astrology');
    const moonPl = astro.pl.find(p => p.k === 'moon');
    if (moonPl) {
      const natalMoonLong = SIGNS.indexOf(moonPl.s) * 30 + moonPl.d;
      const lrMoonLong = getPlanetLongitudeForDate('moon', lr.lrDate);
      let diff = Math.abs(lrMoonLong - natalMoonLong);
      if (diff > 180) diff = 360 - diff;
      assert(diff < 1.0, `S3.6 — ${prof.name} : Lune au LR = ${lrMoonLong.toFixed(2)}° vs natal ${natalMoonLong.toFixed(2)}° (diff ${diff.toFixed(2)}° < 1°)`);
    }
  }

  if (lr.lrDate && lr.lrAsc) {
    console.log(`  ${prof.name} : LR ${lr.lrDate.toLocaleDateString('fr-FR')} | ${lr.moonSignFr} | ASC LR: ${lr.lrAsc.signFr} ${lr.lrAsc.degInSign}° → M${lr.lrAsc.natalHouse} (${lr.lrAsc.theme}) | Prochain: ${lr.daysUntilNext}j`);
  } else {
    console.log(`  ${prof.name} : LR ${lr.lrDate?.toLocaleDateString('fr-FR') || 'null'} | ${lr.moonSignFr} | ASC: null`);
  }
}

// ── RÉSUMÉ ──
console.log('\n═══════════════════════════════════════');
console.log(`  RÉSULTAT : ${passed} passés, ${failed} échoués`);
console.log('═══════════════════════════════════════');

if (errors.length > 0) {
  console.log('\nErreurs :');
  errors.forEach(e => console.log(`  ${e}`));
}

process.exit(failed > 0 ? 1 : 0);
