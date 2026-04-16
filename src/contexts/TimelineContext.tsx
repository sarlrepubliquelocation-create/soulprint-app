/**
 * TimelineContext.tsx — Ronde #35 Session 2
 *
 * Source unique de vérité pour les scores AFFICHÉS (displayScore).
 *
 * Doctrine :
 *   - displayScore = clamp(0, 100, rawScore + calibOffset)
 *   - Les engines (strategic-reading, oracle, temporal) travaillent sur rawScore (vérité moteur)
 *   - Seuls les CHIFFRES VISIBLES par l'utilisateur passent par displayScore / toDisplay()
 *   - calibOffset est une constante de session (ne change pas entre les renders)
 *
 * Utilisé par : ConvergenceTab, CalendarTab, ForecastTab, TemporalTab, App.tsx
 * NON utilisé par : strategic-reading.ts, BondTab (oracle), orchestrator.ts
 */

import React, { createContext, useContext, useMemo } from 'react';
import { getCalibOffset } from '../engines/calibration';

// ── Types ──

export interface TimelineContextValue {
  /** Score affiché du jour (raw + calibOffset, clamp 0-100) */
  displayScore: number;
  /** Score brut moteur (conv.score, sans calibOffset) */
  rawScore: number;
  /** calibOffset courant (constante de session, ex: -2.2) */
  calibOffset: number;
  /** Convertit n'importe quel score brut → score affiché */
  toDisplay: (raw: number) => number;
}

// ── Context ──

const TimelineContext = createContext<TimelineContextValue | null>(null);

// ── Provider ──

interface TimelineProviderProps {
  /** Score brut du jour (conv.score) — null si données pas encore prêtes */
  rawScore: number | null;
  children: React.ReactNode;
}

export function TimelineProvider({ rawScore, children }: TimelineProviderProps) {
  const value = useMemo<TimelineContextValue | null>(() => {
    if (rawScore == null) return null;
    const calibOffset = getCalibOffset();
    const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v + calibOffset)));
    return {
      displayScore: clamp(rawScore),
      rawScore,
      calibOffset,
      toDisplay: (raw: number) => clamp(raw),
    };
  }, [rawScore]);

  return (
    <TimelineContext.Provider value={value}>
      {children}
    </TimelineContext.Provider>
  );
}

// ── Hook consommateur ──

/**
 * Accès au TimelineContext.
 * Lève une erreur si utilisé en dehors de <TimelineProvider>.
 */
export function useTimeline(): TimelineContextValue {
  const ctx = useContext(TimelineContext);
  if (!ctx) throw new Error('useTimeline() appelé en dehors de <TimelineProvider>');
  return ctx;
}

/**
 * Version nullable — pour les composants qui peuvent rendre avant que les données soient prêtes.
 * Retourne null si le Provider n'a pas encore de rawScore.
 */
export function useTimelineSafe(): TimelineContextValue | null {
  return useContext(TimelineContext);
}
