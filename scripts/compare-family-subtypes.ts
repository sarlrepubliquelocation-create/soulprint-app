#!/usr/bin/env npx tsx
/**
 * Compare family sub-types to verify narrative differentiation
 * Jérôme (1977-09-23) × Laurent (1981-08-17) with various familleSubType values
 */

import { calcBond, type FamilleSubType } from '../src/engines/compatibility';

const BD_A = '1977-09-23';
const NAME_A = 'Jérôme';
const BD_B = '1981-08-17';
const NAME_B = 'Laurent';

const SUB_TYPES: FamilleSubType[] = [
  'frere_frere', 'soeur_soeur', 'frere_soeur',
  'pere_fils', 'pere_fille', 'mere_fils', 'mere_fille',
  'gp_petit_fils', 'gp_petite_fille', 'gm_petit_fils', 'gm_petite_fille',
  'coloc', 'ami'
];

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  COMPARAISON NARRATIFS PAR SOUS-TYPE FAMILIAL              ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

for (const sub of SUB_TYPES) {
  const result = calcBond(BD_A, NAME_A, BD_B, NAME_B, 'famille', sub);

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${sub.toUpperCase()} — Score: ${result.scoreGlobal}`);
  console.log(`${'═'.repeat(60)}`);

  // BaZi detail (includes family context suffix)
  const bazi = result.breakdown.find(b => b.system === 'BaZi');
  if (bazi) {
    console.log(`\n  [BaZi] ${bazi.detail}`);
  }

  // Conseil
  if (result.conseil) {
    console.log(`\n  [Conseil] ${result.conseil}`);
  }

  console.log('');
}

// Summary: check for duplicates
console.log('\n\n╔══════════════════════════════════════════════════════════════╗');
console.log('║  VÉRIFICATION DOUBLONS                                     ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

const baziTexts = new Map<string, string[]>();
const conseilTexts = new Map<string, string[]>();

for (const sub of SUB_TYPES) {
  const result = calcBond(BD_A, NAME_A, BD_B, NAME_B, 'famille', sub);
  const bazi = result.breakdown.find(b => b.system === 'BaZi');

  if (bazi?.detail) {
    const existing = baziTexts.get(bazi.detail) || [];
    existing.push(sub);
    baziTexts.set(bazi.detail, existing);
  }

  if (result.conseil) {
    const existing = conseilTexts.get(result.conseil) || [];
    existing.push(sub);
    conseilTexts.set(result.conseil, existing);
  }
}

let dupes = 0;
for (const [text, subs] of baziTexts) {
  if (subs.length > 1) {
    console.log(`  ⚠ DOUBLON BaZi: ${subs.join(', ')}`);
    console.log(`    "${text.substring(0, 80)}..."\n`);
    dupes++;
  }
}

for (const [text, subs] of conseilTexts) {
  if (subs.length > 1) {
    console.log(`  ⚠ DOUBLON Conseil: ${subs.join(', ')}`);
    console.log(`    "${text.substring(0, 80)}..."\n`);
    dupes++;
  }
}

if (dupes === 0) {
  console.log('  ✅ AUCUN DOUBLON — Tous les textes BaZi et Conseil sont uniques !');
}

console.log(`\n  Total sous-types testés: ${SUB_TYPES.length}`);
console.log(`  Textes BaZi uniques: ${baziTexts.size}/${SUB_TYPES.length}`);
console.log(`  Textes Conseil uniques: ${conseilTexts.size}/${SUB_TYPES.length}`);
