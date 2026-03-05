// ═══════════════════════════════════════════════════════════════════
// DM STRENGTH — Force du Maître du Jour (Sprint AI — Chantier 5)
// Consensus 3/3 IAs (GPT R2 + Grok R2 + Gemini R2)
//
// 5 facteurs : YueLing(30) + Tonggen(20) + SupportRatio(30) + Changsheng(10) + Debuffs(10)
// Indice 0-100, classes Faible(<40) / Moyen(40-60) / Fort(>60)
// Modulation ±20% sur 10 Gods via s = clamp((DM-50)/20, -1, +1)
// Sans heure : 0.65 × DM_3p + 0.35 × 50 (GPT R2 C5)
//
// Sources : 子平 Zi Ping, 三命通會 San Ming Tong Hui, 滴天髓 Di Tian Sui
// ═══════════════════════════════════════════════════════════════════

import {
  type Element,
  type HeavenlyStem,
  HEAVENLY_STEMS,
  EARTHLY_BRANCHES,
  calcDayMaster,
  getYearPillar,
  getMonthPillar,
  getElementRelation,
} from './bazi';

// ── Types ──

export type DMClass = 'faible' | 'moyen' | 'fort';

export interface DMStrengthResult {
  score: number;       // 0-100
  dmClass: DMClass;    // Faible/Moyen/Fort
  s: number;           // facteur de modulation [-1, +1]
  hasHour: boolean;    // si le pilier horaire a été utilisé
  breakdown: {
    yueLing: number;
    tonggen: number;
    supportRatio: number;
    changsheng: number;
    debuffs: number;
  };
}

// ── Tables 旺相休囚死 (Wang Xiang Si Qiu) ──
// Pour chaque élément du DM, score selon l'élément de la branche du mois (saison)
// 旺=30, 相=24, 休=15, 囚=7, 死=0 (poids révisé GPT R2: YueLing=30)

const ELEMENT_ORDER: Element[] = ['Bois', 'Feu', 'Terre', 'Métal', 'Eau'];

// Saison dominante par branche du mois (index 0-11)
// Yin(2)/Mao(3)/Chen(4)=Bois, Si(5)/Wu(6)/Wei(7)=Feu,
// Shen(8)/You(9)/Xu(10)=Métal, Hai(11)/Zi(0)/Chou(1)=Eau
// Terre = inter-saison (Chen, Wei, Xu, Chou) mais l'élément dominant est celui de la saison
const MONTH_BRANCH_ELEMENT: Record<number, Element> = {
  0: 'Eau',    // Zi
  1: 'Terre',  // Chou (fin hiver, Terre)
  2: 'Bois',   // Yin
  3: 'Bois',   // Mao
  4: 'Terre',  // Chen (inter-saison)
  5: 'Feu',    // Si
  6: 'Feu',    // Wu
  7: 'Terre',  // Wei (inter-saison)
  8: 'Métal',  // Shen
  9: 'Métal',  // You
  10: 'Terre', // Xu (inter-saison)
  11: 'Eau',   // Hai
};

/**
 * Calcule le score 旺相休囚死 du DM dans la saison du mois.
 * 旺(wang)=prospère, 相(xiang)=actif, 休(xiu)=repos, 囚(qiu)=emprisonné, 死(si)=mort
 */
function calcYueLing(dmElement: Element, monthBranchIdx: number): number {
  const seasonElement = MONTH_BRANCH_ELEMENT[monthBranchIdx] ?? 'Terre';
  const rel = getElementRelation(dmElement, seasonElement);

  switch (rel) {
    case 'same':        return 30; // 旺 — même élément, pleine force
    case 'produced_by': return 24; // 相 — la saison nourrit le DM
    case 'produces':    return 15; // 休 — le DM dépense son énergie
    case 'destroyed_by': return 7; // 囚 — le DM est contrôlé
    case 'destroys':    return 0;  // 死 — le DM gaspille sa force
  }
}

// ── Troncs Cachés (藏干) dans chaque Branche ──
// Réutilisé de bazi.ts mais dupliqué ici pour indépendance du module
const CANG_GAN: Record<number, number[]> = {
  0:  [9],        // 子 Zi:   Gui (Eau Yin)
  1:  [5, 9, 7],  // 丑 Chou: Ji, Gui, Xin
  2:  [0, 2, 4],  // 寅 Yin:  Jia, Bing, Wu
  3:  [1],        // 卯 Mao:  Yi
  4:  [4, 1, 9],  // 辰 Chen: Wu, Yi, Gui
  5:  [2, 6, 4],  // 巳 Si:   Bing, Geng, Wu
  6:  [3, 5],     // 午 Wu:   Ding, Ji
  7:  [5, 3, 1],  // 未 Wei:  Ji, Ding, Yi
  8:  [6, 8, 4],  // 申 Shen: Geng, Ren, Wu
  9:  [7],        // 酉 You:  Xin
  10: [4, 7, 3],  // 戌 Xu:   Wu, Xin, Ding
  11: [8, 0],     // 亥 Hai:  Ren, Jia
};

/**
 * Calcule la force des racines (通根 Tonggen) du DM dans les branches des piliers.
 * Forte(+20) si le DM trouve sa racine dans la branche principale,
 * Moyenne(+12) si dans un caché significatif, Faible(+6) si mineur, 0 si rien.
 */
function calcTonggen(dmElement: Element, branchIndices: number[]): number {
  let bestRoot = 0;

  for (const brIdx of branchIndices) {
    const hidden = CANG_GAN[brIdx] ?? [];
    for (let pos = 0; pos < hidden.length; pos++) {
      const stemEl = HEAVENLY_STEMS[hidden[pos]].element;
      if (stemEl === dmElement) {
        // Position 0 = racine principale (本气), 1 = résidu fort, 2+ = résidu mineur
        const rootScore = pos === 0 ? 20 : pos === 1 ? 12 : 6;
        bestRoot = Math.max(bestRoot, rootScore);
      }
    }
  }

  return bestRoot;
}

/**
 * Calcule le ratio Support vs Drain parmi tous les troncs et cachés visibles.
 * Support = Resource (produit le DM) + Companion (même élément)
 * Drain = Output (DM produit) + Wealth (DM contrôle) + Authority (contrôle le DM)
 * pts = 15 × (r + 1) ∈ [0, 30]
 */
function calcSupportRatio(dmElement: Element, allStemElements: Element[]): number {
  let support = 0;
  let drain = 0;

  for (const el of allStemElements) {
    const rel = getElementRelation(el, dmElement);
    if (rel === 'same' || rel === 'produces') {
      support++;
    } else {
      drain++;
    }
  }

  const total = support + drain;
  if (total === 0) return 15; // neutre
  const r = (support - drain) / total;
  return Math.round(15 * (r + 1)); // 0..30
}

// ── Table Changsheng (十二長生) ──
// Phase du DM dans la branche du mois
// Index : 0=长生, 1=沐浴, 2=冠带, 3=临官, 4=帝旺, 5=衰, 6=病, 7=死, 8=墓, 9=绝, 10=胎, 11=养

const CHANGSHENG_START: Record<number, number> = {
  // stem index → branche de 长生 (naissance)
  // Yang stems (顺行)
  0: 11,  // Jia (Bois Yang) → 长生 at Hai
  2: 2,   // Bing (Feu Yang) → 长生 at Yin
  4: 2,   // Wu (Terre Yang) → 长生 at Yin (suit le Feu)
  6: 5,   // Geng (Métal Yang) → 长生 at Si
  8: 8,   // Ren (Eau Yang) → 长生 at Shen
  // Yin stems (逆行)
  1: 6,   // Yi (Bois Yin) → 长生 at Wu
  3: 9,   // Ding (Feu Yin) → 长生 at You
  5: 9,   // Ji (Terre Yin) → 长生 at You (suit le Feu)
  7: 0,   // Xin (Métal Yin) → 长生 at Zi
  9: 3,   // Gui (Eau Yin) → 长生 at Mao
};

const CHANGSHENG_SCORES = [10, 5, 8, 8, 10, 3, 3, 0, 0, 0, 3, 5];
// 长生=10, 沐浴=5, 冠带=8, 临官=8, 帝旺=10, 衰=3, 病=3, 死=0, 墓=0, 绝=0, 胎=3, 养=5

function calcChangshengScore(dayStemIdx: number, monthBranchIdx: number): number {
  const startBranch = CHANGSHENG_START[dayStemIdx];
  if (startBranch === undefined) return 5; // fallback neutre

  const isYang = dayStemIdx % 2 === 0;
  let phaseIdx: number;
  if (isYang) {
    phaseIdx = ((monthBranchIdx - startBranch) % 12 + 12) % 12;
  } else {
    // Yin stems go in reverse
    phaseIdx = ((startBranch - monthBranchIdx) % 12 + 12) % 12;
  }

  return CHANGSHENG_SCORES[phaseIdx] ?? 5;
}

/**
 * Calcule les affaiblissements structurels : clash mois↔jour, etc.
 * Retourne 0 (aucun), -5 (moyen), -10 (fort)
 */
function calcDebuffs(dayBranchIdx: number, monthBranchIdx: number): number {
  // Clash direct (六冲) : branches opposées (+6 mod 12)
  const isClash = ((dayBranchIdx + 6) % 12) === monthBranchIdx;
  if (isClash) return -10;

  // Harm (六害) : paires fixes
  const HARM_PAIRS: [number, number][] = [
    [0, 7], [1, 6], [2, 5], [3, 4], [8, 11], [9, 10],
  ];
  for (const [a, b] of HARM_PAIRS) {
    if ((dayBranchIdx === a && monthBranchIdx === b) ||
        (dayBranchIdx === b && monthBranchIdx === a)) {
      return -5;
    }
  }

  return 0;
}

// ═══════════════════════════════════
// FONCTION PRINCIPALE
// ═══════════════════════════════════

/**
 * Calcule la Force du Maître du Jour (DM Strength).
 * @param birthDate Date de naissance
 * @param birthHour Heure de naissance (0-23) ou null si inconnue
 * @returns DMStrengthResult avec score 0-100 et facteur de modulation s ∈ [-1, +1]
 */
export function calcDMStrength(birthDate: Date, birthHour: number | null = null): DMStrengthResult {
  const dayPillar = calcDayMaster(birthDate);
  const monthPillar = getMonthPillar(birthDate);
  const yearPillar = getYearPillar(birthDate);
  const dmStem = dayPillar.stem;
  const dmElement = dmStem.element;

  // ── Collecter les branches pour Tonggen ──
  const branches = [yearPillar.branchIdx, monthPillar.branchIdx, dayPillar.branch.index];

  // ── Collecter tous les éléments (stems + hidden) pour Support Ratio ──
  const allElements: Element[] = [];

  // Troncs visibles (année, mois — le DM lui-même est exclu)
  allElements.push(HEAVENLY_STEMS[yearPillar.stemIdx].element);
  allElements.push(HEAVENLY_STEMS[monthPillar.stemIdx].element);

  // Troncs cachés de toutes les branches
  for (const brIdx of branches) {
    const hidden = CANG_GAN[brIdx] ?? [];
    for (const hIdx of hidden) {
      allElements.push(HEAVENLY_STEMS[hIdx].element);
    }
  }

  // ── Si heure connue, ajouter le pilier horaire ──
  let hasHour = false;
  if (birthHour !== null && birthHour >= 0 && birthHour <= 23) {
    hasHour = true;
    // Five Rats Rule pour le tronc de l'heure
    const FIVE_RATS: Record<number, number> = { 0: 0, 1: 2, 2: 4, 3: 6, 4: 8, 5: 0, 6: 2, 7: 4, 8: 6, 9: 8 };
    const hourBranchIdx = Math.floor(((birthHour + 1) % 24) / 2);
    const hourStemIdx = (FIVE_RATS[dayPillar.stem.index] + hourBranchIdx) % 10;

    branches.push(hourBranchIdx);
    allElements.push(HEAVENLY_STEMS[hourStemIdx].element);
    const hourHidden = CANG_GAN[hourBranchIdx] ?? [];
    for (const hIdx of hourHidden) {
      allElements.push(HEAVENLY_STEMS[hIdx].element);
    }
  }

  // ── 5 facteurs ──
  const yueLing = calcYueLing(dmElement, monthPillar.branchIdx);
  const tonggen = calcTonggen(dmElement, branches);
  const supportRatio = calcSupportRatio(dmElement, allElements);
  const changsheng = calcChangshengScore(dmStem.index, monthPillar.branchIdx);
  const debuffs = calcDebuffs(dayPillar.branch.index, monthPillar.branchIdx);

  let rawScore = Math.max(0, Math.min(100, yueLing + tonggen + supportRatio + changsheng + debuffs));

  // Sans heure : shrink vers neutre (GPT R2 C5 ajusté)
  if (!hasHour) {
    rawScore = Math.round(0.65 * rawScore + 0.35 * 50);
  }

  const score = Math.max(0, Math.min(100, rawScore));
  const dmClass: DMClass = score < 40 ? 'faible' : score > 60 ? 'fort' : 'moyen';
  const s = Math.max(-1, Math.min(1, (score - 50) / 20));

  return {
    score,
    dmClass,
    s,
    hasHour,
    breakdown: { yueLing, tonggen, supportRatio, changsheng, debuffs },
  };
}

// ═══════════════════════════════════
// MODULATION 10 GODS (utilisé dans convergence-daily.ts)
// ═══════════════════════════════════

// Catégories de 10 Gods pour la modulation DM
// Wealth/Officer/Output = favorisés si DM fort (m_fav)
// Resource/Companion = favorisés si DM faible (m_sup)
import type { TenGodName } from './bazi';

const WEALTH_OFFICER_OUTPUT: TenGodName[] = [
  'zheng_cai', 'pian_cai', 'zheng_guan', 'qi_sha', 'shi_shen', 'shang_guan',
];
const RESOURCE_COMPANION: TenGodName[] = [
  'zheng_yin', 'pian_yin', 'bi_jian', 'jie_cai',
];

/**
 * Retourne le multiplicateur DM Strength pour un 10 God donné.
 * m_fav = 1 + 0.20 × s  (Wealth/Officer/Output)
 * m_sup = 1 - 0.20 × s  (Resource/Companion)
 */
export function getDMMultiplier(godName: TenGodName, sValue: number): number {
  if (WEALTH_OFFICER_OUTPUT.includes(godName)) {
    return 1 + 0.20 * sValue;
  }
  if (RESOURCE_COMPANION.includes(godName)) {
    return 1 - 0.20 * sValue;
  }
  return 1.0; // fallback neutre
}
