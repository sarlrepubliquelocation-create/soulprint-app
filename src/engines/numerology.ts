// ═══ NUMEROLOGY ENGINE ═══
// Pythagorean + Chaldean + Karmic + Lo Shu + Cycles

// === MAPS ===
const PYTH_MAP: Record<string, number> = {
  A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8,I:9,
  J:1,K:2,L:3,M:4,N:5,O:6,P:7,Q:8,R:9,
  S:1,T:2,U:3,V:4,W:5,X:6,Y:7,Z:8
};

const CHALD_MAP: Record<string, number> = {
  A:1,B:2,C:3,D:4,E:5,F:8,G:3,H:5,I:1,
  J:1,K:2,L:3,M:4,N:5,O:7,P:8,Q:1,R:2,
  S:3,T:4,U:6,V:6,W:6,X:5,Y:1,Z:7
};

const VOWELS = new Set('AEIOU'.split(''));
const MASTER_NUMBERS = new Set([11, 22, 33]);

const ACCENT_MAP: Record<string, string> = {
  'À':'A','Á':'A','Â':'A','Ã':'A','Ä':'A',
  'È':'E','É':'E','Ê':'E','Ë':'E',
  'Ì':'I','Í':'I','Î':'I','Ï':'I',
  'Ò':'O','Ó':'O','Ô':'O','Ö':'O',
  'Ù':'U','Ú':'U','Û':'U','Ü':'U',
  'Ý':'Y','Ç':'C','Ñ':'N','Œ':'O'
};

// === TYPES ===
export interface Reduced {
  v: number;
  m: boolean;
  ch: number[];
}

export interface NumerologyProfile {
  lp: Reduced;       // Life Path
  expr: Reduced;     // Expression
  soul: Reduced;     // Soul Urge
  pers: Reduced;     // Personality
  mat: Reduced;      // Maturity
  bday: Reduced;     // Birthday
  py: Reduced;       // Personal Year
  pm: Reduced;       // Personal Month
  ppd: Reduced;      // Personal Day
  ig: Record<number, number>;  // Inclusion Grid
  kl: number[];      // Karmic Lessons
  hp: number[];      // Hidden Passions
  ch: { cp: number; rd: Reduced };  // Chaldean
  ls: LoShu;         // Lo Shu Grid
  pinnacles: Reduced[];
  challenges: Reduced[];
  full: string;
}

export interface LoShu {
  grid: number[][];
  dr: Reduced;   // Driver
  co: Reduced;   // Conductor
  plans: Record<string, { present: number[]; missing: number[] }>;
}

// === CORE FUNCTIONS ===
export function normalize(s: string): string {
  return s.toUpperCase().split('').map(c => ACCENT_MAP[c] || c).filter(c => /[A-Z]/.test(c)).join('');
}

export function reduce(n: number, masters = true): Reduced {
  const ch = [n];
  if (n <= 0) return { v: 0, m: false, ch: [0] };
  let c = n;
  while (c > 9) {
    if (masters && MASTER_NUMBERS.has(c)) return { v: c, m: true, ch };
    c = [...('' + c)].map(Number).reduce((s, d) => s + d, 0);
    ch.push(c);
  }
  return { v: c, m: false, ch };
}

export function nameToNumbers(s: string, type: 'p' | 'c' = 'p'): number[] {
  const n = normalize(s);
  const map = type === 'p' ? PYTH_MAP : CHALD_MAP;
  return n.split('').map(c => map[c] || 0);
}

export function parseDate(s: string) {
  const [y, m, d] = s.split('-').map(Number);
  return { d, m, y };
}

// === LIFE PATH ===
export function calcLifePath(bd: string): Reduced {
  const { d, m, y } = parseDate(bd);
  return reduce([...(d + '' + m + y)].map(Number).reduce((s, x) => s + x, 0));
}

// === EXPRESSION ===
export function calcExpression(fullName: string): Reduced {
  return reduce(nameToNumbers(fullName).reduce((s, n) => s + n, 0));
}

// === SOUL URGE ===
export function calcSoul(fullName: string): Reduced {
  const n = normalize(fullName);
  let t = 0;
  n.split('').forEach(c => { if (VOWELS.has(c)) t += PYTH_MAP[c] || 0; });
  return reduce(t);
}

// === PERSONALITY ===
export function calcPersonality(fullName: string): Reduced {
  const n = normalize(fullName);
  let t = 0;
  n.split('').forEach(c => { if (!VOWELS.has(c) && PYTH_MAP[c]) t += PYTH_MAP[c]; });
  return reduce(t);
}

// === PERSONAL YEAR / MONTH / DAY ===
export function calcPersonalYear(bd: string, yr: number): Reduced {
  const { d, m } = parseDate(bd);
  return reduce(reduce(d).v + reduce(m).v + reduce(yr).v);
}

export function calcPersonalMonth(bd: string, yr: number, mo: number): Reduced {
  return reduce(calcPersonalYear(bd, yr).v + reduce(mo).v);
}

export function calcPersonalDay(bd: string, today: string): Reduced {
  const { d, m, y } = parseDate(today);
  return reduce(calcPersonalMonth(bd, y, m).v + reduce(d).v);
}

// === INCLUSION GRID ===
export function calcInclusionGrid(fullName: string): Record<number, number> {
  const ns = nameToNumbers(fullName);
  const c: Record<number, number> = {};
  for (let i = 1; i <= 9; i++) c[i] = 0;
  ns.forEach(n => { if (n >= 1 && n <= 9) c[n]++; });
  return c;
}

// === KARMIC LESSONS ===
export function calcKarmicLessons(fullName: string): number[] {
  const ns = nameToNumbers(fullName);
  const p = new Set(ns);
  const m: number[] = [];
  for (let i = 1; i <= 9; i++) if (!p.has(i)) m.push(i);
  return m;
}

// === HIDDEN PASSIONS ===
export function calcHiddenPassions(fullName: string): number[] {
  const ns = nameToNumbers(fullName);
  const c: Record<number, number> = {};
  ns.forEach(n => { c[n] = (c[n] || 0) + 1; });
  const mx = Math.max(...Object.values(c));
  if (mx < 2) return [];
  return Object.entries(c).filter(([, ct]) => ct === mx).map(([n]) => +n).sort((a, b) => a - b);
}

// === CHALDEAN ===
export function calcChaldean(name: string): { cp: number; rd: Reduced } {
  const t = nameToNumbers(name, 'c').reduce((s, n) => s + n, 0);
  return { cp: t, rd: reduce(t) };
}

// === LO SHU GRID ===
export function calcLoShu(bd: string): LoShu {
  const { d, m, y } = parseDate(bd);
  const digits = [...('' + d + m + y)].map(Number).filter(n => n > 0);
  const grid = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  // Lo Shu positions: 4 9 2 / 3 5 7 / 8 1 6
  const pos: Record<number, [number, number]> = {
    4: [0, 0], 9: [0, 1], 2: [0, 2],
    3: [1, 0], 5: [1, 1], 7: [1, 2],
    8: [2, 0], 1: [2, 1], 6: [2, 2]
  };
  digits.forEach(n => {
    const p = pos[n];
    if (p) grid[p[0]][p[1]]++;
  });

  const dr = reduce(d);
  const co = reduce([...('' + d + m + y)].map(Number).reduce((s, x) => s + x, 0));

  // Plans
  const plans: Record<string, { present: number[]; missing: number[] }> = {
    'Mental (1,2,3)': { present: [], missing: [] },
    'Émotionnel (4,5,6)': { present: [], missing: [] },
    'Pratique (7,8,9)': { present: [], missing: [] },
    'Vision (1,5,9)': { present: [], missing: [] },
    'Volonté (3,5,7)': { present: [], missing: [] },
  };
  const dSet = new Set(digits);
  const planDef: Record<string, number[]> = {
    'Mental (1,2,3)': [1, 2, 3],
    'Émotionnel (4,5,6)': [4, 5, 6],
    'Pratique (7,8,9)': [7, 8, 9],
    'Vision (1,5,9)': [1, 5, 9],
    'Volonté (3,5,7)': [3, 5, 7],
  };
  Object.entries(planDef).forEach(([k, nums]) => {
    nums.forEach(n => {
      if (dSet.has(n)) plans[k].present.push(n);
      else plans[k].missing.push(n);
    });
  });

  return { grid, dr, co, plans };
}

// === PINNACLES & CHALLENGES ===
export function calcPinnacles(bd: string): Reduced[] {
  const { d, m, y } = parseDate(bd);
  const D = reduce(d).v, M = reduce(m).v, Y = reduce(y).v;
  return [
    reduce(D + M),           // 1st Pinnacle
    reduce(D + Y),           // 2nd Pinnacle
    reduce(D + M + D + Y),   // 3rd Pinnacle
    reduce(M + Y),           // 4th Pinnacle
  ];
}

export function calcChallenges(bd: string): Reduced[] {
  const { d, m, y } = parseDate(bd);
  const D = reduce(d).v, M = reduce(m).v, Y = reduce(y).v;
  const c1 = reduce(Math.abs(D - M));
  const c2 = reduce(Math.abs(D - Y));
  const c3 = reduce(Math.abs(c1.v - c2.v));
  const c4 = reduce(Math.abs(M - Y));
  return [c1, c2, c3, c4];
}

// === CALENDAR ===
export function calcCalendar(bd: string, yr: number, mo: number) {
  const dim = new Date(yr, mo, 0).getDate();
  return Array.from({ length: dim }, (_, i) => {
    const ds = yr + '-' + String(mo).padStart(2, '0') + '-' + String(i + 1).padStart(2, '0');
    const p = calcPersonalDay(bd, ds);
    return { d: i + 1, pv: p.v, ms: p.m };
  });
}

// === NUMBER INFO ===
export interface NumberInfo {
  k: string;
  c: string;
  s: string;
}

export const NUMBER_INFO: Record<number, NumberInfo> = {
  1:  { k: 'Leader',           c: '#FF4444', s: '☉' },
  2:  { k: 'Diplomate',        c: '#A0A0FF', s: '☽' },
  3:  { k: 'Créateur',         c: '#FFD700', s: '♃' },
  4:  { k: 'Bâtisseur',        c: '#CD853F', s: '⊕' },
  5:  { k: 'Aventurier',       c: '#00CED1', s: '☿' },
  6:  { k: 'Harmoniseur',      c: '#FF69B4', s: '♀' },
  7:  { k: 'Chercheur',        c: '#9370DB', s: '♆' },
  8:  { k: 'Stratège',         c: '#708090', s: '♄' },
  9:  { k: 'Humaniste',        c: '#DC143C', s: '♂' },
  11: { k: 'Visionnaire',      c: '#D8D0FF', s: '✦✦' },
  22: { k: 'Maître Bâtisseur', c: '#FFD700', s: '✧✧' },
  33: { k: 'Maître Guérisseur',c: '#FF88FF', s: '✶✶' },
};

export const KARMIC_MEANINGS: Record<number, string> = {
  1: "Affirmation de soi", 2: "Diplomatie & coopération", 3: "Créativité & expression",
  4: "Discipline & rigueur", 5: "Changement & liberté", 6: "Amour & responsabilité",
  7: "Intériorité & sagesse", 8: "Pouvoir & abondance", 9: "Compassion & service"
};

export function getNumberInfo(n: number): NumberInfo {
  return NUMBER_INFO[n] || NUMBER_INFO[n > 9 ? reduce(n, false).v : n] || { k: '?', c: '#888', s: '?' };
}

export function isMaster(n: number): boolean {
  return MASTER_NUMBERS.has(n);
}

// === FULL PROFILE ===
export function calcNumerology(fn: string, mn: string, ln: string, bd: string, today: string): NumerologyProfile {
  const full = [fn, mn, ln].filter(Boolean).join(' ');
  const lp = calcLifePath(bd);
  const expr = calcExpression(full);
  const soul = calcSoul(full);
  const pers = calcPersonality(full);
  const mat = reduce(lp.v + expr.v);
  const bday = reduce(parseDate(bd).d);
  const py = calcPersonalYear(bd, parseDate(today).y);
  const pm = calcPersonalMonth(bd, parseDate(today).y, parseDate(today).m);
  const ppd = calcPersonalDay(bd, today);
  const ig = calcInclusionGrid(full);
  const kl = calcKarmicLessons(full);
  const hp = calcHiddenPassions(full);
  const ch = calcChaldean(fn + ' ' + ln);
  const ls = calcLoShu(bd);
  const pinnacles = calcPinnacles(bd);
  const challenges = calcChallenges(bd);

  return { lp, expr, soul, pers, mat, bday, py, pm, ppd, ig, kl, hp, ch, ls, pinnacles, challenges, full };
}
