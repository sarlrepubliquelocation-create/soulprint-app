// ══════════════════════════════════════
// ═══ JIEQI — Sprint E2 — V9.9 ═══
// 24 Termes Solaires Chinois (节气)
// Source : audit IA Rondes 8+9 (GPT/Grok/Gemini, 2026-03-04)
// Tables : Grok | Architecture : Gemini | Arbitrage L2 : GPT+Grok+Gemini (consensus 3/3)
// ══════════════════════════════════════
//
// FORMULE :
//   Convention : Lichun (立春, 315°) = index 1 — calendrier chinois authentique (Grok Ronde 8)
//   getJieqiIndex = floor(((sunTropLon % 360 + 360) % 360 - 315 + 360) % 360 / 15) + 1  [1..24]
//
// COUCHE : L2 (convergence-slow.ts) — rythme semi-mensuel ~15j
//   Consensus 3/3 Ronde 9 : un signal constant 15j n'appartient pas à L1.
//   Pas de plateau L1, pas de double-comptage avec pilier mensuel BaZi.
//
// CAP : ±2 (signal semi-mensuel, pas dominant face à BaZi ±15)
// Source deltas : Grok Ronde 8 (BaZi–The Destiny Code, San Ming Tong Hui)

// ── Types ──────────────────────────────────────────────────────────

export type JieqiQuality = 'tres_favorable' | 'favorable' | 'neutre' | 'defavorable';

export interface JieqiData {
  index:   number;       // 1..24 (Lichun=1 … Dahan=24)
  name:    string;       // ex: 'Lichun'
  hanzi:   string;       // ex: '立春'
  pinyin:  string;       // ex: 'Lìchūn'
  trad:    string;       // ex: 'Début du Printemps'
  sunLon:  number;       // longitude solaire de début (315, 330, ...)
  quality: JieqiQuality;
  delta:   number;       // scoring L2
}

export interface JieqiResult {
  term:            JieqiData;
  isTransitionDay: boolean;  // true si changement de Jieqi aujourd'hui (Gemini Ronde 9)
  total:           number;   // delta effectif (capé ±2)
  signals:         string[];
  alerts:          string[];
}

// ── Table 24 Jieqi ─────────────────────────────────────────────────
// Source deltas : Grok Ronde 8 (BaZi doctrine + San Ming Tong Hui)
// Convention départ : Lichun 315° = index 1 (consensus Grok+GPT Ronde 8)

const JIEQI_TABLE: Record<number, JieqiData> = {
  1:  { index: 1,  name: 'Lichun',      hanzi: '立春', pinyin: 'Lìchūn',      trad: 'Début du Printemps', sunLon: 315, quality: 'tres_favorable', delta: +2 },
  2:  { index: 2,  name: 'Yushui',      hanzi: '雨水', pinyin: 'Yǔshuǐ',      trad: 'Eau de Pluie',       sunLon: 330, quality: 'favorable',      delta: +1 },
  3:  { index: 3,  name: 'Jingzhe',     hanzi: '惊蛰', pinyin: 'Jīngzhé',     trad: 'Réveil des Insectes',sunLon: 345, quality: 'favorable',      delta: +2 },
  4:  { index: 4,  name: 'Chunfen',     hanzi: '春分', pinyin: 'Chūnfēn',     trad: 'Équinoxe Printemps', sunLon: 0,   quality: 'neutre',         delta:  0 },
  5:  { index: 5,  name: 'Qingming',    hanzi: '清明', pinyin: 'Qīngmíng',    trad: 'Pure Clarté',        sunLon: 15,  quality: 'favorable',      delta: +1 },
  6:  { index: 6,  name: 'Guyu',        hanzi: '谷雨', pinyin: 'Gǔyǔ',        trad: 'Pluie des Céréales', sunLon: 30,  quality: 'tres_favorable', delta: +2 },
  7:  { index: 7,  name: 'Lixia',       hanzi: '立夏', pinyin: 'Lìxià',       trad: "Début de l'Été",     sunLon: 45,  quality: 'favorable',      delta: +1 },
  8:  { index: 8,  name: 'Xiaoman',     hanzi: '小满', pinyin: 'Xiǎomǎn',     trad: 'Petite Plénitude',   sunLon: 60,  quality: 'favorable',      delta: +1 },
  9:  { index: 9,  name: 'Mangzhong',   hanzi: '芒种', pinyin: 'Mángzhòng',   trad: "Épi de Blé",         sunLon: 75,  quality: 'neutre',         delta:  0 },
  10: { index: 10, name: 'Xiazhi',      hanzi: '夏至', pinyin: 'Xiàzhì',      trad: "Solstice d'Été",     sunLon: 90,  quality: 'defavorable',    delta: -1 },
  11: { index: 11, name: 'Xiaoshu',     hanzi: '小暑', pinyin: 'Xiǎoshǔ',     trad: 'Petite Chaleur',     sunLon: 105, quality: 'defavorable',    delta: -1 },
  12: { index: 12, name: 'Dashu',       hanzi: '大暑', pinyin: 'Dàshǔ',       trad: 'Grande Chaleur',     sunLon: 120, quality: 'defavorable',    delta: -1 },
  13: { index: 13, name: 'Liqiu',       hanzi: '立秋', pinyin: 'Lìqiū',       trad: "Début de l'Automne", sunLon: 135, quality: 'favorable',      delta: +1 },
  14: { index: 14, name: 'Chushu',      hanzi: '处暑', pinyin: 'Chǔshǔ',      trad: 'Fin de la Chaleur',  sunLon: 150, quality: 'neutre',         delta:  0 },
  15: { index: 15, name: 'Bailu',       hanzi: '白露', pinyin: 'Báilù',       trad: 'Rosée Blanche',      sunLon: 165, quality: 'favorable',      delta: +1 },
  16: { index: 16, name: 'Qiufen',      hanzi: '秋分', pinyin: 'Qiūfēn',      trad: "Équinoxe d'Automne", sunLon: 180, quality: 'neutre',         delta:  0 },
  17: { index: 17, name: 'Hanlu',       hanzi: '寒露', pinyin: 'Hánlù',       trad: 'Rosée Froide',       sunLon: 195, quality: 'defavorable',    delta: -1 },
  18: { index: 18, name: 'Shuangjiang', hanzi: '霜降', pinyin: 'Shuāngjiàng', trad: 'Descente du Gel',    sunLon: 210, quality: 'defavorable',    delta: -1 },
  19: { index: 19, name: 'Lidong',      hanzi: '立冬', pinyin: 'Lìdōng',      trad: "Début de l'Hiver",   sunLon: 225, quality: 'defavorable',    delta: -1 },
  20: { index: 20, name: 'Xiaoxue',     hanzi: '小雪', pinyin: 'Xiǎoxuě',     trad: 'Petite Neige',       sunLon: 240, quality: 'defavorable',    delta: -1 },
  21: { index: 21, name: 'Daxue',       hanzi: '大雪', pinyin: 'Dàxuě',       trad: 'Grande Neige',       sunLon: 255, quality: 'defavorable',    delta: -1 },
  22: { index: 22, name: 'Dongzhi',     hanzi: '冬至', pinyin: 'Dōngzhì',     trad: 'Solstice Hiver',     sunLon: 270, quality: 'tres_favorable', delta: +2 },
  23: { index: 23, name: 'Xiaohan',     hanzi: '小寒', pinyin: 'Xiǎohán',     trad: 'Petite Froid',       sunLon: 285, quality: 'neutre',         delta:  0 },
  24: { index: 24, name: 'Dahan',       hanzi: '大寒', pinyin: 'Dàhán',       trad: 'Grand Froid',        sunLon: 300, quality: 'neutre',         delta:  0 },
};

// ── Fonction d'index ────────────────────────────────────────────────

/**
 * Calcule l'index Jieqi (1..24) depuis la longitude tropicale du Soleil.
 * Convention Lichun (315°) = index 1 — calendrier chinois authentique.
 * Source : Grok Ronde 8 (Shixian calendar + Joey Yap)
 */
export function getJieqiIndex(sunTropLon: number): number {
  const normalized = ((sunTropLon % 360) + 360) % 360;
  return Math.floor(((normalized - 315 + 360) % 360) / 15) + 1; // 1..24
}

// ── Fonction principale ─────────────────────────────────────────────

/**
 * Calcule le Jieqi (terme solaire chinois) pour une longitude solaire donnée.
 *
 * @param sunTropLon      Longitude tropicale du Soleil (degrés 0–360)
 * @param sunTropLonPrev  Longitude solaire J-1 (pour détection jour de transition)
 * @returns JieqiResult avec total capé ±2
 */
export function calcJieqi(
  sunTropLon:      number,
  sunTropLonPrev?: number,
): JieqiResult {
  const idx  = getJieqiIndex(sunTropLon);
  const term = JIEQI_TABLE[idx] ?? JIEQI_TABLE[1];

  // Détection jour de transition (Gemini Ronde 9 — O(1))
  let isTransitionDay = false;
  if (sunTropLonPrev !== undefined) {
    const prevIdx = getJieqiIndex(sunTropLonPrev);
    isTransitionDay = prevIdx !== idx;
  }

  const signals: string[] = [];
  const alerts:  string[] = [];

  if (term.delta > 0) {
    signals.push(`🌿 Jieqi ${term.hanzi} ${term.name} — ${term.trad} (+${term.delta})`);
  } else if (term.delta < 0) {
    alerts.push(`🔸 Jieqi ${term.hanzi} ${term.name} — ${term.trad} (${term.delta})`);
  }

  // Cap ±2 (signal semi-mensuel, L2)
  const total = Math.max(-2, Math.min(2, term.delta));

  return { term, isTransitionDay, total, signals, alerts };
}
