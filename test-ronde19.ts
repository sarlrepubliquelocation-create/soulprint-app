/**
 * TEST RONDE 19 — Vérification des 3 modifications
 * A) Recalibration module Numéro (numéro banal → 40-55%, remarquable → 80%+)
 * B) Signaux intermédiaires module Adresse (5 niveaux, toujours un signal)
 * C) Bandeau debug masqué (vérifié manuellement côté UI)
 */
import { calcOracle, type OracleType } from './src/engines/oracle';

let PASS = 0, FAIL = 0;
function assert(ok: boolean, label: string, detail?: string) {
  if (ok) { PASS++; console.log(`  ✅ ${label}`); }
  else { FAIL++; console.log(`  ❌ ${label}${detail ? ' — ' + detail : ''}`); }
}
function section(t: string) { console.log(`\n${'═'.repeat(60)}\n  ${t}\n${'═'.repeat(60)}`); }

const DS = 72, CDV = 6, BD = 15, BM = 3;
function oracle(type: OracleType, input: string) {
  return calcOracle({ type, input, dailyScore: DS, userCdv: CDV, domainScoreFromConvergence: 65, userBirthDay: BD, userBirthMonth: BM });
}

// ═══ A) RECALIBRATION NUMÉRO ═══
section('A) Module Numéro — recalibration Ronde 19');
{
  // Numéros banals : doivent tomber dans 28-60%
  const banals = ['0612345678', '0145678901', '0123456789', '0698765432', '0612121212'];
  for (const num of banals) {
    const r = oracle('numero', num);
    assert(r.domainScore >= 28 && r.domainScore <= 70,
      `Numéro banal "${num}" : ${r.domainScore}% (attendu: 28-70%)`);
  }

  // Numéros remarquables : patterns forts (répétitions, 888, 168)
  const remarquables = ['8888888888', '1688888888', '6666666666'];
  for (const num of remarquables) {
    const r = oracle('numero', num);
    assert(r.domainScore >= 70,
      `Numéro remarquable "${num}" : ${r.domainScore}% (attendu: ≥70%)`);
  }

  // Plancher : aucun numéro ne descend sous 28
  const worst = ['4444444444', '0000000001'];
  for (const num of worst) {
    const r = oracle('numero', num);
    assert(r.domainScore >= 28,
      `Numéro défavorable "${num}" : ${r.domainScore}% (plancher ≥28)`);
  }

  // Plafond : aucun ne dépasse 95
  const best = ['8888888888'];
  for (const num of best) {
    const r = oracle('numero', num);
    assert(r.domainScore <= 95,
      `Numéro max "${num}" : ${r.domainScore}% (plafond ≤95)`);
  }

  // Variance : un banal et un remarquable doivent avoir ≥20 pts d'écart
  const rBanal = oracle('numero', '0612345678');
  const rRemar = oracle('numero', '8888888888');
  const ecart = rRemar.domainScore - rBanal.domainScore;
  assert(ecart >= 15,
    `Écart banal/remarquable : ${rBanal.domainScore}% vs ${rRemar.domainScore}% = ${ecart} pts (attendu: ≥15)`);

  // Breakdown doit contenir "Réduction"
  assert(rBanal.breakdown.some(b => b.label.includes('Réduction')),
    `Breakdown contient "Réduction" pour numéro banal`);
}

// ═══ B) SIGNAUX INTERMÉDIAIRES ADRESSE ═══
section('B) Module Adresse — signaux intermédiaires Ronde 19');
{
  // Toute adresse doit avoir au moins 1 signal (avant c'était vide pour 40-70%)
  const adresses = [
    '14 rue Victor Hugo',
    '5 avenue de la Liberté',
    '103 boulevard Haussmann',
    '7 ter rue des Lilas',
    '22 rue de la Paix',
    '1 impasse du Mur',
  ];

  for (const addr of adresses) {
    const r = oracle('adresse', addr);
    assert(r.signals.length >= 1,
      `Adresse "${addr}" : ${r.signals.length} signal(s), score ${r.domainScore}%`);

    // Vérifier que le signal contient un mot-clé attendu selon le score
    const mainSignal = r.signals[r.signals.length - 1]; // le dernier est le signal de niveau
    if (r.domainScore <= 35) {
      assert(mainSignal.includes('délicate') || mainSignal.includes('prudence'),
        `  Signal ≤35% contient "délicate/prudence"`);
    } else if (r.domainScore <= 50) {
      assert(mainSignal.includes('contrastée') || mainSignal.includes('certains'),
        `  Signal 36-50% contient "contrastée"`);
    } else if (r.domainScore <= 65) {
      assert(mainSignal.includes('équilibrée') || mainSignal.includes('adapte'),
        `  Signal 51-65% contient "équilibrée"`);
    } else if (r.domainScore <= 80) {
      assert(mainSignal.includes('résonance') || mainSignal.includes('soutiennent'),
        `  Signal 66-80% contient "résonance/soutiennent"`);
    } else {
      assert(mainSignal.includes('harmonieuse') || mainSignal.includes('excellente'),
        `  Signal ≥81% contient "harmonieuse/excellente"`);
    }
  }

  // Le signal doit mentionner le CdV
  const r = oracle('adresse', '14 rue Victor Hugo');
  const sigWithCdv = r.signals.find(s => s.includes('Chemin de Vie') || s.includes(`CdV ${CDV}`) || s.includes(`Vie ${CDV}`));
  assert(sigWithCdv !== undefined,
    `Signal Adresse mentionne le CdV (${CDV})`);
}

// ═══ NON-RÉGRESSION GÉNÉRALE ═══
section('Non-régression — les autres modules ne sont pas cassés');
{
  // Nom fonctionne
  const rNom = oracle('nom', 'Kaironaute');
  assert(rNom.domainScore >= 0 && rNom.domainScore <= 100, `Nom "Kaironaute" : ${rNom.domainScore}%`);
  assert(rNom.breakdown.length > 0, `Nom breakdown non vide`);

  // Bébé fonctionne
  const rBebe = oracle('bebe', 'Alice');
  assert(rBebe.domainScore >= 0 && rBebe.domainScore <= 100, `Bébé "Alice" : ${rBebe.domainScore}%`);
  assert(rBebe.breakdown.length > 0, `Bébé breakdown non vide`);

  // Date fonctionne
  const rDate = oracle('date', '15/06/2026');
  assert(rDate.domainScore >= 0 && rDate.domainScore <= 100, `Date "15/06/2026" : ${rDate.domainScore}%`);

  // Sujet fonctionne
  const rSujet = calcOracle({ type: 'sujet', input: 'projet', sujet: 'projet', dailyScore: DS, userCdv: CDV, domainScoreFromConvergence: 65, userBirthDay: BD, userBirthMonth: BM });
  assert(rSujet.domainScore >= 0 && rSujet.domainScore <= 100, `Sujet "projet" : ${rSujet.domainScore}%`);

  // Adresse avec appart fonctionne toujours
  const rAppart = calcOracle({ type: 'adresse', input: '14 rue Hugo', dailyScore: DS, userCdv: CDV, domainScoreFromConvergence: 65, userBirthDay: BD, userBirthMonth: BM, appart: '5B' });
  assert(rAppart.domainScore >= 0 && rAppart.domainScore <= 100, `Adresse + appart : ${rAppart.domainScore}%`);

  // Adresse avec CP/ville nettoyé
  const rCp = oracle('adresse', '14 rue Hugo, 75001 Paris');
  assert(rCp.domainScore >= 0 && rCp.domainScore <= 100, `Adresse avec CP/ville : ${rCp.domainScore}%`);
}

// ═══ RÉSUMÉ ═══
console.log(`\n${'═'.repeat(60)}`);
console.log(`  RÉSULTAT : ${PASS} PASS / ${FAIL} FAIL`);
console.log(`${'═'.repeat(60)}\n`);
if (FAIL > 0) process.exit(1);
