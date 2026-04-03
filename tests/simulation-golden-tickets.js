"use strict";

// src/engines/numerology.ts
var PYTH_MAP = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 5,
  F: 6,
  G: 7,
  H: 8,
  I: 9,
  J: 1,
  K: 2,
  L: 3,
  M: 4,
  N: 5,
  O: 6,
  P: 7,
  Q: 8,
  R: 9,
  S: 1,
  T: 2,
  U: 3,
  V: 4,
  W: 5,
  X: 6,
  Y: 7,
  Z: 8
};
var CHALD_MAP = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 5,
  F: 8,
  G: 3,
  H: 5,
  I: 1,
  J: 1,
  K: 2,
  L: 3,
  M: 4,
  N: 5,
  O: 7,
  P: 8,
  Q: 1,
  R: 2,
  S: 3,
  T: 4,
  U: 6,
  V: 6,
  W: 6,
  X: 5,
  Y: 1,
  Z: 7
};
var VOWELS = new Set("AEIOU".split(""));
var MASTER_NUMBERS = /* @__PURE__ */ new Set([11, 22, 33]);
function isYVowel(chars, idx) {
  if (chars[idx] !== "Y") return false;
  if (idx === 0) return false;
  const prev = idx > 0 ? chars[idx - 1] : "";
  return prev !== "" && !VOWELS.has(prev);
}
function isVowelAt(chars, idx) {
  if (VOWELS.has(chars[idx])) return true;
  return isYVowel(chars, idx);
}
var ACCENT_MAP = {
  "\xC0": "A",
  "\xC1": "A",
  "\xC2": "A",
  "\xC3": "A",
  "\xC4": "A",
  "\xC8": "E",
  "\xC9": "E",
  "\xCA": "E",
  "\xCB": "E",
  "\xCC": "I",
  "\xCD": "I",
  "\xCE": "I",
  "\xCF": "I",
  "\xD2": "O",
  "\xD3": "O",
  "\xD4": "O",
  "\xD6": "O",
  "\xD9": "U",
  "\xDA": "U",
  "\xDB": "U",
  "\xDC": "U",
  "\xDD": "Y",
  "\xC7": "C",
  "\xD1": "N",
  "\u0152": "O"
};
function normalize(s) {
  return s.toUpperCase().split("").map((c) => ACCENT_MAP[c] || c).filter((c) => /[A-Z]/.test(c)).join("");
}
function reduce(n, masters = true) {
  const ch = [n];
  if (n <= 0) return { v: 0, m: false, ch: [0] };
  let c = n;
  while (c > 9) {
    if (masters && MASTER_NUMBERS.has(c)) return { v: c, m: true, ch };
    c = [..."" + c].map(Number).reduce((s, d) => s + d, 0);
    ch.push(c);
  }
  return { v: c, m: false, ch };
}
function nameToNumbers(s, type = "p") {
  const n = normalize(s);
  const map = type === "p" ? PYTH_MAP : CHALD_MAP;
  return n.split("").map((c) => map[c] || 0);
}
function parseDate(s) {
  const parts = (s ?? "").split("-");
  const y = parseInt(parts[0] ?? "2000", 10) || 2e3;
  const m = parseInt(parts[1] ?? "1", 10) || 1;
  const d = parseInt(parts[2] ?? "1", 10) || 1;
  return { d: Math.max(1, Math.min(31, d)), m: Math.max(1, Math.min(12, m)), y };
}
function calcLifePath(bd) {
  const { d, m, y } = parseDate(bd);
  const rd = reduce(d).v;
  const rm = reduce(m).v;
  const ry = reduce(y).v;
  return reduce(rd + rm + ry);
}
function calcExpression(fullName) {
  return reduce(nameToNumbers(fullName).reduce((s, n) => s + n, 0));
}
function calcSoul(fullName) {
  const n = normalize(fullName);
  const chars = n.split("");
  let t = 0;
  chars.forEach((c, i) => {
    if (isVowelAt(chars, i)) t += PYTH_MAP[c] || 0;
  });
  return reduce(t);
}
function isMaster(n) {
  return MASTER_NUMBERS.has(n);
}

// src/engines/iching.ts
var TRIGRAMS = [[1, 1, 1], [1, 1, 0], [1, 0, 1], [1, 0, 0], [0, 1, 1], [0, 1, 0], [0, 0, 1], [0, 0, 0]];
var TRIGRAM_NAMES = ["Ciel", "Lac", "Feu", "Tonnerre", "Vent", "Eau", "Montagne", "Terre"];
var KW = [
  [1, 10, 13, 25, 44, 6, 33, 12],
  [43, 58, 49, 17, 28, 47, 31, 45],
  [14, 38, 30, 21, 50, 64, 56, 35],
  [34, 54, 55, 51, 32, 40, 62, 16],
  [9, 61, 37, 42, 57, 59, 53, 20],
  [5, 60, 63, 3, 48, 29, 39, 8],
  [26, 41, 22, 27, 18, 4, 52, 23],
  [11, 19, 36, 24, 46, 7, 15, 2]
];
var HEX_NAMES = {
  1: "Cr\xE9ateur",
  2: "R\xE9ceptif",
  3: "Difficult\xE9 initiale",
  4: "Folie juv\xE9nile",
  5: "Attente",
  6: "Conflit",
  7: "Arm\xE9e",
  8: "Union",
  9: "Petit Apprivoisement",
  10: "Marche",
  11: "Paix",
  12: "Stagnation",
  13: "Communaut\xE9",
  14: "Grand Avoir",
  15: "Humilit\xE9",
  16: "Enthousiasme",
  17: "Suite",
  18: "Correction",
  19: "Approche",
  20: "Contemplation",
  21: "Mordre au travers",
  22: "Gr\xE2ce",
  23: "\xC9clatement",
  24: "Retour",
  25: "Innocence",
  26: "Grand Apprivoisement",
  27: "Nourriture",
  28: "Grand Exc\xE8s",
  29: "Insondable",
  30: "Feu",
  31: "Influence",
  32: "Dur\xE9e",
  33: "Retraite",
  34: "Grande Force",
  35: "Progr\xE8s",
  36: "Obscurcissement",
  37: "Famille",
  38: "Opposition",
  39: "Obstacle",
  40: "Lib\xE9ration",
  41: "Diminution",
  42: "Augmentation",
  43: "Perc\xE9e",
  44: "Rencontre",
  45: "Rassemblement",
  46: "Pouss\xE9e vers le haut",
  47: "Accablement",
  48: "Puits",
  49: "R\xE9volution",
  50: "Chaudron",
  51: "\xC9branlement",
  52: "Immobilisation",
  53: "D\xE9veloppement",
  54: "\xC9pous\xE9e",
  55: "Abondance",
  56: "Voyageur",
  57: "Le Doux",
  58: "S\xE9r\xE9nit\xE9",
  59: "Dissolution",
  60: "Limitation",
  61: "V\xE9rit\xE9 int\xE9rieure",
  62: "Petite Travers\xE9e",
  63: "Apr\xE8s Accomplissement",
  64: "Avant Accomplissement"
};
var HEX_KEYWORDS = {
  1: "Cr\xE9e",
  2: "Accueille",
  3: "Pers\xE9v\xE8re",
  4: "Apprends",
  5: "Patiente",
  6: "N\xE9gocie",
  7: "Organise",
  8: "Unis-toi",
  9: "Discipline",
  10: "Avance",
  11: "Harmonise",
  12: "Attends",
  13: "Rassemble",
  14: "Partage",
  15: "Sois humble",
  16: "Inspire",
  17: "Suis le flux",
  18: "Corrige",
  19: "Approche",
  20: "Observe",
  21: "Tranche",
  22: "Embellissez",
  23: "L\xE2che prise",
  24: "Recommence",
  25: "Sois pur",
  26: "Accumule",
  27: "Nourris-toi",
  28: "Ose",
  29: "Plonge",
  30: "\xC9claire",
  31: "Ressens",
  32: "Persiste",
  33: "Recule",
  34: "Fonce",
  35: "Progresse",
  36: "Prot\xE8ge-toi",
  37: "R\xE9unis",
  38: "Accepte",
  39: "Contourne",
  40: "Lib\xE8re",
  41: "Sacrifie",
  42: "Re\xE7ois",
  43: "D\xE9cide",
  44: "Rencontre",
  45: "Rassemble",
  46: "Monte",
  47: "Endure",
  48: "Puise",
  49: "Transforme",
  50: "Cultive",
  51: "Secoue",
  52: "Arr\xEAte-toi",
  53: "Grandis",
  54: "Adapte-toi",
  55: "Rayonne",
  56: "Explore",
  57: "P\xE9n\xE8tre",
  58: "R\xE9jouis-toi",
  59: "Dissous",
  60: "Limite",
  61: "Fais confiance",
  62: "Prudence",
  63: "C\xE9l\xE8bre",
  64: "Pr\xE9pare"
};
var HEX_DESC = {
  1: "La force cr\xE9atrice est \xE0 son apog\xE9e. Agis avec d\xE9termination et confiance.",
  2: "L'accueil et la r\xE9ceptivit\xE9 ouvrent les portes. Laisse venir \xE0 toi.",
  3: "Le commencement est difficile mais porteur. Pers\xE9v\xE8re sans forcer.",
  5: "L'attente active porte ses fruits. La patience est ta force aujourd'hui.",
  6: "Le conflit demande diplomatie. N\xE9gocie plut\xF4t que confronter.",
  8: "L'union fait la force. Cherche des alliances sinc\xE8res.",
  11: "Le Ciel et la Terre s'harmonisent. P\xE9riode de paix et prosp\xE9rit\xE9.",
  12: "Stagnation temporaire. La patience sera r\xE9compens\xE9e.",
  13: "L'union avec d'autres cr\xE9e la force. Cherche la communaut\xE9.",
  14: "L'abondance est l\xE0. Partage avec g\xE9n\xE9rosit\xE9 pour la maintenir.",
  20: "Prends de la hauteur. L'observation attentive r\xE9v\xE8le la voie.",
  24: "Un nouveau cycle commence. Accueille le retour de l'\xE9nergie.",
  25: "L'innocence et la spontan\xE9it\xE9 sont tes alli\xE9es aujourd'hui.",
  29: "L'eau profonde \u2014 un passage d\xE9licat qui forge la sagesse.",
  30: "Le feu int\xE9rieur illumine. Laisse briller ta lumi\xE8re.",
  31: "L'influence mutuelle cr\xE9e des liens profonds. Ouvre ton c\u0153ur.",
  33: "Le retrait strat\xE9gique n'est pas une faiblesse. Reculer pour mieux avancer.",
  34: "La grande force est disponible. Canalise-la avec sagesse.",
  36: "Prot\xE8ge ta lumi\xE8re dans l'adversit\xE9. La discr\xE9tion est strat\xE9gique.",
  39: "L'obstacle invite au d\xE9tour cr\xE9atif. Contourne plut\xF4t que force.",
  40: "La lib\xE9ration arrive. L\xE2che ce qui te retient.",
  42: "L'augmentation favorable. Ce que tu donnes te revient multipli\xE9.",
  47: "L'accablement est temporaire. La pression cr\xE9e le diamant.",
  49: "Le temps de la r\xE9volution. Ose le changement n\xE9cessaire.",
  50: "Le chaudron transforme le brut en or. Cultive tes talents.",
  52: "La montagne immobile. M\xE9ditation et centrage sont tes cl\xE9s.",
  55: "L'abondance est \xE0 son z\xE9nith. Profite de ce moment rare.",
  58: "La s\xE9r\xE9nit\xE9 et la joie. Partage ta lumi\xE8re avec les autres.",
  61: "La v\xE9rit\xE9 int\xE9rieure guide tes pas. Fais confiance \xE0 ton intuition.",
  63: "Tout est accompli mais reste vigilant. Ne rel\xE2che pas l'attention.",
  64: "Avant l'accomplissement \u2014 tout est pr\xEAt, un dernier effort."
};
var YANG_BIAS = [
  0,
  0,
  0,
  0,
  0,
  // 5× Ciel     (☰ 3 yang)
  1,
  1,
  1,
  // 3× Lac      (☱ 2 yang)
  2,
  2,
  2,
  // 3× Feu      (☲ 2 yang)
  3,
  // 1× Tonnerre (☳ 1 yang)
  4,
  4,
  4,
  // 3× Vent     (☴ 2 yang)
  5,
  // 1× Eau      (☵ 1 yang)
  6,
  // 1× Montagne (☶ 1 yang)
  7
  // 1× Terre    (☷ 0 yang)
];
function biasedTrigram(hash) {
  return YANG_BIAS[hash % YANG_BIAS.length];
}
function calcNatalIChing(bd) {
  const [by, bm, bd_] = bd.split("-").map(Number);
  const upperSum = by + bm + bd_;
  const lowerSum = upperSum + 12;
  const upper = biasedTrigram(upperSum);
  const lower = biasedTrigram(lowerSum);
  const hexNum = KW[lower][upper];
  const changing = (upperSum + lowerSum) % 6;
  const lines = [...TRIGRAMS[lower], ...TRIGRAMS[upper]];
  return {
    hexNum,
    lower,
    upper,
    lines,
    changing,
    name: HEX_NAMES[hexNum] || `Hexagramme ${hexNum}`,
    keyword: HEX_KEYWORDS[hexNum] || "Observez",
    desc: HEX_DESC[hexNum] || `L'hexagramme ${hexNum} t'invite \xE0 ${(HEX_KEYWORDS[hexNum] || "observer").toLowerCase()}.`
  };
}

// src/engines/bazi.ts
var HEAVENLY_STEMS = [
  {
    index: 0,
    chinese: "\u7532",
    pinyin: "Ji\u01CE",
    element: "Bois",
    yinYang: "Yang",
    archetype: "Le Ch\xEAne Imp\xE9rial",
    strength: "Leadership visible, capacit\xE9 \xE0 grandir rapidement et \xE0 dominer son environnement.",
    risk: "Rigidit\xE9, refus du changement.",
    businessAdvice: "Utilise ta force naturelle pour cr\xE9er des structures durables, mais reste ouvert aux nouvelles racines."
  },
  {
    index: 1,
    chinese: "\u4E59",
    pinyin: "Y\u01D0",
    element: "Bois",
    yinYang: "Yin",
    archetype: "Le Bambou Flexible",
    strength: "Adaptabilit\xE9 strat\xE9gique, r\xE9silience face \xE0 la pression.",
    risk: "Manque de direction claire, dispersion.",
    businessAdvice: "Utilise ta flexibilit\xE9 pour naviguer les crises, mais ancre-toi dans une vision \xE0 long terme."
  },
  {
    index: 2,
    chinese: "\u4E19",
    pinyin: "B\u01D0ng",
    element: "Feu",
    yinYang: "Yang",
    archetype: "Le Soleil Rayonnant",
    strength: "Charisme naturel, capacit\xE9 \xE0 inspirer et \xE0 \xE9clairer les autres.",
    risk: "\xC9puisement par sur-exposition, manque de profondeur.",
    businessAdvice: "Utilise ton rayonnement pour motiver les \xE9quipes, mais prot\xE8ge ton \xE9nergie int\xE9rieure."
  },
  {
    index: 3,
    chinese: "\u4E01",
    pinyin: "D\u012Bng",
    element: "Feu",
    yinYang: "Yin",
    archetype: "La Bougie Pr\xE9cise",
    strength: "Clart\xE9, pr\xE9cision, capacit\xE9 \xE0 illuminer les d\xE9tails.",
    risk: "Perfectionnisme paralysant, peur de l'ombre.",
    businessAdvice: "Utilise ta pr\xE9cision pour les op\xE9rations complexes, mais accepte que certaines choses restent dans l'ombre."
  },
  {
    index: 4,
    chinese: "\u620A",
    pinyin: "W\xF9",
    element: "Terre",
    yinYang: "Yang",
    archetype: "La Montagne Stable",
    strength: "Stabilit\xE9, fiabilit\xE9, capacit\xE9 \xE0 porter de lourdes charges.",
    risk: "Rigidit\xE9, r\xE9sistance au changement.",
    businessAdvice: "Utilise ta stabilit\xE9 pour b\xE2tir des empires durables, mais apprends \xE0 bouger quand le terrain tremble."
  },
  {
    index: 5,
    chinese: "\u5DF1",
    pinyin: "J\u01D0",
    element: "Terre",
    yinYang: "Yin",
    archetype: "Le Jardin Cultiv\xE9",
    strength: "Capacit\xE9 \xE0 cultiver, \xE0 faire grandir les talents et les projets.",
    risk: "Sur-attachement, difficult\xE9 \xE0 l\xE2cher prise.",
    businessAdvice: "Utilise ton talent de cultivateur pour faire grandir les \xE9quipes, mais sache quand il faut arracher les mauvaises herbes."
  },
  {
    index: 6,
    chinese: "\u5E9A",
    pinyin: "G\u0113ng",
    element: "M\xE9tal",
    yinYang: "Yang",
    archetype: "L'\xC9p\xE9e Tranchante",
    strength: "D\xE9cision rapide, clart\xE9, capacit\xE9 \xE0 trancher dans le vif.",
    risk: "Rigidit\xE9, manque de nuance.",
    businessAdvice: "Utilise ton tranchant pour les d\xE9cisions difficiles, mais temp\xE8re-le avec la sagesse."
  },
  {
    index: 7,
    chinese: "\u8F9B",
    pinyin: "X\u012Bn",
    element: "M\xE9tal",
    yinYang: "Yin",
    archetype: "Le Bijou Raffin\xE9",
    strength: "Raffinement, attention au d\xE9tail, capacit\xE9 \xE0 cr\xE9er de la valeur per\xE7ue.",
    risk: "Perfectionnisme excessif, peur de l'imperfection.",
    businessAdvice: "Utilise ton raffinement pour cr\xE9er des produits ou des marques premium, mais accepte que la perfection soit l'ennemi du bon."
  },
  {
    index: 8,
    chinese: "\u58EC",
    pinyin: "R\xE9n",
    element: "Eau",
    yinYang: "Yang",
    archetype: "L'Oc\xE9an Puissant",
    strength: "Mouvement, profondeur, capacit\xE9 \xE0 absorber et \xE0 transformer.",
    risk: "Instabilit\xE9 \xE9motionnelle, dispersion.",
    businessAdvice: "Utilise ta puissance oc\xE9anique pour porter de grands projets, mais ma\xEEtrise tes mar\xE9es int\xE9rieures."
  },
  {
    index: 9,
    chinese: "\u7678",
    pinyin: "Gu\u01D0",
    element: "Eau",
    yinYang: "Yin",
    archetype: "La Ros\xE9e Subtile",
    strength: "Intuition, subtilit\xE9, capacit\xE9 \xE0 p\xE9n\xE9trer les c\u0153urs et les esprits.",
    risk: "Manque de visibilit\xE9, difficult\xE9 \xE0 affirmer sa pr\xE9sence.",
    businessAdvice: "Utilise ta subtilit\xE9 pour influencer sans forcer, mais apprends \xE0 briller quand le moment l'exige."
  }
];
var EARTHLY_BRANCHES = [
  { index: 0, chinese: "\u5B50", pinyin: "Z\u01D0", animal: "Rat", element: "Eau", hours: "23h-01h" },
  { index: 1, chinese: "\u4E11", pinyin: "Ch\u01D2u", animal: "B\u0153uf", element: "Terre", hours: "01h-03h" },
  { index: 2, chinese: "\u5BC5", pinyin: "Y\xEDn", animal: "Tigre", element: "Bois", hours: "03h-05h" },
  { index: 3, chinese: "\u536F", pinyin: "M\u01CEo", animal: "Lapin", element: "Bois", hours: "05h-07h" },
  { index: 4, chinese: "\u8FB0", pinyin: "Ch\xE9n", animal: "Dragon", element: "Terre", hours: "07h-09h" },
  { index: 5, chinese: "\u5DF3", pinyin: "S\xEC", animal: "Serpent", element: "Feu", hours: "09h-11h" },
  { index: 6, chinese: "\u5348", pinyin: "W\u01D4", animal: "Cheval", element: "Feu", hours: "11h-13h" },
  { index: 7, chinese: "\u672A", pinyin: "W\xE8i", animal: "Ch\xE8vre", element: "Terre", hours: "13h-15h" },
  { index: 8, chinese: "\u7533", pinyin: "Sh\u0113n", animal: "Singe", element: "M\xE9tal", hours: "15h-17h" },
  { index: 9, chinese: "\u9149", pinyin: "Y\u01D2u", animal: "Coq", element: "M\xE9tal", hours: "17h-19h" },
  { index: 10, chinese: "\u620C", pinyin: "X\u016B", animal: "Chien", element: "Terre", hours: "19h-21h" },
  { index: 11, chinese: "\u4EA5", pinyin: "H\xE0i", animal: "Cochon", element: "Eau", hours: "21h-23h" }
];
var PRODUCTION_CYCLE = ["Bois", "Feu", "Terre", "M\xE9tal", "Eau"];
var DESTRUCTION_CYCLE = ["Bois", "Terre", "Eau", "Feu", "M\xE9tal"];
var LIU_HE_PAIRS = [
  [0, 1],
  // Zi ↔ Chou    (Rat ↔ Bœuf)
  [2, 11],
  // Yin ↔ Hai    (Tigre ↔ Cochon)
  [3, 10],
  // Mao ↔ Xu     (Lapin ↔ Chien)
  [4, 9],
  // Chen ↔ You   (Dragon ↔ Coq)
  [5, 8],
  // Si ↔ Shen    (Serpent ↔ Singe)
  [6, 7]
  // Wu ↔ Wei     (Cheval ↔ Chèvre)
];
var TRIADS = [
  [8, 0, 4],
  // Shen, Zi, Chen  → Eau
  [11, 3, 7],
  // Hai, Mao, Wei   → Bois
  [2, 6, 10],
  // Yin, Wu, Xu     → Feu
  [5, 9, 1]
  // Si, You, Chou   → Métal
];
var CLASHES = [
  [0, 6],
  // Zi ↔ Wu
  [1, 7],
  // Chou ↔ Wei
  [2, 8],
  // Yin ↔ Shen
  [3, 9],
  // Mao ↔ You
  [4, 10],
  // Chen ↔ Xu
  [5, 11]
  // Si ↔ Hai
];
function getJulianDayNumber(date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const a = Math.floor((14 - m) / 12);
  const y2 = y + 4800 - a;
  const m2 = m + 12 * a - 3;
  return d + Math.floor((153 * m2 + 2) / 5) + 365 * y2 + Math.floor(y2 / 4) - Math.floor(y2 / 100) + Math.floor(y2 / 400) - 32045;
}
function getDayStemIndex(date) {
  const jdn = getJulianDayNumber(date);
  return ((jdn + 9) % 10 + 10) % 10;
}
function getDayBranchIndex(date) {
  const jdn = getJulianDayNumber(date);
  return ((jdn + 1) % 12 + 12) % 12;
}
function calcDayMaster(date) {
  const stemIndex = getDayStemIndex(date);
  const branchIndex = getDayBranchIndex(date);
  return {
    stem: HEAVENLY_STEMS[stemIndex],
    branch: EARTHLY_BRANCHES[branchIndex]
  };
}
function getElementRelation(natalElement, dailyElement) {
  if (natalElement === dailyElement) return "same";
  const prodIdx = PRODUCTION_CYCLE.indexOf(natalElement);
  const nextProd = PRODUCTION_CYCLE[(prodIdx + 1) % 5];
  if (dailyElement === nextProd) return "produces";
  const prevProd = PRODUCTION_CYCLE[(prodIdx + 4) % 5];
  if (dailyElement === prevProd) return "produced_by";
  const destIdx = DESTRUCTION_CYCLE.indexOf(natalElement);
  const nextDest = DESTRUCTION_CYCLE[(destIdx + 1) % 5];
  if (dailyElement === nextDest) return "destroys";
  return "destroyed_by";
}
function checkLiuHe(branchA, branchB) {
  return LIU_HE_PAIRS.some(
    ([a, b]) => branchA === a && branchB === b || branchA === b && branchB === a
  );
}
var PEACH_BLOSSOM_MAP = {
  8: 9,
  0: 9,
  4: 9,
  // Shen, Zi, Chen → You (Coq)
  2: 3,
  6: 3,
  10: 3,
  // Yin, Wu, Xu    → Mao (Lapin)
  5: 6,
  9: 6,
  1: 6,
  // Si, You, Chou  → Wu (Cheval)
  11: 0,
  3: 0,
  7: 0
  // Hai, Mao, Wei  → Zi (Rat)
};
var HEAVENLY_COMBINATIONS = [
  { stemA: 0, stemB: 5, resultElement: "Terre", label: "\u7532\u5DF1 Ji\u01CE+J\u01D0 \u2192 Terre (Stabilit\xE9)" },
  // Jia Yang Bois + Ji Yin Terre
  { stemA: 2, stemB: 7, resultElement: "Eau", label: "\u4E19\u8F9B B\u01D0ng+X\u012Bn \u2192 Eau (Fluidit\xE9)" },
  // Bing Yang Feu + Xin Yin Métal
  { stemA: 4, stemB: 9, resultElement: "Feu", label: "\u620A\u7678 W\xF9+Gu\u01D0 \u2192 Feu (Passion)" },
  // Wu Yang Terre + Gui Yin Eau
  { stemA: 6, stemB: 1, resultElement: "M\xE9tal", label: "\u5E9A\u4E59 G\u0113ng+Y\u01D0 \u2192 M\xE9tal (Structure)" },
  // Geng Yang Métal + Yi Yin Bois
  { stemA: 8, stemB: 3, resultElement: "Bois", label: "\u58EC\u4E01 R\xE9n+D\u012Bng \u2192 Bois (Croissance)" }
  // Ren Yang Eau + Ding Yin Feu
];
function checkHeavenlyCombination(stemIdxA, stemIdxB) {
  return HEAVENLY_COMBINATIONS.find(
    (c) => c.stemA === stemIdxA && c.stemB === stemIdxB || c.stemA === stemIdxB && c.stemB === stemIdxA
  ) || null;
}
var HARMS = [
  [0, 7],
  // Zi ↔ Wei     (Rat ↔ Chèvre)
  [1, 6],
  // Chou ↔ Wu    (Bœuf ↔ Cheval)
  [2, 5],
  // Yin ↔ Si     (Tigre ↔ Serpent)
  [3, 4],
  // Mao ↔ Chen   (Lapin ↔ Dragon)
  [8, 11],
  // Shen ↔ Hai   (Singe ↔ Cochon)
  [9, 10]
  // You ↔ Xu     (Coq ↔ Chien)
];
var PUNISHMENTS = [
  // Auto-punitions (自刑 zì xíng)
  { branches: [0, 0], type: "self", label: "Rat auto-punition \u2014 anxi\xE9t\xE9 int\xE9rieure", severity: 1 },
  { branches: [6, 6], type: "self", label: "Cheval auto-punition \u2014 impulsivit\xE9", severity: 1 },
  { branches: [9, 9], type: "self", label: "Coq auto-punition \u2014 perfectionnisme", severity: 1 },
  { branches: [4, 4], type: "self", label: "Dragon auto-punition \u2014 orgueil", severity: 1 },
  // Punitions mutuelles — Bully (恃势之刑 shì shì zhī xíng)
  { branches: [2, 5], type: "bully", label: "Tigre\u2194Serpent \u2014 pouvoir vs strat\xE9gie", severity: 2 },
  { branches: [5, 8], type: "bully", label: "Serpent\u2194Singe \u2014 manipulation mutuelle", severity: 2 },
  { branches: [2, 8], type: "bully", label: "Tigre\u2194Singe \u2014 conflit direct", severity: 3 },
  // Punitions mutuelles — Ungrateful (无恩之刑 wú ēn zhī xíng)
  { branches: [1, 10], type: "ungrateful", label: "B\u0153uf\u2194Chien \u2014 cycle d'ingratitude", severity: 2 },
  { branches: [10, 7], type: "ungrateful", label: "Chien\u2194Ch\xE8vre \u2014 trahison ressentie", severity: 2 },
  { branches: [7, 1], type: "ungrateful", label: "Ch\xE8vre\u2194B\u0153uf \u2014 cycle d'amertume", severity: 2 },
  // Punition civile (无礼之刑 wú lǐ zhī xíng)
  { branches: [3, 0], type: "civil", label: "Lapin\u2194Rat \u2014 manque de respect", severity: 1 }
];
function checkPunishments(branchIdxA, branchIdxB) {
  return PUNISHMENTS.filter((p) => {
    if (p.branches.length === 2) {
      return p.branches[0] === branchIdxA && p.branches[1] === branchIdxB || p.branches[0] === branchIdxB && p.branches[1] === branchIdxA;
    }
    return false;
  });
}
function checkHarm(branchIdxA, branchIdxB) {
  return HARMS.some(
    ([a, b]) => a === branchIdxA && b === branchIdxB || a === branchIdxB && b === branchIdxA
  );
}
function checkTriad(branchIdxA, branchIdxB) {
  if (branchIdxA === branchIdxB) return false;
  return TRIADS.some((t) => t.includes(branchIdxA) && t.includes(branchIdxB));
}
function checkClash(branchIdxA, branchIdxB) {
  return CLASHES.some(
    ([a, b]) => a === branchIdxA && b === branchIdxB || a === branchIdxB && b === branchIdxA
  );
}
function calcBaZiCompat(birthDateA, birthDateB) {
  const pillarA = calcDayMaster(birthDateA);
  const pillarB = calcDayMaster(birthDateB);
  const signals = [];
  const alerts = [];
  let score = 0;
  const hc = checkHeavenlyCombination(pillarA.stem.index, pillarB.stem.index);
  if (hc) {
    score += 18;
    signals.push(`\u{1F31F} Combinaison Divine ${hc.label} \u2014 lien karmique puissant`);
  }
  const liuHe = checkLiuHe(pillarA.branch.index, pillarB.branch.index);
  if (liuHe) {
    score += 12;
    signals.push(`\u{1F91D} Li\xF9 H\xE9 \u2014 harmonie naturelle (${pillarA.branch.animal} \u2194 ${pillarB.branch.animal})`);
  }
  const triad = checkTriad(pillarA.branch.index, pillarB.branch.index);
  if (triad) {
    score += 14;
    const triadGroup = TRIADS.find((t) => t.includes(pillarA.branch.index) && t.includes(pillarB.branch.index));
    const triadAnimals = triadGroup ? triadGroup.map((idx) => EARTHLY_BRANCHES[idx].animal).join("\xB7") : `${pillarA.branch.animal} \u2194 ${pillarB.branch.animal}`;
    signals.push(`\u{1F53A} Triade San He \u2014 alliance strat\xE9gique (${triadAnimals})`);
  }
  const clash = checkClash(pillarA.branch.index, pillarB.branch.index);
  if (clash) {
    score -= 13;
    alerts.push(`\u2694\uFE0F Clash \u2014 opposition frontale (${pillarA.branch.animal} \u2194 ${pillarB.branch.animal})`);
  }
  const harm = checkHarm(pillarA.branch.index, pillarB.branch.index);
  if (harm) {
    score -= 11;
    alerts.push(`\u{1F494} Harm \u2014 friction subtile (${pillarA.branch.animal} \u2194 ${pillarB.branch.animal})`);
  }
  const punishments = checkPunishments(pillarA.branch.index, pillarB.branch.index);
  if (punishments.length > 0) {
    const maxSeverity = Math.max(...punishments.map((p) => p.severity));
    const pPts = maxSeverity >= 3 ? -10 : maxSeverity >= 2 ? -6 : -3;
    score += pPts;
    punishments.forEach((p) => alerts.push(`\u26A0\uFE0F ${p.label}`));
  }
  const elementRelation = getElementRelation(pillarA.stem.element, pillarB.stem.element);
  const elemScores = {
    "same": 5,
    // Même énergie
    "produces": 8,
    // A produit B → don de soi
    "produced_by": 8,
    // B produit A → soutien
    "destroys": -6,
    // A détruit B → domination
    "destroyed_by": -6
    // B détruit A → soumission
  };
  const elemPts = elemScores[elementRelation];
  score += elemPts;
  if (elemPts > 0) signals.push(`${pillarA.stem.element} ${elementRelation === "same" ? "=" : "nourrit"} ${pillarB.stem.element} \u2014 flux \xE9l\xE9mentaire favorable`);
  const feminin = (e) => e === "Eau" || e === "Terre";
  if (elemPts < 0) alerts.push(`${pillarA.stem.element} ${elementRelation === "destroys" ? "domine" : feminin(pillarA.stem.element) ? "domin\xE9e par" : "domin\xE9 par"} ${pillarB.stem.element} \u2014 tension \xE9l\xE9mentaire`);
  const peachA = PEACH_BLOSSOM_MAP[pillarA.branch.index];
  const peachB = PEACH_BLOSSOM_MAP[pillarB.branch.index];
  const peachAtoB = peachA !== void 0 && peachA === pillarB.branch.index;
  const peachBtoA = peachB !== void 0 && peachB === pillarA.branch.index;
  const peachCrossed = peachAtoB || peachBtoA;
  const peachBlossomLevel = peachAtoB && peachBtoA ? 2 : peachCrossed ? 1 : 0;
  if (peachBlossomLevel === 2) {
    signals.push("\u{1F338}\u{1F338} Double Fleur de P\xEAcher \u2014 attraction magn\xE9tique r\xE9ciproque");
  } else if (peachBlossomLevel === 1) {
    signals.push("\u{1F338} Fleur de P\xEAcher crois\xE9e \u2014 attraction magn\xE9tique");
  }
  return {
    heavenlyCombination: hc,
    liuHe,
    triad,
    clash,
    harm,
    punishments,
    peachBlossomCrossed: peachCrossed,
    peachBlossomLevel,
    elementRelation,
    score,
    signals,
    alerts
  };
}

// src/engines/compatibility.ts
function normalCDF(z) {
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const erf = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * erf);
}
function bondGaussianCDF(rawScore) {
  const z = (rawScore - 45) / 18;
  const phi = normalCDF(z);
  return Math.max(5, Math.min(98, Math.round(5 + 93 * (0.3 + 0.7 * phi))));
}
function bondGaussianCDFFamille(rawScore) {
  const z = (rawScore - 48) / 20;
  const phi = normalCDF(z);
  return Math.max(5, Math.min(98, Math.round(5 + 93 * (0.3 + 0.7 * phi))));
}
function bondGaussianCDFPro(rawScore) {
  const z = (rawScore - 50) / 16;
  const phi = normalCDF(z);
  return Math.max(5, Math.min(98, Math.round(5 + 93 * (0.3 + 0.7 * phi))));
}
var NUM_COMPAT = {
  "1-1": 7,
  "1-2": 5,
  "1-3": 8,
  "1-4": 4,
  "1-5": 9,
  "1-6": 5,
  "1-7": 4,
  "1-8": 8,
  "1-9": 6,
  "2-2": 7,
  "2-3": 7,
  "2-4": 8,
  "2-5": 3,
  "2-6": 9,
  "2-7": 5,
  "2-8": 6,
  "2-9": 7,
  "3-3": 7,
  "3-4": 3,
  "3-5": 7,
  "3-6": 8,
  "3-7": 4,
  "3-8": 5,
  "3-9": 9,
  "4-4": 7,
  "4-5": 3,
  "4-6": 7,
  "4-7": 5,
  "4-8": 9,
  "4-9": 3,
  "5-5": 7,
  "5-6": 5,
  "5-7": 8,
  "5-8": 5,
  "5-9": 7,
  "6-6": 7,
  "6-7": 3,
  "6-8": 4,
  "6-9": 8,
  "7-7": 8,
  "7-8": 4,
  "7-9": 5,
  "8-8": 7,
  "8-9": 6,
  "9-9": 7
};
var MASTER_BONUS = {
  "11-11": 8,
  "11-22": 6,
  "11-33": 8,
  "22-22": 7,
  "22-33": 7,
  "33-33": 8
};
var WEIGHTS = {
  amour: { bazi: 0.45, num: 0.25, iching: 0.2, peach: 0.1 },
  pro: { bazi: 0.35, num: 0.3, iching: 0.25, peach: 0.1 },
  famille: { bazi: 0.4, num: 0.3, iching: 0.3, peach: 0 }
  // Peach Blossom = 0 en famille
};
var BOND_LABELS = [
  { min: 90, label: { name: "\xC2mes S\u0153urs", icon: "\u{1F4AB}", color: "#E0B0FF", desc: "Connexion exceptionnelle \u2014 lien karmique rare" } },
  { min: 78, label: { name: "Alchimie Forte", icon: "\u{1F525}", color: "#FFD700", desc: "Compatibilit\xE9 naturelle \u2014 \xE9nergie de fusion" } },
  { min: 65, label: { name: "Belle Synergie", icon: "\u2728", color: "#4ade80", desc: "Compl\xE9mentarit\xE9 solide \u2014 terrain fertile" } },
  { min: 50, label: { name: "\xC9quilibre Possible", icon: "\u2696\uFE0F", color: "#60a5fa", desc: "Potentiel \xE0 cultiver \u2014 dialogue n\xE9cessaire" } },
  { min: 35, label: { name: "Friction Cr\xE9ative", icon: "\u{1F30A}", color: "#f59e0b", desc: "Tensions stimulantes \u2014 croissance par le d\xE9fi" } },
  { min: 0, label: { name: "D\xE9fi Relationnel", icon: "\u26A1", color: "#ef4444", desc: "Opposition forte \u2014 transformation ou rupture" } }
];
function getBondLabel(score) {
  for (const { min, label } of BOND_LABELS) {
    if (score >= min) return label;
  }
  return BOND_LABELS[BOND_LABELS.length - 1].label;
}
var FAMILLE_LABELS = [
  { min: 88, label: { name: "Lien d'\xC2me Familial", icon: "\u{1F31F}", color: "#E0B0FF", desc: "Connexion familiale exceptionnelle \u2014 lien d'\xE2me rare" } },
  { min: 72, label: { name: "Harmonie Naturelle", icon: "\u{1F49B}", color: "#FFD700", desc: "Complicit\xE9 instinctive \u2014 soutien mutuel profond" } },
  { min: 58, label: { name: "Lien Compl\xE9mentaire", icon: "\u{1F33F}", color: "#4ade80", desc: "Diff\xE9rences enrichissantes \u2014 force dans la diversit\xE9" } },
  { min: 42, label: { name: "Lien Exigeant", icon: "\u{1F52E}", color: "#818cf8", desc: "Relation stimulante \u2014 le lien se construit par l'effort conscient" } },
  { min: 28, label: { name: "Lien de Transformation", icon: "\u{1F9D7}", color: "#a78bfa", desc: "Friction formatrice \u2014 croissance profonde par le d\xE9fi" } },
  { min: 0, label: { name: "Noeud Karmique Profond", icon: "\u{1F525}", color: "#7c3aed", desc: "Opposition structurelle \u2014 le\xE7on de vie majeure" } }
];
function getFamilleLabel(score) {
  for (const { min, label } of FAMILLE_LABELS) {
    if (score >= min) return label;
  }
  return FAMILLE_LABELS[FAMILLE_LABELS.length - 1].label;
}
function getFamilleCategory(sub) {
  if (sub === "ami") return "ami";
  if (sub === "coloc") return "coloc";
  if (sub.startsWith("frere") || sub.startsWith("soeur")) return "fratrie";
  if (sub.startsWith("gp_") || sub.startsWith("gm_")) return "grands_parents";
  return "parent";
}
function getScoreTier(score) {
  if (score >= 72) return "high";
  if (score >= 58) return "good";
  if (score >= 42) return "moderate";
  return "low";
}
var CONTEXT_BADGES = {
  ami: {
    high: {
      icon: "\u{1F30A}",
      title: "\xC2mes Complices",
      narrative: "Ton amiti\xE9 repose sur une affinit\xE9 profonde et naturelle. Les \xE9toiles confirment ce que tu sais d\xE9j\xE0 : ce lien est pr\xE9cieux et rare."
    },
    good: {
      icon: "\u{1F33F}",
      title: "Harmonie Douce",
      narrative: "Une amiti\xE9 fluide et ressour\xE7ante. Tes th\xE8mes se compl\xE8tent naturellement \u2014 le quotidien ensemble est facile et enrichissant."
    },
    moderate: {
      icon: "\u{1F31F}",
      title: "\xC9tincelle & Compl\xE9mentarit\xE9",
      narrative: "Tes th\xE8mes r\xE9v\xE8lent des diff\xE9rences profondes \u2014 c'est justement ce qui rend cette amiti\xE9 si riche et stimulante. La friction entre amis choisis se transforme en force."
    },
    low: {
      icon: "\u{1F525}",
      title: "D\xE9fi Magn\xE9tique",
      narrative: "Une amiti\xE9 hors normes qui d\xE9fie les conventions. Les oppositions structurelles cr\xE9ent une attraction paradoxale \u2014 tu n'es pas fait pour t'ennuyer ensemble."
    }
  },
  fratrie: {
    high: {
      icon: "\u{1F49B}",
      title: "Harmonie Fraternelle",
      narrative: "Une fratrie b\xE9nie par une complicit\xE9 rare. L'\xE9nergie entre vous coule naturellement \u2014 un lien de fond solide qui n'a pas besoin de grands mots."
    },
    good: {
      icon: "\u{1F6CB}\uFE0F",
      title: "Confort Naturel",
      narrative: "L'\xE9nergie entre vous coule naturellement. Un lien de fond solide, sans avoir besoin de grands efforts \u2014 comme une \xE9vidence de famille."
    },
    moderate: {
      icon: "\u{1F331}",
      title: "Croissance Mutuelle",
      narrative: "Ton lien fraternel se construit par l'effort conscient. Les diff\xE9rences de temp\xE9rament sont un terrain d'apprentissage, pas un obstacle."
    },
    low: {
      icon: "\u{1F525}",
      title: "Transformation Fraternelle",
      narrative: "La fratrie est un miroir sans concession. Les tensions forment le caract\xE8re et la clart\xE9 na\xEEt de la confrontation \u2014 ce lien te forge."
    }
  },
  parent: {
    high: {
      icon: "\u{1F333}",
      title: "Racines Profondes",
      narrative: "Un lien parent-enfant d'une profondeur rare. La compr\xE9hension est instinctive, le soutien naturel et profond\xE9ment ancr\xE9."
    },
    good: {
      icon: "\u2764\uFE0F",
      title: "Soutien Solide",
      narrative: "Une compr\xE9hension instinctive parent-enfant. Le soutien est naturel et la dynamique de transmission fonctionne harmonieusement."
    },
    moderate: {
      icon: "\u{1F9D7}",
      title: "Lien d'\xC9volution",
      narrative: "La friction entre tes th\xE8mes a forg\xE9 un lien exigeant mais transformateur. Le chemin parcouru ensemble a de la valeur \u2014 c'est un lien qui grandit."
    },
    low: {
      icon: "\u{1F525}",
      title: "D\xE9fi Fondateur",
      narrative: "La relation porte une friction r\xE9elle qui t'a profond\xE9ment forg\xE9. Ce n'est pas un lien facile, c'est un lien qui demande du travail pour devenir juste."
    }
  },
  grands_parents: {
    high: {
      icon: "\u{1F333}",
      title: "Racines Ancestrales",
      narrative: "Un lien interg\xE9n\xE9rationnel exceptionnel. La m\xE9moire familiale se transmet naturellement \xE0 travers ce lien."
    },
    good: {
      icon: "\u{1F33F}",
      title: "Transmission Douce",
      narrative: "La sagesse passe en douceur d'une g\xE9n\xE9ration \xE0 l'autre. Un lien protecteur et chaleureux."
    },
    moderate: {
      icon: "\u{1F309}",
      title: "Pont entre \xC9poques",
      narrative: "Deux g\xE9n\xE9rations, deux mondes \u2014 mais la curiosit\xE9 et le respect cr\xE9ent un pont pr\xE9cieux entre les \xE2ges."
    },
    low: {
      icon: "\u{1F525}",
      title: "H\xE9ritage Complexe",
      narrative: "L'histoire familiale porte des n\u0153uds \xE0 d\xE9m\xEAler. La compr\xE9hension demande un effort conscient de part et d'autre."
    }
  },
  coloc: {
    high: {
      icon: "\u{1F3E0}",
      title: "Cohabitation Harmonieuse",
      narrative: "Vivre ensemble est un plaisir naturel. Tes rythmes et tes habitudes s'accordent comme par magie."
    },
    good: {
      icon: "\u{1F91D}",
      title: "Bon \xC9quilibre Quotidien",
      narrative: "La cohabitation fonctionne bien. Les ajustements sont mineurs et le quotidien partag\xE9 est agr\xE9able."
    },
    moderate: {
      icon: "\u2696\uFE0F",
      title: "Ajustements N\xE9cessaires",
      narrative: "Vivre ensemble demande des compromis conscients. Les habitudes diff\xE8rent mais l'effort en vaut la peine."
    },
    low: {
      icon: "\u{1F32A}\uFE0F",
      title: "Quotidien Turbulent",
      narrative: "La cohabitation active des frictions quotidiennes. Mieux vaut pr\xE9server le lien en gardant chacun son espace."
    }
  }
};
function getContextBadge(score, familleSubType) {
  if (!familleSubType) return void 0;
  const cat = getFamilleCategory(familleSubType);
  const tier = getScoreTier(score);
  return CONTEXT_BADGES[cat]?.[tier];
}
var FAMILLE_DESC = {
  "Lien d'\xC2me Familial": {
    fratrie: "Miroir d'\xE2me puissant \u2014 loyaut\xE9 fraternelle ind\xE9fectible",
    parent: "H\xE9ritage d'\xE2me majeur \u2014 transmission karmique profonde",
    grands_parents: "R\xE9surgence d'\xE2me \u2014 le clan se reconna\xEEt \xE0 travers les \xE2ges",
    ami: "\xC2mes complices \u2014 une amiti\xE9 qui transcende le temps",
    coloc: "Cohabitation magique \u2014 harmonie rare sous le m\xEAme toit"
  },
  "Harmonie Naturelle": {
    fratrie: "Complicit\xE9 instinctive \u2014 proximit\xE9 naturelle et vibrante",
    parent: "Osmose profonde \u2014 attachement fort, c\u0153ur \xE0 c\u0153ur",
    grands_parents: "Complicit\xE9 protectrice absolue \u2014 racine et fleur",
    ami: "Harmonie douce \u2014 une amiti\xE9 fluide et ressour\xE7ante",
    coloc: "Cohabitation sereine \u2014 les rythmes s'accordent naturellement"
  },
  "Lien Compl\xE9mentaire": {
    fratrie: "Forces oppos\xE9es, \xE9quilibre naturel",
    parent: "Filiation harmonieuse \u2014 respect naturel des r\xF4les",
    grands_parents: "Transmission douce de la m\xE9moire familiale",
    ami: "Compl\xE9mentarit\xE9 enrichissante \u2014 tu couvres les angles morts de l'autre",
    coloc: "Cohabitation constructive \u2014 chacun apporte sa pierre"
  },
  "Lien Exigeant": {
    fratrie: "Apprentissage mutuel par le frottement des ego",
    parent: "Lien en \xE9volution \u2014 la friction forge la compr\xE9hension",
    grands_parents: "Pont curieux entre deux mondes et deux temps",
    ami: "Relation stimulante \u2014 tes diff\xE9rences sont une richesse cach\xE9e",
    coloc: "Cohabitation exigeante \u2014 les ajustements demandent de la patience"
  },
  "Lien de Transformation": {
    fratrie: "Tensions qui forgent le caract\xE8re \u2014 clart\xE9 n\xE9cessaire",
    parent: "Friction structurelle \u2014 le chemin parcouru ensemble a de la valeur",
    grands_parents: "Incompr\xE9hension g\xE9n\xE9rationnelle invitant \xE0 l'effort",
    ami: "Amiti\xE9-d\xE9fi \u2014 la friction se transforme en stimulation mutuelle",
    coloc: "Cohabitation transformatrice \u2014 grandir ensemble malgr\xE9 les tensions"
  },
  "Noeud Karmique Profond": {
    fratrie: "Alt\xE9rit\xE9 radicale \u2014 respecter les distances s'impose",
    parent: "L'enfant r\xE9v\xE8le l'ombre du parent \u2014 miroir intense",
    grands_parents: "Rupture \xE9nerg\xE9tique \u2014 histoire familiale complexe",
    ami: "Lien magn\xE9tique mais turbulent \u2014 transformation profonde requise",
    coloc: "Cohabitation tr\xE8s difficile \u2014 les \xE9nergies s'opposent frontalement"
  }
};
var ARCHETYPE_HEX_PAIRS = {
  frere_frere: [51, 58],
  // L'Éveilleur + Le Joyeux
  soeur_soeur: [58, 31],
  // Le Joyeux + L'Influence
  frere_soeur: [31, 45],
  // L'Influence + Le Rassemblement
  pere_fils: [18, 3],
  // Le Travail sur la Corruption + La Difficulté Initiale
  pere_fille: [17, 45],
  // Suivre + Le Rassemblement
  mere_fils: [3, 18],
  // La Difficulté Initiale + Le Travail sur la Corruption
  mere_fille: [45, 17],
  // Le Rassemblement + Suivre
  gp_petit_fils: [50, 55],
  // Le Chaudron + L'Abondance
  gp_petite_fille: [41, 58],
  // La Diminution + Le Joyeux
  gm_petit_fils: [55, 50],
  // L'Abondance + Le Chaudron
  gm_petite_fille: [58, 41],
  // Le Joyeux + La Diminution
  coloc: [22, 22]
  // La Grâce (symétrique)
};
var ARCHETYPE_NAMES = {
  2: "Le R\xE9ceptif",
  3: "La Difficult\xE9 Initiale",
  17: "Suivre",
  18: "Le Travail sur la Corruption",
  22: "La Gr\xE2ce",
  31: "L'Influence",
  41: "La Diminution",
  45: "Le Rassemblement",
  50: "Le Chaudron",
  51: "L'\xC9veilleur",
  55: "L'Abondance",
  58: "Le Joyeux"
};
function calcArchetypeHexBonus(subtype, hex1, hex2) {
  const pair = ARCHETYPE_HEX_PAIRS[subtype];
  if (!pair) return 0;
  let bonus = 0;
  if (pair.includes(hex1)) bonus += 1;
  if (pair.includes(hex2)) bonus += 1;
  return Math.min(2, bonus);
}
function getNumCompat(a, b) {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  if (isMaster(a) && isMaster(b)) {
    const mKey = `${Math.min(a, b)}-${Math.max(a, b)}`;
    if (MASTER_BONUS[mKey] !== void 0) return MASTER_BONUS[mKey];
  }
  const ra = a > 9 ? a === 11 ? 2 : a === 22 ? 4 : 6 : a;
  const rb = b > 9 ? b === 11 ? 2 : b === 22 ? 4 : 6 : b;
  const key = `${Math.min(ra, rb)}-${Math.max(ra, rb)}`;
  return NUM_COMPAT[key] ?? 5;
}
var NUM_SUB_WEIGHTS = {
  amour: { lp: 1.6, expr: 1, soul: 1.4 },
  // LP 40% / Expr 25% / Soul 35%
  pro: { lp: 1.2, expr: 1.8, soul: 1 },
  // LP 30% / Expr 45% / Soul 25%
  famille: { lp: 1.6, expr: 1.2, soul: 1.2 }
  // LP 40% / Expr 30% / Soul 30%
};
function calcNumeroCompat(bdA, nameA, bdB, nameB, mode = "amour") {
  const signals = [];
  const alerts = [];
  const sw = NUM_SUB_WEIGHTS[mode];
  const hasNames = !!(nameA && nameB);
  const lpMultiplier = hasNames ? sw.lp : sw.lp + sw.expr + sw.soul;
  const lpA = calcLifePath(bdA);
  const lpB = calcLifePath(bdB);
  const lpRaw = getNumCompat(lpA.v, lpB.v);
  const lpScore = Math.round(lpRaw * lpMultiplier);
  if (lpRaw >= 8) signals.push(`Chemin de Vie ${lpA.v}\xD7${lpB.v} \u2014 r\xE9sonance forte`);
  else if (lpRaw <= 3) alerts.push(`Chemin de Vie ${lpA.v}\xD7${lpB.v} \u2014 vibrations tr\xE8s diff\xE9rentes`);
  let exprScore = 0;
  if (hasNames) {
    const exprA = calcExpression(nameA);
    const exprB = calcExpression(nameB);
    const exprRaw = getNumCompat(exprA.v, exprB.v);
    exprScore = Math.round(exprRaw * sw.expr);
    if (exprRaw >= 8) signals.push(`Expression ${exprA.v}\xD7${exprB.v} \u2014 communication fluide`);
    else if (exprRaw <= 3) alerts.push(`Expression ${exprA.v}\xD7${exprB.v} \u2014 langages diff\xE9rents`);
  }
  let soulScore = 0;
  if (hasNames) {
    const soulA = calcSoul(nameA);
    const soulB = calcSoul(nameB);
    const soulRaw = getNumCompat(soulA.v, soulB.v);
    soulScore = Math.round(soulRaw * sw.soul);
    if (soulRaw >= 8) signals.push(`\xC2mes ${soulA.v}\xD7${soulB.v} \u2014 d\xE9sirs profonds align\xE9s`);
    else if (soulRaw <= 3) alerts.push(`\xC2mes ${soulA.v}\xD7${soulB.v} \u2014 motivations divergentes`);
  }
  if (!hasNames) {
    alerts.push("\u26A0\uFE0F Pr\xE9noms non renseign\xE9s \u2014 score num\xE9rologique bas\xE9 sur le Chemin de Vie uniquement");
  }
  const total = Math.min(40, lpScore + exprScore + soulScore);
  return { lpScore, exprScore, soulScore, total, signals, alerts };
}
var TRIGRAM_ELEMENT = {
  0: "M\xE9tal",
  // Ciel ☰
  1: "M\xE9tal",
  // Lac ☱
  2: "Feu",
  // Feu ☲
  3: "Bois",
  // Tonnerre ☳
  4: "Bois",
  // Vent ☴
  5: "Eau",
  // Eau ☵
  6: "Terre",
  // Montagne ☶
  7: "Terre"
  // Terre ☷
};
var TRIGRAM_REL_DIRECT = {
  "same_tri": 3,
  // même trigramme (poids fort)
  "same": 1,
  // même élément, trigramme différent
  "produces": 3,
  // production (poids fort)
  "produced_by": 3,
  "destroys": -2,
  "destroyed_by": -2
};
var TRIGRAM_REL_CROSS = {
  "same_tri": 1.5,
  // même trigramme (poids léger)
  "same": 0.5,
  "produces": 1.5,
  "produced_by": 1.5,
  "destroys": -1,
  "destroyed_by": -1
};
var ROI_WEN_PAIRS = /* @__PURE__ */ new Set([
  "1-2",
  "3-4",
  "5-6",
  "7-8",
  "9-10",
  "11-12",
  "13-14",
  "15-16",
  "17-18",
  "19-20",
  "21-22",
  "23-24",
  "25-26",
  "27-28",
  "29-30",
  "31-32",
  "33-34",
  "35-36",
  "37-38",
  "39-40",
  "41-42",
  "43-44",
  "45-46",
  "47-48",
  "49-50",
  "51-52",
  "53-54",
  "55-56",
  "57-58",
  "59-60",
  "61-62",
  "63-64"
]);
function getTrigramRelation(elemA, elemB) {
  if (elemA === elemB) return "same";
  const prod = ["Bois\u2192Feu", "Feu\u2192Terre", "Terre\u2192M\xE9tal", "M\xE9tal\u2192Eau", "Eau\u2192Bois"];
  if (prod.includes(`${elemA}\u2192${elemB}`)) return "produces";
  if (prod.includes(`${elemB}\u2192${elemA}`)) return "produced_by";
  const dest = ["Bois\u2192Terre", "Terre\u2192Eau", "Eau\u2192Feu", "Feu\u2192M\xE9tal", "M\xE9tal\u2192Bois"];
  if (dest.includes(`${elemA}\u2192${elemB}`)) return "destroys";
  if (dest.includes(`${elemB}\u2192${elemA}`)) return "destroyed_by";
  return "same";
}
function calcIChingCompat(bdA, bdB) {
  const hexA = calcNatalIChing(bdA);
  const hexB = calcNatalIChing(bdB);
  const signals = [];
  const alerts = [];
  let score = 0;
  function scorePair(triA, triB, weights) {
    if (triA === triB) return weights["same_tri"] || 0;
    const elemA = TRIGRAM_ELEMENT[triA] || "Terre";
    const elemB = TRIGRAM_ELEMENT[triB] || "Terre";
    const rel = getTrigramRelation(elemA, elemB);
    return weights[rel] || 0;
  }
  const lowLowPts = scorePair(hexA.lower, hexB.lower, TRIGRAM_REL_DIRECT);
  const hiHiPts = scorePair(hexA.upper, hexB.upper, TRIGRAM_REL_DIRECT);
  score += lowLowPts + hiHiPts;
  const lowHiPts = scorePair(hexA.lower, hexB.upper, TRIGRAM_REL_CROSS);
  const hiLowPts = scorePair(hexA.upper, hexB.lower, TRIGRAM_REL_CROSS);
  score += lowHiPts + hiLowPts;
  const trigramMatch = lowLowPts > 0 || hiHiPts > 0 || lowHiPts > 0 || hiLowPts > 0;
  const pairs = [
    { pts: lowLowPts, a: hexA.lower, b: hexB.lower },
    { pts: hiHiPts, a: hexA.upper, b: hexB.upper },
    { pts: lowHiPts, a: hexA.lower, b: hexB.upper },
    { pts: hiLowPts, a: hexA.upper, b: hexB.lower }
  ];
  if (score > 0) {
    const best = pairs.reduce((a, b) => b.pts > a.pts ? b : a);
    const eA = TRIGRAM_ELEMENT[best.a] || "Terre";
    const eB = TRIGRAM_ELEMENT[best.b] || "Terre";
    signals.push(`\u2630 ${TRIGRAM_NAMES[best.a]} (${eA}) \u2194 ${TRIGRAM_NAMES[best.b]} (${eB}) \u2014 flux favorable`);
  }
  if (score < 0) {
    const worst = pairs.reduce((a, b) => b.pts < a.pts ? b : a);
    const eA = TRIGRAM_ELEMENT[worst.a] || "Terre";
    const eB = TRIGRAM_ELEMENT[worst.b] || "Terre";
    alerts.push(`\u2630 ${TRIGRAM_NAMES[worst.a]} (${eA}) \u2194 ${TRIGRAM_NAMES[worst.b]} (${eB}) \u2014 tension \xE9l\xE9mentaire`);
  }
  if (hexA.hexNum === hexB.hexNum) {
    score += 2;
    signals.push(`\u2630 M\xEAme hexagramme natal #${hexA.hexNum} \u2014 r\xE9sonance profonde`);
  }
  const pairKey = `${Math.min(hexA.hexNum, hexB.hexNum)}-${Math.max(hexA.hexNum, hexB.hexNum)}`;
  if (ROI_WEN_PAIRS.has(pairKey)) {
    score += 3;
    signals.push(`\u2630 Paire du Roi Wen (#${hexA.hexNum} \u2194 #${hexB.hexNum}) \u2014 compl\xE9mentarit\xE9 structurelle`);
  }
  const elementMatch = (TRIGRAM_ELEMENT[hexA.lower] || "Terre") === (TRIGRAM_ELEMENT[hexB.lower] || "Terre");
  const roiWen = ROI_WEN_PAIRS.has(pairKey);
  score = Math.max(-6, Math.min(16, score));
  return { hexA, hexB, trigramMatch, elementMatch, roiWen, score, signals, alerts };
}
var BAZI_INTERACTION_TEXT = {
  tian_he: {
    amour: "Quelque chose s'accorde entre toi et l'autre avant m\xEAme les mots \u2014 cette fusion c\xE9leste invite \xE0 b\xE2tir un lien rare, \xE0 condition de ne pas confondre \xE9vidence et acquis.",
    pro: "Une vision commune t'aligne instinctivement \u2014 cette fusion c\xE9leste acc\xE9l\xE8re les projets \xE0 condition de garder des r\xF4les clairs.",
    famille: "Au-del\xE0 du sang, une r\xE9sonance d'\xE2me t'unit \u2014 cette fusion c\xE9leste te ram\xE8ne toujours \xE0 l'essentiel, m\xEAme dans le silence."
  },
  liu_he: {
    amour: "Ton alliance agit dans le discret plus que dans le spectaculaire \u2014 cette complicit\xE9 invisible te rapproche quand tu cesses de tout demander \xE0 la preuve.",
    pro: "Tu sais te comprendre sans surjouer la coordination \u2014 cette alliance secr\xE8te devient pr\xE9cieuse quand elle sert une confiance sobre et r\xE9guli\xE8re.",
    famille: "Un lien silencieux te prot\xE8ge mutuellement \u2014 cette alliance secr\xE8te est le ciment invisible de ta famille."
  },
  san_he: {
    amour: "Tu avances comme si une troisi\xE8me force soutenait le lien \u2014 ce triangle d'harmonie donne de l'\xE9lan au couple quand tu choisis la m\xEAme direction int\xE9rieure.",
    pro: "La coop\xE9ration est inn\xE9e entre vous \u2014 ce triangle d'harmonie porte les projets loin si chacun nourrit le mouvement commun.",
    famille: "Tu incarnes la force du clan \u2014 ce triangle harmonieux cr\xE9e une fondation solide sur laquelle toute la structure familiale peut s'appuyer."
  },
  clash: {
    amour: "Tes diff\xE9rences te percutent pour mieux te r\xE9veiller \u2014 cette passion \xE9lectrique exige de ne jamais chercher \xE0 soumettre la nature de l'autre.",
    pro: "Le choc de tes m\xE9thodes est ton meilleur atout cr\xE9atif \u2014 accepte la contradiction, c'est elle qui t'emp\xEAche de stagner.",
    famille: "Ce lien bouscule tes certitudes g\xE9n\xE9rationnelles \u2014 c'est une \xE9preuve de tol\xE9rance qui te pousse \xE0 accepter ce que tu ne comprends pas."
  },
  harm: {
    amour: "La tension entre vous ne fait pas de bruit, elle s'installe \u2014 nomme t\xF4t les malentendus avant qu'ils ne deviennent une distance.",
    pro: "Un frottement invisible \xE9rode lentement \u2014 prends le temps de l'\xE9couter, il r\xE9v\xE8le o\xF9 tu dois ajuster.",
    famille: "Les vieilles ranc\u0153urs ou les maladresses non dites testent ce lien \u2014 la gu\xE9rison passe par le pardon des petites imperfections quotidiennes."
  },
  punishment: {
    amour: "Ton lien ne vient pas seulement apporter du confort, mais une le\xE7on \u2014 cette \xE9preuve karmique te demande de transformer une vieille mani\xE8re d'aimer.",
    pro: "Cette relation te confronte \xE0 une exigence plus grande que la simple efficacit\xE9 \u2014 l'\xE9preuve karmique pousse chacun \xE0 corriger ce qu'il r\xE9p\xE9tait sans le voir.",
    famille: "Tu portes ensemble une dette ou un fardeau transg\xE9n\xE9rationnel \u2014 ta relation est le creuset parfait pour briser enfin ce cycle."
  }
};
var BAZI_ELEMENT_SUFFIX = {
  produces: {
    amour: "L'un nourrit naturellement l'\xE9lan de l'autre \u2014 ton lien grandit quand ce soutien reste vivant et ne devient pas un sacrifice silencieux.",
    pro: "L'un alimente ce que l'autre sait porter \u2014 cette dynamique devient f\xE9conde quand la circulation reste r\xE9ciproque.",
    famille: "L'un soutient l'autre presque instinctivement \u2014 cette qualit\xE9 devient pr\xE9cieuse quand celui qui donne pense aussi \xE0 se pr\xE9server."
  },
  produced_by: {
    amour: "L'un nourrit naturellement l'\xE9lan de l'autre \u2014 ton lien grandit quand ce soutien ne devient pas un sacrifice silencieux.",
    pro: "L'un alimente ce que l'autre sait porter \u2014 cette dynamique reste f\xE9conde quand la circulation va dans les deux sens.",
    famille: "L'un soutient l'autre presque instinctivement \u2014 en famille, cette qualit\xE9 s'\xE9panouit quand celui qui re\xE7oit le reconna\xEEt."
  },
  destroys: {
    amour: "Une part du lien cherche \xE0 cadrer l'autre \u2014 l'amour respire mieux quand la protection ne glisse pas vers la ma\xEEtrise.",
    pro: "L'un impose facilement le rythme \u2014 au travail, cela fonctionne quand l'autorit\xE9 \xE9claire sans \xE9craser.",
    famille: "L'un tend \xE0 prendre le dessus sur la dynamique \u2014 le lien s'apaise quand le cadre laisse encore de la place \xE0 la respiration."
  },
  destroyed_by: {
    amour: "Tu touches chez l'autre une zone fragile \u2014 l'amour demande ici plus de d\xE9licatesse que d'intensit\xE9.",
    pro: "Tes \xE9nergies se contrarient subtilement \u2014 la cl\xE9 est de simplifier et de ne pas exiger de l'autre qu'il fonctionne comme toi.",
    famille: "Le lien fatigue plus qu'il ne heurte \u2014 la relation s'all\xE8ge quand on remplace la correction par l'\xE9coute."
  },
  same: {
    amour: "Tu vibres sur une mati\xE8re proche \u2014 la relation gagne en profondeur quand la ressemblance n'efface pas la surprise.",
    pro: "Tu fonctionnes sur une logique similaire \u2014 c'est une force, \xE0 condition de ne pas tourner en rond dans les m\xEAmes r\xE9flexes.",
    famille: "Tu r\xE9agis avec une parent\xE9 int\xE9rieure \xE9vidente \u2014 le lien devient plus juste quand chacun garde sa mani\xE8re propre d'exister."
  }
};
function baziBriefText(bazi, mode) {
  let interactionKey = null;
  if (bazi.heavenlyCombination) interactionKey = "tian_he";
  else if (bazi.liuHe) interactionKey = "liu_he";
  else if (bazi.triad) interactionKey = "san_he";
  else if (bazi.clash) interactionKey = "clash";
  else if (bazi.harm) interactionKey = "harm";
  else if (bazi.punishments.length > 0) interactionKey = "punishment";
  const rel = bazi.elementRelation;
  const suffix = BAZI_ELEMENT_SUFFIX[rel]?.[mode] || "";
  if (interactionKey) {
    const main = BAZI_INTERACTION_TEXT[interactionKey]?.[mode] || "";
    return suffix ? `${main} ${suffix}` : main;
  }
  return suffix || BAZI_ELEMENT_SUFFIX["same"][mode];
}
var LP_PAIR_TEXT = {
  "1-1": "Deux leaders se rencontrent ici \u2014 ton lien devient puissant quand tu d\xE9cides de construire ensemble au lieu de mesurer sans cesse qui m\xE8ne.",
  "1-2": "Le pionnier (1) trace la voie, le diplomate (2) harmonise le voyage. Honore tes r\xF4les respectifs : l'un donne l'impulsion, l'autre cr\xE9e le ciment qui fait durer.",
  "1-3": "Le leader (1) et le cr\xE9ateur (3) forment un duo \xE9tincelant. Canalise cette \xE9nergie \xE9lectrique dans des projets audacieux pour ne pas t'\xE9puiser en batailles d'ego.",
  "1-4": "L'initiateur (1) apporte l'\xE9tincelle, le b\xE2tisseur (4) pose les fondations. Respecte le rythme de l'autre : la fulgurance a besoin de patience pour s'incarner.",
  "1-5": "Le leader (1) trouve en l'aventurier (5) un alli\xE9 qui repousse ses limites. Ensemble, transformez les id\xE9es en mouvement, tout en gardant un point d'ancrage.",
  "1-6": "Le leader (1) veut agir, le protecteur (6) veut prendre soin \u2014 ton lien s'\xE9panouit quand l'ambition sert aussi quelque chose de plus grand.",
  "1-7": "L'homme d'action (1) croise le chercheur (7). Accepte tes silences mutuels : l'un a besoin de conqu\xE9rir le monde, l'autre de le comprendre de l'int\xE9rieur.",
  "1-8": "Deux puissances pures (1 et 8) qui visent les sommets. Cette alliance de titans soul\xE8vera des montagnes, \xE0 condition de partager le pouvoir avec une loyaut\xE9 totale.",
  "1-9": "Le pionnier (1) donne l'\xE9lan, l'humaniste (9) donne le sens global. Mets ton intensit\xE9 commune au service d'un id\xE9al plus grand que ton couple.",
  "2-2": "Deux diplomates cr\xE9ent un havre de paix absolue. Prends garde cependant \xE0 ne pas fuir les confrontations n\xE9cessaires par peur de briser cette douce harmonie.",
  "2-3": "Le conciliateur (2) offre l'\xE9coute, l'artiste (3) apporte la lumi\xE8re. Laisse la joie irradier ton lien tout en prot\xE9geant la grande sensibilit\xE9 de chacun.",
  "2-4": "Le diplomate (2) et le b\xE2tisseur (4) posent les fondations en silence. Ta force est dans la constance : c\xE9l\xE8bre la s\xE9curit\xE9 in\xE9branlable de ton lien.",
  "2-5": "L'ancrage doux du diplomate (2) croise le vent de libert\xE9 de l'aventurier (5). Apprends la danse de la distance : l'un offre le port, l'autre ram\xE8ne l'horizon.",
  "2-6": "Entre le diplomate (2) et le nourricier (6), le d\xE9vouement est roi. Ton lien est un nid chaleureux, veille juste \xE0 ne pas t'oublier en voulant trop donner.",
  "2-7": "La sensibilit\xE9 du diplomate (2) s'allie \xE0 la profondeur du sage (7). Ta connexion est spirituelle : respecte ton besoin de calme pour mieux te retrouver.",
  "2-8": "Le diplomate (2) soutient, l'ambitieux (8) dirige. C'est un tandem redoutable si la valeur inestimable de celui qui reste dans l'ombre est pleinement reconnue.",
  "2-9": "Le conciliateur (2) soigne l'individu, l'humaniste (9) embrasse le monde. Ta relation est un baume apaisant, irrigue-la de compassion mutuelle.",
  "3-3": "Deux cr\xE9ateurs ensemble font p\xE9tiller l'existence ! Partage ton enthousiasme et tes rires, mais n'oublie pas d'ancrer tes r\xEAves dans la r\xE9alit\xE9 mat\xE9rielle.",
  "3-4": "L'artiste (3) colore la vie, le b\xE2tisseur (4) dresse les murs. Tes diff\xE9rences sont ta richesse : la fantaisie a besoin d'un cadre pour s'\xE9panouir.",
  "3-5": "Le cr\xE9atif (3) et l'aventurier (5) forment une tornade d'enthousiasme. Mange la vie \xE0 pleines dents, mais construis un point de chute pour ne pas te disperser.",
  "3-6": "La joie du cr\xE9ateur (3) r\xE9chauffe le c\u0153ur du protecteur (6). Laisse l'imagination all\xE9ger tes responsabilit\xE9s : ta force r\xE9side dans ton rayonnement joyeux.",
  "3-7": "Le communicant (3) rencontre l'analyste silencieux (7). C'est le dialogue entre la lumi\xE8re et la profondeur : apprends \xE0 ch\xE9rir l'authenticit\xE9 derri\xE8re les mots non dits.",
  "3-8": "L'inspirateur (3) vend le r\xEAve, l'ambitieux (8) le r\xE9alise et le structure. Un potentiel immense, si la l\xE9g\xE8ret\xE9 de l'un respecte le s\xE9rieux de l'autre.",
  "3-9": "Le cr\xE9atif (3) et le philosophe (9) portent une vision romantique de l'existence. Exprime tes id\xE9aux par l'art, le verbe ou le c\u0153ur pour inspirer le monde.",
  "4-4": "Deux b\xE2tisseurs cimentent une relation indestructible. L'engagement est total, mais pense \xE0 ouvrir parfois les fen\xEAtres pour laisser entrer l'impr\xE9vu et la l\xE9g\xE8ret\xE9.",
  "4-5": "La structure absolue (4) face \xE0 la libert\xE9 pure (5). C'est un d\xE9fi magn\xE9tique : offre-toi des racines et des ailes, sans jamais chercher \xE0 t'enfermer.",
  "4-6": "Le roc (4) s'associe au nid (6). C'est la garantie d'une s\xE9curit\xE9 mat\xE9rielle et affective absolue : la base id\xE9ale pour faire grandir la confiance sereinement.",
  "4-7": "Le pragmatique (4) et l'intellectuel (7) se rejoignent dans l'exigence. Ton lien est profond : partage tes connaissances et b\xE2tis un refuge loin du tumulte.",
  "4-8": "Le travailleur (4) et le visionnaire mat\xE9riel (8) forment un empire. La solidit\xE9 est garantie, \xE0 condition de ne pas oublier d'y injecter de la tendresse gratuite.",
  "4-9": "L'ancrage strict du b\xE2tisseur (4) face aux vastes id\xE9aux de l'humaniste (9). Rapproche tes mondes en donnant une utilit\xE9 concr\xE8te \xE0 tes r\xEAves de changement.",
  "5-5": "Deux \xE9lectrons libres sur la m\xEAme longueur d'onde. Le mouvement est ton moteur : innove ensemble, mais d\xE9finis un pacte clair pour ne pas te perdre de vue.",
  "5-6": "L'esprit libre (5) rencontre le gardien du foyer (6). Apprends \xE0 aimer l'ancrage sans te sentir pris au pi\xE8ge, et offre la s\xE9curit\xE9 sans chercher \xE0 retenir.",
  "5-7": "L'explorateur du monde (5) et l'explorateur de l'\xE2me (7) s'intriguent mutuellement. Respecte ton besoin commun d'ind\xE9pendance pour nourrir de passionnantes conversations.",
  "5-8": "L'adaptabilit\xE9 de l'aventurier (5) au service de la puissance de l'ambitieux (8). Un quotidien tr\xE9pidant t'attend, si l'adr\xE9naline ne masque pas le besoin de douceur.",
  "5-9": "L'aventurier (5) et le citoyen du monde (9) regardent tous deux vers l'horizon. Vis ce lien comme une grande \xE9pop\xE9e, sans chercher \xE0 figer l'instant.",
  "6-6": "Deux \xE2mes nourrici\xE8res d\xE9bordantes d'amour. Le risque n'est pas le manque, mais l'\xE9touffement : aime-toi intens\xE9ment, mais pr\xE9serve tes identit\xE9s individuelles.",
  "6-7": "Le c\u0153ur chaud (6) enlace l'esprit analytique (7). La chaleur humaine apprivoise la distance : respecte le myst\xE8re de l'autre sans jamais te sentir rejet\xE9.",
  "6-8": "Le protecteur (6) g\xE8re l'humain, l'ambitieux (8) g\xE8re la direction. Une compl\xE9mentarit\xE9 redoutable pour construire un patrimoine solide et un foyer florissant.",
  "6-9": "Le d\xE9vouement aux proches (6) rencontre le d\xE9vouement \xE0 l'humanit\xE9 (9). Ton amour a vocation \xE0 d\xE9border : accueille les autres dans ta lumi\xE8re sans te sacrifier.",
  "7-7": "Deux chercheurs de v\xE9rit\xE9 partagent un silence \xE9loquent. Ton lien est d'une grande noblesse intellectuelle : n'oublie pas d'y ramener la chaleur du corps et du rire.",
  "7-8": "L'analyste profond (7) conseille le d\xE9cideur puissant (8). Une alliance strat\xE9gique brillante o\xF9 l'esprit guide l'action. Honore la sagesse de l'un et le courage de l'autre.",
  "7-9": "Le mystique solitaire (7) et l'id\xE9aliste (9) tissent une connexion spirituelle rare. \xC9change sur tes visions du monde pour \xE9lever constamment ta relation.",
  "8-8": "Deux puissances souveraines se mesurent l'une \xE0 l'autre. Le succ\xE8s est garanti si te reste des alli\xE9s ind\xE9fectibles, fuyant \xE0 tout prix la comp\xE9tition intime.",
  "8-9": "L'architecte mat\xE9riel (8) soutient l'id\xE9aliste (9). Mets ta puissance au service de causes nobles : tu accompliras des miracles main dans la main.",
  "9-9": "Deux philanthropes port\xE9s par des id\xE9aux immenses. Ton lien porte naturellement plus loin que le duo, \xE0 condition de cultiver ton propre jardin d'intimit\xE9."
};
var LP_MASTER_TEXT = {
  "11-11": "Deux intuitions fulgurantes en miroir. La r\xE9sonance psychique est magique mais \xE9lectrisante : ancre-toi r\xE9guli\xE8rement dans le r\xE9el pour ne pas \xE9puiser tes syst\xE8mes nerveux.",
  "11-22": "Le messager spirituel (11) face \xE0 l'architecte terrien (22). Une tension stimulante entre l'id\xE9al et le concret : apprends patiemment la langue de l'autre pour marier le ciel et la terre.",
  "11-33": "Le visionnaire inspir\xE9 (11) s'allie au guide bienveillant (33). Une harmonie d'\xE2me exceptionnelle : ta relation est un sanctuaire de lumi\xE8re qui \xE9l\xE8vera tous ceux qui t'entourent.",
  "22-22": "Deux ma\xEEtres b\xE2tisseurs \xE9rigent un empire. Tes capacit\xE9s de concr\xE9tisation sont hors normes : vise l'excellence, mais garde du temps pour la douceur et le l\xE2cher-prise.",
  "22-33": "La ma\xEEtrise mat\xE9rielle (22) au service de l'amour universel (33). Un potentiel de cr\xE9ation ph\xE9nom\xE9nal : utilise ta solidit\xE9 pour offrir un refuge aux id\xE9aux les plus purs.",
  "33-33": "Deux ma\xEEtres de compassion unissent leurs c\u0153urs. Ta relation est port\xE9e par une gr\xE2ce absolue : veille simplement \xE0 ne pas porter toute la mis\xE8re du monde sur tes \xE9paules."
};
var LP_MODE_SUFFIX = {
  amour: "Dans l'intimit\xE9, cette dynamique fleurit quand chacun se sent choisi sans devoir se renier.",
  pro: "Dans le travail, cette alliance devient forte quand les talents sont nomm\xE9s clairement et mis au bon endroit.",
  famille: "Dans la famille, ce lien s'\xE9panouit quand il laisse \xE0 chacun le droit d'exister sans r\xF4le fig\xE9."
};
function lpRelationText(lpA, lpB, mode) {
  let base;
  if (isMaster(lpA) && isMaster(lpB)) {
    const key2 = `${Math.min(lpA, lpB)}-${Math.max(lpA, lpB)}`;
    if (LP_MASTER_TEXT[key2]) {
      base = LP_MASTER_TEXT[key2];
      return `${base} ${LP_MODE_SUFFIX[mode]}`;
    }
  }
  const a = lpA > 9 ? lpA === 11 ? 2 : lpA === 22 ? 4 : 6 : lpA;
  const b = lpB > 9 ? lpB === 11 ? 2 : lpB === 22 ? 4 : 6 : lpB;
  const key = `${Math.min(a, b)}-${Math.max(a, b)}`;
  base = LP_PAIR_TEXT[key] || `Chemin ${lpA} \xD7 ${lpB} \u2014 explore ta compl\xE9mentarit\xE9 unique.`;
  return `${base} ${LP_MODE_SUFFIX[mode]}`;
}
var ICHING_TEMPLATES = {
  same_hex: {
    amour: "Marqu\xE9s tous deux par {hexA}, tu te regardes dans l'\xE2me de l'autre \u2014 prot\xE8ge ton individualit\xE9 pour ne pas te dissoudre dans cette fusion.",
    pro: "Double dose de {hexA} \u2014 tes m\xE9thodes sont identiques. Excellent pour l'ex\xE9cution, mais pense \xE0 chercher l'inspiration \xE0 l'ext\xE9rieur.",
    famille: "Partageant {hexA}, tu portes le m\xEAme bagage existentiel \u2014 c'est un lien de compr\xE9hension absolue, rare et pr\xE9cieux au sein du clan."
  },
  roi_wen: {
    amour: "{hexA} et {hexB} sont les deux faces d'une m\xEAme pi\xE8ce \u2014 tu \xE9tais faits pour combler intimement les vides de l'autre.",
    pro: "Un \xE9quilibre parfait : {hexA} et {hexB} se r\xE9pondent \u2014 l\xE0 o\xF9 l'un montre une limite, l'autre intervient comme par magie.",
    famille: "Dans le grand cycle de mutations entre {hexA} et {hexB}, tu incarnes l'\xE9quilibre structurel de la famille, l'ombre et la lumi\xE8re."
  },
  synergy: {
    amour: "Entre {hexA} et {hexB}, ton amour coule de source \u2014 l'osmose de tes \xE9nergies transforme le quotidien en une cr\xE9ation continue.",
    pro: "L'association de {hexA} et {hexB} d\xE9cuple ton efficacit\xE9 \u2014 ensemble, tu franchis des paliers inaccessibles en solitaire.",
    famille: "De {hexA} vers {hexB}, ce lien de sang est une b\xE9n\xE9diction fluide \u2014 tu te portes et tu \xE9l\xE8ves mutuellement avec gr\xE2ce."
  },
  dialogue: {
    amour: "La rencontre de {hexA} et {hexB} demande de l'\xE9coute, mais tes diff\xE9rences se r\xE9v\xE8lent \xEAtre de magnifiques forces compl\xE9mentaires.",
    pro: "Face \xE0 face, {hexA} et {hexB} instaurent un d\xE9bat constructif \u2014 cultive cette intelligence collective, elle est le moteur de tes succ\xE8s.",
    famille: "Tes rythmes entre {hexA} et {hexB} diff\xE8rent, mais une profonde bienveillance familiale permet d'en faire une richesse plut\xF4t qu'un clivage."
  },
  neutral: {
    amour: "De {hexA} \xE0 {hexB}, rien ne force le lien, mais rien ne l'emp\xEAche \u2014 cette neutralit\xE9 devient profondeur si tu choisis vraiment d'habiter la relation.",
    pro: "De {hexA} \xE0 {hexB}, le terrain est sobre, sans friction majeure \u2014 cela demande plus de conscience, mais laisse une grande libert\xE9 de construction.",
    famille: "{hexA} et {hexB} coexistent sereinement \u2014 l'absence d'entrem\xEAlement excessif garantit une paix familiale appr\xE9ciable."
  },
  tension: {
    amour: "Entre {hexA} et {hexB}, l'alchimie br\xFBle et frotte \u2014 ne fuis pas les crises, elles viennent polir ta relation comme un joyau.",
    pro: "La confrontation de {hexA} et {hexB} g\xE9n\xE8re des \xE9tincelles \u2014 canalise cette tension vers la r\xE9solution de probl\xE8mes plut\xF4t que vers l'ego.",
    famille: "Le d\xE9fi entre {hexA} et {hexB} est r\xE9el \u2014 cette rudesse apparente cache souvent une le\xE7on d'\xE9mancipation n\xE9cessaire pour la lign\xE9e."
  }
};
function ichingBriefText(iching, mode) {
  const nameA = HEX_NAMES[iching.hexA.hexNum] || `Hexagramme ${iching.hexA.hexNum}`;
  const nameB = HEX_NAMES[iching.hexB.hexNum] || `Hexagramme ${iching.hexB.hexNum}`;
  let band;
  if (iching.hexA.hexNum === iching.hexB.hexNum) {
    band = "same_hex";
  } else {
    const pairKey = `${Math.min(iching.hexA.hexNum, iching.hexB.hexNum)}-${Math.max(iching.hexA.hexNum, iching.hexB.hexNum)}`;
    if (ROI_WEN_PAIRS.has(pairKey)) band = "roi_wen";
    else if (iching.score >= 8) band = "synergy";
    else if (iching.score >= 3) band = "dialogue";
    else if (iching.score >= 0) band = "neutral";
    else band = "tension";
  }
  const template = ICHING_TEMPLATES[band]?.[mode] || ICHING_TEMPLATES["neutral"][mode];
  return template.replace(/\{hexA\}/g, nameA).replace(/\{hexB\}/g, nameB);
}
var PEACH_TEXT = {
  double: {
    amour: "La Double Fleur de P\xEAcher brille des deux c\xF4t\xE9s \u2014 une attraction magn\xE9tique r\xE9ciproque et rare, comme deux miroirs qui s'illuminent mutuellement. Ce lien charnel est exceptionnel.",
    pro: "Un magn\xE9tisme professionnel bidirectionnel rare \u2014 chacun inspire l'autre naturellement, cr\xE9ant un duo dont le charisme combin\xE9 d\xE9passe la somme des parties.",
    famille: "Un favoritisme affectueux et chaleureux caract\xE9rise ce lien \u2014 tu \xE9prouves une sympathie instinctive qui adoucit m\xEAme les pires d\xE9saccords."
  },
  active: {
    amour: "La myst\xE9rieuse \xE9toile de la Fleur de P\xEAcher illumine ton lien \u2014 une attirance magn\xE9tique, presque irrationnelle, te pousse irr\xE9sistiblement l'un vers l'autre.",
    pro: "Tu exerces un charisme r\xE9ciproque ind\xE9niable \u2014 cette sympathie naturelle fluidifie tes \xE9changes et donne de l'\xE9clat \xE0 ton duo.",
    famille: "Un favoritisme affectueux et chaleureux caract\xE9rise ce lien \u2014 tu \xE9prouves une sympathie instinctive qui adoucit m\xEAme les pires d\xE9saccords."
  },
  inactive: {
    amour: "L'absence de cette \xE9toile romantique n'est pas une faille \u2014 ton amour repose sur des fondations bien plus profondes et p\xE9rennes qu'une simple \xE9tincelle \xE9ph\xE9m\xE8re.",
    pro: "Ta relation repose sur le m\xE9rite et le respect des comp\xE9tences, loin des jeux de s\xE9duction ou de favoritisme.",
    famille: "Un lien authentique et traditionnel \u2014 l'attachement se construit par la loyaut\xE9 de l'histoire partag\xE9e, sans fioritures \xE9motionnelles."
  }
};
var FAMILY_CONTEXT_SUFFIX = {
  frere_frere: "Entre fr\xE8res, le respect passe souvent mieux par les actes que par les grands mots.",
  soeur_soeur: "Entre s\u0153urs, la finesse du lien demande de prot\xE9ger la confiance autant que la franchise.",
  frere_soeur: "Dans la fratrie mixte, ce lien \xE9volue quand chacun cesse de rejouer sa place d'origine.",
  pere_fils: "Entre un p\xE8re et son fils, le lien s'apaise quand l'autorit\xE9 laisse place \xE0 la reconnaissance mutuelle.",
  pere_fille: "Entre un p\xE8re et sa fille, le lien s'\xE9claire quand la protection sait aussi faire confiance.",
  mere_fils: "Entre une m\xE8re et son fils, le lien grandit quand la transmission laisse de la place \xE0 l'autonomie.",
  mere_fille: "Entre une m\xE8re et sa fille, le lien respire mieux quand l'amour ne cherche pas \xE0 tout contr\xF4ler.",
  gp_petit_fils: "Un grand-p\xE8re et son petit-fils partagent un fil invisible \u2014 la sagesse passe mieux par l'exemple que par la le\xE7on.",
  gp_petite_fille: "Un grand-p\xE8re et sa petite-fille tissent un lien de tendresse rare \u2014 la m\xE9moire s'adoucit quand elle est offerte sans attente.",
  gm_petit_fils: "Une grand-m\xE8re et son petit-fils forment un duo complice \u2014 l'h\xE9ritage prend vie quand il inspire plut\xF4t qu'il n'oblige.",
  gm_petite_fille: "Une grand-m\xE8re et sa petite-fille se reconnaissent \xE0 travers le temps \u2014 ce lien porte une douceur que les ann\xE9es n'effacent pas.",
  coloc: "Ce lien quotidien demande une attention simple : respirer ensemble sans s'envahir.",
  ami: "L'amiti\xE9 choisie porte une libert\xE9 que les liens du sang n'ont pas \u2014 honore-la en restant vrai l'un envers l'autre."
};
function appendFamilyContext(text, mode, familleSubType) {
  if (mode !== "famille" || !familleSubType) return text;
  const suffix = FAMILY_CONTEXT_SUFFIX[familleSubType];
  return suffix ? `${text} ${suffix}` : text;
}
function calcBond(bdA, nameA, bdB, nameB, mode = "amour", familleSubType) {
  const signals = [];
  const alerts = [];
  const sameBirthdate = bdA === bdB;
  const birthDateA = /* @__PURE__ */ new Date(bdA + "T12:00:00");
  const birthDateB = /* @__PURE__ */ new Date(bdB + "T12:00:00");
  const bazi = calcBaZiCompat(birthDateA, birthDateB);
  const baziNorm = Math.max(0, Math.min(100, Math.round((bazi.score + 34) / 78 * 100)));
  signals.push(...bazi.signals);
  alerts.push(...bazi.alerts);
  const numero = calcNumeroCompat(bdA, nameA, bdB, nameB, mode);
  const numNorm = Math.max(0, Math.min(100, Math.round(numero.total / 40 * 100)));
  signals.push(...numero.signals);
  alerts.push(...numero.alerts);
  const iching = calcIChingCompat(bdA, bdB);
  const ichNorm = Math.max(0, Math.min(100, Math.round((iching.score + 6) / 22 * 100)));
  signals.push(...iching.signals);
  alerts.push(...iching.alerts);
  const peachCrossed = bazi.peachBlossomCrossed;
  const peachLevel = bazi.peachBlossomLevel;
  const peachNorm = mode === "famille" ? 50 : peachLevel === 2 ? 90 : peachLevel === 1 ? 70 : 50;
  const w = WEIGHTS[mode];
  let rawBondScore = Math.round(
    baziNorm * w.bazi + numNorm * w.num + ichNorm * w.iching + peachNorm * w.peach
  );
  if (sameBirthdate) {
    rawBondScore = Math.min(78, rawBondScore);
    alerts.push("\u26A0\uFE0F M\xEAme date de naissance \u2014 compl\xE9mentarit\xE9 limit\xE9e (cap 78)");
  }
  let rawStructural;
  let archetypeBonus;
  let rawFinalBeforeGaussian;
  if (mode === "famille" && familleSubType) {
    rawStructural = rawBondScore;
    archetypeBonus = calcArchetypeHexBonus(familleSubType, iching.hexA.hexNum, iching.hexB.hexNum);
    if (archetypeBonus > 0) {
      const hexPair = ARCHETYPE_HEX_PAIRS[familleSubType];
      const matchedHex = hexPair?.find((h) => h === iching.hexA.hexNum || h === iching.hexB.hexNum);
      const cible = archetypeBonus === 2 ? "tes deux th\xE8mes natals" : "l'un de tes th\xE8mes natals";
      signals.push(`\u{1F31F} R\xE9sonance Arch\xE9typale : L'Hexagramme ${matchedHex} (${ARCHETYPE_NAMES[matchedHex]}), symbole de ce lien, est pr\xE9sent dans ${cible} (+${archetypeBonus} affich\xE9 s\xE9par\xE9ment)`);
    }
    rawFinalBeforeGaussian = rawBondScore;
  }
  let scoreGlobal = mode === "famille" ? bondGaussianCDFFamille(rawBondScore) : mode === "pro" ? bondGaussianCDFPro(rawBondScore) : bondGaussianCDF(rawBondScore);
  if (sameBirthdate) scoreGlobal = Math.min(78, scoreGlobal);
  scoreGlobal = Math.max(0, Math.min(100, scoreGlobal));
  const label = mode === "famille" ? getFamilleLabel(scoreGlobal) : getBondLabel(scoreGlobal);
  if (mode === "famille" && familleSubType && (familleSubType.startsWith("gp_") || familleSubType.startsWith("gm_")) && scoreGlobal >= 82) {
    signals.unshift("\u{1F331} R\xE9surgence g\xE9n\xE9rationnelle \u2014 r\xE9sonance d'\xE2me exceptionnelle qui a saut\xE9 une g\xE9n\xE9ration");
  }
  const familleCategory = mode === "famille" && familleSubType ? getFamilleCategory(familleSubType) : void 0;
  const familleDesc = mode === "famille" && familleCategory ? FAMILLE_DESC[label.name]?.[familleCategory] ?? label.desc : void 0;
  const conseil = buildBondConseil(mode, scoreGlobal, bazi, numero, iching, peachCrossed, familleSubType);
  const lpA = calcLifePath(bdA);
  const lpB = calcLifePath(bdB);
  const baziTechs = [...bazi.signals, ...bazi.alerts];
  const numTechs = [...numero.signals, ...numero.alerts];
  const ichTechs = [...iching.signals, ...iching.alerts];
  numTechs.unshift(`Chemin de Vie ${lpA.v}\xD7${lpB.v}`);
  ichTechs.unshift(`#${iching.hexA.hexNum} ${HEX_NAMES[iching.hexA.hexNum] || ""} \u2194 #${iching.hexB.hexNum} ${HEX_NAMES[iching.hexB.hexNum] || ""}`);
  const baziDetail = appendFamilyContext(baziBriefText(bazi, mode), mode, familleSubType);
  const numDetail = lpRelationText(lpA.v, lpB.v, mode);
  const ichDetail = ichingBriefText(iching, mode);
  const peachDetail = peachLevel === 2 ? PEACH_TEXT.double[mode] : peachLevel === 1 ? PEACH_TEXT.active[mode] : PEACH_TEXT.inactive[mode];
  const peachTechs = peachLevel === 2 ? ["\u{1F338}\u{1F338} Double Fleur de P\xEAcher \u2014 bidirectionnelle"] : peachLevel === 1 ? ["\u{1F338} Fleur de P\xEAcher crois\xE9e \u2014 active"] : [];
  const breakdown = [
    {
      system: "BaZi",
      icon: "\u262F",
      score: baziNorm,
      weight: `${Math.round(w.bazi * 100)}%`,
      detail: baziDetail,
      technicals: baziTechs
    },
    {
      system: "Num\xE9rologie",
      icon: "\u2726",
      score: numNorm,
      weight: `${Math.round(w.num * 100)}%`,
      detail: numDetail,
      technicals: numTechs
    },
    {
      system: "Yi King",
      icon: "\u2630",
      score: ichNorm,
      weight: `${Math.round(w.iching * 100)}%`,
      detail: ichDetail,
      technicals: ichTechs
    },
    {
      system: "Peach Blossom",
      icon: "\u{1F338}",
      score: peachNorm,
      weight: `${Math.round(w.peach * 100)}%`,
      detail: peachDetail,
      technicals: peachTechs
    }
  ];
  const badges = [];
  if (bazi.heavenlyCombination) badges.push("\u{1F31F} Fusion C\xE9leste");
  if (mode !== "famille") {
    if (peachLevel === 2) badges.push("\u{1F338}\u{1F338} Double Fleur de P\xEAcher");
    else if (peachLevel === 1) badges.push("\u{1F338} Fleur de P\xEAcher Active");
  }
  if (isMaster(lpA.v) && isMaster(lpB.v)) badges.push("\u2728 Ma\xEEtres Nombres en R\xE9sonance");
  if (iching.roiWen) badges.push("\u262F \xC2mes Compl\xE9mentaires (Roi Wen)");
  if (bazi.liuHe) badges.push("\u{1F4AB} Harmonie Terrestre (Li\xF9 H\xE9)");
  if (bazi.triad) badges.push("\u{1F53A} Triangle Sacr\xE9 (San He)");
  const relevantBreakdown = mode === "famille" ? breakdown.filter((b) => b.system !== "Peach Blossom") : [...breakdown];
  const sortedBreakdown = relevantBreakdown.sort((a, b) => b.score - a.score);
  const strongest = sortedBreakdown[0];
  const weakest = sortedBreakdown[sortedBreakdown.length - 1];
  const SYSTEM_LABELS = {
    "BaZi": { amour: "une complicit\xE9 instinctive profonde", pro: "une compatibilit\xE9 de caract\xE8res naturelle", famille: "une r\xE9sonance de clan puissante" },
    "Num\xE9rologie": { amour: "un alignement de valeurs remarquable", pro: "une vision partag\xE9e et compl\xE9mentaire", famille: "des chemins de vie qui convergent" },
    "Yi King": { amour: "une connexion spirituelle et symbolique", pro: "une dynamique d'\xE9volution commune", famille: "un h\xE9ritage symbolique qui te relie" },
    "Peach Blossom": { amour: "une attraction magn\xE9tique rare", pro: "un charisme r\xE9ciproque naturel", famille: "une sympathie instinctive profonde" }
  };
  const SYSTEM_DEFIS = {
    "BaZi": { amour: "apprivoiser tes diff\xE9rences de caract\xE8re", pro: "harmoniser tes rythmes de travail", famille: "d\xE9passer les tensions de temp\xE9rament" },
    "Num\xE9rologie": { amour: "aligner tes aspirations profondes", pro: "concilier tes visions strat\xE9giques", famille: "r\xE9concilier des chemins de vie divergents" },
    "Yi King": { amour: "trouver ton \xE9quilibre spirituel commun", pro: "synchroniser tes dynamiques de changement", famille: "accepter des h\xE9ritages symboliques diff\xE9rents" },
    "Peach Blossom": { amour: "construire au-del\xE0 de l'attirance physique", pro: "d\xE9passer les apparences pour collaborer en profondeur", famille: "ne pas confondre sympathie et v\xE9ritable proximit\xE9" }
  };
  const forceText = SYSTEM_LABELS[strongest.system]?.[mode] || "une connexion notable";
  const defiText = SYSTEM_DEFIS[weakest.system]?.[mode] || "trouver ton \xE9quilibre";
  const DISPLAY_NAME = { "Peach Blossom": "Fleur de P\xEAcher", "BaZi": "BaZi", "Num\xE9rologie": "Num\xE9rologie", "Yi King": "Yi King" };
  const strongName = DISPLAY_NAME[strongest.system] || strongest.system;
  let summary;
  if (scoreGlobal >= 85) {
    summary = `Ce lien repose sur ${forceText} (${strongName} \xE0 ${strongest.score}%). Ton principal d\xE9fi sera de ${defiText}. Cultive cette connexion rare avec gratitude.`;
  } else if (scoreGlobal >= 65) {
    summary = `Ce lien brille par ${forceText} (${strongName} \xE0 ${strongest.score}%). Pour le renforcer, travaille \xE0 ${defiText}. L'effort conscient transformera le bon en excellent.`;
  } else if (scoreGlobal >= 45) {
    summary = `Ce lien a du potentiel gr\xE2ce \xE0 ${forceText} (${strongName} \xE0 ${strongest.score}%). Le chemin de croissance passe par ${defiText}. Les diff\xE9rences sont un terrain d'apprentissage, pas un obstacle.`;
  } else {
    summary = `Ce lien t'invite \xE0 ${defiText}. M\xEAme si les d\xE9fis sont r\xE9els, ${forceText} (${strongName}) offre un point d'ancrage. La patience et la communication seront tes alli\xE9es.`;
  }
  const contextBadge = mode === "famille" && familleSubType ? getContextBadge(scoreGlobal, familleSubType) : void 0;
  return {
    mode,
    scoreGlobal,
    label,
    bazi,
    numerology: numero,
    iching,
    peachCrossed,
    sameBirthdate,
    familleDesc,
    familleCategory,
    signals,
    alerts,
    conseil,
    summary,
    badges,
    breakdown,
    contextBadge,
    // V4.7 debug pipeline famille
    rawStructural,
    archetypeBonus,
    rawFinalBeforeGaussian
  };
}
function buildBondConseil(mode, score, bazi, numero, iching, peachCrossed, familleSubType) {
  if (mode === "famille") {
    const sub = familleSubType ?? "frere_soeur";
    const cat = sub === "coloc" ? "coloc" : sub === "ami" ? "ami" : sub === "frere_frere" ? "frere" : sub === "soeur_soeur" ? "soeur" : sub === "frere_soeur" ? "fratrie_mixte" : sub === "pere_fils" ? "pere_fils" : sub === "pere_fille" ? "pere_fille" : sub === "mere_fils" ? "mere_fils" : sub === "mere_fille" ? "mere_fille" : sub === "gp_petit_fils" ? "gp_petit_fils" : sub === "gp_petite_fille" ? "gp_petite_fille" : sub === "gm_petit_fils" ? "gm_petit_fils" : sub === "gm_petite_fille" ? "gm_petite_fille" : "parent";
    const CONSEILS = {
      karmique: {
        frere: "Entre fr\xE8res, ta loyaut\xE9 d\xE9passe les mots. Ce lien ancien te demande de te respecter comme deux forces \xE9gales, chacune indispensable \xE0 l'autre.",
        soeur: "Entre s\u0153urs, ta complicit\xE9 touche \xE0 l'\xE2me. Ce lien profond t'invite \xE0 prot\xE9ger la confiance mutuelle comme un tr\xE9sor transmis par le sang.",
        fratrie_mixte: "Ton lien fraternel cache une loyaut\xE9 ancienne. Respecte tes diff\xE9rences comme deux piliers d'une m\xEAme maison.",
        pere_fils: "Ce lien p\xE8re-fils porte une m\xE9moire fondatrice. Transmets l'essentiel sans modeler \u2014 le fils trouve sa voie en marchant, pas en suivant.",
        pere_fille: "Ce lien p\xE8re-fille rec\xE8le une tendresse ancienne. Offre la confiance avant la protection \u2014 c'est elle qui lib\xE8re vraiment.",
        mere_fils: "Ce lien m\xE8re-fils porte une empreinte profonde. Aime sans retenir \u2014 l'autonomie du fils honore ce que tu as b\xE2ti.",
        mere_fille: "Ce lien m\xE8re-fille touche \xE0 quelque chose d'ancestral. Guide sans enfermer \u2014 la fille grandit quand l'amour cesse de tout contr\xF4ler.",
        parent: "Ce lien marque une \xE9tape fondatrice. Transmets sans modeler, comme on tend la main sans retenir.",
        gp_petit_fils: "Une sagesse ancienne circule entre grand-p\xE8re et petit-fils. L'h\xE9ritage se transmet mieux par l'exemple que par la le\xE7on.",
        gp_petite_fille: "Le lien grand-p\xE8re\u2013petite-fille porte une douceur rare. Offre ton exp\xE9rience comme un cadeau, sans attendre de retour.",
        gm_petit_fils: "La complicit\xE9 grand-m\xE8re\u2013petit-fils est un tr\xE9sor discret. L'histoire familiale prend vie quand elle inspire plut\xF4t qu'elle n'oblige.",
        gm_petite_fille: "Une m\xE9moire du c\u0153ur relie grand-m\xE8re et petite-fille \xE0 travers le temps. Ce fil d'or ne demande qu'\xE0 \xEAtre entretenu avec tendresse.",
        coloc: "Ta rencontre a du sens. Pr\xE9serve ton espace int\xE9rieur comme une pi\xE8ce \xE0 cl\xE9 personnelle.",
        ami: "Cette amiti\xE9 porte une reconnaissance d'\xE2me rare. Entretiens ce lien librement choisi \u2014 c'est sa gratuit\xE9 qui fait sa puissance."
      },
      fusionnel: {
        frere: "Ta complicit\xE9 fraternelle est instinctive et puissante. Laisse-toi respirer pour que la proximit\xE9 reste une force, jamais un poids.",
        soeur: "Ta connexion sororale est lumineuse et enveloppante. Garde un espace rien qu'\xE0 toi pour que cette chaleur ne devienne jamais \xE9touffante.",
        fratrie_mixte: "Ta complicit\xE9 est instinctive. Laisse chacun respirer pour \xE9viter que la proximit\xE9 ne devienne \xE9touffante.",
        pere_fils: "L'attachement p\xE8re-fils est fort, presque instinctif. Desserre l'\xE9treinte \u2014 la confiance du fils grandit dans l'espace que tu lui offres.",
        pere_fille: "La tendresse p\xE8re-fille est naturellement enveloppante. Laisse-la s'affirmer \u2014 la distance choisie renforce le lien.",
        mere_fils: "L'osmose m\xE8re-fils est puissante et protectrice. Laisse l'ind\xE9pendance grandir \u2014 c'est le plus beau cadeau d'une m\xE8re.",
        mere_fille: "Le miroir m\xE8re-fille est \xE0 la fois lumineux et exigeant. Garde un espace pour que chacune reste elle-m\xEAme dans cette proximit\xE9.",
        parent: "L'attachement est fort, presque enveloppant. Desserrer l\xE9g\xE8rement l'\xE9treinte renforce la confiance.",
        gp_petit_fils: "La tendresse du grand-p\xE8re coule avec une pudeur touchante. Un cadre simple suffit pour que l'intention ne devienne pas \xE9touffante.",
        gp_petite_fille: "Le grand-p\xE8re enveloppe sa petite-fille d'une affection discr\xE8te. Garde la l\xE9g\xE8ret\xE9 \u2014 c'est elle qui rend ce lien pr\xE9cieux.",
        gm_petit_fils: "La grand-m\xE8re offre \xE0 son petit-fils un amour sans condition. Veille \xE0 ce que la g\xE9n\xE9rosit\xE9 laisse aussi grandir l'autonomie.",
        gm_petite_fille: "L'amour grand-m\xE8re\u2013petite-fille est un fleuve tranquille. Que l'indulgence nourrisse sans devenir un refuge qui emp\xEAche d'avancer.",
        coloc: "La cohabitation semble fluide. D\xE9finis les territoires pour pr\xE9server l'\xE9quilibre.",
        ami: "Ton amiti\xE9 est intense et enveloppante. Garde chacun un jardin secret \u2014 la libert\xE9 pr\xE9serve les liens choisis."
      },
      complementaire: {
        frere: "Tu compenses naturellement les angles morts de l'autre. Cette compl\xE9mentarit\xE9 fraternelle est ta plus grande richesse \u2014 valorise-la au lieu de la comparer.",
        soeur: "Tes forces se compl\xE8tent avec une \xE9vidence rare. Ce tandem sororal brille quand chacune laisse l'autre occuper pleinement sa place.",
        fratrie_mixte: "Tu compenses les failles de l'autre. Valorise ces diff\xE9rences au lieu de les comparer.",
        pere_fils: "Le p\xE8re apporte au fils ce qu'il ignore encore. Fais de cette transmission un pont, pas un terrain d'attente.",
        pere_fille: "Le p\xE8re offre \xE0 sa fille une assise que rien ne remplace. Compl\xE8te-toi en laissant la confiance circuler dans les deux sens.",
        mere_fils: "La m\xE8re devine chez son fils ce qu'il n'ose pas dire. Transforme cette intuition en dialogue ouvert.",
        mere_fille: "La m\xE8re et la fille se compl\xE8tent comme deux faces d'un m\xEAme miroir. Ose nommer ce qui unit autant que ce qui distingue.",
        parent: "L'un apporte ce que l'autre ignore. Fais-en un pont plut\xF4t qu'un terrain d'attente.",
        gp_petit_fils: "Le grand-p\xE8re transmet au petit-fils par l'exemple plus que par la parole. Un rituel partag\xE9 \u2014 une marche, un outil \u2014 nourrit le lien.",
        gp_petite_fille: "Le grand-p\xE8re offre \xE0 sa petite-fille une stabilit\xE9 que les mots ne suffisent pas \xE0 d\xE9crire. Un geste r\xE9gulier suffit \xE0 ancrer ce lien.",
        gm_petit_fils: "La grand-m\xE8re porte la m\xE9moire vivante que le petit-fils saura r\xE9inventer. Un repas, un r\xE9cit \u2014 la transmission passe par le simple.",
        gm_petite_fille: "Grand-m\xE8re et petite-fille forment un tandem de transmission naturel. L'h\xE9ritage coule quand il est offert avec l\xE9g\xE8ret\xE9.",
        coloc: "Tes forces s'\xE9quilibrent. Clarifie les responsabilit\xE9s comme on trace une carte.",
        ami: "Tes talents se compl\xE8tent naturellement. Cette amiti\xE9 brille quand chacun occupe sa place sans rivaliser."
      },
      croissance: {
        frere: "Tes frictions fraternelles ne sont pas des obstacles mais des meules qui t'aff\xFBtent. Grandissez c\xF4te \xE0 c\xF4te sans chercher \xE0 prouver qui a raison.",
        soeur: "Ce lien sororal te pousse \xE0 te d\xE9passer. Les moments de tension sont des invitations d\xE9guis\xE9es \xE0 mieux te comprendre.",
        fratrie_mixte: "Les tensions sont des pierres qui polissent. Accepte-les comme un apprentissage commun.",
        pere_fils: "Le lien p\xE8re-fils traverse une mue n\xE9cessaire. Le fils a besoin de place pour devenir \u2014 soutiens sans diriger.",
        pere_fille: "Le p\xE8re et sa fille grandissent ensemble \xE0 travers les ajustements. Fais confiance \xE0 ce qui \xE9merge plut\xF4t qu'\xE0 ce que tu planifies.",
        mere_fils: "Le lien m\xE8re-fils \xE9volue vers un nouveau chapitre. Le fils a besoin de sentir que partir, c'est aussi honorer ce lien.",
        mere_fille: "La relation m\xE8re-fille se r\xE9invente \xE0 chaque \xE9tape. Accompagne le changement en acceptant que la fille trace sa propre route.",
        parent: "Une \xE9tape de s\xE9paration s'annonce. Soutiens sans diriger chaque pas.",
        gp_petit_fils: "Le grand-p\xE8re apprend \xE0 l\xE2cher prise sur ce qu'il connaissait. Le petit-fils en fera quelque chose de neuf \u2014 fais-lui confiance.",
        gp_petite_fille: "Le lien grand-p\xE8re\u2013petite-fille \xE9volue avec la douceur du temps. Ajuste tes attentes avec la patience que tu as toujours su montrer.",
        gm_petit_fils: "Les r\xF4les \xE9voluent et la grand-m\xE8re le sait mieux que quiconque. Laisse le petit-fils r\xE9inventer ce lien \xE0 sa mani\xE8re.",
        gm_petite_fille: "Grand-m\xE8re et petite-fille traversent ensemble une \xE9tape de transformation. Le lien se renouvelle quand chacune accepte de changer.",
        coloc: "Les frictions r\xE9v\xE8lent les habitudes. Parle t\xF4t pour \xE9viter les silences lourds.",
        ami: "L'amiti\xE9 grandit \xE0 travers les d\xE9saccords assum\xE9s. Dites ce qui compte avant que le non-dit ne prenne racine."
      },
      transformation: {
        frere: "Le feu entre fr\xE8res peut br\xFBler ou forger. Pose des limites franches \u2014 la clart\xE9 est ta meilleure alli\xE9e.",
        soeur: "L'intensit\xE9 entre s\u0153urs demande du courage. Nomme ce qui doit l'\xEAtre avec douceur, la v\xE9rit\xE9 lib\xE8re plus qu'elle ne blesse.",
        fratrie_mixte: "Le feu peut br\xFBler ou \xE9clairer. Pose des limites claires pour \xE9viter l'escalade.",
        pere_fils: "Certains sch\xE9mas p\xE8re-fils demandent \xE0 \xEAtre nomm\xE9s. Le fils se lib\xE8re quand le p\xE8re accepte de ne plus avoir toutes les r\xE9ponses.",
        pere_fille: "Le lien p\xE8re-fille peut porter des attentes silencieuses. Nomme-les avec douceur \u2014 la v\xE9rit\xE9 renforce ce que le silence fragilise.",
        mere_fils: "Des attentes maternelles anciennes p\xE8sent parfois sur le fils. L'amour se renforce quand il cesse d'\xEAtre conditionnel.",
        mere_fille: "Le miroir m\xE8re-fille peut amplifier les tensions autant que les joies. Revisite les attentes pour que l'amour redevienne l\xE9ger.",
        parent: "Certains sch\xE9mas demandent \xE0 \xEAtre nomm\xE9s. La v\xE9rit\xE9 dite calmement lib\xE8re.",
        gp_petit_fils: "Des blessures anciennes peuvent remonter par la lign\xE9e masculine. \xC9coute le silence du grand-p\xE8re \u2014 il en dit souvent plus que ses mots.",
        gp_petite_fille: "Le grand-p\xE8re porte parfois des non-dits d'un autre temps. Sa petite-fille peut adoucir ces silences en offrant sa pr\xE9sence sans exiger de mots.",
        gm_petit_fils: "La grand-m\xE8re transmet parfois des non-dits d'une autre \xE9poque. Le petit-fils peut transformer cet h\xE9ritage en choisissant ce qu'il garde.",
        gm_petite_fille: "Entre grand-m\xE8re et petite-fille, les blessures anciennes se transmettent parfois en silence. Offre-toi l'\xE9coute que les g\xE9n\xE9rations pass\xE9es n'ont pas eue.",
        coloc: "La tension signale un d\xE9s\xE9quilibre. Red\xE9finir les r\xE8gles peut tout changer.",
        ami: "Cette amiti\xE9 traverse une zone de turbulence. Pose les mots avec franchise \u2014 un vrai ami pr\xE9f\xE8re la v\xE9rit\xE9 au confort."
      },
      profond: {
        frere: "L'intensit\xE9 entre fr\xE8res peut \xEAtre volcanique. Prends du recul avant de r\xE9pondre \u2014 le silence peut gu\xE9rir autant que les mots.",
        soeur: "Ce lien sororal porte des \xE9motions puissantes. Accorde-toi des pauses pour que la profondeur ne devienne pas une charge.",
        fratrie_mixte: "L'intensit\xE9 \xE9motionnelle est forte. Prends du recul avant de r\xE9pondre.",
        pere_fils: "Les \xE9motions p\xE8re-fils peuvent \xEAtre brutes et silencieuses. Installe des moments courts d'apaisement \u2014 un geste vaut parfois mille mots.",
        pere_fille: "Le lien p\xE8re-fille porte des \xE9motions profondes, parfois non dites. Un mot juste au bon moment peut d\xE9nouer ce que des ann\xE9es de silence ont tiss\xE9.",
        mere_fils: "Le lien m\xE8re-fils porte parfois plus qu'il ne devrait. All\xE8ge-le en partageant le poids de l'histoire \xE0 voix haute.",
        mere_fille: "L'intensit\xE9 m\xE8re-fille peut \xEAtre lumineuse et lourde \xE0 la fois. Accorde-toi des pauses pour que la profondeur reste une force.",
        parent: "Les \xE9motions peuvent \xEAtre puissantes. Installe des moments courts mais r\xE9guliers d'apaisement.",
        gp_petit_fils: "Le pass\xE9 p\xE8se parfois sur la lign\xE9e masculine. Grand-p\xE8re et petit-fils peuvent choisir ensemble ce qu'ils gardent et ce qu'ils lib\xE8rent.",
        gp_petite_fille: "Le grand-p\xE8re transmet \xE0 sa petite-fille une charge \xE9motionnelle parfois insoup\xE7onn\xE9e. Prends ce qui nourrit, lib\xE9rez le reste avec douceur.",
        gm_petit_fils: "L'h\xE9ritage \xE9motionnel de la grand-m\xE8re touche le petit-fils de fa\xE7on inattendue. Accueille ce qui r\xE9sonne, laisse aller ce qui ne t'appartient pas.",
        gm_petite_fille: "Entre grand-m\xE8re et petite-fille, l'h\xE9ritage est \xE0 la fois un tr\xE9sor et un poids. Choisis consciemment ce que tu portes et ce que tu d\xE9poses.",
        coloc: "Si l'atmosph\xE8re devient dense, ajuste la distance. L'espace prot\xE8ge la relation.",
        ami: "L'amiti\xE9 porte parfois des \xE9motions plus lourdes qu'on ne l'imagine. Prends soin de ce lien \u2014 il m\xE9rite autant d'attention qu'un lien de sang."
      }
    };
    const labelKey = score >= 91 ? "karmique" : score >= 79 ? "fusionnel" : score >= 64 ? "complementaire" : score >= 48 ? "croissance" : score >= 32 ? "transformation" : "profond";
    const baseConseil = CONSEILS[labelKey][cat];
    if (score >= 91 && bazi.heavenlyCombination) {
      return `${baseConseil} La Combinaison ${bazi.heavenlyCombination.label} scelle un lien d'\xE2mes rare.`;
    }
    return baseConseil;
  }
  const modeLabel = mode === "amour" ? "amoureux" : "professionnel";
  if (score >= 90) {
    if (bazi.heavenlyCombination) {
      return mode === "amour" ? `Connexion exceptionnelle ! La Combinaison Divine ${bazi.heavenlyCombination.label} cr\xE9e un lien karmique rare. L'alchimie amoureuse se manifeste naturellement \u2014 laisse l'\xE9nergie circuler sans forcer.` : `Connexion exceptionnelle ! La Combinaison Divine ${bazi.heavenlyCombination.label} cr\xE9e un lien karmique rare. C\xF4t\xE9 professionnel, c'est un duo qui peut d\xE9placer des montagnes \u2014 capitalise sur cette synergie naturelle.`;
    }
    return mode === "amour" ? `Alignement remarquable. Les syst\xE8mes convergent vers une complicit\xE9 amoureuse naturelle. Cultive cette connexion avec gratitude \u2014 elle est rare.` : `Alignement remarquable. Les syst\xE8mes convergent vers un partenariat professionnel exceptionnel. Ce duo a le potentiel de cr\xE9er quelque chose de grand \u2014 structure-le avec confiance.`;
  }
  if (score >= 78) {
    const bestSystem = bazi.score > numero.total ? "le BaZi" : "la Num\xE9rologie";
    return mode === "amour" ? `Belle alchimie ! ${bestSystem.charAt(0).toUpperCase() + bestSystem.slice(1)} est le moteur principal de ta connexion amoureuse. ${peachCrossed ? "La Fleur de P\xEAcher crois\xE9e amplifie l'attraction physique." : "Investis dans la communication pour amplifier le potentiel."}` : `Belle alchimie ! ${bestSystem.charAt(0).toUpperCase() + bestSystem.slice(1)} est le moteur principal de cette collaboration. ${peachCrossed ? "Le charisme mutuel est un atout \u2014 utilise-le dans les n\xE9gociations." : "Clarifie les r\xF4les pour transformer cette compatibilit\xE9 en r\xE9sultats concrets."}`;
  }
  if (score >= 65) {
    return mode === "amour" ? `Synergie solide sur le plan amoureux. Quelques zones de friction ${bazi.alerts.length > 0 ? `(${bazi.alerts[0].split("\u2014")[0].trim()})` : ""} stimulent la croissance mutuelle. L'effort conscient transforme le bon en excellent.` : `Synergie solide c\xF4t\xE9 professionnel. ${bazi.alerts.length > 0 ? `Un point de vigilance : ${bazi.alerts[0].split("\u2014")[0].trim().toLowerCase()}. ` : ""}D\xE9finis clairement les responsabilit\xE9s pour que les compl\xE9mentarit\xE9s jouent \xE0 plein.`;
  }
  if (score >= 50) {
    return mode === "amour" ? `Potentiel amoureux \xE0 cultiver. ${numero.signals.length > 0 ? numero.signals[0] + "." : ""} Les diff\xE9rences sont un terrain d'apprentissage \u2014 ni obstacle, ni force automatique.` : `Potentiel professionnel \xE0 cultiver. ${numero.signals.length > 0 ? numero.signals[0] + "." : ""}Mise sur des projets courts et cadr\xE9s pour construire la confiance avant de viser plus grand.`;
  }
  if (score >= 35) {
    const mainTension = bazi.alerts[0] || numero.alerts[0] || "Vibrations diff\xE9rentes";
    return mode === "amour" ? `Friction amoureuse significative. ${mainTension}. Cette tension peut devenir cr\xE9ative si chacun accepte la nature profonde de l'autre.` : `Friction professionnelle significative. ${mainTension}. Cette tension peut devenir productive si les r\xF4les sont bien s\xE9par\xE9s et les attentes clairement pos\xE9es.`;
  }
  return mode === "amour" ? `D\xE9fi amoureux majeur. Les syst\xE8mes d\xE9tectent des frictions profondes. Cela ne veut pas dire "impossible" \u2014 mais cela demande un travail conscient et beaucoup de patience.` : `D\xE9fi professionnel majeur. Les frictions d\xE9tect\xE9es compliquent la collaboration au quotidien. Si ce partenariat est n\xE9cessaire, structure au maximum les \xE9changes et d\xE9limite clairement les territoires.`;
}

// tests/simulation-golden-tickets.ts
var ALL_MODES = ["amour", "pro", "famille"];
var FAMILLE_SUBTYPES = [
  "frere_frere",
  "soeur_soeur",
  "frere_soeur",
  "pere_fils",
  "pere_fille",
  "mere_fils",
  "mere_fille",
  "gp_petit_fils",
  "gp_petite_fille",
  "gm_petit_fils",
  "gm_petite_fille",
  "coloc",
  "ami"
];
var VALID_BADGES = /* @__PURE__ */ new Set([
  "\u{1F31F} Fusion C\xE9leste",
  "\u{1F338}\u{1F338} Double Fleur de P\xEAcher",
  "\u{1F338} Fleur de P\xEAcher Active",
  "\u2728 Ma\xEEtres Nombres en R\xE9sonance",
  "\u262F \xC2mes Compl\xE9mentaires (Roi Wen)",
  "\u{1F4AB} Harmonie Terrestre (Li\xF9 H\xE9)",
  "\u{1F53A} Triangle Sacr\xE9 (San He)"
]);
var TEST_PAIRS = [
  // Reference base
  { dateA: "1977-09-23", dateB: "1977-09-23", desc: "Same date (test master numbers)" },
  // Aggressive peach blossom targeting
  // Rat year (1960, 1972, 1984, 1996, 2008) with Rooster day candidates
  // Day branch Rooster = index 9 = peach for Shen/Zi/Chen group
  { dateA: "1960-01-10", dateB: "1988-10-15", desc: "Rat + Rooster day attempt 1" },
  { dateA: "1972-02-20", dateB: "1990-09-05", desc: "Rat + Rooster day attempt 2" },
  { dateA: "1984-03-30", dateB: "1992-10-25", desc: "Rat + Rooster day attempt 3" },
  { dateA: "1996-04-15", dateB: "2000-09-18", desc: "Rat + Rooster day attempt 4" },
  { dateA: "2008-05-05", dateB: "2015-10-10", desc: "Rat + Rooster day attempt 5" },
  // Rabbit/Dragon/Tiger day candidates (Peach = Rabbit for Yin/Wu/Xu)
  // Day branch Rabbit = index 3 = peach for Yin/Wu/Xu group
  { dateA: "1963-06-15", dateB: "1985-03-20", desc: "Yin/Wu/Xu + Rabbit day 1" },
  { dateA: "1975-09-10", dateB: "1995-03-08", desc: "Yin/Wu/Xu + Rabbit day 2" },
  { dateA: "1987-12-05", dateB: "2005-03-25", desc: "Yin/Wu/Xu + Rabbit day 3" },
  // Snake/Rooster/Ox day candidates (Peach = Horse for Si/You/Chou)
  // Day branch Horse = index 6 = peach for Si/You/Chou
  { dateA: "1965-05-18", dateB: "1983-06-12", desc: "Si/You/Chou + Horse day 1" },
  { dateA: "1977-10-22", dateB: "1995-06-28", desc: "Si/You/Chou + Horse day 2" },
  { dateA: "1989-11-30", dateB: "2007-06-05", desc: "Si/You/Chou + Horse day 3" },
  // Pig/Rabbit/Goat day candidates (Peach = Rat for Hai/Mao/Wei)
  // Day branch Rat = index 0 = peach for Hai/Mao/Wei
  { dateA: "1959-11-28", dateB: "1988-01-08", desc: "Hai/Mao/Wei + Rat day 1" },
  { dateA: "1971-02-14", dateB: "2000-01-20", desc: "Hai/Mao/Wei + Rat day 2" },
  { dateA: "1983-08-25", dateB: "2010-01-15", desc: "Hai/Mao/Wei + Rat day 3" },
  // More master number candidates (Life Path 11, 22, 33)
  { dateA: "1965-01-29", dateB: "1974-03-22", desc: "Life Path 11 candidates" },
  { dateA: "1975-08-13", dateB: "1984-10-22", desc: "Life Path 22 candidates" },
  { dateA: "1991-04-29", dateB: "2000-08-24", desc: "Life Path 22/11 candidates" },
  { dateA: "1988-02-29", dateB: "1997-11-11", desc: "Master number variants" },
  // Miscellaneous for breadth
  { dateA: "1950-12-25", dateB: "2000-01-01", desc: "Large age gap" },
  { dateA: "2000-11-11", dateB: "2010-02-14", desc: "Young pair with master 11" }
];
var errors = [];
function validateBadges(result, mode, subtype, dateA, dateB) {
  const badges = result.badges || [];
  if (mode === "famille") {
    for (const badge of badges) {
      if (badge.includes("Fleur de P\xEAcher")) {
        errors.push({
          mode,
          subtype,
          dateA,
          dateB,
          badge,
          category: "CRITICAL_BUG",
          message: `Peach Blossom badge in famille mode: "${badge}"`
        });
      }
    }
  }
  for (const badge of badges) {
    if (!VALID_BADGES.has(badge)) {
      errors.push({
        mode,
        subtype,
        dateA,
        dateB,
        badge,
        category: "UNKNOWN_BADGE",
        message: `Unknown badge: "${badge}"`
      });
    }
  }
  if (!Array.isArray(badges)) {
    errors.push({
      mode,
      subtype,
      dateA,
      dateB,
      badge: String(badges),
      category: "TYPE_ERROR",
      message: `badges is not an array: ${typeof badges}`
    });
  }
  for (const badge of badges) {
    if (typeof badge !== "string") {
      errors.push({
        mode,
        subtype,
        dateA,
        dateB,
        badge: String(badge),
        category: "TYPE_ERROR",
        message: `badge is not a string: ${typeof badge}`
      });
    }
  }
}
console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550");
console.log("  SIMULATION \u2014 GOLDEN TICKET BADGES");
console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550");
console.log();
var totalTests = 0;
var badgeCounts = {};
var badgesByMode = {
  amour: /* @__PURE__ */ new Set(),
  pro: /* @__PURE__ */ new Set(),
  famille: /* @__PURE__ */ new Set()
};
var modeResults = {
  amour: { tests: 0, badgeCount: 0 },
  pro: { tests: 0, badgeCount: 0 },
  famille: { tests: 0, badgeCount: 0 }
};
for (const pair of TEST_PAIRS) {
  for (const mode of ALL_MODES) {
    const subtypes = mode === "famille" ? FAMILLE_SUBTYPES : ["-"];
    for (const subtype of subtypes) {
      try {
        const result = calcBond(
          pair.dateA,
          "PERSON_A",
          pair.dateB,
          "PERSON_B",
          mode,
          subtype
        );
        validateBadges(result, mode, subtype, pair.dateA, pair.dateB);
        totalTests++;
        modeResults[mode].tests++;
        const badges = result.badges || [];
        for (const badge of badges) {
          badgeCounts[badge] = (badgeCounts[badge] || 0) + 1;
          badgesByMode[mode].add(badge);
          modeResults[mode].badgeCount++;
        }
      } catch (e) {
        errors.push({
          mode,
          subtype: subtype || "-",
          dateA: pair.dateA,
          dateB: pair.dateB,
          badge: "N/A",
          category: "CRASH",
          message: `Exception: ${e.message}`
        });
      }
    }
  }
}
console.log(`Total tests executed: ${totalTests}`);
console.log(`Errors found: ${errors.length}`);
console.log();
if (errors.length > 0) {
  const byCategory = {};
  for (const e of errors) {
    if (!byCategory[e.category]) byCategory[e.category] = [];
    byCategory[e.category].push(e);
  }
  for (const [cat, errs] of Object.entries(byCategory).sort()) {
    console.log(`
\u2550\u2550 ${cat} (${errs.length} error${errs.length > 1 ? "s" : ""}) \u2550\u2550`);
    const seen = /* @__PURE__ */ new Set();
    for (const e of errs) {
      const key = `${e.mode}/${e.subtype}/${e.message}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const count = errs.filter((x) => x.message === e.message && x.mode === e.mode).length;
      console.log(`  [${e.mode}/${e.subtype}] ${e.message}${count > 1 ? ` (\xD7${count})` : ""}`);
    }
  }
  const familleButgs = errors.filter((e) => e.category === "CRITICAL_BUG");
  if (familleButgs.length > 0) {
    console.log("\n\u{1F6A8} CRITICAL BUG FOUND: Peach Blossom in famille mode!");
  }
} else {
  console.log("\u2705 NO ERRORS DETECTED");
}
console.log("\n\n\u2550\u2550 BADGE DISTRIBUTION (TOTAL) \u2550\u2550");
var sortedBadges = Object.entries(badgeCounts).sort((a, b) => b[1] - a[1]);
if (sortedBadges.length > 0) {
  for (const [badge, count] of sortedBadges) {
    console.log(`  ${badge}: ${count}`);
  }
} else {
  console.log("  (no badges found)");
}
console.log("\n\n\u2550\u2550 BADGES BY MODE \u2550\u2550");
for (const mode of ALL_MODES) {
  const badges = Array.from(badgesByMode[mode]);
  if (badges.length > 0) {
    console.log(`  ${mode.toUpperCase()}:`);
    for (const badge of badges.sort()) {
      console.log(`    - ${badge}`);
    }
  } else {
    console.log(`  ${mode.toUpperCase()}: (no badges)`);
  }
}
console.log("\n\n\u2550\u2550 COVERAGE BY MODE \u2550\u2550");
for (const [mode, stats] of Object.entries(modeResults)) {
  console.log(`  ${mode.toUpperCase()}: ${stats.tests} tests, ${stats.badgeCount} badge occurrences`);
}
console.log("\n\n\u2550\u2550 CRITICAL CONSTRAINT VERIFICATION \u2550\u2550");
var peachInFamille = Array.from(badgesByMode["famille"]).filter((b) => b.includes("Fleur de P\xEAcher"));
if (peachInFamille.length === 0) {
  console.log("\u2705 PASS: No Peach Blossom badges in famille mode (bug fix confirmed)");
} else {
  console.log("\u274C FAIL: Peach Blossom badges found in famille mode:");
  for (const badge of peachInFamille) {
    console.log(`    ${badge}`);
  }
}
console.log("\n\nSimulation completed.");
