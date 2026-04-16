/**
 * score-history.ts — Cache historique des scores LIVE quotidiens.
 *
 * Ronde #35 F5 — Format 4 champs : { raw, off, xt, v }
 *   raw = score brut (sans calibOffset) — vérité moteur
 *   off = calibOffset au moment du calcul — pour reconstruire ce que l'utilisateur a vu
 *   xt  = X_total_future (checksum profil — détecte changement d'heure de naissance)
 *   v   = version algorithme (pour futures migrations)
 *
 * Score affiché (displayScore) = clamp(0, 100, raw + off)
 *
 * Ronde #35 F6 — Save unique dans orchestrator.ts (buildSoulData).
 * Le double-save depuis ConvergenceTab.tsx est supprimé.
 *
 * V3 : clé isolée par profil (date de naissance). Format : "kn_sh3_<bd>"
 *      Migration V2→V3 : purge (seul utilisateur = Jérôme).
 * Rétention : 400 jours max (nettoyage automatique des plus anciens).
 */

import { sto } from './storage';
import { ALGO_VERSION } from './convergence.types';

const LS_KEY_LEGACY = 'kn_scoreHistory';
const LS_PREFIX_V2 = 'kn_sh_';
const LS_PREFIX = 'kn_sh3_';
const MAX_DAYS = 400;

/** Entrée score-history V3 (Ronde #35) */
export interface ScoreHistoryEntry {
  raw: number;   // score brut moteur (sans calibOffset)
  off: number;   // calibOffset au moment du calcul
  xt: number;    // X_total_future (checksum profil)
  v: string;     // version algorithme (ex: "8.0")
}

type ScoreRecordV3 = Record<string, ScoreHistoryEntry>;

/** Clé storage isolée par profil */
function _key(bd: string): string {
  return `${LS_PREFIX}${bd}`;
}

/** Migration one-shot : purger les anciennes clés V1 et V2 */
function _purgeLegacy(bd: string): void {
  try {
    // V1 : clé globale
    sto.remove(LS_KEY_LEGACY);
    // V2 : clé par profil (ancien format Record<string, number>)
    sto.remove(`${LS_PREFIX_V2}${bd}`);
  } catch { /* silently fail */ }
}

/** Lecture du cache complet pour un profil */
function _load(bd: string): ScoreRecordV3 {
  try {
    _purgeLegacy(bd);
    return sto.get<ScoreRecordV3>(_key(bd)) || {};
  } catch {
    return {};
  }
}

/** Écriture avec nettoyage LRU si > MAX_DAYS */
function _save(bd: string, data: ScoreRecordV3): void {
  try {
    const keys = Object.keys(data).sort();
    if (keys.length > MAX_DAYS) {
      const excess = keys.length - MAX_DAYS;
      for (let i = 0; i < excess; i++) {
        delete data[keys[i]];
      }
    }
    sto.set(_key(bd), data);
  } catch {
    // storage plein ou indisponible — silently fail
  }
}

/**
 * Enregistre le score LIVE du jour pour un profil.
 * Ronde #35 F5 — stocke les 4 champs { raw, off, xt, v }.
 * Ronde #35 F6 — appelé UNIQUEMENT dans orchestrator.ts (buildSoulData).
 * Ronde #35 F7 — GUARD write-once : les jours passés ne sont JAMAIS réécrits.
 *   Le jour courant peut être mis à jour (le score se stabilise au fil de la journée).
 *   Les jours passés sont gelés — leur score est la vérité historique.
 */
export function saveScoreLive(
  dateStr: string,
  raw: number,
  off: number,
  xt: number,
  bd: string,
): void {
  const data = _load(bd);
  const existing = data[dateStr];

  // F7 GUARD write-once : si l'entrée existe ET que le jour est passé → ne pas écraser
  if (existing) {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    if (dateStr < todayStr) return; // jour passé → gelé, on ne touche pas
    // jour courant : ne réécrire que si le score a changé
    if (existing.raw === raw && existing.off === off) return;
  }

  data[dateStr] = { raw, off, xt, v: ALGO_VERSION };
  _save(bd, data);
}

/**
 * Récupère le score AFFICHÉ historique d'un jour passé pour un profil.
 * Retourne raw + off (= ce que l'utilisateur a vu), ou undefined si pas d'historique.
 */
export function getHistoricalScore(dateStr: string, bd: string): number | undefined {
  const data = _load(bd);
  const entry = data[dateStr];
  if (!entry) return undefined;
  return Math.max(0, Math.min(100, Math.round(entry.raw + entry.off)));
}

/**
 * Récupère tous les scores AFFICHÉS historiques d'un profil (pour batch dans CalendarTab).
 * Retourne Record<string, number> (displayScore) pour compatibilité avec les consommateurs existants.
 */
export function getAllHistoricalScores(bd: string): Record<string, number> {
  const data = _load(bd);
  const result: Record<string, number> = {};
  for (const [date, entry] of Object.entries(data)) {
    result[date] = Math.max(0, Math.min(100, Math.round(entry.raw + entry.off)));
  }
  return result;
}

/**
 * Ronde #35 F7 — Récupère tous les scores BRUTS historiques d'un profil.
 * Retourne Record<string, number> (rawScore) pour le comptage Cosmiques.
 * Le comptage annuel de Cosmiques doit utiliser le score brut (vérité moteur),
 * pas le displayScore (qui dépend du calibOffset, variable selon le profil de calibration).
 */
export function getAllRawHistoricalScores(bd: string): Record<string, number> {
  const data = _load(bd);
  const result: Record<string, number> = {};
  for (const [date, entry] of Object.entries(data)) {
    result[date] = Math.max(0, Math.min(100, Math.round(entry.raw)));
  }
  return result;
}

/**
 * Récupère l'entrée brute score-history (4 champs) pour un jour.
 * Utile pour détecter un changement de profil (xt stocké ≠ xt recalculé).
 */
export function getHistoricalEntry(dateStr: string, bd: string): ScoreHistoryEntry | undefined {
  const data = _load(bd);
  return data[dateStr];
}
