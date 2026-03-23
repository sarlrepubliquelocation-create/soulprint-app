import { calcBond } from '../src/engines/compatibility.js';

const r = calcBond('1977-09-23', 'Jérôme', '1981-08-17', 'Laurent', 'famille', 'frere_frere');

console.log('=== RENDU FINAL — Jérôme × Laurent (Fratrie) ===\n');
r.breakdown.filter(b => b.system !== 'Peach Blossom').forEach(b => {
  console.log(`┌─ ${b.icon} ${b.system}  ${b.weight}  ${b.score}%`);
  if (b.technicals.length > 0) {
    console.log(`│  \x1b[2m${b.technicals.slice(0, 3).join(' · ')}\x1b[0m`);
  }
  console.log(`│  ${b.detail}`);
  console.log(`└─`);
  console.log();
});

console.log(`--- ALERTES (orange) ---`);
r.alerts.forEach(a => console.log(`  ⚠️ ${a}`));
if (r.alerts.length === 0) console.log('  (aucune)');
console.log();
console.log(`--- SIGNAUX (supprimés du rendu, gardés dans data) ---`);
console.log(`  ${r.signals.length} signal(s) dans result.signals`);
