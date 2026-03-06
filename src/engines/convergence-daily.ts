// ══════════════════════════════════════
// ═══ CONVERGENCE DAILY — L1 — V8.0 ═══
// Step 5 split : modules quotidiens de calcConvergence
// Contient : helpers (calcDayType, ichingScoreV4, calcMoonScore)
//           + calcDailyModules() — L1 pass-by-reference Option A
// Ne contient PAS les modules lents (L2) ni l'assemblage final (L3)
// ══════════════════════════════════════

import { type NumerologyProfile, getNumberInfo, isMaster, getActivePinnacleIdx } from './numerology';
import { type AstroChart, PLANET_FR, SIGN_FR, calcPersonalTransits, getPlanetLongitudeForDate } from './astrology';
import { type IChingReading, getHexTier } from './iching';
import { getMoonPhase, getLunarEvents, getMoonTransit, getMercuryStatus, getLunarNodeTransit, type LunarNodeTransit, getVoidOfCourseMoon, type VoidOfCourseMoon } from './moon'; // Sprint AO P6: getPlanetaryRetroScore retiré
import { calcBaZiDaily, calc10Gods, calcDayMaster, getMonthPillar, type DayMasterDailyResult, type TenGodsResult, getPeachBlossom, checkShenSha, type ShenShaResult } from './bazi'; // Sprint AS P1 : getElementRelation + ChangshengResult retirés (zéro usage dans ce fichier)
// Sprint AS P1 : InteractionResult retiré (zéro usage dans ce fichier)
import { calcProfection, getDomainScore, type ProfectionResult } from './profections';
import { safeParseDateLocal, safeNum } from './safe-utils'; // Sprint AG
import { calcDMStrength, getDMMultiplier, type DMStrengthResult } from './dm-strength'; // Sprint AI
import { getAyanamsa, calcNakshatraComposite, type NakshatraData } from './nakshatras'; // Sprint AO P6: getPada, PADA_MULTIPLIERS, PADA_NAMES retirés
import { getActiveLineScore, getNuclearScore } from './iching-yao';
import { type SystemBreakdown, type LifeDomain, type DayType, type DayTypeInfo, SLOW_PLANETS } from './convergence.types';
import { getCurrentPlanetaryHour, type PlanetaryHour } from './planetary-hours'; // V9 Sprint 4
import { calcFixedStarScore, type FixedStarResult } from './fixed-stars'; // V9.6 Sprint A3
import { calcAshtakavarga, buildSAV, calcMoonBAVSAV, extractNatalSiderealSignIdx } from './ashtakavarga'; // V9.6 Sprint C + Sprint AK SAV
import { calcKineticShocks } from './kinetic-shocks'; // Sprint AL — Chantier 5 Sprint 2
import { calcPanchanga, type PanchangaResult, calcTarabala, calcChandrabala, type TarabalaResult, type ChandrabalaResult, getTithiLord, calcTithiLordGochara, type TithiLordGocharaResult, calcGrahaDrishti, type GrahaDrishtiResult, calcYogaKartari, type KartariResult, combinedBala } from './panchanga'; // Sprint D3 + Sprint G + Sprint J + Sprint L + Sprint M + Sprint P

// ══════════════════════════════════════
// ═══ CONSTANTES INTERNES ═══
// ══════════════════════════════════════

const DAY_TYPES: Record<DayType, Omit<DayTypeInfo, 'type'>> = {
  decision:      { label: 'Décision',      icon: '⚡', desc: 'Énergie favorable aux choix importants et engagements',      color: '#FFD700' },
  observation:   { label: 'Observation',   icon: '🔍', desc: "Énergie tournée vers l'analyse et la compréhension",          color: '#60a5fa' },
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
  _transitBreakdown: Array<{ transitPlanet: string; score: number; aspectType?: string }>;
  planetaryHour: PlanetaryHour | null; // V9 Sprint 4 — heure planétaire chaldéenne courante
  // Z2-B — deltas de groupe pour observabilité L3 (Ronde Z consensus 3/3)
  baziGroupDelta: number;   // C_BAZI capé ±15
  luneGroupDelta: number;   // C_LUNE capé ±12 (Sprint AO BONUS)
  ephemGroupDelta: number;  // C_EPHEM capé ±10 (Sprint AN — était ±14)
  indivGroupDelta: number;  // Sprint AN — C_INDIV capé ±8
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

// ══════════════════════════════════════
// ═══ CALC DAILY MODULES — L1 ═══
// Contient tous les modules quotidiens de calcConvergence (L1518-L2177)
// Option A : breakdown[], signals[], alerts[] passés par référence
// ══════════════════════════════════════

export function calcDailyModules(
  params: {
    num: NumerologyProfile;
    astro: AstroChart | null;
    iching: IChingReading;
    bd: string;
    todayStr: string;
  },
  breakdown: SystemBreakdown[],
  signals: string[],
  alerts: string[]
): DailyModuleResult {
  const { num, astro, iching, bd, todayStr } = params;

  let delta = 0;
  const pdv = num.ppd.v;
  const pdInfo = getNumberInfo(pdv);

  // ═══════════════════════════════════
  // 1. NUMÉROLOGIE (±14) — V4.4b: ±13→±14
  // PD ±7, PM ±3, PY ±3, Pinnacle ±1
  // ═══════════════════════════════════

  const numSignals: string[] = [];
  const numAlerts: string[] = [];
  const numDetail: string[] = [];

  // ── PD (±7) ──
  let pdPts = 0;
  if (pdv === num.lp.v)        { pdPts = 7; numDetail.push(`PD=CdV(+7)`); numSignals.push(`Jour ${pdv} = Chemin de Vie → alignement majeur`); }
  else if (pdv === num.expr.v) { pdPts = 5; numDetail.push(`PD=Expr(+5)`); numSignals.push(`Jour ${pdv} = Expression → talents amplifiés`); }
  else if (pdv === num.soul.v) { pdPts = 4; numDetail.push(`PD=Âme(+4)`); numSignals.push(`Jour ${pdv} = Âme → désirs profonds activés`); }
  else if (pdv === num.pers.v) { pdPts = 3; numDetail.push(`PD=Perso(+3)`); numSignals.push(`Jour ${pdv} = Personnalité → charisme renforcé`); }
  if (isMaster(pdv))           { pdPts = Math.min(7, pdPts + 2); numDetail.push(`Maître(+2)`); numSignals.push(`Jour Maître ${pdv} → énergie spirituelle`); }
  if (num.kl.includes(pdv))    { pdPts = Math.min(7, pdPts + 1); numDetail.push(`Leçon(+1)`); }
  pdPts = Math.max(-7, Math.min(7, pdPts));

  // ── PY — V6.2: narratif pur, delta supprimé (R18 final) ──
  const pyv = num.py.v;
  const pyPts = 0; // plus d'impact sur le score

  // ── PM (±3) ──
  const pmv = num.pm.v;
  let pmPts = 0;
  if (pmv === num.lp.v)               pmPts = 3;
  else if ([1, 3, 8].includes(pmv))   pmPts = 2;
  else if ([4, 7].includes(pmv))      pmPts = -2;
  else if ([2, 6].includes(pmv))      pmPts = 1;
  pmPts = Math.max(-3, Math.min(3, pmPts));
  // PM narratif supprimé V6.2 (exclu du delta)

  // ── Pinnacle (±1) ──
  const pinnIdx = getActivePinnacleIdx(bd, todayStr, num.lp);
  const activePinnacle = num.pinnacles[pinnIdx];
  const activeChallenge = num.challenges[pinnIdx];
  let pinnPts = 0;
  if (activePinnacle && pdv === activePinnacle.v) { pinnPts = 1; } // Pinnacle narratif supprimé V6.2
  if (activeChallenge && pdv === activeChallenge.v) { pinnPts = -1; } // Défi narratif supprimé V6.2

  // Sprint AO P6 — Numérologie : delta=0 depuis V8, breakdown supprimé
  // Sprint AR P3 : numTotal=0 stub supprimé (Ronde 11 consensus 3/3)
  // Karmic debt signals conservés (valeur narrative)
  if ((num as any).hasKarmicDebt && (num as any).karmicDebt) {
    const kd = (num as any).karmicDebt as number;
    const kdMsg = kd === 13 ? 'effort & discipline' : kd === 14 ? 'liberté & excès' : kd === 16 ? 'ego & humilité' : 'puissance & abus';
    signals.push(`⚖️ Dette karmique ${kd} — ${kdMsg}`);
  }
  signals.push(...numSignals);
  alerts.push(...numAlerts);

  // ═══════════════════════════════════
  // 2. BaZi FAMILLE (±18 groupé) — V4.4b
  // ═══════════════════════════════════

  let baziResult: DayMasterDailyResult | null = null;
  let tenGodsResult: TenGodsResult | null = null;
  let baziDMPts = 0;
  let tenGodsPts = 0;
  let dmS = 0; // Sprint AJ — facteur DM Strength s ∈ [-1,+1], utilisé aussi par Shen Sha
  // Sprint AN — C_INDIV hoisted variables (Ronde 6 P2 : individuels groupés cap ±8)
  let indivTLG = 0;      // Tithi Lord Gochara
  let indivDrishti = 0;  // Graha Drishti
  let indivKartari = 0;  // Yoga Kartari
  const baziSignals: string[] = [];
  const baziAlerts: string[] = [];

  const birthDate = safeParseDateLocal(bd) ?? new Date(bd + 'T12:00:00'); // Sprint AG: validated
  const todayDate = safeParseDateLocal(todayStr) ?? new Date(todayStr + 'T12:00:00'); // Sprint AG

  try {

    baziResult = calcBaZiDaily(birthDate, todayDate, 50);
    baziDMPts = Math.max(-6, Math.min(6, Math.round(baziResult.totalScore * 2)));
    if (baziDMPts > 0) {
      baziSignals.push(`${baziResult.dailyStem.archetype} → ${baziResult.relation === 'produced_by' ? 'soutien' : 'harmonie'}`);
    } else if (baziDMPts < 0) {
      baziAlerts.push(`${baziResult.dailyStem.archetype} → ${baziResult.relation === 'destroyed_by' ? 'pression' : 'friction'}`);
    }

    tenGodsResult = calc10Gods(birthDate, todayDate);
    // Sprint AI — Modulation DM Strength sur 10 Gods (±20%)
    // Le DM Strength est statique (natal), calculé une fois
    let dmResult: DMStrengthResult | null = null;
    try {
      dmResult = calcDMStrength(birthDate, null); // null = pas d'heure pour l'instant
    } catch { /* DM strength fail silently */ }
    dmS = dmResult?.s ?? 0;
    // Appliquer le multiplicateur DM au score total des 10 Gods
    const rawTenGods = tenGodsResult.totalScore;
    const dominantGod = tenGodsResult.dominant?.god;
    const dmMult = dominantGod ? getDMMultiplier(dominantGod, dmS) : 1.0;
    const modulatedTenGods = Math.round(rawTenGods * dmMult);
    tenGodsPts = Math.max(-6, Math.min(6, modulatedTenGods));
    if (tenGodsResult.dominant) {
      const d = tenGodsResult.dominant;
      const zhengLabel = d.isZheng ? '正' : '偏';
      if (tenGodsPts > 0) baziSignals.push(`${d.label} (${zhengLabel}) → favorable`);
      else if (tenGodsPts < 0) baziAlerts.push(`${d.label} (${zhengLabel}) → friction`);
    }
  } catch { /* BaZi/10Gods fail silently */ }

  // Peach Blossom (+2, Amour domain only — pas dans le score global)
  let peachBlossomActive = false;
  try {
    const peachBirthDate = new Date(bd + 'T12:00:00');
    const peachTodayDate = new Date(todayStr + 'T12:00:00');
    const peachResult = getPeachBlossom(peachBirthDate, peachTodayDate);
    peachBlossomActive = peachResult.active;
  } catch { /* silent */ }

  const baziCorePts = Math.max(-8, Math.min(8, baziDMPts + tenGodsPts)); // Sprint AN — sub-cap ±8 (Ronde 6 P3 : fusion colinéarité DM+10Gods)

  signals.push(...baziSignals);
  alerts.push(...baziAlerts);

  breakdown.push({
    system: 'BaZi', icon: '干',
    value: baziResult ? `${baziResult.dailyStem.chinese} ${baziResult.dailyStem.pinyin}` : 'N/A',
    points: baziDMPts,
    detail: baziResult ? baziResult.interaction.dynamique.split('.')[0] : 'Non disponible',
    signals: baziSignals.filter(s => !s.includes('Gods')), alerts: baziAlerts.filter(a => !a.includes('Gods')),
  });

  if (tenGodsResult) {
    breakdown.push({
      system: '10 Gods', icon: '神',
      value: tenGodsResult.dominant ? tenGodsResult.dominant.label : 'Neutre',
      points: tenGodsPts,
      detail: tenGodsResult.gods.map(g => g.label.split(' ')[0]).join('+'),
      signals: baziSignals.filter(s => s.includes('Gods') || s.includes('正') || s.includes('偏')),
      alerts: baziAlerts.filter(a => a.includes('Gods') || a.includes('正') || a.includes('偏')),
    });
  }

  if (peachBlossomActive) {
    breakdown.push({
      system: 'Peach Blossom', icon: '🌸',
      value: '桃花 Active', points: 2,
      detail: 'Peach Blossom du jour → charme amplifié',
      signals: ['🌸 Peach Blossom active — magnétisme relationnel'], alerts: [],
    });
  }

  // Sprint AR P3 : changshengResult + changshengPts stubs supprimés (Ronde 11 consensus 3/3)

  // ═══════════════════════════════════
  // 2c. SHEN SHA 神煞 (0-4 global) — V4.3
  // ═══════════════════════════════════

  let shenShaResult: ShenShaResult | null = null;
  let shenShaPts = 0;
  try {
    const ssBirthDate = new Date(bd + 'T12:00:00');
    const ssTodayDate = new Date(todayStr + 'T12:00:00');
    shenShaResult = checkShenSha(ssBirthDate, ssTodayDate);

    // Sprint AJ — Chantier 5 : scoring anti-stack cap ±4
    // Consensus 3/3 IAs (GPT R2 + Grok R2 + Gemini R2)
    // 1. Trier par |global| décroissant
    // 2. Poids dégressifs [1, 0.6, 0.4, 0.3, 0.25, 0.2, 0.2, ...]
    // 3. Interaction DM : étoiles négatives ×(1+0.25×(-s)), protectrices ×(1+0.20×(-s))
    // 4. Cap final ±4
    const ANTI_STACK_WEIGHTS = [1, 0.6, 0.4, 0.3, 0.25, 0.2];
    const sorted = [...shenShaResult.active].sort((a, b) => Math.abs(b.global) - Math.abs(a.global));
    let rawShenSha = 0;
    for (let i = 0; i < sorted.length; i++) {
      const star = sorted[i];
      let pts = star.global;
      // Interaction DM × Shen Sha (dmS provient du calcul DM Strength plus haut)
      if (pts < 0) {
        // Étoiles négatives : amplifiées si DM faible (s < 0 → -s > 0)
        pts = pts * (1 + 0.25 * Math.max(0, -dmS));
      } else if (pts > 0) {
        // Étoiles protectrices/positives : amplifiées si DM faible
        pts = pts * (1 + 0.20 * Math.max(0, -dmS));
      }
      const w = ANTI_STACK_WEIGHTS[Math.min(i, ANTI_STACK_WEIGHTS.length - 1)];
      rawShenSha += pts * w;
    }
    shenShaPts = Math.max(-4, Math.min(4, Math.round(rawShenSha * 10) / 10));

    for (const star of shenShaResult.active) {
      if (star.global > 0) signals.push(`${star.chinese} ${star.label_fr}`);
      else if (star.global < 0) alerts.push(`${star.chinese} ${star.label_fr}`);
    }
    if (shenShaResult.active.length > 0) {
      breakdown.push({
        system: 'Shen Sha', icon: '⭐',
        value: shenShaResult.active.map(s => s.chinese).join(' '),
        points: shenShaPts,
        detail: shenShaResult.active.map(s => s.label_fr).join(' · '),
        signals: shenShaResult.active.filter(s => s.global > 0).map(s => `${s.chinese} → ${s.label_fr.split('—')[0].trim()}`),
        alerts: shenShaResult.active.filter(s => s.global < 0).map(s => `${s.chinese} → ${s.label_fr.split('—')[0].trim()}`),
      });
    }
  } catch { /* Shen Sha fail silently */ }

  // Sprint AO P6 — NaYin supprimé (code mort depuis V6.2, if(false))

  // ═══════════════════════════════════
  // 2f. JIAN CHU 建除 (12 Officers) — V8.9 T1
  // Timing BaZi : qualité journalière via Branche Jour × Branche Mois
  // Formule : officerIdx = (dayBranchIdx - monthBranchIdx + 12) % 12
  // Amplitude ±2 conservatrice — signal pur, anti-bruit
  // ═══════════════════════════════════

  const JIAN_CHU_OFFICERS: Array<{ zh: string; fr: string; pts: number }> = [
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

  let jianchuPts = 0;
  let jianchuOfficer: { zh: string; fr: string; pts: number } | null = null;
  try {
    const jcDate        = new Date(todayStr + 'T12:00:00');
    const dayBranchIdx  = calcDayMaster(jcDate).branch.index;
    const monthBranchIdx = getMonthPillar(jcDate).branchIdx;
    const officerIdx    = ((dayBranchIdx - monthBranchIdx) % 12 + 12) % 12;
    jianchuOfficer      = JIAN_CHU_OFFICERS[officerIdx];
    const jianchuRaw    = jianchuOfficer.pts;
    // V8.9 GPT Q1 : debias espérance +5/12 · Sprint AM — ×0.5 (Ronde 5 : ±2→±1, signal cyclique)
    jianchuPts          = (jianchuRaw - (5 / 12)) * 0.5;
    const officerLabel  = `${jianchuOfficer.zh} ${jianchuOfficer.fr}`;
    if (jianchuRaw > 0) signals.push(`${officerLabel} — officier favorable`);
    else if (jianchuRaw < 0) alerts.push(`${officerLabel} — journée à timing difficile`);
    breakdown.push({
      system: 'Jian Chu', icon: '建',
      value:  officerLabel,
      points: jianchuRaw, // valeur brute affichée (débias appliqué au delta, pas à l'affichage)
      detail: `Officer ${officerIdx + 1}/12 · branche jour ${dayBranchIdx} / mois ${monthBranchIdx}`,
      signals: jianchuRaw > 0 ? [`${officerLabel} → timing favorable`] : [],
      alerts:  jianchuRaw < 0 ? [`${officerLabel} → timing difficile`]  : [],
    });
  } catch { /* Jian Chu fail silently */ }

  // ═══════════════════════════════════
  // 2d. BaZi FAMILLE GROUPÉE (±18) — V4.4
  // ═══════════════════════════════════

  // Sprint AR P3 : changshengPts (=0) retiré de la somme (Ronde 11 consensus 3/3)
  const baziFamilyTotal = Math.max(-15, Math.min(15, baziCorePts + jianchuPts + shenShaPts)); // V9.6 Sprint A2: C_BAZI ±15 + Sprint AJ: Shen Sha ±4
  delta += baziFamilyTotal;

  // Direct domain bonuses (Shen Sha per-domain — Changsheng retiré Sprint AP P5)
  const directDomainBonuses: Partial<Record<LifeDomain, number>> = {};
  if (shenShaResult && shenShaResult.active.length > 0) {
    directDomainBonuses.BUSINESS      = (directDomainBonuses.BUSINESS      || 0) + shenShaResult.totalBusiness;
    directDomainBonuses.AMOUR         = (directDomainBonuses.AMOUR         || 0) + shenShaResult.totalAmour;
    directDomainBonuses.CREATIVITE    = (directDomainBonuses.CREATIVITE    || 0) + shenShaResult.totalCreativite;
    directDomainBonuses.VITALITE      = (directDomainBonuses.VITALITE      || 0) + shenShaResult.totalVitalite;
    directDomainBonuses.INTROSPECTION = (directDomainBonuses.INTROSPECTION || 0) + shenShaResult.totalIntrospection;
  }
  // Sprint AN — Peach Blossom hors score global, domaine Amour uniquement (Ronde 6 P5 : consensus 3/3)
  if (peachBlossomActive) {
    directDomainBonuses.AMOUR = (directDomainBonuses.AMOUR || 0) + 2;
  }

  // ═══════════════════════════════════
  // 2e. PROFECTIONS ANNUELLES (V4.7)
  // ═══════════════════════════════════

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
    breakdown.push({
      system: 'Profections',
      icon: '🏠',
      value: `Maison ${profectionResult.activeHouse} (${profectionResult.activeSign})`,
      points: 0,
      detail: `${profectionResult.timeLord} — domaine ${profectionResult.domain} ×${profectionResult.domainMultiplier.toFixed(2)}`,
      signals: [`Maison ${profectionResult.activeHouse}: ${profectionResult.domain}`],
      alerts: [],
    });
  } catch { /* profections fail silently */ }

  // V8.4 : Maisons planétaires → enrichissement domaines (R29 Grok)
  // Impact sur directDomainBonuses uniquement, pas sur delta global.
  if (astro) {
    enrichDomainScoresWithHouses(astro, directDomainBonuses, profectionResult?.activeHouse);
  }

  // ═══════════════════════════════════
  // 3. I CHING — V8: consultation séparée (R25 GPT : non calendaire sans question posée)
  // ichRes calculé pour display, interactions et calcDayType.
  // Sprint U2 — réintroduit avec soft-clamp tanh (V10, était supprimé V8 pour bruit brut)
  // ═══════════════════════════════════

  const ichRes = ichingScoreV4(iching.hexNum, iching.changing);
  const ichingCapped = Math.round(3 * Math.tanh(ichRes.pts / 6)); // Sprint AM — tanh ±3 (Ronde 5 : compromis orthogonalité vs tradition, était ±6)
  // Sprint AN — I Ching ajouté via C_INDIV (plus d'ajout direct au delta)
  // if (ichingCapped !== 0) delta += ichingCapped;

  const ichingSignals: string[] = [];
  const ichingAlerts: string[] = [];
  if (ichRes.pts > 0) ichingSignals.push(`Hex. ${iching.hexNum} (${iching.name}) → ${ichRes.tier === 'A' ? 'puissant' : 'favorable'} (narratif)`);
  if (ichRes.pts < 0) ichingAlerts.push(`Hex. ${iching.hexNum} (${iching.name}) → ${ichRes.tier === 'E' ? 'épreuve' : 'tension'} (narratif)`);
  signals.push(...ichingSignals);
  alerts.push(...ichingAlerts);

  breakdown.push({
    system: 'I Ching', icon: '☰',
    value: `#${iching.hexNum} ${iching.name}`,
    points: 0, // V8 : narratif — consultation séparée (R25)
    detail: `Tier ${ichRes.tier} · L${iching.changing + 1} · Yao ${ichRes.yao >= 0 ? '+' : ''}${ichRes.yao} / Dynamique cachée ${ichRes.nuclear >= 0 ? '+' : ''}${ichRes.nuclear}`,
    signals: ichingSignals, alerts: ichingAlerts,
  });

  // ═══════════════════════════════════
  // 4. PHASE LUNAIRE — V8: narratif visible (R25 — absorbée par Nakshatra)
  // moonResult conservé pour eclipse exclusion mutuelle en L3. NON ajouté au delta.
  // ═══════════════════════════════════

  const dayType = calcDayType(pdv, iching, astro);
  const moonResult = calcMoonScore(todayStr, dayType.type);
  // delta += moonResult.points; // SUPPRIMÉ V8 — absorbée par Nakshatra (R25)
  signals.push(...moonResult.signals);
  alerts.push(...moonResult.alerts);

  breakdown.push({
    system: 'Lune', icon: '☽',
    value: moonResult.phaseLabel,
    points: 0, // V8 : narratif (R25)
    detail: moonResult.detail,
    signals: moonResult.signals, alerts: moonResult.alerts,
  });

  // ═══════════════════════════════════
  // 4b+4c. NAKSHATRA COMPOSITE V5.5
  // ═══════════════════════════════════

  // V9.6 Sprint A2 — Groupe LUNE (Nakshatra + R31 + VoC) → cap ±11
  let luneGroupPts = 0;

  let nakshatraData: NakshatraData | undefined;
  let natalMoonSidForNak: number | null = null; // Sprint J — hissé au scope fonction (utilisé aussi par Tithi Lord Gochara post-section)
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
      luneGroupPts += nakCompositeResult.total; // Sprint A2: groupe LUNE
      signals.push(...nakCompositeResult.signals);
      alerts.push(...nakCompositeResult.alerts);
    }

    breakdown.push({
      system: 'Nakshatra', icon: '🌙',
      value: `${nakshatraData.name}${nakCompositeResult.natalNakName ? ` ↔ ${nakCompositeResult.natalNakName}` : ''}`,
      points: nakCompositeResult.total,
      detail: `${nakshatraData.quality} — ${nakCompositeResult.breakdown}`,
      signals: nakCompositeResult.signals,
      alerts:  nakCompositeResult.alerts,
    });

    // ── Sprint G : Tarabala + Chandrabala (additif, Ronde 11 consensus 2/3) ──
    if (natalMoonSidForNak !== null) {
      let tarabalaPts = 0; // hissé pour R32
      try {
        const tarabalaRes    = calcTarabala(moonLongSidereal, natalMoonSidForNak);
        tarabalaPts = tarabalaRes.delta; // hissé pour R32
        const chandrabalaRes = calcChandrabala(moonLongSidereal, natalMoonSidForNak);

        // Sprint P — combinedBala · Sprint AM — cap ±2 combiné (Ronde 5 : réduction double-comptage Nak, était ±6)
        const combinedBalaVal = Math.max(-2, Math.min(2, combinedBala(tarabalaRes.delta, chandrabalaRes.delta)));
        luneGroupPts += combinedBalaVal;

        if (tarabalaRes.delta > 0)    signals.push(tarabalaRes.label);
        else if (tarabalaRes.delta < 0) alerts.push(tarabalaRes.label);
        if (chandrabalaRes.delta > 0)    signals.push(chandrabalaRes.label);
        else if (chandrabalaRes.delta < 0) alerts.push(chandrabalaRes.label);

        breakdown.push({
          system: 'Tarabala', icon: '⭐',
          value: `${tarabalaRes.name} (pos.${tarabalaRes.index})`,
          points: tarabalaRes.delta,
          detail: `Nakshatra transit vs natal — Muhurta Chintamani §12-18`,
          signals: tarabalaRes.delta > 0 ? [tarabalaRes.label] : [],
          alerts:  tarabalaRes.delta < 0 ? [tarabalaRes.label] : [],
        });
        breakdown.push({
          system: 'Chandrabala', icon: '🌙',
          value: `Position ${chandrabalaRes.position}/12`,
          points: chandrabalaRes.delta,
          detail: `Lune transit vs signe natal${chandrabalaRes.position === 8 ? ' — Astama Chandra ⚠️' : ''}`,
          signals: chandrabalaRes.delta > 0 ? [chandrabalaRes.label] : [],
          alerts:  chandrabalaRes.delta < 0 ? [chandrabalaRes.label] : [],
        });
      } catch { /* Tarabala/Chandrabala silently */ }

      // Sprint AO — R32 Retour Nakshatra supprimé (Ronde 7 consensus 2/3 GPT+Gemini)
      // Biais positif unilatéral (+3, ~13j/an), colinéaire avec Janma Tara (Tarabala pos.1)
    }

    // Sprint AO P6 — R31 Cohérence lunaire supprimée (code mort depuis Sprint AM, delta < 2)

    // Sprint AO P6 — Pada supprimé (code mort depuis Sprint AM, delta < 2)

  } catch { /* nakshatras fail silently */ }

  // Sprint AO P6 — R33 BaZi×Védique supprimé (code mort depuis Sprint AM, syncrétisme arbitraire)

  // ═══════════════════════════════════
  // 5. MERCURE — V8: alerte narrative (R25 — bruit populaire, valeur commerciale d'acquisition)
  // mercPts conservé comme variable (utilisé dans biasCorrection exclusion + getScoreLevel L3)
  // NON ajouté au delta.
  // ═══════════════════════════════════

  const mercStatus = getMercuryStatus(new Date(todayStr + 'T12:00:00'));
  const mercPts = Math.max(-3, mercStatus.points); // conservé pour L3 getScoreLevel (condition ⚡)
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
  // delta += mercPts; // SUPPRIMÉ V8 — bruit non prédictif (R25 GPT)

  // ═══════════════════════════════════
  // 6. TRANSIT LUNAIRE (±2)
  // ═══════════════════════════════════

  const moonTr = getMoonTransit(todayStr);
  const isActDayMain = dayType.type === 'decision' || dayType.type === 'expansion';
  const isRefDayMain = dayType.type === 'retrait' || dayType.type === 'observation';
  const faMoon = moonTr.element === 'fire' || moonTr.element === 'air';
  const weMoon = moonTr.element === 'water' || moonTr.element === 'earth';
  let trLunPts = 0;
  const trLunSignals: string[] = [];
  const trLunAlerts: string[] = [];

  if (faMoon && isActDayMain)       { trLunPts = 2;  trLunSignals.push(`Lune en ${moonTr.sign} → amplifie l'action`); }
  else if (weMoon && isRefDayMain)  { trLunPts = 2;  trLunSignals.push(`Lune en ${moonTr.sign} → soutient l'introspection`); }
  else if (faMoon && isRefDayMain)  { trLunPts = -2; trLunAlerts.push(`Lune en ${moonTr.sign} → agitation en jour de repos`); }
  else if (weMoon && isActDayMain)  { trLunPts = -2; trLunAlerts.push(`Lune en ${moonTr.sign} → énergie ralentie`); }

  trLunPts = Math.max(-2, Math.min(2, trLunPts));
  // trLunPts déconnecté V6.2 (redondant Nakshatra — R15)
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
  // 6b. VOID OF COURSE MOON (V4.2) — -2 à 0
  // ═══════════════════════════════════

  let vocResult: VoidOfCourseMoon | null = null;
  try {
    vocResult = getVoidOfCourseMoon(todayStr);
    if (vocResult.isVoC) {
      const vocPts = vocResult.intensity === 'forte' ? -2 : -1;
      luneGroupPts += vocPts; // Sprint A2: groupe LUNE
      alerts.push(`🌙 ${vocResult.advice.split('.')[0]}`);
      breakdown.push({
        system: 'Lune Hors Cours', icon: '🌙',
        value: `VoC (${vocResult.degreesLeft}° restants)`,
        points: vocPts,
        detail: vocResult.advice,
        signals: [], alerts: [vocResult.advice],
      });
    }
  } catch { /* VoC fail silently */ }

  // ═══════════════════════════════════
  // 4d. ASHTAKAVARGA LUNAIRE + SAV — Sprint AK Chantier 5
  // Hybride Moon BAV + SAV : clamp(Lune_BAV_Score + SAV_Score, -5, +5)
  // Consensus 3/3 IAs (GPT R2, Grok R2, Gemini R2)
  // Remplace l'ancien delta Moon BAV pur (±2)
  // ═══════════════════════════════════

  if (astro) {
    try {
      const todayD       = new Date(todayStr + 'T12:00:00Z');
      const moonTropLon  = getMoonPhase(todayD).longitudeTropical;
      const ayToday      = getAyanamsa(todayD.getFullYear());
      const moonSidLon   = ((moonTropLon - ayToday) + 360) % 360;
      const moonSignIdx  = Math.floor(((moonSidLon % 360) + 360) % 360 / 30);

      // Construire BAV Lune natale pour obtenir les bindus
      const donorIdx     = extractNatalSiderealSignIdx(astro, bd);
      const ashMoon      = calcAshtakavarga('moon', moonSidLon, astro, bd);
      const moonBindus   = ashMoon.bindus;

      // Construire SAV et lire la valeur du signe transitant
      const sav          = buildSAV(donorIdx);
      const savSign      = sav[moonSignIdx] ?? 28;

      // Calcul hybride
      const hybrid       = calcMoonBAVSAV(moonBindus, savSign);
      const hybridDelta  = Math.round(hybrid.hybridDelta); // arrondir pour L1

      if (hybridDelta !== 0) {
        luneGroupPts += hybridDelta; // Sprint AK: remplace ancien ashMoon.delta
        const sign = hybridDelta > 0 ? '+' : '';
        const label = `⭕ Ashtakavarga ☽+SAV — ${ashMoon.signName} (${moonBindus}B, SAV=${savSign}) → ${sign}${hybridDelta}`;
        if (hybridDelta > 0) signals.push(label);
        else alerts.push(label);
        breakdown.push({
          system: 'Ashtakavarga ☽+SAV', icon: '⭕',
          value:  `${ashMoon.signName} — ${moonBindus}B / SAV ${savSign}`,
          points: hybridDelta,
          detail: `Lune sidérale en ${ashMoon.signName} | BAV=${moonBindus}, SAV=${savSign} | Hybride ${sign}${hybridDelta}`,
          signals: hybridDelta > 0 ? [label] : [], alerts: hybridDelta < 0 ? [label] : [],
        });
      }
    } catch { /* Ashtak Moon+SAV fail silently */ }
  }

  // ═══════════════════════════════════
  // 4e. PANCHANGA VÉDIQUE — Sprint D3
  // Tithi (phase lunaire védique) + Yoga (Lune+Soleil siddéral) → ±5 capé
  // Vara : narratif uniquement (delta=0, Ronde 7 consensus)
  // ═══════════════════════════════════

  let panchangaResult: PanchangaResult | null = null;
  try {
    const todayDateP   = new Date(todayStr + 'T12:00:00Z');
    const moonTropP    = getMoonPhase(todayDateP).longitudeTropical;
    const sunTropP     = getPlanetLongitudeForDate('sun', todayDateP);
    const ayanamsaP    = getAyanamsa(todayDateP.getFullYear());
    panchangaResult    = calcPanchanga(moonTropP, sunTropP, ayanamsaP, todayDateP);
    if (panchangaResult.total !== 0) {
      luneGroupPts += Math.max(-4, Math.min(4, panchangaResult.total)); // Sprint U3 — cap ±4 (était ±6 implicite)
      signals.push(...panchangaResult.signals);
      alerts.push(...panchangaResult.alerts);
    }
    // Tithi breakdown
    breakdown.push({
      system: 'Panchanga',
      icon:   '🪷',
      value:  `${panchangaResult.tithi.name} · ${panchangaResult.yoga.name} · ${panchangaResult.vara.name}`,
      points: panchangaResult.total,
      detail: `Tithi ${panchangaResult.tithi.tithi} (${panchangaResult.tithi.quality}) | Yoga ${panchangaResult.yoga.yoga} | ${panchangaResult.vara.icon} ${panchangaResult.vara.planet}`,
      signals: panchangaResult.signals,
      alerts:  panchangaResult.alerts,
    });
  } catch { /* panchanga fail silently */ }

  // Sprint AO — C_LUNE cap ±16 → ±12 (Ronde 7 consensus 2/3 GPT+Grok : surdominance lunaire)
  // Max théo post-R32 supprimé : Nak(±8) + Tara/Chandra(±2) + VoC(-2) + BAV+SAV(±5) + Panchanga(±4) = ±21
  const luneGroupCapped = Math.max(-12, Math.min(12, luneGroupPts));
  delta += luneGroupCapped;

  // Sprint AO P6 — Rétrogrades planétaires supprimées (code mort depuis V6.2, if(false))

  // ═══════════════════════════════════
  // 8. TRANSITS PERSONNELS GAUSSIENS (±15) V4.8
  // ═══════════════════════════════════

  // V9.6 Sprint A2 — Groupe EPHEM (Transits + Interactions + Heure planétaire) → cap ±12
  let ephemGroupPts = 0;

  let astroPts = 0;
  const astroSignals: string[] = [];
  const astroAlerts: string[] = [];
  // V6.0 : hoisted pour dashaLordTransitScore + profectionSignifiantScore (R21, R27)
  let _transitBreakdown: Array<{ transitPlanet: string; score: number; aspectType?: string }> = [];
  // Sprint F — vitesses planétaires pour stationFactor (°/j, outer planets)
  // Calcul J vs J-1 (midi UTC) pour détecter stations (Vakra védique / Ptolémée)
  const planetSpeeds_F: Record<string, number> = {};
  try {
    const todayD_spd     = new Date(todayStr + 'T12:00:00');
    const yesterdayD_spd = new Date(todayD_spd.getTime() - 86400000);
    for (const pl of ['jupiter', 'saturn', 'uranus', 'neptune', 'pluto'] as const) {
      const lonT = getPlanetLongitudeForDate(pl, todayD_spd);
      const lonY = getPlanetLongitudeForDate(pl, yesterdayD_spd);
      let spd = lonT - lonY;
      if (spd >  180) spd -= 360; // gestion passage 360°→0°
      if (spd < -180) spd += 360;
      planetSpeeds_F[pl] = spd;
    }
  } catch { /* vitesses fail silently — stationFactor retourne 1.0 si absent */ }

  if (astro && astro.tr.length) {
    const personalTransits = calcPersonalTransits(astro.tr, 1.2, astro.as, astro.pl, astro.stelliums, planetSpeeds_F); // V8.4 stelliums · Sprint F stationFactor
    _transitBreakdown = personalTransits.breakdown as typeof _transitBreakdown;
    // Sprint R — Anti double-comptage Jupiter/Saturn → Lune natale
    // Graha Drishti (Parāśari) prend ownership de ces aspects → neutralisation part gaussienne
    // Jupiter ET Saturn sont les seules planètes présentes dans TRANSIT_AMPLITUDES ET GRAHA_DRISHTI_ASPECTS
    // On soustrait leur contribution sur le point natal 'moon' avant le cap ±6
    const DRISHTI_SLOW_R = new Set(['jupiter', 'saturn']);
    const drOverlapR = personalTransits.breakdown
      .filter(b => DRISHTI_SLOW_R.has(b.transitPlanet) && (b as any).natalPoint === 'moon')
      .reduce((s, b) => s + b.score, 0);
    astroPts = Math.max(-6, Math.min(6, Math.round(personalTransits.total - drOverlapR))); // V6.2+R: cap ±6, overlap Drishti neutralisé
    if (astroPts > 0) {
      const top = personalTransits.breakdown.sort((a, b) => b.score - a.score)[0];
      astroSignals.push(`${PLANET_FR[top?.transitPlanet] ?? top?.transitPlanet} → ${top?.aspectType === 'harmonic' ? 'trigone/sextile' : 'conjonction'} favorable (+${astroPts})`);
    } else if (astroPts < 0) {
      const top = personalTransits.breakdown.sort((a, b) => a.score - b.score)[0];
      astroAlerts.push(`${PLANET_FR[top?.transitPlanet] ?? top?.transitPlanet} → ${top?.aspectType === 'tense' ? 'carré/opposition' : 'conjonction'} en tension (${astroPts})`);
    }
  }
  ephemGroupPts += astroPts; // Sprint A2: groupe EPHEM
  signals.push(...astroSignals);
  alerts.push(...astroAlerts);

  breakdown.push({
    system: 'Astrologie', icon: '☽',
    value: astro ? `${astro.tr.length} transits` : 'Non disponible',
    points: astroPts,
    detail: astro ? `${astro.tr.filter(t => SLOW_PLANETS.has(t.tp)).length} planètes lentes` : 'N/A',
    signals: astroSignals, alerts: astroAlerts,
  });

  // ═══════════════════════════════════
  // 8b. TITHI LORD GOCHARA — Sprint J (±2)
  // Seigneur du Tithi en transit / Lune natale (Gochara védique)
  // Post-section autonome : panchangaResult déjà calculé + getPlanetLongitudeForDate
  // Coverage : 7 planètes (Rahu → neutre, delta = 0)
  // ═══════════════════════════════════

  if (panchangaResult !== null && natalMoonSidForNak !== null) {
    try {
      const tlgLord = getTithiLord(panchangaResult.tithi.tithi);
      if (tlgLord !== 'rahu') {
        const evalD_tlg = new Date(todayStr + 'T12:00:00');
        const ay_tlg    = getAyanamsa(evalD_tlg.getFullYear());
        // Safe cast : TITHI_LORDS_30 \ {'rahu'} ⊂ getPlanetLongitudeForDate param type
        const tropLon   = getPlanetLongitudeForDate(
          tlgLord as 'sun' | 'moon' | 'mars' | 'mercury' | 'jupiter' | 'venus' | 'saturn',
          evalD_tlg,
        );
        const sidLon    = ((tropLon - ay_tlg) % 360 + 360) % 360;
        const tlgRes    = calcTithiLordGochara(tlgLord, sidLon, natalMoonSidForNak);
        const tlgDelta  = Math.max(-1, Math.min(1, tlgRes.delta)); // Sprint AN — ±2→±1 (Ronde 6 P4)
        indivTLG = tlgDelta; // Sprint AN — C_INDIV
        if (tlgDelta !== 0) {
          // Sprint AN — ajouté via C_INDIV (plus d'ajout direct au delta)
          if (tlgDelta > 0) signals.push(tlgRes.label);
          else              alerts.push(tlgRes.label);
          breakdown.push({
            system: 'Tithi Lord', icon: '🪐',
            value:  `${tlgLord} M${tlgRes.houseFromMoon}`,
            points: tlgDelta,
            detail: `Gochara Tithi ${panchangaResult.tithi.tithi} — ${tlgLord} en maison ${tlgRes.houseFromMoon} Lune natale`,
            signals: tlgDelta > 0 ? [tlgRes.label] : [],
            alerts:  tlgDelta < 0 ? [tlgRes.label] : [],
          });
        }
      }
    } catch { /* Tithi Lord Gochara fail silently */ }
  }

  // ═══════════════════════════════════════════════════════════
  // 8c. GRAHA DRISHTI — Sprint L — V10.6 (post-section autonome)
  // Aspects Parāśari : Mars/Jupiter/Saturn → Lune natale
  // Formule : maison de la Lune natale DEPUIS la planète (Gemini)
  // Direct delta (hors groupe LUNE) · Cap ±3 global · fail silently
  // ═══════════════════════════════════════════════════════════
  if (natalMoonSidForNak !== null) {
    try {
      const DRISHTI_PLANETS = ['mars', 'jupiter', 'saturn'] as const;
      const evalD_dr = new Date(todayStr + 'T12:00:00');
      const ay_dr    = getAyanamsa(evalD_dr.getFullYear());

      const drResults: GrahaDrishtiResult[] = [];

      for (const planet of DRISHTI_PLANETS) {
        const tropLon = getPlanetLongitudeForDate(
          planet as 'mars' | 'jupiter' | 'saturn',
          evalD_dr,
        );
        const sidLon = ((tropLon - ay_dr) % 360 + 360) % 360;
        const drRes  = calcGrahaDrishti(planet, sidLon, natalMoonSidForNak);
        if (drRes.delta !== 0) drResults.push(drRes);
      }

      if (drResults.length > 0) {
        const rawTotal  = drResults.reduce((s, r) => s + r.delta, 0);
        const drCapped  = Math.max(-3, Math.min(3, rawTotal));
        indivDrishti = drCapped; // Sprint AN — C_INDIV
        // Sprint AN — ajouté via C_INDIV (plus d'ajout direct au delta)

        drResults.forEach(r => {
          if (r.delta > 0) signals.push(r.label);
          else             alerts.push(r.label);
        });

        const activeDesc = drResults.map(r => `${r.planet} M${r.houseFromPlanet}`).join(' · ');
        const capNote    = rawTotal !== drCapped ? ` → capé ${drCapped > 0 ? '+' : ''}${drCapped}` : '';
        breakdown.push({
          system: 'Graha Drishti', icon: '🔭',
          value:  activeDesc,
          points: drCapped,
          detail: `Aspects Parāśari BPHS Ch.26 — raw ${rawTotal > 0 ? '+' : ''}${rawTotal}${capNote}`,
          signals: drResults.filter(r => r.delta > 0).map(r => r.label),
          alerts:  drResults.filter(r => r.delta < 0).map(r => r.label),
        });
      }
    } catch { /* Graha Drishti fail silently */ }
  }

  // ═══════════════════════════════════════════════════════════
  // 8d. YOGA KARTARI — Sprint M — V10.7 (post-section autonome)
  // "Yoga des ciseaux" : Lune natale encadrée par planètes transitantes
  // Bénéfiques : Jupiter, Vénus, Mercure · Maléfiques : Saturne, Mars, Soleil
  // Scoring : ±2 complet · ±1 partiel · 0 mixed/vide · Cap ±2 · fail silently
  // ═══════════════════════════════════════════════════════════
  if (natalMoonSidForNak !== null) {
    try {
      const evalD_kt = new Date(todayStr + 'T12:00:00');
      const ay_kt    = getAyanamsa(evalD_kt.getFullYear());

      const KARTARI_PLANETS = ['sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'] as const;
      const transitMap: Record<string, number> = {};
      for (const planet of KARTARI_PLANETS) {
        const tropLon = getPlanetLongitudeForDate(planet, evalD_kt);
        transitMap[planet] = ((tropLon - ay_kt) % 360 + 360) % 360;
      }

      const ktRes    = calcYogaKartari(natalMoonSidForNak, transitMap);
      if (ktRes.delta !== 0) {
        const ktCapped = Math.max(-2, Math.min(2, ktRes.delta));
        indivKartari = ktCapped; // Sprint AN — C_INDIV
        // Sprint AN — ajouté via C_INDIV (plus d'ajout direct au delta)

        if (ktRes.delta > 0) signals.push(ktRes.label);
        else                 alerts.push(ktRes.label);

        const sidesDesc = [
          ktRes.sign12Planets.length ? `12e: ${ktRes.sign12Planets.join(',')}` : '',
          ktRes.sign2Planets.length  ? `2e: ${ktRes.sign2Planets.join(',')}`   : '',
        ].filter(Boolean).join(' · ');

        breakdown.push({
          system: 'Yoga Kartari', icon: '✂️',
          value:  ktRes.shubha ? 'Shubha Kartari' : ktRes.papa ? 'Papa Kartari' : 'Kartari partiel',
          points: ktCapped,
          detail: `Lune encadrée — ${sidesDesc}`,
          signals: ktRes.delta > 0 ? [ktRes.label] : [],
          alerts:  ktRes.delta < 0 ? [ktRes.label] : [],
        });
      }
    } catch { /* Yoga Kartari fail silently */ }
  }

  // ═══════════════════════════════════
  // 9. NŒUDS LUNAIRES (annotation, pas de points)
  // ═══════════════════════════════════

  // Guard try-catch : calcNorthNodeLongitude peut retourner NaN si date invalide → crash silencieux
  let nodeTransit: ReturnType<typeof getLunarNodeTransit> | null = null;
  try { nodeTransit = getLunarNodeTransit(bd, todayStr); } catch { /* fail silently */ }
  let nodePts = 0; // V5.5 : scoring supprimé
  const nodeSignals: string[] = [];
  const nodeAlerts: string[] = [];
  if (nodeTransit) {
    switch (nodeTransit.alignment) {
      case 'conjoint': nodeSignals.push('↻ Retour des Nœuds — mission karmique'); break;
      case 'trigone':  nodeSignals.push('🌊 Trigone nodal — flux karmique'); break;
      case 'opposé':   nodeAlerts.push('⇄ Inversion nodale — tension passé/futur'); break;
      case 'carré':    nodeAlerts.push('⚔️ Carré nodal — crise de croissance'); break;
    }
    if (nodeTransit.isNodeReturn) { nodeSignals.push('⚡ Retour des Nœuds actif'); }
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

  // Sprint AO P6 — DayType Modifier : breakdown supprimé (delta=0 depuis Sprint AM)
  // calcDayType conservé (utilisé par calcMoonScore + actionReco)

  // Sprint AR P3 : trinityActive + interactionResult stubs supprimés (Ronde 11 consensus 3/3)
  const moonPhaseRaw = getMoonPhase(new Date(todayStr + 'T12:00:00')); // conservé pour moonPhaseRawPhase

  // ═══════════════════════════════════
  // 12b. HEURE PLANÉTAIRE CHALDÉENNE — V9 Sprint 4
  // Sprint D2 : retrait du scoring L1 (non-déterministe : varie chaque heure).
  // L'heure planétaire reste affichée dans le widget UI (planetaryHour → retour).
  // Aucun point injecté dans ephemGroupPts.
  // ═══════════════════════════════════

  const planetaryHour = getCurrentPlanetaryHour(new Date(todayStr + 'T12:00:00'));
  // Breakdowninformatif uniquement (pts=0) — widget UI utilise la valeur courante
  const planetaryHourNow = getCurrentPlanetaryHour();
  if (planetaryHourNow) {
    breakdown.push({
      system: 'Heure Planétaire', icon: planetaryHourNow.icon,
      value:  `${planetaryHourNow.label} ${planetaryHourNow.isDayHour ? '☀️' : '🌙'} H${planetaryHourNow.hourIndex}`,
      points: 0, // Sprint D2 : retiré du score (non-déterministe)
      detail: planetaryHourNow.keywords.join(' · '),
      signals: [],
      alerts:  [],
    });
  }

  // ═══════════════════════════════════
  // 12c. ÉTOILES FIXES — V9.6 Sprint A3
  // 10 étoiles majeures, orbes ±0.5° (exacte) / ±1.5° (large), cap ±5 (Sprint U1 — était ±8)
  // ═══════════════════════════════════

  let fixedStarResult: FixedStarResult | null = null;
  try {
    fixedStarResult = calcFixedStarScore(new Date(todayStr + 'T12:00:00'));
    if (fixedStarResult.total !== 0) {
      ephemGroupPts += Math.max(-4, Math.min(4, fixedStarResult.total)); // Sprint AM — cap ±4 (Ronde 5, était ±5)
      signals.push(...fixedStarResult.signals);
      alerts.push(...fixedStarResult.alerts);
      if (fixedStarResult.hits.length > 0) {
        breakdown.push({
          system: 'Étoiles Fixes', icon: '⭐',
          value: fixedStarResult.hits.map(h => h.star).join(' · '),
          points: fixedStarResult.total,
          detail: fixedStarResult.hits.map(h => `${h.planet} ↔ ${h.star} (${h.orb.toFixed(1)}°)`).join(' · '),
          signals: fixedStarResult.signals,
          alerts:  fixedStarResult.alerts,
        });
      }
    }
  } catch { /* fixed stars fail silently */ }

  // Sprint D4 : ASV ☉♂ retirés de L1 → migrés vers L2 (convergence-slow.ts)
  // Rythme Soleil ~30j/signe, Mars ~45j/signe → signal lent ≠ signal quotidien

  // ═══════════════════════════════════
  // 7bis. KINETIC SHOCKS — Sprint AL (Chantier 5, Sprint 2)
  // Ingress Soleil (-1) + Mars (-2) jour J + Station D↔R Mercure/Vénus/Mars (-2 + BAV×1.40)
  // Consensus 3/3 IAs Ronde 4 confrontation
  // ═══════════════════════════════════

  // ⚡ WILD CARD ARCHITECTURAL — KineticShocks ±3 (Sprint AP P6, Ronde 8 Gemini)
  // Intentionnellement HORS groupes αG et hors cap global L1 (±30).
  // Justification : impulsion de Dirac (ingress/station) qui doit contourner les caps
  // pour capturer le choc événementiel pur. Si capé dans C_EPHEM, le signal s'écrase
  // contre le plafond d'un jour saturé et disparaît. Le shadow score ne le voit pas — assumé.
  // Impact max : delta global peut atteindre ±33 (30 + 3). Le tanh(0.840×X/12) absorbe.
  let kineticShockDelta = 0;
  try {
    const ksResult = calcKineticShocks(todayStr);
    if (ksResult.totalDelta !== 0) {
      kineticShockDelta = Math.max(-3, Math.min(3, ksResult.totalDelta)); // Sprint AM — cap individuel ±3, appliqué au delta global
      for (const shock of ksResult.shocks) {
        if (shock.delta < 0) alerts.push(`⚡ ${shock.detail}`);
        else signals.push(`⚡ ${shock.detail}`);
        breakdown.push({
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

  // Sprint AO — LuneGate supprimée (Ronde 7 consensus 2/3 Grok+Gemini)
  // Multiplier EPHEM par LUNE détruit l'orthogonalité L1, double-comptage punitif
  const ephemGroupCapped = Math.max(-10, Math.min(10, ephemGroupPts));
  delta += ephemGroupCapped;

  // Sprint AM — Kinetic Shocks isolés (hors cap C_EPHEM, appliqués directement au delta global)
  delta += kineticShockDelta;

  // Sprint AN — C_INDIV cap ±8 (Ronde 6 P2 : individuels groupés)
  // I Ching ±3 + Tithi Lord ±1 + Graha Drishti ±3 + Yoga Kartari ±2 = ±9 théorique → cap ±8
  const indivGroupPts = ichingCapped + indivTLG + indivDrishti + indivKartari;
  const indivGroupCapped = Math.max(-8, Math.min(8, indivGroupPts));
  delta += indivGroupCapped;

  // Sprint AO — biasCorrection supprimée (Ronde 7 consensus 2/3 Grok+Gemini)
  // VoC est déjà dans C_LUNE, sa pénalité fait partie du signal légitime
  // retroPts était fantôme (déconnecté V6.2), compensait un signal absent → bug

  // V9.6 Sprint A2 — Cap global L1 ±30 (C_L1 anti double-comptage)
  const dailyDeltaSnapshot = Math.max(-30, Math.min(30, delta));

  // ══════════════════════════════════════════════
  // RETOUR — toutes les valeurs nécessaires à L2 + L3
  // ══════════════════════════════════════════════
  return {
    dailyDeltaSnapshot,
    dayType,
    moonResult,
    moonTr,
    nodeTransit,
    baziResult,
    tenGodsResult,
    shenShaResult,
    profectionResult,
    nakshatraData,
    directDomainBonuses,
    mercPts,
    vocResult,
    pyPts,
    pmPts,
    pinnPts,
    pyv,
    moonPhaseRawPhase: moonPhaseRaw.phase,
    _transitBreakdown,
    planetaryHour: planetaryHourNow ?? null,  // V9 Sprint 4
    // Z2-B — observabilité groupes (Ronde Z consensus 3/3 Option B)
    baziGroupDelta:  baziFamilyTotal,
    luneGroupDelta:  luneGroupCapped,
    ephemGroupDelta: ephemGroupCapped,
    indivGroupDelta: indivGroupCapped, // Sprint AN — C_INDIV observabilité
  };
}
