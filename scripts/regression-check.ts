// ══════════════════════════════════════════════════════════════════
// ═══ REGRESSION CHECK — Kaironaute Sprint H — V10.2 ═══
// Snapshot oracle avant/après chaque sprint
//
// USAGE :
//   Avant sprint  : npm run regression -- --save v10.1
//   Après sprint  : npm run regression -- --compare v10.1
//   Tests seuls   : npm run regression
//
// RUNNER : npx tsx scripts/regression-check.ts [--save <tag>] [--compare <tag>]
// ══════════════════════════════════════════════════════════════════

import { calcTarabala, calcChandrabala, calcPanchanga } from '../src/engines/panchanga.js';
import { calcNakshatraComposite } from '../src/engines/nakshatras.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SNAPSHOT_DIR = path.join(__dirname, '../tests/snapshots');
const SNAPSHOT_FILE = (tag: string) => path.join(SNAPSHOT_DIR, `regression-${tag}.json`);

// ── Couleurs terminal ──────────────────────────────────────────────
const G = (s: string) => `\x1b[32m${s}\x1b[0m`; // vert
const R = (s: string) => `\x1b[31m${s}\x1b[0m`; // rouge
const Y = (s: string) => `\x1b[33m${s}\x1b[0m`; // jaune
const B = (s: string) => `\x1b[1m${s}\x1b[0m`;  // bold

// ══════════════════════════════════════════════════════════════════
// SECTION 1 — TESTS ORACLES (résultats déterministes attendus)
// Ces tests échouent → régression critique introduite dans un sprint
// ══════════════════════════════════════════════════════════════════

interface OracleTest {
  name: string;
  actual: unknown;
  expected: unknown;
}

function runOracleTests(): { passed: number; failed: number; failures: string[] } {
  const tests: OracleTest[] = [

    // ── calcTarabala ── (Sprint G)
    {
      name: 'Tarabala: transit=natal → Janma (−1)',
      actual: calcTarabala(0, 0).delta,
      expected: -1,
    },
    {
      name: 'Tarabala: transit=natal → nom Janma',
      actual: calcTarabala(0, 0).name,
      expected: 'Janma',
    },
    {
      name: 'Tarabala: idx=1 → Sampat (+2)',
      actual: calcTarabala(13.334, 0).delta,  // nakTransit=1, nakNatal=0 → idx=1
      expected: 2,
    },
    {
      name: 'Tarabala: idx=6 → Vadha (−3)',
      actual: calcTarabala(6 * 13.334, 0).delta,  // nakTransit=6, nakNatal=0 → idx=6
      expected: -3,
    },
    {
      name: 'Tarabala: idx=8 → Ati-Mitra (+2) — off-by-one guard',
      // nakTransit=0, nakNatal=1 → (0-1+27)%9 = 26%9 = 8
      actual: calcTarabala(0, 13.334).delta,
      expected: 2,
    },
    {
      name: 'Tarabala: index retourné est dans [0..8]',
      actual: calcTarabala(180, 45).index >= 0 && calcTarabala(180, 45).index <= 8,
      expected: true,
    },
    {
      name: 'Tarabala: wrap-around 360° correct',
      // 360.1 wraps → 0.1° = Nak 0, natal 0° = Nak 0 → même nak → Janma (−1)
      actual: calcTarabala(360.1, 0).delta,
      expected: -1,
    },

    // ── calcChandrabala ── (Sprint G)
    {
      name: 'Chandrabala: même signe → pos 1 (+2)',
      actual: calcChandrabala(0, 0).delta,
      expected: 2,
    },
    {
      name: 'Chandrabala: pos 1 → position correcte',
      actual: calcChandrabala(0, 0).position,
      expected: 1,
    },
    {
      name: 'Chandrabala: Astama pos.8 (−3) — cas critique',
      // transitSign=0(Bélier), natalSign=5(Vierge) → ((0-5+12)%12)+1 = 7+1 = 8
      actual: calcChandrabala(0, 150).delta,
      expected: -3,
    },
    {
      name: 'Chandrabala: Astama → position 8',
      actual: calcChandrabala(0, 150).position,
      expected: 8,
    },
    {
      name: 'Chandrabala: pos neutre (2,5) → 0',
      // transitSign=1, natalSign=0 → ((1-0+12)%12)+1=2 → 0
      actual: calcChandrabala(30, 0).delta,
      expected: 0,
    },
    {
      name: 'Chandrabala: pos 4 → −1',
      // transitSign=3, natalSign=0 → ((3-0+12)%12)+1=4 → -1
      actual: calcChandrabala(90, 0).delta,
      expected: -1,
    },
    {
      name: 'Chandrabala: position toujours dans [1..12]',
      actual: [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].every(lon => {
        const p = calcChandrabala(lon, 0).position;
        return p >= 1 && p <= 12;
      }),
      expected: true,
    },

    // ── calcNakshatraComposite ── (Sprint A — régression guard)
    {
      name: 'NakshatraComposite: null natal → total valide (pas NaN)',
      actual: isNaN(calcNakshatraComposite(0, null).total),
      expected: false,
    },
    {
      name: 'NakshatraComposite: transit 0° → transitNak défini',
      actual: calcNakshatraComposite(0, null).transitNak !== undefined,
      expected: true,
    },

    // ── calcPanchanga ── (Sprint E — régression guard)
    {
      name: 'Panchanga: total capé à ±6 max',
      // elongation=0 → tithi=1 (Nanda, +2), yoga variable, karana variable
      actual: Math.abs(calcPanchanga(180, 0, 24.1, new Date('2026-03-04T12:00:00Z')).total) <= 6,
      expected: true,
    },
    {
      name: 'Panchanga: Tithi dans 1..30',
      actual: (() => {
        const r = calcPanchanga(180, 0, 24.1, new Date('2026-03-04T12:00:00Z'));
        return r.tithi.tithi >= 1 && r.tithi.tithi <= 30;
      })(),
      expected: true,
    },
  ];

  let passed = 0;
  let failed = 0;
  const failures: string[] = [];

  for (const t of tests) {
    const ok = JSON.stringify(t.actual) === JSON.stringify(t.expected);
    if (ok) {
      passed++;
      console.log(G(`  ✓ ${t.name}`));
    } else {
      failed++;
      const msg = `  ✗ ${t.name}\n    attendu: ${JSON.stringify(t.expected)}\n    obtenu:  ${JSON.stringify(t.actual)}`;
      failures.push(msg);
      console.log(R(msg));
    }
  }

  return { passed, failed, failures };
}

// ══════════════════════════════════════════════════════════════════
// SECTION 2 — SNAPSHOT DÉTERMINISTE
// Valeurs calculées sur inputs fixes → détecte les dérives de score
// ══════════════════════════════════════════════════════════════════

interface ModuleSnapshot {
  // Tarabala sur 4 cas-clés (transit vs natal fixe = 0°)
  tarabala_janma:    { delta: number; name: string };
  tarabala_vadha:    { delta: number; name: string };
  tarabala_atiMitra: { delta: number; name: string };
  tarabala_sampat:   { delta: number; name: string };
  // Chandrabala sur 4 positions critiques
  chandra_pos1:  { delta: number; position: number };
  chandra_pos8:  { delta: number; position: number };  // Astama
  chandra_pos4:  { delta: number; position: number };
  chandra_pos12: { delta: number; position: number };
  // Panchanga sur date fixe 2026-03-04
  panchanga_20260304: { total: number; tithi: number; yoga: number };
  // Metadata
  version: string;
  timestamp: string;
}

function buildSnapshot(versionTag: string): ModuleSnapshot {
  const pan = calcPanchanga(180, 0, 24.1, new Date('2026-03-04T12:00:00Z'));

  return {
    tarabala_janma:    { delta: calcTarabala(0, 0).delta,        name: calcTarabala(0, 0).name },
    tarabala_vadha:    { delta: calcTarabala(6*13.334, 0).delta, name: calcTarabala(6*13.334, 0).name },
    tarabala_atiMitra: { delta: calcTarabala(0, 13.334).delta,   name: calcTarabala(0, 13.334).name },
    tarabala_sampat:   { delta: calcTarabala(13.334, 0).delta,   name: calcTarabala(13.334, 0).name },
    chandra_pos1:      { delta: calcChandrabala(0, 0).delta,     position: calcChandrabala(0, 0).position },
    chandra_pos8:      { delta: calcChandrabala(0, 150).delta,   position: calcChandrabala(0, 150).position },
    chandra_pos4:      { delta: calcChandrabala(90, 0).delta,    position: calcChandrabala(90, 0).position },
    chandra_pos12:     { delta: calcChandrabala(330, 0).delta,   position: calcChandrabala(330, 0).position },
    panchanga_20260304: { total: pan.total, tithi: pan.tithi.tithi, yoga: pan.yoga.yoga },
    version: versionTag,
    timestamp: new Date().toISOString(),
  };
}

function compareSnapshots(prev: ModuleSnapshot, curr: ModuleSnapshot): void {
  console.log(B(`\n📊 COMPARAISON : ${prev.version} → ${curr.version}`));
  console.log('─'.repeat(60));

  const keys = Object.keys(curr).filter(k => k !== 'version' && k !== 'timestamp') as Array<keyof ModuleSnapshot>;
  let drifts = 0;

  for (const key of keys) {
    const a = JSON.stringify(prev[key]);
    const b = JSON.stringify(curr[key]);
    if (a !== b) {
      drifts++;
      console.log(Y(`  ⚡ DRIFT [${key}]`));
      console.log(Y(`     avant : ${a}`));
      console.log(Y(`     après : ${b}`));
    } else {
      console.log(G(`  ✓ [${key}] stable`));
    }
  }

  if (drifts === 0) {
    console.log(G('\n✅ Aucune dérive détectée — snapshot stable'));
  } else {
    console.log(Y(`\n⚡ ${drifts} dérive(s) détectée(s) — vérifier intentionnalité`));
  }
}

// ══════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════

const args = process.argv.slice(2);
const saveIdx = args.indexOf('--save');
const compareIdx = args.indexOf('--compare');
const saveTag = saveIdx >= 0 ? args[saveIdx + 1] : null;
const compareTag = compareIdx >= 0 ? args[compareIdx + 1] : null;

console.log(B('\n🔬 Kaironaute — Regression Check'));
console.log('═'.repeat(60));

// 1. Tests oracles (toujours)
console.log(B('\n1. TESTS ORACLES'));
console.log('─'.repeat(40));
const { passed, failed, failures } = runOracleTests();
console.log(`\n   Résultat : ${G(String(passed))} passés / ${failed > 0 ? R(String(failed)) : '0'} échoués`);

if (failed > 0) {
  console.log(R('\n❌ ÉCHEC ORACLE — ne pas committer ce sprint'));
  process.exit(1);
}

// 2. Snapshot --save
if (saveTag) {
  console.log(B(`\n2. SAUVEGARDE SNAPSHOT : ${saveTag}`));
  console.log('─'.repeat(40));
  if (!fs.existsSync(SNAPSHOT_DIR)) fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
  const snap = buildSnapshot(saveTag);
  fs.writeFileSync(SNAPSHOT_FILE(saveTag), JSON.stringify(snap, null, 2));
  console.log(G(`  ✅ Snapshot sauvegardé → tests/snapshots/regression-${saveTag}.json`));
}

// 3. Snapshot --compare
if (compareTag) {
  console.log(B(`\n3. COMPARAISON SNAPSHOT : ${compareTag}`));
  console.log('─'.repeat(40));
  const f = SNAPSHOT_FILE(compareTag);
  if (!fs.existsSync(f)) {
    console.log(R(`  ❌ Snapshot introuvable : ${f}`));
    console.log(R(`     Lancer d'abord : npm run regression -- --save ${compareTag}`));
    process.exit(1);
  }
  const prev: ModuleSnapshot = JSON.parse(fs.readFileSync(f, 'utf-8'));
  const curr = buildSnapshot('HEAD');
  compareSnapshots(prev, curr);
}

// 4. Résumé final
console.log('\n' + '═'.repeat(60));
if (failed === 0) {
  console.log(G('✅ Tous les tests oracles passent.'));
  if (!saveTag && !compareTag) {
    console.log('   Usage snapshot : npm run regression -- --save <tag>');
    console.log('   Usage compare  : npm run regression -- --compare <tag>');
  }
} else {
  console.log(R('❌ Régression détectée — vérifier avant commit.'));
}
console.log('');
