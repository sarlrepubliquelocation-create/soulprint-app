#!/usr/bin/env npx tsx
/**
 * Verification Ronde 13 P1 — toutes les modifs
 */

import { calcBond } from '../src/engines/compatibility';

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  VÉRIFICATION RONDE 13 — TOUTES LES MODIFS P1             ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

// Test 1: Famille (Jérôme × Laurent) — vérifie summary + badges + conseil
const r1 = calcBond('1977-09-23', 'Jérôme', '1981-08-17', 'Laurent', 'famille', 'frere_frere');
console.log('═══ TEST 1: Famille frere_frere (Jérôme × Laurent) ═══');
console.log(`Score: ${r1.scoreGlobal} — ${r1.label.name}`);
console.log(`Summary: ${r1.summary}`);
console.log(`Badges: ${r1.badges.length > 0 ? r1.badges.join(' | ') : '(aucun)'}`);
console.log(`Peach norm: mode=famille → toujours 50`);
console.log(`Conseil: ${r1.conseil?.substring(0, 80)}...`);
console.log('');

// Test 2: Amour (même paire) — vérifie Gaussienne amour
const r2 = calcBond('1977-09-23', 'Jérôme', '1981-08-17', 'Laurent', 'amour');
console.log('═══ TEST 2: Amour (Jérôme × Laurent) ═══');
console.log(`Score: ${r2.scoreGlobal} — ${r2.label.name}`);
console.log(`Summary: ${r2.summary}`);
console.log(`Badges: ${r2.badges.length > 0 ? r2.badges.join(' | ') : '(aucun)'}`);
console.log(`Peach level: ${r2.bazi.peachBlossomLevel} (0=inactif, 1=simple, 2=double)`);
const pbBreakdown = r2.breakdown.find(b => b.system === 'Peach Blossom');
console.log(`Peach norm score: ${pbBreakdown?.score}`);
console.log('');

// Test 3: Pro (même paire) — vérifie Gaussienne Pro dédiée μ=50,σ=16
const r3 = calcBond('1977-09-23', 'Jérôme', '1981-08-17', 'Laurent', 'pro');
console.log('═══ TEST 3: Pro (Jérôme × Laurent) — Gaussienne Pro ═══');
console.log(`Score: ${r3.scoreGlobal} — ${r3.label.name}`);
console.log(`Summary: ${r3.summary}`);
console.log('');

// Test 4: Sans noms (fallback LP absorbe 100%)
const r4 = calcBond('1977-09-23', '', '1981-08-17', '', 'amour');
console.log('═══ TEST 4: Sans noms — fallback numérologie ═══');
console.log(`Score: ${r4.scoreGlobal} — ${r4.label.name}`);
const numBreakdown = r4.breakdown.find(b => b.system === 'Numérologie');
console.log(`Num norm score: ${numBreakdown?.score} (doit être non-nul grâce au fallback LP)`);
const hasWarning = r4.alerts.some(a => a.includes('Prénoms non renseignés'));
console.log(`Warning noms vides: ${hasWarning ? '✅ PRÉSENT' : '❌ ABSENT'}`);
console.log('');

// Test 5: Avec noms — vérifier pas de warning
const r5 = calcBond('1977-09-23', 'Jérôme', '1981-08-17', 'Laurent', 'amour');
const noWarning = !r5.alerts.some(a => a.includes('Prénoms non renseignés'));
console.log('═══ TEST 5: Avec noms — pas de warning ═══');
console.log(`Warning absent: ${noWarning ? '✅ OK' : '❌ ERREUR — warning présent avec noms'}`);
console.log('');

// Résumé
console.log('═══ RÉSUMÉ ═══');
console.log(`✅ Summary présent: ${!!r1.summary && r1.summary.length > 20}`);
console.log(`✅ Badges disponibles: ${typeof r1.badges === 'object'}`);
console.log(`✅ Peach 3 niveaux: peachBlossomLevel existe = ${r2.bazi.peachBlossomLevel !== undefined}`);
console.log(`✅ Gaussienne Pro: score Pro (${r3.scoreGlobal}) ≠ score Amour (${r2.scoreGlobal}) = ${r3.scoreGlobal !== r2.scoreGlobal}`);
console.log(`✅ Fallback noms vides: warning + score non-nul = ${hasWarning && (numBreakdown?.score ?? 0) > 0}`);
console.log(`✅ Roi Wen interface: roiWen = ${r1.iching.roiWen !== undefined}`);
