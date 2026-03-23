import { SIGNS, getPlanetLongitudeForDate } from './src/engines/astrology';

// ── calcTransitsLite inliné (même code que convergence-daily.ts) ──
const _LITE_AMPLITUDES: Record<string, { harmonic: number; tense: number; conjunction: number }> = {
  jupiter:  { harmonic:  6, tense: -2, conjunction:  6 },
  saturn:   { harmonic:  4, tense: -8, conjunction: -6 },
  uranus:   { harmonic:  6, tense: -6, conjunction:  5 },
  neptune:  { harmonic:  5, tense: -5, conjunction:  3 },
  pluto:    { harmonic: 10, tense: -10, conjunction: -8 },
};
const _LITE_NATAL_MULTS: Record<string, number> = { sun: 1.5, moon: 1.5, asc: 1.2 };
const _LITE_SLOW = ['jupiter', 'saturn', 'uranus', 'neptune', 'pluto'] as const;
const _LITE_NATAL_TARGETS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'] as const;
const _LITE_ASPECTS = [
  { name: 'conjunction', angle: 0, orb: 3 },
  { name: 'opposition', angle: 180, orb: 3 },
  { name: 'trine', angle: 120, orb: 3 },
  { name: 'square', angle: 90, orb: 3 },
  { name: 'sextile', angle: 60, orb: 2 },
] as const;
const _LITE_HARMONIC = new Set(['trine', 'sextile']);
const _LITE_TENSE = new Set(['square', 'opposition']);

// Jérôme natal planets (approximation from astrology data)
// Need actual natal chart - let's extract from App.tsx defaults or typical
// We'll use a simplified natal chart for probing
const natalPlanets = [
  { k: 'sun', s: 'Virgo', d: 0.35 },
  { k: 'moon', s: 'Taurus', d: 15.0 },
  { k: 'mercury', s: 'Virgo', d: 19.0 },
  { k: 'venus', s: 'Leo', d: 24.0 },
  { k: 'mars', s: 'Cancer', d: 13.0 },
  { k: 'jupiter', s: 'Cancer', d: 25.0 },
  { k: 'saturn', s: 'Leo', d: 1.0 },
];

function calcTransitsLite(np: typeof natalPlanets, targetDate: string): { total: number; details: string[] } {
  const sigma = 1.2;
  const sigmaSq2 = 2 * sigma * sigma;
  const gaussian = (orb: number) => Math.exp(-(orb * orb) / sigmaSq2);
  const targetD = new Date(targetDate + 'T12:00:00');
  let total = 0;
  const details: string[] = [];
  
  for (const tp of _LITE_SLOW) {
    const transitLon = getPlanetLongitudeForDate(tp, targetD);
    const ampTable = _LITE_AMPLITUDES[tp];
    if (!ampTable) continue;
    
    for (const np_ of np) {
      if (!(_LITE_NATAL_TARGETS as readonly string[]).includes(np_.k)) continue;
      const natalLon = np_.d + SIGNS.indexOf(np_.s) * 30;
      const diff = Math.abs(transitLon - natalLon);
      const normDiff = diff > 180 ? 360 - diff : diff;
      
      for (const asp of _LITE_ASPECTS) {
        const orbVal = Math.abs(normDiff - asp.angle);
        if (orbVal > asp.orb) continue;
        
        let amplitude: number;
        if (asp.name === 'conjunction') amplitude = ampTable.conjunction;
        else if (_LITE_HARMONIC.has(asp.name)) amplitude = ampTable.harmonic;
        else if (_LITE_TENSE.has(asp.name)) amplitude = ampTable.tense;
        else continue;
        
        const natalMult = _LITE_NATAL_MULTS[np_.k] ?? 1.0;
        const intensity = gaussian(orbVal);
        const contrib = amplitude * natalMult * intensity;
        total += contrib;
        if (Math.abs(contrib) > 0.5) {
          details.push(`${tp}(${transitLon.toFixed(1)}°) ${asp.name} natal-${np_.k}(${natalLon.toFixed(1)}°) orb=${orbVal.toFixed(2)}° → ${contrib.toFixed(2)}`);
        }
      }
    }
  }
  return { total: Math.max(-15, Math.min(15, +total.toFixed(2))), details };
}

// Probe Mars of key years
const years = [2026, 2027, 2030, 2032, 2035, 2037, 2040, 2043];
for (const y of years) {
  const scores: number[] = [];
  let allDetails: string[] = [];
  for (let d = 1; d <= 28; d += 7) {
    const dateStr = `${y}-03-${String(d).padStart(2, '0')}`;
    const { total, details } = calcTransitsLite(natalPlanets, dateStr);
    scores.push(total);
    if (d === 15) allDetails = details;
  }
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const clampedAvg = Math.max(-6, Math.min(6, Math.round(avg)));
  console.log(`\n${y} Mars | transitLite avg=${avg.toFixed(2)} → astroPts clamp=${clampedAvg} | samples=[${scores.join(', ')}]`);
  if (allDetails.length > 0) {
    console.log(`  15 mars details:`);
    allDetails.forEach(d => console.log(`    ${d}`));
  }
}
