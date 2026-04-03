// ═══════════════════════════════════════════════════════════════════════════════
// TEST: LP_PAIR_TEXT × Modes + calcBondDaily Signal Coverage
// ═══════════════════════════════════════════════════════════════════════════════
// PART A: LP_PAIR_TEXT exhaustive verification (45 pairs × amour/pro/famille modes)
// PART B: calcBondDaily typed signal verification (100+ dates, signal coverage report)

import { calcBond, calcBondDaily, BondMode, FamilleSubType } from '../src/engines/compatibility';
import { calcLifePath } from '../src/engines/numerology';

// ══════════════════════════════════════════════════════════════════════════════
// PART A: LP_PAIR_TEXT Exhaustive Verification
// ══════════════════════════════════════════════════════════════════════════════

interface TestResult {
  passed: number;
  failed: number;
  errors: string[];
}

function testLPPairText(): TestResult {
  const result: TestResult = { passed: 0, failed: 0, errors: [] };

  // Step 1: Build a map of CdV → real birth date
  // Find dates that produce each CdV 1-9
  const cdvMap: Record<number, string> = {};
  for (let y = 1950; y <= 2005; y++) {
    for (let m = 1; m <= 12; m++) {
      for (let d = 1; d <= 28; d++) {
        const bd = y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
        const lp = calcLifePath(bd);
        const cdv = lp.v;
        if (!cdvMap[cdv]) cdvMap[cdv] = bd;
      }
    }
  }

  // Verify we have dates for all 1-9
  for (let i = 1; i <= 9; i++) {
    if (!cdvMap[i]) {
      result.errors.push(`No date found for CdV ${i}`);
      result.failed++;
      return result;
    }
  }

  console.log('CdV Date Map:', cdvMap);

  // Step 2: Generate all 45 unique pairs (a ≤ b, 1-9)
  const pairs: [number, number][] = [];
  for (let a = 1; a <= 9; a++) {
    for (let b = a; b <= 9; b++) {
      pairs.push([a, b]);
    }
  }

  console.log(`\n📊 LP_PAIR_TEXT Verification: ${pairs.length} pairs`);

  // Step 3: For each pair, call calcBond in all three modes
  const modes: BondMode[] = ['amour', 'pro', 'famille'];

  for (const [cdvA, cdvB] of pairs) {
    const bdA = cdvMap[cdvA];
    const bdB = cdvMap[cdvB];

    for (const mode of modes) {
      try {
        let bond;
        if (mode === 'famille') {
          bond = calcBond(bdA, `Person_${cdvA}`, bdB, `Person_${cdvB}`, mode, 'frere_soeur');
        } else {
          bond = calcBond(bdA, `Person_${cdvA}`, bdB, `Person_${cdvB}`, mode);
        }

        // Check breakdown for Numérologie section
        const numeroBreakdown = bond.breakdown.find((b) => b.system === 'Numérologie');
        if (!numeroBreakdown) {
          result.errors.push(`[${cdvA}-${cdvB}] [${mode}] No Numérologie breakdown`);
          result.failed++;
          continue;
        }

        const detail = numeroBreakdown.detail || '';

        // Check 1: detail text is non-empty
        if (!detail || detail.trim().length === 0) {
          result.errors.push(`[${cdvA}-${cdvB}] [${mode}] Empty detail text`);
          result.failed++;
          continue;
        }

        // Check 2: Check length ≥ 30 chars
        if (detail.length < 30) {
          result.errors.push(`[${cdvA}-${cdvB}] [${mode}] Detail too short (${detail.length} chars): "${detail}"`);
          result.failed++;
          continue;
        }

        // Check 3: No "CdV" abbreviation (should say "Chemin de Vie")
        if (detail.includes('CdV')) {
          result.errors.push(`[${cdvA}-${cdvB}] [${mode}] Found "CdV" abbreviation (should be "Chemin de Vie")`);
          result.failed++;
          continue;
        }

        // Check 4: No English "Peach Blossom" (should be French)
        if (detail.includes('Peach Blossom')) {
          result.errors.push(`[${cdvA}-${cdvB}] [${mode}] Found English "Peach Blossom" (should be French)`);
          result.failed++;
          continue;
        }

        // Check 5: No vouvoiement (formal you)
        // Check for patterns like "vous", "Vous", "votre", "Votre"
        if (/\bvous\b|\bVous\b|\bvotre\b|\bVotre\b/i.test(detail)) {
          result.errors.push(`[${cdvA}-${cdvB}] [${mode}] Found vouvoiement (formal): "${detail.substring(0, 80)}..."`);
          result.failed++;
          continue;
        }

        // Check 6: Mode-appropriate content
        // For pro mode, should have work-related keywords
        if (mode === 'pro') {
          const hasProContent = /travail|collaboration|professionnel|objectif|projet|competence|talent/i.test(detail);
          if (!hasProContent) {
            result.errors.push(`[${cdvA}-${cdvB}] [${mode}] No professional keywords in detail: "${detail.substring(0, 80)}..."`);
            result.failed++;
            continue;
          }
        }

        // For famille mode, should have family-related keywords
        if (mode === 'famille') {
          const hasFamilleContent = /famille|lien|frere|soeur|fratrie|droit|role|identite|existence/i.test(detail);
          if (!hasFamilleContent) {
            result.errors.push(`[${cdvA}-${cdvB}] [${mode}] No family keywords in detail: "${detail.substring(0, 80)}..."`);
            result.failed++;
            continue;
          }
        }

        result.passed++;
      } catch (err) {
        result.errors.push(`[${cdvA}-${cdvB}] [${mode}] Exception: ${err}`);
        result.failed++;
      }
    }
  }

  return result;
}

// ══════════════════════════════════════════════════════════════════════════════
// PART B: calcBondDaily Signal Coverage Verification
// ══════════════════════════════════════════════════════════════════════════════

interface DailySignalAnalysis {
  totalTests: number;
  totalSignals: number;
  uniqueSignals: Set<string>;
  signalsByType: Record<string, string[]>;
  datesWithZeroSignals: string[];
  peachBlossomDates: string[];
  liuHeDoubleCount: number;
  clashDoubleCount: number;
  frenchVerified: boolean;
  englishFound: string[];
  cdvAbbreviationFound: string[];
  vouvoiementFound: string[];
  errors: string[];
}

function testCalcBondDaily(): DailySignalAnalysis {
  const analysis: DailySignalAnalysis = {
    totalTests: 0,
    totalSignals: 0,
    uniqueSignals: new Set(),
    signalsByType: {},
    datesWithZeroSignals: [],
    peachBlossomDates: [],
    liuHeDoubleCount: 0,
    clashDoubleCount: 0,
    frenchVerified: true,
    englishFound: [],
    cdvAbbreviationFound: [],
    vouvoiementFound: [],
    errors: [],
  };

  // Fixed birth date pair for testing
  const bdA = '1975-03-15'; // Example person A
  const bdB = '1981-07-22'; // Example person B

  // Generate 100+ test dates across 2025-2026
  const testDates: string[] = [];

  // January 2025 - December 2026
  for (let year = 2025; year <= 2026; year++) {
    for (let month = 1; month <= 12; month++) {
      // Take 5 dates per month
      for (let day = 1; day <= 28; day += 6) {
        const dateStr = year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
        testDates.push(dateStr);
      }
    }
  }

  console.log(`\n📊 calcBondDaily Verification: ${testDates.length} dates`);

  // Run tests
  for (const date of testDates) {
    try {
      const result = calcBondDaily(bdA, bdB, date);

      analysis.totalTests++;
      const signalCount = (result.signals || []).length + (result.alerts || []).length;
      analysis.totalSignals += signalCount;

      // Collect signals
      const allSignals = [...(result.signals || []), ...(result.alerts || [])];
      if (allSignals.length === 0) {
        analysis.datesWithZeroSignals.push(date);
      }

      // Categorize signals
      for (const signal of allSignals) {
        analysis.uniqueSignals.add(signal);

        // Categorize by type
        let type = 'other';
        if (signal.includes('Fleur de Pêcher')) {
          type = 'peach';
          analysis.peachBlossomDates.push(date);
        } else if (signal.includes('Liù Hé')) {
          type = 'liu_he';
          if (signal.includes('double')) analysis.liuHeDoubleCount++;
        } else if (signal.includes('clash') || signal.includes('Clash')) {
          type = 'clash';
          if (signal.includes('Double')) analysis.clashDoubleCount++;
        }

        if (!analysis.signalsByType[type]) analysis.signalsByType[type] = [];
        if (!analysis.signalsByType[type].includes(signal)) {
          analysis.signalsByType[type].push(signal);
        }

        // Verify French content
        if (signal.includes('Peach Blossom')) {
          analysis.englishFound.push(signal);
          analysis.frenchVerified = false;
        }
        if (signal.includes('CdV')) {
          analysis.cdvAbbreviationFound.push(signal);
        }
        if (/\bvous\b|\bVous\b|\bvotre\b|\bVotre\b/i.test(signal)) {
          analysis.vouvoiementFound.push(signal);
        }
      }
    } catch (err) {
      analysis.errors.push(`[${date}] Exception: ${err}`);
    }
  }

  return analysis;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN TEST RUNNER
// ══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('TEST SUITE: LP_PAIR_TEXT × Modes + calcBondDaily Signals');
  console.log('═══════════════════════════════════════════════════════════════════');

  // PART A
  console.log('\n┌─ PART A: LP_PAIR_TEXT Exhaustive Verification ─────────────────┐');
  const partAResults = testLPPairText();
  console.log(`│ Total tests: ${partAResults.passed + partAResults.failed}`);
  console.log(`│ Passed: ${partAResults.passed} ✓`);
  console.log(`│ Failed: ${partAResults.failed} ✗`);
  if (partAResults.errors.length > 0) {
    console.log(`│\n│ Errors (first 10):${partAResults.errors.slice(0, 10).map((e) => `\n│   - ${e}`).join('')}`);
  }
  console.log('└────────────────────────────────────────────────────────────────┘');

  // PART B
  console.log('\n┌─ PART B: calcBondDaily Signal Coverage Verification ───────────┐');
  const partBResults = testCalcBondDaily();
  console.log(`│ Total tests: ${partBResults.totalTests}`);
  console.log(`│ Total signals collected: ${partBResults.totalSignals}`);
  console.log(`│ Unique signals: ${partBResults.uniqueSignals.size}`);
  console.log(`│ Dates with zero signals: ${partBResults.datesWithZeroSignals.length}`);
  if (partBResults.datesWithZeroSignals.length > 0) {
    console.log(`│   Examples: ${partBResults.datesWithZeroSignals.slice(0, 3).join(', ')}`);
  }
  console.log(`│\n│ Signal Coverage by Type:`);
  for (const [type, signals] of Object.entries(partBResults.signalsByType)) {
    console.log(`│   - ${type}: ${signals.length} unique`);
  }
  console.log(`│\n│ Peach Blossom dates triggered: ${partBResults.peachBlossomDates.length}`);
  console.log(`│ Liu He double count: ${partBResults.liuHeDoubleCount}`);
  console.log(`│ Clash double count: ${partBResults.clashDoubleCount}`);
  console.log(`│\n│ French Quality Checks:`);
  console.log(`│   - French content verified: ${partBResults.frenchVerified ? 'YES ✓' : 'NO ✗'}`);
  console.log(`│   - English "Peach Blossom" found: ${partBResults.englishFound.length}`);
  console.log(`│   - "CdV" abbreviation found: ${partBResults.cdvAbbreviationFound.length}`);
  console.log(`│   - Vouvoiement found: ${partBResults.vouvoiementFound.length}`);
  if (partBResults.errors.length > 0) {
    console.log(`│\n│ Errors: ${partBResults.errors.length}`);
    console.log(`│${partBResults.errors.slice(0, 5).map((e) => `\n│   - ${e}`).join('')}`);
  }
  console.log('└────────────────────────────────────────────────────────────────┘');

  // Summary
  const partAPassed = partAResults.failed === 0;
  const partBPassed = partBResults.frenchVerified && partBResults.englishFound.length === 0;

  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log(`SUMMARY`);
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`Part A (LP_PAIR_TEXT): ${partAPassed ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`Part B (calcBondDaily): ${partBPassed ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`Overall: ${partAPassed && partBPassed ? '✓ ALL PASS' : '✗ FAILURES DETECTED'}`);
  console.log('═══════════════════════════════════════════════════════════════════');

  process.exit(partAPassed && partBPassed ? 0 : 1);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
