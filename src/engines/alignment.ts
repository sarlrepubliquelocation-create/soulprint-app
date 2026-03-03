// ═══ ALIGNMENT ENGINE — V4.5 ═══
// Indicateur d'alignement global : 8 états Fond/Tendance/Signal
// 5 patterns de contradiction narratifs
// Source : Arbitrage Round 2 — Gemini (matrice 8 états) + GPT (patterns + templates)
// Architecture : zéro modification de convergence.ts existant

// ──────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────

export type AlignmentPolarity = '+' | '-';

export type AlignmentStateName =
  | 'autoroute_cosmique'
  | 'effort_recompense'
  | 'illusion_fluidite'
  | 'tempete_cosmique'
  | 'faux_pas_passager'
  | 'percee_lumineuse'
  | 'oasis_ephemere'
  | 'tension_de_surface';

export interface AlignmentState {
  name: AlignmentStateName;
  label: string;
  fondPolarity: AlignmentPolarity;
  tendancePolarity: AlignmentPolarity;
  signalPolarity: AlignmentPolarity;
  uxText: string;           // Max 15 mots
  color: string;
  colorHex: string;
  action: string;           // Recommandation courte
  icon: string;
}

export type ContradictionPatternName =
  | 'fenetre_dans_tempete'
  | 'rafale_vent_porteur'
  | 'spike_isole'
  | 'dissociation_multiscale'
  | 'zone_de_bascule';

export interface ContradictionPattern {
  name: ContradictionPatternName;
  label: string;
  condition: {
    fondNegative?: boolean;
    fondPositive?: boolean;
    signalHigh?: boolean;        // Signal ≥ 80
    signalLow?: boolean;         // Signal ≤ 35
    signalExtreme?: boolean;     // Signal ≥ 80 ou ≤ 35
    fondNeutral?: boolean;       // Fond neutre
    allDivergent?: boolean;      // Tous divergents
    lpTransition?: boolean;      // LP change dans < 12 mois
  };
  template: string;
  domainVariants: {
    BUSINESS: string;
    AMOUR: string;
    VITALITE: string;
  };
}

export interface AlignmentResult {
  state: AlignmentState;
  fondPolarity: AlignmentPolarity;
  tendancePolarity: AlignmentPolarity;
  signalPolarity: AlignmentPolarity;
  activePattern: ContradictionPattern | null;
  patternText: string | null;
  synthesisPhraseComponents: {
    fond: string;
    tendance: string;
    signal: string;
    connector: string;
  };
}

// ──────────────────────────────────────────────
// LES 8 ÉTATS D'ALIGNEMENT
// Table exhaustive : 2³ = 8 combinaisons F/T/S
// ──────────────────────────────────────────────

const ALIGNMENT_STATES: Record<AlignmentStateName, AlignmentState> = {
  autoroute_cosmique: {
    name: 'autoroute_cosmique',
    label: 'Autoroute cosmique',
    fondPolarity: '+', tendancePolarity: '+', signalPolarity: '+',
    uxText: 'Alignement total — la voie est libre.',
    color: 'cyan',
    colorHex: '#00CED1',
    action: 'Foncez, matérialisez.',
    icon: '✦',
  },
  effort_recompense: {
    name: 'effort_recompense',
    label: 'Effort récompensé',
    fondPolarity: '-', tendancePolarity: '+', signalPolarity: '+',
    uxText: 'Vent porteur sur terrain exigeant.',
    color: 'orange',
    colorHex: '#FFA500',
    action: 'Agissez avec résilience.',
    icon: '🔥',
  },
  illusion_fluidite: {
    name: 'illusion_fluidite',
    label: 'Illusion de fluidité',
    fondPolarity: '+', tendancePolarity: '-', signalPolarity: '-',
    uxText: 'Fond solide, mais brouillard immédiat.',
    color: 'blue-grey',
    colorHex: '#6699CC',
    action: 'Ne forcez pas les événements.',
    icon: '🌫',
  },
  tempete_cosmique: {
    name: 'tempete_cosmique',
    label: 'Tempête cosmique',
    fondPolarity: '-', tendancePolarity: '-', signalPolarity: '-',
    uxText: 'Friction globale — phase d\'initiation par le vide.',
    color: 'deep-purple',
    colorHex: '#4B0082',
    action: 'Repli stratégique, introspection.',
    icon: '⛈',
  },
  faux_pas_passager: {
    name: 'faux_pas_passager',
    label: 'Faux pas passager',
    fondPolarity: '+', tendancePolarity: '+', signalPolarity: '-',
    uxText: 'Dissonance brève dans un ciel clair.',
    color: 'light-green',
    colorHex: '#90EE90',
    action: 'Lâchez prise aujourd\'hui, demain sera meilleur.',
    icon: '🍃',
  },
  percee_lumineuse: {
    name: 'percee_lumineuse',
    label: 'Percée lumineuse',
    fondPolarity: '+', tendancePolarity: '-', signalPolarity: '+',
    uxText: 'Éclair de génie dans un climat lourd.',
    color: 'electric-blue',
    colorHex: '#0080FF',
    action: 'Profitez de cette ouverture éclair.',
    icon: '⚡',
  },
  oasis_ephemere: {
    name: 'oasis_ephemere',
    label: 'Oasis éphémère',
    fondPolarity: '-', tendancePolarity: '-', signalPolarity: '+',
    uxText: 'Brève accalmie au cœur de la tempête.',
    color: 'magenta',
    colorHex: '#FF00FF',
    action: 'Prenez l\'énergie, ne signez rien à long terme.',
    icon: '🌺',
  },
  tension_de_surface: {
    name: 'tension_de_surface',
    label: 'Tension de surface',
    fondPolarity: '-', tendancePolarity: '+', signalPolarity: '-',
    uxText: 'Contre-temps sur une météo mensuelle favorable.',
    color: 'orange-grey',
    colorHex: '#CC8844',
    action: 'Laissez passer l\'orage de la journée.',
    icon: '🌦',
  },
};

// ──────────────────────────────────────────────
// LES 5 PATTERNS DE CONTRADICTION
// ──────────────────────────────────────────────

const CONTRADICTION_PATTERNS: ContradictionPattern[] = [
  {
    name: 'fenetre_dans_tempete',
    label: 'Fenêtre dans la tempête',
    condition: { fondNegative: true, signalHigh: true },
    template: "Bien que tu sois dans une phase de [FOND_LABEL], aujourd'hui la fenêtre est [SIGNAL_LABEL]. Utilise cette ouverture avec stratégie plutôt qu'impulsion.",
    domainVariants: {
      BUSINESS: 'Opportunité tactique dans un climat exigeant — agis, mais protège tes arrières.',
      AMOUR: 'Moment lumineux dans une période relationnelle instable — connecte, sans tout miser.',
      VITALITE: 'Pic d\'énergie ponctuel dans un cycle de récupération — bouge, sans te surmener.',
    },
  },
  {
    name: 'rafale_vent_porteur',
    label: 'Rafale dans le vent porteur',
    condition: { fondPositive: true, signalLow: true },
    template: "Tu es dans une phase de [FOND_LABEL], mais aujourd'hui l'énergie est [SIGNAL_LABEL]. Ce ralentissement est ponctuel, pas structurel.",
    domainVariants: {
      BUSINESS: 'Ne remets pas en cause la stratégie à cause d\'un contretemps tactique.',
      AMOUR: 'Une tension passagère ne définit pas la relation — le fond reste solide.',
      VITALITE: 'Repos ponctuel dans une dynamique globalement favorable — récupère intelligemment.',
    },
  },
  {
    name: 'spike_isole',
    label: 'Spike isolé',
    condition: { fondNeutral: true, signalExtreme: true },
    template: "Ta phase actuelle est stable, mais aujourd'hui l'énergie est exceptionnellement [SIGNAL_LABEL]. Ce pic est circonstanciel, pas structurel.",
    domainVariants: {
      BUSINESS: 'Une fenêtre tactique dans un contexte neutre — agis avec lucidité.',
      AMOUR: 'Intensité émotionnelle passagère — observe avant de t\'engager.',
      VITALITE: 'Énergie anormalement haute ou basse — écoute le signal du corps.',
    },
  },
  {
    name: 'dissociation_multiscale',
    label: 'Dissociation multi-échelle',
    condition: { allDivergent: true },
    template: "Les dynamiques longues et courtes ne vont pas dans la même direction. Cette dissociation indique un ajustement en cours — laisse la poussière retomber avant d'agir.",
    domainVariants: {
      BUSINESS: 'Période de repositionnement — ne signez rien d\'irréversible.',
      AMOUR: 'Signaux contradictoires dans la relation — attends la clarté.',
      VITALITE: 'Corps et cycles désynchronisés — priorité au repos réparateur.',
    },
  },
  {
    name: 'zone_de_bascule',
    label: 'Zone de bascule',
    condition: { lpTransition: true, signalExtreme: true },
    template: "Tu approches d'un changement de cycle majeur. Les intensités actuelles sont les prémices d'un nouveau climat — ce que tu ressens maintenant annonce ce qui vient.",
    domainVariants: {
      BUSINESS: 'Phase de repositionnement décennal — les décisions actuelles portent loin.',
      AMOUR: 'Mutation profonde en cours — les émotions intenses sont un signal, pas un verdict.',
      VITALITE: 'Corps en phase de recalibration — adapte ton rythme au changement qui arrive.',
    },
  },
];

// ──────────────────────────────────────────────
// MATRICES DES LABELS NARRATIFS
// Pour la phrase synthèse algorithmique
// ──────────────────────────────────────────────

export type FondLabel =
  | 'Expansion'
  | 'Consolidation'
  | 'Épuration'
  | 'Transition'
  | 'Intériorisation'
  | 'Structuration';

export type TendanceLabel =
  | 'Initiation'
  | 'Construction'
  | 'Expansion sociale'
  | 'Récolte'
  | 'Introspection';

export type SignalLabel =
  | 'Cosmique'
  | 'Gold'
  | 'Favorable'
  | 'Routine'
  | 'Prudence'
  | 'Tempête';

// Mapping score → SignalLabel
export function getSignalLabel(score: number): SignalLabel {
  if (score >= 90) return 'Cosmique';
  if (score >= 80) return 'Gold';
  if (score >= 65) return 'Favorable';
  if (score >= 40) return 'Routine';
  if (score >= 25) return 'Prudence';
  return 'Tempête';
}

// Signal polarity depuis score
function getSignalPolarity(score: number): AlignmentPolarity {
  return score >= 50 ? '+' : '-';
}

// Connecteurs selon Fond → Signal contradiction
const CONTRADICTION_CONNECTORS: Partial<Record<FondLabel, Partial<Record<SignalLabel, string>>>> = {
  Consolidation: {
    Cosmique: 'Dans cette phase de consolidation, aujourd\'hui offre une accélération inhabituelle.',
    Gold:     'Un élan inattendu dans une période de consolidation — saisis-le prudemment.',
    Tempête:  'La consolidation en cours absorbe la turbulence du jour.',
    Prudence: 'Période de consolidation + journée prudente — double signal de patience.',
  },
  Expansion: {
    Tempête:  'L\'expansion de fond reste intacte — cette résistance du jour est passagère.',
    Prudence: 'La dynamique d\'expansion n\'est pas remise en cause par ce ralentissement.',
  },
  Épuration: {
    Cosmique: 'Un signal fort pendant l\'épuration — une opportunité à saisir avec discernement.',
    Gold:     'Une fenêtre lumineuse dans le travail d\'épuration en cours.',
  },
};

// ──────────────────────────────────────────────
// CALCUL PRINCIPAL
// ──────────────────────────────────────────────

export interface AlignmentInput {
  score: number;               // Score daily 5-97 (Signal)
  tendanceScore: number;       // Score Tendance (ex: depuis temporal-layers)
  fondLabel: FondLabel;
  tendanceLabel: TendanceLabel;
  lpTransitionInMonths?: number;   // Mois avant changement LP (undefined = pas de transition proche)
}

export function calcAlignment(input: AlignmentInput): AlignmentResult {
  const { score, tendanceScore, fondLabel, tendanceLabel, lpTransitionInMonths } = input;

  const signalPolarity = getSignalPolarity(score);
  const tendancePolarity: AlignmentPolarity = tendanceScore >= 0 ? '+' : '-';
  const fondPolarity: AlignmentPolarity = getFondPolarity(fondLabel);

  // Trouver l'état correspondant
  const state = findAlignmentState(fondPolarity, tendancePolarity, signalPolarity);

  // Trouver le pattern actif
  const activePattern = findActivePattern(
    fondPolarity,
    signalPolarity,
    score,
    fondLabel,
    lpTransitionInMonths,
  );

  // Construire le texte du pattern si actif
  let patternText: string | null = null;
  if (activePattern) {
    patternText = buildPatternText(activePattern, fondLabel, getSignalLabel(score));
  }

  // Construire les composants de la phrase synthèse
  const connector = getConnector(fondLabel, getSignalLabel(score), fondPolarity, signalPolarity);
  const synthesisPhraseComponents = {
    fond: fondLabel,
    tendance: tendanceLabel,
    signal: getSignalLabel(score),
    connector,
  };

  return {
    state,
    fondPolarity,
    tendancePolarity,
    signalPolarity,
    activePattern,
    patternText,
    synthesisPhraseComponents,
  };
}

// ──────────────────────────────────────────────
// FONCTIONS INTERNES
// ──────────────────────────────────────────────

function getFondPolarity(label: FondLabel): AlignmentPolarity {
  const positive: FondLabel[] = ['Expansion', 'Consolidation', 'Récolte' as unknown as FondLabel];
  const negative: FondLabel[] = ['Épuration', 'Intériorisation'];
  if (positive.includes(label)) return '+';
  if (negative.includes(label)) return '-';
  // Transition et Structuration = neutre → on lit via tendance
  return '+';
}

function findAlignmentState(
  f: AlignmentPolarity,
  t: AlignmentPolarity,
  s: AlignmentPolarity,
): AlignmentState {
  const key = `${f}${t}${s}`;
  const map: Record<string, AlignmentStateName> = {
    '+++': 'autoroute_cosmique',
    '-++': 'effort_recompense',
    '+--': 'illusion_fluidite',
    '---': 'tempete_cosmique',
    '++-': 'faux_pas_passager',
    '+-+': 'percee_lumineuse',
    '--+': 'oasis_ephemere',
    '-+-': 'tension_de_surface',
  };
  const stateName = map[key] ?? 'faux_pas_passager';
  return ALIGNMENT_STATES[stateName];
}

function findActivePattern(
  fondPolarity: AlignmentPolarity,
  signalPolarity: AlignmentPolarity,
  score: number,
  fondLabel: FondLabel,
  lpTransitionInMonths?: number,
): ContradictionPattern | null {
  const signalHigh = score >= 80;
  const signalLow = score <= 35;
  const signalExtreme = signalHigh || signalLow;
  const fondNeutral = fondLabel === 'Transition' || fondLabel === 'Structuration';
  const lpTransition = lpTransitionInMonths !== undefined && lpTransitionInMonths < 12;

  // Pattern 5 prioritaire : LP transition + signal extrême
  if (lpTransition && signalExtreme) {
    return CONTRADICTION_PATTERNS.find(p => p.name === 'zone_de_bascule') ?? null;
  }

  // Pattern 4 : tout diverge
  if (fondPolarity === '-' && signalPolarity === '+' && !signalHigh && !signalLow) {
    // dissociation seulement si fond et signal sont opposés ET tendance aussi diverge
    // → laissé à temporal-layers pour orchestrer
  }

  // Pattern 1 : fond négatif + signal haut
  if (fondPolarity === '-' && signalHigh) {
    return CONTRADICTION_PATTERNS.find(p => p.name === 'fenetre_dans_tempete') ?? null;
  }

  // Pattern 2 : fond positif + signal bas
  if (fondPolarity === '+' && signalLow) {
    return CONTRADICTION_PATTERNS.find(p => p.name === 'rafale_vent_porteur') ?? null;
  }

  // Pattern 3 : fond neutre + signal extrême
  if (fondNeutral && signalExtreme) {
    return CONTRADICTION_PATTERNS.find(p => p.name === 'spike_isole') ?? null;
  }

  return null;
}

function buildPatternText(
  pattern: ContradictionPattern,
  fondLabel: FondLabel,
  signalLabel: SignalLabel,
): string {
  return pattern.template
    .replace('[FOND_LABEL]', fondLabel)
    .replace('[SIGNAL_LABEL]', signalLabel)
    .replace('[FOND_START]', '');
}

function getConnector(
  fondLabel: FondLabel,
  signalLabel: SignalLabel,
  fondPolarity: AlignmentPolarity,
  signalPolarity: AlignmentPolarity,
): string {
  // Si alignés → pas de connecteur correctif
  if (fondPolarity === signalPolarity) return '';

  // Connecteur spécifique
  const specific = CONTRADICTION_CONNECTORS[fondLabel]?.[signalLabel];
  if (specific) return specific;

  // Connecteur générique
  if (fondPolarity === '+' && signalPolarity === '-') {
    return `La phase de ${fondLabel} reste le contexte dominant — ce signal bas est passager.`;
  }
  if (fondPolarity === '-' && signalPolarity === '+') {
    return `Malgré la phase d'${fondLabel}, une fenêtre s'ouvre aujourd'hui — agis prudemment.`;
  }
  return '';
}

// ──────────────────────────────────────────────
// BUILDER PHRASE SYNTHÈSE COMPLÈTE
// ──────────────────────────────────────────────

/**
 * Génère la phrase synthèse narrative complète.
 * Template Gemini Round 2 : "[Connecteur] ancré dans [FOND], tu traverses [TENDANCE].
 *                             Aujourd'hui, [SIGNAL] — [ALIGNEMENT]."
 */
export function buildSynthesisPhrase(
  result: AlignmentResult,
  options?: {
    lpTransitionMonths?: number;   // Si LP change dans X mois
    ciZoneMutation?: boolean;      // Si CI < 0.40 dans les 3 prochains mois
  }
): string {
  const { fond, tendance, signal, connector } = result.synthesisPhraseComponents;
  const { state } = result;

  // Partie Fond
  const fondPart = `Ancré·e dans un cycle de ${fond}`;

  // Partie Tendance
  const tendancePart = `tu traverses une période de ${tendance.toLowerCase()}`;

  // Partie Signal
  const signalPart = `aujourd'hui est une journée ${signal.toLowerCase()} — ${state.uxText}`;

  // Alerte transition LP
  let transitionPart = '';
  if (options?.lpTransitionMonths !== undefined && options.lpTransitionMonths < 8) {
    transitionPart = ` Dans ${options.lpTransitionMonths} mois, un nouveau cycle décennal commence.`;
  }

  // Zone de Mutation
  let mutationPart = '';
  if (options?.ciZoneMutation) {
    mutationPart = ' L\'horizon proche entre en Zone de Mutation — tes choix actuels pèsent plus que d\'habitude.';
  }

  // Connecteur correctif si contradiction
  const connPart = connector ? `\n${connector}` : '';

  return `${fondPart}, ${tendancePart}. ${signalPart}.${transitionPart}${mutationPart}${connPart}`;
}

// Exports pour usage externe
export { ALIGNMENT_STATES, CONTRADICTION_PATTERNS };
