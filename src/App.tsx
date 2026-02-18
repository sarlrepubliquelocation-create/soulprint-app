import { useState, useMemo, useCallback } from 'react';
import { calcNumerology, getNumberInfo, isMaster, type NumerologyProfile } from './engines/numerology';
import { calcAstro, type AstroChart, findCity, SIGN_FR, PLANET_FR } from './engines/astrology';
import { calcChineseZodiac, type ChineseZodiac } from './engines/chinese-zodiac';
import { calcIChing, type IChingReading, TRIGRAM_NAMES } from './engines/iching';
import { calcConvergence, type ConvergenceResult } from './engines/convergence';
import ConvergenceTab from './components/ConvergenceTab';
import ProfileTab from './components/ProfileTab';
import AstroTab from './components/AstroTab';
import IChingTab from './components/IChingTab';
import LectureTab from './components/LectureTab';
import KarmaTab from './components/KarmaTab';
import { Cd } from './components/ui';

const TODAY = '2026-02-18';

export interface SoulData {
  num: NumerologyProfile;
  astro: AstroChart | null;
  cz: ChineseZodiac;
  iching: IChingReading;
  conv: ConvergenceResult;
}

const tabs = [
  { id: 'convergence', l: 'Convergence', i: '⭐' },
  { id: 'profile',     l: 'Profil',      i: '✦' },
  { id: 'astro',       l: 'Astro',       i: '🌙' },
  { id: 'iching',      l: 'I Ching',     i: '☰' },
  { id: 'lecture',      l: 'Lecture IA',  i: '🔮' },
  { id: 'karma',       l: 'Karma',       i: '☸' },
];

export default function App() {
  const [fn, setFn] = useState('Jérôme');
  const [mn, setMn] = useState('José');
  const [ln, setLn] = useState('Miranda');
  const [bd, setBd] = useState('1977-09-23');
  const [bt, setBt] = useState('23:20');
  const [bp, setBp] = useState('Mâcon');
  const [tz, setTz] = useState(2);
  const [tab, setTab] = useState('convergence');
  const [lock, setLock] = useState({ fn: 'Jérôme', mn: 'José', ln: 'Miranda', bd: '1977-09-23', bt: '23:20', bp: 'Mâcon', tz: 2 });

  const dirty = fn !== lock.fn || mn !== lock.mn || ln !== lock.ln || bd !== lock.bd || bt !== lock.bt || bp !== lock.bp || tz !== lock.tz;

  const [narr, setNarr] = useState('');
  const [narrLoad, setNarrLoad] = useState(false);

  const doVal = () => { setLock({ fn, mn, ln, bd, bt, bp, tz }); setTab('convergence'); setNarr(''); };

  const data = useMemo<SoulData | null>(() => {
    const L = lock;
    if (!L.fn || !L.ln || !L.bd) return null;
    try {
      const num = calcNumerology(L.fn, L.mn, L.ln, L.bd, TODAY);
      const astro = calcAstro(L.bd, L.bt, L.bp, L.tz, TODAY);
      const cz = calcChineseZodiac(L.bd);
      const iching = calcIChing(L.bd, TODAY);
      const conv = calcConvergence(num, astro, cz, iching);
      return { num, astro, cz, iching, conv };
    } catch (e) { console.error(e); return null; }
  }, [lock]);

  const genNarr = useCallback(async () => {
    if (!data) return;
    setNarrLoad(true);
    setNarr('');

    const { num, astro, cz, iching, conv } = data;

    let pr = `Tu es un numérologue-astrologue expert. Génère une lecture SoulPrint personnalisée en français (500 mots max), poétique mais concrète. Tutoie la personne.\n\nDONNÉES:\nPrénom: ${lock.fn}\n`;
    pr += `Numérologie: Chemin de vie ${num.lp.v}${num.lp.m ? ' (maître)' : ''} (${getNumberInfo(num.lp.v).k}), Expression ${num.expr.v} (${getNumberInfo(num.expr.v).k}), Âme ${num.soul.v} (${getNumberInfo(num.soul.v).k}), Personnalité ${num.pers.v} (${getNumberInfo(num.pers.v).k})\n`;
    pr += `Chaldéen: vibration ${num.ch.rd.v}\nLeçons karmiques: [${num.kl.join(',')}]\n`;
    if (astro) {
      pr += `Astro: Soleil ${SIGN_FR[astro.b3.sun]}, Lune ${SIGN_FR[astro.b3.moon]}`;
      if (!astro.noTime) pr += `, Ascendant ${SIGN_FR[astro.b3.asc]}`;
      pr += `\nAspects: ${astro.as.slice(0, 5).map(x => `${PLANET_FR[x.p1]} ${x.t} ${PLANET_FR[x.p2]} ${x.o}°`).join(', ')}\n`;
      if (astro.tr.length) pr += `Transits actuels: ${astro.tr.slice(0, 3).map(t => `${PLANET_FR[t.tp]} ${t.t} ${PLANET_FR[t.np]}${t.x ? ' EXACT' : ''}`).join(', ')}\n`;
    }
    pr += `Zodiaque chinois: ${cz.animal} de ${cz.elem}, ${cz.yy}\n`;
    pr += `I Ching du jour: Hexagramme ${iching.hexNum} (${iching.name}), trigrammes ${TRIGRAM_NAMES[iching.lower]}/${TRIGRAM_NAMES[iching.upper]}, ligne mutante ${iching.changing + 1}, conseil: ${iching.keyword}\n`;
    pr += `Convergence Karmique: ${conv.score}% (${conv.level}). Signaux: ${conv.signals.slice(0, 3).join('; ')}\n`;
    pr += `\nÉcris 5 sections:\n🌟 Portrait intérieur (croise numérologie + astro + chinois)\n💫 Forces & talents\n⚡ Défis & leçons karmiques\n🔮 Période actuelle (transits + I Ching du jour)\n✦ Conseil d'évolution (intègre le message de l'hexagramme)\n\n3-4 phrases par section. Profond, bienveillant, concret. Quand plusieurs systèmes convergent sur le même message, souligne-le. Termine par une phrase d'encouragement inspirante et lumineuse, jamais de signature isolée.`;

    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1200, messages: [{ role: 'user', content: pr }] })
      });
      const d = await resp.json();
      const txt = d.content ? d.content.map((b: any) => b.text || '').join('\n') : 'Erreur: ' + JSON.stringify(d);
      setNarr(txt);
    } catch (e: any) { setNarr('⚠ Erreur: ' + e.message); }
    setNarrLoad(false);
  }, [data, lock]);

  const inp: React.CSSProperties = {
    background: '#0c0a14', border: '1.5px solid #1e1a30', borderRadius: 8,
    padding: '10px 12px', color: '#e8e0f0', fontSize: 13, outline: 'none',
    width: '100%', boxSizing: 'border-box', fontFamily: 'inherit'
  };

  return (
    <div style={{ minHeight: '100vh', background: '#080612', color: '#e8e0f0', position: 'relative' }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at 15% 10%,#150e30,transparent 55%),radial-gradient(ellipse at 85% 90%,#0a1525,transparent 50%)' }} />
      <div style={{ position: 'relative', maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h1 style={{ fontSize: 44, fontWeight: 300, margin: 0, letterSpacing: 6, background: 'linear-gradient(135deg,#e8e0f0,#9370DB 50%,#FF69B4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>SoulPrint</h1>
          <div style={{ fontSize: 10, color: '#4a4565', letterSpacing: 3, marginTop: 4 }}>NUMÉROLOGIE · ASTROLOGIE · I CHING · CHINOIS · IA</div>
        </div>

        {/* Form */}
        <Cd sx={{ marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
            {([['Prénom', fn, setFn], ['2e Prénom', mn, setMn], ['Nom naissance', ln, setLn]] as const).map(([l, v, s]) => (
              <div key={l}>
                <label style={{ fontSize: 7, letterSpacing: 2, color: '#4a4565', textTransform: 'uppercase', display: 'block', marginBottom: 3 }}>{l}</label>
                <input value={v} onChange={e => (s as any)(e.target.value)} style={inp} />
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 7, letterSpacing: 2, color: '#4a4565', textTransform: 'uppercase', display: 'block', marginBottom: 3 }}>Date naissance</label>
              <input type="date" value={bd} onChange={e => setBd(e.target.value)} style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 7, letterSpacing: 2, color: '#4a4565', textTransform: 'uppercase', display: 'block', marginBottom: 3 }}>Heure naissance</label>
              <div style={{ display: 'flex', gap: 4 }}>
                <input type="time" value={bt} onChange={e => setBt(e.target.value)} style={{ ...inp, flex: 1, opacity: bt ? 1 : .5 }} />
                <button onClick={() => setBt(bt ? '' : '12:00')} style={{ background: bt ? '#1e1a30' : '#9370DB22', border: '1px solid ' + (bt ? '#3a3060' : '#9370DB44'), borderRadius: 8, padding: '0 8px', cursor: 'pointer', color: bt ? '#5a5270' : '#9370DB', fontSize: 8 }}>?</button>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 7, letterSpacing: 2, color: '#4a4565', textTransform: 'uppercase', display: 'block', marginBottom: 3 }}>Lieu naissance</label>
              <input value={bp} onChange={e => setBp(e.target.value)} style={inp} placeholder="Ville" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10, marginTop: 10 }}>
            <div>
              <label style={{ fontSize: 7, letterSpacing: 2, color: '#4a4565', textTransform: 'uppercase', display: 'block', marginBottom: 3 }}>UTC offset</label>
              <select value={tz} onChange={e => setTz(+e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                {[-5,-4,-3,-2,-1,0,1,2,3,4,5,6,8,10,12].map(v => <option key={v} value={v}>UTC{v >= 0 ? '+' : ''}{v}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'end', gap: 10 }}>
              <button onClick={doVal} disabled={!dirty && !!data} style={{ padding: '10px 24px', background: dirty ? 'linear-gradient(135deg,#9370DB,#FF69B4)' : '#1e1a30', border: 'none', borderRadius: 8, color: dirty ? '#fff' : '#5a5270', fontSize: 13, fontWeight: 700, cursor: dirty ? 'pointer' : 'default', letterSpacing: 1, opacity: dirty || !data ? 1 : .5, fontFamily: 'inherit' }}>
                {data ? '✦ Recalculer' : '✦ Calculer'}
              </button>
              {dirty && <span style={{ fontSize: 10, color: '#FFD700' }}>Modifications non validées</span>}
              {!dirty && data && <span style={{ fontSize: 10, color: '#4ade80' }}>✓ Profil calculé</span>}
            </div>
          </div>
          {bp && <div style={{ marginTop: 6, fontSize: 9, color: findCity(bp) ? '#4ade80' : '#ef4444' }}>{findCity(bp) ? '✓ ' + bp + ' trouvé' : '✗ Ville non trouvée'}</div>}
        </Cd>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: tab === t.id ? '#1a1630' : 'transparent',
              border: '1px solid ' + (tab === t.id ? '#3a3060' : 'transparent'),
              borderRadius: 8, padding: '7px 12px', cursor: 'pointer',
              color: tab === t.id ? '#e8e0f0' : '#4a4565',
              fontSize: 11, fontWeight: tab === t.id ? 600 : 400, whiteSpace: 'nowrap',
              fontFamily: 'inherit'
            }}>{t.i} {t.l}</button>
          ))}
        </div>

        {/* Content */}
        {!data && <Cd><div style={{ textAlign: 'center', color: '#5a5270', padding: 24 }}>Remplis le formulaire et clique Calculer</div></Cd>}
        {data && <>
          {tab === 'convergence' && <ConvergenceTab data={data} />}
          {tab === 'profile' && <ProfileTab data={data} />}
          {tab === 'astro' && <AstroTab data={data} />}
          {tab === 'iching' && <IChingTab data={data} />}
          {tab === 'lecture' && <LectureTab data={data} narr={narr} narrLoad={narrLoad} genNarr={genNarr} />}
          {tab === 'karma' && <KarmaTab data={data} />}
        </>}

        <div style={{ textAlign: 'center', marginTop: 48, fontSize: 8, color: '#2a2540', letterSpacing: 3 }}>SOULPRINT ORACLE v1.0 © 2026</div>
      </div>
    </div>
  );
}
