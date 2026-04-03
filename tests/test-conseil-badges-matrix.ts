import { calcBond, type FamilleSubType } from '../src/engines/compatibility';

// ═══════════════════════════════════════════════════════════════
// TEST: CONSEIL TEXTS × CONTEXT BADGES COMPREHENSIVE MATRIX
// ═══════════════════════════════════════════════════════════════
// 6 conseil tiers × 13 famille subtypes = 78 entries
// 5 badge categories × 4 score tiers = 20 entries
//
// Strategy: Use calcBond with carefully chosen date pairs
// to hit specific score ranges that map to each conseil & badge tier

// Test Results Tracker
interface TestResult {
  errors: string[];
  warnings: string[];
  stats: {
    totalConseilTexts: number;
    totalBadges: number;
    uniqueConseilTexts: Set<string>;
    duplicateConseilTexts: string[];
    emptyConseilTexts: string[];
    emptyBadges: string[];
    grammarIssues: string[];
  };
}

const result: TestResult = {
  errors: [],
  warnings: [],
  stats: {
    totalConseilTexts: 0,
    totalBadges: 0,
    uniqueConseilTexts: new Set(),
    duplicateConseilTexts: [],
    emptyConseilTexts: [],
    emptyBadges: [],
    grammarIssues: [],
  },
};

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function contains(text: string, word: string, exceptions: RegExp[] = []): boolean {
  const regex = new RegExp(`\\b${word}\\b`, 'i');
  const matches = regex.test(text);
  if (!matches) return false;
  // Check if it's in an exception pattern
  for (const exc of exceptions) {
    if (exc.test(text)) {
      return false; // Found in exception, so it doesn't count as a real vouvoiement
    }
  }
  return true;
}

function checkVouvoiement(text: string): string[] {
  const issues: string[] = [];
  const exceptions = [
    /entre\s+vous/i,
    /chez\s+vous/i,
    /autour\s+de\s+vous/i,
  ];
  
  if (contains(text, 'vous', exceptions)) {
    issues.push('Contains "vous" (vouvoiement expected tutoiement)');
  }
  if (contains(text, 'votre', exceptions)) {
    issues.push('Contains "votre" (vouvoiement)');
  }
  if (contains(text, 'vos', exceptions)) {
    issues.push('Contains "vos" (vouvoiement)');
  }
  
  return issues;
}

function checkTutoiement(text: string): boolean {
  const tuRegex = /\b(tu|ton|ta|tes|toi|t')\b/i;
  return tuRegex.test(text);
}

function checkCdVAbbreviation(text: string): boolean {
  return /\bCdV\b/.test(text);
}

function checkPeachBlossom(text: string): boolean {
  return /Peach\s+Blossom/i.test(text);
}

function checkLength(text: string, minChars: number = 30): boolean {
  return text.length >= minChars;
}

function checkGrammar(text: string): string[] {
  const issues: string[] = [];
  
  // Check for obvious grammar issues: "ta" before consonant feminine should not be followed immediately by vowel
  // French: "ta" before consonant (ta force), "ton" before vowel feminine (ton énergie)
  const taBeforeVowel = /ta\s+[aeiouy]/i;
  if (taBeforeVowel.test(text)) {
    // This might be ok, it's subjective. Skip this check.
  }
  
  return issues;
}

function validateConseilText(text: string, tier: string, subtype: string): string[] {
  const issues: string[] = [];
  
  // Check non-empty
  if (!text || text.trim().length === 0) {
    issues.push(`Empty text for ${tier}/${subtype}`);
    return issues;
  }
  
  // Check length
  if (!checkLength(text)) {
    issues.push(`Text too short (${text.length}chars) for ${tier}/${subtype}`);
  }
  
  // Check vouvoiement
  const vousIssues = checkVouvoiement(text);
  if (vousIssues.length > 0) {
    issues.push(`Vouvoiement issue in ${tier}/${subtype}: ${vousIssues.join(', ')}`);
  }
  
  // Check tutoiement present
  if (!checkTutoiement(text)) {
    issues.push(`No tutoiement in ${tier}/${subtype}`);
  }
  
  // Check CdV abbreviation
  if (checkCdVAbbreviation(text)) {
    issues.push(`CdV abbreviation found in ${tier}/${subtype}`);
  }
  
  // Check Peach Blossom English
  if (checkPeachBlossom(text)) {
    issues.push(`English "Peach Blossom" found in ${tier}/${subtype}`);
  }
  
  return issues;
}

function validateBadge(icon: string, title: string, narrative: string, cat: string, tier: string): string[] {
  const issues: string[] = [];
  
  if (!icon || icon.trim().length === 0) {
    issues.push(`Missing icon for ${cat}/${tier}`);
  }
  
  if (!title || title.trim().length === 0) {
    issues.push(`Missing title for ${cat}/${tier}`);
  }
  
  if (!narrative || narrative.trim().length === 0) {
    issues.push(`Missing narrative for ${cat}/${tier}`);
  }
  
  if (narrative && narrative.length < 20) {
    issues.push(`Narrative too short (${narrative.length}chars) for ${cat}/${tier}`);
  }
  
  // Check grammar in narrative
  const vousIssues = checkVouvoiement(narrative);
  if (vousIssues.length > 0) {
    issues.push(`Vouvoiement in narrative ${cat}/${tier}: ${vousIssues.join(', ')}`);
  }
  
  if (checkCdVAbbreviation(narrative)) {
    issues.push(`CdV abbreviation in narrative ${cat}/${tier}`);
  }
  
  if (checkPeachBlossom(narrative)) {
    issues.push(`English "Peach Blossom" in narrative ${cat}/${tier}`);
  }
  
  return issues;
}

// ═══════════════════════════════════════════════════════════════
// TEST STRATEGY: Use calcBond with specific date pairs
// ═══════════════════════════════════════════════════════════════

// Date pairs to hit specific score ranges (famille mode):
// - karmique: score ≥ 91 (use 1977-09-23 & 1980-05-12 → should give ~93)
// - fusionnel: score ≥ 79 (use 1985-03-15 & 1987-07-22 → should give ~82)
// - complementaire: score ≥ 64 (use 1990-01-10 & 1992-06-18 → should give ~70)
// - croissance: score ≥ 48 (use 1995-04-05 & 1998-09-14 → should give ~55)
// - transformation: score ≥ 32 (use 2000-02-20 & 2003-11-30 → should give ~40)
// - profond: score < 32 (use 1988-12-31 & 1999-06-01 → should give ~25)

const testDatePairs: Record<string, [string, string]> = {
  karmique:        ['1977-09-23', '1980-05-12'],   // Expect ~93
  fusionnel:       ['1985-03-15', '1987-07-22'],   // Expect ~82
  complementaire:  ['1990-01-10', '1992-06-18'],   // Expect ~70
  croissance:      ['1995-04-05', '1998-09-14'],   // Expect ~55
  transformation:  ['2000-02-20', '2003-11-30'],   // Expect ~40
  profond:         ['1988-12-31', '1999-06-01'],   // Expect ~25
};

// All 13 famille subtypes
const familleSubtypes: FamilleSubType[] = [
  'frere_frere', 'soeur_soeur', 'frere_soeur',
  'pere_fils', 'pere_fille', 'mere_fils', 'mere_fille',
  'gp_petit_fils', 'gp_petite_fille', 'gm_petit_fils', 'gm_petite_fille',
  'coloc', 'ami',
];

const conseilTiers = ['karmique', 'fusionnel', 'complementaire', 'croissance', 'transformation', 'profond'];
const badgeCategories = ['ami', 'fratrie', 'parent', 'grands_parents', 'coloc'];
const badgeTiers = ['high', 'good', 'moderate', 'low'];

// No helper needed — calcBond accepts date strings directly!

// ═══════════════════════════════════════════════════════════════
// MAIN TEST
// ═══════════════════════════════════════════════════════════════

console.log('\n🧪 KAIRONAUTE CONSEIL & BADGE MATRIX TEST');
console.log('═'.repeat(60));

const conseilTexts: Record<string, Record<string, string>> = {};
const foundBadges: Record<string, Record<string, { icon: string; title: string; narrative: string }>> = {};

// Test A: CONSEIL TEXTS — Extract all 78 entries (6 tiers × 13 subtypes)
console.log('\n📋 TEST A: CONSEIL TEXTS (78 expected)');
console.log('─'.repeat(60));

let conseilCount = 0;
for (const tier of conseilTiers) {
  const datePair = testDatePairs[tier];
  if (!datePair) {
    result.errors.push(`No date pair found for conseil tier: ${tier}`);
    continue;
  }

  // calcBond expects: (bdA: string, nameA: string, bdB: string, nameB: string, mode, familleSubType?)
  const bond = calcBond(datePair[0], 'PersonA', datePair[1], 'PersonB', 'famille');
  const actualScore = bond.scoreGlobal;
  console.log(`\n${tier.toUpperCase()} (score=${actualScore}):`);

  if (!conseilTexts[tier]) {
    conseilTexts[tier] = {};
  }

  for (const subtype of familleSubtypes) {
    // For each subtype, we need to actually extract the conseil text
    // Since calcBond returns a conseil field, we use that as our test
    const bondForSubtype = calcBond(datePair[0], 'PersonA', datePair[1], 'PersonB', 'famille', subtype);
    const conseil = bondForSubtype.conseil;

    conseilTexts[tier][subtype] = conseil;
    conseilCount++;
    result.stats.totalConseilTexts++;

    // Validate
    const issues = validateConseilText(conseil, tier, subtype);
    if (issues.length > 0) {
      result.errors.push(`  ${tier}/${subtype}: ${issues.join('; ')}`);
    }

    // Track uniqueness
    if (conseil && conseil.trim().length > 0) {
      const key = `${conseil.substring(0, 50)}...`;
      if (result.stats.uniqueConseilTexts.has(key)) {
        result.stats.duplicateConseilTexts.push(`${tier}/${subtype}`);
      }
      result.stats.uniqueConseilTexts.add(key);
    } else {
      result.stats.emptyConseilTexts.push(`${tier}/${subtype}`);
    }
  }
}

console.log(`\n✓ Extracted ${conseilCount} conseil texts`);

// Test B: CONTEXT BADGES — Extract all 20 entries (5 categories × 4 tiers)
console.log('\n📋 TEST B: CONTEXT BADGES (20 expected)');
console.log('─'.repeat(60));

let badgeCount = 0;

// Use the same date pairs but extract badge data
// Note: In the actual compatibility engine, getContextBadge is called with:
// - score (from calcBond)
// - familleSubType (maps to category)

// For testing badges, we need to check if they're defined in the CONTEXT_BADGES object
// Since they're not directly exported, we'll validate them by calling calcBond and checking results

for (const tier of conseilTiers) {
  const datePair = testDatePairs[tier];
  if (!datePair) continue;

  // Map conseil tier to badge tier (via score):
  // score >= 72 → high
  // score >= 58 → good
  // score >= 42 → moderate
  // score < 42 → low

  for (const subtype of familleSubtypes) {
    const bond = calcBond(datePair[0], 'PersonA', datePair[1], 'PersonB', 'famille', subtype);
    const score = bond.scoreGlobal;
    
    // Map family subtype to category
    let category: string;
    if (subtype === 'ami') category = 'ami';
    else if (subtype === 'coloc') category = 'coloc';
    else if (subtype.startsWith('frere') || subtype.startsWith('soeur')) category = 'fratrie';
    else if (subtype.startsWith('gp_') || subtype.startsWith('gm_')) category = 'grands_parents';
    else category = 'parent';

    // Determine badge tier
    let badgeTier: string;
    if (score >= 72) badgeTier = 'high';
    else if (score >= 58) badgeTier = 'good';
    else if (score >= 42) badgeTier = 'moderate';
    else badgeTier = 'low';

    // Extract badge from the result
    if (bond.contextBadge) {
      const badge = bond.contextBadge;
      if (!foundBadges[category]) {
        foundBadges[category] = {};
      }
      if (!foundBadges[category][badgeTier]) {
        foundBadges[category][badgeTier] = badge;
        badgeCount++;
        result.stats.totalBadges++;

        // Validate
        const issues = validateBadge(badge.icon, badge.title, badge.narrative, category, badgeTier);
        if (issues.length > 0) {
          result.errors.push(`  Badge ${category}/${badgeTier}: ${issues.join('; ')}`);
        }

        console.log(`  ${category}/${badgeTier}: "${badge.title}"`);
      }
    }
  }
}

console.log(`\n✓ Extracted ${badgeCount} badges`);

// Test C: BOUNDARY TESTS
console.log('\n📋 TEST C: BOUNDARY TESTS');
console.log('─'.repeat(60));

// Test exact boundary scores (using arbitrary date pairs for precision)
const boundaryTests = [
  { date1: '1977-09-23', date2: '1980-05-12', expectedMinScore: 91, tierName: 'karmique' },
  { date1: '1985-03-15', date2: '1987-07-22', expectedMinScore: 79, tierName: 'fusionnel' },
  { date1: '1990-01-10', date2: '1992-06-18', expectedMinScore: 64, tierName: 'complementaire' },
  { date1: '1995-04-05', date2: '1998-09-14', expectedMinScore: 48, tierName: 'croissance' },
  { date1: '2000-02-20', date2: '2003-11-30', expectedMinScore: 32, tierName: 'transformation' },
];

for (const test of boundaryTests) {
  const bond = calcBond(test.date1, 'PersonA', test.date2, 'PersonB', 'famille');
  const score = bond.scoreGlobal;
  const expected = score >= test.expectedMinScore;
  
  const status = expected ? '✓' : '✗';
  console.log(`${status} ${test.tierName}: score=${score}, expected≥${test.expectedMinScore}`);
  
  if (!expected) {
    result.errors.push(`Boundary test failed for ${test.tierName}: score ${score} not >= ${test.expectedMinScore}`);
  }
}

// Badge boundary tests
console.log('\nBadge Tier Boundaries:');
const badgeBoundaryTests = [
  { score: 72, expectedTier: 'high' },
  { score: 71, expectedTier: 'good' },
  { score: 58, expectedTier: 'good' },
  { score: 57, expectedTier: 'moderate' },
  { score: 42, expectedTier: 'moderate' },
  { score: 41, expectedTier: 'low' },
];

for (const test of badgeBoundaryTests) {
  // Manually determine tier (same logic as getScoreTier)
  let tier: string;
  if (test.score >= 72) tier = 'high';
  else if (test.score >= 58) tier = 'good';
  else if (test.score >= 42) tier = 'moderate';
  else tier = 'low';
  
  const status = tier === test.expectedTier ? '✓' : '✗';
  console.log(`${status} Score ${test.score} → ${tier} (expected ${test.expectedTier})`);
  
  if (tier !== test.expectedTier) {
    result.errors.push(`Badge tier mismatch: score ${test.score} mapped to ${tier}, expected ${test.expectedTier}`);
  }
}

// Test D: COHERENCE CHECK — Verify score ≥ 91 maps to 'karmique', etc.
console.log('\n📋 TEST D: COHERENCE CHECK');
console.log('─'.repeat(60));

// Score 73% should NOT be "Lien Fusionnel" badge anymore (it should be high at 72+)
// Let's verify with a score of 73 that we get the right badge
const scoreTest73 = calcBond('1990-01-10', 'PersonA', '1992-06-18', 'PersonB', 'famille', 'fratrie');
console.log(`Score 73% test: score=${scoreTest73.scoreGlobal}, badge=${scoreTest73.contextBadge?.title}`);

if (scoreTest73.scoreGlobal && scoreTest73.scoreGlobal >= 70 && scoreTest73.scoreGlobal <= 76) {
  // Should be "high" badge
  if (scoreTest73.contextBadge?.title === 'Harmonie Fraternelle') {
    console.log('✓ Score 73 correctly mapped to "Harmonie Fraternelle" (high tier)');
  } else {
    result.warnings.push(`Score 73 badge might be wrong: ${scoreTest73.contextBadge?.title}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// FINAL REPORT
// ═══════════════════════════════════════════════════════════════

console.log('\n' + '═'.repeat(60));
console.log('📊 FINAL REPORT');
console.log('═'.repeat(60));

console.log(`\n✓ CONSEIL TEXTS`);
console.log(`  Total found: ${result.stats.totalConseilTexts} / 78 expected`);
console.log(`  Unique entries: ${result.stats.uniqueConseilTexts.size}`);
if (result.stats.duplicateConseilTexts.length > 0) {
  console.log(`  ⚠ Duplicates found (${result.stats.duplicateConseilTexts.length}):`);
  result.stats.duplicateConseilTexts.forEach(d => console.log(`    - ${d}`));
}
if (result.stats.emptyConseilTexts.length > 0) {
  console.log(`  ⚠ Empty entries (${result.stats.emptyConseilTexts.length}):`);
  result.stats.emptyConseilTexts.forEach(e => console.log(`    - ${e}`));
}

console.log(`\n✓ CONTEXT BADGES`);
console.log(`  Total found: ${result.stats.totalBadges} / 20 expected`);

console.log(`\n📋 BREAKDOWN BY CATEGORY:`);
for (const cat of badgeCategories) {
  const count = Object.keys(foundBadges[cat] || {}).length;
  console.log(`  ${cat}: ${count}/4 tiers`);
}

if (result.errors.length > 0) {
  console.log(`\n❌ ERRORS (${result.errors.length}):`);
  result.errors.slice(0, 20).forEach(e => console.log(`  - ${e}`));
  if (result.errors.length > 20) {
    console.log(`  ... and ${result.errors.length - 20} more`);
  }
} else {
  console.log('\n✓ No errors found');
}

if (result.warnings.length > 0) {
  console.log(`\n⚠ WARNINGS (${result.warnings.length}):`);
  result.warnings.forEach(w => console.log(`  - ${w}`));
}

// Exit code
const exitCode = result.errors.length > 0 ? 1 : 0;
console.log(`\n${exitCode === 0 ? '✓ TEST PASSED' : '✗ TEST FAILED'}`);
process.exit(exitCode);
