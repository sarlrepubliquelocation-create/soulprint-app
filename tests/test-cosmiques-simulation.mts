/**
 * SIMULATION COSMIQUES 18 ANS — Kaironaute
 *
 * Run: npx tsx tests/test-cosmiques-simulation.mts
 *
 * Ce script utilise le VRAI moteur (calcDayPreview + applySoftShiftBlend + assignAnnualLabels)
 * pour simuler 18 années (2026-2043) et mesurer :
 *   - Cosmiques par an (avant/après Soft Shift)
 *   - Distribution intra-annuelle (par trimestre)
 *   - Effet de variantes TERRAIN_WIDTH
 *
 * NOTE : astro=null → pas de natalCtx → dashaMult=1.0 constant.
 * Les vrais Cosmiques dans l'app dépendent du Dasha de Jérôme.
 * Ce script mesure l'effet du PIPELINE (Soft Shift, labels), pas du Dasha.
 */

import { calcNumerology } from '../src/engines/numerology.js';
import { calcChineseZodiac } from '../src/engines/chinese-zodiac.js';
import {
  calcDayPreview,
  applySoftShiftBlend,
  assignAnnualLabels,
  COSMIC_THRESHOLD,
  type DayPreview,
} from '../src/engines/convergence.js';

// ═══ Profil Jérôme (même que test-simulation.mts) ═══
const BD = '1977-09-23';
const TODAY = '2026-03-23';
const num = calcNumerology('Jérôme', '', 'Test', BD, TODAY);
const cz = calcChineseZodiac(BD);

const YEARS = Array.from({ length: 18 }, (_, i) => 2026 + i); // 2026-2043

// ═══ Type pour les stats ═══
interface YearStats {
  year: number;
  totalDays: number;
  cosmiquesPreSS: number;    // Cosmiques AVANT applySoftShiftBlend
  cosmiquesPostSS: number;   // Cosmiques APRÈS Soft Shift
  cosmiquesPostLabels: number; // Cosmiques APRÈS assignAnnualLabels
  q1: number; q2: number; q3: number; q4: number; // Cosmiques par trimestre (post SS)
  avgScore: number;
  maxScore: number;
  minScore: number;
  avgXt: number;             // Moyenne X_total_future
  p90Xt: number;             // P90 X_total_future
  avgDm: number;             // Moyenne dashaMult
  csComputed: number;        // c_s adaptatif calculé
}

// ═══ Fonction de simulation pour une année ═══
function simulateYear(year: number): YearStats {
  // Calculer tous les jours de l'année
  const allPreviews: DayPreview[] = [];
  for (let m = 1; m <= 12; m++) {
    const daysInMonth = new Date(year, m, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const preview = calcDayPreview(BD, num, cz, dateStr, 0, null, 1.0, 1.0, 0);
      allPreviews.push(preview);
    }
  }

  // Stats AVANT Soft Shift
  const cosmiquesPreSS = allPreviews.filter(p => p.score >= COSMIC_THRESHOLD).length;
  const scoresPreSS = allPreviews.map(p => p.score);

  // Collecter xt et dm AVANT que le Soft Shift les écrase
  const xts = allPreviews.filter(p => p.xt != null && p.xt !== 0).map(p => p.xt!);
  const dms = allPreviews.filter(p => p.dm != null).map(p => p.dm!);
  const avgXt = xts.length ? xts.reduce((a, b) => a + b, 0) / xts.length : 0;
  const sortedXts = [...xts].sort((a, b) => a - b);
  const p90Xt = sortedXts.length ? sortedXts[Math.floor(0.90 * sortedXts.length)] : 0;
  const avgDm = dms.length ? dms.reduce((a, b) => a + b, 0) / dms.length : 1.0;

  // Calculer c_s adaptatif (reproduire la logique du code)
  const N = xts.length;
  let csComputed = 0.50;
  if (N >= 200) {
    const meanXt = avgXt;
    const p90Idx = Math.min(Math.floor(0.90 * N), N - 1);
    const p90Val = sortedXts[p90Idx];
    csComputed = Math.min(0.90, Math.max(0.50,
      0.50
      + 0.30 * Math.max(0, meanXt - 0.70)
      + 0.15 * Math.max(0, p90Val - 1.40)
      + 8.0 * Math.max(0, meanXt - 0.95) ** 2
    ));
  }

  // Appliquer Soft Shift (MODIFIE les scores in-place)
  applySoftShiftBlend(allPreviews);

  // Stats APRÈS Soft Shift, AVANT labels
  const cosmiquesPostSS = allPreviews.filter(p => p.score >= COSMIC_THRESHOLD).length;

  // Cosmiques par trimestre
  const q1 = allPreviews.filter(p => {
    const m = parseInt(p.date.split('-')[1]);
    return m <= 3 && p.score >= COSMIC_THRESHOLD;
  }).length;
  const q2 = allPreviews.filter(p => {
    const m = parseInt(p.date.split('-')[1]);
    return m >= 4 && m <= 6 && p.score >= COSMIC_THRESHOLD;
  }).length;
  const q3 = allPreviews.filter(p => {
    const m = parseInt(p.date.split('-')[1]);
    return m >= 7 && m <= 9 && p.score >= COSMIC_THRESHOLD;
  }).length;
  const q4 = allPreviews.filter(p => {
    const m = parseInt(p.date.split('-')[1]);
    return m >= 10 && p.score >= COSMIC_THRESHOLD;
  }).length;

  // Appliquer labels
  assignAnnualLabels(allPreviews);
  const cosmiquesPostLabels = allPreviews.filter(
    p => p.score >= COSMIC_THRESHOLD && !p.isCosmicCapped
  ).length;

  const scores = allPreviews.map(p => p.score);
  return {
    year,
    totalDays: allPreviews.length,
    cosmiquesPreSS,
    cosmiquesPostSS,
    cosmiquesPostLabels,
    q1, q2, q3, q4,
    avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10,
    maxScore: Math.max(...scores),
    minScore: Math.min(...scores),
    avgXt,
    p90Xt,
    avgDm,
    csComputed,
  };
}

// ═══════════════════════════════════════════════════
// SIMULATION PRINCIPALE
// ═══════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  SIMULATION COSMIQUES 18 ANS — Profil Jérôme (astro=null)');
console.log('  Config actuelle : TERRAIN_WIDTH=0.06, TERRAIN_PTS=1.0');
console.log('  COSMIC_THRESHOLD=' + COSMIC_THRESHOLD);
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('Calcul en cours (18 × 365 = ~6570 jours)...\n');

const results: YearStats[] = [];
for (const year of YEARS) {
  const stats = simulateYear(year);
  results.push(stats);
  process.stdout.write(`  ${year}: ${stats.cosmiquesPostSS} Cosmiques (preSS=${stats.cosmiquesPreSS}) ` +
    `Q1=${stats.q1} Q2=${stats.q2} Q3=${stats.q3} Q4=${stats.q4} ` +
    `avg=${stats.avgScore} c_s=${stats.csComputed.toFixed(3)}\n`);
}

// ═══ Résumé ═══
console.log('\n═══ RÉSUMÉ 18 ANS ═══\n');

console.log('Année | PreSS | PostSS | Labels | Q1  Q2  Q3  Q4  | Avg   Max  Min  | μ_xt   P90_xt  c_s');
console.log('─'.repeat(100));

for (const r of results) {
  const q = `${String(r.q1).padStart(3)} ${String(r.q2).padStart(3)} ${String(r.q3).padStart(3)} ${String(r.q4).padStart(3)}`;
  console.log(
    `${r.year}  | ${String(r.cosmiquesPreSS).padStart(5)} | ${String(r.cosmiquesPostSS).padStart(6)} | ${String(r.cosmiquesPostLabels).padStart(6)} | ${q} | ` +
    `${String(r.avgScore).padStart(5)} ${String(r.maxScore).padStart(4)} ${String(r.minScore).padStart(4)} | ` +
    `${r.avgXt.toFixed(3).padStart(6)} ${r.p90Xt.toFixed(3).padStart(7)} ${r.csComputed.toFixed(3).padStart(5)}`
  );
}

// ═══ Statistiques globales ═══
const totalCosm = results.reduce((a, r) => a + r.cosmiquesPostSS, 0);
const avgCosm = totalCosm / results.length;
const minCosm = Math.min(...results.map(r => r.cosmiquesPostSS));
const maxCosm = Math.max(...results.map(r => r.cosmiquesPostSS));
const totalDays = results.reduce((a, r) => a + r.totalDays, 0);

console.log('\n═══ STATISTIQUES GLOBALES ═══\n');
console.log(`  Total Cosmiques : ${totalCosm} / ${totalDays} jours (${(totalCosm/totalDays*100).toFixed(1)}%)`);
console.log(`  Moyenne/an      : ${avgCosm.toFixed(1)}`);
console.log(`  Min/an          : ${minCosm} (${results.find(r => r.cosmiquesPostSS === minCosm)?.year})`);
console.log(`  Max/an          : ${maxCosm} (${results.find(r => r.cosmiquesPostSS === maxCosm)?.year})`);
console.log(`  Ratio max/min   : ${(maxCosm/Math.max(1,minCosm)).toFixed(1)}×`);

// ═══ Analyse clustering (max concentration dans un trimestre) ═══
console.log('\n═══ ANALYSE CLUSTERING ═══\n');
for (const r of results) {
  const total = r.cosmiquesPostSS || 1;
  const maxQ = Math.max(r.q1, r.q2, r.q3, r.q4);
  const concentration = maxQ / total;
  const dominant = r.q1 === maxQ ? 'Q1' : r.q2 === maxQ ? 'Q2' : r.q3 === maxQ ? 'Q3' : 'Q4';
  const flag = concentration > 0.60 ? ' ⚠️  CLUSTERING' : '';
  console.log(`  ${r.year}: ${dominant} = ${maxQ}/${total} (${(concentration*100).toFixed(0)}%)${flag}`);
}

console.log('\n═══ FIN DE SIMULATION ═══\n');
