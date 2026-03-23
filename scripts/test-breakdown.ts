import { calcBond } from '../src/engines/compatibility.js';

const r = calcBond('1977-09-23', 'Jérôme', '1981-08-17', 'Laurent', 'famille', 'frere_frere');

console.log('=== BREAKDOWN ENRICHI — Jérôme × Laurent (Fratrie) ===\n');
r.breakdown.forEach(b => {
  console.log(`📦 ${b.system} (${b.weight}) → ${b.score}%`);
  console.log(`   ${b.detail}\n`);
});

// Test amour aussi
const r2 = calcBond('1977-09-23', 'Jérôme', '1985-03-15', 'Sophie', 'amour');
console.log('\n=== BREAKDOWN ENRICHI — Jérôme × Sophie (Amour) ===\n');
r2.breakdown.forEach(b => {
  console.log(`📦 ${b.system} (${b.weight}) → ${b.score}%`);
  console.log(`   ${b.detail}\n`);
});

// Test pro
const r3 = calcBond('1977-09-23', 'Jérôme', '1990-06-15', 'Marc', 'pro');
console.log('\n=== BREAKDOWN ENRICHI — Jérôme × Marc (Pro) ===\n');
r3.breakdown.forEach(b => {
  console.log(`📦 ${b.system} (${b.weight}) → ${b.score}%`);
  console.log(`   ${b.detail}\n`);
});
