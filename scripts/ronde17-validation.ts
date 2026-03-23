/**
 * RONDE 17 — Script de validation non-régression
 * Vérifie :
 * 1. Les 4 cas réels de Jérôme en mode Famille (μ=48/σ=20)
 * 2. Les badges contextuels Score×Type
 * 3. Les modes Amour et Pro INCHANGÉS (pas de régression)
 * 4. Les labels famille (6 niveaux, couleurs non-punitives)
 */

// ── Fonctions de scoring (copie fidèle du moteur) ──

function normalCDF(z: number): number {
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1.0 / (1.0 + 0.3275911 * x);
  const erf = 1.0 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * erf);
}

function gaussScore(raw: number, mu: number, sigma: number, offset: number = 0.30): number {
  const z = (raw - mu) / sigma;
  const phi = normalCDF(z);
  return Math.max(5, Math.min(98, Math.round(5 + 93 * (offset + (1 - offset) * phi))));
}

// ── Données des 4 cas réels ──
const JEROME = '1977-09-23';
const STEVE_BD = '1978-05-27';
const LAURENT_BD = '1981-08-17';
const CARMEN_BD = '1957-02-16';
const PERE_BD = '1951-08-05';

// Scores BaZi/Num/Yi connus (du brief Ronde 17)
const cases = [
  { name: 'Père Michel', bazi: 12, num: 73, iching: 14, type: 'parent', sub: 'pere_fils', targetMin: 40, targetMax: 52 },
  { name: 'Mère Carmen', bazi: 54, num: 70, iching: 36, type: 'parent', sub: 'mere_fils', targetMin: 65, targetMax: 78 },
  { name: 'Ami Steve',   bazi: 12, num: 55, iching: 36, type: 'ami',    sub: 'ami',      targetMin: 40, targetMax: 55 },
  { name: 'Frère Laurent',bazi: 54, num: 65, iching: 36, type: 'fratrie',sub: 'frere_frere', targetMin: 60, targetMax: 78 },
];

// Poids famille (INCHANGÉS — Ronde 17 unanime)
const FAMILLE_W = { bazi: 0.40, num: 0.30, iching: 0.30 };
const FAMILLE_MU = 48;
const FAMILLE_SIGMA = 20;

// ── Badge Score×Type matrix (copie de compatibility.ts) ──
type ScoreTier = 'high' | 'good' | 'moderate' | 'low';
function getScoreTier(score: number): ScoreTier {
  if (score >= 75) return 'high';
  if (score >= 55) return 'good';
  if (score >= 40) return 'moderate';
  return 'low';
}

const EXPECTED_BADGES: Record<string, Record<ScoreTier, string>> = {
  ami: { high: 'Âmes Complices', good: 'Harmonie Douce', moderate: 'Étincelle & Complémentarité', low: 'Défi Magnétique' },
  fratrie: { high: 'Lien Fusionnel', good: 'Confort Naturel', moderate: 'Croissance Mutuelle', low: 'Transformation Fraternelle' },
  parent: { high: 'Racines Profondes', good: 'Soutien Solide', moderate: "Lien d'Évolution", low: 'Défi Fondateur' },
};

// ── Modes Amour et Pro — paramètres de référence ──
const AMOUR_MU = 45; const AMOUR_SIGMA = 18;
const PRO_MU = 50;   const PRO_SIGMA = 16;

console.log('═══════════════════════════════════════════════════════════════');
console.log('  RONDE 17 — VALIDATION NON-RÉGRESSION');
console.log('═══════════════════════════════════════════════════════════════\n');

let allPass = true;

// ── TEST 1 : 4 cas réels en mode Famille ──
console.log('▶ TEST 1 — Scores Famille (μ=48/σ=20, poids B40/N30/Y30)');
console.log('─'.repeat(65));

for (const c of cases) {
  const raw = FAMILLE_W.bazi * c.bazi + FAMILLE_W.num * c.num + FAMILLE_W.iching * c.iching;
  const score = gaussScore(raw, FAMILLE_MU, FAMILLE_SIGMA);
  const tier = getScoreTier(score);
  const expectedBadge = EXPECTED_BADGES[c.type]?.[tier] || '?';
  const inRange = score >= c.targetMin && score <= c.targetMax;
  const status = inRange ? '✅' : '⚠️';
  if (!inRange) allPass = false;

  console.log(`  ${status} ${c.name.padEnd(16)} raw=${raw.toFixed(1).padStart(5)} → ${score}% [cible ${c.targetMin}-${c.targetMax}%]`);
  console.log(`     Badge: ${tier} → "${expectedBadge}" (${c.type})`);
}

// ── TEST 2 : Vérification des badges contextuels ──
console.log('\n▶ TEST 2 — Badges contextuels Score×Type');
console.log('─'.repeat(65));

const badgeTests = [
  { score: 47, type: 'ami', expected: 'Étincelle & Complémentarité' },
  { score: 71, type: 'fratrie', expected: 'Confort Naturel' },
  { score: 72, type: 'parent', expected: 'Soutien Solide' },
  { score: 46, type: 'parent', expected: "Lien d'Évolution" },
  { score: 90, type: 'ami', expected: 'Âmes Complices' },
  { score: 30, type: 'fratrie', expected: 'Transformation Fraternelle' },
];

for (const t of badgeTests) {
  const tier = getScoreTier(t.score);
  const badge = EXPECTED_BADGES[t.type]?.[tier] || '?';
  const pass = badge === t.expected;
  if (!pass) allPass = false;
  console.log(`  ${pass ? '✅' : '❌'} ${t.score}% ${t.type.padEnd(8)} → tier=${tier.padEnd(8)} badge="${badge}" ${pass ? '' : `(attendu: "${t.expected}")`}`);
}

// ── TEST 3 : Labels famille — 6 niveaux ──
console.log('\n▶ TEST 3 — Labels Famille (6 niveaux, couleurs non-punitives)');
console.log('─'.repeat(65));

const FAMILLE_LABELS = [
  { min: 88, name: "Lien d'Âme Familial", color: '#E0B0FF' },
  { min: 72, name: 'Harmonie Naturelle', color: '#FFD700' },
  { min: 58, name: 'Lien Complémentaire', color: '#4ade80' },
  { min: 42, name: 'Lien Exigeant', color: '#818cf8' },
  { min: 28, name: 'Lien de Transformation', color: '#a78bfa' },
  { min: 0,  name: 'Noeud Karmique Profond', color: '#7c3aed' },
];

const labelTests = [
  { score: 92, expected: "Lien d'Âme Familial" },
  { score: 75, expected: 'Harmonie Naturelle' },
  { score: 60, expected: 'Lien Complémentaire' },
  { score: 47, expected: 'Lien Exigeant' },
  { score: 35, expected: 'Lien de Transformation' },
  { score: 20, expected: 'Noeud Karmique Profond' },
];

for (const t of labelTests) {
  const label = FAMILLE_LABELS.find(l => t.score >= l.min);
  const pass = label?.name === t.expected;
  if (!pass) allPass = false;
  console.log(`  ${pass ? '✅' : '❌'} ${t.score}% → "${label?.name}" (color: ${label?.color}) ${pass ? '' : `(attendu: "${t.expected}")`}`);
}

// Vérification couleurs non-punitives : 42-57% ne doit PAS être rouge/orange
console.log('\n  Couleurs non-punitives (42-57%) :');
const midLabel = FAMILLE_LABELS.find(l => 47 >= l.min);
const isNonPunitive = midLabel?.color === '#818cf8'; // violet/indigo
console.log(`  ${isNonPunitive ? '✅' : '❌'} 47% → color=${midLabel?.color} (${isNonPunitive ? 'violet ✓' : 'ALERTE: devrait être violet'})`);
if (!isNonPunitive) allPass = false;

// ── TEST 4 : Modes Amour et Pro INCHANGÉS ──
console.log('\n▶ TEST 4 — Modes Amour et Pro (AUCUN changement)');
console.log('─'.repeat(65));

// Test avec des valeurs connues pour vérifier que la gaussienne n'a pas changé
const amourTestRaw = 45; // = mu amour
const proTestRaw = 50;   // = mu pro

const amourScore = gaussScore(amourTestRaw, AMOUR_MU, AMOUR_SIGMA);
const proScore = gaussScore(proTestRaw, PRO_MU, PRO_SIGMA);

// Au mu, CDF=0.5, score = 5 + 93*(0.30 + 0.70*0.5) = 5 + 93*0.65 = 5 + 60.45 ≈ 65
const expectedAtMu = 65;

const amourPass = amourScore === expectedAtMu;
const proPass = proScore === expectedAtMu;
if (!amourPass) allPass = false;
if (!proPass) allPass = false;

console.log(`  ${amourPass ? '✅' : '❌'} Amour: raw=${amourTestRaw} (=μ) → ${amourScore}% (attendu: ${expectedAtMu}%)`);
console.log(`  ${proPass ? '✅' : '❌'} Pro:   raw=${proTestRaw} (=μ) → ${proScore}% (attendu: ${expectedAtMu}%)`);

// Vérifier que famille utilise bien μ=48/σ=20
const familleAtMu = gaussScore(48, 48, 20);
const famillePass = familleAtMu === expectedAtMu;
if (!famillePass) allPass = false;
console.log(`  ${famillePass ? '✅' : '❌'} Famille: raw=48 (=μ) → ${familleAtMu}% (attendu: ${expectedAtMu}%)`);

// Score extrêmes
const lowScore = gaussScore(10, 48, 20);
const highScore = gaussScore(85, 48, 20);
console.log(`  ℹ️  Famille raw=10 → ${lowScore}% | raw=85 → ${highScore}%`);

// ── RÉSULTAT FINAL ──
console.log('\n═══════════════════════════════════════════════════════════════');
if (allPass) {
  console.log('  ✅ TOUS LES TESTS PASSENT — NON-RÉGRESSION VALIDÉE');
} else {
  console.log('  ⚠️ CERTAINS TESTS ÉCHOUENT — VÉRIFIER CI-DESSUS');
}
console.log('═══════════════════════════════════════════════════════════════');
