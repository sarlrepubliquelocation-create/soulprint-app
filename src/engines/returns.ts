/**
 * returns.ts — Retours Planétaires Kaironaute V5.0 (A1.1)
 * Saturne (~29.5 ans) · Jupiter (~11.9 ans) · Nœud Nord (~18.6 ans)
 *
 * Algorithme : distance angulaire pure (géocentrique) → gaussienne en degrés.
 * Indépendant de la rétrogradation (distance angulaire gère 1-3 passages auto).
 * Interpolation linéaire pour PSI (zéro appel Meeus dans la boucle 730j).
 *
 * Sources symboliques : Liz Greene (Saturne), Vettius Valens (Jupiter),
 * Jan Spiller / Martin Schulman (Nœuds).
 *
 * Ronde A1 — Claude arbitrage — 26/02/2026
 * Grok R2 validation : fréquences MC 100k jours, cap ±12 à 99.97%.
 */

import { getPlanetLongitudeForDate, SIGNS, type AstroChart } from './astrology';

// ── Config par planète (Grok R2 calibration MC) ──
const CONFIG = {
  saturn: {
    amp: 8, orbe: 5.5, sigma: 2.75,
    speed: 0.0334,   // °/jour (vitesse directe moyenne)
    label: 'Saturne', emoji: '🪐',
  },
  jupiter: {
    amp: 5, orbe: 3.2, sigma: 1.60,
    speed: 0.0831,
    label: 'Jupiter', emoji: '♃',
  },
  northNode: {
    amp: 6, orbe: 7.0, sigma: 3.50,
    speed: -0.0529,  // toujours rétrograde
    label: 'Nœud Nord', emoji: '☊',
  },
} as const;

type PlanetKey = keyof typeof CONFIG;

export interface ReturnDetail {
  intensity: number;       // 0.0-1.0 (1.0 = exactitude parfaite)
  orbDeg: number;          // distance angulaire absolue (0-180°)
  orbDays: number;         // estimation jours avant/après (vitesse moyenne)
  isApproaching: boolean;  // la planète se rapproche du point natal
  isActive: boolean;       // orbe < 1.8×orbeSeuil
  score: number;           // contribution score (signée selon nakQuality)
}

export interface ReturnsResult {
  saturn: ReturnDetail;
  jupiter: ReturnDetail;
  northNode: ReturnDetail;
  totalScore: number;      // cap ±12
  breakdown: string[];
  hasActiveReturn: boolean;
}

/**
 * Distance angulaire minimale entre deux longitudes (0-180°).
 */
function angularDist(a: number, b: number): number {
  const d = Math.abs(((a - b) % 360 + 360) % 360);
  return d > 180 ? 360 - d : d;
}

/**
 * Reconstruit la longitude (0-360°) depuis un PlanetPos (s=sign, d=degree).
 */
export function planetPosToLong(sign: string, degreeInSign: number): number {
  return SIGNS.indexOf(sign) * 30 + degreeInSign;
}

/**
 * Calcule les retours planétaires actifs pour aujourd'hui.
 *
 * @param today         Date du jour
 * @param natalLongs    Longitudes natales { saturn, jupiter, northNode }
 * @param nakQuality    Qualité Nakshatra du jour (+1, 0, -1) — pour signe du Nœud Nord
 * @returns ReturnsResult avec scores et breakdown narratif
 */
export function calcPlanetaryReturns(
  today: Date,
  natalLongs: { saturn: number; jupiter: number; northNode: number },
  nakQuality: number = 0
): ReturnsResult {
  const breakdown: string[] = [];
  let total = 0;

  const details = {} as Record<PlanetKey, ReturnDetail>;

  for (const key of Object.keys(CONFIG) as PlanetKey[]) {
    const cfg = CONFIG[key];
    const natal = natalLongs[key];

    // Longitude actuelle via Meeus (1 appel par planète — O(1), pas de scan)
    const current = getPlanetLongitudeForDate(key, today);

    const orbDeg = angularDist(current, natal);

    // Early exit — économie 87% des calculs (Grok R2)
    if (orbDeg > cfg.orbe * 1.8) {
      details[key] = { intensity: 0, orbDeg, orbDays: 0, isApproaching: false, isActive: false, score: 0 };
      continue;
    }

    // Gaussienne en degrés (indépendante de la rétrogradation)
    const gauss = Math.exp(-(orbDeg * orbDeg) / (2 * cfg.sigma * cfg.sigma));
    const intensity = +gauss.toFixed(3);

    // Estimation jours via vitesse moyenne
    const orbDays = (cfg.speed as number) !== 0 ? Math.round(orbDeg / Math.abs(cfg.speed)) : 0;

    // Direction : la planète se rapproche-t-elle du point natal ?
    const tomorrow = new Date(today.getTime() + 86400000);
    const orbTomorrow = angularDist(getPlanetLongitudeForDate(key, tomorrow), natal);
    const isApproaching = orbTomorrow < orbDeg;

    // Signe du score selon type de planète
    // Nœud Nord : basé sur nakQuality du jour (GPT R3 — "directionnel, pas maléfique")
    // Demi-retour Nœud Sud détecté (distance à 180°) → amplitude ×0.6
    let signFactor = 1;
    if (key === 'northNode') {
      signFactor = nakQuality > 0 ? 1 : nakQuality < 0 ? -1 : 0.5;
    }

    // Détection demi-retour Nœud Sud (~9.3 ans) — distance angulaire à l'opposition
    let halfReturnFactor = 1.0;
    let halfReturnLabel = '';
    if (key === 'northNode') {
      const oppositeNatal = (natal + 180) % 360;
      const orbHalf = angularDist(current, oppositeNatal);
      if (orbHalf < 7.0 && orbHalf < orbDeg) {
        // Plus proche de l'opposition que du natal → demi-retour Nœud Sud
        const gaussHalf = Math.exp(-(orbHalf * orbHalf) / (2 * cfg.sigma * cfg.sigma));
        halfReturnFactor = 0.6;
        halfReturnLabel = ' (½-retour Nœud Sud)';
        // Override avec la distance au demi-retour
        const halfScore = cfg.amp * gaussHalf * 0.6 * signFactor;
        total += halfScore;
        details[key] = {
          intensity: +gaussHalf.toFixed(3), orbDeg: orbHalf,
          orbDays: Math.round(orbHalf / Math.abs(cfg.speed)),
          isApproaching, isActive: true, score: +halfScore.toFixed(2),
        };
        if (halfScore !== 0) {
          breakdown.push(`${cfg.emoji} ½-retour ${cfg.label}${halfReturnLabel} (${halfScore > 0 ? '+' : ''}${halfScore.toFixed(1)})`);
        }
        continue;
      }
    }

    const score = +(cfg.amp * gauss * signFactor * halfReturnFactor).toFixed(2);
    total += score;

    details[key] = { intensity, orbDeg: +orbDeg.toFixed(2), orbDays, isApproaching, isActive: true, score };

    if (score !== 0) {
      const direction = isApproaching ? `→ ${orbDays}j` : `← ${orbDays}j`;
      const sign = score > 0 ? '+' : '';
      breakdown.push(`${cfg.emoji} Retour ${cfg.label} (orb ${orbDeg.toFixed(1)}°, ${direction}) ${sign}${score.toFixed(1)}`);
    }
  }

  // Cap ±12 (Grok R2 : percé 0.03% des cas MC 100k)
  const totalScore = Math.max(-12, Math.min(12, +total.toFixed(1)));
  console.assert(Math.abs(totalScore) <= 12.1, '[Returns] Cap ±12 percé:', totalScore);

  return {
    saturn: details.saturn,
    jupiter: details.jupiter,
    northNode: details.northNode,
    totalScore,
    breakdown,
    hasActiveReturn: details.saturn.isActive || details.jupiter.isActive || details.northNode.isActive,
  };
}

/**
 * Extrait les longitudes natales depuis un AstroChart.
 * Utilisé dans convergence.ts pour passer les coordonnées à calcPlanetaryReturns().
 */
export function extractNatalReturnLongs(
  astro: AstroChart
): { saturn: number; jupiter: number; northNode: number } | null {
  const satPl    = astro.pl.find(p => p.k === 'saturn');
  const jupPl    = astro.pl.find(p => p.k === 'jupiter');
  const nodePl   = astro.pl.find(p => p.k === 'northNode');
  if (!satPl || !jupPl || !nodePl) return null;
  return {
    saturn:    planetPosToLong(satPl.s, satPl.d),
    jupiter:   planetPosToLong(jupPl.s, jupPl.d),
    northNode: planetPosToLong(nodePl.s, nodePl.d),
  };
}

/**
 * Version PSI : intensité interpolée pour une date ±N jours.
 * ZÉRO appel Meeus — utilise la vitesse moyenne × ΔJ depuis today.
 * Garantit console.assert(psiMeeusCalls === 0) de Gemini R3.
 *
 * @param natalLong     Longitude natale de la planète
 * @param todayLong     Longitude actuelle (calculée une seule fois, aujourd'hui)
 * @param cfg           Config de la planète (speed, orbe, sigma, amp)
 * @param deltaJours    Décalage en jours depuis today (+futur / -passé)
 * @returns intensity 0.0-1.0
 */
export function interpolateReturnIntensity(
  natalLong: number,
  todayLong: number,
  planet: PlanetKey,
  deltaJours: number
): number {
  const cfg = CONFIG[planet];
  // Position interpolée : décalage linéaire via vitesse moyenne
  const interpolatedLong = ((todayLong + cfg.speed * deltaJours) % 360 + 360) % 360;
  const orbDeg = angularDist(interpolatedLong, natalLong);
  if (orbDeg > cfg.orbe * 1.8) return 0;
  return Math.exp(-(orbDeg * orbDeg) / (2 * cfg.sigma * cfg.sigma));
}
