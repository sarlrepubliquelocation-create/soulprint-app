// ═══ CHINESE ZODIAC ENGINE V3 ═══
// Animal + Element + Yin/Yang + Full Compatibility
// V2: Chinese New Year correction for January/February births
// V3: Rich compatibility (compat, sf, harm, pun, czY) for ProfileTab

// ── Chinese New Year dates (month, day) ──
// Source: Hong Kong Observatory / astronomical calculations
const CNY_DATES: Record<number, [number, number]> = {
  1940:[2,8],1941:[1,27],1942:[2,15],1943:[2,5],1944:[1,25],
  1945:[2,13],1946:[2,2],1947:[1,22],1948:[2,10],1949:[1,29],
  1950:[2,17],1951:[2,6],1952:[1,27],1953:[2,14],1954:[2,3],
  1955:[1,24],1956:[2,12],1957:[1,31],1958:[2,18],1959:[2,8],
  1960:[1,28],1961:[2,15],1962:[2,5],1963:[1,25],1964:[2,13],
  1965:[2,2],1966:[1,21],1967:[2,9],1968:[1,30],1969:[2,17],
  1970:[2,6],1971:[1,27],1972:[2,15],1973:[2,3],1974:[1,23],
  1975:[2,11],1976:[1,31],1977:[2,18],1978:[2,7],1979:[1,28],
  1980:[2,16],1981:[2,5],1982:[1,25],1983:[2,13],1984:[2,2],
  1985:[2,20],1986:[2,9],1987:[1,29],1988:[2,17],1989:[2,6],
  1990:[1,27],1991:[2,15],1992:[2,4],1993:[1,23],1994:[2,10],
  1995:[1,31],1996:[2,19],1997:[2,7],1998:[1,28],1999:[2,16],
  2000:[2,5],2001:[1,24],2002:[2,12],2003:[2,1],2004:[1,22],
  2005:[2,9],2006:[1,29],2007:[2,18],2008:[2,7],2009:[1,26],
  2010:[2,14],2011:[2,3],2012:[1,23],2013:[2,10],2014:[1,31],
  2015:[2,19],2016:[2,8],2017:[1,28],2018:[2,16],2019:[2,5],
  2020:[1,25],2021:[2,12],2022:[2,1],2023:[1,22],2024:[2,10],
  2025:[1,29],2026:[2,17],2027:[2,6],2028:[1,26],2029:[2,13],
  2030:[2,3],
};

// ── Get corrected Chinese zodiac year ──
function getChineseYear(bd: string): number {
  const [y, m, d] = bd.split('-').map(Number);
  const cny = CNY_DATES[y];
  if (cny) {
    // If born before Chinese New Year → previous year's animal
    if (m < cny[0] || (m === cny[0] && d < cny[1])) {
      return y - 1;
    }
  }
  return y;
}

// ── Data ──
const ANIMALS = ['Rat','Bœuf','Tigre','Lapin','Dragon','Serpent','Cheval','Chèvre','Singe','Coq','Chien','Cochon'];
const ANIMAL_SYM = ['🀠','🐂','🐯','🐇','🐉','🐍','🐎','🐏','🐒','🐔','🐕','🐖'];
const ELEMENTS = ['Bois','Feu','Terre','Métal','Eau'];
const ELEM_COLORS: Record<string, string> = {
  'Métal': '#C0C0C0', 'Eau': '#4169E1', 'Bois': '#228B22', 'Feu': '#FF4500', 'Terre': '#DAA520'
};
const YIN_YANG = ['Yang','Yin'];

// Compatibility groups (traditional triads)
const TRIADS: number[][] = [
  [0, 4, 8],   // Rat, Dragon, Singe
  [1, 5, 9],   // Bœuf, Serpent, Coq
  [2, 6, 10],  // Tigre, Cheval, Chien
  [3, 7, 11],  // Lapin, Chèvre, Cochon
];

// Clash pairs (opposition 六冲)
const CLASHES: [number, number][] = [
  [0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11]
];

// Secret friends (六合)
const SECRET_FRIENDS: [number, number][] = [
  [0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]
];

// ── V3: Harm pairs (六害) ──
const HARMS: [number, number][] = [
  [0, 7],   // Rat - Chèvre
  [1, 6],   // Bœuf - Cheval
  [2, 5],   // Tigre - Serpent
  [3, 4],   // Lapin - Dragon
  [8, 11],  // Singe - Cochon
  [9, 10],  // Coq - Chien
];

// ── V3: Punishment pairs (三刑) — primary pair per animal ──
const PUNISHMENTS: [number, number][] = [
  [0, 3],   // Rat → Lapin (刑 d'ingratitude)
  [1, 7],   // Bœuf → Chèvre (刑 d'intimidation)
  [2, 5],   // Tigre → Serpent (刑 de puissance)
  [3, 0],   // Lapin → Rat (刑 d'ingratitude)
  [5, 8],   // Serpent → Singe (刑 de puissance)
  [7, 10],  // Chèvre → Chien (刑 d'intimidation)
  [8, 2],   // Singe → Tigre (刑 de puissance)
  [10, 1],  // Chien → Bœuf (刑 d'intimidation)
  // Dragon(4), Cheval(6), Coq(9), Cochon(11) = auto-punition (pas de paire à afficher)
];

// ── V3: Helper ──
interface AnimalRef { s: string; a: string; }

function mkRef(idx: number): AnimalRef {
  return { s: ANIMAL_SYM[idx], a: ANIMALS[idx] };
}

export interface ChineseZodiac {
  animal: string;
  animalIdx: number;
  elem: string;
  elemCol: string;
  sym: string;
  yy: string;
  czY: string;              // V3: label "Serpent de Feu"
  compat: AnimalRef[];      // V3: triad companions as {s, a}
  sf: AnimalRef;            // V3: secret friend as {s, a}
  clash: AnimalRef;         // V3: clash as {s, a} (was string in V2)
  harm: AnimalRef | null;   // V3: harm partner (六害)
  pun: AnimalRef | null;    // V3: punishment partner (三刑)
  triad: string[];          // V2: kept for backward compat (convergence.ts)
  correctedYear: number;
}

export function calcChineseZodiac(bd: string): ChineseZodiac {
  const chineseYear = getChineseYear(bd);

  const animalIdx = (chineseYear - 4) % 12;
  const animal = ANIMALS[animalIdx];
  const sym = ANIMAL_SYM[animalIdx];
  const elem = ELEMENTS[Math.floor(((chineseYear - 4) % 10) / 2)];
  const elemCol = ELEM_COLORS[elem] || '#888';
  const yy = YIN_YANG[chineseYear % 2];

  // Find triad companions
  const triadGroup = TRIADS.find(t => t.includes(animalIdx)) || [];
  const triadNames = triadGroup.filter(i => i !== animalIdx).map(i => ANIMALS[i]);
  const compat = triadGroup.filter(i => i !== animalIdx).map(i => mkRef(i));

  // Find clash
  const clashPair = CLASHES.find(([a, b]) => a === animalIdx || b === animalIdx);
  const clashIdx = clashPair ? (clashPair[0] === animalIdx ? clashPair[1] : clashPair[0]) : -1;
  const clash = clashIdx >= 0 ? mkRef(clashIdx) : { s: '—', a: '—' };

  // Find secret friend
  const friendPair = SECRET_FRIENDS.find(([a, b]) => a === animalIdx || b === animalIdx);
  const friendIdx = friendPair ? (friendPair[0] === animalIdx ? friendPair[1] : friendPair[0]) : -1;
  const sf = friendIdx >= 0 ? mkRef(friendIdx) : { s: '—', a: '—' };

  // V3: Find harm partner
  const harmPair = HARMS.find(([a, b]) => a === animalIdx || b === animalIdx);
  const harmIdx = harmPair ? (harmPair[0] === animalIdx ? harmPair[1] : harmPair[0]) : -1;
  const harm = harmIdx >= 0 ? mkRef(harmIdx) : null;

  // V3: Find punishment partner
  const punEntry = PUNISHMENTS.find(([a]) => a === animalIdx);
  const pun = punEntry ? mkRef(punEntry[1]) : null;

  return {
    animal, animalIdx, elem, elemCol, sym, yy,
    czY: `${animal} de ${elem}`,
    compat,
    sf,
    clash,
    harm,
    pun,
    triad: triadNames,
    correctedYear: chineseYear,
  };
}
