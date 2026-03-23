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
import { getMoonPhase, getMoonTransit, getMercuryStatus, getLunarEvents, type VoidOfCourseMoon } from './moon'; // Ronde 27 : getVoidOfCourseMoon retiré (délégué à calcDailyModules)
import { calcBaZiDaily, calc10Gods, type DayMasterDailyResult, type TenGodsResult, getPeachBlossom, checkShenSha, type ShenShaResult } from './bazi'; // Sprint AS P1 : ChangshengResult retiré (csResult mort dans calcDayPreview)
// calcInteractions, buildInteractionContext retirés Sprint AP (interactions stubées)
import { calcNakshatra, getAyanamsa } from './nakshatras'; // Ronde 27 : NakshatraComposite retiré (délégué à calcDailyModules)
// Sprint AS P6 : calcDashaScore retiré (seul L2 l'utilise)
// Ronde 28 : calcCurrentDasha réimporté pour calcBaseSignalLite (antar.lord)
import { calcCurrentDasha as calcCurrentDashaImport } from './vimshottari';
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
  calcDailyModules, calcDayType, ichingScoreV4, calcMoonScore, // getNaYinAffinityFactor retiré Sprint AP
  calcJianChuPts, // Sprint AT — Ronde 13 consensus 3/3 : Jian Chu partagé L1↔L3
  type DailyModuleResult,
} from './convergence-daily';
import { calcSlowModules, buildNatalDashaCtx, calcDashaMultLite, calcBaseSignalLite, type NatalDashaCtx } from './convergence-slow';
// Ronde 27 : imports fixed-stars, kinetic-shocks, panchanga retirés (délégués à calcDailyModules)
import { getAdaptedAlphaG } from './alpha-calibration'; // Sprint AE — Phase 2 αG adaptatif
import { safeParseDateLocal, safeNum } from './safe-utils'; // Sprint AG

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

// Sprint AY P1 — compressL1Legacy : formule L1-only pour fonctions sans décomposition 4 groupes
// Utilisée par : getYearScores, buildCorrectedBaseline, computeScoreRange, calcDayPreview, debugDistribution
// Le moteur principal utilise désormais calcMainScore() (ex-calcShadowScore) avec tanh + C4
function compressL1Legacy(delta: number): number {
  const maxDelta = 22;
  const sign = Math.sign(delta);
  const normalized = Math.min(Math.abs(delta) / maxDelta, 1);
  return Math.round(50 + 45 * sign * Math.pow(normalized, 1.05));
}

/** Inverse approx de compressL1Legacy() — retourne le delta correspondant à un score donné.
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
  if (score >= COSMIC_THRESHOLD && mercuryPts < 0) {
    return {
      name: '🌟 Convergence rare', icon: '🌟', color: '#E0B0FF',
      narrative: "Tu sens une puissance brute dans la poitrine, mais ta gorge bloque — les mots veulent sortir trop vite. Agis en silence, relis avant d'envoyer, et laisse la force couler sans bruit."
    };
  }
  if (score >= COSMIC_THRESHOLD) {
    const narratives = [
      "Ton corps vibre à une fréquence que tu reconnais immédiatement : tout est ouvert. La poitrine est large, le souffle profond, la vision nette. Bouge maintenant — cette fenêtre ne dure pas.",
      "Une chaleur dorée irradie depuis le plexus solaire. Chaque pas semble plus léger, chaque décision plus évidente. C'est le jour où tu signes, tu lances, tu oses.",
      "Tu te réveilles avec cette certitude rare dans les os : aujourd'hui, le courant te porte. Ne résiste pas, ne planifie pas — surfe."
    ];
    return { name: '🌟 Convergence rare', icon: '🌟', color: '#E0B0FF', narrative: narratives[variant] };
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
  if (score >= COSMIC_THRESHOLD) return '#E0B0FF';
  if (score >= 80) return '#FFD700';
  if (score >= 65) return '#4ade80';
  if (score >= 40) return '#60a5fa';
  if (score >= 25) return '#9890aa';
  return '#ef4444';
}

// ══════════════════════════════════════
// ═══ ACTION RECOMMANDÉE ═══
// ══════════════════════════════════════

// Ronde 20 : 3 postures (AGIR / AJUSTER / RALENTIR) — le score décide, le dayType nuance
const ACTION_DEFS: Record<ActionVerb, Omit<ActionReco, 'conseil'>> = {
  agir:     { verb: 'agir',     icon: '🚀', label: 'AGIR',     color: '#4ade80' },
  ajuster:  { verb: 'ajuster',  icon: '🌟', label: 'AJUSTER',  color: '#f59e0b' },
  ralentir: { verb: 'ralentir', icon: '🛡', label: 'RALENTIR', color: '#ef4444' },
};

function calcActionReco(dayType: DayTypeInfo, score: number, hexKeyword: string): ActionReco {
  // Ronde 20 : le SCORE est le verdict, le dayType ne peut jamais le contredire
  let verb: ActionVerb;
  if (score >= 65)      verb = 'agir';
  else if (score >= 40) verb = 'ajuster';
  else                  verb = 'ralentir';

  // Textes conditionnels Score × DayType (Magnitude/Vecteur — Gemini R20)
  // Règle : si score ≥65, AUCUN texte ne décourage l'action
  const isRetrait = dayType.type === 'retrait' || dayType.type === 'observation';
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);

  const conseils: Record<ActionVerb, string[]> = {
    agir: isRetrait ? [
      `Bonne énergie — canalise-la dans la réflexion et les décisions mûries. ${hexKeyword}.`,
      `Le potentiel est là. Avance sur l\'essentiel, garde le reste pour demain. ${hexKeyword}.`,
      `Journée riche en énergie. Prends du recul stratégique pour mieux viser. ${hexKeyword}.`,
    ] : [
      `Feu vert — agis sur tes décisions clés. ${hexKeyword}.`,
      `Conditions optimales pour lancer, signer, avancer. ${hexKeyword}.`,
      `L'alignement est fort — c'est le moment d'agir avec conviction. ${hexKeyword}.`,
    ],
    ajuster: isRetrait ? [
      `Énergie modérée + journée calme : idéal pour organiser et préparer. ${hexKeyword}.`,
      `Pas de précipitation — structure tes prochaines actions. ${hexKeyword}.`,
      `Pose-toi, fais le tri, prépare le terrain pour la prochaine fenêtre. ${hexKeyword}.`,
    ] : [
      `Avance avec méthode — priorise et ajuste au fil de la journée. ${hexKeyword}.`,
      `Le contexte est mitigé : sélectionne tes batailles. ${hexKeyword}.`,
      `Bon timing pour tester, valider et affiner avant de lancer. ${hexKeyword}.`,
    ],
    ralentir: [
      `Journée de pause stratégique — consolide tes acquis. ${hexKeyword}.`,
      `Protège ton énergie, reporte les décisions importantes. ${hexKeyword}.`,
      `Repli stratégique — ce n'est pas une faiblesse, c'est de l'intelligence. ${hexKeyword}.`,
    ],
  };

  const pool = conseils[verb];
  const conseil = pool[dayOfYear % pool.length];
  return { ...ACTION_DEFS[verb], conseil };
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
  BUSINESS:      { label: 'Affaires',      icon: '💼', color: '#4ade80' },
  AMOUR:         { label: 'Amour',         icon: '❤️', color: '#f472b6' },
  RELATIONS:     { label: 'Relations',     icon: '🤝', color: '#60a5fa' },
  CREATIVITE:    { label: 'Créativité',    icon: '✨', color: '#f59e0b' },
  INTROSPECTION: { label: 'Introspection', icon: '🧘', color: '#c084fc' },
  VITALITE:      { label: 'Vitalité',      icon: '🌟', color: '#fb923c' },
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
  // Sprint AR P4 : Changsheng supprimé (Ronde 11 consensus 3/3)
  'Shen Sha':         { BUSINESS: 0.6,  AMOUR: 0.6,  RELATIONS: 0.6,  CREATIVITE: 0.5,  INTROSPECTION: 0.4,  VITALITE: 0.4  },
  'Nakshatra':        { BUSINESS: 0.5,  AMOUR: 0.5,  RELATIONS: 0.5,  CREATIVITE: 0.5,  INTROSPECTION: 0.5,  VITALITE: 0.5  },
};

const DOMAIN_DIRECTIVES: Record<LifeDomain, { haut: string; bon: string; neutre: string; bas: string }> = {
  BUSINESS:      { haut: 'Feu vert pour signer, négocier et lancer.', bon: 'Avance tes dossiers — le terrain est porteur.', neutre: 'Exécute le courant, reporte les décisions lourdes.', bas: 'Pas de signature ni d\'engagement aujourd\'hui.' },
  AMOUR:         { haut: 'Déclare, invite, ose — le cœur est aligné.', bon: 'Bon moment pour connecter et approfondir.', neutre: 'Présence tranquille — pas de grandes déclarations.', bas: 'Protège ton énergie émotionnelle aujourd\'hui.' },
  RELATIONS:     { haut: 'Réseaute, allie-toi, fédère — ton charisme rayonne.', bon: 'Tes échanges seront fluides — profites-en.', neutre: 'Maintiens tes relations sans forcer de nouveau contact.', bas: 'Risque de malentendu — choisis tes mots avec soin.' },
  CREATIVITE:    { haut: 'Crée, innove, écris — l\'inspiration coule.', bon: 'Bonne énergie créative — exploite-la.', neutre: 'Peaufine l\'existant plutôt que de créer du neuf.', bas: 'Pas le jour pour brainstormer — recharge.' },
  INTROSPECTION: { haut: 'Journée idéale pour méditer, planifier et voir clair.', bon: 'Ta intuition est fiable — écoute-la.', neutre: 'Garde un moment calme dans ta journée.', bas: 'L\'agitation extérieure domine — dur de se poser.' },
  VITALITE:      { haut: 'Énergie physique au top — bouge, agis, entreprends.', bon: 'Bonne forme — gère ton rythme intelligemment.', neutre: 'Énergie stable — pas d\'excès.', bas: 'Corps en retrait — repos et récupération.' },
};

// Ronde Pilotage P1 : Mercury-aware BUSINESS directives
function getDomainDirective(domain: LifeDomain, score: number, mercRetro: boolean = false): string {
  const d = DOMAIN_DIRECTIVES[domain];
  if (score >= 75) {
    if (mercRetro && domain === 'BUSINESS') return 'Terrain porteur, mais Mercure rétrograde — relisez tout avant de signer, reporte les lancements.';
    return d.haut;
  }
  if (score >= 55) {
    if (mercRetro && domain === 'BUSINESS') return 'Avance tes dossiers avec prudence — Mercure rétrograde, vérifie chaque détail.';
    return d.bon;
  }
  if (score >= 40) return d.neutre;
  return d.bas;
}

function calculateContextualScores(
  breakdown: { system: string; points: number }[],
  globalScore: number = 50,
  pyv: number = 0,
  pmv: number = 0,
  directBonuses?: Partial<Record<LifeDomain, number>>,
  nakshatraMods?: Record<string, number>,
  nakshatraAffinityOverride?: Record<LifeDomain, number>,  // V9.0 P3 — affinités dynamiques par Nakshatra actif
  mercRetro: boolean = false  // Ronde Pilotage P1 — Mercury-aware BUSINESS directive
): ContextualScores {
  const allDomains: LifeDomain[] = ['BUSINESS', 'AMOUR', 'RELATIONS', 'CREATIVITE', 'INTROSPECTION', 'VITALITE'];
  const domainRaw: Record<LifeDomain, number> = {
    BUSINESS: 0, AMOUR: 0, RELATIONS: 0, CREATIVITE: 0, INTROSPECTION: 0, VITALITE: 0,
  };

  breakdown.forEach(b => {
    if (b.points === 0) return;
    // V9.0 P3 : si Nakshatra actif + override dispo → remplace la ligne uniforme 0.5
    const affinities = (b.system === 'Nakshatra' && nakshatraAffinityOverride)
      ? nakshatraAffinityOverride
      : DOMAIN_AFFINITY[b.system];
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
    const rawTanh = 50 + 50 * Math.tanh(safeNum(domainRaw[domain], 0) / TAU_DOMAIN); // Sprint AG: NaN guard
    const domainScore = Math.max(5, Math.min(97, Math.round(safeNum(rawTanh, 50)))); // Sprint AG: fallback 50
    // Ancrage pondéré partiel (0.35) puis amplification écart (0.15)
    const anchored = domainScore * 0.65 + globalScore * 0.35;
    const spread   = anchored + (anchored - globalScore) * 0.15;
    const score    = Math.max(5, Math.min(97, Math.round(spread)));
    return {
      domain,
      ...DOMAIN_META[domain],
      score,
      directive: getDomainDirective(domain, score, mercRetro),
    };
  });

  const sorted = [...domains].sort((a, b) => b.score - a.score);
  const fallbackDomain = { domain: 'BUSINESS' as const, icon: '💼', label: 'Business', score: 50, directive: '' };
  const best = sorted[0] ?? fallbackDomain; // Sprint AG: bounds check
  const worst = sorted[sorted.length - 1] ?? fallbackDomain; // Sprint AG: bounds check
  const diff = best.score - worst.score;

  let conseil: string;
  if (diff <= 10) {
    conseil = `Énergie équilibrée — tous les domaines sont alignés aujourd'hui.`;
  } else if (diff <= 25) {
    conseil = `${best.icon} ${best.label} à ${best.score}/100 — capitalise là. ${worst.icon} ${worst.label} à ${worst.score}/100 — temporise.`;
  } else {
    conseil = `${best.icon} ${best.label} en zone haute (${best.score}/100). Évite les décisions critiques en ${worst.label} (${worst.score}/100).`;
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
  const bdParsed = safeParseDateLocal(bd); // Sprint AG: date validation
  if (bdParsed) {
    try {
      const natalMoonMC = getMoonPhase(bdParsed);
      const natalAyanMC = getAyanamsa(bdParsed.getFullYear());
      const natalSidMC = ((natalMoonMC.longitudeTropical - natalAyanMC) % 360 + 360) % 360;
      natalNakLord = calcNakshatra(natalSidMC).lord;
    } catch { /* silent */ }
  }

  const scores: number[] = [];
  for (let m = 1; m <= 12; m++) {
    const daysInMonth = new Date(year, m, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      let delta = 0;

      // BaZi DM (±6) — signal prédictif Tier 1
      try {
        const birthD = bdParsed ?? new Date(bd + 'T12:00:00'); // Sprint AG: reuse validated
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

      scores.push(Math.max(5, Math.min(97, compressL1Legacy(Math.max(-22, Math.min(22, delta))))));
    }
  }

  _mcCache = { key: cacheKey, year, scores };
  return scores;
}

/** V8.9 GPT Q3 : correction statique du Rarity Index par Monte Carlo.
 *  Construit une baseline L1+L2 simulée pour comparer le score full (L1+L2+L3)
 *  à une distribution équitable — évite l'asymétrie L1-only vs full score. */
function buildCorrectedBaseline(
  yearScoresL1: number[],
  ctxMultCenter  = 1.0,  // V9.0 S4 — centré sur le vrai ctxMult du jour
  dashaMultCenter = 1.0, // V9.0 S4 — centré sur le vrai dashaMult du jour
  samplesPerDay  = 8
): number[] {
  const corrected: number[] = [];
  for (const sL1 of yearScoresL1) {
    const d1 = decompressApprox(sL1);
    for (let k = 0; k < samplesPerDay; k++) {
      const offsetPts = (Math.random() - 0.5) * 12;   // Uniform[-6, +6] — inclut L3 interactions ±6
      const ctxVar    = (Math.random() - 0.5) * 0.12; // ±6% variation ctx [0.88–1.12]
      const dashaVar  = (Math.random() - 0.5) * 0.20; // ±10% variation dasha [0.80–1.25]
      const ctxSim    = Math.max(0.85, Math.min(1.15, ctxMultCenter  * (1 + ctxVar)));
      const dashaSim  = Math.max(0.60, Math.min(1.30, dashaMultCenter * (1 + dashaVar)));
      corrected.push(compressL1Legacy((d1 + offsetPts) * ctxSim * dashaSim));
    }
  }
  return corrected;
}

function computeRarityIndex(
  currentScore: number, positiveSystemCount: number, totalSystemCount: number,
  bd: string, num: NumerologyProfile, cz: ChineseZodiac, transitBonus: number,
  ctxMult = 1.0, dashaMult = 1.0                                  // S4 — terrain karmique réel du jour
): RarityResult {
  const yearScoresL1  = getYearScores(bd, num, cz, transitBonus);
  // V8.9 GPT Q3 : baseline corrigée (L1 + simulation L2) pour éviter biais asymétrique
  // S4 : centrée sur ctxMult + dashaMult réels du jour
  const baseline      = buildCorrectedBaseline(yearScoresL1, ctxMult, dashaMult);
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
  if (score >= COSMIC_THRESHOLD) {
    if (t === 'decision')      return `🌟 CONVERGENCE RARE — Prends LA décision que tu repousses. ${hexName} (${hexKeyword}) confirme : ce moment est rare.`;
    if (t === 'communication') return `🌟 CONVERGENCE RARE — Pouvoir de persuasion maximal. L'hexagramme ${hexName} amplifie chaque mot.`;
    if (t === 'expansion')     return `🌟 CONVERGENCE RARE — Convergence totale vers la croissance. Lancez maintenant.`;
    if (t === 'observation')   return `🌟 CONVERGENCE RARE — Lucidité à son apogée. Les insights d'aujourd'hui valent de l'or.`;
    return `🌟 CONVERGENCE RARE — Même en retrait, l'énergie est exceptionnelle. Semez avec intention.`;
  }
  if (score >= 80) {
    if (t === 'decision')      return `Conditions exceptionnelles pour décider. ${hexName} (${hexKeyword}) : c'est le moment d'agir.`;
    if (t === 'communication') return `Journée idéale pour négocier et tisser des alliances. ${hexName} amplifie tes échanges.`;
    if (t === 'expansion')     return `Toutes les énergies convergent vers la croissance. ${hexName} soutient tes ambitions.`;
    return `Journée de recul dans des conditions positives. Recharge tes batteries stratégiques.`;
  }
  if (score >= 65) {
    if (t === 'decision')      return `Bonne fenêtre pour décider. ${hexName} (${hexKeyword}) t\'encourage à avancer.`;
    if (t === 'communication') return `Énergie porteuse pour les échanges. ${hexName} favorise le dialogue.`;
    return `Le courant est porteur. Maintiens le cap. ${hexName} soutient l'élan.`;
  }
  if (score >= 40) {
    if (t === 'decision')      return `Tu peux décider, mais vérifie tes données. ${hexName} (${hexKeyword}) appelle à la prudence mesurée.`;
    return `L'énergie est stable. ${hexName} (${hexKeyword}) invite à se concentrer sur l'essentiel.`;
  }
  if (score >= 25) {
    if (t === 'decision')      return `Journée de décision en conditions tendues. ${hexName} (${hexKeyword}) : ne décidez que si c'est urgent.`;
    return `L'énergie résiste. ${hexName} (${hexKeyword}) recommande la prudence.`;
  }
  return `Repli stratégique. ${hexName} (${hexKeyword}) signale des vents contraires — préserve ton énergie.`;
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

// V9.0 P2 — ESS (Effective Sample Size) : regroupe les modules corrélés
// pour éviter la sous-estimation de la variance (ex: 7 modules BaZi ≠ 7 observations indep.)
const CORRELATION_GROUPS: Record<string, string> = {
  // Sprint AR P4 : 'Changsheng' et 'Na Yin' supprimés (Ronde 11 consensus 3/3)
  'BaZi': 'bazi', '10 Gods': 'bazi',
  'Jian Chu': 'bazi', 'Shen Sha': 'bazi', 'Peach Blossom': 'bazi',
  'Lune': 'lune', 'Nakshatra': 'lune', 'Transit Lunaire': 'lune',
  'Lune Hors Cours': 'lune', 'Nœuds Lunaires': 'lune', 'Vimshottari Dasha': 'lune',
  'Astrologie': 'ephemeris', 'Planètes': 'ephemeris', 'Retours Planétaires': 'ephemeris',
  'Progressions': 'ephemeris', 'Révolution Solaire': 'ephemeris',
  'Éclipses Natales': 'ephemeris', 'Mercure': 'ephemeris', 'Cycles de Vie': 'ephemeris',
  'Numérologie': 'num',
};

// Sprint D1 : table t(0.975, df) pour CI correct (remplace 1.96×1.10 bootstrap)
const T_975_LOOKUP: Record<number, number> = {
  1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571,
  6: 2.447,  7: 2.365, 8: 2.306, 9: 2.262, 10: 2.228,
};
function tCritical975(df: number): number {
  if (df <= 0) return 0;
  if (df <= 10) return T_975_LOOKUP[df];
  return 1.96;
}

function computeCorrelatedCI(score: number, breakdown: SystemBreakdown[]): ConfidenceInterval {
  if (breakdown.length < 3) return { lower: score, upper: score, margin: 0, label: 'Serré' };

  // Regroupement ESS : chaque groupe → 1 observation (sa moyenne)
  const groupMap = new Map<string, number[]>();
  breakdown.forEach((b, i) => {
    const group = CORRELATION_GROUPS[b.system] ?? `indep_${i}`;
    if (!groupMap.has(group)) groupMap.set(group, []);
    groupMap.get(group)!.push(b.points);
  });
  const groupMeans = Array.from(groupMap.values()).map(
    pts => pts.reduce((s, v) => s + v, 0) / pts.length
  );

  const n = groupMeans.length;
  if (n < 2) return { lower: score, upper: score, margin: 0, label: 'Serré' };

  const mean = groupMeans.reduce((s, v) => s + v, 0) / n;
  const variance = groupMeans.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1);
  const se = Math.sqrt(variance / n);

  // V8.9 GPT Q4 : calcul en delta-space pour respecter la courbure de compressL1Legacy()
  // floorScore=5 : plage minimale de ±5 points affichés (anti-fausse précision oracle)
  // Sprint D1 : remplacement 1.96×1.10 → t(0.975, df=n-1) table Student exacte
  // n=4 groupes ESS → df=3 → t=3.182 (correction bootstrap 1.10 obsolète)
  // Source : Ronde 4+5 audit IA (GPT/Grok/Gemini, 2026-03-04).
  const floorScore = 5;
  const delta0 = decompressApprox(score);
  const deltaAtPlus = decompressApprox(Math.min(score + floorScore, 97));
  const floorDelta = Math.abs(deltaAtPlus - delta0);
  const df = n - 1;
  const t975 = tCritical975(df);
  const ciMarginDelta = Math.max(t975 * se, floorDelta);

  const lower = Math.max(5, compressL1Legacy(delta0 - ciMarginDelta));
  const upper = Math.min(97, compressL1Legacy(delta0 + ciMarginDelta));
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

// V5/E — Cache 2 zones (consensus 3/3 Gemini+GPT+Grok)
// Zone 1 : Volatile (±28j autour d'aujourd'hui) — TTL midnight, clé inclut todayDate
//   Car alpha varie avec le temps → le score change demain pour une même date future.
// Zone 2 : Permanent (>28j) — alpha=1 constant, indépendant de todayDate.
//   Score figé, recalcul inutile = performance optimale pour le calendrier 36 mois.
const _dayPreviewCacheVolatile = new Map<string, DayPreview>();   // Zone 1 : ±28j
const _dayPreviewCachePermanent = new Map<string, DayPreview>();  // Zone 2 : >28j
const DAY_PREVIEW_CACHE_MAX = 1200; // 36 mois × ~30 jours + marge
let _volatileCacheDate: string = '';  // date du jour au moment du dernier fill — TTL midnight

function _dayPreviewCacheKey(bd: string, targetDate: string, transitBonus: number, ctxMult: number = 1.0, dashaMult: number = 1.0, baseSignal: number = 0): string {
  return `${bd}|${targetDate}|${transitBonus}|${ctxMult.toFixed(3)}|${dashaMult.toFixed(3)}|${baseSignal.toFixed(3)}`;
}

/** Vide le cache calcDayPreview (appelé si les données natal changent). */
export function clearDayPreviewCache(): void {
  _dayPreviewCacheVolatile.clear();
  _dayPreviewCachePermanent.clear();
  _volatileCacheDate = '';
}

// ═══ AUDIT : Force clear au chargement du module (HMR ne vide PAS le cache permanent) ═══
// À RETIRER après stabilisation — en production le cache permanent est souhaitable.
clearDayPreviewCache();
// [CACHE] Force clear permanent+volatile au chargement module (log supprimé — prod)

export function calcDayPreview(
  bd: string, num: NumerologyProfile, cz: ChineseZodiac,
  targetDate: string, transitBonus: number = 0, astro: AstroChart | null = null,
  ctxMult: number = 1.0, dashaMult: number = 1.0, baseSignal: number = 0,
  natalCtx?: NatalDashaCtx | null,  // Ronde 28 — contexte natal précompilé
  todayStr?: string,                // Ronde 28 — date du jour (pour garde GAP=0)
): DayPreview {
  // ═══ V5/E — Alpha-blend + Cache 2 zones ═══
  const _today = todayStr ?? getTodayStr();

  // Guard daysDiff ≥ 0 (Gemini, consensus 3/3)
  const _targetMs = new Date(targetDate + 'T12:00:00').getTime();
  const _todayMs  = new Date(_today + 'T12:00:00').getTime();
  const daysDiff  = Math.max(0, (_targetMs - _todayMs) / 86_400_000);

  // Alpha : 0 (LIVE/aujourd'hui) → 1 (≥90j futur), transition linéaire
  // 90j = ~3 mois — l'année courante garde des scores quasi-LIVE pour les prochains mois,
  // les années suivantes sont pleinement corrigées par V5/E.
  const V5E_ALPHA_RAMP = 90;
  const alpha = Math.min(1, daysDiff / V5E_ALPHA_RAMP);

  // Cache 2 zones : volatile (alpha<1, ±ramp) vs permanent (alpha=1, >ramp)
  const _isPermanent = alpha >= 1;
  const _cKey = natalCtx
    ? (_isPermanent
        ? `v5p|${bd}|${targetDate}|${transitBonus}|L2lite`          // permanent: pas de todayDate
        : `v5v|${bd}|${targetDate}|${transitBonus}|L2lite|${_today}`) // volatile: inclut todayDate
    : _dayPreviewCacheKey(bd, targetDate, transitBonus, ctxMult, dashaMult, baseSignal);

  // TTL midnight : si le jour a changé, vider le cache volatile
  if (_volatileCacheDate !== _today) {
    _dayPreviewCacheVolatile.clear();
    _volatileCacheDate = _today;
  }

  const _cache = _isPermanent ? _dayPreviewCachePermanent : _dayPreviewCacheVolatile;
  const _cached = _cache.get(_cKey);
  if (_cached) return _cached;

  // ═══ Ronde 27 — Single Source of Truth (consensus 3/3 : GPT+Gemini+Grok) ═══
  // Le calendrier utilise EXACTEMENT la même fonction que le live (calcDailyModules)
  // pour garantir écart = 0 entre les onglets Pilotage et Calendrier.
  //
  // ═══ Ronde 28 — L2-lite (consensus 3/3 : GPT+Gemini+Grok) ═══
  // dashaMult + baseSignal recalculés par jour (arithmétique Vimshottari).
  // ctxMult reste fixe (quasi-constant sur 1 an).
  // Garde : jour J = terrain live (GAP = 0 strict).

  // 1. Recalculer la numérologie pour la date cible (ppd, py, pm varient)
  const tYear = parseInt(targetDate.split('-')[0]);
  const tMonth = parseInt(targetDate.split('-')[1]);
  const ppd = calcPersonalDay(bd, targetDate);
  const py  = calcPersonalYear(bd, tYear);
  const pm  = calcPersonalMonth(bd, tYear, tMonth);
  const numForDate: NumerologyProfile = { ...num, ppd, py, pm };

  // 2. I Ching pour la date cible
  const iching = calcIChing(bd, targetDate);

  // 3. Appel au moteur LIVE — mêmes 20 modules, mêmes 4 groupes, même score
  //    Ronde Transit : on passe _liveDate = vrai aujourd'hui pour que calcDailyModules
  //    utilise calcTransitsLite (Meeus) quand targetDate ≠ today.
  //    _today déjà calculé dans le bloc cache V5/E ci-dessus.
  const _breakdown: SystemBreakdown[] = [];
  const _signals: string[] = [];
  const _alerts: string[] = [];
  const daily = calcDailyModules(
    { num: numForDate, astro, iching, bd, todayStr: targetDate, _liveDate: _today },
    _breakdown, _signals, _alerts,
  );

  // 4. Terrain : Ronde 28 L2-lite par jour (dashaMult + baseSignal varient)
  //    Garde R27 : si targetDate === today, on garde le terrain live (GAP = 0 strict)
  let _ctxMult = ctxMult;
  let _dashaMult = dashaMult;
  let _baseSignal: number | undefined = baseSignal;

  // _today déjà calculé dans le bloc cache V5/E
  if (natalCtx && targetDate !== _today) {
    // L2-lite : recalculer dashaMult + baseSignal pour cette date spécifique
    const _targetDateObj = new Date(targetDate + 'T12:00:00');
    const _dashaLite = calcDashaMultLite(natalCtx, _targetDateObj);
    _dashaMult = _dashaLite.dashaMult;

    // Récupérer l'Antar-Dasha lord pour la garde AB-R1 (sameLord)
    const _dashaForSignal = calcCurrentDashaImport(natalCtx.natalMoonSid, natalCtx.birthD, _targetDateObj);

    _baseSignal = calcBaseSignalLite(
      natalCtx, _targetDateObj, _dashaLite.dashaTotal,
      daily.nakshatraData?.globalBaseScore ?? 0,
      daily.nakshatraData?.lord,
      daily.luneGroupDelta,
      _dashaForSignal.antar.lord,
    );
    // ctxMult reste fixe (quasi-constant sur 1 an — consensus 3/3)
  }

  // 5. Score = scoreFromGroups avec terrain L2-lite + V5/E alpha-blend
  const score = scoreFromGroups(
    daily.luneGroupDelta, daily.ephemGroupDelta,
    daily.baziGroupDelta, daily.indivGroupDelta,
    _ctxMult, _dashaMult, _baseSignal,
    alpha,           // V5/E — 0=LIVE/today, →1 progressivement sur 90j (V5E_ALPHA_RAMP)
  );
  // Ronde 6 — capture side-channel xt/dm pour blend post-traitement annuel
  const _dayXt = _sfgLastXt;
  const _dayDm = _sfgLastDm;

  // 5. Construire DayPreview
  const pdv = ppd.v;
  const lCol = scoreLevelColor(score);
  const conseil = buildConseil(daily.dayType, score, iching.name, iching.keyword);

  // Reasons : signaux + alertes issus de calcDailyModules
  const reasons = [..._signals, ..._alerts];

  const yearScores = getYearScores(bd, num, cz, transitBonus);
  const higherOrEqual = yearScores.filter(s => s >= score).length;
  const rarityPct = Math.max(0.1, Math.round((higherOrEqual / yearScores.length) * 1000) / 10);

  const _result: DayPreview = {
    date: targetDate, day: parseInt(targetDate.split('-')[2]),
    pdv, dayType: daily.dayType, score, lCol,
    hexNum: iching.hexNum, hexName: iching.name, hexKeyword: iching.keyword,
    reasons, conseil, rarityPct,
    ...((_dayXt !== 0) && { xt: _dayXt, dm: _dayDm }),  // Sprint N+ — TOUS les jours (passés + futurs)
  };

  // V5/E — store in cache 2 zones (LRU-like : clear if full)
  if (_cache.size >= DAY_PREVIEW_CACHE_MAX) _cache.clear();
  _cache.set(_cKey, _result);

  return _result;
}

// ══════════════════════════════════════════════════════════════════════
// Ronde Cosmique — Post-traitement annuel Plancher + Plafond
// Consensus 3/3 (GPT + Gemini + Grok) : Option C stricte
//   - Cosmique = score ≥ 88 (absolu, universel)
//   - Plafond : max 25 Cosmiques/an (les meilleurs gardent le badge, les autres → capped)
//   - Plancher : min 3 "Pic de l'année" si < 3 Cosmiques (score ≥ 85)
//   - Zéro changement sur la formule de score
// ══════════════════════════════════════════════════════════════════════
export const COSMIC_THRESHOLD = 86;  // V4.4 : abaissé de 88→86 (compense k_future=0.65, 2027 top=86.3 → Cosmiques possibles)
const COSMIC_MAX_PER_YEAR = 999;  // Ronde 6 : cap désactivé — le Soft Shift régule naturellement (max ~15C en 2037)
const ANNUAL_PEAK_MIN = 3;
const ANNUAL_PEAK_FLOOR = 82;  // V4.1 : abaissé de 85→82 — garantit des "Pic de l'année" même en année faible (ex: 2027 Pic=84)

/**
 * Applique les labels annuels Plancher/Plafond sur une année complète de DayPreview.
 * Mute les objets DayPreview en place (ajoute isAnnualPeak / isCosmicCapped).
 */
export function assignAnnualLabels(yearPreviews: DayPreview[]): void {
  // 1. Identifier les jours Cosmiques (score ≥ 88), triés desc
  const cosmicDays = yearPreviews
    .filter(p => p.score >= COSMIC_THRESHOLD)
    .sort((a, b) => b.score - a.score);

  // 2. PLAFOND : si plus de 25 Cosmiques, les excédentaires perdent le badge
  if (cosmicDays.length > COSMIC_MAX_PER_YEAR) {
    const capped = cosmicDays.slice(COSMIC_MAX_PER_YEAR);
    const cappedDates = new Set(capped.map(d => d.date));
    yearPreviews.forEach(p => {
      if (cappedDates.has(p.date)) p.isCosmicCapped = true;
    });
  }

  // 3. PLANCHER : si < 3 vrais Cosmiques (non-capped), compléter avec "Pic de l'année"
  const trueCosmic = cosmicDays.length <= COSMIC_MAX_PER_YEAR
    ? cosmicDays.length
    : COSMIC_MAX_PER_YEAR;

  if (trueCosmic < ANNUAL_PEAK_MIN) {
    const needed = ANNUAL_PEAK_MIN - trueCosmic;
    // Candidats : jours non-Cosmiques avec score ≥ 85, triés desc
    const cosmicDates = new Set(cosmicDays.slice(0, COSMIC_MAX_PER_YEAR).map(d => d.date));
    const candidates = yearPreviews
      .filter(p => !cosmicDates.has(p.date) && p.score >= ANNUAL_PEAK_FLOOR)
      .sort((a, b) => b.score - a.score)
      .slice(0, needed);

    const peakDates = new Set(candidates.map(d => d.date));
    yearPreviews.forEach(p => {
      if (peakDates.has(p.date)) p.isAnnualPeak = true;
    });
  }
}

// ══════════════════════════════════════════════════════════════════════
// Ronde 6 — Soft Shift Passe 2 : blend S_rel sur l'année complète
// Consensus unanime GPT+Grok+Gemini : percentile sur N=365 obligatoire.
// Appelée par CalendarTab.yearHeatmap APRÈS collecte des 365 DayPreviews,
// AVANT assignAnnualLabels. Même pattern : mute in place.
//
// Passe 1 (scoreFromGroups) a déjà calculé S_abs + terrainBonus.
// Passe 2 (ici) recalcule le score final avec blend S_rel.
//
// Guard année tronquée (Gemini "bloquant") : si < 100 jours FUTURE → pas de blend.
// Fallback GPT : ρ_eff = ρ × min(1, √(N/200)) si 100 ≤ N < 200.
// Rollback : supprimer l'appel dans CalendarTab.tsx.
// ══════════════════════════════════════════════════════════════════════
export function applySoftShiftBlend(yearPreviews: DayPreview[]): void {
  // ═══ Ronde 8 — v2 base + kicker quadratique (consensus GPT+Gemini+Claude 3/4) ═══
  // v2 linéaire (0.30/0.15) préserve 2029=13C et 2033=12C intacts.
  // Le kicker 8.0×(μ-0.95)² cible chirurgicalement les années extrêmes (2037)
  // sans affecter les années moyennement fortes (ratio 18:1 entre 2037 et 2033).
  const SS_K = 0.80;                // pente tanh (validé Ronde 6, confirmé Ronde 7)
  const RHO  = 0.32;                // poids S_rel (consensus GPT+Grok Ronde 7)
  const CS_FLOOR = 0.50;            // plancher c_s (protège années calmes)
  const CS_MAX   = 0.90;            // plafond c_s (sécurité, clip max)
  const MEAN_COEFF  = 0.30;         // retour v2 (protège 2033=12C, 2029=13C)
  const MEAN_THRESH = 0.70;         // seuil d'activation mean
  const P90_COEFF   = 0.15;         // retour v2 (composante queue haute)
  const P90_THRESH  = 1.40;         // seuil d'activation P90
  const KICKER_COEFF  = 8.0;        // Ronde 8 — amplifie non-linéairement les extrêmes
  const KICKER_THRESH = 0.95;       // seuil kicker (2033 μ=0.981→quasi-nul, 2037 μ=1.084→fort)

  // Sprint N+ : collecter TOUS les jours avec xt (passés + futurs)
  const futureDays = yearPreviews.filter(p => p.xt != null && p.xt !== 0);
  const N = futureDays.length;

  // GF1 — Guard année tronquée : pas assez de données pour un percentile fiable
  if (N < 100) return;

  // Tableau trié des xt pour le percentile lissé et les métriques
  const xts = futureDays.map(p => p.xt!).sort((a, b) => a - b);

  // ═══ Ronde 8 — c_s adaptatif v2 + kicker quadratique ═══
  // GF2 — Guard N < 200 : retomber sur c_s par défaut + ρ réduit
  let cs: number;
  let rhoEff: number;
  if (N < 200) {
    cs = CS_FLOOR;
    rhoEff = RHO * Math.min(1, Math.sqrt(N / 200));
  } else {
    // Calculer mean et P90 sur les jours FUTURE de l'année
    const meanXt = xts.reduce((a, b) => a + b, 0) / N;
    const p90Idx = Math.min(Math.floor(0.90 * N), N - 1);
    const p90Xt = xts[p90Idx];
    // Ronde 8 : v2 dual metric + kicker quadratique pour extrêmes
    const csRaw = CS_FLOOR
      + MEAN_COEFF * Math.max(0, meanXt - MEAN_THRESH)
      + P90_COEFF  * Math.max(0, p90Xt  - P90_THRESH)
      + KICKER_COEFF * Math.max(0, meanXt - KICKER_THRESH) ** 2;
    cs = Math.min(CS_MAX, Math.max(CS_FLOOR, csRaw));
    rhoEff = RHO;
  }

  // Percentile lissé par kernel logistique (σ=0.06)
  const _sigma = (x: number) => 1 / (1 + Math.exp(-x));
  function smoothPercentile(xt: number): number {
    let s = 0;
    for (let j = 0; j < xts.length; j++) s += _sigma((xt - xts[j]) / 0.06);
    return s / xts.length;
  }

  // S_rel : base + bonus queue haute (Ronde 5 consensus)
  function sRel(p: number): number {
    return 50 + 44 * Math.tanh((p - 0.79) / 0.12) + 3.0 * _sigma((p - 0.975) / 0.008);
  }

  // Soft Shift g(X) = X − c_s × tanh(X / c_s) — c_s adaptatif
  function softShiftG(X: number): number {
    return X - cs * Math.tanh(X / cs);
  }

  // Appliquer le blend sur chaque jour avec xt (passés + futurs)
  // ═══ FIX INCOHÉRENCE CALENDRIER vs PILOTAGE ═══
  // Protéger le jour d'aujourd'hui : son score LIVE (= Pilotage) ne doit PAS être
  // écrasé par le Soft Shift. Sinon on affiche 37 sur le calendrier et 58 sur le Pilotage.
  const _todayGuard = getTodayStr();
  for (const p of yearPreviews) {
    if (p.xt == null || p.xt === 0 || p.dm == null) continue;
    if (p.date === _todayGuard) continue;  // Garde GAP=0 : aujourd'hui = score Pilotage

    const g = softShiftG(p.xt);
    const sAbs = 50 + 44 * Math.tanh(SS_K * g);
    const pctl = smoothPercentile(p.xt);
    const sRelVal = sRel(pctl);
    const terrainBonus = Math.tanh((p.dm - 1) / 0.06);

    // Score final Soft Shift avec blend
    const scoreFinal = (1 - rhoEff) * sAbs + rhoEff * sRelVal + terrainBonus;
    p.score = Math.max(0, Math.min(100, Math.round(scoreFinal)));

    // Mettre à jour la couleur du score
    p.lCol = scoreLevelColor(p.score);
  }

}

export function calcMonthPreviews(
  bd: string, num: NumerologyProfile, cz: ChineseZodiac,
  year: number, month: number, transitBonus: number = 0, astro: AstroChart | null = null,
  ctxMult: number = 1.0, dashaMult: number = 1.0, baseSignal: number = 0,
  bt?: string,   // Ronde 28 — heure naissance pour L2-lite
): DayPreview[] {
  // ═══ Ronde 28 — L2-lite : dashaMult + baseSignal par jour (consensus 3/3) ═══
  // Contexte natal construit UNE FOIS, passé à chaque jour.
  const natalCtx = buildNatalDashaCtx(bd, bt, astro);
  const todayStr = getTodayStr();

  const daysInMonth = new Date(year, month, 0).getDate();
  const previews: DayPreview[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    previews.push(calcDayPreview(bd, num, cz, ds, transitBonus, astro, ctxMult, dashaMult, baseSignal, natalCtx, todayStr));
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
  const { delta: finalDelta, ctxMult, dashaMult, dashaCertainty, shadowBaseSignal } = calcSlowModules(
    { num, astro, iching, bd, bt },
    daily, breakdown, signals, alerts
  );

  // ── L3 : Assemblage final ──
  // Y5 — Bascule production : formule tanh Cœur Unifié (A=36, k=0.840, bias=+5, terrain_squashé)
  // Sprint AY P1 — Moteur principal (ex-shadow, désormais unique) — fallback compressL1Legacy supprimé
  // calcMainScore retourne score + c4 + shapley — aucun fallback, crash si erreur = détectable
  const _mainResult = calcMainScore(finalDelta, ctxMult, dashaMult, shadowBaseSignal, daily.luneGroupDelta, daily.ephemGroupDelta, daily.baziGroupDelta, daily.indivGroupDelta);
  const score = Math.max(5, Math.min(97, _mainResult.score));
  // R27 — GAP=0 confirmé : calcMainScore ≡ scoreFromGroups (diag retiré)
  const mercPts = daily.mercPts;

  const scoreLevel = getScoreLevel(score, mercPts);
  const level = scoreLevel.name;
  const lCol = scoreLevel.color;
  const climate = calcClimate(num);

  let actionReco = calcActionReco(daily.dayType, score, iching.keyword);

  // Ronde 21-bis + Ronde Narrative — Override moteur multi-système
  // Signaux pause : Mercure rétro, Lune décroissante, jour retrait/observation, Lune VoC, Yi King prudent
  // Option C (Ronde Narrative) : zone grise 65-74 sensible au contexte (seuil 2 au lieu de 3)
  {
    let pauseSignals = 0;
    if (mercPts <= -3) pauseSignals++;
    const moonPhase = daily.moonPhaseRawPhase ?? -1;  // 0-7 : 4=pleine, 5-7=décroissant
    if (moonPhase >= 5 && moonPhase <= 7) pauseSignals++;
    if (daily.dayType.type === 'retrait' || daily.dayType.type === 'observation') pauseSignals++;
    if (daily.vocResult && daily.vocResult.isVoC) pauseSignals++;

    // Yi King comme signal de pause : keywords prudents
    // Poids 2 en zone grise (65-74) car c'est un système divinatoire complet
    // Poids 1 en zone Gold+ (≥75) pour ne pas écraser un score fort
    const PAUSE_KEYWORDS = new Set([
      'Patiente', 'Attends', 'Observe', 'Protège-toi', 'Arrête-toi',
      'Recule', 'Endure', 'Prudence', 'Lâche prise', 'Contourne',
    ]);
    const isGrayZone = score >= 65 && score < 75;
    if (PAUSE_KEYWORDS.has(iching.keyword)) pauseSignals += isGrayZone ? 2 : 1;

    // Zone grise 65-74 : seuil réduit (2 signaux suffisent)
    // Zone ≥75 (Gold+) : seuil classique (3 signaux)
    const pauseThreshold = (score >= 65 && score < 75) ? 2 : 3;
    if (pauseSignals >= pauseThreshold && actionReco.verb === 'agir') {
      actionReco = { ...ACTION_DEFS.ajuster, conseil: `L'énergie est là mais le contexte invite à la mesure — avance sur l'essentiel. ${iching.keyword}.` };
    }
  }

  // Garde Mercure Rétro (indépendant de l'override multi-système)
  // Ronde Pilotage P1 : score ≥ 85 → maintenir AGIR avec prudence Mercure (pas de rétrogradation)
  if (actionReco.verb === 'agir' && mercPts <= -3) {
    if (score >= 85) {
      actionReco = { ...ACTION_DEFS.agir, conseil: `Convergence exceptionnelle malgré Mercure rétrograde — agis sur l\'essentiel, relis tout avant de signer. ${iching.keyword}.` };
    } else {
      actionReco = { ...ACTION_DEFS.ajuster, conseil: `Mercure rétrograde — avance avec prudence, évite les lancements. ${iching.keyword}.` };
    }
  }

  const transitBonusForRarity = astro?.tr.length ? Math.round(calcPersonalTransits(astro.tr, 1.2, astro.as, astro.pl).total) : 0;
  const positiveSystemCount = breakdown.filter(b => b.points > 0).length;
  const rarityIndex = computeRarityIndex(score, positiveSystemCount, breakdown.length, bd, num, cz, 0, ctxMult, dashaMult); // V6.3: 0 au lieu de transitBonusForRarity (Gemini R21) | S4: terrain réel

  const nakshatraMods = daily.nakshatraData?.domainModifiers as Record<string, number> | undefined;
  // V9.0 P3 — Nakshatra affinités dynamiques : traduit domainModifiers (0.5-1.5) → [0,1] pour DOMAIN_AFFINITY
  // Sprint AU P3 : mapping corrigé (x-0.5)/1.0 — était x/1.5 → [0.33,1.0] au lieu de [0,1]
  const nakshatraAffinityOverride = nakshatraMods ? {
    BUSINESS:      ((nakshatraMods['Business']      ?? 1.0) - 0.5),
    AMOUR:         ((nakshatraMods['Amour']         ?? 1.0) - 0.5),
    RELATIONS:     ((nakshatraMods['Relations']     ?? 1.0) - 0.5),
    CREATIVITE:    ((nakshatraMods['Créativité']    ?? 1.0) - 0.5),
    INTROSPECTION: ((nakshatraMods['Introspection'] ?? 1.0) - 0.5),
    VITALITE:      ((nakshatraMods['Vitalité']      ?? 1.0) - 0.5),
  } as Record<LifeDomain, number> : undefined;
  const contextualScores = calculateContextualScores(
    breakdown, score, num.py.v, num.pm.v,
    daily.directDomainBonuses, nakshatraMods, nakshatraAffinityOverride,
    mercPts <= -3  // Ronde Pilotage P1 — Mercury retro awareness for BUSINESS directive
  );

  // V4.2 : Confiance temporelle
  const { pyPts, pmPts, pinnPts } = daily; // Sprint AR P5 : trinityActive retiré (Ronde 11 consensus 2/3)
  const positiveCount = breakdown.filter(b => b.points > 0).length;
  const negativeCount = breakdown.filter(b => b.points < 0).length;
  const totalSystems = breakdown.length || 1;
  const isScorePositive = score >= 55;
  const agreeing = isScorePositive ? positiveCount : negativeCount;
  const agreementRatio = Math.round((agreeing / totalSystems) * 100);

  const pyAligned = (pyPts > 0 && isScorePositive) || (pyPts < 0 && !isScorePositive);
  // pmAligned + pinnAligned supprimés V6.2

  // Ronde Pilotage P3 : rescalé après suppression trinityActive + pmAligned + pinnAligned
  // Ancien plafond = 68 (30 + 30 + 8). Nouveau = ~90 (15 + 65 + 10).
  let confScore = 15;
  confScore += agreementRatio * 0.65;
  confScore += pyAligned ? 10 : -5;
  if ((score >= 80 || score <= 30) && agreementRatio < 50) confScore -= 10;
  confScore = Math.max(5, Math.min(95, Math.round(confScore)));

  const confLabel = confScore >= 75 ? 'Très fiable' : confScore >= 55 ? 'Fiable' : confScore >= 35 ? 'Volatil' : 'Anomalie';
  const confReason = confScore >= 75
    ? `${agreeing}/${totalSystems} systèmes alignés. Les cycles longs confirment.`
    : confScore >= 55 ? `Majorité des systèmes convergent. Signaux contradictoires mineurs.`
    : confScore >= 35 ? `Signaux mixtes — le score pourrait basculer. Prudence.`
    : `Score à contre-courant des cycles longs. Journée atypique.`;
  const temporalConfidence: TemporalConfidence = { score: confScore, label: confLabel, reason: confReason, agreementRatio };

  const ci = computeCorrelatedCI(score, breakdown);

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
    shenSha: daily.shenShaResult,
    scoreLevel,
    algoVersion: ALGO_VERSION,
    contextualScores,
    temporalConfidence,
    voidOfCourse: daily.vocResult,
    ci,
    profection: daily.profectionResult,
    rawFinal: finalDelta,
    ctxMult,
    dashaMult,
    nuclearHex: nuclearHexResult,
    dashaCertainty,
    shadowBaseSignal,  // Y1 — noyau védique pur ∈ [-1, +1]
    shadowScore: score, // Sprint AY — score unique, plus de dual path
    // Sprint AY — C4 live + SHAP explicabilité (ex-shadow, désormais actif)
    c4Shadow: _mainResult.c4,              // Sprint AY : C4 live (était shadow)
    cisCurrent: _mainResult.cis,           // CIS historique (gardé pour observabilité)
    shapley: _mainResult.shapley,          // Shapley exact 4 contributions + baseline
    // Z2-B — observabilité groupes (Ronde Z consensus 3/3 Option B)
    baziGroupDelta:  daily.baziGroupDelta,
    luneGroupDelta:  daily.luneGroupDelta,
    ephemGroupDelta: daily.ephemGroupDelta,
    // AA-5 — Journée Paradoxe : tension inter-groupes (GPT G3 + Gemini M1 — Ronde 2)
    // Formule : range = max(groupDeltas) - min(groupDeltas)
    // Déclenchement : range ≥ 20 ET garde signe (max ≥ +8 AND min ≤ -8)
    // Seuil intermédiaire : 20 pts (consensus GPT ≥22 / Gemini >18 → médiane arrondie)
    ...(() => {
      const gDeltas = [daily.baziGroupDelta, daily.luneGroupDelta, daily.ephemGroupDelta, daily.indivGroupDelta]; // AO-P2: 4e groupe
      const gMax    = Math.max(...gDeltas);
      const gMin    = Math.min(...gDeltas);
      const tension = gMax - gMin;
      const isPdx   = tension >= 20 && gMax >= 8 && gMin <= -8;
      return { paradoxTension: tension, isParadox: isPdx };
    })(),
  };
}

// ══════════════════════════════════════════════════════════════════════
// Sprint AW — C4 : Correlation-Corrected Concordance/Discordance
// ══════════════════════════════════════════════════════════════════════
// ═══ Ronde 29 V3 — scoreFromGroups : cœur tanh PARTAGÉ ═══════════════
// Fonction pure : 4 group deltas bruts → score [0, 100]
// Appelée par calcMainScore (live, alpha=0) ET calcDayPreview (calendrier, alpha=0→1)
//
// ═══ V5/E — Ronde Transit Finale (consensus 3/3 GPT+Grok+Gemini) ═══
// Architecture dual-branch avec alpha-blend :
//   alpha=0 (LIVE) : formule legacy INTACTE (zéro régression)
//   alpha=1 (futur ≥90j) : V5/E — terrain HORS tanh + décorrélation + biais dynamique
//   0<alpha<1 : transition C⁰ continue (rampe 90j — V5E_ALPHA_RAMP)
//
// V5/E Future branch :
//   1. Décorrélation Gram-Schmidt XE ← XE - 0.34×|XL| (r≈0.40 Lune/Ephém)
//   2. Biais dynamique (E[X_core] ≈ +0.55 → centré à 0)
//   3. Terrain HORS tanh : terrainOffset = 6×tanh((dashaMult-1)/0.16) [GPT's E]
//   4. HighZoneDamp : préserve discrimination au-dessus de 88 [GPT's E]
// ══════════════════════════════════════════════════════════════════════
const V5E_BIAS_OFFSET = 0.55;  // E[X_core] détecté par Grok MC simulation (365j) — consensus Ronde

// ═══ Ronde 6 — Side-channel Soft Shift : scoreFromGroups expose xt/dm pour passe 2 ═══
// Lecture synchrone par calcDayPreview immédiatement après appel — thread-safe (JS single-thread)
let _sfgLastXt = 0;   // X_total_future du dernier appel (0 = LIVE)
let _sfgLastDm = 0;   // dashaMult du dernier appel

/** @internal — exported for unit testing only */
export function scoreFromGroups(
  luneGroupDelta: number,
  ephemGroupDelta: number,
  baziGroupDelta: number,
  indivGroupDelta: number,
  ctxMult: number,
  dashaMult: number,
  baseSignal: number | undefined,
  alpha: number = 0,                     // V5/E — 0=LIVE legacy, 1=future V5/E
  biasOffset: number = V5E_BIAS_OFFSET,  // V5/E — biais dynamique par profil
): number {
  const A    = 44.0;   // Ronde 29 V3 (ex 36)
  const k    = 0.65;   // Ronde 29 V3 (ex 0.840)
  const _clampG = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

  // αG adaptatifs (Sprint AE) — même source que calcMainScore
  const ALPHA_G = getAdaptedAlphaG().current;
  const ALPHA_I = 0.90;
  const P95_G   = { lune: 9, ephem: 7, bazi: 11, indiv: 6 } as const;
  const G_CAP   = { lune: 0.90, ephem: 0.80, bazi: 0.85, indiv: 0.70 } as const;

  // Normalisation par P95 + pondération αG + caps
  const xL = _clampG(luneGroupDelta  / P95_G.lune,  -1, +1);
  const xE = _clampG(ephemGroupDelta / P95_G.ephem, -1, +1);
  const xB = _clampG(baziGroupDelta  / P95_G.bazi,  -1, +1);
  const xI = _clampG(indivGroupDelta / P95_G.indiv, -1, +1);

  const XL = _clampG(ALPHA_G.lune  * xL, -G_CAP.lune,  +G_CAP.lune);
  const XE = _clampG(ALPHA_G.ephem * xE, -G_CAP.ephem, +G_CAP.ephem);
  const XB = _clampG(ALPHA_G.bazi  * xB, -G_CAP.bazi,  +G_CAP.bazi);
  const XI = _clampG(ALPHA_I       * xI, -G_CAP.indiv, +G_CAP.indiv);

  // ═══ BRANCHE LIVE (alpha=0) — formule Ronde 29 V3 INTACTE ═══
  const X_core_live = _clampG(XL + XE + XB + XI, -2.80, +2.80);
  const c4_live = calcC4(XL, XE, XB, XI);
  const X_live = _clampG(X_core_live + c4_live, -3.15, +3.15);

  const terrain_brut = ctxMult * dashaMult;
  const terrain_sq   = 1 + 0.25 * Math.tanh((terrain_brut - 1) / 0.35);
  const beta_live    = Math.max(0.0, 0.8 * (1 - 0.25 * Math.abs(terrain_sq - 1) / 0.15));
  const X_total_live = X_live + beta_live * (baseSignal ?? 0);

  const fade = 0.15 + 0.85 / (1 + Math.exp(3 * (X_total_live - 1.5)));
  const effective_fade = terrain_sq > 1 ? fade : 1.0;
  const blended_sq = 1 + effective_fade * (terrain_sq - 1);
  const eff_terrain = Math.exp(Math.tanh(X_total_live / 0.35) * Math.log(blended_sq));

  const rawLive = 50 + A * Math.tanh(k * X_total_live * eff_terrain);
  const scoreLive = Math.max(0, Math.min(100, rawLive));

  // ═══ X_total FUTURE — calculé pour TOUS les jours (side-channel pour passe 2) ═══
  // Sprint N+ : on calcule X_total_future même quand alpha=0 (jours passés)
  // pour que applySoftShiftBlend traite toutes les années du calendrier.
  // Le score retourné pour alpha=0 reste scoreLive — zéro régression LIVE.
  // Ronde #36bis (2026-03-15) : consensus GPT+Gemini+Claude (3/4).
  // Rollback : remettre l'early return « if (alpha <= 0) { ... return scoreLive; } »

  const F_P95  = { lune: 12, ephem: 10, bazi: 14, indiv: 8 } as const;
  const F_AG   = { lune: 0.82, ephem: 0.78, bazi: 1.05, indiv: 0.65 } as const; // Σ=3.30 (αG inchangés)
  const F_CAP  = F_AG; // G_CAP = αG (revert V4.2 — k_future seul suffit, G_CAP×0.86 écrasait les tops)

  const fxL = _clampG(luneGroupDelta  / F_P95.lune,  -1, +1);
  const fxE = _clampG(ephemGroupDelta / F_P95.ephem, -1, +1);
  const fxB = _clampG(baziGroupDelta  / F_P95.bazi,  -1, +1);
  const fxI = _clampG(indivGroupDelta / F_P95.indiv, -1, +1);
  const FXL = _clampG(F_AG.lune  * fxL, -F_CAP.lune,  +F_CAP.lune);
  const FXE = _clampG(F_AG.ephem * fxE, -F_CAP.ephem, +F_CAP.ephem);
  const FXB = _clampG(F_AG.bazi  * fxB, -F_CAP.bazi,  +F_CAP.bazi);
  const FXI = _clampG(F_AG.indiv * fxI, -F_CAP.indiv, +F_CAP.indiv);

  const X_core_future = _clampG(FXL + FXE + FXB + FXI, -2.80, +2.80);
  // V4.3 : coverage 3/4 relevée 0.55→0.75 pour la branche FUTURE
  // En 2027, I ou E tombe souvent en deadzone → C4 chutait de 0.35 à 0.19 (trop sévère)
  // Avec 0.75 : C4 3/4 = 0.35×0.75 = 0.26 → réduit le gap inter-années de ~1pt
  // LIVE garde 0.55 (appel sans paramètre, ligne 1169)
  const c4_future = calcC4(FXL, FXE, FXB, FXI, 0.75);
  const X_total_future = _clampG(X_core_future + c4_future, -3.15, +3.15);

  // ═══ Side-channel : exposer xt/dm pour passe 2 (applySoftShiftBlend) — TOUS les jours ═══
  _sfgLastXt = X_total_future;
  _sfgLastDm = dashaMult;

  // Fast path : alpha≤0 → retour scoreLive, side-channel déjà posé pour passe 2
  if (alpha <= 0) return Math.round(scoreLive);

  // ═══ Score base FUTURE — Ronde 6 Soft Shift (consensus 3/3 GPT+Grok+Gemini) ═══
  // g(X) = X − c_s × tanh(X / c_s) : shift asymptotique préservant le neutre
  //   g(0)=0 → score(X=0)=50 ✓  |  g(∞)→X−c_s (≡ shift classique)
  //   g'(x)=tanh²(x/c_s) ≥ 0 → monotone ✓  |  g impaire → symétrique ✓
  // S_abs utilise k=0.80 (raideur) + c_s=0.50 (amplitude soft shift initiale)
  // Le blend S_rel (ρ=0.32, c_s adaptatif) est appliqué en passe 2 post-traitement annuel
  //   (applySoftShiftBlend dans CalendarTab.yearHeatmap — Ronde 8 v2+kicker quadratique)
  // Rollback : remettre k_future=0.65 + scoreBase = 50 + A * tanh(k_future * Xt)
  const SS_K = 0.80;  // pente courbe Soft Shift (zone stable [0.75, 0.85])
  const SS_C = 0.50;  // amplitude soft shift (zone stable [0.45, 0.55])
  const g_ss = X_total_future - SS_C * Math.tanh(X_total_future / SS_C);
  const scoreBase = 50 + A * Math.tanh(SS_K * g_ss);

  // ═══ TERRAIN ADDITIF — V4.3 Équilibre inter-années ═══
  // Bonus/malus proportionnel à dashaMult, plafonné par tanh.
  // TERRAIN_PTS = amplitude max (±1 pt). TERRAIN_WIDTH = sensibilité.
  // V4.3 : PTS réduit de 2.0→1.0 (simulation 2026-03-15)
  //   Ancien swing 2037↔2027 = 3.2 pts → 21 Cosmiques vs 0 (déséquilibré)
  //   Nouveau swing = 1.6 pts → ~14 Cosmiques vs ~2 (équilibré)
  //   Rollback : remettre 2.0
  // dm=1.045 → +0.63 pts | dm=1.0 → 0 | dm=0.884 → -0.96 pts
  const TERRAIN_PTS   = 1.0;
  const TERRAIN_WIDTH = 0.06;
  const terrainBonus = TERRAIN_PTS * Math.tanh((dashaMult - 1) / TERRAIN_WIDTH);

  let scoreFuture: number = scoreBase + terrainBonus;
  scoreFuture = Math.max(0, Math.min(100, scoreFuture));

  // ═══ ALPHA-BLEND Live ↔ Future (transition C⁰ continue) ═══
  // Note : side-channel _sfgLastXt/_sfgLastDm déjà posé avant le check alpha (cf. supra)
  const blended = (1 - alpha) * scoreLive + alpha * scoreFuture;
  return Math.max(0, Math.min(100, Math.round(blended)));
}

// Ronde 18 consensus 2/3 (GPT v2 + Grok concède) — formule Elena Vasquez révisée
// Remplace le CIS binaire par une mesure Purity × Intensity × Coverage avec soft gates
// Range : ±0.35 — actif ~15-40 jours/an (sélectif, anti-bruit)
// Sprint AY : C4 promu LIVE (injecté dans calcMainScore), CIS gardé pour observabilité
// ══════════════════════════════════════════════════════════════════════
/** @internal — exported for unit testing only */
export function calcC4(XL: number, XE: number, XB: number, XI: number, coverage3of4: number = 0.55): number {
  const _clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
  const eps = 1e-9;
  const G_CAP = { lune: 0.90, ephem: 0.80, bazi: 0.85, indiv: 0.70 } as const;

  // 1) Normalisation par caps de groupe → [-1, +1]
  const vRaw = [
    _clamp(XL / G_CAP.lune,  -1, +1),
    _clamp(XE / G_CAP.ephem, -1, +1),
    _clamp(XB / G_CAP.bazi,  -1, +1),
    _clamp(XI / G_CAP.indiv, -1, +1),
  ];

  // 2) Deadzone douce (dz=0.12, rampe linéaire — pas de cliff brutal)
  const dz = 0.12;
  const v = vRaw.map(x => {
    const ax = Math.abs(x);
    if (ax <= dz) return 0;
    return Math.sign(x) * (ax - dz) / (1 - dz);
  });

  const posMass = v.reduce((s, x) => s + Math.max(x, 0), 0);
  const negMass = v.reduce((s, x) => s + Math.max(-x, 0), 0);
  const posCount = v.filter(x => x > 0).length;
  const negCount = v.filter(x => x < 0).length;
  const domCount = Math.max(posCount, negCount);

  // 3) Condition minimum : ≥3 groupes concordants (sinon pas de "convergence")
  if (domCount < 3) return 0;

  const domMass = Math.max(posMass, negMass);
  const oppMass = Math.min(posMass, negMass);

  // 4) Purity : ratio de dominance [0, 1]
  const purity = (domMass - oppMass) / (domMass + oppMass + eps);

  // 5) Intensity : soft mass gate (rampe à partir de 0.95, pleine à 1.50)
  const intensity = _clamp((domMass - 0.95) / 0.55, 0, 1);

  // 6) Coverage : 4/4 alignés > 3/4 alignés (paramétrable pour FUTURE)
  const coverage = domCount === 4 ? 1.0 : coverage3of4;

  return 0.35 * Math.sign(posMass - negMass) * purity * intensity * coverage;
}

// ══════════════════════════════════════════════════════════════════════
// Sprint AW — Shapley exact (16 coalitions, N=4 features)
// Ronde 17-18 consensus 3/3 — contributions marginales additives
// φᵢ exact : Σ φᵢ = f(N) - f(∅)
// ══════════════════════════════════════════════════════════════════════
interface ShapleyContributions {
  lune: number;
  ephem: number;
  bazi: number;
  indiv: number;
  baseline: number;  // f(∅) = score avec tous groupes à 0
}

function _popcount(n: number): number {
  let c = 0; while (n) { c += n & 1; n >>= 1; } return c;
}

function computeShapley4(
  XL: number, XE: number, XB: number, XI: number,
  terrainSq: number, betaEff: number, baseSignal: number,
): ShapleyContributions {
  const _clampG = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
  const A = 44.0, k = 0.65;  // Ronde 29 V3 (ex A=36, k=0.840)
  const features = [XL, XE, XB, XI];

  // Poids Shapley pour N=4 : |S|!(3-|S|)!/4!
  const SHAP_W = [1/4, 1/12, 1/12, 1/4] as const; // par taille de coalition |S|=0,1,2,3

  // Précalculer les 16 scores f(S) pour chaque coalition (mask 0..15)
  const F = new Array<number>(16);
  for (let mask = 0; mask < 16; mask++) {
    const xs = [
      (mask & 1) ? features[0] : 0,
      (mask & 2) ? features[1] : 0,
      (mask & 4) ? features[2] : 0,
      (mask & 8) ? features[3] : 0,
    ];
    // Pipeline identique à calcMainScore V3 : X_core → C4 → X → eff_terrain → tanh → score
    const X_core = _clampG(xs[0] + xs[1] + xs[2] + xs[3], -2.80, +2.80);  // Ronde 29
    const c4 = calcC4(xs[0], xs[1], xs[2], xs[3]);
    const X = _clampG(X_core + c4, -3.15, +3.15);                          // Ronde 29
    const X_total = X + betaEff * baseSignal;
    const eff_t = Math.exp(Math.tanh(X_total / 0.35) * Math.log(terrainSq)); // Ronde 29 V3
    const raw = 50 + A * Math.tanh(k * X_total * eff_t);                     // Ronde 29 V3
    F[mask] = Math.max(0, Math.min(100, Math.round(raw)));
  }

  // Calcul des contributions Shapley exactes
  const phi = [0, 0, 0, 0];
  for (let i = 0; i < 4; i++) {
    const bit = 1 << i;
    for (let mask = 0; mask < 16; mask++) {
      if (mask & bit) continue; // i déjà dans S → skip
      const s = _popcount(mask);
      phi[i] += SHAP_W[s] * (F[mask | bit] - F[mask]);
    }
  }

  // Correction résiduelle (précision flottante)
  const baseline = F[0];
  const total = F[15];
  const sumPhi = phi.reduce((a, b) => a + b, 0);
  const resid = (total - baseline) - sumPhi;
  if (Math.abs(resid) > 1e-6) {
    const absSum = phi.reduce((a, b) => a + Math.abs(b), 0);
    for (let i = 0; i < 4; i++) {
      phi[i] += absSum > 0 ? resid * Math.abs(phi[i]) / absSum : resid / 4;
    }
  }

  return {
    lune: Math.round(phi[0] * 10) / 10,
    ephem: Math.round(phi[1] * 10) / 10,
    bazi: Math.round(phi[2] * 10) / 10,
    indiv: Math.round(phi[3] * 10) / 10,
    baseline,
  };
}

// ══════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════
// ═══ Ronde 29 V3 — MOTEUR PRINCIPAL ═══════════════════════════════════
// Formule tanh unifiée V3 : Score = 50 + 44 × tanh(0.65 × X_total × eff_terrain)
// eff_terrain = exp(tanh(X_total/0.35) × ln(terrain_sq))  — lissage Vasquez
// X_total = X_core + C4 + β_eff × base_signal
// Ronde 29 (consensus 3/3) : A=44, k=0.65, X_core ±2.80, X ±3.15
// ══════════════════════════════════════════════════════════════════════
/** @internal — exported for unit testing only */
export function calcMainScore(
  finalDelta: number,
  ctxMult: number,
  dashaMult: number,
  baseSignal: number | undefined,
  luneGroupDelta: number,
  ephemGroupDelta: number,
  baziGroupDelta: number,
  indivGroupDelta: number = 0,
): { score: number; c4: number; cis: number; shapley: ShapleyContributions } {
  try {
    const A    = 44.0;   // Ronde 29 V3 (ex 36)
    const k    = 0.65;   // Ronde 29 V3 (ex 0.840)

    const _clampG = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
    const ALPHA_G = getAdaptedAlphaG().current;
    const ALPHA_I = 0.90;
    const P95_G   = { lune: 9,    ephem: 7,    bazi: 11,   indiv: 6  } as const;
    const G_CAP   = { lune: 0.90, ephem: 0.80, bazi: 0.85, indiv: 0.70 } as const;

    const xL = _clampG(luneGroupDelta  / P95_G.lune,  -1, +1);
    const xE = _clampG(ephemGroupDelta / P95_G.ephem, -1, +1);
    const xB = _clampG(baziGroupDelta  / P95_G.bazi,  -1, +1);
    const xI = _clampG(indivGroupDelta / P95_G.indiv, -1, +1);

    const XL = _clampG(ALPHA_G.lune  * xL, -G_CAP.lune,  +G_CAP.lune);
    const XE = _clampG(ALPHA_G.ephem * xE, -G_CAP.ephem, +G_CAP.ephem);
    const XB = _clampG(ALPHA_G.bazi  * xB, -G_CAP.bazi,  +G_CAP.bazi);
    const XI = _clampG(ALPHA_I       * xI, -G_CAP.indiv, +G_CAP.indiv);

    const X_core = _clampG(XL + XE + XB + XI, -2.80, +2.80);  // Ronde 29 (ex ±1.6)

    // CIS gardé pour observabilité
    const _signs = [XL, XE, XB, XI];
    const _pos = _signs.filter(s => s > 0).length;
    const _neg = _signs.filter(s => s < 0).length;
    const _countAlign = Math.max(_pos, _neg);
    const _alignSign = _pos >= _neg ? 1 : -1;
    const cis = (_countAlign - 1) * 0.09 * _alignSign;

    const c4 = calcC4(XL, XE, XB, XI);
    const X = _clampG(X_core + c4, -3.15, +3.15);              // Ronde 29 (ex ±2.0)

    // Terrain combiné (ctxMult × dashaMult)
    const terrain_brut = ctxMult * dashaMult;
    const terrain_sq   = 1 + 0.25 * Math.tanh((terrain_brut - 1) / 0.35);

    // β_eff adaptatif (Ronde 2)
    const beta    = Math.max(0.0, 0.8 * (1 - 0.25 * Math.abs(terrain_sq - 1) / 0.15));
    const X_total = X + beta * (baseSignal ?? 0);

    // Ronde Rééquilibrage — Fade-out terrain en zone haute (consensus 3/3)
    const fade      = 0.15 + 0.85 / (1 + Math.exp(3 * (X_total - 1.5)));
    // Ronde Transit — Fade-out asymétrique (Gemini, consensus 3/3)
    const effective_fade = terrain_sq > 1 ? fade : 1.0;
    const blended_sq = 1 + effective_fade * (terrain_sq - 1);

    // Ronde 29 V3 — eff_terrain lissé (Vasquez) : transition C¹ continue
    const eff_terrain = Math.exp(Math.tanh(X_total / 0.35) * Math.log(blended_sq));

    // Formule tanh unifiée V3 — terrain DANS le tanh
    const raw       = 50 + A * Math.tanh(k * X_total * eff_terrain);
    const mainScore = Math.max(0, Math.min(100, Math.round(raw)));

    // Shapley exact 16 coalitions (Ronde 17-18 consensus 3/3)
    const shapley = computeShapley4(XL, XE, XB, XI, terrain_sq, beta, baseSignal ?? 0);

    return { score: mainScore, c4, cis, shapley };
  } catch (e) {
    throw new Error(`[calcMainScore] échec: ${e instanceof Error ? e.message : e}`);
  }
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
      alerts.push({ date: ds, type: 'retrograde', message: `☿ ${merc.label} — protège contrats et communications`, icon: '☿' });
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
    const label = score >= COSMIC_THRESHOLD ? 'Cosmique' : score >= 80 ? 'Gold' : score >= 65 ? 'Favorable' : score >= 40 ? 'Routine' : score >= 25 ? 'Prudence' : 'Tempête';
    const labelIcon = score >= COSMIC_THRESHOLD ? '🌟' : score >= 80 ? '🌟' : score >= 65 ? '✦' : score >= 40 ? '☉' : score >= 25 ? '☽' : '⛈';
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
      scores.push(Math.max(5, Math.min(97, compressL1Legacy(rawDelta))));

      if (logDetails && import.meta.env.DEV) {
        console.log(`${ds} | raw=${rawDelta} | score=${compressL1Legacy(rawDelta)} | BaZi=${baziDMPts} | 10G=${tgPts} | Nak=${nakPts}`);
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

  if (import.meta.env.DEV) {
    console.log(`\n=== DEBUG DISTRIBUTION V8 — ${days} jours autour d'aujourd'hui ===`);
    console.log('Formule V8.9 : BaZi DM(±6) + 10 Gods(±6) + Nakshatra(±7) | compressL1Legacy(maxDelta=22, exp=1.05)');
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
  }

  return { cosmiqueRate, goldRate, tempeteRate, avgScore: avg, rawDeltas };
}

export function debugAnalyzeCapture(): void {
  const buf = typeof window !== 'undefined'
    ? ((window as unknown as Record<string, unknown>).__kRawDeltas as number[] | undefined)
    : undefined;
  if (!buf || buf.length === 0) {
    if (import.meta.env.DEV) console.log('Aucun delta capturé. Active la capture avec : window.__kDebug = true');
    return;
  }
  // Sprint AU P2 : aligné sur compressL1Legacy() réel (maxDelta=22, exp=1.05) — était compress47(47, 1.4) obsolète
  const scores = buf.map(d => Math.max(5, Math.min(97, compressL1Legacy(d))));
  const n = scores.length;
  if (import.meta.env.DEV) {
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
}
