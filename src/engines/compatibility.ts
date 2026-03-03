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
import { calcNatalIChing, type IChingReading, TRIGRAM_NAMES } from './iching';
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

// Variante Famille — μ=58, σ=16 (consensus R2 Grok+Gemini — distribution réaliste familles saines)
// Médiane finale ≈67%, ~44% Complémentaire, ~26% Fusionnel, ~5% Karmique
function bondGaussianCDFFamille(rawScore: number): number {
  const z = (rawScore - 58) / 16;
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
  | 'coloc';

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
  breakdown: { system: string; icon: string; score: number; weight: string; detail: string }[];
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
const NUM_COMPAT: Record<string, number> = {
  '1-1': 7,  '1-2': 6,  '1-3': 8,  '1-4': 4,  '1-5': 8,  '1-6': 5,  '1-7': 5,  '1-8': 7,  '1-9': 6,
  '2-2': 6,  '2-3': 7,  '2-4': 8,  '2-5': 3,  '2-6': 9,  '2-7': 5,  '2-8': 6,  '2-9': 7,
  '3-3': 7,  '3-4': 3,  '3-5': 7,  '3-6': 8,  '3-7': 4,  '3-8': 5,  '3-9': 9,
  '4-4': 6,  '4-5': 4,  '4-6': 7,  '4-7': 5,  '4-8': 9,  '4-9': 3,
  '5-5': 7,  '5-6': 4,  '5-7': 8,  '5-8': 5,  '5-9': 7,
  '6-6': 7,  '6-7': 3,  '6-8': 4,  '6-9': 8,
  '7-7': 8,  '7-8': 4,  '7-9': 5,
  '8-8': 7,  '8-9': 6,
  '9-9': 7,
};

// Bonus maîtres × maîtres
const MASTER_BONUS: Record<string, number> = {
  '11-11': 9, '11-22': 10, '11-33': 8,
  '22-22': 8, '22-33': 9,
  '33-33': 8,
};

// Poids par mode
const WEIGHTS: Record<BondMode, { bazi: number; num: number; iching: number; peach: number }> = {
  amour:   { bazi: 0.40, num: 0.30, iching: 0.20, peach: 0.10 },
  pro:     { bazi: 0.30, num: 0.35, iching: 0.25, peach: 0.10 },
  famille: { bazi: 0.38, num: 0.37, iching: 0.25, peach: 0.00 }, // Peach Blossom = 0 en famille (Grok audit V4.4c)
};

// Labels de compatibilité
const BOND_LABELS: { min: number; label: BondLabel }[] = [
  { min: 90, label: { name: 'Âmes Sœurs',       icon: '💫', color: '#E0B0FF', desc: 'Connexion exceptionnelle — lien karmique rare' } },
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

// Labels spécifiques mode Famille
// Seuils R2 consensus (Grok simulation 10k paires): 91/79/64/48/32
const FAMILLE_LABELS: { min: number; label: BondLabel }[] = [
  { min: 91, label: { name: 'Lien Karmique',         icon: '🌟', color: '#E0B0FF', desc: 'Connexion familiale exceptionnelle — lien d\'âme profond' } },
  { min: 79, label: { name: 'Lien Fusionnel',         icon: '💛', color: '#FFD700', desc: 'Complicité naturelle — harmonie et soutien mutuel' } },
  { min: 64, label: { name: 'Lien Complémentaire',    icon: '🌿', color: '#4ade80', desc: 'Différences enrichissantes — force dans la diversité' } },
  { min: 48, label: { name: 'Lien de Croissance',     icon: '🌱', color: '#60a5fa', desc: 'Apprentissage mutuel — chacun grandit grâce à l\'autre' } },
  { min: 32, label: { name: 'Lien de Transformation', icon: '🔥', color: '#f59e0b', desc: 'Tensions formatrices — croissance par le défi' } },
  { min: 0,  label: { name: 'Lien Profond',           icon: '⚡', color: '#a78bfa', desc: 'Opposition forte — leçon karmique importante' } },
];

function getFamilleLabel(score: number): BondLabel {
  for (const { min, label } of FAMILLE_LABELS) {
    if (score >= min) return label;
  }
  return FAMILLE_LABELS[FAMILLE_LABELS.length - 1].label;
}

// Catégorie selon sous-type (pour desc différenciées)
function getFamilleCategory(sub: FamilleSubType): 'fratrie' | 'parent' | 'grands_parents' {
  if (sub === 'coloc' || sub.startsWith('frere') || sub.startsWith('soeur')) return 'fratrie';
  if (sub.startsWith('gp_') || sub.startsWith('gm_')) return 'grands_parents';
  return 'parent';
}

// Descriptions différenciées 3 familles × 6 labels (GPT+Gemini R2)
export const FAMILLE_DESC: Record<string, Record<string, string>> = {
  'Lien Karmique': {
    fratrie:       "Miroir d\'âme puissant — loyauté fraternelle indéfectible",
    parent:        "Héritage d\'âme majeur — transmission karmique profonde",
    grands_parents:"Résurgence d\'âme — le clan se reconnaît à travers les âges",
  },
  'Lien Fusionnel': {
    fratrie:       "Complicité instinctive — proximité naturelle et vibrante",
    parent:        "Osmose profonde — attachement fort, cœur à cœur",
    grands_parents:"Complicité protectrice absolue — racine et fleur",
  },
  'Lien Complémentaire': {
    fratrie:       "Forces opposées, équilibre naturel",
    parent:        "Filiation harmonieuse — respect naturel des rôles",
    grands_parents:"Transmission douce de la mémoire familiale",
  },
  'Lien de Croissance': {
    fratrie:       "Apprentissage mutuel par le frottement des ego",
    parent:        "Lien en évolution — passage vers l\'autonomie",
    grands_parents:"Pont curieux entre deux mondes et deux temps",
  },
  'Lien de Transformation': {
    fratrie:       "Tensions qui forgent le caractère — clarté nécessaire",
    parent:        "Schémas à nommer — rupture initiatique nécessaire",
    grands_parents:"Incompréhension générationnelle invitant à l\'effort",
  },
  'Lien Profond': {
    fratrie:       "Altérité radicale — respecter les distances s\'impose",
    parent:        "L\'enfant révèle l\'ombre du parent — miroir intense",
    grands_parents:"Rupture énergétique — histoire familiale complexe",
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

// V4.7: fonction extraite pour testabilité et transparence du pipeline
// hex1 = hexagramme natal personne A, hex2 = personne B
export function calcArchetypeHexBonus(subtype: FamilleSubType, hex1: number, hex2: number): number {
  const pair = ARCHETYPE_HEX_PAIRS[subtype];
  if (!pair) return 0;
  let bonus = 0;
  if (pair.includes(hex1)) bonus += 3;
  if (pair.includes(hex2)) bonus += 3;
  return Math.min(6, bonus);
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

function calcNumeroCompat(bdA: string, nameA: string, bdB: string, nameB: string): NumeroCompatResult {
  const signals: string[] = [];
  const alerts: string[] = [];

  // Life Path (poids 50%)
  const lpA = calcLifePath(bdA);
  const lpB = calcLifePath(bdB);
  const lpRaw = getNumCompat(lpA.v, lpB.v);
  const lpScore = Math.round(lpRaw * 2); // 0-20

  if (lpRaw >= 8) signals.push(`CdV ${lpA.v}×${lpB.v} — résonance forte`);
  else if (lpRaw <= 3) alerts.push(`CdV ${lpA.v}×${lpB.v} — vibrations très différentes`);

  // Expression (poids 30%)
  let exprScore = 0;
  if (nameA && nameB) {
    const exprA = calcExpression(nameA);
    const exprB = calcExpression(nameB);
    const exprRaw = getNumCompat(exprA.v, exprB.v);
    exprScore = Math.round(exprRaw * 1.2); // 0-12
    if (exprRaw >= 8) signals.push(`Expression ${exprA.v}×${exprB.v} — communication fluide`);
    else if (exprRaw <= 3) alerts.push(`Expression ${exprA.v}×${exprB.v} — langages différents`);
  }

  // Soul Urge (poids 20%)
  let soulScore = 0;
  if (nameA && nameB) {
    const soulA = calcSoul(nameA);
    const soulB = calcSoul(nameB);
    const soulRaw = getNumCompat(soulA.v, soulB.v);
    soulScore = Math.round(soulRaw * 0.8); // 0-8
    if (soulRaw >= 8) signals.push(`Âmes ${soulA.v}×${soulB.v} — désirs profonds alignés`);
    else if (soulRaw <= 3) alerts.push(`Âmes ${soulA.v}×${soulB.v} — motivations divergentes`);
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

// Relations entre éléments de trigrammes
const TRIGRAM_RELATIONS: Record<string, number> = {
  'same': 3,
  'produces': 4,
  'produced_by': 4,
  'destroys': -3,
  'destroyed_by': -3,
};

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

function calcIChingCompat(bdA: string, bdB: string): IChingCompatResult {
  const hexA = calcNatalIChing(bdA);
  const hexB = calcNatalIChing(bdB);
  const signals: string[] = [];
  const alerts: string[] = [];
  let score = 0;

  // Trigrammes partagés
  const trigramMatch = (hexA.lower === hexB.lower) || (hexA.upper === hexB.upper) ||
                       (hexA.lower === hexB.upper) || (hexA.upper === hexB.lower);
  if (trigramMatch) {
    score += 3;
    signals.push('☰ Trigramme partagé — langage symbolique commun');
  }

  // Relation élémentaire des trigrammes inférieurs
  const elemA = TRIGRAM_ELEMENT[hexA.lower] || 'Terre';
  const elemB = TRIGRAM_ELEMENT[hexB.lower] || 'Terre';
  const rel = getTrigramRelation(elemA, elemB);
  const relPts = TRIGRAM_RELATIONS[rel] || 0;
  score += relPts;

  if (relPts > 0) signals.push(`${TRIGRAM_NAMES[hexA.lower]} (${elemA}) ↔ ${TRIGRAM_NAMES[hexB.lower]} (${elemB}) — flux favorable`);
  if (relPts < 0) alerts.push(`${TRIGRAM_NAMES[hexA.lower]} (${elemA}) ↔ ${TRIGRAM_NAMES[hexB.lower]} (${elemB}) — tension élémentaire`);

  // Hexagrammes complémentaires (inversés = 65 - hexNum)
  const complementary = (hexA.hexNum + hexB.hexNum === 65);
  if (complementary) {
    score += 2;
    signals.push('☯ Hexagrammes complémentaires — union des opposés');
  }

  // Même hexagramme
  if (hexA.hexNum === hexB.hexNum) {
    score -= 1;
    alerts.push(`Même hexagramme natal #${hexA.hexNum} — trop similaire, peu de croissance mutuelle`);
  }

  const elementMatch = elemA === elemB;

  score = Math.max(-8, Math.min(8, score));

  return { hexA, hexB, trigramMatch, elementMatch, score, signals, alerts };
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
  // Normaliser BaZi sur 0-100 (range brut [-30, +40])
  // Normalisation BaZi symétrique — Grok audit V4.4c: zéro affinité → 50% (ancienne formule donnait 43%)
  const baziNorm = Math.max(0, Math.min(100, Math.round(50 + (bazi.score / 1.2))));
  signals.push(...bazi.signals);
  alerts.push(...bazi.alerts);

  // ── 2. Numérologie Compatibilité ──
  const numero = calcNumeroCompat(bdA, nameA, bdB, nameB);
  // Normaliser numérologie sur 0-100 (range brut 0-40)
  const numNorm = Math.max(0, Math.min(100, Math.round((numero.total / 40) * 100)));
  signals.push(...numero.signals);
  alerts.push(...numero.alerts);

  // ── 3. I Ching Compatibilité ──
  const iching = calcIChingCompat(bdA, bdB);
  // Normaliser I Ching sur 0-100 (range brut [-8, +8])
  const ichNorm = Math.max(0, Math.min(100, Math.round(((iching.score + 8) / 16) * 100)));
  signals.push(...iching.signals);
  alerts.push(...iching.alerts);

  // ── 4. Peach Blossom croisée ──
  const peachCrossed = bazi.peachBlossomCrossed;
  // Famille : Peach Blossom forcée à 50 (neutre) — attraction romantique non pertinente (Grok audit V4.4c)
  const peachNorm = mode === 'famille' ? 50 : (peachCrossed ? 100 : 30);

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
    rawStructural = rawBondScore; // peach.weight=0 → rawBondScore = baziNorm×0.38 + numNorm×0.37 + ichNorm×0.25
    archetypeBonus = calcArchetypeHexBonus(familleSubType, iching.hexA.hexNum, iching.hexB.hexNum);
    if (archetypeBonus > 0) {
      const hexPair = ARCHETYPE_HEX_PAIRS[familleSubType];
      const matchedHex = hexPair?.find(h => h === iching.hexA.hexNum || h === iching.hexB.hexNum);
      const cible = archetypeBonus === 6 ? 'vos deux thèmes natals' : "l'un de vos thèmes natals";
      signals.push(`🌟 Magie Archétypale : L'Hexagramme ${matchedHex} (${ARCHETYPE_NAMES[matchedHex!]}), symbole de ce lien, est présent dans ${cible}`);
    }
    rawBondScore = Math.min(98, rawBondScore + archetypeBonus);
    rawFinalBeforeGaussian = rawBondScore;
  }

  // ── Gaussian CDF normalization — μ=58 famille (R2 consensus Grok+Gemini) ──
  let scoreGlobal = mode === 'famille' ? bondGaussianCDFFamille(rawBondScore) : bondGaussianCDF(rawBondScore);

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

  // ── Breakdown ──
  const breakdown = [
    { system: 'BaZi', icon: '干', score: baziNorm, weight: `${Math.round(w.bazi * 100)}%`, detail: bazi.signals[0] || bazi.alerts[0] || 'Neutre' },
    { system: 'Numérologie', icon: '✦', score: numNorm, weight: `${Math.round(w.num * 100)}%`, detail: `CdV ${calcLifePath(bdA).v}×${calcLifePath(bdB).v}` },
    { system: 'Yi King', icon: '☰', score: ichNorm, weight: `${Math.round(w.iching * 100)}%`, detail: `#${iching.hexA.hexNum} ↔ #${iching.hexB.hexNum}` },
    { system: 'Peach Blossom', icon: '🌸', score: peachNorm, weight: `${Math.round(w.peach * 100)}%`, detail: peachCrossed ? 'Attraction croisée active' : 'Pas d\'attraction croisée' },
  ];

  return {
    mode, scoreGlobal, label,
    bazi, numerology: numero, iching,
    peachCrossed, sameBirthdate,
    familleDesc, familleCategory,
    signals, alerts, conseil, breakdown,
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
  if (peachA.active) { rawScore += 8; signals.push(`🌸 Peach Blossom active pour ${bdA.split('-')[0]}`); }
  if (peachB.active) { rawScore += 8; signals.push(`🌸 Peach Blossom active pour ${bdB.split('-')[0]}`); }
  if (peachA.active && peachB.active) { rawScore += 5; signals.push('💫 Double Peach Blossom — journée exceptionnelle !'); }

  // ── Day Masters du jour ──
  const pillarA = calcDayMaster(birthDateA);
  const pillarB = calcDayMaster(birthDateB);
  const dailyPillar = calcDayMaster(dateObj);

  // Si le DM du jour est dans la triade de l'un des partenaires
  const dailyBranch = dailyPillar.branch.index;

  // Check si le jour favorise la relation (branche du jour = Liu He d'un des partenaires)
  const liuHeA = LIU_HE_PAIRS.some(([a, b]) =>
    (a === pillarA.branch.index && b === dailyBranch) || (b === pillarA.branch.index && a === dailyBranch)
  );
  const liuHeB = LIU_HE_PAIRS.some(([a, b]) =>
    (a === pillarB.branch.index && b === dailyBranch) || (b === pillarB.branch.index && a === dailyBranch)
  );

  if (liuHeA && liuHeB) {
    rawScore += 12;
    signals.push('🤝 Liu He double — le jour unit les deux partenaires');
  } else if (liuHeA || liuHeB) {
    rawScore += 5;
    signals.push('🤝 Liu He — le jour soutient un partenaire');
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
    alerts.push('⚔️ Double clash — tension maximale pour le couple');
  } else if (clashA || clashB) {
    rawScore -= 5;
    alerts.push('⚔️ Clash — un partenaire est sous tension');
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

  // ── Mode Famille — 24 conseils différenciés (GPT R2 : 6 labels × 4 catégories) ──
  if (mode === 'famille') {
    // Catégorie du sous-type
    const sub = familleSubType ?? 'frere_soeur';
    const cat: 'fratrie' | 'parent' | 'grands_parents' | 'coloc' =
      sub === 'coloc' ? 'coloc'
      : (sub.startsWith('frere') || sub.startsWith('soeur')) ? 'fratrie'
      : (sub.startsWith('gp_') || sub.startsWith('gm_')) ? 'grands_parents'
      : 'parent';

    // 24 conseils indexés par [label][catégorie]
    const CONSEILS: Record<string, Record<string, string>> = {
      karmique: {
        fratrie:       "Votre rivalité cache une loyauté ancienne. Respectez vos différences comme deux piliers d'une même maison.",
        parent:        "Ce lien marque une étape fondatrice. Transmettez sans modeler, comme on tend la main sans retenir.",
        grands_parents:"Une mémoire profonde circule entre vous. Offrez l'histoire comme un héritage vivant, pas comme une règle.",
        coloc:         "Votre rencontre a du sens. Préservez votre espace intérieur comme une pièce à clé personnelle.",
      },
      fusionnel: {
        fratrie:       "Votre complicité est instinctive. Laissez chacun respirer pour éviter que la proximité ne devienne étouffante.",
        parent:        "L'attachement est fort, presque enveloppant. Desserrer légèrement l'étreinte renforce la confiance.",
        grands_parents:"La tendresse coule naturellement. Gardez un cadre simple pour éviter l'excès d'indulgence.",
        coloc:         "La cohabitation semble fluide. Définissez les territoires pour préserver l'équilibre.",
      },
      complementaire: {
        fratrie:       "Vous compensez les failles de l'autre. Valorisez ces différences au lieu de les comparer.",
        parent:        "L'un apporte ce que l'autre ignore. Faites-en un pont plutôt qu'un terrain d'attente.",
        grands_parents:"La transmission se fait naturellement. Un rituel régulier — un repas, une histoire — nourrit le lien.",
        coloc:         "Vos forces s'équilibrent. Clarifiez les responsabilités comme on trace une carte.",
      },
      croissance: {
        fratrie:       "Les tensions sont des pierres qui polissent. Acceptez-les comme un apprentissage commun.",
        parent:        "Une étape de séparation s'annonce. Soutenez sans diriger chaque pas.",
        grands_parents:"Les rôles évoluent avec le temps. Ajustez vos attentes comme on ajuste une paire de lunettes.",
        coloc:         "Les frictions révèlent les habitudes. Parlez tôt pour éviter les silences lourds.",
      },
      transformation: {
        fratrie:       "Le feu peut brûler ou éclairer. Posez des limites claires pour éviter l'escalade.",
        parent:        "Certains schémas demandent à être nommés. La vérité dite calmement libère.",
        grands_parents:"Des blessures anciennes peuvent remonter. Écoutez sans chercher à tout réparer.",
        coloc:         "La tension signale un déséquilibre. Redéfinir les règles peut tout changer.",
      },
      profond: {
        fratrie:       "L'intensité émotionnelle est forte. Prenez du recul avant de répondre.",
        parent:        "Les émotions peuvent être puissantes. Installez des moments courts mais réguliers d'apaisement.",
        grands_parents:"Le passé pèse parfois lourd. Choisissez consciemment ce que vous transmettez.",
        coloc:         "Si l'atmosphère devient dense, ajustez la distance. L'espace protège la relation.",
      },
    };

    // Sélection du conseil selon le score
    const labelKey =
      score >= 91 ? 'karmique'
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
      return `Connexion exceptionnelle ! La Combinaison Divine ${bazi.heavenlyCombination.label} crée un lien karmique rare. Sur le plan ${modeLabel}, c'est un alignement qui se manifeste naturellement — laissez l'énergie circuler sans forcer.`;
    }
    return `Alignement remarquable sur le plan ${modeLabel}. Les systèmes convergent vers une synergie naturelle. Cultivez cette connexion avec gratitude — elle est rare.`;
  }

  if (score >= 78) {
    const bestSystem = bazi.score > numero.total ? 'BaZi' : 'Numérologie';
    return `Belle alchimie ! Le ${bestSystem} est le moteur principal de votre connexion ${modeLabel}e. ${peachCrossed ? 'La Peach Blossom croisée amplifie l\'attraction physique.' : 'Investissez dans la communication pour amplifier le potentiel.'}`;
  }

  if (score >= 65) {
    return `Synergie solide sur le plan ${modeLabel}. Quelques zones de friction ${bazi.alerts.length > 0 ? `(${bazi.alerts[0].split('—')[0].trim()})` : ''} stimulent la croissance mutuelle. L'effort conscient transforme le bon en excellent.`;
  }

  if (score >= 50) {
    return `Potentiel ${modeLabel} à cultiver. ${numero.signals.length > 0 ? numero.signals[0] + '.' : ''} Les différences sont un terrain d'apprentissage — ni obstacle, ni force automatique.`;
  }

  if (score >= 35) {
    const mainTension = bazi.alerts[0] || numero.alerts[0] || 'Vibrations différentes';
    return `Friction ${modeLabel}e significative. ${mainTension}. Cette tension peut devenir créative si les deux personnes acceptent leurs différences fondamentales.`;
  }

  return `Défi ${modeLabel} majeur. Les systèmes détectent des frictions profondes. Cela ne veut pas dire "impossible" — mais cela demande un travail conscient et beaucoup de patience des deux côtés.`;
}
