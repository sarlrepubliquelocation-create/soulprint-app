// ═══ I CHING ENGINE V3.0 ═══
// Deterministic hash-based hexagram — full 64 coverage over 365 days
// V4.9 Sprint A5 : @deprecated annotations — getHexTier().points, getMutantLineModifier(), nuclearHexScore()
//   Le scoring I Ching est désormais géré par ichingScoreV4() dans convergence.ts (Yao ±6 + Nuclear ±3)
//   + getActiveLineScore() et getNuclearScore() dans iching-yao.ts.
//   Ces fonctions restent disponibles pour rétrocompatibilité mais NE SONT PLUS utilisées dans le scoring.
// V2.9.1: Redistribution tiers (A:8,B:27,C:6,D:18,E:5) + Lignes mutantes 18 hex (audit Grok R3)
// V2.9: getHexTier() corrigé (audit Grok) — #43→A, #58→B, #19→D, #47→D
// V2.8: getHexTier() — scoring 5 tiers (A/B/C/D/E) au lieu de 3 catégories binaires
// V2.6: Yang bias ~68% (tradition ≈ 75%, avant = 50/50 uniforme). Audit Grok: "bias hash to 68% Yang"

import { calcPersonalDay } from './numerology';

// ── Trigrams ──
export const TRIGRAMS = [[1,1,1],[1,1,0],[1,0,1],[1,0,0],[0,1,1],[0,1,0],[0,0,1],[0,0,0]];
export const TRIGRAM_NAMES = ['Ciel','Lac','Feu','Tonnerre','Vent','Eau','Montagne','Terre'];

// King Wen sequence: KW[lower][upper] = hexagram number (1-64)
const KW = [
  [1,10,13,25,44,6,33,12],[43,58,49,17,28,47,31,45],
  [14,38,30,21,50,64,56,35],[34,54,55,51,32,40,62,16],
  [9,61,37,42,57,59,53,20],[5,60,63,3,48,29,39,8],
  [26,41,22,27,18,4,52,23],[11,19,36,24,46,7,15,2]
];

// ── djb2 hash (deterministic, excellent distribution) ──
function djb2(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Day of year (1-366)
function dayOfYear(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  const start = new Date(y, 0, 1);
  const current = new Date(y, m - 1, d);
  return Math.floor((current.getTime() - start.getTime()) / 86400000) + 1;
}

// ── Hexagram names (French) ──
const HEX_NAMES: Record<number, string> = {
  1:'Créateur',2:'Réceptif',3:'Difficulté initiale',4:'Folie juvénile',
  5:'Attente',6:'Conflit',7:'Armée',8:'Union',9:'Petit Apprivoisement',
  10:'Marche',11:'Paix',12:'Stagnation',13:'Communauté',14:'Grand Avoir',
  15:'Humilité',16:'Enthousiasme',17:'Suite',18:'Correction',19:'Approche',
  20:'Contemplation',21:'Mordre au travers',22:'Grâce',23:'Éclatement',
  24:'Retour',25:'Innocence',26:'Grand Apprivoisement',27:'Nourriture',
  28:'Grand Excès',29:'Insondable',30:'Feu',31:'Influence',32:'Durée',
  33:'Retraite',34:'Grande Force',35:'Progrès',36:'Obscurcissement',
  37:'Famille',38:'Opposition',39:'Obstacle',40:'Libération',
  41:'Diminution',42:'Augmentation',43:'Percée',44:'Rencontre',
  45:'Rassemblement',46:'Poussée vers le haut',47:'Accablement',48:'Puits',
  49:'Révolution',50:'Chaudron',51:'Ébranlement',52:'Immobilisation',
  53:'Développement',54:'Épousée',55:'Abondance',56:'Voyageur',
  57:'Le Doux',58:'Sérénité',59:'Dissolution',60:'Limitation',
  61:'Vérité intérieure',62:'Petite Traversée',63:'Après Accomplissement',
  64:'Avant Accomplissement'
};

// ── Keywords (imperative) ──
const HEX_KEYWORDS: Record<number, string> = {
  1:'Crée',2:'Accueille',3:'Persévérez',4:'Apprends',5:'Patiente',
  6:'Négociez',7:'Organisez',8:'Unissez-vous',9:'Discipline',10:'Avancez',
  11:'Harmonisez',12:'Attendez',13:'Rassemblez',14:'Partagez',15:'Soyez humble',
  16:'Inspirez',17:'Suivez le flux',18:'Corrigez',19:'Approche',20:'Observez',
  21:'Tranchez',22:'Embellissez',23:'Lâche prise',24:'Recommencez',25:'Sois pur',
  26:'Accumulez',27:'Nourrissez-vous',28:'Osez',29:'Plongez',30:'Éclairez',
  31:'Ressens',32:'Persiste',33:'Reculez',34:'Fonce',35:'Progresse',
  36:'Protégez-vous',37:'Réunissez',38:'Acceptez',39:'Contournez',40:'Libérez',
  41:'Sacrifiez',42:'Reçois',43:'Décidez',44:'Rencontre',45:'Rassemblez',
  46:'Montez',47:'Endurez',48:'Puise',49:'Transformez',50:'Cultive',
  51:'Secouez',52:'Arrêtez-vous',53:'Grandissez',54:'Adaptez-vous',55:'Rayonnez',
  56:'Explorez',57:'Pénétrez',58:'Réjouissez-vous',59:'Dissolvez',60:'Limitez',
  61:'Fais confiance',62:'Prudence',63:'Célèbre',64:'Préparez'
};

// ── Extended descriptions ──
const HEX_DESC: Record<number, string> = {
  1: "La force créatrice est à son apogée. Agis avec détermination et confiance.",
  2: "L'accueil et la réceptivité ouvrent les portes. Laisse venir à toi.",
  3: "Le commencement est difficile mais porteur. Persévère sans forcer.",
  5: "L'attente active porte ses fruits. La patience est votre force aujourd'hui.",
  6: "Le conflit demande diplomatie. Négociez plutôt que confronter.",
  8: "L'union fait la force. Cherche des alliances sincères.",
  11: "Le Ciel et la Terre s'harmonisent. Période de paix et prospérité.",
  12: "Stagnation temporaire. La patience sera récompensée.",
  13: "L'union avec d'autres crée la force. Cherche la communauté.",
  14: "L'abondance est là. Partage avec générosité pour la maintenir.",
  20: "Prends de la hauteur. L'observation attentive révèle la voie.",
  24: "Un nouveau cycle commence. Accueille le retour de l'énergie.",
  25: "L'innocence et la spontanéité sont vos alliées aujourd'hui.",
  29: "L'eau profonde — un passage délicat qui forge la sagesse.",
  30: "Le feu intérieur illumine. Laissez briller votre lumière.",
  31: "L'influence mutuelle crée des liens profonds. Ouvrez votre cœur.",
  33: "Le retrait stratégique n'est pas une faiblesse. Reculer pour mieux avancer.",
  34: "La grande force est disponible. Canalise-la avec sagesse.",
  36: "Protégez votre lumière dans l'adversité. La discrétion est stratégique.",
  39: "L'obstacle invite au détour créatif. Contourne plutôt que force.",
  40: "La libération arrive. Lâche ce qui te retient.",
  42: "L'augmentation favorable. Ce que vous donnez vous revient multiplié.",
  47: "L'accablement est temporaire. La pression crée le diamant.",
  49: "Le temps de la révolution. Ose le changement nécessaire.",
  50: "Le chaudron transforme le brut en or. Cultivez vos talents.",
  52: "La montagne immobile. Méditation et centrage sont vos clés.",
  55: "L'abondance est à son zénith. Profitez de ce moment rare.",
  58: "La sérénité et la joie. Partagez votre lumière avec les autres.",
  61: "La vérité intérieure guide vos pas. Faites confiance à votre intuition.",
  63: "Tout est accompli mais reste vigilant. Ne relâche pas l'attention.",
  64: "Avant l'accomplissement — tout est prêt, un dernier effort.",
};

// ── Strategic Hex Profiles (business-oriented) ──
export interface HexProfile {
  archetype: string;
  judgment: string;
  image: string;
  risk: string;
  opportunity: string;
  action: string;
  wisdom: string;
}

const HEX_PROFILES: Record<number, HexProfile> = {
  1:  { archetype: 'Le Pionnier',        judgment: 'La force créatrice est à l\'apogée — tout commence par vous.', image: 'Le ciel en mouvement — avance sans hésiter.', risk: 'Sur-confiance, agir seul sans écouter.', opportunity: 'Lancer un projet majeur, prendre l\'initiative.', action: 'Lancez ce que vous repoussez depuis trop longtemps.', wisdom: 'Le Créateur agit sans relâche. Comme le ciel dont le mouvement est infatigable, l\'homme de valeur travaille sans cesse à se perfectionner.' },
  2:  { archetype: 'Le Stratège Patient', judgment: 'L\'accueil et l\'écoute ouvrent les portes invisibles.', image: 'La terre porte tout — sois le socle sur lequel d\'autres construisent.', risk: 'Passivité excessive, attendre sans agir.', opportunity: 'Alliances, partenariats, délégation.', action: 'Écoutez avant de parler. Le pouvoir est dans la réceptivité.', wisdom: 'La Terre dans sa dévotion porte toutes choses. Celui qui s\'ouvre au monde avec douceur reçoit plus que celui qui prend par la force.' },
  3:  { archetype: 'Le Bâtisseur',        judgment: 'Le commencement est chaotique mais porteur.', image: 'L\'orage féconde la terre — le chaos nourrit la croissance.', risk: 'Abandonner trop tôt face aux obstacles.', opportunity: 'Poser les fondations d\'un projet durable.', action: 'Persévérez malgré la confusion. Les débuts sont toujours difficiles.', wisdom: 'Nuages et tonnerre : la difficulté initiale. Toute naissance est un arrachement. Ce qui naît dans la douleur grandit avec puissance.' },
  4:  { archetype: 'L\'Apprenti',          judgment: 'L\'ignorance consciente est le début de la sagesse.', image: 'La source au pied de la montagne — cherche le mentor.', risk: 'Arrogance, croire tout savoir déjà.', opportunity: 'Formation, apprentissage, humilité stratégique.', action: 'Demandez conseil à quelqu\'un de plus expérimenté.', wisdom: 'La source jaillit au pied de la montagne. Ce n\'est pas le maître qui cherche l\'élève, c\'est l\'élève qui doit chercher le maître.' },
  5:  { archetype: 'Le Patient',           judgment: 'L\'attente active n\'est pas de l\'inaction — c\'est de la stratégie.', image: 'Les nuages montent — la pluie viendra sans la forcer.', risk: 'Impatience, forcer le timing.', opportunity: 'Préparer le terrain pour le moment optimal.', action: 'Préparez-vous. Le moment viendra — soyez prêt quand il arrive.', wisdom: 'Les nuages montent dans le ciel : il faut attendre. Nourrissez-vous de votre propre force en attendant que le temps soit mûr.' },
  6:  { archetype: 'Le Diplomate',         judgment: 'Le conflit non résolu consume l\'énergie créatrice.', image: 'Le ciel et l\'eau divergent — cherche l\'arbitrage.', risk: 'Escalade, obstination, procès inutile.', opportunity: 'Médiation, compromis intelligent, clarification.', action: 'Négociez plutôt que combattre. Un bon accord vaut mieux qu\'une victoire.', wisdom: 'Le ciel et l\'eau vont en sens contraire : le conflit. Dans toute querelle, celui qui sait s\'arrêter le premier est le plus sage.' },
  7:  { archetype: 'Le Commandant',        judgment: 'La discipline transforme le chaos en puissance organisée.', image: 'L\'eau dans la terre — mobilisez vos ressources cachées.', risk: 'Autoritarisme, micro-management.', opportunity: 'Organisation d\'équipe, structuration, scaling.', action: 'Structurez votre équipe et déléguez avec clarté.', wisdom: 'L\'eau contenue dans la terre : l\'armée. La force du peuple réside dans sa discipline, et la discipline dans la justesse du chef.' },
  8:  { archetype: 'L\'Allié',             judgment: 'L\'union sincère multiplie les forces.', image: 'L\'eau sur la terre — les rivières convergent vers la mer.', risk: 'Alliances de façade, dépendance.', opportunity: 'Partenariat stratégique, fusion, co-fondation.', action: 'Rapprochez-vous de vos alliés naturels. Ensemble, vous êtes plus forts.', wisdom: 'L\'eau sur la terre s\'écoule et se rassemble. Cherchez à vous unir, mais examinez d\'abord si vous possédez en vous la grandeur nécessaire.' },
  9:  { archetype: 'Le Préparateur',       judgment: 'Les petits ajustements précèdent les grands changements.', image: 'Le vent dans le ciel — l\'influence douce mais constante.', risk: 'Se perdre dans les détails, perfectionnisme.', opportunity: 'Optimisation, ajustements fin, préparation.', action: 'Affinez votre plan. Les détails font la différence.', wisdom: 'Le vent parcourt le ciel : le petit apprivoisement. Quand on ne peut pas encore agir en grand, on raffine ce qui est à portée de main.' },
  10: { archetype: 'L\'Audacieux',         judgment: 'Marcher sur la queue du tigre avec grâce — l\'audace mesurée.', image: 'Le ciel au-dessus du lac — la clarté guide les pas.', risk: 'Imprudence, sous-estimer le danger.', opportunity: 'Prise de risque calculée, premier pas décisif.', action: 'Avancez malgré la peur. Le courage n\'est pas l\'absence de peur.', wisdom: 'Le lac sous le ciel : la marche. Celui qui marche sur la queue du tigre avec simplicité de cœur ne sera pas mordu.' },
  11: { archetype: 'L\'Harmonisateur',     judgment: 'Ciel et terre en paix — l\'harmonie attire la prospérité.', image: 'La terre au-dessus du ciel — les contraires s\'unissent.', risk: 'Complaisance, relâchement.', opportunity: 'Croissance harmonieuse, expansion naturelle.', action: 'Profitez de cette fenêtre d\'harmonie pour avancer sur tous les fronts.', wisdom: 'Ciel et terre s\'unissent : la paix. Le souverain accomplit la voie du ciel et de la terre, et aide le peuple à trouver sa juste place.' },
  12: { archetype: 'Le Veilleur',          judgment: 'La stagnation est temporaire — reste vigilant.', image: 'Le ciel s\'éloigne de la terre — patience requise.', risk: 'Forcer le passage, nier la réalité.', opportunity: 'Introspection, restructuration, planification.', action: 'N\'investis pas aujourd\'hui. Observe et prépare la prochaine vague.', wisdom: 'Ciel et terre ne communiquent plus : la stagnation. L\'homme de valeur se retire et cultive sa vertu pour traverser les temps difficiles.' },
  13: { archetype: 'Le Fédérateur',        judgment: 'La communauté naît d\'une vision partagée.', image: 'Le feu sous le ciel — la lumière qui rassemble.', risk: 'Favoritisme, exclusion, clan fermé.', opportunity: 'Team building, réseau, communauté.', action: 'Rassemblez votre équipe autour d\'une vision claire et fédératrice.', wisdom: 'Le feu au ciel : la communauté. C\'est par la clarté et la force de la vision que les hommes se rassemblent véritablement.' },
  14: { archetype: 'Le Prospère',          judgment: 'Grande possession — le succès demande humilité.', image: 'Le feu au-dessus du ciel — la lumière rayonne partout.', risk: 'Arrogance, dépenses excessives.', opportunity: 'Investissement, expansion, générosité stratégique.', action: 'Investissez depuis une position de force. Partagez pour multiplier.', wisdom: 'Le feu haut dans le ciel : le grand avoir. Celui qui possède beaucoup doit soumettre le mal et promouvoir le bien pour obéir à la volonté céleste.' },
  15: { archetype: 'Le Sage',              judgment: 'L\'humilité est la plus haute forme d\'intelligence.', image: 'La montagne dans la terre — la grandeur cachée.', risk: 'Fausse modestie, auto-sabotage.', opportunity: 'Crédibilité, respect, influence durable.', action: 'Soyez humble dans votre communication. La substance prime sur le show.', wisdom: 'La montagne au sein de la terre : l\'humilité. La voie du ciel est de vider ce qui est plein et de remplir ce qui est humble.' },
  16: { archetype: 'L\'Inspirateur',       judgment: 'L\'enthousiasme sincère est contagieux et mobilisateur.', image: 'Le tonnerre sort de la terre — l\'énergie jaillit.', risk: 'Excès d\'optimisme, promesses non tenues.', opportunity: 'Lancement, pitch, mobilisation d\'équipe.', action: 'Inspirez votre équipe. Votre énergie est communicative aujourd\'hui.', wisdom: 'Le tonnerre sort de la terre : l\'enthousiasme. Les anciens rois faisaient de la musique pour honorer la vertu et l\'offrir au Ciel.' },
  17: { archetype: 'Le Suiveur',           judgment: 'Suivre le bon courant n\'est pas de la faiblesse.', image: 'Le tonnerre dans le lac — l\'adaptation au mouvement.', risk: 'Suivisme, perte d\'identité.', opportunity: 'Écoute du marché, pivot intelligent.', action: 'Suivez le flux du marché plutôt que de le combattre.', wisdom: 'Le tonnerre au milieu du lac : la suite. Quand vient le soir, le sage rentre et se restaure. Il y a un temps pour agir et un temps pour se reposer.' },
  18: { archetype: 'Le Réformateur',       judgment: 'Corriger les erreurs héritées demande courage.', image: 'Le vent au pied de la montagne — nettoyer les fondations.', risk: 'Critiquer sans proposer, rupture brutale.', opportunity: 'Restructuration, nettoyage, dette technique.', action: 'Corrigez ce qui ne fonctionne pas. Aujourd\'hui est le jour du ménage.', wisdom: 'Le vent souffle au bas de la montagne : la correction. Ce qui a été gâté par la faute du père, le fils doit le réparer avec diligence.' },
  19: { archetype: 'Le Conquérant',        judgment: 'L\'approche est favorable — avance avec confiance.', image: 'La terre au-dessus du lac — l\'influence bienveillante.', risk: 'Précipitation, forcer l\'entrée.', opportunity: 'Expansion, nouveau marché, nouvelle relation.', action: 'Approchez votre objectif avec confiance et bienveillance.', wisdom: 'La terre au-dessus du lac : l\'approche. Le sage est inépuisable dans sa volonté d\'enseigner et infatigable dans sa tolérance envers le peuple.' },
  20: { archetype: 'L\'Observateur',       judgment: 'Observer avant d\'agir est la clé de la précision.', image: 'Le vent sur la terre — tout voir sans être vu.', risk: 'Paralysie par l\'analyse, indécision.', opportunity: 'Analyse de marché, veille, stratégie.', action: 'Observez attentivement. Les insights d\'aujourd\'hui guideront vos actions.', wisdom: 'Le vent parcourt la terre : la contemplation. Les anciens rois visitaient les régions du monde pour contempler le peuple et dispenser leur enseignement.' },
  21: { archetype: 'Le Décideur',          judgment: 'Le moment de trancher est venu — mordre au travers.', image: 'Le feu et le tonnerre — la justice claire et directe.', risk: 'Jugement hâtif, dureté excessive.', opportunity: 'Décision ferme, résolution de conflit.', action: 'Tranchez maintenant. L\'hésitation coûte plus cher que l\'erreur.', wisdom: 'Le tonnerre et l\'éclair : mordre au travers. Les anciens rois rendaient les peines claires et appliquaient les lois avec fermeté.' },
  22: { archetype: 'L\'Esthète',           judgment: 'La beauté de la forme sert la profondeur du fond.', image: 'Le feu au pied de la montagne — la lumière qui orne.', risk: 'Superficialité, image sans substance.', opportunity: 'Branding, design, présentation soignée.', action: 'Soignez votre présentation. La forme compte autant que le fond.', wisdom: 'Le feu au pied de la montagne : la grâce. La clarté intérieure doit se manifester dans la forme. Mais la grâce ne doit pas primer sur le fond.' },
  23: { archetype: 'Le Lâcheur',           judgment: 'Lâcher prise est parfois le plus grand acte de force.', image: 'La montagne sur la terre — l\'érosion naturelle.', risk: 'Résister au changement, s\'accrocher.', opportunity: 'Simplification, élagage, recentrage.', action: 'Abandonnez ce qui ne sert plus. Faites de la place pour le nouveau.', wisdom: 'La montagne repose sur la terre : l\'éclatement. Quand le fruit est mûr, il tombe. Ce qui s\'achève prépare un nouveau commencement.' },
  24: { archetype: 'Le Renaissant',        judgment: 'Le retour est le mouvement de la nature — un nouveau cycle.', image: 'Le tonnerre dans la terre — l\'énergie qui renaît.', risk: 'Nostalgie, refaire les mêmes erreurs.', opportunity: 'Relance, comeback, second souffle.', action: 'Recommencez avec la sagesse acquise. Ce nouveau cycle est le bon.', wisdom: 'Le tonnerre dans la terre : le retour. Au solstice d\'hiver, la lumière revient. Ce qui semblait perdu se retrouve dans le mouvement naturel des cycles.' },
  25: { archetype: 'L\'Authentique',       judgment: 'L\'innocence stratégique — agir sans calcul excessif.', image: 'Le tonnerre sous le ciel — la spontanéité naturelle.', risk: 'Naïveté, manque de préparation.', opportunity: 'Authenticité, confiance, alignement.', action: 'Soyez authentique dans vos échanges. La sincérité désarme.', wisdom: 'Le tonnerre roule sous le ciel : l\'innocence. Sous le ciel passe le tonnerre, et toutes choses atteignent leur vraie nature. La droiture est le fondement.' },
  26: { archetype: 'L\'Accumulateur',      judgment: 'Accumulez vos forces avant le grand mouvement.', image: 'Le ciel dans la montagne — la puissance contenue.', risk: 'Rétention excessive, ne jamais passer à l\'action.', opportunity: 'Consolidation, épargne, renforcement.', action: 'Consolidez vos acquis. Le moment de déployer viendra bientôt.', wisdom: 'Le ciel au cœur de la montagne : le grand apprivoisement. Chaque jour, le sage étudie les paroles et les actes des anciens pour accumuler sa vertu.' },
  27: { archetype: 'Le Nourricier',        judgment: 'Ce que vous nourrissez grandit — choisissez bien.', image: 'Le tonnerre au pied de la montagne — la nourriture juste.', risk: 'Nourrir les mauvais projets ou relations.', opportunity: 'Investissement dans les fondamentaux.', action: 'Nourrissez ce qui compte : votre santé, vos relations clés, vos compétences.', wisdom: 'Le tonnerre au pied de la montagne : la nourriture. Le sage observe ce que l\'homme nourrit et par quoi il cherche à se nourrir lui-même.' },
  28: { archetype: 'Le Risqueur',          judgment: 'La poutre faîtière plie — le moment est critique.', image: 'Le lac submerge les arbres — la pression est maximale.', risk: 'Effondrement par surcharge, burnout.', opportunity: 'Action décisive en situation de crise.', action: 'La situation est tendue — agissez vite et avec précision, ou reculez.', wisdom: 'Le lac passe par-dessus les arbres : le grand excès. Le sage se tient seul sans crainte et se retire du monde sans mélancolie.' },
  29: { archetype: 'Le Plongeur',          judgment: 'L\'eau profonde forge la sagesse — traverse sans détour.', image: 'L\'eau sur l\'eau — le danger double demande du courage.', risk: 'Panique, fuite, déni du danger.', opportunity: 'Traversée de crise, résilience, courage.', action: 'Affrontez la difficulté de face. Vous en sortirez plus fort.', wisdom: 'L\'eau coule sans interruption et atteint son but : l\'insondable. Comme l\'eau, le sage enseigne par la constance de sa vertu et la pratique des affaires.' },
  30: { archetype: 'L\'Illuminateur',      judgment: 'Le feu qui éclaire a besoin d\'un support — trouve le tien.', image: 'Le feu doublé — la clarté qui se propage.', risk: 'Burnout, s\'épuiser en éclairant les autres.', opportunity: 'Communication, visibilité, inspiration.', action: 'Partagez votre vision avec clarté. Votre lumière attire les bons partenaires.', wisdom: 'La clarté s\'élève deux fois : le feu. Le grand homme perpétue la clarté et illumine les quatre régions du monde par sa lumière.' },
  31: { archetype: 'Le Connecteur',        judgment: 'L\'influence mutuelle crée des liens qui durent.', image: 'Le lac sur la montagne — l\'attraction naturelle.', risk: 'Manipulation, séduction superficielle.', opportunity: 'Networking, partenariat, connexion authentique.', action: 'Connectez-vous authentiquement. Les relations d\'aujourd\'hui porteront des fruits.', wisdom: 'Le lac sur la montagne : l\'influence. Le sage accueille les hommes en se rendant vide. L\'humilité attire ce que l\'orgueil repousse.' },
  32: { archetype: 'Le Persistant',        judgment: 'La durée est la clé — la constance bat le talent.', image: 'Le tonnerre et le vent — la persévérance dans le mouvement.', risk: 'Obstination aveugle, refus de pivoter.', opportunity: 'Long terme, fidélité, engagement durable.', action: 'Continuez ce que vous avez commencé. La constance est votre arme secrète.', wisdom: 'Tonnerre et vent : la durée. Le sage reste ferme dans sa direction sans changer de voie. Ce qui dure est ce qui sait se renouveler.' },
  33: { archetype: 'Le Stratège',          judgment: 'Le retrait stratégique prépare la victoire suivante.', image: 'Le ciel sur la montagne — la retraite n\'est pas la défaite.', risk: 'Fuir au lieu de reculer, perdre pied.', opportunity: 'Préservation des ressources, repositionnement.', action: 'Reculez tactiquement. Préservez votre énergie pour le prochain round.', wisdom: 'La montagne sous le ciel : la retraite. Le sage tient l\'homme inférieur à distance, non par la colère mais par la réserve de sa dignité.' },
  34: { archetype: 'Le Puissant',          judgment: 'La grande force sans sagesse est destructrice.', image: 'Le tonnerre au-dessus du ciel — la puissance en action.', risk: 'Forcer le passage, écraser les autres.', opportunity: 'Action puissante, leadership affirmé.', action: 'Vous avez la force — utilisez-la avec discernement et générosité.', wisdom: 'Le tonnerre au-dessus du ciel : la grande force. Le sage ne marche pas sur des chemins qui ne sont pas conformes à l\'ordre.' },
  35: { archetype: 'L\'Ascendant',         judgment: 'Le progrès est rapide — ne le gaspillez pas.', image: 'Le feu au-dessus de la terre — la lumière qui monte.', risk: 'Orgueil lié au succès, avancer trop vite.', opportunity: 'Promotion, reconnaissance, expansion rapide.', action: 'Capitalisez sur l\'élan positif. Montez d\'un cran aujourd\'hui.', wisdom: 'La clarté s\'élève au-dessus de la terre : le progrès. Le soleil montant éclaire la terre entière. Plus vous montez, plus vous devez éclairer les autres.' },
  36: { archetype: 'Le Protecteur',        judgment: 'Protégez votre lumière dans l\'adversité — la discrétion est force.', image: 'La terre au-dessus du feu — la lumière cachée.', risk: 'Se victimiser, perdre espoir.', opportunity: 'Discrétion stratégique, protection des acquis.', action: 'Restez discret aujourd\'hui. Protégez vos idées et vos projets.', wisdom: 'La lumière est entrée dans la terre : l\'obscurcissement. Le sage voile sa lumière pour pouvoir briller quand le moment sera venu.' },
  37: { archetype: 'Le Fondateur',         judgment: 'La famille — biologique ou choisie — est le socle.', image: 'Le vent naît du feu — la chaleur qui rayonne au foyer.', risk: 'Négliger les proches, isolement professionnel.', opportunity: 'Renforcer les liens, culture d\'entreprise.', action: 'Renforcez votre base. Appelez un proche ou soudez votre équipe.', wisdom: 'Le vent naît du feu : la famille. Le sage parle avec substance et agit avec constance. L\'ordre du foyer est le fondement de l\'ordre du monde.' },
  38: { archetype: 'Le Médiateur',         judgment: 'L\'opposition révèle la complémentarité cachée.', image: 'Le feu et le lac — les contraires qui s\'éclairent.', risk: 'Polarisation, conflit stérile.', opportunity: 'Perspective nouvelle, synthèse créative.', action: 'Écoutez le point de vue opposé. Il contient ce qui vous manque.', wisdom: 'Le feu au-dessus et le lac en dessous : l\'opposition. Dans la communauté, le sage préserve l\'individualité. L\'unité naît de la diversité assumée.' },
  39: { archetype: 'Le Contourneur',       judgment: 'L\'obstacle invite au détour créatif.', image: 'L\'eau sur la montagne — l\'eau contourne toujours la roche.', risk: 'Confrontation frontale, épuisement.', opportunity: 'Innovation par contrainte, pivot créatif.', action: 'Contournez l\'obstacle plutôt que de le forcer. Il y a un autre chemin.', wisdom: 'L\'eau sur la montagne : l\'obstacle. Le sage tourne son regard vers lui-même et cultive sa vertu. L\'obstacle extérieur appelle une réponse intérieure.' },
  40: { archetype: 'Le Libérateur',        judgment: 'La libération vient — lâche les poids morts.', image: 'Le tonnerre et la pluie — la tension qui se relâche.', risk: 'Récidive, retomber dans les vieilles habitudes.', opportunity: 'Simplification, résolution, nouveau départ.', action: 'Libérez-vous de ce qui te retient. Résilie, annule, simplifie.', wisdom: 'Le tonnerre et la pluie se mettent en mouvement : la libération. Quand l\'orage purifie l\'air, le sage pardonne les fautes et remet les péchés.' },
  41: { archetype: 'Le Sacrificateur',     judgment: 'Diminuer ici pour augmenter là — le sacrifice stratégique.', image: 'La montagne sur le lac — donner pour recevoir.', risk: 'Se sacrifier sans retour, martyre.', opportunity: 'Investissement, renoncement calculé.', action: 'Sacrifiez le superflu pour renforcer l\'essentiel.', wisdom: 'La montagne au-dessus du lac : la diminution. Le sage maîtrise sa colère et refrène ses désirs. Diminuer ce qui est en bas pour augmenter ce qui est en haut.' },
  42: { archetype: 'Le Récepteur',         judgment: 'L\'augmentation vient — sois prêt à recevoir.', image: 'Le vent et le tonnerre — la croissance naturelle.', risk: 'Gaspiller l\'abondance reçue.', opportunity: 'Croissance, investissement, expansion.', action: 'Recevez ce qui vient avec gratitude et investissez-le sagement.', wisdom: 'Vent et tonnerre : l\'augmentation. Le sage, quand il voit le bien, l\'imite ; quand il a des défauts, il s\'en corrige.' },
  43: { archetype: 'Le Trancheur',         judgment: 'La percée décisive — le moment de trancher est maintenant.', image: 'Le lac s\'élève au-dessus du ciel — le moment de vérité.', risk: 'Dureté, couper trop de ponts.', opportunity: 'Décision finale, breakthrough, annonce majeure.', action: 'Décidez maintenant. Signez, annoncez, tranchez — l\'hésitation te coûtera.', wisdom: 'Le lac monte jusqu\'au ciel : la percée. Le sage distribue les richesses vers le bas et craint de se reposer sur sa vertu.' },
  44: { archetype: 'L\'Ouvert',            judgment: 'La rencontre inattendue porte un message important.', image: 'Le vent sous le ciel — ce qui vient à toi.', risk: 'Se laisser séduire par la facilité.', opportunity: 'Opportunité imprévue, rencontre clé.', action: 'Restez ouvert aux rencontres inattendues. Le hasard n\'existe pas.', wisdom: 'Le vent sous le ciel : la rencontre. Le prince proclame ses ordres aux quatre directions. Ce qui vient à toi n\'est jamais un hasard.' },
  45: { archetype: 'Le Fédérateur',        judgment: 'Le rassemblement crée une force irrésistible.', image: 'Le lac sur la terre — les eaux convergent.', risk: 'Foule sans direction, dispersion.', opportunity: 'Événement, lancement, mobilisation collective.', action: 'Rassemblez les gens autour de votre projet. C\'est le moment du collectif.', wisdom: 'Le lac sur la terre : le rassemblement. Le sage renouvelle ses armes pour faire face à l\'imprévu. Ce qui se rassemble doit être protégé.' },
  46: { archetype: 'Le Grimpeur',          judgment: 'La poussée vers le haut — monte étape par étape.', image: 'Le bois pousse dans la terre — la croissance organique.', risk: 'Sauter des étapes, brûler les étapes.', opportunity: 'Progression méthodique, scaling organique.', action: 'Montez d\'un cran. Pas de raccourci — la progression solide est la clé.', wisdom: 'Le bois pousse dans la terre : la montée. Le sage, par l\'accumulation de petites choses, atteint la grandeur. Un pas après l\'autre, sans relâche.' },
  47: { archetype: 'L\'Endurant',          judgment: 'L\'accablement est temporaire — la pression crée le diamant.', image: 'Le lac sans eau — l\'épuisement qui précède le renouveau.', risk: 'Désespoir, abandon, burnout.', opportunity: 'Résilience, transformation par la pression.', action: 'Endurez. Cette période difficile vous forge. Ne lâchez pas maintenant.', wisdom: 'Le lac est vidé de son eau : l\'accablement. Le sage risque sa vie pour accomplir sa volonté. Quand les mots ne portent plus, seuls les actes parlent.' },
  48: { archetype: 'Le Sourcier',          judgment: 'Le puits — va chercher la source profonde.', image: 'L\'eau sous le bois — la ressource inépuisable.', risk: 'Puiser sans renouveler, épuiser ses ressources.', opportunity: 'Ressourcement, formation, fondamentaux.', action: 'Retournez aux fondamentaux. La source de votre force est toujours là.', wisdom: 'L\'eau sur le bois : le puits. On peut changer de ville mais pas de puits. Le puits nourrit sans jamais s\'épuiser quand il est bien entretenu.' },
  49: { archetype: 'Le Transformateur',    judgment: 'La révolution est mûre — le changement est inévitable.', image: 'Le feu dans le lac — la transformation radicale.', risk: 'Changement pour le changement, instabilité.', opportunity: 'Pivot majeur, transformation, disruption.', action: 'Transformez ce qui doit l\'être. Le statu quo n\'est plus une option.', wisdom: 'Le feu au cœur du lac : la révolution. Le sage règle le calendrier et clarifie les saisons. La révolution juste vient quand le temps est mûr.' },
  50: { archetype: 'L\'Alchimiste',        judgment: 'Le chaudron transforme le brut en précieux.', image: 'Le feu sous le bois — la cuisson lente qui perfectionne.', risk: 'Précipiter le processus, impatience.', opportunity: 'Raffinement, valeur ajoutée, montée en gamme.', action: 'Cultivez et raffinez. La qualité premium prend du temps.', wisdom: 'Le feu sur le bois : le chaudron. Le sage consolide son destin en maintenant droite sa position. Le chaudron transforme le cru en accompli.' },
  51: { archetype: 'L\'Éveillé',           judgment: 'Le choc éveille — la peur initiale cède à la clarté.', image: 'Le tonnerre doublé — l\'éveil soudain.', risk: 'Panique, réaction excessive.', opportunity: 'Prise de conscience, pivot rapide, éveil.', action: 'Le choc du moment est un cadeau. Qu\'est-ce qu\'il t\'apprend ?', wisdom: 'Le tonnerre répété : l\'ébranlement. Le sage examine sa vie dans la crainte et met de l\'ordre en lui-même. La frayeur mène à la bénédiction.' },
  52: { archetype: 'Le Méditant',          judgment: 'L\'immobilité n\'est pas inaction — c\'est concentration.', image: 'La montagne doublée — le calme absolu.', risk: 'Paralysie, isolement excessif.', opportunity: 'Centrage, clarté mentale, méditation.', action: 'Arrêtez-vous. La clarté vient dans le silence, pas dans l\'agitation.', wisdom: 'Les montagnes se dressent immobiles : l\'immobilisation. Le sage ne va pas au-delà de sa situation. Quand le cœur s\'arrête, le monde entier se calme.' },
  53: { archetype: 'Le Développeur',       judgment: 'Le développement graduel — chaque étape compte.', image: 'Le bois sur la montagne — la croissance lente mais sûre.', risk: 'Impatience, vouloir tout tout de suite.', opportunity: 'Croissance progressive, développement durable.', action: 'Avancez pas à pas. La croissance organique est la plus solide.', wisdom: 'Le bois sur la montagne : le développement graduel. L\'arbre sur la montagne croît lentement mais ses racines sont profondes et nul vent ne l\'abat.' },
  54: { archetype: 'L\'Adaptateur',        judgment: 'S\'adapter sans se perdre — la flexibilité stratégique.', image: 'Le tonnerre au-dessus du lac — l\'adaptation au contexte.', risk: 'Perdre son identité, trop de compromis.', opportunity: 'Adaptation au marché, flexibilité, compromis intelligent.', action: 'Adaptez-vous au contexte sans perdre votre vision.', wisdom: 'Le tonnerre au-dessus du lac : l\'épousée. Le sage reconnaît la fin dans le commencement et le transitoire dans le permanent.' },
  55: { archetype: 'Le Rayonnant',         judgment: 'L\'abondance est à son zénith — agissez maintenant.', image: 'Le tonnerre et le feu — la puissance à son apogée.', risk: 'Croire que ça durera toujours, arrogance.', opportunity: 'Fenêtre rare d\'expansion maximale.', action: 'C\'est votre moment. Capitalisez à fond — cette fenêtre est rare.', wisdom: 'Tonnerre et éclair ensemble : l\'abondance. Le sage tranche les procès et exécute les châtiments. Comme le soleil à midi, il faut rayonner sans attendre.' },
  56: { archetype: 'L\'Explorateur',       judgment: 'Le voyageur avance léger — la mobilité est force.', image: 'Le feu sur la montagne — la flamme du voyage.', risk: 'Instabilité, manque de racines.', opportunity: 'Exploration, nouveau territoire, agilité.', action: 'Explorez un nouveau terrain. Voyagez léger, décidez vite.', wisdom: 'Le feu sur la montagne : le voyageur. Le sage applique les peines avec prudence et ne laisse pas traîner les procès. Celui qui voyage doit rester juste.' },
  57: { archetype: 'L\'Infiltrateur',      judgment: 'La douceur pénètre là où la force échoue.', image: 'Le vent doublé — l\'influence subtile et persistante.', risk: 'Manipulation, manque de franchise.', opportunity: 'Influence douce, persuasion, pénétration de marché.', action: 'Utilisez la douceur et la persévérance plutôt que la force.', wisdom: 'Les vents qui se suivent : le doux pénétrant. Le sage répète ses ordres pour accomplir les affaires. La persévérance douce triomphe de toute résistance.' },
  58: { archetype: 'Le Joyeux',            judgment: 'La joie authentique attire le succès.', image: 'Le lac doublé — la sérénité communicative.', risk: 'Superficialité, plaisir sans substance.', opportunity: 'Communication positive, charisme, vente.', action: 'Communiquez avec joie et enthousiasme. Votre bonne énergie est contagieuse.', wisdom: 'Les lacs se touchent : la sérénité. Le sage se joint à ses amis pour discuter et pratiquer. La joie partagée dans la vérité est inépuisable.' },
  59: { archetype: 'Le Dissolveur',        judgment: 'Dissoudre les barrières libère l\'énergie bloquée.', image: 'Le vent sur l\'eau — la dispersion qui renouvelle.', risk: 'Tout dissoudre, y compris ce qui fonctionne.', opportunity: 'Briser les silos, fluidifier, ouvrir.', action: 'Dissolvez les blocages. Ouvrez les vannes — laisse circuler l\'énergie.', wisdom: 'Le vent souffle sur l\'eau : la dissolution. Les anciens rois faisaient des offrandes au Seigneur. Ce qui est durci par l\'égoïsme doit être dissous par le sacré.' },
  60: { archetype: 'Le Structureur',       judgment: 'La limitation juste crée l\'excellence.', image: 'L\'eau sur le lac — les limites qui contiennent.', risk: 'Rigidité excessive, frustration.', opportunity: 'Cadrage, budgétisation, focus.', action: 'Posez des limites claires. Le cadre libère la créativité.', wisdom: 'L\'eau au-dessus du lac : la limitation. Le sage fixe le nombre et la mesure, et examine la nature de la vertu et de la conduite.' },
  61: { archetype: 'L\'Intuitif',          judgment: 'La vérité intérieure transcende la logique.', image: 'Le vent sur le lac — la confiance qui traverse.', risk: 'Ignorer les faits, délire mystique.', opportunity: 'Intuition guidée, confiance, authenticité.', action: 'Faites confiance à votre instinct. Il voit ce que votre logique ignore.', wisdom: 'Le vent sur le lac : la vérité intérieure. Le sage délibère des affaires pénales pour retarder la mort. La vérité touche même ce qui est sans conscience.' },
  62: { archetype: 'Le Prudent',           judgment: 'Les petites choses comptent — la prudence dans le détail.', image: 'Le tonnerre sur la montagne — le petit qui surpasse le grand.', risk: 'Excès de prudence, paralysie.', opportunity: 'Attention aux détails, petits gains cumulés.', action: 'Concentrez-vous sur les petites victoires. Elles s\'accumulent.', wisdom: 'Le tonnerre sur la montagne : la petite traversée. Le sage, dans sa conduite, donne la prépondérance au respect ; dans le deuil, à la douleur ; dans la dépense, à l\'économie.' },
  63: { archetype: 'Le Vigilant',          judgment: 'Tout est accompli — mais le relâchement menace.', image: 'L\'eau sur le feu — l\'équilibre parfait mais fragile.', risk: 'Complaisance post-succès, relâchement.', opportunity: 'Maintenance, optimisation, protection des acquis.', action: 'Ne relâchez pas l\'attention. Protégez ce que vous avez construit.', wisdom: 'L\'eau au-dessus du feu : après l\'accomplissement. Le sage réfléchit aux malheurs à venir et s\'en prémunit. L\'ordre parfait porte en lui le germe du désordre.' },
  64: { archetype: 'Le Finisseur',         judgment: 'Avant l\'accomplissement — un dernier effort décisif.', image: 'Le feu sur l\'eau — la transformation imminente.', risk: 'Abandonner si près du but.', opportunity: 'Sprint final, dernier effort, completion.', action: 'Vous y êtes presque. Un dernier effort et c\'est bouclé.', wisdom: 'Le feu au-dessus de l\'eau : avant l\'accomplissement. Le sage distingue soigneusement la nature des choses pour que chacune trouve sa place.' },
};

export function getHexProfile(hexNum: number): HexProfile {
  return HEX_PROFILES[hexNum] || {
    archetype: 'Le Sage', judgment: 'Le moment demande observation.',
    image: 'Les nuages se rassemblent.', risk: 'Inaction prolongée.',
    opportunity: 'Observation stratégique.', action: 'Observez et attendez le bon moment.',
    wisdom: 'Le sage observe les signes du ciel et de la terre, et règle sa conduite en conséquence.'
  };
}

// ── V2.6: Yang Bias — distribution traditionnelle ──
// Trigrammes par nb de traits Yang : idx0=3, idx1=2, idx2=2, idx3=1, idx4=2, idx5=1, idx6=1, idx7=0
// Slots pondérés → ~67% Yang par ligne (tradition ≈ 75%, compromis Grok = 68%)
// Ciel(3Y)=5 slots, Lac/Feu/Vent(2Y)=3 chacun, Tonnerre/Eau/Montagne(1Y)=1 chacun, Terre(0Y)=1
const YANG_BIAS: number[] = [
  0, 0, 0, 0, 0,   // 5× Ciel     (☰ 3 yang)
  1, 1, 1,          // 3× Lac      (☱ 2 yang)
  2, 2, 2,          // 3× Feu      (☲ 2 yang)
  3,                // 1× Tonnerre (☳ 1 yang)
  4, 4, 4,          // 3× Vent     (☴ 2 yang)
  5,                // 1× Eau      (☵ 1 yang)
  6,                // 1× Montagne (☶ 1 yang)
  7,                // 1× Terre    (☷ 0 yang)
]; // 18 slots → (5×3 + 9×2 + 3×1 + 1×0) / (18×3) = 36/54 = 66.7% Yang

function biasedTrigram(hash: number): number {
  return YANG_BIAS[hash % YANG_BIAS.length];
}

// ── Main calculation ──
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
  const pday = calcPersonalDay(bd, today).v;
  const doy = dayOfYear(today);

  // Primary hash: birth date + target date + personal day → hexagram
  // V3.0: deux hashes indépendants (fix corrélation lower/upper — audit Grok)
  const lowerHash = djb2(`lower|${bd}|${today}|${pday}`);
  const upperHash = djb2(`upper|${bd}|${today}|${pday}`);
  const lower = biasedTrigram(lowerHash);
  const upper = biasedTrigram(upperHash);
  const hexNum = KW[lower][upper];

  // Secondary hash: different seed → changing line (independent)
  const chHash = djb2(`changing|${bd}|${today}|${doy}`);
  const changing = chHash % 6;

  // Lines from trigrams
  const lines = [...TRIGRAMS[lower], ...TRIGRAMS[upper]];

  return {
    hexNum, lower, upper, lines, changing,
    name: HEX_NAMES[hexNum] || `Hexagramme ${hexNum}`,
    keyword: HEX_KEYWORDS[hexNum] || 'Observez',
    desc: HEX_DESC[hexNum] || `L'hexagramme ${hexNum} t'invite à ${(HEX_KEYWORDS[hexNum] || 'observer').toLowerCase()}.`
  };
}

// ── V3: Natal hexagram (fixed, based on birth date only) ──
export function calcNatalIChing(bd: string): IChingReading {
  // V3.0: deux hashes indépendants (fix corrélation lower/upper — audit Grok)
  const lowerHash = djb2(`natal-lower|${bd}`);
  const upperHash = djb2(`natal-upper|${bd}`);
  const lower = biasedTrigram(lowerHash);
  const upper = biasedTrigram(upperHash);
  const hexNum = KW[lower][upper];

  const chHash = djb2(`natal-changing|${bd}`);
  const changing = chHash % 6;

  const lines = [...TRIGRAMS[lower], ...TRIGRAMS[upper]];

  return {
    hexNum, lower, upper, lines, changing,
    name: HEX_NAMES[hexNum] || `Hexagramme ${hexNum}`,
    keyword: HEX_KEYWORDS[hexNum] || 'Observez',
    desc: HEX_DESC[hexNum] || `L'hexagramme ${hexNum} t'invite à ${(HEX_KEYWORDS[hexNum] || 'observer').toLowerCase()}.`
  };
}

// ═══ V2.8: SCORING 5 TIERS (audit Grok: "échelle plus fine basée sur les 64 profils") ═══
// Remplace le binaire CREATIVE/CHALLENGE de convergence.ts
// Classement basé sur la tradition Yi King : énergie expansive vs contractive
//
// A: Puissant (+10) — Énergie créatrice/expansion maximale
// B: Favorable (+5)  — Conditions porteuses, action recommandée
// C: Neutre (+2)     — Énergie équilibrée, observation
// D: Tension (-3)    — Résistance, prudence requise
// E: Épreuve (-7)    — Challenge majeur, patience et retrait

export type HexTier = 'A' | 'B' | 'C' | 'D' | 'E';
export interface HexScore { tier: HexTier; points: number; label: string; }

const HEX_TIERS: Record<number, HexTier> = {
  // A — Puissant (8 hex) — V2.9: +#43, -#58
  1: 'A',   // Créateur — force créatrice pure
  11: 'A',  // Paix — ciel+terre en harmonie
  14: 'A',  // Grand Avoir — abondance
  34: 'A',  // Puissance du Grand — force
  42: 'A',  // Augmentation — croissance
  43: 'A',  // Percée/Décision — puissance décisionnelle (audit Grok: hex action majeur)
  50: 'A',  // Chaudron — transformation
  55: 'A',  // Abondance — plénitude

  // B — Favorable (27 hex) — V2.9.1: +#16,#22,#24,#27,#32,#48,#51,#53,#57 (audit Grok R2+R3)
  2: 'B',   // Réceptif — puissance yin
  7: 'B',   // Armée — discipline
  8: 'B',   // Alliance — union
  10: 'B',  // Marche — audace
  13: 'B',  // Communauté — fédération
  15: 'B',  // Humilité — sagesse
  16: 'B',  // Enthousiasme — énergie collective, motivation (Grok R2: très business)
  17: 'B',  // Suite — adaptation
  22: 'B',  // Grâce — beauté, séduction stratégique (Grok R3: très business)
  24: 'B',  // Retour — nouveau départ après crise (Grok R2: renaissance)
  25: 'B',  // Innocence — authenticité (Grok: "pureté d'intention, très fort en business")
  26: 'B',  // Grand Apprivoisement — accumulation
  27: 'B',  // Nourriture — soutien, croissance (Grok R2: accumulation)
  30: 'B',  // Feu — clarté
  31: 'B',  // Influence — connexion
  32: 'B',  // Durée — persévérance, endurance (Grok R3: très stratégique)
  35: 'B',  // Progrès — avancement
  40: 'B',  // Délivrance — libération
  45: 'B',  // Rassemblement — convergence
  46: 'B',  // Poussée vers le haut — ascension
  48: 'B',  // Puits — ressource profonde, soutien durable (Grok R3)
  49: 'B',  // Révolution — transformation
  51: 'B',  // Éveil — choc positif, réveil soudain (Grok R3)
  53: 'B',  // Développement — progrès lent mais sûr (Grok R2: très stratégique)
  57: 'B',  // Vent — pénétration douce, influence subtile (Grok R3)
  58: 'B',  // Joie/Lac — communication persuasive (Grok: B pas A, bon mais pas puissant)
  61: 'B',  // Vérité intérieure — authenticité

  // D — Tension (18 hex) — V2.9.1: +#5,#9,#21,#37,#44 (audit Grok R2+R3)
  3: 'D',   // Difficulté initiale
  4: 'D',   // Folie juvénile
  5: 'D',   // Attente — tension d'attente, timing critique (Grok R2)
  6: 'D',   // Conflit
  9: 'D',   // Petit Domestique — petits obstacles, patience forcée (Grok R2)
  18: 'D',  // Travail sur le corrompu
  19: 'D',  // Approche — tension de timing (Grok: "trop tôt ou trop tard", pas favorable)
  21: 'D',  // Morsure — justice, morsure à travers l'obstacle (Grok R3)
  28: 'D',  // Excès du Grand
  33: 'D',  // Retraite
  37: 'D',  // Famille — tension structures relationnelles (Grok R2)
  38: 'D',  // Opposition
  41: 'D',  // Diminution
  44: 'D',  // Rencontre — tentation, rencontre dangereuse (Grok R3)
  47: 'D',  // Accablement — contextuel (Grok: "pas pleine épreuve", D pas E)
  54: 'D',  // Épousée — compromis forcé
  59: 'D',  // Dispersion
  64: 'D',  // Avant l'accomplissement

  // E — Épreuve (5 hex) — inchangé V2.9
  12: 'E',  // Stagnation
  23: 'E',  // Éclatement
  29: 'E',  // Abîme — danger
  36: 'E',  // Obscurcissement
  39: 'E',  // Obstacles
};
// C (Neutre) = tout hex non listé : #20, #52, #56, #60, #62, #63 — 6 restants (8+27+6+18+5=64)

export function getHexTier(hexNum: number): HexScore {
  const tier = HEX_TIERS[hexNum] || 'C';
  /**
   * @deprecated V4.9 — Ces points (A:+10…E:-7) ne sont PLUS utilisés dans le scoring convergence.
   * Le scoring est désormais : Yao = tierPts + getActiveLineScore() (±6), Nuclear = getNuclearScore() (±3).
   * Ces valeurs restent pour rétrocompatibilité UI (ConvergenceTab breakdown display).
   */
  const scores: Record<HexTier, { points: number; label: string }> = {
    A: { points: 10, label: 'Puissant' },
    B: { points: 5, label: 'Favorable' },
    C: { points: 2, label: 'Neutre' },
    D: { points: -3, label: 'Tension' },
    E: { points: -7, label: 'Épreuve' },
  };
  return { tier, ...scores[tier] };
}

// ═══ V2.9.1: LIGNES MUTANTES — 18 hex A+B tier (audit Grok R2+R3) ═══
// Chaque hexagramme a 6 lignes. La "ligne mutante" (changing line) indique où l'énergie se transforme.
// Format : 1 phrase sagesse + 1 phrase action business
// Grok a fourni les Line 1 pour les 18 hex les plus stratégiques

export interface MutantLineReading {
  lineNum: number;       // 1-6
  position: string;      // Nom symbolique de la position
  text: string;          // Guidance texte
  isSpecific: boolean;   // true = texte curé Grok, false = généré
}

// Signification universelle de chaque position de ligne
const LINE_POSITIONS: { name: string; meaning: string }[] = [
  { name: 'Fondation', meaning: 'Énergie cachée, potentiel latent. Prépare en silence.' },
  { name: 'Service', meaning: 'Force intérieure active. Agis avec humilité et constance.' },
  { name: 'Transition', meaning: 'Point de bascule critique. Attention aux faux pas.' },
  { name: 'Prudence', meaning: 'Proche du pouvoir. Avance avec diplomatie.' },
  { name: 'Maîtrise', meaning: 'Ligne du souverain. Leadership et décision au sommet.' },
  { name: 'Culmination', meaning: 'Apogée atteinte. Sache lâcher prise avant l\'excès.' },
];

// Textes spécifiques Line 1 — A-tier (8 hex) + B-tier (10 hex) = 18 textes curés
const MUTANT_LINE_1: Record<number, string> = {
  // A-tier
  1:  'Dragon caché attend le bon moment. Prépare en silence — la puissance vient de la patience stratégique.',
  11: 'L\'harmonie commence par le bas. Renforcez vos fondations avant de bâtir plus haut.',
  14: 'Richesse encore cachée. Protège vos ressources — la discrétion est la gardienne de l\'abondance.',
  34: 'Puissance contenue. Canalise avec discipline — la force brute sans direction se retourne contre toi.',
  42: 'Augmentation par geste humble. Donne sans attendre retour — l\'investissement invisible porte les plus gros fruits.',
  43: 'Décision prise mais pas encore visible. Agis avec discrétion — le timing de l\'annonce compte autant que la décision.',
  50: 'Chaudron froid. Purifiez vos intentions avant de nourrir votre projet — la qualité des ingrédients détermine le résultat.',
  55: 'Abondance fragile. Protège comme une flamme naissante — ce qui brille trop tôt s\'éteint vite.',
  // B-tier
  2:  'Le dragon caché sous terre attend. Ne force rien — la puissance vient de la patience. Laisse la terre te porter.',
  7:  'L\'armée commence par l\'ordre. Avant d\'avancer, assurez la discipline de vos troupes et la clarté de votre objectif.',
  13: 'L\'union commence par l\'égalité. Traitez vos partenaires comme des égaux — c\'est là que naît la force collective.',
  17: 'Pour être suivi, suis d\'abord. Montre l\'exemple avec humilité — les autres te suivront naturellement.',
  25: 'La pureté d\'intention est votre arme la plus puissante. Agissez sans calcul, avec sincérité — le ciel répondra.',
  31: 'L\'influence commence par le ressenti. Avant de convaincre, ressentez profondément ce que vous voulez transmettre.',
  32: 'La durée se construit sur des fondations solides. Ne cherche pas la rapidité, cherche la persévérance.',
  46: 'La poussée commence par un effort humble. Avancez pas à pas, avec constance — la montagne se gravit ainsi.',
  49: 'La révolution commence par le changement intérieur. Avant de transformer l\'extérieur, transformez-vous vous-même.',
  61: 'La vérité intérieure est votre ancre. Quand vous parlez depuis cette vérité, votre influence est irrésistible.',
};

/**
 * V2.9.1: Retourne la lecture de la ligne mutante pour un hexagramme
 * @param hexNum Numéro de l'hexagramme (1-64)
 * @param changing Index de la ligne mutante (0-5, 0=ligne 1 du bas)
 */
export function getMutantLine(hexNum: number, changing: number): MutantLineReading {
  const lineNum = changing + 1; // 0-indexed → 1-indexed
  const position = LINE_POSITIONS[changing] || LINE_POSITIONS[0];

  // Line 1 spécifique (textes Grok) ?
  if (lineNum === 1 && MUTANT_LINE_1[hexNum]) {
    return {
      lineNum,
      position: position.name,
      text: MUTANT_LINE_1[hexNum],
      isSpecific: true,
    };
  }

  // Génération dynamique pour les autres lignes/hex
  // Combine le profil de l'hex avec la signification de la position
  const profile = HEX_PROFILES[hexNum];
  const tier = getHexTier(hexNum);

  if (profile) {
    // Texte contextuel basé sur archetype + position
    const contextTexts: Record<string, string> = {
      'Fondation': `${profile.archetype} — ${position.meaning} ${profile.action.split('.')[0]}.`,
      'Service':   `${profile.archetype} — ${position.meaning} ${profile.opportunity.split(',')[0]}.`,
      'Transition': `${profile.archetype} — ${position.meaning} Risque : ${profile.risk.split(',')[0].toLowerCase()}.`,
      'Prudence':  `${profile.archetype} — ${position.meaning} ${profile.judgment.split('—')[0].trim()}.`,
      'Maîtrise':  `${profile.archetype} — ${position.meaning} ${profile.action}`,
      'Culmination': `${profile.archetype} — ${position.meaning} ${profile.wisdom.split('.')[0]}.`,
    };

    return {
      lineNum,
      position: position.name,
      text: contextTexts[position.name] || `${position.meaning} — ${profile.action}`,
      isSpecific: false,
    };
  }

  // Fallback ultime
  return {
    lineNum,
    position: position.name,
    text: `Ligne ${lineNum} (${position.name}) — ${position.meaning}`,
    isSpecific: false,
  };
}

/**
 * V2.9.1: Bonus/malus de la ligne mutante sur le score Yi King
 * Line 5 (Maîtrise) dans un A/B-tier = bonus. Line 3 (Transition) dans un D/E-tier = malus.
 *
 * @deprecated V4.9 — Remplacé par getActiveLineScore() dans iching-yao.ts
 * (matrice 384 valeurs Duc de Zhou, valeurs ±6 calibrées V4.0).
 * Cette fonction reste disponible mais n'est plus appelée dans convergence.ts.
 */
export function getMutantLineModifier(hexNum: number, changing: number): number {
  const tier = getHexTier(hexNum).tier;
  const lineNum = changing + 1;

  // Ligne 5 (Maîtrise) = meilleure ligne
  if (lineNum === 5) {
    if (tier === 'A') return 2;   // A + Maîtrise = extra puissant
    if (tier === 'B') return 1;   // B + Maîtrise = renforcé
  }

  // Ligne 1 (Fondation) dans A/B = légèrement positif (potentiel)
  if (lineNum === 1 && (tier === 'A' || tier === 'B')) return 1;

  // Ligne 3 (Transition/danger) dans D/E = extra tension
  if (lineNum === 3) {
    if (tier === 'E') return -2;  // E + Transition = danger amplifié
    if (tier === 'D') return -1;  // D + Transition = tension renforcée
  }

  // Ligne 6 (Culmination/excès) dans A = risque d'hubris
  if (lineNum === 6 && tier === 'A') return -1;

  return 0; // Neutre
}

// ═══════════════════════════════════════════════════════════════════════
// V2.9.2: NUCLEAR HEXAGRAM ENGINE (audit GPT R6)
// L'hexagramme nucléaire révèle la dynamique CACHÉE sous la surface.
// Lignes 2-3-4 → trigramme inférieur nucléaire
// Lignes 3-4-5 → trigramme supérieur nucléaire
// ═══════════════════════════════════════════════════════════════════════

export interface NuclearHexResult {
  mainHex: number;
  mainTier: HexTier;
  nuclearHex: number;
  nuclearTier: HexTier;
  nuclearName: string;
  crossKey: string;       // ex: "A_D" pour lookup dans NUCLEAR_INTERPRETATIONS
  lines: number[];        // 6 lignes binaires du hex principal
  nuclearLines: number[]; // 6 lignes binaires du hex nucléaire
}

/**
 * Convertit un numéro d'hexagramme (1-64) en 6 lignes binaires [L1..L6].
 * L1-L3 = trigramme inférieur, L4-L6 = trigramme supérieur.
 * Reverse lookup dans la matrice King Wen.
 */
export function hexToLines(hexNum: number): number[] {
  // Trouver (lower, upper) dans KW
  for (let lower = 0; lower < 8; lower++) {
    for (let upper = 0; upper < 8; upper++) {
      if (KW[lower][upper] === hexNum) {
        const lowerTri = TRIGRAMS[lower]; // [L1, L2, L3]
        const upperTri = TRIGRAMS[upper]; // [L4, L5, L6]
        return [...lowerTri, ...upperTri];
      }
    }
  }
  return [1, 1, 1, 1, 1, 1]; // Fallback: hex #1 Créateur
}

/**
 * Trouve l'index du trigramme dans TRIGRAMS à partir de 3 lignes binaires.
 */
function trigramIndex(lines: number[]): number {
  for (let i = 0; i < TRIGRAMS.length; i++) {
    if (TRIGRAMS[i][0] === lines[0] &&
        TRIGRAMS[i][1] === lines[1] &&
        TRIGRAMS[i][2] === lines[2]) {
      return i;
    }
  }
  return 0; // Fallback: Ciel
}

/**
 * Calcule l'hexagramme nucléaire à partir d'un numéro d'hex.
 * Lignes 2-3-4 → trigramme inférieur nucléaire
 * Lignes 3-4-5 → trigramme supérieur nucléaire
 * Lookup dans King Wen → numéro de l'hex nucléaire.
 */
export function calcNuclearHex(hexNum: number): NuclearHexResult {
  const lines = hexToLines(hexNum);

  // Lignes nucléaires (index 0-based : L2=index 1, L3=2, L4=3, L5=4)
  const nuclearLower = [lines[1], lines[2], lines[3]]; // L2, L3, L4
  const nuclearUpper = [lines[2], lines[3], lines[4]]; // L3, L4, L5

  const lowerIdx = trigramIndex(nuclearLower);
  const upperIdx = trigramIndex(nuclearUpper);
  const nuclearHex = KW[lowerIdx][upperIdx];

  const nuclearLines = [...TRIGRAMS[lowerIdx], ...TRIGRAMS[upperIdx]];

  const mainTier = getHexTier(hexNum).tier;
  const nucTier = getHexTier(nuclearHex).tier;

  return {
    mainHex: hexNum,
    mainTier,
    nuclearHex,
    nuclearTier: nucTier,
    nuclearName: HEX_NAMES[nuclearHex] || `Hex #${nuclearHex}`,
    crossKey: `${mainTier}_${nucTier}`,
    lines,
    nuclearLines,
  };
}

/**
 * Score de l'hexagramme nucléaire — SÉPARÉ du score Yi King principal.
 * Retourne un bonus/malus basé sur la cohérence main↔nuclear.
 * A_A = +3 (alignement total), E_E = -2 (crise profonde)
 *
 * @deprecated V4.9 — Remplacé par getNuclearScore() dans iching-yao.ts
 * (NUCLEAR_HEX[65] avec biais -1.0, cap ±3, calibré V4.0 rounds Grok+GPT+Gemini).
 * Cette fonction reste disponible mais n'est plus appelée dans convergence.ts.
 */
export function nuclearHexScore(hexNum: number): {
  result: NuclearHexResult;
  points: number;
  label: string;
} {
  const result = calcNuclearHex(hexNum);

  // Scoring basé sur le tier du nucléaire
  const NUCLEAR_SCORES: Record<HexTier, number> = {
    'A': 3, 'B': 1, 'C': 0, 'D': -1, 'E': -2
  };

  // Bonus de cohérence : même tier main/nuclear = extra
  const coherenceBonus =
    result.mainTier === result.nuclearTier ? 1 :
    Math.abs('ABCDE'.indexOf(result.mainTier) - 'ABCDE'.indexOf(result.nuclearTier)) >= 3 ? -1 :
    0;

  const points = NUCLEAR_SCORES[result.nuclearTier] + coherenceBonus;

  const labels: Record<string, string> = {
    'A_A': 'Alignement profond total',
    'A_E': 'Succès apparent, fondations fragiles',
    'E_A': 'Crise apparente, potentiel caché',
    'E_E': 'Crise à tous les niveaux',
  };
  const label = labels[result.crossKey] ||
    `Principal: ${result.mainTier} | Nucléaire: ${result.nuclearTier} (${result.nuclearName})`;

  return { result, points, label };
}

// ═══════════════════════════════════════════════════════════════════════
// V2.9.2: LIGNES MUTANTES ÉTENDUES — Lines 2 & 3 spécifiques
// Sources : Grok R5-R7-R9, GPT R8
// Ajout de textes pour Line 2 (Service) et Line 3 (Transition)
// Lines 4/5/6 gardent le fallback dynamique (textes GPT R8 trop courts)
// ═══════════════════════════════════════════════════════════════════════

const MUTANT_LINE_2: Record<number, string> = {
  // A-tier — Line 2 "Service"
  1:  'Le dragon apparaît dans le champ. Montrez-vous avec confiance — le moment de la visibilité arrive.',
  11: 'Le sage traverse le fleuve. Avance avec détermination malgré les courants contraires.',
  14: 'Un grand chariot porte la charge. Acceptez la responsabilité — votre capacité à porter est immense.',
  34: 'La puissance trouve son axe. Centre votre force avant de frapper — la précision multiplie l\'impact.',
  42: 'L\'augmentation vient d\'en haut. Reçois sans culpabilité — cette aide est méritée et stratégique.',
  43: 'Un cri d\'alarme dans la nuit. Reste vigilant même en position de force — le danger vient des angles morts.',
  50: 'Le chaudron est rempli. Nourris votre projet avec les bons ingrédients — qualité prime sur quantité.',
  55: 'L\'abondance attire le regard. Protégez votre richesse des envieux — le succès visible demande discrétion.',
  // B-tier — Line 2 "Service"
  2:  'L\'ouverture devient stratégique. Accueille avec discernement — tout ne mérite pas votre énergie.',
  7:  'Le général est au centre de l\'armée. Votre position de force vient de votre proximité avec le terrain.',
  30: 'La lumière jaune illumine. Clarté modérée, pas d\'excès — la lumière qui dure est celle qui ne brûle pas.',
  35: 'Le progrès dans l\'obscurité. Avance même sans reconnaissance visible — les résultats parleront.',
  63: 'Le renard traverse presque la rivière. La prudence au milieu du succès préserve les acquis.',
};

const MUTANT_LINE_3: Record<number, string> = {
  // A-tier — Line 3 "Transition" (point de bascule)
  1:  'Le noble est actif tout le jour. Redouble de vigilance au point de bascule — l\'excès guette.',
  11: 'Pas de plaine sans pente. Au milieu de l\'harmonie, préparez-vous au retournement inévitable.',
  14: 'Le prince offre au fils du ciel. Partagez votre abondance avec les puissants — la générosité stratégique protège.',
  34: 'Le bélier se prend dans la haie. Ta force rencontre un obstacle — contourne plutôt que force.',
  42: 'L\'augmentation par le malheur. Ce qui ressemble à une perte est souvent un repositionnement nécessaire.',
  50: 'Les anses du chaudron sont brisées. L\'accès au pouvoir est temporairement bloqué — patience et adaptation.',
  55: 'La brume masque le soleil. L\'abondance s\'assombrit temporairement — ce n\'est pas la fin, c\'est une pause.',
  // B-tier
  2:  'Le dragon caché possède la lumière. Gardez votre puissance secrète jusqu\'au moment décisif.',
  7:  'L\'armée porte les morts. Les pertes font partie de la stratégie — intègre-les sans perdre la direction.',
  49: 'La révolution au troisième jour. Le changement est mûr — hésite encore et le moment passe.',
  63: 'Après l\'achèvement, commence l\'érosion. La vigilance au milieu du succès est votre meilleure assurance.',
};

/**
 * V2.9.2: Retourne la lecture de la ligne mutante — VERSION ÉTENDUE
 * Cherche dans Lines 1, 2, 3 spécifiques, puis fallback dynamique.
 * @param hexNum Numéro de l'hexagramme (1-64)
 * @param changing Index de la ligne mutante (0-5, 0=ligne 1 du bas)
 */
export function getMutantLineV2(hexNum: number, changing: number): MutantLineReading {
  const lineNum = changing + 1;
  const position = LINE_POSITIONS[changing] || LINE_POSITIONS[0];

  // V2.9.2: Cherche texte spécifique pour Lines 1, 2, 3
  const specificMaps: Record<number, Record<number, string>> = {
    1: MUTANT_LINE_1,
    2: MUTANT_LINE_2,
    3: MUTANT_LINE_3,
  };

  const lineMap = specificMaps[lineNum];
  if (lineMap && lineMap[hexNum]) {
    return {
      lineNum,
      position: position.name,
      text: lineMap[hexNum],
      isSpecific: true,
    };
  }

  // Fallback : utilise getMutantLine existant (dynamique)
  return getMutantLine(hexNum, changing);
}
