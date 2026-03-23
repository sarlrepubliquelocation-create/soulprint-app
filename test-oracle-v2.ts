/**
 * SIMULATION ORACLE V4.5 — Vérification des 4 modifications
 * 1. findBestDates formule corrigée + activé pour Sujet
 * 2. Comparateur bébé/nom (virgules)
 * 3. Breakdown Nom enrichi (descriptions nombres)
 * 4. Module Sujet enrichi (Année/Jour Perso + alignement)
 */
import { calcOracle, type OracleType, type OracleSujet, type OracleDomain } from './src/engines/oracle';

let PASS = 0, FAIL = 0;
function assert(ok: boolean, label: string, detail?: string) {
  if (ok) { PASS++; console.log(`  ✅ ${label}`); }
  else { FAIL++; console.log(`  ❌ ${label}${detail ? ' — ' + detail : ''}`); }
}
function section(t: string) { console.log(`\n${'═'.repeat(60)}\n  ${t}\n${'═'.repeat(60)}`); }

const DS = 72, CDV = 6, BD = 15, BM = 3;
function oracle(type: OracleType, input: string, opts: { sujet?: OracleSujet; domain?: OracleDomain; parent2Cdv?: number } = {}) {
  return calcOracle({ type, input, sujet: opts.sujet, domain: opts.domain, dailyScore: DS, userCdv: CDV, domainScoreFromConvergence: 65, userBirthDay: BD, userBirthMonth: BM, parent2Cdv: opts.parent2Cdv });
}

// ═══ TEST 1 : findBestDates corrigé ═══
section('MODIF 1 — findBestDates');
{
  // Sujet doit maintenant avoir des bestDates
  const rSujet = oracle('sujet', 'projet', { sujet: 'projet' });
  assert(rSujet.bestDates !== undefined && rSujet.bestDates.length === 3,
    `Sujet "projet" : bestDates = ${rSujet.bestDates?.length} dates (attendu: 3)`);

  // Nom n'a PAS de bestDates (100% intrinsèque, retiré par feedback utilisateur)
  const rNom = oracle('nom', 'Kaironaute');
  assert(!rNom.bestDates || rNom.bestDates.length === 0,
    `Nom "Kaironaute" : pas de bestDates (intrinsèque) → ${rNom.bestDates?.length ?? 0}`);

  // Bébé n'a PAS de bestDates (intrinsèque pur)
  const rBebe = oracle('bebe', 'Léa');
  assert(!rBebe.bestDates || rBebe.bestDates.length === 0,
    `Bébé "Léa" : pas de bestDates (intrinsèque) → ${rBebe.bestDates?.length ?? 0}`);

  // Adresse non plus
  const rAddr = oracle('adresse', '14 rue Hugo');
  assert(!rAddr.bestDates || rAddr.bestDates.length === 0,
    `Adresse : pas de bestDates → ${rAddr.bestDates?.length ?? 0}`);

  // bestDates triées par score décroissant
  if (rSujet.bestDates && rSujet.bestDates.length >= 2) {
    assert(rSujet.bestDates[0].estimatedScore >= rSujet.bestDates[1].estimatedScore,
      `Sujet bestDates triées : 🥇${rSujet.bestDates[0].estimatedScore}% ≥ 🥈${rSujet.bestDates[1].estimatedScore}%`);
  }

  // Le score bestDates est maintenant le dailyScore pur — vérifié sur Sujet
  if (rSujet.bestDates && rSujet.bestDates.length > 0) {
    const bd = rSujet.bestDates[0];
    console.log(`  ℹ️  Meilleure date Sujet : ${bd.label} → ${bd.estimatedScore}% (daily pur, pas blend)`);
    assert(bd.estimatedScore >= 0 && bd.estimatedScore <= 100,
      `bestDates score dans [0,100] → ${bd.estimatedScore}%`);
  }
}

// ═══ TEST 2 : Comparateur ═══
section('MODIF 2 — Comparateur bébé/nom');
{
  // Le comparateur est côté UI (OracleTab.tsx), mais on peut vérifier que
  // les calculs individuels fonctionnent pour chaque prénom
  const prenoms = ['Léa', 'Noah', 'Amara', 'Gabriel', 'Zoé'];
  const results = prenoms.map(p => ({ name: p, score: oracle('bebe', p).oracleScore }));
  results.sort((a, b) => b.score - a.score);

  console.log('  ℹ️  Comparaison bébé (simulée) :');
  results.forEach((r, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
    console.log(`      ${medal} ${r.name} → ${r.score}%`);
  });

  // Tous les scores sont différents (variété)
  const uniqueScores = new Set(results.map(r => r.score)).size;
  assert(uniqueScores >= 3,
    `Comparateur : ${uniqueScores} scores uniques sur ${prenoms.length} prénoms`);

  // Même chose pour noms
  const noms = ['Kaironaute', 'ZenHote', 'SoulPath', 'Lumia', 'Nexus'];
  const nomResults = noms.map(n => ({ name: n, score: oracle('nom', n, { domain: 'tech' }).oracleScore }));
  nomResults.sort((a, b) => b.score - a.score);
  console.log('  ℹ️  Comparaison noms (tech) :');
  nomResults.forEach((r, i) => console.log(`      ${i === 0 ? '🥇' : i === 1 ? '🥈' : '  '} ${r.name} → ${r.score}%`));
}

// ═══ TEST 3 : Breakdown Nom enrichi ═══
section('MODIF 3 — Breakdown Nom enrichi');
{
  const r = oracle('nom', 'Kaironaute', { domain: 'spirituel' });

  // Vérifier que les descriptions sont présentes
  const hasExprDesc = r.breakdown.some(b => b.label.startsWith('Expression :'));
  const hasAmeDesc = r.breakdown.some(b => b.label.startsWith('Âme :'));
  const hasImageDesc = r.breakdown.some(b => b.label.startsWith('Image :'));

  assert(hasExprDesc, 'Nom breakdown : Expression avec description');
  assert(hasAmeDesc, 'Nom breakdown : Âme avec description');
  assert(hasImageDesc, 'Nom breakdown : Image avec description');

  // Les descriptions ne sont pas vides
  const ameEntry = r.breakdown.find(b => b.label.startsWith('Âme :'));
  const imageEntry = r.breakdown.find(b => b.label.startsWith('Image :'));
  if (ameEntry) assert(ameEntry.value.length > 5, `Âme description : "${ameEntry.value}"`);
  if (imageEntry) assert(imageEntry.value.length > 5, `Image description : "${imageEntry.value}"`);

  console.log('  ℹ️  Breakdown enrichi :');
  r.breakdown.forEach(b => console.log(`      ${b.label} → ${b.value} (${b.pts > 0 ? '+' + b.pts : '—'})`));
}

// ═══ TEST 4 : Module Sujet enrichi ═══
section('MODIF 4 — Module Sujet enrichi');
{
  const sujets: OracleSujet[] = ['projet', 'sentiments', 'partenariat', 'investissement', 'voyage', 'presentation', 'changement'];

  for (const s of sujets) {
    const r = oracle('sujet', s, { sujet: s });
    assert(r.oracleScore >= 0 && r.oracleScore <= 100,
      `Sujet ${s} : score ${r.oracleScore}%`);

    // Vérifier que le breakdown a plus qu'1 entrée maintenant
    assert(r.breakdown.length >= 2,
      `Sujet ${s} : breakdown enrichi (${r.breakdown.length} entrées, avant: 1)`);
  }

  // Vérifier la présence de l'Année Personnelle
  const rProjet = oracle('sujet', 'projet', { sujet: 'projet' });
  const hasAP = rProjet.breakdown.some(b => b.label.includes('Année personnelle'));
  const hasJP = rProjet.breakdown.some(b => b.label.includes('Jour personnel'));
  assert(hasAP, 'Sujet : breakdown contient Année Personnelle');
  assert(hasJP, 'Sujet : breakdown contient Jour Personnel');

  // Vérifier signal d'alignement AP × Sujet
  console.log(`  ℹ️  Sujet "projet" signals : ${rProjet.signals.length}`);
  rProjet.signals.forEach(s => console.log(`      ✦ ${s}`));
  rProjet.breakdown.forEach(b => console.log(`      → ${b.label} : ${b.value} (${b.pts > 0 ? '+' + b.pts : '—'})`));
}

// ═══ TEST 5 : Non-régression tous modules ═══
section('NON-RÉGRESSION — 6 modules');
{
  // Date
  const rDate = oracle('date', '2026-06-15');
  assert(rDate.oracleScore >= 0 && rDate.oracleScore <= 100, `Date : ${rDate.oracleScore}%`);

  // Nom
  const rNom = oracle('nom', 'Kaironaute');
  assert(rNom.oracleScore >= 0 && rNom.oracleScore <= 100, `Nom : ${rNom.oracleScore}%`);

  // Adresse
  const rAddr = oracle('adresse', '14 rue Victor Hugo');
  assert(rAddr.oracleScore >= 0 && rAddr.oracleScore <= 100, `Adresse : ${rAddr.oracleScore}%`);

  // Numéro
  const rNum = oracle('numero', '0612345678');
  assert(rNum.oracleScore >= 0 && rNum.oracleScore <= 100, `Numéro : ${rNum.oracleScore}%`);

  // Sujet
  const rSuj = oracle('sujet', 'projet', { sujet: 'projet' });
  assert(rSuj.oracleScore >= 0 && rSuj.oracleScore <= 100, `Sujet : ${rSuj.oracleScore}%`);

  // Bébé mono
  const rBebe = oracle('bebe', 'Léa');
  assert(rBebe.oracleScore >= 0 && rBebe.oracleScore <= 100, `Bébé mono : ${rBebe.oracleScore}%`);

  // Bébé bi-parental
  const rBebeBi = oracle('bebe', 'Léa', { parent2Cdv: 3 });
  assert(rBebeBi.oracleScore >= 0 && rBebeBi.oracleScore <= 100, `Bébé bi : ${rBebeBi.oracleScore}%`);

  // Bébé vide
  const rEmpty = oracle('bebe', '');
  assert(rEmpty.oracleScore === 0, `Bébé vide : ${rEmpty.oracleScore}% (attendu: 0)`);

  // Intrinsèque : bébé ne change pas avec dailyScore
  const rBebe2 = calcOracle({ type: 'bebe', input: 'Léa', dailyScore: 95, userCdv: 6, domainScoreFromConvergence: 65, userBirthDay: 15, userBirthMonth: 3 });
  assert(rBebe.oracleScore === rBebe2.oracleScore, `Bébé intrinsèque : ${rBebe.oracleScore}% = ${rBebe2.oracleScore}%`);
}

// ═══ RÉSUMÉ ═══
section('RÉSUMÉ');
console.log(`  ✅ PASS : ${PASS}`);
console.log(`  ❌ FAIL : ${FAIL}`);
console.log(`  Total  : ${PASS + FAIL}\n`);
if (FAIL > 0) { console.log('  🔴 ÉCHECS DÉTECTÉS'); process.exit(1); }
else { console.log('  🟢 TOUT PASSE — Oracle V4.5 opérationnel'); process.exit(0); }
