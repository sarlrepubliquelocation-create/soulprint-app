// ══════════════════════════════════════
// ═══ PANCHANGA — Sprint D3 — V9.8 ═══
// Module védique : Tithi + Yoga + Vara
// Source : audit IA Ronde 6+7 (GPT/Grok/Gemini, 2026-03-04)
// Architecture : Gemini | Tables : GPT | Vérification : Grok
// ══════════════════════════════════════
//
// FORMULES CRITIQUES :
//   Tithi = floor(((moonTrop - sunTrop + 360) % 360) / 12) + 1  [tropical, ayanamsa s'annule]
//   Yoga  = floor(((moonTrop + sunTrop - 2*ayanamsa + 720) % 360) / (360/27)) + 1 [2×ayanamsa !!!]
//   Vara  = (dayOfWeek + 1 mod 7)  narratif uniquement, delta = 0
//
// Cap total panchanga : ±5 (Tithi + Yoga, Vara exclu)

// ── Types ──────────────────────────────────────────────────────────

export type TithiQuality = 'Nanda' | 'Bhadra' | 'Jaya' | 'Rikta' | 'Purna';
export type YogaQuality  = 'favorable' | 'plutot_favorable' | 'defavorable' | 'tres_defavorable';

export interface TithiData {
  tithi:   number;       // 1..30
  name:    string;
  quality: TithiQuality;
  delta:   number;       // contribution au score
}

export interface YogaData {
  yoga:    number;       // 1..27
  name:    string;
  quality: YogaQuality;
  delta:   number;
}

export interface VaraData {
  vara:    number;       // 1=Sun..7=Sat
  name:    string;
  icon:    string;
  planet:  string;
  delta:   0;            // toujours 0 — narratif uniquement (Ronde 7)
}

export interface PanchangaResult {
  tithi:       TithiData;
  yoga:        YogaData;
  vara:        VaraData;
  total:       number;   // Tithi.delta + Yoga.delta, capé ±5
  signals:     string[];
  alerts:      string[];
}

// ── Table Tithi (30 entrées) ───────────────────────────────────────
// Source : Jyotish — qualités Nanda/Bhadra/Jaya/Rikta/Purna
// Amavasya (30) delta = −2 : consensus GPT+Gemini, Ronde 7

const TITHI_DATA: Record<number, TithiData> = {
  1:  { tithi: 1,  name: 'Pratipada',   quality: 'Nanda',  delta: +1 },
  2:  { tithi: 2,  name: 'Dvitiya',     quality: 'Bhadra', delta: +1 },
  3:  { tithi: 3,  name: 'Tritiya',     quality: 'Jaya',   delta: +1 },
  4:  { tithi: 4,  name: 'Chaturthi',   quality: 'Rikta',  delta: -2 },
  5:  { tithi: 5,  name: 'Panchami',    quality: 'Purna',  delta: +2 },
  6:  { tithi: 6,  name: 'Shashthi',    quality: 'Nanda',  delta: +1 },
  7:  { tithi: 7,  name: 'Saptami',     quality: 'Bhadra', delta: +1 },
  8:  { tithi: 8,  name: 'Ashtami',     quality: 'Jaya',   delta: +1 },
  9:  { tithi: 9,  name: 'Navami',      quality: 'Rikta',  delta: -2 },
  10: { tithi: 10, name: 'Dashami',     quality: 'Purna',  delta: +2 },
  11: { tithi: 11, name: 'Ekadashi',    quality: 'Nanda',  delta: +1 },
  12: { tithi: 12, name: 'Dvadashi',    quality: 'Bhadra', delta: +1 },
  13: { tithi: 13, name: 'Trayodashi',  quality: 'Jaya',   delta: +1 },
  14: { tithi: 14, name: 'Chaturdashi', quality: 'Rikta',  delta: -2 },
  15: { tithi: 15, name: 'Purnima',     quality: 'Purna',  delta: +3 },
  16: { tithi: 16, name: 'Pratipada',   quality: 'Nanda',  delta: +1 },
  17: { tithi: 17, name: 'Dvitiya',     quality: 'Bhadra', delta: +1 },
  18: { tithi: 18, name: 'Tritiya',     quality: 'Jaya',   delta: +1 },
  19: { tithi: 19, name: 'Chaturthi',   quality: 'Rikta',  delta: -2 },
  20: { tithi: 20, name: 'Panchami',    quality: 'Purna',  delta: +2 },
  21: { tithi: 21, name: 'Shashthi',    quality: 'Nanda',  delta: +1 },
  22: { tithi: 22, name: 'Saptami',     quality: 'Bhadra', delta: +1 },
  23: { tithi: 23, name: 'Ashtami',     quality: 'Jaya',   delta: +1 },
  24: { tithi: 24, name: 'Navami',      quality: 'Rikta',  delta: -2 },
  25: { tithi: 25, name: 'Dashami',     quality: 'Purna',  delta: +2 },
  26: { tithi: 26, name: 'Ekadashi',    quality: 'Nanda',  delta: +1 },
  27: { tithi: 27, name: 'Dvadashi',    quality: 'Bhadra', delta: +1 },
  28: { tithi: 28, name: 'Trayodashi',  quality: 'Jaya',   delta: +1 },
  29: { tithi: 29, name: 'Chaturdashi', quality: 'Rikta',  delta: -2 },
  30: { tithi: 30, name: 'Amavasya',    quality: 'Purna',  delta: -2 }, // Ronde 7: −2 consensus GPT+Gemini
};

// ── Table Yoga (27 entrées) ───────────────────────────────────────
// Source : Jyotish Nityayogas — Vyatipata + Vaidhriti = très défavorables

const YOGA_DATA: Record<number, YogaData> = {
  1:  { yoga: 1,  name: 'Vishkumbha', quality: 'defavorable',      delta: -2 },
  2:  { yoga: 2,  name: 'Priti',      quality: 'favorable',        delta: +2 },
  3:  { yoga: 3,  name: 'Ayushman',   quality: 'favorable',        delta: +2 },
  4:  { yoga: 4,  name: 'Saubhagya',  quality: 'favorable',        delta: +2 },
  5:  { yoga: 5,  name: 'Shobhana',   quality: 'favorable',        delta: +2 },
  6:  { yoga: 6,  name: 'Atiganda',   quality: 'defavorable',      delta: -2 },
  7:  { yoga: 7,  name: 'Sukarma',    quality: 'favorable',        delta: +2 },
  8:  { yoga: 8,  name: 'Dhriti',     quality: 'favorable',        delta: +2 },
  9:  { yoga: 9,  name: 'Shoola',     quality: 'defavorable',      delta: -2 },
  10: { yoga: 10, name: 'Ganda',      quality: 'defavorable',      delta: -2 },
  11: { yoga: 11, name: 'Vriddhi',    quality: 'favorable',        delta: +2 },
  12: { yoga: 12, name: 'Dhruva',     quality: 'favorable',        delta: +2 },
  13: { yoga: 13, name: 'Vyaghata',   quality: 'defavorable',      delta: -2 },
  14: { yoga: 14, name: 'Harshana',   quality: 'favorable',        delta: +2 },
  15: { yoga: 15, name: 'Vajra',      quality: 'defavorable',      delta: -2 },
  16: { yoga: 16, name: 'Siddhi',     quality: 'favorable',        delta: +2 },
  17: { yoga: 17, name: 'Vyatipata',  quality: 'tres_defavorable', delta: -3 },
  18: { yoga: 18, name: 'Variyan',    quality: 'plutot_favorable', delta: +1 },
  19: { yoga: 19, name: 'Parigha',    quality: 'defavorable',      delta: -2 },
  20: { yoga: 20, name: 'Shiva',      quality: 'favorable',        delta: +2 },
  21: { yoga: 21, name: 'Siddha',     quality: 'favorable',        delta: +2 },
  22: { yoga: 22, name: 'Sadhya',     quality: 'plutot_favorable', delta: +1 },
  23: { yoga: 23, name: 'Shubha',     quality: 'favorable',        delta: +2 },
  24: { yoga: 24, name: 'Shukla',     quality: 'favorable',        delta: +2 },
  25: { yoga: 25, name: 'Brahma',     quality: 'favorable',        delta: +2 },
  26: { yoga: 26, name: 'Indra',      quality: 'favorable',        delta: +2 },
  27: { yoga: 27, name: 'Vaidhriti',  quality: 'tres_defavorable', delta: -3 },
};

// ── Table Vara (7 jours) ──────────────────────────────────────────
// Vara = jour de la semaine védique. delta=0 toujours (Ronde 7 : exclusion du score).
// Utilisé uniquement pour le narratif UI.

const VARA_DATA: Record<number, Omit<VaraData, 'delta'>> = {
  0: { vara: 0, name: 'Ravivara',   icon: '☀️', planet: 'Soleil'   }, // Sunday
  1: { vara: 1, name: 'Somavara',   icon: '🌙', planet: 'Lune'     }, // Monday
  2: { vara: 2, name: 'Mangalavara',icon: '🔴', planet: 'Mars'     }, // Tuesday
  3: { vara: 3, name: 'Budhavara',  icon: '☿',  planet: 'Mercure'  }, // Wednesday
  4: { vara: 4, name: 'Guruvara',   icon: '♃',  planet: 'Jupiter'  }, // Thursday
  5: { vara: 5, name: 'Shukravara', icon: '♀',  planet: 'Vénus'    }, // Friday
  6: { vara: 6, name: 'Shanivara',  icon: '♄',  planet: 'Saturne'  }, // Saturday
};

// ── Fonction principale ────────────────────────────────────────────

/**
 * Calcule le Panchanga védique pour une date donnée.
 *
 * @param moonTropLon  Longitude tropicale de la Lune (degrés 0–360)
 * @param sunTropLon   Longitude tropicale du Soleil (degrés 0–360)
 * @param ayanamsa     Ayanamsa du jour (degrés) — pour la correction Yoga
 * @param date         Date du calcul (pour Vara)
 * @returns PanchangaResult avec total capé ±5
 */
export function calcPanchanga(
  moonTropLon: number,
  sunTropLon:  number,
  ayanamsa:    number,
  date:        Date,
): PanchangaResult {
  // ── Tithi ──
  // Formule tropicale : l'ayanamsa s'annule dans la différence Lune-Soleil
  const elongation = ((moonTropLon - sunTropLon) % 360 + 360) % 360;
  const tithiIdx   = Math.floor(elongation / 12) + 1; // 1..30
  const tithiData  = TITHI_DATA[tithiIdx] ?? TITHI_DATA[1];

  // ── Yoga ──
  // PIÈGE Gemini : Yoga utilise la somme sidérale → soustraction 2×ayanamsa
  const yogaSum  = ((moonTropLon + sunTropLon - 2 * ayanamsa) % 360 + 360) % 360;
  const yogaIdx  = Math.floor(yogaSum / (360 / 27)) + 1; // 1..27
  const yogaData = YOGA_DATA[Math.max(1, Math.min(27, yogaIdx))] ?? YOGA_DATA[1];

  // ── Vara ──
  // JS : 0=Dim, 1=Lun, ... 6=Sam — convention védique identique
  const dayOfWeek = date.getDay(); // 0..6
  const varaBase  = VARA_DATA[dayOfWeek] ?? VARA_DATA[0];
  const varaData: VaraData = { ...varaBase, delta: 0 };

  // ── Signals / Alerts ──
  const signals: string[] = [];
  const alerts:  string[] = [];

  if (tithiData.delta > 0) {
    signals.push(`🌙 Tithi ${tithiData.name} (${tithiData.quality}) — jour favorable (+${tithiData.delta})`);
  } else if (tithiData.delta < 0) {
    alerts.push(`🌙 Tithi ${tithiData.name} (${tithiData.quality}) — jour difficile (${tithiData.delta})`);
  }

  if (yogaData.quality === 'tres_defavorable') {
    alerts.push(`⚠️ Yoga ${yogaData.name} — très défavorable (${yogaData.delta})`);
  } else if (yogaData.quality === 'defavorable') {
    alerts.push(`🔸 Yoga ${yogaData.name} — défavorable (${yogaData.delta})`);
  } else if (yogaData.quality === 'favorable') {
    signals.push(`✨ Yoga ${yogaData.name} — favorable (+${yogaData.delta})`);
  } else if (yogaData.quality === 'plutot_favorable') {
    signals.push(`🌿 Yoga ${yogaData.name} — plutôt favorable (+${yogaData.delta})`);
  }

  // ── Total capé ±5 ──
  const raw   = tithiData.delta + yogaData.delta;
  const total = Math.max(-5, Math.min(5, raw));

  return { tithi: tithiData, yoga: yogaData, vara: varaData, total, signals, alerts };
}
