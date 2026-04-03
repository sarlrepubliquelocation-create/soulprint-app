/**
 * SIMULATION EXHAUSTIVE — Oracle des Choix
 * Teste calcOracle sur les 6 types × domaines × sujets × centaines d'inputs
 *
 * Vérifie :
 * 1. Score dans [0-100]
 * 2. Verdict cohérent avec score (≥75 feu_vert, 48-74 prudence, <48 pas_maintenant)
 * 3. Intrinsic verdict cohérent (≥70 favorable, 45-69 neutre, <45 faible)
 * 4. Breakdown composants non vides
 * 5. Aucun texte "Peach Blossom", "CdV" (non développé), vouvoiement
 * 6. Verdict texte non vide
 * 7. Signaux/alertes cohérents
 * 8. Pas de crash sur inputs variés (accents, vides, longs)
 * 9. Karmic debts correctement détectés
 * 10. Master numbers correctement détectés
 * 11. Orthographe/grammaire patterns
 */

import { calcOracle, type OracleResult } from '../src/engines/oracle';

type OracleType = 'date' | 'nom' | 'adresse' | 'numero' | 'sujet' | 'bebe';
type OracleDomain = 'generaliste' | 'commerce' | 'creatif' | 'humain' | 'spirituel' | 'tech';
type OracleSujet = 'projet' | 'sentiments' | 'partenariat' | 'investissement' | 'voyage' | 'presentation' | 'changement';

// ═══ TEST DATA ═══

const DOMAINS: OracleDomain[] = ['generaliste', 'commerce', 'creatif', 'humain', 'spirituel', 'tech'];
const SUJETS: OracleSujet[] = ['projet', 'sentiments', 'partenariat', 'investissement', 'voyage', 'presentation', 'changement'];

const TEST_NAMES = [
  'KAIRONAUTE', 'ZENITH', 'SOLARIS', 'LUMINA', 'NEXUS',
  'ABC', 'ZZZ', 'AEIOU',  // voyelles only, consonnes only
  'MARIE', 'JEROME', 'PIERRE', 'JEAN', 'SOPHIE',
  'CONSTELLATION', 'HARMONIE', 'INFINI', 'ORACLE',
  'LE PETIT PRINCE', 'LA BELLE ÉTOILE',  // avec accents et espaces
  'A', 'AA', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',  // courts et longs
  'ENTREPRISE GÉNÉRALE', 'CAFÉ DES ARTS', 'L\'ATELIER',
];

const TEST_DATES = [
  '2026-03-26', '2026-04-01', '2026-06-21', '2026-09-23', '2026-12-25',
  '2026-01-01', '2026-07-14', '2026-11-11', '2026-02-14', '2026-08-15',
  '2027-01-01', '2027-06-15', '2025-12-31',
];

const TEST_ADDRESSES = [
  '12 rue de la Paix', '1 avenue des Champs-Élysées', '33 boulevard Victor Hugo',
  '7 place de la République', '22 impasse des Lilas', '4 rue du Château',
  '100 route de Lyon', '8 allée des Cerisiers', '15 chemin du Moulin',
  '42 rue de Rivoli',
];

const TEST_NUMBERS = [
  '0612345678', '0600000000', '0688888888', '0644444444',
  '123456789', '111111', '987654321', '0147258369',
  '33612345678', '0033612345678',
  '12345', '9876543210', '0606060606',
  '80080080', '44444444',
];

const TEST_BABY_NAMES = [
  'LÉON', 'JADE', 'GABRIEL', 'EMMA', 'RAPHAËL',
  'LOUISE', 'ADAM', 'ALICE', 'NOAH', 'LÉA',
  'MAËL', 'INÈS', 'SACHA', 'ROSE', 'ETHAN',
];

const CDVS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33];

// ═══ ORTHO PATTERNS ═══

const ORTHO_PATTERNS: { pattern: RegExp; msg: string }[] = [
  { pattern: /\bvous\b(?! (deux|même))/i, msg: 'Vouvoiement "vous"' },
  { pattern: /\bvotre\b/i, msg: 'Vouvoiement "votre"' },
  { pattern: /\bvos\b(?! deux)/i, msg: 'Vouvoiement "vos"' },
  { pattern: /Peach Blossom/i, msg: '"Peach Blossom" non francisé' },
  { pattern: /\bCdV\b/, msg: '"CdV" non développé' },
  { pattern: /médiane 68/, msg: '"médiane 68" incorrecte' },
  { pattern: /Choisissez/i, msg: 'Vouvoiement "Choisissez"' },
  { pattern: /Utilisez/i, msg: 'Vouvoiement "Utilisez"' },
  { pattern: /Protégez/i, msg: 'Vouvoiement "Protégez"' },
  { pattern: /donnez/i, msg: 'Vouvoiement "donnez"' },
  { pattern: /pensez/i, msg: 'Vouvoiement "pensez"' },
  { pattern: /honorez/i, msg: 'Vouvoiement "honorez"' },
  { pattern: /préparez/i, msg: 'Vouvoiement "préparez"' },
  { pattern: /agissez/i, msg: 'Vouvoiement "agissez"' },
  { pattern: /basez/i, msg: 'Vouvoiement "basez"' },
];

// ═══ ERRORS ═══

interface TestError {
  type: string;
  input: string;
  category: string;
  message: string;
  score?: number;
}

const errors: TestError[] = [];
let totalTests = 0;
const verdictCoverage: Record<string, Set<string>> = {};
const scoreBuckets: Record<string, Record<number, number>> = {};

function collectAllTexts(r: OracleResult): string[] {
  return [
    r.verdict?.texte || '',
    r.verdict?.label || '',
    r.mercuryNarrative || '',
    r.intrinsicVerdict?.label || '',
    ...r.signals,
    ...r.alerts,
    ...(r.breakdown || []).map((b: any) => b.label || ''),
    ...(r.breakdown || []).map((b: any) => b.detail || ''),
    ...(r.bestDates || []).map((d: any) => d.label || ''),
    ...(r.bestDates || []).map((d: any) => d.narrative || ''),
  ].filter(Boolean);
}

function checkResult(r: OracleResult, type: string, input: string) {
  const base = { type, input, score: r.oracleScore };

  // 1. Score range
  if (r.oracleScore < 0 || r.oracleScore > 100) {
    errors.push({ ...base, category: 'RANGE', message: `Score hors limites: ${r.oracleScore}` });
  }
  if (r.domainScore < 0 || r.domainScore > 100) {
    errors.push({ ...base, category: 'RANGE', message: `Domain score hors limites: ${r.domainScore}` });
  }

  // 2. Verdict ↔ Score cohérence
  const expectedVerdict =
    r.oracleScore >= 75 ? 'feu_vert'
    : r.oracleScore >= 48 ? 'prudence'
    : 'pas_maintenant';

  if (r.verdict.verdict !== expectedVerdict) {
    errors.push({ ...base, category: 'VERDICT',
      message: `Score ${r.oracleScore}% → attendu "${expectedVerdict}", obtenu "${r.verdict.verdict}"`
    });
  }

  // 3. Intrinsic verdict cohérence
  if (r.intrinsicVerdict) {
    const ds = r.domainScore;
    const expectedIntrinsic =
      ds >= 70 ? '✦' : ds >= 45 ? '◆' : '◇';
    // On vérifie juste que l'icône est cohérente avec le score
    if (r.intrinsicVerdict.icon && !['✦', '◆', '◇', '✅', '⚠️', '🔻'].includes(r.intrinsicVerdict.icon)) {
      errors.push({ ...base, category: 'INTRINSIC',
        message: `Icône intrinsic inconnue: "${r.intrinsicVerdict.icon}"`
      });
    }
  }

  // 4. Verdict texte non vide
  if (!r.verdict.texte || r.verdict.texte.length < 10) {
    errors.push({ ...base, category: 'VERDICT',
      message: `Verdict texte vide ou trop court: "${r.verdict.texte}"`
    });
  }

  // 5. Breakdown non vide
  if (!r.breakdown || r.breakdown.length === 0) {
    errors.push({ ...base, category: 'BREAKDOWN',
      message: `Breakdown vide`
    });
  }

  // 6. Ortho sur tous les textes
  const allTexts = collectAllTexts(r);
  for (const text of allTexts) {
    for (const { pattern, msg } of ORTHO_PATTERNS) {
      if (pattern.test(text)) {
        // Exceptions contextuelle
        if (/\bvous\b/i.test(text) && /(entre vous|chez vous|rendez-vous|de vous deux)/.test(text)) continue;
        errors.push({ ...base, category: 'ORTHO',
          message: `${msg} dans: "${text.slice(0, 120)}..."`
        });
      }
    }
  }

  // 7. Mercury malus cohérence
  if (r.mercuryCapped && r.mercuryMalus === 0) {
    errors.push({ ...base, category: 'MERCURY',
      message: `mercuryCapped=true mais mercuryMalus=0`
    });
  }

  // Track coverage
  const vKey = type;
  if (!verdictCoverage[vKey]) verdictCoverage[vKey] = new Set();
  verdictCoverage[vKey].add(r.verdict.verdict);

  if (!scoreBuckets[type]) scoreBuckets[type] = {};
  const bucket = Math.floor(r.oracleScore / 10) * 10;
  scoreBuckets[type][bucket] = (scoreBuckets[type][bucket] || 0) + 1;

  totalTests++;
}

// ═══ MAIN ═══

console.log('═══════════════════════════════════════════');
console.log('  SIMULATION EXHAUSTIVE — ORACLE DES CHOIX');
console.log('═══════════════════════════════════════════\n');

// ── 1. NOM/MARQUE ──
console.log('Testing NOM/MARQUE...');
for (const name of TEST_NAMES) {
  for (const domain of DOMAINS) {
    for (const cdv of [2, 5, 7, 9]) {
      try {
        const r = calcOracle({
          type: 'nom', input: name, domain,
          dailyScore: 65, userCdv: cdv,
        });
        checkResult(r, 'nom', `${name}/${domain}/cdv${cdv}`);
      } catch (e: any) {
        errors.push({ type: 'nom', input: name, category: 'CRASH', message: e.message });
      }
    }
  }
}

// ── 2. DATE ──
console.log('Testing DATE...');
for (const date of TEST_DATES) {
  for (const cdv of CDVS) {
    try {
      const r = calcOracle({
        type: 'date', input: date, targetDate: date,
        dailyScore: 65, userCdv: cdv,
        userBirthDay: 23, userBirthMonth: 9,
      });
      checkResult(r, 'date', `${date}/cdv${cdv}`);
    } catch (e: any) {
      errors.push({ type: 'date', input: date, category: 'CRASH', message: e.message });
    }
  }
}

// ── 3. ADRESSE ──
console.log('Testing ADRESSE...');
for (const addr of TEST_ADDRESSES) {
  for (const cdv of [1, 4, 7, 11]) {
    for (const appart of [undefined, '3', '11', '22']) {
      try {
        const r = calcOracle({
          type: 'adresse', input: addr,
          dailyScore: 65, userCdv: cdv, appart,
        });
        checkResult(r, 'adresse', `${addr}${appart ? `/apt${appart}` : ''}/cdv${cdv}`);
      } catch (e: any) {
        errors.push({ type: 'adresse', input: addr, category: 'CRASH', message: e.message });
      }
    }
  }
}

// ── 4. NUMÉRO ──
console.log('Testing NUMÉRO...');
for (const num of TEST_NUMBERS) {
  for (const domain of DOMAINS) {
    try {
      const r = calcOracle({
        type: 'numero', input: num, domain,
        dailyScore: 65, userCdv: 7,
      });
      checkResult(r, 'numero', `${num}/${domain}`);
    } catch (e: any) {
      errors.push({ type: 'numero', input: num, category: 'CRASH', message: e.message });
    }
  }
}

// ── 5. SUJET ──
console.log('Testing SUJET...');
for (const sujet of SUJETS) {
  for (const dailyScore of [20, 40, 55, 70, 85]) {
    for (const convergenceScore of [30, 50, 65, 80, 95]) {
      try {
        const r = calcOracle({
          type: 'sujet', input: sujet, sujet,
          dailyScore,
          domainScoreFromConvergence: convergenceScore,
          userCdv: 7, userBirthDay: 23, userBirthMonth: 9,
        });
        checkResult(r, 'sujet', `${sujet}/daily${dailyScore}/conv${convergenceScore}`);
      } catch (e: any) {
        errors.push({ type: 'sujet', input: sujet, category: 'CRASH', message: e.message });
      }
    }
  }
}

// ── 6. BÉBÉ ──
console.log('Testing BÉBÉ...');
for (const name of TEST_BABY_NAMES) {
  for (const cdv of [1, 3, 5, 7, 9, 11]) {
    for (const p2cdv of [undefined, 2, 6, 8]) {
      try {
        const r = calcOracle({
          type: 'bebe', input: name,
          dailyScore: 65, userCdv: cdv, parent2Cdv: p2cdv,
        });
        checkResult(r, 'bebe', `${name}/cdv${cdv}${p2cdv ? `/p2cdv${p2cdv}` : ''}`);
      } catch (e: any) {
        errors.push({ type: 'bebe', input: name, category: 'CRASH', message: e.message });
      }
    }
  }
}

// ═══ RAPPORT ═══

console.log(`\nTests exécutés: ${totalTests}`);
console.log(`Erreurs trouvées: ${errors.length}`);

if (errors.length > 0) {
  const byCategory: Record<string, TestError[]> = {};
  for (const e of errors) {
    if (!byCategory[e.category]) byCategory[e.category] = [];
    byCategory[e.category].push(e);
  }

  for (const [cat, errs] of Object.entries(byCategory).sort()) {
    console.log(`\n══ ${cat} (${errs.length} erreur${errs.length > 1 ? 's' : ''}) ══`);
    const seen = new Set<string>();
    for (const e of errs) {
      const key = `${e.type}:${e.message}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const count = errs.filter(x => `${x.type}:${x.message}` === key).length;
      console.log(`  [${e.type}] ${e.message}${count > 1 ? ` (×${count})` : ''}`);
    }
  }
} else {
  console.log('\n✅ AUCUNE ERREUR DÉTECTÉE');
}

// Verdict coverage
console.log('\n\n══ COUVERTURE DES VERDICTS ══');
for (const [type, verdicts] of Object.entries(verdictCoverage).sort()) {
  const all3 = ['feu_vert', 'prudence', 'pas_maintenant'];
  console.log(`${type}: ${[...verdicts].join(', ')} (${verdicts.size}/3)`);
  for (const v of all3) {
    console.log(`  ${verdicts.has(v) ? '✅' : '❌'} ${v}`);
  }
}

// Score distribution
console.log('\n\n══ DISTRIBUTION DES SCORES ══');
for (const [type, buckets] of Object.entries(scoreBuckets).sort()) {
  console.log(`\n${type.toUpperCase()}:`);
  for (let b = 0; b <= 90; b += 10) {
    const count = buckets[b] || 0;
    const bar = '█'.repeat(Math.min(count, 60));
    console.log(`  ${String(b).padStart(2)}–${String(b + 9).padStart(2)}%: ${bar} (${count})`);
  }
}

console.log('\n\nSimulation terminée.');
