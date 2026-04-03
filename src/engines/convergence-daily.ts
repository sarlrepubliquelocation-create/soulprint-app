// ══════════════════════════════════════
// ═══ CONVERGENCE DAILY — L1 — V8.0 ═══
// Step 5 split : modules quotidiens de calcConvergence
// Contient : helpers (calcDayType, ichingScoreV4, calcMoonScore)
//           + calcDailyModules() — L1 pass-by-reference Option A
// Ne contient PAS les modules lents (L2) ni l'assemblage final (L3)
// ══════════════════════════════════════

import { type NumerologyProfile, getNumberInfo, isMaster, getActivePinnacleIdx } from './numerology';
import { type AstroChart, PLANET_FR, SIGN_FR, SIGNS, calcPersonalTransits, getPlanetLongitudeForDate } from './astrology';
import { type IChingReading, getHexTier } from './iching';
import { getMoonPhase, getLunarEvents, getMoonTransit, getMercuryStatus, getLunarNodeTransit, type LunarNodeTransit, getVoidOfCourseMoon, type VoidOfCourseMoon } from './moon'; // Sprint AO P6: getPlanetaryRetroScore retiré
import { calcBaZiDaily, calc10Gods, calcDayMaster, getMonthPillar, type DayMasterDailyResult, type TenGodsResult, getPeachBlossom, checkShenSha, type ShenShaResult } from './bazi'; // Sprint AS P1 : getElementRelation + ChangshengResult retirés (zéro usage dans ce fichier)
// Sprint AS P1 : InteractionResult retiré (zéro usage dans ce fichier)
import { calcProfection, getDomainScore, type ProfectionResult } from './profections';
import { safeParseDateLocal, safeNum } from './safe-utils'; // Sprint AG
import { calcDMStrength, getDMMultiplier, type DMStrengthResult } from './dm-strength'; // Sprint AI
import { getAyanamsa, calcNakshatraComposite, type NakshatraData } from './nakshatras'; // Sprint AO P6: getPada, PADA_MULTIPLIERS, PADA_NAMES retirés
import { getActiveLineScore, getNuclearScore } from './iching-yao';
import { type SystemBreakdown, type SignalDisplay, type LifeDomain, type DayType, type DayTypeInfo, SLOW_PLANETS } from './convergence.types';
import { getCurrentPlanetaryHour, type PlanetaryHour } from './planetary-hours'; // V9 Sprint 4
import { calcFixedStarScore, type FixedStarResult } from './fixed-stars'; // V9.6 Sprint A3
import { calcAshtakavarga, buildSAV, calcMoonBAVSAV, extractNatalSiderealSignIdx } from './ashtakavarga'; // V9.6 Sprint C + Sprint AK SAV
import { calcKineticShocks } from './kinetic-shocks'; // Sprint AL — Chantier 5 Sprint 2
import { calcPanchanga, type PanchangaResult, calcTarabala, calcChandrabala, type TarabalaResult, type ChandrabalaResult, getTithiLord, calcTithiLordGochara, type TithiLordGocharaResult, calcGrahaDrishti, type GrahaDrishtiResult, calcYogaKartari, type KartariResult, combinedBala } from './panchanga'; // Sprint D3 + Sprint G + Sprint J + Sprint L + Sprint M + Sprint P

// ══════════════════════════════════════
// ═══ CONSTANTES INTERNES ═══
// ══════════════════════════════════════

const DAY_TYPES: Record<DayType, Omit<DayTypeInfo, 'type'>> = {
  decision:      { label: 'Décision',      icon: '🌟', desc: 'Énergie favorable aux choix importants et engagements',      color: '#FFD700' },
  observation:   { label: 'Observation',   icon: '🔍', desc: "Lucidité accrue — agis avec discernement, vise juste",          color: '#60a5fa' },
  communication: { label: 'Communication', icon: '🤝', desc: 'Énergie propice aux échanges, contacts et négociations',     color: '#4ade80' },
  retrait:       { label: 'Retrait',       icon: '🧘', desc: 'Énergie de repos stratégique et de recentrage',              color: '#9370DB' },
  expansion:     { label: 'Expansion',     icon: '🚀', desc: 'Énergie de croissance — terrain favorable pour avancer',     color: '#FF69B4' },
};

const PD_TO_DAYTYPE: Record<number, DayType> = {
  1: 'decision', 2: 'observation', 3: 'communication', 4: 'decision',
  5: 'expansion', 6: 'communication', 7: 'observation', 8: 'decision',
  9: 'retrait', 11: 'expansion', 22: 'decision', 33: 'expansion',
};

const ICHING_DECISION:      number[] = [1, 14, 25, 34, 43, 49, 50];
const ICHING_OBSERVATION:   number[] = [4, 20, 48, 52, 57, 59, 64];
const ICHING_COMMUNICATION: number[] = [8, 13, 31, 37, 45, 58, 61];
const ICHING_RETRAIT:       number[] = [2, 12, 23, 33, 36, 39, 62];
const ICHING_EXPANSION:     number[] = [3, 11, 42, 46, 53, 55, 63];

// V4.0: Points recalibrés (A:+8, B:+4, C:+1, D:-3, E:-7)
const ICHING_V4_POINTS: Record<string, number> = {
  A: 8, B: 4, C: 1, D: -3, E: -7,
};

// ══════════════════════════════════════
// ═══ JIAN CHU — FONCTION PARTAGÉE ═══
// Sprint AT : extrait de calcDailyModules pour partage avec calcDayPreview (Ronde 13 consensus 3/3 Option A)
// ══════════════════════════════════════

const JIAN_CHU_OFFICERS: ReadonlyArray<{ zh: string; fr: string; pts: number }> = [
  { zh: '建', fr: 'Établir',    pts:  2 },  // 0 — lancer, commencer
  { zh: '除', fr: 'Retirer',    pts:  0 },  // 1 — purification, transition
  { zh: '满', fr: 'Remplir',    pts:  1 },  // 2 — abondance
  { zh: '平', fr: 'Équilibrer', pts:  0 },  // 3 — stable, neutre
  { zh: '定', fr: 'Fixer',      pts:  1 },  // 4 — contrats, stabilité
  { zh: '执', fr: 'Saisir',     pts:  0 },  // 5 — exécution ordinaire
  { zh: '破', fr: 'Briser',     pts: -2 },  // 6 — très défavorable, éviter
  { zh: '危', fr: 'Danger',     pts: -1 },  // 7 — prudence, risques
  { zh: '成', fr: 'Succès',     pts:  2 },  // 8 — le meilleur, toutes actions
  { zh: '收', fr: 'Récolter',   pts:  1 },  // 9 — clôturer, encaisser
  { zh: '开', fr: 'Ouvrir',     pts:  2 },  // 10 — débuter, voyager
  { zh: '闭', fr: 'Fermer',     pts: -1 },  // 11 — éviter les actions
];

/**
 * Traduction des labels 10 Dieux BaZi en langage humain pour les signaux utilisateur.
 * Élimine les caractères chinois et le jargon technique.
 */
function tenGodToHuman(label: string): string {
  const l = label.replace(/^[\u4e00-\u9fff\s]+/, '').trim().toLowerCase();
  if (l.includes('compagnon'))          return 'Énergie de coopération';
  if (l.includes('concurrent'))         return 'Énergie de compétition';
  if (l.includes('expression'))         return 'Énergie d\'expression';
  if (l.includes('création brute'))     return 'Énergie créative';
  if (l.includes('richesse directe'))   return 'Énergie de gain stable';
  if (l.includes('richesse indirecte')) return 'Énergie d\'opportunité';
  if (l.includes('pouvoir direct'))     return 'Énergie d\'autorité';
  if (l.includes('pouvoir indirect'))   return 'Énergie de contrôle';
  if (l.includes('soutien'))            return 'Énergie de soutien';
  if (l.includes('savoir'))             return 'Énergie de sagesse';
  return label.replace(/^[\u4e00-\u9fff\s]+/, '').trim(); // fallback sans sinogrammes
}

/**
 * Sprint AT — Jian Chu score pur (débias + ×0.5).
 * Fonction extraite pour partage L1 (calcDailyModules) et L3 (calcDayPreview).
 * @returns { pts: number, officer: { zh, fr, pts } | null }
 */
export function calcJianChuPts(dateStr: string): { pts: number; officer: { zh: string; fr: string; pts: number } | null } {
  try {
    const jcDate        = new Date(dateStr + 'T12:00:00');
    const dayBranchIdx  = calcDayMaster(jcDate).branch.index;
    const monthBranchIdx = getMonthPillar(jcDate).branchIdx;
    const officerIdx    = ((dayBranchIdx - monthBranchIdx) % 12 + 12) % 12;
    const officer       = JIAN_CHU_OFFICERS[officerIdx];
    const pts           = (officer.pts - (5 / 12)) * 0.85; // V8.9 debias + ×0.85 (Sprint AV P1 — Ronde 16 vote 1, consensus 3/3)
    return { pts, officer };
  } catch {
    return { pts: 0, officer: null };
  }
}

// ══════════════════════════════════════
// ═══ INTERFACES INTERNES ═══
// ══════════════════════════════════════

// V4.9 Sprint C2 : retour étendu pour affichage Yao/Nuclear séparé
interface IChingScoreResult {
  pts: number;
  tier: string;
  yao: number;
  nuclear: number;
}

export interface MoonScore {
  points: number;
  eclipseContrib: number; // V5.5 : contribution éclipses génériques séparée (exclusion mutuelle)
  detail: string;
  signals: string[];
  alerts: string[];
  phaseLabel: string;
}

// ══════════════════════════════════════
// ═══ RÉSULTAT DU MODULE L1 ═══
// Contient toutes les valeurs produites par calcDailyModules()
// et consommées par L2 (convergence-slow.ts) ou L3 (convergence.ts)
// ══════════════════════════════════════

export interface DailyModuleResult {
  // Snapshot L1 → L2 formula
  dailyDeltaSnapshot: number;
  // Used by L3 assembly
  dayType: DayTypeInfo;
  moonResult: MoonScore;       // for eclipse exclusion mutuelle in L3
  moonTr: { sign: string; element: string; icon: string };
  nodeTransit: LunarNodeTransit | null;
  baziResult: DayMasterDailyResult | null;
  tenGodsResult: TenGodsResult | null;
  // Sprint AR P3 : changshengResult, trinityActive, interactionResult supprimés (Ronde 11 consensus 3/3)
  shenShaResult: ShenShaResult | null;
  profectionResult: ProfectionResult | undefined;
  nakshatraData: NakshatraData | undefined;
  directDomainBonuses: Partial<Record<LifeDomain, number>>;
  mercPts: number;
  vocResult: VoidOfCourseMoon | null;
  // Needed for temporalConfidence in L3
  pyPts: number;
  pmPts: number;
  pinnPts: number;
  // Sprint AR P3 : numTotal supprimé (Ronde 11 consensus 3/3)
  // Needed for v6Ctx in L2 + calculateContextualScores in L3
  pyv: number;
  moonPhaseRawPhase: number;  // moonPhaseRaw.phase
  // Needed for R21/R27 scoring in L2
  _transitBreakdown: Array<{ transitPlanet: string; natalPoint?: string; score: number; aspectType?: string }>;
  planetaryHour: PlanetaryHour | null; // V9 Sprint 4 — heure planétaire chaldéenne courante
  // Z2-B — deltas de groupe pour observabilité L3 (Ronde Z consensus 3/3)
  baziGroupDelta: number;   // C_BAZI capé ±15
  luneGroupDelta: number;   // C_LUNE capé ±12 (Sprint AO BONUS)
  ephemGroupDelta: number;  // C_EPHEM capé ±10 (Sprint AN — était ±14)
  indivGroupDelta: number;  // Sprint AN — C_INDIV capé ±8
  // Ronde #22 — Progressive Disclosure
  richSignals: SignalDisplay[];
  richAlerts: SignalDisplay[];
  // Ronde #24 — Résonance Lunaire Natale (longitude sidérale Lune transit à 12h UTC)
  transitMoonSid: number | null;
}

// ══════════════════════════════════════
// ═══ HELPERS EXPORTÉS ═══
// (utilisés aussi par calcDayPreview dans convergence.ts)
// ══════════════════════════════════════

// Sprint AR P2 : getNaYinAffinityFactor supprimée — zéro appelant (Ronde 11 consensus 3/3)

export function calcDayType(pdv: number, iching: IChingReading, astro: AstroChart | null): DayTypeInfo {
  let base: DayType = PD_TO_DAYTYPE[pdv] || 'observation';
  const hx = iching.hexNum;
  let ichingType: DayType | null = null;
  if (ICHING_DECISION.includes(hx))      ichingType = 'decision';
  if (ICHING_OBSERVATION.includes(hx))   ichingType = 'observation';
  if (ICHING_COMMUNICATION.includes(hx)) ichingType = 'communication';
  if (ICHING_RETRAIT.includes(hx))       ichingType = 'retrait';
  if (ICHING_EXPANSION.includes(hx))     ichingType = 'expansion';

  if (ichingType && ichingType !== base) {
    if (astro && astro.tr.length > 0) {
      const hasHard = astro.tr.some(t => t.t === 'square' || t.t === 'opposition');
      const hasSoft = astro.tr.some(t => t.t === 'trine' || t.t === 'sextile');
      const hasExact = astro.tr.some(t => t.x);
      if (hasHard && !hasSoft && (ichingType === 'retrait' || ichingType === 'observation')) base = ichingType;
      else if ((hasSoft || hasExact) && (ichingType === 'expansion' || ichingType === 'decision' || ichingType === 'communication')) base = ichingType;
    } else {
      base = ichingType;
    }
  }
  return { type: base, ...DAY_TYPES[base] };
}

// V4.9 Sprint C2 : retour étendu
export function ichingScoreV4(hexNum: number, changing: number): IChingScoreResult {
  const hexTier = getHexTier(hexNum);
  const tierPts = ICHING_V4_POINTS[hexTier.tier] ?? 1;
  const yaoRaw = getActiveLineScore(hexNum, changing);
  const yao = Math.max(-6, Math.min(6, tierPts + yaoRaw));
  const nuclearRaw = getNuclearScore(hexNum);
  const coherence = (nuclearRaw === 0 || tierPts === 0) ? 1.0
    : Math.sign(tierPts) === Math.sign(nuclearRaw) ? 1.35 : 0.65;
  const nuclear = Math.max(-3, Math.min(3, Math.round(nuclearRaw * coherence)));
  const pts = Math.max(-9, Math.min(9, yao + nuclear));
  console.assert(Math.abs(pts) <= 9, '[Kaironaute] I Ching Cap Overflow', pts);
  return { pts, tier: hexTier.tier, yao, nuclear };
}

export function calcMoonScore(targetDate: string, dayType: DayType): MoonScore {
  const d = safeParseDateLocal(targetDate) ?? new Date(targetDate + 'T12:00:00'); // Sprint AG: date validation
  const moon = getMoonPhase(d);
  const events = getLunarEvents(d);
  let points = 0;
  const signals: string[] = [];
  const alerts: string[] = [];

  const phase = moon.phase;
  const isWaxing = phase >= 1 && phase <= 3;
  const isWaning = phase >= 5 && phase <= 7;
  const isNew = phase === 0;
  const isFull = phase === 4;
  const isActionDay = dayType === 'decision' || dayType === 'expansion';
  const isReceptiveDay = dayType === 'retrait' || dayType === 'observation';

  if (isNew && isReceptiveDay) {
    points += 4;
    signals.push(`${moon.emoji} Nouvelle Lune + jour ${dayType} → alignement pour poser des intentions`);
  } else if (isNew && isActionDay) {
    points -= 2;
    alerts.push(`${moon.emoji} Nouvelle Lune + jour d'action → l'énergie lunaire invite à la patience`);
  } else if (isFull && isActionDay) {
    points += 4;
    signals.push(`${moon.emoji} Pleine Lune + jour ${dayType} → énergie de culmination`);
  } else if (isFull && isReceptiveDay) {
    points -= 2;
    alerts.push(`${moon.emoji} Pleine Lune + jour de retrait → émotions amplifiées`);
  } else if (isWaxing && isActionDay) {
    points += 2;
    signals.push(`${moon.emoji} Lune croissante + énergie d'action → momentum`);
  } else if (isWaning && isActionDay) {
    points -= 2;
    alerts.push(`${moon.emoji} Lune décroissante + jour d'action → énergie en repli`);
  } else if (isWaning && isReceptiveDay) {
    points += 2;
    signals.push(`${moon.emoji} Lune décroissante + repos → bon cycle pour lâcher prise`);
  }

  let eclipseContrib = 0;
  for (const ev of events) {
    if (ev.status === 'today') {
      if (ev.type === 'supermoon') {
        points += 2;
        signals.push(`${ev.icon} Super Lune — intuition amplifiée`);
      } else {
        const eclPts = ev.intensity === 'forte' ? -2 : ev.intensity === 'modérée' ? -1 : -1;
        points += eclPts;
        eclipseContrib += eclPts;
        alerts.push(`${ev.icon} ${ev.name} — ${ev.intensity === 'forte' ? 'prudence maximale' : 'vigilance'}`);
      }
    } else if (ev.status === 'past' && ev.daysUntil >= -3 && ev.type !== 'supermoon') {
      points -= 1;
      eclipseContrib -= 1;
      alerts.push(`${ev.icon} ${ev.name} (il y a ${Math.abs(ev.daysUntil)}j) — effets résiduels`);
    }
  }

  points = Math.max(-4, Math.min(4, points));
  return {
    points,
    eclipseContrib,
    detail: `${moon.name} (${moon.illumination}%)`,
    signals, alerts,
    phaseLabel: `${moon.emoji} ${moon.name}`,
  };
}

// ══════════════════════════════════════
// ═══ V8.4 : MAISONS → DOMAINES (R29 Grok) ═══
// Routage des transits lents vers les domaines Kaironaute selon la maison natale du point activé.
// Impact sur directDomainBonuses uniquement (pas de delta global — anti-biais permanent).
// Guard profection : si la maison est déjà active en profection → ×0.5 (anti-cumul R27/R29/R30).
// ══════════════════════════════════════

const HOUSE_DOMAIN: Partial<Record<number, LifeDomain>> = {
  1: 'VITALITE',      2: 'BUSINESS',      3: 'RELATIONS',
  4: 'INTROSPECTION', 5: 'CREATIVITE',    6: 'VITALITE',
  7: 'AMOUR',         8: 'INTROSPECTION', 9: 'CREATIVITE',
  10: 'BUSINESS',     11: 'RELATIONS',    12: 'INTROSPECTION',
};

function enrichDomainScoresWithHouses(
  astro: AstroChart,
  directDomainBonuses: Partial<Record<LifeDomain, number>>,
  profectionHouse?: number
): void {
  // Modifie directDomainBonuses IN PLACE — jamais le delta global
  for (const planet of astro.pl) {
    const house = planet.h;
    if (!house || !HOUSE_DOMAIN[house]) continue;
    const activeTransit = astro.tr.find(t =>
      t.np === planet.k && SLOW_PLANETS.has(t.tp) && t.o <= 3
    );
    if (!activeTransit) continue;
    const domain = HOUSE_DOMAIN[house]!;
    // Guard profection : maison identique à la profection annuelle active → ×0.5
    const isOverlap = profectionHouse !== undefined && profectionHouse === house;
    const houseFactor = isOverlap ? 0.5 : 1.0;
    const contribution = Math.round((activeTransit.t === 'conjunction' ? 4 : 2) * houseFactor);
    directDomainBonuses[domain] = (directDomainBonuses[domain] || 0) + contribution;
  }
}

// ══════════════════════════════════════════════════════════════════════
// ═══ Ronde Transit Fix — calcTransitsLite (consensus 3/3 Option B) ═══
// Recalcule les transits personnels pour une date quelconque en utilisant
// getPlanetLongitudeForDate (Meeus) au lieu de astro.tr figé au jour J.
// Mêmes planètes lentes (5), mêmes points nataux (7), mêmes orbes,
// même gaussienne σ=1.2° que calcPersonalTransits.
// Pas de filtre natal (natalAspects), dignités, stelliums — ces modifiers
// sont structurels et ne changent pas le diagnostic (biais ±0.3 pts max).
// ══════════════════════════════════════════════════════════════════════

// Amplitudes identiques à TRANSIT_AMPLITUDES dans astrology.ts
const _LITE_AMPLITUDES: Record<string, { harmonic: number; tense: number; conjunction: number }> = {
  jupiter:  { harmonic:  6, tense: -2, conjunction:  6 },
  saturn:   { harmonic:  4, tense: -8, conjunction: -6 },
  uranus:   { harmonic:  6, tense: -6, conjunction:  5 },
  neptune:  { harmonic:  5, tense: -5, conjunction:  3 },
  pluto:    { harmonic: 10, tense: -10, conjunction: -8 },
};
const _LITE_NATAL_MULTS: Record<string, number> = { sun: 1.5, moon: 1.5, asc: 1.2 };
const _LITE_SLOW = ['jupiter', 'saturn', 'uranus', 'neptune', 'pluto'] as const;
const _LITE_NATAL_TARGETS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'] as const;
// Aspects : { angle, maxOrb }
const _LITE_ASPECTS = [
  { name: 'conjunction', angle: 0, orb: 3 },
  { name: 'opposition', angle: 180, orb: 3 },
  { name: 'trine', angle: 120, orb: 3 },
  { name: 'square', angle: 90, orb: 3 },
  { name: 'sextile', angle: 60, orb: 2 },
] as const;
const _LITE_HARMONIC = new Set(['trine', 'sextile']);
const _LITE_TENSE = new Set(['square', 'opposition']);

function calcTransitsLite(
  natalPlanets: Array<{ k: string; s: string; d: number }>,
  targetDate: string,
): number {
  const sigma = 1.2;
  const sigmaSq2 = 2 * sigma * sigma;
  const gaussian = (orb: number) => Math.exp(-(orb * orb) / sigmaSq2);
  const targetD = new Date(targetDate + 'T12:00:00');

  let total = 0;

  for (const tp of _LITE_SLOW) {
    const transitLon = getPlanetLongitudeForDate(tp, targetD);
    const ampTable = _LITE_AMPLITUDES[tp];
    if (!ampTable) continue;

    for (const np of natalPlanets) {
      if (!(_LITE_NATAL_TARGETS as readonly string[]).includes(np.k)) continue;
      const natalLon = np.d + SIGNS.indexOf(np.s) * 30;

      const diff = Math.abs(transitLon - natalLon);
      const normDiff = diff > 180 ? 360 - diff : diff;

      for (const asp of _LITE_ASPECTS) {
        const orbVal = Math.abs(normDiff - asp.angle);
        if (orbVal > asp.orb) continue;

        let amplitude: number;
        if (asp.name === 'conjunction') amplitude = ampTable.conjunction;
        else if (_LITE_HARMONIC.has(asp.name)) amplitude = ampTable.harmonic;
        else if (_LITE_TENSE.has(asp.name)) amplitude = ampTable.tense;
        else continue;

        const natalMult = _LITE_NATAL_MULTS[np.k] ?? 1.0;
        const intensity = gaussian(orbVal);
        total += amplitude * natalMult * intensity;
      }
    }
  }

  return Math.max(-15, Math.min(15, +total.toFixed(2)));
}

// ══════════════════════════════════════════════════════════════════════
// ═══ GROUP RESULT INTERFACES — Refactoring Step 5b ═══
// Chaque sous-fonction retourne ses propres arrays (pur, pas de mutation)
// ══════════════════════════════════════════════════════════════════════

interface GroupOutput {
  breakdowns: SystemBreakdown[];
  signals: string[];
  alerts: string[];
}

interface BaziGroupOutput extends GroupOutput {
  baziFamilyTotal: number;
  baziResult: DayMasterDailyResult | null;
  tenGodsResult: TenGodsResult | null;
  shenShaResult: ShenShaResult | null;
  profectionResult: ProfectionResult | undefined;
  directDomainBonuses: Partial<Record<LifeDomain, number>>;
  dmS: number;
}

interface LuneGroupOutput extends GroupOutput {
  luneGroupCapped: number;
  nakshatraData: NakshatraData | undefined;
  vocResult: VoidOfCourseMoon | null;
  panchangaResult: PanchangaResult | null;
  natalMoonSidForNak: number | null;
}

interface EphemGroupOutput extends GroupOutput {
  ephemGroupCapped: number;
  _transitBreakdown: Array<{ transitPlanet: string; natalPoint?: string; score: number; aspectType?: string }>;
  planetaryHour: PlanetaryHour | null;
}

interface IndivGroupOutput extends GroupOutput {
  indivGroupCapped: number;
}

// ══════════════════════════════════════════════════════════════════════
// ═══ _calcBaziGroup — C_BAZI ±15 ═══
// BaZi DM + 10 Gods + Shen Sha + Jian Chu + Profections + Domaines
// ══════════════════════════════════════════════════════════════════════

function _calcBaziGroup(bd: string, todayStr: string, astro: AstroChart | null): BaziGroupOutput {
  const breakdowns: SystemBreakdown[] = [];
  const signals: string[] = [];
  const alerts: string[] = [];

  let baziResult: DayMasterDailyResult | null = null;
  let tenGodsResult: TenGodsResult | null = null;
  let baziDMPts = 0;
  let tenGodsPts = 0;
  let dmS = 0;
  const baziSignals: string[] = [];
  const baziAlerts: string[] = [];

  const birthDate = safeParseDateLocal(bd) ?? new Date(bd + 'T12:00:00');
  const todayDate = safeParseDateLocal(todayStr) ?? new Date(todayStr + 'T12:00:00');

  try {
    baziResult = calcBaZiDaily(birthDate, todayDate, 50);
    baziDMPts = Math.max(-6, Math.min(6, Math.round(baziResult.totalScore * 2)));
    if (baziDMPts > 0) {
      baziSignals.push(`Énergie du jour porteuse — ${baziResult.relation === 'produced_by' ? 'tu es soutenu' : 'bonne harmonie'}`);
    } else if (baziDMPts < 0) {
      baziAlerts.push(`Énergie du jour sous tension — ${baziResult.relation === 'destroyed_by' ? 'reste vigilant' : 'petite friction'}`);
    }

    tenGodsResult = calc10Gods(birthDate, todayDate);
    let dmResult: DMStrengthResult | null = null;
    try {
      dmResult = calcDMStrength(birthDate, null);
    } catch { /* DM strength fail silently */ }
    dmS = dmResult?.s ?? 0;
    const rawTenGods = tenGodsResult.totalScore;
    const dominantGod = tenGodsResult.dominant?.god;
    const dmMult = dominantGod ? getDMMultiplier(dominantGod, dmS) : 1.0;
    const modulatedTenGods = Math.round(rawTenGods * dmMult);
    tenGodsPts = Math.max(-6, Math.min(6, modulatedTenGods));
    if (tenGodsResult.dominant) {
      const d = tenGodsResult.dominant;
      const zhengLabel = d.isZheng ? '正' : '偏';
      if (tenGodsPts > 0) baziSignals.push(`${tenGodToHuman(d.label)} — favorable`);
      else if (tenGodsPts < 0) baziAlerts.push(`${tenGodToHuman(d.label)} — en friction`);
    }
  } catch { /* BaZi/10Gods fail silently */ }

  // Peach Blossom (+2, Amour domain only)
  let peachBlossomActive = false;
  try {
    const peachBirthDate = new Date(bd + 'T12:00:00');
    const peachTodayDate = new Date(todayStr + 'T12:00:00');
    const peachResult = getPeachBlossom(peachBirthDate, peachTodayDate);
    peachBlossomActive = peachResult.active;
  } catch { /* silent */ }

  const baziCorePts = Math.max(-8, Math.min(8, baziDMPts + tenGodsPts));

  signals.push(...baziSignals);
  alerts.push(...baziAlerts);

  breakdowns.push({
    system: 'BaZi', icon: '干',
    value: baziResult ? `${baziResult.dailyStem.chinese} ${baziResult.dailyStem.pinyin}` : 'N/A',
    points: baziDMPts,
    detail: baziResult ? baziResult.interaction.dynamique.split('.')[0] : 'Non disponible',
    signals: baziSignals.filter(s => !s.includes('Gods')), alerts: baziAlerts.filter(a => !a.includes('Gods')),
  });

  if (tenGodsResult) {
    breakdowns.push({
      system: '10 Archétypes', icon: '神',
      value: tenGodsResult.dominant ? tenGodsResult.dominant.label : 'Neutre',
      points: tenGodsPts,
      detail: tenGodsResult.gods.map(g => g.label.split(' ')[0]).join('+'),
      signals: baziSignals.filter(s => s.includes('Gods') || s.includes('正') || s.includes('偏')),
      alerts: baziAlerts.filter(a => a.includes('Gods') || a.includes('正') || a.includes('偏')),
    });
  }

  if (peachBlossomActive) {
    breakdowns.push({
      system: 'Peach Blossom', icon: '🌸',
      value: '桃花 Active', points: 2,
      detail: 'Fleur de Pêcher du jour → charme amplifié',
      signals: ['🌸 Fleur de Pêcher active — magnétisme relationnel'], alerts: [],
    });
  }

  // ── Shen Sha 神煞 (0-4 global) ──
  let shenShaResult: ShenShaResult | null = null;
  let shenShaPts = 0;
  try {
    const ssBirthDate = new Date(bd + 'T12:00:00');
    const ssTodayDate = new Date(todayStr + 'T12:00:00');
    shenShaResult = checkShenSha(ssBirthDate, ssTodayDate);

    const ANTI_STACK_WEIGHTS = [1, 0.6, 0.4, 0.3, 0.25, 0.2];
    const sorted = [...shenShaResult.active].sort((a, b) => Math.abs(b.global) - Math.abs(a.global));
    let rawShenSha = 0;
    for (let i = 0; i < sorted.length; i++) {
      const star = sorted[i];
      let pts = star.global;
      if (pts < 0) {
        pts = pts * (1 + 0.25 * Math.max(0, -dmS));
      } else if (pts > 0) {
        pts = pts * (1 + 0.20 * Math.max(0, -dmS));
      }
      const w = ANTI_STACK_WEIGHTS[Math.min(i, ANTI_STACK_WEIGHTS.length - 1)];
      rawShenSha += pts * w;
    }
    shenShaPts = Math.max(-4, Math.min(4, Math.round(rawShenSha * 10) / 10));

    for (const star of shenShaResult.active) {
      const starHuman = star.label_fr.split('—')[0].trim();
      if (star.global > 0) signals.push(`${starHuman} → favorable (étoile chinoise)`);
      else if (star.global < 0) alerts.push(`${starHuman} → friction (étoile chinoise)`);
    }
    if (shenShaResult.active.length > 0) {
      breakdowns.push({
        system: 'Étoiles symboliques', icon: '⭐',
        value: shenShaResult.active.map(s => s.chinese).join(' '),
        points: shenShaPts,
        detail: shenShaResult.active.map(s => s.label_fr).join(' · '),
        signals: shenShaResult.active.filter(s => s.global > 0).map(s => `${s.chinese} → ${s.label_fr.split('—')[0].trim()}`),
        alerts: shenShaResult.active.filter(s => s.global < 0).map(s => `${s.chinese} → ${s.label_fr.split('—')[0].trim()}`),
      });
    }
  } catch { /* Shen Sha fail silently */ }

  // ── Jian Chu 建除 ──
  const jianChuResult = calcJianChuPts(todayStr);
  const jianchuPts = jianChuResult.pts;
  const jianchuOfficer = jianChuResult.officer;
  if (jianchuOfficer) {
    const officerLabel = `${jianchuOfficer.zh} ${jianchuOfficer.fr}`;
    if (jianchuOfficer.pts > 0) signals.push(`Timing favorable → ${jianchuOfficer.fr} (calendrier chinois)`);
    else if (jianchuOfficer.pts < 0) alerts.push(`Timing difficile → ${jianchuOfficer.fr} (calendrier chinois)`);
    breakdowns.push({
      system: 'Cycle des 12 Officiers', icon: '建',
      value: officerLabel,
      points: jianchuOfficer.pts,
      detail: `Officier du Cycle`,
      signals: jianchuOfficer.pts > 0 ? [`${officerLabel} → moment favorable`] : [],
      alerts: jianchuOfficer.pts < 0 ? [`${officerLabel} → moment difficile`] : [],
    });
  }

  // ── BaZi Family Total ──
  const baziFamilyTotal = Math.max(-15, Math.min(15, baziCorePts + jianchuPts));

  // ── Direct domain bonuses ──
  const directDomainBonuses: Partial<Record<LifeDomain, number>> = {};
  if (peachBlossomActive) {
    directDomainBonuses.AMOUR = (directDomainBonuses.AMOUR || 0) + 2;
  }

  // ── Profections annuelles ──
  let profectionResult: ProfectionResult | undefined;
  try {
    const sunSignFR = astro ? (SIGN_FR[astro.b3.sun] ?? undefined) : undefined;
    const ascSignFR = astro ? (SIGN_FR[astro.b3.asc] ?? undefined) : undefined;
    profectionResult = calcProfection(bd, todayStr, ascSignFR ?? null, sunSignFR ?? 'Bélier');

    const profDomainScore = getDomainScore(profectionResult.domainMultiplier, profectionResult.activeHouse);
    if (profDomainScore > 0 && profectionResult.domainMultiplier !== 1.0) {
      const profDomainKey = profectionResult.domain.toUpperCase().replace('É', 'E').replace('Ê', 'E') as LifeDomain;
      const domainMap: Record<string, LifeDomain> = {
        'VITALITE': 'VITALITE', 'VITALITÉ': 'VITALITE',
        'BUSINESS': 'BUSINESS', 'CARRIERE': 'BUSINESS', 'CARRIÈRE': 'BUSINESS',
        'AMOUR': 'AMOUR',
        'SOCIAL': 'RELATIONS', 'RELATIONS': 'RELATIONS',
        'CREATIVITE': 'CREATIVITE', 'CRÉATIVITÉ': 'CREATIVITE',
        'SPIRITUEL': 'INTROSPECTION', 'INTROSPECTION': 'INTROSPECTION',
      };
      const mappedDomain = domainMap[profDomainKey] ?? null;
      if (mappedDomain) {
        const profBonus = Math.round(profDomainScore * (profectionResult.domainMultiplier - 1.0) * 2);
        directDomainBonuses[mappedDomain] = (directDomainBonuses[mappedDomain] || 0) + profBonus;
      }
    }

    if (profectionResult.activeHouse !== 1) {
      signals.push(`🏠 Maison ${profectionResult.activeHouse} en profection — ${profectionResult.timeLord} domine l'année`);
    }
    breakdowns.push({
      system: 'Profections', icon: '🏠',
      value: `Maison ${profectionResult.activeHouse} (${profectionResult.activeSign})`,
      points: 0,
      detail: `${profectionResult.timeLord} — domaine ${profectionResult.domain} ×${profectionResult.domainMultiplier.toFixed(2)}`,
      signals: [`Maison ${profectionResult.activeHouse}: ${profectionResult.domain}`],
      alerts: [],
    });
  } catch { /* profections fail silently */ }

  // V8.4 : Maisons planétaires → enrichissement domaines
  if (astro) {
    enrichDomainScoresWithHouses(astro, directDomainBonuses, profectionResult?.activeHouse);
  }

  return {
    baziFamilyTotal, baziResult, tenGodsResult, shenShaResult,
    profectionResult, directDomainBonuses, dmS,
    breakdowns, signals, alerts,
  };
}

// ══════════════════════════════════════════════════════════════════════
// ═══ _calcLuneGroup — C_LUNE ±12 ═══
// Nakshatra + Tarabala/Chandrabala + VoC + Ashtakavarga + Panchanga
// ══════════════════════════════════════════════════════════════════════

function _calcLuneGroup(bd: string, todayStr: string, astro: AstroChart | null): LuneGroupOutput {
  const breakdowns: SystemBreakdown[] = [];
  const signals: string[] = [];
  const alerts: string[] = [];

  let luneGroupPts = 0;
  let nakshatraData: NakshatraData | undefined;
  let natalMoonSidForNak: number | null = null;
  let vocResult: VoidOfCourseMoon | null = null;
  let panchangaResult: PanchangaResult | null = null;

  // ── Nakshatra Composite ──
  try {
    const todayD = new Date(todayStr + 'T12:00:00Z');
    const moonPhaseForNak = getMoonPhase(todayD);
    const currentYear = todayD.getFullYear();
    const ayanamsa = getAyanamsa(currentYear);
    const moonLongSidereal = ((moonPhaseForNak.longitudeTropical - ayanamsa) % 360 + 360) % 360;
    try {
      const birthDforNak = new Date(bd + 'T12:00:00');
      const natalMoon = getMoonPhase(birthDforNak);
      const natalAyanamsa = getAyanamsa(birthDforNak.getFullYear());
      natalMoonSidForNak = ((natalMoon.longitudeTropical - natalAyanamsa) % 360 + 360) % 360;
    } catch { /* natal silently */ }

    const nakCompositeResult = calcNakshatraComposite(moonLongSidereal, natalMoonSidForNak);
    nakshatraData = nakCompositeResult.transitNak;

    if (nakCompositeResult.total !== 0) {
      luneGroupPts += nakCompositeResult.total;
      signals.push(...nakCompositeResult.signals);
      alerts.push(...nakCompositeResult.alerts);
    }

    breakdowns.push({
      system: 'Nakshatra', icon: '🌙',
      value: `${nakshatraData.name}${nakCompositeResult.natalNakName ? ` ↔ ${nakCompositeResult.natalNakName}` : ''}`,
      points: nakCompositeResult.total,
      detail: `${nakshatraData.quality} — ${nakCompositeResult.breakdown}`,
      signals: nakCompositeResult.signals,
      alerts: nakCompositeResult.alerts,
    });

    // ── Tarabala + Chandrabala ──
    if (natalMoonSidForNak !== null) {
      try {
        const tarabalaRes = calcTarabala(moonLongSidereal, natalMoonSidForNak);
        const chandrabalaRes = calcChandrabala(moonLongSidereal, natalMoonSidForNak);

        const combinedBalaVal = Math.max(-2, Math.min(2, combinedBala(tarabalaRes.delta, chandrabalaRes.delta)));
        luneGroupPts += combinedBalaVal;

        if (tarabalaRes.delta > 0) signals.push(tarabalaRes.label);
        else if (tarabalaRes.delta < 0) alerts.push(tarabalaRes.label);
        if (chandrabalaRes.delta > 0) signals.push(chandrabalaRes.label);
        else if (chandrabalaRes.delta < 0) alerts.push(chandrabalaRes.label);

        breakdowns.push({
          system: 'Résonance lunaire védique', icon: '⭐',
          value: `${tarabalaRes.name} (pos.${tarabalaRes.index})`,
          points: tarabalaRes.delta,
          detail: `Nakshatra transit vs natal — Muhurta Chintamani §12-18`,
          signals: tarabalaRes.delta > 0 ? [tarabalaRes.label] : [],
          alerts: tarabalaRes.delta < 0 ? [tarabalaRes.label] : [],
        });
        breakdowns.push({
          system: 'Chandrabala', icon: '🌙',
          value: `Position ${chandrabalaRes.position}/12`,
          points: chandrabalaRes.delta,
          detail: `Lune transit vs signe natal${chandrabalaRes.position === 8 ? ' — Astama Chandra ⚠️' : ''}`,
          signals: chandrabalaRes.delta > 0 ? [chandrabalaRes.label] : [],
          alerts: chandrabalaRes.delta < 0 ? [chandrabalaRes.label] : [],
        });
      } catch { /* Tarabala/Chandrabala silently */ }
    }

  } catch { /* nakshatras fail silently */ }

  // ── VoC ──
  try {
    vocResult = getVoidOfCourseMoon(todayStr);
    if (vocResult.isVoC) {
      const vocPts = vocResult.intensity === 'forte' ? -2 : -1;
      luneGroupPts += vocPts;
      alerts.push(`🌙 ${vocResult.advice.split('.')[0]}`);
      breakdowns.push({
        system: 'Lune Hors Cours', icon: '🌙',
        value: `VoC (${vocResult.degreesLeft}° restants)`,
        points: vocPts,
        detail: vocResult.advice,
        signals: [], alerts: [vocResult.advice],
      });
    }
  } catch { /* VoC fail silently */ }

  // ── Ashtakavarga Lunaire + SAV ──
  if (astro) {
    try {
      const todayD = new Date(todayStr + 'T12:00:00Z');
      const moonTropLon = getMoonPhase(todayD).longitudeTropical;
      const ayToday = getAyanamsa(todayD.getFullYear());
      const moonSidLon = ((moonTropLon - ayToday) + 360) % 360;
      const moonSignIdx = Math.floor(((moonSidLon % 360) + 360) % 360 / 30);

      const donorIdx = extractNatalSiderealSignIdx(astro, bd);
      const ashMoon = calcAshtakavarga('moon', moonSidLon, astro, bd);
      const moonBindus = ashMoon.bindus;

      const sav = buildSAV(donorIdx);
      const savSign = sav[moonSignIdx] ?? 28;

      const hybrid = calcMoonBAVSAV(moonBindus, savSign);
      const hybridDelta = Math.round(hybrid.hybridDelta);

      if (hybridDelta !== 0) {
        luneGroupPts += hybridDelta;
        const sign = hybridDelta > 0 ? '+' : '';
        const label = `⭕ Ashtakavarga ☽+SAV — ${ashMoon.signName} (${moonBindus}B, SAV=${savSign}) → ${sign}${hybridDelta}`;
        if (hybridDelta > 0) signals.push(label);
        else alerts.push(label);
        breakdowns.push({
          system: 'Ashtakavarga ☽+SAV', icon: '⭕',
          value: `${ashMoon.signName} — ${moonBindus}B / SAV ${savSign}`,
          points: hybridDelta,
          detail: `Lune sidérale en ${ashMoon.signName} | BAV=${moonBindus}, SAV=${savSign} | Hybride ${sign}${hybridDelta}`,
          signals: hybridDelta > 0 ? [label] : [], alerts: hybridDelta < 0 ? [label] : [],
        });
      }
    } catch { /* Ashtak Moon+SAV fail silently */ }
  }

  // ── Panchanga Védique ──
  try {
    const todayDateP = new Date(todayStr + 'T12:00:00Z');
    const moonTropP = getMoonPhase(todayDateP).longitudeTropical;
    const sunTropP = getPlanetLongitudeForDate('sun', todayDateP);
    const ayanamsaP = getAyanamsa(todayDateP.getFullYear());
    panchangaResult = calcPanchanga(moonTropP, sunTropP, ayanamsaP, todayDateP);
    if (panchangaResult.total !== 0) {
      luneGroupPts += Math.max(-4, Math.min(4, panchangaResult.total));
      signals.push(...panchangaResult.signals);
      alerts.push(...panchangaResult.alerts);
    }
    breakdowns.push({
      system: 'Calendrier védique', icon: '🪷',
      value: `${panchangaResult.tithi.name} · ${panchangaResult.yoga.name} · ${panchangaResult.vara.name}`,
      points: panchangaResult.total,
      detail: `Tithi ${panchangaResult.tithi.tithi} (${panchangaResult.tithi.quality}) | Yoga ${panchangaResult.yoga.yoga} | ${panchangaResult.vara.icon} ${panchangaResult.vara.planet}`,
      signals: panchangaResult.signals,
      alerts: panchangaResult.alerts,
    });
  } catch { /* panchanga fail silently */ }

  // C_LUNE cap ±12
  const luneGroupCapped = Math.max(-12, Math.min(12, luneGroupPts));

  return {
    luneGroupCapped, nakshatraData, vocResult, panchangaResult, natalMoonSidForNak,
    breakdowns, signals, alerts,
  };
}

// ══════════════════════════════════════════════════════════════════════
// ═══ _calcEphemGroup — C_EPHEM ±10 ═══
// Transits personnels + Fixed stars + Kinetic shocks + sub-caps
// ══════════════════════════════════════════════════════════════════════

function _calcEphemGroup(
  astro: AstroChart | null,
  todayStr: string,
  _liveDate: string | undefined,
): EphemGroupOutput {
  const breakdowns: SystemBreakdown[] = [];
  const signals: string[] = [];
  const alerts: string[] = [];

  let ephemGroupPts = 0;
  let astroPts = 0;
  const astroSignals: string[] = [];
  const astroAlerts: string[] = [];
  let _transitBreakdown: Array<{ transitPlanet: string; natalPoint?: string; score: number; aspectType?: string }> = [];

  // ── Planet speeds for stationFactor ──
  const planetSpeeds_F: Record<string, number> = {};
  try {
    const todayD_spd = new Date(todayStr + 'T12:00:00');
    const yesterdayD_spd = new Date(todayD_spd.getTime() - 86400000);
    for (const pl of ['jupiter', 'saturn', 'uranus', 'neptune', 'pluto'] as const) {
      const lonT = getPlanetLongitudeForDate(pl, todayD_spd);
      const lonY = getPlanetLongitudeForDate(pl, yesterdayD_spd);
      let spd = lonT - lonY;
      if (spd > 180) spd -= 360;
      if (spd < -180) spd += 360;
      planetSpeeds_F[pl] = spd;
    }
  } catch { /* vitesses fail silently */ }

  const _isLiveDay = !_liveDate || _liveDate === todayStr;

  if (_isLiveDay && astro && astro.tr.length) {
    const personalTransits = calcPersonalTransits(astro.tr, 1.2, astro.as, astro.pl, astro.stelliums, planetSpeeds_F);
    _transitBreakdown = personalTransits.breakdown as typeof _transitBreakdown;
    const DRISHTI_SLOW_R = new Set(['jupiter', 'saturn']);
    const drOverlapR = personalTransits.breakdown
      .filter(b => DRISHTI_SLOW_R.has(b.transitPlanet) && b.natalPoint === 'moon')
      .reduce((s, b) => s + b.score, 0);
    astroPts = Math.max(-6, Math.min(6, Math.round(personalTransits.total - drOverlapR)));
    if (astroPts > 0) {
      const top = personalTransits.breakdown.sort((a, b) => b.score - a.score)[0];
      const planetName = PLANET_FR[top?.transitPlanet] ?? top?.transitPlanet;
      astroSignals.push(`Aspect harmonieux → ${planetName} (transit personnel)`);
    } else if (astroPts < 0) {
      const top = personalTransits.breakdown.sort((a, b) => a.score - b.score)[0];
      const planetName = PLANET_FR[top?.transitPlanet] ?? top?.transitPlanet;
      astroAlerts.push(`Aspect tendu → ${planetName} (transit personnel)`);
    }
  } else if (!_isLiveDay && astro && astro.pl.length) {
    const liteTotal = calcTransitsLite(astro.pl, todayStr);
    astroPts = Math.max(-6, Math.min(6, Math.round(liteTotal)));
    if (astroPts > 0) {
      astroSignals.push(`Transits personnels → favorable (astro)`);
    } else if (astroPts < 0) {
      astroAlerts.push(`Transits personnels → tension (astro)`);
    }
  }
  ephemGroupPts += astroPts;
  signals.push(...astroSignals);
  alerts.push(...astroAlerts);

  breakdowns.push({
    system: 'Astrologie', icon: '☽',
    value: astro ? `${astro.tr.length} transits` : 'Non disponible',
    points: astroPts,
    detail: astro ? `${astro.tr.filter(t => SLOW_PLANETS.has(t.tp)).length} planètes lentes` : 'N/A',
    signals: astroSignals, alerts: astroAlerts,
  });

  // ── Fixed stars ──
  try {
    const fixedStarResult = calcFixedStarScore(new Date(todayStr + 'T12:00:00'));
    if (fixedStarResult.total !== 0) {
      ephemGroupPts += Math.max(-4, Math.min(4, fixedStarResult.total));
      signals.push(...fixedStarResult.signals);
      alerts.push(...fixedStarResult.alerts);
      if (fixedStarResult.hits.length > 0) {
        breakdowns.push({
          system: 'Étoiles Fixes', icon: '⭐',
          value: fixedStarResult.hits.map(h => h.star).join(' · '),
          points: fixedStarResult.total,
          detail: fixedStarResult.hits.map(h => `${h.planet} ↔ ${h.star} (${h.orb.toFixed(1)}°)`).join(' · '),
          signals: fixedStarResult.signals,
          alerts: fixedStarResult.alerts,
        });
      }
    }
  } catch { /* fixed stars fail silently */ }

  // ── Kinetic shocks ──
  let kineticShockDelta = 0;
  try {
    const ksResult = calcKineticShocks(todayStr);
    if (ksResult.totalDelta !== 0) {
      kineticShockDelta = Math.max(-3, Math.min(3, ksResult.totalDelta));
      for (const shock of ksResult.shocks) {
        if (shock.delta < 0) alerts.push(`⚡ ${shock.detail}`);
        else signals.push(`🌟 ${shock.detail}`);
        breakdowns.push({
          system: shock.type === 'ingress' ? `Ingress ${shock.planetFR}` : `Station ${shock.planetFR}`,
          icon: '⚡',
          value: shock.type === 'ingress' ? 'Changement de signe' : 'Station D↔R',
          points: shock.delta,
          detail: shock.detail,
          signals: shock.delta > 0 ? [shock.detail] : [],
          alerts: shock.delta < 0 ? [shock.detail] : [],
        });
      }
    }
  } catch { /* kinetic shocks fail silently */ }

  // ── Sub-caps Éphéméride ──
  const stelliumAttenuation = 1 - 0.35 * Math.min(1, Math.abs(astroPts) / 6);
  const astroPtsAttenuated = Math.round(astroPts * stelliumAttenuation * 10) / 10;
  const ephemFastRaw = astroPtsAttenuated + kineticShockDelta;
  const ephemFastPts = Math.max(-7, Math.min(7, ephemFastRaw));
  const ephemSlowPts = Math.max(-5, Math.min(5, ephemGroupPts - astroPts));
  const ephemGroupCapped = Math.max(-10, Math.min(10, ephemFastPts + ephemSlowPts));

  // ── Planetary hour (narrative, pts=0) ──
  const planetaryHourNow = getCurrentPlanetaryHour();
  if (planetaryHourNow) {
    breakdowns.push({
      system: 'Heure Planétaire', icon: planetaryHourNow.icon,
      value: `${planetaryHourNow.label} ${planetaryHourNow.isDayHour ? '☀️' : '🌙'} H${planetaryHourNow.hourIndex}`,
      points: 0,
      detail: planetaryHourNow.keywords.join(' · '),
      signals: [], alerts: [],
    });
  }

  return {
    ephemGroupCapped, _transitBreakdown,
    planetaryHour: planetaryHourNow ?? null,
    breakdowns, signals, alerts,
  };
}

// ══════════════════════════════════════════════════════════════════════
// ═══ _calcIndivGroup — C_INDIV ±8 ═══
// I Ching + Tithi Lord Gochara + Graha Drishti + Yoga Kartari
// ══════════════════════════════════════════════════════════════════════

function _calcIndivGroup(
  iching: IChingReading,
  natalMoonSidForNak: number | null,
  panchangaResult: PanchangaResult | null,
  todayStr: string,
): IndivGroupOutput {
  const breakdowns: SystemBreakdown[] = [];
  const signals: string[] = [];
  const alerts: string[] = [];

  // ── I Ching score ──
  const ichRes = ichingScoreV4(iching.hexNum, iching.changing);
  const ichingCapped = Math.round(3 * Math.tanh(ichRes.pts / 6));

  const ichingSignals: string[] = [];
  const ichingAlerts: string[] = [];
  if (ichRes.pts > 0) ichingSignals.push(`${ichRes.tier === 'A' ? 'Yi King puissant' : 'Yi King favorable'} : ${iching.name}`);
  if (ichRes.pts < 0) ichingAlerts.push(`${ichRes.tier === 'E' ? 'Yi King d\'épreuve' : 'Yi King tendu'} : ${iching.name}`);
  signals.push(...ichingSignals);
  alerts.push(...ichingAlerts);

  breakdowns.push({
    system: 'Yi King', icon: '☰',
    value: `#${iching.hexNum} ${iching.name}`,
    points: 0,
    detail: `Tier ${ichRes.tier} · L${iching.changing + 1} · Yao ${ichRes.yao >= 0 ? '+' : ''}${ichRes.yao} / Dynamique cachée ${ichRes.nuclear >= 0 ? '+' : ''}${ichRes.nuclear}`,
    signals: ichingSignals, alerts: ichingAlerts,
  });

  // ── Tithi Lord Gochara ──
  let indivTLG = 0;
  if (panchangaResult !== null && natalMoonSidForNak !== null) {
    try {
      const tlgLord = getTithiLord(panchangaResult.tithi.tithi);
      if (tlgLord !== 'rahu') {
        const evalD_tlg = new Date(todayStr + 'T12:00:00');
        const ay_tlg = getAyanamsa(evalD_tlg.getFullYear());
        const tropLon = getPlanetLongitudeForDate(
          tlgLord as 'sun' | 'moon' | 'mars' | 'mercury' | 'jupiter' | 'venus' | 'saturn',
          evalD_tlg,
        );
        const sidLon = ((tropLon - ay_tlg) % 360 + 360) % 360;
        const tlgRes = calcTithiLordGochara(tlgLord, sidLon, natalMoonSidForNak);
        const tlgDelta = Math.max(-1, Math.min(1, tlgRes.delta));
        indivTLG = tlgDelta;
        if (tlgDelta !== 0) {
          if (tlgDelta > 0) signals.push(tlgRes.label);
          else alerts.push(tlgRes.label);
          breakdowns.push({
            system: 'Tithi Lord', icon: '🪐',
            value: `${tlgLord} M${tlgRes.houseFromMoon}`,
            points: tlgDelta,
            detail: `Gochara Tithi ${panchangaResult.tithi.tithi} — ${tlgLord} en maison ${tlgRes.houseFromMoon} Lune natale`,
            signals: tlgDelta > 0 ? [tlgRes.label] : [],
            alerts: tlgDelta < 0 ? [tlgRes.label] : [],
          });
        }
      }
    } catch { /* Tithi Lord Gochara fail silently */ }
  }

  // ── Graha Drishti ──
  let indivDrishti = 0;
  if (natalMoonSidForNak !== null) {
    try {
      const DRISHTI_PLANETS = ['mars', 'jupiter', 'saturn'] as const;
      const evalD_dr = new Date(todayStr + 'T12:00:00');
      const ay_dr = getAyanamsa(evalD_dr.getFullYear());

      const drResults: GrahaDrishtiResult[] = [];
      for (const planet of DRISHTI_PLANETS) {
        const tropLon = getPlanetLongitudeForDate(
          planet as 'mars' | 'jupiter' | 'saturn',
          evalD_dr,
        );
        const sidLon = ((tropLon - ay_dr) % 360 + 360) % 360;
        const drRes = calcGrahaDrishti(planet, sidLon, natalMoonSidForNak);
        if (drRes.delta !== 0) drResults.push(drRes);
      }

      if (drResults.length > 0) {
        const rawTotal = drResults.reduce((s, r) => s + r.delta, 0);
        const drCapped = Math.max(-3, Math.min(3, rawTotal));
        indivDrishti = drCapped;

        drResults.forEach(r => {
          if (r.delta > 0) signals.push(r.label);
          else alerts.push(r.label);
        });

        const activeDesc = drResults.map(r => `${r.planet} M${r.houseFromPlanet}`).join(' · ');
        const capNote = rawTotal !== drCapped ? ` → capé ${drCapped > 0 ? '+' : ''}${drCapped}` : '';
        breakdowns.push({
          system: 'Graha Drishti', icon: '🔭',
          value: activeDesc,
          points: drCapped,
          detail: `Aspects Parāśari BPHS Ch.26 — raw ${rawTotal > 0 ? '+' : ''}${rawTotal}${capNote}`,
          signals: drResults.filter(r => r.delta > 0).map(r => r.label),
          alerts: drResults.filter(r => r.delta < 0).map(r => r.label),
        });
      }
    } catch { /* Graha Drishti fail silently */ }
  }

  // ── Yoga Kartari ──
  let indivKartari = 0;
  if (natalMoonSidForNak !== null) {
    try {
      const evalD_kt = new Date(todayStr + 'T12:00:00');
      const ay_kt = getAyanamsa(evalD_kt.getFullYear());

      const KARTARI_PLANETS = ['sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'] as const;
      const transitMap: Record<string, number> = {};
      for (const planet of KARTARI_PLANETS) {
        const tropLon = getPlanetLongitudeForDate(planet, evalD_kt);
        transitMap[planet] = ((tropLon - ay_kt) % 360 + 360) % 360;
      }

      const ktRes = calcYogaKartari(natalMoonSidForNak, transitMap);
      if (ktRes.delta !== 0) {
        const ktCapped = Math.max(-2, Math.min(2, ktRes.delta));
        indivKartari = ktCapped;

        if (ktRes.delta > 0) signals.push(ktRes.label);
        else alerts.push(ktRes.label);

        const sidesDesc = [
          ktRes.sign12Planets.length ? `12e: ${ktRes.sign12Planets.join(',')}` : '',
          ktRes.sign2Planets.length ? `2e: ${ktRes.sign2Planets.join(',')}` : '',
        ].filter(Boolean).join(' · ');

        breakdowns.push({
          system: 'Yoga Kartari', icon: '✂️',
          value: ktRes.shubha ? 'Shubha Kartari' : ktRes.papa ? 'Papa Kartari' : 'Kartari partiel',
          points: ktCapped,
          detail: `Lune encadrée — ${sidesDesc}`,
          signals: ktRes.delta > 0 ? [ktRes.label] : [],
          alerts: ktRes.delta < 0 ? [ktRes.label] : [],
        });
      }
    } catch { /* Yoga Kartari fail silently */ }
  }

  // C_INDIV cap ±8
  const indivGroupPts = ichingCapped + indivTLG + indivDrishti + indivKartari;
  const indivGroupCapped = Math.max(-8, Math.min(8, indivGroupPts));

  return { indivGroupCapped, breakdowns, signals, alerts };
}


// ══════════════════════════════════════
// ═══ CALC DAILY MODULES — L1 ═══
// Orchestrateur : appelle les 4 sous-groupes + sections narratives
// ══════════════════════════════════════

// ══════════════════════════════════════
// ═══ Ronde #22 — PROGRESSIVE DISCLOSURE HELPERS ═══
// ══════════════════════════════════════

/** Dual-push : écrit dans le string[] legacy ET le SignalDisplay[] enrichi */
function sig(human: string, technical: string, source: string, polarityLabel: string, legacyArr: string[], richArr: SignalDisplay[], interpretation?: string): void {
  legacyArr.push(`${human} → ${polarityLabel} (${source.toLowerCase()})`);
  richArr.push({ human, technical, source, polarity: 'positive', polarityLabel, interpretation });
}
function alt(human: string, technical: string, source: string, polarityLabel: string, legacyArr: string[], richArr: SignalDisplay[], interpretation?: string): void {
  legacyArr.push(`${human} → ${polarityLabel} (${source.toLowerCase()})`);
  richArr.push({ human, technical, source, polarity: 'negative', polarityLabel, interpretation });
}

/**
 * Ronde #22 — Catch-all : convertit un string signal legacy en SignalDisplay.
 * Heuristique : détecte la source par mots-clés, extrait le texte humain.
 */
function _legacyToRich(text: string, polarity: 'positive' | 'negative'): SignalDisplay {
  // Détection source (sous-catégories BaZi précises)
  let source = 'Autre';
  if (/lune|luna|croissant|décroissant|pleine|nouvelle|éclipse|VoC/i.test(text)) source = 'Lune';
  else if (/10 dieux/i.test(text)) source = '10 Dieux';
  else if (/jour maître/i.test(text)) source = 'Jour Maître';
  else if (/étoile chinoise|shen sha/i.test(text)) source = 'Étoile chinoise';
  else if (/calendrier chinois|jian chu/i.test(text)) source = 'Calendrier chinois';
  else if (/bazi|tige|branche/i.test(text)) source = 'BaZi';
  else if (/transit|planét|jupiter|saturne|mars|vénus|mercure|neptune|uranus|pluton|astro/i.test(text)) source = 'Astro';
  else if (/yi jing|yi king|hexagramme|hex\./i.test(text)) source = 'Yi King';
  else if (/chemin|jour \d|maître|personnel|année|pinnacle|karma/i.test(text)) source = 'Numéro';
  else if (/nakshatra|dasha|tithi|yoga|karana|vedique|panchanga/i.test(text)) source = 'Védique';
  else if (/nœud|nodal|retour des/i.test(text)) source = 'Astro';

  // Nettoyage : enlever l'emoji de tête + tag source trailing
  const cleaned = text
    .replace(/^[^\w\u00C0-\u024F]+/, '')
    .replace(/\s*\((?:bazi|astro|lune|yi jing|yi king|numéro|védique|étoile chinoise|transit personnel|jour maître|10 dieux|calendrier chinois)\)\s*/gi, ' ')
    .trim();
  // Extraire le human (avant →) et le polarityLabel (après →)
  const parts = cleaned.split('→').map(p => p.trim());
  const human = parts[0] || cleaned;
  const polarityLabel = parts[1] || (polarity === 'positive' ? 'favorable' : 'friction');

  return { human, technical: cleaned, source, polarity, polarityLabel };
}

export function calcDailyModules(
  params: {
    num: NumerologyProfile;
    astro: AstroChart | null;
    iching: IChingReading;
    bd: string;
    todayStr: string;
    _liveDate?: string;  // Ronde Transit Fix — si présent et ≠ todayStr, utilise calcTransitsLite
  },
  breakdown: SystemBreakdown[],
  signals: string[],
  alerts: string[]
): DailyModuleResult {
  const { num, astro, iching, bd, todayStr } = params;

  let delta = 0;
  const pdv = num.ppd.v;

  // Ronde #24 — Résonance Lunaire Natale : longitude sidérale Lune transit à 12h UTC
  let _transitMoonSid: number | null = null;
  try {
    const _tmsDate = new Date(todayStr + 'T12:00:00Z');
    const _tmsTrop = getMoonPhase(_tmsDate).longitudeTropical;
    const _tmsAy   = getAyanamsa(_tmsDate.getFullYear());
    _transitMoonSid = ((_tmsTrop - _tmsAy) + 360) % 360;
  } catch { /* moonSid calc fail silently */ }

  // Ronde #22 — Progressive Disclosure
  const richSignals: SignalDisplay[] = [];
  const richAlerts: SignalDisplay[] = [];

  // ═══════════════════════════════════
  // 1. NUMÉROLOGIE — narrative (delta=0 depuis V8)
  // ═══════════════════════════════════

  const numSignals: string[] = [];
  const numAlerts: string[] = [];

  // ── PD (±7) ──
  let pdPts = 0;
  if (pdv === num.lp.v)        { pdPts = 7; sig('Alignement majeur', `Jour Personnel ${pdv} = Chemin de Vie`, 'Numéro', 'alignement majeur', numSignals, richSignals, 'Le nombre du jour résonne avec ton chemin de vie — journée alignée.'); }
  else if (pdv === num.expr.v) { pdPts = 5; sig('Talents amplifiés', `Jour Personnel ${pdv} = Expression`, 'Numéro', 'talents amplifiés', numSignals, richSignals, 'Le jour active ton nombre d\'expression — communique, crée.'); }
  else if (pdv === num.soul.v) { pdPts = 4; sig('Désirs profonds activés', `Jour Personnel ${pdv} = Âme`, 'Numéro', 'désirs activés', numSignals, richSignals, 'Le jour résonne avec ton nombre d\'âme — écoute ton intuition.'); }
  else if (pdv === num.pers.v) { pdPts = 3; sig('Charisme renforcé', `Jour Personnel ${pdv} = Personnalité`, 'Numéro', 'charisme', numSignals, richSignals, 'Le jour active ton nombre de personnalité — ton image rayonne.'); }
  if (isMaster(pdv))           { pdPts = Math.min(7, pdPts + 2); sig('Énergie spirituelle', `Jour Maître ${pdv}`, 'Numéro', 'énergie spirituelle', numSignals, richSignals, 'Nombre maître — potentiel d\'inspiration hors norme.'); }
  if (num.kl.includes(pdv))    { pdPts = Math.min(7, pdPts + 1); }
  pdPts = Math.max(-7, Math.min(7, pdPts));

  // ── PY — V6.2: narratif pur, delta supprimé (R18 final) ──
  const pyv = num.py.v;
  const pyPts = 0;

  // ── PM (±3) ──
  const pmv = num.pm.v;
  let pmPts = 0;
  if (pmv === num.lp.v)               pmPts = 3;
  else if ([1, 3, 8].includes(pmv))   pmPts = 2;
  else if ([4, 7].includes(pmv))      pmPts = -2;
  else if ([2, 6].includes(pmv))      pmPts = 1;
  pmPts = Math.max(-3, Math.min(3, pmPts));

  // ── Pinnacle (±1) ──
  const pinnIdx = getActivePinnacleIdx(bd, todayStr, num.lp);
  const activePinnacle = num.pinnacles[pinnIdx];
  const activeChallenge = num.challenges[pinnIdx];
  let pinnPts = 0;
  if (activePinnacle && pdv === activePinnacle.v) { pinnPts = 1; }
  if (activeChallenge && pdv === activeChallenge.v) { pinnPts = -1; }

  // Karmic debt signals conservés (valeur narrative)
  if (num.hasKarmicDebt && num.karmicDebt) {
    const kd = num.karmicDebt;
    const kdMsg = kd === 13 ? 'effort & discipline' : kd === 14 ? 'liberté & excès' : kd === 16 ? 'ego & humilité' : 'puissance & abus';
    signals.push(`⚖️ Schéma à transcender ${kd} — ${kdMsg}`);
  }
  signals.push(...numSignals);
  alerts.push(...numAlerts);

  // ═══════════════════════════════════
  // 2. C_BAZI → _calcBaziGroup (±15)
  // ═══════════════════════════════════

  const bazi = _calcBaziGroup(bd, todayStr, astro);
  delta += bazi.baziFamilyTotal;
  breakdown.push(...bazi.breakdowns);
  signals.push(...bazi.signals);
  alerts.push(...bazi.alerts);

  // ═══════════════════════════════════
  // 3. dayType + NARRATIFS (Moon, Mercury, Transit lunaire)
  // ═══════════════════════════════════

  const dayType = calcDayType(pdv, iching, astro);

  const moonResult = calcMoonScore(todayStr, dayType.type);
  signals.push(...moonResult.signals);
  alerts.push(...moonResult.alerts);
  breakdown.push({
    system: 'Lune', icon: '☽',
    value: moonResult.phaseLabel,
    points: 0, // V8 : narratif (R25)
    detail: moonResult.detail,
    signals: moonResult.signals, alerts: moonResult.alerts,
  });

  // ── Mercury narrative ──
  const mercStatus = getMercuryStatus(new Date(todayStr + 'T12:00:00'));
  const mercPts = Math.max(-3, mercStatus.points);
  if (mercPts < 0) {
    alerts.push(`☿ ${mercStatus.label} — ${mercStatus.conseil.split('.')[0]}`);
    breakdown.push({
      system: 'Mercure', icon: '☿',
      value: mercStatus.label,
      points: 0, // V8 : narratif (R25)
      detail: mercStatus.conseil,
      signals: [], alerts: [mercStatus.conseil],
    });
  }

  // ── Transit lunaire narrative ──
  const moonTr = getMoonTransit(todayStr);
  const isActDayMain = dayType.type === 'decision' || dayType.type === 'expansion';
  const isRefDayMain = dayType.type === 'retrait' || dayType.type === 'observation';
  const faMoon = moonTr.element === 'fire' || moonTr.element === 'air';
  const weMoon = moonTr.element === 'water' || moonTr.element === 'earth';
  const trLunSignals: string[] = [];
  const trLunAlerts: string[] = [];

  if (faMoon && isActDayMain)       { trLunSignals.push(`Lune en ${moonTr.sign} → amplifie l'action`); }
  else if (weMoon && isRefDayMain)  { trLunSignals.push(`Lune en ${moonTr.sign} → soutient l'introspection`); }
  else if (faMoon && isRefDayMain)  { trLunAlerts.push(`Lune en ${moonTr.sign} → agitation en jour de repos`); }
  else if (weMoon && isActDayMain)  { trLunAlerts.push(`Lune en ${moonTr.sign} → énergie ralentie`); }

  signals.push(...trLunSignals);
  alerts.push(...trLunAlerts);
  breakdown.push({
    system: 'Transit Lunaire', icon: moonTr.icon,
    value: `Lune en ${moonTr.sign}`,
    points: 0, // V6.2: déconnecté
    detail: `${moonTr.sign} (${moonTr.element})`,
    signals: trLunSignals, alerts: trLunAlerts,
  });

  // ═══════════════════════════════════
  // 4. C_LUNE → _calcLuneGroup (±12)
  // ═══════════════════════════════════

  const lune = _calcLuneGroup(bd, todayStr, astro);
  delta += lune.luneGroupCapped;
  breakdown.push(...lune.breakdowns);
  signals.push(...lune.signals);
  alerts.push(...lune.alerts);

  // ═══════════════════════════════════
  // 5. C_EPHEM → _calcEphemGroup (±10)
  // ═══════════════════════════════════

  const ephem = _calcEphemGroup(astro, todayStr, params._liveDate);
  delta += ephem.ephemGroupCapped;
  breakdown.push(...ephem.breakdowns);
  signals.push(...ephem.signals);
  alerts.push(...ephem.alerts);

  // ═══════════════════════════════════
  // 6. C_INDIV → _calcIndivGroup (±8)
  // ═══════════════════════════════════

  const indiv = _calcIndivGroup(iching, lune.natalMoonSidForNak, lune.panchangaResult, todayStr);
  delta += indiv.indivGroupCapped;
  breakdown.push(...indiv.breakdowns);
  signals.push(...indiv.signals);
  alerts.push(...indiv.alerts);

  // ═══════════════════════════════════
  // 7. NŒUDS LUNAIRES — narrative
  // ═══════════════════════════════════

  let nodeTransit: LunarNodeTransit | null = null;
  try { nodeTransit = getLunarNodeTransit(bd, todayStr); } catch { /* fail silently */ }
  let nodePts = 0; // V5.5 : scoring supprimé
  const nodeSignals: string[] = [];
  const nodeAlerts: string[] = [];
  if (nodeTransit) {
    switch (nodeTransit.alignment) {
      case 'conjoint': nodeSignals.push('↻ Retour des Nœuds — mission de vie'); break;
      case 'trigone':  nodeSignals.push('🌊 Trigone nodal — flux de vie'); break;
      case 'opposé':   nodeAlerts.push('⇄ Inversion nodale — tension passé/futur'); break;
      case 'carré':    nodeAlerts.push('⚔️ Carré nodal — crise de croissance'); break;
    }
    if (nodeTransit.isNodeReturn) { nodeSignals.push('🌟 Retour des Nœuds actif'); }
    signals.push(...nodeSignals);
    alerts.push(...nodeAlerts);
    breakdown.push({
      system: 'Nœuds Lunaires', icon: '☊',
      value: `NN ${nodeTransit.natal.northNode.sign}`,
      points: nodePts,
      detail: nodeTransit.alignmentDesc.split('.')[0],
      signals: nodeSignals, alerts: nodeAlerts,
    });
  }

  // ═══════════════════════════════════
  // 8. ASSEMBLAGE + RETOUR
  // ═══════════════════════════════════

  const moonPhaseRaw = getMoonPhase(new Date(todayStr + 'T12:00:00'));

  // V9.6 Sprint A2 — Cap global L1 ±30
  const dailyDeltaSnapshot = Math.max(-30, Math.min(30, delta));

  return {
    dailyDeltaSnapshot,
    dayType,
    moonResult,
    moonTr,
    nodeTransit,
    baziResult:         bazi.baziResult,
    tenGodsResult:      bazi.tenGodsResult,
    shenShaResult:      bazi.shenShaResult,
    profectionResult:   bazi.profectionResult,
    nakshatraData:      lune.nakshatraData,
    directDomainBonuses: bazi.directDomainBonuses,
    mercPts,
    vocResult:          lune.vocResult,
    pyPts,
    pmPts,
    pinnPts,
    pyv,
    moonPhaseRawPhase:  moonPhaseRaw.phase,
    _transitBreakdown:  ephem._transitBreakdown,
    planetaryHour:      ephem.planetaryHour,
    // Z2-B — observabilité groupes (Ronde Z consensus 3/3 Option B)
    baziGroupDelta:     bazi.baziFamilyTotal,
    luneGroupDelta:     lune.luneGroupCapped,
    ephemGroupDelta:    ephem.ephemGroupCapped,
    indivGroupDelta:    indiv.indivGroupCapped,
    // Ronde #22 — Progressive Disclosure
    // Catch-all : convertit les signaux string legacy qui n'ont pas encore été migrés vers sig()/alt()
    richSignals: [
      ...richSignals,
      ...signals.filter(s => !richSignals.some(r => s.includes(r.human) || s.includes(r.polarityLabel)))
        .map(s => _legacyToRich(s, 'positive')),
    ],
    richAlerts: [
      ...richAlerts,
      ...alerts.filter(a => !richAlerts.some(r => a.includes(r.human) || a.includes(r.polarityLabel)))
        .map(a => _legacyToRich(a, 'negative')),
    ],
    // Ronde #24 — Résonance Lunaire Natale
    transitMoonSid: _transitMoonSid,
  };
}
