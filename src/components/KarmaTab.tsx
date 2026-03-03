import { type SoulData } from '../App';
import { getNumberInfo, KARMIC_MEANINGS } from '../engines/numerology';
import { getSouthNode, generateKarmicMission, detectKarmicTension, getKarmicLessons, type ZodiacSign } from '../engines/karmic-mission';
import { Sec, Cd, Orb, P } from './ui';

// Descriptors for each count level
function countDesc(count: number): { label: string; color: string } {
  if (count === 0) return { label: 'Absent — à développer', color: P.red };
  if (count === 1) return { label: 'Présent — équilibré', color: P.textMid };
  if (count === 2) return { label: 'Développé — bonne maîtrise', color: '#60a5fa' };
  if (count === 3) return { label: 'Marqué — talent naturel', color: '#4ade80' };
  if (count === 4) return { label: 'Très présent — force dominante', color: P.gold };
  return { label: 'Passion — énergie débordante', color: '#FF69B4' };
}

// Descriptors for karmic lessons - what it means concretely
const KARMIC_ADVICE: Record<number, string> = {
  1: "Tu apprends à t'affirmer et à prendre des initiatives sans attendre la validation des autres.",
  2: "Tu développes l'écoute, le compromis et la capacité à travailler en équipe.",
  3: "Tu explores ta créativité et ta capacité à t'exprimer avec aisance et joie.",
  4: "Tu construis la discipline, l'organisation et la persévérance au quotidien.",
  5: "Tu apprivoises le changement, l'adaptabilité et la liberté sans fuir tes responsabilités.",
  6: "Tu cultives l'amour inconditionnel, la responsabilité familiale et l'harmonie.",
  7: "Tu développes l'introspection, la foi en ton intuition et la quête de sens.",
  8: "Tu apprends à gérer le pouvoir, l'argent et l'ambition de manière équilibrée.",
  9: "Tu cultives la compassion universelle et le lâcher-prise sur ce qui ne te sert plus.",
};

// Descriptors for passion numbers
const PASSION_DESC: Record<number, string> = {
  1: "Leadership naturel — tu prends les commandes instinctivement.",
  2: "Sensibilité relationnelle — tu ressens les dynamiques entre les gens.",
  3: "Créativité spontanée — les idées viennent facilement.",
  4: "Rigueur innée — tu structures et organises naturellement.",
  5: "Soif de liberté — tu as besoin de mouvement et de nouveauté.",
  6: "Cœur protecteur — tu prends soin des autres avant tout.",
  7: "Esprit analytique — tu cherches toujours à comprendre en profondeur.",
  8: "Vision stratégique — tu vois les leviers de pouvoir et d'influence.",
  9: "Idéalisme puissant — tu veux améliorer le monde autour de toi.",
};

export default function KarmaTab({ data }: { data: SoulData }) {
  const { num, conv } = data;

  // Find max count for bar scaling
  const maxCount = Math.max(...Object.values(num.ig), 1);

  return (
    <div>
      {/* Profil Énergétique (was Grille d'Inclusion) */}
      <Sec icon="⊞" title="Profil Énergétique">
        <Cd>
          <div style={{ fontSize: 13, color: P.textMid, marginBottom: 14, lineHeight: 1.6 }}>
            Chaque nombre de 1 à 9 représente une énergie. Plus il apparaît dans ton nom, plus cette énergie est présente dans ta personnalité.
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => {
              const ct = num.ig[n] || 0;
              const ni = getNumberInfo(n);
              const isKarmic = num.kl.includes(n);
              const isPassion = num.hp.includes(n);
              const desc = countDesc(ct);
              const barPct = Math.round((ct / maxCount) * 100);

              return (
                <div key={n} style={{
                  padding: '10px 14px', borderRadius: 10,
                  background: isKarmic ? `${P.red}08` : isPassion ? `${P.gold}08` : P.bg,
                  border: `1px solid ${isKarmic ? P.red + '25' : isPassion ? P.gold + '25' : P.cardBdr}`
                }}>
                  {/* Top row: number + keyword + count + badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: `${isKarmic ? P.red : ni.c}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, fontWeight: 700, color: isKarmic ? P.red : ni.c,
                      flexShrink: 0
                    }}>{n}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: P.text }}>
                        {ni.k}
                        {isKarmic && <span style={{ fontSize: 10, color: P.red, marginLeft: 8, fontWeight: 700 }}>LEÇON</span>}
                        {isPassion && <span style={{ fontSize: 10, color: P.gold, marginLeft: 8, fontWeight: 700 }}>PASSION</span>}
                      </div>
                      <div style={{ fontSize: 11, color: desc.color, marginTop: 1 }}>{desc.label}</div>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: isKarmic ? P.red : ni.c }}>
                      {ct}×
                    </div>
                  </div>

                  {/* Energy bar */}
                  <div style={{
                    height: 6, borderRadius: 3, background: P.cardBdr, overflow: 'hidden'
                  }}>
                    <div style={{
                      width: ct === 0 ? '0%' : `${Math.max(barPct, 8)}%`,
                      height: '100%', borderRadius: 3,
                      background: isKarmic ? P.red : isPassion ? P.gold : ni.c,
                      transition: 'width 0.5s ease',
                      opacity: 0.7
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Cd>
      </Sec>

      {/* Leçons de Vie (was Leçons Karmiques) */}
      {num.kl.length > 0 && (
        <Sec icon="☸" title="Leçons de Vie">
          <Cd>
            <div style={{ fontSize: 13, color: P.textMid, marginBottom: 14, lineHeight: 1.6 }}>
              Ces nombres sont absents de ton nom de naissance. Ils représentent des énergies que tu es venu développer — pas des faiblesses, mais des opportunités de croissance.
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {num.kl.map(n => (
                <div key={n} style={{
                  padding: '14px 16px', borderRadius: 10,
                  background: `${P.red}06`, border: `1px solid ${P.red}15`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%', background: `${P.red}18`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 20, fontWeight: 700, color: P.red
                    }}>{n}</div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: P.red }}>{getNumberInfo(n).k}</div>
                      <div style={{ fontSize: 11, color: P.textDim }}>{KARMIC_MEANINGS[n]}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: P.textMid, lineHeight: 1.6, paddingLeft: 52 }}>
                    {KARMIC_ADVICE[n]}
                  </div>
                </div>
              ))}
            </div>
          </Cd>
        </Sec>
      )}

      {/* V2.9.2: Mission Karmique (Nœud Sud + Mission + Tensions) */}
      {conv.lunarNodes && (() => {
        const nnSign = conv.lunarNodes.natal.northNode.sign;
        const southNode = getSouthNode(nnSign as ZodiacSign);
        const mission = generateKarmicMission(nnSign as ZodiacSign, num.lp.v, num.soul.v);
        const tension = detectKarmicTension(nnSign as ZodiacSign, num.lp.v, num.soul.v);
        const lessons = getKarmicLessons(num.kl);
        if (!southNode || !mission) return null;

        return (
          <Sec icon="☋" title="Mission Karmique">
            <Cd>
              <div style={{ fontSize: 13, color: P.textMid, marginBottom: 14, lineHeight: 1.6 }}>
                Les Nœuds Lunaires révèlent ce que tu maîtrises déjà (Nœud Sud) et ce vers quoi tu évolues (Nœud Nord). Croisés avec ta numérologie, ils dessinent ta mission karmique.
              </div>

              {/* Nœud Sud */}
              <div style={{ padding: '14px 16px', borderRadius: 10, background: '#a78bfa08', border: '1px solid #a78bfa20', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 22 }}>☋</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#a78bfa' }}>Nœud Sud — {southNode.sign}</div>
                    <div style={{ fontSize: 11, color: P.textDim }}>Ce que tu maîtrises depuis toujours</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  <div style={{ padding: '8px 12px', borderRadius: 8, background: '#4ade800a', borderLeft: '2px solid #4ade8044' }}>
                    <div style={{ fontSize: 9, color: '#4ade80', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Maîtrise</div>
                    <div style={{ fontSize: 12, color: P.textMid, marginTop: 3, lineHeight: 1.5 }}>{southNode.maitrise}</div>
                  </div>
                  <div style={{ padding: '8px 12px', borderRadius: 8, background: '#f9731608', borderLeft: '2px solid #f9731644' }}>
                    <div style={{ fontSize: 9, color: '#f97316', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>À lâcher</div>
                    <div style={{ fontSize: 12, color: P.textMid, marginTop: 3, lineHeight: 1.5 }}>{southNode.lacher}</div>
                  </div>
                  <div style={{ padding: '8px 12px', borderRadius: 8, background: '#ef44440a', borderLeft: '2px solid #ef444444' }}>
                    <div style={{ fontSize: 9, color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Piège</div>
                    <div style={{ fontSize: 12, color: P.textMid, marginTop: 3, lineHeight: 1.5 }}>{southNode.piege}</div>
                  </div>
                </div>
              </div>

              {/* Mission */}
              <div style={{ padding: '14px 16px', borderRadius: 10, background: `${P.gold}08`, border: `1px solid ${P.gold}20`, marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 22 }}>🧭</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: P.gold }}>{nnSign}</div>
                    <div style={{ fontSize: 11, color: P.textDim }}>CdV {num.lp.v} × Nœud Nord {nnSign}</div>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: P.textMid, lineHeight: 1.7, marginBottom: 8 }}>{mission.northNode}</div>
                <div style={{ padding: '8px 12px', borderRadius: 8, background: `${P.gold}0c`, border: `1px solid ${P.gold}20` }}>
                  <div style={{ fontSize: 9, color: P.gold, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Conseil stratégique</div>
                  <div style={{ fontSize: 12, color: P.gold, fontWeight: 600, marginTop: 3, lineHeight: 1.5 }}>{mission.cheminDeVie}</div>
                </div>
              </div>

              {/* Tension karmique (si détectée) */}
              {tension && (
                <div style={{ padding: '12px 16px', borderRadius: 10, background: '#f9731606', border: '1px solid #f9731620', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 16 }}>⚡</span>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#f97316' }}>Tension Karmique</div>
                  </div>
                  <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.6 }}>{tension}</div>
                </div>
              )}

              {/* Leçons karmiques enrichies */}
              {lessons.length > 0 && (
                <div style={{ marginTop: 4 }}>
                  <div style={{ fontSize: 11, color: P.textDim, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                    Leçons enrichies
                  </div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    {lessons.map((l, i) => (
                      <div key={i} style={{ padding: '8px 12px', borderRadius: 8, background: P.bg, border: `1px solid ${P.cardBdr}` }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#a78bfa' }}>{`Leçon ${l.number}`}</div>
                        <div style={{ fontSize: 11, color: P.textMid, marginTop: 2, lineHeight: 1.5 }}>{l.lesson}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Cd>
          </Sec>
        );
      })()}

      {/* Forces Dominantes (was Passions Cachées) */}
      {num.hp.length > 0 && (
        <Sec icon="🔥" title="Forces Dominantes">
          <Cd>
            <div style={{ fontSize: 13, color: P.textMid, marginBottom: 14, lineHeight: 1.6 }}>
              Les nombres les plus fréquents dans ton nom révèlent tes forces naturelles — ces talents que tu actives spontanément et sur lesquels tu peux t'appuyer.
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {num.hp.map(n => (
                <div key={n} style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
                  borderRadius: 10, background: `${P.gold}08`, border: `1px solid ${P.gold}20`
                }}>
                  <Orb v={n} sz={48} lb={`×${num.ig[n]}`} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: P.gold }}>{getNumberInfo(n).k}</div>
                    <div style={{ fontSize: 12, color: P.textMid, marginTop: 3, lineHeight: 1.5 }}>
                      {PASSION_DESC[n]}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Cd>
        </Sec>
      )}

      {/* Cycles de Vie (Pinnacles + Challenges combined) */}
      <Sec icon="🔄" title="Cycles de Vie">
        <Cd>
          <div style={{ fontSize: 13, color: P.textMid, marginBottom: 14, lineHeight: 1.6 }}>
            Ta vie se divise en 4 grandes périodes, chacune avec une énergie dominante (Sommet) et un défi associé.
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {num.pinnacles.map((p, i) => {
              const ch = num.challenges[i];
              const pi = getNumberInfo(p.v);
              const ci = getNumberInfo(ch.v);
              const labels = ['1ère période', '2e période', '3e période', '4e période'];
              const ages = ['Naissance → ~30 ans', '~30 → ~40 ans', '~40 → ~50 ans', '~50 ans → fin'];
              return (
                <div key={i} style={{
                  padding: '12px 14px', borderRadius: 10,
                  background: P.bg, border: `1px solid ${P.cardBdr}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: P.text }}>{labels[i]}</div>
                      <div style={{ fontSize: 10, color: P.textDim }}>{ages[i]}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{
                      flex: 1, padding: '8px 10px', borderRadius: 8,
                      background: `${pi.c}0c`, border: `1px solid ${pi.c}20`, textAlign: 'center'
                    }}>
                      <div style={{ fontSize: 9, color: P.textDim, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>Sommet</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: pi.c, marginTop: 2 }}>{p.v}</div>
                      <div style={{ fontSize: 11, color: P.textMid }}>{pi.k}</div>
                    </div>
                    <div style={{
                      flex: 1, padding: '8px 10px', borderRadius: 8,
                      background: `${ci.c}0c`, border: `1px solid ${ci.c}20`, textAlign: 'center'
                    }}>
                      <div style={{ fontSize: 9, color: P.textDim, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>Défi</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: ci.c, marginTop: 2 }}>{ch.v}</div>
                      <div style={{ fontSize: 11, color: P.textMid }}>{ci.k}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Cd>
      </Sec>
    </div>
  );
}
