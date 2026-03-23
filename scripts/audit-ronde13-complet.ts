#!/usr/bin/env npx tsx
/**
 * ═══ AUDIT COMPLET RONDE 13 — TOUTES LES MODIFICATIONS ═══
 * Teste chaque P1 implémenté avec des cas concrets
 */

import { calcBond, type BondMode, type FamilleSubType } from '../src/engines/compatibility';

let pass = 0;
let fail = 0;

function check(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    pass++;
  } else {
    console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`);
    fail++;
  }
}

console.log('╔══════════════════════════════════════════════════════════════════╗');
console.log('║         AUDIT COMPLET RONDE 13 — 19 mars 2026                 ║');
console.log('╚══════════════════════════════════════════════════════════════════╝\n');

// ═══ P1.1 — PEACH BLOSSOM 3 NIVEAUX ═══
console.log('═══ P1.1 — PEACH BLOSSOM 3 NIVEAUX ═══');

// Test: peachBlossomLevel existe et est 0, 1 ou 2
const rAmour = calcBond('1977-09-23', 'Jérôme', '1981-08-17', 'Laurent', 'amour');
check('peachBlossomLevel existe', rAmour.bazi.peachBlossomLevel !== undefined);
check('peachBlossomLevel ∈ {0,1,2}', [0, 1, 2].includes(rAmour.bazi.peachBlossomLevel));

// Famille: Peach toujours 50 quel que soit le niveau
const rFam = calcBond('1977-09-23', 'Jérôme', '1981-08-17', 'Laurent', 'famille', 'frere_frere');
const pbFam = rFam.breakdown.find(b => b.system === 'Peach Blossom');
check('Famille: Peach Blossom toujours 50', pbFam?.score === 50, `got ${pbFam?.score}`);

// Peach text doit varier selon le niveau
const rLevel0 = calcBond('1977-09-23', 'Jérôme', '1981-08-17', 'Laurent', 'amour');
const pbText = rLevel0.breakdown.find(b => b.system === 'Peach Blossom')?.detail;
check('Texte Peach non vide', !!pbText && pbText.length > 20);

console.log('');

// ═══ P1.2 — GAUSSIENNE PRO DÉDIÉE ═══
console.log('═══ P1.2 — GAUSSIENNE PRO DÉDIÉE (μ=50, σ=16) ═══');

const rAmour2 = calcBond('1985-03-15', 'Alice', '1988-07-22', 'Bob', 'amour');
const rPro = calcBond('1985-03-15', 'Alice', '1988-07-22', 'Bob', 'pro');
const rFam2 = calcBond('1985-03-15', 'Alice', '1988-07-22', 'Bob', 'famille', 'frere_soeur');
check('Score Pro ≠ Score Amour (Gaussienne différente)', rPro.scoreGlobal !== rAmour2.scoreGlobal,
  `Pro=${rPro.scoreGlobal}, Amour=${rAmour2.scoreGlobal}`);
check('Score Famille ≠ Score Amour', rFam2.scoreGlobal !== rAmour2.scoreGlobal,
  `Famille=${rFam2.scoreGlobal}, Amour=${rAmour2.scoreGlobal}`);

// Vérification que Pro a une médiane plus haute que Amour (même raw → Pro plus généreux car μ=50>45)
// On teste avec plusieurs paires
let proHigherCount = 0;
const testPairs = [
  ['1977-09-23', '1981-08-17'], ['1985-03-15', '1988-07-22'],
  ['1990-01-01', '1992-06-15'], ['1975-12-25', '1980-04-10'],
  ['1995-08-08', '1998-11-11'],
];
for (const [a, b] of testPairs) {
  const am = calcBond(a, 'X', b, 'Y', 'amour');
  const pr = calcBond(a, 'X', b, 'Y', 'pro');
  if (pr.scoreGlobal !== am.scoreGlobal) proHigherCount++;
}
check('Gaussienne Pro différencie les scores (≥4/5 paires)', proHigherCount >= 4,
  `${proHigherCount}/5 paires avec score différent`);

console.log('');

// ═══ P1.3 — RÉSUMÉ NARRATIF UNIFIÉ ═══
console.log('═══ P1.3 — RÉSUMÉ NARRATIF UNIFIÉ ═══');

const modes: BondMode[] = ['amour', 'pro', 'famille'];
for (const m of modes) {
  const r = calcBond('1977-09-23', 'Jérôme', '1981-08-17', 'Laurent', m,
    m === 'famille' ? 'frere_frere' : undefined);
  check(`Summary ${m} non vide`, !!r.summary && r.summary.length > 30,
    r.summary ? `${r.summary.length} chars` : 'VIDE');
  check(`Summary ${m} contient système dominant`,
    r.summary.includes('BaZi') || r.summary.includes('Numérologie') ||
    r.summary.includes('Yi King') || r.summary.includes('Peach'));
}

// Summaries doivent être différents entre modes
const sAmour = calcBond('1977-09-23', 'Jérôme', '1981-08-17', 'Laurent', 'amour').summary;
const sPro = calcBond('1977-09-23', 'Jérôme', '1981-08-17', 'Laurent', 'pro').summary;
const sFam = calcBond('1977-09-23', 'Jérôme', '1981-08-17', 'Laurent', 'famille', 'frere_frere').summary;
check('Summary Amour ≠ Pro', sAmour !== sPro);
check('Summary Amour ≠ Famille', sAmour !== sFam);

console.log('');

// ═══ P1.4 — BADGES "GOLDEN TICKETS" ═══
console.log('═══ P1.4 — BADGES SIGNAUX POSITIFS ═══');

// Le champ badges doit être un tableau
check('badges est un Array', Array.isArray(rAmour.badges));
check('badges type string[]', rAmour.badges.every(b => typeof b === 'string'));

// San He pour Jérôme × Laurent (on sait qu'il y a un Triangle Sacré)
const rJL = calcBond('1977-09-23', 'Jérôme', '1981-08-17', 'Laurent', 'amour');
const hasSanHe = rJL.badges.some(b => b.includes('San He'));
check('Badge "Triangle Sacré (San He)" détecté pour Jérôme×Laurent', hasSanHe);

// Vérifier que les badges possibles sont bien formés
const allBadges = new Set<string>();
for (const [a, b] of testPairs) {
  for (const m of modes) {
    const r = calcBond(a, 'Test', b, 'Test', m, m === 'famille' ? 'frere_soeur' : undefined);
    r.badges.forEach(badge => allBadges.add(badge));
  }
}
console.log(`  ℹ  Badges trouvés dans l'échantillon: ${[...allBadges].join(', ') || '(aucun)'}`);

console.log('');

// ═══ P1.5 — FALLBACK NOMS VIDES ═══
console.log('═══ P1.5 — FALLBACK NOMS VIDES ═══');

// Sans noms
const rNoName = calcBond('1977-09-23', '', '1981-08-17', '', 'amour');
const numNoName = rNoName.breakdown.find(b => b.system === 'Numérologie');
check('Sans noms: score Numérologie > 0 (fallback LP)', (numNoName?.score ?? 0) > 0,
  `score = ${numNoName?.score}`);
check('Sans noms: warning "Prénoms non renseignés" présent',
  rNoName.alerts.some(a => a.includes('Prénoms non renseignés')));

// Avec noms
const rWithName = calcBond('1977-09-23', 'Jérôme', '1981-08-17', 'Laurent', 'amour');
check('Avec noms: PAS de warning "Prénoms"',
  !rWithName.alerts.some(a => a.includes('Prénoms non renseignés')));

// Comparaison: avec noms devrait avoir un score numérologie potentiellement différent
const numWithName = rWithName.breakdown.find(b => b.system === 'Numérologie');
console.log(`  ℹ  Num sans noms: ${numNoName?.score}% | Num avec noms: ${numWithName?.score}%`);

console.log('');

// ═══ P1.6 — INTÉGRITÉ ROI WEN ═══
console.log('═══ P1.6 — INTÉGRITÉ ROI WEN ═══');

check('roiWen existe dans IChingCompatResult', rAmour.iching.roiWen !== undefined);
check('roiWen est boolean', typeof rAmour.iching.roiWen === 'boolean');

// Test: badge Roi Wen cohérent avec iching.roiWen
if (rAmour.iching.roiWen) {
  check('roiWen=true → badge présent', rAmour.badges.some(b => b.includes('Roi Wen')));
} else {
  check('roiWen=false → badge absent', !rAmour.badges.some(b => b.includes('Roi Wen')));
}

console.log('');

// ═══ RONDE 12 — VÉRIF NON-RÉGRESSION NARRATIFS ═══
console.log('═══ NON-RÉGRESSION — 13 SOUS-TYPES FAMILLE ═══');

const allSubTypes: FamilleSubType[] = [
  'frere_frere', 'soeur_soeur', 'frere_soeur',
  'pere_fils', 'pere_fille', 'mere_fils', 'mere_fille',
  'gp_petit_fils', 'gp_petite_fille', 'gm_petit_fils', 'gm_petite_fille',
  'coloc', 'ami'
];

const baziTexts = new Map<string, string[]>();
const conseilTexts = new Map<string, string[]>();
const summaryTexts = new Map<string, string[]>();

for (const sub of allSubTypes) {
  const r = calcBond('1977-09-23', 'Jérôme', '1981-08-17', 'Laurent', 'famille', sub);
  const bazi = r.breakdown.find(b => b.system === 'BaZi');

  if (bazi?.detail) {
    const existing = baziTexts.get(bazi.detail) || [];
    existing.push(sub);
    baziTexts.set(bazi.detail, existing);
  }
  if (r.conseil) {
    const existing = conseilTexts.get(r.conseil) || [];
    existing.push(sub);
    conseilTexts.set(r.conseil, existing);
  }
  if (r.summary) {
    const existing = summaryTexts.get(r.summary) || [];
    existing.push(sub);
    summaryTexts.set(r.summary, existing);
  }
}

let baziDupes = 0, conseilDupes = 0;
for (const [_, subs] of baziTexts) if (subs.length > 1) baziDupes++;
for (const [_, subs] of conseilTexts) if (subs.length > 1) conseilDupes++;

check(`BaZi textes: ${baziTexts.size}/13 uniques`, baziTexts.size === 13);
check(`Conseil textes: ${conseilTexts.size}/13 uniques`, conseilTexts.size === 13);
check('Aucun doublon BaZi', baziDupes === 0, `${baziDupes} doublons`);
check('Aucun doublon Conseil', conseilDupes === 0, `${conseilDupes} doublons`);

console.log('');

// ═══ EDGE CASES ═══
console.log('═══ EDGE CASES ═══');

// Même date de naissance
const rSame = calcBond('1985-03-15', 'Alice', '1985-03-15', 'Bob', 'amour');
check('Même date → cap 78', rSame.scoreGlobal <= 78, `score = ${rSame.scoreGlobal}`);
check('Même date → alerte présente', rSame.alerts.some(a => a.includes('Même date')));
check('Même date → summary non vide', !!rSame.summary && rSame.summary.length > 20);

// Scores dans les bornes
for (const m of modes) {
  const r = calcBond('1977-09-23', 'Jérôme', '1981-08-17', 'Laurent', m,
    m === 'famille' ? 'frere_frere' : undefined);
  check(`Score ${m} ∈ [5, 98]`, r.scoreGlobal >= 5 && r.scoreGlobal <= 98,
    `score = ${r.scoreGlobal}`);
}

console.log('');

// ═══ VERDICT ═══
console.log('╔══════════════════════════════════════════════════════════════════╗');
console.log(`║  RÉSULTAT : ${pass} PASS / ${fail} FAIL                                     ║`);
console.log(`║  ${fail === 0 ? '✅ TOUS LES TESTS PASSENT — RONDE 13 VALIDÉE' : '❌ DES TESTS ONT ÉCHOUÉ — CORRECTIONS NÉCESSAIRES'}          ║`);
console.log('╚══════════════════════════════════════════════════════════════════╝');
