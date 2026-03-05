// ══════════════════════════════════════════════════════════════
// ═══ ASHTAKAVARGA — V9.6 Sprint C ═══════════════════════════
// Prashtarashtakavarga (BAV individuel) + scoring quotidien L1
//
// Sources   : BPHS Chapitre 66 (totaux vérifiés Grok Ronde 3, 2026-03-04)
// Tables    : GPT Ronde 3 (cohérence interne validée, totaux = 337)
// Archi     : Gemini Ronde 3 — SAV Lunaire → L1.LUNE, SAV Solaire → L1.EPHEM
//
// ⚠️ Ambiguïtés non levées (vérifier édition primaire BPHS §66) :
//   - Jupiter/Mars : 6 ou 7 positions ? (FIX56 utilisé : 7 → total=56)
//   - Venus/Mars   : [3,4,6,9,11,12] ou [3,5,6,9,11,12] ? (FIX52 utilisé)
// ══════════════════════════════════════════════════════════════

import { getAyanamsa } from './nakshatras';
import { type AstroChart } from './astrology';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AshtakPlanetKey =
  'sun' | 'moon' | 'mars' | 'mercury' | 'jupiter' | 'venus' | 'saturn' | 'ascendant';

export type PrastaraTable = Record<AshtakPlanetKey, number[]>;

export interface AshtakavargaResult {
  delta: number;         // score L1 (capped)
  bindus: number;        // Bindus dans le signe transitant
  signIdx: number;       // index du signe sidereal (0=Bélier…11=Poissons)
  signName: string;      // nom du signe
  planet: string;        // planète transitante
  signals: string[];
  alerts:  string[];
}

// ─── Index des signes (Jyotish : 0=Bélier, 11=Poissons) ──────────────────────

const SIGN_IDX: Record<string, number> = {
  aries: 0, taurus: 1, gemini: 2, cancer: 3,
  leo: 4, virgo: 5, libra: 6, scorpio: 7,
  sagittarius: 8, capricorn: 9, aquarius: 10, pisces: 11,
};

const SIGN_FR: Record<number, string> = {
  0: 'Bélier', 1: 'Taureau', 2: 'Gémeaux', 3: 'Cancer',
  4: 'Lion', 5: 'Vierge', 6: 'Balance', 7: 'Scorpion',
  8: 'Sagittaire', 9: 'Capricorne', 10: 'Verseau', 11: 'Poissons',
};

// ─── Tables Prashtarashtakavarga ──────────────────────────────────────────────
// Convention : positions relatives (maisons 1–12) depuis chaque donneur (donor)
// dans lesquelles il génère un Bindu pour la planète cible.
// Formule index : idx = (donorSignIdx + houseNumber - 1) % 12  ← Gemini Piège 2
// Source : BPHS Chap.66, tableaux B.V. Raman / GPT Ronde 3 (2026-03-04)

/** SOLEIL — 48 Bindus (Grok ✓ BPHS §66 v.1-8) */
export const ASHTAK_SUN: PrastaraTable = {
  sun:       [1, 2, 4, 7, 8, 9, 10, 11],   // 8
  moon:      [3, 6, 10, 11],                // 4
  mars:      [1, 2, 4, 7, 8, 9, 10, 11],   // 8
  mercury:   [3, 5, 6, 9, 10, 11, 12],     // 7
  jupiter:   [5, 6, 9, 11],                // 4
  venus:     [6, 7, 12],                   // 3
  saturn:    [1, 2, 4, 7, 8, 9, 10, 11],   // 8
  ascendant: [3, 4, 6, 10, 11, 12],        // 6
  // total : 8+4+8+7+4+3+8+6 = 48 ✓
};

/** LUNE — 49 Bindus (Grok ✓ BPHS §66 v.9-16) */
export const ASHTAK_MOON: PrastaraTable = {
  sun:       [3, 6, 7, 8, 10, 11],         // 6
  moon:      [1, 3, 6, 7, 10, 11],         // 6
  mars:      [2, 3, 5, 6, 9, 10, 11],      // 7
  mercury:   [1, 3, 4, 5, 7, 8, 10, 11],  // 8
  jupiter:   [1, 4, 7, 8, 10, 11, 12],    // 7
  venus:     [3, 4, 5, 7, 9, 10, 11],     // 7
  saturn:    [3, 5, 6, 11],               // 4
  ascendant: [3, 6, 10, 11],              // 4
  // total : 6+6+7+8+7+7+4+4 = 49 ✓
};

/** MARS — 39 Bindus (Grok ✓ BPHS §66 v.17-24) */
export const ASHTAK_MARS: PrastaraTable = {
  sun:       [3, 5, 6, 10, 11],           // 5
  moon:      [3, 6, 11],                  // 3
  mars:      [1, 2, 4, 7, 8, 10, 11],    // 7
  mercury:   [3, 5, 6, 11],              // 4
  jupiter:   [6, 10, 11, 12],            // 4
  venus:     [6, 8, 11, 12],             // 4
  saturn:    [1, 4, 7, 8, 9, 10, 11],   // 7
  ascendant: [1, 3, 6, 10, 11],         // 5
  // total : 5+3+7+4+4+4+7+5 = 39 ✓
};

/** MERCURE — 54 Bindus (Grok ✓ BPHS §66 v.25-32) */
export const ASHTAK_MERCURY: PrastaraTable = {
  sun:       [5, 6, 9, 11, 12],           // 5
  moon:      [2, 4, 6, 8, 10, 11],        // 6
  mars:      [1, 2, 4, 7, 8, 9, 10, 11], // 8
  mercury:   [1, 3, 5, 6, 7, 10, 11, 12],// 8
  jupiter:   [6, 8, 11, 12],             // 4
  venus:     [1, 2, 3, 4, 5, 8, 9, 11],  // 8
  saturn:    [1, 2, 4, 7, 8, 9, 10, 11], // 8
  ascendant: [1, 2, 4, 6, 8, 10, 11],   // 7
  // total : 5+6+8+8+4+8+8+7 = 54 ✓
};

/**
 * JUPITER — 56 Bindus (Grok ✓ BPHS §66 v.33-40)
 * ⚠️ mars : [1,2,4,7,8,10,11] = 7 (FIX56) — B.V.Raman cite 6 [1,4,7,8,10,11]
 */
export const ASHTAK_JUPITER: PrastaraTable = {
  sun:       [1, 2, 3, 4, 7, 8, 9, 10, 11], // 9
  moon:      [2, 5, 7, 9, 11],              // 5
  mars:      [1, 2, 4, 7, 8, 10, 11],       // 7  ← FIX56 (⚠️ ambiguïté ±1)
  mercury:   [1, 2, 4, 5, 6, 9, 10, 11],   // 8
  jupiter:   [1, 2, 3, 4, 7, 8, 10, 11],   // 8
  venus:     [2, 5, 6, 9, 10, 11],         // 6
  saturn:    [3, 5, 6, 12],               // 4
  ascendant: [1, 2, 4, 5, 6, 7, 9, 10, 11],// 9
  // total : 9+5+7+8+8+6+4+9 = 56 ✓
};

/**
 * VÉNUS — 52 Bindus (Grok ✓ BPHS §66 v.41-48)
 * ⚠️ mars : [3,4,6,9,11,12] = 6 (FIX52) — certaines tables donnent [3,5,6,9,11,12]
 */
export const ASHTAK_VENUS: PrastaraTable = {
  sun:       [8, 11, 12],                        // 3
  moon:      [1, 2, 3, 4, 5, 8, 9, 11, 12],     // 9
  mars:      [3, 4, 6, 9, 11, 12],              // 6  ← FIX52 (⚠️ ambiguïté ±1)
  mercury:   [3, 5, 6, 9, 11],                 // 5
  jupiter:   [5, 8, 9, 10, 11],               // 5
  venus:     [1, 2, 3, 4, 5, 8, 9, 10, 11],   // 9
  saturn:    [3, 4, 5, 8, 9, 10, 11],         // 7
  ascendant: [1, 2, 3, 4, 5, 8, 9, 11],      // 8
  // total : 3+9+6+5+5+9+7+8 = 52 ✓
};

/** SATURNE — 39 Bindus (Grok ✓ BPHS §66 v.49-56) */
export const ASHTAK_SATURN: PrastaraTable = {
  sun:       [1, 2, 4, 7, 8, 10, 11],   // 7
  moon:      [3, 6, 11],                // 3
  mars:      [3, 5, 6, 10, 11, 12],    // 6
  mercury:   [6, 8, 9, 10, 11, 12],   // 6
  jupiter:   [5, 6, 11, 12],          // 4
  venus:     [6, 11, 12],             // 3
  saturn:    [3, 5, 6, 11],           // 4
  ascendant: [1, 3, 4, 6, 10, 11],   // 6
  // total : 7+3+6+6+4+3+4+6 = 39 ✓
};

/** Toutes les tables indexées par planète cible */
const ALL_TABLES: Record<string, PrastaraTable> = {
  sun: ASHTAK_SUN, moon: ASHTAK_MOON, mars: ASHTAK_MARS,
  mercury: ASHTAK_MERCURY, jupiter: ASHTAK_JUPITER,
  venus: ASHTAK_VENUS, saturn: ASHTAK_SATURN,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Construit la Bhinnashtakavarga (BAV) pour une planète cible.
 * Retourne un tableau de 12 entiers (Bindus par signe sidéral, 0=Bélier…11=Poissons).
 *
 * @param target         Planète cible ('sun', 'moon', etc.)
 * @param donorSignIdx   Indices sidéraux de chaque donneur (0–11)
 *
 * Formule clé (Gemini Piège 2) : idx = (donorSignIdx + houseNumber - 1) % 12
 */
export function buildBhinnashtakavarga(
  target: string,
  donorSignIdx: Partial<Record<AshtakPlanetKey, number>>
): number[] {
  const bav = Array<number>(12).fill(0);
  const table = ALL_TABLES[target];
  if (!table) return bav;

  for (const [donor, houses] of Object.entries(table) as [AshtakPlanetKey, number[]][]) {
    const dIdx = donorSignIdx[donor];
    if (dIdx == null) continue; // donneur absent → skip silently
    for (const h of houses) {
      const signTarget = (dIdx + h - 1) % 12;
      bav[signTarget] += 1;
    }
  }
  return bav;
}

/**
 * Convertit un compte de Bindus (0–8) en delta score L1.
 * Centré sur 4 Bindus (moyenne attendue par signe = 337/7/12 ≈ 4.0).
 * Source : GPT Ronde 3 (2026-03-04).
 */
export function deltaFromBindus(b: number): number {
  if (b >= 7) return +2;  // terrain très porteur (rare)
  if (b >= 5) return +1;  // au-dessus de la moyenne
  if (b === 4) return  0; // pivot neutre
  if (b >= 2) return -1;  // sous la moyenne
  return -2;              // 0–1 : zone sèche (rare)
}

/**
 * Extrait les indices sidéraux des planètes natales depuis AstroChart.
 * Gemini Piège 1 : PlanetPos.s est tropical → soustraction Ayanamsa obligatoire.
 *
 * @param astro     Thème natal
 * @param bd        Date de naissance (YYYY-MM-DD)
 */
export function extractNatalSiderealSignIdx(
  astro: AstroChart,
  bd: string
): Partial<Record<AshtakPlanetKey, number>> {
  const birthYear = new Date(bd + 'T12:00:00').getFullYear();
  const ayanamsa  = getAyanamsa(birthYear);
  const result: Partial<Record<AshtakPlanetKey, number>> = {};

  const planetKeys: AshtakPlanetKey[] = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'];

  for (const key of planetKeys) {
    const p = astro.pl.find(pl => pl.k === key);
    if (!p) continue;
    const signIdx    = SIGN_IDX[p.s.toLowerCase()] ?? 0;
    const tropLon    = signIdx * 30 + p.d;
    const sidLon     = ((tropLon - ayanamsa) + 360) % 360;
    result[key]      = Math.floor(sidLon / 30);
  }

  // Ascendant sidéral
  const ascSignIdx = SIGN_IDX[astro.b3.asc.toLowerCase()] ?? 0;
  const ascTropLon = ascSignIdx * 30 + astro.ad;
  const ascSidLon  = ((ascTropLon - ayanamsa) + 360) % 360;
  result.ascendant = Math.floor(ascSidLon / 30);

  return result;
}

// ─── SAV (Sarvashtakavarga) — Sprint AK Chantier 5 ─────────────────────────
// Consensus 3/3 IAs (GPT R2, Grok R2, Gemini R2)
// SAV = somme des 7 BAV planétaires par signe (sans Ascendant). Total = 337.
// delta_SAV = clamp((SAV_sign - 28) × 0.22, -2.8, +2.8)
// Hybride avec Moon BAV : Transit_Lune_Final = clamp(Lune_BAV_Score + SAV_Score, -5.0, +5.0)

const SAV_PLANET_KEYS: string[] = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'];

/**
 * Construit la table SAV (12 signes) à partir des positions natales.
 * SAV[i] = somme des 7 BAV planétaires au signe i.
 * Total des 12 signes = 337.
 */
export function buildSAV(donorSignIdx: Partial<Record<AshtakPlanetKey, number>>): number[] {
  const sav = Array<number>(12).fill(0);
  for (const planet of SAV_PLANET_KEYS) {
    const bav = buildBhinnashtakavarga(planet, donorSignIdx);
    for (let i = 0; i < 12; i++) {
      sav[i] += bav[i];
    }
  }
  return sav;
}

/**
 * Calcule le delta SAV pour un signe donné.
 * Pivot = 28 (337/12 ≈ 28.1), coefficient 0.22, cap ±2.8.
 */
export function deltaSAV(savSign: number): number {
  return Math.max(-2.8, Math.min(2.8, (savSign - 28) * 0.22));
}

/**
 * Calcule le score hybride Moon BAV + SAV pour le transit lunaire.
 * Lune_BAV_Score = (bindus - 4) × 0.75  (centré sur 4, pondéré)
 * SAV_Score = deltaSAV(sav_sign)
 * Final = clamp(Lune_BAV_Score + SAV_Score, -5.0, +5.0)
 */
export function calcMoonBAVSAV(
  moonBindus: number,
  savSign: number,
): { luneBavScore: number; savScore: number; hybridDelta: number } {
  const luneBavScore = (moonBindus - 4) * 0.75;
  const savScore = deltaSAV(savSign);
  const hybridDelta = Math.max(-5.0, Math.min(5.0, luneBavScore + savScore));
  return {
    luneBavScore: Math.round(luneBavScore * 100) / 100,
    savScore: Math.round(savScore * 100) / 100,
    hybridDelta: Math.round(hybridDelta * 100) / 100,
  };
}

// ─── API Principale ───────────────────────────────────────────────────────────

/**
 * Calcule le score Ashtakavarga d'une planète transitante pour aujourd'hui.
 *
 * Flux :
 *   1. Extraire les indices sidéraux nataux (tropicaux → sidéraux via Ayanamsa)
 *   2. Construire la BAV natale pour la planète transitante
 *   3. Trouver l'index sidéral du transit (position actuelle)
 *   4. Lire le Bindu count + convertir en delta
 *
 * @param transitPlanet   'moon' | 'sun' | 'mars'
 * @param transitSidLon   Longitude sidérale de la planète transitante (0–360)
 * @param astro           Thème natal
 * @param bd              Date de naissance (YYYY-MM-DD)
 * @param cap             Cap max |delta| (défaut 3)
 */
export function calcAshtakavarga(
  transitPlanet: 'moon' | 'sun' | 'mars',
  transitSidLon: number,
  astro: AstroChart,
  bd: string,
  cap = 3
): AshtakavargaResult {
  const donorIdx    = extractNatalSiderealSignIdx(astro, bd);
  const bav         = buildBhinnashtakavarga(transitPlanet, donorIdx);
  const signIdx     = Math.floor(((transitSidLon % 360) + 360) % 360 / 30);
  const bindus      = bav[signIdx] ?? 0;
  const rawDelta    = deltaFromBindus(bindus);
  const delta       = Math.max(-cap, Math.min(cap, rawDelta));

  const signName    = SIGN_FR[signIdx] ?? `Signe ${signIdx}`;
  const planetFR    = transitPlanet === 'moon' ? 'Lune' : transitPlanet === 'sun' ? 'Soleil' : 'Mars';
  const sign        = delta > 0 ? '+' : '';
  const label       = `⭕ Ashtakavarga ${planetFR} — ${signName} (${bindus} Bindus) → ${sign}${delta}`;

  return {
    delta,
    bindus,
    signIdx,
    signName,
    planet: planetFR,
    signals: delta > 0 ? [label] : [],
    alerts:  delta < 0 ? [label] : [],
  };
}
