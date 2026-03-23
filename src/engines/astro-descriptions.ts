// ═══ ASTRO DESCRIPTIONS ═══
// 10 planètes × 12 signes — descriptions stratégiques (Oracle SoulPrint)
// Fichier séparé pour garder astrology.ts pur (moteur de calcul)

/** Lookup: PLANET_DESC[planet][sign] → description FR courte (1-2 phrases) */
export const PLANET_DESC: Record<string, Record<string, string>> = {

  // ☉ SOLEIL — identité fondamentale, volonté, vitalité
  sun: {
    Aries:       "Énergie pionnière. Tu initias, tu fonces — l'attente n'est pas dans ton ADN. Leadership instinctif, besoin d'autonomie totale.",
    Taurus:      "Force tranquille et endurance. Tu bâtis dans la durée, avec méthode et détermination. La stabilité est ton carburant.",
    Gemini:      "Esprit agile et polyvalent. Tu connectes les idées, les gens, les opportunités. Besoin constant de stimulation intellectuelle.",
    Cancer:      "Intelligence émotionnelle puissante. Tu protèges et nourris ce qui compte. Intuition stratégique forte, mémoire longue.",
    Leo:         "Charisme naturel et vision ambitieuse. Tu mènes par l'exemple et inspires la loyauté. Besoin de reconnaissance légitime.",
    Virgo:       "Précision analytique et sens du détail. Tu optimisais les systèmes, identifies les failles. L'excellence est ton standard.",
    Libra:       "Diplomate né. Tu crées l'équilibre, forges les alliances et trouves le compromis juste. Sens aigu de l'esthétique et de la justice.",
    Scorpio:     "Intensité et profondeur stratégique. Tu perces les apparences, transformes les crises en leviers. Rien ne t\'échappe.",
    Sagittarius: "Visionnaire et explorateur. Tu vois grand, penses global et inspires par ton optimisme. Besoin de sens et de liberté.",
    Capricorn:   "Ambition structurée et discipline de fer. Tu construis des empires avec patience. Le long terme est ton terrain de jeu.",
    Aquarius:    "Innovateur et indépendant. Tu penses hors cadre, bousculais les conventions et portes les idées d'avenir.",
    Pisces:      "Intuition profonde et sensibilité créative. Tu captes ce que d'autres ne voient pas. Vision holistique et empathie stratégique.",
  },

  // ☽ LUNE — émotions, besoins intérieurs, réflexes sous pression
  moon: {
    Aries:       "Réactions rapides et instinctives. Sous pression, tu passes à l'action sans hésiter. Besoin d'indépendance émotionnelle.",
    Taurus:      "Stabilité émotionnelle solide. Tu as besoin de sécurité matérielle et de routines fiables pour donner ton meilleur.",
    Gemini:      "Mental vif sous pression. Tu gères le stress par la parole, l'analyse et la recherche d'information. Adaptabilité émotionnelle.",
    Cancer:      "Sensibilité profonde et mémoire émotionnelle forte. Tu protèges ton cercle intime. Intuition très développée.",
    Leo:         "Besoin de reconnaissance et de chaleur. Sous pression, tu montes en puissance et prends les commandes. Générosité naturelle.",
    Virgo:       "Gestion émotionnelle par le contrôle et l'organisation. Le stress se canalise dans l'action concrète et l'amélioration continue.",
    Libra:       "Besoin d'harmonie relationnelle. Le conflit te déstabilise — tu cherches instinctivement le compromis et la paix.",
    Scorpio:     "Émotions intenses mais maîtrisées. Tu ressens tout en profondeur. Capacité de résilience et de transformation exceptionnelle.",
    Sagittarius: "Optimisme résilient. Sous stress, tu prends du recul, cherches le sens et rebondis. Besoin de liberté et d'espace.",
    Capricorn:   "Contrôle émotionnel rigoureux. Tu compartimentais et avances. Tendance à porter seul — force et solitude stratégique.",
    Aquarius:    "Détachement émotionnel productif. Tu analyses tes émotions plutôt que de les subir. Besoin d'espace et d'originalité.",
    Pisces:      "Éponge émotionnelle. Tu absorbes l'ambiance, les énergies, les non-dits. Créativité et intuition remarquables, attention aux surcharges.",
  },

  // ☿ MERCURE — communication, pensée, apprentissage
  mercury: {
    Aries:       "Pensée directe et rapide. Tu communiques sans filtre, allez droit au but. Bon pour les pitchs courts et les décisions flash.",
    Taurus:      "Réflexion méthodique et pragmatique. Tu ne te précipites jamais — chaque idée est pesée, testée, validée.",
    Gemini:      "Mental brillant et versatile. Tu jongles entre les sujets, connectez les dots. Communication naturelle et persuasive.",
    Cancer:      "Pensée intuitive et mémorielle. Tu retenns tout, surtout les contextes émotionnels. Communication empathique et nuancée.",
    Leo:         "Expression charismatique et créative. Tu communiques avec autorité et générosité. Bon storytelling naturel.",
    Virgo:       "Analyse chirurgicale et pensée systématique. Tu décortiques, classez, optimisez. Excellent en audit, reporting, process.",
    Libra:       "Communication diplomatique et équilibrée. Tu peses chaque mot, cherche le consensus. Bon négociateur et médiateur.",
    Scorpio:     "Pensée pénétrante et stratégique. Tu cherches ce qui est caché, détectez les mensonges. Communication incisive.",
    Sagittarius: "Pensée globale et visionnaire. Tu connecttes les grandes idées mais pouvez négliger les détails. Communication enthousiaste.",
    Capricorn:   "Mental structuré et pragmatique. Tu penses en termes de résultats, d'efficacité et de ROI. Communication factuelle.",
    Aquarius:    "Pensée originale et non-conventionnelle. Tu vois des solutions là où d'autres voient des murs. Communication innovante.",
    Pisces:      "Pensée intuitive et créative. Tu captes les ambiances et les sous-textes. Communication poétique, parfois floue sur les détails.",
  },

  // ♀ VÉNUS — valeurs, relations, attractivité, finances personnelles
  venus: {
    Aries:       "Attraction directe et conquérante. Tu fonces dans les relations comme en business — franc, passionné, impatient.",
    Taurus:      "Sens aigu du luxe et de la qualité. Fidélité dans les relations et les investissements. Tu attires la prospérité naturellement.",
    Gemini:      "Charme intellectuel et social. Tu séduis par les mots et l'esprit. Réseau large, relations stimulantes.",
    Cancer:      "Valeurs familiales et protectrices. Fidélité profonde, investissement émotionnel fort. Tu crées un cocon autour de tes proches.",
    Leo:         "Magnétisme naturel et générosité. Tu attires par ton éclat et ton chaleur. Goûts luxueux, sens du spectacle.",
    Virgo:       "Amour discret et pratique. Tu montres ton affection par le service et l'attention aux détails. Gestion financière prudente.",
    Libra:       "Sens esthétique raffiné et talent relationnel. Tu crées l'harmonie autour de toi. Partenariats stratégiques naturels.",
    Scorpio:     "Intensité relationnelle et loyauté absolue. Tu investis totalement ou pas du tout. Flair financier instinctif.",
    Sagittarius: "Relations libres et enthousiastes. Tu attires par ta joie de vivre et ta ouverture. Goût pour l'international.",
    Capricorn:   "Relations construites dans la durée. Tu valoris la fiabilité et le sérieux. Investissements conservateurs et rentables.",
    Aquarius:    "Relations originales et libres. Tu attires par ta différence et ta indépendance d'esprit. Valeurs humanistes.",
    Pisces:      "Empathie et dévouement dans les relations. Tu attires par ta sensibilité et ta compassion. Attention à la naïveté financière.",
  },

  // ♂ MARS — action, énergie, combativité, gestion de conflit
  mars: {
    Aries:       "Énergie explosive et initiative pure. Tu agisses d'abord, réfléchissez ensuite. Compétiteur né, leader d'action.",
    Taurus:      "Force constante et détermination implacable. Tu avances lentement mais rien ne t\'arrête. Endurance exceptionnelle.",
    Gemini:      "Action par la communication et la stratégie. Tu combatttes avec les mots et l'agilité mentale. Multi-front efficace.",
    Cancer:      "Énergie protectrice et défensive. Tu te battez férocement pour tes proches et tes projets. Action émotionnellement motivée.",
    Leo:         "Action théâtrale et courageuse. Tu mènes les charges, prends les risques visibles. Leadership par l'exemple.",
    Virgo:       "Action méthodique et précise. Tu avances étape par étape, sans gaspiller d'énergie. Efficacité opérationnelle maximale.",
    Libra:       "Action diplomatique et mesurée. Tu préfères la négociation au conflit direct. Attention à l'indécision sous pression.",
    Scorpio:     "Puissance stratégique intense. Tu agisses en profondeur, planifie dans l'ombre. Capacité de transformation radicale.",
    Sagittarius: "Action expansive et audacieuse. Tu vis grand, prends des risques calculés. Énergie abondante et optimiste.",
    Capricorn:   "Discipline d\'action et ambition structurée. Tu grimpes méthodiquement, dépasse les obstacles par la persévérance.",
    Aquarius:    "Action innovante et collective. Tu combats pour les causes et bouscule le statu quo. Énergie irrégulière mais percutante.",
    Pisces:      "Action fluide et intuitive. Tu avances par instinct, contourne plutôt qu\'affronte. Créativité dans la résolution de conflits.",
  },

  // ♃ JUPITER — expansion, chance, vision, croissance
  jupiter: {
    Aries:       "Expansion par l'initiative et le leadership. La chance te sourit quand tu oses. Croissance rapide et pionnière.",
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
    Aries:       "Leçon de patience dans l'action. Tu apprends à canaliser ton impulsivité en force stratégique. Discipline du timing.",
    Taurus:      "Épreuves autour de la sécurité matérielle. Tu construis une solidité financière indestructible par le travail et la rigueur.",
    Gemini:      "Structure de la pensée et de la communication. Tu apprends la profondeur au détriment de la superficialité.",
    Cancer:      "Leçons émotionnelles et familiales. Tu construis une base solide, parfois après des épreuves d'attachement.",
    Leo:         "Leçon d'humilité dans le leadership. Tu gagnes l'autorité véritable par la compétence, pas par le titre.",
    Virgo:       "Maîtrise par le travail et la méthode. Tu deviens expert de ton domaine par la rigueur et la persévérance.",
    Libra:       "Structure dans les relations et les contrats. Tu apprends l'engagement durable et les limites justes.",
    Scorpio:     "Discipline émotionnelle et transformation profonde. Tu traverses les crises en en sortant plus fort.",
    Sagittarius: "Structure dans la vision et la philosophie. Tu apprends à concrétiser tes grandes idées avec méthode.",
    Capricorn:   "Saturne chez lui — discipline native. Ambition froide, construction patiente, récolte tardive mais solide.",
    Aquarius:    "Structure dans l'innovation. Tu apprends à cadrer ta originalité pour qu'elle devienne viable et impactante.",
    Pisces:      "Leçon de limites dans la dissolution. Tu apprends à protéger ton énergie et canaliser ton empathie.",
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
    Aries:       "Pouvoir brut et transformation par l'action. Tu renaisses en agissant. Force de disruption personnelle intense.",
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
