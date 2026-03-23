import { useState } from 'react';
import { type SoulData } from '../App';
import { getNumberInfo, calcLifePathHorizontal, calcPersonalYear, calcInclusionDisplay, INCLUSION_DOMAIN_MAP, type InclusionDisplay, calcPinnacles, calcChallenges, getActivePinnacleIdx, formatReductionPath, NUMBER_INFO } from '../engines/numerology'; // V9 Sprint 7a +Pinnacles
import { calcBirthCard, getArcana } from '../engines/tarot'; // V9 Sprint 6 — Carte Natale
import { SIGN_FR, SIGN_SYM } from '../engines/astrology';
import { getNatalMoon } from '../engines/moon';
import { calcNatalIChing, getHexProfile, TRIGRAM_NAMES } from '../engines/iching';
import { calcBaZiDaily, calcDayMaster, getPeachBlossom, PEACH_BLOSSOM_MAP, EARTHLY_BRANCHES, calculateLuckPillars, getLuckPillarNarrative, type LuckPillar, calcFourPillars, getNaYin, getChangsheng, NAYIN_CATEGORY_ADVICE } from '../engines/bazi';
import { getSouthNode, generateKarmicMission, detectKarmicTension, type ZodiacSign } from '../engines/karmic-mission';
import { Orb, Sec, Cd, P } from './ui';
import { loadPersonalWeights, getRadarData, type PersonalWeights, type RadarPillar } from '../engines/personalization';
import { calcMonthPreviews } from '../engines/convergence'; // V9 Sprint 4 — carte annuelle

/* ── style helpers ── */
const intro: React.CSSProperties = {
  fontSize: 12, color: P.textDim, lineHeight: 1.7, marginBottom: 14, fontStyle: 'italic'
};
const gold12: React.CSSProperties = {
  fontSize: 12, color: P.gold, lineHeight: 1.6
};

/* ══ DOMAIN-SPECIFIC DESCRIPTIONS (qualités + vigilance adaptées au contexte) ══ */
/* Chaque domaine donne un éclairage différent du même nombre */

type Desc = { q: string; v: string };
const D: Record<number, Record<string, Desc>> = {
  1: {
    cdv:  { q: 'Ta mission est de tracer ta propre voie et d\'initier le mouvement. Tu es ici pour oser en premier.', v: 'Le piège de ta mission : confondre indépendance et isolement. Leader n\'est pas solitaire.' },
    expr: { q: 'Tu t\'exprimes avec une force de conviction qui entraîne les autres. Ton mot-clé : initiative.', v: 'Ton talent peut intimider — apprends à doser ta intensité selon le contexte.' },
    soul: { q: 'Au fond, tu es mû par un besoin viscéral d\'autonomie et de nouveauté. La routine t\'étouffe.', v: 'Cette soif d\'indépendance peut te couper des liens profonds dont tu as besoin.' },
    pers: { q: 'On perçoit en toi quelqu\'un de déterminé, sûr de lui, qui sait où il va.', v: 'Cette image de force peut empêcher les autres de t\'offrir leur aide.' },
    mat:  { q: 'Avec l\'âge, ta capacité à trancher et à mener s\'affine — tu deviens le capitaine naturel.', v: 'Maturité du 1 : accepter que diriger, c\'est aussi écouter.' },
  },
  2: {
    cdv:  { q: 'Ta mission est de créer des ponts entre les gens, d\'harmoniser et de faciliter. Tu es le liant invisible.', v: 'Le piège : t\'oublier dans la quête d\'harmonie. Ta paix intérieure compte autant que celle des autres.' },
    expr: { q: 'Tu excelles dans la diplomatie, la médiation et l\'écoute active. Les gens se confient à toi naturellement.', v: 'Ce talent de médiateur peut devenir de l\'évitement de conflit — parfois il faut trancher.' },
    soul: { q: 'Au fond, tu cherches la connexion authentique et la coopération vraie. L\'harmonie est ton carburant.', v: 'Attention à la codépendance — ta valeur ne dépend pas de l\'approbation des autres.' },
    pers: { q: 'On te perçoit comme quelqu\'un de doux, fiable et accessible. Ta présence rassure.', v: 'Cette image douce peut faire sous-estimer ta force réelle — montre tes limites.' },
    mat:  { q: 'Avec l\'âge, ton intuition relationnelle devient un super-pouvoir. Tu lis les gens sans effort.', v: 'Maturité du 2 : oser le conflit constructif plutôt que la paix de façade.' },
  },
  3: {
    cdv:  { q: 'Ta mission est de créer, communiquer et inspirer. Tu es ici pour apporter lumière et joie.', v: 'Le piège : la dispersion créative. Trop d\'idées tuent l\'exécution.' },
    expr: { q: 'Tu communiques avec un enthousiasme contagieux. Ta créativité est ton plus grand atout professionnel.', v: 'Le talent sans discipline produit des feux d\'artifice, pas des cathédrales.' },
    soul: { q: 'Au fond, tu es animé par le besoin de t\'exprimer et d\'être reconnu pour ta originalité.', v: 'Cette soif de reconnaissance peut te rendre dépendant des applaudissements.' },
    pers: { q: 'On perçoit en toi quelqu\'un de brillant, drôle et sociable. Ton charisme ouvre les portes.', v: 'L\'image du "toujours joyeux" peut masquer tes moments de doute — autorise-toi la vulnérabilité.' },
    mat:  { q: 'Avec l\'âge, ta créativité gagne en profondeur. Tu passes de l\'inspiration à l\'œuvre durable.', v: 'Maturité du 3 : choisir un projet et aller au bout plutôt que papillonner.' },
  },
  4: {
    cdv:  { q: 'Ta mission est de construire du solide et du durable. Tu es l\'architecte qui transforme les rêves en réalité.', v: 'Le piège : la rigidité. Les meilleures fondations savent absorber les secousses.' },
    expr: { q: 'Tu excelles dans l\'organisation, la méthode et l\'exécution. Quand tu fais, c\'est bien fait.', v: 'Ton perfectionnisme peut ralentir la livraison — le bien est parfois l\'ennemi du parfait.' },
    soul: { q: 'Au fond, tu cherches la sécurité et l\'ordre. Le chaos te déstabilise profondément.', v: 'Ce besoin de contrôle peut t\'empêcher de saisir les opportunités imprévues.' },
    pers: { q: 'On te perçoit comme fiable, carré, quelqu\'un sur qui on peut compter sans hésiter.', v: 'Cette image de rigueur peut paraître froide — montre aussi ton côté humain.' },
    mat:  { q: 'Avec l\'âge, ton sens de la structure devient ta marque de fabrique. Tes réalisations parlent pour toi.', v: 'Maturité du 4 : apprendre que le lâcher-prise est aussi une forme de solidité.' },
  },
  5: {
    cdv:  { q: 'Ta mission est d\'explorer, de transformer et de libérer. Tu es le catalyseur du changement.', v: 'Le piège : l\'instabilité permanente. La liberté sans racines devient errance.' },
    expr: { q: 'Tu t\'adaptes à tout, tu apprends vite et ta curiosité est magnétique.', v: 'Cette polyvalence peut devenir dispersion — choisir, c\'est aussi renoncer.' },
    soul: { q: 'Au fond, tu brûles pour la liberté et l\'expérience. L\'inconnu t\'attire irrésistiblement.', v: 'Cette soif d\'aventure peut saboter tes engagements — distingue fuite et exploration.' },
    pers: { q: 'On perçoit en toi quelqu\'un de dynamique, magnétique, toujours en mouvement.', v: 'Cette image d\'aventurier peut inquiéter ceux qui cherchent de la stabilité chez toi.' },
    mat:  { q: 'Avec l\'âge, tes expériences multiples deviennent une sagesse unique. Tu es le conseiller vécu.', v: 'Maturité du 5 : canaliser l\'énergie du changement dans un projet qui dure.' },
  },
  6: {
    cdv:  { q: 'Ta mission est de protéger, d\'harmoniser et de prendre soin. Tu es le cœur battant de ton entourage.', v: 'Le piège : le sacrifice de soi. Tu ne peux pas remplir les autres depuis une coupe vide.' },
    expr: { q: 'Tu excelles à créer de la beauté, de l\'harmonie et du lien. Les gens se sentent bien près de toi.', v: 'Ce don de soin peut devenir du contrôle déguisé en amour — laisse les autres grandir seuls.' },
    soul: { q: 'Au fond, tu aspires à l\'harmonie familiale et à un monde plus juste. L\'injustice te révolte.', v: 'Ce besoin d\'harmonie peut te faire accepter l\'inacceptable pour "garder la paix".' },
    pers: { q: 'On perçoit en toi quelqu\'un de chaleureux, responsable et protecteur. Un pilier.', v: 'Cette image de pilier peut faire oublier que toi aussi tu as besoin de soutien.' },
    mat:  { q: 'Avec l\'âge, ta sagesse du cœur devient ta force. Tes conseils sont recherchés.', v: 'Maturité du 6 : protéger sans étouffer, aimer sans s\'oublier.' },
  },
  7: {
    cdv:  { q: 'Ta mission est de chercher la vérité profonde. Tu es le philosophe, l\'analyste, le sage.', v: 'Le piège : l\'intellectualisation de tout. Vivre, c\'est aussi ressentir sans comprendre.' },
    expr: { q: 'Tu excelles dans l\'analyse, la recherche et la réflexion stratégique. Ton esprit est ton arme.', v: 'Ce talent analytique peut devenir paralysie — parfois il faut agir avant de tout comprendre.' },
    soul: { q: 'Au fond, tu es mû par une quête de sens et de vérité. Les réponses faciles ne te satisfont pas.', v: 'Cette quête peut devenir obsessionnelle — accepte que certains mystères n\'ont pas de réponse.' },
    pers: { q: 'On perçoit en toi quelqu\'un de profond, un peu mystérieux, dont la pensée va loin.', v: 'Cette aura de mystère peut créer de la distance — laisse les autres voir qui tu es vraiment.' },
    mat:  { q: 'Avec l\'âge, ta sagesse intérieure rayonne. Tu deviens le mentor que les gens cherchent.', v: 'Maturité du 7 : partager tes découvertes au lieu de les garder pour toi.' },
  },
  8: {
    cdv:  { q: 'Ta mission est de matérialiser, de bâtir du pouvoir et de l\'influence. Tu es le stratège de l\'action.', v: 'Le piège : la course au résultat. Le pouvoir sans éthique est une bombe à retardement.' },
    expr: { q: 'Tu excelles à transformer les visions en résultats concrets. L\'exécution est ta zone de génie.', v: 'Cette efficacité peut broyer les relations humaines — les gens ne sont pas des KPIs.' },
    soul: { q: 'Au fond, tu es mû par l\'ambition de laisser une empreinte tangible dans le monde.', v: 'Ce besoin de réussir peut masquer une peur profonde de l\'insignifiance.' },
    pers: { q: 'On perçoit en toi quelqu\'un d\'ambitieux, solide, qui inspire la confiance dans l\'action.', v: 'Cette image d\'autorité peut intimider — montre aussi ta vulnérabilité stratégique.' },
    mat:  { q: 'Avec l\'âge, ton sens stratégique devient redoutable. Tu sais exactement où frapper.', v: 'Maturité du 8 : utiliser le pouvoir acquis pour élever les autres, pas seulement soi.' },
  },
  9: {
    cdv:  { q: 'Ta mission est de servir une cause plus grande que tu. Compassion, vision globale, héritage.', v: 'Le piège : ne jamais finir ce que tu commencez. Le 9 doit apprendre l\'art de la conclusion.' },
    expr: { q: 'Tu as une vision d\'ensemble que peu possèdent. Tu vois les connexions invisibles.', v: 'Cette vision globale peut négliger les détails — l\'exécution locale compte autant que la stratégie globale.' },
    soul: { q: 'Au fond, tu aspires à un impact significatif sur le monde. L\'égoïsme t\'est étranger.', v: 'Cette compassion universelle peut t\'épuiser — tu ne peux pas sauver tout le monde.' },
    pers: { q: 'On perçoit en toi quelqu\'un de sage, généreux, avec une aura de bienveillance.', v: 'Cette image de sagesse peut créer des attentes irréalistes — tu as aussi le droit de douter.' },
    mat:  { q: 'Avec l\'âge, ta sagesse humaniste atteint sa pleine puissance. Tu deviens un phare.', v: 'Maturité du 9 : transmettre ta vision sans t\'accrocher au résultat.' },
  },
  11: {
    cdv:  { q: 'Ta mission est de canaliser une intuition hors norme pour guider et éclairer les autres. Tu captes ce que personne ne voit.', v: 'Le piège du 11 : l\'hypersensibilité peut paralyser. Ton don demande un ancrage solide pour ne pas te consumer.' },
    expr: { q: 'Tu communiques avec une profondeur qui touche les gens au-delà des mots. Ta présence seule inspire.', v: 'Ce talent peut te submerger d\'émotions des autres — protège ton énergie avec des limites claires.' },
    soul: { q: 'Au plus profond, tu es mû par un besoin de transcendance et de connexion à quelque chose de plus grand.', v: 'Cette quête spirituelle peut te déconnecter du quotidien — ta mission se vit aussi dans le concret.' },
    pers: { q: 'Les autres perçoivent en toi une aura magnétique, presque mystique. Ton regard semble lire au-delà des apparences.', v: 'Cette intensité peut déstabiliser — tout le monde n\'est pas prêt à être vu aussi profondément.' },
    mat:  { q: 'Avec l\'âge, ton intuition visionnaire devient ton plus grand atout stratégique. Tu vois venir avant les autres.', v: 'Maturité du 11 : faire confiance à ta vision même quand personne ne la comprend encore.' },
  },
  22: {
    cdv:  { q: 'Ta mission est titanesque : concrétiser des visions qui transforment le collectif. Bâtisseur d\'empires.', v: 'La pression du 22 est immense — sans fondations solides (énergie du 4), tout peut s\'effondrer.' },
    expr: { q: 'Tu as la rare capacité de transformer les grandes idées en réalisations concrètes à grande échelle.', v: 'Ce talent de maître bâtisseur peut mener au surmenage — délègue, tu n\'es pas obligé de tout porter.' },
    soul: { q: 'Au fond, tu aspires à laisser un héritage durable qui dépasse ta propre vie.', v: 'Cette ambition peut t\'écraser — accepte que Rome ne s\'est pas construite en un jour.' },
    pers: { q: 'On perçoit en toi une force tranquille capable de soulever des montagnes.', v: 'Cette image de puissance peut créer une pression impossible — montre que tu es humain aussi.' },
    mat:  { q: 'Avec l\'âge, ta capacité de réalisation atteint des sommets. Tes projets prennent une dimension collective.', v: 'Maturité du 22 : bâtir pour les autres, pas seulement pour prouver que tu peux.' },
  },
  33: {
    cdv:  { q: 'Ta mission est l\'amour inconditionnel et l\'enseignement. Le plus rare et le plus exigeant des chemins.', v: 'Le don de soi total peut mener à l\'épuisement — poser ses limites est vital, même pour un 33.' },
    expr: { q: 'Tu as un don de guérison par les mots, la présence et l\'enseignement. Ta bienveillance est thérapeutique.', v: 'Ce talent de guérisseur peut attirer des personnes toxiques — protège ton espace.' },
    soul: { q: 'Au fond, tu aspires à un amour universel et à l\'élévation de la conscience collective.', v: 'Cette compassion infinie peut te vider — recharge-toi avant de donner encore.' },
    pers: { q: 'On perçoit en toi un être de lumière, un guide naturel dont la sagesse apaise.', v: 'Cette image de sainteté peut être un fardeau — tu as le droit d\'être imparfait.' },
    mat:  { q: 'Avec l\'âge, ta sagesse d\'amour universel rayonne avec une puissance rare.', v: 'Maturité du 33 : enseigner par l\'exemple, sans se sacrifier sur l\'autel du service.' },
  },
};

/* Map domain keys */
const DOMAIN_KEY: Record<string, string> = {
  'Chemin de Vie': 'cdv', 'Expression': 'expr', 'Âme': 'soul',
  'Personnalité': 'pers', 'Maturité': 'mat',
};

function getDesc(domain: string, v: number): Desc | null {
  const dk = DOMAIN_KEY[domain] || 'cdv';
  return D[v]?.[dk] || null;
}

/* ══ CYCLE-SPECIFIC TEXTS (année/mois/jour — même nombre, angle différent) ══ */
const CY: Record<number, { y: string; m: string; d: string }> = {
  1:  { y: 'Année de nouveaux départs — lance les projets que tu repousses. L\'énergie d\'initiative est maximale cette année.', m: 'Ce mois favorise les prises de décision rapides. Ose proposer, trancher, avancer sans attendre la permission.', d: 'Aujourd\'hui, prends l\'initiative. Un premier pas décisif vaut mieux qu\'un plan parfait jamais exécuté.' },
  2:  { y: 'Année de partenariats et de patience. Les résultats viendront par la collaboration, pas par la force.', m: 'Ce mois invite à écouter avant de parler, à négocier plutôt qu\'imposer. Les alliances se renforcent.', d: 'Aujourd\'hui, misez sur le dialogue. Une main tendue rapportera plus qu\'un coup de force.' },
  3:  { y: 'Année de créativité et de visibilité. Ta capacité à communiquer et à inspirer est amplifiée.', m: 'Ce mois est propice à l\'expression créative. Partage tes idées, publie, présente — ton message porte.', d: 'Aujourd\'hui, exprime-toi. Un pitch, un post, une conversation — ta créativité touche juste.' },
  4:  { y: 'Année de construction méthodique. Pose les fondations — le travail structuré de cette année portera ses fruits longtemps.', m: 'Ce mois appelle de la rigueur et de l\'organisation. Fais le tri, structure, documente.', d: 'Aujourd\'hui, concentre-toi sur l\'exécution. Pas de raccourcis — la qualité du travail parle d\'elle-même.' },
  5:  { y: 'Année de changement et d\'expansion. Sois mobile, curieux, ouvert aux opportunités inattendues.', m: 'Ce mois apporte du mouvement — voyages, rencontres, pivots. Surfe sur les changements au lieu de les subir.', d: 'Aujourd\'hui, sors de ta zone de confort. L\'imprévu est ton meilleur allié.' },
  6:  { y: 'Année centrée sur la famille, la responsabilité et l\'harmonie. Investis dans tes relations proches.', m: 'Ce mois te ramène vers l\'essentiel : le foyer, les proches, l\'équilibre entre donner et se préserver.', d: 'Aujourd\'hui, prends soin — de toi d\'abord, des autres ensuite. L\'harmonie commence par l\'intérieur.' },
  7:  { y: 'Année d\'introspection et de recherche de sens. Prends du recul pour mieux voir le chemin.', m: 'Ce mois invite à l\'analyse et à la réflexion. Lis, étudie, médite — les réponses sont à l\'intérieur.', d: 'Aujourd\'hui, creuse avant de conclure. L\'intuition te guide si tu prends le temps de l\'écouter.' },
  8:  { y: 'Année de récolte et de pouvoir. Tes efforts passés se concrétisent — saisis les récompenses.', m: 'Ce mois est favorable aux négociations financières, aux décisions stratégiques et à l\'affirmation de ta position.', d: 'Aujourd\'hui, pense résultat. Chaque action doit servir un objectif concret et mesurable.' },
  9:  { y: 'Année de bilan et de clôture. Termine les cycles ouverts avant d\'en commencer de nouveaux.', m: 'Ce mois t\'invite à lâcher prise sur ce qui ne te sert plus. Fais de la place pour le renouveau.', d: 'Aujourd\'hui, finis ce que tu as commencé. La compassion et la générosité ouvrent des portes.' },
  11: { y: 'Année d\'éveil et d\'inspiration. Ta intuition est en hyper-connexion — fais-lui confiance.', m: 'Ce mois amplifie tes perceptions. Les idées qui te traversent ne sont pas anodines — note-les, elles ont de la valeur.', d: 'Aujourd\'hui, ton radar intérieur est affûté. Fie-toi à ta première impression, elle voit juste.' },
  22: { y: 'Année de réalisation majeure. Le rêve peut devenir réalité si tu combines vision et discipline.', m: 'Ce mois offre la possibilité de concrétiser un projet ambitieux. Pense grand mais exécute méthodiquement.', d: 'Aujourd\'hui, tu as la capacité de matérialiser l\'impossible. Structure ta vision en étapes.' },
  33: { y: 'Année de rayonnement et de service. Ta capacité à élever les autres est à son maximum.', m: 'Ce mois te connecte à un amour plus grand. Enseignez, guidez, inspirez — c\'est ta zone de génie.', d: 'Aujourd\'hui, ta bienveillance est ton super-pouvoir. Un mot juste peut transformer la journée de quelqu\'un.' },
};

function getCycleText(v: number, cycle: string): string {
  const c = CY[v];
  if (!c) return getNumberInfo(v).k;
  return cycle === 'y' ? c.y : cycle === 'm' ? c.m : c.d;
}

/* ══ CHINESE ZODIAC TRAITS ══ */
const CZ_TRAITS: Record<string, { q: string; v: string; desc: string }> = {
  'Rat':     { q: 'Intelligent, débrouillard, charismatique, excellent stratège social', v: 'Peut être calculateur, anxieux, tendance à accumuler', desc: 'Le Rat est le stratège social du zodiaque — il repère les opportunités avant tout le monde et sait tisser un réseau puissant.' },
  'Bœuf':   { q: 'Fiable, patient, méthodique, force tranquille', v: 'Entêtement, résistance au changement, difficulté à déléguer', desc: 'Le Bœuf est le pilier — sa force réside dans la persévérance. Ce qu\'il construit dure dans le temps.' },
  'Tigre':   { q: 'Courageux, magnétique, leader naturel, protecteur', v: 'Impulsivité, goût du risque excessif, difficulté avec l\'autorité', desc: 'Le Tigre est le guerrier charismatique — son énergie inspire mais peut aussi intimider.' },
  'Lapin':   { q: 'Diplomate, raffiné, intuitif, sens esthétique aiguisé', v: 'Évitement des conflits, indécision, fragilité émotionnelle', desc: 'Le Lapin excelle dans l\'art de la négociation et de la nuance — sa douceur cache une intelligence redoutable.' },
  'Dragon':  { q: 'Ambitieux, charismatique, audacieux, visionnaire', v: 'Ego surdimensionné, intolérance à la critique, perfectionnisme', desc: 'Le Dragon est la force de la nature — né pour les grandes réalisations, il attire naturellement l\'attention et le respect.' },
  'Serpent': { q: 'Intuitif, sage, perspicace, charisme discret et profond', v: 'Méfiance excessive, tendance au secret, possessivité', desc: 'Le Serpent est le stratège silencieux — son intelligence est aiguë et sa patience redoutable. Il voit ce que les autres ne voient pas.' },
  'Cheval':  { q: 'Énergique, sociable, aventurier, travailleur infatigable', v: 'Impatience, instabilité émotionnelle, difficulté d\'engagement', desc: 'Le Cheval est l\'énergie pure — rapide, passionné, il avance toujours mais doit apprendre à se poser.' },
  'Chèvre':  { q: 'Créatif, empathique, élégant, sens artistique développé', v: 'Dépendance affective, pessimisme, passivité face aux obstacles', desc: 'La Chèvre est l\'artiste sensible — elle a besoin d\'un environnement bienveillant pour s\'épanouir pleinement.' },
  'Singe':   { q: 'Brillant, inventif, adaptable, humour vif et désarmant', v: 'Manipulation, superficialité, difficulté à finir ce qu\'il commence', desc: 'Le Singe est le génie inventif — aucun problème ne lui résiste, mais la constance est son plus grand défi.' },
  'Coq':     { q: 'Organisé, honnête, courageux, perfectionniste méticuleux', v: 'Critique excessive, vanité, besoin constant de validation', desc: 'Le Coq est le perfectionniste flamboyant — franc et méticuleux, il excelle dans l\'exécution impeccable.' },
  'Chien':   { q: 'Loyal, juste, protecteur, sens moral fort et fiable', v: 'Anxiété, pessimisme, difficulté à faire confiance', desc: 'Le Chien est le gardien moral — sa loyauté est absolue mais son inquiétude chronique peut le ronger.' },
  'Cochon':  { q: 'Généreux, sincère, épicurien, tolérant et bon vivant', v: 'Naïveté, excès, difficulté à dire non et à poser des limites', desc: 'Le Cochon est le bon vivant au grand cœur — sa générosité est immense mais il doit se protéger des profiteurs.' },
};

/* ══ ELEMENT MEANINGS ══ */
const CZ_ELEM: Record<string, string> = {
  'Métal': 'Discipline, rigueur, détermination. L\'élément Métal aiguise ta capacité de décision et ton sens de la justice.',
  'Eau':   'Intuition, adaptabilité, profondeur. L\'Eau te donne la capacité de contourner les obstacles avec fluidité.',
  'Bois':  'Croissance, créativité, expansion. Le Bois nourrit ta vision à long terme et ta générosité naturelle.',
  'Feu':   'Passion, charisme, action. Le Feu amplifie ton leadership et ta capacité à inspirer les autres.',
  'Terre': 'Stabilité, pragmatisme, fiabilité. La Terre t\'ancre dans le concret et renforce la confiance des autres.',
};

/* ══ LO SHU NUMBER MEANINGS ══ */
const LS_MEANING: Record<number, string> = {
  1: 'communication, expression de soi',
  2: 'intuition, sensibilité',
  3: 'imagination, créativité',
  4: 'ordre, organisation, logique',
  5: 'liberté, émotion, centre vital',
  6: 'créativité domestique, responsabilité',
  7: 'spiritualité, analyse, enseignement',
  8: 'détail, précision, efficacité matérielle',
  9: 'ambition, idéalisme, vision large',
};

/* ══ LO SHU DEEP READINGS ══ */
const LS_DEEP: Record<number, { present: string; missing: string }> = {
  1: { present: 'Tu sais t\'exprimer et défendre tes idées — les mots sont ton premier outil de pouvoir.', missing: 'La communication spontanée n\'est pas naturelle — prépare tes prises de parole, elles n\'en seront que meilleures.' },
  2: { present: 'Ta intuition capte les signaux faibles — fie-toi à tes « impressions », elles sont souvent justes.', missing: 'L\'intuition brute n\'est pas ton premier réflexe — tu compenses par l\'analyse, ce qui peut être plus fiable.' },
  3: { present: 'L\'imagination est ton terrain de jeu — tu vois des possibilités là où d\'autres voient des murs.', missing: 'La créativité pure n\'est pas ton mode par défaut — tu innoves plutôt par amélioration que par invention.' },
  4: { present: 'L\'ordre et la méthode sont dans ton ADN — tes processus sont tes fondations.', missing: 'L\'organisation ne vient pas naturellement — mais une fois mise en place, elle te libère plus que les autres.' },
  5: { present: 'Le 5 au centre de la grille fait de toi un pont entre toutes les énergies — tu es le liant.', missing: 'Sans le 5 central, tu peux avoir du mal à connecter tes différentes forces entre elles — cherche un unificateur.' },
  6: { present: 'Le sens des responsabilités t\'ancre — les gens comptent sur toi, et tu assumes.', missing: 'La responsabilité domestique n\'est pas ton moteur premier — tu es plus tourné vers l\'extérieur.' },
  7: { present: 'La réflexion et l\'analyse sont tes alliées — tu comprends les choses en profondeur avant d\'agir.', missing: 'L\'introspection analytique n\'est pas ton premier réflexe — tu apprends davantage par l\'expérience que par la théorie.' },
  8: { present: 'Le sens du détail et de l\'efficacité matérielle te donne un avantage concret dans l\'exécution.', missing: 'La précision opérationnelle est à développer — entoure-toi de profils « exécutants » pour compléter ta vision.' },
  9: { present: 'Tu portes naturellement une vision large et ambitieuse — le petit ne te intéresse pas.', missing: 'La vision panoramique n\'est pas innée — développe-la en prenant régulièrement du recul sur tes projets.' },
};

/* ══ LO SHU PLAN NAMES (French) ══ */
const LS_PLAN_ADVICE: Record<string, string> = {
  'Mental (1,2,3)': 'Pensée, analyse et créativité — le triangle de l\'intelligence.',
  'Émotionnel (4,5,6)': 'Structure, liberté et responsabilité — le triangle de l\'équilibre intérieur.',
  'Pratique (7,8,9)': 'Réflexion, exécution et vision — le triangle de l\'accomplissement.',
  'Vision (1,5,9)': 'La diagonale montante — du verbe (1) au centre (5) à la vision (9). L\'axe du leader.',
  'Volonté (3,5,7)': 'La diagonale descendante — de l\'imagination (3) au centre (5) à l\'analyse (7). L\'axe du sage.',
};

/* ══ LO SHU GRID ORDER ══ */
const LS_ORDER = [[4,9,2],[3,5,7],[8,1,6]];

export default function ProfileTab({ data, bd, bt, gender = 'M', fn = '' }: { data: SoulData; bd: string; bt?: string; gender?: 'M' | 'F'; fn?: string }) {
  const { num, astro, cz, iching } = data;
  const [isGenerating, setIsGenerating] = useState(false);

  // ── Inclusion numéro — V9 Sprint 5 ──
  const inclName = num.full || fn;
  const incl: InclusionDisplay | null = inclName.trim().length > 2 ? calcInclusionDisplay(inclName) : null;

  // ── Carte Natale Tarot — V9 Sprint 6 ──
  const birthCardNum = calcBirthCard(bd);
  const birthCard = getArcana(birthCardNum);

  // ── Pinnacles & Challenges — V9 Sprint 7a ──
  const pinnacles = calcPinnacles(bd);
  const challenges = calcChallenges(bd);
  const _pinnToday = new Date().toISOString().split('T')[0];
  const activePinnIdx = getActivePinnacleIdx(bd, _pinnToday, num.lp);
  const _lpS = num.lp.v > 9 ? (() => { let v = num.lp.v; while (v > 9) v = [...String(v)].map(Number).reduce((s, d) => s + d, 0); return v; })() : num.lp.v;
  const _p1End = 36 - _lpS;
  const pinnacleAges = [
    { start: 0,          end: _p1End },
    { start: _p1End + 1, end: _p1End + 9 },
    { start: _p1End + 10, end: _p1End + 18 },
    { start: _p1End + 19, end: 99 },
  ];

  // ── Descriptions pédagogiques Sommets & Défis ──
  const PINNACLE_DESC: Record<number, string> = {
    1: 'Période d\'affirmation de soi — tu apprends à prendre l\'initiative et à croire en tes propres décisions.',
    2: 'Période de coopération — tu apprends la diplomatie, la patience et l\'art de travailler avec les autres.',
    3: 'Période de créativité — tu es poussé à toi exprimer, créer, communiquer et rayonner.',
    4: 'Période de construction — tu poses des bases solides, avec méthode, discipline et persévérance.',
    5: 'Période d\'aventure — tu explores, voyages (intérieurement ou physiquement) et accueilles le changement.',
    6: 'Période d\'harmonie — tu es centré sur la famille, les responsabilités et le soin des autres.',
    7: 'Période de réflexion — tu cherches des réponses profondes, développe ton intuition et ta sagesse.',
    8: 'Période de pouvoir — tu développes ton ambition, ton sens des affaires et ton leadership.',
    9: 'Période d\'accomplissement — te donne au monde, avec compassion, générosité et vision large.',
    11: 'Période d\'illumination — ton intuition est décuplée, tu inspires les autres par ta vision.',
    22: 'Période de maître bâtisseur — tu réalises des projets d\'envergure qui marquent durablement.',
    33: 'Période de guérison — tu irradies l\'amour inconditionnel et accompagnes les autres dans leur chemin.',
  };
  const CHALLENGE_NAME: Record<number, string> = {
    0: 'Choix Libre', 1: 'Affirmation', 2: 'Patience', 3: 'Expression',
    4: 'Discipline', 5: 'Changement', 6: 'Équilibre', 7: 'Intuition',
    8: 'Pouvoir', 9: 'Détachement',
  };
  const CHALLENGE_DESC: Record<number, string> = {
    0: 'Le défi du choix libre — tous les chemins s\'ouvrent à toi, le plus dur est de choisir.',
    1: 'Apprendre à s\'affirmer sans écraser les autres — trouver sa voix propre.',
    2: 'Apprendre la patience et le compromis — ne pas tout porter seul, accepter l\'aide.',
    3: 'Apprendre à exprimer ses émotions et sa créativité — ne pas tout garder à l\'intérieur.',
    4: 'Apprendre la discipline sans rigidité — construire sans s\'enfermer dans la routine.',
    5: 'Apprendre à accueillir le changement — sortir de la zone de confort sans se disperser.',
    6: 'Apprendre l\'équilibre entre donner et recevoir — ne pas se sacrifier pour les autres.',
    7: 'Apprendre à faire confiance à son intuition — ne pas tout analyser, lâcher prise.',
    8: 'Apprendre à gérer le pouvoir et l\'argent — ambition saine, sans obsession.',
    9: 'Apprendre le détachement — donner sans attendre en retour, accepter les fins.',
  };
  const CHALLENGE_ORIGIN: string[] = [
    'Jour − Mois', 'Jour − Année', 'Défi 1 − Défi 2', 'Mois − Année',
  ];

  // ── Descriptions Année Personnelle (cycle de 9) ──
  const PY_DESC: Record<number, { name: string; theme: string; conseil: string }> = {
    1: { name: 'Nouveau Départ', theme: 'Lancement, initiative, indépendance', conseil: 'Ose commencer quelque chose de neuf — c\'est le moment de planter les graines.' },
    2: { name: 'Patience', theme: 'Coopération, attente, diplomatie', conseil: 'Laisse mûrir ce que tu as semé — l\'année demande de la patience et des alliances.' },
    3: { name: 'Créativité', theme: 'Expression, joie, communication', conseil: 'Exprime-toi, crée, partage tes idées — ton énergie créative est à son maximum.' },
    4: { name: 'Construction', theme: 'Travail, fondations, discipline', conseil: 'Bâtis avec méthode — c\'est l\'année où les efforts concrets portent leurs fruits.' },
    5: { name: 'Liberté', theme: 'Changement, mouvement, aventure', conseil: 'Accueille l\'imprévu — l\'année pousse à sortir de la routine et explorer.' },
    6: { name: 'Harmonie', theme: 'Famille, responsabilités, amour', conseil: 'Investis dans tes relations proches — l\'année est centrée sur la famille et l\'harmonie.' },
    7: { name: 'Introspection', theme: 'Réflexion, solitude, sagesse', conseil: 'Prends du recul pour mieux comprendre — l\'année invite à la réflexion profonde.' },
    8: { name: 'Récolte', theme: 'Pouvoir, abondance, réussite', conseil: 'Récolte les fruits de tes efforts — l\'année est propice aux avancées matérielles.' },
    9: { name: 'Accomplissement', theme: 'Bilan, lâcher-prise, transition', conseil: 'Fais le tri et laisse partir ce qui ne sert plus — un cycle se termine pour en ouvrir un nouveau.' },
    11: { name: 'Illumination', theme: 'Intuition, vision, inspiration', conseil: 'Ta intuition est décuplée — fais confiance à tes ressentis, même les plus subtils.' },
    22: { name: 'Grand Œuvre', theme: 'Réalisation majeure, ambition', conseil: 'L\'année porte des projets d\'envergure — pensez grand, construis pour le long terme.' },
    33: { name: 'Maître Guérisseur', theme: 'Amour inconditionnel, guidance, dévouement', conseil: 'Année exceptionnellement rare — tu es appelé à guider, soigner et inspirer par l\'amour. Ta compassion est ton plus grande force.' },
  };

  // ── Yi King natal ──
  const natal = calcNatalIChing(bd);
  const natalProf = getHexProfile(natal.hexNum);

  // ── Dual Life Path ──
  const lpHoriz = calcLifePathHorizontal(bd);
  const hasMasterLP = lpHoriz.m && lpHoriz.v !== num.lp.v;
  const lpDisplay = hasMasterLP ? `${lpHoriz.v}/${num.lp.v}` : `${num.lp.v}`;
  const lpMain = hasMasterLP ? lpHoriz : num.lp;

  // ── Detect master numbers ──
  const masterList = (
    [['CdV', hasMasterLP ? lpHoriz : num.lp], ['Expr', num.expr], ['Âme', num.soul], ['Pers', num.pers], ['Mat', num.mat]] as [string, { v: number; m?: boolean }][]
  ).filter(([, x]) => x.m);

  // ── Lo Shu strong/missing ──
  const lsStrong: number[] = [];
  const lsMissing: number[] = [];
  LS_ORDER.forEach((row, ri) => row.forEach((n, ci) => {
    if (num.ls.grid[ri][ci] > 0) lsStrong.push(n);
    else lsMissing.push(n);
  }));

  // ── Chinese zodiac traits ──
  const czT = CZ_TRAITS[cz.animal] || CZ_TRAITS['Serpent'];
  const czE = CZ_ELEM[cz.elem] || '';

  // ── Badges temporalité ──
  const Badge = ({ type }: { type: 'fixe' | 'cycle' | 'decennal' }) => {
    const cfg = {
      fixe:     { bg: '#60a5fa15', color: '#60a5fa', icon: '🔒', text: 'FIXE — ne change jamais' },
      cycle:    { bg: '#f59e0b15', color: '#f59e0b', icon: '🔄', text: 'CYCLE — change chaque année/mois/jour' },
      decennal: { bg: '#c084fc15', color: '#c084fc', icon: '📍', text: 'DÉCENNAL — change tous les 10 ans' },
    }[type];
    return <span style={{ background: cfg.bg, color: cfg.color, padding: '2px 8px', borderRadius: 4, fontWeight: 600, fontSize: 9, marginLeft: 6, whiteSpace: 'nowrap' }}>{cfg.icon} {cfg.text}</span>;
  };

  // ══════════════════════════════════════
  // ═══ CARTE ANNUELLE PNG — V9 Sprint 4 ═══
  // Canvas 2D natif (540×960) — zéro dépendance externe.
  // ══════════════════════════════════════
  async function generateAnnualCard() {
    setIsGenerating(true);
    await new Promise(r => setTimeout(r, 60)); // laisser le DOM se rafraîchir
    try {
      const year = new Date().getFullYear();
      const MOIS = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

      // Calcul des moyennes mensuelles (L1 uniquement — rapide)
      const monthAvg: { month: number; avg: number }[] = [];
      for (let m = 1; m <= 12; m++) {
        const previews = calcMonthPreviews(bd, num, cz, year, m, 0, null);
        const avg = Math.round(previews.reduce((s, p) => s + p.score, 0) / previews.length);
        monthAvg.push({ month: m, avg });
      }
      monthAvg.sort((a, b) => b.avg - a.avg);
      const top3 = monthAvg.slice(0, 3);

      // ── Canvas setup ──
      const W = 540, H = 960;
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d')!;

      // ── Helper : rectangle arrondi ──
      function rr(x: number, y: number, w: number, h: number, r: number) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
      }

      const GOLD = '#C9A84C'; const GOLD_L = '#E8C97A';
      const TEXT = '#e8e8f0'; const DIM = '#777788';

      // ── Fond dégradé sombre ──
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#0a0a0f'); bg.addColorStop(0.5, '#12121a'); bg.addColorStop(1, '#0d0d14');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      // ── Étoiles (entropie fixe via seed simple) ──
      ctx.fillStyle = 'rgba(201,168,76,0.25)';
      const seed = bd.split('').reduce((h, c) => h * 31 + c.charCodeAt(0), 0);
      for (let i = 0; i < 70; i++) {
        const t = (seed * (i + 1) * 2654435761) >>> 0;
        const x = (t % W); const y = ((t >> 10) % H);
        const r = ((t >> 20) % 3 === 0) ? 1.5 : 0.8;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }

      ctx.textAlign = 'center';

      // ── HEADER ──
      const hGrad = ctx.createLinearGradient(0, 0, W, 0);
      hGrad.addColorStop(0, 'rgba(201,168,76,0.0)');
      hGrad.addColorStop(0.5, 'rgba(201,168,76,0.14)');
      hGrad.addColorStop(1, 'rgba(201,168,76,0.0)');
      ctx.fillStyle = hGrad; ctx.fillRect(0, 0, W, 85);

      ctx.font = 'bold 22px Georgia,serif'; ctx.fillStyle = GOLD;
      ctx.fillText('✦  KAIRONAUTE  ✦', W / 2, 46);
      ctx.font = '12px Georgia,serif'; ctx.fillStyle = DIM;
      ctx.fillText('Oracle de Prédictivité Personnelle', W / 2, 66);

      ctx.strokeStyle = GOLD + '38'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(40, 82); ctx.lineTo(W - 40, 82); ctx.stroke();

      // ── Prénom + Zodiaque ──
      const nameStr = fn.trim() ? `${fn.trim()}  ·  ${cz.sym} ${cz.animal}` : `${cz.sym} ${cz.animal}`;
      ctx.font = '17px Georgia,serif'; ctx.fillStyle = TEXT;
      ctx.fillText(nameStr, W / 2, 112);

      // ── ANNÉE PERSONNELLE ──
      ctx.font = '11px Arial,sans-serif'; ctx.fillStyle = GOLD;
      ctx.fillText('ANNÉE PERSONNELLE', W / 2, 146);

      // Halo doré derrière le chiffre
      const halo = ctx.createRadialGradient(W / 2, 225, 15, W / 2, 225, 105);
      halo.addColorStop(0, 'rgba(201,168,76,0.18)'); halo.addColorStop(1, 'rgba(201,168,76,0)');
      ctx.fillStyle = halo; ctx.fillRect(W / 2 - 110, 145, 220, 165);

      ctx.font = 'bold 118px Georgia,serif'; ctx.fillStyle = GOLD_L;
      ctx.fillText(String(num.py.v), W / 2, 272);

      const pyInfo = getNumberInfo(num.py.v);
      ctx.font = 'italic 18px Georgia,serif'; ctx.fillStyle = TEXT;
      ctx.fillText(`«  ${pyInfo.k}  »`, W / 2, 310);

      ctx.strokeStyle = GOLD + '28'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(60, 330); ctx.lineTo(W - 60, 330); ctx.stroke();

      // ── TOP 3 FENÊTRES COSMIQUES ──
      ctx.font = '11px Arial,sans-serif'; ctx.fillStyle = GOLD;
      ctx.fillText(`TES FENÊTRES COSMIQUES  ${year}`, W / 2, 358);

      const BX = 80, BW = W - BX - 80, BH = 20, BY0 = 376;
      top3.forEach(({ month, avg }, i) => {
        const y = BY0 + i * 62;
        const barLen = (avg / 100) * BW;
        const alpha = i === 0 ? 'ff' : i === 1 ? 'bb' : '88';

        ctx.font = `bold 15px Georgia,serif`; ctx.fillStyle = TEXT; ctx.textAlign = 'left';
        ctx.fillText(MOIS[month], BX, y + 14);
        ctx.font = '12px Arial,sans-serif'; ctx.fillStyle = GOLD + alpha; ctx.textAlign = 'right';
        ctx.fillText(`${avg}%`, W - BX, y + 14);

        // Track
        ctx.fillStyle = 'rgba(255,255,255,0.04)'; rr(BX, y + 20, BW, BH, 4); ctx.fill();
        // Fill
        const barG = ctx.createLinearGradient(BX, 0, BX + barLen, 0);
        barG.addColorStop(0, GOLD + alpha); barG.addColorStop(1, GOLD_L + alpha);
        ctx.fillStyle = barG; rr(BX, y + 20, barLen, BH, 4); ctx.fill();

        ctx.textAlign = 'center';
      });

      const sepY = BY0 + 3 * 62 + BH + 28;
      ctx.strokeStyle = GOLD + '28'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(60, sepY); ctx.lineTo(W - 60, sepY); ctx.stroke();

      // ── HEXAGRAMME NATAL ──
      ctx.font = '11px Arial,sans-serif'; ctx.fillStyle = GOLD;
      ctx.fillText('HEXAGRAMME NATAL', W / 2, sepY + 30);
      ctx.font = 'bold 16px Georgia,serif'; ctx.fillStyle = TEXT;
      ctx.fillText(`☰  #${natal.hexNum}  —  ${natal.name}`, W / 2, sepY + 58);
      ctx.font = 'italic 14px Georgia,serif'; ctx.fillStyle = GOLD;
      ctx.fillText(`→  ${natal.keyword}`, W / 2, sepY + 82);

      // ── FOOTER ──
      const fGrad = ctx.createLinearGradient(0, H - 80, 0, H);
      fGrad.addColorStop(0, 'rgba(201,168,76,0)'); fGrad.addColorStop(1, 'rgba(201,168,76,0.09)');
      ctx.fillStyle = fGrad; ctx.fillRect(0, H - 80, W, 80);
      ctx.strokeStyle = GOLD + '28'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(40, H - 65); ctx.lineTo(W - 40, H - 65); ctx.stroke();
      ctx.font = '11px Arial,sans-serif'; ctx.fillStyle = DIM;
      ctx.fillText(`kaironaute.app  •  ${year}`, W / 2, H - 35);

      // ── EXPORT ──
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const filename = `kaironaute-${year}.png`;
        const file = new File([blob], filename, { type: 'image/png' });
        try {
          if (navigator.share && navigator.canShare?.({ files: [file] })) {
            await navigator.share({ files: [file], title: `Ma Carte Kaironaute ${year}` });
          } else { throw new Error('fallback'); }
        } catch {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = filename; a.click();
          setTimeout(() => URL.revokeObjectURL(url), 5000);
        }
      }, 'image/png');

    } finally { setIsGenerating(false); }
  }

  return (
    <div>
      {/* ══ NUMÉROLOGIE — Pythagore + Chaldéen ══ */}
      <Sec icon="✦" title="Numérologie — Pythagore & Chaldéen">
        <Cd>
          <div style={intro}>
            La numérologie pythagoricienne est née avec <b>Pythagore de Samos</b> (VIe siècle av. J.-C.), mathématicien et philosophe grec qui enseignait que « tout est nombre » — que les nombres ne sont pas de simples outils de calcul, mais les briques fondamentales de l'univers. Son école secrète à Crotone étudiait les rapports numériques dans la musique, les astres et la nature humaine. Aujourd'hui encore, sa méthode extrait des vibrations à partir de deux sources : ta <b>date de naissance</b> (qui donne le Chemin de Vie et le Jour) et les <b>lettres de ton prénom, 2e prénom et nom de naissance</b> (qui donnent l'Expression, l'Âme et la Personnalité). Six nombres-clés en découlent et révèlent ton architecture intérieure : <Badge type="fixe" />
          </div>

          {/* Master banner */}
          {masterList.length > 0 && (
            <div style={{ padding: '10px 14px', background: `${P.gold}0c`, border: `1px solid ${P.gold}22`, borderRadius: 8, marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: P.gold, fontWeight: 700 }}>
                ✦ {masterList.length > 1 ? `${masterList.length} nombres maîtres` : 'Nombre maître'} détecté{masterList.length > 1 ? 's' : ''} ({masterList.map(([l]) => l).join(', ')}) — profil rare à haut potentiel
              </div>
              <div style={{ fontSize: 11, color: P.textDim, marginTop: 4, lineHeight: 1.5 }}>
                Les nombres maîtres (11, 22, 33) portent une vibration supérieure. Ils amplifient le potentiel mais exigent plus de discipline pour être pleinement exprimés.
              </div>
            </div>
          )}

          {/* Orbs */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
            {([['CdV', hasMasterLP ? lpHoriz : num.lp], ['Expr', num.expr], ['Âme', num.soul], ['Pers', num.pers], ['Mat', num.mat], ['Jour', num.bday]] as [string, { v: number; m?: boolean }][]).map(([l, v]) => (
              <Orb key={l} v={v.v} sz={52} lb={l === 'CdV' ? `CdV ${lpDisplay}` : l} sub={getNumberInfo(v.v).k} gl={l === 'CdV'} />
            ))}
          </div>

          {/* Légende des 6 nombres */}
          <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 8, background: '#ffffff04', border: `1px solid ${P.cardBdr}` }}>
            <div style={{ fontSize: 10, color: P.gold, fontWeight: 700, letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>Les 6 nombres en bref</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: 10, color: P.textDim, lineHeight: 1.6 }}>
              <div><b style={{ color: P.textMid }}>CdV</b> = Chemin de Vie <span style={{ color: '#60a5fa' }}>📅</span> — ta mission de vie, pourquoi tu es là</div>
              <div><b style={{ color: P.textMid }}>Expr</b> = Expression <span style={{ color: '#f472b6' }}>✎</span> — ton savoir-faire, comment tu agis</div>
              <div><b style={{ color: P.textMid }}>Âme</b> = Nombre de l'Âme <span style={{ color: '#f472b6' }}>✎</span> — ta motivation profonde, ce qui te fait vibrer</div>
              <div><b style={{ color: P.textMid }}>Pers</b> = Personnalité <span style={{ color: '#f472b6' }}>✎</span> — l'image que tu renvoies aux autres</div>
              <div><b style={{ color: P.textMid }}>Mat</b> = Maturité <span style={{ color: '#a78bfa' }}>📅+✎</span> — CdV + Expression combinés, la sagesse qui se révèle après 40 ans</div>
              <div><b style={{ color: P.textMid }}>Jour</b> = Jour de Naissance <span style={{ color: '#60a5fa' }}>📅</span> — ta vibration innée, ton talent naturel brut</div>
            </div>
            <div style={{ marginTop: 6, fontSize: 9, color: P.textDim, lineHeight: 1.5 }}>
              <span style={{ color: '#60a5fa' }}>📅</span> = issu de ta date de naissance · <span style={{ color: '#f472b6' }}>✎</span> = issu de ton prénom + 2e prénom + nom de naissance · <span style={{ color: '#a78bfa' }}>📅+✎</span> = les deux combinés
            </div>
          </div>

          {/* Dual Life Path explanation */}
          {hasMasterLP && (
            <div style={{ marginTop: 14, padding: '10px 14px', background: `${P.gold}08`, borderRadius: 8, border: `1px solid ${P.gold}18` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: P.gold, marginBottom: 4 }}>Chemin de Vie {lpDisplay}</div>
              <div style={{ fontSize: 11, color: P.textMid, lineHeight: 1.6 }}>
                <b>Méthode Ducoz</b> (réduction par cycles) : {num.lp.ch.join(' → ')} = <b>{num.lp.v}</b> · <b>Méthode horizontale</b> (chiffre par chiffre) : {lpHoriz.ch.join(' → ')} = <b style={{ color: P.gold }}>{lpHoriz.v}</b> (maître nombre)
              </div>
              <div style={{ fontSize: 11, color: P.textDim, marginTop: 6, lineHeight: 1.5 }}>
                Ton CdV <b style={{ color: P.gold }}>{lpHoriz.v}</b> ({getNumberInfo(lpHoriz.v).k}) amplifie l'énergie du <b>{num.lp.v}</b> ({getNumberInfo(num.lp.v).k}). Les deux méthodes sont valides — tu vis sous l'influence de l'une ou l'autre selon les périodes de ta vie. Le maître nombre indique un potentiel supérieur qui demande plus de conscience pour être pleinement activé.
              </div>
            </div>
          )}

          {/* Detailed interpretations */}
          <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
            {([
              ['Chemin de Vie', lpMain.v, 'Ta mission fondamentale — ce pour quoi tu es ici'],
              ['Expression', num.expr.v, 'Ton savoir-faire — comment tu agis concrètement'],
              ['Âme', num.soul.v, 'Ta motivation profonde — ce qui te fait vibrer intérieurement'],
              ['Personnalité', num.pers.v, 'Ta vitrine — l\'image que les autres perçoivent de toi'],
              ['Maturité', num.mat.v, 'Ta sagesse tardive — énergie qui se renforce après 40 ans'],
            ] as [string, number, string][]).map(([label, v, role]) => {
              const nd = getDesc(label, v);
              const info = getNumberInfo(v);
              if (!nd) return null;
              return (
                <div key={label} style={{ padding: '10px 12px', background: info.c + '08', borderRadius: 8, borderLeft: `3px solid ${info.c}40` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: info.c }}>{v}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: P.text }}>{label}</span>
                    <span style={{ fontSize: 10, color: P.textDim, marginLeft: 'auto' }}>{role}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#4ade80', lineHeight: 1.5, marginBottom: 3 }}>✦ {nd.q}</div>
                  <div style={{ fontSize: 11, color: '#ef4444aa', lineHeight: 1.5 }}>⚠ {nd.v}</div>
                </div>
              );
            })}
          </div>

          {/* ── Séparateur vers Chaldéen ── */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '16px 0' }} />
          <div style={{ fontSize: 10, color: '#4ade80', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 8 }}>☿ Chaldéen — Vibration sonore</div>

          <div style={intro}>
            Le système <b>Chaldéen</b> est la plus ancienne forme de numérologie connue, née à Babylone il y a environ 5 000 ans (~3000 av. J.-C.). Contrairement au système pythagoricien qui attribue les lettres dans l'ordre (A=1, B=2…), le Chaldéen se base sur la <b>vibration sonore</b> de chaque lettre — c'est-à-dire comment elle résonne quand tu la prononces. Il n'utilise que les chiffres 1 à 8 (le 9 étant considéré sacré). Concrètement : on additionne les valeurs de chaque lettre de ton <b style={{ color: P.text }}>premier prénom + nom de famille</b> (hors 2e prénom), puis on réduit jusqu'à obtenir un chiffre. Ce chiffre révèle ton énergie telle que les autres la perçoivent à travers ton nom. <Badge type="fixe" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Orb v={num.ch.rd.v} sz={56} lb="Chaldéen" />
            <div>
              <div style={{ fontSize: 13, color: P.textMid }}>
                Composé <b style={{ fontSize: 16 }}>{num.ch.cp}</b> → réduit à <b style={{ color: getNumberInfo(num.ch.rd.v).c, fontSize: 16 }}>{num.ch.rd.v}</b> ({getNumberInfo(num.ch.rd.v).k})
              </div>
              <div style={{ fontSize: 10, color: P.textDim, marginTop: 4 }}>
                Basé sur ton premier prénom + nom de naissance
              </div>
            </div>
          </div>

          {/* Différence Pythagore vs Chaldéen */}
          <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 8, background: '#ffffff04', border: `1px solid ${P.cardBdr}` }}>
            <div style={{ fontSize: 10, color: P.gold, fontWeight: 700, letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>Pythagore vs Chaldéen — quelle différence ?</div>
            <div style={{ fontSize: 11, color: P.textDim, lineHeight: 1.7 }}>
              Le <b style={{ color: P.textMid }}>Pythagoricien</b> (vu plus haut) utilise ton prénom complet + 2e prénom + nom, et attribue les lettres dans l'ordre alphabétique (A=1, B=2… I=9, J=1…). Le <b style={{ color: P.textMid }}>Chaldéen</b> utilise seulement ton premier prénom + nom, et attribue les valeurs selon le <i>son</i> de chaque lettre, pas sa position dans l'alphabet. Si les deux systèmes donnent le même chiffre, c'est une confirmation forte de cette énergie.
            </div>
          </div>

          {D[num.ch.rd.v]?.expr && (
            <div style={{ marginTop: 10, padding: '8px 12px', background: getNumberInfo(num.ch.rd.v).c + '08', borderRadius: 8, borderLeft: `3px solid ${getNumberInfo(num.ch.rd.v).c}40` }}>
              <div style={{ fontSize: 11, color: '#4ade80', lineHeight: 1.5, marginBottom: 3 }}>✦ {D[num.ch.rd.v].expr.q}</div>
              <div style={{ fontSize: 11, color: '#ef4444aa', lineHeight: 1.5 }}>⚠ {D[num.ch.rd.v].expr.v}</div>
            </div>
          )}
          {num.ch.rd.v === num.lp.v && (
            <div style={{ marginTop: 8, fontSize: 11, color: P.gold, fontWeight: 600, padding: '6px 10px', background: `${P.gold}08`, borderRadius: 6 }}>
              🌟 Ton Chaldéen ({num.ch.rd.v}) = ton Chemin de Vie — double confirmation de ton énergie fondamentale.
            </div>
          )}
        </Cd>
      </Sec>

      {/* ══ BAZI — Astrologie Chinoise Complète ══ */}
      {(() => {
        try {
          const birthDate = new Date(bd + 'T12:00:00');
          const natalBazi = calcBaZiDaily(birthDate, birthDate, 50);
          const peach = getPeachBlossom(birthDate, birthDate);
          const dmStem = natalBazi.dailyStem;
          const peachBranch = peach.peachBranch;
          const peachLabel = peach.label;
          const BAZI_COLORS: Record<string, string> = { 'Bois': '#4ade80', 'Feu': '#ef4444', 'Terre': '#eab308', 'Métal': '#94a3b8', 'Eau': '#60a5fa' };
          const dmColor = BAZI_COLORS[dmStem.element] ?? '#94a3b8';
          return (
            <Sec icon="☯" title={`BaZi 八字 — ${cz.sym} ${cz.animal} de ${cz.elem} · ${dmStem.chinese} ${dmStem.pinyin}`}>
              <Cd>
                <div style={intro}>
                  Le <b>BaZi</b> (八字, « Huit Caractères ») est l'un des systèmes de connaissance de soi les plus anciens au monde. Né sous la <b>dynastie Tang</b> (618-907), perfectionné par le maître <b>Xu Ziping</b> sous la dynastie Song (~1000 ap. J.-C.), il est encore consulté par des millions de personnes en Asie pour les décisions de carrière, de partenariat et de timing. Il se fonde sur le <b>calendrier solaire chinois</b> et les cycles des <b>5 éléments</b> (Bois, Feu, Terre, Métal, Eau). <Badge type="fixe" />
                </div>

                {/* ── Signe Chinois (ex-section Zodiaque) ── */}
                <div style={{ fontSize: 10, color: P.gold, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 8 }}>🐉 Ton signe chinois</div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 12 }}>
                  <div style={{ fontSize: 52, lineHeight: 1, flexShrink: 0 }}>{cz.sym}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: P.text }}>
                      {cz.animal} <span style={{ color: cz.elemCol, fontSize: 14 }}>de {cz.elem}</span>
                      <span style={{ fontSize: 12, color: P.textDim, fontWeight: 400, marginLeft: 8 }}>{cz.yy} · Année {cz.correctedYear}</span>
                    </div>
                    <div style={{ fontSize: 12, color: P.textMid, marginTop: 6, lineHeight: 1.6 }}>
                      {czT.desc}
                    </div>
                  </div>
                </div>

                {/* Element */}
                <div style={{ padding: '8px 12px', background: cz.elemCol + '10', borderRadius: 8, borderLeft: `3px solid ${cz.elemCol}40`, marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: cz.elemCol }}>Élément : {cz.elem}</div>
                  <div style={{ fontSize: 11, color: P.textMid, lineHeight: 1.5, marginTop: 2 }}>{czE}</div>
                </div>

                {/* Qualités + Vigilance */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                  <div style={{ padding: '8px 10px', background: `${P.green}0a`, borderRadius: 8, border: `1px solid ${P.green}18` }}>
                    <div style={{ fontSize: 9, color: P.green, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>✦ Qualités</div>
                    <div style={{ fontSize: 11, color: P.green, marginTop: 4, lineHeight: 1.5 }}>{czT.q}</div>
                  </div>
                  <div style={{ padding: '8px 10px', background: '#ef44440a', borderRadius: 8, border: '1px solid #ef444418' }}>
                    <div style={{ fontSize: 9, color: '#ef4444', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>⚠ Vigilance</div>
                    <div style={{ fontSize: 11, color: '#ef4444aa', marginTop: 4, lineHeight: 1.5 }}>{czT.v}</div>
                  </div>
                </div>

                {/* Relations animales */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 16 }}>
                  <div style={{ padding: '7px 9px', background: `${P.green}0a`, borderRadius: 6, border: `1px solid ${P.green}18` }}>
                    <div style={{ fontSize: 9, color: P.green, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>✦ Alliés (triade)</div>
                    <div style={{ fontSize: 12, color: P.green, marginTop: 2 }}>{cz.compat.map(c => c.s + ' ' + c.a).join(' · ')}</div>
                    <div style={{ fontSize: 9, color: P.textDim, marginTop: 2 }}>Énergie complémentaire naturelle</div>
                  </div>
                  <div style={{ padding: '7px 9px', background: `${P.gold}0a`, borderRadius: 6, border: `1px solid ${P.gold}18` }}>
                    <div style={{ fontSize: 9, color: P.gold, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>✦ Ami secret (六合)</div>
                    <div style={{ fontSize: 12, color: P.gold, marginTop: 2 }}>{cz.sf.s} {cz.sf.a}</div>
                    <div style={{ fontSize: 9, color: P.textDim, marginTop: 2 }}>Lien karmique caché — complicité instinctive</div>
                  </div>
                  <div style={{ padding: '7px 9px', background: `${P.red}0a`, borderRadius: 6, border: `1px solid ${P.red}18` }}>
                    <div style={{ fontSize: 9, color: P.red, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>⚡ Clash (六冲)</div>
                    <div style={{ fontSize: 12, color: P.red, marginTop: 2 }}>{cz.clash.s} {cz.clash.a}</div>
                    <div style={{ fontSize: 9, color: P.textDim, marginTop: 2 }}>Opposition frontale — relation de tension</div>
                  </div>
                  <div style={{ padding: '7px 9px', background: `${P.orange}0a`, borderRadius: 6, border: `1px solid ${P.orange}18` }}>
                    <div style={{ fontSize: 9, color: P.orange, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>⚠ Tensions</div>
                    <div style={{ fontSize: 12, color: P.orange, marginTop: 2 }}>
                      {cz.harm ? <>{cz.harm.s} {cz.harm.a} (harm)</> : '—'}
                      {cz.pun && <span style={{ marginLeft: 6, color: P.orange + '88' }}>⊘ {cz.pun.s} {cz.pun.a}</span>}
                    </div>
                    <div style={{ fontSize: 9, color: P.textDim, marginTop: 2 }}>Frictions subtiles — vigilance recommandée</div>
                  </div>
                </div>

                {/* ── Séparateur vers Pilier du Jour ── */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginBottom: 16 }} />
                <div style={{ fontSize: 10, color: '#ef4444', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 8 }}>☯ Pilier du Jour — {dmStem.chinese} {dmStem.pinyin}</div>
                <div style={{ fontSize: 11, color: P.textDim, lineHeight: 1.6, marginBottom: 12, fontStyle: 'italic' }}>
                  Ton Pilier du Jour — la combinaison de ton Tronc Céleste et de ta Branche Terrestre au moment de ta naissance — est ton ADN énergétique. La <b>Fleur de Pêcher</b> (桃花, Táo Huā) indique ton magnétisme naturel et les jours où il est amplifié.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {/* Maître du Jour */}
                  <div style={{ padding: '12px 14px', borderRadius: 10, background: `${dmColor}10`, border: `1px solid ${dmColor}25` }}>
                    <div style={{ fontSize: 28, textAlign: 'center', marginBottom: 6 }}>{dmStem.chinese}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: P.text, textAlign: 'center' }}>{dmStem.pinyin}</div>
                    <div style={{ fontSize: 11, color: dmColor, textAlign: 'center', marginTop: 2 }}>{dmStem.element} {dmStem.yinYang === 'Yang' ? '☀️ Yang' : '🌙 Yin'}</div>
                    <div style={{ fontSize: 10, color: P.gold, textAlign: 'center', marginTop: 4, fontWeight: 600 }}>
                      « {dmStem.archetype} »
                    </div>
                    <div style={{ fontSize: 10, color: P.textDim, textAlign: 'center', marginTop: 4, lineHeight: 1.5 }}>
                      Ton Maître du Jour natal — l'énergie que tu projettes chaque jour
                    </div>
                  </div>
                  {/* Fleur de Pêcher */}
                  <div style={{ padding: '12px 14px', borderRadius: 10, background: '#f472b610', border: '1px solid #f472b625' }}>
                    <div style={{ fontSize: 28, textAlign: 'center', marginBottom: 6 }}>🌸</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#f472b6', textAlign: 'center' }}>Fleur de Pêcher : {peachBranch.animal} ({peachBranch.chinese})</div>
                    <div style={{ fontSize: 11, color: '#f472b6aa', textAlign: 'center', marginTop: 2 }}>桃花 Táo Huā</div>
                    <div style={{ fontSize: 10, color: P.textDim, textAlign: 'center', marginTop: 6, lineHeight: 1.5 }}>
                      Les jours où la branche terrestre du jour = {peachLabel}, ton charme est amplifié
                    </div>
                  </div>
                </div>

                {/* Lecture du Maître du Jour */}
                <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 8, background: P.surface, border: `1px solid ${P.cardBdr}` }}>
                  <div style={{ fontSize: 10, color: dmColor, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 6 }}>☯ Ta signature énergétique</div>
                  <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.7 }}>
                    <b style={{ color: dmColor }}>{dmStem.pinyin}</b> ({dmStem.element} {dmStem.yinYang === 'Yang' ? 'Yang' : 'Yin'}), archétype « {dmStem.archetype} », est ta signature profonde — pas ce que tu montres au monde, mais ce que tu <i>êtes</i> fondamentalement.{' '}
                    <b style={{ color: P.green }}>Force :</b> {dmStem.strength}{' '}
                    <b style={{ color: '#ef4444' }}>Talon d'Achille :</b> {dmStem.risk}{' '}
                    <b style={{ color: P.gold }}>Conseil stratégique :</b> {dmStem.businessAdvice}
                  </div>
                </div>

                {/* Lecture Fleur de Pêcher + prochaines dates */}
                <div style={{ marginTop: 6, padding: '10px 14px', borderRadius: 8, background: '#f472b606', border: '1px solid #f472b615' }}>
                  <div style={{ fontSize: 10, color: '#f472b6', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 6 }}>🌸 Ton magnétisme naturel</div>
                  <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.7 }}>
                    Ta Fleur de Pêcher est le <b style={{ color: '#f472b6' }}>{peachBranch.animal}</b> ({peachBranch.chinese}).{' '}
                    En BaZi classique, elle indique les jours où ton charme, ton pouvoir de persuasion et ton attractivité sont naturellement amplifiés — idéal pour les pitchs, les négociations relationnelles ou les premières impressions.
                  </div>

                  {/* Prochaines dates Fleur de Pêcher */}
                  {(() => {
                    try {
                      const today = new Date();
                      const todayBranch = calcDayMaster(today).branch.index;
                      const peachIdx = peachBranch.index;
                      const daysUntil = ((peachIdx - todayBranch) % 12 + 12) % 12;
                      const nextDates: Date[] = [];
                      for (let i = 0; i < 4; i++) {
                        const d = new Date(today);
                        d.setDate(d.getDate() + daysUntil + (i * 12));
                        nextDates.push(d);
                      }
                      const isToday = daysUntil === 0;
                      const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
                      return (
                        <div style={{ marginTop: 10, padding: '8px 12px', background: '#f472b60a', borderRadius: 6, border: '1px solid #f472b618' }}>
                          {isToday && (
                            <div style={{ fontSize: 11, color: '#f472b6', fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ background: '#f472b620', padding: '2px 8px', borderRadius: 4, fontSize: 10 }}>🌸 AUJOURD'HUI</span>
                              C'est ton jour Fleur de Pêcher — charme amplifié !
                            </div>
                          )}
                          <div style={{ fontSize: 10, color: '#f472b6aa', fontWeight: 600, marginBottom: 4 }}>
                            {isToday ? '📅 Prochains jours' : `📅 Tes prochains jours ${peachBranch.animal} (${peachBranch.chinese})`} — cycle de 12 jours
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {nextDates.map((d, i) => (
                              <span key={i} style={{
                                padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                                background: i === 0 && isToday ? '#f472b620' : '#f472b60a',
                                color: i === 0 && isToday ? '#f472b6' : '#f472b6aa',
                                border: `1px solid ${i === 0 && isToday ? '#f472b640' : '#f472b615'}`,
                              }}>
                                {fmt(d)}
                                {i === 0 && !isToday && <span style={{ fontSize: 9, marginLeft: 4, color: '#f472b666' }}>({daysUntil}j)</span>}
                              </span>
                            ))}
                          </div>
                          <div style={{ fontSize: 10, color: P.textDim, marginTop: 6 }}>
                            💡 Ces jours-là, planifie tes réunions importantes, premiers rendez-vous ou présentations clés.
                          </div>
                        </div>
                      );
                    } catch { return null; }
                  })()}
                </div>

                {/* ── Séparateur vers Na Yin ── */}
                {(() => {
                  try {
                    const birthDate = new Date(bd + 'T12:00:00');
                    const nayin = getNaYin(birthDate);
                    const cs = getChangsheng(birthDate, birthDate);
                    const ELEM_COLORS: Record<string, string> = {
                      'Bois': '#4ade80', 'Feu': '#ef4444', 'Terre': '#eab308',
                      'Métal': '#a1a1aa', 'Eau': '#60a5fa',
                    };
                    const CAT_COLORS: Record<string, string> = {
                      puissant: '#ef4444', subtil: '#c084fc', stable: '#4ade80',
                      fluide: '#60a5fa', transformateur: '#f59e0b',
                    };
                    const csColor = cs.scoring.global >= 2 ? '#4ade80' : cs.scoring.global <= -2 ? '#ef4444' : '#eab308';
                    return (
                      <>
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '16px 0' }} />
                        <div style={{ fontSize: 10, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 8 }}>🎵 Na Yin & Changsheng — Mélodie intérieure</div>

                        <div style={intro}>
                          Le <b>Na Yin</b> (纳音, « son intériorisé ») est un concept qui remonte au <b>Livre des Mutations</b> (Yi Jing, ~1000 av. J.-C.) et qui a été intégré au BaZi sous la <b>dynastie Tang</b> (618-907). À l'origine, les Chinois avaient observé que les 12 tubes musicaux (律吕, Lǜ Lǚ) utilisés pour accorder les instruments de cour produisaient des harmoniques liées aux cycles célestes — chaque combinaison Tronc-Branche avait donc sa propre « note ». De là est née l'idée que chaque personne porte une <b>mélodie intérieure</b> unique, déterminée par sa naissance. Ta mélodie à toi, c'est le <strong>{nayin.entry.name_fr}</strong> — une qualité d'énergie qui colore tout ce que tu fais.
                          <br /><br />
                          Le <b>Changsheng</b> (长生, « cycle de vie ») complète le Na Yin en décrivant <b>où tu en es dans ton cycle</b> — comme les saisons d'un arbre : graine, pousse, floraison, fruit, repos. Les deux ensemble décrivent ta nature profonde et ton élan vital. <Badge type="fixe" />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          {/* Na Yin */}
                          <div style={{ padding: '12px 14px', borderRadius: 10, background: `${ELEM_COLORS[nayin.entry.element] || '#60a5fa'}10`, border: `1px solid ${ELEM_COLORS[nayin.entry.element] || '#60a5fa'}25` }}>
                            <div style={{ fontSize: 22, textAlign: 'center', marginBottom: 4 }}>{nayin.entry.name_cn}</div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: P.text, textAlign: 'center' }}>{nayin.entry.name_fr}</div>
                            <div style={{ fontSize: 10, color: ELEM_COLORS[nayin.entry.element] || '#60a5fa', textAlign: 'center', marginTop: 4 }}>
                              {nayin.entry.element} · 納音
                            </div>
                            <div style={{ display: 'inline-block', margin: '6px auto 0', fontSize: 9, padding: '2px 8px', borderRadius: 8, background: `${CAT_COLORS[nayin.entry.category] || '#888'}20`, color: CAT_COLORS[nayin.entry.category] || '#888', fontWeight: 600, textAlign: 'center', width: '100%' }}>
                              {nayin.entry.category.toUpperCase()}
                            </div>
                            <div style={{ fontSize: 10, color: P.textDim, textAlign: 'center', marginTop: 6, lineHeight: 1.5 }}>
                              {nayin.entry.description}
                            </div>
                          </div>
                          {/* Changsheng natal */}
                          <div style={{ padding: '12px 14px', borderRadius: 10, background: `${csColor}10`, border: `1px solid ${csColor}25` }}>
                            <div style={{ fontSize: 22, textAlign: 'center', marginBottom: 4 }}>{cs.scoring.chinese}</div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: P.text, textAlign: 'center' }}>{cs.scoring.label_fr.split('—')[0].trim()}</div>
                            <div style={{ fontSize: 10, color: csColor, textAlign: 'center', marginTop: 4 }}>
                              {cs.dmElement} · 十二長生
                            </div>
                            <div style={{ fontSize: 10, color: P.textDim, textAlign: 'center', marginTop: 6, lineHeight: 1.5 }}>
                              {cs.scoring.label_fr}
                            </div>
                          </div>
                        </div>
                        {/* Na Yin advice */}
                        <div style={{ padding: '10px 12px', borderRadius: 8, background: P.surface, border: `1px solid ${P.cardBdr}`, fontSize: 11, color: P.textMid, lineHeight: 1.6, marginTop: 10 }}>
                          <span style={{ fontWeight: 700, color: P.gold }}>Conseil Na Yin : </span>
                          {nayin.advice}
                        </div>

                        {/* Lecture approfondie Na Yin */}
                        <div style={{ marginTop: 8, padding: '10px 14px', borderRadius: 8, background: `${ELEM_COLORS[nayin.entry.element] || '#60a5fa'}06`, border: `1px solid ${ELEM_COLORS[nayin.entry.element] || '#60a5fa'}15` }}>
                          <div style={{ fontSize: 10, color: ELEM_COLORS[nayin.entry.element] || '#60a5fa', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 6 }}>🎵 Ce que ton Na Yin révèle</div>
                          <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.7 }}>
                            Ta mélodie natale est <b style={{ color: ELEM_COLORS[nayin.entry.element] || '#60a5fa' }}>{nayin.entry.name_fr}</b> ({nayin.entry.name_cn}) — {nayin.entry.description.charAt(0).toLowerCase() + nayin.entry.description.slice(1)}{' '}
                            Cette énergie est de nature <b>{nayin.entry.category}</b> : {
                              nayin.entry.category === 'puissant' ? 'elle te donne une force brute qui impressionne et qui ouvre les portes — à condition de la canaliser. En négociation, tu as un avantage naturel : ta présence impose le respect avant même que tu ne parles.' :
                              nayin.entry.category === 'subtil' ? 'elle opère en coulisses, influençant sans que les autres le réalisent. Ta puissance est discrète mais réelle — en stratégie, c\'est un atout majeur : on ne se méfie pas de ce qu\'on ne voit pas.' :
                              nayin.entry.category === 'stable' ? 'elle t\'ancre dans la durée. Ce que tu construis résiste au temps et aux tempêtes. Tes partenaires et clients te font confiance parce que tu dégages une solidité qu\'on ne peut pas simuler.' :
                              nayin.entry.category === 'fluide' ? 'elle te rend adaptable et insaisissable. Là où d\'autres se heurtent aux obstacles, tu les contournes avec élégance. En période de crise, tu es celui qui trouve la sortie pendant que les autres paniquent.' :
                              'elle te pousse vers la mutation perpétuelle. Chaque fin est un début déguisé — ta capacité à te réinventer est ta plus grande force entrepreneuriale.'
                            }
                          </div>
                        </div>

                        {/* Lecture approfondie Changsheng */}
                        <div style={{ marginTop: 6, padding: '10px 14px', borderRadius: 8, background: `${csColor}06`, border: `1px solid ${csColor}15` }}>
                          <div style={{ fontSize: 10, color: csColor, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 6 }}>🔄 Ta phase de vie natale</div>
                          <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.7 }}>
                            Tu es né en phase <b style={{ color: csColor }}>{cs.scoring.label_fr.split('—')[0].trim()}</b> ({cs.scoring.chinese}) — {cs.scoring.label_fr.split('—')[1]?.trim() || 'énergie en transition'}.{' '}
                            {cs.scoring.global >= 3 ? 'C\'est une position d\'énergie maximale — tu es venu au monde avec un capital vital puissant. L\'enjeu n\'est pas de trouver l\'énergie, mais de ne pas la gaspiller.' :
                             cs.scoring.global >= 1 ? 'C\'est une position favorable — ton énergie natale est en phase ascendante. Tu as un élan naturel qui pousse tes projets vers l\'avant, même quand la motivation faiblit.' :
                             cs.scoring.global === 0 ? 'C\'est une position de potentiel latent — l\'énergie est là, en gestation, prête à se déployer au bon moment. Ta patience sera récompensée.' :
                             cs.scoring.global >= -2 ? 'C\'est une position de transition — ta force ne vient pas de l\'élan mais de la profondeur. Tu transformes les obstacles en carburant, ce que les profils « faciles » ne savent pas faire.' :
                             'C\'est une position de transformation radicale — tu portes en toi la capacité de renaître de tes cendres, un atout rare. Les plus grands entrepreneurs ont souvent des phases basses natales : la difficulté forge la résilience.'
                            }
                          </div>
                        </div>

                        {/* Croisement Na Yin × Changsheng */}
                        <div style={{ marginTop: 6, padding: '10px 14px', borderRadius: 8, background: `${P.gold}06`, border: `1px solid ${P.gold}15` }}>
                          <div style={{ fontSize: 10, color: P.gold, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 6 }}>🌟 Na Yin × Changsheng — ta combinaison unique</div>
                          <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.7 }}>
                            Un « {nayin.entry.name_fr} » en phase « {cs.scoring.label_fr.split('—')[0].trim()} » crée un profil {
                              nayin.entry.category === 'fluide' && cs.scoring.global >= 1 ? 'qui surfe les opportunités avec un timing naturel — ton adaptabilité est amplifiée par un bon élan vital.' :
                              nayin.entry.category === 'fluide' && cs.scoring.global <= 0 ? 'qui doit cultiver sa flexibilité pour compenser une énergie qui monte lentement — la patience et l\'observation seront tes accélérateurs.' :
                              nayin.entry.category === 'puissant' && cs.scoring.global >= 1 ? 'de force vive — tu avances avec impact et vélocité. Attention à ne pas brûler les étapes.' :
                              nayin.entry.category === 'puissant' && cs.scoring.global <= 0 ? 'de puissance contenue — comme un volcan dormant, ta force attend le bon moment pour éclater. Ne force pas le timing.' :
                              nayin.entry.category === 'stable' && cs.scoring.global >= 1 ? 'de constructeur né — fondations solides + élan naturel = empire durable.' :
                              nayin.entry.category === 'stable' && cs.scoring.global <= 0 ? 'de bâtisseur patient — tu construis lentement mais ce que tu crées dure des décennies.' :
                              nayin.entry.category === 'subtil' && cs.scoring.global >= 1 ? 'de stratège invisible — influence discrète amplifiée par une bonne énergie. Tes coups les plus efficaces sont ceux que personne ne voit venir.' :
                              nayin.entry.category === 'subtil' && cs.scoring.global <= 0 ? 'de veilleur — tu observes, analyses et frappes au moment précis. Ta patience est ton arme secrète.' :
                              cs.scoring.global >= 1 ? 'en transformation positive — le meilleur est devant toi, et tu as l\'énergie pour y aller.' :
                              'en gestation — prépare le terrain maintenant, la récolte viendra.'
                            }
                          </div>
                        </div>
                      </>
                    );
                  } catch { return null; }
                })()}
              </Cd>
            </Sec>
          );
        } catch { return null; }
      })()}

      {/* ══ QUATRE PILIERS 八字 (V4.2) ══ */}
      {bt && (() => {
        try {
          const birthDate = new Date(bd + 'T12:00:00');
          const hour = parseInt(bt.split(':')[0]);
          if (isNaN(hour)) return null;
          const fp = calcFourPillars(birthDate, hour);
          const PILLAR_LABELS = ['Année 年', 'Mois 月', 'Jour 日', 'Heure 時'];
          const pillars = [
            { ...fp.year, label: PILLAR_LABELS[0] },
            { ...fp.month, label: PILLAR_LABELS[1] },
            { ...fp.day, label: PILLAR_LABELS[2] },
            { stem: fp.hour.stem, branch: fp.hour.branch, label: PILLAR_LABELS[3] },
          ];
          const ELEM_COLORS: Record<string, string> = {
            'Bois': '#4ade80', 'Feu': '#ef4444', 'Terre': '#eab308',
            'Métal': '#a1a1aa', 'Eau': '#60a5fa',
          };
          return (
            <Sec icon="柱" title="Quatre Piliers — 八字">
              <Cd>
                <div style={intro}>
                  En astrologie chinoise, ta naissance est codée par <strong>8 caractères</strong> (八字 = "huit caractères") répartis en 4 colonnes qu'on appelle les <strong>Quatre Piliers</strong>. Chaque pilier est composé de deux symboles : un <strong>Tronc Céleste</strong> (en haut — l'énergie visible) et une <strong>Branche Terrestre</strong> (en bas — l'animal, l'énergie cachée). Chaque caractère est associé à un des 5 éléments (Bois, Feu, Terre, Métal, Eau) et une polarité (Yin ☾ ou Yang ☀).
                  {' '}<Badge type="fixe" />
                </div>

                <div className="grid-profile-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
                  {pillars.map((p, i) => {
                    const col = ELEM_COLORS[p.stem.element] || '#60a5fa';
                    const isDM = i === 2; // Jour = Maître du Jour
                    const PILLAR_MEANING = [
                      'Héritage familial et image sociale',
                      'Carrière, autorité et environnement',
                      'Ton essence profonde — qui tu es vraiment',
                      'Vie intérieure, intuition et maturité',
                    ];
                    return (
                      <div key={i} style={{
                        padding: '10px 6px', borderRadius: 10,
                        background: isDM ? `${col}15` : `${P.surface}`,
                        border: isDM ? `2px solid ${col}40` : `1px solid ${P.cardBdr}`,
                        textAlign: 'center',
                      }}>
                        <div style={{ fontSize: 9, color: P.textDim, letterSpacing: 1, marginBottom: 6, fontWeight: 600 }}>{p.label}</div>
                        <div style={{ fontSize: 24, marginBottom: 2 }}>{p.stem.chinese}</div>
                        <div style={{ fontSize: 20, marginBottom: 4 }}>{p.branch.chinese}</div>
                        <div style={{ fontSize: 10, color: col, fontWeight: 600 }}>
                          {p.stem.element} {p.stem.yinYang === 'Yang' ? '☀' : '☾'}
                        </div>
                        <div style={{ fontSize: 9, color: P.textDim, marginTop: 4 }}>
                          {p.branch.animal}
                        </div>
                        {isDM && <div style={{ fontSize: 8, color: col, fontWeight: 700, marginTop: 4, letterSpacing: 1 }}>MAÎTRE DU JOUR</div>}
                        <div style={{ fontSize: 9, color: P.textDim, marginTop: 6, lineHeight: 1.4, fontStyle: 'italic' }}>
                          {PILLAR_MEANING[i]}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Légende de lecture */}
                <div style={{ padding: '10px 12px', borderRadius: 8, background: '#ffffff04', border: `1px solid ${P.cardBdr}`, marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: P.gold, fontWeight: 700, letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>Comment lire tes piliers</div>
                  <div style={{ fontSize: 11, color: P.textDim, lineHeight: 1.7 }}>
                    Le <strong style={{ color: P.textMid }}>Pilier du Jour</strong> (encadré en bleu) est le plus important — c'est ton <strong style={{ color: P.textMid }}>Maître du Jour</strong>, ton identité énergétique profonde. Le caractère du haut ({fp.day.stem.chinese} = {fp.day.stem.element} {fp.day.stem.yinYang}) définit comment tu interagis avec le monde. Les 5 éléments interagissent entre eux : le Bois nourrit le Feu, le Feu produit la Terre, la Terre engendre le Métal, le Métal génère l'Eau, et l'Eau fait pousser le Bois. Quand deux piliers partagent des éléments compatibles, l'énergie circule bien. Quand ils s'opposent (ex: Eau vs Feu), il y a tension — mais aussi transformation.
                  </div>
                </div>

                {/* Pilier de l'Heure */}
                <div style={{ padding: '10px 12px', borderRadius: 8, background: `${P.surface}`, border: `1px solid ${P.cardBdr}`, fontSize: 12, color: P.textMid, lineHeight: 1.6 }}>
                  <span style={{ fontWeight: 700, color: P.gold }}>時柱 Pilier de l'Heure : </span>
                  {fp.hourNarrative}
                </div>
              </Cd>
            </Sec>
          );
        } catch { return null; }
      })()}

      {/* ══ LUCK PILLARS (大运) ══ */}
      {(() => {
        try {
          const birthDate = new Date(bd + 'T12:00:00');
          const lp = calculateLuckPillars(birthDate, gender);
          const THEME_COLORS: Record<string, string> = {
            same: '#60a5fa', produces: '#4ade80', produced_by: '#FFD700',
            destroys: '#ef4444', destroyed_by: '#f97316',
          };
          const THEME_ICONS: Record<string, string> = {
            same: '⚖️', produces: '🌱', produced_by: '🎁',
            destroys: '⚔️', destroyed_by: '🔥',
          };
          return (
            <Sec icon="🏛" title="Piliers de Destinée — 大运">
              <Cd>
                <div style={intro}>
                  Les Piliers de Destinée (大运, Dà Yùn) sont un pilier central de l'astrologie chinoise classique, utilisés depuis plus de mille ans par les praticiens BaZi. Ils découpent ta vie en cycles de 10 ans, chacun défini par un binôme Tronc-Branche qui colore l'énergie dominante de la décennie. Comprendre ton pilier actuel, c'est savoir quel vent souffle dans tes voiles. <Badge type="decennal" />
                </div>

                {/* Genre + direction */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center', padding: '6px 10px', background: gender === 'M' ? '#60a5fa0a' : '#f472b60a', borderRadius: 7, border: `1px solid ${gender === 'M' ? '#60a5fa20' : '#f472b620'}` }}>
                  <span style={{ fontSize: 14 }}>{gender === 'M' ? '♂' : '♀'}</span>
                  <span style={{ fontSize: 12, color: gender === 'M' ? '#60a5fa' : '#f472b6', fontWeight: 600 }}>{gender === 'M' ? 'Homme' : 'Femme'}</span>
                  <span style={{ fontSize: 10, color: P.textDim }}>
                    · Direction : {lp.direction === 'forward' ? '→ avant' : '← arrière'} · Début à {lp.startAge} ans
                  </span>
                </div>

                {/* Current Pillar highlight */}
                {lp.currentPillar && (
                  <div style={{
                    padding: '14px 16px', borderRadius: 12, marginBottom: 14,
                    background: `${THEME_COLORS[lp.currentPillar.themeKey]}0c`,
                    border: `1.5px solid ${THEME_COLORS[lp.currentPillar.themeKey]}30`,
                  }}>
                    <div style={{ fontSize: 11, color: P.gold, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 8 }}>
                      Pilier actuel — {lp.currentPillarYearsLeft} ans restants
                    </div>
                    <div style={{ fontSize: 13, color: P.text, lineHeight: 1.7 }}>
                      {getLuckPillarNarrative(lp.currentPillar, 'present', lp.currentPillarYearsLeft)}
                    </div>
                  </div>
                )}

                {/* 8 Pillars timeline */}
                <div className="grid-profile-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  {lp.pillars.map(p => {
                    const isCurrent = lp.currentPillar?.index === p.index;
                    const col = THEME_COLORS[p.themeKey] || '#60a5fa';
                    const icon = THEME_ICONS[p.themeKey] || '⚖️';
                    const isPast = p.endYear < new Date().getFullYear();
                    const isFuture = p.startYear > new Date().getFullYear();
                    return (
                      <div key={p.index} style={{
                        padding: '10px 8px', borderRadius: 10, textAlign: 'center',
                        background: isCurrent ? `${col}12` : P.surface,
                        border: `${isCurrent ? '2px' : '1px'} solid ${isCurrent ? `${col}50` : P.cardBdr}`,
                        opacity: isPast ? 0.6 : 1,
                        boxShadow: isCurrent ? `0 0 12px ${col}25` : 'none',
                      }}>
                        <div style={{ fontSize: 20, marginBottom: 2 }}>{p.stem.chinese}{p.branch.chinese}</div>
                        <div style={{ fontSize: 9, color: col, fontWeight: 700 }}>
                          {p.stem.element} {p.stem.yinYang === 'Yang' ? '☀' : '☾'}
                        </div>
                        <div style={{ fontSize: 10, color: P.textMid, marginTop: 4 }}>
                          {p.startAge}–{p.endAge} ans
                        </div>
                        <div style={{ fontSize: 9, color: P.textDim }}>
                          {p.startYear}–{p.endYear}
                        </div>
                        <div style={{ marginTop: 4, fontSize: 12 }}>{icon}</div>
                        <div style={{ fontSize: 8, color: col, marginTop: 2, fontWeight: 600 }}>
                          {p.themeKey === 'same' ? 'Identité' :
                           p.themeKey === 'produces' ? 'Création' :
                           p.themeKey === 'produced_by' ? 'Soutien' :
                           p.themeKey === 'destroys' ? 'Conquête' : 'Transformation'}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ fontSize: 10, color: P.textDim, marginTop: 10, fontStyle: 'italic', lineHeight: 1.5 }}>
                  Basé sur les Termes Solaires (节气) et la règle des 5 Tigres (五虎遁). Les dates de transition sont approximatives (±1 jour).
                </div>

                {/* Lecture chronologique — passé, présent, futur */}
                <div style={{ marginTop: 14, display: 'grid', gap: 6 }}>
                  {lp.pillars.map(p => {
                    const now = new Date().getFullYear();
                    const isPast = p.endYear < now;
                    const isCurrent = lp.currentPillar?.index === p.index;
                    const isFuture = p.startYear > now;
                    const col = THEME_COLORS[p.themeKey] || '#60a5fa';
                    const temporality = isCurrent ? 'present' : isPast ? 'past' : 'future';
                    const narrative = getLuckPillarNarrative(p, temporality, isCurrent ? lp.currentPillarYearsLeft : undefined);
                    const themeLabel = p.themeKey === 'same' ? 'Identité' :
                      p.themeKey === 'produces' ? 'Création' :
                      p.themeKey === 'produced_by' ? 'Soutien' :
                      p.themeKey === 'destroys' ? 'Conquête' : 'Transformation';
                    return (
                      <div key={p.index} style={{
                        padding: '8px 12px', borderRadius: 8,
                        background: isCurrent ? `${col}0c` : P.surface,
                        border: `1px solid ${isCurrent ? `${col}30` : P.cardBdr}`,
                        opacity: isPast ? 0.7 : 1,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 14 }}>{p.stem.chinese}{p.branch.chinese}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: col }}>{themeLabel}</span>
                          <span style={{ fontSize: 10, color: P.textDim }}>{p.startAge}–{p.endAge} ans · {p.startYear}–{p.endYear}</span>
                          {isCurrent && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: `${col}20`, color: col, fontWeight: 600, marginLeft: 'auto' }}>EN COURS</span>}
                          {isPast && <span style={{ fontSize: 9, color: P.textDim, marginLeft: 'auto' }}>passé</span>}
                        </div>
                        <div style={{ fontSize: 11, color: isCurrent ? P.text : P.textMid, lineHeight: 1.5 }}>{narrative}</div>
                      </div>
                    );
                  })}
                </div>
              </Cd>
            </Sec>
          );
        } catch { return null; }
      })()}

      {/* ══ LO SHU GRID ══ */}
      <Sec icon="⊞" title="Grille Lo Shu">
        <Cd>
          <div style={intro}>
            Le Lo Shu (洛書, « Écrit du fleuve Lo ») est un carré magique 3×3 découvert selon la légende sur la carapace d'une tortue il y a plus de 4 000 ans. Utilisé en Feng Shui et en numérologie chinoise, chaque case représente une énergie. Les cases remplies (issues de ta date de naissance) sont tes forces naturelles, les cases vides tes axes de développement. Le Moteur indique ta force d'action, la Direction indique ta trajectoire de vie. <Badge type="fixe" />
          </div>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 48px)', gap: 4 }}>
              {LS_ORDER.map((row, ri) => row.map((n, ci) => {
                const count = num.ls.grid[ri][ci];
                return (
                  <div key={`${ri}-${ci}`} style={{
                    width: 48, height: 48, borderRadius: 8,
                    background: count > 0 ? getNumberInfo(n).c + '18' : P.bg,
                    border: `1px solid ${count > 0 ? getNumberInfo(n).c + '33' : P.cardBdr}`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: count > 0 ? getNumberInfo(n).c : '#2a2540' }}>{n}</span>
                    <span style={{ fontSize: 9, color: count > 0 ? P.textMid : P.cardBdr }}>×{count}</span>
                  </div>
                );
              }))}
            </div>
            <div style={{ fontSize: 13, color: P.textMid, lineHeight: 2 }}>
              <div>Moteur : <b style={{ color: getNumberInfo(num.ls.dr.v).c }}>{num.ls.dr.v}</b> <span style={{ fontSize: 11, color: P.textDim }}>{getNumberInfo(num.ls.dr.v).k}</span></div>
              <div>Direction : <b style={{ color: getNumberInfo(num.ls.co.v).c }}>{num.ls.co.v}</b> <span style={{ fontSize: 11, color: P.textDim }}>{getNumberInfo(num.ls.co.v).k}</span></div>
              <div style={{ fontSize: 10, color: P.textDim, marginTop: 4 }}>
                Basé sur ta date de naissance
              </div>
            </div>
          </div>

          {/* Interpretive summary — Deep readings */}
          <div style={{ marginTop: 14, padding: '10px 12px', background: P.bg, borderRadius: 8, border: `1px solid ${P.cardBdr}` }}>
            <div style={{ fontSize: 11, color: P.green, fontWeight: 600, marginBottom: 8 }}>✦ Tes forces ({lsStrong.length} énergies actives)</div>
            <div style={{ display: 'grid', gap: 6 }}>
              {lsStrong.map(n => (
                <div key={n} style={{ fontSize: 11, color: P.textMid, lineHeight: 1.5 }}>
                  <b style={{ color: getNumberInfo(n).c }}>{n}</b> <span style={{ color: P.textDim }}>({LS_MEANING[n]})</span> — {LS_DEEP[n]?.present}
                </div>
              ))}
            </div>
            {lsMissing.length > 0 && <>
              <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 600, marginBottom: 6, marginTop: 12 }}>⚠ Axes de développement ({lsMissing.length} cases vides)</div>
              <div style={{ display: 'grid', gap: 6 }}>
                {lsMissing.map(n => (
                  <div key={n} style={{ fontSize: 11, color: P.textDim, lineHeight: 1.5 }}>
                    <b style={{ color: '#ef444488' }}>{n}</b> <span style={{ color: '#ef444466' }}>({LS_MEANING[n]})</span> — {LS_DEEP[n]?.missing}
                  </div>
                ))}
              </div>
            </>}
          </div>

          {/* Moteur × Direction — lecture croisée */}
          <div style={{ marginTop: 10, padding: '10px 12px', background: `${P.gold}06`, borderRadius: 8, border: `1px solid ${P.gold}15` }}>
            <div style={{ fontSize: 10, color: P.gold, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 6 }}>🧭 Lecture Moteur × Direction</div>
            <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.7 }}>
              Ton <b style={{ color: getNumberInfo(num.ls.dr.v).c }}>Moteur {num.ls.dr.v}</b> ({getNumberInfo(num.ls.dr.v).k}) est ce qui te met en mouvement chaque matin.
              Ta <b style={{ color: getNumberInfo(num.ls.co.v).c }}>Direction {num.ls.co.v}</b> ({getNumberInfo(num.ls.co.v).k}) est là où cette énergie t\'emmène à long terme.
              {num.ls.dr.v === num.ls.co.v
                ? ' Moteur et Direction identiques : ta trajectoire est d\'une cohérence rare — tu vas exactement là où ton énergie te pousse.'
                : ` Ensemble : ton élan de ${getNumberInfo(num.ls.dr.v).k.toLowerCase()} alimente une trajectoire de ${getNumberInfo(num.ls.co.v).k.toLowerCase()} — le « comment » nourrit le « où ».`
              }
            </div>
          </div>

          {/* Plans — enriched */}
          <div style={{ marginTop: 10, display: 'grid', gap: 5 }}>
            {Object.entries(num.ls.plans).map(([plan, { present, missing }]) => (
              <div key={plan} style={{ padding: '6px 10px', borderRadius: 6, background: missing.length === 0 ? `${P.gold}06` : P.surface, border: `1px solid ${missing.length === 0 ? P.gold + '15' : P.cardBdr}` }}>
                <div style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: P.textDim, width: 120, fontSize: 11 }}>{plan}</span>
                  <span style={{ color: P.green, fontSize: 11 }}>{present.join(',') || '—'}</span>
                  {missing.length > 0 && <span style={{ color: P.red, fontSize: 10 }}>manque {missing.join(',')}</span>}
                  {missing.length === 0 && <span style={{ color: P.gold, fontSize: 10, fontWeight: 600 }}>✦ Complet</span>}
                </div>
                {LS_PLAN_ADVICE[plan] && (
                  <div style={{ fontSize: 10, color: P.textDim, marginTop: 3, lineHeight: 1.4 }}>
                    {LS_PLAN_ADVICE[plan]}
                    {missing.length === 0 && ' — Toutes les énergies sont présentes : cet axe est pleinement activé.'}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Cd>
      </Sec>

      {/* ══ YI KING NATAL ══ */}
      <Sec icon="☰" title={`Yi King Natal — Hex. ${natal.hexNum} ${natal.name}`}>
        <Cd>
          <div style={intro}>
            Le Yi King (易經, « Classique des Changements ») est le plus ancien texte de sagesse chinoise, vieux de plus de 3 000 ans, consulté par Confucius lui-même. Tes 64 hexagrammes codent les situations archétypales de la vie. Ton hexagramme de naissance est ton archétype stratégique permanent — l'énergie fondamentale qui sous-tend ton parcours, indépendamment des cycles quotidiens. <Badge type="fixe" />
          </div>
          <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
              {[...natal.lines].reverse().map((line, i) => (
                <div key={i} style={{ display: 'flex', gap: line === 1 ? 0 : 6 }}>
                  {line === 1 ? (
                    <div style={{ width: 40, height: 5, background: (5 - i) === natal.changing ? P.gold : P.text, borderRadius: 1 }} />
                  ) : (
                    <>
                      <div style={{ width: 17, height: 5, background: (5 - i) === natal.changing ? P.gold : P.textDim, borderRadius: 1 }} />
                      <div style={{ width: 17, height: 5, background: (5 - i) === natal.changing ? P.gold : P.textDim, borderRadius: 1 }} />
                    </>
                  )}
                </div>
              ))}
              <div style={{ fontSize: 9, color: P.textDim, marginTop: 4 }}>
                {TRIGRAM_NAMES[natal.lower]} / {TRIGRAM_NAMES[natal.upper]}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: P.gold }}>{natalProf.archetype}</div>
              <div style={{ fontSize: 13, color: P.textMid, marginTop: 4, lineHeight: 1.5 }}>« {natalProf.judgment} »</div>
              <div style={{ fontSize: 11, color: P.textDim, marginTop: 4, fontStyle: 'italic' }}>{natalProf.image}</div>
            </div>
          </div>
          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <div style={{ padding: '8px 10px', background: `${P.green}0a`, borderRadius: 6, border: `1px solid ${P.green}18` }}>
              <div style={{ fontSize: 9, color: P.green, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>✦ Opportunité</div>
              <div style={{ fontSize: 12, color: P.green, marginTop: 3, lineHeight: 1.5 }}>{natalProf.opportunity}</div>
            </div>
            <div style={{ padding: '8px 10px', background: `${P.red}0a`, borderRadius: 6, border: `1px solid ${P.red}18` }}>
              <div style={{ fontSize: 9, color: P.red, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>⚡ Risque</div>
              <div style={{ fontSize: 12, color: P.red, marginTop: 3, lineHeight: 1.5 }}>{natalProf.risk}</div>
            </div>
          </div>
          <div style={{ marginTop: 8, padding: '8px 12px', background: `${P.gold}0a`, borderRadius: 6, border: `1px solid ${P.gold}18` }}>
            <div style={{ fontSize: 9, color: P.gold, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>☰ Conseil stratégique permanent</div>
            <div style={gold12}>{natalProf.action}</div>
          </div>

          {/* Sagesse du Yi King — texte classique */}
          <div style={{ marginTop: 8, padding: '10px 14px', background: '#18181b', borderRadius: 8, border: `1px solid ${P.cardBdr}`, position: 'relative' }}>
            <div style={{ fontSize: 9, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600, marginBottom: 6 }}>📜 Parole du Yi King</div>
            <div style={{ fontSize: 12, color: '#d4d4d8', lineHeight: 1.7, fontStyle: 'italic' }}>
              « {natalProf.wisdom} »
            </div>
            <div style={{ fontSize: 10, color: P.textDim, marginTop: 6, lineHeight: 1.5 }}>
              Ce texte accompagne ton hexagramme depuis plus de 3 000 ans. Il ne décrit pas un jour — il décrit une posture de vie. Relis-le dans les moments de doute stratégique.
            </div>
          </div>
        </Cd>
      </Sec>

      {/* ══ LUNE NATALE ══ */}
      {astro && (() => {
        const nm = getNatalMoon(astro.b3.moon);
        if (!nm) return null;
        return (
          <Sec icon="☽" title={`Ta Lune Natale — ${nm.sign}`}>
            <Cd>
              <div style={intro}>
                En astrologie, la Lune représente ton monde émotionnel — un pilier fondamental du thème natal, reconnu depuis l'Antiquité par les traditions grecque, arabe et indienne. Ta Lune de naissance révèle tes besoins profonds, tes réactions instinctives, ce qui te sécurise quand tout vacille. C'est la face invisible de ta personnalité, celle que seuls tes proches connaissent. <Badge type="fixe" />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'linear-gradient(135deg, #9ca3af22, #6366f118)',
                  border: `2px solid #9ca3af40`, fontSize: 26,
                }}>☽</div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: P.text }}>Lune en {nm.sign}</div>
                  <div style={{ fontSize: 10, color: P.textDim, marginTop: 3 }}>
                    Position lunaire à ta naissance
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                {/* Besoins émotionnels */}
                <div style={{ padding: '10px 12px', background: '#6366f108', borderRadius: 8, borderLeft: '3px solid #6366f140' }}>
                  <div style={{ fontSize: 10, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 4 }}>💧 Besoins émotionnels</div>
                  <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.6 }}>{nm.needs}</div>
                </div>

                {/* Réaction instinctive */}
                <div style={{ padding: '10px 12px', background: '#f59e0b08', borderRadius: 8, borderLeft: '3px solid #f59e0b40' }}>
                  <div style={{ fontSize: 10, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 4 }}>⚡ Réaction instinctive</div>
                  <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.6 }}>{nm.instinct}</div>
                </div>

                {/* Ce qui te sécurise */}
                <div style={{ padding: '10px 12px', background: '#10b98108', borderRadius: 8, borderLeft: '3px solid #10b98140' }}>
                  <div style={{ fontSize: 10, color: '#34d399', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 4 }}>🛡 Ce qui te sécurise</div>
                  <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.6 }}>{nm.security}</div>
                </div>

                {/* Forces / Vigilance */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ padding: '10px 12px', background: `${P.green}08`, borderRadius: 8, borderLeft: `3px solid ${P.green}40` }}>
                    <div style={{ fontSize: 10, color: P.green, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 4 }}>✦ Forces</div>
                    <div style={{ fontSize: 11, color: '#4ade80', lineHeight: 1.5 }}>{nm.qualities}</div>
                  </div>
                  <div style={{ padding: '10px 12px', background: '#ef444408', borderRadius: 8, borderLeft: '3px solid #ef444440' }}>
                    <div style={{ fontSize: 10, color: '#ef4444', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 4 }}>⚠ Vigilance</div>
                    <div style={{ fontSize: 11, color: '#ef4444aa', lineHeight: 1.5 }}>{nm.vigilance}</div>
                  </div>
                </div>

                {/* Don de l'ombre */}
                {nm.darkGift && (
                  <div style={{ padding: '10px 12px', background: '#a78bfa08', borderRadius: 8, borderLeft: '3px solid #a78bfa40' }}>
                    <div style={{ fontSize: 10, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 4 }}>🔮 Le don de ton ombre</div>
                    <div style={{ fontSize: 12, color: '#c4b5fd', lineHeight: 1.6 }}>{nm.darkGift}</div>
                  </div>
                )}

                {/* Hack concret */}
                {nm.hack && (
                  <div style={{ padding: '10px 12px', background: `${P.gold}06`, borderRadius: 8, borderLeft: `3px solid ${P.gold}40` }}>
                    <div style={{ fontSize: 10, color: P.gold, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 4 }}>💡 Astuce pour ton quotidien</div>
                    <div style={{ fontSize: 12, color: '#fbbf24', lineHeight: 1.6 }}>{nm.hack}</div>
                  </div>
                )}
              </div>
            </Cd>
          </Sec>
        );
      })()}

      {/* ══ MISSION KARMIQUE — Nœuds Lunaires × Numérologie ══ */}
      {data.conv.lunarNodes && (() => {
        const nnSign = data.conv.lunarNodes.natal.northNode.sign;
        const southNode = getSouthNode(nnSign as ZodiacSign);
        const mission = generateKarmicMission(nnSign as ZodiacSign, num.lp.v, num.soul.v);
        const tension = detectKarmicTension(nnSign as ZodiacSign, num.lp.v, num.soul.v);
        if (!southNode || !mission) return null;

        return (
          <Sec icon="☸" title="Mission Karmique">
            <Cd>
              <div style={intro}>
                Les Nœuds Lunaires sont deux points astronomiques opposés liés à l'orbite de la Lune. En astrologie karmique, le <b style={{ color: '#a78bfa' }}>Nœud Sud</b> représente tes acquis — ce que tu maîtrises naturellement. Le <b style={{ color: P.gold }}>Nœud Nord</b> indique ta direction d'évolution. Croisés avec ton <b style={{ color: P.gold }}>Chemin de Vie</b> (numérologie) et ton <b style={{ color: '#a78bfa' }}>Nombre de l'Âme</b>, ils dessinent une mission unique.
              </div>

              {/* ── Nœud Sud : ce que tu maîtrises ── */}
              <div style={{ padding: '14px 16px', borderRadius: 10, background: '#a78bfa08', border: '1px solid #a78bfa20', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: '#a78bfa15', fontSize: 13, fontWeight: 800, color: '#a78bfa', letterSpacing: -0.5,
                  }}>SUD</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#a78bfa' }}>Nœud Sud — {southNode.sign}</div>
                    <div style={{ fontSize: 10, color: P.textDim }}>Tes acquis karmiques — ce que tu maîtrises depuis toujours</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  <div style={{ padding: '8px 12px', borderRadius: 8, background: '#4ade800a', borderLeft: '3px solid #4ade8044' }}>
                    <div style={{ fontSize: 10, color: '#4ade80', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 1 }}>Ta force naturelle</div>
                    <div style={{ fontSize: 12, color: P.textMid, marginTop: 3, lineHeight: 1.5 }}>{southNode.maitrise}</div>
                  </div>
                  <div style={{ padding: '8px 12px', borderRadius: 8, background: '#f9731608', borderLeft: '3px solid #f9731644' }}>
                    <div style={{ fontSize: 10, color: '#f97316', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 1 }}>Ce que tu dois lâcher</div>
                    <div style={{ fontSize: 12, color: P.textMid, marginTop: 3, lineHeight: 1.5 }}>{southNode.lacher}</div>
                  </div>
                  <div style={{ padding: '8px 12px', borderRadius: 8, background: '#ef44440a', borderLeft: '3px solid #ef444444' }}>
                    <div style={{ fontSize: 10, color: '#ef4444', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 1 }}>Le piège à éviter</div>
                    <div style={{ fontSize: 12, color: P.textMid, marginTop: 3, lineHeight: 1.5 }}>{southNode.piege}</div>
                  </div>
                </div>
              </div>

              {/* ── Nœud Nord + CdV + Âme : ta direction ── */}
              <div style={{ padding: '14px 16px', borderRadius: 10, background: `${P.gold}08`, border: `1px solid ${P.gold}20`, marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `${P.gold}15`, fontSize: 12, fontWeight: 800, color: P.gold, letterSpacing: -0.5,
                  }}>NORD</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: P.gold }}>Nœud Nord — {nnSign}</div>
                    <div style={{ fontSize: 10, color: P.textDim }}>Ta direction d'évolution — ce vers quoi tu grandis</div>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: P.textMid, lineHeight: 1.7, marginBottom: 10 }}>{mission.northNode}</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  <div style={{ padding: '8px 12px', borderRadius: 8, background: `${P.gold}0c`, borderLeft: `3px solid ${P.gold}44` }}>
                    <div style={{ fontSize: 10, color: P.gold, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 1 }}>Chemin de Vie {num.lp.v} — comment tu avances</div>
                    <div style={{ fontSize: 12, color: P.textMid, marginTop: 3, lineHeight: 1.5 }}>{mission.cheminDeVie}</div>
                  </div>
                  <div style={{ padding: '8px 12px', borderRadius: 8, background: '#a78bfa08', borderLeft: '3px solid #a78bfa44' }}>
                    <div style={{ fontSize: 10, color: '#a78bfa', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 1 }}>Nombre de l'Âme {num.soul.v} — ce qui te motive profondément</div>
                    <div style={{ fontSize: 12, color: P.textMid, marginTop: 3, lineHeight: 1.5 }}>{mission.nombreAme}</div>
                  </div>
                </div>
              </div>

              {/* ── Tension karmique (si opposition Nœud Nord ↔ CdV) ── */}
              {tension && (
                <div style={{ padding: '12px 16px', borderRadius: 10, background: '#f9731606', border: '1px solid #f9731620' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 16 }}>⚡</span>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#f97316' }}>Tension Créatrice</div>
                  </div>
                  <div style={{ fontSize: 11, color: P.textDim, marginBottom: 6, lineHeight: 1.4 }}>Quand le Nœud Nord et le Chemin de Vie pointent dans des directions opposées, cela crée une tension — pas un blocage, mais un moteur de croissance.</div>
                  <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.6 }}>{tension}</div>
                </div>
              )}
            </Cd>
          </Sec>
        );
      })()}

      {/* ══ VIBRATION DU JOUR ══ */}
      <Sec icon="⟳" title="Vibrations cycliques">
        <Cd>
          <div style={intro}>
            En numérologie, tes cycles personnels se calculent à partir de ta date de naissance et de l'année en cours. Trois cycles se superposent : l'Année donne la grande tendance (thème sur 12 mois), le Mois colore la période, le Jour donne l'énergie immédiate. L'Année et le Mois sont stables sur leur période, seul le Jour change quotidiennement. <Badge type="cycle" />
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {([
              ['Année Personnelle', num.py, '📅 Fixe toute l\'année ' + new Date().getFullYear() + ' — ton thème dominant', 'y'],
              ['Mois Personnel', num.pm, '📆 Fixe ce mois — coloration de la période en cours', 'm'],
              ['Jour Personnel', num.ppd, '🌟 Change chaque jour — l\'énergie à exploiter aujourd\'hui', 'd'],
            ] as [string, { v: number; m?: boolean }, string, string][]).map(([label, val, note, cycle]) => {
              const info = getNumberInfo(val.v);
              const txt = getCycleText(val.v, cycle);
              return (
                <div key={label} style={{ padding: '10px 12px', background: info.c + '08', borderRadius: 8, borderLeft: `3px solid ${info.c}40` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 22, fontWeight: 700, color: info.c }}>{val.v}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: P.text }}>{label} — {info.k}</div>
                      <div style={{ fontSize: 10, color: P.textDim }}>{note}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: P.textMid, lineHeight: 1.5 }}>{txt}</div>
                </div>
              );
            })}
          </div>
        </Cd>
      </Sec>

      {/* ═══ ADN & CYCLES DE VIE — INCLUSION + PINNACLES — V9 Sprint 5 ═══ */}
      <Sec icon="🧬" title="ADN & Cycles de Vie">
        <Cd>
          {!incl ? (
            /* Teaser si nom complet non renseigné */
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>🧬</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: P.text, marginBottom: 6 }}>
                Ajoute ton nom complet
              </div>
              <div style={{ fontSize: 12, color: P.textDim, lineHeight: 1.6 }}>
                Renseigne ton prénom et nom de naissance dans ton profil<br/>
                pour révéler tes manques karmiques et plans de conscience.
              </div>
            </div>
          ) : (
            <>
              {/* ── Intro pédagogique ── */}
              <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.7, marginBottom: 14, padding: '10px 12px', background: 'rgba(192,132,252,0.05)', borderRadius: 8, borderLeft: '3px solid rgba(192,132,252,0.3)' }}>
                Chaque lettre de ton <strong>prénom, 2e prénom et nom de naissance</strong> correspond à un chiffre (A=1, B=2… selon la table de Pythagore). L'ADN numérologique compte combien de fois chaque chiffre de 1 à 9 apparaît dans l'ensemble de ces lettres. Un chiffre <strong style={{ color: '#ef4444' }}>absent</strong> (= 0) révèle une <strong>leçon karmique</strong> — une énergie que tu n'as pas reçue à la naissance et que tu dois développer dans cette vie. Un chiffre en <strong style={{ color: '#FFD700' }}>excès</strong> révèle une <strong>passion cachée</strong> — un talent naturel puissant, parfois obsessionnel.
              </div>

              {/* ── Légende ── */}
              <div style={{ fontSize: 11, color: P.textDim, marginBottom: 12, lineHeight: 1.6, fontStyle: 'italic' }}>
                Calculé à partir de ton prénom, 2e prénom et nom de naissance · {incl.N} lettres analysées
              </div>

              {/* ── Barres 1–9 ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
                {[1,2,3,4,5,6,7,8,9].map(d => {
                  const count = incl.grid[d] ?? 0;
                  const z     = incl.zScores[d] ?? 0;
                  const isAbsent  = count === 0;
                  const isPassion = incl.passions.includes(d);
                  const info = INCLUSION_DOMAIN_MAP[d];
                  const barW = incl.N > 0 ? Math.min(100, (count / incl.N) * 9 * 100) : 0;
                  const barColor = isAbsent
                    ? '#ef4444'
                    : isPassion
                      ? '#FFD700'
                      : 'rgba(255,255,255,0.25)';
                  return (
                    <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {/* Chiffre */}
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                        background: isAbsent ? '#ef444422' : isPassion ? '#FFD70022' : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${isAbsent ? '#ef4444' : isPassion ? '#FFD700' : 'rgba(255,255,255,0.12)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700,
                        color: isAbsent ? '#ef4444' : isPassion ? '#FFD700' : P.textMid,
                      }}>{d}</div>
                      {/* Barre */}
                      <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                        <div style={{ width: `${barW}%`, height: '100%', borderRadius: 3, background: barColor, transition: 'width 0.4s ease' }} />
                      </div>
                      {/* Compte + z */}
                      <div style={{ width: 18, textAlign: 'right', fontSize: 11, fontWeight: 700, color: isAbsent ? '#ef4444' : isPassion ? '#FFD700' : P.textMid }}>{count}</div>
                      {/* Badge */}
                      {isAbsent && (
                        <div style={{ fontSize: 9, fontWeight: 700, color: '#ef4444', background: '#ef444415', border: '1px solid #ef444440', borderRadius: 4, padding: '1px 5px', whiteSpace: 'nowrap' }}>LEÇON</div>
                      )}
                      {isPassion && (
                        <div style={{ fontSize: 9, fontWeight: 700, color: '#FFD700', background: '#FFD70015', border: '1px solid #FFD70040', borderRadius: 4, padding: '1px 5px', whiteSpace: 'nowrap' }}>PASSION</div>
                      )}
                      {/* Domaine */}
                      <div style={{ fontSize: 10, color: P.textDim, width: 90, textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {info.icon} {info.lesson}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Plans de conscience ── */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: P.textMid, marginBottom: 8, letterSpacing: 1 }}>PLANS DE CONSCIENCE</div>
                <div style={{ fontSize: 11, color: P.textDim, lineHeight: 1.6, marginBottom: 10 }}>
                  Les 9 chiffres se répartissent en 4 plans qui révèlent comment tu fonctionnes.
                  {' '}<strong style={{ color: '#4ade80' }}>Physique</strong> (4·5·6) = ton rapport au concret, au corps et à l'action.
                  {' '}<strong style={{ color: '#60a5fa' }}>Mental</strong> (1·8) = ta capacité de décision et de leadership.
                  {' '}<strong style={{ color: '#f472b6' }}>Émotionnel</strong> (2·3) = ta sensibilité, ton expression et ta relation aux autres.
                  {' '}<strong style={{ color: '#c084fc' }}>Intuitif</strong> (7·9) = ta connexion au spirituel et à la sagesse profonde.
                  {' '}Un plan à 0% indique une zone à développer consciemment.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {([
                    { label: 'Physique', key: 'physical' as const, digits: '4·5·6', color: '#4ade80', icon: '🌿' },
                    { label: 'Mental',   key: 'mental'   as const, digits: '1·8',   color: '#60a5fa', icon: '🌟' },
                    { label: 'Émotionnel', key: 'emotional' as const, digits: '2·3', color: '#f472b6', icon: '💗' },
                    { label: 'Intuitif', key: 'intuitive' as const, digits: '7·9', color: '#c084fc', icon: '🔮' },
                  ] as const).map(({ label, key, digits, color, icon }) => {
                    const pct = Math.round(incl.planes[key]);
                    return (
                      <div key={key} style={{
                        background: `${color}08`, border: `1px solid ${color}25`,
                        borderRadius: 10, padding: '10px 12px',
                      }}>
                        <div style={{ fontSize: 10, color, fontWeight: 700, marginBottom: 4 }}>{icon} {label}</div>
                        <div style={{ fontSize: 8, color: P.textDim, marginBottom: 6 }}>({digits})</div>
                        <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(100, pct * 3)}%`, height: '100%', borderRadius: 2, background: color }} />
                        </div>
                        <div style={{ fontSize: 10, color, fontWeight: 600, marginTop: 4 }}>{pct}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Manques karmiques ── */}
              {incl.absents.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', marginBottom: 8, letterSpacing: 1 }}>LEÇONS KARMIQUES</div>
                  {incl.absents.map(d => (
                    <div key={d} style={{
                      display: 'flex', gap: 10, alignItems: 'flex-start',
                      background: '#ef444408', border: '1px solid #ef444425',
                      borderRadius: 8, padding: '8px 10px', marginBottom: 6,
                    }}>
                      <div style={{ fontSize: 18, lineHeight: 1 }}>{INCLUSION_DOMAIN_MAP[d].icon}</div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444' }}>
                          Le {d} est absent — {INCLUSION_DOMAIN_MAP[d].lesson} à développer
                        </div>
                        <div style={{ fontSize: 10, color: P.textDim, marginTop: 2 }}>
                          Domaine : {INCLUSION_DOMAIN_MAP[d].domain} · une qualité à cultiver au fil du temps
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Passions cachées ── */}
              {incl.passions.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#FFD700', marginBottom: 8, letterSpacing: 1 }}>PASSIONS CACHÉES</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {incl.passions.map(d => (
                      <div key={d} style={{
                        fontSize: 11, fontWeight: 600, color: '#FFD700',
                        background: '#FFD70015', border: '1px solid #FFD70035',
                        borderRadius: 20, padding: '4px 10px',
                      }}>
                        {INCLUSION_DOMAIN_MAP[d].icon} {d} · {INCLUSION_DOMAIN_MAP[d].lesson} (z={incl.zScores[d]})
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── Séparateur vers Sommets & Défis ── */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '16px 0' }} />
          <div style={{ fontSize: 10, color: P.gold, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 8 }}>🏔️ Sommets & Défis</div>

          <div style={intro}>
            Ta date de naissance découpe ta vie en <strong>quatre grandes périodes</strong>. Chaque période a deux faces : un <strong>Sommet</strong> (l'énergie positive à déployer — ton superpower du moment) et un <strong>Défi</strong> (la leçon de vie à apprendre — ce qui te fait grandir). Le Défi Principal ★ est le fil rouge de toute ton existence.
          </div>

          {/* ── Pinnacles ── */}
          <div style={{ fontSize: 11, color: P.textMid, fontWeight: 700, letterSpacing: 1.2, marginBottom: 10, textTransform: 'uppercase' }}>Sommets de vie</div>
          <div style={{ fontSize: 11, color: P.textDim, marginBottom: 12, lineHeight: 1.6 }}>
            Chaque Sommet est un chiffre (1 à 9, ou 11/22/33) qui représente <strong>l'énergie dominante</strong> d'une période de ta vie — comme une saison intérieure. Le Sommet actif (en or) est celui que tu vis en ce moment.
          </div>
          {pinnacles.map((p, i) => {
            const isActive = i === activePinnIdx;
            const info = NUMBER_INFO[p.v] || { k: '—', s: '?', c: '#888' };
            const per = pinnacleAges[i];
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 10, marginBottom: 6,
                background: isActive ? `${P.gold}12` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isActive ? P.gold + '44' : 'rgba(255,255,255,0.07)'}`,
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                  background: isActive ? P.gold : 'rgba(255,255,255,0.07)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 900,
                  color: isActive ? '#0d0d1a' : P.textMid,
                }}>
                  {p.v}{p.m ? '✦' : ''}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: isActive ? P.gold : P.text }}>
                      {info.k}
                    </span>
                    {isActive && (
                      <span style={{ fontSize: 9, fontWeight: 700, color: P.gold, background: `${P.gold}20`, borderRadius: 4, padding: '1px 5px' }}>ACTIF</span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: P.textDim, marginTop: 2 }}>
                    P{i + 1} · {per.start}–{per.end === 99 ? '∞' : per.end + ' ans'} · {formatReductionPath(p)} · {info.s}
                  </div>
                  {PINNACLE_DESC[p.v] && (
                    <div style={{ fontSize: 11, color: isActive ? P.textMid : P.textDim, marginTop: 4, lineHeight: 1.5, fontStyle: 'italic' }}>
                      {PINNACLE_DESC[p.v]}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* ── Challenges ── */}
          <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, letterSpacing: 1.2, marginTop: 14, marginBottom: 6, textTransform: 'uppercase' }}>Défis à transcender</div>
          <div style={{ fontSize: 11, color: P.textDim, marginBottom: 12, lineHeight: 1.6 }}>
            Un Défi n'est pas un problème — c'est un <strong>muscle à développer</strong>. Chaque défi est calculé à partir des chiffres de ta date de naissance (jour, mois, année). Le Défi Principal ★ synthétise les deux premiers — c'est le fil rouge de ta vie. Quand deux défis portent le même chiffre, c'est que ce thème est particulièrement central pour toi.
          </div>
          {challenges.map((c, i) => {
            const isMain = i === 2;
            const cName = CHALLENGE_NAME[c.v] || '?';
            const label = isMain ? 'Défi Principal ★' : `Défi ${i + 1}`;
            const isActive = i === activePinnIdx;
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 8, marginBottom: 5,
                background: isMain ? 'rgba(148,163,184,0.07)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isMain ? 'rgba(148,163,184,0.25)' : 'rgba(255,255,255,0.05)'}`,
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  background: isMain ? 'rgba(148,163,184,0.18)' : 'rgba(255,255,255,0.04)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, color: isMain ? '#cbd5e1' : '#94a3b8',
                }}>
                  {c.v}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: isMain ? '#cbd5e1' : '#94a3b8' }}>
                      {cName}
                    </span>
                    <span style={{ fontSize: 10, color: P.textDim, opacity: 0.7 }}>
                      {label}
                    </span>
                    {isActive && i !== 2 && (
                      <span style={{ fontSize: 9, color: '#94a3b8', background: 'rgba(148,163,184,0.12)', borderRadius: 4, padding: '1px 4px' }}>ACTIF</span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: P.textDim, marginTop: 2, opacity: 0.6 }}>
                    Calcul : {CHALLENGE_ORIGIN[i]} = {c.v}
                  </div>
                  {CHALLENGE_DESC[c.v] != null && (
                    <div style={{ fontSize: 11, color: isMain ? P.textMid : P.textDim, marginTop: 4, lineHeight: 1.5, fontStyle: 'italic' }}>
                      {CHALLENGE_DESC[c.v]}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </Cd>
      </Sec>

      {/* ═══ CARTE NATALE TAROT — V9 Sprint 6 ═══ */}
      <Sec icon="🎴" title="Carte Natale — Tarot">
        <Cd>
          <div style={{ fontSize: 12, color: P.textDim, lineHeight: 1.7, marginBottom: 14, fontStyle: 'italic' }}>
            Dans Kaironaute, le Tarot est un miroir archétypal au sens jungien — pas un oracle. Ta Carte Natale est calculée depuis ta date de naissance et révèle l'énergie archétypale qui t\'accompagne tout au long de ta vie.
            {' '}<span style={{ display: 'inline-block', fontSize: 9, background: '#4ade8020', color: '#4ade80', padding: '2px 7px', borderRadius: 4, fontWeight: 700, fontStyle: 'normal', verticalAlign: 'middle' }}>🔒 FIXE — ne change jamais</span>
          </div>

          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>
            {/* Visuel de la carte */}
            <div style={{ width: 72, height: 112, borderRadius: 10, border: `2px solid ${P.gold}44`, overflow: 'hidden', flexShrink: 0, background: `${P.gold}08`, position: 'relative' }}>
              <img src={birthCard.image} alt={birthCard.name_fr} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
              <div style={{ position: 'absolute', bottom: 2, left: 0, right: 0, textAlign: 'center' }}>
                <span style={{ fontSize: 9, color: P.gold, fontWeight: 700, background: 'rgba(0,0,0,0.7)', padding: '1px 5px', borderRadius: 3 }}>{birthCard.num}</span>
              </div>
            </div>

            {/* Infos */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: P.text }}>{birthCard.name_fr}</div>
              <div style={{ fontSize: 13, color: P.gold, fontWeight: 600, marginTop: 4 }}>{birthCard.theme}</div>
              <div style={{ fontSize: 11, color: P.textDim, marginTop: 4 }}>{birthCard.planet} · {birthCard.element}</div>
              <div style={{ marginTop: 8, fontSize: 12, color: P.textMid, lineHeight: 1.6 }}>
                <span style={{ color: '#4ade80' }}>✦ {birthCard.light}</span>
              </div>
              <div style={{ marginTop: 4, fontSize: 12, color: P.textMid, lineHeight: 1.6 }}>
                <span style={{ color: '#94a3b8' }}>△ {birthCard.shadow}</span>
              </div>
            </div>
          </div>

          {/* Narration */}
          <div style={{ padding: '12px 14px', background: `${P.gold}08`, borderRadius: 10, borderLeft: `3px solid ${P.gold}55` }}>
            <div style={{ fontSize: 10, color: P.gold, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 8 }}>
              🎴 Miroir de Vie
            </div>
            <div style={{ fontSize: 13, color: P.textMid, lineHeight: 1.8, fontStyle: 'italic' }}>
              {birthCard.narrative}
            </div>
          </div>
        </Cd>
      </Sec>

      {/* ═══ CARTE ANNUELLE PARTAGEABLE — V9 Sprint 4 ═══ */}
      <Sec icon="✨" title="Carte Annuelle">
        <Cd>
          <div style={{ fontSize: 12, color: P.textDim, lineHeight: 1.7, marginBottom: 14, fontStyle: 'italic' }}>
            Ton <strong>Année Personnelle</strong> est un cycle de 9 ans qui se répète tout au long de ta vie. Chaque année porte une énergie différente : le 1 lance un nouveau cycle, le 9 le conclut. Ce chiffre t\'indique le <strong>thème principal de ton année</strong> — ce sur quoi concentrer ton énergie pour être en phase avec ton rythme naturel.
            {' '}<span style={{ display: 'inline-block', fontSize: 9, background: '#a78bfa20', color: '#a78bfa', padding: '2px 7px', borderRadius: 4, fontWeight: 700, fontStyle: 'normal', verticalAlign: 'middle' }}>🔄 CYCLE — change chaque année</span>
          </div>
          {/* Mini-preview statique de la carte */}
          <div style={{
            width: '100%', maxWidth: 270, margin: '0 auto 16px',
            aspectRatio: '9/16', borderRadius: 16,
            background: 'linear-gradient(160deg, #0d0d1a 0%, #1a1040 50%, #0d0d1a 100%)',
            border: '1px solid rgba(255,215,0,0.3)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 8, padding: '20px 16px',
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Étoiles décoratives */}
            {[...Array(12)].map((_, i) => (
              <div key={i} style={{
                position: 'absolute',
                left: `${((i * 37 + 11) % 90) + 5}%`,
                top:  `${((i * 53 + 7)  % 85) + 5}%`,
                width: i % 3 === 0 ? 2 : 1,
                height: i % 3 === 0 ? 2 : 1,
                borderRadius: '50%',
                background: 'rgba(255,215,0,0.6)',
              }} />
            ))}
            <div style={{ fontSize: 11, color: '#FFD700', letterSpacing: 3, fontWeight: 700 }}>✦ KAIRONAUTE ✦</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>{fn || 'Ton Nom'}</div>
            <div style={{
              fontSize: 48, fontWeight: 900, lineHeight: 1,
              background: 'linear-gradient(135deg, #FFD700, #FFA500)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              {(() => { try { return calcPersonalYear(bd, new Date().getFullYear()).v; } catch { return '—'; } })()}
            </div>
            <div style={{ fontSize: 9, color: 'rgba(255,215,0,0.7)', letterSpacing: 1 }}>ANNÉE PERSONNELLE</div>
            <div style={{
              marginTop: 8, fontSize: 9, color: 'rgba(255,255,255,0.4)',
              textAlign: 'center', letterSpacing: 0.5,
            }}>
              TOP 3 MOIS · HEXAGRAMME NATAL
            </div>
          </div>

          {/* Explication de l'Année Personnelle */}
          {(() => {
            let pyVal: number;
            try { pyVal = calcPersonalYear(bd, new Date().getFullYear()).v; } catch { pyVal = 0; }
            const pyInfo = PY_DESC[pyVal];
            if (!pyInfo) return null;
            return (
              <div style={{ padding: '12px 14px', background: `${P.gold}08`, borderRadius: 10, border: `1px solid ${P.gold}20`, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 24, fontWeight: 900, color: P.gold }}>{pyVal}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: P.gold }}>{pyInfo.name}</div>
                    <div style={{ fontSize: 11, color: P.textDim }}>{pyInfo.theme}</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.7 }}>
                  {pyInfo.conseil}
                </div>
              </div>
            );
          })()}

          {/* Bouton Générer & Partager */}
          <button
            onClick={generateAnnualCard}
            disabled={isGenerating}
            style={{
              width: '100%', padding: '14px 0', borderRadius: 12,
              background: isGenerating
                ? 'rgba(255,215,0,0.2)'
                : 'linear-gradient(135deg, #B8860B, #FFD700, #B8860B)',
              border: 'none', cursor: isGenerating ? 'not-allowed' : 'pointer',
              fontSize: 15, fontWeight: 700,
              color: isGenerating ? 'rgba(255,215,0,0.5)' : '#0d0d1a',
              transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {isGenerating ? (
              <>⏳ Génération en cours…</>
            ) : (
              <>✨ Générer &amp; Partager ma Carte</>
            )}
          </button>

          {/* Caption */}
          <div style={{
            marginTop: 8, textAlign: 'center',
            fontSize: 11, color: P.textDim, letterSpacing: 0.5,
          }}>
            PNG 540×960 · Compatible Instagram, WhatsApp, Telegram
          </div>
        </Cd>
      </Sec>

      {/* ══ SYNTHÈSE MULTI-SYSTÈMES ══ */}
      <Sec icon="🔮" title="Synthèse Multi-Systèmes">
        <Cd>
          {/* Data grid */}
          <div style={{ fontSize: 13, color: P.textMid, lineHeight: 2, marginBottom: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 14px', alignItems: 'baseline' }}>
              <span style={{ color: '#c084fc', fontSize: 10, fontWeight: 700, letterSpacing: 0.5 }}>Numérologie</span>
              <span>Chemin <b style={{ color: getNumberInfo(lpMain.v).c }}>{lpDisplay}</b> {getNumberInfo(lpMain.v).k} · Expr <b style={{ color: getNumberInfo(num.expr.v).c }}>{num.expr.v}</b> · Âme <b style={{ color: getNumberInfo(num.soul.v).c }}>{num.soul.v}</b></span>
              {astro && <>
                <span style={{ color: '#60a5fa', fontSize: 10, fontWeight: 700, letterSpacing: 0.5 }}>Astrologie</span>
                <span>{SIGN_SYM[astro.b3.sun]} <b>{SIGN_FR[astro.b3.sun]}</b> · ☽ <b>{SIGN_FR[astro.b3.moon]}</b>{!astro.noTime && <> · ↑ <b>{SIGN_FR[astro.b3.asc]}</b></>}</span>
              </>}
              <span style={{ color: '#ef4444', fontSize: 10, fontWeight: 700, letterSpacing: 0.5 }}>BaZi 八字</span>
              <span>{cz.sym} <b>{cz.animal}</b> de <b style={{ color: cz.elemCol }}>{cz.elem}</b> · {cz.yy}</span>
              <span style={{ color: '#4ade80', fontSize: 10, fontWeight: 700, letterSpacing: 0.5 }}>Chaldéen</span>
              <span>Vibration <b style={{ color: getNumberInfo(num.ch.rd.v).c }}>{num.ch.rd.v}</b> {getNumberInfo(num.ch.rd.v).k}</span>
              <span style={{ color: P.gold, fontSize: 10, fontWeight: 700, letterSpacing: 0.5 }}>Yi King 易經</span>
              <span>Natal <b style={{ color: P.gold }}>{natal.hexNum}</b> {natal.name} · Jour <b style={{ color: P.gold }}>{iching.hexNum}</b> {iching.name}</span>
            </div>
          </div>

          {/* ── TES FORCES (boost) ── */}
          <div style={{ padding: '12px 14px', background: `${P.green}08`, borderRadius: 10, border: `1px solid ${P.green}20`, marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: P.green, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 8 }}>✦ Tes forces — ce que les systèmes confirment</div>
            <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.7 }}>
              {/* Identity paragraph */}
              Ton Chemin de Vie <b style={{ color: P.gold }}>{lpDisplay}</b> ({getNumberInfo(lpMain.v).k}) te donne une mission claire : {D[lpMain.v]?.cdv?.q?.split('.')[0]?.toLowerCase()}.
              {' '}Ton Expression <b>{num.expr.v}</b> ({getNumberInfo(num.expr.v).k}) te donne les outils pour y arriver — {D[num.expr.v]?.expr?.q?.split('.')[0]?.toLowerCase()}.
              {masterList.length > 1 && <> Avec <b style={{ color: P.gold }}>{masterList.length} nombres maîtres</b>, tu portes une vibration rare qui amplifie ton potentiel bien au-delà de la moyenne.</>}

              {/* Astro layer */}
              {astro && <>
                {' '}En astrologie, ton Soleil en <b>{SIGN_FR[astro.b3.sun]}</b> {
                  ['Aries','Leo','Sagittarius'].includes(astro.b3.sun) ? 'renforce ta capacité d\'action et de leadership' :
                  ['Taurus','Virgo','Capricorn'].includes(astro.b3.sun) ? 'ancre ta vision dans une exécution pragmatique' :
                  ['Gemini','Libra','Aquarius'].includes(astro.b3.sun) ? 'affûte ton intelligence relationnelle et ta vision' :
                  'nourrit une intuition et une profondeur émotionnelle précieuses'
                }, ta Lune en <b>{SIGN_FR[astro.b3.moon]}</b> {
                  ['Aries','Leo','Sagittarius'].includes(astro.b3.moon) ? 'alimente un feu intérieur qui ne s\'éteint pas' :
                  ['Taurus','Virgo','Capricorn'].includes(astro.b3.moon) ? 't\'offre une stabilité émotionnelle solide' :
                  ['Gemini','Libra','Aquarius'].includes(astro.b3.moon) ? 'te donne un recul émotionnel qui clarifie tes choix' :
                  'te connecte à une empathie naturelle qui touche les gens'
                }
                {!astro.noTime && <>, et ton Ascendant <b>{SIGN_FR[astro.b3.asc]}</b> {
                  ['Aries','Leo','Sagittarius'].includes(astro.b3.asc) ? 'projette une image de confiance et d\'énergie.' :
                  ['Taurus','Virgo','Capricorn'].includes(astro.b3.asc) ? 'projette une image de solidité et de crédibilité.' :
                  ['Gemini','Libra','Aquarius'].includes(astro.b3.asc) ? 'projette une image d\'ouverture et d\'intelligence.' :
                  'projette une image de profondeur et de mystère.'
                }</>}
                {astro.noTime && '.'}
              </>}

              {/* Chinese zodiac */}
              {' '}Le <b style={{ color: cz.elemCol }}>{cz.czY}</b> {
                cz.elem === 'Feu' ? 'amplifie tout cela avec du charisme et de l\'audace — ton énergie est contagieuse.' :
                cz.elem === 'Terre' ? 'stabilise tout cela avec du pragmatisme — tes projets tiennent dans le temps.' :
                cz.elem === 'Métal' ? 'aiguise tout cela avec de la précision — ton exécution est chirurgicale.' :
                cz.elem === 'Eau' ? 'fluidifie tout cela avec de l\'adaptabilité — tu contournes les obstacles avec élégance.' :
                'fait grandir tout cela avec de la vision — ta trajectoire est naturellement ascendante.'
              }

              {/* Yi King */}
              {' '}Ton archétype Yi King natal « <b style={{ color: P.gold }}>{natalProf.archetype}</b> » (Hex. {natal.hexNum}) confirme cette configuration : {natalProf.opportunity?.split('.')[0]?.toLowerCase()}.
            </div>
          </div>

          {/* ── POINTS D'ATTENTION ── */}
          <div style={{ padding: '12px 14px', background: '#ef444408', borderRadius: 10, border: '1px solid #ef444420', marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: '#ef4444', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 8 }}>⚠ Points de vigilance — ce qui peut te freiner</div>
            <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.7 }}>
              {D[lpMain.v]?.cdv?.v && <>Ton CdV {lpDisplay} a un angle mort : {D[lpMain.v].cdv.v.charAt(0).toLowerCase() + D[lpMain.v].cdv.v.slice(1)} </>}
              {D[num.expr.v]?.expr?.v && num.expr.v !== lpMain.v && <>Côté expression ({num.expr.v}), {D[num.expr.v].expr.v.charAt(0).toLowerCase() + D[num.expr.v].expr.v.slice(1)} </>}
              {czT?.v && <>En zodiaque chinois, le {cz.animal} doit surveiller : {czT.v.toLowerCase()}. </>}
              {lsMissing.length > 0 && (() => {
                // Séparer les énergies absentes en Lo Shu mais compensées par un nombre fondamental
                const coreNumbers = new Set([lpMain.v, num.expr.v, num.soul.v, num.pers.v, num.mat.v, num.bday.v].filter(v => v <= 9));
                const compensated = lsMissing.filter(n => coreNumbers.has(n));
                const trulyMissing = lsMissing.filter(n => !coreNumbers.has(n));
                return <>
                  {trulyMissing.length > 0 && <>Ta grille Lo Shu manque les énergies {trulyMissing.join(', ')} ({trulyMissing.map(n => LS_MEANING[n]).join(', ')}) — des axes à développer consciemment. </>}
                  {compensated.length > 0 && <>
                    {trulyMissing.length > 0 ? 'En revanche, les' : 'Les'} énergies {compensated.join(', ')} ({compensated.map(n => LS_MEANING[n]).join(', ')}) sont absentes de ta date de naissance mais compensées par tes nombres fondamentaux — ton nom supplée ce que ta date ne porte pas.{' '}
                  </>}
                </>;
              })()}
              {natalProf.risk && <>Le Yi King t\'avertit aussi : {natalProf.risk.charAt(0).toLowerCase() + natalProf.risk.slice(1)}</>}
            </div>
          </div>

          {/* ── CONCLUSION — CROISEMENT COMPLET ── */}
          {(() => {
            // Recalculer les données BaZi/NaYin/Moon dans ce scope pour le croisement
            let dmArchetype = '', nayinName = '', nayinCat = '', csPhase = '', moonSign = '', moonHack = '';
            try {
              const birthDate = new Date(bd + 'T12:00:00');
              const nb = calcBaZiDaily(birthDate, birthDate, 50);
              dmArchetype = nb.dailyStem.archetype;
              const ny = getNaYin(birthDate);
              nayinName = ny.entry.name_fr;
              nayinCat = ny.entry.category;
              const css = getChangsheng(birthDate, birthDate);
              csPhase = css.scoring.label_fr.split('—')[0].trim();
            } catch {}
            try {
              if (astro) {
                const nm = getNatalMoon(astro.b3.moon);
                if (nm) { moonSign = nm.sign; moonHack = nm.hack || ''; }
              }
            } catch {}

            return (
            <div style={{ padding: '14px 16px', background: `${P.gold}08`, borderRadius: 10, border: `1px solid ${P.gold}25` }}>
              <div style={{ fontSize: 11, color: P.gold, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 10 }}>🌟 En résumé — ton ADN croisé</div>
              <div style={{ fontSize: 12, color: P.text, lineHeight: 1.8, fontWeight: 500 }}>

                {/* §1 — Identité numérique */}
                Tu es un profil <b style={{ color: P.gold }}>{getNumberInfo(lpMain.v).k}</b> (CdV {lpDisplay}) avec une Expression <b>{num.expr.v}</b> ({getNumberInfo(num.expr.v).k}) — {
                  lpMain.v === num.expr.v ? 'mission et outils alignés, une configuration rare de cohérence.' :
                  'ta mission et tes outils sont complémentaires : le « pourquoi » (CdV) guide le « comment » (Expression).'
                }
                {masterList.length > 1 && <> Avec <b style={{ color: P.gold }}>{masterList.length} nombres maîtres</b> ({masterList.map(([label]) => label).join(', ')}), tu portes une vibration d'exception — mais attention, les maîtres nombres exigent autant qu'ils donnent.</>}

                {/* §2 — Couche astrologique */}
                {astro && <>
                  {' '}Ta trinité astrale {!astro.noTime ? <b>({SIGN_FR[astro.b3.sun]} / {SIGN_FR[astro.b3.moon]} / {SIGN_FR[astro.b3.asc]})</b> : <b>({SIGN_FR[astro.b3.sun]} / {SIGN_FR[astro.b3.moon]})</b>}{' '}
                  {!astro.noTime
                    ? `donne la texture émotionnelle : le ${SIGN_FR[astro.b3.sun]} agit, le ${SIGN_FR[astro.b3.moon]} ressent, le ${SIGN_FR[astro.b3.asc]} projette.`
                    : `complète le tableau : le ${SIGN_FR[astro.b3.sun]} agit, le ${SIGN_FR[astro.b3.moon]} ressent.`
                  }
                  {moonSign && <> Ta Lune en <b>{moonSign}</b> est ta boussole invisible — elle décide de tes réactions quand la pression monte.</>}
                </>}

                {/* §3 — Couche chinoise (Zodiac + BaZi) */}
                {' '}Le <b style={{ color: cz.elemCol }}>{cz.czY}</b> ({cz.yy}) croise cette configuration avec {
                  cz.elem === 'Feu' ? 'du charisme et de l\'audace' :
                  cz.elem === 'Terre' ? 'du pragmatisme et de l\'ancrage' :
                  cz.elem === 'Métal' ? 'de la précision et de la détermination' :
                  cz.elem === 'Eau' ? 'de l\'adaptabilité et de la profondeur' :
                  'de la croissance et de la vision'
                }
                {dmArchetype && <>, tandis que ton Maître du Jour « <b style={{ color: '#60a5fa' }}>{dmArchetype}</b> » définit ton mode opératoire quotidien</>}
                {nayinName && <>, coloré par la mélodie Na Yin « <b>{nayinName}</b> » ({nayinCat})</>}
                {csPhase && <> en phase « {csPhase} »</>}.

                {/* §4 — Lo Shu × Numérologie */}
                {' '}Ta grille Lo Shu active <b style={{ color: P.green }}>{lsStrong.length} énergies sur 9</b>
                {lsMissing.length > 0 ? ` — les ${lsMissing.length} manquantes ne sont pas des faiblesses mais des axes de croissance` : ' — un profil complet, ce qui est extrêmement rare'}.
                {num.ls.dr.v === num.ls.co.v
                  ? ` Moteur et Direction identiques (${num.ls.dr.v}) : une trajectoire d'une cohérence rare.`
                  : ` Ton Moteur ${num.ls.dr.v} (${getNumberInfo(num.ls.dr.v).k}) propulse ta Direction ${num.ls.co.v} (${getNumberInfo(num.ls.co.v).k}) — le carburant nourrit la destination.`
                }

                {/* §5 — Yi King + conclusion actionnelle */}
                {' '}Ton archétype Yi King « <b style={{ color: P.gold }}>{natalProf.archetype}</b> » (Hex. {natal.hexNum}) synthétise tout :{' '}
                {natalProf.judgment.charAt(0).toLowerCase() + natalProf.judgment.slice(1)}{' '}
                Tous tes systèmes pointent dans la même direction : tu as le potentiel pour{' '}
                {
                  [1,8,22].includes(lpMain.v) ? 'bâtir quelque chose de significatif et durable' :
                  [2,6,33].includes(lpMain.v) ? 'connecter les gens et créer de l\'harmonie à grande échelle' :
                  [3,5].includes(lpMain.v) ? 'inspirer par ta créativité et ton audace' :
                  [4].includes(lpMain.v) ? 'construire des fondations sur lesquelles les autres s\'appuient' :
                  [7].includes(lpMain.v) ? 'éclairer les autres par ta sagesse et ta profondeur' :
                  [9].includes(lpMain.v) ? 'servir une cause plus grande avec compassion et vision' :
                  [11].includes(lpMain.v) ? 'guider les autres grâce à une intuition visionnaire que peu possèdent' :
                  'laisser une empreinte significative'
                }.

                {/* §6 — Call to action Yi King */}
                <div style={{ marginTop: 10, padding: '8px 12px', background: `${P.gold}0a`, borderRadius: 8, border: `1px solid ${P.gold}20` }}>
                  <div style={{ fontSize: 10, color: P.gold, fontWeight: 600, marginBottom: 4 }}>☰ LE MOT DE LA FIN — TON YI KING NATAL</div>
                  <div style={{ fontSize: 13, fontStyle: 'italic', color: P.gold, lineHeight: 1.6 }}>
                    « {natalProf.action} »
                  </div>
                  <div style={{ fontSize: 10, color: P.textDim, marginTop: 4 }}>
                    « {natalProf.wisdom?.split('.')[0]}. »
                  </div>
                </div>

                {/* §7 — Hack concret si disponible */}
                {moonHack && (
                  <div style={{ marginTop: 8, padding: '8px 12px', background: '#a78bfa08', borderRadius: 8, border: '1px solid #a78bfa18' }}>
                    <div style={{ fontSize: 10, color: '#a78bfa', fontWeight: 600, marginBottom: 4 }}>💡 ASTUCE IMMÉDIATE (Lune {moonSign})</div>
                    <div style={{ fontSize: 11, color: '#c4b5fd', lineHeight: 1.5 }}>{moonHack}</div>
                  </div>
                )}

              </div>
            </div>
            );
          })()}

          {/* ═══ PROFIL ÉNERGÉTIQUE V4.4 — Radar 5 piliers + Archétype ═══ */}
          {(() => {
            const weights = loadPersonalWeights();
            if (!weights || !weights.isActive || weights.blendPercent < 50) return null;

            const radar = getRadarData(weights);
            const archetype = weights.archetype;
            const maxPillar = radar.reduce((best, p) => p.value > best.value ? p : best, radar[0]);

            const PILLAR_COLORS: Record<string, string> = {
              terrestre: '#c084fc',
              celeste: '#60a5fa',
              numerique: '#4ade80',
              fluide: '#f59e0b',
            };

            return (
              <div style={{ marginTop: 16, padding: '14px 16px', background: P.bg, borderRadius: 12, border: `1px solid ${P.cardBdr}` }}>
                <div style={{ fontSize: 11, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 4 }}>
                  🧬 Profil Énergétique
                </div>
                <div style={{ fontSize: 11, color: P.textDim, marginBottom: 14, lineHeight: 1.4 }}>
                  Comment ton vécu résonne avec chaque famille de systèmes. Basé sur {weights.feedbackCount} jours de feedback.
                </div>

                {/* Radar bars */}
                <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
                  {radar.map(p => {
                    const color = PILLAR_COLORS[p.key] || P.textMid;
                    const isMax = p.key === maxPillar.key;
                    return (
                      <div key={p.key}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: isMax ? 700 : 500, color: isMax ? color : P.text }}>
                            {p.label} {isMax && '★'}
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 700, color }}>{p.value}%</span>
                        </div>
                        <div style={{ height: 6, background: '#27272a', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 3,
                            width: `${p.value}%`,
                            background: `linear-gradient(90deg, ${color}66, ${color})`,
                            boxShadow: isMax ? `0 0 8px ${color}44` : 'none',
                            transition: 'width 0.8s ease',
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Archétype */}
                {archetype && (
                  <div style={{
                    padding: '12px 14px', borderRadius: 10,
                    background: `${PILLAR_COLORS[maxPillar.key] || '#a78bfa'}08`,
                    border: `1px solid ${PILLAR_COLORS[maxPillar.key] || '#a78bfa'}25`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: 24 }}>{archetype.icon}</span>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: PILLAR_COLORS[maxPillar.key] || '#a78bfa' }}>
                          {archetype.label}
                        </div>
                        <div style={{ fontSize: 10, color: P.textDim }}>Ta signature énergétique dominante</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.7 }}>
                      {archetype.description}
                    </div>
                  </div>
                )}

                {/* Blend indicator */}
                {weights.blendPercent < 100 && (
                  <div style={{ marginTop: 10, fontSize: 10, color: P.textDim, textAlign: 'center' }}>
                    Personnalisation à {weights.blendPercent}% — continue à noter pour affiner ton profil
                  </div>
                )}
              </div>
            );
          })()}
        </Cd>
      </Sec>

    </div>
  );
}
