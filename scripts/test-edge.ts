import { calcBond } from '../src/engines/compatibility.js';
import { calcOracle } from '../src/engines/oracle.js';
import { calcLifePath, calcExpression, calcSoul } from '../src/engines/numerology.js';

const G = (s: string) => "\x1b[32m" + s + "\x1b[0m";
const R = (s: string) => "\x1b[31m" + s + "\x1b[0m";
let ok = 0, fail = 0;
const fails: string[] = [];

function test(name: string, fn: () => void) {
  try { fn(); ok++; }
  catch(e: any) { fail++; fails.push(name + ': ' + e.message); }
}

console.log('\n══ CAS LIMITES — EDGE CASES ══\n');

console.log('📋 Dates extrêmes');
test('Date 1900-01-01', () => {
  const r = calcBond('1900-01-01', 'Old', '1990-06-15', 'Young', 'amour');
  if (r.scoreGlobal < 0 || r.scoreGlobal > 100) throw new Error('hors range: ' + r.scoreGlobal);
});
test('Date 2025-12-31', () => {
  const r = calcBond('2025-12-31', 'New', '2000-06-15', 'Mid', 'amour');
  if (r.scoreGlobal < 0 || r.scoreGlobal > 100) throw new Error('hors range: ' + r.scoreGlobal);
});
test('Date 2100-01-01', () => {
  const r = calcBond('2100-01-01', 'Future', '2050-06-15', 'Far', 'amour');
  if (r.scoreGlobal < 0 || r.scoreGlobal > 100) throw new Error('hors range: ' + r.scoreGlobal);
});

console.log('📋 Noms avec accents');
test('Hélène', () => {
  const r = calcOracle({ type: 'nom', input: 'Hélène', dailyScore: 50, userCdv: 5 });
  if (r.oracleScore < 0 || r.oracleScore > 100) throw new Error('score: ' + r.oracleScore);
});
test('François-René', () => {
  const r = calcOracle({ type: 'nom', input: 'François-René', dailyScore: 50, userCdv: 3 });
  if (r.oracleScore < 0 || r.oracleScore > 100) throw new Error('score: ' + r.oracleScore);
});
test('José María', () => {
  const r = calcOracle({ type: 'nom', input: 'José María', dailyScore: 50, userCdv: 7 });
  if (r.oracleScore < 0 || r.oracleScore > 100) throw new Error('score: ' + r.oracleScore);
});
test('Ñoño', () => {
  const r = calcOracle({ type: 'nom', input: 'Ñoño', dailyScore: 50, userCdv: 1 });
  if (r.oracleScore < 0 || r.oracleScore > 100) throw new Error('score: ' + r.oracleScore);
});

console.log('📋 Noms extrêmes');
test('A (1 lettre)', () => {
  const r = calcOracle({ type: 'nom', input: 'A', dailyScore: 50, userCdv: 5 });
  if (r.oracleScore < 0 || r.oracleScore > 100) throw new Error('score: ' + r.oracleScore);
});
test('Xx (2 lettres) en compat', () => {
  const r = calcBond('1990-01-01', 'Xx', '1990-06-15', 'Yy', 'amour');
  if (r.scoreGlobal < 0 || r.scoreGlobal > 100) throw new Error('score: ' + r.scoreGlobal);
});
test('Nom 50 chars', () => {
  const r = calcOracle({ type: 'nom', input: 'Alexandrinatheobaldinafredericamariecatherinelouise', dailyScore: 50, userCdv: 8 });
  if (r.oracleScore < 0 || r.oracleScore > 100) throw new Error('score: ' + r.oracleScore);
});

console.log('📋 Numéros edge');
test('Numéro 0', () => {
  const r = calcOracle({ type: 'numero', input: '0', dailyScore: 50 });
  if (r.oracleScore < 0 || r.oracleScore > 100) throw new Error('score: ' + r.oracleScore);
});
test('Numéro 1 digit', () => {
  const r = calcOracle({ type: 'numero', input: '8', dailyScore: 50 });
  if (r.oracleScore < 0 || r.oracleScore > 100) throw new Error('score: ' + r.oracleScore);
});
test('Numéro 20 digits', () => {
  const r = calcOracle({ type: 'numero', input: '88888888881234567890', dailyScore: 50 });
  if (r.oracleScore < 0 || r.oracleScore > 100) throw new Error('score: ' + r.oracleScore);
});
test('Numéro avec espaces', () => {
  const r = calcOracle({ type: 'numero', input: '06 12 34 56 78', dailyScore: 50 });
  if (r.oracleScore < 0 || r.oracleScore > 100) throw new Error('score: ' + r.oracleScore);
});

console.log('📋 DailyScore extrêmes');
test('DailyScore 0', () => {
  const r = calcOracle({ type: 'date', input: '2026-06-15', dailyScore: 0, userCdv: 5 });
  if (r.oracleScore < 0 || r.oracleScore > 100) throw new Error('score: ' + r.oracleScore);
});
test('DailyScore 100', () => {
  const r = calcOracle({ type: 'date', input: '2026-06-15', dailyScore: 100, userCdv: 5 });
  if (r.oracleScore < 0 || r.oracleScore > 100) throw new Error('score: ' + r.oracleScore);
});

console.log('📋 Tous les modes compat');
for (const mode of ['amour', 'pro', 'famille'] as const) {
  test('Mode ' + mode, () => {
    const r = calcBond('1985-03-15', 'Test', '1990-09-22', 'Pair', mode);
    if (r.scoreGlobal < 0 || r.scoreGlobal > 100) throw new Error(mode + ': ' + r.scoreGlobal);
  });
}

console.log('📋 Numérologie edge');
test('CdV 29 février (bissextile)', () => {
  const lp = calcLifePath('2000-02-29');
  if (lp.v < 1 || lp.v > 33) throw new Error('LP: ' + lp.v);
});
test('Expression string vide', () => {
  try { calcExpression(''); } catch(e) { /* crash OK */ }
});
test('Soul que voyelles: Aeiou', () => {
  const s = calcSoul('Aeiou');
  if (s.v < 1 || s.v > 33) throw new Error('Soul: ' + s.v);
});
test('Soul que consonnes: Bcd', () => {
  const s = calcSoul('Bcd');
  // Pas de voyelles → résultat 0 ou edge, pas de crash
});

console.log('\n══════════════════════════════');
if (fail > 0) {
  console.log(R('  ❌ ' + fail + ' ÉCHEC(S):'));
  fails.forEach(f => console.log(R('     • ' + f)));
}
console.log('  ' + G('✅ ' + ok + ' passé(s)') + (fail > 0 ? '  ' + R('❌ ' + fail + ' échoué(s)') : '') + '  — Total: ' + (ok+fail));
if (fail > 0) process.exit(1);
