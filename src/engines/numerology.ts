// ═══ NUMEROLOGY ENGINE V3.2 ═══
// Pythagorean + Chaldean + Karmic + Lo Shu + Cycles + Essences Annuelles
// V2: Decoz Life Path + Active Pinnacle/Challenge helper
// V2.1: formatReductionPath() + formatWithLabel() pour affichage "76/13/4"
// V3.2: Essences annuelles (3 cycles lettre indépendants, méthode Decoz)

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

// === KARMIC DEBT NUMBERS (V4.7) ===
// Nombres karmiques : 13, 14, 16, 19 — interceptés AVANT réduction
const KARMIC_DEBT_NUMBERS = new Set([13, 14, 16, 19]);

export function checkKarmicNumber(totalBeforeReduce: number): number | null {
  return KARMIC_DEBT_NUMBERS.has(totalBeforeReduce) ? totalBeforeReduce : null;
}

export function reduceWithKarmic(total: number): { reduced: Reduced; karmic: number | null } {
  const karmic = checkKarmicNumber(total);
  return { reduced: reduce(total), karmic };
}

// Y contextuel : voyelle quand il est la seule source vocalique de sa syllabe
// Exemples : Yves → Y voyelle (pas d'autre voyelle adjacente)
//            Yann → Y consonne (suivi de A)
//            Mary → Y voyelle (entouré de consonnes)
//            Joy  → Y consonne (précédé de O)
//            Yvon → Y voyelle (suivi de V consonne)
//            Maya → premier Y consonne (entre A et A), pas de Y ici mais M-A-Y-A
function isYVowel(chars: string[], idx: number): boolean {
  if (chars[idx] !== 'Y') return false;
  const prev = idx > 0 ? chars[idx - 1] : '';
  const next = idx < chars.length - 1 ? chars[idx + 1] : '';
  // Y est consonne si adjacent à une voyelle AEIOU
  if (VOWELS.has(prev) || VOWELS.has(next)) return false;
  // Sinon Y est voyelle (entouré de consonnes, début/fin de mot)
  return true;
}

// Vérifie si un caractère à une position donnée est une voyelle (AEIOU + Y contextuel)
function isVowelAt(chars: string[], idx: number): boolean {
  if (VOWELS.has(chars[idx])) return true;
  return isYVowel(chars, idx);
}

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
  essence: Reduced;         // V3.2: Essence annuelle (transit des lettres Decoz)
  essenceAlignment: string; // V3.2: 'cdv'|'soul'|'karmic'|'challenge'|'none'
  full: string;
  karmicDebt: number | null;  // V4.7: 13/14/16/19 si détecté dans Life Path
  hasKarmicDebt: boolean;     // V4.7: flag rapide pour conditions
  lifeCycle: LifeCycle;       // A1.2: Cycle de vie 3×27 ans
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
  const parts = (s ?? '').split('-');
  const y = parseInt(parts[0] ?? '2000', 10) || 2000; // Sprint AG: robuste
  const m = parseInt(parts[1] ?? '1', 10) || 1;
  const d = parseInt(parts[2] ?? '1', 10) || 1;
  return { d: Math.max(1, Math.min(31, d)), m: Math.max(1, Math.min(12, m)), y };
}

// === LIFE PATH (Decoz method) ===
// Reduce day, month, year SEPARATELY then sum and reduce
// V4.7: détecte les nombres karmiques 13/14/16/19 avant réduction finale
export function calcLifePath(bd: string): Reduced {
  const { d, m, y } = parseDate(bd);
  const rd = reduce(d).v;
  const rm = reduce(m).v;
  const ry = reduce(y).v;
  return reduce(rd + rm + ry);
}

export function calcLifePathWithKarmic(bd: string): { lp: Reduced; karmic: number | null } {
  const { d, m, y } = parseDate(bd);
  const rd = reduce(d).v;
  const rm = reduce(m).v;
  const ry = reduce(y).v;
  const total = rd + rm + ry;
  return { lp: reduce(total), karmic: checkKarmicNumber(total) };
}

// === LIFE PATH HORIZONTAL (all digits summed directly) ===
// Catches master numbers that Decoz method may miss (e.g. 23/09/1977 → 38 → 11)
export function calcLifePathHorizontal(bd: string): Reduced {
  const digits = bd.replace(/-/g, '').split('').map(Number);
  const sum = digits.reduce((s, d) => s + d, 0);
  return reduce(sum);
}

// === EXPRESSION ===
export function calcExpression(fullName: string): Reduced {
  return reduce(nameToNumbers(fullName).reduce((s, n) => s + n, 0));
}

// === SOUL URGE (with contextual Y) ===
export function calcSoul(fullName: string): Reduced {
  const n = normalize(fullName);
  const chars = n.split('');
  let t = 0;
  chars.forEach((c, i) => { if (isVowelAt(chars, i)) t += PYTH_MAP[c] || 0; });
  return reduce(t);
}

// === PERSONALITY (with contextual Y) ===
export function calcPersonality(fullName: string): Reduced {
  const n = normalize(fullName);
  const chars = n.split('');
  let t = 0;
  chars.forEach((c, i) => { if (!isVowelAt(chars, i) && PYTH_MAP[c]) t += PYTH_MAP[c]; });
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
    reduce(D + M),
    reduce(D + Y),
    reduce(D + M + D + Y),
    reduce(M + Y),
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

// === ACTIVE PINNACLE/CHALLENGE (based on current age) ===
// Standard periods:
//   P1: birth → age (36 - LP_single_digit)
//   P2: P1_end + 1 → P1_end + 9
//   P3: P2_end + 1 → P2_end + 9
//   P4: P3_end + 1 → end of life
// ── A1.2 : Cycles de Vie 3×27 ans (Tradition pythagoricienne — Cheiro, Javane) ──

export interface LifeCycle {
  cycle: 1 | 2 | 3;
  name: 'Physical' | 'Soul' | 'Mental';
  directorNumber: number;   // 1-9 (ou 11/22/33 si maître)
  startAge: number;
  endAge: number;
  isTransition: boolean;    // ±1 an autour des transitions 27/54 ans
  resonanceWithPY: boolean; // directorNumber == PY actuel
  delta: number;            // scoring : +3 résonance, -2 transition. Cap ±4.
}

/**
 * Calcule le cycle de vie actif (tradition pythagoricienne — Cheiro, Javane & Bunker).
 * Cycle 1 (0-26)  : chiffre directeur = reduce(mois naissance) — construction physique
 * Cycle 2 (27-53) : chiffre directeur = reduce(jour naissance)  — réalisation / production
 * Cycle 3 (54+)   : chiffre directeur = reduce(année naissance) — transmission / sagesse
 * Durée : 27 ans FIXES (pas variable comme les Pinnacles)
 * Transition ±1 an : dissolution/reconfiguration → -2 pts
 * Résonance PY : directorNumber === PY actuel → +3 pts. Cap ±4.
 */
export function calcLifeCycle(bd: string, today: string): LifeCycle {
  const { d, m, y } = parseDate(bd);
  const { y: todayY } = parseDate(today);
  const age = todayY - y;

  // Chiffres directeurs des 3 cycles
  const directors: [number, number, number] = [
    reduce(m).v,  // Cycle 1 : mois naissance
    reduce(d).v,  // Cycle 2 : jour naissance
    reduce(y).v,  // Cycle 3 : année naissance
  ];

  // Cycle actif (index 0/1/2)
  const cycleIdx = age >= 54 ? 2 : age >= 27 ? 1 : 0;
  const names: ['Physical', 'Soul', 'Mental'] = ['Physical', 'Soul', 'Mental'];
  const startAges = [0, 27, 54];
  const endAges   = [26, 53, 99];

  const directorNumber = directors[cycleIdx];

  // Transition ±1 an autour de 27 et 54 ans
  const isTransition = Math.abs(age - 27) <= 1 || Math.abs(age - 54) <= 1;

  // Résonance avec Personal Year actuel (recalcul local pour éviter dépendance circulaire)
  const pyActuel = calcPersonalYear(bd, todayY).v;
  const resonanceWithPY = directorNumber === pyActuel;

  // Scoring cap ±4
  let delta = 0;
  if (resonanceWithPY) delta += 3;
  if (isTransition)    delta -= 2;
  delta = Math.max(-4, Math.min(4, delta));

  return {
    cycle: (cycleIdx + 1) as 1 | 2 | 3,
    name: names[cycleIdx],
    directorNumber,
    startAge: startAges[cycleIdx],
    endAge: endAges[cycleIdx],
    isTransition,
    resonanceWithPY,
    delta,
  };
}

export function getActivePinnacleIdx(bd: string, today: string, lp: Reduced): number {
  const birthYear = parseInt(bd.split('-')[0]);
  const currentYear = parseInt(today.split('-')[0]);
  const age = currentYear - birthYear;

  // For age calculation, reduce LP to single digit (11→2, 22→4, 33→6)
  const lpSingle = lp.v > 9 ? reduce(lp.v, false).v : lp.v;
  const p1End = 36 - lpSingle;
  const p2End = p1End + 9;
  const p3End = p2End + 9;

  if (age <= p1End) return 0;
  if (age <= p2End) return 1;
  if (age <= p3End) return 2;
  return 3;
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

// === REDUCTION PATH (V2.5: affiche "76/13/4" pour crédibilité technique) ===
// Formate la chaîne de réduction en string lisible
// Ex: { v: 4, m: false, ch: [76, 13, 4] } → "76/13/4"
// Ex: { v: 11, m: true, ch: [38, 11] } → "38/11"
// Ex: { v: 5, m: false, ch: [23, 5] } → "23/5"
export function formatReductionPath(r: Reduced): string {
  if (!r.ch || r.ch.length <= 1) return String(r.v);
  return r.ch.join('/');
}

// Variante avec label : "Expression 4 (76/13/4)"
export function formatWithLabel(label: string, r: Reduced): string {
  const path = formatReductionPath(r);
  const suffix = r.m ? ' maître' : '';
  if (r.ch.length <= 1) return `${label} ${r.v}${suffix}`;
  return `${label} ${r.v}${suffix} (${path})`;
}

// ═══ ESSENCES ANNUELLES V3.2 ═══
// Méthode Decoz ("Numerology: Key To Your Inner Self")
// 3 cycles SÉPARÉS (prénom, 2ème prénom, nom) qui bouclent indépendamment.
// Chaque lettre dure sa valeur pythagoricienne en années.
// Essence = reduce(somme des 3 lettres actives).
// Sources : Grok R5+R7 (specs Decoz), Claude (implémentation corrigée)

export interface EssenceResult {
  essence: Reduced;
  activeLetters: { cycle: string; letter: string; value: number }[];
  alignment: string;  // 'cdv'|'soul'|'karmic'|'challenge'|'none'
  alignmentScore: number;
}

/**
 * Pour un cycle de lettres donné (ex: "JEROME"), trouve la lettre active
 * pour une année cible. Le cycle boucle indéfiniment.
 * Chaque lettre dure sa valeur pythagoricienne en années.
 *
 * Exemple JEROME, né 1977, cible 2026 :
 *   J(1: 1977), E(5: 1978-1982), R(9: 1983-1991), O(6: 1992-1997),
 *   M(4: 1998-2001), E(5: 2002-2006), → recommence J(1: 2007)...
 *   Années écoulées = 49, cycle total = 30, position = 49 % 30 = 19
 *   → O (positions 15-20)
 */
function getActiveLetterInCycle(namepart: string, birthYear: number, targetYear: number): { letter: string; value: number } {
  const letters = normalize(namepart).split('');
  if (letters.length === 0) return { letter: '', value: 0 };

  const values = letters.map(c => PYTH_MAP[c] || 1);
  const cycleDuration = values.reduce((s, v) => s + v, 0);
  if (cycleDuration === 0) return { letter: letters[0], value: 1 };

  const yearsElapsed = targetYear - birthYear;
  const position = ((yearsElapsed % cycleDuration) + cycleDuration) % cycleDuration; // safe modulo

  let accumulated = 0;
  for (let i = 0; i < letters.length; i++) {
    accumulated += values[i];
    if (position < accumulated) {
      return { letter: letters[i], value: values[i] };
    }
  }
  return { letter: letters[0], value: values[0] }; // fallback
}

/**
 * Calcule l'Essence annuelle complète.
 * Somme les valeurs des lettres actives de chaque cycle (prénom, middle, nom)
 * puis réduit pythagoriquement.
 *
 * Détermine aussi l'alignement avec le profil natal :
 *   - essence === CdV → 'cdv' (+6 pts dans convergence)
 *   - essence === Soul → 'soul' (+5 pts)
 *   - essence ∈ karmicLessons → 'karmic' (+7 pts)
 *   - essence === challenge actif → 'challenge' (-3 pts)
 *   - sinon → 'none' (0 pts)
 */
export function calcEssence(
  fn: string, mn: string, ln: string,
  birthYear: number, targetYear: number,
  lp: Reduced, soul: Reduced, kl: number[], activeChallenge: Reduced
): EssenceResult {
  const parts = [fn, mn, ln].filter(Boolean);
  const activeLetters: { cycle: string; letter: string; value: number }[] = [];
  let sum = 0;

  for (const part of parts) {
    const active = getActiveLetterInCycle(part, birthYear, targetYear);
    if (active.letter) {
      activeLetters.push({ cycle: part, letter: active.letter, value: PYTH_MAP[active.letter] || 1 });
      sum += PYTH_MAP[active.letter] || 1;
    }
  }

  const essence = reduce(sum);

  // Déterminer l'alignement
  let alignment = 'none';
  let alignmentScore = 0;

  if (essence.v === lp.v) {
    alignment = 'cdv';
    alignmentScore = 6;
  } else if (essence.v === soul.v) {
    alignment = 'soul';
    alignmentScore = 5;
  } else if (kl.includes(essence.v)) {
    alignment = 'karmic';
    alignmentScore = 7;
  } else if (essence.v === activeChallenge.v) {
    alignment = 'challenge';
    alignmentScore = -3;
  }

  return { essence, activeLetters, alignment, alignmentScore };
}

// === FULL PROFILE ===
export function calcNumerology(fn: string, mn: string, ln: string, bd: string, today: string): NumerologyProfile {
  const full = [fn, mn, ln].filter(Boolean).join(' ');
  // V4.7: détection karmic debt sur Life Path
  const { lp, karmic: karmicDebt } = calcLifePathWithKarmic(bd);
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

  // V3.2: Essence annuelle
  const birthYear = parseInt(bd.split('-')[0]);
  const targetYear = parseInt(today.split('-')[0]);
  const activeIdx = getActivePinnacleIdx(bd, today, lp);
  const activeChallenge = challenges[activeIdx] || challenges[0];
  const essenceResult = calcEssence(fn, mn, ln, birthYear, targetYear, lp, soul, kl, activeChallenge);

  // A1.2: Cycle de vie 3×27 ans
  const lifeCycle = calcLifeCycle(bd, today);

  return {
    lp, expr, soul, pers, mat, bday, py, pm, ppd, ig, kl, hp, ch, ls,
    pinnacles, challenges,
    essence: essenceResult.essence,
    essenceAlignment: essenceResult.alignment,
    full,
    karmicDebt,                        // V4.7: null ou 13/14/16/19
    hasKarmicDebt: karmicDebt !== null, // V4.7: flag rapide
    lifeCycle,                          // A1.2: Cycle de vie 3×27 ans
  };
}

// ═══════════════════════════════════════════════════════════
// INCLUSION DISPLAY — V9 Sprint 5
// ═══════════════════════════════════════════════════════════

export const INCLUSION_DOMAIN_MAP: Record<number, {
  domain: string; secondary: string; lesson: string; activationText: string; icon: string;
}> = {
  1: { domain: 'DÉCISION',   secondary: 'BUSINESS',  lesson: 'Affirmation',     icon: '🔥', activationText: "Affirme tes choix aujourd'hui — ton manque de 1 devient ta force !" },
  2: { domain: 'AMOUR',      secondary: 'SOCIAL',    lesson: 'Coopération',     icon: '🤝', activationText: "Ouvre ton cœur — ton karma du 2 s'éclaire pour t'unir aux autres." },
  3: { domain: 'CRÉATIVITÉ', secondary: 'SOCIAL',    lesson: 'Expression',      icon: '🎨', activationText: "Libère ta voix créative — ton manque de 3 est ton atout aujourd'hui." },
  4: { domain: 'BUSINESS',   secondary: 'SANTÉ',     lesson: 'Discipline',      icon: '🏗️', activationText: "Bâtis avec confiance — ton karma du 4 te donne une base solide." },
  5: { domain: 'SOCIAL',     secondary: 'DÉCISION',  lesson: 'Liberté',         icon: '🌊', activationText: "Accueille l'imprévu avec joie — ton manque de 5 devient une aventure." },
  6: { domain: 'AMOUR',      secondary: 'SANTÉ',     lesson: 'Responsabilité',  icon: '💚', activationText: "Cultive l'harmonie — ton karma du 6 trouve son point d'équilibre." },
  7: { domain: 'SPIRITUEL',  secondary: 'DÉCISION',  lesson: 'Foi',             icon: '🔮', activationText: "Écoute ton intuition — ton karma du 7 illumine ta pleine conscience." },
  8: { domain: 'BUSINESS',   secondary: 'DÉCISION',  lesson: 'Abondance',       icon: '⚡', activationText: "Saisis les opportunités — ton manque de 8 t'invite à la réussite." },
  9: { domain: 'SPIRITUEL',  secondary: 'SOCIAL',    lesson: 'Sagesse',         icon: '🌍', activationText: "Fais preuve de compassion — ton karma du 9 t'ouvre grand au monde." },
};

export interface InclusionDisplay {
  grid:     Record<number, number>;
  N:        number;
  zScores:  Record<number, number>;
  absents:  number[];   // count === 0 → leçon karmique
  passions: number[];   // z ≥ 1.0   → passion cachée
  planes: {
    physical:  number;  // (4+5+6) / N × 100
    mental:    number;  // (1+8) / N × 100
    emotional: number;  // (2+3) / N × 100
    intuitive: number;  // (7+9) / N × 100
  };
}

export function calcInclusionDisplay(fullName: string): InclusionDisplay {
  const grid   = calcInclusionGrid(fullName);
  const raw    = nameToNumbers(fullName).filter(n => n >= 1 && n <= 9);
  const N      = raw.length;
  const exp    = N / 9;
  const sigma  = Math.sqrt(N * (1 / 9) * (8 / 9));

  const zScores:  Record<number, number> = {};
  const absents:  number[] = [];
  const passions: number[] = [];

  for (let d = 1; d <= 9; d++) {
    const c = grid[d] ?? 0;
    const z = sigma > 0 ? (c - exp) / sigma : 0;
    zScores[d] = Math.round(z * 10) / 10;
    if (c === 0)   absents.push(d);
    if (z >= 1.0)  passions.push(d);
  }

  const g = (d: number) => grid[d] ?? 0;
  const planes = {
    physical:  N > 0 ? (g(4) + g(5) + g(6)) / N * 100 : 0,
    mental:    N > 0 ? (g(1) + g(8))         / N * 100 : 0,
    emotional: N > 0 ? (g(2) + g(3))         / N * 100 : 0,
    intuitive: N > 0 ? (g(7) + g(9))         / N * 100 : 0,
  };

  return { grid, N, zScores, absents, passions, planes };
}
