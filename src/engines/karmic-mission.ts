// ============================================================================
// SOULPRINT ORACLE V2.9.2 — karmic-mission.ts
// Mission Karmique : Nœud Nord/Sud, Chemin de Vie, Nombre de l'Âme, Tensions
// Fichier 100% NOUVEAU — Aucun fichier existant impacté
// Sources : Grok R5 (mission), R7 (tensions), R9 (nœud sud), GPT R8 (oppositions)
// ============================================================================

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export type ZodiacSign =
  | 'Bélier' | 'Taureau' | 'Gémeaux' | 'Cancer'
  | 'Lion' | 'Vierge' | 'Balance' | 'Scorpion'
  | 'Sagittaire' | 'Capricorne' | 'Verseau' | 'Poissons';

export interface SouthNodeReading {
  sign: ZodiacSign;
  maitrise: string;
  lacher: string;
  piege: string;
  zodiacSign?: ZodiacSign;  // Alias for component display
  theme?: string;           // Alias for component display (uses maitrise)
}

export interface KarmicMissionReading {
  northNode: string;
  cheminDeVie: string;
  nombreAme: string;
  tension: string | null;
  zodiacSign?: string;  // Alias for component display (uses northNode)
  theme?: string;       // Alias for component display (uses cheminDeVie)
}

export interface KarmicLesson {
  number: number;
  lesson: string;
}

// ─────────────────────────────────────────────
// CONSTANTES — OPPOSITIONS ZODIACALES
// ─────────────────────────────────────────────

export const ZODIAC_OPPOSITES: Record<ZodiacSign, ZodiacSign> = {
  'Bélier': 'Balance',
  'Balance': 'Bélier',
  'Taureau': 'Scorpion',
  'Scorpion': 'Taureau',
  'Gémeaux': 'Sagittaire',
  'Sagittaire': 'Gémeaux',
  'Cancer': 'Capricorne',
  'Capricorne': 'Cancer',
  'Lion': 'Verseau',
  'Verseau': 'Lion',
  'Vierge': 'Poissons',
  'Poissons': 'Vierge'
};

// ─────────────────────────────────────────────
// CONSTANTES — NŒUD SUD (12 signes × 3 phrases)
// Source : Grok R9
// ─────────────────────────────────────────────

export const SOUTH_NODE_READINGS: Record<ZodiacSign, SouthNodeReading> = {
  'Bélier': {
    sign: 'Bélier',
    maitrise: 'Tu sais déjà prendre les devants et trancher rapidement sous pression.',
    lacher: 'Tu dois abandonner l\'habitude de tout résoudre seul par la force.',
    piege: 'Rester coincé dans l\'action impulsive te fait perdre les alliances durables.'
  },
  'Taureau': {
    sign: 'Taureau',
    maitrise: 'Tu sais déjà bâtir de la valeur tangible et tenir sur la durée.',
    lacher: 'Tu dois abandonner l\'attachement excessif à la sécurité matérielle.',
    piege: 'Rester dans la zone de confort te fait manquer les transformations nécessaires.'
  },
  'Gémeaux': {
    sign: 'Gémeaux',
    maitrise: 'Tu sais déjà connecter les idées et naviguer rapidement entre les contextes.',
    lacher: 'Tu dois abandonner la dispersion et le besoin constant de nouveauté.',
    piege: 'Rester dans le superficiel te fait manquer la profondeur qui crée l\'impact.'
  },
  'Cancer': {
    sign: 'Cancer',
    maitrise: 'Tu sais déjà protéger les tiens et créer un environnement sécurisant.',
    lacher: 'Tu dois abandonner la tendance à te replier dans ta bulle.',
    piege: 'Rester dans la protection excessive te fait manquer les opportunités extérieures.'
  },
  'Lion': {
    sign: 'Lion',
    maitrise: 'Tu sais déjà rayonner et inspirer les équipes autour de toi.',
    lacher: 'Tu dois abandonner le besoin constant de reconnaissance visible.',
    piege: 'Rester dans le rôle de star te fait perdre le pouvoir collectif.'
  },
  'Vierge': {
    sign: 'Vierge',
    maitrise: 'Tu sais déjà analyser avec précision et optimiser les processus.',
    lacher: 'Tu dois abandonner le perfectionnisme qui paralyse l\'action.',
    piege: 'Rester dans le contrôle des détails te fait manquer la vue d\'ensemble.'
  },
  'Balance': {
    sign: 'Balance',
    maitrise: 'Tu sais déjà créer l\'harmonie et naviguer les relations complexes.',
    lacher: 'Tu dois abandonner la peur du conflit et du déséquilibre.',
    piege: 'Rester dans la recherche constante d\'approbation te fait perdre ton autorité.'
  },
  'Scorpion': {
    sign: 'Scorpion',
    maitrise: 'Tu sais déjà transformer les crises en pouvoir.',
    lacher: 'Tu dois abandonner le contrôle excessif et la méfiance.',
    piege: 'Rester dans la transformation perpétuelle te fait manquer la stabilité durable.'
  },
  'Sagittaire': {
    sign: 'Sagittaire',
    maitrise: 'Tu sais déjà voir grand et inspirer par la vision.',
    lacher: 'Tu dois abandonner la dispersion et le besoin constant de mouvement.',
    piege: 'Rester dans l\'exploration sans fin te fait manquer la profondeur.'
  },
  'Capricorne': {
    sign: 'Capricorne',
    maitrise: 'Tu sais déjà bâtir des structures solides et tenir sur la durée.',
    lacher: 'Tu dois abandonner la rigidité et le contrôle excessif.',
    piege: 'Rester dans l\'ambition solitaire te fait manquer l\'harmonie humaine.'
  },
  'Verseau': {
    sign: 'Verseau',
    maitrise: 'Tu sais déjà innover pour le collectif et penser en systèmes.',
    lacher: 'Tu dois abandonner le détachement émotionnel excessif.',
    piege: 'Rester dans l\'idéalisme détaché te fait manquer l\'impact concret.'
  },
  'Poissons': {
    sign: 'Poissons',
    maitrise: 'Tu sais déjà sentir les courants invisibles et inspirer par l\'intuition.',
    lacher: 'Tu dois abandonner la tendance à te dissoudre dans les autres.',
    piege: 'Rester dans la fusion émotionnelle te fait perdre ta direction propre.'
  }
};

// ─────────────────────────────────────────────
// CONSTANTES — MISSION KARMIQUE COMPOSITIONNELLE
// Nœud Nord (12) + Chemin de Vie (12) + Âme (15) = 39 phrases
// Source : Grok R5
// ─────────────────────────────────────────────

export const NORTH_NODE_MISSION: Record<ZodiacSign, string> = {
  'Bélier': 'Ton âme t\'appelle à prendre les devants et à oser l\'action autonome.',
  'Taureau': 'Ton âme t\'appelle à construire de la valeur durable et tangible.',
  'Gémeaux': 'Ton âme t\'appelle à communiquer, connecter et transmettre.',
  'Cancer': 'Ton âme t\'appelle à protéger, nourrir et créer un foyer.',
  'Lion': 'Ton âme t\'appelle à briller, diriger et inspirer par l\'exemple.',
  'Vierge': 'Ton âme t\'appelle à servir avec précision et à perfectionner.',
  'Balance': 'Ton âme t\'appelle à créer l\'harmonie et la justice dans les relations.',
  'Scorpion': 'Ton âme t\'appelle à transformer, régénérer et aller au cœur des choses.',
  'Sagittaire': 'Ton âme t\'appelle à explorer, enseigner et élargir les horizons.',
  'Capricorne': 'Ton âme t\'appelle à bâtir des structures qui résistent au temps.',
  'Verseau': 'Ton âme t\'appelle à innover pour le collectif et repenser les systèmes.',
  'Poissons': 'Ton âme t\'appelle à transcender l\'ego et à servir une vision plus grande.'
};

export const CDV_MISSION: Record<number, string> = {
  1: 'Ton chemin exige leadership et indépendance — tu es fait pour ouvrir la voie.',
  2: 'Ton chemin exige coopération et diplomatie — tu es fait pour créer des alliances.',
  3: 'Ton chemin exige créativité et expression — tu es fait pour inspirer.',
  4: 'Ton chemin exige discipline et construction — tu es fait pour bâtir.',
  5: 'Ton chemin exige liberté et adaptabilité — tu es fait pour catalyser le changement.',
  6: 'Ton chemin exige responsabilité et harmonie — tu es fait pour protéger.',
  7: 'Ton chemin exige introspection et sagesse — tu es fait pour comprendre.',
  8: 'Ton chemin exige pouvoir et maîtrise — tu es fait pour diriger.',
  9: 'Ton chemin exige compassion et vision globale — tu es fait pour guérir.',
  11: 'Ton chemin exige vision et inspiration — tu es un canal pour les autres.',
  22: 'Ton chemin exige construction à grande échelle — tu es un bâtisseur de systèmes.',
  33: 'Ton chemin exige guérison et transmission — tu es un guide spirituel.'
};

export const AME_MISSION: Record<number, string> = {
  1: 'Ton âme vibre au rythme de l\'indépendance et de la nouveauté.',
  2: 'Ton âme vibre au rythme de l\'harmonie et de la connexion.',
  3: 'Ton âme vibre au rythme de la joie et de l\'expression.',
  4: 'Ton âme vibre au rythme de la stabilité et de l\'ordre.',
  5: 'Ton âme vibre au rythme de la liberté et de l\'aventure.',
  6: 'Ton âme vibre au rythme de l\'amour et de la responsabilité.',
  7: 'Ton âme vibre au rythme du mystère et de la recherche intérieure.',
  8: 'Ton âme vibre au rythme de l\'ambition et de la puissance.',
  9: 'Ton âme vibre au rythme de la compassion et du service universel.',
  11: 'Ton âme vibre au rythme de l\'illumination et de l\'intuition.',
  22: 'Ton âme vibre au rythme de la construction visionnaire.',
  33: 'Ton âme vibre au rythme de la guérison collective.'
};

// ─────────────────────────────────────────────
// CONSTANTES — TENSIONS KARMIQUES (6 axes × 2)
// Quand Nœud Nord et CdV/Âme pointent dans des directions opposées
// Source : Grok R7
// ─────────────────────────────────────────────

export const KARMIC_TENSIONS: Record<string, string> = {
  // Bélier ↔ Balance
  'Bélier_Balance':
    'Ton âme veut conquérir, mais ton chemin exige l\'harmonie — tension créatrice entre leadership et diplomatie.',
  'Balance_Bélier':
    'Ton âme veut l\'équilibre, mais ton chemin exige l\'audace — tension créatrice entre harmonie et initiative.',

  // Taureau ↔ Scorpion
  'Taureau_Scorpion':
    'Ton âme veut construire du durable, mais ton chemin exige la transformation — tension entre stabilité et régénération.',
  'Scorpion_Taureau':
    'Ton âme veut transformer, mais ton chemin exige la stabilité — tension entre pouvoir et sécurité.',

  // Gémeaux ↔ Sagittaire
  'Gémeaux_Sagittaire':
    'Ton âme veut connecter les détails, mais ton chemin exige la vision globale — tension entre information et sagesse.',
  'Sagittaire_Gémeaux':
    'Ton âme veut la vision globale, mais ton chemin exige la précision des détails — tension entre expansion et focus.',

  // Cancer ↔ Capricorne
  'Cancer_Capricorne':
    'Ton âme veut protéger, mais ton chemin exige l\'ambition — tension entre sécurité émotionnelle et réussite publique.',
  'Capricorne_Cancer':
    'Ton âme veut l\'ambition, mais ton chemin exige la protection — tension entre carrière et foyer.',

  // Lion ↔ Verseau
  'Lion_Verseau':
    'Ton âme veut briller, mais ton chemin exige le collectif — tension entre ego et humanisme.',
  'Verseau_Lion':
    'Ton âme veut le collectif, mais ton chemin exige le rayonnement personnel — tension entre innovation et leadership visible.',

  // Vierge ↔ Poissons
  'Vierge_Poissons':
    'Ton âme veut la précision, mais ton chemin exige l\'intuition — tension entre analyse et inspiration.',
  'Poissons_Vierge':
    'Ton âme veut l\'intuition, mais ton chemin exige la précision — tension entre rêve et perfection.'
};

// ─────────────────────────────────────────────
// CONSTANTES — LEÇONS KARMIQUES (nombres manquants)
// Source : GPT R8
// ─────────────────────────────────────────────

export const KARMIC_LESSONS: Record<number, string> = {
  1: 'Apprendre l\'indépendance et l\'initiative',
  2: 'Apprendre la coopération et la patience',
  3: 'Apprendre l\'expression et la communication',
  4: 'Apprendre la discipline et la construction',
  5: 'Apprendre la liberté et l\'adaptabilité',
  6: 'Apprendre la responsabilité et l\'harmonie',
  7: 'Apprendre l\'introspection et la spiritualité',
  8: 'Apprendre le pouvoir et la gestion matérielle',
  9: 'Apprendre le lâcher-prise et la compassion'
};

// ─────────────────────────────────────────────
// FONCTIONS
// ─────────────────────────────────────────────

/**
 * Détermine le Nœud Sud à partir du Nœud Nord.
 * Le Nœud Sud est le signe zodiacal opposé au Nœud Nord.
 */
export function getSouthNode(northNodeSign: ZodiacSign): SouthNodeReading {
  const southSign = ZODIAC_OPPOSITES[northNodeSign];
  return SOUTH_NODE_READINGS[southSign];
}

/**
 * Génère la mission karmique complète :
 * - Nœud Nord (ce vers quoi tu vas)
 * - Chemin de Vie (comment tu y vas)
 * - Nombre de l'Âme (ce qui te motive profondément)
 * - Tension (si Nœud Nord et CdV/Âme sont en opposition)
 */
export function generateKarmicMission(
  northNodeSign: ZodiacSign,
  cheminDeVie: number,
  nombreAme: number
): KarmicMissionReading {
  const nnText = NORTH_NODE_MISSION[northNodeSign] || '';
  const cdvText = CDV_MISSION[cheminDeVie] || CDV_MISSION[cheminDeVie % 9 || 9] || '';
  const ameText = AME_MISSION[nombreAme] || AME_MISSION[nombreAme % 9 || 9] || '';

  // Détection de tension karmique
  const tension = detectKarmicTension(northNodeSign, cheminDeVie, nombreAme);

  return {
    northNode: nnText,
    cheminDeVie: cdvText,
    nombreAme: ameText,
    tension
  };
}

/**
 * Détecte si une tension karmique existe entre le Nœud Nord et le
 * Chemin de Vie / Nombre de l'Âme.
 * La tension se produit quand les énergies pointent vers des directions opposées.
 */
export function detectKarmicTension(
  northNodeSign: ZodiacSign,
  cheminDeVie: number,
  nombreAme: number
): string | null {
  // Mapping CdV → énergie zodiacale dominante
  const CDV_ZODIAC_ENERGY: Record<number, ZodiacSign> = {
    1: 'Bélier',
    2: 'Balance',    // coopération → Balance
    3: 'Gémeaux',    // expression → Gémeaux
    4: 'Capricorne', // structure → Capricorne
    5: 'Sagittaire', // liberté → Sagittaire
    6: 'Cancer',     // responsabilité → Cancer
    7: 'Poissons',   // introspection → Poissons
    8: 'Scorpion',   // pouvoir → Scorpion
    9: 'Poissons',   // compassion → Poissons
    11: 'Verseau',   // vision → Verseau
    22: 'Taureau',   // construction → Taureau
    33: 'Poissons'   // guérison → Poissons
  };

  const cdvEnergy = CDV_ZODIAC_ENERGY[cheminDeVie] || CDV_ZODIAC_ENERGY[cheminDeVie % 9 || 9];
  if (!cdvEnergy) return null;

  // Vérifie si le CdV pointe vers le signe OPPOSÉ au Nœud Nord
  const oppositeOfNN = ZODIAC_OPPOSITES[northNodeSign];

  // Tension NN direction vs CdV direction
  const key1 = `${northNodeSign}_${cdvEnergy}`;
  const key2 = `${cdvEnergy}_${northNodeSign}`;

  if (KARMIC_TENSIONS[key1]) return KARMIC_TENSIONS[key1];
  if (KARMIC_TENSIONS[key2]) return KARMIC_TENSIONS[key2];

  return null;
}

/**
 * Retourne les leçons karmiques (nombres manquants dans le nom).
 * Les nombres absents du nom complet (1-9) indiquent des apprentissages à faire.
 */
export function getKarmicLessons(missingNumbers: number[]): KarmicLesson[] {
  return missingNumbers
    .filter(n => n >= 1 && n <= 9)
    .map(n => ({
      number: n,
      lesson: KARMIC_LESSONS[n]
    }));
}
