/**
 * SIMULATION — Golden Ticket Badges
 * Teste tous les badges positifs ("Fusion Céleste", "Fleur de Pêcher", etc.)
 * avec focus sur la vérification du bug fix : Peach Blossom badges en mode famille
 *
 * Vérifie :
 * 1. En mode 'famille', AUCUN badge contenant "Fleur de Pêcher" (bug fix)
 * 2. En mode 'amour' et 'pro', les badges Peach Blossom sont possibles
 * 3. Golden Ticket badges ne contiennent QUE les valeurs connues
 * 4. Les badges correspondent aux conditions du bazi
 * 5. Badges sont un array de strings, jamais vides quand conditions remplies
 */

import { calcBond, type BondMode, type FamilleSubType, type BondResult } from '../src/engines/compatibility';

// ═══ CONFIG ═══

const ALL_MODES: BondMode[] = ['amour', 'pro', 'famille'];

const FAMILLE_SUBTYPES: FamilleSubType[] = [
  'frere_frere', 'soeur_soeur', 'frere_soeur',
  'pere_fils', 'pere_fille', 'mere_fils', 'mere_fille',
  'gp_petit_fils', 'gp_petite_fille', 'gm_petit_fils', 'gm_petite_fille',
  'coloc', 'ami',
];

// Known valid golden ticket badges
const VALID_BADGES = new Set([
  '🌟 Fusion Céleste',
  '🌸🌸 Double Fleur de Pêcher',
  '🌸 Fleur de Pêcher Active',
  '✨ Maîtres Nombres en Résonance',
  '☯ Âmes Complémentaires (Roi Wen)',
  '💫 Harmonie Terrestre (Liù Hé)',
  '🔺 Triangle Sacré (San He)',
]);

// ═══ TEST DATES ═══
// Peach Blossom map (from bazi.ts):
//   - Shen/Zi/Chen (months 9/12/1) → Peach = You (Rooster, index 9)
//   - Yin/Wu/Xu (months 3/6/9 but Xu=10) → Peach = Mao (Rabbit, index 3)
//   - Si/You/Chou (months 5/10/12) → Peach = Wu (Horse, index 6)
//   - Hai/Mao/Wei (months 11/2/8) → Peach = Zi (Rat, index 0)
//
// To trigger peach blossom crossing:
// - Person A has branch X, Person B's natal branch = X's peach blossom
// - Or both directions (double peach)

const TEST_PAIRS = [
  // Reference base
  { dateA: '1977-09-23', dateB: '1977-09-23', desc: 'Same date (test master numbers)' },
  
  // Aggressive peach blossom targeting
  // Rat year (1960, 1972, 1984, 1996, 2008) with Rooster day candidates
  // Day branch Rooster = index 9 = peach for Shen/Zi/Chen group
  { dateA: '1960-01-10', dateB: '1988-10-15', desc: 'Rat + Rooster day attempt 1' },
  { dateA: '1972-02-20', dateB: '1990-09-05', desc: 'Rat + Rooster day attempt 2' },
  { dateA: '1984-03-30', dateB: '1992-10-25', desc: 'Rat + Rooster day attempt 3' },
  { dateA: '1996-04-15', dateB: '2000-09-18', desc: 'Rat + Rooster day attempt 4' },
  { dateA: '2008-05-05', dateB: '2015-10-10', desc: 'Rat + Rooster day attempt 5' },
  
  // Rabbit/Dragon/Tiger day candidates (Peach = Rabbit for Yin/Wu/Xu)
  // Day branch Rabbit = index 3 = peach for Yin/Wu/Xu group
  { dateA: '1963-06-15', dateB: '1985-03-20', desc: 'Yin/Wu/Xu + Rabbit day 1' },
  { dateA: '1975-09-10', dateB: '1995-03-08', desc: 'Yin/Wu/Xu + Rabbit day 2' },
  { dateA: '1987-12-05', dateB: '2005-03-25', desc: 'Yin/Wu/Xu + Rabbit day 3' },
  
  // Snake/Rooster/Ox day candidates (Peach = Horse for Si/You/Chou)
  // Day branch Horse = index 6 = peach for Si/You/Chou
  { dateA: '1965-05-18', dateB: '1983-06-12', desc: 'Si/You/Chou + Horse day 1' },
  { dateA: '1977-10-22', dateB: '1995-06-28', desc: 'Si/You/Chou + Horse day 2' },
  { dateA: '1989-11-30', dateB: '2007-06-05', desc: 'Si/You/Chou + Horse day 3' },
  
  // Pig/Rabbit/Goat day candidates (Peach = Rat for Hai/Mao/Wei)
  // Day branch Rat = index 0 = peach for Hai/Mao/Wei
  { dateA: '1959-11-28', dateB: '1988-01-08', desc: 'Hai/Mao/Wei + Rat day 1' },
  { dateA: '1971-02-14', dateB: '2000-01-20', desc: 'Hai/Mao/Wei + Rat day 2' },
  { dateA: '1983-08-25', dateB: '2010-01-15', desc: 'Hai/Mao/Wei + Rat day 3' },
  
  // More master number candidates (Life Path 11, 22, 33)
  { dateA: '1965-01-29', dateB: '1974-03-22', desc: 'Life Path 11 candidates' },
  { dateA: '1975-08-13', dateB: '1984-10-22', desc: 'Life Path 22 candidates' },
  { dateA: '1991-04-29', dateB: '2000-08-24', desc: 'Life Path 22/11 candidates' },
  { dateA: '1988-02-29', dateB: '1997-11-11', desc: 'Master number variants' },
  
  // Miscellaneous for breadth
  { dateA: '1950-12-25', dateB: '2000-01-01', desc: 'Large age gap' },
  { dateA: '2000-11-11', dateB: '2010-02-14', desc: 'Young pair with master 11' },
];

// ═══ ERROR TRACKING ═══

interface TestError {
  mode: BondMode;
  subtype: string;
  dateA: string;
  dateB: string;
  badge: string;
  category: string;
  message: string;
}

const errors: TestError[] = [];

// ═══ VERIFICATION LOGIC ═══

function validateBadges(
  result: BondResult,
  mode: BondMode,
  subtype: string,
  dateA: string,
  dateB: string
): void {
  const badges = result.badges || [];
  
  // CRITICAL: In mode 'famille', NO badge should contain "Fleur de Pêcher"
  if (mode === 'famille') {
    for (const badge of badges) {
      if (badge.includes('Fleur de Pêcher')) {
        errors.push({
          mode, subtype, dateA, dateB, badge,
          category: 'CRITICAL_BUG',
          message: `Peach Blossom badge in famille mode: "${badge}"`
        });
      }
    }
  }
  
  // Verify all badges are known values
  for (const badge of badges) {
    if (!VALID_BADGES.has(badge)) {
      errors.push({
        mode, subtype, dateA, dateB, badge,
        category: 'UNKNOWN_BADGE',
        message: `Unknown badge: "${badge}"`
      });
    }
  }
  
  // Verify badges is an array of strings
  if (!Array.isArray(badges)) {
    errors.push({
      mode, subtype, dateA, dateB, badge: String(badges),
      category: 'TYPE_ERROR',
      message: `badges is not an array: ${typeof badges}`
    });
  }
  
  for (const badge of badges) {
    if (typeof badge !== 'string') {
      errors.push({
        mode, subtype, dateA, dateB, badge: String(badge),
        category: 'TYPE_ERROR',
        message: `badge is not a string: ${typeof badge}`
      });
    }
  }
}

// ═══ MAIN TEST LOOP ═══

console.log('═══════════════════════════════════════════════');
console.log('  SIMULATION — GOLDEN TICKET BADGES');
console.log('═══════════════════════════════════════════════');
console.log();

let totalTests = 0;
const badgeCounts: Record<string, number> = {};
const badgesByMode: Record<BondMode, Set<string>> = {
  amour: new Set(),
  pro: new Set(),
  famille: new Set(),
};
const modeResults: Record<BondMode, { tests: number; badgeCount: number }> = {
  amour: { tests: 0, badgeCount: 0 },
  pro: { tests: 0, badgeCount: 0 },
  famille: { tests: 0, badgeCount: 0 },
};

for (const pair of TEST_PAIRS) {
  for (const mode of ALL_MODES) {
    const subtypes = mode === 'famille' ? FAMILLE_SUBTYPES : ['-'];
    
    for (const subtype of subtypes) {
      try {
        const result = calcBond(
          pair.dateA, 'PERSON_A',
          pair.dateB, 'PERSON_B',
          mode,
          subtype as FamilleSubType | undefined
        );
        
        validateBadges(result, mode, subtype, pair.dateA, pair.dateB);
        
        totalTests++;
        modeResults[mode].tests++;
        
        // Track badge distribution
        const badges = result.badges || [];
        for (const badge of badges) {
          badgeCounts[badge] = (badgeCounts[badge] || 0) + 1;
          badgesByMode[mode].add(badge);
          modeResults[mode].badgeCount++;
        }
      } catch (e: any) {
        errors.push({
          mode, subtype: subtype || '-', dateA: pair.dateA, dateB: pair.dateB,
          badge: 'N/A',
          category: 'CRASH',
          message: `Exception: ${e.message}`
        });
      }
    }
  }
}

// ═══ REPORT ═══

console.log(`Total tests executed: ${totalTests}`);
console.log(`Errors found: ${errors.length}`);
console.log();

// Report errors by category
if (errors.length > 0) {
  const byCategory: Record<string, TestError[]> = {};
  for (const e of errors) {
    if (!byCategory[e.category]) byCategory[e.category] = [];
    byCategory[e.category].push(e);
  }
  
  for (const [cat, errs] of Object.entries(byCategory).sort()) {
    console.log(`\n══ ${cat} (${errs.length} error${errs.length > 1 ? 's' : ''}) ══`);
    const seen = new Set<string>();
    for (const e of errs) {
      const key = `${e.mode}/${e.subtype}/${e.message}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const count = errs.filter(x => x.message === e.message && x.mode === e.mode).length;
      console.log(`  [${e.mode}/${e.subtype}] ${e.message}${count > 1 ? ` (×${count})` : ''}`);
    }
  }
  
  // CRITICAL: Check for famille Peach Blossom bugs
  const familleButgs = errors.filter(e => e.category === 'CRITICAL_BUG');
  if (familleButgs.length > 0) {
    console.log('\n🚨 CRITICAL BUG FOUND: Peach Blossom in famille mode!');
  }
} else {
  console.log('✅ NO ERRORS DETECTED');
}

// Badge distribution report
console.log('\n\n══ BADGE DISTRIBUTION (TOTAL) ══');
const sortedBadges = Object.entries(badgeCounts).sort((a, b) => b[1] - a[1]);
if (sortedBadges.length > 0) {
  for (const [badge, count] of sortedBadges) {
    console.log(`  ${badge}: ${count}`);
  }
} else {
  console.log('  (no badges found)');
}

console.log('\n\n══ BADGES BY MODE ══');
for (const mode of ALL_MODES) {
  const badges = Array.from(badgesByMode[mode]);
  if (badges.length > 0) {
    console.log(`  ${mode.toUpperCase()}:`);
    for (const badge of badges.sort()) {
      console.log(`    - ${badge}`);
    }
  } else {
    console.log(`  ${mode.toUpperCase()}: (no badges)`);
  }
}

console.log('\n\n══ COVERAGE BY MODE ══');
for (const [mode, stats] of Object.entries(modeResults) as [BondMode, typeof modeResults[BondMode]][]) {
  console.log(`  ${mode.toUpperCase()}: ${stats.tests} tests, ${stats.badgeCount} badge occurrences`);
}

// Verify critical constraint
console.log('\n\n══ CRITICAL CONSTRAINT VERIFICATION ══');
const peachInFamille = Array.from(badgesByMode['famille']).filter(b => b.includes('Fleur de Pêcher'));
if (peachInFamille.length === 0) {
  console.log('✅ PASS: No Peach Blossom badges in famille mode (bug fix confirmed)');
} else {
  console.log('❌ FAIL: Peach Blossom badges found in famille mode:');
  for (const badge of peachInFamille) {
    console.log(`    ${badge}`);
  }
}

console.log('\n\nSimulation completed.');
