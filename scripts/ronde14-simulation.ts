#!/usr/bin/env npx tsx
/**
 * Ronde 14 — Simulation avant/après pour calibrer l'impact du Clash en famille
 * Teste différents scénarios d'adoucissement
 */

// Simuler manuellement les effets de différents paramètres
// BaZi raw pour Clash: -25 → normalisé (x+34)/78 = 9/78 = 11.5% ≈ 12%
// Si on adoucit le Clash en famille de -10 à -6 : raw = -25+4 = -21 → (13/78) = 16.7%
// Si on adoucit de -10 à -4 : raw = -25+6 = -19 → (15/78) = 19.2%

const BAZI_RAW_CLASH = -25;     // Jérôme × Michel/Steve actuel
const BAZI_RAW_TRIAD = 8;       // Jérôme × Carmen/Laurent/Stéph actuel
const NUM_PERE = 73;
const NUM_STEVE = 55;
const ICH_PERE = 14;
const ICH_STEVE = 36;

function gaussFamille(raw: number): number {
  const z = (raw - 58) / 16;
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1.0 / (1.0 + 0.3275911 * x);
  const erf = 1.0 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  const phi = 0.5 * (1.0 + sign * erf);
  return Math.max(5, Math.min(98, Math.round(5 + 93 * (0.3 + 0.7 * phi))));
}

function calcScore(baziNorm: number, numNorm: number, ichNorm: number): number {
  const raw = Math.round(baziNorm * 0.40 + numNorm * 0.30 + ichNorm * 0.30);
  return gaussFamille(raw);
}

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  SIMULATION RONDE 14 — IMPACT CLASH EN MODE FAMILLE        ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

// Scénario A: Status quo
console.log('═══ SCÉNARIO A : STATUS QUO (aucun changement) ═══');
const baziClashNorm = Math.round((BAZI_RAW_CLASH + 34) / 78 * 100);
console.log(`  Père Michel:  BaZi ${baziClashNorm}% + Num ${NUM_PERE}% + Yi ${ICH_PERE}% → ${calcScore(baziClashNorm, NUM_PERE, ICH_PERE)}%`);
console.log(`  Ami Steve:    BaZi ${baziClashNorm}% + Num ${NUM_STEVE}% + Yi ${ICH_STEVE}% → ${calcScore(baziClashNorm, NUM_STEVE, ICH_STEVE)}%`);

// Scénario B: Adoucir le Clash en famille (-10 → -6, soit +4 raw)
console.log('\n═══ SCÉNARIO B : CLASH FAMILLE ADOUCI (-10 → -6, +4 raw) ═══');
const rawB = BAZI_RAW_CLASH + 4;
const baziB = Math.round((rawB + 34) / 78 * 100);
console.log(`  Père Michel:  BaZi ${baziB}% + Num ${NUM_PERE}% + Yi ${ICH_PERE}% → ${calcScore(baziB, NUM_PERE, ICH_PERE)}%`);
console.log(`  Ami Steve:    BaZi ${baziB}% + Num ${NUM_STEVE}% + Yi ${ICH_STEVE}% → ${calcScore(baziB, NUM_STEVE, ICH_STEVE)}%`);

// Scénario C: Plancher BaZi à 20% en famille (jamais en dessous)
console.log('\n═══ SCÉNARIO C : PLANCHER BAZI 20% EN FAMILLE ═══');
const baziC = Math.max(20, baziClashNorm);
console.log(`  Père Michel:  BaZi ${baziC}% + Num ${NUM_PERE}% + Yi ${ICH_PERE}% → ${calcScore(baziC, NUM_PERE, ICH_PERE)}%`);
console.log(`  Ami Steve:    BaZi ${baziC}% + Num ${NUM_STEVE}% + Yi ${ICH_STEVE}% → ${calcScore(baziC, NUM_STEVE, ICH_STEVE)}%`);

// Scénario D: Réduire le poids BaZi en famille (40% → 30%) et augmenter Num (30% → 35%) + Yi (30% → 35%)
console.log('\n═══ SCÉNARIO D : POIDS RÉDUIT BaZi 30%/Num 35%/Yi 35% ═══');
function calcScoreD(baziNorm: number, numNorm: number, ichNorm: number): number {
  const raw = Math.round(baziNorm * 0.30 + numNorm * 0.35 + ichNorm * 0.35);
  return gaussFamille(raw);
}
console.log(`  Père Michel:  BaZi ${baziClashNorm}% + Num ${NUM_PERE}% + Yi ${ICH_PERE}% → ${calcScoreD(baziClashNorm, NUM_PERE, ICH_PERE)}%`);
console.log(`  Ami Steve:    BaZi ${baziClashNorm}% + Num ${NUM_STEVE}% + Yi ${ICH_STEVE}% → ${calcScoreD(baziClashNorm, NUM_STEVE, ICH_STEVE)}%`);
// Vérifier que Carmen/Laurent ne changent pas trop
const baziTriadNorm = Math.round((BAZI_RAW_TRIAD + 34) / 78 * 100);
console.log(`  Mère Carmen:  BaZi ${baziTriadNorm}% + Num 70% + Yi 36% → ${calcScoreD(baziTriadNorm, 70, 36)}% (était ${calcScore(baziTriadNorm, 70, 36)}%)`);
console.log(`  Frère Laurent: BaZi ${baziTriadNorm}% + Num 65% + Yi 36% → ${calcScoreD(baziTriadNorm, 65, 36)}% (était ${calcScore(baziTriadNorm, 65, 36)}%)`);

// Scénario E: Combo — Plancher BaZi 20% + poids réduit 30/35/35
console.log('\n═══ SCÉNARIO E : COMBO (Plancher 20% + Poids 30/35/35) ═══');
const baziE = Math.max(20, baziClashNorm);
console.log(`  Père Michel:  BaZi ${baziE}% + Num ${NUM_PERE}% + Yi ${ICH_PERE}% → ${calcScoreD(baziE, NUM_PERE, ICH_PERE)}%`);
console.log(`  Ami Steve:    BaZi ${baziE}% + Num ${NUM_STEVE}% + Yi ${ICH_STEVE}% → ${calcScoreD(baziE, NUM_STEVE, ICH_STEVE)}%`);
console.log(`  Mère Carmen:  BaZi ${baziTriadNorm}% + Num 70% + Yi 36% → ${calcScoreD(baziTriadNorm, 70, 36)}%`);
console.log(`  Frère Laurent: BaZi ${baziTriadNorm}% + Num 65% + Yi 36% → ${calcScoreD(baziTriadNorm, 65, 36)}%`);

// Scénario F: Clash atténué en famille (-10 → -5) + poids 35/30/35
console.log('\n═══ SCÉNARIO F : CLASH -5 en famille + Poids 35/30/35 ═══');
const rawF = BAZI_RAW_CLASH + 5;  // -25 + 5 = -20
const baziF = Math.round((rawF + 34) / 78 * 100);
function calcScoreF(baziNorm: number, numNorm: number, ichNorm: number): number {
  const raw = Math.round(baziNorm * 0.35 + numNorm * 0.30 + ichNorm * 0.35);
  return gaussFamille(raw);
}
console.log(`  Père Michel:  BaZi ${baziF}% + Num ${NUM_PERE}% + Yi ${ICH_PERE}% → ${calcScoreF(baziF, NUM_PERE, ICH_PERE)}%`);
console.log(`  Ami Steve:    BaZi ${baziF}% + Num ${NUM_STEVE}% + Yi ${ICH_STEVE}% → ${calcScoreF(baziF, NUM_STEVE, ICH_STEVE)}%`);
console.log(`  Mère Carmen:  BaZi ${baziTriadNorm}% + Num 70% + Yi 36% → ${calcScoreF(baziTriadNorm, 70, 36)}% (était ${calcScore(baziTriadNorm, 70, 36)}%)`);

console.log('\n═══ RÉSUMÉ ═══');
console.log('                    Père    Steve   Carmen  Laurent');
console.log(`  A (status quo):    ${calcScore(baziClashNorm, NUM_PERE, ICH_PERE)}%     ${calcScore(baziClashNorm, NUM_STEVE, ICH_STEVE)}%     ${calcScore(baziTriadNorm, 70, 36)}%     ${calcScore(baziTriadNorm, 65, 36)}%`);
console.log(`  B (Clash -6):      ${calcScore(baziB, NUM_PERE, ICH_PERE)}%     ${calcScore(baziB, NUM_STEVE, ICH_STEVE)}%     ${calcScore(baziTriadNorm, 70, 36)}%     ${calcScore(baziTriadNorm, 65, 36)}%`);
console.log(`  C (Floor 20%):     ${calcScore(baziC, NUM_PERE, ICH_PERE)}%     ${calcScore(baziC, NUM_STEVE, ICH_STEVE)}%     ${calcScore(baziTriadNorm, 70, 36)}%     ${calcScore(baziTriadNorm, 65, 36)}%`);
console.log(`  D (Poids 30/35/35):${calcScoreD(baziClashNorm, NUM_PERE, ICH_PERE)}%     ${calcScoreD(baziClashNorm, NUM_STEVE, ICH_STEVE)}%     ${calcScoreD(baziTriadNorm, 70, 36)}%     ${calcScoreD(baziTriadNorm, 65, 36)}%`);
console.log(`  E (Combo C+D):     ${calcScoreD(baziE, NUM_PERE, ICH_PERE)}%     ${calcScoreD(baziE, NUM_STEVE, ICH_STEVE)}%     ${calcScoreD(baziTriadNorm, 70, 36)}%     ${calcScoreD(baziTriadNorm, 65, 36)}%`);
console.log(`  F (Clash-5+35/30): ${calcScoreF(baziF, NUM_PERE, ICH_PERE)}%     ${calcScoreF(baziF, NUM_STEVE, ICH_STEVE)}%     ${calcScoreF(baziTriadNorm, 70, 36)}%     ${calcScoreF(baziTriadNorm, 65, 36)}%`);
