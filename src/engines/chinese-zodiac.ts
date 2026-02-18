// ═══ CHINESE ZODIAC ENGINE ═══

const CZ_ANIMALS = ['Rat','Bœuf','Tigre','Lapin','Dragon','Serpent','Cheval','Chèvre','Singe','Coq','Chien','Cochon'];
const CZ_SYMBOLS = ['🐀','🐂','🐅','🐇','🐉','🐍','🐎','🐐','🐒','🐓','🐕','🐷'];
const CZ_ELEMENTS = ['Métal','Eau','Bois','Feu','Terre'];
const CZ_ELEM_COLORS = ['#C0C0C0','#00CED1','#4ade80','#FF4444','#CD853F'];

// Chinese New Year lookup (month*100+day) for 1970-2030
const CNY_DATA = [127,127,215,203,123,211,131,218,207,128,216,205,125,213,202,220,209,129,217,206,127,215,204,123,210,131,219,207,128,216,205,124,212,201,122,209,129,218,207,126,214,203,123,210,131,219,208,128,216,205,125,212,201,122,210,129,217,206,126,213,203];

function getCNY(y: number): [number, number] {
  if (y < 1970 || y > 2030) return [2, 5];
  const v = CNY_DATA[y - 1970];
  return [Math.floor(v / 100), v % 100];
}

export interface ChineseZodiac {
  animal: string;
  sym: string;
  elem: string;
  elemCol: string;
  yy: string;        // Yin/Yang
  compat: { a: string; s: string }[];   // Trine affinities
  sf: { a: string; s: string };          // Secret friend
  clash: { a: string; s: string };       // Opposition
  harm: { a: string; s: string } | null; // Hidden tensions
  pun: { a: string; s: string } | null;  // Karmic punishment
  czY: number;
  aIdx: number;
  eIdx: number;
}

export { CZ_ANIMALS, CZ_SYMBOLS, CZ_ELEMENTS, CZ_ELEM_COLORS };

export function calcChineseZodiac(bd: string): ChineseZodiac {
  const [y, m, d] = bd.split('-').map(Number);
  let czY = y;
  const ny = getCNY(y);
  if (ny && (m < ny[0] || (m === ny[0] && d < ny[1]))) czY = y - 1;

  const aIdx = ((czY - 1900) % 12 + 12) % 12;
  const eIdx = Math.floor(((czY - 1900) % 10 + 10) % 10 / 2);
  const yy = czY % 2 === 0 ? 'Yang ☯' : 'Yin ☯';

  // Trine (Triangle of compatibility)
  const trine = [[0, 4, 8], [1, 5, 9], [2, 6, 10], [3, 7, 11]];
  const myTrine = trine.find(t => t.includes(aIdx)) || [];
  const compat = myTrine.filter(i => i !== aIdx);

  // Six Harmony (Secret Friend)
  const sixH: [number, number][] = [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]];
  const mySH = sixH.find(h => h.includes(aIdx));
  const sfIdx = mySH ? mySH.find(i => i !== aIdx) : null;

  // Clash (6 positions apart)
  const clashIdx = (aIdx + 6) % 12;

  // Harm (hidden tensions)
  const harms: [number, number][] = [[0, 7], [1, 6], [2, 5], [3, 4], [8, 11], [9, 10]];
  const harmIdx = harms.find(h => h.includes(aIdx));
  const harmPair = harmIdx ? harmIdx.find(i => i !== aIdx) : null;

  // Punishment (karmic challenges)
  const punish: [number, number][] = [[0, 3], [1, 10], [2, 5], [4, 7], [6, 9], [8, 11]];
  const punIdx = punish.find(p => p.includes(aIdx));
  const punPair = punIdx ? punIdx.find(i => i !== aIdx) : null;

  return {
    animal: CZ_ANIMALS[aIdx],
    sym: CZ_SYMBOLS[aIdx],
    elem: CZ_ELEMENTS[eIdx],
    elemCol: CZ_ELEM_COLORS[eIdx],
    yy,
    compat: compat.map(i => ({ a: CZ_ANIMALS[i], s: CZ_SYMBOLS[i] })),
    sf: sfIdx != null ? { a: CZ_ANIMALS[sfIdx], s: CZ_SYMBOLS[sfIdx] } : { a: '?', s: '?' },
    clash: { a: CZ_ANIMALS[clashIdx], s: CZ_SYMBOLS[clashIdx] },
    harm: harmPair != null ? { a: CZ_ANIMALS[harmPair], s: CZ_SYMBOLS[harmPair] } : null,
    pun: punPair != null ? { a: CZ_ANIMALS[punPair], s: CZ_SYMBOLS[punPair] } : null,
    czY, aIdx, eIdx
  };
}
