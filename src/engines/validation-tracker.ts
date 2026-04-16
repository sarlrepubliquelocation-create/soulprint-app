// ═══ VALIDATION TRACKER V4.4 ═══
// V4.4: + Shadow Testing (ρ universel vs personnalisé), dégradation gracieuse "Marcheur du Chaos"
// V4.3: L'utilisateur note sa journée via slider 1-5 étoiles ou 👍/😐/👎 (legacy V4.2).
// Corrélation de Spearman ρ entre scores prédits et vécu utilisateur.
// Après 10+ feedbacks slider, affiche ρ + p-value + significativité.
// Fallback concordance binaire pour les anciens feedbacks 👍/😐/👎.
// Zéro API, zéro serveur — tout en sto wrapper côté client.

import { sto } from './storage';

// ── Types ──

export interface DayFeedback {
  date: string;          // YYYY-MM-DD
  predictedScore: number; // Score Kaironaute du jour (0-100) — ce que l'user voit (blendé)
  predictedLabel: string; // 'Cosmique' | 'Gold' | 'Favorable' | ...
  userRating: 'good' | 'neutral' | 'bad'; // 👍 😐 👎 (legacy V4.2)
  userScore?: number;     // 1-5 étoiles (V4.3 slider) — prioritaire sur userRating si présent
  dominantDomain?: string; // Domaine dominant prédit
  note?: string;          // Note optionnelle de l'utilisateur
  timestamp: number;      // Date.now() du feedback
  // V4.4 — Shadow Testing (stocke les deux scores purs pour comparaison ρ)
  scoreUniversal?: number;     // Score avec poids universels (mult=1.0)
  scorePersonalized?: number;  // Score avec poids personnalisés (mult adaptatifs)
  // AD — Observabilité αG (Sprint AD)
  luneDelta?: number;   // luneGroupDelta brut [-16, +16]
  ephemDelta?: number;  // ephemGroupDelta brut [-14, +14]
  baziDelta?: number;   // baziGroupDelta brut [-15, +15]
  scoreBrut?: number;   // cv.score post-tanh, pré-calibOffset — anti-leakage
}

export interface ValidationStats {
  totalFeedbacks: number;
  concordanceRate: number;    // 0-100% — score de concordance global (legacy)
  last7Days: number;          // concordance sur 7 derniers jours
  last30Days: number;         // concordance sur 30 derniers jours
  streak: number;             // jours consécutifs de feedback
  bestDay: { date: string; score: number; rating: 'good' | 'neutral' | 'bad' } | null;
  worstDay: { date: string; score: number; rating: 'good' | 'neutral' | 'bad' } | null;
  label: string;              // 'Excellent' | 'Bon' | 'En calibration' | 'Insuffisant'
  insights: string[];         // Observations intelligentes
  // V4.3 — Spearman
  spearman: SpearmanResult | null; // null si <10 feedbacks slider
  // V4.4 — Shadow Testing
  shadow: ShadowTestResult | null; // Comparaison ρ universel vs personnalisé
}

// ── Storage ──

const STORAGE_KEY = 'sp_validation_feedback';

/** Clé scopée par profil : évite que le feedback de Carmen s'applique à Jérôme */
function feedbackKey(profileKey?: string): string {
  return profileKey ? `${STORAGE_KEY}_${profileKey.replace(/[^0-9a-zA-Z]/g, '')}` : STORAGE_KEY;
}

function loadFeedbacks(profileKey?: string): DayFeedback[] {
  try {
    return sto.get<DayFeedback[]>(feedbackKey(profileKey)) || [];
  } catch { return []; }
}

function saveFeedbacks(feedbacks: DayFeedback[], profileKey?: string): void {
  try {
    // Garder max 365 jours de feedback
    const trimmed = feedbacks.slice(-365);
    sto.set(feedbackKey(profileKey), trimmed);
  } catch { /* storage full or disabled */ }
}

// ── V4.3: Spearman Rank Correlation ──

export interface SpearmanResult {
  rho: number;          // Spearman ρ (-1 à +1) — interne, pas affiché
  precision: number;    // V4.3b: ρ converti en % (0-100) pour l'UI
  pValue: number;       // p-value (significativité statistique)
  n: number;            // nombre de paires utilisées
  significant: boolean; // p < 0.05
  label: string;        // Label user-friendly (pas de jargon)
  icon: string;         // Emoji indicateur
}

// Table critique Spearman (one-tailed, α=0.05) pour petits échantillons
const SPEARMAN_CRITICAL: Record<number, number> = {
  5: 0.900, 6: 0.829, 7: 0.714, 8: 0.643, 9: 0.600,
  10: 0.564, 12: 0.506, 14: 0.456, 16: 0.425, 18: 0.399,
  20: 0.377, 25: 0.337, 30: 0.306, 35: 0.283, 40: 0.264,
  50: 0.235, 60: 0.214, 80: 0.185, 100: 0.165,
};

/** Error function approximation (Abramowitz & Stegun 7.1.26) — max error 1.5e-7 */
function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  const a = Math.abs(x);
  const t = 1.0 / (1.0 + 0.3275911 * a);
  const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  return sign * (1 - poly * Math.exp(-a * a));
}

/** Assign fractional ranks (gère les ex-aequo correctement) */
function fractionalRanks(values: number[]): number[] {
  const n = values.length;
  const indexed = values.map((v, i) => ({ v, i }));
  indexed.sort((a, b) => a.v - b.v);
  const ranks = new Array<number>(n);
  let i = 0;
  while (i < n) {
    let j = i;
    while (j < n - 1 && indexed[j + 1].v === indexed[j].v) j++;
    const avgRank = (i + j) / 2 + 1; // rang moyen pour les ex-aequo
    for (let k = i; k <= j; k++) ranks[indexed[k].i] = avgRank;
    i = j + 1;
  }
  return ranks;
}

/** Calcul Spearman ρ entre scores prédits et scores utilisateur (slider 1-5) */
function computeSpearman(predicted: number[], userScores: number[]): SpearmanResult {
  const n = predicted.length;
  if (n < 5) {
    return { rho: 0, precision: 0, pValue: 1, n, significant: false, label: 'Données insuffisantes', icon: '⏳' };
  }

  const rankP = fractionalRanks(predicted);
  const rankU = fractionalRanks(userScores);

  // ρ = 1 - (6 × Σd²) / (n × (n²-1))
  let sumD2 = 0;
  for (let i = 0; i < n; i++) {
    const d = rankP[i] - rankU[i];
    sumD2 += d * d;
  }
  const rho = 1 - (6 * sumD2) / (n * (n * n - 1));

  // p-value via t-distribution approx → erf
  let pValue: number;
  if (n <= 100) {
    // Lookup table critique pour petits échantillons
    const keys = Object.keys(SPEARMAN_CRITICAL).map(Number).sort((a, b) => a - b);
    let critical = 0.165; // fallback n=100
    for (const k of keys) {
      if (k >= n) { critical = SPEARMAN_CRITICAL[k]; break; }
    }
    // Approximation : si |ρ| > critical → p < 0.05
    const t = rho * Math.sqrt((n - 2) / (1 - rho * rho + 1e-10));
    const z = t / Math.sqrt(n);
    pValue = 1 - erf(Math.abs(z) / Math.sqrt(2));
    // Override avec table si n exact
    if (SPEARMAN_CRITICAL[n] !== undefined) {
      pValue = Math.abs(rho) >= SPEARMAN_CRITICAL[n] ? Math.min(pValue, 0.04) : Math.max(pValue, 0.06);
    }
  } else {
    // Grand échantillon : approximation normale
    const z = rho * Math.sqrt(n - 1);
    pValue = 1 - erf(Math.abs(z) / Math.sqrt(2));
  }

  const significant = pValue < 0.05;

  // V4.3b: ρ → pourcentage de précision (0-100%) pour l'UI
  // ρ=1 → 100%, ρ=0.5 → 50%, ρ=0 → 0%, ρ<0 → 0% (divergence)
  const precision = Math.max(0, Math.round(rho * 100));

  // Labels user-friendly (zéro jargon statistique)
  const absRho = Math.abs(rho);
  let label: string, icon: string;
  if (absRho >= 0.7)      { label = rho > 0 ? 'Excellente calibration' : 'Profil atypique détecté'; icon = rho > 0 ? '🎯' : '⚠️'; }
  else if (absRho >= 0.4)  { label = rho > 0 ? 'Bonne calibration' : 'Décalage détecté'; icon = rho > 0 ? '📈' : '📉'; }
  else if (absRho >= 0.2)  { label = 'Calibration en cours'; icon = '〰️'; }
  else                     { label = 'Calibration à venir'; icon = '🔮'; }

  if (!significant && n >= 10) {
    label += ' — affinage en cours';
  } else if (significant && n >= 10) {
    label += ' ✓';
  }

  return { rho: Math.round(rho * 1000) / 1000, precision, pValue: Math.round(pValue * 1000) / 1000, n, significant, label, icon };
}

// ── V4.4: Shadow Testing ──
// Compare ρ_universel et ρ_personnalisé en background
// Correction GPT: utilise les scores PURS (non blendés) pour éviter le biais

export interface ShadowTestResult {
  rhoUniversal: number;      // Spearman ρ score universel vs userScore
  rhoPersonalized: number;   // Spearman ρ score personnalisé vs userScore
  n: number;                 // paires avec les 3 valeurs disponibles
  personalizationWins: boolean; // true si perso > universel
  delta: number;             // rhoPerso - rhoUniversal
  verdict: 'perso_better' | 'universal_better' | 'inconclusive';
  label: string;             // Texte UI
}

function computeShadowTest(feedbacks: DayFeedback[]): ShadowTestResult | null {
  // Filtrer les feedbacks qui ont les 3 scores (universal, personalized, userScore)
  const valid = feedbacks.filter(f =>
    f.userScore !== undefined &&
    f.scoreUniversal !== undefined &&
    f.scorePersonalized !== undefined
  );

  if (valid.length < 15) return null; // Pas assez de données shadow

  const userScores = valid.map(f => f.userScore!);
  const universalScores = valid.map(f => f.scoreUniversal!);
  const personalizedScores = valid.map(f => f.scorePersonalized!);

  const spU = computeSpearman(universalScores, userScores);
  const spP = computeSpearman(personalizedScores, userScores);

  const delta = spP.rho - spU.rho;
  let verdict: ShadowTestResult['verdict'];
  let label: string;

  if (delta > 0.05) {
    verdict = 'perso_better';
    label = `Personnalisation active (+${Math.round(delta * 100)}% de précision)`;
  } else if (delta < -0.05) {
    verdict = 'universal_better';
    label = 'Mode universel plus précis — personnalisation en pause';
  } else {
    verdict = 'inconclusive';
    label = 'Calibration en cours — pas encore de différence significative';
  }

  return {
    rhoUniversal: spU.rho,
    rhoPersonalized: spP.rho,
    n: valid.length,
    personalizationWins: delta > 0.05,
    delta: Math.round(delta * 1000) / 1000,
    verdict,
    label,
  };
}

// ── V4.4: Dégradation Gracieuse — "Marcheur du Chaos" ──

export interface GracefulDegradation {
  isActive: boolean;
  mode: 'normal' | 'marcheur';
  label: string;
  softening: boolean;    // true → adoucir couleurs heatmap, masquer CI
}

export function checkGracefulDegradation(spearman: SpearmanResult | null, feedbackCount: number): GracefulDegradation {
  if (!spearman || feedbackCount < 30) {
    return { isActive: false, mode: 'normal', label: '', softening: false };
  }

  if (spearman.rho < 0.25) {
    return {
      isActive: true,
      mode: 'marcheur',
      label: 'Profil Atypique : Le Marcheur du Chaos. Ton libre arbitre surpasse les courants temporels.',
      softening: true,
    };
  }

  return { isActive: false, mode: 'normal', label: '', softening: false };
}

// ── Core: Enregistrer un feedback ──

export function saveDayFeedback(
  date: string,
  predictedScore: number,
  predictedLabel: string,
  userRating: 'good' | 'neutral' | 'bad',
  dominantDomain?: string,
  note?: string,
  userScore?: number,          // V4.3 — slider 1-5
  scoreUniversal?: number,     // V4.4 — shadow score universel
  scorePersonalized?: number,  // V4.4 — shadow score personnalisé
  luneDelta?: number,          // AD — luneGroupDelta brut
  ephemDelta?: number,         // AD — ephemGroupDelta brut
  baziDelta?: number,          // AD — baziGroupDelta brut
  scoreBrut?: number,          // AD — cv.score pré-calibOffset
  profileKey?: string          // Scope par profil (bd compact) pour éviter contamination inter-profils
): void {
  const feedbacks = loadFeedbacks(profileKey);

  // Pas de doublon pour la même date
  const existing = feedbacks.findIndex(f => f.date === date);
  const entry: DayFeedback = {
    date, predictedScore, predictedLabel, userRating,
    userScore: userScore ? Math.round(Math.max(1, Math.min(5, userScore))) : undefined,
    dominantDomain, note, timestamp: Date.now(),
    scoreUniversal, scorePersonalized, // V4.4
    luneDelta, ephemDelta, baziDelta, scoreBrut, // AD
  };

  if (existing >= 0) {
    feedbacks[existing] = entry;
  } else {
    feedbacks.push(entry);
  }

  saveFeedbacks(feedbacks, profileKey);
}

// ── Core: Obtenir le feedback pour une date ──

export function getDayFeedback(date: string, profileKey?: string): DayFeedback | null {
  const feedbacks = loadFeedbacks(profileKey);
  return feedbacks.find(f => f.date === date) || null;
}

// ── Concordance: le score prédit correspond-il au vécu ? ──
// Un score ≥60 + rating 'good' = concordant
// Un score <45 + rating 'bad' = concordant
// Un score 45-60 + rating 'neutral' = concordant
// Tout le reste = discordant

function isConcordant(predictedScore: number, userRating: 'good' | 'neutral' | 'bad'): boolean {
  if (predictedScore >= 60 && userRating === 'good') return true;
  if (predictedScore >= 70 && userRating === 'neutral') return true; // score élevé, neutre = OK quand même
  if (predictedScore < 45 && userRating === 'bad') return true;
  if (predictedScore < 35 && userRating === 'neutral') return true;  // score bas, neutre = OK
  if (predictedScore >= 45 && predictedScore < 60 && userRating === 'neutral') return true;
  // Demi-concordance : pas parfait mais pas faux non plus
  if (predictedScore >= 55 && predictedScore < 70 && userRating === 'good') return true;
  if (predictedScore >= 35 && predictedScore < 50 && userRating === 'bad') return true;
  return false;
}

// ── Statistiques complètes ──

export function getValidationStats(profileKey?: string): ValidationStats {
  const feedbacks = loadFeedbacks(profileKey);
  const total = feedbacks.length;

  if (total === 0) {
    return {
      totalFeedbacks: 0, concordanceRate: 0, last7Days: 0, last30Days: 0,
      streak: 0, bestDay: null, worstDay: null,
      label: 'En attente', insights: ['Note tes journées pour découvrir la précision de Kaironaute.'],
      spearman: null, // V4.3
      shadow: null, // V4.4
    };
  }

  // Concordance globale (legacy — feedbacks sans userScore)
  const concordant = feedbacks.filter(f => isConcordant(f.predictedScore, f.userRating)).length;
  const concordanceRate = Math.round((concordant / total) * 100);

  // V4.3 — Spearman ρ (feedbacks avec userScore uniquement)
  const sliderFeedbacks = feedbacks.filter(f => f.userScore !== undefined && f.userScore >= 1 && f.userScore <= 5);
  const spearman = sliderFeedbacks.length >= 5
    ? computeSpearman(
        sliderFeedbacks.map(f => f.predictedScore),
        sliderFeedbacks.map(f => f.userScore!)
      )
    : null;

  // 7 derniers jours
  const now = new Date();
  const d7 = feedbacks.filter(f => {
    const diff = (now.getTime() - new Date(f.date + 'T12:00:00').getTime()) / 86400000;
    return diff <= 7;
  });
  const last7Days = d7.length > 0 ? Math.round(d7.filter(f => isConcordant(f.predictedScore, f.userRating)).length / d7.length * 100) : 0;

  // 30 derniers jours
  const d30 = feedbacks.filter(f => {
    const diff = (now.getTime() - new Date(f.date + 'T12:00:00').getTime()) / 86400000;
    return diff <= 30;
  });
  const last30Days = d30.length > 0 ? Math.round(d30.filter(f => isConcordant(f.predictedScore, f.userRating)).length / d30.length * 100) : 0;

  // Streak (jours consécutifs de feedback, en partant d'aujourd'hui)
  let streak = 0;
  const todayStr = now.toISOString().split('T')[0];
  const sorted = [...feedbacks].sort((a, b) => b.date.localeCompare(a.date));
  let checkDate = todayStr;
  for (const f of sorted) {
    if (f.date === checkDate) {
      streak++;
      // Jour précédent
      const d = new Date(checkDate + 'T12:00:00');
      d.setDate(d.getDate() - 1);
      checkDate = d.toISOString().split('T')[0];
    } else if (f.date < checkDate) {
      break;
    }
  }

  // Best & worst days
  const goodDays = feedbacks.filter(f => f.userRating === 'good').sort((a, b) => b.predictedScore - a.predictedScore);
  const badDays = feedbacks.filter(f => f.userRating === 'bad').sort((a, b) => a.predictedScore - b.predictedScore);
  const bestDay = goodDays[0] ? { date: goodDays[0].date, score: goodDays[0].predictedScore, rating: goodDays[0].userRating } : null;
  const worstDay = badDays[0] ? { date: badDays[0].date, score: badDays[0].predictedScore, rating: badDays[0].userRating } : null;

  // Label
  const label = total < 7 ? 'En calibration'
    : concordanceRate >= 75 ? 'Excellent'
    : concordanceRate >= 55 ? 'Bon'
    : concordanceRate >= 40 ? 'Correct'
    : 'En ajustement';

  // Insights intelligents
  const insights: string[] = [];

  if (total < 7) {
    insights.push(`Encore ${7 - total} jour${7 - total > 1 ? 's' : ''} de feedback pour avoir des stats fiables.`);
  }

  if (concordanceRate >= 75 && total >= 10) {
    insights.push(`SoulPrint capte bien ton énergie — ${concordanceRate}% de concordance sur ${total} jours.`);
  }

  if (last7Days > concordanceRate + 10 && d7.length >= 5) {
    insights.push(`Ta concordance s'améliore ces 7 derniers jours (${last7Days}% vs ${concordanceRate}% global).`);
  } else if (last7Days < concordanceRate - 10 && d7.length >= 5) {
    insights.push(`Concordance en baisse cette semaine (${last7Days}% vs ${concordanceRate}% global).`);
  }

  // Pattern : scores hauts mal vécus
  const highScoreBad = feedbacks.filter(f => f.predictedScore >= 70 && f.userRating === 'bad');
  if (highScoreBad.length >= 3) {
    insights.push(`${highScoreBad.length} jours bien cotés mais mal vécus — ton vécu diverge des lectures en zone haute.`);
  }

  // Pattern : scores bas bien vécus
  const lowScoreGood = feedbacks.filter(f => f.predictedScore < 40 && f.userRating === 'good');
  if (lowScoreGood.length >= 3) {
    insights.push(`${lowScoreGood.length} jours faiblement cotés mais bien vécus — tu transcendes les jours difficiles.`);
  }

  if (streak >= 7) {
    insights.push(`${streak} jours consécutifs de feedback — ta régularité améliore la précision.`);
  }

  // V4.3 — Insights précision (langage utilisateur, zéro jargon)
  if (spearman && spearman.n >= 10) {
    if (spearman.significant && spearman.rho >= 0.4) {
      insights.push(`${spearman.icon} Précision ${spearman.precision}% sur ${spearman.n} jours — le moteur est bien calibré pour toi.`);
    } else if (spearman.significant && spearman.rho < 0) {
      insights.push(`${spearman.icon} Profil atypique : tes bons jours arrivent quand le score est bas. Le moteur s'adapte.`);
    } else if (!spearman.significant) {
      insights.push(`〰️ Calibration en cours (${spearman.n} jours). Continue à noter pour affiner la précision.`);
    }
  } else if (sliderFeedbacks.length > 0 && sliderFeedbacks.length < 10) {
    insights.push(`📊 Encore ${10 - sliderFeedbacks.length} notation${10 - sliderFeedbacks.length > 1 ? 's' : ''} pour mesurer la précision du moteur.`);
  }

  // V4.4 — Shadow Testing
  const shadow = computeShadowTest(feedbacks);
  if (shadow && shadow.verdict === 'perso_better') {
    insights.push(`✨ ${shadow.label}`);
  } else if (shadow && shadow.verdict === 'universal_better') {
    insights.push(`📊 ${shadow.label}`);
  }

  // V4.4 — Dégradation gracieuse
  const degradation = checkGracefulDegradation(spearman, total);
  if (degradation.isActive) {
    insights.push(`🌀 ${degradation.label}`);
  }

  if (insights.length === 0) {
    insights.push(`Continue à noter tes journées — chaque retour affine le portrait.`);
  }

  return {
    totalFeedbacks: total, concordanceRate, last7Days, last30Days,
    streak, bestDay, worstDay, label, insights,
    spearman, // V4.3
    shadow,   // V4.4
  };
}

// ── Historique des feedbacks (pour l'UI) ──

export function getFeedbackHistory(limit: number = 30): DayFeedback[] {
  const feedbacks = loadFeedbacks();
  return [...feedbacks].sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
}

// ── Reset (pour debug) ──

/** @deprecated Dead code — debug only, not imported anywhere */
function clearAllFeedbacks(): void {
  try { sto.remove(STORAGE_KEY); } catch { /* */ }
}

// ── Breakdown par date (V5.0 — pour personnalisation future) ──
// Stocke le breakdown système du jour (points par module) pour analyse rétrospective.
// Utilisé par FeedbackWidget pour enrichir les données de validation.

const BREAKDOWN_KEY = 'sp_validation_breakdowns';

export function saveBreakdownForDate(
  date: string,
  breakdown: Array<{ system: string; points: number }>,
  profileKey?: string
): void {
  try {
    const key = profileKey ? `${BREAKDOWN_KEY}_${profileKey}` : BREAKDOWN_KEY;
    const all: Record<string, Array<{ system: string; points: number }>> =
      sto.get<Record<string, Array<{ system: string; points: number }>>>(key) || {};
    all[date] = breakdown;
    // Garder seulement les 90 derniers jours pour éviter la croissance infinie
    const keys = Object.keys(all).sort().reverse();
    if (keys.length > 90) {
      keys.slice(90).forEach(k => delete all[k]);
    }
    sto.set(key, all);
  } catch { /* fail silently */ }
}

/** @deprecated Dead code — not imported anywhere */
function getBreakdownForDate(
  date: string
): Array<{ system: string; points: number }> | null {
  try {
    const all = sto.get<Record<string, Array<{ system: string; points: number }>>>(BREAKDOWN_KEY);
    if (!all) return null;
    return all[date] ?? null;
  } catch { return null; }
}

// ── AD — Stockage intermédiaire des deltas quotidiens ──
// Permet de récupérer les deltas d'hier au moment du blind check-in

const DAILY_DELTAS_KEY = 'kairo_deltas_v1';
/** Clé scopée par profil pour les deltas (même logique que feedbackKey) */
function deltasKey(profileKey?: string): string {
  return profileKey ? `${DAILY_DELTAS_KEY}_${profileKey.replace(/[^0-9a-zA-Z]/g, '')}` : DAILY_DELTAS_KEY;
}

interface DailyDeltasEntry {
  luneDelta: number;
  ephemDelta: number;
  baziDelta: number;
  scoreBrut: number;
}

export function storeTodayDeltas(
  date: string,
  luneDelta: number,
  ephemDelta: number,
  baziDelta: number,
  scoreBrut: number,
  profileKey?: string  // Scope par profil pour éviter contamination inter-profils
): void {
  try {
    const key = deltasKey(profileKey);
    const all: Record<string, DailyDeltasEntry> = sto.get<Record<string, DailyDeltasEntry>>(key) || {};
    all[date] = { luneDelta, ephemDelta, baziDelta, scoreBrut };
    // Garder seulement les 90 derniers jours
    const keys = Object.keys(all).sort().reverse();
    if (keys.length > 90) keys.slice(90).forEach(k => delete all[k]);
    sto.set(key, all);
  } catch { /* fail silently */ }
}

export function loadDeltas(date: string, profileKey?: string): DailyDeltasEntry | null {
  try {
    const all: Record<string, DailyDeltasEntry> = sto.get<Record<string, DailyDeltasEntry>>(deltasKey(profileKey)) || {};
    return all[date] ?? null;
  } catch { return null; }
}

// ── AD — Kendall τ-b ──
// σ = sqrt(2(2N+5) / (9N(N-1)))  — correction Grok Ronde 9

export interface KendallResult {
  tau: number;      // τ-b [-1, +1]
  n: number;        // paires utilisées
  sigma: number;    // écart-type théorique
  pValue: number;   // p-value approx (z-test)
  significant: boolean; // p < 0.05
  nEff: number;     // count(|x| ≥ P60)
  stdX: number;     // std(x) des deltas
}

function percentile60(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.floor(0.60 * sorted.length);
  return sorted[Math.min(idx, sorted.length - 1)];
}

export function computeKendallTauB(xArr: number[], yArr: number[]): KendallResult {
  const n = Math.min(xArr.length, yArr.length);
  const zero: KendallResult = { tau: 0, n, sigma: 0, pValue: 1, significant: false, nEff: 0, stdX: 0 };
  if (n < 5) return zero;

  let C = 0, D = 0, Tx = 0, Ty = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = xArr[i] - xArr[j];
      const dy = yArr[i] - yArr[j];
      const prod = dx * dy;
      if (prod > 0)       C++;
      else if (prod < 0)  D++;
      else if (dx === 0 && dy !== 0) Tx++;
      else if (dy === 0 && dx !== 0) Ty++;
      // tied on both → not counted
    }
  }

  const denom = Math.sqrt((C + D + Tx) * (C + D + Ty));
  const tau = denom === 0 ? 0 : (C - D) / denom;

  // σ = sqrt(2(2N+5) / (9N(N-1)))
  const sigma = Math.sqrt((2 * (2 * n + 5)) / (9 * n * (n - 1)));
  const z = Math.abs(tau) / sigma;
  // p-value deux queues via erf : p = 1 - erf(z / √2)
  const pValue = Math.max(0, Math.min(1, 1 - erf(z / Math.sqrt(2))));
  const significant = pValue < 0.05;

  // N_eff : count(|x| ≥ P60)
  const absX = xArr.map(v => Math.abs(v));
  const p60 = percentile60(absX);
  const nEff = absX.filter(v => v >= p60).length;

  // std(x)
  const meanX = xArr.reduce((s, v) => s + v, 0) / n;
  const stdX = Math.sqrt(xArr.reduce((s, v) => s + (v - meanX) ** 2, 0) / n);

  return {
    tau: Math.round(tau * 1000) / 1000,
    n,
    sigma: Math.round(sigma * 1000) / 1000,
    pValue: Math.round(pValue * 1000) / 1000,
    significant,
    nEff,
    stdX: Math.round(stdX * 100) / 100,
  };
}

// ── AD — Observabilité αG ──

export interface AlphaGGroupObs {
  tau: number;
  n: number;
  nEff: number;
  stdDelta: number;
  significant: boolean;
  pValue: number;
  label: string;  // interprétation courte
}

export interface AlphaGObsResult {
  lune: AlphaGGroupObs;
  ephem: AlphaGGroupObs;
  bazi: AlphaGGroupObs;
  N: number;         // feedbacks avec deltas disponibles
  palier: 1 | 2 | 3; // palier actuel
  palierLabel: string;
}

function alphaGGroupLabel(tau: number, n: number): string {
  const abs = Math.abs(tau);
  if (n < 5)   return 'Données insuffisantes';
  if (abs < 0.10) return 'Signal absent';
  if (abs < 0.20) return 'Signal faible';
  if (abs < 0.30) return 'Signal modéré';
  return tau > 0 ? 'Signal fort ✓' : 'Signal inverse ⚠️';
}

export function getAlphaGObservability(): AlphaGObsResult {
  const feedbacks = loadFeedbacks().filter(f =>
    f.luneDelta !== undefined &&
    f.ephemDelta !== undefined &&
    f.baziDelta  !== undefined &&
    f.scoreBrut  !== undefined &&
    f.userScore  !== undefined
  );

  const N = feedbacks.length;
  const palier: 1 | 2 | 3 = N < 21 ? 1 : N < 60 ? 2 : 3;
  const palierLabels = {
    1: `Palier 1 — Collecte (${N}/21)`,
    2: `Palier 2 — Fast-Track (${N}/60)`,
    3: `Palier 3 — Application (N=${N})`,
  };

  const userScores = feedbacks.map(f => f.userScore!);
  const luneDeltas  = feedbacks.map(f => f.luneDelta!);
  const ephemDeltas = feedbacks.map(f => f.ephemDelta!);
  const baziDeltas  = feedbacks.map(f => f.baziDelta!);

  function toObs(deltas: number[], scores: number[]): AlphaGGroupObs {
    const k = computeKendallTauB(deltas, scores);
    return {
      tau: k.tau, n: k.n, nEff: k.nEff, stdDelta: k.stdX,
      significant: k.significant, pValue: k.pValue,
      label: alphaGGroupLabel(k.tau, k.n),
    };
  }

  return {
    lune:  toObs(luneDeltas,  userScores),
    ephem: toObs(ephemDeltas, userScores),
    bazi:  toObs(baziDeltas,  userScores),
    N,
    palier,
    palierLabel: palierLabels[palier],
  };
}
