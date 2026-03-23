// ═══ PERSONALIZATION ENGINE V4.4 ═══
// Specs: Gemini (Bayesian Shrinkage) + arbitrage Grok (bornes) + Claude (activation)
// Poids adaptatifs per-user basés sur corrélation Pearson + amortissement bayésien
// 100% client-side, ~80 lignes utiles, activé à J+20
//
// MÉTHODE: Pour chaque système (BaZi, Num, IChing, Lune, etc.),
//   on calcule la corrélation entre les points du système et la note utilisateur.
//   On "tire" cette corrélation vers zéro tant qu'il y a peu de données (Bayesian Shrinkage).
//   Le multiplicateur final ajuste le poids de chaque système pour cet utilisateur.
//
// PARAMÈTRES (arbitrage 3 experts):
//   α = 0.3 (amplitude max ±30%, réduit de 0.5 par Grok)
//   k = 15 (facteur de prudence bayésien — 15 jours virtuels neutres)
//   Clamp: [0.8, 1.2] (réduit de [0.5, 1.5] par Grok)
//   Activation: 20 feedbacks (compromis Gemini 10 / Grok 30)
//   Blend progressif: J15=25%, J20=50%, J25=100%
//
// GARDE-FOUS:
//   - σ(userStars) < 0.4 → poids par défaut (complaisance)
//   - Normalisation somme absolue constante (pas d'explosion de plage)
//   - Shadow testing: on calcule toujours les deux scores en background

import type { DayFeedback } from './validation-tracker';

// ═══ TYPES ═══

export interface PersonalWeights {
  multipliers: Record<string, number>;  // Ex: { bazi: 1.15, lune: 0.85, ... }
  isActive: boolean;                     // true si 20+ feedbacks valides
  blendPercent: number;                  // 0-100 — % de personnalisation appliqué
  feedbackCount: number;                 // n utilisé
  archetype: EnergyArchetype | null;     // Profil énergétique détecté
  frozen: boolean;                       // true si variance trop faible
}

export interface EnergyArchetype {
  key: 'selenite' | 'imperial' | 'architecte' | 'oracle' | 'marcheur';
  label: string;
  icon: string;
  description: string;
}

// ═══ CONSTANTS ═══

const ALPHA = 0.3;           // Amplitude max ±30%
const K_PRIOR = 15;          // Amortissement bayésien
const CLAMP_MIN = 0.8;       // Multiplicateur min
const CLAMP_MAX = 1.2;       // Multiplicateur max
const MIN_FEEDBACKS = 20;    // Activation
const MIN_VARIANCE = 0.16;   // σ² minimum (σ < 0.4 → freeze)

// Systèmes trackés dans le breakdown
const TRACKED_SYSTEMS = [
  'BaZi', '10 Gods', 'Changsheng', 'Shen Sha',
  'Numérologie', 'I Ching', 'Lune', 'Mercure',
  'Transit Lunaire', 'Planètes', 'Astrologie',
] as const;

// ═══ ARCHETYPES (Gemini) ═══

const ARCHETYPES: Record<string, EnergyArchetype> = {
  selenite: {
    key: 'selenite',
    label: 'Sélénite',
    icon: '🌙',
    description: 'Ton corps réagit comme un océan. Les phases lunaires dictent ta météo interne avec une précision troublante.',
  },
  imperial: {
    key: 'imperial',
    label: 'Impérial',
    icon: '🏯',
    description: 'Tu es ancré dans les piliers temporels. L\'énergie des éléments et le cycle de ton Day Master gouvernent ta vitalité.',
  },
  architecte: {
    key: 'architecte',
    label: 'Architecte',
    icon: '📐',
    description: 'Ta vie suit une géométrie stricte. Les cycles de 9 ans et tes jours personnels sont tes véritables métronomes.',
  },
  oracle: {
    key: 'oracle',
    label: 'Oracle',
    icon: '☯️',
    description: 'Le Yi Jing te parle directement. Les hexagrammes captent ta réalité quotidienne avec une justesse remarquable.',
  },
  marcheur: {
    key: 'marcheur',
    label: 'Marcheur du Chaos',
    icon: '🌀',
    description: 'Profil atypique. Ton libre arbitre surpasse les courants temporels. Utilise Kaironaute comme miroir, pas comme boussole.',
  },
};

// ═══ SYSTÈME GROUPES (pour le radar 5 piliers) ═══

interface SystemGroup {
  key: string;
  systems: string[];
  archetypeKey?: string;
}

const SYSTEM_GROUPS: SystemGroup[] = [
  { key: 'terrestre', systems: ['BaZi', '10 Gods', 'Changsheng', 'Shen Sha'], archetypeKey: 'imperial' },
  { key: 'celeste', systems: ['Lune', 'Mercure', 'Transit Lunaire', 'Astrologie', 'Planètes'], archetypeKey: 'selenite' },
  { key: 'numerique', systems: ['Numérologie'], archetypeKey: 'architecte' },
  { key: 'fluide', systems: ['I Ching'], archetypeKey: 'oracle' },
];

// ═══ CORE: CALCUL DES POIDS PERSONNALISÉS ═══

export function calculatePersonalizedWeights(
  feedbacks: DayFeedback[],
  breakdownHistory: Array<{ date: string; breakdown: Array<{ system: string; points: number }> }>
): PersonalWeights {

  // Filtrer feedbacks avec slider 1-5
  const validFeedbacks = feedbacks.filter(f =>
    f.userScore !== undefined && f.userScore >= 1 && f.userScore <= 5
  );

  const n = validFeedbacks.length;

  // ── Pas assez de données ──
  if (n < 5) {
    return defaultWeights(n, 0);
  }

  // ── Variance check (garde-fou complaisance) ──
  const meanStar = validFeedbacks.reduce((acc, f) => acc + f.userScore!, 0) / n;
  const varStar = validFeedbacks.reduce((acc, f) => acc + Math.pow(f.userScore! - meanStar, 2), 0) / n;

  if (varStar < MIN_VARIANCE) {
    return { ...defaultWeights(n, calcBlend(n)), frozen: true };
  }

  // ── Calcul multiplicateur par système ──
  const multipliers: Record<string, number> = {};
  let totalAbsDefault = 0;
  let totalAbsNew = 0;

  for (const system of TRACKED_SYSTEMS) {
    // Collecter les paires (points_système, note_user) pour les jours matchés
    const pairs: Array<{ sysPoints: number; userStar: number }> = [];

    for (const fb of validFeedbacks) {
      const bk = breakdownHistory.find(b => b.date === fb.date);
      if (bk) {
        const entry = bk.breakdown.find(s => s.system === system);
        if (entry) {
          pairs.push({ sysPoints: entry.points, userStar: fb.userScore! });
        }
      }
    }

    if (pairs.length < 5) {
      multipliers[system] = 1.0;
      totalAbsDefault += 1.0;
      totalAbsNew += 1.0;
      continue;
    }

    // Pearson r
    const meanSys = pairs.reduce((a, p) => a + p.sysPoints, 0) / pairs.length;
    const meanU = pairs.reduce((a, p) => a + p.userStar, 0) / pairs.length;
    const varSys = pairs.reduce((a, p) => a + Math.pow(p.sysPoints - meanSys, 2), 0) / pairs.length;
    const varU = pairs.reduce((a, p) => a + Math.pow(p.userStar - meanU, 2), 0) / pairs.length;

    if (varSys === 0 || varU === 0) {
      multipliers[system] = 1.0;
      totalAbsDefault += 1.0;
      totalAbsNew += 1.0;
      continue;
    }

    const cov = pairs.reduce((a, p) =>
      a + ((p.sysPoints - meanSys) * (p.userStar - meanU)), 0) / pairs.length;
    const r = cov / Math.sqrt(varSys * varU);

    // Bayesian Shrinkage
    const confidence = pairs.length / (pairs.length + K_PRIOR);
    let mult = 1 + (r * confidence * ALPHA);
    mult = Math.max(CLAMP_MIN, Math.min(CLAMP_MAX, mult));

    multipliers[system] = mult;
    totalAbsDefault += 1.0;
    totalAbsNew += Math.abs(mult);
  }

  // ── Normalisation (somme absolue constante) ──
  // On normalise AVANT le clamp pour éviter l'effet neutralisant (correction GPT)
  if (totalAbsNew > 0) {
    const normFactor = totalAbsDefault / totalAbsNew;
    for (const system of TRACKED_SYSTEMS) {
      multipliers[system] = Math.round(multipliers[system] * normFactor * 1000) / 1000;
      // Re-clamp après normalisation
      multipliers[system] = Math.max(CLAMP_MIN, Math.min(CLAMP_MAX, multipliers[system]));
    }
  }

  // ── Blend progressif ──
  const blend = calcBlend(n);

  // ── Archétype ──
  const archetype = detectArchetype(multipliers, blend);

  return {
    multipliers,
    isActive: n >= MIN_FEEDBACKS && blend > 0,
    blendPercent: blend,
    feedbackCount: n,
    archetype,
    frozen: false,
  };
}

// ═══ BLEND PROGRESSIF ═══
// J15=25%, J20=50%, J25=100% (Gemini Round 2)

function calcBlend(n: number): number {
  if (n < 15) return 0;
  if (n < 20) return 25;
  if (n < 25) return 50;
  return 100;
}

// ═══ APPLY WEIGHTS ═══
// Applique les multiplicateurs personnalisés à un breakdown de scoring

export function applyPersonalWeights(
  weights: PersonalWeights,
  breakdown: Array<{ system: string; points: number }>
): number {
  if (!weights.isActive || weights.frozen || weights.blendPercent === 0) {
    // Retourner le delta inchangé
    return breakdown.reduce((acc, b) => acc + b.points, 0);
  }

  const blend = weights.blendPercent / 100;
  let personalDelta = 0;
  let universalDelta = 0;

  for (const b of breakdown) {
    universalDelta += b.points;
    const mult = weights.multipliers[b.system] ?? 1.0;
    // Blend: universal × (1-blend) + personal × blend
    const blendedMult = 1.0 * (1 - blend) + mult * blend;
    personalDelta += b.points * blendedMult;
  }

  return personalDelta;
}

// ═══ ARCHETYPE DETECTION ═══

function detectArchetype(multipliers: Record<string, number>, blend: number): EnergyArchetype | null {
  if (blend < 50) return null; // Pas assez de données pour un profil fiable

  // Calculer le multiplicateur moyen par groupe
  let maxGroupKey = '';
  let maxGroupMult = 0;

  for (const group of SYSTEM_GROUPS) {
    const groupMults = group.systems
      .map(s => multipliers[s] ?? 1.0)
      .filter(m => m !== 1.0); // Ignorer les systèmes non calculés

    if (groupMults.length === 0) continue;

    const avgMult = groupMults.reduce((a, m) => a + m, 0) / groupMults.length;
    if (avgMult > maxGroupMult && group.archetypeKey) {
      maxGroupMult = avgMult;
      maxGroupKey = group.archetypeKey;
    }
  }

  // Seuil: le groupe dominant doit avoir un mult moyen > 1.10
  if (maxGroupMult >= 1.10 && maxGroupKey) {
    return ARCHETYPES[maxGroupKey] ?? null;
  }

  return null;
}

// ═══ RADAR DATA (pour ProfileTab) ═══

export interface RadarPillar {
  key: string;
  label: string;
  value: number;  // 0-100 normalisé
}

export function getRadarData(weights: PersonalWeights): RadarPillar[] {
  const pillars: RadarPillar[] = [];

  for (const group of SYSTEM_GROUPS) {
    const mults = group.systems.map(s => weights.multipliers[s] ?? 1.0);
    const avg = mults.reduce((a, m) => a + m, 0) / mults.length;
    // Normaliser: 0.8 → 0%, 1.0 → 50%, 1.2 → 100%
    const normalized = Math.round(Math.max(0, Math.min(100, (avg - 0.8) / 0.4 * 100)));

    const labels: Record<string, string> = {
      terrestre: 'Terrestre',
      celeste: 'Céleste',
      numerique: 'Numérique',
      fluide: 'Fluide',
    };

    pillars.push({
      key: group.key,
      label: labels[group.key] || group.key,
      value: normalized,
    });
  }

  return pillars;
}

// ═══ STORAGE ═══

const PERSO_WEIGHTS_KEY = 'kn_personal_weights';
const BREAKDOWN_HISTORY_KEY = 'kn_breakdown_history';

export function savePersonalWeights(weights: PersonalWeights): void {
  try {
    localStorage.setItem(PERSO_WEIGHTS_KEY, JSON.stringify(weights));
  } catch { /* */ }
}

export function loadPersonalWeights(): PersonalWeights | null {
  try {
    const raw = localStorage.getItem(PERSO_WEIGHTS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/** Sauvegarde le breakdown du jour pour l'historique de personnalisation */
export function saveBreakdownForDate(
  date: string,
  breakdown: Array<{ system: string; points: number }>
): void {
  try {
    const raw = localStorage.getItem(BREAKDOWN_HISTORY_KEY);
    const history: Array<{ date: string; breakdown: Array<{ system: string; points: number }> }> = raw ? JSON.parse(raw) : [];

    // Upsert
    const idx = history.findIndex(h => h.date === date);
    const entry = { date, breakdown: breakdown.map(b => ({ system: b.system, points: b.points })) };
    if (idx >= 0) history[idx] = entry;
    else history.push(entry);

    // Garder 90 jours max
    const trimmed = history.slice(-90);
    localStorage.setItem(BREAKDOWN_HISTORY_KEY, JSON.stringify(trimmed));
  } catch { /* */ }
}

export function loadBreakdownHistory(): Array<{ date: string; breakdown: Array<{ system: string; points: number }> }> {
  try {
    const raw = localStorage.getItem(BREAKDOWN_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// ═══ ONBOARDING MESSAGES (Gemini) ═══

export function getOnboardingMessage(feedbackCount: number, weights: PersonalWeights | null): string | null {
  if (feedbackCount < 1) return null;

  if (feedbackCount < 10) {
    return `📡 Mesure universelle active. Utilise le Blind Check-in quotidien pour que Kaironaute apprenne ton rythme.`;
  }

  if (feedbackCount === 10) {
    return `🎯 Premier seuil franchi ! Kaironaute a généré ta première mesure de précision.`;
  }

  if (feedbackCount >= 15 && feedbackCount < 20 && weights?.blendPercent === 25) {
    return `🌟 Calibration en cours. L'algorithme commence à s'ajuster à ta signature énergétique.`;
  }

  if (feedbackCount === 20) {
    return `🧬 Signature décodée ! L'algorithme s'ajuste à ta fréquence personnelle (50% actif).`;
  }

  if (feedbackCount === 25 && weights?.blendPercent === 100) {
    return `💎 Calibration aboutie. Ton instance de Kaironaute est désormais un miroir unique.`;
  }

  if (feedbackCount === 30 && weights?.archetype) {
    return `🔮 Profil Énergétique débloqué : ${weights.archetype.icon} ${weights.archetype.label} — ${weights.archetype.description}`;
  }

  return null;
}

// ═══ FLATLINE ALERT (Gemini) ═══

export function getFlatlineAlert(feedbacks: DayFeedback[]): string | null {
  // Vérifier les 7 derniers feedbacks slider
  const recent = feedbacks
    .filter(f => f.userScore !== undefined)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7);

  if (recent.length < 7) return null;

  const mean = recent.reduce((a, f) => a + f.userScore!, 0) / recent.length;
  const variance = recent.reduce((a, f) => a + Math.pow(f.userScore! - mean, 2), 0) / recent.length;

  if (variance < MIN_VARIANCE) {
    return `Kaironaute perçoit une énergie très linéaire ces derniers jours. Rappelle-toi : le score 3⭐ est la norme, réserve le 5⭐ pour les journées cosmiques absolues afin de garder l'algorithme affûté.`;
  }

  return null;
}

// ═══ HELPERS ═══

function defaultWeights(n: number, blend: number): PersonalWeights {
  const multipliers: Record<string, number> = {};
  for (const sys of TRACKED_SYSTEMS) multipliers[sys] = 1.0;
  return { multipliers, isActive: false, blendPercent: blend, feedbackCount: n, archetype: null, frozen: false };
}
