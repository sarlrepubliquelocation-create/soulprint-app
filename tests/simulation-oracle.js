// src/engines/numerology.ts
var VOWELS = new Set("AEIOU".split(""));
var MASTER_NUMBERS = /* @__PURE__ */ new Set([11, 22, 33]);
var KARMIC_DEBT_NUMBERS = /* @__PURE__ */ new Set([13, 14, 16, 19]);
function checkKarmicNumber(totalBeforeReduce) {
  return KARMIC_DEBT_NUMBERS.has(totalBeforeReduce) ? totalBeforeReduce : null;
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
function isMaster(n) {
  return MASTER_NUMBERS.has(n);
}

// src/engines/moon.ts
var REF_NEW_MOON = Date.UTC(2e3, 0, 6, 18, 14, 0);
var REF_PERIGEE = Date.UTC(2e3, 0, 6, 18, 0, 0);
var MERCURY_RETROGRADES = [
  // 2025
  { start: "2025-03-15", end: "2025-04-07" },
  { start: "2025-07-18", end: "2025-08-11" },
  { start: "2025-11-09", end: "2025-11-29" },
  // 2026
  { start: "2026-02-26", end: "2026-03-20" },
  { start: "2026-06-30", end: "2026-07-24" },
  { start: "2026-10-24", end: "2026-11-13" },
  // 2027
  { start: "2027-02-09", end: "2027-03-04" },
  { start: "2027-06-10", end: "2027-07-05" },
  { start: "2027-10-07", end: "2027-10-28" },
  // 2028
  { start: "2028-01-24", end: "2028-02-15" },
  { start: "2028-05-21", end: "2028-06-13" },
  { start: "2028-09-19", end: "2028-10-11" },
  // 2029
  { start: "2029-01-07", end: "2029-01-29" },
  { start: "2029-05-02", end: "2029-05-26" },
  { start: "2029-09-02", end: "2029-09-24" },
  { start: "2029-12-22", end: "2030-01-12" },
  // 2030
  { start: "2030-04-13", end: "2030-05-05" },
  { start: "2030-08-15", end: "2030-09-07" },
  { start: "2030-12-06", end: "2030-12-26" },
  // 2031
  { start: "2031-03-28", end: "2031-04-20" },
  { start: "2031-07-28", end: "2031-08-21" },
  { start: "2031-11-18", end: "2031-12-09" },
  // 2032
  { start: "2032-03-10", end: "2032-04-03" },
  { start: "2032-07-10", end: "2032-08-03" },
  { start: "2032-11-01", end: "2032-11-22" },
  // 2033
  { start: "2033-02-22", end: "2033-03-16" },
  { start: "2033-06-22", end: "2033-07-16" },
  { start: "2033-10-14", end: "2033-11-04" },
  // 2034
  { start: "2034-02-04", end: "2034-02-27" },
  { start: "2034-06-05", end: "2034-06-28" },
  { start: "2034-09-27", end: "2034-10-18" },
  // 2035
  { start: "2035-01-18", end: "2035-02-09" },
  { start: "2035-05-18", end: "2035-06-10" },
  { start: "2035-09-10", end: "2035-10-01" }
];
var MERCURY_HARDCODED_MAX_YEAR = 2035;
function predictMercuryRetrogrades(year) {
  if (year <= MERCURY_HARDCODED_MAX_YEAR) return [];
  const anchors = MERCURY_RETROGRADES.filter((r) => r.start.startsWith("2035"));
  const periods = [];
  const SYNODIC_MERCURY = 115.88;
  const RETRO_DURATION = 22;
  anchors.forEach((anchor) => {
    const anchorDate = /* @__PURE__ */ new Date(anchor.start + "T00:00:00Z");
    let d = new Date(anchorDate);
    while (d.getUTCFullYear() < year) {
      d = new Date(d.getTime() + SYNODIC_MERCURY * 864e5);
    }
    while (d.getUTCFullYear() === year) {
      const startStr = d.toISOString().slice(0, 10);
      const endDate = new Date(d.getTime() + RETRO_DURATION * 864e5);
      const endStr = endDate.toISOString().slice(0, 10);
      if (!periods.some((p) => Math.abs(new Date(p.start).getTime() - d.getTime()) < 30 * 864e5)) {
        periods.push({ start: startStr, end: endStr });
      }
      d = new Date(d.getTime() + SYNODIC_MERCURY * 864e5);
    }
  });
  return periods.sort((a, b) => a.start.localeCompare(b.start));
}
var SHADOW_DAYS = 14;
var STATIONARY_DAYS = 2;
function getMercuryStatus(date = /* @__PURE__ */ new Date()) {
  const year = date.getFullYear();
  const now = date.getTime();
  const DAY = 864e5;
  const retros = [
    ...MERCURY_RETROGRADES.filter((r) => {
      const y = parseInt(r.start.slice(0, 4));
      return y >= year - 1 && y <= year + 1;
    }),
    ...year > MERCURY_HARDCODED_MAX_YEAR ? predictMercuryRetrogrades(year) : []
  ];
  for (const r of retros) {
    const start = (/* @__PURE__ */ new Date(r.start + "T00:00:00")).getTime();
    const end = (/* @__PURE__ */ new Date(r.end + "T23:59:59")).getTime();
    const preShadow = start - SHADOW_DAYS * DAY;
    const postShadow = end + SHADOW_DAYS * DAY;
    const stationaryRetroEnd = start + STATIONARY_DAYS * DAY;
    const stationaryDirectStart = end - STATIONARY_DAYS * DAY;
    if (now >= preShadow && now < start) {
      const daysLeft = Math.ceil((start - now) / DAY);
      return {
        phase: "pre-shadow",
        points: -1,
        label: "Pr\xE9-ombre Mercure",
        daysLeft,
        conseil: `Mercure entre en zone d'ombre \u2014 commence \xE0 ralentir tes projets de communication (r\xE9tro dans ${daysLeft}j).`
      };
    }
    if (now >= start && now < stationaryRetroEnd) {
      return {
        phase: "stationary-retro",
        points: -6,
        label: "Mercure Stationnaire \u263F\u26A1",
        conseil: "Mercure s'arr\xEAte avant de reculer \u2014 blocage maximal. Ne signe RIEN, ne lance RIEN aujourd'hui."
      };
    }
    if (now >= stationaryRetroEnd && now < stationaryDirectStart) {
      const daysLeft = Math.ceil((end - now) / DAY);
      return {
        phase: "retrograde",
        points: -4,
        label: "Mercure R\xE9trograde \u263F\u{1F504}",
        daysLeft,
        conseil: `Mercure r\xE9trograde \u2014 REvisiter, REpenser, REcontacter. \xC9viter lancements et signatures (fin dans ${daysLeft}j).`
      };
    }
    if (now >= stationaryDirectStart && now <= end) {
      return {
        phase: "stationary-direct",
        points: -3,
        label: "Mercure Stationnaire Direct \u263F\u2191",
        conseil: "Mercure reprend sa marche directe \u2014 la clart\xE9 revient. Finalise les r\xE9visions avant de relancer."
      };
    }
    if (now > end && now <= postShadow) {
      const daysLeft = Math.ceil((postShadow - now) / DAY);
      return {
        phase: "post-shadow",
        points: -1,
        label: "Post-ombre Mercure",
        daysLeft,
        conseil: `Mercure sort de l'ombre \u2014 les malentendus se dissipent. Tu peux relancer progressivement (zone claire dans ${daysLeft}j).`
      };
    }
  }
  return {
    phase: "direct",
    points: 0,
    label: "Mercure Direct",
    conseil: "Communications et d\xE9cisions fluides."
  };
}
function isMercuryRetrograde(date = /* @__PURE__ */ new Date()) {
  const status = getMercuryStatus(date);
  return status.phase === "retrograde" || status.phase === "stationary-retro" || status.phase === "stationary-direct";
}
var J2000 = Date.UTC(2e3, 0, 1, 12, 0, 0);

// src/engines/oracle.ts
var ORACLE_DOMAINS = [
  { id: "generaliste", icon: "\u{1F310}", label: "G\xE9n\xE9raliste", exemples: "Score moyen tous domaines" },
  { id: "commerce", icon: "\u{1F4B0}", label: "Commerce & Finance", exemples: "Banque, immobilier, retail, juridique" },
  { id: "creatif", icon: "\u{1F3A8}", label: "Cr\xE9ativit\xE9 & Communication", exemples: "Art, m\xE9dias, marketing, design, mode" },
  { id: "humain", icon: "\u{1F91D}", label: "Humain & Bien-\xEAtre", exemples: "Sant\xE9, th\xE9rapie, coaching, social" },
  { id: "spirituel", icon: "\u{1F52E}", label: "Spiritualit\xE9 & \xC9sot\xE9risme", exemples: "Astrologie, num\xE9rologie, m\xE9ditation" },
  { id: "tech", icon: "\u{1F4A1}", label: "Tech & Innovation", exemples: "Startup, dev, apps, digital, IA" }
];
var PYTH_MAP = {
  a: 1,
  b: 2,
  c: 3,
  d: 4,
  e: 5,
  f: 6,
  g: 7,
  h: 8,
  i: 9,
  j: 1,
  k: 2,
  l: 3,
  m: 4,
  n: 5,
  o: 6,
  p: 7,
  q: 8,
  r: 9,
  s: 1,
  t: 2,
  u: 3,
  v: 4,
  w: 5,
  x: 6,
  y: 7,
  z: 8
};
var VOWELS_CORE = /* @__PURE__ */ new Set(["a", "e", "i", "o", "u"]);
function isVowelOracle(chars, idx) {
  const c = chars[idx];
  if (VOWELS_CORE.has(c)) return true;
  if (c !== "y") return false;
  if (idx === 0) return false;
  const prev = chars[idx - 1];
  return !VOWELS_CORE.has(prev);
}
function normalizeStr(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z]/g, "");
}
var TLD_LIST = [".com", ".fr", ".app", ".net", ".io", ".org", ".ai", ".co", ".eu", ".be", ".ch", ".uk", ".ca", ".de", ".es", ".it"];
function stripTLD(name) {
  const lower = name.toLowerCase();
  for (const tld of TLD_LIST) {
    if (lower.endsWith(tld)) {
      return { cleaned: name.slice(0, name.length - tld.length), tldFound: tld };
    }
  }
  return { cleaned: name, tldFound: null };
}
function calcStringNumber(s) {
  const norm = normalizeStr(s);
  const sum = norm.split("").reduce((acc, c) => acc + (PYTH_MAP[c] || 0), 0);
  return reduce(sum);
}
function calcNameNumbers(name) {
  const norm = normalizeStr(name);
  let vowelSum = 0, consonantSum = 0;
  for (let i = 0; i < norm.length; i++) {
    const val = PYTH_MAP[norm[i]] || 0;
    if (isVowelOracle(norm, i)) vowelSum += val;
    else consonantSum += val;
  }
  return {
    expression: reduce(vowelSum + consonantSum),
    ame: reduce(vowelSum),
    image: reduce(consonantSum),
    rawSums: { expr: vowelSum + consonantSum, ame: vowelSum, image: consonantSum }
  };
}
var KARMIC_DEBT_INTRO = "En num\xE9rologie, certains nombres portent un d\xE9fi de croissance \u2014 ce n'est pas n\xE9gatif, c'est une invitation \xE0 d\xE9velopper une qualit\xE9. ";
var KARMIC_DEBT_NARRATIVES = {
  13: {
    nom: { label: "D\xE9fi 13 \u2014 Apprendre la pers\xE9v\xE9rance", texte: "La vibration 13 invite \xE0 prouver sa solidit\xE9 par la constance et le travail bien fait. Ce nom ne promet pas une ascension facile, mais il peut devenir tr\xE8s fiable si tu poses des bases nettes. C'est un d\xE9fi de patience, pas un obstacle." },
    bebe: { label: "D\xE9fi 13 \u2014 Apprendre la patience", texte: "Cette vibration invite l'enfant \xE0 construire pas \xE0 pas, avec patience et r\xE9gularit\xE9. Le pr\xE9nom porte une belle force d'endurance : il apprendra \xE0 ne pas se d\xE9courager quand les choses avancent lentement. Bien accompagn\xE9, ce nombre forge un \xEAtre solide et d\xE9termin\xE9." },
    adresse: { label: "D\xE9fi 13 \u2014 Un lieu qui demande de la constance", texte: "Dans un lieu, le 13 cr\xE9e une atmosph\xE8re qui pousse \xE0 remettre de l'ordre, \xE0 structurer. La maison demande de l'attention et une pr\xE9sence concr\xE8te. Si tu acceptes ce rythme, l'adresse peut devenir un socle robuste." },
    numero: { label: "D\xE9fi 13 \u2014 Un num\xE9ro qui r\xE9compense le s\xE9rieux", texte: "Les contacts demanderont des efforts et des preuves de s\xE9rieux. Utilise ce num\xE9ro pour des affaires carr\xE9es o\xF9 ta fiabilit\xE9 fera la diff\xE9rence." },
    date: { label: "D\xE9fi 13 \u2014 Une date pour construire s\xE9rieusement", texte: "Ce jour ne prend pas la voie la plus facile, mais il favorise ce qui doit \xEAtre construit solidement. C'est une date pour poser des fondations, corriger, cadrer." }
  },
  14: {
    nom: { label: "D\xE9fi 14 \u2014 Canaliser son \xE9nergie", texte: "La vibration 14 parle d'une \xE9nergie vive qui gagne \xE0 trouver sa direction. Dans un nom de marque, cela peut donner du mouvement et de l'attrait. Ce nom fonctionne mieux quand tu donnes une direction claire \xE0 ta libert\xE9." },
    bebe: { label: "D\xE9fi 14 \u2014 Apprendre \xE0 se poser", texte: "Pour un enfant, cette vibration porte un fort besoin d'exploration et de nouveaut\xE9. Elle peut \xEAtre brillante si elle est accompagn\xE9e par des rep\xE8res simples, car sans cadre elle s'\xE9parpille vite. Concr\xE8tement : ce pr\xE9nom donne un temp\xE9rament curieux et mobile \u2014 des rituels simples l'aideront \xE0 canaliser cette belle \xE9nergie." },
    adresse: { label: "D\xE9fi 14 \u2014 Un lieu de mouvement", texte: "Une adresse 14 fait rarement dormir la vie : elle appelle le passage, le changement. On y respire mieux si l'on accepte le mouvement au lieu de chercher un contr\xF4le total." },
    numero: { label: "D\xE9fi 14 \u2014 Un num\xE9ro dynamique \xE0 cadrer", texte: "Ce num\xE9ro attire par sa vitesse et son c\xF4t\xE9 vivant, mais il peut diluer l'attention. Tr\xE8s utile si ton activit\xE9 aime le mouvement ; pense \xE0 structurer si tu as besoin de stabilit\xE9." },
    date: { label: "D\xE9fi 14 \u2014 Une date d'action rapide", texte: "Cette date pousse \xE0 agir, tester, changer de plan si n\xE9cessaire. Elle favorise la souplesse mais demande de ne pas s'engager trop vite." }
  },
  16: {
    nom: { label: "D\xE9fi 16 \u2014 Chercher l'authenticit\xE9", texte: "La vibration 16 pousse \xE0 revenir \xE0 l'essentiel et \xE0 ce qui est vrai. Dans un nom de marque, elle donne profondeur et authenticit\xE9, mais elle supporte mal le superficiel. Ce nom demande de la coh\xE9rence." },
    bebe: { label: "D\xE9fi 16 \u2014 D\xE9velopper sa vie int\xE9rieure", texte: "Concr\xE8tement, cette vibration signifie que l'enfant aura une sensibilit\xE9 forte et une maturit\xE9 qui peut arriver t\xF4t. Il sera plus touch\xE9 que d'autres par ce qui sonne faux autour de lui. C'est une qualit\xE9 pr\xE9cieuse : bien entour\xE9, il d\xE9veloppera une vraie profondeur et une sagesse naturelle." },
    adresse: { label: "D\xE9fi 16 \u2014 Un lieu de lucidit\xE9", texte: "Un lieu 16 invite au retrait et \xE0 la r\xE9flexion. On y voit plus vite ce qui ne tient pas. C'est une adresse qui convient au recentrage, \xE0 condition de ne pas la vivre comme une fermeture." },
    numero: { label: "D\xE9fi 16 \u2014 Un num\xE9ro de profondeur", texte: "Ce num\xE9ro donne une pr\xE9sence plus discr\xE8te, parfois plus distante. Il ne s\xE9duit pas facilement, mais peut inspirer confiance par sa sinc\xE9rit\xE9." },
    date: { label: "D\xE9fi 16 \u2014 Une date de v\xE9rit\xE9", texte: "Cette date met en lumi\xE8re ce qui doit \xEAtre compris. Ce n'est pas un jour de surface \u2014 c'est un jour pour voir clair. Elle favorise la lucidit\xE9 plus que l'expansion." }
  },
  19: {
    nom: { label: "D\xE9fi 19 \u2014 Mener sans dominer", texte: "La vibration 19 parle d'ind\xE9pendance qui gagne \xE0 s'ouvrir aux autres. Dans un nom de marque, cela donne une grande force d'affirmation, \xE0 condition de ne pas basculer dans l'isolement. Ce nom gagne quand il ose mener sans \xE9craser." },
    bebe: { label: "D\xE9fi 19 \u2014 Apprendre \xE0 partager sa force", texte: "Concr\xE8tement, cette vibration donne \xE0 l'enfant un fort instinct d'autonomie, parfois tr\xE8s t\xF4t. C'est une belle qualit\xE9 ! L'enjeu sera de l'aider \xE0 relier confiance en soi et capacit\xE9 \xE0 demander, recevoir, partager. Pas de brider l'\xE9lan, mais de l'humaniser." },
    adresse: { label: "D\xE9fi 19 \u2014 Un lieu d'ind\xE9pendance", texte: "Cette adresse pousse \xE0 se tenir debout, \xE0 d\xE9cider, \xE0 reprendre les choses en main. Elle peut \xEAtre tr\xE8s bonne pour relancer une \xE9tape de vie." },
    numero: { label: "D\xE9fi 19 \u2014 Un num\xE9ro d'affirmation", texte: "Ce num\xE9ro affirme une pr\xE9sence claire. Il peut porter une voix forte, mais demande d'\xE9viter la duret\xE9 ou l'impression de fermeture. Tr\xE8s utile pour diriger." },
    date: { label: "D\xE9fi 19 \u2014 Une date pour oser", texte: "Cette date favorise l'initiative et le courage, tout en rappelant de ne pas oublier les autres sur son passage. C'est un jour pour avancer, pas pour imposer." }
  }
};
function getKarmicDebt(num, module) {
  const entry = KARMIC_DEBT_NARRATIVES[num]?.[module] || KARMIC_DEBT_NARRATIVES[num]?.nom || { label: `D\xE9fi ${num}`, texte: "" };
  return { label: entry.label, texte: KARMIC_DEBT_INTRO + entry.texte };
}
var KARMIC_LESSON_NARRATIVES = {
  1: {
    nom: { label: "Absence du 1 \u2014 Le Leadership en Creux", texte: "L'absence du 1 indique que ce nom ne porte pas naturellement l'\xE9nergie d'initiative. La marque devra construire son autorit\xE9 par la constance plut\xF4t que par l'\xE9clat. C'est un chemin o\xF9 la l\xE9gitimit\xE9 se gagne pas \xE0 pas." },
    bebe: { label: "Absence du 1 \u2014 L'Affirmation \xE0 Conqu\xE9rir", texte: "L'absence du 1 montre un chemin autour de la confiance en soi et de l'initiative. L'enfant peut avoir besoin d'encouragements pour oser agir en premier. On l'aidera en valorisant ses prises de d\xE9cision, m\xEAme petites." }
  },
  2: {
    nom: { label: "Absence du 2 \u2014 La Diplomatie \xE0 Cultiver", texte: "L'absence du 2 signale que ce nom manque de douceur naturelle dans les partenariats. La marque pourrait gagner \xE0 d\xE9velopper une image plus collaborative et \xE0 soigner sa communication relationnelle." },
    bebe: { label: "Absence du 2 \u2014 L'\xC9coute en Devenir", texte: "L'absence du 2 r\xE9v\xE8le un chemin autour de la coop\xE9ration et de l'\xE9coute. L'enfant peut fonctionner en solitaire sans le chercher. On l'aidera en nourrissant les jeux \xE0 deux, le partage et l'attention \xE0 l'autre." }
  },
  3: {
    nom: { label: "Absence du 3 \u2014 L'Expression \xE0 Lib\xE9rer", texte: "L'absence du 3 indique que ce nom ne rayonne pas spontan\xE9ment. La marque devra travailler sa visibilit\xE9 et oser montrer sa cr\xE9ativit\xE9. La communication ne viendra pas seule \u2014 elle se construira." },
    bebe: { label: "Absence du 3 \u2014 La Parole \xE0 \xC9clore", texte: "L'absence du 3 montre un chemin autour de l'expression et du plaisir de montrer ce qu'on ressent. L'enfant peut \xEAtre riche int\xE9rieurement sans le dire facilement. On l'aidera en nourrissant le langage, le jeu et la cr\xE9ativit\xE9." }
  },
  4: {
    nom: { label: "Absence du 4 \u2014 La Structure \xE0 B\xE2tir", texte: "L'absence du 4 signale un manque de cadre naturel. La marque devra compenser par des processus clairs et une discipline volontaire. Sans cela, le risque de dispersion est r\xE9el." },
    bebe: { label: "Absence du 4 \u2014 L'Ordre \xE0 Apprivoiser", texte: "L'absence du 4 r\xE9v\xE8le un chemin autour de l'organisation et de la pers\xE9v\xE9rance. L'enfant peut papillonner ou se d\xE9courager face \xE0 l'effort long. On l'aidera avec des routines bienveillantes et des objectifs concrets." }
  },
  5: {
    nom: { label: "Absence du 5 \u2014 Le Mouvement \xE0 Provoquer", texte: "L'absence du 5 indique que ce nom manque de souffle aventurier. La marque risque la rigidit\xE9 si elle ne s'ouvre pas au changement. Int\xE9grer de la nouveaut\xE9 r\xE9guli\xE8re sera sa force." },
    bebe: { label: "Absence du 5 \u2014 La Libert\xE9 \xE0 D\xE9couvrir", texte: "L'absence du 5 montre un chemin autour de l'adaptabilit\xE9 et du go\xFBt pour la nouveaut\xE9. L'enfant peut pr\xE9f\xE9rer le connu et r\xE9sister au changement. On l'aidera en l'exposant \xE0 des exp\xE9riences vari\xE9es sans forcer." }
  },
  6: {
    nom: { label: "Absence du 6 \u2014 L'Harmonie \xE0 Incarner", texte: "L'absence du 6 signale que ce nom ne porte pas naturellement l'\xE9nergie de soin et de responsabilit\xE9. La marque devra cultiver consciemment la confiance et l'accompagnement dans sa relation client." },
    bebe: { label: "Absence du 6 \u2014 La Responsabilit\xE9 \xE0 \xC9veiller", texte: "L'absence du 6 r\xE9v\xE8le un chemin autour du sens des responsabilit\xE9s et de l'attention aux autres. L'enfant peut sembler d\xE9tach\xE9 des obligations familiales. On l'aidera en lui confiant de petites missions de soin." }
  },
  7: {
    nom: { label: "Absence du 7 \u2014 La Profondeur \xE0 Chercher", texte: "L'absence du 7 indique que ce nom manque de dimension r\xE9flexive. La marque risque de rester en surface si elle ne cultive pas une expertise ou une philosophie propre." },
    bebe: { label: "Absence du 7 \u2014 L'Int\xE9riorit\xE9 \xE0 Nourrir", texte: "L'absence du 7 montre un chemin autour de la r\xE9flexion et de l'analyse. L'enfant peut privil\xE9gier l'action \xE0 la contemplation. On l'aidera en lui offrant des moments de calme, des livres et des questions ouvertes." }
  },
  8: {
    nom: { label: "Absence du 8 \u2014 Le Pouvoir \xE0 Assumer", texte: "L'absence du 8 signale que ce nom ne porte pas spontan\xE9ment l'\xE9nergie d'ambition mat\xE9rielle. La marque devra assumer ses objectifs financiers et sa valeur sans complexe." },
    bebe: { label: "Absence du 8 \u2014 L'Ambition \xE0 Encourager", texte: "L'absence du 8 r\xE9v\xE8le un chemin autour du rapport \xE0 l'argent, au pouvoir et \xE0 la r\xE9ussite mat\xE9rielle. L'enfant peut sous-estimer sa propre valeur. On l'aidera en normalisant l'ambition et la fiert\xE9 du travail accompli." }
  },
  9: {
    nom: { label: "Absence du 9 \u2014 L'Universel \xE0 Embrasser", texte: "L'absence du 9 indique que ce nom manque de souffle humaniste. La marque gagnera \xE0 int\xE9grer une dimension de partage ou de contribution au collectif dans son identit\xE9." },
    bebe: { label: "Absence du 9 \u2014 La Compassion \xE0 Cultiver", texte: "L'absence du 9 montre un chemin autour de l'ouverture aux autres et du don de soi. L'enfant peut se concentrer sur son monde proche sans voir plus loin. On l'aidera en \xE9largissant son horizon : voyages, rencontres, g\xE9n\xE9rosit\xE9." }
  }
};
function getKarmicLesson(num, module) {
  return KARMIC_LESSON_NARRATIVES[num]?.[module] || { label: `Absence du ${num}`, texte: "" };
}
var FENG_SHUI_ELEMENTS = {
  1: { element: "Eau", emoji: "\u{1F4A7}", desc: "Fluidit\xE9 et communication", texte: "L'Eau incarne le flux, l'intuition et la communication profonde. Ce lieu favorise les \xE9changes et les id\xE9es nouvelles. Pour \xE9quilibrer, introduisez l'\xE9l\xE9ment Bois (plantes vertes, formes \xE9lanc\xE9es) qui canalise l'\xE9nergie de l'Eau sans la tarir." },
  2: { element: "Terre", emoji: "\u{1F30D}", desc: "Stabilit\xE9 et ancrage", texte: "La Terre symbolise l'enracinement, la s\xE9curit\xE9 et la patience. Ce lieu offre un socle solide pour construire durablement. Pour dynamiser sans d\xE9stabiliser, ajoutez l'\xE9l\xE9ment M\xE9tal (objets ronds, couleurs blanches ou dor\xE9es) qui na\xEEt de la Terre." },
  3: { element: "Bois", emoji: "\u{1F333}", desc: "Croissance et cr\xE9ativit\xE9", texte: "Le Bois repr\xE9sente la croissance, la cr\xE9ativit\xE9 et l'\xE9lan vital. Ce lieu pousse \xE0 se d\xE9velopper et \xE0 innover. Pour nourrir cette \xE9nergie, int\xE9grez l'\xE9l\xE9ment Eau (miroirs, fontaines, teintes bleues) qui alimente le Bois dans le cycle de g\xE9n\xE9ration." },
  4: { element: "Bois", emoji: "\u{1F333}", desc: "Structure et apprentissage", texte: "Le Bois mature incarne la structure organique et l'apprentissage. Ce lieu est propice \xE0 l'\xE9tude et \xE0 la mise en forme d'id\xE9es. Soutenez-le avec l'\xE9l\xE9ment Eau (formes ondul\xE9es, bleu profond) et temp\xE9rez avec une touche de Feu (bougies, rouge) pour la vitalit\xE9." },
  5: { element: "Terre", emoji: "\u{1F30D}", desc: "Centre et transformation", texte: "La Terre du 5 est le centre du Luo Shu, le pivot de toutes les \xE9nergies. Ce lieu est un carrefour de transformation et de transition. \xC9quilibrez avec l'\xE9l\xE9ment Feu (lumi\xE8res chaudes, teintes orang\xE9es) qui nourrit la Terre, et \xE9vitez l'exc\xE8s de Bois qui la d\xE9stabilise." },
  6: { element: "M\xE9tal", emoji: "\u2699\uFE0F", desc: "Ordre et harmonie", texte: "Le M\xE9tal incarne la concentration, l'ordre et l'autorit\xE9 bienveillante. Ce lieu favorise le discernement et les d\xE9cisions claires. Adoucissez avec l'\xE9l\xE9ment Eau (miroirs, formes ondul\xE9es, bleu profond) qui re\xE7oit l'\xE9nergie du M\xE9tal sans le rigidifier." },
  7: { element: "M\xE9tal", emoji: "\u2699\uFE0F", desc: "Raffinement et introspection", texte: "Le M\xE9tal raffin\xE9 du 7 invite au retrait int\xE9rieur et \xE0 l'analyse. Ce lieu convient \xE0 la r\xE9flexion et au recentrage spirituel. Adoucissez l'atmosph\xE8re avec l'\xE9l\xE9ment Eau (miroirs, teintes bleut\xE9es) et une touche de Terre (c\xE9ramiques, tons ocres) pour l'ancrage." },
  8: { element: "Terre", emoji: "\u{1F30D}", desc: "Prosp\xE9rit\xE9 et abondance", texte: "La Terre du 8 est la plus prosp\xE8re en Feng Shui \u2014 symbole d'abondance et de r\xE9ussite mat\xE9rielle. Ce lieu soutient l'ambition et la construction. Renforcez avec l'\xE9l\xE9ment Feu (\xE9clairages vifs, rouge) qui nourrit la Terre, et ajoutez du M\xE9tal (dor\xE9, rond) pour r\xE9colter les fruits." },
  9: { element: "Feu", emoji: "\u{1F525}", desc: "Passion et rayonnement", texte: "Le Feu symbolise la passion, la visibilit\xE9 et le rayonnement. Ce lieu amplifie l'\xE9nergie vitale et la pr\xE9sence sociale. Pour ne pas br\xFBler trop vite, temp\xE9rez avec l'\xE9l\xE9ment Terre (c\xE9ramiques, couleurs sable, formes carr\xE9es) qui absorbe et stabilise le Feu." }
};
var MASTER_NUMBER_NARRATIVES = {
  11: {
    nom: { label: "Ma\xEEtre 11 \u2014 Le Visionnaire Inspir\xE9", texte: "Le Ma\xEEtre 11 conf\xE8re au nom une vibration d'intuition et d'inspiration hors norme. C'est un nom qui attire l'attention sans la chercher, porteur d'id\xE9es en avance sur leur temps. Sa force r\xE9side dans la vision \u2014 il magn\xE9tise ceux qui cherchent du sens." },
    bebe: { label: "Ma\xEEtre 11 \u2014 L'Enfant de Lumi\xE8re", texte: "Le Ma\xEEtre 11 r\xE9v\xE8le une sensibilit\xE9 extr\xEAme et un don artistique ou intuitif rare. Ce n'est pas un destin \xE0 imposer, c'est une possibilit\xE9 \xE0 prot\xE9ger sans pression. L'enfant captera des choses que d'autres ne voient pas \u2014 donne-lui un cadre s\xE9curisant pour explorer cette richesse." },
    adresse: { label: "Ma\xEEtre 11 \u2014 Le Seuil de l'Intuition", texte: "Un lieu en vibration 11 amplifie l'intuition et la sensibilit\xE9. C'est une adresse propice \xE0 la cr\xE9ation, \xE0 la m\xE9ditation et aux activit\xE9s inspir\xE9es. Veillez \xE0 \xE9quilibrer cette intensit\xE9 : un environnement trop stimulant pourrait \xE9puiser." },
    numero: { label: "Vibration Ma\xEEtre 11 \u2014 L'Antenne Sensible", texte: "Un num\xE9ro en vibration 11 porte une fr\xE9quence d'inspiration et de connexion subtile. Il attire les \xE9changes profonds plut\xF4t que superficiels. C'est un num\xE9ro qui r\xE9sonne avec les personnes en qu\xEAte de sens." },
    date: { label: "Jour Ma\xEEtre 11 \u2014 La Fen\xEAtre d'Inspiration", texte: "Une journ\xE9e en vibration 11 ouvre une fen\xEAtre d'intuition exceptionnelle. Les id\xE9es arrivent plus vite, les connexions se font naturellement. Id\xE9al pour lancer un projet cr\xE9atif, moins pour les d\xE9cisions purement rationnelles." }
  },
  22: {
    nom: { label: "Ma\xEEtre 22 \u2014 L'Architecte des Possibles", texte: "Le Ma\xEEtre 22 est le plus puissant des nombres : il combine vision et capacit\xE9 de r\xE9alisation. Ce nom porte une promesse de construction durable et d'impact \xE0 grande \xE9chelle. La marque devra assumer cette envergure \u2014 le 22 ne pardonne pas la demi-mesure." },
    bebe: { label: "Ma\xEEtre 22 \u2014 Le Constructeur de Destins", texte: "Le Ma\xEEtre 22 porte une puissance de r\xE9alisation rare, mais une charge plus lourde que la moyenne. Ce n'est pas un destin \xE0 imposer, c'est une possibilit\xE9 \xE0 prot\xE9ger sans pression. Donnez-lui des racines avant de lui demander de b\xE2tir \u2014 ne brisez pas ses r\xEAves, m\xEAme s'ils semblent irr\xE9alisables." },
    adresse: { label: "Ma\xEEtre 22 \u2014 La Forge des Projets", texte: "Un lieu en vibration 22 est un acc\xE9l\xE9rateur de projets ambitieux. C'est une adresse qui pousse \xE0 construire, organiser, structurer \xE0 grande \xE9chelle. Attention : l'\xE9nergie est exigeante \u2014 pr\xE9voyez des espaces de repos pour contrebalancer." },
    numero: { label: "Vibration Ma\xEEtre 22 \u2014 Le Levier de Puissance", texte: "Un num\xE9ro en vibration 22 porte une signature d'autorit\xE9 et de solidit\xE9. Il convient parfaitement aux projets d'envergure, aux structures et aux partenariats durables. C'est un num\xE9ro qui inspire confiance." },
    date: { label: "Jour Ma\xEEtre 22 \u2014 Le Grand B\xE2tisseur", texte: "Une journ\xE9e en vibration 22 est id\xE9ale pour poser les fondations de quelque chose de durable. Contrats, signatures, lancements : le 22 donne la puissance de concr\xE9tiser ce qui semblait trop grand. Rare \u2014 ne la laissez pas passer." }
  },
  33: {
    nom: { label: "Ma\xEEtre 33 \u2014 Le Gu\xE9risseur Universel", texte: "Le Ma\xEEtre 33 est le nombre de la compassion et du service au plus haut niveau. Ce nom porte une vocation de soin, d'enseignement ou de transmission. La marque sera naturellement associ\xE9e \xE0 la bienveillance \u2014 elle devra honorer cette promesse." },
    bebe: { label: "Ma\xEEtre 33 \u2014 L'\xC2me au Grand C\u0153ur", texte: "Le Ma\xEEtre 33 est le plus \xE9lev\xE9 des nombres ma\xEEtres : amour universel et vocation de service. L'enfant montrera tr\xE8s t\xF4t une empathie hors norme et un besoin d'aider. Prot\xE8ge cette sensibilit\xE9 sans la brider \u2014 elle est sa plus grande force." },
    adresse: { label: "Ma\xEEtre 33 \u2014 Le Sanctuaire Bienveillant", texte: "Un lieu en vibration 33 rayonne d'une \xE9nergie de soin et de gu\xE9rison. C'est une adresse id\xE9ale pour les activit\xE9s th\xE9rapeutiques, l'enseignement ou l'accueil. L'atmosph\xE8re invite naturellement \xE0 l'ouverture du c\u0153ur." },
    numero: { label: "Vibration Ma\xEEtre 33 \u2014 L'Appel du Service", texte: "Un num\xE9ro en vibration 33 porte une signature de compassion et de d\xE9vouement. Il convient aux activit\xE9s de soin, d'\xE9ducation et de service \xE0 autrui. C'est un num\xE9ro qui attire les personnes en besoin d'accompagnement." },
    date: { label: "Jour Ma\xEEtre 33 \u2014 La Journ\xE9e du C\u0153ur", texte: "Une journ\xE9e en vibration 33 favorise les actes de g\xE9n\xE9rosit\xE9, les engagements altruistes et les gestes qui touchent. Id\xE9ale pour un mariage, une inauguration caritative, ou tout \xE9v\xE9nement centr\xE9 sur le lien humain." }
  }
};
function getMasterNarrative(num, module) {
  return MASTER_NUMBER_NARRATIVES[num]?.[module] || null;
}
function findKarmicLessons(name) {
  const norm = normalizeStr(name);
  const present = /* @__PURE__ */ new Set();
  for (const c of norm) {
    const v = PYTH_MAP[c];
    if (v) present.add(v);
  }
  const missing = [];
  for (let i = 1; i <= 9; i++) {
    if (!present.has(i)) missing.push(i);
  }
  return missing;
}
var MERCURY_RETRO_INTRO = "Mercure r\xE9trograde est une p\xE9riode o\xF9 les communications, les contrats et les d\xE9placements sont sujets \xE0 des malentendus et des retards. Ce n'est pas un interdit \u2014 c'est une invitation \xE0 la prudence, \xE0 la relecture et \xE0 la clart\xE9.";
var MERCURY_RETRO_NARRATIVES = {
  projet: "Mercure r\xE9trograde n'interdit pas de lancer, mais rend les contrats plus fragiles et les accords plus flous. Relis chaque clause, pr\xE9vois des marges, et ne signe rien dans la pr\xE9cipitation. Ce que tu poses maintenant devra peut-\xEAtre \xEAtre ajust\xE9 \u2014 anticipe-le.",
  sentiments: "Mercure r\xE9trograde n'interdit pas l'aveu, mais rend les mots plus facilement ambigus. Le bon chemin n'est pas de te taire, mais de parler lentement, simplement, sans sous-entendu. Choisis le face-\xE0-face plut\xF4t que le message \xE9crit.",
  partenariat: "Mercure r\xE9trograde fragilise les accords et les premi\xE8res impressions. Un partenariat initi\xE9 maintenant risque de reposer sur des malentendus. Si la rencontre est in\xE9vitable, documente tout par \xE9crit et pr\xE9vois un temps de confirmation apr\xE8s la r\xE9trogradation.",
  investissement: "Mercure r\xE9trograde brouille les chiffres et les petits caract\xE8res. Les erreurs de calcul, les frais cach\xE9s et les conditions mal comprises sont plus fr\xE9quents. V\xE9rifie trois fois plut\xF4t qu'une, et pr\xE9f\xE8re reporter les d\xE9cisions irr\xE9versibles.",
  voyage: "Mercure r\xE9trograde est traditionnellement associ\xE9 aux retards de transport, aux bagages perdus et aux r\xE9servations erron\xE9es. Pars avec des marges, confirme tes r\xE9servations la veille, et garde tes documents importants en double.",
  presentation: "Mercure r\xE9trograde affecte la communication publique : micro-coupures, lapsus, supports qui ne fonctionnent pas. Teste ton mat\xE9riel en avance, aie un plan B, et privil\xE9gie la clart\xE9 plut\xF4t que l'effet. La sobri\xE9t\xE9 sera ta meilleure alli\xE9e.",
  changement: "Mercure r\xE9trograde n'est pas id\xE9al pour les virages majeurs, car les informations sur lesquelles tu bases ta d\xE9cision peuvent \xEAtre incompl\xE8tes. Utilise cette p\xE9riode pour pr\xE9parer et analyser, puis agis une fois Mercure direct."
};
var CHINESE_DIGIT_BONUS = {
  8: { pts: 8, label: "Chiffre 8 \u2014 Fortune et prosp\xE9rit\xE9 (\u516B)" },
  6: { pts: 4, label: "Chiffre 6 \u2014 Fluidit\xE9, tout coule (\u516D)" },
  9: { pts: 2, label: "Chiffre 9 \u2014 Long\xE9vit\xE9 et durabilit\xE9 (\u4E5D)" },
  2: { pts: 1, label: "Chiffre 2 \u2014 Harmonie en paire (\u4E8C)" },
  4: { pts: -6, label: "Chiffre 4 \u2014 \xC9nergie frein\xE9e, ralentit le flux (\u56DB)" },
  7: { pts: 0, label: "Chiffre 7 \u2014 \xC9nergie neutre (\u4E03)" }
  // Ronde 9 (3/3) : 7 neutre/positif en chinois
};
var EXPRESSION_LABELS = {
  1: "Leadership \u2014 pionnier",
  2: "Diplomatie \u2014 partenariat",
  3: "Expression \u2014 communication",
  4: "Structure \u2014 rigueur",
  5: "Libert\xE9 \u2014 mouvement",
  6: "Harmonie \u2014 service",
  7: "Introspection \u2014 sagesse",
  8: "Fortune \u2014 pouvoir",
  9: "Vision \u2014 humanitaire",
  11: "Ma\xEEtre Intuitif",
  22: "Ma\xEEtre B\xE2tisseur",
  33: "Ma\xEEtre Gu\xE9risseur"
};
var BRAND_DOMAIN_SCORES = {
  1: { commerce: 8, creatif: 7, humain: 4, spirituel: 5, tech: 8, generaliste: 7 },
  2: { commerce: 4, creatif: 6, humain: 9, spirituel: 7, tech: 5, generaliste: 5 },
  3: { commerce: 6, creatif: 10, humain: 7, spirituel: 5, tech: 7, generaliste: 7 },
  4: { commerce: 9, creatif: 4, humain: 6, spirituel: 5, tech: 8, generaliste: 7 },
  5: { commerce: 8, creatif: 8, humain: 5, spirituel: 6, tech: 9, generaliste: 7 },
  6: { commerce: 5, creatif: 7, humain: 10, spirituel: 8, tech: 4, generaliste: 7 },
  7: { commerce: 2, creatif: 5, humain: 6, spirituel: 10, tech: 7, generaliste: 5 },
  8: { commerce: 10, creatif: 6, humain: 4, spirituel: 3, tech: 8, generaliste: 8 },
  9: { commerce: 4, creatif: 7, humain: 9, spirituel: 9, tech: 6, generaliste: 7 },
  11: { commerce: 6, creatif: 8, humain: 8, spirituel: 10, tech: 9, generaliste: 8 },
  22: { commerce: 10, creatif: 6, humain: 7, spirituel: 5, tech: 10, generaliste: 9 },
  33: { commerce: 4, creatif: 8, humain: 10, spirituel: 10, tech: 5, generaliste: 8 }
};
var ADDRESS_NUMBERS = {
  1: { pts: 6, label: "Ind\xE9pendance \u2014 logement individuel, solitude constructive" },
  2: { pts: 8, label: "Harmonie \u2014 lieu de couple, partage, coop\xE9ration" },
  3: { pts: 7, label: "Expression \u2014 lieu vivant, cr\xE9atif, social" },
  4: { pts: 7, label: "Stabilit\xE9 \u2014 fondation solide, s\xE9curit\xE9, racines" },
  5: { pts: 5, label: "Mouvement \u2014 lieu de passage, changements fr\xE9quents" },
  6: { pts: 10, label: "Foyer \u2014 lieu id\xE9al pour la famille et le bien-\xEAtre" },
  7: { pts: 9, label: "Sanctuaire \u2014 lieu de paix, r\xE9flexion, ressourcement" },
  8: { pts: 6, label: "Ambition \u2014 lieu orient\xE9 carri\xE8re, moins reposant" },
  9: { pts: 8, label: "Ouverture \u2014 lieu accueillant, humaniste, g\xE9n\xE9reux" },
  11: { pts: 9, label: "Inspiration \u2014 lieu d'intuition et d'\xE9l\xE9vation" },
  22: { pts: 8, label: "Grand \u0152uvre \u2014 lieu pour b\xE2tir quelque chose de durable" },
  33: { pts: 10, label: "Compassion \u2014 lieu de gu\xE9rison, service, amour inconditionnel" }
};
var NUMBER_SCORES = {
  1: { pts: 8, label: "Leadership \u2014 num\xE9ro d'initiative" },
  2: { pts: 5, label: "Diplomatie \u2014 num\xE9ro de partenariat" },
  3: { pts: 8, label: "Communication \u2014 num\xE9ro d'expression et de contact" },
  4: { pts: 6, label: "Structure \u2014 num\xE9ro stable et fiable" },
  5: { pts: 7, label: "Libert\xE9 \u2014 num\xE9ro dynamique et adaptable" },
  6: { pts: 7, label: "Harmonie \u2014 num\xE9ro de service et d'entraide" },
  7: { pts: 5, label: "Introspection \u2014 num\xE9ro discret, peu commercial" },
  8: { pts: 9, label: "Fortune \u2014 num\xE9ro de pouvoir et de r\xE9sultats" },
  9: { pts: 7, label: "Vision \u2014 num\xE9ro d'impact et de port\xE9e" },
  11: { pts: 9, label: "Ma\xEEtre Intuitif \u2014 num\xE9ro \xE0 vibration \xE9lev\xE9e" },
  22: { pts: 10, label: "Ma\xEEtre B\xE2tisseur \u2014 num\xE9ro d'infrastructure" },
  33: { pts: 8, label: "Ma\xEEtre Gu\xE9risseur \u2014 num\xE9ro de compassion" }
};
var NUMBER_DOMAIN_SCORES = {
  //                   com   créa  hum   spir  tech  gén
  1: { commerce: 8, creatif: 7, humain: 5, spirituel: 5, tech: 8, generaliste: 7 },
  2: { commerce: 5, creatif: 6, humain: 10, spirituel: 8, tech: 5, generaliste: 6 },
  3: { commerce: 7, creatif: 10, humain: 7, spirituel: 6, tech: 6, generaliste: 7 },
  4: { commerce: 6, creatif: 4, humain: 5, spirituel: 4, tech: 8, generaliste: 5 },
  5: { commerce: 9, creatif: 8, humain: 5, spirituel: 5, tech: 7, generaliste: 7 },
  6: { commerce: 6, creatif: 7, humain: 10, spirituel: 7, tech: 5, generaliste: 8 },
  7: { commerce: 4, creatif: 6, humain: 6, spirituel: 10, tech: 8, generaliste: 5 },
  8: { commerce: 10, creatif: 5, humain: 4, spirituel: 4, tech: 7, generaliste: 8 },
  9: { commerce: 7, creatif: 8, humain: 9, spirituel: 9, tech: 6, generaliste: 7 },
  11: { commerce: 5, creatif: 8, humain: 9, spirituel: 10, tech: 7, generaliste: 7 },
  22: { commerce: 10, creatif: 6, humain: 6, spirituel: 6, tech: 10, generaliste: 8 },
  33: { commerce: 5, creatif: 8, humain: 10, spirituel: 10, tech: 5, generaliste: 7 }
};
var NUMBER_DOMAIN_LABELS = {
  1: { commerce: "Leadership \u2014 initiative et autorit\xE9", creatif: "Originalit\xE9 \u2014 vision unique", humain: "Individualisme \u2014 \xE9nergie solitaire", spirituel: "Qu\xEAte personnelle \u2014 chemin int\xE9rieur", tech: "Innovation \u2014 esprit pionnier", generaliste: "Leadership \u2014 num\xE9ro d'initiative" },
  2: { commerce: "Diplomatie \u2014 n\xE9gociation et \xE9coute", creatif: "Collaboration \u2014 cr\xE9ation en duo", humain: "Empathie \u2014 lien profond", spirituel: "R\xE9ceptivit\xE9 \u2014 ouverture spirituelle", tech: "Partenariat \u2014 synergie technique", generaliste: "Diplomatie \u2014 num\xE9ro de partenariat" },
  3: { commerce: "Communication \u2014 relation client", creatif: "Expression \u2014 cr\xE9ativit\xE9 d\xE9bordante", humain: "Sociabilit\xE9 \u2014 contact chaleureux", spirituel: "Joie \u2014 \xE9nergie d'expansion", tech: "Pr\xE9sentation \u2014 interface engageante", generaliste: "Communication \u2014 num\xE9ro d'expression" },
  4: { commerce: "Fiabilit\xE9 \u2014 structure solide", creatif: "Rigueur \u2014 cadre parfois limitant", humain: "Stabilit\xE9 \u2014 \xE9nergie terre-\xE0-terre", spirituel: "Ancrage \u2014 peu de fluidit\xE9 mystique", tech: "Pr\xE9cision \u2014 infrastructure robuste", generaliste: "Structure \u2014 num\xE9ro stable et fiable" },
  5: { commerce: "Dynamisme \u2014 adaptation rapide", creatif: "Libert\xE9 \u2014 inspiration sans limite", humain: "Mouvement \u2014 \xE9nergie dispers\xE9e", spirituel: "Aventure \u2014 exploration sans ancrage", tech: "Agilit\xE9 \u2014 \xE9volution constante", generaliste: "Libert\xE9 \u2014 num\xE9ro dynamique" },
  6: { commerce: "Service \u2014 fid\xE9lisation client", creatif: "Harmonie \u2014 esth\xE9tique \xE9quilibr\xE9e", humain: "Bienveillance \u2014 \xE9coute et soin", spirituel: "Gu\xE9rison \u2014 \xE9nergie de c\u0153ur", tech: "Support \u2014 assistance fiable", generaliste: "Harmonie \u2014 num\xE9ro de service" },
  7: { commerce: "Analyse \u2014 peu orient\xE9 vente", creatif: "Profondeur \u2014 vision int\xE9rieure", humain: "R\xE9serve \u2014 \xE9nergie introspective", spirituel: "Sagesse \u2014 vibration tr\xE8s \xE9lev\xE9e", tech: "Recherche \u2014 esprit analytique", generaliste: "Introspection \u2014 num\xE9ro discret" },
  8: { commerce: "Puissance \u2014 \xE9nergie de r\xE9sultats", creatif: "Ambition \u2014 moins de sensibilit\xE9 artistique", humain: "Pouvoir \u2014 \xE9nergie dominante", spirituel: "Mat\xE9rialisme \u2014 peu de transcendance", tech: "Efficacit\xE9 \u2014 performance maximale", generaliste: "Fortune \u2014 num\xE9ro de pouvoir" },
  9: { commerce: "Impact \u2014 port\xE9e et influence", creatif: "Inspiration \u2014 vision universelle", humain: "Compassion \u2014 \xE9nergie humaniste", spirituel: "Transcendance \u2014 vibration \xE9lev\xE9e", tech: "Vision \u2014 perspective globale", generaliste: "Vision \u2014 num\xE9ro d'impact" },
  11: { commerce: "Intuition \u2014 peu terre-\xE0-terre", creatif: "Illumination \u2014 cr\xE9ativit\xE9 inspir\xE9e", humain: "Sensibilit\xE9 \u2014 connexion profonde", spirituel: "Ma\xEEtrise intuitive \u2014 vibration maximale", tech: "Vision avant-gardiste", generaliste: "Ma\xEEtre Intuitif \u2014 vibration \xE9lev\xE9e" },
  22: { commerce: "Empire \u2014 construire en grand", creatif: "Architecture \u2014 structure cr\xE9ative", humain: "Organisation \u2014 cadre collectif", spirituel: "\xC9dification \u2014 mati\xE8re et esprit", tech: "Infrastructure \u2014 b\xE2tir \xE0 grande \xE9chelle", generaliste: "Ma\xEEtre B\xE2tisseur \u2014 infrastructure" },
  33: { commerce: "Altruisme \u2014 peu orient\xE9 profit", creatif: "Art sacr\xE9 \u2014 cr\xE9ation au service", humain: "Compassion universelle \u2014 d\xE9votion", spirituel: "Ma\xEEtre spirituel \u2014 vibration maximale", tech: "Service universel \u2014 technologie \xE9thique", generaliste: "Ma\xEEtre Gu\xE9risseur \u2014 compassion" }
};
var NAME_CDV_COMPAT = {
  "1-1": 8,
  "1-2": 5,
  "1-3": 9,
  "1-4": 4,
  "1-5": 8,
  "1-6": 5,
  "1-7": 6,
  "1-8": 7,
  "1-9": 7,
  "2-2": 6,
  "2-3": 7,
  "2-4": 7,
  "2-5": 4,
  "2-6": 9,
  "2-7": 5,
  "2-8": 5,
  "2-9": 6,
  "3-3": 7,
  "3-4": 3,
  "3-5": 8,
  "3-6": 8,
  "3-7": 5,
  "3-8": 6,
  "3-9": 9,
  "4-4": 6,
  "4-5": 4,
  "4-6": 7,
  "4-7": 6,
  "4-8": 9,
  "4-9": 4,
  "5-5": 7,
  "5-6": 5,
  "5-7": 7,
  "5-8": 6,
  "5-9": 8,
  "6-6": 7,
  "6-7": 4,
  "6-8": 5,
  "6-9": 8,
  "7-7": 8,
  "7-8": 4,
  "7-9": 5,
  "8-8": 7,
  "8-9": 7,
  "9-9": 7
};
function getNameCdvCompat(nameNum, cdv) {
  const a = Math.min(nameNum, cdv);
  const b = Math.max(nameNum, cdv);
  return NAME_CDV_COMPAT[`${a}-${b}`] ?? 5;
}
function analyzeNumber(numStr) {
  const digits = numStr.replace(/[^0-9]/g, "");
  const details = [];
  let repeats = 0, sequences = 0, mirrors = 0, chineseBonus = 0;
  const repeatMatch = digits.match(/(.)\1{1,}/g);
  if (repeatMatch) {
    repeats = repeatMatch.reduce((acc, m) => acc + (m.length - 1) * 2, 0);
    repeatMatch.forEach((m) => {
      if (m.length >= 3) details.push(`Le chiffre ${m[0]} appara\xEEt ${m.length}\xD7 d'affil\xE9e (${m}) \u2014 ${m[0] === "8" ? "tr\xE8s favorable" : m[0] === "4" ? "attention" : "r\xE9p\xE9tition notable"}`);
    });
  }
  for (let i = 0; i < digits.length - 2; i++) {
    const a = parseInt(digits[i]), b = parseInt(digits[i + 1]), c = parseInt(digits[i + 2]);
    if (b === a + 1 && c === b + 1) {
      sequences += 3;
      details.push(`Suite ${digits.substring(i, i + 3)} \u2014 progression ascendante (dynamisme)`);
    }
    if (b === a - 1 && c === b - 1) {
      sequences += 2;
      details.push(`Suite ${digits.substring(i, i + 3)} \u2014 progression descendante (ralentissement)`);
    }
  }
  if (digits.length >= 4) {
    const half = Math.floor(digits.length / 2);
    const first = digits.substring(0, half);
    const second = digits.substring(digits.length - half).split("").reverse().join("");
    if (first === second) {
      mirrors = 5;
      details.push(`Nombre miroir (${first}|${second.split("").reverse().join("")}) \u2014 sym\xE9trie parfaite, \xE9nergie r\xE9fl\xE9chie`);
    }
  }
  const digitCounts = {};
  for (const d of digits) {
    const n = parseInt(d);
    digitCounts[n] = (digitCounts[n] || 0) + 1;
  }
  for (const [digit, count] of Object.entries(digitCounts)) {
    const d = parseInt(digit);
    const info = CHINESE_DIGIT_BONUS[d];
    if (info) {
      const bonus = info.pts * count;
      chineseBonus += bonus;
      if (Math.abs(bonus) >= 4) details.push(`${info.label} (\xD7${count})`);
    }
  }
  if (digits.includes("168")) {
    chineseBonus += 10;
    details.push('\u4E00\u516D\u516B Yi Lu Fa (168) \u2014 "chemin vers la fortune" (tr\xE8s favorable)');
  }
  const sum = digits.split("").reduce((acc, d) => acc + parseInt(d), 0);
  const reduction = reduce(sum);
  return { repeats, sequences, mirrors, chineseBonus, reduction, rawSum: sum, details };
}
var SUJETS = {
  projet: { label: "Lancer projet / signer contrat", icon: "\u{1F680}", mercurySensitive: true, dominantDomain: "BUSINESS" },
  sentiments: { label: "D\xE9clarer sentiments / premier RDV", icon: "\u{1F495}", mercurySensitive: false, dominantDomain: "AMOUR" },
  partenariat: { label: "Rencontrer associ\xE9 / partenariat", icon: "\u{1F91D}", mercurySensitive: true, dominantDomain: "RELATIONS" },
  investissement: { label: "Investissement / d\xE9cision financi\xE8re", icon: "\u{1F4B0}", mercurySensitive: true, dominantDomain: "BUSINESS" },
  voyage: { label: "Voyage / d\xE9m\xE9nagement", icon: "\u2708\uFE0F", mercurySensitive: true, dominantDomain: "VITALITE" },
  // Ronde 9 (3/3) : Hermès = voyageurs
  presentation: { label: "Pr\xE9sentation / prise de parole", icon: "\u{1F3A4}", mercurySensitive: true, dominantDomain: "CREATIVITE" },
  // Ronde 9ter : communication sensible MR
  changement: { label: "Changement de vie majeur", icon: "\u{1F504}", mercurySensitive: true, dominantDomain: "INTROSPECTION" }
};
var VERDICT_TEXTES = {
  projet: {
    feu_vert: "Les cycles de cr\xE9ation sont ouverts. Fonce \u2014 le timing est align\xE9 avec ton \xE9nergie de fondation.",
    prudence: "Le potentiel est l\xE0, mais un d\xE9tail structurel freine. R\xE9vise tes fondations avant d'appuyer sur le bouton.",
    pas_maintenant: "Mauvais timing cosmique. Le lancement risque de s'\xE9puiser rapidement \u2014 attends une meilleure fen\xEAtre."
  },
  sentiments: {
    feu_vert: "V\xE9nus et ta num\xE9rologie te soutiennent. Parle \u2014 les mots toucheront juste.",
    prudence: "L'\xE9nergie est ambigu\xEB. Teste les eaux avant de tout r\xE9v\xE9ler \u2014 une approche subtile sera plus efficace.",
    pas_maintenant: "Risque \xE9lev\xE9 de mauvaise interpr\xE9tation aujourd'hui. Garde le silence et attends un jour plus r\xE9ceptif."
  },
  partenariat: {
    feu_vert: "Les \xE9nergies relationnelles sont au sommet. Rencontrez, n\xE9gociez, engagez-toi \u2014 la synergie est naturelle.",
    prudence: "Le terrain est correct mais pas optimal. Prends le temps de v\xE9rifier la compatibilit\xE9 profonde avant de signer.",
    pas_maintenant: "Les syst\xE8mes d\xE9tectent des frictions cach\xE9es. Reporte cette rencontre \u2014 ton instinct sera plus clair demain."
  },
  investissement: {
    feu_vert: "Les cycles financiers sont favorables. Ton discernement est \xE0 son pic \u2014 fais confiance \xE0 ton analyse.",
    prudence: "Le moment n'est ni bon ni mauvais. Attends un signal suppl\xE9mentaire avant d'engager des sommes importantes.",
    pas_maintenant: "Risque de perte accru. Les cycles ne soutiennent pas les d\xE9cisions financi\xE8res majeures aujourd'hui."
  },
  voyage: {
    feu_vert: "Les vents sont porteurs. Ce d\xE9placement apportera plus que pr\xE9vu \u2014 reste ouvert aux rencontres.",
    prudence: "Le voyage est possible mais exigera plus d'\xE9nergie que pr\xE9vu. Pr\xE9pare-toi aux impr\xE9vus logistiques.",
    pas_maintenant: "L'\xE9nergie invite au repos, pas au mouvement. Si c'est reportable, ton corps te remerciera."
  },
  presentation: {
    feu_vert: "Ton charisme est amplifi\xE9. Monte sur sc\xE8ne \u2014 chaque mot portera avec une force inhabituelle.",
    prudence: "Tu seras correct mais pas exceptionnel. Pr\xE9pare davantage pour compenser l'\xE9nergie moyenne.",
    pas_maintenant: "Risque de trous de m\xE9moire ou de perte de fil. D\xE9l\xE9guer ou reporter serait plus sage."
  },
  changement: {
    feu_vert: "Les grands cycles soutiennent ta mutation. C'est un portail \u2014 traverse-le avec conviction.",
    prudence: "Le changement est possible mais le timing n'est pas parfait. Pose les bases sans tout bousculer d'un coup.",
    pas_maintenant: "Les syst\xE8mes d\xE9tectent une r\xE9sistance profonde. Ce n'est pas le moment de tout renverser \u2014 consolide d'abord."
  }
};
function getVerdict(score, sujet) {
  let verdict;
  if (score >= 75) verdict = "feu_vert";
  else if (score >= 48) verdict = "prudence";
  else verdict = "pas_maintenant";
  const icons = { feu_vert: "\u2705", prudence: "\u26A0\uFE0F", pas_maintenant: "\u{1F6D1}" };
  const labels = { feu_vert: "Feu Vert", prudence: "Prudence", pas_maintenant: "Pas maintenant" };
  const colors = { feu_vert: "#4ade80", prudence: "#f59e0b", pas_maintenant: "#ef4444" };
  let texte;
  if (sujet && VERDICT_TEXTES[sujet]) {
    texte = VERDICT_TEXTES[sujet][verdict];
  } else {
    const generic = {
      feu_vert: "Les cycles sont align\xE9s en ton faveur. Avance avec confiance.",
      prudence: "L'\xE9nergie est mitig\xE9e. Proc\xE8de avec attention et v\xE9rifie les d\xE9tails.",
      pas_maintenant: "Les syst\xE8mes recommandent d'attendre. Ce n'est pas le bon moment."
    };
    texte = generic[verdict];
  }
  return { verdict, icon: icons[verdict], label: labels[verdict], color: colors[verdict], texte };
}
var DATE_VIBRATION_QUALITY = {
  1: { pts: 7, label: "Initiative \u2014 bon pour lancer" },
  2: { pts: 5, label: "R\xE9ceptivit\xE9 \u2014 bon pour coop\xE9rer" },
  3: { pts: 8, label: "Expression \u2014 cr\xE9ativit\xE9 et communication" },
  4: { pts: 6, label: "Structure \u2014 patience, fondation" },
  5: { pts: 7, label: "Changement \u2014 mouvement et opportunit\xE9" },
  6: { pts: 8, label: "Harmonie \u2014 foyer, amour, responsabilit\xE9" },
  7: { pts: 6, label: "R\xE9flexion \u2014 introspection, analyse" },
  8: { pts: 9, label: "Manifestation \u2014 pouvoir et r\xE9sultats" },
  9: { pts: 7, label: "Accomplissement \u2014 bilan et humanit\xE9" },
  11: { pts: 9, label: "Ma\xEEtre Intuitif \u2014 inspiration \xE9lev\xE9e" },
  22: { pts: 10, label: "Ma\xEEtre B\xE2tisseur \u2014 potentiel maximal" },
  33: { pts: 8, label: "Ma\xEEtre Gu\xE9risseur \u2014 compassion universelle" }
};
function calcOracleDate(targetDate, dailyScore, userCdv, userBirthDay, userBirthMonth) {
  const signals = [];
  const alerts = [];
  const breakdown = [];
  const parts = targetDate.split("-");
  const year = parseInt(parts[0] || "2026");
  const month = parseInt(parts[1] || "1");
  const day = parseInt(parts[2] || "1");
  const dateSum = day + month + year;
  const vibDate = reduce(dateSum);
  const vibInfo = DATE_VIBRATION_QUALITY[vibDate.v] || { pts: 5, label: "Neutre" };
  const vibScore = vibInfo.pts * 10;
  breakdown.push({ label: `Vibration du jour : ${vibDate.v}${vibDate.m ? " Ma\xEEtre" : ""}`, value: vibInfo.label, pts: vibScore });
  const vibSimple = vibDate.v > 9 ? reduce(vibDate.v).v : vibDate.v;
  const cdvSimple = userCdv > 9 ? reduce(userCdv).v : userCdv;
  const compatRaw = getNameCdvCompat(vibSimple, cdvSimple);
  const compatScore = compatRaw * 10;
  breakdown.push({ label: `R\xE9sonance date \xD7 Chemin de Vie ${userCdv}`, value: `${compatRaw}/10`, pts: compatScore });
  const anneePerso = reduce(userBirthDay + userBirthMonth + year);
  const moisPerso = reduce(anneePerso.v + month);
  const jourPerso = reduce(moisPerso.v + day);
  const jourPersoSimple = jourPerso.v > 9 ? reduce(jourPerso.v).v : jourPerso.v;
  const cycleCompatRaw = getNameCdvCompat(jourPersoSimple, vibSimple);
  const cycleScore = cycleCompatRaw * 10;
  breakdown.push({ label: `Jour personnel : JP${jourPerso.v} (AP${anneePerso.v}/MP${moisPerso.v})`, value: `R\xE9sonance ${cycleCompatRaw}/10`, pts: cycleScore });
  const domainScore = Math.max(0, Math.min(100, Math.round(
    0.4 * vibScore + 0.3 * compatScore + 0.3 * cycleScore
  )));
  signals.push(`Ce score est personnalis\xE9 pour ton Chemin de Vie ${userCdv} \u2014 une autre personne obtiendrait un r\xE9sultat diff\xE9rent pour la m\xEAme date`);
  if (domainScore >= 75) signals.push("Journ\xE9e \xE0 fort potentiel num\xE9rologique pour cette action");
  else if (domainScore < 40) alerts.push("Journ\xE9e sous tension num\xE9rologique \u2014 consid\xE9rez une alternative");
  if (vibDate.m) {
    const masterInfo = getMasterNarrative(vibDate.v, "date");
    signals.push(masterInfo ? `${masterInfo.label} \u2014 ${masterInfo.texte}` : `Vibration Ma\xEEtre ${vibDate.v} \u2014 journ\xE9e \xE0 potentiel exceptionnel`);
  }
  const reducedDay = reduce(day).v;
  const reducedMonth = reduce(month).v;
  const reducedYear = reduce(year).v;
  const decozSum = reducedDay + reducedMonth + reducedYear;
  const dateKarmic = checkKarmicNumber(decozSum);
  if (dateKarmic) {
    const kInfo = getKarmicDebt(dateKarmic, "date");
    breakdown.push({ label: kInfo.label, value: `${day}\u2192${reducedDay} + ${month}\u2192${reducedMonth} + ${year}\u2192${reducedYear} = ${decozSum}`, pts: 0 });
    alerts.push(kInfo.texte);
  }
  return { domainScore, breakdown, signals, alerts };
}
var AME_DESC = {
  1: "Besoin d'ind\xE9pendance",
  2: "Besoin d'harmonie",
  3: "Besoin d'expression",
  4: "Besoin de s\xE9curit\xE9",
  5: "Besoin de libert\xE9",
  6: "Besoin d'amour",
  7: "Besoin de v\xE9rit\xE9",
  8: "Besoin de r\xE9ussite",
  9: "Besoin d'id\xE9al",
  11: "Intuition profonde",
  22: "Vision de b\xE2tisseur",
  33: "Compassion universelle"
};
var IMAGE_DESC = {
  1: "Image de leader",
  2: "Image douce et diplomate",
  3: "Image cr\xE9ative et sociable",
  4: "Image s\xE9rieuse et fiable",
  5: "Image dynamique et libre",
  6: "Image protectrice et chaleureuse",
  7: "Image myst\xE9rieuse et r\xE9serv\xE9e",
  8: "Image puissante et ambitieuse",
  9: "Image sage et g\xE9n\xE9reuse",
  11: "Image inspirante",
  22: "Image d'envergure",
  33: "Image de guide"
};
function calcOracleNom(name, userCdv, domain = "generaliste") {
  if (!name || normalizeStr(name).length === 0) {
    return { domainScore: 0, breakdown: [], signals: [], alerts: ["\u26A0\uFE0F Aucun nom saisi \u2014 la num\xE9rologie ne peut pas s'appliquer."] };
  }
  const signals = [];
  const alerts = [];
  const breakdown = [];
  const { cleaned: cleanedName, tldFound } = stripTLD(name);
  if (tldFound) signals.push(`Extension "${tldFound}" ignor\xE9e \u2014 calcul sur "${cleanedName}" uniquement`);
  const nums = calcNameNumbers(cleanedName);
  const exprV = nums.expression.v;
  const ameV = nums.ame.v;
  const imageV = nums.image.v;
  const exprDesc = EXPRESSION_LABELS[exprV] || "Neutre";
  breakdown.push({ label: `Expression : ${exprV}${nums.expression.m ? " Ma\xEEtre" : ""}`, value: exprDesc, pts: 0 });
  breakdown.push({ label: `\xC2me : ${ameV}${nums.ame.m ? " Ma\xEEtre" : ""}`, value: AME_DESC[ameV] || "Motivation profonde", pts: 0 });
  breakdown.push({ label: `Image : ${imageV}${nums.image.m ? " Ma\xEEtre" : ""}`, value: IMAGE_DESC[imageV] || "Apparence ext\xE9rieure", pts: 0 });
  const domainScores = BRAND_DOMAIN_SCORES[exprV] || BRAND_DOMAIN_SCORES[exprV > 9 ? reduce(exprV).v : exprV];
  const bizScore = domainScores ? domainScores[domain] : 5;
  const bizPts = bizScore * 5;
  const exprLabel = EXPRESSION_LABELS[exprV] || "Neutre";
  const domainInfo = ORACLE_DOMAINS.find((d) => d.id === domain);
  const domainLabel = domainInfo ? domainInfo.label : "G\xE9n\xE9raliste";
  breakdown.push({ label: `Score ${domainLabel}`, value: `${exprLabel} \u2014 ${bizScore}/10`, pts: bizPts });
  if (bizScore >= 8) signals.push(`La vibration du ${exprV} est excellente pour le secteur ${domainLabel}`);
  else if (bizScore <= 4) alerts.push(`La vibration du ${exprV} est en d\xE9calage avec le secteur ${domainLabel}`);
  const compatScore = getNameCdvCompat(exprV > 9 ? reduce(exprV).v : exprV, userCdv > 9 ? reduce(userCdv).v : userCdv);
  const compatPts = compatScore * 5;
  breakdown.push({ label: `Compatibilit\xE9 Chemin de Vie ${userCdv}`, value: `${compatScore}/10`, pts: compatPts });
  if (compatScore >= 8) signals.push(`Excellente r\xE9sonance entre "${name}" et ton Chemin de Vie ${userCdv}`);
  else if (compatScore <= 3) alerts.push(`Friction entre "${name}" et ton Chemin de Vie ${userCdv} \u2014 l'\xE9nergie sera en tension`);
  let masterBonus = 0;
  if (nums.expression.m) {
    masterBonus += 5;
    const masterInfo = getMasterNarrative(exprV, "nom");
    signals.push(masterInfo ? `${masterInfo.label} \u2014 ${masterInfo.texte}` : `Nombre Ma\xEEtre ${exprV} \u2014 puissance spirituelle dans le nom`);
  }
  let soulBonus = 0;
  const ameSimple = ameV > 9 ? reduce(ameV).v : ameV;
  const cdvSimpleForSoul = userCdv > 9 ? reduce(userCdv).v : userCdv;
  const soulCompat = getNameCdvCompat(ameSimple, cdvSimpleForSoul);
  if (soulCompat >= 8) {
    soulBonus = 5;
    signals.push(`\xC2me du nom (${ameV}) en forte r\xE9sonance avec ton Chemin de Vie ${userCdv} \u2014 motivation profonde align\xE9e`);
  }
  const exprKarmic = checkKarmicNumber(nums.rawSums.expr);
  const ameKarmic = checkKarmicNumber(nums.rawSums.ame);
  const imageKarmic = checkKarmicNumber(nums.rawSums.image);
  if (exprKarmic) {
    const kInfo = getKarmicDebt(exprKarmic, "nom");
    breakdown.push({ label: `${kInfo.label}`, value: `Vibration globale du nom : somme ${nums.rawSums.expr} \u2192 ${exprV}`, pts: 0 });
    alerts.push(kInfo.texte);
  }
  if (ameKarmic) {
    const kInfo = getKarmicDebt(ameKarmic, "nom");
    breakdown.push({ label: `${kInfo.label}`, value: `Motivation profonde (voyelles) : somme ${nums.rawSums.ame} \u2192 ${ameV}`, pts: 0 });
    alerts.push(kInfo.texte);
  }
  if (imageKarmic) {
    const kInfo = getKarmicDebt(imageKarmic, "nom");
    breakdown.push({ label: `${kInfo.label}`, value: `Image per\xE7ue (consonnes) : somme ${nums.rawSums.image} \u2192 ${imageV}`, pts: 0 });
    alerts.push(kInfo.texte);
  }
  const karmicLessons = findKarmicLessons(cleanedName);
  if (karmicLessons.length > 0 && karmicLessons.length <= 4) {
    const lessonDetails = karmicLessons.map((n) => {
      const l = getKarmicLesson(n, "nom");
      return `${n} (${l.label.split(" \u2014 ")[1] || l.label})`;
    }).join(", ");
    breakdown.push({ label: "Le\xE7ons karmiques (lettres manquantes)", value: lessonDetails, pts: 0 });
    karmicLessons.forEach((n) => {
      const l = getKarmicLesson(n, "nom");
      alerts.push(l.texte);
    });
  }
  const domainScore = Math.max(0, Math.min(100, Math.round(bizPts + compatPts + masterBonus + soulBonus)));
  return { domainScore, breakdown, signals, alerts };
}
function calcOracleAdresse(adresse, userCdv, appart) {
  const signals = [];
  const alerts = [];
  const breakdown = [];
  let cleaned = adresse.trim();
  cleaned = cleaned.replace(/[,\s]+\d{5}\b.*$/i, "");
  cleaned = cleaned.replace(/\s+\d{5}\b.*$/i, "");
  cleaned = cleaned.replace(/,\s*[A-Za-zÀ-ÿ\s-]+$/, "");
  cleaned = cleaned.trim();
  if (!cleaned) cleaned = adresse.trim();
  const match = cleaned.match(/^(\d+)\s*([a-z]?)(?:\s+(bis|ter|quater))?\s*,?\s+(.+)/i);
  let numero = "";
  let suffixe = "";
  let rue = cleaned;
  if (match) {
    numero = match[1];
    suffixe = (match[2] || match[3] || "").toLowerCase();
    rue = match[4];
  }
  const SUFFIX_VALUE = {
    a: 1,
    b: 2,
    c: 3,
    d: 4,
    e: 5,
    f: 6,
    g: 7,
    h: 8,
    bis: 2,
    ter: 3,
    quater: 4
  };
  const suffixValue = suffixe ? SUFFIX_VALUE[suffixe] || 0 : 0;
  const suffixLabel = suffixe ? ` ${suffixe}` : "";
  const hasAppart = appart != null && appart.trim().length > 0;
  const W_NUM = hasAppart ? 0.45 : 0.6;
  const W_APT = hasAppart ? 0.15 : 0;
  const W_RUE = 0.2;
  const W_CMP = 0.2;
  let numScore = 50;
  let numReduced = reduce(5);
  if (numero) {
    const digits = numero.replace(/[^0-9]/g, "");
    const baseSum = digits.split("").reduce((s, d) => s + parseInt(d), 0);
    numReduced = reduce(baseSum + suffixValue);
    const bizInfo = ADDRESS_NUMBERS[numReduced.v] || { pts: 5, label: "Neutre" };
    numScore = Math.min(100, bizInfo.pts * 10);
    const numLabel2 = suffixe ? `N\xB0 ${numero}${suffixLabel} \u2192 ${baseSum}+${suffixValue} \u2192 ${numReduced.v}` : `N\xB0 ${numero} \u2192 ${numReduced.v}`;
    breakdown.push({ label: numLabel2, value: bizInfo.label, pts: Math.round(numScore * W_NUM) });
    if (bizInfo.pts >= 8) signals.push(`N\xB0 ${numero}${suffixLabel} r\xE9duit \xE0 ${numReduced.v} \u2014 ${bizInfo.label}`);
    if (bizInfo.pts <= 2) alerts.push(`N\xB0 ${numero}${suffixLabel} r\xE9duit \xE0 ${numReduced.v} \u2014 ${bizInfo.label}`);
  }
  let aptScore = 50;
  let aptReduced = reduce(1);
  if (hasAppart) {
    const aptDigits = appart.trim().replace(/[^0-9]/g, "");
    if (aptDigits.length > 0) {
      aptReduced = reduce(aptDigits.split("").reduce((s, d) => s + parseInt(d), 0));
    } else {
      aptReduced = calcStringNumber(appart.trim());
    }
    const aptInfo = ADDRESS_NUMBERS[aptReduced.v] || { pts: 5, label: "Neutre" };
    aptScore = Math.min(100, aptInfo.pts * 10);
    breakdown.push({ label: `Appart "${appart.trim()}" \u2192 ${aptReduced.v}`, value: aptInfo.label, pts: Math.round(aptScore * W_APT) });
    if (aptInfo.pts >= 8) signals.push(`Appart ${appart.trim()} r\xE9duit \xE0 ${aptReduced.v} \u2014 ${aptInfo.label}, vibration intime favorable`);
    if (aptInfo.pts <= 2) alerts.push(`Appart ${appart.trim()} r\xE9duit \xE0 ${aptReduced.v} \u2014 ${aptInfo.label}`);
  }
  const rueNum = calcStringNumber(rue);
  const rueBiz = ADDRESS_NUMBERS[rueNum.v] || { pts: 5, label: "Neutre" };
  const rueScore = Math.min(100, rueBiz.pts * 10);
  breakdown.push({ label: `"${rue}" \u2192 ${rueNum.v}`, value: rueBiz.label, pts: Math.round(rueScore * W_RUE) });
  let adresseGlobalNum;
  if (hasAppart) {
    adresseGlobalNum = numero ? reduce(numReduced.v + aptReduced.v + rueNum.v) : reduce(aptReduced.v + rueNum.v);
  } else {
    adresseGlobalNum = numero ? reduce(numReduced.v + rueNum.v) : rueNum;
  }
  const adresseSimple = adresseGlobalNum.v > 9 ? reduce(adresseGlobalNum.v).v : adresseGlobalNum.v;
  const cdvSimple = userCdv > 9 ? reduce(userCdv).v : userCdv;
  const compatRaw = getNameCdvCompat(adresseSimple, cdvSimple);
  const compatScore = compatRaw * 10;
  breakdown.push({ label: `R\xE9sonance adresse \xD7 Chemin de Vie ${userCdv}`, value: `${compatRaw}/10`, pts: Math.round(compatScore * W_CMP) });
  if (compatRaw >= 8) signals.push(`Excellente r\xE9sonance entre cette adresse et ton Chemin de Vie ${userCdv}`);
  else if (compatRaw <= 3) alerts.push(`Friction entre cette adresse et ton Chemin de Vie ${userCdv}`);
  const domainScore = Math.max(0, Math.min(100, Math.round(numScore * W_NUM + aptScore * W_APT + rueScore * W_RUE + compatScore * W_CMP)));
  if (numero) {
    const numVal = parseInt(numero);
    const addrKarmic = checkKarmicNumber(numVal);
    if (addrKarmic) {
      const kInfo = getKarmicDebt(addrKarmic, "adresse");
      breakdown.push({ label: kInfo.label, value: `N\xB0 ${numero}${suffixLabel}`, pts: 0 });
      alerts.push(kInfo.texte);
    }
  }
  if (numReduced.m) {
    const masterInfo = getMasterNarrative(numReduced.v, "adresse");
    if (masterInfo) signals.push(`${masterInfo.label} \u2014 ${masterInfo.texte}`);
  }
  const fsNum = numero ? numReduced.v > 9 ? reduce(numReduced.v).v : numReduced.v : adresseSimple;
  const fsInfo = FENG_SHUI_ELEMENTS[fsNum];
  if (fsInfo) {
    breakdown.push({ label: `Feng Shui : ${fsInfo.emoji} ${fsInfo.element}`, value: fsInfo.desc, pts: 0 });
    signals.push(`${fsInfo.emoji} ${fsInfo.element} \u2014 ${fsInfo.texte}`);
  }
  const numLabel = numero ? ADDRESS_NUMBERS[numReduced.v]?.label || "" : "";
  const numSens = numLabel ? numLabel.split("\u2014")[0].trim() : "";
  if (domainScore <= 35) {
    signals.push(`Vibration d\xE9licate pour ton profil \u2014 ${numSens ? `\xE9nergie de ${numSens.toLowerCase()}, ` : ""}la r\xE9sonance avec ton Chemin de Vie ${userCdv} invite \xE0 la prudence`);
  } else if (domainScore <= 50) {
    signals.push(`\xC9nergie contrast\xE9e pour ton Chemin de Vie ${userCdv} \u2014 ${numSens ? `lieu de ${numSens.toLowerCase()}, ` : ""}certains aspects r\xE9sonnent bien avec ton profil, d'autres moins`);
  } else if (domainScore <= 65) {
    signals.push(`Vibration \xE9quilibr\xE9e pour ton Chemin de Vie ${userCdv} \u2014 ${numSens ? `\xE9nergie de ${numSens.toLowerCase()}, ` : ""}l'adresse s'adapte \xE0 tes choix sans forcer ni freiner`);
  } else if (domainScore <= 80) {
    signals.push(`Bonne r\xE9sonance avec ton profil \u2014 ${numSens ? `lieu de ${numSens.toLowerCase()}, ` : ""}les vibrations de cette adresse soutiennent ton Chemin de Vie ${userCdv}`);
  } else {
    signals.push(`Adresse tr\xE8s harmonieuse \u2014 ${numSens ? `\xE9nergie de ${numSens.toLowerCase()}, ` : ""}excellente r\xE9sonance avec ton Chemin de Vie ${userCdv}`);
  }
  return { domainScore, breakdown, signals, alerts };
}
function calcOracleNumero(numStr, domain = "generaliste") {
  const signals = [];
  const alerts = [];
  const breakdown = [];
  const analysis = analyzeNumber(numStr);
  const redV = analysis.reduction.v;
  const bizInfo = NUMBER_SCORES[redV] || { pts: 5, label: "Neutre" };
  if (isMaster(redV)) {
    const masterInfo = getMasterNarrative(redV, "numero");
    signals.push(masterInfo ? `${masterInfo.label} \u2014 ${masterInfo.texte}` : `Nombre Ma\xEEtre ${redV} \u2014 vibration puissante`);
  }
  const digits = numStr.replace(/[^0-9]/g, "");
  const seqDamp = digits.length > 6 ? 0.3 : 1;
  const patternScore = Math.min(15, analysis.repeats + analysis.mirrors + Math.round(analysis.sequences * seqDamp));
  const chineseChars = ["\u516B", "\u56DB", "\u516D", "\u4E5D", "\u4E03", "\u4E8C"];
  const isChinese = (d) => chineseChars.some((c) => d.includes(c)) || d.includes("Yi Lu Fa");
  if (patternScore > 0) {
    analysis.details.filter((d) => !isChinese(d)).forEach((d) => signals.push(d));
  }
  const chineseNorm = Math.max(-15, Math.min(25, analysis.chineseBonus * 2));
  if (chineseNorm !== 0) {
    analysis.details.filter((d) => isChinese(d)).forEach((d) => {
      if (d.includes("Fortune") || d.includes("Fluidit\xE9") || d.includes("Long\xE9vit\xE9") || d.includes("Harmonie") || d.includes("Yi Lu Fa")) signals.push(d);
      else alerts.push(d);
    });
  }
  const domainScores = NUMBER_DOMAIN_SCORES[redV] || NUMBER_DOMAIN_SCORES[redV > 9 ? reduce(redV).v : redV];
  const redNorm = domain !== "generaliste" && domainScores ? domainScores[domain] * 10 : bizInfo.pts * 10;
  const patNorm = patternScore / 15 * 100;
  const chiNorm = (chineseNorm + 15) / 40 * 100;
  const blend = redNorm * 0.5 + patNorm * 0.25 + chiNorm * 0.25;
  const domainScore = Math.max(28, Math.min(95, Math.round(blend)));
  const redContrib = Math.round(redNorm * 0.5);
  const patContrib = Math.round(patNorm * 0.25);
  const chiContrib = Math.round(chiNorm * 0.25);
  const digitSum = digits.split("").reduce((s, d) => s + parseInt(d), 0);
  const reductionExplain = `Somme des chiffres = ${digitSum} \u2192 r\xE9duit \xE0 ${redV}`;
  const domainInfo = domain !== "generaliste" ? ORACLE_DOMAINS.find((d) => d.id === domain) : null;
  const domainLabel = domainInfo ? domainInfo.label : "G\xE9n\xE9raliste";
  const domainNote = domainScores ? domainScores[domain] : bizInfo.pts;
  if (domain !== "generaliste") {
    const domainDesc = NUMBER_DOMAIN_LABELS[redV]?.[domain] || bizInfo.label;
    breakdown.push({ label: `R\xE9duction \u2192 ${redV} (${domainLabel})`, value: `${reductionExplain}. ${domainDesc} \u2014 ${domainNote}/10`, pts: redContrib });
    if (domainNote >= 8) signals.push(`La vibration du ${redV} est excellente pour le secteur ${domainLabel}`);
    else if (domainNote <= 4) alerts.push(`La vibration du ${redV} est en d\xE9calage avec le secteur ${domainLabel} \u2014 \xE9nergie peu adapt\xE9e`);
  } else {
    breakdown.push({ label: `R\xE9duction \u2192 ${redV}`, value: `${reductionExplain}. ${bizInfo.label}`, pts: redContrib });
  }
  if (patternScore > 0) {
    const patParts = [];
    if (analysis.repeats > 0) patParts.push(`r\xE9p\xE9titions ${analysis.repeats}`);
    if (analysis.mirrors > 0) patParts.push(`miroir ${analysis.mirrors}`);
    if (analysis.sequences > 0) patParts.push(`suites ${analysis.sequences}${seqDamp < 1 ? " (amorties \xD7" + seqDamp + ")" : ""}`);
    const patExplain = patParts.length > 0 ? patParts.join(" + ") + " \u2192 " : "";
    breakdown.push({ label: "Patterns", value: `${patExplain}${patternScore}/15`, pts: patContrib });
  }
  if (chineseNorm !== 0) {
    const chiDetails = [];
    const digitCounts = {};
    for (const d of digits) {
      const n = parseInt(d);
      digitCounts[n] = (digitCounts[n] || 0) + 1;
    }
    for (const [digit, count] of Object.entries(digitCounts)) {
      const d = parseInt(digit);
      const info = CHINESE_DIGIT_BONUS[d];
      if (info && info.pts !== 0) {
        const sign = info.pts > 0 ? "+" : "";
        chiDetails.push(`${d}\xD7${count} (${sign}${info.pts * count})`);
      }
    }
    if (digits.includes("168")) chiDetails.push("168 (+10)");
    const chiExplain = chiDetails.length > 0 ? chiDetails.join(", ") : "";
    breakdown.push({ label: "Tradition chinoise", value: `${chiExplain} = ${chineseNorm > 0 ? "+" : ""}${chineseNorm}`, pts: chiContrib });
  }
  const numKarmic = checkKarmicNumber(analysis.rawSum);
  if (numKarmic) {
    const kInfo = getKarmicDebt(numKarmic, "numero");
    breakdown.push({ label: kInfo.label, value: `Somme des chiffres = ${analysis.rawSum}`, pts: 0 });
    alerts.push(kInfo.texte);
  }
  return { domainScore, breakdown, signals, alerts };
}
function calcOracleSujet(sujet, domainScoreFromConvergence, userCdv, userBirthDay, userBirthMonth) {
  const signals = [];
  const alerts = [];
  const breakdown = [];
  const info = SUJETS[sujet];
  breakdown.push({ label: `${info.icon} ${info.label}`, value: `Score domaine ${info.dominantDomain}`, pts: domainScoreFromConvergence });
  if (userBirthDay && userBirthMonth && userCdv) {
    const now = /* @__PURE__ */ new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const anneePerso = reduce(userBirthDay + userBirthMonth + year);
    const moisPerso = reduce(anneePerso.v + month);
    const jourPerso = reduce(moisPerso.v + day);
    const AP_DESC = {
      1: "Ann\xE9e de nouveaux d\xE9parts",
      2: "Ann\xE9e de patience et diplomatie",
      3: "Ann\xE9e d'expression cr\xE9ative",
      4: "Ann\xE9e de construction",
      5: "Ann\xE9e de changement",
      6: "Ann\xE9e de responsabilit\xE9 familiale",
      7: "Ann\xE9e d'introspection",
      8: "Ann\xE9e de r\xE9colte et pouvoir",
      9: "Ann\xE9e de bilan et l\xE2cher-prise",
      11: "Ann\xE9e d'illumination",
      22: "Ann\xE9e de grands projets",
      33: "Ann\xE9e de service"
    };
    breakdown.push({ label: `Ann\xE9e personnelle : ${anneePerso.v}`, value: AP_DESC[anneePerso.v] || "Cycle en cours", pts: 0 });
    breakdown.push({ label: `Jour personnel : ${jourPerso.v}`, value: `MP${moisPerso.v} \u2192 JP${jourPerso.v}`, pts: 0 });
    const AP_SUJET_BOOST = {
      projet: [1, 8, 22],
      sentiments: [2, 6, 33],
      partenariat: [2, 6, 11],
      investissement: [4, 8, 22],
      voyage: [5, 9],
      presentation: [3, 5, 11],
      changement: [5, 9, 1]
    };
    if (AP_SUJET_BOOST[sujet]?.includes(anneePerso.v)) {
      signals.push(`Ton Ann\xE9e Personnelle ${anneePerso.v} (${AP_DESC[anneePerso.v]}) est favorable pour ${info.label.toLowerCase()}`);
    }
  }
  if (domainScoreFromConvergence >= 75) signals.push(`${info.icon} ${info.label} \u2014 domaine ${info.dominantDomain} en zone haute`);
  else if (domainScoreFromConvergence < 40) alerts.push(`${info.icon} ${info.label} \u2014 domaine ${info.dominantDomain} sous tension`);
  return { domainScore: domainScoreFromConvergence, breakdown, signals, alerts };
}
var BABY_NUMBERS = {
  1: { harmony: 6, label: "Ind\xE9pendance", traits: `Confiance en soi, leadership naturel \u2014 peut cr\xE9er de l'isolement si mal accompagn\xE9` },
  2: { harmony: 9, label: "Harmonie", traits: `Sensibilit\xE9, empathie, coop\xE9ration \u2014 un des plus \xE9panouissants pour un enfant` },
  3: { harmony: 9, label: "Expression", traits: `Cr\xE9ativit\xE9, joie de vivre, communication naturelle \u2014 tr\xE8s \xE9panouissant` },
  4: { harmony: 7, label: "Stabilit\xE9", traits: `M\xE9thode, pers\xE9v\xE9rance, structure rassurante \u2014 peut \xEAtre anxiog\xE8ne sans accompagnement` },
  5: { harmony: 8, label: "Libert\xE9", traits: `Curiosit\xE9, adaptabilit\xE9, soif de d\xE9couverte \u2014 tr\xE8s bon pour un enfant` },
  6: { harmony: 9, label: "Amour", traits: `Sens de la famille, g\xE9n\xE9rosit\xE9, attachement profond \u2014 le plus harmonieux pour un enfant` },
  7: { harmony: 6, label: "Sagesse", traits: `Intuition, int\xE9riorit\xE9, don pour la r\xE9flexion \u2014 risque de retrait \xE9motionnel` },
  8: { harmony: 5, label: "Puissance", traits: `Volont\xE9 forte, le\xE7ons de karma pr\xE9coces \u2014 le plus lourd \xE0 porter pour un enfant` },
  9: { harmony: 8, label: "Id\xE9alisme", traits: `Compassion, g\xE9n\xE9rosit\xE9, vision universelle \u2014 tr\xE8s beau pour un enfant` },
  11: { harmony: 8, label: "Intuition Ma\xEEtre", traits: `Sensibilit\xE9 extr\xEAme, don artistique \u2014 attention aux surcharges \xE9motionnelles` },
  22: { harmony: 7, label: "B\xE2tisseur Ma\xEEtre", traits: `Potentiel immense, mais charge lourde \u2014 peut \xEAtre \xE9crasant pour un jeune enfant` },
  33: { harmony: 9, label: "Gu\xE9risseur Ma\xEEtre", traits: `Amour universel, vocation de service \u2014 le plus \xE9lev\xE9, id\xE9al pour un enfant` }
};
var BABY_COMPAT = {
  1: { 1: 6, 2: 8, 3: 9, 4: 6, 5: 8, 6: 7, 7: 5, 8: 6, 9: 8, 11: 7, 22: 6, 33: 8 },
  2: { 1: 8, 2: 8, 3: 8, 4: 7, 5: 6, 6: 9, 7: 7, 8: 6, 9: 8, 11: 8, 22: 7, 33: 9 },
  3: { 1: 9, 2: 8, 3: 8, 4: 5, 5: 9, 6: 8, 7: 6, 8: 7, 9: 9, 11: 8, 22: 7, 33: 9 },
  4: { 1: 6, 2: 7, 3: 5, 4: 7, 5: 5, 6: 8, 7: 7, 8: 9, 9: 5, 11: 6, 22: 8, 33: 6 },
  5: { 1: 8, 2: 6, 3: 9, 4: 5, 5: 7, 6: 6, 7: 8, 8: 6, 9: 8, 11: 7, 22: 6, 33: 7 },
  6: { 1: 7, 2: 9, 3: 8, 4: 8, 5: 6, 6: 9, 7: 5, 8: 6, 9: 9, 11: 8, 22: 7, 33: 9 },
  7: { 1: 5, 2: 7, 3: 6, 4: 7, 5: 8, 6: 5, 7: 8, 8: 5, 9: 6, 11: 9, 22: 7, 33: 8 },
  8: { 1: 6, 2: 6, 3: 7, 4: 9, 5: 6, 6: 6, 7: 5, 8: 5, 9: 7, 11: 6, 22: 9, 33: 6 },
  9: { 1: 8, 2: 8, 3: 9, 4: 5, 5: 8, 6: 9, 7: 6, 8: 7, 9: 8, 11: 8, 22: 7, 33: 9 },
  11: { 1: 7, 2: 8, 3: 8, 4: 6, 5: 7, 6: 8, 7: 9, 8: 6, 9: 8, 11: 8, 22: 7, 33: 9 },
  22: { 1: 6, 2: 7, 3: 7, 4: 8, 5: 6, 6: 7, 7: 7, 8: 9, 9: 7, 11: 7, 22: 8, 33: 7 },
  33: { 1: 8, 2: 9, 3: 9, 4: 6, 5: 7, 6: 9, 7: 8, 8: 6, 9: 9, 11: 9, 22: 7, 33: 9 }
};
function getBabyParentCompat(babyNum, parentCdv) {
  const row = BABY_COMPAT[parentCdv] ?? BABY_COMPAT[9];
  return row[babyNum] ?? 6;
}
function calcOracleBebe(prenom, userCdv, parent2Cdv) {
  if (!prenom || normalizeStr(prenom).length === 0) {
    return { domainScore: 0, breakdown: [], signals: [], alerts: ["\u26A0\uFE0F Aucun pr\xE9nom saisi \u2014 la num\xE9rologie ne peut pas s'appliquer."] };
  }
  const signals = [];
  const alerts = [];
  const breakdown = [];
  const nums = calcNameNumbers(prenom);
  const exprV = nums.expression.v;
  const ameV = nums.ame.v;
  const imageV = nums.image.v;
  const babyInfo = BABY_NUMBERS[exprV] || { harmony: 6, label: "Neutre", traits: `\xC9nergie \xE9quilibr\xE9e` };
  const harmonyPts = babyInfo.harmony * 10;
  breakdown.push({ label: `Vibration du pr\xE9nom : ${exprV}`, value: babyInfo.label, pts: harmonyPts });
  breakdown.push({ label: `\xC9lan du c\u0153ur (\xC2me) : ${ameV}${nums.ame.m ? " Ma\xEEtre" : ""}`, value: AME_DESC[ameV] || "Motivation profonde", pts: 0 });
  breakdown.push({ label: `Image per\xE7ue : ${imageV}${nums.image.m ? " Ma\xEEtre" : ""}`, value: IMAGE_DESC[imageV] || "Apparence ext\xE9rieure", pts: 0 });
  signals.push(`${babyInfo.traits}`);
  const compat1 = getBabyParentCompat(exprV, userCdv);
  let compatScore;
  if (parent2Cdv != null && parent2Cdv > 0) {
    const compat2 = getBabyParentCompat(exprV, parent2Cdv);
    compatScore = (compat1 + compat2) / 2;
    breakdown.push({ label: `R\xE9sonance parent 1 (Chemin de Vie ${userCdv})`, value: `${compat1}/10`, pts: 0 });
    breakdown.push({ label: `R\xE9sonance parent 2 (Chemin de Vie ${parent2Cdv})`, value: `${compat2}/10`, pts: 0 });
  } else {
    compatScore = compat1;
  }
  const compatPts = Math.round(compatScore * 3);
  breakdown.push({ label: parent2Cdv ? "R\xE9sonance parentale" : `R\xE9sonance parentale (Chemin de Vie ${userCdv})`, value: `${Math.round(compatScore * 10) / 10}/10`, pts: compatPts });
  if (compatScore >= 8) signals.push(`Tr\xE8s bonne r\xE9sonance entre "${prenom}" et ${parent2Cdv ? "ton" : "ton"} \xE9nergie parentale \u2014 lien naturel et fluide`);
  else if (compatScore <= 4) alerts.push(`L\xE9g\xE8re friction avec ${parent2Cdv ? "tes profils" : `ton Chemin de Vie ${userCdv}`} \u2014 l'enfant suivra son propre chemin avec force`);
  let masterBonus = 0;
  if (nums.expression.m) {
    masterBonus = 8;
    const masterInfo = getMasterNarrative(exprV, "bebe");
    signals.push(masterInfo ? `${masterInfo.label} \u2014 ${masterInfo.texte}` : `Nombre Ma\xEEtre ${exprV} \u2014 destin exceptionnel, sensibilit\xE9 et charge \xE9lev\xE9es`);
  }
  if (ameV === 2 || ameV === 6) {
    signals.push(`\xC2me ${ameV} \u2014 enfant profond\xE9ment attach\xE9, besoin de s\xE9curit\xE9 affective fort`);
  }
  if (imageV === 1 || imageV === 8) {
    signals.push(`Image ${imageV} \u2014 caract\xE8re affirm\xE9, besoin d'autonomie pr\xE9coce`);
  }
  let soulBonus = 0;
  const soulCompat1 = getBabyParentCompat(ameV, userCdv);
  if (parent2Cdv != null && parent2Cdv > 0) {
    const soulCompat2 = getBabyParentCompat(ameV, parent2Cdv);
    if (soulCompat1 >= 8 && soulCompat2 >= 8) {
      soulBonus = 5;
      signals.push(`\xC2me du pr\xE9nom (${ameV}) en forte r\xE9sonance avec tes deux Chemins de Vie \u2014 lien affectif profond des deux c\xF4t\xE9s`);
    } else if (soulCompat1 >= 8 || soulCompat2 >= 8) {
      soulBonus = 3;
      const resonantParent = soulCompat1 >= 8 ? `Chemin de Vie ${userCdv}` : `Chemin de Vie ${parent2Cdv}`;
      signals.push(`\xC2me du pr\xE9nom (${ameV}) en r\xE9sonance avec ${resonantParent} \u2014 lien affectif avec un parent`);
    }
  } else {
    if (soulCompat1 >= 8) {
      soulBonus = 5;
      signals.push(`\xC2me du pr\xE9nom (${ameV}) en forte r\xE9sonance avec ton Chemin de Vie ${userCdv} \u2014 lien affectif profond`);
    }
  }
  const bebeExprKarmic = checkKarmicNumber(nums.rawSums.expr);
  const bebeAmeKarmic = checkKarmicNumber(nums.rawSums.ame);
  if (bebeExprKarmic) {
    const kInfo = getKarmicDebt(bebeExprKarmic, "bebe");
    breakdown.push({ label: `${kInfo.label}`, value: `Vibration du pr\xE9nom : somme ${nums.rawSums.expr} \u2192 ${exprV}`, pts: 0 });
    alerts.push(kInfo.texte);
  }
  if (bebeAmeKarmic) {
    const kInfo = getKarmicDebt(bebeAmeKarmic, "bebe");
    breakdown.push({ label: `${kInfo.label}`, value: `\xC9lan du c\u0153ur (voyelles) : somme ${nums.rawSums.ame} \u2192 ${ameV}`, pts: 0 });
    alerts.push(kInfo.texte);
  }
  const bebeLessons = findKarmicLessons(prenom);
  if (bebeLessons.length > 0 && bebeLessons.length <= 4) {
    const lessonDetails = bebeLessons.map((n) => {
      const l = getKarmicLesson(n, "bebe");
      return `${n} (${l.label.split(" \u2014 ")[1] || l.label})`;
    }).join(", ");
    breakdown.push({ label: "Le\xE7ons karmiques (lettres manquantes)", value: lessonDetails, pts: 0 });
    bebeLessons.forEach((n) => {
      const l = getKarmicLesson(n, "bebe");
      alerts.push(l.texte);
    });
  }
  const rawBebeScore = harmonyPts + compatPts + masterBonus + soulBonus;
  const domainScore = Math.max(0, Math.min(100, Math.round(rawBebeScore / 128 * 100)));
  return { domainScore, breakdown, signals, alerts };
}
function calcOracle(params) {
  const { type, input, sujet = null, domain = "generaliste", dailyScore, userCdv = 5, domainScoreFromConvergence = 50, targetDate, userBirthDay = 1, userBirthMonth = 1, parent2Cdv, appart } = params;
  let result;
  switch (type) {
    case "date":
      result = calcOracleDate(targetDate || input, dailyScore, userCdv, userBirthDay, userBirthMonth);
      break;
    case "nom":
      result = calcOracleNom(input, userCdv, domain);
      break;
    case "adresse":
      result = calcOracleAdresse(input, userCdv, appart);
      break;
    case "numero":
      result = calcOracleNumero(input, domain);
      break;
    case "sujet":
      result = calcOracleSujet(sujet || "projet", domainScoreFromConvergence, userCdv, userBirthDay, userBirthMonth);
      break;
    case "bebe":
      result = calcOracleBebe(input, userCdv, parent2Cdv);
      break;
    default:
      result = { domainScore: 50, breakdown: [], signals: [], alerts: [] };
  }
  const permanentTypes = ["bebe", "date", "nom", "adresse", "numero"];
  let oracleScore = permanentTypes.includes(type) || type === "sujet" ? result.domainScore : Math.round(dailyScore * 0.25 + result.domainScore * 0.75);
  let mercuryCapped = false;
  let mercuryMalus = 0;
  let mercuryNarrative = "";
  const now = /* @__PURE__ */ new Date();
  const mercRetro = isMercuryRetrograde(now);
  const effectiveSujet = type === "bebe" ? null : sujet || (type === "nom" ? "projet" : null);
  if (mercRetro && effectiveSujet) {
    const sujetInfo = SUJETS[effectiveSujet];
    if (sujetInfo?.mercurySensitive) {
      const MR_MALUS = {
        projet: 12,
        partenariat: 12,
        investissement: 10,
        voyage: 10,
        changement: 6,
        presentation: 6
      };
      mercuryMalus = MR_MALUS[effectiveSujet] ?? 8;
      oracleScore = Math.max(0, oracleScore - mercuryMalus);
      mercuryCapped = true;
      mercuryNarrative = MERCURY_RETRO_NARRATIVES[effectiveSujet] || MERCURY_RETRO_INTRO;
    }
  }
  oracleScore = Math.max(0, Math.min(100, oracleScore));
  let verdict = getVerdict(oracleScore, type === "bebe" ? null : effectiveSujet);
  if (type === "bebe") {
    const BABY_VERDICT_MAP = {
      feu_vert: { icon: "\u{1F31F}", label: "Pr\xE9nom harmonieux", color: "#4ade80", texte: `Ce pr\xE9nom r\xE9sonne avec fluidit\xE9 avec ton \xE9nergie parentale. L'enfant portera ce nom avec aisance naturelle.` },
      prudence: { icon: "\u2728", label: "Pr\xE9nom \xE9quilibr\xE9", color: "#f59e0b", texte: `Ce pr\xE9nom apporte une \xE9nergie neutre et solide. Bon choix si tu l'aimes \u2014 le c\u0153ur prime toujours.` },
      pas_maintenant: { icon: "\u26A1", label: "Pr\xE9nom en tension", color: "#a78bfa", texte: `Ce pr\xE9nom cr\xE9e une l\xE9g\xE8re friction \xE9nerg\xE9tique. L'enfant construira sa propre voie avec d\xE9termination.` }
    };
    verdict = { verdict: verdict.verdict, ...BABY_VERDICT_MAP[verdict.verdict] };
  }
  if (["nom", "adresse", "numero", "date"].includes(type)) {
    const INTRINSIC_VERDICT_MAP = {
      feu_vert: { icon: "\u2705", label: "Vibration favorable", color: "#4ade80", texte: `Excellente r\xE9sonance avec ton profil. Cette vibration soutient tes objectifs avec fluidit\xE9.` },
      prudence: { icon: "\u26A0\uFE0F", label: "Vibration neutre", color: "#f59e0b", texte: `R\xE9sonance mod\xE9r\xE9e avec ton profil. Ni un frein ni un moteur \u2014 l'\xE9nergie est correcte sans \xEAtre exceptionnelle.` },
      pas_maintenant: { icon: "\u{1F53B}", label: "Vibration d\xE9licate", color: "#a78bfa", texte: `Faible r\xE9sonance avec ton profil. Cette vibration ne soutient pas naturellement tes objectifs \u2014 ce n'est pas un blocage, mais un manque de synergie.` }
    };
    verdict = { verdict: verdict.verdict, ...INTRINSIC_VERDICT_MAP[verdict.verdict] };
  }
  const ds = result.domainScore;
  const intrinsicVerdict = ds >= 70 ? { label: "Bonne compatibilit\xE9", color: "#4ade80", icon: "\u2726" } : ds >= 45 ? { label: "Compatibilit\xE9 neutre", color: "#f59e0b", icon: "\u25C6" } : { label: "Compatibilit\xE9 faible", color: "#a78bfa", icon: "\u25C7" };
  let bestDates = [];
  if (type === "sujet" && result.domainScore > 0) {
    bestDates = findBestDates(result.domainScore, userCdv, userBirthDay, userBirthMonth, effectiveSujet);
  }
  return {
    type,
    input,
    sujet: effectiveSujet,
    domain: type === "nom" || type === "numero" ? domain : null,
    domainScore: result.domainScore,
    dailyScore,
    oracleScore,
    mercuryCapped,
    mercuryMalus,
    mercuryNarrative,
    verdict,
    intrinsicVerdict,
    bestDates,
    breakdown: result.breakdown,
    signals: result.signals,
    alerts: result.alerts
  };
}
function findBestDates(domainScore, userCdv, userBirthDay, userBirthMonth, sujet) {
  const today = /* @__PURE__ */ new Date();
  const candidates = [];
  for (let i = 1; i <= 60; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const vibDate = reduce(day + month + year);
    const vibInfo = DATE_VIBRATION_QUALITY[vibDate.v] || { pts: 5, label: "Neutre" };
    const vibScore = vibInfo.pts * 10;
    const vibSimple = vibDate.v > 9 ? reduce(vibDate.v).v : vibDate.v;
    const cdvSimple = userCdv > 9 ? reduce(userCdv).v : userCdv;
    const compatRaw = getNameCdvCompat(vibSimple, cdvSimple);
    const anneePerso = reduce(userBirthDay + userBirthMonth + year);
    const moisPerso = reduce(anneePerso.v + month);
    const jourPerso = reduce(moisPerso.v + day);
    const jourPersoSimple = jourPerso.v > 9 ? reduce(jourPerso.v).v : jourPerso.v;
    const cycleCompat = getNameCdvCompat(jourPersoSimple, vibSimple);
    const estimatedDaily = 0.4 * vibScore + 0.3 * (compatRaw * 10) + 0.3 * (cycleCompat * 10);
    let preciseScore = estimatedDaily;
    const mercRetro = isMercuryRetrograde(d);
    let hasMercury = false;
    if (mercRetro && sujet) {
      const sujetInfo = SUJETS[sujet];
      if (sujetInfo?.mercurySensitive) {
        const MR_MALUS = { projet: 12, partenariat: 12, investissement: 10, voyage: 10, changement: 6, presentation: 6 };
        preciseScore = Math.max(0, preciseScore - (MR_MALUS[sujet] ?? 8));
        hasMercury = true;
      }
    }
    const jours = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
    const moisNoms = ["", "Jan", "F\xE9v", "Mar", "Avr", "Mai", "Juin", "Juil", "Ao\xFBt", "Sep", "Oct", "Nov", "D\xE9c"];
    const label = `${jours[d.getDay()]} ${day} ${moisNoms[month]}`;
    candidates.push({
      date: dateStr,
      label,
      estimatedScore: Math.round(preciseScore),
      preciseScore,
      vibLabel: `Vib. ${vibDate.v}${vibDate.m ? " Ma\xEEtre" : ""} \u2014 ${vibInfo.label}`,
      vibNum: vibDate.v,
      jourPerso: jourPerso.v,
      mercury: hasMercury,
      dailyScore: Math.round(estimatedDaily)
    });
  }
  candidates.sort((a, b) => b.preciseScore - a.preciseScore || b.dailyScore - a.dailyScore);
  const selected = [];
  const vibsSeen = /* @__PURE__ */ new Set();
  for (const c of candidates) {
    if (selected.length >= 3) break;
    if (selected.length < 2) {
      selected.push(c);
      vibsSeen.add(c.vibNum);
    } else {
      if (!vibsSeen.has(c.vibNum)) {
        selected.push(c);
        vibsSeen.add(c.vibNum);
      }
    }
  }
  if (selected.length < 3) {
    for (const c of candidates) {
      if (selected.length >= 3) break;
      if (!selected.includes(c)) {
        selected.push(c);
      }
    }
  }
  selected.sort((a, b) => b.preciseScore - a.preciseScore || b.dailyScore - a.dailyScore);
  return selected.map((c) => ({
    date: c.date,
    label: c.label,
    estimatedScore: c.estimatedScore,
    vibLabel: c.vibLabel,
    jourPerso: c.jourPerso,
    mercury: c.mercury,
    dailyScore: c.dailyScore
  }));
}

// tests/simulation-oracle.ts
var DOMAINS = ["generaliste", "commerce", "creatif", "humain", "spirituel", "tech"];
var SUJETS2 = ["projet", "sentiments", "partenariat", "investissement", "voyage", "presentation", "changement"];
var TEST_NAMES = [
  "KAIRONAUTE",
  "ZENITH",
  "SOLARIS",
  "LUMINA",
  "NEXUS",
  "ABC",
  "ZZZ",
  "AEIOU",
  // voyelles only, consonnes only
  "MARIE",
  "JEROME",
  "PIERRE",
  "JEAN",
  "SOPHIE",
  "CONSTELLATION",
  "HARMONIE",
  "INFINI",
  "ORACLE",
  "LE PETIT PRINCE",
  "LA BELLE \xC9TOILE",
  // avec accents et espaces
  "A",
  "AA",
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  // courts et longs
  "ENTREPRISE G\xC9N\xC9RALE",
  "CAF\xC9 DES ARTS",
  "L'ATELIER"
];
var TEST_DATES = [
  "2026-03-26",
  "2026-04-01",
  "2026-06-21",
  "2026-09-23",
  "2026-12-25",
  "2026-01-01",
  "2026-07-14",
  "2026-11-11",
  "2026-02-14",
  "2026-08-15",
  "2027-01-01",
  "2027-06-15",
  "2025-12-31"
];
var TEST_ADDRESSES = [
  "12 rue de la Paix",
  "1 avenue des Champs-\xC9lys\xE9es",
  "33 boulevard Victor Hugo",
  "7 place de la R\xE9publique",
  "22 impasse des Lilas",
  "4 rue du Ch\xE2teau",
  "100 route de Lyon",
  "8 all\xE9e des Cerisiers",
  "15 chemin du Moulin",
  "42 rue de Rivoli"
];
var TEST_NUMBERS = [
  "0612345678",
  "0600000000",
  "0688888888",
  "0644444444",
  "123456789",
  "111111",
  "987654321",
  "0147258369",
  "33612345678",
  "0033612345678",
  "12345",
  "9876543210",
  "0606060606",
  "80080080",
  "44444444"
];
var TEST_BABY_NAMES = [
  "L\xC9ON",
  "JADE",
  "GABRIEL",
  "EMMA",
  "RAPHA\xCBL",
  "LOUISE",
  "ADAM",
  "ALICE",
  "NOAH",
  "L\xC9A",
  "MA\xCBL",
  "IN\xC8S",
  "SACHA",
  "ROSE",
  "ETHAN"
];
var CDVS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33];
var ORTHO_PATTERNS = [
  { pattern: /\bvous\b(?! (deux|même))/i, msg: 'Vouvoiement "vous"' },
  { pattern: /\bvotre\b/i, msg: 'Vouvoiement "votre"' },
  { pattern: /\bvos\b(?! deux)/i, msg: 'Vouvoiement "vos"' },
  { pattern: /Peach Blossom/i, msg: '"Peach Blossom" non francis\xE9' },
  { pattern: /\bCdV\b/, msg: '"CdV" non d\xE9velopp\xE9' },
  { pattern: /médiane 68/, msg: '"m\xE9diane 68" incorrecte' },
  { pattern: /Choisissez/i, msg: 'Vouvoiement "Choisissez"' },
  { pattern: /Utilisez/i, msg: 'Vouvoiement "Utilisez"' },
  { pattern: /Protégez/i, msg: 'Vouvoiement "Prot\xE9gez"' },
  { pattern: /donnez/i, msg: 'Vouvoiement "donnez"' },
  { pattern: /pensez/i, msg: 'Vouvoiement "pensez"' },
  { pattern: /honorez/i, msg: 'Vouvoiement "honorez"' },
  { pattern: /préparez/i, msg: 'Vouvoiement "pr\xE9parez"' },
  { pattern: /agissez/i, msg: 'Vouvoiement "agissez"' },
  { pattern: /basez/i, msg: 'Vouvoiement "basez"' }
];
var errors = [];
var totalTests = 0;
var verdictCoverage = {};
var scoreBuckets = {};
function collectAllTexts(r) {
  return [
    r.verdict?.texte || "",
    r.verdict?.label || "",
    r.mercuryNarrative || "",
    r.intrinsicVerdict?.label || "",
    ...r.signals,
    ...r.alerts,
    ...(r.breakdown || []).map((b) => b.label || ""),
    ...(r.breakdown || []).map((b) => b.detail || ""),
    ...(r.bestDates || []).map((d) => d.label || ""),
    ...(r.bestDates || []).map((d) => d.narrative || "")
  ].filter(Boolean);
}
function checkResult(r, type, input) {
  const base = { type, input, score: r.oracleScore };
  if (r.oracleScore < 0 || r.oracleScore > 100) {
    errors.push({ ...base, category: "RANGE", message: `Score hors limites: ${r.oracleScore}` });
  }
  if (r.domainScore < 0 || r.domainScore > 100) {
    errors.push({ ...base, category: "RANGE", message: `Domain score hors limites: ${r.domainScore}` });
  }
  const expectedVerdict = r.oracleScore >= 75 ? "feu_vert" : r.oracleScore >= 48 ? "prudence" : "pas_maintenant";
  if (r.verdict.verdict !== expectedVerdict) {
    errors.push({
      ...base,
      category: "VERDICT",
      message: `Score ${r.oracleScore}% \u2192 attendu "${expectedVerdict}", obtenu "${r.verdict.verdict}"`
    });
  }
  if (r.intrinsicVerdict) {
    const ds = r.domainScore;
    const expectedIntrinsic = ds >= 70 ? "\u2726" : ds >= 45 ? "\u25C6" : "\u25C7";
    if (r.intrinsicVerdict.icon && !["\u2726", "\u25C6", "\u25C7", "\u2705", "\u26A0\uFE0F", "\u{1F53B}"].includes(r.intrinsicVerdict.icon)) {
      errors.push({
        ...base,
        category: "INTRINSIC",
        message: `Ic\xF4ne intrinsic inconnue: "${r.intrinsicVerdict.icon}"`
      });
    }
  }
  if (!r.verdict.texte || r.verdict.texte.length < 10) {
    errors.push({
      ...base,
      category: "VERDICT",
      message: `Verdict texte vide ou trop court: "${r.verdict.texte}"`
    });
  }
  if (!r.breakdown || r.breakdown.length === 0) {
    errors.push({
      ...base,
      category: "BREAKDOWN",
      message: `Breakdown vide`
    });
  }
  const allTexts = collectAllTexts(r);
  for (const text of allTexts) {
    for (const { pattern, msg } of ORTHO_PATTERNS) {
      if (pattern.test(text)) {
        if (/\bvous\b/i.test(text) && /(entre vous|chez vous|rendez-vous|de vous deux)/.test(text)) continue;
        errors.push({
          ...base,
          category: "ORTHO",
          message: `${msg} dans: "${text.slice(0, 120)}..."`
        });
      }
    }
  }
  if (r.mercuryCapped && r.mercuryMalus === 0) {
    errors.push({
      ...base,
      category: "MERCURY",
      message: `mercuryCapped=true mais mercuryMalus=0`
    });
  }
  const vKey = type;
  if (!verdictCoverage[vKey]) verdictCoverage[vKey] = /* @__PURE__ */ new Set();
  verdictCoverage[vKey].add(r.verdict.verdict);
  if (!scoreBuckets[type]) scoreBuckets[type] = {};
  const bucket = Math.floor(r.oracleScore / 10) * 10;
  scoreBuckets[type][bucket] = (scoreBuckets[type][bucket] || 0) + 1;
  totalTests++;
}
console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550");
console.log("  SIMULATION EXHAUSTIVE \u2014 ORACLE DES CHOIX");
console.log("\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\n");
console.log("Testing NOM/MARQUE...");
for (const name of TEST_NAMES) {
  for (const domain of DOMAINS) {
    for (const cdv of [2, 5, 7, 9]) {
      try {
        const r = calcOracle({
          type: "nom",
          input: name,
          domain,
          dailyScore: 65,
          userCdv: cdv
        });
        checkResult(r, "nom", `${name}/${domain}/cdv${cdv}`);
      } catch (e) {
        errors.push({ type: "nom", input: name, category: "CRASH", message: e.message });
      }
    }
  }
}
console.log("Testing DATE...");
for (const date of TEST_DATES) {
  for (const cdv of CDVS) {
    try {
      const r = calcOracle({
        type: "date",
        input: date,
        targetDate: date,
        dailyScore: 65,
        userCdv: cdv,
        userBirthDay: 23,
        userBirthMonth: 9
      });
      checkResult(r, "date", `${date}/cdv${cdv}`);
    } catch (e) {
      errors.push({ type: "date", input: date, category: "CRASH", message: e.message });
    }
  }
}
console.log("Testing ADRESSE...");
for (const addr of TEST_ADDRESSES) {
  for (const cdv of [1, 4, 7, 11]) {
    for (const appart of [void 0, "3", "11", "22"]) {
      try {
        const r = calcOracle({
          type: "adresse",
          input: addr,
          dailyScore: 65,
          userCdv: cdv,
          appart
        });
        checkResult(r, "adresse", `${addr}${appart ? `/apt${appart}` : ""}/cdv${cdv}`);
      } catch (e) {
        errors.push({ type: "adresse", input: addr, category: "CRASH", message: e.message });
      }
    }
  }
}
console.log("Testing NUM\xC9RO...");
for (const num of TEST_NUMBERS) {
  for (const domain of DOMAINS) {
    try {
      const r = calcOracle({
        type: "numero",
        input: num,
        domain,
        dailyScore: 65,
        userCdv: 7
      });
      checkResult(r, "numero", `${num}/${domain}`);
    } catch (e) {
      errors.push({ type: "numero", input: num, category: "CRASH", message: e.message });
    }
  }
}
console.log("Testing SUJET...");
for (const sujet of SUJETS2) {
  for (const dailyScore of [20, 40, 55, 70, 85]) {
    for (const convergenceScore of [30, 50, 65, 80, 95]) {
      try {
        const r = calcOracle({
          type: "sujet",
          input: sujet,
          sujet,
          dailyScore,
          domainScoreFromConvergence: convergenceScore,
          userCdv: 7,
          userBirthDay: 23,
          userBirthMonth: 9
        });
        checkResult(r, "sujet", `${sujet}/daily${dailyScore}/conv${convergenceScore}`);
      } catch (e) {
        errors.push({ type: "sujet", input: sujet, category: "CRASH", message: e.message });
      }
    }
  }
}
console.log("Testing B\xC9B\xC9...");
for (const name of TEST_BABY_NAMES) {
  for (const cdv of [1, 3, 5, 7, 9, 11]) {
    for (const p2cdv of [void 0, 2, 6, 8]) {
      try {
        const r = calcOracle({
          type: "bebe",
          input: name,
          dailyScore: 65,
          userCdv: cdv,
          parent2Cdv: p2cdv
        });
        checkResult(r, "bebe", `${name}/cdv${cdv}${p2cdv ? `/p2cdv${p2cdv}` : ""}`);
      } catch (e) {
        errors.push({ type: "bebe", input: name, category: "CRASH", message: e.message });
      }
    }
  }
}
console.log(`
Tests ex\xE9cut\xE9s: ${totalTests}`);
console.log(`Erreurs trouv\xE9es: ${errors.length}`);
if (errors.length > 0) {
  const byCategory = {};
  for (const e of errors) {
    if (!byCategory[e.category]) byCategory[e.category] = [];
    byCategory[e.category].push(e);
  }
  for (const [cat, errs] of Object.entries(byCategory).sort()) {
    console.log(`
\u2550\u2550 ${cat} (${errs.length} erreur${errs.length > 1 ? "s" : ""}) \u2550\u2550`);
    const seen = /* @__PURE__ */ new Set();
    for (const e of errs) {
      const key = `${e.type}:${e.message}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const count = errs.filter((x) => `${x.type}:${x.message}` === key).length;
      console.log(`  [${e.type}] ${e.message}${count > 1 ? ` (\xD7${count})` : ""}`);
    }
  }
} else {
  console.log("\n\u2705 AUCUNE ERREUR D\xC9TECT\xC9E");
}
console.log("\n\n\u2550\u2550 COUVERTURE DES VERDICTS \u2550\u2550");
for (const [type, verdicts] of Object.entries(verdictCoverage).sort()) {
  const all3 = ["feu_vert", "prudence", "pas_maintenant"];
  console.log(`${type}: ${[...verdicts].join(", ")} (${verdicts.size}/3)`);
  for (const v of all3) {
    console.log(`  ${verdicts.has(v) ? "\u2705" : "\u274C"} ${v}`);
  }
}
console.log("\n\n\u2550\u2550 DISTRIBUTION DES SCORES \u2550\u2550");
for (const [type, buckets] of Object.entries(scoreBuckets).sort()) {
  console.log(`
${type.toUpperCase()}:`);
  for (let b = 0; b <= 90; b += 10) {
    const count = buckets[b] || 0;
    const bar = "\u2588".repeat(Math.min(count, 60));
    console.log(`  ${String(b).padStart(2)}\u2013${String(b + 9).padStart(2)}%: ${bar} (${count})`);
  }
}
console.log("\n\nSimulation termin\xE9e.");
