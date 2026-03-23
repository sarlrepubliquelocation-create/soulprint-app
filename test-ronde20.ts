/**
 * TEST RONDE 20 — Numéro : secteur d'activité + détection SIRET
 * A) La matrice domaine modifie le score de la réduction
 * B) Sans domaine → score généraliste (non-régression Ronde 19)
 * C) Le domaine n'affecte PAS patterns et chinois
 * D) Signaux/alertes domaine
 */
import { calcOracle, type OracleType, type OracleDomain } from './src/engines/oracle';

let PASS = 0, FAIL = 0;
function assert(ok: boolean, label: string, detail?: string) {
  if (ok) { PASS++; console.log(`  ✅ ${label}`); }
  else { FAIL++; console.log(`  ❌ ${label}${detail ? ' — ' + detail : ''}`); }
}
function section(t: string) { console.log(`\n${'═'.repeat(60)}\n  ${t}\n${'═'.repeat(60)}`); }

const DS = 72, CDV = 6, BD = 15, BM = 3;
function numero(input: string, domain: OracleDomain = 'generaliste') {
  return calcOracle({ type: 'numero', input, domain, dailyScore: DS, userCdv: CDV, domainScoreFromConvergence: 65, userBirthDay: BD, userBirthMonth: BM });
}

// ═══ A) Matrice domaine modifie le score ═══
section('A) Domaine modifie le score');
{
  // Numéro réduction 7 : Commerce=4/10 vs Spirituel=10/10 → score très différent
  // 0783707470 réduit à 7
  const rGen = numero('0783707470');
  const rCom = numero('0783707470', 'commerce');
  const rSpi = numero('0783707470', 'spirituel');

  console.log(`    Gén: ${rGen.domainScore}% | Com: ${rCom.domainScore}% | Spi: ${rSpi.domainScore}%`);

  assert(rSpi.domainScore > rGen.domainScore,
    `7/Spirituel (${rSpi.domainScore}%) > 7/Généraliste (${rGen.domainScore}%)`);
  assert(rGen.domainScore > rCom.domainScore,
    `7/Généraliste (${rGen.domainScore}%) > 7/Commerce (${rCom.domainScore}%)`);
  assert(rSpi.domainScore - rCom.domainScore >= 15,
    `Écart Spirituel/Commerce ≥ 15 pts : ${rSpi.domainScore - rCom.domainScore} pts`);

  // Numéro réduction 8 : Commerce=10/10 vs Spirituel=4/10
  // 8888888888 réduit à 8
  const r8Com = numero('8888888888', 'commerce');
  const r8Spi = numero('8888888888', 'spirituel');
  console.log(`    8/Com: ${r8Com.domainScore}% | 8/Spi: ${r8Spi.domainScore}%`);
  assert(r8Com.domainScore > r8Spi.domainScore,
    `8/Commerce (${r8Com.domainScore}%) > 8/Spirituel (${r8Spi.domainScore}%)`);
}

// ═══ B) Non-régression : sans domaine = généraliste = identique Ronde 19 ═══
section('B) Non-régression — généraliste inchangé');
{
  const banals = ['0612345678', '0145678901', '0783707470', '0612121212'];
  for (const num of banals) {
    const rGen = numero(num);
    const rGenExplicit = numero(num, 'generaliste');
    assert(rGen.domainScore === rGenExplicit.domainScore,
      `"${num}" : default (${rGen.domainScore}%) === explicit generaliste (${rGenExplicit.domainScore}%)`);
  }

  // Vérifier que les scores Ronde 19 sont préservés
  const r1 = numero('0612345678');
  assert(r1.domainScore >= 28 && r1.domainScore <= 70,
    `Ronde 19 non-régression "0612345678" : ${r1.domainScore}% (28-70%)`);
}

// ═══ C) Patterns et chinois ne changent PAS avec le domaine ═══
section('C) Patterns et chinois universels');
{
  // 8888888888 : patterns max + chinois max
  // En changeant le domaine, seule la réduction bouge — pas les patterns ni le chinois
  const rCom = numero('8888888888', 'commerce');
  const rHum = numero('8888888888', 'humain');

  // Les deux doivent avoir les mêmes signaux patterns (888, etc.)
  const comPatterns = rCom.breakdown.find(b => b.label === 'Patterns');
  const humPatterns = rHum.breakdown.find(b => b.label === 'Patterns');
  assert(comPatterns !== undefined && humPatterns !== undefined,
    `Patterns présents pour les deux domaines`);
  if (comPatterns && humPatterns) {
    assert(comPatterns.value === humPatterns.value,
      `Patterns identiques : Commerce="${comPatterns.value}" === Humain="${humPatterns.value}"`);
  }

  const comChinese = rCom.breakdown.find(b => b.label === 'Tradition chinoise');
  const humChinese = rHum.breakdown.find(b => b.label === 'Tradition chinoise');
  if (comChinese && humChinese) {
    assert(comChinese.pts === humChinese.pts,
      `Chinois identiques : Commerce=${comChinese.pts} === Humain=${humChinese.pts}`);
  }
}

// ═══ D) Signaux et alertes domaine ═══
section('D) Signaux et alertes domaine');
{
  // 7/Spirituel → signal positif (10/10)
  const rSpi = numero('0783707470', 'spirituel');
  const hasDomainSignal = rSpi.signals.some(s => s.includes('excellente') && s.includes('Spiritu'));
  assert(hasDomainSignal,
    `7/Spirituel : signal "excellente pour le secteur Spiritualité"`);

  // 7/Commerce → alerte (4/10)
  const rCom = numero('0783707470', 'commerce');
  const hasDomainAlert = rCom.alerts.some(a => a.includes('décalage') && a.includes('Commerce'));
  assert(hasDomainAlert,
    `7/Commerce : alerte "en décalage avec le secteur Commerce"`);

  // Généraliste → pas de signal/alerte domaine
  const rGen = numero('0783707470');
  const noDomainSignal = !rGen.signals.some(s => s.includes('secteur'));
  const noDomainAlert = !rGen.alerts.some(a => a.includes('secteur'));
  assert(noDomainSignal && noDomainAlert,
    `Généraliste : pas de signal/alerte domaine`);
}

// ═══ E) Domain retourné dans le résultat ═══
section('E) Domain dans OracleResult');
{
  const rCom = numero('0783707470', 'commerce');
  assert(rCom.domain === 'commerce',
    `OracleResult.domain = "commerce" (reçu: "${rCom.domain}")`);

  const rGen = numero('0783707470');
  assert(rGen.domain === 'generaliste',
    `OracleResult.domain = "generaliste" (reçu: "${rGen.domain}")`);
}

// ═══ F) Non-régression des autres modules ═══
section('F) Non-régression — autres modules');
{
  const rNom = calcOracle({ type: 'nom', input: 'Kaironaute', dailyScore: DS, userCdv: CDV, domainScoreFromConvergence: 65, userBirthDay: BD, userBirthMonth: BM });
  assert(rNom.domainScore >= 0 && rNom.domainScore <= 100, `Nom OK : ${rNom.domainScore}%`);

  const rBebe = calcOracle({ type: 'bebe', input: 'Alice', dailyScore: DS, userCdv: CDV, domainScoreFromConvergence: 65, userBirthDay: BD, userBirthMonth: BM });
  assert(rBebe.domainScore >= 0 && rBebe.domainScore <= 100, `Bébé OK : ${rBebe.domainScore}%`);

  const rAddr = calcOracle({ type: 'adresse', input: '14 rue Hugo', dailyScore: DS, userCdv: CDV, domainScoreFromConvergence: 65, userBirthDay: BD, userBirthMonth: BM });
  assert(rAddr.domainScore >= 0 && rAddr.domainScore <= 100, `Adresse OK : ${rAddr.domainScore}%`);
  assert(rAddr.signals.length >= 1, `Adresse signal Ronde 19 présent`);

  const rDate = calcOracle({ type: 'date', input: '15/06/2026', dailyScore: DS, userCdv: CDV, domainScoreFromConvergence: 65, userBirthDay: BD, userBirthMonth: BM });
  assert(rDate.domainScore >= 0 && rDate.domainScore <= 100, `Date OK : ${rDate.domainScore}%`);
}

// ═══ RÉSUMÉ ═══
console.log(`\n${'═'.repeat(60)}`);
console.log(`  RÉSULTAT : ${PASS} PASS / ${FAIL} FAIL`);
console.log(`${'═'.repeat(60)}\n`);
if (FAIL > 0) process.exit(1);
