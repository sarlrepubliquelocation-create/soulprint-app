import { calcBond } from '../src/engines/compatibility';

// Test 1: JEROME × ALINE — cas qui montrait le bug (Num raw=55% mais BaZi contribue plus)
const r1 = calcBond('1977-09-23', 'JEROME', '1950-01-04', 'ALINE', 'amour');
console.log('=== JEROME × ALINE (Amour) ===');
console.log('Score:', r1.score + '%');
r1.breakdown.forEach(b => {
  const w = parseFloat(b.weight) / 100;
  console.log(`  ${b.system}: raw=${b.score}%, poids=${b.weight}, contribution=${(b.score * w).toFixed(1)}`);
});
console.log('Résumé:', r1.summary?.slice(0, 120) + '...');
console.log('Strongest (moteur principal) devrait être BaZi (contribution la plus haute)');

// Test 2: JEROME × AL — Maîtres Nombres
const r2 = calcBond('1950-01-04', 'JEROME', '1950-05-11', 'AL', 'amour');
console.log('\n=== 04/01/1950 × 11/05/1950 (Amour, CdV 11×22) ===');
console.log('Score:', r2.score + '%');
r2.breakdown.forEach(b => {
  const w = parseFloat(b.weight) / 100;
  console.log(`  ${b.system}: raw=${b.score}%, poids=${b.weight}, contribution=${(b.score * w).toFixed(1)}`);
});
console.log('Résumé:', r2.summary?.slice(0, 120) + '...');

// Test 3: même chose en mode Famille (Peach devrait être exclu)
const r3 = calcBond('1977-09-23', 'JEROME', '1950-01-04', 'ALINE', 'famille', 'ami');
console.log('\n=== JEROME × ALINE (Famille/Ami) ===');
console.log('Score:', r3.score + '%');
r3.breakdown.forEach(b => {
  const w = parseFloat(b.weight) / 100;
  console.log(`  ${b.system}: raw=${b.score}%, poids=${b.weight}, contribution=${(b.score * w).toFixed(1)}`);
});
console.log('Résumé:', r3.summary?.slice(0, 120) + '...');
console.log('Strongest (moteur principal) ne devrait PAS être Peach Blossom');
