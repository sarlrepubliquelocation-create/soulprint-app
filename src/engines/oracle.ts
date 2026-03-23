// ═══ ORACLE DES CHOIX ENGINE V4.1 ═══
// Specs Round 8 (Grok + GPT + Gemini)
//
// L'utilisateur teste un nom, une date, une adresse, un numéro ou un sujet.
// V4.2: Score Oracle = 100% domainScore pour tous les types (Ronde 14+14bis: permanents + sujet = intrinsèque)
// Mercure Rétro : malus graduel par catégorie de sujet (R9ter) + narratifs contextualisés (R23)
//
// 5 types : Date | Nom | Adresse | Numéro | Sujet
// 3 verdicts : ✅ Feu Vert (≥75) | ⚠️ Prudence (48-74) | 🛑 Pas maintenant (<48)
// 7 sujets prédéfinis avec textes personnalisés

import { type Reduced, reduce, isMaster, checkKarmicNumber } from './numerology';
import { isMercuryRetrograde } from './moon';

// ══════════════════════════════════════
// ═══ TYPES ═══
// ══════════════════════════════════════

export type OracleType = 'date' | 'nom' | 'adresse' | 'numero' | 'sujet' | 'bebe';

export type OracleSujet =
  | 'projet'        // 1. Lancer projet / signer contrat
  | 'sentiments'    // 2. Déclarer sentiments / premier RDV
  | 'partenariat'   // 3. Rencontrer associé / partenariat
  | 'investissement' // 4. Investissement / décision financière
  | 'voyage'        // 5. Voyage / déménagement
  | 'presentation'  // 6. Présentation / prise de parole
  | 'changement';   // 7. Changement de vie majeur

// Ronde 13bis (3/3 unanime) : 5 domaines d'activité + généraliste
export type OracleDomain = 'commerce' | 'creatif' | 'humain' | 'spirituel' | 'tech' | 'generaliste';

export const ORACLE_DOMAINS: { id: OracleDomain; icon: string; label: string; exemples: string }[] = [
  { id: 'generaliste', icon: '🌐', label: 'Généraliste',               exemples: 'Score moyen tous domaines' },
  { id: 'commerce',    icon: '💰', label: 'Commerce & Finance',        exemples: 'Banque, immobilier, retail, juridique' },
  { id: 'creatif',     icon: '🎨', label: 'Créativité & Communication', exemples: 'Art, médias, marketing, design, mode' },
  { id: 'humain',      icon: '🤝', label: 'Humain & Bien-être',        exemples: 'Santé, thérapie, coaching, social' },
  { id: 'spirituel',   icon: '🔮', label: 'Spiritualité & Ésotérisme', exemples: 'Astrologie, numérologie, méditation' },
  { id: 'tech',        icon: '💡', label: 'Tech & Innovation',         exemples: 'Startup, dev, apps, digital, IA' },
];

export type OracleVerdict = 'feu_vert' | 'prudence' | 'pas_maintenant';

export interface OracleVerdictInfo {
  verdict: OracleVerdict;
  icon: string;
  label: string;
  color: string;
  texte: string;
}

export interface OracleResult {
  type: OracleType;
  input: string;
  sujet: OracleSujet | null;
  domain: OracleDomain | null;  // Domaine d'activité (Ronde 13bis)
  domainScore: number;         // Score intrinsèque de l'input (0-100)
  dailyScore: number;          // Score quotidien SoulPrint
  oracleScore: number;         // Combiné (0-100)
  mercuryCapped: boolean;      // True si Mercure Rétro a appliqué un malus
  mercuryMalus: number;        // Valeur du malus Mercure Rétro (0 si pas actif)
  mercuryNarrative: string;    // Ronde 23 : texte narratif Mercure Rétro contextualisé par sujet
  verdict: OracleVerdictInfo;
  intrinsicVerdict: { label: string; color: string; icon: string };  // Verdict découplé du timing
  bestDates: { date: string; label: string; estimatedScore: number; vibLabel: string; jourPerso: number; mercury: boolean; dailyScore: number }[];  // 3 meilleures dates à venir
  breakdown: { label: string; value: string; pts: number }[];
  signals: string[];
  alerts: string[];
}

// ══════════════════════════════════════
// ═══ TABLE PYTHAGORICIENNE ═══
// ══════════════════════════════════════

// A=1, B=2, ..., I=9, J=1, K=2, ..., R=9, S=1, T=2, ..., Z=8
const PYTH_MAP: Record<string, number> = {
  a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8, i: 9,
  j: 1, k: 2, l: 3, m: 4, n: 5, o: 6, p: 7, q: 8, r: 9,
  s: 1, t: 2, u: 3, v: 4, w: 5, x: 6, y: 7, z: 8,
};

const VOWELS_CORE = new Set(['a', 'e', 'i', 'o', 'u']);

// Ronde 9 (3/3) : Y contextuel — règle 3 niveaux GPT
// 1. Y initial → consonne (Yahoo, Young, Yves)
// 2. Y non-initial, précédé d'une consonne → voyelle (Mary, Bryan, Lynn, Sylvie)
// 3. Sinon → consonne (Joy, Maya)
function isVowelOracle(chars: string, idx: number): boolean {
  const c = chars[idx];
  if (VOWELS_CORE.has(c)) return true;
  if (c !== 'y') return false;
  // Y contextuel
  if (idx === 0) return false;                         // Y initial → consonne
  const prev = chars[idx - 1];
  return !VOWELS_CORE.has(prev);                       // après consonne → voyelle
}

/**
 * Normalise un string : NFD pour accents, lowercase, garde lettres uniquement.
 */
function normalizeStr(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');
}

/**
 * Strip les extensions de domaine avant calcul numérologique.
 * Retourne { cleaned, tldFound } pour afficher un signal si TLD détecté.
 */
const TLD_LIST = ['.com', '.fr', '.app', '.net', '.io', '.org', '.ai', '.co', '.eu', '.be', '.ch', '.uk', '.ca', '.de', '.es', '.it'];
function stripTLD(name: string): { cleaned: string; tldFound: string | null } {
  const lower = name.toLowerCase();
  for (const tld of TLD_LIST) {
    if (lower.endsWith(tld)) {
      return { cleaned: name.slice(0, name.length - tld.length), tldFound: tld };
    }
  }
  return { cleaned: name, tldFound: null };
}

/**
 * Calcule le nombre numérologique d'un string via table Pythagoricienne.
 */
function calcStringNumber(s: string): Reduced {
  const norm = normalizeStr(s);
  const sum = norm.split('').reduce((acc, c) => acc + (PYTH_MAP[c] || 0), 0);
  return reduce(sum);
}

/**
 * Calcule Expression (toutes lettres), Âme (voyelles), Image (consonnes).
 */
function calcNameNumbers(name: string): { expression: Reduced; ame: Reduced; image: Reduced; rawSums: { expr: number; ame: number; image: number } } {
  const norm = normalizeStr(name);
  let vowelSum = 0, consonantSum = 0;
  for (let i = 0; i < norm.length; i++) {
    const val = PYTH_MAP[norm[i]] || 0;
    if (isVowelOracle(norm, i)) vowelSum += val;
    else consonantSum += val;
  }
  return {
    expression: reduce(vowelSum + consonantSum),
    ame: reduce(vowelSum),
    image: reduce(consonantSum),
    rawSums: { expr: vowelSum + consonantSum, ame: vowelSum, image: consonantSum },
  };
}

// ══════════════════════════════════════
// ═══ RONDE 21 (3/3) — NOMBRES KARMIQUES ═══
// ══════════════════════════════════════
// Défis de vie 13/14/16/19 : en numérologie, certains nombres (13, 14, 16, 19)
// portent un « défi de croissance » — une qualité que la vibration invite à développer.
// Ce n'est PAS une punition ni une fatalité : c'est un axe d'apprentissage.
// Détecté à l'avant-dernière étape de la réduction (Decoz, Goodwin, Bunker).
// Ronde 23 (3/3) + R24 clarification : labels accessibles, sous-titres concrets
type KarmicModule = 'nom' | 'bebe' | 'adresse' | 'numero' | 'date';

// Phrase d'intro contextuelle ajoutée automatiquement au début de chaque alerte
const KARMIC_DEBT_INTRO = 'En numérologie, certains nombres portent un défi de croissance — ce n\'est pas négatif, c\'est une invitation à développer une qualité. ';

const KARMIC_DEBT_NARRATIVES: Record<number, Record<KarmicModule, { label: string; texte: string }>> = {
  13: {
    nom:     { label: 'Défi 13 — Apprendre la persévérance',             texte: 'La vibration 13 invite à prouver sa solidité par la constance et le travail bien fait. Ce nom ne promet pas une ascension facile, mais il peut devenir très fiable si vous posez des bases nettes. C\'est un défi de patience, pas un obstacle.' },
    bebe:    { label: 'Défi 13 — Apprendre la patience',                 texte: 'Cette vibration invite l\'enfant à construire pas à pas, avec patience et régularité. Le prénom porte une belle force d\'endurance : il apprendra à ne pas se décourager quand les choses avancent lentement. Bien accompagné, ce nombre forge un être solide et déterminé.' },
    adresse: { label: 'Défi 13 — Un lieu qui demande de la constance',   texte: 'Dans un lieu, le 13 crée une atmosphère qui pousse à remettre de l\'ordre, à structurer. La maison demande de l\'attention et une présence concrète. Si vous acceptez ce rythme, l\'adresse peut devenir un socle robuste.' },
    numero:  { label: 'Défi 13 — Un numéro qui récompense le sérieux',   texte: 'Les contacts demanderont des efforts et des preuves de sérieux. Utilisez ce numéro pour des affaires carrées où votre fiabilité fera la différence.' },
    date:    { label: 'Défi 13 — Une date pour construire sérieusement', texte: 'Ce jour ne prend pas la voie la plus facile, mais il favorise ce qui doit être construit solidement. C\'est une date pour poser des fondations, corriger, cadrer.' },
  },
  14: {
    nom:     { label: 'Défi 14 — Canaliser son énergie',                 texte: 'La vibration 14 parle d\'une énergie vive qui gagne à trouver sa direction. Dans un nom de marque, cela peut donner du mouvement et de l\'attrait. Ce nom fonctionne mieux quand vous donnez une direction claire à votre liberté.' },
    bebe:    { label: 'Défi 14 — Apprendre à se poser',                  texte: 'Pour un enfant, cette vibration porte un fort besoin d\'exploration et de nouveauté. Elle peut être brillante si elle est accompagnée par des repères simples, car sans cadre elle s\'éparpille vite. Concrètement : ce prénom donne un tempérament curieux et mobile — des rituels simples l\'aideront à canaliser cette belle énergie.' },
    adresse: { label: 'Défi 14 — Un lieu de mouvement',                  texte: 'Une adresse 14 fait rarement dormir la vie : elle appelle le passage, le changement. On y respire mieux si l\'on accepte le mouvement au lieu de chercher un contrôle total.' },
    numero:  { label: 'Défi 14 — Un numéro dynamique à cadrer',          texte: 'Ce numéro attire par sa vitesse et son côté vivant, mais il peut diluer l\'attention. Très utile si votre activité aime le mouvement ; pensez à structurer si vous avez besoin de stabilité.' },
    date:    { label: 'Défi 14 — Une date d\'action rapide',             texte: 'Cette date pousse à agir, tester, changer de plan si nécessaire. Elle favorise la souplesse mais demande de ne pas s\'engager trop vite.' },
  },
  16: {
    nom:     { label: 'Défi 16 — Chercher l\'authenticité',              texte: 'La vibration 16 pousse à revenir à l\'essentiel et à ce qui est vrai. Dans un nom de marque, elle donne profondeur et authenticité, mais elle supporte mal le superficiel. Ce nom demande de la cohérence.' },
    bebe:    { label: 'Défi 16 — Développer sa vie intérieure',          texte: 'Concrètement, cette vibration signifie que l\'enfant aura une sensibilité forte et une maturité qui peut arriver tôt. Il sera plus touché que d\'autres par ce qui sonne faux autour de lui. C\'est une qualité précieuse : bien entouré, il développera une vraie profondeur et une sagesse naturelle.' },
    adresse: { label: 'Défi 16 — Un lieu de lucidité',                   texte: 'Un lieu 16 invite au retrait et à la réflexion. On y voit plus vite ce qui ne tient pas. C\'est une adresse qui convient au recentrage, à condition de ne pas la vivre comme une fermeture.' },
    numero:  { label: 'Défi 16 — Un numéro de profondeur',               texte: 'Ce numéro donne une présence plus discrète, parfois plus distante. Il ne séduit pas facilement, mais peut inspirer confiance par sa sincérité.' },
    date:    { label: 'Défi 16 — Une date de vérité',                    texte: 'Cette date met en lumière ce qui doit être compris. Ce n\'est pas un jour de surface — c\'est un jour pour voir clair. Elle favorise la lucidité plus que l\'expansion.' },
  },
  19: {
    nom:     { label: 'Défi 19 — Mener sans dominer',                    texte: 'La vibration 19 parle d\'indépendance qui gagne à s\'ouvrir aux autres. Dans un nom de marque, cela donne une grande force d\'affirmation, à condition de ne pas basculer dans l\'isolement. Ce nom gagne quand il ose mener sans écraser.' },
    bebe:    { label: 'Défi 19 — Apprendre à partager sa force',         texte: 'Concrètement, cette vibration donne à l\'enfant un fort instinct d\'autonomie, parfois très tôt. C\'est une belle qualité ! L\'enjeu sera de l\'aider à relier confiance en soi et capacité à demander, recevoir, partager. Pas de brider l\'élan, mais de l\'humaniser.' },
    adresse: { label: 'Défi 19 — Un lieu d\'indépendance',               texte: 'Cette adresse pousse à se tenir debout, à décider, à reprendre les choses en main. Elle peut être très bonne pour relancer une étape de vie.' },
    numero:  { label: 'Défi 19 — Un numéro d\'affirmation',              texte: 'Ce numéro affirme une présence claire. Il peut porter une voix forte, mais demande d\'éviter la dureté ou l\'impression de fermeture. Très utile pour diriger.' },
    date:    { label: 'Défi 19 — Une date pour oser',                    texte: 'Cette date favorise l\'initiative et le courage, tout en rappelant de ne pas oublier les autres sur son passage. C\'est un jour pour avancer, pas pour imposer.' },
  },
};
// Fallback pour compatibilité (utilisé si le module n'est pas dans la map)
function getKarmicDebt(num: number, module: KarmicModule): { label: string; texte: string } {
  const entry = KARMIC_DEBT_NARRATIVES[num]?.[module] || KARMIC_DEBT_NARRATIVES[num]?.nom || { label: `Défi ${num}`, texte: '' };
  // On préfixe systématiquement l'intro explicative pour que l'utilisateur comprenne le concept
  return { label: entry.label, texte: KARMIC_DEBT_INTRO + entry.texte };
}

// Leçons karmiques : chiffres 1-9 absents du nom (Decoz).
// Chaque absence = une énergie que le porteur devra développer.
// ═══ RONDE 23 — LEÇONS KARMIQUES NARRATIVES (Hybride GPT textes) ═══
// 18 textes : 9 chiffres × 2 modules (nom/marque vs bébé)
// Lettres manquantes = énergie absente du nom → chemin de développement
type LessonModule = 'nom' | 'bebe';
const KARMIC_LESSON_NARRATIVES: Record<number, Record<LessonModule, { label: string; texte: string }>> = {
  1: {
    nom:  { label: 'Absence du 1 — Le Leadership en Creux', texte: 'L\'absence du 1 indique que ce nom ne porte pas naturellement l\'énergie d\'initiative. La marque devra construire son autorité par la constance plutôt que par l\'éclat. C\'est un chemin où la légitimité se gagne pas à pas.' },
    bebe: { label: 'Absence du 1 — L\'Affirmation à Conquérir', texte: 'L\'absence du 1 montre un chemin autour de la confiance en soi et de l\'initiative. L\'enfant peut avoir besoin d\'encouragements pour oser agir en premier. On l\'aidera en valorisant ses prises de décision, même petites.' },
  },
  2: {
    nom:  { label: 'Absence du 2 — La Diplomatie à Cultiver', texte: 'L\'absence du 2 signale que ce nom manque de douceur naturelle dans les partenariats. La marque pourrait gagner à développer une image plus collaborative et à soigner sa communication relationnelle.' },
    bebe: { label: 'Absence du 2 — L\'Écoute en Devenir', texte: 'L\'absence du 2 révèle un chemin autour de la coopération et de l\'écoute. L\'enfant peut fonctionner en solitaire sans le chercher. On l\'aidera en nourrissant les jeux à deux, le partage et l\'attention à l\'autre.' },
  },
  3: {
    nom:  { label: 'Absence du 3 — L\'Expression à Libérer', texte: 'L\'absence du 3 indique que ce nom ne rayonne pas spontanément. La marque devra travailler sa visibilité et oser montrer sa créativité. La communication ne viendra pas seule — elle se construira.' },
    bebe: { label: 'Absence du 3 — La Parole à Éclore', texte: 'L\'absence du 3 montre un chemin autour de l\'expression et du plaisir de montrer ce qu\'on ressent. L\'enfant peut être riche intérieurement sans le dire facilement. On l\'aidera en nourrissant le langage, le jeu et la créativité.' },
  },
  4: {
    nom:  { label: 'Absence du 4 — La Structure à Bâtir', texte: 'L\'absence du 4 signale un manque de cadre naturel. La marque devra compenser par des processus clairs et une discipline volontaire. Sans cela, le risque de dispersion est réel.' },
    bebe: { label: 'Absence du 4 — L\'Ordre à Apprivoiser', texte: 'L\'absence du 4 révèle un chemin autour de l\'organisation et de la persévérance. L\'enfant peut papillonner ou se décourager face à l\'effort long. On l\'aidera avec des routines bienveillantes et des objectifs concrets.' },
  },
  5: {
    nom:  { label: 'Absence du 5 — Le Mouvement à Provoquer', texte: 'L\'absence du 5 indique que ce nom manque de souffle aventurier. La marque risque la rigidité si elle ne s\'ouvre pas au changement. Intégrer de la nouveauté régulière sera sa force.' },
    bebe: { label: 'Absence du 5 — La Liberté à Découvrir', texte: 'L\'absence du 5 montre un chemin autour de l\'adaptabilité et du goût pour la nouveauté. L\'enfant peut préférer le connu et résister au changement. On l\'aidera en l\'exposant à des expériences variées sans forcer.' },
  },
  6: {
    nom:  { label: 'Absence du 6 — L\'Harmonie à Incarner', texte: 'L\'absence du 6 signale que ce nom ne porte pas naturellement l\'énergie de soin et de responsabilité. La marque devra cultiver consciemment la confiance et l\'accompagnement dans sa relation client.' },
    bebe: { label: 'Absence du 6 — La Responsabilité à Éveiller', texte: 'L\'absence du 6 révèle un chemin autour du sens des responsabilités et de l\'attention aux autres. L\'enfant peut sembler détaché des obligations familiales. On l\'aidera en lui confiant de petites missions de soin.' },
  },
  7: {
    nom:  { label: 'Absence du 7 — La Profondeur à Chercher', texte: 'L\'absence du 7 indique que ce nom manque de dimension réflexive. La marque risque de rester en surface si elle ne cultive pas une expertise ou une philosophie propre.' },
    bebe: { label: 'Absence du 7 — L\'Intériorité à Nourrir', texte: 'L\'absence du 7 montre un chemin autour de la réflexion et de l\'analyse. L\'enfant peut privilégier l\'action à la contemplation. On l\'aidera en lui offrant des moments de calme, des livres et des questions ouvertes.' },
  },
  8: {
    nom:  { label: 'Absence du 8 — Le Pouvoir à Assumer', texte: 'L\'absence du 8 signale que ce nom ne porte pas spontanément l\'énergie d\'ambition matérielle. La marque devra assumer ses objectifs financiers et sa valeur sans complexe.' },
    bebe: { label: 'Absence du 8 — L\'Ambition à Encourager', texte: 'L\'absence du 8 révèle un chemin autour du rapport à l\'argent, au pouvoir et à la réussite matérielle. L\'enfant peut sous-estimer sa propre valeur. On l\'aidera en normalisant l\'ambition et la fierté du travail accompli.' },
  },
  9: {
    nom:  { label: 'Absence du 9 — L\'Universel à Embrasser', texte: 'L\'absence du 9 indique que ce nom manque de souffle humaniste. La marque gagnera à intégrer une dimension de partage ou de contribution au collectif dans son identité.' },
    bebe: { label: 'Absence du 9 — La Compassion à Cultiver', texte: 'L\'absence du 9 montre un chemin autour de l\'ouverture aux autres et du don de soi. L\'enfant peut se concentrer sur son monde proche sans voir plus loin. On l\'aidera en élargissant son horizon : voyages, rencontres, générosité.' },
  },
};
function getKarmicLesson(num: number, module: LessonModule): { label: string; texte: string } {
  return KARMIC_LESSON_NARRATIVES[num]?.[module] || { label: `Absence du ${num}`, texte: '' };
}

// ══════════════════════════════════════
// ═══ RONDE 21 (3/3) — FENG SHUI ÉLÉMENTS ═══
// ══════════════════════════════════════
// Association chiffre réduit → élément (tradition Feng Shui classique)
// Enrichit le module Adresse d'une dimension culturelle supplémentaire.
// ═══ RONDE 23 — FENG SHUI ENRICHI (Gemini : cycle de contrôle des éléments) ═══
// Textes Gemini pour l'expertise Feng Shui authentique + conseils déco concrets
const FENG_SHUI_ELEMENTS: Record<number, { element: string; emoji: string; desc: string; texte: string }> = {
  1: { element: 'Eau',   emoji: '💧', desc: 'Fluidité et communication', texte: 'L\'Eau incarne le flux, l\'intuition et la communication profonde. Ce lieu favorise les échanges et les idées nouvelles. Pour équilibrer, introduisez l\'élément Bois (plantes vertes, formes élancées) qui canalise l\'énergie de l\'Eau sans la tarir.' },
  2: { element: 'Terre', emoji: '🌍', desc: 'Stabilité et ancrage', texte: 'La Terre symbolise l\'enracinement, la sécurité et la patience. Ce lieu offre un socle solide pour construire durablement. Pour dynamiser sans déstabiliser, ajoutez l\'élément Métal (objets ronds, couleurs blanches ou dorées) qui naît de la Terre.' },
  3: { element: 'Bois',  emoji: '🌳', desc: 'Croissance et créativité', texte: 'Le Bois représente la croissance, la créativité et l\'élan vital. Ce lieu pousse à se développer et à innover. Pour nourrir cette énergie, intégrez l\'élément Eau (miroirs, fontaines, teintes bleues) qui alimente le Bois dans le cycle de génération.' },
  4: { element: 'Bois',  emoji: '🌳', desc: 'Structure et apprentissage', texte: 'Le Bois mature incarne la structure organique et l\'apprentissage. Ce lieu est propice à l\'étude et à la mise en forme d\'idées. Soutenez-le avec l\'élément Eau (formes ondulées, bleu profond) et tempérez avec une touche de Feu (bougies, rouge) pour la vitalité.' },
  5: { element: 'Terre', emoji: '🌍', desc: 'Centre et transformation', texte: 'La Terre du 5 est le centre du Luo Shu, le pivot de toutes les énergies. Ce lieu est un carrefour de transformation et de transition. Équilibrez avec l\'élément Feu (lumières chaudes, teintes orangées) qui nourrit la Terre, et évitez l\'excès de Bois qui la déstabilise.' },
  6: { element: 'Métal', emoji: '⚙️', desc: 'Ordre et harmonie', texte: 'Le Métal incarne la concentration, l\'ordre et l\'autorité bienveillante. Ce lieu favorise le discernement et les décisions claires. Adoucissez avec l\'élément Eau (miroirs, formes ondulées, bleu profond) qui reçoit l\'énergie du Métal sans le rigidifier.' },
  7: { element: 'Métal', emoji: '⚙️', desc: 'Raffinement et introspection', texte: 'Le Métal raffiné du 7 invite au retrait intérieur et à l\'analyse. Ce lieu convient à la réflexion et au recentrage spirituel. Adoucissez l\'atmosphère avec l\'élément Eau (miroirs, teintes bleutées) et une touche de Terre (céramiques, tons ocres) pour l\'ancrage.' },
  8: { element: 'Terre', emoji: '🌍', desc: 'Prospérité et abondance', texte: 'La Terre du 8 est la plus prospère en Feng Shui — symbole d\'abondance et de réussite matérielle. Ce lieu soutient l\'ambition et la construction. Renforcez avec l\'élément Feu (éclairages vifs, rouge) qui nourrit la Terre, et ajoutez du Métal (doré, rond) pour récolter les fruits.' },
  9: { element: 'Feu',   emoji: '🔥', desc: 'Passion et rayonnement', texte: 'Le Feu symbolise la passion, la visibilité et le rayonnement. Ce lieu amplifie l\'énergie vitale et la présence sociale. Pour ne pas brûler trop vite, tempérez avec l\'élément Terre (céramiques, couleurs sable, formes carrées) qui absorbe et stabilise le Feu.' },
};

// ═══ RONDE 23 — MAÎTRES NOMBRES NARRATIFS (Labels Gemini + Textes GPT) ═══
// 15 textes : 3 maîtres × 5 modules
const MASTER_NUMBER_NARRATIVES: Record<number, Record<KarmicModule, { label: string; texte: string }>> = {
  11: {
    nom:     { label: 'Maître 11 — Le Visionnaire Inspiré', texte: 'Le Maître 11 confère au nom une vibration d\'intuition et d\'inspiration hors norme. C\'est un nom qui attire l\'attention sans la chercher, porteur d\'idées en avance sur leur temps. Sa force réside dans la vision — il magnétise ceux qui cherchent du sens.' },
    bebe:    { label: 'Maître 11 — L\'Enfant de Lumière', texte: 'Le Maître 11 révèle une sensibilité extrême et un don artistique ou intuitif rare. Ce n\'est pas un destin à imposer, c\'est une possibilité à protéger sans pression. L\'enfant captera des choses que d\'autres ne voient pas — donnez-lui un cadre sécurisant pour explorer cette richesse.' },
    adresse: { label: 'Maître 11 — Le Seuil de l\'Intuition', texte: 'Un lieu en vibration 11 amplifie l\'intuition et la sensibilité. C\'est une adresse propice à la création, à la méditation et aux activités inspirées. Veillez à équilibrer cette intensité : un environnement trop stimulant pourrait épuiser.' },
    numero:  { label: 'Vibration Maître 11 — L\'Antenne Sensible', texte: 'Un numéro en vibration 11 porte une fréquence d\'inspiration et de connexion subtile. Il attire les échanges profonds plutôt que superficiels. C\'est un numéro qui résonne avec les personnes en quête de sens.' },
    date:    { label: 'Jour Maître 11 — La Fenêtre d\'Inspiration', texte: 'Une journée en vibration 11 ouvre une fenêtre d\'intuition exceptionnelle. Les idées arrivent plus vite, les connexions se font naturellement. Idéal pour lancer un projet créatif, moins pour les décisions purement rationnelles.' },
  },
  22: {
    nom:     { label: 'Maître 22 — L\'Architecte des Possibles', texte: 'Le Maître 22 est le plus puissant des nombres : il combine vision et capacité de réalisation. Ce nom porte une promesse de construction durable et d\'impact à grande échelle. La marque devra assumer cette envergure — le 22 ne pardonne pas la demi-mesure.' },
    bebe:    { label: 'Maître 22 — Le Constructeur de Destins', texte: 'Le Maître 22 porte une puissance de réalisation rare, mais une charge plus lourde que la moyenne. Ce n\'est pas un destin à imposer, c\'est une possibilité à protéger sans pression. Donnez-lui des racines avant de lui demander de bâtir — ne brisez pas ses rêves, même s\'ils semblent irréalisables.' },
    adresse: { label: 'Maître 22 — La Forge des Projets', texte: 'Un lieu en vibration 22 est un accélérateur de projets ambitieux. C\'est une adresse qui pousse à construire, organiser, structurer à grande échelle. Attention : l\'énergie est exigeante — prévoyez des espaces de repos pour contrebalancer.' },
    numero:  { label: 'Vibration Maître 22 — Le Levier de Puissance', texte: 'Un numéro en vibration 22 porte une signature d\'autorité et de solidité. Il convient parfaitement aux projets d\'envergure, aux structures et aux partenariats durables. C\'est un numéro qui inspire confiance.' },
    date:    { label: 'Jour Maître 22 — Le Grand Bâtisseur', texte: 'Une journée en vibration 22 est idéale pour poser les fondations de quelque chose de durable. Contrats, signatures, lancements : le 22 donne la puissance de concrétiser ce qui semblait trop grand. Rare — ne la laissez pas passer.' },
  },
  33: {
    nom:     { label: 'Maître 33 — Le Guérisseur Universel', texte: 'Le Maître 33 est le nombre de la compassion et du service au plus haut niveau. Ce nom porte une vocation de soin, d\'enseignement ou de transmission. La marque sera naturellement associée à la bienveillance — elle devra honorer cette promesse.' },
    bebe:    { label: 'Maître 33 — L\'Âme au Grand Cœur', texte: 'Le Maître 33 est le plus élevé des nombres maîtres : amour universel et vocation de service. L\'enfant montrera très tôt une empathie hors norme et un besoin d\'aider. Protégez cette sensibilité sans la brider — elle est sa plus grande force.' },
    adresse: { label: 'Maître 33 — Le Sanctuaire Bienveillant', texte: 'Un lieu en vibration 33 rayonne d\'une énergie de soin et de guérison. C\'est une adresse idéale pour les activités thérapeutiques, l\'enseignement ou l\'accueil. L\'atmosphère invite naturellement à l\'ouverture du cœur.' },
    numero:  { label: 'Vibration Maître 33 — L\'Appel du Service', texte: 'Un numéro en vibration 33 porte une signature de compassion et de dévouement. Il convient aux activités de soin, d\'éducation et de service à autrui. C\'est un numéro qui attire les personnes en besoin d\'accompagnement.' },
    date:    { label: 'Jour Maître 33 — La Journée du Cœur', texte: 'Une journée en vibration 33 favorise les actes de générosité, les engagements altruistes et les gestes qui touchent. Idéale pour un mariage, une inauguration caritative, ou tout événement centré sur le lien humain.' },
  },
};
function getMasterNarrative(num: number, module: KarmicModule): { label: string; texte: string } | null {
  return MASTER_NUMBER_NARRATIVES[num]?.[module] || null;
}

/**
 * Ronde 21 : Détecte les leçons karmiques (chiffres 1-9 absents du nom).
 * Scanne les valeurs pythagoriciennes de chaque lettre et identifie les nombres manquants.
 */
function findKarmicLessons(name: string): number[] {
  const norm = normalizeStr(name);
  const present = new Set<number>();
  for (const c of norm) {
    const v = PYTH_MAP[c];
    if (v) present.add(v);
  }
  const missing: number[] = [];
  for (let i = 1; i <= 9; i++) {
    if (!present.has(i)) missing.push(i);
  }
  return missing;
}

// ═══ RONDE 23 — MERCURE RÉTROGRADE NARRATIFS (Textes GPT) ═══
// 1 intro explicative + 7 textes par type de sujet
const MERCURY_RETRO_INTRO = 'Mercure rétrograde est une période où les communications, les contrats et les déplacements sont sujets à des malentendus et des retards. Ce n\'est pas un interdit — c\'est une invitation à la prudence, à la relecture et à la clarté.';
const MERCURY_RETRO_NARRATIVES: Record<string, string> = {
  projet:         'Mercure rétrograde n\'interdit pas de lancer, mais rend les contrats plus fragiles et les accords plus flous. Relisez chaque clause, prévoyez des marges, et ne signez rien dans la précipitation. Ce que vous posez maintenant devra peut-être être ajusté — anticipez-le.',
  sentiments:     'Mercure rétrograde n\'interdit pas l\'aveu, mais rend les mots plus facilement ambigus. Le bon chemin n\'est pas de vous taire, mais de parler lentement, simplement, sans sous-entendu. Choisissez le face-à-face plutôt que le message écrit.',
  partenariat:    'Mercure rétrograde fragilise les accords et les premières impressions. Un partenariat initié maintenant risque de reposer sur des malentendus. Si la rencontre est inévitable, documentez tout par écrit et prévoyez un temps de confirmation après la rétrogradation.',
  investissement: 'Mercure rétrograde brouille les chiffres et les petits caractères. Les erreurs de calcul, les frais cachés et les conditions mal comprises sont plus fréquents. Vérifiez trois fois plutôt qu\'une, et préférez reporter les décisions irréversibles.',
  voyage:         'Mercure rétrograde est traditionnellement associé aux retards de transport, aux bagages perdus et aux réservations erronées. Partez avec des marges, confirmez vos réservations la veille, et gardez vos documents importants en double.',
  presentation:   'Mercure rétrograde affecte la communication publique : micro-coupures, lapsus, supports qui ne fonctionnent pas. Testez votre matériel en avance, ayez un plan B, et privilégiez la clarté plutôt que l\'effet. La sobriété sera votre meilleure alliée.',
  changement:     'Mercure rétrograde n\'est pas idéal pour les virages majeurs, car les informations sur lesquelles vous basez votre décision peuvent être incomplètes. Utilisez cette période pour préparer et analyser, puis agissez une fois Mercure direct.',
};

// ══════════════════════════════════════
// ═══ TRADITION CHINOISE — CHIFFRES ═══
// ══════════════════════════════════════

const CHINESE_DIGIT_BONUS: Record<number, { pts: number; label: string }> = {
  8: { pts: 8,  label: 'Chiffre 8 — Fortune et prospérité (八)' },
  6: { pts: 4,  label: 'Chiffre 6 — Fluidité, tout coule (六)' },
  9: { pts: 2,  label: 'Chiffre 9 — Longévité et durabilité (九)' },
  2: { pts: 1,  label: 'Chiffre 2 — Harmonie en paire (二)' },
  4: { pts: -6, label: 'Chiffre 4 — Énergie freinée, ralentit le flux (四)' },
  7: { pts: 0,  label: 'Chiffre 7 — Énergie neutre (七)' },  // Ronde 9 (3/3) : 7 neutre/positif en chinois
};

// ══════════════════════════════════════
// ═══ MATRICE BRAND × DOMAINE (Ronde 13bis — 3/3 unanime) ═══
// ══════════════════════════════════════

// Labels descriptifs par nombre (indépendants du domaine)
const EXPRESSION_LABELS: Record<number, string> = {
  1: 'Leadership — pionnier',        2: 'Diplomatie — partenariat',
  3: 'Expression — communication',   4: 'Structure — rigueur',
  5: 'Liberté — mouvement',          6: 'Harmonie — service',
  7: 'Introspection — sagesse',      8: 'Fortune — pouvoir',
  9: 'Vision — humanitaire',
  11: 'Maître Intuitif',  22: 'Maître Bâtisseur',  33: 'Maître Guérisseur',
};

// Score /10 par croisement Expression × Domaine
// Colonnes : commerce | creatif | humain | spirituel | tech | generaliste
const BRAND_DOMAIN_SCORES: Record<number, Record<OracleDomain, number>> = {
  1:  { commerce: 8,  creatif: 7,  humain: 4,  spirituel: 5,  tech: 8,  generaliste: 7 },
  2:  { commerce: 4,  creatif: 6,  humain: 9,  spirituel: 7,  tech: 5,  generaliste: 5 },
  3:  { commerce: 6,  creatif: 10, humain: 7,  spirituel: 5,  tech: 7,  generaliste: 7 },
  4:  { commerce: 9,  creatif: 4,  humain: 6,  spirituel: 5,  tech: 8,  generaliste: 7 },
  5:  { commerce: 8,  creatif: 8,  humain: 5,  spirituel: 6,  tech: 9,  generaliste: 7 },
  6:  { commerce: 5,  creatif: 7,  humain: 10, spirituel: 8,  tech: 4,  generaliste: 7 },
  7:  { commerce: 2,  creatif: 5,  humain: 6,  spirituel: 10, tech: 7,  generaliste: 5 },
  8:  { commerce: 10, creatif: 6,  humain: 4,  spirituel: 3,  tech: 8,  generaliste: 8 },
  9:  { commerce: 4,  creatif: 7,  humain: 9,  spirituel: 9,  tech: 6,  generaliste: 7 },
  11: { commerce: 6,  creatif: 8,  humain: 8,  spirituel: 10, tech: 9,  generaliste: 8 },
  22: { commerce: 10, creatif: 6,  humain: 7,  spirituel: 5,  tech: 10, generaliste: 9 },
  33: { commerce: 4,  creatif: 8,  humain: 10, spirituel: 10, tech: 5,  generaliste: 8 },
};

// Ronde 14 (3/3) : table spécifique ADRESSE (domicile/habitat)
// Le 6 (foyer) et 7 (sanctuaire) sont valorisés ; le 8 (business/bruit) nuancé
const ADDRESS_NUMBERS: Record<number, { pts: number; label: string }> = {
  1:  { pts: 6,  label: 'Indépendance — logement individuel, solitude constructive' },
  2:  { pts: 8,  label: 'Harmonie — lieu de couple, partage, coopération' },
  3:  { pts: 7,  label: 'Expression — lieu vivant, créatif, social' },
  4:  { pts: 7,  label: 'Stabilité — fondation solide, sécurité, racines' },
  5:  { pts: 5,  label: 'Mouvement — lieu de passage, changements fréquents' },
  6:  { pts: 10, label: 'Foyer — lieu idéal pour la famille et le bien-être' },
  7:  { pts: 9,  label: 'Sanctuaire — lieu de paix, réflexion, ressourcement' },
  8:  { pts: 6,  label: 'Ambition — lieu orienté carrière, moins reposant' },
  9:  { pts: 8,  label: 'Ouverture — lieu accueillant, humaniste, généreux' },
  11: { pts: 9,  label: 'Inspiration — lieu d\'intuition et d\'élévation' },
  22: { pts: 8,  label: 'Grand Œuvre — lieu pour bâtir quelque chose de durable' },
  33: { pts: 10, label: 'Compassion — lieu de guérison, service, amour inconditionnel' },
};

// Legacy : table Numéro (téléphone/SIRET) — orientée communication/énergie générale
const NUMBER_SCORES: Record<number, { pts: number; label: string }> = {
  1:  { pts: 8,  label: 'Leadership — numéro d\'initiative' },
  2:  { pts: 5,  label: 'Diplomatie — numéro de partenariat' },
  3:  { pts: 8,  label: 'Communication — numéro d\'expression et de contact' },
  4:  { pts: 6,  label: 'Structure — numéro stable et fiable' },
  5:  { pts: 7,  label: 'Liberté — numéro dynamique et adaptable' },
  6:  { pts: 7,  label: 'Harmonie — numéro de service et d\'entraide' },
  7:  { pts: 5,  label: 'Introspection — numéro discret, peu commercial' },
  8:  { pts: 9,  label: 'Fortune — numéro de pouvoir et de résultats' },
  9:  { pts: 7,  label: 'Vision — numéro d\'impact et de portée' },
  11: { pts: 9,  label: 'Maître Intuitif — numéro à vibration élevée' },
  22: { pts: 10, label: 'Maître Bâtisseur — numéro d\'infrastructure' },
  33: { pts: 8,  label: 'Maître Guérisseur — numéro de compassion' },
};

// ══════════════════════════════════════
// ═══ MATRICE NUMÉRO × DOMAINE D'ACTIVITÉ ═══
// ══════════════════════════════════════

// Ronde 20 (3/3 unanime — Decoz + Feng Shui) : la vibration de base est universelle,
// mais l'interprétation change selon le secteur d'activité.
// Seule la composante réduction est affectée — patterns et chinois restent universels.
// Format identique à BRAND_DOMAIN_SCORES : note /10 → multiplié par 10 pour obtenir redNorm [0,100]
const NUMBER_DOMAIN_SCORES: Record<number, Record<OracleDomain, number>> = {
  //                   com   créa  hum   spir  tech  gén
  1:  { commerce: 8,  creatif: 7,  humain: 5,  spirituel: 5,  tech: 8,  generaliste: 7 },
  2:  { commerce: 5,  creatif: 6,  humain: 10, spirituel: 8,  tech: 5,  generaliste: 6 },
  3:  { commerce: 7,  creatif: 10, humain: 7,  spirituel: 6,  tech: 6,  generaliste: 7 },
  4:  { commerce: 6,  creatif: 4,  humain: 5,  spirituel: 4,  tech: 8,  generaliste: 5 },
  5:  { commerce: 9,  creatif: 8,  humain: 5,  spirituel: 5,  tech: 7,  generaliste: 7 },
  6:  { commerce: 6,  creatif: 7,  humain: 10, spirituel: 7,  tech: 5,  generaliste: 8 },
  7:  { commerce: 4,  creatif: 6,  humain: 6,  spirituel: 10, tech: 8,  generaliste: 5 },
  8:  { commerce: 10, creatif: 5,  humain: 4,  spirituel: 4,  tech: 7,  generaliste: 8 },
  9:  { commerce: 7,  creatif: 8,  humain: 9,  spirituel: 9,  tech: 6,  generaliste: 7 },
  11: { commerce: 5,  creatif: 8,  humain: 9,  spirituel: 10, tech: 7,  generaliste: 7 },
  22: { commerce: 10, creatif: 6,  humain: 6,  spirituel: 6,  tech: 10, generaliste: 8 },
  33: { commerce: 5,  creatif: 8,  humain: 10, spirituel: 10, tech: 5,  generaliste: 7 },
};

// Descriptions contextuelles par réduction × domaine (évite "peu commercial — 10/10")
const NUMBER_DOMAIN_LABELS: Record<number, Record<OracleDomain, string>> = {
  1:  { commerce: 'Leadership — initiative et autorité', creatif: 'Originalité — vision unique', humain: 'Individualisme — énergie solitaire', spirituel: 'Quête personnelle — chemin intérieur', tech: 'Innovation — esprit pionnier', generaliste: 'Leadership — numéro d\'initiative' },
  2:  { commerce: 'Diplomatie — négociation et écoute', creatif: 'Collaboration — création en duo', humain: 'Empathie — lien profond', spirituel: 'Réceptivité — ouverture spirituelle', tech: 'Partenariat — synergie technique', generaliste: 'Diplomatie — numéro de partenariat' },
  3:  { commerce: 'Communication — relation client', creatif: 'Expression — créativité débordante', humain: 'Sociabilité — contact chaleureux', spirituel: 'Joie — énergie d\'expansion', tech: 'Présentation — interface engageante', generaliste: 'Communication — numéro d\'expression' },
  4:  { commerce: 'Fiabilité — structure solide', creatif: 'Rigueur — cadre parfois limitant', humain: 'Stabilité — énergie terre-à-terre', spirituel: 'Ancrage — peu de fluidité mystique', tech: 'Précision — infrastructure robuste', generaliste: 'Structure — numéro stable et fiable' },
  5:  { commerce: 'Dynamisme — adaptation rapide', creatif: 'Liberté — inspiration sans limite', humain: 'Mouvement — énergie dispersée', spirituel: 'Aventure — exploration sans ancrage', tech: 'Agilité — évolution constante', generaliste: 'Liberté — numéro dynamique' },
  6:  { commerce: 'Service — fidélisation client', creatif: 'Harmonie — esthétique équilibrée', humain: 'Bienveillance — écoute et soin', spirituel: 'Guérison — énergie de cœur', tech: 'Support — assistance fiable', generaliste: 'Harmonie — numéro de service' },
  7:  { commerce: 'Analyse — peu orienté vente', creatif: 'Profondeur — vision intérieure', humain: 'Réserve — énergie introspective', spirituel: 'Sagesse — vibration très élevée', tech: 'Recherche — esprit analytique', generaliste: 'Introspection — numéro discret' },
  8:  { commerce: 'Puissance — énergie de résultats', creatif: 'Ambition — moins de sensibilité artistique', humain: 'Pouvoir — énergie dominante', spirituel: 'Matérialisme — peu de transcendance', tech: 'Efficacité — performance maximale', generaliste: 'Fortune — numéro de pouvoir' },
  9:  { commerce: 'Impact — portée et influence', creatif: 'Inspiration — vision universelle', humain: 'Compassion — énergie humaniste', spirituel: 'Transcendance — vibration élevée', tech: 'Vision — perspective globale', generaliste: 'Vision — numéro d\'impact' },
  11: { commerce: 'Intuition — peu terre-à-terre', creatif: 'Illumination — créativité inspirée', humain: 'Sensibilité — connexion profonde', spirituel: 'Maîtrise intuitive — vibration maximale', tech: 'Vision avant-gardiste', generaliste: 'Maître Intuitif — vibration élevée' },
  22: { commerce: 'Empire — construire en grand', creatif: 'Architecture — structure créative', humain: 'Organisation — cadre collectif', spirituel: 'Édification — matière et esprit', tech: 'Infrastructure — bâtir à grande échelle', generaliste: 'Maître Bâtisseur — infrastructure' },
  33: { commerce: 'Altruisme — peu orienté profit', creatif: 'Art sacré — création au service', humain: 'Compassion universelle — dévotion', spirituel: 'Maître spirituel — vibration maximale', tech: 'Service universel — technologie éthique', generaliste: 'Maître Guérisseur — compassion' },
};

// ══════════════════════════════════════
// ═══ MATRICE 9×9 COMPATIBILITÉ NOM/CdV ═══
// ══════════════════════════════════════

// Score 0-10 : compatibilité entre le nombre du nom et le CdV du créateur
const NAME_CDV_COMPAT: Record<string, number> = {
  '1-1': 8, '1-2': 5, '1-3': 9, '1-4': 4, '1-5': 8, '1-6': 5, '1-7': 6, '1-8': 7, '1-9': 7,
  '2-2': 6, '2-3': 7, '2-4': 7, '2-5': 4, '2-6': 9, '2-7': 5, '2-8': 5, '2-9': 6,
  '3-3': 7, '3-4': 3, '3-5': 8, '3-6': 8, '3-7': 5, '3-8': 6, '3-9': 9,
  '4-4': 6, '4-5': 4, '4-6': 7, '4-7': 6, '4-8': 9, '4-9': 4,
  '5-5': 7, '5-6': 5, '5-7': 7, '5-8': 6, '5-9': 8,
  '6-6': 7, '6-7': 4, '6-8': 5, '6-9': 8,
  '7-7': 8, '7-8': 4, '7-9': 5,
  '8-8': 7, '8-9': 7,
  '9-9': 7,
};

function getNameCdvCompat(nameNum: number, cdv: number): number {
  const a = Math.min(nameNum, cdv);
  const b = Math.max(nameNum, cdv);
  return NAME_CDV_COMPAT[`${a}-${b}`] ?? 5;
}

// ══════════════════════════════════════
// ═══ PATTERNS NUMÉRIQUES ═══
// ══════════════════════════════════════

interface NumberPatterns {
  repeats: number;      // Chiffres répétés (88, 666...)
  sequences: number;    // Suites (123, 456...)
  mirrors: number;      // Miroirs (1221, 3443...)
  chineseBonus: number; // Tradition chinoise
  reduction: Reduced;   // Réduction finale
  rawSum: number;       // Ronde 21 : somme brute avant réduction (pour détection karmique)
  details: string[];
}

function analyzeNumber(numStr: string): NumberPatterns {
  const digits = numStr.replace(/[^0-9]/g, '');
  const details: string[] = [];
  let repeats = 0, sequences = 0, mirrors = 0, chineseBonus = 0;

  // ── Répétitions ──
  const repeatMatch = digits.match(/(.)\1{1,}/g);
  if (repeatMatch) {
    repeats = repeatMatch.reduce((acc, m) => acc + (m.length - 1) * 2, 0);
    repeatMatch.forEach(m => {
      if (m.length >= 3) details.push(`Le chiffre ${m[0]} apparaît ${m.length}× d'affilée (${m}) — ${m[0] === '8' ? 'très favorable' : m[0] === '4' ? 'attention' : 'répétition notable'}`);
    });
  }

  // ── Suites ──
  for (let i = 0; i < digits.length - 2; i++) {
    const a = parseInt(digits[i]), b = parseInt(digits[i + 1]), c = parseInt(digits[i + 2]);
    if (b === a + 1 && c === b + 1) { sequences += 3; details.push(`Suite ${digits.substring(i, i + 3)} — progression ascendante (dynamisme)`); }
    if (b === a - 1 && c === b - 1) { sequences += 2; details.push(`Suite ${digits.substring(i, i + 3)} — progression descendante (ralentissement)`); }
  }

  // ── Miroirs ──
  if (digits.length >= 4) {
    const half = Math.floor(digits.length / 2);
    const first = digits.substring(0, half);
    const second = digits.substring(digits.length - half).split('').reverse().join('');
    if (first === second) { mirrors = 5; details.push(`Nombre miroir (${first}|${second.split('').reverse().join('')}) — symétrie parfaite, énergie réfléchie`); }
  }

  // ── Tradition chinoise ──
  const digitCounts: Record<number, number> = {};
  for (const d of digits) {
    const n = parseInt(d);
    digitCounts[n] = (digitCounts[n] || 0) + 1;
  }
  for (const [digit, count] of Object.entries(digitCounts)) {
    const d = parseInt(digit);
    const info = CHINESE_DIGIT_BONUS[d];
    if (info) {
      const bonus = info.pts * count;
      chineseBonus += bonus;
      if (Math.abs(bonus) >= 4) details.push(`${info.label} (×${count})`);
    }
  }

  // ── Bonus 168 — 一六八 Yi Lu Fa (一路发 "chemin vers la fortune") ──
  // Ronde 9 : séquence 168 très favorable en numérologie chinoise
  if (digits.includes('168')) {
    chineseBonus += 10;
    details.push('一六八 Yi Lu Fa (168) — "chemin vers la fortune" (très favorable)');
  }

  // ── Réduction finale ──
  const sum = digits.split('').reduce((acc, d) => acc + parseInt(d), 0);
  const reduction = reduce(sum);

  return { repeats, sequences, mirrors, chineseBonus, reduction, rawSum: sum, details };
}

// ══════════════════════════════════════
// ═══ SUJETS — MAPPING DOMAINES ═══
// ══════════════════════════════════════

export interface SujetInfo {
  label: string;
  icon: string;
  mercurySensitive: boolean; // Hard cap si Mercure Rétro
  dominantDomain: string;    // Domaine prioritaire dans le score quotidien
}

export const SUJETS: Record<OracleSujet, SujetInfo> = {
  projet:         { label: 'Lancer projet / signer contrat', icon: '🚀', mercurySensitive: true,  dominantDomain: 'BUSINESS' },
  sentiments:     { label: 'Déclarer sentiments / premier RDV', icon: '💕', mercurySensitive: false, dominantDomain: 'AMOUR' },
  partenariat:    { label: 'Rencontrer associé / partenariat', icon: '🤝', mercurySensitive: true,  dominantDomain: 'RELATIONS' },
  investissement: { label: 'Investissement / décision financière', icon: '💰', mercurySensitive: true,  dominantDomain: 'BUSINESS' },
  voyage:         { label: 'Voyage / déménagement', icon: '✈️', mercurySensitive: true,  dominantDomain: 'VITALITE' },      // Ronde 9 (3/3) : Hermès = voyageurs
  presentation:   { label: 'Présentation / prise de parole', icon: '🎤', mercurySensitive: true,  dominantDomain: 'CREATIVITE' },  // Ronde 9ter : communication sensible MR
  changement:     { label: 'Changement de vie majeur', icon: '🔄', mercurySensitive: true,  dominantDomain: 'INTROSPECTION' },
};

// ══════════════════════════════════════
// ═══ TEXTES VERDICTS (3 × 7 = 21) ═══
// ══════════════════════════════════════

const VERDICT_TEXTES: Record<OracleSujet, Record<OracleVerdict, string>> = {
  projet: {
    feu_vert: "Les cycles de création sont ouverts. Fonce — le timing est aligné avec ton énergie de fondation.",
    prudence: "Le potentiel est là, mais un détail structurel freine. Révise tes fondations avant d'appuyer sur le bouton.",
    pas_maintenant: "Mauvais timing cosmique. Le lancement risque de s'épuiser rapidement — attends une meilleure fenêtre.",
  },
  sentiments: {
    feu_vert: "Vénus et ta numérologie te soutiennent. Parle — les mots toucheront juste.",
    prudence: "L'énergie est ambiguë. Teste les eaux avant de tout révéler — une approche subtile sera plus efficace.",
    pas_maintenant: "Risque élevé de mauvaise interprétation aujourd'hui. Garde le silence et attends un jour plus réceptif.",
  },
  partenariat: {
    feu_vert: "Les énergies relationnelles sont au sommet. Rencontrez, négociez, engagez-toi — la synergie est naturelle.",
    prudence: "Le terrain est correct mais pas optimal. Prends le temps de vérifier la compatibilité profonde avant de signer.",
    pas_maintenant: "Les systèmes détectent des frictions cachées. Reporte cette rencontre — ton instinct sera plus clair demain.",
  },
  investissement: {
    feu_vert: "Les cycles financiers sont favorables. Ton discernement est à son pic — fais confiance à ton analyse.",
    prudence: "Le moment n'est ni bon ni mauvais. Attends un signal supplémentaire avant d'engager des sommes importantes.",
    pas_maintenant: "Risque de perte accru. Les cycles ne soutiennent pas les décisions financières majeures aujourd'hui.",
  },
  voyage: {
    feu_vert: "Les vents sont porteurs. Ce déplacement apportera plus que prévu — reste ouvert aux rencontres.",
    prudence: "Le voyage est possible mais exigera plus d\'énergie que prévu. Prépare-toi aux imprévus logistiques.",
    pas_maintenant: "L'énergie invite au repos, pas au mouvement. Si c'est reportable, ton corps te remerciera.",
  },
  presentation: {
    feu_vert: "Ton charisme est amplifié. Monte sur scène — chaque mot portera avec une force inhabituelle.",
    prudence: "Tu seras correct mais pas exceptionnel. Prépare davantage pour compenser l'énergie moyenne.",
    pas_maintenant: "Risque de trous de mémoire ou de perte de fil. Déléguer ou reporter serait plus sage.",
  },
  changement: {
    feu_vert: "Les grands cycles soutiennent ton mutation. C'est un portail — traversez-le avec conviction.",
    prudence: "Le changement est possible mais le timing n'est pas parfait. Pose les bases sans tout bousculer d'un coup.",
    pas_maintenant: "Les systèmes détectent une résistance profonde. Ce n'est pas le moment de tout renverser — consolidez d'abord.",
  },
};

// ══════════════════════════════════════
// ═══ VERDICT ═══
// ══════════════════════════════════════

function getVerdict(score: number, sujet: OracleSujet | null): OracleVerdictInfo {
  let verdict: OracleVerdict;
  if (score >= 75) verdict = 'feu_vert';
  else if (score >= 48) verdict = 'prudence';
  else verdict = 'pas_maintenant';

  const icons: Record<OracleVerdict, string> = { feu_vert: '✅', prudence: '⚠️', pas_maintenant: '🛑' };
  const labels: Record<OracleVerdict, string> = { feu_vert: 'Feu Vert', prudence: 'Prudence', pas_maintenant: 'Pas maintenant' };
  const colors: Record<OracleVerdict, string> = { feu_vert: '#4ade80', prudence: '#f59e0b', pas_maintenant: '#ef4444' };

  let texte: string;
  if (sujet && VERDICT_TEXTES[sujet]) {
    texte = VERDICT_TEXTES[sujet][verdict];
  } else {
    const generic: Record<OracleVerdict, string> = {
      feu_vert: "Les cycles sont alignés en ton faveur. Avance avec confiance.",
      prudence: "L\'énergie est mitigée. Procède avec attention et vérifie les détails.",
      pas_maintenant: "Les systèmes recommandent d'attendre. Ce n'est pas le bon moment.",
    };
    texte = generic[verdict];
  }

  return { verdict, icon: icons[verdict], label: labels[verdict], color: colors[verdict], texte };
}

// ══════════════════════════════════════
// ═══ CALCULS PAR TYPE ═══
// ══════════════════════════════════════

/**
 * A) Date précise — score SoulPrint du jour cible + alignement profil.
 * Le dailyScore EST le domainScore pour ce type.
 */
// Ronde 9 (3/3) : Table qualité du jour par vibration numérologique (1-10)
const DATE_VIBRATION_QUALITY: Record<number, { pts: number; label: string }> = {
  1:  { pts: 7,  label: 'Initiative — bon pour lancer' },
  2:  { pts: 5,  label: 'Réceptivité — bon pour coopérer' },
  3:  { pts: 8,  label: 'Expression — créativité et communication' },
  4:  { pts: 6,  label: 'Structure — patience, fondation' },
  5:  { pts: 7,  label: 'Changement — mouvement et opportunité' },
  6:  { pts: 8,  label: 'Harmonie — foyer, amour, responsabilité' },
  7:  { pts: 6,  label: 'Réflexion — introspection, analyse' },
  8:  { pts: 9,  label: 'Manifestation — pouvoir et résultats' },
  9:  { pts: 7,  label: 'Accomplissement — bilan et humanité' },
  11: { pts: 9,  label: 'Maître Intuitif — inspiration élevée' },
  22: { pts: 10, label: 'Maître Bâtisseur — potentiel maximal' },
  33: { pts: 8,  label: 'Maître Guérisseur — compassion universelle' },
};

/**
 * A) Date — Ronde 9 (3/3) : formule à 3 composantes
 *   domainScore = 0.40 × vibrationDate + 0.30 × compat(date,CdV) + 0.30 × cyclePersonnel
 */
function calcOracleDate(targetDate: string, dailyScore: number, userCdv: number, userBirthDay: number, userBirthMonth: number): { domainScore: number; breakdown: { label: string; value: string; pts: number }[]; signals: string[]; alerts: string[] } {
  const signals: string[] = [];
  const alerts: string[] = [];
  const breakdown: { label: string; value: string; pts: number }[] = [];

  // Parse date
  const parts = targetDate.split('-');
  const year = parseInt(parts[0] || '2026');
  const month = parseInt(parts[1] || '1');
  const day = parseInt(parts[2] || '1');

  // 1. Vibration de la date = réduction(JJ + MM + AAAA)
  const dateSum = day + month + year;
  const vibDate = reduce(dateSum);
  const vibInfo = DATE_VIBRATION_QUALITY[vibDate.v] || { pts: 5, label: 'Neutre' };
  const vibScore = vibInfo.pts * 10; // Scale 0-100
  breakdown.push({ label: `Vibration du jour : ${vibDate.v}${vibDate.m ? ' Maître' : ''}`, value: vibInfo.label, pts: vibScore });

  // 2. Compatibilité vibration date × CdV utilisateur (matrice NUM_COMPAT)
  const vibSimple = vibDate.v > 9 ? reduce(vibDate.v).v : vibDate.v;
  const cdvSimple = userCdv > 9 ? reduce(userCdv).v : userCdv;
  const compatRaw = getNameCdvCompat(vibSimple, cdvSimple); // réutilise la matrice 9×9
  const compatScore = compatRaw * 10; // Scale 0-100
  breakdown.push({ label: `Résonance date × CdV ${userCdv}`, value: `${compatRaw}/10`, pts: compatScore });

  // 3. Cycle Personnel = Année Perso → Mois Perso → Jour Perso
  //    Ronde 10 (3/3) : Année Perso = reduce(jour_naissance + mois_naissance + année_cible) (Decoz classique)
  //    Ronde 11 (Gemini) : Jour Personnel = reduce(moisPerso + jour_cible) → timing précis par jour
  const anneePerso = reduce(userBirthDay + userBirthMonth + year);
  const moisPerso = reduce(anneePerso.v + month);
  const jourPerso = reduce(moisPerso.v + day);
  // Compat Jour Personnel avec vibration date (micro vs micro)
  const jourPersoSimple = jourPerso.v > 9 ? reduce(jourPerso.v).v : jourPerso.v;
  const cycleCompatRaw = getNameCdvCompat(jourPersoSimple, vibSimple);
  const cycleScore = cycleCompatRaw * 10; // Scale 0-100
  breakdown.push({ label: `Jour personnel : JP${jourPerso.v} (AP${anneePerso.v}/MP${moisPerso.v})`, value: `Résonance ${cycleCompatRaw}/10`, pts: cycleScore });

  // Formule Ronde 9 : 0.40 × vibDate + 0.30 × compat + 0.30 × cycle
  const domainScore = Math.max(0, Math.min(100, Math.round(
    0.40 * vibScore + 0.30 * compatScore + 0.30 * cycleScore
  )));

  // Ronde 23 : rappel que le score est personnalisé (pas universel)
  signals.push(`Ce score est personnalisé pour ton Chemin de Vie ${userCdv} — une autre personne obtiendrait un résultat différent pour la même date`);
  if (domainScore >= 75) signals.push('Journée à fort potentiel numérologique pour cette action');
  else if (domainScore < 40) alerts.push('Journée sous tension numérologique — considérez une alternative');

  // Bonus Maître Nombre sur la date — Ronde 23 narratifs
  if (vibDate.m) {
    const masterInfo = getMasterNarrative(vibDate.v, 'date');
    signals.push(masterInfo ? `${masterInfo.label} — ${masterInfo.texte}` : `Vibration Maître ${vibDate.v} — journée à potentiel exceptionnel`);
  }

  // ── Ronde 21+22 : Nombre karmique — méthode Decoz (réduire chaque composante séparément) ──
  // Avant R22 : checkKarmicNumber(dateSum) avec dateSum > 2000 → toujours null
  // Fix R22 (Gemini) : reduce(J) + reduce(M) + reduce(AAAA) → somme intermédiaire testable
  const reducedDay = reduce(day).v;
  const reducedMonth = reduce(month).v;
  const reducedYear = reduce(year).v;
  const decozSum = reducedDay + reducedMonth + reducedYear;
  const dateKarmic = checkKarmicNumber(decozSum);
  if (dateKarmic) {
    const kInfo = getKarmicDebt(dateKarmic, 'date');
    breakdown.push({ label: kInfo.label, value: `${day}→${reducedDay} + ${month}→${reducedMonth} + ${year}→${reducedYear} = ${decozSum}`, pts: 0 });
    alerts.push(kInfo.texte);
  }

  return { domainScore, breakdown, signals, alerts };
}

// Ronde 18 (3/3 unanime) : descriptions accessibles Âme / Image
// Extraites au niveau module pour réutilisation dans Nom ET Bébé
const AME_DESC: Record<number, string> = {
  1: 'Besoin d\'indépendance', 2: 'Besoin d\'harmonie', 3: 'Besoin d\'expression',
  4: 'Besoin de sécurité', 5: 'Besoin de liberté', 6: 'Besoin d\'amour',
  7: 'Besoin de vérité', 8: 'Besoin de réussite', 9: 'Besoin d\'idéal',
  11: 'Intuition profonde', 22: 'Vision de bâtisseur', 33: 'Compassion universelle',
};
const IMAGE_DESC: Record<number, string> = {
  1: 'Image de leader', 2: 'Image douce et diplomate', 3: 'Image créative et sociable',
  4: 'Image sérieuse et fiable', 5: 'Image dynamique et libre', 6: 'Image protectrice et chaleureuse',
  7: 'Image mystérieuse et réservée', 8: 'Image puissante et ambitieuse', 9: 'Image sage et généreuse',
  11: 'Image inspirante', 22: 'Image d\'envergure', 33: 'Image de guide',
};

/**
 * B) Nom (entreprise/produit/marque) — table Pythagoricienne.
 */
function calcOracleNom(name: string, userCdv: number, domain: OracleDomain = 'generaliste'): { domainScore: number; breakdown: { label: string; value: string; pts: number }[]; signals: string[]; alerts: string[] } {
  // Ronde 10 : guard nom vide — la numérologie ne peut pas s'appliquer sans lettres
  if (!name || normalizeStr(name).length === 0) {
    return { domainScore: 0, breakdown: [], signals: [], alerts: ['⚠️ Aucun nom saisi — la numérologie ne peut pas s\'appliquer.'] };
  }

  const signals: string[] = [];
  const alerts: string[] = [];
  const breakdown: { label: string; value: string; pts: number }[] = [];

  // Strip TLD avant calcul (.com, .fr, etc.)
  const { cleaned: cleanedName, tldFound } = stripTLD(name);
  if (tldFound) signals.push(`Extension "${tldFound}" ignorée — calcul sur "${cleanedName}" uniquement`);

  const nums = calcNameNumbers(cleanedName);
  const exprV = nums.expression.v;
  const ameV = nums.ame.v;
  const imageV = nums.image.v;

  // Descriptions enrichies des nombres — l'utilisateur comprend ce que chaque nombre signifie
  const exprDesc = EXPRESSION_LABELS[exprV] || 'Neutre';
  breakdown.push({ label: `Expression : ${exprV}${nums.expression.m ? ' Maître' : ''}`, value: exprDesc, pts: 0 });
  breakdown.push({ label: `Âme : ${ameV}${nums.ame.m ? ' Maître' : ''}`, value: AME_DESC[ameV] || 'Motivation profonde', pts: 0 });
  breakdown.push({ label: `Image : ${imageV}${nums.image.m ? ' Maître' : ''}`, value: IMAGE_DESC[imageV] || 'Apparence extérieure', pts: 0 });

  // Ronde 13bis (3/3 unanime) : matrice 2D BRAND_DOMAIN_SCORES remplace BUSINESS_NUMBERS
  const domainScores = BRAND_DOMAIN_SCORES[exprV] || BRAND_DOMAIN_SCORES[exprV > 9 ? reduce(exprV).v : exprV];
  const bizScore = domainScores ? domainScores[domain] : 5;
  const bizPts = bizScore * 5; // Scale 0-50
  const exprLabel = EXPRESSION_LABELS[exprV] || 'Neutre';
  const domainInfo = ORACLE_DOMAINS.find(d => d.id === domain);
  const domainLabel = domainInfo ? domainInfo.label : 'Généraliste';
  breakdown.push({ label: `Score ${domainLabel}`, value: `${exprLabel} — ${bizScore}/10`, pts: bizPts });

  // Feedback dynamique (Ronde 13bis — Gemini)
  if (bizScore >= 8) signals.push(`La vibration du ${exprV} est excellente pour le secteur ${domainLabel}`);
  else if (bizScore <= 4) alerts.push(`La vibration du ${exprV} est en décalage avec le secteur ${domainLabel}`);

  // Compatibilité avec le CdV du créateur
  const compatScore = getNameCdvCompat(exprV > 9 ? reduce(exprV).v : exprV, userCdv > 9 ? reduce(userCdv).v : userCdv);
  const compatPts = compatScore * 5; // Scale 0-50
  breakdown.push({ label: `Compatibilité CdV ${userCdv}`, value: `${compatScore}/10`, pts: compatPts });

  if (compatScore >= 8) signals.push(`Excellente résonance entre "${name}" et ton Chemin de Vie ${userCdv}`);
  else if (compatScore <= 3) alerts.push(`Friction entre "${name}" et ton CdV ${userCdv} — l\'énergie sera en tension`);

  // Bonus maître
  let masterBonus = 0;
  if (nums.expression.m) {
    masterBonus += 5;
    const masterInfo = getMasterNarrative(exprV, 'nom');
    signals.push(masterInfo ? `${masterInfo.label} — ${masterInfo.texte}` : `Nombre Maître ${exprV} — puissance spirituelle dans le nom`);
  }

  // Ronde 14bis (2/3 Grok+Gemini) : bonus Âme si résonance forte avec CdV créateur
  // L'Âme (Heart's Desire / Élan Spirituel) = voyelles = motivation profonde (Decoz)
  let soulBonus = 0;
  const ameSimple = ameV > 9 ? reduce(ameV).v : ameV;
  const cdvSimpleForSoul = userCdv > 9 ? reduce(userCdv).v : userCdv;
  const soulCompat = getNameCdvCompat(ameSimple, cdvSimpleForSoul);
  if (soulCompat >= 8) {
    soulBonus = 5;
    signals.push(`Âme du nom (${ameV}) en forte résonance avec ton CdV ${userCdv} — motivation profonde alignée`);
  }

  // ── Ronde 21 (3/3) : Nombres Karmiques 13/14/16/19 ──
  // Intercepte la somme AVANT réduction pour détecter les dettes karmiques
  const exprKarmic = checkKarmicNumber(nums.rawSums.expr);
  const ameKarmic = checkKarmicNumber(nums.rawSums.ame);
  const imageKarmic = checkKarmicNumber(nums.rawSums.image);
  if (exprKarmic) {
    const kInfo = getKarmicDebt(exprKarmic, 'nom');
    breakdown.push({ label: `${kInfo.label}`, value: `Vibration globale du nom : somme ${nums.rawSums.expr} → ${exprV}`, pts: 0 });
    alerts.push(kInfo.texte);
  }
  if (ameKarmic) {
    const kInfo = getKarmicDebt(ameKarmic, 'nom');
    breakdown.push({ label: `${kInfo.label}`, value: `Motivation profonde (voyelles) : somme ${nums.rawSums.ame} → ${ameV}`, pts: 0 });
    alerts.push(kInfo.texte);
  }
  if (imageKarmic) {
    const kInfo = getKarmicDebt(imageKarmic, 'nom');
    breakdown.push({ label: `${kInfo.label}`, value: `Image perçue (consonnes) : somme ${nums.rawSums.image} → ${imageV}`, pts: 0 });
    alerts.push(kInfo.texte);
  }

  // ── Ronde 21+23 : Leçons Karmiques (lettres manquantes) — narratifs contextualisés ──
  const karmicLessons = findKarmicLessons(cleanedName);
  if (karmicLessons.length > 0 && karmicLessons.length <= 4) {
    // Signaler uniquement si 1-4 manquantes (5+ = nom très court, pas significatif)
    const lessonDetails = karmicLessons.map(n => { const l = getKarmicLesson(n, 'nom'); return `${n} (${l.label.split(' — ')[1] || l.label})`; }).join(', ');
    breakdown.push({ label: 'Leçons karmiques (lettres manquantes)', value: lessonDetails, pts: 0 });
    karmicLessons.forEach(n => { const l = getKarmicLesson(n, 'nom'); alerts.push(l.texte); });
  }

  // Ronde 13bis (3/3 unanime) : suppression du ×0.95 — un match parfait peut atteindre 100%
  const domainScore = Math.max(0, Math.min(100, Math.round(bizPts + compatPts + masterBonus + soulBonus)));
  return { domainScore, breakdown, signals, alerts };
}

/**
 * C) Adresse — Ronde 11 : 60% numéro + 20% nom de rue + 20% compat CdV.
 *    Rend l'adresse personnelle (2 utilisateurs ≠ même résultat).
 */
function calcOracleAdresse(adresse: string, userCdv: number, appart?: string): { domainScore: number; breakdown: { label: string; value: string; pts: number }[]; signals: string[]; alerts: string[] } {
  const signals: string[] = [];
  const alerts: string[] = [];
  const breakdown: { label: string; value: string; pts: number }[] = [];

  // Ronde 17 (3/3 unanime) : nettoyer CP/ville avant calcul
  // Le code postal et la ville n'ont aucune base doctrinale (Decoz, Goodwin, Javane & Bunker)
  // Stratégie : couper au premier code postal (5 chiffres non précédés de "n°")
  // puis couper une éventuelle ville après virgule
  let cleaned = adresse.trim();
  cleaned = cleaned.replace(/[,\s]+\d{5}\b.*$/i, '');   // ", 75001 Paris" → supprimé
  cleaned = cleaned.replace(/\s+\d{5}\b.*$/i, '');       // " 75001 Paris" → supprimé
  // Virgule suivie d'un mot non-numérique = probable ville (", Paris", ", Lyon")
  cleaned = cleaned.replace(/,\s*[A-Za-zÀ-ÿ\s-]+$/, '');
  cleaned = cleaned.trim();
  if (!cleaned) cleaned = adresse.trim(); // fallback sécurité

  // Extraire numéro (+ suffixe lettre ou bis/ter/quater) et nom de rue
  // Ronde 17 : regex enrichi pour capturer les suffixes français et lettres
  //   "14b rue X" → numero="14", suffixe="b", rue="rue X"
  //   "7 bis rue X" → numero="7", suffixe="bis", rue="rue X"
  //   "7 ter rue X" → numero="7", suffixe="ter", rue="rue X"
  const match = cleaned.match(/^(\d+)\s*([a-z]?)(?:\s+(bis|ter|quater))?\s*,?\s+(.+)/i);
  let numero = '';
  let suffixe = '';
  let rue = cleaned;
  if (match) {
    numero = match[1];
    suffixe = (match[2] || match[3] || '').toLowerCase();
    rue = match[4];
  }

  // Ronde 17 : table de conversion suffixes → valeur numérologique (Decoz : sous-vibration)
  // Lettres : A=1, B=2, C=3... | Français : bis=2, ter=3, quater=4
  const SUFFIX_VALUE: Record<string, number> = {
    a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8,
    bis: 2, ter: 3, quater: 4,
  };
  const suffixValue = suffixe ? (SUFFIX_VALUE[suffixe] || 0) : 0;
  const suffixLabel = suffixe ? ` ${suffixe}` : '';

  // Ronde 17 : pondération dynamique selon présence appart
  // Avec appart : Rue 45% + Appart 15% + Nom rue 20% + Compat 20%  (Decoz : appart = vibration intime)
  // Sans appart : Rue 60% + Nom rue 20% + Compat 20%  (pondération classique)
  const hasAppart = appart != null && appart.trim().length > 0;
  const W_NUM = hasAppart ? 0.45 : 0.60;
  const W_APT = hasAppart ? 0.15 : 0;
  const W_RUE = 0.20;
  const W_CMP = 0.20;

  // Numéro de rue + sous-vibration suffixe (Decoz)
  let numScore = 50;
  let numReduced = reduce(5); // fallback
  if (numero) {
    const digits = numero.replace(/[^0-9]/g, '');
    const baseSum = digits.split('').reduce((s, d) => s + parseInt(d), 0);
    // La sous-vibration du suffixe s'ajoute à la somme avant réduction
    numReduced = reduce(baseSum + suffixValue);
    const bizInfo = ADDRESS_NUMBERS[numReduced.v] || { pts: 5, label: 'Neutre' };
    numScore = Math.min(100, bizInfo.pts * 10);
    const numLabel = suffixe
      ? `N° ${numero}${suffixLabel} → ${baseSum}+${suffixValue} → ${numReduced.v}`
      : `N° ${numero} → ${numReduced.v}`;
    breakdown.push({ label: numLabel, value: bizInfo.label, pts: Math.round(numScore * W_NUM) });

    if (bizInfo.pts >= 8) signals.push(`N° ${numero}${suffixLabel} réduit à ${numReduced.v} — ${bizInfo.label}`);
    if (bizInfo.pts <= 2) alerts.push(`N° ${numero}${suffixLabel} réduit à ${numReduced.v} — ${bizInfo.label}`);
  }

  // Ronde 17 : Appart / Étage (15% si présent — Decoz : vibration la plus intime du foyer)
  let aptScore = 50;
  let aptReduced = reduce(1);
  if (hasAppart) {
    const aptDigits = appart!.trim().replace(/[^0-9]/g, '');
    if (aptDigits.length > 0) {
      aptReduced = reduce(aptDigits.split('').reduce((s, d) => s + parseInt(d), 0));
    } else {
      // Appart avec lettres seulement (ex: "A", "B") → calcul comme string
      aptReduced = calcStringNumber(appart!.trim());
    }
    const aptInfo = ADDRESS_NUMBERS[aptReduced.v] || { pts: 5, label: 'Neutre' };
    aptScore = Math.min(100, aptInfo.pts * 10);
    breakdown.push({ label: `Appart "${appart!.trim()}" → ${aptReduced.v}`, value: aptInfo.label, pts: Math.round(aptScore * W_APT) });

    if (aptInfo.pts >= 8) signals.push(`Appart ${appart!.trim()} réduit à ${aptReduced.v} — ${aptInfo.label}, vibration intime favorable`);
    if (aptInfo.pts <= 2) alerts.push(`Appart ${appart!.trim()} réduit à ${aptReduced.v} — ${aptInfo.label}`);
  }

  // Nom de rue (20%)
  const rueNum = calcStringNumber(rue);
  const rueBiz = ADDRESS_NUMBERS[rueNum.v] || { pts: 5, label: 'Neutre' };
  const rueScore = Math.min(100, rueBiz.pts * 10);
  breakdown.push({ label: `"${rue}" → ${rueNum.v}`, value: rueBiz.label, pts: Math.round(rueScore * W_RUE) });

  // Ronde 11 : Compatibilité adresse × CdV (20%) — rend l'adresse personnelle
  // Ronde 17 : si appart présent, inclure sa vibration dans la réduction globale
  let adresseGlobalNum;
  if (hasAppart) {
    adresseGlobalNum = numero
      ? reduce(numReduced.v + aptReduced.v + rueNum.v)
      : reduce(aptReduced.v + rueNum.v);
  } else {
    adresseGlobalNum = numero
      ? reduce(numReduced.v + rueNum.v)
      : rueNum;
  }
  const adresseSimple = adresseGlobalNum.v > 9 ? reduce(adresseGlobalNum.v).v : adresseGlobalNum.v;
  const cdvSimple = userCdv > 9 ? reduce(userCdv).v : userCdv;
  const compatRaw = getNameCdvCompat(adresseSimple, cdvSimple);
  const compatScore = compatRaw * 10; // Scale 0-100
  breakdown.push({ label: `Résonance adresse × CdV ${userCdv}`, value: `${compatRaw}/10`, pts: Math.round(compatScore * W_CMP) });

  if (compatRaw >= 8) signals.push(`Excellente résonance entre cette adresse et ton CdV ${userCdv}`);
  else if (compatRaw <= 3) alerts.push(`Friction entre cette adresse et ton CdV ${userCdv}`);

  const domainScore = Math.max(0, Math.min(100, Math.round(numScore * W_NUM + aptScore * W_APT + rueScore * W_RUE + compatScore * W_CMP)));

  // ── Ronde 21 (3/3) : Nombre karmique sur le numéro de rue ──
  // Pour une adresse, c'est le numéro LUI-MÊME qui est karmique (13 rue X, 14 rue Y, etc.)
  // Pas la somme de ses chiffres — c'est différent du module Numéro.
  if (numero) {
    const numVal = parseInt(numero);
    const addrKarmic = checkKarmicNumber(numVal);
    if (addrKarmic) {
      const kInfo = getKarmicDebt(addrKarmic, 'adresse');
      breakdown.push({ label: kInfo.label, value: `N° ${numero}${suffixLabel}`, pts: 0 });
      alerts.push(kInfo.texte);
    }
  }

  // ── Ronde 23 : Maître Nombre sur l'adresse ──
  if (numReduced.m) {
    const masterInfo = getMasterNarrative(numReduced.v, 'adresse');
    if (masterInfo) signals.push(`${masterInfo.label} — ${masterInfo.texte}`);
  }

  // ── Ronde 21 (3/3) : Feng Shui — 5 éléments ──
  // En Feng Shui, c'est le numéro de rue RÉDUIT (pas la combinaison rue+nom) qui détermine l'élément
  const fsNum = numero ? (numReduced.v > 9 ? reduce(numReduced.v).v : numReduced.v) : adresseSimple;
  const fsInfo = FENG_SHUI_ELEMENTS[fsNum];
  if (fsInfo) {
    breakdown.push({ label: `Feng Shui : ${fsInfo.emoji} ${fsInfo.element}`, value: fsInfo.desc, pts: 0 });
    signals.push(`${fsInfo.emoji} ${fsInfo.element} — ${fsInfo.texte}`);
  }

  // ── Ronde 19 (3/3 unanime) : signaux intermédiaires 5 niveaux ──
  // Inclut le sens du numéro réduit de l'adresse et la compatibilité CdV
  const numLabel = numero ? ADDRESS_NUMBERS[numReduced.v]?.label || '' : '';
  const numSens = numLabel ? numLabel.split('—')[0].trim() : '';
  if (domainScore <= 35) {
    signals.push(`Vibration délicate pour ton profil — ${numSens ? `énergie de ${numSens.toLowerCase()}, ` : ''}la résonance avec ton Chemin de Vie ${userCdv} invite à la prudence`);
  } else if (domainScore <= 50) {
    signals.push(`Énergie contrastée pour ton Chemin de Vie ${userCdv} — ${numSens ? `lieu de ${numSens.toLowerCase()}, ` : ''}certains aspects résonnent bien avec ton profil, d'autres moins`);
  } else if (domainScore <= 65) {
    signals.push(`Vibration équilibrée pour ton Chemin de Vie ${userCdv} — ${numSens ? `énergie de ${numSens.toLowerCase()}, ` : ''}l'adresse s'adapte à tes choix sans forcer ni freiner`);
  } else if (domainScore <= 80) {
    signals.push(`Bonne résonance avec ton profil — ${numSens ? `lieu de ${numSens.toLowerCase()}, ` : ''}les vibrations de cette adresse soutiennent ton Chemin de Vie ${userCdv}`);
  } else {
    signals.push(`Adresse très harmonieuse — ${numSens ? `énergie de ${numSens.toLowerCase()}, ` : ''}excellente résonance avec ton Chemin de Vie ${userCdv}`);
  }

  return { domainScore, breakdown, signals, alerts };
}

/**
 * D) Numéro (téléphone/SIRET) — réduction + patterns + tradition chinoise.
 *    Ronde 20 (3/3) : domaine d'activité optionnel — modifie l'interprétation de la réduction.
 */
function calcOracleNumero(numStr: string, domain: OracleDomain = 'generaliste'): { domainScore: number; breakdown: { label: string; value: string; pts: number }[]; signals: string[]; alerts: string[] } {
  const signals: string[] = [];
  const alerts: string[] = [];
  const breakdown: { label: string; value: string; pts: number }[] = [];

  const analysis = analyzeNumber(numStr);

  // Réduction numérologique
  const redV = analysis.reduction.v;
  const bizInfo = NUMBER_SCORES[redV] || { pts: 5, label: 'Neutre' };

  if (isMaster(redV)) {
    const masterInfo = getMasterNarrative(redV, 'numero');
    signals.push(masterInfo ? `${masterInfo.label} — ${masterInfo.texte}` : `Nombre Maître ${redV} — vibration puissante`);
  }

  // Patterns — Ronde 11 (Grok) : cap à 15
  // Ronde 19 : amortir les séquences pour les numéros longs (>6 chiffres)
  // Les suites ascendantes (1234, 5678) sont banales dans un numéro de téléphone
  // mais les répétitions (8888) et miroirs restent remarquables quelle que soit la longueur
  const digits = numStr.replace(/[^0-9]/g, '');
  const seqDamp = digits.length > 6 ? 0.3 : 1.0;
  const patternScore = Math.min(15, analysis.repeats + analysis.mirrors + Math.round(analysis.sequences * seqDamp));
  // Séparer les détails patterns des détails chinois pour éviter les doublons
  const chineseChars = ['八', '四', '六', '九', '七', '二'];
  const isChinese = (d: string) => chineseChars.some(c => d.includes(c)) || d.includes('Yi Lu Fa');
  if (patternScore > 0) {
    analysis.details.filter(d => !isChinese(d)).forEach(d => signals.push(d));
  }

  // Tradition chinoise — Ronde 14 (3/3) : cap [-15,+25]
  const chineseNorm = Math.max(-15, Math.min(25, analysis.chineseBonus * 2));
  if (chineseNorm !== 0) {
    analysis.details.filter(d => isChinese(d)).forEach(d => {
      if (d.includes('Fortune') || d.includes('Fluidité') || d.includes('Longévité') || d.includes('Harmonie') || d.includes('Yi Lu Fa')) signals.push(d);
      else alerts.push(d);
    });
  }

  // ── Ronde 19 (3/3 unanime) : recalibration — normalisation [0,100] par composante ──
  // Objectif : numéro banal → 40-55%, remarquable → 80%+, plancher 28, plafond 95
  // Pondération : réduction 50% + patterns 25% + chinois 25%
  // Ronde 20 (3/3) : si domaine ≠ generaliste, utiliser NUMBER_DOMAIN_SCORES
  const domainScores = NUMBER_DOMAIN_SCORES[redV] || NUMBER_DOMAIN_SCORES[redV > 9 ? reduce(redV).v : redV];
  const redNorm = domain !== 'generaliste' && domainScores
    ? domainScores[domain] * 10                              // [40, 100] — via matrice domaine
    : bizInfo.pts * 10;                                      // [50, 100] — généraliste (Ronde 19)
  const patNorm = (patternScore / 15) * 100;                 // [0, 100]
  const chiNorm = ((chineseNorm + 15) / 40) * 100;           // [0, 100] — 0 = neutre à ~37.5

  const blend = redNorm * 0.50 + patNorm * 0.25 + chiNorm * 0.25;
  const domainScore = Math.max(28, Math.min(95, Math.round(blend)));

  // Breakdown avec contributions pondérées
  const redContrib = Math.round(redNorm * 0.50);
  const patContrib = Math.round(patNorm * 0.25);
  const chiContrib = Math.round(chiNorm * 0.25);

  // Ronde 20 : afficher le domaine dans le breakdown si sélectionné
  // Explication de la réduction : somme des chiffres → réduction
  const digitSum = digits.split('').reduce((s, d) => s + parseInt(d), 0);
  const reductionExplain = `Somme des chiffres = ${digitSum} → réduit à ${redV}`;
  const domainInfo = domain !== 'generaliste' ? ORACLE_DOMAINS.find(d => d.id === domain) : null;
  const domainLabel = domainInfo ? domainInfo.label : 'Généraliste';
  const domainNote = domainScores ? domainScores[domain] : bizInfo.pts;
  if (domain !== 'generaliste') {
    // Description adaptée au domaine sélectionné (évite "peu commercial — 10/10")
    const domainDesc = NUMBER_DOMAIN_LABELS[redV]?.[domain] || bizInfo.label;
    breakdown.push({ label: `Réduction → ${redV} (${domainLabel})`, value: `${reductionExplain}. ${domainDesc} — ${domainNote}/10`, pts: redContrib });
    // Feedback dynamique domaine (Ronde 20)
    if (domainNote >= 8) signals.push(`La vibration du ${redV} est excellente pour le secteur ${domainLabel}`);
    else if (domainNote <= 4) alerts.push(`La vibration du ${redV} est en décalage avec le secteur ${domainLabel} — énergie peu adaptée`);
  } else {
    breakdown.push({ label: `Réduction → ${redV}`, value: `${reductionExplain}. ${bizInfo.label}`, pts: redContrib });
  }
  if (patternScore > 0) {
    // Détailler les composantes du pattern score
    const patParts: string[] = [];
    if (analysis.repeats > 0) patParts.push(`répétitions ${analysis.repeats}`);
    if (analysis.mirrors > 0) patParts.push(`miroir ${analysis.mirrors}`);
    if (analysis.sequences > 0) patParts.push(`suites ${analysis.sequences}${seqDamp < 1 ? ' (amorties ×' + seqDamp + ')' : ''}`);
    const patExplain = patParts.length > 0 ? patParts.join(' + ') + ' → ' : '';
    breakdown.push({ label: 'Patterns', value: `${patExplain}${patternScore}/15`, pts: patContrib });
  }
  if (chineseNorm !== 0) {
    // Détailler quels chiffres contribuent au score chinois
    const chiDetails: string[] = [];
    const digitCounts: Record<number, number> = {};
    for (const d of digits) {
      const n = parseInt(d);
      digitCounts[n] = (digitCounts[n] || 0) + 1;
    }
    for (const [digit, count] of Object.entries(digitCounts)) {
      const d = parseInt(digit);
      const info = CHINESE_DIGIT_BONUS[d];
      if (info && info.pts !== 0) {
        const sign = info.pts > 0 ? '+' : '';
        chiDetails.push(`${d}×${count} (${sign}${info.pts * count})`);
      }
    }
    if (digits.includes('168')) chiDetails.push('168 (+10)');
    const chiExplain = chiDetails.length > 0 ? chiDetails.join(', ') : '';
    breakdown.push({ label: 'Tradition chinoise', value: `${chiExplain} = ${chineseNorm > 0 ? '+' : ''}${chineseNorm}`, pts: chiContrib });
  }

  // ── Ronde 21 (3/3) : Nombre karmique sur la réduction du numéro ──
  const numKarmic = checkKarmicNumber(analysis.rawSum);
  if (numKarmic) {
    const kInfo = getKarmicDebt(numKarmic, 'numero');
    breakdown.push({ label: kInfo.label, value: `Somme des chiffres = ${analysis.rawSum}`, pts: 0 });
    alerts.push(kInfo.texte);
  }

  return { domainScore, breakdown, signals, alerts };
}

/**
 * E) Sujet — le domainScore vient directement du score quotidien dans le domaine pertinent.
 * Le caller doit fournir le score du domaine correspondant.
 */
function calcOracleSujet(sujet: OracleSujet, domainScoreFromConvergence: number, userCdv?: number, userBirthDay?: number, userBirthMonth?: number): { domainScore: number; breakdown: { label: string; value: string; pts: number }[]; signals: string[]; alerts: string[] } {
  const signals: string[] = [];
  const alerts: string[] = [];
  const breakdown: { label: string; value: string; pts: number }[] = [];

  const info = SUJETS[sujet];

  // Score convergence = le cœur du module Sujet (timing astrologique + numérologique)
  breakdown.push({ label: `${info.icon} ${info.label}`, value: `Score domaine ${info.dominantDomain}`, pts: domainScoreFromConvergence });

  // Enrichissement : Année Personnelle + Jour Personnel du jour → contexte cyclique
  if (userBirthDay && userBirthMonth && userCdv) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const anneePerso = reduce(userBirthDay + userBirthMonth + year);
    const moisPerso = reduce(anneePerso.v + month);
    const jourPerso = reduce(moisPerso.v + day);

    const AP_DESC: Record<number, string> = {
      1: 'Année de nouveaux départs', 2: 'Année de patience et diplomatie',
      3: 'Année d\'expression créative', 4: 'Année de construction',
      5: 'Année de changement', 6: 'Année de responsabilité familiale',
      7: 'Année d\'introspection', 8: 'Année de récolte et pouvoir',
      9: 'Année de bilan et lâcher-prise',
      11: 'Année d\'illumination', 22: 'Année de grands projets', 33: 'Année de service',
    };
    breakdown.push({ label: `Année personnelle : ${anneePerso.v}`, value: AP_DESC[anneePerso.v] || 'Cycle en cours', pts: 0 });
    breakdown.push({ label: `Jour personnel : ${jourPerso.v}`, value: `MP${moisPerso.v} → JP${jourPerso.v}`, pts: 0 });

    // Signaux d'alignement année perso × sujet
    const AP_SUJET_BOOST: Record<OracleSujet, number[]> = {
      projet: [1, 8, 22],
      sentiments: [2, 6, 33],
      partenariat: [2, 6, 11],
      investissement: [4, 8, 22],
      voyage: [5, 9],
      presentation: [3, 5, 11],
      changement: [5, 9, 1],
    };
    if (AP_SUJET_BOOST[sujet]?.includes(anneePerso.v)) {
      signals.push(`Ton Année Personnelle ${anneePerso.v} (${AP_DESC[anneePerso.v]}) est favorable pour ${info.label.toLowerCase()}`);
    }
  }

  if (domainScoreFromConvergence >= 75) signals.push(`${info.icon} ${info.label} — domaine ${info.dominantDomain} en zone haute`);
  else if (domainScoreFromConvergence < 40) alerts.push(`${info.icon} ${info.label} — domaine ${info.dominantDomain} sous tension`);

  return { domainScore: domainScoreFromConvergence, breakdown, signals, alerts };
}

// ══════════════════════════════════════

// ══════════════════════════════════════
// ═══ E) PRÉNOM BÉBÉ ═══
// ══════════════════════════════════════

// Table harmonie de vie — différente de BUSINESS_NUMBERS
// Axée sur l'épanouissement, le caractère, la résonance familiale
// V4.4b — harmonies auditées par Grok (tradition pythagoricienne pour enfant)
const BABY_NUMBERS: Record<number, { harmony: number; label: string; traits: string }> = {
  1:  { harmony: 6, label: 'Indépendance',    traits: `Confiance en soi, leadership naturel — peut créer de l'isolement si mal accompagné` },
  2:  { harmony: 9, label: 'Harmonie',         traits: `Sensibilité, empathie, coopération — un des plus épanouissants pour un enfant` },
  3:  { harmony: 9, label: 'Expression',       traits: `Créativité, joie de vivre, communication naturelle — très épanouissant` },
  4:  { harmony: 7, label: 'Stabilité',        traits: `Méthode, persévérance, structure rassurante — peut être anxiogène sans accompagnement` },
  5:  { harmony: 8, label: 'Liberté',          traits: `Curiosité, adaptabilité, soif de découverte — très bon pour un enfant` },
  6:  { harmony: 9, label: 'Amour',            traits: `Sens de la famille, générosité, attachement profond — le plus harmonieux pour un enfant` },
  7:  { harmony: 6, label: 'Sagesse',          traits: `Intuition, intériorité, don pour la réflexion — risque de retrait émotionnel` },
  8:  { harmony: 5, label: 'Puissance',        traits: `Volonté forte, leçons de karma précoces — le plus lourd à porter pour un enfant` },
  9:  { harmony: 8, label: 'Idéalisme',        traits: `Compassion, générosité, vision universelle — très beau pour un enfant` },
  11: { harmony: 8, label: 'Intuition Maître', traits: `Sensibilité extrême, don artistique — attention aux surcharges émotionnelles` },
  22: { harmony: 7, label: 'Bâtisseur Maître', traits: `Potentiel immense, mais charge lourde — peut être écrasant pour un jeune enfant` },
  33: { harmony: 9, label: 'Guérisseur Maître', traits: `Amour universel, vocation de service — le plus élevé, idéal pour un enfant` },
};

// V4.4b — Matrice CdV parent × Nombre bébé (auditée par Grok, inclut Maîtres 11/22/33)
// Index: BABY_COMPAT[parentCdv][babyNum]
const BABY_COMPAT: Record<number, Record<number, number>> = {
  1:  {1:6, 2:8, 3:9, 4:6, 5:8, 6:7, 7:5, 8:6, 9:8, 11:7, 22:6, 33:8},
  2:  {1:8, 2:8, 3:8, 4:7, 5:6, 6:9, 7:7, 8:6, 9:8, 11:8, 22:7, 33:9},
  3:  {1:9, 2:8, 3:8, 4:5, 5:9, 6:8, 7:6, 8:7, 9:9, 11:8, 22:7, 33:9},
  4:  {1:6, 2:7, 3:5, 4:7, 5:5, 6:8, 7:7, 8:9, 9:5, 11:6, 22:8, 33:6},
  5:  {1:8, 2:6, 3:9, 4:5, 5:7, 6:6, 7:8, 8:6, 9:8, 11:7, 22:6, 33:7},
  6:  {1:7, 2:9, 3:8, 4:8, 5:6, 6:9, 7:5, 8:6, 9:9, 11:8, 22:7, 33:9},
  7:  {1:5, 2:7, 3:6, 4:7, 5:8, 6:5, 7:8, 8:5, 9:6, 11:9, 22:7, 33:8},
  8:  {1:6, 2:6, 3:7, 4:9, 5:6, 6:6, 7:5, 8:5, 9:7, 11:6, 22:9, 33:6},
  9:  {1:8, 2:8, 3:9, 4:5, 5:8, 6:9, 7:6, 8:7, 9:8, 11:8, 22:7, 33:9},
  11: {1:7, 2:8, 3:8, 4:6, 5:7, 6:8, 7:9, 8:6, 9:8, 11:8, 22:7, 33:9},
  22: {1:6, 2:7, 3:7, 4:8, 5:6, 6:7, 7:7, 8:9, 9:7, 11:7, 22:8, 33:7},
  33: {1:8, 2:9, 3:9, 4:6, 5:7, 6:9, 7:8, 8:6, 9:9, 11:9, 22:7, 33:9},
};

function getBabyParentCompat(babyNum: number, parentCdv: number): number {
  const row = BABY_COMPAT[parentCdv] ?? BABY_COMPAT[9];
  return row[babyNum] ?? 6;
}

/**
 * E) Prénom bébé — harmonie de vie + résonance parentale.
 * Pas de dimension business. Pas de hard cap Mercure.
 */
function calcOracleBebe(prenom: string, userCdv: number, parent2Cdv?: number): { domainScore: number; breakdown: { label: string; value: string; pts: number }[]; signals: string[]; alerts: string[] } {
  // Ronde 10 : guard prénom vide
  if (!prenom || normalizeStr(prenom).length === 0) {
    return { domainScore: 0, breakdown: [], signals: [], alerts: ['⚠️ Aucun prénom saisi — la numérologie ne peut pas s\'appliquer.'] };
  }

  const signals: string[] = [];
  const alerts: string[] = [];
  const breakdown: { label: string; value: string; pts: number }[] = [];

  const nums = calcNameNumbers(prenom);
  const exprV = nums.expression.v;
  const ameV = nums.ame.v;
  const imageV = nums.image.v;

  // Ronde 18 (3/3 unanime) : wording accessible pour les parents
  const babyInfo = BABY_NUMBERS[exprV] || { harmony: 6, label: 'Neutre', traits: `Énergie équilibrée` };
  const harmonyPts = babyInfo.harmony * 10; // Scale 0-90 (audit consensus V4.5)
  breakdown.push({ label: `Vibration du prénom : ${exprV}`, value: babyInfo.label, pts: harmonyPts });
  breakdown.push({ label: `Élan du cœur (Âme) : ${ameV}${nums.ame.m ? ' Maître' : ''}`, value: AME_DESC[ameV] || 'Motivation profonde', pts: 0 });
  breakdown.push({ label: `Image perçue : ${imageV}${nums.image.m ? ' Maître' : ''}`, value: IMAGE_DESC[imageV] || 'Apparence extérieure', pts: 0 });

  // Traits de caractère
  signals.push(`${babyInfo.traits}`);

  // Harmonie avec CdV parent(s)
  // Ronde 9 (3/3) : ne PAS réduire le CdV parent — un 11 ≠ un 2 en dynamique parentale
  // Ronde 16 (3/3) : bi-parental optionnel — moyenne arithmétique si 2 parents
  const compat1 = getBabyParentCompat(exprV, userCdv);
  let compatScore: number;
  if (parent2Cdv != null && parent2Cdv > 0) {
    const compat2 = getBabyParentCompat(exprV, parent2Cdv);
    compatScore = (compat1 + compat2) / 2;
    breakdown.push({ label: `Résonance parent 1 (Chemin de Vie ${userCdv})`, value: `${compat1}/10`, pts: 0 });
    breakdown.push({ label: `Résonance parent 2 (Chemin de Vie ${parent2Cdv})`, value: `${compat2}/10`, pts: 0 });
  } else {
    compatScore = compat1;
  }
  const compatPts = Math.round(compatScore * 3); // Scale 0-30 — Ronde 9 (×3)
  // Ronde 18 : "Résonance parentale" au lieu de "Résonance avec CdV X (parent)"
  breakdown.push({ label: parent2Cdv ? 'Résonance parentale' : `Résonance parentale (Chemin de Vie ${userCdv})`, value: `${Math.round(compatScore * 10) / 10}/10`, pts: compatPts });

  if (compatScore >= 8) signals.push(`Très bonne résonance entre "${prenom}" et ${parent2Cdv ? 'votre' : 'ton'} énergie parentale — lien naturel et fluide`);
  else if (compatScore <= 4) alerts.push(`Légère friction avec ${parent2Cdv ? 'vos profils' : `ton Chemin de Vie ${userCdv}`} — l\'enfant suivra son propre chemin avec force`);

  // Bonus nombre Maître
  let masterBonus = 0;
  if (nums.expression.m) {
    masterBonus = 8;
    const masterInfo = getMasterNarrative(exprV, 'bebe');
    signals.push(masterInfo ? `${masterInfo.label} — ${masterInfo.texte}` : `Nombre Maître ${exprV} — destin exceptionnel, sensibilité et charge élevées`);
  }

  // Âme = 2 ou 6 → bonus affectif (enfant très attaché à la famille)
  if (ameV === 2 || ameV === 6) {
    signals.push(`Âme ${ameV} — enfant profondément attaché, besoin de sécurité affective fort`);
  }
  // Image = 1 ou 8 → enfant qui s'affirme tôt
  if (imageV === 1 || imageV === 8) {
    signals.push(`Image ${imageV} — caractère affirmé, besoin d'autonomie précoce`);
  }

  // Ronde 16 (3/3 unanime) : soulBonus via BABY_COMPAT (pas la matrice générique)
  // Maîtres Nombres préservés pour Âme ET CdV parent (pas de réduction)
  // Bi-parental gradué : +3 si un parent résonne, +5 si les deux
  let soulBonus = 0;
  const soulCompat1 = getBabyParentCompat(ameV, userCdv);
  if (parent2Cdv != null && parent2Cdv > 0) {
    const soulCompat2 = getBabyParentCompat(ameV, parent2Cdv);
    if (soulCompat1 >= 8 && soulCompat2 >= 8) {
      soulBonus = 5;
      signals.push(`Âme du prénom (${ameV}) en forte résonance avec vos deux Chemins de Vie — lien affectif profond des deux côtés`);
    } else if (soulCompat1 >= 8 || soulCompat2 >= 8) {
      soulBonus = 3;
      const resonantParent = soulCompat1 >= 8 ? `Chemin de Vie ${userCdv}` : `Chemin de Vie ${parent2Cdv}`;
      signals.push(`Âme du prénom (${ameV}) en résonance avec ${resonantParent} — lien affectif avec un parent`);
    }
  } else {
    if (soulCompat1 >= 8) {
      soulBonus = 5;
      signals.push(`Âme du prénom (${ameV}) en forte résonance avec ton Chemin de Vie ${userCdv} — lien affectif profond`);
    }
  }

  // ── Ronde 21 (3/3) : Nombres Karmiques 13/14/16/19 ──
  const bebeExprKarmic = checkKarmicNumber(nums.rawSums.expr);
  const bebeAmeKarmic = checkKarmicNumber(nums.rawSums.ame);
  if (bebeExprKarmic) {
    const kInfo = getKarmicDebt(bebeExprKarmic, 'bebe');
    breakdown.push({ label: `${kInfo.label}`, value: `Vibration du prénom : somme ${nums.rawSums.expr} → ${exprV}`, pts: 0 });
    alerts.push(kInfo.texte);
  }
  if (bebeAmeKarmic) {
    const kInfo = getKarmicDebt(bebeAmeKarmic, 'bebe');
    breakdown.push({ label: `${kInfo.label}`, value: `Élan du cœur (voyelles) : somme ${nums.rawSums.ame} → ${ameV}`, pts: 0 });
    alerts.push(kInfo.texte);
  }

  // ── Ronde 21+23 : Leçons Karmiques (lettres manquantes) — narratifs bébé ──
  const bebeLessons = findKarmicLessons(prenom);
  if (bebeLessons.length > 0 && bebeLessons.length <= 4) {
    const lessonDetails = bebeLessons.map(n => { const l = getKarmicLesson(n, 'bebe'); return `${n} (${l.label.split(' — ')[1] || l.label})`; }).join(', ');
    breakdown.push({ label: 'Leçons karmiques (lettres manquantes)', value: lessonDetails, pts: 0 });
    bebeLessons.forEach(n => { const l = getKarmicLesson(n, 'bebe'); alerts.push(l.texte); });
  }

  // Ronde 16 (3/3 unanime) : normalisation /128 = max théorique SANS soulBonus (90+30+8=128)
  // Le soulBonus (+3 ou +5) est un BONUS qui peut pousser au-delà → clamp absorbe
  const rawBebeScore = harmonyPts + compatPts + masterBonus + soulBonus;
  const domainScore = Math.max(0, Math.min(100, Math.round(rawBebeScore / 128 * 100)));
  return { domainScore, breakdown, signals, alerts };
}

// ═══ MAIN — calcOracle() ═══
// ══════════════════════════════════════

export interface CalcOracleParams {
  type: OracleType;
  input: string;                      // Le texte/nombre/adresse à tester
  sujet?: OracleSujet;                // Pour type 'sujet' ou pour le hard cap Mercure
  domain?: OracleDomain;              // Domaine d'activité pour Nom/Marque (Ronde 13bis)
  dailyScore: number;                 // Score quotidien SoulPrint (0-100)
  userCdv?: number;                   // Chemin de Vie de l'utilisateur (pour noms)
  domainScoreFromConvergence?: number; // Score du domaine pertinent (pour type 'sujet')
  targetDate?: string;                // Pour type 'date' (YYYY-MM-DD)
  userBirthDay?: number;              // Jour de naissance (1-31) — Ronde 10 : Année Perso classique
  userBirthMonth?: number;            // Mois de naissance (1-12) — Ronde 10 : Année Perso classique
  parent2Cdv?: number;                // Ronde 16 (3/3) : CdV optionnel du second parent (module bébé)
  appart?: string;                    // Ronde 17 : n° appart/étage optionnel (module adresse, Decoz)
}

export function calcOracle(params: CalcOracleParams): OracleResult {
  const { type, input, sujet = null, domain = 'generaliste', dailyScore, userCdv = 5, domainScoreFromConvergence = 50, targetDate, userBirthDay = 1, userBirthMonth = 1, parent2Cdv, appart } = params;

  let result: { domainScore: number; breakdown: { label: string; value: string; pts: number }[]; signals: string[]; alerts: string[] };

  switch (type) {
    case 'date':
      result = calcOracleDate(targetDate || input, dailyScore, userCdv, userBirthDay, userBirthMonth);
      break;
    case 'nom':
      result = calcOracleNom(input, userCdv, domain);
      break;
    case 'adresse':
      result = calcOracleAdresse(input, userCdv, appart);
      break;
    case 'numero':
      result = calcOracleNumero(input, domain);
      break;
    case 'sujet':
      result = calcOracleSujet(sujet || 'projet', domainScoreFromConvergence, userCdv, userBirthDay, userBirthMonth);
      break;
    case 'bebe':
      result = calcOracleBebe(input, userCdv, parent2Cdv);
      break;
    default:
      result = { domainScore: 50, breakdown: [], signals: [], alerts: [] };
  }

  // ── Score Oracle — Ronde 14+14bis (3/3 unanime) ──
  // Types PERMANENTS (bébé, date, nom, adresse, numéro) = 100% intrinsèque
  //   → un nom/adresse/numéro ne change pas d'un jour à l'autre
  // Type TIMING (sujet) = 100% domainScoreFromConvergence (pas de blend daily — double-comptage)
  const permanentTypes: OracleType[] = ['bebe', 'date', 'nom', 'adresse', 'numero'];
  let oracleScore = (permanentTypes.includes(type) || type === 'sujet')
    ? result.domainScore
    : Math.round(dailyScore * 0.25 + result.domainScore * 0.75);

  // ── Ronde 9 (3/3) : Mercure Rétro — malus graduel par catégorie (remplace cap dur 71) ──
  let mercuryCapped = false;
  let mercuryMalus = 0;
  let mercuryNarrative = '';
  const now = new Date();
  const mercRetro = isMercuryRetrograde(now);
  const effectiveSujet = (type === 'bebe') ? null : (sujet || (type === 'nom' ? 'projet' : null));
  if (mercRetro && effectiveSujet) {
    const sujetInfo = SUJETS[effectiveSujet as OracleSujet];
    if (sujetInfo?.mercurySensitive) {
      // Malus graduel par catégorie — Ronde 9ter consensus
      const MR_MALUS: Record<string, number> = {
        projet: 12, partenariat: 12, investissement: 10,
        voyage: 10, changement: 6, presentation: 6,
      };
      mercuryMalus = MR_MALUS[effectiveSujet] ?? 8;
      oracleScore = Math.max(0, oracleScore - mercuryMalus);
      mercuryCapped = true;
      // Ronde 23 : narratif stocké dans champ dédié (l'UI le rend sous le badge, pas dans alerts)
      mercuryNarrative = MERCURY_RETRO_NARRATIVES[effectiveSujet] || MERCURY_RETRO_INTRO;
    }
  }

  oracleScore = Math.max(0, Math.min(100, oracleScore));

  // ── Verdict ──
  // Ronde 10 (3/3) : seuils standards pour tous les types (≥75 Feu Vert, ≥48 Prudence)
  // Le mapping forcé bébé (≥82→80, ≥60→60, <60→30) détruisait la nuance du score brut
  let verdict = getVerdict(oracleScore, type === 'bebe' ? null : effectiveSujet as OracleSujet | null);

  // Verdicts spécifiques bébé — remplace les verdicts génériques
  if (type === 'bebe') {
    const BABY_VERDICT_MAP: Record<OracleVerdict, Omit<OracleVerdictInfo, 'verdict'>> = {
      feu_vert:       { icon: '🌟', label: 'Prénom harmonieux', color: '#4ade80', texte: `Ce prénom résonne avec fluidité avec ton énergie parentale. L'enfant portera ce nom avec aisance naturelle.` },
      prudence:       { icon: '✨', label: 'Prénom équilibré',  color: '#f59e0b', texte: `Ce prénom apporte une énergie neutre et solide. Bon choix si tu l\'aimes — le cœur prime toujours.` },
      pas_maintenant: { icon: '⚡', label: 'Prénom en tension', color: '#a78bfa', texte: `Ce prénom crée une légère friction énergétique. L'enfant construira sa propre voie avec détermination.` },
    };
    verdict = { verdict: verdict.verdict, ...BABY_VERDICT_MAP[verdict.verdict] };
  }

  // Ronde 19 : verdicts adaptés aux types intrinsèques (pas de langage temporel)
  // Un numéro, un nom, une adresse ou une date n'ont pas de "bon moment" — leur vibration est fixe
  if (['nom', 'adresse', 'numero', 'date'].includes(type)) {
    const INTRINSIC_VERDICT_MAP: Record<OracleVerdict, Omit<OracleVerdictInfo, 'verdict'>> = {
      feu_vert:       { icon: '✅', label: 'Vibration favorable',  color: '#4ade80', texte: `Excellente résonance avec ton profil. Cette vibration soutient tes objectifs avec fluidité.` },
      prudence:       { icon: '⚠️', label: 'Vibration neutre',     color: '#f59e0b', texte: `Résonance modérée avec ton profil. Ni un frein ni un moteur — l'énergie est correcte sans être exceptionnelle.` },
      pas_maintenant: { icon: '🔻', label: 'Vibration délicate',   color: '#a78bfa', texte: `Faible résonance avec ton profil. Cette vibration ne soutient pas naturellement tes objectifs — ce n'est pas un blocage, mais un manque de synergie.` },
    };
    verdict = { verdict: verdict.verdict, ...INTRINSIC_VERDICT_MAP[verdict.verdict] };
  }

  // ── Verdict intrinsèque (découplé du timing) ──
  // Permet à l'utilisateur de savoir si l'input (nom, date, adresse) est bon pour LUI
  // indépendamment du score du jour et de Mercure Rétro
  const ds = result.domainScore;
  const intrinsicVerdict = ds >= 70
    ? { label: 'Bonne compatibilité', color: '#4ade80', icon: '✦' }
    : ds >= 45
    ? { label: 'Compatibilité neutre', color: '#f59e0b', icon: '◆' }
    : { label: 'Compatibilité faible', color: '#a78bfa', icon: '◇' };

  // ── Meilleures dates : uniquement pour Sujet (le seul type dépendant du timing) ──
  // Nom/Adresse/Numéro/Bébé/Date sont 100% intrinsèques → pas de "meilleur moment"
  let bestDates: { date: string; label: string; estimatedScore: number; vibLabel: string; jourPerso: number; mercury: boolean; dailyScore: number }[] = [];
  if (type === 'sujet' && result.domainScore > 0) {
    bestDates = findBestDates(result.domainScore, userCdv, userBirthDay, userBirthMonth, effectiveSujet as OracleSujet | null);
  }

  return {
    type, input,
    sujet: effectiveSujet as OracleSujet | null,
    domain: (type === 'nom' || type === 'numero') ? domain : null,
    domainScore: result.domainScore,
    dailyScore, oracleScore,
    mercuryCapped,
    mercuryMalus,
    mercuryNarrative,
    verdict,
    intrinsicVerdict,
    bestDates,
    breakdown: result.breakdown,
    signals: result.signals,
    alerts: result.alerts,
  };
}

// ══════════════════════════════════════
// ═══ MEILLEURES DATES À VENIR ═══
// ══════════════════════════════════════

/**
 * Scanne les 60 prochains jours et retourne les 3 avec le meilleur score Oracle estimé.
 * Utilise la vibration numérologique du jour comme proxy du dailyScore (léger, pas de calcul astro).
 * Le domainScore du nom est fixe — seul le timing change.
 */
function findBestDates(
  domainScore: number, userCdv: number, userBirthDay: number, userBirthMonth: number,
  sujet: OracleSujet | null
): { date: string; label: string; estimatedScore: number; vibLabel: string; jourPerso: number; mercury: boolean; dailyScore: number }[] {
  const today = new Date();
  const candidates: {
    date: string; label: string; estimatedScore: number; vibLabel: string;
    jourPerso: number; mercury: boolean; dailyScore: number;
    vibNum: number; preciseScore: number;
  }[] = [];

  for (let i = 1; i <= 60; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // Vibration numérologique du jour → proxy du score quotidien
    const vibDate = reduce(day + month + year);
    const vibInfo = DATE_VIBRATION_QUALITY[vibDate.v] || { pts: 5, label: 'Neutre' };
    const vibScore = vibInfo.pts * 10; // 0-100

    // Compatibilité vibration × CdV
    const vibSimple = vibDate.v > 9 ? reduce(vibDate.v).v : vibDate.v;
    const cdvSimple = userCdv > 9 ? reduce(userCdv).v : userCdv;
    const compatRaw = getNameCdvCompat(vibSimple, cdvSimple);

    // Jour Personnel
    const anneePerso = reduce(userBirthDay + userBirthMonth + year);
    const moisPerso = reduce(anneePerso.v + month);
    const jourPerso = reduce(moisPerso.v + day);
    const jourPersoSimple = jourPerso.v > 9 ? reduce(jourPerso.v).v : jourPerso.v;
    const cycleCompat = getNameCdvCompat(jourPersoSimple, vibSimple);

    // Score quotidien estimé (pas d'arrondi — garder la précision pour le tri)
    const estimatedDaily = 0.40 * vibScore + 0.30 * (compatRaw * 10) + 0.30 * (cycleCompat * 10);

    // Score = estimatedDaily pur (le domainScore est fixe et n'intervient pas dans le choix de date)
    // Ronde 14 : les types permanents sont 100% intrinsèques → c'est le TIMING qu'on optimise
    let preciseScore = estimatedDaily;

    // Appliquer malus Mercury si applicable
    const mercRetro = isMercuryRetrograde(d);
    let hasMercury = false;
    if (mercRetro && sujet) {
      const sujetInfo = SUJETS[sujet];
      if (sujetInfo?.mercurySensitive) {
        const MR_MALUS: Record<string, number> = { projet: 12, partenariat: 12, investissement: 10, voyage: 10, changement: 6, presentation: 6 };
        preciseScore = Math.max(0, preciseScore - (MR_MALUS[sujet] ?? 8));
        hasMercury = true;
      }
    }

    // Formater le label
    const jours = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const moisNoms = ['', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    const label = `${jours[d.getDay()]} ${day} ${moisNoms[month]}`;

    candidates.push({
      date: dateStr, label,
      estimatedScore: Math.round(preciseScore),
      preciseScore,
      vibLabel: `Vib. ${vibDate.v}${vibDate.m ? ' Maître' : ''} — ${vibInfo.label}`,
      vibNum: vibDate.v,
      jourPerso: jourPerso.v,
      mercury: hasMercury,
      dailyScore: Math.round(estimatedDaily),
    });
  }

  // Tri principal : score précis (sans arrondi), secondaire : score quotidien pur (favorise les jours intrinsèquement forts)
  candidates.sort((a, b) => b.preciseScore - a.preciseScore || b.dailyScore - a.dailyScore);

  // ── Diversification : éviter 3 dates avec la même vibration ──
  // Sélectionner la meilleure, puis tenter d'inclure au moins 1 vibration différente
  const selected: typeof candidates = [];
  const vibsSeen = new Set<number>();

  // Pass 1 : les meilleurs scores, en favorisant la diversité de vibration
  for (const c of candidates) {
    if (selected.length >= 3) break;
    if (selected.length < 2) {
      // Les 2 premiers : prendre les meilleurs scores
      selected.push(c);
      vibsSeen.add(c.vibNum);
    } else {
      // Le 3ème : préférer une vibration différente si disponible dans le top 10
      if (!vibsSeen.has(c.vibNum)) {
        selected.push(c);
        vibsSeen.add(c.vibNum);
      }
    }
  }
  // Si on n'a pas trouvé de vibration différente dans le top, compléter avec le suivant
  if (selected.length < 3) {
    for (const c of candidates) {
      if (selected.length >= 3) break;
      if (!selected.includes(c)) {
        selected.push(c);
      }
    }
  }

  // Garder le tri par score décroissant (🥇 = meilleur score)
  selected.sort((a, b) => b.preciseScore - a.preciseScore || b.dailyScore - a.dailyScore);

  return selected.map(c => ({
    date: c.date, label: c.label, estimatedScore: c.estimatedScore,
    vibLabel: c.vibLabel, jourPerso: c.jourPerso, mercury: c.mercury, dailyScore: c.dailyScore,
  }));
}
