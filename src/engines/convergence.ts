// ═══ CONVERGENCE KARMIQUE ENGINE ═══
// Score 0-100% crossing all 5 systems

import { type NumerologyProfile, type Reduced, getNumberInfo, isMaster } from './numerology';
import { type AstroChart, PLANET_FR } from './astrology';
import { type ChineseZodiac } from './chinese-zodiac';
import { type IChingReading } from './iching';

const THEMES: Record<number, string> = {
  1: 'action', 2: 'réceptivité', 3: 'expression', 4: 'structure',
  5: 'liberté', 6: 'amour', 7: 'introspection', 8: 'pouvoir',
  9: 'lâcher-prise', 11: 'intuition', 22: 'vision', 33: 'guérison'
};

export interface ConvergenceResult {
  score: number;
  level: string;
  lCol: string;
  signals: string[];
  alerts: string[];
  theme: string;
}

export function calcConvergence(
  num: NumerologyProfile,
  astro: AstroChart | null,
  cz: ChineseZodiac,
  iching: IChingReading
): ConvergenceResult {
  let score = 50;
  const signals: string[] = [];
  const alerts: string[] = [];

  const pdv = num.ppd.v;
  const lpv = num.lp.v;

  // 1. Personal Day ↔ Core Numbers resonance
  if (pdv === lpv) {
    score += 18;
    signals.push(`Jour ${pdv} = Chemin de Vie → journée d'alignement majeur`);
  } else if (pdv === num.expr.v) {
    score += 10;
    signals.push(`Jour ${pdv} = Expression → talents amplifiés`);
  } else if (pdv === num.soul.v) {
    score += 10;
    signals.push(`Jour ${pdv} = Âme → désirs profonds activés`);
  } else if (pdv === num.pers.v) {
    score += 8;
    signals.push(`Jour ${pdv} = Personnalité → charisme renforcé`);
  }

  // 2. Master number day
  if (isMaster(pdv)) {
    score += 8;
    signals.push(`Jour Maître ${pdv} → énergie spirituelle intense`);
  }

  // 3. Personal Year harmony
  if (pdv === num.py.v) {
    score += 6;
    signals.push(`Jour ${pdv} = Année Personnelle → thème annuel amplifié`);
  }

  // 4. Karmic lesson activation
  if (num.kl.includes(pdv)) {
    score += 12;
    alerts.push(`Leçon karmique ${pdv} activée → opportunité de croissance`);
  }

  // 5. Transit aspects
  if (astro && astro.tr.length) {
    let trBonus = 0;
    astro.tr.slice(0, 8).forEach(t => {
      const pf = PLANET_FR;
      if (t.x) {
        trBonus += 10;
        signals.push(`${pf[t.tp]} ${t.t} ${pf[t.np]} EXACT → énergie puissante`);
      } else if (t.t === 'trine' || t.t === 'sextile') {
        trBonus += 4;
      } else if (t.t === 'square') {
        trBonus -= 3;
        alerts.push(`${pf[t.tp]} □ ${pf[t.np]} → tension créatrice`);
      } else if (t.t === 'opposition') {
        trBonus -= 2;
        alerts.push(`${pf[t.tp]} ☍ ${pf[t.np]} → polarité à intégrer`);
      } else if (t.t === 'conjunction') {
        trBonus += 6;
        signals.push(`${pf[t.tp]} ☌ ${pf[t.np]} → fusion d'énergies`);
      }
    });
    score += Math.max(-15, Math.min(25, trBonus));
  }

  // 6. I Ching harmony
  const hx = iching.hexNum;
  const creativeHex = [1, 11, 14, 25, 34, 42, 46, 50, 55, 58, 61];
  const challengeHex = [3, 4, 12, 23, 29, 36, 39, 47, 64];
  if (creativeHex.includes(hx)) {
    score += 8;
    signals.push(`Hex. ${hx} (${iching.name}) → énergie créatrice`);
  } else if (challengeHex.includes(hx)) {
    score -= 4;
    alerts.push(`Hex. ${hx} (${iching.name}) → patience requise`);
  } else {
    score += 3;
  }

  // 7. Chinese element cycle with Personal Day
  const dayElem = ['fire', 'earth', 'air', 'water'][(pdv - 1) % 4];
  const czElemMap: Record<string, string> = { 'Métal': 'air', 'Eau': 'water', 'Bois': 'earth', 'Feu': 'fire', 'Terre': 'earth' };
  const czE = czElemMap[cz.elem] || 'earth';
  if (dayElem === czE) {
    score += 6;
    signals.push(`${cz.elem} chinois en harmonie avec l'énergie du jour`);
  }

  // 8. Thematic convergence — when Numerology + I Ching say the same thing
  const themeAlign =
    (pdv === 7 && [20, 23, 33, 52].includes(hx)) ||
    (pdv === 1 && [1, 25, 34].includes(hx)) ||
    (pdv === 5 && [56, 57, 59].includes(hx)) ||
    (pdv === 6 && [31, 37, 45, 58].includes(hx)) ||
    (pdv === 9 && [2, 15, 41].includes(hx)) ||
    (pdv === 3 && [21, 22, 30, 55].includes(hx)) ||
    (pdv === 4 && [7, 15, 18, 52].includes(hx)) ||
    (pdv === 8 && [1, 14, 34, 50].includes(hx)) ||
    (pdv === 2 && [2, 8, 19, 45].includes(hx));

  if (themeAlign) {
    score += 12;
    const theme = THEMES[pdv] || '';
    signals.push(`⚡ CONVERGENCE : Numérologie (${theme}) + I Ching (${iching.name}) = même message !`);
  }

  // 9. Chaldean resonance
  if (num.ch.rd.v === pdv) {
    score += 5;
    signals.push(`Chaldéen ${num.ch.rd.v} = Jour ${pdv} → vibration sonore alignée`);
  }

  // Clamp
  score = Math.max(5, Math.min(98, score));

  // Level
  let level: string, lCol: string;
  if (score >= 85) { level = '🌟 Convergence Majeure'; lCol = '#FFD700'; }
  else if (score >= 70) { level = '✦ Énergie Puissante'; lCol = '#4ade80'; }
  else if (score >= 55) { level = '☉ Énergie Favorable'; lCol = '#60a5fa'; }
  else if (score >= 40) { level = '☽ Journée Neutre'; lCol = '#9890aa'; }
  else { level = '⚡ Tensions Actives'; lCol = '#ef4444'; }

  return { score, level, lCol, signals, alerts, theme: THEMES[pdv] || 'équilibre' };
}
