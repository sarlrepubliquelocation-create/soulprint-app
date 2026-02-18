// ═══ ASTROLOGY ENGINE ═══
// Positions, Aspects, Transits, Elements, Modalities

const PI = Math.PI, D2R = PI / 180, R2D = 180 / PI;
const sin = (a: number) => Math.sin(a * D2R);
const cos = (a: number) => Math.cos(a * D2R);
const tan = (a: number) => Math.tan(a * D2R);
const atan2d = (y: number, x: number) => Math.atan2(y, x) * R2D;
const norm = (a: number) => ((a % 360) + 360) % 360;

// === TYPES ===
export interface PlanetPos {
  k: string;
  s: string;   // sign name (english)
  d: number;   // degree within sign
  h: number;   // house
}

export interface Aspect {
  p1: string;
  p2: string;
  t: string;
  o: number;
}

export interface Transit {
  tp: string;   // transiting planet
  np: string;   // natal planet
  t: string;    // aspect type
  o: number;
  x: number;    // 1 if exact (<1°)
}

export interface AstroChart {
  pl: PlanetPos[];
  b3: { sun: string; moon: string; asc: string };
  ad: number;       // asc degree
  hs: string[];     // houses
  as: Aspect[];     // aspects
  el: Record<string, number>;  // elements
  mo: Record<string, number>;  // modalities
  tr: Transit[];
  noTime: boolean;
}

// === CONSTANTS ===
export const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
export const SIGN_FR: Record<string, string> = { Aries:'Bélier',Taurus:'Taureau',Gemini:'Gémeaux',Cancer:'Cancer',Leo:'Lion',Virgo:'Vierge',Libra:'Balance',Scorpio:'Scorpion',Sagittarius:'Sagittaire',Capricorn:'Capricorne',Aquarius:'Verseau',Pisces:'Poissons' };
export const SIGN_SYM: Record<string, string> = { Aries:'♈',Taurus:'♉',Gemini:'♊',Cancer:'♋',Leo:'♌',Virgo:'♍',Libra:'♎',Scorpio:'♏',Sagittarius:'♐',Capricorn:'♑',Aquarius:'♒',Pisces:'♓' };
export const SIGN_ELEM: Record<string, string> = { Aries:'fire',Taurus:'earth',Gemini:'air',Cancer:'water',Leo:'fire',Virgo:'earth',Libra:'air',Scorpio:'water',Sagittarius:'fire',Capricorn:'earth',Aquarius:'air',Pisces:'water' };
export const SIGN_MODE: Record<string, string> = { Aries:'cardinal',Taurus:'fixed',Gemini:'mutable',Cancer:'cardinal',Leo:'fixed',Virgo:'mutable',Libra:'cardinal',Scorpio:'fixed',Sagittarius:'mutable',Capricorn:'cardinal',Aquarius:'fixed',Pisces:'mutable' };

export const PLANET_FR: Record<string, string> = { sun:'Soleil',moon:'Lune',mercury:'Mercure',venus:'Vénus',mars:'Mars',jupiter:'Jupiter',saturn:'Saturne',uranus:'Uranus',neptune:'Neptune',pluto:'Pluton' };
export const PLANET_SYM: Record<string, string> = { sun:'☉',moon:'☽',mercury:'☿',venus:'♀',mars:'♂',jupiter:'♃',saturn:'♄',uranus:'♅',neptune:'♆',pluto:'♇' };

export const ASPECT_SYM: Record<string, string> = { conjunction:'☌',opposition:'☍',trine:'△',square:'□',sextile:'⚹' };
export const ASPECT_COL: Record<string, string> = { conjunction:'#FFD700',opposition:'#FF4444',trine:'#4ade80',square:'#ef4444',sextile:'#60a5fa' };
export const ELEM_FR: Record<string, string> = { fire:'🔥 Feu',earth:'🌍 Terre',air:'💨 Air',water:'💧 Eau' };
export const ELEM_COL: Record<string, string> = { fire:'#FF4444',earth:'#CD853F',air:'#60a5fa',water:'#00CED1' };

// === ORBITAL CALCULATIONS ===
const jd = (y: number, mo: number, d: number, h = 0, mi = 0) => {
  if (mo <= 2) { y--; mo += 12; }
  const A = Math.floor(y / 100);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (mo + 1)) + d + ((h + mi / 60) / 24) + 2 - A + Math.floor(A / 4) - 1524.5;
};
const d0 = (y: number, mo: number, d: number, h = 0, mi = 0) => jd(y, mo, d, h, mi) - 2451543.5;

function kepler(M: number, e: number): number {
  M = norm(M);
  let E = M + R2D * e * sin(M) * (1 + e * cos(M));
  for (let i = 0; i < 15; i++) {
    const dE = (E - R2D * e * Math.sin(E * D2R) - M) / (1 - e * Math.cos(E * D2R));
    E -= dE;
    if (Math.abs(dE) < 1e-6) break;
  }
  return E;
}

function sunPos(d: number) {
  const w = norm(282.9404 + 4.70935e-5 * d), e = 0.016709 - 1.151e-9 * d, M = norm(356.0470 + 0.9856002585 * d);
  const E = kepler(M, e), xv = cos(E) - e, yv = Math.sqrt(1 - e * e) * sin(E);
  return { lon: norm(norm(atan2d(yv, xv)) + w), r: Math.sqrt(xv * xv + yv * yv), M, w, e };
}

function moonPos(d: number) {
  const Nm = norm(125.1228 - 0.0529538083 * d), im = 5.1454, wm = norm(318.0634 + 0.1643573223 * d), em = 0.054900, Mm = norm(115.3654 + 13.0649929509 * d);
  const E = kepler(Mm, em), am = 60.2666;
  const xv = am * (cos(E) - em), yv = am * Math.sqrt(1 - em * em) * sin(E);
  const v = norm(atan2d(yv, xv)), r = Math.sqrt(xv * xv + yv * yv);
  const xh = r * (cos(Nm) * cos(v + wm) - sin(Nm) * sin(v + wm) * cos(im));
  const yh = r * (sin(Nm) * cos(v + wm) + cos(Nm) * sin(v + wm) * cos(im));
  let lon = norm(atan2d(yh, xh));
  const s = sunPos(d), Ls = norm(s.M + s.w), Lm = norm(Mm + wm + Nm), D = norm(Lm - Ls), F = norm(Lm - Nm);
  lon += -1.274 * sin(Mm - 2 * D) + 0.658 * sin(2 * D) - 0.186 * sin(s.M) - 0.059 * sin(2 * Mm - 2 * D) - 0.057 * sin(Mm - 2 * D + s.M) + 0.053 * sin(Mm + 2 * D) + 0.046 * sin(2 * D - s.M) + 0.041 * sin(Mm - s.M) - 0.035 * sin(D) - 0.031 * sin(Mm + s.M) - 0.015 * sin(2 * F - 2 * D) + 0.011 * sin(Mm - 4 * D);
  return { lon: norm(lon) };
}

const OE: Record<string, number[]> = {
  mercury: [48.3313, 3.24587e-5, 7.0047, 5e-8, 29.1241, 1.01444e-5, .387098, .205635, 5.59e-10, 168.6562, 4.0923344368],
  venus: [76.6799, 2.4659e-5, 3.3946, 2.75e-8, 54.891, 1.38374e-5, .72333, .006773, -1.302e-9, 48.0052, 1.6021302244],
  mars: [49.5574, 2.11081e-5, 1.8497, -1.78e-8, 286.5016, 2.92961e-5, 1.523688, .093405, 2.516e-9, 18.6021, .5240207766],
  jupiter: [100.4542, 2.76854e-5, 1.303, -1.557e-7, 273.8777, 1.64505e-5, 5.20256, .048498, 4.469e-9, 19.895, .0830853001],
  saturn: [113.6634, 2.3898e-5, 2.4886, -1.081e-7, 339.3939, 2.97661e-5, 9.55475, .055546, -9.499e-9, 316.967, .0334442282],
  uranus: [74.0005, 1.3978e-5, .7733, 1.9e-8, 96.6612, 3.0565e-5, 19.18171, .047318, 7.45e-9, 142.5905, .011725806],
  neptune: [131.7806, 3.0173e-5, 1.77, -2.55e-7, 272.8461, -6.027e-6, 30.05826, .008606, 2.15e-9, 260.2471, .005995147]
};

function planetPos(name: string, d: number) {
  const o = OE[name];
  if (!o) return null;
  const [N0, Nd, i0, id, w0, wd, a, e0, ed, M0, Md] = o;
  const Np = norm(N0 + Nd * d), ip = i0 + id * d, wp = norm(w0 + wd * d), ep = e0 + ed * d, Mp = norm(M0 + Md * d);
  const E = kepler(Mp, ep), xv = a * (cos(E) - ep), yv = a * Math.sqrt(1 - ep * ep) * sin(E);
  const v = norm(atan2d(yv, xv)), r = Math.sqrt(xv * xv + yv * yv);
  let xh = r * (cos(Np) * cos(v + wp) - sin(Np) * sin(v + wp) * cos(ip));
  let yh = r * (sin(Np) * cos(v + wp) + cos(Np) * sin(v + wp) * cos(ip));

  if (name === 'jupiter' || name === 'saturn') {
    const Mj = norm(19.895 + .0830853001 * d), Ms = norm(316.967 + .0334442282 * d);
    if (name === 'jupiter') {
      const l0 = norm(atan2d(yh, xh));
      const dl = -.332 * sin(2 * Mj - 5 * Ms - 67.6) - .056 * sin(2 * Mj - 2 * Ms + 21) - .042 * sin(3 * Mj - 5 * Ms + 21);
      xh = r * cos(norm(l0 + dl)); yh = r * sin(norm(l0 + dl));
    }
    if (name === 'saturn') {
      const l0 = norm(atan2d(yh, xh));
      const dl = .812 * sin(2 * Mj - 5 * Ms - 67.6) - .229 * cos(2 * Mj - 4 * Ms - 2) + .119 * sin(Mj - 2 * Ms - 3);
      xh = r * cos(norm(l0 + dl)); yh = r * sin(norm(l0 + dl));
    }
  }
  const s = sunPos(d);
  return { lon: norm(atan2d(yh + s.r * sin(s.lon), xh + s.r * cos(s.lon))) };
}

function plutoPos(d: number) {
  const T = d / 36525, P = 238.96 + 144.96 * T;
  const lon = 238.958116 + 144.9600341 * T - 19.799 * sin(P) + 19.848 * cos(P) + .897 * sin(2 * P) - 4.956 * cos(2 * P) + .61 * sin(3 * P) + 1.211 * cos(3 * P);
  return { lon: norm(lon) };
}

function calcAngles(d: number, gLon: number, gLat: number) {
  const JD = d + 2451543.5, D = JD - 2451545, T = D / 36525;
  const GMST = norm(280.46061837 + 360.98564736629 * D + .000387933 * T * T);
  const LST = norm(GMST + gLon);
  const obl = 23.4393 - .013 * T;
  const mc = norm(atan2d(sin(LST), cos(LST) * cos(obl)));
  const asc = norm(atan2d(cos(LST), -(sin(obl) * tan(gLat) + cos(obl) * sin(LST))));
  return { asc, mc };
}

const toSign = (l: number) => SIGNS[Math.floor(norm(l) / 30)];

// === MAIN CHART CALCULATION ===
export function calcChart(y: number, mo: number, d: number, h: number, mi: number, lat: number, lon: number): Omit<AstroChart, 'tr' | 'noTime'> {
  const dd = d0(y, mo, d, h, mi);
  const s = sunPos(dd), m = moonPos(dd);
  const pls = [
    { k: 'sun', lon: s.lon }, { k: 'moon', lon: m.lon },
    { k: 'mercury', ...planetPos('mercury', dd)! }, { k: 'venus', ...planetPos('venus', dd)! },
    { k: 'mars', ...planetPos('mars', dd)! }, { k: 'jupiter', ...planetPos('jupiter', dd)! },
    { k: 'saturn', ...planetPos('saturn', dd)! }, { k: 'uranus', ...planetPos('uranus', dd)! },
    { k: 'neptune', ...planetPos('neptune', dd)! }, { k: 'pluto', ...plutoPos(dd) }
  ];

  const { asc, mc: _mc } = calcAngles(dd, lon, lat);
  const ai = Math.floor(norm(asc) / 30);
  const hs = Array.from({ length: 12 }, (_, i) => SIGNS[(ai + i) % 12]);
  const pl: PlanetPos[] = pls.map(pp => ({
    k: pp.k, s: toSign(pp.lon), d: norm(pp.lon) % 30,
    h: ((Math.floor(norm(pp.lon) / 30) - ai + 12) % 12) + 1
  }));

  // Aspects
  const as: Aspect[] = [];
  const AD = [{ t: 'conjunction', a: 0, o: 8 }, { t: 'opposition', a: 180, o: 8 }, { t: 'trine', a: 120, o: 8 }, { t: 'square', a: 90, o: 7 }, { t: 'sextile', a: 60, o: 6 }];
  for (let i = 0; i < pl.length; i++) {
    for (let j = i + 1; j < pl.length; j++) {
      const df = Math.abs(norm(pls[i].lon) - norm(pls[j].lon));
      const nd = df > 180 ? 360 - df : df;
      for (const aa of AD) {
        const ob = Math.abs(nd - aa.a);
        if (ob <= aa.o) as.push({ p1: pl[i].k, p2: pl[j].k, t: aa.t, o: +ob.toFixed(2) });
      }
    }
  }
  as.sort((a, b) => a.o - b.o);

  // Elements & Modalities
  const el: Record<string, number> = { fire: 0, earth: 0, air: 0, water: 0 };
  const moo: Record<string, number> = { cardinal: 0, fixed: 0, mutable: 0 };
  const W: Record<string, number> = { sun: 2, moon: 2, mercury: 1.5, venus: 1.5, mars: 1.5, jupiter: 1, saturn: 1, uranus: .5, neptune: .5, pluto: .5 };
  pl.forEach(pp => {
    const w = W[pp.k] || 0;
    if (w) { el[SIGN_ELEM[pp.s]] += w; moo[SIGN_MODE[pp.s]] += w; }
  });
  const as2 = toSign(asc);
  el[SIGN_ELEM[as2]] += 2;
  moo[SIGN_MODE[as2]] += 2;

  return { pl, b3: { sun: pl[0].s, moon: pl[1].s, asc: as2 }, ad: norm(asc) % 30, hs, as, el, mo: moo };
}

// === TRANSITS ===
export function calcTransits(natal: Omit<AstroChart, 'tr' | 'noTime'>, y: number, mo: number, d: number, h: number, mi: number, lat: number, lon: number): Transit[] {
  const tr = calcChart(y, mo, d, h, mi, lat, lon);
  const res: Transit[] = [];
  const AD = [{ t: 'conjunction', a: 0, o: 3 }, { t: 'opposition', a: 180, o: 3 }, { t: 'trine', a: 120, o: 3 }, { t: 'square', a: 90, o: 3 }, { t: 'sextile', a: 60, o: 2 }];
  const slow = ['jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
  const tgt = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];

  for (const tp of tr.pl) {
    if (!slow.includes(tp.k)) continue;
    const tl = tp.d + SIGNS.indexOf(tp.s) * 30;
    for (const np of natal.pl) {
      if (!tgt.includes(np.k)) continue;
      const nl = np.d + SIGNS.indexOf(np.s) * 30;
      const df = Math.abs(tl - nl);
      const nd = df > 180 ? 360 - df : df;
      for (const aa of AD) {
        const ob = Math.abs(nd - aa.a);
        if (ob <= aa.o) res.push({ tp: tp.k, np: np.k, t: aa.t, o: +ob.toFixed(2), x: ob < 1 ? 1 : 0 });
      }
    }
  }
  res.sort((a, b) => a.o - b.o);
  return res;
}

// === CITIES ===
export const CITIES: Record<string, [number, number]> = {
  macon:[46.31,4.83],paris:[48.86,2.35],lyon:[45.76,4.84],marseille:[43.3,5.37],
  toulouse:[43.6,1.44],nice:[43.71,7.26],bordeaux:[44.84,-.58],nantes:[47.22,-1.55],
  strasbourg:[48.57,7.75],lille:[50.63,3.06],carcassonne:[43.21,2.35],grenoble:[45.19,5.72],
  dijon:[47.32,5.04],montpellier:[43.61,3.88],rennes:[48.12,-1.68],rouen:[49.44,1.1],
  tours:[47.39,.68],brest:[48.39,-4.49],clermont:[45.78,3.09],perpignan:[42.7,2.9],
  toulon:[43.12,5.93],angers:[47.47,-.56],limoges:[45.83,1.26],pau:[43.3,-.37],
  lamongielesisere:[42.91,0.18],lamongie:[42.91,0.18]
};

export function findCity(s: string): [number, number] | null {
  if (!s) return null;
  const k = s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');
  return CITIES[k] || null;
}

// === FULL ASTRO CALCULATION ===
export function calcAstro(bd: string, bt: string, bp: string, tz: number, today: string): AstroChart | null {
  const city = findCity(bp);
  if (!city) return null;

  const noTime = !bt;
  const [y, m, d] = bd.split('-').map(Number);
  const [hh, mm] = bt ? bt.split(':').map(Number) : [12, 0];
  const natal = calcChart(y, m, d, hh - tz, mm, city[0], city[1]);
  const [ty, tm, td] = today.split('-').map(Number);
  const tr = calcTransits(natal, ty, tm, td, 12, 0, city[0], city[1]);

  return { ...natal, tr, noTime };
}
