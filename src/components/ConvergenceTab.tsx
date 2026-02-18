import { type SoulData } from '../App';
import { getNumberInfo } from '../engines/numerology';
import { SIGN_FR, SIGN_SYM } from '../engines/astrology';
import { Sec, Cd } from './ui';

export default function ConvergenceTab({ data }: { data: SoulData }) {
  const { num, astro, cz, iching, conv } = data;
  const cv = conv;

  return (
    <div>
      <Sec icon="⭐" title="Convergence Karmique du Jour">
        <Cd>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ position: 'relative', width: 160, height: 160, margin: '0 auto' }}>
              <svg width="160" height="160" viewBox="0 0 160 160">
                <circle cx="80" cy="80" r="68" fill="none" stroke="#1e1a30" strokeWidth="12" />
                <circle cx="80" cy="80" r="68" fill="none" stroke={cv.lCol} strokeWidth="12"
                  strokeDasharray={2 * Math.PI * 68} strokeDashoffset={2 * Math.PI * 68 * (1 - cv.score / 100)}
                  strokeLinecap="round" transform="rotate(-90 80 80)"
                  style={{ filter: `drop-shadow(0 0 12px ${cv.lCol}66)`, transition: 'stroke-dashoffset 1s ease' }} />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 42, fontWeight: 700, color: cv.lCol }}>{cv.score}</span>
                <span style={{ fontSize: 12, color: cv.lCol + 'aa' }}>%</span>
              </div>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: cv.lCol, marginTop: 12 }}>{cv.level}</div>
            <div style={{ fontSize: 11, color: '#5a5270', marginTop: 4 }}>
              18 février 2026 · Personal Day {num.ppd.v} ({getNumberInfo(num.ppd.v).k}) · Thème : {cv.theme}
            </div>
          </div>

          {cv.signals.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 9, color: '#4ade80', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>✦ Signaux positifs</div>
              {cv.signals.map((s, i) => (
                <div key={i} style={{ fontSize: 11, color: '#b8b0cc', padding: '5px 10px', marginBottom: 3, background: '#4ade8008', borderRadius: 6, borderLeft: '2px solid #4ade8044', lineHeight: 1.6 }}>{s}</div>
              ))}
            </div>
          )}

          {cv.alerts.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 9, color: '#f97316', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>⚠ Points de vigilance</div>
              {cv.alerts.map((a, i) => (
                <div key={i} style={{ fontSize: 11, color: '#b8b0cc', padding: '5px 10px', marginBottom: 3, background: '#f9731608', borderRadius: 6, borderLeft: '2px solid #f9731644', lineHeight: 1.6 }}>{a}</div>
              ))}
            </div>
          )}

          <div style={{ marginTop: 16, padding: 12, background: '#0c0a14', borderRadius: 8, border: '1px solid #1e1a30' }}>
            <div style={{ fontSize: 9, color: '#9370DB', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>✦ Croisement 5 systèmes</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <div style={{ fontSize: 10, color: '#b8b0cc', padding: '6px 8px', background: '#1e1a3044', borderRadius: 6 }}>
                ✦ Numéro <b style={{ color: getNumberInfo(num.ppd.v).c }}>{num.ppd.v}</b> {getNumberInfo(num.ppd.v).k}
              </div>
              <div style={{ fontSize: 10, color: '#b8b0cc', padding: '6px 8px', background: '#1e1a3044', borderRadius: 6 }}>
                ☰ Hex. <b style={{ color: '#9370DB' }}>{iching.hexNum}</b> {iching.name}
              </div>
              {astro && (
                <div style={{ fontSize: 10, color: '#b8b0cc', padding: '6px 8px', background: '#1e1a3044', borderRadius: 6 }}>
                  {SIGN_SYM[astro.b3.sun]} {SIGN_FR[astro.b3.sun]} · {astro.tr.length} transits
                </div>
              )}
              <div style={{ fontSize: 10, color: '#b8b0cc', padding: '6px 8px', background: '#1e1a3044', borderRadius: 6 }}>
                {cz.sym} {cz.animal} <span style={{ color: cz.elemCol }}>{cz.elem}</span>
              </div>
              <div style={{ fontSize: 10, color: '#b8b0cc', padding: '6px 8px', background: '#1e1a3044', borderRadius: 6, gridColumn: '1/-1' }}>
                ☿ Chaldéen <b style={{ color: getNumberInfo(num.ch.rd.v).c }}>{num.ch.rd.v}</b> · CdV <b style={{ color: getNumberInfo(num.lp.v).c }}>{num.lp.v}</b> · Année <b style={{ color: getNumberInfo(num.py.v).c }}>{num.py.v}</b>
              </div>
            </div>
          </div>
        </Cd>
      </Sec>
    </div>
  );
}
