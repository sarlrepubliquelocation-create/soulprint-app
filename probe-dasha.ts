import { buildNatalDashaCtx, calcDashaMultLite } from './src/engines/convergence-slow';

const dummyAstro = { pl: [], tr: [], as: 0 } as any;
const bd = '1977-09-23';
const bt = '14:15';

const ctx = buildNatalDashaCtx(bd, bt, dummyAstro);
if (!ctx) { console.log('ERREUR: natalCtx = null'); process.exit(1); }

console.log('natalCtx:', JSON.stringify(ctx, null, 2));
console.log('\n══ dashaMult par année (15 jan + 15 jul) ══');

for (let y = 2026; y <= 2045; y++) {
  const jan = new Date(`${y}-01-15T12:00:00`);
  const jul = new Date(`${y}-07-15T12:00:00`);
  const dJan = calcDashaMultLite(ctx, jan);
  const dJul = calcDashaMultLite(ctx, jul);
  const avg = (dJan.dashaMult + dJul.dashaMult) / 2;
  const flag = avg > 1 ? '  ▲ POSITIF' : avg < 0.95 ? '  ▼ NÉGATIF' : '';
  console.log(`${y}  Jan=${dJan.dashaMult.toFixed(4)}  Jul=${dJul.dashaMult.toFixed(4)}  Avg=${avg.toFixed(4)}${flag}`);
}

console.log('\n══ 2037 — détail mensuel ══');
for (let m = 1; m <= 12; m++) {
  const d = new Date(`2037-${String(m).padStart(2,'0')}-15T12:00:00`);
  const r = calcDashaMultLite(ctx, d);
  console.log(`2037-${String(m).padStart(2,'0')}  dashaMult=${r.dashaMult.toFixed(4)}  dashaTotal=${r.dashaTotal.toFixed(3)}`);
}
