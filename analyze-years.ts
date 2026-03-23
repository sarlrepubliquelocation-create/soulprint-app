/**
 * Analyse dashaMult par année (2026-2043)
 * Usage : npx tsx analyze-years.ts
 */
import { calcCurrentDasha, calcDashaScore, composeDashaMultipliers } from './src/engines/vimshottari';
import { getMoonPhase } from './src/engines/moon';
import { getAyanamsa } from './src/engines/nakshatras';

const BD = '1988-07-06';
const BT = '10:30';
const birthD = new Date(BD + 'T' + BT + ':00');

const natalMoon = getMoonPhase(birthD);
const natalAyanamsa = getAyanamsa(birthD.getFullYear());
const natalMoonSid = ((natalMoon.longitudeTropical - natalAyanamsa) % 360 + 360) % 360;
const natalMoonIsWaxing = (natalMoon.phase ?? 0) <= 4;
const certScore = 0.95; // Approximation pour heure connue

console.log('natalMoonSid:', natalMoonSid.toFixed(2), '°');
console.log('natalMoonIsWaxing:', natalMoonIsWaxing);
console.log();

const rows: string[] = [];
rows.push('Année | dashaMult | Maha     | Antar    | Maha(±4) | Antar(±2) | Syn(±2) | Total(±9)');
rows.push('------|----------|----------|----------|----------|-----------|---------|----------');

for (let year = 2026; year <= 2043; year++) {
  const d = new Date(year, 6, 1);
  const dasha = calcCurrentDasha(natalMoonSid, birthD, d);
  const ds = calcDashaScore(dasha, { natalMoonIsWaxing });
  const dm = composeDashaMultipliers(ds.mahaScore, ds.antarScore, certScore);

  rows.push(
    `${year}  |  ${dm.toFixed(4)}  | ${dasha.maha.lord.padEnd(8)} | ${dasha.antar.lord.padEnd(8)} | ${String(ds.mahaScore).padStart(8)} | ${String(ds.antarScore).padStart(9)} | ${String(ds.synergyBonus).padStart(7)} | ${String(ds.total).padStart(9)}`
  );
}

rows.forEach(r => console.log(r));

// Aussi afficher les transitions Maha
console.log();
console.log('=== TRANSITIONS MAHADASHA ===');
let prevMaha = '';
for (let year = 2024; year <= 2045; year++) {
  for (let m = 0; m < 12; m++) {
    const d = new Date(year, m, 1);
    const dasha = calcCurrentDasha(natalMoonSid, birthD, d);
    if (dasha.maha.lord !== prevMaha) {
      const pct = (dasha.maha.progressPct ?? 0).toFixed(1);
      console.log(`${year}-${String(m+1).padStart(2,'0')} : Maha → ${dasha.maha.lord} (début, progress ${pct}%)`);
      prevMaha = dasha.maha.lord;
    }
  }
}
