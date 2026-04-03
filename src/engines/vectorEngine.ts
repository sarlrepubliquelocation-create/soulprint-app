// ══════════════════════════════════════
// ═══ VECTOR ENGINE V8.0 — Option C ═══
// Décision R26 : stocker bruts, normaliser au query
// Fonctions pures — zéro dépendance externe
// ══════════════════════════════════════
//
// ARCHITECTURE :
//   normalizeVector()     → DailyVectorRaw → number[8] normalisé [-1, +1]
//   cosineSimilarity()    → similarité entre 2 vecteurs normalisés [0, 1]
//   findSimilarDays()     → top-N jours passés similaires à aujourd'hui
//   calcEventCentroid()   → vecteur moyen d'un type d'événement (Gold, Business peak…)
//   calcVolatility()      → écart-type modules = confiance du score
//
// CAPS V8 (pour normalisation) :
//   bazi_dm   : ±6    bazi_10g  : ±6    nak_total : ±7
//   ctx_mult  : [0.88–1.12] → offset -1, diviseur 0.12
//   dasha_mult: [0.91–1.09] → offset -1, diviseur 0.09
//   + 3 modules narratifs : ichPts ±9, moonScore ±4, pdPts ±7

import type { DailyVectorRaw, DailyVectorNarrative, DailyVectorRecord } from './convergence.types';

// ══════════════════════════════════════
// ═══ TYPES LOCAUX ═══
// ══════════════════════════════════════

/** Vecteur normalisé 8D — prêt pour cosine similarity */
export type NormalizedVector = [
  number, // 0: bazi_dm / 6
  number, // 1: bazi_10g / 6
  number, // 2: nak_total / 7
  number, // 3: (ctx_mult - 1) / 0.12
  number, // 4: (dasha_mult - 1) / 0.09
  number, // 5: iching / 9        (narratif discriminant)
  number, // 6: lune / 4          (narratif discriminant)
  number, // 7: pd / 7            (narratif discriminant)
];

export interface SimilarDay {
  date: string;          // "2026-03-01"
  similarity: number;    // cosine [0, 1]
  score: number;         // score affiché ce jour-là
  label: string;         // "Or", "Argent"…
  feedback?: -1 | 0 | 1; // si disponible
}

// ══════════════════════════════════════
// ═══ NORMALISATION ═══
// Caps V8 fixes — compatibilité à vie même si les caps changent en V9
// Si V9 change les caps, la V9 re-normalisera à la volée depuis raw.
// ══════════════════════════════════════

export function normalizeVector(
  raw: DailyVectorRaw,
  narrative: DailyVectorNarrative
): NormalizedVector {
  return [
    clamp(raw.bazi_dm / 6),
    clamp(raw.bazi_10g / 6),
    clamp(raw.nak_total / 7),
    clamp((raw.ctx_mult - 1) / 0.12),
    clamp((raw.dasha_mult - 1) / 0.09),
    clamp(narrative.iching / 9),
    clamp(narrative.lune / 4),
    clamp(narrative.pd / 7),
  ];
}

function clamp(v: number): number {
  return Math.max(-1, Math.min(1, isFinite(v) ? v : 0));
}

// ══════════════════════════════════════
// ═══ COSINE SIMILARITY ═══
// Retourne [0, 1] — 1 = identique, 0 = orthogonal
// ══════════════════════════════════════

export function cosineSimilarity(a: NormalizedVector, b: NormalizedVector): number {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom < 1e-10) return 0;
  return Math.max(0, Math.min(1, dot / denom));
}

// ══════════════════════════════════════
// ═══ FIND SIMILAR DAYS ═══
// Trouve les N jours historiques les plus similaires à un vecteur cible.
// history : tous les DailyVectorRecord disponibles avec leur date.
// topN : nombre de résultats (défaut 3).
// minSimilarity : seuil minimum pour inclure un jour (défaut 0.75).
// ══════════════════════════════════════

export function findSimilarDays(
  targetRaw: DailyVectorRaw,
  targetNarrative: DailyVectorNarrative,
  history: Array<{ date: string; record: DailyVectorRecord }>,
  topN: number = 3,
  minSimilarity: number = 0.75
): SimilarDay[] {
  const targetVec = normalizeVector(targetRaw, targetNarrative);

  const scored = history
    .filter(h => h.record.raw && h.record.narrative) // guard
    .map(h => {
      const hVec = normalizeVector(h.record.raw, h.record.narrative);
      const sim  = cosineSimilarity(targetVec, hVec);
      return {
        date: h.date,
        similarity: parseFloat(sim.toFixed(3)),
        score: h.record.score,
        label: h.record.label,
        feedback: h.record.feedback?.note,
      };
    })
    .filter(d => d.similarity >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topN);

  return scored;
}

// ══════════════════════════════════════
// ═══ CALC CENTROID ═══
// Vecteur moyen d'un ensemble de jours (ex: tous les jours "Or", ou "Score Business > 80").
// Utile pour définir la "signature" d'une catégorie d'événement.
// Minimum 3 vecteurs pour un centroïde fiable (5 recommandé — Grok R25).
// ══════════════════════════════════════

export function calcEventCentroid(
  records: Array<{ raw: DailyVectorRaw; narrative: DailyVectorNarrative }>
): NormalizedVector | null {
  if (records.length < 3) return null; // pas assez de données

  const dims = 8;
  const sum = new Array(dims).fill(0) as number[];

  for (const r of records) {
    const vec = normalizeVector(r.raw, r.narrative);
    for (let i = 0; i < dims; i++) sum[i] += vec[i];
  }

  return records.length
    ? sum.map(s => parseFloat((s / records.length).toFixed(4))) as NormalizedVector
    : sum.map(() => 0) as NormalizedVector;
}

// ══════════════════════════════════════
// ═══ VOLATILITY INDEX ═══
// Écart-type des modules actifs (BaZi + Nakshatra) → confiance du score.
// Affichage uniquement — n'affecte PAS le score.
// < 0.35 : "Signaux convergents ✓"
// 0.35-0.65 : "Signaux mixtes"
// > 0.65 : "⚠️ Signaux contradictoires"
// ══════════════════════════════════════

export function calcVolatility(raw: DailyVectorRaw): {
  index: number;
  label: string;
  icon: string;
} {
  // Modules actifs normalisés (hors terrain : ctx_mult et dasha_mult sont des multiplicateurs)
  const modules = [
    raw.bazi_dm / 6,
    raw.bazi_10g / 6,
    raw.nak_total / 7,
  ].map(v => clamp(v));

  const mean = modules.reduce((a, b) => a + b, 0) / modules.length;
  const variance = modules.reduce((s, v) => s + (v - mean) ** 2, 0) / modules.length;
  const stdDev = Math.sqrt(variance);

  // Normalisation : max std sur [-1,+1] est ~1.15 → diviseur 1.1
  const index = parseFloat(Math.min(1, stdDev / 1.1).toFixed(3));

  let label: string;
  let icon: string;
  if (index < 0.35) {
    label = 'Signaux convergents';
    icon  = '✓';
  } else if (index < 0.65) {
    label = 'Signaux mixtes';
    icon  = '◐';
  } else {
    label = 'Signaux contradictoires';
    icon  = '⚠️';
  }

  return { index, label, icon };
}

// ══════════════════════════════════════
// ═══ EMA MOMENTUM ═══
// Tendance du score sur 3j vs 7j (inspiré MACD — Grok R24).
// Retourne null si historique insuffisant (< 7 jours).
// trend : 'rising' si EMA3 - EMA7 > seuil, 'falling' sinon, 'stable' au milieu.
// ══════════════════════════════════════

export function calcVectorMomentum(
  recentScores: number[] // du plus ancien au plus récent, min 7 valeurs
): { ema3: number; ema7: number; momentum: number; trend: 'rising' | 'falling' | 'stable' } | null {
  if (recentScores.length < 7) return null;

  const ema = (scores: number[], period: number): number => {
    const k = 2 / (period + 1);
    let e = scores[0];
    for (let i = 1; i < scores.length; i++) {
      e = scores[i] * k + e * (1 - k);
    }
    return parseFloat(e.toFixed(2));
  };

  const last7  = recentScores.slice(-7);
  const last3  = recentScores.slice(-3);
  const ema7   = ema(last7, 7);
  const ema3   = ema(last3, 3);
  const momentum = parseFloat((ema3 - ema7).toFixed(2));

  const SEUIL = 1.8; // Grok R24
  const trend = momentum > SEUIL ? 'rising' : momentum < -SEUIL ? 'falling' : 'stable';

  return { ema3, ema7, momentum, trend };
}

// ══════════════════════════════════════
// ═══ FORMAT MESSAGE SIMILARITÉ ═══
// Génère le message UI "Ce jour ressemble à X% au 14 mai"
// Exemple : "Ce jour ressemble à 88% au 14 mai — score 82 🌟 (tu avais dit : 🚀)"
// ══════════════════════════════════════

const FEEDBACK_EMOJI: Record<string, string> = { '-1': '📉', '0': '🎯', '1': '🚀' };
const MONTH_FR = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc'];

export function formatSimilarityMessage(day: SimilarDay): string {
  const [, mm, dd] = day.date.split('-');
  const monthLabel = MONTH_FR[parseInt(mm, 10) - 1] ?? mm;
  const pct = Math.round(day.similarity * 100);
  const feedbackPart = day.feedback !== undefined
    ? ` — tu avais dit ${FEEDBACK_EMOJI[String(day.feedback)] ?? ''}`
    : '';
  return `Ce jour ressemble à ${pct}% au ${parseInt(dd, 10)} ${monthLabel} (score ${day.score} ${day.label}${feedbackPart})`;
}

// ══════════════════════════════════════
// ═══ STABILITY INDEX ═══
// Mesure la stabilité de la prédiction sur une fenêtre de scores futurs.
// Basé sur la variance intrinsèque du signal (pas sur le temps écoulé).
// Plus la variance est haute → plus les transitions sont imprévisibles.
// Retourne [20–100] : 100 = période très stable, 20 = haute turbulence.
// Utilisé pour le badge "Confiance prédictive" en UI.
// ══════════════════════════════════════

export function getStabilityIndex(
  futureScores: number[] // scores quotidiens calculés (horizon quelconque)
): { index: number; label: string; color: string } {
  if (!futureScores.length) return { index: 75, label: 'Données insuffisantes', color: '#6b7280' };

  const n = futureScores.length;
  const mean = futureScores.reduce((a, b) => a + b, 0) / n;
  const variance = futureScores.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);

  // Pénalité variance : std > 15 = signal instable
  const volPenalty = Math.min(50, stdDev * 1.6);

  // Pénalité transitions abruptes (score J vs J+1 > 20 pts)
  let transitionPenalty = 0;
  for (let i = 1; i < n; i++) {
    if (Math.abs(futureScores[i] - futureScores[i - 1]) > 20) transitionPenalty += 6;
  }
  transitionPenalty = Math.min(30, transitionPenalty);

  const index = Math.round(Math.max(20, 100 - volPenalty - transitionPenalty));

  let label: string;
  let color: string;
  if (index >= 75) { label = 'Période stable';     color = '#4ade80'; }
  else if (index >= 50) { label = 'Transitions en vue'; color = '#f59e0b'; }
  else { label = 'Haute turbulence';   color = '#ef4444'; }

  return { index, label, color };
}
