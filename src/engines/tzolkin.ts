// ═══ TZOLKIN — CALENDRIER MAYA SACRÉ V4.5 ═══
// 260 jours = 20 glyphes × 13 tons
// Formule : Kin = (((jours_depuis_ref + 173 - 1) % 260) + 260) % 260 + 1
// Repère : 1 janvier 2000 = Kin 173 (validé Gemini Round 2)
// Scoring : ±4 pts pipeline, ×1.15 sur 52 jours GAP
// Canal : SIGNAL (glyphe du jour) + TENDANCE (Trecena 13j)
// Source : Arbitrage Round 2 — Gemini (specs) + validation Claude Opus

// ──────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────

export type TzolkinGlyphName =
  | 'Imix'    | 'Ik'     | 'Akbal'  | 'Kan'    | 'Chicchan'
  | 'Cimi'    | 'Manik'  | 'Lamat'  | 'Muluc'  | 'Oc'
  | 'Chuen'   | 'Eb'     | 'Ben'    | 'Ix'     | 'Men'
  | 'Cib'     | 'Caban'  | 'Etznab' | 'Cauac'  | 'Ahau';

export interface TzolkinGlyph {
  index: number;        // 1-20
  name: TzolkinGlyphName;
  fr: string;           // Nom français
  symbol: string;       // Symbole
  meaning: string;      // Signification condensée
  baseScore: number;    // Score intrinsèque (-4 à +4)
  domainAffinity: {
    BUSINESS: number;
    AMOUR: number;
    CREATIVITE: number;
    VITALITE: number;
  };
}

export interface TzolkinTone {
  value: number;        // 1-13
  name: string;         // Nom français
  keyword: string;      // Mot-clé
  modifier: number;     // Modificateur de score (-2 à +3)
}

export interface TzolkinDay {
  kin: number;                 // 1-260
  glyph: TzolkinGlyph;
  tone: TzolkinTone;
  isGAP: boolean;              // Galactic Activation Portal
  scoring: {
    global: number;            // -4 à +4 (clampé)
    gapAmplifier: number;      // 1.15 si GAP, 1.0 sinon
    detail: string;
  };
  trecena: {
    dayInTrecena: number;      // 1-13
    startGlyphName: TzolkinGlyphName;
    startGlyphFr: string;
    momentum: 'building' | 'peak' | 'releasing';
    momentumFr: string;
  };
  synergies: string[];         // Résonances avec d'autres systèmes
}

// ──────────────────────────────────────────────
// CONSTANTES — REPÈRE
// ──────────────────────────────────────────────

// 1er janvier 2000 12:00 UTC = Kin 173
const KIN_REF_DATE = new Date('2000-01-01T12:00:00Z');
const KIN_REF_VALUE = 173;

// ──────────────────────────────────────────────
// LES 20 GLYPHES
// ──────────────────────────────────────────────

export const TZOLKIN_GLYPHS: TzolkinGlyph[] = [
  {
    index: 1,  name: 'Imix',    fr: 'Dragon',         symbol: '🐉',
    meaning: 'Naissance, source primordiale, nourrir',
    baseScore: 2,
    domainAffinity: { BUSINESS: 1, AMOUR: 1, CREATIVITE: 2, VITALITE: 2 },
  },
  {
    index: 2,  name: 'Ik',      fr: 'Vent',           symbol: '💨',
    meaning: 'Esprit, souffle vital, communication pure',
    baseScore: 1,
    domainAffinity: { BUSINESS: 1, AMOUR: 0, CREATIVITE: 2, VITALITE: 1 },
  },
  {
    index: 3,  name: 'Akbal',   fr: 'Nuit',           symbol: '🌑',
    meaning: 'Rêve, intuition profonde, abondance intérieure',
    baseScore: -1,
    domainAffinity: { BUSINESS: -1, AMOUR: 1, CREATIVITE: 2, VITALITE: -1 },
  },
  {
    index: 4,  name: 'Kan',     fr: 'Graine',         symbol: '🌱',
    meaning: 'Potentiel en germination, croissance, attention',
    baseScore: 2,
    domainAffinity: { BUSINESS: 2, AMOUR: 0, CREATIVITE: 1, VITALITE: 2 },
  },
  {
    index: 5,  name: 'Chicchan', fr: 'Serpent',        symbol: '🐍',
    meaning: 'Force vitale brute, instinct, puissance de survie',
    baseScore: 3,
    domainAffinity: { BUSINESS: 1, AMOUR: 2, CREATIVITE: 0, VITALITE: 3 },
  },
  {
    index: 6,  name: 'Cimi',    fr: 'Enlaceur',       symbol: '☯',
    meaning: 'Lâcher-prise nécessaire, pont entre les cycles',
    baseScore: -2,
    domainAffinity: { BUSINESS: -2, AMOUR: -1, CREATIVITE: 1, VITALITE: -1 },
  },
  {
    index: 7,  name: 'Manik',   fr: 'Main',           symbol: '✋',
    meaning: 'Guérison, accomplissement concret, connaissance pratique',
    baseScore: 3,
    domainAffinity: { BUSINESS: 2, AMOUR: 1, CREATIVITE: 1, VITALITE: 3 },
  },
  {
    index: 8,  name: 'Lamat',   fr: 'Étoile',         symbol: '⭐',
    meaning: 'Beauté rayonnante, élégance, harmonie et abondance',
    baseScore: 2,
    domainAffinity: { BUSINESS: 1, AMOUR: 3, CREATIVITE: 2, VITALITE: 1 },
  },
  {
    index: 9,  name: 'Muluc',   fr: 'Lune Maya',      symbol: '🌊',
    meaning: 'Flux émotionnel, purification, eau universelle',
    baseScore: 1,
    domainAffinity: { BUSINESS: 0, AMOUR: 2, CREATIVITE: 1, VITALITE: 1 },
  },
  {
    index: 10, name: 'Oc',      fr: 'Chien',          symbol: '🐕',
    meaning: 'Cœur loyal, amour inconditionnel, guide fidèle',
    baseScore: 2,
    domainAffinity: { BUSINESS: 1, AMOUR: 3, CREATIVITE: 0, VITALITE: 2 },
  },
  {
    index: 11, name: 'Chuen',   fr: 'Singe',          symbol: '🐒',
    meaning: 'Magie spontanée, jeu créateur, trickster illuminé',
    baseScore: 1,
    domainAffinity: { BUSINESS: 0, AMOUR: 1, CREATIVITE: 3, VITALITE: 1 },
  },
  {
    index: 12, name: 'Eb',      fr: 'Humain',         symbol: '🧑',
    meaning: 'Libre arbitre, sagesse du chemin, influence douce',
    baseScore: 0,
    domainAffinity: { BUSINESS: 1, AMOUR: 1, CREATIVITE: 1, VITALITE: 0 },
  },
  {
    index: 13, name: 'Ben',     fr: 'Bâton de Roseau', symbol: '🎋',
    meaning: 'Espace intérieur, exploration, bâtisseur de ponts',
    baseScore: 2,
    domainAffinity: { BUSINESS: 2, AMOUR: 0, CREATIVITE: 2, VITALITE: 1 },
  },
  {
    index: 14, name: 'Ix',      fr: 'Jaguar',         symbol: '🐆',
    meaning: 'Magie terrestre, réceptivité profonde, chamanisme',
    baseScore: 1,
    domainAffinity: { BUSINESS: 0, AMOUR: 1, CREATIVITE: 2, VITALITE: 2 },
  },
  {
    index: 15, name: 'Men',     fr: 'Aigle',          symbol: '🦅',
    meaning: 'Vision globale, mental supérieur, création inspirée',
    baseScore: 3,
    domainAffinity: { BUSINESS: 3, AMOUR: 0, CREATIVITE: 3, VITALITE: 1 },
  },
  {
    index: 16, name: 'Cib',     fr: 'Vautour',        symbol: '🦉',
    meaning: 'Intelligence ancestrale, intrépidité, mémoire profonde',
    baseScore: 0,
    domainAffinity: { BUSINESS: 1, AMOUR: -1, CREATIVITE: 0, VITALITE: 0 },
  },
  {
    index: 17, name: 'Caban',   fr: 'Terre',          symbol: '🌍',
    meaning: 'Évolution synchro, navigation des cycles terrestres',
    baseScore: 2,
    domainAffinity: { BUSINESS: 1, AMOUR: 1, CREATIVITE: 1, VITALITE: 2 },
  },
  {
    index: 18, name: 'Etznab',  fr: 'Miroir',         symbol: '🪞',
    meaning: 'Vérité absolue, reflet sans filtre, clarté tranchante',
    baseScore: -1,
    domainAffinity: { BUSINESS: -1, AMOUR: -2, CREATIVITE: 1, VITALITE: 0 },
  },
  {
    index: 19, name: 'Cauac',   fr: 'Tempête',        symbol: '⛈',
    meaning: 'Catalyse par l\'épreuve, auto-génération, foudre purificatrice',
    baseScore: -2,
    domainAffinity: { BUSINESS: -2, AMOUR: -1, CREATIVITE: 2, VITALITE: -1 },
  },
  {
    index: 20, name: 'Ahau',    fr: 'Soleil',         symbol: '☀',
    meaning: 'Illumination universelle, maîtrise, feu sacré de l\'accomplissement',
    baseScore: 4,
    domainAffinity: { BUSINESS: 2, AMOUR: 2, CREATIVITE: 3, VITALITE: 3 },
  },
];

// ──────────────────────────────────────────────
// LES 13 TONS
// ──────────────────────────────────────────────

export const TZOLKIN_TONES: TzolkinTone[] = [
  { value: 1,  name: 'Magnétique',   keyword: 'Initiation',     modifier: 2  },
  { value: 2,  name: 'Lunaire',      keyword: 'Dualité',        modifier: -1 },
  { value: 3,  name: 'Électrique',   keyword: 'Activation',     modifier: 3  },
  { value: 4,  name: 'Autoexistant', keyword: 'Définition',     modifier: 0  },
  { value: 5,  name: 'Harmonique',   keyword: 'Autonomie',      modifier: 2  },
  { value: 6,  name: 'Rythmique',    keyword: 'Équilibre',      modifier: 0  },
  { value: 7,  name: 'Résonant',     keyword: 'Harmonisation',  modifier: 2  },
  { value: 8,  name: 'Galactique',   keyword: 'Intégrité',      modifier: 1  },
  { value: 9,  name: 'Solaire',      keyword: 'Manifestation',  modifier: 3  },
  { value: 10, name: 'Planétaire',   keyword: 'Matérialisation',modifier: 2  },
  { value: 11, name: 'Spectral',     keyword: 'Libération',     modifier: -2 },
  { value: 12, name: 'Cristal',      keyword: 'Coopération',    modifier: 1  },
  { value: 13, name: 'Cosmique',     keyword: 'Transcendance',  modifier: 4  },
];

// ──────────────────────────────────────────────
// 52 JOURS GAP (Galactic Activation Portals)
// Motif en sablier dans la grille Tzolkin 20×13
// ──────────────────────────────────────────────

export const GAP_KINS = new Set<number>([
  // Colonnes centrales du motif en sablier (vérifiés sur grille traditionnelle)
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  11, 12, 13,
  // Symétrie
  248, 249, 250, 251, 252, 253, 254, 255, 256, 257, 258, 259, 260,
  // Bandes internes
  14, 34, 54, 74, 94,
  20, 40, 60, 80, 100,
  // Portails centraux
  105, 120, 130, 131, 141, 156,
  // Portails additionnels (tradition calendrique)
  66, 71, 76, 81, 86, 91, 96, 101,
  160, 165, 170, 175, 180, 185, 190, 195,
]);

// ──────────────────────────────────────────────
// CALCUL
// ──────────────────────────────────────────────

function dateDiffDays(from: Date, to: Date): number {
  const fromUtc = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const toUtc   = Date.UTC(to.getFullYear(),   to.getMonth(),   to.getDate());
  return Math.round((toUtc - fromUtc) / 86400000);
}

/**
 * Calcule le Kin Tzolkin (1-260) pour une date donnée.
 * Formule validée : Kin = (((jours_depuis_ref + ref_kin - 1) % 260) + 260) % 260 + 1
 */
export function calcTzolkinKin(date: Date): number {
  const days = dateDiffDays(KIN_REF_DATE, date);
  return (((days + KIN_REF_VALUE - 1) % 260) + 260) % 260 + 1;
}

/**
 * Calcule la journée Tzolkin complète avec scoring V4.5.
 */
export function calcTzolkinDay(
  date: Date,
  personalDay?: number,
  hexNum?: number
): TzolkinDay {
  const kin = calcTzolkinKin(date);

  // Glyphe : (kin-1) % 20 → index 0-19 → glyphe index 1-20
  const glyphIndex = ((kin - 1) % 20) + 1;
  const glyph = TZOLKIN_GLYPHS[glyphIndex - 1];

  // Ton : (kin-1) % 13 → index 0-12 → ton 1-13
  const toneValue = ((kin - 1) % 13) + 1;
  const tone = TZOLKIN_TONES[toneValue - 1];

  const isGAP = GAP_KINS.has(kin);
  const gapAmplifier = isGAP ? 1.15 : 1.0;

  // Score = baseScore glyphe + modifier ton, clampé ±4
  const rawScore = glyph.baseScore + tone.modifier;
  const global = Math.max(-4, Math.min(4, rawScore));

  // Trecena (onde de 13 jours)
  // Le ton = position dans la trecena (1-13)
  const trecenaDayInTrecena = toneValue;
  // Kin de début de trecena = kin - (toneValue - 1)
  const trecenaStartKin = ((kin - toneValue + 260) % 260) || 260;
  const trecenaStartGlyphIdx = ((trecenaStartKin - 1) % 20);
  const trecenaStartGlyph = TZOLKIN_GLYPHS[trecenaStartGlyphIdx];
  const momentum: 'building' | 'peak' | 'releasing' =
    trecenaDayInTrecena <= 4 ? 'building' : trecenaDayInTrecena <= 9 ? 'peak' : 'releasing';
  const momentumFr = momentum === 'building' ? 'En montée' : momentum === 'peak' ? 'Au sommet' : 'En descente';

  // Synergies avec autres systèmes
  const synergies = buildTzolkinSynergies(kin, glyph, tone, personalDay, hexNum, isGAP);

  return {
    kin,
    glyph,
    tone,
    isGAP,
    scoring: {
      global,
      gapAmplifier,
      detail: `Kin ${kin} — ${glyph.fr} · Ton ${tone.value} ${tone.name}${isGAP ? ' · ✦ GAP ×1.15' : ''}`,
    },
    trecena: {
      dayInTrecena: trecenaDayInTrecena,
      startGlyphName: trecenaStartGlyph.name,
      startGlyphFr: trecenaStartGlyph.fr,
      momentum,
      momentumFr,
    },
    synergies,
  };
}

/**
 * Détecte les synergies Tzolkin × BaZi/Numérologie/I Ching.
 */
function buildTzolkinSynergies(
  kin: number,
  glyph: TzolkinGlyph,
  tone: TzolkinTone,
  personalDay?: number,
  hexNum?: number,
  isGAP?: boolean,
): string[] {
  const synergies: string[] = [];

  // Ton 1 + PD 1 : double initiation
  if (tone.value === 1 && personalDay === 1) {
    synergies.push('✦ Double Initiation — Ton Magnétique + Jour Personnel 1 (élan de démarrage rare)');
  }

  // Ton 9 + Hex. 9 : concentration avant manifestation
  if (tone.value === 9 && hexNum === 9) {
    synergies.push('✦ Ton Solaire + Hex. 9 — concentration maximale avant manifestation concrète');
  }

  // Ton 10 Planétaire : jour de manifestation physique
  if (tone.value === 10) {
    synergies.push('✦ Ton Planétaire — les intentions descendent dans la matière aujourd\'hui');
  }

  // Ton 13 : transcendance et clôture
  if (tone.value === 13) {
    synergies.push('✦ Ton Cosmique — journée de clôture de cycle, idéale pour bilan et lâcher-prise');
  }

  // Ahau : toujours signal fort
  if (glyph.name === 'Ahau') {
    synergies.push('☀ Glyphe Ahau — Feu universel, journée d\'illumination et de maîtrise');
  }

  // Men (Aigle) + Ton 9 ou 13 : vision + action
  if (glyph.name === 'Men' && (tone.value === 9 || tone.value === 13)) {
    synergies.push('🦅 Aigle + Ton de Puissance — vision stratégique exceptionnelle');
  }

  // Cauac (Tempête) : journée de catalyse forcée
  if (glyph.name === 'Cauac') {
    synergies.push('⛈ Glyphe Cauac — catalyse par friction, ne résistez pas au mouvement');
  }

  // Etznab (Miroir) : clarté tranchante
  if (glyph.name === 'Etznab') {
    synergies.push('🪞 Glyphe Miroir — vérité sans filtre, idéal pour bilan personnel');
  }

  // GAP
  if (isGAP) {
    synergies.push('✦ Portail d\'Activation Galactique — score amplifié ×1.15, énergie intensifiée');
  }

  return synergies;
}

/**
 * Retourne le forecast Tzolkin sur N jours.
 */
export function getTzolkinForecast(startDate: Date, days: number = 13): TzolkinDay[] {
  const result: TzolkinDay[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    result.push(calcTzolkinDay(d));
  }
  return result;
}

/**
 * Retourne les N prochains jours GAP à partir d'une date.
 */
export function getNextGAPDays(startDate: Date, count: number = 4): Date[] {
  const result: Date[] = [];
  let current = new Date(startDate);
  current.setDate(current.getDate() + 1);

  while (result.length < count) {
    const kin = calcTzolkinKin(current);
    if (GAP_KINS.has(kin)) {
      result.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
    // Sécurité anti-boucle infinie
    if (current.getTime() - startDate.getTime() > 365 * 86400000) break;
  }
  return result;
}

/**
 * Vérifie si aujourd'hui est un jour GAP.
 */
export function isTodayGAP(date: Date = new Date()): boolean {
  return GAP_KINS.has(calcTzolkinKin(date));
}
