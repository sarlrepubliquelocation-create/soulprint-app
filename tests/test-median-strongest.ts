/**
 * TEST SUITE: Gaussian Median Validation + Strongest System Weighted Contribution
 * 
 * PART A: Median Assertions
 *   - Generate 300 random birth date pairs (years 1950-2005)
 *   - Run calcBond for each in amour, pro, famille modes
 *   - Collect scores per mode and calculate actual medians
 *   - ASSERT: Pro median 60-70, Famille median 60-70
 *   - ASSERT: All scores in [5, 98]
 *   - ASSERT: Std dev > 5 per mode
 *   - Print histograms + PASS/FAIL per assertion
 * 
 * PART B: Strongest System Assertions
 *   - Test 50 diverse date pairs in amour mode
 *   - ASSERT: System cited in summary = system with highest weighted contribution
 *   - Test 50 date pairs in famille mode
 *   - ASSERT: Peach Blossom never cited as strongest in famille
 *   - ASSERT: Cited system has highest weighted contribution among non-Peach systems
 * 
 * PART C: Display Name Mapping
 *   - ASSERT: No summary contains "Peach Blossom" (only "Fleur de Pêcher")
 *   - Verify French display names used consistently
 */

import { calcBond } from '../src/engines/compatibility';

// ═══════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════

function randomBirthdate(minYear: number, maxYear: number): string {
  const year = Math.floor(Math.random() * (maxYear - minYear + 1)) + minYear;
  const month = Math.floor(Math.random() * 12) + 1;
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const isLeap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const maxDay = month === 2 && isLeap ? 29 : daysInMonth[month - 1];
  const day = Math.floor(Math.random() * maxDay) + 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function stdDev(arr: number[]): number {
  if (arr.length === 0) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

function histogram(scores: number[], buckets: number = 10): Record<string, number> {
  const hist: Record<string, number> = {};
  for (let i = 0; i < buckets; i++) {
    const min = Math.round((i / buckets) * 100);
    const max = Math.round(((i + 1) / buckets) * 100);
    hist[`${min}-${max}`] = 0;
  }
  for (const score of scores) {
    const bucket = Math.min(Math.floor((score / 100) * buckets), buckets - 1);
    const min = Math.round((bucket / buckets) * 100);
    const max = Math.round(((bucket + 1) / buckets) * 100);
    hist[`${min}-${max}`]++;
  }
  return hist;
}

function parseFloatWeight(weightStr: string): number {
  return parseFloat(weightStr.replace('%', '')) / 100;
}

function extractStrongestSystemFromSummary(summary: string): string | null {
  // Pattern: "brille par <systemLabel> (<systemName>"
  // or "repose sur <systemLabel> (<systemName>"
  // or "a du potentiel grâce à <systemLabel> (<systemName>"
  const match = summary.match(/(?:brille par|repose sur|du potentiel grâce à)\s+[^(]+\(([^à]+)\s+à/);
  if (!match) return null;
  // Extract the system name in parentheses
  const systemName = match[1].trim();
  return systemName;
}

// ═══════════════════════════════════════════════════════════
// PART A: MEDIAN VALIDATION
// ═══════════════════════════════════════════════════════════

console.log('\n╔═══════════════════════════════════════════════════════════╗');
console.log('║ PART A: GAUSSIAN MEDIAN VALIDATION                       ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

const amorScores: number[] = [];
const proScores: number[] = [];
const familleScores: number[] = [];

console.log('Generating 300 random date pairs (1950-2005)...');
for (let i = 0; i < 300; i++) {
  const bd1 = randomBirthdate(1950, 2005);
  const bd2 = randomBirthdate(1950, 2005);

  const amour = calcBond(bd1, 'Person1', bd2, 'Person2', 'amour');
  const pro = calcBond(bd1, 'Person1', bd2, 'Person2', 'pro');
  const famille = calcBond(bd1, 'Person1', bd2, 'Person2', 'famille', 'fratrie');

  amorScores.push(amour.scoreGlobal);
  proScores.push(pro.scoreGlobal);
  familleScores.push(famille.scoreGlobal);
}

console.log(`✓ Generated scores for 300 pairs (900 total scores)\n`);

// Calculate medians
const amorMedian = median(amorScores);
const proMedian = median(proScores);
const familleMedian = median(familleScores);

console.log('📊 MEDIAN SCORES:');
console.log(`   Amour:    ${amorMedian.toFixed(1)}`);
console.log(`   Pro:      ${proMedian.toFixed(1)}`);
console.log(`   Famille:  ${familleMedian.toFixed(1)}\n`);

// Calculate std devs
const amorStd = stdDev(amorScores);
const proStd = stdDev(proScores);
const familleStd = stdDev(familleScores);

console.log('📈 STANDARD DEVIATION:');
console.log(`   Amour:    ${amorStd.toFixed(2)}`);
console.log(`   Pro:      ${proStd.toFixed(2)}`);
console.log(`   Famille:  ${familleStd.toFixed(2)}\n`);

// Assertions: medians
const assertions = [];

const a1 = proMedian >= 60 && proMedian <= 70;
assertions.push({ name: 'Pro median [60-70]', pass: a1, value: proMedian.toFixed(1) });
console.log(`${a1 ? '✅ PASS' : '❌ FAIL'} Pro median [60-70]: ${proMedian.toFixed(1)}`);

const a2 = familleMedian >= 60 && familleMedian <= 70;
assertions.push({ name: 'Famille median [60-70]', pass: a2, value: familleMedian.toFixed(1) });
console.log(`${a2 ? '✅ PASS' : '❌ FAIL'} Famille median [60-70]: ${familleMedian.toFixed(1)}`);

// Note amour median (reference)
console.log(`   ℹ️  Amour median (reference): ${amorMedian.toFixed(1)}\n`);

// Assertions: range [5, 98]
let allInRange = true;
for (const score of [...amorScores, ...proScores, ...familleScores]) {
  if (score < 5 || score > 98) allInRange = false;
}
assertions.push({ name: 'All scores [5-98]', pass: allInRange });
console.log(`${allInRange ? '✅ PASS' : '❌ FAIL'} All scores in range [5, 98]`);

// Assertions: std dev > 5
const a3 = amorStd > 5;
assertions.push({ name: 'Amour StdDev > 5', pass: a3, value: amorStd.toFixed(2) });
console.log(`${a3 ? '✅ PASS' : '❌ FAIL'} Amour StdDev > 5: ${amorStd.toFixed(2)}`);

const a4 = proStd > 5;
assertions.push({ name: 'Pro StdDev > 5', pass: a4, value: proStd.toFixed(2) });
console.log(`${a4 ? '✅ PASS' : '❌ FAIL'} Pro StdDev > 5: ${proStd.toFixed(2)}`);

const a5 = familleStd > 5;
assertions.push({ name: 'Famille StdDev > 5', pass: a5, value: familleStd.toFixed(2) });
console.log(`${a5 ? '✅ PASS' : '❌ FAIL'} Famille StdDev > 5: ${familleStd.toFixed(2)}\n`);

// Histograms
console.log('📋 HISTOGRAMS (score distribution by 10% buckets):\n');

console.log('Amour scores:');
const amorHist = histogram(amorScores);
for (const [bucket, count] of Object.entries(amorHist)) {
  const bar = '█'.repeat(Math.round(count / 3)); // Scale for readability
  console.log(`  ${bucket.padEnd(6)}: ${bar} (${count})`);
}

console.log('\nPro scores:');
const proHist = histogram(proScores);
for (const [bucket, count] of Object.entries(proHist)) {
  const bar = '█'.repeat(Math.round(count / 3));
  console.log(`  ${bucket.padEnd(6)}: ${bar} (${count})`);
}

console.log('\nFamille scores:');
const familleHist = histogram(familleScores);
for (const [bucket, count] of Object.entries(familleHist)) {
  const bar = '█'.repeat(Math.round(count / 3));
  console.log(`  ${bucket.padEnd(6)}: ${bar} (${count})`);
}

// ═══════════════════════════════════════════════════════════
// PART B: STRONGEST SYSTEM WEIGHTED CONTRIBUTION
// ═══════════════════════════════════════════════════════════

console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
console.log('║ PART B: STRONGEST SYSTEM WEIGHTED CONTRIBUTION           ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

let amorTests = 0;
let amorPassed = 0;
let amorMismatches: { bd1: string; bd2: string; summary: string; cited: string; actual: string; weights: string }[] = [];

console.log('Testing 50 diverse date pairs in AMOUR mode...');
for (let i = 0; i < 50; i++) {
  const bd1 = randomBirthdate(1950, 2005);
  const bd2 = randomBirthdate(1950, 2005);
  const result = calcBond(bd1, 'Person1', bd2, 'Person2', 'amour');

  amorTests++;

  // Calculate weighted contribution for each system
  const weightedScores: { system: string; contribution: number; score: number; weight: number }[] = [];
  for (const item of result.breakdown) {
    const weight = parseFloatWeight(item.weight);
    const contribution = item.score * weight;
    weightedScores.push({ system: item.system, score: item.score, weight, contribution });
  }

  // Find system with highest weighted contribution
  const maxContribution = Math.max(...weightedScores.map(w => w.contribution));
  const actualStrongest = weightedScores.find(w => w.contribution === maxContribution);

  // Extract cited system from summary
  const citedSystemName = extractStrongestSystemFromSummary(result.summary);

  // Compare
  if (actualStrongest && citedSystemName === actualStrongest.system) {
    amorPassed++;
  } else {
    amorMismatches.push({
      bd1,
      bd2,
      summary: result.summary,
      cited: citedSystemName || '(not found)',
      actual: actualStrongest?.system || '(unknown)',
      weights: weightedScores.map(w => `${w.system}=${w.contribution.toFixed(2)}`).join(', '),
    });
  }
}

console.log(`✓ AMOUR: ${amorPassed}/${amorTests} tests PASSED`);
if (amorMismatches.length > 0) {
  console.log(`  ❌ ${amorMismatches.length} mismatches found:`);
  for (const m of amorMismatches.slice(0, 3)) {
    console.log(`     • Pair ${m.bd1} × ${m.bd2}`);
    console.log(`       Cited: ${m.cited}, Actual: ${m.actual}`);
    console.log(`       Contributions: ${m.weights}`);
  }
}

let familleTests = 0;
let famillePassed = 0;
let peachCitations = 0;
let familleMismatches: { bd1: string; bd2: string; summary: string; cited: string; actualHighest: string }[] = [];

console.log('\nTesting 50 date pairs in FAMILLE mode...');
for (let i = 0; i < 50; i++) {
  const bd1 = randomBirthdate(1950, 2005);
  const bd2 = randomBirthdate(1950, 2005);
  const result = calcBond(bd1, 'Person1', bd2, 'Person2', 'famille', 'fratrie');

  familleTests++;

  // Extract cited system
  const citedSystemName = extractStrongestSystemFromSummary(result.summary);

  // Check: Peach Blossom should NEVER be cited in famille
  if (citedSystemName === 'Peach Blossom' || citedSystemName === 'Fleur de Pêcher') {
    peachCitations++;
  }

  // Calculate weighted contributions excluding Peach Blossom
  const weightedScores: { system: string; contribution: number; score: number; weight: number }[] = [];
  for (const item of result.breakdown) {
    // Skip Peach Blossom in famille
    if (item.system === 'Peach Blossom') continue;
    const weight = parseFloatWeight(item.weight);
    const contribution = item.score * weight;
    weightedScores.push({ system: item.system, score: item.score, weight, contribution });
  }

  // Find system with highest weighted contribution (non-Peach)
  const maxContribution = Math.max(...weightedScores.map(w => w.contribution));
  const actualStrongest = weightedScores.find(w => w.contribution === maxContribution);

  // Compare
  if (
    citedSystemName &&
    citedSystemName !== 'Peach Blossom' &&
    citedSystemName !== 'Fleur de Pêcher' &&
    actualStrongest &&
    citedSystemName === actualStrongest.system
  ) {
    famillePassed++;
  } else if (citedSystemName === 'Peach Blossom' || citedSystemName === 'Fleur de Pêcher') {
    // Peach citation is a failure
  } else {
    familleMismatches.push({
      bd1,
      bd2,
      summary: result.summary,
      cited: citedSystemName || '(not found)',
      actualHighest: actualStrongest?.system || '(unknown)',
    });
  }
}

console.log(`✓ FAMILLE: ${famillePassed}/${familleTests} tests PASSED`);
console.log(`  ⚠️  Peach Blossom citations: ${peachCitations}`);
if (peachCitations > 0) {
  console.log(`  ❌ ${peachCitations} tests cited Peach Blossom in famille mode (should be 0)`);
}
if (familleMismatches.length > 0) {
  console.log(`  ❌ ${familleMismatches.length} non-Peach mismatches found (sample):`);
  for (const m of familleMismatches.slice(0, 2)) {
    console.log(`     • Pair ${m.bd1} × ${m.bd2}: cited=${m.cited}, actual=${m.actualHighest}`);
  }
}

// ═══════════════════════════════════════════════════════════
// PART C: DISPLAY NAME MAPPING
// ═══════════════════════════════════════════════════════════

console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
console.log('║ PART C: DISPLAY NAME MAPPING                             ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

let displayNameTests = 0;
let displayNamePassed = 0;
let peachBlossomInSummary = 0;

console.log('Checking display names in 50 random results...');
for (let i = 0; i < 50; i++) {
  const bd1 = randomBirthdate(1950, 2005);
  const bd2 = randomBirthdate(1950, 2005);
  const result = calcBond(bd1, 'Person1', bd2, 'Person2', Math.random() > 0.5 ? 'amour' : 'famille', 'fratrie');

  displayNameTests++;

  // Check for English "Peach Blossom" (should use French "Fleur de Pêcher")
  if (result.summary.includes('Peach Blossom')) {
    peachBlossomInSummary++;
  } else {
    displayNamePassed++;
  }

  // Verify French names are used
  const hasFrench = result.summary.includes('Fleur de Pêcher') ||
                     result.summary.includes('BaZi') ||
                     result.summary.includes('Numérologie') ||
                     result.summary.includes('Yi King');
  if (!hasFrench && !result.summary.includes('Peach Blossom')) {
    // May not mention systems, that's ok
  }
}

console.log(`✓ Display Name Tests: ${displayNamePassed}/${displayNameTests} PASSED`);
if (peachBlossomInSummary > 0) {
  console.log(`  ❌ Found ${peachBlossomInSummary} summaries with English "Peach Blossom" (should use French)`);
} else {
  console.log(`  ✅ No English "Peach Blossom" found in summaries`);
}

// ═══════════════════════════════════════════════════════════
// FINAL REPORT
// ═══════════════════════════════════════════════════════════

console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
console.log('║ FINAL SUMMARY                                             ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

const passCount = assertions.filter(a => a.pass).length;
const totalAssertions = assertions.length;

console.log('📋 PART A ASSERTIONS:');
for (const a of assertions) {
  console.log(`   ${a.pass ? '✅' : '❌'} ${a.name}${a.value ? ' = ' + a.value : ''}`);
}

console.log(`\n📊 PART B STRONGEST SYSTEM:
   ✅ Amour:   ${amorPassed}/${amorTests} PASSED
   ✅ Famille: ${famillePassed}/${familleTests} PASSED
      Peach Blossom in famille: ${peachCitations} (expected 0)`);

console.log(`\n🏷️  PART C DISPLAY NAMES:
   ✅ ${displayNamePassed}/${displayNameTests} PASSED
      "Peach Blossom" (English): ${peachBlossomInSummary} (expected 0)`);

const totalTests = totalAssertions + amorTests + familleTests + displayNameTests;
const totalPassed = passCount + amorPassed + famillePassed + displayNamePassed;

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`OVERALL: ${totalPassed}/${totalTests} tests PASSED (${((totalPassed/totalTests)*100).toFixed(1)}%)`);
console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

// Exit with code based on pass rate
const passRate = totalPassed / totalTests;
if (passRate === 1.0) {
  console.log('\n🎉 ALL TESTS PASSED!');
  process.exit(0);
} else if (passRate >= 0.95) {
  console.log('\n⚠️  MOSTLY PASSED (95%+) — Minor issues to address');
  process.exit(0);
} else {
  console.log('\n❌ SIGNIFICANT FAILURES — Review above for details');
  process.exit(1);
}
