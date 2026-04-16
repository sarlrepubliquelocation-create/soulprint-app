// ═══ CALIBRATION V1.0 ═══
// user_calibration_offset — Sprint AC, Kaironaute V10.9
//
// Décisions Rondes 3+4 validées par Jérôme :
//   • EMA alpha = 0.22
//   • Bornes ±8 dur (points bruts post-tanh)
//   • Cap 2 pts/jour (déplacement maximum de l'offset par jour)
//   • Profils : Fluide (cible +8) / Équilibré (cible 0) / Exigeant (cible -8)
//   • Overlay matin : affiché 1 fois/jour
//   • Pause 7j automatique si ignoré 3 jours consécutifs
//
// Stockage : localStorage clé 'kairo_calib_v1'
// Application : offset = clamp(cv.score + offset, 0, 100) — post-tanh, affichage seulement

const STORAGE_KEY = 'kairo_calib_v1';
const ALPHA = 0.22;  // EMA alpha — Ronde 4, validé utilisateur
const BORNES = 8;    // ±8 dur — Ronde 4, argument Gemini retenu
const CAP    = 2;    // 2 pts/jour max — Ronde 3 consensus

export type CalibProfile = 'fluide' | 'equilibre' | 'exigeant';

export interface CalibState {
  offset:      number;              // offset EMA courant, clampé ±BORNES
  profile:     CalibProfile | null; // dernier profil choisi par l'utilisateur
  lastUpdated: string;              // YYYY-MM-DD du dernier choix/skip
  skippedDays: number;              // compteur de jours consécutifs ignorés
  pauseUntil:  string | null;       // date de fin de pause ("YYYY-MM-DD") ou null
}

const EMPTY_STATE: CalibState = {
  offset: 0, profile: null, lastUpdated: '', skippedDays: 0, pauseUntil: null,
};

// Cibles EMA par profil — Ronde 3 Gemini : Fluide=85/Équilibré=50/Exigeant=15
// Traduit en offset : Fluide → +BORNES, Équilibré → 0, Exigeant → -BORNES
const PROFILE_TARGETS: Record<CalibProfile, number> = {
  fluide:    +BORNES,  // +8 — journée fluide, on se laisse porter
  equilibre:  0,       // neutre — pas d'ajustement
  exigeant:  -BORNES,  // -8 — standards élevés, score conservateur
};

// Labels UI
export const PROFILE_LABELS: Record<CalibProfile, { label: string; icon: string; desc: string; color: string }> = {
  fluide:    { label: 'Fluide',    icon: '🌊', desc: 'Je me laisse porter', color: '#4ade80' },
  equilibre: { label: 'Équilibré', icon: '⚖️', desc: 'Journée standard',   color: '#94a3b8' },
  exigeant:  { label: 'Exigeant',  icon: '🎯', desc: 'Standards élevés',   color: '#f59e0b' },
};

import { sto } from './storage';

// ── I/O localStorage ──

function loadCalib(): CalibState {
  try {
    const loaded = sto.get<CalibState>(STORAGE_KEY);
    return loaded ?? { ...EMPTY_STATE };
  } catch { return { ...EMPTY_STATE }; }
}

function saveCalib(s: CalibState): void {
  try { sto.set(STORAGE_KEY, s); } catch { /* localStorage indisponible */ }
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

// ── API publique ──

/** Offset calibré — DÉSACTIVÉ (Ronde #35 Session 3 — décision Jérôme : suppression calibration).
 *  Retourne toujours 0. Les fonctions EMA/overlay restent exportées pour éviter les erreurs d'import
 *  mais n'ont plus d'effet. Nettoyage complet prévu en phase suivante. */
export function getCalibOffset(): number {
  return 0;
}

/** État complet de calibration (pour la UI et le debug) */
export function getCalibState(): CalibState {
  return loadCalib();
}

/**
 * L'utilisateur choisit son profil du jour.
 * Déplace l'EMA d'un pas capé à ±CAP pts vers la cible du profil.
 */
export function setCalibProfile(profile: CalibProfile, todayStr: string): void {
  const s      = loadCalib();
  const target = PROFILE_TARGETS[profile];

  // Un pas EMA : new = (1-α)·old + α·target, déplacement capé à ±CAP
  const rawNew  = (1 - ALPHA) * s.offset + ALPHA * target;
  const delta   = rawNew - s.offset;
  const capped  = Math.sign(delta) * Math.min(Math.abs(delta), CAP);
  const newOff  = Math.max(-BORNES, Math.min(BORNES, s.offset + capped));

  saveCalib({
    offset:      Math.round(newOff * 10) / 10,
    profile,
    lastUpdated: todayStr,
    skippedDays: 0,     // reset : l'utilisateur a interagi → fin de la streak de skip
    pauseUntil:  null,  // reset : lever toute pause si l'utilisateur agit
  });
}

/**
 * L'utilisateur ignore l'overlay (bouton "Passer").
 * Incrémente le compteur de skips. 3 skips → pause automatique 7 jours.
 */
export function recordCalibSkip(todayStr: string): void {
  const s     = loadCalib();
  const skips = s.skippedDays + 1;
  saveCalib({
    ...s,
    lastUpdated: todayStr,                                           // marquer aujourd'hui pour ne pas ré-afficher
    skippedDays: skips,
    pauseUntil:  skips >= 3 ? addDays(todayStr, 7) : s.pauseUntil, // pause auto à 3 skips
  });
}

/**
 * Faut-il afficher l'overlay de calibration aujourd'hui ?
 * Returns false si : pause active, ou déjà vu/ignoré aujourd'hui.
 */
export function shouldShowCalibOverlay(todayStr: string): boolean {
  const s = loadCalib();
  if (s.pauseUntil && todayStr <= s.pauseUntil) return false;  // pause active
  if (s.lastUpdated === todayStr)                return false;  // déjà fait aujourd'hui
  return true;
}
