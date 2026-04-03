// ══════════════════════════════════════
// ═══ CONVERGENCE TYPES — V6.0 ═══
// Extrait de convergence.ts (Step 5 split L1/L2/L3)
// Contient : interfaces exportées + constantes partagées
// Ne contient AUCUNE logique — zéro fonction
// ══════════════════════════════════════

import { type DayMasterDailyResult, type TenGodsResult, type ShenShaResult } from './bazi'; // Sprint AS P1 : ChangshengResult retiré (plus aucun champ dans les interfaces)
// Sprint AS P1 : InteractionResult retiré (plus aucun champ dans les interfaces)
import { type ProfectionResult } from './profections';
import { type LunarNodeTransit, type VoidOfCourseMoon } from './moon';
import { type NuclearHexResult } from './iching';

// ══════════════════════════════════════
// ═══ VERSION ═══
// ══════════════════════════════════════

export const ALGO_VERSION = '8.0';

// ══════════════════════════════════════
// ═══ CONSTANTES PARTAGÉES ═══
// ══════════════════════════════════════

// Utilisée dans convergence-daily.ts (L1) + convergence-slow.ts (V5.3) + convergence.ts (estimateSlowTransitBonus)
export const SLOW_PLANETS = new Set(['jupiter', 'saturn', 'uranus', 'neptune', 'pluto']);

// ══════════════════════════════════════
// ═══ SIGNAL DISPLAY — Ronde #22 Progressive Disclosure ═══
// ══════════════════════════════════════
// Chaque signal/alerte porte 3 couches :
//   L1 (cartes résumé) : human + source
//   L2 (analyse détaillée) : human + technical + source + interpretation
//   L3 (brief partageable) : human + polarity seulement
// ══════════════════════════════════════

export interface SignalDisplay {
  human: string;          // "Énergie de gain stable"
  technical: string;      // "Richesse Directe (正財)"
  source: string;         // "BaZi" | "Astro" | "Yi Jing" | "Lune" | "Numéro" | "Vedique"
  polarity: 'positive' | 'negative';
  polarityLabel: string;  // "favorable" | "friction" | "épreuve" etc.
  interpretation?: string; // "Signal de stabilité matérielle — bon jour pour sécuriser tes acquis."
}

// ══════════════════════════════════════
// ═══ NIVEAUX DE SCORE ═══
// ══════════════════════════════════════

export interface ScoreLevel {
  name: string;
  icon: string;
  color: string;
  narrative: string;
}

// ══════════════════════════════════════
// ═══ DAY TYPE SYSTEM ═══
// ══════════════════════════════════════

export type DayType = 'decision' | 'observation' | 'communication' | 'retrait' | 'expansion';

export interface DayTypeInfo {
  type: DayType;
  label: string;
  icon: string;
  desc: string;
  color: string;
}

// ══════════════════════════════════════
// ═══ ACTION RECOMMANDÉE ═══
// ══════════════════════════════════════

// Ronde 20 : 4 verbes → 3 (AGIR / AJUSTER / RALENTIR)
export type ActionVerb = 'agir' | 'ajuster' | 'ralentir';

export interface ActionReco {
  verb: ActionVerb;
  icon: string;
  label: string;
  conseil: string;
  color: string;
}

// ══════════════════════════════════════
// ═══ CLIMAT ═══
// ══════════════════════════════════════

export interface ClimateScale {
  label: string;
  icon: string;
  color: string;
  desc: string;
}

export interface ClimateResult {
  week: ClimateScale;
  month: ClimateScale;
  year: ClimateScale;
}

// ══════════════════════════════════════
// ═══ 6 DOMAINES CONTEXTUELS ═══
// ══════════════════════════════════════

export type LifeDomain = 'BUSINESS' | 'AMOUR' | 'RELATIONS' | 'CREATIVITE' | 'INTROSPECTION' | 'VITALITE';

export interface DomainScore {
  domain: LifeDomain;
  label: string;
  icon: string;
  color: string;
  score: number; // 0-100
  directive: string;
}

export interface ContextualScores {
  domains: DomainScore[];
  bestDomain: LifeDomain;
  worstDomain: LifeDomain;
  conseil: string;
}

// ══════════════════════════════════════
// ═══ RARITY INDEX ═══
// ══════════════════════════════════════

export interface RarityResult {
  percentage: number;
  label: string;
  activeSignals: number;
  totalSignals: number;
  icon: string;
  rank: number;
}

// ══════════════════════════════════════
// ═══ V4.3b: TURBULENCE + MAD + CI ═══
// ══════════════════════════════════════

export interface TurbulenceIndex {
  sigma: number;
  level: 'calme' | 'modéré' | 'agité' | 'extrême';
  label: string;
}

export interface OutlierFlag {
  isOutlier: boolean;
  modifiedZ: number;
  direction: 'high' | 'low' | null;
}

export interface ConfidenceInterval {
  lower: number;
  upper: number;
  margin: number;
  label: string;
}

// ══════════════════════════════════════
// ═══ DAY PREVIEW ═══
// ══════════════════════════════════════

export interface DayPreview {
  date: string;
  day: number;
  pdv: number;
  dayType: DayTypeInfo;
  score: number;
  convergence?: number;     // Score displayed to user (alias for score)
  lCol: string;
  hexNum: number;
  hexName: string;
  hexKeyword: string;
  reasons: string[];
  conseil: string;
  rarityPct: number;
  turbulence?: TurbulenceIndex;  // V4.3b
  outlier?: OutlierFlag;         // V4.3b
  // Ronde 6 Soft Shift — données pour le blend post-traitement annuel
  xt?: number;                   // X_total_future (branche FUTURE, alpha>0 uniquement)
  dm?: number;                   // dashaMult du jour (pour recalculer terrainBonus en passe 2)
  // Ronde Cosmique — labels annuels (post-traitement plancher/plafond)
  isAnnualPeak?: boolean;   // "Pic de l'année" — top 3 jours d'une année pauvre (score ≥ 85)
  isCosmicCapped?: boolean; // jour ≥ 88 mais hors du top 25 (année trop riche) → perd le badge Cosmique
}

// ══════════════════════════════════════
// ═══ MAIN RESULT — calcConvergence ═══
// ══════════════════════════════════════

export interface SystemBreakdown {
  system: string;
  icon: string;
  value: string;
  points: number;
  detail: string;
  signals: string[];
  alerts: string[];
}

// V9 Sprint 1 — résultat nuclearHexScore() à plat (attendu par ConvergenceTab.tsx)
export interface NuclearHexScore extends NuclearHexResult {
  points: number;
  label: string;
}

export interface ConvergenceResult {
  score: number;
  level: string;
  lCol: string;
  signals: string[];
  alerts: string[];
  richSignals: SignalDisplay[];   // Ronde #22 — progressive disclosure
  richAlerts: SignalDisplay[];    // Ronde #22 — progressive disclosure
  theme: string;
  dayType: DayTypeInfo;
  climate: ClimateResult;
  breakdown: SystemBreakdown[];
  actionReco: ActionReco;
  moonTransit: { sign: string; element: string; icon: string };
  rarityIndex: RarityResult;
  lunarNodes: LunarNodeTransit | null;
  baziDaily: DayMasterDailyResult | null;
  tenGods: TenGodsResult | null;
  // Sprint AR P3 : changsheng, trinity supprimés (Ronde 11 consensus 3/3)
  shenSha: ShenShaResult | null;
  scoreLevel: ScoreLevel;
  algoVersion: string;
  contextualScores: ContextualScores;
  temporalConfidence: TemporalConfidence;
  voidOfCourse: VoidOfCourseMoon | null;
  ci: ConfidenceInterval;
  // Sprint AR P3 : interactions supprimé (Ronde 11 consensus 3/3)
  profection?: ProfectionResult;
  rawFinal?: number;
  ctxMult?: number;        // V8 — multiplicateur terrain [0.88–1.12]
  dashaMult?: number;      // V8 — multiplicateur de terrain [0.91–1.09]
  nuclearHex?: NuclearHexScore;       // V9 Sprint 1 — hex nucléaire câblé
  dashaCertainty?: DashaCertaintyResult; // V9 Sprint 1 — fiabilité Dasha sans heure
  shadowBaseSignal?: number;           // Y1 shadow — noyau védique ∈ [-1, +1] (0.55×S_dasha + 0.40×S_nak + 0.05×S_tithi)
  shadowScore?: number;                // Y5 — score moteur tanh production [0-100] (= score depuis Y5)
  // Z2-B — observabilité groupes (consensus Ronde Z 3/3 Option B)
  baziGroupDelta?: number;             // Z2-B — delta groupe BaZi capé ±15 (C_BAZI)
  luneGroupDelta?: number;             // Z2-B — delta groupe Lune capé ±16 (C_LUNE)
  ephemGroupDelta?: number;            // Z2-B — delta groupe Éphém capé ±14 (C_EPHEM)
  // AA-5 — Journée Paradoxe : tension inter-groupes (GPT G3 + Gemini M1 — Ronde 2)
  paradoxTension?: number;   // range inter-groupes = max(deltas) - min(deltas)
  isParadox?: boolean;       // true si tension ≥ 20 ET garde signe (max ≥ +8 AND min ≤ -8)
  // Sprint AY — C4 live + SHAP explicabilité (ex-shadow, promu production)
  c4Shadow?: number;         // Sprint AY : C4 live (injecté dans le score — ex-shadow)
  cisCurrent?: number;       // CIS historique (gardé pour observabilité — remplacé par C4)
  calibration?: {            // Calibration Firebase — précision auto-ajustée
    accuracy: number;        // % de concordance vécu/prédit
    recentVotes: number;     // nombre de votes récents
  };
  shapley?: {                // Shapley exact 16 coalitions — contributions additives
    lune: number;            // φ_lune en points de score
    ephem: number;           // φ_ephem en points de score
    bazi: number;            // φ_bazi en points de score
    indiv: number;           // φ_indiv en points de score
    baseline: number;        // f(∅) = score avec tous groupes à 0
  };
}

// ══════════════════════════════════════
// ═══ DASHA CERTAINTY — V9 Sprint 1 ═══
// Gemini 3.1 Pro : sans heure de naissance exacte, la Mahadasha peut être incorrecte
// si la Lune natale est proche d'une frontière de Nakshatra (±0.5°/13.33°)
// ══════════════════════════════════════

export type DashaCertaintyLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface DashaCertaintyResult {
  certaintyLevel: DashaCertaintyLevel;
  score: number;         // multiplicateur appliqué [0.80–1.00] — 1.00 = certitude totale
  warning: string | null; // message badge affiché en UI (null si HIGH)
  nakshatraIndex: number; // 0–26
  positionInNak: number;  // 0.0–1.0 (fraction dans le nakshatra)
  birthtimeKnown: boolean;
}

export interface TemporalConfidence {
  score: number;
  label: string;
  reason: string;
  agreementRatio: number;
}

// ══════════════════════════════════════
// ═══ FORECAST 36 MOIS — V4.1 ═══
// ══════════════════════════════════════

export interface ActionWindow {
  startDate: string;
  endDate: string;
  days: number;
  domain: LifeDomain;
  label: string;
  avgScore: number;
}

export interface ForecastAlert {
  date: string;
  type: 'eclipse' | 'retrograde' | 'transition_py' | 'transition_pinnacle';
  message: string;
  icon: string;
}

export interface MonthForecast {
  year: number;
  month: number;
  score: number;
  label: string;
  labelIcon: string;
  labelColor: string;
  trend: 'rising' | 'falling' | 'stable';
  dominantDomains: LifeDomain[];
  windows: ActionWindow[];
  alerts: ForecastAlert[];
  narrative: string;
  baseline: number;
  stats: {
    avg: number;
    goodDays: number;
    peakDays: number;
    criticalDays: number;
    goldDays: number;
  };
  // ═══ V4.5 : Top 3 meilleurs jours du mois (pour affichage dans Horizon 36 mois) ═══
  topDays: { date: string; score: number; dayType: string }[];
  // ═══ FIX NARRATION — Climat numérologique du mois (Expansion/Intériorité/Harmonie/etc.) ═══
  climateLabel?: string;
}

// ══════════════════════════════════════
// ═══ OPTION C — VECTEUR QUOTIDIEN V8 ═══
// Décision R26 : stocker deltas BRUTS (source de vérité)
// Normalisation calculée à la volée au moment de la cosine similarity
// schemaVersion obligatoire pour forward compatibility
// ══════════════════════════════════════

export interface DailyVectorRaw {
  bazi_dm: number;      // delta brut [-6, +6]
  bazi_10g: number;     // delta brut [-6, +6]
  nak_total: number;    // delta brut [-7, +7]
  ctx_mult: number;     // multiplicateur terrain [0.88–1.12]
  dasha_mult: number;   // multiplicateur de terrain [0.91–1.09]
}

export interface DailyVectorNarrative {
  iching: number;       // ichRes.pts [-9, +9]
  lune: number;         // moonScore [-4, +4]
  pd: number;           // pdPts [-7, +7]
  hex_num: number;      // hexagramme [1–64]
  moon_phase: number;   // phaseIdx [0–7]
}

export interface DailyVectorFeedback {
  note: -1 | 0 | 1;    // -1 : En deçà / 0 : Dans le mille / +1 : Au-delà
  ts: number;           // timestamp epoch ms (donné le lendemain matin)
}

export interface DailyVectorRecord {
  v: 1;                              // schemaVersion — non négociable (migration future)
  score: number;                     // score final affiché [5–97]
  label: string;                     // "Cosmique" | "Or" | "Argent" | "Bronze" | "Prudence" | "Tempête"
  raw: DailyVectorRaw;               // deltas bruts — source de vérité
  narrative: DailyVectorNarrative;   // modules narratifs — pour Option B future
  feedback?: DailyVectorFeedback;    // ajouté le lendemain (semaine 3-4)
}

// Firestore : users/{uid}/history/{YYYY-MM}
// Clé dans days : "01" | "02" | ... | "31"
export interface MonthlyHistoryDoc {
  days: Record<string, DailyVectorRecord>;
}
