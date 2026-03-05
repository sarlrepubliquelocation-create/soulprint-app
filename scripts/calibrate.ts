/**
 * KAIRONAUTE — Script de calibration Y0
 * Simule 50 000 jours pour calculer :
 *   - cap_i_P95 de chaque module (normalisation x_i)
 *   - Q95(|X_total|) → k optimal
 *   - A optimal pour P95(score) ≈ 82 et Cosmique ≤ 7 jours/an
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

// ─── Paramètres de simulation (GPT Ronde 3) ──────────────────────────────────
const N = 50_000; // jours simulés
const P_RARE = 0.08; // probabilité "mode rare"
const RARE_MULT = 1.8; // σ_rare = 1.8 × σ_norm

/**
 * Chaque module : { capTh = cap théorique, sigma = σ_norm }
 * σ vise P95 ≈ 0.65–0.75 du capTh (typique moteur capé)
 */
const MODULES = [
  { name: 'C_BAZI',        capTh: 15, sigma: 5.2 },
  { name: 'C_LUNE',        capTh: 16, sigma: 5.6 },
  { name: 'C_EPHEM',       capTh: 14, sigma: 4.8 },
  { name: 'SCIS',          capTh:  2, sigma: 0.7 },
  { name: 'R27',           capTh:  2, sigma: 0.55 },
  { name: 'R29',           capTh:  3, sigma: 0.8 },
  { name: 'Panchanga',     capTh:  4, sigma: 1.6 },
  { name: 'EtoilesFixes',  capTh:  5, sigma: 1.9 },
] as const;

// caps de groupe (gCap) — conservés dans la nouvelle archi
const G_CAP_BAZI  = 0.85; // en espace normalisé [-1,+1]
const G_CAP_LUNE  = 0.90;
const G_CAP_EPHEM = 0.80;
const G_CAP_SLOW  = 0.60; // SCIS + R27 + R29 + Panchanga + Étoiles

// poids intra-groupe (identiques au départ, à affiner)
const W_BAZI  = 1.0;
const W_LUNE  = 1.0;
const W_EPHEM = 1.0;
const W_SLOW  = 1.0;

// noyau base_signal ∈ [-1, +1]  (simulé comme bruit faible longue période)
const BETA   = 0.8;   // poids du noyau dans X_total
const SIGMA_BASE = 0.35; // σ du base_signal (cycles lents → peu bruités)

// terrain squashé : 1 + 0.25 × tanh((terrain_brut − 1) / 0.35)
// terrain_brut ∼ N(1.0, 0.18) capé [0.51, 1.50]
const SIGMA_TERRAIN = 0.18;

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
const moduleDeltas: number[][] = MODULES.map(() => []);
const xTotals: number[] = [];
const scores: number[] = [];

for (let day = 0; day < N; day++) {
  // Générer d_i pour chaque module
  const di: number[] = MODULES.map(m => {
    const rare   = xorshift32() < P_RARE;
    const sigma  = m.sigma * (rare ? RARE_MULT : 1.0);
    return clamp(Math.round(sigma * randNorm()), -m.capTh, m.capTh);
  });

  // Stocker pour calcul P95 par module
  di.forEach((v, i) => moduleDeltas[i].push(v));

  // Sera recalculé après avoir les cap_P95 — stocke les di bruts pour l'instant
  // (second passage ci-dessous pour X_total)
  void di;

  // base_signal (noyau lent — faible variance)
  const baseSignal = clamp(SIGMA_BASE * randNorm(), -1, 1);

  // terrain squashé
  const terrainRaw = clamp(1.0 + SIGMA_TERRAIN * randNorm(), 0.51, 1.50);
  const terrain    = squashTerrain(terrainRaw);

  // x_i normalisés (utilise capTh comme proxy avant de connaître cap_P95)
  const xi = di.map((d, i) => clamp(d / MODULES[i].capTh, -1, 1));

  // X par groupe (agrégation simple + gCap)
  const xBazi  = clamp(xi[0] * W_BAZI,  -G_CAP_BAZI,  G_CAP_BAZI);
  const xLune  = clamp(xi[1] * W_LUNE,  -G_CAP_LUNE,  G_CAP_LUNE);
  const xEphem = clamp(xi[2] * W_EPHEM, -G_CAP_EPHEM, G_CAP_EPHEM);
  const xSlow  = clamp(
    (xi[3] + xi[4] + xi[5] + xi[6] + xi[7]) * W_SLOW / 5,
    -G_CAP_SLOW, G_CAP_SLOW
  );

  const X      = xBazi + xLune + xEphem + xSlow;
  const xTotal = X + BETA * baseSignal;

  xTotals.push(xTotal);

  // Score avec A=39, k=0.925 (estimation GPT)
  const A = 39.0;
  const k = 0.925;
  const delta = A * Math.tanh(k * xTotal);
  const score = clamp(50 + delta * terrain, 0, 100);
  scores.push(score);
}

// ─── Résultats ───────────────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════');
console.log('  KAIRONAUTE Y0 — CALIBRATION (N=50 000)');
console.log('═══════════════════════════════════════════\n');

// 1. Caps P95 par module
console.log('── CAPS P95 PAR MODULE ────────────────────');
console.log('Module          capTh  capP95  ratio');
MODULES.forEach((m, i) => {
  const p95 = Math.round(robustP95(moduleDeltas[i]) * 10) / 10;
  const ratio = (p95 / m.capTh).toFixed(2);
  console.log(`${m.name.padEnd(16)}  ${String(m.capTh).padStart(3)}    ${String(p95).padStart(5)}  ${ratio}`);
});

// 2. Distribution X_total
const xSorted = [...xTotals].map(Math.abs).sort((a, b) => a - b);
const q95X    = quantile(xSorted, 0.95);
const q981X   = quantile(xSorted, 0.981);
console.log('\n── DISTRIBUTION X_total ───────────────────');
console.log(`Q50(|X|)  = ${quantile(xSorted, 0.50).toFixed(3)}`);
console.log(`Q95(|X|)  = ${q95X.toFixed(3)}   ← sert à calibrer k`);
console.log(`Q98.1(|X|)= ${q981X.toFixed(3)}  ← sert à contrôler Cosmique`);

// 3. Calibration k et A
const Y95    = 0.82; // tanh cible à P95
const kCalc  = Math.atanh(Y95) / q95X;
const aCalc  = 32 / Y95; // Δ95 = 32 pts (score 82 = 50+32)
console.log('\n── CALIBRATION A et k ─────────────────────');
console.log(`k calculé  = ${kCalc.toFixed(3)}  (GPT estimait 0.925)`);
console.log(`A calculé  = ${aCalc.toFixed(1)}   (GPT estimait 39.0)`);

// 4. Distribution des scores
const scoresSorted = [...scores].sort((a, b) => a - b);
const p5   = quantile(scoresSorted, 0.05);
const p50  = quantile(scoresSorted, 0.50);
const p95s = quantile(scoresSorted, 0.95);
const cosmique = scores.filter(s => s >= 88).length;
const cosmiqueAn = Math.round(cosmique / N * 365);
console.log('\n── DISTRIBUTION SCORES (A=39, k=0.925) ───');
console.log(`P5   = ${p5.toFixed(1)}   (cible ≈ 30)`);
console.log(`P50  = ${p50.toFixed(1)}  (cible ≈ 55)`);
console.log(`P95  = ${p95s.toFixed(1)}  (cible ≈ 82)`);
console.log(`Cosmique (≥88) = ${cosmiqueAn} jours/an  (cible ≤ 7)`);

// 5. Vérification avec k et A calibrés
const scoresV2: number[] = [];
for (let day = 0; day < N; day++) {
  const xTotal = xTotals[day];
  const terrainRaw = clamp(1.0 + SIGMA_TERRAIN * randNorm(), 0.51, 1.50);
  const terrain    = squashTerrain(terrainRaw);
  const delta = aCalc * Math.tanh(kCalc * xTotal);
  scoresV2.push(clamp(50 + delta * terrain, 0, 100));
}
const s2sorted   = [...scoresV2].sort((a, b) => a - b);
const cosmiqueV2 = Math.round(scoresV2.filter(s => s >= 88).length / N * 365);
console.log('\n── DISTRIBUTION SCORES (A/k calibrés) ────');
console.log(`P5   = ${quantile(s2sorted, 0.05).toFixed(1)}`);
console.log(`P50  = ${quantile(s2sorted, 0.50).toFixed(1)}`);
console.log(`P95  = ${quantile(s2sorted, 0.95).toFixed(1)}`);
console.log(`Cosmique (≥88) = ${cosmiqueV2} jours/an`);

console.log('\n═══════════════════════════════════════════');
console.log('  → Copier ces valeurs dans MEMO-Y0.md');
console.log('═══════════════════════════════════════════\n');
