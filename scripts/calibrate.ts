/**
 * KAIRONAUTE — Script de calibration Monte Carlo (Sprint AO — P3)
 * Post-Sprint AO : 4 groupes (BAZI ±15, LUNE ±12, EPHEM ±10, INDIV ±8)
 *
 * Simule 500 000 jours (10k dates × 50 profils) pour :
 *   1. Calculer P95_G empirique de chaque groupe
 *   2. Vérifier la distribution de X_total et du score final
 *   3. Valider A=36, k=0.840 (paramètres production)
 *
 * Aucun changement au moteur de production.
 * Lancer : npx tsx scripts/calibrate.ts
 */

// ─── RNG xorshift32 reproductible (seed fixe = 10908) ───────────────────────
let rngState = 10908;
function xorshift32(): number {
  rngState ^= rngState << 13;
  rngState ^= rngState >> 17;
  rngState ^= rngState << 5;
  return (rngState >>> 0) / 0xFFFFFFFF; // [0, 1)
}

/** Box-Muller : N(0,1) */
function randNorm(): number {
  const u1 = Math.max(1e-10, xorshift32());
  const u2 = xorshift32();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// ─── Paramètres post-Sprint AO ──────────────────────────────────────────────
const N = 500_000; // 10k dates × 50 profils

// Probabilité d'événement rare (éclipse, ingress, station planétaire)
const P_RARE = 0.08;
const RARE_MULT = 1.8; // σ_rare = 1.8 × σ_norm

/**
 * 4 groupes post-Sprint AO avec caps et σ ajustés
 * σ vise P95 ≈ 0.65–0.75 du capTh (distribution gaussienne tronquée typique)
 */
const GROUPS = [
  { name: 'C_BAZI',  capTh: 15, sigma: 5.0 },  // BaZi Core ±8 + Jian Chu ±1 + Shen Sha ±4
  { name: 'C_LUNE',  capTh: 12, sigma: 4.2 },  // Nak ±8 + Tara/Chandra ±2 + VoC -2 + BAV+SAV ±5 + Panchanga ±4 (was ±16, now ±12)
  { name: 'C_EPHEM', capTh: 10, sigma: 3.5 },  // Transits ±6 + Étoiles Fixes ±4 (was ±14, now ±10)
  { name: 'C_INDIV', capTh:  8, sigma: 2.8 },  // I Ching ±3 + TithiLord ±1 + Drishti ±3 + Kartari ±2
] as const;

// Kinetic Shocks (hors cap, direct delta)
const KS_CAP = 3;
const KS_SIGMA = 0.8;

// αG hiérarchisés (shadow score)
const ALPHA_G = { lune: 1.20, ephem: 1.10, bazi: 1.00, indiv: 0.90 };

// G_CAP en espace normalisé [-1, +1]
const G_CAP = { lune: 0.90, ephem: 0.80, bazi: 0.85, indiv: 0.70 };

// Terrain squashé
const SIGMA_TERRAIN = 0.18;

// Paramètres production
const A_PROD = 36.0;
const K_PROD = 0.840;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function quantile(sorted: number[], p: number): number {
  const idx = Math.floor(p * (sorted.length - 1));
  return sorted[idx];
}

/** Winsorise au P99 puis recalcule P95 */
function robustP95(vals: number[]): number {
  const abs = vals.map(Math.abs).sort((a, b) => a - b);
  const p99 = quantile(abs, 0.99);
  const winsorised = abs.map(v => Math.min(v, p99)).sort((a, b) => a - b);
  return Math.max(1, quantile(winsorised, 0.95));
}

function squashTerrain(raw: number): number {
  return 1 + 0.25 * Math.tanh((raw - 1) / 0.35);
}

// ─── Simulation ──────────────────────────────────────────────────────────────
const groupDeltas: number[][] = GROUPS.map(() => []);
const xTotals: number[] = [];
const scores: number[] = [];
const ksDeltaAll: number[] = [];

for (let day = 0; day < N; day++) {
  // Générer delta pour chaque groupe
  const di: number[] = GROUPS.map(g => {
    const rare  = xorshift32() < P_RARE;
    const sigma = g.sigma * (rare ? RARE_MULT : 1.0);
    return clamp(Math.round(sigma * randNorm()), -g.capTh, g.capTh);
  });

  // Kinetic Shocks (±3, ~15% des jours)
  const ksActive = xorshift32() < 0.15;
  const ksDelta  = ksActive ? clamp(Math.round(KS_SIGMA * randNorm()), -KS_CAP, KS_CAP) : 0;
  ksDeltaAll.push(ksDelta);

  // Stocker pour P95 par groupe
  di.forEach((v, i) => groupDeltas[i].push(v));

  // terrain squashé
  const terrainRaw = clamp(1.0 + SIGMA_TERRAIN * randNorm(), 0.51, 1.50);
  const terrain_sq = squashTerrain(terrainRaw);

  // Cap global L1 ±30
  const rawDelta = di.reduce((s, v) => s + v, 0) + ksDelta;
  const cappedDelta = clamp(rawDelta, -30, 30);

  // Score = 50 + A × tanh(k × Xnorm) × terrain
  // Xnorm approximé comme cappedDelta / 30 (normalisation simple)
  const xNorm = cappedDelta / 30;
  const score = clamp(50 + A_PROD * Math.tanh(K_PROD * xNorm * 3) * terrain_sq, 5, 97);
  scores.push(score);

  // X_core pour shadow score (4 groupes αG)
  const [dBazi, dLune, dEphem, dIndiv] = di;
  const xB = clamp(dBazi  / 11, -1, 1); // P95_G.bazi actuel = 11
  const xL = clamp(dLune  / 12, -1, 1); // P95_G.lune actuel = 12
  const xE = clamp(dEphem / 10, -1, 1); // P95_G.ephem actuel = 10
  const xI = clamp(dIndiv /  6, -1, 1); // P95_G.indiv = 6 (nouveau)
  const XB = clamp(ALPHA_G.bazi  * xB, -G_CAP.bazi,  G_CAP.bazi);
  const XL = clamp(ALPHA_G.lune  * xL, -G_CAP.lune,  G_CAP.lune);
  const XE = clamp(ALPHA_G.ephem * xE, -G_CAP.ephem, G_CAP.ephem);
  const XI = clamp(ALPHA_G.indiv * xI, -G_CAP.indiv, G_CAP.indiv);
  const X_core = clamp(XB + XL + XE + XI, -1.6, 1.6);
  xTotals.push(X_core);
}

// ─── Résultats ───────────────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════════════════');
console.log('  KAIRONAUTE — CALIBRATION MONTE CARLO (Sprint AO P3)');
console.log(`  N = ${(N / 1000).toFixed(0)}k simulations`);
console.log('═══════════════════════════════════════════════════════\n');

// 1. P95 empirique par groupe → nouvelles valeurs P95_G
console.log('── P95_G EMPIRIQUES ──────────────────────────────────');
console.log('Groupe          capTh   P95_emp  ratio  → P95_G recommandé');
const p95Results: Record<string, number> = {};
GROUPS.forEach((g, i) => {
  const p95 = Math.round(robustP95(groupDeltas[i]) * 10) / 10;
  const ratio = (p95 / g.capTh).toFixed(2);
  p95Results[g.name] = p95;
  console.log(`${g.name.padEnd(16)}  ${String(g.capTh).padStart(3)}     ${String(p95).padStart(5)}  ${ratio}     ${Math.round(p95)}`);
});

// 2. Distribution X_core (shadow score)
const xSorted = [...xTotals].map(Math.abs).sort((a, b) => a - b);
const q50X  = quantile(xSorted, 0.50);
const q95X  = quantile(xSorted, 0.95);
const q99X  = quantile(xSorted, 0.99);
console.log('\n── DISTRIBUTION X_core (shadow score) ─────────────');
console.log(`Q50(|X|)  = ${q50X.toFixed(3)}`);
console.log(`Q95(|X|)  = ${q95X.toFixed(3)}`);
console.log(`Q99(|X|)  = ${q99X.toFixed(3)}`);

// 3. Distribution des scores
const scoresSorted = [...scores].sort((a, b) => a - b);
const p5   = quantile(scoresSorted, 0.05);
const p50  = quantile(scoresSorted, 0.50);
const p95s = quantile(scoresSorted, 0.95);
const cosmique = scores.filter(s => s >= 88).length;
const cosmiqueAn = Math.round(cosmique / N * 365);
const bas = scores.filter(s => s <= 15).length;
const basAn = Math.round(bas / N * 365);
console.log(`\n── DISTRIBUTION SCORES (A=${A_PROD}, k=${K_PROD}) ─────`);
console.log(`P5   = ${p5.toFixed(1)}   (cible ≈ 20-25)`);
console.log(`P50  = ${p50.toFixed(1)}  (cible ≈ 50-55)`);
console.log(`P95  = ${p95s.toFixed(1)}  (cible ≈ 80-85)`);
console.log(`Cosmique (≥88) = ${cosmiqueAn} jours/an  (cible ≤ 7)`);
console.log(`Critique (≤15) = ${basAn} jours/an`);

// 4. Recommandation P95_G
console.log('\n── RECOMMANDATION ────────────────────────────────────');
console.log('Code à mettre à jour dans convergence.ts (calcShadowScore) :');
console.log(`  P95_G = {`);
console.log(`    lune:  ${Math.round(p95Results['C_LUNE'])},`);
console.log(`    ephem: ${Math.round(p95Results['C_EPHEM'])},`);
console.log(`    bazi:  ${Math.round(p95Results['C_BAZI'])},`);
console.log(`    indiv: ${Math.round(p95Results['C_INDIV'])},`);
console.log(`  }`);

// 5. Kinetic Shocks stats
const ksNonZero = ksDeltaAll.filter(v => v !== 0).length;
console.log(`\nKinetic Shocks : ${(ksNonZero / N * 100).toFixed(1)}% actifs (cible ~15%)`);

console.log('\n═══════════════════════════════════════════════════════');
console.log('  Exécuter puis copier P95_G dans convergence.ts');
console.log('═══════════════════════════════════════════════════════\n');
