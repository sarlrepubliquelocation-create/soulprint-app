// ═══ STRATEGIC READING ENGINE V4.2 ═══
// Croise 17+ systèmes pour générer une lecture Passé / Présent / Futur
// V4.2: Luck Pillars × Pinnacles croisés, Forecast 6 mois injecté dans Futur,
//       confiance temporelle, biais domaines PY/PM.
// V4.1: +5 contradictions (Gemini R8), pool micro-détails élargi (12 max).
// V3.2: 25 nouveaux micro-détails (#42-66) exploitant 10 Gods, Essences, Confiance, Meta-Score.
//       Injection 4 nouveaux patterns V3.2 (void_course, resonance_leap, phantom_loop, systemic_burnout).
// V3.1: 2 nouveaux détecteurs (Éclipse Karmique + BaZi Cycle Master),
//       injection patterns V3.1 dans Past/Present/Future, signatures Grok.
// V3.0: Pattern Detection Engine — cycle mirrors, karmic echoes, predictive convergences,
//       element convergence, life rhythm archetype, pinnacle×PY resonance.
//       Injection automatique des patterns dans Past/Present/Future + micro-détails.
// V2.9.1: 10 contradictions inter-systèmes, rainbow rocking narratif (3 rounds audit Grok+GPT+Gemini)
// V2.9: 35 micro-détails (15 nouvelles: Chaldéen, Nœuds, Mercure shadow, tripartites), max 6. 25 templates narration (10 nouveaux 4+ systèmes)
// V2.8: Micro-détails classés en 3 tiers fiabilité (cycle > resonance > suggestif), 5 max
// V2.7: Intègre rank Monte Carlo dans verdict + majorWindow (narration empirique)
// V2.6: Fenêtre Majeure (narration spéciale ≥75%), Micro-détails IF→THEN (20 formules cold reading)
// V2.5: Narration corrélative (templates 3+ systèmes), rareté dans verdict, Nœuds Lunaires
// V1: Portrait "10 phrases wow" via Life Timeline Engine
// Chaque conclusion cite ses sources (quels systèmes convergent)
// Zéro API, zéro IA — pure logique de croisement

import { type NumerologyProfile, getNumberInfo, getActivePinnacleIdx, calcPersonalYear, KARMIC_MEANINGS } from './numerology';
import { type AstroChart, SIGN_FR, PLANET_FR, SIGN_ELEM, ASPECT_SYM } from './astrology';
import { type ChineseZodiac } from './chinese-zodiac';
import { type IChingReading, calcNatalIChing, getHexProfile, getHexTier, calcNuclearHex } from './iching';
import { type ConvergenceResult, type RarityResult, type ConfidenceResult, type MetaScore, type TemporalConfidence, type MonthForecast, type VoidOfCourseMoon, generateForecast36Months } from './convergence';
import { getMoonPhase, getMercuryStatus, calcLunarNodes, getLunarNodeTransit, type LunarNodeTransit, getEclipseList, getVoidOfCourseMoon } from './moon';
import { generateLifeTimeline, type LifeTimeline } from './life-timeline';
import { getSouthNode, generateKarmicMission, detectKarmicTension, getKarmicLessons } from './karmic-mission';
import { PY_TRANSITIONS, ECLIPSE_CONTEXTS, WOW_MOMENTS, NUCLEAR_INTERPRETATIONS } from './temporal';
import { detectPatterns, type PatternDetectionResult, type Pattern } from './pattern-detection';
import { calc10Gods, type TenGodsResult, calculateLuckPillars, getLuckPillarNarrative, calcFourPillars, type FourPillars } from './bazi';

// ── Types ──

export interface ReadingInsight {
  text: string;
  sources: string[];  // ex: ['Numérologie', 'Astrologie', 'Yi King']
  intensity: 'forte' | 'moyenne' | 'subtile';
  icon: string;
}

export interface ReadingBlock {
  title: string;
  period: string;
  insights: ReadingInsight[];
  summary: string;
}

export interface Crossing {
  theme: string;
  description: string;
  systems: string[];
  strength: number;  // 3-8 (nombre de systèmes qui convergent)
  icon: string;
}

// V2.9.1: Contradiction inter-systèmes (audit Grok R2+R3)
export interface Contradiction {
  type: string;
  description: string;
  conseil: string;
}

export interface StrategicReading {
  past: ReadingBlock;
  present: ReadingBlock;
  future: ReadingBlock;
  crossings: Crossing[];
  actionPlan: ActionItem[];
  portrait: string;        // Portrait identitaire multi-lignes
  todayVerdict: string;    // Verdict du jour en 1 phrase
  timeline: LifeTimeline;  // Timeline de vie par périodes (Life Timeline Engine)
  majorWindow: MajorWindow | null;  // V2.5: Fenêtre Majeure (quand score ≥75 ET 5+ systèmes)
  microDetails: MicroDetail[];      // V2.5: Micro-détails "c'est exactement moi"
  contradictions: Contradiction[];  // V2.9.1: Tensions inter-systèmes
  patterns: PatternDetectionResult; // V3.0: Pattern Detection Engine (cycles, échos, prédictions)
}

// V2.5: Fenêtre Majeure — narration spéciale quand convergence ≥75%
export interface MajorWindow {
  title: string;
  narrative: string;      // Narration multi-systèmes percutante
  systems: string[];      // Systèmes qui convergent
  strength: number;       // Nombre de systèmes positifs
  rarity: string;         // Label de rareté
  actions: string[];      // 2-3 actions spécifiques à cette fenêtre
  icon: string;
}

// V2.5: Micro-détails plausibles (cold reading algorithmique)
export interface MicroDetail {
  text: string;
  sources: string[];
  // V2.8: 3 tiers de fiabilité (audit GPT: "classer par fiabilité, cycles > jours de semaine")
  // 'cycle' = cycles universels (Saturne, Pinnacles, Nœuds) — le plus fiable
  // 'resonance' = croisement multi-systèmes (PD×Core, PY×PD) — fiable
  // 'suggestif' = signaux faibles (biorhythmes, éléments, Yin/Yang) — cold reading pur
  reliability: 'cycle' | 'resonance' | 'suggestif';
}

export interface ActionItem {
  action: string;
  why: string;
  sources: string[];
  priority: 'haute' | 'moyenne' | 'basse';
  icon: string;
}

// ── Thème détection (pour trouver les convergences) ──

type Theme = 'action' | 'patience' | 'communication' | 'introspection' | 'expansion' | 'prudence' | 'transformation' | 'partenariat' | 'créativité' | 'structure';

const THEME_ICONS: Record<Theme, string> = {
  action: '🔥', patience: '⏳', communication: '💬', introspection: '🔮',
  expansion: '🚀', prudence: '🛡️', transformation: '🦋', partenariat: '🤝',
  créativité: '✨', structure: '🏗️',
};

// Map des nombres personnels vers thèmes dominants
const NUM_THEMES: Record<number, Theme[]> = {
  1: ['action', 'expansion'],
  2: ['partenariat', 'patience'],
  3: ['créativité', 'communication'],
  4: ['structure', 'patience'],
  5: ['transformation', 'expansion'],
  6: ['partenariat', 'créativité'],
  7: ['introspection', 'prudence'],
  8: ['action', 'structure'],
  9: ['transformation', 'introspection'],
  11: ['introspection', 'créativité'],
  22: ['structure', 'expansion'],
  33: ['partenariat', 'créativité'],
};

// Map Yi King keywords vers thèmes
function ichingToThemes(keyword: string): Theme[] {
  const kw = keyword.toLowerCase();
  if (/lanc|initiative|agi|fonce|commence/.test(kw)) return ['action', 'expansion'];
  if (/attend|patien|prépare|mûr/.test(kw)) return ['patience', 'prudence'];
  if (/parl|communi|écoute|négocie|diplomatie/.test(kw)) return ['communication', 'partenariat'];
  if (/observe|médite|recul|intérieur|sagesse/.test(kw)) return ['introspection', 'prudence'];
  if (/expan|crois|grand|avance|audace/.test(kw)) return ['expansion', 'action'];
  if (/pruden|danger|risque|frein|obstacle/.test(kw)) return ['prudence', 'patience'];
  if (/chang|transform|renouv|libère|mue/.test(kw)) return ['transformation', 'expansion'];
  if (/alli|uni|partenaire|ensemble|fusion/.test(kw)) return ['partenariat', 'communication'];
  if (/cré|innov|imagin|art|express/.test(kw)) return ['créativité', 'communication'];
  if (/structur|organ|discip|fondation|bâti/.test(kw)) return ['structure', 'patience'];
  return ['introspection'];
}

// Map Day Type vers thèmes
function dayTypeToThemes(dt: string): Theme[] {
  switch (dt) {
    case 'decision': return ['action', 'expansion'];
    case 'observation': return ['introspection', 'prudence'];
    case 'communication': return ['communication', 'partenariat'];
    case 'retrait': return ['introspection', 'patience'];
    case 'expansion': return ['expansion', 'action'];
    default: return ['introspection'];
  }
}

// Map éléments astro vers thèmes
function elemToThemes(dominant: string): Theme[] {
  switch (dominant) {
    case 'fire': return ['action', 'expansion'];
    case 'earth': return ['structure', 'patience'];
    case 'air': return ['communication', 'créativité'];
    case 'water': return ['introspection', 'transformation'];
    default: return ['introspection'];
  }
}

// Map élément chinois vers thèmes
function czElemToThemes(elem: string): Theme[] {
  switch (elem.toLowerCase()) {
    case 'bois': return ['expansion', 'créativité'];
    case 'feu': return ['action', 'transformation'];
    case 'terre': return ['structure', 'patience'];
    case 'métal': return ['structure', 'prudence'];
    case 'eau': return ['introspection', 'communication'];
    default: return ['introspection'];
  }
}

// ── Helpers ──

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getAge(bd: string, today: string): number {
  return parseInt(today.split('-')[0]) - parseInt(bd.split('-')[0]);
}

// Pinnacle periods
function getPinnaclePeriods(bd: string, lpSingle: number): { start: number; end: number | null }[] {
  const birthYear = parseInt(bd.split('-')[0]);
  const p1End = 36 - lpSingle;
  return [
    { start: 0, end: p1End },
    { start: p1End + 1, end: p1End + 9 },
    { start: p1End + 10, end: p1End + 18 },
    { start: p1End + 19, end: null },
  ];
}

function dominantElement(el: Record<string, number>): string {
  let max = 0, dom = 'fire';
  for (const [k, v] of Object.entries(el)) {
    if (v > max) { max = v; dom = k; }
  }
  return dom;
}

// ── GÉNÉRATION BLOC PASSÉ (powered by Life Timeline Engine) ──

function buildPast(num: NumerologyProfile, astro: AstroChart | null, cz: ChineseZodiac, bd: string, today: string, timeline: LifeTimeline, luckPillars: ReturnType<typeof calculateLuckPillars> | null, fourPillars: FourPillars | null): ReadingBlock {
  const insights: ReadingInsight[] = [];
  const age = getAge(bd, today);
  const lpInfo = getNumberInfo(num.lp.v);
  const exprInfo = getNumberInfo(num.expr.v);

  // 1. Portrait identitaire (depuis Life Timeline)
  insights.push({
    text: timeline.portrait,
    sources: ['Chemin de vie', 'Zodiaque chinois', 'Expression', 'Âme', 'Yi King natal', 'Maturité'],
    intensity: 'forte',
    icon: '🌟',
  });

  // 1b. V4.2: Luck Pillars × Pinnacles — croisement cycles de vie
  if (luckPillars) {
    const lpSingle = num.lp.v > 9 ? (num.lp.v === 11 ? 2 : num.lp.v === 22 ? 4 : 6) : num.lp.v;
    const periods = getPinnaclePeriods(bd, lpSingle);
    const currentYear = parseInt(today.split('-')[0]);
    const pastPillars = luckPillars.pillars.filter(p => p.endYear < currentYear);

    if (pastPillars.length > 0) {
      const crosses: string[] = [];
      pastPillars.forEach(pillar => {
        const pillarMidAge = pillar.startAge + 5;
        const matchIdx = periods.findIndex(p => pillarMidAge >= p.start && (p.end === null || pillarMidAge <= p.end));
        if (matchIdx >= 0) {
          const pinnV = num.pinnacles[matchIdx].v;
          const pinnK = getNumberInfo(pinnV).k;
          const theme = pillar.themeKey === 'produces' ? 'croissance' :
                        pillar.themeKey === 'produced_by' ? 'soutien' :
                        pillar.themeKey === 'destroys' ? 'conquête' :
                        pillar.themeKey === 'destroyed_by' ? 'forge' : 'stabilité';
          const pinnDir = [1, 3, 8].includes(pinnV) ? 'expansion' : [4, 7].includes(pinnV) ? 'construction' :
                          [2, 6].includes(pinnV) ? 'partenariats' : pinnV === 5 ? 'liberté' : 'accomplissement';

          if (theme === 'croissance' && ['expansion', 'liberté'].includes(pinnDir))
            crosses.push(`${pillar.startAge}-${pillar.endAge} ans : double élan de croissance (${pillar.stem.element} + Pinnacle ${pinnV} ${pinnK})`);
          else if (theme === 'forge' && pinnDir === 'construction')
            crosses.push(`${pillar.startAge}-${pillar.endAge} ans : décennie de forge intense (${pillar.stem.element} + Pinnacle ${pinnV})`);
          else
            crosses.push(`${pillar.startAge}-${pillar.endAge} ans : ${theme} × ${pinnDir} (${pillar.stem.element} + Pinnacle ${pinnV})`);
        }
      });
      if (crosses.length > 0) {
        insights.push({
          text: `Cycles de vie croisés (BaZi × Numérologie) : ${crosses.join('. ')}.`,
          sources: ['Luck Pillars (BaZi)', 'Pinnacles (Numérologie)'],
          intensity: 'forte', icon: '🏛',
        });
      }
    }
  }

  // 1c. V4.2: Quatre Piliers natals (八字) — ADN énergétique complet
  if (fourPillars) {
    const fp = fourPillars;
    let fpText = `Quatre Piliers natals (八字) : `;
    fpText += `${fp.year.stem.chinese}${fp.year.branch.chinese} · ${fp.month.stem.chinese}${fp.month.branch.chinese} · ${fp.day.stem.chinese}${fp.day.branch.chinese} · ${fp.hour.stem.chinese}${fp.hour.branch.chinese}. `;
    fpText += `Day Master ${fp.dayMaster.chinese} (${fp.dayMaster.element} ${fp.dayMaster.yinYang}) — ${fp.dayMaster.archetype}. `;
    fpText += fp.hourNarrative;
    insights.push({
      text: fpText,
      sources: ['Quatre Piliers (八字)', 'Hour Pillar (時柱)'],
      intensity: 'forte', icon: '柱',
    });
  }

  // 2. Périodes de vie détaillées (depuis Life Timeline Engine)
  timeline.periods.forEach(period => {
    // Ne montrer que les périodes passées et la période actuelle
    if (period.ageStart > age + 5) return;
    if (period.insights.length === 0) return;

    // Fusionner les insights de la période en un seul bloc
    const periodText = period.insights.join(' ');
    if (periodText.length > 0) {
      insights.push({
        text: periodText,
        sources: period.sources,
        intensity: period.intensity,
        icon: period.pinnacleIdx === 0 ? '🌱' : period.pinnacleIdx === 1 ? '🔥' : period.pinnacleIdx === 2 ? '🏔️' : '🌳',
      });
    }
  });

  // 3. Key Moments (top événements marquants)
  if (timeline.keyMoments.length > 0) {
    insights.push({
      text: `Moments clés identifiés : ${timeline.keyMoments.join(' · ')}`,
      sources: ['Transits universels', 'Pinnacles', 'Années personnelles'],
      intensity: 'forte',
      icon: '⚡',
    });
  }

  // 4. Leçons karmiques
  if (num.kl.length > 0) {
    const klText = `Leçons de vie à intégrer : ${num.kl.map(n => `${n} (${KARMIC_MEANINGS[n] || '?'})`).join(', ')}. Ces énergies absentes de ton nom sont tes zones de croissance.`;
    insights.push({ text: klText, sources: ['Leçons karmiques', 'Lo Shu'], intensity: 'moyenne', icon: '📚' });
  }

  // 5. Identité chinoise complète
  let czText = `${cz.czY} (${cz.yy}) — alliés naturels : ${cz.compat.map(c => c.a).join(', ')}. Ami secret : ${cz.sf.a}. `;
  czText += `Clash avec : ${cz.clash.a}`;
  if (cz.harm) czText += `, friction avec ${cz.harm.a}`;
  czText += `. Ces dynamiques relationnelles influencent tes partenariats.`;
  insights.push({ text: czText, sources: ['Zodiaque chinois V3'], intensity: 'subtile', icon: '🐉' });

  // 6. Yi King natal
  const natalHex = calcNatalIChing(bd);
  const natalProfile = getHexProfile(natalHex.hexNum);
  if (natalProfile) {
    let natalText = `Hexagramme natal n°${natalHex.hexNum} — ${natalHex.name} (${natalProfile.archetype}). `;
    natalText += `Sagesse permanente : "${natalProfile.wisdom?.split('.')[0]}." `;
    natalText += `Force : ${natalProfile.opportunity}. Vigilance : ${natalProfile.risk}.`;
    insights.push({ text: natalText, sources: ['Yi King natal'], intensity: 'moyenne', icon: '☰' });
  }

  // 7. Nœuds Lunaires natals (V2.5 — mission karmique)
  const natalNodes = calcLunarNodes(bd);
  let nodeText = `☊ Nœud Nord en ${natalNodes.northNode.sign} — ${natalNodes.interpretation.mission} `;
  nodeText += `${natalNodes.interpretation.past} `;
  nodeText += `Défi karmique : ${natalNodes.interpretation.challenge}`;
  insights.push({ text: nodeText, sources: ['Nœuds Lunaires', 'Axe karmique'], intensity: 'forte', icon: '☊' });

  // 8. Mission Karmique Enrichie V2.9.2 (Nœud Sud + tension)
  try {
    const southNode = getSouthNode(natalNodes.northNode.sign);
    if (southNode) {
      let karmicText = `Nœud Sud (${southNode.sign}) — ce que tu maîtrises déjà : ${southNode.maitrise} `;
      karmicText += `Ce que tu dois lâcher : ${southNode.lacher} `;
      karmicText += `Piège à éviter : ${southNode.piege}`;

      // Tension karmique si détectée
      const tension = detectKarmicTension(natalNodes.northNode.sign, num.lp.v, num.soul.v);
      if (tension) {
        karmicText += ` ⚡ ${tension}`;
      }

      insights.push({ text: karmicText, sources: ['Nœud Sud', 'Mission karmique', 'Tensions'], intensity: 'forte', icon: '☋' });
    }
  } catch { /* karmic mission fail silently */ }

  const masters = [num.lp, num.expr, num.soul, num.pers].filter(r => r.m).length;
  const summary = `Profil : ${lpInfo.k} (${num.lp.v}) + ${exprInfo.k} (${num.expr.v}) + ${cz.czY}${astro ? ` + ${SIGN_FR[astro.b3.sun]}` : ''}. ${masters >= 2 ? `${masters} nombres maîtres — profil rare.` : 'Profil équilibré.'} ${timeline.periods.filter(p => p.ageEnd !== null && p.ageEnd <= age).length} cycles traversés, ${timeline.keyMoments.length} moments clés identifiés.`;

  return {
    title: '⏳ D\'où tu viens',
    period: `Naissance → Aujourd'hui (${age} ans)`,
    insights,
    summary,
  };
}

// ── GÉNÉRATION BLOC PRÉSENT ──

function buildPresent(num: NumerologyProfile, astro: AstroChart | null, cz: ChineseZodiac, iching: IChingReading, conv: ConvergenceResult, bd: string, today: string, luckPillars: ReturnType<typeof calculateLuckPillars> | null): ReadingBlock {
  const insights: ReadingInsight[] = [];
  const pdInfo = getNumberInfo(num.ppd.v);
  const pyInfo = getNumberInfo(num.py.v);
  const pmInfo = getNumberInfo(num.pm.v);
  const moon = getMoonPhase();
  const bio = conv.biorhythm;

  // 1. Énergie du jour croisée (Numérologie + Day Type + Yi King + Lune)
  const hexProfile = getHexProfile(iching.hexNum);
  let dayText = `Aujourd'hui vibre sur le ${num.ppd.v} (${pdInfo.k}) dans un mois ${num.pm.v} (${pmInfo.k}) et une année ${num.py.v} (${pyInfo.k}). `;
  dayText += `Le jour est de type "${conv.dayType.label}" — ${conv.dayType.desc}. `;
  dayText += `Le Yi King confirme avec l'hexagramme ${iching.hexNum} (${iching.name}) : ${iching.keyword}.`;

  // V8 — Verrouillage tonalité : si score < 35 (Tempête), préfixe d'alerte
  // Empêche l'incohérence narrative où les modules positifs (PD élevé, IChing favorable)
  // contredisent un score de convergence en zone Tempête (BaZi/Nakshatra fortement négatifs).
  if (conv.score < 35) {
    dayText = `⚠️ Malgré des signaux narratifs positifs (${iching.name}, PD ${num.ppd.v}), les cycles prédictifs (BaZi, Nakshatra) sont fortement contraires. Score de convergence : ${conv.score} — ne pas surpondérer les signaux narratifs aujourd'hui. ` + dayText;
  } else if (conv.score < 45) {
    dayText = `Les signaux sont mixtes ce jour. ` + dayText;
  }

  insights.push({
    text: dayText,
    sources: ['Personal Day', 'Type de Jour', 'Yi King du jour'],
    // V8 — intensity conditionnelle au score (avant : toujours 'forte' même en Tempête)
    intensity: conv.score >= 65 ? 'forte' : conv.score >= 40 ? 'moyenne' : 'subtile',
    icon: conv.score < 35 ? '⚠️' : conv.dayType.icon,
  });

  // 2. Transits astrologiques
  if (astro && astro.tr.length > 0) {
    const exactTransits = astro.tr.filter(t => t.x);
    const majorTransits = astro.tr.filter(t => ['jupiter', 'saturn', 'uranus', 'neptune', 'pluto'].includes(t.tp));
    let transitText = `${astro.tr.length} transit${astro.tr.length > 1 ? 's' : ''} actif${astro.tr.length > 1 ? 's' : ''}. `;
    if (exactTransits.length > 0) {
      transitText += `⚡ Transit${exactTransits.length > 1 ? 's' : ''} EXACT${exactTransits.length > 1 ? 'S' : ''} : ${exactTransits.map(t => `${PLANET_FR[t.tp]} ${ASPECT_SYM[t.t] || t.t} ${PLANET_FR[t.np]}`).join(', ')}. Pic d'intensité aujourd'hui. `;
    }
    if (majorTransits.length > 0) {
      transitText += `Transits lents (impact profond) : ${majorTransits.slice(0, 3).map(t => `${PLANET_FR[t.tp]} ${ASPECT_SYM[t.t] || t.t} ${PLANET_FR[t.np]}`).join(', ')}.`;
    }
    insights.push({
      text: transitText,
      sources: ['Transits astrologiques'],
      intensity: exactTransits.length > 0 ? 'forte' : 'moyenne',
      icon: '🌠',
    });
  }

  // 3. Phase lunaire + biorhythmes
  let bodyText = `${moon.emoji} ${moon.name} (${moon.illumination}% d'illumination) — ${moon.tactical.split('.')[0]}. `;
  if (bio) {
    const highest = bio.physical >= bio.emotional && bio.physical >= bio.intellectual ? 'physique' :
                    bio.emotional >= bio.intellectual ? 'émotionnel' : 'intellectuel';
    const lowest = bio.physical <= bio.emotional && bio.physical <= bio.intellectual ? 'physique' :
                   bio.emotional <= bio.intellectual ? 'émotionnel' : 'intellectuel';
    bodyText += `Biorhythmes : ton pic est ${highest} (${Math.max(bio.physical, bio.emotional, bio.intellectual)}%), ton creux est ${lowest} (${Math.min(bio.physical, bio.emotional, bio.intellectual)}%). `;
    if (bio.critical.length > 0) {
      bodyText += `⚡ ${bio.critical.join(' + ')} en zone critique — instabilité accrue.`;
    }
  }
  insights.push({
    text: bodyText,
    sources: ['Phase lunaire', 'Biorhythmes'],
    intensity: bio && (bio.critical.length > 0 || Math.abs(bio.average) > 60) ? 'forte' : 'moyenne',
    icon: '🫀',
  });

  // 4. Score d'alignement (synthèse convergence)
  let scoreText = `Score d'alignement : ${conv.score}% — ${conv.level}. `;
  if (conv.score >= 85) scoreText += `Fenêtre exceptionnelle. Les systèmes convergent en ta faveur. Agis avec conviction.`;
  else if (conv.score >= 70) scoreText += `Conditions très porteuses. Les vents sont favorables — avance sur tes projets prioritaires.`;
  else if (conv.score >= 55) scoreText += `Conditions correctes. Pas de feu vert total mais suffisamment d'énergie pour progresser.`;
  else if (conv.score >= 40) scoreText += `Phase de consolidation. L'énergie est tournée vers l'intérieur — prépare plutôt qu'agir.`;
  else scoreText += `Tensions actives. Plusieurs systèmes freinent — journée de recul stratégique recommandée.`;

  // Add breakdown highlights
  const topSystems = [...conv.breakdown].sort((a, b) => b.points - a.points).slice(0, 2);
  const bottomSystems = [...conv.breakdown].sort((a, b) => a.points - b.points).slice(0, 1);
  if (topSystems.length > 0) {
    scoreText += ` Meilleurs leviers : ${topSystems.map(s => `${s.system} (${s.points > 0 ? '+' : ''}${s.points})`).join(', ')}.`;
  }
  if (bottomSystems.length > 0 && bottomSystems[0].points < 0) {
    scoreText += ` Point de friction : ${bottomSystems[0].system} (${bottomSystems[0].points}).`;
  }

  insights.push({
    text: scoreText,
    sources: ['Convergence (14+ systèmes)'],
    intensity: conv.score >= 85 || conv.score < 40 ? 'forte' : 'moyenne',
    icon: conv.score >= 70 ? '🌟' : conv.score >= 55 ? '☀️' : '☁️',
  });

  // 5. Climat multi-échelle
  const cl = conv.climate;
  let climateText = `Climat stratégique : Semaine en ${cl.week.label} (P${cl.week.value}), Mois en ${cl.month.label} (P${cl.month.value}), Année en ${cl.year.label} (P${cl.year.value}). `;
  const allGrowth = cl.week.label === 'Croissance' && cl.month.label === 'Croissance';
  const allConsolidation = cl.week.label === 'Consolidation' && cl.month.label === 'Consolidation';
  if (allGrowth) climateText += `Triple alignement de croissance — fenêtre d'opportunité exceptionnelle.`;
  else if (allConsolidation) climateText += `Phase de consolidation multi-échelle — patience stratégique requise.`;
  else climateText += `${cl.month.action}.`;
  insights.push({
    text: climateText,
    sources: ['Année personnelle', 'Mois personnel', 'Semaine'],
    intensity: allGrowth || allConsolidation ? 'forte' : 'subtile',
    icon: cl.month.icon,
  });

  // 6. Yi King — message stratégique du jour
  if (hexProfile) {
    let ichingText = `Hexagramme ${iching.hexNum} — ${hexProfile.archetype} : ${hexProfile.judgment} `;
    ichingText += `Opportunité : ${hexProfile.opportunity}. Risque : ${hexProfile.risk}. `;
    ichingText += `Action recommandée : ${hexProfile.action}`;
    insights.push({
      text: ichingText,
      sources: ['Yi King du jour', 'Ligne mutante'],
      intensity: 'moyenne',
      icon: '☰',
    });
  }

  // 7. Transit des Nœuds Lunaires (V2.5)
  if (conv.lunarNodes) {
    const ln = conv.lunarNodes;
    let nodeText = `${ln.alignmentDesc} `;
    if (ln.nodeReturnYear && ln.nodeReturnAge) {
      nodeText += `Prochain retour des nœuds : ${ln.nodeReturnYear} (${ln.nodeReturnAge} ans).`;
    }
    insights.push({
      text: nodeText,
      sources: ['Nœuds Lunaires', 'Transit nodal'],
      intensity: ln.alignment === 'conjoint' || ln.alignment === 'opposé' ? 'forte' : 'subtile',
      icon: '☊',
    });
  }

  // 8. BaZi Day Master V2.9.2
  if (conv.baziDaily) {
    const bz = conv.baziDaily;
    let baziText = `Day Master du jour : ${bz.dailyStem.chinese} ${bz.dailyStem.pinyin} — ${bz.dailyStem.archetype}. `;
    baziText += `${bz.interaction.dynamique} `;
    baziText += `Conseil : ${bz.interaction.conseil}`;
    if (bz.liuHeMatch) {
      baziText += ` 六合 Harmonie cachée active — les alliances invisibles te soutiennent.`;
    }
    insights.push({
      text: baziText,
      sources: ['BaZi Day Master', 'Éléments chinois'],
      intensity: bz.totalScore >= 3 || bz.totalScore <= -2 ? 'forte' : 'moyenne',
      icon: '干',
    });
  }

  // 9. Hexagramme Nucléaire V2.9.2
  if (conv.nuclearHex) {
    const nh = conv.nuclearHex;
    const nucInterp = NUCLEAR_INTERPRETATIONS[nh.crossKey];
    if (nucInterp) {
      let nucText = `Sous la surface (Hex Nucléaire ${nh.nuclearName}) : ${nucInterp.interpretation} `;
      nucText += `Conseil profond : ${nucInterp.conseil}`;
      insights.push({
        text: nucText,
        sources: ['Yi King', 'Hexagramme Nucléaire'],
        intensity: nh.crossKey.includes('A') || nh.crossKey.includes('E') ? 'forte' : 'subtile',
        icon: '⚛',
      });
    }
  }

  // 10. Contexte Éclipse V2.9.2
  const eclipses = getEclipseList();
  const todayDate = new Date(today + 'T12:00:00');
  const nextEclipse = eclipses.find(e => new Date(e.date) >= new Date(todayDate.getTime() - 7 * 86400000));
  if (nextEclipse) {
    const eclDate = new Date(nextEclipse.date);
    const daysUntil = Math.ceil((eclDate.getTime() - todayDate.getTime()) / 86400000);
    if (Math.abs(daysUntil) <= 14) {
      const eclCtx = ECLIPSE_CONTEXTS[
        `${nextEclipse.type === 'solaire' ? 'solaire' : 'lunaire'}_${daysUntil > 3 ? 'avant' : daysUntil >= 0 ? 'pendant' : 'apres'}`
      ];
      if (eclCtx) {
        insights.push({
          text: `${eclCtx.narratif} ${eclCtx.conseil}`,
          sources: ['Éclipse', nextEclipse.type === 'solaire' ? 'Éclipse solaire' : 'Éclipse lunaire'],
          intensity: Math.abs(daysUntil) <= 3 ? 'forte' : 'moyenne',
          icon: nextEclipse.type === 'solaire' ? '🌑' : '🌒',
        });
      }
    }
  }

  // 11. V4.2: Luck Pillar actuel — contexte décennal
  if (luckPillars?.currentPillar) {
    const cp = luckPillars.currentPillar;
    const yearsLeft = luckPillars.currentPillarYearsLeft;
    const narrative = getLuckPillarNarrative(cp, 'present', yearsLeft);
    let lpText = `🏛 Luck Pillar actuel : ${cp.stem.chinese}${cp.branch.chinese} (${cp.stem.element} ${cp.stem.yinYang}) — `;
    lpText += `${narrative} `;
    lpText += yearsLeft > 3 ? `Encore ~${yearsLeft} ans dans ce cycle.` : `Transition dans ~${yearsLeft} an${yearsLeft > 1 ? 's' : ''} — prépare le virage.`;

    // Croisement avec Pinnacle actif
    const lpSingle = num.lp.v > 9 ? (num.lp.v === 11 ? 2 : num.lp.v === 22 ? 4 : 6) : num.lp.v;
    const periods = getPinnaclePeriods(bd, lpSingle);
    const activeIdx = getActivePinnacleIdx(bd, today, num.lp);
    const pinnV = num.pinnacles[activeIdx].v;
    const pinnK = getNumberInfo(pinnV).k;

    const lpTheme = cp.themeKey === 'produces' ? 'création' : cp.themeKey === 'produced_by' ? 'soutien' :
                    cp.themeKey === 'destroys' ? 'conquête' : cp.themeKey === 'destroyed_by' ? 'transformation' : 'stabilité';
    lpText += ` Croisement : Luck Pillar en ${lpTheme} + Pinnacle ${pinnV} (${pinnK}).`;

    insights.push({ text: lpText, sources: ['Luck Pillar (BaZi)', 'Pinnacle (Numérologie)'], intensity: 'forte', icon: '🏛' });
  }

  // 12. V4.2: Confiance temporelle — fiabilité du score
  if (conv.temporalConfidence) {
    const tc = conv.temporalConfidence;
    const icon = tc.score >= 75 ? '🎯' : tc.score >= 55 ? '✅' : tc.score >= 35 ? '⚠️' : '❓';
    insights.push({
      text: `Fiabilité du score : ${tc.label} (${tc.score}%). ${tc.reason}`,
      sources: ['Confiance temporelle', 'Cycles longs'],
      intensity: tc.score >= 75 || tc.score < 35 ? 'forte' : 'subtile',
      icon,
    });
  }

  // 13. V4.2: Void of Course Moon — Lune hors cours
  if (conv.voidOfCourse?.isVoC) {
    const voc = conv.voidOfCourse;
    insights.push({
      text: voc.advice,
      sources: ['Lune Hors Cours', 'Aspects lunaires'],
      intensity: voc.intensity,
      icon: '🌙',
    });
  }

  const summary = `${conv.score}% d'alignement · ${conv.dayType.label} · ${moon.name} · ${iching.name} · ${bio ? bio.phase.label : 'Biorhythmes N/A'}`;

  return {
    title: '⚡ Où tu es maintenant',
    period: new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
    insights,
    summary,
  };
}

// ── GÉNÉRATION BLOC FUTUR ──

function buildFuture(num: NumerologyProfile, astro: AstroChart | null, cz: ChineseZodiac, iching: IChingReading, conv: ConvergenceResult, bd: string, today: string, luckPillars: ReturnType<typeof calculateLuckPillars> | null, forecast6: MonthForecast[]): ReadingBlock {
  const insights: ReadingInsight[] = [];
  const currentYear = parseInt(today.split('-')[0]);
  const age = getAge(bd, today);

  // 1. Pinnacle actif et prochain (Numérologie)
  const activeIdx = getActivePinnacleIdx(bd, today, num.lp);
  const activePinnacle = num.pinnacles[activeIdx];
  const activeChallenge = num.challenges[activeIdx];
  const lpSingle = num.lp.v > 9 ? (num.lp.v === 11 ? 2 : num.lp.v === 22 ? 4 : 6) : num.lp.v;
  const periods = getPinnaclePeriods(bd, lpSingle);
  const currentPeriod = periods[activeIdx];

  let pinnText = `Tu es dans ton Pinnacle ${activeIdx + 1} : énergie ${activePinnacle.v} (${getNumberInfo(activePinnacle.v).k})`;
  if (currentPeriod.end) {
    const yearsLeft = currentPeriod.end - age;
    pinnText += yearsLeft > 0
      ? ` — encore ~${yearsLeft} an${yearsLeft > 1 ? 's' : ''} dans ce cycle.`
      : ` — transition imminente vers le Pinnacle ${activeIdx + 2}.`;
  } else {
    pinnText += ` — cycle final, sans limite de temps.`;
  }
  pinnText += ` Défi associé : ${activeChallenge.v} (${getNumberInfo(activeChallenge.v).k}) — c'est la leçon que ce cycle t'impose.`;

  if (activeIdx < 3) {
    const nextPinnacle = num.pinnacles[activeIdx + 1];
    pinnText += ` Prochain cycle : Pinnacle ${activeIdx + 2} = ${nextPinnacle.v} (${getNumberInfo(nextPinnacle.v).k}).`;
  }
  insights.push({ text: pinnText, sources: ['Pinnacle actif', 'Challenge actif'], intensity: 'forte', icon: '🏔️' });

  // 2. Année personnelle suivante (prédiction numérologique)
  const nextPY = calcPersonalYear(bd, currentYear + 1);
  const nextPYInfo = getNumberInfo(nextPY.v);
  let yearText = `Année personnelle ${currentYear} : ${num.py.v} (${getNumberInfo(num.py.v).k}). `;
  yearText += `Année ${currentYear + 1} : passage en ${nextPY.v} (${nextPYInfo.k}). `;

  // Interprétation du cycle 1-9
  const yearInterpretations: Record<number, string> = {
    1: 'Nouveau départ — lance ce que tu repousses. Les graines plantées cette année définiront les 9 prochaines.',
    2: 'Année de partenariats — patience et diplomatie. Les alliances formées ici sont cruciales.',
    3: 'Expansion créative — exprime-toi, sois visible. L\'univers amplifie ta voix.',
    4: 'Construction — travail de fond, pas de raccourci. Les fondations que tu poses maintenant portent tout.',
    5: 'Changement majeur — lâche ce qui ne te sert plus. Liberté et transformation.',
    6: 'Responsabilité et amour — foyer, famille, engagements. L\'harmonie est ta priorité.',
    7: 'Introspection profonde — ralentis, analyse, médite. Les réponses sont à l\'intérieur.',
    8: 'Récolte et pouvoir — les efforts passés paient. Négocie, finalise, encaisse.',
    9: 'Accomplissement et clôture — termine ce qui doit l\'être. Prépare le terrain pour le renouveau.',
    11: 'Année d\'illumination — intuitions fulgurantes, inspirations. Écoute ta voix intérieure.',
    22: 'Année de bâtisseur cosmique — projets à grande échelle. Tu peux réaliser l\'impossible.',
    33: 'Année de guérison collective — ton impact dépasse ta sphère personnelle.',
  };
  yearText += yearInterpretations[nextPY.v] || `Énergie ${nextPYInfo.k} en approche.`;
  insights.push({ text: yearText, sources: ['Année personnelle', 'Cycle 1-9'], intensity: 'forte', icon: '📅' });

  // 2b. Portail PY → PY+1 V2.9.2 (si transition ≤ 60 jours)
  const currentMonth = parseInt(today.split('-')[1]);
  if (currentMonth >= 11) {
    const pyKey = `${num.py.v}_${nextPY.v}`;
    const pyTransition = PY_TRANSITIONS[pyKey];
    if (pyTransition) {
      let transText = `🚪 Portail ${num.py.v}→${nextPY.v} actif — `;
      transText += `Termine : ${pyTransition.finir} `;
      transText += `Prépare : ${pyTransition.preparer} `;
      transText += `⚠️ Risque : ${pyTransition.risque}`;
      insights.push({ text: transText, sources: ['Transition PY', 'Portail annuel'], intensity: 'forte', icon: '🚪' });
    }
  }

  // 2c. V4.2: Forecast 6 mois — prédictions concrètes et vérifiables
  if (forecast6.length >= 3) {
    const MOIS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    const best = [...forecast6].sort((a, b) => b.score - a.score)[0];
    const worst = [...forecast6].sort((a, b) => a.score - b.score)[0];

    let fcText = `Prévisions 6 mois : `;
    fcText += `Meilleur mois → ${MOIS_FR[best.month - 1]} ${best.year} (${best.score}% ${best.label})`;
    if (best.dominantDomains.length > 0) fcText += ` en ${best.dominantDomains[0]}`;
    fcText += `. `;
    fcText += `Mois le plus tendu → ${MOIS_FR[worst.month - 1]} ${worst.year} (${worst.score}% ${worst.label}). `;

    // Windows d'action du meilleur mois
    if (best.windows.length > 0) {
      const w = best.windows[0];
      fcText += `Fenêtre d'action : ${w.label} du ${w.startDay} au ${w.endDay} ${MOIS_FR[best.month - 1]}. `;
    }

    // Alertes du pire mois
    if (worst.alerts.length > 0) {
      fcText += `⚠️ ${worst.alerts[0].label}. `;
    }

    // Tendance générale
    const avgScore = Math.round(forecast6.reduce((s, m) => s + m.score, 0) / forecast6.length);
    const trend = forecast6[forecast6.length - 1].score > forecast6[0].score ? 'ascendante' : forecast6[forecast6.length - 1].score < forecast6[0].score ? 'descendante' : 'stable';
    fcText += `Tendance générale : ${trend} (moyenne ${avgScore}%).`;

    insights.push({ text: fcText, sources: ['Forecast 36 mois', 'Monte Carlo'], intensity: 'forte', icon: '📈' });
  }

  // 2d. V4.2: Prochain Luck Pillar — ce qui t'attend dans la décennie suivante
  if (luckPillars?.currentPillar) {
    const cpIdx = luckPillars.currentPillar.index;
    const nextPillar = luckPillars.pillars.find(p => p.index === cpIdx + 1);
    if (nextPillar) {
      const yearsUntil = nextPillar.startYear - parseInt(today.split('-')[0]);
      if (yearsUntil > 0 && yearsUntil <= 15) {
        const narrative = getLuckPillarNarrative(nextPillar, 'future', yearsUntil);
        let lpFutText = `Prochain Luck Pillar dans ~${yearsUntil} ans : ${nextPillar.stem.chinese}${nextPillar.branch.chinese} (${nextPillar.stem.element} ${nextPillar.stem.yinYang}). `;
        lpFutText += narrative;
        insights.push({ text: lpFutText, sources: ['Luck Pillars (BaZi)'], intensity: 'moyenne', icon: '🏛' });
      }
    }
  }

  // 3. Maturité (Life Path + Expression convergent)
  const matInfo = getNumberInfo(num.mat.v);
  let matText = `Ton nombre de Maturité est ${num.mat.v} (${matInfo.k}) — c'est la synthèse de ton Chemin de vie (${num.lp.v}) et de ton Expression (${num.expr.v}). `;
  if (age < 45) {
    matText += `Cette énergie s'active progressivement et deviendra dominante après 45 ans. Tu évolues vers un rôle de ${matInfo.k.toLowerCase()}.`;
  } else {
    matText += `À ${age} ans, cette vibration est pleinement active. Tu incarnes maintenant l'énergie du ${matInfo.k.toLowerCase()}.`;
  }
  insights.push({ text: matText, sources: ['Nombre de Maturité', 'Chemin de vie', 'Expression'], intensity: 'moyenne', icon: '🌳' });

  // 3b. Guidance karmique (Nœuds Lunaires V2.5)
  if (conv.lunarNodes) {
    const ln = conv.lunarNodes;
    const interp = ln.natal.interpretation;
    let nodeText = `Direction karmique (Nœud Nord ${ln.natal.northNode.sign}) : ${interp.gift} `;
    nodeText += `Impact pro : ${interp.career}. `;
    if (ln.nodeReturnYear && ln.nodeReturnAge) {
      const yearsUntil = ln.nodeReturnYear - currentYear;
      if (yearsUntil > 0 && yearsUntil <= 10) {
        nodeText += `⚡ Retour des Nœuds dans ~${yearsUntil} an${yearsUntil > 1 ? 's' : ''} (${ln.nodeReturnYear}) — réactivation karmique à anticiper.`;
      }
    }
    insights.push({ text: nodeText, sources: ['Nœuds Lunaires', 'Direction karmique'], intensity: 'moyenne', icon: '☊' });
  }

  // 4. Tendance astrologique (Rétrogrades + éléments)
  if (astro) {
    const retros = astro.pl.filter(p => p.retro);
    let astroText = '';
    if (retros.length > 0) {
      astroText += `${retros.length} planète${retros.length > 1 ? 's' : ''} rétrograde${retros.length > 1 ? 's' : ''} : ${retros.map(p => PLANET_FR[p.k]).join(', ')}. `;
      astroText += `Les rétrogrades invitent à revisiter, pas à lancer du neuf. `;
    }
    const domElem = dominantElement(astro.el);
    astroText += `Ton thème natal est dominé par l'élément ${domElem === 'fire' ? 'Feu (action, passion)' : domElem === 'earth' ? 'Terre (pragmatisme, construction)' : domElem === 'air' ? 'Air (intellect, communication)' : 'Eau (émotion, intuition)'}. `;
    astroText += `Cette signature élémentaire colore toutes tes décisions futures.`;
    insights.push({ text: astroText, sources: ['Rétrogrades', 'Éléments natal'], intensity: retros.length >= 3 ? 'forte' : 'subtile', icon: '🔭' });
  }

  // 5. Sagesse Yi King natal (guidance permanente)
  const natalHex = calcNatalIChing(bd);
  const natalProfile = getHexProfile(natalHex.hexNum);
  if (natalProfile) {
    let wisdomText = `Guidance permanente (Yi King natal n°${natalHex.hexNum}) : ${natalProfile.action} `;
    wisdomText += `Ta posture stratégique de fond reste celle de "${natalProfile.archetype}" — quel que soit le contexte, reviens à cette sagesse quand tu doutes.`;
    insights.push({ text: wisdomText, sources: ['Yi King natal'], intensity: 'moyenne', icon: '🧭' });
  }

  const summary = `Pinnacle ${activeIdx + 1} (${getNumberInfo(activePinnacle.v).k}) → ${currentPeriod.end ? `transition ~${currentPeriod.end} ans` : 'cycle final'} · ${currentYear + 1} = année ${nextPY.v} (${nextPYInfo.k})`;

  return {
    title: '🔮 Vers où tu vas',
    period: `${currentYear} → ${currentYear + 3}`,
    insights,
    summary,
  };
}

// ── V2.5: NARRATION CORRÉLATIVE ──
// Templates dynamiques qui croisent 3+ systèmes spécifiques
// Source: consensus GPT × Grok × Gemini — 15 templates de phrases percutantes

function buildCorrelativeDescription(
  theme: Theme,
  systems: string[],
  num: NumerologyProfile,
  cz: ChineseZodiac,
  iching: IChingReading,
  conv: ConvergenceResult,
): string {
  const pdv = num.ppd.v;
  const pyv = num.py.v;
  const bio = conv.biorhythm;
  const hasBio = systems.some(s => s.includes('Bio'));
  const hasLune = systems.some(s => s.includes('Lune'));
  const hasYiKing = systems.some(s => s.includes('Yi King'));
  const hasChinois = systems.some(s => s.includes('chinois'));
  const hasAstro = systems.some(s => s.includes('Astro'));
  const hasPD = systems.some(s => s.includes('Personal Day'));
  const hasPY = systems.some(s => s.includes('Année'));

  // Templates corrélatives spécifiques (GPT templates 1-15 adaptées)
  
  // Triple pic bio + Lune Feu/Bélier + PD=1 → "Pic d'impulsion"
  if (theme === 'action' && hasBio && hasLune && hasPD && bio && bio.average > 40) {
    return `Pic d'impulsion : biorhythmes hauts (${bio.average}%), Lune ${conv.moonTransit.sign} et jour ${pdv} (${getNumberInfo(pdv).k}) convergent. Si tu hésites aujourd'hui, tu perds l'avantage. L'action crée la clarté.`;
  }

  // PY 1 + Nouvelle Lune + Mercure direct → "Fenêtre d'initiation"
  if (theme === 'expansion' && hasPY && hasLune && pyv === 1) {
    return `Fenêtre parfaite pour initier. Année ${pyv} (nouveau départ) + énergie lunaire alignée : ce que tu démarres maintenant prend racine.`;
  }

  // PD=7 + Lune Eau + Yi King méditatif → "Réponses du silence"
  if (theme === 'introspection' && hasPD && pdv === 7 && hasYiKing) {
    return `Journée introspective puissante. Jour ${pdv} (Chercheur) + Yi King ${iching.name} + énergie lunaire intérieure : les réponses viennent du silence, pas de l'action.`;
  }

  // CdV action + Chinois Feu + PD action → "Frappe chirurgicale"
  if (theme === 'action' && hasChinois && cz.elem === 'Feu' && [1, 8].includes(pdv)) {
    return `Ton ${cz.animal} de Feu amplifie l'énergie d'action du jour ${pdv}. Capacité de frappe chirurgicale — tes concurrents ne verront pas le coup venir.`;
  }

  // PY 9 + énergie de transformation → "Libération karmique"
  if (theme === 'transformation' && hasPY && pyv === 9) {
    return `Cycle de libération. Année ${pyv} (clôture) + ${systems.length} systèmes de transformation alignés : ce que tu retiens t'alourdit. Laisse partir.`;
  }

  // Structure + PY 4 + Challenge → "Structuration forcée"
  if (theme === 'structure' && hasPY && pyv === 4) {
    return `Phase de structuration forcée. Année ${pyv} (${getNumberInfo(pyv).k}) impose la rigueur. Ce que tu évites doit être organisé — maintenant.`;
  }

  // Communication + PD 3/6 + Yi King → "Parole amplifiée"
  if (theme === 'communication' && hasPD && [3, 6].includes(pdv) && hasYiKing) {
    return `Les opportunités arrivent par conversation aujourd'hui. Jour ${pdv} (${getNumberInfo(pdv).k}) + Yi King ${iching.name} amplifient ton pouvoir de persuasion.`;
  }

  // Expansion avec 5+ systèmes → "Fenêtre majeure" (GPT Module)
  if (theme === 'expansion' && systems.length >= 5) {
    return `🔥 FENÊTRE MAJEURE : ${systems.length} systèmes convergent vers l'expansion. Rare combinaison — ta décision impacte plus que toi. Lance ce que tu repousses.`;
  }

  // Prudence avec 4+ systèmes → "Signal fort"
  if (theme === 'prudence' && systems.length >= 4) {
    return `Signal de prudence puissant : ${systems.length} systèmes freinent simultanément. Ce n'est pas de la faiblesse — c'est de l'intelligence. Protège tes acquis.`;
  }

  // Maître nombre actif + créativité → "Canal ouvert"
  if (theme === 'créativité' && num.ppd.m) {
    return `Nombre Maître ${pdv} activé + vague créative : tu es en mode "canal" — les intuitions qui arrivent aujourd'hui sont à capturer immédiatement.`;
  }

  // Biorhythmes creux + prudence → "Fatigue décisionnelle"
  if (theme === 'prudence' && hasBio && bio && bio.average < -30) {
    return `Fatigue décisionnelle détectée : biorhythmes en creux (${bio.average}%) + ${systems.length - 1} autres signaux de recul. Évite les décisions irréversibles.`;
  }

  // Partenariat + zodiaque chinois → "Alliances stratégiques"
  if (theme === 'partenariat' && hasChinois) {
    return `Les systèmes convergent vers le collectif. Ton ${cz.czY} excelle dans les alliances stratégiques — cherche tes alliés naturels (${cz.compat.map(c => c.a).join(', ')}).`;
  }

  // ═══ V2.9: 10 NOUVEAUX TEMPLATES — ciblant 4+ systèmes (audit Grok) ═══

  const hasNoeud = systems.some(s => s.includes('Nœud') || s.includes('nodal'));
  const hasMercure = systems.some(s => s.includes('Mercure'));
  const hasEclipse = systems.some(s => s.includes('clipse'));

  // T16. PD maître + Yi King A-tier + Bio pic + Transit → "Supernova décisionnelle"
  if (theme === 'action' && systems.length >= 4 && num.ppd.m && hasYiKing && hasBio && bio && bio.average > 50) {
    return `⚡ SUPERNOVA : Nombre Maître ${pdv} + Yi King puissant + biorhythmes à ${bio.average}% + transit actif. Rareté extrême — décide, lance, signe. Aujourd'hui tu opères à un niveau que tu ne retrouveras pas de sitôt.`;
  }

  // T17. PY 9 + Lune décroissante + Yi King E-tier + Nœuds tension → "Mort et renaissance"
  if (theme === 'transformation' && systems.length >= 4 && pyv === 9 && hasLune && hasYiKing) {
    return `Cycle de mort symbolique. Année 9 + Lune descendante + Yi King ${iching.name} + nœuds karmiques : ce qui meurt aujourd'hui devait mourir. La renaissance commence demain — si tu lâches vraiment.`;
  }

  // T18. 4+ systèmes action + Animal Feu/Tigre → "Charge du général"
  if (theme === 'action' && systems.length >= 4 && (cz.elem === 'Feu' || ['Tigre', 'Dragon', 'Cheval'].includes(cz.animal))) {
    return `Charge stratégique : ${systems.length} systèmes en mode action + ton ${cz.animal} de ${cz.elem}. Tu as la puissance ET le timing — frappe maintenant, corrige après.`;
  }

  // T19. Prudence + Mercure rétro + Bio bas + Yi King tension → "Bunker stratégique"
  if (theme === 'prudence' && systems.length >= 4 && hasMercure && hasBio && bio && bio.average < -20) {
    return `🛡️ Mode bunker recommandé. Mercure rétrograde + biorhythmes à ${bio.average}% + ${systems.length - 2} autres freins. Aucune signature, aucun lancement. Protège ton énergie — demain sera meilleur.`;
  }

  // T20. Introspection + PD 7 + Lune + Nœuds → "Oracle intérieur"
  if (theme === 'introspection' && systems.length >= 4 && pdv === 7 && hasLune) {
    return `Ton Oracle intérieur est grand ouvert. Jour 7 + phase lunaire + ${systems.length - 2} systèmes en mode réception. Les réponses que tu cherches depuis des semaines arrivent — à condition que tu fasses silence.`;
  }

  // T21. Expansion + PY 1/3 + Lune croissante + Astro favorable → "Lancement parfait"
  if (theme === 'expansion' && systems.length >= 4 && [1, 3].includes(pyv) && hasLune && hasAstro) {
    return `Fenêtre de lancement : Année ${pyv} (${getNumberInfo(pyv).k}) + Lune en croissance + transits favorables + ${systems.length - 3} autres signaux. Les projets semés maintenant ont un taux de survie exceptionnel.`;
  }

  // T22. Communication + PD 3/6 + Mercure direct + Chinois allié → "Persuasion maximale"
  if (theme === 'communication' && systems.length >= 4 && [3, 6].includes(pdv) && hasChinois) {
    return `Mode persuasion activé. Jour ${pdv} + ${cz.animal} + ${systems.length - 2} systèmes en mode communication. Tu convaincs naturellement — appelle le client, présente le projet, négocie le deal.`;
  }

  // T23. Créativité + Yi King + Bio pic émotionnel + PD 3/5 → "Muse cosmique"
  if (theme === 'créativité' && systems.length >= 4 && hasYiKing && hasBio && bio && bio.emotional > 60) {
    return `La Muse est là. Yi King ${iching.name} + biorhythme émotionnel à ${bio.emotional}% + ${systems.length - 2} autres courants créatifs. Capture tout — les idées qui passent aujourd'hui sont des pépites qui ne reviendront pas sous cette forme.`;
  }

  // T24. Structure + PY 4/8 + Astro Saturne + Chinois Terre/Métal → "Architecte cosmique"
  if (theme === 'structure' && systems.length >= 4 && [4, 8, 22].includes(pyv) && (cz.elem === 'Terre' || cz.elem === 'Métal')) {
    return `Mode architecte. Année ${pyv} + ${cz.elem} chinois + ${systems.length - 2} signaux de consolidation. Ce que tu structures aujourd'hui résiste au temps. Pose les fondations, signe les contrats, organise.`;
  }

  // T25. Eclipse + PY 1/9 + Nœuds + Transformation → "Portail karmique"
  if (theme === 'transformation' && systems.length >= 4 && hasEclipse && [1, 9].includes(pyv)) {
    return `🌑 PORTAIL KARMIQUE. Éclipse + Année ${pyv} + ${systems.length - 2} systèmes de transformation alignés. Les décisions prises sous ce portail ont un impact sur les 18 prochaines années. Choisis en conscience.`;
  }

  // Fallback : descriptions enrichies par défaut
  const defaults: Record<Theme, string> = {
    action: `${systems.length} systèmes pointent vers l'action — c'est le moment de décider et d'avancer. L'hésitation est ton seul ennemi aujourd'hui.`,
    patience: `Convergence vers la patience — ${systems.length} signaux disent "pas encore". Le timing n'est pas mûr, prépare le terrain.`,
    communication: `Les nombres, les astres et les symboles t'invitent à communiquer. Parle, écris, connecte — le message passera.`,
    introspection: `${systems.length} systèmes s'alignent vers l'intérieur. Médite, analyse, prends du recul — les réponses sont en toi.`,
    expansion: `Fenêtre d'expansion : ${systems.length} systèmes ouvrent le champ. Les conditions sont réunies pour voir grand.`,
    prudence: `Signal de prudence : ${systems.length} systèmes ralentissent. Vérifie, protège, consolide.`,
    transformation: `Énergie de transformation massive — ${systems.length} systèmes disent la même chose : quelque chose doit changer.`,
    partenariat: `Les systèmes convergent vers le collectif — cherche tes alliés, co-crée, ne reste pas seul.`,
    créativité: `Vague créative : ${systems.length} systèmes vibrent sur l'expression. Capture tes idées — elles ont de la valeur.`,
    structure: `Moment de structuration — ${systems.length} signaux demandent de l'ordre. Organise, planifie, consolide.`,
  };

  return defaults[theme];
}

// ── V2.9.1: CONTRADICTIONS INTER-SYSTÈMES (audit Grok R2+R3) ──
// Quand des systèmes se contredisent, c'est une tension intéressante à narrer

function detectContradictions(
  conv: ConvergenceResult,
  iching: IChingReading,
  num: NumerologyProfile,
): Contradiction[] {
  const c: Contradiction[] = [];
  const pdv = num.ppd.v;
  const pyv = num.py.v;
  const bio = conv.biorhythm;
  const hexTier = getHexTier(iching.hexNum);
  const mercStatus = getMercuryStatus(new Date());
  const moon = getMoonPhase();

  // Trouver les systèmes forts/faibles dans le breakdown
  const numBreak = conv.breakdown.find(b => b.system === 'Numérologie');
  const numPts = numBreak?.points || 0;

  // 1. PD positif (+5) + Yi King E-tier (-7)
  if (numPts >= 5 && hexTier.tier === 'E') {
    c.push({
      type: 'Énergie vs Résistance',
      description: `Ton énergie personnelle est forte, mais le Yi King signale une épreuve. `,
      conseil: `Canalise cette puissance dans la révision et la préparation, pas le lancement.`,
    });
  }

  // 2. Bio pic + Mercure stationnaire
  if (bio && bio.average > 60 && mercStatus.phase.includes('stationary')) {
    c.push({
      type: 'Pic énergétique vs Blocage',
      description: `Tes biorhythmes sont au maximum, mais Mercure est ${mercStatus.label}. `,
      conseil: `Utilise cette énergie pour revoir et restructurer — pas pour signer ou lancer.`,
    });
  }

  // 3. PD Expansion + Lune décroissante
  if (conv.dayType.type === 'expansion' && moon.illumination < 40 && moon.phase >= 5) {
    c.push({
      type: 'Expansion vs Retrait lunaire',
      description: `Ton jour est d'expansion, mais la Lune décroît. `,
      conseil: `L'énergie est là mais elle se retire — prépare plutôt qu'agir.`,
    });
  }

  // 4. PD 1 (nouveau départ) + PY 9 (fin de cycle)
  if (pdv === 1 && pyv === 9) {
    c.push({
      type: 'Nouveau départ vs Fin de cycle',
      description: `Ton jour est un nouveau départ, mais ton année est une fin de cycle. `,
      conseil: `Clôture d'abord ce qui doit l'être avant de recommencer.`,
    });
  }

  // 5. Yi King A-tier + Bio bas
  if (hexTier.tier === 'A' && bio && bio.average < 30) {
    c.push({
      type: 'Puissance cosmique vs Corps fatigué',
      description: `Le Yi King est puissant, mais tes biorhythmes sont bas. `,
      conseil: `L'énergie cosmique est là, mais ton corps a besoin de repos. Décide mentalement, agis demain.`,
    });
  }

  // 6. PD Communication + Mercure rétro
  if (conv.dayType.type === 'communication' && (mercStatus.phase === 'retrograde' || mercStatus.phase === 'stationary-retro')) {
    c.push({
      type: 'Communication vs Mercure rétro',
      description: `Ton jour est de communication, mais Mercure est rétrograde. `,
      conseil: `Parle peu, écoute beaucoup — les malentendus sont amplifiés.`,
    });
  }

  // 7. Bio triple pic + PY 4/8 (structure)
  if (bio && bio.physical > 70 && bio.emotional > 70 && bio.intellectual > 70 && [4, 8].includes(pyv)) {
    c.push({
      type: 'Énergie explosive vs Année de structure',
      description: `Tes biorhythmes sont au pic, mais ton année est de structure. `,
      conseil: `Utilise cette énergie pour bâtir, pas pour exploser.`,
    });
  }

  // 8. PD Maître 11/22 + Éclipse proche (±7j)
  if ([11, 22].includes(pdv) && conv.alerts.some(a => a.toLowerCase().includes('éclipse'))) {
    c.push({
      type: 'Puissance maître vs Instabilité éclipse',
      description: `Ton jour maître est puissant, mais une éclipse approche. `,
      conseil: `L'énergie est amplifiée mais instable — observe avant d'agir.`,
    });
  }

  // 9. Nœud favorable + Mercure rétro
  const nodeBreak = conv.breakdown.find(b => b.system === 'Nœuds Lunaires');
  if (nodeBreak && nodeBreak.points >= 3 && mercStatus.phase === 'retrograde') {
    c.push({
      type: 'Direction karmique vs Brouillard Mercure',
      description: `Ton Nœud Lunaire t'oriente bien, mais Mercure brouille les pistes. `,
      conseil: `Suis ton intuition profonde, pas les mots échangés aujourd'hui.`,
    });
  }

  // 10. PD retrait + Transit Jupiter favorable
  const astroBreak = conv.breakdown.find(b => b.system === 'Astrologie');
  if (conv.dayType.type === 'retrait' && astroBreak && astroBreak.points >= 5) {
    c.push({
      type: 'Retrait vs Opportunité cosmique',
      description: `Ton jour est de retrait, mais les transits t'ouvrent des portes. `,
      conseil: `Note les opportunités qui se présentent — tu agiras demain avec plus de force.`,
    });
  }

  // 11. V2.9.2: BaZi positif + Yi King D/E-tier
  const baziBreak = conv.breakdown.find(b => b.system === 'BaZi');
  if (baziBreak && baziBreak.points >= 2 && (hexTier.tier === 'D' || hexTier.tier === 'E')) {
    c.push({
      type: 'Day Master favorable vs Yi King tendu',
      description: `Ton Day Master est en harmonie avec le jour, mais le Yi King signale des obstacles. `,
      conseil: `Ton énergie personnelle est forte — utilise-la pour naviguer les difficultés, pas pour les ignorer.`,
    });
  }

  // 12. V2.9.2: Nuclear Hex discordant (A principal + D/E nucléaire)
  if (conv.nuclearHex && conv.nuclearHex.mainTier === 'A' && (conv.nuclearHex.nuclearTier === 'D' || conv.nuclearHex.nuclearTier === 'E')) {
    c.push({
      type: 'Succès apparent vs Tensions cachées',
      description: `En surface tout va bien (Yi King puissant), mais en profondeur le nucléaire révèle des fragilités. `,
      conseil: `Renforce les fondations discrètement pendant que la surface brille.`,
    });
  }

  // 13. V2.9.2: BaZi destructeur + Bio pic
  if (baziBreak && baziBreak.points <= -2 && bio && bio.average > 60) {
    c.push({
      type: 'Énergie physique vs Conflit élémentaire',
      description: `Tes biorhythmes sont hauts, mais ton Day Master est en conflit avec le jour. `,
      conseil: `L'énergie est là mais mal orientée — canalise dans la restructuration, pas le lancement.`,
    });
  }

  // ════ V4.1 CONTRADICTIONS (Gemini R8) ════

  // 14. Initiative vs Delay — PD 1 + Mercure Rétro fort
  const mercBreak = conv.breakdown.find(b => b.system === 'Mercure');
  if (num.ppd.v === 1 && mercBreak && mercBreak.points <= -4) {
    c.push({
      type: 'Lancement vs Blocage',
      description: `Ton cerveau veut tout lancer (Jour 1), mais l'infrastructure résiste (Mercure rétro). `,
      conseil: `N'appuie pas sur l'accélérateur quand le frein à main est tiré. Prépare, ne lance pas.`,
    });
  }

  // 15. Introspection vs Urgence — Direct Resource + Lune en Feu
  const tenGodsBreak = conv.breakdown.find(b => b.system === '10 Gods');
  const moonSign = conv.moonTransit?.element;
  if (tenGodsBreak && tenGodsBreak.value.includes('Resource') && (moonSign === 'fire' || moonSign === 'air')) {
    c.push({
      type: 'Repli mental vs Urgence émotionnelle',
      description: `Le besoin de t'isoler pour réfléchir entre en collision avec une urgence de feu. `,
      conseil: `Tu te sens coupable de ne pas agir. Donne-toi 2h de calme — l'action viendra après.`,
    });
  }

  // 16. Cosmic Push vs Friction — Trinity + I Ching E
  if (conv.trinity && hexTier.tier === 'E') {
    c.push({
      type: 'Puissance vs Terrain miné',
      description: `Une dynamique massive te pousse en avant, mais le Yi King signale un terrain dangereux. `,
      conseil: `C'est conduire une Ferrari sur du verglas — la puissance est là, le danger aussi.`,
    });
  }

  // 17. Attraction vs Mur — Peach Blossom + Saturne
  const peachBreak = conv.breakdown.find(b => b.system === 'Peach Blossom');
  const astroBreak2 = conv.breakdown.find(b => b.system === 'Astrologie');
  if (peachBreak && peachBreak.points > 0 && astroBreak2 && astroBreak2.points < 0) {
    c.push({
      type: 'Magnétisme vs Froideur',
      description: `Ton charme est à son comble, mais une froideur karmique bloque l'accès à l'autre. `,
      conseil: `Tu attires, mais tu ne laisses personne entrer. Ouvre une porte, même petite.`,
    });
  }

  // 18. Récolte vs Vide — PD 8 + Nouvelle Lune
  const moonBreak = conv.breakdown.find(b => b.system === 'Lune');
  if (num.ppd.v === 8 && moonBreak && moonBreak.value.includes('Nouvelle')) {
    c.push({
      type: 'Instinct matériel vs Vide lunaire',
      description: `L'instinct veut récolter et signer (Jour 8), mais le vide lunaire draine tes actions. `,
      conseil: `Ce que tu gagnes aujourd'hui risque de te coûter le double demain. Attends 48h.`,
    });
  }

  return c.slice(0, 4); // V4.1: 4 contradictions max (was 3)
}

// ── V2.9.1: RAINBOW ROCKING — post-processing narratif (audit Grok R3) ──
// Ajoute une nuance contradictoire subtile pour augmenter la crédibilité

const RAINBOW_ROCKING: Record<string, string[]> = {
  action: [
    ', mais seulement après avoir vérifié que le terrain est solide. La vraie puissance est dans l\'équilibre entre élan et préparation.',
    '. Mais rappelle-toi : la force sans direction se disperse.',
  ],
  prudence: [
    ', mais ce recul n\'est pas une faiblesse — c\'est la stratégie la plus intelligente quand les forces ne sont pas encore alignées.',
    '. Cette pause apparente est en réalité le travail le plus stratégique du moment.',
  ],
  expansion: [
    ', mais le vrai maître de l\'expansion sait que la croissance la plus durable commence par des bases invisibles.',
    '. Grandis, mais garde un pied ancré.',
  ],
  introspection: [
    ', mais cette introspection n\'est pas une pause — c\'est le travail le plus productif que tu puisses faire en ce moment.',
    '. Le silence d\'aujourd\'hui prépare les décisions de demain.',
  ],
  communication: [
    ', mais les paroles les plus puissantes sont souvent celles qui ne sont pas encore prononcées.',
    '. Écoute autant que tu parles — l\'influence naît de l\'attention.',
  ],
  transformation: [
    ', mais la métamorphose demande de lâcher ce qui ne sert plus. Le papillon ne regrette pas la chenille.',
  ],
  créativité: [
    ', mais capture les idées sans les juger — le tri viendra après. L\'excès de structure tue l\'inspiration.',
  ],
  structure: [
    ', mais n\'oublie pas que même l\'architecte le plus rigoureux a besoin de flexibilité. Les fondations vivantes résistent mieux.',
  ],
  partenariat: [
    ', mais la meilleure alliance est celle où chacun garde sa souveraineté. Collabore sans te perdre.',
  ],
  patience: [
    ', mais cette attente n\'est pas passive — elle est stratégique. Le chasseur patient attrape le plus gros gibier.',
  ],
};

function addRainbowRocking(text: string, theme: string): string {
  const phrases = RAINBOW_ROCKING[theme];
  if (!phrases || phrases.length === 0) return text;

  // Hash simple du texte pour choisir une phrase de manière déterministe
  let hash = 0;
  for (let i = 0; i < text.length; i++) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  const idx = Math.abs(hash) % phrases.length;

  // Retire le point final s'il y en a un, puis ajoute le rocking
  const cleaned = text.replace(/\.\s*$/, '');
  return cleaned + phrases[idx];
}

// ── DÉTECTION DES CONVERGENCES ──

function detectCrossings(num: NumerologyProfile, astro: AstroChart | null, cz: ChineseZodiac, iching: IChingReading, conv: ConvergenceResult): Crossing[] {
  // Collecter les thèmes de chaque système avec leur source
  const themeVotes: Record<Theme, string[]> = {
    action: [], patience: [], communication: [], introspection: [],
    expansion: [], prudence: [], transformation: [], partenariat: [],
    créativité: [], structure: [],
  };

  // Numérologie Personal Day
  const pdThemes = NUM_THEMES[num.ppd.v] || ['introspection'];
  pdThemes.forEach(t => themeVotes[t].push('Personal Day'));

  // Numérologie Personal Year
  const pyThemes = NUM_THEMES[num.py.v] || ['introspection'];
  pyThemes.forEach(t => themeVotes[t].push('Année personnelle'));

  // Life Path
  const lpThemes = NUM_THEMES[num.lp.v] || ['introspection'];
  lpThemes.forEach(t => themeVotes[t].push('Chemin de vie'));

  // Day Type
  const dtThemes = dayTypeToThemes(conv.dayType.type);
  dtThemes.forEach(t => themeVotes[t].push('Type de Jour'));

  // Yi King
  const ikThemes = ichingToThemes(iching.keyword);
  ikThemes.forEach(t => themeVotes[t].push('Yi King'));

  // Astrologie (élément dominant)
  if (astro) {
    const domElem = dominantElement(astro.el);
    const astroThemes = elemToThemes(domElem);
    astroThemes.forEach(t => themeVotes[t].push('Astrologie'));

    // Transits exacts = boost
    const exactTransits = astro.tr.filter(t => t.x);
    if (exactTransits.length > 0) {
      themeVotes['transformation'].push('Transit exact');
    }
  }

  // Zodiaque chinois
  const czThemes = czElemToThemes(cz.elem);
  czThemes.forEach(t => themeVotes[t].push('Zodiaque chinois'));

  // Lune
  const moon = getMoonPhase();
  if (moon.illumination > 80) { themeVotes['action'].push('Pleine Lune'); themeVotes['expansion'].push('Pleine Lune'); }
  else if (moon.illumination < 10) { themeVotes['introspection'].push('Nouvelle Lune'); themeVotes['patience'].push('Nouvelle Lune'); }
  else if (moon.illumination > 50) { themeVotes['expansion'].push('Lune croissante'); }
  else { themeVotes['prudence'].push('Lune décroissante'); }

  // Biorhythmes
  const bio = conv.biorhythm;
  if (bio) {
    if (bio.average > 40) { themeVotes['action'].push('Biorhythmes'); themeVotes['expansion'].push('Biorhythmes'); }
    else if (bio.average < -40) { themeVotes['prudence'].push('Biorhythmes'); themeVotes['patience'].push('Biorhythmes'); }
    if (bio.critical.length >= 2) { themeVotes['prudence'].push('Biorhythmes critique'); }
  }

  // Nœuds Lunaires (V2.5)
  if (conv.lunarNodes) {
    const nodeAlign = conv.lunarNodes.alignment;
    if (nodeAlign === 'conjoint') { themeVotes['transformation'].push('Nœuds Lunaires'); themeVotes['expansion'].push('Nœuds Lunaires'); }
    else if (nodeAlign === 'trigone') { themeVotes['expansion'].push('Nœuds Lunaires'); }
    else if (nodeAlign === 'opposé') { themeVotes['introspection'].push('Nœuds Lunaires'); themeVotes['prudence'].push('Nœuds Lunaires'); }
    else if (nodeAlign === 'carré') { themeVotes['transformation'].push('Nœuds Lunaires'); themeVotes['prudence'].push('Nœuds Lunaires'); }
  }

  // Filtrer : garder uniquement les thèmes avec 3+ systèmes
  const crossings: Crossing[] = [];
  for (const [theme, systems] of Object.entries(themeVotes)) {
    if (systems.length >= 3) {
      const t = theme as Theme;
      
      // V2.5: Narration corrélative — descriptions dynamiques basées sur les combinaisons exactes
      // Source: 15 templates GPT + phrases Grok/Gemini
      const rawDesc = buildCorrelativeDescription(t, systems, num, cz, iching, conv);
      // V2.9.1: Rainbow rocking — nuance contradictoire subtile (audit Grok R3)
      const desc = addRainbowRocking(rawDesc, t);

      crossings.push({
        theme: t.charAt(0).toUpperCase() + t.slice(1),
        description: desc,
        systems,
        strength: systems.length,
        icon: THEME_ICONS[t],
      });
    }
  }

  // Trier par force décroissante
  crossings.sort((a, b) => b.strength - a.strength);

  return crossings;
}

// ── PLAN D'ACTION ──

function buildActionPlan(crossings: Crossing[], conv: ConvergenceResult, iching: IChingReading, num: NumerologyProfile): ActionItem[] {
  const actions: ActionItem[] = [];
  const hexProfile = getHexProfile(iching.hexNum);

  // Action 1 : dérivée de la convergence la plus forte
  if (crossings.length > 0) {
    const top = crossings[0];
    actions.push({
      action: `${top.icon} Priorise : ${top.theme}`,
      why: top.description,
      sources: top.systems,
      priority: top.strength >= 5 ? 'haute' : 'moyenne',
      icon: top.icon,
    });
  }

  // Action 2 : dérivée du Yi King
  if (hexProfile) {
    actions.push({
      action: hexProfile.action,
      why: `L'hexagramme ${iching.hexNum} (${iching.name}) dit : "${hexProfile.judgment.split('.')[0]}."`,
      sources: ['Yi King du jour', 'Ligne mutante ' + (iching.changing + 1)],
      priority: 'haute',
      icon: '☰',
    });
  }

  // Action 3 : dérivée de l'actionReco convergence
  if (conv.actionReco) {
    actions.push({
      action: `${conv.actionReco.icon} ${conv.actionReco.label}`,
      why: conv.actionReco.conseil,
      sources: ['Convergence scoring', 'Type de Jour'],
      priority: conv.score >= 70 ? 'haute' : 'moyenne',
      icon: conv.actionReco.icon,
    });
  }

  // Action 4 : si alerte ou prudence détectée
  const cautionCrossing = crossings.find(c => c.theme === 'Prudence' || c.theme === 'Patience');
  if (cautionCrossing) {
    actions.push({
      action: '🛡️ Point de vigilance',
      why: `${cautionCrossing.strength} systèmes signalent la prudence : ${cautionCrossing.systems.join(', ')}. Reporte les engagements définitifs si possible.`,
      sources: cautionCrossing.systems,
      priority: cautionCrossing.strength >= 4 ? 'haute' : 'basse',
      icon: '🛡️',
    });
  }

  return actions.slice(0, 4); // Max 4 actions
}

// ── PORTRAIT SYNTHÉTIQUE ──

// ── VERDICT DU JOUR ──

function buildVerdict(conv: ConvergenceResult, crossings: Crossing[], iching: IChingReading): string {
  const topTheme = crossings.length > 0 ? crossings[0] : null;
  const rarity = conv.rarityIndex;
  // V2.7: rank Monte Carlo → "Xème meilleur jour sur 365" (empirique, pas théorique)
  const rarityTag = rarity && rarity.percentage <= 8
    ? ` ${rarity.icon} ${rarity.rank ? `${rarity.rank}${rarity.rank === 1 ? 'er' : 'ème'} meilleur jour de l'année.` : `${rarity.label}.`}`
    : '';

  if (conv.score >= 90) {
    return `⚡ Alignement cosmique (${conv.score}%) — fenêtre exceptionnelle.${rarityTag} ${topTheme ? `${topTheme.strength} systèmes convergent vers ${topTheme.theme.toLowerCase()}.` : ''} Agis avec conviction absolue.`;
  }
  if (conv.score >= 85) {
    return `🌟 Journée Gold (${conv.score}%) — conditions optimales.${rarityTag} ${iching.keyword}. ${topTheme ? `Thème dominant : ${topTheme.theme}.` : ''}`;
  }
  if (conv.score >= 70) {
    return `✦ Dynamique puissante (${conv.score}%) — les vents sont porteurs.${rarityTag} ${topTheme ? `Focus : ${topTheme.theme.toLowerCase()}.` : ''} Avance.`;
  }
  if (conv.score >= 55) {
    return `☉ Conditions favorables (${conv.score}%) — progresser est possible. ${topTheme ? `Tendance : ${topTheme.theme.toLowerCase()}.` : ''} Reste attentif.`;
  }
  if (conv.score >= 40) {
    return `☉ Consolidation (${conv.score}%) — phase neutre, énergie tournée vers l'intérieur. ${topTheme ? `Tendance : ${topTheme.theme.toLowerCase()}.` : ''} Prépare plutôt qu'agir.`;
  }
  if (conv.score >= 25) {
    return `☽ Énergie basse (${conv.score}%) — résistances actives. ${topTheme ? `${topTheme.strength} systèmes freinent sur ${topTheme.theme.toLowerCase()}.` : 'Plusieurs signaux bloquants.'} Reporte les décisions non urgentes.`;
  }
  return `⛈ Temps de retrait (${conv.score}%) — ${topTheme ? `${topTheme.strength} systèmes en tension sur ${topTheme.theme.toLowerCase()}.` : 'Les cycles majeurs sont contraires.'} Journée de recul stratégique absolu — protège tes acquis.`;
}

// ── V2.5: MODULE FENÊTRE MAJEURE ──
// Se déclenche quand score ≥75% ET 5+ systèmes positifs simultanément
// Source: GPT feature 4 — narration spéciale pour les jours exceptionnels

function buildMajorWindow(
  conv: ConvergenceResult,
  crossings: Crossing[],
  num: NumerologyProfile,
  cz: ChineseZodiac,
  iching: IChingReading,
): MajorWindow | null {
  const positiveSystems = conv.breakdown.filter(b => b.points > 0);
  
  // Seuil : score ≥75 ET 5+ systèmes positifs
  if (conv.score < 75 || positiveSystems.length < 5) return null;

  const topTheme = crossings.length > 0 ? crossings[0] : null;
  const rarity = conv.rarityIndex;
  const hexProfile = getHexProfile(iching.hexNum);
  const pdInfo = getNumberInfo(num.ppd.v);

  // Construire la narration selon l'intensité
  let narrative: string;
  const systemNames = positiveSystems.map(s => s.system).join(', ');

  if (conv.score >= 90) {
    // V2.7: rank empirique au lieu du % théorique
    const rankText = rarity.rank ? `C'est le ${rarity.rank}${rarity.rank === 1 ? 'er' : 'ème'} meilleur jour de ton année.` : `Cette configuration se produit ${rarity.percentage.toFixed(1)}% des jours.`;
    narrative = `🌌 CONVERGENCE RARE — ${positiveSystems.length} systèmes convergent simultanément (${systemNames}). `
      + `${rankText} `
      + `Ton ${cz.animal} de ${cz.elem}, ton jour ${num.ppd.v} (${pdInfo.k}), `
      + `et l'hexagramme ${iching.hexNum} (${iching.name}) disent la même chose : `
      + `c'est MAINTENANT. Pas demain, pas la semaine prochaine. Aujourd'hui. `
      + `${topTheme ? `L'énergie dominante est ${topTheme.theme.toLowerCase()} — ${topTheme.strength} systèmes l'amplifient.` : ''} `
      + `Les fenêtres comme celle-ci ne restent pas ouvertes longtemps.`;
  } else if (conv.score >= 85) {
    narrative = `🌟 FENÊTRE GOLD — ${positiveSystems.length} systèmes positifs alignés. `
      + `${hexProfile ? `Le Yi King (${hexProfile.archetype}) confirme : "${hexProfile.judgment.split('.')[0]}."` : ''} `
      + `Ton énergie personnelle (${pdInfo.k}) est en résonance avec les cycles en cours. `
      + `${topTheme ? `La convergence pointe vers ${topTheme.theme.toLowerCase()} — utilise cette clarté.` : ''} `
      + `Ce n'est pas de la chance, c'est un alignement. Agis en conséquence.`;
  } else {
    narrative = `✦ FENÊTRE D'OPPORTUNITÉ — ${positiveSystems.length} systèmes favorables détectés. `
      + `Les conditions sont nettement au-dessus de la moyenne. `
      + `${topTheme ? `${topTheme.strength} systèmes convergent vers ${topTheme.theme.toLowerCase()}.` : ''} `
      + `Profite de cette dynamique pour avancer sur tes priorités — `
      + `ce type d'alignement ne dure pas éternellement.`;
  }

  // Actions spécifiques à la fenêtre
  const actions: string[] = [];
  if (topTheme) {
    const themeActions: Record<string, string> = {
      'Action': 'Lance le projet que tu repousses — les vents sont maximalement porteurs',
      'Expansion': 'Envoie le mail, passe l\'appel, signe le contrat — l\'expansion est soutenue',
      'Transformation': 'Coupe ce qui ne te sert plus — l\'univers soutient le changement',
      'Communication': 'Parle, publie, présente — ton message porte aujourd\'hui',
      'Créativité': 'Capture chaque idée — ton canal créatif est grand ouvert',
      'Structure': 'Finalise, organise, systématise — ta capacité de construction est décuplée',
      'Partenariat': 'Propose l\'alliance, initie la collaboration — les synergies sont maximales',
      'Introspection': 'Médite sur ta vision — les réponses qui viennent aujourd\'hui sont fiables',
      'Patience': 'Prépare tes fondations en silence — le timing parfait approche',
      'Prudence': 'Protège tes acquis — cette clarté te permet de voir les risques',
    };
    actions.push(themeActions[topTheme.theme] || `Concentre-toi sur ${topTheme.theme.toLowerCase()}`);
  }
  if (hexProfile) {
    actions.push(`Yi King : ${hexProfile.action}`);
  }
  if (conv.lunarNodes && conv.lunarNodes.alignment === 'conjoint') {
    actions.push('Les Nœuds Lunaires amplifient — tes décisions ont une portée karmique');
  }

  return {
    title: conv.score >= 90 ? '🌌 Convergence rare' : conv.score >= 85 ? '🌟 Alignement fort' : '✦ Fenêtre d\'Opportunité',
    narrative,
    systems: positiveSystems.map(s => s.system),
    strength: positiveSystems.length,
    rarity: rarity.rank ? `${rarity.icon} ${rarity.rank}${rarity.rank === 1 ? 'er' : 'ème'}/365 jours` : `${rarity.icon} ${rarity.label} (${rarity.percentage.toFixed(1)}%)`,
    actions: actions.slice(0, 3),
    icon: conv.score >= 90 ? '🌌' : conv.score >= 85 ? '🌟' : '✦',
  };
}

// ── V2.5: MICRO-DÉTAILS PLAUSIBLES (Cold Reading Algorithmique) ──
// 20 formules IF→THEN qui génèrent des phrases ultra-spécifiques
// Source: GPT feature 8 — "chaque phrase touche 2-3 conditions simultanées"
// Le secret : croiser des données que l'utilisateur ne pensait pas liées

function buildMicroDetails(
  num: NumerologyProfile,
  cz: ChineseZodiac,
  conv: ConvergenceResult,
  iching: IChingReading,
  astro: AstroChart | null,
  bd: string,
): MicroDetail[] {
  const details: MicroDetail[] = [];
  const pdv = num.ppd.v;
  const pyv = num.py.v;
  const lpv = num.lp.v;
  const bio = conv.biorhythm;
  const age = parseInt(new Date().getFullYear().toString()) - parseInt(bd.split('-')[0]);

  // ── 1. Triple maître + PD action → "Journée de fondateur"
  const masterCount = [num.lp, num.expr, num.soul, num.pers].filter(r => r.m).length;
  if (masterCount >= 2 && [1, 8, 11, 22].includes(pdv)) {
    details.push({
      text: `Avec ${masterCount} nombres maîtres et un jour ${pdv}, tu es en mode "fondateur" — les décisions que tu prends aujourd'hui ont un poids disproportionné sur les 9 prochains mois.`,
      sources: ['Nombres maîtres', 'Personal Day'],
      reliability: 'resonance',
    });
  }

  // ── 2. CdV 11 + Serpent/Dragon + PD introspection → "Le stratège silencieux"
  if (lpv === 11 && ['Serpent', 'Dragon'].includes(cz.animal) && [2, 7, 9].includes(pdv)) {
    details.push({
      text: `Aujourd'hui, ton mode naturel de stratège silencieux est amplifié. Tu vois des choses que les autres ne voient pas — ne force pas l'action, laisse les pièces se mettre en place.`,
      sources: ['CdV 11', `${cz.animal}`, 'PD ' + pdv],
      reliability: 'resonance',
    });
  }

  // ── 3. PY 1 + PD 1 → "Double démarrage"
  if (pyv === 1 && pdv === 1) {
    details.push({
      text: `Double 1 (année ET jour) — rare et puissant. Ce que tu inities aujourd'hui a le potentiel de définir toute ton année. Ne gaspille pas cette énergie sur du trivial.`,
      sources: ['Année personnelle 1', 'Personal Day 1'],
      reliability: 'resonance',
    });
  }

  // ── 4. Biorhythmes triple pic + PD action → "Pic de puissance"
  if (bio && bio.physical > 70 && bio.emotional > 70 && bio.intellectual > 70 && [1, 5, 8].includes(pdv)) {
    details.push({
      text: `Triple pic biorhythmique + jour d'action : ton corps, ton cœur et ton esprit sont synchronisés. Ce genre de journée arrive 2-3 fois par an maximum. Utilise-la.`,
      sources: ['Biorhythmes triple pic', `PD ${pdv}`],
      reliability: 'suggestif',
    });
  }

  // ── 5. Challenge 4 + PD 4/8 → "La discipline comme arme"
  const activeIdx = getActivePinnacleIdx(bd, new Date().toISOString().slice(0, 10), num.lp);
  const activeChallenge = num.challenges[activeIdx];
  if (activeChallenge && activeChallenge.v === 4 && [4, 8].includes(pdv)) {
    details.push({
      text: `Ton défi actuel (${activeChallenge.v} — Structure) résonne avec l'énergie du jour. C'est un jour où la discipline n'est pas une contrainte mais une arme. Ce que tu structures aujourd'hui te libère demain.`,
      sources: ['Challenge actif', `PD ${pdv}`],
      reliability: 'cycle',
    });
  }

  // ── 6. Leçons karmiques + PD correspondant → "La leçon frappe à la porte"
  if (num.kl.length > 0 && num.kl.includes(pdv)) {
    details.push({
      text: `Jour ${pdv} = ta leçon karmique. L'univers te remet face à ce que tu évites. Ce n'est pas une punition, c'est un entraînement — chaque confrontation te renforce.`,
      sources: ['Leçon karmique ' + pdv, 'Personal Day'],
      reliability: 'cycle',
    });
  }

  // ── 7. PY 9 + Lune décroissante → "Fin de cycle amplifiée"
  const moon = getMoonPhase();
  if (pyv === 9 && moon.phase >= 5) {
    details.push({
      text: `Année de clôture (9) + Lune décroissante : double signal de fin. Ce que tu retiens par peur te coûte plus cher que ce que tu libères. Lâche.`,
      sources: ['PY 9', moon.name],
      reliability: 'resonance',
    });
  }

  // ── 8. Animal Feu + PD Feu (1, 3, 9) + bio physique haut → "Combustion"
  if (cz.elem === 'Feu' && [1, 3, 9].includes(pdv) && bio && bio.physical > 60) {
    details.push({
      text: `Feu chinois + jour de feu + pic physique = combustion. Ton énergie est explosive aujourd'hui — canalise-la ou elle se dissipera en impatience.`,
      sources: [`${cz.animal} de Feu`, `PD ${pdv}`, 'Biorhythme physique'],
      reliability: 'suggestif',
    });
  }

  // ── 9. Expr=4 + PD créatif (3, 5) → "Le bâtisseur créatif"
  if (num.expr.v === 4 && [3, 5].includes(pdv)) {
    details.push({
      text: `Ton Expression 4 (bâtisseur) rencontre un jour créatif (${pdv}). Tu ne rêves pas juste — tu construis. Les idées que tu as aujourd'hui sont immédiatement opérationnelles.`,
      sources: ['Expression 4', `PD ${pdv}`],
      reliability: 'suggestif',
    });
  }

  // ── 10. Âme 11 + Lune haute illumination → "Canal intuitif"
  if (num.soul.v === 11 && moon.illumination > 80) {
    details.push({
      text: `Âme 11 + ${moon.name} (${moon.illumination}%) : ton intuition est en mode haute définition. Les impressions fugaces que tu as aujourd'hui méritent d'être notées — elles se confirmeront.`,
      sources: ['Âme 11', moon.name],
      reliability: 'resonance',
    });
  }

  // ── 11. Age 28-30 + PY 9 ou 1 → "Zone Saturn Return"
  if (age >= 28 && age <= 30 && (pyv === 9 || pyv === 1)) {
    details.push({
      text: `Tu es dans la zone du Retour de Saturne (${age} ans) + année ${pyv}. Tout ce que tu as construit jusqu'ici est testé. Ce qui résiste est authentique — le reste doit partir.`,
      sources: ['Saturn Return', `PY ${pyv}`],
      reliability: 'cycle',
    });
  }

  // ── 12. PD=PY → "Double vibration annuelle"
  if (pdv === pyv && pdv !== lpv) {
    details.push({
      text: `Jour ${pdv} = Année ${pyv} : double vibration. L'énergie de ton année entière est concentrée aujourd'hui. Ce que tu fais maintenant est un microcosme de ton année.`,
      sources: [`PD ${pdv}`, `PY ${pyv}`],
      reliability: 'resonance',
    });
  }

  // ── 13. Yin + PD pair + Lune décroissante → "Puissance du retrait"
  if (cz.yy === 'Yin' && pdv % 2 === 0 && moon.phase >= 5) {
    details.push({
      text: `Énergie Yin (${cz.animal}) + jour pair (${pdv}) + Lune descendante : ne confonds pas le calme avec l'inaction. Ta puissance aujourd'hui est dans le retrait stratégique.`,
      sources: [`${cz.czY} Yin`, `PD ${pdv}`, moon.name],
      reliability: 'suggestif',
    });
  }

  // ── 14. Transit exact astro + PD maître → "Pic cosmique"
  if (astro) {
    const exactTransits = astro.tr.filter(t => t.x);
    if (exactTransits.length > 0 && num.ppd.m) {
      details.push({
        text: `Transit exact (${PLANET_FR[exactTransits[0].tp]}) + Nombre Maître ${pdv} : alignement cosmique rare. L'impact de ce que tu fais aujourd'hui dépasse ta sphère personnelle.`,
        sources: ['Transit exact', `PD Maître ${pdv}`],
        reliability: 'resonance',
      });
    }
  }

  // ── 15. Pinnacle = Expression → "Zone de maîtrise"
  const activePinnacle = num.pinnacles[activeIdx];
  if (activePinnacle && activePinnacle.v === num.expr.v) {
    details.push({
      text: `Ton Pinnacle actuel (${activePinnacle.v}) = ton Expression : tu es dans ta zone de maîtrise absolue. Ce cycle de vie amplifie exactement ce que tu fais le mieux.`,
      sources: ['Pinnacle actif', 'Expression'],
      reliability: 'cycle',
    });
  }

  // ── 16. Nœuds + PY transition → "Carrefour karmique"
  if (conv.lunarNodes && conv.lunarNodes.isNodeReturn && (pyv === 1 || pyv === 9)) {
    details.push({
      text: `Retour des Nœuds + Année ${pyv} : carrefour karmique. Les choix que tu fais cette année déterminent la direction des 18 prochaines. Choisis avec ton âme, pas avec ta peur.`,
      sources: ['Retour des Nœuds', `PY ${pyv}`],
      reliability: 'cycle',
    });
  }

  // ── 17. Bio critique + PD 5/9 → "Jour de bascule"
  if (bio && bio.critical.length >= 2 && [5, 9].includes(pdv)) {
    details.push({
      text: `${bio.critical.length} biorhythmes en zone critique + jour ${pdv} (${getNumberInfo(pdv).k}) : journée de bascule. Les décisions prises sous cette tension sont souvent les plus justes — fais confiance à ton instinct, pas à ta logique.`,
      sources: ['Biorhythmes critiques', `PD ${pdv}`],
      reliability: 'suggestif',
    });
  }

  // ── 18. Maturité active (>45) + PD = Maturité → "Alignement de maturité"
  if (age >= 45 && pdv === num.mat.v) {
    details.push({
      text: `Jour ${pdv} = ton nombre de Maturité. Après 45 ans, ces jours sont tes jours de puissance maximale. Tu incarnes pleinement ton potentiel — agis depuis cette autorité.`,
      sources: ['Maturité', `PD ${pdv}`],
      reliability: 'cycle',
    });
  }

  // ── 19. Yi King créatif + PD 3 → "Explosion créative"
  const hexProfile = getHexProfile(iching.hexNum);
  if (hexProfile && /cré|innov|express|imagin/.test(hexProfile.archetype.toLowerCase()) && pdv === 3) {
    details.push({
      text: `Yi King du jour (${hexProfile.archetype}) + jour 3 (Expression) : explosion créative. Ce qui sort de toi aujourd'hui a une qualité inhabituelle — ne censure rien.`,
      sources: ['Yi King créatif', 'PD 3'],
      reliability: 'suggestif',
    });
  }

  // ── 20. Clash chinois dans l'année + PD prudent → "Vigilance relationnelle"
  if (cz.clash && [2, 4, 7].includes(pdv)) {
    details.push({
      text: `Ton clash chinois (${cz.clash.a}) peut se manifester aujourd'hui en jour ${pdv}. Reste vigilant dans les interactions — ce n'est pas le jour pour les confrontations directes.`,
      sources: ['Clash chinois', `PD ${pdv}`],
      reliability: 'suggestif',
    });
  }

  // ═══ V2.9: 15 NOUVELLES MICRO-DÉTAILS (audit Grok) ═══

  // ── 21. Chaldéen = PD + Expression → "Maître harmoniseur bâtisseur" (CYCLE)
  if (num.ch && num.ch.rd.v === pdv && pdv === num.expr.v % 10) {
    details.push({
      text: `Ton Chaldéen ${num.ch.rd.v} + Personal Day ${pdv} + Expression ${num.expr.v} = triple résonance vibratoire. Journée de maître harmoniseur — parfait pour négocier ou structurer.`,
      sources: ['Chaldéen', `PD ${pdv}`, 'Expression'],
      reliability: 'resonance',
    });
  }

  // ── 22. Nœud Nord Balance/Vierge + PD 2/6 + Animal diplomate → "Diplomate cosmique" (CYCLE)
  const natalNode = conv.lunarNodes?.natal;
  const natalNodeSign = natalNode?.northNode?.sign || '';
  const diplomatAnimals = ['Lapin', 'Chèvre', 'Cochon', 'Bœuf'];
  if (['Balance', 'Vierge'].includes(natalNodeSign) && [2, 6].includes(pdv) && diplomatAnimals.includes(cz.animal)) {
    details.push({
      text: `Nœud Nord en ${natalNodeSign} + Personal Day ${pdv} + alliance zodiacale = journée idéale pour alliances et négociations diplomatiques.`,
      sources: [`Nœud Nord ${natalNodeSign}`, `PD ${pdv}`, `Triade ${cz.animal}`],
      reliability: 'cycle',
    });
  }

  // ── 23. Mercure rétro + Yi King #52 (Montagne) ou E-tier + PD 7 → "Introspection puissante" (RESONANCE)
  const mercStatus = getMercuryStatus(new Date());
  const hexTier = getHexTier(iching.hexNum);
  if (mercStatus.phase !== 'direct' && (iching.hexNum === 52 || hexTier.tier === 'E') && [7, 4].includes(pdv)) {
    details.push({
      text: `${mercStatus.label} + Hexagramme ${iching.hexNum} (${hexTier.label}) + Jour ${pdv} = journée d'introspection puissante. Ne signe rien, analyse tout.`,
      sources: [mercStatus.label, `Yi King #${iching.hexNum}`, `PD ${pdv}`],
      reliability: 'resonance',
    });
  }

  // ── 24. Transit exact Jupiter + PY 3 + Lune croissante → "Fenêtre expansion créative" (RESONANCE)
  if (astro) {
    const jupiterExact = astro.tr?.find(t => t.tp === 'jupiter' && t.x);
    if (jupiterExact && [3, 5].includes(pyv) && moon.phase <= 3) {
      details.push({
        text: `Jupiter exact + Année ${pyv} + Lune croissante = fenêtre d'expansion créative exceptionnelle. Lance ton idée maintenant.`,
        sources: ['Transit Jupiter exact', `AP ${pyv}`, moon.name],
        reliability: 'resonance',
      });
    }
  }

  // ── 25. Triple maître + Nœud Nord Lion/Bélier + Dragon/Coq → "Leader visionnaire" (CYCLE)
  const masterCount2 = [num.lp, num.expr, num.soul, num.pers].filter(r => r.m).length;
  if (masterCount2 >= 2 && ['Lion', 'Bélier'].includes(natalNodeSign) && ['Dragon', 'Coq', 'Tigre'].includes(cz.animal)) {
    details.push({
      text: `Tes ${masterCount2} nombres maîtres + Nœud Nord en ${natalNodeSign} + ${cz.animal} = profil de leader visionnaire né pour impacter à grande échelle.`,
      sources: [`${masterCount2} maîtres`, `Nœud ${natalNodeSign}`, cz.animal],
      reliability: 'cycle',
    });
  }

  // ── 26. Leçon karmique 4/8 + Challenge 4/8 actif + PD 4/8 → "Test ultime" (CYCLE)
  if (num.kl.includes(4) && activeChallenge?.v === 4 && [4, 8].includes(pdv)) {
    details.push({
      text: `Leçon karmique 4 + Challenge 4 + Personal Day ${pdv} = test ultime de structure. Aujourd'hui tu poses les fondations de ta prochaine décennie.`,
      sources: ['Leçon 4', 'Challenge 4', `PD ${pdv}`],
      reliability: 'cycle',
    });
  } else if (num.kl.includes(8) && activeChallenge?.v === 8 && [4, 8].includes(pdv)) {
    details.push({
      text: `Leçon karmique 8 + Challenge 8 + Personal Day ${pdv} = l'univers te teste sur le pouvoir et l'argent. C'est le moment de la maîtrise.`,
      sources: ['Leçon 8', 'Challenge 8', `PD ${pdv}`],
      reliability: 'cycle',
    });
  }

  // ── 27. Bio triple pic + PD 5 + Animal Cheval/Tigre → "Aventurier maximum" (SUGGESTIF)
  if (bio && bio.physical > 70 && bio.emotional > 60 && bio.intellectual > 60 && pdv === 5 && ['Cheval', 'Tigre', 'Dragon'].includes(cz.animal)) {
    details.push({
      text: `Triple pic biorhythmique + Personal Day 5 + ${cz.animal} = énergie d'aventurier au maximum. Journée de mouvement et de liberté.`,
      sources: ['Bio triple pic', 'PD 5', cz.animal],
      reliability: 'suggestif',
    });
  }

  // ── 28. Yi King natal #1 Créateur + PY 1 + Lune nouvelle → "Triple nouveau départ" (RESONANCE)
  const natalHex = calcNatalIChing(bd);
  if (natalHex.hexNum === 1 && pyv === 1 && moon.phase === 0) {
    details.push({
      text: `Ton Yi King natal Créateur + Année Personnelle 1 + Lune nouvelle = triple nouveau départ cosmique. Plante les graines de ton empire.`,
      sources: ['Yi King natal #1', 'AP 1', 'Nouvelle Lune'],
      reliability: 'resonance',
    });
  }

  // ── 29. Nœud Sud Scorpion/Cancer + Soul 11 + PD 9 → "Transformation karmique" (CYCLE)
  const southNodeSign = natalNode?.southNode?.sign || '';
  if (['Scorpion', 'Cancer'].includes(southNodeSign) && num.soul.v === 11 && pdv === 9) {
    details.push({
      text: `Nœud Sud en ${southNodeSign} + Âme 11 + Personal Day 9 = journée de transformation profonde et de lâcher-prise karmique.`,
      sources: [`Nœud Sud ${southNodeSign}`, 'Âme 11', 'PD 9'],
      reliability: 'cycle',
    });
  }

  // ── 30. Mercure post-rétro + PD 3 + Expression 3/5 → "Explosion de clarté" (RESONANCE)
  if ((mercStatus.phase === 'post-shadow' || mercStatus.phase === 'stationary-direct') && pdv === 3 && [3, 5].includes(num.expr.v)) {
    details.push({
      text: `Mercure sortant de rétro + Personal Day 3 + Expression ${num.expr.v} = explosion de clarté et de communication créative. Ce que tu n'arrivais pas à formuler trouve enfin ses mots.`,
      sources: [mercStatus.label, 'PD 3', `Expression ${num.expr.v}`],
      reliability: 'resonance',
    });
  }

  // ── 31. Transit Saturne + Challenge 1 actif + PD 1 → "Test de leadership" (CYCLE)
  if (astro) {
    const saturnTransit = astro.tr?.find(t => t.tp === 'saturn' && (t.t === 'conjunction' || t.t === 'square'));
    if (saturnTransit && activeChallenge?.v === 1 && pdv === 1) {
      const satAspFr = saturnTransit.t === 'conjunction' ? 'conjonction' : 'carré';
      details.push({
        text: `Saturne en ${satAspFr} + Challenge 1 + Personal Day 1 = test de leadership. Aujourd'hui tu affirmes ton autorité ou tu la perds.`,
        sources: [`Transit Saturne ${satAspFr}`, 'Challenge 1', 'PD 1'],
        reliability: 'cycle',
      });
    }
  }

  // ── 32. Animal Serpent/Scorpion-like + Nœud Nord Scorpion + PD 8 → "Pouvoir transformateur" (CYCLE)
  if (['Serpent', 'Rat'].includes(cz.animal) && natalNodeSign === 'Scorpion' && pdv === 8) {
    details.push({
      text: `${cz.animal} + Nœud Nord Scorpion + Personal Day 8 = journée de pouvoir transformateur karmique. Tu maîtrises l'ombre là où les autres la fuient.`,
      sources: [cz.animal, 'Nœud Scorpion', 'PD 8'],
      reliability: 'cycle',
    });
  }

  // ── 33. Bio bas + Lune décroissante + PD 9 → "Clôture et lâcher-prise" (SUGGESTIF)
  if (bio && bio.average < -30 && moon.phase >= 5 && pdv === 9) {
    details.push({
      text: `Biorhythmes bas + Lune décroissante + Personal Day 9 = journée de clôture et de lâcher-prise. Termine ce qui doit l'être, ne commence rien de nouveau.`,
      sources: ['Bio bas', moon.name, 'PD 9'],
      reliability: 'suggestif',
    });
  }

  // ── 34. Yi King A-tier + PD 1/8 + Transit Jupiter → "Décision puissante" (RESONANCE)
  if (hexTier.tier === 'A' && [1, 8].includes(pdv)) {
    const hasJupiter = astro?.tr?.some(t => t.tp === 'jupiter' && (t.t === 'conjunction' || t.t === 'trine'));
    if (hasJupiter) {
      details.push({
        text: `Hexagramme ${iching.hexNum} (${hexTier.label}) + Personal Day ${pdv} + Jupiter favorable = journée de décision puissante. Tranche avec confiance.`,
        sources: [`Yi King A-tier`, `PD ${pdv}`, 'Jupiter'],
        reliability: 'resonance',
      });
    }
  }

  // ── 35. Maturité 6/11 + Âge 45+ + Nœud Nord Balance/Verseau → "Harmoniseur stratégique" (CYCLE)
  if ([6, 11].includes(num.mat.v) && age >= 45 && ['Balance', 'Verseau'].includes(natalNodeSign)) {
    details.push({
      text: `Maturité ${num.mat.v} + Nœud Nord en ${natalNodeSign} après 45 ans = entrée dans ton rôle d'harmoniseur et de médiateur stratégique. La seconde moitié de ta vie est ton chef-d'œuvre.`,
      sources: [`Maturité ${num.mat.v}`, `Nœud ${natalNodeSign}`, `Âge ${age}`],
      reliability: 'cycle',
    });
  }

  // ═══ V2.9.2: WOW MOMENTS — Combinaisons rares exceptionnelles (Grok R9) ═══

  const positiveSystems = conv.breakdown.filter(b => b.points > 0).length;

  // Alignement Total: triple pic bio + Yi King A + PD 1
  if (bio && bio.physical > 80 && bio.emotional > 80 && bio.intellectual > 80 && hexTier.tier === 'A' && pdv === 1) {
    const wow = WOW_MOMENTS['alignement_total'];
    details.push({
      text: `💎 ${wow.titre} — ${wow.signification.split('.')[0]}. ${wow.conseil}`,
      sources: ['Biorhythmes triple pic', 'Yi King A-tier', 'PD 1'],
      reliability: 'resonance',
    });
  }

  // Super Convergence Historique: 6+ systèmes positifs
  if (positiveSystems >= 6 && conv.score >= 80) {
    const wow = WOW_MOMENTS['super_convergence'];
    details.push({
      text: `🌌 ${wow.titre} — ${positiveSystems} systèmes alignés simultanément. ${wow.conseil}`,
      sources: [`${positiveSystems} systèmes positifs`, `Score ${conv.score}%`],
      reliability: 'resonance',
    });
  }

  // Créateur Maître: Yi King #1 + PD maître 11/22
  if (iching.hexNum === 1 && [11, 22].includes(pdv)) {
    const wow = WOW_MOMENTS['createur_maitre'];
    details.push({
      text: `⚡ ${wow.titre} — ${wow.signification.split('.')[0]}. ${wow.conseil}`,
      sources: ['Yi King #1 Créateur', `PD maître ${pdv}`],
      reliability: 'resonance',
    });
  }

  // Vague d'Or: score ≥ 75 3 jours de suite (estimé via score + momentum implicite)
  if (conv.score >= 85 && positiveSystems >= 5) {
    const wow = WOW_MOMENTS['vague_or'];
    details.push({
      text: `🏆 ${wow.titre} — ${wow.signification.split('.')[0]}. ${wow.conseil}`,
      sources: [`Score ${conv.score}%`, `${positiveSystems} systèmes`],
      reliability: 'resonance',
    });
  }

  // Œil du Cyclone: score ~50 avec volatilité (beaucoup de systèmes positifs ET négatifs)
  const negativeSystems = conv.breakdown.filter(b => b.points < 0).length;
  if (conv.score >= 45 && conv.score <= 55 && positiveSystems >= 4 && negativeSystems >= 3) {
    const wow = WOW_MOMENTS['oeil_cyclone'];
    details.push({
      text: `🌀 ${wow.titre} — ${wow.signification.split('.')[0]}. ${wow.conseil}`,
      sources: [`${positiveSystems} positifs`, `${negativeSystems} négatifs`, `Score ${conv.score}%`],
      reliability: 'suggestif',
    });
  }

  // ═══ V3.1: SIGNATURES UNIQUES — BaZi + Nuclear + Éclipses (audit Grok R4bis) ═══

  // ── 36. BaZi "same" + PD = LP → "Double racine" (CYCLE)
  if (conv.baziDaily && conv.baziDaily.relation === 'same' && pdv === lpv) {
    details.push({
      text: `Ton Day Master BaZi (${conv.baziDaily.dailyStem.chinese} ${conv.baziDaily.dailyStem.element}) est en résonance "même élément" ET ton PD = ton Chemin de Vie. Double racine : tu es aligné à 100% avec ta mission de vie aujourd'hui.`,
      sources: ['BaZi same element', `PD = CdV ${lpv}`],
      reliability: 'cycle',
    });
  }

  // ── 37. Nuclear Hex divergent (mainTier ≠ nuclearTier fortement) + PD introspection → "Surface trompeuse" (RESONANCE)
  if (conv.nuclearHex && conv.nuclearHex.mainTier !== conv.nuclearHex.nuclearTier) {
    const mainGood = ['A', 'B'].includes(conv.nuclearHex.mainTier);
    const nucBad = ['D', 'E'].includes(conv.nuclearHex.nuclearTier);
    const mainBad = ['D', 'E'].includes(conv.nuclearHex.mainTier);
    const nucGood = ['A', 'B'].includes(conv.nuclearHex.nuclearTier);
    if (mainGood && nucBad && [7, 4, 2].includes(pdv)) {
      details.push({
        text: `Surface favorable (Hex ${conv.nuclearHex.mainTier}-tier) mais fondation fragile (Nuclear ${conv.nuclearHex.nuclearTier}-tier). Ne te fie pas aux apparences aujourd'hui — creuse avant de signer.`,
        sources: ['I Ching surface', 'Hex Nucléaire profondeur', `PD ${pdv}`],
        reliability: 'resonance',
      });
    } else if (mainBad && nucGood && [1, 8].includes(pdv)) {
      details.push({
        text: `La surface semble difficile (Hex ${conv.nuclearHex.mainTier}-tier) mais les fondations sont solides (Nuclear ${conv.nuclearHex.nuclearTier}-tier). L'obstacle que tu vois est une illusion — pousse.`,
        sources: ['I Ching surface', 'Hex Nucléaire profondeur', `PD ${pdv}`],
        reliability: 'resonance',
      });
    }
  }

  // ── 38. BaZi "destroys" + Challenge actif → "Pression transformatrice" (CYCLE)
  if (conv.baziDaily && (conv.baziDaily.relation === 'destroys' || conv.baziDaily.relation === 'destroyed_by') && activeChallenge && [4, 8, 9].includes(pdv)) {
    details.push({
      text: `Conflit BaZi (${conv.baziDaily.dailyStem.element} ${conv.baziDaily.relation === 'destroys' ? 'détruit' : 'est détruit par'} ton Day Master) + Défi ${activeChallenge.v} actif. Pression transformatrice — ce qui te met mal à l'aise aujourd'hui est exactement ce que tu dois affronter.`,
      sources: ['BaZi conflit', `Challenge ${activeChallenge.v}`, `PD ${pdv}`],
      reliability: 'cycle',
    });
  }

  // ── 39. Éclipse récente (±5j) + PY 1 ou 9 → "Portail karmique" (CYCLE)
  const eclipseList = getEclipseList();
  const nowDate = new Date();
  const nearEclipse = eclipseList.find(e => {
    const d = new Date(e.date + 'T12:00:00');
    return Math.abs(d.getTime() - nowDate.getTime()) < 5 * 86400000;
  });
  if (nearEclipse && (pyv === 1 || pyv === 9)) {
    details.push({
      text: `Éclipse ${nearEclipse.type === 'solar' ? 'solaire' : 'lunaire'} (${nearEclipse.date}) + Année Personnelle ${pyv}. Double portail : les choix des prochains jours ont un impact disproportionné sur ton année entière.`,
      sources: [`Éclipse ${nearEclipse.type}`, `PY ${pyv}`],
      reliability: 'cycle',
    });
  }

  // ── 40. BaZi Liu He + PD 6/2 → "Alliance cachée" (RESONANCE)
  if (conv.baziDaily && conv.baziDaily.liuHeMatch && [2, 6].includes(pdv)) {
    details.push({
      text: `六合 Liu He (harmonie cachée BaZi) + jour ${pdv} (${getNumberInfo(pdv).k}). Les alliances que tu noues aujourd'hui ont une qualité invisible — quelqu'un que tu rencontres ou contactes aujourd'hui jouera un rôle clé plus tard.`,
      sources: ['BaZi Liu He', `PD ${pdv}`],
      reliability: 'resonance',
    });
  }

  // ── 41. Convergence contextuelle : meilleur domaine ≥ 80 → "Zone de génie" (SUGGESTIF)
  if (conv.contextualScores) {
    const best = conv.contextualScores.domains.find(d => d.domain === conv.contextualScores!.bestDomain);
    const worst = conv.contextualScores.domains.find(d => d.domain === conv.contextualScores!.worstDomain);
    if (best && best.score >= 80 && worst && worst.score <= 35) {
      details.push({
        text: `${best.icon} ${best.label} à ${best.score}% vs ${worst.icon} ${worst.label} à ${worst.score}% — polarisation extrême. Concentre-toi à 100% sur le ${best.label.toLowerCase()} aujourd'hui et reporte tout le reste.`,
        sources: ['Scoring contextuel', `${best.label} ${best.score}%`, `${worst.label} ${worst.score}%`],
        reliability: 'suggestif',
      });
    }
  }

  // ═══ V3.2: 25 NOUVELLES MICRO-DÉTAILS (#42-66) — 10 Gods, Essences, Confiance, Meta-Score ═══

  // Récupérer les 10 Gods et Essence depuis conv (si disponibles)
  const tenGods = conv.tenGods as TenGodsResult | null | undefined;
  const essAlign = (conv as any).essenceAlignment as string | undefined;
  const confidence = (conv as any).confidence as ConfidenceResult | undefined;
  const metaScore = (conv as any).metaScore as MetaScore | undefined;

  // ── 42. Wealth God + PY 8 + Essence alignée CdV → "Attraction financière" (RESONANCE)
  if (tenGods?.dominant?.god === 'zheng_cai' && pyv === 8 && essAlign === 'cdv') {
    details.push({
      text: `正財 Richesse Directe + Année de Récolte (PY 8) + Essence alignée sur ton Chemin de Vie. L'argent n'est pas un objectif aujourd'hui — c'est un sous-produit de ton alignement. Chaque action génère de la valeur presque malgré toi.`,
      sources: ['10 Gods 正財', 'PY 8', 'Essence = CdV'],
      reliability: 'resonance',
    });
  }

  // ── 43. Officer God + Challenge actif + Mercure rétro → "Test hiérarchique" (CYCLE)
  if (tenGods?.dominant && (tenGods.dominant.god === 'zheng_guan' || tenGods.dominant.god === 'qi_sha') && activeChallenge && mercStatus.phase !== 'direct') {
    details.push({
      text: `${tenGods.dominant.label} + Challenge ${activeChallenge.v} + ${mercStatus.label}. Quelqu'un au-dessus de toi dans la hiérarchie va te tester. Ce n'est pas de la malveillance — c'est le système qui vérifie si tu es prêt pour le niveau suivant.`,
      sources: ['10 Gods Officer', `Challenge ${activeChallenge.v}`, mercStatus.label],
      reliability: 'cycle',
    });
  }

  // ── 44. Resource God + PD introspection + Lune décroissante → "Sagesse silencieuse" (RESONANCE)
  if (tenGods?.dominant && (tenGods.dominant.god === 'zheng_yin' || tenGods.dominant.god === 'pian_yin') && [7, 9].includes(pdv) && moon.phase >= 5) {
    details.push({
      text: `${tenGods.dominant.label} (Ressource/Mentor) + jour ${pdv} + Lune décroissante. Ce n'est pas un jour pour chercher des réponses à l'extérieur — la sagesse dont tu as besoin est déjà en toi. Médite, marche, ralentis.`,
      sources: ['10 Gods Resource', `PD ${pdv}`, 'Lune décroissante'],
      reliability: 'resonance',
    });
  }

  // ── 45. Output God (食神) + PD 3 + Yi King A-tier → "Créativité canalisée" (RESONANCE)
  if (tenGods?.dominant?.god === 'shi_shen' && pdv === 3 && hexTier.tier === 'A') {
    details.push({
      text: `食神 Eating God (créativité pure) + Jour 3 (Expression) + Yi King A-tier. Ton canal créatif est grand ouvert. Ce qui sort de toi aujourd'hui n'est pas juste bon — c'est un chef-d'œuvre en puissance. Ne filtre rien.`,
      sources: ['10 Gods 食神', 'PD 3', 'Yi King A-tier'],
      reliability: 'resonance',
    });
  }

  // ── 46. 七殺 Seven Killings + PD 1/8 + Bio physique >70 → "Guerrier stratège" (SUGGESTIF)
  if (tenGods?.dominant?.god === 'qi_sha' && [1, 8].includes(pdv) && bio && bio.physical > 70) {
    details.push({
      text: `七殺 Seven Killings (compétition) + Jour ${pdv} (${getNumberInfo(pdv).k}) + Pic physique. Tu es en mode guerrier stratège — l'énergie est agressive mais contrôlable. Utilise cette force pour négocier dur ou trancher un conflit qui traîne.`,
      sources: ['10 Gods 七殺', `PD ${pdv}`, 'Bio physique pic'],
      reliability: 'suggestif',
    });
  }

  // ── 47. Essence = Leçon Karmique + Retour des Nœuds → "Test de vie" (CYCLE)
  if (essAlign === 'karmic' && conv.lunarNodes?.isNodeReturn) {
    details.push({
      text: `Ton Essence annuelle active une leçon karmique ET les Nœuds Lunaires sont en retour. Double test cosmique — cette année est un examen de passage. Ce que tu évites depuis des années te sera présenté, et cette fois tu ne pourras pas détourner le regard.`,
      sources: ['Essence karmique', 'Retour des Nœuds', 'Double test'],
      reliability: 'cycle',
    });
  }

  // ── 48. Essence = Soul + PD = Âme + Pleine Lune → "Alignement émotionnel total" (RESONANCE)
  if (essAlign === 'soul' && pdv === num.soul.v && moon.phase === 4) {
    details.push({
      text: `Essence annuelle = Âme + PD = Âme + Pleine Lune. Triple alignement émotionnel — tes désirs profonds sont illuminés. Ce que tu ressens aujourd'hui est la vérité de ce que tu veux vraiment. Écoute sans juger.`,
      sources: ['Essence = Soul', `PD = Âme ${num.soul.v}`, 'Pleine Lune'],
      reliability: 'resonance',
    });
  }

  // ── 49. Confiance > 85 + Score > 75 → "Signal pur — fonce" (RESONANCE)
  if (confidence && confidence.ratio >= 85 && conv.score >= 75) {
    details.push({
      text: `Confiance algorithmique ${confidence.ratio}% + Score ${conv.score}%. Tous les systèmes pointent dans la même direction sans contradiction. C'est rare — quand le signal est aussi pur, l'hésitation est ton seul ennemi.`,
      sources: [`Confiance ${confidence.ratio}%`, `Score ${conv.score}%`, 'Signal unanime'],
      reliability: 'resonance',
    });
  }

  // ── 50. Confiance < 40 + Score moyen → "Chaos créatif" (SUGGESTIF)
  if (confidence && confidence.ratio < 40 && conv.score >= 40 && conv.score <= 60) {
    details.push({
      text: `Confiance ${confidence.ratio}% + Score neutre ${conv.score}%. Les systèmes se contredisent — ce n'est PAS un jour calme, c'est un jour chaotique déguisé en neutralité. Les opportunités existent mais elles sont cachées dans le bruit.`,
      sources: [`Confiance ${confidence.ratio}%`, `Score ${conv.score}%`, 'Vents contraires'],
      reliability: 'suggestif',
    });
  }

  // ── 51. 比肩 Bi Jian + PD = CdV + BaZi same → "Triple identité" (CYCLE)
  if (tenGods?.dominant?.god === 'bi_jian' && pdv === lpv && conv.baziDaily?.relation === 'same') {
    details.push({
      text: `比肩 Shoulder (identité) + PD = Chemin de Vie + BaZi même élément. Triple résonance identitaire — tu es TOI à 100% aujourd'hui. Pas de masque, pas de compromis. Ce que tu décides maintenant porte ta signature la plus profonde.`,
      sources: ['10 Gods 比肩', `PD = CdV ${lpv}`, 'BaZi same'],
      reliability: 'cycle',
    });
  }

  // ── 52. 傷官 Hurting Officer + Mercure rétro + PD 3 → "Parole dangereuse" (RESONANCE)
  if (tenGods?.dominant?.god === 'shang_guan' && mercStatus.phase !== 'direct' && pdv === 3) {
    details.push({
      text: `傷官 Hurting Officer + ${mercStatus.label} + Jour 3 (Communication). Ta langue est aiguisée mais le terrain est miné. Chaque mot que tu prononces a un impact disproportionné — choisis-les avec un soin chirurgical.`,
      sources: ['10 Gods 傷官', mercStatus.label, 'PD 3'],
      reliability: 'resonance',
    });
  }

  // ── 53. 10 Gods Business > 5 + Contextuel Business > 70 + PY 8 → "Machine à valeur" (RESONANCE)
  if (tenGods && tenGods.businessPts > 5 && conv.contextualScores) {
    const bizScore = conv.contextualScores.domains.find(d => d.domain === 'BUSINESS');
    if (bizScore && bizScore.score > 70 && pyv === 8) {
      details.push({
        text: `10 Gods orientés business + Score Business ${bizScore.score}% + Année 8 (Récolte). Aujourd'hui tu es une machine à créer de la valeur. Chaque interaction, chaque email, chaque décision peut générer du retour concret.`,
        sources: ['10 Gods business', `Business ${bizScore.score}%`, 'PY 8'],
        reliability: 'resonance',
      });
    }
  }

  // ── 54. Essence = Challenge + 七殺 + PD difficile → "Tempête parfaite" (CYCLE)
  if (essAlign === 'challenge' && tenGods?.dominant?.god === 'qi_sha' && activeChallenge && pdv === activeChallenge.v) {
    details.push({
      text: `Essence = Challenge actif + 七殺 Seven Killings + PD = Défi de vie. Tempête parfaite — trois systèmes convergent vers la même friction. Ce n'est pas un mauvais jour — c'est le jour où tu grandis le plus vite, si tu tiens bon.`,
      sources: ['Essence challenge', '10 Gods 七殺', `PD = Challenge ${activeChallenge.v}`],
      reliability: 'cycle',
    });
  }

  // ── 55. 偏財 Pian Cai + PD 5 + Animal Cheval/Dragon → "Risque calculé" (SUGGESTIF)
  if (tenGods?.dominant?.god === 'pian_cai' && pdv === 5 && ['Cheval', 'Dragon', 'Singe'].includes(cz.animal)) {
    details.push({
      text: `偏財 Richesse Indirecte (偏 = risqué) + Jour 5 (Changement) + ${cz.animal}. L'argent est accessible mais par des voies non conventionnelles. Prends un risque CALCULÉ — pas un pari aveugle, un mouvement audacieux avec un plan B.`,
      sources: ['10 Gods 偏財', 'PD 5', cz.animal],
      reliability: 'suggestif',
    });
  }

  // ── 56. 正印 Zheng Yin + Pinnacle = Expression + Lune croissante → "Mentor invisible" (CYCLE)
  if (tenGods?.dominant?.god === 'zheng_yin' && activePinnacle && activePinnacle.v === num.expr.v && moon.phase >= 1 && moon.phase <= 3) {
    details.push({
      text: `正印 Direct Resource (mentor) + Pinnacle = Expression + Lune croissante. Un mentor, un livre, un message va apparaître aujourd'hui et t'offrir exactement ce dont tu as besoin pour avancer dans ta zone de maîtrise.`,
      sources: ['10 Gods 正印', 'Pinnacle = Expression', 'Lune croissante'],
      reliability: 'cycle',
    });
  }

  // ── 57. Meta-Score confirmé + PD = CdV → "Journée signature" (RESONANCE)
  if (metaScore?.isConfirmed && pdv === lpv) {
    details.push({
      text: `Meta-Score confirmé (${metaScore.narrative.split('—')[0].trim()}) + PD = Chemin de Vie. Journée signature — le score ET la confiance sont alignés avec ta mission de vie. Ce que tu fais aujourd'hui définit ta trajectoire.`,
      sources: ['Meta-Score confirmé', `PD = CdV ${lpv}`],
      reliability: 'resonance',
    });
  }

  // ── 58. 10 Gods Relations > 4 + PD 2/6 + Liu He → "Diplomate né" (RESONANCE)
  if (tenGods && tenGods.relationsPts > 4 && [2, 6].includes(pdv) && conv.baziDaily?.liuHeMatch) {
    details.push({
      text: `10 Gods orientés relations + Jour ${pdv} (${getNumberInfo(pdv).k}) + 六合 Liu He. Tu dégages une aura diplomatique naturelle aujourd'hui. Les gens vont vouloir collaborer avec toi — dis OUI aux propositions qui arrivent.`,
      sources: ['10 Gods relations', `PD ${pdv}`, 'Liu He'],
      reliability: 'resonance',
    });
  }

  // ── 59. Confiance > 80 + Score < 35 + PD = Challenge → "Retrait stratégique impératif" (CYCLE)
  if (confidence && confidence.ratio >= 80 && conv.score < 35 && activeChallenge && pdv === activeChallenge.v) {
    details.push({
      text: `Signal fort négatif (confiance ${confidence.ratio}%) + Score ${conv.score}% + PD = Challenge. TOUS les systèmes te disent la même chose : pas aujourd'hui. Ce n'est pas de la lâcheté — c'est de l'intelligence stratégique pure.`,
      sources: [`Confiance ${confidence.ratio}%`, `Score ${conv.score}%`, `PD = Challenge ${activeChallenge.v}`],
      reliability: 'cycle',
    });
  }

  // ── 60. 10 Gods Créativité > 4 + Essence Soul + Hexagramme créatif → "Flow state" (SUGGESTIF)
  if (tenGods && tenGods.creativityPts > 4 && essAlign === 'soul' && hexProfile && /cré|innov|express|imagin/.test(hexProfile.archetype.toLowerCase())) {
    details.push({
      text: `10 Gods créativité + Essence = Âme + Yi King créatif (${hexProfile.archetype}). Tu es aux portes du flow state — cet état où le temps disparaît et où la qualité de ce que tu produis te surprend toi-même. Élimine toute distraction.`,
      sources: ['10 Gods créativité', 'Essence = Soul', 'Yi King créatif'],
      reliability: 'suggestif',
    });
  }

  // ── 61. 劫財 Jie Cai + PD 8 + Clash chinois → "Compétition financière" (RESONANCE)
  if (tenGods?.dominant?.god === 'jie_cai' && pdv === 8 && cz.clash) {
    details.push({
      text: `劫財 Rob Wealth (compétition) + Jour 8 (Pouvoir) + Clash zodiacal. Quelqu'un convoite ce qui est à toi — client, position, idée. Ce n'est pas le moment de la générosité. Protège tes acquis avec fermeté.`,
      sources: ['10 Gods 劫財', 'PD 8', 'Clash chinois'],
      reliability: 'resonance',
    });
  }

  // ── 62. 正官 Zheng Guan + PY 4 + Bio intellectuel > 80 → "Structurateur suprême" (CYCLE)
  if (tenGods?.dominant?.god === 'zheng_guan' && pyv === 4 && bio && bio.intellectual > 80) {
    details.push({
      text: `正官 Officer Direct (structure) + Année 4 (Structuration) + Pic intellectuel. Tu penses avec une clarté cristalline sur les questions d'organisation. Le système ou le processus que tu mets en place aujourd'hui sera encore debout dans 5 ans.`,
      sources: ['10 Gods 正官', 'PY 4', 'Bio intellectuel pic'],
      reliability: 'cycle',
    });
  }

  // ── 63. 10 Gods 正 (harmonieux) + Confiance > 70 + Score > 65 → "Courant porteur" (RESONANCE)
  if (tenGods?.dominant?.isZheng && confidence && confidence.ratio > 70 && conv.score > 65) {
    details.push({
      text: `10 Gods harmonieux (正) + Signal fiable (${confidence.ratio}%) + Score ${conv.score}%. Tu es dans un courant porteur — pas besoin de forcer. Les bonnes choses arrivent naturellement quand tu es aligné comme ça.`,
      sources: ['10 Gods 正', `Confiance ${confidence.ratio}%`, `Score ${conv.score}%`],
      reliability: 'resonance',
    });
  }

  // ── 64. 10 Gods 偏 (agressif) + Confiance < 50 → "Opportunité cachée dans le chaos" (SUGGESTIF)
  if (tenGods?.dominant && !tenGods.dominant.isZheng && confidence && confidence.ratio < 50) {
    details.push({
      text: `10 Gods 偏 (version agressive) + Vents contraires. Les systèmes sont en désaccord, le God actif est agressif — mais c'est exactement dans ce type de chaos que les meilleurs deals se négocient. Sois un opportuniste froid.`,
      sources: ['10 Gods 偏', `Confiance ${confidence.ratio}%`, 'Chaos productif'],
      reliability: 'suggestif',
    });
  }

  // ── 65. Essence CdV + PD = CdV + Pinnacle = CdV → "Triple alignement mission" (CYCLE — WOW)
  if (essAlign === 'cdv' && pdv === lpv && activePinnacle && activePinnacle.v === lpv) {
    details.push({
      text: `💎 TRIPLE ALIGNEMENT MISSION : Essence annuelle = CdV ${lpv}, PD = CdV ${lpv}, Pinnacle = CdV ${lpv}. Ce type de convergence ne se produit que quelques jours par DÉCENNIE. Tu incarnes ta mission de vie à chaque respiration — ce que tu fais aujourd'hui résonnera pendant des années.`,
      sources: ['Essence = CdV', `PD = CdV ${lpv}`, `Pinnacle = CdV ${lpv}`],
      reliability: 'cycle',
    });
  }

  // ── 66. 食神 + 偏財 dans hidden + PY 3 + Bio émotionnel > 70 → "Alchimiste créatif" (SUGGESTIF — WOW)
  if (tenGods && tenGods.gods.some(g => g.god === 'shi_shen') && tenGods.gods.some(g => g.god === 'pian_cai') && pyv === 3 && bio && bio.emotional > 70) {
    details.push({
      text: `⚡ ALCHIMISTE CRÉATIF : 食神 (création) + 偏財 (opportunisme) + Année 3 (Expression) + Pic émotionnel. Tu peux transformer une idée en argent aujourd'hui — pas demain, pas la semaine prochaine, AUJOURD'HUI. L'émotion est le carburant et le talent est le véhicule.`,
      sources: ['10 Gods 食神+偏財', 'PY 3', 'Bio émotionnel pic'],
      reliability: 'suggestif',
    });
  }

  // V2.8: Tri par fiabilité (cycle > resonance > suggestif) puis limiter à 9
  // Les 'cycle' vont aux étapes 1,3 du prompt (paradoxe, leçons)
  // Les 'suggestif' vont à l'étape 8 (aujourd'hui) — cold reading pur
  const tierOrder = { cycle: 0, resonance: 1, suggestif: 2 };
  details.sort((a, b) => tierOrder[a.reliability] - tierOrder[b.reliability]);
  return details.slice(0, 12);  // V4.1: 12 max (was 9) — UI gère le depth progressif via visits
}

// ══════════════════════════════════════
// ═══ PATTERN INJECTION (V3.0) ═══
// ══════════════════════════════════════
// Injecte les patterns détectés dans les blocs Past/Present/Future

function injectPatternsIntoPast(past: ReadingBlock, patterns: Pattern[]): void {
  // Injecter les cycle mirrors et karmic echoes (passé)
  const pastPatterns = patterns.filter(p =>
    !p.predictive && (p.type === 'cycle_mirror' || p.type === 'karmic_echo')
  );
  for (const pat of pastPatterns.slice(0, 2)) {
    past.insights.push({
      text: pat.narrative,
      sources: pat.systems,
      intensity: pat.intensity === 'flippant' ? 'forte' : 'moyenne',
      icon: pat.type === 'cycle_mirror' ? '🔄' : '⚡',
    });
  }
}

function injectPatternsIntoPresent(present: ReadingBlock, patterns: Pattern[], rhythm: PatternDetectionResult['rhythm']): void {
  // Injecter element convergence + pinnacle×PY resonance (présent)
  const presentPatterns = patterns.filter(p =>
    !p.predictive && (p.type === 'element_convergence' || p.type === 'pinnacle_py_resonance')
  );
  for (const pat of presentPatterns.slice(0, 2)) {
    present.insights.push({
      text: pat.narrative,
      sources: pat.systems,
      intensity: pat.intensity === 'flippant' ? 'forte' : 'moyenne',
      icon: pat.type === 'element_convergence' ? '🔥' : '⚙️',
    });
  }

  // V3.1: Injecter Éclipse Karmique (présent ou futur proche)
  const eclipsePatterns = patterns.filter(p => p.type === 'eclipse_karmique' && !p.predictive);
  for (const pat of eclipsePatterns.slice(0, 1)) {
    present.insights.push({
      text: `${pat.narrative} → ${pat.insight}`,
      sources: pat.systems,
      intensity: pat.intensity === 'flippant' ? 'forte' : 'moyenne',
      icon: '🌑',
    });
  }

  // V3.1: Injecter BaZi Cycle Master
  const baziPatterns = patterns.filter(p => p.type === 'bazi_cycle_master' && p.intensity !== 'notable');
  for (const pat of baziPatterns.slice(0, 1)) {
    present.insights.push({
      text: pat.narrative,
      sources: pat.systems,
      intensity: pat.intensity === 'flippant' ? 'forte' : 'moyenne',
      icon: '干',
    });
  }

  // V3.2: Injecter Void Course + Resonance Leap + Phantom Loop + Systemic Burnout
  const voidCourse = patterns.filter(p => p.type === 'void_course');
  for (const pat of voidCourse.slice(0, 1)) {
    present.insights.push({
      text: `${pat.narrative} → ${pat.insight}`,
      sources: pat.systems,
      intensity: 'forte',
      icon: '🌙',
    });
  }

  const resLeap = patterns.filter(p => p.type === 'resonance_leap');
  for (const pat of resLeap.slice(0, 1)) {
    present.insights.push({
      text: pat.narrative,
      sources: pat.systems,
      intensity: pat.intensity === 'flippant' ? 'forte' : 'moyenne',
      icon: '🔁',
    });
  }

  const phantomLoop = patterns.filter(p => p.type === 'phantom_loop');
  for (const pat of phantomLoop.slice(0, 1)) {
    present.insights.push({
      text: `${pat.narrative} → ${pat.insight}`,
      sources: pat.systems,
      intensity: pat.intensity === 'flippant' ? 'forte' : 'moyenne',
      icon: '👻',
    });
  }

  const burnout = patterns.filter(p => p.type === 'systemic_burnout');
  for (const pat of burnout.slice(0, 1)) {
    present.insights.push({
      text: `⚠️ ${pat.narrative} → ${pat.insight}`,
      sources: pat.systems,
      intensity: 'forte',
      icon: '🔥',
    });
  }

  // Injecter l'archétype de vie (life rhythm)
  present.insights.push({
    text: `Archétype de vie détecté : ${rhythm.archetype}. ${rhythm.description}`,
    sources: ['Analyse cyclique 20+ ans', 'Pattern Detection', ...rhythm.evidence.slice(0, 1)],
    intensity: 'forte',
    icon: '🧬',
  });
}

function injectPatternsIntoFuture(future: ReadingBlock, patterns: Pattern[]): void {
  // Injecter les predictive convergences (futur)
  const futurePatterns = patterns.filter(p => p.predictive && p.type === 'predictive_convergence');
  for (const pat of futurePatterns.slice(0, 2)) {
    future.insights.push({
      text: `${pat.narrative} → ${pat.insight}`,
      sources: pat.systems,
      intensity: pat.intensity === 'flippant' ? 'forte' : 'moyenne',
      icon: '🔮',
    });
  }

  // V3.1: Injecter éclipses karmiques futures
  const futureEclipses = patterns.filter(p => p.predictive && p.type === 'eclipse_karmique');
  for (const pat of futureEclipses.slice(0, 1)) {
    future.insights.push({
      text: `${pat.narrative} → ${pat.insight}`,
      sources: pat.systems,
      intensity: pat.intensity === 'flippant' ? 'forte' : 'moyenne',
      icon: '🌑',
    });
  }

  // Injecter les cycle mirrors prédictifs
  const predictiveMirrors = patterns.filter(p => p.predictive && p.type === 'cycle_mirror');
  for (const pat of predictiveMirrors.slice(0, 1)) {
    future.insights.push({
      text: pat.insight,
      sources: pat.systems,
      intensity: 'forte',
      icon: '🔄',
    });
  }
}

/** Convertit les patterns "flippant" en micro-détails prioritaires */
function patternsMicroDetails(patterns: Pattern[]): MicroDetail[] {
  return patterns
    .filter(p => p.intensity === 'flippant')
    .slice(0, 3)
    .map(p => ({
      text: `${p.narrative.split('.').slice(0, 2).join('.')}. ${p.insight}`,
      sources: p.systems.slice(0, 3),
      reliability: p.type === 'karmic_echo' || p.type === 'cycle_mirror' ? 'cycle' as const
        : p.type === 'eclipse_karmique' || p.type === 'bazi_cycle_master' ? 'cycle' as const
        : p.type === 'phantom_loop' || p.type === 'systemic_burnout' ? 'resonance' as const
        : p.type === 'void_course' || p.type === 'resonance_leap' ? 'resonance' as const
        : 'resonance' as const,
    }));
}

// ══════════════════════════════════════
// ═══ EXPORT PRINCIPAL ═══
// ══════════════════════════════════════

export function generateStrategicReading(data: {
  num: NumerologyProfile;
  astro: AstroChart | null;
  cz: ChineseZodiac;
  iching: IChingReading;
  conv: ConvergenceResult;
}, bd: string, today?: string, gender: 'M' | 'F' = 'M', birthHour?: number): StrategicReading {
  const t = today || getTodayStr();
  const { num, astro, cz, iching, conv } = data;

  // Generate Life Timeline (crosses Pinnacles × PY × Transits)
  const timeline = generateLifeTimeline(num, cz, bd, t);

  // V3.0: Pattern Detection Engine
  const patterns = detectPatterns(num, cz, bd, t);

  // V4.2: Luck Pillars pour croisement temporel Passé/Présent
  let luckPillars: ReturnType<typeof calculateLuckPillars> | null = null;
  try { luckPillars = calculateLuckPillars(new Date(bd + 'T12:00:00'), gender); } catch { /* */ }

  // V4.2: Four Pillars si heure dispo
  let fourPillars: FourPillars | null = null;
  if (birthHour !== undefined) {
    try { fourPillars = calcFourPillars(new Date(bd + 'T12:00:00'), birthHour); } catch { /* */ }
  }

  // V4.2: Forecast 6 mois pour bloc Futur concret
  let forecast6: MonthForecast[] = [];
  try { forecast6 = generateForecast36Months(bd, num, cz, undefined, 0, astro ?? null).slice(0, 6); } catch { /* */ }

  const past = buildPast(num, astro, cz, bd, t, timeline, luckPillars, fourPillars);
  const present = buildPresent(num, astro, cz, iching, conv, bd, t, luckPillars);
  const future = buildFuture(num, astro, cz, iching, conv, bd, t, luckPillars, forecast6);

  // V3.0: Injecter les patterns dans Past/Present/Future
  injectPatternsIntoPast(past, patterns.patterns);
  injectPatternsIntoPresent(present, patterns.patterns, patterns.rhythm);
  injectPatternsIntoFuture(future, patterns.patterns);

  const crossings = detectCrossings(num, astro, cz, iching, conv);
  const actionPlan = buildActionPlan(crossings, conv, iching, num);
  const portrait = timeline.portrait; // Portrait from Life Timeline Engine
  const todayVerdict = buildVerdict(conv, crossings, iching);

  // V2.5: Fenêtre Majeure (score ≥75 + 5+ systèmes positifs)
  const majorWindow = buildMajorWindow(conv, crossings, num, cz, iching);

  // V2.5: Micro-détails "c'est exactement moi" (cold reading algorithmique)
  const microDetails = buildMicroDetails(num, cz, conv, iching, astro, bd);

  // V3.0: Ajouter les patterns flippants aux micro-détails (priorité haute)
  const patternMicros = patternsMicroDetails(patterns.patterns);
  microDetails.unshift(...patternMicros);

  // V2.9.1: Contradictions inter-systèmes (audit Grok R2+R3)
  const contradictions = detectContradictions(conv, iching, num);

  return { past, present, future, crossings, actionPlan, portrait, todayVerdict, timeline, majorWindow, microDetails, contradictions, patterns };
}
