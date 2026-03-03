/**
 * nakshatras.ts — Moteur Nakshatras Kaironaute V4.9
 * 27 Nakshatras lunaires (Jyotish / Muhurta)
 * V4.9 : +lord (règle #25), +getAyanamsa() dynamique
 * Modèle Gemini validé : globalBaseScore ±1 + domainModifiers par domaine
 * Sources : traditions Jyotish classiques (Parashara, Muhurta Chintamani)
 */

// ── 6 domaines Kaironaute ──
export type KaironauteDomain =
  | 'Business'
  | 'Amour'
  | 'Relations'
  | 'Créativité'
  | 'Introspection'
  | 'Vitalité';

export type NakshatraQuality =
  | 'Movable'    // Cara — favorable aux voyages, changements, commerce
  | 'Fixed'      // Sthira — favorable aux décisions durables, constructions
  | 'Mixed'      // Misra/Dwisvabhava — mixte, adaptable
  | 'Fierce'     // Ugra — favorable aux confrontations, destructions, chirurgie
  | 'Soft'       // Mridu — favorable aux arts, amour, amitié
  | 'Sharp'      // Tikshna — favorable aux actes courageux, magie, armes
  | 'Light';     // Laghu — favorable aux arts, commerce léger, médecine

export interface NakshatraData {
  id: number;                                    // 1-27
  name: string;                                  // Nom sanskrit
  nameFr: string;                                // Nom français / description
  start: number;                                 // Début longitude sidérale (°)
  end: number;                                   // Fin longitude sidérale (°)
  ruler: string;                                 // Planète gouvernante (Jyotish)
  lord: string;                                  // V4.9 — Lord Vimshottari (règle #25 NakshatraLordTransit)
  element: string;                               // Élément en français
  quality: NakshatraQuality;                     // Nature Muhurta
  archetype: string;                             // Archétype narratif
  keyTrait: string;                              // Trait clé
  shadowAspect: string;                          // Ombre
  coreText: string;                              // Description narrative
  // V4.8 Scoring
  globalBaseScore: number;                       // -1, 0 ou +1 — impact sur score global
  domainModifiers: Record<KaironauteDomain, number>; // multiplicateurs par domaine (0.7-1.3)
}

// Chaque Nakshatra couvre 360°/27 = 13.333...°
const SPAN = 360 / 27;

export const NAKSHATRAS: NakshatraData[] = [
  {
    id: 1, name: 'Ashwini', nameFr: 'Les Cavaliers du Soleil',
    start: 0, end: SPAN,
    ruler: 'Ketu',
    lord: 'Ketu', element: 'Feu', quality: 'Light',
    archetype: 'Le Guérisseur Pionnier',
    keyTrait: 'Rapidité et initiative',
    shadowAspect: 'Impulsivité aveugle',
    coreText: "Ashwini porte l'énergie du commencement brut. Vous agissez vite, parfois avant même de comprendre pourquoi. Il y a en vous une impulsion guérisseuse, une capacité à initier le mouvement quand tout semble figé. Le défi est d'apprendre la constance sans perdre l'élan.",
    globalBaseScore: 1,
    domainModifiers: { Business: 1.2, Amour: 1.0, Relations: 1.0, Créativité: 1.1, Introspection: 0.9, Vitalité: 1.3 },
  },
  {
    id: 2, name: 'Bharani', nameFr: 'Le Porteur',
    start: SPAN, end: SPAN * 2,
    ruler: 'Vénus',
    lord: 'Vénus', element: 'Terre', quality: 'Fierce',
    archetype: 'Le Porteur de Fardeau',
    keyTrait: "Transformation par l'épreuve",
    shadowAspect: 'Extrémisme et jalousie',
    coreText: "Bharani connaît les extrêmes. Désir et discipline, intensité et retenue. Vous ressentez tout profondément, parfois secrètement. Votre âme traverse des cycles de transformation intérieure puissants. Lorsque vous acceptez votre profondeur au lieu de la craindre, vous devenez une force de maturation.",
    globalBaseScore: 0,
    domainModifiers: { Business: 1.15, Amour: 0.8, Relations: 0.85, Créativité: 1.2, Introspection: 1.2, Vitalité: 0.9 },
  },
  {
    id: 3, name: 'Krittika', nameFr: 'La Pléiade',
    start: SPAN * 2, end: SPAN * 3,
    ruler: 'Soleil',
    lord: 'Soleil', element: 'Feu', quality: 'Sharp',
    archetype: 'Le Forgeur de Destin',
    keyTrait: 'Détermination tranchante',
    shadowAspect: 'Sévérité et perfectionnisme',
    coreText: "Krittika est le feu purificateur. Comme la flamme qui consume l'impur, vous avez une capacité naturelle à discerner l'essentiel de l'accessoire. Vous pouvez être sévère — avec vous-même surtout. Cette rigueur est votre force quand elle est orientée, votre prison quand elle se retourne.",
    globalBaseScore: 0,
    domainModifiers: { Business: 1.2, Amour: 0.85, Relations: 0.9, Créativité: 1.0, Introspection: 1.1, Vitalité: 1.1 },
  },
  {
    id: 4, name: 'Rohini', nameFr: 'La Rouge Resplendissante',
    start: SPAN * 3, end: SPAN * 4,
    ruler: 'Lune',
    lord: 'Lune', element: 'Terre', quality: 'Fixed',
    archetype: 'La Beauté Fertile',
    keyTrait: 'Grâce créatrice et abondance',
    shadowAspect: 'Possessivité et matérialisme',
    coreText: "Rohini est la favorite de la Lune — le Nakshatra de la beauté, de la fertilité et de la manifestation. Vous avez un don naturel pour créer, attirer et nourrir. Le monde répond à votre appel. Le danger réside dans l'attachement excessif aux formes et aux personnes.",
    globalBaseScore: 1,
    domainModifiers: { Business: 1.1, Amour: 1.3, Relations: 1.2, Créativité: 1.3, Introspection: 0.9, Vitalité: 1.1 },
  },
  {
    id: 5, name: 'Mrigashira', nameFr: 'La Tête du Cerf',
    start: SPAN * 4, end: SPAN * 5,
    ruler: 'Mars',
    lord: 'Mars', element: 'Terre', quality: 'Soft',
    archetype: 'Le Chercheur Éternel',
    keyTrait: 'Curiosité et exploration',
    shadowAspect: 'Indécision chronique',
    coreText: "Mrigashira est le chercheur qui ne s'arrête jamais. Vous êtes attiré par le nouveau, l'inconnu, la prochaine colline à explorer. Votre esprit est vif et adaptable. Mais cette quête sans fin peut devenir une fuite — apprendre à s'enraciner sans étouffer votre nature curieuse est votre travail.",
    globalBaseScore: 1,
    domainModifiers: { Business: 1.0, Amour: 1.1, Relations: 1.2, Créativité: 1.2, Introspection: 1.0, Vitalité: 1.0 },
  },
  {
    id: 6, name: 'Ardra', nameFr: 'La Tempête',
    start: SPAN * 5, end: SPAN * 6,
    ruler: 'Rahu',
    lord: 'Rahu', element: 'Eau', quality: 'Sharp',
    archetype: 'Le Destructeur Nécessaire',
    keyTrait: 'Transformation radicale',
    shadowAspect: 'Rage et instabilité',
    coreText: "Ardra est la larme de Shiva — la douleur qui précède la transformation. Ces jours peuvent apporter des perturbations, des révélations brutales ou des ruptures nécessaires. L'énergie est intense et difficile à diriger pour les domaines doux (amour, relations), mais excellente pour briser les blocages.",
    globalBaseScore: -1,
    domainModifiers: { Business: 1.15, Amour: 0.75, Relations: 0.8, Créativité: 1.1, Introspection: 1.2, Vitalité: 0.85 },
  },
  {
    id: 7, name: 'Punarvasu', nameFr: 'Le Retour de la Lumière',
    start: SPAN * 6, end: SPAN * 7,
    ruler: 'Jupiter',
    lord: 'Jupiter', element: 'Eau', quality: 'Movable',
    archetype: 'Le Renouveau Sage',
    keyTrait: 'Régénération et optimisme',
    shadowAspect: 'Excès de confiance',
    coreText: "Punarvasu signifie 'retour de la lumière' — après la tempête d'Ardra vient la régénération. C'est un Nakshatra de renouveau, d'espoir et de sagesse acquise. Jupiter vous accorde une vision positive du monde. Ce jour est favorable pour recommencer, pardonner et réorienter.",
    globalBaseScore: 1,
    domainModifiers: { Business: 1.0, Amour: 1.1, Relations: 1.2, Créativité: 1.0, Introspection: 1.2, Vitalité: 1.1 },
  },
  {
    id: 8, name: 'Pushya', nameFr: 'Le Nourrisseur',
    start: SPAN * 7, end: SPAN * 8,
    ruler: 'Saturne',
    lord: 'Saturne', element: 'Eau', quality: 'Light',
    archetype: 'Le Protecteur Bienveillant',
    keyTrait: 'Soin, stabilité, nourrir les autres',
    shadowAspect: 'Contrôle et surprotection',
    coreText: "Pushya est le plus bénéfique des Nakshatras selon la tradition — favorable pour presque tout. C'est l'énergie du soin, de la nourriture spirituelle et de la croissance stable. Saturne donne ici sa face la plus constructive : discipline au service de la croissance durable.",
    globalBaseScore: 1,
    domainModifiers: { Business: 1.2, Amour: 1.2, Relations: 1.3, Créativité: 1.0, Introspection: 1.2, Vitalité: 1.2 },
  },
  {
    id: 9, name: 'Ashlesha', nameFr: "L'Étreinte du Serpent",
    start: SPAN * 8, end: SPAN * 9,
    ruler: 'Mercure',
    lord: 'Mercure', element: 'Eau', quality: 'Sharp',
    archetype: 'Le Mystique Profond',
    keyTrait: 'Pénétration psychologique',
    shadowAspect: 'Manipulation et poison',
    coreText: "Ashlesha est l'énergie du serpent Kundalini — puissante, ambivalente, transformatrice. Vous avez une capacité naturelle à voir à travers les apparences. Cette perspicacité peut devenir de la méfiance ou de la manipulation si elle n'est pas canalisée avec intégrité.",
    globalBaseScore: 0,
    domainModifiers: { Business: 0.9, Amour: 0.8, Relations: 0.75, Créativité: 1.1, Introspection: 1.3, Vitalité: 0.9 },
  },
  {
    id: 10, name: 'Magha', nameFr: 'Le Trône Royal',
    start: SPAN * 9, end: SPAN * 10,
    ruler: 'Ketu',
    lord: 'Ketu', element: 'Feu', quality: 'Fierce',
    archetype: 'Le Roi Ancestral',
    keyTrait: 'Autorité et lignée',
    shadowAspect: 'Arrogance et attachement au passé',
    coreText: "Magha est le Nakshatra des ancêtres et de l'autorité royale. Il y a en vous une conscience de votre lignée, de ce que vous avez hérité et de ce que vous transmettrez. Ce jour amplifie les questions de leadership, de statut et d'héritage. Favorable au Business, difficile pour l'humilité.",
    globalBaseScore: 0,
    domainModifiers: { Business: 1.25, Amour: 0.9, Relations: 0.95, Créativité: 0.9, Introspection: 1.1, Vitalité: 1.0 },
  },
  {
    id: 11, name: 'PurvaPhalguni', nameFr: 'La Première Porte du Figuier',
    start: SPAN * 10, end: SPAN * 11,
    ruler: 'Vénus',
    lord: 'Vénus', element: 'Feu', quality: 'Fierce',
    archetype: 'Le Jouisseur Créatif',
    keyTrait: 'Plaisir, arts, séduction',
    shadowAspect: 'Hédonisme et paresse',
    coreText: "PurvaPhalguni est l'énergie de Vénus dans toute sa splendeur — plaisir, créativité, amour physique, arts de vivre. Ce jour invite à célébrer, à créer et à profiter. L'ombre est dans l'excès : quand le plaisir devient fuite ou addiction.",
    globalBaseScore: 1,
    domainModifiers: { Business: 0.9, Amour: 1.3, Relations: 1.1, Créativité: 1.3, Introspection: 0.8, Vitalité: 1.2 },
  },
  {
    id: 12, name: 'UttaraPhalguni', nameFr: 'La Seconde Porte du Figuier',
    start: SPAN * 11, end: SPAN * 12,
    ruler: 'Soleil',
    lord: 'Soleil', element: 'Feu', quality: 'Fixed',
    archetype: 'Le Partenaire Loyal',
    keyTrait: 'Alliance durable, contrats',
    shadowAspect: 'Dépendance et besoin de validation',
    coreText: "UttaraPhalguni succède aux plaisirs de Purva avec la maturité des engagements. C'est le Nakshatra des partenariats durables, des contrats, des alliances sincères. Ce jour favorise tout ce qui repose sur la confiance mutuelle et la réciprocité.",
    globalBaseScore: 1,
    domainModifiers: { Business: 1.2, Amour: 1.2, Relations: 1.3, Créativité: 0.9, Introspection: 1.0, Vitalité: 1.0 },
  },
  {
    id: 13, name: 'Hasta', nameFr: 'La Main',
    start: SPAN * 12, end: SPAN * 13,
    ruler: 'Lune',
    lord: 'Lune', element: 'Terre', quality: 'Light',
    archetype: "L'Artisan Habile",
    keyTrait: 'Dextérité, soin du détail, guérison',
    shadowAspect: 'Rigidité et anxiété',
    coreText: "Hasta est la main — créatrice, soignante, précise. Ces jours sont excellents pour tout ce qui demande soin du détail, travail manuel, santé, artisanat. La Lune donne ici une sensibilité fine. L'ombre réside dans l'anxiété du perfectionnisme.",
    globalBaseScore: 1,
    domainModifiers: { Business: 1.1, Amour: 1.0, Relations: 1.1, Créativité: 1.2, Introspection: 1.1, Vitalité: 1.2 },
  },
  {
    id: 14, name: 'Chitra', nameFr: 'La Brillante',
    start: SPAN * 13, end: SPAN * 14,
    ruler: 'Mars',
    lord: 'Mars', element: 'Feu', quality: 'Soft',
    archetype: 'Le Créateur de Beauté',
    keyTrait: 'Esthétique, architecture, création',
    shadowAspect: 'Vanité et superficialité',
    coreText: "Chitra brille — c'est le Nakshatra de la beauté créée, de l'architecture intérieure et extérieure. Ces jours sont propices à tout ce qui touche à la forme, au design, à l'expression visuelle. Mars donne l'énergie de concrétiser ce que l'imagination dessine.",
    globalBaseScore: 1,
    domainModifiers: { Business: 1.1, Amour: 1.1, Relations: 1.0, Créativité: 1.3, Introspection: 0.9, Vitalité: 1.1 },
  },
  {
    id: 15, name: 'Swati', nameFr: 'Le Joyau de la Liberté',
    start: SPAN * 14, end: SPAN * 15,
    ruler: 'Rahu',
    lord: 'Rahu', element: 'Feu', quality: 'Movable',
    archetype: "L'Indépendant Adaptable",
    keyTrait: 'Liberté, commerce, adaptabilité',
    shadowAspect: 'Instabilité et dispersion',
    coreText: "Swati est le vent — libre, changeant, imprévisible. Ces jours sont favorables au commerce, aux échanges, aux voyages. Rahu amplifie le désir d'indépendance et d'exploration. L'ombre est dans la difficulté à s'engager durablement.",
    globalBaseScore: 0,
    domainModifiers: { Business: 1.2, Amour: 0.9, Relations: 1.0, Créativité: 1.1, Introspection: 0.9, Vitalité: 1.0 },
  },
  {
    id: 16, name: 'Vishakha', nameFr: 'La Fourche',
    start: SPAN * 15, end: SPAN * 16,
    ruler: 'Jupiter',
    lord: 'Jupiter', element: 'Feu', quality: 'Mixed',
    archetype: 'Le Guerrier Déterminé',
    keyTrait: 'Ambition, persévérance, but',
    shadowAspect: 'Jalousie et obsession du résultat',
    coreText: "Vishakha est l'arc tendu vers la cible. Ces jours portent une énergie d'ambition déterminée. Jupiter et Indra se partagent ce Nakshatra — expansion spirituelle et puissance matérielle. La question est : vers quelle cible pointez-vous réellement ?",
    globalBaseScore: 0,
    domainModifiers: { Business: 1.2, Amour: 0.9, Relations: 0.9, Créativité: 1.0, Introspection: 1.1, Vitalité: 1.1 },
  },
  {
    id: 17, name: 'Anuradha', nameFr: "L'Étoile de la Réussite",
    start: SPAN * 16, end: SPAN * 17,
    ruler: 'Saturne',
    lord: 'Saturne', element: 'Feu', quality: 'Soft',
    archetype: 'Le Loyal Amical',
    keyTrait: 'Amitié profonde, dévotion, succès social',
    shadowAspect: 'Jalousie et surcharge émotionnelle',
    coreText: "Anuradha est le cœur de l'amitié fidèle. Ces jours favorisent les liens profonds, la dévotion sincère et la coopération fructueuse. Saturne donne ici sa capacité à construire des liens durables. Excellent pour les relations d'équipe et les partenariats fondés sur la confiance.",
    globalBaseScore: 1,
    domainModifiers: { Business: 1.1, Amour: 1.2, Relations: 1.3, Créativité: 0.9, Introspection: 1.1, Vitalité: 1.0 },
  },
  {
    id: 18, name: 'Jyeshtha', nameFr: "L'Aîné",
    start: SPAN * 17, end: SPAN * 18,
    ruler: 'Mercure',
    lord: 'Mercure', element: 'Eau', quality: 'Sharp',
    archetype: 'Le Chef Solitaire',
    keyTrait: 'Courage, protection, leadership',
    shadowAspect: 'Arrogance et isolement',
    coreText: "Jyeshtha est l'aîné, celui qui porte le fardeau de la responsabilité. Ces jours peuvent amplifier un sentiment d'isolement ou de poids sur les épaules. Le courage de faire seul ce qui doit être fait est présent — mais le risque est de ne pas demander d'aide.",
    globalBaseScore: 0,
    domainModifiers: { Business: 1.1, Amour: 0.85, Relations: 0.85, Créativité: 0.9, Introspection: 1.2, Vitalité: 0.9 },
  },
  {
    id: 19, name: 'Mula', nameFr: 'La Racine',
    start: SPAN * 18, end: SPAN * 19,
    ruler: 'Ketu',
    lord: 'Ketu', element: 'Feu', quality: 'Sharp',
    archetype: 'Le Déracineur Libérateur',
    keyTrait: 'Déconstruction radicale, vérité nue',
    shadowAspect: 'Nihilisme et destruction aveugle',
    coreText: "Mula est la racine arrachée — ces jours portent une énergie de remise en question radicale. Nirriti, déesse de la dissolution, gouverne ce Nakshatra. Ce qui ne tient plus est arraché. Douloureux pour les domaines relationnels, mais puissant pour la recherche de vérité et la transformation.",
    globalBaseScore: -1,
    domainModifiers: { Business: 0.85, Amour: 0.75, Relations: 0.8, Créativité: 1.1, Introspection: 1.3, Vitalité: 0.85 },
  },
  {
    id: 20, name: 'PurvaAshadha', nameFr: 'La Première Invincible',
    start: SPAN * 19, end: SPAN * 20,
    ruler: 'Vénus',
    lord: 'Vénus', element: 'Feu', quality: 'Fierce',
    archetype: 'Le Purifié par les Eaux',
    keyTrait: 'Purification, regain de forces',
    shadowAspect: 'Entêtement et arrogance',
    coreText: "PurvaAshadha est l'énergie purificatrice des eaux — renouveau après la dissolution de Mula. Ces jours portent une capacité à se reconstruire avec une énergie nouvelle. Vénus donne grâce et force. Excellent pour reprendre des projets interrompus ou se purifier d'une phase difficile.",
    globalBaseScore: 1,
    domainModifiers: { Business: 1.1, Amour: 1.0, Relations: 1.0, Créativité: 1.2, Introspection: 1.1, Vitalité: 1.2 },
  },
  {
    id: 21, name: 'UttaraAshadha', nameFr: 'La Seconde Invincible',
    start: SPAN * 20, end: SPAN * 21,
    ruler: 'Soleil',
    lord: 'Soleil', element: 'Terre', quality: 'Fixed',
    archetype: "Le Victorieux Durable",
    keyTrait: 'Victoire tardive, fondations solides',
    shadowAspect: 'Rigidité et lenteur excessive',
    coreText: "UttaraAshadha apporte la victoire durable — pas rapide, mais certaine. Le Soleil gouverne ici avec la patience du bâtisseur. Ces jours sont favorables aux décisions à long terme, aux engagements sérieux et aux fondations solides. Ce qui est commencé ici tient.",
    globalBaseScore: 1,
    domainModifiers: { Business: 1.2, Amour: 1.0, Relations: 1.1, Créativité: 0.9, Introspection: 1.1, Vitalité: 1.1 },
  },
  {
    id: 22, name: 'Shravana', nameFr: "L'Oreille qui Entend",
    start: SPAN * 21, end: SPAN * 22,
    ruler: 'Lune',
    lord: 'Lune', element: 'Eau', quality: 'Movable',
    archetype: 'Le Disciple Attentif',
    keyTrait: "Écoute, apprentissage, connexion",
    shadowAspect: 'Rumination et commérage',
    coreText: "Shravana est l'écoute — ces jours favorisent l'apprentissage, l'enseignement et la connexion profonde. La Lune amplifie la réceptivité et l'intuition. Excellent pour les négociations, les discussions importantes et tout ce qui demande d'entendre vraiment l'autre.",
    globalBaseScore: 1,
    domainModifiers: { Business: 1.1, Amour: 1.1, Relations: 1.2, Créativité: 1.0, Introspection: 1.2, Vitalité: 1.0 },
  },
  {
    id: 23, name: 'Dhanishta', nameFr: 'La Plus Riche',
    start: SPAN * 22, end: SPAN * 23,
    ruler: 'Mars',
    lord: 'Mars', element: 'Eau', quality: 'Movable',
    archetype: 'Le Guerrier Abondant',
    keyTrait: 'Abondance, musique, mouvement',
    shadowAspect: 'Avarice et comportement addictif',
    coreText: "Dhanishta apporte l'abondance et le rythme. Mars gouverne avec une énergie de movement et d'action productive. Ces jours sont favorables à l'action décisive, aux gains matériels et à tout ce qui porte un rythme (musique, sport, négociation rythmée). L'ombre est dans l'excès.",
    globalBaseScore: 1,
    domainModifiers: { Business: 1.2, Amour: 1.0, Relations: 1.0, Créativité: 1.2, Introspection: 0.9, Vitalité: 1.2 },
  },
  {
    id: 24, name: 'Shatabhisha', nameFr: 'Les Cent Médecins',
    start: SPAN * 23, end: SPAN * 24,
    ruler: 'Rahu',
    lord: 'Rahu', element: 'Eau', quality: 'Movable',
    archetype: 'Le Guérisseur Solitaire',
    keyTrait: 'Guérison, mystère, indépendance',
    shadowAspect: 'Isolement et amertume',
    coreText: "Shatabhisha est le Nakshatra des cent remèdes — guérison, mystère et vérités cachées. Rahu amplifie ici la capacité à voir ce qui est caché, à guérir ce qui est profond. Ces jours favorisent la recherche, la médecine alternative, les pratiques ésotériques et la solitude productive.",
    globalBaseScore: 0,
    domainModifiers: { Business: 0.9, Amour: 0.85, Relations: 0.85, Créativité: 1.1, Introspection: 1.3, Vitalité: 1.1 },
  },
  {
    id: 25, name: 'PurvaBhadrapada', nameFr: 'Le Premier Pied Auspicieux',
    start: SPAN * 24, end: SPAN * 25,
    ruler: 'Jupiter',
    lord: 'Jupiter', element: 'Eau', quality: 'Fierce',
    archetype: "L'Ascète Ardent",
    keyTrait: 'Ferveur spirituelle, transformation ascétique',
    shadowAspect: 'Fanatisme et extrémisme',
    coreText: "PurvaBhadrapada porte le feu de la transformation spirituelle profonde. Ces jours peuvent amener un questionnement radical de vos valeurs ou une ardeur inhabituelle pour quelque chose qui vous dépasse. Jupiter ici n'est pas le philosophe serein — c'est le chercheur consumé par sa quête.",
    globalBaseScore: 0,
    domainModifiers: { Business: 0.85, Amour: 0.85, Relations: 0.9, Créativité: 1.1, Introspection: 1.3, Vitalité: 0.9 },
  },
  {
    id: 26, name: 'UttaraBhadrapada', nameFr: 'Le Second Pied Auspicieux',
    start: SPAN * 25, end: SPAN * 26,
    ruler: 'Saturne',
    lord: 'Saturne', element: 'Eau', quality: 'Fixed',
    archetype: 'Le Sage Accompli',
    keyTrait: 'Profondeur, compassion, maturité',
    shadowAspect: 'Inertie et mélancolie',
    coreText: "UttaraBhadrapada apporte la sagesse qui suit l'ardeur — la profondeur sereine, la compassion gagnée par l'expérience. Saturne donne ici sa face la plus haute : la maturité spirituelle. Ces jours favorisent la résolution de karma ancien et les décisions prises avec recul.",
    globalBaseScore: 1,
    domainModifiers: { Business: 1.0, Amour: 1.1, Relations: 1.2, Créativité: 0.9, Introspection: 1.3, Vitalité: 0.9 },
  },
  {
    id: 27, name: 'Revati', nameFr: 'La Bienveillante',
    start: SPAN * 26, end: 360,
    ruler: 'Mercure',
    lord: 'Mercure', element: 'Eau', quality: 'Soft',
    archetype: 'Le Gardien de la Transition',
    keyTrait: 'Clôture douce, soin, compassion',
    shadowAspect: 'Sensibilité excessive et perte de sens des réalités',
    coreText: "Revati est le dernier Nakshatra — la fin du cycle, le gardien du seuil. Ces jours portent une douceur profonde, une compassion pour tous les êtres. Mercure ici guide les transitions, les fins de cycle et les nouveaux commencements. Excellent pour clôturer, pardonner et lâcher prise.",
    globalBaseScore: 1,
    domainModifiers: { Business: 0.9, Amour: 1.2, Relations: 1.2, Créativité: 1.0, Introspection: 1.2, Vitalité: 1.0 },
  },
];

// ── Calcul du Nakshatra pour une longitude lunaire sidérale ──

export function calcNakshatra(moonLongSidereal: number): NakshatraData {
  const normalized = ((moonLongSidereal % 360) + 360) % 360;
  const idx = Math.min(26, Math.floor(normalized / SPAN));
  return NAKSHATRAS[idx];
}

/**
 * V4.8: Score global du Nakshatra transit
 * Retourne globalBaseScore : -1, 0 ou +1
 * La vraie puissance est dans domainModifiers (voir convergence.ts)
 */
export function calcNakshatraScore(moonLongSidereal: number): number {
  return calcNakshatra(moonLongSidereal).globalBaseScore;
}

/**
 * V4.9: Modificateurs de domaine du Nakshatra du jour
 * Utilisé dans convergence.ts pour moduler les scores par domaine
 */
export function getNakshatraDomainModifiers(nakshatraName: string): Record<KaironauteDomain, number> {
  const nak = NAKSHATRAS.find(n => n.name === nakshatraName);
  if (!nak) {
    // Fallback neutre
    return { Business: 1.0, Amour: 1.0, Relations: 1.0, Créativité: 1.0, Introspection: 1.0, Vitalité: 1.0 };
  }
  return nak.domainModifiers;
}

// ── V4.9 : Ayanamsa dynamique (précession des équinoxes) ──

/**
 * Retourne l'ayanamsa (décalage tropical → sidéral) pour une année donnée.
 * Formule : Lahiri approximation linéaire calibrée sur epoch 2024.
 * Drift : ~0.01396°/an (50.3"/an).
 *
 * Usage :
 *   - Thème natal : getAyanamsa(new Date(birthDate).getFullYear())
 *   - Transit du jour : getAyanamsa(new Date().getFullYear())
 */
export function getAyanamsa(year: number): number {
  return 24.1 + (year - 2024) * 0.01396;
}

/**
 * V4.9 — Retourne le Lord Vimshottari d'un Nakshatra par son nom.
 * Utilisé par la règle #25 dans convergence.ts.
 */
export function getNakshatraLord(nakshatraName: string): string | null {
  const nak = NAKSHATRAS.find(n => n.name === nakshatraName);
  return nak ? nak.lord : null;
}

/**
 * V5.1 — Tableau des 27 lords Vimshottari dans l'ordre des Nakshatras (index 0-26).
 * Dérivé de NAKSHATRAS[i].lord — source unique, pas de duplication.
 * Utilisé par vimshottari.ts pour le calcul du Nakshatra natal de départ.
 */
export const NAKSHATRA_LORDS: string[] = NAKSHATRAS.map(n => n.lord);

// ══════════════════════════════════════════════════════════════════
// ═══ V5.5 : NAKSHATRA COMPOSITE ══════════════════════════════════
// ══════════════════════════════════════════════════════════════════
// Fusion des deux blocs convergence.ts (4b globalBaseScore ±1 + 4c lords ±7)
// en un seul module "Nakshatra Composite" cap ±8.
// r=0.82 entre les deux sous-modules → 67% info partagée → fusion légitime.
//
// API :
//   transitMoonLongSidereal : longitude lunaire sidérale du jour (°)
//   natalMoonLongSidereal   : longitude lunaire sidérale à la naissance (° | null)
//     → null si profil sans thème natal ou calcul impossible
//
// Zéro import : nakshatras.ts self-contained.
// ══════════════════════════════════════════════════════════════════

export interface NakshatraCompositeResult {
  transitNak:      NakshatraData;
  natalNakName:    string;        // '' si pas de natal
  nakBaseScore:    number;        // globalBaseScore : -1, 0, +1
  rule25Pts:       number;        // Lord transit × qualité
  rule27Pts:       number;        // Double activation Lord transit = Lord natal
  total:           number;        // cap ±8 = nakBase + clamp(±7, R25+R27)
  breakdown:       string;        // détail lisible
  signals:         string[];
  alerts:          string[];
}

/**
 * Calcule le score composite Nakshatra (globalBaseScore + règle #25 + règle #27).
 *
 * Amplitudes R25 :
 *   Rahu  : +4 (harmonic) / -4 (tense)
 *   Ketu  : +2 (harmonic) / -3 (tense)
 *   Autres: +3 (harmonic) / -3 (tense)
 *
 * Règle #27 (double activation Lord transit = Lord natal) :
 *   harmonic → +6, tense → -6
 *
 * Sub-cap R25+R27 : ±7 (conservé)
 * Cap total       : ±8 = nakBaseScore + sub-cap ±7
 */
export function calcNakshatraComposite(
  transitMoonLongSidereal: number,
  natalMoonLongSidereal: number | null
): NakshatraCompositeResult {
  const transitNak    = calcNakshatra(transitMoonLongSidereal);
  const nakBaseScore  = transitNak.globalBaseScore; // -1, 0 ou +1
  const transitLord   = transitNak.lord;
  const nakQuality    = nakBaseScore; // +1 = harmonic, -1 = tense, 0 = neutre

  const signals: string[] = [];
  const alerts:  string[] = [];

  // ── Règle #25 : Lord du Nakshatra de transit ──
  let rule25Pts = 0;
  if (nakQuality !== 0) {
    const isHarmonic = nakQuality > 0;
    if (transitLord === 'Rahu') {
      rule25Pts = isHarmonic ? 4 : -4;
    } else if (transitLord === 'Ketu') {
      rule25Pts = isHarmonic ? 2 : -3;
    } else {
      rule25Pts = isHarmonic ? 3 : -3;
    }
  }

  // ── Règle #27 : double activation Lord transit = Lord natal ──
  let rule27Pts    = 0;
  let natalNakName = '';
  if (natalMoonLongSidereal !== null && nakQuality !== 0) {
    const natalNak = calcNakshatra(natalMoonLongSidereal);
    natalNakName   = natalNak.name;
    if (transitLord === natalNak.lord) {
      rule27Pts = nakQuality > 0 ? 6 : -6;
    }
  }

  // ── Sub-cap ±7 sur R25+R27 ──
  const nakLordRaw   = rule25Pts + rule27Pts;
  const nakLordTotal = Math.max(-7, Math.min(7, nakLordRaw));

  // ── Total cap ±8 ──
  const rawTotal = nakBaseScore + nakLordTotal;
  const total    = Math.max(-8, Math.min(8, rawTotal));

  console.assert(Math.abs(total) <= 8.1, '[NakshatraComposite] Cap ±8 percé:', total);

  // ── Signals / Alerts ──
  const lordTag  = `${transitLord} ${transitNak.name}`;
  const r27tag   = rule27Pts !== 0 ? ` ⚡double-activation ${transitNak.name}↔${natalNakName}` : '';
  const signStr  = total > 0 ? '+' : '';

  if (total > 0) {
    signals.push(`🌙 ${transitNak.name} (${transitNak.nameFr}) — ${transitNak.keyTrait}`);
    if (nakLordTotal > 0) signals.push(`🌙 Lord ${lordTag} — harmonic${r27tag} (${signStr}${nakLordTotal})`);
  } else if (total < 0) {
    alerts.push(`⚡ ${transitNak.name} (${transitNak.nameFr}) — ${transitNak.shadowAspect}`);
    if (nakLordTotal < 0) alerts.push(`🌙 Lord ${lordTag} — tension${r27tag} (${nakLordTotal})`);
  }

  // ── Breakdown detail ──
  const parts: string[] = [];
  if (nakBaseScore !== 0) parts.push(`base ${nakBaseScore > 0 ? '+' : ''}${nakBaseScore}`);
  if (rule25Pts   !== 0) parts.push(`#25 ${rule25Pts > 0 ? '+' : ''}${rule25Pts}`);
  if (rule27Pts   !== 0) parts.push(`#27 double ${rule27Pts > 0 ? '+' : ''}${rule27Pts}`);
  if (nakLordRaw !== nakLordTotal) parts.push(`cap ±7 (raw ${nakLordRaw > 0 ? '+' : ''}${nakLordRaw})`);
  const breakdown = parts.length > 0 ? parts.join(' · ') : 'Neutre';

  return {
    transitNak, natalNakName,
    nakBaseScore, rule25Pts, rule27Pts,
    total, breakdown, signals, alerts,
  };
}
