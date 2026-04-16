// ═══════════════════════════════════════════════════════════════════
// SCORING CONSTANTS — Documentation centralisée
// ═══════════════════════════════════════════════════════════════════
// Ce fichier documente TOUTES les constantes critiques du moteur de
// scoring. Les valeurs sont définies localement dans convergence.ts
// (pour des raisons de performance), mais ce fichier sert de
// référence vivante pour l'équipe et les Rondes.
//
// Convention : chaque constante a 4 champs :
//   - valeur actuelle
//   - origine (quelle Ronde/décision)
//   - rôle (ce qu'elle contrôle)
//   - symptôme (ce qui se passe si on la change)
// ═══════════════════════════════════════════════════════════════════

/**
 * FORMULE PRINCIPALE (Ronde 29 V3)
 * score = 50 + A × tanh(k × X_total × eff_terrain)
 *
 * A = 44.0 → Amplitude du score autour de 50.
 *   Origine : Ronde 29 V3 (anciennement 36).
 *   Rôle : détermine l'écart max théorique [50-44, 50+44] = [6, 94].
 *   Si augmenté : scores plus extrêmes, plus de Cosmiques/Tempêtes.
 *   Si diminué : scores compressés autour de 50.
 *
 * k = 0.65 → Pente de la sigmoïde tanh.
 *   Origine : Ronde 29 V3 (anciennement 0.840).
 *   Rôle : vitesse à laquelle le score sature vers les extrêmes.
 *   Si augmenté : saturation plus rapide, plus de jours à 90+.
 *   Si diminué : distribution plus plate, moins de Cosmiques.
 */
export const SCORE_A = 44.0;
export const SCORE_K = 0.65;

/**
 * NORMALISATION DES GROUPES (P95)
 * Chaque groupe L1 est normalisé par son percentile 95 observé :
 *   xG = clamp(groupDelta / P95, -1, +1)
 *
 * P95_G = { lune: 9, ephem: 7, bazi: 11, indiv: 6 }
 *   Origine : calibration empirique sur ~3 ans de données.
 *   Rôle : ramener chaque groupe à une échelle comparable [-1, +1].
 *   Si lune augmenté (ex: 12) : la Lune pèse moins dans le score.
 *   Si bazi diminué (ex: 8) : le BaZi pèse plus (sature plus vite).
 */
export const P95_G = { lune: 9, ephem: 7, bazi: 11, indiv: 6 } as const;

/**
 * PLAFONDS PAR GROUPE (G_CAP)
 * Après pondération αG, chaque groupe est plafonné :
 *   XG = clamp(αG × xG, -G_CAP, +G_CAP)
 *
 * G_CAP = { lune: 0.80, ephem: 0.80, bazi: 0.85, indiv: 0.70 }  // Ronde #22 : lune 0.90→0.80
 *   Rôle : empêcher un seul groupe de dominer le score total.
 *   Si tous à 1.0 : un groupe extrême pourrait écraser les autres.
 *   Indiv le plus bas (0.70) car composé de systèmes moins fiables.
 */
export const G_CAP = { lune: 0.80, ephem: 0.80, bazi: 0.85, indiv: 0.70 } as const;  // Ronde #22 : lune 0.90→0.80

/**
 * ALPHA_I (poids groupe Individuel)
 * αI = 0.90
 *   Rôle : pondération du groupe Individuel (numérologie, I Ching).
 *   Plus faible que les autres αG car ces systèmes sont plus subjectifs.
 */
export const ALPHA_I = 0.90;

/**
 * BORNES X_CORE et X_TOTAL
 * X_core = clamp(XL + XE + XB + XI, -2.80, +2.80)
 * X_total = clamp(X_core + C4, -3.15, +3.15)
 *
 *   Rôle : limiter l'input du tanh pour éviter une saturation totale.
 *   2.80 ≈ somme max réaliste des 4 groupes plafonnés.
 *   3.15 = 2.80 + 0.35 (C4 max).
 */
export const X_CORE_CLAMP = 2.80;
export const X_TOTAL_CLAMP = 3.15;

/**
 * C4 (concordance 4 voies)
 * c4 ∈ [-0.35, +0.35]
 *   Rôle : bonus/malus quand les 4 groupes convergent (même signe).
 *   +0.35 si unanimité positive, -0.35 si unanimité négative.
 */
export const C4_MAX = 0.35;

/**
 * SOFT SHIFT (branche FUTURE uniquement)
 * g(X) = X - SS_C × tanh(X / SS_K)
 *
 * SS_K = 0.80 → pente (validé Ronde 6, confirmé Ronde 7)
 * SS_C = 0.50 → amplitude (zone stable [0.45, 0.55])
 *   Rôle : comprimer les scores futurs pour éviter des prédictions
 *   trop extrêmes sur des données incomplètes.
 */
export const SS_K = 0.80;
export const SS_C = 0.50;

/**
 * DASHA-GRAVITY (branche FUTURE) — Ronde #16 unanimité 3/3
 * Le Dasha module gravity dans le Gravity Well (climat védique).
 * dashaTilt = 1 - DASHA_LAMBDA × tanh((dashaMult - 1) / DASHA_WIDTH)
 * gravity_eff = gravity_base × dashaTilt
 *
 * DASHA_LAMBDA = 0.15 → amplitude max du modificateur (±15% de gravity)
 * DASHA_WIDTH = 0.06 → sensibilité au dashaMult
 *
 * Ancien terrain additif post-GW supprimé (R16).
 * Rollback : remettre TERRAIN_PTS=0.20 + terrainBonus dans convergence.ts
 */
export const DASHA_LAMBDA = 0.15;
export const DASHA_WIDTH = 0.06;

/**
 * ALPHA RAMP (transition LIVE → FUTURE)
 * alpha = min(1, daysDiff / V5E_ALPHA_RAMP)
 *
 * V5E_ALPHA_RAMP = 90 → rampe de 90 jours
 *   Jour 0 (aujourd'hui) : alpha=0, score 100% LIVE
 *   Jour 45 : alpha=0.5, score 50/50 blend
 *   Jour 90+ : alpha=1, score 100% FUTURE (V5/E)
 *   Origine : consensus initial disait "28j" mais code implémente 90j.
 *   90j = ~3 mois, couvre le trimestre courant en quasi-LIVE.
 */
export const V5E_ALPHA_RAMP = 90;

/**
 * SEUILS DE SCORE — Source unique (Ronde #33)
 *
 * 6 niveaux officiels de l'app :
 *   ≥ 86 : Convergence rare  🌟 (#E0B0FF)
 *   80-85 : Alignement fort   🔥 (#FFD700)
 *   65-79 : Bonne fenêtre     ✦ (#4ade80)
 *   40-64 : Phase Consolidation🔄 (#60a5fa)
 *   25-39 : Mode Maintenance   ☽ (#9890aa)
 *    < 25 : Mode Bouclier     🛡️ (#ef4444)
 *
 * COSMIC_THRESHOLD = 86 → score ≥ 86 = jour "Cosmique"
 *   Origine : V4.4, abaissé de 88→86 (compense k_future=0.65).
 *
 * STRONG_THRESHOLD = 80 → score ≥ 80 = "Alignement fort"
 *   Origine : Ronde #33, remplace tous les hardcoded ">= 85".
 *   Le seuil 85 n'a aucune réalité doctrinale.
 *
 * ANNUAL_PEAK_FLOOR = 82 → garantit des "Pic de l'année"
 */
export const COSMIC_THRESHOLD = 86;
export const STRONG_THRESHOLD = 80;
export const GOOD_THRESHOLD = 65;
export const CONSOLIDATION_THRESHOLD = 40;
export const MAINTENANCE_THRESHOLD = 25;
export const ANNUAL_PEAK_FLOOR = 82;

/** Métadonnées de score — fonction pure, source unique pour label/icône/couleur/tier */
export type ScoreTier = 'cosmic' | 'strong' | 'good' | 'consolidation' | 'maintenance' | 'shield';
export interface ScoreMeta {
  label: string;
  icon: string;
  color: string;
  tier: ScoreTier;
  level: number; // 5=cosmic, 4=strong, 3=good, 2=consolidation, 1=maintenance, 0=shield
}
export function getScoreMeta(score: number): ScoreMeta {
  if (score >= COSMIC_THRESHOLD) return { label: 'Convergence rare', icon: '🌟', color: '#E0B0FF', tier: 'cosmic', level: 5 };
  if (score >= STRONG_THRESHOLD)  return { label: 'Alignement fort', icon: '🔥', color: '#FFD700', tier: 'strong', level: 4 };
  if (score >= GOOD_THRESHOLD)    return { label: 'Bonne fenêtre', icon: '✦', color: '#4ade80', tier: 'good', level: 3 };
  if (score >= CONSOLIDATION_THRESHOLD) return { label: 'Phase de Consolidation', icon: '🔄', color: '#60a5fa', tier: 'consolidation', level: 2 };
  if (score >= MAINTENANCE_THRESHOLD)   return { label: 'Mode Maintenance', icon: '☽', color: '#9890aa', tier: 'maintenance', level: 1 };
  return { label: 'Mode Bouclier', icon: '🛡️', color: '#ef4444', tier: 'shield', level: 0 };
}

/**
 * BORNES FINALES
 * Score affiché : Math.max(5, Math.min(97, score))
 *   5 minimum : éviter les scores "zéro" anxiogènes.
 *   97 maximum : laisser une marge (le "100" n'existe pas).
 */
export const SCORE_FLOOR = 5;
export const SCORE_CEIL = 97;

/**
 * β (base signal amplification)
 * β = 0.8 → amplifie le signal védique de base (baseSignal ∈ [-1, +1])
 *   Rôle : pondération du signal Vimshottari dans le terrain.
 */
export const BETA_BASE_SIGNAL = 0.8;

/**
 * FADE (terrain fade-out)
 * fade_min = 0.15, fade_max = 0.85
 *   Rôle : à alpha=0 (LIVE), le terrain pèse 15% du max.
 *   À alpha=1 (FUTURE), le terrain pèse 85% du max.
 *   Transition progressive entre LIVE et FUTURE.
 */
export const FADE_MIN = 0.15;
export const FADE_MAX = 0.85;

/**
 * TERRAIN_SQ_SCALE = 0.25
 *   Dans : terrain_sq = 1 + 0.25 × tanh((terrain_brut - 1) / 0.35)
 *   Rôle : amplitude de la transformation terrain.
 *   Limite eff_terrain à [~0.75, ~1.25] pour éviter des déformations excessives.
 */
export const TERRAIN_SQ_SCALE = 0.25;
