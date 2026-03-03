// ═══ PROFECTIONS ENGINE V1.0 (Kaironaute V4.7) ═══
// Profections annuelles — système de timing astrologique traditionnel
// Chaque année civile correspond à une Maison comptée depuis l'Ascendant (ou Soleil si noTime)
// Sources : Schmidt, Hand, tradition hellénistique Whole Sign
// Intégration : post-processing dans convergence.ts (multiplicateur domaine)

// === TYPES ===
export interface ProfectionResult {
  activeHouse: number;          // 1-12
  activeSign: string;           // Signe actif (ex: "Balance")
  timeLord: string;             // Planète maîtresse du signe (ex: "Vénus")
  domainMultiplier: number;     // Multiplicateur domaine (1.10 à 1.25)
  domain: string;               // Domaine Kaironaute actif (ex: "Amour")
  age: number;                  // Âge révolu au moment du calcul
}

// === RULERSHIPS PLANÉTAIRES TRADITIONNELS ===
// Système Ptolémaïque (7 planètes classiques)
export const SIGN_RULER: Record<string, string> = {
  'Bélier':      'Mars',
  'Taureau':     'Vénus',
  'Gémeaux':     'Mercure',
  'Cancer':      'Lune',
  'Lion':        'Soleil',
  'Vierge':      'Mercure',
  'Balance':     'Vénus',
  'Scorpion':    'Mars',
  'Sagittaire':  'Jupiter',
  'Capricorne':  'Saturne',
  'Verseau':     'Saturne',
  'Poissons':    'Jupiter'
};

// === ORDRE ZODIACAL ===
export const ZODIAC_ORDER: string[] = [
  'Bélier', 'Taureau', 'Gémeaux', 'Cancer',
  'Lion', 'Vierge', 'Balance', 'Scorpion',
  'Sagittaire', 'Capricorne', 'Verseau', 'Poissons'
];

// === MULTIPLICATEURS DOMAINE PAR MAISON ===
// Mapping Maison → domaine Kaironaute + multiplicateur de score
// Maisons 1-12 → 6 domaines uniquement (certains partagés)
export const HOUSE_DOMAIN_MULTIPLIER: Record<number, { domain: string; mult: number }> = {
  1:  { domain: 'Vitalité',    mult: 1.15 },
  2:  { domain: 'Carrière',    mult: 1.10 },
  3:  { domain: 'Social',      mult: 1.10 },
  4:  { domain: 'Spirituel',   mult: 1.15 },
  5:  { domain: 'Créativité',  mult: 1.20 },
  6:  { domain: 'Vitalité',    mult: 1.10 },
  7:  { domain: 'Amour',       mult: 1.25 },
  8:  { domain: 'Spirituel',   mult: 1.15 },
  9:  { domain: 'Créativité',  mult: 1.15 },
  10: { domain: 'Carrière',    mult: 1.25 },
  11: { domain: 'Social',      mult: 1.20 },
  12: { domain: 'Spirituel',   mult: 1.20 }
};

// === MAPPING LONGITUDE SOLAIRE → SIGNE ===
// Utilisé pour le fallback noTime (Signe Solaire comme Maison 1)
export function getSunSign(sunLongitude: number): string {
  const idx = Math.floor(((sunLongitude % 360) + 360) % 360 / 30);
  return ZODIAC_ORDER[idx] || 'Bélier';
}

// === ÂGE RÉVOLU ===
// Calcul strict : anniversaire civil passé (pas Retour Solaire)
export function getProfectionAge(birthDate: string, currentDate: string): number {
  const bd = new Date(birthDate);
  const cd = new Date(currentDate);
  let age = cd.getFullYear() - bd.getFullYear();
  // Pas encore eu son anniversaire cette année
  if (
    cd.getMonth() < bd.getMonth() ||
    (cd.getMonth() === bd.getMonth() && cd.getDate() < bd.getDate())
  ) {
    age--;
  }
  return Math.max(0, age);
}

// === CALCUL PROFECTION ANNUELLE ===
// ascSign : signe de l'Ascendant (null si noTime)
// sunSign : signe solaire (fallback noTime)
// noTime  : true = pas d'heure de naissance → utiliser sunSign
export function calcProfection(
  birthDate: string,
  currentDate: string,
  ascSign: string | null = null,
  sunSign: string = 'Bélier',
  noTime: boolean = false
): ProfectionResult {
  const age = getProfectionAge(birthDate, currentDate);

  // Maison active : age % 12, Maison 1 à l'âge 0
  const activeHouseIndex = age % 12;
  const activeHouse      = activeHouseIndex + 1; // 1-based

  // Signe de base : ASC si disponible, Soleil si noTime
  const baseSign = (!noTime && ascSign) ? ascSign : sunSign;

  // Signe actif : compter depuis le signe de base
  const baseSignIdx   = Math.max(0, ZODIAC_ORDER.indexOf(baseSign));
  const activeSignIdx = (baseSignIdx + activeHouseIndex) % 12;
  const activeSign    = ZODIAC_ORDER[activeSignIdx];

  // Time Lord : maître planétaire du signe actif
  const timeLord = SIGN_RULER[activeSign] || 'Soleil';

  // Effet domaine
  const effect = HOUSE_DOMAIN_MULTIPLIER[activeHouse] || { domain: 'Vitalité', mult: 1.0 };

  return {
    activeHouse,
    activeSign,
    timeLord,
    domainMultiplier: effect.mult,  // number unique — pas Record
    domain: effect.domain,
    age
  };
}

// === UTILITAIRE : domaine depuis maison ===
export function getDomainFromHouse(house: number): string {
  return HOUSE_DOMAIN_MULTIPLIER[house]?.domain || 'Vitalité';
}

// === UTILITAIRE : score domaine pour multiplicateur ===
// Calcule la portion du score raw attribuable au domaine actif
const DOMAIN_WEIGHTS: Record<string, number> = {
  Vitalité:   1.0,
  Carrière:   1.2,
  Social:     0.8,
  Spirituel:  1.1,
  Créativité: 1.0,
  Amour:      1.3
};

const TOTAL_WEIGHT = Object.values(DOMAIN_WEIGHTS).reduce((a, b) => a + b, 0); // 6.4

export function getDomainScore(rawTotal: number, activeHouse: number): number {
  const domain       = getDomainFromHouse(activeHouse);
  const domainWeight = (DOMAIN_WEIGHTS[domain] ?? 1.0) / TOTAL_WEIGHT;
  return Math.round(rawTotal * domainWeight);
}
