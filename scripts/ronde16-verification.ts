/**
 * RONDE 16 — Vérification mathématique des 3 propositions
 * + Simulation batch de la meilleure proposition
 */

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

// Cas réels
const PERE  = { bazi: 12, num: 73, iching: 14 };
const CARMEN = { bazi: 54, num: 70, iching: 36 };
const STEVE  = { bazi: 12, num: 55, iching: 36 };
const LAURENT = { bazi: 54, num: 65, iching: 36 };

console.log('═══════════════════════════════════════════════════════════════');
console.log('  VÉRIFICATION MATHÉMATIQUE DES 3 PROPOSITIONS RONDE 16');
console.log('═══════════════════════════════════════════════════════════════\n');

// ═══ GROK : B20/N42/Y38, bonus+5, μ=48, σ=20, offset=0.30 ═══
console.log('▶ GROK (B20/N42/Y38 ami, bonus+5, μ=48/σ=20)');
const grokAmi = { b: 0.20, n: 0.42, y: 0.38, bonus: 5 };
const grokParent = { b: 0.45, n: 0.30, y: 0.25, bonus: 0 };
const grokFratrie = { b: 0.35, n: 0.35, y: 0.30, bonus: -2 };

let raw: number, score: number;

raw = grokParent.b * PERE.bazi + grokParent.n * PERE.num + grokParent.y * PERE.iching + grokParent.bonus;
score = gaussScore(raw, 48, 20);
console.log(`  Père  : raw=${raw.toFixed(2)} → score=${score}% (Grok annonce 46%)`);

raw = grokParent.b * CARMEN.bazi + grokParent.n * CARMEN.num + grokParent.y * CARMEN.iching + grokParent.bonus;
score = gaussScore(raw, 48, 20);
console.log(`  Carmen: raw=${raw.toFixed(2)} → score=${score}% (Grok annonce 72%)`);

raw = grokAmi.b * STEVE.bazi + grokAmi.n * STEVE.num + grokAmi.y * STEVE.iching + grokAmi.bonus;
score = gaussScore(raw, 48, 20);
console.log(`  Steve : raw=${raw.toFixed(2)} → score=${score}% (Grok annonce 74%) ← VÉRIF`);

raw = grokFratrie.b * LAURENT.bazi + grokFratrie.n * LAURENT.num + grokFratrie.y * LAURENT.iching + grokFratrie.bonus;
score = gaussScore(raw, 48, 20);
console.log(`  Laurent: raw=${raw.toFixed(2)} → score=${score}% (Grok annonce 62%) ← VÉRIF`);

// ═══ GPT : bonus conditionnel résilience, μ par type ═══
console.log('\n▶ GPT (bonus résilience conditionnel, μ par type)');
const gptParent = { b: 0.38, n: 0.32, y: 0.30, bonus: 0, mu: 49 };
const gptFratrie = { b: 0.25, n: 0.30, y: 0.45, bonus: -2, mu: 50 };
const gptAmi = { b: 0.15, n: 0.45, y: 0.40, mu: 50 };
const gptColoc = { b: 0.20, n: 0.40, y: 0.40, bonus: 4, mu: 49 };

raw = gptParent.b * PERE.bazi + gptParent.n * PERE.num + gptParent.y * PERE.iching + gptParent.bonus;
score = gaussScore(raw, gptParent.mu, 20);
console.log(`  Père  : raw=${raw.toFixed(2)} → score=${score}% (GPT annonce 46%)`);

raw = gptParent.b * CARMEN.bazi + gptParent.n * CARMEN.num + gptParent.y * CARMEN.iching + gptParent.bonus;
score = gaussScore(raw, gptParent.mu, 20);
console.log(`  Carmen: raw=${raw.toFixed(2)} → score=${score}% (GPT annonce 72%)`);

// Steve avec bonus résilience conditionnel
raw = gptAmi.b * STEVE.bazi + gptAmi.n * STEVE.num + gptAmi.y * STEVE.iching;
const steveQualifies = STEVE.bazi < 20 && STEVE.num >= 55 && STEVE.iching >= 35;
const bonusResilience = steveQualifies ? 15 : 0;
console.log(`  Steve : raw_base=${raw.toFixed(2)}, qualifie résilience=${steveQualifies} → bonus=${bonusResilience}`);
raw += bonusResilience;
score = gaussScore(raw, gptAmi.mu, 20);
console.log(`          raw'=${raw.toFixed(2)} → score=${score}% (GPT annonce 73%)`);

raw = gptFratrie.b * LAURENT.bazi + gptFratrie.n * LAURENT.num + gptFratrie.y * LAURENT.iching + gptFratrie.bonus;
score = gaussScore(raw, gptFratrie.mu, 20);
console.log(`  Laurent: raw=${raw.toFixed(2)} → score=${score}% (GPT annonce 63%)`);

// Steve en coloc (GPT)
raw = gptColoc.b * STEVE.bazi + gptColoc.n * STEVE.num + gptColoc.y * STEVE.iching + gptColoc.bonus;
score = gaussScore(raw, gptColoc.mu, 20);
console.log(`  Steve coloc: raw=${raw.toFixed(2)} → score=${score}% (GPT annonce 58%) → écart ami/coloc`);

// ═══ GEMINI : offset 0.15, bouclier anti-clash +12 si BaZi≤30 ═══
console.log('\n▶ GEMINI (offset=0.15, bouclier anti-clash +12 si BaZi≤30, μ=48/σ=20)');
const gemAmi = { b: 0.15, n: 0.45, y: 0.40 };
const gemParent = { b: 0.40, n: 0.30, y: 0.30 };
const gemFratrie = { b: 0.30, n: 0.30, y: 0.40 };
const gemColoc = { b: 0.35, n: 0.30, y: 0.35 };

raw = gemParent.b * PERE.bazi + gemParent.n * PERE.num + gemParent.y * PERE.iching;
score = gaussScore(raw, 48, 20, 0.15);
console.log(`  Père  : raw=${raw.toFixed(2)} → score=${score}% (Gemini annonce 34.4%) ← ATTENTION: cible ~46%`);

raw = gemParent.b * CARMEN.bazi + gemParent.n * CARMEN.num + gemParent.y * CARMEN.iching;
score = gaussScore(raw, 48, 20, 0.15);
console.log(`  Carmen: raw=${raw.toFixed(2)} → score=${score}% (Gemini annonce 73.5%)`);

raw = gemAmi.b * STEVE.bazi + gemAmi.n * STEVE.num + gemAmi.y * STEVE.iching;
const steveBouclier = STEVE.bazi <= 30 ? 12 : 0;
console.log(`  Steve : raw_base=${raw.toFixed(2)}, bouclier=${steveBouclier}`);
raw += steveBouclier;
score = gaussScore(raw, 48, 20, 0.15);
console.log(`          raw'=${raw.toFixed(2)} → score=${score}% (Gemini annonce 72.6%) ← VÉRIF`);

raw = gemFratrie.b * LAURENT.bazi + gemFratrie.n * LAURENT.num + gemFratrie.y * LAURENT.iching;
score = gaussScore(raw, 48, 20, 0.15);
console.log(`  Laurent: raw=${raw.toFixed(2)} → score=${score}% (Gemini annonce 66.6%)`);

// Steve en coloc (Gemini) — PAS de bouclier en coloc
raw = gemColoc.b * STEVE.bazi + gemColoc.n * STEVE.num + gemColoc.y * STEVE.iching;
score = gaussScore(raw, 48, 20, 0.15);
console.log(`  Steve coloc: raw=${raw.toFixed(2)} → score=${score}% → écart ami/coloc`);

// ═══ SIMULATION BATCH : GPT (meilleure math) ═══
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  SIMULATION BATCH — PROPOSITION GPT (500 paires/type)');
console.log('═══════════════════════════════════════════════════════════════\n');

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randomBazi(): number {
  const r = Math.random();
  if (r < 0.20) return randomBetween(5, 20);
  if (r < 0.50) return randomBetween(35, 55);
  return randomBetween(50, 80);
}

function randomNum(): number { return randomBetween(25, 85); }
function randomIching(): number { return randomBetween(10, 75); }

interface TypeConfig {
  b: number; n: number; y: number; bonus: number; mu: number;
  conditionalBonus?: (bazi: number, num: number, yi: number) => number;
}

const GPT_CONFIG: Record<string, TypeConfig> = {
  parent: { b: 0.38, n: 0.32, y: 0.30, bonus: 0, mu: 49 },
  fratrie: { b: 0.25, n: 0.30, y: 0.45, bonus: -2, mu: 50 },
  gp: { b: 0.30, n: 0.30, y: 0.40, bonus: 2, mu: 49 },
  coloc: { b: 0.20, n: 0.40, y: 0.40, bonus: 4, mu: 49 },
  ami: {
    b: 0.15, n: 0.45, y: 0.40, bonus: 0, mu: 50,
    conditionalBonus: (bazi, num, yi) => (bazi < 20 && num >= 55 && yi >= 35) ? 15 : 0
  },
};

const N = 500;

for (const [type, cfg] of Object.entries(GPT_CONFIG)) {
  const scores: number[] = [];

  for (let i = 0; i < N; i++) {
    const bazi = randomBazi();
    const num = randomNum();
    const yi = randomIching();
    let raw = cfg.b * bazi + cfg.n * num + cfg.y * yi + cfg.bonus;
    if (cfg.conditionalBonus) raw += cfg.conditionalBonus(bazi, num, yi);
    scores.push(gaussScore(raw, cfg.mu, 20));
  }

  scores.sort((a, b) => a - b);
  const avg = (scores.reduce((a, b) => a + b, 0) / N).toFixed(1);
  const gt80 = scores.filter(s => s >= 80).length;
  const gt70 = scores.filter(s => s >= 70).length;
  const gt50 = scores.filter(s => s >= 50).length;
  const lt30 = scores.filter(s => s < 30).length;
  const p10 = scores[Math.floor(N * 0.10)];
  const p50 = scores[Math.floor(N * 0.50)];
  const p90 = scores[Math.floor(N * 0.90)];

  const pctGt70 = (gt70 / N * 100).toFixed(1);
  const pctLt30 = (lt30 / N * 100).toFixed(1);
  const warn70 = parseFloat(pctGt70) > 35 ? ' ⚠️ >35%' : ' ✅';
  const warn30 = parseFloat(pctLt30) < 3 ? ' ⚠️ <3%' : ' ✅';

  console.log(`TYPE: ${type.toUpperCase()}`);
  console.log(`  Moy=${avg}% | P10=${p10}% | P50=${p50}% | P90=${p90}%`);
  console.log(`  >80%: ${gt80}/${N} (${(gt80/N*100).toFixed(1)}%) | >70%: ${gt70}/${N} (${pctGt70}%)${warn70} | >50%: ${gt50}/${N} | <30%: ${lt30}/${N} (${pctLt30}%)${warn30}`);

  // Combien de paires ami qualifient pour le bonus résilience?
  if (type === 'ami') {
    let qualCount = 0;
    for (let i = 0; i < N; i++) {
      const bazi = randomBazi();
      const num = randomNum();
      const yi = randomIching();
      if (bazi < 20 && num >= 55 && yi >= 35) qualCount++;
    }
    console.log(`  Bonus résilience activé pour ~${(qualCount/N*100).toFixed(1)}% des paires ami`);
  }
  console.log('');
}

// Test de cohérence Steve en tous types (GPT)
console.log('COHÉRENCE — Steve dans chaque type (GPT) :');
for (const [type, cfg] of Object.entries(GPT_CONFIG)) {
  let raw = cfg.b * STEVE.bazi + cfg.n * STEVE.num + cfg.y * STEVE.iching + cfg.bonus;
  if (cfg.conditionalBonus) raw += cfg.conditionalBonus(STEVE.bazi, STEVE.num, STEVE.iching);
  const score = gaussScore(raw, cfg.mu, 20);
  console.log(`  ${type.padEnd(8)} : raw=${raw.toFixed(1).padStart(5)} → ${score}%`);
}

console.log('\nCOHÉRENCE — Laurent dans chaque type (GPT) :');
for (const [type, cfg] of Object.entries(GPT_CONFIG)) {
  let raw = cfg.b * LAURENT.bazi + cfg.n * LAURENT.num + cfg.y * LAURENT.iching + cfg.bonus;
  if (cfg.conditionalBonus) raw += cfg.conditionalBonus(LAURENT.bazi, LAURENT.num, LAURENT.iching);
  const score = gaussScore(raw, cfg.mu, 20);
  console.log(`  ${type.padEnd(8)} : raw=${raw.toFixed(1).padStart(5)} → ${score}%`);
}

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  FIN DE VÉRIFICATION');
console.log('═══════════════════════════════════════════════════════════════');
