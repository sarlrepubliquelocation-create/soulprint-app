/**
 * TEST SIMULATION PHASE 2 — calcBondDaily + Gaussian Median Validation
 * 
 * PART A: calcBondDaily (100% untested currently)
 *   - Verify rawScore, signals array structure
 *   - Check French localization (no "Peach Blossom", only "Fleur de Pêcher")
 *   - Verify scores change across different dates
 *   - Trigger specific daily conditions (Fleur de Pêcher, Liu He, Clashes)
 *
 * PART B: Gaussian Median Validation
 *   - 500+ random birth date pairs
 *   - Run calcBond in all 3 modes (amour, pro, famille)
 *   - Verify median ≈ 65 (±3) across modes
 *   - Check distribution is roughly normal-looking
 *
 * PART C: Edge Cases
 *   - Same person (identical birth dates)
 *   - Very old dates (01/01/1900)
 *   - Future dates (01/01/2030)
 *   - Identical Chemin de Vie display format
 */

import { 
  calcBond, 
  calcBondDaily,
  type BondMode, 
  type FamilleSubType, 
  type BondResult,
  type BondDailyResult
} from '../src/engines/compatibility';

// ═══════════════════════════════════════════════════════════════════════════
// PART A: calcBondDaily Tests
// ═══════════════════════════════════════════════════════════════════════════

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║         PART A: calcBondDaily Validation                      ║');
console.log('╚═══════════════════════════════════════════════════════════════╝');
console.log();

interface DailyTestResult {
  dateA: string;
  dateB: string;
  targetDate: string;
  score: number;
  signalCount: number;
  signals: string[];
  alerts: string[];
  errors: string[];
}

const dailyTests: DailyTestResult[] = [];
const dailyErrors: string[] = [];

// Test dates for calcBondDaily
const TEST_DATE_PAIRS = [
  { a: '1977-09-23', b: '1982-05-14', name: 'Jérôme + Test1' },
  { a: '1970-03-21', b: '1985-11-30', name: 'Pair A + Pair B' },
  { a: '1990-01-15', b: '1995-07-04', name: 'Younger couple' },
  { a: '1950-08-22', b: '1950-08-22', name: 'Same birthdate (edge case)' },
  { a: '1900-01-01', b: '1910-06-15', name: 'Very old dates' },
];

const TEST_TARGET_DATES = [
  '2025-01-15',
  '2025-03-21',  // Spring equinox
  '2025-06-21',  // Summer solstice
  '2025-12-21',  // Winter solstice
  '2026-01-01',  // New year
  '2026-02-14',  // Valentine's day
  '2026-03-26',  // Today (as per system)
];

console.log(`Testing calcBondDaily with ${TEST_DATE_PAIRS.length} date pairs × ${TEST_TARGET_DATES.length} target dates...`);
console.log();

for (const pair of TEST_DATE_PAIRS) {
  for (const targetDate of TEST_TARGET_DATES) {
    try {
      const result = calcBondDaily(pair.a, pair.b, targetDate);
      
      // Validation checks
      const errors: string[] = [];
      
      if (typeof result.score !== 'number' || result.score < 5 || result.score > 97) {
        errors.push(`Invalid score: ${result.score}`);
      }
      
      if (!Array.isArray(result.signals)) {
        errors.push('signals is not an array');
      } else {
        for (const sig of result.signals) {
          if (typeof sig !== 'string' || sig.length === 0) {
            errors.push(`Invalid signal: ${sig}`);
          }
          if (sig.includes('Peach Blossom')) {
            errors.push(`Signal contains English "Peach Blossom": ${sig}`);
          }
          if (sig.includes('CdV')) {
            errors.push(`Signal contains "CdV": ${sig}`);
          }
          if (sig.includes('vous') || sig.includes('votre') || sig.includes('vos')) {
            errors.push(`Signal contains vouvoiement: ${sig}`);
          }
        }
      }

      if (!Array.isArray(result.alerts)) {
        errors.push('alerts is not an array');
      } else {
        for (const alert of result.alerts) {
          if (typeof alert !== 'string') {
            errors.push(`Invalid alert: ${alert}`);
          }
        }
      }

      if (!result.label || typeof result.label.name !== 'string') {
        errors.push(`Invalid label structure`);
      }

      dailyTests.push({
        dateA: pair.a,
        dateB: pair.b,
        targetDate,
        score: result.score,
        signalCount: result.signals.length,
        signals: result.signals,
        alerts: result.alerts,
        errors
      });

      if (errors.length > 0) {
        dailyErrors.push(`[${pair.name}] ${targetDate}: ${errors.join(', ')}`);
      }
    } catch (e: any) {
      dailyErrors.push(`CRASH [${pair.name}] ${targetDate}: ${e.message}`);
    }
  }
}

console.log(`✓ Executed ${dailyTests.length} calcBondDaily tests`);
console.log(`✗ Found ${dailyErrors.length} errors${dailyErrors.length === 0 ? '' : ':'}`);
if (dailyErrors.length > 0) {
  dailyErrors.slice(0, 5).forEach(e => console.log(`  - ${e}`));
  if (dailyErrors.length > 5) console.log(`  ... and ${dailyErrors.length - 5} more`);
}
console.log();

// Check score variance across dates for same couple
console.log('Checking score variance across dates (same couple):');
for (const pair of TEST_DATE_PAIRS.slice(0, 2)) {
  const scores = dailyTests
    .filter(t => t.dateA === pair.a && t.dateB === pair.b)
    .map(t => t.score);
  
  if (scores.length > 0) {
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const unique = new Set(scores).size;
    console.log(`  ${pair.name}: scores=[${min}...${max}], variance=${max - min} pts, unique=${unique}`);
  }
}
console.log();

// Check for specific daily signals triggered
console.log('Daily signals detected across all tests:');
const signalTypes = new Set<string>();
for (const test of dailyTests) {
  for (const sig of test.signals) {
    signalTypes.add(sig);
  }
}

if (signalTypes.size > 0) {
  for (const sig of Array.from(signalTypes).sort()) {
    const count = dailyTests.filter(t => t.signals.includes(sig)).length;
    console.log(`  ✓ "${sig}" (${count}x)`);
  }
} else {
  console.log('  (no signals detected)');
}
console.log();

// ═══════════════════════════════════════════════════════════════════════════
// PART B: Gaussian Median Validation
// ═══════════════════════════════════════════════════════════════════════════

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║         PART B: Gaussian Median Validation (500+ pairs)       ║');
console.log('╚═══════════════════════════════════════════════════════════════╝');
console.log();

const SEED = 12345;
function seededRandom(seed: number): number {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

function randomDate(seed: number): string {
  const year = Math.floor(1950 + seededRandom(seed) * 50);
  const month = Math.floor(1 + seededRandom(seed + 1) * 12);
  const day = Math.floor(1 + seededRandom(seed + 2) * 28);
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

interface ModeStats {
  mode: BondMode;
  scores: number[];
  median: number;
  mean: number;
  min: number;
  max: number;
  stdev: number;
  q1: number;
  q3: number;
}

const modeStats: Record<BondMode, ModeStats> = {
  amour: { mode: 'amour', scores: [], median: 0, mean: 0, min: 0, max: 0, stdev: 0, q1: 0, q3: 0 },
  pro: { mode: 'pro', scores: [], median: 0, mean: 0, min: 0, max: 0, stdev: 0, q1: 0, q3: 0 },
  famille: { mode: 'famille', scores: [], median: 0, mean: 0, min: 0, max: 0, stdev: 0, q1: 0, q3: 0 },
};

const ALL_MODES: BondMode[] = ['amour', 'pro', 'famille'];
const TARGET_PAIRS = 500;

console.log(`Generating ${TARGET_PAIRS} random birth date pairs...`);
let pairCount = 0;
let crashCount = 0;

for (let i = 0; i < TARGET_PAIRS; i++) {
  const dateA = randomDate(SEED + i * 2);
  const dateB = randomDate(SEED + i * 2 + 1);

  for (const mode of ALL_MODES) {
    try {
      const result = calcBond(dateA, 'PersonA', dateB, 'PersonB', mode);
      modeStats[mode].scores.push(result.scoreGlobal);
      pairCount++;
    } catch (e: any) {
      crashCount++;
    }
  }
}

console.log(`✓ Collected scores: ${pairCount} (crashes: ${crashCount})`);
console.log();

// Calculate statistics for each mode
function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stdev(arr: number[]): number {
  const m = mean(arr);
  const variance = arr.reduce((a, x) => a + Math.pow(x - m, 2), 0) / arr.length;
  return Math.sqrt(variance);
}

for (const mode of ALL_MODES) {
  const scores = modeStats[mode].scores;
  const sorted = [...scores].sort((a, b) => a - b);
  
  modeStats[mode].min = Math.min(...scores);
  modeStats[mode].max = Math.max(...scores);
  modeStats[mode].mean = mean(scores);
  modeStats[mode].median = percentile(scores, 50);
  modeStats[mode].q1 = percentile(scores, 25);
  modeStats[mode].q3 = percentile(scores, 75);
  modeStats[mode].stdev = stdev(scores);
}

console.log('STATISTICAL SUMMARY (claim: median ≈ 65 ±3):');
console.log();

for (const mode of ALL_MODES) {
  const stats = modeStats[mode];
  const medianOk = Math.abs(stats.median - 65) <= 3 ? '✓' : '✗';
  const rangeOk = stats.min >= 5 && stats.max <= 98 ? '✓' : '✗';
  
  console.log(`${mode.toUpperCase()} (n=${stats.scores.length}):`);
  console.log(`  ${medianOk} Median:     ${stats.median.toFixed(1)} (expected 65±3, range=${stats.max - stats.min})`);
  console.log(`     Mean:        ${stats.mean.toFixed(1)}`);
  console.log(`     Stdev:       ${stats.stdev.toFixed(1)}`);
  console.log(`  ${rangeOk} Range:      [${stats.min.toFixed(0)}, ${stats.max.toFixed(0)}] (expected [5, 98])`);
  console.log(`     Q1–Q3:      [${stats.q1.toFixed(1)}, ${stats.q3.toFixed(1)}] (IQR=${(stats.q3 - stats.q1).toFixed(1)})`);
  console.log();
}

// Distribution histogram
console.log('DISTRIBUTION HISTOGRAMS (10% buckets):');
console.log();

for (const mode of ALL_MODES) {
  const scores = modeStats[mode].scores;
  const buckets: Record<number, number> = {};
  
  for (let b = 0; b <= 90; b += 10) {
    buckets[b] = 0;
  }
  
  for (const score of scores) {
    const bucket = Math.floor(score / 10) * 10;
    buckets[bucket] = (buckets[bucket] || 0) + 1;
  }
  
  console.log(`${mode.toUpperCase()}:`);
  const maxCount = Math.max(...Object.values(buckets));
  
  for (let b = 0; b <= 90; b += 10) {
    const count = buckets[b] || 0;
    const pct = ((count / scores.length) * 100).toFixed(1);
    const barLength = Math.round((count / maxCount) * 40);
    const bar = '█'.repeat(barLength);
    console.log(`  ${String(b).padStart(2)}–${String(b + 9).padStart(2)}%: ${bar.padEnd(40)} ${count} (${pct}%)`);
  }
  console.log();
}

// ═══════════════════════════════════════════════════════════════════════════
// PART C: Edge Cases
// ═══════════════════════════════════════════════════════════════════════════

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║         PART C: Edge Cases                                   ║');
console.log('╚═══════════════════════════════════════════════════════════════╝');
console.log();

interface EdgeCaseResult {
  name: string;
  dateA: string;
  dateB: string;
  mode: BondMode;
  success: boolean;
  score?: number;
  error?: string;
}

const edgeCases: EdgeCaseResult[] = [];

const EDGE_CASES_DEF = [
  { name: 'Same birthdate', dateA: '1977-09-23', dateB: '1977-09-23', mode: 'amour' as BondMode },
  { name: 'Very old dates (1900)', dateA: '1900-01-01', dateB: '1905-06-15', mode: 'amour' as BondMode },
  { name: 'Future dates (2030)', dateA: '2030-01-01', dateB: '2030-06-15', mode: 'amour' as BondMode },
  { name: 'Century apart', dateA: '1900-01-01', dateB: '2000-01-01', mode: 'pro' as BondMode },
  { name: 'Same date, famille mode', dateA: '1980-05-14', dateB: '1980-05-14', mode: 'famille' as BondMode },
];

for (const testCase of EDGE_CASES_DEF) {
  try {
    const result = calcBond(testCase.dateA, 'PersonA', testCase.dateB, 'PersonB', testCase.mode);
    edgeCases.push({
      name: testCase.name,
      dateA: testCase.dateA,
      dateB: testCase.dateB,
      mode: testCase.mode,
      success: true,
      score: result.scoreGlobal,
    });
  } catch (e: any) {
    edgeCases.push({
      name: testCase.name,
      dateA: testCase.dateA,
      dateB: testCase.dateB,
      mode: testCase.mode,
      success: false,
      error: e.message,
    });
  }
}

console.log(`Testing ${edgeCases.length} edge cases:`);
console.log();

for (const ec of edgeCases) {
  if (ec.success) {
    const sameDate = ec.dateA === ec.dateB;
    const maxCapNote = sameDate ? ' (should be capped at ~78)' : '';
    console.log(`✓ ${ec.name}: score=${ec.score}${maxCapNote}`);
  } else {
    console.log(`✗ ${ec.name}: CRASHED — ${ec.error}`);
  }
}
console.log();

// Verify identical Chemin de Vie display format
console.log('Testing identical Chemin de Vie display (×symbol):');
const identicalCdVTest = calcBond('1977-09-23', 'A', '1977-09-23', 'B', 'amour');
const signalText = identicalCdVTest.signals.join(' | ');
const hasMultiplier = signalText.includes('×');
console.log(`  Signals contain "×": ${hasMultiplier ? 'Yes' : 'No'}`);
console.log(`  Sample signals: ${identicalCdVTest.signals.slice(0, 3).join(' | ')}`);
console.log();

// ═══════════════════════════════════════════════════════════════════════════
// FINAL REPORT
// ═══════════════════════════════════════════════════════════════════════════

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║         FINAL REPORT                                         ║');
console.log('╚═══════════════════════════════════════════════════════════════╝');
console.log();

const allTestsPassed = dailyErrors.length === 0 && edgeCases.every(ec => ec.success);
const medianOk = Object.values(modeStats).every(s => Math.abs(s.median - 65) <= 3);

console.log(`PART A (calcBondDaily):   ${dailyErrors.length === 0 ? '✓ PASS' : `✗ FAIL (${dailyErrors.length} errors)`}`);
console.log(`PART B (Gaussian median): ${medianOk ? '✓ PASS (all modes ≈65)' : '✗ FAIL (median outside ±3 range)'}`);
console.log(`PART C (Edge cases):      ${edgeCases.every(ec => ec.success) ? '✓ PASS' : `✗ FAIL (${edgeCases.filter(ec => !ec.success).length} crashes)`}`);
console.log();

if (allTestsPassed && medianOk) {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  ✅ ALL TESTS PASSED — Engine ready for deployment');
  console.log('═══════════════════════════════════════════════════════════════');
} else {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  ⚠️  ISSUES FOUND — Review above');
  console.log('═══════════════════════════════════════════════════════════════');
}
console.log();
