/**
 * RONDE 15 — Simulation Poids Différenciés par Type de Relation
 *
 * Objectif : Vérifier mathématiquement l'effet de poids différenciés + bonus
 * sur les 4 cas réels de Jérôme + batch de 200 paires aléatoires.
 *
 * Cibles :
 *   Père Michel  : ~46% (acceptable)
 *   Mère Carmen  : ~72% ✅
 *   Ami Steve    : 70-80%
 *   Frère Laurent: 60-65%
 */

// ═══ FORMULE GAUSSIENNE (copie exacte du code réel) ═══

function normalCDF(z: number): number {
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1.0 / (1.0 + 0.3275911 * x);
  const erf = 1.0 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * erf);
}

function bondGaussianCDF(rawScore: number, mu: number, sigma: number): number {
  const z = (rawScore - mu) / sigma;
  const phi = normalCDF(z);
  return Math.max(5, Math.min(98, Math.round(5 + 93 * (0.3 + 0.7 * phi))));
}

// ═══ CONFIGURATION ═══

// ACTUEL : poids uniformes famille (du code réel)
const WEIGHTS_CURRENT = {
  parent:  { bazi: 0.40, num: 0.30, iching: 0.30, bonus: 0 },
  fratrie: { bazi: 0.40, num: 0.30, iching: 0.30, bonus: 0 },
  gp:      { bazi: 0.40, num: 0.30, iching: 0.30, bonus: 0 },
  coloc:   { bazi: 0.40, num: 0.30, iching: 0.30, bonus: 0 },
  ami:     { bazi: 0.40, num: 0.30, iching: 0.30, bonus: 0 },
};

// PROPOSÉ (Ronde 15 — approche hybride GPT + UX Gemini)
const WEIGHTS_PROPOSED = {
  parent:  { bazi: 0.40, num: 0.30, iching: 0.30, bonus: 0 },
  fratrie: { bazi: 0.25, num: 0.30, iching: 0.45, bonus: -3 },
  gp:      { bazi: 0.30, num: 0.30, iching: 0.40, bonus: +2 },
  coloc:   { bazi: 0.30, num: 0.30, iching: 0.40, bonus: -2 },
  ami:     { bazi: 0.10, num: 0.55, iching: 0.35, bonus: +10 },
};

// Gaussiennes
const GAUSS_CURRENT  = { mu: 58, sigma: 16 };
const GAUSS_PROPOSED = { mu: 48, sigma: 20 };

// ═══ CAS RÉELS DE JÉRÔME ═══
// Scores normalisés par système (0-100%)
interface RealCase {
  name: string;
  type: 'parent' | 'fratrie' | 'gp' | 'coloc' | 'ami';
  bazi: number;   // BaZi normalisé 0-100
  num: number;    // Numérologie normalisée 0-100
  iching: number; // Yi King normalisé 0-100
  targetMin: number;
  targetMax: number;
}

const REAL_CASES: RealCase[] = [
  { name: 'Père Michel (pere_fils)',    type: 'parent',  bazi: 12, num: 73, iching: 14, targetMin: 40, targetMax: 50 },
  { name: 'Mère Carmen (mere_fils)',    type: 'parent',  bazi: 54, num: 70, iching: 36, targetMin: 68, targetMax: 76 },
  { name: 'Ami Steve (ami)',            type: 'ami',     bazi: 12, num: 55, iching: 36, targetMin: 70, targetMax: 80 },
  { name: 'Frère Laurent (frere_frere)',type: 'fratrie', bazi: 54, num: 65, iching: 36, targetMin: 60, targetMax: 65 },
];

// ═══ CALCUL ═══

type WeightConfig = typeof WEIGHTS_CURRENT;

function calcScore(
  c: RealCase,
  weights: WeightConfig,
  gauss: { mu: number; sigma: number }
): number {
  const w = weights[c.type];
  const raw = w.bazi * c.bazi + w.num * c.num + w.iching * c.iching + w.bonus;
  return bondGaussianCDF(raw, gauss.mu, gauss.sigma);
}

// ═══ PARTIE 1 : CAS RÉELS ═══

console.log('═══════════════════════════════════════════════════════════════');
console.log('  SIMULATION RONDE 15 — Poids Différenciés par Type');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('PARTIE 1 : CAS RÉELS DE JÉRÔME\n');

console.log('┌────────────────────────────────┬────────┬──────────┬──────────┬────────┬──────────┐');
console.log('│ Relation                       │ Actuel │ μ48/σ20  │ Proposé  │ Delta  │ Cible    │');
console.log('│                                │ μ58/σ16│ poids=   │ poids+   │        │          │');
console.log('├────────────────────────────────┼────────┼──────────┼──────────┼────────┼──────────┤');

for (const c of REAL_CASES) {
  const scoreActuel = calcScore(c, WEIGHTS_CURRENT, GAUSS_CURRENT);
  const scoreGaussOnly = calcScore(c, WEIGHTS_CURRENT, GAUSS_PROPOSED);
  const scoreProposed = calcScore(c, WEIGHTS_PROPOSED, GAUSS_PROPOSED);
  const delta = scoreProposed - scoreActuel;
  const inTarget = scoreProposed >= c.targetMin && scoreProposed <= c.targetMax;

  console.log(
    `│ ${c.name.padEnd(30)} │ ${String(scoreActuel + '%').padStart(5)}  │ ${String(scoreGaussOnly + '%').padStart(5)}    │ ${String(scoreProposed + '%').padStart(5)}    │ ${(delta >= 0 ? '+' : '') + delta}`.padEnd(100) +
    `│ ${c.targetMin}-${c.targetMax}% ${inTarget ? '✅' : '❌'} │`
  );
}
console.log('└────────────────────────────────┴────────┴──────────┴──────────┴────────┴──────────┘');

// Détail des raw scores
console.log('\nDÉTAIL DES RAW SCORES :');
for (const c of REAL_CASES) {
  const wCurr = WEIGHTS_CURRENT[c.type];
  const wProp = WEIGHTS_PROPOSED[c.type];
  const rawCurr = wCurr.bazi * c.bazi + wCurr.num * c.num + wCurr.iching * c.iching + wCurr.bonus;
  const rawProp = wProp.bazi * c.bazi + wProp.num * c.num + wProp.iching * c.iching + wProp.bonus;
  console.log(`  ${c.name}:`);
  console.log(`    Actuel  : raw = ${rawCurr.toFixed(1)} → z=(${rawCurr.toFixed(1)}-58)/16 = ${((rawCurr - 58) / 16).toFixed(3)} → Φ=${normalCDF((rawCurr - 58) / 16).toFixed(4)}`);
  console.log(`    Proposé : raw = ${rawProp.toFixed(1)} → z=(${rawProp.toFixed(1)}-48)/20 = ${((rawProp - 48) / 20).toFixed(3)} → Φ=${normalCDF((rawProp - 48) / 20).toFixed(4)}`);
}

// ═══ PARTIE 2 : BATCH ALÉATOIRE — DISTRIBUTION PAR TYPE ═══

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  PARTIE 2 : DISTRIBUTION SUR 500 PAIRES ALÉATOIRES PAR TYPE');
console.log('═══════════════════════════════════════════════════════════════\n');

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

// Distributions réalistes des scores par système (basées sur les plages réelles)
// BaZi : -34 à +44 → normalisé 0-100, mais avec Clash typique à 12%, neutre ~45%, bon ~60-75%
// Numérologie : typiquement 30-85%
// Yi King : typiquement 14-72%

function randomBazi(): number {
  // ~20% chance de Clash (score bas 5-20%), ~30% neutre (35-55%), ~50% bon (50-80%)
  const r = Math.random();
  if (r < 0.20) return randomBetween(5, 20);    // Clash
  if (r < 0.50) return randomBetween(35, 55);   // Neutre
  return randomBetween(50, 80);                   // Bon (Triad, Liu He, etc.)
}

function randomNum(): number {
  return randomBetween(25, 85); // Distribution assez large
}

function randomIching(): number {
  return randomBetween(10, 75); // Yi King a une large plage
}

const TYPES: Array<'parent' | 'fratrie' | 'gp' | 'coloc' | 'ami'> = ['parent', 'fratrie', 'gp', 'coloc', 'ami'];
const N_PAIRS = 500;

for (const type of TYPES) {
  const scoresActuel: number[] = [];
  const scoresProposed: number[] = [];

  for (let i = 0; i < N_PAIRS; i++) {
    const c: RealCase = {
      name: `random_${type}_${i}`,
      type,
      bazi: randomBazi(),
      num: randomNum(),
      iching: randomIching(),
      targetMin: 0,
      targetMax: 100,
    };
    scoresActuel.push(calcScore(c, WEIGHTS_CURRENT, GAUSS_CURRENT));
    scoresProposed.push(calcScore(c, WEIGHTS_PROPOSED, GAUSS_PROPOSED));
  }

  const stats = (arr: number[]) => {
    arr.sort((a, b) => a - b);
    const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
    const gt70 = arr.filter(s => s >= 70).length;
    const gt50 = arr.filter(s => s >= 50).length;
    const lt30 = arr.filter(s => s < 30).length;
    const gt80 = arr.filter(s => s >= 80).length;
    const p10 = arr[Math.floor(arr.length * 0.10)];
    const p25 = arr[Math.floor(arr.length * 0.25)];
    const p50 = arr[Math.floor(arr.length * 0.50)];
    const p75 = arr[Math.floor(arr.length * 0.75)];
    const p90 = arr[Math.floor(arr.length * 0.90)];
    return { avg: avg.toFixed(1), gt80, gt70, gt50, lt30, p10, p25, p50, p75, p90, min: arr[0], max: arr[arr.length - 1] };
  };

  const sA = stats(scoresActuel);
  const sP = stats(scoresProposed);

  console.log(`TYPE: ${type.toUpperCase()} (${N_PAIRS} paires)`);
  console.log('┌──────────────────┬──────────────┬──────────────┐');
  console.log('│ Métrique         │ Actuel       │ Proposé      │');
  console.log('│                  │ (μ58/σ16)    │ (μ48/σ20+w)  │');
  console.log('├──────────────────┼──────────────┼──────────────┤');
  console.log(`│ Moyenne          │ ${sA.avg.padStart(8)}%    │ ${sP.avg.padStart(8)}%    │`);
  console.log(`│ Min              │ ${String(sA.min).padStart(8)}%    │ ${String(sP.min).padStart(8)}%    │`);
  console.log(`│ Max              │ ${String(sA.max).padStart(8)}%    │ ${String(sP.max).padStart(8)}%    │`);
  console.log(`│ P10              │ ${String(sA.p10).padStart(8)}%    │ ${String(sP.p10).padStart(8)}%    │`);
  console.log(`│ P25              │ ${String(sA.p25).padStart(8)}%    │ ${String(sP.p25).padStart(8)}%    │`);
  console.log(`│ P50 (médiane)    │ ${String(sA.p50).padStart(8)}%    │ ${String(sP.p50).padStart(8)}%    │`);
  console.log(`│ P75              │ ${String(sA.p75).padStart(8)}%    │ ${String(sP.p75).padStart(8)}%    │`);
  console.log(`│ P90              │ ${String(sA.p90).padStart(8)}%    │ ${String(sP.p90).padStart(8)}%    │`);
  console.log(`│ >80%             │ ${String(sA.gt80).padStart(5)}/${N_PAIRS}    │ ${String(sP.gt80).padStart(5)}/${N_PAIRS}    │`);
  console.log(`│ >70%             │ ${String(sA.gt70).padStart(5)}/${N_PAIRS}    │ ${String(sP.gt70).padStart(5)}/${N_PAIRS}    │`);
  console.log(`│ >50%             │ ${String(sA.gt50).padStart(5)}/${N_PAIRS}    │ ${String(sP.gt50).padStart(5)}/${N_PAIRS}    │`);
  console.log(`│ <30%             │ ${String(sA.lt30).padStart(5)}/${N_PAIRS}    │ ${String(sP.lt30).padStart(5)}/${N_PAIRS}    │`);
  console.log('└──────────────────┴──────────────┴──────────────┘');

  // Garde-fous GPT
  const pctGt70 = (sP.gt70 / N_PAIRS * 100).toFixed(1);
  const pctLt30 = (sP.lt30 / N_PAIRS * 100).toFixed(1);
  const warn70 = parseFloat(pctGt70) > 35 ? ' ⚠️ ALERTE >35%' : ' ✅';
  const warn30 = parseFloat(pctLt30) < 3 ? ' ⚠️ ALERTE <3%' : ' ✅';
  console.log(`  Garde-fou GPT: >70% = ${pctGt70}%${warn70} | <30% = ${pctLt30}%${warn30}`);
  console.log('');
}

// ═══ PARTIE 3 : TEST DE COHÉRENCE — Même personne, type différent ═══

console.log('═══════════════════════════════════════════════════════════════');
console.log('  PARTIE 3 : COHÉRENCE — Steve en ami vs coloc vs fratrie');
console.log('═══════════════════════════════════════════════════════════════\n');

const steveBase = { bazi: 12, num: 55, iching: 36 };

for (const type of TYPES) {
  const c: RealCase = {
    name: `Steve en ${type}`,
    type,
    ...steveBase,
    targetMin: 0,
    targetMax: 100,
  };
  const score = calcScore(c, WEIGHTS_PROPOSED, GAUSS_PROPOSED);
  const w = WEIGHTS_PROPOSED[type];
  const raw = w.bazi * c.bazi + w.num * c.num + w.iching * c.iching + w.bonus;
  console.log(`  Steve en ${type.padEnd(8)} : raw=${raw.toFixed(1).padStart(5)} → score=${score}%`);
}

console.log('\n  Laurent (bazi=54, num=65, iching=36) :');
const laurentBase = { bazi: 54, num: 65, iching: 36 };
for (const type of TYPES) {
  const c: RealCase = {
    name: `Laurent en ${type}`,
    type,
    ...laurentBase,
    targetMin: 0,
    targetMax: 100,
  };
  const score = calcScore(c, WEIGHTS_PROPOSED, GAUSS_PROPOSED);
  const w = WEIGHTS_PROPOSED[type];
  const raw = w.bazi * c.bazi + w.num * c.num + w.iching * c.iching + w.bonus;
  console.log(`  Laurent en ${type.padEnd(8)} : raw=${raw.toFixed(1).padStart(5)} → score=${score}%`);
}

// ═══ PARTIE 4 : SENSIBILITÉ DU BONUS AMI ═══

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  PARTIE 4 : SENSIBILITÉ DU BONUS AMI (+5 à +15)');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('  Steve (bazi=12, num=55, iching=36) avec poids ami (B10/N55/Y35):');
for (let bonus = 0; bonus <= 15; bonus += 1) {
  const w = { bazi: 0.10, num: 0.55, iching: 0.35, bonus };
  const raw = w.bazi * steveBase.bazi + w.num * steveBase.num + w.iching * steveBase.iching + w.bonus;
  const score = bondGaussianCDF(raw, 48, 20);
  const marker = bonus === 10 ? ' ← PROPOSÉ' : bonus === 8 ? ' ← ALTERNATIF' : '';
  console.log(`  bonus=+${String(bonus).padStart(2)} : raw=${raw.toFixed(1).padStart(5)} → score=${String(score).padStart(2)}%${marker}`);
}

// Un ami avec de bons scores BaZi (pas de Clash) + bonus
console.log('\n  Ami SANS Clash (bazi=60, num=70, iching=50) :');
const goodAmi = { bazi: 60, num: 70, iching: 50 };
for (let bonus = 0; bonus <= 15; bonus += 5) {
  const w = { bazi: 0.10, num: 0.55, iching: 0.35, bonus };
  const raw = w.bazi * goodAmi.bazi + w.num * goodAmi.num + w.iching * goodAmi.iching + w.bonus;
  const score = bondGaussianCDF(raw, 48, 20);
  console.log(`  bonus=+${String(bonus).padStart(2)} : raw=${raw.toFixed(1).padStart(5)} → score=${String(score).padStart(2)}%`);
}

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  FIN DE SIMULATION');
console.log('═══════════════════════════════════════════════════════════════');
