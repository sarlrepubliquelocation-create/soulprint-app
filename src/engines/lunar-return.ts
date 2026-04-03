/**
 * lunar-return.ts — Retour Lunaire Mensuel Kaironaute R26
 * Binary search pour trouver le moment exact où la Lune revient
 * à sa position natale (~tous les 27.3 jours).
 * Calcule l'ASC du retour lunaire et le place dans les maisons natales.
 *
 * Réutilise l'infrastructure de solar-return.ts (binary search + calcAnglesForDate).
 * Zéro impact scoring — UI only.
 *
 * Sources : Dietrech Pessin (Lunar Return), Celeste Teal (Lunar Returns)
 */

import { getPlanetLongitudeForDate, calcAnglesForDate, SIGNS, SIGN_FR, findCity } from './astrology';
import { planetPosToLong } from './returns';

// ── Types ──

const HOUSE_THEME: Record<number, string> = {
  1: 'identité et image personnelle',
  2: 'finances et ressources',
  3: 'communication et entourage',
  4: 'foyer et racines',
  5: 'créativité et amour',
  6: 'santé et travail quotidien',
  7: 'relations et partenariats',
  8: 'transformations profondes',
  9: 'voyages et expansion',
  10: 'carrière et statut',
  11: 'projets et amitiés',
  12: 'spiritualité et introspection',
};

export interface LunarReturnResult {
  lrDate: Date | null;            // date exacte du retour lunaire
  lrAsc: {
    longitude: number;            // ASC du retour lunaire (0-360)
    sign: string;                 // signe (clé anglaise)
    signFr: string;               // signe français
    degInSign: number;            // degré dans le signe
    natalHouse: number;           // maison natale où tombe l'ASC LR
    theme: string;                // domaine de vie activé
  } | null;
  daysUntilNext: number;          // jours avant le prochain retour
  moonSignFr: string;             // signe natal de la Lune (rappel)
}

// ── Constantes ──

const TOLERANCE_DEG = 0.01;       // précision binary search (0.01° suffisant pour la Lune)
const MAX_ITERATIONS = 40;
const SIDEREAL_MONTH_DAYS = 27.321661; // mois sidéral en jours

// ── Helpers ──

function angleDiff(a: number, b: number): number {
  let d = ((a - b) % 360 + 360) % 360;
  if (d > 180) d -= 360;
  return d;
}

// ── Binary search retour lunaire ──

/**
 * Trouve le retour lunaire le plus proche (passé ou futur) autour de `targetDate`.
 * La Lune parcourt ~13.2°/jour → un cycle complet en ~27.3 jours.
 * On cherche dans une fenêtre de ±15 jours.
 */
/**
 * Distance angulaire absolue (0-180°) entre deux longitudes.
 */
function absAngDist(a: number, b: number): number {
  const d = Math.abs(((a - b) % 360 + 360) % 360);
  return d > 180 ? 360 - d : d;
}

/**
 * Trouve le prochain retour lunaire (conjonction Lune transit = Lune natale)
 * en scannant en avant depuis `fromDate` sur `searchDays` jours.
 * Scan par pas de 4h + bisection fine.
 */
function findNextLunarReturn(
  natalMoonLong: number,
  fromDate: Date,
  searchDays: number = 30,
): Date | null {
  const STEP_MS = 4 * 3600000; // 4h (plus fin que 6h pour ne rien rater)
  const endMs = fromDate.getTime() + searchDays * 86400000;

  let prevMoon = getPlanetLongitudeForDate('moon', fromDate);
  let prevDist = absAngDist(prevMoon, natalMoonLong);

  for (let t = fromDate.getTime() + STEP_MS; t <= endMs; t += STEP_MS) {
    const d = new Date(t);
    const moonLon = getPlanetLongitudeForDate('moon', d);
    const dist = absAngDist(moonLon, natalMoonLong);

    // Détection : la distance au point natal passe en dessous de 8° et on est en approche
    // puis remonte → minimum local = retour lunaire
    if (prevDist < 8 && dist > prevDist && prevDist < 3) {
      // Le minimum était au step précédent — bisection entre [t - 2*STEP, t]
      let lo = t - 2 * STEP_MS;
      let hi = t;
      for (let i = 0; i < MAX_ITERATIONS; i++) {
        const m1 = lo + (hi - lo) / 3;
        const m2 = lo + 2 * (hi - lo) / 3;
        const d1 = absAngDist(getPlanetLongitudeForDate('moon', new Date(m1)), natalMoonLong);
        const d2 = absAngDist(getPlanetLongitudeForDate('moon', new Date(m2)), natalMoonLong);
        if (d1 < d2) hi = m2; else lo = m1;
        if (hi - lo < 60000) break; // convergé à <1 minute
      }
      const candidate = new Date((lo + hi) / 2);
      const finalDist = absAngDist(getPlanetLongitudeForDate('moon', candidate), natalMoonLong);

      // Ne garder que les vrais retours (< 1°) pas les demi-retours (opposition ~180°)
      if (finalDist < 1) return candidate;
    }

    prevMoon = moonLon;
    prevDist = dist;
  }

  return null;
}

// ── Fonction principale ──

/**
 * Calcule le retour lunaire le plus récent et le prochain.
 * Retourne les infos du retour le plus récent (thème du mois en cours).
 */
export function calcLunarReturn(
  astro: {
    pl: Array<{ k: string; s: string; d: number }>;
    b3?: { asc?: string };
    hs?: string[];
  } | null,
  today: Date = new Date(),
  birthCity?: string,
): LunarReturnResult {
  const empty: LunarReturnResult = { lrDate: null, lrAsc: null, daysUntilNext: 0, moonSignFr: '' };

  if (!astro) return empty;

  // Extraire la longitude natale de la Lune
  const moonPl = astro.pl.find(p => p.k === 'moon');
  if (!moonPl) return empty;
  const natalMoonLong = planetPosToLong(moonPl.s, moonPl.d);
  const moonSignFr = SIGN_FR[moonPl.s] || moonPl.s;

  // Stratégie : chercher le prochain retour à partir de (today - 28j).
  // Le premier trouvé sera soit le retour le plus récent (passé) soit le prochain (futur).
  const searchFrom = new Date(today.getTime() - 28 * 86400000);
  const activeLR = findNextLunarReturn(natalMoonLong, searchFrom, 56); // 56j = 2 cycles max

  if (!activeLR) return { ...empty, moonSignFr };

  // Trouver le prochain retour lunaire (après today)
  const nextLR = activeLR.getTime() > today.getTime()
    ? activeLR
    : findNextLunarReturn(natalMoonLong, today, 30);

  // Ronde #3 F8 : diff calendaire (jours civils) au lieu de Math.ceil
  const daysUntilNext = nextLR
    ? Math.round(
        (new Date(nextLR.getFullYear(), nextLR.getMonth(), nextLR.getDate()).getTime()
         - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime())
        / 86400000
      )
    : 0;

  // Calculer l'ASC du retour lunaire
  let lrAsc: LunarReturnResult['lrAsc'] = null;

  if (birthCity && astro.b3?.asc) {
    const cityCoords = findCity(birthCity);
    if (cityCoords) {
      const [lat, lon] = cityCoords;
      const angles = calcAnglesForDate(activeLR, lat, lon);
      const ascLon = angles.asc;
      const ascSign = angles.ascSign;
      const degInSign = +(ascLon % 30).toFixed(1);

      // Placement en maison natale (Whole Sign)
      let natalHouse = 1;
      if (astro.b3.asc) {
        const natalAscIdx = SIGNS.indexOf(astro.b3.asc);
        const lrAscIdx = SIGNS.indexOf(ascSign);
        if (natalAscIdx >= 0 && lrAscIdx >= 0) {
          natalHouse = ((lrAscIdx - natalAscIdx + 12) % 12) + 1;
        }
      }

      const theme = HOUSE_THEME[natalHouse] || 'identité';
      lrAsc = {
        longitude: ascLon,
        sign: ascSign,
        signFr: SIGN_FR[ascSign] || ascSign,
        degInSign,
        natalHouse,
        theme,
      };
    }
  }

  return {
    lrDate: activeLR,
    lrAsc,
    daysUntilNext,
    moonSignFr,
  };
}
