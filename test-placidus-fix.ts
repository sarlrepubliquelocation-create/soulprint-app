// Test Placidus cusps fix — Vérification Jérôme (1977-09-23 23:20 Mâcon)
import { calcAstro } from './src/engines/astrology';

const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];

console.log('=== TEST PLACIDUS ===\n');

const result = calcAstro('1977-09-23', '23:20', 'Macon', 1, '2026-03-20', 'placidus');

if (!result) {
  console.error('❌ calcAstro returned null');
  process.exit(1);
}

console.log(`Système de maisons: ${result.houseSystem}`);
console.log(`ASC: ${result.b3.asc} ${result.ad.toFixed(2)}°`);
console.log(`MC: ${result.mcSign} ${result.mcDeg.toFixed(2)}°\n`);

// Distribution des planètes par maison
console.log('=== DISTRIBUTION PLANÈTES PAR MAISON ===');
const byHouse: Record<number, string[]> = {};
result.pl.forEach(p => {
  (byHouse[p.h] = byHouse[p.h] || []).push(p.k);
});
for (let h = 1; h <= 12; h++) {
  const planets = byHouse[h] || [];
  console.log(`  Maison ${h.toString().padStart(2)}: ${planets.length} → ${planets.join(', ') || '(vide)'}`);
}

// Check H1 count
const h1Count = (byHouse[1] || []).length;
if (h1Count > 5) {
  console.error(`\n❌ ${h1Count} planètes en Maison 1 — BUG PERSISTE`);
} else {
  console.log(`\n✅ Distribution OK — ${h1Count} planète(s) en Maison 1`);
}

// Check house signs via hs field
console.log('\n=== CUSPIDES (signes) ===');
result.hs.forEach((sign, i) => {
  console.log(`  Maison ${(i+1).toString().padStart(2)}: ${sign}`);
});

// Test Whole Sign toggle
console.log('\n=== TEST WHOLE SIGN ===');
const resultWS = calcAstro('1977-09-23', '23:20', 'Macon', 1, '2026-03-20', 'wholesign');
if (resultWS) {
  console.log(`Système: ${resultWS.houseSystem}`);
  const byHouseWS: Record<number, string[]> = {};
  resultWS.pl.forEach(p => {
    (byHouseWS[p.h] = byHouseWS[p.h] || []).push(p.k);
  });
  for (let h = 1; h <= 12; h++) {
    const planets = byHouseWS[h] || [];
    if (planets.length) console.log(`  Maison ${h.toString().padStart(2)}: ${planets.join(', ')}`);
  }

  // Compare: au moins quelques planètes doivent changer de maison
  let diffs = 0;
  result.pl.forEach((p, i) => {
    if (resultWS && p.h !== resultWS.pl[i].h) diffs++;
  });
  console.log(`\n${diffs > 0 ? '✅' : '⚠️'} ${diffs} planète(s) changent de maison avec le toggle WS`);
}

// Test Equal House (no time)
console.log('\n=== TEST EQUAL HOUSE (no time) ===');
const resultNoTime = calcAstro('1977-09-23', '', 'Macon', 1, '2026-03-20', 'placidus');
if (resultNoTime) {
  console.log(`Système: ${resultNoTime.houseSystem} (noTime: ${resultNoTime.noTime})`);
}
