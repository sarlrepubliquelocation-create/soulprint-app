import { COSMIC_THRESHOLD } from './convergence';
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

/** Label/action/uxText modulés selon l'intensité réelle du signal */
export interface AlignmentDisplay {
  label: string;
  action: string;
  uxText: string;
}

export interface AlignmentResult {
  state: AlignmentState;
  /** Versions modulées par intensité — TOUJOURS utiliser display.* pour l'affichage */
  display: AlignmentDisplay;
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
    label: 'Tes 3 cycles alignés',
    fondPolarity: '+', tendancePolarity: '+', signalPolarity: '+',
    uxText: 'Ton cycle de vie, ta période annuelle et ton énergie du jour convergent — la voie est libre.',
    color: 'cyan',
    colorHex: '#00CED1',
    action: 'Fonce, matérialise.',
    icon: '✦',
  },
  effort_recompense: {
    name: 'effort_recompense',
    label: 'Effort récompensé',
    fondPolarity: '-', tendancePolarity: '+', signalPolarity: '+',
    uxText: 'Malgré une grande période de vie exigeante, l\'énergie de l\'année et du jour s\'élève.',
    color: 'orange',
    colorHex: '#FFA500',
    action: 'Avance prudemment — la fenêtre est réelle, le fond reste exigeant.',
    icon: '🔥',
  },
  illusion_fluidite: {
    name: 'illusion_fluidite',
    label: 'Illusion de fluidité',
    fondPolarity: '+', tendancePolarity: '-', signalPolarity: '-',
    uxText: 'Fond solide, mais brouillard immédiat.',
    color: 'blue-grey',
    colorHex: '#6699CC',
    action: 'Ne force pas les événements.',
    icon: '🌫',
  },
  tempete_cosmique: {
    name: 'tempete_cosmique',
    label: 'Tempête cosmique',
    fondPolarity: '-', tendancePolarity: '-', signalPolarity: '-',
    uxText: 'Tous les cycles freinent simultanément — période de reconstruction en profondeur.',
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
    action: 'Lâche prise aujourd\'hui, demain sera meilleur.',
    icon: '🍃',
  },
  percee_lumineuse: {
    name: 'percee_lumineuse',
    label: 'Percée lumineuse',
    fondPolarity: '+', tendancePolarity: '-', signalPolarity: '+',
    uxText: 'Éclair de génie dans un climat lourd.',
    color: 'electric-blue',
    colorHex: '#0080FF',
    action: 'Profite de cette ouverture éclair.',
    icon: '🌟',
  },
  oasis_ephemere: {
    name: 'oasis_ephemere',
    label: 'Oasis éphémère',
    fondPolarity: '-', tendancePolarity: '-', signalPolarity: '+',
    uxText: 'Brève accalmie au cœur d\'une phase exigeante.',
    color: 'magenta',
    colorHex: '#FF00FF',
    action: 'Prends l\'énergie, ne signe rien à long terme.',
    icon: '🌺',
  },
  tension_de_surface: {
    name: 'tension_de_surface',
    label: 'Tension de surface',
    fondPolarity: '-', tendancePolarity: '+', signalPolarity: '-',
    uxText: 'Contre-temps sur une météo mensuelle favorable.',
    color: 'orange-grey',
    colorHex: '#CC8844',
    action: 'Laisse passer l\'orage de la journée.',
    icon: '🌦',
  },
};

// ──────────────────────────────────────────────
// LES 5 PATTERNS DE CONTRADICTION
// ──────────────────────────────────────────────

const CONTRADICTION_PATTERNS: ContradictionPattern[] = [
  {
    name: 'fenetre_dans_tempete',
    label: 'Fenêtre dans la traversée',
    condition: { fondNegative: true, signalHigh: true },
    template: "Bien que tu sois dans une phase de [FOND_LABEL], aujourd'hui l'énergie s'élève jusqu'à [SIGNAL_LABEL]. Utilise cette ouverture avec stratégie plutôt qu'impulsion.",
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
    template: "Tu es dans une phase de [FOND_LABEL], mais aujourd'hui l'énergie descend en [SIGNAL_LABEL]. Ce ralentissement est lié à aujourd'hui — ta dynamique de fond reste intacte.",
    domainVariants: {
      BUSINESS: 'Ne remets pas en cause la stratégie à cause d\'un contretemps tactique.',
      AMOUR: 'Une tension passagère ne définit pas la relation — le fond reste solide.',
      VITALITE: 'Repos ponctuel dans une dynamique globalement favorable — récupère intelligemment.',
    },
  },
  {
    name: 'spike_isole',
    label: 'Pic isolé',
    condition: { fondNeutral: true, signalExtreme: true },
    template: "Ta phase actuelle est stable, mais aujourd'hui l'énergie monte jusqu'à [SIGNAL_LABEL]. Ce pic est lié à aujourd'hui spécifiquement — pas à une tendance de fond.",
    domainVariants: {
      BUSINESS: 'Une fenêtre tactique dans un contexte neutre — agis avec lucidité.',
      AMOUR: 'Intensité émotionnelle passagère — observe avant de t\'engager.',
      VITALITE: 'Énergie anormalement haute ou basse — écoute le signal du corps.',
    },
  },
  {
    name: 'dissociation_multiscale',
    label: 'Signaux croisés',
    condition: { allDivergent: true },
    template: "Les dynamiques longues et courtes ne vont pas dans la même direction. Ce décalage indique un ajustement en cours — laisse la poussière retomber avant d'agir.",
    domainVariants: {
      BUSINESS: 'Période de repositionnement — ne signe rien d\'irréversible.',
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
  | 'Convergence rare'
  | 'Élan fort'
  | 'Favorable'
  | 'Consolidation'
  | 'Prudence'
  | 'Tempête';

// Mapping score → SignalLabel
export function getSignalLabel(score: number): SignalLabel {
  if (score >= COSMIC_THRESHOLD) return 'Convergence rare';
  if (score >= 80) return 'Élan fort';
  if (score >= 65) return 'Favorable';
  if (score >= 40) return 'Consolidation';
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
    'Convergence rare': 'Dans cette phase de consolidation, aujourd\'hui offre une accélération inhabituelle.',
    'Élan fort':        'Un élan inattendu dans une période de consolidation — saisis-le prudemment.',
    Tempête:            'La consolidation en cours absorbe la turbulence du jour.',
    Prudence:           'Période de consolidation + journée prudente — double signal de patience.',
  },
  Expansion: {
    Tempête:  'L\'expansion de fond reste intacte — cette résistance du jour est passagère.',
    Prudence: 'La dynamique d\'expansion n\'est pas remise en cause par ce ralentissement.',
  },
  Épuration: {
    'Convergence rare': 'Un signal fort pendant l\'épuration — une opportunité à saisir avec discernement.',
    'Élan fort':        'Une fenêtre lumineuse dans le travail d\'épuration en cours.',
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

  // Modulation intensité : tempérer les labels quand le score ne justifie pas l'extrême
  const display = modulateDisplay(state, score);

  return {
    state,
    display,
    fondPolarity,
    tendancePolarity,
    signalPolarity,
    activePattern,
    patternText,
    synthesisPhraseComponents,
  };
}

// ──────────────────────────────────────────────
// MODULATION INTENSITÉ
// Tempère labels/actions quand le score ne justifie pas le message extrême
// ──────────────────────────────────────────────

function modulateDisplay(state: AlignmentState, score: number): AlignmentDisplay {
  const isModeratePositive = score >= 50 && score <= 65;
  const isModerateNegative = score >= 35 && score < 50;

  if (state.name === 'autoroute_cosmique' && isModeratePositive) {
    return {
      label: 'Tes 3 cycles alignés',
      action: 'Avance avec confiance — le terrain est porteur, même si l\'intensité reste modérée.',
      uxText: 'Tes 3 cycles sont alignés, mais l\'énergie du jour reste mesurée — bonne fenêtre sur terrain favorable.',
    };
  }
  if (state.name === 'percee_lumineuse' && isModeratePositive) {
    return {
      label: 'Éclaircie possible',
      action: 'Reste attentif aux opportunités — le climat est lourd mais la porte s\'entrouvre.',
      uxText: 'Un signal positif dans un climat de tendance lourde — garde les yeux ouverts sans forcer.',
    };
  }
  if (state.name === 'tempete_cosmique' && isModerateNegative) {
    return {
      label: 'Résistance diffuse',
      action: 'Journée d\'observation — pas de tempête, mais un frein général à prendre en compte.',
      uxText: 'Les cycles ne sont pas alignés en ta faveur, mais rien d\'alarmant — patience et recul.',
    };
  }

  // Pas de modulation → valeurs originales
  return { label: state.label, action: state.action, uxText: state.uxText };
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

  // Helper : liaison "de/d'" selon voyelle initiale
  const de = (s: string) => /^[aeiouyéèêëàâäùûüôöîïh]/i.test(s) ? `d'${s}` : `de ${s}`;

  // Partie Fond
  const fondPart = `En plein cycle ${de(fond)}`;

  // Partie Tendance
  const tendancePart = `tu traverses une période ${de(tendance.toLowerCase())}`;

  // Partie Signal — "Favorable" est adjectif (pas de "de"), les autres sont des noms
  const signalPart = signal === 'Favorable'
    ? `Aujourd'hui est une journée favorable — ${state.uxText}`
    : `Aujourd'hui est une journée ${de(signal.toLowerCase())} — ${state.uxText}`;

  // Alerte transition LP
  let transitionPart = '';
  if (options?.lpTransitionMonths !== undefined && options.lpTransitionMonths < 8) {
    transitionPart = ` Dans ${options.lpTransitionMonths} mois, une nouvelle grande période de vie commence.`;
  }

  // Zone de Mutation
  let mutationPart = '';
  if (options?.ciZoneMutation) {
    mutationPart = ' L\'horizon proche est en période charnière — tes choix actuels pèsent plus que d\'habitude.';
  }

  // Connecteur correctif si contradiction
  const connPart = connector ? `\n${connector}` : '';

  return `${fondPart}, ${tendancePart}. ${signalPart.replace(/\.$/, '')}. ${transitionPart}${mutationPart}${connPart}`.replace(/\s+/g, ' ').trim();
}

// Exports pour usage externe
export { ALIGNMENT_STATES, CONTRADICTION_PATTERNS };
