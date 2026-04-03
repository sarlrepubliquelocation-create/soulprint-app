// ═══ COMPATIBILITY ENGINE V4.1 — BONDS ═══
// Specs Round 8 (Grok + GPT + Gemini)
//
// 2 dates de naissance → Score global 0-100 + détail par système
// 2 modes : Amour (BaZi 40%, Numérologie 30%, I Ching 20%, PB 10%)
//           Pro   (Numérologie 35%, BaZi 30%, I Ching 25%, PB 10%)
//
// V4.1: Gaussian CDF normalization (consensus Gemini+Grok R7)
//   Remplace linéaire → S-curve, médiane ≈65 pour couples typiques
//   Corrige: 70% des couples n'apparaissent plus "incompatibles"
//
// 6 labels : Âmes Sœurs (≥90) → Défi Relationnel (<35)
// Edge case : même date de naissance → cap 78 max
//
// Bond Quotidien : score du jour pour le couple (derrière paywall)

import { calcLifePath, calcExpression, calcSoul, isMaster } from './numerology';
import { calcNatalIChing, type IChingReading, TRIGRAM_NAMES, HEX_NAMES } from './iching';
import { calcBaZiCompat, type BaZiCompatResult, getPeachBlossom, calcDayMaster, LIU_HE_PAIRS, CLASHES } from './bazi';

// ══════════════════════════════════════
// ═══ GAUSSIAN CDF NORMALIZATION V4.1 ═══
// ══════════════════════════════════════

/**
 * Approximation de la CDF normale (Abramowitz & Stegun).
 * Précision ~1.5×10⁻⁷.
 */
// normalCDF corrigée — A&S 7.1.26 via erf approximation (Gemini audit V4.5)
// Ancienne version utilisait exp(-x²/2) au lieu de exp(-x²) → gonflement de +3pts
function normalCDF(z: number): number {
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1.0 / (1.0 + 0.3275911 * x);
  const erf = 1.0 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * erf);
}

/**
 * V4.1: Transforme le score Bond linéaire en S-curve via CDF gaussienne.
 * Paramètres: mean=45, σ=18 — calibrés pour médiane ≈65.
 * Corrige le problème V4.0 où 70% des couples apparaissaient "incompatibles".
 *
 * Distribution résultante:
 *   brut ≈ 20 → ~38 (tensions réelles)
 *   brut ≈ 45 → ~65 (couple typique = "Compatible")
 *   brut ≈ 60 → ~85 (très bon couple)
 *   brut ≈ 75 → ~94 (âmes sœurs)
 */
function bondGaussianCDF(rawScore: number): number {
  const z = (rawScore - 45) / 18;
  const phi = normalCDF(z);
  return Math.max(5, Math.min(98, Math.round(5 + 93 * (0.3 + 0.7 * phi))));
}

// Variante Famille — μ=48, σ=20 (Ronde 14 unanime 3/3 GPT+Grok+Gemini)
// Ancien μ=58/σ=16 écrasait les scores bas (Père Clash à 36% — irréaliste)
// Nouveau : Père ~46%, Carmen ~72%, distribution plus juste
function bondGaussianCDFFamille(rawScore: number): number {
  const z = (rawScore - 48) / 20;
  const phi = normalCDF(z);
  return Math.max(5, Math.min(98, Math.round(5 + 93 * (0.3 + 0.7 * phi))));
}

// Variante Pro — μ=50, σ=16 (Ronde 13 — consensus 3/3 GPT+Grok+Gemini)
// Médiane finale ≈65% (identique Amour/Famille : 5+93×0.65), σ plus serré que Amour
function bondGaussianCDFPro(rawScore: number): number {
  const z = (rawScore - 50) / 16;
  const phi = normalCDF(z);
  return Math.max(5, Math.min(98, Math.round(5 + 93 * (0.3 + 0.7 * phi))));
}

// ══════════════════════════════════════
// ═══ TYPES ═══
// ══════════════════════════════════════

export type BondMode = 'amour' | 'pro' | 'famille';
// Fratrie: frère-frère, sœur-sœur, frère-sœur
// Parent/Enfant: père-fils, père-fille, mère-fils, mère-fille
// Grands-parents: grand-père/grand-mère × petit-fils/petite-fille
export type FamilleSubType =
  | 'frere_frere' | 'soeur_soeur' | 'frere_soeur'
  | 'pere_fils' | 'pere_fille' | 'mere_fils' | 'mere_fille'
  | 'gp_petit_fils' | 'gp_petite_fille' | 'gm_petit_fils' | 'gm_petite_fille'
  | 'coloc' | 'ami';

export interface BondLabel {
  name: string;
  icon: string;
  color: string;
  desc: string;
}

export interface NumeroCompatResult {
  lpScore: number;       // Life Path × Life Path
  exprScore: number;     // Expression × Expression
  soulScore: number;     // Soul × Soul
  total: number;         // Pondéré 0-40
  signals: string[];
  alerts: string[];
}

export interface IChingCompatResult {
  hexA: IChingReading;
  hexB: IChingReading;
  trigramMatch: boolean;  // Partagent un trigramme
  elementMatch: boolean;  // Même famille élémentaire
  roiWen: boolean;        // Ronde 13 : paire Roi Wen détectée
  score: number;          // [-8, +8]
  signals: string[];
  alerts: string[];
}

export interface BondDailyResult {
  date: string;
  score: number;
  label: BondLabel;
  signals: string[];
  alerts: string[];
}

export interface BondResult {
  mode: BondMode;
  scoreGlobal: number;     // 0-100
  label: BondLabel;
  bazi: BaZiCompatResult;
  numerology: NumeroCompatResult;
  iching: IChingCompatResult;
  peachCrossed: boolean;
  sameBirthdate: boolean;
  signals: string[];
  alerts: string[];
  conseil: string;
  summary: string;        // Ronde 13 (3/3) : résumé narratif unifié 2-3 phrases
  badges: string[];       // Ronde 13 (3/3) : signaux positifs visibles ("Golden Tickets")
  contextBadge?: ContextBadge; // Ronde 17 (3/3) : badge contextuel Score×Type (famille uniquement)
  breakdown: { system: string; icon: string; score: number; weight: string; detail: string; technicals: string[] }[];
  familleDesc?: string;   // desc différenciée selon famille × label (R2)
  familleCategory?: string; // 'fratrie' | 'parent' | 'grands_parents'
  // V4.7 debug — pipeline famille transparent (Option C)
  rawStructural?: number;
  archetypeBonus?: number;
  rawFinalBeforeGaussian?: number;
}

// ══════════════════════════════════════
// ═══ CONSTANTES ═══
// ══════════════════════════════════════

// Matrice 9×9 de compatibilité numérologique (1-9 + maîtres)
// Score 0-10 pour chaque paire (symétrique)
// Source : tradition Pythagoricienne + synthèse audits
// Ronde 9bis (3/3) : nouvelle matrice NUM_COMPAT — moyenne pondérée GPT+Grok+Gemini
const NUM_COMPAT: Record<string, number> = {
  '1-1': 7,  '1-2': 5,  '1-3': 8,  '1-4': 4,  '1-5': 9,  '1-6': 5,  '1-7': 4,  '1-8': 8,  '1-9': 6,
  '2-2': 7,  '2-3': 7,  '2-4': 8,  '2-5': 3,  '2-6': 9,  '2-7': 5,  '2-8': 6,  '2-9': 7,
  '3-3': 7,  '3-4': 3,  '3-5': 7,  '3-6': 8,  '3-7': 4,  '3-8': 5,  '3-9': 9,
  '4-4': 7,  '4-5': 3,  '4-6': 7,  '4-7': 5,  '4-8': 9,  '4-9': 3,
  '5-5': 7,  '5-6': 5,  '5-7': 8,  '5-8': 5,  '5-9': 7,
  '6-6': 7,  '6-7': 3,  '6-8': 4,  '6-9': 8,
  '7-7': 8,  '7-8': 4,  '7-9': 5,
  '8-8': 7,  '8-9': 6,
  '9-9': 7,
};

// Ronde 9ter (3/3 verrouillé) : Maîtres Nombres recalibrés
const MASTER_BONUS: Record<string, number> = {
  '11-11': 8, '11-22': 6, '11-33': 8,
  '22-22': 7, '22-33': 7,
  '33-33': 8,
};

// Ronde 9 (3/3) : Poids par mode recalibrés
const WEIGHTS: Record<BondMode, { bazi: number; num: number; iching: number; peach: number }> = {
  amour:   { bazi: 0.45, num: 0.25, iching: 0.20, peach: 0.10 },
  pro:     { bazi: 0.35, num: 0.30, iching: 0.25, peach: 0.10 },
  famille: { bazi: 0.40, num: 0.30, iching: 0.30, peach: 0.00 }, // Peach Blossom = 0 en famille
};

// Labels de compatibilité
const BOND_LABELS: { min: number; label: BondLabel }[] = [
  { min: 90, label: { name: 'Âmes Sœurs',       icon: '💫', color: '#E0B0FF', desc: 'Connexion exceptionnelle — lien d\'âme rare' } },
  { min: 78, label: { name: 'Alchimie Forte',    icon: '🔥', color: '#FFD700', desc: 'Compatibilité naturelle — énergie de fusion' } },
  { min: 65, label: { name: 'Belle Synergie',    icon: '✨', color: '#4ade80', desc: 'Complémentarité solide — terrain fertile' } },
  { min: 50, label: { name: 'Équilibre Possible', icon: '⚖️', color: '#60a5fa', desc: 'Potentiel à cultiver — dialogue nécessaire' } },
  { min: 35, label: { name: 'Friction Créative',  icon: '🌊', color: '#f59e0b', desc: 'Tensions stimulantes — croissance par le défi' } },
  { min: 0,  label: { name: 'Défi Relationnel',   icon: '⚡', color: '#ef4444', desc: 'Opposition forte — transformation ou rupture' } },
];

function getBondLabel(score: number): BondLabel {
  for (const { min, label } of BOND_LABELS) {
    if (score >= min) return label;
  }
  return BOND_LABELS[BOND_LABELS.length - 1].label;
}

// Labels spécifiques mode Famille — Ronde 14+17 (3/3 unanime)
// Seuils recalibrés pour μ=48/σ=20 + vocabulaire positif/évolutif
// Couleurs non-punitives : pas de rouge/orange pour 42-57% (Gemini Ronde 17)
const FAMILLE_LABELS: { min: number; label: BondLabel }[] = [
  { min: 88, label: { name: 'Lien d\'Âme Familial',    icon: '🌟', color: '#E0B0FF', desc: 'Connexion familiale exceptionnelle — lien d\'âme rare' } },
  { min: 72, label: { name: 'Harmonie Naturelle',      icon: '💛', color: '#FFD700', desc: 'Complicité instinctive — soutien mutuel profond' } },
  { min: 58, label: { name: 'Lien Complémentaire',     icon: '🌿', color: '#4ade80', desc: 'Différences enrichissantes — force dans la diversité' } },
  { min: 42, label: { name: 'Lien Exigeant',           icon: '🔮', color: '#818cf8', desc: 'Relation stimulante — le lien se construit par l\'effort conscient' } },
  { min: 28, label: { name: 'Lien de Transformation',  icon: '🧗', color: '#a78bfa', desc: 'Friction formatrice — croissance profonde par le défi' } },
  { min: 0,  label: { name: 'Lien de Vie Profond',  icon: '🔥', color: '#7c3aed', desc: 'Opposition structurelle — leçon de vie majeure' } },
];

function getFamilleLabel(score: number): BondLabel {
  for (const { min, label } of FAMILLE_LABELS) {
    if (score >= min) return label;
  }
  return FAMILLE_LABELS[FAMILLE_LABELS.length - 1].label;
}

// Catégorie selon sous-type (pour desc + badges différenciés) — Ronde 17 : 5 catégories
type FamilleCategory = 'fratrie' | 'parent' | 'grands_parents' | 'ami' | 'coloc';
function getFamilleCategory(sub: FamilleSubType): FamilleCategory {
  if (sub === 'ami') return 'ami';
  if (sub === 'coloc') return 'coloc';
  if (sub.startsWith('frere') || sub.startsWith('soeur')) return 'fratrie';
  if (sub.startsWith('gp_') || sub.startsWith('gm_')) return 'grands_parents';
  return 'parent';
}

// ══════════════════════════════════════
// ═══ BADGES CONTEXTUELS — Ronde 17 (3/3 unanime) ═══
// ══════════════════════════════════════
// Matrice Score × Type → Badge + Narratif
// Philosophie : le score reste astro pur, le badge contextualise le VÉCU
// "L'astrologie donne la partition (le score), le type de relation
//  indique comment la musique est jouée (le badge)" — Gemini R17

export interface ContextBadge {
  icon: string;
  title: string;
  narrative: string;
}

type ScoreTier = 'high' | 'good' | 'moderate' | 'low';
// Seuils alignés sur FAMILLE_LABELS : Âme≥88, Harmonie≥72, Complémentaire≥58, Exigeant≥42
function getScoreTier(score: number): ScoreTier {
  if (score >= 72) return 'high';
  if (score >= 58) return 'good';
  if (score >= 42) return 'moderate';
  return 'low';
}

const CONTEXT_BADGES: Record<FamilleCategory, Record<ScoreTier, ContextBadge>> = {
  ami: {
    high: {
      icon: '🌊', title: 'Âmes Complices',
      narrative: 'Ton amitié repose sur une affinité profonde et naturelle. Les étoiles confirment ce que tu sais déjà : ce lien est précieux et rare.',
    },
    good: {
      icon: '🌿', title: 'Harmonie Douce',
      narrative: 'Une amitié fluide et ressourçante. Tes thèmes se complètent naturellement — le quotidien ensemble est facile et enrichissant.',
    },
    moderate: {
      icon: '🌟', title: 'Étincelle & Complémentarité',
      narrative: 'Tes thèmes révèlent des différences profondes — c\'est justement ce qui rend cette amitié si riche et stimulante. La friction entre amis choisis se transforme en force.',
    },
    low: {
      icon: '🔥', title: 'Défi Magnétique',
      narrative: 'Une amitié hors normes qui défie les conventions. Les oppositions structurelles créent une attraction paradoxale — tu n\'es pas fait pour t\'ennuyer ensemble.',
    },
  },
  fratrie: {
    high: {
      icon: '💛', title: 'Harmonie Fraternelle',
      narrative: 'Une fratrie bénie par une complicité rare. L\'énergie entre vous coule naturellement — un lien de fond solide qui n\'a pas besoin de grands mots.',
    },
    good: {
      icon: '🛋️', title: 'Confort Naturel',
      narrative: 'L\'énergie entre vous coule naturellement. Un lien de fond solide, sans avoir besoin de grands efforts — comme une évidence de famille.',
    },
    moderate: {
      icon: '🌱', title: 'Croissance Mutuelle',
      narrative: 'Ton lien fraternel se construit par l\'effort conscient. Les différences de tempérament sont un terrain d\'apprentissage, pas un obstacle.',
    },
    low: {
      icon: '🔥', title: 'Transformation Fraternelle',
      narrative: 'La fratrie est un miroir sans concession. Les tensions forment le caractère et la clarté naît de la confrontation — ce lien te forge.',
    },
  },
  parent: {
    high: {
      icon: '🌳', title: 'Racines Profondes',
      narrative: 'Un lien parent-enfant d\'une profondeur rare. La compréhension est instinctive, le soutien naturel et profondément ancré.',
    },
    good: {
      icon: '❤️', title: 'Soutien Solide',
      narrative: 'Une compréhension instinctive parent-enfant. Le soutien est naturel et la dynamique de transmission fonctionne harmonieusement.',
    },
    moderate: {
      icon: '🧗', title: 'Lien d\'Évolution',
      narrative: 'La friction entre tes thèmes a forgé un lien exigeant mais transformateur. Le chemin parcouru ensemble a de la valeur — c\'est un lien qui grandit.',
    },
    low: {
      icon: '🔥', title: 'Défi Fondateur',
      narrative: 'La relation porte une friction réelle qui t\'a profondément forgé. Ce n\'est pas un lien facile, c\'est un lien qui demande du travail pour devenir juste.',
    },
  },
  grands_parents: {
    high: {
      icon: '🌳', title: 'Racines Ancestrales',
      narrative: 'Un lien intergénérationnel exceptionnel. La mémoire familiale se transmet naturellement à travers ce lien.',
    },
    good: {
      icon: '🌿', title: 'Transmission Douce',
      narrative: 'La sagesse passe en douceur d\'une génération à l\'autre. Un lien protecteur et chaleureux.',
    },
    moderate: {
      icon: '🌉', title: 'Pont entre Époques',
      narrative: 'Deux générations, deux mondes — mais la curiosité et le respect créent un pont précieux entre les âges.',
    },
    low: {
      icon: '🔥', title: 'Héritage Complexe',
      narrative: 'L\'histoire familiale porte des nœuds à démêler. La compréhension demande un effort conscient de part et d\'autre.',
    },
  },
  coloc: {
    high: {
      icon: '🏠', title: 'Cohabitation Harmonieuse',
      narrative: 'Vivre ensemble est un plaisir naturel. Tes rythmes et tes habitudes s\'accordent comme par magie.',
    },
    good: {
      icon: '🤝', title: 'Bon Équilibre Quotidien',
      narrative: 'La cohabitation fonctionne bien. Les ajustements sont mineurs et le quotidien partagé est agréable.',
    },
    moderate: {
      icon: '⚖️', title: 'Ajustements Nécessaires',
      narrative: 'Vivre ensemble demande des compromis conscients. Les habitudes diffèrent mais l\'effort en vaut la peine.',
    },
    low: {
      icon: '🌪️', title: 'Quotidien Turbulent',
      narrative: 'La cohabitation active des frictions quotidiennes. Mieux vaut préserver le lien en gardant chacun son espace.',
    },
  },
};

export function getContextBadge(score: number, familleSubType?: FamilleSubType): ContextBadge | undefined {
  if (!familleSubType) return undefined;
  const cat = getFamilleCategory(familleSubType);
  const tier = getScoreTier(score);
  return CONTEXT_BADGES[cat]?.[tier];
}

// Descriptions différenciées — Ronde 17 : 5 catégories × 6 labels (Score×Type)
// Inclut ami et coloc en plus de fratrie/parent/grands_parents
export const FAMILLE_DESC: Record<string, Record<string, string>> = {
  'Lien d\'Âme Familial': {
    fratrie:       "Miroir d'âme puissant — loyauté fraternelle indéfectible",
    parent:        "Héritage d'âme majeur — transmission de vie profonde",
    grands_parents:"Résurgence d'âme — le clan se reconnaît à travers les âges",
    ami:           "Âmes complices — une amitié qui transcende le temps",
    coloc:         "Cohabitation magique — harmonie rare sous le même toit",
  },
  'Harmonie Naturelle': {
    fratrie:       "Complicité instinctive — proximité naturelle et vibrante",
    parent:        "Osmose profonde — attachement fort, cœur à cœur",
    grands_parents:"Complicité protectrice absolue — racine et fleur",
    ami:           "Harmonie douce — une amitié fluide et ressourçante",
    coloc:         "Cohabitation sereine — les rythmes s'accordent naturellement",
  },
  'Lien Complémentaire': {
    fratrie:       "Forces opposées, équilibre naturel",
    parent:        "Filiation harmonieuse — respect naturel des rôles",
    grands_parents:"Transmission douce de la mémoire familiale",
    ami:           "Complémentarité enrichissante — tu couvres les angles morts de l'autre",
    coloc:         "Cohabitation constructive — chacun apporte sa pierre",
  },
  'Lien Exigeant': {
    fratrie:       "Apprentissage mutuel par le frottement des ego",
    parent:        "Lien en évolution — la friction forge la compréhension",
    grands_parents:"Pont curieux entre deux mondes et deux temps",
    ami:           "Relation stimulante — tes différences sont une richesse cachée",
    coloc:         "Cohabitation exigeante — les ajustements demandent de la patience",
  },
  'Lien de Transformation': {
    fratrie:       "Tensions qui forgent le caractère — clarté nécessaire",
    parent:        "Friction structurelle — le chemin parcouru ensemble a de la valeur",
    grands_parents:"Incompréhension générationnelle invitant à l'effort",
    ami:           "Amitié-défi — la friction se transforme en stimulation mutuelle",
    coloc:         "Cohabitation transformatrice — grandir ensemble malgré les tensions",
  },
  'Lien de Vie Profond': {
    fratrie:       "Altérité radicale — respecter les distances s'impose",
    parent:        "L'enfant révèle l'ombre du parent — miroir intense",
    grands_parents:"Rupture énergétique — histoire familiale complexe",
    ami:           "Lien magnétique mais turbulent — transformation profonde requise",
    coloc:         "Cohabitation très difficile — les énergies s'opposent frontalement",
  },
};

// Hexagrammes archétypaux par sous-type — V4.7: 2 hexes par lien (bonus max +6)
// Chaque personne peut matcher l'un OU l'autre des 2 hexes → +3 par match
// (V4.6 utilisait 1 seul hex → bonus max +3 — bug corrigé Option C)
const ARCHETYPE_HEX_PAIRS: Partial<Record<FamilleSubType, [number, number]>> = {
  frere_frere:      [51, 58],  // L'Éveilleur + Le Joyeux
  soeur_soeur:      [58, 31],  // Le Joyeux + L'Influence
  frere_soeur:      [31, 45],  // L'Influence + Le Rassemblement
  pere_fils:        [18,  3],  // Le Travail sur la Corruption + La Difficulté Initiale
  pere_fille:       [17, 45],  // Suivre + Le Rassemblement
  mere_fils:        [ 3, 18],  // La Difficulté Initiale + Le Travail sur la Corruption
  mere_fille:       [45, 17],  // Le Rassemblement + Suivre
  gp_petit_fils:    [50, 55],  // Le Chaudron + L'Abondance
  gp_petite_fille:  [41, 58],  // La Diminution + Le Joyeux
  gm_petit_fils:    [55, 50],  // L'Abondance + Le Chaudron
  gm_petite_fille:  [58, 41],  // Le Joyeux + La Diminution
  coloc:            [22, 22],  // La Grâce (symétrique)
};

const ARCHETYPE_NAMES: Record<number, string> = {
   2: "Le Réceptif",
   3: "La Difficulté Initiale",
  17: "Suivre",
  18: "Le Travail sur la Corruption",
  22: "La Grâce",
  31: "L'Influence",
  41: "La Diminution",
  45: "Le Rassemblement",
  50: "Le Chaudron",
  51: "L'Éveilleur",
  55: "L'Abondance",
  58: "Le Joyeux",
};

// Ronde 9ter (2/3) : bonus réduit à +2 max, affiché séparément du score doctrinal
// Label : "Résonance Archétypale — interprétation moderne inspirée du Yi Jing"
export function calcArchetypeHexBonus(subtype: FamilleSubType, hex1: number, hex2: number): number {
  const pair = ARCHETYPE_HEX_PAIRS[subtype];
  if (!pair) return 0;
  let bonus = 0;
  if (pair.includes(hex1)) bonus += 1;
  if (pair.includes(hex2)) bonus += 1;
  return Math.min(2, bonus);
}

// ══════════════════════════════════════
// ═══ NUMÉROLOGIE COMPATIBILITÉ ═══
// ══════════════════════════════════════

function getNumCompat(a: number, b: number): number {
  // Normalise pour lookup (toujours petit-grand)
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);

  // Check maîtres d'abord
  if (isMaster(a) && isMaster(b)) {
    const mKey = `${Math.min(a, b)}-${Math.max(a, b)}`;
    if (MASTER_BONUS[mKey] !== undefined) return MASTER_BONUS[mKey];
  }

  // Réduire les maîtres pour la matrice 9×9
  const ra = a > 9 ? (a === 11 ? 2 : a === 22 ? 4 : 6) : a;
  const rb = b > 9 ? (b === 11 ? 2 : b === 22 ? 4 : 6) : b;
  const key = `${Math.min(ra, rb)}-${Math.max(ra, rb)}`;
  return NUM_COMPAT[key] ?? 5; // défaut neutre
}

// Ronde 9 (3/3) : Sous-poids numérologie par mode (×4 pour range 0-40)
const NUM_SUB_WEIGHTS: Record<BondMode, { lp: number; expr: number; soul: number }> = {
  amour:   { lp: 1.6, expr: 1.0, soul: 1.4 },  // LP 40% / Expr 25% / Soul 35%
  pro:     { lp: 1.2, expr: 1.8, soul: 1.0 },  // LP 30% / Expr 45% / Soul 25%
  famille: { lp: 1.6, expr: 1.2, soul: 1.2 },  // LP 40% / Expr 30% / Soul 30%
};

function calcNumeroCompat(bdA: string, nameA: string, bdB: string, nameB: string, mode: BondMode = 'amour'): NumeroCompatResult {
  const signals: string[] = [];
  const alerts: string[] = [];
  const sw = NUM_SUB_WEIGHTS[mode];
  const hasNames = !!(nameA && nameB);

  // Ronde 13 (Gemini P1) : si noms vides, LP absorbe 100% du poids numérologique
  // Au lieu de laisser Expression+Soul à 0 → score artificiellement bas
  const lpMultiplier = hasNames ? sw.lp : (sw.lp + sw.expr + sw.soul);

  // Life Path
  const lpA = calcLifePath(bdA);
  const lpB = calcLifePath(bdB);
  const lpRaw = getNumCompat(lpA.v, lpB.v);
  const lpScore = Math.round(lpRaw * lpMultiplier);

  if (lpRaw >= 8) signals.push(`Chemin de Vie ${lpA.v}×${lpB.v} — résonance forte`);
  else if (lpRaw <= 3) alerts.push(`Chemin de Vie ${lpA.v}×${lpB.v} — vibrations très différentes`);

  // Expression
  let exprScore = 0;
  if (hasNames) {
    const exprA = calcExpression(nameA);
    const exprB = calcExpression(nameB);
    const exprRaw = getNumCompat(exprA.v, exprB.v);
    exprScore = Math.round(exprRaw * sw.expr);
    if (exprRaw >= 8) signals.push(`Expression ${exprA.v}×${exprB.v} — communication fluide`);
    else if (exprRaw <= 3) alerts.push(`Expression ${exprA.v}×${exprB.v} — langages différents`);
  }

  // Soul Urge
  let soulScore = 0;
  if (hasNames) {
    const soulA = calcSoul(nameA);
    const soulB = calcSoul(nameB);
    const soulRaw = getNumCompat(soulA.v, soulB.v);
    soulScore = Math.round(soulRaw * sw.soul);
    if (soulRaw >= 8) signals.push(`Âmes ${soulA.v}×${soulB.v} — désirs profonds alignés`);
    else if (soulRaw <= 3) alerts.push(`Âmes ${soulA.v}×${soulB.v} — motivations divergentes`);
  }

  if (!hasNames) {
    alerts.push('⚠️ Prénoms non renseignés — score numérologique basé sur le Chemin de Vie uniquement');
  }

  // Total plafonné à 40
  const total = Math.min(40, lpScore + exprScore + soulScore);

  return { lpScore, exprScore, soulScore, total, signals, alerts };
}

// ══════════════════════════════════════
// ═══ I CHING COMPATIBILITÉ ═══
// ══════════════════════════════════════

// Familles élémentaires de trigrammes
const TRIGRAM_ELEMENT: Record<number, string> = {
  0: 'Métal',     // Ciel ☰
  1: 'Métal',     // Lac ☱
  2: 'Feu',       // Feu ☲
  3: 'Bois',      // Tonnerre ☳
  4: 'Bois',      // Vent ☴
  5: 'Eau',       // Eau ☵
  6: 'Terre',     // Montagne ☶
  7: 'Terre',     // Terre ☷
};

// Relations entre éléments de trigrammes — Ronde 9 (3/3) : poids direct vs croisé
const TRIGRAM_REL_DIRECT: Record<string, number> = {
  'same_tri': 3,         // même trigramme (poids fort)
  'same': 1,             // même élément, trigramme différent
  'produces': 3,         // production (poids fort)
  'produced_by': 3,
  'destroys': -2,
  'destroyed_by': -2,
};
const TRIGRAM_REL_CROSS: Record<string, number> = {
  'same_tri': 1.5,       // même trigramme (poids léger)
  'same': 0.5,
  'produces': 1.5,
  'produced_by': 1.5,
  'destroys': -1,
  'destroyed_by': -1,
};

// Paires du Roi Wen — hexagrammes structurellement inversés (Yi Jing classique)
const ROI_WEN_PAIRS: Set<string> = new Set([
  '1-2', '3-4', '5-6', '7-8', '9-10', '11-12', '13-14', '15-16',
  '17-18', '19-20', '21-22', '23-24', '25-26', '27-28', '29-30', '31-32',
  '33-34', '35-36', '37-38', '39-40', '41-42', '43-44', '45-46', '47-48',
  '49-50', '51-52', '53-54', '55-56', '57-58', '59-60', '61-62', '63-64',
]);

function getTrigramRelation(elemA: string, elemB: string): string {
  if (elemA === elemB) return 'same';
  const prod = ['Bois→Feu', 'Feu→Terre', 'Terre→Métal', 'Métal→Eau', 'Eau→Bois'];
  if (prod.includes(`${elemA}→${elemB}`)) return 'produces';
  if (prod.includes(`${elemB}→${elemA}`)) return 'produced_by';
  const dest = ['Bois→Terre', 'Terre→Eau', 'Eau→Feu', 'Feu→Métal', 'Métal→Bois'];
  if (dest.includes(`${elemA}→${elemB}`)) return 'destroys';
  if (dest.includes(`${elemB}→${elemA}`)) return 'destroyed_by';
  return 'same'; // fallback
}

/**
 * Ronde 9 (3/3) : I Ching scoring reconstruit — 4 comparaisons croisées
 *   Direct : bas↔bas, haut↔haut (poids fort)
 *   Croisé : bas↔haut, haut↔bas (poids léger)
 *   Bonus : même hexagramme +2, paires Roi Wen +3
 *   Range estimé : [-6, +16]
 */
function calcIChingCompat(bdA: string, bdB: string): IChingCompatResult {
  const hexA = calcNatalIChing(bdA);
  const hexB = calcNatalIChing(bdB);
  const signals: string[] = [];
  const alerts: string[] = [];
  let score = 0;

  // Helper : score une paire de trigrammes
  function scorePair(triA: number, triB: number, weights: Record<string, number>): number {
    if (triA === triB) return weights['same_tri'] || 0;
    const elemA = TRIGRAM_ELEMENT[triA] || 'Terre';
    const elemB = TRIGRAM_ELEMENT[triB] || 'Terre';
    const rel = getTrigramRelation(elemA, elemB);
    return weights[rel] || 0;
  }

  // 1. Comparaisons directes (poids fort)
  const lowLowPts = scorePair(hexA.lower, hexB.lower, TRIGRAM_REL_DIRECT);
  const hiHiPts = scorePair(hexA.upper, hexB.upper, TRIGRAM_REL_DIRECT);
  score += lowLowPts + hiHiPts;

  // 2. Comparaisons croisées (poids léger)
  const lowHiPts = scorePair(hexA.lower, hexB.upper, TRIGRAM_REL_CROSS);
  const hiLowPts = scorePair(hexA.upper, hexB.lower, TRIGRAM_REL_CROSS);
  score += lowHiPts + hiLowPts;

  // Signaux : afficher la paire la plus significative (pas toujours les trigrammes bas)
  const trigramMatch = lowLowPts > 0 || hiHiPts > 0 || lowHiPts > 0 || hiLowPts > 0;
  const pairs = [
    { pts: lowLowPts, a: hexA.lower, b: hexB.lower },
    { pts: hiHiPts,   a: hexA.upper, b: hexB.upper },
    { pts: lowHiPts,  a: hexA.lower, b: hexB.upper },
    { pts: hiLowPts,  a: hexA.upper, b: hexB.lower },
  ];

  if (score > 0) {
    const best = pairs.reduce((a, b) => b.pts > a.pts ? b : a);
    const eA = TRIGRAM_ELEMENT[best.a] || 'Terre';
    const eB = TRIGRAM_ELEMENT[best.b] || 'Terre';
    signals.push(`☰ ${TRIGRAM_NAMES[best.a]} (${eA}) ↔ ${TRIGRAM_NAMES[best.b]} (${eB}) — flux favorable`);
  }
  if (score < 0) {
    const worst = pairs.reduce((a, b) => b.pts < a.pts ? b : a);
    const eA = TRIGRAM_ELEMENT[worst.a] || 'Terre';
    const eB = TRIGRAM_ELEMENT[worst.b] || 'Terre';
    alerts.push(`☰ ${TRIGRAM_NAMES[worst.a]} (${eA}) ↔ ${TRIGRAM_NAMES[worst.b]} (${eB}) — tension élémentaire`);
  }

  // 3. Même hexagramme — Ronde 9 (3/3) : +2
  if (hexA.hexNum === hexB.hexNum) {
    score += 2;
    signals.push(`☰ Même hexagramme natal #${hexA.hexNum} — résonance profonde`);
  }

  // 4. Paires Roi Wen — hexagrammes structurellement inversés (Yi Jing classique) : +3
  const pairKey = `${Math.min(hexA.hexNum, hexB.hexNum)}-${Math.max(hexA.hexNum, hexB.hexNum)}`;
  if (ROI_WEN_PAIRS.has(pairKey)) {
    score += 3;
    signals.push(`☰ Paire du Roi Wen (#${hexA.hexNum} ↔ #${hexB.hexNum}) — complémentarité structurelle`);
  }

  const elementMatch = (TRIGRAM_ELEMENT[hexA.lower] || 'Terre') === (TRIGRAM_ELEMENT[hexB.lower] || 'Terre');
  const roiWen = ROI_WEN_PAIRS.has(pairKey);

  // Range [-6, +16] — pas de clamp artificiel
  score = Math.max(-6, Math.min(16, score));

  return { hexA, hexB, trigramMatch, elementMatch, roiWen, score, signals, alerts };
}

// ══════════════════════════════════════════════════════════════════
// ═══ NARRATIF RICHE — RONDE 11 (GPT×Grok×Gemini consensus) ═══
// ══════════════════════════════════════════════════════════════════

// ── Q1 : BaZi — 6 interactions + 5 relations × 3 modes (GPT) ──

const BAZI_INTERACTION_TEXT: Record<string, Record<BondMode, string>> = {
  tian_he: {
    amour: "Quelque chose s'accorde entre toi et l'autre avant même les mots — cette fusion céleste invite à bâtir un lien rare, à condition de ne pas confondre évidence et acquis.",
    pro: "Une vision commune t\'aligne instinctivement — cette fusion céleste accélère les projets à condition de garder des rôles clairs.",
    famille: "Au-delà du sang, une résonance d'âme t\'unit — cette fusion céleste te ramène toujours à l'essentiel, même dans le silence.",
  },
  liu_he: {
    amour: "Ton alliance agit dans le discret plus que dans le spectaculaire — cette complicité invisible te rapproche quand tu cesses de tout demander à la preuve.",
    pro: "Tu sais te comprendre sans surjouer la coordination — cette alliance secrète devient précieuse quand elle sert une confiance sobre et régulière.",
    famille: "Un lien silencieux te protège mutuellement — cette alliance secrète est le ciment invisible de ta famille.",
  },
  san_he: {
    amour: "Tu avances comme si une troisième force soutenait le lien — ce triangle d'harmonie donne de l'élan au couple quand tu choisis la même direction intérieure.",
    pro: "La coopération est innée entre vous — ce triangle d'harmonie porte les projets loin si chacun nourrit le mouvement commun.",
    famille: "Tu incarnes la force du clan — ce triangle harmonieux crée une fondation solide sur laquelle toute la structure familiale peut s'appuyer.",
  },
  clash: {
    amour: "Tes différences te percutent pour mieux te réveiller — cette passion électrique exige de ne jamais chercher à soumettre la nature de l'autre.",
    pro: "Le choc de tes méthodes est ton meilleur atout créatif — accepte la contradiction, c'est elle qui t'empêche de stagner.",
    famille: "Ce lien bouscule tes certitudes générationnelles — c'est une épreuve de tolérance qui te pousse à accepter ce que tu ne comprends pas.",
  },
  harm: {
    amour: "La tension entre vous ne fait pas de bruit, elle s'installe — nomme tôt les malentendus avant qu'ils ne deviennent une distance.",
    pro: "Un frottement invisible érode lentement — prends le temps de l'écouter, il révèle où tu dois ajuster.",
    famille: "Les vieilles rancœurs ou les maladresses non dites testent ce lien — la guérison passe par le pardon des petites imperfections quotidiennes.",
  },
  punishment: {
    amour: "Ton lien ne vient pas seulement apporter du confort, mais une leçon — ce Défi d'évolution te demande de transformer une vieille manière d'aimer.",
    pro: "Cette relation te confronte à une exigence plus grande que la simple efficacité — ce Défi d'évolution pousse chacun à corriger ce qu'il répétait sans le voir.",
    famille: "Tu portes ensemble une dette ou un fardeau transgénérationnel — ta relation est le creuset parfait pour briser enfin ce cycle.",
  },
};

// Clés alignées sur ElementRelation de bazi.ts : same, produces, produced_by, destroys, destroyed_by
const BAZI_ELEMENT_SUFFIX: Record<string, Record<BondMode, string>> = {
  produces: {
    amour: "L'un nourrit naturellement l'élan de l'autre — ton lien grandit quand ce soutien reste vivant et ne devient pas un sacrifice silencieux.",
    pro: "L'un alimente ce que l'autre sait porter — cette dynamique devient féconde quand la circulation reste réciproque.",
    famille: "L'un soutient l'autre presque instinctivement — cette qualité devient précieuse quand celui qui donne pense aussi à se préserver.",
  },
  produced_by: {
    amour: "L'un nourrit naturellement l'élan de l'autre — ton lien grandit quand ce soutien ne devient pas un sacrifice silencieux.",
    pro: "L'un alimente ce que l'autre sait porter — cette dynamique reste féconde quand la circulation va dans les deux sens.",
    famille: "L'un soutient l'autre presque instinctivement — en famille, cette qualité s'épanouit quand celui qui reçoit le reconnaît.",
  },
  destroys: {
    amour: "Une part du lien cherche à cadrer l'autre — l'amour respire mieux quand la protection ne glisse pas vers la maîtrise.",
    pro: "L'un impose facilement le rythme — au travail, cela fonctionne quand l'autorité éclaire sans écraser.",
    famille: "L'un tend à prendre le dessus sur la dynamique — le lien s'apaise quand le cadre laisse encore de la place à la respiration.",
  },
  destroyed_by: {
    amour: "Tu touches chez l'autre une zone fragile — l'amour demande ici plus de délicatesse que d'intensité.",
    pro: "Tes énergies se contrarient subtilement — la clé est de simplifier et de ne pas exiger de l'autre qu'il fonctionne comme toi.",
    famille: "Le lien fatigue plus qu'il ne heurte — la relation s'allège quand on remplace la correction par l'écoute.",
  },
  same: {
    amour: "Tu vibres sur une matière proche — la relation gagne en profondeur quand la ressemblance n'efface pas la surprise.",
    pro: "Tu fonctionnes sur une logique similaire — c'est une force, à condition de ne pas tourner en rond dans les mêmes réflexes.",
    famille: "Tu réagis avec une parenté intérieure évidente — le lien devient plus juste quand chacun garde sa manière propre d'exister.",
  },
};

function baziBriefText(bazi: BaZiCompatResult, mode: BondMode): string {
  // Determine interaction type (priorité)
  let interactionKey: string | null = null;
  if (bazi.heavenlyCombination) interactionKey = 'tian_he';
  else if (bazi.liuHe)         interactionKey = 'liu_he';
  else if (bazi.triad)         interactionKey = 'san_he';
  else if (bazi.clash)         interactionKey = 'clash';
  else if (bazi.harm)          interactionKey = 'harm';
  else if (bazi.punishments.length > 0) interactionKey = 'punishment';

  // Elemental suffix
  const rel = bazi.elementRelation;
  const suffix = BAZI_ELEMENT_SUFFIX[rel]?.[mode] || '';

  if (interactionKey) {
    const main = BAZI_INTERACTION_TEXT[interactionKey]?.[mode] || '';
    // Combine main + suffix for unique text
    return suffix ? `${main} ${suffix}` : main;
  }

  // No major interaction → element-only text
  return suffix || BAZI_ELEMENT_SUFFIX['same'][mode];
}

// ── Q2 : Numérologie — 45 paires + 6 Maîtres (GPT expert) ──

const LP_PAIR_TEXT: Record<string, string> = {
  '1-1': "Deux leaders se rencontrent ici — ton lien devient puissant quand tu décides de construire ensemble au lieu de mesurer sans cesse qui mène.",
  '1-2': "Le pionnier (1) trace la voie, le diplomate (2) harmonise le voyage. Honore tes rôles respectifs : l'un donne l'impulsion, l'autre crée le ciment qui fait durer.",
  '1-3': "Le leader (1) et le créateur (3) forment un duo étincelant. Canalise cette énergie électrique dans des projets audacieux pour ne pas t\'épuiser en batailles d'ego.",
  '1-4': "L'initiateur (1) apporte l'étincelle, le bâtisseur (4) pose les fondations. Respecte le rythme de l'autre : la fulgurance a besoin de patience pour s'incarner.",
  '1-5': "Le leader (1) trouve en l\'aventurier (5) un allié qui repousse ses limites. Ensemble, transforme les idées en mouvement, tout en gardant un point d\'ancrage.",
  '1-6': "Le leader (1) veut agir, le protecteur (6) veut prendre soin — ton lien s'épanouit quand l'ambition sert aussi quelque chose de plus grand.",
  '1-7': "L'homme d'action (1) croise le chercheur (7). Accepte tes silences mutuels : l'un a besoin de conquérir le monde, l'autre de le comprendre de l'intérieur.",
  '1-8': "Deux puissances pures (1 et 8) qui visent les sommets. Cette alliance de titans soulèvera des montagnes, à condition de partager le pouvoir avec une loyauté totale.",
  '1-9': "Le pionnier (1) donne l'élan, l'humaniste (9) donne le sens global. Mets ton intensité commune au service d'un idéal plus grand que ton couple.",
  '2-2': "Deux diplomates créent un havre de paix absolue. Prends garde cependant à ne pas fuir les confrontations nécessaires par peur de briser cette douce harmonie.",
  '2-3': "Le conciliateur (2) offre l'écoute, l'artiste (3) apporte la lumière. Laisse la joie irradier ton lien tout en protégeant la grande sensibilité de chacun.",
  '2-4': "Le diplomate (2) et le bâtisseur (4) posent les fondations en silence. Ta force est dans la constance : célèbre la sécurité inébranlable de ton lien.",
  '2-5': "L'ancrage doux du diplomate (2) croise le vent de liberté de l'aventurier (5). Apprends la danse de la distance : l'un offre le port, l'autre ramène l'horizon.",
  '2-6': "Entre le diplomate (2) et le nourricier (6), le dévouement est roi. Ton lien est un nid chaleureux, veille juste à ne pas t\'oublier en voulant trop donner.",
  '2-7': "La sensibilité du diplomate (2) s'allie à la profondeur du sage (7). Ta connexion est spirituelle : respecte ton besoin de calme pour mieux te retrouver.",
  '2-8': "Le diplomate (2) soutient, l'ambitieux (8) dirige. C'est un tandem redoutable si la valeur inestimable de celui qui reste dans l'ombre est pleinement reconnue.",
  '2-9': "Le conciliateur (2) soigne l'individu, l'humaniste (9) embrasse le monde. Ta relation est un baume apaisant, irrigue-la de compassion mutuelle.",
  '3-3': "Deux créateurs ensemble font pétiller l'existence ! Partage ton enthousiasme et tes rires, mais n'oublie pas d'ancrer tes rêves dans la réalité matérielle.",
  '3-4': "L'artiste (3) colore la vie, le bâtisseur (4) dresse les murs. Tes différences sont ta richesse : la fantaisie a besoin d'un cadre pour s'épanouir.",
  '3-5': "Le créatif (3) et l'aventurier (5) forment une tornade d'enthousiasme. Mange la vie à pleines dents, mais construis un point de chute pour ne pas te disperser.",
  '3-6': "La joie du créateur (3) réchauffe le cœur du protecteur (6). Laisse l'imagination alléger tes responsabilités : ta force réside dans ton rayonnement joyeux.",
  '3-7': "Le communicant (3) rencontre l'analyste silencieux (7). C'est le dialogue entre la lumière et la profondeur : apprends à chérir l'authenticité derrière les mots non dits.",
  '3-8': "L'inspirateur (3) vend le rêve, l'ambitieux (8) le réalise et le structure. Un potentiel immense, si la légèreté de l'un respecte le sérieux de l'autre.",
  '3-9': "Le créatif (3) et le philosophe (9) portent une vision romantique de l'existence. Exprime tes idéaux par l'art, le verbe ou le cœur pour inspirer le monde.",
  '4-4': "Deux bâtisseurs cimentent une relation indestructible. L'engagement est total, mais pense à ouvrir parfois les fenêtres pour laisser entrer l'imprévu et la légèreté.",
  '4-5': "La structure absolue (4) face à la liberté pure (5). C'est un défi magnétique : offre-toi des racines et des ailes, sans jamais chercher à t\'enfermer.",
  '4-6': "Le roc (4) s'associe au nid (6). C'est la garantie d'une sécurité matérielle et affective absolue : la base idéale pour faire grandir la confiance sereinement.",
  '4-7': "Le pragmatique (4) et l'intellectuel (7) se rejoignent dans l'exigence. Ton lien est profond : partage tes connaissances et bâtis un refuge loin du tumulte.",
  '4-8': "Le travailleur (4) et le visionnaire matériel (8) forment un empire. La solidité est garantie, à condition de ne pas oublier d'y injecter de la tendresse gratuite.",
  '4-9': "L'ancrage strict du bâtisseur (4) face aux vastes idéaux de l'humaniste (9). Rapproche tes mondes en donnant une utilité concrète à tes rêves de changement.",
  '5-5': "Deux électrons libres sur la même longueur d\'onde. Le mouvement est ton moteur : innove ensemble, mais définis un pacte clair pour ne pas te perdre de vue.",
  '5-6': "L\'esprit libre (5) rencontre le gardien du foyer (6). Apprends à aimer l\'ancrage sans te sentir pris au piège, et offre la sécurité sans chercher à retenir.",
  '5-7': "L'explorateur du monde (5) et l'explorateur de l'âme (7) s'intriguent mutuellement. Respecte ton besoin commun d'indépendance pour nourrir de passionnantes conversations.",
  '5-8': "L'adaptabilité de l'aventurier (5) au service de la puissance de l'ambitieux (8). Un quotidien trépidant t\'attend, si l'adrénaline ne masque pas le besoin de douceur.",
  '5-9': "L'aventurier (5) et le citoyen du monde (9) regardent tous deux vers l'horizon. Vis ce lien comme une grande épopée, sans chercher à figer l'instant.",
  '6-6': "Deux âmes nourricières débordantes d'amour. Le risque n'est pas le manque, mais l'étouffement : aime-toi intensément, mais préserve tes identités individuelles.",
  '6-7': "Le cœur chaud (6) enlace l'esprit analytique (7). La chaleur humaine apprivoise la distance : respecte le mystère de l'autre sans jamais te sentir rejeté.",
  '6-8': "Le protecteur (6) gère l'humain, l'ambitieux (8) gère la direction. Une complémentarité redoutable pour construire un patrimoine solide et un foyer florissant.",
  '6-9': "Le dévouement aux proches (6) rencontre le dévouement à l\'humanité (9). Ton amour a vocation à déborder : accueille les autres dans ta lumière sans te sacrifier.",
  '7-7': "Deux chercheurs de vérité partagent un silence éloquent. Ton lien est d'une grande noblesse intellectuelle : n'oublie pas d'y ramener la chaleur du corps et du rire.",
  '7-8': "L'analyste profond (7) conseille le décideur puissant (8). Une alliance stratégique brillante où l'esprit guide l'action. Honore la sagesse de l'un et le courage de l'autre.",
  '7-9': "Le mystique solitaire (7) et l'idéaliste (9) tissent une connexion spirituelle rare. Échange sur tes visions du monde pour élever constamment ta relation.",
  '8-8': "Deux puissances souveraines se mesurent l'une à l'autre. Le succès est garanti si te reste des alliés indéfectibles, fuyant à tout prix la compétition intime.",
  '8-9': "L'architecte matériel (8) soutient l'idéaliste (9). Mets ta puissance au service de causes nobles : tu accompliras des miracles main dans la main.",
  '9-9': "Deux philanthropes portés par des idéaux immenses. Ton lien porte naturellement plus loin que le duo, à condition de cultiver ton propre jardin d'intimité.",
};

const LP_MASTER_TEXT: Record<string, string> = {
  '11-11': "Deux intuitions fulgurantes (11) en miroir. La résonance psychique est magique mais électrisante : ancre-toi régulièrement dans le réel pour ne pas épuiser tes systèmes nerveux.",
  '11-22': "Le messager spirituel (11) face à l'architecte terrien (22). Une tension stimulante entre l'idéal et le concret : apprends patiemment la langue de l'autre pour marier le ciel et la terre.",
  '11-33': "Le visionnaire inspiré (11) s'allie au guide bienveillant (33). Une harmonie d'âme exceptionnelle : ta relation est un sanctuaire de lumière qui élèvera tous ceux qui t'entourent.",
  '22-22': "Deux maîtres bâtisseurs (22) érigent un empire. Tes capacités de concrétisation sont hors normes : vise l\'excellence, mais garde du temps pour la douceur et le lâcher-prise.",
  '22-33': "La maîtrise matérielle (22) au service de l'amour universel (33). Un potentiel de création phénoménal : utilise ta solidité pour offrir un refuge aux idéaux les plus purs.",
  '33-33': "Deux maîtres de compassion (33) unissent leurs cœurs. Ta relation est portée par une grâce absolue : veille simplement à ne pas porter toute la misère du monde sur tes épaules.",
};

const LP_MODE_SUFFIX: Record<BondMode, string> = {
  amour: "Dans l'intimité, cette dynamique fleurit quand chacun se sent choisi sans devoir se renier.",
  pro: "Dans le travail, cette alliance devient forte quand les talents sont nommés clairement et mis au bon endroit.",
  famille: "Dans la famille, ce lien s'épanouit quand il laisse à chacun le droit d'exister sans rôle figé.",
};

function lpRelationText(lpA: number, lpB: number, mode: BondMode): string {
  let base: string;
  // Maîtres Nombres d'abord
  if (isMaster(lpA) && isMaster(lpB)) {
    const key = `${Math.min(lpA, lpB)}-${Math.max(lpA, lpB)}`;
    if (LP_MASTER_TEXT[key]) { base = LP_MASTER_TEXT[key]; return `${base} ${LP_MODE_SUFFIX[mode]}`; }
  }
  // Réduire les Maîtres à leur base pour lookup paire
  const a = lpA > 9 ? (lpA === 11 ? 2 : lpA === 22 ? 4 : 6) : lpA;
  const b = lpB > 9 ? (lpB === 11 ? 2 : lpB === 22 ? 4 : 6) : lpB;
  const key = `${Math.min(a, b)}-${Math.max(a, b)}`;
  base = LP_PAIR_TEXT[key] || `Chemin ${lpA} × ${lpB} — explore ta complémentarité unique.`;
  return `${base} ${LP_MODE_SUFFIX[mode]}`;
}

// ── Q3 : Yi King — 18 templates × 6 bands (Gemini expert) ──

const ICHING_TEMPLATES: Record<string, Record<BondMode, string>> = {
  same_hex: {
    amour: "Marqués tous deux par {hexA}, tu te regardes dans l'âme de l'autre — protège ton individualité pour ne pas te dissoudre dans cette fusion.",
    pro: "Double dose de {hexA} — tes méthodes sont identiques. Excellent pour l'exécution, mais pense à chercher l'inspiration à l'extérieur.",
    famille: "Partageant {hexA}, tu portes le même bagage existentiel — c'est un lien de compréhension absolue, rare et précieux au sein du clan.",
  },
  roi_wen: {
    amour: "{hexA} et {hexB} sont les deux faces d'une même pièce — tu étais faits pour combler intimement les vides de l'autre.",
    pro: "Un équilibre parfait : {hexA} et {hexB} se répondent — là où l'un montre une limite, l'autre intervient comme par magie.",
    famille: "Dans le grand cycle de mutations entre {hexA} et {hexB}, tu incarnes l'équilibre structurel de la famille, l'ombre et la lumière.",
  },
  synergy: {
    amour: "Entre {hexA} et {hexB}, ton amour coule de source — l'osmose de tes énergies transforme le quotidien en une création continue.",
    pro: "L'association de {hexA} et {hexB} décuple ton efficacité — ensemble, tu franchis des paliers inaccessibles en solitaire.",
    famille: "De {hexA} vers {hexB}, ce lien de sang est une bénédiction fluide — tu te portes et tu élèves mutuellement avec grâce.",
  },
  dialogue: {
    amour: "La rencontre de {hexA} et {hexB} demande de l'écoute, mais tes différences se révèlent être de magnifiques forces complémentaires.",
    pro: "Face à face, {hexA} et {hexB} instaurent un débat constructif — cultive cette intelligence collective, elle est le moteur de tes succès.",
    famille: "Tes rythmes entre {hexA} et {hexB} diffèrent, mais une profonde bienveillance familiale permet d'en faire une richesse plutôt qu'un clivage.",
  },
  neutral: {
    amour: "De {hexA} à {hexB}, rien ne force le lien, mais rien ne l'empêche — cette neutralité devient profondeur si tu choisis vraiment d'habiter la relation.",
    pro: "De {hexA} à {hexB}, le terrain est sobre, sans friction majeure — cela demande plus de conscience, mais laisse une grande liberté de construction.",
    famille: "{hexA} et {hexB} coexistent sereinement — l'absence d'entremêlement excessif garantit une paix familiale appréciable.",
  },
  tension: {
    amour: "Entre {hexA} et {hexB}, l'alchimie brûle et frotte — ne fuis pas les crises, elles viennent polir ta relation comme un joyau.",
    pro: "La confrontation de {hexA} et {hexB} génère des étincelles — canalise cette tension vers la résolution de problèmes plutôt que vers l'ego.",
    famille: "Le défi entre {hexA} et {hexB} est réel — cette rudesse apparente cache souvent une leçon d'émancipation nécessaire pour la lignée.",
  },
};

function ichingBriefText(iching: IChingCompatResult, mode: BondMode): string {
  const nameA = HEX_NAMES[iching.hexA.hexNum] || `Hexagramme ${iching.hexA.hexNum}`;
  const nameB = HEX_NAMES[iching.hexB.hexNum] || `Hexagramme ${iching.hexB.hexNum}`;

  let band: string;
  if (iching.hexA.hexNum === iching.hexB.hexNum) {
    band = 'same_hex';
  } else {
    const pairKey = `${Math.min(iching.hexA.hexNum, iching.hexB.hexNum)}-${Math.max(iching.hexA.hexNum, iching.hexB.hexNum)}`;
    if (ROI_WEN_PAIRS.has(pairKey)) band = 'roi_wen';
    else if (iching.score >= 8)     band = 'synergy';
    else if (iching.score >= 3)     band = 'dialogue';
    else if (iching.score >= 0)     band = 'neutral';
    else                             band = 'tension';
  }

  const template = ICHING_TEMPLATES[band]?.[mode] || ICHING_TEMPLATES['neutral'][mode];
  return template.replace(/\{hexA\}/g, nameA).replace(/\{hexB\}/g, nameB);
}

// ── Peach Blossom — texte par mode ──

// Ronde 13 (3/3) : 3 niveaux (inactive / active simple / double)
const PEACH_TEXT: Record<'double' | 'active' | 'inactive', Record<BondMode, string>> = {
  double: {
    amour: "La Double Fleur de Pêcher brille des deux côtés — une attraction magnétique réciproque et rare, comme deux miroirs qui s'illuminent mutuellement. Ce lien charnel est exceptionnel.",
    pro: "Un magnétisme professionnel bidirectionnel rare — chacun inspire l'autre naturellement, créant un duo dont le charisme combiné dépasse la somme des parties.",
    famille: "Un favoritisme affectueux et chaleureux caractérise ce lien — tu éprouves une sympathie instinctive qui adoucit même les pires désaccords.",
  },
  active: {
    amour: "La mystérieuse étoile de la Fleur de Pêcher illumine ton lien — une attirance magnétique, presque irrationnelle, te pousse irrésistiblement l'un vers l'autre.",
    pro: "Tu exerces un charisme réciproque indéniable — cette sympathie naturelle fluidifie tes échanges et donne de l'éclat à ton duo.",
    famille: "Un favoritisme affectueux et chaleureux caractérise ce lien — tu éprouves une sympathie instinctive qui adoucit même les pires désaccords.",
  },
  inactive: {
    amour: "L'absence de cette étoile romantique n'est pas une faille — ton amour repose sur des fondations bien plus profondes et pérennes qu'une simple étincelle éphémère.",
    pro: "Ta relation repose sur le mérite et le respect des compétences, loin des jeux de séduction ou de favoritisme.",
    famille: "Un lien authentique et traditionnel — ton attachement se construit par la loyauté de l'histoire partagée, sans fioritures émotionnelles.",
  },
};

// ── FAMILY_CONTEXT_SUFFIX — contextualisation familiale ──

const FAMILY_CONTEXT_SUFFIX: Partial<Record<FamilleSubType | 'autre', string>> = {
  frere_frere:      "Entre frères, le respect passe souvent mieux par les actes que par les grands mots.",
  soeur_soeur:      "Entre sœurs, la finesse du lien demande de protéger la confiance autant que la franchise.",
  frere_soeur:      "Dans la fratrie mixte, ce lien évolue quand chacun cesse de rejouer sa place d'origine.",
  pere_fils:        "Entre un père et son fils, le lien s'apaise quand l'autorité laisse place à la reconnaissance mutuelle.",
  pere_fille:       "Entre un père et sa fille, le lien s'éclaire quand la protection sait aussi faire confiance.",
  mere_fils:        "Entre une mère et son fils, le lien grandit quand la transmission laisse de la place à l'autonomie.",
  mere_fille:       "Entre une mère et sa fille, le lien respire mieux quand l'amour ne cherche pas à tout contrôler.",
  gp_petit_fils:    "Un grand-père et son petit-fils partagent un fil invisible — la sagesse passe mieux par l'exemple que par la leçon.",
  gp_petite_fille:  "Un grand-père et sa petite-fille tissent un lien de tendresse rare — la mémoire s'adoucit quand elle est offerte sans attente.",
  gm_petit_fils:    "Une grand-mère et son petit-fils forment un duo complice — l'héritage prend vie quand il inspire plutôt qu'il n'oblige.",
  gm_petite_fille:  "Une grand-mère et sa petite-fille se reconnaissent à travers le temps — ce lien porte une douceur que les années n'effacent pas.",
  coloc:            "Ce lien quotidien demande une attention simple : respirer ensemble sans s'envahir.",
  ami:              "L'amitié choisie porte une liberté que les liens du sang n'ont pas — honore-la en restant vrai l'un envers l'autre.",
};

function appendFamilyContext(text: string, mode: BondMode, familleSubType?: FamilleSubType): string {
  if (mode !== 'famille' || !familleSubType) return text;
  const suffix = FAMILY_CONTEXT_SUFFIX[familleSubType];
  return suffix ? `${text} ${suffix}` : text;
}

// ══════════════════════════════════════
// ═══ BOND PRINCIPAL — calcBond() ═══
// ══════════════════════════════════════

export function calcBond(
  bdA: string, nameA: string,
  bdB: string, nameB: string,
  mode: BondMode = 'amour',
  familleSubType?: FamilleSubType
): BondResult {
  const signals: string[] = [];
  const alerts: string[] = [];
  const sameBirthdate = bdA === bdB;

  // ── 1. BaZi Compatibilité ──
  const birthDateA = new Date(bdA + 'T12:00:00');
  const birthDateB = new Date(bdB + 'T12:00:00');
  const bazi = calcBaZiCompat(birthDateA, birthDateB);
  // Ronde 9 (3/3) : normalisation BaZi corrigée — (score+34)/78×100
  // Ancien /1.2 était biaisé : [-30,+40] → [25,83] au lieu de [0,100]
  // Nouveau range après Ronde 9ter : [-34, +44] → [0, 100]
  const baziNorm = Math.max(0, Math.min(100, Math.round((bazi.score + 34) / 78 * 100)));
  signals.push(...bazi.signals);
  alerts.push(...bazi.alerts);

  // ── 2. Numérologie Compatibilité — Ronde 9 : sous-poids par mode ──
  const numero = calcNumeroCompat(bdA, nameA, bdB, nameB, mode);
  // Normaliser numérologie sur 0-100 (range brut 0-40)
  const numNorm = Math.max(0, Math.min(100, Math.round((numero.total / 40) * 100)));
  signals.push(...numero.signals);
  alerts.push(...numero.alerts);

  // ── 3. I Ching Compatibilité ──
  const iching = calcIChingCompat(bdA, bdB);
  // Ronde 9 (3/3) : normaliser I Ching sur 0-100 (nouveau range brut [-6, +16])
  const ichNorm = Math.max(0, Math.min(100, Math.round(((iching.score + 6) / 22) * 100)));
  signals.push(...iching.signals);
  alerts.push(...iching.alerts);

  // ── 4. Peach Blossom croisée — Ronde 13 (3/3) : 3 niveaux actifs ──
  const peachCrossed = bazi.peachBlossomCrossed;
  const peachLevel = bazi.peachBlossomLevel; // 0=inactif, 1=simple, 2=double
  // Ronde 13 (3/3 unanime) : Inactive 50 | Simple 70 | Double 90
  // Famille : toujours 50 (attraction romantique non pertinente — Grok audit V4.4c)
  const peachNorm = mode === 'famille' ? 50
    : peachLevel === 2 ? 90
    : peachLevel === 1 ? 70
    : 50;

  // ── Score global pondéré ──
  const w = WEIGHTS[mode];
  let rawBondScore = Math.round(
    baziNorm * w.bazi +
    numNorm * w.num +
    ichNorm * w.iching +
    peachNorm * w.peach
  );

  // ── Edge case : même date de naissance → cap 78 ──
  if (sameBirthdate) {
    rawBondScore = Math.min(78, rawBondScore);
    alerts.push('⚠️ Même date de naissance — complémentarité limitée (cap 78)');
  }

  // ── Bonus hexagramme archétypal — V4.7 Option C (pipeline transparent) ──
  // rawStructural = score avant bonus (peach=0 en famille)
  // archetypeBonus calculé depuis les 2 hexes du sous-type
  // rawFinalBeforeGaussian = rawStructural + archetypeBonus → Gaussian appliquée dessus
  let rawStructural: number | undefined;
  let archetypeBonus: number | undefined;
  let rawFinalBeforeGaussian: number | undefined;

  if (mode === 'famille' && familleSubType) {
    rawStructural = rawBondScore;
    archetypeBonus = calcArchetypeHexBonus(familleSubType, iching.hexA.hexNum, iching.hexB.hexNum);
    if (archetypeBonus > 0) {
      const hexPair = ARCHETYPE_HEX_PAIRS[familleSubType];
      const matchedHex = hexPair?.find(h => h === iching.hexA.hexNum || h === iching.hexB.hexNum);
      const cible = archetypeBonus === 2 ? 'tes deux thèmes natals' : "l'un de tes thèmes natals";
      // Ronde 9ter : affiché séparément, label "Résonance Archétypale — interprétation moderne"
      signals.push(`🌟 Résonance Archétypale : L'Hexagramme ${matchedHex} (${ARCHETYPE_NAMES[matchedHex!]}), symbole de ce lien, est présent dans ${cible} (+${archetypeBonus} affiché séparément)`);
    }
    // Ronde 9ter : bonus NON ajouté au score doctrinal principal — affiché séparément dans l'UI
    rawFinalBeforeGaussian = rawBondScore;
  }

  // ── Gaussian CDF normalization — Ronde 13 : Pro dédié μ=50,σ=16 (3/3 unanime) ──
  let scoreGlobal =
    mode === 'famille' ? bondGaussianCDFFamille(rawBondScore)
    : mode === 'pro' ? bondGaussianCDFPro(rawBondScore)
    : bondGaussianCDF(rawBondScore);

  // Re-appliquer le cap si même date
  if (sameBirthdate) scoreGlobal = Math.min(78, scoreGlobal);

  scoreGlobal = Math.max(0, Math.min(100, scoreGlobal));
  const label = mode === 'famille' ? getFamilleLabel(scoreGlobal) : getBondLabel(scoreGlobal);

  // ── Signal résurgence générationnelle (Gemini R2) ──
  if (mode === 'famille' && familleSubType &&
      (familleSubType.startsWith('gp_') || familleSubType.startsWith('gm_')) &&
      scoreGlobal >= 82) {
    signals.unshift('🌱 Résurgence générationnelle — résonance d\'âme exceptionnelle qui a sauté une génération');
  }

  // ── Desc différenciée selon famille × label ──
  const familleCategory = (mode === 'famille' && familleSubType)
    ? getFamilleCategory(familleSubType) : undefined;
  const familleDesc = (mode === 'famille' && familleCategory)
    ? (FAMILLE_DESC[label.name]?.[familleCategory] ?? label.desc) : undefined;

  // ── Conseil contextuel ──
  const conseil = buildBondConseil(mode, scoreGlobal, bazi, numero, iching, peachCrossed, familleSubType);

  // ── Breakdown — Ronde 11 narratif riche (GPT×Grok×Gemini) ──
  const lpA = calcLifePath(bdA);
  const lpB = calcLifePath(bdB);

  // Construire les technicals par système (signaux + alertes propres à chaque domaine)
  const baziTechs = [...bazi.signals, ...bazi.alerts];
  const numTechs = [...numero.signals, ...numero.alerts];
  const ichTechs = [...iching.signals, ...iching.alerts];
  // Ajouter Chemin de Vie comme premier technical numérologie
  numTechs.unshift(`Chemin de Vie ${lpA.v}×${lpB.v}`);
  // Ajouter hex numbers comme premier technical Yi King
  ichTechs.unshift(`#${iching.hexA.hexNum} ${HEX_NAMES[iching.hexA.hexNum] || ''} ↔ #${iching.hexB.hexNum} ${HEX_NAMES[iching.hexB.hexNum] || ''}`);

  // Suffixe familial uniquement sur BaZi (1er bloc) pour ne pas alourdir
  const baziDetail = appendFamilyContext(baziBriefText(bazi, mode), mode, familleSubType);
  const numDetail = lpRelationText(lpA.v, lpB.v, mode);
  const ichDetail = ichingBriefText(iching, mode);
  // Ronde 13 : texte Peach adapté au niveau (double/simple/inactif)
  const peachDetail = peachLevel === 2 ? PEACH_TEXT.double[mode]
    : peachLevel === 1 ? PEACH_TEXT.active[mode]
    : PEACH_TEXT.inactive[mode];
  const peachTechs = peachLevel === 2
    ? ['🌸🌸 Double Fleur de Pêcher — bidirectionnelle']
    : peachLevel === 1
    ? ['🌸 Fleur de Pêcher croisée — active']
    : [];

  const breakdown = [
    { system: 'BaZi', icon: '☯', score: baziNorm, weight: `${Math.round(w.bazi * 100)}%`,
      detail: baziDetail,
      technicals: baziTechs },
    { system: 'Numérologie', icon: '✦', score: numNorm, weight: `${Math.round(w.num * 100)}%`,
      detail: numDetail,
      technicals: numTechs },
    { system: 'Yi King', icon: '☰', score: ichNorm, weight: `${Math.round(w.iching * 100)}%`,
      detail: ichDetail,
      technicals: ichTechs },
    { system: 'Peach Blossom', icon: '🌸', score: peachNorm, weight: `${Math.round(w.peach * 100)}%`,
      detail: peachDetail,
      technicals: peachTechs },
  ];

  // ── Ronde 13 (3/3) : Badges "Golden Tickets" — signaux positifs visibles ──
  const badges: string[] = [];
  if (bazi.heavenlyCombination) badges.push('🌟 Fusion Céleste');
  // Fleur de Pêcher : badge visible uniquement hors mode famille (poids 0% en famille)
  if (mode !== 'famille') {
    if (peachLevel === 2) badges.push('🌸🌸 Double Fleur de Pêcher');
    else if (peachLevel === 1) badges.push('🌸 Fleur de Pêcher Active');
  }
  if (isMaster(lpA.v) && isMaster(lpB.v)) badges.push('✨ Maîtres Nombres en Résonance');
  if (iching.roiWen) badges.push('☯ Âmes Complémentaires (Roi Wen)');
  if (bazi.liuHe) badges.push('💫 Harmonie Terrestre (Liù Hé)');
  if (bazi.triad) badges.push('🔺 Triangle Sacré (San He)');

  // ── Ronde 13 (3/3) : Résumé narratif unifié — force majeure + défi + action ──
  // En mode famille, exclure Peach Blossom du tri (poids 0%, ne doit pas apparaître dans le résumé)
  const relevantBreakdown = mode === 'famille'
    ? breakdown.filter(b => b.system !== 'Peach Blossom')
    : [...breakdown];
  // Tri par contribution pondérée (score × poids) — reflète le vrai impact sur le score final
  const parseWeight = (w: string) => parseFloat(w) / 100;
  const sortedBreakdown = relevantBreakdown.sort((a, b) =>
    (b.score * parseWeight(b.weight)) - (a.score * parseWeight(a.weight))
  );
  const strongest = sortedBreakdown[0];
  const weakest = sortedBreakdown[sortedBreakdown.length - 1];

  const SYSTEM_LABELS: Record<string, Record<BondMode, string>> = {
    'BaZi': { amour: 'une complicité instinctive profonde', pro: 'une compatibilité de caractères naturelle', famille: 'une résonance de clan puissante' },
    'Numérologie': { amour: 'un alignement de valeurs remarquable', pro: 'une vision partagée et complémentaire', famille: 'des chemins de vie qui convergent' },
    'Yi King': { amour: 'une connexion spirituelle et symbolique', pro: 'une dynamique d\'évolution commune', famille: 'un héritage symbolique qui te relie' },
    'Peach Blossom': { amour: 'une attraction magnétique rare', pro: 'un charisme réciproque naturel', famille: 'une sympathie instinctive profonde' },
  };
  const SYSTEM_DEFIS: Record<string, Record<BondMode, string>> = {
    'BaZi': { amour: 'apprivoiser tes différences de caractère', pro: 'harmoniser tes rythmes de travail', famille: 'dépasser les tensions de tempérament' },
    'Numérologie': { amour: 'aligner tes aspirations profondes', pro: 'concilier tes visions stratégiques', famille: 'réconcilier des chemins de vie divergents' },
    'Yi King': { amour: 'trouver ton équilibre spirituel commun', pro: 'synchroniser tes dynamiques de changement', famille: 'accepter des héritages symboliques différents' },
    'Peach Blossom': { amour: 'construire au-delà de l\'attirance physique', pro: 'dépasser les apparences pour collaborer en profondeur', famille: 'ne pas confondre sympathie et véritable proximité' },
  };

  const forceText = SYSTEM_LABELS[strongest.system]?.[mode] || 'une connexion notable';
  const defiText = SYSTEM_DEFIS[weakest.system]?.[mode] || 'trouver ton équilibre';

  // Noms d'affichage français pour le résumé narratif
  const DISPLAY_NAME: Record<string, string> = { 'Peach Blossom': 'Fleur de Pêcher', 'BaZi': 'BaZi', 'Numérologie': 'Numérologie', 'Yi King': 'Yi King' };
  const strongName = DISPLAY_NAME[strongest.system] || strongest.system;

  let summary: string;
  if (scoreGlobal >= 85) {
    summary = `Ce lien repose sur ${forceText} (${strongName} à ${strongest.score}%). Ton principal défi sera de ${defiText}. Cultive cette connexion rare avec gratitude.`;
  } else if (scoreGlobal >= 65) {
    summary = `Ce lien brille par ${forceText} (${strongName} à ${strongest.score}%). Pour le renforcer, travaille à ${defiText}. L'effort conscient transformera le bon en excellent.`;
  } else if (scoreGlobal >= 45) {
    summary = `Ce lien a du potentiel grâce à ${forceText} (${strongName} à ${strongest.score}%). Le chemin de croissance passe par ${defiText}. Les différences sont un terrain d'apprentissage, pas un obstacle.`;
  } else {
    summary = `Ce lien t\'invite à ${defiText}. Même si les défis sont réels, ${forceText} (${strongName}) offre un point d'ancrage. La patience et la communication seront tes alliées.`;
  }

  // ── Ronde 17 (3/3 unanime) : Badge contextuel Score×Type (famille uniquement) ──
  const contextBadge = (mode === 'famille' && familleSubType)
    ? getContextBadge(scoreGlobal, familleSubType)
    : undefined;

  return {
    mode, scoreGlobal, label,
    bazi, numerology: numero, iching,
    peachCrossed, sameBirthdate,
    familleDesc, familleCategory,
    signals, alerts, conseil, summary, badges, breakdown,
    contextBadge,
    // V4.7 debug pipeline famille
    rawStructural,
    archetypeBonus,
    rawFinalBeforeGaussian,
  };
}

// ══════════════════════════════════════
// ═══ BOND QUOTIDIEN ═══
// ══════════════════════════════════════

/**
 * Score du couple pour un jour donné.
 * Croise : Peach Blossom quotidienne des deux + relation DM du jour + transit lunaire.
 */
export function calcBondDaily(
  bdA: string, bdB: string,
  targetDate: string
): BondDailyResult {
  const dateObj = new Date(targetDate + 'T12:00:00');
  const birthDateA = new Date(bdA + 'T12:00:00');
  const birthDateB = new Date(bdB + 'T12:00:00');

  const signals: string[] = [];
  const alerts: string[] = [];
  let rawScore = 50; // Base neutre

  // ── Peach Blossom du jour pour chacun ──
  const peachA = getPeachBlossom(birthDateA, dateObj);
  const peachB = getPeachBlossom(birthDateB, dateObj);
  if (peachA.active) { rawScore += 8; signals.push(`🌸 Fleur de Pêcher active pour ${bdA.split('-')[0]}`); }
  if (peachB.active) { rawScore += 8; signals.push(`🌸 Fleur de Pêcher active pour ${bdB.split('-')[0]}`); }
  if (peachA.active && peachB.active) { rawScore += 5; signals.push('💫 Double Fleur de Pêcher — journée exceptionnelle !'); }

  // ── Day Masters du jour ──
  const pillarA = calcDayMaster(birthDateA);
  const pillarB = calcDayMaster(birthDateB);
  const dailyPillar = calcDayMaster(dateObj);

  // Si le DM du jour est dans la triade de l'un des partenaires
  const dailyBranch = dailyPillar.branch.index;

  // Check si le jour favorise la relation (branche du jour = Liù Hé d'un des partenaires)
  const liuHeA = LIU_HE_PAIRS.some(([a, b]) =>
    (a === pillarA.branch.index && b === dailyBranch) || (b === pillarA.branch.index && a === dailyBranch)
  );
  const liuHeB = LIU_HE_PAIRS.some(([a, b]) =>
    (a === pillarB.branch.index && b === dailyBranch) || (b === pillarB.branch.index && a === dailyBranch)
  );

  if (liuHeA && liuHeB) {
    rawScore += 12;
    signals.push('🤝 Liù Hé double — le jour unit les deux partenaires');
  } else if (liuHeA || liuHeB) {
    rawScore += 5;
    signals.push('🤝 Liù Hé — le jour soutient un partenaire');
  }

  // ── Clash du jour avec un partenaire ──
  const clashA = CLASHES.some(([a, b]) =>
    (a === pillarA.branch.index && b === dailyBranch) || (b === pillarA.branch.index && a === dailyBranch)
  );
  const clashB = CLASHES.some(([a, b]) =>
    (a === pillarB.branch.index && b === dailyBranch) || (b === pillarB.branch.index && a === dailyBranch)
  );

  if (clashA && clashB) {
    rawScore -= 12;
    alerts.push('⚔️ Double opposition — tension maximale pour le couple');
  } else if (clashA || clashB) {
    rawScore -= 5;
    alerts.push('⚔️ Opposition — un partenaire est sous tension');
  }

  // Clamp 5-97
  const score = Math.max(5, Math.min(97, rawScore));
  const label = getBondLabel(score);

  return { date: targetDate, score, label, signals, alerts };
}

// ══════════════════════════════════════
// ═══ CONSEIL CONTEXTUEL ═══
// ══════════════════════════════════════

function buildBondConseil(
  mode: BondMode, score: number,
  bazi: BaZiCompatResult,
  numero: NumeroCompatResult,
  iching: IChingCompatResult,
  peachCrossed: boolean,
  familleSubType?: FamilleSubType
): string {

  // ── Mode Famille — conseils différenciés par label × catégorie fine (Ronde 12) ──
  if (mode === 'famille') {
    // Catégorie fine du sous-type — frère/sœur/mixte séparés
    const sub = familleSubType ?? 'frere_soeur';
    const cat =
      sub === 'coloc' ? 'coloc'
      : sub === 'ami' ? 'ami'
      : sub === 'frere_frere' ? 'frere'
      : sub === 'soeur_soeur' ? 'soeur'
      : sub === 'frere_soeur' ? 'fratrie_mixte'
      : sub === 'pere_fils' ? 'pere_fils'
      : sub === 'pere_fille' ? 'pere_fille'
      : sub === 'mere_fils' ? 'mere_fils'
      : sub === 'mere_fille' ? 'mere_fille'
      : sub === 'gp_petit_fils' ? 'gp_petit_fils'
      : sub === 'gp_petite_fille' ? 'gp_petite_fille'
      : sub === 'gm_petit_fils' ? 'gm_petit_fils'
      : sub === 'gm_petite_fille' ? 'gm_petite_fille'
      : 'parent';

    // Conseils indexés par [label][catégorie fine] — Ronde 12
    const CONSEILS: Record<string, Record<string, string>> = {
      'Lien de Vie Profond': {
        frere:            "Entre frères, ta loyauté dépasse les mots. Ce lien ancien te demande de te respecter comme deux forces égales, chacune indispensable à l'autre.",
        soeur:            "Entre sœurs, ta complicité touche à l'âme. Ce lien profond t\'invite à protéger la confiance mutuelle comme un trésor transmis par le sang.",
        fratrie_mixte:    "Ton lien fraternel cache une loyauté ancienne. Respecte tes différences comme deux piliers d'une même maison.",
        pere_fils:        "Ce lien père-fils porte une mémoire fondatrice. Transmets l'essentiel sans modeler — le fils trouve sa voie en marchant, pas en suivant.",
        pere_fille:       "Ce lien père-fille recèle une tendresse ancienne. Offre la confiance avant la protection — c'est elle qui libère vraiment.",
        mere_fils:        "Ce lien mère-fils porte une empreinte profonde. Aime sans retenir — l'autonomie du fils honore ce que tu as bâti.",
        mere_fille:       "Ce lien mère-fille touche à quelque chose d'ancestral. Guide sans enfermer — la fille grandit quand l'amour cesse de tout contrôler.",
        parent:           "Ce lien marque une étape fondatrice. Transmets sans modeler, comme on tend la main sans retenir.",
        gp_petit_fils:    "Une sagesse ancienne circule entre grand-père et petit-fils. L'héritage se transmet mieux par l'exemple que par la leçon.",
        gp_petite_fille:  "Le lien grand-père–petite-fille porte une douceur rare. Offre ton expérience comme un cadeau, sans attendre de retour.",
        gm_petit_fils:    "La complicité grand-mère–petit-fils est un trésor discret. L'histoire familiale prend vie quand elle inspire plutôt qu'elle n'oblige.",
        gm_petite_fille:  "Une mémoire du cœur relie grand-mère et petite-fille à travers le temps. Ce fil d'or ne demande qu'à être entretenu avec tendresse.",
        coloc:            "Ta rencontre a du sens. Préserve ton espace intérieur comme une pièce à clé personnelle.",
        ami:              "Cette amitié porte une reconnaissance d'âme rare. Entretiens ce lien librement choisi — c'est sa gratuité qui fait sa puissance.",
      },
      fusionnel: {
        frere:            "Ta complicité fraternelle est instinctive et puissante. Laisse-toi respirer pour que la proximité reste une force, jamais un poids.",
        soeur:            "Ta connexion sororale est lumineuse et enveloppante. Garde un espace rien qu'à toi pour que cette chaleur ne devienne jamais étouffante.",
        fratrie_mixte:    "Ta complicité est instinctive. Laisse chacun respirer pour éviter que la proximité ne devienne étouffante.",
        pere_fils:        "L'attachement père-fils est fort, presque instinctif. Desserre l\'étreinte — la confiance du fils grandit dans l\'espace que tu lui offres.",
        pere_fille:       "La tendresse père-fille est naturellement enveloppante. Laisse-la s'affirmer — la distance choisie renforce le lien.",
        mere_fils:        "L'osmose mère-fils est puissante et protectrice. Laisse l'indépendance grandir — c'est le plus beau cadeau d'une mère.",
        mere_fille:       "Le miroir mère-fille est à la fois lumineux et exigeant. Garde un espace pour que chacune reste elle-même dans cette proximité.",
        parent:           "L'attachement est fort, presque enveloppant. Desserrer légèrement l'étreinte renforce la confiance.",
        gp_petit_fils:    "La tendresse du grand-père coule avec une pudeur touchante. Un cadre simple suffit pour que l'intention ne devienne pas étouffante.",
        gp_petite_fille:  "Le grand-père enveloppe sa petite-fille d'une affection discrète. Garde la légèreté — c'est elle qui rend ce lien précieux.",
        gm_petit_fils:    "La grand-mère offre à son petit-fils un amour sans condition. Veille à ce que la générosité laisse aussi grandir l\'autonomie.",
        gm_petite_fille:  "L\'amour grand-mère–petite-fille est un fleuve tranquille. Que l\'indulgence nourrisse sans devenir un refuge qui empêche d\'avancer.",
        coloc:            "La cohabitation semble fluide. Définis les territoires pour préserver l\'équilibre.",
        ami:              "Ton amitié est intense et enveloppante. Garde chacun un jardin secret — la liberté préserve les liens choisis.",
      },
      complementaire: {
        frere:            "Tu compenses naturellement les angles morts de l\'autre. Cette complémentarité fraternelle est ta plus grande richesse — valorise-la au lieu de la comparer.",
        soeur:            "Tes forces se complètent avec une évidence rare. Ce tandem sororal brille quand chacune laisse l\'autre occuper pleinement sa place.",
        fratrie_mixte:    "Tu compenses les failles de l\'autre. Valorise ces différences au lieu de les comparer.",
        pere_fils:        "Le père apporte au fils ce qu'il ignore encore. Fais de cette transmission un pont, pas un terrain d'attente.",
        pere_fille:       "Le père offre à sa fille une assise que rien ne remplace. Complète-toi en laissant la confiance circuler dans les deux sens.",
        mere_fils:        "La mère devine chez son fils ce qu'il n'ose pas dire. Transforme cette intuition en dialogue ouvert.",
        mere_fille:       "La mère et la fille se complètent comme deux faces d'un même miroir. Ose nommer ce qui unit autant que ce qui distingue.",
        parent:           "L'un apporte ce que l'autre ignore. Fais-en un pont plutôt qu'un terrain d'attente.",
        gp_petit_fils:    "Le grand-père transmet au petit-fils par l'exemple plus que par la parole. Un rituel partagé — une marche, un outil — nourrit le lien.",
        gp_petite_fille:  "Le grand-père offre à sa petite-fille une stabilité que les mots ne suffisent pas à décrire. Un geste régulier suffit à ancrer ce lien.",
        gm_petit_fils:    "La grand-mère porte la mémoire vivante que le petit-fils saura réinventer. Un repas, un récit — la transmission passe par le simple.",
        gm_petite_fille:  "Grand-mère et petite-fille forment un tandem de transmission naturel. L'héritage coule quand il est offert avec légèreté.",
        coloc:            "Tes forces s'équilibrent. Clarifie les responsabilités comme on trace une carte.",
        ami:              "Tes talents se complètent naturellement. Cette amitié brille quand chacun occupe sa place sans rivaliser.",
      },
      croissance: {
        frere:            "Tes frictions fraternelles ne sont pas des obstacles mais des meules qui t'affûtent. Grandis côte à côte sans chercher à prouver qui a raison.",
        soeur:            "Ce lien sororal te pousse à te dépasser. Les moments de tension sont des invitations déguisées à mieux te comprendre.",
        fratrie_mixte:    "Les tensions sont des pierres qui polissent. Accepte-les comme un apprentissage commun.",
        pere_fils:        "Le lien père-fils traverse une mue nécessaire. Le fils a besoin de place pour devenir — soutiens sans diriger.",
        pere_fille:       "Le père et sa fille grandissent ensemble à travers les ajustements. Fais confiance à ce qui émerge plutôt qu'à ce que tu planifies.",
        mere_fils:        "Le lien mère-fils évolue vers un nouveau chapitre. Le fils a besoin de sentir que partir, c'est aussi honorer ce lien.",
        mere_fille:       "La relation mère-fille se réinvente à chaque étape. Accompagne le changement en acceptant que la fille trace sa propre route.",
        parent:           "Une étape de séparation s'annonce. Soutiens sans diriger chaque pas.",
        gp_petit_fils:    "Le grand-père apprend à lâcher prise sur ce qu'il connaissait. Le petit-fils en fera quelque chose de neuf — fais-lui confiance.",
        gp_petite_fille:  "Le lien grand-père–petite-fille évolue avec la douceur du temps. Ajuste tes attentes avec la patience que tu as toujours su montrer.",
        gm_petit_fils:    "Les rôles évoluent et la grand-mère le sait mieux que quiconque. Laisse le petit-fils réinventer ce lien à sa manière.",
        gm_petite_fille:  "Grand-mère et petite-fille traversent ensemble une étape de transformation. Le lien se renouvelle quand chacune accepte de changer.",
        coloc:            "Les frictions révèlent les habitudes. Parle tôt pour éviter les silences lourds.",
        ami:              "L'amitié grandit à travers les désaccords assumés. Dites ce qui compte avant que le non-dit ne prenne racine.",
      },
      transformation: {
        frere:            "Le feu entre frères peut brûler ou forger. Pose des limites franches — la clarté est ta meilleure alliée.",
        soeur:            "L'intensité entre sœurs demande du courage. Nomme ce qui doit l'être avec douceur, la vérité libère plus qu'elle ne blesse.",
        fratrie_mixte:    "Le feu peut brûler ou éclairer. Pose des limites claires pour éviter l'escalade.",
        pere_fils:        "Certains schémas père-fils demandent à être nommés. Le fils se libère quand le père accepte de ne plus avoir toutes les réponses.",
        pere_fille:       "Le lien père-fille peut porter des attentes silencieuses. Nomme-les avec douceur — la vérité renforce ce que le silence fragilise.",
        mere_fils:        "Des attentes maternelles anciennes pèsent parfois sur le fils. L'amour se renforce quand il cesse d'être conditionnel.",
        mere_fille:       "Le miroir mère-fille peut amplifier les tensions autant que les joies. Revisite les attentes pour que l'amour redevienne léger.",
        parent:           "Certains schémas demandent à être nommés. La vérité dite calmement libère.",
        gp_petit_fils:    "Des blessures anciennes peuvent remonter par la lignée masculine. Écoute le silence du grand-père — il en dit souvent plus que ses mots.",
        gp_petite_fille:  "Le grand-père porte parfois des non-dits d'un autre temps. Sa petite-fille peut adoucir ces silences en offrant sa présence sans exiger de mots.",
        gm_petit_fils:    "La grand-mère transmet parfois des non-dits d'une autre époque. Le petit-fils peut transformer cet héritage en choisissant ce qu'il garde.",
        gm_petite_fille:  "Entre grand-mère et petite-fille, les blessures anciennes se transmettent parfois en silence. Offre-toi l'écoute que les générations passées n'ont pas eue.",
        coloc:            "La tension signale un déséquilibre. Redéfinir les règles peut tout changer.",
        ami:              "Cette amitié traverse une zone de turbulence. Pose les mots avec franchise — un vrai ami préfère la vérité au confort.",
      },
      profond: {
        frere:            "L'intensité entre frères peut être volcanique. Prends du recul avant de répondre — le silence peut guérir autant que les mots.",
        soeur:            "Ce lien sororal porte des émotions puissantes. Accorde-toi des pauses pour que la profondeur ne devienne pas une charge.",
        fratrie_mixte:    "L'intensité émotionnelle est forte. Prends du recul avant de répondre.",
        pere_fils:        "Les émotions père-fils peuvent être brutes et silencieuses. Installe des moments courts d'apaisement — un geste vaut parfois mille mots.",
        pere_fille:       "Le lien père-fille porte des émotions profondes, parfois non dites. Un mot juste au bon moment peut dénouer ce que des années de silence ont tissé.",
        mere_fils:        "Le lien mère-fils porte parfois plus qu'il ne devrait. Allège-le en partageant le poids de l'histoire à voix haute.",
        mere_fille:       "L'intensité mère-fille peut être lumineuse et lourde à la fois. Accorde-toi des pauses pour que la profondeur reste une force.",
        parent:           "Les émotions peuvent être puissantes. Installe des moments courts mais réguliers d'apaisement.",
        gp_petit_fils:    "Le passé pèse parfois sur la lignée masculine. Grand-père et petit-fils peuvent choisir ensemble ce qu'ils gardent et ce qu'ils libèrent.",
        gp_petite_fille:  "Le grand-père transmet à sa petite-fille une charge émotionnelle parfois insoupçonnée. Prends ce qui nourrit, libère le reste avec douceur.",
        gm_petit_fils:    "L'héritage émotionnel de la grand-mère touche le petit-fils de façon inattendue. Accueille ce qui résonne, laisse aller ce qui ne t\'appartient pas.",
        gm_petite_fille:  "Entre grand-mère et petite-fille, l'héritage est à la fois un trésor et un poids. Choisis consciemment ce que tu portes et ce que tu déposes.",
        coloc:            "Si l\'atmosphère devient dense, ajuste la distance. L\'espace protège la relation.",
        ami:              "L'amitié porte parfois des émotions plus lourdes qu'on ne l'imagine. Prends soin de ce lien — il mérite autant d'attention qu'un lien de sang.",
      },
    };

    // Sélection du conseil selon le score
    const labelKey =
      score >= 91 ? 'Lien de Vie Profond'
      : score >= 79 ? 'fusionnel'
      : score >= 64 ? 'complementaire'
      : score >= 48 ? 'croissance'
      : score >= 32 ? 'transformation'
      : 'profond';

    // Enrichissement optionnel si Combinaison Divine
    const baseConseil = CONSEILS[labelKey][cat];
    if (score >= 91 && bazi.heavenlyCombination) {
      return `${baseConseil} La Combinaison ${bazi.heavenlyCombination.label} scelle un lien d'âmes rare.`;
    }
    return baseConseil;
  }

  // ── Mode Amour / Pro (inchangé) ──
  const modeLabel = mode === 'amour' ? 'amoureux' : 'professionnel';

  if (score >= 90) {
    if (bazi.heavenlyCombination) {
      return mode === 'amour'
        ? `Connexion exceptionnelle ! La Combinaison Divine ${bazi.heavenlyCombination.label} crée un lien d'âme rare. L'alchimie amoureuse se manifeste naturellement — laisse l'énergie circuler sans forcer.`
        : `Connexion exceptionnelle ! La Combinaison Divine ${bazi.heavenlyCombination.label} crée un lien d'âme rare. Côté professionnel, c'est un duo qui peut déplacer des montagnes — capitalise sur cette synergie naturelle.`;
    }
    return mode === 'amour'
      ? `Alignement remarquable. Les systèmes convergent vers une complicité amoureuse naturelle. Cultive cette connexion avec gratitude — elle est rare.`
      : `Alignement remarquable. Les systèmes convergent vers un partenariat professionnel exceptionnel. Ce duo a le potentiel de créer quelque chose de grand — structure-le avec confiance.`;
  }

  if (score >= 78) {
    const bestSystem = bazi.score > numero.total ? 'le BaZi' : 'la Numérologie';
    return mode === 'amour'
      ? `Belle alchimie ! ${bestSystem.charAt(0).toUpperCase() + bestSystem.slice(1)} est le moteur principal de ta connexion amoureuse. ${peachCrossed ? 'La Fleur de Pêcher croisée amplifie l\'attraction physique.' : 'Investis dans la communication pour amplifier le potentiel.'}`
      : `Belle alchimie ! ${bestSystem.charAt(0).toUpperCase() + bestSystem.slice(1)} est le moteur principal de cette collaboration. ${peachCrossed ? 'Le charisme mutuel est un atout — utilise-le dans les négociations.' : 'Clarifie les rôles pour transformer cette compatibilité en résultats concrets.'}`;
  }

  if (score >= 65) {
    return mode === 'amour'
      ? `Synergie solide sur le plan amoureux. Quelques zones de friction ${bazi.alerts.length > 0 ? `(${bazi.alerts[0].split('—')[0].trim()})` : ''} stimulent la croissance mutuelle. L'effort conscient transforme le bon en excellent.`
      : `Synergie solide côté professionnel. ${bazi.alerts.length > 0 ? `Un point de vigilance : ${bazi.alerts[0].split('—')[0].trim().toLowerCase()}. ` : ''}Définis clairement les responsabilités pour que les complémentarités jouent à plein.`;
  }

  if (score >= 50) {
    return mode === 'amour'
      ? `Potentiel amoureux à cultiver. ${numero.signals.length > 0 ? numero.signals[0] + '.' : ''} Les différences sont un terrain d'apprentissage — ni obstacle, ni force automatique.`
      : `Potentiel professionnel à cultiver. ${numero.signals.length > 0 ? numero.signals[0] + '.' : ''}Mise sur des projets courts et cadrés pour construire la confiance avant de viser plus grand.`;
  }

  if (score >= 35) {
    const mainTension = bazi.alerts[0] || numero.alerts[0] || 'Vibrations différentes';
    return mode === 'amour'
      ? `Friction amoureuse significative. ${mainTension}. Cette tension peut devenir créative si chacun accepte la nature profonde de l'autre.`
      : `Friction professionnelle significative. ${mainTension}. Cette tension peut devenir productive si les rôles sont bien séparés et les attentes clairement posées.`;
  }

  return mode === 'amour'
    ? `Défi amoureux majeur. Les systèmes détectent des frictions profondes. Cela ne veut pas dire "impossible" — mais cela demande un travail conscient et beaucoup de patience.`
    : `Défi professionnel majeur. Les frictions détectées compliquent la collaboration au quotidien. Si ce partenariat est nécessaire, structure au maximum les échanges et délimite clairement les territoires.`;
}
