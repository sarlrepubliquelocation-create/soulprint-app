import { useState } from 'react';
import { type SoulData } from '../App';
import { getNumberInfo, calcLifePathHorizontal } from '../engines/numerology';
import { SIGN_FR, SIGN_SYM } from '../engines/astrology';
import { getNatalMoon } from '../engines/moon';
import { calcNatalIChing, getHexProfile, TRIGRAM_NAMES } from '../engines/iching';
import { calcBaZiDaily, calcDayMaster, getPeachBlossom, PEACH_BLOSSOM_MAP, EARTHLY_BRANCHES, calculateLuckPillars, getLuckPillarNarrative, type LuckPillar, calcFourPillars, getNaYin, getChangsheng, NAYIN_CATEGORY_ADVICE } from '../engines/bazi';
import { Orb, Sec, Cd, P } from './ui';
import { loadPersonalWeights, getRadarData, type PersonalWeights, type RadarPillar } from '../engines/personalization';

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
    cdv:  { q: 'Votre mission est de tracer votre propre voie et d\'initier le mouvement. Vous êtes ici pour oser en premier.', v: 'Le piège de votre mission : confondre indépendance et isolement. Leader n\'est pas solitaire.' },
    expr: { q: 'Vous vous exprimez avec une force de conviction qui entraîne les autres. Votre mot-clé : initiative.', v: 'Votre talent peut intimider — apprenez à doser votre intensité selon le contexte.' },
    soul: { q: 'Au fond, vous êtes mû par un besoin viscéral d\'autonomie et de nouveauté. La routine vous étouffe.', v: 'Cette soif d\'indépendance peut vous couper des liens profonds dont vous avez besoin.' },
    pers: { q: 'On perçoit en vous quelqu\'un de déterminé, sûr de lui, qui sait où il va.', v: 'Cette image de force peut empêcher les autres de vous offrir leur aide.' },
    mat:  { q: 'Avec l\'âge, votre capacité à trancher et à mener s\'affine — vous devenez le capitaine naturel.', v: 'Maturité du 1 : accepter que diriger, c\'est aussi écouter.' },
  },
  2: {
    cdv:  { q: 'Votre mission est de créer des ponts entre les gens, d\'harmoniser et de faciliter. Vous êtes le liant invisible.', v: 'Le piège : vous oublier dans la quête d\'harmonie. Votre paix intérieure compte autant que celle des autres.' },
    expr: { q: 'Vous excellez dans la diplomatie, la médiation et l\'écoute active. Les gens se confient à vous naturellement.', v: 'Ce talent de médiateur peut devenir de l\'évitement de conflit — parfois il faut trancher.' },
    soul: { q: 'Au fond, vous cherchez la connexion authentique et la coopération vraie. L\'harmonie est votre carburant.', v: 'Attention à la codépendance — votre valeur ne dépend pas de l\'approbation des autres.' },
    pers: { q: 'On vous perçoit comme quelqu\'un de doux, fiable et accessible. Votre présence rassure.', v: 'Cette image douce peut faire sous-estimer votre force réelle — montrez vos limites.' },
    mat:  { q: 'Avec l\'âge, votre intuition relationnelle devient un super-pouvoir. Vous lisez les gens sans effort.', v: 'Maturité du 2 : oser le conflit constructif plutôt que la paix de façade.' },
  },
  3: {
    cdv:  { q: 'Votre mission est de créer, communiquer et inspirer. Vous êtes ici pour apporter lumière et joie.', v: 'Le piège : la dispersion créative. Trop d\'idées tuent l\'exécution.' },
    expr: { q: 'Vous communiquez avec un enthousiasme contagieux. Votre créativité est votre plus grand atout professionnel.', v: 'Le talent sans discipline produit des feux d\'artifice, pas des cathédrales.' },
    soul: { q: 'Au fond, vous êtes animé par le besoin de vous exprimer et d\'être reconnu pour votre originalité.', v: 'Cette soif de reconnaissance peut vous rendre dépendant des applaudissements.' },
    pers: { q: 'On perçoit en vous quelqu\'un de brillant, drôle et sociable. Votre charisme ouvre les portes.', v: 'L\'image du "toujours joyeux" peut masquer vos moments de doute — autorisez-vous la vulnérabilité.' },
    mat:  { q: 'Avec l\'âge, votre créativité gagne en profondeur. Vous passez de l\'inspiration à l\'œuvre durable.', v: 'Maturité du 3 : choisir un projet et aller au bout plutôt que papillonner.' },
  },
  4: {
    cdv:  { q: 'Votre mission est de construire du solide et du durable. Vous êtes l\'architecte qui transforme les rêves en réalité.', v: 'Le piège : la rigidité. Les meilleures fondations savent absorber les secousses.' },
    expr: { q: 'Vous excellez dans l\'organisation, la méthode et l\'exécution. Quand vous faites, c\'est fait bien.', v: 'Votre perfectionnisme peut ralentir la livraison — le bien est parfois l\'ennemi du parfait.' },
    soul: { q: 'Au fond, vous cherchez la sécurité et l\'ordre. Le chaos vous déstabilise profondément.', v: 'Ce besoin de contrôle peut vous empêcher de saisir les opportunités imprévues.' },
    pers: { q: 'On vous perçoit comme fiable, carré, quelqu\'un sur qui on peut compter sans hésiter.', v: 'Cette image de rigueur peut paraître froide — montrez aussi votre côté humain.' },
    mat:  { q: 'Avec l\'âge, votre sens de la structure devient votre marque de fabrique. Vos réalisations parlent pour vous.', v: 'Maturité du 4 : apprendre que le lâcher-prise est aussi une forme de solidité.' },
  },
  5: {
    cdv:  { q: 'Votre mission est d\'explorer, de transformer et de libérer. Vous êtes le catalyseur du changement.', v: 'Le piège : l\'instabilité permanente. La liberté sans racines devient errance.' },
    expr: { q: 'Vous vous adaptez à tout, vous apprenez vite et votre curiosité est magnétique.', v: 'Cette polyvalence peut devenir dispersion — choisir, c\'est aussi renoncer.' },
    soul: { q: 'Au fond, vous brûlez pour la liberté et l\'expérience. L\'inconnu vous attire irrésistiblement.', v: 'Cette soif d\'aventure peut saboter vos engagements — distinguez fuite et exploration.' },
    pers: { q: 'On perçoit en vous quelqu\'un de dynamique, magnétique, toujours en mouvement.', v: 'Cette image d\'aventurier peut inquiéter ceux qui cherchent de la stabilité chez vous.' },
    mat:  { q: 'Avec l\'âge, vos expériences multiples deviennent une sagesse unique. Vous êtes le conseiller vécu.', v: 'Maturité du 5 : canaliser l\'énergie du changement dans un projet qui dure.' },
  },
  6: {
    cdv:  { q: 'Votre mission est de protéger, d\'harmoniser et de prendre soin. Vous êtes le cœur battant de votre entourage.', v: 'Le piège : le sacrifice de soi. Vous ne pouvez pas remplir les autres depuis une coupe vide.' },
    expr: { q: 'Vous excellez à créer de la beauté, de l\'harmonie et du lien. Les gens se sentent bien près de vous.', v: 'Ce don de soin peut devenir du contrôle déguisé en amour — laissez les autres grandir seuls.' },
    soul: { q: 'Au fond, vous aspirez à l\'harmonie familiale et à un monde plus juste. L\'injustice vous révolte.', v: 'Ce besoin d\'harmonie peut vous faire accepter l\'inacceptable pour "garder la paix".' },
    pers: { q: 'On perçoit en vous quelqu\'un de chaleureux, responsable et protecteur. Un pilier.', v: 'Cette image de pilier peut faire oublier que vous aussi avez besoin de soutien.' },
    mat:  { q: 'Avec l\'âge, votre sagesse du cœur devient votre force. Vos conseils sont recherchés.', v: 'Maturité du 6 : protéger sans étouffer, aimer sans s\'oublier.' },
  },
  7: {
    cdv:  { q: 'Votre mission est de chercher la vérité profonde. Vous êtes le philosophe, l\'analyste, le sage.', v: 'Le piège : l\'intellectualisation de tout. Vivre, c\'est aussi ressentir sans comprendre.' },
    expr: { q: 'Vous excellez dans l\'analyse, la recherche et la réflexion stratégique. Votre esprit est votre arme.', v: 'Ce talent analytique peut devenir paralysie — parfois il faut agir avant de tout comprendre.' },
    soul: { q: 'Au fond, vous êtes mû par une quête de sens et de vérité. Les réponses faciles ne vous satisfont pas.', v: 'Cette quête peut devenir obsessionnelle — acceptez que certains mystères n\'ont pas de réponse.' },
    pers: { q: 'On perçoit en vous quelqu\'un de profond, un peu mystérieux, dont la pensée va loin.', v: 'Cette aura de mystère peut créer de la distance — laissez les autres voir qui vous êtes vraiment.' },
    mat:  { q: 'Avec l\'âge, votre sagesse intérieure rayonne. Vous devenez le mentor que les gens cherchent.', v: 'Maturité du 7 : partager vos découvertes au lieu de les garder pour vous.' },
  },
  8: {
    cdv:  { q: 'Votre mission est de matérialiser, de bâtir du pouvoir et de l\'influence. Vous êtes le stratège de l\'action.', v: 'Le piège : la course au résultat. Le pouvoir sans éthique est une bombe à retardement.' },
    expr: { q: 'Vous excellez à transformer les visions en résultats concrets. L\'exécution est votre zone de génie.', v: 'Cette efficacité peut broyer les relations humaines — les gens ne sont pas des KPIs.' },
    soul: { q: 'Au fond, vous êtes mû par l\'ambition de laisser une empreinte tangible dans le monde.', v: 'Ce besoin de réussir peut masquer une peur profonde de l\'insignifiance.' },
    pers: { q: 'On perçoit en vous quelqu\'un d\'ambitieux, solide, qui inspire la confiance dans l\'action.', v: 'Cette image d\'autorité peut intimider — montrez aussi votre vulnérabilité stratégique.' },
    mat:  { q: 'Avec l\'âge, votre sens stratégique devient redoutable. Vous savez exactement où frapper.', v: 'Maturité du 8 : utiliser le pouvoir acquis pour élever les autres, pas seulement soi.' },
  },
  9: {
    cdv:  { q: 'Votre mission est de servir une cause plus grande que vous. Compassion, vision globale, héritage.', v: 'Le piège : ne jamais finir ce que vous commencez. Le 9 doit apprendre l\'art de la conclusion.' },
    expr: { q: 'Vous avez une vision d\'ensemble que peu possèdent. Vous voyez les connexions invisibles.', v: 'Cette vision globale peut négliger les détails — l\'exécution locale compte autant que la stratégie globale.' },
    soul: { q: 'Au fond, vous aspirez à un impact significatif sur le monde. L\'égoïsme vous est étranger.', v: 'Cette compassion universelle peut vous épuiser — vous ne pouvez pas sauver tout le monde.' },
    pers: { q: 'On perçoit en vous quelqu\'un de sage, généreux, avec une aura de bienveillance.', v: 'Cette image de sagesse peut créer des attentes irréalistes — vous avez aussi le droit de douter.' },
    mat:  { q: 'Avec l\'âge, votre sagesse humaniste atteint sa pleine puissance. Vous devenez un phare.', v: 'Maturité du 9 : transmettre votre vision sans vous accrocher au résultat.' },
  },
  11: {
    cdv:  { q: 'Votre mission est de canaliser une intuition hors norme pour guider et éclairer les autres. Vous captez ce que personne ne voit.', v: 'Le piège du 11 : l\'hypersensibilité peut paralyser. Votre don demande un ancrage solide pour ne pas vous consumer.' },
    expr: { q: 'Vous communiquez avec une profondeur qui touche les gens au-delà des mots. Votre présence seule inspire.', v: 'Ce talent peut vous submerger d\'émotions des autres — protégez votre énergie avec des limites claires.' },
    soul: { q: 'Au plus profond, vous êtes mû par un besoin de transcendance et de connexion à quelque chose de plus grand.', v: 'Cette quête spirituelle peut vous déconnecter du quotidien — votre mission se vit aussi dans le concret.' },
    pers: { q: 'Les autres perçoivent en vous une aura magnétique, presque mystique. Votre regard semble lire au-delà des apparences.', v: 'Cette intensité peut déstabiliser — tout le monde n\'est pas prêt à être vu aussi profondément.' },
    mat:  { q: 'Avec l\'âge, votre intuition visionnaire devient votre plus grand atout stratégique. Vous voyez venir avant les autres.', v: 'Maturité du 11 : faire confiance à votre vision même quand personne ne la comprend encore.' },
  },
  22: {
    cdv:  { q: 'Votre mission est titanesque : concrétiser des visions qui transforment le collectif. Bâtisseur d\'empires.', v: 'La pression du 22 est immense — sans fondations solides (énergie du 4), tout peut s\'effondrer.' },
    expr: { q: 'Vous avez la rare capacité de transformer les grandes idées en réalisations concrètes à grande échelle.', v: 'Ce talent de maître bâtisseur peut mener au surmenage — déléguez, vous n\'êtes pas obligé de tout porter.' },
    soul: { q: 'Au fond, vous aspirez à laisser un héritage durable qui dépasse votre propre vie.', v: 'Cette ambition peut vous écraser — acceptez que Rome ne s\'est pas construite en un jour.' },
    pers: { q: 'On perçoit en vous une force tranquille capable de soulever des montagnes.', v: 'Cette image de puissance peut créer une pression impossible — montrez que vous êtes humain aussi.' },
    mat:  { q: 'Avec l\'âge, votre capacité de réalisation atteint des sommets. Vos projets prennent une dimension collective.', v: 'Maturité du 22 : bâtir pour les autres, pas seulement pour prouver que vous pouvez.' },
  },
  33: {
    cdv:  { q: 'Votre mission est l\'amour inconditionnel et l\'enseignement. Le plus rare et le plus exigeant des chemins.', v: 'Le don de soi total peut mener à l\'épuisement — poser ses limites est vital, même pour un 33.' },
    expr: { q: 'Vous avez un don de guérison par les mots, la présence et l\'enseignement. Votre bienveillance est thérapeutique.', v: 'Ce talent de guérisseur peut attirer des personnes toxiques — protégez votre espace.' },
    soul: { q: 'Au fond, vous aspirez à un amour universel et à l\'élévation de la conscience collective.', v: 'Cette compassion infinie peut vous vider — rechargez-vous avant de donner encore.' },
    pers: { q: 'On perçoit en vous un être de lumière, un guide naturel dont la sagesse apaise.', v: 'Cette image de sainteté peut être un fardeau — vous avez le droit d\'être imparfait.' },
    mat:  { q: 'Avec l\'âge, votre sagesse d\'amour universel rayonne avec une puissance rare.', v: 'Maturité du 33 : enseigner par l\'exemple, sans se sacrifier sur l\'autel du service.' },
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
  1:  { y: 'Année de nouveaux départs — lancez les projets que vous repoussez. L\'énergie d\'initiative est maximale cette année.', m: 'Ce mois favorise les prises de décision rapides. Osez proposer, trancher, avancer sans attendre la permission.', d: 'Aujourd\'hui, prenez l\'initiative. Un premier pas décisif vaut mieux qu\'un plan parfait jamais exécuté.' },
  2:  { y: 'Année de partenariats et de patience. Les résultats viendront par la collaboration, pas par la force.', m: 'Ce mois invite à écouter avant de parler, à négocier plutôt qu\'imposer. Les alliances se renforcent.', d: 'Aujourd\'hui, misez sur le dialogue. Une main tendue rapportera plus qu\'un coup de force.' },
  3:  { y: 'Année de créativité et de visibilité. Votre capacité à communiquer et à inspirer est amplifiée.', m: 'Ce mois est propice à l\'expression créative. Partagez vos idées, publiez, présentez — votre message porte.', d: 'Aujourd\'hui, exprimez-vous. Un pitch, un post, une conversation — votre créativité touche juste.' },
  4:  { y: 'Année de construction méthodique. Posez les fondations — le travail structuré de cette année portera ses fruits longtemps.', m: 'Ce mois appelle de la rigueur et de l\'organisation. Faites le tri, structurez, documentez.', d: 'Aujourd\'hui, concentrez-vous sur l\'exécution. Pas de raccourcis — la qualité du travail parle d\'elle-même.' },
  5:  { y: 'Année de changement et d\'expansion. Soyez mobile, curieux, ouvert aux opportunités inattendues.', m: 'Ce mois apporte du mouvement — voyages, rencontres, pivots. Surfez sur les changements au lieu de les subir.', d: 'Aujourd\'hui, sortez de votre zone de confort. L\'imprévu est votre meilleur allié.' },
  6:  { y: 'Année centrée sur la famille, la responsabilité et l\'harmonie. Investissez dans vos relations proches.', m: 'Ce mois vous ramène vers l\'essentiel : le foyer, les proches, l\'équilibre entre donner et se préserver.', d: 'Aujourd\'hui, prenez soin — de vous d\'abord, des autres ensuite. L\'harmonie commence par l\'intérieur.' },
  7:  { y: 'Année d\'introspection et de recherche de sens. Prenez du recul pour mieux voir le chemin.', m: 'Ce mois invite à l\'analyse et à la réflexion. Lisez, étudiez, méditez — les réponses sont à l\'intérieur.', d: 'Aujourd\'hui, creusez avant de conclure. L\'intuition vous guide si vous prenez le temps de l\'écouter.' },
  8:  { y: 'Année de récolte et de pouvoir. Vos efforts passés se concrétisent — saisissez les récompenses.', m: 'Ce mois est favorable aux négociations financières, aux décisions stratégiques et à l\'affirmation de votre position.', d: 'Aujourd\'hui, pensez résultat. Chaque action doit servir un objectif concret et mesurable.' },
  9:  { y: 'Année de bilan et de clôture. Terminez les cycles ouverts avant d\'en commencer de nouveaux.', m: 'Ce mois vous invite à lâcher prise sur ce qui ne vous sert plus. Faites de la place pour le renouveau.', d: 'Aujourd\'hui, finissez ce que vous avez commencé. La compassion et la générosité ouvrent des portes.' },
  11: { y: 'Année d\'éveil et d\'inspiration. Votre intuition est en hyper-connexion — faites-lui confiance.', m: 'Ce mois amplifie vos perceptions. Les idées qui vous traversent ne sont pas anodines — notez-les, elles ont de la valeur.', d: 'Aujourd\'hui, votre radar intérieur est affûté. Fiez-vous à votre première impression, elle voit juste.' },
  22: { y: 'Année de réalisation majeure. Le rêve peut devenir réalité si vous combinez vision et discipline.', m: 'Ce mois offre la possibilité de concrétiser un projet ambitieux. Pensez grand mais exécutez méthodiquement.', d: 'Aujourd\'hui, vous avez la capacité de matérialiser l\'impossible. Structurez votre vision en étapes.' },
  33: { y: 'Année de rayonnement et de service. Votre capacité à élever les autres est à son maximum.', m: 'Ce mois vous connecte à un amour plus grand. Enseignez, guidez, inspirez — c\'est votre zone de génie.', d: 'Aujourd\'hui, votre bienveillance est votre super-pouvoir. Un mot juste peut transformer la journée de quelqu\'un.' },
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
  'Métal': 'Discipline, rigueur, détermination. L\'élément Métal aiguise votre capacité de décision et votre sens de la justice.',
  'Eau':   'Intuition, adaptabilité, profondeur. L\'Eau vous donne la capacité de contourner les obstacles avec fluidité.',
  'Bois':  'Croissance, créativité, expansion. Le Bois nourrit votre vision à long terme et votre générosité naturelle.',
  'Feu':   'Passion, charisme, action. Le Feu amplifie votre leadership et votre capacité à inspirer les autres.',
  'Terre': 'Stabilité, pragmatisme, fiabilité. La Terre vous ancre dans le concret et renforce la confiance des autres.',
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
  1: { present: 'Vous savez vous exprimer et défendre vos idées — les mots sont votre premier outil de pouvoir.', missing: 'La communication spontanée n\'est pas naturelle — préparez vos prises de parole, elles n\'en seront que meilleures.' },
  2: { present: 'Votre intuition capte les signaux faibles — fiez-vous à vos « impressions », elles sont souvent justes.', missing: 'L\'intuition brute n\'est pas votre premier réflexe — vous compensez par l\'analyse, ce qui peut être plus fiable.' },
  3: { present: 'L\'imagination est votre terrain de jeu — vous voyez des possibilités là où d\'autres voient des murs.', missing: 'La créativité pure n\'est pas votre mode par défaut — vous innovez plutôt par amélioration que par invention.' },
  4: { present: 'L\'ordre et la méthode sont dans votre ADN — vos processus sont vos fondations.', missing: 'L\'organisation ne vient pas naturellement — mais une fois mise en place, elle vous libère plus que les autres.' },
  5: { present: 'Le 5 au centre de la grille fait de vous un pont entre toutes les énergies — vous êtes le liant.', missing: 'Sans le 5 central, vous pouvez avoir du mal à connecter vos différentes forces entre elles — cherchez un unificateur.' },
  6: { present: 'Le sens des responsabilités vous ancre — les gens comptent sur vous, et vous assumez.', missing: 'La responsabilité domestique n\'est pas votre moteur premier — vous êtes plus tourné vers l\'extérieur.' },
  7: { present: 'La réflexion et l\'analyse sont vos alliées — vous comprenez les choses en profondeur avant d\'agir.', missing: 'L\'introspection analytique n\'est pas votre premier réflexe — vous apprenez davantage par l\'expérience que par la théorie.' },
  8: { present: 'Le sens du détail et de l\'efficacité matérielle vous donne un avantage concret dans l\'exécution.', missing: 'La précision opérationnelle est à développer — entourez-vous de profils « exécutants » pour compléter votre vision.' },
  9: { present: 'Vous portez naturellement une vision large et ambitieuse — le petit ne vous intéresse pas.', missing: 'La vision panoramique n\'est pas innée — développez-la en prenant régulièrement du recul sur vos projets.' },
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

export default function ProfileTab({ data, bd, bt, gender = 'M' }: { data: SoulData; bd: string; bt?: string; gender?: 'M' | 'F' }) {
  const { num, astro, cz, iching } = data;

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
    [['CdV', hasMasterLP ? lpHoriz : num.lp], ['Expr', num.expr], ['Soul', num.soul], ['Pers', num.pers], ['Mat', num.mat]] as [string, { v: number; m?: boolean }][]
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

  return (
    <div>
      {/* ══ NOMBRES FONDAMENTAUX ══ */}
      <Sec icon="✦" title="Nombres Fondamentaux">
        <Cd>
          <div style={intro}>
            La numérologie pythagoricienne, formalisée par Pythagore au VIe siècle av. J.-C. et développée par des chercheurs comme Jean-Daniel Fermier et François Notter, associe chaque lettre à une valeur vibratoire. Six nombres-clés révèlent votre architecture intérieure : mission de vie (CdV), savoir-faire (Expr), motivation profonde (Âme), image projetée (Pers), maturité (Mat) et vibration innée (BDay). <Badge type="fixe" />
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
            {([['CdV', hasMasterLP ? lpHoriz : num.lp], ['Expr', num.expr], ['Soul', num.soul], ['Pers', num.pers], ['Mat', num.mat], ['BDay', num.bday]] as [string, { v: number; m?: boolean }][]).map(([l, v]) => (
              <Orb key={l} v={v.v} sz={52} lb={l === 'CdV' ? `CdV ${lpDisplay}` : l} sub={getNumberInfo(v.v).k} gl={l === 'CdV'} />
            ))}
          </div>

          {/* Dual Life Path explanation */}
          {hasMasterLP && (
            <div style={{ marginTop: 14, padding: '10px 14px', background: `${P.gold}08`, borderRadius: 8, border: `1px solid ${P.gold}18` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: P.gold, marginBottom: 4 }}>Chemin de Vie {lpDisplay}</div>
              <div style={{ fontSize: 11, color: P.textMid, lineHeight: 1.6 }}>
                <b>Méthode Ducoz</b> (réduction par cycles) : {num.lp.ch.join(' → ')} = <b>{num.lp.v}</b> · <b>Méthode horizontale</b> (chiffre par chiffre) : {lpHoriz.ch.join(' → ')} = <b style={{ color: P.gold }}>{lpHoriz.v}</b> (maître nombre)
              </div>
              <div style={{ fontSize: 11, color: P.textDim, marginTop: 6, lineHeight: 1.5 }}>
                Votre CdV <b style={{ color: P.gold }}>{lpHoriz.v}</b> ({getNumberInfo(lpHoriz.v).k}) amplifie l'énergie du <b>{num.lp.v}</b> ({getNumberInfo(num.lp.v).k}). Les deux méthodes sont valides — vous vivez sous l'influence de l'une ou l'autre selon les périodes de votre vie. Le maître nombre indique un potentiel supérieur qui demande plus de conscience pour être pleinement activé.
              </div>
            </div>
          )}

          {/* Detailed interpretations */}
          <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
            {([
              ['Chemin de Vie', lpMain.v, 'Votre mission fondamentale — ce pour quoi vous êtes ici'],
              ['Expression', num.expr.v, 'Votre savoir-faire — comment vous agissez concrètement'],
              ['Âme', num.soul.v, 'Votre motivation profonde — ce qui vous fait vibrer intérieurement'],
              ['Personnalité', num.pers.v, 'Votre vitrine — l\'image que les autres perçoivent de vous'],
              ['Maturité', num.mat.v, 'Votre sagesse tardive — énergie qui se renforce après 40 ans'],
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
        </Cd>
      </Sec>

      {/* ══ CHALDÉEN ══ */}
      <Sec icon="☿" title="Chaldéen — Vibration sonore">
        <Cd>
          <div style={intro}>
            Système babylonien (~3000 av. J.-C.), le plus ancien de la numérologie. Il analyse la vibration sonore de votre <b style={{ color: P.text }}>premier prénom + nom de famille</b> (hors deuxième prénom), indépendamment de l'alphabet latin. <Badge type="fixe" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Orb v={num.ch.rd.v} sz={56} lb="Chaldéen" />
            <div>
              <div style={{ fontSize: 13, color: P.textMid }}>
                Composé <b style={{ fontSize: 16 }}>{num.ch.cp}</b> → réduit à <b style={{ color: getNumberInfo(num.ch.rd.v).c, fontSize: 16 }}>{num.ch.rd.v}</b> ({getNumberInfo(num.ch.rd.v).k})
              </div>
              <div style={{ fontSize: 10, color: P.textDim, marginTop: 4 }}>
                Basé sur votre premier prénom + nom
              </div>
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
              ⚡ Votre Chaldéen ({num.ch.rd.v}) = votre Chemin de Vie — double confirmation de votre énergie fondamentale.
            </div>
          )}
        </Cd>
      </Sec>

      {/* ══ ZODIAQUE CHINOIS ══ */}
      <Sec icon="🐉" title={`Zodiaque Chinois — ${cz.czY}`}>
        <Cd>
          <div style={intro}>
            Le zodiaque chinois (生肖, Shēngxiào) est un système millénaire fondé sur les cycles astronomiques de Jupiter. Il combine un animal (cycle de 12 ans) et un élément (cycle de 10 ans) pour former 60 combinaisons uniques — le cycle sexagésimal (六十甲子), base du calendrier impérial chinois depuis plus de 2 600 ans. Votre signe reflète votre tempérament profond et vos dynamiques relationnelles. <Badge type="fixe" />
          </div>
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

          {/* Relationships */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
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
        </Cd>
      </Sec>

      {/* ══ BAZI NATAL — Maître du Jour & Fleur de Pêcher ══ */}
      {(() => {
        try {
          const birthDate = new Date(bd + 'T12:00:00');
          const natalBazi = calcBaZiDaily(birthDate, birthDate, 50);
          const peach = getPeachBlossom(birthDate, birthDate);
          const dmStem = natalBazi.dailyStem;
          const peachBranch = peach.peachBranch;
          const peachLabel = peach.label;
          return (
            <Sec icon="☯" title={`Pilier du Jour — ${dmStem.chinese} ${dmStem.pinyin}`}>
              <Cd>
                <div style={intro}>
                  Le BaZi (八字, « Quatre Piliers du Destin ») est un système chinois de plus de 2 000 ans, fondé sur le calendrier solaire et les cycles des 5 éléments. Votre Pilier du Jour — combinaison du Tronc Céleste et de la Branche Terrestre de votre naissance — est votre ADN énergétique. Votre Fleur de Pêcher (桃花) natale indique votre magnétisme naturel. <Badge type="fixe" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {/* Maître du Jour */}
                  <div style={{ padding: '12px 14px', borderRadius: 10, background: `${natalBazi.dailyStem.color}10`, border: `1px solid ${natalBazi.dailyStem.color}25` }}>
                    <div style={{ fontSize: 28, textAlign: 'center', marginBottom: 6 }}>{dmStem.chinese}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: P.text, textAlign: 'center' }}>{dmStem.pinyin}</div>
                    <div style={{ fontSize: 11, color: natalBazi.dailyStem.color, textAlign: 'center', marginTop: 2 }}>{dmStem.element} {dmStem.polarity === 'yang' ? '☀️ Yang' : '🌙 Yin'}</div>
                    <div style={{ fontSize: 10, color: P.gold, textAlign: 'center', marginTop: 4, fontWeight: 600 }}>
                      « {dmStem.archetype} »
                    </div>
                    <div style={{ fontSize: 10, color: P.textDim, textAlign: 'center', marginTop: 4, lineHeight: 1.5 }}>
                      Votre Maître du Jour natal — l'énergie que vous projetez chaque jour
                    </div>
                  </div>
                  {/* Fleur de Pêcher */}
                  <div style={{ padding: '12px 14px', borderRadius: 10, background: '#f472b610', border: '1px solid #f472b625' }}>
                    <div style={{ fontSize: 28, textAlign: 'center', marginBottom: 6 }}>🌸</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#f472b6', textAlign: 'center' }}>{peachLabel}</div>
                    <div style={{ fontSize: 11, color: '#f472b6aa', textAlign: 'center', marginTop: 2 }}>桃花 Fleur de Pêcher</div>
                    <div style={{ fontSize: 10, color: P.textDim, textAlign: 'center', marginTop: 6, lineHeight: 1.5 }}>
                      Les jours où la branche terrestre du jour = {peachLabel}, votre charme est amplifié
                    </div>
                  </div>
                </div>

                {/* Lecture du Maître du Jour */}
                <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 8, background: P.surface, border: `1px solid ${P.cardBdr}` }}>
                  <div style={{ fontSize: 10, color: natalBazi.dailyStem.color, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 6 }}>☯ Votre signature énergétique</div>
                  <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.7 }}>
                    <b style={{ color: natalBazi.dailyStem.color }}>{dmStem.pinyin}</b> ({dmStem.element} {dmStem.polarity === 'yang' ? 'Yang' : 'Yin'}), archétype « {dmStem.archetype} », est votre signature profonde — pas ce que vous montrez au monde, mais ce que vous <i>êtes</i> fondamentalement.{' '}
                    <b style={{ color: P.green }}>Force :</b> {dmStem.strength}{' '}
                    <b style={{ color: '#ef4444' }}>Talon d'Achille :</b> {dmStem.risk}{' '}
                    <b style={{ color: P.gold }}>Conseil stratégique :</b> {dmStem.businessAdvice}
                  </div>
                </div>

                {/* Lecture Fleur de Pêcher + prochaines dates */}
                <div style={{ marginTop: 6, padding: '10px 14px', borderRadius: 8, background: '#f472b606', border: '1px solid #f472b615' }}>
                  <div style={{ fontSize: 10, color: '#f472b6', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 6 }}>🌸 Votre magnétisme naturel</div>
                  <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.7 }}>
                    Votre Fleur de Pêcher est le <b style={{ color: '#f472b6' }}>{peachBranch.animal}</b> ({peachBranch.chinese}).{' '}
                    En BaZi classique, elle indique les jours où votre charme, votre pouvoir de persuasion et votre attractivité sont naturellement amplifiés — idéal pour les pitchs, les négociations relationnelles ou les premières impressions.
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
                              C'est votre jour Fleur de Pêcher — charme amplifié !
                            </div>
                          )}
                          <div style={{ fontSize: 10, color: '#f472b6aa', fontWeight: 600, marginBottom: 4 }}>
                            {isToday ? '📅 Prochains jours' : `📅 Vos prochains jours ${peachBranch.animal} (${peachBranch.chinese})`} — cycle de 12 jours
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
                            💡 Ces jours-là, planifiez vos réunions importantes, premiers rendez-vous ou présentations clés.
                          </div>
                        </div>
                      );
                    } catch { return null; }
                  })()}
                </div>
              </Cd>
            </Sec>
          );
        } catch { return null; }
      })()}

      {/* ══ NA YIN & CHANGSHENG NATAL — V4.3 ══ */}
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
            <Sec icon="🎵" title={`Na Yin & Changsheng — ${nayin.entry.name_cn}`}>
              <Cd>
                <div style={intro}>
                  Le Na Yin (纳音, « son intériorisé ») est un concept issu du Livre des Mutations et intégré au BaZi depuis la dynastie Tang. Il attribue un élément qualifié (ex. « Bois du Saule ») à chaque paire de Tronc-Branche — une texture subtile qui colore votre énergie de fond. Le Changsheng (长生, « cycle de vie ») décrit la phase de maturité de votre élément natal. <Badge type="fixe" />
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
                  <div style={{ fontSize: 10, color: ELEM_COLORS[nayin.entry.element] || '#60a5fa', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 6 }}>🎵 Ce que votre Na Yin révèle</div>
                  <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.7 }}>
                    Votre mélodie natale est <b style={{ color: ELEM_COLORS[nayin.entry.element] || '#60a5fa' }}>{nayin.entry.name_fr}</b> ({nayin.entry.name_cn}) — {nayin.entry.description.charAt(0).toLowerCase() + nayin.entry.description.slice(1)}{' '}
                    Cette énergie est de nature <b>{nayin.entry.category}</b> : {
                      nayin.entry.category === 'puissant' ? 'elle vous donne une force brute qui impressionne et qui ouvre les portes — à condition de la canaliser. En négociation, vous avez un avantage naturel : votre présence impose le respect avant même que vous ne parliez.' :
                      nayin.entry.category === 'subtil' ? 'elle opère en coulisses, influençant sans que les autres le réalisent. Votre puissance est discrète mais réelle — en stratégie, c\'est un atout majeur : on ne se méfie pas de ce qu\'on ne voit pas.' :
                      nayin.entry.category === 'stable' ? 'elle vous ancre dans la durée. Ce que vous construisez résiste au temps et aux tempêtes. Vos partenaires et clients vous font confiance parce que vous dégagez une solidité qu\'on ne peut pas simuler.' :
                      nayin.entry.category === 'fluide' ? 'elle vous rend adaptable et insaisissable. Là où d\'autres se heurtent aux obstacles, vous les contournez avec élégance. En période de crise, vous êtes celui qui trouve la sortie pendant que les autres paniquent.' :
                      'elle vous pousse vers la mutation perpétuelle. Chaque fin est un début déguisé — votre capacité à vous réinventer est votre plus grande force entrepreneuriale.'
                    }
                  </div>
                </div>

                {/* Lecture approfondie Changsheng */}
                <div style={{ marginTop: 6, padding: '10px 14px', borderRadius: 8, background: `${csColor}06`, border: `1px solid ${csColor}15` }}>
                  <div style={{ fontSize: 10, color: csColor, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 6 }}>🔄 Votre phase de vie natale</div>
                  <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.7 }}>
                    Vous êtes né en phase <b style={{ color: csColor }}>{cs.scoring.label_fr.split('—')[0].trim()}</b> ({cs.scoring.chinese}) — {cs.scoring.label_fr.split('—')[1]?.trim() || 'énergie en transition'}.{' '}
                    {cs.scoring.global >= 3 ? 'C\'est une position d\'énergie maximale — vous êtes venu au monde avec un capital vital puissant. L\'enjeu n\'est pas de trouver l\'énergie, mais de ne pas la gaspiller.' :
                     cs.scoring.global >= 1 ? 'C\'est une position favorable — votre énergie natale est en phase ascendante. Vous avez un élan naturel qui pousse vos projets vers l\'avant, même quand la motivation faiblit.' :
                     cs.scoring.global === 0 ? 'C\'est une position de potentiel latent — l\'énergie est là, en gestation, prête à se déployer au bon moment. Votre patience sera récompensée.' :
                     cs.scoring.global >= -2 ? 'C\'est une position de transition — votre force ne vient pas de l\'élan mais de la profondeur. Vous transformez les obstacles en carburant, ce que les profils « faciles » ne savent pas faire.' :
                     'C\'est une position de transformation radicale — vous portez en vous la capacité de renaître de vos cendres, un atout rare. Les plus grands entrepreneurs ont souvent des phases basses natales : la difficulté forge la résilience.'
                    }
                  </div>
                </div>

                {/* Croisement Na Yin × Changsheng */}
                <div style={{ marginTop: 6, padding: '10px 14px', borderRadius: 8, background: `${P.gold}06`, border: `1px solid ${P.gold}15` }}>
                  <div style={{ fontSize: 10, color: P.gold, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 6 }}>⚡ Na Yin × Changsheng — votre combinaison unique</div>
                  <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.7 }}>
                    Un « {nayin.entry.name_fr} » en phase « {cs.scoring.label_fr.split('—')[0].trim()} » crée un profil {
                      nayin.entry.category === 'fluide' && cs.scoring.global >= 1 ? 'qui surfe les opportunités avec un timing naturel — votre adaptabilité est amplifiée par un bon élan vital.' :
                      nayin.entry.category === 'fluide' && cs.scoring.global <= 0 ? 'qui doit cultiver sa flexibilité pour compenser une énergie qui monte lentement — la patience et l\'observation seront vos accélérateurs.' :
                      nayin.entry.category === 'puissant' && cs.scoring.global >= 1 ? 'de force vive — vous avancez avec impact et vélocité. Attention à ne pas brûler les étapes.' :
                      nayin.entry.category === 'puissant' && cs.scoring.global <= 0 ? 'de puissance contenue — comme un volcan dormant, votre force attend le bon moment pour éclater. Ne forcez pas le timing.' :
                      nayin.entry.category === 'stable' && cs.scoring.global >= 1 ? 'de constructeur né — fondations solides + élan naturel = empire durable.' :
                      nayin.entry.category === 'stable' && cs.scoring.global <= 0 ? 'de bâtisseur patient — vous construisez lentement mais ce que vous créez dure des décennies.' :
                      nayin.entry.category === 'subtil' && cs.scoring.global >= 1 ? 'de stratège invisible — influence discrète amplifiée par une bonne énergie. Vos coups les plus efficaces sont ceux que personne ne voit venir.' :
                      nayin.entry.category === 'subtil' && cs.scoring.global <= 0 ? 'de veilleur — vous observez, analysez et frappez au moment précis. Votre patience est votre arme secrète.' :
                      cs.scoring.global >= 1 ? 'en transformation positive — le meilleur est devant vous, et vous avez l\'énergie pour y aller.' :
                      'en gestation — préparez le terrain maintenant, la récolte viendra.'
                    }
                  </div>
                </div>
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
                  Les Quatre Piliers (八字, BāZì) forment le cœur du système : 8 caractères codent votre naissance. Année (héritage social), Mois (carrière et autorité), Jour (votre essence — le Maître du Jour), Heure (monde intérieur et maturité). Nécessite l'heure de naissance exacte. <Badge type="fixe" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
                  {pillars.map((p, i) => {
                    const col = ELEM_COLORS[p.stem.element] || '#60a5fa';
                    const isDM = i === 2; // Jour = Maître du Jour
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
                      </div>
                    );
                  })}
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
                  Les Piliers de Destinée (大运, Dà Yùn) sont un pilier central de l'astrologie chinoise classique, utilisés depuis plus de mille ans par les praticiens BaZi. Ils découpent votre vie en cycles de 10 ans, chacun défini par un binôme Tronc-Branche qui colore l'énergie dominante de la décennie. Comprendre votre pilier actuel, c'est savoir quel vent souffle dans vos voiles. <Badge type="decennal" />
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
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
            Le Lo Shu (洛書, « Écrit du fleuve Lo ») est un carré magique 3×3 découvert selon la légende sur la carapace d'une tortue il y a plus de 4 000 ans. Utilisé en Feng Shui et en numérologie chinoise, chaque case représente une énergie. Les cases remplies (issues de votre date de naissance) sont vos forces naturelles, les cases vides vos axes de développement. Le Moteur indique votre force d'action, la Direction indique votre trajectoire de vie. <Badge type="fixe" />
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
                Basé sur votre date de naissance
              </div>
            </div>
          </div>

          {/* Interpretive summary — Deep readings */}
          <div style={{ marginTop: 14, padding: '10px 12px', background: P.bg, borderRadius: 8, border: `1px solid ${P.cardBdr}` }}>
            <div style={{ fontSize: 11, color: P.green, fontWeight: 600, marginBottom: 8 }}>✦ Vos forces ({lsStrong.length} énergies actives)</div>
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
              Votre <b style={{ color: getNumberInfo(num.ls.dr.v).c }}>Moteur {num.ls.dr.v}</b> ({getNumberInfo(num.ls.dr.v).k}) est ce qui vous met en mouvement chaque matin.
              Votre <b style={{ color: getNumberInfo(num.ls.co.v).c }}>Direction {num.ls.co.v}</b> ({getNumberInfo(num.ls.co.v).k}) est là où cette énergie vous emmène à long terme.
              {num.ls.dr.v === num.ls.co.v
                ? ' Moteur et Direction identiques : votre trajectoire est d\'une cohérence rare — vous allez exactement là où votre énergie vous pousse.'
                : ` Ensemble : votre élan de ${getNumberInfo(num.ls.dr.v).k.toLowerCase()} alimente une trajectoire de ${getNumberInfo(num.ls.co.v).k.toLowerCase()} — le « comment » nourrit le « où ».`
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
            Le Yi King (易經, « Classique des Changements ») est le plus ancien texte de sagesse chinoise, vieux de plus de 3 000 ans, consulté par Confucius lui-même. Vos 64 hexagrammes codent les situations archétypales de la vie. Votre hexagramme de naissance est votre archétype stratégique permanent — l'énergie fondamentale qui sous-tend votre parcours, indépendamment des cycles quotidiens. <Badge type="fixe" />
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
              Ce texte accompagne votre hexagramme depuis plus de 3 000 ans. Il ne décrit pas un jour — il décrit une posture de vie. Relisez-le dans les moments de doute stratégique.
            </div>
          </div>
        </Cd>
      </Sec>

      {/* ══ LUNE NATALE ══ */}
      {astro && (() => {
        const nm = getNatalMoon(astro.b3.moon);
        if (!nm) return null;
        return (
          <Sec icon="☽" title={`Votre Lune Natale — ${nm.sign}`}>
            <Cd>
              <div style={intro}>
                En astrologie, la Lune représente votre monde émotionnel — un pilier fondamental du thème natal, reconnu depuis l'Antiquité par les traditions grecque, arabe et indienne. Votre Lune de naissance révèle vos besoins profonds, vos réactions instinctives, ce qui vous sécurise quand tout vacille. C'est la face invisible de votre personnalité, celle que seuls vos proches connaissent. <Badge type="fixe" />
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
                    Position lunaire à votre naissance
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

                {/* Ce qui vous sécurise */}
                <div style={{ padding: '10px 12px', background: '#10b98108', borderRadius: 8, borderLeft: '3px solid #10b98140' }}>
                  <div style={{ fontSize: 10, color: '#34d399', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 4 }}>🛡 Ce qui vous sécurise</div>
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
                    <div style={{ fontSize: 10, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 4 }}>🔮 Le don de votre ombre</div>
                    <div style={{ fontSize: 12, color: '#c4b5fd', lineHeight: 1.6 }}>{nm.darkGift}</div>
                  </div>
                )}

                {/* Hack concret */}
                {nm.hack && (
                  <div style={{ padding: '10px 12px', background: `${P.gold}06`, borderRadius: 8, borderLeft: `3px solid ${P.gold}40` }}>
                    <div style={{ fontSize: 10, color: P.gold, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 4 }}>💡 Astuce pour votre quotidien</div>
                    <div style={{ fontSize: 12, color: '#fbbf24', lineHeight: 1.6 }}>{nm.hack}</div>
                  </div>
                )}
              </div>
            </Cd>
          </Sec>
        );
      })()}

      {/* ══ VIBRATION DU JOUR ══ */}
      <Sec icon="⟳" title="Vibrations cycliques">
        <Cd>
          <div style={intro}>
            En numérologie, vos cycles personnels se calculent à partir de votre date de naissance et de l'année en cours. Trois cycles se superposent : l'Année donne la grande tendance (thème sur 12 mois), le Mois colore la période, le Jour donne l'énergie immédiate. L'Année et le Mois sont stables sur leur période, seul le Jour change quotidiennement. <Badge type="cycle" />
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {([
              ['Année Personnelle', num.py, '📅 Fixe toute l\'année ' + new Date().getFullYear() + ' — votre thème dominant', 'y'],
              ['Mois Personnel', num.pm, '📆 Fixe ce mois — coloration de la période en cours', 'm'],
              ['Jour Personnel', num.ppd, '⚡ Change chaque jour — l\'énergie à exploiter aujourd\'hui', 'd'],
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

      {/* ══ SYNTHÈSE MULTI-SYSTÈMES ══ */}
      <Sec icon="🔮" title="Synthèse Multi-Systèmes">
        <Cd>
          {/* Data grid */}
          <div style={{ fontSize: 13, color: P.textMid, lineHeight: 2, marginBottom: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 14px' }}>
              <span style={{ color: P.textDim, fontSize: 10, fontWeight: 600 }}>PYTH</span>
              <span>Chemin <b style={{ color: getNumberInfo(lpMain.v).c }}>{lpDisplay}</b> {getNumberInfo(lpMain.v).k} · Expr <b style={{ color: getNumberInfo(num.expr.v).c }}>{num.expr.v}</b> · Âme <b style={{ color: getNumberInfo(num.soul.v).c }}>{num.soul.v}</b></span>
              {astro && <>
                <span style={{ color: P.textDim, fontSize: 10, fontWeight: 600 }}>ASTRO</span>
                <span>{SIGN_SYM[astro.b3.sun]} <b>{SIGN_FR[astro.b3.sun]}</b> · ☽ <b>{SIGN_FR[astro.b3.moon]}</b>{!astro.noTime && <> · ↑ <b>{SIGN_FR[astro.b3.asc]}</b></>}</span>
              </>}
              <span style={{ color: P.textDim, fontSize: 10, fontWeight: 600 }}>中</span>
              <span>{cz.sym} <b>{cz.animal}</b> de <b style={{ color: cz.elemCol }}>{cz.elem}</b> · {cz.yy}</span>
              <span style={{ color: P.textDim, fontSize: 10, fontWeight: 600 }}>CHALD</span>
              <span>Vibration <b style={{ color: getNumberInfo(num.ch.rd.v).c }}>{num.ch.rd.v}</b> {getNumberInfo(num.ch.rd.v).k}</span>
              <span style={{ color: P.textDim, fontSize: 10, fontWeight: 600 }}>易</span>
              <span>Natal <b style={{ color: P.gold }}>{natal.hexNum}</b> {natal.name} · Jour <b style={{ color: P.gold }}>{iching.hexNum}</b> {iching.name}</span>
            </div>
          </div>

          {/* ── VOS FORCES (boost) ── */}
          <div style={{ padding: '12px 14px', background: `${P.green}08`, borderRadius: 10, border: `1px solid ${P.green}20`, marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: P.green, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 8 }}>✦ Vos forces — ce que les systèmes confirment</div>
            <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.7 }}>
              {/* Identity paragraph */}
              Votre Chemin de Vie <b style={{ color: P.gold }}>{lpDisplay}</b> ({getNumberInfo(lpMain.v).k}) vous donne une mission claire : {D[lpMain.v]?.cdv?.q?.split('.')[0]?.toLowerCase()}.
              {' '}Votre Expression <b>{num.expr.v}</b> ({getNumberInfo(num.expr.v).k}) vous donne les outils pour y arriver — {D[num.expr.v]?.expr?.q?.split('.')[0]?.toLowerCase()}.
              {masterList.length > 1 && <> Avec <b style={{ color: P.gold }}>{masterList.length} nombres maîtres</b>, vous portez une vibration rare qui amplifie votre potentiel bien au-delà de la moyenne.</>}

              {/* Astro layer */}
              {astro && <>
                {' '}En astrologie, votre Soleil en <b>{SIGN_FR[astro.b3.sun]}</b> {
                  ['Aries','Leo','Sagittarius'].includes(astro.b3.sun) ? 'renforce votre capacité d\'action et de leadership' :
                  ['Taurus','Virgo','Capricorn'].includes(astro.b3.sun) ? 'ancre votre vision dans une exécution pragmatique' :
                  ['Gemini','Libra','Aquarius'].includes(astro.b3.sun) ? 'affûte votre intelligence relationnelle et votre vision' :
                  'nourrit une intuition et une profondeur émotionnelle précieuses'
                }, votre Lune en <b>{SIGN_FR[astro.b3.moon]}</b> {
                  ['Aries','Leo','Sagittarius'].includes(astro.b3.moon) ? 'alimente un feu intérieur qui ne s\'éteint pas' :
                  ['Taurus','Virgo','Capricorn'].includes(astro.b3.moon) ? 'vous offre une stabilité émotionnelle solide' :
                  ['Gemini','Libra','Aquarius'].includes(astro.b3.moon) ? 'vous donne un recul émotionnel qui clarifie vos choix' :
                  'vous connecte à une empathie naturelle qui touche les gens'
                }
                {!astro.noTime && <>, et votre Ascendant <b>{SIGN_FR[astro.b3.asc]}</b> {
                  ['Aries','Leo','Sagittarius'].includes(astro.b3.asc) ? 'projette une image de confiance et d\'énergie.' :
                  ['Taurus','Virgo','Capricorn'].includes(astro.b3.asc) ? 'projette une image de solidité et de crédibilité.' :
                  ['Gemini','Libra','Aquarius'].includes(astro.b3.asc) ? 'projette une image d\'ouverture et d\'intelligence.' :
                  'projette une image de profondeur et de mystère.'
                }</>}
                {astro.noTime && '.'}
              </>}

              {/* Chinese zodiac */}
              {' '}Le <b style={{ color: cz.elemCol }}>{cz.czY}</b> {
                cz.elem === 'Feu' ? 'amplifie tout cela avec du charisme et de l\'audace — votre énergie est contagieuse.' :
                cz.elem === 'Terre' ? 'stabilise tout cela avec du pragmatisme — vos projets tiennent dans le temps.' :
                cz.elem === 'Métal' ? 'aiguise tout cela avec de la précision — votre exécution est chirurgicale.' :
                cz.elem === 'Eau' ? 'fluidifie tout cela avec de l\'adaptabilité — vous contournez les obstacles avec élégance.' :
                'fait grandir tout cela avec de la vision — votre trajectoire est naturellement ascendante.'
              }

              {/* Yi King */}
              {' '}Votre archétype Yi King natal « <b style={{ color: P.gold }}>{natalProf.archetype}</b> » (Hex. {natal.hexNum}) confirme cette configuration : {natalProf.opportunity?.split('.')[0]?.toLowerCase()}.
            </div>
          </div>

          {/* ── POINTS D'ATTENTION ── */}
          <div style={{ padding: '12px 14px', background: '#ef444408', borderRadius: 10, border: '1px solid #ef444420', marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: '#ef4444', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 8 }}>⚠ Points de vigilance — ce qui peut vous freiner</div>
            <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.7 }}>
              {D[lpMain.v]?.cdv?.v && <>Votre CdV {lpDisplay} a un angle mort : {D[lpMain.v].cdv.v.charAt(0).toLowerCase() + D[lpMain.v].cdv.v.slice(1)} </>}
              {D[num.expr.v]?.expr?.v && num.expr.v !== lpMain.v && <>Côté expression ({num.expr.v}), {D[num.expr.v].expr.v.charAt(0).toLowerCase() + D[num.expr.v].expr.v.slice(1)} </>}
              {czT?.v && <>En zodiaque chinois, le {cz.animal} doit surveiller : {czT.v.toLowerCase()}. </>}
              {lsMissing.length > 0 && (() => {
                // Séparer les énergies absentes en Lo Shu mais compensées par un nombre fondamental
                const coreNumbers = new Set([lpMain.v, num.expr.v, num.soul.v, num.pers.v, num.mat.v, num.bday.v].filter(v => v <= 9));
                const compensated = lsMissing.filter(n => coreNumbers.has(n));
                const trulyMissing = lsMissing.filter(n => !coreNumbers.has(n));
                return <>
                  {trulyMissing.length > 0 && <>Votre grille Lo Shu manque les énergies {trulyMissing.join(', ')} ({trulyMissing.map(n => LS_MEANING[n]).join(', ')}) — des axes à développer consciemment. </>}
                  {compensated.length > 0 && <>
                    {trulyMissing.length > 0 ? 'En revanche, les' : 'Les'} énergies {compensated.join(', ')} ({compensated.map(n => LS_MEANING[n]).join(', ')}) sont absentes de votre date de naissance mais compensées par vos nombres fondamentaux — votre nom supplée ce que votre date ne porte pas.{' '}
                  </>}
                </>;
              })()}
              {natalProf.risk && <>Le Yi King vous avertit aussi : {natalProf.risk.charAt(0).toLowerCase() + natalProf.risk.slice(1)}</>}
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
              <div style={{ fontSize: 11, color: P.gold, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 10 }}>⚡ En résumé — votre ADN croisé</div>
              <div style={{ fontSize: 12, color: P.text, lineHeight: 1.8, fontWeight: 500 }}>

                {/* §1 — Identité numérique */}
                Vous êtes un profil <b style={{ color: P.gold }}>{getNumberInfo(lpMain.v).k}</b> (CdV {lpDisplay}) avec une Expression <b>{num.expr.v}</b> ({getNumberInfo(num.expr.v).k}) — {
                  lpMain.v === num.expr.v ? 'mission et outils alignés, une configuration rare de cohérence.' :
                  'votre mission et vos outils sont complémentaires : le « pourquoi » (CdV) guide le « comment » (Expression).'
                }
                {masterList.length > 1 && <> Avec <b style={{ color: P.gold }}>{masterList.length} nombres maîtres</b> ({masterList.map(([label]) => label).join(', ')}), vous portez une vibration d'exception — mais attention, les maîtres nombres exigent autant qu'ils donnent.</>}

                {/* §2 — Couche astrologique */}
                {astro && <>
                  {' '}Votre trinité astrale {!astro.noTime ? <b>({SIGN_FR[astro.b3.sun]} / {SIGN_FR[astro.b3.moon]} / {SIGN_FR[astro.b3.asc]})</b> : <b>({SIGN_FR[astro.b3.sun]} / {SIGN_FR[astro.b3.moon]})</b>}{' '}
                  {!astro.noTime
                    ? `donne la texture émotionnelle : le ${SIGN_FR[astro.b3.sun]} agit, le ${SIGN_FR[astro.b3.moon]} ressent, le ${SIGN_FR[astro.b3.asc]} projette.`
                    : `complète le tableau : le ${SIGN_FR[astro.b3.sun]} agit, le ${SIGN_FR[astro.b3.moon]} ressent.`
                  }
                  {moonSign && <> Votre Lune en <b>{moonSign}</b> est votre boussole invisible — elle décide de vos réactions quand la pression monte.</>}
                </>}

                {/* §3 — Couche chinoise (Zodiac + BaZi) */}
                {' '}Le <b style={{ color: cz.elemCol }}>{cz.czY}</b> ({cz.yy}) croise cette configuration avec {
                  cz.elem === 'Feu' ? 'du charisme et de l\'audace' :
                  cz.elem === 'Terre' ? 'du pragmatisme et de l\'ancrage' :
                  cz.elem === 'Métal' ? 'de la précision et de la détermination' :
                  cz.elem === 'Eau' ? 'de l\'adaptabilité et de la profondeur' :
                  'de la croissance et de la vision'
                }
                {dmArchetype && <>, tandis que votre Maître du Jour « <b style={{ color: '#60a5fa' }}>{dmArchetype}</b> » définit votre mode opératoire quotidien</>}
                {nayinName && <>, coloré par la mélodie Na Yin « <b>{nayinName}</b> » ({nayinCat})</>}
                {csPhase && <> en phase « {csPhase} »</>}.

                {/* §4 — Lo Shu × Numérologie */}
                {' '}Votre grille Lo Shu active <b style={{ color: P.green }}>{lsStrong.length} énergies sur 9</b>
                {lsMissing.length > 0 ? ` — les ${lsMissing.length} manquantes ne sont pas des faiblesses mais des axes de croissance` : ' — un profil complet, ce qui est extrêmement rare'}.
                {num.ls.dr.v === num.ls.co.v
                  ? ` Moteur et Direction identiques (${num.ls.dr.v}) : une trajectoire d'une cohérence rare.`
                  : ` Votre Moteur ${num.ls.dr.v} (${getNumberInfo(num.ls.dr.v).k}) propulse votre Direction ${num.ls.co.v} (${getNumberInfo(num.ls.co.v).k}) — le carburant nourrit la destination.`
                }

                {/* §5 — Yi King + conclusion actionnelle */}
                {' '}Votre archétype Yi King « <b style={{ color: P.gold }}>{natalProf.archetype}</b> » (Hex. {natal.hexNum}) synthétise tout :{' '}
                {natalProf.judgment.charAt(0).toLowerCase() + natalProf.judgment.slice(1)}{' '}
                Tous vos systèmes pointent dans la même direction : vous avez le potentiel pour{' '}
                {
                  [1,8,22].includes(lpMain.v) ? 'bâtir quelque chose de significatif et durable' :
                  [2,6,33].includes(lpMain.v) ? 'connecter les gens et créer de l\'harmonie à grande échelle' :
                  [3,5].includes(lpMain.v) ? 'inspirer par votre créativité et votre audace' :
                  [4].includes(lpMain.v) ? 'construire des fondations sur lesquelles les autres s\'appuient' :
                  [7].includes(lpMain.v) ? 'éclairer les autres par votre sagesse et votre profondeur' :
                  [9].includes(lpMain.v) ? 'servir une cause plus grande avec compassion et vision' :
                  [11].includes(lpMain.v) ? 'guider les autres grâce à une intuition visionnaire que peu possèdent' :
                  'laisser une empreinte significative'
                }.

                {/* §6 — Call to action Yi King */}
                <div style={{ marginTop: 10, padding: '8px 12px', background: `${P.gold}0a`, borderRadius: 8, border: `1px solid ${P.gold}20` }}>
                  <div style={{ fontSize: 10, color: P.gold, fontWeight: 600, marginBottom: 4 }}>☰ LE MOT DE LA FIN — VOTRE YI KING NATAL</div>
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
                  Comment votre vécu résonne avec chaque famille de systèmes. Basé sur {weights.feedbackCount} jours de feedback.
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
                        <div style={{ fontSize: 10, color: P.textDim }}>Votre signature énergétique dominante</div>
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
                    Personnalisation à {weights.blendPercent}% — continuez à noter pour affiner votre profil
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
