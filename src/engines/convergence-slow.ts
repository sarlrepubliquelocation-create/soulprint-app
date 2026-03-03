// ══════════════════════════════════════
// ═══ CONVERGENCE SLOW — L2 — V6.0 ═══
// Step 5 split : modules lents de calcConvergence
// Contient : calcTemporalContext() + calcSlowModules() — L2 pass-by-reference Option A
// Modules : Returns, Progressions, Dasha, Solar Return, Éclipses Natales,
//           V6 Synergies R21-R27, contextMultiplier, formule finale
// ══════════════════════════════════════

import { type NumerologyProfile } from './numerology';
import { type AstroChart } from './astrology';
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
    bt?: string; // V9 Sprint 1 — heure de naissance optionnelle (ex: "23:20")
  },
  daily: DailyModuleResult,
  breakdown: SystemBreakdown[],
  signals: string[],
  alerts: string[]
): { delta: number; ctxMult: number; dashaMult: number; dashaCertainty: DashaCertaintyResult } {
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
      const returnsResult = calcPlanetaryReturns(new Date(), natalLongs, nakQuality);
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
    const progResult = calcProgressions(bd, new Date(), astro);
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

      const dasha       = calcCurrentDasha(natalMoonSid, birthD, new Date());
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
      const srResult = calcSolarReturn(astro, bd, new Date());
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
        const eclResult = getEclipseNatalImpacts(natalLongs, new Date());
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
  const dashaLordTransitScore = dashaLordKey
    ? _transitBreakdown.filter(b => b.transitPlanet === dashaLordKey).reduce((s, b) => s + b.score, 0)
    : 0;

  const profLord = profectionResult?.timeLord ?? null;
  const profLordKey = profLord ? DASHA_TO_PLANET[profLord] : null;
  const profectionSignifiantScore = profLordKey
    ? _transitBreakdown.filter(b => b.transitPlanet === profLordKey).reduce((s, b) => s + b.score, 0)
    : 0;

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
    dashaLordTransitScore: Math.round(dashaLordTransitScore),
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
    ? calcSandhiSmoothing(currentDasha, dashaMultiplierRaw, new Date())
    : dashaMultiplierRaw;
  const dashaMultiplier = dashaMultSmoothed * dashaCertainityResult.score;
  console.assert(
    dashaMultiplier >= 0.64 && dashaMultiplier <= 1.25,
    '[Dasha] Multiplicateur hors limites après certitude:', dashaMultiplier
  );

  // Formule V7 : (quotidien + synergies) × ctx.multiplier × dashaMultiplier + offset_lent
  // cyclesDelta retiré V7 — narratif pur (R23 unanime) — constant 365j, interdit en additif (doctrine R22)
  // eclipseNatalPts déconnecté du delta V6.2 — narratif uniquement (R16+R17 unanime)
  let delta = (dailyDeltaSnapshot + v6SynergyBonus) * ctx.multiplier * dashaMultiplier
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

  // Cap global ±60 avant compression
  const clampedDelta = Math.max(-60, Math.min(60, delta));
  return { delta: clampedDelta, ctxMult: ctx.multiplier, dashaMult: dashaMultiplier, dashaCertainty: dashaCertainityResult };
}
