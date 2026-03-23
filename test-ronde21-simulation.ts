/**
 * Simulation Ronde #21 — Vérifier que les ajouts (karmiques, leçons, Feng Shui)
 * ont pts=0 et donc AUCUN impact sur les scores existants.
 */
import { calcOracle } from './src/engines/oracle';
const BASE = { dailyScore: 72, userCdv: 6, domainScoreFromConvergence: 65, userBirthDay: 15, userBirthMonth: 3 };

const tests = [
  { type: 'nom' as const, input: 'MOD', label: 'Nom MOD (karmique 14)' },
  { type: 'nom' as const, input: 'KAIRONAUTE', label: 'Nom KAIRONAUTE (lecons)' },
  { type: 'nom' as const, input: 'SOLEIL', label: 'Nom SOLEIL (normal)' },
  { type: 'numero' as const, input: '0612345678', label: 'Num banal' },
  { type: 'numero' as const, input: '0783707470', label: 'Num 0783' },
  { type: 'numero' as const, input: '8888888888', label: 'Num 8888' },
  { type: 'numero' as const, input: '0004900', label: 'Num karmique 13' },
  { type: 'adresse' as const, input: '13 rue de la Paix', label: 'Addr 13 (karmique)' },
  { type: 'adresse' as const, input: '7 rue de la Paix', label: 'Addr 7 (normal)' },
  { type: 'adresse' as const, input: '14 rue Voltaire', label: 'Addr 14 (karmique)' },
  { type: 'bebe' as const, input: 'GABRIEL', label: 'Bebe GABRIEL' },
  { type: 'bebe' as const, input: 'CHARLOTTE', label: 'Bebe CHARLOTTE (lecons)' },
  { type: 'bebe' as const, input: 'MOD', label: 'Bebe MOD (karmique)' },
  { type: 'date' as const, input: '2026-06-15', label: 'Date 15 juin' },
  { type: 'date' as const, input: '2026-12-25', label: 'Date 25 dec' },
];

console.log('=== SIMULATION RONDE 21 : Impact sur les scores ===\n');

let allZero = true;
let karmicCount = 0;
let lessonCount = 0;
let fsCount = 0;

for (const t of tests) {
  const r = calcOracle({ ...BASE, type: t.type, input: t.input });
  const kbds = r.breakdown.filter(b =>
    b.label.includes('Karmique') || b.label.includes('karmique') || b.label.includes('Feng Shui')
  );
  for (const kb of kbds) {
    if (kb.pts !== 0) {
      console.log(`  !! ${t.label} : ${kb.label} pts=${kb.pts} (ATTENDU 0)`);
      allZero = false;
    }
    if (kb.label.includes('Dette')) karmicCount++;
    if (kb.label.includes('Lecons') || kb.label.includes('karmiques')) lessonCount++;
    if (kb.label.includes('Feng Shui')) fsCount++;
  }
  const kLabels = kbds.map(b => b.label.substring(0, 40)).join(' | ');
  console.log(`  ${t.label.padEnd(32)} ${String(r.domainScore).padStart(3)}%  ${kLabels || '(aucun ajout R21)'}`);
}

console.log('\n=== BILAN ===');
console.log(`  Dettes karmiques detectees :  ${karmicCount}`);
console.log(`  Lecons karmiques detectees :  ${lessonCount}`);
console.log(`  Feng Shui elements detectes : ${fsCount}`);
console.log(`  Impact sur les scores :       ${allZero ? 'ZERO (pts=0 partout)' : 'PROBLEME !'}`);
console.log(allZero ? '\n  VERDICT : Les ajouts Ronde 21 enrichissent le breakdown et les alertes SANS modifier aucun score.' : '\n  VERDICT : PROBLEME — certains ajouts modifient le score !');
