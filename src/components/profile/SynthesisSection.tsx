import { Sec, Cd, P } from '../ui';
import { getNumberInfo } from '../../engines/numerology';
import { SIGN_FR, SIGN_SYM } from '../../engines/astrology';
import { intro } from './shared';
import type { ProfileData, SoulData } from '../../engines/orchestrator';
import { D, LS_MEANING } from './NumerologySection';

interface SynthesisSectionProps {
  pd: ProfileData;
  num: SoulData['num'];
  astro: SoulData['astro'];
  cz: SoulData['cz'];
  natal: ProfileData['natal'];
  natalProf: ProfileData['natalProf'];
}

export default function SynthesisSection({
  pd,
  num,
  astro,
  cz,
  natal,
  natalProf,
}: SynthesisSectionProps) {
  const lp = num.lp ?? { v: 0, m: false };
  const lpMain = lp.m ? lp : { v: Math.floor(lp.v / 10) + (lp.v % 10) };
  const lpDisplay = lp.m ? `${lp.v}/${lpMain.v}` : `${lpMain.v}`;
  const masterList = (Object.entries(num) as [string, any][])
    .filter(([k, v]) => k !== 'bday' && v != null && typeof v === 'object' && v.m === true)
    .map(([k, v]) => [k, v.v]);
  
  const czT = { q: '', v: '', desc: '' }; // Would be CZ_TRAITS[cz.animal] in real code
  
  const iching = pd.iching || { hexNum: 0, name: '–' };
  
  const lsMissing = Array.from({ length: 9 }, (_, i) => i + 1).filter(
    n => !pd.loShuNumbers?.includes(n)
  );

  return (
    <Sec icon="🔮" title="Synthèse Multi-Systèmes">
      <Cd>
        {/* Data grid */}
        <div style={{ fontSize: 13, color: P.textMid, lineHeight: 2, marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 14px', alignItems: 'baseline' }}>
            <span style={{ color: '#c084fc', fontSize: 10, fontWeight: 700, letterSpacing: 0.5 }}>Numérologie</span>
            <span>Chemin <b style={{ color: getNumberInfo(lpMain.v).c }}>{lpDisplay}</b> {getNumberInfo(lpMain.v).k} · Expr <b style={{ color: getNumberInfo(num.expr.v).c }}>{num.expr.v}</b> · Âme <b style={{ color: getNumberInfo(num.soul.v).c }}>{num.soul.v}</b></span>
            {astro && <>
              <span style={{ color: '#60a5fa', fontSize: 10, fontWeight: 700, letterSpacing: 0.5 }}>Astrologie</span>
              <span>{SIGN_SYM[astro.b3.sun]} <b>{SIGN_FR[astro.b3.sun]}</b> · ☽ <b>{SIGN_FR[astro.b3.moon]}</b>{!astro.noTime && <> · ↑ <b>{SIGN_FR[astro.b3.asc]}</b></>}</span>
            </>}
            <span style={{ color: '#ef4444', fontSize: 10, fontWeight: 700, letterSpacing: 0.5 }}>BaZi 八字</span>
            <span>{cz.sym} <b>{cz.animal}</b> de <b style={{ color: cz.elemCol }}>{cz.elem}</b> · {cz.yy}</span>
            <span style={{ color: '#4ade80', fontSize: 10, fontWeight: 700, letterSpacing: 0.5 }}>Chaldéen</span>
            <span>Vibration <b style={{ color: getNumberInfo(num.ch.rd.v).c }}>{num.ch.rd.v}</b> {getNumberInfo(num.ch.rd.v).k}</span>
            <span style={{ color: P.gold, fontSize: 10, fontWeight: 700, letterSpacing: 0.5 }}>Yi King 易經</span>
            <span>Natal <b style={{ color: P.gold }}>{natal.hexNum}</b> {natal.name} · Jour <b style={{ color: P.gold }}>{iching.hexNum}</b> {iching.name}</span>
          </div>
        </div>

        {/* ── TES FORCES ── */}
        <div style={{ padding: '12px 14px', background: `${P.green}08`, borderRadius: 10, border: `1px solid ${P.green}20`, marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: P.green, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 8 }}>✦ Tes forces — ce que les systèmes confirment</div>
          <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.7 }}>
            Ton Chemin de Vie <b style={{ color: P.gold }}>{lpDisplay}</b> ({getNumberInfo(lpMain.v).k}) te donne une mission claire.
            {' '}Ton Expression <b>{num.expr.v}</b> ({getNumberInfo(num.expr.v).k}) te donne les outils pour y arriver.
            {masterList.length > 1 && <> Avec <b style={{ color: P.gold }}>{masterList.length} nombres maîtres</b>, tu portes une vibration rare qui amplifie ton potentiel.</>}

            {astro && <>
              {' '}En astrologie, ton Soleil en <b>{SIGN_FR[astro.b3.sun]}</b> alimente ton énergie primaire, ta Lune en <b>{SIGN_FR[astro.b3.moon]}</b> nourrit ton monde émotionnel
              {!astro.noTime && <>, et ton Ascendant <b>{SIGN_FR[astro.b3.asc]}</b> projette ton image au monde</>}
              {astro.noTime && '.'}
            </>}

            {' '}Le <b style={{ color: cz.elemCol }}>{cz.animal} de {cz.elem}</b> amplifie cette configuration avec ses propres forces uniques.

            {' '}Ton archétype Yi King natal « <b style={{ color: P.gold }}>{natalProf.archetype}</b> » (Hex. {natal.hexNum}) confirme cette trajectoire.
          </div>
        </div>

        {/* ── POINTS D'ATTENTION ── */}
        <div style={{ padding: '12px 14px', background: '#ef444408', borderRadius: 10, border: '1px solid #ef444420', marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: '#ef4444', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 8 }}>⚠ Points de vigilance — ce qui peut te freiner</div>
          <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.7 }}>
            {D[lpMain.v]?.cdv?.v && <>Ton CdV {lpDisplay} a un angle mort : {D[lpMain.v].cdv.v.charAt(0).toLowerCase() + D[lpMain.v].cdv.v.slice(1)} </>}
            {D[num.expr.v]?.expr?.v && num.expr.v !== lpMain.v && <>Côté expression ({num.expr.v}), surveille le {D[num.expr.v].expr.v.charAt(0).toLowerCase() + D[num.expr.v].expr.v.slice(1)} </>}
            {czT?.v && <>En zodiaque chinois, le {cz.animal} doit surveiller : {czT.v.toLowerCase()}. </>}
            {lsMissing.length > 0 && (() => {
              const coreNumbers = new Set([lpMain.v, num.expr.v, num.soul.v, num.pers.v, num.mat.v, num.bday.v].filter(v => v <= 9));
              const compensated = lsMissing.filter(n => coreNumbers.has(n));
              const trulyMissing = lsMissing.filter(n => !coreNumbers.has(n));
              return <>
                {trulyMissing.length > 0 && <>Ta grille Lo Shu manque les énergies {trulyMissing.join(', ')} — des axes à développer consciemment. </>}
                {compensated.length > 0 && <>
                  {trulyMissing.length > 0 ? 'En revanche, les' : 'Les'} énergies {compensated.join(', ')} sont absentes de ta date mais compensées par tes nombres fondamentaux.{' '}
                </>}
              </>;
            })()}
            {natalProf.risk && <>Le Yi King t'avertit aussi : {natalProf.risk.charAt(0).toLowerCase() + natalProf.risk.slice(1)}</>}
          </div>
        </div>

        {/* ── CONCLUSION ── */}
        <div style={{ padding: '14px 16px', background: `${P.gold}08`, borderRadius: 10, border: `1px solid ${P.gold}25` }}>
          <div style={{ fontSize: 11, color: P.gold, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 8 }}>🎯 Ton point d\'équilibre</div>
          <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.7 }}>
            Ces quatre systèmes — numérologie, astrologie, astrologie chinoise et Yi King — parlent le même langage : celui de <b>l'énergie qui te traverse</b>.
            <br /><br />
            La cohérence entre tous ces systèmes est ta confirmation. <b>Chacun te dit la même chose, juste avec des mots différents.</b> C'est puissant.
            <br /><br />
            Si tu ressens une résistance entre eux — par exemple si ton Chemin de Vie te dit une chose mais ton Soleil astrologique une autre — ce n'est pas une contradiction. C'est une tension créative. Les meilleures vies sont souvent construites en naviguant ces tensions, en trouvant l'équilibre.
            <br /><br />
            <b>Ta mission cette année :</b> Laisse ces systèmes te guider non pas vers une certitude absolue, mais vers une <b>clarté de direction</b>. Relis ce profil dans les moments clés. Chaque fois que tu dois choisir, tu sauras. Chaque fois que tu dois avancer, tu auras du courage. Chaque fois que tu dois ralentir, tu auras de la sagesse.
          </div>
        </div>

        {/* ── Disclaimer ── */}
        <div style={{ marginTop: 12, padding: '10px 12px', background: '#ffffff04', borderRadius: 8, border: `1px solid ${P.cardBdr}` }}>
          <div style={{ fontSize: 9, color: P.textDim, lineHeight: 1.6 }}>
            <b>Disclaimer :</b> Ce profil est une synthèse de quatre traditions anciennes de sagesse — numérologie, astrologie, astrologie chinoise et Yi King. Aucune n'est « vraie » au sens scientifique. Mais ensemble, elles créent un miroir puissant de qui tu es vraiment. Utilise ce profil comme un outil de réflexion et d'auto-compréhension, pas comme un destin immuable.
          </div>
        </div>
      </Cd>
    </Sec>
  );
}
