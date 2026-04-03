/**
 * COMPREHENSIVE TEST: Median & Strongest System Assertions
 * Kaironaute Affinité Engine v4.1
 *
 * Test Objectives:
 * A. Median Assertion: Generate 1000 random birth date pairs, verify score distribution
 * B. Strongest System: 200 pairs across all modes, verify summary mentions strongest system
 * C. Display Name: 50 pairs, verify French names only (no English system names)
 *
 * Build: npx esbuild tests/test-median-strongest-assertions.ts --bundle --platform=node --target=node18 --outfile=/tmp/test-median-strongest.js
 * Run: node /tmp/test-median-strongest.js
 */

import { calcBond, type BondMode, type FamilleSubType } from '../src/engines/compatibility';

// ══════════════════════════════════════════════════════════════
// ═══ UTILITIES ═══
// ══════════════════════════════════════════════════════════════

function randomDateBetween(startYear: number, endYear: number): string {
  const start = new Date(startYear, 0, 1).getTime();
  const end = new Date(endYear, 11, 31).getTime();
  const randomTime = start + Math.random() * (end - start);
  const date = new Date(randomTime);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function calculateMedian(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function calculateMean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function calculateStdev(arr: number[], mean: number): number {
  const variance = arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
  return Math.sqrt(variance);
}

function buildHistogram(scores: number[], bucketSize: number = 10): Record<string, number> {
  const histogram: Record<string, number> = {};
  for (let i = 0; i <= 100; i += bucketSize) {
    const bucket = `${i}-${i + bucketSize - 1}`;
    histogram[bucket] = 0;
  }
  scores.forEach(score => {
    const bucket = Math.floor(score / bucketSize) * bucketSize;
    const key = `${bucket}-${bucket + bucketSize - 1}`;
    if (histogram[key] !== undefined) histogram[key]++;
  });
  return histogram;
}

function printHistogram(histogram: Record<string, number>, title: string): void {
  console.log(`\n${title}`);
  console.log('─'.repeat(60));
  Object.entries(histogram).forEach(([range, count]) => {
    const bar = '█'.repeat(Math.ceil(count / 5));
    console.log(`${range.padEnd(10)} │ ${bar} (${count})`);
  });
}

// ══════════════════════════════════════════════════════════════
// ═══ PART A: MEDIAN ASSERTION ═══
// ══════════════════════════════════════════════════════════════

interface MedianAssertionResult {
  mode: BondMode;
  count: number;
  median: number;
  mean: number;
  stdev: number;
  min: number;
  max: number;
  assertions: {
    medianInRange: boolean; // [58, 78]
    boundsCheck: boolean;   // [5, 98]
    stdevGreaterThan5: boolean;
    minLessThan55: boolean;
    maxGreaterThan75: boolean;
  };
  allPass: boolean;
}

function testMedianAssertion(): MedianAssertionResult[] {
  const modes: BondMode[] = ['amour', 'pro', 'famille'];
  const results: MedianAssertionResult[] = [];

  modes.forEach(mode => {
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`PART A: MEDIAN ASSERTION — Mode: ${mode.toUpperCase()}`);
    console.log(`${'═'.repeat(70)}`);

    const scores: number[] = [];

    // Generate 1000 random pairs
    for (let i = 0; i < 1000; i++) {
      const bdA = randomDateBetween(1950, 2005);
      const bdB = randomDateBetween(1950, 2005);
      const nameA = `TEST_A_${i}`;
      const nameB = `TEST_B_${i}`;

      const result = calcBond(bdA, nameA, bdB, nameB, mode, mode === 'famille' ? 'ami' : undefined);
      scores.push(result.scoreGlobal);
    }

    const median = calculateMedian(scores);
    const mean = calculateMean(scores);
    const stdev = calculateStdev(scores, mean);
    const min = Math.min(...scores);
    const max = Math.max(...scores);

    // Assertions
    const assertions = {
      medianInRange: median >= 58 && median <= 78,
      boundsCheck: scores.every(s => s >= 5 && s <= 98),
      stdevGreaterThan5: stdev > 5,
      minLessThan55: min < 55,
      maxGreaterThan75: max > 75,
    };

    const allPass = Object.values(assertions).every(v => v === true);

    console.log(`\nDistribution Stats (n=1000):`);
    console.log(`  Median:  ${median.toFixed(2)} (expected: 58-78) ${assertions.medianInRange ? '✓' : '✗'}`);
    console.log(`  Mean:    ${mean.toFixed(2)}`);
    console.log(`  StDev:   ${stdev.toFixed(2)} (expected: > 5) ${assertions.stdevGreaterThan5 ? '✓' : '✗'}`);
    console.log(`  Min:     ${min.toFixed(0)} (expected: < 55) ${assertions.minLessThan55 ? '✓' : '✗'}`);
    console.log(`  Max:     ${max.toFixed(0)} (expected: > 75) ${assertions.maxGreaterThan75 ? '✓' : '✗'}`);
    console.log(`  Bounds:  [5, 98] ${assertions.boundsCheck ? '✓' : '✗'}`);

    const histogram = buildHistogram(scores, 10);
    printHistogram(histogram, 'Score Distribution Histogram');

    results.push({
      mode,
      count: scores.length,
      median,
      mean,
      stdev,
      min,
      max,
      assertions,
      allPass,
    });
  });

  return results;
}

// ══════════════════════════════════════════════════════════════
// ═══ PART B: STRONGEST SYSTEM ASSERTION ═══
// ══════════════════════════════════════════════════════════════

interface StrongestSystemAssertion {
  mode: BondMode;
  passCount: number;
  failCount: number;
  failures: Array<{
    index: number;
    bdA: string;
    bdB: string;
    issue: string;
  }>;
}

function testStrongestSystemAssertion(): StrongestSystemAssertion[] {
  const modes: BondMode[] = ['amour', 'pro', 'famille'];
  const results: StrongestSystemAssertion[] = [];

  modes.forEach(mode => {
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`PART B: STRONGEST SYSTEM ASSERTION — Mode: ${mode.toUpperCase()}`);
    console.log(`${'═'.repeat(70)}`);

    const systemLabels: Record<string, Record<BondMode, string>> = {
      'BaZi': {
        amour: ['complicité instinctive', 'compatibilité de caractères', 'résonance de clan'],
        pro: ['complicité instinctive', 'compatibilité de caractères', 'résonance de clan'],
        famille: ['complicité instinctive', 'compatibilité de caractères', 'résonance de clan'],
      },
      'Numérologie': {
        amour: ['alignement de valeurs', 'vision partagée', 'chemins de vie'],
        pro: ['alignement de valeurs', 'vision partagée', 'chemins de vie'],
        famille: ['alignement de valeurs', 'vision partagée', 'chemins de vie'],
      },
      'Yi King': {
        amour: ['connexion spirituelle', "dynamique d'évolution", 'héritage symbolique'],
        pro: ['connexion spirituelle', "dynamique d'évolution", 'héritage symbolique'],
        famille: ['connexion spirituelle', "dynamique d'évolution", 'héritage symbolique'],
      },
      'Peach Blossom': {
        amour: ['attraction magnétique', 'charisme réciproque', 'sympathie instinctive'],
        pro: ['attraction magnétique', 'charisme réciproque', 'sympathie instinctive'],
        famille: ['attraction magnétique', 'charisme réciproque', 'sympathie instinctive'],
      },
    };

    const displayNames: Record<string, string> = {
      'Peach Blossom': 'Fleur de Pêcher',
      'BaZi': 'BaZi',
      'Numérologie': 'Numérologie',
      'Yi King': 'Yi King',
    };

    let passCount = 0;
    let failCount = 0;
    const failures: typeof results[0]['failures'] = [];

    for (let i = 0; i < 200; i++) {
      const bdA = randomDateBetween(1950, 2005);
      const bdB = randomDateBetween(1950, 2005);
      const nameA = `TEST_A_${i}`;
      const nameB = `TEST_B_${i}`;

      const familleSubType = mode === 'famille' ? 'ami' : undefined;
      const result = calcBond(bdA, nameA, bdB, nameB, mode, familleSubType as FamilleSubType | undefined);

      // Find strongest system
      const breakdown = result.breakdown || [];
      if (breakdown.length === 0) {
        failCount++;
        failures.push({
          index: i,
          bdA,
          bdB,
          issue: 'No breakdown data',
        });
        continue;
      }

      // Calculate contribution for each system
      let strongestSystem = breakdown[0].system;
      let maxContribution = 0;

      breakdown.forEach(sys => {
        const weight = parseFloat(sys.weight) / 100;
        const contribution = sys.score * weight;
        if (contribution > maxContribution) {
          maxContribution = contribution;
          strongestSystem = sys.system;
        }
      });

      // Check if summary mentions strongest system
      const displayName = displayNames[strongestSystem] || strongestSystem;
      const summary = result.summary || '';
      const possibleLabels = systemLabels[strongestSystem]?.[mode] || [];

      const summaryMentionsSystem =
        summary.includes(displayName) ||
        possibleLabels.some(label => summary.toLowerCase().includes(label.toLowerCase()));

      // Special check for famille mode: if strongest is Peach Blossom, it's a BUG (weight=0)
      const peachBlossomshouldNotBeStrongestInFamille = mode === 'famille' && strongestSystem === 'Peach Blossom';

      if (summaryMentionsSystem && !peachBlossomshouldNotBeStrongestInFamille) {
        passCount++;
      } else {
        failCount++;
        failures.push({
          index: i,
          bdA,
          bdB,
          issue: peachBlossomshouldNotBeStrongestInFamille
            ? `Peach Blossom is strongest in famille mode (should have 0 weight)`
            : `Summary doesn't mention strongest system: ${strongestSystem}`,
        });
      }
    }

    console.log(`\nResults (n=200):`);
    console.log(`  Pass:  ${passCount} ✓`);
    console.log(`  Fail:  ${failCount} ✗`);

    if (failures.length > 0 && failures.length <= 10) {
      console.log(`\nFailures (showing first 10):`);
      failures.slice(0, 10).forEach(f => {
        console.log(`  [${f.index}] ${f.bdA} × ${f.bdB}: ${f.issue}`);
      });
    }

    results.push({
      mode,
      passCount,
      failCount,
      failures,
    });
  });

  return results;
}

// ══════════════════════════════════════════════════════════════
// ═══ PART C: DISPLAY_NAME VALIDATION ═══
// ══════════════════════════════════════════════════════════════

interface DisplayNameValidationResult {
  passCount: number;
  failCount: number;
  failures: Array<{
    index: number;
    bdA: string;
    bdB: string;
    issue: string;
    summary: string;
  }>;
}

function testDisplayNameValidation(): DisplayNameValidationResult {
  console.log(`\n${'═'.repeat(70)}`);
  console.log('PART C: DISPLAY_NAME VALIDATION — Mode: AMOUR');
  console.log(`${'═'.repeat(70)}`);

  // English system names to avoid in summary
  const englishSystemNames = ['Peach Blossom', 'BaZi', 'Yi King', 'Numerology'];
  // French names that are OK
  const frenchNames = ['Fleur de Pêcher', 'BaZi', 'Numérologie', 'Yi King'];

  let passCount = 0;
  let failCount = 0;
  const failures: DisplayNameValidationResult['failures'] = [];

  for (let i = 0; i < 50; i++) {
    const bdA = randomDateBetween(1950, 2005);
    const bdB = randomDateBetween(1950, 2005);
    const nameA = `TEST_A_${i}`;
    const nameB = `TEST_B_${i}`;

    const result = calcBond(bdA, nameA, bdB, nameB, 'amour');
    const summary = result.summary || '';

    // Check: should NOT contain "Peach Blossom" (must use "Fleur de Pêcher")
    const containsPeachBlossom = summary.includes('Peach Blossom');

    // Check: should NOT contain other English system names in problematic context
    // (Note: "BaZi" and "Yi King" are acceptable even in English context as they're proper nouns)
    // But "Numerology" should be "Numérologie"
    const containsNumerology = summary.includes('Numerology');

    if (!containsPeachBlossom && !containsNumerology) {
      passCount++;
    } else {
      failCount++;
      failures.push({
        index: i,
        bdA,
        bdB,
        issue: containsPeachBlossom
          ? 'Contains "Peach Blossom" (should be "Fleur de Pêcher")'
          : 'Contains "Numerology" (should be "Numérologie")',
        summary: summary.substring(0, 150),
      });
    }
  }

  console.log(`\nResults (n=50):`);
  console.log(`  Pass:  ${passCount} ✓`);
  console.log(`  Fail:  ${failCount} ✗`);

  if (failures.length > 0 && failures.length <= 10) {
    console.log(`\nFailures (showing first 10):`);
    failures.slice(0, 10).forEach(f => {
      console.log(`  [${f.index}] ${f.bdA} × ${f.bdB}: ${f.issue}`);
      console.log(`          Summary: "${f.summary}..."`);
    });
  }

  return {
    passCount,
    failCount,
    failures,
  };
}

// ══════════════════════════════════════════════════════════════
// ═══ MAIN TEST RUNNER ═══
// ══════════════════════════════════════════════════════════════

function main(): void {
  console.log('\n' + '╔' + '═'.repeat(68) + '╗');
  console.log('║' + ' '.repeat(10) + 'KAIRONAUTE AFFINITÉ ENGINE — COMPREHENSIVE TEST' + ' '.repeat(12) + '║');
  console.log('║' + ' '.repeat(15) + 'Median & Strongest System Assertions' + ' '.repeat(17) + '║');
  console.log('╚' + '═'.repeat(68) + '╝');

  // PART A
  const medianResults = testMedianAssertion();

  // PART B
  const strongestResults = testStrongestSystemAssertion();

  // PART C
  const displayNameResults = testDisplayNameValidation();

  // ══════════════════════════════════════════════════════════════
  // ═══ FINAL SUMMARY REPORT ═══
  // ══════════════════════════════════════════════════════════════

  console.log(`\n${'═'.repeat(70)}`);
  console.log('FINAL SUMMARY REPORT');
  console.log(`${'═'.repeat(70)}`);

  // Part A Summary
  console.log('\nPART A: MEDIAN ASSERTION');
  const medianAllPass = medianResults.every(r => r.allPass);
  console.log(`Status: ${medianAllPass ? '✓ ALL PASS' : '✗ SOME FAILURES'}`);
  medianResults.forEach(r => {
    const passCount = Object.values(r.assertions).filter(v => v).length;
    const totalCount = Object.keys(r.assertions).length;
    console.log(`  ${r.mode.toUpperCase()}: ${passCount}/${totalCount} assertions`);
    Object.entries(r.assertions).forEach(([name, passed]) => {
      console.log(`    - ${name}: ${passed ? '✓' : '✗'}`);
    });
  });

  // Part B Summary
  console.log('\nPART B: STRONGEST SYSTEM ASSERTION');
  const bAllPass = strongestResults.every(r => r.failCount === 0);
  console.log(`Status: ${bAllPass ? '✓ ALL PASS' : '✗ SOME FAILURES'}`);
  strongestResults.forEach(r => {
    console.log(`  ${r.mode.toUpperCase()}: ${r.passCount}/${r.passCount + r.failCount} passed (${r.failCount} failures)`);
  });

  // Part C Summary
  console.log('\nPART C: DISPLAY_NAME VALIDATION');
  const cPass = displayNameResults.failCount === 0;
  console.log(`Status: ${cPass ? '✓ ALL PASS' : '✗ SOME FAILURES'}`);
  console.log(`  AMOUR: ${displayNameResults.passCount}/${displayNameResults.passCount + displayNameResults.failCount} passed (${displayNameResults.failCount} failures)`);

  // Overall
  const totalAssertions =
    medianResults.reduce((sum, r) => sum + Object.keys(r.assertions).length, 0) +
    strongestResults.reduce((sum, r) => sum + (r.passCount + r.failCount), 0) +
    (displayNameResults.passCount + displayNameResults.failCount);

  const totalPasses =
    medianResults.reduce((sum, r) => sum + Object.values(r.assertions).filter(v => v).length, 0) +
    strongestResults.reduce((sum, r) => sum + r.passCount, 0) +
    displayNameResults.passCount;

  const totalFails = totalAssertions - totalPasses;

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`OVERALL: ${totalPasses}/${totalAssertions} ASSERTIONS PASSED (${totalFails} failures)`);
  console.log(`${'═'.repeat(70)}`);

  process.exit(totalFails > 0 ? 1 : 0);
}

main();
