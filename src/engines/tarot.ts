/**
 * tarot.ts — Moteur Tarot des Arcanes Majeurs
 * Kaironaute V9 Sprint 6
 *
 * Approche : Miroir archétypal jungien (pas oracle, pas charlatan).
 * - Carte Natale (Birth Card) : déterministe, calculée depuis la date de naissance
 * - Arcane du Jour : déterministe, calculé depuis YYYYMMDD
 * - Tirage Conscient : crypto.getRandomValues() — entropie réelle, 1 tirage/jour
 *
 * Système : Tarot de Marseille (VIII=Justice, XI=Force, Le Mat=0)
 */

import { sto } from './storage';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export type TarotElement = 'feu' | 'eau' | 'air' | 'terre' | 'esprit';

export type AstroType = 'planet' | 'sign' | 'element';

export interface MajorArcana {
  num: number;          // 0–21 (Le Mat = 0)
  name_fr: string;
  name_en: string;
  planet: string;       // LEGACY — conservé pour rétrocompat, voir astroType/astroValue
  astroType: AstroType; // Golden Dawn — Ronde 2026-03-21 Q5 unanime 3/3
  astroValue: string;   // Golden Dawn — valeur correspondante
  element: TarotElement;
  theme: string;        // mot-clé central (≤ 25 cars)
  light: string;        // aspect lumineux
  shadow: string;       // aspect ombragé
  narrative: string;    // texte Grok format : "Tu [verbe]. La question n'est pas [X], mais [Y]."
  image?: string;       // Sprint AX-UX — URL image Wikimedia Commons (RWS 1909, domaine public)
}

// Sprint AX-UX — Images Rider-Waite-Smith (1909, domaine public) via Wikimedia Commons
// Mapping Marseille → RWS : VIII et XI inversés (Marseille VIII=Justice=RWS 11, Marseille XI=Force=RWS 08)
const RWS_IMG: Record<number, string> = {
  0:  'RWS_Tarot_00_Fool.jpg',
  1:  'RWS_Tarot_01_Magician.jpg',
  2:  'RWS_Tarot_02_High_Priestess.jpg',
  3:  'RWS_Tarot_03_Empress.jpg',
  4:  'RWS_Tarot_04_Emperor.jpg',
  5:  'RWS_Tarot_05_Hierophant.jpg',
  6:  'RWS_Tarot_06_Lovers.jpg',
  7:  'RWS_Tarot_07_Chariot.jpg',
  8:  'RWS_Tarot_11_Justice.jpg',    // Marseille VIII = Justice → RWS XI
  9:  'RWS_Tarot_09_Hermit.jpg',
  10: 'RWS_Tarot_10_Wheel_of_Fortune.jpg',
  11: 'RWS_Tarot_08_Strength.jpg',   // Marseille XI = Force → RWS VIII
  12: 'RWS_Tarot_12_Hanged_Man.jpg',
  13: 'RWS_Tarot_13_Death.jpg',
  14: 'RWS_Tarot_14_Temperance.jpg',
  15: 'RWS_Tarot_15_Devil.jpg',
  16: 'RWS_Tarot_16_Tower.jpg',
  17: 'RWS_Tarot_17_Star.jpg',
  18: 'RWS_Tarot_18_Moon.jpg',
  19: 'RWS_Tarot_19_Sun.jpg',
  20: 'RWS_Tarot_20_Judgement.jpg',
  21: 'RWS_Tarot_21_World.jpg',
};
function getRWSImageUrl(num: number): string {
  const file = RWS_IMG[num] ?? RWS_IMG[0];
  return `https://commons.wikimedia.org/w/index.php?title=Special:Redirect/file/${file}&width=120`;
}

export interface TarotDraw {
  arcana: MajorArcana;
  isReversed: boolean;
  question: string;
  timestamp: number;
}

export interface TarotDrawRecord {
  id: string;
  question: string;
  arcanaNum: number;
  arcanaName: string;
  isReversed: boolean;
}

// ─────────────────────────────────────────────
// Table des 22 Arcanes Majeurs — Tarot de Marseille
// ─────────────────────────────────────────────
export const MARSEILLE_MAJOR_ARCANA: MajorArcana[] = [
  {
    num: 0, name_fr: 'Le Mat', name_en: 'The Fool',
    planet: 'Uranus', astroType: 'planet', astroValue: 'Uranus', element: 'air',
    theme: 'Saut dans l\'inconnu',
    light: 'Spontanéité, liberté, commencements purs',
    shadow: 'Imprudence, fuite des responsabilités',
    narrative: 'Tu te lances dans l\'inconnu avec une légèreté audacieuse. La question n\'est pas si tu es prêt, mais si tu oses commencer.',
  },
  {
    num: 1, name_fr: 'Le Bateleur', name_en: 'The Magician',
    planet: 'Mercure', astroType: 'planet', astroValue: 'Mercure', element: 'air',
    theme: 'Maîtrise de l\'action',
    light: 'Habileté, volonté, concentration sur l\'instant',
    shadow: 'Manipulation, dispersion, illusions',
    narrative: 'Tu maîtrises les outils à ta disposition. La question n\'est pas ce qui manque, mais ce que tu feras de ce que tu as.',
  },
  {
    num: 2, name_fr: 'La Papesse', name_en: 'The High Priestess',
    planet: 'Lune', astroType: 'planet', astroValue: 'Lune', element: 'eau',
    theme: 'Connaissance intérieure',
    light: 'Intuition, mystère, réceptivité profonde',
    shadow: 'Secrets lourds, repli excessif, passivité',
    narrative: 'Tu pressens quelque chose que les mots ne sauraient encore dire. La question n\'est pas d\'agir, mais d\'écouter.',
  },
  {
    num: 3, name_fr: 'L\'Impératrice', name_en: 'The Empress',
    planet: 'Vénus', astroType: 'planet', astroValue: 'Vénus', element: 'terre',
    theme: 'Abondance et création',
    light: 'Fertilité, sensualité, générosité naturelle',
    shadow: 'Dépendance, excès, possession',
    narrative: 'Tu portes en toi une abondance prête à éclore. La question n\'est pas de manquer, mais d\'accueillir ce qui pousse.',
  },
  {
    num: 4, name_fr: 'L\'Empereur', name_en: 'The Emperor',
    planet: 'Bélier', astroType: 'sign', astroValue: 'Bélier', element: 'feu',
    theme: 'Autorité et structure',
    light: 'Leadership, stabilité, fondations solides',
    shadow: 'Rigidité, contrôle excessif, tyrannie',
    narrative: 'Tu possèdes une autorité intérieure que tu sous-estimes. La question n\'est pas de contrôler les autres, mais de gouverner ta propre voie.',
  },
  {
    num: 5, name_fr: 'Le Pape', name_en: 'The Hierophant',
    planet: 'Taureau', astroType: 'sign', astroValue: 'Taureau', element: 'terre',
    theme: 'Tradition et sagesse transmise',
    light: 'Enseignement, guidance spirituelle, appartenance',
    shadow: 'Dogmatisme, conformisme, autorité aveugle',
    narrative: 'Tu cherches un sens plus grand à ce que tu vis. La question n\'est pas la règle à suivre, mais la sagesse à intégrer.',
  },
  {
    num: 6, name_fr: 'L\'Amoureux', name_en: 'The Lovers',
    planet: 'Gémeaux', astroType: 'sign', astroValue: 'Gémeaux', element: 'air',
    theme: 'Choix du cœur',
    light: 'Union, désir assumé, choix conscient',
    shadow: 'Hésitation, dualité non résolue, désir inconscient',
    narrative: 'Tu es face à un choix qui engage ton cœur. La question n\'est pas qui choisir, mais ce que tu veux vraiment incarner.',
  },
  {
    num: 7, name_fr: 'Le Chariot', name_en: 'The Chariot',
    planet: 'Cancer', astroType: 'sign', astroValue: 'Cancer', element: 'eau',
    theme: 'Maîtrise du mouvement',
    light: 'Victoire, direction affirmée, élan maîtrisé',
    shadow: 'Arrogance, fuite en avant, contrôle perdu',
    narrative: 'Tu avances avec une volonté affirmée. La question n\'est pas la destination, mais si tu pilotes vraiment ce mouvement.',
  },
  {
    num: 8, name_fr: 'La Justice', name_en: 'Justice',
    planet: 'Balance', astroType: 'sign', astroValue: 'Balance', element: 'air',
    theme: 'Équilibre et vérité',
    light: 'Équité, clarté, responsabilité assumée',
    shadow: 'Jugement sévère, rigidité morale, rancune',
    narrative: 'Tu récoltes ce que tu as semé, ni plus, ni moins. La question n\'est pas d\'être jugé, mais de rétablir ta propre équilibre.',
  },
  {
    num: 9, name_fr: 'L\'Ermite', name_en: 'The Hermit',
    planet: 'Vierge', astroType: 'sign', astroValue: 'Vierge', element: 'terre',
    theme: 'Sagesse en solitude',
    light: 'Discernement, intériorité, guidance douce',
    shadow: 'Isolement, repli, refus du monde',
    narrative: 'Tu portes une lumière intérieure qui guide sans s\'imposer. La question n\'est pas l\'isolement, mais la juste solitude qui révèle.',
  },
  {
    num: 10, name_fr: 'La Roue de Fortune', name_en: 'Wheel of Fortune',
    planet: 'Jupiter', astroType: 'planet', astroValue: 'Jupiter', element: 'feu',
    theme: 'Cycles et retournements',
    light: 'Chance, mouvement, acceptation du changement',
    shadow: 'Dépendance au destin, passivité, imprévisibilité',
    narrative: 'Tu vis un tournant, voulu ou non. La question n\'est pas ce qui change, mais comment tu t\'y adaptes.',
  },
  {
    num: 11, name_fr: 'La Force', name_en: 'Strength',
    planet: 'Lion', astroType: 'sign', astroValue: 'Lion', element: 'feu',
    theme: 'Douceur qui dompte',
    light: 'Courage intérieur, maîtrise des instincts, persévérance',
    shadow: 'Force brute, domination, refoulement',
    narrative: 'Tu sais dompter tes propres tempêtes avec une douceur inattendue. La question n\'est pas de vaincre, mais de transformer.',
  },
  {
    num: 12, name_fr: 'Le Pendu', name_en: 'The Hanged Man',
    planet: 'Neptune', astroType: 'planet', astroValue: 'Neptune', element: 'eau',
    theme: 'Suspension volontaire',
    light: 'Nouvelle perspective, lâcher-prise, sagesse inversée',
    shadow: 'Blocage, sacrifice inutile, victimisation',
    narrative: 'Tu vois le monde depuis un angle que peu d\'autres osent. La question n\'est pas de résister, mais d\'apprendre à lâcher prise.',
  },
  {
    num: 13, name_fr: 'L\'Arcane sans Nom', name_en: 'Death',
    planet: 'Scorpion', astroType: 'sign', astroValue: 'Scorpion', element: 'eau',
    theme: 'Transformation radicale',
    light: 'Renouveau, fin nécessaire, transition libératrice',
    shadow: 'Résistance au changement, stagnation, peur',
    narrative: 'Tu traverses une fin qui prépare un commencement. La question n\'est pas ce qui disparaît, mais ce qui renaît.',
  },
  {
    num: 14, name_fr: 'La Tempérance', name_en: 'Temperance',
    planet: 'Sagittaire', astroType: 'sign', astroValue: 'Sagittaire', element: 'feu',
    theme: 'Alchimie intérieure',
    light: 'Équilibre, patience, fusion des contraires',
    shadow: 'Procrastination, manque d\'engagement, dilution',
    narrative: 'Tu trouves l\'alchimie juste entre deux extrêmes. La question n\'est pas de trancher, mais de marier avec grâce.',
  },
  {
    num: 15, name_fr: 'Le Diable', name_en: 'The Devil',
    planet: 'Capricorne', astroType: 'sign', astroValue: 'Capricorne', element: 'terre',
    theme: 'Face aux chaînes intérieures',
    light: 'Prise de conscience, énergie brute libérée, désirs assumés',
    shadow: 'Attachement, addiction, illusion de contrainte',
    narrative: 'Tu fais face à ce qui te fascine et te lie. La question n\'est pas la peur, mais la part de liberté que tu choisis de reprendre.',
  },
  {
    num: 16, name_fr: 'La Maison Dieu', name_en: 'The Tower',
    planet: 'Mars', astroType: 'planet', astroValue: 'Mars', element: 'feu',
    theme: 'Effondrement libérateur',
    light: 'Révélation soudaine, rupture nécessaire, vérité qui libère',
    shadow: 'Chaos subi, destruction inconsciente, choc non intégré',
    narrative: 'Tu traverses un bouleversement nécessaire. La question n\'est pas ce qui s\'effondre, mais ce que tu peux enfin construire sur du vrai.',
  },
  {
    num: 17, name_fr: 'L\'Étoile', name_en: 'The Star',
    planet: 'Verseau', astroType: 'sign', astroValue: 'Verseau', element: 'air',
    theme: 'Espoir et renouveau',
    light: 'Foi, inspiration, connexion au cosmos',
    shadow: 'Naïveté, idéalisme fragile, fuite vers le rêve',
    narrative: 'Tu retrouves ta connexion à quelque chose de plus grand. La question n\'est pas le doute, mais la confiance que tu oses renouer.',
  },
  {
    num: 18, name_fr: 'La Lune', name_en: 'The Moon',
    planet: 'Poissons', astroType: 'sign', astroValue: 'Poissons', element: 'eau',
    theme: 'Illusion et profondeur',
    light: 'Réceptivité, imagination, accès à l\'inconscient',
    shadow: 'Confusion, anxiété, peurs projetées',
    narrative: 'Tu navigues dans des eaux obscures et chargées d\'illusions. La question n\'est pas ce qui est réel, mais ce que tu projettes sur le monde.',
  },
  {
    num: 19, name_fr: 'Le Soleil', name_en: 'The Sun',
    planet: 'Soleil', astroType: 'planet', astroValue: 'Soleil', element: 'feu',
    theme: 'Rayonnement et joie',
    light: 'Vitalité, succès, clarté retrouvée',
    shadow: 'Orgueil, aveuglement par l\'excès de lumière',
    narrative: 'Tu rayonnes d\'une clarté qui donne envie à ceux qui t\'entourent. La question n\'est pas si tu mérites, mais si tu acceptes de briller.',
  },
  {
    num: 20, name_fr: 'Le Jugement', name_en: 'Judgement',
    planet: 'Pluton', astroType: 'planet', astroValue: 'Pluton', element: 'feu',
    theme: 'L\'appel à être soi',
    light: 'Éveil, réponse à sa vocation, renaissance consciente',
    shadow: 'Culpabilité, auto-jugement, refus d\'entendre',
    narrative: 'Tu entends un appel intérieur que tu ne peux plus ignorer. La question n\'est pas d\'être jugé, mais de répondre enfin à qui tu es vraiment.',
  },
  {
    num: 21, name_fr: 'Le Monde', name_en: 'The World',
    planet: 'Saturne', astroType: 'planet', astroValue: 'Saturne', element: 'terre',
    theme: 'Accomplissement et totalité',
    light: 'Intégration, succès complet, liberté gagnée',
    shadow: 'Stagnation après la victoire, refus d\'avancer',
    narrative: 'Tu touches à l\'accomplissement d\'un cycle. La question n\'est pas l\'arrivée, mais ce que tu portes de nouveau vers le suivant.',
  },
];

// ─────────────────────────────────────────────
// Map Dasha → Arcane (Golden Dawn + convention Kaironaute)
// ─────────────────────────────────────────────
export const DASHA_ARCANA_MAP: Record<string, number> = {
  Mercure: 1,   // Le Bateleur
  Lune:    2,   // La Papesse
  Vénus:   3,   // L'Impératrice
  Jupiter: 10,  // La Roue de Fortune
  Mars:    16,  // La Maison Dieu
  Soleil:  19,  // Le Soleil
  Saturne: 21,  // Le Monde
  Rahu:    15,  // Le Diable (convention Kaironaute)
  Ketu:    12,  // Le Pendu (convention Kaironaute)
};

// ─────────────────────────────────────────────
// Texte d'onboarding (framing anti-charlatan)
// ─────────────────────────────────────────────
export const TAROT_ONBOARDING = `Dans Kaironaute, le Tarot n\'est pas un oracle : c\'est un miroir archétypal au sens jungien du terme. Chaque Arcane représente une configuration psychologique universelle — non pas ce qui va t\'arriver, mais ce que tu savais déjà. La synchronicité fait le reste : le bon symbole, au bon moment, révèle ce que tu savais déjà.`;

// ─────────────────────────────────────────────
// Algorithmes de calcul
// ─────────────────────────────────────────────

/** Somme de tous les chiffres d'une chaîne (ignore non-chiffres) */
function sumDigits(s: string): number {
  return s.split('').reduce((acc, c) => {
    const d = parseInt(c, 10);
    return acc + (isNaN(d) ? 0 : d);
  }, 0);
}

/** Réduit un entier dans [1–22] par addition iterative */
function reduceTo1to22(n: number): number {
  while (n > 22) {
    n = sumDigits(String(n));
  }
  return n;
}

/** Convertit le résultat [1–22] vers [0–21] (22 → Le Mat = 0) */
function arcanaNumFrom1to22(r: number): number {
  return r === 22 ? 0 : r;
}

/** Extrait [year, month, day] depuis YYYY-MM-DD ou YYYYMMDD */
function parseDateComponents(dateStr: string): [number, number, number] {
  const d = dateStr.replace(/\D/g, '');
  if (d.length === 8) return [parseInt(d.slice(0, 4), 10), parseInt(d.slice(4, 6), 10), parseInt(d.slice(6, 8), 10)];
  const parts = dateStr.split('-').map(Number);
  return [parts[0] || 2000, parts[1] || 1, parts[2] || 1];
}

/**
 * Calcule la Carte Natale (Birth Card) depuis la date de naissance.
 * Méthode Mary K. Greer : jour + mois + année → réduction théosophique [1–22] → [0–21]
 * Ronde 2026-03-21 Q4 : unanime 3/3 — remplace la somme des chiffres YYYYMMDD
 * @param bd Date de naissance format YYYY-MM-DD ou YYYYMMDD
 * @returns num ∈ [0–21] de l'Arcane Majeur (Carte de Personnalité)
 */
export function calcBirthCard(bd: string): number {
  const [y, m, d] = parseDateComponents(bd);
  const sum = d + m + y;
  return arcanaNumFrom1to22(reduceTo1to22(sum));
}

/**
 * Constellation Greer complète : Carte de Personnalité + Carte d'Âme.
 * Ronde 2026-03-21 R2 — GPT + Gemini : ajouter double réduction.
 *
 * Méthode Mary K. Greer (Who Are You in the Tarot?) :
 * 1. sum = day + month + year
 * 2. Réduire jusqu'à obtenir un nombre ≤ 22
 *    - Si ≤ 9 → 1 seule carte (Personnalité = Âme)
 *    - Si 10–22 → Personnalité = ce nombre, Âme = somme des chiffres
 *    - Cas spécial 19 → Personnalité 19, Âme 10, Essence 1 (3 cartes)
 *    - Cas spécial 22 → Le Mat (0) comme Personnalité, Âme = 4
 *
 * @returns { personality: [0-21], soul: [0-21], essence?: [0-21] }
 */
export interface BirthCardConstellation {
  personality: number; // Arcane de Personnalité [0-21]
  soul: number;        // Arcane d'Âme [0-21]
  essence?: number;    // Arcane d'Essence (seulement si 3 cartes, ex: 19→10→1)
}

export function calcBirthCardConstellation(bd: string): BirthCardConstellation {
  const [y, m, d] = parseDateComponents(bd);
  const sum = d + m + y;

  // Première réduction : obtenir un nombre ≤ 22
  let personality = sum;
  while (personality > 22) {
    personality = sumDigits(String(personality));
  }

  // Si ≤ 9 : une seule carte (Personnalité = Âme)
  if (personality <= 9) {
    return { personality: arcanaNumFrom1to22(personality), soul: arcanaNumFrom1to22(personality) };
  }

  // Si 10–22 : Personnalité + Âme (réduction supplémentaire)
  const soulNum = sumDigits(String(personality));

  // Cas spécial : 19 → 10 → 1 (trois niveaux)
  if (personality === 19) {
    return {
      personality: 19,   // Le Soleil
      soul: 10,          // La Roue de Fortune
      essence: 1,        // Le Bateleur
    };
  }

  // Cas spécial : 22 → Le Mat (0) + Âme 4
  if (personality === 22) {
    return {
      personality: 0,    // Le Mat
      soul: 4,           // L'Empereur
    };
  }

  return {
    personality: arcanaNumFrom1to22(personality),
    soul: arcanaNumFrom1to22(soulNum),
  };
}

/**
 * Calcule l'Arcane du Jour depuis une date.
 * Méthode Mary K. Greer : jour + mois + année → réduction théosophique
 * @param dateStr Date format YYYY-MM-DD ou YYYYMMDD
 * @returns num ∈ [0–21]
 */
export function calcTarotDayNumber(dateStr: string): number {
  const [y, m, d] = parseDateComponents(dateStr);
  const sum = d + m + y;
  return arcanaNumFrom1to22(reduceTo1to22(sum));
}

/**
 * Carte du Jour Personnelle — Méthode Mary K. Greer "Personal Day Card"
 * Ronde #3 2026-04-01 — Vote 2/3 (GPT + Gemini)
 * Formule : birthDay + birthMonth + currentYear + currentMonth + currentDay
 * Note : n'utilise PAS l'année de naissance (par design Greer)
 * @param bd  Date de naissance YYYY-MM-DD
 * @param day Date du jour YYYY-MM-DD
 * @returns num ∈ [0–21]
 */
export function calcPersonalDayCard(bd: string, day: string): number {
  const [, bm, bday] = parseDateComponents(bd);
  const [dy, dm, dd] = parseDateComponents(day);
  const sum = bday + bm + dy + dm + dd;
  return arcanaNumFrom1to22(reduceTo1to22(sum));
}

/**
 * Récupère un arcane par son numéro [0–21].
 */
export function getArcana(num: number): MajorArcana {
  const arcana = MARSEILLE_MAJOR_ARCANA.find(a => a.num === num) ?? MARSEILLE_MAJOR_ARCANA[0];
  // Sprint AX-UX — Injection image RWS automatique (pas besoin de modifier les 22 entrées)
  return { ...arcana, image: getRWSImageUrl(arcana.num) };
}

// ─────────────────────────────────────────────
// Tirage Conscient — entropie crypto
// ─────────────────────────────────────────────
const LS_KEY_TAROT = 'kaironaute_tarot_draws';

export function loadTarotHistory(): TarotDrawRecord[] {
  try { return sto.get<TarotDrawRecord[]>(LS_KEY_TAROT) || []; } catch { return []; }
}

export function saveTarotDraw(rec: TarotDrawRecord): void {
  const arr = loadTarotHistory();
  arr.unshift(rec);
  sto.set(LS_KEY_TAROT, arr.slice(0, 10));
}

export function deleteTarotDraw(id: string): void {
  const arr = loadTarotHistory().filter(r => r.id !== id);
  sto.set(LS_KEY_TAROT, arr);
}

/**
 * Tirage conscient : sélectionne un Arcane via crypto.getRandomValues()
 * + orientation (endroit / renversé) selon la question posée.
 */
export function drawConsciousTarot(question: string): TarotDraw {
  const buf = new Uint32Array(2);
  crypto.getRandomValues(buf);
  const arcanaNum = buf[0] % 22;                 // 0–21
  const isReversed = (buf[1] % 100) < 33;        // ~33% renversé
  return {
    arcana: getArcana(arcanaNum),
    isReversed,
    question,
    timestamp: Date.now(),
  };
}

// ─────────────────────────────────────────────
// Tirage 3 cartes — Ronde 2026-03-21 S3 unanime 3/3
// Format : "Ce qui se joue" / "Ce qui te challenge" / "Le conseil du moment"
// ─────────────────────────────────────────────

export const TAROT_3CARD_POSITIONS = [
  { key: 'situation', label: 'Ce qui se joue', icon: '◉' },
  { key: 'challenge', label: 'Ce qui te challenge', icon: '⚡' },
  { key: 'conseil',   label: 'Le conseil du moment', icon: '✦' },
] as const;

export interface Tarot3CardDraw {
  cards: { arcana: MajorArcana; isReversed: boolean; position: typeof TAROT_3CARD_POSITIONS[number] }[];
  question: string;
  timestamp: number;
}

export interface Tarot3CardRecord {
  id: string;
  question: string;
  cards: { arcanaNum: number; arcanaName: string; isReversed: boolean; positionKey: string }[];
}

/**
 * Tirage conscient 3 cartes : sélectionne 3 Arcanes DIFFÉRENTS via crypto.getRandomValues()
 * + orientation individuelle (33% renversé chacune)
 */
export function drawConscious3Cards(question: string): Tarot3CardDraw {
  const buf = new Uint32Array(6); // 3 pour cartes, 3 pour orientation
  crypto.getRandomValues(buf);

  // Tirage sans remise : 3 cartes différentes
  const drawn: number[] = [];
  let idx = 0;
  while (drawn.length < 3 && idx < 100) { // safety limit
    const candidate = buf[drawn.length] % 22;
    if (!drawn.includes(candidate)) {
      drawn.push(candidate);
    } else {
      // Collision : re-tirer avec un offset
      const extra = new Uint32Array(1);
      crypto.getRandomValues(extra);
      const retry = extra[0] % 22;
      if (!drawn.includes(retry)) drawn.push(retry);
    }
    idx++;
  }

  const cards = drawn.map((arcanaNum, i) => ({
    arcana: getArcana(arcanaNum),
    isReversed: (buf[3 + i] % 100) < 33,
    position: TAROT_3CARD_POSITIONS[i],
  }));

  return { cards, question, timestamp: Date.now() };
}

export function saveTarot3CardDraw(rec: Tarot3CardRecord): void {
  const key = 'kaironaute_tarot_3card_draws';
  let arr: Tarot3CardRecord[] = [];
  try { arr = sto.get<Tarot3CardRecord[]>(key) || []; } catch { /* noop */ }
  arr.unshift(rec);
  sto.set(key, arr.slice(0, 10));
}

export function loadTarot3CardHistory(): Tarot3CardRecord[] {
  const key = 'kaironaute_tarot_3card_draws';
  try { return sto.get<Tarot3CardRecord[]>(key) || []; } catch { return []; }
}

export function deleteTarot3CardDraw(id: string): void {
  const key = 'kaironaute_tarot_3card_draws';
  let arr: Tarot3CardRecord[] = [];
  try { arr = sto.get<Tarot3CardRecord[]>(key) || []; } catch { /* noop */ }
  sto.set(key, arr.filter(r => r.id !== id));
}

// ─────────────────────────────────────────────
// 22 textes Conseil dédiés — Position Conseil renversée
// Ronde 2026-03-21 Q7 : unanime 3/3 — "Libère-toi de" orienté action de déblocage
// Chaque texte est spécifique à l'arcane, formulé comme un conseil constructif
// (pas juste le shadow générique réutilisé)
// ─────────────────────────────────────────────
export const CONSEIL_REVERSE_TEXTS: Record<number, string> = {
  0:  'Arrête de fuir en avant. Pose un pied, puis l\'autre. Le vrai courage n\'est pas de sauter, c\'est de choisir où atterrir.',
  1:  'Tu disperses ton énergie sur trop de fronts. Choisis UN seul outil aujourd\'hui et maîtrise-le. Le reste peut attendre.',
  2:  'Tu gardes trop de choses pour toi. Partage ce que tu sais, même imparfaitement — la parole libère ce que le silence emprisonne.',
  3:  'Tu donnes sans compter, mais tu oublies de recevoir. Aujourd\'hui, accepte ce qu\'on t\'offre sans culpabilité.',
  4:  'Tu contrôles trop. Lâche une décision que quelqu\'un d\'autre peut prendre à ta place. Tu n\'as pas besoin de tout diriger.',
  5:  'Tu suis une règle qui ne te convient plus. Questionne l\'autorité — même si c\'est la tienne — et ose ta propre voie.',
  6:  'Tu hésites parce que tu veux la perfection. Choisis maintenant, même imparfaitement. L\'inaction est aussi un choix.',
  7:  'Tu forces l\'avancée sans vérifier la direction. Arrête-toi un instant. Où vas-tu vraiment, et est-ce encore ce que tu veux ?',
  8:  'Tu te juges trop durement. Remplace le verdict par la compréhension. La justice commence par celle que tu t\'accordes.',
  9:  'Tu t\'isoles en pensant te protéger. Sors de ta tour — une seule conversation peut éclairer ce que la solitude obscurcit.',
  10: 'Tu attends que la chance tourne. Mais la roue répond à l\'action, pas à l\'espoir passif. Pose un geste concret aujourd\'hui.',
  11: 'Tu refoules une émotion puissante. Laisse-la exister sans la combattre — la vraie force est dans l\'accueil, pas dans la résistance.',
  12: 'Tu t\'accroches à un sacrifice qui n\'a plus de sens. Ce qui t\'immobilise n\'est pas la situation — c\'est ta croyance qu\'il faut souffrir.',
  13: 'Tu résistes à une fin qui est déjà là. Lâche ce qui est mort — non par faiblesse, mais pour faire place à ce qui naît.',
  14: 'Tu procrastines sous couvert de prudence. L\'équilibre parfait n\'existe pas. Engage-toi dans une direction, même approximative.',
  15: 'Tu nourris une dépendance — à une habitude, une personne, une peur. Identifie ta chaîne la plus courte et desserre-la d\'un cran.',
  16: 'Tu refuses de voir ce qui s\'effondre. Regarde la fissure en face — ce qui tombe devait tomber pour que le vrai apparaisse.',
  17: 'Tu idéalises une issue qui n\'existe pas. Redescends sur terre — l\'espoir réel se nourrit d\'action, pas de rêverie.',
  18: 'Tu projettes des peurs sur une situation floue. Sépare ce que tu sais de ce que tu imagines — la clarté est dans les faits.',
  19: 'Tu brilles tellement que tu ne vois plus les autres. Tempère ton éclat — le vrai rayonnement inclut ceux qui t\'entourent.',
  20: 'Tu entends l\'appel mais tu refuses de répondre. Ce n\'est pas le jugement des autres qui te retient — c\'est le tien. Réponds.',
  21: 'Tu stagnes après un accomplissement. Le cycle est fini — commence le suivant. Le monde attend ta prochaine version.',
};

/**
 * Retourne le texte Conseil dédié pour un arcane renversé en position Conseil.
 * Fallback sur le shadow générique si pas de texte dédié.
 */
export function getConseilReverseText(arcanaNum: number): string {
  return CONSEIL_REVERSE_TEXTS[arcanaNum] ?? MARSEILLE_MAJOR_ARCANA.find(a => a.num === arcanaNum)?.shadow ?? '';
}

// ─────────────────────────────────────────────
// Journal personnel — Notes sur les tirages
// Ronde 2026-03-21 Q8 : consensus 2/3 (GPT + Gemini) — P2 rétention
// Stockage clé-valeur : drawId → texte libre
// ─────────────────────────────────────────────
const LS_JOURNAL_KEY = 'kaironaute_journal_notes';

export function loadJournalNote(drawId: string): string {
  try {
    const notes = sto.get<Record<string, string>>(LS_JOURNAL_KEY) || {};
    return notes[drawId] || '';
  } catch { return ''; }
}

export function saveJournalNote(drawId: string, text: string): void {
  try {
    const notes = sto.get<Record<string, string>>(LS_JOURNAL_KEY) || {};
    if (text.trim()) {
      notes[drawId] = text;
    } else {
      delete notes[drawId];
    }
    sto.set(LS_JOURNAL_KEY, notes);
  } catch { /* noop */ }
}

export function deleteJournalNote(drawId: string): void {
  try {
    const notes = sto.get<Record<string, string>>(LS_JOURNAL_KEY) || {};
    delete notes[drawId];
    sto.set(LS_JOURNAL_KEY, notes);
  } catch { /* noop */ }
}
