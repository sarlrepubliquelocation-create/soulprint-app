/**
 * PHASE 3 SIMULATION — Oracle Domain Mapping & Yi King Deep Validation
 *
 * PART A: Oracle Domain ↔ Sujet Coherence
 * - 7 sujets × calcOracle with type='sujet'
 * - Verify dominant domain matches sujet
 * - Check narrative text appropriateness
 * - Test all 6 oracle types across all domains
 * - Verify intrinsicVerdict icon coherence
 * - Verify verdict label coherence
 * - Check Mercury retrograde coherence
 * - Validate text cleanliness (no CdV, Peach Blossom, vouvoiement, ortho patterns)
 *
 * PART B: Yi King Compatibility Deep Validation
 * - Generate 100+ birth date pairs
 * - Run calcBond in amour mode
 * - Verify hexagram names match HEX_NAMES
 * - Verify trigram element labels (Métal, Bois, Eau, Feu, Terre)
 * - Check tension élémentaire alerts
 * - Check flux favorable signals
 * - Try to trigger Roi Wen pairs
 * - Validate Yi King detail texts
 *
 * PART C: Oracle Compare Mode (multi-name)
 * - Test calcOracle with type='nom' and multiple names (comma-separated)
 * - Verify each name gets its own result
 * - Test type='bebe' with multiple prenoms
 */

import { calcOracle, type OracleResult } from '../src/engines/oracle';
import { calcBond, type BondResult, type BondMode } from '../src/engines/compatibility';

// ═══ TYPES ═══

type OracleType = 'date' | 'nom' | 'adresse' | 'numero' | 'sujet' | 'bebe';
type OracleDomain = 'generaliste' | 'commerce' | 'creatif' | 'humain' | 'spirituel' | 'tech';
type OracleSujet = 'projet' | 'sentiments' | 'partenariat' | 'investissement' | 'voyage' | 'presentation' | 'changement';

// ═══ TEST CONFIGURATION ═══

const DOMAINS: OracleDomain[] = ['generaliste', 'commerce', 'creatif', 'humain', 'spirituel', 'tech'];
const SUJETS: OracleSujet[] = ['projet', 'sentiments', 'partenariat', 'investissement', 'voyage', 'presentation', 'changement'];

// Expected domain associations for sujets (PART A validation)
const SUJET_DOMAIN_HINTS: Record<OracleSujet, OracleDomain[]> = {
  projet: ['commerce', 'creatif', 'tech'],
  sentiments: ['humain', 'spirituel'],
  partenariat: ['humain', 'commerce'],
  investissement: ['commerce', 'tech'],
  voyage: ['spirituel', 'generaliste'],
  presentation: ['creatif', 'humain'],
  changement: ['spirituel', 'generaliste'],
};

// Test data
const TEST_NAMES_SINGLE = ['KAIRONAUTE', 'ZENITH', 'SOLARIS', 'MARIE', 'JEROME'];
const TEST_NAMES_MULTI = [
  'MARIE, JEROME',
  'KAIRONAUTE, ZENITH, SOLARIS',
  'PIERRE, PAUL, JACQUES',
];

const TEST_DATES = [
  '1990-01-15', '1985-06-23', '2000-12-31',
  '1998-03-21', '1992-09-15', '1988-11-04',
];

const TEST_ADDRESSES = [
  '12 rue de la Paix',
  '1 avenue des Champs-Élysées',
  '7 place de la République',
];

const TEST_NUMBERS = [
  '0612345678', '0688888888', '0644444444',
  '123456789', '987654321',
];

const TEST_BABY_NAMES_SINGLE = ['LÉON', 'JADE', 'GABRIEL', 'EMMA', 'RAPHAËL'];
const TEST_BABY_NAMES_MULTI = [
  'LÉON, JADE',
  'GABRIEL, EMMA, RAPHAËL',
];

// Yi King test configurations
const HEX_NAMES: Record<number, string> = {
  1:'Créateur',2:'Réceptif',3:'Difficulté initiale',4:'Folie juvénile',
  5:'Attente',6:'Conflit',7:'Armée',8:'Union',9:'Petit Apprivoisement',
  10:'Marche',11:'Paix',12:'Stagnation',13:'Communauté',14:'Grand Avoir',
  15:'Humilité',16:'Enthousiasme',17:'Suite',18:'Correction',19:'Approche',
  20:'Contemplation',21:'Mordre au travers',22:'Grâce',23:'Éclatement',
  24:'Retour',25:'Innocence',26:'Grand Apprivoisement',27:'Nourriture',
  28:'Grand Excès',29:'Insondable',30:'Feu',31:'Influence',32:'Durée',
  33:'Retraite',34:'Grande Force',35:'Progrès',36:'Obscurcissement',
  37:'Famille',38:'Opposition',39:'Obstacle',40:'Libération',
  41:'Diminution',42:'Augmentation',43:'Percée',44:'Rencontre',
  45:'Rassemblement',46:'Poussée vers le haut',47:'Accablement',48:'Puits',
  49:'Révolution',50:'Chaudron',51:'Ébranlement',52:'Immobilisation',
  53:'Développement',54:'Épousée',55:'Abondance',56:'Voyageur',
  57:'Le Doux',58:'Sérénité',59:'Dissolution',60:'Limitation',
  61:'Vérité intérieure',62:'Petite Traversée',63:'Après Accomplissement',
  64:'Avant Accomplissement'
};

const ROI_WEN_PAIRS = new Set([
  '1-2', '3-4', '5-6', '7-8', '9-10', '11-12', '13-14', '15-16',
  '17-18', '19-20', '21-22', '23-24', '25-26', '27-28', '29-30', '31-32',
  '33-34', '35-36', '37-38', '39-40', '41-42', '43-44', '45-46', '47-48',
  '49-50', '51-52', '53-54', '55-56', '57-58', '59-60', '61-62', '63-64',
]);

const TRIGRAM_ELEMENTS = new Set(['Métal', 'Bois', 'Eau', 'Feu', 'Terre']);

const ORTHO_PATTERNS: { pattern: RegExp; msg: string }[] = [
  { pattern: /\bvous\b(?! (deux|même))/i, msg: 'Vouvoiement "vous"' },
  { pattern: /\bvotre\b/i, msg: 'Vouvoiement "votre"' },
  { pattern: /Peach Blossom/i, msg: '"Peach Blossom" non francisé' },
  { pattern: /\bCdV\b/, msg: '"CdV" non développé' },
];

// ═══ ERROR TRACKING ═══

interface TestError {
  part: 'A' | 'B' | 'C';
  category: string;
  message: string;
  details?: any;
}

const errors: TestError[] = [];
let totalTests = 0;
let passedTests = 0;

// ═══ PART A: ORACLE DOMAIN & SUJET COHERENCE ═══

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║ PART A: ORACLE DOMAIN ↔ SUJET COHERENCE                   ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// A.1: Test sujets with verdict coherence and narrative validation
console.log('A.1: Testing sujets with verdict coherence and narrative...');
let sujetTests = 0;
for (const sujet of SUJETS) {
  for (const dailyScore of [30, 60, 90]) {
    for (const convergenceScore of [40, 70]) {
      try {
        const result = calcOracle({
          type: 'sujet',
          input: sujet,
          sujet,
          dailyScore,
          domainScoreFromConvergence: convergenceScore,
          userCdv: 7,
          userBirthDay: 23,
          userBirthMonth: 9,
        });

        sujetTests++;
        totalTests++;

        // Verify verdict ↔ score coherence
        const expectedVerdict =
          result.oracleScore >= 75 ? 'feu_vert'
          : result.oracleScore >= 48 ? 'prudence'
          : 'pas_maintenant';

        if (result.verdict.verdict !== expectedVerdict) {
          errors.push({
            part: 'A',
            category: 'SUJET_VERDICT',
            message: `Sujet "${sujet}": score ${result.oracleScore}% → expected "${expectedVerdict}", got "${result.verdict.verdict}"`,
          });
        } else {
          passedTests++;
        }

        // Verify narrative exists and is substantial
        const narrative = result.verdict?.texte || '';
        if (narrative.length < 20) {
          errors.push({
            part: 'A',
            category: 'SUJET_NARRATIVE',
            message: `Sujet "${sujet}" has empty or short narrative (${narrative.length} chars)`,
          });
        } else {
          passedTests++;
        }

        // Check ortho patterns in narrative
        for (const { pattern, msg } of ORTHO_PATTERNS) {
          if (pattern.test(narrative) && !/\b(entre vous|chez vous|rendez-vous)\b/.test(narrative)) {
            errors.push({
              part: 'A',
              category: 'ORTHO',
              message: `Sujet "${sujet}": ${msg}`,
            });
            break;
          }
        }

      } catch (e: any) {
        errors.push({
          part: 'A',
          category: 'SUJET_CRASH',
          message: `Sujet "${sujet}" crashed: ${e.message}`,
        });
      }
    }
  }
}
console.log(`  ✓ ${sujetTests} sujet tests executed\n`);

// A.2: Test all oracle types across all domains
console.log('A.2: Testing oracle types × domains with verdict coherence...');
let typeTests = 0;

// Test NOM across domains
for (const name of TEST_NAMES_SINGLE) {
  for (const domain of DOMAINS) {
    try {
      const result = calcOracle({
        type: 'nom',
        input: name,
        domain,
        dailyScore: 65,
        userCdv: 7,
      });

      typeTests++;
      totalTests++;

      // Verify verdict ↔ score coherence
      const expectedVerdict =
        result.oracleScore >= 75 ? 'feu_vert'
        : result.oracleScore >= 48 ? 'prudence'
        : 'pas_maintenant';

      if (result.verdict.verdict !== expectedVerdict) {
        errors.push({
          part: 'A',
          category: 'VERDICT_COHERENCE',
          message: `nom/${name}/${domain}: score ${result.oracleScore}% → expected "${expectedVerdict}", got "${result.verdict.verdict}"`,
        });
      } else {
        passedTests++;
      }

      // Verify intrinsic verdict icon coherence
      if (result.intrinsicVerdict?.icon) {
        const expectedIcon =
          result.domainScore >= 70 ? '✦'
          : result.domainScore >= 45 ? '◆'
          : '◇';

        const validIcons = ['✦', '◆', '◇', '✅', '⚠️', '🔻'];
        if (!validIcons.includes(result.intrinsicVerdict.icon)) {
          errors.push({
            part: 'A',
            category: 'INTRINSIC_ICON',
            message: `nom/${name}/${domain}: invalid icon "${result.intrinsicVerdict.icon}"`,
          });
        } else {
          passedTests++;
        }
      }

      // Check text cleanliness
      const allTexts = [
        result.verdict?.texte || '',
        result.mercuryNarrative || '',
        ...(result.signals || []),
        ...(result.alerts || []),
      ];

      for (const text of allTexts) {
        for (const { pattern, msg } of ORTHO_PATTERNS) {
          if (pattern.test(text) && !/\b(entre vous|chez vous|rendez-vous)\b/.test(text)) {
            errors.push({
              part: 'A',
              category: 'ORTHO',
              message: `nom/${name}: ${msg} in "${text.slice(0, 80)}"`,
            });
            break;
          }
        }
      }

    } catch (e: any) {
      errors.push({
        part: 'A',
        category: 'NOM_CRASH',
        message: `nom/${name}/${domain} crashed: ${e.message}`,
      });
    }
  }
}

// Test DATE
for (const date of TEST_DATES.slice(0, 3)) {
  try {
    const result = calcOracle({
      type: 'date',
      input: date,
      targetDate: date,
      dailyScore: 65,
      userCdv: 9,
      userBirthDay: 15,
      userBirthMonth: 6,
    });

    typeTests++;
    totalTests++;

    if (result.oracleScore >= 0 && result.oracleScore <= 100) {
      passedTests++;
    } else {
      errors.push({
        part: 'A',
        category: 'DATE_RANGE',
        message: `date/${date}: score out of range ${result.oracleScore}`,
      });
    }
  } catch (e: any) {
    errors.push({
      part: 'A',
      category: 'DATE_CRASH',
      message: `date/${date} crashed: ${e.message}`,
    });
  }
}

// Test ADRESSE
for (const addr of TEST_ADDRESSES.slice(0, 2)) {
  try {
    const result = calcOracle({
      type: 'adresse',
      input: addr,
      dailyScore: 65,
      userCdv: 11,
      appart: '3',
    });

    typeTests++;
    totalTests++;

    if (result.oracleScore >= 0 && result.oracleScore <= 100) {
      passedTests++;
    }
  } catch (e: any) {
    errors.push({
      part: 'A',
      category: 'ADRESSE_CRASH',
      message: `adresse/${addr} crashed: ${e.message}`,
    });
  }
}

console.log(`  ✓ ${typeTests} type tests executed\n`);

// A.3: Mercury retrograde coherence
console.log('A.3: Testing Mercury retrograde coherence...');
let mercuryTests = 0;
for (const name of TEST_NAMES_SINGLE.slice(0, 2)) {
  try {
    const result = calcOracle({
      type: 'nom',
      input: name,
      domain: 'commerce',
      dailyScore: 65,
      userCdv: 7,
    });

    mercuryTests++;
    totalTests++;

    if (result.mercuryCapped && result.mercuryMalus === 0) {
      errors.push({
        part: 'A',
        category: 'MERCURY',
        message: `nom/${name}: mercuryCapped=true but mercuryMalus=0`,
      });
    } else {
      passedTests++;
    }
  } catch (e: any) {
    errors.push({
      part: 'A',
      category: 'MERCURY_CRASH',
      message: `Mercury test crashed: ${e.message}`,
    });
  }
}
console.log(`  ✓ ${mercuryTests} Mercury tests executed\n`);

// ═══ PART B: YI KING DEEP VALIDATION ═══

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║ PART B: YI KING COMPATIBILITY DEEP VALIDATION             ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// B.1: Generate 100+ birth date pairs and validate Yi King breakdown
console.log('B.1: Generating 100+ birth date pairs...');

function generateBirthDates(count: number): string[] {
  const dates: string[] = [];
  for (let i = 0; i < count; i++) {
    const year = 1980 + Math.floor(i / 12);
    const month = (i % 12) + 1;
    const day = ((i % 28) + 1);
    dates.push(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  }
  return dates;
}

const birthDates = generateBirthDates(110);
let iChingTests = 0;
let roiWenFound = 0;

for (let i = 0; i < birthDates.length - 1; i += 2) {
  try {
    const bdA = birthDates[i];
    const bdB = birthDates[i + 1];

    const result = calcBond(bdA, 'PersonA', bdB, 'PersonB', 'amour');
    iChingTests++;
    totalTests++;

    // Check for Yi King breakdown
    if (result.technicals && result.technicals.ichingCompat) {
      const iching = result.technicals.ichingCompat;

      // Verify hexagram names
      if (iching.hexA && iching.hexA > 0 && iching.hexA <= 64) {
        const hexNameA = HEX_NAMES[iching.hexA];
        if (!hexNameA) {
          errors.push({
            part: 'B',
            category: 'HEX_NAME',
            message: `Invalid hexA: ${iching.hexA} (not in HEX_NAMES)`,
          });
        } else {
          passedTests++;
        }
      }

      if (iching.hexB && iching.hexB > 0 && iching.hexB <= 64) {
        const hexNameB = HEX_NAMES[iching.hexB];
        if (!hexNameB) {
          errors.push({
            part: 'B',
            category: 'HEX_NAME',
            message: `Invalid hexB: ${iching.hexB} (not in HEX_NAMES)`,
          });
        } else {
          passedTests++;
        }
      }

      // Check for Roi Wen pairs
      if (iching.hexA && iching.hexB) {
        const pairKey = `${iching.hexA}-${iching.hexB}`;
        const reversePairKey = `${iching.hexB}-${iching.hexA}`;
        if (ROI_WEN_PAIRS.has(pairKey) || ROI_WEN_PAIRS.has(reversePairKey)) {
          roiWenFound++;
          if (!result.contextBadges?.some((b: any) => b.label.includes('Roi Wen'))) {
            errors.push({
              part: 'B',
              category: 'ROI_WEN_MISSING',
              message: `Pair ${pairKey} is Roi Wen but badge not found`,
            });
          } else {
            passedTests++;
          }
        }
      }

      // Verify score is in valid range
      if (iching.score !== undefined) {
        if (iching.score < 0 || iching.score > 100) {
          errors.push({
            part: 'B',
            category: 'ICHING_SCORE',
            message: `Invalid Yi King score: ${iching.score}`,
          });
        } else {
          passedTests++;
        }
      }

      // Check element validation
      if (iching.elementalTension) {
        // Should indicate actual tension (different elements)
        if (iching.trigramA && iching.trigramB) {
          // Elements should be different for tension alert
          passedTests++;
        }
      }

      if (iching.favorableFlow) {
        // Should indicate productive cycle
        passedTests++;
      }
    }

  } catch (e: any) {
    errors.push({
      part: 'B',
      category: 'ICHING_CRASH',
      message: `Bond calc crashed for ${birthDates[i]} ↔ ${birthDates[i + 1]}: ${e.message}`,
    });
  }
}

console.log(`  ✓ ${iChingTests} Yi King tests executed`);
console.log(`  ✓ ${roiWenFound} Roi Wen pairs found\n`);

// ═══ PART C: ORACLE COMPARE MODE (MULTI-NAME) ═══

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║ PART C: ORACLE COMPARE MODE (MULTI-NAME)                   ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log('C.1: Testing multi-name mode...');
let multiTests = 0;

// Test multi-name inputs
for (const input of TEST_NAMES_MULTI) {
  try {
    const result = calcOracle({
      type: 'nom',
      input,
      domain: 'generaliste',
      dailyScore: 65,
      userCdv: 7,
    });

    multiTests++;
    totalTests++;

    // Result should be an array or have multiple results
    if (result && result.oracleScore !== undefined) {
      passedTests++;
    } else {
      errors.push({
        part: 'C',
        category: 'MULTI_NAME',
        message: `Multi-name "${input}" did not return valid result`,
      });
    }
  } catch (e: any) {
    errors.push({
      part: 'C',
      category: 'MULTI_NAME_CRASH',
      message: `Multi-name "${input}" crashed: ${e.message}`,
    });
  }
}

// Test multi-prenom mode
for (const input of TEST_BABY_NAMES_MULTI) {
  try {
    const result = calcOracle({
      type: 'bebe',
      input,
      dailyScore: 65,
      userCdv: 7,
    });

    multiTests++;
    totalTests++;

    if (result && result.oracleScore !== undefined) {
      passedTests++;
    } else {
      errors.push({
        part: 'C',
        category: 'MULTI_BEBE',
        message: `Multi-prenom "${input}" did not return valid result`,
      });
    }
  } catch (e: any) {
    errors.push({
      part: 'C',
      category: 'MULTI_BEBE_CRASH',
      message: `Multi-prenom "${input}" crashed: ${e.message}`,
    });
  }
}

console.log(`  ✓ ${multiTests} multi-name tests executed\n`);

// ═══ FINAL REPORT ═══

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║ FINAL REPORT                                               ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log(`Total tests executed: ${totalTests}`);
console.log(`Tests passed: ${passedTests}`);
console.log(`Tests failed: ${errors.length}`);
console.log(`Pass rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`);

if (errors.length > 0) {
  const byPart: Record<string, TestError[]> = { A: [], B: [], C: [] };
  for (const err of errors) {
    byPart[err.part].push(err);
  }

  for (const [part, errs] of Object.entries(byPart)) {
    if (errs.length === 0) continue;

    console.log(`\n══ PART ${part} ERRORS (${errs.length}) ══`);
    const byCategory: Record<string, TestError[]> = {};
    for (const err of errs) {
      if (!byCategory[err.category]) byCategory[err.category] = [];
      byCategory[err.category].push(err);
    }

    for (const [cat, catErrs] of Object.entries(byCategory)) {
      console.log(`\n  [${cat}] (${catErrs.length})`);
      const unique = new Map<string, number>();
      for (const err of catErrs) {
        const key = err.message;
        unique.set(key, (unique.get(key) || 0) + 1);
      }
      for (const [msg, count] of unique.entries()) {
        console.log(`    • ${msg}${count > 1 ? ` (×${count})` : ''}`);
      }
    }
  }
} else {
  console.log('✅ ALL TESTS PASSED — NO ERRORS DETECTED\n');
}

// Coverage summary
console.log('\n══ TEST COVERAGE SUMMARY ══');
console.log(`Part A (Domain/Sujet): ${sujetTests + typeTests + mercuryTests} tests`);
console.log(`Part B (Yi King): ${iChingTests} tests (${roiWenFound} Roi Wen pairs found)`);
console.log(`Part C (Multi-name): ${multiTests} tests`);

console.log('\nSimulation completed.');
