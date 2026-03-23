// ══════════════════════════════════════
// ═══ HEURES PLANÉTAIRES CHALDÉENNES — V9 Sprint 4 ═══
// Technique Hellénistique : chaque heure du jour/nuit est gouvernée par une planète
// selon l'ordre Chaldéen (♄ ♃ ♂ ☉ ♀ ☿ ☽) — distance décroissante depuis la Terre.
// Heures inégales : heure de jour = (coucher−lever) / 12  |  nuit = reste / 12
// Latitude estimée depuis l'offset navigateur (précision sunrise ±20 min — suffisant).
// ══════════════════════════════════════

export type PlanetaryRuler = 'Sun' | 'Moon' | 'Mars' | 'Mercury' | 'Jupiter' | 'Venus' | 'Saturn';

export interface PlanetaryHour {
  planet:     PlanetaryRuler;
  icon:       string;
  startMs:    number;
  endMs:      number;
  isDayHour:  boolean;      // true = heure de jour, false = heure de nuit
  hourIndex:  number;       // 1–12 dans sa demi-période (jour ou nuit)
  quality:    'favorable' | 'neutre' | 'challenging';
  pts:        number;       // contribution scoring L1 (−5 → +6)
  keywords:   string[];
  label:      string;       // "Heure de Vénus"
}

// ── Ordre Chaldéen : ♄(0) ♃(1) ♂(2) ☉(3) ♀(4) ☿(5) ☽(6) ──
const CHALDEAN: PlanetaryRuler[] = ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon'];

// Premier planète de la 1re heure diurne selon jour de la semaine (0 = Dimanche)
// Dim=☉(3)  Lun=☽(6)  Mar=♂(2)  Mer=☿(5)  Jeu=♃(1)  Ven=♀(4)  Sam=♄(0)
const DAY_FIRST_IDX: number[] = [3, 6, 2, 5, 1, 4, 0];

// ── Données par planète : scoring + affichage ──
const PLANET_DATA: Record<PlanetaryRuler, {
  icon: string;
  pts: number;
  quality: PlanetaryHour['quality'];
  keywords: string[];
}> = {
  Sun:     { icon: '☉', pts:  6, quality: 'favorable',   keywords: ['Clarté', 'Autorité', 'Réussite']       },
  Jupiter: { icon: '♃', pts:  5, quality: 'favorable',   keywords: ['Expansion', 'Fortune', 'Sagesse']      },
  Venus:   { icon: '♀', pts:  3, quality: 'favorable',   keywords: ['Harmonie', 'Créativité', 'Plaisir']    },
  Moon:    { icon: '☽', pts:  2, quality: 'favorable',   keywords: ['Intuition', 'Relation', 'Flux']        },
  Mercury: { icon: '☿', pts:  0, quality: 'neutre',      keywords: ['Communication', 'Analyse', 'Échange']  },
  Mars:    { icon: '♂', pts: -3, quality: 'challenging', keywords: ['Tension', 'Urgence', 'Conflit']        },
  Saturn:  { icon: '♄', pts: -5, quality: 'challenging', keywords: ['Limite', 'Obstacle', 'Inertie']        },
};

// Noms français des planètes
const PLANET_FR: Record<PlanetaryRuler, string> = {
  Sun: 'Soleil', Moon: 'Lune', Mars: 'Mars',
  Mercury: 'Mercure', Jupiter: 'Jupiter', Venus: 'Vénus', Saturn: 'Saturne',
};

export function planetFr(p: PlanetaryRuler): string { return PLANET_FR[p]; }

// ══════════════════════════════════════
// ═══ LATITUDE ESTIMÉE DEPUIS TIMEZONE ═══
// Mapping offset (heures est de UTC) → latitude approximative.
// Erreur max ≈ ±10°lat → ±20 min sur sunrise/sunset — acceptable pour Kaironaute.
// ══════════════════════════════════════

const LAT_BY_TZ: Record<string, number> = {
  '-12': 20,  '-11': 15,  '-10': 21,  '-9': 61,  '-8': 37,  '-7': 40,
  '-6':  30,  '-5':  40,  '-4':  15,  '-3': -15, '-2':  0,  '-1': 28,
   '0':  51,   '1':  48,   '2':  52,   '3': 55,   '4':  25,  '5':  30,
   '6':  45,   '7':  15,   '8':  35,   '9': 35,  '10': -25, '11': -30,
  '12': -40,
};

function estimateLat(): number {
  const tzOffsetMin = new Date().getTimezoneOffset();   // minutes WEST de UTC
  const tzHoursEast = Math.round(-tzOffsetMin / 60);   // heures EST de UTC
  return LAT_BY_TZ[String(tzHoursEast)] ?? 45;          // défaut 45°N si inconnu
}

function getDayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86_400_000);
}

// ══════════════════════════════════════
// ═══ SUNRISE / SUNSET (Spencer 1971) ═══
// Formule astronomique simplifiée. Retourne timestamps locaux (heure solaire ≈ locale).
// ══════════════════════════════════════

function calcSunriseSunset(date: Date, lat: number): { sunriseMs: number; sunsetMs: number } {
  const doy    = getDayOfYear(date);
  const B      = (360 / 365) * (doy - 81) * (Math.PI / 180);          // radians
  const decl   = 23.45 * Math.sin(B) * (Math.PI / 180);               // déclinaison solaire (rad)
  const latRad = lat * (Math.PI / 180);
  const cosH   = -Math.tan(latRad) * Math.tan(decl);
  const cosHc  = Math.max(-0.999, Math.min(0.999, cosH));             // clamp zones polaires
  const H      = Math.acos(cosHc) * (180 / Math.PI);                  // angle horaire (degrés)

  const sunriseH = 12 - H / 15;   // heures depuis minuit (temps solaire moyen)
  const sunsetH  = 12 + H / 15;

  const midnight = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  return {
    sunriseMs: midnight + sunriseH * 3_600_000,
    sunsetMs:  midnight + sunsetH  * 3_600_000,
  };
}

// ══════════════════════════════════════
// ═══ CALCUL DES 24 HEURES DU JOUR ═══
// ══════════════════════════════════════

/**
 * Calcule les 24 heures planétaires du jour (12 diurnes + 12 nocturnes).
 * @param date  N'importe quelle heure dans le jour voulu.
 */
export function calcPlanetaryHours(date: Date = new Date()): PlanetaryHour[] {
  const lat = estimateLat();
  const { sunriseMs, sunsetMs } = calcSunriseSunset(date, lat);

  // Lever du lendemain pour borner les 12 heures nocturnes
  const nextDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  const { sunriseMs: nextSunriseMs } = calcSunriseSunset(nextDay, lat);

  const dayHourMs   = (sunsetMs - sunriseMs)           / 12;
  const nightHourMs = (nextSunriseMs - sunsetMs)        / 12;

  // Index Chaldéen de la 1re heure de jour = f(jour de la semaine)
  let chaldIdx = DAY_FIRST_IDX[date.getDay()];

  const hours: PlanetaryHour[] = [];

  // ── 12 heures de jour ──
  for (let i = 0; i < 12; i++) {
    const planet = CHALDEAN[chaldIdx % 7];
    const d = PLANET_DATA[planet];
    hours.push({
      planet,
      icon:      d.icon,
      startMs:   sunriseMs + i * dayHourMs,
      endMs:     sunriseMs + (i + 1) * dayHourMs,
      isDayHour: true,
      hourIndex: i + 1,
      quality:   d.quality,
      pts:       d.pts,
      keywords:  d.keywords,
      label:     `Heure de ${PLANET_FR[planet]}`,
    });
    chaldIdx++;
  }

  // ── 12 heures de nuit ──
  for (let i = 0; i < 12; i++) {
    const planet = CHALDEAN[chaldIdx % 7];
    const d = PLANET_DATA[planet];
    hours.push({
      planet,
      icon:      d.icon,
      startMs:   sunsetMs + i * nightHourMs,
      endMs:     sunsetMs + (i + 1) * nightHourMs,
      isDayHour: false,
      hourIndex: i + 1,
      quality:   d.quality,
      pts:       d.pts,
      keywords:  d.keywords,
      label:     `Heure de ${PLANET_FR[planet]}`,
    });
    chaldIdx++;
  }

  return hours;
}

// ══════════════════════════════════════
// ═══ API PUBLIQUE ═══
// ══════════════════════════════════════

/** Heure planétaire active à l'instant `now`. Retourne null si hors plage (très rare). */
export function getCurrentPlanetaryHour(now: Date = new Date()): PlanetaryHour | null {
  const ms = now.getTime();
  return calcPlanetaryHours(now).find(h => ms >= h.startMs && ms < h.endMs) ?? null;
}

/** Prochaines heures favorables restant dans la journée (triées par début).
 *  Ronde Pilotage P5 : filtre heures raisonnables (7h–22h) — pas de créneaux à 01h du matin. */
export function getBestHoursToday(now: Date = new Date(), topN = 3): PlanetaryHour[] {
  const ms = now.getTime();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const h7  = midnight + 7  * 3_600_000;  // 07:00
  const h22 = midnight + 22 * 3_600_000;  // 22:00
  return calcPlanetaryHours(now)
    .filter(h => h.quality === 'favorable' && h.endMs > ms && h.startMs >= h7 && h.startMs < h22)
    .sort((a, b) => a.startMs - b.startMs)
    .slice(0, topN);
}
