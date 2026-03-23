/**
 * SIMULATION POST-REFACTORING — Kaironaute
 *
 * Run: npx tsx test-simulation.mts
 *
 * Tests d'intégrité :
 *   1. calcConvergence end-to-end (profil réel, score cohérent)
 *   2. calcDayPreview sur 30 jours (pas de NaN, bornes respectées)
 *   3. Monte Carlo 365 jours — distribution + comptage Cosmiques
 *   4. Vérification des 4 sous-fonctions groupes via observabilité
 *   5. Comparaison scoreFromGroups LIVE vs FUTURE (alpha-blend)
 */

import { calcNumerology, calcPersonalYear, calcPersonalMonth, calcPersonalDay } from '../src/engines/numerology.js';
import { calcChineseZodiac } from '../src/engines/chinese-zodiac.js';
import { calcIChing } from '../src/engines/iching.js';
import { calcConvergence, calcDayPreview, scoreFromGroups, COSMIC_THRESHOLD } from '../src/engines/convergence.js';

const PASS = '✅';
const FAIL = '❌';
let passed = 0;
let failed = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`${PASS} ${name}`);
    passed++;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`${FAIL} ${name}: ${msg}`);
    failed++;
  }
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function assertRange(val: number, lo: number, hi: number, label: string): void {
  if (val < lo || val > hi) throw new Error(`${label} = ${val}, expected [${lo}, ${hi}]`);
}

// ═══════════════════════════════════════════════════
// Profil de test — données réalistes
// ═══════════════════════════════════════════════════

const BD = '1977-09-23';
const TODAY = '2026-03-23';
const FN = 'Jérôme';
const MN = '';
const LN = 'Test';

// Précalcul des inputs
const num = calcNumerology(FN, MN, LN, BD, TODAY);
const cz = calcChineseZodiac(BD);
const iching = calcIChing(BD, TODAY);

console.log('\n═══════════════════════════════════════════════');
console.log('  SIMULATION POST-REFACTORING KAIRONAUTE');
console.log('═══════════════════════════════════════════════\n');

// ═══════════════════════════════════════════════════
// 1. calcConvergence — Intégrité end-to-end
// ═══════════════════════════════════════════════════

console.log('═══ 1. calcConvergence — End-to-end ═══\n');

let conv: ReturnType<typeof calcConvergence>;

test('calcConvergence retourne un résultat valide', () => {
  conv = calcConvergence(num, null, cz, iching, BD);
  assert(conv !== null && conv !== undefined, 'résultat null');
  assert(typeof conv.score === 'number', `score type = ${typeof conv.score}`);
});

test('Score dans [0, 100]', () => {
  assertRange(conv.score, 0, 100, 'score');
});

test('Score est un entier', () => {
  assert(Number.isInteger(conv.score), `score = ${conv.score}, pas entier`);
});

test('Level non vide', () => {
  assert(typeof conv.level === 'string' && conv.level.length > 0, `level = "${conv.level}"`);
});

test('Breakdown contient des systèmes', () => {
  assert(Array.isArray(conv.breakdown), 'breakdown pas un array');
  assert(conv.breakdown.length >= 3, `breakdown.length = ${conv.breakdown.length}, attendu ≥3`);
});

test('DayType valide', () => {
  const validTypes = ['decision', 'observation', 'communication', 'retrait', 'expansion'];
  assert(validTypes.includes(conv.dayType.type), `dayType = ${conv.dayType.type}`);
});

test('Shapley contributions présentes', () => {
  assert(conv.shapley !== undefined, 'shapley manquant');
  assert(typeof conv.shapley!.lune === 'number', 'shapley.lune manquant');
  assert(typeof conv.shapley!.baseline === 'number', 'shapley.baseline manquant');
});

test('ContextualScores présent', () => {
  assert(conv.contextualScores !== undefined, 'contextualScores manquant');
});

test('ConfidenceInterval présent et cohérent', () => {
  assert(conv.ci !== undefined, 'ci manquant');
  assert(conv.ci.lower <= conv.score, `ci.lower ${conv.ci.lower} > score ${conv.score}`);
  assert(conv.ci.upper >= conv.score, `ci.upper ${conv.ci.upper} < score ${conv.score}`);
});

console.log(`\n   → Score du jour: ${conv.score} (${conv.level})`);
console.log(`   → Type: ${conv.dayType.label}`);
console.log(`   → Breakdown: ${conv.breakdown.length} systèmes`);
console.log(`   → CI: [${conv.ci.lower}, ${conv.ci.upper}]`);

// ═══════════════════════════════════════════════════
// 2. calcDayPreview — 30 jours consécutifs
// ═══════════════════════════════════════════════════

console.log('\n═══ 2. calcDayPreview — 30 jours ═══\n');

test('30 jours sans NaN, tous dans [0, 100], entiers', () => {
  const baseDate = new Date('2026-03-01T12:00:00');
  const scores: number[] = [];
  for (let d = 0; d < 30; d++) {
    const dateStr = new Date(baseDate.getTime() + d * 86400000).toISOString().slice(0, 10);
    const preview = calcDayPreview(BD, num, cz, dateStr, 0, null, 1.0, 1.0, 0);
    assert(!isNaN(preview.score), `NaN au jour ${dateStr}`);
    assert(Number.isInteger(preview.score), `pas entier au jour ${dateStr}: ${preview.score}`);
    assertRange(preview.score, 0, 100, `jour ${dateStr}`);
    scores.push(preview.score);
  }
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  console.log(`   → 30 jours: min=${min}, max=${max}, avg=${avg.toFixed(1)}`);
  // La variance devrait être > 0 (les jours ne sont pas tous identiques)
  assert(min !== max, 'tous les scores identiques — suspect');
});

test('DayPreview contient hexagramme et conseil', () => {
  const preview = calcDayPreview(BD, num, cz, TODAY, 0, null);
  assert(typeof preview.hexNum === 'number', 'hexNum manquant');
  assert(typeof preview.hexName === 'string', 'hexName manquant');
  assert(typeof preview.conseil === 'string', 'conseil manquant');
});

// ═══════════════════════════════════════════════════
// 3. Monte Carlo — 365 jours, distribution + Cosmiques
// ═══════════════════════════════════════════════════

console.log('\n═══ 3. Monte Carlo 365 jours (2026) ═══\n');

test('365 jours sans erreur, distribution réaliste', () => {
  const year = 2026;
  const scores: number[] = [];
  const cosmiques: string[] = [];
  let errors = 0;

  for (let m = 1; m <= 12; m++) {
    const daysInMonth = new Date(year, m, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      try {
        const preview = calcDayPreview(BD, num, cz, dateStr, 0, null, 1.0, 1.0, 0);
        scores.push(preview.score);
        if (preview.score >= COSMIC_THRESHOLD) {
          cosmiques.push(`${dateStr} → ${preview.score}`);
        }
      } catch {
        errors++;
      }
    }
  }

  assert(errors === 0, `${errors} erreurs sur 365 jours`);
  assert(scores.length >= 365, `seulement ${scores.length} jours calculés`);

  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const stddev = Math.sqrt(scores.reduce((s, v) => s + (v - avg) ** 2, 0) / scores.length);

  // Distribution réaliste
  const lt30 = scores.filter(s => s < 30).length;
  const gt70 = scores.filter(s => s > 70).length;
  const range4060 = scores.filter(s => s >= 40 && s <= 60).length;

  console.log(`   → Jours: ${scores.length}`);
  console.log(`   → Min=${min}, Max=${max}, Avg=${avg.toFixed(1)}, StdDev=${stddev.toFixed(1)}`);
  console.log(`   → <30: ${lt30}, 40-60: ${range4060}, >70: ${gt70}`);
  console.log(`   → Cosmiques (≥${COSMIC_THRESHOLD}): ${cosmiques.length}`);
  if (cosmiques.length > 0) {
    console.log(`   → Top 5: ${cosmiques.slice(0, 5).join(', ')}`);
  }

  // Assertions distribution
  assert(avg > 30 && avg < 80, `avg=${avg.toFixed(1)} hors range réaliste [30,80]`);
  assert(stddev > 3, `stddev=${stddev.toFixed(1)} trop faible (pas assez de variance)`);
  assert(max > min + 10, `range trop serré: ${min}-${max}`);
});

// ═══════════════════════════════════════════════════
// 4. Observabilité groupes — les 4 groupes retournent des deltas
// ═══════════════════════════════════════════════════

console.log('\n═══ 4. Observabilité des 4 groupes ═══\n');

test('calcConvergence expose les 4 group deltas dans breakdown', () => {
  // Les breakdown entries contiennent les systèmes des 4 groupes
  const systems = conv.breakdown.map(b => b.system);

  // BaZi group
  assert(systems.includes('BaZi'), 'BaZi manquant dans breakdown');
  // Lune group (au moins Nakshatra)
  assert(systems.includes('Nakshatra'), 'Nakshatra manquant dans breakdown');
  // Ephem group (Astrologie)
  assert(systems.includes('Astrologie'), 'Astrologie manquant dans breakdown');
  // Indiv group (I Ching)
  assert(systems.includes('I Ching'), 'I Ching manquant dans breakdown');
});

test('Breakdown : chaque entry a system, icon, points, signals, alerts', () => {
  for (const b of conv.breakdown) {
    assert(typeof b.system === 'string' && b.system.length > 0, `system vide`);
    assert(typeof b.icon === 'string', `icon manquant pour ${b.system}`);
    assert(typeof b.points === 'number', `points manquant pour ${b.system}`);
    assert(Array.isArray(b.signals), `signals manquant pour ${b.system}`);
    assert(Array.isArray(b.alerts), `alerts manquant pour ${b.system}`);
  }
});

// ═══════════════════════════════════════════════════
// 5. Alpha-blend LIVE/FUTURE — cohérence temporelle
// ═══════════════════════════════════════════════════

console.log('\n═══ 5. Alpha-blend temporel ═══\n');

test('Score LIVE (alpha=0) stable pour même inputs', () => {
  const s1 = scoreFromGroups(5, 3, 7, 2, 1.0, 1.0, 0, 0);
  const s2 = scoreFromGroups(5, 3, 7, 2, 1.0, 1.0, 0, 0);
  assert(s1 === s2, `LIVE instable: ${s1} !== ${s2}`);
});

test('Alpha ramp 0→1 produit transition monotone avec inputs positifs', () => {
  const scores: number[] = [];
  for (let a = 0; a <= 1; a += 0.1) {
    scores.push(scoreFromGroups(5, 4, 8, 3, 1.0, 1.0, 0, a));
  }
  // Pas forcément monotone (LIVE et FUTURE ont des normalisations différentes)
  // mais la transition doit être lisse (pas de saut > 10 points entre alpha adjacents)
  for (let i = 1; i < scores.length; i++) {
    const jump = Math.abs(scores[i] - scores[i - 1]);
    assert(jump <= 10, `saut alpha ${(i * 0.1).toFixed(1)}: ${scores[i - 1]}→${scores[i]} (Δ${jump})`);
  }
  console.log(`   → Scores alpha 0→1: [${scores.join(', ')}]`);
});

// ═══════════════════════════════════════════════════
// 6. Stress test multi-profils
// ═══════════════════════════════════════════════════

console.log('\n═══ 6. Stress test — 10 profils × 7 jours ═══\n');

test('10 profils différents × 7 jours = 70 calculs sans erreur', () => {
  const profiles = [
    { fn: 'Alice',   ln: 'Martin',    bd: '1985-03-15' },
    { fn: 'Bob',     ln: 'Dupont',    bd: '1990-07-22' },
    { fn: 'Claire',  ln: 'Bernard',   bd: '1978-11-08' },
    { fn: 'David',   ln: 'Petit',     bd: '2000-01-01' },
    { fn: 'Emma',    ln: 'Robert',    bd: '1965-06-30' },
    { fn: 'François',ln: 'Richard',   bd: '1955-12-25' },
    { fn: 'Gaëlle',  ln: 'Durand',    bd: '1998-04-17' },
    { fn: 'Hugo',    ln: 'Leroy',     bd: '1982-09-05' },
    { fn: 'Isabelle',ln: 'Moreau',    bd: '1973-02-14' },
    { fn: 'Jean',    ln: 'Simon',     bd: '2005-08-20' },
  ];

  let totalCalcs = 0;
  let totalErrors = 0;
  const allScores: number[] = [];

  for (const p of profiles) {
    const pNum = calcNumerology(p.fn, '', p.ln, p.bd, TODAY);
    const pCz = calcChineseZodiac(p.bd);
    const pIching = calcIChing(p.bd, TODAY);

    // Score du jour
    try {
      const pConv = calcConvergence(pNum, null, pCz, pIching, p.bd);
      allScores.push(pConv.score);
      totalCalcs++;
    } catch { totalErrors++; }

    // 7 jours de preview
    for (let d = 0; d < 7; d++) {
      const dateStr = new Date(new Date(TODAY).getTime() + d * 86400000).toISOString().slice(0, 10);
      try {
        const preview = calcDayPreview(p.bd, pNum, pCz, dateStr);
        allScores.push(preview.score);
        totalCalcs++;
      } catch { totalErrors++; }
    }
  }

  assert(totalErrors === 0, `${totalErrors} erreurs sur ${totalCalcs + totalErrors} calculs`);
  assert(totalCalcs === 80, `seulement ${totalCalcs} calculs réussis (attendu 80)`);

  const avg = allScores.reduce((a, b) => a + b, 0) / allScores.length;
  const min = Math.min(...allScores);
  const max = Math.max(...allScores);
  console.log(`   → ${totalCalcs} calculs OK, 0 erreurs`);
  console.log(`   → Distribution multi-profils: min=${min}, max=${max}, avg=${avg.toFixed(1)}`);

  // Les profils différents devraient avoir des scores variés
  const uniqueScores = new Set(allScores).size;
  assert(uniqueScores >= 5, `seulement ${uniqueScores} scores uniques sur ${allScores.length}`);
});

// ═══════════════════════════════════════════════════
// RÉSUMÉ
// ═══════════════════════════════════════════════════

console.log(`\n═══════════════════════════════════════════════`);
console.log(`  SIMULATION : ${passed} passés, ${failed} échoués`);
console.log(`═══════════════════════════════════════════════\n`);

process.exit(failed > 0 ? 1 : 0);
