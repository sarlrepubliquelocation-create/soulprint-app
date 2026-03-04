// ══════════════════════════════════════
// ═══ FIXED STARS — V9.6 Sprint A3 ═══
// Étoiles fixes : conjunctions transits → scoring quotidien
// Source longitudes : Swiss Ephemeris 2025, vérifié par Grok Ronde IA 2 (2026-03-04)
// Source deltas     : Robson (1923), Ebertin (1971), Brady (1998)
// ══════════════════════════════════════

import { getPlanetLongitudeForDate } from './astrology';

// ─── Constantes ────────────────────────────────────────────────────────────

/** Précession tropicale : ~50.3"/an = 0.01397°/an */
const PRECESSION_DEG_PER_YEAR = 0.01397;

/** Année de référence des longitudes tabulées */
const EPOCH_YEAR = 2025;

/** Planètes scrutées pour conjunction étoile fixe */
const FIXED_STAR_PLANETS = [
  'sun', 'moon', 'mercury', 'venus', 'mars',
  'jupiter', 'saturn',
] as const;

type FSPlanet = typeof FIXED_STAR_PLANETS[number];

/** Labels français pour les planètes */
const PLANET_FR: Record<FSPlanet, string> = {
  sun: 'Soleil', moon: 'Lune', mercury: 'Mercure',
  venus: 'Vénus', mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturne',
};

// ─── Types ─────────────────────────────────────────────────────────────────

export interface FixedStar {
  name: string;          // Nom de l'étoile (français/international)
  nameFr: string;        // Nom affiché en français
  lon2025: number;       // Longitude tropicale 2025 (°, 0-360)
  nature: 'benefic' | 'malefic' | 'mixed'; // Nature générale
  /** Delta scoring conjonction exacte (±0°30') */
  deltaExact: { pos: number; neg: number };
  /** Delta scoring conjonction large (±1°30') */
  deltaWide:  { pos: number; neg: number };
  source: string;        // Source classique
  icon: string;
}

export interface FixedStarHit {
  star: string;          // Nom de l'étoile
  planet: string;        // Planète transitante (FR)
  orb: number;           // Orbe en degrés
  isExact: boolean;      // ≤0.5°
  delta: number;         // Points attribués
  signal: string;        // Texte signal/alerte
}

export interface FixedStarResult {
  total: number;
  hits: FixedStarHit[];
  signals: string[];
  alerts: string[];
}

// ─── Données étoiles fixes ─────────────────────────────────────────────────

/**
 * 10 étoiles fixes majeures — longitudes Swiss Ephemeris 2025.
 * Deltas justifiés par sources classiques (Robson/Ebertin/Brady).
 *
 * Logique delta :
 *  - Étoile bénéfique pure (Spica, Sirius, Fomalhaut) : pos seulement
 *  - Étoile mixte (Régulus, Aldébaran, etc.)           : pos si bénéfique, neg si malefic
 *  - Étoile maléfique (Algol)                          : neg fort, pos minime (maîtrise)
 */
export const FIXED_STARS: FixedStar[] = [
  {
    name: 'Regulus',
    nameFr: 'Régulus',
    lon2025: 150.183, // 00°11' Virgo
    nature: 'mixed',
    deltaExact: { pos: 4, neg: -3 },
    deltaWide:  { pos: 2, neg: -1 },
    source: 'Robson: "Honours and preferment" / Ebertin: "Success, power"',
    icon: '👑',
  },
  {
    name: 'Spica',
    nameFr: 'Spica',
    lon2025: 204.183, // 24°11' Libra
    nature: 'benefic',
    deltaExact: { pos: 5, neg: 0 },
    deltaWide:  { pos: 3, neg: 0 },
    source: 'Robson: "Unbounded good fortune, gifts, refinement" / Brady: "Protection"',
    icon: '🌟',
  },
  {
    name: 'Aldebaran',
    nameFr: 'Aldébaran',
    lon2025: 70.133, // 10°08' Gemini
    nature: 'mixed',
    deltaExact: { pos: 3, neg: -3 },
    deltaWide:  { pos: 1, neg: -1 },
    source: 'Robson: "Honour, integrity / danger from enemies" / Ebertin: "Royal Star"',
    icon: '🔴',
  },
  {
    name: 'Antares',
    nameFr: 'Antarès',
    lon2025: 250.117, // 10°07' Sagittarius
    nature: 'mixed',
    deltaExact: { pos: 3, neg: -4 },
    deltaWide:  { pos: 1, neg: -2 },
    source: 'Robson: "Courage / violent death" / Ebertin: "Royal Star of war"',
    icon: '🔥',
  },
  {
    name: 'Fomalhaut',
    nameFr: 'Fomalhaut',
    lon2025: 334.217, // 04°13' Pisces
    nature: 'benefic',
    deltaExact: { pos: 4, neg: 0 },
    deltaWide:  { pos: 2, neg: 0 },
    source: 'Robson: "Lasting honours" / Brady: "Royal Star, idealism, success"',
    icon: '✨',
  },
  {
    name: 'Algol',
    nameFr: 'Algol',
    lon2025: 56.517, // 26°31' Taurus
    nature: 'malefic',
    deltaExact: { pos: 1, neg: -5 },
    deltaWide:  { pos: 0, neg: -3 },
    source: 'Robson: "Most evil star" / Ebertin: "Misfortune, violence, beheading"',
    icon: '💀',
  },
  {
    name: 'Sirius',
    nameFr: 'Sirius',
    lon2025: 104.433, // 14°26' Cancer
    nature: 'benefic',
    deltaExact: { pos: 4, neg: 0 },
    deltaWide:  { pos: 2, neg: 0 },
    source: 'Robson: "Fame, honour, wealth" / Brady: "Immortality, guardian"',
    icon: '⭐',
  },
  {
    name: 'Vega',
    nameFr: 'Véga',
    lon2025: 285.667, // 15°40' Capricorn
    nature: 'mixed',
    deltaExact: { pos: 3, neg: -1 },
    deltaWide:  { pos: 1, neg: 0 },
    source: 'Robson: "Artistic talent, magic" / Ebertin: "Refined but critical"',
    icon: '🎶',
  },
  {
    name: 'Arcturus',
    nameFr: 'Arcturus',
    lon2025: 204.583, // 24°35' Libra
    nature: 'mixed',
    deltaExact: { pos: 3, neg: -1 },
    deltaWide:  { pos: 1, neg: 0 },
    source: 'Robson: "Pioneer, explorer, riches through travel" / Brady',
    icon: '🧭',
  },
  {
    name: 'Capella',
    nameFr: 'Capella',
    lon2025: 82.200, // 22°12' Gemini
    nature: 'mixed',
    deltaExact: { pos: 2, neg: -1 },
    deltaWide:  { pos: 1, neg: 0 },
    source: 'Robson: "Versatility, curiosity, honour through learning"',
    icon: '📚',
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Longitude actuelle d'une étoile fixe (correction précession).
 * Δlon = (year - 2025) × 0.01397°
 */
function getStarLongitude(star: FixedStar, year: number): number {
  return (star.lon2025 + (year - EPOCH_YEAR) * PRECESSION_DEG_PER_YEAR + 360) % 360;
}

/** Distance angulaire minimale entre deux longitudes (0-360), retourne [0, 180] */
function angularDistance(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

// ─── API principale ────────────────────────────────────────────────────────

/**
 * Calcule le score étoiles fixes pour une date donnée.
 * Vérifie les conjonctions de 7 planètes (Soleil→Saturne) avec 10 étoiles fixes.
 *
 * Orbes :
 *  - Exacte : ≤0.5° → deltaExact
 *  - Large  : >0.5° et ≤1.5° → deltaWide
 *
 * Cap : ±8 (plafonné après sommation, pour cohérence avec architecture L1)
 */
export function calcFixedStarScore(date: Date): FixedStarResult {
  const year = date.getFullYear();
  const hits: FixedStarHit[] = [];
  const signals: string[] = [];
  const alerts: string[] = [];
  let total = 0;

  for (const planetKey of FIXED_STAR_PLANETS) {
    let planetLon: number;
    try {
      planetLon = getPlanetLongitudeForDate(planetKey, date);
    } catch {
      continue; // fail silently si planète indisponible
    }

    for (const star of FIXED_STARS) {
      const starLon = getStarLongitude(star, year);
      const orb = angularDistance(planetLon, starLon);

      if (orb > 1.5) continue; // hors orbe

      const isExact = orb <= 0.5;
      const deltas = isExact ? star.deltaExact : star.deltaWide;

      // Sélection du delta selon nature bénéfique ou maléfique
      // Règle : si maléfique (neg < 0 dominant), on applique neg ; sinon pos
      const delta = star.nature === 'malefic'
        ? deltas.neg
        : (star.nature === 'benefic' ? deltas.pos : (deltas.pos + deltas.neg) / 2 > 0 ? deltas.pos : deltas.neg);

      if (delta === 0) continue;

      total += delta;

      const orbStr = orb.toFixed(2) + '°';
      const precStr = isExact ? 'exacte' : 'large';
      const sign = delta > 0 ? '+' : '';
      const signal = `${star.icon} ${star.nameFr} ↔ ${PLANET_FR[planetKey]} (conj. ${precStr} ${orbStr}) → ${sign}${delta}`;

      hits.push({
        star: star.nameFr,
        planet: PLANET_FR[planetKey],
        orb,
        isExact,
        delta,
        signal,
      });

      if (delta > 0) signals.push(signal);
      else           alerts.push(signal);
    }
  }

  // Cap ±8 pour éviter que les étoiles fixes dominent le score L1
  const cappedTotal = Math.max(-8, Math.min(8, total));

  return { total: cappedTotal, hits, signals, alerts };
}
