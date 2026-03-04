// ══════════════════════════════════════
// ═══ CONVERGENCE DAILY — L1 — V8.0 ═══
// Step 5 split : modules quotidiens de calcConvergence
// Contient : helpers (calcDayType, ichingScoreV4, calcMoonScore, getNaYinAffinityFactor)
//           + calcDailyModules() — L1 pass-by-reference Option A
// Ne contient PAS les modules lents (L2) ni l'assemblage final (L3)
// ══════════════════════════════════════

import { type NumerologyProfile, getNumberInfo, isMaster, getActivePinnacleIdx } from './numerology';
import { type AstroChart, PLANET_FR, SIGN_FR, calcPersonalTransits } from './astrology';
import { type IChingReading, getHexTier } from './iching';
import { getMoonPhase, getLunarEvents, getMoonTransit, getMercuryStatus, getLunarNodeTransit, type LunarNodeTransit, getPlanetaryRetroScore, getVoidOfCourseMoon, type VoidOfCourseMoon } from './moon';
import { calcBaZiDaily, calc10Gods, calcDayMaster, getMonthPillar, type DayMasterDailyResult, type TenGodsResult, getPeachBlossom, getChangsheng, checkShenSha, getNaYin, getElementRelation, type ChangshengResult, type ShenShaResult, type NaYinResult } from './bazi';
import { calcInteractions, buildInteractionContext, type InteractionResult } from './interactions';
import { calcProfection, getDomainScore, type ProfectionResult } from './profections';
import { getAyanamsa, calcNakshatraComposite, type NakshatraData } from './nakshatras';
import { getActiveLineScore, getNuclearScore } from './iching-yao';
import { type SystemBreakdown, type LifeDomain, type DayType, type DayTypeInfo, SLOW_PLANETS } from './convergence.types';
import { getCurrentPlanetaryHour, type PlanetaryHour } from './planetary-hours'; // V9 Sprint 4

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
  // ichRes calculé pour display, interactions et calcDayType. NON ajouté au delta.
  // ═══════════════════════════════════

  const ichRes = ichingScoreV4(iching.hexNum, iching.changing);
  // delta += ichRes.pts; // SUPPRIMÉ V8 — outil oraculaire, pas calendaire

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
  try {
    const todayD = new Date(todayStr + 'T12:00:00Z');
    const moonPhaseForNak = getMoonPhase(todayD);
    const currentYear = todayD.getFullYear();
    const ayanamsa = getAyanamsa(currentYear);
    const moonLongSidereal = ((moonPhaseForNak.longitudeTropical - ayanamsa) % 360 + 360) % 360;

    let natalMoonSidForNak: number | null = null;
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

  // V9.6 Sprint A2 — Application cap groupe LUNE ±11
  delta += Math.max(-11, Math.min(11, luneGroupPts));

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
  if (astro && astro.tr.length) {
    const personalTransits = calcPersonalTransits(astro.tr, 1.2, astro.as, astro.pl, astro.stelliums); // V8.4 : stelliums
    _transitBreakdown = personalTransits.breakdown as typeof _transitBreakdown;
    astroPts = Math.max(-6, Math.min(6, Math.round(personalTransits.total))); // V6.2: cap ±6 (était sans cap — source du -12)
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
  // Heure courante → planète gouvernante → ±pts injectés en L1.
  // Heures inégales (Spencer sunrise), latitude estimée depuis tz navigateur.
  // ═══════════════════════════════════

  const planetaryHour = getCurrentPlanetaryHour(new Date(todayStr + 'T12:00:00'));
  // Note : on utilise midi local comme proxy pour "le jour" (l'UI affiche l'heure réelle).
  // Pour le scoring on prend l'heure planétaire au moment réel du calcul :
  const planetaryHourNow = getCurrentPlanetaryHour();
  if (planetaryHourNow) {
    const phPts = planetaryHourNow.pts;
    if (phPts !== 0) {
      ephemGroupPts += phPts; // Sprint A2: groupe EPHEM
      const sign = phPts > 0 ? '+' : '';
      if (phPts > 0) signals.push(`${planetaryHourNow.icon} Heure ${planetaryHourNow.label} — ${planetaryHourNow.keywords[0]} (${sign}${phPts})`);
      else           alerts.push(`${planetaryHourNow.icon} Heure ${planetaryHourNow.label} — ${planetaryHourNow.keywords[0]} (${sign}${phPts})`);
    }
    breakdown.push({
      system: 'Heure Planétaire', icon: planetaryHourNow.icon,
      value:  `${planetaryHourNow.label} ${planetaryHourNow.isDayHour ? '☀️' : '🌙'} H${planetaryHourNow.hourIndex}`,
      points: planetaryHourNow.pts,
      detail: planetaryHourNow.keywords.join(' · '),
      signals: phPts > 0 ? [`${planetaryHourNow.icon} ${planetaryHourNow.label} — ${planetaryHourNow.keywords.join(', ')}`] : [],
      alerts:  phPts < 0 ? [`${planetaryHourNow.icon} ${planetaryHourNow.label} — ${planetaryHourNow.keywords.join(', ')}`] : [],
    });
  }

  // V9.6 Sprint A2 — Application cap groupe EPHEM ±12
  delta += Math.max(-12, Math.min(12, ephemGroupPts));

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
