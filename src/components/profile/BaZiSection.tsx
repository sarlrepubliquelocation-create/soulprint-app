import { Sec, Cd, P } from '../ui';
import { intro } from './shared';
import type { ProfileData, SoulData } from '../../engines/orchestrator';

type Desc = { q: string; v: string; desc: string };

const CZ_TRAITS: Record<string, Desc> = {
  'Rat':     { q: 'Intelligent, débrouillard, charismatique, excellent stratège social', v: 'Peut être calculateur, anxieux, tendance à accumuler', desc: 'Le Rat est le stratège social du zodiaque — il repère les opportunités avant tout le monde et sait tisser un réseau puissant.' },
  'Bœuf':   { q: 'Fiable, patient, méthodique, force tranquille', v: 'Entêtement, résistance au changement, difficulté à déléguer', desc: 'Le Bœuf est le pilier — sa force réside dans la persévérance. Ce qu\'il construit dure dans le temps.' },
  'Tigre':   { q: 'Courageux, magnétique, leader naturel, protecteur', v: 'Impulsivité, goût du risque excessif, difficulté avec l\'autorité', desc: 'Le Tigre est le guerrier charismatique — son énergie inspire mais peut aussi intimider.' },
  'Lapin':   { q: 'Diplomate, raffiné, intuitif, sens esthétique aiguisé', v: 'Évitement des conflits, indécision, fragilité émotionnelle', desc: 'Le Lapin excelle dans l\'art de la négociation et de la nuance — sa douceur cache une intelligence redoutable.' },
  'Dragon':  { q: 'Ambitieux, charismatique, audacieux, visionnaire', v: 'Ego surdimensionné, intolérance à la critique, perfectionnisme', desc: 'Le Dragon est la force de la nature — né pour les grandes réalisations, il attire naturellement l\'attention et le respect.' },
  'Serpent': { q: 'Intuitif, sage, perspicace, charisme discret et profond', v: 'Méfiance excessive, tendance au secret, possessivité', desc: 'Le Serpent est le stratège silencieux — son intelligence est aiguë et sa patience redoutable. Il voit ce que les autres ne voient pas.' },
  'Cheval':  { q: 'Énergique, sociable, aventurier, travailleur infatigable', v: 'Impatience, instabilité émotionnelle, difficulté d\'engagement', desc: 'Le Cheval est l\'énergie pure — rapide, passionné, il avance toujours mais doit apprendre à se poser.' },
  'Chèvre':  { q: 'Créatif, empathique, élégant, sens artistique développé', v: 'Dépendance affective, pessimisme, passivité face aux obstacles', desc: 'La Chèvre est l\'artiste sensible — elle a besoin d\'un environnement bienveillant pour s\'épanouir pleinement.' },
  'Singe':   { q: 'Brillant, inventif, adaptable, humour vif et désarmant', v: 'Manipulation, superficialité, difficulté à finir ce qu\'il commence', desc: 'Le Singe est le génie inventif — aucun problème ne lui résiste, mais la constance est son plus grand défi.' },
  'Coq':     { q: 'Organisé, honnête, courageux, perfectionniste méticuleux', v: 'Critique excessive, vanité, besoin constant de validation', desc: 'Le Coq est le perfectionniste flamboyant — franc et méticuleux, il excelle dans l\'exécution impeccable.' },
  'Chien':   { q: 'Loyal, juste, protecteur, sens moral fort et fiable', v: 'Anxiété, pessimisme, difficulté à faire confiance', desc: 'Le Chien est le gardien moral — sa loyauté est absolue mais son inquiétude chronique peut le ronger.' },
  'Cochon':  { q: 'Généreux, sincère, épicurien, tolérant et bon vivant', v: 'Naïveté, excès, difficulté à dire non et à poser des limites', desc: 'Le Cochon est le bon vivant au grand cœur — sa générosité est immense mais il doit se protéger des profiteurs.' },
};

const CZ_ELEM: Record<string, string> = {
  'Métal': 'Discipline, rigueur, détermination. L\'élément Métal aiguise ta capacité de décision et ton sens de la justice.',
  'Eau':   'Intuition, adaptabilité, profondeur. L\'Eau te donne la capacité de contourner les obstacles avec fluidité.',
  'Bois':  'Croissance, créativité, expansion. Le Bois nourrit ta vision à long terme et ta générosité naturelle.',
  'Feu':   'Passion, charisme, action. Le Feu amplifie ton autorité naturelle et ta capacité à inspirer les autres.',
  'Terre': 'Stabilité, pragmatisme, fiabilité. La Terre t\'ancre dans le concret et renforce la confiance des autres.',
};

interface BaZiSectionProps {
  pd: ProfileData;
  cz: SoulData['cz'];
  gender: 'M' | 'F';
  num: SoulData['num'];
}

export default function BaZiSection({ pd, cz, gender, num }: BaZiSectionProps) {
  try {
    if (!pd.natalBazi || !pd.peachBlossom) return null;
    const natalBazi = pd.natalBazi;
    const peach = pd.peachBlossom;
    const dmStem = natalBazi.dailyStem;
    const peachBranch = peach.peachBranch;
    const peachLabel = peach.label;
    const BAZI_COLORS: Record<string, string> = { 'Bois': '#4ade80', 'Feu': '#ef4444', 'Terre': '#eab308', 'Métal': '#94a3b8', 'Eau': '#60a5fa' };
    const dmColor = BAZI_COLORS[dmStem.element] ?? '#94a3b8';
    
    const czT = CZ_TRAITS[cz.animal] || { q: '–', v: '–', desc: '–' };
    const czE = CZ_ELEM[cz.elem] || '–';

    const { Badge } = require('./shared');

    return (
      <>
        <Sec icon="☯" title={`BaZi 八字 — ${cz.sym} ${cz.animal} de ${cz.elem} · ${dmStem.chinese} ${dmStem.pinyin}`}>
          <Cd>
            <div style={intro}>
              Le <b>BaZi</b> (八字, « Huit Caractères ») est l'un des systèmes de connaissance de soi les plus anciens au monde. Né sous la <b>dynastie Tang</b> (618-907), perfectionné par le maître <b>Xu Ziping</b> sous la dynastie Song (~1000 ap. J.-C.), il est encore consulté par des millions de personnes en Asie pour les décisions de carrière, de partenariat et de moment. Il se fonde sur le <b>calendrier solaire chinois</b> et les cycles des <b>5 éléments</b> (Bois, Feu, Terre, Métal, Eau). <Badge type="fixe" />
            </div>

            {/* ── Signe Chinois (ex-section Zodiaque) ── */}
            <div style={{ fontSize: 10, color: P.gold, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 8 }}>🐉 Ton signe chinois</div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 52, lineHeight: 1, flexShrink: 0 }}>{cz.sym}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: P.text }}>
                  {cz.animal} <span style={{ color: cz.elemCol, fontSize: 14 }}>de {cz.elem}</span>
                  <span style={{ fontSize: 12, color: P.textDim, fontWeight: 400, marginLeft: 8 }}>{cz.yy} · Année {cz.correctedYear}</span>
                </div>
                <div style={{ fontSize: 12, color: P.textMid, marginTop: 6, lineHeight: 1.6 }}>
                  {czT.desc}
                </div>
              </div>
            </div>

            {/* Element */}
            <div style={{ padding: '8px 12px', background: cz.elemCol + '10', borderRadius: 8, borderLeft: `3px solid ${cz.elemCol}40`, marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: cz.elemCol }}>Élément : {cz.elem}</div>
              <div style={{ fontSize: 11, color: P.textMid, lineHeight: 1.5, marginTop: 2 }}>{czE}</div>
            </div>

            {/* Qualités + Vigilance */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              <div style={{ padding: '8px 10px', background: `${P.green}0a`, borderRadius: 8, border: `1px solid ${P.green}18` }}>
                <div style={{ fontSize: 9, color: P.green, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>✦ Qualités</div>
                <div style={{ fontSize: 11, color: P.green, marginTop: 4, lineHeight: 1.5 }}>{czT.q}</div>
              </div>
              <div style={{ padding: '8px 10px', background: '#ef44440a', borderRadius: 8, border: '1px solid #ef444418' }}>
                <div style={{ fontSize: 9, color: '#ef4444', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>⚠ Vigilance</div>
                <div style={{ fontSize: 11, color: '#ef4444aa', marginTop: 4, lineHeight: 1.5 }}>{czT.v}</div>
              </div>
            </div>

            {/* Relations animales */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 16 }}>
              <div style={{ padding: '7px 9px', background: `${P.green}0a`, borderRadius: 6, border: `1px solid ${P.green}18` }}>
                <div style={{ fontSize: 9, color: P.green, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>✦ Alliés (triade)</div>
                <div style={{ fontSize: 12, color: P.green, marginTop: 2 }}>{cz.compat.map(c => c.s + ' ' + c.a).join(' · ')}</div>
                <div style={{ fontSize: 9, color: P.textDim, marginTop: 2 }}>Énergie complémentaire naturelle</div>
              </div>
              <div style={{ padding: '7px 9px', background: `${P.gold}0a`, borderRadius: 6, border: `1px solid ${P.gold}18` }}>
                <div style={{ fontSize: 9, color: P.gold, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>✦ Ami secret (六合)</div>
                <div style={{ fontSize: 12, color: P.gold, marginTop: 2 }}>{cz.sf.s} {cz.sf.a}</div>
                <div style={{ fontSize: 9, color: P.textDim, marginTop: 2 }}>Affinité naturelle cachée — complicité instinctive</div>
              </div>
              <div style={{ padding: '7px 9px', background: `${P.red}0a`, borderRadius: 6, border: `1px solid ${P.red}18` }}>
                <div style={{ fontSize: 9, color: P.red, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>⚡ Opposition (六冲)</div>
                <div style={{ fontSize: 12, color: P.red, marginTop: 2 }}>{cz.clash.s} {cz.clash.a}</div>
                <div style={{ fontSize: 9, color: P.textDim, marginTop: 2 }}>Opposition frontale — relation de tension</div>
              </div>
              <div style={{ padding: '7px 9px', background: `${P.orange}0a`, borderRadius: 6, border: `1px solid ${P.orange}18` }}>
                <div style={{ fontSize: 9, color: P.orange, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>⚠ Tensions</div>
                <div style={{ fontSize: 12, color: P.orange, marginTop: 2 }}>
                  {cz.harm ? <>{cz.harm.s} {cz.harm.a} (friction subtile)</> : '—'}
                  {cz.pun && <span style={{ marginLeft: 6, color: P.orange + '88' }}>⊘ {cz.pun.s} {cz.pun.a}</span>}
                </div>
                <div style={{ fontSize: 9, color: P.textDim, marginTop: 2 }}>Frictions subtiles — vigilance recommandée</div>
              </div>
            </div>

            {/* ── Séparateur vers Pilier du Jour ── */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginBottom: 16 }} />
            <div style={{ fontSize: 10, color: '#ef4444', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 8 }}>☯ Pilier du Jour — {dmStem.chinese} <span style={{ opacity: 0.7, fontWeight: 500 }}>{dmStem.pinyin}</span></div>
            <div style={{ fontSize: 11, color: P.textDim, lineHeight: 1.6, marginBottom: 12, fontStyle: 'italic' }}>
              Ton Pilier du Jour — la combinaison de ton Tronc Céleste et de ta Branche Terrestre au moment de ta naissance — est ton ADN énergétique. La <b>Fleur de Pêcher</b> (桃花, Táo Huā) indique ton magnétisme naturel et les jours où il est amplifié.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {/* Maître du Jour */}
              <div style={{ padding: '12px 14px', borderRadius: 10, background: `${dmColor}10`, border: `1px solid ${dmColor}25` }}>
                <div style={{ fontSize: 28, textAlign: 'center', marginBottom: 6 }}>{dmStem.chinese}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: P.text, textAlign: 'center' }}>{dmStem.pinyin}</div>
                <div style={{ fontSize: 11, color: dmColor, textAlign: 'center', marginTop: 2 }}>{dmStem.element} {dmStem.yinYang === 'Yang' ? '☀️ Yang' : '🌙 Yin'}</div>
                <div style={{ fontSize: 10, color: P.gold, textAlign: 'center', marginTop: 4, fontWeight: 600 }}>
                  « {dmStem.archetype} »
                </div>
                <div style={{ fontSize: 10, color: P.textDim, textAlign: 'center', marginTop: 4, lineHeight: 1.5 }}>
                  Ton Maître du Jour natal — l'énergie que tu projettes chaque jour
                </div>
              </div>
              {/* Fleur de Pêcher */}
              <div style={{ padding: '12px 14px', borderRadius: 10, background: '#f472b610', border: '1px solid #f472b625' }}>
                <div style={{ fontSize: 28, textAlign: 'center', marginBottom: 6 }}>🌸</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: P.text, textAlign: 'center' }}>{peachLabel}</div>
                <div style={{ fontSize: 11, color: '#f472b6', textAlign: 'center', marginTop: 2 }}>Fleur de Pêcher</div>
                <div style={{ fontSize: 10, color: P.gold, textAlign: 'center', marginTop: 4, fontWeight: 600 }}>
                  {peachBranch.pinyin}
                </div>
                <div style={{ fontSize: 10, color: P.textDim, textAlign: 'center', marginTop: 4, lineHeight: 1.5 }}>
                  Ton charme naturel — amplifié les jours du {peachBranch.label}
                </div>
              </div>
            </div>
          </Cd>
        </Sec>

        {/* Quatre Piliers */}
        {natalBazi.hourlyStem && (
          <Sec icon="四" title="Quatre Piliers 四柱 — Ton Mandala BaZi">
            <Cd>
              <div style={intro}>
                Les Quatre Piliers (Année, Mois, Jour, Heure) forment le mandala de ton BaZi. Chaque pilier a un Tronc Céleste (énergie yang/yin) et une Branche Terrestre (animal). Ensemble, ils révèlent comment ton énergie s'exprime dans les différentes zones de ta vie : les racines (année), les ressources (mois), ton essence (jour), ton expression (heure).
              </div>
              <div className="grid-responsive-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                <div style={{ textAlign: 'center', padding: '12px 10px', borderRadius: 8, background: '#ffffff06', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ fontSize: 10, color: P.gold, textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>Année</div>
                  <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{natalBazi.yearlyStem?.chinese || '–'}</div>
                  <div style={{ fontSize: 10, color: P.textDim, marginBottom: 6 }}>{natalBazi.yearlyBranch?.label || '–'}</div>
                  <div style={{ fontSize: 9, color: P.textDim, fontStyle: 'italic' }}>Origines, cycles de vie profonds</div>
                </div>
                <div style={{ textAlign: 'center', padding: '12px 10px', borderRadius: 8, background: '#ffffff06', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ fontSize: 10, color: P.gold, textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>Mois</div>
                  <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{natalBazi.monthlyStem?.chinese || '–'}</div>
                  <div style={{ fontSize: 10, color: P.textDim, marginBottom: 6 }}>{natalBazi.monthlyBranch?.label || '–'}</div>
                  <div style={{ fontSize: 9, color: P.textDim, fontStyle: 'italic' }}>Ressources, influences parentales</div>
                </div>
                <div style={{ textAlign: 'center', padding: '12px 10px', borderRadius: 8, background: `${dmColor}0c`, border: `1px solid ${dmColor}22` }}>
                  <div style={{ fontSize: 10, color: dmColor, textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>Jour</div>
                  <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, color: dmColor }}>{dmStem.chinese}</div>
                  <div style={{ fontSize: 10, color: P.textDim, marginBottom: 6 }}>{natalBazi.dailyBranch?.label || '–'}</div>
                  <div style={{ fontSize: 9, color: P.textDim, fontStyle: 'italic' }}>Essence, identité profonde</div>
                </div>
                <div style={{ textAlign: 'center', padding: '12px 10px', borderRadius: 8, background: '#ffffff06', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ fontSize: 10, color: P.gold, textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>Heure</div>
                  <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{natalBazi.hourlyStem?.chinese || '–'}</div>
                  <div style={{ fontSize: 10, color: P.textDim, marginBottom: 6 }}>{natalBazi.hourlyBranch?.label || '–'}</div>
                  <div style={{ fontSize: 9, color: P.textDim, fontStyle: 'italic' }}>Expression, destinée finale</div>
                </div>
              </div>
            </Cd>
          </Sec>
        )}

        {/* Grands Cycles 大運 */}
        {pd.luckPillars && pd.luckPillars.length > 0 && (
          <Sec icon="🔮" title="Grands Cycles 大運 — Tes Décennies de Vie">
            <Cd>
              <div style={intro}>
                Les Grands Cycles (大運) sont des périodes de 10 ans, chacune gouvernée par un Tronc Céleste et une Branche Terrestre différents. Ils montrent les thèmes énergétiques qui se déploient à chaque décennie de ta vie. Tu es actuellement dans le cycle marqué par tes influences énergétiques de cette époque.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
                {pd.luckPillars.map((lp, i) => (
                  <div key={i} style={{ padding: '12px 12px', borderRadius: 8, background: lp.isCurrent ? `${P.gold}0c` : '#ffffff04', border: `1px solid ${lp.isCurrent ? P.gold + '22' : P.cardBdr}` }}>
                    <div style={{ fontSize: 10, color: P.gold, textTransform: 'uppercase', fontWeight: 700, marginBottom: 4 }}>
                      {lp.isCurrent ? '✦ Courant' : `Cycle ${i + 1}`}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: P.text, marginBottom: 2 }}>
                      {lp.stem.chinese} {lp.branch.label}
                    </div>
                    <div style={{ fontSize: 9, color: P.textDim, marginBottom: 4 }}>
                      {lp.startAge}–{lp.endAge} ans
                    </div>
                    {lp.narrative && (
                      <div style={{ fontSize: 9, color: P.textDim, lineHeight: 1.4 }}>
                        {lp.narrative}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Cd>
          </Sec>
        )}
      </>
    );
  } catch {
    return null;
  }
}
