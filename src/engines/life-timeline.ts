// ═══ LIFE TIMELINE ENGINE V2.9 ═══
// Reconstruit le passé d'une personne par périodes en croisant :
//   - Pinnacles & Challenges actifs
//   - Années Personnelles historiques (cycle 1-9 + maîtres)
//   - Transits planétaires universels (Saturne, Uranus, Neptune, Chiron, Nœuds)
//   - Yi King natal
//   - Zodiaque chinois
//   - Nœuds Lunaires (retours 18.6 ans, inversions 9.3 ans)
// V2.9: Portrait enrichi — 20 conditions (10 nouvelles: Nœuds×Animal, Chaldéen×Expr, HexTier, Nœud Sud)
// V1.2: Nœuds Lunaires dans keyMoments, portrait "10 phrases wow"
// V1.1: Universal Shocks (corrélation Transit × PY 9 = TRANSFORMATION RADICALE)
//        PY 9 × Pinnacle Transition détection
// Objectif : phrases rétrospectives si précises que l'utilisateur dit "c'est exactement ça"

import { type NumerologyProfile, type Reduced,
  reduce, calcPersonalYear, calcPinnacles, calcChallenges,
  getNumberInfo, getActivePinnacleIdx,
} from './numerology';
import { calcAgeFromStrings } from './date-utils';
import { type ChineseZodiac } from './chinese-zodiac';
import { calcNatalIChing, getHexProfile, getHexTier } from './iching';
import { getNodeKeyMoments, calcLunarNodes } from './moon';

// ── Types ──

export interface UniversalTransit {
  ageMin: number;
  ageMax: number;
  name: string;
  planet: string;
  theme: string;
  phrase: string;
  force: 'très forte' | 'forte' | 'moyenne';
}

export interface LifePeriod {
  label: string;
  ageStart: number;
  ageEnd: number | null;       // null = fin de vie
  yearStart: number;
  yearEnd: number | null;
  pinnacleIdx: number;
  pinnacle: Reduced;
  challenge: Reduced;
  personalYears: { year: number; age: number; py: Reduced }[];
  transits: UniversalTransit[];
  insights: string[];           // Phrases rétrospectives générées
  sources: string[];            // Systèmes croisés
  intensity: 'forte' | 'moyenne' | 'subtile';
}

export interface LifeTimeline {
  periods: LifePeriod[];
  portrait: string;
  keyMoments: string[];         // Top 5 moments les plus marquants
}

// ── Transits universels (table validée Grok + Gemini) ──

const UNIVERSAL_TRANSITS: UniversalTransit[] = [
  {
    ageMin: 6, ageMax: 8, name: 'Premier carré Saturne',
    planet: 'Saturne', theme: 'structure',
    phrase: 'Vers 7 ans, une première leçon de structure t\'a été imposée — confrontation à l\'autorité, aux règles, à un monde qui ne plie pas.',
    force: 'moyenne',
  },
  {
    ageMin: 13, ageMax: 15, name: 'Opposition Saturne',
    planet: 'Saturne', theme: 'rébellion',
    phrase: 'Vers 14-15 ans, un besoin viscéral de briser un cadre devenu trop étroit — la tension entre ce qu\'on attend de toi et ce que tu veux vraiment.',
    force: 'forte',
  },
  {
    ageMin: 17, ageMax: 19, name: 'Premier retour Nœuds Lunaires',
    planet: 'Nœuds', theme: 'karma',
    phrase: 'Vers 18-19 ans, un nouveau cycle de vie s\'est ouvert — un sentiment de direction, de choix engageant, de bifurcation intérieure.',
    force: 'forte',
  },
  {
    ageMin: 20, ageMax: 22, name: 'Premier retour Jupiter',
    planet: 'Jupiter', theme: 'expansion',
    phrase: 'Vers 21-22 ans, un élan d\'expansion t\'a traversé — un horizon plus large s\'est ouvert, une envie de voir grand.',
    force: 'moyenne',
  },
  {
    ageMin: 28, ageMax: 30, name: 'Retour de Saturne',
    planet: 'Saturne', theme: 'audit',
    phrase: 'Entre 28 et 30 ans, le Retour de Saturne : tes fondations ont été testées. Ce qui n\'était pas aligné avec ta vraie nature a été remis en question — un réalignement profond s\'est opéré.',
    force: 'très forte',
  },
  {
    ageMin: 35, ageMax: 37, name: 'Carré Uranus',
    planet: 'Uranus', theme: 'liberté',
    phrase: 'Vers 36-37 ans, un fort besoin de liberté et d\'authenticité t\'a poussé à remettre en question des choix que tu croyais définitifs.',
    force: 'forte',
  },
  {
    ageMin: 36, ageMax: 38, name: 'Deuxième retour Nœuds Lunaires',
    planet: 'Nœuds', theme: 'karma',
    phrase: 'Vers 37-38 ans, un nouveau chapitre de vie s\'est ouvert — les relations et les alliances ont pris un sens nouveau.',
    force: 'forte',
  },
  {
    ageMin: 40, ageMax: 43, name: 'Opposition Uranus',
    planet: 'Uranus', theme: 'crise',
    phrase: 'Entre 40 et 43 ans, l\'opposition d\'Uranus — un besoin irrésistible de liberté et de rupture interne. Ce que tu avais construit a commencé à te peser autrement.',
    force: 'très forte',
  },
  {
    ageMin: 42, ageMax: 44, name: 'Carré Neptune',
    planet: 'Neptune', theme: 'dissolution',
    phrase: 'Entre 42 et 44 ans, une période de dissolution des illusions et de quête de sens profonde — ce que tu croyais vrai s\'est révélé plus nuancé.',
    force: 'forte',
  },
  {
    ageMin: 48, ageMax: 51, name: 'Retour de Chiron',
    planet: 'Chiron', theme: 'guérison',
    phrase: 'Vers 50 ans, le Retour de Chiron : ta blessure originelle s\'est éclairée d\'un sens nouveau — un potentiel de sagesse et de guérison a émergé.',
    force: 'très forte',
  },
  {
    ageMin: 50, ageMax: 52, name: 'Troisième retour Nœuds Lunaires',
    planet: 'Nœuds', theme: 'karma',
    phrase: 'Vers 50-52 ans, un cycle de vie majeur — le moment de transmettre ce que la vie t\'a enseigné.',
    force: 'forte',
  },
  {
    ageMin: 57, ageMax: 60, name: 'Deuxième Retour de Saturne',
    planet: 'Saturne', theme: 'sagesse',
    phrase: 'Entre 58 et 60 ans, le Second Retour de Saturne : temps de sagesse, de bilan et de transmission. Le maître intérieur prend les commandes.',
    force: 'très forte',
  },
  {
    ageMin: 60, ageMax: 62, name: 'Carré Pluton',
    planet: 'Pluton', theme: 'transformation',
    phrase: 'Vers 60-62 ans, un puissant travail de transformation intérieure et de lâcher-prise — ce qui reste est l\'essentiel.',
    force: 'forte',
  },
];

// ── Thèmes des Années Personnelles ──

// V5.1: Out-clause systématique — dynamiques internes, jamais de faits externes (Ronde #2 consensus 3/3)
// Chaque PY a 3 variantes pour éviter la répétition quand le même cycle revient tous les 9 ans
const PY_THEMES: Record<number, { theme: string; keyword: string; actions: string[] }> = {
  1:  { theme: 'nouveau départ',       keyword: 'Initiative',     actions: [
    'Une impulsion de renouveau t\'a traversé — besoin de repartir de zéro, de te réinventer, de marquer un territoire.',
    'Un élan d\'initiative s\'est imposé — quelque chose de neuf demandait à naître.',
    'Un besoin de repartir à zéro, de te réinventer, de marquer un territoire.',
  ]},
  2:  { theme: 'partenariat',          keyword: 'Patience',       actions: [
    'Un besoin profond de connexion et de patience a émergé. Tu as dû apprendre à écouter avant d\'agir.',
    'Les alliances et la diplomatie ont pris le dessus — apprendre à ne pas forcer.',
    'Un appel à la patience et au partenariat s\'est fait sentir.',
  ]},
  3:  { theme: 'expansion créative',   keyword: 'Expression',     actions: [
    'Un élan d\'expression t\'a porté — besoin de rayonner, de créer, de te rendre visible.',
    'Ta voix intérieure a demandé à sortir — créativité, visibilité, expansion.',
    'Un besoin de te montrer et de créer s\'est imposé.',
  ]},
  4:  { theme: 'construction',         keyword: 'Structure',      actions: [
    'Un appel à la structure s\'est imposé. Tes fondations intérieures ont été consolidées, sans raccourci possible.',
    'Le besoin de construire du solide t\'a rattrapé — rigueur, effort, fondations.',
    'Un travail de fond s\'est imposé — poser des bases qui durent.',
  ]},
  5:  { theme: 'changement majeur',    keyword: 'Liberté',        actions: [
    'Un besoin de rupture et de liberté t\'a traversé — quelque chose devait bouger, se reconfigurer, lâcher.',
    'Une envie de mouvement et de changement a secoué tes structures.',
    'Quelque chose devait lâcher — un appel à la liberté et à la reconfiguration.',
  ]},
  6:  { theme: 'responsabilité',       keyword: 'Engagement',     actions: [
    'Un poids de responsabilité s\'est posé sur tes épaules — engagement, protection, rôle structurant à assumer.',
    'Les engagements et les responsabilités sont devenus centraux.',
    'Un rôle de protection et de guidance s\'est imposé à toi.',
  ]},
  7:  { theme: 'introspection',        keyword: 'Analyse',        actions: [
    'Un recul stratégique s\'est imposé. Besoin de comprendre en profondeur avant de repartir.',
    'Le silence et l\'analyse sont devenus tes alliés — période de recul nécessaire.',
    'Un besoin de ralentir pour mieux comprendre s\'est manifesté.',
  ]},
  8:  { theme: 'récolte et pouvoir',   keyword: 'Puissance',      actions: [
    'Les efforts passés ont mûri. Un sentiment de puissance et de reconnaissance a émergé, que tu l\'aies saisi ou non.',
    'Une période de récolte — ce que tu avais semé a commencé à porter ses fruits.',
    'Un sentiment de puissance et de maîtrise a émergé.',
  ]},
  9:  { theme: 'fin de cycle',         keyword: 'Clôture',        actions: [
    'Un grand lâcher-prise s\'est imposé — le besoin de fermer des chapitres, de nettoyer, de préparer le vide pour le renouveau.',
    'Un cycle s\'est refermé — le besoin de clôturer avant de recommencer.',
    'Le besoin de fermer des chapitres, de nettoyer, de préparer le vide pour le renouveau.',
  ]},
  11: { theme: 'illumination',         keyword: 'Vision',         actions: [
    'Des intuitions fulgurantes ont traversé cette période — une tension nerveuse intense, le sentiment de percevoir plus loin que d\'habitude.',
    'Une vision plus grande que toi s\'est imposée — intensité rare, perception aiguisée.',
    'Un sentiment de mission et d\'illumination intérieure t\'a traversé.',
  ]},
  22: { theme: 'bâtisseur cosmique',   keyword: 'Vision à grande échelle', actions: [
    'Une vision plus grande que toi s\'est imposée — un appel à construire quelque chose qui te dépasse.',
    'Un appel à construire quelque chose qui te dépasse s\'est manifesté.',
    'Le besoin de bâtir à grande échelle, au-delà de toi-même, s\'est imposé.',
  ]},
  33: { theme: 'guérison collective',  keyword: 'Impact',         actions: [
    'Ton impact a débordé ta sphère personnelle — un rôle de transmission, de guérison ou d\'élévation collective s\'est manifesté.',
    'Un rôle de transmission et d\'élévation collective s\'est révélé.',
    'Ton influence a dépassé ton cercle — un appel à guérir et transmettre.',
  ]},
};

// V5.1: Compteur d'occurrences pour varier les formulations
const _pyOccurrenceCount: Record<number, number> = {};
function getPYAction(pyValue: number): string {
  const theme = PY_THEMES[pyValue];
  if (!theme) return '';
  const count = _pyOccurrenceCount[pyValue] || 0;
  _pyOccurrenceCount[pyValue] = count + 1;
  return theme.actions[count % theme.actions.length];
}

// ── Thèmes des Pinnacles ──

// V5.1: Out-clause — dynamiques internes (Ronde #2)
const PINNACLE_THEMES: Record<number, string> = {
  1: 'indépendance et initiative — un besoin de te tenir debout seul s\'est imposé',
  2: 'diplomatie et patience — une nécessité d\'écouter et de tisser des alliances t\'a structuré',
  3: 'créativité et expression — un élan d\'expression et de visibilité t\'a traversé',
  4: 'travail et structure — un appel à bâtir des fondations solides par l\'effort s\'est fait sentir',
  5: 'liberté et changement — un besoin d\'instabilité et de mouvement t\'a fait évoluer',
  6: 'responsabilité et famille — un poids de protection et de guidance s\'est posé sur toi',
  7: 'introspection et spécialisation — un besoin de profondeur et de vie intérieure t\'a recentré',
  8: 'pouvoir et reconnaissance — une énergie de leadership et d\'autorité s\'est manifestée',
  9: 'humanisme et achèvement — un appel à quelque chose de plus grand que toi t\'a porté',
  11: 'vision et illumination — une mission plus grande que toi s\'est imposée avec une intensité rare',
  22: 'bâtisseur cosmique — un projet qui dépasse ta génération a commencé à germer en toi',
  33: 'maître enseignant — une vocation de transmission et d\'élévation s\'est révélée',
};

// ── Thèmes des Challenges ──

const CHALLENGE_THEMES: Record<number, string> = {
  0: 'liberté totale — aucun cadre imposé, ce qui peut être aussi déstabilisant que libérateur',
  1: 'affirmation de soi — tu as dû apprendre à dire "je" et à défendre ta position',
  2: 'sensibilité excessive — tu as dû gérer l\'hypersensibilité et le besoin d\'approbation',
  3: 'dispersion créative — tu as dû apprendre à concentrer ton énergie au lieu de la disperser',
  4: 'rigidité ou chaos — tu as oscillé entre trop de structure et pas assez',
  5: 'peur du changement — tu as dû apprendre à lâcher prise et accepter l\'incertitude',
  6: 'perfectionnisme relationnel — tu as dû accepter que les autres ne sont pas parfaits',
  7: 'isolement intellectuel — tu as dû apprendre à faire confiance aux autres, pas seulement à ton analyse',
  8: 'rapport au pouvoir — tu as dû trouver l\'équilibre entre ambition et intégrité',
};

// ── Labels des périodes de vie ──

function getPeriodLabel(idx: number): string {
  switch (idx) {
    case 0: return '🌱 Fondation & Apprentissage';
    case 1: return '🔥 Action & Réalisation';
    case 2: return '🏔️ Maîtrise & Spécialisation';
    case 3: return '🌳 Sagesse & Transmission';
    default: return `Cycle ${idx + 1}`;
  }
}

// ── Pinnacle periods ──

function getPinnaclePeriods(bd: string, lp: Reduced): { start: number; end: number | null }[] {
  const lpSingle = lp.v > 9 ? reduce(lp.v, false).v : lp.v;
  const p1End = 36 - lpSingle;
  return [
    { start: 0, end: p1End },
    { start: p1End + 1, end: p1End + 9 },
    { start: p1End + 1 + 9, end: p1End + 18 },
    { start: p1End + 1 + 18, end: null },
  ];
}

// ── Transits pour une tranche d'âge ──

function getTransitsForPeriod(ageStart: number, ageEnd: number): UniversalTransit[] {
  return UNIVERSAL_TRANSITS.filter(t =>
    (t.ageMin >= ageStart && t.ageMin <= ageEnd) ||
    (t.ageMax >= ageStart && t.ageMax <= ageEnd)
  );
}

// ── PY remarquables pour une période ──

function getRemarkableYears(bd: string, birthYear: number, ageStart: number, ageEnd: number): { year: number; age: number; py: Reduced }[] {
  const result: { year: number; age: number; py: Reduced }[] = [];
  for (let age = Math.max(0, ageStart); age <= ageEnd; age++) {
    const year = birthYear + age;
    const py = calcPersonalYear(bd, year);
    // Garder : PY 1, 5, 8, 9, 11, 22 (les plus marquantes)
    if ([1, 5, 8, 9, 11, 22, 33].includes(py.v)) {
      result.push({ year, age, py });
    }
  }
  return result;
}

// ── Génération d'insights par période ──

function generatePeriodInsights(
  period: { pinnacleIdx: number; pinnacle: Reduced; challenge: Reduced; ageStart: number; ageEnd: number },
  transits: UniversalTransit[],
  remarkableYears: { year: number; age: number; py: Reduced }[],
  currentAge: number,
  czAnimal: string,
  czElem: string,
  prevPinnacleV?: number,
): { insights: string[]; sources: string[] } {
  const insights: string[] = [];
  const sources: string[] = [];
  const pInfo = getNumberInfo(period.pinnacle.v);
  const cInfo = getNumberInfo(period.challenge.v);
  const pinnTheme = PINNACLE_THEMES[period.pinnacle.v] || `énergie ${pInfo.k}`;
  const challTheme = CHALLENGE_THEMES[period.challenge.v] || `défi ${cInfo.k}`;

  // Ne générer que pour le passé (périodes déjà vécues ou en cours)
  if (period.ageStart > currentAge + 5) return { insights, sources };

  // 1. Insight Pinnacle + Challenge
  const isLived = period.ageEnd !== null && period.ageEnd <= currentAge;
  const isCurrent = !isLived && period.ageStart <= currentAge;

  const samePinnAsPrev = prevPinnacleV !== undefined && prevPinnacleV === period.pinnacle.v;
  const continuityNote = samePinnAsPrev
    ? ` Cette grande phase de vie (phase ${period.pinnacle.v}, nombre maître) a été une période d'intensité exceptionnelle — visibilité accrue, tensions nerveuses, mais potentiel de réalisation hors norme.`
    : '';

  if (isLived) {
    if (samePinnAsPrev) {
      insights.push(
        `Durant cette période (${period.ageStart}-${period.ageEnd} ans), ta ${period.pinnacleIdx + 1}e grande phase de vie a prolongé l\'énergie ${period.pinnacle.v} (${pInfo.k}) mais avec une maturité nouvelle. Le défi associé ${period.challenge.v} (${cInfo.k}) t\'a imposé de travailler ${challTheme} — une leçon différente de la phase précédente malgré la même énergie de fond.${continuityNote}`
      );
    } else {
      insights.push(
        `Durant cette période (${period.ageStart}-${period.ageEnd} ans), ta ${period.pinnacleIdx + 1}e grande phase de vie (phase ${period.pinnacle.v} — ${pInfo.k}) a orienté ta vie vers ${pinnTheme}. Le défi associé ${period.challenge.v} (${cInfo.k}) t\'a imposé de travailler ${challTheme}.`
      );
    }
    sources.push('Phase de vie ' + (period.pinnacleIdx + 1), 'Défi ' + (period.pinnacleIdx + 1));
  } else if (isCurrent) {
    insights.push(
      `Tu es actuellement dans ta ${period.pinnacleIdx + 1}e grande phase de vie (phase ${period.pinnacle.v} — ${pInfo.k}) — énergie de ${pinnTheme}. Le défi associé ${period.challenge.v} (${cInfo.k}) t\'oblige à travailler sur ${challTheme}.`
    );
    sources.push('Phase de vie', 'Défi de vie');
  }

  // ── Collecte de TOUS les événements datés pour tri chronologique ──
  // V5.2: Fix va-et-vient temporels — tout est collecté puis trié par âge
  // order: 0=transit, 1=convergence, 2=PY — pour sub-sort à âge identique
  type DatedInsight = { age: number; order: number; text: string; source: string };
  const dated: DatedInsight[] = [];

  // 3. Convergences Transit × Pinnacle × PY (collectées AVANT pour savoir quels transits sont couverts)
  const coveredTransitNames = new Set<string>();
  transits.forEach(tr => {
    if (tr.ageMax > currentAge + 2) return;
    const coincidingPY = remarkableYears.find(ry =>
      ry.age >= tr.ageMin - 1 && ry.age <= tr.ageMax + 1
    );
    if (coincidingPY) {
      const pyTheme = PY_THEMES[coincidingPY.py.v];
      if (pyTheme) {
        const isShock = coincidingPY.py.v === 9 && tr.force === 'très forte';
        const shockPrefix = isShock
          ? `🌟 TRANSFORMATION RADICALE à ${coincidingPY.age} ans (${coincidingPY.year}) : `
          : `À ${coincidingPY.age} ans (${coincidingPY.year}), triple convergence : `;
        const shockSuffix = isShock
          ? ` Ce portail a probablement provoqué une mutation profonde — fin d'un chapitre + début radical d'un autre.`
          : '';
        dated.push({
          age: coincidingPY.age,
          order: 1,
          text: `${shockPrefix}${tr.name} + phase de vie ${period.pinnacle.v} + Année ${coincidingPY.py.v} (${pyTheme.keyword}). ${getPYAction(coincidingPY.py.v)}${shockSuffix}`,
          source: isShock ? 'Universal Shock' : 'Convergence triple',
        });
        coveredTransitNames.add(tr.name); // Ce transit est couvert par la convergence
      }
    }
  });

  // 2. Transits majeurs — seulement ceux qui n'ont PAS de convergence associée
  transits.forEach(tr => {
    if (tr.ageMax <= currentAge + 2 && !coveredTransitNames.has(tr.name)) {
      dated.push({ age: tr.ageMin, order: 0, text: tr.phrase, source: tr.name });
    }
  });

  // Shock PY9 × transition Pinnacle
  remarkableYears.forEach(ry => {
    if (ry.age > currentAge) return;
    if (ry.py.v !== 9) return;
    const isPinnacleTransition = Math.abs(ry.age - period.ageEnd) <= 1;
    if (isPinnacleTransition && period.ageEnd !== null) {
      const alreadyCoveredByTransit = transits.some(tr =>
        ry.age >= tr.ageMin - 1 && ry.age <= tr.ageMax + 1
      );
      if (!alreadyCoveredByTransit) {
        dated.push({
          age: ry.age,
          order: 1,
          text: `🔄 En ${ry.year} (${ry.age} ans), fin de cycle de vie (Année Perso 9) synchronisée avec le changement de grande phase de vie ${period.pinnacleIdx + 1}→${period.pinnacleIdx + 2}. Changement de direction majeur.`,
          source: 'AP9 × Changement de phase',
        });
      }
    }
  });

  // 4. PY remarquables hors transits
  remarkableYears.forEach(ry => {
    if (ry.age > currentAge) return;
    const pyTheme = PY_THEMES[ry.py.v];
    if (!pyTheme) return;
    const alreadyCovered = transits.some(tr =>
      ry.age >= tr.ageMin - 1 && ry.age <= tr.ageMax + 1
    );
    if (!alreadyCovered && [9, 1, 22, 11].includes(ry.py.v)) {
      dated.push({
        age: ry.age,
        order: 2,
        text: `En ${ry.year} (${ry.age} ans), Année Personnelle ${ry.py.v} (${pyTheme.keyword}) : ${getPYAction(ry.py.v)}`,
        source: `PY ${ry.py.v} (${ry.year})`,
      });
    }
  });

  // ── TRI CHRONOLOGIQUE STRICT puis injection ──
  // Sub-sort par order pour les âges identiques (transit avant convergence avant PY)
  dated.sort((a, b) => a.age - b.age || a.order - b.order);

  // V5.2: Fusionner les convergences au même âge pour éviter la répétition
  // "À 35 ans (2012), triple convergence: X" + "À 35 ans (2012), triple convergence: Y"
  // → une seule phrase avec les deux événements
  const merged: typeof dated = [];
  for (let i = 0; i < dated.length; i++) {
    const cur = dated[i];
    // Chercher les convergences consécutives au même âge (order === 1)
    if (cur.order === 1 && i + 1 < dated.length && dated[i + 1].age === cur.age && dated[i + 1].order === 1) {
      // Fusionner : garder le préfixe "À X ans (YYYY)" une seule fois
      const agePrefix = `À ${cur.age} ans`;
      let combinedText = cur.text;
      let combinedSources = cur.source;
      while (i + 1 < dated.length && dated[i + 1].age === cur.age && dated[i + 1].order === 1) {
        i++;
        // Retirer le préfixe "À X ans (YYYY), triple convergence : " du suivant
        const nextText = dated[i].text.replace(/^À \d+ ans \(\d+\),?\s*/, '');
        combinedText += ` ${nextText}`;
        combinedSources += `, ${dated[i].source}`;
      }
      merged.push({ ...cur, text: combinedText, source: combinedSources });
    } else {
      merged.push(cur);
    }
  }

  merged.forEach(d => {
    insights.push(d.text);
    sources.push(d.source);
  });

  // 5. Pinnacle maître → phrase spéciale (toujours en dernier, c'est un bilan)
  if (period.pinnacle.m && isLived) {
    insights.push(
      `Cette grande phase de vie (phase ${period.pinnacle.v}, nombre maître) a été une période d'intensité exceptionnelle — visibilité accrue, tensions nerveuses, mais potentiel de réalisation hors norme.`
    );
    sources.push('Nombre Maître');
  }

  return { insights, sources: [...new Set(sources)] };
}

// ══════════════════════════════════════
// ═══ EXPORT PRINCIPAL ═══
// ══════════════════════════════════════

export function generateLifeTimeline(
  num: NumerologyProfile,
  cz: ChineseZodiac,
  bd: string,
  today?: string,
): LifeTimeline {
  // V5.1: Reset du compteur de variantes PY à chaque génération
  for (const k in _pyOccurrenceCount) delete _pyOccurrenceCount[Number(k)];

  const t = today || (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
  const birthYear = parseInt(bd.split('-')[0]);
  const currentAge = calcAgeFromStrings(t, bd);

  const pinnacles = calcPinnacles(bd);
  const challenges = calcChallenges(bd);
  const pinnaclePeriods = getPinnaclePeriods(bd, num.lp);

  // Yi King natal
  const natalHex = calcNatalIChing(bd);
  const natalProfile = getHexProfile(natalHex.hexNum);

  // Construction des périodes
  const periods: LifePeriod[] = pinnaclePeriods.map((pp, idx) => {
    const ageStart = pp.start;
    const ageEnd = pp.end !== null ? pp.end : Math.max(currentAge + 10, 80);
    const transits = getTransitsForPeriod(ageStart, ageEnd);
    const remarkableYears = getRemarkableYears(bd, birthYear, ageStart, ageEnd);
    const pinnacle = pinnacles[idx];
    const challenge = challenges[idx];

    const prevPinnV = idx > 0 ? pinnacles[idx - 1].v : undefined;
    const { insights, sources } = generatePeriodInsights(
      { pinnacleIdx: idx, pinnacle, challenge, ageStart, ageEnd: pp.end ?? 99 },
      transits,
      remarkableYears,
      currentAge,
      cz.animal,
      cz.elem,
      prevPinnV,
    );

    // Intensité selon nombre de convergences
    const hasVeryStrong = transits.some(tr => tr.force === 'très forte' && tr.ageMax <= currentAge);
    const hasMaster = pinnacle.m;
    const intensity: 'forte' | 'moyenne' | 'subtile' =
      (hasVeryStrong && hasMaster) ? 'forte' :
      (hasVeryStrong || hasMaster || insights.length >= 4) ? 'moyenne' : 'subtile';

    return {
      label: getPeriodLabel(idx),
      ageStart,
      ageEnd: pp.end,
      yearStart: birthYear + ageStart,
      yearEnd: pp.end !== null ? birthYear + pp.end : null,
      pinnacleIdx: idx,
      pinnacle,
      challenge,
      personalYears: remarkableYears,
      transits,
      insights,
      sources,
      intensity,
    };
  });

  // ── Portrait identitaire (10 phrases "c'est exactement moi") ──
  const lpInfo = getNumberInfo(num.lp.v);
  const exprInfo = getNumberInfo(num.expr.v);
  const soulInfo = getNumberInfo(num.soul.v);
  const persInfo = getNumberInfo(num.pers.v);
  const matInfo = getNumberInfo(num.mat.v);
  const masters = [num.lp, num.expr, num.soul, num.pers].filter(r => r.m);

  // V2.9: Données supplémentaires pour portrait enrichi
  const natalNodes = calcLunarNodes(bd);
  const natalHexTier = getHexTier(natalHex.hexNum);

  const portrait = buildIdentityPortrait(num, cz, natalHex, natalProfile, lpInfo, exprInfo, soulInfo, matInfo, masters, currentAge, natalNodes, natalHexTier);

  // ── Key Moments (top 5 moments les plus marquants) ──
  const keyMoments: string[] = [];

  // Saturn Return + PY check
  if (currentAge >= 28) {
    const saturnPY = remarkableYearAt(bd, birthYear, 29);
    const isFatalCorrelation = saturnPY && saturnPY.v === 9;
    keyMoments.push(
      `🌟 Retour de Saturne (${birthYear + 29}) — Audit de vie à 29 ans` +
      (saturnPY ? `, Année ${saturnPY.v} (${PY_THEMES[saturnPY.v]?.keyword || '?'})` : '') +
      (isFatalCorrelation ? ' ⚠️ TRANSFORMATION RADICALE (Saturn Return × PY 9)' : '')
    );
  }

  // Transitions de Pinnacle
  pinnaclePeriods.forEach((pp, idx) => {
    if (pp.end !== null && pp.end <= currentAge && pp.end > 0) {
      const transYear = birthYear + pp.end;
      keyMoments.push(
        `🔄 Changement de grande phase de vie ${idx + 1}→${idx + 2} (${transYear}, ${pp.end} ans) — passage de ${getNumberInfo(pinnacles[idx].v).k} à ${getNumberInfo(pinnacles[idx + 1]?.v || 0).k}`
      );
    }
  });

  // Opposition Uranus (midlife)
  if (currentAge >= 40) {
    keyMoments.push(`🌪️ Opposition Uranus (${birthYear + 42}) — Crise de liberté et de sens à 42 ans`);
  }

  // PY 22 (maître bâtisseur)
  for (let age = 18; age <= currentAge; age++) {
    const py = calcPersonalYear(bd, birthYear + age);
    if (py.v === 22) {
      keyMoments.push(`🏗️ Année 22 (${birthYear + age}, ${age} ans) — Vision à grande échelle, construction majeure`);
      break; // Juste la première pour éviter la redondance
    }
  }

  // Chiron Return si applicable
  if (currentAge >= 50) {
    keyMoments.push(`💊 Retour de Chiron (${birthYear + 50}) — Guérison de la blessure fondamentale`);
  }

  // V2.5: Retours des Nœuds Lunaires (cycle 18.6 ans)
  const nodeReturns = getNodeKeyMoments(bd);
  nodeReturns
    .filter(nr => nr.age <= currentAge + 5) // passés + proches
    .slice(0, 3) // max 3 moments nodaux
    .forEach(nr => {
      keyMoments.push(`☊ ${nr.label} (${nr.year})`);
    });

  return {
    periods,
    portrait,
    keyMoments: keyMoments.slice(0, 7),
  };
}

// ── Helpers ──

function remarkableYearAt(bd: string, birthYear: number, age: number): Reduced | null {
  try { return calcPersonalYear(bd, birthYear + age); } catch { return null; }
}

function buildIdentityPortrait(
  num: NumerologyProfile,
  cz: ChineseZodiac,
  natalHex: { hexNum: number; name: string },
  natalProfile: ReturnType<typeof getHexProfile>,
  lpInfo: ReturnType<typeof getNumberInfo>,
  exprInfo: ReturnType<typeof getNumberInfo>,
  soulInfo: ReturnType<typeof getNumberInfo>,
  matInfo: ReturnType<typeof getNumberInfo>,
  masters: Reduced[],
  currentAge: number,
  natalNodes?: ReturnType<typeof calcLunarNodes>,
  natalHexTier?: ReturnType<typeof getHexTier>,
): string {
  const lines: string[] = [];
  const nodeSign = natalNodes?.northNode?.sign || '';
  const southSign = natalNodes?.southNode?.sign || '';

  // ── 1. Identité profonde (CdV + Animal + Yin/Yang) ──
  // Source: Grok phrase 1 + GPT phrase 4
  if (masters.length >= 3) {
    lines.push(
      `Tu es un Triple ${masters[0].v} rare : visionnaire dans l'âme, dans l'expression et dans l'image que tu projettes. Tu n'es pas fait pour un rôle d'exécutant — tu es fait pour incarner une vision, même si elle dérange.`
    );
  } else if (masters.length >= 2) {
    lines.push(
      `Profil à ${masters.length} nombres maîtres (${masters.map(m => m.v).join(', ')}) — dès l'enfance, tu as ressenti que tu n'étais pas là pour une vie ordinaire. L'intensité est ta signature.`
    );
  } else {
    lines.push(
      `Tu es né sous l'énergie du ${cz.czY} (${cz.yy}), avec un Chemin de vie ${num.lp.v}${num.lp.m ? ' maître' : ''} (${lpInfo.k}). ${cz.yy === 'Yang' ? 'Ton énergie est d\'initiative et d\'action' : 'Ton énergie est de réceptivité et de stratégie'}.`
    );
  }

  // ── 2. Le paradoxe fondamental (Expression vs Âme) ──
  // Source: Gemini phrase 1 — "vision de 11, exécution de 4"
  const exprSingle = num.expr.v > 9 ? num.expr.ch[num.expr.ch.length - 1] : num.expr.v;
  if (num.soul.m && !num.expr.m) {
    lines.push(
      `Tu es né avec la vision d'un maître (${num.soul.v}) enfermé dans le besoin de construire des structures solides (${exprInfo.k} ${num.expr.v}) : tu ne supportes pas l'amateurisme.`
    );
  } else if (num.expr.v !== num.soul.v) {
    lines.push(
      `Ton Expression ${num.expr.v} (${exprInfo.k}) est alimentée par une motivation profonde de ${soulInfo.k} (Âme ${num.soul.v}). C'est ce qui fait de toi un ${exprInfo.k.toLowerCase()} qui ne construit pas au hasard.`
    );
  }

  // ── 3. Le rapport paradoxal à la stabilité ──
  // Source: GPT phrase 7 — détection dynamique
  const has5 = num.lp.v === 5 || num.pinnacles.some(p => p.v === 5);
  const has4 = num.challenges.some(c => c.v === 4) || num.expr.v === 4;
  if (has5 && has4) {
    lines.push(
      `Tu as un rapport paradoxal à la stabilité : tu la veux, mais tu la détruis quand elle devient limitante. L'aventure (${has5 ? '5' : ''}) et la structure (${has4 ? '4' : ''}) se battent en toi.`
    );
  }

  // ── 4. Animal chinois — capacité stratégique ──
  // Source: Gemini phrase 6 — adapté à l'animal
  const animalTraits: Record<string, string> = {
    'Serpent': 'cette capacité rare à attendre le moment parfait pour frapper, avec une efficacité chirurgicale',
    'Dragon': 'une puissance naturelle qui attire autant qu\'elle intimide',
    'Tigre': 'un instinct de leader qui prend les commandes dans le chaos',
    'Rat': 'une intelligence adaptative qui te fait toujours trouver une sortie',
    'Bœuf': 'une endurance qui épuise tes concurrents',
    'Lapin': 'un sens diplomatique qui désarme les conflits avant qu\'ils n\'éclatent',
    'Cheval': 'une énergie galopante qui entraîne les autres dans ton sillage',
    'Chèvre': 'une créativité intuitive qui voit la beauté là où les autres voient le chaos',
    'Singe': 'une agilité mentale qui te donne toujours un coup d\'avance',
    'Coq': 'une précision et un sens du détail que les autres sous-estiment à leurs dépens',
    'Chien': 'une loyauté stratégique qui fait de toi le pilier de tes cercles',
    'Cochon': 'une générosité qui cache une intelligence bien plus aiguisée qu\'on ne le croit',
  };
  const trait = animalTraits[cz.animal] || 'une capacité de transformation qui te rend imprévisible';
  lines.push(
    `Ton ${cz.animal} de ${cz.elem} te donne ${trait}. ${cz.elem === 'Feu' ? 'Le Feu amplifie ton intensité naturelle.' : cz.elem === 'Eau' ? 'L\'Eau te donne profondeur et intuition.' : cz.elem === 'Bois' ? 'Le Bois nourrit ta croissance constante.' : cz.elem === 'Métal' ? 'Le Métal aiguise ta détermination.' : 'La Terre ancre ta vision dans le concret.'}`
  );

  // ── 5. Le guide qui doute ──
  // Source: GPT phrase 6 — détection triple maître ou CdV 11/22
  if (num.lp.m || masters.length >= 2) {
    lines.push(
      `Tu attires des personnes qui cherchent un guide, mais tu doutes parfois de ta propre légitimité. Ce paradoxe est la signature des nombres maîtres — le doute est le prix de la vision.`
    );
  }

  // ── 6. Le décideur solitaire ──
  // Source: GPT phrase 9 — détection Lune Verseau-like (indépendance intellectuelle)
  if ([1, 7, 11].includes(num.lp.v) || cz.yy === 'Yin') {
    lines.push(
      `Tu prends les décisions importantes seul, même si tu sembles consulter. C'est à la fois ta force et ta vulnérabilité.`
    );
  }

  // ── 7. Yi King natal ──
  if (natalProfile) {
    lines.push(
      `Ton Yi King natal (hex. ${natalHex.hexNum} — ${natalProfile.archetype}) révèle que tu réussis mieux quand tu ${(natalProfile.action?.toLowerCase() || 'écoutes ton instinct').replace(/\.\s*$/, '')}.`
    );
  }

  // ── 8. Leçons karmiques — le vide ressenti ──
  // Source: Gemini phrase 5 — "tu as longtemps senti un vide"
  if (num.kl.length > 0) {
    const firstLesson = num.kl[0];
    lines.push(
      `Tu as longtemps senti un vide autour du ${firstLesson} (${getNumberInfo(firstLesson).k}). Ce n'était pas une faiblesse, mais une leçon que tu es venu intégrer par l'effort.`
    );
  }

  // ── 9. Maturité — la direction future ──
  // Source: Gemini phrase 10 + Grok phrase 10
  if (currentAge >= 40) {
    lines.push(
      `Ton nombre de Maturité ${num.mat.v} (${matInfo.k}) est pleinement actif : ton succès n'est plus seulement financier, il devient une question d'${matInfo.k.toLowerCase()} et de transmission.`
    );
  } else {
    lines.push(
      `Ton nombre de Maturité ${num.mat.v} (${matInfo.k}) s'active progressivement — la seconde partie de ta vie sera centrée sur l'${matInfo.k.toLowerCase()}.`
    );
  }

  // ── 10. Le défi réel ──
  // Source: GPT phrase 10 — "ton défi n'est pas la réussite"
  if (masters.length >= 2 || cz.elem === 'Feu') {
    lines.push(
      `Ton défi n'est pas la réussite — c'est la canalisation de ton intensité. Chaque fois que la vie t\'a mis à terre, tu t\'es relevé plus fort et plus stratégique.`
    );
  } else {
    lines.push(
      `Le ${cz.animal} de ${cz.elem} t\'a donné une capacité de transformation hors norme. Chaque fois que la vie t\'a mis à terre, tu t\'es relevé plus fort et plus stratégique.`
    );
  }

  // ═══ V2.9: 10 NOUVELLES CONDITIONS (audit Grok — croisements inter-systèmes) ═══
  // Sélectivité : 3-12% des profils → très ciblé

  // ── 11. CdV 11 + Nœud Nord Bélier/Lion + Serpent/Dragon → "Stratège visionnaire"
  if (num.lp.v === 11 && ['Bélier', 'Lion'].includes(nodeSign) && ['Serpent', 'Dragon'].includes(cz.animal)) {
    lines.push(
      `Ton triple 11 + Nœud Nord en ${nodeSign} + ${cz.animal} fait de toi un stratège visionnaire qui voit les opportunités 6 mois avant les autres. Ce n'est pas de l'intuition — c'est de la pattern recognition cosmique.`
    );
  }

  // ── 12. Expression 4 + Challenge 7 + Yi King natal Armée/Commandant → "Bâtisseur silencieux"
  if (num.expr.v === 4 && num.challenges.some(c => c.v === 7) && natalHexTier && natalHexTier.tier <= 'B') {
    lines.push(
      `Ton Expression 4 (bâtisseur) rencontre le défi 7 (introspection) sous l'archétype ${natalProfile?.archetype || 'de ton Yi King natal'} — tu construis en silence avant de diriger publiquement.`
    );
  }

  // ── 13. Soul 11 + Animal Serpent/Lapin → "Intuition prophétique"
  if (num.soul.v === 11 && ['Serpent', 'Lapin', 'Rat'].includes(cz.animal)) {
    lines.push(
      `Ton Âme 11 + ${cz.animal} crée une intuition quasi prophétique — tu ressens les tendances avant qu'elles n'existent. Le défi : convaincre les autres de ce que tu vois déjà.`
    );
  }

  // ── 14. Maturité 6 + Âge ≥45 + Nœud Nord Balance → "L'harmoniseur"
  if (num.mat.v === 6 && currentAge >= 45 && nodeSign === 'Balance') {
    lines.push(
      `Ta Maturité 6 + Nœud Nord en Balance te transforme en harmoniseur et médiateur de haut niveau. C'est ton rôle naturel pour la seconde moitié de vie.`
    );
  }

  // ── 15. Chaldéen + Expression + Challenge identiques → "Maître de la structure"
  if (num.ch && num.ch.rd.v === num.expr.v && num.challenges.some(c => c.v === num.expr.v)) {
    lines.push(
      `Ton Chaldéen ${num.ch.rd.v} = Expression ${num.expr.v} = Challenge actif — triple résonance du même nombre. Tu es un maître de cette énergie, mais elle te consume si tu ne la canalises pas.`
    );
  }

  // ── 16. Leçon karmique = CdV + Nœud Sud → "Mission double"
  if (num.kl.includes(num.lp.v) && ['Scorpion', 'Cancer', 'Poissons'].includes(southSign)) {
    lines.push(
      `Ta qualité à développer ${num.lp.v} est aussi ton Chemin de Vie, et ton Nœud Sud en ${southSign} confirme : tu es venu transformer exactement ce que tu portais en héritage.`
    );
  }

  // ── 17. Yi King natal A-tier + CdV 1/8 → "Créateur-né"
  if (natalHexTier && natalHexTier.tier === 'A' && [1, 8].includes(num.lp.v)) {
    lines.push(
      `Ton Yi King natal (hex. ${natalHex.hexNum} — ${natalHexTier.label}) + CdV ${num.lp.v} : tu es un créateur-né. Les projets que tu lances portent une signature unique que les imitateurs n'arrivent pas à reproduire.`
    );
  }

  // ── 18. Triple maître + Nœud Nord Lion → "Leader d'impact"
  if (masters.length >= 3 && nodeSign === 'Lion') {
    lines.push(
      `Triple maître + Nœud Nord en Lion = profil de leader d'impact mondial. Le risque n'est pas l'échec — c'est de jouer trop petit pour ce que tu es.`
    );
  }

  // ── 19. Animal Feu + CdV action (1/5/8) + Pinnacle maître → "Combustion productive"
  if (cz.elem === 'Feu' && [1, 5, 8].includes(num.lp.v) && num.pinnacles.some(p => p.m)) {
    lines.push(
      `${cz.animal} de Feu + Chemin ${num.lp.v} + phase de vie maître = combustion productive permanente. Les autres te trouvent intense — c'est parce qu'ils ne fonctionnent pas à la même vitesse.`
    );
  }

  // ── 20. Nœud Sud Scorpion/Capricorne + Leçon 8 → "Pouvoir karmique"
  if (['Scorpion', 'Capricorne'].includes(southSign) && num.kl.includes(8)) {
    lines.push(
      `Nœud Sud en ${southSign} + Leçon 8 : ta relation au pouvoir est profonde et naturelle. Tu as déjà connu l'autorité dans d'autres formes — cette vie te demande de l'exercer avec sagesse.`
    );
  }

  // Limiter à 12 phrases max (10 de base + 2 bonus si conditions rares)
  return lines.slice(0, 12).join('\n');
}
