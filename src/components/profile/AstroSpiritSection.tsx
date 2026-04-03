import { Sec, Cd, P } from '../ui';
import { TRIGRAM_NAMES } from '../../engines/iching';
import { intro, gold12, Badge } from './shared';
import type { DayPreview, ProfileData, SoulData } from '../../engines/orchestrator';
import { PY_DESC } from './NumerologySection';

interface AstroSpiritSectionProps {
  pd: ProfileData;
  num: SoulData['num'];
  astro: SoulData['astro'];
  cz: SoulData['cz'];
  natal: ProfileData['natal'];
  natalProf: ProfileData['natalProf'];
  yearPreviews: DayPreview[] | null;
  bd: string;
  fn: string;
  isGenerating: boolean;
  onGenerateCard: () => void;
}

export default function AstroSpiritSection({
  pd,
  num,
  astro,
  cz,
  natal,
  natalProf,
  yearPreviews,
  bd,
  fn,
  isGenerating,
  onGenerateCard,
}: AstroSpiritSectionProps) {
  return (
    <>
      {/* ══ YI KING NATAL ══ */}
      <Sec icon="☰" title={`Yi King Natal — Hex. ${natal.hexNum} ${natal.name}`}>
        <Cd>
          <div style={intro}>
            Le Yi King (易經, « Classique des Changements ») est le plus ancien texte de sagesse chinoise, vieux de plus de 3 000 ans, consulté par Confucius lui-même. Tes 64 hexagrammes codent les situations archétypales de la vie. Ton hexagramme de naissance est ton archétype stratégique permanent — l'énergie fondamentale qui sous-tend ton parcours, indépendamment des cycles quotidiens. <Badge type="fixe" />
          </div>
          <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
              {[...natal.lines].reverse().map((line, i) => (
                <div key={i} style={{ display: 'flex', gap: line === 1 ? 0 : 6 }}>
                  {line === 1 ? (
                    <div style={{ width: 40, height: 5, background: (5 - i) === natal.changing ? P.gold : P.text, borderRadius: 1 }} />
                  ) : (
                    <>
                      <div style={{ width: 17, height: 5, background: (5 - i) === natal.changing ? P.gold : P.textDim, borderRadius: 1 }} />
                      <div style={{ width: 17, height: 5, background: (5 - i) === natal.changing ? P.gold : P.textDim, borderRadius: 1 }} />
                    </>
                  )}
                </div>
              ))}
              <div style={{ fontSize: 9, color: P.textDim, marginTop: 4 }}>
                {TRIGRAM_NAMES[natal.lower]} / {TRIGRAM_NAMES[natal.upper]}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: P.gold }}>{natalProf.archetype}</div>
              <div style={{ fontSize: 13, color: P.textMid, marginTop: 4, lineHeight: 1.5 }}>« {natalProf.judgment} »</div>
              <div style={{ fontSize: 11, color: P.textDim, marginTop: 4, fontStyle: 'italic' }}>{natalProf.image}</div>
            </div>
          </div>
          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <div style={{ padding: '8px 10px', background: `${P.green}0a`, borderRadius: 6, border: `1px solid ${P.green}18` }}>
              <div style={{ fontSize: 9, color: P.green, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>✦ Opportunité</div>
              <div style={{ fontSize: 12, color: P.green, marginTop: 3, lineHeight: 1.5 }}>{natalProf.opportunity}</div>
            </div>
            <div style={{ padding: '8px 10px', background: `${P.red}0a`, borderRadius: 6, border: `1px solid ${P.red}18` }}>
              <div style={{ fontSize: 9, color: P.red, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>⚡ Risque</div>
              <div style={{ fontSize: 12, color: P.red, marginTop: 3, lineHeight: 1.5 }}>{natalProf.risk}</div>
            </div>
          </div>
          <div style={{ marginTop: 8, padding: '8px 12px', background: `${P.gold}0a`, borderRadius: 6, border: `1px solid ${P.gold}18` }}>
            <div style={{ fontSize: 9, color: P.gold, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>☰ Conseil stratégique permanent</div>
            <div style={gold12}>{natalProf.action}</div>
          </div>

          <div style={{ marginTop: 8, padding: '10px 14px', background: '#18181b', borderRadius: 8, border: `1px solid ${P.cardBdr}`, position: 'relative' }}>
            <div style={{ fontSize: 9, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600, marginBottom: 6 }}>📜 Parole du Yi King</div>
            <div style={{ fontSize: 12, color: '#d4d4d8', lineHeight: 1.7, fontStyle: 'italic' }}>
              « {natalProf.wisdom} »
            </div>
            <div style={{ fontSize: 10, color: P.textDim, marginTop: 6, lineHeight: 1.5 }}>
              Ce texte accompagne ton hexagramme depuis plus de 3 000 ans. Il ne décrit pas un jour — il décrit une posture de vie. Relis-le dans les moments de doute stratégique.
            </div>
          </div>
        </Cd>
      </Sec>

      {/* ══ LUNE NATALE ══ */}
      {pd.natalMoon && (() => {
        const nm = pd.natalMoon!;
        return (
          <Sec icon="☽" title={`Ta Lune Natale — ${nm.sign}`}>
            <Cd>
              <div style={intro}>
                En astrologie, la Lune représente ton monde émotionnel — un pilier fondamental du thème natal, reconnu depuis l'Antiquité par les traditions grecque, arabe et indienne. Ta Lune de naissance révèle tes besoins profonds, tes réactions instinctives, ce qui te sécurise quand tout vacille. C'est la face invisible de ta personnalité, celle que seuls tes proches connaissent. <Badge type="fixe" />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'linear-gradient(135deg, #9ca3af22, #6366f118)',
                  border: `2px solid #9ca3af40`, fontSize: 26,
                }}>☽</div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: P.text }}>Lune en {nm.sign}</div>
                  <div style={{ fontSize: 10, color: P.textDim, marginTop: 3 }}>
                    Position lunaire à ta naissance
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ padding: '10px 12px', background: '#6366f108', borderRadius: 8, borderLeft: '3px solid #6366f140' }}>
                  <div style={{ fontSize: 10, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 4 }}>💧 Besoins émotionnels</div>
                  <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.6 }}>{nm.needs}</div>
                </div>

                <div style={{ padding: '10px 12px', background: '#f59e0b08', borderRadius: 8, borderLeft: '3px solid #f59e0b40' }}>
                  <div style={{ fontSize: 10, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 4 }}>⚡ Réaction instinctive</div>
                  <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.6 }}>{nm.instinct}</div>
                </div>

                <div style={{ padding: '10px 12px', background: '#10b98108', borderRadius: 8, borderLeft: '3px solid #10b98140' }}>
                  <div style={{ fontSize: 10, color: '#34d399', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 4 }}>🛡 Ce qui te sécurise</div>
                  <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.6 }}>{nm.comfort || nm.security}</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ padding: '10px 12px', background: `${P.green}08`, borderRadius: 8, borderLeft: `3px solid ${P.green}40` }}>
                    <div style={{ fontSize: 10, color: P.green, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 4 }}>✦ Forces</div>
                    <div style={{ fontSize: 11, color: '#4ade80', lineHeight: 1.5 }}>{nm.qualities}</div>
                  </div>
                  <div style={{ padding: '10px 12px', background: '#ef444408', borderRadius: 8, borderLeft: '3px solid #ef444440' }}>
                    <div style={{ fontSize: 10, color: '#ef4444', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 4 }}>⚠ Vigilance</div>
                    <div style={{ fontSize: 11, color: '#ef4444aa', lineHeight: 1.5 }}>{nm.vigilance}</div>
                  </div>
                </div>

                {nm.darkGift && (
                  <div style={{ padding: '10px 12px', background: '#a78bfa08', borderRadius: 8, borderLeft: '3px solid #a78bfa40' }}>
                    <div style={{ fontSize: 10, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 4 }}>🔮 Le don de ton ombre</div>
                    <div style={{ fontSize: 12, color: '#c4b5fd', lineHeight: 1.6 }}>{nm.darkGift}</div>
                  </div>
                )}

                {nm.hack && (
                  <div style={{ padding: '10px 12px', background: `${P.gold}06`, borderRadius: 8, borderLeft: `3px solid ${P.gold}40` }}>
                    <div style={{ fontSize: 10, color: P.gold, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, marginBottom: 4 }}>💡 Astuce pour ton quotidien</div>
                    <div style={{ fontSize: 12, color: '#fbbf24', lineHeight: 1.6 }}>{nm.hack}</div>
                  </div>
                )}
              </div>
            </Cd>
          </Sec>
        );
      })()}

      {/* ══ MISSION DE VIE — Nœuds Lunaires × Numérologie ══ */}
      <Sec icon="🎯" title="Ta Mission de Vie — Nœuds Lunaires">
        <Cd>
          <div style={intro}>
            Les Nœuds Lunaires (Nœud Nord et Nœud Sud) sont deux points mathématiques de ton thème natal utilisés en astrologie depuis des millénaires. Le Nœud Sud indique ton talent naturel — ce que tu portes déjà, ce que tu sais faire sans effort. Le Nœud Nord est ta direction de vie — ce que tu es venu(e) développer et cultiver. La numérologie complète cette lecture avec le Chemin de Vie, qui valide et amplifie ce même message.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            {/* Nœud Sud */}
            <div style={{ padding: '12px 14px', borderRadius: 10, background: '#ef444408', border: '1px solid #ef444418' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', marginBottom: 6 }}>↓ Nœud Sud</div>
              <div style={{ fontSize: 10, color: P.textDim, marginBottom: 8 }}>
                Ce que tu portes déjà — ton héritage naturel
              </div>
              {pd.nodeSouth && (
                <>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#ef4444', marginBottom: 4 }}>{pd.nodeSouth.zodiacSign}</div>
                  <div style={{ fontSize: 10, color: P.textMid, lineHeight: 1.5 }}>{pd.nodeSouth.theme}</div>
                </>
              )}
            </div>

            {/* Nœud Nord */}
            <div style={{ padding: '12px 14px', borderRadius: 10, background: '#60a5fa08', border: '1px solid #60a5fa18' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#60a5fa', marginBottom: 6 }}>↑ Nœud Nord</div>
              <div style={{ fontSize: 10, color: P.textDim, marginBottom: 8 }}>
                Ta direction de vie — ce que tu es venu(e) développer
              </div>
              {pd.nodeNorth && (
                <>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#60a5fa', marginBottom: 4 }}>{pd.nodeNorth.zodiacSign}</div>
                  <div style={{ fontSize: 10, color: P.textMid, lineHeight: 1.5 }}>{pd.nodeNorth.theme}</div>
                </>
              )}
            </div>
          </div>

          {/* Alignment Numérologie + Nœuds */}
          {num && (
            <div style={{ padding: '12px 14px', background: `${P.gold}0c`, border: `1px solid ${P.gold}22`, borderRadius: 8 }}>
              <div style={{ fontSize: 10, color: P.gold, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>✦ Chemin de Vie × Nœuds Lunaires</div>
              <div style={{ fontSize: 11, color: P.textMid, lineHeight: 1.6 }}>
                Ton <b>Chemin de Vie {num.lp.v}</b> amplifie ta mission du Nœud Nord. Ils décrivent le même parcours vu de deux angles : astrologie pour tes émotions/relations, numérologie pour ton action/expression.
              </div>
            </div>
          )}
        </Cd>
      </Sec>

      {/* ══ CARTE NATALE TAROT ══ */}
      {pd.tarot && (
        <Sec icon="🃏" title="Carte Natale Tarot — Ton Archétype Majeur">
          <Cd>
            <div style={intro}>
              Le <b>Tarot numerologique</b> place chaque personne sur l'Arcane Majeur correspondant à son nombre de vie réduit. Cette carte est ton archétype permanent — l'énergie collective que tu incarne et que tu dois maîtriser pour grandir.
            </div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ fontSize: 48, textAlign: 'center', minWidth: 60 }}>
                {pd.tarot.arcane}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: P.gold, marginBottom: 4 }}>{pd.tarot.name}</div>
                <div style={{ fontSize: 11, color: P.textDim, lineHeight: 1.6 }}>
                  {pd.tarot.desc}
                </div>
              </div>
            </div>
          </Cd>
        </Sec>
      )}

      {/* ══ CARTE ANNUELLE ══ */}
      {num && (
        <Sec icon="🎴" title="Carte Annuelle — Thème Numérique de l'Année">
          <Cd>
            <div style={intro}>
              Chaque année civile porte un nombre, une vibration collective qui influence tout le monde — mais aussi une résonance avec <b>ton Chemin de Vie personnel</b>. Combine les deux et tu verras comment les énergies se dansent cette année. Cette année civile, c'est l'an {pd.civilYear || '–'}.
            </div>

            {yearPreviews && yearPreviews.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: P.gold, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Thème de l'année civile</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <div style={{ padding: '12px 14px', borderRadius: 8, background: '#ffffff06', border: `1px solid ${P.cardBdr}` }}>
                    <div style={{ fontSize: 11, color: P.gold, fontWeight: 700, marginBottom: 6 }}>Année {pd.civilYear}</div>
                    <div style={{ fontSize: 11, color: P.textDim, lineHeight: 1.6 }}>
                      Cycle annuel #{pd.civilYearCycle || '–'}
                    </div>
                  </div>
                  <div style={{ padding: '12px 14px', borderRadius: 8, background: '#ffffff06', border: `1px solid ${P.cardBdr}` }}>
                    <div style={{ fontSize: 11, color: P.gold, fontWeight: 700, marginBottom: 6 }}>Ton cycle</div>
                    <div style={{ fontSize: 11, color: P.textDim, lineHeight: 1.6 }}>
                      CdV {num.lp.v} · Année universelle {pd.civilYearCycle} → Année personnelle {pd.personalYearNumber || '–'}
                    </div>
                  </div>
                </div>

                {pd.personalYearNumber && PY_DESC[pd.personalYearNumber] && (
                  <div style={{ padding: '12px 14px', background: `${P.gold}0c`, border: `1px solid ${P.gold}22`, borderRadius: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: P.gold, marginBottom: 4 }}>{PY_DESC[pd.personalYearNumber].name}</div>
                    <div style={{ fontSize: 11, color: P.textMid, marginBottom: 6 }}>
                      <b style={{ color: P.gold }}>Thème :</b> {PY_DESC[pd.personalYearNumber].theme}
                    </div>
                    <div style={gold12}>
                      {PY_DESC[pd.personalYearNumber].conseil}
                    </div>
                  </div>
                )}

                {(() => {
                  const topDays = yearPreviews
                    .filter(d => d.score >= 80)
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 6)
                    .sort((a, b) => a.date.localeCompare(b.date));
                  if (topDays.length === 0) return null;
                  return (
                    <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 8, background: '#ffffff04', border: `1px solid ${P.cardBdr}` }}>
                      <div style={{ fontSize: 10, color: P.gold, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Jours porteurs de l'année</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 6 }}>
                        {topDays.map((day, i) => {
                          const sc = day.score;
                          const col = sc >= 86 ? '#E0B0FF' : sc >= 80 ? '#4ade80' : P.textMid;
                          return (
                            <div key={i} style={{ padding: '8px 10px', borderRadius: 6, background: sc >= 86 ? '#E0B0FF08' : '#ffffff04', border: `1px solid ${sc >= 86 ? '#E0B0FF20' : 'rgba(255,255,255,0.08)'}`, fontSize: 9, color: P.textDim }}>
                              <div style={{ fontWeight: 600, color: col, marginBottom: 2 }}>
                                {new Date(day.date + 'T00:00:00').toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })}
                                {sc >= 86 && <span style={{ fontSize: 8, marginLeft: 4 }}>✦</span>}
                              </div>
                              <div style={{ color: col, fontWeight: 700 }}>{sc}/100</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            <button
              onClick={onGenerateCard}
              disabled={isGenerating}
              style={{
                width: '100%',
                padding: '10px 14px',
                background: isGenerating ? `${P.gold}20` : P.gold,
                color: isGenerating ? P.textDim : '#000',
                border: 'none',
                borderRadius: 6,
                fontWeight: 700,
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                fontSize: 11,
                opacity: isGenerating ? 0.7 : 1,
                transition: 'all 0.2s',
              }}
            >
              {isGenerating ? '⏳ Génération en cours…' : '🎴 Générer ma Carte Annuelle'}
            </button>
          </Cd>
        </Sec>
      )}
    </>
  );
}
