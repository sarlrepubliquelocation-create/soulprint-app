// ═══ ASTROLOGY ENGINE V3.1 ═══
// Positions, Aspects, Transits, Elements, Modalities, Placidus, Noeuds, Chiron, Lilith
// V3.1: +Grand Trigone, +T-Carré, +Quinconce, +Sesqui-carré
// V3.0: +Nœuds Lunaires, +Chiron, +Lilith, +Maisons Placidus, +Stelliums, +Dominante Planétaire
// V2.7: Auto-détection DST France

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
  retro?: boolean;  // retrograde (true if apparent backward motion)
  dig?: string;     // dignity: 'dom'|'exa'|'fall'|'exi' or undefined
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

export interface GrandTrine {
  element: string;           // 'fire'|'earth'|'air'|'water'
  planets: [string, string, string];
}

export interface TSquare {
  apex: string;              // planète au sommet (en carré aux deux)
  opposition: [string, string];
}

export interface Stellium {
  type: 'sign' | 'house';
  name: string;    // nom du signe ou "Maison X"
  planets: string[];
}

export interface DominantPlanet {
  planet: string;
  score: number;
  reasons: string[];
}

export interface AstroChart {
  pl: PlanetPos[];
  b3: { sun: string; moon: string; asc: string };
  ad: number;       // asc degree (within sign)
  mcSign: string;   // V3.0: signe du MC
  mcDeg: number;    // V3.0: degré du MC dans son signe
  pof: number;      // V3.0: Part of Fortune (longitude 0-360)
  hs: string[];     // cuspides maisons (signe de chaque cuspide 0-11)
  as: Aspect[];     // aspects
  el: Record<string, number>;  // elements
  mo: Record<string, number>;  // modalities
  tr: Transit[];
  stelliums: Stellium[];       // V3.0: stelliums détectés
  dominant: DominantPlanet[];  // V3.0: dominante planétaire (top 3)
  grandTrines: GrandTrine[];   // V3.1: grands trigones
  tSquares: TSquare[];         // V3.1: T-carrés
  noTime: boolean;
  tzUsed?: number;
  tzSuggested?: number | null;
}

// === CONSTANTS ===
export const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
export const SIGN_FR: Record<string, string> = { Aries:'Bélier',Taurus:'Taureau',Gemini:'Gémeaux',Cancer:'Cancer',Leo:'Lion',Virgo:'Vierge',Libra:'Balance',Scorpio:'Scorpion',Sagittarius:'Sagittaire',Capricorn:'Capricorne',Aquarius:'Verseau',Pisces:'Poissons' };
export const SIGN_SYM: Record<string, string> = { Aries:'♈',Taurus:'♉',Gemini:'♊',Cancer:'♋',Leo:'♌',Virgo:'♍',Libra:'♎',Scorpio:'♏',Sagittarius:'♐',Capricorn:'♑',Aquarius:'♒',Pisces:'♓' };
export const SIGN_ELEM: Record<string, string> = { Aries:'fire',Taurus:'earth',Gemini:'air',Cancer:'water',Leo:'fire',Virgo:'earth',Libra:'air',Scorpio:'water',Sagittarius:'fire',Capricorn:'earth',Aquarius:'air',Pisces:'water' };
export const SIGN_MODE: Record<string, string> = { Aries:'cardinal',Taurus:'fixed',Gemini:'mutable',Cancer:'cardinal',Leo:'fixed',Virgo:'mutable',Libra:'cardinal',Scorpio:'fixed',Sagittarius:'mutable',Capricorn:'cardinal',Aquarius:'fixed',Pisces:'mutable' };

export const PLANET_FR: Record<string, string> = {
  sun:'Soleil', moon:'Lune', mercury:'Mercure', venus:'Vénus', mars:'Mars',
  jupiter:'Jupiter', saturn:'Saturne', uranus:'Uranus', neptune:'Neptune', pluto:'Pluton',
  northNode:'Nœud Nord', southNode:'Nœud Sud', chiron:'Chiron', lilith:'Lilith'
};
export const PLANET_SYM: Record<string, string> = {
  sun:'☉', moon:'☽', mercury:'☿', venus:'♀', mars:'♂',
  jupiter:'♃', saturn:'♄', uranus:'♅', neptune:'♆', pluto:'♇',
  northNode:'☊', southNode:'☋', chiron:'⚷', lilith:'⚸'
};

// Maître traditionnel de chaque signe (pour dominante planétaire)
export const SIGN_RULER: Record<string, string> = {
  Aries:'mars', Taurus:'venus', Gemini:'mercury', Cancer:'moon', Leo:'sun', Virgo:'mercury',
  Libra:'venus', Scorpio:'pluto', Sagittarius:'jupiter', Capricorn:'saturn',
  Aquarius:'uranus', Pisces:'neptune'
};

export const ASPECT_SYM: Record<string, string> = {
  conjunction:'☌', opposition:'☍', trine:'△', square:'□', sextile:'⚹',
  quincunx:'⚻', sesquisquare:'⊼'
};
export const ASPECT_COL: Record<string, string> = {
  conjunction:'#FFD700', opposition:'#FF4444', trine:'#4ade80', square:'#ef4444', sextile:'#60a5fa',
  quincunx:'#FF8C00', sesquisquare:'#FF6347'
};
export const ELEM_FR: Record<string, string> = { fire:'🔥 Feu',earth:'🌍 Terre',air:'💨 Air',water:'💧 Eau' };
export const ELEM_COL: Record<string, string> = { fire:'#FF4444',earth:'#CD853F',air:'#60a5fa',water:'#00CED1' };

// === DIGNITIES (domicile, exaltation, chute, exil) ===
export const DIGNITIES: Record<string, { dom: string[]; exa: string[]; fall: string[]; exi: string[] }> = {
  sun:     { dom: ['Leo'],                    exa: ['Aries'],   fall: ['Libra'],      exi: ['Aquarius'] },
  moon:    { dom: ['Cancer'],                 exa: ['Taurus'],  fall: ['Scorpio'],    exi: ['Capricorn'] },
  mercury: { dom: ['Gemini','Virgo'],         exa: ['Virgo'],   fall: ['Pisces'],     exi: ['Sagittarius','Pisces'] },
  venus:   { dom: ['Taurus','Libra'],         exa: ['Pisces'],  fall: ['Virgo'],      exi: ['Aries','Scorpio'] },
  mars:    { dom: ['Aries','Scorpio'],        exa: ['Capricorn'],fall: ['Cancer'],    exi: ['Taurus','Libra'] },
  jupiter: { dom: ['Sagittarius','Pisces'],   exa: ['Cancer'],  fall: ['Capricorn'],  exi: ['Gemini','Virgo'] },
  saturn:  { dom: ['Capricorn','Aquarius'],   exa: ['Libra'],   fall: ['Aries'],      exi: ['Cancer','Leo'] },
  uranus:  { dom: ['Aquarius'],               exa: ['Scorpio'], fall: ['Taurus'],     exi: ['Leo'] },
  neptune: { dom: ['Pisces'],                 exa: ['Cancer'],  fall: ['Capricorn'],  exi: ['Virgo'] },
  pluto:   { dom: ['Scorpio'],                exa: ['Leo'],     fall: ['Aquarius'],   exi: ['Taurus'] },
};

export const DIG_SYM: Record<string, string> = { dom: '🏠', exa: '↑', fall: '↓', exi: '⊘' };
export const DIG_FR: Record<string, string> = { dom: 'Domicile', exa: 'Exaltation', fall: 'Chute', exi: 'Exil' };

export function getDignity(planet: string, sign: string): string | null {
  const d = DIGNITIES[planet];
  if (!d) return null;
  if (d.dom.includes(sign)) return 'dom';
  if (d.exa.includes(sign)) return 'exa';
  if (d.fall.includes(sign)) return 'fall';
  if (d.exi.includes(sign)) return 'exi';
  return null;
}

// === RETROGRADE DETECTION ===
// Geocentric longitude helper (reuses existing calc functions)
function geoLon(name: string, d: number): number | null {
  if (name === 'sun') return sunPos(d).lon;
  if (name === 'moon') return moonPos(d).lon;
  if (name === 'pluto') return plutoPos(d).lon;
  const p = planetPos(name, d);
  return p ? p.lon : null;
}

export function isRetrograde(name: string, d: number): boolean {
  if (name === 'sun' || name === 'moon') return false;
  const l1 = geoLon(name, d - 1);
  const l2 = geoLon(name, d + 1);
  if (l1 === null || l2 === null) return false;
  let diff = l2 - l1;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff < 0;
}

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

// ═══ V3.0 — NŒUDS LUNAIRES, CHIRON, LILITH ═══

// Nœud Nord Moyen (Mean Node) — formule Meeus, précision < 0.05° sur 1900-2100
export function calcNodes(dd: number): { northNode: number; southNode: number } {
  const T = dd / 36525;
  const NN = norm(
    125.0445479
    - 1934.136261 * T
    + 0.0020754 * T * T
    + T * T * T / 467441
    - T * T * T * T / 60616000
  );
  return { northNode: NN, southNode: norm(NN + 180) };
}

// Chiron — formule Meeus, précision < 0.5° sur 1900-2100
export function calcChiron(dd: number): number {
  const T = dd / 36525;
  return norm(209.366 + 0.019985 * dd + 0.000207 * T * T);
}

// Lilith (Lune Noire Moyenne = apogée lunaire) — Meeus, précision < 0.02°
export function calcLilith(dd: number): number {
  return norm(83.3532 + 0.111404 * dd);
}

// ═══ V3.0 — MAISONS PLACIDUS ═══

// Conversion RA → longitude écliptique
function eclipticFromRA(ra: number, obl: number): number {
  const oblR = obl * Math.PI / 180;
  const raR = ra * Math.PI / 180;
  const sinDec = Math.sin(oblR) * Math.sin(raR);
  const dec = Math.asin(Math.max(-1, Math.min(1, sinDec)));
  const lon = Math.atan2(Math.cos(oblR) * Math.sin(raR), Math.cos(raR));
  return norm(lon * 180 / Math.PI);
}

// Calcul des 12 cuspides Placidus (itératif, stable pour lat 42-60°)
function calcPlacidusHouses(asc: number, mc: number, ramc: number, obl: number, lat: number): number[] {
  const hs = new Array(12).fill(0);
  hs[0] = norm(asc);         // Maison 1 = ASC
  hs[9] = norm(mc);          // Maison 10 = MC
  hs[3] = norm(asc + 180);   // Maison 4 = IC
  hs[6] = norm(mc + 180);    // Maison 7 = DSC

  const oblR = obl * Math.PI / 180;
  const latR = lat * Math.PI / 180;

  const placidusCusp = (quadrant: number): number => {
    let ra = norm(ramc + quadrant * 30);
    for (let i = 0; i < 30; i++) {
      const raR = ra * Math.PI / 180;
      const sinDec = Math.sin(oblR) * Math.sin(raR);
      const dec = Math.asin(Math.max(-1, Math.min(1, sinDec)));
      const cosD = Math.cos(dec);
      if (Math.abs(cosD) < 1e-10) break;
      const adRaw = Math.atan(Math.tan(latR) * Math.sin(dec) / cosD);
      const ad = adRaw * 180 / Math.PI;
      ra = norm(ramc + quadrant * 30 - ad * (quadrant / 3));
    }
    return ra;
  };

  hs[10] = eclipticFromRA(placidusCusp(1), obl);  // Maison 11
  hs[11] = eclipticFromRA(placidusCusp(2), obl);  // Maison 12
  hs[1]  = eclipticFromRA(placidusCusp(3), obl);  // Maison 2
  hs[2]  = eclipticFromRA(placidusCusp(4), obl);  // Maison 3

  return hs.map(norm);
}

// Trouver la maison d'une planète selon les cuspides (gère le franchissement de 0°)
function getPlanetHousePlacidus(lon: number, cusps: number[]): number {
  const l = norm(lon);
  for (let i = 0; i < 12; i++) {
    const c1 = cusps[i];
    const c2 = cusps[(i + 1) % 12];
    if (c1 < c2) {
      if (l >= c1 && l < c2) return i + 1;
    } else {
      if (l >= c1 || l < c2) return i + 1;
    }
  }
  return 1;
}

// ═══ V3.0 — STELLIUMS ═══
export function detectStelliums(pl: PlanetPos[]): Stellium[] {
  const corePlanets = ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto','northNode'];
  const filtered = pl.filter(p => corePlanets.includes(p.k));
  const result: Stellium[] = [];

  // Par signe
  const bySgn: Record<string, string[]> = {};
  filtered.forEach(p => { (bySgn[p.s] = bySgn[p.s] || []).push(p.k); });
  Object.entries(bySgn).forEach(([sign, planets]) => {
    if (planets.length >= 3) result.push({ type: 'sign', name: sign, planets });
  });

  // Par maison
  const byH: Record<number, string[]> = {};
  filtered.forEach(p => { (byH[p.h] = byH[p.h] || []).push(p.k); });
  Object.entries(byH).forEach(([house, planets]) => {
    if (planets.length >= 3) result.push({ type: 'house', name: `Maison ${house}`, planets });
  });

  return result;
}

// ═══ V3.1 — GRAND TRIGONE + T-CARRÉ ═══

export function detectGrandTrines(aspects: Aspect[], pl: PlanetPos[]): GrandTrine[] {
  const result: GrandTrine[] = [];
  const trines = aspects.filter(a => a.t === 'trine');
  if (trines.length < 3) return result;

  // Construire le graphe des trigones
  const connected: Record<string, Set<string>> = {};
  trines.forEach(a => {
    (connected[a.p1] = connected[a.p1] || new Set()).add(a.p2);
    (connected[a.p2] = connected[a.p2] || new Set()).add(a.p1);
  });

  const planets = Object.keys(connected);
  const seen = new Set<string>();

  for (let i = 0; i < planets.length; i++) {
    for (const j of connected[planets[i]]) {
      if (!connected[j]) continue;
      for (const k of connected[planets[i]]) {
        if (k === j) continue;
        if (!connected[j].has(k)) continue;
        // Triplet trouvé : planets[i], j, k
        const trio = [planets[i], j, k].sort().join('|');
        if (seen.has(trio)) continue;
        seen.add(trio);

        // Vérifier même élément
        const elems = [planets[i], j, k].map(pk => {
          const p = pl.find(pp => pp.k === pk);
          return p ? SIGN_ELEM_MAP[p.s] : null;
        });
        if (elems[0] && elems[0] === elems[1] && elems[1] === elems[2]) {
          result.push({ element: elems[0], planets: [planets[i], j, k] as [string, string, string] });
        }
      }
    }
  }
  return result;
}

export function detectTSquares(aspects: Aspect[], pl: PlanetPos[]): TSquare[] {
  const result: TSquare[] = [];
  const oppositions = aspects.filter(a => a.t === 'opposition');
  const squares = aspects.filter(a => a.t === 'square');
  if (!oppositions.length || squares.length < 2) return result;

  const seen = new Set<string>();

  for (const opp of oppositions) {
    const { p1, p2 } = opp;
    // Chercher une planète en carré avec les deux
    const candidateSquares = squares.filter(
      sq => (sq.p1 === p1 || sq.p2 === p1) && (sq.p1 === p2 || sq.p2 === p2)
    );
    // candidateSquares vide — chercher planète qui est en carré avec p1 ET en carré avec p2
    const sqWithP1 = squares.filter(sq => sq.p1 === p1 || sq.p2 === p1)
      .map(sq => sq.p1 === p1 ? sq.p2 : sq.p1);
    const sqWithP2 = squares.filter(sq => sq.p1 === p2 || sq.p2 === p2)
      .map(sq => sq.p1 === p2 ? sq.p2 : sq.p1);

    for (const apex of sqWithP1) {
      if (!sqWithP2.includes(apex)) continue;
      const key = [p1, p2, apex].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ apex, opposition: [p1, p2] });
    }
  }
  return result;
}

// Map locale signe→élément pour les fonctions de détection
const SIGN_ELEM_MAP: Record<string, string> = {
  Aries:'fire', Taurus:'earth', Gemini:'air', Cancer:'water',
  Leo:'fire', Virgo:'earth', Libra:'air', Scorpio:'water',
  Sagittarius:'fire', Capricorn:'earth', Aquarius:'air', Pisces:'water'
};

// ═══ V3.0 — DOMINANTE PLANÉTAIRE ═══
export function calcDominantPlanet(
  pl: PlanetPos[],
  aspects: Aspect[],
  b3: { sun: string; moon: string; asc: string },
  mcSign: string
): DominantPlanet[] {
  const corePlanets = ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto'];
  const scores = new Map<string, { score: number; reasons: string[] }>();

  pl.filter(p => corePlanets.includes(p.k)).forEach(p => {
    let score = 0;
    const reasons: string[] = [];

    // Dignités
    const dig = getDignity(p.k, p.s);
    if (dig === 'dom') { score += 4; reasons.push('Domicile'); }
    else if (dig === 'exa') { score += 3; reasons.push('Exaltation'); }

    // Maîtrise des points clés
    if (SIGN_RULER[b3.sun] === p.k)  { score += 3; reasons.push('Maître ☉'); }
    if (SIGN_RULER[b3.moon] === p.k) { score += 2; reasons.push('Maître ☽'); }
    if (SIGN_RULER[b3.asc] === p.k)  { score += 3; reasons.push('Maître ASC'); }
    if (SIGN_RULER[mcSign] === p.k)  { score += 2; reasons.push('Maître MC'); }

    // Maisons angulaires
    if (p.h === 1)  { score += 3; reasons.push('Maison 1'); }
    if (p.h === 10) { score += 3; reasons.push('Maison 10'); }
    if (p.h === 4 || p.h === 7) { score += 1; reasons.push('Maison angulaire'); }

    // Aspects (planète la plus aspectée)
    const aspCount = aspects.filter(a => a.p1 === p.k || a.p2 === p.k).length;
    if (aspCount >= 4) { score += 2; reasons.push(`${aspCount} aspects`); }
    else if (aspCount >= 2) { score += 1; }

    // Pas d'aspects difficiles → légère prime
    const hardAsp = aspects.filter(a => (a.p1 === p.k || a.p2 === p.k) && (a.t === 'square' || a.t === 'opposition'));
    if (hardAsp.length === 0 && aspCount > 0) { score += 1; reasons.push('Sans tensions'); }

    scores.set(p.k, { score, reasons });
  });

  return Array.from(scores.entries())
    .map(([planet, data]) => ({ planet, score: data.score, reasons: data.reasons }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function calcAngles(d: number, gLon: number, gLat: number) {
  const JD = d + 2451543.5, D = JD - 2451545, T = D / 36525;
  const GMST = norm(280.46061837 + 360.98564736629 * D + .000387933 * T * T);
  const LST = norm(GMST + gLon);          // = RAMC en degrés
  const obl = 23.4393 - .013 * T;
  const mc = norm(atan2d(sin(LST), cos(LST) * cos(obl)));
  const asc = norm(atan2d(cos(LST), -(sin(obl) * tan(gLat) + cos(obl) * sin(LST))));
  return { asc, mc, ramc: LST, obl };     // V3.0: expose ramc+obl pour Placidus
}

const toSign = (l: number) => SIGNS[Math.floor(norm(l) / 30)];

// === MAIN CHART CALCULATION — V3.0 ===
export function calcChart(
  y: number, mo: number, d: number, h: number, mi: number,
  lat: number, lon: number,
  noTimeFallback = false   // si true → Equal House (heure inconnue)
): Omit<AstroChart, 'tr' | 'noTime'> {
  const dd = d0(y, mo, d, h, mi);
  const s = sunPos(dd), m = moonPos(dd);

  // ── Positions 10 planètes classiques ──
  const pls: { k: string; lon: number }[] = [
    { k: 'sun', lon: s.lon }, { k: 'moon', lon: m.lon },
    { k: 'mercury', ...planetPos('mercury', dd)! }, { k: 'venus', ...planetPos('venus', dd)! },
    { k: 'mars', ...planetPos('mars', dd)! }, { k: 'jupiter', ...planetPos('jupiter', dd)! },
    { k: 'saturn', ...planetPos('saturn', dd)! }, { k: 'uranus', ...planetPos('uranus', dd)! },
    { k: 'neptune', ...planetPos('neptune', dd)! }, { k: 'pluto', ...plutoPos(dd) }
  ];

  // ── V3.0 : Nœuds, Chiron, Lilith ──
  const nodes = calcNodes(dd);
  pls.push({ k: 'northNode', lon: nodes.northNode });
  pls.push({ k: 'southNode', lon: nodes.southNode });
  pls.push({ k: 'chiron', lon: calcChiron(dd) });
  pls.push({ k: 'lilith', lon: calcLilith(dd) });

  // ── Angles ASC + MC ──
  const { asc, mc, ramc, obl } = calcAngles(dd, lon, lat);
  const ascSign = toSign(asc);
  const mcSign = toSign(mc);

  // ── Maisons : Placidus si heure connue, Equal sinon ──
  let cusps: number[];
  let houseMode: 'placidus' | 'equal';
  if (!noTimeFallback && Math.abs(lat) < 65) {
    cusps = calcPlacidusHouses(asc, mc, ramc, obl, lat);
    houseMode = 'placidus';
  } else {
    const ai = Math.floor(norm(asc) / 30);
    cusps = Array.from({ length: 12 }, (_, i) => ((ai + i) % 12) * 30);
    houseMode = 'equal';
  }

  // ── Calcul PlanetPos avec maison Placidus ──
  const pl: PlanetPos[] = pls.map(pp => {
    const sign = toSign(pp.lon);
    return {
      k: pp.k, s: sign, d: +( norm(pp.lon) % 30).toFixed(2),
      h: getPlanetHousePlacidus(pp.lon, cusps),
      retro: ['northNode','southNode','chiron','lilith'].includes(pp.k) ? false : isRetrograde(pp.k, dd),
      dig: getDignity(pp.k, sign) || undefined,
    };
  });

  // ── hs[] = signe de chaque cuspide (compat affichage existant) ──
  const hs = cusps.map(c => toSign(c));

  // ── Part of Fortune (jour/nuit) ──
  const sunLon = pls[0].lon, moonLon = pls[1].lon;
  const isDay = norm(sunLon - asc) < 180;
  const pof = norm(isDay ? asc + moonLon - sunLon : asc + sunLon - moonLon);

  // ── Aspects (10 planètes classiques seulement — pas nœuds/chiron/lilith pour éviter le bruit) ──
  const aspPls = pls.slice(0, 10);
  const aspPlPos = pl.slice(0, 10);
  const as: Aspect[] = [];
  const AD = [
    { t: 'conjunction', a: 0, o: 8 }, { t: 'opposition', a: 180, o: 8 },
    { t: 'trine', a: 120, o: 8 }, { t: 'square', a: 90, o: 7 }, { t: 'sextile', a: 60, o: 6 },
    { t: 'quincunx', a: 150, o: 3 }, { t: 'sesquisquare', a: 135, o: 2 }  // V3.1
  ];
  for (let i = 0; i < aspPls.length; i++) {
    for (let j = i + 1; j < aspPls.length; j++) {
      const df = Math.abs(norm(aspPls[i].lon) - norm(aspPls[j].lon));
      const nd = df > 180 ? 360 - df : df;
      for (const aa of AD) {
        const ob = Math.abs(nd - aa.a);
        if (ob <= aa.o) as.push({ p1: aspPlPos[i].k, p2: aspPlPos[j].k, t: aa.t, o: +ob.toFixed(2) });
      }
    }
  }
  as.sort((a, b) => a.o - b.o);

  // ── Éléments & Modalités ──
  const el: Record<string, number> = { fire: 0, earth: 0, air: 0, water: 0 };
  const moo: Record<string, number> = { cardinal: 0, fixed: 0, mutable: 0 };
  const W: Record<string, number> = { sun: 2, moon: 2, mercury: 1.5, venus: 1.5, mars: 1.5, jupiter: 1, saturn: 1, uranus: .5, neptune: .5, pluto: .5 };
  pl.slice(0, 10).forEach(pp => {
    const w = W[pp.k] || 0;
    if (w) { el[SIGN_ELEM[pp.s]] += w; moo[SIGN_MODE[pp.s]] += w; }
  });
  el[SIGN_ELEM[ascSign]] += 2;
  moo[SIGN_MODE[ascSign]] += 2;

  // ── V3.0 : Stelliums + Dominante ──
  const stelliums = detectStelliums(pl);
  const b3 = { sun: pl[0].s, moon: pl[1].s, asc: ascSign };
  const dominant = calcDominantPlanet(pl, as, b3, mcSign);

  // ── V3.1 : Grand Trigone + T-Carré ──
  const grandTrines = detectGrandTrines(as, pl);
  const tSquares = detectTSquares(as, pl);

  return {
    pl, b3,
    ad: +(norm(asc) % 30).toFixed(2),
    mcSign, mcDeg: +(norm(mc) % 30).toFixed(2),
    pof,
    hs, as, el, mo: moo,
    stelliums, dominant,
    grandTrines, tSquares,
  };
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

// === AUTO-DÉTECTION FUSEAU HORAIRE FRANCE (V2.7) ===
// Fix critique : ASC Jérôme = Cancer 4° (pas Gémeaux) → causé par tz=1 au lieu de tz=2 en été
// France : CET (UTC+1) en hiver, CEST (UTC+2) en été
// Règles DST : avant 1976 = pas de DST, 1976-1995 = dernier dim mars→dernier dim sept,
// 1996+ = dernier dim mars→dernier dim octobre (harmonisation EU)

function lastSundayOfMonth(year: number, month: number): number {
  // Dernier jour du mois, puis reculer jusqu'au dimanche
  const last = new Date(year, month, 0); // month is 1-indexed here (0 = last day of previous month)
  const dow = last.getDay(); // 0=Sunday
  return last.getDate() - dow;
}

function isFranceDST(year: number, month: number, day: number): boolean {
  if (year < 1976) return false;

  // DST start: dernier dimanche de mars
  const dstStart = lastSundayOfMonth(year, 3); // mars = 3
  // DST end: dernier dimanche de septembre (1976-1995) ou octobre (1996+)
  const endMonth = year >= 1996 ? 10 : 9;
  const dstEnd = lastSundayOfMonth(year, endMonth);

  // Avant mars ou après le mois de fin → hiver
  if (month < 3 || month > endMonth) return false;
  // En plein milieu → été
  if (month > 3 && month < endMonth) return true;
  // Mars : après ou le jour du changement → été
  if (month === 3) return day >= dstStart;
  // Mois de fin : avant le jour du changement → été
  if (month === endMonth) return day < dstEnd;
  return false;
}

// Villes françaises connues → auto-détection
const FRENCH_CITIES = new Set([
  'paris', 'lyon', 'marseille', 'toulouse', 'nice', 'nantes', 'strasbourg',
  'montpellier', 'bordeaux', 'lille', 'rennes', 'reims', 'toulon', 'grenoble',
  'dijon', 'angers', 'nimes', 'clermont', 'macon', 'perpignan', 'metz',
  'besancon', 'orleans', 'rouen', 'mulhouse', 'caen', 'nancy', 'pau',
  'carcassonne', 'bagneres', 'lamongie', 'tarbes', 'lourdes', 'foix',
  'biarritz', 'bayonne', 'ajaccio', 'bastia', 'avignon', 'aix',
]);

/**
 * Suggère le fuseau UTC correct basé sur la ville et la date de naissance.
 * Retourne null si la ville n'est pas reconnue comme française.
 */
export function suggestTimezone(bd: string, city: string): number | null {
  const normalized = city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');
  if (!FRENCH_CITIES.has(normalized)) return null;
  const [y, m, d] = bd.split('-').map(Number);
  return isFranceDST(y, m, d) ? 2 : 1;
}

// ══════════════════════════════════════════════════
// === TRANSITS PERSONNELS GAUSSIENS V4.8 ±15 ===
// ══════════════════════════════════════════════════
// Modèle GPT+Gemini validé : σ=1.2°, aspects harmonic/tense, amplitudes par planète
// Sources : astrologie classique (Reinhold Ebertin, Robert Hand — Planets in Transit)

export interface PersonalTransitBreakdown {
  transitPlanet: string;
  natalPoint: string;
  aspectType: 'harmonic' | 'tense' | 'conjunction';
  orb: number;
  intensity: number;     // 0-1 (gaussienne)
  amplitude: number;     // amplitude signée selon planète + aspect
  score: number;         // amplitude × intensity
}

export interface PersonalTransitResult {
  total: number;                           // score total cappé ±15
  breakdown: PersonalTransitBreakdown[];
}

// Aspects harmoniques (trigone, sextile) vs tendus (carré, opposition)
const HARMONIC_ASPECTS = new Set(['trine', 'sextile']);
const TENSE_ASPECTS = new Set(['square', 'opposition']);

// Amplitudes par planète : { harmonic, tense, conjunction }
// Valeurs calibrées relative au pipeline (BaZi±22, Num±14) — cap ±15 total
const TRANSIT_AMPLITUDES: Record<string, { harmonic: number; tense: number; conjunction: number }> = {
  jupiter:  { harmonic:  6, tense: -2, conjunction:  6 },
  saturn:   { harmonic:  4, tense: -8, conjunction: -6 },
  uranus:   { harmonic:  6, tense: -6, conjunction:  5 },
  neptune:  { harmonic:  5, tense: -5, conjunction:  3 },
  pluto:    { harmonic: 10, tense: -10, conjunction: -8 },
};

// Multiplicateurs sur les points nataux sensibles
const NATAL_MULTIPLIERS: Record<string, number> = {
  sun:  1.5,
  moon: 1.5,
  asc:  1.2,   // Ascendant représenté comme point natal dans Transit.np
};

// ── Sprint F — Vitesses planétaires de référence (°/j) ──
// Valeurs médianes (directes + rétrogrades confondues) — Meeus Astronomical Algorithms
const PLANET_VREF: Record<string, number> = {
  jupiter: 0.083,
  saturn:  0.034,
  uranus:  0.012,
  neptune: 0.006,
  pluto:   0.004,
};

// stationFactor — 3 paliers (consensus Ronde 11 · Gemini architecture + Grok Vakra védique)
// Sources : Ptolémée "intensification aux stations" · Robert Hand Planets in Transit
// Paliers : station totale (Vakra) ratio<0.10 → ×2.0 | quasi-station ratio<0.30 → ×1.3 | normal ×1.0
function stationFactor(planet: string, speed: number): number {
  const vRef = PLANET_VREF[planet];
  if (!vRef) return 1.0; // Soleil/Lune/internes → pas de station significative
  const ratio = Math.abs(speed) / vRef;
  if (ratio < 0.10) return 2.0;  // station totale (Vakra)
  if (ratio < 0.30) return 1.3;  // quasi-station
  return 1.0;                    // vitesse normale
}

// ── Stelliums V8.4 : synergie multi-planètes ──
// Bonus conditionnel quand un transit lent touche directement une planète d'un stellium natal.
// Anti-double-comptage V8.2 : si le point natal a déjà un aspect tendu natal (structuralMod ×0.70),
// on skip ce membre pour ne pas compenser la tension déjà prise en compte.
// Cap ±3 (module) — s'additionne au total avant cap global ±15.
// Condition d'activation : transit slow directement sur planète du stellium (t.np === p).
function calcStelliumBonus(
  stelliums: Stellium[],
  transits: Transit[],
  natalAspects: Aspect[]
): number {
  if (!stelliums.length || !transits.length) return 0;
  const TENSE_NATAL = new Set(['square', 'opposition']);
  const SLOW = new Set(['jupiter', 'saturn', 'uranus', 'neptune', 'pluto']);
  let bonus = 0;
  for (const s of stelliums) {
    if (s.type !== 'sign' || s.planets.length < 3) continue;
    for (const p of s.planets) {
      // Guard V8.2 : point natal avec aspect tendu natal serré → V8.2 gère déjà la tension, skip
      const hasTenseNatal = natalAspects.some(a =>
        (a.p1 === p || a.p2 === p) && TENSE_NATAL.has(a.t) && a.o < 4
      );
      if (hasTenseNatal) continue;
      const activeTransit = transits.find(t => t.np === p && SLOW.has(t.tp));
      if (activeTransit) {
        bonus += activeTransit.t === 'conjunction' ? 2 : 1;
      }
    }
  }
  return Math.max(-3, Math.min(3, bonus));
}

/**
 * Calcule les transits personnels gaussiens à partir des transits déjà calculés.
 * @param transits      - tableau Transit[] issu de AstroChart.tr
 * @param sigma         - écart-type gaussien en degrés (défaut 1.2° — consensus GPT+Gemini)
 * @param natalAspects  - aspects nataux (AstroChart.as) pour filtre natal (optionnel — backward compat)
 * @param natalPlanets  - positions natales (AstroChart.pl) pour dignités (optionnel — backward compat)
 * @param stelliums     - stelliums nataux (AstroChart.stelliums) pour synergie multi-hit (optionnel — backward compat)
 * @returns PersonalTransitResult avec score total ±15 et breakdown détaillé
 *
 * Filtre natal (V8.2) : si le point natal activé par un transit est lui-même impliqué
 * dans un aspect natal structurel, on applique un modificateur :
 *   Carré/Opposition natal → ×0.70 (tension structurelle sous-jacente)
 *   Trigone/Sextile natal  → ×1.20 (soutien structural — transit bénéficie du flux)
 *   Conjonction natale      → ×1.10 (résonance planétaire renforcée)
 * Si plusieurs aspects nataux touchent le même point → on garde le plus fort (anti-double-comptage).
 *
 * Dignités planétaires (V8.3) : la dignité du point natal activé module l'amplitude.
 *   Domicile   → ×1.20 (planète forte sur son territoire — transit amplifié)
 *   Exaltation → ×1.15 (planète exaltée — résonance positive renforcée)
 *   Exil       → ×0.85 (planète affaiblie — transit atténué)
 *   Chute      → ×0.80 (planète en chute — transit encore plus atténué)
 *   Aucune     → ×1.00 (comportement inchangé)
 *
 * Stelliums V8.4 : bonus conditionnel si transit touche planète d'un stellium natal (cap ±3).
 *   Guard anti-double-comptage V8.2 : membres avec aspect tendu natal serré exclus.
 */
export function calcPersonalTransits(
  transits: Transit[],
  sigma = 1.2,
  natalAspects?: Aspect[],
  natalPlanets?: PlanetPos[],
  stelliums?: Stellium[],
  planetSpeeds?: Record<string, number>  // Sprint F — vitesse °/j par planète (stationFactor)
): PersonalTransitResult {
  const sigmaSq2 = 2 * sigma * sigma;
  const gaussian = (orb: number) => Math.exp(-(orb * orb) / sigmaSq2);

  // ── Pré-calcul filtre natal : modificateur dominant par point natal ──
  // Pour chaque planète natale, on cherche l'aspect natal ayant le plus fort impact.
  // Priorité : carré/opp (×0.70) > trigone/sextile (×1.20) > conjonction (×1.10)
  // Un aspect implique 2 planètes (p1 et p2) — les deux reçoivent le modificateur.
  const natalModifier = new Map<string, number>();
  if (natalAspects && natalAspects.length > 0) {
    const TENSE_NATAL   = new Set(['square', 'opposition']);
    const HARMONIC_NATAL = new Set(['trine', 'sextile']);
    for (const asp of natalAspects) {
      let mod = 1.0;
      if (TENSE_NATAL.has(asp.t))    mod = 0.70;
      else if (HARMONIC_NATAL.has(asp.t)) mod = 1.20;
      else if (asp.t === 'conjunction')   mod = 1.10;
      else continue; // quinconce/sesquisquare → pas de modificateur
      // Appliquer aux deux planètes de l'aspect natal
      for (const pt of [asp.p1, asp.p2]) {
        const prev = natalModifier.get(pt) ?? 1.0;
        // Garder le modificateur le plus éloigné de 1.0 (= le plus fort)
        if (Math.abs(mod - 1.0) > Math.abs(prev - 1.0)) {
          natalModifier.set(pt, mod);
        }
      }
    }
  }

  // ── Pré-calcul filtre dignités (V8.3) : modificateur par point natal selon dignité ──
  // Domicile ×1.20 · Exaltation ×1.15 · Exil ×0.85 · Chute ×0.80 · Aucune ×1.00
  const dignityModifier = new Map<string, number>();
  if (natalPlanets && natalPlanets.length > 0) {
    const DIG_MOD: Record<string, number> = { dom: 1.20, exa: 1.15, exi: 0.85, fall: 0.80 };
    for (const pl of natalPlanets) {
      if (pl.dig && DIG_MOD[pl.dig] !== undefined) {
        dignityModifier.set(pl.k, DIG_MOD[pl.dig]);
      }
    }
  }

  let total = 0;
  const breakdown: PersonalTransitBreakdown[] = [];

  for (const tr of transits) {
    const ampTable = TRANSIT_AMPLITUDES[tr.tp];
    if (!ampTable) continue; // planète non slow → skip

    // Type d'aspect → amplitude signée
    let aspectType: 'harmonic' | 'tense' | 'conjunction';
    let amplitude: number;

    if (tr.t === 'conjunction') {
      aspectType = 'conjunction';
      amplitude = ampTable.conjunction;
    } else if (HARMONIC_ASPECTS.has(tr.t)) {
      aspectType = 'harmonic';
      amplitude = ampTable.harmonic;
    } else if (TENSE_ASPECTS.has(tr.t)) {
      aspectType = 'tense';
      amplitude = ampTable.tense;
    } else {
      continue; // aspect non géré → skip
    }

    // Multiplicateur natal (Soleil/Lune ×1.5, Asc ×1.2, autres ×1.0)
    const natalMult = NATAL_MULTIPLIERS[tr.np] ?? 1.0;

    // Filtre natal V8.2 : modificateur structurel du point natal activé
    const structuralMod = natalModifier.get(tr.np) ?? 1.0;

    // Dignités V8.3 : modificateur dignité du point natal activé
    const dignityMod = dignityModifier.get(tr.np) ?? 1.0;

    const intensity = gaussian(tr.o);
    // Sprint F — stationFactor : amplification si planète stationnaire (Vakra)
    const sf    = (planetSpeeds && planetSpeeds[tr.tp] !== undefined)
                  ? stationFactor(tr.tp, planetSpeeds[tr.tp])
                  : 1.0;
    const score = amplitude * natalMult * structuralMod * dignityMod * intensity * sf;

    total += score;

    breakdown.push({
      transitPlanet: tr.tp,
      natalPoint: tr.np,
      aspectType,
      orb: tr.o,
      intensity: +intensity.toFixed(3),
      amplitude: +(amplitude * natalMult * structuralMod * dignityMod * sf).toFixed(2),
      score: +score.toFixed(2),
    });
  }

  // Stelliums V8.4 : bonus synergie multi-planètes conditionnel
  if (stelliums && stelliums.length > 0 && natalAspects) {
    total += calcStelliumBonus(stelliums, transits, natalAspects);
  }

  // Cap ±15
  total = Math.max(-15, Math.min(15, total));

  return { total: +total.toFixed(2), breakdown };
}

// === FULL ASTRO CALCULATION ===
// V2.7: Si tz provient du sélecteur manuel, on vérifie la cohérence avec la DST française
export function calcAstro(bd: string, bt: string, bp: string, tz: number, today: string): AstroChart | null {
  const city = findCity(bp);
  if (!city) return null;

  const noTime = !bt;
  const [y, m, d] = bd.split('-').map(Number);
  const [hh, mm] = bt ? bt.split(':').map(Number) : [12, 0];

  // Auto-correction DST France : si l'utilisateur a mis tz=1 en été ou tz=2 en hiver
  const suggestedTz = suggestTimezone(bd, bp);
  const effectiveTz = suggestedTz !== null ? suggestedTz : tz;

  const natal = calcChart(y, m, d, hh - effectiveTz, mm, city[0], city[1], noTime);
  const [ty, tm, td] = today.split('-').map(Number);
  const tr = calcTransits(natal, ty, tm, td, 12, 0, city[0], city[1]);

  return { ...natal, tr, noTime, tzUsed: effectiveTz, tzSuggested: suggestedTz };
}

// ── A1.1 : Longitude géocentrique planétaire pour une date quelconque ──
// Wrapper export autour des fonctions Meeus internes (utilisé par returns.ts)
export function getPlanetLongitudeForDate(
  planet: 'sun' | 'moon' | 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune' | 'pluto' | 'northNode',
  date: Date
): number {
  const y = date.getFullYear(), mo = date.getMonth() + 1, d = date.getDate();
  const dd = d0(y, mo, d, 12, 0); // midi UTC
  if (planet === 'sun')       return sunPos(dd).lon;
  if (planet === 'moon')      return moonPos(dd).lon;
  if (planet === 'northNode') return calcNodes(dd).northNode;
  if (planet === 'pluto')     return plutoPos(dd).lon;
  const pos = planetPos(planet, dd);
  return pos ? pos.lon : 0;
}
