// ══════════════════════════════════════════════════════════
// ═══ ALPHA CALIBRATION — Sprint AE (Phase 2) ═══
// ══════════════════════════════════════════════════════════
// Calibration automatique des αG hebdomadaire via Kendall τ-b
// Décisions Rondes 5→10 gravées dans MEMO-Y0.md
//
// ARCHITECTURE :
//   AlphaGState         → JSON persisté dans localStorage 'kairo_alphag_v1'
//   getAdaptedAlphaG()  → singleton cached, lu par calcShadowScore()
//   runWeeklyAlphaGUpdate() → moteur principal, appelé 1×/semaine via useEffect

import { computeKendallTauB, getFeedbackHistory } from './validation-tracker';
import type { DayFeedback } from './validation-tracker';

// ── Constantes (verrouillées — Rondes 5→10) ──

export const ALPHAG_INIT = { lune: 1.20, ephem: 1.10, bazi: 1.00 } as const;
const ALPHAG_SUM   = 3.30;
const ALPHAG_MIN   = 0.50;   // borne abs par groupe (Gemini Ronde 10)
const ALPHAG_MAX   = 2.00;   // borne abs par groupe
const CAP_WEEKLY   = 0.05;   // ±0.05/groupe/semaine
const LAMBDA_REV   = 0.15;   // taux réversion exponentielle (Ronde 9 hybride)
const TAU_APPLY    = 0.30;   // seuil d'application (Ronde 8 — 2/3)
const TAU_REV_P3   = 0.15;   // trigger réversion palier 3 N≥60 (Ronde 10 consensus 2/3 GPT+Gemini — σ=0.089 → p≈0.046)
const TAU_REV_P2   = 0.20;   // trigger réversion palier 2 shadow 21≤N<60 (Ronde 10 consensus 2/3 GPT+Gemini — σ≈0.12-0.15 → seuil plus tolérant)
const TAU_CANCEL   = 0.25;   // seuil sortie réversion, 1 fenêtre suffit (Ronde 10 consensus 2/3 GPT+Grok)
const MIN_WIN_FBKS = 3;      // feedbacks minimum par fenêtre 7j
const NEFF_MIN     = 10;     // N_eff minimum sur données historiques
const STD_MIN      = 2.5;    // std minimum des deltas dans fenêtre
const STORE_KEY    = 'kairo_alphag_v1';

// ── Types ──

export type AlphaGTriple = { lune: number; ephem: number; bazi: number };

export interface AlphaGState {
  version: 1;
  current:  AlphaGTriple;          // αG en cours (modifiés par calibration)
  init:     AlphaGTriple;          // αG initiaux (référence réversion) — fixes
  lastUpdatedWeek: string;         // ISO week "YYYY-Www"
  lowTauConsecutive: AlphaGTriple; // fenêtres consécutives |τ-b| < seuil, par groupe
  lastTauB?: AlphaGTriple;         // τ-b dernier calcul (audit)
  lastTier?: 1 | 2 | 3;           // palier appliqué (audit)
}

export const ALPHAG_STATE_DEFAULT: AlphaGState = {
  version: 1,
  current:  { ...ALPHAG_INIT },
  init:     { ...ALPHAG_INIT },
  lastUpdatedWeek: '1970-W01',
  lowTauConsecutive: { lune: 0, ephem: 0, bazi: 0 },
};

// ── Helpers ──

export function isoWeek(d: Date): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dow = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dow); // jeudi de la semaine
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

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

function round4(x: number): number {
  return Math.round(x * 10000) / 10000;
}

// ── Persistance localStorage ──

function loadAlphaGState(): AlphaGState {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { ...ALPHAG_STATE_DEFAULT };
    const parsed = JSON.parse(raw) as AlphaGState;
    if (
      parsed.version !== 1 ||
      typeof parsed.current?.lune  !== 'number' ||
      typeof parsed.current?.ephem !== 'number' ||
      typeof parsed.current?.bazi  !== 'number'
    ) {
      localStorage.setItem(STORE_KEY, JSON.stringify(ALPHAG_STATE_DEFAULT));
      return { ...ALPHAG_STATE_DEFAULT };
    }
    return parsed;
  } catch {
    return { ...ALPHAG_STATE_DEFAULT };
  }
}

function saveAlphaGState(state: AlphaGState): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch { /* fail silently */ }
}

// ── Singleton cache (1 lecture localStorage / session) ──

let _cachedState: AlphaGState | null = null;

export function getAdaptedAlphaG(): AlphaGState {
  if (!_cachedState) _cachedState = loadAlphaGState();
  return _cachedState;
}

export function invalidateAlphaGCache(): void {
  _cachedState = null;
}

// ── Validation post-update (garde-fou rollback) ──

function isValidAlphaG(a: AlphaGTriple): boolean {
  const vals = [a.lune, a.ephem, a.bazi];
  if (vals.some(v => isNaN(v) || !isFinite(v))) return false;
  if (vals.some(v => v < ALPHAG_MIN - 1e-4 || v > ALPHAG_MAX + 1e-4)) return false;
  const sum = a.lune + a.ephem + a.bazi;
  if (Math.abs(sum - ALPHAG_SUM) > 1e-3) return false;
  // No-collapse : au moins une valeur différente des autres
  const mean = sum / 3;
  const std = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / 3);
  if (std < 0.001 && Math.abs(a.lune - ALPHAG_INIT.lune) > 0.05) return false;
  return true;
}

// ── Renormalisation somme 3.30 — Algo B (Gemini Ronde 10) ──
// Multiplication uniforme : conserve les ratios, jamais négatif

function normalizeAlphaG(a: AlphaGTriple): AlphaGTriple {
  const sum = a.lune + a.ephem + a.bazi;
  if (sum === 0 || !isFinite(sum)) return { ...ALPHAG_INIT };
  const f = ALPHAG_SUM / sum;
  return {
    lune:  round4(a.lune  * f),
    ephem: round4(a.ephem * f),
    bazi:  round4(a.bazi  * f),
  };
}

// ── Cap ±0.05/groupe/semaine ──

function applyCap(prev: AlphaGTriple, next: AlphaGTriple): AlphaGTriple {
  const capOne = (p: number, n: number): number => {
    const delta  = n - p;
    const capped = Math.sign(delta) * Math.min(Math.abs(delta), CAP_WEEKLY);
    return clamp(round4(p + capped), ALPHAG_MIN, ALPHAG_MAX);
  };
  return {
    lune:  capOne(prev.lune,  next.lune),
    ephem: capOne(prev.ephem, next.ephem),
    bazi:  capOne(prev.bazi,  next.bazi),
  };
}

// ── Filtrage feedbacks avec deltas ──

function withDeltas(feedbacks: DayFeedback[]): DayFeedback[] {
  return feedbacks.filter(f =>
    f.luneDelta  !== undefined &&
    f.ephemDelta !== undefined &&
    f.baziDelta  !== undefined &&
    f.scoreBrut  !== undefined &&
    f.userScore  !== undefined
  );
}

function getWindow(all: DayFeedback[], startDate: string, endDate: string): DayFeedback[] {
  return all.filter(f => f.date >= startDate && f.date <= endDate);
}

// ── Moteur principal ──

export function runWeeklyAlphaGUpdate(now: Date = new Date()): AlphaGState {
  const currentWeek = isoWeek(now);
  const state = loadAlphaGState();

  // Déjà mis à jour cette semaine → retour immédiat (idempotent)
  if (state.lastUpdatedWeek === currentWeek) {
    _cachedState = state;
    return state;
  }

  // Charger tous les feedbacks avec deltas
  const allWithDeltas = withDeltas(getFeedbackHistory(365));
  const N = allWithDeltas.length;
  const tier: 1 | 2 | 3 = N < 21 ? 1 : N < 60 ? 2 : 3;

  // Palier 1 : collecte seulement, pas de modification αG
  if (tier === 1) {
    const updated: AlphaGState = { ...state, lastUpdatedWeek: currentWeek, lastTier: 1 };
    saveAlphaGState(updated);
    _cachedState = updated;
    return updated;
  }

  // Fenêtres 7j glissants (Grok Ronde 10)
  const today  = dateStrOf(now);
  const d6ago  = dateStrOf(addDays(now, -6));
  const d7ago  = dateStrOf(addDays(now, -7));
  const d13ago = dateStrOf(addDays(now, -13));

  const winCur  = getWindow(allWithDeltas, d6ago,  today);
  const winPrev = getWindow(allWithDeltas, d13ago, d7ago);

  // Pas assez de données dans la fenêtre → skip, mettre à jour semaine
  if (winCur.length < MIN_WIN_FBKS) {
    const updated: AlphaGState = { ...state, lastUpdatedWeek: currentWeek, lastTier: tier };
    saveAlphaGState(updated);
    _cachedState = updated;
    return updated;
  }

  // Calcul τ-b sur la fenêtre courante
  const userScores  = winCur.map(f => f.userScore!);
  const luneDeltas  = winCur.map(f => f.luneDelta!);
  const ephemDeltas = winCur.map(f => f.ephemDelta!);
  const baziDeltas  = winCur.map(f => f.baziDelta!);

  const kLune  = computeKendallTauB(luneDeltas,  userScores);
  const kEphem = computeKendallTauB(ephemDeltas, userScores);
  const kBazi  = computeKendallTauB(baziDeltas,  userScores);

  const lastTauB: AlphaGTriple = { lune: kLune.tau, ephem: kEphem.tau, bazi: kBazi.tau };

  // N_eff calculé sur toutes les données historiques (plus robuste que fenêtre seule)
  const kLuneAll  = computeKendallTauB(allWithDeltas.map(f => f.luneDelta!),  allWithDeltas.map(f => f.userScore!));
  const kEphemAll = computeKendallTauB(allWithDeltas.map(f => f.ephemDelta!), allWithDeltas.map(f => f.userScore!));
  const kBaziAll  = computeKendallTauB(allWithDeltas.map(f => f.baziDelta!),  allWithDeltas.map(f => f.userScore!));
  const nEffMap = { lune: kLuneAll.nEff, ephem: kEphemAll.nEff, bazi: kBaziAll.nEff };

  // Seuil de réversion selon palier
  const TAU_REV = tier === 3 ? TAU_REV_P3 : TAU_REV_P2;
  const tauMap  = lastTauB;
  const groups: (keyof AlphaGTriple)[] = ['lune', 'ephem', 'bazi'];
  const kMap    = { lune: kLune, ephem: kEphem, bazi: kBazi };

  // Mise à jour lowTauConsecutive par groupe (fenêtre précédente utilisée pour 2e fenêtre)
  const newLowTau: AlphaGTriple = { ...state.lowTauConsecutive };

  // Vérifier si la fenêtre précédente avait aussi |τ-b| < seuil (pour confirmer 2e fenêtre)
  let prevTauMap: AlphaGTriple | null = null;
  if (winPrev.length >= MIN_WIN_FBKS) {
    const pUser  = winPrev.map(f => f.userScore!);
    prevTauMap = {
      lune:  computeKendallTauB(winPrev.map(f => f.luneDelta!),  pUser).tau,
      ephem: computeKendallTauB(winPrev.map(f => f.ephemDelta!), pUser).tau,
      bazi:  computeKendallTauB(winPrev.map(f => f.baziDelta!),  pUser).tau,
    };
  }

  for (const g of groups) {
    const absT = Math.abs(tauMap[g]);
    if (absT >= TAU_CANCEL) {
      newLowTau[g] = 0;
    } else if (absT < TAU_REV) {
      // Incrémenter seulement si fenêtre précédente aussi basse (ou pas de données prev)
      const prevAlsoBad = prevTauMap ? Math.abs(prevTauMap[g]) < TAU_REV : false;
      newLowTau[g] = prevAlsoBad ? Math.min(2, newLowTau[g] + 1) : Math.max(0, newLowTau[g]);
    } else {
      newLowTau[g] = 0;
    }
  }

  // Calculer les nouveaux αG
  const newCurrent: AlphaGTriple = { ...state.current };

  for (const g of groups) {
    const absT       = Math.abs(tauMap[g]);
    const inReversion = newLowTau[g] >= 2;

    if (inReversion) {
      // Réversion exponentielle douce vers α_init : λ=0.15
      newCurrent[g] = (1 - LAMBDA_REV) * state.current[g] + LAMBDA_REV * state.init[g];
      // Epsilon snap-to-grid (Ronde 10 Gemini, unanime logique)
      // L'exponentielle ne touche jamais son asymptote → forcer α_init quand écart ≤ 0.01
      if (Math.abs(newCurrent[g] - state.init[g]) <= 0.01) {
        newCurrent[g] = state.init[g];
      }
    } else if (absT >= TAU_APPLY) {
      // Critères qualité
      const stdOK = kMap[g].stdX >= STD_MIN;
      const nEffOK = nEffMap[g] >= NEFF_MIN;
      const qualityOK = tier === 3 ? stdOK : (stdOK && nEffOK); // palier 2 : stricter
      if (qualityOK) {
        newCurrent[g] = state.current[g] + Math.sign(tauMap[g]) * CAP_WEEKLY;
      }
    }
    // Sinon : pas de modification
  }

  // Appliquer cap ±0.05 + bornes absolues
  const capped = applyCap(state.current, newCurrent);

  // Renormaliser somme = 3.30
  let normalized = normalizeAlphaG(capped);

  // Re-clamp bornes absolues après renorm
  for (const g of groups) {
    normalized[g] = clamp(round4(normalized[g]), ALPHAG_MIN, ALPHAG_MAX);
  }
  normalized = normalizeAlphaG(normalized);

  // Garde-fou : rollback si invariants violés
  if (!isValidAlphaG(normalized)) {
    const rollback: AlphaGState = {
      ...state,
      lastUpdatedWeek: currentWeek,
      lastTier: tier,
      lastTauB,
      lowTauConsecutive: newLowTau,
    };
    saveAlphaGState(rollback);
    _cachedState = rollback;
    return rollback;
  }

  const updated: AlphaGState = {
    version: 1,
    current:  normalized,
    init:     state.init,
    lastUpdatedWeek: currentWeek,
    lowTauConsecutive: newLowTau,
    lastTauB,
    lastTier: tier,
  };

  saveAlphaGState(updated);
  _cachedState = updated;
  return updated;
}
