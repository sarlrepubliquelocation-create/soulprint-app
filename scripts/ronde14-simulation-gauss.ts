#!/usr/bin/env npx tsx
/**
 * Ronde 14 — Simulation de l'effet Gaussien sur les scores bas
 */

function gaussFamille(raw: number, mu: number = 58, sigma: number = 16, offset: number = 0.3): number {
  const z = (raw - mu) / sigma;
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1.0 / (1.0 + 0.3275911 * x);
  const erf = 1.0 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  const phi = 0.5 * (1.0 + sign * erf);
  return Math.max(5, Math.min(98, Math.round(5 + 93 * (offset + (1 - offset) * phi))));
}

console.log('═══ EFFET GAUSSIEN SUR SCORES BRUTS BAS ═══\n');
console.log('Raw  | μ58σ16(actuel) | μ50σ18 | μ52σ20 | μ48σ20');
for (const raw of [25, 30, 35, 38, 40, 42, 45, 50, 55, 58, 65]) {
  const a = gaussFamille(raw, 58, 16);
  const b = gaussFamille(raw, 50, 18);
  const c = gaussFamille(raw, 52, 20);
  const d = gaussFamille(raw, 48, 20);
  console.log(`  ${String(raw).padStart(2)} →    ${String(a).padStart(2)}%            ${String(b).padStart(2)}%      ${String(c).padStart(2)}%      ${String(d).padStart(2)}%`);
}

// Cas réels: Père Michel raw ≈ 0.40*12 + 0.30*73 + 0.30*14 = 4.8 + 21.9 + 4.2 = 31
// Steve raw ≈ 0.40*12 + 0.30*55 + 0.30*36 = 4.8 + 16.5 + 10.8 = 32
console.log('\n═══ CAS RÉELS (raw pondéré estimé) ═══');
console.log('  Père Michel raw ≈ 31 | Steve raw ≈ 32 | Carmen raw ≈ 53 | Laurent raw ≈ 52');
console.log('');
for (const [name, raw] of [['Père', 31], ['Steve', 32], ['Carmen', 53], ['Laurent', 52]] as const) {
  const a = gaussFamille(raw, 58, 16);
  const b = gaussFamille(raw, 50, 18);
  const c = gaussFamille(raw, 52, 20);
  const d = gaussFamille(raw, 48, 20);
  console.log(`  ${name.padEnd(8)} → actuel: ${a}% | μ50σ18: ${b}% | μ52σ20: ${c}% | μ48σ20: ${d}%`);
}
