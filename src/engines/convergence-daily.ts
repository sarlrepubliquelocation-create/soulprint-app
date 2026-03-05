// ══════════════════════════════════════
// ═══ CONVERGENCE DAILY — L1 — V8.0 ═══
// Step 5 split : modules quotidiens de calcConvergence
// Contient : helpers (calcDayType, ichingScoreV4, calcMoonScore, getNaYinAffinityFactor)
//           + calcDailyModules() — L1 pass-by-reference Option A
// Ne contient PAS les modules lents (L2) ni l'assemblage final (L3)
// ══════════════════════════════════════

import { type NumerologyProfile, getNumberInfo, isMaster, getActivePinnacleIdx } from './numerology';
import { type AstroChart, PLANET_FR, SIGN_FR, calcPersonalTransits, getPlanetLongitudeForDate } from './astrology';
import { type IChingReading, getHexTier } from './iching';
import { getMoonPhase, getLunarEvents, getMoonTransit, getMercuryStatus, getLunarNodeTransit, type LunarNodeTransit, getPlanetaryRetroScore, getVoidOfCourseMoon, type VoidOfCourseMoon } from './moon';
import { calcBaZiDaily, calc10Gods, calcDayMaster, getMonthPillar, type DayMasterDailyResult, type TenGodsResult, getPeachBlossom, getChangsheng, checkShenSha, getNaYin, getElementRelation, type ChangshengResult, type ShenShaResult, type NaYinResult } from './bazi';
import { calcInteractions, buildInteractionContext, type InteractionResult } from './interactions';
import { calcProfection, getDomainScore, type ProfectionResult } from './profections';
import { getAyanamsa, calcNakshatraComposite, type NakshatraData, getPada, PADA_MULTIPLIERS, PADA_NAMES } from './nakshatras';
import { getActiveLineScore, getNuclearScore } from './iching-yao';
import { type SystemBreakdown, type LifeDomain, type DayType, type DayTypeInfo, SLOW_PLANETS } from './convergence.types';
import { getCurrentPlanetaryHour, type PlanetaryHour } from './planetary-hours'; // V9 Sprint 4
import { calcFixedStarScore, type FixedStarResult } from './fixed-stars'; // V9.6 Sprint A3
import { calcAshtakavarga } from './ashtakavarga'; // V9.6 Sprint C
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
  nodeTransit: LunarNodeTransit;
  baziResult: DayMasterDailyResult | null;
  tenGodsResult: TenGodsResult | null;
  changshengResult: ChangshengResult | null;
  shenShaResult: ShenShaResult | null;
  trinityActive: boolean;
  interactionResult: InteractionResult;
  profectionResult: ProfectionResult | undefined;
  nakshatraData: NakshatraData | undefined;
  directDomainBonuses: Partial<Record<LifeDomain, number>>;
  mercPts: number;
  vocResult: VoidOfCourseMoon | null;
  // Needed for temporalConfidence in L3
  pyPts: number;
  pmPts: number;
  pinnPts: number;
  numTotal: number;
  // Needed for v6Ctx in L2 + calculateContextualScores in L3
  pyv: number;
  moonPhaseRawPhase: number;  // moonPhaseRaw.phase
  // Needed for R21/R27 scoring in L2
  _transitBreakdown: Array<{ transitPlanet: string; score: number; aspectType?: string }>;
  planetaryHour: PlanetaryHour | null; // V9 Sprint 4 — heure planétaire chaldéenne courante
}

// ══════════════════════════════════════
// ═══ HELPERS EXPORTÉS ═══
// (utilisés aussi par calcDayPreview dans convergence.ts)
// ══════════════════════════════════════

// ── Helper lissage Na Yin par affinité DM natal (V4.4c — recommandation Grok) ──
export function getNaYinAffinityFactor(natalElement: string | null, naYinElement: string): number {
  if (!natalElement) return 1.0;
  try {
    const rel = getElementRelation(natalElement as any, naYinElement as any);
    const MAP: Record<string, number> = { same: 1.4, produces: 1.0, produced_by: 1.0, destroys: 0.6, destroyed_by: 0.7 };
    return MAP[rel] ?? 1.0;
  } catch { return 1.0; }
}

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
  const d = new Date(targetDate + 'T12:00:00');
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

  // V8 : PD narratif + onboarding commercial (R25 GPT — redondant BaZi, valeur acquisition)
  // numTotal=0 → non ajouté au delta. pdPts conservé pour breakdown display uniquement.
  const numTotal = 0;
  // delta += numTotal; // SUPPRIMÉ V8

  // ── V4.7: Signal dette karmique ──
  if ((num as any).hasKarmicDebt && (num as any).karmicDebt) {
    const kd = (num as any).karmicDebt as number;
    const kdMsg = kd === 13 ? 'effort & discipline' : kd === 14 ? 'liberté & excès' : kd === 16 ? 'ego & humilité' : 'puissance & abus';
    numSignals.push(`⚖️ Dette karmique ${kd} active — ${kdMsg}`);
    signals.push(`⚖️ Dette karmique ${kd} — ${kdMsg}`);
  }

  signals.push(...numSignals);
  alerts.push(...numAlerts);
  breakdown.push({
    system: 'Numérologie', icon: '✦',
    value: `PD ${pdv} ${pdInfo.k}`,
    points: 0, // V8 : narratif — pdPts affiché mais zéro delta (R25)
    detail: numDetail.length > 0 ? numDetail.join(' · ') : 'Aucune résonance',
    signals: numSignals, alerts: numAlerts,
  });

  // ═══════════════════════════════════
  // 2. BaZi FAMILLE (±18 groupé) — V4.4b
  // ═══════════════════════════════════

  let baziResult: DayMasterDailyResult | null = null;
  let tenGodsResult: TenGodsResult | null = null;
  let baziDMPts = 0;
  let tenGodsPts = 0;
  const baziSignals: string[] = [];
  const baziAlerts: string[] = [];

  const birthDate = new Date(bd + 'T12:00:00');
  const todayDate = new Date(todayStr + 'T12:00:00');

  try {

    baziResult = calcBaZiDaily(birthDate, todayDate, 50);
    baziDMPts = Math.max(-6, Math.min(6, Math.round(baziResult.totalScore * 2)));
    if (baziDMPts > 0) {
      baziSignals.push(`${baziResult.dailyStem.archetype} → ${baziResult.relation === 'produced_by' ? 'soutien' : 'harmonie'}`);
    } else if (baziDMPts < 0) {
      baziAlerts.push(`${baziResult.dailyStem.archetype} → ${baziResult.relation === 'destroyed_by' ? 'pression' : 'friction'}`);
    }

    tenGodsResult = calc10Gods(birthDate, todayDate);
    tenGodsPts = Math.max(-6, Math.min(6, tenGodsResult.totalScore));
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

  const baziCorePts = baziDMPts + tenGodsPts;

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

  // ═══════════════════════════════════
  // 2b. CHANGSHENG 十二長生 (±4 global) — V4.3
  // ═══════════════════════════════════

  let changshengResult: ChangshengResult | null = null;
  let changshengPts = 0;
  try {
    const csBirthDate = new Date(bd + 'T12:00:00');
    const csTodayDate = new Date(todayStr + 'T12:00:00');
    changshengResult = getChangsheng(csBirthDate, csTodayDate);
    changshengPts = 0; // V6.2: neutralisé (texture, redondant avec DM — R16)
    if (changshengPts > 0) signals.push(`${changshengResult.scoring.chinese} ${changshengResult.phase} → ${changshengResult.scoring.label_fr.split('—')[0].trim()}`);
    if (changshengPts < 0) alerts.push(`${changshengResult.scoring.chinese} ${changshengResult.phase} → ${changshengResult.scoring.label_fr.split('—')[0].trim()}`);
    breakdown.push({
      system: 'Changsheng', icon: '♻',
      value: `${changshengResult.scoring.chinese} ${changshengResult.phase}`,
      points: changshengPts,
      detail: changshengResult.scoring.label_fr,
      signals: changshengPts > 0 ? [`${changshengResult.scoring.chinese} → phase ascendante`] : [],
      alerts: changshengPts < 0 ? [`${changshengResult.scoring.chinese} → phase descendante`] : [],
    });
  } catch { /* Changsheng fail silently */ }

  // ═══════════════════════════════════
  // 2c. SHEN SHA 神煞 (0-4 global) — V4.3
  // ═══════════════════════════════════

  let shenShaResult: ShenShaResult | null = null;
  let shenShaPts = 0;
  try {
    const ssBirthDate = new Date(bd + 'T12:00:00');
    const ssTodayDate = new Date(todayStr + 'T12:00:00');
    shenShaResult = checkShenSha(ssBirthDate, ssTodayDate);
    shenShaPts = 0; // V8 : narratif BaZi enrichi (R25 — redondant, valeur visuelle uniquement)
    for (const star of shenShaResult.active) {
      signals.push(`${star.chinese} ${star.label_fr}`);
    }
    if (shenShaResult.active.length > 0) {
      breakdown.push({
        system: 'Shen Sha', icon: '⭐',
        value: shenShaResult.active.map(s => s.chinese).join(' '),
        points: shenShaPts,
        detail: shenShaResult.active.map(s => s.label_fr).join(' · '),
        signals: shenShaResult.active.map(s => `${s.chinese} → ${s.label_fr.split('—')[0].trim()}`),
        alerts: [],
      });
    }
  } catch { /* Shen Sha fail silently */ }

  // ═══════════════════════════════════
  // 2c-bis. NA YIN 纳音 (±1 lissé) — V4.4
  // ═══════════════════════════════════

  let naYinPts = 0;
  let naYinResult: NaYinResult | null = null;
  try {
    naYinResult = getNaYin(new Date(todayStr + 'T12:00:00'));
    const cat = naYinResult.entry.category;
    const natalEl = baziResult?.natalStem?.element ?? null;
    const rawNY = (cat === 'puissant' || cat === 'transformateur') ? 1 : cat === 'subtil' ? -1 : 0;
    if (rawNY !== 0) {
      const affinity = getNaYinAffinityFactor(natalEl, naYinResult.entry.element);
      naYinPts = 0; // V6.2: neutralisé (symbolisme poétique — R15/R16)
    }
    if (false && naYinResult) { // signals NaYin supprimés V6.2
      breakdown.push({
        system: 'Na Yin', icon: '纳',
        value: naYinResult!.entry.name_fr,
        points: naYinPts,
        detail: `${naYinResult!.entry.name_cn} — ${naYinResult!.entry.description}`,
        signals: naYinPts > 0 ? [naYinResult!.advice] : [],
        alerts: naYinPts < 0 ? [naYinResult!.advice] : [],
      });
    }
  } catch { /* Na Yin fail silently */ }

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
    // V8.9 GPT Q1 : debias espérance +5/12 (ratio 6pos/3neu/3neg → E=+0.42) → centrage à 0
    jianchuPts          = jianchuRaw - (5 / 12);
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

  const baziFamilyTotal = Math.max(-15, Math.min(15, baziCorePts + changshengPts + jianchuPts)); // V9.6 Sprint A2: C_BAZI ±15 (était ±22)
  delta += baziFamilyTotal;

  // Direct domain bonuses (Changsheng + Shen Sha per-domain)
  const directDomainBonuses: Partial<Record<LifeDomain, number>> = {};
  if (changshengResult) {
    const cs = changshengResult.scoring;
    directDomainBonuses.VITALITE = (directDomainBonuses.VITALITE || 0) + (cs.vitalite - cs.global);
    directDomainBonuses.BUSINESS = (directDomainBonuses.BUSINESS || 0) + (cs.business - cs.global);
  }
  if (shenShaResult && shenShaResult.active.length > 0) {
    directDomainBonuses.BUSINESS      = (directDomainBonuses.BUSINESS      || 0) + shenShaResult.totalBusiness;
    directDomainBonuses.AMOUR         = (directDomainBonuses.AMOUR         || 0) + shenShaResult.totalAmour;
    directDomainBonuses.CREATIVITE    = (directDomainBonuses.CREATIVITE    || 0) + shenShaResult.totalCreativite;
    directDomainBonuses.VITALITE      = (directDomainBonuses.VITALITE      || 0) + shenShaResult.totalVitalite;
    directDomainBonuses.INTROSPECTION = (directDomainBonuses.INTROSPECTION || 0) + shenShaResult.totalIntrospection;
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
  const ichingCapped = Math.round(6 * Math.tanh(ichRes.pts / 6)); // Sprint U2 — tanh ±6 (soft-clamp)
  if (ichingCapped !== 0) delta += ichingCapped;

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
      try {
        const tarabalaRes    = calcTarabala(moonLongSidereal, natalMoonSidForNak);
        const chandrabalaRes = calcChandrabala(moonLongSidereal, natalMoonSidForNak);

        // Sprint P — combinedBala remplace addition pure (double-comptage géométrique base27 vs base12)
        const combinedBalaVal = combinedBala(tarabalaRes.delta, chandrabalaRes.delta);
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
    }

    // ── R31 : Cohérence lunaire Nakshatra × Phase (V8 — Synth. védique) ──
    // Doctrine Jyotish : L'effet du Nakshatra est amplifié si la Lune est croissante sur un Nakshatra
    // harmonique (Chandra Bala renforcé), et atténué si elle est décroissante sur un Nakshatra maléfique.
    // Lune croissante = phases 1-4 (Nouvelle → Pleine), décroissante = phases 5-7 (Pleine → Nouvelle).
    // moonPhaseRaw.phase : 0=New, 1-3=croissant, 4=Full, 5-7=décroissant
    try {
      const moonPhaseForR31 = getMoonPhase(new Date(todayStr + 'T12:00:00'));
      const phaseIdx = moonPhaseForR31.phase ?? -1;
      const nakQuality = nakshatraData?.globalBaseScore ?? 0;
      const isWaxing = phaseIdx >= 1 && phaseIdx <= 3;   // croissante (hors nouvelle lune = phase 0)
      const isWaning = phaseIdx >= 5 && phaseIdx <= 7;   // décroissante
      let r31Pts = 0;
      if (isWaxing && nakQuality > 0) {
        // Amplification : Nakshatra harmonique + Lune montante → cap étendu de ±7 à ±8
        r31Pts = 1;
        signals.push(`🌒 R31 Cohérence lunaire — Lune croissante sur Nakshatra harmonique (+1)`);
      } else if (isWaning && nakQuality < 0) {
        // Atténuation : Nakshatra maléfique + Lune décroissante → ×0.8 du score Nakshatra
        // Implémentation additive : réduire légèrement l'impact total (pas de multiplication directe)
        r31Pts = -1;
        alerts.push(`🌘 R31 Cohérence lunaire — Lune décroissante amplifie Nakshatra maléfique (-1)`);
      } else if (isWaxing && nakQuality < 0) {
        // Contrebalancement partiel : Lune montante atténue le Nakshatra négatif
        r31Pts = 1;
        signals.push(`🌒 R31 Cohérence lunaire — Lune croissante contrebalance Nakshatra maléfique (+1)`);
      }
      if (r31Pts !== 0) luneGroupPts += r31Pts; // Sprint A2: groupe LUNE
    } catch { /* R31 fail silently */ }

    // ── Sprint K : Nakshatra Pada (groupe LUNE) ──
    // Pada = quart de Nakshatra (3.333°) · Purusharthas (Dharma/Artha/Kama/Moksha)
    // Delta = globalBaseScore × (padaMult − 1.0) : affine le score nakshatra sans surpondérer
    // Si globalBaseScore = 0 (nakshatra neutre) → padaDelta = 0 (aucun effet)
    if (nakshatraData) {
      try {
        const padaIdx   = getPada(moonLongSidereal);
        const padaMult  = PADA_MULTIPLIERS[padaIdx];
        const padaName  = PADA_NAMES[padaIdx];
        const rawDelta  = nakshatraData.globalBaseScore * (padaMult - 1.0);
        const padaDelta = Math.max(-1, Math.min(1, rawDelta));
        if (padaDelta !== 0) {
          luneGroupPts += padaDelta;
          const sign  = padaDelta > 0 ? '+' : '';
          const label = `🌟 Pada ${padaIdx + 1} ${padaName} — ${nakshatraData.name} (${sign}${padaDelta.toFixed(2)})`;
          if (padaDelta > 0) signals.push(label);
          else               alerts.push(label);
          breakdown.push({
            system: 'Nakshatra Pada', icon: '🪐',
            value:  `Pada ${padaIdx + 1} — ${padaName}`,
            points: padaDelta,
            detail: `${nakshatraData.name} Pada ${padaIdx + 1} (×${padaMult}) — Purushartha`,
            signals: padaDelta > 0 ? [label] : [],
            alerts:  padaDelta < 0 ? [label] : [],
          });
        }
      } catch { /* Pada fail silently */ }
    }

  } catch { /* nakshatras fail silently */ }

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
  // 4d. ASHTAKAVARGA LUNAIRE — V9.6 Sprint C
  // BAV Lune natale → Bindus dans le signe sidéral transitant → delta ±2
  // ═══════════════════════════════════

  if (astro) {
    try {
      const todayD       = new Date(todayStr + 'T12:00:00Z');
      const moonTropLon  = getMoonPhase(todayD).longitudeTropical;
      const ayToday      = getAyanamsa(todayD.getFullYear());
      const moonSidLon   = ((moonTropLon - ayToday) + 360) % 360;
      const ashMoon      = calcAshtakavarga('moon', moonSidLon, astro, bd);
      if (ashMoon.delta !== 0) {
        luneGroupPts += ashMoon.delta; // Sprint C: groupe LUNE
        signals.push(...ashMoon.signals);
        alerts.push(...ashMoon.alerts);
        breakdown.push({
          system: 'Ashtakavarga ☽', icon: '⭕',
          value:  `${ashMoon.signName} — ${ashMoon.bindus} Bindus`,
          points: ashMoon.delta,
          detail: `Lune sidérale en ${ashMoon.signName} | BAV Lune natale`,
          signals: ashMoon.signals, alerts: ashMoon.alerts,
        });
      }
    } catch { /* Ashtak Moon fail silently */ }
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

  // Sprint G — Application cap groupe LUNE ±16 (Nakshatra + R31 + VoC + Ash☽ + Panchanga + Karana + Tarabala + Chandrabala)
  // Cap élargi de ±14 → ±16 : +Tarabala(±3) +Chandrabala(±3), Ronde 11 consensus 2/3
  const luneGroupCapped = Math.max(-16, Math.min(16, luneGroupPts)); // Sprint P — hoissé pour LuneGate
  delta += luneGroupCapped;

  // ═══════════════════════════════════
  // 7. RÉTROGRADES PLANÉTAIRES (-3 à 0)
  // ═══════════════════════════════════

  const planetRetro = getPlanetaryRetroScore(new Date(todayStr + 'T12:00:00'));
  const retroPts = Math.max(-3, planetRetro.totalPts); // V6.2: narratif uniquement
  if (false && retroPts !== 0) { // déconnecté V6.2 (biais asymétrique — R16)
    const prAlerts: string[] = [];
    for (const r of planetRetro.retros) {
      prAlerts.push(`${r.label} (${r.daysLeft ? `fin ${r.daysLeft}j` : 'actif'})`);
    }
    alerts.push(...prAlerts);
    breakdown.push({
      system: 'Planètes', icon: '🪐',
      value: planetRetro.retros.map(r => r.label.split(' ')[1]).join('+') || 'Directes',
      points: retroPts,
      detail: planetRetro.detail,
      signals: [], alerts: prAlerts,
    });
  }

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
        const tlgDelta  = Math.max(-2, Math.min(2, tlgRes.delta));
        if (tlgDelta !== 0) {
          delta += tlgDelta;
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
        delta += drCapped;

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
        delta += ktCapped;

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

  const nodeTransit = getLunarNodeTransit(bd, todayStr);
  let nodePts = 0; // V5.5 : scoring supprimé
  const nodeSignals: string[] = [];
  const nodeAlerts: string[] = [];
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

  // ═══════════════════════════════════
  // 10. DAY TYPE MODIFIER
  // ═══════════════════════════════════

  const DAY_TYPE_MOD: Record<DayType, number> = {
    expansion: 2, decision: 1, communication: 1, observation: -1, retrait: -2
  };
  const dtPts = DAY_TYPE_MOD[dayType.type] || 0;
  breakdown.push({
    system: 'Type de Jour', icon: dayType.icon,
    value: dayType.label,
    points: dtPts,
    detail: dayType.desc,
    signals: [], alerts: [],
  });

  // ═══════════════════════════════════
  // 11. TRINITY — SUPPRIMÉ V8 (R25 GPT : synthèse moderne sans tradition)
  // trinityActive=false, trinityBonus=0 conservés pour interface DailyModuleResult
  // ═══════════════════════════════════

  const trinityActive = false;
  const trinityBonus = 0;

  // ═══════════════════════════════════
  // 12. INTERACTIONS CROSS-SYSTÈMES — V8 (règles BaZi-centriques uniquement)
  // hexNum=-1 → règles I Ching désactivées (narratif V8)
  // moonPhaseIdx=-1 → règles Lune désactivées (narratif V8)
  // mercuryRetro=false → règles Mercure désactivées (narratif V8)
  // cap ±6 (V7 : ±8→±6 après suppression R10/R21/R28/R30)
  // ═══════════════════════════════════

  const moonPhaseRaw = getMoonPhase(new Date(todayStr + 'T12:00:00'));
  const interactionCtx = buildInteractionContext({
    changshengPhase: changshengResult?.phase ?? null,
    tenGodDominant: tenGodsResult?.dominant?.label ?? null,
    dmIsYang: baziResult?.natalStem?.yinYang === 'Yang',
    dmElement: baziResult?.natalStem?.element ?? null,
    peachBlossomActive,
    shenShaActive: shenShaResult?.active ?? [],
    hexNum: -1,          // V8 : I Ching narratif → règles IChing désactivées
    hexLower: iching.lower, // R28 : trigramme inférieur passé séparément (élément structurel)
    personalDay: pdv,
    personalYear: pyv,
    personalMonth: pmv,
    moonPhaseIdx: -1,    // V8 : Lune narrative → règles Lune désactivées
    isVoC: vocResult?.isVoC ?? false,
    mercuryRetro: false, // V8 : Mercure narratif → règles Mercure désactivées
    jupiterPositive: astroPts > 0,
    trinityBonus: 0,     // V8 : Trinity supprimé
  });

  const interactionResult = calcInteractions(interactionCtx);
  if (interactionResult.totalBonus !== 0) {
    const clampedBonus = Math.max(-6, Math.min(6, interactionResult.totalBonus)); // V7→V8: cap ±6
    ephemGroupPts += clampedBonus; // Sprint A2: groupe EPHEM
    console.assert(Math.abs(clampedBonus) <= 6.1, '[Interactions] Cap ±6 percé:', clampedBonus);
    for (const ia of interactionResult.active) {
      const sign = ia.bonus > 0 ? '+' : '';
      if (ia.bonus > 0) signals.push(`✨ ${ia.label} (${sign}${ia.bonus})`);
      else alerts.push(`⚠️ ${ia.label} (${ia.bonus})`);
    }
    breakdown.push({
      system: 'Synergies', icon: '⚡',
      value: `${interactionResult.active.length} interaction${interactionResult.active.length > 1 ? 's' : ''}`,
      points: clampedBonus,
      detail: interactionResult.active.map(a => a.label.split('→')[0].trim()).join(' · '),
      signals: interactionResult.active.filter(a => a.bonus > 0).map(a => `${a.label} (+${a.bonus})`),
      alerts:  interactionResult.active.filter(a => a.bonus < 0).map(a => `${a.label} (${a.bonus})`),
    });
  }

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
      ephemGroupPts += Math.max(-5, Math.min(5, fixedStarResult.total)); // Sprint U1 — cap ±5
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
  // Le cap ephemGroupPts ±14 reste inchangé (étoiles fixes + heure planétaire UI)

  // Sprint D4 : Application cap groupe EPHEM ±14 (sans ASV ☉♂)
  // Sprint P — LuneGate × Ephem (seuil ±7, consensus GPT/Gemini Ronde 14)
  // ΔLUNE fort positif → légère amplification Ephem (+6%) : signal favorable = transit plus exploitable
  // ΔLUNE fort négatif → légère atténuation Ephem (-8%) : signal lunaire mauvais = transit moins porteur
  const luneGate = luneGroupCapped >= 7 ? 1.06 : luneGroupCapped <= -7 ? 0.92 : 1.00;
  ephemGroupPts = Math.round(ephemGroupPts * luneGate);
  delta += Math.max(-14, Math.min(14, ephemGroupPts));

  // ═══════════════════════════════════
  // 13. BIAIS CONDITIONNEL — V4.4
  // ═══════════════════════════════════

  // V8 : biais conditionnel — mercPts retiré (narratif), VoC seul reste actif
  // mercPts exclu : non dans le delta V8, ne doit pas générer de compensation
  const negAsymmetric = (vocResult?.isVoC ? (vocResult.intensity === 'forte' ? -2 : -1) : 0) + retroPts;
  const biasCorrection = negAsymmetric < 0 ? Math.min(4, Math.abs(negAsymmetric) * 0.5) : 0;
  delta += biasCorrection;

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
    changshengResult,
    shenShaResult,
    trinityActive,
    interactionResult,
    profectionResult,
    nakshatraData,
    directDomainBonuses,
    mercPts,
    vocResult,
    pyPts,
    pmPts,
    pinnPts,
    numTotal,
    pyv,
    moonPhaseRawPhase: moonPhaseRaw.phase,
    _transitBreakdown,
    planetaryHour: planetaryHourNow ?? null,  // V9 Sprint 4
  };
}
