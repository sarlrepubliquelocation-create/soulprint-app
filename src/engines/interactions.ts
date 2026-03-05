// ═══ INTERACTIONS ENGINE V8.0 ═══
// Specs: 2 rounds × 3 experts (Grok maths + GPT traditions + Gemini UX)
// V7 : R10/R21/R28/R30 supprimées (biais annuels + double comptage Dasha — R23)
// V8 : R20/R22/R23 supprimées (R26 GPT — incohérence doctrinale avec cœur BaZi+Nakshatra)
//   R20 : proxy Trinity cassé, concept relevant du terrain narratif
//   R22 : hexYangLines dérive d'un hexagramme non-calendaire (incohérent R25)
//   R23 : idem R22 — texture Yin/Yang absorbée par Nakshatra
// Module autonome — appelé par convergence.ts après le scoring de base
// cap total ±6 (V7 : ±8→±6)
//
// DISTRIBUTION V8 (22 règles actives) :
//   5 BaZi-centriques, 4 I Ching-centriques, 3 Numérologie-centriques,
//   3 Lune/Astro-centriques, 2 Triples trans-systèmes, 1 Anti-pattern, 4 Synergies V6

import type { LifeDomain } from './convergence';

// ═══ CONTEXT INPUT ═══
// Construit par convergence.ts à partir des données déjà calculées

export interface InteractionContext {
  // BaZi
  changshengPhase: string | null;       // 'Peak', 'Extinction', 'Birth', 'Tomb', etc.
  tenGodDominant: string | null;        // '正官 Autorité', '傷官 Création Brute', '食神 Expression', '正印 Soutien', etc.
  dmIsYang: boolean;                    // Day Master polarity
  dmElement: string | null;             // 'Bois', 'Feu', 'Terre', 'Métal', 'Eau' (FR from bazi.ts)
  peachBlossomActive: boolean;

  // Shen Sha
  hongLuanActive: boolean;
  yiMaActive: boolean;
  huaGaiActive: boolean;
  tianYiActive: boolean;

  // I Ching
  hexNum: number;
  hexLower: number;             // R28 : index trigramme inférieur (0-7), -1 si non disponible

  // Numérologie
  personalDay: number;                  // 1-9, 11, 22
  personalYear: number;                 // 1-9
  personalMonth: number;                // 1-9

  // Lune / Astro
  moonPhaseIdx: number;                 // 0=new, 1-3=waxing, 4=full, 5-7=waning
  isVoC: boolean;
  mercuryRetro: boolean;
  jupiterPositive: boolean;             // transitBonus > 0 as proxy

  // Trinity (pour anti-double-comptage)
  trinityBonus: number;                 // 0-12

  // V6.0 — Synergies inter-niveaux temporels
  dashaLord: string | null;             // Mahadasha lord actuel (S1 Alignement de Saison, S3 Ancrage Saturnien)
  dashaLordTransitScore: number;        // Score du transit de la planète Dasha lord (0 si absent)
  hexYangLines: number;                 // Nombre de lignes Yang dans l'hex (0-6) — S2 Phase×IChing
  nakshatraName: string | null;         // Nakshatra transit courant — S3 Ancrage Saturnien
  hasJupiterReturn: boolean;            // Retour Jupiter actif ce mois — S4 Couronnement
  hasSolarEclipseNatal: boolean;        // Éclipse solaire sur point natal actif — S5 Naissance Solaire
  profectionSignifiantScore: number;    // Score transit planète signifiante de profection — R27
  profectionHouse: number;             // R29-R30 : maison de profection active (1-12, 0 si inconnu)
}

// ═══ INTERACTION RESULT ═══

export interface ActiveInteraction {
  id: number;
  label: string;
  bonus: number;
  domains: LifeDomain[];
  tradition: string;
}

export interface InteractionResult {
  totalBonus: number;                   // cappé à ±12
  uncapped: number;                     // total brut avant cap
  active: ActiveInteraction[];          // liste des interactions déclenchées
}

// ═══ RULE DEFINITIONS ═══

interface Rule {
  id: number;
  label: string;
  bonus: number;
  bonusFn?: (ctx: InteractionContext) => number; // V6.0 : override bonus si défini (pour bonus dynamiques)
  domains: LifeDomain[];
  tradition: string;
  isTriple?: boolean;                   // soumis à anti-double-comptage Trinity
  test: (ctx: InteractionContext) => boolean;
}

const RULES: Rule[] = [

  // ───────────────────────────────
  // I. BAZI-CENTRIQUES (5)
  // ───────────────────────────────

  {
    id: 1,
    label: 'DiWang + Officier Direct → Autorité légitime',
    bonus: 4,
    domains: ['BUSINESS', 'RELATIONS'],
    tradition: 'BaZi 十神×十二長生',
    test: ctx => ctx.changshengPhase === 'Peak' && (ctx.tenGodDominant?.includes('Autorité') ?? false),
  },
  {
    id: 2,
    label: 'Extinction + Blessure → Sabotage verbal',
    bonus: -4,
    domains: ['RELATIONS'],
    tradition: 'BaZi 傷官見官',
    test: ctx => ctx.changshengPhase === 'Extinction' && (ctx.tenGodDominant?.includes('Création Brute') ?? false),
  },
  {
    id: 3,
    label: 'Naissance + Dieu Nourricier → Créativité fertile',
    bonus: 3,
    domains: ['CREATIVITE', 'VITALITE'],
    tradition: 'BaZi 食神',
    test: ctx => ctx.changshengPhase === 'Birth' && (ctx.tenGodDominant?.includes('Expression') ?? false),
  },
  {
    id: 4,
    label: 'Hong Luan + Peach Blossom → Attraction amplifiée',
    bonus: 4,
    domains: ['AMOUR'],
    tradition: 'Shen Sha 紅鸞×桃花',
    test: ctx => ctx.hongLuanActive && ctx.peachBlossomActive,
  },
  {
    id: 5,
    label: 'Yi Ma + Mercure Rétro → Mouvement perturbé',
    bonus: -3,
    domains: ['BUSINESS'],
    tradition: '驛馬 × astrologie occidentale',
    test: ctx => ctx.yiMaActive && ctx.mercuryRetro,
  },

  // ───────────────────────────────
  // II. I CHING-CENTRIQUES (4)
  // ───────────────────────────────

  {
    id: 6,
    label: 'Hex 1 乾 + Nouvelle Lune → Initiative pure',
    bonus: 4,
    domains: ['BUSINESS'],
    tradition: 'I Ching Hex 1 + symbolique lunaire',
    test: ctx => ctx.hexNum === 1 && ctx.moonPhaseIdx === 0,
  },
  {
    id: 7,
    label: 'Hex 2 坤 + Pleine Lune → Réceptivité maximale',
    bonus: 3,
    domains: ['RELATIONS'],
    tradition: 'I Ching Hex 2 + symbolique lunaire',
    test: ctx => ctx.hexNum === 2 && ctx.moonPhaseIdx === 4,
  },
  {
    id: 8,
    label: 'Hex 30 離 + Day Master Feu → Amplification élémentaire',
    bonus: 3,
    domains: ['CREATIVITE'],
    tradition: 'I Ching Hex 30 × 五行',
    test: ctx => ctx.hexNum === 30 && ctx.dmElement === 'Feu',
  },
  {
    id: 9,
    label: 'Hex 29 坎 + Mercure Rétro → Confusion répétée',
    bonus: -4,
    domains: ['BUSINESS'],
    tradition: 'I Ching Hex 29 + astrologie',
    test: ctx => ctx.hexNum === 29 && ctx.mercuryRetro,
  },

  // ───────────────────────────────
  // III. NUMÉROLOGIE-CENTRIQUES (4)
  // ───────────────────────────────

  // ── R28 : I Ching trigramme inférieur ↔ BaZi Day Master (V8 — Synth. élémentaire) ──
  // Doctrine : Le trigramme inférieur représente l'énergie profonde du jour (racine de l'hexagramme).
  // Chaque trigramme possède un élément dominant (Cinq Agents 五行).
  // Map des 8 trigrammes → élément FR (index 0-7, ordre TRIGRAMS iching.ts) :
  //   0=☰ Ciel → Métal  |  1=☱ Lac → Métal  |  2=☲ Feu → Feu   |  3=☳ Tonnerre → Bois
  //   4=☴ Vent → Bois   |  5=☵ Eau → Eau    |  6=☶ Montagne → Terre  |  7=☷ Terre → Terre
  // Cycles : Bois→Feu→Terre→Métal→Eau→Bois (génération) | Bois→Terre→Eau→Feu→Métal→Bois (contrôle)
  {
    id: 28,
    label: 'Trigramme ↔ DM — Résonance élémentaire I Ching × BaZi',
    bonus: 0,  // dynamique via bonusFn
    bonusFn: (ctx: InteractionContext): number => {
      if (ctx.hexLower < 0 || !ctx.dmElement) return 0;
      const TRIGRAM_ELEM: Record<number, string> = {
        0: 'Métal', 1: 'Métal', 2: 'Feu', 3: 'Bois',
        4: 'Bois',  5: 'Eau',  6: 'Terre', 7: 'Terre',
      };
      const hexElem = TRIGRAM_ELEM[ctx.hexLower];
      if (!hexElem) return 0;
      const dm = ctx.dmElement;
      // Même élément → Cohérence totale
      if (hexElem === dm) return 3;
      // Cycle générateur : hexElem nourrit dmElement (hexElem → dm)
      const GENERATES: Record<string, string> = { Bois: 'Feu', Feu: 'Terre', Terre: 'Métal', Métal: 'Eau', Eau: 'Bois' };
      if (GENERATES[hexElem] === dm) return 2;
      // Cycle contrôleur : hexElem contrôle dmElement (hexElem → dm, relation d'épuisement)
      const CONTROLS: Record<string, string> = { Bois: 'Terre', Feu: 'Métal', Terre: 'Eau', Métal: 'Bois', Eau: 'Feu' };
      if (CONTROLS[hexElem] === dm) return -2;
      return 0; // Neutre (cycle indirect)
    },
    domains: ['BUSINESS', 'CREATIVITE', 'INTROSPECTION'],
    tradition: 'I Ching 八卦 × BaZi 五行 (trigramme profond)',
    // Condition : hexLower disponible (non -1) ET dmElement connu ET hexNum actif (pas narratif pur)
    // Note : contrairement aux règles I Ching V8 qui désactivent hexNum=-1,
    // R28 utilise hexLower (passé séparément) et fonctionne en V8 car l'élément du trigramme
    // est une donnée structurelle du Yi King, indépendante de la consultation calendaire.
    test: (ctx: InteractionContext): boolean => ctx.hexLower >= 0 && !!ctx.dmElement,
  },

  // ── R29 : Profection Maison 7 + Dasha Vénus → Double timing Amour ──
  // Doctrine : Timing hellénistique (Maison 7 = Amour) × Timing védique Dasha Vénus.
  // Convergence rare de deux systèmes sur le même thème = signal exceptionnel.
  {
    id: 29,
    label: 'Maison 7 profectée + Dasha Vénus → Double timing Amour',
    bonus: 3,
    domains: ['AMOUR', 'RELATIONS'],
    tradition: 'Profections hellénistiques × Vimshottari Dasha',
    test: (ctx: InteractionContext): boolean =>
      ctx.profectionHouse === 7 && ctx.dashaLord === 'Vénus',
  },

  // ── R30 : Profection Maison 10 + Dasha Saturne → Double timing Carrière ──
  // Doctrine : Maison 10 = sommet professionnel annuel × Saturne Maha Dasha 19 ans.
  // Convergence lente-annuelle = signal business structurant et durable.
  {
    id: 30,
    label: 'Maison 10 profectée + Dasha Saturne → Double timing Carrière',
    bonus: 2,
    domains: ['BUSINESS'],
    tradition: 'Profections hellénistiques × Vimshottari Dasha',
    test: (ctx: InteractionContext): boolean =>
      ctx.profectionHouse === 10 && ctx.dashaLord === 'Saturne',
  },


  // cyclesDelta absorbé dans terrain multiplicateur, R10 = double biais
  {
    id: 11,
    label: 'Mois Perso 1/9 + Nouvelle Lune → Résonance cyclique',
    bonus: 3,
    domains: ['CREATIVITE'],
    tradition: 'Cycle mensuel numérologique × Lune',
    test: ctx => (ctx.personalMonth === 1 || ctx.personalMonth === 9) && ctx.moonPhaseIdx === 0,
  },
  {
    id: 12,
    label: 'PD 11 Maître + Hua Gai → Vision inspirée',
    bonus: 4,
    domains: ['INTROSPECTION'],
    tradition: 'Numérologie maître 11 × 華蓋',
    test: ctx => ctx.personalDay === 11 && ctx.huaGaiActive,
  },
  {
    id: 13,
    label: 'PD 4 + Hex 52 艮 → Structuration stable',
    bonus: 3,
    domains: ['BUSINESS'],
    tradition: 'Numérologie 4 × I Ching 52',
    test: ctx => ctx.personalDay === 4 && ctx.hexNum === 52,
  },

  // ───────────────────────────────
  // IV. LUNE/ASTRO-CENTRIQUES (3)
  // ───────────────────────────────

  {
    id: 14,
    label: 'Pleine Lune + Peach Blossom → Intensité relationnelle',
    bonus: 3,
    domains: ['AMOUR'],
    tradition: 'Symbolique lunaire × 桃花',
    test: ctx => ctx.moonPhaseIdx === 4 && ctx.peachBlossomActive,
  },
  {
    id: 15,
    label: 'Nouvelle Lune + Ressource Directe → Recharge mentale',
    bonus: 3,
    domains: ['INTROSPECTION'],
    tradition: 'Symbolique lunaire × BaZi 正印',
    test: ctx => ctx.moonPhaseIdx === 0 && (ctx.tenGodDominant?.includes('Soutien') ?? false),
  },
  {
    id: 16,
    label: 'VoC + PD 5 → Dispersion',
    bonus: -3,
    domains: ['VITALITE'],
    tradition: 'Astrologie horaire × Numérologie',
    test: ctx => ctx.isVoC && ctx.personalDay === 5,
  },

  // ───────────────────────────────
  // V. TRIPLES TRANS-SYSTÈMES (2)
  // ───────────────────────────────

  {
    id: 17,
    label: 'PD 1 + DiWang + Hex 1 → Leadership total',
    bonus: 4,
    domains: ['BUSINESS'],
    tradition: 'Numérologie × BaZi × I Ching',
    isTriple: true,
    test: ctx => ctx.personalDay === 1 && ctx.changshengPhase === 'Peak' && ctx.hexNum === 1,
  },
  {
    id: 18,
    label: 'Hua Gai + PD 7 + Nouvelle Lune → Retraite mystique',
    bonus: 4,
    domains: ['INTROSPECTION'],
    tradition: '華蓋 × Numérologie × Lune',
    isTriple: true,
    test: ctx => ctx.huaGaiActive && ctx.personalDay === 7 && ctx.moonPhaseIdx === 0,
  },

  // ───────────────────────────────
  // VI. ANTI-PATTERNS (2)
  // ───────────────────────────────

  {
    id: 19,
    label: 'Hex 44 姤 + Hong Luan → Passion dangereuse',
    bonus: -4,
    domains: ['AMOUR'],
    tradition: 'I Ching Hex 44 × 紅鸞',
    test: ctx => ctx.hexNum === 44 && ctx.hongLuanActive,
  },
  // R20 supprimée V8 — proxy trinityBonus cassé (Trinity supprimé V8)
  // Concept "Année 9 = illusion de culmination" valide mais relève du terrain narratif,
  // pas d'une interaction quotidienne. Aucun proxy inter-système propre. (R26 GPT)

  // ───────────────────────────────
  // VII. SYNERGIES V6.0 — Hiérarchie temporelle (R21-R27)
  // Décisions verrouillées Ronde V6.0 R2 (Grok + GPT + Gemini)
  // ───────────────────────────────

  // R21 supprimée V7 — Dasha déjà dans multiplicateur terrain (40%) → double comptage (GPT+Gemini R23)

  // R22 supprimée V8 — hexYangLines dérive de iching.hexNum (bd + date),
  // système déclaré non-calendaire en L1 (R25). Incohérence doctrinale. (R26 GPT)

  // R23 supprimée V8 — idem R22. Texture Yin/Yang absorbée par Nakshatra. (R26 GPT)

  // R24 — S3 : Force Silencieuse (Ancrage Saturnien)
  // Saturne Maha + Pushya (nakshatra propre de Saturne) = rigueur assumée.
  // +2 compensatoires : Saturne Maha net -4 → -2. Pas positif, moins pénalisant.
  {
    id: 24,
    label: 'Force Silencieuse — Rigueur ancrée dans sa propre étoile',
    bonus: 2,
    domains: ['BUSINESS', 'INTROSPECTION'],
    tradition: 'Vimshottari Dasha × Jyotish Nakshatra',
    test: ctx => ctx.dashaLord === 'Saturne' && ctx.nakshatraName === 'Pushya',
  },

  // R25 — S4 : Couronnement
  // Année 9 + retour Jupiter actif = récolte expansive en fin de cycle.
  {
    id: 25,
    label: 'Couronnement — Finalisez et récoltez',
    bonus: 4,
    domains: ['BUSINESS', 'RELATIONS'],
    tradition: 'Numérologie année 9 × Retours planétaires Jupiter',
    test: ctx => ctx.personalYear === 9 && ctx.hasJupiterReturn,
  },

  // R26 — S5 : Naissance Solaire
  // Éclipse solaire sur point natal + Année 1 = réinitialisation identitaire rare.
  {
    id: 26,
    label: 'Naissance Solaire — Un nouveau chapitre commence',
    bonus: 5,
    domains: ['BUSINESS', 'CREATIVITE', 'INTROSPECTION'],
    tradition: 'Éclipses natales × Numérologie année 1',
    test: ctx => ctx.hasSolarEclipseNatal && ctx.personalYear === 1,
  },

  // R27 — Profections × Transit signifiant
  // La planète maîtresse de l'année de profection est active en transit aujourd'hui.
  // bonusFn : 75% du score transit de la planète signifiante, clamp(-4, +4).
  {
    id: 27,
    label: 'Maître de l\'Année actif — Profection × Transit signifiant',
    bonus: 0,
    bonusFn: ctx => Math.max(-4, Math.min(4, Math.round(ctx.profectionSignifiantScore * 0.75))),
    domains: ['BUSINESS', 'AMOUR', 'RELATIONS'],
    tradition: 'Profections annuelles hellénistiques × Transits personnels',
    test: ctx => Math.abs(ctx.profectionSignifiantScore) >= 2,
  },

  // R28 supprimée V7 — PY constant + Dasha déjà dans terrain multiplicateur → double biais annuel (R23)

  // R29 — Sprint S — Seigneur Maha en transit exact sur point natal
  // R21 (supprimée) était trop large : "seigneur actif = ±2" quelle que soit la force de l'aspect.
  // R29 cible uniquement les lords BÉNÉFIQUES (Jupiter/Vénus/Mercure/Lune) en transit FORT (|score|≥2).
  // dashaLordTransitScore ≠ dashaMultiplier : le premier mesure l'aspect exact du JOUR (±3°),
  // le second mesure la qualité de la PÉRIODE (mois/années) → zéro double-comptage.
  // En pratique : Jupiter est le seul lord bénéfique dans TRANSIT_AMPLITUDES → signal très précis.
  // bonusFn : 60% du score transit, clamp ±3 · seuil ≥ 2 · lords bénéfiques uniquement
  {
    id: 29,
    label: 'Seigneur de la Maha actif — Période et transit en phase',
    bonus: 0,
    bonusFn: ctx => Math.max(-3, Math.min(3, Math.round(ctx.dashaLordTransitScore * 0.60))),
    domains: ['BUSINESS', 'CREATIVITE', 'RELATIONS'],
    tradition: 'Vimshottari Dasha × Transits personnels gaussiens — Sprint S',
    test: ctx => Math.abs(ctx.dashaLordTransitScore) >= 2
               && ['Jupiter', 'Vénus', 'Mercure', 'Lune'].includes(ctx.dashaLord ?? ''),
  },

  // R30 supprimée V7 — PY constant + Dasha déjà dans terrain multiplicateur → double biais annuel (R23)
];

// ═══ MAIN FUNCTION ═══

export function calcInteractions(ctx: InteractionContext): InteractionResult {
  const active: ActiveInteraction[] = [];
  let total = 0;

  // V6.1 — Guards défensifs (Gemini R6) : coercition Number pour éviter NaN si moteur éphémérides échoue
  const safeDashaTransit       = Number(ctx.dashaLordTransitScore) || 0;
  const safeProfectionTransit  = Number(ctx.profectionSignifiantScore) || 0;
  const safeCtx = { ...ctx, dashaLordTransitScore: safeDashaTransit, profectionSignifiantScore: safeProfectionTransit };

  for (const rule of RULES) {
    try {
      if (rule.test(safeCtx)) {
        // V6.0 : bonusFn override bonus statique si défini
        let bonus = rule.bonusFn ? rule.bonusFn(safeCtx) : rule.bonus;

        // ── CORRECTION GPT: Anti-double-comptage Trinity × Triples ──
        if (rule.isTriple && safeCtx.trinityBonus > 6) {
          bonus = Math.round(bonus * 0.5);
        }

        if (bonus !== 0) {
          total += bonus;
          active.push({
            id: rule.id,
            label: rule.label,
            bonus,
            domains: rule.domains,
            tradition: rule.tradition,
          });
        }
      }
    } catch {
      // Rule evaluation failed (missing data) → skip silently
    }
  }

  // ── CAP TOTAL ±6 (V7 : ±8→±6 après suppression biais annuels R10/R21/R28/R30 — R23) ──
  const capped = Math.max(-6, Math.min(6, total));

  return {
    totalBonus: capped,
    uncapped: total,
    active,
  };
}

// ═══ HELPER: Build context from convergence.ts data ═══

export function buildInteractionContext(params: {
  changshengPhase?: string | null;
  tenGodDominant?: string | null;
  dmIsYang?: boolean;
  dmElement?: string | null;
  peachBlossomActive?: boolean;
  shenShaActive?: Array<{ chinese: string; name?: string; key?: string; label_fr?: string }>;
  hexNum: number;
  hexLower?: number;             // R28 : index trigramme inférieur IChingReading.lower
  hexYangLines?: number;
  personalDay: number;
  personalYear: number;
  personalMonth: number;
  moonPhaseIdx: number;
  isVoC?: boolean;
  mercuryRetro?: boolean;
  jupiterPositive?: boolean;
  trinityBonus?: number;
  // V6.0
  dashaLord?: string | null;
  dashaLordTransitScore?: number;
  nakshatraName?: string | null;
  hasJupiterReturn?: boolean;
  hasSolarEclipseNatal?: boolean;
  profectionSignifiantScore?: number;
  profectionHouse?: number;            // R29-R30 : maison de profection active
}): InteractionContext {
  const ssActive = params.shenShaActive || [];
  const hasStar = (keyword: string) =>
    ssActive.some(s =>
      (s.name && s.name.toLowerCase().includes(keyword)) ||
      (s.key && s.key.toLowerCase().includes(keyword)) ||
      s.chinese.includes(keyword) ||
      (s.label_fr && s.label_fr.toLowerCase().includes(keyword))
    );

  return {
    changshengPhase: params.changshengPhase ?? null,
    tenGodDominant: params.tenGodDominant ?? null,
    dmIsYang: params.dmIsYang ?? true,
    dmElement: params.dmElement ?? null,
    peachBlossomActive: params.peachBlossomActive ?? false,
    hongLuanActive: hasStar('紅鸞') || hasStar('hongluan') || hasStar('hong'),
    yiMaActive: hasStar('驛馬') || hasStar('yima') || hasStar('yi ma'),
    huaGaiActive: hasStar('華蓋') || hasStar('huagai') || hasStar('hua gai'),
    tianYiActive: hasStar('天乙') || hasStar('tianyi') || hasStar('tian yi'),
    hexNum: params.hexNum,
    hexLower: params.hexLower ?? -1,
    hexYangLines: params.hexYangLines ?? 3,  // défaut neutre (3 Yang / 3 Yin)
    personalDay: params.personalDay,
    personalYear: params.personalYear,
    personalMonth: params.personalMonth,
    moonPhaseIdx: params.moonPhaseIdx,
    isVoC: params.isVoC ?? false,
    mercuryRetro: params.mercuryRetro ?? false,
    jupiterPositive: params.jupiterPositive ?? false,
    trinityBonus: params.trinityBonus ?? 0,
    // V6.0
    dashaLord: params.dashaLord ?? null,
    dashaLordTransitScore: params.dashaLordTransitScore ?? 0,
    nakshatraName: params.nakshatraName ?? null,
    hasJupiterReturn: params.hasJupiterReturn ?? false,
    hasSolarEclipseNatal: params.hasSolarEclipseNatal ?? false,
    profectionSignifiantScore: params.profectionSignifiantScore ?? 0,
    profectionHouse: params.profectionHouse ?? 0,
  };
}

// ═══ EXPORTS for UI (Level 2 display) ═══

export function getInteractionsSummary(result: InteractionResult): string[] {
  return result.active.map(a => {
    const sign = a.bonus > 0 ? '+' : '';
    const icon = a.bonus > 0 ? '✨' : '⚠️';
    return `${icon} ${a.label} (${sign}${a.bonus})`;
  });
}
