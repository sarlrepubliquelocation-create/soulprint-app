// ═══ PATTERN DETECTION ENGINE V4.0 ═══
// V4.0 Fixes:
//   - Cycle Mirror : exige transit OU pinnacle (supprime artefacts "notable")
//   - Predictive Convergence : éclipses réduites de +4 à +2 (solaires uniquement)
//
// V3.2 (audit Round 5+6+7 — Gemini+Claude) :
//   - Void Course : Lune en void of course + PD observation → inaction forcée (~0.6%)
//   - Resonance Leap : PY saute de même PD 2x en 7j → signal récurrent (~1.2%)
//   - Phantom Loop : convergence cyclique PPCM(9,60)=180j → déjà-vu algorithmique (~0.15%)
//   - Systemic Burnout : 5+ systèmes négatifs simultanément → surcharge (~3%)
//
// V3.1: Lo Shu corrigé, Cycle Mirror durci, Element seuil 4, Predictive pondéré ≥12,
//        Éclipse Karmique, BaZi Cycle Master
//
// 12 détecteurs :
//   1-8: V3.1 (Cycle Mirror, Karmic Echo, Pinnacle×PY, Element Conv, Life Rhythm,
//          Predictive Conv, Éclipse Karmique, BaZi Cycle Master)
//   9.  Void Course — quand agir est futile
//  10.  Resonance Leap — signal récurrent en 7 jours
//  11.  Phantom Loop — déjà-vu cyclique 180 jours
//  12.  Systemic Burnout — tous les systèmes contre toi
//
// Consomme : numerology.ts, moon.ts, iching.ts, chinese-zodiac.ts, convergence.ts
// Consommé par : strategic-reading.ts (enrichit les insights)

import {
  type NumerologyProfile, type Reduced,
  calcPersonalYear, calcPersonalMonth, calcPersonalDay, reduce,
  getNumberInfo, getActivePinnacleIdx,
} from './numerology';
import { type ChineseZodiac } from './chinese-zodiac';
import { calcNatalIChing, getHexTier, calcIChing } from './iching';
import {
  getRetroSchedule, getEclipseList, getMercuryStatus,
  calcLunarNodes, getNodeKeyMoments, getMoonPhase, getMoonTransit,
} from './moon';
import { type PinnacleInfo } from './temporal';
import { calcBaZiDaily, calc10Gods } from './bazi';

// ══════════════════════════════════════
// ═══ TYPES ═══
// ══════════════════════════════════════

export type PatternType =
  | 'cycle_mirror'
  | 'karmic_echo'
  | 'pinnacle_py_resonance'
  | 'element_convergence'
  | 'life_rhythm'
  | 'predictive_convergence'
  | 'eclipse_karmique'     // V3.1: Gemini R4bis — éclipse × challenge × BaZi (~1.2%)
  | 'bazi_cycle_master'    // V3.1: Grok R4bis — pilier du jour = pilier natal (1/60 = 1.67%)
  | 'void_course'          // V3.2: Lune void of course + PD observation (~0.6%)
  | 'resonance_leap'       // V3.2: Même PD 2x en 7j avec convergence Yi King (~1.2%)
  | 'phantom_loop'         // V3.2: Convergence cyclique PPCM(9,60)=180j (~0.15%)
  | 'systemic_burnout';    // V3.2: 5+ systèmes négatifs simultanément (~3%)

export type PatternIntensity = 'flippant' | 'fort' | 'notable';

export interface Pattern {
  type: PatternType;
  title: string;           // Titre court ex: "Miroir de cycle"
  narrative: string;       // Le texte "flippant" à afficher
  insight: string;         // Le conseil stratégique qui en découle
  years: number[];         // Années concernées (pour timeline)
  systems: string[];       // Systèmes croisés
  intensity: PatternIntensity;
  predictive: boolean;     // true si c'est une prédiction future
}

export interface LifeRhythm {
  archetype: string;       // Ex: "Bâtisseur-Destructeur", "Stratège Patient"
  description: string;
  dominantCycle: number;   // Durée du cycle dominant en années
  evidence: string[];      // Preuves tirées de l'historique
}

export interface PatternDetectionResult {
  patterns: Pattern[];
  rhythm: LifeRhythm;
  summary: string;         // 2-3 phrases de synthèse globale
  patternCount: number;    // Nombre total de patterns détectés
  flippantCount: number;   // Nombre de patterns "flippant"
}

// ══════════════════════════════════════
// ═══ HELPERS ═══
// ══════════════════════════════════════

function buildPinnacles(num: NumerologyProfile, bd: string): PinnacleInfo[] {
  const lpSingle = num.lp.v > 9 ? reduce(num.lp.v, false).v : num.lp.v;
  const p1End = 36 - lpSingle;
  return [
    { number: num.pinnacles[0].v, startAge: 0, endAge: p1End },
    { number: num.pinnacles[1].v, startAge: p1End, endAge: p1End + 9 },
    { number: num.pinnacles[2].v, startAge: p1End + 9, endAge: p1End + 18 },
    { number: num.pinnacles[3].v, startAge: p1End + 18, endAge: 99 },
  ];
}

function getAge(bd: string, today: string): number {
  return parseInt(today.slice(0, 4)) - parseInt(bd.slice(0, 4));
}

function getBirthYear(bd: string): number {
  return parseInt(bd.slice(0, 4));
}

/** Thème simplifié d'un PY pour comparaison */
const PY_ENERGY: Record<number, 'launch' | 'build' | 'create' | 'structure' | 'change' | 'commit' | 'reflect' | 'harvest' | 'release' | 'vision' | 'master'> = {
  1: 'launch', 2: 'build', 3: 'create', 4: 'structure', 5: 'change',
  6: 'commit', 7: 'reflect', 8: 'harvest', 9: 'release', 11: 'vision', 22: 'master',
};

const PY_ENERGY_FR: Record<string, string> = {
  launch: 'lancement', build: 'construction patiente', create: 'création',
  structure: 'structuration', change: 'changement radical', commit: 'engagement',
  reflect: 'introspection', harvest: 'récolte', release: 'clôture',
  vision: 'vision', master: 'bâtisseur cosmique',
};

const ELEMENT_KEYWORDS: Record<string, string[]> = {
  Feu: ['action', 'initiative', 'énergie', 'impulsion', 'combat'],
  Eau: ['intuition', 'émotion', 'profondeur', 'adaptation', 'flux'],
  Terre: ['stabilité', 'structure', 'patience', 'ancrage', 'concret'],
  Bois: ['croissance', 'expansion', 'créativité', 'flexibilité', 'renouveau'],
  Métal: ['précision', 'discipline', 'détermination', 'tranchant', 'clarté'],
};

// V3.1: Mapping PY → élément corrigé selon Lo Shu / Ki des 9 Étoiles (audit Gemini R4)
// Ancien mapping était une approximation incorrecte. Correct:
// 1=Eau, 2=Terre, 3=Bois, 4=Bois, 5=Terre, 6=Métal, 7=Métal, 8=Terre, 9=Feu
// Masters: 11→2=Terre, 22→4=Bois
const PY_ELEMENT: Record<number, string> = {
  1: 'Eau', 2: 'Terre', 3: 'Bois', 4: 'Bois', 5: 'Terre',
  6: 'Métal', 7: 'Métal', 8: 'Terre', 9: 'Feu', 11: 'Terre', 22: 'Bois',
};

// Transits universels par âge (simplifié de life-timeline.ts)
const TRANSIT_AGES: { age: number; name: string; theme: string; force: number }[] = [
  { age: 7, name: 'Carré Saturne', theme: 'structure', force: 1 },
  { age: 14, name: 'Opposition Saturne', theme: 'rébellion', force: 2 },
  { age: 19, name: 'Retour Nœuds', theme: 'karma', force: 2 },
  { age: 21, name: 'Retour Jupiter', theme: 'expansion', force: 1 },
  { age: 29, name: 'Retour Saturne', theme: 'audit', force: 3 },
  { age: 37, name: 'Carré Uranus', theme: 'liberté', force: 2 },
  { age: 38, name: '2e Retour Nœuds', theme: 'karma', force: 2 },
  { age: 42, name: 'Opposition Uranus', theme: 'crise identité', force: 3 },
  { age: 43, name: 'Carré Neptune', theme: 'dissolution', force: 2 },
  { age: 50, name: 'Retour Chiron', theme: 'guérison', force: 3 },
  { age: 56, name: '3e Retour Nœuds', theme: 'transmission', force: 2 },
  { age: 59, name: '2e Retour Saturne', theme: 'sagesse', force: 3 },
];

// ══════════════════════════════════════
// ═══ DÉTECTEUR 1: CYCLE MIRROR ═══
// ══════════════════════════════════════
// V3.1: PY identique seul = artefact (100% tous les 9 ans, audit GPT+Gemini).
// Ne qualifier "flippant" que si PY + transit rare + transition Pinnacle.
// PY + transit seul = "fort". PY seul = "notable".

function detectCycleMirrors(
  bd: string, currentAge: number, num: NumerologyProfile,
  pinnacles: PinnacleInfo[],
): Pattern[] {
  const patterns: Pattern[] = [];
  const birthYear = getBirthYear(bd);

  // Scanner les PY marquantes (1, 5, 8, 9) sur toute la vie
  const keyPYs = [1, 5, 8, 9];

  for (const targetPY of keyPYs) {
    const occurrences: { year: number; age: number }[] = [];

    for (let age = 0; age <= currentAge; age++) {
      const py = calcPersonalYear(bd, birthYear + age);
      if (py.v === targetPY) {
        occurrences.push({ year: birthYear + age, age });
      }
    }

    // Il faut au moins 2 occurrences pour un miroir
    if (occurrences.length < 2) continue;

    // Trouver la prochaine occurrence future
    let futureOcc: { year: number; age: number } | null = null;
    for (let age = currentAge + 1; age <= currentAge + 9; age++) {
      const py = calcPersonalYear(bd, birthYear + age);
      if (py.v === targetPY) {
        futureOcc = { year: birthYear + age, age };
        break;
      }
    }

    // Vérifier si un transit universel coïncide avec une occurrence
    const transitCoincidences = occurrences.filter(occ =>
      TRANSIT_AGES.some(t => Math.abs(t.age - occ.age) <= 1)
    );

    // V3.1: Vérifier si une transition de Pinnacle coïncide (audit Gemini+GPT)
    const pinnacleCoincidences = occurrences.filter(occ =>
      pinnacles.some(p => Math.abs(p.endAge - occ.age) <= 1)
    );

    const pyInfo = PY_ENERGY[targetPY] || 'launch';
    const pyFr = PY_ENERGY_FR[pyInfo];

    // Pattern simple : 3+ occurrences montrent un cycle clair
    if (occurrences.length >= 3) {
      const yearsStr = occurrences.map(o => `${o.year} (${o.age} ans)`).join(', ');
      const futureStr = futureOcc ? ` La prochaine arrive en ${futureOcc.year} (${futureOcc.age} ans).` : '';

      const isTransitAmplified = transitCoincidences.length > 0;
      const hasPinnacleCoincidence = pinnacleCoincidences.length > 0;

      // V4.0 Fix: Sans transit ni Pinnacle, c'est un cycle PY basique (artefact).
      // Tout le monde a 5+ occurrences de chaque PY sur une vie.
      if (!isTransitAmplified && !hasPinnacleCoincidence) continue;

      const transitNote = isTransitAmplified
        ? ` En ${transitCoincidences[0].year}, cette énergie a été amplifiée par ${TRANSIT_AGES.find(t => Math.abs(t.age - transitCoincidences[0].age) <= 1)?.name}.`
        : '';
      const pinnacleNote = hasPinnacleCoincidence
        ? ` L'un de ces cycles a coïncidé avec un changement de grande phase de vie — un double basculement.`
        : '';

      patterns.push({
        type: 'cycle_mirror',
        title: `Cycle récurrent de ${pyFr}`,
        narrative: `Ton Année Personnelle ${targetPY} (${pyFr}) est revenue ${occurrences.length} fois dans ta vie : ${yearsStr}.${transitNote}${pinnacleNote} Chaque fois, le même schéma de ${pyFr} s'est activé — et tu as probablement initié des actions similaires sans t\'en rendre compte.${futureStr}`,
        insight: futureOcc
          ? `Prépare-toi : ${futureOcc.year} réactivera cette énergie de ${pyFr}. Ce que tu as fait en ${occurrences[occurrences.length - 1].year} te donne un indice de ce qui t\'attend.`
          : `Tu es dans la phase de maturité de ce cycle. Les leçons de ${occurrences[0].year} et ${occurrences[1].year} sont maintenant intégrées.`,
        years: [...occurrences.map(o => o.year), ...(futureOcc ? [futureOcc.year] : [])],
        systems: ['Année Personnelle', 'Cycle 9 ans', ...(isTransitAmplified ? ['Transit universel'] : []), ...(hasPinnacleCoincidence ? ['Changement de phase'] : [])],
        // V4.0: Transit+Pinnacle = flippant, un seul = fort
        intensity: isTransitAmplified && hasPinnacleCoincidence ? 'flippant' : 'fort',
        predictive: !!futureOcc,
      });
    }

    // Pattern spécial : PY 9 → PY 1 (fin→début) avec transit
    if (targetPY === 9) {
      const py1After = occurrences.map(occ => {
        const nextPY = calcPersonalYear(bd, occ.year + 1);
        return nextPY.v === 1 ? { closureYear: occ.year, launchYear: occ.year + 1, age: occ.age } : null;
      }).filter(Boolean) as { closureYear: number; launchYear: number; age: number }[];

      // Portails 9→1 qui coïncident avec un transit
      // V5.2: Variantes de formulation pour éviter la répétition quand plusieurs portails existent
      const PORTAL_NARRATIVES = [
        (p: { closureYear: number; launchYear: number; age: number }, tr: { name: string }) =>
          `En ${p.closureYear}-${p.launchYear} (${p.age}-${p.age + 1} ans), un portail 9→1 s'est ouvert en même temps que ton ${tr.name}. Ce n'est pas un hasard : tu as probablement vécu une transformation profonde — fin d'un chapitre + début radical d'un autre.`,
        (p: { closureYear: number; launchYear: number; age: number }, tr: { name: string }) =>
          `Vers ${p.age}-${p.age + 1} ans (${p.closureYear}-${p.launchYear}), la fin d'un grand cycle intérieur a coïncidé avec ton ${tr.name}. Un ancien toi s'est effacé pour laisser place à une version plus alignée — cette mutation t'a probablement surpris par sa force.`,
        (p: { closureYear: number; launchYear: number; age: number }, tr: { name: string }) =>
          `${p.closureYear}-${p.launchYear} (${p.age}-${p.age + 1} ans) : ton ${tr.name} a percuté une année de fin de cycle (année 9 → nouvelle année 1). Ce qui restait de l'ancien cycle a été brûlé — le terrain s'est vidé pour accueillir quelque chose de neuf.`,
      ];
      const PORTAL_INSIGHTS = [
        (p: { launchYear: number }, tr: { name: string }) =>
          `Ce portail ${tr.name} × PY 9→1 est l'un des plus puissants de ta vie. Ce que tu as lancé en ${p.launchYear} porte encore ses fruits aujourd'hui.`,
        (p: { launchYear: number }, tr: { name: string }) =>
          `La graine plantée en ${p.launchYear} après ce ${tr.name} continue de pousser. Les effets de ce portail se mesurent en décennies, pas en mois.`,
        (p: { launchYear: number }, tr: { name: string }) =>
          `Ce ${tr.name} a agi comme un catalyseur. Les décisions prises autour de ${p.launchYear} ont redéfini ta trajectoire — leur impact est encore actif aujourd'hui.`,
      ];
      let portalIdx = 0;
      py1After.forEach(portal => {
        const transit = TRANSIT_AGES.find(t => Math.abs(t.age - portal.age) <= 2 && t.force >= 2);
        if (transit) {
          const ni = portalIdx % PORTAL_NARRATIVES.length;
          const ii = portalIdx % PORTAL_INSIGHTS.length;
          patterns.push({
            type: 'cycle_mirror',
            title: 'Portail de Renaissance',
            narrative: PORTAL_NARRATIVES[ni](portal, transit),
            insight: PORTAL_INSIGHTS[ii](portal, transit),
            years: [portal.closureYear, portal.launchYear],
            systems: ['PY 9→1', transit.name, 'Portail de changement'],
            intensity: 'flippant',
            predictive: false,
          });
          portalIdx++;
        }
      });
    }
  }

  return patterns;
}

// ══════════════════════════════════════
// ═══ DÉTECTEUR 2: KARMIC ECHO ═══
// ══════════════════════════════════════
// Détecte quand une leçon karmique a été "testée" pile à un moment clé.

function detectKarmicEchoes(
  bd: string, currentAge: number, num: NumerologyProfile,
  pinnacles: PinnacleInfo[],
): Pattern[] {
  const patterns: Pattern[] = [];
  const birthYear = getBirthYear(bd);

  if (num.kl.length === 0) return patterns;

  const klInfo = num.kl.map(k => ({ num: k, info: getNumberInfo(k) }));

  // Pour chaque leçon karmique, chercher quand elle a été "activée"
  for (const kl of klInfo) {
    const activations: { year: number; age: number; trigger: string; force: number }[] = [];

    // 1. PY = leçon karmique (énergie de l'année = exactement ce qu'on évite)
    for (let age = 12; age <= currentAge; age++) {
      const py = calcPersonalYear(bd, birthYear + age);
      if (py.v === kl.num) {
        // Vérifier si un transit coïncide
        const transit = TRANSIT_AGES.find(t => Math.abs(t.age - age) <= 1);
        activations.push({
          year: birthYear + age,
          age,
          trigger: transit ? `PY ${kl.num} + ${transit.name}` : `PY ${kl.num}`,
          force: transit ? transit.force + 1 : 1,
        });
      }
    }

    // 2. Challenge actif = leçon karmique pendant un transit
    pinnacles.forEach((p, idx) => {
      const challenge = num.challenges[idx];
      if (challenge && challenge.v === kl.num) {
        const midAge = Math.floor((p.startAge + p.endAge) / 2);
        const transit = TRANSIT_AGES.find(t => t.age >= p.startAge && t.age <= p.endAge && t.force >= 2);
        if (transit) {
          activations.push({
            year: birthYear + transit.age,
            age: transit.age,
            trigger: `Challenge ${kl.num} + ${transit.name}`,
            force: transit.force + 2,
          });
        }
      }
    });

    // 3. Pinnacle = leçon karmique (tu dois maîtriser exactement ce que tu fuis)
    pinnacles.forEach((p, idx) => {
      if (p.number === kl.num && p.startAge <= currentAge) {
        activations.push({
          year: birthYear + p.startAge,
          age: p.startAge,
          trigger: `Phase de vie ${idx + 1} = Leçon ${kl.num}`,
          force: 3,
        });
      }
    });

    if (activations.length === 0) continue;

    // Trier par force
    activations.sort((a, b) => b.force - a.force);
    const strongest = activations[0];

    // Chercher la prochaine activation future
    let futureActivation: string | null = null;
    for (let age = currentAge + 1; age <= currentAge + 9; age++) {
      const py = calcPersonalYear(bd, birthYear + age);
      if (py.v === kl.num) {
        futureActivation = `${birthYear + age} (${age} ans)`;
        break;
      }
    }

    const narrative = activations.length >= 3
      ? `Ta qualité à développer ${kl.num} (${kl.info.k}) a été testée ${activations.length} fois : ${activations.slice(0, 3).map(a => `${a.year} via ${a.trigger}`).join(', ')}. L'univers insiste — chaque test t\'a rendu plus fort sur exactement ce point.`
      : `Ta qualité à développer ${kl.num} (${kl.info.k}) a été testée de manière intense en ${strongest.year} (${strongest.age} ans) via ${strongest.trigger}. Ce n'est pas une coïncidence : c'est le moment où tu as été confronté à ce que tu évitais le plus.`;

    patterns.push({
      type: 'karmic_echo',
      title: `Écho de vie : ${kl.info.k}`,
      narrative,
      insight: futureActivation
        ? `Prochaine confrontation prévue en ${futureActivation}. Cette fois, tu as l'expérience de ${activations.length} test${activations.length > 1 ? 's' : ''} — tu es prêt.`
        : `Tu as intégré les leçons principales. Cette énergie est maintenant une force, pas une faille.`,
      years: activations.map(a => a.year),
      systems: ['Leçons karmiques', ...new Set(activations.map(a => a.trigger.split(' + ')[1] || a.trigger))],
      intensity: activations.length >= 3 || strongest.force >= 4 ? 'flippant' : 'fort',
      predictive: !!futureActivation,
    });
  }

  return patterns;
}

// ══════════════════════════════════════
// ═══ DÉTECTEUR 3: PINNACLE×PY RESONANCE ═══
// ══════════════════════════════════════
// Détecte quand PY amplifie ou contredit le Pinnacle actif.

function detectPinnaclePYResonance(
  bd: string, currentAge: number, num: NumerologyProfile,
  pinnacles: PinnacleInfo[],
): Pattern[] {
  const patterns: Pattern[] = [];
  const birthYear = getBirthYear(bd);

  // Trouver le pinnacle actif
  const activeIdx = pinnacles.findIndex(p => currentAge >= p.startAge && currentAge <= p.endAge);
  if (activeIdx < 0) return patterns;

  const active = pinnacles[activeIdx];
  const currentPY = calcPersonalYear(bd, birthYear + currentAge);

  // 1. PY = Pinnacle → amplification maximale
  if (currentPY.v === active.number) {
    patterns.push({
      type: 'pinnacle_py_resonance',
      title: 'Double résonance Phase de vie × Année',
      narrative: `Ta phase de vie actuelle (${active.number}) et ton Année Personnelle (${currentPY.v}) sont identiques. C'est une amplification structurelle : l'énergie de ${getNumberInfo(active.number).k} est doublée. Tout ce que tu fais cette année a un impact disproportionné sur cette phase de vie entière.`,
      insight: `Ne gaspille pas cette année. Chaque initiative dans le domaine de ${getNumberInfo(active.number).k.toLowerCase()} est multipliée.`,
      years: [birthYear + currentAge],
      systems: ['Phase de vie', 'Année Personnelle'],
      // V3.1: fort au lieu de flippant — prob 1/9=11% annuel = structurel pas rare (audit GPT)
      intensity: 'fort',
      predictive: false,
    });
  }

  // 2. PY contredit le Pinnacle → tension productive
  const TENSION_PAIRS: Record<number, number[]> = {
    1: [2, 6, 7], 2: [1, 5, 8], 3: [4, 7], 4: [3, 5, 9],
    5: [2, 4, 6], 6: [1, 5, 9], 7: [1, 3, 8], 8: [2, 7], 9: [4, 6],
    11: [4, 8], 22: [5, 9],
  };

  const tensions = TENSION_PAIRS[active.number] || [];
  if (tensions.includes(currentPY.v)) {
    const pinnInfo = getNumberInfo(active.number);
    const pyInfo = getNumberInfo(currentPY.v);

    // Chercher quand cette tension se résout (PY qui harmonise)
    let resolveYear: number | null = null;
    for (let futAge = currentAge + 1; futAge <= currentAge + 3; futAge++) {
      const futPY = calcPersonalYear(bd, birthYear + futAge);
      if (!tensions.includes(futPY.v) && futPY.v !== currentPY.v) {
        resolveYear = birthYear + futAge;
        break;
      }
    }

    patterns.push({
      type: 'pinnacle_py_resonance',
      title: 'Tension Phase de vie vs Année',
      narrative: `Ta phase de vie ${active.number} (${pinnInfo.k}) est en tension avec ton Année ${currentPY.v} (${pyInfo.k}). L'une te pousse vers ${pinnInfo.k.toLowerCase()}, l'autre vers ${pyInfo.k.toLowerCase()}. Cette friction n'est pas un problème — c'est le moteur de ta croissance cette année.`,
      insight: resolveYear
        ? `Cette tension se dissipe en ${resolveYear}. D'ici là, utilise-la : les meilleures décisions naissent de l'inconfort.`
        : `Accepte la dualité. Tu n'as pas à choisir entre ${pinnInfo.k.toLowerCase()} et ${pyInfo.k.toLowerCase()} — tu dois les fusionner.`,
      years: [birthYear + currentAge, ...(resolveYear ? [resolveYear] : [])],
      systems: ['Phase de vie', 'Année Personnelle', 'Tension productive'],
      intensity: 'fort',
      predictive: !!resolveYear,
    });
  }

  // 3. Scanner l'historique : combien de fois PY a été en harmonie vs tension avec Pinnacle
  let harmonyYears = 0;
  let tensionYears = 0;
  for (let age = Math.max(12, active.startAge); age <= Math.min(currentAge, active.endAge); age++) {
    const py = calcPersonalYear(bd, birthYear + age);
    if (py.v === active.number) harmonyYears++;
    if (tensions.includes(py.v)) tensionYears++;
  }

  if (harmonyYears > 0 && tensionYears > 0) {
    const balance = harmonyYears > tensionYears ? 'harmonie' : 'tension';
    const ratio = Math.max(harmonyYears, tensionYears);
    if (ratio >= 3) {
      patterns.push({
        type: 'pinnacle_py_resonance',
        title: `Phase de vie en ${balance} dominante`,
        narrative: `Depuis le début de ta phase de vie ${active.number}, tu as vécu ${harmonyYears} année${harmonyYears > 1 ? 's' : ''} en harmonie et ${tensionYears} en tension avec son énergie. Ton cycle est dominé par ${balance === 'harmonie' ? 'l\'alignement — tu es dans ton élément' : 'la friction — mais c\'est cette friction qui t\'a fait grandir le plus vite'}.`,
        insight: balance === 'harmonie'
          ? `Tu es naturellement aligné avec cette phase de vie. Accélère.`
          : `La tension est ton professeur. Les années de friction ont produit tes plus grandes avancées.`,
        years: [],
        systems: ['Phase de vie', 'Historique PY', 'Balance cyclique'],
        intensity: 'notable',
        predictive: false,
      });
    }
  }

  return patterns;
}

// ══════════════════════════════════════
// ═══ DÉTECTEUR 4: ELEMENT CONVERGENCE ═══
// ══════════════════════════════════════
// Quand 3+ systèmes pointent le même élément (Feu/Eau/Terre/Bois/Métal).

function detectElementConvergence(
  bd: string, currentAge: number,
  num: NumerologyProfile, cz: ChineseZodiac,
): Pattern[] {
  const patterns: Pattern[] = [];
  const birthYear = getBirthYear(bd);
  const currentPY = calcPersonalYear(bd, birthYear + currentAge);

  // Collecter les éléments actifs
  const elementVotes: Record<string, string[]> = {
    Feu: [], Eau: [], Terre: [], Bois: [], Métal: [],
  };

  // 1. Zodiaque chinois
  if (cz.elem && elementVotes[cz.elem]) {
    elementVotes[cz.elem].push(`${cz.animal} de ${cz.elem}`);
  }

  // 2. PY → élément
  const pyElem = PY_ELEMENT[currentPY.v];
  if (pyElem && elementVotes[pyElem]) {
    elementVotes[pyElem].push(`Année ${currentPY.v} (${pyElem})`);
  }

  // 3. CdV → élément
  const lpElem = PY_ELEMENT[num.lp.v];
  if (lpElem && elementVotes[lpElem]) {
    elementVotes[lpElem].push(`CdV ${num.lp.v} (${lpElem})`);
  }

  // 4. Expression → élément
  const exprElem = PY_ELEMENT[num.expr.v > 9 ? reduce(num.expr.v, false).v : num.expr.v];
  if (exprElem && elementVotes[exprElem]) {
    elementVotes[exprElem].push(`Expression ${num.expr.v} (${exprElem})`);
  }

  // 5. Yi King natal → élément via tier
  const natalHex = calcNatalIChing(bd);
  const hexTier = getHexTier(natalHex.hexNum);
  // A/B tiers = Feu (créateur), D/E = Eau (retrait), C = Terre (neutre)
  const hexElem = hexTier.tier <= 'B' ? 'Feu' : hexTier.tier >= 'D' ? 'Eau' : 'Terre';
  elementVotes[hexElem].push(`Yi King natal ${hexTier.tier}-tier (${hexElem})`);

  // 6. Mercure status
  const mercury = getMercuryStatus(new Date());
  if (mercury.phase !== 'direct') {
    elementVotes['Eau'].push(`Mercure ${mercury.label} (Eau/ralentissement)`);
  }

  // 7. Pinnacle actif → élément
  const activeIdx = num.pinnacles.findIndex((_, i) => {
    const p = buildPinnacles(num, bd)[i];
    return currentAge >= p.startAge && currentAge <= p.endAge;
  });
  if (activeIdx >= 0) {
    const pinnElem = PY_ELEMENT[num.pinnacles[activeIdx].v];
    if (pinnElem && elementVotes[pinnElem]) {
      elementVotes[pinnElem].push(`Phase de vie ${num.pinnacles[activeIdx].v} (${pinnElem})`);
    }
  }

  // V3.1: Seuil relevé de 3→4 (audit GPT: ≥3 = 27% prob = trop commun, ≥4 = 9% = flippant)
  for (const [elem, sources] of Object.entries(elementVotes)) {
    if (sources.length >= 4) {
      const keywords = ELEMENT_KEYWORDS[elem] || [];
      const keyStr = keywords.slice(0, 3).join(', ');

      patterns.push({
        type: 'element_convergence',
        title: `Convergence ${elem}`,
        narrative: `${sources.length} systèmes indépendants pointent vers l'élément ${elem} en ce moment : ${sources.join(', ')}. Cette saturation élémentaire (probabilité <9%) crée un momentum ${keyStr} inarrêtable.`,
        insight: elem === 'Feu'
          ? `Phase d'impulsion maximale. Agis vite, décide vite, lance maintenant.`
          : elem === 'Eau'
          ? `Phase de profondeur et d'intuition. Écoute plus que tu ne parles. Les réponses viennent du silence.`
          : elem === 'Terre'
          ? `Phase d'ancrage. Consolide, structure, bâtis sur du solide. Pas de raccourcis.`
          : elem === 'Bois'
          ? `Phase de croissance. Plante les graines, investis dans l'avenir. La patience paie.`
          : `Phase de clarification. Tranche, simplifie, élimine le superflu.`,
        years: [birthYear + currentAge],
        systems: sources,
        intensity: sources.length >= 5 ? 'flippant' : 'fort',
        predictive: false,
      });
    }
  }

  return patterns;
}

// ══════════════════════════════════════
// ═══ DÉTECTEUR 5: LIFE RHYTHM ═══
// ══════════════════════════════════════
// Analyse 20+ ans de PY pour trouver un archétype de vie dominant.

function detectLifeRhythm(
  bd: string, currentAge: number, num: NumerologyProfile,
  pinnacles: PinnacleInfo[], cz: ChineseZodiac,
): LifeRhythm {
  const birthYear = getBirthYear(bd);

  // Compter les énergies PY sur toute la vie adulte
  const energyCounts: Record<string, number> = {};
  const changeYears: number[] = [];
  const buildYears: number[] = [];
  const harvestYears: number[] = [];

  for (let age = 16; age <= currentAge; age++) {
    const py = calcPersonalYear(bd, birthYear + age);
    const energy = PY_ENERGY[py.v] || 'reflect';
    energyCounts[energy] = (energyCounts[energy] || 0) + 1;

    if (energy === 'change' || energy === 'release') changeYears.push(birthYear + age);
    if (energy === 'structure' || energy === 'build') buildYears.push(birthYear + age);
    if (energy === 'harvest') harvestYears.push(birthYear + age);
  }

  // Analyser les intervalles entre changements
  const changeIntervals: number[] = [];
  for (let i = 1; i < changeYears.length; i++) {
    changeIntervals.push(changeYears[i] - changeYears[i - 1]);
  }
  const avgChangeInterval = changeIntervals.length > 0
    ? Math.round(changeIntervals.reduce((a, b) => a + b, 0) / changeIntervals.length)
    : 9;

  // Pinnacle maîtres
  const hasMasterPinnacle = pinnacles.some(p => [11, 22, 33].includes(p.number));

  // Déterminer l'archétype
  const topEnergies = Object.entries(energyCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([e]) => e);

  let archetype: string;
  let description: string;
  const evidence: string[] = [];

  if (topEnergies[0] === 'change' || topEnergies[0] === 'launch') {
    if (topEnergies.includes('structure') || topEnergies.includes('build')) {
      archetype = 'Le Bâtisseur-Destructeur';
      description = `Tu construis avec intensité pendant ${avgChangeInterval > 4 ? '4-5' : '2-3'} ans, puis tu détruis ce qui ne te satisfait plus pour reconstruire en mieux. Ce n'est pas de l'instabilité — c'est de l'évolution accélérée.`;
      evidence.push(`${changeYears.length} années de changement sur ${currentAge - 16} ans de vie adulte`);
      evidence.push(`Intervalle moyen entre ruptures : ${avgChangeInterval} ans`);
    } else {
      archetype = 'L\'Explorateur Perpétuel';
      description = `Ta vie est un mouvement constant. Tu ne fuis pas — tu explores. Chaque ${avgChangeInterval} ans environ, tu changes de direction, et chaque virage t\'a mené plus loin que le précédent.`;
      evidence.push(`${changeYears.length} virages majeurs détectés`);
    }
  } else if (topEnergies[0] === 'structure' || topEnergies[0] === 'build') {
    if (hasMasterPinnacle) {
      archetype = 'L\'Architecte Visionnaire';
      description = `Tu bâtis lentement mais à grande échelle. Tes constructions ne sont pas éphémères — elles sont conçues pour durer et pour servir quelque chose de plus grand que toi.`;
      evidence.push(`Dominance de structure + phase de vie maître : vision long terme`);
    } else {
      archetype = 'Le Stratège Patient';
      description = `Tu avances comme un joueur d'échecs : chaque mouvement est calculé. Les résultats arrivent plus tard que chez les autres, mais ils durent plus longtemps.`;
      evidence.push(`${buildYears.length} années de construction sur ${currentAge - 16} ans`);
    }
  } else if (topEnergies[0] === 'harvest') {
    archetype = 'Le Moissonneux';
    description = `Ta vie est ponctuée de récoltes régulières. Tu sais instinctivement quand cueillir les fruits de tes efforts — et tu ne paniques pas pendant les phases de semailles.`;
    evidence.push(`${harvestYears.length} années de récolte`);
  } else if (topEnergies[0] === 'reflect' || topEnergies[0] === 'vision') {
    archetype = 'Le Sage Stratège';
    description = `Tu passes plus de temps à réfléchir qu'à agir — et c'est ta force. Quand tu bouges, c'est avec une précision chirurgicale qui surprend tout le monde.`;
    evidence.push(`Dominance d'introspection et vision dans les cycles PY`);
  } else if (topEnergies[0] === 'create') {
    archetype = 'Le Créateur Série';
    description = `Tu crées en permanence — projets, idées, connexions. Le défi n'est pas l'inspiration (tu en as trop) mais la canalisation. Tes meilleures créations sont celles où tu as su te discipliner.`;
    evidence.push(`${energyCounts['create'] || 0} années créatives détectées`);
  } else {
    archetype = 'Le Transformateur';
    description = `Ta vie ne suit pas un schéma linéaire — elle se transforme par phases. Chaque grande transition t\'a révélé une facette de toi que tu ne soupçonnais pas.`;
    evidence.push(`Profil multi-facettes sans dominance unique`);
  }

  // Ajouter contexte chinois
  if (cz.elem === 'Feu' && (archetype.includes('Bâtisseur') || archetype.includes('Explorateur'))) {
    evidence.push(`${cz.animal} de Feu amplifie le rythme de transformation`);
  }
  if (cz.yy === 'Yin' && archetype.includes('Patient')) {
    evidence.push(`Énergie Yin du ${cz.animal} confirme la stratégie de patience`);
  }

  return {
    archetype,
    description,
    dominantCycle: avgChangeInterval,
    evidence,
  };
}

// ══════════════════════════════════════
// ═══ DÉTECTEUR 6: PREDICTIVE CONVERGENCE ═══
// ══════════════════════════════════════
// V3.1: Score pondéré par rareté au lieu de count ≥3 (audit Gemini+GPT).
// Pinnacle Change=5, Transit lent force3=8, Éclipse=4, Portal 9→1=3, Nœuds=3, PY marquante=2.
// Seuil : totalRarity ≥12 (ex: Pinnacle(5)+Transit(8)=13 ✔, PY(2)+Eclipse(4)+Node(3)=9 ✗).
// Élimine les "fenêtres exceptionnelles" qui arrivent à 78% des gens (ancien seuil).

function detectPredictiveConvergences(
  bd: string, currentAge: number, num: NumerologyProfile,
  pinnacles: PinnacleInfo[],
): Pattern[] {
  const patterns: Pattern[] = [];
  const birthYear = getBirthYear(bd);

  // Scanner les 3 prochaines années
  for (let futAge = currentAge + 1; futAge <= currentAge + 3; futAge++) {
    const year = birthYear + futAge;
    const py = calcPersonalYear(bd, year);
    const signals: string[] = [];
    let totalRarity = 0;

    // 1. PY marquante — rareté faible (cycle 9 ans = structurel)
    if ([1, 9].includes(py.v)) {
      signals.push(`Année ${py.v} (${PY_ENERGY_FR[PY_ENERGY[py.v]] || '?'})`);
      totalRarity += 2;
    } else if ([5, 8, 11, 22].includes(py.v)) {
      signals.push(`Année ${py.v} (${PY_ENERGY_FR[PY_ENERGY[py.v]] || '?'})`);
      totalRarity += 1;
    }

    // 2. Transit universel lent — rareté haute (astronomique, pas cyclique)
    const transit = TRANSIT_AGES.find(t => Math.abs(t.age - futAge) <= 1);
    if (transit) {
      signals.push(transit.name);
      // Force 3 = Saturne Return/Chiron/Uranus → 8 pts, Force 2 → 4 pts, Force 1 → 2 pts
      totalRarity += transit.force >= 3 ? 8 : transit.force >= 2 ? 4 : 2;
    }

    // 3. Transition de Pinnacle — rareté haute (1x tous les 9 ans)
    const pinnacleTransition = pinnacles.find(p => Math.abs(p.endAge - futAge) <= 1);
    if (pinnacleTransition) {
      const nextPIdx = pinnacles.indexOf(pinnacleTransition) + 1;
      const nextP = pinnacles[nextPIdx];
      signals.push(`Changement de phase ${pinnacleTransition.number}→${nextP?.number || '?'}`);
      totalRarity += 5;
    }

    // 4. Retour des Nœuds — rareté moyenne
    const nodeReturns = getNodeKeyMoments(bd);
    const nodeMatch = nodeReturns.find(nr => nr.year === year);
    if (nodeMatch) {
      signals.push(nodeMatch.label);
      totalRarity += 3;
    }

    // 5. Éclipse solaire cette année — rareté faible
    // V4.0 Fix: +4 donnait un bonus gratuit à chaque année. Réduit à +2 pour les solaires uniquement.
    const eclipses = getEclipseList();
    const yearSolarEclipses = eclipses.filter(e => e.date.startsWith(String(year)) && e.type === 'solaire');
    if (yearSolarEclipses.length > 0) {
      signals.push(`Éclipse solaire`);
      totalRarity += 2;
    }

    // 6. PY 9→1 portail — NE PAS compter si PY 9 déjà compté (double-counting fix)
    // Le portail 9→1 et PY 9 sont le même événement vu sous 2 angles
    if (py.v === 9 && !signals.some(s => s.includes('Année 9'))) {
      const nextPY = calcPersonalYear(bd, year + 1);
      if (nextPY.v === 1) {
        signals.push('Portail 9→1');
        totalRarity += 3;
      }
    }

    // V3.1: Seuil ≥12 au lieu de count ≥3 (audit consensus 3 IA)
    if (totalRarity >= 12) {
      const isFlippant = totalRarity >= 16;

      patterns.push({
        type: 'predictive_convergence',
        title: `${year} — Convergence rare (rareté ${totalRarity})`,
        narrative: `En ${year} (${futAge} ans), ${signals.length} cycles convergent simultanément : ${signals.join(' + ')}. Score de rareté : ${totalRarity}/20 — ce type de collision est statistiquement exceptionnel.`,
        insight: py.v === 1 || py.v === 5
          ? `${year} est une année pour AGIR. Lance ce que tu prépares — l'alignement est optimal.`
          : py.v === 9
          ? `${year} est une année pour CLÔTURER. Termine ce qui doit l'être — le renouveau suit.`
          : py.v === 8
          ? `${year} est une année pour RÉCOLTER. Les efforts passés portent leurs fruits — encaisse.`
          : `${year} est une année charnière. Reste attentif aux opportunités — elles seront concentrées sur quelques semaines clés.`,
        years: [year],
        systems: signals,
        intensity: isFlippant ? 'flippant' : 'fort',
        predictive: true,
      });
    }
  }

  return patterns;
}

// ══════════════════════════════════════
// ═══ EXPORT PRINCIPAL ═══
// ══════════════════════════════════════

// ══════════════════════════════════════
// ═══ DÉTECTEUR 7: ÉCLIPSE KARMIQUE (Gemini R4bis) ═══
// ══════════════════════════════════════
// Éclipse (±3 jours) × Challenge actif × élément BaZi convergent → ~1.2% probabilité.
// L'éclipse amplifie le défi karmique que l'utilisateur traverse —
// ce n'est pas générique, c'est personnalisé par le Challenge actif.

function detectEclipseKarmique(
  bd: string, currentAge: number, num: NumerologyProfile,
  pinnacles: PinnacleInfo[],
): Pattern[] {
  const patterns: Pattern[] = [];
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const eclipses = getEclipseList();

  // Trouver les éclipses proches (±3 jours)
  const nearEclipses = eclipses.filter(e => {
    const eclDate = new Date(e.date + 'T12:00:00');
    const diffDays = Math.abs((eclDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 3;
  });

  if (nearEclipses.length === 0) return patterns;

  // Challenge actif
  const pinnIdx = pinnacles.findIndex(p => currentAge <= p.endAge);
  const activeChallenge = num.challenges[Math.max(0, pinnIdx)];
  if (!activeChallenge || activeChallenge.v === 0) return patterns;

  // Mapper challenge → élément (numérologie → Wu Xing approximation)
  const challengeElem: Record<number, string> = {
    1: 'Feu', 2: 'Eau', 3: 'Bois', 4: 'Terre', 5: 'Terre',
    6: 'Métal', 7: 'Eau', 8: 'Terre', 9: 'Feu',
  };

  // Vérifier convergence BaZi
  let baziMatch = false;
  let baziStem = '';
  try {
    const birthD = new Date(bd + 'T12:00:00');
    const baziResult = calcBaZiDaily(birthD, today, 50);
    baziStem = `${baziResult.dailyStem.chinese} (${baziResult.dailyStem.element})`;
    // Match si élément BaZi du jour = élément du challenge
    const chElem = challengeElem[activeChallenge.v] || '';
    baziMatch = baziResult.dailyStem.element === chElem;
  } catch { /* BaZi fail silently */ }

  for (const ecl of nearEclipses) {
    const eclDate = new Date(ecl.date + 'T12:00:00');
    const daysDiff = Math.round((eclDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const timing = daysDiff === 0 ? 'AUJOURD\'HUI' : daysDiff > 0 ? `dans ${daysDiff}j` : `il y a ${Math.abs(daysDiff)}j`;
    const eclType = ecl.type === 'solar' ? 'Éclipse solaire' : 'Éclipse lunaire';

    // Intensité : éclipse + challenge + BaZi = flippant (~1.2%), éclipse + challenge seul = fort (~7%)
    const intensity: PatternIntensity = baziMatch ? 'flippant' : 'fort';

    patterns.push({
      type: 'eclipse_karmique',
      title: `${eclType} × Challenge ${activeChallenge.v}`,
      narrative: `${eclType} (${timing}) pendant ton Défi de vie ${activeChallenge.v} (${getNumberInfo(activeChallenge.v).k}).${baziMatch ? ` Le BaZi du jour ${baziStem} résonne avec le même élément — triple convergence exceptionnelle (~1% de probabilité).` : ''} Les éclipses catalysent les leçons que tu dois intégrer dans cette phase de vie.`,
      insight: activeChallenge.v <= 4
        ? `Ce défi te demande de structurer ce que tu évites. L'éclipse accélère le processus — ce que tu repousses depuis des mois va se présenter. Accueille-le.`
        : activeChallenge.v <= 7
        ? `Ton défi concerne les relations et la communication. L'éclipse éclaire ce qui était caché — des vérités émergent. Écoute avant de réagir.`
        : `Ton défi touche au pouvoir et à la transformation. L'éclipse force un lâcher-prise. Ce que tu contrôles te contrôle — libère ta prise.`,
      years: [parseInt(todayStr.slice(0, 4))],
      systems: [eclType, `Challenge ${activeChallenge.v}`, ...(baziMatch ? ['BaZi'] : [])],
      intensity,
      predictive: daysDiff > 0,
    });
  }

  return patterns;
}

// ══════════════════════════════════════
// ═══ DÉTECTEUR 8: BAZI CYCLE MASTER (Grok R4bis, tradition Joey Yap) ═══
// ══════════════════════════════════════
// Quand le Tronc Céleste du jour = Tronc Céleste natal → "Master Cycle"
// Probabilité : 1/10 (10 Heavenly Stems), soit ~10% quotidien pour le stem seul.
// Mais Stem + même polarité Yin/Yang du Branch = 1/60 ≈ 1.67% → flippant.
// Quand c'est le même Stem (pas juste le même élément), c'est un retour exact.

function detectBaZiCycleMaster(
  bd: string, currentAge: number,
): Pattern[] {
  const patterns: Pattern[] = [];
  try {
    const birthDate = new Date(bd + 'T12:00:00');
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    // Calculer le stem natal et le stem du jour via calcBaZiDaily
    const natalBazi = calcBaZiDaily(birthDate, birthDate, 50);
    const todayBazi = calcBaZiDaily(birthDate, today, 50);
    const natalStem = natalBazi.dailyStem;
    const todayStem = todayBazi.dailyStem;

    // Même Tronc Céleste (Heavenly Stem) exact = Master Cycle
    const sameStem = natalStem.chinese === todayStem.chinese;
    // Même élément (mais pas même stem) = résonance élémentaire
    const sameElement = !sameStem && natalStem.element === todayStem.element;

    if (sameStem) {
      // Même stem + même yinYang = probablement même pilier complet (simplifié)
      const samePillar = natalStem.yinYang === todayStem.yinYang && todayBazi.relation === 'same';

      patterns.push({
        type: 'bazi_cycle_master',
        title: `Retour ${natalStem.chinese} ${natalStem.pinyin}${samePillar ? ' — Pilier Complet' : ''}`,
        narrative: samePillar
          ? `Ton pilier du jour BaZi est identique à ton pilier natal : ${natalStem.chinese} ${natalStem.pinyin} (${natalStem.element} ${natalStem.yinYang}). Ce retour exact ne se produit que tous les 60 jours — c'est un "Master Cycle" dans la tradition des Quatre Piliers. L'énergie fondamentale de ta naissance est réactivée.`
          : `Le Tronc Céleste du jour (${todayStem.chinese} ${todayStem.pinyin}) est le même qu'à ta naissance. L'énergie de ton Day Master est doublée — c'est un jour de résonance identitaire profonde.`,
        insight: samePillar
          ? `Jour de pilier complet = jour de puissance maximale selon Joey Yap. Ce que tu décides aujourd'hui porte l'empreinte de ton essence — agis depuis ton centre, pas depuis la réaction.`
          : `Ton Day Master est réactivé — ta créativité, ta force de décision et ton charisme naturel sont amplifiés. Utilise cette énergie pour ce qui compte vraiment.`,
        years: [parseInt(todayStr.slice(0, 4))],
        systems: ['BaZi Day Master', `Tronc ${natalStem.chinese}`, ...(samePillar ? ['Pilier complet 60j'] : [])],
        intensity: samePillar ? 'flippant' : 'fort',
        predictive: false,
      });
    } else if (sameElement) {
      patterns.push({
        type: 'bazi_cycle_master',
        title: `Résonance ${natalStem.element}`,
        narrative: `Le Tronc du jour (${todayStem.chinese} — ${todayStem.element}) partage le même élément que ton Day Master natal (${natalStem.chinese}). L'énergie élémentaire est en harmonie avec ta nature profonde.`,
        insight: `Jour de cohérence élémentaire — tes actions sont naturellement alignées avec ta nature. Moins d'effort, plus d'impact.`,
        years: [parseInt(todayStr.slice(0, 4))],
        systems: ['BaZi Day Master', `Élément ${natalStem.element}`],
        intensity: 'notable',
        predictive: false,
      });
    }
  } catch { /* BaZi fail silently */ }

  return patterns;
}

// ══════════════════════════════════════
// ═══ DÉTECTEUR 9: VOID COURSE (Gemini R5bis) ═══
// ══════════════════════════════════════
// Lune "Void of Course" (quitte un signe sans aspect majeur) + PD observation/retrait.
// Moment où RIEN ne devrait être lancé. Prob ~0.6% quotidien.
// Simplification : on détecte quand la Lune est entre deux signes (fin de transit)
// ET que le PD est 7 ou 9 (introspection/clôture).

function detectVoidCourse(
  bd: string, num: NumerologyProfile,
): Pattern[] {
  const patterns: Pattern[] = [];
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const pdv = calcPersonalDay(bd, todayStr).v;
  const moonTr = getMoonTransit(todayStr);

  // Approximation Void of Course : la Lune est dans les 2 derniers degrés d'un signe
  // On utilise le fait que getMoonTransit change ~tous les 2.5j
  // Si demain la Lune est dans un signe différent, aujourd'hui = fin de transit = quasi-VOC
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);
  const moonTrTomorrow = getMoonTransit(tomorrowStr);

  const isVOC = moonTr.sign !== moonTrTomorrow.sign;
  const isReflectPD = pdv === 7 || pdv === 9 || pdv === 2;

  if (isVOC && isReflectPD) {
    patterns.push({
      type: 'void_course',
      title: 'Lune en Pause — Non-action Stratégique',
      narrative: `La Lune quitte ${moonTr.sign} pour ${moonTrTomorrow.sign} aujourd'hui — période dite "Void of Course" (Lune hors cours) en astrologie horaire. Combiné avec ton Jour Personnel ${pdv} (${getNumberInfo(pdv).k.toLowerCase()}), c'est un signal clair : toute action lancée maintenant risque de ne mener nulle part. Ce n'est pas un mauvais jour — c'est un jour de NON-action stratégique.`,
      insight: `Ne lance rien d'important aujourd'hui. Pas de signature, pas de pitch, pas de première impression. Utilise ce temps pour réfléchir, planifier, et attendre que la Lune entre en ${moonTrTomorrow.sign} demain.`,
      years: [parseInt(todayStr.slice(0, 4))],
      systems: ['Lune en pause', `Jour ${pdv}`, `Transit ${moonTr.sign}→${moonTrTomorrow.sign}`],
      intensity: 'fort',
      predictive: false,
    });
  }

  return patterns;
}

// ══════════════════════════════════════
// ═══ DÉTECTEUR 10: RESONANCE LEAP (Gemini R5bis) ═══
// ══════════════════════════════════════
// Quand le même PD apparaît 2 fois en 7 jours ET que le Yi King du 2ème jour
// est dans le même tier que le 1er → signal récurrent qui insiste.
// Prob ~1.2% (PD cycle 9 + tier match = rare).

function detectResonanceLeap(
  bd: string, num: NumerologyProfile,
): Pattern[] {
  const patterns: Pattern[] = [];
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const todayPD = calcPersonalDay(bd, todayStr);

  // Scanner les 7 derniers jours
  const matches: { date: string; hexNum: number; tier: string }[] = [];
  const todayIChing = calcIChing(bd, todayStr);
  const todayTier = getHexTier(todayIChing.hexNum).tier;

  for (let i = 1; i <= 7; i++) {
    const pastDate = new Date(today);
    pastDate.setDate(pastDate.getDate() - i);
    const pastStr = pastDate.toISOString().slice(0, 10);
    const pastPD = calcPersonalDay(bd, pastStr);

    if (pastPD.v === todayPD.v) {
      const pastIChing = calcIChing(bd, pastStr);
      const pastTier = getHexTier(pastIChing.hexNum).tier;

      if (pastTier === todayTier) {
        matches.push({ date: pastStr, hexNum: pastIChing.hexNum, tier: pastTier });
      }
    }
  }

  if (matches.length > 0) {
    const match = matches[0];
    const daysAgo = Math.round((today.getTime() - new Date(match.date + 'T12:00:00').getTime()) / (1000 * 60 * 60 * 24));

    patterns.push({
      type: 'resonance_leap',
      title: `Écho ${todayPD.v} × Yi King Tier-${todayTier}`,
      narrative: `Il y a ${daysAgo} jour${daysAgo > 1 ? 's' : ''}, tu as vécu exactement la même combinaison : PD ${todayPD.v} (${getNumberInfo(todayPD.v).k}) + Yi King Tier ${todayTier}. Ce n'est pas un hasard — le même message te revient. L'univers insiste quand tu n'as pas encore agi.`,
      insight: todayTier <= 'B'
        ? `Le signal est positif et récurrent. Si tu n'as pas agi la première fois, c'est le moment — la fenêtre se referme.`
        : todayTier >= 'D'
        ? `Le signal d'alerte persiste. Ce que tu évites revient — mieux vaut l'affronter maintenant qu'attendre qu'il s'amplifie.`
        : `L'énergie se stabilise dans la neutralité. Observe ce qui se répète dans ta vie ces derniers jours.`,
      years: [parseInt(todayStr.slice(0, 4))],
      systems: [`PD ${todayPD.v}`, `Yi King Tier ${todayTier}`, `Écho à ${daysAgo}j`],
      intensity: matches.length >= 2 ? 'flippant' : 'fort',
      predictive: false,
    });
  }

  return patterns;
}

// ══════════════════════════════════════
// ═══ DÉTECTEUR 11: PHANTOM LOOP (Gemini R7) ═══
// ══════════════════════════════════════
// PPCM(9, 60) = 180 jours. Tous les 180j, le PD ET le pilier BaZi reviennent
// au même point. Si en plus le Challenge actif est le même → déjà-vu algorithmique.
// Prob ~0.15% (180j × match challenge × tier Yi King).
// Implémentation O(1) : on regarde -180j et -360j directement.

function detectPhantomLoop(
  bd: string, num: NumerologyProfile,
): Pattern[] {
  const patterns: Pattern[] = [];
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  try {
    const birthDate = new Date(bd + 'T12:00:00');
    const todayPD = calcPersonalDay(bd, todayStr);
    const todayIChing = calcIChing(bd, todayStr);
    const todayTier = getHexTier(todayIChing.hexNum).tier;
    const todayBazi = calcBaZiDaily(birthDate, today, 50);

    // Checker -180j et -360j
    for (const offset of [-180, -360]) {
      const pastDate = new Date(today);
      pastDate.setDate(pastDate.getDate() + offset);
      const pastStr = pastDate.toISOString().slice(0, 10);

      const pastPD = calcPersonalDay(bd, pastStr);
      const pastIChing = calcIChing(bd, pastStr);
      const pastTier = getHexTier(pastIChing.hexNum).tier;

      // Match PD + Tier Yi King
      if (pastPD.v === todayPD.v && pastTier === todayTier) {
        // Vérifier aussi le BaZi stem
        let baziMatch = false;
        try {
          const pastBazi = calcBaZiDaily(birthDate, pastDate, 50);
          baziMatch = pastBazi.dailyStem.element === todayBazi.dailyStem.element;
        } catch { /* silent */ }

        const daysAgo = Math.abs(offset);
        const monthsAgo = Math.round(daysAgo / 30);

        patterns.push({
          type: 'phantom_loop',
          title: `Boucle Fantôme — ${monthsAgo} mois`,
          narrative: `Il y a exactement ${daysAgo} jours (${monthsAgo} mois), tu avais la même configuration : PD ${todayPD.v} + Yi King Tier ${todayTier}${baziMatch ? ' + même élément BaZi' : ''}. Ce "Phantom Loop" se produit grâce au PPCM du cycle numérologique (9) et BaZi (60) = 180 jours. Tu es dans la même position qu'il y a ${monthsAgo} mois — mais avec ${monthsAgo} mois d'expérience en plus.`,
          insight: `Rappelle-toi ce qui s'est passé il y a ${monthsAgo} mois. Les mêmes opportunités et les mêmes pièges se représentent — mais cette fois, tu sais déjà ce qui fonctionne.`,
          years: [parseInt(todayStr.slice(0, 4))],
          systems: [`PD ${todayPD.v}`, `Yi King Tier ${todayTier}`, `Cycle ${daysAgo}j`, ...(baziMatch ? ['BaZi élément'] : [])],
          intensity: baziMatch ? 'flippant' : 'fort',
          predictive: false,
        });

        break; // On prend le plus récent uniquement
      }
    }
  } catch { /* fail silently */ }

  return patterns;
}

// ══════════════════════════════════════
// ═══ DÉTECTEUR 12: SYSTEMIC BURNOUT (Gemini R5bis) ═══
// ══════════════════════════════════════
// Quand 5+ systèmes sont simultanément négatifs → surcharge systémique.
// C'est le pattern inverse de la Super Convergence. Prob ~3%.
// Détecte : PD=Challenge, Yi King D/E, Mercure rétro, Bio critique, Lune défavorable.

function detectSystemicBurnout(
  bd: string, num: NumerologyProfile, cz: ChineseZodiac,
): Pattern[] {
  const patterns: Pattern[] = [];
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  let negCount = 0;
  const negSources: string[] = [];

  // 1. PD = Challenge actif
  const pdv = calcPersonalDay(bd, todayStr).v;
  const pinnIdx = getActivePinnacleIdx(bd, todayStr, num.lp);
  const activeChallenge = num.challenges[pinnIdx];
  if (activeChallenge && pdv === activeChallenge.v) {
    negCount++;
    negSources.push(`PD ${pdv} = Challenge D${pinnIdx + 1}`);
  }

  // 2. Yi King D ou E tier
  const todayIChing = calcIChing(bd, todayStr);
  const tier = getHexTier(todayIChing.hexNum).tier;
  if (tier === 'D' || tier === 'E') {
    negCount++;
    negSources.push(`Yi King #${todayIChing.hexNum} Tier ${tier}`);
  }

  // 3. Mercure rétrograde
  const merc = getMercuryStatus(today);
  if (merc.points <= -4) {
    negCount++;
    negSources.push(`${merc.label}`);
  }

  // 4. Lune défavorable (phase sombre + élément opposé)
  const moonPhase = getMoonPhase(today);
  const moonTr = getMoonTransit(todayStr);
  if (moonPhase.phase === 0 || moonPhase.phase === 7) { // Nouvelle lune ou dernier quartier
    const czElemMap: Record<string, string> = { 'Métal': 'air', 'Eau': 'water', 'Bois': 'earth', 'Feu': 'fire', 'Terre': 'earth' };
    const czE = czElemMap[cz.elem] || 'earth';
    if (moonTr.element !== czE) {
      negCount++;
      negSources.push(`Lune sombre en ${moonTr.sign}`);
    }
  }

  // 6. 10 Gods négatif
  try {
    const birthDate = new Date(bd + 'T12:00:00');
    const tenGods = calc10Gods(birthDate, today);
    if (tenGods.totalScore <= -4) {
      negCount++;
      negSources.push(`10 Gods négatif (${tenGods.dominant?.label || '?'})`);
    }
  } catch { /* silent */ }

  if (negCount >= 5) {
    patterns.push({
      type: 'systemic_burnout',
      title: `Surcharge Systémique — ${negCount} signaux`,
      narrative: `${negCount} systèmes sont simultanément défavorables : ${negSources.join(', ')}. Ce n'est PAS un mauvais jour — c'est un jour où TOUT te dit de ne rien faire d'important. La probabilité de cette configuration est d'environ ${negCount >= 6 ? '0.5' : '3'}% — c'est rare et temporaire.`,
      insight: `Aujourd'hui n'est pas ton jour. Point. Reporte tout ce qui peut l'être. Protège ton énergie. Fais de l'administratif, du rangement, du repos. Demain la configuration change complètement.`,
      years: [parseInt(todayStr.slice(0, 4))],
      systems: negSources,
      intensity: negCount >= 6 ? 'flippant' : 'fort',
      predictive: false,
    });
  }

  return patterns;
}

export function detectPatterns(
  num: NumerologyProfile,
  cz: ChineseZodiac,
  bd: string,
  today?: string,
): PatternDetectionResult {
  const t = today || (() => { const _d = new Date(); return `${_d.getFullYear()}-${String(_d.getMonth()+1).padStart(2,'0')}-${String(_d.getDate()).padStart(2,'0')}`; })();
  const currentAge = getAge(bd, t);
  const pinnacles = buildPinnacles(num, bd);

  // Lancer les 12 détecteurs (V3.2: +4 Void Course, Resonance Leap, Phantom Loop, Systemic Burnout)
  const cycleMirrors = detectCycleMirrors(bd, currentAge, num, pinnacles);
  const karmicEchoes = detectKarmicEchoes(bd, currentAge, num, pinnacles);
  const pyResonance = detectPinnaclePYResonance(bd, currentAge, num, pinnacles);
  const elementConv = detectElementConvergence(bd, currentAge, num, cz);
  const predictive = detectPredictiveConvergences(bd, currentAge, num, pinnacles);
  const rhythm = detectLifeRhythm(bd, currentAge, num, pinnacles, cz);
  const eclipseKarm = detectEclipseKarmique(bd, currentAge, num, pinnacles);
  const baziMaster = detectBaZiCycleMaster(bd, currentAge);
  const voidCourse = detectVoidCourse(bd, num);
  const resLeap = detectResonanceLeap(bd, num);
  const phantomLoop = detectPhantomLoop(bd, num);
  const burnout = detectSystemicBurnout(bd, num, cz);

  // Combiner et trier tous les patterns
  const allPatterns = [
    ...cycleMirrors,
    ...karmicEchoes,
    ...pyResonance,
    ...elementConv,
    ...predictive,
    ...eclipseKarm,
    ...baziMaster,
    ...voidCourse,
    ...resLeap,
    ...phantomLoop,
    ...burnout,
  ].sort((a, b) => {
    // Trier : flippant > fort > notable, puis predictive en dernier
    const intensityOrder: Record<PatternIntensity, number> = { flippant: 3, fort: 2, notable: 1 };
    const diff = intensityOrder[b.intensity] - intensityOrder[a.intensity];
    if (diff !== 0) return diff;
    return (a.predictive ? 1 : 0) - (b.predictive ? 1 : 0);
  });

  const flippantCount = allPatterns.filter(p => p.intensity === 'flippant').length;

  // Générer le résumé
  const summary = buildSummary(allPatterns, rhythm, currentAge);

  return {
    patterns: allPatterns,
    rhythm,
    summary,
    patternCount: allPatterns.length,
    flippantCount,
  };
}

// ── Summary builder ──

function buildSummary(patterns: Pattern[], rhythm: LifeRhythm, age: number): string {
  const parts: string[] = [];

  parts.push(`Archétype de vie : ${rhythm.archetype}. ${rhythm.description.split('.')[0]}.`);

  const flippants = patterns.filter(p => p.intensity === 'flippant');
  if (flippants.length > 0) {
    parts.push(`${flippants.length} pattern${flippants.length > 1 ? 's' : ''} remarquable${flippants.length > 1 ? 's' : ''} détecté${flippants.length > 1 ? 's' : ''} : ${flippants.slice(0, 2).map(p => p.title).join(' + ')}.`);
  }

  const predictives = patterns.filter(p => p.predictive);
  if (predictives.length > 0) {
    const years = [...new Set(predictives.flatMap(p => p.years))].sort();
    parts.push(`Fenêtres clés à venir : ${years.join(', ')}.`);
  }

  return parts.join(' ');
}

// ── Exports utilitaires pour strategic-reading.ts ──

export { PY_ENERGY, PY_ENERGY_FR, ELEMENT_KEYWORDS };
