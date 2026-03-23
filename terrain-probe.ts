import { buildNatalDashaCtx, calcDashaMultLite } from './src/engines/convergence-slow';

const bd = '1977-09-23';
const ctx = buildNatalDashaCtx(bd, '23:20', {
  pl: [
    { k: 'sun', s: 'Virgo', d: 0.35, h: 5 },
    { k: 'moon', s: 'Taurus', d: 15, h: 11 },
  ],
  as: { s: 'Taurus', d: 28.5 },
  tr: [], stelliums: [],
} as any);

if (!ctx) { console.log('ERROR: no ctx'); process.exit(1); }

const years = [2026, 2027, 2030, 2032, 2035, 2037, 2040, 2043];
for (const y of years) {
  const samples: number[] = [];
  for (let m = 0; m < 12; m++) {
    const d = new Date(y, m, 15, 12, 0, 0);
    const { dashaMult } = calcDashaMultLite(ctx, d);
    samples.push(dashaMult);
  }
  const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
  const min = Math.min(...samples);
  const max = Math.max(...samples);
  
  const ctxMult = 1.0;
  const terrain_brut = ctxMult * avg;
  const terrain_sq = 1 + 0.25 * Math.tanh((terrain_brut - 1) / 0.35);
  
  console.log(`${y} | dashaMult avg=${avg.toFixed(4)} min=${min.toFixed(4)} max=${max.toFixed(4)} | terrain_sq=${terrain_sq.toFixed(5)}`);
}
