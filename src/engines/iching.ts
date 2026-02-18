// ═══ I CHING ENGINE ═══
// Deterministic hexagram based on birth date + current date

import { calcPersonalDay } from './numerology';

// Trigram lines (1=yang, 0=yin)
export const TRIGRAMS = [[1,1,1],[1,1,0],[1,0,1],[1,0,0],[0,1,1],[0,1,0],[0,0,1],[0,0,0]];
export const TRIGRAM_NAMES = ['Ciel','Lac','Feu','Tonnerre','Vent','Eau','Montagne','Terre'];

// King Wen sequence lookup: KW[lower][upper] = hexagram number
const KW = [
  [1,10,13,25,44,6,33,12],[43,58,49,17,28,47,31,45],
  [14,38,30,21,50,64,56,35],[34,54,55,51,32,40,62,16],
  [9,61,37,42,57,59,53,20],[5,60,63,3,48,29,39,8],
  [26,41,22,27,18,4,52,23],[11,19,36,24,46,7,15,2]
];

// Hexagram names (French)
const HEX_NAMES = '|Créateur|Réceptif|Difficulté initiale|Folie juvénile|Attente|Conflit|Armée|Union|Petit Apprivoisement|Marche|Paix|Stagnation|Communauté|Grand Avoir|Humilité|Enthousiasme|Suite|Correction|Approche|Contemplation|Mordre au travers|Grâce|Éclatement|Retour|Innocence|Grand Apprivoisement|Nourriture|Grand Excès|Insondable|Feu|Influence|Durée|Retraite|Grande Force|Progrès|Obscurcissement|Famille|Opposition|Obstacle|Libération|Diminution|Augmentation|Percée|Rencontre|Rassemblement|Poussée vers le haut|Accablement|Puits|Révolution|Chaudron|Ébranlement|Immobilisation|Développement|Épousée|Abondance|Voyageur|Le Doux|Sérénité|Dissolution|Limitation|Vérité intérieure|Petite Traversée|Après Accomplissement|Avant Accomplissement'.split('|');

// Keywords (imperative form)
const HEX_KEYWORDS = '|Crée|Accueille|Persévère|Apprends|Patiente|Négocie|Organise|Unis-toi|Discipline|Avance|Harmonise|Attends|Rassemble|Partage|Sois humble|Inspire|Suis le flux|Corrige|Approche|Observe|Tranche|Embellis|Lâche prise|Recommence|Sois pur|Accumule|Nourris-toi|Ose|Plonge|Éclaire|Ressens|Persiste|Recule|Fonce|Progresse|Protège-toi|Réunis|Accepte|Contourne|Libère|Sacrifie|Reçois|Décide|Rencontre|Rassemble|Monte|Endure|Puise|Transforme|Cultive|Secoue|Arrête-toi|Grandis|Adapte-toi|Rayonne|Explore|Pénètre|Réjouis-toi|Dissous|Limite|Fais confiance|Prudence|Célèbre|Prépare'.split('|');

// Extended descriptions for each hexagram
const HEX_DESC: Record<number, string> = {
  1: "La force créatrice est à son apogée. Agis avec détermination et confiance.",
  2: "L'accueil et la réceptivité ouvrent les portes. Laisse venir à toi.",
  13: "L'union avec d'autres crée la force. Cherche la communauté.",
  11: "Le Ciel et la Terre s'harmonisent. Période de paix et prospérité.",
  12: "Stagnation temporaire. La patience sera récompensée.",
  25: "L'innocence et la spontanéité sont tes alliées aujourd'hui.",
  29: "L'eau profonde — un passage délicat qui forge la sagesse.",
  30: "Le feu intérieur illumine. Laisse briller ta lumière.",
  31: "L'influence mutuelle crée des liens profonds. Ouvre ton cœur.",
  33: "Le retrait stratégique n'est pas une faiblesse. Reculer pour mieux avancer.",
  42: "L'augmentation favorable. Ce que tu donnes te revient multiplié.",
  47: "L'accablement est temporaire. La pression crée le diamant.",
  52: "La montagne immobile. Méditation et centrage sont tes clés.",
  58: "La sérénité et la joie. Partage ta lumière avec les autres.",
  64: "Avant l'accomplissement — tout est prêt, un dernier effort.",
};

export interface IChingReading {
  hexNum: number;
  lower: number;
  upper: number;
  lines: number[];
  changing: number;
  name: string;
  keyword: string;
  desc: string;
}

export function calcIChing(bd: string, today: string): IChingReading {
  const [, bm, bdd] = bd.split('-').map(Number);
  const [, tm, td] = today.split('-').map(Number);
  const [by] = bd.split('-').map(Number);
  const pday = calcPersonalDay(bd, today).v;

  const lower = (bdd + bm + pday) % 8;
  const upper = (td + tm + (by % 9) + pday) % 8;
  const hexNum = KW[lower][upper];
  const changing = (pday + td) % 6;
  const lines = [...TRIGRAMS[lower], ...TRIGRAMS[upper]];

  return {
    hexNum, lower, upper, lines, changing,
    name: HEX_NAMES[hexNum] || '?',
    keyword: HEX_KEYWORDS[hexNum] || '?',
    desc: HEX_DESC[hexNum] || `L'hexagramme ${hexNum} t'invite à ${(HEX_KEYWORDS[hexNum] || 'observer').toLowerCase()}.`
  };
}
