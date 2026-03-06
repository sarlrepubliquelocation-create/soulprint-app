// ══════════════════════════════════════════════════════════════
// ═══ KINETIC SHOCKS — Sprint AL (Chantier 5, Sprint 2) ═════
// Consensus 3/3 IAs (GPT R4, Grok R4, Gemini R4)
//
// Deux types de chocs cinétiques ponctuels (Diracs) :
//   1. Ingress (changement de signe sidéral) : Soleil (-1), Mars (-2)
//   2. Station D↔R (inversion de vitesse) : Mercure, Vénus, Mars (-2 + BAV×1.40)
//
// Tout dans C_EPHEM (cap ±14). Pas d'état continu, pas de shadow.
// ══════════════════════════════════════════════════════════════

import { getPlanetLongitudeForDate } from './astrology';
import { getAyanamsa } from './nakshatras';

// ─── Types ──────────────────────────────────────────────────

export type KineticPlanet = 'sun' | 'mars' | 'mercury' | 'venus';

export interface KineticShockResult {
  totalDelta: number;         // somme des chocs cinétiques
  shocks: KineticShock[];     // détail de chaque choc activé
}

export interface KineticShock {
  type: 'ingress' | 'station';
  planet: KineticPlanet;
  planetFR: string;
  delta: number;
  detail: string;
}

// ─── Constantes ─────────────────────────────────────────────

const PLANET_FR: Record<KineticPlanet, string> = {
  sun: 'Soleil', mars: 'Mars', mercury: 'Mercure', venus: 'Vénus',
};

/** Deltas ingress : jour J exact uniquement */
const INGRESS_DELTA: Partial<Record<KineticPlanet, number>> = {
  sun:  -1,  // Sankranti — friction ponctuelle (GPT + Grok R4)
  mars: -2,  // Maléfique lourd, changement de signe ~8×/an (consensus 3/3)
};

/** Delta additif station (Dirac) — résout le pivot neutre BAV=0 */
const STATION_ADDITIVE_DELTA = -2;  // Consensus révisé (Gemini R4)

/** Multiplicateur BAV le jour de station (Grok Vakri, appliqué jour J seul) */
const STATION_BAV_MULTIPLIER = 1.40;

// ─── Helpers ────────────────────────────────────────────────

/** Distance angulaire la plus courte (gère le wrap 360°→0°) */
function shortDist(from: number, to: number): number {
  let d = to - from;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

/** Indice de signe sidéral (0=Bélier … 11=Poissons) */
function sidSign(tropLon: number, ayanamsa: number): number {
  const sid = ((tropLon - ayanamsa) % 360 + 360) % 360;
  return Math.floor(sid / 30);
}

// ─── API Principale ─────────────────────────────────────────

/**
 * Calcule les chocs cinétiques pour une date donnée.
 *
 * @param todayStr     Date du jour (YYYY-MM-DD)
 * @param bavDeltas    Deltas BAV actuels des planètes (pour station ×1.40)
 *                     Optionnel — si absent, seul le Dirac additif s'applique
 */
export function calcKineticShocks(
  todayStr: string,
  bavDeltas?: Partial<Record<KineticPlanet, number>>,
): KineticShockResult {
  const shocks: KineticShock[] = [];

  const todayD      = new Date(todayStr + 'T12:00:00');
  const yesterdayD   = new Date(todayD.getTime() - 86400000);
  const dayBeforeD   = new Date(todayD.getTime() - 2 * 86400000);

  const ayToday     = getAyanamsa(todayD.getFullYear());
  const ayYesterday = getAyanamsa(yesterdayD.getFullYear()); // identique sauf passage 1er jan

  // ── 1. INGRESS : Soleil, Mars ──────────────────────────────

  for (const planet of ['sun', 'mars'] as const) {
    try {
      const lonToday     = getPlanetLongitudeForDate(planet, todayD);
      const lonYesterday = getPlanetLongitudeForDate(planet, yesterdayD);

      const signToday     = sidSign(lonToday, ayToday);
      const signYesterday = sidSign(lonYesterday, ayYesterday);

      if (signToday !== signYesterday) {
        const delta = INGRESS_DELTA[planet] ?? 0;
        if (delta !== 0) {
          shocks.push({
            type: 'ingress',
            planet,
            planetFR: PLANET_FR[planet],
            delta,
            detail: `${PLANET_FR[planet]} ingress sidéral → choc de frontière (${delta > 0 ? '+' : ''}${delta})`,
          });
        }
      }
    } catch { /* longitude fail silently */ }
  }

  // ── 2. STATION D↔R : Mercure, Vénus, Mars ─────────────────

  for (const planet of ['mercury', 'venus', 'mars'] as const) {
    try {
      const lonToday     = getPlanetLongitudeForDate(planet, todayD);
      const lonYesterday = getPlanetLongitudeForDate(planet, yesterdayD);
      const lonDayBefore = getPlanetLongitudeForDate(planet, dayBeforeD);

      // Vitesses (dérivée première)
      const vJ  = shortDist(lonYesterday, lonToday);    // vitesse J
      const vJ1 = shortDist(lonDayBefore, lonYesterday); // vitesse J-1

      // Station = inversion du signe de la vitesse ET vitesse faible
      // (le seuil 1.5°/jour filtre les faux positifs du wrap 360°)
      const isStation = Math.sign(vJ) !== Math.sign(vJ1) && Math.abs(vJ) < 1.5;

      if (isStation) {
        // A. Dirac additif (résout le pivot neutre BAV = 0)
        let delta = STATION_ADDITIVE_DELTA;

        // B. Amplification BAV (Grok Vakri) — jour J uniquement
        const currentBAVDelta = bavDeltas?.[planet] ?? 0;
        const bavAmplification = currentBAVDelta * (STATION_BAV_MULTIPLIER - 1.0); // portion additionnelle du ×1.40
        delta += Math.round(bavAmplification * 10) / 10;

        shocks.push({
          type: 'station',
          planet,
          planetFR: PLANET_FR[planet],
          delta: Math.round(delta * 10) / 10,
          detail: `${PLANET_FR[planet]} station D↔R → choc cinétique (${delta > 0 ? '+' : ''}${Math.round(delta * 10) / 10})`,
        });
      }
    } catch { /* longitude fail silently */ }
  }

  // ── Somme ──────────────────────────────────────────────────

  const totalDelta = shocks.reduce((sum, s) => sum + s.delta, 0);

  return { totalDelta, shocks };
}
