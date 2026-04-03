import { calcOracle } from './src/engines/oracle.js';

const result = calcOracle({
  type: 'sujet',
  input: 'projet',
  sujet: 'projet',
  dailyScore: 60,
  domainScoreFromConvergence: 70,
  userCdv: 7,
  userBirthDay: 23,
  userBirthMonth: 9,
});

console.log('=== Oracle Result Structure ===');
console.log('Keys:', Object.keys(result));
console.log('\nDomain:', result.domain);
console.log('DomainScore:', result.domainScore);
console.log('OracleScore:', result.oracleScore);
console.log('\nVerdict:', result.verdict);
console.log('\nIntrinsic:', result.intrinsicVerdict);
console.log('\nContextBadges:', result.contextBadges?.slice(0, 3));
console.log('\nSignals (first 3):', result.signals?.slice(0, 3));
console.log('\nAlerts (first 3):', result.alerts?.slice(0, 3));
