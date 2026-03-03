// ═══ CONVERGENCE STRATÉGIQUE ENGINE V4.9 — ORCHESTRATEUR L3 ═══
// V6.0 Step 5 : Split en 4 fichiers (convergence.types.ts / convergence-daily.ts / convergence-slow.ts / convergence.ts)
// Ce fichier (L3) contient : helpers de scoring, calcDayPreview, calcMonthPreviews,
//   calcConvergence (orchestrateur), generateForecast36Months, debug
//
// ARCHITECTURE V6.0 (inchangée algorithmiquement) :
//   L1 calcDailyModules()  → modules quotidiens (Num, BaZi, IChing, Lune, Transits…)
//   L2 calcSlowModules()   → cycles lents (Returns, Progressions, Dasha, SR, Éclipses, R21-R27, ×terrain)
//   L3 calcConvergence()   → assemblage final (compress, domaines, rarity, CI, ConvergenceResult)

import { type NumerologyProfile, isMaster, calcPersonalDay, calcPersonalYear, calcPersonalMonth, getActivePinnacleIdx } from './numerology';
import { type AstroChart, calcPersonalTransits, getPlanetLongitudeForDate } from './astrology';
import { calcProgressions } from './progressions';
import { extractNatalReturnLongs, interpolateReturnIntensity } from './returns';
import { type ChineseZodiac } from './chinese-zodiac';
import { type IChingReading, calcIChing, nuclearHexScore } from './iching';
import { getMoonPhase, getMoonTransit, getMercuryStatus, getLunarEvents, getPlanetaryRetroScore, getVoidOfCourseMoon, type VoidOfCourseMoon } from './moon';
import { calcBaZiDaily, calc10Gods, type DayMasterDailyResult, type TenGodsResult, getPeachBlossom, getChangsheng, checkShenSha, getNaYin, type ChangshengResult, type ShenShaResult, type NaYinResult } from './bazi';
import { calcInteractions, buildInteractionContext } from './interactions';
import { calcNakshatra, getAyanamsa } from './nakshatras';
import { calcCurrentDasha, calcDashaScore } from './vimshottari';
import { getModuleDomainWeight } from './domain-weights';
import {
  ALGO_VERSION, SLOW_PLANETS,
  type ScoreLevel, type DayType, type DayTypeInfo, type ActionVerb, type ActionReco,
  type ClimateScale, type ClimateResult,
  type LifeDomain, type DomainScore, type ContextualScores,
  type RarityResult, type TurbulenceIndex, type OutlierFlag, type ConfidenceInterval,
  type DayPreview, type SystemBreakdown, type ConvergenceResult, type TemporalConfidence,
  type ActionWindow, type ForecastAlert, type MonthForecast,
} from './convergence.types';
// Re-exports — types consommés par App, CalendarTab, ForecastTab, strategic-reading, etc.
export type { ScoreLevel, DayType, DayTypeInfo, ActionVerb, ActionReco, ClimateScale, ClimateResult,
  LifeDomain, DomainScore, ContextualScores, RarityResult, TurbulenceIndex, OutlierFlag, ConfidenceInterval,
  DayPreview, SystemBreakdown, ConvergenceResult, TemporalConfidence, ActionWindow, ForecastAlert, MonthForecast,
} from './convergence.types';
export type { VoidOfCourseMoon } from './moon';
import {
  calcDailyModules, calcDayType, ichingScoreV4, calcMoonScore, getNaYinAffinityFactor,
  type DailyModuleResult,
} from './convergence-daily';
import { calcSlowModules } from './convergence-slow';

// ══════════════════════════════════════
// ═══ CONSTANTES INTERNES ═══
// ══════════════════════════════════════

const THEMES: Record<number, string> = {
  1: 'action', 2: 'réceptivité', 3: 'expression', 4: 'structure',
  5: 'liberté', 6: 'amour', 7: 'introspection', 8: 'pouvoir',
  9: 'lâcher-prise', 11: 'intuition', 22: 'vision', 33: 'guérison'
};

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ══════════════════════════════════════
// ═══ COMPRESSION — tanh sigmoïdale V9 ═══
// ══════════════════════════════════════

function compress(delta: number): number {
  // compress V8 — loi de puissance calibrée (p=1.05, quasi-linéaire)
  // REVERT Sprint 1 V9 : compress_v2 tanh(2.2 * x^0.7) était concave (p<1)
  //   → boostait les deltas modérés vers Cosmique (202 Cosmique/an observés !)
  //   → paramètres k=2.2, p=0.7 faisaient l'inverse de l'intention
  // TODO Sprint 2 : recalibrer tanh avec p>1 (convexe) sur distribution simulée
  // compress(0)=50, output∈[5,97]
  const maxDelta = 22; // V8.9 GPT Q5 : 18→22 pour calibrer distribution (cible ≥88 ~1.5%, <25 ~6%)
  const sign = Math.sign(delta);
  const normalized = Math.min(Math.abs(delta) / maxDelta, 1);
  return Math.round(50 + 45 * sign * Math.pow(normalized, 1.05));
}

/** Inverse approx de compress() — retourne le delta correspondant à un score donné.
 *  V8.9 GPT Q4 : utilisé pour computeScoreRange (calcul en delta-space, pas score-space). */
function decompressApprox(score: number, maxDelta = 22, p = 1.05): number {
  const d = score - 50;
  if (d === 0) return 0;
  const u = Math.pow(Math.abs(d) / 45, 1 / p);
  return maxDelta * Math.sign(d) * u;
}

// ══════════════════════════════════════
// ═══ NIVEAUX DE SCORE (6 niveaux) ═══
// ══════════════════════════════════════

function getScoreLevel(score: number, mercuryPts: number): ScoreLevel {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const variant = dayOfYear % 3;

  if (score === 50) {
    return {
      name: '☯ Équilibre parfait', icon: '☯', color: '#60a5fa',
      narrative: "Ton corps est au point zéro — ni tension ni élan. C'est une page blanche sensorielle : chaque micro-décision pèsera plus lourd que d'habitude."
    };
  }
  if (score >= 88 && mercuryPts < 0) {
    return {
      name: '⚡ Convergence rare', icon: '⚡', color: '#E0B0FF',
      narrative: "Tu sens une puissance brute dans la poitrine, mais ta gorge bloque — les mots veulent sortir trop vite. Agis en silence, relis avant d'envoyer, et laisse la force couler sans bruit."
    };
  }
  if (score >= 88) {
    const narratives = [
      "Ton corps vibre à une fréquence que tu reconnais immédiatement : tout est ouvert. La poitrine est large, le souffle profond, la vision nette. Bouge maintenant — cette fenêtre ne dure pas.",
      "Une chaleur dorée irradie depuis le plexus solaire. Chaque pas semble plus léger, chaque décision plus évidente. C'est le jour où tu signes, tu lances, tu oses.",
      "Tu te réveilles avec cette certitude rare dans les os : aujourd'hui, le courant te porte. Ne résiste pas, ne planifie pas — surfe."
    ];
    return { name: '⚡ Convergence rare', icon: '⚡', color: '#E0B0FF', narrative: narratives[variant] };
  }
  if (score >= 80) {
    const narratives = [
      "Le vent souffle dans ton dos — tu le sens physiquement entre les omoplates. L'énergie est là, dense et disponible. Avance avec confiance, les résistances fondent.",
      "Tes mains veulent créer, ta voix porte plus loin que d'habitude. C'est un jour d'exécution rapide — les portes s'ouvrent avant que tu ne frappes.",
      "Une clarté mentale inhabituellement aiguë, comme si le brouillard s'était levé d'un coup. Profites-en pour les décisions que tu repousses depuis des jours."
    ];
    return { name: '🌟 Alignement fort', icon: '🌟', color: '#FFD700', narrative: narratives[variant] };
  }
  if (score >= 65) {
    const narratives = [
      "Le corps est coopératif — pas de tension parasite, pas de fatigue fantôme. L'énergie coule régulièrement. Bonne fenêtre pour exécuter ce qui est déjà planifié.",
      "Tu ressens un calme productif dans la mâchoire et les épaules. Pas d'euphorie, mais un socle solide. Avance à ton rythme — le terrain est stable.",
      "Les gestes sont fluides, les conversations tombent juste. Rien de spectaculaire, mais tout fonctionne. Maintiens le cap sans forcer."
    ];
    return { name: '✦ Bonne fenêtre', icon: '✦', color: '#4ade80', narrative: narratives[variant] };
  }
  if (score >= 40) {
    const narratives = [
      "L'énergie est plate — ni porteuse, ni bloquante. Ton corps te dit : pas de grands gestes aujourd'hui. Tête baissée, Deep Work, avance sur ce qui ne demande pas d'inspiration.",
      "Tu sens une légère lourdeur dans les jambes, un rythme plus lent que d'habitude. C'est un jour de maintenance — range, classe, prépare le terrain pour demain.",
      "Les sensations sont en sourdine. Pas de signal fort dans aucune direction. Concentre-toi sur l'essentiel et économise ton énergie pour les fenêtres à venir."
    ];
    return { name: '☉ Flux ordinaire', icon: '☉', color: '#60a5fa', narrative: narratives[variant] };
  }
  if (score >= 25) {
    const narratives = [
      "Une tension sourde dans la nuque — ton corps résiste avant même que tu commences. Ne force pas les portes fermées. Reporte les signatures, les confrontations, les paris.",
      "Le souffle est court, les pensées tournent en boucle. Les cycles sont désynchronisés. Ralentis, observe, note ce qui coince — mais n'agis pas dessus maintenant.",
      "Tu sens une friction invisible sur chaque initiative. Comme marcher dans du sable. Avance avec tact, protège tes arrières, et garde l'énergie pour le rebond."
    ];
    return { name: '☽ Énergie basse', icon: '☽', color: '#9890aa', narrative: narratives[variant] };
  }
  const narratives = [
    "Ton corps tire le frein à main — écoute-le. Reste dans ta forteresse. Annule ce qui peut l'être, reporte le reste. Ce n'est pas de la faiblesse, c'est de l'intelligence tactique.",
    "Une lourdeur dans tout le corps, comme un orage intérieur. Les cycles sont en collision. Aujourd'hui tu protèges, tu ne conquiers pas. Demain le ciel se dégage.",
    "Tout résiste : l'énergie, la concentration, la patience. Journée de haute turbulence sensorielle. Un seul objectif : traverser sans casse. Le rebond arrive."
  ];
  return { name: '⛈ Temps de retrait', icon: '⛈', color: '#ef4444', narrative: narratives[variant] };
}

function scoreLevelColor(score: number): string {
  if (score >= 88) return '#E0B0FF';
  if (score >= 80) return '#FFD700';
  if (score >= 65) return '#4ade80';
  if (score >= 40) return '#60a5fa';
  if (score >= 25) return '#9890aa';
  return '#ef4444';
}

// ══════════════════════════════════════
// ═══ ACTION RECOMMANDÉE ═══
// ══════════════════════════════════════

const ACTION_DEFS: Record<ActionVerb, Omit<ActionReco, 'conseil'>> = {
  lance:   { verb: 'lance',   icon: '🚀', label: 'LANCE',   color: '#4ade80' },
  prepare: { verb: 'prepare', icon: '🔧', label: 'PRÉPARE', color: '#60a5fa' },
  observe: { verb: 'observe', icon: '👁',  label: 'OBSERVE', color: '#D4AF37' },
  protege: { verb: 'protege', icon: '🛡',  label: 'PROTÈGE', color: '#9370DB' },
};

function calcActionReco(dayType: DayTypeInfo, score: number, hexKeyword: string): ActionReco {
  let verb: ActionVerb;
  if (score >= 75 && (dayType.type === 'decision' || dayType.type === 'expansion' || dayType.type === 'communication')) {
    verb = 'lance';
  } else if (score >= 55 && (dayType.type === 'decision' || dayType.type === 'expansion' || dayType.type === 'communication')) {
    verb = 'prepare';
  } else if (score >= 40) {
    verb = 'observe';
  } else {
    verb = 'protege';
  }
  if (dayType.type === 'retrait') verb = score >= 55 ? 'observe' : 'protege';

  const def = ACTION_DEFS[verb];
  const conseils: Record<ActionVerb, string[]> = {
    lance: [
      `Feu vert — agissez sur vos décisions clés. ${hexKeyword}.`,
      `Conditions optimales pour lancer, signer, avancer. ${hexKeyword}.`,
      `L'alignement est fort — c'est le moment d'agir avec conviction. ${hexKeyword}.`,
    ],
    prepare: [
      `Bon timing pour structurer et planifier vos prochaines actions. ${hexKeyword}.`,
      `Préparez le terrain — les conditions mûrissent en votre faveur. ${hexKeyword}.`,
      `Organisez, testez, validez — le lancement viendra bientôt. ${hexKeyword}.`,
    ],
    observe: [
      `Journée d'écoute et d'analyse. Collectez l'information avant d'agir. ${hexKeyword}.`,
      `Pas de précipitation — observez les signaux et ajustez votre stratégie. ${hexKeyword}.`,
      `Le moment n'est pas à l'action mais à la compréhension. ${hexKeyword}.`,
    ],
    protege: [
      `Journée défensive — consolidez vos acquis et évitez les risques inutiles. ${hexKeyword}.`,
      `Protégez votre énergie et vos positions. Reportez les décisions majeures. ${hexKeyword}.`,
      `Repli stratégique — ce n'est pas une faiblesse, c'est de l'intelligence. ${hexKeyword}.`,
    ],
  };
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const conseil = conseils[verb][dayOfYear % conseils[verb].length];
  return { ...def, conseil };
}

// ══════════════════════════════════════
// ═══ CLIMAT ═══
// ══════════════════════════════════════

function mapClimate(numValue: number, _scale: string): ClimateScale {
  if ([1, 3, 8].includes(numValue)) return { label: 'Expansion', icon: '🚀', color: '#4ade80', desc: 'Période de croissance et d\'opportunités' };
  if ([5, 11, 22, 33].includes(numValue)) return { label: 'Mouvement', icon: '🌊', color: '#60a5fa', desc: 'Changements et nouvelles directions' };
  if ([2, 6].includes(numValue)) return { label: 'Harmonie', icon: '☀️', color: '#f59e0b', desc: 'Période relationnelle et collaborative' };
  if ([4].includes(numValue)) return { label: 'Structure', icon: '🏗️', color: '#9890aa', desc: 'Construction et consolidation' };
  if ([7, 9].includes(numValue)) return { label: 'Intériorité', icon: '🧘', color: '#c084fc', desc: 'Introspection et finalisation' };
  return { label: 'Transition', icon: '⚖️', color: '#71717a', desc: 'Phase intermédiaire' };
}

function calcClimate(num: NumerologyProfile): ClimateResult {
  return {
    week: mapClimate(num.ppd.v, 'week'),
    month: mapClimate(num.pm.v, 'month'),
    year: mapClimate(num.py.v, 'year'),
  };
}

// ══════════════════════════════════════
// ═══ 6 DOMAINES CONTEXTUELS ═══
// ══════════════════════════════════════

const DOMAIN_META: Record<LifeDomain, { label: string; icon: string; color: string }> = {
  BUSINESS:      { label: 'Business',      icon: '💼', color: '#4ade80' },
  AMOUR:         { label: 'Amour',         icon: '❤️', color: '#f472b6' },
  RELATIONS:     { label: 'Relations',     icon: '🤝', color: '#60a5fa' },
  CREATIVITE:    { label: 'Créativité',    icon: '✨', color: '#f59e0b' },
  INTROSPECTION: { label: 'Introspection', icon: '🧘', color: '#c084fc' },
  VITALITE:      { label: 'Vitalité',      icon: '⚡', color: '#fb923c' },
};

// V6.1 — DOMAIN_AFFINITY révisée (GPT R6) : suppression négatifs excessifs,
// cohérence symbolique restaurée (I Ching=oracle intérieur, BaZi=relationnel, Mercure≠INTROSPECTION négatif)
const DOMAIN_AFFINITY: Record<string, Record<LifeDomain, number>> = {
  'Numérologie':      { BUSINESS: 0.8,  AMOUR: 0.3,  RELATIONS: 0.5,  CREATIVITE: 0.7,  INTROSPECTION: 0.4,  VITALITE: 0.6  },
  'I Ching':          { BUSINESS: 0.1,  AMOUR: 0.2,  RELATIONS: 0.2,  CREATIVITE: 0.9,  INTROSPECTION: 1.0,  VITALITE: 0.1  },
  'BaZi':             { BUSINESS: 1.0,  AMOUR: 0.4,  RELATIONS: 0.5,  CREATIVITE: 0.3,  INTROSPECTION: 0.4,  VITALITE: 0.8  },
  '10 Gods':          { BUSINESS: 1.0,  AMOUR: 0.6,  RELATIONS: 0.8,  CREATIVITE: 0.5,  INTROSPECTION: 0.3,  VITALITE: 0.3  },
  'Lune':             { BUSINESS: -0.2, AMOUR: 1.0,  RELATIONS: 0.8,  CREATIVITE: 0.8,  INTROSPECTION: 1.0,  VITALITE: 0.9  },
  'Transit Lunaire':  { BUSINESS: -0.1, AMOUR: 0.7,  RELATIONS: 1.0,  CREATIVITE: 0.4,  INTROSPECTION: 0.6,  VITALITE: 1.0  },
  'Mercure':          { BUSINESS: 1.0,  AMOUR: 0.6,  RELATIONS: 0.9,  CREATIVITE: 0.2,  INTROSPECTION: 0.3,  VITALITE: 0.4  },
  'Nœuds Lunaires':   { BUSINESS: 0.2,  AMOUR: 0.4,  RELATIONS: 0.6,  CREATIVITE: 0.3,  INTROSPECTION: 1.0,  VITALITE: 0.2  },
  'Planètes':         { BUSINESS: 0.6,  AMOUR: 0.7,  RELATIONS: 0.6,  CREATIVITE: 0.5,  INTROSPECTION: 0.5,  VITALITE: 0.5  },
  'Astrologie':       { BUSINESS: 0.3,  AMOUR: 0.6,  RELATIONS: 0.5,  CREATIVITE: 0.6,  INTROSPECTION: 0.9,  VITALITE: 0.3  },
  'Type de Jour':     { BUSINESS: 0.6,  AMOUR: 0.2,  RELATIONS: 0.4,  CREATIVITE: 0.6,  INTROSPECTION: 0.3,  VITALITE: 0.6  },
  'Peach Blossom':    { BUSINESS: 0.0,  AMOUR: 1.0,  RELATIONS: 0.9,  CREATIVITE: 0.4,  INTROSPECTION: 0.1,  VITALITE: 0.5  },
  'Changsheng':       { BUSINESS: 0.7,  AMOUR: 0.3,  RELATIONS: 0.3,  CREATIVITE: 0.2,  INTROSPECTION: 0.2,  VITALITE: 1.0  },
  'Shen Sha':         { BUSINESS: 0.6,  AMOUR: 0.6,  RELATIONS: 0.6,  CREATIVITE: 0.5,  INTROSPECTION: 0.4,  VITALITE: 0.4  },
  'Nakshatra':        { BUSINESS: 0.5,  AMOUR: 0.5,  RELATIONS: 0.5,  CREATIVITE: 0.5,  INTROSPECTION: 0.5,  VITALITE: 0.5  },
};

const DOMAIN_DIRECTIVES: Record<LifeDomain, { haut: string; bon: string; neutre: string; bas: string }> = {
  BUSINESS:      { haut: 'Feu vert pour signer, négocier et lancer.', bon: 'Avance tes dossiers — le terrain est porteur.', neutre: 'Exécute le courant, reporte les décisions lourdes.', bas: 'Pas de signature ni d\'engagement aujourd\'hui.' },
  AMOUR:         { haut: 'Déclare, invite, ose — le cœur est aligné.', bon: 'Bon moment pour connecter et approfondir.', neutre: 'Présence tranquille — pas de grandes déclarations.', bas: 'Protège ton énergie émotionnelle aujourd\'hui.' },
  RELATIONS:     { haut: 'Réseaute, allie-toi, fédère — ton charisme rayonne.', bon: 'Tes échanges seront fluides — profites-en.', neutre: 'Maintiens tes relations sans forcer de nouveau contact.', bas: 'Risque de malentendu — choisis tes mots avec soin.' },
  CREATIVITE:    { haut: 'Crée, innove, écris — l\'inspiration coule.', bon: 'Bonne énergie créative — exploite-la.', neutre: 'Peaufine l\'existant plutôt que de créer du neuf.', bas: 'Pas le jour pour brainstormer — recharge.' },
  INTROSPECTION: { haut: 'Journée idéale pour méditer, planifier et voir clair.', bon: 'Ton intuition est fiable — écoute-la.', neutre: 'Garde un moment calme dans ta journée.', bas: 'L\'agitation extérieure domine — dur de se poser.' },
  VITALITE:      { haut: 'Énergie physique au top — bouge, agis, entreprends.', bon: 'Bonne forme — gère ton rythme intelligemment.', neutre: 'Énergie stable — pas d\'excès.', bas: 'Corps en retrait — repos et récupération.' },
};

function getDomainDirective(domain: LifeDomain, score: number): string {
  const d = DOMAIN_DIRECTIVES[domain];
  if (score >= 75) return d.haut;
  if (score >= 55) return d.bon;
  if (score >= 40) return d.neutre;
  return d.bas;
}

function calculateContextualScores(
  breakdown: { system: string; points: number }[],
  globalScore: number = 50,
  pyv: number = 0,
  pmv: number = 0,
  directBonuses?: Partial<Record<LifeDomain, number>>,
  nakshatraMods?: Record<string, number>
): ContextualScores {
  const allDomains: LifeDomain[] = ['BUSINESS', 'AMOUR', 'RELATIONS', 'CREATIVITE', 'INTROSPECTION', 'VITALITE'];
  const domainRaw: Record<LifeDomain, number> = {
    BUSINESS: 0, AMOUR: 0, RELATIONS: 0, CREATIVITE: 0, INTROSPECTION: 0, VITALITE: 0,
  };

  breakdown.forEach(b => {
    if (b.points === 0) return;
    const affinities = DOMAIN_AFFINITY[b.system];
    if (!affinities) return;
    allDomains.forEach(domain => {
      const weight = getModuleDomainWeight(b.system, domain);
      domainRaw[domain] += b.points * affinities[domain] * weight;
    });
  });

  if (directBonuses) {
    allDomains.forEach(domain => {
      domainRaw[domain] += (directBonuses[domain] || 0);
    });
  }

  if (nakshatraMods) {
    const DOMAIN_TO_NAK: Record<LifeDomain, string> = {
      BUSINESS: 'Business', AMOUR: 'Amour', RELATIONS: 'Relations',
      CREATIVITE: 'Créativité', INTROSPECTION: 'Introspection', VITALITE: 'Vitalité',
    };
    allDomains.forEach(domain => {
      const mod = nakshatraMods[DOMAIN_TO_NAK[domain]] ?? 1.0;
      domainRaw[domain] *= mod;
    });
  }

  // V6.1 — CYCLE_DOMAIN_BIAS enrichi (GPT R6) : PY5/PY9 ajoutés, biais complets
  const CYCLE_DOMAIN_BIAS: Record<number, Partial<Record<LifeDomain, number>>> = {
    1:  { BUSINESS: 3, VITALITE: 2, CREATIVITE: 1 },
    2:  { AMOUR: 3, RELATIONS: 2, INTROSPECTION: 1 },
    3:  { CREATIVITE: 3, RELATIONS: 2, AMOUR: 1 },
    4:  { BUSINESS: 2, VITALITE: 2, INTROSPECTION: 1 },
    5:  { VITALITE: 3, RELATIONS: 2, BUSINESS: 1 },
    6:  { AMOUR: 3, RELATIONS: 3 },
    7:  { INTROSPECTION: 3, CREATIVITE: 1 },
    8:  { BUSINESS: 4, VITALITE: 2 },
    9:  { AMOUR: 2, RELATIONS: 2, INTROSPECTION: 2 },
    11: { CREATIVITE: 3, INTROSPECTION: 1 },
    22: { BUSINESS: 3, CREATIVITE: 1 },
    33: { AMOUR: 2, RELATIONS: 2 },
  };
  const pyBias = CYCLE_DOMAIN_BIAS[pyv] || {};
  const pmBias = CYCLE_DOMAIN_BIAS[pmv] || {};
  allDomains.forEach(domain => {
    domainRaw[domain] += (pyBias[domain] || 0) * 0.6;
    domainRaw[domain] += (pmBias[domain] || 0) * 0.4;
  });

  // V6.1 Sprint GPT R7 : ancrage affaibli (weight=0.35) + amplification écart ×0.15
  // Avant : ancrage fort → CRÉATIVITÉ 85 raw → 68 avec global=45 (écart 18)
  // Après : ancrage faible → CRÉATIVITÉ 85 raw → 75 avec global=45 (écart 26, directive change)
  const TAU_DOMAIN = 21.0;
  const domains: DomainScore[] = allDomains.map(domain => {
    const domainScore = Math.max(5, Math.min(97, Math.round(50 + 50 * Math.tanh(domainRaw[domain] / TAU_DOMAIN))));
    if (isNaN(domainScore) || domainScore < 0 || domainScore > 100) {
      console.error('[Kaironaute] Tanh compression failure:', domain, domainRaw[domain]);
    }
    // Ancrage pondéré partiel (0.35) puis amplification écart (0.15)
    const anchored = domainScore * 0.65 + globalScore * 0.35;
    const spread   = anchored + (anchored - globalScore) * 0.15;
    const score    = Math.max(5, Math.min(97, Math.round(spread)));
    return {
      domain,
      ...DOMAIN_META[domain],
      score,
      directive: getDomainDirective(domain, score),
    };
  });

  const sorted = [...domains].sort((a, b) => b.score - a.score);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];
  const diff = best.score - worst.score;

  let conseil: string;
  if (diff <= 10) {
    conseil = `Énergie équilibrée — tous les domaines sont alignés aujourd'hui.`;
  } else if (diff <= 25) {
    conseil = `${best.icon} ${best.label} à ${best.score}% — capitalise là. ${worst.icon} ${worst.label} à ${worst.score}% — temporise.`;
  } else {
    conseil = `${best.icon} ${best.label} en zone haute (${best.score}%). Évite les décisions critiques en ${worst.label} (${worst.score}%).`;
  }

  return { domains, bestDomain: best.domain, worstDomain: worst.domain, conseil };
}

// ══════════════════════════════════════
// ═══ RARITY INDEX — Monte Carlo ═══
// ══════════════════════════════════════

export { ALGO_VERSION };

let _mcCache: { key: string; year: number; scores: number[] } | null = null;
export function clearRarityCache(): void { _mcCache = null; }

function buildCacheKey(bd: string, todayStr: string): string {
  return `${bd}_${todayStr}`;
}

function getYearScores(bd: string, num: NumerologyProfile, cz: ChineseZodiac, transitBonus: number): number[] {
  const year = new Date().getFullYear();
  const todayForKey = getTodayStr();
  const cacheKey = buildCacheKey(bd, todayForKey);
  if (_mcCache && _mcCache.key === cacheKey && _mcCache.year === year) return _mcCache.scores;

  // V8 : simulation MC cœur prédictif — BaZi + Nakshatra uniquement
  // PD/IChing/Mercure/Trinity retirés (narratif V8 — R25)
  // Nakshatra ajouté (signal prédictif Tier 1 — R24+R25)

  // Pré-calcul natal Nakshatra lord (constant pour l'utilisateur)
  let natalNakLord: string | null = null;
  try {
    const natalMoonMC = getMoonPhase(new Date(bd + 'T12:00:00'));
    const natalAyanMC = getAyanamsa(new Date(bd + 'T12:00:00').getFullYear());
    const natalSidMC = ((natalMoonMC.longitudeTropical - natalAyanMC) % 360 + 360) % 360;
    natalNakLord = calcNakshatra(natalSidMC).lord;
  } catch { /* silent */ }

  const scores: number[] = [];
  for (let m = 1; m <= 12; m++) {
    const daysInMonth = new Date(year, m, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      let delta = 0;

      // BaZi DM (±6) — signal prédictif Tier 1
      try {
        const birthD = new Date(bd + 'T12:00:00');
        const dayD = new Date(ds + 'T12:00:00');
        const baziMC = calcBaZiDaily(birthD, dayD, 50);
        delta += Math.max(-6, Math.min(6, Math.round(baziMC.totalScore * 2)));
      } catch { /* silent */ }

      // Nakshatra (±7) — signal prédictif Tier 1, granularité ~27h
      try {
        const moonDMC = getMoonPhase(new Date(ds + 'T12:00:00'));
        const ayanMC = getAyanamsa(year);
        const moonSidMC = ((moonDMC.longitudeTropical - ayanMC) % 360 + 360) % 360;
        const nakMC = calcNakshatra(moonSidMC);
        const nakQualMC = nakMC.globalBaseScore;
        let r25mc = 0;
        if (nakQualMC !== 0) {
          const isHarmonic = nakQualMC > 0;
          const lord = nakMC.lord;
          if (lord === 'Rahu')      r25mc = isHarmonic ? 4 : -4;
          else if (lord === 'Ketu') r25mc = isHarmonic ? 2 : -3;
          else                       r25mc = isHarmonic ? 3 : -3;
        }
        // R27 : résonance lord natal (pré-calculé, stable pour l'utilisateur)
        let r27mc = 0;
        if (natalNakLord && nakMC.lord === natalNakLord && nakMC.globalBaseScore !== 0) {
          r27mc = nakMC.globalBaseScore > 0 ? 6 : -6;
        }
        delta += Math.max(-7, Math.min(7, r25mc + r27mc));
      } catch { /* silent */ }

      scores.push(Math.max(5, Math.min(97, compress(Math.max(-22, Math.min(22, delta))))));
    }
  }

  _mcCache = { key: cacheKey, year, scores };
  return scores;
}

/** V8.9 GPT Q3 : correction statique du Rarity Index par Monte Carlo.
 *  Construit une baseline L1+L2 simulée pour comparer le score full (L1+L2+L3)
 *  à une distribution équitable — évite l'asymétrie L1-only vs full score. */
function buildCorrectedBaseline(yearScoresL1: number[], samplesPerDay = 8): number[] {
  const corrected: number[] = [];
  for (const sL1 of yearScoresL1) {
    const d1 = decompressApprox(sL1);
    for (let k = 0; k < samplesPerDay; k++) {
      const offsetPts = (Math.random() - 0.5) * 8;   // Uniform[-4, +4]
      const ctxMult   = 0.95 + Math.random() * 0.10; // Uniform[0.95, 1.05]
      corrected.push(compress((d1 + offsetPts) * ctxMult));
    }
  }
  return corrected;
}

function computeRarityIndex(
  currentScore: number, positiveSystemCount: number, totalSystemCount: number,
  bd: string, num: NumerologyProfile, cz: ChineseZodiac, transitBonus: number
): RarityResult {
  const yearScoresL1  = getYearScores(bd, num, cz, transitBonus);
  // V8.9 GPT Q3 : baseline corrigée (L1 + simulation L2) pour éviter biais asymétrique
  const baseline      = buildCorrectedBaseline(yearScoresL1);
  const higherOrEqual = baseline.filter(s => s >= currentScore).length;
  const percentage    = Math.max(0.1, (higherOrEqual / baseline.length) * 100);
  const rank          = baseline.filter(s => s > currentScore).length + 1;
  let label: string, icon: string;
  if (percentage <= 1) { label = 'Extrêmement rare'; icon = '💎'; }
  else if (percentage <= 5) { label = 'Rare'; icon = '🌟'; }
  else if (percentage <= 15) { label = 'Peu commun'; icon = '✦'; }
  else if (percentage <= 50) { label = 'Modéré'; icon = '◆'; }
  else { label = 'Courant'; icon = '○'; }
  return { percentage: Math.round(percentage * 10) / 10, label, activeSignals: positiveSystemCount, totalSignals: totalSystemCount, icon, rank };
}

// ══════════════════════════════════════
// ═══ CONSEIL CONTEXTUEL ═══
// ══════════════════════════════════════

function buildConseil(dayType: DayTypeInfo, score: number, hexName: string, hexKeyword: string): string {
  const t = dayType.type;
  if (score >= 88) {
    if (t === 'decision')      return `⚡ CONVERGENCE RARE — Prenez LA décision que vous repoussez. ${hexName} (${hexKeyword}) confirme : ce moment est rare.`;
    if (t === 'communication') return `⚡ CONVERGENCE RARE — Pouvoir de persuasion maximal. L'hexagramme ${hexName} amplifie chaque mot.`;
    if (t === 'expansion')     return `⚡ CONVERGENCE RARE — Convergence totale vers la croissance. Lancez maintenant.`;
    if (t === 'observation')   return `⚡ CONVERGENCE RARE — Lucidité à son apogée. Les insights d'aujourd'hui valent de l'or.`;
    return `⚡ CONVERGENCE RARE — Même en retrait, l'énergie est exceptionnelle. Semez avec intention.`;
  }
  if (score >= 80) {
    if (t === 'decision')      return `Conditions exceptionnelles pour décider. ${hexName} (${hexKeyword}) : c'est le moment d'agir.`;
    if (t === 'communication') return `Journée idéale pour négocier et tisser des alliances. ${hexName} amplifie vos échanges.`;
    if (t === 'expansion')     return `Toutes les énergies convergent vers la croissance. ${hexName} soutient vos ambitions.`;
    return `Journée de recul dans des conditions positives. Rechargez vos batteries stratégiques.`;
  }
  if (score >= 65) {
    if (t === 'decision')      return `Bonne fenêtre pour décider. ${hexName} (${hexKeyword}) vous encourage à avancer.`;
    if (t === 'communication') return `Énergie porteuse pour les échanges. ${hexName} favorise le dialogue.`;
    return `Le courant est porteur. Maintenez le cap. ${hexName} soutient l'élan.`;
  }
  if (score >= 40) {
    if (t === 'decision')      return `Vous pouvez décider, mais vérifiez vos données. ${hexName} (${hexKeyword}) appelle à la prudence mesurée.`;
    return `L'énergie est stable. ${hexName} (${hexKeyword}) invite à se concentrer sur l'essentiel.`;
  }
  if (score >= 25) {
    if (t === 'decision')      return `Journée de décision en conditions tendues. ${hexName} (${hexKeyword}) : ne décidez que si c'est urgent.`;
    return `L'énergie résiste. ${hexName} (${hexKeyword}) recommande la prudence.`;
  }
  return `Repli stratégique. ${hexName} (${hexKeyword}) signale des vents contraires — préservez votre énergie.`;
}

// ══════════════════════════════════════
// ═══ V4.3b: TURBULENCE + MAD + CI ═══
// ══════════════════════════════════════

function computeTurbulence(scores: number[], index: number): TurbulenceIndex {
  const start = Math.max(0, index - 3);
  const end = Math.min(scores.length - 1, index + 3);
  const window = scores.slice(start, end + 1);
  if (window.length < 3) return { sigma: 0, level: 'calme', label: 'Données insuffisantes' };
  const mean = window.reduce((s, v) => s + v, 0) / window.length;
  const variance = window.reduce((s, v) => s + (v - mean) ** 2, 0) / window.length;
  const sigma = Math.round(Math.sqrt(variance) * 10) / 10;
  let level: TurbulenceIndex['level'], label: string;
  if (sigma < 8)       { level = 'calme'; label = 'Période stable'; }
  else if (sigma < 15) { level = 'modéré'; label = 'Légères fluctuations'; }
  else if (sigma < 22) { level = 'agité'; label = 'Volatilité élevée'; }
  else                 { level = 'extrême'; label = 'Turbulence majeure'; }
  return { sigma, level, label };
}

function flagMADOutlier(scores: number[], index: number): OutlierFlag {
  if (scores.length < 7) return { isOutlier: false, modifiedZ: 0, direction: null };
  const sorted = [...scores].sort((a, b) => a - b);
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];
  const absDevs = scores.map(s => Math.abs(s - median));
  const sortedDevs = [...absDevs].sort((a, b) => a - b);
  const mad = sortedDevs.length % 2 === 0
    ? (sortedDevs[sortedDevs.length / 2 - 1] + sortedDevs[sortedDevs.length / 2]) / 2
    : sortedDevs[Math.floor(sortedDevs.length / 2)];
  const modifiedZ = mad > 0
    ? Math.round((0.6745 * (scores[index] - median) / mad) * 100) / 100
    : 0;
  const isOutlier = Math.abs(modifiedZ) > 3.5;
  const direction = isOutlier ? (modifiedZ > 0 ? 'high' : 'low') : null;
  return { isOutlier, modifiedZ, direction };
}

function computeCI(score: number, breakdownPoints: number[]): ConfidenceInterval {
  if (breakdownPoints.length < 3) return { lower: score, upper: score, margin: 0, label: 'Serré' };
  const mean = breakdownPoints.reduce((s, v) => s + v, 0) / breakdownPoints.length;
  const variance = breakdownPoints.reduce((s, v) => s + (v - mean) ** 2, 0) / (breakdownPoints.length - 1);
  const se = Math.sqrt(variance / breakdownPoints.length);

  // V8.9 GPT Q4 : calcul en delta-space pour respecter la courbure de compress()
  // floorScore=5 : plage minimale de ±5 points affichés (anti-fausse précision oracle)
  const floorScore = 5;
  const delta0 = decompressApprox(score);
  const deltaAtPlus = decompressApprox(Math.min(score + floorScore, 97));
  const floorDelta = Math.abs(deltaAtPlus - delta0);
  const ciMarginDelta = Math.max(1.96 * se, floorDelta);

  const lower = Math.max(5, compress(delta0 - ciMarginDelta));
  const upper = Math.min(97, compress(delta0 + ciMarginDelta));
  const margin = Math.round((upper - lower) / 2);

  let label: string;
  if (margin <= 4) label = 'Serré';
  else if (margin <= 8) label = 'Modéré';
  else label = 'Large';
  return { lower, upper, margin, label };
}

// ══════════════════════════════════════
// ═══ estimateSlowTransitBonus (export public) ═══
// ══════════════════════════════════════

export function estimateSlowTransitBonus(astro: AstroChart | null): number {
  if (!astro || !astro.tr.length) return 0;
  let bonus = 0;
  astro.tr.forEach(t => {
    if (!SLOW_PLANETS.has(t.tp)) return;
    const exactMul = t.x ? 1.3 : 1.0;
    if (t.t === 'conjunction')     bonus += Math.round(3 * exactMul);
    else if (t.t === 'trine')      bonus += Math.round(2 * exactMul);
    else if (t.t === 'sextile')    bonus += Math.round(1.5 * exactMul);
    else if (t.t === 'square')     bonus += Math.round(-2 * exactMul);
    else if (t.t === 'opposition') bonus += Math.round(-1.5 * exactMul);
  });
  return Math.max(-3, Math.min(3, bonus));
}

// ══════════════════════════════════════
// ═══ DAY PREVIEW (lightweight, calendrier) ═══
// ══════════════════════════════════════

export function calcDayPreview(
  bd: string, num: NumerologyProfile, cz: ChineseZodiac,
  targetDate: string, transitBonus: number = 0, astro: AstroChart | null = null
): DayPreview {
  const ppd = calcPersonalDay(bd, targetDate);
  const pdv = ppd.v;
  const iching = calcIChing(bd, targetDate);
  const reasons: string[] = [];

  const tYear = parseInt(targetDate.split('-')[0]);
  const tMonth = parseInt(targetDate.split('-')[1]);
  let delta = 0;

  // 1. Numérologie PD — V8: narratif + onboarding uniquement (R25 GPT : redondant BaZi, valeur commerciale)
  // pdPts calculé pour display/breakdown, NON ajouté au delta
  let pdPts = 0;
  if (pdv === num.lp.v)        { pdPts = 7; reasons.push(`✦ Jour ${pdv} = Chemin de Vie — alignement profond`); }
  else if (pdv === num.expr.v) { pdPts = 5; reasons.push(`✦ Jour ${pdv} = Expression — talents amplifiés`); }
  else if (pdv === num.soul.v) { pdPts = 4; reasons.push(`✦ Jour ${pdv} = Âme — désirs profonds activés`); }
  else if (pdv === num.pers.v) { pdPts = 3; reasons.push(`✦ Jour ${pdv} = Personnalité — charisme renforcé`); }
  if (isMaster(pdv)) { pdPts = Math.min(7, pdPts + 2); reasons.push(`✦ Nombre Maître ${pdv} — énergie spirituelle`); }
  pdPts = Math.max(-7, Math.min(7, pdPts));
  // numTotal supprimé V8 — PD narratif, Trinity supprimé, aucune dépendance restante
  // V8 : PD narratif — non ajouté au delta

  // 5. I Ching — V8: consultation séparée (R25 GPT : non calendaire sans question posée)
  // ichRes calculé pour display et interactions, NON ajouté au delta
  const ichRes = ichingScoreV4(iching.hexNum, iching.changing);
  const hexDesc: Record<string, string> = { A: 'puissant', B: 'favorable', C: 'neutre', D: 'tension', E: 'épreuve' };
  reasons.push(`☯ I Ching #${iching.hexNum} ${iching.name} — ${hexDesc[ichRes.tier]} (narratif)`);
  // delta += ichRes.pts; // SUPPRIMÉ V8 — non calendaire sans question

  // 6. BaZi FAMILLE
  let baziDMPts = 0, tenGodsPts = 0, csPts = 0, ssPts = 0;
  let peachActivePreview = false;
  let csResult: ChangshengResult | null = null;
  let ssResult: ShenShaResult | null = null;
  let tgResult: TenGodsResult | null = null;
  let natalDMIsYang = false;
  let natalDMElement: string | null = null;

  try {
    const birthD = new Date(bd + 'T12:00:00');
    const dayD = new Date(targetDate + 'T12:00:00');
    const baziDP = calcBaZiDaily(birthD, dayD, 50);
    baziDMPts = Math.max(-6, Math.min(6, Math.round(baziDP.totalScore * 2)));
    natalDMIsYang = baziDP.natalStem?.yinYang === 'Yang';
    natalDMElement = baziDP.natalStem?.element ?? null;
    if (baziDMPts !== 0) reasons.push(`BaZi ${baziDP.dailyStem.chinese} → ${baziDP.interaction.dynamique.split('.')[0]} (${baziDMPts > 0 ? '+' : ''}${baziDMPts})`);
  } catch { /* silent */ }

  try {
    const birthD = new Date(bd + 'T12:00:00');
    const dayD = new Date(targetDate + 'T12:00:00');
    tgResult = calc10Gods(birthD, dayD);
    tenGodsPts = Math.max(-6, Math.min(6, tgResult.totalScore));
    if (tenGodsPts !== 0) reasons.push(`十神 ${tgResult.dominant?.label || ''} (${tenGodsPts > 0 ? '+' : ''}${tenGodsPts})`);
  } catch { /* silent */ }

  try {
    const peach = getPeachBlossom(new Date(bd + 'T12:00:00'), new Date(targetDate + 'T12:00:00'));
    peachActivePreview = peach.active;
    if (peach.active) reasons.push(`🌸 Peach Blossom active — magnétisme relationnel`);
  } catch { /* silent */ }

  try {
    csResult = getChangsheng(new Date(bd + 'T12:00:00'), new Date(targetDate + 'T12:00:00'));
    csPts = 0; // V6.2: neutralisé (texture énergétique, redondant avec DM — R16 unanime)
    if (csResult.scoring.global !== 0) reasons.push(`${csResult.scoring.chinese} ${csResult.phase} (phase active)`);
  } catch { /* silent */ }

  try {
    ssResult = checkShenSha(new Date(bd + 'T12:00:00'), new Date(targetDate + 'T12:00:00'));
    ssPts = 0; // V8: narratif BaZi enrichi uniquement (R25 : redondant, enrichissement visuel)
    if (ssResult.active.length > 0) reasons.push(`⭐ ${ssResult.active.map((s: { chinese: string }) => s.chinese).join(' ')} (narratif BaZi)`);
  } catch { /* silent */ }

  // NaYin — V6.2: supprimé (symbolisme poétique, impact algorithmique non justifié)
  const naYinPts = 0;

  const baziFamilyPrev = Math.max(-22, Math.min(22, baziDMPts + tenGodsPts + csPts + ssPts + naYinPts));
  delta += baziFamilyPrev;

  // 7. Lune — V8: narratif visible (R25 : absorbée par Nakshatra, valeur contextuelle)
  // moonScore calculé pour display, NON ajouté au delta
  const dayType = calcDayType(pdv, iching, null);
  const moonScore = calcMoonScore(targetDate, dayType.type);
  if (moonScore.points !== 0) {
    reasons.push(`🌙 ${moonScore.phaseLabel} (narratif lunaire)`);
  }
  // delta += moonScore.points; // SUPPRIMÉ V8 — absorbé par Nakshatra

  // 8. Transit Lunaire — V6.2: supprimé (redondant avec Nakshatra — R15 consensus)
  const moonTr = getMoonTransit(targetDate); // conservé pour moonTransit dans le return

  // 9. Mercure — V8: alerte narrative (R25 : bruit populaire, valeur commerciale d'acquisition)
  // mercStatus calculé pour alerte conditionnelle, NON ajouté au delta
  const mercStatus = getMercuryStatus(new Date(targetDate + 'T12:00:00'));
  const mercPts = Math.max(-3, mercStatus.points); // conservé pour getScoreLevel (condition narrative ⚡)
  if (mercPts < 0) { reasons.push(`⚠️ ${mercStatus.label} — double-vérifier communications (narratif)`); }
  // delta += mercPts; // SUPPRIMÉ V8 — bruit non prédictif (R25 GPT)

  // 10. Rétrogrades — V6.2: déconnecté du delta (biais asymétrique, R16 unanime)
  const planetRetro = getPlanetaryRetroScore(new Date(targetDate + 'T12:00:00'));
  if (planetRetro.totalPts !== 0) reasons.push(`🪐 Rétrogrades actives (narratif)`);

  // 11. Transits lents — supprimés V6.3 de calcDayPreview (transitBonus statique → biais annuel, Gemini R21)
  // Transits lents actifs uniquement dans calcSlowModules (L2, temps réel)

  // 11b. Nakshatra Lords (±7 sub-cap)
  try {
    const tYearL = parseInt(targetDate.split('-')[0]);
    const moonDL = getMoonPhase(new Date(targetDate + 'T12:00:00'));
    const ayanamsaL = getAyanamsa(tYearL);
    const moonSidL = ((moonDL.longitudeTropical - ayanamsaL) % 360 + 360) % 360;
    const nakL = calcNakshatra(moonSidL);
    const transitLordL = nakL.lord;
    const nakQualityL = nakL.globalBaseScore;
    let r25l = 0, r27l = 0;
    if (nakQualityL !== 0) {
      const isHarmonic = nakQualityL > 0;
      if (transitLordL === 'Rahu')      r25l = isHarmonic ? 4 : -4;
      else if (transitLordL === 'Ketu') r25l = isHarmonic ? 2 : -3;
      else                               r25l = isHarmonic ? 3 : -3;
    }
    // R26 supprimée V6.3 — biais annuel constant ±4, construction non traditionnelle (R20 GPT+Gemini)
    try {
      const natalMoonL = getMoonPhase(new Date(bd + 'T12:00:00'));
      const natalAyanL = getAyanamsa(new Date(bd + 'T12:00:00').getFullYear());
      const natalSidL = ((natalMoonL.longitudeTropical - natalAyanL) % 360 + 360) % 360;
      const natalNakL = calcNakshatra(natalSidL);
      if (transitLordL === natalNakL.lord && nakQualityL !== 0) r27l = nakQualityL > 0 ? 6 : -6;
    } catch { /* natal fail silent */ }
    const nakLordTotalL = Math.max(-7, Math.min(7, r25l + r27l));
    if (nakLordTotalL !== 0) { delta += nakLordTotalL; reasons.push(`🌙 Lord ${transitLordL} ${nakL.name} (${nakLordTotalL > 0 ? '+' : ''}${nakLordTotalL})`); }
  } catch { /* nakshatra lords fail silent */ }

  // 11c. Vimshottari Dasha (±9)
  // 11c. Vimshottari Dasha — V6.1 Option A (Gemini R9 + GPT R9 + Grok R9)
  // Dasha retiré du delta (plus additif — biais 17 ans insoluble)
  // dashaDeltaPrevHoisted conservé pour Trinity anti-stack
  // Narrative uniquement lors des Sandhi (transitions de cycle)
  let dashaDeltaPrevHoisted = 0;
  try {
    const birthDPrev = new Date(bd + 'T12:00:00');
    const natalMoonPrev = getMoonPhase(birthDPrev);
    const natalAyanPrev = getAyanamsa(birthDPrev.getFullYear());
    const natalMoonSidPrev = ((natalMoonPrev.longitudeTropical - natalAyanPrev) % 360 + 360) % 360;
    const natalMoonIsWaxingPrev = (natalMoonPrev.phase ?? 0) <= 4;
    const targetDateObj = new Date(targetDate + 'T12:00:00');
    const dashaPrev = calcCurrentDasha(natalMoonSidPrev, birthDPrev, targetDateObj);
    let transitLordPrev: string | undefined;
    try {
      const moonDPrev2  = getMoonPhase(targetDateObj);
      const ayanPrev2   = getAyanamsa(parseInt(targetDate.split('-')[0]));
      const sidPrev2    = ((moonDPrev2.longitudeTropical - ayanPrev2) % 360 + 360) % 360;
      transitLordPrev   = calcNakshatra(sidPrev2).lord;
    } catch { /* silent */ }
    const dashaResultPrev = calcDashaScore(dashaPrev, { transitLord: transitLordPrev, natalMoonIsWaxing: natalMoonIsWaxingPrev });
    // Total brut conservé pour Trinity anti-stack (pas ajouté à delta)
    dashaDeltaPrevHoisted = dashaResultPrev.total;
    // Narrative uniquement lors des transitions de cycle (Sandhi)
    if (dashaPrev.maha.isTransition || dashaPrev.antar.isTransition || dashaPrev.pratyantar.isTransition) {
      reasons.push(`🕉 Dasha en transition (${dashaPrev.maha.lord}/${dashaPrev.antar.lord}/${dashaPrev.pratyantar.lord})`);
    }
  } catch { /* vimshottari preview fail silent */ }

  // Trinity — SUPPRIMÉ V8 (R25 GPT : synthèse moderne sans tradition, dépend de modules narratifs)
  // trinityBonusPrev conservé à 0 pour interactions buildInteractionContext
  const trinityBonusPrev = 0;

  // 13. Interactions cross-systèmes — V8: seules les règles BaZi-centriques actives
  // hexNum=-1 et moonPhaseIdx=-1 désactivent les règles I Ching/Lune (narratif V8)
  // mercuryRetro=false désactive règles Mercure (narratif V8)
  try {
    let vocPrev: VoidOfCourseMoon | null = null;
    try { vocPrev = getVoidOfCourseMoon(targetDate); } catch { /* silent */ }
    const prevCtx = buildInteractionContext({
      changshengPhase: csResult?.phase ?? null,
      tenGodDominant: tgResult?.dominant?.label ?? null,
      dmIsYang: natalDMIsYang,
      dmElement: natalDMElement,
      hexNum: -1,          // V8: I Ching narratif → règles IChing désactivées
      personalDay: pdv,    // conservé pour display breakdown (non actif dans règles V8)
      personalYear: calcPersonalYear(bd, tYear).v,
      personalMonth: calcPersonalMonth(bd, tYear, tMonth).v,
      moonPhaseIdx: -1,    // V8: Lune narrative → règles Lune désactivées
      isVoC: vocPrev?.isVoC ?? false,
      mercuryRetro: false, // V8: Mercure narratif → règles Mercure désactivées
      jupiterPositive: transitBonus > 0,
      peachBlossomActive: peachActivePreview,
      shenShaActive: ssResult?.active ?? [],
      trinityBonus: 0,     // V8: Trinity supprimé
    });
    const prevInteractions = calcInteractions(prevCtx);
    if (prevInteractions.totalBonus !== 0) {
      delta += prevInteractions.totalBonus;
      for (const ia of prevInteractions.active) {
        const sign = ia.bonus > 0 ? '+' : '';
        reasons.push(`${ia.bonus > 0 ? '✨' : '⚠️'} ${ia.label} (${sign}${ia.bonus})`);
      }
    }
  } catch { /* interactions fail silently */ }

  // ── P3.1 : estimateL2Bonus — Retours planétaires interpolés (Saturne, Jupiter, Nœud Nord) ──
  // Objectif : réduire la divergence CalendarTab ↔ ConvergenceTab (Issue #1 audit V8.1)
  // Méthode : interpolation linéaire via vitesse moyenne (zéro appel Meeus — PSI de returns.ts)
  //
  // ⚠️ HORIZON LIMITÉ À 12 MOIS (V8.8 hotfix3)
  // Pourquoi : l'interpolation linéaire est imprécise au-delà de ~12 mois car :
  //   - Jupiter dévie ±15° par an (rétrogrades de 4 mois), Saturne ±8°/an
  //   - Ces erreurs créent de fausses intensités de retour → biais annuels artificiels
  // Exemple : Nœud return 2033 et Sat+Jup return 2037 → 17-20 Cosmiques/an au lieu de 5
  // Fix : l2Bonus=0 si |deltaJours|>365. Le CalendarTab (<12 mois) reste précis.
  // TODO Sprint 2 : éphémérides exactes (Meeus) pour horizon long (calcDayPreview refacto)
  try {
    if (astro) {
      const natalLongs = extractNatalReturnLongs(astro);
      if (natalLongs) {
        const today = new Date();
        const targetD = new Date(targetDate + 'T12:00:00');
        const deltaJours = Math.round((targetD.getTime() - today.getTime()) / 86400000);

        // Horizon >12 mois : interpolation linéaire non fiable → skip l2Bonus
        if (Math.abs(deltaJours) <= 365) {
          // Positions planétaires actuelles (réutilisées via interpolation pour horizon court)
          const satTodayLong  = getPlanetLongitudeForDate('saturn',    today);
          const jupTodayLong  = getPlanetLongitudeForDate('jupiter',   today);
          const nodeTodayLong = getPlanetLongitudeForDate('northNode', today);

          const satIntensity  = interpolateReturnIntensity(natalLongs.saturn,    satTodayLong,  'saturn',    deltaJours);
          const jupIntensity  = interpolateReturnIntensity(natalLongs.jupiter,   jupTodayLong,  'jupiter',   deltaJours);
          const nodeIntensity = interpolateReturnIntensity(natalLongs.northNode, nodeTodayLong, 'northNode', deltaJours);

          // Amplitudes réduites (sat=3, jup=2, node=2, cap=4) — V8.8 hotfix2
          // Config.amp (8,5,6) était calibré pour le calcul L2 exact (via ctx.multiplier)
          // Ici, l2Bonus est additif direct sur delta → divisé par ~3 pour équivalence
          const satPts  = satIntensity  > 0.15 ? Math.round(satIntensity  * 3)  : 0;
          const jupPts  = jupIntensity  > 0.15 ? Math.round(jupIntensity  * 2)  : 0;
          const nodePts = nodeIntensity > 0.15 ? Math.round(nodeIntensity * 2)  : 0;

          const l2Bonus = Math.max(-4, Math.min(4, satPts + jupPts + nodePts));
          if (l2Bonus !== 0) {
            delta += l2Bonus;
            if (satPts > 0)  reasons.push(`🪐 Retour Saturne approche (est. +${satPts})`);
            if (jupPts > 0)  reasons.push(`♃ Retour Jupiter actif (est. +${jupPts})`);
            if (nodePts > 0) reasons.push(`☊ Nœud Nord en retour (est. +${nodePts})`);
            if (l2Bonus < 0) reasons.push(`🔻 Tension retours planétaires (est. ${l2Bonus})`);
          }
        }
      }
    }
  } catch { /* L2 estimate fail silently — never crash the preview */ }

  // 14. Cap global (biais conditionnel supprimé V6.2 — patch non symbolique)
  delta = Math.max(-60, Math.min(60, delta));

  const score = Math.max(5, Math.min(97, compress(delta)));
  const lCol = scoreLevelColor(score);
  const conseil = buildConseil(dayType, score, iching.name, iching.keyword);

  const yearScores = getYearScores(bd, num, cz, transitBonus);
  const higherOrEqual = yearScores.filter(s => s >= score).length;
  const rarityPct = Math.max(0.1, Math.round((higherOrEqual / yearScores.length) * 1000) / 10);

  return {
    date: targetDate, day: parseInt(targetDate.split('-')[2]),
    pdv, dayType, score, lCol,
    hexNum: iching.hexNum, hexName: iching.name, hexKeyword: iching.keyword,
    reasons, conseil, rarityPct,
  };
}

export function calcMonthPreviews(
  bd: string, num: NumerologyProfile, cz: ChineseZodiac,
  year: number, month: number, transitBonus: number = 0, astro: AstroChart | null = null
): DayPreview[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const previews: DayPreview[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    previews.push(calcDayPreview(bd, num, cz, ds, transitBonus, astro));
  }
  const scores = previews.map(p => p.score);
  for (let i = 0; i < previews.length; i++) {
    previews[i].turbulence = computeTurbulence(scores, i);
    previews[i].outlier = flagMADOutlier(scores, i);
  }
  return previews;
}

// ══════════════════════════════════════
// ═══ MAIN — calcConvergence V6.0 (Orchestrateur L3) ═══
// ══════════════════════════════════════

export function calcConvergence(
  num: NumerologyProfile,
  astro: AstroChart | null,
  cz: ChineseZodiac,
  iching: IChingReading,
  bd: string = '1977-09-23',
  bt?: string  // V9 Sprint 1 — heure de naissance optionnelle (ex: "23:20")
): ConvergenceResult {
  const signals: string[] = [];
  const alerts: string[] = [];
  const breakdown: SystemBreakdown[] = [];
  const todayStr = getTodayStr();

  // ── L1 : Modules quotidiens ──
  const daily: DailyModuleResult = calcDailyModules(
    { num, astro, iching, bd, todayStr },
    breakdown, signals, alerts
  );

  // ── L2 : Modules lents → finalDelta (après cap ±60) ──
  const { delta: finalDelta, ctxMult, dashaMult, dashaCertainty } = calcSlowModules(
    { num, astro, iching, bd, bt },
    daily, breakdown, signals, alerts
  );

  // ── L3 : Assemblage final ──
  const score = Math.max(5, Math.min(97, compress(finalDelta)));
  const mercPts = daily.mercPts;

  const scoreLevel = getScoreLevel(score, mercPts);
  const level = scoreLevel.name;
  const lCol = scoreLevel.color;
  const climate = calcClimate(num);

  let actionReco = calcActionReco(daily.dayType, score, iching.keyword);
  if (actionReco.verb === 'lance' && mercPts <= -3) {
    actionReco = { ...ACTION_DEFS.prepare, conseil: `Mercure rétrograde — préparez sans lancer. ${iching.keyword}.` };
  }

  const transitBonusForRarity = astro?.tr.length ? Math.round(calcPersonalTransits(astro.tr, 1.2, astro.as, astro.pl).total) : 0;
  const positiveSystemCount = breakdown.filter(b => b.points > 0).length;
  const rarityIndex = computeRarityIndex(score, positiveSystemCount, breakdown.length, bd, num, cz, 0); // V6.3: 0 au lieu de transitBonusForRarity (Gemini R21)

  const nakshatraMods = daily.nakshatraData?.domainModifiers as Record<string, number> | undefined;
  const contextualScores = calculateContextualScores(
    breakdown, score, num.py.v, num.pm.v,
    daily.directDomainBonuses, nakshatraMods
  );

  // V4.2 : Confiance temporelle
  const { pyPts, pmPts, pinnPts, trinityActive } = daily;
  const positiveCount = breakdown.filter(b => b.points > 0).length;
  const negativeCount = breakdown.filter(b => b.points < 0).length;
  const totalSystems = breakdown.length || 1;
  const isScorePositive = score >= 55;
  const agreeing = isScorePositive ? positiveCount : negativeCount;
  const agreementRatio = Math.round((agreeing / totalSystems) * 100);

  const pyAligned = (pyPts > 0 && isScorePositive) || (pyPts < 0 && !isScorePositive);
  // pmAligned + pinnAligned supprimés V6.2

  let confScore = 30;
  confScore += agreementRatio * 0.3;
  confScore += trinityActive ? 15 : 0;
  confScore += pyAligned ? 8 : -5;
  // pmAligned + pinnAligned supprimés V6.2 (modules retirés)
  if ((score >= 80 || score <= 30) && agreementRatio < 50) confScore -= 10;
  confScore = Math.max(5, Math.min(95, Math.round(confScore)));

  const confLabel = confScore >= 75 ? 'Très fiable' : confScore >= 55 ? 'Fiable' : confScore >= 35 ? 'Volatil' : 'Anomalie';
  const confReason = confScore >= 75
    ? `${agreeing}/${totalSystems} systèmes alignés${trinityActive ? ' + Trinity' : ''}. Les cycles longs confirment.`
    : confScore >= 55 ? `Majorité des systèmes convergent. Signaux contradictoires mineurs.`
    : confScore >= 35 ? `Signaux mixtes — le score pourrait basculer. Prudence.`
    : `Score à contre-courant des cycles longs. Journée atypique.`;
  const temporalConfidence: TemporalConfidence = { score: confScore, label: confLabel, reason: confReason, agreementRatio };

  const ci = computeCI(score, breakdown.map(b => b.points));

  // V4.8 debug : capture passive
  if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).__kDebug) {
    const buf = ((window as unknown as Record<string, unknown>).__kRawDeltas as number[]) || [];
    buf.push(finalDelta);
    (window as unknown as Record<string, unknown>).__kRawDeltas = buf;
  }

  // V9 Sprint 1 — nuclearHex câblé (engine existait dans iching.ts, non exposé)
  const nhScore = nuclearHexScore(iching.hexNum);
  const nuclearHexResult = { ...nhScore.result, points: nhScore.points, label: nhScore.label };

  return {
    score, level, lCol,
    signals, alerts,
    theme: THEMES[num.ppd.v] || 'équilibre',
    dayType: daily.dayType,
    climate, breakdown, actionReco,
    moonTransit: daily.moonTr,
    rarityIndex,
    lunarNodes: daily.nodeTransit,
    baziDaily: daily.baziResult,
    tenGods: daily.tenGodsResult,
    changsheng: daily.changshengResult,
    shenSha: daily.shenShaResult,
    trinity: trinityActive,
    scoreLevel,
    algoVersion: ALGO_VERSION,
    contextualScores,
    temporalConfidence,
    voidOfCourse: daily.vocResult,
    ci,
    interactions: daily.interactionResult,
    profection: daily.profectionResult,
    rawFinal: finalDelta,
    ctxMult,
    dashaMult,
    nuclearHex: nuclearHexResult,
    dashaCertainty,
  };
}

// ══════════════════════════════════════
// ═══ FORECAST 36 MOIS — V4.1 ═══
// ══════════════════════════════════════

const DAYTYPE_DOMAIN_AFFINITY: Record<string, Partial<Record<LifeDomain, number>>> = {
  decision:      { BUSINESS: 1.0, VITALITE: 0.3 },
  expansion:     { BUSINESS: 0.7, CREATIVITE: 0.5, VITALITE: 0.4 },
  communication: { RELATIONS: 1.0, AMOUR: 0.3 },
  observation:   { INTROSPECTION: 1.0, CREATIVITE: 0.3 },
  retrait:       { INTROSPECTION: 0.5, AMOUR: 0.5 },
};

const MONTH_NAMES_FR = [
  '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function calcMonthlyBaseline(bd: string, num: NumerologyProfile, year: number, month: number): number {
  const pyv = calcPersonalYear(bd, year).v;
  const pmv = calcPersonalMonth(bd, year, month).v;
  const pinnIdx = getActivePinnacleIdx(bd, `${year}-${String(month).padStart(2, '0')}-15`, num.lp);
  const pinnV = num.pinnacles[pinnIdx]?.v ?? 5;
  const valScore = (v: number): number => {
    if ([1, 3, 8, 11, 22].includes(v)) return 60;
    if ([5, 33].includes(v)) return 55;
    if ([2, 6].includes(v)) return 50;
    if ([4].includes(v)) return 42;
    if ([7, 9].includes(v)) return 40;
    return 48;
  };
  const avg = valScore(pyv) * 0.40 + valScore(pmv) * 0.35 + valScore(pinnV) * 0.25;
  return Math.round(Math.max(35, Math.min(65, avg)));
}

function scoreMonthFromDays(dailyScores: number[], baseline: number): {
  score: number; avg: number; goodDays: number; peakDays: number; criticalDays: number; goldDays: number;
} {
  const n = dailyScores.length;
  const sorted = [...dailyScores].sort((a, b) => a - b);
  const trimmed = sorted.slice(2, -2);
  const avg = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
  const goodDays = dailyScores.filter(s => s >= 70).length;
  const peakDays = dailyScores.filter(s => s >= 85).length;
  const criticalDays = dailyScores.filter(s => s < 25).length;
  const goldDays = dailyScores.filter(s => s >= 80).length;
  const density = goodDays / n;
  let raw = avg * 0.50 + density * 100 * 0.30 + (peakDays > 0 ? 5 : 0) + (criticalDays > 0 ? -8 : 0) + (goldDays >= 3 ? 3 : 0);
  raw = Math.max(raw, baseline - 10);
  return { score: Math.max(5, Math.min(97, Math.round(raw))), avg: Math.round(avg), goodDays, peakDays, criticalDays, goldDays };
}

function computeMonthDominantDomains(dailyData: { score: number; dayType: DayType }[]): LifeDomain[] {
  const strength: Record<LifeDomain, number> = {
    BUSINESS: 0, AMOUR: 0, RELATIONS: 0, CREATIVITE: 0, INTROSPECTION: 0, VITALITE: 0,
  };
  for (const day of dailyData) {
    const affinities = DAYTYPE_DOMAIN_AFFINITY[day.dayType] ?? {};
    for (const d of Object.keys(strength) as LifeDomain[]) {
      const affinity = affinities[d] ?? 0;
      strength[d] += (day.score * 0.5 + affinity * 15) * (1 + affinity);
    }
  }
  const sorted = Object.entries(strength).sort((a, b) => b[1] - a[1]);
  const result: LifeDomain[] = [sorted[0][0] as LifeDomain];
  if (sorted[1][1] > sorted[0][1] * 0.85) result.push(sorted[1][0] as LifeDomain);
  return result;
}

function detectActionWindows(dailyData: { date: string; score: number; dayType: DayType }[], dominantDomains: LifeDomain[]): ActionWindow[] {
  const globalThreshold = 75;
  const domainThresholds: Partial<Record<LifeDomain, number>> = {
    BUSINESS: 70, CREATIVITE: 70, AMOUR: 75, RELATIONS: 72, INTROSPECTION: 72, VITALITE: 72,
  };
  function findClusters(threshold: number): ActionWindow[] {
    const result: ActionWindow[] = [];
    let start: number | null = null;
    for (let i = 0; i < dailyData.length; i++) {
      if (dailyData[i].score >= threshold) {
        if (start === null) start = i;
      } else {
        if (start !== null && i - start >= 2) {
          const slice = dailyData.slice(start, i);
          const avgScore = Math.round(slice.reduce((a, d) => a + d.score, 0) / slice.length);
          result.push({ startDate: dailyData[start].date, endDate: dailyData[i - 1].date, days: i - start, domain: dominantDomains[0], label: `Fenêtre ${DOMAIN_META[dominantDomains[0]].label}`, avgScore });
        }
        start = null;
      }
    }
    if (start !== null && dailyData.length - start >= 2) {
      const slice = dailyData.slice(start);
      const avgScore = Math.round(slice.reduce((a, d) => a + d.score, 0) / slice.length);
      result.push({ startDate: dailyData[start].date, endDate: dailyData[dailyData.length - 1].date, days: dailyData.length - start, domain: dominantDomains[0], label: `Fenêtre ${DOMAIN_META[dominantDomains[0]].label}`, avgScore });
    }
    return result;
  }
  const globalWindows = findClusters(globalThreshold);
  if (globalWindows.length > 0) return globalWindows;
  return findClusters(domainThresholds[dominantDomains[0]] ?? 72);
}

function detectForecastAlerts(bd: string, num: NumerologyProfile, year: number, month: number): ForecastAlert[] {
  const alerts: ForecastAlert[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d += 5) {
    const ds = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const merc = getMercuryStatus(new Date(ds + 'T12:00:00'));
    if (merc.points <= -4) {
      alerts.push({ date: ds, type: 'retrograde', message: `☿ ${merc.label} — protégez contrats et communications`, icon: '☿' });
      break;
    }
  }
  const birthMonth = parseInt(bd.split('-')[1]);
  if (month === birthMonth) {
    const pyNext = calcPersonalYear(bd, year).v;
    alerts.push({ date: `${year}-${String(month).padStart(2, '0')}-01`, type: 'transition_py', message: `Transition Année Personnelle → ${pyNext} (${THEMES[pyNext] || 'nouveau cycle'})`, icon: '🔄' });
  }
  const events = getLunarEvents(new Date(year, month - 1, 15));
  for (const ev of events) {
    if (ev.status === 'upcoming' && ev.daysUntil <= 20 && ev.daysUntil >= -10) {
      if (ev.type === 'eclipse_solar' || ev.type === 'eclipse_lunar') {
        alerts.push({ date: `${year}-${String(month).padStart(2, '0')}-15`, type: 'eclipse', message: `${ev.icon} ${ev.name} — turbulences possibles`, icon: ev.icon });
      }
    }
  }
  return alerts;
}

function generateMonthNarrative(
  month: number, year: number, score: number, label: string, labelIcon: string,
  dominant: LifeDomain[], windows: ActionWindow[], alerts: ForecastAlert[],
  stats: { goodDays: number; peakDays: number; criticalDays: number },
  trend: 'rising' | 'falling' | 'stable'
): string {
  const monthName = MONTH_NAMES_FR[month];
  const domLabel = DOMAIN_META[dominant[0]].label;
  const domIcon = DOMAIN_META[dominant[0]].icon;
  let text = `${monthName} ${year} — ${score}/100 ${labelIcon} ${label}. `;
  if (dominant.length > 1) {
    text += `Double dominante ${domIcon} ${domLabel} et ${DOMAIN_META[dominant[1]].icon} ${DOMAIN_META[dominant[1]].label}. `;
  } else {
    text += `Énergie dominante : ${domIcon} ${domLabel}. `;
  }
  if (windows.length > 0) {
    const w = windows[0];
    const startDay = parseInt(w.startDate.split('-')[2]);
    const endDay = parseInt(w.endDate.split('-')[2]);
    text += `Fenêtre d'action du ${startDay} au ${endDay} (${w.days}j, ~${w.avgScore}/100). `;
  }
  if (stats.peakDays >= 2) text += `${stats.peakDays} jours d'exception (≥85). `;
  if (stats.criticalDays > 0) text += `Attention : ${stats.criticalDays} jour${stats.criticalDays > 1 ? 's' : ''} de turbulence. `;
  const retroAlert = alerts.find(a => a.type === 'retrograde');
  const pyAlert = alerts.find(a => a.type === 'transition_py');
  const eclipseAlert = alerts.find(a => a.type === 'eclipse');
  if (retroAlert) text += `☿ Mercure rétro ce mois — vigilance contrats. `;
  if (eclipseAlert) text += `Éclipse : amplification émotionnelle. `;
  if (pyAlert) text += `🔄 ${pyAlert.message}. `;
  if (trend === 'rising') text += `Tendance haussière.`;
  else if (trend === 'falling') text += `Tendance baissière — consolidez.`;
  return text.trim();
}

export function generateForecast36Months(
  bd: string, num: NumerologyProfile, cz: ChineseZodiac,
  startDate?: Date, transitBonus: number = 0, astro: AstroChart | null = null
): MonthForecast[] {
  const start = startDate ?? new Date();
  const results: MonthForecast[] = [];
  let currentYear = start.getFullYear();
  let currentMonth = start.getMonth() + 1;

  // ── P4.2 : Pré-calcul progressions secondaires par semaine ──
  // calcProgressions() a un cache hebdomadaire interne (clé bd_YYYY-Www).
  // On collecte ici les scores semaine par semaine sur les 36 mois (≈156 semaines max).
  // Coût réel : ~0.3ms × nb semaines uniques non cachées. Cache hit = 0ms.
  // Si astro absent → progScoreByWeek vide → monthProgScore = 0 (backward compat total).
  const progScoreByWeek = new Map<string, number>();
  if (astro) {
    const startMs = new Date(currentYear, currentMonth - 1, 1).getTime();
    for (let w = 0; w < 160; w++) {
      const weekDate = new Date(startMs + w * 7 * 86400000);
      try {
        const pr = calcProgressions(bd, weekDate, astro);
        if (!progScoreByWeek.has(pr.cacheKey)) {
          progScoreByWeek.set(pr.cacheKey, pr.totalScore);
        }
      } catch { /* progressions never crash forecast */ }
    }
  }

  for (let i = 0; i < 36; i++) {
    const year = currentYear;
    const month = currentMonth;
    const daysInMonth = new Date(year, month, 0).getDate();
    const dailyData: { date: string; score: number; dayType: DayType }[] = [];

    // Score progressions pour ce mois = moyenne des semaines du mois, cap ±6
    let monthProgScore = 0;
    if (astro && progScoreByWeek.size > 0) {
      const weekScores: number[] = [];
      for (let w = 0; w < 5; w++) {
        const sampleDate = new Date(year, month - 1, Math.min(1 + w * 7, daysInMonth));
        try {
          const pr = calcProgressions(bd, sampleDate, astro);
          if (progScoreByWeek.has(pr.cacheKey)) {
            weekScores.push(progScoreByWeek.get(pr.cacheKey)!);
          }
        } catch { /* silent */ }
      }
      if (weekScores.length > 0) {
        const avg = weekScores.reduce((a, b) => a + b, 0) / weekScores.length;
        monthProgScore = Math.max(-6, Math.min(6, Math.round(avg)));
      }
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const preview = calcDayPreview(bd, num, cz, ds, transitBonus, astro);
      const adjustedScore = Math.max(5, Math.min(97, preview.score + monthProgScore));
      dailyData.push({ date: ds, score: adjustedScore, dayType: preview.dayType.type });
    }

    const baseline = calcMonthlyBaseline(bd, num, year, month);
    const monthStats = scoreMonthFromDays(dailyData.map(d => d.score), baseline);
    const score = monthStats.score;
    const label = score >= 88 ? 'Cosmique' : score >= 80 ? 'Gold' : score >= 65 ? 'Favorable' : score >= 40 ? 'Routine' : score >= 25 ? 'Prudence' : 'Tempête';
    const labelIcon = score >= 88 ? '⚡' : score >= 80 ? '🌟' : score >= 65 ? '✦' : score >= 40 ? '☉' : score >= 25 ? '☽' : '⛈';
    const labelColor = scoreLevelColor(score);
    const dominantDomains = computeMonthDominantDomains(dailyData);
    const windows = detectActionWindows(dailyData, dominantDomains);
    const forecastAlerts = detectForecastAlerts(bd, num, year, month);
    const prevScore = results.length > 0 ? results[results.length - 1].score : score;
    const trend: 'rising' | 'falling' | 'stable' = score > prevScore + 3 ? 'rising' : score < prevScore - 3 ? 'falling' : 'stable';
    const narrative = generateMonthNarrative(
      month, year, score, label, labelIcon, dominantDomains, windows, forecastAlerts,
      { goodDays: monthStats.goodDays, peakDays: monthStats.peakDays, criticalDays: monthStats.criticalDays }, trend
    );
    const progNarrative = astro && Math.abs(monthProgScore) >= 2
      ? ` ${monthProgScore > 0 ? '↗ Progressions secondaires favorables (+' + monthProgScore + ' pts).' : '↘ Progressions secondaires en tension (' + monthProgScore + ' pts).'}`
      : '';
    results.push({
      year, month, score, label, labelIcon, labelColor, trend,
      dominantDomains, windows, alerts: forecastAlerts, narrative: narrative + progNarrative, baseline,
      stats: { avg: monthStats.avg, goodDays: monthStats.goodDays, peakDays: monthStats.peakDays, criticalDays: monthStats.criticalDays, goldDays: monthStats.goldDays },
    });
    currentMonth++;
    if (currentMonth > 12) { currentMonth = 1; currentYear++; }
  }
  return results;
}

// ══════════════════════════════════════
// ═══ DEBUG DISTRIBUTION V4.8 ═══
// ══════════════════════════════════════

// ── DEBUG DISTRIBUTION V8 — formule réelle (BaZi DM + 10 Gods + Nakshatra + Interactions)
// V4.8 OBSOLÈTE : supprimé IChing, Num, Lune, Mercure, Trinity, VoC (tous narratifs en V8)
// V8 : seuls les modules actifs du delta sont simulés. ctxMult/dashaMult approximés à 1.0
//      (terrain stable sur l'année, variance ≤ ±12% → biais acceptable pour la distribution)
export function debugScoreDistribution(
  bd: string, days = 365, logDetails = false
): { cosmiqueRate: number; goldRate: number; tempeteRate: number; avgScore: number; rawDeltas: number[] } {
  const rawDeltas: number[] = [];
  const scores: number[] = [];
  const today = new Date();
  const birthD = new Date(bd + 'T12:00:00');

  // Pré-calcul lord natal Nakshatra (stable pour l'utilisateur)
  let natalNakLord: string | null = null;
  try {
    const natalMoon = getMoonPhase(birthD);
    const natalAyan = getAyanamsa(birthD.getFullYear());
    const natalSid = ((natalMoon.longitudeTropical - natalAyan) % 360 + 360) % 360;
    natalNakLord = calcNakshatra(natalSid).lord;
  } catch { /* silent */ }

  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - Math.floor(days / 2) + i);
    const ds = d.toISOString().split('T')[0];
    try {
      // ── L1-A : BaZi DM (±6) ──
      const baziDP = calcBaZiDaily(birthD, d, 50);
      const baziDMPts = Math.max(-6, Math.min(6, Math.round(baziDP.totalScore * 2)));

      // ── L1-B : BaZi 10 Gods (±6) ──
      const tg = calc10Gods(birthD, d);
      const tgPts = Math.max(-6, Math.min(6, tg.totalScore));

      // ── L1-C : Nakshatra lords (±7, R25+R27) ──
      let nakPts = 0;
      try {
        const moonD = getMoonPhase(d);
        const ayan = getAyanamsa(d.getFullYear());
        const moonSid = ((moonD.longitudeTropical - ayan) % 360 + 360) % 360;
        const nak = calcNakshatra(moonSid);
        const nakQual = nak.globalBaseScore;
        let r25 = 0, r27 = 0;
        if (nakQual !== 0) {
          const isH = nakQual > 0;
          if (nak.lord === 'Rahu')      r25 = isH ? 4 : -4;
          else if (nak.lord === 'Ketu') r25 = isH ? 2 : -3;
          else                           r25 = isH ? 3 : -3;
        }
        if (natalNakLord && nak.lord === natalNakLord && nakQual !== 0) {
          r27 = nakQual > 0 ? 6 : -6;
        }
        nakPts = Math.max(-7, Math.min(7, r25 + r27));
      } catch { /* silent */ }

      // ── L1-D : Interactions BaZi-centriques (±6 cumulé) ──
      // Estimation simplifiée : on ne reconstruit pas le contexte complet,
      // on applique une variance ±1.5 pts en moyenne (fréquence interactions V8)
      // Pour une simulation fidèle, les interactions dépendent du contexte (Changsheng, 10 Gods dominant)
      // → on les ignore ici pour éviter un biais de calcul partiel
      const interPts = 0; // conservateur : interactions = 0 en simulation MC

      // ── Delta V8 (sans ctxMult/dashaMult — approximés à 1.0) ──
      const rawDelta = Math.max(-22, Math.min(22, baziDMPts + tgPts + nakPts + interPts)); // V8.9: maxDelta→22
      rawDeltas.push(rawDelta);
      scores.push(Math.max(5, Math.min(97, compress(rawDelta))));

      if (logDetails) {
        console.log(`${ds} | raw=${rawDelta} | score=${compress(rawDelta)} | BaZi=${baziDMPts} | 10G=${tgPts} | Nak=${nakPts}`);
      }
    } catch { /* skip */ }
  }

  const stat = (threshold: number, mode: 'gte' | 'lte' | 'range', max?: number) => {
    if (!scores.length) return 0;
    if (mode === 'gte') return scores.filter(s => s >= threshold).length / scores.length * 100;
    if (mode === 'lte') return scores.filter(s => s <= threshold).length / scores.length * 100;
    return scores.filter(s => s >= threshold && s < (max ?? 100)).length / scores.length * 100;
  };

  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const cosmiqueRate = stat(88, 'gte');
  const goldRate     = stat(80, 'range', 88);
  const tempeteRate  = stat(25, 'lte');

  console.log(`\n=== DEBUG DISTRIBUTION V8 — ${days} jours autour d'aujourd'hui ===`);
  console.log('Formule V8.9 : BaZi DM(±6) + 10 Gods(±6) + Nakshatra(±7) | compress(maxDelta=22, exp=1.05)');
  console.table([{
    jours: scores.length,
    'Cosmique ≥88': cosmiqueRate.toFixed(1) + '%',
    'Or 80-87':     goldRate.toFixed(1) + '%',
    'Tempête <25':  tempeteRate.toFixed(1) + '%',
    moyenne:        avg.toFixed(1),
    rawMax:         scores.length ? Math.max(...rawDeltas).toFixed(0) : 'N/A',
    rawMin:         scores.length ? Math.min(...rawDeltas).toFixed(0) : 'N/A',
  }]);
  console.log('Cible V8 : Cosmique 1-2%/an (~4-7j) | Or 8-12%/an (~29-44j) | Tempête 5-8%');
  console.log('Note : ctxMult/dashaMult≈1.0 (terrain), interactions≈0 (contexte manquant) → distribution légèrement sous-estimée');

  return { cosmiqueRate, goldRate, tempeteRate, avgScore: avg, rawDeltas };
}

export function debugAnalyzeCapture(): void {
  const buf = typeof window !== 'undefined'
    ? ((window as unknown as Record<string, unknown>).__kRawDeltas as number[] | undefined)
    : undefined;
  if (!buf || buf.length === 0) {
    console.log('Aucun delta capturé. Active la capture avec : window.__kDebug = true');
    return;
  }
  const compress47 = (d: number) => Math.round(50 + 45 * Math.sign(d) * Math.pow(Math.min(Math.abs(d) / 47, 1), 1.4));
  const scores = buf.map(d => Math.max(5, Math.min(97, compress47(d))));
  const n = scores.length;
  console.log(`\n=== CAPTURE PASSIVE — ${n} appels réels ===`);
  console.table([{
    n,
    'Cosmique ≥90': (scores.filter(s => s >= 90).length / n * 100).toFixed(1) + '%',
    'Gold 80-89':   (scores.filter(s => s >= 80 && s < 90).length / n * 100).toFixed(1) + '%',
    'Tempête <25':  (scores.filter(s => s < 25).length / n * 100).toFixed(1) + '%',
    moyenne:        (scores.reduce((a, b) => a + b, 0) / n).toFixed(1),
    rawMax:         Math.max(...buf).toFixed(1),
    rawMin:         Math.min(...buf).toFixed(1),
  }]);
}
