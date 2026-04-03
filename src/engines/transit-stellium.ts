// ══════════════════════════════════════
// ═══ TRANSIT STELLIUM — V8.5 ═══
// Détection des concentrations de planètes lentes en transit
// simultanément en aspect avec des points nataux du même signe.
//
// DOCTRINE : Howard Sasportas (The Gods of Change) — quand 3+ planètes
// lentes activent simultanément le même secteur natal, la concentration
// d'énergie crée un événement de transformation majeure personnalisé.
//
// ANTI-BIAIS : signal conditionnel — actif seulement quand 3+ planètes
// lentes sont en orbe ≤3° d'aspects avec des points nataux dans le même
// signe. Fréquence estimée : ~3-8 jours/an pour la personne concernée.
//
// ANTI-DOUBLE-COMPTAGE : Les aspects individuels sont déjà traités par
// calcPersonalTransits (V8.2/V8.3). Ce module détecte UNIQUEMENT la
// synergie collective (3+ lentes simultanées) — un signal différentiel.
// ══════════════════════════════════════

import { type AstroChart } from './astrology';
import { type SystemBreakdown, SLOW_PLANETS } from './convergence.types';

// ── Types ──

export interface TransitStelliumEntry {
  sign: string;               // Signe natal activé (ex: 'Capricorn')
  signFR: string;             // Signe natal en français
  planets: string[];          // Planètes en transit actives (tp keys)
  aspectTypes: string[];      // Types d'aspect correspondants
  natalPoints: string[];      // Points nataux touchés dans ce signe
  element: string;            // Elément du signe (fire/earth/air/water)
  elementFR: string;          // Elément en français
  bonus: number;              // Contribution au delta (0 si non-natal)
}

export interface TransitStelliumResult {
  activeStelliums: TransitStelliumEntry[];
  totalBonus: number;         // Cappé ±4
  narrativeLabel: string;
}

// ── Données ──

const SIGN_FR: Record<string, string> = {
  Aries: 'Bélier', Taurus: 'Taureau', Gemini: 'Gémeaux',
  Cancer: 'Cancer', Leo: 'Lion', Virgo: 'Vierge',
  Libra: 'Balance', Scorpio: 'Scorpion', Sagittarius: 'Sagittaire',
  Capricorn: 'Capricorne', Aquarius: 'Verseau', Pisces: 'Poissons',
};

const SIGN_ELEM: Record<string, string> = {
  Aries: 'fire', Leo: 'fire', Sagittarius: 'fire',
  Taurus: 'earth', Virgo: 'earth', Capricorn: 'earth',
  Gemini: 'air', Libra: 'air', Aquarius: 'air',
  Cancer: 'water', Scorpio: 'water', Pisces: 'water',
};

const ELEM_FR: Record<string, string> = {
  fire: 'Feu', earth: 'Terre', air: 'Air', water: 'Eau',
};

const PLANET_FR: Record<string, string> = {
  jupiter: 'Jupiter', saturn: 'Saturne', uranus: 'Uranus',
  neptune: 'Neptune', pluto: 'Pluton',
};

// ══════════════════════════════════════
// CALC TRANSIT STELLIUM
// Appelé depuis calcSlowModules (L2).
// Retourne les stelliums de transit actifs + bonus à injecter dans delta.
// ══════════════════════════════════════

export function calcTransitStellium(
  astro: AstroChart | null,
  breakdown: SystemBreakdown[]
): TransitStelliumResult {
  const empty: TransitStelliumResult = { activeStelliums: [], totalBonus: 0, narrativeLabel: '' };
  if (!astro || !astro.tr.length || !astro.pl.length) return empty;

  // ── Étape 1 : Grouper les transits lents par signe natal touché ──
  // Pour chaque transit (tp = planète lente, np = point natal, t = aspect, o = orbe ≤3°),
  // on récupère le signe du point natal. Si plusieurs planètes lentes touchent
  // des points nataux dans le MÊME signe → stellium de transit personnel.

  // Map : sign → { planets: Set<tp>, aspects: Map<tp, t>, natalPoints: Set<np> }
  const bySign = new Map<string, {
    planets: Set<string>;
    aspects: Map<string, string>;
    natalPoints: Set<string>;
  }>();

  for (const tr of astro.tr) {
    if (!SLOW_PLANETS.has(tr.tp)) continue;
    if (tr.o > 3) continue; // Orbe serré — signal significatif uniquement

    const natalPlanet = astro.pl.find(p => p.k === tr.np);
    if (!natalPlanet) continue;

    const sign = natalPlanet.s;
    if (!sign) continue;

    if (!bySign.has(sign)) {
      bySign.set(sign, {
        planets: new Set(),
        aspects: new Map(),
        natalPoints: new Set(),
      });
    }
    const entry = bySign.get(sign)!;
    entry.planets.add(tr.tp);
    entry.aspects.set(tr.tp, tr.t || 'conjunction');
    entry.natalPoints.add(tr.np);
  }

  // ── Étape 2 : Filtrer — seulement les signes avec 3+ planètes lentes ──
  const activeStelliums: TransitStelliumEntry[] = [];
  let totalBonus = 0;

  for (const [sign, data] of bySign) {
    if (data.planets.size < 3) continue; // Seuil : 3+ planètes lentes

    const planets = Array.from(data.planets);
    const natalPoints = Array.from(data.natalPoints);
    const aspectTypes = planets.map(p => data.aspects.get(p) || 'unknown');
    const element = SIGN_ELEM[sign] || 'air';

    // ── Bonus : conditionnel — seulement si points nataux touchés ──
    // (c'est toujours le cas ici par construction, mais on garde le check explicite)
    const natalHit = natalPoints.length > 0;
    let bonus = 0;
    if (natalHit) {
      // +2 pour 3 planètes, +3 pour 4+, +4 pour 5 (Cosmique)
      bonus = Math.min(4, planets.length - 1);
    }

    activeStelliums.push({
      sign,
      signFR: SIGN_FR[sign] || sign,
      planets,
      aspectTypes,
      natalPoints,
      element,
      elementFR: ELEM_FR[element] || element,
      bonus,
    });

    totalBonus += bonus;
  }

  if (!activeStelliums.length) return empty;

  // ── Cap global ±4 ──
  totalBonus = Math.max(-4, Math.min(4, totalBonus));

  // ── Breakdown pour UI ──
  const mainStellium = activeStelliums.sort((a, b) => b.planets.length - a.planets.length)[0];
  const planetsLabel = mainStellium.planets
    .map(p => PLANET_FR[p] || p)
    .join(' · ');
  const narrativeLabel = `${mainStellium.planets.length} planètes lentes en ${mainStellium.signFR} (${planetsLabel})`;

  breakdown.push({
    system: 'Concentration planétaire',
    icon: '🌌',
    value: `${mainStellium.planets.length} lentes en ${mainStellium.signFR}`,
    points: totalBonus,
    detail: `Concentration cosmique personnelle — ${mainStellium.elementFR}`,
    signals: totalBonus > 0
      ? [`🌌 ${narrativeLabel} — activation de ton secteur ${mainStellium.signFR} (+${totalBonus})`]
      : [],
    alerts: totalBonus < 0
      ? [`🌌 ${narrativeLabel} — tension sur ton secteur ${mainStellium.signFR} (${totalBonus})`]
      : [],
  });

  return { activeStelliums, totalBonus, narrativeLabel };
}
