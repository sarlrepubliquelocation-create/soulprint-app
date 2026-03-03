// ═══ SOLAR RETURN ENGINE V6.0 ═══
// Révolution Solaire — 4 règles sans Maisons (Gemini R2 + Grok R2)
// Décisions verrouillées : Ronde V6.0 R1+R2
//
// Algorithme :
//   Binary search ±2j autour de l'anniversaire
//   Critère : |sunLong(t) - natalSunLong| < 0.0005°
//   ~12-15 itérations Meeus, ~0.5-1ms
//   Max 20 itérations guard
//
// 4 règles actives (sans calcul de Maisons) :
//   R1 : ASC SR dans signe natal (+3)
//   R2 : Saturne SR conj planète personnelle natale ±3° (-3)
//   R3 : Jupiter SR conj Soleil/Lune/MC natal ±3° (+3)
//   R5 : Stellium SR ≥3 planètes dans signe natal du Soleil (±2)
//
// Cap total : ±6
// Intégration : additionné à slowAstroDelta dans convergence.ts
// ═══════════════════════════════════════════════════════════════

import { getPlanetLongitudeForDate, SIGNS } from './astrology';
import { planetPosToLong } from './returns';

// ── Types ──

export interface SolarReturnResult {
  srDate: Date | null;       // date exacte de la Révolution Solaire
  totalScore: number;        // cap ±6
  breakdown: string[];       // détails des règles actives
  hasActiveSR: boolean;      // SR dans fenêtre ±6 mois
}

// ── Constantes ──

const TOLERANCE_DEG  = 0.0005;  // précision binary search
const MAX_ITERATIONS = 50;      // V9 Sprint 1 : 20→50 (couvre 29 fév + ayanamsa lent)
const SR_WINDOW_MS   = 183 * 24 * 60 * 60 * 1000; // ±6 mois en ms

// ── Helpers ──

/** Différence angulaire signée [-180, +180] */
function angleDiff(a: number, b: number): number {
  let d = ((a - b) % 360 + 360) % 360;
  if (d > 180) d -= 360;
  return d;
}

/** Vrai si deux longitudes sont dans l'orbe donné */
function inOrb(longA: number, longB: number, orb: number): boolean {
  return Math.abs(angleDiff(longA, longB)) <= orb;
}

/** Longitude écliptique du Soleil à une date */
function sunLong(date: Date): number {
  return getPlanetLongitudeForDate('sun', date);
}

/** Signe zodiacal (0-11) depuis longitude */
function signIndex(long: number): number {
  return Math.floor(((long % 360) + 360) % 360 / 30);
}

// ── Binary Search Solar Return ──

function findSolarReturnDate(
  natalSunLong: number,
  birthDate: Date,
  targetYear: number,
): Date | null {
  // Borne initiale : ±3 jours autour de la date anniversaire de l'année cible
  // V9 Sprint 1 : ±2j→±3j pour couvrir les cas limites (29 fév, épheméride lente)
  const approx = new Date(birthDate);
  approx.setFullYear(targetYear);

  let lo = new Date(approx.getTime() - 3 * 86400000);
  let hi = new Date(approx.getTime() + 3 * 86400000);

  // Gestion du crossing 0°/360° (natalSunLong ~359°)
  const loLong = sunLong(lo);
  const hiLong = sunLong(hi);
  const diff = angleDiff(hiLong, loLong);
  if (diff < 0) {
    // Soleil en régression dans la fenêtre — élargir
    lo = new Date(approx.getTime() - 3 * 86400000);
    hi = new Date(approx.getTime() + 3 * 86400000);
  }

  let iterations = 0;
  while (iterations < MAX_ITERATIONS) {
    const mid = new Date((lo.getTime() + hi.getTime()) / 2);
    const midLong = sunLong(mid);
    const delta = angleDiff(midLong, natalSunLong);

    if (Math.abs(delta) < TOLERANCE_DEG) return mid;

    if (delta > 0) {
      hi = mid; // Soleil trop avancé → chercher plus tôt
    } else {
      lo = mid; // Soleil pas encore arrivé → chercher plus tard
    }
    iterations++;
  }

  console.warn('[SolarReturn] Binary search non convergé après', MAX_ITERATIONS, 'itérations');
  return null;
}

// ── Scoring 4 règles ──

function scoreSolarReturn(
  srDate: Date,
  natalSunLong: number,
  natalMoonLong: number | null,
  natalAscLong: number | null,
  natalMCLong: number | null,
  natalSaturnLong: number | null,
  natalVenusLong: number | null,
  natalMarsLong: number | null,
): { score: number; breakdown: string[] } {
  const breakdown: string[] = [];
  let score = 0;

  // ── R1 : ASC SR dans signe natal du Soleil
  // Approximation sans Maisons : Soleil SR dans signe natal = résonance identitaire
  const srSunLong = getPlanetLongitudeForDate('sun', srDate);
  const srSaturnLong = getPlanetLongitudeForDate('saturn', srDate);
  const srJupiterLong = getPlanetLongitudeForDate('jupiter', srDate);
  const srMercuryLong = getPlanetLongitudeForDate('mercury', srDate);
  const srVenusLong = getPlanetLongitudeForDate('venus', srDate);

  // R1 : Soleil SR dans même signe que natal (proxy ASC SR sans calcul de Maisons)
  const natalSunSign = signIndex(natalSunLong);
  const srSunSign = signIndex(srSunLong);
  if (natalSunSign === srSunSign) {
    score += 3;
    breakdown.push(`SR R1 +3 : Soleil SR dans ${SIGNS[natalSunSign]} (signe natal) — résonance identitaire`);
  }

  // R2 : Saturne SR conjonction planète personnelle natale ±3°
  const personalNatal: Array<{ long: number | null; label: string }> = [
    { long: natalSunLong,     label: 'Soleil natal'  },
    { long: natalMoonLong,    label: 'Lune natale'   },
    { long: natalVenusLong,   label: 'Vénus natal'   },
    { long: natalMarsLong,    label: 'Mars natal'    },
    { long: natalAscLong,     label: 'ASC natal'     },
  ];

  for (const p of personalNatal) {
    if (p.long !== null && inOrb(srSaturnLong, p.long, 3)) {
      score -= 3;
      breakdown.push(`SR R2 -3 : Saturne SR conj ${p.label} — restriction structurelle`);
      break; // un seul malus R2 max
    }
  }

  // R3 : Jupiter SR conjonction Soleil/Lune/MC natal ±3°
  const keyNatal: Array<{ long: number | null; label: string }> = [
    { long: natalSunLong,  label: 'Soleil natal' },
    { long: natalMoonLong, label: 'Lune natale'  },
    { long: natalMCLong,   label: 'MC natal'     },
  ];

  for (const p of keyNatal) {
    if (p.long !== null && inOrb(srJupiterLong, p.long, 3)) {
      score += 3;
      breakdown.push(`SR R3 +3 : Jupiter SR conj ${p.label} — expansion annuelle`);
      break; // un seul bonus R3 max
    }
  }

  // R5 : Stellium SR ≥3 planètes dans le signe natal du Soleil (±2)
  const srPlanets = [srSunLong, srMercuryLong, srVenusLong, srSaturnLong, srJupiterLong];
  const stelliumCount = srPlanets.filter(l => signIndex(l) === natalSunSign).length;
  if (stelliumCount >= 3) {
    score += 2;
    breakdown.push(`SR R5 +2 : Stellium SR (${stelliumCount} planètes) dans ${SIGNS[natalSunSign]} — concentration d'énergie`);
  }

  // Cap ±6
  const capped = Math.max(-6, Math.min(6, score));
  if (capped !== score) {
    breakdown.push(`SR cap ±6 appliqué : ${score} → ${capped}`);
  }

  console.assert(Math.abs(capped) <= 6.1, '[SolarReturn] Cap ±6 percé:', capped);

  return { score: capped, breakdown };
}

// ── Fonction principale ──

export function calcSolarReturn(
  astro: {
    pl: Array<{ k: string; s: string; d: number }>;
    b3?: { asc?: string };
    ad?: number;
    mcSign?: string;
    mcDeg?: number;
  } | null,
  birthDateStr: string,
  today: Date = new Date(),
): SolarReturnResult {
  if (!astro) {
    return { srDate: null, totalScore: 0, breakdown: [], hasActiveSR: false };
  }

  try {
    // 1. Extraire longitudes natales
    let natalSunLong: number | null = null;
    let natalMoonLong: number | null = null;
    let natalSaturnLong: number | null = null;
    let natalVenusLong: number | null = null;
    let natalMarsLong: number | null = null;

    for (const pl of astro.pl) {
      const long = planetPosToLong(pl.s, pl.d);
      if (pl.k === 'sun')     natalSunLong    = long;
      if (pl.k === 'moon')    natalMoonLong   = long;
      if (pl.k === 'saturn')  natalSaturnLong = long;
      if (pl.k === 'venus')   natalVenusLong  = long;
      if (pl.k === 'mars')    natalMarsLong   = long;
    }

    const natalAscLong = astro.b3?.asc ? planetPosToLong(astro.b3.asc, astro.ad ?? 0) : null;
    const natalMCLong  = astro.mcSign  ? planetPosToLong(astro.mcSign, astro.mcDeg ?? 0) : null;

    if (natalSunLong === null) {
      return { srDate: null, totalScore: 0, breakdown: ['SR: Soleil natal introuvable'], hasActiveSR: false };
    }

    // 2. Trouver la SR la plus proche (année courante ou suivante)
    const birthDate = new Date(birthDateStr + 'T12:00:00');
    const currentYear = today.getFullYear();

    // Essayer année courante, puis suivante
    let srDate: Date | null = null;
    for (const yr of [currentYear, currentYear + 1]) {
      srDate = findSolarReturnDate(natalSunLong, birthDate, yr);
      if (srDate) break;
    }

    if (!srDate) {
      return { srDate: null, totalScore: 0, breakdown: ['SR: binary search échoué'], hasActiveSR: false };
    }

    // 3. Vérifier si la SR est dans la fenêtre active ±6 mois
    const timeDiff = Math.abs(srDate.getTime() - today.getTime());
    const hasActiveSR = timeDiff <= SR_WINDOW_MS;

    if (!hasActiveSR) {
      return { srDate, totalScore: 0, breakdown: [], hasActiveSR: false };
    }

    // 4. Scorer les 4 règles
    const { score, breakdown } = scoreSolarReturn(
      srDate,
      natalSunLong,
      natalMoonLong,
      natalAscLong,
      natalMCLong,
      natalSaturnLong,
      natalVenusLong,
      natalMarsLong,
    );

    return { srDate, totalScore: score, breakdown, hasActiveSR };

  } catch (e) {
    console.warn('[SolarReturn] Calcul échoué:', e);
    return { srDate: null, totalScore: 0, breakdown: [], hasActiveSR: false };
  }
}
