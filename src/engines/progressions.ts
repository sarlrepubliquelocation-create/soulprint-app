/**
 * progressions.ts — Progressions Secondaires + Solar Arc Kaironaute V5.3
 * A1.3 : Progressions Secondaires (Soleil + Lune + Mars progressés)
 * A1.4 : Solar Arc Directions (toutes planètes + arcDelta)
 *
 * V5.3 : Ajout Mars progressé (dette technique V5.0)
 *   Mars prog avance ~0.5°/an → changement de signe ~tous les 60 ans
 *   Amplitudes ×0.8 vs Soleil/Lune (Mars maléfique modéré en progressions) :
 *   Conj ±6.2 · Trig +4.1 · Carré -5.4 · Opp -4.6
 *   Cap progressions ±14 → ±16 (accommode aspect martien simultané)
 *   Guard : console.assert(!isNaN(marsProgLong), '[Prog] NaN Mars progressé')
 *
 * Règle de base : 1 jour après la naissance = 1 an de vie symbolique.
 *   dateProg(âgeA) = birthDate + A jours
 *
 * Aspects Soleil/Lune progressés → planètes natales :
 *   Conj(0°) +7.5 · Trigone(120°) +4.8 · Carré(90°) -5.5 · Opp(180°) -4.2
 *   Orbe ±1° (= ±1 an avant/après l'exactitude) — consensus Rudhyar/Tyl
 *
 * Solar Arc : arcDelta = sunProg - sunNatal → toutes planètes natales + arcDelta
 *   Anti-redondance : Math.max(|prog|, |sa|) si même planète natale touchée
 *
 * Cache hebdomadaire : Soleil prog ~1°/semaine → résultat stable 7j
 *
 * Sources : Dane Rudhyar (progressions = saisons psychologiques)
 *           Noel Tyl / Reinhold Ebertin (Solar Arc — événements concrets)
 *
 * Ronde A1 — Claude arbitrage — 26/02/2026
 * Grok R2 : 1.7 aspects actifs moyen (40 ans) → delta moyen 3.2 pts
 */

import { getPlanetLongitudeForDate, SIGNS, type AstroChart } from './astrology';
import { planetPosToLong } from './returns';

// ── Scores par type d'aspect (Grok R2 calibration) ──
const ASPECT_SCORES: Record<string, number> = {
  conjunction: 7.5,
  trine:       4.8,
  square:     -5.5,
  opposition: -4.2,
};

// ── Amplitudes Mars progressé (×0.8 vs Soleil/Lune — Mars maléfique modéré) ──
// V5.3 : Grok R1 calibré MC. Changement de signe Mars prog = narratif seul (non scoring).
const MARS_PROG_SCORES: Record<string, number> = {
  conjunction:  6.2,   // conj peut être + ou - selon natal (géré dynamiquement)
  trine:        4.1,
  square:      -5.4,
  opposition:  -4.6,
};

// ── Angles des aspects (degrés) ──
const ASPECT_ANGLES: Array<{ name: string; angle: number }> = [
  { name: 'conjunction', angle: 0   },
  { name: 'opposition',  angle: 180 },
  { name: 'square',      angle: 90  },
  { name: 'trine',       angle: 120 },
];

const ORB_DEG = 1.0; // ±1° = ±1 an d'activation

export interface ProgressionAspect {
  progPlanet: 'Sun' | 'Moon' | 'Mars';  // V5.3 : Mars ajouté
  natalPlanet: string;
  aspect: string;
  orbDeg: number;
  points: number;
}

export interface SolarArcAspect {
  saPlanet: string;
  natalPlanet: string;
  aspect: string;
  orbDeg: number;
  points: number;
}

export interface ProgressedPlanets {
  sunLongitude: number;
  moonLongitude: number;
  marsLongitude: number;  // V5.3
  sunSign: string;
  moonSign: string;
  marsSign: string;       // V5.3
}

export interface ProgressionsResult {
  progressed: ProgressedPlanets;
  aspects: ProgressionAspect[];
  solarArcAspects: SolarArcAspect[];
  progressionsScore: number;  // cap ±16 (V5.3 : was ±14 + Mars progressé)
  solarArcScore: number;      // cap ±8
  totalScore: number;         // progressions + solarArc (anti-redondance)
  breakdown: string[];
  cacheKey: string;
}

// ── Cache hebdomadaire (Gemini R3 : Soleil prog stable 7j) ──
const _progCache = new Map<string, ProgressionsResult>();

/**
 * Calcule la semaine ISO pour la clé de cache.
 */
function getYearWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * Distance angulaire minimale entre deux aspects (0-180°).
 */
function angDist(a: number, b: number): number {
  const d = Math.abs(((a - b) % 360 + 360) % 360);
  return d > 180 ? 360 - d : d;
}

/**
 * Détecte les aspects entre une longitude progressée et les planètes natales.
 */
function detectAspects(
  progLon: number,
  progPlanetName: 'Sun' | 'Moon',
  natalPlanets: Array<{ k: string; lon: number }>
): ProgressionAspect[] {
  const result: ProgressionAspect[] = [];
  for (const natal of natalPlanets) {
    const dist = angDist(progLon, natal.lon);
    for (const asp of ASPECT_ANGLES) {
      const orb = Math.abs(dist - asp.angle);
      if (orb <= ORB_DEG) {
        result.push({
          progPlanet: progPlanetName,
          natalPlanet: natal.k,
          aspect: asp.name,
          orbDeg: +orb.toFixed(3),
          points: +(ASPECT_SCORES[asp.name] * (1 - orb / ORB_DEG)).toFixed(2), // gaussien linéaire
        });
      }
    }
  }
  return result;
}

/**
 * Calcule les progressions secondaires + Solar Arc pour aujourd'hui.
 * Utilise un cache hebdomadaire (coût 0ms après le 1er jour de la semaine).
 *
 * @param bd          Date de naissance "YYYY-MM-DD"
 * @param today       Date du jour
 * @param astro       AstroChart natal (pour longitudes planètes natales)
 * @returns ProgressionsResult
 */
export function calcProgressions(
  bd: string,
  today: Date,
  astro: AstroChart
): ProgressionsResult {
  const cacheKey = `${bd}_${getYearWeek(today)}`;
  const cached = _progCache.get(cacheKey);
  if (cached) return cached;

  // ── Date progressée = birthDate + âge en jours ──
  const [by, bm, bday] = bd.split('-').map(Number);
  const birthMs = Date.UTC(by, bm - 1, bday);
  const ageMs   = today.getTime() - birthMs;
  const ageJours = ageMs / 86400000;
  const progDate = new Date(birthMs + ageJours * 86400000); // 1j = 1an

  // Guard bissextile (Gemini R3 Zone 1)
  const sunProg = getPlanetLongitudeForDate('sun', progDate);
  const moonProg = getPlanetLongitudeForDate('moon', progDate);
  const marsProg = getPlanetLongitudeForDate('mars', progDate); // V5.3
  console.assert(!isNaN(sunProg),  '[Prog] NaN Soleil progressé — vérifier JD bissextile');
  console.assert(!isNaN(moonProg), '[Prog] NaN Lune progressée');
  console.assert(!isNaN(marsProg), '[Prog] NaN Mars progressé'); // V5.3

  // ── Planètes natales (longitude reconstruite depuis pl[]) ──
  const natalPlanets = astro.pl
    .filter(p => !['southNode', 'chiron', 'lilith'].includes(p.k))
    .map(p => ({ k: p.k, lon: planetPosToLong(p.s, p.d) }));

  // ── A1.3 : Aspects progressions secondaires ──
  const progAspectsSun  = detectAspects(sunProg,  'Sun',  natalPlanets);
  const progAspectsMoon = detectAspects(moonProg, 'Moon', natalPlanets);

  // V5.3 — Mars progressé : amplitude ×0.8 vs Soleil/Lune
  // Utilise MARS_PROG_SCORES au lieu de ASPECT_SCORES
  const progAspectsMars: ProgressionAspect[] = [];
  for (const natal of natalPlanets) {
    const dist = angDist(marsProg, natal.lon);
    for (const asp of ASPECT_ANGLES) {
      const orb = Math.abs(dist - asp.angle);
      if (orb <= ORB_DEG) {
        const baseScore = MARS_PROG_SCORES[asp.name] ?? 0;
        progAspectsMars.push({
          progPlanet: 'Mars',
          natalPlanet: natal.k,
          aspect: asp.name,
          orbDeg: +orb.toFixed(3),
          points: +(baseScore * (1 - orb / ORB_DEG)).toFixed(2),
        });
      }
    }
  }

  const allProgAspects = [...progAspectsSun, ...progAspectsMoon, ...progAspectsMars];

  let progressionsScore = allProgAspects.reduce((s, a) => s + a.points, 0);
  progressionsScore = Math.max(-16, Math.min(16, +progressionsScore.toFixed(1))); // V5.3 : cap ±14→±16

  // ── A1.4 : Solar Arc ──
  const sunNatal = natalPlanets.find(p => p.k === 'sun')?.lon ?? 0;
  const arcDelta = ((sunProg - sunNatal) % 360 + 360) % 360;

  // Positions Solar Arc : planètes natales + arcDelta (tous sauf Lune — trop rapide)
  const saPlanets = natalPlanets
    .filter(p => p.k !== 'moon')
    .map(p => ({ k: `SA_${p.k}`, lon: (p.lon + arcDelta) % 360 }));

  // Aspects Solar Arc (conj, opp, carré seulement — Tyl)
  const saAngles = ASPECT_ANGLES.filter(a => ['conjunction', 'opposition', 'square'].includes(a.name));
  const solarArcAspects: SolarArcAspect[] = [];
  for (const sa of saPlanets) {
    const natalName = sa.k.replace('SA_', '');
    for (const natal of natalPlanets) {
      if (natal.k === natalName) continue; // même planète → skip
      const dist = angDist(sa.lon, natal.lon);
      for (const asp of saAngles) {
        const orb = Math.abs(dist - asp.angle);
        if (orb <= ORB_DEG) {
          solarArcAspects.push({
            saPlanet: natalName,
            natalPlanet: natal.k,
            aspect: asp.name,
            orbDeg: +orb.toFixed(3),
            points: +(ASPECT_SCORES[asp.name] * 0.8 * (1 - orb / ORB_DEG)).toFixed(2), // amp ×0.8 vs prog
          });
        }
      }
    }
  }

  let solarArcScore = solarArcAspects.reduce((s, a) => s + a.points, 0);
  solarArcScore = Math.max(-8, Math.min(8, +solarArcScore.toFixed(1)));

  // ── Fusion Prog + SA (Ronde #2 — consensus Delphi) ──
  // Intra-technique : somme saturée par planète natale (unanimité 3/3)
  // Inter même signe : dominant + 0.5 × secondary (majorité GPT+Grok)
  // Inter signe opposé : norme L2 vectorielle sign(dom) × √(p²+s²) (majorité GPT+Gemini)

  const CAP_PROG_PER_NATAL = 10;
  const CAP_SA_PER_NATAL = 6;

  // 1. Intra-technique : somme saturée par planète natale
  const progByNatal = new Map<string, number>();
  allProgAspects.forEach(a => {
    progByNatal.set(a.natalPlanet, (progByNatal.get(a.natalPlanet) ?? 0) + a.points);
  });
  for (const [k, v] of progByNatal) {
    progByNatal.set(k, +Math.max(-CAP_PROG_PER_NATAL, Math.min(CAP_PROG_PER_NATAL, v)).toFixed(1));
  }

  const saByNatal = new Map<string, number>();
  solarArcAspects.forEach(a => {
    saByNatal.set(a.natalPlanet, (saByNatal.get(a.natalPlanet) ?? 0) + a.points);
  });
  for (const [k, v] of saByNatal) {
    saByNatal.set(k, +Math.max(-CAP_SA_PER_NATAL, Math.min(CAP_SA_PER_NATAL, v)).toFixed(1));
  }

  // 2. Inter-technique : fusion par planète natale
  let combinedScore = 0;
  const allNatals = new Set([...progByNatal.keys(), ...saByNatal.keys()]);
  for (const nat of allNatals) {
    const pPts = progByNatal.get(nat) ?? 0;
    const sPts = saByNatal.get(nat) ?? 0;

    if (!pPts || !sPts) {
      // Un seul actif → tel quel
      combinedScore += pPts + sPts;
    } else if (Math.sign(pPts) === Math.sign(sPts)) {
      // Même signe → anti-redondance partielle (dominant + 0.5 × secondary)
      const dominant = Math.abs(pPts) >= Math.abs(sPts) ? pPts : sPts;
      const secondary = Math.abs(pPts) >= Math.abs(sPts) ? sPts : pPts;
      combinedScore += dominant + 0.5 * secondary;
    } else {
      // Signe opposé → norme L2 vectorielle (suractivation ambivalente)
      // sign(dominant) × √(p² + s²) — zéro constante arbitraire
      const dominant = Math.abs(pPts) >= Math.abs(sPts) ? pPts : sPts;
      combinedScore += Math.sign(dominant) * Math.sqrt(pPts * pPts + sPts * sPts);
    }
  }
  const totalScore = Math.max(-15, Math.min(15, +combinedScore.toFixed(1)));

  // ── Breakdown narratif ──
  const breakdown: string[] = [];
  const sunSign  = SIGNS[Math.floor(sunProg  / 30)];
  const moonSign = SIGNS[Math.floor(moonProg / 30)];
  const marsSign = SIGNS[Math.floor(marsProg / 30)]; // V5.3

  allProgAspects.forEach(a => {
    const sign = a.points > 0 ? '+' : '';
    const icon = a.progPlanet === 'Sun' ? '☀' : a.progPlanet === 'Moon' ? '☽' : '♂'; // V5.3
    breakdown.push(`${icon} ${a.progPlanet} prog ${a.aspect} ${a.natalPlanet} (${sign}${a.points.toFixed(1)})`);
  });
  solarArcAspects.slice(0, 3).forEach(a => { // max 3 SA dans breakdown
    const sign = a.points > 0 ? '+' : '';
    breakdown.push(`◎ SA ${a.saPlanet} ${a.aspect} ${a.natalPlanet} (${sign}${a.points.toFixed(1)})`);
  });

  const result: ProgressionsResult = {
    progressed: { sunLongitude: sunProg, moonLongitude: moonProg, marsLongitude: marsProg, sunSign, moonSign, marsSign }, // V5.3
    aspects: allProgAspects,
    solarArcAspects,
    progressionsScore,
    solarArcScore,
    totalScore,
    breakdown,
    cacheKey,
  };

  _progCache.set(cacheKey, result);
  return result;
}
