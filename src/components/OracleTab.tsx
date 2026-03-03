import { useState, useMemo } from 'react';
import { calcOracle, SUJETS, type OracleType, type OracleSujet, type OracleResult } from '../engines/oracle';
import { calcTemporalLayers } from '../engines/temporal-layers';
import { calcAlignment, buildSynthesisPhrase } from '../engines/alignment';
import { type SoulData } from '../App';
import { Cd, P } from './ui';

const TYPE_OPTIONS: { id: OracleType; icon: string; label: string; placeholder: string }[] = [
  { id: 'nom',     icon: '✏️', label: 'Nom / Marque',   placeholder: 'Ex: ZenHôte, Kaironaute...' },
  { id: 'date',    icon: '📅', label: 'Date',            placeholder: 'JJ/MM/AAAA' },
  { id: 'adresse', icon: '🏠', label: 'Adresse',         placeholder: 'Ex: 14 rue Victor Hugo' },
  { id: 'numero',  icon: '🔢', label: 'Numéro',          placeholder: 'Ex: 0612345678, SIRET...' },
  { id: 'sujet',   icon: '🎯', label: 'Sujet',           placeholder: 'Choisissez un sujet ci-dessous' },
  { id: 'bebe',    icon: '👶', label: 'Prénom bébé',     placeholder: 'Ex: Léa, Noah, Amara...' },
];

const SUJET_LIST: { id: OracleSujet; icon: string; label: string }[] = [
  { id: 'projet',         icon: '🚀', label: 'Lancer projet / Contrat' },
  { id: 'sentiments',     icon: '💕', label: 'Déclarer sentiments' },
  { id: 'partenariat',    icon: '🤝', label: 'Partenariat / Associé' },
  { id: 'investissement', icon: '💰', label: 'Investissement / Finance' },
  { id: 'voyage',         icon: '✈️', label: 'Voyage / Déménagement' },
  { id: 'presentation',   icon: '🎤', label: 'Présentation / Parole' },
  { id: 'changement',     icon: '🔄', label: 'Changement de vie' },
];

// ── Couleurs Alignement ──
const ALIGNMENT_BADGE_BG: Record<string, string> = {
  autoroute_cosmique:  '#00CED115',
  effort_recompense:   '#FFA50015',
  illusion_fluidite:   '#6699CC15',
  tempete_cosmique:    '#4B008215',
  faux_pas_passager:   '#90EE9015',
  percee_lumineuse:    '#0080FF15',
  oasis_ephemere:      '#FF00FF15',
  tension_de_surface:  '#CC884415',
};
const ALIGNMENT_BADGE_BDR: Record<string, string> = {
  autoroute_cosmique:  '#00CED150',
  effort_recompense:   '#FFA50050',
  illusion_fluidite:   '#6699CC50',
  tempete_cosmique:    '#4B008250',
  faux_pas_passager:   '#90EE9050',
  percee_lumineuse:    '#0080FF50',
  oasis_ephemere:      '#FF00FF50',
  tension_de_surface:  '#CC884450',
};

export default function OracleTab({ data, bd }: { data: SoulData; bd: string }) {
  const [type, setType] = useState<OracleType>('nom');
  const [input, setInput] = useState('');
  const [sujet, setSujet] = useState<OracleSujet>('projet');
  const [result, setResult] = useState<OracleResult | null>(null);
  const [error, setError] = useState('');

  // ── V4.5: Couches temporelles ──
  const temporalCtx = useMemo(() => {
    try {
      const layers = calcTemporalLayers({
        luckPillars: data.luckPillars,
        num: data.num,
        currentScore: data.conv.score,
        birthDate: new Date(bd + 'T00:00:00'),
      });
      const alignment = calcAlignment({
        score: data.conv.score,
        tendanceScore: layers.tendance.score,
        fondLabel: layers.fond.label,
        tendanceLabel: layers.tendance.label,
        lpTransitionInMonths: layers.fond.pillarYearsLeft < 1
          ? Math.round(layers.fond.pillarYearsLeft * 12)
          : undefined,
      });
      const synthesisPhrase = buildSynthesisPhrase(alignment, {
        lpTransitionMonths: layers.fond.pillarYearsLeft < 0.67
          ? Math.round(layers.fond.pillarYearsLeft * 12)
          : undefined,
        ciZoneMutation: layers.ci.at6months.isZoneMutation,
      });
      return { layers, alignment, synthesisPhrase };
    } catch { return null; }
  }, [data, bd]);

  const doCalc = () => {
    if (type !== 'sujet' && !input.trim()) { setError('Entrez une valeur à tester'); return; }
    setError('');
    try {
      const dailyScore = data.conv.score;
      const userCdv = data.num.lp.v;
      let domainScoreFromConvergence = 50;
      if (type === 'sujet' && data.conv.contextualScores) {
        const sujetInfo = SUJETS[sujet];
        const domain = data.conv.contextualScores.domains.find(d => d.domain === sujetInfo.dominantDomain);
        if (domain) domainScoreFromConvergence = domain.score;
      }
      const r = calcOracle({
        type, input: type === 'sujet' ? sujet : input.trim(),
        sujet: type === 'sujet' ? sujet : (type === 'nom' ? 'projet' : undefined),
        dailyScore, userCdv, domainScoreFromConvergence,
        targetDate: type === 'date' ? input.trim() : undefined,
      });
      setResult(r);
    } catch (e: any) { setError(e.message || 'Erreur'); }
  };

  const verdictBg = result ? `${result.verdict.color}10` : 'transparent';
  const verdictBdr = result ? `${result.verdict.color}30` : 'transparent';

  return (
    <Cd>
      <div style={{ fontSize: 11, color: P.gold, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700, marginBottom: 16 }}>
        🔮 Oracle des Choix
      </div>

      {/* ═══ V4.5 — CONTEXTE TEMPOREL ═══ */}
      {temporalCtx && (() => {
        const { layers, alignment, synthesisPhrase } = temporalCtx;
        const { state } = alignment;
        const bgBadge = ALIGNMENT_BADGE_BG[state.name] ?? '#ffffff08';
        const bdrBadge = ALIGNMENT_BADGE_BDR[state.name] ?? '#ffffff20';

        return (
          <div style={{ marginBottom: 20, display: 'grid', gap: 10 }}>

            {/* Ligne : Fond + Badge Alignement + Potentiel */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'stretch' }}>

              {/* FOND */}
              <div style={{ padding: '10px 12px', borderRadius: 9, background: P.surface, border: `1px solid ${P.cardBdr}` }}>
                <div style={{ fontSize: 10, color: P.textDim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Cycle de fond</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: alignment.fondPolarity === '+' ? '#4ade80' : '#f87171' }}>
                  {layers.fond.label}
                </div>
                <div style={{ fontSize: 10, color: P.textDim, marginTop: 2 }}>
                  {layers.fond.dominantElement} · {Math.round(layers.fond.pillarYearsLeft * 12)}m restants
                </div>
              </div>

              {/* BADGE ALIGNEMENT — centré */}
              <div style={{
                padding: '10px 14px', borderRadius: 9, textAlign: 'center',
                background: bgBadge, border: `1.5px solid ${bdrBadge}`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              }}>
                <div style={{ fontSize: 18, marginBottom: 2 }}>{state.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: state.colorHex, whiteSpace: 'nowrap' }}>{state.label}</div>
                <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
                  {(['Fond', 'Tend.', 'Jour'] as const).map((ch, i) => {
                    const pol = i === 0 ? alignment.fondPolarity : i === 1 ? alignment.tendancePolarity : alignment.signalPolarity;
                    return (
                      <span key={ch} style={{
                        fontSize: 9, fontWeight: 700, padding: '1px 4px', borderRadius: 3,
                        background: pol === '+' ? '#4ade8020' : '#f8717120',
                        color: pol === '+' ? '#4ade80' : '#f87171',
                      }}>{ch}{pol}</span>
                    );
                  })}
                </div>
              </div>

              {/* POTENTIEL D'ACTION */}
              <div style={{ padding: '10px 12px', borderRadius: 9, background: P.surface, border: `1px solid ${P.cardBdr}`, textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: P.textDim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Potentiel réel</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: state.colorHex }}>
                  {layers.potentiel.score}
                  <span style={{ fontSize: 11, opacity: 0.5 }}>%</span>
                </div>
                <div style={{ fontSize: 10, color: layers.potentiel.delta > 0 ? '#4ade80' : layers.potentiel.delta < 0 ? '#f87171' : P.textDim, marginTop: 2 }}>
                  {layers.potentiel.delta > 0 ? `+${layers.potentiel.delta}` : layers.potentiel.delta < 0 ? `${layers.potentiel.delta}` : '='} vs signal brut
                </div>
              </div>
            </div>

            {/* Phrase synthèse */}
            <div style={{ padding: '12px 14px', borderRadius: 9, background: `${state.colorHex}08`, border: `1px solid ${state.colorHex}25` }}>
              <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.65, fontStyle: 'italic' }}>
                {synthesisPhrase}
              </div>
              {/* Action recommandée */}
              <div style={{ marginTop: 8, fontSize: 11, color: state.colorHex, fontWeight: 600 }}>
                → {state.action}
              </div>
            </div>

            {/* Pattern de contradiction si actif */}
            {alignment.activePattern && alignment.patternText && (
              <div style={{ padding: '8px 12px', borderRadius: 8, background: '#f59e0b08', border: '1px solid #f59e0b20' }}>
                <div style={{ fontSize: 10, color: '#f59e0b', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
                  ⚡ {alignment.activePattern.label}
                </div>
                <div style={{ fontSize: 11, color: P.textMid, lineHeight: 1.5 }}>{alignment.patternText}</div>
              </div>
            )}

            {/* Alertes de transition */}
            {layers.transitions.length > 0 && layers.transitions.map((tr, i) => (
              <div key={i} style={{
                padding: '8px 12px', borderRadius: 8,
                background: tr.urgency.color + '10',
                border: `1px solid ${tr.urgency.color}30`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  <div style={{ fontSize: 11, color: tr.urgency.color, fontWeight: 700 }}>
                    {tr.urgency.icon} {tr.label}
                  </div>
                  <div style={{ fontSize: 11, color: P.textMid, marginTop: 2, lineHeight: 1.4 }}>{tr.template}</div>
                </div>
                <div style={{ fontSize: 10, color: tr.urgency.color, fontWeight: 700, whiteSpace: 'nowrap', marginLeft: 8 }}>
                  {tr.urgency.category}
                </div>
              </div>
            ))}

            <div style={{ height: 1, background: P.cardBdr, marginTop: 4 }} />
          </div>
        );
      })()}

      {/* ═══ ORACLE — section originale ═══ */}
      <div style={{ fontSize: 12, color: P.textMid, marginBottom: 16, lineHeight: 1.5 }}>
        Testez un nom, une date, une adresse, un numéro ou un sujet — l'Oracle croise votre profil et l'énergie du jour.
      </div>

      {/* TYPE SELECTOR */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12, overflowX: 'auto', paddingBottom: 4 }}>
        {TYPE_OPTIONS.map(t => (
          <button key={t.id} onClick={() => { setType(t.id); setResult(null); }} style={{
            padding: '7px 10px', borderRadius: 7, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
            background: type === t.id ? '#E0B0FF12' : P.surface,
            border: `1px solid ${type === t.id ? '#E0B0FF30' : P.cardBdr}`,
            color: type === t.id ? '#E0B0FF' : P.textDim,
            fontSize: 12, fontWeight: type === t.id ? 700 : 400,
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* INPUT */}
      {type !== 'sujet' ? (
        <>
        <input
          type={type === 'date' ? 'date' : 'text'}
          placeholder={TYPE_OPTIONS.find(t => t.id === type)?.placeholder}
          value={input} onChange={e => setInput(e.target.value)}
          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${P.cardBdr}`, background: P.surface, color: P.text, fontSize: 14, fontFamily: 'inherit', marginBottom: type === 'bebe' ? 6 : 12, boxSizing: 'border-box' }}
        />
        {type === 'bebe' && (
          <div style={{ fontSize: 11, color: P.textDim, marginBottom: 12, padding: '6px 10px', background: '#ffffff05', borderRadius: 6, border: `1px solid ${P.cardBdr}`, lineHeight: 1.5 }}>
            👶 L'Oracle analyse l'harmonie numérologique du prénom et sa résonance avec votre Chemin de Vie parental.
          </div>
        )}
        </>
      ) : (
        <div style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
          {SUJET_LIST.map(s => (
            <button key={s.id} onClick={() => setSujet(s.id)} style={{
              padding: '9px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
              background: sujet === s.id ? '#E0B0FF0c' : P.surface,
              border: `1px solid ${sujet === s.id ? '#E0B0FF30' : P.cardBdr}`,
              color: sujet === s.id ? '#E0B0FF' : P.textMid,
              fontSize: 13, fontWeight: sujet === s.id ? 600 : 400,
            }}>
              {s.icon} {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Context info */}
      <div style={{ fontSize: 11, color: P.textDim, marginBottom: 10 }}>
        Signal brut : <span style={{ color: P.text, fontWeight: 700 }}>{data.conv.score}%</span>
        {temporalCtx && (
          <> · Potentiel : <span style={{ color: temporalCtx.alignment.state.colorHex, fontWeight: 700 }}>{temporalCtx.layers.potentiel.score}%</span></>
        )}
        · CdV : <span style={{ color: P.text, fontWeight: 700 }}>{data.num.lp.v}</span>
      </div>

      <button onClick={doCalc} style={{
        width: '100%', padding: '10px 0', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 16,
        background: 'linear-gradient(135deg, #E0B0FF18, #9333ea1a)', border: '1.5px solid #E0B0FF40',
        color: '#E0B0FF', fontSize: 14, fontWeight: 700, letterSpacing: 1,
      }}>
        Consulter l'Oracle
      </button>
      {error && <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 10 }}>{error}</div>}

      {/* ═══ RÉSULTAT ═══ */}
      {result && (
        <div style={{ display: 'grid', gap: 14 }}>

          {/* Verdict principal */}
          <div style={{
            padding: '20px 16px', borderRadius: 12, textAlign: 'center',
            background: verdictBg, border: `2px solid ${verdictBdr}`,
            boxShadow: `0 0 24px ${result.verdict.color}15`,
          }}>
            <div style={{ fontSize: 40, marginBottom: 6 }}>{result.verdict.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: result.verdict.color, letterSpacing: 1.5 }}>
              {result.verdict.label}
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, color: result.verdict.color, marginTop: 6 }}>
              {result.oracleScore}<span style={{ fontSize: 14, opacity: 0.6 }}>%</span>
            </div>
            <div style={{ fontSize: 13, color: P.textMid, marginTop: 10, lineHeight: 1.6, fontStyle: 'italic', maxWidth: 400, margin: '10px auto 0' }}>
              {result.verdict.texte}
            </div>
            {result.mercuryCapped && (
              <div style={{ marginTop: 10, padding: '5px 12px', background: '#f59e0b10', border: '1px solid #f59e0b25', borderRadius: 20, display: 'inline-block' }}>
                <span style={{ fontSize: 11, color: '#f59e0b' }}>☿ Mercure Rétro — score cappé à 71</span>
              </div>
            )}
          </div>

          {/* Score composition */}
          <div style={{ padding: '12px 14px', borderRadius: 10, background: P.surface, border: `1px solid ${P.cardBdr}` }}>
            <div style={{ fontSize: 11, color: P.gold, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 10 }}>
              Composition du score
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 12 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: P.textDim }}>Score du jour</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: P.text }}>{result.dailyScore}%</div>
                <div style={{ fontSize: 10, color: P.textDim }}>×0.25</div>
              </div>
              <div style={{ color: P.textDim, fontSize: 20, alignSelf: 'center' }}>+</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: P.textDim }}>Score intrinsèque</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: P.text }}>{result.domainScore}%</div>
                <div style={{ fontSize: 10, color: P.textDim }}>×0.75</div>
              </div>
              <div style={{ color: P.textDim, fontSize: 20, alignSelf: 'center' }}>=</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: P.textDim }}>Oracle</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: result.verdict.color }}>{result.oracleScore}%</div>
              </div>
            </div>
          </div>

          {/* Breakdown */}
          {result.breakdown.length > 0 && (
            <div style={{ display: 'grid', gap: 6 }}>
              {result.breakdown.map((b, i) => (
                <div key={i} style={{ padding: '8px 12px', borderRadius: 8, background: P.surface, border: `1px solid ${P.cardBdr}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 12, color: P.text, fontWeight: 600 }}>{b.label}</div>
                    <div style={{ fontSize: 11, color: P.textDim }}>{b.value}</div>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: b.pts >= 0 ? '#4ade80' : '#ef4444' }}>
                    {b.pts > 0 ? '+' : ''}{b.pts}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Signals & Alerts */}
          {result.signals.length > 0 && (
            <div style={{ display: 'grid', gap: 4 }}>
              {result.signals.slice(0, 4).map((s, i) => (
                <div key={i} style={{ fontSize: 12, color: '#4ade80', padding: '5px 10px', background: '#4ade8008', borderRadius: 6, border: '1px solid #4ade8012' }}>
                  ✦ {s}
                </div>
              ))}
            </div>
          )}
          {result.alerts.length > 0 && (
            <div style={{ display: 'grid', gap: 4 }}>
              {result.alerts.slice(0, 4).map((a, i) => (
                <div key={i} style={{ fontSize: 12, color: '#f59e0b', padding: '5px 10px', background: '#f59e0b08', borderRadius: 6, border: '1px solid #f59e0b12' }}>
                  ⚠ {a}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Cd>
  );
}
