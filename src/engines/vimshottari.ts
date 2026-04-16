/**
 * vimshottari.ts — Moteur Vimshottari Dasha — Kaironaute V5.1
 *
 * Implémente le système Vimshottari Dasha complet (Mahadasha + Antardasha)
 * selon la tradition Jyotish / Brihat Parashara Hora Shastra.
 *
 * Remplace la règle #26 (proxy Da Yun × PY) supprimée en V5.1.
 *
 * Décisions verrouillées (Ronde R1 + R2, consensus 3/3 IAs) :
 *   - Noms des seigneurs en français (cohérence avec nakshatras.ts)
 *   - Années juliennes (365.25j) pour éviter dérive ~20j sur 80 ans
 *   - Mahadasha bénéfique/maléfique selon tradition védique standard
 *   - Moon = +1 waxing natal / -1 waning natal (phase lunaire natale)
 *   - Rahu : -1 par défaut, neutralisé si transit #25 est aussi Rahu (Option H)
 *   - Cap ±8 (4+2+2) — zéro clipping
 *   - Sandhi ±30j : flag narratif seul (score intact)
 *   - pratyantar reporté V5.2
 *
 * V5.2 : Ajout Pratyantardasha (3e niveau)
 *   - pratyanScore ±1 propre
 *   - Synergie ±2 inchangée (Maha×Antar uniquement)
 *   - Cap Dasha ±9 (4+2+1+2 = 9 exact — zéro clipping)
 *   - isTransition forcé à false sur Pratyantar (±30j n'a pas de sens sur ~60j)
 *   - Inclus dans calcDayPreview (41% des jours changent dans fenêtre 30j)
 *   - Narratives "météo semaine" par seigneur
 *   - Triple alignement : convergence narrative "Résonance Totale" (pas de scoring)
 *
 * Exports publics :
 *   calcCurrentDasha()      — Calcule Maha + Antar + Pratyantar + nextMaha
 *   calcDashaScore()        — Score ±9 depuis CurrentDasha
 *   getDashaAntarLordIndex()— Index 0-8 pour vecteur PSI (inchangé)
 *
 * @version 5.2
 */

// ── Constantes ──────────────────────────────────────────────────────────────

const MS_PER_YEAR = 365.25 * 24 * 3600 * 1000;
const NAKSHATRA_SPAN = 360 / 27; // 13.333...°

/**
 * Séquence des 9 seigneurs (ordre cyclique Vimshottari standard).
 * Noms en français pour cohérence avec nakshatras.ts.
 */
export const DASHA_SEQUENCE: string[] = [
  'Ketu', 'Vénus', 'Soleil', 'Lune', 'Mars', 'Rahu', 'Jupiter', 'Saturne', 'Mercure',
];

/**
 * Durées Mahadasha en années (total 120 ans).
 */
export const DASHA_DURATIONS: Record<string, number> = {
  Ketu: 7, Vénus: 20, Soleil: 6, Lune: 10, Mars: 7,
  Rahu: 18, Jupiter: 16, Saturne: 19, Mercure: 17,
};

/**
 * Qualité védique standard de chaque seigneur.
 *  +1 = bénéfique naturel
 *   0 = neutre
 *  -1 = maléfique naturel
 *
 * Note Lune : modulée dynamiquement selon la phase natale (waxing/waning).
 * Rahu : -1 par défaut, mais neutralisé si double activation avec transit #25.
 */
const DASHA_QUALITY: Record<string, number> = {
  Jupiter:  1,
  Vénus:    1,
  Mercure:  1,
  Lune:     1,  // override dynamique selon phase natale dans calcDashaScore
  Soleil:   0,
  Saturne: -1,
  Rahu:    -1,
  Ketu:    -1,
  Mars:    -1,
};

/**
 * Tonalité narrative (séparée du score).
 * Utilisée par le moteur narratif pour nuancer les textes sans modifier le scoring.
 */
export type DashaTone = 'benefic' | 'malefic' | 'amplifier' | 'dissolver' | 'neutral';

const DASHA_TONE: Record<string, DashaTone> = {
  Jupiter:  'benefic',
  Vénus:    'benefic',
  Mercure:  'benefic',
  Lune:     'benefic',
  Soleil:   'neutral',
  Saturne:  'malefic',
  Rahu:     'amplifier',  // R2 GPT : Rahu n'est pas un simple maléfique — amplificateur karmique
  Ketu:     'dissolver',
  Mars:     'malefic',
};

/**
 * Narratives prêtes à intégrer (2-3 lignes, oracle décisionnel).
 * Source : GPT R1, validées R2.
 */
export const DASHA_NARRATIVES: Record<string, string> = {
  Ketu:    "Une période où l'ancien se défait. Ce qui n'est plus aligné se dissout sans bruit. Les décisions gagnantes sont celles qui allègent.",
  Vénus:   "Cycle d'attraction et de magnétisme. Les relations et la créativité deviennent tes leviers. La beauté ouvre des portes stratégiques.",
  Soleil:  "Temps d'affirmation. Tu es appelé à occuper ta place, clairement. Les décisions doivent refléter ton autorité intérieure.",
  Lune:    "Cycle de sensibilité accrue. Ton intuition devient un instrument stratégique. Avance en respectant tes marées intérieures.",
  Mars:    "Période d'action directe. Les décisions courageuses portent plus que les hésitations. L'initiative compte davantage que la prudence.",
  Rahu:    "Cycle d'ambition et de bouleversement. Tu sors des chemins connus. Les décisions audacieuses peuvent redéfinir ta trajectoire.",
  Jupiter: "Temps d'expansion structurée. Les opportunités s'ouvrent si tu penses long terme. Investis dans ce qui élargit ta vision.",
  Saturne: "Cycle de consolidation profonde. Les décisions lentes mais solides construisent l'avenir. La patience devient stratégie.",
  Mercure: "Période d'apprentissage et d'adaptation rapide. Ton intelligence stratégique est ton meilleur atout. Les décisions gagnent à être souples.",
};

/**
 * Narratives Dasha Sandhi (transitions entre Mahadashas).
 * Key = "DepuisVers" (ex: 'KetuVénus')
 */
export const SANDHI_NARRATIVES: Record<string, string> = {
  KetuVénus:    "Le cycle du détachement s'achève. La vie recommence à désirer. Décisions à prendre avec cœur, pas par fuite.",
  SaturneMercure: "Un long temps de consolidation se referme. Une phase d'apprentissage et d'agilité s'ouvre. Décisions à tester, pas à figer.",
  RahuJupiter:  "L'intensité brute laisse place à une expansion structurée. Ce qui était chaos peut devenir vision. Décisions à inscrire dans la durée.",
  VénusSoleil:  "Un long cycle d'attraction se conclut. L'heure est à l'affirmation personnelle. Décisions à assumer publiquement.",
};

/**
 * V5.2 — Narratives Pratyantardasha ("météo de la semaine").
 * Ton oracle décisionnel, tutoiement, 1 phrase max.
 * Source : GPT R1 V5.2.
 */
export const PRATYANTAR_NARRATIVES: Record<string, string> = {
  Ketu:    "Cette semaine, coupe ce qui ralentit ta trajectoire : l'allègement est ton levier stratégique.",
  Vénus:   "Les alliances et l'attractivité deviennent ton accélérateur : avance par relation plutôt que par force.",
  Soleil:  "Clarifie ta position et assume-la : ta décision gagne à être visible.",
  Lune:    "Ton intuition est plus rapide que tes tableaux Excel : écoute-la avant de trancher.",
  Mars:    "Passe à l'action sans suranalyser : l'élan crée plus que la prudence.",
  Rahu:    "Ose un pivot ambitieux : le risque maîtrisé peut redéfinir ton cap.",
  Jupiter: "Investis dans une vision plus large : cette semaine favorise les décisions long terme.",
  Saturne: "Consolide plutôt que d'accélérer : ce que tu stabilises maintenant tiendra.",
  Mercure: "Ajuste ta stratégie en temps réel : la souplesse est ton avantage concurrentiel.",
};

export type DashaPhase = 'early' | 'middle' | 'late';

export interface DashaLevel {
  lord:          string;       // Seigneur du Dasha
  startDate:     Date;
  endDate:       Date;
  durationMs:    number;
  progressRatio: number;       // 0.0-1.0 dans la période (0=début, 1=fin)
  phase:         DashaPhase;   // early (<15%) | middle | late (>85%)
  isTransition:  boolean;      // true si ±30j d'un changement de Mahadasha (Dasha Sandhi)
}

export interface CurrentDasha {
  maha:      DashaLevel;
  antar:     DashaLevel;
  pratyantar: DashaLevel;  // V5.2 — 3e niveau (isTransition forcé false)
  nextMaha:  DashaLevel;
}

export interface DashaScore {
  mahaScore:    number;        // ±4 (DASHA_QUALITY × 4)
  antarScore:   number;        // ±2 (DASHA_QUALITY × 2)
  pratyanScore: number;        // ±1 (DASHA_QUALITY × 1) — V5.2
  synergyBonus: number;        // ±2 si Maha et Antar alignés (même signe, non nuls) — inchangé
  total:        number;        // clamp(-9, +9) — zéro clipping garanti (4+2+1+2=9)
  tone:         DashaTone;     // Tonalité narrative du Mahadasha
  breakdown:    string[];      // Détail lisible pour l'UI
}

// ── Helpers internes ─────────────────────────────────────────────────────────

/**
 * Phase d'un DashaLevel selon son progressRatio.
 */
function toPhase(ratio: number): DashaPhase {
  if (ratio < 0.15) return 'early';
  if (ratio > 0.85) return 'late';
  return 'middle';
}

/**
 * Construit un DashaLevel depuis les timestamps start/end et la date cible.
 */
function buildLevel(lord: string, startMs: number, endMs: number, todayMs: number): DashaLevel {
  const durationMs   = endMs - startMs;
  const progressRatio = durationMs === 0 ? 0.5 : Math.max(0, Math.min(1, (todayMs - startMs) / durationMs)); // Sprint AG: guard div/0
  const SANDHI_MS    = 30 * 24 * 3600 * 1000; // ±30 jours
  const isTransition =
    Math.abs(todayMs - endMs)   < SANDHI_MS ||
    Math.abs(todayMs - startMs) < SANDHI_MS;

  return {
    lord,
    startDate:    new Date(startMs),
    endDate:      new Date(endMs),
    durationMs,
    progressRatio,
    phase:        toPhase(progressRatio),
    isTransition,
  };
}

/**
 * Construit un DashaLevel avec isTransition forcé à false.
 * Utilisé pour le Pratyantardasha (durée ~60j : Sandhi ±30j n'a pas de sens).
 */
function buildLevelNoTransition(lord: string, startMs: number, endMs: number, todayMs: number): DashaLevel {
  const durationMs    = endMs - startMs;
  const progressRatio = durationMs === 0 ? 0.5 : Math.max(0, Math.min(1, (todayMs - startMs) / durationMs)); // Sprint AG: guard div/0
  return {
    lord,
    startDate:    new Date(startMs),
    endDate:      new Date(endMs),
    durationMs,
    progressRatio,
    phase:        toPhase(progressRatio),
    isTransition: false,
  };
}

/**
 * Calcule le Mahadasha, Antardasha et prochain Mahadasha actifs pour une date donnée.
 *
 * @param natalMoonLongSid  Longitude sidérale de la Lune natale (0-360°, Lahiri)
 * @param birthDate         Date de naissance
 * @param today             Date cible (généralement new Date())
 * @returns CurrentDasha
 */
export function calcCurrentDasha(
  natalMoonLongSid: number,
  birthDate: Date,
  today: Date
): CurrentDasha {
  const todayMs   = today.getTime();
  const birthMs   = birthDate.getTime();

  // ── 1. Nakshatra natal → seigneur de départ ──────────────────────────────
  const nakIndex    = Math.min(26, Math.floor(((natalMoonLongSid % 360) + 360) % 360 / NAKSHATRA_SPAN));
  const lord0       = DASHA_SEQUENCE[nakIndex % 9];  // séquence cyclique depuis l'index
  const lord0Idx    = DASHA_SEQUENCE.indexOf(lord0);

  // Fraction du premier Nakshatra déjà écoulée à la naissance
  const degInNak         = ((natalMoonLongSid % 360) + 360) % 360 % NAKSHATRA_SPAN;
  const fractionElapsed  = degInNak / NAKSHATRA_SPAN;
  const fractionRemaining = 1 - fractionElapsed;

  // ── 2. Date de début du premier Mahadasha (avant la naissance) ───────────
  const firstMahaDurationMs = DASHA_DURATIONS[lord0] * MS_PER_YEAR;
  let mahaStartMs = birthMs - fractionElapsed * firstMahaDurationMs;
  let mahaIdx     = lord0Idx;
  let mahaEndMs   = mahaStartMs + DASHA_DURATIONS[DASHA_SEQUENCE[mahaIdx]] * MS_PER_YEAR;

  // ── 3. Avancer jusqu'au Mahadasha actuel ─────────────────────────────────
  while (mahaEndMs <= todayMs) {
    mahaStartMs = mahaEndMs;
    mahaIdx     = (mahaIdx + 1) % 9;
    mahaEndMs   = mahaStartMs + DASHA_DURATIONS[DASHA_SEQUENCE[mahaIdx]] * MS_PER_YEAR;
  }

  const mahaLord     = DASHA_SEQUENCE[mahaIdx];
  const mahaDuration = DASHA_DURATIONS[mahaLord]; // en années

  const maha = buildLevel(mahaLord, mahaStartMs, mahaEndMs, todayMs);

  // ── 4. Prochain Mahadasha ─────────────────────────────────────────────────
  const nextMahaIdx  = (mahaIdx + 1) % 9;
  const nextMahaLord = DASHA_SEQUENCE[nextMahaIdx];
  const nextMahaEndMs = mahaEndMs + DASHA_DURATIONS[nextMahaLord] * MS_PER_YEAR;
  const nextMaha = buildLevel(nextMahaLord, mahaEndMs, nextMahaEndMs, todayMs);

  // ── 5. Antardasha courant (dans le Mahadasha actuel) ──────────────────────
  // Durée de chaque Antar : (mahaDuration × antarLordDuration) / 120 années
  let antarStartMs = mahaStartMs;
  let antarIdx     = mahaIdx; // premier Antar = même seigneur que le Maha
  let antarEndMs   = antarStartMs + (mahaDuration * DASHA_DURATIONS[DASHA_SEQUENCE[antarIdx]] / 120) * MS_PER_YEAR;

  while (antarEndMs <= todayMs) {
    antarStartMs = antarEndMs;
    antarIdx     = (antarIdx + 1) % 9;
    antarEndMs   = antarStartMs + (mahaDuration * DASHA_DURATIONS[DASHA_SEQUENCE[antarIdx]] / 120) * MS_PER_YEAR;
  }

  const antar = buildLevel(DASHA_SEQUENCE[antarIdx], antarStartMs, antarEndMs, todayMs);

  // ── 6. Pratyantardasha courant (dans l'Antardasha actuel) ─────────────────
  // Durée Pratyantar : (mahaDur × antarDur × pratyanLordDur) / 120² années
  // Premier Pratyantar d'un Antar = même seigneur que l'Antar (tradition parāśarī)
  const antarLord     = DASHA_SEQUENCE[antarIdx];
  const antarDuration = DASHA_DURATIONS[antarLord]; // en années

  let pratyanStartMs = antarStartMs;
  let pratyanIdx     = antarIdx; // premier Pratyantar = même seigneur que l'Antar
  let pratyanEndMs   = pratyanStartMs +
    ((mahaDuration * antarDuration * DASHA_DURATIONS[DASHA_SEQUENCE[pratyanIdx]]) / 14400) * MS_PER_YEAR;

  while (pratyanEndMs <= todayMs) {
    pratyanStartMs = pratyanEndMs;
    pratyanIdx     = (pratyanIdx + 1) % 9;
    pratyanEndMs   = pratyanStartMs +
      ((mahaDuration * antarDuration * DASHA_DURATIONS[DASHA_SEQUENCE[pratyanIdx]]) / 14400) * MS_PER_YEAR;
  }

  // Guard : durée aberrante (< 1 jour = erreur de calcul)
  if (pratyanEndMs - pratyanStartMs < 86400000) {
    console.error('[Pratyantar] Durée < 1 jour aberrante:', DASHA_SEQUENCE[pratyanIdx]);
  }

  const pratyantar = buildLevelNoTransition(
    DASHA_SEQUENCE[pratyanIdx], pratyanStartMs, pratyanEndMs, todayMs
  );

  return { maha, antar, pratyantar, nextMaha };
}

/**
 * Calcule le score Vimshottari (±8) depuis un CurrentDasha.
 *
 * @param dasha             Résultat de calcCurrentDasha()
 * @param options.transitLord         Lord du Nakshatra de transit (#25) — pour Option H Rahu
 * @param options.natalMoonIsWaxing   Phase lunaire natale (true=croissante, false=décroissante)
 */
export function calcDashaScore(
  dasha: CurrentDasha,
  options?: { transitLord?: string; natalMoonIsWaxing?: boolean }
): DashaScore {
  const mahaLord    = dasha.maha.lord;
  const antarLord   = dasha.antar.lord;
  const pratyanLord = dasha.pratyantar.lord;

  // ── Qualité dynamique (Lune dépend de la phase natale) ───────────────────
  const quality = (lord: string): number => {
    if (lord === 'Lune') {
      return options?.natalMoonIsWaxing === false ? -1 : 1;
    }
    return DASHA_QUALITY[lord] ?? 0;
  };

  const mahaQ    = quality(mahaLord);
  const antarQ   = quality(antarLord);
  const pratyanQ = quality(pratyanLord);

  // ── Mahadasha score (±4) ─────────────────────────────────────────────────
  let mahaScore = mahaQ * 4;

  // Option H : Rahu Maha neutralisé si transit #25 = Rahu aussi
  if (mahaLord === 'Rahu' && options?.transitLord === 'Rahu') {
    mahaScore = 0;
  }

  // ── Antardasha score (±2) ────────────────────────────────────────────────
  const antarScore = antarQ * 2;

  // ── Pratyantardasha score (±1) — V5.2 ───────────────────────────────────
  const pratyanScore = pratyanQ * 1;

  // ── Synergie (±2) — Maha×Antar uniquement (inchangé V5.1) ───────────────
  const mahaSign  = Math.sign(mahaScore);
  const antarSign = Math.sign(antarQ);
  const synergyBonus =
    mahaQ !== 0 && antarQ !== 0 && mahaSign === antarSign ? mahaSign * 2 : 0;

  // ── Cap ±9 (4+2+1+2 = 9 exact → zéro clipping) ──────────────────────────
  let raw   = mahaScore + antarScore + pratyanScore + synergyBonus;
  let total = Math.max(-9, Math.min(9, raw));

  // ── Guard cap ────────────────────────────────────────────────────────────
  if (Math.abs(total) > 9.0) {
    console.error('[DashaScore] Cap ±9 dépassé:', total);
    total = Math.max(-9, Math.min(9, total));
  }

  // ── Tone narratif (Mahadasha) ────────────────────────────────────────────
  const tone: DashaTone = DASHA_TONE[mahaLord] ?? 'neutral';

  // ── Breakdown UI ────────────────────────────────────────────────────────
  const breakdown: string[] = [];
  breakdown.push(`Maha ${mahaLord} (${mahaScore >= 0 ? '+' : ''}${mahaScore})`);
  breakdown.push(`Antar ${antarLord} (${antarScore >= 0 ? '+' : ''}${antarScore})`);
  breakdown.push(`Pratyantar ${pratyanLord} (${pratyanScore >= 0 ? '+' : ''}${pratyanScore})`);
  if (synergyBonus !== 0) {
    breakdown.push(`Synergie Maha×Antar (${synergyBonus >= 0 ? '+' : ''}${synergyBonus})`);
  }
  // Triple alignement — convergence narrative (pas de scoring supplémentaire)
  if (mahaQ !== 0 && antarQ !== 0 && pratyanQ !== 0 &&
      Math.sign(mahaQ) === Math.sign(antarQ) && Math.sign(antarQ) === Math.sign(pratyanQ)) {
    breakdown.push(`✨ Résonance Totale — 3 niveaux alignés`);
  }
  if (dasha.maha.isTransition) {
    const sandhiKey  = `${mahaLord}${dasha.nextMaha.lord}`;
    const sandhiText = SANDHI_NARRATIVES[sandhiKey] ?? 'Période de transition de vie — décisions importantes : attendre.';
    breakdown.push(`⚠ Transition de grande période : ${sandhiText}`);
  }
  if (mahaLord === 'Rahu' && options?.transitLord === 'Rahu') {
    breakdown.push('Rahu en double activation — tension neutralisée');
  }
  if (mahaLord === 'Lune') {
    breakdown.push(`Lune ${options?.natalMoonIsWaxing === false ? 'décroissante natale' : 'croissante natale'}`);
  }

  return { mahaScore, antarScore, pratyanScore, synergyBonus, total, tone, breakdown };
}

// ══════════════════════════════════════════════════════════════════
// ═══ V9.0 P4 — composeDashaMultipliers + calcSandhiSmoothing ═════
// ══════════════════════════════════════════════════════════════════

/**
 * Composition smooth Maha × Antar — Ronde 30 B' (consensus 3/3 GPT+Grok+Gemini).
 *
 * Remplace le clamp dur [0.80, 1.25] + poids 65/35 par :
 *   - Poids 50/50 (l'Antardasha peut désormais relever un mauvais Maha)
 *   - Smooth tanh au lieu de clamp dur → C¹ continu, pas de zone morte
 *   - Certainty shrink vers 1.0 (heure inconnue → neutralise, pas aggrave)
 *
 * Formule : z = 0.50·ln(mahaMult) + 0.50·ln(antarMult)
 *           t = tanh(z / 0.25)
 *           core = 1.0 + 0.225·t
 *           dashaMult = 1.0 + certainty·(core - 1.0)
 *
 * Vérification (certainty=1.0) :
 *   Neutre  ( 0,  0) : z=0, t=0, core=1.000 → 1.000
 *   Pire    (−4, −2) : z=-0.337, t=-0.874, core=0.803 → 0.803
 *   Mixte   (−4, +2) : z=-0.186, t=-0.631, core=0.858 → 0.858 (ex 0.80 clamped)
 *   Meilleur(+4, +2) : z=+0.238, t=+0.729, core=1.164 → 1.164
 *
 * Range asymptotique : [0.775, 1.225] — smooth, pas de hard-clamp.
 *
 * Source : Ronde 30/30bis/30ter consensus 3/3 (2026-03-11).
 */
export function composeDashaMultipliers(mahaScore: number, antarScore: number, certainty: number = 1.0): number {
  const mahaMult  = 1.0 + mahaScore  * 0.10;
  const antarMult = 1.0 + antarScore * 0.075;
  // Log-blend 50/50 — guard 1e-9 anti-ln(≤0)
  const z = 0.50 * Math.log(Math.max(1e-9, mahaMult)) +
            0.50 * Math.log(Math.max(1e-9, antarMult));
  const t    = Math.tanh(z / 0.25);
  // Ronde 36 — Synthèse GPT×Gemini (consensus 2/3, confrontation R36bis)
  // Positif 0.06 : compression maximale 2037 (dashaMult → ~1.026)
  // Négatif 0.15 : allège 2035 (dashaMult → ~0.936) + 2030 (→ ~0.869)
  const _amplitude = (t > 0) ? 0.06 : 0.15;
  const core = 1.0 + _amplitude * t;
  // Certainty shrink : incertitude naissance → rapproche de 1.0 (neutre)
  return 1.0 + certainty * (core - 1.0);
}

/**
 * Lissage sigmoïdal ±30j autour d'une transition Mahadasha (Dasha Sandhi).
 * Interpolation entre le multiplicateur du Maha courant et celui du Maha suivant.
 *
 * σ(x) = 1 / (1 + e^(−x/10)),  x = jours depuis la fin du Maha courant
 *   x = −30j : σ ≈ 0.05 → Dasha courant quasi-complet
 *   x =   0  : σ = 0.50 → transition, blend 50/50
 *   x = +30j : σ ≈ 0.95 → Dasha suivant quasi-complet
 *
 * nextMahaMult estimé depuis DASHA_QUALITY[nextMaha.lord] × 4 (antarMult = 0 : inconnu)
 * Ronde 30 : certainty passé pour que le nextMult utilise aussi le shrink.
 */
export function calcSandhiSmoothing(
  dasha: CurrentDasha,
  currentMult: number,
  today: Date,
  certainty: number = 1.0,
): number {
  if (!dasha.maha.isTransition) return currentMult;
  const MS_PER_DAY  = 24 * 3600 * 1000;
  const daysFromEnd = (today.getTime() - dasha.maha.endDate.getTime()) / MS_PER_DAY;
  const sigma       = 1 / (1 + Math.exp(-daysFromEnd / 10));
  const nextMahaQ   = DASHA_QUALITY[dasha.nextMaha.lord] ?? 0;
  const nextMult    = composeDashaMultipliers(nextMahaQ * 4, 0, certainty);
  return currentMult * (1 - sigma) + nextMult * sigma;
}

/**
 * Retourne l'index (0-8) du seigneur Antardasha pour une date donnée.
 * Utilisé comme dimension dans le vecteur PSI (temporal.ts).
 *
 * @param natalMoonLongSid  Longitude sidérale Lune natale
 * @param birthDate         Date de naissance
 * @param forDate           Date cible
 * @returns index 0-8 dans DASHA_SEQUENCE, ou 0 en cas d'erreur
 */
export function getDashaAntarLordIndex(
  natalMoonLongSid: number,
  birthDate: Date,
  forDate: Date
): number {
  try {
    const dasha = calcCurrentDasha(natalMoonLongSid, birthDate, forDate);
    const idx = DASHA_SEQUENCE.indexOf(dasha.antar.lord);
    return idx >= 0 ? idx : 0;
  } catch {
    return 0;
  }
}
