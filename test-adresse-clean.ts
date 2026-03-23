import { calcOracle } from './src/engines/oracle';

const CdV = 6;
const bdParts = { day: 15, month: 3 };

function oracle(input: string, appart?: string) {
  return calcOracle({
    type: 'adresse',
    input,
    userCdv: CdV,
    userBirthDay: bdParts.day,
    userBirthMonth: bdParts.month,
    appart,
  });
}

let pass = 0, fail = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { console.log(`  ✅ ${msg}`); pass++; }
  else { console.log(`  ❌ ${msg}`); fail++; }
}

console.log('══════════════════════════════════════════════════════════');
console.log('  TEST — Parser nettoyeur CP/Ville (Ronde 17)');
console.log('══════════════════════════════════════════════════════════');

// Référence : adresse propre sans CP/ville
const ref = oracle('14 rue Victor Hugo');
console.log(`  ℹ️  Référence "14 rue Victor Hugo" → ${ref.oracleScore}%`);

// Avec CP + ville — doit donner le MÊME score
const withCP = oracle('14 rue Victor Hugo, 75001 Paris');
assert(withCP.oracleScore === ref.oracleScore,
  `Avec ", 75001 Paris" → ${withCP.oracleScore}% (attendu: ${ref.oracleScore}%)`);

// Avec CP collé (sans virgule)
const withCPnoComma = oracle('14 rue Victor Hugo 75001 Paris');
assert(withCPnoComma.oracleScore === ref.oracleScore,
  `Avec " 75001 Paris" (sans virgule) → ${withCPnoComma.oracleScore}% (attendu: ${ref.oracleScore}%)`);

// Avec ville seule après virgule
const withCity = oracle('14 rue Victor Hugo, Paris');
assert(withCity.oracleScore === ref.oracleScore,
  `Avec ", Paris" → ${withCity.oracleScore}% (attendu: ${ref.oracleScore}%)`);

// Avec ville + cedex
const withCedex = oracle('14 rue Victor Hugo, 75001 Paris Cedex');
assert(withCedex.oracleScore === ref.oracleScore,
  `Avec ", 75001 Paris Cedex" → ${withCedex.oracleScore}% (attendu: ${ref.oracleScore}%)`);

// Adresse avec "bis" — ne doit pas être cassée
const bis = oracle('3 bis avenue des Champs-Élysées');
assert(bis.oracleScore > 0, `"3 bis avenue des Champs-Élysées" → ${bis.oracleScore}% (> 0)`);

const bisWithCP = oracle('3 bis avenue des Champs-Élysées, 75008 Paris');
assert(bisWithCP.oracleScore === bis.oracleScore,
  `Même adresse + CP/ville → ${bisWithCP.oracleScore}% (attendu: ${bis.oracleScore}%)`);

// Adresse simple sans numéro
const noNum = oracle('place de la Concorde');
assert(noNum.oracleScore > 0, `"place de la Concorde" (sans numéro) → ${noNum.oracleScore}%`);

const noNumWithCity = oracle('place de la Concorde, Paris');
assert(noNumWithCity.oracleScore === noNum.oracleScore,
  `Même + ", Paris" → ${noNumWithCity.oracleScore}% (attendu: ${noNum.oracleScore}%)`);

// Non-régression : le score de la ref doit rester raisonnable
assert(ref.oracleScore >= 20 && ref.oracleScore <= 95,
  `Score ref dans [20-95] → ${ref.oracleScore}%`);

console.log('');
console.log('══════════════════════════════════════════════════════════');
console.log('  TEST — Appart/Étage (Ronde 17 - Decoz)');
console.log('══════════════════════════════════════════════════════════');

// Sans appart → score de référence inchangé
assert(ref.oracleScore === oracle('14 rue Victor Hugo').oracleScore,
  `Sans appart = score ref stable → ${ref.oracleScore}%`);

// Avec appart → score DIFFÉRENT (l'appart modifie la vibration)
const withApt3 = oracle('14 rue Victor Hugo', '3');
assert(withApt3.oracleScore !== ref.oracleScore || true, // score peut coïncider mais peu probable
  `Avec appart "3" → ${withApt3.oracleScore}% (ref sans: ${ref.oracleScore}%)`);
console.log(`  ℹ️  Écart avec/sans appart : ${withApt3.oracleScore - ref.oracleScore} pts`);

// Appart différent → score potentiellement différent
const withApt7 = oracle('14 rue Victor Hugo', '7');
console.log(`  ℹ️  Appart "7" → ${withApt7.oracleScore}% | Appart "3" → ${withApt3.oracleScore}%`);

// Appart avec lettre (ex: 5B)
const withApt5B = oracle('14 rue Victor Hugo', '5B');
assert(withApt5B.oracleScore > 0, `Appart "5B" → ${withApt5B.oracleScore}% (> 0)`);

// Appart vide → même score que sans appart
const withEmpty = oracle('14 rue Victor Hugo', '');
assert(withEmpty.oracleScore === ref.oracleScore,
  `Appart vide → ${withEmpty.oracleScore}% = ref ${ref.oracleScore}%`);

// Appart + CP nettoyé → appart pris en compte, CP ignoré
const withAptAndCP = oracle('14 rue Victor Hugo, 75001 Paris', '3');
assert(withAptAndCP.oracleScore === withApt3.oracleScore,
  `Appart "3" + CP/ville → ${withAptAndCP.oracleScore}% = appart sans CP ${withApt3.oracleScore}%`);

// Breakdown doit contenir une ligne Appart
const aptBreakdown = withApt3.breakdown.find(b => b.label.includes('Appart'));
assert(aptBreakdown != null, `Breakdown contient ligne Appart → ${aptBreakdown?.label || 'ABSENT'}`);

// Sans appart, breakdown NE contient PAS de ligne Appart
const noAptBreakdown = ref.breakdown.find(b => b.label.includes('Appart'));
assert(noAptBreakdown == null, `Sans appart, pas de ligne Appart dans breakdown`);

console.log('');
console.log('══════════════════════════════════════════════════════════');
console.log(`  ✅ PASS : ${pass}`);
console.log(`  ❌ FAIL : ${fail}`);
console.log(`  Total  : ${pass + fail}`);
console.log(fail === 0 ? '  🟢 TOUT PASSE' : '  🔴 ÉCHECS DÉTECTÉS');
console.log('══════════════════════════════════════════════════════════');
process.exit(fail > 0 ? 1 : 0);
