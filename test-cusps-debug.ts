// Debug: voir les cusps brutes avant validation
// Import direct des fonctions internes via un wrapper

import { calcAstro } from './src/engines/astrology';

// Monkey-patch console.warn to capture the cusps
const origWarn = console.warn;
const warnings: string[] = [];
console.warn = (...args: any[]) => { warnings.push(args.join(' ')); origWarn(...args); };

// Pour voir les cusps, on va les calculer directement
// Reproduisons le calcul pour Jérôme: 1977-09-23 23:20 Mâcon (lat 46.3, lon 4.83)
const deg = Math.PI / 180;

function norm(x: number): number { let v = x % 360; if (v < 0) v += 360; return v; }

function eclipticFromRA(ra: number, obl: number): number {
  const oblR = obl * deg;
  const raR = ra * deg;
  const sinDec = Math.sin(oblR) * Math.sin(raR);
  const dec2 = Math.asin(Math.max(-1, Math.min(1, sinDec)));
  const lon = Math.atan2(Math.cos(oblR) * Math.sin(raR), Math.cos(raR));
  return norm(lon * 180 / Math.PI);
}

function calcPlacidusHouses(asc: number, mc: number, ramc: number, obl: number, lat: number): number[] {
  const hs = new Array(12).fill(0);
  hs[0] = norm(asc);
  hs[9] = norm(mc);
  hs[3] = norm(asc + 180);
  hs[6] = norm(mc + 180);

  const oblR = obl * deg;
  const latR = lat * deg;

  const placidusCusp = (quadrant: number): number => {
    let ra = norm(ramc + quadrant * 30);
    for (let i = 0; i < 30; i++) {
      const raR = ra * deg;
      const sinDec = Math.sin(oblR) * Math.sin(raR);
      const dec2 = Math.asin(Math.max(-1, Math.min(1, sinDec)));
      const cosD = Math.cos(dec2);
      if (Math.abs(cosD) < 1e-10) break;
      const adRaw = Math.atan(Math.tan(latR) * Math.sin(dec2) / cosD);
      const ad = adRaw * 180 / Math.PI;
      ra = norm(ramc + quadrant * 30 - ad * (quadrant / 3));
    }
    return ra;
  };

  hs[10] = eclipticFromRA(placidusCusp(1), obl);  // M11
  hs[11] = eclipticFromRA(placidusCusp(2), obl);  // M12
  hs[1]  = eclipticFromRA(placidusCusp(3), obl);  // M2 -- WAIT this should be quadrant for lower hemisphere
  hs[2]  = eclipticFromRA(placidusCusp(4), obl);  // M3

  // R25 FIX: opposées
  hs[4]  = norm(hs[10] + 180);  // M5
  hs[5]  = norm(hs[11] + 180);  // M6
  hs[7]  = norm(hs[1]  + 180);  // M8
  hs[8]  = norm(hs[2]  + 180);  // M9

  return hs.map(norm);
}

// Jérôme: 23 sept 1977, 23:20, Mâcon (46.3°N, 4.83°E)
// On a besoin de ASC, MC, RAMC, obliquity pour cette date/lieu
// Estimations pour cette date (approximation):
// JD for 1977-09-23 23:20 UT → ~2443413.47
// Obliquity ~23.44°
// RAMC for this time/location... let's just try with the full calcAstro and see what happens

const result = calcAstro('1977-09-23', '23:20', 'Macon', 1, '2026-03-20', 'placidus');
if (!result) {
  console.log('calcAstro returned null — checking equal house result...');
}

// Try with equal house to get ASC/MC values
const resultEq = calcAstro('1977-09-23', '23:20', 'Macon', 1, '2026-03-20', 'equal');
if (resultEq) {
  console.log('\n=== EQUAL HOUSE RESULT ===');
  console.log(`ASC: ${resultEq.b3.asc} ${resultEq.ad.toFixed(2)}°`);
  console.log(`MC: ${resultEq.mcSign} ${resultEq.mcDeg.toFixed(2)}°`);
  console.log(`House system: ${resultEq.houseSystem}`);
  console.log('\nPlanets:');
  resultEq.pl.forEach(p => {
    console.log(`  ${p.k.padEnd(12)} ${p.s.padEnd(12)} ${p.deg.toFixed(1).padStart(6)}°  Maison ${p.h}`);
  });

  // Count per house
  const byH: Record<number, number> = {};
  resultEq.pl.forEach(p => { byH[p.h] = (byH[p.h] || 0) + 1; });
  console.log('\nDistribution:', byH);
}
