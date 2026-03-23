#!/usr/bin/env npx tsx
/**
 * Diagnostic Script for Jérôme × Stéphanie Compatibility
 * Validates all intermediate calculation values
 */

import {
  calcNumerology,
  calcLifePath,
  calcExpression,
  calcSoul,
  formatReductionPath
} from '../src/engines/numerology';

import {
  calcDayMaster,
  calcBaZiCompat,
  checkLiuHe,
  getPeachBlossom,
  type BaZiCompatResult
} from '../src/engines/bazi';

import {
  calcNatalIChing,
  calcIChing,
  type IChingReading
} from '../src/engines/iching';

import {
  calcBond,
  type CompatibilityResult
} from '../src/engines/compatibility';

// ═══════════════════════════════════════════════════════════
// TEST DATA
// ═══════════════════════════════════════════════════════════

const JEROME = {
  firstName: 'Jérôme',
  middleName: '',
  lastName: '', // Not provided, will use first name for calculations
  birthDate: '1977-09-23'
};

const STEPHANIE = {
  firstName: 'Stéphanie',
  middleName: '',
  lastName: '',
  birthDate: '1980-03-07'
};

const TODAY = '2026-03-19';
const MODE = 'famille'; // or 'frere_frere' for famille

// ═══════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════

function printSection(title: string): void {
  console.log('\n' + '═'.repeat(70));
  console.log(`  ${title}`);
  console.log('═'.repeat(70));
}

function printSubsection(title: string): void {
  console.log(`\n  ► ${title}`);
  console.log('  ' + '─'.repeat(66));
}

function printKeyValue(key: string, value: any, indent = 4): void {
  const indentStr = ' '.repeat(indent);
  console.log(`${indentStr}${key}: ${value}`);
}

// ═══════════════════════════════════════════════════════════
// MAIN DIAGNOSTIC
// ═══════════════════════════════════════════════════════════

async function diagnose(): Promise<void> {
  console.clear();
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║  KAIRONAUTE COMPATIBILITY DIAGNOSTIC                              ║');
  console.log('║  Jérôme (1977-09-23) × Stéphanie (1980-03-07)                       ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log(`Mode: ${MODE} | Date: ${TODAY}`);

  // ═══════════════════════════════════════════════════════════
  // 1. NUMEROLOGY
  // ═══════════════════════════════════════════════════════════

  printSection('1. NUMEROLOGY');

  printSubsection('Jérôme (1977-09-23)');
  const jNum = calcNumerology(JEROME.firstName, '', '', JEROME.birthDate, TODAY);
  printKeyValue('Life Path (CdV)', `${jNum.lp.v}${jNum.lp.m ? ' (Master)' : ''} - ${formatReductionPath(jNum.lp)}`);
  printKeyValue('Expression', `${jNum.expr.v}${jNum.expr.m ? ' (Master)' : ''} - ${formatReductionPath(jNum.expr)}`);
  printKeyValue('Soul Urge', `${jNum.soul.v}${jNum.soul.m ? ' (Master)' : ''} - ${formatReductionPath(jNum.soul)}`);
  printKeyValue('Personality', `${jNum.pers.v}${jNum.pers.m ? ' (Master)' : ''} - ${formatReductionPath(jNum.pers)}`);
  printKeyValue('Maturity', `${jNum.mat.v}${jNum.mat.m ? ' (Master)' : ''} - ${formatReductionPath(jNum.mat)}`);
  printKeyValue('Birthday', `${jNum.bday.v}${jNum.bday.m ? ' (Master)' : ''}`);
  printKeyValue('Personal Year (2026)', `${jNum.py.v}${jNum.py.m ? ' (Master)' : ''}`);
  printKeyValue('Karmic Debt', jNum.karmicDebt ? `${jNum.karmicDebt} (detected)` : 'None');
  printKeyValue('Inclusion Grid', JSON.stringify(jNum.ig));
  printKeyValue('Karmic Lessons', JSON.stringify(jNum.kl));
  printKeyValue('Hidden Passions', JSON.stringify(jNum.hp));

  printSubsection('Stéphanie (1980-03-07)');
  const lNum = calcNumerology(STEPHANIE.firstName, '', '', STEPHANIE.birthDate, TODAY);
  printKeyValue('Life Path (CdV)', `${lNum.lp.v}${lNum.lp.m ? ' (Master)' : ''} - ${formatReductionPath(lNum.lp)}`);
  printKeyValue('Expression', `${lNum.expr.v}${lNum.expr.m ? ' (Master)' : ''} - ${formatReductionPath(lNum.expr)}`);
  printKeyValue('Soul Urge', `${lNum.soul.v}${lNum.soul.m ? ' (Master)' : ''} - ${formatReductionPath(lNum.soul)}`);
  printKeyValue('Personality', `${lNum.pers.v}${lNum.pers.m ? ' (Master)' : ''} - ${formatReductionPath(lNum.pers)}`);
  printKeyValue('Maturity', `${lNum.mat.v}${lNum.mat.m ? ' (Master)' : ''} - ${formatReductionPath(lNum.mat)}`);
  printKeyValue('Birthday', `${lNum.bday.v}${lNum.bday.m ? ' (Master)' : ''}`);
  printKeyValue('Personal Year (2026)', `${lNum.py.v}${lNum.py.m ? ' (Master)' : ''}`);
  printKeyValue('Karmic Debt', lNum.karmicDebt ? `${lNum.karmicDebt} (detected)` : 'None');
  printKeyValue('Inclusion Grid', JSON.stringify(lNum.ig));
  printKeyValue('Karmic Lessons', JSON.stringify(lNum.kl));
  printKeyValue('Hidden Passions', JSON.stringify(lNum.hp));

  // ═══════════════════════════════════════════════════════════
  // 2. BAZI (Four Pillars)
  // ═══════════════════════════════════════════════════════════

  printSection('2. BAZI - FOUR PILLARS & DAY MASTER');

  printSubsection('Jérôme Day Master');
  const jDayMaster = calcDayMaster(new Date(JEROME.birthDate + 'T12:00:00Z'));
  printKeyValue('Stem (天干)', `${jDayMaster.stem.pinyin} (${jDayMaster.stem.chinese}) - ${jDayMaster.stem.element} (${jDayMaster.stem.yinYang})`);
  printKeyValue('Branch (地支)', `${jDayMaster.branch.pinyin} (${jDayMaster.branch.chinese}) - ${jDayMaster.branch.animal} - ${jDayMaster.branch.element}`);
  printKeyValue('Element', jDayMaster.stem.element);
  printKeyValue('Archetype', jDayMaster.stem.archetype);

  printSubsection('Stéphanie Day Master');
  const lDayMaster = calcDayMaster(new Date(STEPHANIE.birthDate + 'T12:00:00Z'));
  printKeyValue('Stem (天干)', `${lDayMaster.stem.pinyin} (${lDayMaster.stem.chinese}) - ${lDayMaster.stem.element} (${lDayMaster.stem.yinYang})`);
  printKeyValue('Branch (地支)', `${lDayMaster.branch.pinyin} (${lDayMaster.branch.chinese}) - ${lDayMaster.branch.animal} - ${lDayMaster.branch.element}`);
  printKeyValue('Element', lDayMaster.stem.element);
  printKeyValue('Archetype', lDayMaster.stem.archetype);

  printSubsection('BaZi Compatibility Analysis');
  const baziCompat = calcBaZiCompat(
    new Date(JEROME.birthDate + 'T12:00:00Z'),
    new Date(STEPHANIE.birthDate + 'T12:00:00Z')
  );
  printKeyValue('Signals', JSON.stringify(baziCompat.signals));
  printKeyValue('Alerts', JSON.stringify(baziCompat.alerts));
  printKeyValue('Score', baziCompat.score);
  printKeyValue('Detail', baziCompat.detail);

  printSubsection('Peach Blossom (Fleur de Pêcher)');
  const jPeachBlossom = getPeachBlossom(new Date(JEROME.birthDate + 'T12:00:00Z'), new Date(TODAY + 'T12:00:00Z'));
  const lPeachBlossom = getPeachBlossom(new Date(STEPHANIE.birthDate + 'T12:00:00Z'), new Date(TODAY + 'T12:00:00Z'));
  printKeyValue('Jérôme PB Active', jPeachBlossom?.isActive ? 'YES' : 'NO');
  if (jPeachBlossom) {
    printKeyValue('Jérôme PB Details', `${jPeachBlossom.animalName} - ${jPeachBlossom.dynamique}`);
  }
  printKeyValue('Stéphanie PB Active', lPeachBlossom?.isActive ? 'YES' : 'NO');
  if (lPeachBlossom) {
    printKeyValue('Stéphanie PB Details', `${lPeachBlossom.animalName} - ${lPeachBlossom.dynamique}`);
  }

  // ═══════════════════════════════════════════════════════════
  // 3. I CHING HEXAGRAMS
  // ═══════════════════════════════════════════════════════════

  printSection('3. I CHING HEXAGRAMS');

  printSubsection('Jérôme Natal Hexagram');
  const jNatalHex = calcNatalIChing(JEROME.birthDate);
  printKeyValue('Hex Number', jNatalHex.hexNum);
  printKeyValue('Name', jNatalHex.name);
  printKeyValue('Keyword', jNatalHex.keyword);
  printKeyValue('Lower Trigram', jNatalHex.lower);
  printKeyValue('Upper Trigram', jNatalHex.upper);
  printKeyValue('Changing Line', jNatalHex.changing);
  printKeyValue('Lines', JSON.stringify(jNatalHex.lines));

  printSubsection('Stéphanie Natal Hexagram');
  const lNatalHex = calcNatalIChing(STEPHANIE.birthDate);
  printKeyValue('Hex Number', lNatalHex.hexNum);
  printKeyValue('Name', lNatalHex.name);
  printKeyValue('Keyword', lNatalHex.keyword);
  printKeyValue('Lower Trigram', lNatalHex.lower);
  printKeyValue('Upper Trigram', lNatalHex.upper);
  printKeyValue('Changing Line', lNatalHex.changing);
  printKeyValue('Lines', JSON.stringify(lNatalHex.lines));

  printSubsection('Daily I Ching (Today - 2026-03-19)');
  const jDailyHex = calcIChing(JEROME.birthDate, TODAY);
  const lDailyHex = calcIChing(STEPHANIE.birthDate, TODAY);
  printKeyValue('Jérôme Daily Hex', `#${jDailyHex.hexNum} - ${jDailyHex.name}`);
  printKeyValue('Stéphanie Daily Hex', `#${lDailyHex.hexNum} - ${lDailyHex.name}`);

  // ═══════════════════════════════════════════════════════════
  // 4. FULL COMPATIBILITY SCORE
  // ═══════════════════════════════════════════════════════════

  printSection('4. FULL COMPATIBILITY CALCULATION');

  try {
    const compat = calcBond(
      JEROME.birthDate,
      JEROME.firstName,
      STEPHANIE.birthDate,
      STEPHANIE.firstName,
      MODE as any,
      'frere_soeur'
    );

    printSubsection('Overall Score');
    printKeyValue('Score Global', compat.scoreGlobal);
    printKeyValue('Label', compat.label);
    printKeyValue('Mode', compat.mode);
    printKeyValue('Same Birthdate', compat.sameBirthdate ? 'YES' : 'NO');
    printKeyValue('Peach Blossom Crossed', compat.peachCrossed ? 'YES' : 'NO');

    printSubsection('System Breakdown');
    compat.breakdown.forEach(item => {
      console.log(`\n    System: ${item.system}`);
      printKeyValue('Score', item.score, 6);
      printKeyValue('Weight', item.weight, 6);
      printKeyValue('Icon', item.icon, 6);
      if (item.detail) {
        printKeyValue('Detail', item.detail, 6);
      }
      if (item.technicals && item.technicals.length > 0) {
        printKeyValue('Technicals', item.technicals.join(' | '), 6);
      }
    });

    printSubsection('Signals & Alerts');
    if (compat.signals && compat.signals.length > 0) {
      console.log('    Signals:');
      compat.signals.forEach(s => console.log(`      • ${s}`));
    }
    if (compat.alerts && compat.alerts.length > 0) {
      console.log('    Alerts:');
      compat.alerts.forEach(a => console.log(`      ⚠ ${a}`));
    }

    printSubsection('Conseil');
    if (compat.conseil) {
      console.log(`\n    ${compat.conseil}`);
    }

    if (compat.familleDesc) {
      printSubsection('Famille Description');
      console.log(`\n    ${compat.familleDesc}`);
    }

  } catch (error: any) {
    console.error('\n  ERROR during compatibility calculation:');
    console.error(`  ${error.message}`);
    console.error(error.stack);
  }

  // ═══════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════

  printSection('DIAGNOSTIC SUMMARY');

  console.log('\n  Key Values to Verify:');
  console.log(`    • Jérôme CdV: ${jNum.lp.v} | Expression: ${jNum.expr.v} | Soul: ${jNum.soul.v}`);
  console.log(`    • Stéphanie CdV: ${lNum.lp.v} | Expression: ${lNum.expr.v} | Soul: ${lNum.soul.v}`);
  console.log(`    • Jérôme BaZi: ${jDayMaster.stem.element} ${jDayMaster.stem.pinyin} / ${jDayMaster.branch.animal}`);
  console.log(`    • Stéphanie BaZi: ${lDayMaster.stem.element} ${lDayMaster.stem.pinyin} / ${lDayMaster.branch.animal}`);
  console.log(`    • Jérôme Natal Hex: #${jNatalHex.hexNum} - ${jNatalHex.name}`);
  console.log(`    • Stéphanie Natal Hex: #${lNatalHex.hexNum} - ${lNatalHex.name}`);
  console.log(`    • Compatibility Score: [Check above in FULL COMPATIBILITY CALCULATION]`);

  console.log('\n' + '═'.repeat(70));
  console.log('  End of Diagnostic\n');
}

// Run diagnostic
diagnose().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
