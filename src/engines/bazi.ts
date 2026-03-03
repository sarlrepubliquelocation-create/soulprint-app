// ============================================================================
// SOULPRINT ORACLE V4.3 — bazi.ts
// BaZi Engine : Day Master, Éléments, Liu He, Shichen, 10 Gods (十神), 藏干
// V4.3: + Changsheng (十二長生), Na Yin (納音), 4 Shen Sha (神煞)
// V4.2: Hour Pillar (五鼠遁), Four Pillars (八字), Luck Pillars (大运)
// V4.1: + Luck Pillars (大运) — algorithme universel (Grok R8, vérifié Joey Yap)
// Sources : GPT R2 Bloc 1 (tables), Claude (impl.), Joey Yap, 三命通會, 淵海子平
// ============================================================================

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export type Element = 'Bois' | 'Feu' | 'Terre' | 'Métal' | 'Eau';
export type YinYang = 'Yang' | 'Yin';

export type ElementRelation =
  | 'same'
  | 'produces'
  | 'produced_by'
  | 'destroys'
  | 'destroyed_by';

export interface HeavenlyStem {
  index: number;
  chinese: string;
  pinyin: string;
  element: Element;
  yinYang: YinYang;
  archetype: string;
  strength: string;
  risk: string;
  businessAdvice: string;
}

export interface EarthlyBranch {
  index: number;
  chinese: string;
  pinyin: string;
  animal: string;
  element: Element;
  hours: string;
}

export interface DayPillar {
  stem: HeavenlyStem;
  branch: EarthlyBranch;
}

export interface DayMasterDailyResult {
  natalStem: HeavenlyStem;
  dailyStem: HeavenlyStem;
  relation: ElementRelation;
  score: number;
  liuHeMatch: boolean;
  liuHeBonus: number;
  totalScore: number;
  interaction: { dynamique: string; conseil: string };
}

export interface ShichenPeriod {
  branch: EarthlyBranch;
  conseil: string;
  tacheIdeale: string;
  aEviter: string;
}

export interface ShichenBonus {
  score: number;
  advice: string;
  shichen: ShichenPeriod;
}

// ─────────────────────────────────────────────
// CONSTANTES — TRONCS CÉLESTES (天干)
// ─────────────────────────────────────────────

export const HEAVENLY_STEMS: HeavenlyStem[] = [
  {
    index: 0, chinese: '甲', pinyin: 'Jiǎ',
    element: 'Bois', yinYang: 'Yang',
    archetype: 'Le Chêne Impérial',
    strength: 'Leadership visible, capacité à grandir rapidement et à dominer son environnement.',
    risk: 'Rigidité, refus du changement.',
    businessAdvice: 'Utilisez votre force naturelle pour créer des structures durables, mais restez ouvert aux nouvelles racines.'
  },
  {
    index: 1, chinese: '乙', pinyin: 'Yǐ',
    element: 'Bois', yinYang: 'Yin',
    archetype: 'Le Bambou Flexible',
    strength: 'Adaptabilité stratégique, résilience face à la pression.',
    risk: 'Manque de direction claire, dispersion.',
    businessAdvice: 'Utilisez votre flexibilité pour naviguer les crises, mais ancrez-vous dans une vision à long terme.'
  },
  {
    index: 2, chinese: '丙', pinyin: 'Bǐng',
    element: 'Feu', yinYang: 'Yang',
    archetype: 'Le Soleil Rayonnant',
    strength: 'Charisme naturel, capacité à inspirer et à éclairer les autres.',
    risk: 'Épuisement par sur-exposition, manque de profondeur.',
    businessAdvice: 'Utilisez votre rayonnement pour motiver les équipes, mais protégez votre énergie intérieure.'
  },
  {
    index: 3, chinese: '丁', pinyin: 'Dīng',
    element: 'Feu', yinYang: 'Yin',
    archetype: 'La Bougie Précise',
    strength: 'Clarté, précision, capacité à illuminer les détails.',
    risk: 'Perfectionnisme paralysant, peur de l\'ombre.',
    businessAdvice: 'Utilisez votre précision pour les opérations complexes, mais acceptez que certaines choses restent dans l\'ombre.'
  },
  {
    index: 4, chinese: '戊', pinyin: 'Wù',
    element: 'Terre', yinYang: 'Yang',
    archetype: 'La Montagne Stable',
    strength: 'Stabilité, fiabilité, capacité à porter de lourdes charges.',
    risk: 'Rigidité, résistance au changement.',
    businessAdvice: 'Utilisez votre stabilité pour bâtir des empires durables, mais apprenez à bouger quand le terrain tremble.'
  },
  {
    index: 5, chinese: '己', pinyin: 'Jǐ',
    element: 'Terre', yinYang: 'Yin',
    archetype: 'Le Jardin Cultivé',
    strength: 'Capacité à cultiver, à faire grandir les talents et les projets.',
    risk: 'Sur-attachement, difficulté à lâcher prise.',
    businessAdvice: 'Utilisez votre talent de cultivateur pour faire grandir les équipes, mais sachez quand il faut arracher les mauvaises herbes.'
  },
  {
    index: 6, chinese: '庚', pinyin: 'Gēng',
    element: 'Métal', yinYang: 'Yang',
    archetype: 'L\'Épée Tranchante',
    strength: 'Décision rapide, clarté, capacité à trancher dans le vif.',
    risk: 'Rigidité, manque de nuance.',
    businessAdvice: 'Utilisez votre tranchant pour les décisions difficiles, mais tempérez-le avec la sagesse.'
  },
  {
    index: 7, chinese: '辛', pinyin: 'Xīn',
    element: 'Métal', yinYang: 'Yin',
    archetype: 'Le Bijou Raffiné',
    strength: 'Raffinement, attention au détail, capacité à créer de la valeur perçue.',
    risk: 'Perfectionnisme excessif, peur de l\'imperfection.',
    businessAdvice: 'Utilisez votre raffinement pour créer des produits ou des marques premium, mais acceptez que la perfection soit l\'ennemi du bon.'
  },
  {
    index: 8, chinese: '壬', pinyin: 'Rén',
    element: 'Eau', yinYang: 'Yang',
    archetype: 'L\'Océan Puissant',
    strength: 'Mouvement, profondeur, capacité à absorber et à transformer.',
    risk: 'Instabilité émotionnelle, dispersion.',
    businessAdvice: 'Utilisez votre puissance océanique pour porter de grands projets, mais maîtrisez vos marées intérieures.'
  },
  {
    index: 9, chinese: '癸', pinyin: 'Guǐ',
    element: 'Eau', yinYang: 'Yin',
    archetype: 'La Rosée Subtile',
    strength: 'Intuition, subtilité, capacité à pénétrer les cœurs et les esprits.',
    risk: 'Manque de visibilité, difficulté à affirmer sa présence.',
    businessAdvice: 'Utilisez votre subtilité pour influencer sans forcer, mais apprenez à briller quand le moment l\'exige.'
  }
];

// ─────────────────────────────────────────────
// CONSTANTES — BRANCHES TERRESTRES (地支)
// ─────────────────────────────────────────────

export const EARTHLY_BRANCHES: EarthlyBranch[] = [
  { index: 0,  chinese: '子', pinyin: 'Zǐ',   animal: 'Rat',     element: 'Eau',   hours: '23h-01h' },
  { index: 1,  chinese: '丑', pinyin: 'Chǒu',  animal: 'Bœuf',    element: 'Terre', hours: '01h-03h' },
  { index: 2,  chinese: '寅', pinyin: 'Yín',   animal: 'Tigre',   element: 'Bois',  hours: '03h-05h' },
  { index: 3,  chinese: '卯', pinyin: 'Mǎo',   animal: 'Lapin',   element: 'Bois',  hours: '05h-07h' },
  { index: 4,  chinese: '辰', pinyin: 'Chén',  animal: 'Dragon',  element: 'Terre', hours: '07h-09h' },
  { index: 5,  chinese: '巳', pinyin: 'Sì',    animal: 'Serpent',  element: 'Feu',   hours: '09h-11h' },
  { index: 6,  chinese: '午', pinyin: 'Wǔ',    animal: 'Cheval',  element: 'Feu',   hours: '11h-13h' },
  { index: 7,  chinese: '未', pinyin: 'Wèi',   animal: 'Chèvre',  element: 'Terre', hours: '13h-15h' },
  { index: 8,  chinese: '申', pinyin: 'Shēn',  animal: 'Singe',   element: 'Métal', hours: '15h-17h' },
  { index: 9,  chinese: '酉', pinyin: 'Yǒu',   animal: 'Coq',     element: 'Métal', hours: '17h-19h' },
  { index: 10, chinese: '戌', pinyin: 'Xū',    animal: 'Chien',   element: 'Terre', hours: '19h-21h' },
  { index: 11, chinese: '亥', pinyin: 'Hài',   animal: 'Cochon',  element: 'Eau',   hours: '21h-23h' }
];

// ─────────────────────────────────────────────
// CONSTANTES — CYCLES DES 5 ÉLÉMENTS
// ─────────────────────────────────────────────

// Cycle de production : Bois → Feu → Terre → Métal → Eau → Bois
const PRODUCTION_CYCLE: Element[] = ['Bois', 'Feu', 'Terre', 'Métal', 'Eau'];

// Cycle de destruction : Bois → Terre → Eau → Feu → Métal → Bois
const DESTRUCTION_CYCLE: Element[] = ['Bois', 'Terre', 'Eau', 'Feu', 'Métal'];

// ─────────────────────────────────────────────
// CONSTANTES — LIU HE (六合) — 6 HARMONIES
// ─────────────────────────────────────────────

export const LIU_HE_PAIRS: [number, number][] = [
  [0, 1],   // Zi ↔ Chou    (Rat ↔ Bœuf)
  [2, 11],  // Yin ↔ Hai    (Tigre ↔ Cochon)
  [3, 10],  // Mao ↔ Xu     (Lapin ↔ Chien)
  [4, 9],   // Chen ↔ You   (Dragon ↔ Coq)
  [5, 8],   // Si ↔ Shen    (Serpent ↔ Singe)
  [6, 7]    // Wu ↔ Wei     (Cheval ↔ Chèvre)
];

export const LIU_HE_SCORE = 3;

// ─────────────────────────────────────────────
// CONSTANTES — TRIADES & CLASHS (pour Shichen)
// ─────────────────────────────────────────────

// Triades harmonieuses (San He 三合)
export const TRIADS: number[][] = [
  [8, 0, 4],   // Shen, Zi, Chen  → Eau
  [11, 3, 7],  // Hai, Mao, Wei   → Bois
  [2, 6, 10],  // Yin, Wu, Xu     → Feu
  [5, 9, 1]    // Si, You, Chou   → Métal
];

// Clashs (Chong 冲) — opposition directe
export const CLASHES: [number, number][] = [
  [0, 6],   // Zi ↔ Wu
  [1, 7],   // Chou ↔ Wei
  [2, 8],   // Yin ↔ Shen
  [3, 9],   // Mao ↔ You
  [4, 10],  // Chen ↔ Xu
  [5, 11]   // Si ↔ Hai
];

// ─────────────────────────────────────────────
// CONSTANTES — INTERACTIONS DAY MASTER × JOUR
// Source : Grok R9
// ─────────────────────────────────────────────

export const DAY_MASTER_INTERACTIONS: Record<string, { dynamique: string; conseil: string }> = {
  'same_positive': {
    dynamique: 'Votre Maître du Jour du jour renforce naturellement votre identité profonde.',
    conseil: 'Avancez avec confiance — vos décisions sont alignées avec votre nature.'
  },
  'same_negative': {
    dynamique: 'Votre Maître du Jour du jour renforce votre identité mais peut créer de la rigidité.',
    conseil: 'Introduis une légère flexibilité pour éviter la stagnation.'
  },
  'produces_positive': {
    dynamique: 'Ton identité profonde soutient naturellement l\'énergie du jour.',
    conseil: 'Utilisez cette dynamique pour des projets qui demandent de la force intérieure.'
  },
  'produces_negative': {
    dynamique: 'Ton identité profonde est sollicitée pour soutenir le jour — risque d\'épuisement.',
    conseil: 'Protégez votre énergie — ne donnez pas plus que ce que vous pouvez recharger.'
  },
  'produced_by_positive': {
    dynamique: 'L\'énergie du jour nourrit votre identité profonde.',
    conseil: 'Reçois avec gratitude — c\'est un jour de recharge stratégique.'
  },
  'produced_by_negative': {
    dynamique: 'L\'énergie du jour nourrit votre identité mais crée une dépendance.',
    conseil: 'Acceptez le soutien mais gardez votre autonomie décisionnelle.'
  },
  'destroys_positive': {
    dynamique: 'Ton identité profonde domine l\'énergie du jour — contrôle stratégique.',
    conseil: 'Utilisez cette domination pour structurer et diriger.'
  },
  'destroys_negative': {
    dynamique: 'Ton identité profonde entre en conflit avec l\'énergie du jour.',
    conseil: 'Reste souple — force moins, adapte plus.'
  },
  'destroyed_by_positive': {
    dynamique: 'L\'énergie du jour teste et affine votre identité profonde.',
    conseil: 'Accepte le test — il te rend plus résilient.'
  },
  'destroyed_by_negative': {
    dynamique: 'L\'énergie du jour met une pression forte sur votre identité profonde.',
    conseil: 'Protégez votre centre — ne laisse pas le jour te définir.'
  }
};

// ─────────────────────────────────────────────
// CONSTANTES — SHICHEN (12 PÉRIODES DE 2H)
// Source : Grok R6+R9
// ─────────────────────────────────────────────

export const SHICHEN_DESC: Record<number, { conseil: string; tacheIdeale: string; aEviter: string }> = {
  0:  { // Zi — Rat — 23h-01h
    conseil: 'L\'énergie est idéale pour la planification stratégique et la génération d\'idées nouvelles.',
    tacheIdeale: 'Brainstorming, stratégie long terme, écriture de plans.',
    aEviter: 'Décisions impulsives, négociations importantes.'
  },
  1:  { // Chou — Bœuf — 01h-03h
    conseil: 'L\'énergie est tournée vers la discipline et la structure.',
    tacheIdeale: 'Organisation, revue de contrats, planification détaillée.',
    aEviter: 'Créativité libre, lancement de projet.'
  },
  2:  { // Yin — Tigre — 03h-05h
    conseil: 'L\'énergie est audacieuse et propice à l\'action courageuse.',
    tacheIdeale: 'Prise de décision stratégique, lancement de projet.',
    aEviter: 'Analyse fine, négociation diplomatique.'
  },
  3:  { // Mao — Lapin — 05h-07h
    conseil: 'L\'énergie est douce et favorable à la créativité.',
    tacheIdeale: 'Rédaction, design, relations publiques.',
    aEviter: 'Conflit, décision dure.'
  },
  4:  { // Chen — Dragon — 07h-09h
    conseil: 'L\'énergie est puissante et propice au lancement.',
    tacheIdeale: 'Présentation, levée de fonds, annonce majeure.',
    aEviter: 'Travail de fond, analyse détaillée.'
  },
  5:  { // Si — Serpent — 09h-11h
    conseil: 'L\'énergie est stratégique et intuitive.',
    tacheIdeale: 'Négociation subtile, analyse concurrentielle, décision intuitive.',
    aEviter: 'Action brute, confrontation directe.'
  },
  6:  { // Wu — Cheval — 11h-13h
    conseil: 'L\'énergie est tournée vers l\'exécution et le mouvement.',
    tacheIdeale: 'Réunion d\'équipe, exécution opérationnelle, déplacement.',
    aEviter: 'Réflexion profonde, travail solitaire.'
  },
  7:  { // Wei — Chèvre — 13h-15h
    conseil: 'L\'énergie est harmonieuse et propice à la négociation.',
    tacheIdeale: 'Médiation, relations partenaires, culture d\'équipe.',
    aEviter: 'Décision unilatérale, confrontation.'
  },
  8:  { // Shen — Singe — 15h-17h
    conseil: 'L\'énergie est innovante et adaptable.',
    tacheIdeale: 'Résolution de problème, innovation produit, pivot stratégique.',
    aEviter: 'Routine, travail répétitif.'
  },
  9:  { // You — Coq — 17h-19h
    conseil: 'L\'énergie est précise et propice à la communication.',
    tacheIdeale: 'Revue de chiffres, communication externe, closing.',
    aEviter: 'Créativité libre, brainstorming.'
  },
  10: { // Xu — Chien — 19h-21h
    conseil: 'L\'énergie est loyale et protectrice.',
    tacheIdeale: 'Revue de sécurité, gestion des risques, fidélisation client.',
    aEviter: 'Risque nouveau, innovation radicale.'
  },
  11: { // Hai — Cochon — 21h-23h
    conseil: 'L\'énergie est tournée vers la réflexion et la clôture.',
    tacheIdeale: 'Bilan de journée, planification du lendemain, repos stratégique.',
    aEviter: 'Négociation, décision importante.'
  }
};

// ─────────────────────────────────────────────
// SCORING
// ─────────────────────────────────────────────

const ELEMENT_RELATION_SCORES: Record<ElementRelation, number> = {
  same: 2,
  produces: 1,
  produced_by: 1,
  destroys: -2,
  destroyed_by: -1
};

const SHICHEN_SAME_ANIMAL_SCORE = 3;
const SHICHEN_TRIAD_SCORE = 2;
const SHICHEN_CLASH_SCORE = -3;

// ─────────────────────────────────────────────
// FONCTIONS — CALCUL DU PILIER DU JOUR
// ─────────────────────────────────────────────

/**
 * Calcule le Julian Day Number pour une date.
 * Algorithme standard (Meeus) pour le calendrier Grégorien.
 */
function getJulianDayNumber(date: Date): number {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const a = Math.floor((14 - m) / 12);
  const y2 = y + 4800 - a;
  const m2 = m + 12 * a - 3;
  return (
    d +
    Math.floor((153 * m2 + 2) / 5) +
    365 * y2 +
    Math.floor(y2 / 4) -
    Math.floor(y2 / 100) +
    Math.floor(y2 / 400) -
    32045
  );
}

/**
 * Calcule l'index du Tronc Céleste (Heavenly Stem) pour une date.
 * 0=Jiǎ(甲), 1=Yǐ(乙), ..., 9=Guǐ(癸)
 */
function getDayStemIndex(date: Date): number {
  const jdn = getJulianDayNumber(date);
  return ((jdn + 9) % 10 + 10) % 10;
}

/**
 * Calcule l'index de la Branche Terrestre (Earthly Branch) pour une date.
 * 0=Zǐ(子), 1=Chǒu(丑), ..., 11=Hài(亥)
 */
function getDayBranchIndex(date: Date): number {
  const jdn = getJulianDayNumber(date);
  return ((jdn + 1) % 12 + 12) % 12;
}

/**
 * Calcule le Day Master (Pilier du Jour) pour une date donnée.
 * Retourne le Tronc Céleste (identité) et la Branche Terrestre (animal).
 */
export function calcDayMaster(date: Date): DayPillar {
  const stemIndex = getDayStemIndex(date);
  const branchIndex = getDayBranchIndex(date);
  return {
    stem: HEAVENLY_STEMS[stemIndex],
    branch: EARTHLY_BRANCHES[branchIndex]
  };
}

// ─────────────────────────────────────────────
// FONCTIONS — RELATIONS DES 5 ÉLÉMENTS
// ─────────────────────────────────────────────

/**
 * Détermine la relation entre l'élément natal et l'élément du jour.
 * - same : même élément
 * - produces : natal nourrit jour (Bois → Feu)
 * - produced_by : jour nourrit natal (Eau → Bois)
 * - destroys : natal détruit jour (Bois → Terre)
 * - destroyed_by : jour détruit natal (Métal → Bois)
 */
export function getElementRelation(
  natalElement: Element,
  dailyElement: Element
): ElementRelation {
  if (natalElement === dailyElement) return 'same';

  const prodIdx = PRODUCTION_CYCLE.indexOf(natalElement);
  const nextProd = PRODUCTION_CYCLE[(prodIdx + 1) % 5];
  if (dailyElement === nextProd) return 'produces';

  const prevProd = PRODUCTION_CYCLE[(prodIdx + 4) % 5];
  if (dailyElement === prevProd) return 'produced_by';

  const destIdx = DESTRUCTION_CYCLE.indexOf(natalElement);
  const nextDest = DESTRUCTION_CYCLE[(destIdx + 1) % 5];
  if (dailyElement === nextDest) return 'destroys';

  return 'destroyed_by';
}

/**
 * Calcule le score d'interaction Day Master Natal × Jour.
 * same=+2, produces/produced_by=+1, destroys=-2, destroyed_by=-1
 */
export function dayMasterDailyScore(
  natalElement: Element,
  dailyElement: Element
): number {
  const relation = getElementRelation(natalElement, dailyElement);
  return ELEMENT_RELATION_SCORES[relation];
}

// ─────────────────────────────────────────────
// FONCTIONS — LIU HE (六合 — 6 HARMONIES)
// ─────────────────────────────────────────────

/**
 * Vérifie si deux Branches Terrestres forment une paire Liu He.
 * Score : +3 si match.
 */
export function checkLiuHe(branchA: number, branchB: number): boolean {
  return LIU_HE_PAIRS.some(
    ([a, b]) => (branchA === a && branchB === b) || (branchA === b && branchB === a)
  );
}

// ─────────────────────────────────────────────
// FONCTIONS — SHICHEN (時辰 — 12 PÉRIODES)
// ─────────────────────────────────────────────

/**
 * Détermine le Shichen actuel (période de 2h) à partir d'une date/heure.
 * Index 0=Zi (23h-01h), 1=Chou (01h-03h), ..., 11=Hai (21h-23h)
 */
export function getCurrentShichen(date: Date): ShichenPeriod {
  const hour = date.getHours();

  // Zi (Rat) couvre 23h-01h — cas spécial
  let branchIndex: number;
  if (hour >= 23 || hour < 1) branchIndex = 0;
  else branchIndex = Math.floor((hour + 1) / 2);

  const branch = EARTHLY_BRANCHES[branchIndex];
  const desc = SHICHEN_DESC[branchIndex];

  return { branch, ...desc };
}

/**
 * Calcule le bonus temps-réel Shichen.
 * Ce bonus est SÉPARÉ du score quotidien (ne modifie pas le score).
 * - Même animal que natal : +3
 * - Triade avec natal : +2
 * - Clash avec natal : -3
 * - Autre : 0
 */
export function calcRealtimeBonus(
  shichen: ShichenPeriod,
  natalBranchIndex: number
): ShichenBonus {
  const shichenIdx = shichen.branch.index;
  let score = 0;
  let advice = '';

  // Même animal
  if (shichenIdx === natalBranchIndex) {
    score = SHICHEN_SAME_ANIMAL_SCORE;
    advice = 'Période en résonance avec votre animal natal — énergie amplifiée.';
  }
  // Triade
  else if (TRIADS.some(t => t.includes(shichenIdx) && t.includes(natalBranchIndex))) {
    score = SHICHEN_TRIAD_SCORE;
    advice = 'Période en triade avec votre animal natal — soutien harmonieux.';
  }
  // Clash
  else if (CLASHES.some(([a, b]) =>
    (a === shichenIdx && b === natalBranchIndex) ||
    (b === shichenIdx && a === natalBranchIndex)
  )) {
    score = SHICHEN_CLASH_SCORE;
    advice = 'Période en clash avec votre animal natal — prudence requise.';
  }
  else {
    advice = shichen.conseil;
  }

  return { score, advice, shichen };
}

// ─────────────────────────────────────────────
// FONCTIONS — INTERACTION DAY MASTER QUOTIDIENNE
// ─────────────────────────────────────────────

/**
 * Retourne le texte d'interaction entre Day Master natal et Day Master du jour.
 * Détermine si l'aspect est positif ou négatif selon le score global du jour.
 */
export function getDayMasterInteraction(
  natalElement: Element,
  dailyElement: Element,
  dayScore: number
): { dynamique: string; conseil: string } {
  const relation = getElementRelation(natalElement, dailyElement);
  const isPositive = dayScore >= 50;
  const key = `${relation}_${isPositive ? 'positive' : 'negative'}`;
  return DAY_MASTER_INTERACTIONS[key] || DAY_MASTER_INTERACTIONS['same_positive'];
}

// ─────────────────────────────────────────────
// FONCTIONS — CALCUL COMPLET BAZI QUOTIDIEN
// ─────────────────────────────────────────────

/**
 * Calcul complet BaZi pour un jour donné :
 * - Day Master du jour
 * - Relation élémentaire avec le natal
 * - Score
 * - Liu He check
 * - Interaction textuelle
 */
export function calcBaZiDaily(
  natalBirthDate: Date,
  targetDate: Date,
  dayScore: number
): DayMasterDailyResult {
  const natalPillar = calcDayMaster(natalBirthDate);
  const dailyPillar = calcDayMaster(targetDate);

  const relation = getElementRelation(
    natalPillar.stem.element,
    dailyPillar.stem.element
  );

  const elementScore = ELEMENT_RELATION_SCORES[relation];

  const liuHeMatch = checkLiuHe(
    natalPillar.branch.index,
    dailyPillar.branch.index
  );
  const liuHeBonus = liuHeMatch ? LIU_HE_SCORE : 0;

  const interaction = getDayMasterInteraction(
    natalPillar.stem.element,
    dailyPillar.stem.element,
    dayScore
  );

  return {
    natalStem: natalPillar.stem,
    dailyStem: dailyPillar.stem,
    relation,
    score: elementScore,
    liuHeMatch,
    liuHeBonus,
    totalScore: elementScore + liuHeBonus,
    interaction
  };
}

// ═════════════════════════════════════════════════════
// V3.2 — 10 GODS (十神) + HIDDEN STEMS (藏干)
// Sources : Grok R6+R7 (specs), Claude (implémentation)
// ═════════════════════════════════════════════════════

// ── Hidden Stems (藏干) dans chaque Branche Terrestre ──
// Chaque branche contient 1-3 troncs cachés (index → HEAVENLY_STEMS)
// Premier = tronc principal (本气), suivants = résidus
const CANG_GAN: Record<number, number[]> = {
  0:  [9],        // 子 Zi:   Gui (Eau Yin)
  1:  [5, 9, 7],  // 丑 Chou: Ji (Terre Yin), Gui (Eau Yin), Xin (Métal Yin)
  2:  [0, 2, 4],  // 寅 Yin:  Jia (Bois Yang), Bing (Feu Yang), Wu (Terre Yang)
  3:  [1],        // 卯 Mao:  Yi (Bois Yin)
  4:  [4, 1, 9],  // 辰 Chen: Wu (Terre Yang), Yi (Bois Yin), Gui (Eau Yin)
  5:  [2, 6, 4],  // 巳 Si:   Bing (Feu Yang), Geng (Métal Yang), Wu (Terre Yang)
  6:  [3, 5],     // 午 Wu:   Ding (Feu Yin), Ji (Terre Yin)
  7:  [5, 3, 1],  // 未 Wei:  Ji (Terre Yin), Ding (Feu Yin), Yi (Bois Yin)
  8:  [6, 8, 4],  // 申 Shen: Geng (Métal Yang), Ren (Eau Yang), Wu (Terre Yang)
  9:  [7],        // 酉 You:  Xin (Métal Yin)
  10: [4, 7, 3],  // 戌 Xu:   Wu (Terre Yang), Xin (Métal Yin), Ding (Feu Yin)
  11: [8, 0],     // 亥 Hai:  Ren (Eau Yang), Jia (Bois Yang)
};

// ── Types 10 Gods ──

export type TenGodName =
  | 'bi_jian'     // 比肩 Companion     (same element, same polarity)
  | 'jie_cai'     // 劫財 Rob Wealth    (same element, diff polarity)
  | 'shi_shen'    // 食神 Eating God    (I produce, same polarity)
  | 'shang_guan'  // 傷官 Hurting Off.  (I produce, diff polarity)
  | 'zheng_cai'   // 正財 Direct Wealth (I control, diff polarity)
  | 'pian_cai'    // 偏財 Indirect W.   (I control, same polarity)
  | 'zheng_guan'  // 正官 Direct Off.   (controls me, diff polarity)
  | 'qi_sha'      // 七殺 Seven Kill.   (controls me, same polarity)
  | 'zheng_yin'   // 正印 Direct Seal   (produces me, diff polarity)
  | 'pian_yin';   // 偏印 Indirect Seal (produces me, same polarity)

export interface TenGodEntry {
  god: TenGodName;
  label: string;
  element: Element;
  isZheng: boolean;    // true = 正 (harmonieux), false = 偏 (agressif)
  isPrimary: boolean;  // true = stem du jour, false = hidden stem
}

export interface TenGodsResult {
  gods: TenGodEntry[];
  dominant: TenGodEntry | null;   // God principal (stem du jour)
  totalScore: number;             // Capped ±8
  businessPts: number;
  relationsPts: number;
  creativityPts: number;
}

const TEN_GOD_LABELS: Record<TenGodName, string> = {
  bi_jian:     '比肩 Compagnon',
  jie_cai:     '劫財 Concurrent',
  shi_shen:    '食神 Expression',
  shang_guan:  '傷官 Création Brute',
  zheng_cai:   '正財 Richesse Directe',
  pian_cai:    '偏財 Richesse Indirecte',
  zheng_guan:  '正官 Autorité',
  qi_sha:      '七殺 Pouvoir',
  zheng_yin:   '正印 Soutien',
  pian_yin:    '偏印 Intuition',
};

// Scoring par God → impact sur les 3 domaines contextuels
// Valeurs pour le God principal (isPrimary). Les hidden sont à ×0.4.
const TEN_GOD_DOMAINS: Record<TenGodName, { b: number; r: number; c: number }> = {
  zheng_cai:   { b: 4, r: 1, c: 0 },   // Direct Wealth → business fort
  pian_cai:    { b: 3, r: 0, c: 1 },   // Indirect Wealth → risque+opportunité
  zheng_guan:  { b: 3, r: 2, c: 0 },   // Direct Officer → carrière+autorité
  qi_sha:      { b: 2, r: -1, c: 0 },  // Seven Killings → pouvoir brut, friction
  zheng_yin:   { b: 1, r: 2, c: 1 },   // Direct Seal → mentors, soutien
  pian_yin:    { b: 0, r: 1, c: 2 },   // Indirect Seal → soutien non-conventionnel
  shi_shen:    { b: 1, r: 1, c: 3 },   // Eating God → expression créative
  shang_guan:  { b: -1, r: 0, c: 4 },  // Hurting Officer → puissance créative brute
  bi_jian:     { b: 1, r: 0, c: 0 },   // Companion → renforcement identitaire
  jie_cai:     { b: -2, r: -1, c: 0 }, // Rob Wealth → concurrence
};

/**
 * Détermine le 10 God entre le Day Master natal et un autre tronc.
 * Utilise le cycle élémentaire + polarité Yin/Yang pour distinguer 正/偏.
 */
function determineTenGod(natalStem: HeavenlyStem, otherStemIdx: number): TenGodName {
  const other = HEAVENLY_STEMS[otherStemIdx];
  const rel = getElementRelation(natalStem.element, other.element);
  const samePol = natalStem.yinYang === other.yinYang;

  switch (rel) {
    case 'same':         return samePol ? 'bi_jian'   : 'jie_cai';
    case 'produces':     return samePol ? 'shi_shen'  : 'shang_guan';
    case 'produced_by':  return samePol ? 'pian_yin'  : 'zheng_yin';
    case 'destroys':     return samePol ? 'pian_cai'  : 'zheng_cai';
    case 'destroyed_by': return samePol ? 'qi_sha'    : 'zheng_guan';
  }
}

/**
 * Calcule les 10 Gods actifs pour un jour donné.
 * Croise le Day Master natal avec :
 *   1. Le Tronc Céleste du jour (God principal)
 *   2. Les Troncs Cachés (藏干) de la Branche du jour (Gods secondaires ×0.4)
 *
 * Retourne les Gods avec scoring par domaine. Cap total ±8.
 */
export function calc10Gods(natalBirthDate: Date, targetDate: Date): TenGodsResult {
  const natalPillar = calcDayMaster(natalBirthDate);
  const dailyPillar = calcDayMaster(targetDate);

  const gods: TenGodEntry[] = [];
  let biz = 0, rel = 0, cre = 0;

  // 1. God principal (Tronc du jour)
  const mainGodName = determineTenGod(natalPillar.stem, dailyPillar.stem.index);
  const mainDomain = TEN_GOD_DOMAINS[mainGodName];
  const isZheng = !(['pian_cai', 'qi_sha', 'pian_yin', 'jie_cai', 'shang_guan'].includes(mainGodName));

  gods.push({
    god: mainGodName,
    label: TEN_GOD_LABELS[mainGodName],
    element: dailyPillar.stem.element,
    isZheng,
    isPrimary: true,
  });

  biz += mainDomain.b;
  rel += mainDomain.r;
  cre += mainDomain.c;

  // 2. Gods secondaires (藏干 de la Branche du jour)
  // V4.8: ratio Cang Gan traditionnel — main×1.0, secondary×0.5, residual×0.25
  const HIDDEN_WEIGHTS = [1.0, 0.5, 0.25];
  const hiddenStems = CANG_GAN[dailyPillar.branch.index] || [];
  hiddenStems.forEach((hIdx, position) => {
    const weight = HIDDEN_WEIGHTS[position] ?? 0.25;
    const hGodName = determineTenGod(natalPillar.stem, hIdx);
    const hDomain = TEN_GOD_DOMAINS[hGodName];
    const hIsZheng = !(['pian_cai', 'qi_sha', 'pian_yin', 'jie_cai', 'shang_guan'].includes(hGodName));

    gods.push({
      god: hGodName,
      label: TEN_GOD_LABELS[hGodName],
      element: HEAVENLY_STEMS[hIdx].element,
      isZheng: hIsZheng,
      isPrimary: false,
    });

    biz += Math.round(hDomain.b * weight);
    rel += Math.round(hDomain.r * weight);
    cre += Math.round(hDomain.c * weight);
  });

  const totalScore = Math.max(-8, Math.min(8, biz + rel + cre));

  return {
    gods,
    dominant: gods[0] || null,
    totalScore,
    businessPts: biz,
    relationsPts: rel,
    creativityPts: cre,
  };
}

// ═════════════════════════════════════════════════════
// V4.0 — PEACH BLOSSOM (桃花)
// Source : Tradition classique (basé sur la branche du JOUR natal)
// MEMO V4.0 : +2 pts domaine Amour quand branche du jour = Peach Blossom
// ═════════════════════════════════════════════════════

/**
 * Peach Blossom Map — basé sur la branche du JOUR natal (pas l'année).
 * Groupes des 4 Voyageurs :
 *   Shen/Zi/Chen → Peach = You (Coq, index 9)
 *   Yin/Wu/Xu    → Peach = Mao (Lapin, index 3)
 *   Si/You/Chou  → Peach = Wu (Cheval, index 6)
 *   Hai/Mao/Wei  → Peach = Zi (Rat, index 0)
 */
export const PEACH_BLOSSOM_MAP: Record<number, number> = {
  8: 9,  0: 9,  4: 9,   // Shen, Zi, Chen → You (Coq)
  2: 3,  6: 3,  10: 3,  // Yin, Wu, Xu    → Mao (Lapin)
  5: 6,  9: 6,  1: 6,   // Si, You, Chou  → Wu (Cheval)
  11: 0, 3: 0,  7: 0,   // Hai, Mao, Wei  → Zi (Rat)
};

export interface PeachBlossomResult {
  active: boolean;
  natalBranch: EarthlyBranch;
  peachBranch: EarthlyBranch;
  dailyBranch: EarthlyBranch;
  label: string;
}

/**
 * Vérifie si la Peach Blossom est active pour un jour donné.
 * Active = branche du jour courant == Peach Blossom du jour natal.
 */
export function getPeachBlossom(natalBirthDate: Date, targetDate: Date): PeachBlossomResult {
  const natalPillar = calcDayMaster(natalBirthDate);
  const dailyPillar = calcDayMaster(targetDate);

  const natalBranchIdx = natalPillar.branch.index;
  const peachIdx = PEACH_BLOSSOM_MAP[natalBranchIdx];
  const dailyBranchIdx = dailyPillar.branch.index;
  const active = peachIdx !== undefined && dailyBranchIdx === peachIdx;

  const peachBranch = EARTHLY_BRANCHES[peachIdx ?? 0];

  return {
    active,
    natalBranch: natalPillar.branch,
    peachBranch,
    dailyBranch: dailyPillar.branch,
    label: active
      ? `🌸 Peach Blossom active — ${peachBranch.animal} (${peachBranch.chinese}) → charme & magnétisme`
      : `Peach Blossom : ${peachBranch.animal} (${peachBranch.chinese})`,
  };
}

// ═════════════════════════════════════════════════════
// V4.0 — HEAVENLY COMBINATIONS (天合 Tiān Hé)
// 5 paires de troncs célestes qui fusionnent en un élément
// Puissant signal de compatibilité en BaZi (Day Master × Day Master)
// ═════════════════════════════════════════════════════

export interface HeavenlyCombination {
  stemA: number;       // Index HEAVENLY_STEMS
  stemB: number;
  resultElement: Element;
  label: string;
}

export const HEAVENLY_COMBINATIONS: HeavenlyCombination[] = [
  { stemA: 0, stemB: 1, resultElement: 'Terre', label: '甲己 Jiǎ+Jǐ → Terre (Stabilité)' },    // Jia Yang Bois + Ji Yin Terre
  { stemA: 2, stemB: 7, resultElement: 'Eau',   label: '丙辛 Bǐng+Xīn → Eau (Fluidité)' },     // Bing Yang Feu + Xin Yin Métal
  { stemA: 4, stemB: 9, resultElement: 'Feu',   label: '戊癸 Wù+Guǐ → Feu (Passion)' },       // Wu Yang Terre + Gui Yin Eau
  { stemA: 6, stemB: 3, resultElement: 'Métal',  label: '庚乙 Gēng+Yǐ → Métal (Structure)' },   // Geng Yang Métal + Yi Yin Bois
  { stemA: 8, stemB: 5, resultElement: 'Bois',  label: '壬丁 Rén+Dīng → Bois (Croissance)' },  // Ren Yang Eau + Ding Yin Feu
];

/**
 * Vérifie si deux troncs célestes forment une Combinaison Divine 天合.
 * Retourne la combinaison trouvée ou null.
 */
export function checkHeavenlyCombination(stemIdxA: number, stemIdxB: number): HeavenlyCombination | null {
  return HEAVENLY_COMBINATIONS.find(c =>
    (c.stemA === stemIdxA && c.stemB === stemIdxB) ||
    (c.stemA === stemIdxB && c.stemB === stemIdxA)
  ) || null;
}

// ═════════════════════════════════════════════════════
// V4.0 — SECRET FRIENDS (暗合 Àn Hé)
// 6 paires de branches terrestres — alliance discrète
// ═════════════════════════════════════════════════════

export const SECRET_FRIENDS: [number, number][] = [
  [0, 1],   // Zi ↔ Chou    (Rat ↔ Bœuf)       — même que Liu He
  [2, 11],  // Yin ↔ Hai    (Tigre ↔ Cochon)    — même que Liu He
  [3, 10],  // Mao ↔ Xu     (Lapin ↔ Chien)     — même que Liu He
  [4, 9],   // Chen ↔ You   (Dragon ↔ Coq)      — même que Liu He
  [5, 8],   // Si ↔ Shen    (Serpent ↔ Singe)    — même que Liu He
  [6, 7],   // Wu ↔ Wei     (Cheval ↔ Chèvre)    — même que Liu He
];
// Note : Secret Friends et Liu He sont les mêmes 6 paires dans la tradition classique.
// On les garde séparés pour Bonds (scoring différencié : Liu He = jour courant, Secret Friends = compatibilité natale).

// ═════════════════════════════════════════════════════
// V4.0 — HARMS (害 Hài) — 6 paires de friction subtile
// ═════════════════════════════════════════════════════

export const HARMS: [number, number][] = [
  [0, 7],   // Zi ↔ Wei     (Rat ↔ Chèvre)
  [1, 6],   // Chou ↔ Wu    (Bœuf ↔ Cheval)
  [2, 5],   // Yin ↔ Si     (Tigre ↔ Serpent)
  [3, 4],   // Mao ↔ Chen   (Lapin ↔ Dragon)
  [8, 11],  // Shen ↔ Hai   (Singe ↔ Cochon)
  [9, 10],  // You ↔ Xu     (Coq ↔ Chien)
];

// ═════════════════════════════════════════════════════
// V4.0 — PUNISHMENTS (刑 Xíng) — Tensions structurelles
// 3 types : auto-punition, mutuelle (2 groupes), civile
// ═════════════════════════════════════════════════════

export interface Punishment {
  branches: number[];
  type: 'self' | 'bully' | 'ungrateful' | 'civil';
  label: string;
  severity: number; // 1-3
}

export const PUNISHMENTS: Punishment[] = [
  // Auto-punitions (自刑)
  { branches: [0, 0],   type: 'self', label: '子自刑 Rat auto-punition — anxiété intérieure', severity: 1 },
  { branches: [6, 6],   type: 'self', label: '午自刑 Cheval auto-punition — impulsivité', severity: 1 },
  { branches: [9, 9],   type: 'self', label: '酉自刑 Coq auto-punition — perfectionnisme', severity: 1 },
  { branches: [4, 4],   type: 'self', label: '辰自刑 Dragon auto-punition — orgueil', severity: 1 },

  // Punitions mutuelles — Bully (恃势之刑)
  { branches: [2, 5],   type: 'bully', label: '寅巳刑 Tigre↔Serpent — pouvoir vs stratégie', severity: 2 },
  { branches: [5, 8],   type: 'bully', label: '巳申刑 Serpent↔Singe — manipulation mutuelle', severity: 2 },
  { branches: [2, 8],   type: 'bully', label: '寅申刑 Tigre↔Singe — conflit direct', severity: 3 },

  // Punitions mutuelles — Ungrateful (无恩之刑)
  { branches: [1, 10],  type: 'ungrateful', label: '丑戌刑 Bœuf↔Chien — ingratitude', severity: 2 },
  { branches: [10, 7],  type: 'ungrateful', label: '戌未刑 Chien↔Chèvre — trahison ressentie', severity: 2 },
  { branches: [7, 1],   type: 'ungrateful', label: '未丑刑 Chèvre↔Bœuf — cycle d\'amertume', severity: 2 },

  // Punition civile (无礼之刑)
  { branches: [3, 0],   type: 'civil', label: '卯子刑 Lapin↔Rat — manque de respect', severity: 1 },
];

/**
 * Vérifie les punitions entre deux branches terrestres.
 * Retourne toutes les punitions trouvées (peut être 0+).
 */
export function checkPunishments(branchIdxA: number, branchIdxB: number): Punishment[] {
  return PUNISHMENTS.filter(p => {
    if (p.branches.length === 2) {
      return (p.branches[0] === branchIdxA && p.branches[1] === branchIdxB) ||
             (p.branches[0] === branchIdxB && p.branches[1] === branchIdxA);
    }
    return false;
  });
}

/**
 * Vérifie si deux branches sont en Harm.
 */
export function checkHarm(branchIdxA: number, branchIdxB: number): boolean {
  return HARMS.some(([a, b]) =>
    (a === branchIdxA && b === branchIdxB) || (a === branchIdxB && b === branchIdxA)
  );
}

/**
 * Vérifie si deux branches sont dans la même Triade (San He).
 */
export function checkTriad(branchIdxA: number, branchIdxB: number): boolean {
  return TRIADS.some(t => t.includes(branchIdxA) && t.includes(branchIdxB));
}

/**
 * Vérifie si deux branches sont en Clash (Chong 冲).
 */
export function checkClash(branchIdxA: number, branchIdxB: number): boolean {
  return CLASHES.some(([a, b]) =>
    (a === branchIdxA && b === branchIdxB) || (a === branchIdxB && b === branchIdxA)
  );
}

// ═════════════════════════════════════════════════════
// V4.0 — UTILITAIRES COMPATIBILITÉ
// Fonctions croisées pour compatibility.ts (Bonds)
// ═════════════════════════════════════════════════════

export interface BaZiCompatResult {
  heavenlyCombination: HeavenlyCombination | null;  // 天合 Day Master × Day Master
  liuHe: boolean;                                     // 六合 branches du jour
  triad: boolean;                                     // 三合 branches du jour
  clash: boolean;                                     // 冲 opposition
  harm: boolean;                                      // 害 friction
  punishments: Punishment[];                          // 刑 tensions
  peachBlossomCrossed: boolean;                       // Peach Blossom de A = branche natale de B ou vice versa
  elementRelation: ElementRelation;                   // Relation élémentaire DM × DM
  score: number;                                      // Score global compat BaZi [-30, +40]
  signals: string[];
  alerts: string[];
}

/**
 * Calcule la compatibilité BaZi complète entre deux personnes.
 * Croise : Day Masters, branches du jour, Peach Blossom, Liu He, Triades, Clashes, Harms, Punishments.
 */
export function calcBaZiCompat(birthDateA: Date, birthDateB: Date): BaZiCompatResult {
  const pillarA = calcDayMaster(birthDateA);
  const pillarB = calcDayMaster(birthDateB);

  const signals: string[] = [];
  const alerts: string[] = [];
  let score = 0;

  // ── 1. Heavenly Combination 天合 (+22) ──
  const hc = checkHeavenlyCombination(pillarA.stem.index, pillarB.stem.index);
  if (hc) {
    score += 22;
    signals.push(`🌟 Combinaison Divine ${hc.label} — lien karmique puissant`);
  }

  // ── 2. Liu He 六合 (+12) ──
  const liuHe = checkLiuHe(pillarA.branch.index, pillarB.branch.index);
  if (liuHe) {
    score += 12;
    signals.push(`🤝 Liu He — harmonie naturelle (${pillarA.branch.animal} ↔ ${pillarB.branch.animal})`);
  }

  // ── 3. Triades San He (+15) ──
  const triad = checkTriad(pillarA.branch.index, pillarB.branch.index);
  if (triad) {
    score += 15;
    signals.push(`🔺 Triade San He — alliance stratégique (${pillarA.branch.animal} ↔ ${pillarB.branch.animal})`);
  }

  // ── 4. Clash 冲 (-15) ──
  const clash = checkClash(pillarA.branch.index, pillarB.branch.index);
  if (clash) {
    score -= 15;
    alerts.push(`⚔️ Clash — opposition frontale (${pillarA.branch.animal} ↔ ${pillarB.branch.animal})`);
  }

  // ── 5. Harm 害 (-8) ──
  const harm = checkHarm(pillarA.branch.index, pillarB.branch.index);
  if (harm) {
    score -= 8;
    alerts.push(`💔 Harm — friction subtile (${pillarA.branch.animal} ↔ ${pillarB.branch.animal})`);
  }

  // ── 6. Punishments 刑 (-10 max) ──
  const punishments = checkPunishments(pillarA.branch.index, pillarB.branch.index);
  if (punishments.length > 0) {
    const maxSeverity = Math.max(...punishments.map(p => p.severity));
    const pPts = maxSeverity >= 3 ? -10 : maxSeverity >= 2 ? -6 : -3;
    score += pPts;
    punishments.forEach(p => alerts.push(`⚠️ ${p.label}`));
  }

  // ── 7. Relation élémentaire DM × DM ──
  const elementRelation = getElementRelation(pillarA.stem.element, pillarB.stem.element);
  const elemScores: Record<ElementRelation, number> = {
    'same': 5,          // Même énergie
    'produces': 8,      // A produit B → don de soi
    'produced_by': 8,   // B produit A → soutien
    'destroys': -6,     // A détruit B → domination
    'destroyed_by': -6, // B détruit A → soumission
  };
  const elemPts = elemScores[elementRelation];
  score += elemPts;
  if (elemPts > 0) signals.push(`${pillarA.stem.element} ${elementRelation === 'same' ? '=' : '→'} ${pillarB.stem.element} — flux élémentaire favorable`);
  if (elemPts < 0) alerts.push(`${pillarA.stem.element} ${elementRelation === 'destroys' ? '→×' : '×←'} ${pillarB.stem.element} — tension élémentaire`);

  // ── 8. Peach Blossom croisée (+8) ──
  const peachA = PEACH_BLOSSOM_MAP[pillarA.branch.index];
  const peachB = PEACH_BLOSSOM_MAP[pillarB.branch.index];
  const peachCrossed = (peachA !== undefined && peachA === pillarB.branch.index) ||
                       (peachB !== undefined && peachB === pillarA.branch.index);
  if (peachCrossed) {
    score += 8;
    signals.push('🌸 Peach Blossom croisée — attraction magnétique');
  }

  return {
    heavenlyCombination: hc,
    liuHe, triad, clash, harm, punishments,
    peachBlossomCrossed: peachCrossed,
    elementRelation, score,
    signals, alerts,
  };
}

// ============================================================================
// LUCK PILLARS (大运) — ALGORITHME UNIVERSEL V4.1
// Source: Grok R8 (tradition Joey Yap), vérifié sur profil Jérôme (23/09/1977)
// ============================================================================

// ── Types ──

export interface LuckPillar {
  index: number;
  startAge: number;
  endAge: number;
  startYear: number;
  endYear: number;
  stem: HeavenlyStem;
  branch: EarthlyBranch;
  theme: string;
  themeKey: ElementRelation;
}

export interface LuckPillarResult {
  pillars: LuckPillar[];
  startAge: number;          // Âge d'entrée dans le 1er pilier
  direction: 'forward' | 'backward';
  currentPillar: LuckPillar | null;
  currentPillarYearsLeft: number;
}

// ── Table des 12 Jie Qi (节气) — Frontières de mois BaZi ──
// Seuls les Jie (impairs dans les 24 termes) comptent pour le changement de mois.
// dayApprox = date moyenne (±1 jour selon l'année).
// branchIdx = branche terrestre du mois BaZi correspondant.

const JIE_QI: { name: string; month: number; dayApprox: number; branchIdx: number }[] = [
  { name: 'LiChun',      month: 2,  dayApprox: 4,  branchIdx: 2  },  // Yin   寅 → Mois 1
  { name: 'JingZhe',     month: 3,  dayApprox: 6,  branchIdx: 3  },  // Mao   卯 → Mois 2
  { name: 'QingMing',    month: 4,  dayApprox: 5,  branchIdx: 4  },  // Chen  辰 → Mois 3
  { name: 'LiXia',       month: 5,  dayApprox: 6,  branchIdx: 5  },  // Si    巳 → Mois 4
  { name: 'MangZhong',   month: 6,  dayApprox: 6,  branchIdx: 6  },  // Wu    午 → Mois 5
  { name: 'XiaoShu',     month: 7,  dayApprox: 7,  branchIdx: 7  },  // Wei   未 → Mois 6
  { name: 'LiQiu',       month: 8,  dayApprox: 8,  branchIdx: 8  },  // Shen  申 → Mois 7
  { name: 'BaiLu',       month: 9,  dayApprox: 8,  branchIdx: 9  },  // You   酉 → Mois 8
  { name: 'HanLu',       month: 10, dayApprox: 8,  branchIdx: 10 },  // Xu    戌 → Mois 9
  { name: 'LiDong',      month: 11, dayApprox: 8,  branchIdx: 11 },  // Hai   亥 → Mois 10
  { name: 'DaXue',       month: 12, dayApprox: 7,  branchIdx: 0  },  // Zi    子 → Mois 11
  { name: 'XiaoHan',     month: 1,  dayApprox: 6,  branchIdx: 1  },  // Chou  丑 → Mois 12
];

// ── Règle des 5 Tigres (五虎遁) — Stem du mois basé sur le stem de l'année ──
// Le stem du 1er mois (Yin) dépend du stem de l'année :
//   Jia/Ji (0/5) → Bing (2)   Yi/Geng (1/6) → Wu (4)   Bing/Xin (2/7) → Geng (6)
//   Ding/Ren (3/8) → Ren (8)  Wu/Gui (4/9) → Jia (0)
const FIVE_TIGERS_START: Record<number, number> = {
  0: 2, 5: 2,   // Jia/Ji → Bing
  1: 4, 6: 4,   // Yi/Geng → Wu
  2: 6, 7: 6,   // Bing/Xin → Geng
  3: 8, 8: 8,   // Ding/Ren → Ren
  4: 0, 9: 0,   // Wu/Gui → Jia
};

// ── Pilier de l'Année BaZi ──
// L'année BaZi commence à Li Chun (~4 février), PAS au 1er janvier

export function getYearPillar(date: Date): { stemIdx: number; branchIdx: number } {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // Li Chun ≈ 4 février (±1 jour)
  const isBeforeLiChun = month < 2 || (month === 2 && day < 4);
  const effectiveYear = isBeforeLiChun ? year - 1 : year;

  // Formule : (year - 4) % 60 donne l'index dans le cycle de 60
  // Stem = index % 10, Branch = index % 12
  const cycle60 = ((effectiveYear - 4) % 60 + 60) % 60;
  return {
    stemIdx: cycle60 % 10,
    branchIdx: cycle60 % 12,
  };
}

// ── Pilier du Mois BaZi (basé sur les Jie Qi) ──

export function getMonthPillar(date: Date): { stemIdx: number; branchIdx: number } {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // Trouver le Jie Qi actif (le dernier qui est passé)
  // Note : JIE_QI est ordonné fév→jan, donc il faut gérer le wrap

  let activeJieIdx = 0;  // Defaut : XiaoHan (janvier = mois 12 = Chou)

  for (let i = 0; i < JIE_QI.length; i++) {
    const jie = JIE_QI[i];
    // Comparer mois/jour avec la date
    if (month > jie.month || (month === jie.month && day >= jie.dayApprox)) {
      activeJieIdx = i;
    }
  }

  // Cas spécial : si on est avant LiChun (fév 4), on est encore dans le mois 12 (Chou)
  // de l'année précédente
  const isBeforeLiChun = month < 2 || (month === 2 && day < 4);
  if (isBeforeLiChun) {
    activeJieIdx = 11; // XiaoHan → Chou (mois 12)
  }

  const branchIdx = JIE_QI[activeJieIdx].branchIdx;

  // Stem du mois : Five Tigers Rule
  const yearPillar = getYearPillar(date);
  const yearStemIdx = yearPillar.stemIdx;
  const tigerStart = FIVE_TIGERS_START[yearStemIdx] ?? 0;

  // Le nombre de mois depuis Yin (mois 1)
  // branchIdx 2 = Yin (mois 1), 3 = Mao (mois 2), ..., 1 = Chou (mois 12)
  const monthOffset = ((branchIdx - 2) + 12) % 12;
  const stemIdx = (tigerStart + monthOffset) % 10;

  return { stemIdx, branchIdx };
}

// ── Calcul des Luck Pillars (大运) ──
// V4.7: Méthode moderne Zi Ping dominante — 1 jour = 1 an (vs 3 jours = 1 an école Joey Yap)
// Configurable via DAYS_PER_LUCK_YEAR si besoin de changer d'école.
const DAYS_PER_LUCK_YEAR = 1; // 1 jour = 1 an (méthode moderne, confirmée Gemini Q2)

export function calculateLuckPillars(
  birthDate: Date,
  gender: 'M' | 'F'
): LuckPillarResult {
  const yearPillar = getYearPillar(birthDate);
  const monthPillar = getMonthPillar(birthDate);
  const dayPillar = calcDayMaster(birthDate);
  const natalStem = dayPillar.stem;

  // ── Direction ──
  // Homme + Année Yang (stem pair: 0,2,4,6,8) → forward
  // Femme + Année Yin (stem impair: 1,3,5,7,9) → forward
  // Sinon → backward
  const isYearYang = yearPillar.stemIdx % 2 === 0;
  const forward = (gender === 'M' && isYearYang) || (gender === 'F' && !isYearYang);

  // ── Âge de départ ──
  // Compter les jours entre la naissance et le prochain (forward) ou précédent (backward) Jie Qi
  const birthMonth = birthDate.getMonth() + 1;
  const birthDay = birthDate.getDate();
  const birthYear = birthDate.getFullYear();

  let targetJieDate: Date;

  if (forward) {
    // Chercher le PROCHAIN Jie Qi le plus proche après la naissance
    let best: Date | null = null;
    for (const jie of JIE_QI) {
      const jieDate = new Date(birthYear, jie.month - 1, jie.dayApprox);
      if (jieDate > birthDate) {
        if (!best || jieDate < best) best = jieDate;
      }
    }
    if (best) {
      targetJieDate = best;
    } else {
      // Wrap : le prochain est LiChun de l'année suivante
      targetJieDate = new Date(birthYear + 1, 1, 4);
    }
  } else {
    // Chercher le PRÉCÉDENT Jie Qi le plus proche avant la naissance
    // On itère chronologiquement et on garde le DERNIER qui est < birthDate
    let best: Date | null = null;
    for (const jie of JIE_QI) {
      const jieDate = new Date(birthYear, jie.month - 1, jie.dayApprox);
      if (jieDate < birthDate) {
        if (!best || jieDate > best) best = jieDate;
      }
    }
    if (best) {
      targetJieDate = best;
    } else {
      targetJieDate = new Date(birthYear - 1, 11, 7); // DaXue année précédente
    }
  }

  const daysDiff = Math.abs(Math.floor((targetJieDate!.getTime() - birthDate.getTime()) / 86400000));
  // Règle Zi Ping moderne : DAYS_PER_LUCK_YEAR jour(s) = 1 an
  const startAge = Math.max(1, Math.round(daysDiff / DAYS_PER_LUCK_YEAR));

  // ── Génération des 8 piliers ──
  const pillars: LuckPillar[] = [];
  let currentStemIdx = monthPillar.stemIdx;
  let currentBranchIdx = monthPillar.branchIdx;

  for (let i = 0; i < 8; i++) {
    // Avancer/reculer d'un pas dans le cycle 60
    if (i > 0 || forward) {
      // Premier pilier : on part du mois suivant/précédent
      currentStemIdx = ((currentStemIdx + (forward ? 1 : -1)) + 10) % 10;
      currentBranchIdx = ((currentBranchIdx + (forward ? 1 : -1)) + 12) % 12;
    } else if (!forward && i === 0) {
      currentStemIdx = ((currentStemIdx - 1) + 10) % 10;
      currentBranchIdx = ((currentBranchIdx - 1) + 12) % 12;
    }

    const stem = HEAVENLY_STEMS[currentStemIdx];
    const branch = EARTHLY_BRANCHES[currentBranchIdx];

    // Thème basé sur la relation élémentaire LP stem × Day Master
    const themeKey = getElementRelation(natalStem.element, stem.element);

    const pillarStartAge = startAge + i * 10;
    const pillarStartYear = birthYear + pillarStartAge;

    pillars.push({
      index: i,
      startAge: pillarStartAge,
      endAge: pillarStartAge + 9,
      startYear: pillarStartYear,
      endYear: pillarStartYear + 9,
      stem,
      branch,
      theme: LUCK_PILLAR_THEMES[themeKey],
      themeKey,
    });
  }

  // Pilier courant
  const now = new Date();
  const currentAge = now.getFullYear() - birthYear;
  const currentPillar = pillars.find(p => currentAge >= p.startAge && currentAge <= p.endAge) ?? null;
  const currentPillarYearsLeft = currentPillar
    ? currentPillar.endAge - currentAge
    : 0;

  return {
    pillars,
    startAge,
    direction: forward ? 'forward' : 'backward',
    currentPillar,
    currentPillarYearsLeft,
  };
}

// ── Thèmes des Luck Pillars (interaction DM × LP) ──

const LUCK_PILLAR_THEMES: Record<ElementRelation, string> = {
  same:         'Période d\'identité renforcée — vous êtes au centre de votre pouvoir, confiance et clarté.',
  produces:     'Période de création et d\'expression — vos idées portent des fruits, investissez dans vos projets.',
  produced_by:  'Période de soutien et de ressources — les opportunités viennent à vous, acceptez l\'aide.',
  destroys:     'Période de conquête et de richesse — vous dominez votre environnement, prenez des risques calculés.',
  destroyed_by: 'Période de pression et de transformation — chaque épreuve vous renforce et vous affine.',
};

// ── Narratifs pour la lecture Passé/Présent/Futur ──

export function getLuckPillarNarrative(
  pillar: LuckPillar,
  temporality: 'past' | 'present' | 'future',
  yearsLeft?: number
): string {
  const stemName = `${pillar.stem.pinyin} (${pillar.stem.chinese})`;
  const branchName = `${pillar.branch.pinyin} (${pillar.branch.animal})`;
  const elementStr = `${pillar.stem.element} ${pillar.stem.yinYang}`;
  const periodStr = `${pillar.startYear}-${pillar.endYear}`;

  switch (temporality) {
    case 'past':
      return `De ${pillar.startAge} à ${pillar.endAge} ans (${periodStr}), vous étiez dans le Pilier ${stemName}-${branchName} (${elementStr}). ${pillar.theme}`;
    case 'present':
      return `Vous êtes dans le Pilier ${stemName}-${branchName} (${elementStr}) depuis ${pillar.startYear}. ${pillar.theme} Il vous reste ${yearsLeft ?? '?'} ans dans ce pilier.`;
    case 'future':
      return `En ${pillar.startYear}, vous entrez dans le Pilier ${stemName}-${branchName} (${elementStr}). ${pillar.theme}`;
  }
}

// ═════════════════════════════════════════════════════
// HOUR PILLAR — 時柱 (Pilier de l'Heure)                V4.2
// Complète les 4 Piliers : Année / Mois / Jour / Heure
// ═════════════════════════════════════════════════════

// ── Règle des 5 Rats (五鼠遁) — Stem de l'heure basé sur le stem du jour ──
// Le stem de la 1ère heure (Zi, 23h-01h) dépend du stem du jour :
//   Jia/Ji (0/5) → Jia (0)   Yi/Geng (1/6) → Bing (2)   Bing/Xin (2/7) → Wu (4)
//   Ding/Ren (3/8) → Geng (6)  Wu/Gui (4/9) → Ren (8)
const FIVE_RATS_START: Record<number, number> = {
  0: 0, 5: 0,   // Jia/Ji → Jia
  1: 2, 6: 2,   // Yi/Geng → Bing
  2: 4, 7: 4,   // Bing/Xin → Wu
  3: 6, 8: 6,   // Ding/Ren → Geng
  4: 8, 9: 8,   // Wu/Gui → Ren
};

export interface HourPillar {
  stemIdx: number;
  branchIdx: number;
  stem: HeavenlyStem;
  branch: EarthlyBranch;
  shichen: string;       // Nom chinois de la période (子时, 丑时...)
}

const SHICHEN_NAMES = ['子时','丑时','寅时','卯时','辰时','巳时','午时','未时','申时','酉时','戌时','亥时'];

/**
 * Calcule le Pilier de l'Heure à partir du Day Stem et de l'heure de naissance.
 * L'heure BaZi utilise le Shichen (2h) : Zi = 23h-01h, Chou = 01h-03h, etc.
 * ATTENTION : si l'heure est 23h-00h, on est déjà dans le jour SUIVANT en BaZi.
 */
export function getHourPillar(dayStemIdx: number, hour: number): HourPillar {
  // Heure → branche terrestre (même logique que getCurrentShichen)
  let branchIdx: number;
  if (hour >= 23 || hour < 1) branchIdx = 0;       // Zi
  else branchIdx = Math.floor((hour + 1) / 2);

  // Stem de l'heure : Five Rats Rule
  const ratStart = FIVE_RATS_START[dayStemIdx] ?? 0;
  const stemIdx = (ratStart + branchIdx) % 10;

  return {
    stemIdx,
    branchIdx,
    stem: HEAVENLY_STEMS[stemIdx],
    branch: EARTHLY_BRANCHES[branchIdx],
    shichen: SHICHEN_NAMES[branchIdx],
  };
}

/**
 * Calcule les 4 Piliers BaZi complets à partir de la date + heure de naissance.
 * C'est la carte d'identité énergétique complète (八字 = 8 caractères).
 */
export interface FourPillars {
  year:  { stem: HeavenlyStem; branch: EarthlyBranch };
  month: { stem: HeavenlyStem; branch: EarthlyBranch };
  day:   { stem: HeavenlyStem; branch: EarthlyBranch };
  hour:  HourPillar;
  dayMaster: HeavenlyStem;    // = day.stem — le "moi"
  hourRelation: ElementRelation;  // Relation DM × Hour stem
  hourNarrative: string;
}

export function calcFourPillars(birthDate: Date, birthHour: number): FourPillars {
  const yearP = getYearPillar(birthDate);
  const monthP = getMonthPillar(birthDate);
  const dayP = calcDayMaster(birthDate);
  const hourP = getHourPillar(dayP.stem.index, birthHour);

  const dm = dayP.stem;
  const hourRel = getElementRelation(dm.element, hourP.stem.element);

  // Narrative : la relation DM × Hour Pillar
  const HOUR_NARRATIVES: Record<ElementRelation, string> = {
    same:         'Ton Pilier de l\'Heure renforce votre Maître du Jour — énergie intérieure stable et cohérente.',
    produces:     'Votre heure de naissance exprime votre créativité — vous créez naturellement dans l\'intimité.',
    produced_by:  'Votre heure nourrit votre Maître du Jour — vous vous ressourcez facilement, soutien intérieur fort.',
    destroys:     'Votre heure montre une ambition profonde — vous conquérez même dans le silence.',
    destroyed_by: 'Ton heure te pousse à évoluer — tension intérieure productive, transformation constante.',
  };

  return {
    year:  { stem: HEAVENLY_STEMS[yearP.stemIdx], branch: EARTHLY_BRANCHES[yearP.branchIdx] },
    month: { stem: HEAVENLY_STEMS[monthP.stemIdx], branch: EARTHLY_BRANCHES[monthP.branchIdx] },
    day:   { stem: dayP.stem, branch: dayP.branch },
    hour:  hourP,
    dayMaster: dm,
    hourRelation: hourRel,
    hourNarrative: HOUR_NARRATIVES[hourRel],
  };
}

// ═══════════════════════════════════════════════════════════════════
// V4.3 — CHANGSHENG (十二長生) — Cycle des 12 phases vitales
// Source : 《三命通會》San Ming Tong Hui + Joey Yap BaZi Mastery
// Convention : Yang forward uniquement (Yin backward = V4.4)
// ═══════════════════════════════════════════════════════════════════

export type ChangshengPhase =
  | 'Birth' | 'Bath' | 'Crown' | 'Peak' | 'Emperor'
  | 'Decline' | 'Illness' | 'Death' | 'Tomb'
  | 'Extinction' | 'Embryo' | 'Nurture';

// Ordre canonique des 12 phases (index 0-11)
export const CHANGSHENG_PHASES: ChangshengPhase[] = [
  'Birth', 'Bath', 'Crown', 'Peak', 'Emperor',
  'Decline', 'Illness', 'Death', 'Tomb',
  'Extinction', 'Embryo', 'Nurture',
];

// Branche de départ (Birth) pour chaque élément du DM (Yang forward)
// Index = élément : 0=Bois, 1=Feu, 2=Terre, 3=Métal, 4=Eau
// Valeur = index branche où Birth tombe
// Convention Zi Ping : Terre suit Métal (Birth à Si)
const CHANGSHENG_BIRTH_BRANCH: Record<Element, number> = {
  'Bois':  11, // Hai 亥
  'Feu':    2, // Yin 寅
  'Terre':  5, // Si 巳 (suit Métal, convention Zi Ping)
  'Métal':  5, // Si 巳
  'Eau':    8, // Shen 申
};

export interface ChangshengScoring {
  global: number;
  vitalite: number;
  business: number;
  label_fr: string;
  chinese: string;
}

// Scoring par phase — plage ±4 global, ±4 vitalité
export const CHANGSHENG_SCORING: Record<ChangshengPhase, ChangshengScoring> = {
  Birth:      { global: +2, vitalite: +3, business: +1, label_fr: 'Naissance — élan vital',              chinese: '長生' },
  Bath:       { global: +1, vitalite: +1, business:  0, label_fr: 'Bain — purification, vulnérabilité',  chinese: '沐浴' },
  Crown:      { global: +2, vitalite: +2, business: +2, label_fr: 'Couronne — montée en puissance',      chinese: '冠帶' },
  Peak:       { global: +3, vitalite: +3, business: +3, label_fr: 'Apogée — maturité active',            chinese: '臨官' },
  Emperor:    { global: +4, vitalite: +4, business: +4, label_fr: 'Empereur — puissance maximale',       chinese: '帝旺' },
  Decline:    { global: -1, vitalite: -1, business: -1, label_fr: 'Déclin — ralentissement naturel',     chinese: '衰'   },
  Illness:    { global: -2, vitalite: -3, business: -1, label_fr: 'Maladie — fragilité temporaire',      chinese: '病'   },
  Death:      { global: -3, vitalite: -4, business: -2, label_fr: 'Mort — lâcher-prise nécessaire',      chinese: '死'   },
  Tomb:       { global: -2, vitalite: -3, business: -1, label_fr: 'Tombeau — gestation invisible',       chinese: '墓'   },
  Extinction: { global: -4, vitalite: -4, business: -3, label_fr: 'Extinction — vide avant renaissance', chinese: '絕'   },
  Embryo:     { global:  0, vitalite: +1, business:  0, label_fr: 'Embryon — potentiel latent',          chinese: '胎'   },
  Nurture:    { global: +1, vitalite: +2, business:  0, label_fr: 'Nourriture — croissance silencieuse', chinese: '養'   },
};

export interface ChangshengResult {
  phase: ChangshengPhase;
  scoring: ChangshengScoring;
  dmElement: Element;
}

/**
 * Calcule la phase Changsheng du Day Master pour une date donnée.
 * @param natalBirthDate Date de naissance (pour déterminer le DM)
 * @param targetDate Date cible (pour la branche du jour)
 */
export function getChangsheng(natalBirthDate: Date, targetDate: Date): ChangshengResult {
  const dm = calcDayMaster(natalBirthDate);
  const dayPillar = calcDayMaster(targetDate);
  const dmElement = dm.stem.element;
  const dayBranchIdx = dayPillar.branch.index;

  const birthBranch = CHANGSHENG_BIRTH_BRANCH[dmElement];
  const phaseIdx = (dayBranchIdx - birthBranch + 12) % 12;
  const phase = CHANGSHENG_PHASES[phaseIdx];

  return {
    phase,
    scoring: CHANGSHENG_SCORING[phase],
    dmElement,
  };
}

// ═══════════════════════════════════════════════════════════════════
// V4.3 — NA YIN (納音) — Élément mélodique des 60 JiaZi
// Source : 《淵海子平》Yuan Hai Zi Ping
// Usage : texture qualitative (ProfileTab + lecture stratégique)
// Pas de scoring direct — label + catégorie affichés
// ═══════════════════════════════════════════════════════════════════

export interface NaYinEntry {
  element: Element;
  name_cn: string;
  name_fr: string;
  description: string;
  category: 'puissant' | 'subtil' | 'stable' | 'fluide' | 'transformateur';
}

// 30 paires Na Yin (chaque paire couvre 2 JiaZi consécutifs)
// Index = floor(jiaZiPairIndex / 2)
const NAYIN_DATA: NaYinEntry[] = [
  /*  0 */ { element: 'Métal', name_cn: '海中金', name_fr: 'Or dans la Mer',             description: 'Métal caché, potentiel inexploité',         category: 'subtil' },
  /*  1 */ { element: 'Feu',   name_cn: '爐中火', name_fr: 'Feu dans le Four',            description: 'Feu contrôlé, puissance maîtrisée',         category: 'stable' },
  /*  2 */ { element: 'Bois',  name_cn: '大林木', name_fr: 'Bois de la Grande Forêt',     description: 'Croissance majestueuse, enracinement',      category: 'stable' },
  /*  3 */ { element: 'Terre', name_cn: '路旁土', name_fr: 'Terre du Bord du Chemin',     description: 'Terre accessible, générosité naturelle',    category: 'fluide' },
  /*  4 */ { element: 'Métal', name_cn: '劍鋒金', name_fr: 'Or de la Lame',               description: 'Métal tranchant, décision nette',           category: 'puissant' },
  /*  5 */ { element: 'Feu',   name_cn: '山頭火', name_fr: 'Feu du Sommet',               description: 'Feu visible de loin, leadership',           category: 'puissant' },
  /*  6 */ { element: 'Eau',   name_cn: '澗下水', name_fr: 'Eau du Torrent',              description: 'Eau vive cachée, ressource profonde',       category: 'subtil' },
  /*  7 */ { element: 'Terre', name_cn: '城頭土', name_fr: 'Terre des Remparts',          description: 'Terre fortifiée, protection solide',        category: 'stable' },
  /*  8 */ { element: 'Métal', name_cn: '白蠟金', name_fr: 'Or de la Cire Blanche',       description: 'Métal pur, raffinement discret',            category: 'subtil' },
  /*  9 */ { element: 'Bois',  name_cn: '楊柳木', name_fr: 'Bois du Saule',               description: 'Bois souple, adaptabilité gracieuse',       category: 'fluide' },
  /* 10 */ { element: 'Eau',   name_cn: '泉中水', name_fr: 'Eau de la Source',             description: 'Eau pure, origine et clarté',               category: 'fluide' },
  /* 11 */ { element: 'Terre', name_cn: '屋上土', name_fr: 'Terre du Toit',               description: 'Terre élevée, vision stratégique',          category: 'stable' },
  /* 12 */ { element: 'Feu',   name_cn: '霹靂火', name_fr: 'Feu de la Foudre',            description: 'Feu explosif, illumination soudaine',       category: 'puissant' },
  /* 13 */ { element: 'Bois',  name_cn: '松柏木', name_fr: 'Bois du Pin',                 description: 'Bois éternel, endurance et droiture',       category: 'stable' },
  /* 14 */ { element: 'Eau',   name_cn: '長流水', name_fr: 'Eau du Long Fleuve',           description: 'Eau infatigable, persévérance',             category: 'stable' },
  /* 15 */ { element: 'Métal', name_cn: '沙中金', name_fr: 'Or dans le Sable',            description: 'Métal à extraire, talent à révéler',        category: 'subtil' },
  /* 16 */ { element: 'Feu',   name_cn: '山下火', name_fr: 'Feu sous la Montagne',        description: 'Feu couvant, énergie contenue',             category: 'subtil' },
  /* 17 */ { element: 'Bois',  name_cn: '平地木', name_fr: 'Bois de la Plaine',           description: 'Bois étendu, connexion horizontale',        category: 'fluide' },
  /* 18 */ { element: 'Terre', name_cn: '壁上土', name_fr: 'Terre du Mur',                description: 'Terre structurante, cadre et limites',      category: 'stable' },
  /* 19 */ { element: 'Métal', name_cn: '金箔金', name_fr: 'Or en Feuille',               description: 'Métal fin, beauté et fragilité',            category: 'subtil' },
  /* 20 */ { element: 'Feu',   name_cn: '佛燈火', name_fr: 'Feu de la Lampe de Bouddha',  description: 'Feu sacré, illumination spirituelle',       category: 'transformateur' },
  /* 21 */ { element: 'Eau',   name_cn: '天河水', name_fr: 'Eau de la Voie Lactée',       description: 'Eau céleste, inspiration divine',           category: 'puissant' },
  /* 22 */ { element: 'Terre', name_cn: '大驛土', name_fr: 'Terre de la Grande Route',    description: 'Terre foulée, expérience accumulée',        category: 'stable' },
  /* 23 */ { element: 'Métal', name_cn: '釵環金', name_fr: 'Or de l\'Épingle',            description: 'Métal ouvragé, précision artisanale',       category: 'subtil' },
  /* 24 */ { element: 'Bois',  name_cn: '桑柘木', name_fr: 'Bois du Mûrier',              description: 'Bois nourricier, fertilité discrète',       category: 'fluide' },
  /* 25 */ { element: 'Eau',   name_cn: '大溪水', name_fr: 'Eau du Grand Torrent',        description: 'Eau puissante, force naturelle',            category: 'puissant' },
  /* 26 */ { element: 'Terre', name_cn: '沙中土', name_fr: 'Terre dans le Sable',         description: 'Terre meuble, transformation en cours',     category: 'transformateur' },
  /* 27 */ { element: 'Feu',   name_cn: '天上火', name_fr: 'Feu du Ciel',                 description: 'Feu absolu, énergie solaire pure',          category: 'puissant' },
  /* 28 */ { element: 'Bois',  name_cn: '石榴木', name_fr: 'Bois du Grenadier',           description: 'Bois fruitier, abondance inattendue',      category: 'transformateur' },
  /* 29 */ { element: 'Eau',   name_cn: '大海水', name_fr: 'Eau de la Grande Mer',        description: 'Eau infinie, profondeur insondable',        category: 'puissant' },
];

// Interprétation stratégique par catégorie Na Yin
export const NAYIN_CATEGORY_ADVICE: Record<NaYinEntry['category'], string> = {
  puissant:       'Énergie explosive disponible — agir vite, frapper fort.',
  subtil:         'Force cachée — patience requise, le timing se révèlera.',
  stable:         'Socle solide — construire, consolider, durer.',
  fluide:         'Adaptabilité naturelle — surfer les changements.',
  transformateur: 'Mutation en cours — accepter l\'inconfort, la renaissance arrive.',
};

/**
 * Trouve l'index JiaZi (0-59) à partir des indices stem et branch.
 * Retourne -1 si la paire est invalide (parités différentes).
 */
function getJiaZiPairIndex(stemIdx: number, branchIdx: number): number {
  if (stemIdx % 2 !== branchIdx % 2) return -1;
  for (let k = stemIdx; k < 60; k += 10) {
    if (k % 12 === branchIdx) return k;
  }
  return -1;
}

export interface NaYinResult {
  entry: NaYinEntry;
  advice: string;
  jiaZiIndex: number;
}

/**
 * Calcule le Na Yin du pilier du jour pour une date donnée.
 */
export function getNaYin(date: Date): NaYinResult {
  const dayPillar = calcDayMaster(date);
  const stemIdx = dayPillar.stem.index;
  const branchIdx = dayPillar.branch.index;
  const pairIdx = getJiaZiPairIndex(stemIdx, branchIdx);
  const groupIdx = Math.floor(pairIdx / 2);
  const entry = NAYIN_DATA[groupIdx];

  return {
    entry,
    advice: NAYIN_CATEGORY_ADVICE[entry.category],
    jiaZiIndex: pairIdx,
  };
}

// ═══════════════════════════════════════════════════════════════════
// V4.3 — SHEN SHA (神煞) — 4 étoiles symboliques quotidiennes
// Source : Joey Yap – BaZi Profiling, tradition Zi Ping
// Plage totale : +0 à +6 (additif uniquement, négatifs = Clashes/Harms existants)
// ═══════════════════════════════════════════════════════════════════

export type ShenShaName = 'TianYi' | 'YiMa' | 'HuaGai' | 'HongLuan';

export interface ShenShaInfo {
  name: ShenShaName;
  chinese: string;
  label_fr: string;
  global: number;
  business: number;
  amour: number;
  creativite: number;
  vitalite: number;
  introspection: number;
}

export const SHEN_SHA_INFO: Record<ShenShaName, ShenShaInfo> = {
  TianYi:   { name: 'TianYi',   chinese: '天乙貴人', label_fr: 'Noble Star — aide inattendue',        global: +2, business: +2, amour:  0, creativite:  0, vitalite:  0, introspection:  0 },
  YiMa:     { name: 'YiMa',     chinese: '驛馬',     label_fr: 'Travel Horse — mouvement favorable',   global: +1, business: +2, amour:  0, creativite:  0, vitalite: +1, introspection:  0 },
  HuaGai:   { name: 'HuaGai',   chinese: '華蓋',     label_fr: 'Canopy Star — solitude créative',      global:  0, business:  0, amour:  0, creativite: +3, vitalite:  0, introspection: +2 },
  HongLuan: { name: 'HongLuan', chinese: '紅鸞',     label_fr: 'Red Phoenix — énergie romantique',     global: +1, business:  0, amour: +3, creativite:  0, vitalite:  0, introspection:  0 },
};

// ── Tian Yi 天乙貴人 ── basé sur Day Stem natal → branches cibles
// Si la branche du jour cible correspond, Tian Yi est activé
const TIAN_YI_MAP: Record<number, number[]> = {
  0: [1, 7],   // Jia  → Chou, Wei
  1: [0, 8],   // Yi   → Zi, Shen
  2: [9, 11],  // Bing → You, Hai
  3: [9, 11],  // Ding → You, Hai
  4: [1, 7],   // Wu   → Chou, Wei
  5: [0, 8],   // Ji   → Zi, Shen
  6: [1, 7],   // Geng → Chou, Wei
  7: [2, 6],   // Xin  → Yin, Wu
  8: [3, 5],   // Ren  → Mao, Si
  9: [3, 5],   // Gui  → Mao, Si
};

// ── Yi Ma 驛馬 ── basé sur Year Branch natal → branche cible du jour
// Règle des triades : Shen/Zi/Chen→Yin, Yin/Wu/Xu→Shen, Si/You/Chou→Hai, Hai/Mao/Wei→Si
const YI_MA_MAP: Record<number, number> = {
  0: 2,   // Zi    → Yin
  1: 11,  // Chou  → Hai
  2: 8,   // Yin   → Shen
  3: 5,   // Mao   → Si
  4: 2,   // Chen  → Yin
  5: 11,  // Si    → Hai
  6: 8,   // Wu    → Shen
  7: 5,   // Wei   → Si
  8: 2,   // Shen  → Yin
  9: 11,  // You   → Hai
  10: 8,  // Xu    → Shen
  11: 5,  // Hai   → Si
};

// ── Hua Gai 華蓋 ── basé sur Year Branch natal → branche cible du jour
// Règle des triades : Shen/Zi/Chen→Chen, Yin/Wu/Xu→Xu, Si/You/Chou→Chou, Hai/Mao/Wei→Wei
const HUA_GAI_MAP: Record<number, number> = {
  0: 4,   // Zi    → Chen
  1: 1,   // Chou  → Chou
  2: 10,  // Yin   → Xu
  3: 7,   // Mao   → Wei
  4: 4,   // Chen  → Chen
  5: 1,   // Si    → Chou
  6: 10,  // Wu    → Xu
  7: 7,   // Wei   → Wei
  8: 4,   // Shen  → Chen
  9: 1,   // You   → Chou
  10: 10, // Xu    → Xu
  11: 7,  // Hai   → Wei
};

// ── Hong Luan 紅鸞 ── basé sur Year Branch natal → branche cible du jour
// Formule : target = (3 - yearBranchIdx + 12) % 12
const HONG_LUAN_MAP: Record<number, number> = {
  0: 3,   // Zi    → Mao
  1: 2,   // Chou  → Yin
  2: 1,   // Yin   → Chou
  3: 0,   // Mao   → Zi
  4: 11,  // Chen  → Hai
  5: 10,  // Si    → Xu
  6: 9,   // Wu    → You
  7: 8,   // Wei   → Shen
  8: 7,   // Shen  → Wei
  9: 6,   // You   → Wu
  10: 5,  // Xu    → Si
  11: 4,  // Hai   → Chen
};

export interface ShenShaResult {
  active: ShenShaInfo[];
  totalGlobal: number;
  totalBusiness: number;
  totalAmour: number;
  totalCreativite: number;
  totalVitalite: number;
  totalIntrospection: number;
}

/**
 * Vérifie quels Shen Sha sont activés pour une date donnée.
 * @param natalBirthDate Date de naissance (pour DM stem + year branch)
 * @param targetDate Date cible (branche du jour à tester)
 */
export function checkShenSha(natalBirthDate: Date, targetDate: Date): ShenShaResult {
  const natalDayPillar = calcDayMaster(natalBirthDate);
  const natalYearPillar = getYearPillar(natalBirthDate);
  const targetDayPillar = calcDayMaster(targetDate);

  const natalDayStemIdx = natalDayPillar.stem.index;
  const natalYearBranchIdx = natalYearPillar.branchIdx;
  const targetBranchIdx = targetDayPillar.branch.index;

  const active: ShenShaInfo[] = [];

  // Tian Yi : Day Stem natal → branches cibles
  if (TIAN_YI_MAP[natalDayStemIdx]?.includes(targetBranchIdx)) {
    active.push(SHEN_SHA_INFO.TianYi);
  }

  // Yi Ma : Year Branch natal → branche cible
  if (YI_MA_MAP[natalYearBranchIdx] === targetBranchIdx) {
    active.push(SHEN_SHA_INFO.YiMa);
  }

  // Hua Gai : Year Branch natal → branche cible
  if (HUA_GAI_MAP[natalYearBranchIdx] === targetBranchIdx) {
    active.push(SHEN_SHA_INFO.HuaGai);
  }

  // Hong Luan : Year Branch natal → branche cible
  if (HONG_LUAN_MAP[natalYearBranchIdx] === targetBranchIdx) {
    active.push(SHEN_SHA_INFO.HongLuan);
  }

  return {
    active,
    totalGlobal:        active.reduce((s, a) => s + a.global, 0),
    totalBusiness:      active.reduce((s, a) => s + a.business, 0),
    totalAmour:         active.reduce((s, a) => s + a.amour, 0),
    totalCreativite:    active.reduce((s, a) => s + a.creativite, 0),
    totalVitalite:      active.reduce((s, a) => s + a.vitalite, 0),
    totalIntrospection: active.reduce((s, a) => s + a.introspection, 0),
  };
}
