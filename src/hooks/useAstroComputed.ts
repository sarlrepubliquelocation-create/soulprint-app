/**
 * useAstroComputed — Phase 3d Architecture 3 couches
 *
 * Extrait les 8 calculs purs (non-UI-dependent) d'AstroTab
 * dans un hook réutilisable et testable.
 *
 * Les 3 useMemo liés au state houseSystem (displayPl, displayStelliums, toggleDiffs)
 * restent dans AstroTab car ils dépendent d'un useState local.
 */
import { useMemo } from 'react';
import { type SoulData } from '../App';
import { SIGN_FR, type Transit } from '../engines/astrology';
import { calcProfection, type ProfectionResult } from '../engines/profections';
import { calcSolarReturn, type SolarReturnResult } from '../engines/solar-return';
import { calcProgressions, type ProgressionsResult } from '../engines/progressions';
import { getUpcomingLunarPhases, type UpcomingLunarPhase } from '../engines/moon';
import { calcLunarReturn, type LunarReturnResult } from '../engines/lunar-return';
import { useTimelineSafe } from '../contexts/TimelineContext'; // Ronde #35 S2

export interface DashMood {
  bg: string;
  border: string;
  icon: string;
  label: string;
}

export interface AstroComputed {
  profection: ProfectionResult | null;
  solarReturn: SolarReturnResult | null;
  progressions: ProgressionsResult | null;
  upcomingPhases: UpcomingLunarPhase[];
  lunarReturn: LunarReturnResult | null;
  topTransit: Transit | null;
  displayScore: number;
  dashMood: DashMood;
}

export function useAstroComputed(
  data: SoulData,
  bd: string,
  bp?: string,
): AstroComputed {
  const astro = data.astro;

  // ── Profection annuelle ──
  const profection = useMemo<ProfectionResult | null>(() => {
    if (!astro || !bd) return null;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const ascFr = SIGN_FR[astro.b3.asc] || null;
    const sunFr = SIGN_FR[astro.b3.sun] || 'Bélier';
    return calcProfection(bd, todayStr, ascFr, sunFr, astro.noTime);
  }, [astro, bd]);

  // ── Retour Solaire ──
  const solarReturn = useMemo<SolarReturnResult | null>(() => {
    if (!astro || !bd || astro.noTime) return null;
    try {
      return calcSolarReturn(astro, bd, new Date(), bp);
    } catch (e) { if (import.meta.env.DEV) console.warn('[Astro] SolarReturn:', e); return null; }
  }, [astro, bd, bp]);

  // ── Progressions secondaires ──
  const progressions = useMemo<ProgressionsResult | null>(() => {
    if (!astro || !bd || astro.noTime) return null;
    try { return calcProgressions(bd, new Date(), astro); }
    catch (e) { if (import.meta.env.DEV) console.warn('[Astro] Progressions:', e); return null; }
  }, [astro, bd]);

  // ── Phases lunaires structurées ──
  const upcomingPhases = useMemo<UpcomingLunarPhase[]>(() => {
    if (!astro) return [];
    try { return getUpcomingLunarPhases(new Date(), astro.b3?.asc || null); }
    catch (e) { if (import.meta.env.DEV) console.warn('[Astro] LunarPhases:', e); return []; }
  }, [astro]);

  // ── Retour lunaire mensuel ──
  const lunarReturn = useMemo<LunarReturnResult | null>(() => {
    if (!astro || astro.noTime) return null;
    try { return calcLunarReturn(astro, new Date(), bp); }
    catch (e) { if (import.meta.env.DEV) console.warn('[Astro] LunarReturn:', e); return null; }
  }, [astro, bp]);

  // ── Transit le plus fort du jour ──
  const topTransit = useMemo<Transit | null>(() => {
    if (!astro?.tr?.length) return null;
    const sorted = [...astro.tr].sort((a: Transit, b: Transit) => a.o - b.o);
    return sorted[0] || null;
  }, [astro]);

  // ── Score calibré — Ronde #35 S2 : via TimelineProvider (source unique) ──
  const _tl = useTimelineSafe();
  const displayScore = _tl?.displayScore ?? Math.max(0, Math.min(100, Math.round(data.conv?.score ?? 50)));

  // ── Mood dashboard ──
  const dashMood = useMemo<DashMood>(() => {
    if (displayScore >= 80) return { bg: 'linear-gradient(135deg, #D4AF3712, #4ade8008)', border: '#D4AF3730', icon: '🌤', label: 'Énergie favorable' };
    if (displayScore >= 60) return { bg: 'linear-gradient(135deg, #60a5fa08, #D4AF3708)', border: '#60a5fa20', icon: '🌫', label: 'Énergie équilibrée' };
    return { bg: 'linear-gradient(135deg, #8b5cf608, #ef444408)', border: '#8b5cf620', icon: '🌧', label: 'Énergie exigeante' };
  }, [displayScore]);

  return {
    profection,
    solarReturn,
    progressions,
    upcomingPhases,
    lunarReturn,
    topTransit,
    displayScore,
    dashMood,
  };
}
