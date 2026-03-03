import { useState, useMemo, useCallback, useEffect } from 'react';
import { calcNumerology, calcPersonalYear, calcPersonalMonth, calcPersonalDay, reduce, type NumerologyProfile } from './engines/numerology';
import { calcAstro, type AstroChart, findCity, getPlanetLongitudeForDate } from './engines/astrology';
import { calcChineseZodiac, type ChineseZodiac } from './engines/chinese-zodiac';
import { calcIChing, getHexTier, type IChingReading } from './engines/iching';
import { calcConvergence, clearRarityCache, calcDayPreview, estimateSlowTransitBonus, type ConvergenceResult } from './engines/convergence';
import { calculateLuckPillars, type LuckPillarResult } from './engines/bazi';
import { generateStrategicReading } from './engines/strategic-reading';
import { getRetroSchedule, getEclipseList, getMercuryStatus, getMoonPhase, getVoidOfCourseMoon, getPlanetaryRetroScore, getPlanetaryRetrogrades } from './engines/moon';
import { interpolateReturnIntensity, extractNatalReturnLongs, planetPosToLong } from './engines/returns'; // A1.1 PSI + V5.3
import {
  calcMomentum, calcForecast, calcPastAnalysis, calcPresentContext,
  detectArc, generateTemporalNarrative,
  calcPSI, buildPSIVector,
  type PinnacleInfo, type MomentumResult, type ForecastResult,
  type PastAnalysis, type PresentContext, type TemporalNarrative, type ArcName,
  type PSIResult, type PSIVector,
} from './engines/temporal';
import { calcNakshatra, getAyanamsa } from './engines/nakshatras';
import { getDashaAntarLordIndex, calcCurrentDasha, type CurrentDasha } from './engines/vimshottari'; // V5.1+V5.2
import { useSyncDailyVector } from './engines/useSyncDailyVector'; // V8 Option C
import ConvergenceTab from './components/ConvergenceTab';
import ProfileTab from './components/ProfileTab';
import AstroTab from './components/AstroTab';
import IChingTab from './components/IChingTab';
import LectureTab from './components/LectureTab';
import KarmaTab from './components/KarmaTab';
import CalendarTab from './components/CalendarTab';
import TemporalTab, { type TemporalData } from './components/TemporalTab';
import BondTab from './components/BondTab';
import OracleTab from './components/OracleTab';
import { Cd, P } from './components/ui';

// Inject custom scrollbar for tabs (once)
if (typeof document !== 'undefined' && !document.getElementById('sp-tabs-scroll')) {
  const s = document.createElement('style');
  s.id = 'sp-tabs-scroll';
  s.textContent = `
    .sp-tabs-bar::-webkit-scrollbar { height: 6px; }
    .sp-tabs-bar::-webkit-scrollbar-track { background: #18181b; border-radius: 3px; }
    .sp-tabs-bar::-webkit-scrollbar-thumb { background: #FFD70066; border-radius: 3px; min-width: 40px; }
    .sp-tabs-bar::-webkit-scrollbar-thumb:hover { background: #FFD700aa; }
    .sp-tabs-bar { scrollbar-width: thin; scrollbar-color: #FFD70066 #18181b; }
  `;
  document.head.appendChild(s);
}

// Dynamic today — never hardcode again!
function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface SoulData {
  num: NumerologyProfile;
  astro: AstroChart | null;
  cz: ChineseZodiac;
  iching: IChingReading;
  conv: ConvergenceResult;
  luckPillars: LuckPillarResult;
  dasha?: CurrentDasha;  // V5.2 — Vimshottari courant (Maha+Antar+Pratyantar)
}

const tabs = [
  { id: 'convergence', l: 'Pilotage',    i: '⭐' },
  { id: 'calendar',    l: 'Calendrier',  i: '📅' },
  { id: 'profile',     l: 'Profil',      i: '✦' },
  { id: 'bond',        l: 'Affinité',    i: '✨' },
  { id: 'oracle',      l: 'Oracle',      i: '🔮' },
  { id: 'astro',       l: 'Astro',       i: '🌙' },
  { id: 'iching',      l: 'Yi King',     i: '☰' },
  { id: 'lecture',      l: 'Lecture',     i: '📖' },
  { id: 'temporal',     l: 'Dynamique',   i: '🌀' },
  { id: 'karma',       l: 'Karma',       i: '☸' },
];

export default function App() {
  const [fn, setFn] = useState('');
  const [mn, setMn] = useState('');
  const [ln, setLn] = useState('');
  const [bd, setBd] = useState('');
  const [bt, setBt] = useState('');
  const [bp, setBp] = useState('');
  const [gn, setGn] = useState<'M' | 'F'>('M');
  const [tz, setTz] = useState(Math.round(-new Date().getTimezoneOffset() / 60));
  const [tab, setTab] = useState('convergence');
  const [lock, setLock] = useState({ fn: '', mn: '', ln: '', bd: '', bt: '', bp: '', gn: 'M' as 'M' | 'F', tz: Math.round(-new Date().getTimezoneOffset() / 60) });

  const dirty = fn !== lock.fn || mn !== lock.mn || ln !== lock.ln || bd !== lock.bd || bt !== lock.bt || bp !== lock.bp || gn !== lock.gn || tz !== lock.tz;
  const canCalc = !!(fn.trim() && ln.trim() && bd);

  const [narr, setNarr] = useState('');
  const [narrLoad, setNarrLoad] = useState(false);

  // Load Puter.js (free GPT-4o-mini proxy)
  useEffect(() => {
    if ((window as any).puter) return;
    const s = document.createElement('script');
    s.src = 'https://js.puter.com/v2/';
    document.head.appendChild(s);
  }, []);

  const doVal = () => { clearRarityCache(); setLock({ fn, mn, ln, bd, bt, bp, gn, tz }); setTab('convergence'); setNarr(''); };

  const data = useMemo<SoulData | null>(() => {
    const L = lock;
    if (!L.fn || !L.ln || !L.bd) return null;
    try {
      const today = getToday();
      const num = calcNumerology(L.fn, L.mn, L.ln, L.bd, today);
      const astro = calcAstro(L.bd, L.bt, L.bp, L.tz, today);
      const cz = calcChineseZodiac(L.bd);
      const iching = calcIChing(L.bd, today);
      const conv = calcConvergence(num, astro, cz, iching, L.bd, L.bt || undefined); // V9 Sprint 1: bt pour DashaCertainty
      const luckPillars = calculateLuckPillars(new Date(L.bd + 'T00:00:00'), L.gn);

      // V5.2 — Vimshottari courant (Maha+Antar+Pratyantar) — useMemo([lock]) = dépend de bd uniquement
      let dasha: CurrentDasha | undefined;
      try {
        const birthD4D    = new Date(L.bd + 'T12:00:00');
        const natalM4D    = getMoonPhase(birthD4D);
        const natalAyan4D = getAyanamsa(birthD4D.getFullYear());
        const natalSid4D  = ((natalM4D.longitudeTropical - natalAyan4D) % 360 + 360) % 360;
        dasha = calcCurrentDasha(natalSid4D, birthD4D, new Date());
      } catch { /* silent — dasha reste undefined si AstroChart absent */ }

      return { num, astro, cz, iching, conv, luckPillars, dasha };
    } catch (e) { console.error(e); return null; }
  }, [lock]);

  // V8 Option C — Collecte silencieuse quotidienne (fire-and-forget)
  useSyncDailyVector(data, lock.bd);

  // ── Bridge Temporal (V2.9.2) ──
  const temporal = useMemo<TemporalData | null>(() => {
    if (!data) return null;
    try {
      const today = new Date();
      const birthDate = new Date(lock.bd + 'T00:00:00');
      const { num, cz, conv } = data;

      // Convertir pinnacles Reduced[] → PinnacleInfo[]
      const lpSingle = num.lp.v > 9 ? reduce(num.lp.v, false).v : num.lp.v;
      const p1End = 36 - lpSingle;
      const pinnacles: PinnacleInfo[] = [
        { number: num.pinnacles[0].v, startAge: 0, endAge: p1End },
        { number: num.pinnacles[1].v, startAge: p1End, endAge: p1End + 9 },
        { number: num.pinnacles[2].v, startAge: p1End + 9, endAge: p1End + 18 },
        { number: num.pinnacles[3].v, startAge: p1End + 18, endAge: 99 },
      ];

      // Wrapper getScore : Date → number (score léger via calcDayPreview)
      const transitBonus = estimateSlowTransitBonus(data.astro);
      const getScore = (d: Date): number => {
        const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return calcDayPreview(lock.bd, num, cz, ds, transitBonus).score;
      };

      // Wrapper calcPY / calcPM
      const calcPY = (d: Date): number => calcPersonalYear(lock.bd, d.getFullYear()).v;
      const calcPM = (d: Date): number => calcPersonalMonth(lock.bd, d.getFullYear(), d.getMonth() + 1).v;

      // Données moon.ts
      const retroPeriods = getRetroSchedule();
      const eclipses = getEclipseList();
      const mercuryStatus = getMercuryStatus(today);
      const planetaryRetros = getPlanetaryRetrogrades(today);

      // Adapter mercury au format temporal.ts
      const mercuryForTemporal = { phase: mercuryStatus.phase, score: mercuryStatus.points, label: mercuryStatus.label };
      const retrosForTemporal = planetaryRetros.map(r => ({ planet: r.planet, score: r.points }));

      // South node
      const southNodeSign = conv.lunarNodes?.natal?.northNode?.sign
        ? conv.lunarNodes.natal.southNode.sign
        : null;

      // Calculs temporels
      const momentum = calcMomentum(getScore, today);
      const forecast = calcForecast(today, getScore, retroPeriods, eclipses, calcPY, birthDate, pinnacles);
      const past = calcPastAnalysis(today, birthDate, pinnacles, calcPY, num.kl, southNodeSign);
      const present = calcPresentContext(today, birthDate, pinnacles, calcPY, calcPM, mercuryForTemporal, retrosForTemporal);
      const arc = detectArc(past, present, momentum, forecast);
      const narrative = generateTemporalNarrative(past, present, momentum, forecast);

      return { momentum, forecast, past, present, arc, narrative };
    } catch (e) { console.error('Temporal bridge error:', e); return null; }
  }, [data, lock.bd]);

  // ── PSI — Résonance Périodique (V4.9 Sprint E2) ──
  // useMemo séparé : zéro modification de temporal ni de TemporalData.
  // P1.1 : Lazy load — calcul uniquement si l'onglet convergence ou temporal est actif
  const psiData = useMemo<PSIResult | null>(() => {
    if (!data) return null;
    // P1.1 : 730 appels buildVector — skip si PSI non visible
    if (tab !== 'convergence' && tab !== 'temporal') return null;
    try {
      const { num, iching } = data;
      const today = new Date();

      // Pinnacle phase du jour — réutilise la même logique que temporal
      const birthDate = new Date(lock.bd + 'T00:00:00');
      const lpSingle = num.lp.v > 9 ? reduce(num.lp.v, false).v : num.lp.v;
      const p1End = 36 - lpSingle;
      const pinnacles: PinnacleInfo[] = [
        { number: num.pinnacles[0].v, startAge: 0,        endAge: p1End },
        { number: num.pinnacles[1].v, startAge: p1End,    endAge: p1End + 9 },
        { number: num.pinnacles[2].v, startAge: p1End + 9, endAge: p1End + 18 },
        { number: num.pinnacles[3].v, startAge: p1End + 18, endAge: 99 },
      ];

      // Helper : phase Pinnacle pour une date donnée
      const getPinnaclePhase = (d: Date): 'early' | 'middle' | 'late' => {
        const age = d.getFullYear() - birthDate.getFullYear();
        const cur = pinnacles.find(p => age >= p.startAge && age < p.endAge)
          || pinnacles[pinnacles.length - 1];
        const yearsIn = cur.endAge - cur.startAge;
        const yearsPassed = age - cur.startAge;
        if (yearsPassed <= 2)              return 'early';
        if (yearsIn - yearsPassed <= 2)    return 'late';
        return 'middle';
      };

      // Callback buildVector(date) → PSIVector
      // Chaque appel est léger : numerology + moon fonctions pures
      // A1.1 : longitudes actuelles pré-calculées ONCE (interpolation dans la boucle — zéro Meeus)
      const natalReturnLongs = data.astro ? extractNatalReturnLongs(data.astro) : null;
      const todayLongs = natalReturnLongs ? {
        saturn:    getPlanetLongitudeForDate('saturn',    today),
        jupiter:   getPlanetLongitudeForDate('jupiter',   today),
        northNode: getPlanetLongitudeForDate('northNode', today),
      } : null;

      // V5.1 : Lune natale sidérale pré-calculée ONCE pour getDashaAntarLordIndex
      let natalMoonSidForPSI = 0;
      try {
        const birthD4PSI    = new Date(lock.bd + 'T12:00:00');
        const natalM4PSI    = getMoonPhase(birthD4PSI);
        const natalAyan4PSI = getAyanamsa(birthD4PSI.getFullYear());
        natalMoonSidForPSI  = ((natalM4PSI.longitudeTropical - natalAyan4PSI) % 360 + 360) % 360;
      } catch { /* garde silencieux */ }

      // V5.3 : Transits personnalisés PSI — pré-calcul ONCE hors boucle
      // Longitudes natales extraites depuis astro (6 points : sun/moon/mercury/venus/mars/asc)
      // 5 longitudes transit aujourd'hui (jupiter/saturn/uranus/neptune/pluto) — 5 appels Meeus
      // Interpolation linéaire dans la boucle → zéro Meeus supplémentaire
      const PSI_NATAL_TARGETS = ['sun', 'moon', 'mercury', 'venus', 'mars'];
      const psiNatalLongs: Record<string, number> | null = data.astro ? (() => {
        const r: Record<string, number> = {};
        for (const pl of data.astro.pl) {
          if (PSI_NATAL_TARGETS.includes(pl.k)) r[pl.k] = planetPosToLong(pl.s, pl.d);
        }
        r['asc'] = planetPosToLong(data.astro.b3.asc, data.astro.ad); // ASC
        return Object.keys(r).length >= 3 ? r : null;
      })() : null;

      const psiTransitTodayLongs: Record<string, number> | null = psiNatalLongs ? {
        jupiter: getPlanetLongitudeForDate('jupiter', today),
        saturn:  getPlanetLongitudeForDate('saturn',  today),
        uranus:  getPlanetLongitudeForDate('uranus',  today),
        neptune: getPlanetLongitudeForDate('neptune', today),
        pluto:   getPlanetLongitudeForDate('pluto',   today),
      } : null;

      // Vitesses angulaires moyennes °/jour (interpolation linéaire — suffisant pour PSI)
      const PSI_TRANSIT_SPEEDS: Record<string, number> = {
        jupiter: 0.0831, saturn: 0.0334, uranus: 0.0119, neptune: 0.0059, pluto: 0.0040,
      };

      // Amplitude PSI : +1=bénéfique, -1=tendu, 0=skip pour une combinaison planète×aspect
      // Jupiter aspects harmoniques = bénéfique · Saturne aspects durs = tendu · etc.
      const PSI_TRANSIT_TYPE: Record<string, Record<string, number>> = {
        // +1 bénéfique, -1 tendu, 0 neutre
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
      const psiAngDist = (a: number, b: number): number => {
        const d = Math.abs(((a - b) % 360 + 360) % 360);
        return d > 180 ? 360 - d : d;
      };
      const psiGaussian = (orb: number, sigma: number) => Math.exp(-(orb * orb) / (2 * sigma * sigma));

      // calcPSITransitScores(deltaJours) → { beneficScore: 0-1, tenseScore: 0-1 }
      const calcPSITransitScores = (deltaJours: number): { beneficScore: number; tenseScore: number } | null => {
        if (!psiNatalLongs || !psiTransitTodayLongs) return null;
        let beneficSum = 0, tenseSum = 0, beneficMax = 0, tenseMax = 0;
        for (const [planet, todayLong] of Object.entries(psiTransitTodayLongs)) {
          const speed    = PSI_TRANSIT_SPEEDS[planet] ?? 0;
          const transitL = ((todayLong + speed * deltaJours) % 360 + 360) % 360;
          const ampMap   = PSI_TRANSIT_TYPE[planet];
          if (!ampMap) continue;
          for (const [natalKey, natalLong] of Object.entries(psiNatalLongs)) {
            const dist = psiAngDist(transitL, natalLong);
            for (const asp of PSI_ASPECT_ANGLES) {
              const orb = Math.abs(dist - asp.angle);
              if (orb > asp.orb) continue;
              const intensity = psiGaussian(orb, asp.orb / 2.5);
              const type = ampMap[asp.name] ?? 0;
              if (type > 0) { beneficSum += intensity; beneficMax++; }
              if (type < 0) { tenseSum  += intensity; tenseMax++;  }
            }
          }
        }
        // Normaliser : diviser par nb de combinaisons possibles (30 transit×natal×asp max actifs)
        const norm = 30;
        return {
          beneficScore: Math.min(1, beneficSum / norm),
          tenseScore:   Math.min(1, tenseSum  / norm),
        };
      };

      const buildVector = (d: Date): PSIVector => {
        const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        // Numérologie
        const pdVal = calcPersonalDay(lock.bd, ds).v;
        const pmVal = calcPersonalMonth(lock.bd, d.getFullYear(), d.getMonth() + 1).v;
        const pyVal = calcPersonalYear(lock.bd, d.getFullYear()).v;

        // Lune — phase (0-7) depuis longitudeTropical
        const moonP = getMoonPhase(d);
        const moonPhaseIdx = Math.floor(((moonP.phase % 360) + 360) % 360 / 45); // 8 secteurs → 0-7

        // Nakshatra — id 1-27
        const ayanamsa = getAyanamsa(d.getFullYear());
        const moonSid  = ((moonP.longitudeTropical - ayanamsa) % 360 + 360) % 360;
        const nak      = calcNakshatra(moonSid);

        // I Ching tier pour ce jour
        const ichDay  = calcIChing(lock.bd, ds);
        const tierStr = getHexTier(ichDay.hexNum).tier; // 'A'-'E'

        // Mercure rétro
        const mercSt  = getMercuryStatus(d);
        const isRetro = mercSt.phase?.toLowerCase().includes('retro') ?? false;

        // Rétrogrades planétaires actifs
        const retros    = getPlanetaryRetrogrades(d);
        const retroCount = retros.filter((r: any) => r.points < 0).length;

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
          // A1.1 : intensités retours planétaires — interpolation linéaire, zéro appel Meeus
          ...(natalReturnLongs && todayLongs ? {
            saturnIntensity:  interpolateReturnIntensity(natalReturnLongs.saturn,    todayLongs.saturn,    'saturn',    (d.getTime() - today.getTime()) / 86400000),
            jupiterIntensity: interpolateReturnIntensity(natalReturnLongs.jupiter,   todayLongs.jupiter,   'jupiter',   (d.getTime() - today.getTime()) / 86400000),
            nodeIntensity:    interpolateReturnIntensity(natalReturnLongs.northNode, todayLongs.northNode, 'northNode', (d.getTime() - today.getTime()) / 86400000),
          } : {}),
          // V5.1 : Antardasha courant — O(1) lookup, stable sur semaines/mois
          ...(natalMoonSidForPSI > 0 ? {
            dashaAntarIndex: getDashaAntarLordIndex(natalMoonSidForPSI, birthDate, d),
          } : {}),
          // V5.3 : Transits personnalisés — interpolation linéaire, zéro Meeus en boucle
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
          const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          return calcDayPreview(lock.bd, num, data.cz, ds, transitBonus).score;
        } catch { return null; }
      };

      return calcPSI(today, buildVector, 365, 365, getScore);
    } catch (e) {
      console.error('PSI bridge error:', e);
      return null;
    }
  }, [data, lock.bd, tab]);

  const genNarr = useCallback(async () => {
    if (!data) return;
    setNarrLoad(true);
    setNarr('');

    // Générer la lecture structurée comme contexte pour l'IA
    const birthHour = lock.bt ? parseInt(lock.bt.split(':')[0]) : undefined;
    const reading = generateStrategicReading(data, lock.bd, undefined, 'M', birthHour);

    // Sérialiser les données clés pour le prompt structuré
    const pastInsights = reading.past.insights.map(i => `- ${i.icon} ${i.text}`).join('\n');
    const presentInsights = reading.present.insights.map(i => `- ${i.icon} ${i.text}`).join('\n');
    const futureInsights = reading.future.insights.map(i => `- ${i.icon} ${i.text}`).join('\n');
    const crossingsText = reading.crossings.map(c => `- ${c.icon} ${c.theme} (${c.strength} systèmes: ${c.systems.join(', ')}): ${c.description}`).join('\n');
    const actionsText = reading.actionPlan.map((a, i) => `${i + 1}. ${a.action} — ${a.why}`).join('\n');
    const microText = reading.microDetails?.map(m => `- ${m.text} [${m.sources.join('+')}]`).join('\n') || '';
    const windowText = reading.majorWindow ? `FENÊTRE: ${reading.majorWindow.narrative}` : '';

    // ═══ PROMPT V2.6 — 10 ÉTAPES NARRATIVES (consensus Grok×Gemini×GPT) ═══
    // Méthode : 10 phrases ordonnées, chaque étape croise 2-3 systèmes minimum
    // Ton : "Dark Luxe" — chirurgical, souverain, business. Pas de new-age.
    // Ratio : 70% plausible + 30% spécifique = cold reading optimal (Grok)

    let pr = `Tu es un conseiller stratégique d'élite. Tu lis les cycles de vie comme un analyste lit un bilan : avec précision, sans complaisance, orienté action.\n\n`;
    pr += `STYLE: Tutoiement. Phrases courtes. Vocabulaire business (flux, trajectoire, pivot, levier, audit). Zéro jargon ésotérique. Zéro "l'univers te dit". Tu parles comme un mentor CEO, pas un astrologue.\n\n`;

    pr += `PRÉNOM: ${lock.fn}\n`;
    pr += `PORTRAIT: ${reading.portrait}\n`;
    pr += `VERDICT: ${reading.todayVerdict}\n`;
    pr += `${windowText}\n\n`;

    pr += `═══ DONNÉES BRUTES ═══\n`;
    pr += `PASSÉ (${reading.past.period}):\n${pastInsights}\n\n`;
    pr += `PRÉSENT (${reading.present.period}):\n${presentInsights}\n\n`;
    pr += `FUTUR (${reading.future.period}):\n${futureInsights}\n\n`;
    pr += `CONVERGENCES (${reading.crossings.length}):\n${crossingsText}\n\n`;
    pr += `MICRO-DÉTAILS:\n${microText}\n\n`;
    pr += `PLAN D'ACTION:\n${actionsText}\n\n`;

    pr += `═══ CONSIGNE — NARRATION EN 10 ÉTAPES (600 mots max) ═══\n`;
    pr += `Écris une narration fluide et continue. Chaque étape = 2-3 phrases. Utilise les données brutes, ne les répète pas mot pour mot — reformule avec ta voix.\n\n`;

    pr += `1. 🔥 PARADOXE — Ouvre avec la tension centrale du profil. Croise Chemin de Vie + Expression + Âme. "Tu es à la fois X et Y — cette dualité est ton arme."\n`;
    pr += `2. 🎯 MISSION — Sa raison d'être. Croise CdV + Yi King natal + signe solaire. Pas "ta mission spirituelle" mais "ton positionnement stratégique de fond."\n`;
    pr += `3. 📚 LEÇONS — Ce qu'il évite et qui le rattrape. Leçons karmiques + Lo Shu + Challenge actif. Ton direct, pas moralisateur.\n`;
    pr += `4. 🌱 FONDATION (0-25 ans) — Pinnacle 1 + contexte enfance/jeunesse. Ce qui a été semé. 1-2 phrases max.\n`;
    pr += `5. 🔥 ÉMERGENCE (25-35) — Pinnacle 2 + Saturn Return + mutations. Le premier vrai test.\n`;
    pr += `6. 🏔️ POUVOIR (35-45) — Pinnacle 3 + montée en puissance. Ce qui a été construit.\n`;
    pr += `7. 🌳 MATURITÉ (45+) — Pinnacle 4 + nombre de Maturité. Synthèse de tout. Si <45 ans : ce vers quoi il évolue.\n`;
    pr += `8. ⚡ AUJOURD'HUI — Le plus important. Croise TOUTES les convergences actives. Quand plusieurs systèmes disent la même chose, martèle-le. Intègre les micro-détails naturellement. Score, type de jour, transit lunaire, synergies.\n`;
    pr += `9. 🗺️ DIRECTION — Prochain PY + prochain Pinnacle + Nœuds Lunaires. Pas de prédiction, mais une trajectoire claire.\n`;
    pr += `10. ✦ VERDICT FINAL — 1 phrase percutante qui résume tout. Action concrète + horizon temporel. Termine fort.\n\n`;

    pr += `RÈGLES:\n`;
    pr += `- Si une convergence montre 5+ systèmes alignés, c'est LE message du jour — insiste lourdement\n`;
    pr += `- Intègre le plan d'action dans les étapes 8-10, pas en liste séparée\n`;
    pr += `- Les micro-détails servent d'accroches "c'est exactement moi" — glisse-les aux étapes 1, 3, 8\n`;
    pr += `- Pas de titres numérotés visibles — la narration doit couler naturellement avec juste les emojis comme repères\n`;
    pr += `- Termine par une phrase lumineuse et souveraine, pas une formule de politesse`;

    try {
      const puter = (window as any).puter;
      if (!puter) { setNarr('⚠ Puter.js en cours de chargement, réessaie dans 2 secondes.'); setNarrLoad(false); return; }
      const r = await puter.ai.chat(pr, { model: 'gpt-4o-mini' });
      const txt = typeof r === 'string' ? r : r?.message?.content || r?.text || JSON.stringify(r);
      setNarr(txt);
    } catch (e: any) { setNarr('⚠ Erreur: ' + e.message); }
    setNarrLoad(false);
  }, [data, lock]);

  const inp: React.CSSProperties = {
    background: P.bg, border: `1.5px solid ${P.cardBdr}`, borderRadius: 8,
    padding: '10px 12px', color: P.text, fontSize: 14, outline: 'none',
    width: '100%', boxSizing: 'border-box', fontFamily: 'inherit'
  };

  return (
    <div style={{ minHeight: '100vh', background: P.bg, color: P.text, position: 'relative' }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at 15% 10%,#1a170a,transparent 55%),radial-gradient(ellipse at 85% 90%,#0a0f1a,transparent 50%)' }} />
      <div style={{ position: 'relative', maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ fontSize: 46, fontWeight: 300, margin: 0, letterSpacing: 6, background: `linear-gradient(135deg,#e4e4e7,${P.gold} 60%,#C9A84C)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Kaironaute</h1>
          <div style={{ fontSize: 12, color: P.textMid, letterSpacing: 1, marginTop: 8, fontWeight: 400, fontStyle: 'italic' }}>Maîtrisez vos cycles. Optimisez vos décisions.</div>
          <div style={{ fontSize: 10, color: P.textDim, letterSpacing: 3, marginTop: 4, fontWeight: 500 }}>NUMÉROLOGIE · ASTROLOGIE · YI KING · ZODIAQUE CHINOIS · IA</div>
        </div>

        {/* Form */}
        <Cd sx={{ marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
            {([['Prénom', fn, setFn], ['2e Prénom', mn, setMn], ['Nom naissance', ln, setLn]] as const).map(([l, v, s]) => (
              <div key={l}>
                <label style={{ fontSize: 10, letterSpacing: 2, color: P.textDim, textTransform: 'uppercase', display: 'block', marginBottom: 4, fontWeight: 600 }}>{l}</label>
                <input value={v} onChange={e => (s as any)(e.target.value)} style={inp} />
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 10, letterSpacing: 2, color: P.textDim, textTransform: 'uppercase', display: 'block', marginBottom: 4, fontWeight: 600 }}>Date naissance</label>
              <input type="date" value={bd} onChange={e => setBd(e.target.value)} style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 10, letterSpacing: 2, color: P.textDim, textTransform: 'uppercase', display: 'block', marginBottom: 4, fontWeight: 600 }}>Heure naissance</label>
              <div style={{ display: 'flex', gap: 4 }}>
                <input type="time" value={bt} onChange={e => setBt(e.target.value)} style={{ ...inp, flex: 1, opacity: bt ? 1 : .5 }} />
                <button onClick={() => setBt(bt ? '' : '12:00')} style={{ background: bt ? P.surface : `${P.gold}15`, border: `1px solid ${bt ? P.cardBdr : P.gold + '33'}`, borderRadius: 8, padding: '0 10px', cursor: 'pointer', color: bt ? P.textDim : P.gold, fontSize: 10, fontWeight: 700 }}>?</button>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 10, letterSpacing: 2, color: P.textDim, textTransform: 'uppercase', display: 'block', marginBottom: 4, fontWeight: 600 }}>Lieu naissance</label>
              <input value={bp} onChange={e => setBp(e.target.value)} style={inp} placeholder="Ville" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto auto 1fr auto', gap: 10, marginTop: 10, alignItems: 'end' }}>

            {/* Genre */}
            <div>
              <label style={{ fontSize: 10, letterSpacing: 2, color: P.textDim, textTransform: 'uppercase', display: 'block', marginBottom: 4, fontWeight: 600 }}>Genre</label>
              <div style={{ display: 'flex', gap: 4 }}>
                {(['M', 'F'] as const).map(g => (
                  <button key={g} onClick={() => setGn(g)} style={{
                    padding: '9px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: gn === g ? 700 : 400,
                    background: gn === g ? (g === 'M' ? '#60a5fa18' : '#f472b618') : P.surface,
                    border: `1px solid ${gn === g ? (g === 'M' ? '#60a5fa50' : '#f472b650') : P.cardBdr}`,
                    color: gn === g ? (g === 'M' ? '#60a5fa' : '#f472b6') : P.textDim,
                  }}>{g === 'M' ? '♂' : '♀'}</button>
                ))}
              </div>
            </div>

            {/* UTC */}
            <div>
              <label style={{ fontSize: 10, letterSpacing: 2, color: P.textDim, textTransform: 'uppercase', display: 'block', marginBottom: 4, fontWeight: 600 }}>UTC offset</label>
              <select value={tz} onChange={e => setTz(+e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                {[-5,-4,-3,-2,-1,0,1,2,3,4,5,6,8,10,12].map(v => <option key={v} value={v}>UTC{v >= 0 ? '+' : ''}{v}</option>)}
              </select>
            </div>

            {/* Bouton Calculer */}
            <div style={{ display: 'flex', alignItems: 'end', gap: 10 }}>
              <button onClick={doVal} disabled={!canCalc || (!dirty && !!data)} style={{ padding: '10px 24px', background: canCalc && (dirty || !data) ? `linear-gradient(135deg,${P.gold},#C9A84C)` : P.surface, border: 'none', borderRadius: 8, color: canCalc && (dirty || !data) ? '#09090b' : P.textDim, fontSize: 14, fontWeight: 700, cursor: canCalc && (dirty || !data) ? 'pointer' : 'default', letterSpacing: 1, opacity: canCalc && (dirty || !data) ? 1 : .5, fontFamily: 'inherit' }}>
                {data ? '✦ Recalculer' : '✦ Calculer'}
              </button>
              {dirty && canCalc && <span style={{ fontSize: 12, color: P.gold, fontWeight: 600 }}>Modifications non validées</span>}
              {dirty && !canCalc && <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 600 }}>Prénom, Nom et Date requis</span>}
              {!dirty && data && <span style={{ fontSize: 12, color: P.green, fontWeight: 600 }}>✔ Profil calculé</span>}
            </div>

            {/* Spacer */}
            <div />
          </div>
          {bp && <div style={{ marginTop: 8, fontSize: 11, fontWeight: 600, color: findCity(bp) ? P.green : P.red }}>{findCity(bp) ? '✔ ' + bp + ' trouvé' : '✗ Ville non trouvée'}</div>}
        </Cd>

        {/* Tabs */}
        <div className="sp-tabs-bar" style={{ display: 'flex', gap: 4, marginBottom: 22, overflowX: 'auto', paddingBottom: 8 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: tab === t.id ? P.surface : 'transparent',
              border: `1px solid ${tab === t.id ? P.cardBdr : 'transparent'}`,
              borderRadius: 8, padding: '8px 10px', cursor: 'pointer',
              color: tab === t.id ? P.text : P.textDim,
              fontSize: 12, fontWeight: tab === t.id ? 700 : 400, whiteSpace: 'nowrap',
              fontFamily: 'inherit'
            }}>{t.i} {t.l}</button>
          ))}
        </div>

        {/* Content */}
        {!data && <Cd><div style={{ textAlign: 'center', color: P.textDim, padding: 28, fontSize: 14 }}>Entrez vos informations ci-dessus et cliquez ✦ Calculer</div></Cd>}
        {data && <>
          {tab === 'convergence' && <ConvergenceTab data={data} psi={psiData} bd={lock.bd} />}
          {tab === 'calendar' && <CalendarTab data={data} bd={lock.bd} />}
          {tab === 'profile' && <ProfileTab data={data} bd={lock.bd} bt={lock.bt} gender={lock.gn} />}
          {tab === 'bond' && <BondTab bd={lock.bd} />}
          {tab === 'oracle' && <OracleTab data={data} bd={lock.bd} />}
          {tab === 'astro' && <AstroTab data={data} />}
          {tab === 'iching' && <IChingTab data={data} />}
          {tab === 'lecture' && <LectureTab data={data} bd={lock.bd} narr={narr} narrLoad={narrLoad} genNarr={genNarr} />}
          {tab === 'temporal' && temporal && <TemporalTab data={temporal} psi={psiData} />}
          {tab === 'karma' && <KarmaTab data={data} />}
        </>}

        <div style={{ textAlign: 'center', marginTop: 48, fontSize: 9, color: '#27272a', letterSpacing: 3, fontWeight: 500 }}>KAIRONAUTE v4.5 © 2026</div>
      </div>
    </div>
  );
}
