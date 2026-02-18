import { type SoulData } from '../App';
import { getNumberInfo, KARMIC_MEANINGS } from '../engines/numerology';
import { SIGN_FR, SIGN_SYM } from '../engines/astrology';
import { Orb, Sec, Cd } from './ui';

export default function ProfileTab({ data }: { data: SoulData }) {
  const { num, astro, cz, iching } = data;

  return (
    <div>
      {/* Nombres Fondamentaux */}
      <Sec icon="✦" title="Nombres Fondamentaux">
        <Cd>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
            {([['CdV', num.lp], ['Expr', num.expr], ['Soul', num.soul], ['Pers', num.pers], ['Mat', num.mat], ['BDay', num.bday]] as const).map(([l, v]) => (
              <Orb key={l} v={v.v} sz={52} lb={l} sub={getNumberInfo(v.v).k} gl={l === 'CdV'} />
            ))}
          </div>
        </Cd>
      </Sec>

      {/* Chaldéen */}
      <Sec icon="☿" title="Chaldéen">
        <Cd>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Orb v={num.ch.rd.v} sz={52} lb="Chaldéen" />
            <div>
              <div style={{ fontSize: 12, color: '#b8b0cc' }}>
                Composé <b style={{ fontSize: 16 }}>{num.ch.cp}</b> → <b style={{ color: getNumberInfo(num.ch.rd.v).c }}>{num.ch.rd.v}</b>
              </div>
            </div>
          </div>
        </Cd>
      </Sec>

      {/* Zodiaque Chinois */}
      <Sec icon="🐉" title={`Zodiaque Chinois — ${cz.czY}`}>
        <Cd>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 48, lineHeight: 1 }}>{cz.sym}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#e8e0f0' }}>
                {cz.animal} <span style={{ color: cz.elemCol, fontSize: 13 }}>de {cz.elem}</span>
              </div>
              <div style={{ fontSize: 11, color: '#9890aa', marginTop: 2 }}>{cz.yy}</div>
              <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                <div style={{ padding: '6px 8px', background: '#4ade8008', borderRadius: 6, border: '1px solid #4ade8015' }}>
                  <div style={{ fontSize: 7, color: '#4ade80', textTransform: 'uppercase', letterSpacing: 1 }}>✦ Affinités</div>
                  <div style={{ fontSize: 11, color: '#4ade80' }}>{cz.compat.map(c => c.s + ' ' + c.a).join(' · ')}</div>
                </div>
                <div style={{ padding: '6px 8px', background: '#FFD70008', borderRadius: 6, border: '1px solid #FFD70015' }}>
                  <div style={{ fontSize: 7, color: '#FFD700', textTransform: 'uppercase', letterSpacing: 1 }}>✦ Ami secret</div>
                  <div style={{ fontSize: 11, color: '#FFD700' }}>{cz.sf.s} {cz.sf.a}</div>
                </div>
                <div style={{ padding: '6px 8px', background: '#ef444408', borderRadius: 6, border: '1px solid #ef444415' }}>
                  <div style={{ fontSize: 7, color: '#ef4444', textTransform: 'uppercase', letterSpacing: 1 }}>⚡ Clash</div>
                  <div style={{ fontSize: 11, color: '#ef4444' }}>{cz.clash.s} {cz.clash.a}</div>
                </div>
                <div style={{ padding: '6px 8px', background: '#f9731608', borderRadius: 6, border: '1px solid #f9731615' }}>
                  <div style={{ fontSize: 7, color: '#f97316', textTransform: 'uppercase', letterSpacing: 1 }}>⚠ Tensions</div>
                  <div style={{ fontSize: 11, color: '#f97316' }}>
                    {cz.harm ? <>{cz.harm.s} {cz.harm.a}</> : '—'}
                    {cz.pun && <span style={{ marginLeft: 6, color: '#f9731688' }}>⊘ {cz.pun.s} {cz.pun.a}</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Cd>
      </Sec>

      {/* Lo Shu Grid */}
      <Sec icon="⊞" title="Grille Lo Shu">
        <Cd>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 44px)', gap: 4 }}>
              {[
                [4, 9, 2],
                [3, 5, 7],
                [8, 1, 6]
              ].map((row, ri) => row.map((n, ci) => {
                const count = num.ls.grid[ri][ci];
                return (
                  <div key={`${ri}-${ci}`} style={{
                    width: 44, height: 44, borderRadius: 8,
                    background: count > 0 ? getNumberInfo(n).c + '22' : '#0c0a14',
                    border: `1px solid ${count > 0 ? getNumberInfo(n).c + '44' : '#1e1a30'}`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: count > 0 ? getNumberInfo(n).c : '#2a2540' }}>{n}</span>
                    <span style={{ fontSize: 8, color: count > 0 ? '#b8b0cc' : '#1e1a30' }}>×{count}</span>
                  </div>
                );
              }))}
            </div>
            <div style={{ fontSize: 11, color: '#b8b0cc', lineHeight: 1.8 }}>
              <div>Driver: <b style={{ color: getNumberInfo(num.ls.dr.v).c }}>{num.ls.dr.v}</b></div>
              <div>Conductor: <b style={{ color: getNumberInfo(num.ls.co.v).c }}>{num.ls.co.v}</b></div>
            </div>
          </div>
          <div style={{ marginTop: 12, display: 'grid', gap: 4 }}>
            {Object.entries(num.ls.plans).map(([plan, { present, missing }]) => (
              <div key={plan} style={{ fontSize: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#9890aa', width: 100 }}>{plan}</span>
                <span style={{ color: '#4ade80' }}>{present.join(',') || '—'}</span>
                {missing.length > 0 && <span style={{ color: '#ef4444', fontSize: 9 }}>manque {missing.join(',')}</span>}
              </div>
            ))}
          </div>
        </Cd>
      </Sec>

      {/* Vibration du jour */}
      <Sec icon="⏱" title="Vibration du jour">
        <Cd>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20 }}>
            <Orb v={num.py.v} sz={52} lb="Année" sub={getNumberInfo(num.py.v).k} />
            <Orb v={num.pm.v} sz={52} lb="Mois" sub={getNumberInfo(num.pm.v).k} />
            <Orb v={num.ppd.v} sz={52} lb="Jour" sub={getNumberInfo(num.ppd.v).k} gl />
          </div>
        </Cd>
      </Sec>

      {/* Synthèse Multi-Systèmes */}
      <Sec icon="🔮" title="Synthèse Multi-Systèmes">
        <Cd>
          <div style={{ fontSize: 11, color: '#b8b0cc', lineHeight: 1.8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px' }}>
              <span style={{ color: '#9890aa', fontSize: 9 }}>PYTH</span>
              <span>Chemin <b style={{ color: getNumberInfo(num.lp.v).c }}>{num.lp.v}</b> {getNumberInfo(num.lp.v).k} · Expr <b style={{ color: getNumberInfo(num.expr.v).c }}>{num.expr.v}</b> · Âme <b style={{ color: getNumberInfo(num.soul.v).c }}>{num.soul.v}</b></span>
              {astro && <>
                <span style={{ color: '#9890aa', fontSize: 9 }}>ASTRO</span>
                <span>{SIGN_SYM[astro.b3.sun]} <b>{SIGN_FR[astro.b3.sun]}</b> · ☽ <b>{SIGN_FR[astro.b3.moon]}</b>{!astro.noTime && <> · ↑ <b>{SIGN_FR[astro.b3.asc]}</b></>}</span>
              </>}
              <span style={{ color: '#9890aa', fontSize: 9 }}>中</span>
              <span>{cz.sym} <b>{cz.animal}</b> de <b style={{ color: cz.elemCol }}>{cz.elem}</b> · {cz.yy}</span>
              <span style={{ color: '#9890aa', fontSize: 9 }}>CHALD</span>
              <span>Vibration <b style={{ color: getNumberInfo(num.ch.rd.v).c }}>{num.ch.rd.v}</b> {getNumberInfo(num.ch.rd.v).k}</span>
              <span style={{ color: '#9890aa', fontSize: 9 }}>易</span>
              <span>Hex. <b style={{ color: '#9370DB' }}>{iching.hexNum}</b> {iching.name} → <b style={{ color: '#FFD700' }}>{iching.keyword}</b></span>
            </div>
          </div>
        </Cd>
      </Sec>
    </div>
  );
}
