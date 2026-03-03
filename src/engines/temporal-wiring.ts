// ═══ TEMPORAL WIRING V3.1 ═══
// Connecte temporal.ts (Momentum/Forecast/Past/Present/Arc/Narrative)
// aux engines existants (convergence, numerology, moon).
// Exporte computeTemporalData() → TemporalData prêt pour TemporalTab.tsx.
//
// USAGE dans App.tsx :
//   import { computeTemporalData } from './engines/temporal-wiring';
//   const temporalData = computeTemporalData(num, cz, conv, birthDate);
//   <TemporalTab data={temporalData} />

import { type NumerologyProfile, calcPersonalYear } from './numerology';
import { type ChineseZodiac } from './chinese-zodiac';
import { type ConvergenceResult, calcDayPreview } from './convergence';
import { getMercuryStatus, getRetroSchedule, getEclipseList } from './moon';
import {
  type PinnacleInfo,
  type MomentumResult,
  type ForecastResult,
  type PastAnalysis,
  type PresentContext,
  type TemporalNarrative,
  type ArcName,
  type MercuryStatus as TemporalMercuryStatus,
  type PlanetaryRetro,
  type RetroPeriod,
  type EclipseInfo,
  calcMomentum,
  calcForecast,
  calcPastAnalysis,
  calcPresentContext,
  detectArc,
  generateTemporalNarrative,
} from './temporal';
import { type TemporalData } from '../components/TemporalTab';

// ── Helpers ──

/** Construit PinnacleInfo[] compatible temporal à partir de NumerologyProfile */
function buildPinnacles(num: NumerologyProfile, bd: string): PinnacleInfo[] {
  const lpv = num.lp.v > 9 ? (num.lp.v === 11 ? 2 : num.lp.v === 22 ? 4 : num.lp.v === 33 ? 6 : Math.floor(num.lp.v / 10)) : num.lp.v;
  const p1End = 36 - lpv;
  return [
    { number: num.pinnacles[0].v, startAge: 0, endAge: p1End },
    { number: num.pinnacles[1].v, startAge: p1End, endAge: p1End + 9 },
    { number: num.pinnacles[2].v, startAge: p1End + 9, endAge: p1End + 18 },
    { number: num.pinnacles[3].v, startAge: p1End + 18, endAge: 99 },
  ];
}

/** Réduit un nombre à un chiffre (sauf maîtres) */
function reduceSimple(n: number): number {
  while (n > 9 && n !== 11 && n !== 22 && n !== 33) {
    n = String(n).split('').reduce((a, b) => a + parseInt(b), 0);
  }
  return n;
}

/** calcPY callback — prend une Date, retourne le PY réduit */
function makePYCallback(bd: string): (date: Date) => number {
  return (date: Date): number => {
    const year = date.getFullYear();
    return calcPersonalYear(bd, year).v;
  };
}

/** calcPM callback — Personal Month = reduce(PY + mois calendaire) */
function makePMCallback(bd: string): (date: Date) => number {
  return (date: Date): number => {
    const py = calcPersonalYear(bd, date.getFullYear()).v;
    const month = date.getMonth() + 1;
    return reduceSimple(py + month);
  };
}

/** Adapte le retour de getRetroSchedule() en RetroPeriod[] pour temporal */
function adaptRetroSchedule(): RetroPeriod[] {
  try {
    const schedule = getRetroSchedule();
    // getRetroSchedule retourne un tableau avec { planet, start, end } ou similaire
    return (schedule || []).map((r: any) => ({
      planet: r.planet || 'Mercure',
      start: typeof r.start === 'string' ? r.start : r.start?.toISOString?.()?.slice(0, 10) || '',
      end: typeof r.end === 'string' ? r.end : r.end?.toISOString?.()?.slice(0, 10) || '',
    })).filter((r: RetroPeriod) => r.start && r.end);
  } catch {
    return [];
  }
}

/** Adapte getEclipseList() en EclipseInfo[] pour temporal */
function adaptEclipseList(): EclipseInfo[] {
  try {
    const eclipses = getEclipseList();
    return (eclipses || []).map((e: any) => ({
      date: typeof e.date === 'string' ? e.date : e.date?.toISOString?.()?.slice(0, 10) || '',
      type: e.type || 'lunaire',
    })).filter((e: EclipseInfo) => e.date);
  } catch {
    return [];
  }
}

/** Adapte getMercuryStatus() → TemporalMercuryStatus */
function adaptMercuryStatus(): TemporalMercuryStatus {
  try {
    const m = getMercuryStatus(new Date());
    return {
      phase: m.phase || 'direct',
      score: typeof m.score === 'number' ? m.score : 0,
      label: m.label || 'Direct',
    };
  } catch {
    return { phase: 'direct', score: 0, label: 'Direct' };
  }
}

/** Crée le callback getScore(date) pour Momentum et Forecast */
function makeScoreCallback(
  bd: string,
  num: NumerologyProfile,
  cz: ChineseZodiac,
  transitBonus: number,
): (date: Date) => number {
  return (date: Date): number => {
    try {
      const ds = date.toISOString().slice(0, 10);
      const preview = calcDayPreview(bd, num, cz, ds, transitBonus);
      return preview.score;
    } catch {
      return 50; // fallback neutre
    }
  };
}

// ══════════════════════════════════════
// ═══ EXPORT PRINCIPAL ═══
// ══════════════════════════════════════

/**
 * Calcule toutes les données temporelles en une seule passe.
 * Appelé une fois par jour dans App.tsx, passé à TemporalTab.
 *
 * @param num - Profil numérologique
 * @param cz - Zodiaque chinois
 * @param conv - Résultat de convergence (pour south node, astro bonus)
 * @param bd - Date de naissance ISO (ex: '1977-09-23')
 */
export function computeTemporalData(
  num: NumerologyProfile,
  cz: ChineseZodiac,
  conv: ConvergenceResult,
  bd: string,
): TemporalData {
  const today = new Date();
  const birthDate = new Date(bd + 'T12:00:00');

  // Préparer les callbacks et données
  const pinnacles = buildPinnacles(num, bd);
  const calcPY = makePYCallback(bd);
  const calcPM = makePMCallback(bd);
  const transitBonus = 0; // estimateSlowTransitBonus needs astro which is optional
  const getScore = makeScoreCallback(bd, num, cz, transitBonus);

  // Données externes adaptées
  const retroPeriods = adaptRetroSchedule();
  const eclipses = adaptEclipseList();
  const mercuryStatus = adaptMercuryStatus();

  // South node depuis convergence
  const southNodeSign = conv.lunarNodes?.natal?.southNode?.sign || null;
  const missingNumbers = num.kl || [];

  // Active retrogrades (simplifié)
  const activeRetrogrades: PlanetaryRetro[] = [];
  if (mercuryStatus.score < 0) {
    activeRetrogrades.push({ planet: 'Mercure', score: mercuryStatus.score });
  }

  // ── 1. MOMENTUM (7 derniers jours) ──
  const momentum = calcMomentum(getScore, today);

  // ── 2. FORECAST (7/30/90 jours) ──
  const forecast = calcForecast(
    today, getScore, retroPeriods, eclipses,
    calcPY, birthDate, pinnacles
  );

  // ── 3. PAST ANALYSIS ──
  const past = calcPastAnalysis(
    today, birthDate, pinnacles, calcPY,
    missingNumbers, southNodeSign
  );

  // ── 4. PRESENT CONTEXT ──
  const present = calcPresentContext(
    today, birthDate, pinnacles, calcPY, calcPM,
    mercuryStatus, activeRetrogrades
  );

  // ── 5. ARC NARRATIF ──
  const arc = detectArc(past, present, momentum, forecast);

  // ── 6. NARRATIVE TEMPORELLE ──
  const narrative = generateTemporalNarrative(past, present, momentum, forecast);

  return { momentum, forecast, past, present, arc, narrative };
}
