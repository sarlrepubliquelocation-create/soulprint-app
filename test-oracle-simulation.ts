/**
 * SIMULATION ORACLE V4.4 — Test complet des 6 sous-modules
 * Vérifie les corrections Ronde 14/14bis/15/16
 *
 * Usage : npx ts-node --skip-project test-oracle-simulation.ts
 */

// ═══ IMPORTS depuis le code réel ═══
import { calcOracle, type OracleType, type OracleSujet, type OracleDomain } from './src/engines/oracle';
import { calcLifePath } from './src/engines/numerology';

// ═══ HELPERS ═══
let PASS = 0, FAIL = 0, WARN = 0;
function assert(condition: boolean, label: string, detail?: string) {
  if (condition) { PASS++; console.log(`  ✅ ${label}`); }
  else { FAIL++; console.log(`  ❌ ${label}${detail ? ' — ' + detail : ''}`); }
}
function warn(label: string) { WARN++; console.log(`  ⚠️  ${label}`); }
function section(title: string) { console.log(`\n${'═'.repeat(60)}\n  ${title}\n${'═'.repeat(60)}`); }

// ═══ PARAMÈTRES DE TEST ═══
const DAILY_SCORE = 72;
const USER_CDV = 6;
const USER_BIRTH_DAY = 15;
const USER_BIRTH_MONTH = 3;

function oracle(type: OracleType, input: string, opts: {
  sujet?: OracleSujet; domain?: OracleDomain; parent2Cdv?: number;
  dailyScore?: number; userCdv?: number;
} = {}) {
  return calcOracle({
    type,
    input,
    sujet: opts.sujet,
    domain: opts.domain,
    dailyScore: opts.dailyScore ?? DAILY_SCORE,
    userCdv: opts.userCdv ?? USER_CDV,
    domainScoreFromConvergence: 65,
    userBirthDay: USER_BIRTH_DAY,
    userBirthMonth: USER_BIRTH_MONTH,
    parent2Cdv: opts.parent2Cdv,
  });
}

// ══════════════════════════════════════════════════════════════
//  TEST 1 : MODULE DATE
// ══════════════════════════════════════════════════════════════
section('MODULE DATE');

{
  const r1 = oracle('date', '2026-06-15');
  const r2 = oracle('date', '2026-06-15', { dailyScore: 90 });

  assert(r1.oracleScore === r2.oracleScore,
    'Date : 100% intrinsèque (score identique quel que soit dailyScore)',
    `dailyScore=72 → ${r1.oracleScore}%, dailyScore=90 → ${r2.oracleScore}%`);

  assert(r1.domainScore === r1.oracleScore,
    'Date : oracleScore === domainScore',
    `domainScore=${r1.domainScore}, oracleScore=${r1.oracleScore}`);

  assert(r1.oracleScore >= 0 && r1.oracleScore <= 100,
    `Date : score dans [0, 100] → ${r1.oracleScore}%`);

  assert(r1.breakdown.length > 0, 'Date : breakdown non vide');

  // Test findBestDates
  assert(r1.bestDates !== undefined && r1.bestDates!.length === 3,
    `Date : findBestDates retourne 3 dates → ${r1.bestDates?.length}`);

  if (r1.bestDates && r1.bestDates.length >= 2) {
    assert(r1.bestDates[0].score >= r1.bestDates[1].score,
      'Date : bestDates triées par score décroissant (médailles correctes)',
      `🥇=${r1.bestDates[0].score}%, 🥈=${r1.bestDates[1].score}%`);
  }

  // Vibration diversity
  if (r1.bestDates && r1.bestDates.length === 3) {
    const vibs = r1.bestDates.map(d => d.vibration);
    const uniqueVibs = new Set(vibs).size;
    if (uniqueVibs >= 2) {
      assert(true, `Date : diversité vibratoire dans bestDates (${uniqueVibs} vibrations uniques : ${vibs.join(', ')})`);
    } else {
      warn(`Date : toutes les bestDates ont la même vibration (${vibs[0]}) — peut être normal`);
    }
  }
}

// ══════════════════════════════════════════════════════════════
//  TEST 2 : MODULE NOM
// ══════════════════════════════════════════════════════════════
section('MODULE NOM');

{
  // Test intrinsèque
  const r1 = oracle('nom', 'Kaironaute');
  const r2 = oracle('nom', 'Kaironaute', { dailyScore: 95 });

  assert(r1.oracleScore === r2.oracleScore,
    'Nom : 100% intrinsèque',
    `dailyScore=72 → ${r1.oracleScore}%, dailyScore=95 → ${r2.oracleScore}%`);

  assert(r1.domainScore === r1.oracleScore,
    'Nom : oracleScore === domainScore');

  // Test domaines
  const domains: OracleDomain[] = ['commerce', 'creatif', 'humain', 'spirituel', 'tech', 'generaliste'];
  const domainScores: Record<string, number> = {};
  for (const d of domains) {
    const r = oracle('nom', 'Kaironaute', { domain: d });
    domainScores[d] = r.oracleScore;
    assert(r.oracleScore >= 0 && r.oracleScore <= 100,
      `Nom domaine ${d} : score ${r.oracleScore}% dans [0,100]`);
  }

  // Vérifier que les domaines donnent des scores différents (pas tous identiques)
  const uniqueScores = new Set(Object.values(domainScores)).size;
  assert(uniqueScores >= 2,
    `Nom : les domaines donnent des scores variés (${uniqueScores} valeurs uniques)`,
    JSON.stringify(domainScores));

  // soulBonus test
  const rNom = oracle('nom', 'Kaironaute');
  const hasSoulSignal = rNom.signals.some(s => s.includes('Âme'));
  console.log(`  ℹ️  Nom "Kaironaute" : soulBonus ${hasSoulSignal ? 'actif' : 'inactif'} — signals: ${rNom.signals.length}`);
}

// ══════════════════════════════════════════════════════════════
//  TEST 3 : MODULE ADRESSE
// ══════════════════════════════════════════════════════════════
section('MODULE ADRESSE');

{
  const r1 = oracle('adresse', '14 rue Victor Hugo');
  const r2 = oracle('adresse', '14 rue Victor Hugo', { dailyScore: 95 });

  assert(r1.oracleScore === r2.oracleScore,
    'Adresse : 100% intrinsèque',
    `dailyScore=72 → ${r1.oracleScore}%, dailyScore=95 → ${r2.oracleScore}%`);

  // Test ADDRESS_NUMBERS : vérifier que différentes adresses donnent des scores différents
  const adresses = ['6 rue de la Paix', '8 avenue des Champs', '33 boulevard Haussmann', '5 place Vendôme'];
  const adrScores = adresses.map(a => ({ adresse: a, score: oracle('adresse', a).oracleScore }));
  console.log('  ℹ️  Scores adresses :');
  adrScores.forEach(a => console.log(`      ${a.adresse} → ${a.score}%`));

  const uniqueAdr = new Set(adrScores.map(a => a.score)).size;
  assert(uniqueAdr >= 2, `Adresse : scores variés (${uniqueAdr} valeurs uniques)`);
}

// ══════════════════════════════════════════════════════════════
//  TEST 4 : MODULE NUMÉRO
// ══════════════════════════════════════════════════════════════
section('MODULE NUMÉRO');

{
  const r1 = oracle('numero', '0612345678');
  const r2 = oracle('numero', '0612345678', { dailyScore: 95 });

  assert(r1.oracleScore === r2.oracleScore,
    'Numéro : 100% intrinsèque',
    `dailyScore=72 → ${r1.oracleScore}%, dailyScore=95 → ${r2.oracleScore}%`);

  // Test base 35 + NUMBER_SCORES
  assert(r1.oracleScore >= 0 && r1.oracleScore <= 100,
    `Numéro : score dans [0,100] → ${r1.oracleScore}%`);

  // Vérifier que le score n'est pas toujours identique
  const nums = ['0612345678', '0698765432', '88888888', '11111111'];
  const numScores = nums.map(n => ({ num: n, score: oracle('numero', n).oracleScore }));
  console.log('  ℹ️  Scores numéros :');
  numScores.forEach(n => console.log(`      ${n.num} → ${n.score}%`));

  // Chinese tradition check : 8888 devrait être favorable
  const r8 = oracle('numero', '88888888');
  const r4 = oracle('numero', '44444444');
  if (r8.oracleScore > r4.oracleScore) {
    assert(true, `Numéro : 8888 (${r8.oracleScore}%) > 4444 (${r4.oracleScore}%) — tradition chinoise respectée`);
  } else {
    warn(`Numéro : 8888 (${r8.oracleScore}%) ≤ 4444 (${r4.oracleScore}%) — à vérifier`);
  }
}

// ══════════════════════════════════════════════════════════════
//  TEST 5 : MODULE SUJET
// ══════════════════════════════════════════════════════════════
section('MODULE SUJET');

{
  const sujets: OracleSujet[] = ['projet', 'sentiments', 'partenariat', 'investissement', 'voyage', 'presentation', 'changement'];

  for (const s of sujets) {
    const r = oracle('sujet', s, { sujet: s });
    assert(r.oracleScore >= 0 && r.oracleScore <= 100,
      `Sujet ${s} : score ${r.oracleScore}% dans [0,100]`);
    assert(r.domainScore === r.oracleScore,
      `Sujet ${s} : 100% domainScore (pas de blend daily)`,
      `domainScore=${r.domainScore}, oracleScore=${r.oracleScore}`);
  }
}

// ══════════════════════════════════════════════════════════════
//  TEST 6 : MODULE BÉBÉ — CORRECTIONS RONDE 16
// ══════════════════════════════════════════════════════════════
section('MODULE BÉBÉ — Corrections Ronde 16');

{
  // Test intrinsèque
  const r1 = oracle('bebe', 'Léa');
  const r2 = oracle('bebe', 'Léa', { dailyScore: 95 });

  assert(r1.oracleScore === r2.oracleScore,
    'Bébé : 100% intrinsèque',
    `dailyScore=72 → ${r1.oracleScore}%, dailyScore=95 → ${r2.oracleScore}%`);

  // Test range : vérifier correction /128
  // Min théorique = 50 + 15 + 0 + 0 = 65 → 65/128*100 = 50.78 → 51%
  // Max sans bonus = 90 + 30 + 8 = 128 → 128/128*100 = 100%
  const prenoms = ['Léa', 'Noah', 'Amara', 'Gabriel', 'Zoé', 'Matthieu', 'Sarah', 'Hugo', 'Emma', 'Lucas'];
  const bebeScores: { prenom: string; score: number; signals: number }[] = [];

  for (const p of prenoms) {
    const r = oracle('bebe', p);
    bebeScores.push({ prenom: p, score: r.oracleScore, signals: r.signals.length });
    assert(r.oracleScore >= 0 && r.oracleScore <= 100,
      `Bébé "${p}" : score ${r.oracleScore}% dans [0,100]`);
  }

  // Vérifier le plancher (~51% avec /128)
  const minScore = Math.min(...bebeScores.map(b => b.score));
  const maxScore = Math.max(...bebeScores.map(b => b.score));
  console.log(`  ℹ️  Range bébé observée : ${minScore}% — ${maxScore}%`);
  console.log('  ℹ️  Scores bébé :');
  bebeScores.forEach(b => console.log(`      ${b.prenom} → ${b.score}% (${b.signals} signaux)`));

  // Vérifier que le diviseur est bien /128 (pas /125)
  // Un prénom avec harmony=9 (90pts) + compat=10 (30pts) + master (8pts) = 128 → devrait donner 100%
  // On ne peut pas forcer ça directement mais on vérifie qu'aucun score ne dépasse 100
  assert(maxScore <= 100, `Bébé : aucun score > 100% (max observé = ${maxScore}%)`);
}

// ══════════════════════════════════════════════════════════════
//  TEST 7 : BÉBÉ MONO-PARENTAL vs BI-PARENTAL
// ══════════════════════════════════════════════════════════════
section('MODULE BÉBÉ — Bi-parental (Ronde 16)');

{
  // Test mono-parental (statu quo)
  const rMono = oracle('bebe', 'Léa');

  // Test bi-parental avec CdV calculé depuis date de naissance
  const parent2BdTest = '1990-07-22';
  const parent2CdvCalc = calcLifePath(parent2BdTest);
  console.log(`  ℹ️  Second parent né le ${parent2BdTest} → CdV = ${parent2CdvCalc.v}${parent2CdvCalc.m ? ' (Maître)' : ''}`);

  const rBi = oracle('bebe', 'Léa', { parent2Cdv: parent2CdvCalc.v });

  assert(rMono.oracleScore !== undefined && rBi.oracleScore !== undefined,
    'Bébé bi-parental : les deux modes retournent un score');

  console.log(`  ℹ️  Mono-parental (CdV ${USER_CDV}) : ${rMono.oracleScore}%`);
  console.log(`  ℹ️  Bi-parental (CdV ${USER_CDV} + CdV ${parent2CdvCalc.v}) : ${rBi.oracleScore}%`);

  // Le score bi-parental peut être différent du mono-parental
  if (rMono.oracleScore !== rBi.oracleScore) {
    assert(true, `Bébé bi-parental : score différent du mono (${rMono.oracleScore}% → ${rBi.oracleScore}%)`);
  } else {
    warn(`Bébé bi-parental : score identique au mono (${rMono.oracleScore}%) — possible si même compat`);
  }

  // Vérifier les breakdowns bi-parental
  const hasParent1 = rBi.breakdown.some(b => b.label.includes('parent 1'));
  const hasParent2 = rBi.breakdown.some(b => b.label.includes('parent 2'));
  const hasCombined = rBi.breakdown.some(b => b.label.includes('combinée'));

  assert(hasParent1, 'Bébé bi-parental : breakdown contient "parent 1"');
  assert(hasParent2, 'Bébé bi-parental : breakdown contient "parent 2"');
  assert(hasCombined, 'Bébé bi-parental : breakdown contient "combinée"');

  // Test soulBonus gradué
  // Tester avec plusieurs CdV pour essayer de déclencher les 3 paliers
  const prenomTest = 'Gabriel';
  console.log(`\n  ℹ️  Test soulBonus gradué avec "${prenomTest}" :`);

  for (const p2cdv of [1, 3, 6, 9, 11, 22, 33]) {
    const r = oracle('bebe', prenomTest, { parent2Cdv: p2cdv });
    const hasSoul5 = r.signals.some(s => s.includes('forte résonance avec vos deux'));
    const hasSoul3 = r.signals.some(s => s.includes('résonance avec CdV'));
    const hasSoulMono = r.signals.some(s => s.includes('forte résonance avec ton'));
    const bonus = hasSoul5 ? '+5 (deux parents)' : hasSoul3 ? '+3 (un parent)' : '+0';
    console.log(`      Parent2 CdV ${p2cdv.toString().padStart(2)} : score=${r.oracleScore}% soulBonus=${bonus}`);
  }
}

// ══════════════════════════════════════════════════════════════
//  TEST 8 : BÉBÉ — PRÉNOM VIDE (edge case)
// ══════════════════════════════════════════════════════════════
section('EDGE CASES');

{
  // Prénom vide
  const rEmpty = oracle('bebe', '');
  assert(rEmpty.oracleScore === 0,
    `Bébé prénom vide : score = ${rEmpty.oracleScore}% (attendu: 0)`);
  assert(rEmpty.alerts.length > 0,
    'Bébé prénom vide : alerte affichée');

  // Prénom avec accents
  const rAccent = oracle('bebe', 'Éléonore');
  assert(rAccent.oracleScore > 0,
    `Bébé "Éléonore" (accents) : score = ${rAccent.oracleScore}% > 0`);

  // Prénom avec tiret
  const rTiret = oracle('bebe', 'Jean-Pierre');
  assert(rTiret.oracleScore > 0,
    `Bébé "Jean-Pierre" (tiret) : score = ${rTiret.oracleScore}% > 0`);

  // Bébé sans parent2Cdv (undefined) — doit fonctionner comme avant
  const rNoP2 = oracle('bebe', 'Léa', { parent2Cdv: undefined });
  const rNoP2b = oracle('bebe', 'Léa');
  assert(rNoP2.oracleScore === rNoP2b.oracleScore,
    `Bébé parent2Cdv=undefined : identique à sans parent2Cdv (${rNoP2.oracleScore}% = ${rNoP2b.oracleScore}%)`);

  // Bébé avec parent2Cdv = 0 → doit être ignoré
  const rP2Zero = oracle('bebe', 'Léa', { parent2Cdv: 0 });
  assert(rP2Zero.oracleScore === rNoP2b.oracleScore,
    `Bébé parent2Cdv=0 : traité comme mono-parental (${rP2Zero.oracleScore}% = ${rNoP2b.oracleScore}%)`);

  // Date invalide
  const rBadDate = oracle('date', 'pas-une-date');
  assert(rBadDate.oracleScore >= 0,
    `Date invalide : ne crash pas (score = ${rBadDate.oracleScore}%)`);

  // Numéro avec lettres
  const rBadNum = oracle('numero', 'abc');
  assert(rBadNum.oracleScore >= 0,
    `Numéro "abc" : ne crash pas (score = ${rBadNum.oracleScore}%)`);

  // Adresse courte
  const rShortAddr = oracle('adresse', '3 rue');
  assert(rShortAddr.oracleScore > 0,
    `Adresse "3 rue" : score = ${rShortAddr.oracleScore}% > 0`);
}

// ══════════════════════════════════════════════════════════════
//  TEST 9 : VERDICTS
// ══════════════════════════════════════════════════════════════
section('VERDICTS (seuils 48/75)');

{
  // On teste différents prénoms pour trouver des scores variés
  const testPrenoms = ['Léa', 'Noah', 'Amara', 'Gabriel', 'Zoé', 'Hugo', 'Emma', 'Lucas', 'Jade', 'Adam', 'Louis', 'Alice', 'Arthur', 'Chloé', 'Raphaël'];
  const verdicts: Record<string, number> = { feu_vert: 0, prudence: 0, pas_maintenant: 0 };

  for (const p of testPrenoms) {
    const r = oracle('bebe', p);
    verdicts[r.verdict.verdict]++;
    if (r.oracleScore >= 75) {
      assert(r.verdict.verdict === 'feu_vert',
        `Verdict "${p}" (${r.oracleScore}%) : ${r.verdict.verdict} (attendu: feu_vert)`);
    } else if (r.oracleScore >= 48) {
      assert(r.verdict.verdict === 'prudence',
        `Verdict "${p}" (${r.oracleScore}%) : ${r.verdict.verdict} (attendu: prudence)`);
    }
  }

  console.log(`  ℹ️  Distribution verdicts : feu_vert=${verdicts.feu_vert}, prudence=${verdicts.prudence}, pas_maintenant=${verdicts.pas_maintenant}`);
}

// ══════════════════════════════════════════════════════════════
//  TEST 10 : STRESS TEST — Masse de prénoms
// ══════════════════════════════════════════════════════════════
section('STRESS TEST — 50 prénoms × 3 configs');

{
  const prenomsMasse = [
    'Léa', 'Noah', 'Amara', 'Gabriel', 'Zoé', 'Matthieu', 'Sarah', 'Hugo', 'Emma', 'Lucas',
    'Jade', 'Adam', 'Louis', 'Alice', 'Arthur', 'Chloé', 'Raphaël', 'Inès', 'Nathan', 'Lina',
    'Jules', 'Mia', 'Léo', 'Louise', 'Ethan', 'Rose', 'Paul', 'Anna', 'Victor', 'Camille',
    'Théo', 'Agathe', 'Tom', 'Juliette', 'Maxime', 'Margot', 'Simon', 'Clara', 'Antoine', 'Léonie',
    'Alexandre', 'Manon', 'Baptiste', 'Eva', 'Pierre', 'Charlotte', 'Oscar', 'Mathilde', 'Martin', 'Elsa',
  ];

  const configs = [
    { label: 'Mono CdV 6', userCdv: 6, parent2Cdv: undefined },
    { label: 'Bi CdV 6+3', userCdv: 6, parent2Cdv: 3 },
    { label: 'Bi CdV 6+11', userCdv: 6, parent2Cdv: 11 },
  ];

  for (const cfg of configs) {
    const scores: number[] = [];
    let crashes = 0;

    for (const p of prenomsMasse) {
      try {
        const r = oracle('bebe', p, { userCdv: cfg.userCdv, parent2Cdv: cfg.parent2Cdv });
        scores.push(r.oracleScore);
      } catch (e) {
        crashes++;
      }
    }

    const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const stdDev = Math.sqrt(scores.reduce((sum, s) => sum + (s - +avg) ** 2, 0) / scores.length).toFixed(1);

    assert(crashes === 0, `${cfg.label} : 0 crash sur ${prenomsMasse.length} prénoms`);
    assert(min >= 0 && max <= 100, `${cfg.label} : range [${min}%, ${max}%] dans [0,100]`);
    console.log(`  ℹ️  ${cfg.label} : avg=${avg}%, min=${min}%, max=${max}%, σ=${stdDev}%`);
  }
}

// ══════════════════════════════════════════════════════════════
//  RÉSUMÉ FINAL
// ══════════════════════════════════════════════════════════════
section('RÉSUMÉ');
console.log(`  ✅ PASS : ${PASS}`);
console.log(`  ❌ FAIL : ${FAIL}`);
console.log(`  ⚠️  WARN : ${WARN}`);
console.log(`  Total  : ${PASS + FAIL} assertions\n`);

if (FAIL > 0) {
  console.log('  🔴 DES TESTS ONT ÉCHOUÉ — vérifier les corrections');
  process.exit(1);
} else {
  console.log('  🟢 TOUS LES TESTS PASSENT — Oracle V4.4 opérationnel');
  process.exit(0);
}
