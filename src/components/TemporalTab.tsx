import { useState } from 'react';
import {
  type MomentumResult,
  type ForecastResult,
  type PastAnalysis,
  type PresentContext,
  type TemporalNarrative,
  type ArcName,
  getMomentumNarrativeKey,
  MOMENTUM_NARRATIVES,
  getForecastNarrativeKey,
  FORECAST_NARRATIVES,
  PY_THEMES,
  getPYNarrativePhase,
  getPinnaclePositionText,
  ARC_NARRATIVES,
  type PSIResult,
} from '../engines/temporal';
import { Sec, Cd, P } from './ui';

// ── Props ──
export interface TemporalData {
  momentum: MomentumResult;
  forecast: ForecastResult;
  past: PastAnalysis;
  present: PresentContext;
  arc: ArcName;
  narrative: TemporalNarrative;
}

interface Props {
  data: TemporalData;
  psi?: PSIResult | null;
}

// ── Helpers ──
const fmtDate = (d: Date): string =>
  d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

const trendIcon: Record<string, string> = {
  rising: '📈', falling: '📉', stable: '➡️', volatile: '🔀',
};
const trendLabel: Record<string, string> = {
  rising: 'En hausse', falling: 'En baisse', stable: 'Stable', volatile: 'Volatile',
};
const trendColor: Record<string, string> = {
  rising: '#4ade80', falling: '#ef4444', stable: '#60a5fa', volatile: '#f97316',
};

const intensityLabels: Record<string, { label: string; color: string; icon: string }> = {
  calm: { label: 'Calme', color: '#60a5fa', icon: '🌊' },
  building: { label: 'En construction', color: '#f59e0b', icon: '🔨' },
  peak: { label: 'Pic d\'activation', color: '#4ade80', icon: '⚡' },
  releasing: { label: 'Phase de relâchement', color: '#a78bfa', icon: '🍂' },
};

// ── Mini Sparkline SVG ──
function Sparkline({ scores }: { scores: number[] }) {
  if (scores.length < 2) return null;
  const min = Math.min(...scores), max = Math.max(...scores);
  const range = max - min || 1;
  const w = 140, h = 40, pad = 4;

  const points = scores.map((v, i) => {
    const x = (i / (scores.length - 1)) * w;
    const y = pad + (1 - (v - min) / range) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  // Color based on last vs first
  const color = scores[scores.length - 1] >= scores[0] ? '#4ade80' : '#ef4444';

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: h, display: 'block' }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="spkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${points} ${w},${h}`} fill="url(#spkGrad)" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {/* Dot on today (last point) */}
      {(() => {
        const lastX = w;
        const lastY = pad + (1 - (scores[scores.length - 1] - min) / range) * (h - pad * 2);
        return <circle cx={lastX} cy={lastY} r="3" fill={color} />;
      })()}
    </svg>
  );
}

// ── Accordion Block ──
function AccordionBlock({ title, icon, color, children, defaultOpen }: {
  title: string; icon: string; color: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div style={{
      marginBottom: 12, borderRadius: 10, overflow: 'hidden',
      border: `1px solid ${color}25`, background: `${color}06`,
    }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          padding: '12px 14px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>{icon}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: P.text }}>{title}</span>
        </div>
        <span style={{
          fontSize: 16, color: P.textDim,
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
        }}>▾</span>
      </div>
      {open && <div style={{ padding: '0 14px 14px' }}>{children}</div>}
    </div>
  );
}

// ══════════════════════════════════════
// ═══ TEMPORAL TAB PRINCIPALE ═══
// ══════════════════════════════════════

export default function TemporalTab({ data, psi }: Props) {
  const { momentum, forecast, past, present, arc, narrative } = data;

  const momKey = getMomentumNarrativeKey(momentum);
  const momNarr = MOMENTUM_NARRATIVES[momKey];
  const foreKey = getForecastNarrativeKey(forecast);
  const foreNarr = FORECAST_NARRATIVES[foreKey];
  const arcTexts = ARC_NARRATIVES[arc];
  const intInfo = intensityLabels[present.intensity] || intensityLabels.calm;

  // PY narrative phase
  const pyNum = present.cyclePosition.personalYear.number;
  const pyMonth = present.cyclePosition.personalYear.monthInYear;
  const pyNarr = getPYNarrativePhase(pyNum, pyMonth);

  // Pinnacle position text
  const pinnText = getPinnaclePositionText(
    present.cyclePosition.pinnacle.number,
    present.cyclePosition.pinnacle.position
  );

  return (
    <div>
      {/* ── Arc Narratif (Header) ── */}
      <Sec icon="🌀" title="Dynamique Temporelle">
        <Cd sx={{ marginBottom: 20, background: `linear-gradient(135deg, ${P.gold}08, ${P.gold}04)`, border: `1px solid ${P.gold}25` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: `${P.gold}18`, border: `2px solid ${P.gold}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22,
            }}>🌀</div>
            <div>
              <div style={{ fontSize: 10, color: P.textDim, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700 }}>
                Arc narratif
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: P.gold, letterSpacing: 1 }}>
                {arc}
              </div>
            </div>
          </div>
          {arcTexts && (
            <div style={{ fontSize: 13, color: P.textMid, lineHeight: 1.7, fontStyle: 'italic', marginBottom: 10 }}>
              {arcTexts.nuance}
            </div>
          )}
          {arcTexts && (
            <div style={{ padding: '8px 12px', borderRadius: 8, background: `${P.gold}0c`, border: `1px solid ${P.gold}20` }}>
              <div style={{ fontSize: 11, color: P.gold, fontWeight: 700 }}>✦ Conseil</div>
              <div style={{ fontSize: 12, color: P.gold, marginTop: 3, lineHeight: 1.5 }}>{arcTexts.conseil}</div>
            </div>
          )}
        </Cd>

        {/* ── Intensité du Moment ── */}
        <div style={{
          marginBottom: 16, padding: '12px 16px', borderRadius: 10,
          background: `${intInfo.color}08`, border: `1px solid ${intInfo.color}25`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 26 }}>{intInfo.icon}</span>
          <div>
            <div style={{ fontSize: 10, color: P.textDim, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600 }}>Intensité du moment</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: intInfo.color }}>{intInfo.label}</div>
            <div style={{ fontSize: 11, color: P.textMid, marginTop: 2 }}>{present.keyMessage}</div>
          </div>
        </div>

        {/* ── Momentum 7 jours ── */}
        <AccordionBlock title="Momentum 7 jours" icon={trendIcon[momentum.trend]} color={trendColor[momentum.trend]} defaultOpen>
          <div style={{ marginBottom: 12 }}>
            <Sparkline scores={momentum.scores} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
            <div style={{ padding: '8px 10px', borderRadius: 8, background: P.surface, textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: P.textDim, textTransform: 'uppercase', letterSpacing: 1 }}>Tendance</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: trendColor[momentum.trend], marginTop: 2 }}>{trendLabel[momentum.trend]}</div>
            </div>
            <div style={{ padding: '8px 10px', borderRadius: 8, background: P.surface, textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: P.textDim, textTransform: 'uppercase', letterSpacing: 1 }}>Série</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: momentum.streakType === 'positive' ? '#4ade80' : momentum.streakType === 'negative' ? '#ef4444' : P.textMid, marginTop: 2 }}>
                {momentum.streak}j {momentum.streakType === 'positive' ? '↑' : momentum.streakType === 'negative' ? '↓' : '—'}
              </div>
            </div>
            <div style={{ padding: '8px 10px', borderRadius: 8, background: P.surface, textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: P.textDim, textTransform: 'uppercase', letterSpacing: 1 }}>Moyenne</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: P.text, marginTop: 2 }}>{Math.round(momentum.avgLast7)}</div>
            </div>
          </div>
          {momNarr && (
            <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.6, marginBottom: 6 }}>{momNarr.descriptif}</div>
          )}
          {momNarr && (
            <div style={{ fontSize: 11, color: P.gold, fontWeight: 600 }}>→ {momNarr.conseil}</div>
          )}
        </AccordionBlock>

        {/* ── Forecast ── */}
        <AccordionBlock title="Prévisions" icon="🔭" color="#60a5fa" defaultOpen>
          {/* Next 7 days */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 8 }}>
              7 prochains jours
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <div style={{ padding: '8px 10px', borderRadius: 8, background: '#4ade800a', border: '1px solid #4ade8018' }}>
                <div style={{ fontSize: 9, color: '#4ade80', textTransform: 'uppercase', letterSpacing: 1 }}>Meilleur</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#4ade80', marginTop: 2 }}>
                  {Math.round(forecast.next7.best.score)}
                </div>
                <div style={{ fontSize: 10, color: P.textDim }}>{fmtDate(forecast.next7.best.date)}</div>
              </div>
              <div style={{ padding: '8px 10px', borderRadius: 8, background: P.surface }}>
                <div style={{ fontSize: 9, color: P.textDim, textTransform: 'uppercase', letterSpacing: 1 }}>Moyenne</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: P.text, marginTop: 2 }}>{Math.round(forecast.next7.avg)}</div>
              </div>
              <div style={{ padding: '8px 10px', borderRadius: 8, background: '#ef44440a', border: '1px solid #ef444418' }}>
                <div style={{ fontSize: 9, color: '#ef4444', textTransform: 'uppercase', letterSpacing: 1 }}>Énergie basse</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#ef4444', marginTop: 2 }}>
                  {Math.round(forecast.next7.worst.score)}
                </div>
                <div style={{ fontSize: 10, color: P.textDim }}>{fmtDate(forecast.next7.worst.date)}</div>
              </div>
            </div>
            {forecast.next7.goldDays > 0 && (
              <div style={{ fontSize: 11, color: P.gold, fontWeight: 600, marginTop: 8 }}>
                ✦ {forecast.next7.goldDays} jour{forecast.next7.goldDays > 1 ? 's' : ''} Alignement fort cette semaine
              </div>
            )}
          </div>
          {/* Next 30 / 90 summary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
            <div style={{ padding: '10px 12px', borderRadius: 8, background: P.surface }}>
              <div style={{ fontSize: 9, color: P.textDim, textTransform: 'uppercase', letterSpacing: 1 }}>30 jours</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: forecast.next30.trend === 'favorable' ? '#4ade80' : '#f97316', marginTop: 4 }}>
                {forecast.next30.trend === 'favorable' ? '↗ Bonne fenêtre' : '↘ Exigeant'}
              </div>
              <div style={{ fontSize: 10, color: P.textDim, marginTop: 2 }}>
                Moy. {Math.round(forecast.next30.avg)} · {forecast.next30.goldDays} Alignement fort
                {forecast.next30.cosmiqueDays > 0 && ` · ${forecast.next30.cosmiqueDays} Convergence rare`}
              </div>
            </div>
            <div style={{ padding: '10px 12px', borderRadius: 8, background: P.surface }}>
              <div style={{ fontSize: 9, color: P.textDim, textTransform: 'uppercase', letterSpacing: 1 }}>90 jours</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: P.text, marginTop: 4 }}>
                Moy. {Math.round(forecast.next90.avg)}
              </div>
              <div style={{ fontSize: 10, color: P.textDim, marginTop: 2 }}>
                {forecast.next90.goldDays} Alignement fort · {forecast.next90.majorEvents.length} Convergence rare
              </div>
            </div>
          </div>
          {/* Forecast narrative */}
          {foreNarr && (
            <>
              <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.6, marginBottom: 6 }}>{foreNarr.narratif}</div>
              <div style={{ fontSize: 11, color: '#60a5fa', fontWeight: 600 }}>→ {foreNarr.conseil}</div>
            </>
          )}
        </AccordionBlock>

        {/* ── Fenêtres d'Action ── */}
        {forecast.windows.length > 0 && (
          <AccordionBlock title={`Fenêtres d'action (${forecast.windows.length})`} icon="🎯" color={P.gold}>
            <div style={{ fontSize: 11, color: P.textDim, marginBottom: 10, lineHeight: 1.5 }}>
              Clusters de jours consécutifs à score ≥72 — les meilleurs moments pour lancer des initiatives.
            </div>
            {forecast.windows.slice(0, 5).map((w, i) => (
              <div key={i} style={{
                padding: '10px 12px', borderRadius: 8, marginBottom: 6,
                background: `${P.gold}0a`, border: `1px solid ${P.gold}18`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: P.gold }}>
                    {fmtDate(w.start)} → {fmtDate(w.end)}
                  </div>
                  <div style={{ fontSize: 10, color: P.textDim, marginTop: 2 }}>
                    {w.days} jour{w.days > 1 ? 's' : ''} · Moy. {Math.round(w.avg)}
                  </div>
                </div>
                <div style={{
                  padding: '4px 10px', borderRadius: 6,
                  background: `${P.gold}18`, color: P.gold,
                  fontSize: 11, fontWeight: 700,
                }}>GO</div>
              </div>
            ))}
          </AccordionBlock>
        )}

        {/* ── Événements à venir ── */}
        <AccordionBlock title="Événements à venir" icon="📡" color="#a78bfa">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* PY Transition */}
            {forecast.nextPYTransition && (
              <div style={{ padding: '10px 12px', borderRadius: 8, background: P.surface, border: `1px solid ${P.cardBdr}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>🔄</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: P.text }}>
                      Transition Année {forecast.nextPYTransition.fromPY} → {forecast.nextPYTransition.toPY}
                    </div>
                    <div style={{ fontSize: 10, color: P.textDim }}>
                      {fmtDate(forecast.nextPYTransition.date)} · dans {forecast.nextPYTransition.daysUntil}j
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Pinnacle Transition */}
            {forecast.nextPinnacleTransition && (
              <div style={{ padding: '10px 12px', borderRadius: 8, background: '#a78bfa0a', border: '1px solid #a78bfa18' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>🏔️</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa' }}>
                      Transition Pinnacle → âge {forecast.nextPinnacleTransition.transitionAge}
                    </div>
                    <div style={{ fontSize: 10, color: P.textDim }}>
                      dans {forecast.nextPinnacleTransition.daysUntil}j
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Next Retrograde */}
            {forecast.nextRetrograde && (
              <div style={{ padding: '10px 12px', borderRadius: 8, background: '#f973160a', border: '1px solid #f9731618' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>☿</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#f97316' }}>
                      {forecast.nextRetrograde.planet} — {forecast.nextRetrograde.type === 'retro_end' ? 'fin rétro' : 'début rétro'}
                    </div>
                    <div style={{ fontSize: 10, color: P.textDim }}>
                      {fmtDate(forecast.nextRetrograde.type === 'retro_end' ? forecast.nextRetrograde.endDate : forecast.nextRetrograde.startDate)} · dans {forecast.nextRetrograde.daysUntil}j
                    </div>
                  </div>
                </div>
              </div>
            )}
            {/* Next Eclipse */}
            {forecast.nextEclipse && (
              <div style={{ padding: '10px 12px', borderRadius: 8, background: '#ef44440a', border: '1px solid #ef444418' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>🌑</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#ef4444' }}>
                      Éclipse {forecast.nextEclipse.type}
                    </div>
                    <div style={{ fontSize: 10, color: P.textDim }}>
                      {fmtDate(forecast.nextEclipse.date)} · dans {forecast.nextEclipse.daysUntil}j
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </AccordionBlock>

        {/* ── Narrative Passé / Présent / Futur ── */}
        <AccordionBlock title="Narrative temporelle" icon="📖" color={P.gold}>
          {[
            { block: narrative.past, label: 'Passé', color: '#a78bfa' },
            { block: narrative.present, label: 'Présent', color: P.gold },
            { block: narrative.future, label: 'Futur', color: '#4ade80' },
          ].map(({ block, label, color }) => (
            <div key={label} style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 8,
              background: `${color}06`, borderLeft: `3px solid ${color}44`,
            }}>
              <div style={{ fontSize: 10, color, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>{label} — {block.title}</div>
              <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.7, marginTop: 4 }}>{block.narrative}</div>
              <div style={{ fontSize: 11, color: P.textDim, marginTop: 4, fontStyle: 'italic' }}>💡 {block.insight}</div>
            </div>
          ))}
        </AccordionBlock>

        {/* ── Position dans les cycles ── */}
        <AccordionBlock title="Position dans les cycles" icon="🧭" color="#60a5fa">
          {/* Année Personnelle */}
          <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 8, background: P.surface, border: `1px solid ${P.cardBdr}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ fontSize: 10, color: P.textDim, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>Année Personnelle</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: P.gold }}>{pyNum}</div>
            </div>
            <div style={{ fontSize: 11, color: P.gold, fontWeight: 600, marginBottom: 4 }}>
              {PY_THEMES[pyNum] || 'Cycle spécial'} · Mois {pyMonth}/12
            </div>
            {pyNarr && <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.6 }}>{pyNarr}</div>}
          </div>
          {/* Pinnacle */}
          <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 8, background: P.surface, border: `1px solid ${P.cardBdr}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ fontSize: 10, color: P.textDim, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>Pinnacle actif</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa' }}>
                #{present.cyclePosition.pinnacle.number} · {present.cyclePosition.pinnacle.position === 'early' ? 'Début' : present.cyclePosition.pinnacle.position === 'late' ? 'Fin' : 'Milieu'}
              </div>
            </div>
            <div style={{ fontSize: 11, color: P.textDim, marginBottom: 4 }}>
              {present.cyclePosition.pinnacle.yearsLeft} an{present.cyclePosition.pinnacle.yearsLeft > 1 ? 's' : ''} restant{present.cyclePosition.pinnacle.yearsLeft > 1 ? 's' : ''}
            </div>
            {pinnText && <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.6 }}>{pinnText.narrative}</div>}
            {pinnText && (
              <div style={{ fontSize: 11, color: '#a78bfa', fontWeight: 600, marginTop: 4 }}>→ {pinnText.conseil}</div>
            )}
          </div>
          {/* Mercury */}
          <div style={{ padding: '10px 14px', borderRadius: 8, background: P.surface, border: `1px solid ${P.cardBdr}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 10, color: P.textDim, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>Mercure</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: present.cyclePosition.mercuryPhase.score < -2 ? '#ef4444' : present.cyclePosition.mercuryPhase.score < 0 ? '#f97316' : '#4ade80' }}>
                {present.cyclePosition.mercuryPhase.label}
              </div>
            </div>
          </div>
        </AccordionBlock>
        {/* ── Résonance Périodique PSI (V4.9 Sprint E3) ── */}
        {psi && (psi.resonanceLabel === 'forte' || psi.resonanceLabel === 'modérée') && (() => {
          const isFort = psi.resonanceLabel === 'forte';
          const psiColor = isFort ? '#f59e0b' : '#60a5fa';
          const top = psi.pastMatches[0];
          const daysAgo = top
            ? Math.round((Date.now() - new Date(top.date).getTime()) / 86400000)
            : null;
          return (
            <AccordionBlock
              title={`Résonance Périodique — ${isFort ? 'Forte' : 'Modérée'}`}
              icon="🔄"
              color={psiColor}
              defaultOpen={isFort}
            >
              {/* Score + label */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 8, marginBottom: 12,
                background: `${psiColor}0a`, border: `1px solid ${psiColor}25`,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: `${psiColor}18`, border: `2px solid ${psiColor}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, flexShrink: 0,
                }}>🔄</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: psiColor, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>
                    Résonance {psi.resonanceLabel} — {psi.resonanceScore}%
                  </div>
                  <div style={{ fontSize: 12, color: P.textMid, marginTop: 3, lineHeight: 1.5 }}>
                    {psi.narrative}
                  </div>
                </div>
              </div>

              {/* Conseil */}
              {psi.conseil && (
                <div style={{ padding: '8px 12px', borderRadius: 8, background: `${psiColor}0c`, border: `1px solid ${psiColor}20`, marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: psiColor, fontWeight: 700 }}>✦ Conseil</div>
                  <div style={{ fontSize: 12, color: psiColor, marginTop: 3, lineHeight: 1.5 }}>{psi.conseil}</div>
                </div>
              )}

              {/* Top 3 jours passés similaires */}
              {psi.pastMatches.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 10, color: P.textDim, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 6 }}>
                    Jours passés similaires
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {psi.pastMatches.map((m, i) => {
                      const ago = Math.round((Date.now() - new Date(m.date).getTime()) / 86400000);
                      const mColor = m.resonanceLabel === 'forte' ? '#f59e0b' : m.resonanceLabel === 'modérée' ? '#60a5fa' : P.textDim;
                      return (
                        <div key={i} style={{
                          padding: '8px 10px', borderRadius: 7,
                          background: P.surface, border: `1px solid ${P.cardBdr}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: P.text }}>
                              Il y a {ago} jour{ago > 1 ? 's' : ''}
                            </div>
                            <div style={{ fontSize: 10, color: P.textDim, marginTop: 1 }}>
                              Distance : {m.distance.toFixed(2)} · {m.resonanceLabel}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            {m.score != null && (
                              <div style={{ fontSize: 14, fontWeight: 800, color: m.score >= 65 ? '#4ade80' : m.score >= 45 ? P.gold : '#ef4444' }}>
                                {m.score}%
                              </div>
                            )}
                            <div style={{ fontSize: 10, fontWeight: 700, color: mColor, marginTop: 1 }}>
                              {m.resonanceLabel}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Prochaine occurrence */}
              {psi.nextOccurrence && (() => {
                const inDays = Math.round((new Date(psi.nextOccurrence.date).getTime() - Date.now()) / 86400000);
                return (
                  <div style={{
                    padding: '8px 12px', borderRadius: 8,
                    background: '#4ade800a', border: '1px solid #4ade8018',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <span style={{ fontSize: 16 }}>📅</span>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#4ade80' }}>
                        Prochaine configuration similaire
                      </div>
                      <div style={{ fontSize: 10, color: P.textDim, marginTop: 2 }}>
                        Dans {inDays} jour{inDays > 1 ? 's' : ''} · distance {psi.nextOccurrence.distance.toFixed(2)}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </AccordionBlock>
          );
        })()}

      </Sec>
    </div>
  );
}
