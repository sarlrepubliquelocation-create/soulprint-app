// ═══ TEMPORAL LAYERS ENGINE — V4.5 ═══
// Architecture 3 canaux : FOND (décennal) · TENDANCE (mensuel) · SIGNAL (quotidien)
// + CI(t) confiance temporelle · Zone de Mutation · Alertes de transition
//
// Décisions d'arbitrage Round 2 :
//   Fond = CATÉGORIEL (Gemini) — pas un score numérique
//   Tendance = modificateur ±20% sur Signal (Gemini Potentiel d'Action)
//   CI(t) = formule corrigée Grok (k=0.0012, base=0.75)
//   Transitions = modèle D(t) Grok
//   Profections annuelles : REPORTÉES (précision chute 68% sans heure exacte)
//
// Source : Arbitrage Claude Opus · Rounds 1+2 · 3 experts
// Dépendances : bazi.ts, numerology.ts, convergence.ts (lecture seule)

import type { LuckPillarResult, LuckPillar, Element } from './bazi';
import type { NumerologyProfile } from './numerology';
import type { FondLabel, TendanceLabel } from './alignment';

// ──────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────

export interface TemporalLayersInput {
  luckPillars: LuckPillarResult;
  num: NumerologyProfile;
  currentScore: number;           // Score quotidien 5-97 (Signal)
  birthDate: Date;
  targetDate?: Date;              // Défaut = aujourd'hui
}

export interface FondChannel {
  label: FondLabel;
  polarity: '+' | '-';
  detail: string;                 // Description narrative courte
  luckPillar: LuckPillar | null;
  pillarYearsLeft: number;
  dominantElement: Element | null;
}

export interface TendanceChannel {
  label: TendanceLabel;
  score: number;                  // [-10, +10]
  polarity: '+' | '-';
  detail: string;
  pyContrib: number;              // Contribution PY
  pmContrib: number;              // Contribution PM
}

export interface SignalChannel {
  score: number;                  // Score quotidien inchangé 5-97
  label: string;                  // Cosmique/Gold/etc.
  labelColor: string;
}

export interface PotentielAction {
  score: number;                  // Signal × (1 + Tendance×0.02), clampé 5-97
  delta: number;                  // Différence vs Signal brut
  detail: string;
}

export interface TemporalCI {
  value: number;                  // 0.0 - 1.0
  percent: number;                // 0-100
  label: 'Haute' | 'Bonne' | 'Modérée' | 'Faible';
  isZoneMutation: boolean;        // CI < 0.40
  mutationText?: string;
}

export interface TransitionUrgency {
  score: number;                  // 0-100
  category: 'Mineur' | 'Majeur' | 'Critique';
  color: string;
  icon: string;
}

export interface TransitionAlert {
  type: 'lp_change' | 'pinnacle_end' | 'py_transition' | 'py9_to_1';
  label: string;
  monthsAway: number;
  urgency: TransitionUrgency;
  template: string;
}

export interface TemporalLayersResult {
  fond: FondChannel;
  tendance: TendanceChannel;
  signal: SignalChannel;
  potentiel: PotentielAction;
  ci: {
    today: TemporalCI;
    at6months: TemporalCI;
    at12months: TemporalCI;
    at24months: TemporalCI;
    at36months: TemporalCI;
  };
  transitions: TransitionAlert[];
  sigma7j: number;                // Volatilité 7j (0 si non fournie)
  coherenceRatio: number;         // 0-1
}

// ──────────────────────────────────────────────
// MATRICES FOND
// ──────────────────────────────────────────────

// Mapping élément LP → label Fond
// Basé sur Round 2 GPT matrice Fond (6 états)
function lpElementToFondLabel(
  element: Element,
  themeKey: string,
  pillarYearsLeft: number,
): FondLabel {
  // LP en fin de cycle (< 12 mois) → Transition
  if (pillarYearsLeft <= 1) return 'Transition';

  // Mapping élémentaire
  switch (element) {
    case 'Bois':   return 'Expansion';
    case 'Feu':    return 'Expansion';
    case 'Terre':  return 'Consolidation';
    case 'Métal':  return 'Structuration';
    case 'Eau':    return 'Intériorisation';
  }

  // Fallback sur themeKey
  if (themeKey === 'destroys' || themeKey === 'destroyed_by') return 'Épuration';
  return 'Consolidation';
}

const FOND_POLARITY_MAP: Record<FondLabel, '+' | '-'> = {
  Expansion:      '+',
  Consolidation:  '+',
  Structuration:  '+',
  Transition:     '+',   // Neutre → positif par défaut (lecture via Signal)
  Intériorisation: '-',
  Épuration:      '-',
};

const FOND_DETAILS: Record<FondLabel, string> = {
  Expansion:       'Cycle de croissance — le terrain est porteur pour avancer.',
  Consolidation:   'Phase de stabilisation — consolide ce qui existe avant d\'étendre.',
  Structuration:   'Cycle Métal — construis des fondations rigoureuses.',
  Transition:      'Changement de cycle imminent — les règles du jeu vont évoluer.',
  Intériorisation: 'Cycle Eau — énergie tournée vers le dedans, ressources à reconstituer.',
  Épuration:       'Phase de clarification — ce qui ne sert plus doit être lâché.',
};

// ──────────────────────────────────────────────
// MATRICES TENDANCE
// ──────────────────────────────────────────────

// Mapping PY → TendanceLabel (GPT Round 2)
const PY_TO_TENDANCE: Record<number, TendanceLabel> = {
  1: 'Initiation',
  2: 'Introspection',
  3: 'Expansion sociale',
  4: 'Construction',
  5: 'Expansion sociale',
  6: 'Construction',
  7: 'Introspection',
  8: 'Construction',
  9: 'Récolte',
  11: 'Initiation',
  22: 'Construction',
  33: 'Expansion sociale',
};

// Scoring Tendance : PY 50% + PM 30% + cohérence 20%
const PY_SCORE: Record<number, number> = {
  1: 4, 3: 5, 8: 5, 5: 3, 11: 4, 22: 4,
  2: -2, 4: -2, 7: -3, 9: -1, 33: 2, 6: 2,
};

const PM_SCORE: Record<number, number> = {
  1: 3, 3: 4, 8: 4, 5: 2, 11: 3,
  2: -1, 4: -2, 7: -2, 9: -1,
};

// ──────────────────────────────────────────────
// CI(t) — FORMULE ARBITRAGE ROUND 2
// Grok corrigé : CI(t) = exp(-0.0012×t) × (0.75 + 0.45×coherence) × (1 - 0.018×sigma7j)
// t en jours
// ──────────────────────────────────────────────

export function calcCI(
  t: number,
  coherenceRatio: number = 0.7,
  sigma7j: number = 10,
): TemporalCI {
  const raw = Math.exp(-0.0012 * t)
    * (0.75 + 0.45 * coherenceRatio)
    * (1 - 0.018 * sigma7j);

  const value = Math.max(0, Math.min(1, raw));
  const percent = Math.round(value * 100);

  const label: TemporalCI['label'] =
    value >= 0.75 ? 'Haute' :
    value >= 0.55 ? 'Bonne' :
    value >= 0.40 ? 'Modérée' : 'Faible';

  const isZoneMutation = value < 0.40;

  const mutationText = isZoneMutation
    ? 'Cette période présente une forte variabilité. Tes choix auront un poids supérieur à la moyenne — ton libre arbitre définit cet horizon.'
    : undefined;

  return { value, percent, label, isZoneMutation, mutationText };
}

// ──────────────────────────────────────────────
// POTENTIEL D'ACTION (Gemini Round 1)
// Potentiel = Signal × (1 + Tendance[-10,10] × 0.02)
// ──────────────────────────────────────────────

function calcPotentielAction(
  signal: number,
  tendanceScore: number,
): PotentielAction {
  const modifier = 1 + tendanceScore * 0.02;
  const raw = signal * modifier;
  const score = Math.max(5, Math.min(97, Math.round(raw)));
  const delta = score - signal;

  let detail: string;
  if (delta > 5)  detail = `Tendance ${tendanceScore > 0 ? '+' : ''}${tendanceScore} amplifie le signal (+${delta} pts)`;
  else if (delta < -5) detail = `Tendance ${tendanceScore} freine le signal (${delta} pts)`;
  else            detail = `Tendance neutre — signal inchangé`;

  return { score, delta, detail };
}

// ──────────────────────────────────────────────
// ALERTES DE TRANSITION — Modèle D(t) Grok
// D(t) = (joursAvant/365)×0.4 + (amplitude/20)×0.35 + (volatilite7j/25)×0.25
// ──────────────────────────────────────────────

// Amplitude de changement LP selon les éléments
const ELEMENT_AMPLITUDE: Record<Element, Record<Element, number>> = {
  Eau:   { Feu: 4, Bois: 1, Terre: 3, Métal: 2, Eau: 0 },
  Feu:   { Eau: 4, Métal: 3, Terre: 1, Bois: 2, Feu: 0 },
  Bois:  { Métal: 4, Terre: 3, Feu: 2, Eau: 1, Bois: 0 },
  Métal: { Feu: 3, Bois: 4, Eau: 2, Terre: 1, Métal: 0 },
  Terre: { Bois: 3, Eau: 2, Métal: 1, Feu: 1, Terre: 0 },
};

function calcTransitionUrgency(
  dScore: number,
): TransitionUrgency {
  if (dScore > 0.75) {
    return { score: Math.round(dScore * 100), category: 'Critique', color: '#ef4444', icon: '🔴' };
  }
  if (dScore > 0.55) {
    return { score: Math.round(dScore * 100), category: 'Majeur', color: '#f97316', icon: '🟠' };
  }
  return { score: Math.round(dScore * 100), category: 'Mineur', color: '#60a5fa', icon: '🔵' };
}

function calcDScore(daysAway: number, amplitude: number, sigma7j: number): number {
  return (
    (daysAway / 365) * 0.4 +
    (amplitude / 20) * 0.35 +
    (sigma7j / 25) * 0.25
  );
}

// Templates par type de transition
const TRANSITION_TEMPLATES: Record<TransitionAlert['type'], (months: number, extra?: string) => string> = {
  lp_change: (months, label) =>
    `Dans ${months} mois, tu entreras dans une décennie de ${label ?? 'nouveau cycle'}. Ce changement redéfinira ton environnement de long terme.`,
  pinnacle_end: (months) =>
    `Dans ${months} mois, tu termines un cycle Pinnacle. Une nouvelle priorité de vie émergera.`,
  py_transition: (months) =>
    `Dans ${months} mois, ton Année Personnelle change. Le thème énergétique de fond va évoluer.`,
  py9_to_1: (months) =>
    `Dans ${months} mois, tu clôtures un cycle de 9 ans et entres dans une phase de redémarrage majeur.`,
};

function buildTransitionAlerts(
  luckPillars: LuckPillarResult,
  num: NumerologyProfile,
  sigma7j: number,
  targetDate: Date,
): TransitionAlert[] {
  const alerts: TransitionAlert[] = [];
  const now = targetDate;

  // ── Alerte changement LP ──
  const currentLP = luckPillars.currentPillar;
  if (currentLP) {
    const yearsLeft = luckPillars.currentPillarYearsLeft;
    const monthsLeft = Math.round(yearsLeft * 12);

    if (monthsLeft < 12) {
      // Trouver le prochain pilier
      const nextIdx = currentLP.index + 1;
      const nextLP = luckPillars.pillars[nextIdx] ?? null;
      const amplitude = nextLP
        ? (ELEMENT_AMPLITUDE[currentLP.stem.element]?.[nextLP.stem.element] ?? 2)
        : 2;

      const daysAway = monthsLeft * 30;
      const dScore = calcDScore(daysAway, amplitude, sigma7j);
      const urgency = calcTransitionUrgency(dScore);

      alerts.push({
        type: 'lp_change',
        label: `Changement Pilier de Chance — ${currentLP.stem.element} → ${nextLP?.stem.element ?? '?'}`,
        monthsAway: monthsLeft,
        urgency,
        template: TRANSITION_TEMPLATES.lp_change(monthsLeft, nextLP?.theme),
      });
    }
  }

  // ── Alerte fin Pinnacle ──
  const activePinnIdx = num.pinnacles.findIndex((p, i) => {
    // Heuristique : le pinnacle actif est celui de l'âge actuel
    const age = now.getFullYear() - new Date(String(num.lp.v)).getFullYear();
    if (i === 0 && age < 36) return true;
    if (i === 1 && age >= 36 && age < 45) return true;
    if (i === 2 && age >= 45 && age < 54) return true;
    if (i === 3 && age >= 54) return true;
    return false;
  });
  // On ajoute une alerte Pinnacle si on est sur le dernier tiers du pinnacle
  // (heuristique simplifiée, sans recalcul complet de l'âge exact)

  // ── Alerte PY 9 → 1 ──
  if (num.py.v === 9) {
    const monthsToPYEnd = 12 - (now.getMonth() + 1);
    if (monthsToPYEnd < 3) {
      const dScore = calcDScore(monthsToPYEnd * 30, 8, sigma7j);
      const urgency = calcTransitionUrgency(dScore);
      alerts.push({
        type: 'py9_to_1',
        label: 'Clôture cycle 9 ans — redémarrage imminent',
        monthsAway: monthsToPYEnd,
        urgency,
        template: TRANSITION_TEMPLATES.py9_to_1(monthsToPYEnd),
      });
    }
  }

  // ── Alerte changement PY ──
  if (now.getMonth() >= 9) { // Oct-Déc : PY change dans < 3 mois
    const monthsToNewPY = 12 - (now.getMonth() + 1) + 1;
    if (monthsToNewPY <= 3 && num.py.v !== 9) {
      const dScore = calcDScore(monthsToNewPY * 30, 3, sigma7j);
      const urgency = calcTransitionUrgency(dScore);
      alerts.push({
        type: 'py_transition',
        label: `Transition Année Personnelle ${num.py.v} → ${num.py.v === 9 ? 1 : (num.py.v + 1)}`,
        monthsAway: monthsToNewPY,
        urgency,
        template: TRANSITION_TEMPLATES.py_transition(monthsToNewPY),
      });
    }
  }

  // Trier par urgence (score décroissant)
  return alerts.sort((a, b) => b.urgency.score - a.urgency.score);
}

// ──────────────────────────────────────────────
// SIGNAL LABEL
// ──────────────────────────────────────────────

function getSignalLabel(score: number): { label: string; color: string } {
  if (score >= 90) return { label: 'Cosmique',  color: '#E0B0FF' };
  if (score >= 80) return { label: 'Gold',      color: '#FFD700' };
  if (score >= 65) return { label: 'Favorable', color: '#4ade80' };
  if (score >= 40) return { label: 'Routine',   color: '#60a5fa' };
  if (score >= 25) return { label: 'Prudence',  color: '#9890aa' };
  return                  { label: 'Tempête',   color: '#ef4444' };
}

// ──────────────────────────────────────────────
// CALCUL PRINCIPAL
// ──────────────────────────────────────────────

/**
 * Calcule les 3 canaux temporels + CI + Potentiel + Alertes.
 *
 * @param input         Données de convergence + piliers
 * @param sigma7j       Volatilité des 7 derniers jours (0 = pas de données)
 * @param coherenceRatio Ratio de cohérence des systèmes (0-1, défaut 0.7)
 */
export function calcTemporalLayers(
  input: TemporalLayersInput,
  sigma7j: number = 10,
  coherenceRatio: number = 0.7,
): TemporalLayersResult {
  const { luckPillars, num, currentScore, targetDate = new Date() } = input;

  // ── CANAL FOND ──
  const currentLP = luckPillars.currentPillar;
  const fondLabel: FondLabel = currentLP
    ? lpElementToFondLabel(
        currentLP.stem.element,
        currentLP.themeKey,
        luckPillars.currentPillarYearsLeft,
      )
    : 'Consolidation';

  const fond: FondChannel = {
    label: fondLabel,
    polarity: FOND_POLARITY_MAP[fondLabel],
    detail: FOND_DETAILS[fondLabel],
    luckPillar: currentLP,
    pillarYearsLeft: luckPillars.currentPillarYearsLeft,
    dominantElement: currentLP?.stem.element ?? null,
  };

  // ── CANAL TENDANCE ──
  const pyv = num.py.v;
  const pmv = num.pm.v;
  const pyScore = (PY_SCORE[pyv] ?? 0) * 0.5;   // PY 50%
  const pmScore = (PM_SCORE[pmv] ?? 0) * 0.3;   // PM 30%
  const tendanceRaw = pyScore + pmScore;          // Cohérence 20% laissée à 0 (pas de données historiques)
  const tendanceScore = Math.max(-10, Math.min(10, Math.round(tendanceRaw * 2))); // Rescale vers [-10, +10]
  const tendanceLabel: TendanceLabel = PY_TO_TENDANCE[pyv] ?? 'Construction';

  const tendance: TendanceChannel = {
    label: tendanceLabel,
    score: tendanceScore,
    polarity: tendanceScore >= 0 ? '+' : '-',
    detail: `PY ${pyv} (${pyScore > 0 ? '+' : ''}${pyScore.toFixed(0)}pts) · PM ${pmv} (${pmScore > 0 ? '+' : ''}${pmScore.toFixed(0)}pts)`,
    pyContrib: pyScore,
    pmContrib: pmScore,
  };

  // ── CANAL SIGNAL ──
  const { label, color } = getSignalLabel(currentScore);
  const signal: SignalChannel = {
    score: currentScore,
    label,
    labelColor: color,
  };

  // ── POTENTIEL D'ACTION ──
  const potentiel = calcPotentielAction(currentScore, tendanceScore);

  // ── CI(t) ──
  const ci = {
    today:      calcCI(0,    coherenceRatio, sigma7j),
    at6months:  calcCI(180,  coherenceRatio, sigma7j),
    at12months: calcCI(365,  coherenceRatio, sigma7j),
    at24months: calcCI(730,  coherenceRatio, sigma7j),
    at36months: calcCI(1095, coherenceRatio, sigma7j),
  };

  // ── ALERTES DE TRANSITION ──
  const transitions = buildTransitionAlerts(luckPillars, num, sigma7j, targetDate);

  return {
    fond,
    tendance,
    signal,
    potentiel,
    ci,
    transitions,
    sigma7j,
    coherenceRatio,
  };
}

/**
 * Helper : calcule la CI à un horizon quelconque.
 */
export function calcCIAtDays(
  days: number,
  coherenceRatio: number = 0.7,
  sigma7j: number = 10,
): TemporalCI {
  return calcCI(days, coherenceRatio, sigma7j);
}
