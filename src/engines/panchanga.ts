// ══════════════════════════════════════
// ═══ PANCHANGA — Sprint E1 — V9.9 ═══
// Module védique : Tithi + Yoga + Karana + Vara
// Source : audit IA Rondes 6+7+8+9 (GPT/Grok/Gemini, 2026-03-04)
// Architecture : Gemini | Tables : GPT | Vérification : Grok
// ══════════════════════════════════════
//
// FORMULES CRITIQUES :
//   Tithi  = floor(((moonTrop - sunTrop + 360) % 360) / 12) + 1  [tropical, ayanamsa s'annule]
//   Yoga   = floor(((moonTrop + sunTrop - 2*ayanamsa + 720) % 360) / (360/27)) + 1 [2×ayanamsa !!!]
//   Karana = floor(((moonTrop - sunTrop + 360) % 360) / 6) + 1   [1..60, même élongation que Tithi]
//            Pas de piège ayanamsa (s'annule dans moon-sun, GPT Ronde 8)
//   Vara   = (dayOfWeek + 1 mod 7)  narratif uniquement, delta = 0
//
// Cap total panchanga : ±6 (Tithi + Yoga + Karana, Vara exclu)

// ── Types ──────────────────────────────────────────────────────────

export type TithiQuality  = 'Nanda' | 'Bhadra' | 'Jaya' | 'Rikta' | 'Purna';
export type YogaQuality   = 'favorable' | 'plutot_favorable' | 'defavorable' | 'tres_defavorable';
export type KaranaType    = 'repetitif' | 'fixe';
export type KaranaQuality = 'favorable' | 'defavorable';

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

export interface KaranaData {
  index:   number;       // 1..60
  name:    string;
  type:    KaranaType;
  quality: KaranaQuality;
  delta:   number;       // Gara/Vanija=+2, Bava/Balava/Kaulava/Taitila=+1, Vishti=-2, Fixes=-1
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
  karana:      KaranaData;
  vara:        VaraData;
  total:       number;   // Tithi.delta + Yoga.delta + Karana.delta, capé ±6
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

// ── Table Karana (11 Karanas, mapping 60 demi-tithis) ────────────────
// Source : Classical Muhurta (Ernst Wilhelm) — GPT Ronde 8
// Mobiles (7) × 8 répétitions = 56 + 4 fixes = 60 au total
// Séquence : index 1 = Kimstughna, 2..57 = cycle 7 mobiles, 58=Shakuni, 59=Chatushpada, 60=Naga
// Deltas : Gara/Vanija=+2 (meilleurs), Bava/Balava/Kaulava/Taitila=+1 (favorables),
//          Vishti(Bhadra)=-2 (défavorable muhurta), Fixes=-1 (spécialisés)

const KARANA_INFO: Record<string, KaranaData> = {
  Bava:        { index: 0, name: 'Bava',        type: 'repetitif', quality: 'favorable',  delta: +1 },
  Balava:      { index: 0, name: 'Balava',      type: 'repetitif', quality: 'favorable',  delta: +1 },
  Kaulava:     { index: 0, name: 'Kaulava',     type: 'repetitif', quality: 'favorable',  delta: +1 },
  Taitila:     { index: 0, name: 'Taitila',     type: 'repetitif', quality: 'favorable',  delta: +1 },
  Gara:        { index: 0, name: 'Gara',        type: 'repetitif', quality: 'favorable',  delta: +2 },
  Vanija:      { index: 0, name: 'Vanija',      type: 'repetitif', quality: 'favorable',  delta: +2 },
  Vishti:      { index: 0, name: 'Vishti',      type: 'repetitif', quality: 'defavorable', delta: -2 },
  Kimstughna:  { index: 0, name: 'Kimstughna',  type: 'fixe',      quality: 'defavorable', delta: -1 },
  Shakuni:     { index: 0, name: 'Shakuni',     type: 'fixe',      quality: 'defavorable', delta: -1 },
  Chatushpada: { index: 0, name: 'Chatushpada', type: 'fixe',      quality: 'defavorable', delta: -1 },
  Naga:        { index: 0, name: 'Naga',        type: 'fixe',      quality: 'defavorable', delta: -1 },
};

const MOBILES = ['Bava', 'Balava', 'Kaulava', 'Taitila', 'Gara', 'Vanija', 'Vishti'] as const;

function karanaNameFromIndex(index1to60: number): string {
  const k = Math.max(1, Math.min(60, index1to60)) - 1; // 0..59
  if (k === 0)  return 'Kimstughna';
  if (k === 57) return 'Shakuni';
  if (k === 58) return 'Chatushpada';
  if (k === 59) return 'Naga';
  return MOBILES[(k - 1) % 7]; // k=1..56 → cycle 7 mobiles
}

function getKaranaData(index1to60: number): KaranaData {
  const name = karanaNameFromIndex(index1to60);
  const info  = KARANA_INFO[name];
  return { ...info, index: index1to60 };
}

// ── Fonction principale ────────────────────────────────────────────

/**
 * Calcule le Panchanga védique pour une date donnée.
 *
 * @param moonTropLon  Longitude tropicale de la Lune (degrés 0–360)
 * @param sunTropLon   Longitude tropicale du Soleil (degrés 0–360)
 * @param ayanamsa     Ayanamsa du jour (degrés) — pour la correction Yoga
 * @param date         Date du calcul (pour Vara)
 * @returns PanchangaResult avec total capé ±6 (Sprint E1 : ajout Karana)
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

  // ── Karana ──
  // Même élongation que Tithi (demi-Tithi = 6°). Pas de piège ayanamsa (s'annule).
  // Sprint E1 — GPT Ronde 8 : Classical Muhurta (Ernst Wilhelm)
  const karanaIdx  = Math.floor(elongation / 6) + 1; // 1..60
  const karanaData = getKaranaData(karanaIdx);

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

  if (karanaData.quality === 'defavorable') {
    const label = karanaData.type === 'fixe' ? 'fixe' : 'Bhadra';
    alerts.push(`🔸 Karana ${karanaData.name} (${label}) — défavorable (${karanaData.delta})`);
  } else if (karanaData.delta > 0) {
    signals.push(`🌿 Karana ${karanaData.name} — favorable (+${karanaData.delta})`);
  }

  // ── Total capé ±6 (Tithi + Yoga + Karana) ──
  const raw   = tithiData.delta + yogaData.delta + karanaData.delta;
  const total = Math.max(-6, Math.min(6, raw));

  return { tithi: tithiData, yoga: yogaData, karana: karanaData, vara: varaData, total, signals, alerts };
}

// ══════════════════════════════════════════════════════════════════════
// ═══ TARABALA + CHANDRABALA — Sprint G — V10.1 ═══
// Source : Muhurta Chintamani Ch.2 §12-18 (Tarabala), Jyotish standard (Chandrabala)
// Consensus Rondes 10-11 : additif (Grok+Gemini 2/3), Abhijit exclu
// ══════════════════════════════════════════════════════════════════════
//
// FORMULES :
//   nakTransit  = floor(moonSidTransit / (360/27)) % 27   [0..26]
//   nakNatal    = floor(moonSidNatal   / (360/27)) % 27   [0..26]
//   tarabalaIdx = (nakTransit - nakNatal + 27) % 9         [0..8]
//   → si nakTransit === 28 (Abhijit) : return 0 (exclu)
//
//   transitSign = floor(moonSidTransit / 30) % 12          [0..11]
//   natalSign   = floor(moonSidNatal   / 30) % 12          [0..11]
//   chandraPos  = ((transitSign - natalSign + 12) % 12) + 1 [1..12]
//   → pos 8 = Astama Chandra (−3)
//
// ── Tables scoring ─────────────────────────────────────────────────

// Tarabala : index 0..8 → Janma(-1), Sampat(+2), Vipat(-2), Kshema(+2),
//            Pratyari(-1), Sadhaka(+2), Vadha(-3), Mitra(+1), Ati-Mitra(+2)
const TARABALA_DELTA: Record<number, number> = {
  0: -1, // Janma
  1: +2, // Sampat
  2: -2, // Vipat
  3: +2, // Kshema
  4: -1, // Pratyari
  5: +2, // Sadhaka
  6: -3, // Vadha
  7: +1, // Mitra
  8: +2, // Ati-Mitra
};

const TARABALA_NAME: Record<number, string> = {
  0: 'Janma', 1: 'Sampat', 2: 'Vipat', 3: 'Kshema', 4: 'Pratyari',
  5: 'Sadhaka', 6: 'Vadha', 7: 'Mitra', 8: 'Ati-Mitra',
};

// Chandrabala : positions 1-12 → delta
// 1,3,6,7,10,11 = +2 ; 2,5 = 0 ; 4,9,12 = -1 ; 8 (Astama) = -3
const CHANDRABALA_DELTA: Record<number, number> = {
   1: +2,  2:  0,  3: +2,  4: -1,
   5:  0,  6: +2,  7: +2,  8: -3,
   9: -1, 10: +2, 11: +2, 12: -1,
};

// ── NAK_SPAN ────────────────────────────────────────────────────────
const NAK_SPAN_G = 360 / 27; // 13.333...°

// ── Interfaces résultat ─────────────────────────────────────────────
export interface TarabalaResult {
  index: number;       // 0..8
  name: string;
  delta: number;
  label: string;       // signal/alerte narratif
}

export interface ChandrabalaResult {
  position: number;    // 1..12
  delta: number;
  label: string;
}

// ── calcTarabala ────────────────────────────────────────────────────
export function calcTarabala(
  moonSidTransit: number,
  moonSidNatal: number,
): TarabalaResult {
  const nakTransit = Math.floor(((moonSidTransit % 360) + 360) % 360 / NAK_SPAN_G) % 27;
  const nakNatal   = Math.floor(((moonSidNatal   % 360) + 360) % 360 / NAK_SPAN_G) % 27;

  // Abhijit (index 28, hors 0-26) : sécurité — ne devrait pas survenir avec 27 naks
  const idx   = (nakTransit - nakNatal + 27) % 9;
  const delta = TARABALA_DELTA[idx] ?? 0;
  const name  = TARABALA_NAME[idx] ?? 'Inconnu';

  let label: string;
  if (delta > 0) {
    label = `⭐ Tarabala ${name} (+${delta})`;
  } else if (delta < 0) {
    label = `⚠️ Tarabala ${name} (${delta})`;
  } else {
    label = `🌙 Tarabala ${name} (neutre)`;
  }

  return { index: idx, name, delta, label };
}

// ── calcChandrabala ─────────────────────────────────────────────────
export function calcChandrabala(
  moonSidTransit: number,
  moonSidNatal: number,
): ChandrabalaResult {
  const transitSign = Math.floor(((moonSidTransit % 360) + 360) % 360 / 30) % 12;
  const natalSign   = Math.floor(((moonSidNatal   % 360) + 360) % 360 / 30) % 12;

  const position = ((transitSign - natalSign + 12) % 12) + 1; // 1..12
  const delta    = CHANDRABALA_DELTA[position] ?? 0;

  let label: string;
  if (position === 8) {
    label = `⚠️ Astama Chandra pos.8 (${delta}) — Lune défavorable`;
  } else if (delta > 0) {
    label = `⭐ Chandrabala pos.${position} (+${delta})`;
  } else if (delta < 0) {
    label = `🔸 Chandrabala pos.${position} (${delta})`;
  } else {
    label = `🌙 Chandrabala pos.${position} (neutre)`;
  }

  return { position, delta, label };
}

// ══════════════════════════════════════════════════════════════════
// ═══ CHANDRA YOGA — Sprint I — V10.3 ═══
// Source : Parashara BPHS Ch.36 (Yogas lunaires)
// Placement : L2 (slow) — basé sur planètes transitantes vs Lune natale
// Consensus Ronde 12 : GPT valide L2 · "faible redondance" (non indépendant mais peu corrélé)
// ══════════════════════════════════════════════════════════════════
//
// DÉFINITIONS :
//   Maison 2 de la Lune natale = signe suivant (Anapha)
//   Maison 12 de la Lune natale = signe précédent (Sunaphya)
//
//   Sunaphya  : planète bénéfique en maison 12 de la Lune natale → +2
//   Anapha    : planète bénéfique en maison 2  de la Lune natale → +2
//   Durudhura : bénéfiques en 2 ET 12 simultanément → +2
//   Kemadruma : aucune planète majeure en 2 ni 12 → −3 (Lune "seule")
//   Neutral   : planètes maléfiques en 2/12 seulement → 0
//
// BÉNÉFIQUES (pour yogas positifs) : Jupiter, Vénus
// PLANÈTES MAJEURES (pour Kemadruma) : Jupiter, Vénus, Saturne, Mars, Mercure
// ── Constantes ─────────────────────────────────────────────────────

const CHANDRA_BENEFICS    = new Set(['jupiter', 'venus']);
const CHANDRA_MAJOR_PLANETS = new Set(['jupiter', 'venus', 'saturn', 'mars', 'mercury']);

// ── Interface ───────────────────────────────────────────────────────

export interface TransitPlanetSid {
  name: string;   // 'jupiter' | 'venus' | 'saturn' | 'mars' | 'mercury'
  sidLon: number; // longitude sidérale (0–360°)
}

export interface ChandraYogaResult {
  yoga: 'Sunaphya' | 'Anapha' | 'Durudhura' | 'Kemadruma' | 'Neutral';
  delta: number;
  label: string;
  detail: string;
}

// ── calcChandraYoga ─────────────────────────────────────────────────
export function calcChandraYoga(
  natalMoonSidLon: number,
  transitPlanets: TransitPlanetSid[],
): ChandraYogaResult {
  const natalSign  = Math.floor(((natalMoonSidLon % 360) + 360) % 360 / 30) % 12;
  const house2Sign  = (natalSign + 1)  % 12; // Anapha — maison 2
  const house12Sign = (natalSign + 11) % 12; // Sunaphya — maison 12

  const getSign = (sidLon: number) =>
    Math.floor(((sidLon % 360) + 360) % 360 / 30) % 12;

  const planetsInH2   = transitPlanets.filter(p => getSign(p.sidLon) === house2Sign);
  const planetsInH12  = transitPlanets.filter(p => getSign(p.sidLon) === house12Sign);

  const beneficInH2   = planetsInH2.some(p => CHANDRA_BENEFICS.has(p.name));
  const beneficInH12  = planetsInH12.some(p => CHANDRA_BENEFICS.has(p.name));
  const majorInH2orH12 = [...planetsInH2, ...planetsInH12].some(p => CHANDRA_MAJOR_PLANETS.has(p.name));

  const planetsH2Names  = planetsInH2.map(p => p.name).join(', ');
  const planetsH12Names = planetsInH12.map(p => p.name).join(', ');

  if (beneficInH2 && beneficInH12) {
    return {
      yoga: 'Durudhura',
      delta: 2,
      label: `⭐ Durudhura (+2) — bénéfiques M2:${planetsH2Names} + M12:${planetsH12Names}`,
      detail: 'Planètes bénéfiques des deux côtés de la Lune natale (BPHS Ch.36)',
    };
  }
  if (beneficInH2) {
    return {
      yoga: 'Anapha',
      delta: 2,
      label: `⭐ Anapha (+2) — ${planetsH2Names} en M2 Lune natale`,
      detail: 'Planète bénéfique en maison 2 de la Lune natale (BPHS Ch.36)',
    };
  }
  if (beneficInH12) {
    return {
      yoga: 'Sunaphya',
      delta: 2,
      label: `⭐ Sunaphya (+2) — ${planetsH12Names} en M12 Lune natale`,
      detail: 'Planète bénéfique en maison 12 de la Lune natale (BPHS Ch.36)',
    };
  }
  if (!majorInH2orH12) {
    return {
      yoga: 'Kemadruma',
      delta: -3,
      label: `⚠️ Kemadruma (−3) — Lune natale sans support planétaire`,
      detail: 'Aucune planète majeure en M2 ou M12 de la Lune natale (BPHS Ch.36)',
    };
  }
  return {
    yoga: 'Neutral',
    delta: 0,
    label: '',
    detail: 'Planètes maléfiques en 2/12 — neutre (pas de yoga bénéfique)',
  };
}

// ══════════════════════════════════════════════════════════════════
// ═══ TITHI LORD GOCHARA — Sprint J — V10.4 ═══
// Source : Gochara védique (Phaladeepika Ch.26) + cycle Tithi Lords (Muhurta Chintamani)
// Placement : L1 post-section autonome (après Transits dans convergence-daily.ts)
// Coverage : 7 planètes (Sun/Moon/Mars/Mercury/Jupiter/Venus/Saturn) + Rahu→neutre
// ══════════════════════════════════════════════════════════════════
//
// FORMULE :
//   tithiLord    = TITHI_LORDS_30[tithiNum - 1]
//   transitSign  = floor(lordSidLon / 30)                          [0..11]
//   natalSign    = floor(natalMoonSidLon / 30)                     [0..11]
//   houseFromMoon = ((transitSign - natalSign + 12) % 12) + 1      [1..12]
//   favorable    = GOCHARA_FAVORABLE[lord].includes(houseFromMoon)
//   delta = favorable ? +2 : -1   (capé ±2 côté appelant)
//
// Rahu (Tithis 8,23,30) : longitude non calculable → delta = 0 (neutre)
//
// ── Cycle des Tithi Lords (30 Tithis) ─────────────────────────────
// Shukla (1-15)  : Sun→Moon→Mars→Mercury→Jupiter→Venus→Saturn→Rahu + Sun..Saturn
// Krishna (16-30) : même cycle, Amavasya (30) = Rahu

const TITHI_LORDS_30 = [
  // Shukla Paksha (Tithis 1-15)
  'sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu',
  'sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn',
  // Krishna Paksha (Tithis 16-30)
  'sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu',
  'sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'rahu',
] as const;

// ── Maisons favorables en Gochara (depuis la Lune natale) ─────────
// Source : Phaladeepika Ch.26 / Jataka Parijata — consensus classique

const GOCHARA_FAVORABLE: Readonly<Record<string, readonly number[]>> = {
  sun:     [1, 3, 6, 10, 11],
  moon:    [1, 3, 6, 7, 10, 11],
  mars:    [3, 6, 10, 11],
  mercury: [2, 4, 6, 8, 10, 11],
  jupiter: [2, 5, 7, 9, 11],
  venus:   [1, 2, 3, 4, 5, 8, 9, 11, 12],
  saturn:  [3, 6, 11],
};

// ── Interface résultat ────────────────────────────────────────────

export interface TithiLordGocharaResult {
  lord:          string;   // planet name lowercase
  houseFromMoon: number;   // 1..12
  favorable:     boolean;
  delta:         number;   // +2 | -1 | 0 (Rahu)
  label:         string;
}

// ── getTithiLord ──────────────────────────────────────────────────

/**
 * Retourne le Seigneur du Tithi (planète en minuscules).
 * Rahu pour les Tithis 8, 23, 30.
 */
export function getTithiLord(tithiNum: number): string {
  const idx = Math.max(0, Math.min(29, tithiNum - 1));
  return TITHI_LORDS_30[idx];
}

// ── calcTithiLordGochara ─────────────────────────────────────────

/**
 * Sprint J — Tithi Lord Gochara
 * Calcule si le Seigneur du Tithi est en position favorable (Gochara védique).
 *
 * @param lord            Planète (depuis getTithiLord), doit être ≠ 'rahu'
 * @param lordSidLon      Longitude sidérale du lord (degrés 0-360), calculée côté appelant
 * @param natalMoonSidLon Longitude sidérale de la Lune natale (degrés 0-360)
 */
export function calcTithiLordGochara(
  lord: string,
  lordSidLon: number,
  natalMoonSidLon: number,
): TithiLordGocharaResult {
  const transitSign   = Math.floor(((lordSidLon     % 360) + 360) % 360 / 30) % 12;
  const natalMoonSign = Math.floor(((natalMoonSidLon % 360) + 360) % 360 / 30) % 12;
  const houseFromMoon = ((transitSign - natalMoonSign + 12) % 12) + 1; // 1..12

  const favorable = (GOCHARA_FAVORABLE[lord] ?? []).includes(houseFromMoon);
  const delta     = favorable ? 2 : -1;

  const label = favorable
    ? `⭐ Tithi Lord ${lord} M${houseFromMoon} — Gochara favorable (+${delta})`
    : `🔸 Tithi Lord ${lord} M${houseFromMoon} — Gochara défavorable (${delta})`;

  return { lord, houseFromMoon, favorable, delta, label };
}
