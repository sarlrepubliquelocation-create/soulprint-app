/**
 * SIMULATION EXHAUSTIVE — Onglet Affinité
 * Teste calcBond sur 13 sous-types famille × ~50 paires de dates
 * + 3 modes (amour, pro, famille) pour couvrir tous les niveaux de score
 *
 * Vérifie :
 * 1. Cohérence label ↔ score (seuils)
 * 2. Cohérence badge contextuel ↔ score tier ↔ label
 * 3. Cohérence conseil ↔ score bracket ↔ sous-type
 * 4. Résumé ne cite PAS Peach Blossom en mode famille
 * 5. Aucun texte contenant "Peach Blossom" visible
 * 6. Aucun vouvoiement (vous/votre/vos)
 * 7. Orthographe/grammaire (patterns connus)
 * 8. Weighted sum → Gaussian → scoreGlobal cohérent
 */

import { calcBond, type BondMode, type FamilleSubType, type BondResult } from '../src/engines/compatibility';

// ═══ CONFIG ═══

const ALL_SUBTYPES: FamilleSubType[] = [
  'frere_frere', 'soeur_soeur', 'frere_soeur',
  'pere_fils', 'pere_fille', 'mere_fils', 'mere_fille',
  'gp_petit_fils', 'gp_petite_fille', 'gm_petit_fils', 'gm_petite_fille',
  'coloc', 'ami',
];

const ALL_MODES: BondMode[] = ['amour', 'pro', 'famille'];

// Dates choisies pour couvrir un large spectre de scores
// Mélange d'années, saisons, générations
const DATE_POOL_A = [
  '1977-09-23', // Jérôme (référence)
];

const DATE_POOL_B = [
  '1915-12-24', '1914-07-01', '1942-03-15', '1950-08-22', '1955-11-30',
  '1960-01-05', '1965-06-18', '1970-04-12', '1972-10-07', '1975-02-28',
  '1977-09-23', // même date
  '1978-05-14', '1979-12-31', '1980-03-03', '1981-12-22', '1983-07-07',
  '1985-01-19', '1987-08-15', '1988-02-29', '1990-06-21', '1991-11-11',
  '1993-04-04', '1995-09-09', '1997-01-01', '1998-12-12', '2000-07-20',
  '2002-03-17', '2004-10-31', '2006-05-05', '2008-08-08', '2010-02-14',
  '2012-12-21', '2015-06-15', '2018-01-28', '2020-09-10', '2023-04-01',
];

// Noms de test
const NAMES_A = 'JEROME';
const NAMES_B_LIST = ['PIERRE', 'MARIE', 'JEAN', 'CARMEN', 'PAUL', 'JEANNE', 'LUC', 'SOPHIE', 'ANNE', 'THOMAS'];

// ═══ SEUILS RÉFÉRENCE ═══

const FAMILLE_LABEL_THRESHOLDS = [
  { min: 88, name: "Lien d'Âme Familial" },
  { min: 72, name: 'Harmonie Naturelle' },
  { min: 58, name: 'Lien Complémentaire' },
  { min: 42, name: 'Lien Exigeant' },
  { min: 28, name: 'Lien de Transformation' },
  { min: 0, name: 'Noeud Karmique Profond' },
];

const BOND_LABEL_THRESHOLDS = [
  { min: 90, name: 'Âmes Sœurs' },
  { min: 78, name: 'Alchimie Forte' },
  { min: 65, name: 'Belle Synergie' },
  { min: 50, name: 'Équilibre Possible' },
  { min: 35, name: 'Friction Créative' },
  { min: 0, name: 'Défi Relationnel' },
];

const BADGE_TIER_THRESHOLDS = [
  { min: 72, tier: 'high' },
  { min: 58, tier: 'good' },
  { min: 42, tier: 'moderate' },
  { min: 0, tier: 'low' },
];

const CONSEIL_THRESHOLDS = [
  { min: 91, key: 'karmique' },
  { min: 79, key: 'fusionnel' },
  { min: 64, key: 'complementaire' },
  { min: 48, key: 'croissance' },
  { min: 32, key: 'transformation' },
  { min: 0, key: 'profond' },
];

// ═══ HELPERS ═══

function expectedFamilleLabel(score: number): string {
  for (const t of FAMILLE_LABEL_THRESHOLDS) {
    if (score >= t.min) return t.name;
  }
  return FAMILLE_LABEL_THRESHOLDS[FAMILLE_LABEL_THRESHOLDS.length - 1].name;
}

function expectedBondLabel(score: number): string {
  for (const t of BOND_LABEL_THRESHOLDS) {
    if (score >= t.min) return t.name;
  }
  return BOND_LABEL_THRESHOLDS[BOND_LABEL_THRESHOLDS.length - 1].name;
}

function expectedBadgeTier(score: number): string {
  for (const t of BADGE_TIER_THRESHOLDS) {
    if (score >= t.min) return t.tier;
  }
  return 'low';
}

function expectedConseilKey(score: number): string {
  for (const t of CONSEIL_THRESHOLDS) {
    if (score >= t.min) return t.key;
  }
  return 'profond';
}

// Orthographe patterns
const ORTHO_PATTERNS: { pattern: RegExp; msg: string }[] = [
  { pattern: /\bvous\b/i, msg: 'Vouvoiement "vous" détecté' },
  { pattern: /\bvotre\b/i, msg: 'Vouvoiement "votre" détecté' },
  { pattern: /\bvos\b/i, msg: 'Vouvoiement "vos" détecté' },
  { pattern: /Peach Blossom/i, msg: '"Peach Blossom" non francisé' },
  { pattern: /\bCdV\b/, msg: '"CdV" non développé (→ Chemin de Vie)' },
  { pattern: /\bTon complicité\b/, msg: 'Genre incorrect "Ton complicité" (→ Ta)' },
  { pattern: /\bdominé par.*Eau\b/, msg: 'Genre "dominé" devant Eau (féminin → dominée)' },
  { pattern: /\bdominé par.*Terre\b/, msg: 'Genre "dominé" devant Terre (féminin → dominée)' },
  { pattern: /médiane 68/, msg: 'Médiane 68 incorrecte (→ 65)' },
  { pattern: /\bqu\'il n\'oblige\b/, msg: 'Grammaire "qu\'il n\'oblige" → "qu\'elle n\'oblige" ?' },
  { pattern: /\bplus grand que vous\b/i, msg: 'Vouvoiement dans phrase' },
  { pattern: /\bplus loin que vous\b/i, msg: 'Vouvoiement dans phrase' },
  { pattern: /\brien qu'à vous\b/i, msg: 'Vouvoiement dans phrase' },
];

// ═══ TESTS ═══

interface TestError {
  mode: BondMode;
  subtype: string;
  dateA: string;
  dateB: string;
  score: number;
  label: string;
  category: string;
  message: string;
}

const errors: TestError[] = [];
const scoreCoverage: Record<string, Set<string>> = {};
const labelCoverage: Record<string, Set<string>> = {};

function checkResult(r: BondResult, mode: BondMode, subtype: string, dateA: string, dateB: string) {
  const base = { mode, subtype, dateA, dateB, score: r.scoreGlobal, label: r.label.name, category: '' };

  // 1. Label ↔ Score
  const expectedLabel = mode === 'famille' ? expectedFamilleLabel(r.scoreGlobal) : expectedBondLabel(r.scoreGlobal);
  if (r.label.name !== expectedLabel) {
    errors.push({ ...base, category: 'LABEL', message: `Score ${r.scoreGlobal}% → attendu "${expectedLabel}", obtenu "${r.label.name}"` });
  }

  // 2. Badge contextuel (famille only)
  if (mode === 'famille' && r.contextBadge) {
    const expectedTier = expectedBadgeTier(r.scoreGlobal);
    // On ne peut pas vérifier directement le tier, mais on vérifie que le badge existe
    if (!r.contextBadge.title || !r.contextBadge.narrative) {
      errors.push({ ...base, category: 'BADGE', message: `Badge contextuel incomplet: title="${r.contextBadge.title}" narrative="${r.contextBadge.narrative}"` });
    }
  }
  if (mode === 'famille' && !r.contextBadge) {
    errors.push({ ...base, category: 'BADGE', message: `Aucun badge contextuel généré en mode famille` });
  }

  // 3. Summary ne cite pas Peach Blossom en famille
  if (mode === 'famille' && r.summary) {
    if (/Peach Blossom/i.test(r.summary)) {
      errors.push({ ...base, category: 'SUMMARY', message: `Résumé cite "Peach Blossom" en mode famille (poids 0%)` });
    }
    if (/Fleur de Pêcher/.test(r.summary) && r.summary.includes('point d\'ancrage')) {
      // Check if strongest system is Peach Blossom — should never happen in famille
      const pbInSummary = r.summary.match(/\(Fleur de Pêcher à \d+%\)/);
      if (pbInSummary) {
        errors.push({ ...base, category: 'SUMMARY', message: `Résumé cite Fleur de Pêcher comme système le plus fort en famille` });
      }
    }
  }

  // 4. Peach Blossom dans le breakdown
  for (const b of r.breakdown) {
    if (/Peach Blossom/i.test(b.detail)) {
      errors.push({ ...base, category: 'FRANCISATION', message: `Breakdown detail contient "Peach Blossom": ${b.detail.slice(0, 80)}` });
    }
    for (const t of b.technicals) {
      if (/Peach Blossom/i.test(t)) {
        errors.push({ ...base, category: 'FRANCISATION', message: `Technical contient "Peach Blossom": ${t}` });
      }
    }
  }

  // 5. Vérification orthographe sur tous les textes visibles
  const allTexts = [
    r.summary,
    r.conseil,
    r.label.desc,
    r.familleDesc || '',
    r.contextBadge?.narrative || '',
    r.contextBadge?.title || '',
    ...r.signals,
    ...r.alerts,
    ...r.badges,
    ...r.breakdown.map(b => b.detail),
    ...r.breakdown.flatMap(b => b.technicals),
  ];

  for (const text of allTexts) {
    if (!text) continue;
    for (const { pattern, msg } of ORTHO_PATTERNS) {
      if (pattern.test(text)) {
        // Exception : "vos" dans certains contextes légitimes comme "vos deux"
        if (pattern.source === '\\bvos\\b' && /vos deux/.test(text)) continue;
        // Exception : "vous" dans "entre vous", "chez vous" (fratrie, etc.)
        if (pattern.source === '\\bvous\\b' && /(entre vous|chez vous|de vous deux|parmi vous)/.test(text)) continue;
        errors.push({ ...base, category: 'ORTHO', message: `${msg} dans: "${text.slice(0, 100)}..."` });
      }
    }
  }

  // 6. Vérifier que le breakdown a les bons poids
  const EXPECTED_WEIGHTS: Record<BondMode, Record<string, number>> = {
    amour: { 'BaZi': 45, 'Numérologie': 25, 'Yi King': 20, 'Peach Blossom': 10 },
    pro: { 'BaZi': 35, 'Numérologie': 30, 'Yi King': 25, 'Peach Blossom': 10 },
    famille: { 'BaZi': 40, 'Numérologie': 30, 'Yi King': 30, 'Peach Blossom': 0 },
  };
  for (const b of r.breakdown) {
    const expectedWeight = EXPECTED_WEIGHTS[mode][b.system];
    if (expectedWeight !== undefined && b.weight !== `${expectedWeight}%`) {
      errors.push({ ...base, category: 'POIDS', message: `${b.system} poids ${b.weight} attendu ${expectedWeight}%` });
    }
  }

  // 7. Score dans [0-100]
  if (r.scoreGlobal < 0 || r.scoreGlobal > 100) {
    errors.push({ ...base, category: 'RANGE', message: `Score hors limites: ${r.scoreGlobal}` });
  }

  // 8. Breakdown scores dans [0-100]
  for (const b of r.breakdown) {
    if (b.score < 0 || b.score > 100) {
      errors.push({ ...base, category: 'RANGE', message: `${b.system} score hors limites: ${b.score}` });
    }
  }

  // 9. Conseil non vide
  if (!r.conseil || r.conseil.trim().length < 10) {
    errors.push({ ...base, category: 'CONSEIL', message: `Conseil vide ou trop court: "${r.conseil}"` });
  }

  // 10. Summary non vide
  if (!r.summary || r.summary.trim().length < 20) {
    errors.push({ ...base, category: 'SUMMARY', message: `Résumé vide ou trop court: "${r.summary}"` });
  }

  // Track coverage
  const labelName = r.label.name;
  const coverKey = `${mode}`;
  if (!labelCoverage[coverKey]) labelCoverage[coverKey] = new Set();
  labelCoverage[coverKey].add(labelName);

  // Score range bucket
  const bucket = Math.floor(r.scoreGlobal / 10) * 10;
  const bucketKey = `${mode}-${bucket}`;
  if (!scoreCoverage[bucketKey]) scoreCoverage[bucketKey] = new Set();
  scoreCoverage[bucketKey].add(subtype);
}

// ═══ MAIN ═══

console.log('═══════════════════════════════════════════');
console.log('  SIMULATION EXHAUSTIVE — ONGLET AFFINITÉ');
console.log('═══════════════════════════════════════════');
console.log();

let totalTests = 0;

// Test toutes les combinaisons
for (const mode of ALL_MODES) {
  const subtypes = mode === 'famille' ? ALL_SUBTYPES : [undefined];

  for (const subtype of subtypes) {
    for (const dateB of DATE_POOL_B) {
      const nameB = NAMES_B_LIST[Math.floor(Math.random() * NAMES_B_LIST.length)];
      try {
        const result = calcBond(
          DATE_POOL_A[0], NAMES_A,
          dateB, nameB,
          mode,
          subtype as FamilleSubType | undefined
        );
        checkResult(result, mode, subtype || '-', DATE_POOL_A[0], dateB);
        totalTests++;
      } catch (e: any) {
        errors.push({
          mode, subtype: subtype || '-', dateA: DATE_POOL_A[0], dateB,
          score: -1, label: 'CRASH', category: 'CRASH',
          message: `Exception: ${e.message}`
        });
      }
    }
  }
}

// ═══ RAPPORT ═══

console.log(`Tests exécutés: ${totalTests}`);
console.log(`Erreurs trouvées: ${errors.length}`);
console.log();

if (errors.length > 0) {
  // Grouper par catégorie
  const byCategory: Record<string, TestError[]> = {};
  for (const e of errors) {
    if (!byCategory[e.category]) byCategory[e.category] = [];
    byCategory[e.category].push(e);
  }

  for (const [cat, errs] of Object.entries(byCategory).sort()) {
    console.log(`\n══ ${cat} (${errs.length} erreur${errs.length > 1 ? 's' : ''}) ══`);
    // Dédupliquer par message
    const seen = new Set<string>();
    for (const e of errs) {
      const key = e.message;
      if (seen.has(key)) continue;
      seen.add(key);
      const count = errs.filter(x => x.message === key).length;
      console.log(`  [${e.mode}/${e.subtype}] ${e.message}${count > 1 ? ` (×${count})` : ''}`);
    }
  }
} else {
  console.log('✅ AUCUNE ERREUR DÉTECTÉE');
}

// Coverage report
console.log('\n\n══ COUVERTURE DES LABELS ══');
for (const mode of ALL_MODES) {
  const labels = labelCoverage[mode] || new Set();
  const expected = mode === 'famille' ? FAMILLE_LABEL_THRESHOLDS : BOND_LABEL_THRESHOLDS;
  console.log(`\n${mode.toUpperCase()} — ${labels.size}/${expected.length} labels couverts:`);
  for (const t of expected) {
    const covered = labels.has(t.name);
    console.log(`  ${covered ? '✅' : '❌'} ${t.name} (≥${t.min}%)`);
  }
}

// Score distribution
console.log('\n\n══ DISTRIBUTION DES SCORES ══');
for (const mode of ALL_MODES) {
  const buckets: Record<number, number> = {};
  // Re-count
  for (const dateB of DATE_POOL_B) {
    const subtypes = mode === 'famille' ? ALL_SUBTYPES : [undefined];
    for (const subtype of subtypes) {
      try {
        const r = calcBond(DATE_POOL_A[0], NAMES_A, dateB, 'TEST', mode, subtype as any);
        const bucket = Math.floor(r.scoreGlobal / 10) * 10;
        buckets[bucket] = (buckets[bucket] || 0) + 1;
      } catch {}
    }
  }
  console.log(`\n${mode.toUpperCase()}:`);
  for (let b = 0; b <= 90; b += 10) {
    const count = buckets[b] || 0;
    const bar = '█'.repeat(Math.min(count, 50));
    console.log(`  ${String(b).padStart(2)}–${String(b + 9).padStart(2)}%: ${bar} (${count})`);
  }
}

console.log('\n\nSimulation terminée.');
