import { Orb, Sec, Cd, P } from '../ui';
import { getNumberInfo } from '../../engines/numerology';
import { intro, gold12, Badge } from './shared';
import type { ProfileData, SoulData } from '../../engines/orchestrator';

/* ══ DOMAIN-SPECIFIC DESCRIPTIONS (qualités + vigilance adaptées au contexte) ══ */
/* Chaque domaine donne un éclairage différent du même nombre */

type Desc = { q: string; v: string };
export const D: Record<number, Record<string, Desc>> = {
  1: {
    cdv:  { q: 'Ta mission est de tracer ta propre voie et d\'initier le mouvement. Tu es ici pour oser en premier.', v: 'Le piège de ta mission : confondre indépendance et isolement. Leader n\'est pas solitaire.' },
    expr: { q: 'Tu t\'exprimes avec une force de conviction qui entraîne les autres. Ton mot-clé : initiative.', v: 'Ton talent peut intimider — apprends à doser ton intensité selon le contexte.' },
    soul: { q: 'Au fond, tu es {mû|mue} par un besoin viscéral d\'autonomie et de nouveauté. La routine t\'étouffe.', v: 'Cette soif d\'indépendance peut te couper des liens profonds dont tu as besoin.' },
    pers: { q: 'On perçoit en toi quelqu\'un de déterminé{|e}, sûr{|e} de {lui|elle}, qui sait où il{|le} va.', v: 'Cette image de force peut empêcher les autres de t\'offrir leur aide.' },
    mat:  { q: 'Avec l\'âge, ta capacité à trancher et à mener s\'affine — tu deviens {le capitaine naturel|la capitaine naturelle}.', v: 'Maturité du 1 : accepter que diriger, c\'est aussi écouter.' },
  },
  2: {
    cdv:  { q: 'Ta mission est de créer des ponts entre les gens, d\'harmoniser et de faciliter. Tu es {le|la} liant{|e} invisible.', v: 'Le piège : t\'oublier dans la quête d\'harmonie. Ta paix intérieure compte autant que celle des autres.' },
    expr: { q: 'Tu excelles dans la diplomatie, la médiation et l\'écoute active. Les gens se confient à toi naturellement.', v: 'Ce talent de médiat{eur|rice} peut devenir de l\'évitement de conflit — parfois il faut trancher.' },
    soul: { q: 'Au fond, tu cherches la connexion authentique et la coopération vraie. L\'harmonie est ton carburant.', v: 'Attention à la codépendance — ta valeur ne dépend pas de l\'approbation des autres.' },
    pers: { q: 'On te perçoit comme quelqu\'un de doux, fiable et accessible. Ta présence rassure.', v: 'Cette image douce peut faire sous-estimer ta force réelle — montre tes limites.' },
    mat:  { q: 'Avec l\'âge, ton intuition relationnelle devient un super-pouvoir. Tu lis les gens sans effort.', v: 'Maturité du 2 : oser le conflit constructif plutôt que la paix de façade.' },
  },
  3: {
    cdv:  { q: 'Ta mission est de créer, communiquer et inspirer. Tu es ici pour apporter lumière et joie.', v: 'Le piège : la dispersion créative. Trop d\'idées tuent l\'exécution.' },
    expr: { q: 'Tu communiques avec un enthousiasme contagieux. Ta créativité est ton plus grand atout professionnel.', v: 'Le talent sans discipline produit des feux d\'artifice, pas des cathédrales.' },
    soul: { q: 'Au fond, tu es {animé|animée} par le besoin de t\'exprimer et d\'être {reconnu|reconnue} pour ton originalité.', v: 'Cette soif de reconnaissance peut te rendre {dépendant|dépendante} des applaudissements.' },
    pers: { q: 'On perçoit en toi quelqu\'un de brillant, drôle et sociable. Ton charisme ouvre les portes.', v: 'L\'image du "toujours joyeux" peut masquer tes moments de doute — autorise-toi la vulnérabilité.' },
    mat:  { q: 'Avec l\'âge, ta créativité gagne en profondeur. Tu passes de l\'inspiration à l\'œuvre durable.', v: 'Maturité du 3 : choisir un projet et aller au bout plutôt que papillonner.' },
  },
  4: {
    cdv:  { q: 'Ta mission est de construire du solide et du durable. Tu es l\'architecte qui transforme les rêves en réalité.', v: 'Le piège : la rigidité. Les meilleures fondations savent absorber les secousses.' },
    expr: { q: 'Tu excelles dans l\'organisation, la méthode et l\'exécution. Quand tu fais, c\'est bien fait.', v: 'Ton perfectionnisme peut ralentir la livraison — le bien est parfois l\'ennemi du parfait.' },
    soul: { q: 'Au fond, tu cherches la sécurité et l\'ordre. Le chaos te déstabilise profondément.', v: 'Ce besoin de contrôle peut t\'empêcher de saisir les opportunités imprévues.' },
    pers: { q: 'On te perçoit comme fiable, carr{é|ée}, quelqu\'un sur qui on peut compter sans hésiter.', v: 'Cette image de rigueur peut paraître froide — montre aussi ton côté humain.' },
    mat:  { q: 'Avec l\'âge, ton sens de la structure devient ta marque de fabrique. Tes réalisations parlent pour toi.', v: 'Maturité du 4 : apprendre que le lâcher-prise est aussi une forme de solidité.' },
  },
  5: {
    cdv:  { q: 'Ta mission est d\'explorer, de transformer et de libérer. Tu es {le|la} catalyseur{|e} du changement.', v: 'Le piège : l\'instabilité permanente. La liberté sans racines devient errance.' },
    expr: { q: 'Tu t\'adaptes à tout, tu apprends vite et ta curiosité est magnétique.', v: 'Cette polyvalence peut devenir dispersion — choisir, c\'est aussi renoncer.' },
    soul: { q: 'Au fond, tu brûles pour la liberté et l\'expérience. L\'inconnu t\'attire irrésistiblement.', v: 'Cette soif d\'aventure peut saboter tes engagements — distingue fuite et exploration.' },
    pers: { q: 'On perçoit en toi quelqu\'un de dynamique, magnétique, toujours en mouvement.', v: 'Cette image d\'aventuri{er|ère} peut inquiéter ceux qui cherchent de la stabilité chez toi.' },
    mat:  { q: 'Avec l\'âge, tes expériences multiples deviennent une sagesse unique. Tu es {le|la} conseiller{|ère} vécu{|e}.', v: 'Maturité du 5 : canaliser l\'énergie du changement dans un projet qui dure.' },
  },
  6: {
    cdv:  { q: 'Ta mission est de protéger, d\'harmoniser et de prendre soin. Tu es le cœur battant de ton entourage.', v: 'Le piège : le sacrifice de soi. Tu ne peux pas remplir les autres depuis une coupe vide.' },
    expr: { q: 'Tu excelles à créer de la beauté, de l\'harmonie et du lien. Les gens se sentent bien près de toi.', v: 'Ce don de soin peut devenir du contrôle déguisé en amour — laisse les autres grandir seuls.' },
    soul: { q: 'Au fond, tu aspires à l\'harmonie familiale et à un monde plus juste. L\'injustice te révolte.', v: 'Ce besoin d\'harmonie peut te faire accepter l\'inacceptable pour "garder la paix".' },
    pers: { q: 'On perçoit en toi quelqu\'un de chaleureux, responsable et protecteur. Un pilier.', v: 'Cette image de pilier peut faire oublier que toi aussi tu as besoin de soutien.' },
    mat:  { q: 'Avec l\'âge, ta sagesse du cœur devient ta force. Tes conseils sont recherchés.', v: 'Maturité du 6 : protéger sans étouffer, aimer sans s\'oublier.' },
  },
  7: {
    cdv:  { q: 'Ta mission est de chercher la vérité profonde. Tu es {le|la} philosophe, l\'analyste, {le|la} sage.', v: 'Le piège : l\'intellectualisation de tout. Vivre, c\'est aussi ressentir sans comprendre.' },
    expr: { q: 'Tu excelles dans l\'analyse, la recherche et la réflexion stratégique. Ton esprit est ton arme.', v: 'Ce talent analytique peut devenir paralysie — parfois il faut agir avant de tout comprendre.' },
    soul: { q: 'Au fond, tu es {mû|mue} par une quête de sens et de vérité. Les réponses faciles ne te satisfont pas.', v: 'Cette quête peut devenir obsessionnelle — accepte que certains mystères n\'ont pas de réponse.' },
    pers: { q: 'On perçoit en toi quelqu\'un de profond, un peu mystérieux{|se}, dont la pensée va loin.', v: 'Cette aura de mystère peut créer de la distance — laisse les autres voir qui tu es vraiment.' },
    mat:  { q: 'Avec l\'âge, ta sagesse intérieure rayonne. Tu deviens {le|la} mentor{|e} que les gens cherchent.', v: 'Maturité du 7 : partager tes découvertes au lieu de les garder pour toi.' },
  },
  8: {
    cdv:  { q: 'Ta mission est de matérialiser, de bâtir du pouvoir et de l\'influence. Tu es {le|la} stratège de l\'action.', v: 'Le piège : la course au résultat. Le pouvoir sans éthique est une bombe à retardement.' },
    expr: { q: 'Tu excelles à transformer les visions en résultats concrets. L\'exécution est ta zone de génie.', v: 'Cette efficacité peut broyer les relations humaines — les gens ne sont pas des KPIs.' },
    soul: { q: 'Au fond, tu es {mû|mue} par l\'ambition de laisser une empreinte tangible dans le monde.', v: 'Ce besoin de réussir peut masquer une peur profonde de l\'insignifiance.' },
    pers: { q: 'On perçoit en toi quelqu\'un d\'ambitieu{x|se}, solide, qui inspire la confiance dans l\'action.', v: 'Cette image d\'autorité peut intimider — montre aussi ta vulnérabilité stratégique.' },
    mat:  { q: 'Avec l\'âge, ton sens stratégique devient redoutable. Tu sais exactement où frapper.', v: 'Maturité du 8 : utiliser le pouvoir acquis pour élever les autres, pas seulement soi.' },
  },
  9: {
    cdv:  { q: 'Ta mission est de servir une cause plus grande que toi. Compassion, vision globale, héritage.', v: 'Le piège : ne jamais finir ce que tu commences. Le 9 doit apprendre l\'art de la conclusion.' },
    expr: { q: 'Tu as une vision d\'ensemble que peu possèdent. Tu vois les connexions invisibles.', v: 'Cette vision globale peut négliger les détails — l\'exécution locale compte autant que la stratégie globale.' },
    soul: { q: 'Au fond, tu aspires à un impact significatif sur le monde. L\'égoïsme t\'est étranger.', v: 'Cette compassion universelle peut t\'épuiser — tu ne peux pas sauver tout le monde.' },
    pers: { q: 'On perçoit en toi quelqu\'un de sage, généreux, avec une aura de bienveillance.', v: 'Cette image de sagesse peut créer des attentes irréalistes — tu as aussi le droit de douter.' },
    mat:  { q: 'Avec l\'âge, ta sagesse humaniste atteint sa pleine puissance. Tu deviens un phare.', v: 'Maturité du 9 : transmettre ta vision sans t\'accrocher au résultat.' },
  },
  11: {
    cdv:  { q: 'Ta mission est de canaliser une intuition hors norme pour guider et éclairer les autres. Tu captes ce que personne ne voit.', v: 'Le piège du 11 : l\'hypersensibilité peut paralyser. Ton don demande un ancrage solide pour ne pas te consumer.' },
    expr: { q: 'Tu communiques avec une profondeur qui touche les gens au-delà des mots. Ta présence seule inspire.', v: 'Ce talent peut te submerger d\'émotions des autres — protège ton énergie avec des limites claires.' },
    soul: { q: 'Au plus profond, tu es {mû|mue} par un besoin de transcendance et de connexion à quelque chose de plus grand.', v: 'Cette quête spirituelle peut te déconnecter du quotidien — ta mission se vit aussi dans le concret.' },
    pers: { q: 'Les autres perçoivent en toi une aura magnétique, presque mystique. Ton regard semble lire au-delà des apparences.', v: 'Cette intensité peut déstabiliser — tout le monde n\'est pas prêt à être {vu|vue} aussi profondément.' },
    mat:  { q: 'Avec l\'âge, ton intuition visionnaire devient ton plus grand atout stratégique. Tu vois venir avant les autres.', v: 'Maturité du 11 : faire confiance à ta vision même quand personne ne la comprend encore.' },
  },
  22: {
    cdv:  { q: 'Ta mission est titanesque : concrétiser des visions qui transforment le collectif. Bâtisseu{r|se} d\'empires.', v: 'La pression du 22 est immense — sans fondations solides (énergie du 4), tout peut s\'effondrer.' },
    expr: { q: 'Tu as la rare capacité de transformer les grandes idées en réalisations concrètes à grande échelle.', v: 'Ce talent de construction à grande échelle peut mener au surmenage — délègue, tu n\'es pas {obligé|obligée} de tout porter.' },
    soul: { q: 'Au fond, tu aspires à laisser un héritage durable qui dépasse ta propre vie.', v: 'Cette ambition peut t\'écraser — accepte que Rome ne s\'est pas construite en un jour.' },
    pers: { q: 'On perçoit en toi une force tranquille capable de soulever des montagnes.', v: 'Cette image de puissance peut créer une pression impossible — montre que tu es {humain|humaine} aussi.' },
    mat:  { q: 'Avec l\'âge, ta capacité de réalisation atteint des sommets. Tes projets prennent une dimension collective.', v: 'Maturité du 22 : bâtir pour les autres, pas seulement pour prouver que tu peux.' },
  },
  33: {
    cdv:  { q: 'Ta mission est l\'amour inconditionnel et l\'enseignement. Le plus rare et le plus exigeant des chemins.', v: 'Le don de soi total peut mener à l\'épuisement — poser ses limites est vital, même pour un 33.' },
    expr: { q: 'Tu as un don de guérison par les mots, la présence et l\'enseignement. Ta bienveillance est thérapeutique.', v: 'Ce talent de guéri{sseur|sseuse} peut attirer des personnes toxiques — protège ton espace.' },
    soul: { q: 'Au fond, tu aspires à un amour universel et à l\'élévation de la conscience collective.', v: 'Cette compassion infinie peut te vider — recharge-toi avant de donner encore.' },
    pers: { q: 'On perçoit en toi un être de lumière, un guide naturel dont la sagesse apaise.', v: 'Cette image de sainteté peut être un fardeau — tu as le droit d\'être imparfait{|e}.' },
    mat:  { q: 'Avec l\'âge, ta sagesse d\'amour universel rayonne avec une puissance rare.', v: 'Maturité du 33 : enseigner par l\'exemple, sans te sacrifier sur l\'autel du service.' },
  },
};

const DOMAIN_KEY: Record<string, string> = {
  'Chemin de Vie': 'cdv', 'Expression': 'expr', 'Âme': 'soul',
  'Personnalité': 'pers', 'Maturité': 'mat',
};

function getDesc(domain: string, v: number): Desc | null {
  const dk = DOMAIN_KEY[domain] || 'cdv';
  return D[v]?.[dk] || null;
}

const CY: Record<number, { y: string; m: string; d: string }> = {
  1:  { y: 'Année de nouveaux départs — lance les projets que tu repousses. L\'énergie d\'initiative est maximale cette année.', m: 'Ce mois favorise les prises de décision rapides. Ose proposer, trancher, avancer sans attendre la permission.', d: 'Aujourd\'hui, prends l\'initiative. Un premier pas décisif vaut mieux qu\'un plan parfait jamais exécuté.' },
  2:  { y: 'Année de partenariats et de patience. Les résultats viendront par la collaboration, pas par la force.', m: 'Ce mois invite à écouter avant de parler, à négocier plutôt qu\'imposer. Les alliances se renforcent.', d: 'Aujourd\'hui, mise sur le dialogue. Une main tendue rapportera plus qu\'un coup de force.' },
  3:  { y: 'Année de créativité et de visibilité. Ta capacité à communiquer et à inspirer est amplifiée.', m: 'Ce mois est propice à l\'expression créative. Partage tes idées, publie, présente — ton message porte.', d: 'Aujourd\'hui, exprime-toi. Une présentation, un message, une conversation — ta créativité touche juste.' },
  4:  { y: 'Année de construction méthodique. Pose les fondations — le travail structuré de cette année portera ses fruits longtemps.', m: 'Ce mois appelle de la rigueur et de l\'organisation. Fais le tri, structure, documente.', d: 'Aujourd\'hui, concentre-toi sur l\'exécution. Pas de raccourcis — la qualité du travail parle d\'elle-même.' },
  5:  { y: 'Année de changement et d\'expansion. Sois mobile, {curieux|curieuse}, {ouvert|ouverte} aux opportunités inattendues.', m: 'Ce mois apporte du mouvement — voyages, rencontres, pivots. Surfe sur les changements au lieu de les subir.', d: 'Aujourd\'hui, sors de ta zone de confort. L\'imprévu est ton meilleur allié.' },
  6:  { y: 'Année centrée sur la famille, la responsabilité et l\'harmonie. Investis dans tes relations proches.', m: 'Ce mois te ramène vers l\'essentiel : le foyer, les proches, l\'équilibre entre donner et se préserver.', d: 'Aujourd\'hui, prends soin — de toi d\'abord, des autres ensuite. L\'harmonie commence par l\'intérieur.' },
  7:  { y: 'Année d\'introspection et de recherche de sens. Prends du recul pour mieux voir le chemin.', m: 'Ce mois invite à l\'analyse et à la réflexion. Lis, étudie, médite — les réponses sont à l\'intérieur.', d: 'Aujourd\'hui, creuse avant de conclure. L\'intuition te guide si tu prends le temps de l\'écouter.' },
  8:  { y: 'Année de récolte et de pouvoir. Tes efforts passés se concrétisent — saisis les récompenses.', m: 'Ce mois est favorable aux négociations financières, aux décisions stratégiques et à l\'affirmation de ta position.', d: 'Aujourd\'hui, pense résultat. Chaque action doit servir un objectif concret et mesurable.' },
  9:  { y: 'Année de bilan et de clôture. Termine les cycles ouverts avant d\'en commencer de nouveaux.', m: 'Ce mois t\'invite à lâcher prise sur ce qui ne te sert plus. Fais de la place pour le renouveau.', d: 'Aujourd\'hui, finis ce que tu as commencé. La compassion et la générosité ouvrent des portes.' },
  11: { y: 'Année d\'éveil et d\'inspiration. Ton intuition est en hyper-connexion — fais-lui confiance.', m: 'Ce mois amplifie tes perceptions. Les idées qui te traversent ne sont pas anodines — note-les, elles ont de la valeur.', d: 'Aujourd\'hui, ton radar intérieur est affûté. Fie-toi à ta première impression, elle voit juste.' },
  22: { y: 'Année de réalisation majeure. Le rêve peut devenir réalité si tu combines vision et discipline.', m: 'Ce mois offre la possibilité de concrétiser un projet ambitieux. Pense grand mais exécute méthodiquement.', d: 'Aujourd\'hui, tu as la capacité de matérialiser l\'impossible. Structure ta vision en étapes.' },
  33: { y: 'Année de rayonnement et de service. Ta capacité à élever les autres est à son maximum.', m: 'Ce mois te connecte à un amour plus grand. Enseigne, guide, inspire — c\'est ta zone de génie.', d: 'Aujourd\'hui, ta bienveillance est ton super-pouvoir. Un mot juste peut transformer la journée de quelqu\'un.' },
};

function getCycleText(v: number, cycle: string): string {
  const c = CY[v];
  if (!c) return getNumberInfo(v).k;
  return cycle === 'y' ? c.y : cycle === 'm' ? c.m : c.d;
}

export const LS_MEANING: Record<number, string> = {
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

const LS_DEEP: Record<number, { present: string; missing: string }> = {
  1: { present: 'Tu sais t\'exprimer et défendre tes idées — les mots sont ton premier outil de pouvoir.', missing: 'La communication spontanée n\'est pas naturelle — prépare tes prises de parole, elles n\'en seront que meilleures.' },
  2: { present: 'Ton intuition capte les signaux faibles — fie-toi à tes « impressions », elles sont souvent justes.', missing: 'L\'intuition brute n\'est pas ton premier réflexe — tu compenses par l\'analyse, ce qui peut être plus fiable.' },
  3: { present: 'L\'imagination est ton terrain de jeu — tu vois des possibilités là où d\'autres voient des murs.', missing: 'La créativité pure n\'est pas ton mode par défaut — tu innoves plutôt par amélioration que par invention.' },
  4: { present: 'L\'ordre et la méthode sont dans ton ADN — tes processus sont tes fondations.', missing: 'L\'organisation ne vient pas naturellement — mais une fois mise en place, elle te libère plus que les autres.' },
  5: { present: 'Le 5 au centre de la grille fait de toi un pont entre toutes les énergies — tu es le liant.', missing: 'Sans le 5 central, tu peux avoir du mal à connecter tes différentes forces entre elles — cherche un unificateur.' },
  6: { present: 'Le sens des responsabilités t\'ancre — les gens comptent sur toi, et tu assumes.', missing: 'La responsabilité domestique n\'est pas ton moteur premier — tu es plus tourné{|e} vers l\'extérieur.' },
  7: { present: 'La réflexion et l\'analyse sont tes alliées — tu comprends les choses en profondeur avant d\'agir.', missing: 'L\'introspection analytique n\'est pas ton premier réflexe — tu apprends davantage par l\'expérience que par la théorie.' },
  8: { present: 'Le sens du détail et de l\'efficacité matérielle te donne un avantage concret dans l\'exécution.', missing: 'La précision opérationnelle est à développer — entoure-toi de profils « exécutants » pour compléter ta vision.' },
  9: { present: 'Tu portes naturellement une vision large et ambitieuse — le détail ne t\'intéresse pas autant que la direction.', missing: 'La vision panoramique n\'est pas innée — développe-la en prenant régulièrement du recul sur tes projets.' },
};

const LS_PLAN_ADVICE: Record<string, string> = {
  'Mental (1,2,3)': 'Pensée, analyse et créativité — le triangle de l\'intelligence.',
  'Émotionnel (4,5,6)': 'Structure, liberté et responsabilité — le triangle de l\'équilibre intérieur.',
  'Pratique (7,8,9)': 'Réflexion, exécution et vision — le triangle de l\'accomplissement.',
  'Vision (1,5,9)': 'La diagonale montante — du verbe (1) au centre (5) à la vision (9). L\'axe du leader.',
  'Volonté (3,5,7)': 'La diagonale descendante — de l\'imagination (3) au centre (5) à l\'analyse (7). L\'axe du sage.',
};

const LS_ORDER = [[4,9,2],[3,5,7],[8,1,6]];

const PINNACLE_DESC: Record<number, string> = {
  1: 'Période d\'affirmation de soi — tu apprends à prendre l\'initiative et à croire en tes propres décisions.',
  2: 'Période de coopération — tu apprends la diplomatie, la patience et l\'art de travailler avec les autres.',
  3: 'Période de créativité — tu es poussé à t\'exprimer, créer, communiquer et rayonner.',
  4: 'Période de construction — tu poses des bases solides, avec méthode, discipline et persévérance.',
  5: 'Période d\'aventure — tu explores, voyages (intérieurement ou physiquement) et accueilles le changement.',
  6: 'Période d\'harmonie — tu es centré sur la famille, les responsabilités et le soin des autres.',
  7: 'Période de réflexion — tu cherches des réponses profondes, développe ton intuition et ta sagesse.',
  8: 'Période de pouvoir — tu développes ton ambition, ton sens des affaires et ta capacité à diriger.',
  9: 'Période d\'accomplissement — tu te donnes au monde, avec compassion, générosité et vision large.',
  11: 'Période d\'illumination — ton intuition est décuplée, tu inspires les autres par ta vision.',
  22: 'Période de maître bâtisseur — tu réalises des projets d\'envergure qui marquent durablement.',
  33: 'Période de guérison — tu irradies l\'amour inconditionnel et accompagnes les autres dans leur chemin.',
};

// Descriptions positionnelles des Pinnacles — utilisées quand 2 Pinnacles ont la même valeur
// pos 0 = jeunesse (0-35 ans) / pos 1 = adulte (35-44) / pos 2 = maturité (44-53) / pos 3 = accomplissement (53+)
const PINNACLE_DESC_POS: Record<number, Record<number, string>> = {
  1: {
    0: 'Jeunesse d\'indépendance — les premières années t\'ont forgé dans l\'affirmation et l\'initiative personnelle.',
    1: 'Affirmation adulte — tu consolides ton identité propre et ta capacité à décider seul.',
    2: 'Autorité affirmée — ta maturité t\'impose naturellement comme initiateur dans tes cercles.',
    3: 'Héritage d\'autonomie — tu transmets ta capacité à tracer sa propre voie, sans modèle préétabli.',
  },
  2: {
    0: 'Jeunesse relationnelle — les liens précoces t\'ont appris la coopération et la sensibilité aux autres.',
    1: 'Diplomatie adulte — tu maîtrises l\'art du compromis et de la médiation dans tes environnements.',
    2: 'Sagesse relationnelle — ta patience devient un atout stratégique reconnu par ton entourage.',
    3: 'Héritage de paix — tu laisses derrière toi des ponts bâtis entre les gens.',
  },
  3: {
    0: 'Jeunesse créative — l\'expression et la communication ont été tes terrains d\'apprentissage premiers.',
    1: 'Créativité épanouie — ton talent s\'affirme et trouve ses canaux d\'expression naturels.',
    2: 'Rayonnement mature — ta créativité gagne en profondeur et touche davantage de gens.',
    3: 'Héritage d\'inspiration — tu as éclairé ton chemin et celui des autres par ton expression.',
  },
  4: {
    0: 'Fondations de jeunesse — la discipline et la méthode se sont imposées tôt dans ton parcours.',
    1: 'Construction adulte — tu bâtis des structures durables, professionnelles et personnelles.',
    2: 'Solidité accomplie — tes fondations sont solides ; tu deviens une référence de fiabilité.',
    3: 'Héritage bâtisseur — les structures que tu as érigées traverseront le temps.',
  },
  5: {
    0: 'Jeunesse d\'exploration — la liberté et le mouvement ont marqué tes premières années.',
    1: 'Expansion adulte — tu canalisas ton énergie du changement dans des choix plus ciblés.',
    2: 'Sagesse du mouvement — tu sais maintenant quand bouger et quand rester.',
    3: 'Héritage de liberté — tu transmets la capacité à accueillir le changement sans peur.',
  },
  6: {
    0: 'Jeunesse d\'harmonie — le soin des autres et le sens des responsabilités t\'ont façonné tôt.',
    1: 'Responsabilité adulte — famille, engagements et création de beauté structurent ta vie.',
    2: 'Harmonie accomplie — l\'équilibre que tu as cherché devient une réalité stable.',
    3: 'Héritage de soin — tu laisses un foyer, des liens, une douceur qui perdurent.',
  },
  7: {
    0: 'Jeunesse de quête — les grandes questions t\'habitaient dès l\'enfance, tu cherchais déjà le sens.',
    1: 'Profondeur adulte — tu affines ta vision du monde par l\'analyse, la méditation et l\'étude.',
    2: 'Sagesse intérieure — tes réponses viennent de l\'intérieur plus que de l\'extérieur.',
    3: 'Héritage de sens — tu transmets une façon de voir le monde en profondeur, au-delà des apparences.',
  },
  8: {
    0: 'Ambition de jeunesse — le sens du pouvoir et de la réussite s\'est développé tôt en toi.',
    1: 'Puissance adulte — tu matérialises ta vision et construis ton influence avec méthode.',
    2: 'Autorité accomplie — ton influence est reconnue ; tu gères avec maturité les responsabilités.',
    3: 'Héritage stratégique — les structures de pouvoir que tu as bâties continuent de rayonner.',
  },
  9: {
    0: 'Jeunesse universelle — une sensibilité au monde plus grand que soi t\'a marqué dès le départ.',
    1: 'Service adulte — tu te donnes à des causes, projets ou personnes qui dépassent ton intérêt immédiat.',
    2: 'Vision accomplie — tu portes une sagesse humaniste qui guide tes actes au quotidien.',
    3: 'Héritage d\'amour — ton parcours entier est une offrande au monde ; ta générosité parle pour toi.',
  },
  11: {
    0: 'Éveil précoce — une sensibilité hors norme a marqué ton enfance ; tu percevais déjà ce que les autres ne voyaient pas.',
    1: 'Illumination adulte — ton intuition atteint son plein potentiel ; tu inspires par ta seule présence.',
    2: 'Vision mature — ta capacité à percevoir l\'invisible devient un outil de guidage pour les autres.',
    3: 'Héritage visionnaire — tu transmets une façon de voir le monde qui dépasse la logique ordinaire.',
  },
  22: {
    0: 'Vocation précoce — des graines de grandes ambitions ont été plantées dès ta jeunesse.',
    1: 'Bâtisseur en action — tu concrétises des projets d\'envergure qui marquent ton entourage.',
    2: 'Maître bâtisseur — ta capacité de réalisation atteint une dimension collective et durable.',
    3: 'Héritage monumental — ce que tu as construit traverse les générations.',
  },
  33: {
    0: 'Amour précoce — une compassion naturelle t\'a habité dès l\'enfance, souvent au détriment de toi-même.',
    1: 'Guérison adulte — tu rayonnes un amour inconditionnel qui transforme ceux qui t\'entourent.',
    2: 'Enseignement par l\'être — ta sagesse guérit sans effort ; ta présence seule réconforte.',
    3: 'Héritage de lumière — tu as porté un amour rare dans le monde ; cela ne s\'oublie pas.',
  },
};

const CHALLENGE_NAME: Record<number, string> = {
  0: 'Choix Libre', 1: 'Affirmation', 2: 'Patience', 3: 'Expression',
  4: 'Discipline', 5: 'Changement', 6: 'Équilibre', 7: 'Intuition',
  8: 'Pouvoir', 9: 'Détachement',
};

// Suffixe contextuel selon la position du défi (0-indexed) — différencie quand 2 défis ont la même valeur
const CHALLENGE_POSITION_SUFFIX: Record<number, string> = {
  0: 'face aux autres',
  1: 'face à soi-même',
  2: 'sur le long terme',
  3: 'leçon de vie globale',
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

// Descriptions positionnelles — utilisées quand 2 défis ont la même valeur, pour distinguer l'angle
// pos 0,1 = actif maintenant (dans tes interactions) ; pos 2,3 = sur le long terme (trajectoire de fond)
const CHALLENGE_DESC_POS: Record<number, Record<number, string>> = {
  0: {
    0: 'Face aux autres : chaque fois que tu dois choisir en groupe, ta liberté totale devient vertigineuse. Commence par l\'essentiel.',
    1: 'Face à toi-même : apprendre à décider sans chercher la validation extérieure. Ta boussole vient de l\'intérieur.',
    2: 'Sur le long terme : ne pas rester en suspens indéfiniment — les choix non faits ont aussi des conséquences.',
    3: 'Leçon de fond : ton parcours entier te demande d\'assumer tes choix sans regarder en arrière.',
  },
  1: {
    0: 'Face aux autres : t\'affirmer sans t\'effacer ni écraser — trouver le juste ton dans tes échanges.',
    1: 'Face à toi-même : reconnaître ta propre valeur sans avoir besoin de preuves extérieures.',
    2: 'Sur le long terme : bâtir une confiance en toi durable, qui ne dépend pas des circonstances.',
    3: 'Leçon de fond : l\'affirmation de soi est le fil rouge de tout ton parcours de vie.',
  },
  2: {
    0: 'Face aux autres : apprendre à attendre le bon moment plutôt que de forcer — la coopération devance la compétition.',
    1: 'Face à toi-même : ne pas tout porter seul, accepter que l\'aide ne soit pas une faiblesse.',
    2: 'Sur le long terme : cultiver la constance plutôt que les coups d\'éclat — la patience paie sur la durée.',
    3: 'Leçon de fond : ta trajectoire entière est une école du lâcher-prise et de la confiance.',
  },
  3: {
    0: 'Face aux autres : t\'exprimer ouvertement plutôt que garder pour toi — ta créativité nourrit les relations.',
    1: 'Face à toi-même : accéder à tes émotions sans les censurer — l\'expression intérieure précède l\'expression extérieure.',
    2: 'Sur le long terme : développer un canal d\'expression stable — art, écriture, parole — qui grandit avec le temps.',
    3: 'Leçon de fond : toute ta vie est une invitation à t\'exprimer pleinement, sans retenue.',
  },
  4: {
    0: 'Face aux autres : apporter de la structure sans imposer ta méthode — la discipline inspire plus qu\'elle ne contrôle.',
    1: 'Face à toi-même : construire une routine solide sans te rigidifier — la discipline qui libère, pas qui enferme.',
    2: 'Sur le long terme : ériger des fondations qui tiennent — chaque effort patient d\'aujourd\'hui porte ses fruits dans 5 ans.',
    3: 'Leçon de fond : tout ton parcours te demande de bâtir du durable, pas seulement du visible.',
  },
  5: {
    0: 'Face aux autres : accueillir leurs changements sans résistance — ta stabilité rassure sans figer.',
    1: 'Face à toi-même : embrasser tes propres évolutions sans panique — tu n\'es pas obligé de rester le même.',
    2: 'Sur le long terme : intégrer le changement comme moteur, pas comme menace — la flexibilité est ta force de fond.',
    3: 'Leçon de fond : ta vie entière est une grande transformation — résister au mouvement te coûte plus qu\'y adhérer.',
  },
  6: {
    0: 'Face aux autres : donner sans vous perdre — les relations équilibrées se construisent, pas seulement se subissent.',
    1: 'Face à toi-même : nourrir ton propre équilibre avant de vouloir équilibrer le monde autour de toi.',
    2: 'Sur le long terme : construire des relations durables basées sur le respect mutuel, pas le sacrifice.',
    3: 'Leçon de fond : l\'harmonie vraie est le thème de tout ton parcours — elle commence par toi.',
  },
  7: {
    0: 'Face aux autres : faire confiance à tes perceptions même sans preuves — ton intuition capte ce que les autres ne voient pas.',
    1: 'Face à toi-même : apprendre à habiter le silence intérieur — l\'intuition parle quand le mental se tait.',
    2: 'Sur le long terme : développer ta vie intérieure comme une ressource stratégique, pas un luxe.',
    3: 'Leçon de fond : toute ta trajectoire est une quête de sens — faire confiance au processus, pas seulement aux résultats.',
  },
  8: {
    0: 'Face aux autres : exercer ton influence avec éthique — le pouvoir qui respecte dure, celui qui écrase s\'effondre.',
    1: 'Face à toi-même : réconcilier ambition et valeurs — réussir sans te trahir.',
    2: 'Sur le long terme : construire une abondance qui serve aussi les autres — ta réussite à long terme est collective.',
    3: 'Leçon de fond : ta vie entière est une école du pouvoir — l\'apprendre à utiliser juste est ta grande leçon.',
  },
  9: {
    0: 'Face aux autres : donner sans attendre en retour — le détachement des résultats libère tes relations.',
    1: 'Face à toi-même : accepter les fins de cycles sans t\'y accrocher — chaque clôture prépare un nouveau départ.',
    2: 'Sur le long terme : œuvrer pour quelque chose de plus grand que toi — ton impact se mesure sur des décennies.',
    3: 'Leçon de fond : toute ta vie est une invitation à servir et à lâcher — la générosité sans condition est ton chemin.',
  },
};

const CHALLENGE_ORIGIN: string[] = [
  'tes interactions du moment', 'ton rapport à toi-même', 'ta trajectoire longue', 'ta leçon de fond',
];

export const PY_DESC: Record<number, { name: string; theme: string; conseil: string }> = {
  1: { name: 'Nouveau Départ', theme: 'Lancement, initiative, indépendance', conseil: 'Ose commencer quelque chose de neuf — c\'est le moment de planter les graines.' },
  2: { name: 'Patience', theme: 'Coopération, attente, diplomatie', conseil: 'Laisse mûrir ce que tu as semé — l\'année demande de la patience et des alliances.' },
  3: { name: 'Créativité', theme: 'Expression, joie, communication', conseil: 'Exprime-toi, crée, partage tes idées — ton énergie créative est à son maximum.' },
  4: { name: 'Construction', theme: 'Travail, fondations, discipline', conseil: 'Bâtis avec méthode — c\'est l\'année où les efforts concrets portent leurs fruits.' },
  5: { name: 'Liberté', theme: 'Changement, mouvement, aventure', conseil: 'Accueille l\'imprévu — l\'année pousse à sortir de la routine et explorer.' },
  6: { name: 'Harmonie', theme: 'Famille, responsabilités, amour', conseil: 'Investis dans tes relations proches — l\'année est centrée sur la famille et l\'harmonie.' },
  7: { name: 'Introspection', theme: 'Réflexion, solitude, sagesse', conseil: 'Prends du recul pour mieux comprendre — l\'année invite à la réflexion profonde.' },
  8: { name: 'Récolte', theme: 'Pouvoir, abondance, réussite', conseil: 'Récolte les fruits de tes efforts — l\'année est propice aux avancées matérielles.' },
  9: { name: 'Accomplissement', theme: 'Bilan, lâcher-prise, transition', conseil: 'Fais le tri et laisse partir ce qui ne sert plus — un cycle se termine pour en ouvrir un nouveau.' },
  11: { name: 'Illumination', theme: 'Intuition, vision, inspiration', conseil: 'Ton intuition est décuplée — fais confiance à tes ressentis, même les plus subtils.' },
  22: { name: 'Grand Œuvre', theme: 'Réalisation majeure, ambition', conseil: 'L\'année porte des projets d\'envergure — pense grand, construis pour le long terme.' },
  33: { name: 'Maître Guérisseur', theme: 'Amour inconditionnel, guidance, dévouement', conseil: 'Année exceptionnellement rare — tu es appelé à guider, soigner et inspirer par l\'amour. Ta compassion est ta plus grande force.' },
};

/* ── Component ── */
interface NumerologySectionProps {
  pd: ProfileData;
  num: SoulData['num'];
  fn: string;
  gender?: 'M' | 'F';
}

export default function NumerologySection({ pd, num, fn, gender = 'M' }: NumerologySectionProps) {
  const isF = gender === 'F';
  // Helper : résout {masculin|féminin} selon le genre du profil
  const genderize = (s: string): string => s.replace(/\{([^|{}]*)\|([^|{}]*)\}/g, (_m, m, f) => isF ? f : m);
  // FIX: Exclure les cycles temporels (py, pm, ppd) — ce ne sont pas des nombres natals permanents
  const TEMPORAL_KEYS = new Set(['bday', 'py', 'pm', 'ppd']);
  const masterList = (Object.entries(num) as [string, any][])
    .filter(([k, v]) => !TEMPORAL_KEYS.has(k) && v != null && typeof v === 'object' && v.m === true)
    .map(([k, v]) => [k, v.v]);

  const lp = num.lp ?? { v: 0, m: false };
  const hasMasterLP = lp.m === true;
  const lpDisplay = hasMasterLP ? `${lp.v}/${Math.floor(lp.v / 10) + (lp.v % 10)}` : `${lp.v}`;

  return (
    <>
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
            {([['CdV', hasMasterLP ? { v: num.lp.v, m: true } : num.lp], ['Expr', num.expr], ['Âme', num.soul], ['Pers', num.pers], ['Mat', num.mat], ['Jour', num.bday]] as [string, { v: number; m?: boolean }][]).map(([l, v]) => (
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
              <div style={{ fontSize: 11, color: P.textDim, lineHeight: 1.6, marginBottom: 8 }}>
                Les deux méthodes partent de la même date de naissance mais groupent les chiffres différemment — c'est ce qui fait apparaître (ou non) un maître nombre.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <div style={{ padding: 8, background: '#ffffff06', borderRadius: 4, borderLeft: `3px solid ${P.gold}` }}>
                  <div style={{ fontSize: 10, color: P.gold, fontWeight: 600 }}>Réduction simple</div>
                  <div style={{ fontSize: 9, color: P.textDim, marginTop: 2 }}>Additionne d\'abord puis réduis → {Math.floor(num.lp.v / 10) + (num.lp.v % 10)}</div>
                </div>
                <div style={{ padding: 8, background: '#ffffff06', borderRadius: 4, borderLeft: `3px solid ${P.gold}` }}>
                  <div style={{ fontSize: 10, color: P.gold, fontWeight: 600 }}>Maître nombre</div>
                  <div style={{ fontSize: 9, color: P.textDim, marginTop: 2 }}>Reconnait 11, 22, 33 avant réduction → {num.lp.v}</div>
                </div>
              </div>
              <div style={{ fontSize: 10, color: P.textDim, lineHeight: 1.5 }}>
                <b style={{ color: P.textMid }}>Ton choix :</b> si tu te reconnais plus dans le {Math.floor(num.lp.v / 10) + (num.lp.v % 10)} que dans le {num.lp.v}, tu peux travailler avec la réduction simple — il n'y a pas de « mauvaise » réponse, c'est ton énergie qui prime.
              </div>
            </div>
          )}
        </Cd>
      </Sec>

      {/* Six domains for each number — angle différencié si même valeur sur 2 domaines */}
      {(([['Chemin de Vie', num.lp.v], ['Expression', num.expr.v], ['Âme', num.soul.v], ['Personnalité', num.pers.v], ['Maturité', num.mat.v]] as [string, number][]).map(([domain, v]) => {
        const desc = getDesc(domain, v);
        // Angle d'introduction pour différencier quand 2 domaines ont la même valeur
        const DOMAIN_ANGLE: Record<string, string> = {
          'Âme': 'Ce que ça active en toi intérieurement',
          'Personnalité': 'Ce que ça projette vers les autres',
          'Expression': 'Ce que ça révèle dans ton action',
          'Chemin de Vie': 'Ce que ça dit de ta mission globale',
          'Maturité': 'Ce que ça apporte avec le temps',
        };
        const angle = DOMAIN_ANGLE[domain] || '';
        return (
          <Sec key={domain} icon="✧" title={`${domain} — ${v}`}>
            <Cd>
              {desc && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: P.gold, fontWeight: 600, marginBottom: 4 }}>Forces</div>
                  <div style={intro}>{genderize(desc.q)}</div>
                  <div style={{ fontSize: 11, color: P.textDim, fontWeight: 600, marginBottom: 4, marginTop: 8 }}>Vigilance</div>
                  <div style={intro}>{genderize(desc.v)}</div>
                </div>
              )}
              <div style={{ padding: '10px 12px', borderRadius: 8, background: '#ffffff04', border: `1px solid ${P.cardBdr}` }}>
                <div style={{ fontSize: 10, color: P.gold, fontWeight: 700, letterSpacing: 1, marginBottom: 6, textTransform: 'uppercase' }}>Dynamique annuelle, mensuelle, quotidienne</div>
                {angle && <div style={{ fontSize: 9, color: P.textDim, fontStyle: 'italic', marginBottom: 8, lineHeight: 1.4 }}>{angle} :</div>}
                <div style={{ fontSize: 11, color: P.textDim, lineHeight: 1.7 }}>
                  <b style={{ color: P.textMid }}>Cette année :</b> {genderize(getCycleText(v, 'y'))}
                </div>
                <div style={{ fontSize: 11, color: P.textDim, lineHeight: 1.7, marginTop: 8 }}>
                  <b style={{ color: P.textMid }}>Ce mois :</b> {genderize(getCycleText(v, 'm'))}
                </div>
                <div style={{ fontSize: 11, color: P.textDim, lineHeight: 1.7, marginTop: 8 }}>
                  <b style={{ color: P.textMid }}>Aujourd'hui :</b> {genderize(getCycleText(v, 'd'))}
                </div>
              </div>
            </Cd>
          </Sec>
        );
      }))}

      {/* ══ VIBRATIONS CYCLIQUES ══ */}
      <Sec icon="🔄" title="Vibrations Cycliques — Cycles Personnels">
        <Cd>
          <div style={intro}>
            Au-delà des six nombres fixes, ta numérologie vit aussi au rythme de <b>cycles personnels</b>. Chaque année (cycle annuel), chaque mois (cycle mensuel), chaque jour (cycle quotidien) porte une vibration qui peut amplifier ou tempérer tes énergies de base. Ces cycles durent 9 ans en boucle : tu es donc aussi « mû » par une énergie du 1 au 9 qui change régulièrement.
          </div>
          <div style={{ padding: '10px 14px', background: `${P.gold}0c`, border: `1px solid ${P.gold}22`, borderRadius: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: P.gold, marginBottom: 6 }}>Dynamique du moment</div>
            <div className="grid-responsive-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <div style={{ padding: 8, background: '#ffffff06', borderRadius: 4 }}>
                <div style={{ fontSize: 10, color: P.textMid, fontWeight: 600 }}>Cycle Annuel</div>
                <div style={{ fontSize: 14, color: P.gold, fontWeight: 700, marginTop: 4 }}>{pd.nc_annual || '–'}</div>
              </div>
              <div style={{ padding: 8, background: '#ffffff06', borderRadius: 4 }}>
                <div style={{ fontSize: 10, color: P.textMid, fontWeight: 600 }}>Cycle Mensuel</div>
                <div style={{ fontSize: 14, color: P.gold, fontWeight: 700, marginTop: 4 }}>{pd.nc_month || '–'}</div>
              </div>
              <div style={{ padding: 8, background: '#ffffff06', borderRadius: 4 }}>
                <div style={{ fontSize: 10, color: P.textMid, fontWeight: 600 }}>Cycle du Jour</div>
                <div style={{ fontSize: 14, color: P.gold, fontWeight: 700, marginTop: 4 }}>{pd.nc_day || '–'}</div>
              </div>
            </div>
          </div>
        </Cd>
      </Sec>

      {/* ══ ADN KAIRONAUTE — 9 CYCLES DE VIE ══ */}
      <Sec icon="🧬" title="ADN Kaironaute — 9 Cycles de Vie">
        <Cd>
          <div style={{ fontSize: 10, color: P.textDim, fontStyle: 'italic', marginBottom: 10, lineHeight: 1.5 }}>
            Chaque vie suit une architecture numérologique unique — des sommets à atteindre, des défis à transformer, et des cycles d'énergie qui se renouvellent. C'est ce que Kaironaute appelle ton ADN de vie.
          </div>
          <div style={intro}>
            Ta vie n'est pas une ligne droite — c'est une spirale de 9 cycles qui se répètent. Chacun de ces cycles (1 à 9, puis on recommence) porte une énergie, une leçon, une mission spécifique. Où es-tu dans ce cycle ? Quelles sont les forces à cultiver ? Quels sont les pièges à éviter ?
          </div>

          {/* Sommets */}
          <div style={{ padding: '12px 14px', background: `${P.gold}0c`, border: `1px solid ${P.gold}22`, borderRadius: 8, marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: P.gold, marginBottom: 8 }}>◆ Sommets — Tâches de ta vie</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {pd.pinnacles && (() => {
                const pVals = pd.pinnacles.map((p: { v: number }) => p.v);
                return pd.pinnacles.map((p: { v: number }, i: number) => {
                  const hasDup = pVals.filter((v: number) => v === p.v).length > 1;
                  const desc = hasDup && PINNACLE_DESC_POS[p.v]?.[i]
                    ? PINNACLE_DESC_POS[p.v][i]
                    : (PINNACLE_DESC[p.v] || '–');
                  return (
                    <div key={i} style={{ padding: 10, background: '#ffffff06', borderRadius: 4, borderLeft: `3px solid ${P.gold}` }}>
                      <div style={{ fontSize: 10, color: P.textDim, marginBottom: 4 }}>Sommet {i + 1}</div>
                      <div style={{ fontSize: 12, color: P.gold, fontWeight: 700 }}>{p.v}</div>
                      <div style={{ fontSize: 9, color: P.textDim, marginTop: 4, lineHeight: 1.5 }}>{desc}</div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Challenges */}
          <div style={{ padding: '12px 14px', background: `${P.gold}0c`, border: `1px solid ${P.gold}22`, borderRadius: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: P.gold, marginBottom: 8 }}>◆ Défis — Les 4 défis à transformer</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {pd.challenges && (() => {
                // Détecte les doublons de valeur pour ajouter un suffixe contextuel
                const vals = pd.challenges!.map((c: { v: number }) => c.v);
                return pd.challenges!.map((c: { v: number }, i: number) => {
                  const hasDup = vals.filter((v: number) => v === c.v).length > 1;
                  const name = CHALLENGE_NAME[c.v] || '–';
                  const suffix = hasDup ? ` — ${CHALLENGE_POSITION_SUFFIX[i] || ''}` : '';
                  return (
                    <div key={i} style={{ padding: 10, background: '#ffffff06', borderRadius: 4, borderLeft: `3px solid ${P.gold}` }}>
                      <div style={{ fontSize: 10, color: P.textDim, marginBottom: 4 }}>Défi {i + 1} <span style={{ color: P.textDim }}>(issu de {CHALLENGE_ORIGIN[i]})</span></div>
                      <div style={{ fontSize: 12, color: P.gold, fontWeight: 700 }}>{name}{suffix}</div>
                      <div style={{ fontSize: 9, color: P.textDim, marginTop: 4, lineHeight: 1.5 }}>
                        {hasDup && CHALLENGE_DESC_POS[c.v]?.[i] ? CHALLENGE_DESC_POS[c.v][i] : (CHALLENGE_DESC[c.v] || '–')}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </Cd>
      </Sec>

      {/* ══ LO SHU GRID ══ */}
      <Sec icon="⊞" title="Lo Shu Grid — La Grille de Naissance">
        <Cd>
          <div style={intro}>
            Le Lo Shu Grid est une grille 3×3 qui met en lumière l'équilibre (ou les manques) dans neuf domaines de ta vie. On y place les chiffres de ta date de naissance — les chiffres qui apparaissent révèlent tes forces naturelles, ceux qui manquent indiquent tes domaines de développement.
          </div>

          {/* Grid visual */}
          <div style={{ marginBottom: 14, display: 'flex', justifyContent: 'center' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 60px)', gap: 4 }}>
              {LS_ORDER.map((row, ri) =>
                row.map((n) => {
                  const hasNum = pd.loShuNumbers && pd.loShuNumbers.includes(n);
                  return (
                    <div key={n} style={{ width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, background: hasNum ? `${P.gold}15` : '#ffffff04', border: `1px solid ${hasNum ? P.gold : P.cardBdr}`, fontSize: 20, fontWeight: 700, color: hasNum ? P.gold : P.textDim }}>
                      {n}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Numbers present/missing */}
          <div style={{ padding: '10px 12px', borderRadius: 8, background: '#ffffff04', border: `1px solid ${P.cardBdr}`, marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: P.gold, fontWeight: 700, letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' }}>Nombre de chiffres</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: P.textDim, lineHeight: 1.6 }}>
                <b style={{ color: P.gold }}>Présents :</b> {pd.loShuNumbers?.length || 0} sur 9
              </div>
              <div style={{ fontSize: 11, color: P.textDim, lineHeight: 1.6 }}>
                <b style={{ color: P.gold }}>Absents :</b> {9 - (pd.loShuNumbers?.length || 0)} domaines à développer
              </div>
            </div>
            <div style={{ fontSize: 10, color: P.textDim, lineHeight: 1.5 }}>
              {(pd.loShuNumbers?.length || 0) >= 7 ? '✓ Profil équilibré — tu as accès à la plupart des énergies.' : (pd.loShuNumbers?.length || 0) >= 5 ? '◆ Profil modéré — certains domaines sont absents mais tu peux les développer.' : '✧ Profil spécialisé — tu as des forces bien définies, choisis tes développements.'}
            </div>
          </div>

          {/* Detailed readings */}
          <div style={{ fontSize: 10, color: P.gold, fontWeight: 700, letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' }}>Les 9 domaines du Lo Shu</div>
          {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => {
            const hasNum = pd.loShuNumbers && pd.loShuNumbers.includes(n);
            const reading = LS_DEEP[n];
            return (
              <div key={n} style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 6, background: hasNum ? `${P.gold}08` : '#ffffff04', border: `1px solid ${hasNum ? P.gold + '22' : P.cardBdr}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: P.textMid, marginBottom: 4 }}>
                  {hasNum && '✓'} {n} — {LS_MEANING[n]}
                </div>
                <div style={{ fontSize: 10, color: P.textDim, lineHeight: 1.5 }}>
                  {hasNum ? (
                    <>
                      <b style={{ color: P.textMid }}>Tu possèdes :</b> {genderize(reading.present)}
                    </>
                  ) : (
                    <>
                      <b style={{ color: P.textMid }}>À développer :</b> {genderize(reading.missing)}
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {/* Grid planes */}
          <div style={{ marginTop: 14, padding: '10px 12px', borderRadius: 8, background: '#ffffff04', border: `1px solid ${P.cardBdr}` }}>
            <div style={{ fontSize: 10, color: P.gold, fontWeight: 700, letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' }}>Les 5 axes du Lo Shu</div>
            {Object.entries(LS_PLAN_ADVICE).map(([axis, desc]) => (
              <div key={axis} style={{ marginBottom: 8, fontSize: 10, color: P.textDim, lineHeight: 1.5 }}>
                <b style={{ color: P.textMid }}>{axis} :</b> {desc}
              </div>
            ))}
          </div>
        </Cd>
      </Sec>
    </>
  );
}
