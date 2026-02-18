import { type SoulData } from '../App';
import { SIGN_FR, SIGN_SYM, SIGN_ELEM, PLANET_FR, ASPECT_SYM, ASPECT_COL, ELEM_FR, ELEM_COL } from '../engines/astrology';
import { Sec, Cd } from './ui';

export default function AstroTab({ data }: { data: SoulData }) {
  const { astro } = data;

  if (!astro) return (
    <Sec icon="🌙" title="Thème Astral">
      <Cd>
        <div style={{ textAlign: 'center', color: '#5a5270', padding: 16 }}>
          <div>Renseigne une ville de naissance valide pour le thème astral.</div>
          <div style={{ marginTop: 8, fontSize: 9, color: '#4a4565' }}>Villes FR : Paris, Lyon, Marseille, Mâcon, Toulouse, Carcassonne...</div>
        </div>
      </Cd>
    </Sec>
  );

  return (
    <div>
      {/* Big Three */}
      <Sec icon="🌙" title={astro.noTime ? 'Luminaires' : 'Big Three'}>
        <Cd>
          {astro.noTime && <div style={{ marginBottom: 10, padding: '5px 10px', background: '#9370DB11', borderRadius: 6, fontSize: 9, color: '#9370DB', textAlign: 'center' }}>⏱ Heure inconnue — calcul à midi.</div>}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 28 }}>
            {(astro.noTime
              ? [['☉', astro.b3.sun, 'Soleil'], ['☽', astro.b3.moon, 'Lune']]
              : [['☉', astro.b3.sun, 'Soleil'], ['☽', astro.b3.moon, 'Lune'], ['↑', astro.b3.asc, 'Ascendant']]
            ).map(([sym, s, lb]) => (
              <div key={lb} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 36, color: ELEM_COL[SIGN_ELEM[s]] || '#9890aa' }}>{SIGN_SYM[s] || '?'}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#e8e0f0' }}>{SIGN_FR[s]}</div>
                <div style={{ fontSize: 9, color: '#5a5270' }}>{lb}</div>
              </div>
            ))}
          </div>
        </Cd>
      </Sec>

      {/* Planètes */}
      <Sec icon="🪐" title="Planètes">
        <Cd>
          <div style={{ display: 'grid', gap: 4 }}>
            {astro.pl.map(pl => {
              const c = ELEM_COL[SIGN_ELEM[pl.s]] || '#9890aa';
              return (
                <div key={pl.k} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', background: c + '08', borderRadius: 6 }}>
                  <span style={{ width: 20, fontSize: 13, color: c }}>{PLANET_FR[pl.k]?.charAt(0) || ''}</span>
                  <span style={{ flex: 1, fontSize: 12, color: '#b8b0cc' }}>{PLANET_FR[pl.k]}</span>
                  <span style={{ fontSize: 14, color: c }}>{SIGN_SYM[pl.s]}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#e8e0f0', width: 80 }}>{SIGN_FR[pl.s]} {pl.d.toFixed(1)}°</span>
                  {!astro.noTime && <span style={{ fontSize: 9, color: '#5a5270' }}>M{pl.h}</span>}
                </div>
              );
            })}
          </div>
        </Cd>
      </Sec>

      {/* Aspects */}
      {astro.as.length > 0 && (
        <Sec icon="⚡" title="Aspects majeurs">
          <Cd>
            <div style={{ display: 'grid', gap: 3 }}>
              {astro.as.slice(0, 12).map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, padding: '3px 6px', background: ASPECT_COL[a.t] + '08', borderRadius: 4 }}>
                  <span style={{ color: ASPECT_COL[a.t], fontWeight: 600, width: 60 }}>{PLANET_FR[a.p1]}</span>
                  <span style={{ color: ASPECT_COL[a.t], fontSize: 14 }}>{ASPECT_SYM[a.t]}</span>
                  <span style={{ color: ASPECT_COL[a.t], fontWeight: 600, width: 60 }}>{PLANET_FR[a.p2]}</span>
                  <span style={{ color: '#5a5270', fontSize: 9, marginLeft: 'auto' }}>{a.o}°</span>
                </div>
              ))}
            </div>
          </Cd>
        </Sec>
      )}

      {/* Éléments */}
      {astro.el && (
        <Sec icon="🌊" title="Éléments">
          <Cd>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {Object.entries(astro.el).map(([k, v]) => {
                const mx = Math.max(...Object.values(astro.el));
                return (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, width: 60, color: ELEM_COL[k] }}>{ELEM_FR[k]}</span>
                    <div style={{ flex: 1, height: 12, background: '#0c0a14', borderRadius: 6, overflow: 'hidden' }}>
                      <div style={{ width: (v / mx * 100) + '%', height: '100%', background: ELEM_COL[k] + '88', borderRadius: 6 }} />
                    </div>
                    <span style={{ fontSize: 10, color: '#b8b0cc', width: 20 }}>{v.toFixed(0)}</span>
                  </div>
                );
              })}
            </div>
          </Cd>
        </Sec>
      )}

      {/* Transits */}
      {astro.tr.length > 0 && (
        <Sec icon="🔮" title="Transits du jour">
          <Cd>
            <div style={{ display: 'grid', gap: 4 }}>
              {astro.tr.slice(0, 10).map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, padding: '4px 8px', background: t.x ? '#FFD70011' : '#0a0816', borderRadius: 6, border: t.x ? '1px solid #FFD70033' : '1px solid transparent' }}>
                  <span style={{ fontWeight: 600, color: '#9370DB' }}>{PLANET_FR[t.tp]}</span>
                  <span style={{ color: ASPECT_COL[t.t] }}>{ASPECT_SYM[t.t]}</span>
                  <span style={{ fontWeight: 600, color: '#b8b0cc' }}>{PLANET_FR[t.np]} natal</span>
                  <span style={{ fontSize: 9, color: '#5a5270', marginLeft: 'auto' }}>{t.o}°{t.x ? ' EXACT' : ''}</span>
                </div>
              ))}
            </div>
          </Cd>
        </Sec>
      )}
    </div>
  );
}
