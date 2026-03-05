// ══════════════════════════════════════
// ═══ CONVERGENCE SLOW — L2 — V6.0 ═══
// Step 5 split : modules lents de calcConvergence
// Contient : calcTemporalContext() + calcSlowModules() — L2 pass-by-reference Option A
// Modules : Returns, Progressions, Dasha, Solar Return, Éclipses Natales,
//           V6 Synergies R21-R27, contextMultiplier, formule finale
// ══════════════════════════════════════

import { type NumerologyProfile } from './numerology';
import { type AstroChart, getPlanetLongitudeForDate } from './astrology';
import { calcPlanetaryReturns, extractNatalReturnLongs, planetPosToLong } from './returns';
import { calcProgressions } from './progressions';
import { calcSolarReturn } from './solar-return';
import { type IChingReading } from './iching';
import { getMoonPhase, getEclipseNatalImpacts } from './moon';
import { getAyanamsa } from './nakshatras';
import { calcInteractions, buildInteractionContext } from './interactions';
import { calcCurrentDasha, calcDashaScore, composeDashaMultipliers, calcSandhiSmoothing, type CurrentDasha } from './vimshottari';
import { type SystemBreakdown, SLOW_PLANETS, type DashaCertaintyResult, type DashaCertaintyLevel } from './convergence.types';
import { type DailyModuleResult } from './convergence-daily';
import { calcTransitStellium } from './transit-stellium'; // V8.5 — P5
import { calcAshtakavarga } from './ashtakavarga'; // Sprint D4 — ASV ☉♂ migré depuis L1
import { calcJieqi }        from './jieqi';        // Sprint E3 — Jieqi 节气 L2 semi-mensuel
import { calcChandraYoga, type TransitPlanetSid } from './panchanga'; // Sprint I — Chandra Yoga L2

// ══════════════════════════════════════
// ═══ V6.0 : CONTEXTE MULTIPLICATEUR ═══
// Doctrine : Dasha/Progressions/Retours = terrain, pas couche additive.
// 60% du slowAstroDelta devient multiplicateur [0.75-1.25].
// 40% reste additif (offsetPts).
// ══════════════════════════════════════

interface TemporalContext {
  multiplier: number;
  offsetPts: number;
  label: string;
  breakdown: string[];
}

export function calcTemporalContext(slowAstroDelta: number): TemporalContext {
  const MULT_RATIO = 0.60;
  const multPortion = slowAstroDelta * MULT_RATIO;
  const offsetPts   = slowAstroDelta * (1 - MULT_RATIO);
  const rawMultiplier = 1.0 + (multPortion / 57);
  const multiplier = Math.max(0.95, Math.min(1.05, rawMultiplier)); // V6.2: 0.75-1.25→0.95-1.05 (GPT R17: non-linéarité trop forte)

  let label = 'Terrain neutre';
  if      (multiplier > 1.10) label = 'Terrain très favorable';
  else if (multiplier > 1.03) label = 'Terrain porteur';
  else if (multiplier < 0.90) label = 'Terrain restrictif';
  else if (multiplier < 0.97) label = 'Terrain de friction';

  return {
    multiplier,
    offsetPts,
    label,
    breakdown: [
      `Contexte ×${multiplier.toFixed(2)} (${label})`,
      `Offset additif cycles lents : ${offsetPts > 0 ? '+' : ''}${offsetPts.toFixed(1)} pts`,
    ],
  };
}

// ══════════════════════════════════════════════════════════════════
// ═══ DASHA CERTAINTY — V9 Sprint 1 ═══
// Gemini 3.1 Pro : sans heure de naissance, la Mahadasha peut être fausse
// si la Lune natale est proche d'une frontière de Nakshatra (chaque Nak = 13.33°)
// Résultat : score [0.85–1.00] appliqué au dashaMultiplier en L2
// ══════════════════════════════════════════════════════════════════

function calculateDashaCertainty(
  natalMoonSid: number,
  birthtimeStr: string | null
): DashaCertaintyResult {
  const NAK_SIZE = 360 / 27;                                       // 13.333°
  const nakshatraIndex  = Math.floor(natalMoonSid / NAK_SIZE);
  const positionInNak   = (natalMoonSid % NAK_SIZE) / NAK_SIZE;   // 0.0–1.0

  // Frontière ±5% : ±0.67° autour des jonctions entre Nakshatras
  const BOUNDARY_THRESHOLD = 0.05;
  const nearBoundary = positionInNak < BOUNDARY_THRESHOLD || positionInNak > (1 - BOUNDARY_THRESHOLD);

  const birthtimeKnown = !!(birthtimeStr && /^\d{1,2}:\d{2}$/.test(birthtimeStr));

  let certaintyLevel: DashaCertaintyLevel;
  let score: number;
  let warning: string | null;

  if (birthtimeKnown) {
    if (nearBoundary) {
      certaintyLevel = 'MEDIUM'; score = 0.95;
      warning = 'Lune natale en frontière de Nakshatra — Mahadasha potentiellement incertaine.';
    } else {
      certaintyLevel = 'HIGH'; score = 1.00; warning = null;
    }
  } else {
    if (nearBoundary) {
      certaintyLevel = 'LOW'; score = 0.85;
      warning = "Heure de naissance inconnue + Lune proche d'une frontière — Mahadasha incertaine. Ajoutez votre heure de naissance.";
    } else {
      certaintyLevel = 'MEDIUM'; score = 0.92;
      warning = 'Heure de naissance non fournie — certitude Dasha modérée.';
    }
  }

  return { certaintyLevel, score, warning, nakshatraIndex, positionInNak, birthtimeKnown };
}

// Valeur par défaut quand astro est absent (pas de calcul possible)
const DASHA_CERTAINTY_DEFAULT: DashaCertaintyResult = {
  certaintyLevel: 'LOW', score: 0.85,
  warning: 'Thème astral non disponible — certitude Dasha faible.',
  nakshatraIndex: 0, positionInNak: 0.5, birthtimeKnown: false,
};

// ══════════════════════════════════════════════════════════════════
// ═══ CALC SLOW MODULES — L2 ═══
// Contient tous les modules lents de calcConvergence (L2182-L2519)
// Option A : breakdown[], signals[], alerts[] passés par référence
// Reçoit DailyModuleResult (L1) pour accéder aux variables hoistées
// Retourne finalDelta (après cap ±60) — prêt pour compress() en L3
// ══════════════════════════════════════════════════════════════════

export function calcSlowModules(
  params: {
    num: NumerologyProfile;
    astro: AstroChart | null;
    iching: IChingReading;
    bd: string;
    bt?: string;       // V9 Sprint 1 — heure de naissance optionnelle (ex: "23:20")
    evalDate?: Date;   // Sprint F — date d'évaluation pour forecast J+X (undefined = aujourd'hui)
  },
  daily: DailyModuleResult,
  breakdown: SystemBreakdown[],
  signals: string[],
  alerts: string[]
): { delta: number; ctxMult: number; dashaMult: number; dashaCertainty: DashaCertaintyResult; shadowBaseSignal?: number } {
  const { num, astro, iching, bd, bt } = params;
  const {
    dailyDeltaSnapshot,
    nakshatraData,
    pyv,
    moonResult,
    _transitBreakdown,
    profectionResult,
    moonPhaseRawPhase,
  } = daily;

  // V6.0 : variables hoistées pour synergies R21-R27
  let currentDashaLord: string | null = null;
  let hasJupiterReturn = false;
  let hasSolarEclipseNatal = false;

  // ═══════════════════════════════════
  // A1.1 : Retours planétaires
  // ═══════════════════════════════════

  let returnsScore = 0;
  if (astro) {
    const natalLongs = extractNatalReturnLongs(astro);
    if (natalLongs) {
      const nakQuality = nakshatraData?.globalBaseScore ?? 0;
      const returnsResult = calcPlanetaryReturns(params.evalDate ?? new Date(), natalLongs, nakQuality);
      returnsScore = returnsResult.totalScore;
      hasJupiterReturn = returnsResult.breakdown.some(b => /jupiter/i.test(b)); // V6.0 S4
      if (returnsResult.hasActiveReturn) {
        breakdown.push({
          system: 'Retours Planétaires', icon: '🪐',
          value: returnsResult.breakdown.length
            ? returnsResult.breakdown[0].split('(')[0].trim()
            : 'Retour actif',
          points: Math.round(returnsScore),
          detail: returnsResult.breakdown.join(' · '),
          signals: returnsResult.breakdown.filter(b => !b.includes('-')),
          alerts:  returnsResult.breakdown.filter(b =>  b.includes('-')),
        });
      }
    }
  }

  // ═══════════════════════════════════
  // A1.2 : Cycles de Vie 3×27 ans
  // ═══════════════════════════════════

  // V7 : cyclesDelta → narratif pur (GPT+Grok+Gemini R23 unanime)
  // Constant sur 365j (resonanceWithPY annuel, isTransition ~2 ans) → interdit en additif (doctrine R22)
  // Terrain karmique → information qualitative, pas delta quantitatif
  if (num.lifeCycle) {
    const cycleLabel = `Cycle ${num.lifeCycle.name} (chiffre ${num.lifeCycle.directorNumber})`;
    const cycleDetail = num.lifeCycle.isTransition
      ? 'Phase de transition — dissolution et reconfiguration'
      : num.lifeCycle.resonanceWithPY
      ? 'Résonance PY active — fluidité structurelle'
      : 'Cycle stable';
    breakdown.push({
      system: 'Cycles de Vie', icon: '🔄',
      value: cycleLabel,
      points: 0, // V7 : narratif pur — cyclesDelta retiré de delta (R23)
      detail: cycleDetail,
      signals: num.lifeCycle.resonanceWithPY ? [`${cycleLabel} — terrain favorable`] : [],
      alerts:  num.lifeCycle.isTransition ? [`${cycleLabel} — transition en cours`] : [],
    });
  }

  // ═══════════════════════════════════
  // A1.3 + A1.4 : Progressions Secondaires + Solar Arc
  // ═══════════════════════════════════

  let progressionsScore = 0;
  if (astro) {
    const progResult = calcProgressions(bd, params.evalDate ?? new Date(), astro);
    progressionsScore = Math.max(-3, Math.min(3, progResult.totalScore)); // V6.2: cap ±3 (signal mensuel, pas quotidien — R17)
    if (progResult.breakdown.length > 0) {
      breakdown.push({
        system: 'Progressions', icon: '🌱',
        value: `☀ ${progResult.progressed.sunSign} · ☽ ${progResult.progressed.moonSign}`,
        points: Math.round(progressionsScore),
        detail: progResult.breakdown.slice(0, 3).join(' · '),
        signals: progResult.breakdown.filter(b => !b.includes('-') && b.includes('+')),
        alerts:  progResult.breakdown.filter(b => b.includes('-')),
      });
    }
  }

  // ═══════════════════════════════════
  // A1.5 : Vimshottari Dasha (V5.1)
  // Cap individuel ±9 (V5.2)
  // ═══════════════════════════════════

  let dashaTotal      = 0;
  let dashaMahaScore  = 0;   // V9.0 P4 — hoistés pour composeDashaMultipliers()
  let dashaAntarScore = 0;
  let currentDasha: CurrentDasha | null = null;
  let dashaCertainityResult: DashaCertaintyResult = DASHA_CERTAINTY_DEFAULT;
  if (astro) {
    try {
      // V9 Sprint 1 : utiliser l'heure de naissance réelle si connue (au lieu de T12:00:00)
      // La Lune se déplace ~0.54°/h → 11h d'écart = ~6° → peut changer de Nakshatra (13.33°)
      const birthTimeStr  = bt && /^\d{1,2}:\d{2}$/.test(bt) ? bt : '12:00';
      const birthD        = new Date(bd + 'T' + birthTimeStr + ':00');
      const birthYear     = birthD.getFullYear();
      const natalMoon     = getMoonPhase(birthD);
      const natalAyanamsa = getAyanamsa(birthYear);
      const natalMoonSid  = ((natalMoon.longitudeTropical - natalAyanamsa) % 360 + 360) % 360;
      const natalMoonIsWaxing = (natalMoon.phase ?? 0) <= 4;
      const transitLord = nakshatraData?.lord;

      // V9 Sprint 1 — certitude Dasha (Gemini 3.1 Pro)
      dashaCertainityResult = calculateDashaCertainty(natalMoonSid, bt || null);

      const dasha       = calcCurrentDasha(natalMoonSid, birthD, params.evalDate ?? new Date());
      const dashaResult = calcDashaScore(dasha, { transitLord, natalMoonIsWaxing });
      dashaTotal        = dashaResult.total;
      dashaMahaScore    = dashaResult.mahaScore;   // V9.0 P4
      dashaAntarScore   = dashaResult.antarScore;  // V9.0 P4
      currentDasha      = dasha;                   // V9.0 P4
      currentDashaLord  = dasha.maha.lord; // V6.0 R21 + R24

      // ── V8 GARDE ANTI-DOUBLE-COMPTAGE Nakshatra lord ↔ Dasha lord ──
      // Signal : Nakshatra (L1) amplifie déjà le transit du lord (ex: Nakshatra Jupiter → +4).
      // Terrain : dashaMultiplier (L2) amplifie ensuite TOUT le delta, y compris ce signal.
      // → Si transitLord === dashaLord et les deux sont positifs, la même planète génère
      //   un double signal (signal direct + amplification multiplicative).
      // Solution : plafonner dashaTotal à ±6 (au lieu de ±9) pour ce cas.
      // L'effet reste perceptible mais sans sur-représenter une seule planète.
      if (
        transitLord &&
        dasha.maha.lord === transitLord &&
        dashaTotal > 0 &&
        (nakshatraData?.globalBaseScore ?? 0) > 0
      ) {
        dashaTotal = Math.min(dashaTotal, 6);
        console.debug('[Guard] Double-comptage Nak↔Dasha neutralisé:', { lord: transitLord, dashaTotal });
      }
      if (
        transitLord &&
        dasha.maha.lord === transitLord &&
        dashaTotal < 0 &&
        (nakshatraData?.globalBaseScore ?? 0) < 0
      ) {
        dashaTotal = Math.max(dashaTotal, -6);
        console.debug('[Guard] Double-comptage Nak↔Dasha neutralisé (négatif):', { lord: transitLord, dashaTotal });
      }

      if (dashaTotal !== 0 || dasha.maha.isTransition) {
        const sign      = dashaTotal > 0 ? '+' : '';
        const sandhiTag = dasha.maha.isTransition ? ' ⚠ Sandhi' : '';
        const dashaMult = (Math.max(0.91, Math.min(1.09, 1.0 + dashaTotal / 100))).toFixed(2);
        breakdown.push({
          system: 'Vimshottari Dasha', icon: '🕉',
          value: `${dasha.maha.lord} / ${dasha.antar.lord} / ${dasha.pratyantar.lord}${sandhiTag}`,
          points: 0, // V6.3: Dasha = multiplicateur pur (R19 GPT+Gemini unanime)
          detail: `Terrain karmique ×${dashaMult} · ` + dashaResult.breakdown.join(' · '),
          signals: dashaTotal > 0 ? [`Dasha ${dasha.maha.lord} actif (${sign}${dashaTotal})`] : [],
          alerts:  dashaTotal < 0 ? [`Dasha ${dasha.maha.lord} en tension (${dashaTotal})`]   : [],
        });
      }

      console.assert(Math.abs(dashaTotal) <= 9.1, '[Dasha] Cap ±9 percé:', dashaTotal);

      // ── V5.3 : Convergences nommées (narratif seul — zéro scoring) ──
      if (astro.tr.length) {
        if (dasha.maha.lord === 'Saturne') {
          const saturnTransitActive = astro.tr.some(t => t.tp === 'saturn');
          if (saturnTransitActive) {
            signals.push('⚫ DOUBLE SATURNIEN — Saturne Maha + transit Saturne actif : pression structurante maximale.');
          }
        }
        const jupiterConjSun = astro.tr.some(t => t.tp === 'jupiter' && t.np === 'sun' && t.t === 'conjunction');
        if (jupiterConjSun && dashaTotal > 0) {
          signals.push('🌟 EXPANSION STRATIFIÉE — Jupiter conjoint ton Soleil natal dans une saison karmique favorable : croissance alignée.');
        }
        const uranusConjMC = astro.tr.some(t => t.tp === 'uranus' && (t.np === 'mc' || t.np === 'midheaven') && t.t === 'conjunction');
        if (uranusConjMC && pyv === 1) {
          signals.push('⚡ PIVOT URANIEN — Uranus sur ton MC + Année 1 : rupture et redéfinition professionnelle. Décide consciemment.');
        }
        const activeSLow = new Set(astro.tr.filter(t => SLOW_PLANETS.has(t.tp)).map(t => t.tp));
        if (activeSLow.size >= 3) {
          alerts.push(`🌀 GRANDE MUTATION — ${activeSLow.size} planètes lentes actives simultanément (${[...activeSLow].join(', ')}) : phase transformationnelle multi-couches.`);
        }
      }
    } catch (e) {
      console.warn('[Vimshottari] Calcul échoué:', e);
    }
  }

  // ═══════════════════════════════════
  // A1.6b : Solar Return (V6.0) — cap ±6
  // ═══════════════════════════════════

  let solarReturnScore = 0;
  if (astro) {
    try {
      const srResult = calcSolarReturn(astro, bd, params.evalDate ?? new Date());
      solarReturnScore = srResult.totalScore;
      if (srResult.hasActiveSR && solarReturnScore !== 0) {
        const sign = solarReturnScore > 0 ? '+' : '';
        breakdown.push({
          system: 'Révolution Solaire', icon: '☀',
          value: srResult.srDate
            ? `SR ${srResult.srDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`
            : 'SR active',
          points: solarReturnScore,
          detail: srResult.breakdown.slice(0, 2).join(' · '),
          signals: solarReturnScore > 0 ? [`☀ Révolution Solaire favorable (${sign}${solarReturnScore})`] : [],
          alerts:  solarReturnScore < 0 ? [`☀ Révolution Solaire en tension (${solarReturnScore})`] : [],
        });
      }
      console.assert(Math.abs(solarReturnScore) <= 6.1, '[SolarReturn] Cap ±6 percé:', solarReturnScore);
    } catch (e) {
      console.warn('[SolarReturn] Intégration échouée:', e);
    }
  }

  // Cap combiné ±10 — sans Dasha (V6.3: Dasha = multiplicateur pur, R19)
  const slowAstroDelta = Math.max(-10, Math.min(10, returnsScore + progressionsScore + solarReturnScore));
  console.assert(Math.abs(slowAstroDelta) <= 10.1, '[SlowAstro] Cap ±10 percé:', slowAstroDelta);

  // ═══════════════════════════════════
  // A1.6 : ÉCLIPSES SUR POINTS NATAUX (V5.4) — cap ±6
  // ═══════════════════════════════════

  let eclipseNatalPts = 0;
  if (astro) {
    try {
      const natalLongs: Partial<Record<'sun' | 'moon' | 'asc' | 'mc', number>> = {};
      for (const pl of astro.pl) {
        if (pl.k === 'sun'  ) natalLongs.sun  = planetPosToLong(pl.s, pl.d);
        if (pl.k === 'moon' ) natalLongs.moon = planetPosToLong(pl.s, pl.d);
      }
      if (astro.b3?.asc) natalLongs.asc = planetPosToLong(astro.b3.asc, astro.ad ?? 0);
      if (astro.mcSign)  natalLongs.mc  = planetPosToLong(astro.mcSign, astro.mcDeg ?? 0);

      if (Object.keys(natalLongs).length > 0) {
        const eclResult = getEclipseNatalImpacts(natalLongs, params.evalDate ?? new Date());
        eclipseNatalPts = eclResult.total;
        hasSolarEclipseNatal = eclResult.hits.some(
          h => /solaire|solar/i.test(h.eclipseName ?? '')
        );

        if (eclipseNatalPts !== 0) {
          const sign = eclipseNatalPts > 0 ? '+' : '';
          const topHit = eclResult.hits[0];
          breakdown.push({
            system: 'Éclipses Natales', icon: '🌑',
            value:  topHit ? `${topHit.eclipseName} → ${topHit.natalPoint.toUpperCase()}` : 'Actif',
            points: 0, // V6.2: narratif uniquement (déconnecté du delta)
            detail: eclResult.breakdown[0] ?? '',
            signals: eclipseNatalPts > 0 ? [`🌑 Éclipse activant tes points nataux (${sign}${eclipseNatalPts})`] : [],
            alerts:  eclipseNatalPts < 0 ? [`🌑 Éclipse en tension sur point natal (${eclipseNatalPts})`]       : [],
          });
          if (topHit?.narrative) signals.push(`🌑 ${topHit.narrative}`);
        }

        console.assert(Math.abs(eclipseNatalPts) <= 6.1, '[EclipseNatal] Cap ±6 percé:', eclipseNatalPts);
      }
    } catch (e) {
      console.warn('[EclipseNatal] Calcul échoué:', e);
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // V6.0 — SYNERGIES INTER-NIVEAUX TEMPORELS (R21-R27)
  // ══════════════════════════════════════════════════════════════════

  const DASHA_TO_PLANET: Record<string, string> = {
    'Soleil': 'sun', 'Lune': 'moon', 'Mercure': 'mercury', 'Vénus': 'venus',
    'Mars': 'mars', 'Jupiter': 'jupiter', 'Saturne': 'saturn',
    'Rahu': 'rahu', 'Ketu': 'ketu',
  };

  const KW_YANG = [
    6,0,2,2,4,4,1,1,
    5,5,3,3,5,5,1,1,
    3,3,2,2,3,3,1,1,
    4,4,2,4,2,4,3,3,
    4,4,2,2,4,4,2,2,
    3,3,5,5,2,2,3,3,
    4,4,2,2,3,3,3,3,
    4,4,3,3,4,2,3,3,
  ];

  const dashaLordKey = currentDashaLord ? DASHA_TO_PLANET[currentDashaLord] : null;
  // Sprint T — Fix 1 : cohérence Sprint R
  // _transitBreakdown non filtré contient encore Jupiter/Saturn→Moon (orb-based).
  // Graha Drishti prend ownership de ces paires → on les exclut aussi ici.
  const DRISHTI_SLOW_T = new Set(['jupiter', 'saturn']);
  const dashaLordTransitScore = dashaLordKey
    ? _transitBreakdown
        .filter(b => b.transitPlanet === dashaLordKey
                  && !(DRISHTI_SLOW_T.has(b.transitPlanet) && (b as any).natalPoint === 'moon'))
        .reduce((s, b) => s + b.score, 0)
    : 0;

  const profLord = profectionResult?.timeLord ?? null;
  const profLordKey = profLord ? DASHA_TO_PLANET[profLord] : null;
  const profectionSignifiantScore = profLordKey
    ? _transitBreakdown.filter(b => b.transitPlanet === profLordKey).reduce((s, b) => s + b.score, 0)
    : 0;

  // Sprint T — Fix 2 : guard R27 × R29
  // Si profectionLord === dashaLord, les deux règles filtrent le même transitPlanet
  // → R27 prend ownership (profections hellénistiques) → R29 neutralisé
  const dashaLordTransitScoreForCtx = (dashaLordKey && profLordKey && dashaLordKey === profLordKey)
    ? 0
    : Math.round(dashaLordTransitScore);

  const hexYangLines = iching.hexNum >= 1 && iching.hexNum <= 64
    ? KW_YANG[iching.hexNum - 1]
    : 3;

  const v6Ctx = buildInteractionContext({
    hexNum: -1,
    personalDay: -1,
    personalYear: pyv,
    personalMonth: -1,
    moonPhaseIdx: moonPhaseRawPhase,
    isVoC: false,
    mercuryRetro: false,
    jupiterPositive: false,
    trinityBonus: 0,
    dashaLord: currentDashaLord,
    dashaLordTransitScore: dashaLordTransitScoreForCtx, // Sprint T: residuel Drishti + guard R27×R29
    hexYangLines,
    nakshatraName: nakshatraData?.name ?? null,
    hasJupiterReturn,
    hasSolarEclipseNatal,
    profectionSignifiantScore: Math.round(profectionSignifiantScore),
    profectionHouse: profectionResult?.activeHouse ?? (profectionResult as any)?.house ?? 0,
  });

  const v6Result = calcInteractions(v6Ctx);
  const v6SynergyBonus = Math.max(-3, Math.min(3, v6Result.totalBonus)); // V6.2: ±6→±3 (surcouche amplificatrice — R17)

  if (v6SynergyBonus !== 0) {
    for (const ia of v6Result.active) {
      const sign = ia.bonus > 0 ? '+' : '';
      if (ia.bonus > 0) signals.push(`✨ ${ia.label} (${sign}${ia.bonus})`);
      else alerts.push(`⚠️ ${ia.label} (${ia.bonus})`);
    }
    breakdown.push({
      system: 'Synergies V6', icon: '🌀',
      value: `${v6Result.active.length} synergie${v6Result.active.length > 1 ? 's' : ''} temporelle${v6Result.active.length > 1 ? 's' : ''}`,
      points: v6SynergyBonus,
      detail: v6Result.active.map(a => a.label.split('—')[0].trim()).join(' · '),
      signals: v6Result.active.filter(a => a.bonus > 0).map(a => `${a.label} (+${a.bonus})`),
      alerts:  v6Result.active.filter(a => a.bonus < 0).map(a => `${a.label} (${a.bonus})`),
    });
  }

  // ══════════════════════════════════════════════════════════════════
  // V6.0 — APPLICATION DU CONTEXTE MULTIPLICATEUR
  // ══════════════════════════════════════════════════════════════════

  const ctx = calcTemporalContext(slowAstroDelta);
  console.assert(
    ctx.multiplier >= 0.88 && ctx.multiplier <= 1.12,
    '[Context] Multiplicateur hors limites:', ctx.multiplier
  );

  // V9.0 P4 — composition géométrique Maha × Antar [0.80–1.25] + lissage Sandhi sigmoïdal
  // Remplace (1.0 + dashaTotal/100) par √(mahaMult × antarMult) — produit karmique fidèle
  // Range : pire (−4,−2) → 0.80 clamped | meilleur (+4,+2) → 1.25 clamped
  const dashaMultiplierRaw = composeDashaMultipliers(dashaMahaScore, dashaAntarScore);
  const dashaMultSmoothed  = currentDasha
    ? calcSandhiSmoothing(currentDasha, dashaMultiplierRaw, params.evalDate ?? new Date())
    : dashaMultiplierRaw;
  const dashaMultiplier = dashaMultSmoothed * dashaCertainityResult.score;
  console.assert(
    dashaMultiplier >= 0.64 && dashaMultiplier <= 1.25,
    '[Dasha] Multiplicateur hors limites après certitude:', dashaMultiplier
  );

  // Formule V7 : (quotidien + synergies) × ctx.multiplier × dashaMultiplier + offset_lent
  // cyclesDelta retiré V7 — narratif pur (R23 unanime) — constant 365j, interdit en additif (doctrine R22)
  // eclipseNatalPts déconnecté du delta V6.2 — narratif uniquement (R16+R17 unanime)
  // Sprint Q — capScale(terrain) : atténue le signal L1 quand terrain est extrême (GPT Ronde 14, β=0.20)
  // Évite l'empilement "L1 fort + terrain fort" → scores extrêmes injustifiés
  const terrainQ  = ctx.multiplier * dashaMultiplier;
  const capScale  = Math.max(0.85, Math.min(1.00, 1 - 0.20 * Math.abs(terrainQ - 1)));
  let delta = (dailyDeltaSnapshot * capScale + v6SynergyBonus) * ctx.multiplier * dashaMultiplier
            + ctx.offsetPts;

  // V5.5 — EXCLUSION MUTUELLE ÉCLIPSES
  if (Math.abs(eclipseNatalPts) > 0.5 && moonResult.eclipseContrib !== 0) {
    delta -= moonResult.eclipseContrib * ctx.multiplier * dashaMultiplier;
    console.debug('[Guard] Éclipse générique neutralisée (×multiplier)', { eclipseNatalPts, neutralisé: moonResult.eclipseContrib, multiplier: ctx.multiplier, dashaMultiplier });
  }

  // Breakdown contexte temporel
  breakdown.push({
    system: 'Contexte Temporel', icon: '🏔',
    value: ctx.label,
    points: 0,
    detail: ctx.breakdown.join(' · '),
    signals: ctx.multiplier > 1.03 ? [ctx.breakdown[0]] : [],
    alerts:  ctx.multiplier < 0.97 ? [ctx.breakdown[0]] : [],
  });

  // ═══════════════════════════════════
  // ASHTAKAVARGA ☉♂ — Sprint D4 (migré depuis L1)
  // Rythme Soleil ~30j/signe, Mars ~45j/signe → signal lent → appartient à L2
  // Cap individuel ±3 chacun (signal moins fort que la Lune en L1)
  // ═══════════════════════════════════

  if (astro) {
    try {
      const todayD2  = params.evalDate ?? new Date();
      const ay2      = getAyanamsa(todayD2.getFullYear());

      // Soleil sidéral
      const sunTropL  = getPlanetLongitudeForDate('sun', todayD2);
      const sunSidL   = ((sunTropL - ay2) + 360) % 360;
      const ashSun2   = calcAshtakavarga('sun', sunSidL, astro, bd);
      const sunDelta  = Math.max(-3, Math.min(3, ashSun2.delta));
      if (sunDelta !== 0) {
        delta += sunDelta;
        signals.push(...ashSun2.signals);
        alerts.push(...ashSun2.alerts);
        breakdown.push({
          system: 'Ashtakavarga ☉', icon: '⭕',
          value:  `${ashSun2.signName} — ${ashSun2.bindus} Bindus`,
          points: sunDelta,
          detail: `Soleil sidéral en ${ashSun2.signName} | BAV Soleil natale`,
          signals: ashSun2.signals, alerts: ashSun2.alerts,
        });
      }

      // Mars sidéral
      const marsTropL = getPlanetLongitudeForDate('mars', todayD2);
      const marsSidL  = ((marsTropL - ay2) + 360) % 360;
      const ashMars2  = calcAshtakavarga('mars', marsSidL, astro, bd);
      const marsDelta = Math.max(-3, Math.min(3, ashMars2.delta));
      if (marsDelta !== 0) {
        delta += marsDelta;
        signals.push(...ashMars2.signals);
        alerts.push(...ashMars2.alerts);
        breakdown.push({
          system: 'Ashtakavarga ♂', icon: '⭕',
          value:  `${ashMars2.signName} — ${ashMars2.bindus} Bindus`,
          points: marsDelta,
          detail: `Mars sidéral en ${ashMars2.signName} | BAV Mars natale`,
          signals: ashMars2.signals, alerts: ashMars2.alerts,
        });
      }
    } catch { /* ASV Sun/Mars fail silently */ }
  }

  // ═══════════════════════════════════
  // TRANSIT STELLIUM V8.5 — P5
  // 3+ planètes lentes en aspect simultané avec points nataux du même signe.
  // Doctrine : Sasportas — concentration cosmique personnelle.
  // Anti-biais : conditionnel, orbe ≤3°, fréquence ~3-8 jours/an.
  // Anti-double-comptage : aspects individuels déjà dans calcPersonalTransits.
  // ═══════════════════════════════════
  const transitStelliumResult = calcTransitStellium(astro ?? null, breakdown);
  if (Number.isFinite(transitStelliumResult.totalBonus) && transitStelliumResult.totalBonus !== 0) {
    delta += transitStelliumResult.totalBonus;
    console.assert(
      Math.abs(transitStelliumResult.totalBonus) <= 4.1,
      '[TransitStellium] Cap ±4 percé:', transitStelliumResult.totalBonus
    );
  }

  // ═══════════════════════════════════
  // JIEQI 节气 — Sprint E3 (L2 semi-mensuel)
  // 24 termes solaires chinois — rythme ~15j → L2 (consensus 3/3 Ronde 9)
  // Cap ±2 — anti-double-comptage avec pilier mensuel BaZi (L1)
  // ═══════════════════════════════════
  try {
    const sunTropJ    = getPlanetLongitudeForDate('sun', params.evalDate ?? new Date()); // Sprint F: date injectée pour forecast
    const jieqiResult = calcJieqi(sunTropJ);
    if (jieqiResult.total !== 0) {
      delta += jieqiResult.total;
      signals.push(...jieqiResult.signals);
      alerts.push(...jieqiResult.alerts);
      breakdown.push({
        system: 'Jieqi 节气', icon: '☯️',
        value:  `${jieqiResult.term.hanzi} ${jieqiResult.term.name}${jieqiResult.isTransitionDay ? ' ✦' : ''}`,
        points: jieqiResult.total,
        detail: `${jieqiResult.term.trad} — Terme solaire chinois (L2 ±2)`,
        signals: jieqiResult.signals,
        alerts:  jieqiResult.alerts,
      });
    }
    console.assert(Math.abs(jieqiResult.total) <= 2.1, '[Jieqi] Cap ±2 percé:', jieqiResult.total);
  } catch { /* Jieqi fail silently */ }

  // ═══════════════════════════════════
  // CHANDRA YOGA — Sprint I (L2 slow)
  // Yogas lunaires Parashara BPHS Ch.36 — planètes transitantes vs Lune natale
  // Sunaphya(+2) · Anapha(+2) · Durudhura(+2) · Kemadruma(−3) · cap ±3
  // ═══════════════════════════════════
  try {
    const evalD_cy = params.evalDate ?? new Date();
    const ay_cy    = getAyanamsa(evalD_cy.getFullYear());

    // Lune natale sidérale
    const birthD_cy      = new Date(bd + 'T12:00:00');
    const natalMoon_cy   = getMoonPhase(birthD_cy);
    const natalAy_cy     = getAyanamsa(birthD_cy.getFullYear());
    const natalMoonSid_cy = ((natalMoon_cy.longitudeTropical - natalAy_cy) % 360 + 360) % 360;

    // Planètes transitantes sidérales (Jupiter, Vénus, Saturne, Mars, Mercure)
    const transitPlanets_cy: TransitPlanetSid[] = [];
    for (const pl of ['jupiter', 'venus', 'saturn', 'mars', 'mercury'] as const) {
      try {
        const tropLon = getPlanetLongitudeForDate(pl, evalD_cy);
        const sidLon  = ((tropLon - ay_cy) % 360 + 360) % 360;
        transitPlanets_cy.push({ name: pl, sidLon });
      } catch { /* planet fail silent */ }
    }

    const cyResult = calcChandraYoga(natalMoonSid_cy, transitPlanets_cy);
    const cyDelta  = Math.max(-3, Math.min(3, cyResult.delta));

    if (cyDelta !== 0) {
      delta += cyDelta;
      if (cyDelta > 0) signals.push(cyResult.label);
      else             alerts.push(cyResult.label);
      breakdown.push({
        system: 'Chandra Yoga', icon: '🌙',
        value:  cyResult.yoga,
        points: cyDelta,
        detail: cyResult.detail,
        signals: cyDelta > 0 ? [cyResult.label] : [],
        alerts:  cyDelta < 0 ? [cyResult.label] : [],
      });
    }
  } catch { /* Chandra Yoga fail silently */ }

  // ═══════════════════════════════════
  // ANTARDASHA ACTIVATION — Sprint P2 — V10.9
  // Gemini+GPT Ronde 14 : antaraLord (3 mois-3 ans) plus précis que mahaLord (6-20 ans)
  // Condition : seigneur Nakshatra transit = seigneur Antardasha actuel → amplification ±1
  // ═══════════════════════════════════
  try {
    if (currentDasha && nakshatraData) {
      const antaraL = currentDasha.antar.lord;  // ex: 'Vénus', 'Jupiter'
      const nakL    = nakshatraData.lord;        // ex: 'Vénus', 'Jupiter'
      if (antaraL && nakL && antaraL === nakL) {
        const nakBk = breakdown.find(b => b.system === 'Nakshatra');
        if (nakBk && nakBk.points !== 0) {
          const ampDelta = Math.sign(nakBk.points); // ±1 exactement — capé
          delta += ampDelta;
          const tag = ampDelta > 0 ? `+${ampDelta}` : `${ampDelta}`;
          const label = `🔥 Antardasha × Nakshatra — ${antaraL} (${tag})`;
          if (ampDelta > 0) signals.push(label); else alerts.push(label);
          breakdown.push({
            system: 'Antardasha Activation', icon: '🔥',
            value: `${antaraL} — lord Nakshatra + Antara`,
            points: ampDelta,
            detail: `Nakshatra transit et Antardasha partagent le même seigneur — Sprint P2`,
            signals: ampDelta > 0 ? [label] : [],
            alerts:  ampDelta < 0 ? [label] : [],
          });
        }
      }
    }
  } catch { /* antaraLord amplification fail silently */ }

  // ═══════════════════════════════════
  // NŒUDS LUNAIRES — Sprint U5 (L2)
  // Rahu en maison angulaire natale (kendra 1/4/7/10) → activation karmique +3
  // Guard : eclipseNatalPts < 4 (évite double-comptage nœuds × éclipses — Gemini/GPT Ronde 4)
  // Rahu seul — Ketu exclu (moksha/détachement, BPHS Ch.47 — annulation systématique si pair)
  // Source : Parashara Hora Shastra — Rahu en kendra = force karmique manifestée
  // ═══════════════════════════════════
  try {
    if (astro) {
      const rahuNatal    = astro.pl.find((p: any) => p.k === 'northNode');
      const houseRahu    = rahuNatal?.h ?? 0;
      const nodeLordScore = ([1, 4, 7, 10].includes(houseRahu) && eclipseNatalPts < 4) ? 3 : 0;
      if (nodeLordScore > 0) {
        delta += nodeLordScore;
        const nLabel = `☊ Rahu natal en maison ${houseRahu} (kendra) → activation karmique (+${nodeLordScore})`;
        signals.push(nLabel);
        breakdown.push({
          system: 'Nœuds Lunaires', icon: '☊',
          value:  `Rahu — Maison ${houseRahu} (angulaire)`,
          points: nodeLordScore,
          detail: `Rahu natal en kendra · eclipseNatalPts=${eclipseNatalPts} · Sprint U5`,
          signals: [nLabel],
          alerts:  [],
        });
      }
    }
  } catch { /* Nœuds Lunaires fail silently */ }

  // ═══════════════════════════════════
  // SCIS — Score de Cohérence Inter-Systèmes — Sprint P2 — V10.9
  // Gemini Ronde 14 : seuil déterministe |sumSigns| ≥ 3 (3 systèmes sur 4 alignés)
  // GPT Ronde 14 : micro-delta ±2 capé — ne se déclenche que lors de convergences rares
  // ═══════════════════════════════════
  try {
    const SCIS_NUM  = new Set(['Numérologie']);
    const SCIS_BAZI = new Set(['BaZi', '10 Gods', 'Changsheng', 'Na Yin', 'Jian Chu', 'Shen Sha', 'Peach Blossom']);
    const SCIS_LUNE = new Set(['Nakshatra', 'Nakshatra Pada', 'Tarabala', 'Chandrabala',
      'Ashtakavarga ☽', 'Panchanga', 'Graha Drishti', 'Yoga Kartari', 'Tithi Lord', 'Chandra Yoga']);
    const SCIS_EPHEM = new Set(['Astrologie', 'Planètes', 'Étoiles Fixes', 'Synergies']);

    let dNum = 0, dBazi = 0, dLune = 0, dEphem = 0;
    for (const b of breakdown) {
      if (SCIS_NUM.has(b.system))  dNum   += b.points;
      else if (SCIS_BAZI.has(b.system))  dBazi  += b.points;
      else if (SCIS_LUNE.has(b.system))  dLune  += b.points;
      else if (SCIS_EPHEM.has(b.system)) dEphem += b.points;
    }

    // Y3c — SCIS nouveau seuil (GPT Ronde 3 — MEMO-Y0)
    // Ancien seuil : |sumSigns| >= 3 (3/4 groupes alignés faiblement) → trop fréquent
    // Nouveau seuil : 4/4 groupes alignés + au moins 3 groupes à magnitude forte
    //   SCIS_MIN_MAG = 3.5 pts ≈ 0.35 × cap_moyen (~10 pts) en espace delta brut
    //   Fréquence cible : ~15-18 j/an (vs ancien ~40-50 j/an)
    const sgn = (x: number) => Math.abs(x) > 1 ? Math.sign(x) : 0;
    const signs    = [sgn(dNum), sgn(dBazi), sgn(dLune), sgn(dEphem)];
    const sumSigns = signs.reduce((a, b) => a + b, 0);

    const SCIS_MIN_MAG  = 3.5;
    const groupDeltas   = [dNum, dBazi, dLune, dEphem];
    const strongGroups  = groupDeltas.filter(g => Math.abs(g) > SCIS_MIN_MAG).length;
    const isAllAligned  = Math.abs(sumSigns) === 4;  // 4/4 dans le même sens
    const scisActive    = isAllAligned && strongGroups >= 3;

    if (scisActive) {
      const scisDelta = sumSigns > 0 ? 2 : -2;
      delta += scisDelta;
      const sLabel = sumSigns > 0
        ? `🌟 Convergence Inter-Systèmes (+2) — 4/4 alignés · ${strongGroups} forts`
        : `⚠️ Convergence Critique (-2) — 4/4 alignés · ${strongGroups} forts`;
      if (sumSigns > 0) signals.push(sLabel); else alerts.push(sLabel);
      const polarOf = (v: number) => v > 0 ? '+' : v < 0 ? '−' : '○';
      breakdown.push({
        system: 'SCIS', icon: sumSigns > 0 ? '🌟' : '⚠️',
        value: `4/4 systèmes convergents (${strongGroups} forts)`,
        points: scisDelta,
        detail: `NUM${polarOf(sgn(dNum))} BaZi${polarOf(sgn(dBazi))} Lune${polarOf(sgn(dLune))} Eph${polarOf(sgn(dEphem))} — Y3c nouveau seuil`,
        signals: sumSigns > 0 ? [sLabel] : [],
        alerts:  sumSigns < 0 ? [sLabel] : [],
      });
    }
  } catch { /* SCIS fail silently */ }

  // Cap global ±60 avant compression
  const clampedDelta = Math.max(-60, Math.min(60, delta));

  // ═══════════════════════════════════════════════════════════════════
  // Y1 SHADOW — Noyau védique pur (base_signal)
  // base_signal = 0.55 × S_dasha + 0.40 × S_nak + 0.05 × S_tithi
  // Champ shadowBaseSignal : non utilisé dans le score final pour l'instant.
  // Objectif : observer la distribution et valider avant Y2 (formule tanh).
  // Table S_tithi : Grok Ronde 3 — 30 Tithis ∈ [-1, +1]
  // ═══════════════════════════════════════════════════════════════════
  let shadowBaseSignal: number | undefined;
  try {
    const evalDay = params.evalDate ?? new Date();

    // S_nak : globalBaseScore est déjà ∈ {-1, 0, +1}
    // AA-2 — garde anti-double-comptage (Grok R2 Ronde 2)
    // globalBaseScore est déjà dans NakshatraComposite (C_LUNE, L1).
    // Si C_LUNE est net positif (luneGroupDelta > 0 = proxy tarabala/chandrabala actifs),
    // réduire S_nak à 65% pour éviter double-amplification du signal Nakshatra.
    const S_nak_raw = nakshatraData?.globalBaseScore ?? 0;

    // AB-R1 — Règle dashaLord === nakshatraLord (BPHS Chap.70 v.12-15 — Grok R3 Ronde 3)
    // Même seigneur Antardasha et Nakshatra = renforcement mutuel karmique.
    // Boost ×1.18 sur S_nak_raw AVANT la garde AA-2 (ordre strict : boost puis garde).
    // dashaTotal plafonné à 7 si même seigneur (évite double-amplification S_dasha + S_nak).
    const _antaraLord = currentDasha?.antar.lord ?? null;
    const _nakLord    = nakshatraData?.lord ?? null;
    const _sameLord   = !!_antaraLord && !!_nakLord && _antaraLord === _nakLord;
    const S_nak_boosted = _sameLord ? S_nak_raw * 1.18 : S_nak_raw;
    // Garde AA-2 appliquée APRÈS le boost (ordre Grok R3)
    const S_nak = S_nak_boosted * (daily.luneGroupDelta > 0 ? 0.65 : 1.0);

    // S_dasha : dashaTotal ∈ [-9, +9] → normalisation → [-1, +1]
    // AB-R1 : si même seigneur → plafonner dashaTotal à 7 avant normalisation
    const _dashaTotalCapped = _sameLord ? Math.min(dashaTotal, 7) : dashaTotal;
    const S_dasha = Math.max(-1, Math.min(1, _dashaTotalCapped / 9));

    // S_tithi : calculé depuis la longitude tropicale Lune − Soleil
    const moonLonTrop = getMoonPhase(evalDay).longitudeTropical;
    const sunLonTrop  = getPlanetLongitudeForDate('sun', evalDay);
    const tithiIndex  = Math.floor(((moonLonTrop - sunLonTrop + 360) % 360) / 12) + 1; // 1–30

    // Table des 30 Tithis — scores validés par Grok Ronde 3
    // Croissant (Shukla) 1-15, Décroissant (Krishna) 16-30 (signe inversé du miroir)
    const TITHI_SCORES: Record<number, number> = {
       1: +0.6,  2: +0.4,  3: +0.8,  4: -0.9,  5: +0.7,
       6: +0.5,  7: +0.4,  8: +0.3,  9: -1.0, 10: +0.8,
      11: +0.9, 12: +0.6, 13: +0.7, 14: -0.7, 15: +1.0,
      16: -0.6, 17: -0.4, 18: -0.8, 19: +0.9, 20: -0.7,
      21: -0.5, 22: -0.4, 23: -0.4, 24: -0.3, 25: +1.0,
      26: -0.8, 27: -0.9, 28: -0.6, 29: -0.7, 30: -0.8,
    };
    const S_tithi = TITHI_SCORES[tithiIndex] ?? 0;

    // AB-R2 — pondération 0.55/0.30/0.15 (Grok Ronde 3 — Muhurta Chintamani Chap.2)
    // Réduit poids S_nak (0.40→0.30) + augmente poids S_tithi (0.05→0.15) pour équilibre védique
    const raw = 0.55 * S_dasha + 0.30 * S_nak + 0.15 * S_tithi;
    shadowBaseSignal = Math.max(-1, Math.min(1, raw));

    console.debug('[Y1 shadow] base_signal', {
      S_dasha: S_dasha.toFixed(3),
      S_nak,
      S_tithi,
      tithiIndex,
      shadowBaseSignal: shadowBaseSignal.toFixed(3),
    });
  } catch (e) {
    console.warn('[Y1 shadow] base_signal échec silencieux:', e);
    shadowBaseSignal = undefined;
  }

  return { delta: clampedDelta, ctxMult: ctx.multiplier, dashaMult: dashaMultiplier, dashaCertainty: dashaCertainityResult, shadowBaseSignal };
}
