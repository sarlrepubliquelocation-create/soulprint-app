import { type SoulData } from '../App';
import { getNumberInfo } from '../engines/numerology';
import { SIGN_FR, SIGN_SYM } from '../engines/astrology';
import { TRIGRAM_NAMES, getHexProfile } from '../engines/iching';
import { Sec, Cd, P } from './ui';

export default function IChingTab({ data }: { data: SoulData }) {
  const { num, astro, cz, iching } = data;
  const prof = getHexProfile(iching.hexNum);

  return (
    <div>
      <Sec icon="☰" title={`Hexagramme ${iching.hexNum} — ${iching.name}`}>
        <Cd>
          <div style={{ fontSize: 12, color: P.textDim, lineHeight: 1.7, marginBottom: 16, fontStyle: 'italic' }}>
            Le Yi King (易經) est le plus ancien oracle connu — plus de 3000 ans de sagesse stratégique. Chaque jour, un hexagramme se forme au croisement de votre date de naissance et de l'énergie du moment. Ce n'est pas une prédiction, c'est une lecture des forces en jeu.
          </div>

          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            {/* Hexagram lines */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center' }}>
              {[...iching.lines].reverse().map((l, i) => {
                const lineIdx = 5 - i;
                const isChanging = lineIdx === iching.changing;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {l === 1
                      ? <div style={{ width: 64, height: 7, background: isChanging ? P.gold : P.gold + '88', borderRadius: 3, boxShadow: isChanging ? `0 0 10px ${P.goldGlow}` : 'none' }} />
                      : <div style={{ display: 'flex', gap: 10 }}>
                          <div style={{ width: 26, height: 7, background: isChanging ? P.gold : P.gold + '88', borderRadius: 3 }} />
                          <div style={{ width: 26, height: 7, background: isChanging ? P.gold : P.gold + '88', borderRadius: 3 }} />
                        </div>
                    }
                    {isChanging && <span style={{ fontSize: 9, color: P.gold }}>◀</span>}
                  </div>
                );
              })}
              <div style={{ fontSize: 10, color: P.textDim, marginTop: 6 }}>
                {TRIGRAM_NAMES[iching.upper]} / {TRIGRAM_NAMES[iching.lower]}
              </div>
            </div>

            {/* Details */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: P.text }}>{iching.name}</div>
              <div style={{ fontSize: 15, color: P.gold, fontWeight: 600, marginTop: 4 }}>→ {iching.keyword}</div>
              <div style={{ marginTop: 10, fontSize: 13, color: P.textMid, lineHeight: 1.8 }}>
                {iching.desc}
              </div>
              <div style={{ marginTop: 12, fontSize: 13, color: P.textMid, lineHeight: 1.7 }}>
                Trigramme intérieur : <b style={{ color: P.gold }}>{TRIGRAM_NAMES[iching.lower]}</b> (ton énergie profonde)<br />
                Trigramme extérieur : <b style={{ color: P.blue }}>{TRIGRAM_NAMES[iching.upper]}</b> (l'énergie du jour)<br />
                Ligne mutante : <b style={{ color: P.gold }}>{iching.changing + 1}</b>/6 (point de transformation)
              </div>
            </div>
          </div>

          {/* Wisdom - Yi King traditionnel */}
          <div style={{ marginTop: 18, padding: '14px 16px', background: `${P.gold}06`, borderRadius: 10, border: `1px solid ${P.gold}12`, borderLeft: `3px solid ${P.gold}44` }}>
            <div style={{ fontSize: 10, color: P.gold, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700, marginBottom: 8 }}>☰ Sagesse du Yi King</div>
            <div style={{ fontSize: 13, color: P.textMid, lineHeight: 1.8, fontStyle: 'italic' }}>
              « {prof.wisdom} »
            </div>
          </div>

          {/* Strategic profile */}
          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <div style={{ padding: '8px 10px', background: `${P.green}0a`, borderRadius: 6, border: `1px solid ${P.green}18` }}>
              <div style={{ fontSize: 9, color: P.green, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>✦ Opportunité</div>
              <div style={{ fontSize: 12, color: P.green, marginTop: 3, lineHeight: 1.5 }}>{prof.opportunity}</div>
            </div>
            <div style={{ padding: '8px 10px', background: `${P.red}0a`, borderRadius: 6, border: `1px solid ${P.red}18` }}>
              <div style={{ fontSize: 9, color: P.red, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>⚡ Risque</div>
              <div style={{ fontSize: 12, color: P.red, marginTop: 3, lineHeight: 1.5 }}>{prof.risk}</div>
            </div>
          </div>

          {/* Action */}
          <div style={{ marginTop: 8, padding: '8px 12px', background: `${P.gold}0a`, borderRadius: 6, border: `1px solid ${P.gold}18` }}>
            <div style={{ fontSize: 9, color: P.gold, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>☰ Action stratégique du jour</div>
            <div style={{ fontSize: 12, color: P.gold, lineHeight: 1.6 }}>{prof.action}</div>
          </div>

          {/* Convergence box */}
          <div style={{ marginTop: 18, padding: 14, background: `${P.gold}08`, borderRadius: 10, border: `1px solid ${P.gold}18` }}>
            <div style={{ fontSize: 11, color: P.gold, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 6 }}>✦ Convergence du jour</div>
            <div style={{ fontSize: 11, color: P.textDim, lineHeight: 1.6, marginBottom: 10, fontStyle: 'italic' }}>
              Croisement des 4 systèmes actifs aujourd'hui — plus ils convergent, plus l'énergie est forte.
            </div>
            <div style={{ fontSize: 13, color: P.textMid, lineHeight: 1.8 }}>
              Jour Personnel <b style={{ color: getNumberInfo(num.ppd.v).c }}>{num.ppd.v}</b> ({getNumberInfo(num.ppd.v).k})
              {' + '}Hexagramme <b style={{ color: P.gold }}>{iching.hexNum}</b> ({iching.name})
              {astro && <>{' + '}{SIGN_SYM[astro.b3.sun]} {SIGN_FR[astro.b3.sun]}</>}
              {' + '}{cz.sym} {cz.animal}
            </div>
          </div>
        </Cd>
      </Sec>
    </div>
  );
}
