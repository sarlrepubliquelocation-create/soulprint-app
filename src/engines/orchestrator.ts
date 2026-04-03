/**
 * orchestrator.ts — Phase 1 Architecture 3 couches
 *
 * Centralise les 3 calculs lourds extraits d'App.tsx :
 *   1. buildSoulData()     — profil complet (numérologie, astro, convergence, etc.)
 *   2. buildTemporalData() — bridge temporal (momentum, forecast, past, present, arc)
 *   3. buildPSIData()      — résonance périodique 365 jours
 *
 * Aucune logique de calcul n'est modifiée — c'est un DÉPLACEMENT pur.
 * Les formules, constantes et appels sont identiques bit-à-bit à App.tsx pré-refactoring.
 */

import { calcNumerology, calcPersonalYear, calcPersonalMonth, calcPersonalDay, reduce, calcLifePathHorizontal, calcInclusionDisplay, calcPinnacles, calcChallenges, getActivePinnacleIdx, getNumberInfo, type NumerologyProfile, type Reduced, type InclusionDisplay } from './numerology';
import { calcAge } from './date-utils';
import { calcAstro, type AstroChart, getPlanetLongitudeForDate } from './astrology';
import { calcChineseZodiac, type ChineseZodiac } from './chinese-zodiac';
import { calcIChing, getHexTier, calcNatalIChing, getHexProfile, type IChingReading, type HexProfile } from './iching';
import { calcConvergence, calcDayPreview, calcMonthPreviews, applySoftShiftBlend, estimateSlowTransitBonus, type ConvergenceResult, type DayPreview } from './convergence';
import { calculateLuckPillars, calcBaZiDaily, getPeachBlossom, calcDayMaster, calcFourPillars, getNaYin, getChangsheng, type LuckPillarResult, type LuckPillar, type DayMasterDailyResult, type PeachBlossomResult, type FourPillars, type NaYinResult, type ChangshengResult } from './bazi';
import { getMoonPhase, getNatalMoon, getRetroSchedule, getEclipseList, getMercuryStatus, getVoidOfCourseMoon, getPlanetaryRetrogrades, calcLunarNodes, type NatalMoon } from './moon';
import { interpolateReturnIntensity, extractNatalReturnLongs, planetPosToLong } from './returns';
import {
  calcMomentum, calcForecast, calcPastAnalysis, calcPresentContext,
  detectArc, generateTemporalNarrative,
  calcPSI, buildPSIVector, calcMACD,
  type PinnacleInfo, type PSIResult, type PSIVector, type TemporalNarrative,
} from './temporal';
import { calcCIAtDays, calcPotentielAction, calcTendanceScore, buildTransitionAlerts, type TransitionAlert, type TemporalCI } from './temporal-layers';
import { calcNakshatra, getAyanamsa } from './nakshatras';
import { getDashaAntarLordIndex, calcCurrentDasha, type CurrentDasha } from './vimshottari';
import { calcBirthCard, getArcana, type MajorArcana } from './tarot';
import { getSouthNode, generateKarmicMission, detectKarmicTension, type ZodiacSign, type SouthNodeReading, type KarmicMissionReading } from './karmic-mission';
import { loadPersonalWeights, getRadarData, type PersonalWeights, type RadarPillar } from './personalization';

// Re-export SoulData interface (App.tsx continue d'en avoir besoin)
export interface SoulData {
  num: NumerologyProfile;
  astro: AstroChart | null;
  cz: ChineseZodiac;
  iching: IChingReading;
  conv: ConvergenceResult;
  luckPillars: LuckPillarResult;
  dasha?: CurrentDasha;
}

// TemporalData interface — Résultats calculés par buildTemporalData
export interface TemporalData {
  momentum: ReturnType<typeof calcMomentum>;
  forecast: ReturnType<typeof calcForecast>;
  past: ReturnType<typeof calcPastAnalysis>;
  present: ReturnType<typeof calcPresentContext>;
  arc: ReturnType<typeof detectArc>;
  narrative: TemporalNarrative;
  macd: ReturnType<typeof calcMACD>;
  forecastCI: {
    ci7: ReturnType<typeof calcCIAtDays>;
    ci30: ReturnType<typeof calcCIAtDays>;
    ci90: ReturnType<typeof calcCIAtDays>;
  };
  potentielAction: ReturnType<typeof calcPotentielAction>;
  transitionAlerts: TransitionAlert[];
}

// ── Helper : date → string YYYY-MM-DD (jamais hardcodée) ──
function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dateToStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ── Helper : Lune natale sidérale (utilisé par SoulData + PSI) — dédupliqué ──
function getNatalMoonSidereal(bd: string): number {
  const birthD = new Date(bd + 'T12:00:00');
  const natalMoon = getMoonPhase(birthD);
  const ayanamsa = getAyanamsa(birthD.getFullYear());
  return ((natalMoon.longitudeTropical - ayanamsa) % 360 + 360) % 360;
}

// ── Helper : Pinnacles (utilisé par Temporal + PSI) — dédupliqué ──
function buildPinnacles(num: NumerologyProfile): PinnacleInfo[] {
  const lpSingle = num.lp.v > 9 ? reduce(num.lp.v, false).v : num.lp.v;
  const p1End = 36 - lpSingle;
  return [
    { number: num.pinnacles[0].v, startAge: 0, endAge: p1End },
    { number: num.pinnacles[1].v, startAge: p1End, endAge: p1End + 9 },
    { number: num.pinnacles[2].v, startAge: p1End + 9, endAge: p1End + 18 },
    { number: num.pinnacles[3].v, startAge: p1End + 18, endAge: 99 },
  ];
}

// ═══════════════════════════════════════════════════════
// 1. buildSoulData — Profil complet
// ═══════════════════════════════════════════════════════

interface LockProfile {
  fn: string; mn: string; ln: string;
  bd: string; bt: string; bp: string;
  gn: 'M' | 'F'; tz: number;
}

export function buildSoulData(lock: LockProfile): SoulData | null {
  if (!lock.fn || !lock.ln || !lock.bd) return null;
  try {
    const today = getToday();
    const num = calcNumerology(lock.fn, lock.mn, lock.ln, lock.bd, today);
    const astro = calcAstro(lock.bd, lock.bt, lock.bp, lock.tz, today);
    const cz = calcChineseZodiac(lock.bd);
    const iching = calcIChing(lock.bd, today);
    const conv = calcConvergence(num, astro, cz, iching, lock.bd, lock.bt || undefined);
    const luckPillars = calculateLuckPillars(new Date(lock.bd + 'T00:00:00'), lock.gn);

    let dasha: CurrentDasha | undefined;
    try {
      const natalSid = getNatalMoonSidereal(lock.bd);
      dasha = calcCurrentDasha(natalSid, new Date(lock.bd + 'T12:00:00'), new Date());
    } catch { /* silent — dasha reste undefined si données absentes */ }

    return { num, astro, cz, iching, conv, luckPillars, dasha };
  } catch (e) { console.error(e); return null; }
}

// ═══════════════════════════════════════════════════════
// 2. buildTemporalData — Bridge Temporal
// ═══════════════════════════════════════════════════════

export function buildTemporalData(data: SoulData, bd: string): TemporalData | null {
  try {
    const today = new Date();
    const birthDate = new Date(bd + 'T00:00:00');
    const { num, cz, conv } = data;

    const pinnacles = buildPinnacles(num);

    // Wrapper getScore : Date → number (score léger via calcDayPreview)
    const transitBonus = estimateSlowTransitBonus(data.astro);
    const getScore = (d: Date): number => {
      const ds = dateToStr(d);
      return calcDayPreview(bd, num, cz, ds, transitBonus).score;
    };

    // Wrapper calcPY / calcPM
    const calcPY = (d: Date): number => calcPersonalYear(bd, d.getFullYear()).v;
    const calcPM = (d: Date): number => calcPersonalMonth(bd, d.getFullYear(), d.getMonth() + 1).v;

    // Données moon.ts
    const retroPeriods = getRetroSchedule();
    const eclipses = getEclipseList();
    const mercuryStatus = getMercuryStatus(today);
    const planetaryRetros = getPlanetaryRetrogrades(today);

    const mercuryForTemporal = { phase: mercuryStatus.phase, score: mercuryStatus.points, label: mercuryStatus.label };
    const retrosForTemporal = planetaryRetros.map(r => ({ planet: r.planet, score: r.points }));

    const southNodeSign = conv.lunarNodes?.natal?.northNode?.sign
      ? conv.lunarNodes.natal.southNode.sign
      : null;

    // Calculs temporels
    const momentum = calcMomentum(getScore, today);
    const forecast = calcForecast(today, getScore, retroPeriods, eclipses, calcPY, birthDate, pinnacles);
    const past = calcPastAnalysis(today, birthDate, pinnacles, calcPY, num.kl, southNodeSign);
    const present = calcPresentContext(today, birthDate, pinnacles, calcPY, calcPM, mercuryForTemporal, retrosForTemporal);
    const macd = calcMACD(getScore, today);
    const arc = detectArc(past, present, momentum, forecast);

    // Potentiel d'Action
    const todayScore = data.conv.score;
    const tendanceScore = calcTendanceScore(calcPY(today), calcPM(today));
    const potentielAction = calcPotentielAction(todayScore, tendanceScore);

    // Narrative V2 — Template Factory (Ronde #9)
    const narrative = generateTemporalNarrative(past, present, momentum, forecast, todayScore, tendanceScore);

    // CI(t) fiabilité des prévisions
    const sigma7j = momentum.scores.length > 1
      ? Math.sqrt(momentum.scores.reduce((s, v) => s + (v - momentum.avgLast7) ** 2, 0) / momentum.scores.length)
      : 10;
    const forecastCI = {
      ci7:  calcCIAtDays(4, 0.7, sigma7j),
      ci30: calcCIAtDays(15, 0.7, sigma7j),
      ci90: calcCIAtDays(45, 0.7, sigma7j),
    };

    // Alertes de transition
    let transitionAlerts: TransitionAlert[] = [];
    try {
      transitionAlerts = buildTransitionAlerts(data.luckPillars, num, sigma7j, today);
    } catch { /* Bazi data peut être incomplète */ }

    return { momentum, forecast, past, present, arc, narrative, macd, forecastCI, potentielAction, transitionAlerts };
  } catch (e) { console.error('Temporal bridge error:', e); return null; }
}

// ═══════════════════════════════════════════════════════
// 3. buildPSIData — Résonance Périodique (V4.9 Sprint E2)
// ═══════════════════════════════════════════════════════

// Constantes PSI — extraites d'App.tsx pour lisibilité
const PSI_TRANSIT_SPEEDS: Record<string, number> = {
  jupiter: 0.0831, saturn: 0.0334, uranus: 0.0119, neptune: 0.0059, pluto: 0.0040,
};

const PSI_TRANSIT_TYPE: Record<string, Record<string, number>> = {
  jupiter: { conjunction: 1,  trine: 1,  sextile: 1,  square: -1, opposition: -1 },
  saturn:  { conjunction: -1, trine: 1,  sextile: 1,  square: -1, opposition: -1 },
  uranus:  { conjunction: 0,  trine: 1,  sextile: 1,  square: -1, opposition: -1 },
  neptune: { conjunction: 0,  trine: 1,  sextile: 1,  square: -1, opposition: -1 },
  pluto:   { conjunction: -1, trine: 1,  sextile: 1,  square: -1, opposition: -1 },
};

const PSI_ASPECT_ANGLES: Array<{ name: string; angle: number; orb: number }> = [
  { name: 'conjunction', angle: 0,   orb: 4.0 },
  { name: 'trine',       angle: 120, orb: 4.0 },
  { name: 'sextile',     angle: 60,  orb: 3.0 },
  { name: 'square',      angle: 90,  orb: 4.0 },
  { name: 'opposition',  angle: 180, orb: 4.0 },
];

const PSI_NATAL_TARGETS = ['sun', 'moon', 'mercury', 'venus', 'mars'];

function psiAngDist(a: number, b: number): number {
  const d = Math.abs(((a - b) % 360 + 360) % 360);
  return d > 180 ? 360 - d : d;
}

function psiGaussian(orb: number, sigma: number): number {
  return Math.exp(-(orb * orb) / (2 * sigma * sigma));
}

export function buildPSIData(data: SoulData, bd: string): PSIResult | null {
  try {
    const { num, iching } = data;
    const today = new Date();
    const birthDate = new Date(bd + 'T00:00:00');

    const pinnacles = buildPinnacles(num);

    // Helper : phase Pinnacle pour une date donnée
    const getPinnaclePhase = (d: Date): 'early' | 'middle' | 'late' => {
      const age = calcAge(d, birthDate);
      const cur = pinnacles.find(p => age >= p.startAge && age < p.endAge)
        || pinnacles[pinnacles.length - 1];
      const yearsIn = cur.endAge - cur.startAge;
      const yearsPassed = age - cur.startAge;
      if (yearsPassed <= 2)              return 'early';
      if (yearsIn - yearsPassed <= 2)    return 'late';
      return 'middle';
    };

    // A1.1 : longitudes actuelles pré-calculées ONCE
    const natalReturnLongs = data.astro ? extractNatalReturnLongs(data.astro) : null;
    const todayLongs = natalReturnLongs ? {
      saturn:    getPlanetLongitudeForDate('saturn',    today),
      jupiter:   getPlanetLongitudeForDate('jupiter',   today),
      northNode: getPlanetLongitudeForDate('northNode', today),
    } : null;

    // V5.1 : Lune natale sidérale pré-calculée ONCE
    let natalMoonSidForPSI = 0;
    try {
      natalMoonSidForPSI = getNatalMoonSidereal(bd);
    } catch { /* garde silencieux */ }

    // V5.3 : Transits personnalisés PSI — pré-calcul ONCE hors boucle
    const psiNatalLongs: Record<string, number> | null = data.astro ? (() => {
      const r: Record<string, number> = {};
      for (const pl of data.astro.pl) {
        if (PSI_NATAL_TARGETS.includes(pl.k)) r[pl.k] = planetPosToLong(pl.s, pl.d);
      }
      r['asc'] = planetPosToLong(data.astro.b3.asc, data.astro.ad);
      return Object.keys(r).length >= 3 ? r : null;
    })() : null;

    const psiTransitTodayLongs: Record<string, number> | null = psiNatalLongs ? {
      jupiter: getPlanetLongitudeForDate('jupiter', today),
      saturn:  getPlanetLongitudeForDate('saturn',  today),
      uranus:  getPlanetLongitudeForDate('uranus',  today),
      neptune: getPlanetLongitudeForDate('neptune', today),
      pluto:   getPlanetLongitudeForDate('pluto',   today),
    } : null;

    // calcPSITransitScores(deltaJours) → { beneficScore: 0-1, tenseScore: 0-1 }
    const calcPSITransitScores = (deltaJours: number): { beneficScore: number; tenseScore: number } | null => {
      if (!psiNatalLongs || !psiTransitTodayLongs) return null;
      let beneficSum = 0, tenseSum = 0;
      for (const [planet, todayLong] of Object.entries(psiTransitTodayLongs)) {
        const speed    = PSI_TRANSIT_SPEEDS[planet] ?? 0;
        const transitL = ((todayLong + speed * deltaJours) % 360 + 360) % 360;
        const ampMap   = PSI_TRANSIT_TYPE[planet];
        if (!ampMap) continue;
        for (const [, natalLong] of Object.entries(psiNatalLongs)) {
          const dist = psiAngDist(transitL, natalLong);
          for (const asp of PSI_ASPECT_ANGLES) {
            const orb = Math.abs(dist - asp.angle);
            if (orb > asp.orb) continue;
            const intensity = psiGaussian(orb, asp.orb / 2.5);
            const type = ampMap[asp.name] ?? 0;
            if (type > 0) { beneficSum += intensity; }
            if (type < 0) { tenseSum  += intensity; }
          }
        }
      }
      const norm = 30;
      return {
        beneficScore: Math.min(1, beneficSum / norm),
        tenseScore:   Math.min(1, tenseSum  / norm),
      };
    };

    const buildVector = (d: Date): PSIVector => {
      const ds = dateToStr(d);

      // Numérologie
      const pdVal = calcPersonalDay(bd, ds).v;
      const pmVal = calcPersonalMonth(bd, d.getFullYear(), d.getMonth() + 1).v;
      const pyVal = calcPersonalYear(bd, d.getFullYear()).v;

      // Lune — phase (0-7) depuis longitudeTropical
      const moonP = getMoonPhase(d);
      const moonPhaseIdx = Math.floor(((moonP.phase % 360) + 360) % 360 / 45);

      // Nakshatra — id 1-27
      const ayanamsa = getAyanamsa(d.getFullYear());
      const moonSid  = ((moonP.longitudeTropical - ayanamsa) % 360 + 360) % 360;
      const nak      = calcNakshatra(moonSid);

      // I Ching tier pour ce jour
      const ichDay  = calcIChing(bd, ds);
      const tierStr = getHexTier(ichDay.hexNum).tier;

      // Mercure rétro
      const mercSt  = getMercuryStatus(d);
      const isRetro = mercSt.phase?.toLowerCase().includes('retro') ?? false;

      // Rétrogrades planétaires actifs
      const retros    = getPlanetaryRetrogrades(d);
      const retroCount = retros.filter(r => r.points < 0).length;

      // VoC
      const vocResult = getVoidOfCourseMoon(ds);
      const vocActive = vocResult?.isVoC ?? false;

      return buildPSIVector({
        pd:            pdVal,
        pm:            pmVal,
        py:            pyVal,
        moonPhase:     moonPhaseIdx,
        nakshatraId:   nak.id,
        ichingTier:    tierStr,
        changingLine:  ichDay.changing,
        mercuryRetro:  isRetro,
        retroCount,
        pinnaclePhase: getPinnaclePhase(d),
        pyMonth:       d.getMonth() + 1,
        vocActive,
        ...(natalReturnLongs && todayLongs ? {
          saturnIntensity:  interpolateReturnIntensity(natalReturnLongs.saturn,    todayLongs.saturn,    'saturn',    (d.getTime() - today.getTime()) / 86400000),
          jupiterIntensity: interpolateReturnIntensity(natalReturnLongs.jupiter,   todayLongs.jupiter,   'jupiter',   (d.getTime() - today.getTime()) / 86400000),
          nodeIntensity:    interpolateReturnIntensity(natalReturnLongs.northNode, todayLongs.northNode, 'northNode', (d.getTime() - today.getTime()) / 86400000),
        } : {}),
        ...(natalMoonSidForPSI > 0 ? {
          dashaAntarIndex: getDashaAntarLordIndex(natalMoonSidForPSI, birthDate, d),
        } : {}),
        ...(() => {
          const scores = calcPSITransitScores((d.getTime() - today.getTime()) / 86400000);
          return scores ? {
            transitBeneficScore: scores.beneficScore,
            transitTenseScore:   scores.tenseScore,
          } : {};
        })(),
      });
    };

    // Callback getScore : score passé via calcDayPreview
    const transitBonus = estimateSlowTransitBonus(data.astro);
    const getScore = (d: Date): number | null => {
      try {
        const ds = dateToStr(d);
        return calcDayPreview(bd, num, data.cz, ds, transitBonus).score;
      } catch { return null; }
    };

    return calcPSI(today, buildVector, 365, 365, getScore);
  } catch (e) {
    console.error('PSI bridge error:', e);
    return null;
  }
}

// ═══ Phase 3a — buildYearPreviews ═══
// Calcule les 365 DayPreviews de l'année en cours + applySoftShiftBlend.
// Mutualisé : ConvergenceTab, CalendarTab, ProfileTab, LectureTab utilisaient
// chacun leur propre boucle 12 mois + soft-shift. Maintenant calculé une seule fois.
export function buildYearPreviews(
  bd: string,
  num: NumerologyProfile,
  cz: ChineseZodiac,
  astro: AstroChart | null,
  ctxMult: number,
  dashaMult: number,
  shadowBaseSignal: number,
  bt?: string,
): DayPreview[] | null {
  if (!bd) return null;
  try {
    const tb = estimateSlowTransitBonus(astro);
    const tYear = new Date().getFullYear();
    const allPreviews: DayPreview[] = [];
    for (let m = 1; m <= 12; m++) {
      const mp = calcMonthPreviews(
        bd, num, cz, tYear, m, tb,
        astro ?? null, ctxMult, dashaMult, shadowBaseSignal, bt,
      );
      allPreviews.push(...mp.map(p => ({ ...p })));  // clone pour éviter mutation cache
    }
    applySoftShiftBlend(allPreviews);
    return allPreviews;
  } catch {
    return null;
  }
}

// Re-export DayPreview pour les composants
export type { DayPreview } from './convergence';

// ═══════════════════════════════════════════════════════
// 5. buildProfileData — Phase 3b : extractions ProfileTab
// ═══════════════════════════════════════════════════════

/** Résultat pré-calculé pour ProfileTab — toutes les données de profil. */
export interface ProfileData {
  // Numérologie fondamentale
  incl: InclusionDisplay | null;
  birthCardNum: number;
  birthCard: MajorArcana;
  pinnacles: Reduced[];
  challenges: Reduced[];
  activePinnIdx: number;
  pinnacleAges: { start: number; end: number }[];

  // Yi King natal
  natal: IChingReading;
  natalProf: HexProfile;

  // Dual Life Path
  lpHoriz: Reduced;
  hasMasterLP: boolean;
  lpDisplay: string;
  lpMain: Reduced;

  // Master numbers
  masterList: [string, Reduced][];

  // Lo Shu
  lsStrong: number[];
  lsMissing: number[];

  // BaZi natal (peut être null si erreur)
  natalBazi: DayMasterDailyResult | null;
  peachBlossom: PeachBlossomResult | null;

  // Na Yin & Changsheng
  nayin: NaYinResult | null;
  changsheng: ChangshengResult | null;

  // Four Pillars (conditionnel à bt)
  fourPillars: FourPillars | null;

  // Luck Pillars (array for easier iteration in components)
  luckPillars: LuckPillar[] | null;

  // Natal Moon (conditionnel à astro)
  natalMoon: NatalMoon | null;

  // Karmic Mission (conditionnel à lunarNodes)
  karmicSouthNode: SouthNodeReading | null;
  karmicMission: KarmicMissionReading | null;
  karmicTension: string | null;
  nodeSouth?: SouthNodeReading;  // Alias for display component
  nodeNorth?: KarmicMissionReading;  // Alias for display component

  // Tarot & Annual
  tarot?: { arcane: string; name: string; desc: string } | null;
  civilYear?: number;
  civilYearCycle?: number;
  personalYearNumber?: number;

  // Lo Shu numerology
  loShuNumbers?: number[] | null;

  // Numerology cycles
  nc_annual?: number;
  nc_month?: number;
  nc_day?: number;

  // Yi Jing
  iching?: IChingReading | null;

  // Personal Year
  personalYearVal: number;

  // Personalization radar
  personalWeights: PersonalWeights | null;
  radarData: RadarPillar[] | null;
}

export function buildProfileData(
  data: SoulData,
  bd: string,
  bt?: string,
  gender: 'M' | 'F' = 'M',
  fn: string = '',
): ProfileData {
  const { num, astro, cz, iching: ichingDay } = data;
  const birthDate = new Date(bd + 'T12:00:00');

  // ── Inclusion numérologique ──
  const inclName = num.full || fn;
  const incl: InclusionDisplay | null = inclName.trim().length > 2 ? calcInclusionDisplay(inclName) : null;

  // ── Carte Natale Tarot ──
  const birthCardNum = calcBirthCard(bd);
  const birthCard = getArcana(birthCardNum);

  // ── Pinnacles & Challenges ──
  const pinnacles = calcPinnacles(bd);
  const challenges = calcChallenges(bd);
  const _pinnToday = new Date().toISOString().split('T')[0];
  const activePinnIdx = getActivePinnacleIdx(bd, _pinnToday, num.lp);
  const _lpS = num.lp.v > 9 ? (() => { let v = num.lp.v; while (v > 9) v = [...String(v)].map(Number).reduce((s, d) => s + d, 0); return v; })() : num.lp.v;
  const _p1End = 36 - _lpS;
  const pinnacleAges = [
    { start: 0,          end: _p1End },
    { start: _p1End + 1, end: _p1End + 9 },
    { start: _p1End + 10, end: _p1End + 18 },
    { start: _p1End + 19, end: 99 },
  ];

  // ── Yi King natal ──
  const natal = calcNatalIChing(bd);
  const natalProf = getHexProfile(natal.hexNum);

  // ── Dual Life Path ──
  const lpHoriz = calcLifePathHorizontal(bd);
  const hasMasterLP = !!(lpHoriz.m && lpHoriz.v !== num.lp.v);
  const lpDisplay = hasMasterLP ? `${lpHoriz.v}/${num.lp.v}` : `${num.lp.v}`;
  const lpMain = hasMasterLP ? lpHoriz : num.lp;

  // ── Master numbers ──
  const masterList: [string, Reduced][] = (
    [['CdV', hasMasterLP ? lpHoriz : num.lp], ['Expr', num.expr], ['Âme', num.soul], ['Pers', num.pers], ['Mat', num.mat]] as [string, Reduced][]
  ).filter(([, x]) => x.m);

  // ── Lo Shu strong/missing ──
  const LS_ORDER = [[4,9,2],[3,5,7],[8,1,6]];
  const lsStrong: number[] = [];
  const lsMissing: number[] = [];
  LS_ORDER.forEach((row, ri) => row.forEach((n, ci) => {
    if (num.ls.grid[ri][ci] > 0) lsStrong.push(n);
    else lsMissing.push(n);
  }));

  // ── BaZi natal + Peach Blossom (calculé UNE SEULE FOIS) ──
  let natalBazi: DayMasterDailyResult | null = null;
  let peachBlossom: PeachBlossomResult | null = null;
  try {
    natalBazi = calcBaZiDaily(birthDate, birthDate, 50);
    peachBlossom = getPeachBlossom(birthDate, birthDate);
  } catch { /* silent */ }

  // ── Na Yin & Changsheng (calculé UNE SEULE FOIS — élimine le duplicata Synthèse) ──
  let nayin: NaYinResult | null = null;
  let changsheng: ChangshengResult | null = null;
  try {
    nayin = getNaYin(birthDate);
    changsheng = getChangsheng(birthDate, birthDate);
  } catch { /* silent */ }

  // ── Four Pillars (conditionnel à bt) ──
  let fourPillars: FourPillars | null = null;
  if (bt) {
    try {
      const hour = parseInt(bt.split(':')[0]);
      if (!isNaN(hour)) fourPillars = calcFourPillars(birthDate, hour);
    } catch { /* silent */ }
  }

  // ── Luck Pillars ──
  let luckPillarsResult: LuckPillarResult | null = null;
  try {
    luckPillarsResult = calculateLuckPillars(birthDate, gender);
  } catch { /* silent */ }

  // ── Natal Moon ──
  let natalMoon: NatalMoon | null = null;
  try {
    if (astro) natalMoon = getNatalMoon(astro.b3.moon);
  } catch { /* silent */ }

  // ── Karmic Mission ──
  // FIX: Calculer les nœuds natals DIRECTEMENT à partir de bd, sans dépendre de conv.lunarNodes
  // (conv.lunarNodes peut être null si le calcul de convergence échoue)
  let karmicSouthNode: SouthNodeReading | null = null;
  let karmicMission: KarmicMissionReading | null = null;
  let karmicTension: string | null = null;
  try {
    // Essayer d'abord via conv.lunarNodes (déjà calculé)
    let nnSign: string | null = null;
    if (data.conv.lunarNodes) {
      nnSign = data.conv.lunarNodes.natal.northNode.sign;
    } else {
      // Fallback : calculer les nœuds natals directement
      const natalNodes = calcLunarNodes(bd);
      nnSign = natalNodes.northNode.sign;
    }
    if (nnSign) {
      const southReading = getSouthNode(nnSign as ZodiacSign);
      // FIX: Enrichir avec zodiacSign et theme (attendus par AstroSpiritSection)
      karmicSouthNode = { ...southReading, zodiacSign: southReading.sign, theme: southReading.maitrise };
      const missionReading = generateKarmicMission(nnSign as ZodiacSign, num.lp.v, num.soul.v);
      karmicMission = { ...missionReading, zodiacSign: nnSign, theme: missionReading.northNode };
      karmicTension = detectKarmicTension(nnSign as ZodiacSign, num.lp.v, num.soul.v);
    }
  } catch { /* silent */ }

  // ── Personal Year ──
  let personalYearVal = 0;
  try { personalYearVal = calcPersonalYear(bd, new Date().getFullYear()).v; } catch { /* silent */ }

  // ── FIX: Cycles personnels (Vibrations Cycliques) ──
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  let nc_annual: number | undefined;
  let nc_month: number | undefined;
  let nc_day: number | undefined;
  try {
    nc_annual = calcPersonalYear(bd, now.getFullYear()).v;
    nc_month = calcPersonalMonth(bd, now.getFullYear(), now.getMonth() + 1).v;
    nc_day = calcPersonalDay(bd, todayStr).v;
  } catch { /* silent */ }

  // ── FIX: Carte Annuelle data ──
  const civilYear = now.getFullYear();
  const universalYear = [...('' + civilYear)].map(Number).reduce((s, d) => s + d, 0);
  const civilYearCycle = universalYear > 9 ? [...('' + universalYear)].map(Number).reduce((s, d) => s + d, 0) : universalYear;
  const personalYearNumber = personalYearVal;

  // ── Personalization radar ──
  const personalWeights = loadPersonalWeights();
  const radarData = personalWeights && personalWeights.isActive && personalWeights.blendPercent >= 50
    ? getRadarData(personalWeights)
    : null;

  return {
    incl, birthCardNum, birthCard,
    pinnacles, challenges, activePinnIdx, pinnacleAges,
    natal, natalProf,
    lpHoriz, hasMasterLP, lpDisplay, lpMain,
    masterList, lsStrong, lsMissing,
    loShuNumbers: lsStrong,  // FIX: alias pour NumerologySection
    natalBazi, peachBlossom,
    nayin, changsheng,
    fourPillars, luckPillars: luckPillarsResult ? luckPillarsResult.pillars : null,
    natalMoon,
    karmicSouthNode, karmicMission, karmicTension,
    nodeSouth: karmicSouthNode ?? undefined,   // FIX: alias pour AstroSpiritSection
    nodeNorth: karmicMission ?? undefined,     // FIX: alias pour AstroSpiritSection
    personalYearVal,
    nc_annual, nc_month, nc_day,  // FIX: Vibrations Cycliques
    civilYear, civilYearCycle, personalYearNumber,  // FIX: Carte Annuelle
    iching: ichingDay,  // FIX: Yi King du jour pour SynthesisSection
    personalWeights, radarData,
  };
}
