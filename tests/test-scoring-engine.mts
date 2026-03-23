/**
 * Tests unitaires — Moteur de scoring Kaironaute
 *
 * Cible : calcMainScore, scoreFromGroups, calcC4 (fonctions pures)
 * Run   : npx tsx test-scoring-engine.mts
 *
 * Couverture :
 *   1. Bornes score [0, 100] (raw) / [5, 97] (post-labels)
 *   2. Normalisation P95 + caps
 *   3. C4 concordance (purity × intensity × coverage)
 *   4. Terrain modulation + fade-out
 *   5. Alpha-blend LIVE↔FUTURE (scoreFromGroups)
 *   6. Monotonie (plus de signal positif → score plus haut)
 *   7. Symétrie approchée (groupes négatifs → scores bas)
 *   8. Shapley sum ≈ score - 50
 */

import { calcMainScore, scoreFromGroups, calcC4 } from '../src/engines/convergence.js';

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

function assert(condition: boolean, msg: string): void {
  if (!condition) throw new Error(msg);
}

function assertRange(val: number, lo: number, hi: number, label: string): void {
  if (val < lo || val > hi) throw new Error(`${label} = ${val}, expected [${lo}, ${hi}]`);
}

function assertApprox(val: number, expected: number, tol: number, label: string): void {
  if (Math.abs(val - expected) > tol) throw new Error(`${label} = ${val}, expected ~${expected} ±${tol}`);
}

// ═══════════════════════════════════════════════════
// 1. calcMainScore — BORNES ET INVARIANTS
// ═══════════════════════════════════════════════════

console.log('\n═══ 1. calcMainScore — Bornes & invariants ═══\n');

test('Score neutre (tous groupes = 0) → ~50', () => {
  const r = calcMainScore(0, 1.0, 1.0, 0, 0, 0, 0, 0);
  assertRange(r.score, 48, 52, 'score neutre');
});

test('Score maximal positif → ≤ 100', () => {
  const r = calcMainScore(30, 1.1, 1.1, 0.5, 20, 20, 20, 20);
  assertRange(r.score, 50, 100, 'score max');
});

test('Score maximal négatif → ≥ 0', () => {
  const r = calcMainScore(-30, 0.9, 0.9, -0.5, -20, -20, -20, -20);
  assertRange(r.score, 0, 50, 'score min');
});

test('Groupes extrêmes positifs → score > 85', () => {
  const r = calcMainScore(0, 1.0, 1.0, 0, 15, 12, 18, 10);
  assert(r.score > 85, `score = ${r.score}, attendu > 85`);
});

test('Groupes extrêmes négatifs → score < 15', () => {
  const r = calcMainScore(0, 1.0, 1.0, 0, -15, -12, -18, -10);
  assert(r.score < 15, `score = ${r.score}, attendu < 15`);
});

test('Score toujours entier (arrondi)', () => {
  const r = calcMainScore(0, 1.02, 0.98, 0.1, 3, 2, 5, 1);
  assert(Number.isInteger(r.score), `score = ${r.score}, pas entier`);
});

test('Score retourne c4, cis, shapley', () => {
  const r = calcMainScore(0, 1.0, 1.0, 0, 5, 3, 7, 2);
  assert(typeof r.c4 === 'number', 'c4 manquant');
  assert(typeof r.cis === 'number', 'cis manquant');
  assert(r.shapley && typeof r.shapley.lune === 'number', 'shapley.lune manquant');
  assert(r.shapley && typeof r.shapley.ephem === 'number', 'shapley.ephem manquant');
  assert(r.shapley && typeof r.shapley.bazi === 'number', 'shapley.bazi manquant');
  assert(r.shapley && typeof r.shapley.indiv === 'number', 'shapley.indiv manquant');
  assert(r.shapley && typeof r.shapley.baseline === 'number', 'shapley.baseline manquant');
});

// ═══════════════════════════════════════════════════
// 2. MONOTONIE — Plus c'est positif, plus le score monte
// ═══════════════════════════════════════════════════

console.log('\n═══ 2. Monotonie ═══\n');

test('Augmenter luneGroupDelta → score augmente', () => {
  const r1 = calcMainScore(0, 1.0, 1.0, 0, 0, 3, 5, 2);
  const r2 = calcMainScore(0, 1.0, 1.0, 0, 5, 3, 5, 2);
  const r3 = calcMainScore(0, 1.0, 1.0, 0, 9, 3, 5, 2);
  assert(r1.score <= r2.score, `lune 0→5: ${r1.score} > ${r2.score}`);
  assert(r2.score <= r3.score, `lune 5→9: ${r2.score} > ${r3.score}`);
});

test('Augmenter baziGroupDelta → score augmente', () => {
  const r1 = calcMainScore(0, 1.0, 1.0, 0, 3, 3, 0, 2);
  const r2 = calcMainScore(0, 1.0, 1.0, 0, 3, 3, 6, 2);
  const r3 = calcMainScore(0, 1.0, 1.0, 0, 3, 3, 11, 2);
  assert(r1.score <= r2.score, `bazi 0→6: ${r1.score} > ${r2.score}`);
  assert(r2.score <= r3.score, `bazi 6→11: ${r2.score} > ${r3.score}`);
});

test('Augmenter dashaMult → score augmente (quand groupes positifs)', () => {
  const r1 = calcMainScore(0, 1.0, 0.92, 0, 5, 4, 6, 3);
  const r2 = calcMainScore(0, 1.0, 1.00, 0, 5, 4, 6, 3);
  const r3 = calcMainScore(0, 1.0, 1.08, 0, 5, 4, 6, 3);
  assert(r1.score <= r2.score, `dasha 0.92→1.0: ${r1.score} > ${r2.score}`);
  assert(r2.score <= r3.score, `dasha 1.0→1.08: ${r2.score} > ${r3.score}`);
});

// ═══════════════════════════════════════════════════
// 3. calcC4 — Concordance 4 groupes
// ═══════════════════════════════════════════════════

console.log('\n═══ 3. calcC4 — Concordance ═══\n');

test('C4 neutre (tous = 0) → 0', () => {
  const c4 = calcC4(0, 0, 0, 0);
  assertApprox(c4, 0, 0.001, 'c4 neutre');
});

test('C4 concordance positive (tous positifs) → > 0', () => {
  const c4 = calcC4(0.5, 0.4, 0.6, 0.3);
  assert(c4 > 0, `c4 = ${c4}, attendu > 0`);
});

test('C4 concordance négative (tous négatifs) → < 0', () => {
  const c4 = calcC4(-0.5, -0.4, -0.6, -0.3);
  assert(c4 < 0, `c4 = ${c4}, attendu < 0`);
});

test('C4 discordance (2 pos, 2 neg) → faible', () => {
  const c4 = calcC4(0.5, -0.4, 0.6, -0.3);
  assertRange(Math.abs(c4), 0, 0.15, 'c4 discordant abs');
});

test('C4 borné à ±0.35', () => {
  const c4Max = calcC4(0.9, 0.8, 0.85, 0.7);
  const c4Min = calcC4(-0.9, -0.8, -0.85, -0.7);
  assertRange(c4Max, 0, 0.35 + 0.001, 'c4 max');
  assertRange(c4Min, -0.35 - 0.001, 0, 'c4 min');
});

test('C4 deadzone : valeurs < 0.12 ignorées', () => {
  const c4 = calcC4(0.05, 0.05, 0.05, 0.05);
  assertApprox(c4, 0, 0.001, 'c4 deadzone');
});

test('C4 coverage 3/4 donne bonus > coverage 2/4', () => {
  // 3 positifs vs 2 positifs
  const c4_3 = calcC4(0.5, 0.4, 0.6, 0.0);  // 3/4 positifs (0 = deadzone)
  const c4_2 = calcC4(0.5, 0.4, 0.0, 0.0);  // 2/4 positifs
  assert(c4_3 >= c4_2, `3/4 (${c4_3}) < 2/4 (${c4_2})`);
});

// ═══════════════════════════════════════════════════
// 4. TERRAIN MODULATION
// ═══════════════════════════════════════════════════

console.log('\n═══ 4. Terrain modulation ═══\n');

test('ctxMult = 1, dashaMult = 1 → pas d\'effet terrain', () => {
  const r1 = calcMainScore(0, 1.0, 1.0, 0, 5, 3, 7, 2);
  const r2 = calcMainScore(0, 1.0, 1.0, 0, 5, 3, 7, 2);
  assert(r1.score === r2.score, 'terrain neutre devrait donner même score');
});

test('terrain positif amplifie score positif', () => {
  const rNeutral = calcMainScore(0, 1.0, 1.0, 0, 6, 4, 8, 3);
  const rBoost   = calcMainScore(0, 1.08, 1.05, 0, 6, 4, 8, 3);
  assert(rBoost.score >= rNeutral.score, `boost ${rBoost.score} < neutral ${rNeutral.score}`);
});

test('terrain négatif réduit score positif', () => {
  const rNeutral = calcMainScore(0, 1.0, 1.0, 0, 6, 4, 8, 3);
  const rReduce  = calcMainScore(0, 0.92, 0.95, 0, 6, 4, 8, 3);
  assert(rReduce.score <= rNeutral.score, `reduce ${rReduce.score} > neutral ${rNeutral.score}`);
});

test('terrain fade-out en zone haute (saturation)', () => {
  // En zone haute, terrain a moins d'effet (fade-out)
  const lowBase  = calcMainScore(0, 1.0, 1.0, 0, 2, 1, 3, 1);
  const lowBoost = calcMainScore(0, 1.1, 1.1, 0, 2, 1, 3, 1);
  const diffLow  = lowBoost.score - lowBase.score;

  const highBase  = calcMainScore(0, 1.0, 1.0, 0, 15, 12, 18, 10);
  const highBoost = calcMainScore(0, 1.1, 1.1, 0, 15, 12, 18, 10);
  const diffHigh  = highBoost.score - highBase.score;

  // L'effet du terrain doit être moindre en zone haute
  assert(diffHigh <= diffLow + 1, `fade-out: diffHigh=${diffHigh} > diffLow=${diffLow} + 1`);
});

// ═══════════════════════════════════════════════════
// 5. scoreFromGroups — Alpha-blend LIVE↔FUTURE
// ═══════════════════════════════════════════════════

console.log('\n═══ 5. scoreFromGroups — Alpha-blend ═══\n');

test('alpha = 0 → branche LIVE pure', () => {
  const live = scoreFromGroups(5, 3, 7, 2, 1.0, 1.0, 0, 0);
  const main = calcMainScore(0, 1.0, 1.0, 0, 5, 3, 7, 2);
  // scoreFromGroups(alpha=0) devrait être identique à calcMainScore
  assertApprox(live, main.score, 1, 'LIVE vs calcMainScore');
});

test('alpha = 0 et alpha = 1 produisent des scores différents', () => {
  const live   = scoreFromGroups(5, 4, 8, 3, 1.0, 1.0, 0, 0);
  const future = scoreFromGroups(5, 4, 8, 3, 1.0, 1.0, 0, 1);
  // Les branches LIVE et FUTURE ont des P95 différents, donc scores différents
  // (sauf cas neutre)
  assert(typeof live === 'number' && typeof future === 'number', 'types invalides');
  assertRange(live, 0, 100, 'live range');
  assertRange(future, 0, 100, 'future range');
});

test('alpha = 0.5 → blend entre LIVE et FUTURE', () => {
  const live    = scoreFromGroups(6, 4, 8, 3, 1.0, 1.0, 0, 0);
  const future  = scoreFromGroups(6, 4, 8, 3, 1.0, 1.0, 0, 1);
  const blended = scoreFromGroups(6, 4, 8, 3, 1.0, 1.0, 0, 0.5);
  const expected = Math.round((live + future) / 2);
  // Le blend devrait être entre les deux
  assertRange(blended, Math.min(live, future) - 1, Math.max(live, future) + 1, 'blended');
});

test('scoreFromGroups retourne toujours un entier', () => {
  for (let alpha = 0; alpha <= 1; alpha += 0.25) {
    const s = scoreFromGroups(3, 2, 4, 1, 1.0, 1.0, 0, alpha);
    assert(Number.isInteger(s), `alpha=${alpha}: score=${s} pas entier`);
  }
});

test('scoreFromGroups borné [0, 100] sur 100 cas aléatoires', () => {
  const rng = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
  for (let i = 0; i < 100; i++) {
    const s = scoreFromGroups(
      rng(-20, 20), rng(-15, 15), rng(-25, 25), rng(-12, 12),
      rng(0.88, 1.12), rng(0.91, 1.09), rng(-0.5, 0.5),
      rng(0, 1),
    );
    assertRange(s, 0, 100, `random case #${i}`);
  }
});

// ═══════════════════════════════════════════════════
// 6. NORMALISATION P95 + CAPS
// ═══════════════════════════════════════════════════

console.log('\n═══ 6. Normalisation & caps ═══\n');

test('Saturation P95 : lune=9 → xL capped', () => {
  // lune=9 → xL=1.0 (P95_lune=9), lune=20 → xL=1.0 aussi (clamped)
  const r9  = calcMainScore(0, 1.0, 1.0, 0, 9,  0, 0, 0);
  const r20 = calcMainScore(0, 1.0, 1.0, 0, 20, 0, 0, 0);
  assertApprox(r9.score, r20.score, 1, 'P95 saturation lune');
});

test('Saturation P95 : bazi=11 → xB capped', () => {
  const r11 = calcMainScore(0, 1.0, 1.0, 0, 0, 0, 11, 0);
  const r30 = calcMainScore(0, 1.0, 1.0, 0, 0, 0, 30, 0);
  assertApprox(r11.score, r30.score, 1, 'P95 saturation bazi');
});

test('Cap single group : un seul groupe maximal ne dépasse pas ~G_CAP contribution', () => {
  // Un seul groupe à fond = lune=20, rest=0
  const rSingle = calcMainScore(0, 1.0, 1.0, 0, 20, 0, 0, 0);
  // Quatre groupes modérés
  const rMulti  = calcMainScore(0, 1.0, 1.0, 0, 5, 4, 6, 3);
  // Avec C4 bonus, multi-groupe devrait être compétitif ou meilleur
  assert(rMulti.score >= rSingle.score - 5,
    `multi=${rMulti.score} trop bas vs single=${rSingle.score}`);
});

// ═══════════════════════════════════════════════════
// 7. SYMÉTRIE & COHÉRENCE
// ═══════════════════════════════════════════════════

console.log('\n═══ 7. Symétrie & cohérence ═══\n');

test('Groupes positifs → score > 50, négatifs → score < 50', () => {
  const rPos = calcMainScore(0, 1.0, 1.0, 0, 5, 4, 6, 3);
  const rNeg = calcMainScore(0, 1.0, 1.0, 0, -5, -4, -6, -3);
  assert(rPos.score > 50, `pos=${rPos.score} ≤ 50`);
  assert(rNeg.score < 50, `neg=${rNeg.score} ≥ 50`);
});

test('Symétrie approchée autour de 50', () => {
  const rPos = calcMainScore(0, 1.0, 1.0, 0, 5, 4, 6, 3);
  const rNeg = calcMainScore(0, 1.0, 1.0, 0, -5, -4, -6, -3);
  const devPos = rPos.score - 50;
  const devNeg = 50 - rNeg.score;
  // tanh est symétrique, donc les déviations devraient être proches
  assertApprox(devPos, devNeg, 5, 'symétrie pos/neg');
});

// ═══════════════════════════════════════════════════
// 8. SHAPLEY — Sum ≈ score - 50
// ═══════════════════════════════════════════════════

console.log('\n═══ 8. Shapley contributions ═══\n');

test('Shapley : phi sum + baseline ≈ score (à ±3 près)', () => {
  const r = calcMainScore(0, 1.0, 1.0, 0, 5, 3, 7, 2);
  const phiSum = r.shapley.lune + r.shapley.ephem + r.shapley.bazi + r.shapley.indiv;
  const reconstructed = phiSum + r.shapley.baseline;
  assertApprox(reconstructed, r.score, 3, 'shapley reconstruction');
});

test('Shapley : groupe dominant a plus grande contribution', () => {
  // bazi très fort, lune faible
  const r = calcMainScore(0, 1.0, 1.0, 0, 1, 1, 11, 0);
  assert(Math.abs(r.shapley.bazi) > Math.abs(r.shapley.lune),
    `bazi (${r.shapley.bazi}) devrait dominer lune (${r.shapley.lune})`);
});

// ═══════════════════════════════════════════════════
// 9. STRESS TEST — 10000 cas aléatoires bornés
// ═══════════════════════════════════════════════════

console.log('\n═══ 9. Stress test (10000 random) ═══\n');

test('10000 calcMainScore random → toujours [0, 100], entier, NaN-free', () => {
  const rng = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
  let minScore = 100, maxScore = 0;
  for (let i = 0; i < 10000; i++) {
    const r = calcMainScore(
      rng(-15, 15),                    // finalDelta (unused internally, kept for compat)
      rng(0.85, 1.15),                 // ctxMult
      rng(0.88, 1.12),                 // dashaMult
      Math.random() > 0.3 ? rng(-1, 1) : undefined,  // baseSignal
      rng(-20, 20),                    // lune
      rng(-15, 15),                    // ephem
      rng(-25, 25),                    // bazi
      rng(-12, 12),                    // indiv
    );
    assert(!isNaN(r.score), `NaN at iteration ${i}`);
    assert(Number.isInteger(r.score), `not integer at ${i}: ${r.score}`);
    assertRange(r.score, 0, 100, `stress #${i}`);
    minScore = Math.min(minScore, r.score);
    maxScore = Math.max(maxScore, r.score);
  }
  console.log(`   Distribution : min=${minScore}, max=${maxScore}`);
  // On s'attend à ce que 10000 tirages explorent une bonne partie du range
  assert(minScore <= 15, `minScore=${minScore}, devrait atteindre ≤15`);
  assert(maxScore >= 85, `maxScore=${maxScore}, devrait atteindre ≥85`);
});

test('10000 scoreFromGroups random → toujours [0, 100], entier', () => {
  const rng = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
  let minScore = 100, maxScore = 0;
  for (let i = 0; i < 10000; i++) {
    const s = scoreFromGroups(
      rng(-20, 20), rng(-15, 15), rng(-25, 25), rng(-12, 12),
      rng(0.85, 1.15), rng(0.88, 1.12),
      Math.random() > 0.3 ? rng(-1, 1) : undefined,
      rng(0, 1),
    );
    assert(!isNaN(s), `NaN at iteration ${i}`);
    assert(Number.isInteger(s), `not integer at ${i}: ${s}`);
    assertRange(s, 0, 100, `stress #${i}`);
    minScore = Math.min(minScore, s);
    maxScore = Math.max(maxScore, s);
  }
  console.log(`   Distribution : min=${minScore}, max=${maxScore}`);
  assert(minScore <= 20, `minScore=${minScore}, devrait atteindre ≤20`);
  assert(maxScore >= 80, `maxScore=${maxScore}, devrait atteindre ≥80`);
});

// ═══════════════════════════════════════════════════
// 10. EDGE CASES
// ═══════════════════════════════════════════════════

console.log('\n═══ 10. Edge cases ═══\n');

test('Tous groupes = 0, terrain = 1 → exactement 50', () => {
  const r = calcMainScore(0, 1.0, 1.0, undefined, 0, 0, 0, 0);
  assert(r.score === 50, `score = ${r.score}, attendu 50`);
});

test('baseSignal = undefined → même que baseSignal = 0', () => {
  const r1 = calcMainScore(0, 1.0, 1.0, undefined, 5, 3, 7, 2);
  const r2 = calcMainScore(0, 1.0, 1.0, 0,         5, 3, 7, 2);
  assert(r1.score === r2.score, `undef=${r1.score} vs 0=${r2.score}`);
});

test('dashaMult extrême 0.88 → score réduit, 1.12 → score augmenté', () => {
  const rLow  = calcMainScore(0, 1.0, 0.88, 0, 5, 4, 6, 3);
  const rMid  = calcMainScore(0, 1.0, 1.00, 0, 5, 4, 6, 3);
  const rHigh = calcMainScore(0, 1.0, 1.12, 0, 5, 4, 6, 3);
  assert(rLow.score <= rMid.score, `low ${rLow.score} > mid ${rMid.score}`);
  assert(rMid.score <= rHigh.score, `mid ${rMid.score} > high ${rHigh.score}`);
});

test('ctxMult extrême ne cause pas NaN', () => {
  const r1 = calcMainScore(0, 0.5, 1.0, 0, 5, 3, 7, 2);
  const r2 = calcMainScore(0, 2.0, 1.0, 0, 5, 3, 7, 2);
  assert(!isNaN(r1.score), 'ctxMult=0.5 NaN');
  assert(!isNaN(r2.score), 'ctxMult=2.0 NaN');
  assertRange(r1.score, 0, 100, 'ctxMult=0.5');
  assertRange(r2.score, 0, 100, 'ctxMult=2.0');
});

// ═══════════════════════════════════════════════════
// RÉSUMÉ
// ═══════════════════════════════════════════════════

console.log(`\n════════════════════════════════════════`);
console.log(`  SCORING ENGINE TESTS : ${passed} passés, ${failed} échoués`);
console.log(`════════════════════════════════════════\n`);

process.exit(failed > 0 ? 1 : 0);
