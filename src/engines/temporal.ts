// ============================================================================
// SOULPRINT ORACLE V3.2 — temporal.ts
// Moteur Temporel : Momentum, Forecast, Passé, Présent, Narrative, Arcs
// V3.2 (audit Gemini R6+R7) :
//   - MACD Trend Inversion : détection de retournements via EMA(3)/EMA(7)
//   - Derivative Volatility Shock : alerte quand delta quotidien ≥ ±35
//   - Pinnacle Contextual Baseline : ajustement du score selon la phase du Pinnacle
// V2.9.2: Fichier original (GPT R7+R8 algo, Grok R7+R9 textes)
// ============================================================================
//
// DÉPENDANCES (à connecter lors de l'intégration Phase 2) :
// - convergence.ts → calcConvergence(), calcPersonalYear(), calcPersonalMonth()
// - moon.ts → getMercuryStatus(), getPlanetaryRetroScore(),
//              RETRO_PERIODS, ECLIPSES_2025_2035
// - life-timeline.ts → calcPinnacles()
//
// Pour l'instant ces fonctions sont déclarées en types.
// L'intégration se fera en Phase 2 quand Jérôme fournira les fichiers.
// ============================================================================

import { COSMIC_THRESHOLD } from './convergence';
import { calcAge } from './date-utils';

// ─────────────────────────────────────────────
// TYPES — DÉPENDANCES EXTERNES (à connecter)
// ─────────────────────────────────────────────

export interface PinnacleInfo {
  number: number;
  startAge: number;
  endAge: number;
}

export interface RetroPeriod {
  planet: string;
  start: string;   // ISO date
  end: string;     // ISO date
}

export interface EclipseInfo {
  date: string;    // ISO date
  type: string;    // 'solaire' | 'lunaire'
}

export interface MercuryStatus {
  phase: string;
  score: number;
  label: string;
}

export interface PlanetaryRetro {
  planet: string;
  score: number;
}

// ─────────────────────────────────────────────
// TYPES — MOMENTUM ENGINE
// ─────────────────────────────────────────────

export interface MomentumResult {
  trend: 'rising' | 'falling' | 'stable' | 'volatile';
  scores: number[];         // les 7 scores (pour sparkline UI)
  avgLast7: number;
  delta: number;            // score aujourd'hui - moyenne 7j
  streak: number;           // jours consécutifs au-dessus/dessous de 50
  streakType: 'positive' | 'negative' | 'none';
  momentum: number;         // -10 à +10
}

// ─────────────────────────────────────────────
// TYPES — MACD TREND INVERSION (V3.2)
// ─────────────────────────────────────────────

export interface MACDResult {
  ema3: number;             // EMA rapide (3 jours)
  ema7: number;             // EMA lente (7 jours)
  macdLine: number;         // ema3 - ema7
  signal: number;           // EMA(2) du MACD
  histogram: number;        // macdLine - signal
  crossover: 'bullish' | 'bearish' | null;  // croisement détecté
  divergence: boolean;      // divergence MACD vs score (retournement probable)
  narrative: string;        // texte explicatif
}

// ─────────────────────────────────────────────
// TYPES — DERIVATIVE VOLATILITY SHOCK (V3.2)
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// TYPES — FORECAST ENGINE
// ─────────────────────────────────────────────

export interface ForecastDay {
  date: Date;
  score: number;
}

export interface ActionWindow {
  start: Date;
  end: Date;
  avg: number;
  days: number;
}

export interface NextRetrograde {
  planet: string;
  startDate: Date;
  endDate: Date;
  daysUntil: number;
  type: 'retro_start' | 'retro_end';
}

export interface NextEclipse {
  date: Date;
  type: string;
  daysUntil: number;
}

export interface NextPYTransition {
  fromPY: number;
  toPY: number;
  date: Date;
  daysUntil: number;
}

export interface NextPinnacleTransition {
  fromPinnacle: number | null;
  toPinnacle: number | null;
  transitionAge: number;
  daysUntil: number;
}

export interface ForecastResult {
  next7: {
    avg: number;
    best: ForecastDay;
    worst: ForecastDay;
    goldDays: number;
  };
  next30: {
    avg: number;
    goldDays: number;
    cosmiqueDays: number;
    trend: 'favorable' | 'challenging';
  };
  next90: {
    avg: number;
    goldDays: number;
    majorEvents: ForecastEvent[];
  };
  windows: ActionWindow[];
  nextRetrograde: NextRetrograde | null;
  nextEclipse: NextEclipse | null;
  nextPYTransition: NextPYTransition | null;
  nextPinnacleTransition: NextPinnacleTransition | null;
}

export interface ForecastEvent {
  type: string;
  date: Date;
  description: string;
  daysUntil: number;
}

// ─────────────────────────────────────────────
// TYPES — PAST ANALYSIS
// ─────────────────────────────────────────────

export interface PastAnalysis {
  currentPinnacle: {
    number: number;
    meaning: string;
    startAge: number;
    endAge: number;
    position: 'early' | 'middle' | 'late';
  };
  previousPinnacle: {
    number: number;
    meaning: string;
    lesson: string;
  } | null;
  personalYearHistory: {
    year: number;
    py: number;
    theme: string;
  }[];
  karmicLessons: { number: number; lesson: string }[];
  southNode: { sign: string; meaning: string } | null;
  pastPattern: 'expansion' | 'consolidation' | 'maturation' | 'transition';
}

// ─────────────────────────────────────────────
// TYPES — PRESENT CONTEXT
// ─────────────────────────────────────────────

export interface PresentContext {
  cyclePosition: {
    pinnacle: { number: number; position: 'early' | 'middle' | 'late'; yearsLeft: number };
    personalYear: { number: number; monthInYear: number; theme: string };
    personalMonth: { number: number; weekInMonth: number };
    mercuryPhase: MercuryStatus;
    retrogradesActive: PlanetaryRetro[];
  };
  intensity: 'calm' | 'building' | 'peak' | 'releasing';
  keyMessage: string;
}

// ─────────────────────────────────────────────
// TYPES — TEMPORAL NARRATIVE
// ─────────────────────────────────────────────

export type ArcName =
  | "L'Envol" | 'La Traversée' | 'La Renaissance' | 'Le Sommet'
  | 'La Maturation' | 'La Tempête' | 'Le Portail' | "L'Endurance"
  | 'La Moisson' | 'Le Pivot' | 'La Consolidation' | "L'Appel"
  | 'Le Cycle en Cours';

export interface TemporalNarrative {
  past: { title: string; narrative: string; insight: string };
  present: { title: string; narrative: string; insight: string };
  future: { title: string; narrative: string; insight: string };
  arc: ArcName;
}

// ─────────────────────────────────────────────
// CONSTANTES — THÈMES PY
// Source : GPT R8
// ─────────────────────────────────────────────

export const PY_THEMES: Record<number, string> = {
  1: 'Nouveau départ', 2: 'Partenariats', 3: 'Créativité',
  4: 'Structure', 5: 'Changement', 6: 'Harmonie',
  7: 'Introspection', 8: 'Pouvoir', 9: 'Clôture',
  11: 'Vision', 22: 'Construction', 33: 'Guérison'
};

// ─────────────────────────────────────────────
// CONSTANTES — PINNACLE MEANINGS
// ─────────────────────────────────────────────

const PINNACLE_LABELS: Record<number, string> = {
  1: 'Formation', 2: 'Pouvoir', 3: 'Maîtrise', 4: 'Sagesse'
};

// ─────────────────────────────────────────────
// CONSTANTES — 12 ARCS NARRATIFS
// Source : Grok R7
// ─────────────────────────────────────────────

export const ARC_NARRATIVES: Record<ArcName, {
  past: { title: string; narrative: string; insight: string };
  present: { title: string; narrative: string; insight: string };
  future: { title: string; narrative: string; insight: string };
  conseil: string;
  nuance: string;
}> = {
  "L'Envol": {
    past: {
      title: 'Phase de consolidation',
      narrative: 'Tu sors d\'une phase de consolidation. Les fondations sont solides, l\'énergie est là.',
      insight: 'Les efforts passés se transforment en momentum visible.'
    },
    present: {
      title: 'Élan puissant',
      narrative: 'Le vent souffle dans tes voiles. C\'est le moment où les efforts se cristallisent.',
      insight: 'Phase d\'activation maximale.'
    },
    future: {
      title: 'Accélération',
      narrative: 'Les opportunités se multiplient dans les semaines à venir.',
      insight: 'Lance tes initiatives les plus ambitieuses maintenant.'
    },
    conseil: 'Lance tes initiatives les plus ambitieuses maintenant — l\'univers répond à l\'action claire.',
    nuance: 'L\'envol est exaltant, mais il faut garder un œil sur les turbulences cachées.'
  },
  'La Traversée': {
    past: {
      title: 'Phase d\'expansion',
      narrative: 'Tu traverses une zone de relâchement après une période d\'expansion.',
      insight: 'L\'énergie se retire doucement, les résultats sont là mais le rythme ralentit.'
    },
    present: {
      title: 'Recalibrage stratégique',
      narrative: 'C\'est une phase de digestion et de recalibrage. Le rythme change.',
      insight: 'Période de clôture et ajustement.'
    },
    future: {
      title: 'Préparation',
      narrative: 'La traversée prépare le terrain pour le prochain bond.',
      insight: 'Consolide, révise, renforce — ne force pas l\'accélérateur.'
    },
    conseil: 'Consolide, révise, renforce — ne force pas l\'accélérateur.',
    nuance: 'La traversée peut sembler calme, mais c\'est souvent là que se préparent les prochains bonds.'
  },
  'La Renaissance': {
    past: {
      title: 'Fin de crise',
      narrative: 'Tu sors d\'une crise ou d\'une transition. Tout ce qui devait mourir est mort.',
      insight: 'L\'énergie revient, plus claire et plus alignée.'
    },
    present: {
      title: 'Reconstruction',
      narrative: 'L\'énergie de construction est palpable. De nouvelles bases se posent.',
      insight: 'Construction progressive.'
    },
    future: {
      title: 'Nouveau cycle',
      narrative: 'Ce que tu construis maintenant portera ton prochain cycle.',
      insight: 'Pose les nouvelles bases avec intention.'
    },
    conseil: 'Pose les nouvelles bases avec intention — ce que tu construis maintenant portera ton prochain cycle.',
    nuance: 'La renaissance est excitante, mais elle demande de laisser vraiment partir l\'ancien.'
  },
  'Le Sommet': {
    past: {
      title: 'Ascension maîtrisée',
      narrative: 'Tu es au pic de ton cycle actuel. Les résultats sont visibles, le pouvoir est à son maximum.',
      insight: 'Tout ce que tu as semé porte ses fruits.'
    },
    present: {
      title: 'Apogée',
      narrative: 'Les opportunités s\'alignent. C\'est le moment de la récolte stratégique.',
      insight: 'Phase d\'activation maximale.'
    },
    future: {
      title: 'Préparation du prochain cycle',
      narrative: 'Le sommet est temporaire — prépare déjà la suite.',
      insight: 'Récolte avec stratégie et prépare le cycle suivant.'
    },
    conseil: 'Récolte avec stratégie et prépare déjà le cycle suivant — le sommet est temporaire.',
    nuance: 'Au sommet, le plus grand risque est de croire qu\'il durera éternellement.'
  },
  'La Maturation': {
    past: {
      title: 'Phase de croissance',
      narrative: 'Tu entres dans une phase de sagesse et de profondeur après une expansion.',
      insight: 'L\'énergie n\'est plus explosive mais durable.'
    },
    present: {
      title: 'Influence durable',
      narrative: 'Tu passes de l\'action à l\'influence, de la croissance à la transmission.',
      insight: 'Cycle en cours.'
    },
    future: {
      title: 'Transmission',
      narrative: 'Ton impact se multiplie dans la durée.',
      insight: 'Deviens le guide que ton expérience te permet d\'être.'
    },
    conseil: 'Deviens le guide que ton expérience te permet d\'être — ton impact est maintenant multiplié.',
    nuance: 'La maturation peut sembler lente, mais elle construit ce qui dure.'
  },
  'La Tempête': {
    past: {
      title: 'Tensions latentes',
      narrative: 'Les tensions couvaient sous la surface. Les signaux étaient là.',
      insight: 'Les vieux systèmes sont testés.'
    },
    present: {
      title: 'Turbulences',
      narrative: 'Instabilité maximale. Les signaux sont contradictoires, l\'énergie est volatile.',
      insight: 'Reste centré, protège l\'essentiel.'
    },
    future: {
      title: 'Nouveau paysage',
      narrative: 'L\'éclipse approche et amplifie la rupture. Un nouveau paysage émerge.',
      insight: 'Cette intensité n\'est pas un échec — c\'est le précurseur d\'un renouveau.'
    },
    conseil: 'Reste centré, protège l\'essentiel, ne prends pas de décisions impulsives.',
    nuance: 'Cette turbulence n\'est pas un échec — c\'est souvent le précurseur d\'un nouveau paysage.'
  },
  'Le Portail': {
    past: {
      title: 'Cycle en maturité',
      narrative: 'Un cycle arrive à maturité. Tout ce qui va suivre dépend de ce que tu fais maintenant.',
      insight: 'Le passage approche.'
    },
    present: {
      title: 'Seuil critique',
      narrative: 'Tu es devant une porte temporelle majeure. Une transition de cycle approche.',
      insight: 'Prépare le passage avec intention.'
    },
    future: {
      title: 'Nouveau chapitre',
      narrative: 'Ce que tu sèmes dans le portail détermine le prochain chapitre.',
      insight: 'Les portails sont rares — ils demandent action et lâcher-prise.'
    },
    conseil: 'Prépare le passage avec intention — ce que tu sèmes dans le portail détermine le prochain chapitre.',
    nuance: 'Les portails sont rares — ils demandent à la fois action et lâcher-prise.'
  },
  "L'Endurance": {
    past: {
      title: 'Période difficile',
      narrative: 'Tu es dans une phase de persévérance après une période difficile.',
      insight: 'L\'énergie est stable mais modérée.'
    },
    present: {
      title: 'Résilience',
      narrative: 'C\'est le moment de tenir, de consolider, de prouver ta résilience.',
      insight: 'Cycle en cours.'
    },
    future: {
      title: 'Récompenses',
      narrative: 'Les récompenses arrivent souvent après la phase d\'endurance.',
      insight: 'Continue avec discipline.'
    },
    conseil: 'Continue avec discipline — les récompenses arrivent souvent après la phase d\'endurance.',
    nuance: 'L\'endurance peut sembler monotone, mais elle forge les empires durables.'
  },
  'La Moisson': {
    past: {
      title: 'Phase d\'effort',
      narrative: 'Tu récoltes les fruits de tes efforts passés. L\'énergie est porteuse.',
      insight: 'Les résultats arrivent.'
    },
    present: {
      title: 'Récolte',
      narrative: 'C\'est le moment de recueillir, d\'évaluer et de célébrer intelligemment.',
      insight: 'Phase d\'activation maximale.'
    },
    future: {
      title: 'Prochain semis',
      narrative: 'Utilise cette énergie pour semer le prochain cycle.',
      insight: 'Récolte avec gratitude mais sans complaisance.'
    },
    conseil: 'Récolte avec gratitude mais sans complaisance — utilise cette énergie pour semer le prochain cycle.',
    nuance: 'La moisson est belle, mais elle peut créer l\'illusion que tout est acquis.'
  },
  'Le Pivot': {
    past: {
      title: 'Stabilité passée',
      narrative: 'L\'ancien cycle se termine, le nouveau commence à se dessiner.',
      insight: 'Tout est en mouvement subtil mais décisif.'
    },
    present: {
      title: 'Point de bascule',
      narrative: 'Tu es au point de bascule. Les signaux de changement sont partout.',
      insight: 'Observe les signaux, ajuste ta direction.'
    },
    future: {
      title: 'Nouvelle direction',
      narrative: 'Les pivots réussis sont ceux qui sont anticipés.',
      insight: 'Le pivot peut sembler confus, mais c\'est le moment le plus important.'
    },
    conseil: 'Observe les signaux, ajuste ta direction — les pivots réussis sont ceux qui sont anticipés.',
    nuance: 'Le pivot peut sembler confus, mais c\'est souvent le moment le plus important de ton cycle.'
  },
  'La Consolidation': {
    past: {
      title: 'Phase de construction',
      narrative: 'Tu es dans une phase de renforcement. L\'énergie est stable, le travail est intérieur.',
      insight: 'C\'est le moment de solidifier ce qui existe.'
    },
    present: {
      title: 'Renforcement',
      narrative: 'Renforce tes fondations, optimise, élimine ce qui ne sert plus.',
      insight: 'Construction progressive.'
    },
    future: {
      title: 'Prochaine croissance',
      narrative: 'La consolidation est la base de la prochaine croissance.',
      insight: 'Ce travail intérieur prépare l\'expansion.'
    },
    conseil: 'Renforce tes fondations, optimise, élimine ce qui ne sert plus.',
    nuance: 'La consolidation peut sembler lente, mais elle est la base de la prochaine croissance.'
  },
  "L'Appel": {
    past: {
      title: 'Phase d\'exploration',
      narrative: 'Quelque chose de plus grand t\'appelle. L\'énergie est orientée vers l\'extérieur.',
      insight: 'Ton impact dépasse ta sphère personnelle.'
    },
    present: {
      title: 'Mission élargie',
      narrative: 'C\'est le moment où ton impact dépasse ta sphère personnelle.',
      insight: 'Construction progressive.'
    },
    future: {
      title: 'Impact amplifié',
      narrative: 'Ce qui vient maintenant est plus grand que toi.',
      insight: 'Réponds à l\'appel avec courage.'
    },
    conseil: 'Réponds à l\'appel avec courage — ce qui vient maintenant est plus grand que toi.',
    nuance: 'L\'appel est exaltant, mais il demande de lâcher certaines choses que tu croyais essentielles.'
  },
  'Le Cycle en Cours': {
    past: {
      title: 'Cycle en mouvement',
      narrative: 'Ton cycle actuel suit son cours naturel.',
      insight: 'Chaque phase a sa fonction.'
    },
    present: {
      title: 'Position intermédiaire',
      narrative: 'Tu es dans une phase de transition douce entre les grands mouvements.',
      insight: 'Cycle en cours.'
    },
    future: {
      title: 'Évolution progressive',
      narrative: 'L\'évolution se poursuit progressivement.',
      insight: 'Patience et constance sont tes alliés.'
    },
    conseil: 'Continue à avancer avec régularité — les grands changements se préparent dans les phases calmes.',
    nuance: 'Même les phases ordinaires ont leur importance dans la trajectoire globale.'
  }
};

// ─────────────────────────────────────────────
// NARRATIVE BUILDERS — Templates dynamiques (Ronde #9)
// Architecture : Gemini (builders + helpers) · Tonalité : GPT (concret, grand public)
// Règles : Passé=rétrospectif, Présent=directif, Futur=prospectif+chiffre
// ─────────────────────────────────────────────

export interface NarrativeContext {
  // Momentum (pour Passé)
  momentumTrend: 'rising' | 'falling' | 'stable' | 'volatile';
  streak: number;
  avg7: number;
  // Signal (pour Présent)
  signalScore: number;
  signalLabel: string;
  // Tendance (pour Présent)
  trendScore: number;
  py: number;
  // Forecast (pour Futur)
  goldDays30: number;
  actionWindows: number;
  bestDayLabel: string;
  bestDayScore: number;
  ciLabel: string;
  // Contexte général
  intensity: 'calm' | 'building' | 'peak' | 'releasing';
  keyMessage: string;
}

// ── Helper functions (réutilisables entre les 12 arcs) ──

function getMomentumHook(trend: string, streak: number): string {
  if (trend === 'volatile') return streak === 1 ? `Après 1 jour en dents de scie` : `Après ${streak} jours en dents de scie`;
  if (trend === 'falling') return `Malgré le ralentissement des derniers jours`;
  if (trend === 'rising') return streak === 1 ? `Porté par l'élan du dernier jour` : `Porté par l'élan des ${streak} derniers jours`;
  return streak === 1 ? `Avec la stabilité de ce dernier jour` : `Avec la stabilité de ces ${streak} derniers jours`;
}

function getScoreAction(score: number): string {
  if (score >= 80) return 'utilise cette excellente énergie pour avancer sur tes projets clés';
  if (score >= 65) return 'profite de cette journée favorable pour structurer ce qui compte';
  if (score >= 40) return 'concentre-toi sur l\'essentiel, sans forcer le rythme';
  return 'protège ton énergie, simplifie, reporte ce qui peut attendre';
}

function getTrendAction(trendScore: number): string {
  if (trendScore > 2) return 'Tes cycles personnels soutiennent le fond — structure ce qui compte.';
  if (trendScore < -2) return 'Tes cycles demandent prudence — protège l\'existant.';
  return 'Tes cycles soutiennent une progression sobre et régulière.';
}

function getForecastHook(goldDays: number, windows: number, bestDay: string, bestScore: number): string {
  if (goldDays >= 5) return `${goldDays} jours d'alignement fort arrivent, dont un pic à ${bestScore} le ${bestDay}`;
  if (windows > 0) return `une fenêtre d'action se profile dans les prochaines semaines (pic à ${bestScore} le ${bestDay})`;
  return `le terrain se prépare progressivement — le prochain pic est attendu le ${bestDay} (score ${bestScore})`;
}

function getCIHook(ciLabel: string): string {
  if (ciLabel === 'Haute' || ciLabel === 'Bonne') return 'La fiabilité est suffisamment nette pour te projeter.';
  if (ciLabel === 'Modérée') return 'L\'horizon reste mouvant — avance par étapes.';
  return 'La visibilité est faible — reste flexible et ajuste au fil des jours.';
}

type NarrativeSegment = { title: string; narrative: string; insight: string };
type NarrativeBuilder = (ctx: NarrativeContext) => { past: NarrativeSegment; present: NarrativeSegment; future: NarrativeSegment };

// ── Builders par arc ──

const NARRATIVE_BUILDERS: Record<ArcName, NarrativeBuilder> = {
  "L'Envol": (ctx) => ({
    past: {
      title: ctx.momentumTrend === 'rising' ? 'Élan confirmé' : 'Bases solides',
      narrative: `${getMomentumHook(ctx.momentumTrend, ctx.streak)}, les fondations posées récemment commencent à porter. La moyenne de ${Math.round(ctx.avg7)} témoigne d'un terrain fertile.`,
      insight: 'Les efforts passés se transforment en momentum visible.',
    },
    present: {
      title: ctx.signalScore >= 80 ? 'Décollage' : 'Impulsion',
      narrative: `Aujourd'hui (score ${ctx.signalScore}, ${ctx.signalLabel.toLowerCase()}), ${getScoreAction(ctx.signalScore)}. ${getTrendAction(ctx.trendScore)}`,
      insight: ctx.keyMessage,
    },
    future: {
      title: ctx.goldDays30 >= 5 ? 'Accélération en vue' : 'Ouverture progressive',
      narrative: `L'envol se confirme : ${getForecastHook(ctx.goldDays30, ctx.actionWindows, ctx.bestDayLabel, ctx.bestDayScore)}. ${getCIHook(ctx.ciLabel)}`,
      insight: `${ctx.goldDays30} jour${ctx.goldDays30 > 1 ? 's' : ''} porteur${ctx.goldDays30 > 1 ? 's' : ''} à venir.`,
    },
  }),

  'La Traversée': (ctx) => ({
    past: {
      title: ctx.momentumTrend === 'falling' ? 'Décélération naturelle' : 'Digestion en cours',
      narrative: `${getMomentumHook(ctx.momentumTrend, ctx.streak)}, l'énergie se retire naturellement après une phase d'expansion. La moyenne de ${Math.round(ctx.avg7)} reflète ce recalibrage.`,
      insight: 'Ce ralentissement n\'est pas un recul — c\'est une intégration.',
    },
    present: {
      title: ctx.signalScore >= 65 ? 'Tri sélectif' : 'Économie d\'énergie',
      narrative: `Aujourd'hui (score ${ctx.signalScore}), ${getScoreAction(ctx.signalScore)}. ${getTrendAction(ctx.trendScore)}`,
      insight: ctx.keyMessage,
    },
    future: {
      title: ctx.goldDays30 >= 3 ? 'Rebond en préparation' : 'Patience stratégique',
      narrative: `La traversée prépare le prochain élan : ${getForecastHook(ctx.goldDays30, ctx.actionWindows, ctx.bestDayLabel, ctx.bestDayScore)}. ${getCIHook(ctx.ciLabel)}`,
      insight: `${ctx.goldDays30} jour${ctx.goldDays30 > 1 ? 's' : ''} porteur${ctx.goldDays30 > 1 ? 's' : ''} à venir.`,
    },
  }),

  'La Renaissance': (ctx) => ({
    past: {
      title: ctx.momentumTrend === 'rising' ? 'Sortie de crise' : 'Fin de cycle',
      narrative: `${getMomentumHook(ctx.momentumTrend, ctx.streak)}, ce qui devait se transformer l'a fait. La moyenne de ${Math.round(ctx.avg7)} marque le début d'un nouveau chapitre.`,
      insight: 'L\'ancien a laissé la place — l\'énergie revient plus claire.',
    },
    present: {
      title: ctx.signalScore >= 65 ? 'Reconstruction active' : 'Premiers pas',
      narrative: `Aujourd'hui (score ${ctx.signalScore}), ${getScoreAction(ctx.signalScore)}. ${getTrendAction(ctx.trendScore)}`,
      insight: ctx.keyMessage,
    },
    future: {
      title: ctx.goldDays30 >= 5 ? 'Nouveau cycle porteur' : 'Germination',
      narrative: `Ce que tu plantes maintenant portera le prochain cycle : ${getForecastHook(ctx.goldDays30, ctx.actionWindows, ctx.bestDayLabel, ctx.bestDayScore)}. ${getCIHook(ctx.ciLabel)}`,
      insight: `${ctx.goldDays30} jour${ctx.goldDays30 > 1 ? 's' : ''} porteur${ctx.goldDays30 > 1 ? 's' : ''} à venir.`,
    },
  }),

  'Le Sommet': (ctx) => ({
    past: {
      title: ctx.momentumTrend === 'stable' ? 'Plateau atteint' : 'Ascension confirmée',
      narrative: `${getMomentumHook(ctx.momentumTrend, ctx.streak)}, tu as atteint un pic de ton cycle. La moyenne de ${Math.round(ctx.avg7)} confirme cette position haute.`,
      insight: 'Ce que tu as semé porte ses fruits visiblement.',
    },
    present: {
      title: ctx.signalScore >= 80 ? 'Récolte stratégique' : 'Maintien du cap',
      narrative: `Aujourd'hui (score ${ctx.signalScore}), ${getScoreAction(ctx.signalScore)}. ${getTrendAction(ctx.trendScore)}`,
      insight: ctx.keyMessage,
    },
    future: {
      title: ctx.goldDays30 >= 5 ? 'Prolonger l\'avantage' : 'Préparer la descente',
      narrative: `Le sommet est temporaire — anticipe la suite : ${getForecastHook(ctx.goldDays30, ctx.actionWindows, ctx.bestDayLabel, ctx.bestDayScore)}. ${getCIHook(ctx.ciLabel)}`,
      insight: `${ctx.goldDays30} jour${ctx.goldDays30 > 1 ? 's' : ''} porteur${ctx.goldDays30 > 1 ? 's' : ''} à venir.`,
    },
  }),

  'La Maturation': (ctx) => ({
    past: {
      title: ctx.momentumTrend === 'stable' ? 'Sagesse acquise' : 'Profondeur installée',
      narrative: `${getMomentumHook(ctx.momentumTrend, ctx.streak)}, l'énergie n'est plus explosive mais durable. La moyenne de ${Math.round(ctx.avg7)} reflète une profondeur tranquille.`,
      insight: 'Tu passes de l\'action brute à l\'influence durable.',
    },
    present: {
      title: ctx.signalScore >= 65 ? 'Transmission active' : 'Ancrage patient',
      narrative: `Aujourd'hui (score ${ctx.signalScore}), ${getScoreAction(ctx.signalScore)}. ${getTrendAction(ctx.trendScore)}`,
      insight: ctx.keyMessage,
    },
    future: {
      title: ctx.goldDays30 >= 3 ? 'Impact qui se multiplie' : 'Évolution lente mais sûre',
      narrative: `Ton impact se construit dans la durée : ${getForecastHook(ctx.goldDays30, ctx.actionWindows, ctx.bestDayLabel, ctx.bestDayScore)}. ${getCIHook(ctx.ciLabel)}`,
      insight: `${ctx.goldDays30} jour${ctx.goldDays30 > 1 ? 's' : ''} porteur${ctx.goldDays30 > 1 ? 's' : ''} à venir.`,
    },
  }),

  'La Tempête': (ctx) => ({
    past: {
      title: ctx.momentumTrend === 'volatile' ? 'Signaux contradictoires' : 'Tensions accumulées',
      narrative: `${getMomentumHook(ctx.momentumTrend, ctx.streak)}, les tensions sous-jacentes sont montées en surface. La moyenne de ${Math.round(ctx.avg7)} reflète cette instabilité.`,
      insight: 'Les vieux systèmes sont testés — c\'est normal.',
    },
    present: {
      title: ctx.signalScore >= 65 ? 'Tenir le cap' : 'Protéger l\'essentiel',
      narrative: `Aujourd'hui (score ${ctx.signalScore}), ${getScoreAction(ctx.signalScore)}. ${getTrendAction(ctx.trendScore)}`,
      insight: ctx.keyMessage,
    },
    future: {
      title: ctx.goldDays30 >= 3 ? 'Éclaircie en approche' : 'Patience requise',
      narrative: `Après cette phase intense, un nouveau paysage émerge : ${getForecastHook(ctx.goldDays30, ctx.actionWindows, ctx.bestDayLabel, ctx.bestDayScore)}. ${getCIHook(ctx.ciLabel)}`,
      insight: `${ctx.goldDays30} jour${ctx.goldDays30 > 1 ? 's' : ''} porteur${ctx.goldDays30 > 1 ? 's' : ''} à venir.`,
    },
  }),

  'Le Portail': (ctx) => ({
    past: {
      title: ctx.momentumTrend === 'stable' ? 'Cycle en maturité' : 'Préparation du passage',
      narrative: `${getMomentumHook(ctx.momentumTrend, ctx.streak)}, un cycle majeur arrive à son terme. La moyenne de ${Math.round(ctx.avg7)} montre cette phase de convergence.`,
      insight: 'Le passage approche — ce que tu fais maintenant a un poids décuplé.',
    },
    present: {
      title: ctx.signalScore >= 65 ? 'Semer dans le portail' : 'Lâcher pour traverser',
      narrative: `Aujourd'hui (score ${ctx.signalScore}), ${getScoreAction(ctx.signalScore)}. ${getTrendAction(ctx.trendScore)}`,
      insight: ctx.keyMessage,
    },
    future: {
      title: 'Nouveau chapitre',
      narrative: `Ce que tu sèmes dans le portail détermine la suite : ${getForecastHook(ctx.goldDays30, ctx.actionWindows, ctx.bestDayLabel, ctx.bestDayScore)}. ${getCIHook(ctx.ciLabel)}`,
      insight: `${ctx.goldDays30} jour${ctx.goldDays30 > 1 ? 's' : ''} porteur${ctx.goldDays30 > 1 ? 's' : ''} à venir.`,
    },
  }),

  "L'Endurance": (ctx) => ({
    past: {
      title: ctx.momentumTrend === 'stable' ? 'Résistance tranquille' : 'Traversée de zone difficile',
      narrative: `${getMomentumHook(ctx.momentumTrend, ctx.streak)}, la persévérance a été ton allié. La moyenne de ${Math.round(ctx.avg7)} témoigne de cette régularité discrète.`,
      insight: 'L\'énergie est modérée mais constante — c\'est une force.',
    },
    present: {
      title: ctx.signalScore >= 65 ? 'Discipline récompensée' : 'Tenir la ligne',
      narrative: `Aujourd'hui (score ${ctx.signalScore}), ${getScoreAction(ctx.signalScore)}. ${getTrendAction(ctx.trendScore)}`,
      insight: ctx.keyMessage,
    },
    future: {
      title: ctx.goldDays30 >= 3 ? 'Récompense en approche' : 'Chaque pas compte',
      narrative: `Les récompenses arrivent souvent après l'endurance : ${getForecastHook(ctx.goldDays30, ctx.actionWindows, ctx.bestDayLabel, ctx.bestDayScore)}. ${getCIHook(ctx.ciLabel)}`,
      insight: `${ctx.goldDays30} jour${ctx.goldDays30 > 1 ? 's' : ''} porteur${ctx.goldDays30 > 1 ? 's' : ''} à venir.`,
    },
  }),

  'La Moisson': (ctx) => ({
    past: {
      title: ctx.momentumTrend === 'rising' ? 'Effort qui porte' : 'Graines levées',
      narrative: `${getMomentumHook(ctx.momentumTrend, ctx.streak)}, les graines semées récemment commencent à lever. La moyenne de ${Math.round(ctx.avg7)} confirme cette énergie porteuse.`,
      insight: 'Les résultats arrivent — pas par chance, par construction.',
    },
    present: {
      title: ctx.signalScore >= 80 ? 'Cueillir les fruits' : 'Célébrer avec lucidité',
      narrative: `Aujourd'hui (score ${ctx.signalScore}), ${getScoreAction(ctx.signalScore)}. ${getTrendAction(ctx.trendScore)}`,
      insight: ctx.keyMessage,
    },
    future: {
      title: ctx.goldDays30 >= 5 ? 'Abondance prolongée' : 'Préparer le prochain semis',
      narrative: `Utilise cette énergie pour semer la suite : ${getForecastHook(ctx.goldDays30, ctx.actionWindows, ctx.bestDayLabel, ctx.bestDayScore)}. ${getCIHook(ctx.ciLabel)}`,
      insight: `${ctx.goldDays30} jour${ctx.goldDays30 > 1 ? 's' : ''} porteur${ctx.goldDays30 > 1 ? 's' : ''} à venir.`,
    },
  }),

  'Le Pivot': (ctx) => ({
    past: {
      title: ctx.momentumTrend === 'volatile' ? 'Signaux de changement' : 'Fin d\'un cycle',
      narrative: `${getMomentumHook(ctx.momentumTrend, ctx.streak)}, les signaux de changement se sont multipliés. La moyenne de ${Math.round(ctx.avg7)} montre un système en mouvement.`,
      insight: 'L\'ancien cycle s\'achève — le nouveau commence à se dessiner.',
    },
    present: {
      title: ctx.signalScore >= 65 ? 'Ajuster le cap' : 'Observer avant d\'agir',
      narrative: `Aujourd'hui (score ${ctx.signalScore}), ${getScoreAction(ctx.signalScore)}. ${getTrendAction(ctx.trendScore)}`,
      insight: ctx.keyMessage,
    },
    future: {
      title: ctx.goldDays30 >= 3 ? 'Nouvelle direction confirmée' : 'Direction en formation',
      narrative: `Les pivots réussis sont ceux qui sont anticipés : ${getForecastHook(ctx.goldDays30, ctx.actionWindows, ctx.bestDayLabel, ctx.bestDayScore)}. ${getCIHook(ctx.ciLabel)}`,
      insight: `${ctx.goldDays30} jour${ctx.goldDays30 > 1 ? 's' : ''} porteur${ctx.goldDays30 > 1 ? 's' : ''} à venir.`,
    },
  }),

  'La Consolidation': (ctx) => ({
    past: {
      title: ctx.momentumTrend === 'stable' ? 'Stabilisation utile' : ctx.momentumTrend === 'falling' ? 'Ralentissement structurant' : 'Base en formation',
      narrative: `${getMomentumHook(ctx.momentumTrend, ctx.streak)}, le rythme s'est posé autour d'une moyenne de ${Math.round(ctx.avg7)}. Ce passé récent parle moins d'expansion que de mise en ordre.`,
      insight: 'Ce qui s\'est densifié récemment devient ton point d\'appui d\'aujourd\'hui.',
    },
    present: {
      title: ctx.signalScore >= 75 ? 'Renforcer sans disperser' : ctx.signalScore >= 55 ? 'Cadrer l\'essentiel' : 'Tenir la structure',
      narrative: `Aujourd'hui (score ${ctx.signalScore}, ${ctx.signalLabel.toLowerCase()}), ${getScoreAction(ctx.signalScore)}. ${getTrendAction(ctx.trendScore)}`,
      insight: ctx.keyMessage,
    },
    future: {
      title: ctx.goldDays30 >= 6 ? 'Ouverture préparée' : ctx.actionWindows >= 1 ? 'Fenêtre en approche' : 'Croissance sous condition',
      narrative: `Ce travail de fond prépare la suite : ${getForecastHook(ctx.goldDays30, ctx.actionWindows, ctx.bestDayLabel, ctx.bestDayScore)}. ${getCIHook(ctx.ciLabel)}`,
      insight: `${ctx.goldDays30} jour${ctx.goldDays30 > 1 ? 's' : ''} porteur${ctx.goldDays30 > 1 ? 's' : ''} à venir.`,
    },
  }),

  "L'Appel": (ctx) => ({
    past: {
      title: ctx.momentumTrend === 'rising' ? 'Énergie tournée vers l\'extérieur' : 'Appel ressenti',
      narrative: `${getMomentumHook(ctx.momentumTrend, ctx.streak)}, quelque chose de plus grand s'est mis en mouvement. La moyenne de ${Math.round(ctx.avg7)} confirme cette dynamique d'ouverture.`,
      insight: 'Ton impact commence à dépasser ta sphère personnelle.',
    },
    present: {
      title: ctx.signalScore >= 75 ? 'Mission élargie' : 'Écouter le signal',
      narrative: `Aujourd'hui (score ${ctx.signalScore}), ${getScoreAction(ctx.signalScore)}. ${getTrendAction(ctx.trendScore)}`,
      insight: ctx.keyMessage,
    },
    future: {
      title: ctx.goldDays30 >= 5 ? 'Réponse amplifiée' : 'Clarification progressive',
      narrative: `Ce qui vient maintenant est plus grand que toi : ${getForecastHook(ctx.goldDays30, ctx.actionWindows, ctx.bestDayLabel, ctx.bestDayScore)}. ${getCIHook(ctx.ciLabel)}`,
      insight: `${ctx.goldDays30} jour${ctx.goldDays30 > 1 ? 's' : ''} porteur${ctx.goldDays30 > 1 ? 's' : ''} à venir.`,
    },
  }),

  'Le Cycle en Cours': (ctx) => ({
    past: {
      title: ctx.momentumTrend === 'stable' ? 'Rythme installé' : 'Mouvement ordinaire',
      narrative: `${getMomentumHook(ctx.momentumTrend, ctx.streak)}, ta trajectoire suit son cours naturel. La moyenne de ${Math.round(ctx.avg7)} reflète cette progression régulière.`,
      insight: 'Chaque phase a sa fonction — même les plus calmes.',
    },
    present: {
      title: ctx.signalScore >= 65 ? 'Avancer avec régularité' : 'Patience active',
      narrative: `Aujourd'hui (score ${ctx.signalScore}), ${getScoreAction(ctx.signalScore)}. ${getTrendAction(ctx.trendScore)}`,
      insight: ctx.keyMessage,
    },
    future: {
      title: ctx.goldDays30 >= 3 ? 'Accélération à venir' : 'Constance payante',
      narrative: `L'évolution se poursuit : ${getForecastHook(ctx.goldDays30, ctx.actionWindows, ctx.bestDayLabel, ctx.bestDayScore)}. ${getCIHook(ctx.ciLabel)}`,
      insight: `${ctx.goldDays30} jour${ctx.goldDays30 > 1 ? 's' : ''} porteur${ctx.goldDays30 > 1 ? 's' : ''} à venir.`,
    },
  }),
};

/** Construit le NarrativeContext à partir des données existantes */
export function buildNarrativeContext(
  momentum: MomentumResult,
  present: PresentContext,
  forecast: ForecastResult,
  signalScore: number,
  signalLabel: string,
  trendScore: number,
  ciLabel: string,
): NarrativeContext {
  const fmtDate = (d: Date): string =>
    d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

  return {
    momentumTrend: momentum.trend,
    streak: momentum.streak,
    avg7: momentum.avgLast7,
    signalScore,
    signalLabel,
    trendScore,
    py: present.cyclePosition.personalYear.number,
    goldDays30: forecast.next30.goldDays,
    actionWindows: forecast.windows.length,
    bestDayLabel: fmtDate(forecast.next7.best.date),
    bestDayScore: Math.round(forecast.next7.best.score),
    ciLabel,
    intensity: present.intensity,
    keyMessage: present.keyMessage,
  };
}

// ─────────────────────────────────────────────
// CONSTANTES — POSITIONS DANS LE PINNACLE (12 textes)
// Source : Grok R7
// ─────────────────────────────────────────────

export const PINNACLE_POSITION_TEXTS: Record<string, { title: string; narrative: string; conseil: string }> = {
  // Pinnacle 1 — Formation
  '1_early': {
    title: 'L\'Aube de la Formation',
    narrative: 'Tu es au début de ton apprentissage. Tout est possible, mais rien n\'est encore solide. Construis les bases avec patience.',
    conseil: 'Expérimente, apprends, ne cherche pas encore la perfection.'
  },
  '1_middle': {
    title: 'Le Cœur de la Formation',
    narrative: 'Tu es au cœur de ta formation. Les leçons s\'accumulent, les erreurs t\'enseignent. Tu commences à voir le schéma.',
    conseil: 'Note tout, réfléchis, transforme chaque échec en compétence.'
  },
  '1_late': {
    title: 'La Fin de la Formation',
    narrative: 'Tu approches de la fin de ta formation. Tu sais maintenant ce que tu ne veux plus. Le passage vers le pouvoir approche.',
    conseil: 'Prépare le saut — lâche ce qui ne te sert plus.'
  },
  // Pinnacle 2 — Pouvoir
  '2_early': {
    title: 'L\'Aube du Pouvoir',
    narrative: 'Tu entres dans l\'énergie du pouvoir. Les opportunités s\'ouvrent, mais la responsabilité augmente.',
    conseil: 'Prends ta place, affirme ton autorité avec intégrité.'
  },
  '2_middle': {
    title: 'Le Cœur du Pouvoir',
    narrative: 'Tu es au cœur de ton pouvoir. Les résultats arrivent, l\'influence grandit. C\'est le moment de consolider.',
    conseil: 'Délègue, structure, protège ton énergie.'
  },
  '2_late': {
    title: 'Le Sommet du Pouvoir',
    narrative: 'Tu approches du sommet de ton pouvoir. Le cycle touche à sa fin — prépare le passage vers la maîtrise.',
    conseil: 'Transmets, forme les autres, prépare ton héritage.'
  },
  // Pinnacle 3 — Maîtrise
  '3_early': {
    title: 'L\'Aube de la Maîtrise',
    narrative: 'Tu entres dans la phase de maîtrise. L\'expérience accumulée devient sagesse opérationnelle.',
    conseil: 'Affine, optimise, deviens la référence dans ton domaine.'
  },
  '3_middle': {
    title: 'Le Cœur de la Maîtrise',
    narrative: 'Tu es au cœur de ta maîtrise. Ton influence est reconnue, ton système fonctionne.',
    conseil: 'Innove à partir de ce qui marche déjà — ne réinvente pas la roue.'
  },
  '3_late': {
    title: 'La Transmission',
    narrative: 'Tu approches de la fin de ta maîtrise. Le moment de transmettre et de passer à un rôle plus large arrive.',
    conseil: 'Prépare la relève, pense legacy.'
  },
  // Pinnacle 4 — Sagesse
  '4_early': {
    title: 'L\'Aube de la Sagesse',
    narrative: 'Tu entres dans la phase de sagesse. L\'énergie n\'est plus dans la conquête mais dans l\'impact durable.',
    conseil: 'Deviens le guide, le mentor, l\'architecte de systèmes plus grands.'
  },
  '4_middle': {
    title: 'Le Cœur de la Sagesse',
    narrative: 'Tu es au cœur de ta sagesse. Ton expérience est ton capital le plus précieux.',
    conseil: 'Transmets, conseille, construis pour les générations suivantes.'
  },
  '4_late': {
    title: 'La Culmination',
    narrative: 'Tu approches de la culmination de ta sagesse. Ton héritage se dessine clairement.',
    conseil: 'Lâche avec sérénité, célèbre ce que tu as construit.'
  }
};

// ─────────────────────────────────────────────
// CONSTANTES — PY NARRATIF (9 × 4 phases)
// Source : Grok R7
// ─────────────────────────────────────────────

export const PY_NARRATIVES: Record<number, {
  debut: string; milieu: string; fin: string; transition: string;
}> = {
  1: {
    debut: 'L\'énergie est neuve. Tout est possible. Pose tes intentions avec clarté — ce que tu commences maintenant portera les 9 années à venir.',
    milieu: 'Le mouvement est lancé. Avance avec audace, mais garde les yeux sur le long terme.',
    fin: 'Le premier cycle est presque terminé. Évalue, ajuste, prépare le terrain pour l\'année 2.',
    transition: 'L\'année 1 touche à sa fin. Ce que tu as semé va maintenant germer — prépare-toi à l\'action.'
  },
  2: {
    debut: 'L\'énergie est réceptive. Cherche les bonnes alliances, écoute, harmonise.',
    milieu: 'Les relations se tissent. Investis dans la confiance et la coopération.',
    fin: 'Les partenariats se consolident. Évalue qui reste et qui doit partir.',
    transition: 'L\'année 2 se termine. Les alliances formées ici seront tes fondations pour l\'année 3.'
  },
  3: {
    debut: 'L\'énergie est expressive. Exprime-toi, sois visible, crée.',
    milieu: 'L\'inspiration coule. Capture tout, teste, partage.',
    fin: 'La créativité atteint son pic. Choisis ce que tu veux garder pour le long terme.',
    transition: 'L\'année 3 se termine. Ce que tu as créé maintenant doit être structuré.'
  },
  4: {
    debut: 'L\'énergie est de construction. Organise, planifie, pose les fondations.',
    milieu: 'Le travail est concret. Avance pas à pas, avec discipline.',
    fin: 'La structure est solide. Vérifie les failles avant de passer à l\'année 5.',
    transition: 'L\'année 4 se termine. Ce que tu as construit doit maintenant respirer.'
  },
  5: {
    debut: 'L\'énergie est de mouvement. Lâche ce qui ne sert plus, explore.',
    milieu: 'Le changement est en cours. Reste agile, adapte-toi.',
    fin: 'Le mouvement ralentit. Choisis ce que tu gardes pour le prochain cycle.',
    transition: 'L\'année 5 se termine. Le chaos a fait son travail — prépare la stabilité.'
  },
  6: {
    debut: 'L\'énergie est d\'harmonie. Renforce les relations, équilibre tes engagements.',
    milieu: 'L\'harmonie se construit. Donne, reçois, ajuste.',
    fin: 'L\'harmonie est établie. Protège ce que tu as construit.',
    transition: 'L\'année 6 se termine. L\'équilibre atteint doit maintenant être protégé.'
  },
  7: {
    debut: 'L\'énergie est intérieure. Ralentis, analyse, cherche la vérité.',
    milieu: 'L\'introspection est profonde. Les réponses arrivent dans le silence.',
    fin: 'La clarté émerge. Prépare-toi à partager ce que tu as compris.',
    transition: 'L\'année 7 se termine. La sagesse acquise doit maintenant être appliquée.'
  },
  8: {
    debut: 'L\'énergie est de pouvoir. Les efforts passés paient. Négocie, finalise, encaisse.',
    milieu: 'Le pouvoir est à son maximum. Utilise-le avec responsabilité.',
    fin: 'La récolte est là. Prépare le lâcher-prise de l\'année 9.',
    transition: 'L\'année 8 se termine. Ce que tu as construit doit maintenant être transmis.'
  },
  9: {
    debut: 'L\'énergie est de fin de cycle. Termine, lâche, nettoie.',
    milieu: 'Le lâcher-prise est profond. Ce qui doit partir partira.',
    fin: 'Le cycle est presque terminé. Prépare-toi au nouveau départ.',
    transition: 'L\'année 9 se termine. Le vide créé laisse place à la renaissance.'
  }
};

// ─────────────────────────────────────────────
// CONSTANTES — MOMENTUM NARRATIF (8 textes)
// Source : Grok R7
// ─────────────────────────────────────────────

export const MOMENTUM_NARRATIVES: Record<string, { descriptif: string; conseil: string }> = {
  'rising_short': {
    descriptif: 'La tendance est à la hausse depuis quelques jours. L\'énergie monte doucement.',
    conseil: 'Accélère légèrement tes projets prioritaires.'
  },
  'rising_long': {
    descriptif: 'Le momentum est établi. L\'énergie monte depuis plusieurs jours consécutifs — le vent est clairement dans ton dos.',
    conseil: 'Pousse tes initiatives les plus importantes maintenant.'
  },
  'falling_short': {
    descriptif: 'La tendance commence à baisser. L\'énergie se retire doucement.',
    conseil: 'Révise, protège, ne lance rien de nouveau.'
  },
  'falling_long': {
    descriptif: 'La tendance est clairement à la baisse. L\'énergie se retire depuis plusieurs jours.',
    conseil: 'Réduis la charge, prépare le prochain cycle.'
  },
  'stable_high': {
    descriptif: 'L\'énergie est stable et élevée. Tu es sur un plateau performant.',
    conseil: 'Optimise et structure ce qui fonctionne déjà.'
  },
  'stable_low': {
    descriptif: 'L\'énergie est stable mais basse. Tu es sur un plateau de récupération.',
    conseil: 'Travaille en mode maintenance, pas en mode croissance.'
  },
  'volatile_high': {
    descriptif: 'L\'énergie est volatile mais élevée. Les pics et les creux se succèdent rapidement.',
    conseil: 'Capture les idées pendant les pics, structure pendant les creux.'
  },
  'volatile_low': {
    descriptif: 'L\'énergie est volatile et basse. Les fluctuations sont difficiles à gérer.',
    conseil: 'Reste centré, protège ton énergie, évite les engagements majeurs.'
  }
};

// ─────────────────────────────────────────────
// CONSTANTES — FORECAST NARRATIF (6 textes)
// Source : Grok R7
// ─────────────────────────────────────────────

export const FORECAST_NARRATIVES: Record<string, { narratif: string; conseil: string }> = {
  'radieux': {
    narratif: 'Les prochains jours et semaines montrent une tendance clairement ascendante. Plusieurs fenêtres Gold s\'alignent, l\'énergie porteuse est là.',
    conseil: 'Avance avec confiance sur tes projets prioritaires.'
  },
  'difficile': {
    narratif: 'Les prochaines semaines sont marquées par des signaux de tension et de ralentissement. Des rétrogrades ou des éclipses approchent.',
    conseil: 'Consolide, révise, protège tes acquis — le lancement viendra plus tard.'
  },
  'mixte': {
    narratif: 'Les prochaines semaines sont contrastées. Il y a des jours ordinaires, mais aussi une ou deux fenêtres exceptionnelles.',
    conseil: 'Identifie les jours d\'Or et concentre ton action sur ces moments.'
  },
  'transition': {
    narratif: 'Tu approches d\'un portail temporel important — un changement d\'année personnelle ou de grande phase de vie est proche.',
    conseil: 'Prépare le passage avec intention — ce que tu sèmes ici détermine ce qui pousse après.'
  },
  'eclipse': {
    narratif: 'Une éclipse arrive dans les prochains jours. L\'énergie est amplifiée, les émotions sont fortes, les événements sont accélérés.',
    conseil: 'Observe, ne force rien — les éclipses montrent ce qui doit changer.'
  },
  'accalmie': {
    narratif: 'Les prochaines semaines sont stables et calmes. Peu de variance, peu d\'événements majeurs.',
    conseil: 'Utilise ce calme pour structurer, optimiser et préparer le prochain cycle.'
  }
};

// ─────────────────────────────────────────────
// CONSTANTES — ÉCLIPSES CONTEXTUELLES (6 textes)
// Source : Grok R9
// ─────────────────────────────────────────────

export const ECLIPSE_CONTEXTS: Record<string, { narratif: string; conseil: string }> = {
  'solaire_avant': {
    narratif: 'L\'identité et la direction de vie sont en question. Des signaux subtils indiquent que certaines parties de ton chemin ne sont plus alignées.',
    conseil: 'Observe sans agir — les révélations arrivent d\'elles-mêmes.'
  },
  'solaire_pendant': {
    narratif: 'L\'impact est maximal sur ton identité et ta trajectoire. Des événements ou des insights soudains clarifient ce que tu dois lâcher ou embrasser.',
    conseil: 'Reste ouvert — ce qui se révèle aujourd\'hui redéfinit ton prochain chapitre.'
  },
  'solaire_apres': {
    narratif: 'L\'intégration commence. La nouvelle direction est claire, mais elle demande encore du temps pour s\'ancrer.',
    conseil: 'Agis avec calme — les premiers pas après une éclipse sont les plus importants.'
  },
  'lunaire_avant': {
    narratif: 'Les émotions et les relations sont en mouvement. Des tensions cachées remontent à la surface pour être vues.',
    conseil: 'Accueille les émotions sans les juger — elles sont des messagères.'
  },
  'lunaire_pendant': {
    narratif: 'L\'impact est maximal sur tes besoins émotionnels et tes connexions. Des révélations soudaines changent la façon dont tu te relies aux autres.',
    conseil: 'Écoute ce qui émerge — c\'est souvent la vérité que tu évitais.'
  },
  'lunaire_apres': {
    narratif: 'L\'intégration émotionnelle commence. La clarté sur tes besoins profonds s\'installe.',
    conseil: 'Ajuste tes relations et tes engagements en fonction de ce qui a été révélé.'
  }
};

// ─────────────────────────────────────────────
// CONSTANTES — TRANSITIONS PY→PY+1 (9 portails)
// Source : Grok R9
// ─────────────────────────────────────────────

export const PY_TRANSITIONS: Record<string, { finir: string; preparer: string; risque: string }> = {
  '1_2': {
    finir: 'Termine les intentions posées en début d\'année — clarifie ce que tu veux vraiment porter.',
    preparer: 'Prépare les premières alliances — les partenariats de l\'année 2 se construisent maintenant.',
    risque: 'Rester dans l\'énergie du début sans passer à la coopération te fait perdre le momentum.'
  },
  '2_3': {
    finir: 'Solidifie les relations formées — identifie qui reste et qui doit partir.',
    preparer: 'Prépare l\'expression — l\'année 3 demande que tu sois visible.',
    risque: 'Rester dans la recherche d\'harmonie sans passer à l\'expression te fait manquer ton moment de visibilité.'
  },
  '3_4': {
    finir: 'Capture et structure tes idées créatives — transforme l\'inspiration en plans concrets.',
    preparer: 'Prépare les fondations — l\'année 4 exige de la discipline.',
    risque: 'Rester dans la créativité sans passer à la structure te fait perdre tes idées en route.'
  },
  '4_5': {
    finir: 'Solidifie les structures construites — vérifie ce qui tient vraiment.',
    preparer: 'Prépare le mouvement — l\'année 5 exige de lâcher ce qui est trop rigide.',
    risque: 'Rester dans la structure sans passer au changement te fait stagner.'
  },
  '5_6': {
    finir: 'Complète les changements initiés — lâche ce qui ne sert plus.',
    preparer: 'Prépare l\'harmonie — l\'année 6 exige des relations équilibrées.',
    risque: 'Rester dans le mouvement sans passer à l\'harmonie te fait perdre tes alliances.'
  },
  '6_7': {
    finir: 'Équilibre les engagements relationnels — clarifie tes priorités.',
    preparer: 'Prépare l\'introspection — l\'année 7 exige du recul.',
    risque: 'Rester dans l\'harmonie sans passer à l\'introspection te fait manquer la profondeur.'
  },
  '7_8': {
    finir: 'Intègre les insights trouvés — transforme la réflexion en savoir actionnable.',
    preparer: 'Prépare le pouvoir — l\'année 8 exige de la maîtrise.',
    risque: 'Rester dans l\'introspection sans passer au pouvoir te fait manquer ton moment de récolte.'
  },
  '8_9': {
    finir: 'Récolte les fruits du pouvoir — finalise, encaisse, structure les résultats.',
    preparer: 'Prépare le lâcher-prise — l\'année 9 exige de tout compléter.',
    risque: 'Rester dans le pouvoir sans passer à la clôture te fait porter des choses mortes.'
  },
  '9_1': {
    finir: 'Complète les cycles ouverts — lâche ce qui doit partir.',
    preparer: 'Prépare le nouveau départ — clarifie ta vision pour les 9 années à venir.',
    risque: 'Rester dans la clôture sans passer au nouveau départ te fait rater ta renaissance.'
  }
};

// ─────────────────────────────────────────────
// CONSTANTES — COMBINAISONS RARES "WOW MOMENTS" (8)
// Source : Grok R9
// ─────────────────────────────────────────────

export const WOW_MOMENTS: Record<string, {
  titre: string;
  signification: string;
  conseil: string;
}> = {
  'alignement_total': {
    titre: 'Alignement Total',
    signification: 'Triple pic biorhythmique + Yi King très favorable + Jour personnel 1 crée une rareté exceptionnelle où énergie physique, émotionnelle, intellectuelle, symbolique et numérologique sont toutes au maximum simultanément.',
    conseil: 'Utilise cette journée pour lancer ou décider ce qui compte vraiment — l\'univers est aligné avec toi.'
  },
  'portail_puissance': {
    titre: 'Portail de Puissance',
    signification: 'Convergence rare (≥86) qui tombe le jour d\'une éclipse crée un portail où les cycles de vie et l\'énergie du jour convergent.',
    conseil: 'Observe ce qui se révèle — les décisions prises aujourd\'hui ont un poids de vie exceptionnel.'
  },
  'grand_depart': {
    titre: 'Le Grand Départ',
    signification: 'Mercure direct après rétrograde + Lune Nouvelle + Année personnelle 1 mois 1 crée un triple nouveau départ cosmique.',
    conseil: 'Lance ce que tu repousses depuis longtemps — le moment est exceptionnellement favorable.'
  },
  'super_convergence': {
    titre: 'Super Convergence Historique',
    signification: '6+ systèmes positifs simultanément est statistiquement très rare et indique un moment où l\'univers soutient clairement ton chemin.',
    conseil: 'Avance sur tes projets les plus ambitieux — ce genre d\'alignement ne revient pas souvent.'
  },
  'createur_maitre': {
    titre: 'Le Créateur Maître',
    signification: 'Hexagramme #1 (Le Créateur) + Jour personnel maître 11 ou 22 crée un double maître créateur extrêmement rare.',
    conseil: 'Utilise cette journée pour initier ce qui te semble trop grand — ton pouvoir créateur est amplifié.'
  },
  'appel_destin': {
    titre: 'L\'Appel du Destin',
    signification: 'Nœud Nord exact (conjonction) + Jupiter transit favorable crée un appel de vie clair.',
    conseil: 'Écoute les opportunités qui arrivent aujourd\'hui — elles sont souvent liées à ta mission d\'âme.'
  },
  'oeil_cyclone': {
    titre: 'L\'Œil du Cyclone',
    signification: 'Score exactement 50 avec volatilité maximale crée un moment de calme paradoxal au milieu du chaos.',
    conseil: 'Utilise ce calme apparent pour prendre des décisions stratégiques — la clarté est maximale.'
  },
  'vague_or': {
    titre: 'La Vague d\'Or',
    signification: '3 jours d\'Or consécutifs est une série extrêmement rare qui indique un momentum exceptionnel.',
    conseil: 'Surfe la vague — les décisions prises pendant ces 3 jours ont un effet multiplicateur.'
  }
};

// ─────────────────────────────────────────────
// CONSTANTES — NUCLEAR HEXAGRAM INTERPRÉTATIONS (25)
// Source : Grok R9
// ─────────────────────────────────────────────

export const NUCLEAR_INTERPRETATIONS: Record<string, { interpretation: string; conseil: string }> = {
  'A_A': { interpretation: 'Alignement total entre surface et fond. Ce que tu montres est exactement ce que tu es.', conseil: 'Avance sans retenue — cette cohérence est rare et puissante.' },
  'A_B': { interpretation: 'Succès visible soutenu par une base solide. L\'apparence et la substance sont alignées.', conseil: 'Capitalise sur cette force double pour des projets à long terme.' },
  'A_C': { interpretation: 'Succès clair mais sur une base neutre. Le résultat est là, la profondeur reste à construire.', conseil: 'Utilise ce moment pour renforcer les fondations avant la prochaine phase.' },
  'A_D': { interpretation: 'Succès apparent qui masque des tensions internes. La victoire est réelle mais fragile.', conseil: 'Renforce discrètement les points faibles pendant que tout va bien.' },
  'A_E': { interpretation: 'Succès visible construit sur des fondations fragiles. La victoire est temporaire.', conseil: 'Prépare la suite immédiatement — ce qui monte vite peut redescendre aussi vite.' },
  'B_A': { interpretation: 'Progression stable soutenue par une force intérieure puissante.', conseil: 'Utilise cette stabilité pour des projets ambitieux sur plusieurs années.' },
  'B_B': { interpretation: 'Cohérence interne et externe. Tout est aligné et durable.', conseil: 'Construis méthodiquement — ce socle est fait pour durer.' },
  'B_C': { interpretation: 'Bonne dynamique sur une base neutre. Le mouvement est sain.', conseil: 'Accélère légèrement sans forcer — le rythme est juste.' },
  'B_D': { interpretation: 'Bon potentiel qui cache encore des fragilités internes.', conseil: 'Travaille en parallèle sur les fondations pendant que la surface avance.' },
  'B_E': { interpretation: 'Progrès visible qui masque une instabilité profonde.', conseil: 'Ne te fie pas uniquement aux résultats extérieurs — regarde sous la surface.' },
  'C_A': { interpretation: 'Situation neutre qui cache un potentiel exceptionnel en profondeur.', conseil: 'Creuse — la vraie valeur est sous la surface.' },
  'C_B': { interpretation: 'Équilibre stable soutenu par une base solide.', conseil: 'Profite de cette stabilité pour consolider avant la prochaine phase.' },
  'C_C': { interpretation: 'Neutralité complète — ni gain ni perte visible.', conseil: 'Utilise ce calme pour préparer le prochain mouvement stratégique.' },
  'C_D': { interpretation: 'Situation neutre qui cache des tensions latentes.', conseil: 'Reste vigilant — les problèmes ne sont pas visibles mais ils existent.' },
  'C_E': { interpretation: 'Neutralité fragile qui masque des tensions sous-jacentes.', conseil: 'Anticipe — la surface calme cache parfois des ajustements à venir.' },
  'D_A': { interpretation: 'Blocage visible qui cache un potentiel exceptionnel.', conseil: 'Regarde au-delà du blocage — la vraie opportunité est derrière.' },
  'D_B': { interpretation: 'Frein externe mais stabilité interne forte.', conseil: 'Utilise ta solidité intérieure pour surmonter le frein extérieur.' },
  'D_C': { interpretation: 'Blocage cohérent avec le contexte actuel.', conseil: 'Accepte le ralentissement — il est justifié par la situation.' },
  'D_D': { interpretation: 'Double difficulté modérée — rien n\'est facile.', conseil: 'Avance pas à pas — la constance est ta meilleure arme.' },
  'D_E': { interpretation: 'Blocage avec risque structurel profond.', conseil: 'Arrête de forcer — restructure d\'abord avant de relancer.' },
  'E_A': { interpretation: 'Crise apparente qui cache un potentiel intérieur énorme.', conseil: 'La crise est le révélateur — regarde à l\'intérieur pour trouver la sortie.' },
  'E_B': { interpretation: 'Fragilité visible compensée par une base intérieure solide.', conseil: 'Appuie-toi sur ta force intérieure pour traverser la crise.' },
  'E_C': { interpretation: 'Déséquilibre général sans direction claire.', conseil: 'Reviens au centre — la neutralité est temporairement ton meilleur refuge.' },
  'E_D': { interpretation: 'Crise aggravée par des tensions supplémentaires.', conseil: 'Réduis la charge — protège l\'essentiel avant tout.' },
  'E_E': { interpretation: 'Crise à tous les niveaux — tout est testé.', conseil: 'Reste centré — c\'est souvent le moment où les plus grands changements se préparent.' }
};

// ─────────────────────────────────────────────
// UTILITAIRES
// ─────────────────────────────────────────────

function daysBetween(a: Date, b: Date): number {
  return Math.ceil((b.getTime() - a.getTime()) / 86400000);
}

function stdDev(arr: number[]): number {
  if (!arr.length) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

// ─────────────────────────────────────────────
// 1️⃣ MOMENTUM ENGINE
// Source : GPT R7
// N'influence PAS le score quotidien.
// ─────────────────────────────────────────────

/**
 * Calcule le momentum (tendance 7 derniers jours).
 * @param getScore - fonction qui retourne le score liteMode pour une date
 * @param today - date du jour
 */
export function calcMomentum(
  getScore: (date: Date) => number,
  today: Date
): MomentumResult {
  const scores: number[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    scores.push(getScore(d));
  }

  const todayScore = scores[6];
  const avgLast7 = scores.reduce((a, b) => a + b, 0) / 7;
  const delta = todayScore - avgLast7;
  const sd = stdDev(scores);

  // Trend detection : 3 derniers jours
  let risingCount = 0;
  let fallingCount = 0;
  for (let i = 4; i <= 6; i++) {
    if (scores[i] > scores[i - 1]) risingCount++;
    if (scores[i] < scores[i - 1]) fallingCount++;
  }

  let trend: MomentumResult['trend'] = 'stable';
  if (sd > 15) trend = 'volatile';
  else if (risingCount >= 3) trend = 'rising';
  else if (fallingCount >= 3) trend = 'falling';

  // Streak : jours consécutifs au-dessus/dessous de 50
  let streak = 0;
  let streakType: MomentumResult['streakType'] = 'none';
  for (let i = 6; i >= 0; i--) {
    if (scores[i] >= 50) {
      if (streakType === 'negative') break;
      streakType = 'positive';
      streak++;
    } else {
      if (streakType === 'positive') break;
      streakType = 'negative';
      streak++;
    }
  }

  const streakImpact =
    streakType === 'positive' ? streak * 0.3 :
    streakType === 'negative' ? -streak * 0.3 : 0;

  const momentum = Math.max(-10, Math.min(10,
    (todayScore - avgLast7) * 0.5 + streakImpact
  ));

  return { trend, scores, avgLast7, delta, streak, streakType, momentum };
}

/**
 * Retourne la clé narrative du momentum.
 */
export function getMomentumNarrativeKey(momentum: MomentumResult): string {
  const { trend, streak, avgLast7 } = momentum;

  if (trend === 'rising') return streak >= 3 ? 'rising_long' : 'rising_short';
  if (trend === 'falling') return streak >= 3 ? 'falling_long' : 'falling_short';
  if (trend === 'stable') return avgLast7 >= 65 ? 'stable_high' : 'stable_low';
  // volatile
  return avgLast7 >= 50 ? 'volatile_high' : 'volatile_low';
}

// ─────────────────────────────────────────────
// 2️⃣ FORECAST ENGINE
// Source : GPT R8
// ─────────────────────────────────────────────

/**
 * Trouve la prochaine rétrograde planétaire.
 */
export function findNextRetrograde(
  today: Date,
  retroPeriods: RetroPeriod[]
): NextRetrograde | null {
  for (const r of retroPeriods) {
    const start = new Date(r.start);
    const end = new Date(r.end);

    // Si on est DANS une rétro → retourne la fin
    if (today >= start && today <= end) {
      return {
        planet: r.planet,
        startDate: start,
        endDate: end,
        daysUntil: daysBetween(today, end),
        type: 'retro_end'
      };
    }

    // Prochaine rétro à venir
    if (start > today) {
      return {
        planet: r.planet,
        startDate: start,
        endDate: end,
        daysUntil: daysBetween(today, start),
        type: 'retro_start'
      };
    }
  }

  return null;
}

/**
 * Trouve la prochaine éclipse.
 */
export function findNextEclipse(
  today: Date,
  eclipses: EclipseInfo[]
): NextEclipse | null {
  for (const e of eclipses) {
    const d = new Date(e.date);
    if (d > today) {
      return {
        date: d,
        type: e.type,
        daysUntil: daysBetween(today, d)
      };
    }
  }
  return null;
}

/**
 * Trouve la prochaine transition PY (1er janvier suivant).
 */
export function findNextPYTransition(
  today: Date,
  calcPY: (date: Date) => number
): NextPYTransition {
  const nextJan1 = new Date(today.getFullYear() + 1, 0, 1);
  const fromPY = calcPY(today);
  const toPY = calcPY(nextJan1);

  return {
    fromPY,
    toPY,
    date: nextJan1,
    daysUntil: daysBetween(today, nextJan1)
  };
}

/**
 * Trouve la prochaine transition de Pinnacle.
 */
export function findNextPinnacleTransition(
  today: Date,
  birthDate: Date,
  pinnacles: PinnacleInfo[]
): NextPinnacleTransition | null {
  const age = calcAge(today, birthDate);

  for (let i = 0; i < pinnacles.length; i++) {
    if (pinnacles[i].startAge > age) {
      const transitionAge = pinnacles[i].startAge;
      const transitionDate = new Date(birthDate);
      transitionDate.setFullYear(birthDate.getFullYear() + transitionAge);

      return {
        fromPinnacle: pinnacles[i - 1]?.number ?? null,
        toPinnacle: pinnacles[i].number,
        transitionAge,
        daysUntil: daysBetween(today, transitionDate)
      };
    }
  }

  return null;
}

/**
 * Calcule le forecast complet 7/30/90 jours.
 * @param getScore - fonction qui retourne le score liteMode pour une date
 */
export function calcForecast(
  today: Date,
  getScore: (date: Date) => number,
  retroPeriods: RetroPeriod[],
  eclipses: EclipseInfo[],
  calcPY: (date: Date) => number,
  birthDate: Date,
  pinnacles: PinnacleInfo[]
): ForecastResult {

  // Calcul forward
  function forward(days: number): ForecastDay[] {
    const arr: ForecastDay[] = [];
    for (let i = 1; i <= days; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      arr.push({ date: d, score: getScore(d) });
    }
    return arr;
  }

  const s7 = forward(7);
  const s30 = forward(30);
  const s90 = forward(90);

  const avg = (a: ForecastDay[]) => a.length ? a.reduce((t, x) => t + x.score, 0) / a.length : 0;

  // Action Windows (clusters ≥72) — tolérance 1 jour de gap
  const windows: ActionWindow[] = [];
  let current: { start: Date; end: Date; total: number; count: number; gap: number } | null = null;

  for (const d of s90) {
    if (d.score >= 72) {
      if (!current) {
        current = { start: d.date, end: d.date, total: d.score, count: 1, gap: 0 };
      } else {
        current.end = d.date;
        current.total += d.score;
        current.count++;
        current.gap = 0; // reset gap counter
      }
    } else if (current) {
      current.gap++;
      if (current.gap > 1) {
        // Plus de 1 jour sous seuil → fermer la fenêtre
        windows.push({
          start: current.start,
          end: current.end,
          avg: current.total / current.count,
          days: current.count
        });
        current = null;
      }
      // gap === 1 → on tolère, on continue le cluster
    }
  }
  if (current) {
    windows.push({
      start: current.start,
      end: current.end,
      avg: current.total / current.count,
      days: current.count
    });
  }

  // Événements majeurs dans les 90j
  const majorEvents: ForecastEvent[] = [];
  for (const d of s90) {
    if (d.score >= COSMIC_THRESHOLD) {
      majorEvents.push({
        type: 'Cosmique',
        date: d.date,
        description: 'Jour à très forte convergence.',
        daysUntil: daysBetween(today, d.date)
      });
    }
  }

  return {
    next7: {
      avg: avg(s7),
      best: s7.reduce((a, b) => a.score > b.score ? a : b),
      worst: s7.reduce((a, b) => a.score < b.score ? a : b),
      goldDays: s7.filter(x => x.score >= 80).length
    },
    next30: {
      avg: avg(s30),
      goldDays: s30.filter(x => x.score >= 80).length,
      cosmiqueDays: s30.filter(x => x.score >= COSMIC_THRESHOLD).length,
      trend: avg(s30) > 50 ? 'favorable' : 'challenging'
    },
    next90: {
      avg: avg(s90),
      goldDays: s90.filter(x => x.score >= 80).length,
      majorEvents
    },
    windows,
    nextRetrograde: findNextRetrograde(today, retroPeriods),
    nextEclipse: findNextEclipse(today, eclipses),
    nextPYTransition: findNextPYTransition(today, calcPY),
    nextPinnacleTransition: findNextPinnacleTransition(today, birthDate, pinnacles)
  };
}

// ─────────────────────────────────────────────
// 3️⃣ PAST ANALYSIS
// Source : GPT R8
// ─────────────────────────────────────────────

/**
 * Calcule l'analyse du passé : position dans le Pinnacle, historique PY, pattern.
 */
export function calcPastAnalysis(
  today: Date,
  birthDate: Date,
  pinnacles: PinnacleInfo[],
  calcPY: (date: Date) => number,
  missingNumbers: number[],
  southNodeSign: string | null
): PastAnalysis {
  const age = calcAge(today, birthDate);

  // Trouver le pinnacle courant
  const current = pinnacles.find(p => age >= p.startAge && age < p.endAge)
    || pinnacles[pinnacles.length - 1];

  const yearsIn = current.endAge - current.startAge;
  const yearsPassed = age - current.startAge;

  let position: 'early' | 'middle' | 'late' = 'middle';
  if (yearsPassed <= 2) position = 'early';
  else if (yearsIn - yearsPassed <= 2) position = 'late';

  // Pinnacle précédent
  const previous = pinnacles.find(p => p.endAge === current.startAge);

  // Historique des 3 dernières PY
  const pyHistory = [-2, -1, 0].map(offset => {
    const d = new Date(today.getFullYear() + offset, 0, 1);
    const py = calcPY(d);
    return { year: d.getFullYear(), py, theme: PY_THEMES[py] || 'Cycle spécial' };
  });

  // Leçons karmiques
  const karmicLessons = (missingNumbers || [])
    .filter(n => n >= 1 && n <= 9)
    .map(n => ({
      number: n,
      lesson: `Apprendre ${PY_THEMES[n]?.toLowerCase() || 'cette leçon'}`
    }));

  // Nœud Sud
  const southNode = southNodeSign
    ? { sign: southNodeSign, meaning: `Ce que tu quittes : énergie ${southNodeSign}` }
    : null;

  // Pattern
  const currentPY = calcPY(today);
  let pastPattern: PastAnalysis['pastPattern'] = 'consolidation';
  if (position === 'late' && currentPY === 9) pastPattern = 'transition';
  else if (position === 'early' && [1, 3].includes(currentPY)) pastPattern = 'expansion';
  else if (position === 'late' && currentPY === 7) pastPattern = 'maturation';

  // Index du pinnacle (1-4)
  const pinnacleIndex = pinnacles.indexOf(current) + 1;
  const pinnacleLabel = PINNACLE_LABELS[pinnacleIndex] || `Cycle ${pinnacleIndex}`;

  return {
    currentPinnacle: {
      number: pinnacleIndex,
      meaning: pinnacleLabel,
      startAge: current.startAge,
      endAge: current.endAge,
      position
    },
    previousPinnacle: previous ? {
      number: pinnacles.indexOf(previous) + 1,
      meaning: PINNACLE_LABELS[pinnacles.indexOf(previous) + 1] || `Cycle`,
      lesson: `Leçon intégrée du cycle ${PINNACLE_LABELS[pinnacles.indexOf(previous) + 1] || ''}`
    } : null,
    personalYearHistory: pyHistory,
    karmicLessons,
    southNode,
    pastPattern
  };
}

// ─────────────────────────────────────────────
// 4️⃣ PRESENT CONTEXT
// Source : GPT R8
// ─────────────────────────────────────────────

/**
 * Calcule le contexte présent enrichi : position multi-cycles + intensité.
 */
export function calcPresentContext(
  today: Date,
  birthDate: Date,
  pinnacles: PinnacleInfo[],
  calcPY: (date: Date) => number,
  calcPM: (date: Date) => number,
  mercuryStatus: MercuryStatus,
  activeRetrogrades: PlanetaryRetro[]
): PresentContext {
  const age = calcAge(today, birthDate);

  // Pinnacle courant
  const current = pinnacles.find(p => age >= p.startAge && age < p.endAge)
    || pinnacles[pinnacles.length - 1];

  const yearsIn = current.endAge - current.startAge;
  const yearsPassed = age - current.startAge;

  let position: 'early' | 'middle' | 'late' = 'middle';
  if (yearsPassed <= 2) position = 'early';
  else if (yearsIn - yearsPassed <= 2) position = 'late';

  const py = calcPY(today);
  const pm = calcPM(today);
  const pinnacleIndex = pinnacles.indexOf(current) + 1;

  // Intensité : croisement multi-cycles
  // Ordre : peak → releasing (conditions fortes) → building → calm (fallback)
  let intensity: PresentContext['intensity'] = 'calm';
  if ([1, 5, 9].includes(py) && activeRetrogrades.length === 0 && position !== 'late') {
    intensity = 'peak';
  } else if (position === 'late' || activeRetrogrades.length >= 2 || [4, 7, 9].includes(py)) {
    intensity = 'releasing';  // late/retro/PY clôture-difficile prime sur building
  } else if ([1, 2, 3, 5, 6, 8].includes(py) || position === 'early') {
    intensity = 'building';   // PY actives (inclut 1/5 quand retro bloque peak)
  }

  // Key message : priorité contextuelle
  let keyMessage = 'Cycle en cours.';
  if (position === 'late') {
    keyMessage = 'Fin de phase de vie : prépare la transition.';
  } else if (activeRetrogrades.length > 0) {
    keyMessage = 'Rétrograde active : ralentir pour réajuster.';
  } else if (mercuryStatus.phase.includes('retro')) {
    keyMessage = 'Mercure rétrograde : communication et décisions demandent prudence.';
  } else if ([1, 5, 9].includes(py)) {
    keyMessage = 'Année de puissance et d\'activation.';
  } else if ([4, 8].includes(py)) {
    keyMessage = 'Année de construction et de résultats concrets.';
  } else if (py === 6) {
    keyMessage = 'Année d\'harmonie — relations et responsabilités au centre.';
  }

  return {
    cyclePosition: {
      pinnacle: { number: pinnacleIndex, position, yearsLeft: current.endAge - age },
      personalYear: { number: py, monthInYear: today.getMonth() + 1, theme: PY_THEMES[py] || '' },
      personalMonth: { number: pm, weekInMonth: Math.ceil(today.getDate() / 7) },
      mercuryPhase: mercuryStatus,
      retrogradesActive: activeRetrogrades
    },
    intensity,
    keyMessage
  };
}

// ─────────────────────────────────────────────
// 5️⃣ TEMPORAL NARRATIVE — DÉTECTION D'ARC (12 arcs)
// Source : GPT R8 (detectArc) + Grok R7 (textes)
// ─────────────────────────────────────────────

/**
 * Détecte l'arc narratif en testant 12 conditions par ordre de priorité.
 * Le Portail et La Tempête sont prioritaires (événements imminents).
 */
export function detectArc(
  past: PastAnalysis,
  present: PresentContext,
  momentum: MomentumResult,
  forecast: ForecastResult
): ArcName {
  // 1. Le Portail — transition imminente (la plus urgente)
  if (
    (forecast.nextPYTransition && forecast.nextPYTransition.daysUntil < 30) ||
    (forecast.nextPinnacleTransition && forecast.nextPinnacleTransition.daysUntil < 365)
  ) return 'Le Portail';

  // 2. La Tempête — volatilité + éclipse proche
  if (
    momentum.trend === 'volatile' &&
    forecast.nextEclipse && forecast.nextEclipse.daysUntil < 30
  ) return 'La Tempête';

  // 3. L'Envol — expansion + peak + beaucoup de Gold
  if (
    past.pastPattern === 'expansion' &&
    present.intensity === 'peak' &&
    forecast.next30.goldDays >= 5
  ) return "L'Envol";

  // 4. Le Sommet — peak + futur fort
  if (
    present.intensity === 'peak' &&
    forecast.next90.avg > 60
  ) return 'Le Sommet';

  // 5. La Moisson — expansion passée + releasing
  if (
    past.pastPattern === 'expansion' &&
    present.intensity === 'releasing'
  ) return 'La Moisson';

  // 6. La Traversée — maturation + releasing
  if (
    past.pastPattern === 'maturation' &&
    present.intensity === 'releasing'
  ) return 'La Traversée';

  // 7. La Renaissance — transition passée + building
  if (
    past.pastPattern === 'transition' &&
    present.intensity === 'building'
  ) return 'La Renaissance';

  // 8. L'Endurance — transition passée + calm + stable
  if (
    past.pastPattern === 'transition' &&
    present.intensity === 'calm' &&
    momentum.trend === 'stable'
  ) return "L'Endurance";

  // 9. Le Pivot — volatile + transition PY proche
  if (
    momentum.trend === 'volatile' &&
    forecast.nextPYTransition && forecast.nextPYTransition.daysUntil < 60
  ) return 'Le Pivot';

  // 10. La Consolidation — consolidation + building
  if (
    past.pastPattern === 'consolidation' &&
    present.intensity === 'building'
  ) return 'La Consolidation';

  // 11. L'Appel — expansion + building + Gold
  if (
    past.pastPattern === 'expansion' &&
    present.intensity === 'building' &&
    forecast.next30.goldDays >= 3
  ) return "L'Appel";

  // 12. La Maturation — maturation + calm
  if (
    past.pastPattern === 'maturation' &&
    present.intensity === 'calm'
  ) return 'La Maturation';

  // 13. Filets de sécurité — combinaisons restantes (éviter le fallback générique)
  if (past.pastPattern === 'consolidation' && present.intensity === 'calm') return 'La Maturation';
  if (past.pastPattern === 'consolidation' && present.intensity === 'releasing') return 'La Traversée';
  if (past.pastPattern === 'expansion' && present.intensity === 'calm') return 'La Moisson';
  if (past.pastPattern === 'transition' && present.intensity === 'peak') return 'La Renaissance';
  if (past.pastPattern === 'transition' && present.intensity === 'releasing') return 'La Traversée';
  if (past.pastPattern === 'maturation' && present.intensity === 'building') return 'La Consolidation';
  if (past.pastPattern === 'maturation' && present.intensity === 'peak') return 'Le Sommet';

  // Fallback
  return 'Le Cycle en Cours';
}

/**
 * Génère la narrative temporelle complète Passé→Présent→Futur.
 *
 * V2 — Template Factory (Ronde #9) :
 *   Utilise NARRATIVE_BUILDERS[arc](ctx) pour des textes dynamiques
 *   contextualisés par segment (momentum, signal, forecast, CI).
 *   Fallback automatique sur ARC_NARRATIVES statiques en cas d'erreur.
 *
 * @param signalScore  Score de convergence du jour (5-97). Défaut 50.
 * @param trendScore   Score de tendance PY+PM (-10 à +10). Défaut 0.
 */
export function generateTemporalNarrative(
  past: PastAnalysis,
  present: PresentContext,
  momentum: MomentumResult,
  forecast: ForecastResult,
  signalScore: number = 50,
  trendScore: number = 0,
): TemporalNarrative {
  const arc = detectArc(past, present, momentum, forecast);

  // ── Tentative Template Factory (dynamique) ──
  const builder = NARRATIVE_BUILDERS[arc];
  if (builder) {
    try {
      // Derive signalLabel from score thresholds
      const signalLabel = signalScore >= COSMIC_THRESHOLD ? 'Convergence rare'
        : signalScore >= 80 ? 'Élan fort'
        : signalScore >= 65 ? 'Favorable'
        : signalScore >= 40 ? 'Consolidation'
        : signalScore >= 25 ? 'Prudence'
        : 'Tempête';

      // Simplified CI label from 30-day midpoint estimate
      const sigma7j = momentum.scores.length > 1
        ? Math.sqrt(momentum.scores.reduce((s, v) => s + (v - momentum.avgLast7) ** 2, 0) / momentum.scores.length)
        : 10;
      const ciRaw = Math.exp(-0.0012 * 15) * (0.75 + 0.45 * 0.7) * (1 - 0.018 * Math.max(1, sigma7j));
      const ciLabel = ciRaw >= 0.75 ? 'Haute' : ciRaw >= 0.55 ? 'Bonne' : ciRaw >= 0.35 ? 'Modérée' : 'Faible';

      const ctx = buildNarrativeContext(momentum, present, forecast, signalScore, signalLabel, trendScore, ciLabel);
      const dynamic = builder(ctx);
      return { ...dynamic, arc };
    } catch (e) {
      console.warn('[Temporal] Narrative builder error for arc "' + arc + '", fallback to static:', e);
    }
  }

  // ── Fallback : textes statiques ──
  const texts = ARC_NARRATIVES[arc];
  return {
    past: texts.past,
    present: {
      ...texts.present,
      insight: present.keyMessage
    },
    future: {
      ...texts.future,
      insight: forecast.next30.goldDays > 0
        ? `${forecast.next30.goldDays} jour${forecast.next30.goldDays > 1 ? 's' : ''} porteur${forecast.next30.goldDays > 1 ? 's' : ''} à venir.`
        : texts.future.insight
    },
    arc
  };
}

// ─────────────────────────────────────────────
// 7️⃣ MACD TREND INVERSION (Signal d'inversion) — V3.2
// Source : Gemini R6 (concept) + Claude (implémentation)
// Détecte les retournements de tendance via EMA(3)/EMA(7).
// Le crossover bullish/bearish est le signal le plus actionnable.
// ─────────────────────────────────────────────

function calcEMA(scores: number[], period: number): number {
  const k = 2 / (period + 1);
  let ema = scores[0];
  for (let i = 1; i < scores.length; i++) {
    ema = scores[i] * k + ema * (1 - k);
  }
  return ema;
}

/**
 * Calcule le MACD (Moving Average Convergence Divergence) sur les 10 derniers jours.
 * @param getScore - fonction qui retourne le score pour une date
 * @param today - date du jour
 */
export function calcMACD(
  getScore: (date: Date) => number,
  today: Date
): MACDResult {
  // Collecter 10 jours de scores (besoin de 7 pour EMA7 + 3 jours de signal)
  const scores: number[] = [];
  for (let i = 9; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    scores.push(getScore(d));
  }

  const ema3 = calcEMA(scores, 3);
  const ema7 = calcEMA(scores, 7);
  const macdLine = ema3 - ema7;

  // Signal line = EMA(2) du MACD sur les 3 derniers jours
  const macdHistory: number[] = [];
  for (let window = 2; window >= 0; window--) {
    const slice = scores.slice(0, scores.length - window || scores.length);
    macdHistory.push(calcEMA(slice, 3) - calcEMA(slice, 7));
  }
  const signal = calcEMA(macdHistory, 2);
  const histogram = macdLine - signal;

  // Détecter le croisement
  const prevMacd = macdHistory.length >= 2 ? macdHistory[macdHistory.length - 2] : 0;
  const prevSignal = signal; // approximation
  let crossover: MACDResult['crossover'] = null;

  // Filtre d'amplitude : crossover valide seulement si |macdLine| > 1.5
  // Évite les faux positifs sur des oscillations mineures (Ronde #6 — Grok)
  if (prevMacd <= 0 && macdLine > 0 && Math.abs(macdLine) > 1.5) crossover = 'bullish';
  else if (prevMacd >= 0 && macdLine < 0 && Math.abs(macdLine) > 1.5) crossover = 'bearish';

  // Divergence : score monte mais MACD descend (ou inverse)
  const scoreDirection = scores[scores.length - 1] - scores[scores.length - 4]; // delta 3j
  const macdDirection = macdLine - prevMacd;
  const divergence = (scoreDirection > 5 && macdDirection < -2) || (scoreDirection < -5 && macdDirection > 2);

  // Narrative — vocabulaire "Signal d'inversion" (non-trading, Ronde #6 — GPT)
  let narrative = '';
  if (crossover === 'bullish') {
    narrative = 'Signal d\'inversion positive — l\'élan récent dépasse la tendance de fond. Le courant change en ta faveur.';
  } else if (crossover === 'bearish') {
    narrative = 'Signal d\'inversion négative — l\'élan récent passe sous la tendance de fond. Ralentis et consolide.';
  } else if (divergence) {
    narrative = 'Divergence détectée : le score et l\'élan vont dans des directions opposées. Un changement de direction est probable dans 1-3 jours.';
  } else if (histogram > 3) {
    narrative = 'Élan en accélération — la dynamique positive se renforce.';
  } else if (histogram < -3) {
    narrative = 'Élan en décélération — la dynamique s\'essouffle.';
  } else {
    narrative = 'Tendance stable — pas de signal d\'inversion notable.';
  }

  return {
    ema3: Math.round(ema3 * 10) / 10,
    ema7: Math.round(ema7 * 10) / 10,
    macdLine: Math.round(macdLine * 10) / 10,
    signal: Math.round(signal * 10) / 10,
    histogram: Math.round(histogram * 10) / 10,
    crossover,
    divergence,
    narrative,
  };
}



// ─────────────────────────────────────────────
// HELPERS — NARRATIF PY
// ─────────────────────────────────────────────

/**
 * Retourne la phrase PY narrative en fonction du mois dans l'année.
 */
export function getPYNarrativePhase(py: number, monthInYear: number): string {
  const narratives = PY_NARRATIVES[py];
  if (!narratives) return '';

  if (monthInYear <= 3) return narratives.debut;
  if (monthInYear <= 8) return narratives.milieu;
  if (monthInYear <= 11) return narratives.fin;
  return narratives.transition;
}

/**
 * Retourne le texte de transition PY→PY+1.
 */
/**
 * Retourne le texte de position dans le Pinnacle.
 */
export function getPinnaclePositionText(
  pinnacleIndex: number,
  position: 'early' | 'middle' | 'late'
): { title: string; narrative: string; conseil: string } | null {
  const key = `${pinnacleIndex}_${position}`;
  return PINNACLE_POSITION_TEXTS[key] || null;
}

/**
 * Détermine le forecast narratif approprié.
 */
export function getForecastNarrativeKey(forecast: ForecastResult): string {
  // Priorité : transition > éclipse > radieux > difficile > mixte > accalmie
  if (forecast.nextPYTransition && forecast.nextPYTransition.daysUntil < 30) return 'transition';
  if (forecast.nextEclipse && forecast.nextEclipse.daysUntil < 14) return 'eclipse';
  if (forecast.next7.avg > 65 && forecast.next7.goldDays >= 2) return 'radieux';
  if (forecast.next7.avg < 45) return 'difficile';
  if (forecast.next30.cosmiqueDays > 0) return 'mixte';
  // Accalmie = faible amplitude sur 7 jours (range best-worst ≤ 25 pts)
  if ((forecast.next7.best.score - forecast.next7.worst.score) <= 25) return 'accalmie';
  return 'mixte';
}

// ─────────────────────────────────────────────
// 🔄 PSI — RÉSONANCE PÉRIODIQUE V4.9 Sprint E1
// Source : specs V4.9 multi-AI (Grok R2 + GPT R3 + Gemini R3)
//
// Principe : compare la « signature symbolique » du jour actuel avec les
// jours passés/futurs via un vecteur 12D normalisé (z-score par dimension)
// et une distance euclidienne pondérée.
//
// Seuil forte  < 2.4 → narration PSI dans ConvergenceTab
// Seuil modérée < 4.0 → mention dans TemporalTab
//
// Aucune modification du code existant. Toutes les exports sont nouvelles.
// ─────────────────────────────────────────────

// ── Encodage I Ching tier → numérique ──
const PSI_TIER_NUM: Record<string, number> = { A: 4, B: 3, C: 2, D: 1, E: 0 };

/**
 * Vecteur 12D représentant la « signature symbolique » d'un jour.
 * Toutes les dimensions sont numériques, normalisables par z-score.
 */
export interface PSIVector {
  pd: number;               // 1  Personal Day value (1-33)
  pm: number;               // 2  Personal Month value (1-9)
  py: number;               // 3  Personal Year value (1-9)
  moonPhase: number;        // 4  Phase lunaire (0-7)
  nakshatraId: number;      // 5  Nakshatra id (1-27)
  ichingTierNum: number;    // 6  Tier encodé : A=4 B=3 C=2 D=1 E=0
  changingLine: number;     // 7  Ligne mutante (0-5)
  mercuryRetro: number;     // 8  Mercure rétro : 0 ou 1
  retroCount: number;       // 9  Nb rétrogrades planétaires actifs (0-4)
  pinnaclePhaseNum: number; // 10 Phase Pinnacle : early=2 middle=1 late=0
  pyMonthNorm: number;      // 11 Mois dans l'année personnelle (1-12)
  vocActive: number;        // 12 Lune Hors Cours : 0 ou 1
  // A1.1 : Retours planétaires — intensité interpolée 0.0-1.0
  saturnIntensity: number;  // 13 Proximité retour Saturne  (1.0 = exactitude)
  jupiterIntensity: number; // 14 Proximité retour Jupiter
  nodeIntensity: number;    // 15 Proximité retour Nœud Nord
  // V5.1 : Vimshottari Dasha Antardasha
  dashaAntarIndex: number;  // 16 Seigneur Antardasha courant : index 0-8 dans DASHA_SEQUENCE
  // V5.3 : Transits personnalisés
  transitBeneficScore: number; // 17 Intensité max transits bénéfiques actifs (0-1)
  transitTenseScore:   number; // 18 Intensité max transits tendus actifs (0-1)
}

/** Clés ordonnées des 18 dimensions du vecteur PSI. */
const PSI_KEYS: (keyof PSIVector)[] = [
  'pd', 'pm', 'py', 'moonPhase', 'nakshatraId',
  'ichingTierNum', 'changingLine', 'mercuryRetro',
  'retroCount', 'pinnaclePhaseNum', 'pyMonthNorm', 'vocActive',
  'saturnIntensity', 'jupiterIntensity', 'nodeIntensity', // A1.1
  'dashaAntarIndex', // V5.1
  'transitBeneficScore', 'transitTenseScore', // V5.3
];

/**
 * Poids par dimension.
 * Cycles longs (PD/PM/PY) et symbolique fort (Lune/Nakshatra/IChing) ×1.5-2.0.
 * Éléments binaires ou de faible amplitude (VoC, ligne mutante) ×0.3-0.5.
 */
const PSI_WEIGHTS: Record<keyof PSIVector, number> = {
  pd:               2.0,
  pm:               2.0,
  py:               2.0,
  moonPhase:        1.0,   // F1.4 : 1.5→1.0 (colinéarité r=0.67 avec nakshatraId, Grok R2)
  nakshatraId:      1.5,
  ichingTierNum:    1.5,
  changingLine:     0.5,
  mercuryRetro:     1.0,
  retroCount:       0.8,
  pinnaclePhaseNum: 1.0,
  pyMonthNorm:      0.5,
  vocActive:        0.3,
  saturnIntensity:  2.5,   // A1.1 : cycle 29.5 ans — fort signal rare
  jupiterIntensity: 2.5,   // A1.1 : cycle 11.9 ans
  nodeIntensity:    2.5,   // A1.1 : cycle 18.6 ans
  dashaAntarIndex:       2.5,   // V5.1 : Antardasha change ~3-36 mois — signal fort dans fenêtre 730j
  transitBeneficScore:   1.5,   // V5.3 : transits bénéfiques actifs — change sur semaines/mois
  transitTenseScore:     1.5,   // V5.3 : transits tendus actifs — symétrique
};

/** Seuil distance euclidienne pondérée normalisée → résonance forte.
 *  Z0.3 : 2.4 → 2.1 (calibration Grok R2 MC 50k profils : ~17.9j/an vs 26.5j à 2.4) */
const PSI_THRESHOLD_FORTE   = 2.1;
/** Seuil → résonance modérée (aussi : limite lookahead). */
const PSI_THRESHOLD_MODEREE = 4.0;

/** Un jour passé ou futur similaire à aujourd'hui. */
export interface PSIMatch {
  date: Date;
  distance: number;                        // Distance euclidienne pondérée (2 décimales)
  score: number | null;                    // Score convergence ce jour (null si futur/indisponible)
  resonanceLabel: 'forte' | 'modérée' | 'faible';
}

/** Résultat complet du moteur PSI. */
export interface PSIResult {
  pastMatches: PSIMatch[];                 // Top 3 jours passés les plus proches
  nextOccurrence: PSIMatch | null;         // Prochain jour futur similaire (dist < PSI_THRESHOLD_MODEREE)
  resonanceScore: number;                  // 0-100 — force de résonance normalisée
  resonanceLabel: 'forte' | 'modérée' | 'faible' | 'nulle';
  narrative: string;                       // Narration ConvergenceTab (si résonance ≥ modérée)
  conseil: string;                         // Conseil actionnable
}

// ── Helpers internes ──

function _psiNormalize(
  v: PSIVector,
  means: Record<keyof PSIVector, number>,
  stds:  Record<keyof PSIVector, number>
): Record<keyof PSIVector, number> {
  const out = {} as Record<keyof PSIVector, number>;
  for (const k of PSI_KEYS) {
    // Z0.1 : Guard NaN — si std≈0 (dim binaire inactive sur 365j), contribue 0 à la distance
    out[k] = stds[k] < 1e-8 ? 0 : (v[k] - means[k]) / stds[k];
  }
  return out;
}

function _psiDistance(
  a: Record<keyof PSIVector, number>,
  b: Record<keyof PSIVector, number>
): number {
  let sum = 0;
  for (const k of PSI_KEYS) {
    const w = PSI_WEIGHTS[k];
    const d = (a[k] || 0) - (b[k] || 0);
    sum += w * d * d;
  }
  return Math.sqrt(sum);
}

function _psiLabel(dist: number): PSIMatch['resonanceLabel'] {
  if (dist < PSI_THRESHOLD_FORTE)   return 'forte';
  if (dist < PSI_THRESHOLD_MODEREE) return 'modérée';
  return 'faible';
}

function _psiNarrative(
  pastMatches: PSIMatch[],
  nextOccurrence: PSIMatch | null,
  resonanceLabel: PSIResult['resonanceLabel']
): { narrative: string; conseil: string } {

  if (resonanceLabel === 'nulle') {
    return {
      narrative: "Aucune résonance périodique notable — cette configuration est rare dans ton cycle.",
      conseil:   "Journée unique : les patterns habituels ne s'appliquent pas. Reste attentif aux signaux inédits.",
    };
  }

  const top = pastMatches[0];
  const daysAgo = top
    ? Math.round((Date.now() - top.date.getTime()) / 86400000)
    : 0;
  const scoreInfo = top?.score != null ? ` (score ${top.score} ce jour-là)` : '';
  const nextDays = nextOccurrence
    ? Math.round((nextOccurrence.date.getTime() - Date.now()) / 86400000)
    : 0;
  const nextInfo  = nextOccurrence
    ? ` La prochaine occurrence similaire est dans ${nextDays} jour${nextDays > 1 ? 's' : ''}.`
    : '';

  // Aligner le vocabulaire de distance avec le UI (distanceLabel dans TemporalTab)
  // Distance euclidienne 12D : plage réelle ~0-6, forte < 2.1, modérée < 4.0
  const topDist = top?.distance ?? 6;
  const distWord = topDist < 0.7 ? 'quasi identique' : topDist < 1.2 ? 'très similaire' : topDist < 2.1 ? 'similaire' : topDist < 4.0 ? 'partiellement similaire' : 'faiblement similaire';

  if (resonanceLabel === 'forte') {
    let conseil: string;
    if (top?.score != null && top.score >= 65) {
      conseil = "Ce cycle t\'a été favorable — capitalise sur les mêmes leviers qu'il y a quelques semaines.";
    } else if (top?.score != null && top.score < 45) {
      conseil = "Ce cycle a été difficile dans le passé — anticipe les mêmes résistances et prépare-toi.";
    } else {
      conseil = "Observe ce que tu as vécu lors du dernier écho pour orienter tes décisions d'aujourd'hui.";
    }
    return {
      narrative: `Résonance périodique forte — une configuration ${distWord} s'est produite il y a ${daysAgo} jour${daysAgo > 1 ? 's' : ''}${scoreInfo}.${nextInfo}`,
      conseil,
    };
  }

  if (resonanceLabel === 'modérée') {
    return {
      narrative: `Résonance périodique modérée — des échos ${topDist < 2.5 ? 'proches' : 'partiels'} de cette configuration ont été détectés il y a ${daysAgo} jour${daysAgo > 1 ? 's' : ''}${scoreInfo}.${nextInfo}`,
      conseil:   "Les patterns de cette période se répètent partiellement — ajuste ta stratégie en tenant compte du cycle passé.",
    };
  }

  return {
    narrative: "Faible résonance périodique — cette configuration est peu commune mais pas unique dans ton cycle.",
    conseil:   "Les tendances passées s'appliquent partiellement — reste flexible dans ton approche.",
  };
}

function _psiEmptyResult(): PSIResult {
  return {
    pastMatches:     [],
    nextOccurrence:  null,
    resonanceScore:  0,
    resonanceLabel:  'nulle',
    narrative:       'Résonance périodique non disponible.',
    conseil:         '',
  };
}

// ── API publique ──

/**
 * Helper pour construire un PSIVector depuis les données convergence.
 * Appelé dans App.tsx (Sprint E2) avec les champs du ConvergenceResult.
 *
 * @param data.ichingTier — 'A'|'B'|'C'|'D'|'E'
 */
export function buildPSIVector(data: {
  pd:               number;
  pm:               number;
  py:               number;
  moonPhase:        number;   // 0-7
  nakshatraId:      number;   // 1-27
  ichingTier:       string;   // 'A'-'E'
  changingLine:     number;   // 0-5
  mercuryRetro:     boolean;
  retroCount:       number;
  pinnaclePhase:    'early' | 'middle' | 'late';
  pyMonth:          number;   // 1-12
  vocActive:        boolean;
  // A1.1 : intensités retours planétaires (optionnel — default 0 si non fourni)
  saturnIntensity?:  number;
  jupiterIntensity?: number;
  nodeIntensity?:    number;
  // V5.1 : Vimshottari Antardasha (optionnel — default 0 si non fourni)
  dashaAntarIndex?:      number;  // 0-8 dans DASHA_SEQUENCE
  // V5.3 : Transits personnalisés (optionnel — default 0 si non fourni)
  transitBeneficScore?:  number;  // 0-1 intensité max transits bénéfiques
  transitTenseScore?:    number;  // 0-1 intensité max transits tendus
}): PSIVector {
  const pinnaclePhaseNum =
    data.pinnaclePhase === 'early' ? 2 :
    data.pinnaclePhase === 'late'  ? 0 : 1;
  return {
    pd:               data.pd,
    pm:               data.pm,
    py:               data.py,
    moonPhase:        data.moonPhase,
    nakshatraId:      data.nakshatraId,
    ichingTierNum:    PSI_TIER_NUM[data.ichingTier] ?? 2,
    changingLine:     data.changingLine,
    mercuryRetro:     data.mercuryRetro ? 1 : 0,
    retroCount:       data.retroCount,
    pinnaclePhaseNum,
    pyMonthNorm:      data.pyMonth,
    vocActive:        data.vocActive ? 1 : 0,
    saturnIntensity:  data.saturnIntensity  ?? 0,  // A1.1
    jupiterIntensity: data.jupiterIntensity ?? 0,  // A1.1
    nodeIntensity:    data.nodeIntensity    ?? 0,  // A1.1
    dashaAntarIndex:     data.dashaAntarIndex     ?? 0,  // V5.1
    transitBeneficScore: data.transitBeneficScore ?? 0,  // V5.3
    transitTenseScore:   data.transitTenseScore   ?? 0,  // V5.3
  };
}

/**
 * V4.9 Sprint E1 — Moteur PSI (Résonance Périodique).
 *
 * Identifie les jours passés/futurs dont la signature symbolique est proche
 * du jour actuel, via un vecteur 12D normalisé et une distance euclidienne
 * pondérée.
 *
 * @param today          Date du jour analysé
 * @param buildVector    Callback : construit le PSIVector pour n'importe quelle date
 * @param lookbackDays   Fenêtre d'analyse passée (défaut : 365 jours)
 * @param lookaheadDays  Fenêtre de recherche future (défaut : 365 jours)
 * @param getScore       Callback optionnel : retourne le score d'une date passée
 *
 * Algorithme :
 *  1. Générer les vecteurs du lookback window (référence)
 *  2. Calculer mean + std par dimension (normalisation z-score)
 *  3. Normaliser le vecteur du jour
 *  4. Calculer distance pondérée de chaque jour passé → top 3
 *  5. Chercher la prochaine occurrence future (dist < PSI_THRESHOLD_MODEREE)
 *  6. Construire narration selon résonance
 */
export function calcPSI(
  today:         Date,
  buildVector:   (date: Date) => PSIVector,
  lookbackDays   = 365,
  lookaheadDays  = 365,
  getScore?:     (date: Date) => number | null
): PSIResult {

  // ── 1. Collecter dates et vecteurs du passé ──
  const pastDates: Date[] = [];
  for (let i = 1; i <= lookbackDays; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    pastDates.push(d);
  }

  let pastVectors: PSIVector[];
  try {
    pastVectors = pastDates.map(d => buildVector(d));
  } catch {
    return _psiEmptyResult();
  }

  if (pastVectors.length === 0) return _psiEmptyResult();

  // ── 2. Calculer mean + std par dimension — algorithme Welford one-pass (F1.2) ──
  // Remplace la double réduction (mean puis variance) : divise le coût CPU de ~50%
  const means = {} as Record<keyof PSIVector, number>;
  const stds  = {} as Record<keyof PSIVector, number>;

  for (const k of PSI_KEYS) {
    let count = 0, m = 0, M2 = 0;
    for (const v of pastVectors) {
      count++;
      const delta = v[k] - m;
      m += delta / count;
      M2 += delta * (v[k] - m);
    }
    means[k] = m;
    stds[k]  = count > 1 ? Math.sqrt(M2 / count) : 0;
  }

  // ── 3. Normaliser le vecteur du jour ──
  let todayVec: PSIVector;
  try {
    todayVec = buildVector(today);
  } catch {
    return _psiEmptyResult();
  }
  const todayNorm = _psiNormalize(todayVec, means, stds);

  // ── 4. Distances passé → trier → top 3 ──
  const ranked = pastVectors
    .map((v, i) => ({
      date:     pastDates[i],
      distance: _psiDistance(todayNorm, _psiNormalize(v, means, stds)),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3);

  const pastMatches: PSIMatch[] = ranked.map(m => ({
    date:           m.date,
    distance:       Math.round(m.distance * 100) / 100,
    score:          getScore ? (getScore(m.date) ?? null) : null,
    resonanceLabel: _psiLabel(m.distance),
  }));

  // ── 5. Prochaine occurrence future ──
  let nextOccurrence: PSIMatch | null = null;
  for (let i = 1; i <= lookaheadDays; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    try {
      const fNorm = _psiNormalize(buildVector(d), means, stds);
      const dist  = _psiDistance(todayNorm, fNorm);
      if (dist < PSI_THRESHOLD_MODEREE) {
        nextOccurrence = {
          date:           d,
          distance:       Math.round(dist * 100) / 100,
          score:          null,
          resonanceLabel: _psiLabel(dist),
        };
        break;
      }
    } catch { continue; }
  }

  // ── 6. Score de résonance global (0-100) ──
  const minDist = pastMatches[0]?.distance ?? 999;
  const resonanceScore = Math.max(0, Math.min(100,
    Math.round(100 * Math.max(0, 1 - minDist / PSI_THRESHOLD_MODEREE))
  ));

  const resonanceLabel: PSIResult['resonanceLabel'] =
    minDist < PSI_THRESHOLD_FORTE   ? 'forte'   :
    minDist < PSI_THRESHOLD_MODEREE ? 'modérée' :
    resonanceScore > 0              ? 'faible'  : 'nulle';

  // ── 7. Narration ──
  const { narrative, conseil } = _psiNarrative(pastMatches, nextOccurrence, resonanceLabel);

  return { pastMatches, nextOccurrence, resonanceScore, resonanceLabel, narrative, conseil };
}
