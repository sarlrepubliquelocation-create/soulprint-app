import { useState, useEffect } from 'react';
import { type SoulData } from '../App';
import { SIGNS, SIGN_FR, SIGN_SYM, SIGN_ELEM, PLANET_FR, PLANET_SYM, ASPECT_SYM, ASPECT_COL, ELEM_FR, ELEM_COL, DIG_SYM, DIG_FR, type Stellium, type DominantPlanet, type GrandTrine, type TSquare } from '../engines/astrology';
import { getPlanetSignDesc } from '../engines/astro-descriptions';
import { Sec, Cd, P } from './ui';

// === Labels courts pour la roue ===
const PL_SHORT: Record<string, string> = { sun:'So', moon:'Lu', mercury:'Me', venus:'Vé', mars:'Ma', jupiter:'Ju', saturn:'Sa', uranus:'Ur', neptune:'Ne', pluto:'Pl', northNode:'☊', southNode:'☋', chiron:'⚷', lilith:'⚸' };

// ══════════════════════════════════════
// PORTRAIT ASTRAL IA — V8.5
// buildNatalContext : sérialise le thème natal → ~180 tokens pour Claude API
// Doctrine R30 Grok : signal/bruit optimal — P1 seulement
// ══════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildNatalContext(astro: any): string {
  const parts: string[] = [];
  parts.push(`Soleil : ${astro.b3.sun}`);
  parts.push(`Lune : ${astro.b3.moon}`);
  parts.push(`Ascendant : ${astro.b3.asc}`);
  if (astro.b3.mc) parts.push(`MC : ${astro.b3.mc}`);
  if (astro.dominant?.length) parts.push(`Dominante : ${astro.dominant[0].k}`);
  astro.stelliums?.forEach(s => {
    if (s.planets.length >= 3)
      parts.push(`Stellium ${s.type} ${s.name} (${s.planets.length} planètes) : ${s.planets.join(', ')}`);
  });
  astro.grandTrines?.forEach(gt => {
    parts.push(`Grand Trigone ${gt.element} : ${gt.planets.join(' – ')}`);
  });
  astro.tSquares?.forEach(ts => {
    parts.push(`T-Carré apex ${ts.apex} (opposition : ${ts.opposition.join(' / ')})`);
  });
  const topAspects = [...(astro.as || [])].sort((a, b) => a.o - b.o).slice(0, 8);
  if (topAspects.length)
    parts.push(`Aspects serrés : ${topAspects.map(a => `${a.p1}-${a.p2} ${a.t} (${a.o.toFixed(1)}°)`).join(' | ')}`);
  return parts.join('\n');
}

const PORTRAIT_SYSTEM_PROMPT = `Tu es l'IA astrologique de Kaironaute. Tu génères des portraits personnels basés UNIQUEMENT sur les données fournies.

RÈGLES STRICTES :
- Ancre CHAQUE affirmation sur une donnée exacte du thème (planète + signe/maison/aspect nommé).
- Minimum 8 références astrales uniques dans l'ensemble du texte.
- Langue : français courant, ton psychologique et direct — jamais mystico-vague.
- INTERDITS : "parfois", "il se peut que", "beaucoup de gens", "en général", "vous êtes sensible".
- Si stellium exceptionnel (5+ planètes), souligne explicitement cette rareté.
- Pas de prédictions temporelles, pas de conseils médicaux/financiers.

FORMAT DE SORTIE — JSON strict, rien d'autre :
{
  "sections": [
    {"titre": "L'Essence", "contenu": "..."},
    {"titre": "La Force de Frappe", "contenu": "..."},
    {"titre": "Le Don Inné", "contenu": "..."},
    {"titre": "Le Défi Formateur", "contenu": "..."}
  ]
}
- "Le Don Inné" : inclure SEULEMENT si Grand Trigone présent dans les données.
- "Le Défi Formateur" : inclure SEULEMENT si T-Carré présent dans les données.
- Chaque contenu : 80-120 mots maximum.
- Zéro markdown hors JSON.`;

const PORTRAIT_CACHE_KEY = 'kaironaute_portrait_v1';

function getPortraitCacheKey(astro: { b3: { sun: string; moon: string; asc: string } }): string {
  return `${PORTRAIT_CACHE_KEY}_${astro.b3.sun}_${astro.b3.moon}_${astro.b3.asc}`;
}

interface PortraitSection { titre: string; contenu: string; }
interface PortraitData { sections: PortraitSection[]; }


// === Rôle de chaque planète (une phrase) ===
const PL_ROLE: Record<string, string> = {
  sun: 'Identité · Volonté · Vitalité',
  moon: 'Émotions · Instinct · Besoins',
  mercury: 'Communication · Pensée · Apprentissage',
  venus: 'Relations · Valeurs · Attractivité',
  mars: 'Action · Énergie · Combativité',
  jupiter: 'Expansion · Chance · Vision',
  saturn: 'Discipline · Limites · Maturité',
  uranus: 'Innovation · Rupture · Liberté',
  neptune: 'Intuition · Inspiration · Illusions',
  pluto: 'Pouvoir · Transformation · Ombres',
  northNode: 'Destin · Direction karmique · Ce à développer',
  southNode: 'Héritage · Acquis d\'âme · Ce à dépasser',
  chiron: 'Blessure primordiale · Guérison · Sagesse par l\'épreuve',
  lilith: 'Ombre instinctive · Désirs refoulés · Puissance brute',
};

// === Aspects en français clair ===
const ASPECT_FR: Record<string, string> = {
  conjunction: 'en fusion avec',
  opposition: 'en tension avec',
  trine: 'en harmonie avec',
  square: 'en défi avec',
  sextile: 'en soutien de',
  quincunx: 'en ajustement avec',
  sesquisquare: 'en friction subtile avec',
};
const ASPECT_VIBE: Record<string, { label: string; col: string }> = {
  conjunction: { label: '⚡ Fusion', col: '#FFD700' },
  opposition: { label: '🔴 Tension', col: '#FF4444' },
  trine: { label: '🟢 Harmonie', col: '#4ade80' },
  square: { label: '🔴 Défi', col: '#ef4444' },
  sextile: { label: '🟢 Soutien', col: '#60a5fa' },
  quincunx: { label: '🟠 Ajustement', col: '#FF8C00' },
  sesquisquare: { label: '🟠 Friction', col: '#FF6347' },
};

// === Transit descriptions vulgarisées ===
const TRANSIT_DESC: Record<string, string> = {
  conjunction: 'amplifie et intensifie',
  opposition: 'crée une tension et pousse à l\'équilibre',
  trine: 'facilite et apporte de la fluidité',
  square: 'provoque des frictions et pousse à agir',
  sextile: 'ouvre des opportunités subtiles',
};

const MODE_FR: Record<string, string> = { cardinal: '⚡ Cardinal', fixed: '🔒 Fixe', mutable: '🔄 Mutable' };
const MODE_DESC: Record<string, string> = { cardinal: 'Initier, diriger, lancer', fixed: 'Persévérer, stabiliser, tenir', mutable: 'S\'adapter, évoluer, ajuster' };
const MODE_COL: Record<string, string> = { cardinal: '#FF6B6B', fixed: '#FFD700', mutable: '#4ade80' };
const DIG_COL: Record<string, string> = { dom: '#4ade80', exa: '#60a5fa', fall: '#ef4444', exi: '#FF6B6B' };
const DIG_HINT: Record<string, string> = {
  dom: '✦ Chez elle — expression naturelle et puissante',
  exa: '✦ Amplifiée — potentiel au maximum',
  fall: '⚠ Affaiblie — effort conscient nécessaire',
  exi: '⚠ En exil — terrain difficile mais source de croissance',
};

// === Big Three descriptions contextuelles ===
const B3_DESC: Record<string, Record<string, string>> = {
  mc: {
    Aries:'Vocation pionnière — vous réussissez en prenant des initiatives audacieuses.',
    Taurus:'Vocation bâtisseur — vous excellez dans ce qui dure, le concret, la création de valeur.',
    Gemini:'Vocation communicateur — vous brillez par la parole, l\'écriture, la transmission.',
    Cancer:'Vocation nourricière — vous réussissez en prenant soin des autres.',
    Leo:'Vocation créatrice — vous brillez sur scène, dans les arts, dans le leadership.',
    Virgo:'Vocation analytique — vous excellez dans le service, la précision, la santé.',
    Libra:'Vocation harmonisatrice — vous brillez dans la diplomatie, la beauté, la justice.',
    Scorpio:'Vocation transformatrice — vous excellez dans l\'investigation et les crises.',
    Sagittarius:'Vocation visionnaire — vous brillez dans l\'enseignement, le voyage, la philosophie.',
    Capricorn:'Vocation architecte — vous réussissez par la discipline et l\'ambition structurée.',
    Aquarius:'Vocation innovatrice — vous brillez dans l\'avant-garde et le collectif.',
    Pisces:'Vocation artistique — vous excellez dans la créativité, la spiritualité, le soin.',
  },
  sun: {
    Aries:'Vous êtes un leader né, porté par l\'action et l\'initiative.',
    Taurus:'Vous êtes bâtisseur, porté par la stabilité et la persévérance.',
    Gemini:'Vous êtes un connecteur d\'idées, agile et curieux.',
    Cancer:'Vous êtes guidé par l\'intuition et l\'intelligence émotionnelle.',
    Leo:'Vous êtes un meneur charismatique qui inspire la loyauté.',
    Virgo:'Vous êtes un analyste précis qui vise l\'excellence.',
    Libra:'Vous êtes un diplomate né, créateur d\'équilibre et d\'alliances.',
    Scorpio:'Vous êtes un stratège intense qui transforme les obstacles en leviers.',
    Sagittarius:'Vous êtes un visionnaire qui voit grand et pense global.',
    Capricorn:'Vous êtes un architecte patient qui construit dans la durée.',
    Aquarius:'Vous êtes un innovateur qui pense hors des sentiers battus.',
    Pisces:'Vous êtes guidé par une intuition profonde et une vision holistique.',
  },
  moon: {
    Aries:'Sous pression, vous réagissez vite et passez à l\'action.',
    Taurus:'Vous avez besoin de sécurité et de stabilité pour performer.',
    Gemini:'Vous gérez le stress par l\'analyse et la communication.',
    Cancer:'Votre intuition émotionnelle est votre super-pouvoir.',
    Leo:'Sous pression, vous montez en puissance et prenez les commandes.',
    Virgo:'Vous canalisez le stress dans l\'action concrète et l\'organisation.',
    Libra:'Le conflit vous déstabilise — vous cherchez l\'harmonie.',
    Scorpio:'Vos émotions sont intenses mais maîtrisées — résilience remarquable.',
    Sagittarius:'Vous rebondissez avec optimisme en prenant du recul.',
    Capricorn:'Vous compartimentez et avancez — force silencieuse.',
    Aquarius:'Vous analysez vos émotions avec détachement productif.',
    Pisces:'Vous absorbez les ambiances — créativité et intuition profondes.',
  },
  asc: {
    Aries:'Vous dégagez une énergie directe, dynamique et pionnière.',
    Taurus:'Vous projetez une image de calme, de solidité et de fiabilité.',
    Gemini:'Vous dégagez vivacité intellectuelle et aisance sociale.',
    Cancer:'Vous projetez chaleur et bienveillance protectrice.',
    Leo:'Vous dégagez charisme et présence magnétique.',
    Virgo:'Vous projetez sérieux, compétence et attention au détail.',
    Libra:'Vous dégagez élégance, diplomatie et sens de l\'harmonie.',
    Scorpio:'Vous projetez intensité et mystère — on ne vous oublie pas.',
    Sagittarius:'Vous dégagez enthousiasme, ouverture et confiance.',
    Capricorn:'Vous projetez autorité, ambition et professionnalisme.',
    Aquarius:'Vous dégagez originalité et indépendance d\'esprit.',
    Pisces:'Vous projetez sensibilité, empathie et profondeur.',
  },
};

export default function AstroTab({ data }: { data: SoulData }) {
  const { astro } = data;
  const [expandedPl, setExpandedPl] = useState<Set<string>>(new Set(['sun', 'moon', 'mercury']));
  const [portrait, setPortrait] = useState<PortraitData | null>(null);
  const [portraitStatus, setPortraitStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [loadingText, setLoadingText] = useState('Analyse cosmique...');

  // Charger le cache localStorage au montage
  useEffect(() => {
    if (!astro) return;
    try {
      const key = getPortraitCacheKey(astro);
      const cached = localStorage.getItem(key);
      if (cached) {
        setPortrait(JSON.parse(cached));
        setPortraitStatus('done');
      }
    } catch { /* fail silently */ }
  }, [astro?.b3?.sun, astro?.b3?.moon, astro?.b3?.asc]);

  const generatePortrait = async () => {
    if (!astro || portraitStatus === 'loading') return;
    setPortraitStatus('loading');
    const LOADING_TEXTS = ['Analyse des stelliums...', 'Lecture du Grand Trigone...', 'Calcul des tensions natales...', 'Synthèse du portrait...'];
    let li = 0;
    const interval = setInterval(() => { setLoadingText(LOADING_TEXTS[++li % LOADING_TEXTS.length]); }, 900);
    try {
      const context = buildNatalContext(astro as any);
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1200,
          system: PORTRAIT_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: `Génère le portrait astral pour ce thème natal :\n\n${context}` }],
        }),
      });
      const d = await res.json();
      const raw = d.content?.[0]?.text || '';
      const clean = raw.replace(/```json|```/g, '').trim();
      const parsed: PortraitData = JSON.parse(clean);
      setPortrait(parsed);
      setPortraitStatus('done');
      localStorage.setItem(getPortraitCacheKey(astro), JSON.stringify(parsed));
    } catch {
      setPortraitStatus('error');
    } finally {
      clearInterval(interval);
    }
  };


  if (!astro) return (
    <Sec icon="🌙" title="Thème Astral">
      <Cd>
        <div style={{ textAlign: 'center', color: P.textDim, padding: 20 }}>
          <div style={{ fontSize: 14 }}>Renseigne une ville de naissance valide pour le thème astral.</div>
          <div style={{ marginTop: 8, fontSize: 11, color: P.textDim }}>Villes FR : Paris, Lyon, Marseille, Mâcon, Toulouse, Carcassonne...</div>
        </div>
      </Cd>
    </Sec>
  );

  const togglePl = (k: string) => {
    setExpandedPl(prev => {
      const n = new Set(prev);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });
  };

  // === ZODIAC WHEEL ===
  const WHL = 320, C = WHL / 2, R1 = 140, R2 = 115, R3 = 80;
  // V3.0 — Planètes pour la roue (10 classiques + nœuds, pas chiron/lilith pour la lisibilité)
  const WHEEL_KEYS = ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto','northNode','southNode'];
  const wheelPl = astro.pl.filter(p => WHEEL_KEYS.includes(p.k));
  const plLons = wheelPl.map(pp => SIGNS.indexOf(pp.s) * 30 + pp.d);
  function polar(deg: number, r: number): [number, number] {
    const a = (deg - 90) * Math.PI / 180;
    return [C + r * Math.cos(a), C + r * Math.sin(a)];
  }

  return (
    <div>
      {/* ===== BIG THREE ===== */}
      <Sec icon="🌙" title={astro.noTime ? 'Luminaires' : 'Big Three — Vos 3 piliers'}>
        <Cd>
          <div style={{ fontSize: 12, color: P.textDim, marginBottom: 12, lineHeight: 1.5 }}>
            {astro.noTime
              ? "Vos deux luminaires définissent votre identité consciente et vos réflexes émotionnels."
              : "Les 3 forces fondamentales de votre personnalité : qui vous êtes (Soleil), ce que vous ressentez (Lune), et comment les autres vous perçoivent (Ascendant)."
            }
          </div>
          {astro.noTime && <div style={{ marginBottom: 12, padding: '6px 12px', background: `${P.gold}10`, borderRadius: 6, fontSize: 11, color: P.gold, textAlign: 'center' }}>⏱ Heure inconnue — calcul à midi, Ascendant non disponible.</div>}

          {/* Big Three cards */}
          <div style={{ display: 'grid', gap: 10 }}>
            {(astro.noTime
              ? [{ k: 'sun', s: astro.b3.sun, lb: '☉ Soleil — Votre identité', sub: 'Qui vous êtes fondamentalement' },
                 { k: 'moon', s: astro.b3.moon, lb: '☽ Lune — Vos émotions', sub: 'Vos réflexes sous pression' }]
              : [{ k: 'sun', s: astro.b3.sun, lb: '☉ Soleil — Votre identité', sub: 'Qui vous êtes fondamentalement' },
                 { k: 'moon', s: astro.b3.moon, lb: '☽ Lune — Vos émotions', sub: 'Vos réflexes sous pression' },
                 { k: 'asc', s: astro.b3.asc, lb: '↑ Ascendant — Votre image', sub: 'Comment les autres vous voient' }]
            ).map(({ k, s, lb, sub }) => {
              const ec = ELEM_COL[SIGN_ELEM[s]] || P.textDim;
              const desc = B3_DESC[k]?.[s] || '';
              return (
                <div key={k} style={{ padding: '12px 14px', background: ec + '0A', borderRadius: 10, borderLeft: `3px solid ${ec}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 28, color: ec }}>{SIGN_SYM[s]}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: P.text }}>{lb}</div>
                      <div style={{ fontSize: 11, color: P.textDim }}>{sub}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: ec, marginBottom: 4 }}>{SIGN_FR[s]}</div>
                  {desc && <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.5 }}>{desc}</div>}
                </div>
              );
            })}
          </div>
        </Cd>
      </Sec>

      {/* ===== DOMINANTE PLANÉTAIRE ===== */}
      {!astro.noTime && astro.dominant && astro.dominant.length > 0 && (() => {
        const top3 = astro.dominant.slice(0, 3);
        const PLANET_COL: Record<string, string> = {
          sun:'#FFD700', moon:'#C0C0FF', mercury:'#A0D8EF', venus:'#FFB6C1',
          mars:'#FF6B6B', jupiter:'#FFA07A', saturn:'#CD853F',
          uranus:'#00CED1', neptune:'#6A5ACD', pluto:'#8B0000',
        };
        return (
          <Sec icon="🌟" title="Dominante Planétaire">
            <Cd>
              <div style={{ fontSize: 12, color: P.textDim, marginBottom: 10, lineHeight: 1.5 }}>
                La planète qui gouverne votre thème — celle qui colore le plus votre expression naturelle selon le maîtrise des signes, les dignités et les maisons angulaires.
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {top3.map((dom, i) => {
                  const col = PLANET_COL[dom.planet] || P.textDim;
                  return (
                    <div key={dom.planet} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: col + (i === 0 ? '12' : '08'), borderRadius: 10, border: `1px solid ${col}${i === 0 ? '40' : '20'}` }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: col + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: col, flexShrink: 0 }}>
                        {PLANET_SYM[dom.planet]}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {i === 0 && <span style={{ fontSize: 9, fontWeight: 700, color: col, background: col + '20', padding: '1px 5px', borderRadius: 3 }}>✦ DOMINANTE</span>}
                          <span style={{ fontSize: 14, fontWeight: 700, color: P.text }}>{PLANET_FR[dom.planet]}</span>
                          <span style={{ fontSize: 11, color: P.textDim, marginLeft: 'auto' }}>Score {dom.score}</span>
                        </div>
                        <div style={{ fontSize: 10, color: P.textDim, marginTop: 3 }}>
                          {dom.reasons.join(' · ')}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Cd>
          </Sec>
        );
      })()}

      {/* ===== STELLIUMS ===== */}
      {astro.stelliums && astro.stelliums.length > 0 && (() => {
        return (
          <Sec icon="✨" title="Stelliums — Concentrations d'énergie">
            <Cd>
              <div style={{ fontSize: 12, color: P.textDim, marginBottom: 10, lineHeight: 1.5 }}>
                Un stellium = 3 planètes ou plus dans le même signe ou maison. C'est une configuration majeure qui amplifie fortement ce domaine de vie.
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {astro.stelliums.map((st, i) => {
                  const firstPl = st.planets[0];
                  const firstSign = astro.pl.find(p => p.k === firstPl)?.s || 'Aries';
                  const col = ELEM_COL[SIGN_ELEM[firstSign]] || P.gold;
                  return (
                    <div key={i} style={{ padding: '12px 14px', background: col + '10', borderRadius: 10, borderLeft: `3px solid ${col}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: col }}>
                          {st.type === 'sign' ? `${SIGN_SYM[st.name]} ${SIGN_FR[st.name]}` : st.name}
                        </span>
                        <span style={{ fontSize: 9, color: col, background: col + '20', padding: '1px 5px', borderRadius: 3, marginLeft: 'auto' }}>
                          {st.planets.length} planètes
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {st.planets.map(pk => (
                          <span key={pk} style={{ fontSize: 11, color: P.textMid, background: P.bg, padding: '2px 8px', borderRadius: 4, border: `1px solid ${col}30` }}>
                            {PLANET_SYM[pk]} {PLANET_FR[pk]}
                          </span>
                        ))}
                      </div>
                      <div style={{ fontSize: 11, color: P.textDim, marginTop: 6, lineHeight: 1.4 }}>
                        {st.type === 'sign'
                          ? `Forte concentration en ${SIGN_FR[st.name] || st.name} — cette énergie est au cœur de votre expression.`
                          : `${st.name} très chargée — ce domaine de vie est central et très activé.`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Cd>
          </Sec>
        );
      })()}

            {/* ===== ROUE ZODIACALE ===== */}
      <Sec icon="☸" title="Roue Zodiacale — Carte du ciel">
        <Cd>
          <div style={{ fontSize: 12, color: P.textDim, marginBottom: 8, lineHeight: 1.5 }}>
            Vue d'ensemble de votre ciel natal. Chaque planète est placée dans son signe. Les lignes au centre montrent les relations entre planètes.
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <svg viewBox={`0 0 ${WHL} ${WHL}`} width="100%" style={{ maxWidth: 340 }}>
              {/* Sign sectors */}
              {SIGNS.map((sign, i) => {
                const a1 = i * 30 - 90, a2 = a1 + 30;
                const r1a = (a1 * Math.PI) / 180, r2a = (a2 * Math.PI) / 180;
                const x1o = C + R1 * Math.cos(r1a), y1o = C + R1 * Math.sin(r1a);
                const x2o = C + R1 * Math.cos(r2a), y2o = C + R1 * Math.sin(r2a);
                const x1i = C + R2 * Math.cos(r1a), y1i = C + R2 * Math.sin(r1a);
                const x2i = C + R2 * Math.cos(r2a), y2i = C + R2 * Math.sin(r2a);
                const ec = ELEM_COL[SIGN_ELEM[sign]] || '#888';
                const [sx, sy] = polar(i * 30 + 15, (R1 + R2) / 2);
                return (
                  <g key={sign}>
                    <path
                      d={`M${x1i},${y1i} L${x1o},${y1o} A${R1},${R1} 0 0,1 ${x2o},${y2o} L${x2i},${y2i} A${R2},${R2} 0 0,0 ${x1i},${y1i}`}
                      fill={ec + '15'} stroke={ec + '40'} strokeWidth={0.5}
                    />
                    <text x={sx} y={sy} textAnchor="middle" dominantBaseline="central" fontSize={11} fill={ec}>
                      {SIGN_SYM[sign]}
                      <title>{SIGN_FR[sign]}</title>
                    </text>
                  </g>
                );
              })}
              <circle cx={C} cy={C} r={R2} fill="none" stroke={P.textDim + '30'} strokeWidth={0.5} />
              <circle cx={C} cy={C} r={R3} fill="none" stroke={P.textDim + '20'} strokeWidth={0.3} />

              {/* Aspect lines */}
              {astro.as.slice(0, 8).map((a, i) => {
                const i1 = wheelPl.findIndex(p => p.k === a.p1);
                const i2 = wheelPl.findIndex(p => p.k === a.p2);
                if (i1 < 0 || i2 < 0) return null;
                const [x1, y1] = polar(plLons[i1], R3 - 4);
                const [x2, y2] = polar(plLons[i2], R3 - 4);
                return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={ASPECT_COL[a.t] + '50'} strokeWidth={a.o < 2 ? 1.2 : 0.6} />;
              })}

              {/* Planets with FR labels */}
              {wheelPl.map((pp, i) => {
                const lon = plLons[i];
                const [px, py] = polar(lon, R3 - 4);
                const [tx, ty] = polar(lon, R3 + 14);
                const ec = ELEM_COL[SIGN_ELEM[pp.s]] || P.textDim;
                return (
                  <g key={pp.k}>
                    <circle cx={px} cy={py} r={3.5} fill={ec} opacity={0.85} />
                    <text x={tx} y={ty} textAnchor="middle" dominantBaseline="central" fontSize={8} fontWeight={700} fill={ec}>
                      {PL_SHORT[pp.k]}
                      <title>{`${PLANET_FR[pp.k]} en ${SIGN_FR[pp.s]} ${pp.d.toFixed(0)}°${pp.retro ? ' (℞ Rétrograde)' : ''}${pp.dig ? ' — ' + DIG_FR[pp.dig] : ''}`}</title>
                    </text>
                    {pp.retro && <text x={tx + 9} y={ty - 5} fontSize={6} fill="#ef4444" fontWeight={700}>℞</text>}
                  </g>
                );
              })}

              {/* ASC + MC + Part of Fortune */}
              {!astro.noTime && (() => {
                const ascLon = SIGNS.indexOf(astro.b3.asc) * 30 + astro.ad;
                const [ax, ay] = polar(ascLon, R1 + 10);
                const mcSign = astro.mc || '';
                const mcLon = mcSign ? SIGNS.indexOf(mcSign) * 30 + (astro.mcDeg || 0) : null;
                const pofLon = astro.partOfFortune;
                return (
                  <>
                    <text x={ax} y={ay} textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight={700} fill={P.gold}>AC<title>Ascendant {SIGN_FR[astro.b3.asc]}</title></text>
                    {mcLon !== null && (() => { const [mx, my] = polar(mcLon, R1 + 10); return <text x={mx} y={my} textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight={700} fill="#C0C0FF">MC<title>Milieu du Ciel {SIGN_FR[mcSign]}</title></text>; })()}
                    {pofLon !== undefined && (() => { const [px, py] = polar(pofLon, R3 - 4); return <text x={px} y={py} textAnchor="middle" dominantBaseline="central" fontSize={10} fill="#FFD700" opacity={0.8}>⊕<title>Part of Fortune</title></text>; })()}
                  </>
                );
              })()}
            </svg>
          </div>

          {/* Légende */}
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
            {wheelPl.map(pp => {
              const ec = ELEM_COL[SIGN_ELEM[pp.s]] || P.textDim;
              return (
                <span key={pp.k} style={{ fontSize: 10, color: ec, background: ec + '10', padding: '2px 6px', borderRadius: 4 }}>
                  {PL_SHORT[pp.k]} = {PLANET_FR[pp.k]}
                </span>
              );
            })}
          </div>
          {/* Légende aspects */}
          <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            <span style={{ fontSize: 10, color: '#4ade80' }}>── Harmonie</span>
            <span style={{ fontSize: 10, color: '#FFD700' }}>── Fusion</span>
            <span style={{ fontSize: 10, color: '#ef4444' }}>── Tension</span>
            <span style={{ fontSize: 10, color: '#60a5fa' }}>── Soutien</span>
          </div>
        </Cd>
      </Sec>

      {/* ===== PLANÈTES — CARDS VISUELLES ===== */}
      <Sec icon="🪐" title="Vos Planètes — Interprétation">
        <Cd>
          <div style={{ fontSize: 12, color: P.textDim, marginBottom: 10, lineHeight: 1.5 }}>
            Chaque planète gouverne un domaine de votre vie. Sa position dans un signe colore la façon dont elle s'exprime.
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {astro.pl.map(pl => {
              // Couleurs spéciales pour les corps V3.0
              const SPECIAL_COL: Record<string, string> = {
                northNode: '#9B59B6', southNode: '#7D3C98', chiron: '#F0B429', lilith: '#E74C3C',
              };
              const c = SPECIAL_COL[pl.k] || ELEM_COL[SIGN_ELEM[pl.s]] || P.textDim;
              const desc = getPlanetSignDesc(pl.k, pl.s);
              const role = PL_ROLE[pl.k] || '';
              const isExp = expandedPl.has(pl.k);
              return (
                <div key={pl.k} style={{ background: c + '08', borderRadius: 10, border: `1px solid ${c}20`, overflow: 'hidden' }}>
                  {/* Header */}
                  <div
                    onClick={() => togglePl(pl.k)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', cursor: 'pointer' }}
                  >
                    <div style={{ width: 38, height: 38, borderRadius: 8, background: c + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: c, flexShrink: 0 }}>
                      {PLANET_SYM[pl.k]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: P.text }}>{PLANET_FR[pl.k]}</span>
                        <span style={{ fontSize: 13, color: c, fontWeight: 600 }}>{SIGN_SYM[pl.s]} {SIGN_FR[pl.s]}</span>
                        {pl.retro && <span style={{ fontSize: 9, color: '#ef4444', fontWeight: 700, background: '#ef444418', padding: '1px 4px', borderRadius: 3 }}>℞ Rétro</span>}
                        {pl.dig && <span style={{ fontSize: 9, color: DIG_COL[pl.dig], background: DIG_COL[pl.dig] + '18', padding: '1px 4px', borderRadius: 3 }}>{DIG_SYM[pl.dig]} {DIG_FR[pl.dig]}</span>}
                      </div>
                      <div style={{ fontSize: 10, color: P.textDim, marginTop: 2 }}>{role}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
                      <span style={{ fontSize: 11, color: P.textDim }}>{pl.d.toFixed(1)}°</span>
                      {!astro.noTime && <span style={{ fontSize: 9, color: P.textDim }}>Maison {pl.h}</span>}
                    </div>
                    <span style={{ fontSize: 11, color: P.textDim, marginLeft: 2 }}>{isExp ? '▲' : '▼'}</span>
                  </div>

                  {/* Expanded description */}
                  {isExp && desc && (
                    <div style={{ padding: '0 12px 12px 12px' }}>
                      <div style={{ padding: '10px 12px', background: c + '08', borderRadius: 8, borderLeft: `3px solid ${c}` }}>
                        <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.6 }}>{desc}</div>
                      </div>
                      {pl.retro && (
                        <div style={{ marginTop: 6, padding: '6px 10px', background: '#ef444410', borderRadius: 6, fontSize: 11, color: '#ef4444', lineHeight: 1.4 }}>
                          ℞ <strong>Rétrograde</strong> — Cette énergie travaille en profondeur. Au lieu de s'exprimer vers l'extérieur, elle mûrit intérieurement. Phase de révision et d'intégration.
                        </div>
                      )}
                      {pl.dig && (
                        <div style={{ marginTop: 4, padding: '6px 10px', background: DIG_COL[pl.dig] + '10', borderRadius: 6, fontSize: 11, color: DIG_COL[pl.dig], lineHeight: 1.4 }}>
                          {DIG_HINT[pl.dig]}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {/* Hint expand */}
          <div style={{ textAlign: 'center', marginTop: 6, fontSize: 10, color: P.textDim }}>
            Cliquez sur chaque planète pour voir / masquer l'interprétation
          </div>
        </Cd>
      </Sec>

      {/* ===== ASPECTS EN FRANÇAIS CLAIR ===== */}
      {astro.as.length > 0 && (
        <Sec icon="⚡" title="Aspects — Relations entre vos planètes">
          <Cd>
            <div style={{ fontSize: 12, color: P.textDim, marginBottom: 10, lineHeight: 1.5 }}>
              Les aspects révèlent comment vos planètes interagissent. <span style={{ color: '#4ade80' }}>Vert = énergie fluide</span>, <span style={{ color: '#ef4444' }}>rouge = friction créative</span>, <span style={{ color: '#FFD700' }}>or = intensification</span>.
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              {astro.as.slice(0, 12).map((a, i) => {
                const vibe = ASPECT_VIBE[a.t];
                const frLabel = ASPECT_FR[a.t] || a.t;
                return (
                  <div key={i} style={{ padding: '8px 12px', background: vibe.col + '08', borderRadius: 8, borderLeft: `3px solid ${vibe.col}40` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 10, color: vibe.col, fontWeight: 600, background: vibe.col + '15', padding: '1px 5px', borderRadius: 3 }}>{vibe.label}</span>
                      <span style={{ fontSize: 11, color: P.textDim, marginLeft: 'auto' }}>{a.o.toFixed(1)}°</span>
                    </div>
                    <div style={{ fontSize: 13, color: P.textMid, lineHeight: 1.4 }}>
                      <strong style={{ color: P.text }}>{PLANET_FR[a.p1]}</strong>
                      <span style={{ color: P.textDim }}> {frLabel} </span>
                      <strong style={{ color: P.text }}>{PLANET_FR[a.p2]}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </Cd>
        </Sec>
      )}

      {/* ===== ÉLÉMENTS ===== */}
      {astro.el && (
        <Sec icon="🌊" title="Éléments — Votre tempérament">
          <Cd>
            <div style={{ fontSize: 12, color: P.textDim, marginBottom: 10, lineHeight: 1.5 }}>
              La répartition des 4 éléments révèle votre tempérament dominant : action (Feu), pragmatisme (Terre), communication (Air) ou intuition (Eau).
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {Object.entries(astro.el).map(([k, v]) => {
                const mx = Math.max(...Object.values(astro.el));
                const isTop = v === mx;
                return (
                  <div key={k} style={{ padding: '8px 10px', background: isTop ? ELEM_COL[k] + '12' : P.bg, borderRadius: 8, border: isTop ? `1px solid ${ELEM_COL[k]}30` : '1px solid transparent' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, color: ELEM_COL[k], fontWeight: 700 }}>{ELEM_FR[k]}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: isTop ? ELEM_COL[k] : P.textMid, marginLeft: 'auto' }}>{v.toFixed(0)}</span>
                    </div>
                    <div style={{ height: 8, background: P.bg, borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: (v / mx * 100) + '%', height: '100%', background: ELEM_COL[k] + (isTop ? 'AA' : '55'), borderRadius: 4, transition: 'width 0.3s' }} />
                    </div>
                    {isTop && <div style={{ fontSize: 10, color: ELEM_COL[k], marginTop: 3, fontWeight: 600 }}>✦ Dominant</div>}
                  </div>
                );
              })}
            </div>
          </Cd>
        </Sec>
      )}

      {/* ===== MODALITÉS ===== */}
      {astro.mo && (
        <Sec icon="🔄" title="Modalités — Votre mode d'action">
          <Cd>
            <div style={{ fontSize: 12, color: P.textDim, marginBottom: 10, lineHeight: 1.5 }}>
              Comment vous agissez naturellement : démarrer (Cardinal), persévérer (Fixe), ou vous adapter (Mutable).
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {Object.entries(astro.mo).map(([k, v]) => {
                const mx = Math.max(...Object.values(astro.mo));
                const isTop = v === mx;
                return (
                  <div key={k} style={{ textAlign: 'center', padding: '10px 6px', background: isTop ? MODE_COL[k] + '15' : P.bg, borderRadius: 10, border: isTop ? `1px solid ${MODE_COL[k]}30` : '1px solid transparent' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: isTop ? MODE_COL[k] : P.textDim }}>{MODE_FR[k]}</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: isTop ? MODE_COL[k] : P.textMid, margin: '4px 0' }}>{v.toFixed(0)}</div>
                    <div style={{ fontSize: 9, color: P.textDim, lineHeight: 1.3 }}>{MODE_DESC[k]}</div>
                    {isTop && <div style={{ fontSize: 9, color: MODE_COL[k], marginTop: 3, fontWeight: 600 }}>✦ Dominant</div>}
                  </div>
                );
              })}
            </div>
          </Cd>
        </Sec>
      )}

      {/* ===== TRANSITS VULGARISÉS ===== */}
            {/* ===== V3.1 — GRAND TRIGONE ===== */}
      {astro.grandTrines && astro.grandTrines.length > 0 && (
        <Sec icon="🔺" title="Grand Trigone — Flux d'énergie naturel">
          <Cd>
            <div style={{ fontSize: 12, color: P.textDim, marginBottom: 10, lineHeight: 1.5 }}>
              Un Grand Trigone = 3 planètes en harmonie parfaite dans le même élément. C'est une configuration de talent naturel, de facilité — parfois trop confortable.
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {astro.grandTrines.map((gt, i) => {
                const col = ELEM_COL[gt.element] || P.gold;
                const elemFr = ELEM_FR[gt.element] || gt.element;
                return (
                  <div key={i} style={{ padding: '12px 14px', background: col + '10', borderRadius: 10, border: `1px solid ${col}30` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: col }}>🔺 {elemFr}</span>
                      <span style={{ fontSize: 10, color: P.textDim, background: col + '18', padding: '1px 6px', borderRadius: 3 }}>Élément {gt.element}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      {gt.planets.map((pk, pi) => (
                        <span key={pk} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 12, color: col, background: col + '18', padding: '3px 9px', borderRadius: 6, fontWeight: 600 }}>
                            {PLANET_SYM[pk]} {PLANET_FR[pk]}
                          </span>
                          {pi < 2 && <span style={{ fontSize: 11, color: col }}>△</span>}
                        </span>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: P.textDim, marginTop: 8, lineHeight: 1.4 }}>
                      Ces trois planètes se renforcent mutuellement. Un talent fluide, presque inné — à conscientiser pour ne pas en gâcher le potentiel.
                    </div>
                  </div>
                );
              })}
            </div>
          </Cd>
        </Sec>
      )}

      {/* ===== V3.1 — T-CARRÉ ===== */}
      {astro.tSquares && astro.tSquares.length > 0 && (
        <Sec icon="⊤" title="T-Carré — Tension motrice">
          <Cd>
            <div style={{ fontSize: 12, color: P.textDim, marginBottom: 10, lineHeight: 1.5 }}>
              Un T-Carré = une opposition sous pression d'une troisième planète (l'apex). Configuration de tension intense — mais aussi de grande force si canalisée.
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {astro.tSquares.map((ts, i) => {
                const apexPl = astro.pl.find(p => p.k === ts.apex);
                const col = apexPl ? (ELEM_COL[SIGN_ELEM[apexPl.s]] || P.gold) : '#ef4444';
                return (
                  <div key={i} style={{ padding: '12px 14px', background: '#ef444408', borderRadius: 10, border: '1px solid #ef444430' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 700, background: '#ef444418', padding: '1px 6px', borderRadius: 3 }}>APEX</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: col }}>
                        {PLANET_SYM[ts.apex]} {PLANET_FR[ts.apex]}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: P.textMid, background: P.bg, padding: '3px 9px', borderRadius: 6, border: '1px solid #ef444430' }}>
                        {PLANET_SYM[ts.opposition[0]]} {PLANET_FR[ts.opposition[0]]}
                      </span>
                      <span style={{ fontSize: 11, color: '#FF4444' }}>☍</span>
                      <span style={{ fontSize: 12, color: P.textMid, background: P.bg, padding: '3px 9px', borderRadius: 6, border: '1px solid #ef444430' }}>
                        {PLANET_SYM[ts.opposition[1]]} {PLANET_FR[ts.opposition[1]]}
                      </span>
                      <span style={{ fontSize: 11, color: P.textDim, marginLeft: 4 }}>↕ {PLANET_SYM[ts.apex]} en □</span>
                    </div>
                    <div style={{ fontSize: 11, color: P.textDim, marginTop: 8, lineHeight: 1.4 }}>
                      L'apex concentre la tension de l'opposition — c'est à la fois le point de friction maximal et la clé de résolution.
                    </div>
                  </div>
                );
              })}
            </div>
          </Cd>
        </Sec>
      )}


      {/* ══════════════════════════════════════ */}
      {/* V8.5 — PORTRAIT ASTRAL IA              */}
      {/* ══════════════════════════════════════ */}
      <Sec icon="✨" title="Portrait Astral — Votre signature unique">
        <Cd>
          {portraitStatus === 'idle' && (
            <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
              <div style={{ fontSize: 12, color: P.textDim, marginBottom: 14, lineHeight: 1.6 }}>
                Une synthèse psychologique unique générée par IA à partir des singularités de votre thème — stelliums, trigones, tensions, dominante.
              </div>
              <button
                onClick={generatePortrait}
                style={{
                  width: '100%', padding: '12px 0', borderRadius: 10,
                  background: 'linear-gradient(135deg, #a78bfa22, #7c3aed22)',
                  border: '1px solid #a78bfa55', color: '#a78bfa',
                  fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  letterSpacing: 0.5, fontFamily: 'inherit',
                }}
              >
                Décoder ma signature astrale
              </button>
            </div>
          )}

          {portraitStatus === 'loading' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '12px 0' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
                <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
              </svg>
              <span style={{ fontSize: 13, color: '#a78bfa', fontWeight: 500 }}>{loadingText}</span>
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[100, 75, 90, 60].map((w, i) => (
                  <div key={i} style={{ height: 10, width: `${w}%`, background: '#1f1f2e', borderRadius: 4 }} />
                ))}
              </div>
            </div>
          )}

          {portraitStatus === 'error' && (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 10 }}>Portrait temporairement indisponible.</div>
              <button
                onClick={generatePortrait}
                style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid #ef444440', background: 'transparent', color: '#ef4444', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Réessayer
              </button>
            </div>
          )}

          {portraitStatus === 'done' && portrait && (
            <div style={{ animation: 'fadeInPortrait 0.5s ease' }}>
              <style>{`@keyframes fadeInPortrait { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
              {portrait.sections.map((s, i) => (
                <div key={i} style={{ marginBottom: i < portrait.sections.length - 1 ? 18 : 0 }}>
                  <div style={{ fontSize: 11, color: i === 0 ? P.gold : '#a78bfa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6 }}>
                    {s.titre}
                  </div>
                  <div style={{ fontSize: 13, color: '#d1d5db', lineHeight: 1.7 }}>
                    {s.contenu}
                  </div>
                  {i < portrait.sections.length - 1 && (
                    <div style={{ height: 1, background: '#1f1f2e', marginTop: 18 }} />
                  )}
                </div>
              ))}
              <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                <button
                  onClick={() => {
                    const text = portrait.sections.map(s => `${s.titre}\n${s.contenu}`).join('\n\n');
                    navigator.clipboard?.writeText(text).catch(() => {});
                  }}
                  style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: '1px solid #a78bfa30', background: 'transparent', color: '#a78bfa', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Copier le portrait
                </button>
                <button
                  onClick={() => { setPortrait(null); setPortraitStatus('idle'); if (astro) localStorage.removeItem(getPortraitCacheKey(astro)); }}
                  style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${P.cardBdr}`, background: 'transparent', color: P.textDim, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Regénérer
                </button>
              </div>
            </div>
          )}
        </Cd>
      </Sec>

            {astro.tr.length > 0 && (
        <Sec icon="🔮" title="Transits du jour — Influences actuelles">
          <Cd>
            <div style={{ fontSize: 12, color: P.textDim, marginBottom: 10, lineHeight: 1.5 }}>
              Les planètes actuelles activent certains points de votre thème natal. Un transit <strong style={{ color: P.gold }}>EXACT</strong> est au sommet de son influence.
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              {astro.tr.slice(0, 10).map((t, i) => {
                const vibe = ASPECT_VIBE[t.t];
                const tdesc = TRANSIT_DESC[t.t] || '';
                return (
                  <div key={i} style={{ padding: '10px 12px', background: t.x ? `${P.gold}0C` : P.bg, borderRadius: 8, border: t.x ? `1px solid ${P.gold}30` : `1px solid ${P.textDim}15` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 10, color: vibe?.col || P.textDim, fontWeight: 600, background: (vibe?.col || P.textDim) + '15', padding: '1px 5px', borderRadius: 3 }}>{vibe?.label || t.t}</span>
                      {t.x ? <span style={{ fontSize: 9, color: P.gold, fontWeight: 700, background: P.gold + '18', padding: '1px 5px', borderRadius: 3 }}>EXACT</span> : null}
                      <span style={{ fontSize: 10, color: P.textDim, marginLeft: 'auto' }}>{t.o.toFixed(1)}°</span>
                    </div>
                    <div style={{ fontSize: 13, color: P.textMid, lineHeight: 1.5 }}>
                      <strong style={{ color: P.gold }}>{PLANET_FR[t.tp]}</strong> {tdesc} votre <strong style={{ color: P.text }}>{PLANET_FR[t.np]}</strong> natal{t.np === 'venus' || t.np === 'moon' ? 'e' : ''}.
                    </div>
                  </div>
                );
              })}
            </div>
          </Cd>
        </Sec>
      )}
    </div>
  );
}
