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
 * 35 étoiles fixes — longitudes Swiss Ephemeris 2025 (tropical).
 * R25 : étendu de 10 à 35 pour crédibilité professionnelle.
 *
 * Deltas justifiés par sources classiques (Robson/Ebertin/Brady).
 * Logique delta :
 *  - Bénéfique pure : pos seulement (neg = 0)
 *  - Mixte : pos si bénéfique, neg si maléfique (moyenne pour sélection)
 *  - Maléfique : neg fort, pos minime (maîtrise possible)
 *
 * Magnitude : 1 = première grandeur (très brillante), 2 = deuxième, etc.
 * Tier : 'major' (les 10 originales, deltas forts) / 'notable' (25 ajoutées, deltas modérés)
 */
export const FIXED_STARS: FixedStar[] = [
  // ═══════════════════════════════════════════════════
  // TIER 1 — 10 MAJEURES (Royal Stars + top classiques)
  // ═══════════════════════════════════════════════════
  {
    name: 'Regulus',
    nameFr: 'Régulus',
    lon2025: 150.183, // 00°11' Virgo — Cœur du Lion
    nature: 'mixed',
    deltaExact: { pos: 4, neg: -3 },
    deltaWide:  { pos: 2, neg: -1 },
    source: 'Robson: "Honours and preferment" / Ebertin: "Success, power"',
    icon: '👑',
  },
  {
    name: 'Spica',
    nameFr: 'Spica',
    lon2025: 204.183, // 24°11' Libra — Épi de la Vierge
    nature: 'benefic',
    deltaExact: { pos: 5, neg: 0 },
    deltaWide:  { pos: 3, neg: 0 },
    source: 'Robson: "Unbounded good fortune, gifts, refinement" / Brady: "Protection"',
    icon: '🌟',
  },
  {
    name: 'Aldebaran',
    nameFr: 'Aldébaran',
    lon2025: 70.133, // 10°08' Gemini — Œil du Taureau
    nature: 'mixed',
    deltaExact: { pos: 3, neg: -3 },
    deltaWide:  { pos: 1, neg: -1 },
    source: 'Robson: "Honour, integrity / danger from enemies" / Ebertin: "Royal Star"',
    icon: '🔴',
  },
  {
    name: 'Antares',
    nameFr: 'Antarès',
    lon2025: 250.117, // 10°07' Sagittarius — Cœur du Scorpion
    nature: 'mixed',
    deltaExact: { pos: 3, neg: -4 },
    deltaWide:  { pos: 1, neg: -2 },
    source: 'Robson: "Courage / violent death" / Ebertin: "Royal Star of war"',
    icon: '🔥',
  },
  {
    name: 'Fomalhaut',
    nameFr: 'Fomalhaut',
    lon2025: 334.217, // 04°13' Pisces — Royal Star du Sud
    nature: 'benefic',
    deltaExact: { pos: 4, neg: 0 },
    deltaWide:  { pos: 2, neg: 0 },
    source: 'Robson: "Lasting honours" / Brady: "Royal Star, idealism, success"',
    icon: '✨',
  },
  {
    name: 'Algol',
    nameFr: 'Algol',
    lon2025: 56.517, // 26°31' Taurus — Tête de Méduse
    nature: 'malefic',
    deltaExact: { pos: 1, neg: -5 },
    deltaWide:  { pos: 0, neg: -3 },
    source: 'Robson: "Most evil star" / Ebertin: "Misfortune, violence, beheading"',
    icon: '💀',
  },
  {
    name: 'Sirius',
    nameFr: 'Sirius',
    lon2025: 104.433, // 14°26' Cancer — étoile la plus brillante du ciel
    nature: 'benefic',
    deltaExact: { pos: 4, neg: 0 },
    deltaWide:  { pos: 2, neg: 0 },
    source: 'Robson: "Fame, honour, wealth" / Brady: "Immortality, guardian"',
    icon: '⭐',
  },
  {
    name: 'Vega',
    nameFr: 'Véga',
    lon2025: 285.667, // 15°40' Capricorn — Alpha Lyrae
    nature: 'mixed',
    deltaExact: { pos: 3, neg: -1 },
    deltaWide:  { pos: 1, neg: 0 },
    source: 'Robson: "Artistic talent, magic" / Ebertin: "Refined but critical"',
    icon: '🎶',
  },
  {
    name: 'Arcturus',
    nameFr: 'Arcturus',
    lon2025: 204.583, // 24°35' Libra — Alpha Boötis
    nature: 'mixed',
    deltaExact: { pos: 3, neg: -1 },
    deltaWide:  { pos: 1, neg: 0 },
    source: 'Robson: "Pioneer, explorer, riches through travel" / Brady',
    icon: '🧭',
  },
  {
    name: 'Capella',
    nameFr: 'Capella',
    lon2025: 82.200, // 22°12' Gemini — Alpha Aurigae
    nature: 'mixed',
    deltaExact: { pos: 2, neg: -1 },
    deltaWide:  { pos: 1, neg: 0 },
    source: 'Robson: "Versatility, curiosity, honour through learning"',
    icon: '📚',
  },

  // ═══════════════════════════════════════════════════
  // TIER 2 — 25 NOTABLES (classiques Robson/Ebertin)
  // Deltas plus modérés : exact ±2-3, wide ±1
  // ═══════════════════════════════════════════════════

  // --- ORION & GRANDS CHASSEURS ---
  {
    name: 'Rigel',
    nameFr: 'Rigel',
    lon2025: 77.167, // 17°10' Gemini — Pied d'Orion, mag 0.13
    nature: 'benefic',
    deltaExact: { pos: 3, neg: 0 },
    deltaWide:  { pos: 1, neg: 0 },
    source: 'Robson: "Splendour, mechanical ability, inventiveness" / Ebertin: "Quick rise"',
    icon: '💎',
  },
  {
    name: 'Betelgeuse',
    nameFr: 'Bételgeuse',
    lon2025: 89.267, // 29°16' Gemini — Épaule d'Orion, mag 0.42
    nature: 'mixed',
    deltaExact: { pos: 3, neg: -1 },
    deltaWide:  { pos: 1, neg: 0 },
    source: 'Robson: "Martial honours, preferment, wealth" / Ebertin: "Fame"',
    icon: '🔶',
  },
  {
    name: 'Bellatrix',
    nameFr: 'Bellatrix',
    lon2025: 81.233, // 21°14' Gemini — Épaule gauche d'Orion, mag 1.64
    nature: 'mixed',
    deltaExact: { pos: 2, neg: -2 },
    deltaWide:  { pos: 1, neg: -1 },
    source: 'Robson: "Quick decision-making, courage, but rash" / Ebertin: "Ambition"',
    icon: '⚔️',
  },

  // --- GÉMEAUX & CANIS ---
  {
    name: 'Pollux',
    nameFr: 'Pollux',
    lon2025: 113.467, // 23°28' Cancer — Beta Geminorum, mag 1.14
    nature: 'mixed',
    deltaExact: { pos: 2, neg: -2 },
    deltaWide:  { pos: 1, neg: -1 },
    source: 'Robson: "Spirited, audacious, cruel if afflicted" / Ebertin: "Pugnacity"',
    icon: '👊',
  },
  {
    name: 'Castor',
    nameFr: 'Castor',
    lon2025: 110.533, // 20°32' Cancer — Alpha Geminorum, mag 1.58
    nature: 'mixed',
    deltaExact: { pos: 2, neg: -1 },
    deltaWide:  { pos: 1, neg: 0 },
    source: 'Robson: "Distinction, keen intellect, good for writers" / Ebertin',
    icon: '✍️',
  },
  {
    name: 'Procyon',
    nameFr: 'Procyon',
    lon2025: 116.017, // 26°01' Cancer — Alpha Canis Minoris, mag 0.34
    nature: 'mixed',
    deltaExact: { pos: 2, neg: -1 },
    deltaWide:  { pos: 1, neg: 0 },
    source: 'Robson: "Activity, violence of temper, sudden rise then fall"',
    icon: '🐕',
  },
  {
    name: 'Canopus',
    nameFr: 'Canopus',
    lon2025: 105.283, // 15°17' Cancer — 2e étoile du ciel, mag -0.74
    nature: 'benefic',
    deltaExact: { pos: 3, neg: 0 },
    deltaWide:  { pos: 1, neg: 0 },
    source: 'Robson: "Voyages, fame, learning" / Brady: "Pathfinder"',
    icon: '🚢',
  },

  // --- GRANDE OURSE & ÉTOILES POLAIRES ---
  {
    name: 'Deneb Algedi',
    nameFr: 'Deneb Algedi',
    lon2025: 353.700, // 23°42' Aquarius — Delta Capricorni, mag 2.85
    nature: 'mixed',
    deltaExact: { pos: 2, neg: -1 },
    deltaWide:  { pos: 1, neg: 0 },
    source: 'Robson: "Life ruled by justice, sorrow but eventual success"',
    icon: '⚖️',
  },
  {
    name: 'Deneb',
    nameFr: 'Deneb',
    lon2025: 335.567, // 05°34' Pisces — Alpha Cygni, mag 1.25
    nature: 'benefic',
    deltaExact: { pos: 2, neg: 0 },
    deltaWide:  { pos: 1, neg: 0 },
    source: 'Robson: "Ingenious, clever, valiant" / Brady: "Cygnus — creativity"',
    icon: '🦢',
  },

  // --- SCORPION & SERPENT ---
  {
    name: 'Achernar',
    nameFr: 'Achernar',
    lon2025: 345.533, // 15°32' Pisces — Alpha Eridani, mag 0.46
    nature: 'benefic',
    deltaExact: { pos: 3, neg: 0 },
    deltaWide:  { pos: 1, neg: 0 },
    source: 'Robson: "Success in public life, religious beneficence"',
    icon: '🌊',
  },
  {
    name: 'Zuben Elgenubi',
    nameFr: 'Zuben Elgenubi',
    lon2025: 195.417, // 15°25' Libra — Alpha Librae, mag 2.75
    nature: 'malefic',
    deltaExact: { pos: 0, neg: -2 },
    deltaWide:  { pos: 0, neg: -1 },
    source: 'Robson: "Unforgiving, revengeful, malevolent, disgrace"',
    icon: '⚠️',
  },
  {
    name: 'Zuben Eschamali',
    nameFr: 'Zuben Eschamali',
    lon2025: 199.667, // 19°40' Libra — Beta Librae, mag 2.61
    nature: 'benefic',
    deltaExact: { pos: 2, neg: 0 },
    deltaWide:  { pos: 1, neg: 0 },
    source: 'Robson: "Good fortune, high ambition, honours"',
    icon: '🌿',
  },

  // --- PLÉIADES & TAUREAU ---
  {
    name: 'Alcyone',
    nameFr: 'Alcyone (Pléiades)',
    lon2025: 60.333, // 00°20' Gemini — Brightest Pleiad, mag 2.87
    nature: 'mixed',
    deltaExact: { pos: 1, neg: -2 },
    deltaWide:  { pos: 0, neg: -1 },
    source: 'Robson: "Ambition, eminence, then disgrace" / Ebertin: "Sorrow"',
    icon: '⟐',
  },

  // --- VERSEAU & POISSONS ---
  {
    name: 'Scheat',
    nameFr: 'Scheat',
    lon2025: 359.650, // 29°39' Aquarius — Beta Pegasi, mag 2.42
    nature: 'malefic',
    deltaExact: { pos: 0, neg: -3 },
    deltaWide:  { pos: 0, neg: -1 },
    source: 'Robson: "Extreme misfortune, drowning, suicide" / Ebertin',
    icon: '🌪️',
  },
  {
    name: 'Markab',
    nameFr: 'Markab',
    lon2025: 353.800, // 23°48' Aquarius — Alpha Pegasi, mag 2.49
    nature: 'mixed',
    deltaExact: { pos: 2, neg: -1 },
    deltaWide:  { pos: 1, neg: 0 },
    source: 'Robson: "Honour, riches, good fortune in war"',
    icon: '🐎',
  },

  // --- VIERGE & LION ---
  {
    name: 'Vindemiatrix',
    nameFr: 'Vindemiatrix',
    lon2025: 190.317, // 10°19' Libra — Epsilon Virginis, mag 2.83
    nature: 'malefic',
    deltaExact: { pos: 0, neg: -2 },
    deltaWide:  { pos: 0, neg: -1 },
    source: 'Robson: "Widowhood, disgrace, falsity, loss of partner"',
    icon: '🍇',
  },
  {
    name: 'Denebola',
    nameFr: 'Denebola',
    lon2025: 171.917, // 21°55' Virgo — Beta Leonis, mag 2.14
    nature: 'mixed',
    deltaExact: { pos: 2, neg: -2 },
    deltaWide:  { pos: 1, neg: -1 },
    source: 'Robson: "Swift judgement, honours then ruin, public disgrace"',
    icon: '🦁',
  },
  {
    name: 'Zosma',
    nameFr: 'Zosma',
    lon2025: 161.633, // 11°38' Virgo — Delta Leonis, mag 2.56
    nature: 'mixed',
    deltaExact: { pos: 1, neg: -2 },
    deltaWide:  { pos: 0, neg: -1 },
    source: 'Robson: "Alert mind, benefit through service, victimization"',
    icon: '🛡️',
  },

  // --- BÉLIER & BALEINE ---
  {
    name: 'Hamal',
    nameFr: 'Hamal',
    lon2025: 38.133, // 08°08' Taurus — Alpha Arietis, mag 2.00
    nature: 'mixed',
    deltaExact: { pos: 2, neg: -1 },
    deltaWide:  { pos: 1, neg: 0 },
    source: 'Robson: "Violence, cruelty, premeditated crime if afflicted; patience if well-placed"',
    icon: '🐏',
  },

  // --- AIGLE & DAUPHIN ---
  {
    name: 'Altair',
    nameFr: 'Altaïr',
    lon2025: 302.167, // 02°10' Aquarius — Alpha Aquilae, mag 0.77
    nature: 'mixed',
    deltaExact: { pos: 2, neg: -1 },
    deltaWide:  { pos: 1, neg: 0 },
    source: 'Robson: "Boldness, valour, sudden but short-lived wealth"',
    icon: '🦅',
  },

  // --- SAGITTAIRE ---
  {
    name: 'Nunki',
    nameFr: 'Nunki',
    lon2025: 282.633, // 12°38' Capricorn — Sigma Sagittarii, mag 2.02
    nature: 'benefic',
    deltaExact: { pos: 2, neg: 0 },
    deltaWide:  { pos: 1, neg: 0 },
    source: 'Robson: "Truthfulness, optimism, good for travel & religion"',
    icon: '🏹',
  },

  // --- COURONNE & SERPENTAIRE ---
  {
    name: 'Alphecca',
    nameFr: 'Alphecca',
    lon2025: 222.467, // 12°28' Scorpio — Alpha Coronae Borealis, mag 2.23
    nature: 'benefic',
    deltaExact: { pos: 2, neg: 0 },
    deltaWide:  { pos: 1, neg: 0 },
    source: 'Robson: "Honour, dignity, artistic gifts, poetic ability"',
    icon: '💍',
  },
  {
    name: 'Ras Alhague',
    nameFr: 'Ras Alhague',
    lon2025: 262.583, // 22°35' Sagittarius — Alpha Ophiuchi, mag 2.07
    nature: 'mixed',
    deltaExact: { pos: 2, neg: -1 },
    deltaWide:  { pos: 1, neg: 0 },
    source: 'Robson: "Perverted, infamous, healing gifts, misuse of drugs"',
    icon: '🐍',
  },

  // --- CENTAURE ---
  {
    name: 'Agena',
    nameFr: 'Agena',
    lon2025: 234.167, // 24°10' Scorpio — Beta Centauri, mag 0.61
    nature: 'benefic',
    deltaExact: { pos: 2, neg: 0 },
    deltaWide:  { pos: 1, neg: 0 },
    source: 'Robson: "Position of authority, friendship, refinement, health"',
    icon: '🏛️',
  },
  {
    name: 'Toliman',
    nameFr: 'Toliman (α Centauri)',
    lon2025: 240.167, // 00°10' Sagittarius — Alpha Centauri, mag -0.01
    nature: 'benefic',
    deltaExact: { pos: 2, neg: 0 },
    deltaWide:  { pos: 1, neg: 0 },
    source: 'Robson: "Beneficent, friends, refinement, honour" / Ebertin: "Relationships"',
    icon: '🌍',
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
 * R25 : vérifie les conjonctions de 7 planètes (Soleil→Saturne) avec 35 étoiles fixes.
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
