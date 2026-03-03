// ═══ ASTRO DESCRIPTIONS ═══
// 10 planètes × 12 signes — descriptions stratégiques (Oracle SoulPrint)
// Fichier séparé pour garder astrology.ts pur (moteur de calcul)

/** Lookup: PLANET_DESC[planet][sign] → description FR courte (1-2 phrases) */
export const PLANET_DESC: Record<string, Record<string, string>> = {

  // ☉ SOLEIL — identité fondamentale, volonté, vitalité
  sun: {
    Aries:       "Énergie pionnière. Vous initiez, vous foncez — l'attente n'est pas dans votre ADN. Leadership instinctif, besoin d'autonomie totale.",
    Taurus:      "Force tranquille et endurance. Vous bâtissez dans la durée, avec méthode et détermination. La stabilité est votre carburant.",
    Gemini:      "Esprit agile et polyvalent. Vous connectez les idées, les gens, les opportunités. Besoin constant de stimulation intellectuelle.",
    Cancer:      "Intelligence émotionnelle puissante. Vous protégez et nourrissez ce qui compte. Intuition stratégique forte, mémoire longue.",
    Leo:         "Charisme naturel et vision ambitieuse. Vous menez par l'exemple et inspirez la loyauté. Besoin de reconnaissance légitime.",
    Virgo:       "Précision analytique et sens du détail. Vous optimisez les systèmes, identifiez les failles. L'excellence est votre standard.",
    Libra:       "Diplomate né. Vous créez l'équilibre, forgez les alliances et trouvez le compromis juste. Sens aigu de l'esthétique et de la justice.",
    Scorpio:     "Intensité et profondeur stratégique. Vous percez les apparences, transformez les crises en leviers. Rien ne vous échappe.",
    Sagittarius: "Visionnaire et explorateur. Vous voyez grand, pensez global et inspirez par votre optimisme. Besoin de sens et de liberté.",
    Capricorn:   "Ambition structurée et discipline de fer. Vous construisez des empires avec patience. Le long terme est votre terrain de jeu.",
    Aquarius:    "Innovateur et indépendant. Vous pensez hors cadre, bousculez les conventions et portez les idées d'avenir.",
    Pisces:      "Intuition profonde et sensibilité créative. Vous captez ce que d'autres ne voient pas. Vision holistique et empathie stratégique.",
  },

  // ☽ LUNE — émotions, besoins intérieurs, réflexes sous pression
  moon: {
    Aries:       "Réactions rapides et instinctives. Sous pression, vous passez à l'action sans hésiter. Besoin d'indépendance émotionnelle.",
    Taurus:      "Stabilité émotionnelle solide. Vous avez besoin de sécurité matérielle et de routines fiables pour donner votre meilleur.",
    Gemini:      "Mental vif sous pression. Vous gérez le stress par la parole, l'analyse et la recherche d'information. Adaptabilité émotionnelle.",
    Cancer:      "Sensibilité profonde et mémoire émotionnelle forte. Vous protégez votre cercle intime. Intuition très développée.",
    Leo:         "Besoin de reconnaissance et de chaleur. Sous pression, vous montez en puissance et prenez les commandes. Générosité naturelle.",
    Virgo:       "Gestion émotionnelle par le contrôle et l'organisation. Le stress se canalise dans l'action concrète et l'amélioration continue.",
    Libra:       "Besoin d'harmonie relationnelle. Le conflit vous déstabilise — vous cherchez instinctivement le compromis et la paix.",
    Scorpio:     "Émotions intenses mais maîtrisées. Vous ressentez tout en profondeur. Capacité de résilience et de transformation exceptionnelle.",
    Sagittarius: "Optimisme résilient. Sous stress, vous prenez du recul, cherchez le sens et rebondissez. Besoin de liberté et d'espace.",
    Capricorn:   "Contrôle émotionnel rigoureux. Vous compartimentez et avancez. Tendance à porter seul — force et solitude stratégique.",
    Aquarius:    "Détachement émotionnel productif. Vous analysez vos émotions plutôt que de les subir. Besoin d'espace et d'originalité.",
    Pisces:      "Éponge émotionnelle. Vous absorbez l'ambiance, les énergies, les non-dits. Créativité et intuition remarquables, attention aux surcharges.",
  },

  // ☿ MERCURE — communication, pensée, apprentissage
  mercury: {
    Aries:       "Pensée directe et rapide. Vous communiquez sans filtre, allez droit au but. Bon pour les pitchs courts et les décisions flash.",
    Taurus:      "Réflexion méthodique et pragmatique. Vous ne vous précipitez jamais — chaque idée est pesée, testée, validée.",
    Gemini:      "Mental brillant et versatile. Vous jonglez entre les sujets, connectez les dots. Communication naturelle et persuasive.",
    Cancer:      "Pensée intuitive et mémorielle. Vous retenez tout, surtout les contextes émotionnels. Communication empathique et nuancée.",
    Leo:         "Expression charismatique et créative. Vous communiquez avec autorité et générosité. Bon storytelling naturel.",
    Virgo:       "Analyse chirurgicale et pensée systématique. Vous décortiquez, classez, optimisez. Excellent en audit, reporting, process.",
    Libra:       "Communication diplomatique et équilibrée. Vous pesez chaque mot, cherchez le consensus. Bon négociateur et médiateur.",
    Scorpio:     "Pensée pénétrante et stratégique. Vous cherchez ce qui est caché, détectez les mensonges. Communication incisive.",
    Sagittarius: "Pensée globale et visionnaire. Vous connectez les grandes idées mais pouvez négliger les détails. Communication enthousiaste.",
    Capricorn:   "Mental structuré et pragmatique. Vous pensez en termes de résultats, d'efficacité et de ROI. Communication factuelle.",
    Aquarius:    "Pensée originale et non-conventionnelle. Vous voyez des solutions là où d'autres voient des murs. Communication innovante.",
    Pisces:      "Pensée intuitive et créative. Vous captez les ambiances et les sous-textes. Communication poétique, parfois floue sur les détails.",
  },

  // ♀ VÉNUS — valeurs, relations, attractivité, finances personnelles
  venus: {
    Aries:       "Attraction directe et conquérante. Vous foncez dans les relations comme en business — franc, passionné, impatient.",
    Taurus:      "Sens aigu du luxe et de la qualité. Fidélité dans les relations et les investissements. Vous attirez la prospérité naturellement.",
    Gemini:      "Charme intellectuel et social. Vous séduisez par les mots et l'esprit. Réseau large, relations stimulantes.",
    Cancer:      "Valeurs familiales et protectrices. Fidélité profonde, investissement émotionnel fort. Vous créez un cocon autour de vos proches.",
    Leo:         "Magnétisme naturel et générosité. Vous attirez par votre éclat et votre chaleur. Goûts luxueux, sens du spectacle.",
    Virgo:       "Amour discret et pratique. Vous montrez votre affection par le service et l'attention aux détails. Gestion financière prudente.",
    Libra:       "Sens esthétique raffiné et talent relationnel. Vous créez l'harmonie autour de vous. Partenariats stratégiques naturels.",
    Scorpio:     "Intensité relationnelle et loyauté absolue. Vous investissez totalement ou pas du tout. Flair financier instinctif.",
    Sagittarius: "Relations libres et enthousiastes. Vous attirez par votre joie de vivre et votre ouverture. Goût pour l'international.",
    Capricorn:   "Relations construites dans la durée. Vous valorisez la fiabilité et le sérieux. Investissements conservateurs et rentables.",
    Aquarius:    "Relations originales et libres. Vous attirez par votre différence et votre indépendance d'esprit. Valeurs humanistes.",
    Pisces:      "Empathie et dévouement dans les relations. Vous attirez par votre sensibilité et votre compassion. Attention à la naïveté financière.",
  },

  // ♂ MARS — action, énergie, combativité, gestion de conflit
  mars: {
    Aries:       "Énergie explosive et initiative pure. Vous agissez d'abord, réfléchissez ensuite. Compétiteur né, leader d'action.",
    Taurus:      "Force constante et détermination implacable. Vous avancez lentement mais rien ne vous arrête. Endurance exceptionnelle.",
    Gemini:      "Action par la communication et la stratégie. Vous combattez avec les mots et l'agilité mentale. Multi-front efficace.",
    Cancer:      "Énergie protectrice et défensive. Vous vous battez férocement pour vos proches et vos projets. Action émotionnellement motivée.",
    Leo:         "Action théâtrale et courageuse. Vous menez les charges, prenez les risques visibles. Leadership par l'exemple.",
    Virgo:       "Action méthodique et précise. Vous avancez étape par étape, sans gaspiller d'énergie. Efficacité opérationnelle maximale.",
    Libra:       "Action diplomatique et mesurée. Vous préférez la négociation au conflit direct. Attention à l'indécision sous pression.",
    Scorpio:     "Puissance stratégique intense. Vous agissez en profondeur, planifiez dans l'ombre. Capacité de transformation radicale.",
    Sagittarius: "Action expansive et audacieuse. Vous visez grand, prenez des risques calculés. Énergie abondante et optimiste.",
    Capricorn:   "Discipline d'action et ambition structurée. Vous grimpez méthodiquement, dépassez les obstacles par la persévérance.",
    Aquarius:    "Action innovante et collective. Vous combattez pour les causes et bousculez le statu quo. Énergie irrégulière mais percutante.",
    Pisces:      "Action fluide et intuitive. Vous avancez par instinct, contournez plutôt qu'affrontez. Créativité dans la résolution de conflits.",
  },

  // ♃ JUPITER — expansion, chance, vision, croissance
  jupiter: {
    Aries:       "Expansion par l'initiative et le leadership. La chance vous sourit quand vous osez. Croissance rapide et pionnière.",
    Taurus:      "Croissance par l'accumulation patiente. Prospérité matérielle favorisée. Les investissements solides portent leurs fruits.",
    Gemini:      "Expansion par le réseau et la communication. Les opportunités viennent des connexions et des idées échangées.",
    Cancer:      "Croissance par l'ancrage familial et émotionnel. Immobilier et patrimoine favorisés. Protection naturelle de la fortune.",
    Leo:         "Expansion par le charisme et la créativité. Les grands projets visibles sont favorisés. Chance dans le spectacle et le leadership.",
    Virgo:       "Croissance par l'optimisation et le service. Les détails créent la différence. Santé et compétences comme levier de croissance.",
    Libra:       "Expansion par les partenariats stratégiques. La justice et l'équité ouvrent les portes. Diplomatie lucrative.",
    Scorpio:     "Croissance par la transformation et les investissements profonds. Flair pour repérer les opportunités cachées.",
    Sagittarius: "Expansion maximale — voyages, international, philosophie, enseignement. La chance naturelle est au rendez-vous.",
    Capricorn:   "Croissance structurée et ambitieuse. Résultats à long terme, promotions méritées. Sagesse dans les affaires.",
    Aquarius:    "Expansion par l'innovation et le collectif. Technologies et causes sociales comme vecteurs de croissance.",
    Pisces:      "Croissance par l'intuition et la spiritualité. Les arts, le soin et l'imagination ouvrent des portes inattendues.",
  },

  // ♄ SATURNE — discipline, limites, maturité, structure
  saturn: {
    Aries:       "Leçon de patience dans l'action. Vous apprenez à canaliser votre impulsivité en force stratégique. Discipline du timing.",
    Taurus:      "Épreuves autour de la sécurité matérielle. Vous construisez une solidité financière indestructible par le travail et la rigueur.",
    Gemini:      "Structure de la pensée et de la communication. Vous apprenez la profondeur au détriment de la superficialité.",
    Cancer:      "Leçons émotionnelles et familiales. Vous construisez une base solide, parfois après des épreuves d'attachement.",
    Leo:         "Leçon d'humilité dans le leadership. Vous gagnez l'autorité véritable par la compétence, pas par le titre.",
    Virgo:       "Maîtrise par le travail et la méthode. Vous devenez expert de votre domaine par la rigueur et la persévérance.",
    Libra:       "Structure dans les relations et les contrats. Vous apprenez l'engagement durable et les limites justes.",
    Scorpio:     "Discipline émotionnelle et transformation profonde. Vous traversez les crises en en sortant plus fort.",
    Sagittarius: "Structure dans la vision et la philosophie. Vous apprenez à concrétiser vos grandes idées avec méthode.",
    Capricorn:   "Saturne chez lui — discipline native. Ambition froide, construction patiente, récolte tardive mais solide.",
    Aquarius:    "Structure dans l'innovation. Vous apprenez à cadrer votre originalité pour qu'elle devienne viable et impactante.",
    Pisces:      "Leçon de limites dans la dissolution. Vous apprenez à protéger votre énergie et canaliser votre empathie.",
  },

  // ♅ URANUS — rupture, innovation, originalité, liberté
  uranus: {
    Aries:       "Révolutions personnelles et leadership disruptif. Besoin viscéral de liberté d'action. Innovation par le courage.",
    Taurus:      "Disruption des valeurs et des finances. Nouvelles formes de richesse et de stabilité. Technologie au service du concret.",
    Gemini:      "Innovation dans la communication et l'apprentissage. Technologies de l'information, réseaux sociaux, écriture novatrice.",
    Cancer:      "Révolution des structures familiales et domestiques. Nouvelles formes de foyer et d'appartenance.",
    Leo:         "Créativité radicale et expression individuelle unique. Disruption dans les arts, le spectacle et le leadership.",
    Virgo:       "Innovation dans le travail et la santé. Nouvelles méthodes, technologies appliquées, optimisation disruptive.",
    Libra:       "Révolution relationnelle et sociale. Nouvelles formes de partenariat, justice sociale, esthétique d'avant-garde.",
    Scorpio:     "Transformation radicale et profonde. Disruption des pouvoirs établis, révélation des secrets, renaissance.",
    Sagittarius: "Innovation philosophique et éducative. Disruption des croyances, exploration de frontières inédites.",
    Capricorn:   "Révolution des structures et institutions. Disruption de l'autorité traditionnelle, nouvelles formes de gouvernance.",
    Aquarius:    "Uranus chez lui — innovation pure. Génie technologique, vision futuriste, liberté absolue de pensée.",
    Pisces:      "Révolution spirituelle et créative. Dissolution des anciennes illusions, émergence d'une conscience collective nouvelle.",
  },

  // ♆ NEPTUNE — intuition, inspiration, illusions, transcendance
  neptune: {
    Aries:       "Inspiration dans l'action et le leadership. Idéalisme pionnier, mais attention aux élans irréfléchis motivés par des illusions.",
    Taurus:      "Idéalisation de la sécurité et du confort. Sensibilité artistique appliquée au concret. Attention aux mirages financiers.",
    Gemini:      "Inspiration dans la communication. Écriture inspirée, mais attention à la confusion et aux fausses informations.",
    Cancer:      "Intuition familiale profonde. Connexion émotionnelle transcendante. Attention à l'idéalisation du passé.",
    Leo:         "Inspiration créative et scénique. Charisme mystérieux et magnétique. Attention à la mégalomanie ou aux rôles fictifs.",
    Virgo:       "Spiritualité du service et du soin. Guérison intuitive. Attention au perfectionnisme paralysant ou à l'hypocondrie.",
    Libra:       "Idéalisation des relations et de la beauté. Sensibilité artistique raffinée. Attention aux partenariats illusoires.",
    Scorpio:     "Intuition pénétrante et transformatrice. Connexion aux courants profonds. Pouvoir de guérison psychologique.",
    Sagittarius: "Vision spirituelle et philosophique élargie. Quête de sens transcendante. Attention au fanatisme ou à la fuite.",
    Capricorn:   "Dissolution lente des structures rigides. Spiritualisation de l'ambition. Réalisme tempéré par l'idéalisme.",
    Aquarius:    "Vision utopique et collective. Inspiration technologique et humanitaire. Attention aux idéaux déconnectés du réel.",
    Pisces:      "Neptune chez lui — intuition maximale. Sensibilité artistique et spirituelle profonde. Attention à la dissolution des limites.",
  },

  // ♇ PLUTON — pouvoir, transformation, régénération, ombres
  pluto: {
    Aries:       "Pouvoir brut et transformation par l'action. Vous renaissez en agissant. Force de disruption personnelle intense.",
    Taurus:      "Transformation des valeurs et de la richesse. Destruction créatrice du rapport à la matière. Pouvoir par la possession.",
    Gemini:      "Pouvoir de la parole et de l'information. Transformation par la communication. Capacité à influencer les esprits.",
    Cancer:      "Transformation par les racines et les émotions. Pouvoir familial profond. Guérison des blessures d'attachement.",
    Leo:         "Pouvoir créatif et magnétique. Transformation par l'expression de soi. Leadership qui catalyse le changement.",
    Virgo:       "Transformation par l'analyse et le service. Pouvoir de la précision. Capacité à réformer les systèmes de l'intérieur.",
    Libra:       "Pouvoir dans les relations et la justice. Transformation des dynamiques de couple et de partenariat.",
    Scorpio:     "Pluton chez lui — puissance transformatrice maximale. Régénération profonde, intuition du pouvoir, résilience absolue.",
    Sagittarius: "Transformation des croyances et de la vision du monde. Pouvoir de la vérité et de l'enseignement radical.",
    Capricorn:   "Transformation des structures de pouvoir. Démolition et reconstruction des institutions. Ambition transformatrice.",
    Aquarius:    "Pouvoir collectif et transformation sociétale. Technologie comme levier de transformation profonde. Révolution systémique.",
    Pisces:      "Transformation spirituelle et dissolution des anciens paradigmes. Pouvoir de la compassion et de l'imagination collective.",
  },
};

/** Lookup helper — returns description or null */
export function getPlanetSignDesc(planet: string, sign: string): string | null {
  return PLANET_DESC[planet]?.[sign] || null;
}
