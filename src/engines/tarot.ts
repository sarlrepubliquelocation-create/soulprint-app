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

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export type TarotElement = 'feu' | 'eau' | 'air' | 'terre' | 'esprit';

export interface MajorArcana {
  num: number;          // 0–21 (Le Mat = 0)
  name_fr: string;
  name_en: string;
  planet: string;       // planète ou signe associé
  element: TarotElement;
  theme: string;        // mot-clé central (≤ 25 cars)
  light: string;        // aspect lumineux
  shadow: string;       // aspect ombragé
  narrative: string;    // texte Grok format : "Tu [verbe]. La question n'est pas [X], mais [Y]."
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
    planet: 'Uranus', element: 'air',
    theme: 'Saut dans l\'inconnu',
    light: 'Spontanéité, liberté, commencements purs',
    shadow: 'Imprudence, fuite des responsabilités',
    narrative: 'Tu te lances dans l\'inconnu avec une légèreté audacieuse. La question n\'est pas si tu es prêt, mais si tu oses commencer.',
  },
  {
    num: 1, name_fr: 'Le Bateleur', name_en: 'The Magician',
    planet: 'Mercure', element: 'air',
    theme: 'Maîtrise de l\'action',
    light: 'Habileté, volonté, concentration sur l\'instant',
    shadow: 'Manipulation, dispersion, illusions',
    narrative: 'Tu maîtrises les outils à ta disposition. La question n\'est pas ce qui manque, mais ce que tu feras de ce que tu as.',
  },
  {
    num: 2, name_fr: 'La Papesse', name_en: 'The High Priestess',
    planet: 'Lune', element: 'eau',
    theme: 'Connaissance intérieure',
    light: 'Intuition, mystère, réceptivité profonde',
    shadow: 'Secrets lourds, repli excessif, passivité',
    narrative: 'Tu pressens quelque chose que les mots ne sauraient encore dire. La question n\'est pas d\'agir, mais d\'écouter.',
  },
  {
    num: 3, name_fr: 'L\'Impératrice', name_en: 'The Empress',
    planet: 'Vénus', element: 'terre',
    theme: 'Abondance et création',
    light: 'Fertilité, sensualité, générosité naturelle',
    shadow: 'Dépendance, excès, possession',
    narrative: 'Tu portes en toi une abondance prête à éclore. La question n\'est pas de manquer, mais d\'accueillir ce qui pousse.',
  },
  {
    num: 4, name_fr: 'L\'Empereur', name_en: 'The Emperor',
    planet: 'Mars', element: 'feu',
    theme: 'Autorité et structure',
    light: 'Leadership, stabilité, fondations solides',
    shadow: 'Rigidité, contrôle excessif, tyrannie',
    narrative: 'Tu possèdes une autorité intérieure que tu sous-estimes. La question n\'est pas de contrôler les autres, mais de gouverner ta propre voie.',
  },
  {
    num: 5, name_fr: 'Le Pape', name_en: 'The Hierophant',
    planet: 'Jupiter', element: 'terre',
    theme: 'Tradition et sagesse transmise',
    light: 'Enseignement, guidance spirituelle, appartenance',
    shadow: 'Dogmatisme, conformisme, autorité aveugle',
    narrative: 'Tu cherches un sens plus grand à ce que tu vis. La question n\'est pas la règle à suivre, mais la sagesse à intégrer.',
  },
  {
    num: 6, name_fr: 'L\'Amoureux', name_en: 'The Lovers',
    planet: 'Mercure', element: 'air',
    theme: 'Choix du cœur',
    light: 'Union, désir assumé, choix conscient',
    shadow: 'Hésitation, dualité non résolue, désir inconscient',
    narrative: 'Tu es face à un choix qui engage ton cœur. La question n\'est pas qui choisir, mais ce que tu veux vraiment incarner.',
  },
  {
    num: 7, name_fr: 'Le Chariot', name_en: 'The Chariot',
    planet: 'Lune', element: 'eau',
    theme: 'Maîtrise du mouvement',
    light: 'Victoire, direction affirmée, élan maîtrisé',
    shadow: 'Arrogance, fuite en avant, contrôle perdu',
    narrative: 'Tu avances avec une volonté affirmée. La question n\'est pas la destination, mais si tu pilotes vraiment ce mouvement.',
  },
  {
    num: 8, name_fr: 'La Justice', name_en: 'Justice',
    planet: 'Vénus', element: 'air',
    theme: 'Équilibre et vérité',
    light: 'Équité, clarté, responsabilité assumée',
    shadow: 'Jugement sévère, rigidité morale, rancune',
    narrative: 'Tu récoltes ce que tu as semé, ni plus, ni moins. La question n\'est pas d\'être jugé, mais de rétablir ton propre équilibre.',
  },
  {
    num: 9, name_fr: 'L\'Ermite', name_en: 'The Hermit',
    planet: 'Mercure', element: 'terre',
    theme: 'Sagesse en solitude',
    light: 'Discernement, intériorité, guidance douce',
    shadow: 'Isolement, repli, refus du monde',
    narrative: 'Tu portes une lumière intérieure qui guide sans s\'imposer. La question n\'est pas l\'isolement, mais la juste solitude qui révèle.',
  },
  {
    num: 10, name_fr: 'La Roue de Fortune', name_en: 'Wheel of Fortune',
    planet: 'Jupiter', element: 'feu',
    theme: 'Cycles et retournements',
    light: 'Chance, mouvement, acceptation du changement',
    shadow: 'Dépendance au destin, passivité, imprévisibilité',
    narrative: 'Tu vis un tournant, voulu ou non. La question n\'est pas ce qui change, mais comment tu t\'y adaptes.',
  },
  {
    num: 11, name_fr: 'La Force', name_en: 'Strength',
    planet: 'Soleil', element: 'feu',
    theme: 'Douceur qui dompte',
    light: 'Courage intérieur, maîtrise des instincts, persévérance',
    shadow: 'Force brute, domination, refoulement',
    narrative: 'Tu sais dompter tes propres tempêtes avec une douceur inattendue. La question n\'est pas de vaincre, mais de transformer.',
  },
  {
    num: 12, name_fr: 'Le Pendu', name_en: 'The Hanged Man',
    planet: 'Neptune', element: 'eau',
    theme: 'Suspension volontaire',
    light: 'Nouvelle perspective, lâcher-prise, sagesse inversée',
    shadow: 'Blocage, sacrifice inutile, victimisation',
    narrative: 'Tu vois le monde depuis un angle que peu d\'autres osent. La question n\'est pas de résister, mais d\'apprendre à lâcher prise.',
  },
  {
    num: 13, name_fr: 'L\'Arcane sans Nom', name_en: 'Death',
    planet: 'Scorpion', element: 'eau',
    theme: 'Transformation radicale',
    light: 'Renouveau, fin nécessaire, transition libératrice',
    shadow: 'Résistance au changement, stagnation, peur',
    narrative: 'Tu traverses une fin qui prépare un commencement. La question n\'est pas ce qui disparaît, mais ce qui renaît.',
  },
  {
    num: 14, name_fr: 'La Tempérance', name_en: 'Temperance',
    planet: 'Jupiter', element: 'feu',
    theme: 'Alchimie intérieure',
    light: 'Équilibre, patience, fusion des contraires',
    shadow: 'Procrastination, manque d\'engagement, dilution',
    narrative: 'Tu trouves l\'alchimie juste entre deux extrêmes. La question n\'est pas de trancher, mais de marier avec grâce.',
  },
  {
    num: 15, name_fr: 'Le Diable', name_en: 'The Devil',
    planet: 'Saturne', element: 'terre',
    theme: 'Face aux chaînes intérieures',
    light: 'Prise de conscience, énergie brute libérée, désirs assumés',
    shadow: 'Attachement, addiction, illusion de contrainte',
    narrative: 'Tu fais face à ce qui te fascine et te lie. La question n\'est pas la peur, mais la part de liberté que tu choisis de reprendre.',
  },
  {
    num: 16, name_fr: 'La Maison Dieu', name_en: 'The Tower',
    planet: 'Mars', element: 'feu',
    theme: 'Effondrement libérateur',
    light: 'Révélation soudaine, rupture nécessaire, vérité qui libère',
    shadow: 'Chaos subi, destruction inconsciente, choc non intégré',
    narrative: 'Tu traverses un bouleversement nécessaire. La question n\'est pas ce qui s\'effondre, mais ce que tu peux enfin construire sur du vrai.',
  },
  {
    num: 17, name_fr: 'L\'Étoile', name_en: 'The Star',
    planet: 'Uranus', element: 'air',
    theme: 'Espoir et renouveau',
    light: 'Foi, inspiration, connexion au cosmos',
    shadow: 'Naïveté, idéalisme fragile, fuite vers le rêve',
    narrative: 'Tu retrouves ta connexion à quelque chose de plus grand. La question n\'est pas le doute, mais la confiance que tu oses renouer.',
  },
  {
    num: 18, name_fr: 'La Lune', name_en: 'The Moon',
    planet: 'Neptune', element: 'eau',
    theme: 'Illusion et profondeur',
    light: 'Réceptivité, imagination, accès à l\'inconscient',
    shadow: 'Confusion, anxiété, peurs projetées',
    narrative: 'Tu navigues dans des eaux obscures et chargées d\'illusions. La question n\'est pas ce qui est réel, mais ce que tu projettes sur le monde.',
  },
  {
    num: 19, name_fr: 'Le Soleil', name_en: 'The Sun',
    planet: 'Soleil', element: 'feu',
    theme: 'Rayonnement et joie',
    light: 'Vitalité, succès, clarté retrouvée',
    shadow: 'Orgueil, aveuglement par l\'excès de lumière',
    narrative: 'Tu rayonnes d\'une clarté qui donne envie à ceux qui t\'entourent. La question n\'est pas si tu mérites, mais si tu acceptes de briller.',
  },
  {
    num: 20, name_fr: 'Le Jugement', name_en: 'Judgement',
    planet: 'Pluton', element: 'feu',
    theme: 'L\'appel à être soi',
    light: 'Éveil, réponse à sa vocation, renaissance consciente',
    shadow: 'Culpabilité, auto-jugement, refus d\'entendre',
    narrative: 'Tu entends un appel intérieur que tu ne peux plus ignorer. La question n\'est pas d\'être jugé, mais de répondre enfin à qui tu es vraiment.',
  },
  {
    num: 21, name_fr: 'Le Monde', name_en: 'The World',
    planet: 'Saturne', element: 'terre',
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
export const TAROT_ONBOARDING = `Dans Kaironaute, le Tarot n'est pas un oracle : c'est un miroir archétypal au sens jungien du terme. Chaque Arcane représente une configuration psychologique universelle — non pas ce qui va vous "arriver", mais ce que votre inconscient met en avant aujourd'hui. La synchronicité fait le reste : le bon symbole, au bon moment, révèle ce que vous saviez déjà.`;

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

/**
 * Calcule la Carte Natale (Birth Card) depuis la date de naissance.
 * @param bd Date de naissance format YYYY-MM-DD ou YYYYMMDD
 * @returns num ∈ [0–21] de l'Arcane Majeur
 */
export function calcBirthCard(bd: string): number {
  const digits = bd.replace(/\D/g, ''); // strip les tirets
  const sum = sumDigits(digits);
  return arcanaNumFrom1to22(reduceTo1to22(sum));
}

/**
 * Calcule l'Arcane du Jour depuis une date.
 * @param dateStr Date format YYYY-MM-DD ou YYYYMMDD
 * @returns num ∈ [0–21]
 */
export function calcTarotDayNumber(dateStr: string): number {
  const digits = dateStr.replace(/\D/g, '');
  const sum = sumDigits(digits);
  return arcanaNumFrom1to22(reduceTo1to22(sum));
}

/**
 * Récupère un arcane par son numéro [0–21].
 */
export function getArcana(num: number): MajorArcana {
  return MARSEILLE_MAJOR_ARCANA.find(a => a.num === num) ?? MARSEILLE_MAJOR_ARCANA[0];
}

// ─────────────────────────────────────────────
// Tirage Conscient — entropie crypto
// ─────────────────────────────────────────────
const LS_KEY_TAROT = 'kaironaute_tarot_draws';

export function loadTarotHistory(): TarotDrawRecord[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY_TAROT) || '[]'); } catch { return []; }
}

export function saveTarotDraw(rec: TarotDrawRecord): void {
  const arr = loadTarotHistory();
  arr.unshift(rec);
  localStorage.setItem(LS_KEY_TAROT, JSON.stringify(arr.slice(0, 10)));
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
