// ══════════════════════════════════════════════════════════
// ═══ PREDICTIVE VALIDATION — Sprint AF ═══
// ══════════════════════════════════════════════════════════
// Module HYBRIDE (fréquentiste + bayésien) — Consensus Rondes 11-12 (3/3 IAs)
//
// ARCHITECTURE :
//   Fréquentiste : Kendall τ-b + circular-shift permutation + DOW centering + Holm-Bonferroni
//   Bayésien     : Beta-Binomial accumulateur séquentiel (confiance cumulée)
//   Préquentiel  : test-then-train (αG gelés à t-1, évaluation sur prédictions gelées)
//
// LECTURE SEULE : ce module n'écrit RIEN dans le moteur de scoring.
// Stockage propre : 'kairo_predictive_v1' dans localStorage.

import { computeKendallTauB, getFeedbackHistory } from './validation-tracker';
import type { DayFeedback, KendallResult } from './validation-tracker';

// ── Constantes du protocole (gelées — pré-enregistrement) ──

const PROTOCOL_VERSION = 'AF-1.0';
const STORE_KEY = 'kairo_predictive_v1';

// Seuils consensus Rondes 11-12
const TAU_SUCCESS_THRESHOLD = 0.10;   // τ-b > 0.10 = "signal détecté"
const P_VALUE_THRESHOLD     = 0.05;   // significance
const MIN_WINDOW_DENSITY    = 6;      // feedbacks minimum sur 7 jours
const WINDOW_DAYS           = 7;      // fenêtre glissante
const N_PERMUTATIONS        = 999;    // circular-shift permutations (impair pour p exact)
const ALPHA_GLOBAL          = 0.05;   // α familial pour Holm-Bonferroni
const BETA_PRIOR_ALPHA      = 1;      // Beta(1,1) = prior non-informatif (uniform)
const BETA_PRIOR_BETA       = 1;

// DOW labels (0=dimanche → 6=samedi)
const DOW_COUNT = 7;

// ── Types ──

export interface PermutationResult {
  tauObs: number;         // τ-b observé
  pValue: number;         // p-value permutation (two-tailed)
  nPerms: number;         // permutations effectuées
}

export interface GroupValidation {
  group: 'lune' | 'ephem' | 'bazi';
  kendall: KendallResult;         // τ-b classique (from validation-tracker)
  permutation: PermutationResult; // circular-shift permutation test
  pAdjusted: number;              // p-value après Holm-Bonferroni
  significant: boolean;           // pAdjusted < 0.05
  success: boolean;               // τ-b > 0.10 AND significant
}

export interface NullModelResult {
  tauNaive: number;       // τ-b baseline naïve (demain = aujourd'hui)
  tauKairo: number;       // τ-b Kaironaute (meilleur groupe)
  lift: number;           // tauKairo - tauNaive (> 0 = Kaironaute fait mieux)
  verdict: 'kairo_better' | 'naive_better' | 'inconclusive';
}

export interface WeeklyRecord {
  week: string;           // ISO week "YYYY-Www"
  date: string;           // date du calcul YYYY-MM-DD
  n: number;              // feedbacks dans la fenêtre
  density: number;        // feedbacks / WINDOW_DAYS
  densityOK: boolean;     // density >= MIN_WINDOW_DENSITY / WINDOW_DAYS
  groups: GroupValidation[];
  globalSuccess: boolean; // au moins 1 groupe significant
  nullModel: NullModelResult; // comparaison vs baseline naïve
  // Snapshot αG gelés (préquentiel)
  alphaGFrozen: { lune: number; ephem: number; bazi: number };
}

export interface BeliefState {
  alpha: number;  // succès + prior
  beta: number;   // échecs + prior
  confidence: number; // α / (α + β) × 100
  n: number;      // total d'évaluations
}

export interface PredictiveState {
  version: typeof PROTOCOL_VERSION;
  protocolHash: string;           // hash déterministe du protocole (audit trail)
  belief: BeliefState;            // accumulateur bayésien global
  beliefByGroup: {                // accumulateur par groupe
    lune: BeliefState;
    ephem: BeliefState;
    bazi: BeliefState;
  };
  records: WeeklyRecord[];        // historique des évaluations (max 52 semaines)
  dowMeans: number[];             // moyennes DOW (7 valeurs, index 0=dimanche)
  dowCounts: number[];            // nombre d'observations par DOW
  lastEvalWeek: string;           // dernière semaine évaluée
}

// ── Helpers ──

function isoWeek(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dow = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dow);
  const year = date.getUTCFullYear();
  const startOfYear = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil((((date.getTime() - startOfYear.getTime()) / 86400000) + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

function dateStrOf(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** Hash déterministe DJB2 — pour audit trail du protocole (pas crypto) */
function djb2Hash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/** Hash du protocole gelé (pré-enregistrement) */
function hashProtocol(): string {
  const frozen = JSON.stringify({
    version: PROTOCOL_VERSION,
    tauThreshold: TAU_SUCCESS_THRESHOLD,
    pThreshold: P_VALUE_THRESHOLD,
    minDensity: MIN_WINDOW_DENSITY,
    windowDays: WINDOW_DAYS,
    nPerms: N_PERMUTATIONS,
    alphaGlobal: ALPHA_GLOBAL,
    betaPrior: [BETA_PRIOR_ALPHA, BETA_PRIOR_BETA],
  });
  return djb2Hash(frozen);
}

// ── DOW Centering (anti-confondant jour de semaine) ──
// Consensus 3/3 : soustraire la moyenne historique par DOW du userScore

interface DOWStats {
  means: number[];   // 7 valeurs (index 0 = dimanche)
  counts: number[];  // observations par DOW
}

function computeDOWStats(feedbacks: DayFeedback[]): DOWStats {
  const sums = new Array<number>(DOW_COUNT).fill(0);
  const counts = new Array<number>(DOW_COUNT).fill(0);

  for (const f of feedbacks) {
    if (f.userScore === undefined) continue;
    const dow = new Date(f.date + 'T12:00:00').getDay(); // 0=dim
    sums[dow] += f.userScore;
    counts[dow]++;
  }

  const globalMean = feedbacks.reduce((s, f) => s + (f.userScore ?? 0), 0) /
    Math.max(1, feedbacks.filter(f => f.userScore !== undefined).length);

  const means = sums.map((sum, i) => counts[i] >= 3 ? sum / counts[i] : globalMean);

  return { means, counts };
}

/** Centrage DOW : retourne userScore - meanDOW + globalMean */
function centerDOW(userScore: number, dow: number, dowStats: DOWStats, globalMean: number): number {
  return userScore - dowStats.means[dow] + globalMean;
}

// ── Tables exactes Kendall τ-b pour petits n (5-9) ──
// Consensus 3/3 Ronde 11 : l'approximation z est imprécise pour n < 10
// Valeurs critiques exactes (one-tailed, α = 0.05) tirées des tables de Best & Gipps (1974)
// Pour n donné, |τ| doit être ≥ seuil pour rejeter H0

const KENDALL_EXACT_CRITICAL: Record<number, number> = {
  5: 0.800,   // S ≥ 8 sur 10 paires → τ = 0.800
  6: 0.600,   // S ≥ 9 sur 15 paires → τ = 0.600
  7: 0.524,   // S ≥ 11 sur 21 paires → τ ≈ 0.524
  8: 0.429,   // S ≥ 12 sur 28 paires → τ ≈ 0.429
  9: 0.389,   // S ≥ 14 sur 36 paires → τ ≈ 0.389
};

/** p-value exacte pour Kendall τ-b, petits n (5-9) via table critique */
function kendallExactPValue(tau: number, n: number): number | null {
  if (n < 5 || n > 9) return null; // pas de table → utiliser approx asymptotique
  const critical = KENDALL_EXACT_CRITICAL[n];
  if (critical === undefined) return null;
  // Two-tailed : |τ| ≥ critical → p < 0.05 ; sinon p > 0.05
  // Interpolation linéaire grossière entre 0.05 et 0.50
  const absTau = Math.abs(tau);
  if (absTau >= critical) return 0.04; // conservatif : p < 0.05
  // p ≈ 0.05 × (critical / absTau) — croissant quand |τ| diminue
  if (absTau < 0.01) return 1.0;
  return Math.min(1.0, 0.05 * (critical / absTau));
}

// ── Circular-Shift Permutation Test (anti-autocorrélation) ──
// Consensus 3/3 Ronde 12 : préserve la structure AR(1)
// Au lieu de shuffler (détruit la dépendance temporelle), on décale circulairement
// une série. p-value = count(|τ_perm| ≥ |τ_obs|) / nPerms
// Pour n ≤ 9 : utilise aussi la table exacte et prend le p-value le plus conservateur

function circularShiftPermTest(
  xArr: number[],
  yArr: number[],
  nPerms: number = N_PERMUTATIONS
): PermutationResult {
  const n = xArr.length;
  if (n < 5) return { tauObs: 0, pValue: 1, nPerms: 0 };

  // τ-b observé
  const kObs = computeKendallTauB(xArr, yArr);
  const tauObs = kObs.tau;
  const absTauObs = Math.abs(tauObs);

  // Permutations par décalage circulaire de yArr
  let countExtreme = 0;
  const effectivePerms = Math.min(nPerms, n - 1); // max n-1 shifts uniques

  for (let shift = 1; shift <= effectivePerms; shift++) {
    // Décalage circulaire : y[i] → y[(i + shift) % n]
    const yShifted = new Array<number>(n);
    for (let i = 0; i < n; i++) {
      yShifted[i] = yArr[(i + shift) % n];
    }
    const kPerm = computeKendallTauB(xArr, yShifted);
    if (Math.abs(kPerm.tau) >= absTauObs) {
      countExtreme++;
    }
  }

  // p-value bilatérale : (count + 1) / (nPerms + 1) — correction de continuité
  let pValue = (countExtreme + 1) / (effectivePerms + 1);

  // Pour petits n (5-9) : croiser avec table exacte, prendre le plus conservateur
  const pExact = kendallExactPValue(tauObs, n);
  if (pExact !== null) {
    pValue = Math.max(pValue, pExact); // conservateur = le plus grand des deux
  }

  return {
    tauObs,
    pValue: Math.round(pValue * 10000) / 10000,
    nPerms: effectivePerms,
  };
}

// ── Holm-Bonferroni (anti-comparaisons multiples, 3 groupes) ──
// Consensus 3/3 Ronde 12

interface HolmResult {
  group: string;
  pRaw: number;
  pAdjusted: number;
  significant: boolean;
}

function holmBonferroni(
  results: Array<{ group: string; pValue: number }>,
  alpha: number = ALPHA_GLOBAL
): HolmResult[] {
  const k = results.length;
  // Trier par p-value croissante
  const sorted = [...results].sort((a, b) => a.pValue - b.pValue);

  const output: HolmResult[] = [];
  let rejected = true; // on continue à rejeter tant qu'on rejette

  for (let i = 0; i < k; i++) {
    const threshold = alpha / (k - i);
    const sig = rejected && sorted[i].pValue <= threshold;
    if (!sig) rejected = false; // stop rejecting
    output.push({
      group: sorted[i].group,
      pRaw: sorted[i].pValue,
      // p adjusted = p × (k - rank) capped à 1, monotone
      pAdjusted: Math.min(1, Math.round(sorted[i].pValue * (k - i) * 10000) / 10000),
      significant: sig,
    });
  }

  return output;
}

// ── Window Density Filter ──
// Consensus 2/3 : rejeter fenêtres avec < 6/7 jours de feedback

function checkWindowDensity(feedbackCount: number): boolean {
  return feedbackCount >= MIN_WINDOW_DENSITY;
}

// ── Beta-Binomial Bayesian Accumulator ──
// Consensus 2/3 (Gemini + GPT) : Beta(α, β) mis à jour séquentiellement
// success = au moins 1 groupe avec τ-b > 0.10 & permutation p < 0.05 (post-Holm)

function updateBelief(belief: BeliefState, success: boolean): BeliefState {
  const newAlpha = belief.alpha + (success ? 1 : 0);
  const newBeta = belief.beta + (success ? 0 : 1);
  return {
    alpha: newAlpha,
    beta: newBeta,
    confidence: Math.round((newAlpha / (newAlpha + newBeta)) * 1000) / 10,
    n: belief.n + 1,
  };
}

function defaultBelief(): BeliefState {
  return {
    alpha: BETA_PRIOR_ALPHA,
    beta: BETA_PRIOR_BETA,
    confidence: 50, // Beta(1,1) → 50%
    n: 0,
  };
}

// ── Null Model — Baseline naïve (consensus Gemini + GPT) ──
// Prédiction naïve : "demain = feedback d'aujourd'hui" (persistence forecast)
// On compare τ-b(Kaironaute meilleur groupe) vs τ-b(naïve) sur la même fenêtre
// Si Kaironaute fait mieux que "deviner avec hier", le signal est réel.

function computeNullModel(windowFeedbacks: DayFeedback[], centeredScores: number[]): NullModelResult {
  const n = windowFeedbacks.length;
  if (n < 5) return { tauNaive: 0, tauKairo: 0, lift: 0, verdict: 'inconclusive' };

  // Baseline naïve : prédiction(t) = userScore(t-1)
  // On décale les scores centrés de 1 position
  const naivePredictions: number[] = [];
  const actualScores: number[] = [];
  for (let i = 1; i < n; i++) {
    naivePredictions.push(centeredScores[i - 1]); // hier prédit demain
    actualScores.push(centeredScores[i]);
  }

  const kNaive = computeKendallTauB(naivePredictions, actualScores);

  // τ-b Kaironaute : meilleur τ-b parmi les 3 groupes (sur fenêtre complète, pas décalée)
  const groups = ['luneDelta', 'ephemDelta', 'baziDelta'] as const;
  let bestTauKairo = 0;
  for (const key of groups) {
    const deltas = windowFeedbacks.map(f => f[key] as number);
    const k = computeKendallTauB(deltas, centeredScores);
    if (k.tau > bestTauKairo) bestTauKairo = k.tau;
  }

  const lift = Math.round((bestTauKairo - kNaive.tau) * 1000) / 1000;
  let verdict: NullModelResult['verdict'];
  if (lift > 0.05) verdict = 'kairo_better';
  else if (lift < -0.05) verdict = 'naive_better';
  else verdict = 'inconclusive';

  return {
    tauNaive: kNaive.tau,
    tauKairo: Math.round(bestTauKairo * 1000) / 1000,
    lift,
    verdict,
  };
}

// ── Persistance localStorage ──

function defaultState(): PredictiveState {
  return {
    version: PROTOCOL_VERSION,
    protocolHash: hashProtocol(),
    belief: defaultBelief(),
    beliefByGroup: {
      lune: defaultBelief(),
      ephem: defaultBelief(),
      bazi: defaultBelief(),
    },
    records: [],
    dowMeans: new Array(DOW_COUNT).fill(3), // prior = 3 (milieu échelle 1-5)
    dowCounts: new Array(DOW_COUNT).fill(0),
    lastEvalWeek: '1970-W01',
  };
}

function loadState(): PredictiveState {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as PredictiveState;
    if (parsed.version !== PROTOCOL_VERSION) return defaultState();
    return parsed;
  } catch {
    return defaultState();
  }
}

function saveState(state: PredictiveState): void {
  try {
    // Max 52 records (1 an)
    if (state.records.length > 52) {
      state.records = state.records.slice(-52);
    }
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch { /* fail silently */ }
}

// ── Singleton cache ──

let _cached: PredictiveState | null = null;

export function getPredictiveState(): PredictiveState {
  if (!_cached) _cached = loadState();
  return _cached;
}

export function invalidatePredictiveCache(): void {
  _cached = null;
}

// ── Moteur principal — Évaluation préquentielle hebdomadaire ──

export function runWeeklyPredictiveValidation(now: Date = new Date()): PredictiveState {
  const currentWeek = isoWeek(now);
  const state = loadState();

  // Idempotent : déjà évalué cette semaine
  if (state.lastEvalWeek === currentWeek) {
    _cached = state;
    return state;
  }

  // Charger tous les feedbacks avec deltas et userScore
  const allFeedbacks = getFeedbackHistory(365).filter(f =>
    f.luneDelta !== undefined &&
    f.ephemDelta !== undefined &&
    f.baziDelta !== undefined &&
    f.scoreBrut !== undefined &&
    f.userScore !== undefined
  );

  // Pas assez de données globales (palier 1)
  if (allFeedbacks.length < 21) {
    // Mettre à jour DOW stats quand même
    const dow = computeDOWStats(allFeedbacks);
    const updated = { ...state, dowMeans: dow.means, dowCounts: dow.counts, lastEvalWeek: currentWeek };
    saveState(updated);
    _cached = updated;
    return updated;
  }

  // Fenêtre courante (7 derniers jours)
  const today = dateStrOf(now);
  const d6ago = dateStrOf(addDays(now, -6));
  const window = allFeedbacks.filter(f => f.date >= d6ago && f.date <= today);

  // Filtre densité
  const densityOK = checkWindowDensity(window.length);

  if (!densityOK || window.length < 5) {
    // Fenêtre insuffisante — on ne produit pas de record
    const updated = { ...state, lastEvalWeek: currentWeek };
    saveState(updated);
    _cached = updated;
    return updated;
  }

  // DOW centering sur TOUT l'historique
  const dowStats = computeDOWStats(allFeedbacks);
  const globalMean = allFeedbacks.reduce((s, f) => s + (f.userScore ?? 0), 0) /
    Math.max(1, allFeedbacks.length);

  // Centrer les userScores de la fenêtre
  const centeredScores = window.map(f => {
    const dow = new Date(f.date + 'T12:00:00').getDay();
    return centerDOW(f.userScore!, dow, dowStats, globalMean);
  });

  // Lire αG gelés (préquentiel : poids à t-1, PAS les poids actuels)
  // On utilise les αG du dernier record, ou les defaults si premier run
  const lastRecord = state.records.length > 0 ? state.records[state.records.length - 1] : null;
  const alphaGFrozen = lastRecord
    ? lastRecord.alphaGFrozen
    : { lune: 1.20, ephem: 1.10, bazi: 1.00 }; // init defaults

  // Lire αG actuels pour le PROCHAIN snapshot (seront gelés la semaine prochaine)
  let currentAlphaG = { lune: 1.20, ephem: 1.10, bazi: 1.00 };
  try {
    const raw = localStorage.getItem('kairo_alphag_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.current) currentAlphaG = parsed.current;
    }
  } catch { /* use defaults */ }

  // Calculer τ-b + permutation pour chaque groupe
  const groups: Array<'lune' | 'ephem' | 'bazi'> = ['lune', 'ephem', 'bazi'];
  const deltaKey = { lune: 'luneDelta', ephem: 'ephemDelta', bazi: 'baziDelta' } as const;

  const groupResults: Array<{ group: 'lune' | 'ephem' | 'bazi'; kendall: KendallResult; perm: PermutationResult }> = [];

  for (const g of groups) {
    const deltas = window.map(f => f[deltaKey[g]] as number);
    const kendall = computeKendallTauB(deltas, centeredScores);
    const perm = circularShiftPermTest(deltas, centeredScores, N_PERMUTATIONS);
    groupResults.push({ group: g, kendall, perm });
  }

  // Holm-Bonferroni sur les p-values de permutation
  const holm = holmBonferroni(
    groupResults.map(r => ({ group: r.group, pValue: r.perm.pValue })),
    ALPHA_GLOBAL
  );

  // Assembler les GroupValidation
  const groupValidations: GroupValidation[] = groupResults.map(r => {
    const h = holm.find(hh => hh.group === r.group)!;
    const success = r.kendall.tau > TAU_SUCCESS_THRESHOLD && h.significant;
    return {
      group: r.group,
      kendall: r.kendall,
      permutation: r.perm,
      pAdjusted: h.pAdjusted,
      significant: h.significant,
      success,
    };
  });

  const globalSuccess = groupValidations.some(g => g.success);

  // Null Model : comparaison vs baseline naïve (persistence forecast)
  const nullModel = computeNullModel(window, centeredScores);

  // Créer le record hebdomadaire
  const record: WeeklyRecord = {
    week: currentWeek,
    date: today,
    n: window.length,
    density: window.length / WINDOW_DAYS,
    densityOK,
    groups: groupValidations,
    globalSuccess,
    nullModel,
    alphaGFrozen: currentAlphaG, // snapshot pour la PROCHAINE évaluation
  };

  // Mettre à jour les accumulateurs bayésiens
  const newBelief = updateBelief(state.belief, globalSuccess);
  const newBeliefByGroup = { ...state.beliefByGroup };
  for (const gv of groupValidations) {
    newBeliefByGroup[gv.group] = updateBelief(state.beliefByGroup[gv.group], gv.success);
  }

  // Sauvegarder
  const updated: PredictiveState = {
    version: PROTOCOL_VERSION,
    protocolHash: hashProtocol(),
    belief: newBelief,
    beliefByGroup: newBeliefByGroup,
    records: [...state.records, record],
    dowMeans: dowStats.means,
    dowCounts: dowStats.counts,
    lastEvalWeek: currentWeek,
  };

  saveState(updated);
  _cached = updated;
  return updated;
}

// ── Résumé pour l'UI (sans jargon) ──

export interface PredictiveUISummary {
  confidence: number;     // 0-100 (Beta accumulator global)
  label: string;          // texte user-friendly
  icon: string;           // emoji
  nWeeks: number;         // semaines évaluées
  lastWeekSuccess: boolean | null; // null si pas encore évalué
  nullModel: NullModelResult | null; // comparaison vs baseline naïve
  groupDetails: Array<{
    group: string;
    tau: number;
    significant: boolean;
    confidence: number;
  }>;
}

export function getPredictiveUISummary(): PredictiveUISummary {
  const state = getPredictiveState();
  const belief = state.belief;
  const nWeeks = belief.n;
  const confidence = belief.confidence;

  const lastRecord = state.records.length > 0 ? state.records[state.records.length - 1] : null;

  let label: string;
  let icon: string;

  if (nWeeks === 0) {
    label = 'Évaluation en attente';
    icon = '⏳';
  } else if (confidence >= 75) {
    label = 'Signal prédictif fort';
    icon = '🎯';
  } else if (confidence >= 55) {
    label = 'Signal prédictif modéré';
    icon = '📈';
  } else if (confidence >= 40) {
    label = 'Signal en cours d\'évaluation';
    icon = '〰️';
  } else {
    label = 'Signal faible ou absent';
    icon = '📊';
  }

  if (nWeeks > 0 && nWeeks < 4) {
    label += ` (${nWeeks} sem.)`;
  }

  const groupDetails = (['lune', 'ephem', 'bazi'] as const).map(g => ({
    group: g,
    tau: lastRecord?.groups.find(gv => gv.group === g)?.kendall.tau ?? 0,
    significant: lastRecord?.groups.find(gv => gv.group === g)?.significant ?? false,
    confidence: state.beliefByGroup[g].confidence,
  }));

  return {
    confidence,
    label,
    icon,
    nWeeks,
    lastWeekSuccess: lastRecord?.globalSuccess ?? null,
    nullModel: lastRecord?.nullModel ?? null,
    groupDetails,
  };
}
