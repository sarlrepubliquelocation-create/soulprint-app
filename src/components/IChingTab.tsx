import { type SoulData } from '../App';
import { getNumberInfo } from '../engines/numerology';
import { SIGN_FR, SIGN_SYM } from '../engines/astrology';
import { TRIGRAM_NAMES } from '../engines/iching';
import { Sec, Cd } from './ui';

export default function IChingTab({ data }: { data: SoulData }) {
  const { num, astro, cz, iching } = data;

  return (
    <div>
      <Sec icon="☰" title={`Hexagramme ${iching.hexNum} — ${iching.name}`}>
        <Cd>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            {/* Hexagram lines */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center' }}>
              {[...iching.lines].reverse().map((l, i) => {
                const lineIdx = 5 - i;
                const isChanging = lineIdx === iching.changing;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {l === 1
                      ? <div style={{ width: 60, height: 6, background: isChanging ? '#FFD700' : '#9370DB', borderRadius: 3, boxShadow: isChanging ? '0 0 8px #FFD70066' : 'none' }} />
                      : <div style={{ display: 'flex', gap: 8 }}>
                          <div style={{ width: 24, height: 6, background: isChanging ? '#FFD700' : '#9370DB', borderRadius: 3 }} />
                          <div style={{ width: 24, height: 6, background: isChanging ? '#FFD700' : '#9370DB', borderRadius: 3 }} />
                        </div>
                    }
                    {isChanging && <span style={{ fontSize: 8, color: '#FFD700' }}>◀</span>}
                  </div>
                );
              })}
              <div style={{ fontSize: 8, color: '#5a5270', marginTop: 4 }}>
                {TRIGRAM_NAMES[iching.upper]} / {TRIGRAM_NAMES[iching.lower]}
              </div>
            </div>

            {/* Details */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#e8e0f0' }}>{iching.name}</div>
              <div style={{ fontSize: 14, color: '#9370DB', fontWeight: 600, marginTop: 4 }}>→ {iching.keyword}</div>
              <div style={{ marginTop: 10, fontSize: 11, color: '#b8b0cc', lineHeight: 1.7 }}>
                {iching.desc}
              </div>
              <div style={{ marginTop: 10, fontSize: 11, color: '#b8b0cc', lineHeight: 1.6 }}>
                Trigramme intérieur : <b style={{ color: '#9370DB' }}>{TRIGRAM_NAMES[iching.lower]}</b> (ton énergie profonde)<br />
                Trigramme extérieur : <b style={{ color: '#FF69B4' }}>{TRIGRAM_NAMES[iching.upper]}</b> (l'énergie du jour)<br />
                Ligne mutante : <b style={{ color: '#FFD700' }}>{iching.changing + 1}</b>/6 (point de transformation)
              </div>
            </div>
          </div>

          {/* Convergence box */}
          <div style={{ marginTop: 16, padding: 12, background: '#9370DB08', borderRadius: 8, border: '1px solid #9370DB15' }}>
            <div style={{ fontSize: 10, color: '#9370DB', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>✦ Convergence du jour</div>
            <div style={{ fontSize: 11, color: '#b8b0cc', lineHeight: 1.7 }}>
              Personal Day <b style={{ color: getNumberInfo(num.ppd.v).c }}>{num.ppd.v}</b> ({getNumberInfo(num.ppd.v).k})
              {' + '}Hexagramme <b style={{ color: '#9370DB' }}>{iching.hexNum}</b> ({iching.name})
              {astro && <>{' + '}{SIGN_SYM[astro.b3.sun]} {SIGN_FR[astro.b3.sun]}</>}
              {' + '}{cz.sym} {cz.animal}
            </div>
          </div>
        </Cd>
      </Sec>
    </div>
  );
}
