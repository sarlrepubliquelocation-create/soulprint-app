import { type SoulData } from '../App';
import { getNumberInfo, KARMIC_MEANINGS } from '../engines/numerology';
import { Sec, Cd, Orb } from './ui';

export default function KarmaTab({ data }: { data: SoulData }) {
  const { num } = data;

  return (
    <div>
      {/* Grille d'Inclusion */}
      <Sec icon="⊞" title="Grille d'Inclusion">
        <Cd>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => {
              const ct = num.ig[n] || 0;
              const ni = getNumberInfo(n);
              const isKarmic = num.kl.includes(n);
              const isPassion = num.hp.includes(n);
              return (
                <div key={n} style={{
                  padding: '8px 6px', borderRadius: 8, textAlign: 'center',
                  background: isKarmic ? '#ef444411' : isPassion ? '#FFD70011' : ct > 0 ? ni.c + '11' : '#0c0a14',
                  border: `1px solid ${isKarmic ? '#ef444433' : isPassion ? '#FFD70033' : ct > 0 ? ni.c + '33' : '#1e1a30'}`
                }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: isKarmic ? '#ef4444' : ni.c }}>{n}</div>
                  <div style={{ fontSize: 9, color: '#9890aa' }}>{ni.k}</div>
                  <div style={{ fontSize: 11, color: isKarmic ? '#ef4444' : '#b8b0cc', marginTop: 2 }}>
                    {ct === 0 ? '∅' : '●'.repeat(Math.min(ct, 5))}
                  </div>
                  <div style={{ fontSize: 7, color: '#5a5270', marginTop: 2 }}>
                    {ct}× {isKarmic && '· KARMA'}{isPassion && '· PASSION'}
                  </div>
                </div>
              );
            })}
          </div>
        </Cd>
      </Sec>

      {/* Leçons Karmiques */}
      {num.kl.length > 0 && (
        <Sec icon="☸" title="Leçons Karmiques">
          <Cd>
            <div style={{ fontSize: 11, color: '#b8b0cc', marginBottom: 10 }}>
              Nombres absents de ton nom — énergies à développer dans cette vie.
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              {num.kl.map(n => (
                <div key={n} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                  background: '#ef444408', borderRadius: 8, border: '1px solid #ef444415'
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', background: '#ef444422',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, fontWeight: 700, color: '#ef4444'
                  }}>{n}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#ef4444' }}>{getNumberInfo(n).k}</div>
                    <div style={{ fontSize: 10, color: '#9890aa' }}>{KARMIC_MEANINGS[n]}</div>
                  </div>
                </div>
              ))}
            </div>
          </Cd>
        </Sec>
      )}

      {/* Passions Cachées */}
      {num.hp.length > 0 && (
        <Sec icon="🔥" title="Passions Cachées">
          <Cd>
            <div style={{ fontSize: 11, color: '#b8b0cc', marginBottom: 10 }}>
              Nombres les plus fréquents dans ton nom — tes forces dominantes.
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {num.hp.map(n => (
                <div key={n} style={{ textAlign: 'center' }}>
                  <Orb v={n} sz={48} lb={getNumberInfo(n).k} />
                  <div style={{ fontSize: 9, color: '#FFD700', marginTop: 2 }}>×{num.ig[n]}</div>
                </div>
              ))}
            </div>
          </Cd>
        </Sec>
      )}

      {/* Pinnacles */}
      <Sec icon="🏔" title="Sommets (Pinnacles)">
        <Cd>
          <div style={{ fontSize: 11, color: '#b8b0cc', marginBottom: 10 }}>
            Les 4 grandes périodes de ta vie, chacune avec une énergie dominante.
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
            {num.pinnacles.map((p, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <Orb v={p.v} sz={46} lb={`P${i + 1}`} sub={getNumberInfo(p.v).k} />
              </div>
            ))}
          </div>
        </Cd>
      </Sec>

      {/* Challenges */}
      <Sec icon="⚔" title="Défis (Challenges)">
        <Cd>
          <div style={{ fontSize: 11, color: '#b8b0cc', marginBottom: 10 }}>
            Les obstacles à surmonter à chaque étape de ta vie.
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
            {num.challenges.map((c, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <Orb v={c.v} sz={46} lb={`D${i + 1}`} sub={getNumberInfo(c.v).k} />
              </div>
            ))}
          </div>
        </Cd>
      </Sec>
    </div>
  );
}
