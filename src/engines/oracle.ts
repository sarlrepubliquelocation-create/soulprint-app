// ═══ ORACLE DES CHOIX ENGINE V4.1 ═══
// Specs Round 8 (Grok + GPT + Gemini)
//
// L'utilisateur teste un nom, une date, une adresse, un numéro ou un sujet.
// V4.1: Score Oracle = dailyScore × 0.25 + domainScore × 0.75 (consensus R7: réduit volatilité quotidienne)
// Hard cap Mercure Rétro : contrats/projets cappés à 71
//
// 5 types : Date | Nom | Adresse | Numéro | Sujet
// 3 verdicts : ✅ Feu Vert (≥75) | ⚠️ Prudence (48-74) | 🛑 Pas maintenant (<48)
// 7 sujets prédéfinis avec textes personnalisés

import { type Reduced, reduce, isMaster } from './numerology';
import { isMercuryRetrograde } from './moon';

// ══════════════════════════════════════
// ═══ TYPES ═══
// ══════════════════════════════════════

export type OracleType = 'date' | 'nom' | 'adresse' | 'numero' | 'sujet' | 'bebe';

export type OracleSujet =
  | 'projet'        // 1. Lancer projet / signer contrat
  | 'sentiments'    // 2. Déclarer sentiments / premier RDV
  | 'partenariat'   // 3. Rencontrer associé / partenariat
  | 'investissement' // 4. Investissement / décision financière
  | 'voyage'        // 5. Voyage / déménagement
  | 'presentation'  // 6. Présentation / prise de parole
  | 'changement';   // 7. Changement de vie majeur

export type OracleVerdict = 'feu_vert' | 'prudence' | 'pas_maintenant';

export interface OracleVerdictInfo {
  verdict: OracleVerdict;
  icon: string;
  label: string;
  color: string;
  texte: string;
}

export interface OracleResult {
  type: OracleType;
  input: string;
  sujet: OracleSujet | null;
  domainScore: number;         // Score intrinsèque de l'input (0-100)
  dailyScore: number;          // Score quotidien SoulPrint
  oracleScore: number;         // Combiné (0-100)
  mercuryCapped: boolean;      // True si Mercure Rétro a cappé le score
  verdict: OracleVerdictInfo;
  breakdown: { label: string; value: string; pts: number }[];
  signals: string[];
  alerts: string[];
}

// ══════════════════════════════════════
// ═══ TABLE PYTHAGORICIENNE ═══
// ══════════════════════════════════════

// A=1, B=2, ..., I=9, J=1, K=2, ..., R=9, S=1, T=2, ..., Z=8
const PYTH_MAP: Record<string, number> = {
  a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9,
  j: 1, k: 2, l: 3, m: 4, n: 5, o: 6, p: 7, q: 8, r: 9,
  s: 1, t: 2, u: 3, v: 4, w: 5, x: 6, y: 7, z: 8,
};

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u', 'y']);

/**
 * Normalise un string : NFD pour accents, lowercase, garde lettres uniquement.
 */
function normalizeStr(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');
}

/**
 * Strip les extensions de domaine avant calcul numérologique.
 * Retourne { cleaned, tldFound } pour afficher un signal si TLD détecté.
 */
const TLD_LIST = ['.com', '.fr', '.app', '.net', '.io', '.org', '.ai', '.co', '.eu', '.be', '.ch', '.uk', '.ca', '.de', '.es', '.it'];
function stripTLD(name: string): { cleaned: string; tldFound: string | null } {
  const lower = name.toLowerCase();
  for (const tld of TLD_LIST) {
    if (lower.endsWith(tld)) {
      return { cleaned: name.slice(0, name.length - tld.length), tldFound: tld };
    }
  }
  return { cleaned: name, tldFound: null };
}

/**
 * Calcule le nombre numérologique d'un string via table Pythagoricienne.
 */
function calcStringNumber(s: string): Reduced {
  const norm = normalizeStr(s);
  const sum = norm.split('').reduce((acc, c) => acc + (PYTH_MAP[c] || 0), 0);
  return reduce(sum);
}

/**
 * Calcule Expression (toutes lettres), Âme (voyelles), Image (consonnes).
 */
function calcNameNumbers(name: string): { expression: Reduced; ame: Reduced; image: Reduced } {
  const norm = normalizeStr(name);
  let vowelSum = 0, consonantSum = 0;
  for (const c of norm) {
    const val = PYTH_MAP[c] || 0;
    if (VOWELS.has(c)) vowelSum += val;
    else consonantSum += val;
  }
  return {
    expression: reduce(vowelSum + consonantSum),
    ame: reduce(vowelSum),
    image: reduce(consonantSum),
  };
}

// ══════════════════════════════════════
// ═══ TRADITION CHINOISE — CHIFFRES ═══
// ══════════════════════════════════════

const CHINESE_DIGIT_BONUS: Record<number, { pts: number; label: string }> = {
  8: { pts: 8,  label: '八 Fortune — prospérité' },
  6: { pts: 4,  label: '六 Fluidité — tout coule' },
  9: { pts: 2,  label: '九 Longévité — durabilité' },
  2: { pts: 1,  label: '二 Paire — harmonie' },
  4: { pts: -6, label: '四 Mort/Blocage — à éviter' },
  7: { pts: -2, label: '七 Conflit — tension' },
};

// ══════════════════════════════════════
// ═══ NOMBRES BUSINESS ═══
// ══════════════════════════════════════

const BUSINESS_NUMBERS: Record<number, { pts: number; label: string }> = {
  1:  { pts: 7,  label: 'Leadership — pionnier, startup' },
  3:  { pts: 8,  label: 'Communication — marque, app, média' },
  5:  { pts: 5,  label: 'Liberté — innovation, disruption' },
  8:  { pts: 9,  label: 'Fortune — finance, entreprise, pouvoir' },
  9:  { pts: 6,  label: 'Vision — humanitaire, impact global' },
  11: { pts: 8,  label: 'Maître Intuitif — technologie, spiritualité' },
  22: { pts: 10, label: 'Maître Bâtisseur — impact mondial, infrastructure' },
  33: { pts: 7,  label: 'Maître Guérisseur — santé, bien-être, éducation' },
  2:  { pts: 3,  label: 'Diplomatie — partenariat, médiation' },
  4:  { pts: 2,  label: 'Structure — méthode, processus (neutre-bas)' },
  6:  { pts: 4,  label: 'Harmonie — foyer, service, communauté' },
  7:  { pts: 1,  label: 'Introspection — trop intérieur pour le business' },
};

// ══════════════════════════════════════
// ═══ MATRICE 9×9 COMPATIBILITÉ NOM/CdV ═══
// ══════════════════════════════════════

// Score 0-10 : compatibilité entre le nombre du nom et le CdV du créateur
const NAME_CDV_COMPAT: Record<string, number> = {
  '1-1': 8, '1-2': 5, '1-3': 9, '1-4': 4, '1-5': 8, '1-6': 5, '1-7': 6, '1-8': 7, '1-9': 7,
  '2-2': 6, '2-3': 7, '2-4': 7, '2-5': 4, '2-6': 9, '2-7': 5, '2-8': 5, '2-9': 6,
  '3-3': 7, '3-4': 3, '3-5': 8, '3-6': 8, '3-7': 5, '3-8': 6, '3-9': 9,
  '4-4': 6, '4-5': 4, '4-6': 7, '4-7': 6, '4-8': 9, '4-9': 4,
  '5-5': 7, '5-6': 5, '5-7': 7, '5-8': 6, '5-9': 8,
  '6-6': 7, '6-7': 4, '6-8': 5, '6-9': 8,
  '7-7': 8, '7-8': 4, '7-9': 5,
  '8-8': 7, '8-9': 7,
  '9-9': 7,
};

function getNameCdvCompat(nameNum: number, cdv: number): number {
  const a = Math.min(nameNum, cdv);
  const b = Math.max(nameNum, cdv);
  return NAME_CDV_COMPAT[`${a}-${b}`] ?? 5;
}

// ══════════════════════════════════════
// ═══ PATTERNS NUMÉRIQUES ═══
// ══════════════════════════════════════

interface NumberPatterns {
  repeats: number;      // Chiffres répétés (88, 666...)
  sequences: number;    // Suites (123, 456...)
  mirrors: number;      // Miroirs (1221, 3443...)
  chineseBonus: number; // Tradition chinoise
  reduction: Reduced;   // Réduction finale
  details: string[];
}

function analyzeNumber(numStr: string): NumberPatterns {
  const digits = numStr.replace(/[^0-9]/g, '');
  const details: string[] = [];
  let repeats = 0, sequences = 0, mirrors = 0, chineseBonus = 0;

  // ── Répétitions ──
  const repeatMatch = digits.match(/(.)\1{1,}/g);
  if (repeatMatch) {
    repeats = repeatMatch.reduce((acc, m) => acc + (m.length - 1) * 2, 0);
    repeatMatch.forEach(m => {
      if (m.length >= 3) details.push(`${m} — triple+ répétition (${m[0] === '8' ? 'très favorable' : m[0] === '4' ? 'attention' : 'neutre'})`);
    });
  }

  // ── Suites ──
  for (let i = 0; i < digits.length - 2; i++) {
    const a = parseInt(digits[i]), b = parseInt(digits[i + 1]), c = parseInt(digits[i + 2]);
    if (b === a + 1 && c === b + 1) { sequences += 3; details.push(`${digits.substring(i, i + 3)} — suite ascendante (croissance)`); }
    if (b === a - 1 && c === b - 1) { sequences += 2; details.push(`${digits.substring(i, i + 3)} — suite descendante (attention)`); }
  }

  // ── Miroirs ──
  if (digits.length >= 4) {
    const half = Math.floor(digits.length / 2);
    const first = digits.substring(0, half);
    const second = digits.substring(digits.length - half).split('').reverse().join('');
    if (first === second) { mirrors = 5; details.push(`Nombre miroir — symétrie parfaite`); }
  }

  // ── Tradition chinoise ──
  const digitCounts: Record<number, number> = {};
  for (const d of digits) {
    const n = parseInt(d);
    digitCounts[n] = (digitCounts[n] || 0) + 1;
  }
  for (const [digit, count] of Object.entries(digitCounts)) {
    const d = parseInt(digit);
    const info = CHINESE_DIGIT_BONUS[d];
    if (info) {
      const bonus = info.pts * count;
      chineseBonus += bonus;
      if (Math.abs(bonus) >= 4) details.push(`${info.label} (×${count})`);
    }
  }

  // ── Réduction finale ──
  const sum = digits.split('').reduce((acc, d) => acc + parseInt(d), 0);
  const reduction = reduce(sum);

  return { repeats, sequences, mirrors, chineseBonus, reduction, details };
}

// ══════════════════════════════════════
// ═══ SUJETS — MAPPING DOMAINES ═══
// ══════════════════════════════════════

export interface SujetInfo {
  label: string;
  icon: string;
  mercurySensitive: boolean; // Hard cap si Mercure Rétro
  dominantDomain: string;    // Domaine prioritaire dans le score quotidien
}

export const SUJETS: Record<OracleSujet, SujetInfo> = {
  projet:         { label: 'Lancer projet / signer contrat', icon: '🚀', mercurySensitive: true,  dominantDomain: 'BUSINESS' },
  sentiments:     { label: 'Déclarer sentiments / premier RDV', icon: '💕', mercurySensitive: false, dominantDomain: 'AMOUR' },
  partenariat:    { label: 'Rencontrer associé / partenariat', icon: '🤝', mercurySensitive: true,  dominantDomain: 'RELATIONS' },
  investissement: { label: 'Investissement / décision financière', icon: '💰', mercurySensitive: true,  dominantDomain: 'BUSINESS' },
  voyage:         { label: 'Voyage / déménagement', icon: '✈️', mercurySensitive: false, dominantDomain: 'VITALITE' },
  presentation:   { label: 'Présentation / prise de parole', icon: '🎤', mercurySensitive: false, dominantDomain: 'CREATIVITE' },
  changement:     { label: 'Changement de vie majeur', icon: '🔄', mercurySensitive: true,  dominantDomain: 'INTROSPECTION' },
};

// ══════════════════════════════════════
// ═══ TEXTES VERDICTS (3 × 7 = 21) ═══
// ══════════════════════════════════════

const VERDICT_TEXTES: Record<OracleSujet, Record<OracleVerdict, string>> = {
  projet: {
    feu_vert: "Les cycles de création sont ouverts. Foncez — le timing est aligné avec votre énergie de fondation.",
    prudence: "Le potentiel est là, mais un détail structurel freine. Révisez vos fondations avant d'appuyer sur le bouton.",
    pas_maintenant: "Mauvais timing cosmique. Le lancement risque de s'épuiser rapidement — attendez une meilleure fenêtre.",
  },
  sentiments: {
    feu_vert: "Vénus et votre numérologie vous soutiennent. Parlez — les mots toucheront juste.",
    prudence: "L'énergie est ambiguë. Testez les eaux avant de tout révéler — une approche subtile sera plus efficace.",
    pas_maintenant: "Risque élevé de mauvaise interprétation aujourd'hui. Gardez le silence et attendez un jour plus réceptif.",
  },
  partenariat: {
    feu_vert: "Les énergies relationnelles sont au sommet. Rencontrez, négociez, engagez-vous — la synergie est naturelle.",
    prudence: "Le terrain est correct mais pas optimal. Prenez le temps de vérifier la compatibilité profonde avant de signer.",
    pas_maintenant: "Les systèmes détectent des frictions cachées. Reportez cette rencontre — votre instinct sera plus clair demain.",
  },
  investissement: {
    feu_vert: "Les cycles financiers sont favorables. Votre discernement est à son pic — faites confiance à votre analyse.",
    prudence: "Le moment n'est ni bon ni mauvais. Attendez un signal supplémentaire avant d'engager des sommes importantes.",
    pas_maintenant: "Risque de perte accru. Les cycles ne soutiennent pas les décisions financières majeures aujourd'hui.",
  },
  voyage: {
    feu_vert: "Les vents sont porteurs. Ce déplacement apportera plus que prévu — restez ouvert aux rencontres.",
    prudence: "Le voyage est possible mais exigera plus d'énergie que prévu. Préparez-vous aux imprévus logistiques.",
    pas_maintenant: "L'énergie invite au repos, pas au mouvement. Si c'est reportable, votre corps vous remerciera.",
  },
  presentation: {
    feu_vert: "Votre charisme est amplifié. Montez sur scène — chaque mot portera avec une force inhabituelle.",
    prudence: "Vous serez correct mais pas exceptionnel. Préparez davantage pour compenser l'énergie moyenne.",
    pas_maintenant: "Risque de trous de mémoire ou de perte de fil. Déléguer ou reporter serait plus sage.",
  },
  changement: {
    feu_vert: "Les grands cycles soutiennent votre mutation. C'est un portail — traversez-le avec conviction.",
    prudence: "Le changement est possible mais le timing n'est pas parfait. Posez les bases sans tout bousculer d'un coup.",
    pas_maintenant: "Les systèmes détectent une résistance profonde. Ce n'est pas le moment de tout renverser — consolidez d'abord.",
  },
};

// ══════════════════════════════════════
// ═══ VERDICT ═══
// ══════════════════════════════════════

function getVerdict(score: number, sujet: OracleSujet | null): OracleVerdictInfo {
  let verdict: OracleVerdict;
  if (score >= 75) verdict = 'feu_vert';
  else if (score >= 48) verdict = 'prudence';
  else verdict = 'pas_maintenant';

  const icons: Record<OracleVerdict, string> = { feu_vert: '✅', prudence: '⚠️', pas_maintenant: '🛑' };
  const labels: Record<OracleVerdict, string> = { feu_vert: 'Feu Vert', prudence: 'Prudence', pas_maintenant: 'Pas maintenant' };
  const colors: Record<OracleVerdict, string> = { feu_vert: '#4ade80', prudence: '#f59e0b', pas_maintenant: '#ef4444' };

  let texte: string;
  if (sujet && VERDICT_TEXTES[sujet]) {
    texte = VERDICT_TEXTES[sujet][verdict];
  } else {
    const generic: Record<OracleVerdict, string> = {
      feu_vert: "Les cycles sont alignés en votre faveur. Avancez avec confiance.",
      prudence: "L'énergie est mitigée. Procédez avec attention et vérifiez les détails.",
      pas_maintenant: "Les systèmes recommandent d'attendre. Ce n'est pas le bon moment.",
    };
    texte = generic[verdict];
  }

  return { verdict, icon: icons[verdict], label: labels[verdict], color: colors[verdict], texte };
}

// ══════════════════════════════════════
// ═══ CALCULS PAR TYPE ═══
// ══════════════════════════════════════

/**
 * A) Date précise — score SoulPrint du jour cible + alignement profil.
 * Le dailyScore EST le domainScore pour ce type.
 */
function calcOracleDate(targetDate: string, dailyScore: number, userCdv: number): { domainScore: number; breakdown: { label: string; value: string; pts: number }[]; signals: string[]; alerts: string[] } {
  const signals: string[] = [];
  const alerts: string[] = [];
  const breakdown: { label: string; value: string; pts: number }[] = [];

  // Le score du jour cible est directement le domainScore
  const domainScore = dailyScore;
  breakdown.push({ label: 'Score du jour cible', value: `${dailyScore}/100`, pts: dailyScore });

  if (dailyScore >= 80) signals.push('Journée à fort potentiel pour cette action');
  else if (dailyScore < 40) alerts.push('Journée sous tension — considérez une alternative');

  return { domainScore, breakdown, signals, alerts };
}

/**
 * B) Nom (entreprise/produit/marque) — table Pythagoricienne.
 */
function calcOracleNom(name: string, userCdv: number): { domainScore: number; breakdown: { label: string; value: string; pts: number }[]; signals: string[]; alerts: string[] } {
  const signals: string[] = [];
  const alerts: string[] = [];
  const breakdown: { label: string; value: string; pts: number }[] = [];

  // Strip TLD avant calcul (.com, .fr, etc.)
  const { cleaned: cleanedName, tldFound } = stripTLD(name);
  if (tldFound) signals.push(`Extension "${tldFound}" ignorée — calcul sur "${cleanedName}" uniquement`);

  const nums = calcNameNumbers(cleanedName);
  const exprV = nums.expression.v;
  const ameV = nums.ame.v;
  const imageV = nums.image.v;

  breakdown.push({ label: 'Expression (toutes lettres)', value: `${exprV}${nums.expression.m ? ' Maître' : ''}`, pts: 0 });
  breakdown.push({ label: 'Âme (voyelles)', value: `${ameV}${nums.ame.m ? ' Maître' : ''}`, pts: 0 });
  breakdown.push({ label: 'Image (consonnes)', value: `${imageV}${nums.image.m ? ' Maître' : ''}`, pts: 0 });

  // Score business du nombre Expression
  const bizInfo = BUSINESS_NUMBERS[exprV] || { pts: 3, label: 'Neutre' };
  const bizPts = bizInfo.pts * 5; // Scale 0-50
  breakdown.push({ label: 'Nombre Business', value: bizInfo.label, pts: bizPts });

  if (bizInfo.pts >= 8) signals.push(`Le ${exprV} est un nombre de puissance business — ${bizInfo.label}`);
  if (bizInfo.pts <= 2) alerts.push(`Le ${exprV} est peu porteur en business — ${bizInfo.label}`);

  // Compatibilité avec le CdV du créateur
  const compatScore = getNameCdvCompat(exprV > 9 ? reduce(exprV).v : exprV, userCdv > 9 ? reduce(userCdv).v : userCdv);
  const compatPts = compatScore * 5; // Scale 0-50
  breakdown.push({ label: `Compatibilité CdV ${userCdv}`, value: `${compatScore}/10`, pts: compatPts });

  if (compatScore >= 8) signals.push(`Excellente résonance entre "${name}" et votre Chemin de Vie ${userCdv}`);
  else if (compatScore <= 3) alerts.push(`Friction entre "${name}" et votre CdV ${userCdv} — l'énergie sera en tension`);

  // Bonus maître
  let masterBonus = 0;
  if (nums.expression.m) { masterBonus += 5; signals.push(`Nombre Maître ${exprV} — puissance spirituelle dans le nom`); }

  const domainScore = Math.max(0, Math.min(100, bizPts + compatPts + masterBonus));
  return { domainScore, breakdown, signals, alerts };
}

/**
 * C) Adresse — numéro de rue 75% + nom de rue 25%.
 */
function calcOracleAdresse(adresse: string, userCdv: number): { domainScore: number; breakdown: { label: string; value: string; pts: number }[]; signals: string[]; alerts: string[] } {
  const signals: string[] = [];
  const alerts: string[] = [];
  const breakdown: { label: string; value: string; pts: number }[] = [];

  // Extraire numéro et nom de rue
  const match = adresse.match(/^(\d+[a-z]?)\s*,?\s*(.+)/i);
  let numero = '';
  let rue = adresse;
  if (match) {
    numero = match[1];
    rue = match[2];
  }

  // Numéro de rue (75%)
  let numScore = 50;
  if (numero) {
    const digits = numero.replace(/[^0-9]/g, '');
    const numReduced = reduce(digits.split('').reduce((s, d) => s + parseInt(d), 0));
    const bizInfo = BUSINESS_NUMBERS[numReduced.v] || { pts: 5, label: 'Neutre' };
    numScore = Math.min(100, bizInfo.pts * 10);
    breakdown.push({ label: `N° ${numero} → ${numReduced.v}`, value: bizInfo.label, pts: Math.round(numScore * 0.75) });

    if (bizInfo.pts >= 8) signals.push(`N° ${numero} réduit à ${numReduced.v} — ${bizInfo.label}`);
    if (bizInfo.pts <= 2) alerts.push(`N° ${numero} réduit à ${numReduced.v} — ${bizInfo.label}`);
  }

  // Nom de rue (25%)
  const rueNum = calcStringNumber(rue);
  const rueBiz = BUSINESS_NUMBERS[rueNum.v] || { pts: 5, label: 'Neutre' };
  const rueScore = Math.min(100, rueBiz.pts * 10);
  breakdown.push({ label: `"${rue}" → ${rueNum.v}`, value: rueBiz.label, pts: Math.round(rueScore * 0.25) });

  const domainScore = Math.max(0, Math.min(100, Math.round(numScore * 0.75 + rueScore * 0.25)));
  return { domainScore, breakdown, signals, alerts };
}

/**
 * D) Numéro (téléphone/SIRET) — réduction + patterns + tradition chinoise.
 */
function calcOracleNumero(numStr: string): { domainScore: number; breakdown: { label: string; value: string; pts: number }[]; signals: string[]; alerts: string[] } {
  const signals: string[] = [];
  const alerts: string[] = [];
  const breakdown: { label: string; value: string; pts: number }[] = [];

  const analysis = analyzeNumber(numStr);

  // Réduction numérologique (base 30%)
  const redV = analysis.reduction.v;
  const bizInfo = BUSINESS_NUMBERS[redV] || { pts: 5, label: 'Neutre' };
  const redScore = bizInfo.pts * 10;
  breakdown.push({ label: `Réduction → ${redV}`, value: bizInfo.label, pts: redScore });

  if (isMaster(redV)) signals.push(`Nombre Maître ${redV} — vibration puissante`);

  // Patterns (30%)
  const patternScore = Math.min(30, analysis.repeats + analysis.sequences + analysis.mirrors);
  if (patternScore > 0) {
    breakdown.push({ label: 'Patterns', value: `+${patternScore}`, pts: patternScore });
    analysis.details.forEach(d => signals.push(d));
  }

  // Tradition chinoise (40%)
  const chineseNorm = Math.max(-30, Math.min(40, analysis.chineseBonus * 2));
  if (chineseNorm !== 0) {
    breakdown.push({ label: 'Tradition chinoise', value: `${chineseNorm > 0 ? '+' : ''}${chineseNorm}`, pts: chineseNorm });
    analysis.details.filter(d => d.includes('八') || d.includes('四') || d.includes('六') || d.includes('九') || d.includes('七')).forEach(d => {
      if (d.includes('Fortune') || d.includes('Fluidité') || d.includes('Longévité')) signals.push(d);
      else alerts.push(d);
    });
  }

  // Combiner (scale 0-100)
  const raw = 50 + redScore * 0.3 + patternScore + chineseNorm;
  const domainScore = Math.max(0, Math.min(100, Math.round(raw)));

  return { domainScore, breakdown, signals, alerts };
}

/**
 * E) Sujet — le domainScore vient directement du score quotidien dans le domaine pertinent.
 * Le caller doit fournir le score du domaine correspondant.
 */
function calcOracleSujet(sujet: OracleSujet, domainScoreFromConvergence: number): { domainScore: number; breakdown: { label: string; value: string; pts: number }[]; signals: string[]; alerts: string[] } {
  const signals: string[] = [];
  const alerts: string[] = [];
  const breakdown: { label: string; value: string; pts: number }[] = [];

  const info = SUJETS[sujet];
  breakdown.push({ label: info.label, value: `Domaine ${info.dominantDomain}`, pts: domainScoreFromConvergence });

  if (domainScoreFromConvergence >= 75) signals.push(`${info.icon} ${info.label} — domaine ${info.dominantDomain} en zone haute`);
  else if (domainScoreFromConvergence < 40) alerts.push(`${info.icon} ${info.label} — domaine ${info.dominantDomain} sous tension`);

  return { domainScore: domainScoreFromConvergence, breakdown, signals, alerts };
}

// ══════════════════════════════════════

// ══════════════════════════════════════
// ═══ E) PRÉNOM BÉBÉ ═══
// ══════════════════════════════════════

// Table harmonie de vie — différente de BUSINESS_NUMBERS
// Axée sur l'épanouissement, le caractère, la résonance familiale
// V4.4b — harmonies auditées par Grok (tradition pythagoricienne pour enfant)
const BABY_NUMBERS: Record<number, { harmony: number; label: string; traits: string }> = {
  1:  { harmony: 6, label: 'Indépendance',    traits: `Confiance en soi, leadership naturel — peut créer de l'isolement si mal accompagné` },
  2:  { harmony: 9, label: 'Harmonie',         traits: `Sensibilité, empathie, coopération — un des plus épanouissants pour un enfant` },
  3:  { harmony: 9, label: 'Expression',       traits: `Créativité, joie de vivre, communication naturelle — très épanouissant` },
  4:  { harmony: 7, label: 'Stabilité',        traits: `Méthode, persévérance, structure rassurante — peut être anxiogène sans accompagnement` },
  5:  { harmony: 8, label: 'Liberté',          traits: `Curiosité, adaptabilité, soif de découverte — très bon pour un enfant` },
  6:  { harmony: 9, label: 'Amour',            traits: `Sens de la famille, générosité, attachement profond — le plus harmonieux pour un enfant` },
  7:  { harmony: 6, label: 'Sagesse',          traits: `Intuition, intériorité, don pour la réflexion — risque de retrait émotionnel` },
  8:  { harmony: 5, label: 'Puissance',        traits: `Volonté forte, leçons de karma précoces — le plus lourd à porter pour un enfant` },
  9:  { harmony: 8, label: 'Idéalisme',        traits: `Compassion, générosité, vision universelle — très beau pour un enfant` },
  11: { harmony: 8, label: 'Intuition Maître', traits: `Sensibilité extrême, don artistique — attention aux surcharges émotionnelles` },
  22: { harmony: 7, label: 'Bâtisseur Maître', traits: `Potentiel immense, mais charge lourde — peut être écrasant pour un jeune enfant` },
  33: { harmony: 9, label: 'Guérisseur Maître', traits: `Amour universel, vocation de service — le plus élevé, idéal pour un enfant` },
};

// V4.4b — Matrice CdV parent × Nombre bébé (auditée par Grok, inclut Maîtres 11/22/33)
// Index: BABY_COMPAT[parentCdv][babyNum]
const BABY_COMPAT: Record<number, Record<number, number>> = {
  1:  {1:6, 2:8, 3:9, 4:6, 5:8, 6:7, 7:5, 8:6, 9:8, 11:7, 22:6, 33:8},
  2:  {1:8, 2:8, 3:8, 4:7, 5:6, 6:9, 7:7, 8:6, 9:8, 11:8, 22:7, 33:9},
  3:  {1:9, 2:8, 3:8, 4:5, 5:9, 6:8, 7:6, 8:7, 9:9, 11:8, 22:7, 33:9},
  4:  {1:6, 2:7, 3:5, 4:7, 5:5, 6:8, 7:7, 8:9, 9:5, 11:6, 22:8, 33:6},
  5:  {1:8, 2:6, 3:9, 4:5, 5:7, 6:6, 7:8, 8:6, 9:8, 11:7, 22:6, 33:7},
  6:  {1:7, 2:9, 3:8, 4:8, 5:6, 6:9, 7:5, 8:6, 9:9, 11:8, 22:7, 33:9},
  7:  {1:5, 2:7, 3:6, 4:7, 5:8, 6:5, 7:8, 8:5, 9:6, 11:9, 22:7, 33:8},
  8:  {1:6, 2:6, 3:7, 4:9, 5:6, 6:6, 7:5, 8:5, 9:7, 11:6, 22:9, 33:6},
  9:  {1:8, 2:8, 3:9, 4:5, 5:8, 6:9, 7:6, 8:7, 9:8, 11:8, 22:7, 33:9},
  11: {1:7, 2:8, 3:8, 4:6, 5:7, 6:8, 7:9, 8:6, 9:8, 11:8, 22:7, 33:9},
  22: {1:6, 2:7, 3:7, 4:8, 5:6, 6:7, 7:7, 8:9, 9:7, 11:7, 22:8, 33:7},
  33: {1:8, 2:9, 3:9, 4:6, 5:7, 6:9, 7:8, 8:6, 9:9, 11:9, 22:7, 33:9},
};

function getBabyParentCompat(babyNum: number, parentCdv: number): number {
  const row = BABY_COMPAT[parentCdv] ?? BABY_COMPAT[9];
  return row[babyNum] ?? 6;
}

/**
 * E) Prénom bébé — harmonie de vie + résonance parentale.
 * Pas de dimension business. Pas de hard cap Mercure.
 */
function calcOracleBebe(prenom: string, userCdv: number): { domainScore: number; breakdown: { label: string; value: string; pts: number }[]; signals: string[]; alerts: string[] } {
  const signals: string[] = [];
  const alerts: string[] = [];
  const breakdown: { label: string; value: string; pts: number }[] = [];

  const nums = calcNameNumbers(prenom);
  const exprV = nums.expression.v;
  const ameV = nums.ame.v;
  const imageV = nums.image.v;

  // Nombre de vie (Expression = toutes lettres)
  const babyInfo = BABY_NUMBERS[exprV] || { harmony: 6, label: 'Neutre', traits: `Énergie équilibrée` };
  const harmonyPts = babyInfo.harmony * 10; // Scale 0-90 (audit consensus V4.5)
  breakdown.push({ label: `Nombre de vie : ${exprV}`, value: babyInfo.label, pts: harmonyPts });
  breakdown.push({ label: 'Âme (voyelles)', value: `${ameV}${nums.ame.m ? ' Maître' : ''} — vie intérieure`, pts: 0 });
  breakdown.push({ label: 'Image (consonnes)', value: `${imageV}${nums.image.m ? ' Maître' : ''} — personnalité extérieure`, pts: 0 });

  // Traits de caractère
  signals.push(`${babyInfo.traits}`);

  // Harmonie avec CdV parent
  const parentCdvSimple = userCdv > 9 ? reduce(userCdv).v : userCdv;
  const exprSimple = exprV > 9 ? reduce(exprV).v : exprV;
  const compatScore = getBabyParentCompat(exprSimple, parentCdvSimple);
  const compatPts = compatScore * 3; // Scale 0-30 — réduit de ×5 à ×3 (audit Grok/GPT/Gemini V4.5)
  breakdown.push({ label: `Résonance avec CdV ${userCdv} (parent)`, value: `${compatScore}/10`, pts: compatPts });

  if (compatScore >= 8) signals.push(`Très bonne résonance entre "${prenom}" et votre énergie parentale — lien naturel et fluide`);
  else if (compatScore <= 4) alerts.push(`Légère friction avec votre CdV ${userCdv} — l'enfant suivra son propre chemin avec force`);

  // Bonus nombre Maître
  let masterBonus = 0;
  if (nums.expression.m) {
    masterBonus = 8;
    signals.push(`Nombre Maître ${exprV} — destin exceptionnel, sensibilité et charge élevées`);
  }

  // Âme = 2 ou 6 → bonus affectif (enfant très attaché à la famille)
  if (ameV === 2 || ameV === 6) {
    signals.push(`Âme ${ameV} — enfant profondément attaché, besoin de sécurité affective fort`);
  }
  // Image = 1 ou 8 → enfant qui s'affirme tôt
  if (imageV === 1 || imageV === 8) {
    signals.push(`Image ${imageV} — caractère affirmé, besoin d'autonomie précoce`);
  }

  // Normalisation /120 — max théorique 90+30+8=128, /120 → cap naturel ~100 (audit V4.5)
  const rawBebeScore = harmonyPts + compatPts + masterBonus;
  const domainScore = Math.max(0, Math.min(100, Math.round(rawBebeScore / 120 * 100)));
  return { domainScore, breakdown, signals, alerts };
}

// ═══ MAIN — calcOracle() ═══
// ══════════════════════════════════════

export interface CalcOracleParams {
  type: OracleType;
  input: string;                      // Le texte/nombre/adresse à tester
  sujet?: OracleSujet;                // Pour type 'sujet' ou pour le hard cap Mercure
  dailyScore: number;                 // Score quotidien SoulPrint (0-100)
  userCdv?: number;                   // Chemin de Vie de l'utilisateur (pour noms)
  domainScoreFromConvergence?: number; // Score du domaine pertinent (pour type 'sujet')
  targetDate?: string;                // Pour type 'date' (YYYY-MM-DD)
}

export function calcOracle(params: CalcOracleParams): OracleResult {
  const { type, input, sujet = null, dailyScore, userCdv = 5, domainScoreFromConvergence = 50, targetDate } = params;

  let result: { domainScore: number; breakdown: { label: string; value: string; pts: number }[]; signals: string[]; alerts: string[] };

  switch (type) {
    case 'date':
      result = calcOracleDate(targetDate || input, dailyScore, userCdv);
      break;
    case 'nom':
      result = calcOracleNom(input, userCdv);
      break;
    case 'adresse':
      result = calcOracleAdresse(input, userCdv);
      break;
    case 'numero':
      result = calcOracleNumero(input);
      break;
    case 'sujet':
      result = calcOracleSujet(sujet || 'projet', domainScoreFromConvergence);
      break;
    case 'bebe':
      result = calcOracleBebe(input, userCdv);
      break;
    default:
      result = { domainScore: 50, breakdown: [], signals: [], alerts: [] };
  }

  // ── Score Oracle : bébé = 100% intrinsèque (prénom permanent, daily non pertinent — consensus Gemini/Grok/GPT V4.5)
  //                 autres types = dailyScore × 0.25 + domainScore × 0.75 (V4.1) ──
  let oracleScore = type === 'bebe'
    ? result.domainScore
    : Math.round(dailyScore * 0.25 + result.domainScore * 0.75);

  // ── Hard cap Mercure Rétro ──
  let mercuryCapped = false;
  const now = new Date();
  const mercRetro = isMercuryRetrograde(now);
  const effectiveSujet = (type === 'bebe') ? null : (sujet || (type === 'nom' ? 'projet' : null));
  if (mercRetro && effectiveSujet) {
    const sujetInfo = SUJETS[effectiveSujet as OracleSujet];
    if (sujetInfo?.mercurySensitive && oracleScore > 71) {
      oracleScore = 71;
      mercuryCapped = true;
      result.alerts.push('☿ Mercure Rétrograde — score cappé à 71 (contrats/projets sensibles)');
    }
  }

  oracleScore = Math.max(0, Math.min(100, oracleScore));

  // ── Verdict ──
  // Seuils spécifiques bébé : ≥82 harmonieux, ≥60 équilibré, <60 tension (audit consensus V4.5)
  let verdict = type === 'bebe'
    ? getVerdict(oracleScore >= 82 ? 80 : oracleScore >= 60 ? 60 : 30, null)
    : getVerdict(oracleScore, effectiveSujet as OracleSujet | null);

  // Verdicts spécifiques bébé — remplace les verdicts génériques
  if (type === 'bebe') {
    const BABY_VERDICT_MAP: Record<OracleVerdict, Omit<OracleVerdictInfo, 'verdict'>> = {
      feu_vert:       { icon: '🌟', label: 'Prénom harmonieux', color: '#4ade80', texte: `Ce prénom résonne avec fluidité avec votre énergie parentale. L'enfant portera ce nom avec aisance naturelle.` },
      prudence:       { icon: '✨', label: 'Prénom équilibré',  color: '#f59e0b', texte: `Ce prénom apporte une énergie neutre et solide. Bon choix si vous l'aimez — le cœur prime toujours.` },
      pas_maintenant: { icon: '⚡', label: 'Prénom en tension', color: '#a78bfa', texte: `Ce prénom crée une légère friction énergétique. L'enfant construira sa propre voie avec détermination.` },
    };
    verdict = { verdict: verdict.verdict, ...BABY_VERDICT_MAP[verdict.verdict] };
  }

  return {
    type, input,
    sujet: effectiveSujet as OracleSujet | null,
    domainScore: result.domainScore,
    dailyScore, oracleScore,
    mercuryCapped,
    verdict,
    breakdown: result.breakdown,
    signals: result.signals,
    alerts: result.alerts,
  };
}
