/**
 * iching-yao.ts — Lignes Duc de Zhou (爻辞 Yao Ci) Kaironaute V4.9
 * Règle de Zhu Xi pour la sélection de la ligne active
 * 6 archétypes canoniques du Zhouyi (présages du texte original)
 * Modèle Gemini : matrice 384 valeurs (64×6) peuplée par les constantes archétypales
 * V4.9 : fix Zhu Xi 4-5-6 lignes mutantes (règle authentique — lignes NON-mutantes)
 * V4.9 : Nuclear Hexagram (互卦 Hu Gua) — getNuclearScore(hexNum)
 *
 * Sources : Zhouyi / I Ching — Wilhelm/Baynes, Blofeld, Rutt (valences sémantiques)
 * Convention hexagrammes : 1-64 (index = hexNum, padding [] à l'index 0)
 * Convention lignes : index 0-5 (ligne 1 à ligne 6, du bas vers le haut)
 */

// ── 6 Archétypes canoniques du Zhouyi ──
// Présages récurrents dans les 384 Yao Ci originaux (tradition Roi Wen / Duc de Zhou)

export type YaoArchetype =
  | 'DA_JI'      // 大吉 — Grand auspice (Supreme fortune)
  | 'JI'         // 吉   — Auspice (Fortune)
  | 'WU_JIU'    // 无咎 — Sans blâme / Neutre (No blame)
  | 'LIN'        // 吝   — Regret / Tension (Humiliation, minor difficulty)
  | 'XIONG'      // 凶   — Malheur (Misfortune)
  | 'DA_XIONG';  // 大凶 — Grand malheur (Great misfortune)

export const YAO_SCORE: Record<YaoArchetype, number> = {
  DA_JI:    4,
  JI:       2,
  WU_JIU:   0,
  LIN:     -2,
  XIONG:   -3,
  DA_XIONG: -4,
};

// Alias courts pour la table
const { DA_JI, JI, WU_JIU, LIN, XIONG, DA_XIONG } = YAO_SCORE;

/**
 * Matrice 64×6 des valences Yao Ci
 * Index 0 : padding (hexagrammes numérotés 1-64)
 * Chaque sous-tableau : [ligne1, ligne2, ligne3, ligne4, ligne5, ligne6]
 * Valeurs issues des présages sémantiques Wilhelm/Baynes + Blofeld
 *
 * Lecture : forte teneur positive = JI/DA_JI / neutre = WU_JIU / malus = LIN/XIONG/DA_XIONG
 */
export const YAO_VALUES: number[][] = [
  [],                                              // [0] padding
  [ JI,  DA_JI, WU_JIU,  LIN,  DA_JI,  LIN  ],  // [1]  Qian 乾 — Le Ciel (Force créatrice)
  [WU_JIU,  JI,  LIN,   WU_JIU, DA_JI, XIONG ],  // [2]  Kun 坤 — La Terre (Réceptivité)
  [ JI,  WU_JIU, XIONG, WU_JIU,  JI,  WU_JIU ],  // [3]  Zhun 屯 — Difficultés initiales
  [WU_JIU, JI,  WU_JIU,  LIN,  WU_JIU,  LIN  ],  // [4]  Meng 蒙 — Jeunesse inexpérimentée
  [ JI,  WU_JIU,  JI,   XIONG, DA_JI, WU_JIU ],  // [5]  Xu 需 — Attente / L'Attente
  [LIN,  WU_JIU, XIONG,  LIN,  WU_JIU,  JI   ],  // [6]  Song 讼 — Clarification
  [WU_JIU, XIONG, LIN,  WU_JIU,  JI,   XIONG ],  // [7]  Shi 师 — L'Armée
  [ JI,  WU_JIU,  JI,   LIN,   JI,   WU_JIU  ],  // [8]  Bi 比 — Solidarité / Union
  [ JI,   JI,  WU_JIU,  LIN,   JI,   WU_JIU  ],  // [9]  Xiao Xu 小畜 — Pouvoir dompteur du petit
  [ JI,  WU_JIU,  LIN,  WU_JIU, DA_JI,  JI   ],  // [10] Lü 履 — La Marche / Conduite
  [ JI,  DA_JI,  JI,   WU_JIU, WU_JIU,  LIN  ],  // [11] Tai 泰 — La Paix
  [XIONG, LIN,  WU_JIU, DA_JI, DA_JI, XIONG  ],   // [12] Pi 否 — Stagnation / Pause nécessaire
  [ JI,  WU_JIU, LIN,   JI,   DA_JI,  LIN   ],   // [13] Tong Ren 同人 — Fraternité universelle
  [XIONG, JI,   JI,    JI,    JI,   DA_JI   ],   // [14] Da You 大有 — Grande possession
  [WU_JIU, JI,  DA_JI,  LIN,   JI,   WU_JIU  ],  // [15] Qian 謙 — Humilité
  [WU_JIU, JI,  WU_JIU,  JI,  DA_JI,  LIN   ],   // [16] Yu 豫 — Enthousiasme
  [ JI,  WU_JIU, XIONG, LIN,  WU_JIU,  LIN   ],  // [17] Sui 隨 — Suivre / La Suite
  [LIN,  WU_JIU,  JI,   LIN,   JI,   WU_JIU  ],  // [18] Gu 蠱 — Correction / Remise en ordre
  [ JI,  DA_JI,  LIN,  WU_JIU,  JI,   WU_JIU ],  // [19] Lin 臨 — Approche
  [WU_JIU, JI,  WU_JIU, DA_JI, WU_JIU,  LIN  ],  // [20] Guan 觀 — Contemplation
  [LIN,  WU_JIU,  JI,   JI,   DA_JI,  WU_JIU ],  // [21] Shi He 噬嗑 — Morsure (Jugement)
  [ JI,   JI,  DA_JI,  LIN,   LIN,  WU_JIU   ],  // [22] Bi 賁 — Grâce / Ornement
  [WU_JIU, XIONG, XIONG, DA_JI,  JI,   WU_JIU ],  // [23] Bo 剝 — Dissolution
  [WU_JIU, LIN,  WU_JIU,  JI,   JI,   DA_JI  ],  // [24] Fu 復 — Retour
  [ JI,  WU_JIU, XIONG, XIONG, DA_JI,  LIN   ],  // [25] Wu Wang 無妄 — Innocence
  [ JI,   JI,  DA_JI,  LIN,   JI,   WU_JIU  ],   // [26] Da Xu 大畜 — Pouvoir dompteur du grand
  [WU_JIU, JI,  WU_JIU, DA_JI,  LIN,  WU_JIU ],  // [27] Yi 頤 — Les Commissures / Nourrir
  [XIONG, JI,   JI,   WU_JIU,  JI,   XIONG  ],   // [28] Da Guo 大過 — Grande prépondérance
  [XIONG, LIN,  WU_JIU, XIONG,  JI,   LIN   ],   // [29] Kan 坎 — Profondeur (l'Eau)
  [WU_JIU, DA_JI, JI,   WU_JIU, DA_JI,  LIN  ],  // [30] Li 離 — Ce qui adhère (le Feu)
  [WU_JIU, JI,   LIN,   JI,    JI,   WU_JIU  ],  // [31] Xian 咸 — Influence / Attraction
  [ JI,  WU_JIU, DA_JI,  LIN,   JI,   LIN   ],   // [32] Heng 恆 — Durée / Permanence
  [LIN,  XIONG,  JI,   WU_JIU, DA_JI,  LIN   ],  // [33] Dun 遯 — Retraite
  [ JI,  WU_JIU,  JI,  XIONG,  JI,   DA_JI  ],   // [34] Da Zhuang 大壯 — La Puissance du grand
  [LIN,   JI,   JI,   WU_JIU, DA_JI, WU_JIU  ],  // [35] Jin 晉 — Progrès
  [WU_JIU, JI,   LIN,  WU_JIU,  JI,   XIONG  ],  // [36] Ming Yi 明夷 — Lumière voilée
  [WU_JIU, LIN,  WU_JIU,  JI,  DA_JI,  LIN   ],  // [37] Jia Ren 家人 — Le Clan
  [WU_JIU, XIONG, JI,  WU_JIU,  LIN,   JI    ],  // [38] Kui 睽 — Opposition
  [LIN,   JI,  WU_JIU, DA_JI, WU_JIU,  LIN   ],  // [39] Jian 蹇 — Obstruction
  [ JI,  WU_JIU,  LIN,  DA_JI,  JI,   WU_JIU ],  // [40] Jie 解 — Délivrance
  [WU_JIU, JI,   JI,   LIN,   DA_JI, WU_JIU  ],  // [41] Sun 損 — Lâcher-prise
  [ JI,   JI,   LIN,  WU_JIU,  JI,   DA_JI  ],   // [42] Yi 益 — Augmentation
  [ JI,   LIN,  WU_JIU,  JI,   JI,   XIONG  ],   // [43] Guai 夬 — Percée / Résolution
  [LIN,  WU_JIU, XIONG,  JI,   DA_JI,  LIN   ],  // [44] Gou 姤 — Venir à la rencontre
  [ JI,   JI,   JI,   LIN,   WU_JIU,  JI    ],   // [45] Cui 萃 — Rassemblement
  [WU_JIU, JI,  DA_JI,  LIN,   JI,   WU_JIU  ],  // [46] Sheng 升 — Pousser vers le haut
  [LIN,  WU_JIU,  JI,  XIONG,  LIN,  WU_JIU  ],  // [47] Kun 困 — Endurance
  [ JI,  WU_JIU,  LIN,  DA_JI, WU_JIU,  JI   ],  // [48] Jing 井 — Le Puits
  [LIN,   JI,  WU_JIU,  LIN,   DA_JI,  JI   ],   // [49] Ge 革 — Révolution / Mue
  [WU_JIU, JI,   LIN,   JI,   DA_JI, WU_JIU  ],  // [50] Ding 鼎 — Le Chaudron
  [XIONG,  JI,   LIN,  DA_JI, WU_JIU,  LIN   ],  // [51] Zhen 震 — Le Tonnerre / L'Éveilleur
  [ JI,  WU_JIU,  JI,   LIN,   JI,   DA_JI  ],   // [52] Gen 艮 — Repos / La Montagne
  [ JI,  WU_JIU,  LIN,  DA_JI,  JI,   WU_JIU ],  // [53] Jian 漸 — Développement progressif
  [LIN,  WU_JIU,  JI,   DA_JI,  LIN,   JI    ],  // [54] Gui Mei 歸妹 — La Jeune fille qui se marie
  [LIN,   JI,  DA_JI,  WU_JIU,  JI,   LIN   ],   // [55] Feng 豐 — Abondance
  [LIN,   JI,   JI,   WU_JIU,  JI,    JI    ],   // [56] Lü 旅 — Le Voyageur
  [ JI,  WU_JIU,  LIN,  WU_JIU, DA_JI,  JI   ],  // [57] Xun 巽 — Le Doux / Le Vent
  [XIONG,  JI,  WU_JIU,  JI,   DA_JI,  LIN   ],  // [58] Dui 兌 — Le Joyeux / Le Lac
  [WU_JIU, JI,   LIN,   JI,   WU_JIU, XIONG  ],  // [59] Huan 渙 — Dispersion
  [ JI,  WU_JIU, DA_JI,  JI,    LIN,  WU_JIU ],  // [60] Jie 節 — Cadrage
  [ JI,  WU_JIU,  JI,   DA_JI, WU_JIU,  LIN  ],  // [61] Zhong Fu 中孚 — Vérité intérieure
  [XIONG,  LIN,  WU_JIU,  JI,   DA_JI, WU_JIU ],  // [62] Xiao Guo 小過 — Prépondérance du petit
  [ JI,  WU_JIU,  LIN,   JI,   DA_JI, WU_JIU  ], // [63] Ji Ji 既濟 — Après l'accomplissement
  [WU_JIU, JI,   LIN,  WU_JIU,  JI,   XIONG  ],  // [64] Wei Ji 未濟 — Avant l'accomplissement
];

// ── Règle de Zhu Xi — sélection de la ligne active ──

/**
 * Sélectionne l'index de la ligne active (0-5) selon la règle de Zhu Xi.
 * @param mutantLines - array des indices des lignes mutantes (0-5)
 * @returns index de la ligne active, ou -1 si aucune ligne mutante
 *
 * Règles Zhu Xi (Zhouyi authentique) :
 *  0 ligne  → -1 (pas de ligne active, lire jugement)
 *  1 ligne  → cette ligne
 *  2 lignes → la plus haute des 2 mutantes
 *  3 lignes → la ligne du milieu des 3 mutantes
 *  4 lignes → V4.9 FIX — la PLUS BASSE des 2 lignes NON-mutantes
 *  5 lignes → la seule ligne NON-mutante
 *  6 lignes → -1 (hexagramme transformé complet — textes spéciaux Qian/Kun,
 *              jugement de l'hexagramme résultant pour les autres)
 *
 * BUG V4.8 corrigé : 4 lignes utilisait Math.floor(4/2)=sorted[2] (3e mutante),
 * alors que la règle authentique lit la PLUS BASSE des NON-mutantes.
 * Impact : ~2.5% des consultations réelles (P(4 lignes) ≈ 23.4% × P(tirage) × V4.9 fréquence).
 */
export function selectActiveLine(mutantLines: number[]): number {
  const n = mutantLines.length;
  if (n === 0) return -1;
  if (n === 1) return mutantLines[0];
  if (n === 2) return Math.max(...mutantLines); // ligne la plus haute
  if (n === 3) {
    // ligne du milieu des 3 mutantes
    const sorted = [...mutantLines].sort((a, b) => a - b);
    return sorted[1];
  }
  // V4.9 : 4+ lignes → règle des NON-mutantes (Zhouyi authentique)
  // nonMutant = toutes les lignes [0..5] absentes de mutantLines
  const nonMutant = [0, 1, 2, 3, 4, 5].filter(i => !mutantLines.includes(i));
  if (nonMutant.length === 0) return -1; // 6 mutantes : transformation complète
  return Math.min(...nonMutant);         // 4 lignes → plus basse des 2 non-mutantes
                                         // 5 lignes → seule non-mutante
}

/**
 * Retourne le score de la ligne active pour un hexagramme donné.
 * @param hexNum - numéro de l'hexagramme (1-64)
 * @param changing - index de la ligne changeante (0-5), tel que retourné par calcIChing()
 * @returns score numérique (-4 à +4)
 */
export function getActiveLineScore(hexNum: number, changing: number): number {
  if (hexNum < 1 || hexNum > 64) return 0;
  if (changing < 0 || changing > 5) return 0;
  const hexRow = YAO_VALUES[hexNum];
  if (!hexRow || hexRow.length === 0) return 0;
  return hexRow[changing] ?? 0;
}

/**
 * Version multi-lignes : sélectionne la ligne active via Zhu Xi puis retourne son score.
 * @param hexNum - numéro de l'hexagramme (1-64)
 * @param mutantLines - array des indices des lignes mutantes
 * @returns score numérique (-4 à +4)
 */
export function getYaoScore(hexNum: number, mutantLines: number[]): number {
  const activeIdx = selectActiveLine(mutantLines);
  if (activeIdx === -1) return 0;
  return getActiveLineScore(hexNum, activeIdx);
}

/**
 * Retourne l'archétype d'une ligne (pour affichage narratif).
 */
export function getYaoArchetype(hexNum: number, lineIndex: number): YaoArchetype {
  const score = getActiveLineScore(hexNum, lineIndex);
  const entry = Object.entries(YAO_SCORE).find(([, v]) => v === score);
  return (entry?.[0] as YaoArchetype) ?? 'WU_JIU';
}

export const YAO_ARCHETYPE_LABELS: Record<YaoArchetype, string> = {
  DA_JI:    'Très favorable',
  JI:       'Favorable',
  WU_JIU:  'Neutre — pas de faute',
  LIN:      'Prudence requise',
  XIONG:    'Défi',
  DA_XIONG: 'Grand défi',
};

// ── V4.9 : Nuclear Hexagram (互卦 Hu Gua) ──
// Le Hu Gua est formé par les lignes 2-3-4 (trigramme interne inférieur)
// et 3-4-5 (trigramme interne supérieur) de l'hexagramme principal.
// Il représente la DYNAMIQUE CACHÉE du moment — souvent contraire à la surface.
// Source : tradition Han/Song, universellement utilisé en pratique Yi Jing.
//
// Validation Gemini R3 : getNuclearScore(hexNum: number) est correct.
// Le Nuclear est FIXE pour chaque hexagramme (il ne dépend pas des lignes mutantes).
//
// Table précalculée algorithmiquement via :
//   hexToLines(h) → lines[1,2,3] (nuclear lower) + lines[2,3,4] (nuclear upper) → KW lookup
// Vérifications canoniques : hex 1→1, hex 2→2, hex 63→64, hex 64→63 ✓
// V5.0 FIX : ancienne table avait 60/64 erreurs (trigrammes inversés dans le calcul original).
// Recalculée le 2026-04-02 avec hexToLines() + trigramIndex() + KW[lower][upper].

/**
 * NUCLEAR_HEX[n] = numéro de l'hexagramme nucléaire de l'hexagramme n (1-64).
 * Index 0 = padding.
 */
const NUCLEAR_HEX: readonly number[] = [
   0,                                      // [0]  padding
  // ─ Hex  1– 8 ─────────────────────────
   1,  2, 64, 63, 50, 49, 15, 16,
  // ─ Hex  9–16 ─────────────────────────
   1,  1, 18, 17, 10,  9,  2,  2,
  // ─ Hex 17–24 ─────────────────────────
  64, 63, 18, 17, 61, 61,  3,  4,
  // ─ Hex 25–32 ─────────────────────────
  10,  9, 61, 62, 62, 61, 16, 15,
  // ─ Hex 33–40 ─────────────────────────
  17, 18,  3,  4, 10,  9, 16, 15,
  // ─ Hex 41–48 ─────────────────────────
   9, 10, 50, 49, 16, 15, 62, 62,
  // ─ Hex 49–56 ─────────────────────────
  64, 63,  4,  3, 17, 18,  4,  3,
  // ─ Hex 57–64 ─────────────────────────
  49, 50, 49, 50,  1,  2, 64, 63,
];

/**
 * V4.9 — Score du Nuclear Hexagram (Hu Gua).
 *
 * Calcule la qualité de la dynamique cachée en utilisant le score moyen des
 * Yao Ci (YAO_VALUES) de l'hexagramme nucléaire, puis applique une correction
 * du biais positif structurel.
 *
 * V5.0 F1.3 : Biais adaptatif — le -1.0 fixe est retiré ici.
 * La correction est désormais appliquée dans ichingScoreV4() (convergence.ts)
 * en fonction de la cohérence direction main↔nuclear (×1.35 si même sens, ×0.65 si contraire).
 *   rawScore = round(avgYao × 2)   → [-3, +3]
 *   return rawScore                → adaptatif géré par l'appelant
 *
 * Bias correction : supprimée ici (était −1.0, arbitraire selon GPT R3 + Grok R2).
 * Cap : ±3.
 *
 * Affichage UI : exposer SÉPARÉMENT du Yao Ci dans le breakdown I Ching
 * (GPT R3 : "I Ching : Yao +2 / Dynamique cachée −1")
 *
 * @param hexNum - numéro de l'hexagramme principal (1-64)
 * @returns score Nuclear brut dans [−3, +3] (sans biais — adaptatif dans convergence.ts)
 */
/** Retourne le numéro de l'hexagramme nucléaire (Hu Gua) — Ronde 2026-03-21 S1 */
export function getNuclearHexNum(hexNum: number): number {
  if (hexNum < 1 || hexNum > 64) return 0;
  return NUCLEAR_HEX[hexNum] || 0;
}

export function getNuclearScore(hexNum: number): number {
  if (hexNum < 1 || hexNum > 64) return 0;
  const nucHex = NUCLEAR_HEX[hexNum];
  if (!nucHex || nucHex < 1 || nucHex > 64) return 0;

  // Score moyen des Yao Ci de l'hexagramme nucléaire
  const yaoRow = YAO_VALUES[nucHex];
  if (!yaoRow || yaoRow.length === 0) return 0;
  const avgYao = yaoRow.reduce((sum, v) => sum + v, 0) / yaoRow.length;

  // Normalisation → entier [-3, +3] (biais adaptatif appliqué par ichingScoreV4)
  return Math.max(-3, Math.min(3, Math.round(avgYao * 2)));
}
