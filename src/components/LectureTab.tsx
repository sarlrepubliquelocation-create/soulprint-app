import { useState, useMemo } from 'react';
import { type SoulData } from '../App';
import { generateStrategicReading, type StrategicReading, type ReadingInsight, type Crossing, type ActionItem } from '../engines/strategic-reading';
import { Cd, P } from './ui';

interface Props {
  data: SoulData;
  bd: string;
  narr: string;
  narrLoad: boolean;
  genNarr: () => void;
}

// ── Couleurs par intensité ──
const INTENSITY_STYLE: Record<string, { bg: string; border: string; glow: string }> = {
  forte:   { bg: '#D4A01715', border: '#D4A01735', glow: '0 0 12px #D4A01712' },
  moyenne: { bg: '#60a5fa08', border: '#60a5fa20', glow: 'none' },
  subtile: { bg: '#27272a', border: '#3f3f46', glow: 'none' },
};

// ── Composant Insight ──
function InsightCard({ insight }: { insight: ReadingInsight }) {
  const style = INTENSITY_STYLE[insight.intensity] || INTENSITY_STYLE.subtile;
  return (
    <div style={{
      padding: '12px 14px', borderRadius: 10,
      background: style.bg, border: `1px solid ${style.border}`,
      boxShadow: style.glow, marginBottom: 10,
    }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{insight.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: P.text, lineHeight: 1.7, marginBottom: 6 }}>
            {insight.text}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {insight.sources.map((s, i) => (
              <span key={i} style={{
                fontSize: 9, padding: '2px 7px', borderRadius: 4,
                background: insight.intensity === 'forte' ? '#D4A01718' : '#27272a',
                color: insight.intensity === 'forte' ? P.gold : P.textDim,
                fontWeight: 600, letterSpacing: 0.5,
              }}>{s}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Composant Convergence ──
function CrossingCard({ crossing }: { crossing: Crossing }) {
  const barWidth = Math.min(100, (crossing.strength / 8) * 100);
  return (
    <div style={{
      padding: '12px 14px', borderRadius: 10,
      background: crossing.strength >= 5 ? '#D4A01712' : '#60a5fa08',
      border: `1px solid ${crossing.strength >= 5 ? '#D4A01730' : '#60a5fa18'}`,
      marginBottom: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 22 }}>{crossing.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: P.text }}>{crossing.theme}</span>
            <span style={{
              fontSize: 10, padding: '2px 8px', borderRadius: 10,
              background: crossing.strength >= 5 ? P.gold : '#60a5fa',
              color: '#09090b', fontWeight: 700,
            }}>{crossing.strength} systèmes</span>
          </div>
        </div>
      </div>
      {/* Barre de force */}
      <div style={{ height: 4, background: '#27272a', borderRadius: 2, marginBottom: 8, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 2,
          background: crossing.strength >= 5
            ? `linear-gradient(90deg, ${P.gold}88, ${P.gold})`
            : `linear-gradient(90deg, #60a5fa66, #60a5fa)`,
          width: `${barWidth}%`,
          transition: 'width 0.5s ease',
        }} />
      </div>
      <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.6 }}>
        {crossing.description}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 6 }}>
        {crossing.systems.map((s, i) => (
          <span key={i} style={{
            fontSize: 9, padding: '2px 6px', borderRadius: 3,
            background: '#27272a', color: P.textDim, fontWeight: 500,
          }}>{s}</span>
        ))}
      </div>
    </div>
  );
}

// ── Composant Action ──
function ActionCard({ item, idx }: { item: ActionItem; idx: number }) {
  const priColors: Record<string, string> = { haute: '#ef4444', moyenne: P.gold, basse: '#60a5fa' };
  return (
    <div style={{
      padding: '12px 14px', borderRadius: 10,
      background: `${priColors[item.priority]}08`,
      border: `1px solid ${priColors[item.priority]}20`,
      marginBottom: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{
          width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `${priColors[item.priority]}20`, color: priColors[item.priority],
          fontSize: 11, fontWeight: 700,
        }}>{idx + 1}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: P.text }}>{item.action}</span>
      </div>
      <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.6, marginLeft: 30 }}>
        {item.why}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 6, marginLeft: 30 }}>
        {item.sources.map((s, i) => (
          <span key={i} style={{
            fontSize: 9, padding: '2px 6px', borderRadius: 3,
            background: '#27272a', color: P.textDim, fontWeight: 500,
          }}>{s}</span>
        ))}
      </div>
    </div>
  );
}

// ── Bloc accordéon (Passé / Présent / Futur) ──
function ReadingBlockUI({ block, defaultOpen }: { block: { title: string; period: string; insights: ReadingInsight[]; summary: string }; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div style={{
      marginBottom: 14, borderRadius: 12, overflow: 'hidden',
      border: `1px solid ${P.cardBdr}`, background: P.surface,
    }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          padding: '14px 16px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: open ? `${P.gold}08` : 'transparent',
          transition: 'background 0.2s',
        }}
      >
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: P.text }}>{block.title}</div>
          <div style={{ fontSize: 11, color: P.textDim, marginTop: 2 }}>{block.period}</div>
        </div>
        <span style={{
          fontSize: 18, color: P.textDim,
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
        }}>▾</span>
      </div>
      {open && (
        <div style={{ padding: '4px 14px 14px' }}>
          {block.insights.map((ins, i) => <InsightCard key={i} insight={ins} />)}
          <div style={{
            marginTop: 4, padding: '8px 12px', borderRadius: 8,
            background: '#27272a', fontSize: 11, color: P.textDim,
            fontWeight: 500, lineHeight: 1.5,
          }}>
            📌 {block.summary}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════
// ═══ LECTURE TAB PRINCIPALE ═══
// ══════════════════════════════════════

export default function LectureTab({ data, bd, narr, narrLoad, genNarr }: Props) {
  const reading = useMemo<StrategicReading>(
    () => generateStrategicReading(data, bd),
    [data, bd]
  );

  return (
    <div>
      {/* ── Verdict du jour ── */}
      <div style={{
        marginBottom: 20, padding: '16px 18px', borderRadius: 12,
        background: `linear-gradient(135deg, ${P.gold}10, ${P.gold}05)`,
        border: `1px solid ${P.gold}25`,
        boxShadow: `0 2px 20px ${P.gold}08`,
      }}>
        <div style={{ fontSize: 10, color: P.gold, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700, marginBottom: 8 }}>
          ✦ Verdict du jour
        </div>
        <div style={{ fontSize: 14, color: P.text, lineHeight: 1.7, fontWeight: 500 }}>
          {reading.todayVerdict}
        </div>
      </div>

      {/* ── Portrait ── */}
      <div style={{
        marginBottom: 20, padding: '12px 16px', borderRadius: 10,
        background: P.surface, border: `1px solid ${P.cardBdr}`,
      }}>
        <div style={{ fontSize: 10, color: P.textDim, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 6 }}>
          Portrait
        </div>
        <div style={{ fontSize: 13, color: P.textMid, lineHeight: 1.6, fontStyle: 'italic' }}>
          {reading.portrait}
        </div>
      </div>

      {/* ── 3 Blocs : Passé / Présent / Futur ── */}
      <ReadingBlockUI block={reading.past} />
      <ReadingBlockUI block={reading.present} defaultOpen={true} />
      <ReadingBlockUI block={reading.future} />

      {/* ── Convergences détectées ── */}
      {reading.crossings.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: P.gold, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 12 }}>
            🔗 Convergences détectées
          </div>
          <div style={{ fontSize: 12, color: P.textDim, marginBottom: 10, lineHeight: 1.5 }}>
            Quand 3 systèmes ou plus pointent dans la même direction, le signal est puissant.
          </div>
          {reading.crossings.map((c, i) => <CrossingCard key={i} crossing={c} />)}
        </div>
      )}

      {/* ── Plan d'action ── */}
      {reading.actionPlan.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: P.gold, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 12 }}>
            📋 Plan d'action
          </div>
          {reading.actionPlan.map((a, i) => <ActionCard key={i} item={a} idx={i} />)}
        </div>
      )}

      {/* ── Séparateur ── */}
      <div style={{ margin: '28px 0 20px', borderTop: `1px solid ${P.cardBdr}`, position: 'relative' }}>
        <span style={{
          position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
          background: P.bg, padding: '0 12px', fontSize: 10, color: P.textDim,
          textTransform: 'uppercase', letterSpacing: 2, fontWeight: 600,
        }}>Narration IA</span>
      </div>

      {/* ── Niveau 2 : Narration IA ── */}
      <Cd>
        {!narr && !narrLoad && (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <div style={{ fontSize: 13, color: P.textDim, marginBottom: 14, lineHeight: 1.6 }}>
              L'IA reçoit ta lecture stratégique complète (8 systèmes croisés) et la transforme en narration personnalisée.
            </div>
            <button onClick={genNarr} style={{
              padding: '12px 32px', background: `linear-gradient(135deg,${P.gold},#C9A84C)`,
              border: 'none', borderRadius: 10, color: '#09090b', fontSize: 15, fontWeight: 700,
              cursor: 'pointer', letterSpacing: 1, fontFamily: 'inherit',
              boxShadow: `0 4px 16px ${P.goldGlow}`
            }}>
              ✦ Enrichir avec l'IA
            </button>
          </div>
        )}
        {narrLoad && (
          <div style={{ textAlign: 'center', padding: 30 }}>
            <div style={{ fontSize: 30, animation: 'pulse 1.5s infinite' }}>🔮</div>
            <div style={{ fontSize: 13, color: P.gold, marginTop: 10 }}>L'oracle consulte les astres...</div>
          </div>
        )}
        {narr && (
          <div style={{ fontSize: 14, color: P.textMid, lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>
            {narr}
          </div>
        )}
        {narr && (
          <button onClick={genNarr} style={{
            marginTop: 18, padding: '9px 22px', background: P.surface,
            border: `1px solid ${P.cardBdr}`, borderRadius: 8, color: P.gold,
            fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600
          }}>
            ↻ Régénérer
          </button>
        )}
      </Cd>
    </div>
  );
}
