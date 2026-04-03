/**
 * score-history.ts — Cache historique des scores LIVE quotidiens.
 *
 * Sauvegarde le score Pilotage (LIVE) de chaque jour dans sto wrapper.
 * Le calendrier consulte cet historique pour les jours passés afin d'éviter
 * toute divergence entre le score affiché en Pilotage et celui du calendrier.
 *
 * V2 : clé isolée par profil (date de naissance) pour éviter la contamination
 *      entre profils lors de tests. Format : "kn_sh_<bd>" → JSON { "2026-03-23": 86, ... }
 *      Migration automatique de l'ancienne clé globale "kn_scoreHistory".
 * Rétention : 400 jours max (nettoyage automatique des plus anciens).
 */

import { sto } from './storage';

const LS_KEY_LEGACY = 'kn_scoreHistory';
const LS_PREFIX = 'kn_sh_';
const MAX_DAYS = 400;

type ScoreRecord = Record<string, number>;

/** Clé storage isolée par profil */
function _key(bd: string): string {
  return `${LS_PREFIX}${bd}`;
}

/** Migration one-shot : ancien cache global → cache du profil actif */
function _migrateLegacy(bd: string): void {
  try {
    const legacy = sto.getRaw(LS_KEY_LEGACY);
    if (!legacy) return;
    const legacyData = JSON.parse(legacy) as ScoreRecord;
    const profileKey = _key(bd);
    const existing = sto.getRaw(profileKey);
    if (!existing) {
      // Premier lancement avec la V2 : transférer les données au profil actuel
      sto.set(profileKey, legacyData);
    }
    // Supprimer l'ancienne clé globale pour ne plus jamais migrer
    sto.remove(LS_KEY_LEGACY);
  } catch { /* silently fail */ }
}

/** Lecture du cache complet pour un profil */
function _load(bd: string): ScoreRecord {
  try {
    _migrateLegacy(bd);
    return sto.get<ScoreRecord>(_key(bd)) || {};
  } catch {
    return {};
  }
}

/** Écriture avec nettoyage LRU si > MAX_DAYS */
function _save(bd: string, data: ScoreRecord): void {
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
 * Appelé par calcConvergence à chaque calcul.
 * Ne met à jour que si le score est différent (évite les écritures inutiles).
 */
export function saveScoreLive(dateStr: string, score: number, bd: string): void {
  const data = _load(bd);
  if (data[dateStr] === score) return; // déjà à jour
  data[dateStr] = score;
  _save(bd, data);
}

/**
 * Récupère le score historique d'un jour passé pour un profil.
 * @returns le score LIVE enregistré, ou undefined si pas d'historique.
 */
export function getHistoricalScore(dateStr: string, bd: string): number | undefined {
  const data = _load(bd);
  return data[dateStr];
}

/**
 * Récupère tous les scores historiques d'un profil (pour batch dans CalendarTab).
 */
export function getAllHistoricalScores(bd: string): ScoreRecord {
  return _load(bd);
}
