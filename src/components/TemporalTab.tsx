import { useState } from 'react';
import {
  type MomentumResult,
  type ForecastResult,
  type PastAnalysis,
  type PresentContext,
  type TemporalNarrative,
  type ArcName,
  type MACDResult,
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
import { type TemporalCI, type PotentielAction, type TransitionAlert } from '../engines/temporal-layers';
import { COSMIC_THRESHOLD, STRONG_THRESHOLD } from '../engines/scoring-constants';
import { Sec, Cd, P } from './ui';
import { useTimelineSafe } from '../contexts/TimelineContext'; // Ronde #35 S2 — calibOffset sur affichages

// ── Props ──
export interface ForecastCIData {
  ci7: TemporalCI;
  ci30: TemporalCI;
  ci90: TemporalCI;
}

export interface TemporalData {
  momentum: MomentumResult;
  forecast: ForecastResult;
  past: PastAnalysis;
  present: PresentContext;
  arc: ArcName;
  narrative: TemporalNarrative;
  macd?: MACDResult;
  forecastCI?: ForecastCIData;
  potentielAction?: PotentielAction;
  transitionAlerts?: TransitionAlert[];
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

/** Traduit une distance PSI brute en label lisible */
const ciColor = (label: string): string =>
  label === 'Haute' ? '#4ade80' : label === 'Bonne' ? '#60a5fa' : label === 'Modérée' ? '#f59e0b' : '#ef4444';

// Distance euclidienne 12D : plage réelle ~0-6, forte < 2.1, modérée < 4.0
const distanceLabel = (d: number): string =>
  d < 0.7 ? 'quasi identique' : d < 1.2 ? 'très similaire' : d < 2.1 ? 'similaire' : d < 4.0 ? 'partiellement similaire' : 'faiblement similaire';

/** Normalise un nombre de jours en label UX lisible */
const fmtDaysUntil = (days: number): string => {
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return 'Demain';
  if (days < 30) return `Dans ${days} jours`;
  if (days < 60) return 'Dans ~1 mois';
  const months = Math.round(days / 30);
  if (months <= 12) return `Dans ~${months} mois`;
  const years = Math.floor(months / 12);
  const remainMonths = months % 12;
  if (remainMonths === 0) return `Dans ~${years} an${years > 1 ? 's' : ''}`;
  return `Dans ~${years} an${years > 1 ? 's' : ''} et ${remainMonths} mois`;
};

const intensityLabels: Record<string, { label: string; color: string; icon: string }> = {
  calm: { label: 'Calme', color: '#60a5fa', icon: '🌊' },
  building: { label: 'En construction', color: '#f59e0b', icon: '🔨' },
  peak: { label: 'Pic d\'activation', color: '#4ade80', icon: '🌟' },
  releasing: { label: 'Phase de relâchement', color: '#a78bfa', icon: '🍂' },
};

// ── Mini Sparkline SVG ──
function Sparkline({ scores }: { scores: number[] }) {
  if (scores.length < 2) return (
    <div style={{ fontSize: 10, color: P.textDim, fontStyle: 'italic', textAlign: 'center', padding: '12px 0' }}>
      Données insuffisantes pour le graphique
    </div>
  );
  const min = Math.min(...scores), max = Math.max(...scores);
  const range = max - min;
  const w = 140, h = 40, pad = 4;

  // Si tous les scores sont identiques, ligne stable au centre
  if (range === 0) {
    const mid = h / 2;
    return (
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: h, display: 'block' }} preserveAspectRatio="none">
        <line x1="0" y1={mid} x2={w} y2={mid} stroke="#60a5fa" strokeWidth="2" strokeDasharray="4 4" opacity="0.5" />
      </svg>
    );
  }

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

// ── Expandable Event Block ──
// P2-2 : Tap target ≥ 44×44px (WCAG 2.5.8) — padding augmenté pour mobile
function ExpandableEvent({ icon, title, subtitle, color, detail }: {
  icon: string; title: string; subtitle: string; color: string; detail?: string;
}) {
  const [open, setOpen] = useState(false);
  const hasDetail = !!detail;
  return (
    <div
      onClick={hasDetail ? () => setOpen(!open) : undefined}
      style={{
        padding: '12px 14px', borderRadius: 8,
        minHeight: 44,
        cursor: hasDetail ? 'pointer' : 'default',
        background: `${color}08`, border: `1px solid ${color}20`,
        transition: 'all 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 20 }}>
        <span style={{ fontSize: 18, lineHeight: 1, minWidth: 22, textAlign: 'center' }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color }}>{title}</div>
          <div style={{ fontSize: 11, color: P.textDim, marginTop: 2 }}>{subtitle}</div>
        </div>
        {hasDetail && (
          <span style={{
            fontSize: 14, color: P.textDim,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}>▾</span>
        )}
      </div>
      {hasDetail && (
        <div style={{
          maxHeight: open ? 200 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.2s ease-in-out, opacity 0.2s ease-in-out',
          opacity: open ? 1 : 0,
        }}>
          <div style={{
            marginTop: 8, paddingTop: 8,
            borderTop: `1px solid ${color}15`,
            fontSize: 11, color: P.textMid, lineHeight: 1.6,
          }}>
            {detail}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Textes d'explication pour les événements ──
const EVENT_DETAILS = {
  pyTransition: (from: number, to: number) => {
    const themes: Record<number, string> = {
      1: 'Nouveau départ — initier des projets, oser, planter des graines',
      2: 'Partenariats — collaborer, écouter, renforcer tes relations',
      3: 'Créativité — t\'exprimer, communiquer, explorer tes talents',
      4: 'Structure — construire des fondations solides, organiser',
      5: 'Changement — accepter l\'imprévu, voyager, te libérer',
      6: 'Harmonie — nourrir tes relations, responsabilités, foyer',
      7: 'Introspection — te recentrer, analyser, approfondir ta compréhension',
      8: 'Pouvoir — récolter, gérer tes ressources, prendre des décisions',
      9: 'Clôture — lâcher prise, bilan, préparer le prochain cycle',
    };
    return `Tu quittes l'énergie de l'Année ${from} (${themes[from]?.split(' — ')[0] ?? 'cycle spécial'}) pour entrer dans l'Année ${to}.\n\n` +
      `Énergie à venir : ${themes[to] ?? 'cycle spécial'}.\n\n` +
      `Conseil : les 2-3 mois autour de cette transition sont souvent ressentis comme un "entre-deux". C'est normal — le nouveau thème s'installe progressivement.`;
  },
  pinnacle: (age: number) => (
    `À ${age} ans, tu entres dans une nouvelle grande phase de vie. Les Sommets sont les 4 grandes saisons de ton existence.\n\n` +
    `Ce changement redéfinit tes priorités profondes, ton environnement, et la nature des défis que tu rencontres.\n\n` +
    `Conseil : anticipe cette transition en observant ce qui "ne fonctionne plus" dans ta vie actuelle — c'est souvent le signe que la nouvelle phase prépare le terrain.`
  ),
  retrograde: (planet: string, isEnd: boolean) => {
    const energies: Record<string, string> = {
      'Mercure': 'communication, technologie, contrats, déplacements',
      'Vénus': 'relations, argent, esthétique, valeurs personnelles',
      'Mars': 'énergie, motivation, conflits, prise de décision',
      'Jupiter': 'expansion, optimisme, opportunités, croissance',
      'Saturne': 'responsabilités, structures, discipline, limites',
    };
    const energy = energies[planet] ?? 'cycles planétaires profonds';
    return isEnd
      ? `La rétrogradation de ${planet} se termine — les blocages liés à ${energy} commencent à se lever.\n\nConseil : c'est le moment de relancer les projets mis en pause. L'énergie redevient directe et fluide.`
      : `${planet} entre en rétrogradation — les domaines touchés : ${energy}.\n\nCette phase invite à la révision, pas à l'action forcée. Relis, reconsidère, peaufine plutôt que de lancer du neuf.\n\nConseil : évite de signer des contrats importants ou de faire des achats majeurs pendant cette période si possible.`;
  },
  eclipse: (type: string) => (
    `Les éclipses sont des catalyseurs de changement — elles accélèrent des processus déjà en cours.\n\n` +
    `Une éclipse ${type.toLowerCase()} amplifie les transformations sur 6 mois. Ce n'est pas un événement "bon" ou "mauvais" — c'est un accélérateur.\n\n` +
    `Conseil : observe ce qui émerge ou disparaît dans les 2 semaines autour de cette date. Les éclipses révèlent ce qui était caché.`
  ),
  transitionAlert: (template: string) => template,
};

// ══════════════════════════════════════
// ═══ TEMPORAL TAB PRINCIPALE ═══
// ══════════════════════════════════════

// ── P2-3 : Paliers Potentiel calibrés sur données réelles ──
// Distribution observée : 50% des jours entre 40-70, extremes rares
const getPotentielPalier = (score: number): { label: string; color: string; icon: string } => {
  if (score >= COSMIC_THRESHOLD) return { label: 'Convergence rare', color: '#E0B0FF', icon: '🌟' };
  if (score >= STRONG_THRESHOLD) return { label: 'Alignement fort', color: '#FFD700', icon: '🔥' };
  if (score >= 72) return { label: 'Fort',         color: '#4ade80', icon: '🔥' };
  if (score >= 55) return { label: 'Bon',          color: '#60a5fa', icon: '✦' };
  if (score >= 40) return { label: 'Modéré',       color: '#f59e0b', icon: '○' };
  return                   { label: 'Faible',       color: '#9890aa', icon: '·' };
};

export default function TemporalTab({ data, psi }: Props) {
  const { momentum, forecast, past, present, arc, narrative, macd, forecastCI, potentielAction, transitionAlerts } = data;
  const [showAllWindows, setShowAllWindows] = useState(false);
  // Ronde #35 S2 — toDisplay() pour convertir les scores bruts engine → affichés (+ calibOffset)
  const _tl = useTimelineSafe();
  const toD = _tl?.toDisplay ?? ((v: number) => Math.round(v)); // fallback identité si pas de provider
  // P2-1 : Toggle Essentiel / Complet
  const [viewMode, setViewMode] = useState<'essentiel' | 'complet'>('essentiel');

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
        {/* P2-1 : Toggle Essentiel / Complet */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', marginBottom: 12,
        }}>
          <div style={{
            display: 'inline-flex', borderRadius: 8, overflow: 'hidden',
            border: `1px solid ${P.cardBdr}`, background: P.surface,
          }}>
            {(['essentiel', 'complet'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                aria-label={`Mode ${mode === 'essentiel' ? 'Essentiel' : 'Complet'}`}
                style={{
                  padding: '6px 14px', fontSize: 11, fontWeight: 600,
                  cursor: 'pointer', border: 'none', outline: 'none',
                  background: viewMode === mode ? `${P.gold}25` : 'transparent',
                  color: viewMode === mode ? P.gold : P.textDim,
                  textTransform: 'capitalize',
                  transition: 'all 0.2s',
                }}
              >
                {mode === 'essentiel' ? '◉ Essentiel' : '◎ Complet'}
              </button>
            ))}
          </div>
        </div>
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

        {/* ── En un coup d'œil ── */}
        <div style={{
          marginBottom: 16, padding: '10px 14px', borderRadius: 10,
          background: `${P.surface}`, border: `1px solid ${P.cardBdr}`,
        }}>
          <div style={{ fontSize: 10, color: P.textDim, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 8 }}>
            👁️ En un coup d'œil
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.6 }}>
              <span style={{ fontWeight: 700, color: trendColor[momentum.trend] }}>{trendLabel[momentum.trend]}</span>
              {' · '}
              <span>{intInfo.label}</span>
              {potentielAction && potentielAction.delta !== 0 && (() => {
                const _displayPotentiel = toD(potentielAction.score);
                const p = getPotentielPalier(_displayPotentiel);
                return <span> · Potentiel <span style={{ fontWeight: 700, color: p.color }}>{_displayPotentiel}</span> <span style={{ fontSize: 10, color: p.color }}>({p.label})</span></span>;
              })()}
            </div>
            {forecastCI?.ci7 && (
              <div style={{ fontSize: 11, color: P.textDim }}>
                Fiabilité 7j : <span style={{ fontWeight: 600, color: ciColor(forecastCI.ci7.label) }}>{forecastCI.ci7.percent}% ({forecastCI.ci7.label})</span>
              </div>
            )}
            {forecast.next7.best.score >= 72 && (
              <div style={{ fontSize: 11, color: P.gold }}>
                ✦ Prochaine fenêtre : <span style={{ fontWeight: 600 }}>{fmtDate(forecast.next7.best.date)}</span> (score {toD(forecast.next7.best.score)})
              </div>
            )}
          </div>
        </div>

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
          <div className="grid-responsive-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
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
              <div style={{ fontSize: 14, fontWeight: 700, color: P.text, marginTop: 2 }}>{toD(momentum.avgLast7)}</div>
            </div>
          </div>
          {momNarr && (
            <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.6, marginBottom: 6 }}>{momNarr.descriptif}</div>
          )}
          {momNarr && (
            <div style={{ fontSize: 11, color: P.gold, fontWeight: 600 }}>→ {momNarr.conseil}</div>
          )}
          {/* Signal d'inversion — détection de changement de tendance */}
          {macd && (macd.crossover || macd.divergence) && (
            <div style={{
              marginTop: 10, padding: '8px 12px', borderRadius: 8,
              background: macd.crossover === 'bullish' ? '#4ade800a' : '#ef44440a',
              border: `1px solid ${macd.crossover === 'bullish' ? '#4ade8025' : '#ef444425'}`,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 16 }}>{macd.crossover === 'bullish' ? '📈' : macd.crossover === 'bearish' ? '📉' : '⚠️'}</span>
              <div style={{ fontSize: 11, color: macd.crossover === 'bullish' ? '#4ade80' : '#ef4444', lineHeight: 1.5, fontWeight: 600 }}>
                {macd.narrative}
              </div>
            </div>
          )}
          {/* Narrative — Passé (dispersé depuis Narrative Temporelle) */}
          <div style={{
            marginTop: 12, padding: '10px 14px', borderRadius: 8,
            background: '#a78bfa06', borderLeft: '3px solid #a78bfa44',
          }}>
            <div style={{ fontSize: 10, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>🔮 Passé récent — {narrative.past.title}</div>
            <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.7, marginTop: 4 }}>{narrative.past.narrative}</div>
            <div style={{ fontSize: 11, color: P.textDim, marginTop: 4, fontStyle: 'italic' }}>💡 {narrative.past.insight}</div>
          </div>
        </AccordionBlock>

        {/* ── Potentiel d'Action + Présent fusionnés ── */}
        <div style={{
          padding: '12px 14px', borderRadius: 10, marginBottom: 12,
          background: potentielAction && potentielAction.delta > 0 ? '#4ade800a' : `${P.gold}06`,
          border: `1px solid ${potentielAction && potentielAction.delta > 0 ? '#4ade8020' : `${P.gold}20`}`,
        }}>
          {/* Potentiel d'Action */}
          {/* P2-3 : Potentiel d'action avec palier qualitatif calibré */}
          {potentielAction && potentielAction.delta !== 0 && (() => {
            const _dpScore = toD(potentielAction.score);
            const palier = getPotentielPalier(_dpScore);
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 18 }}>{palier.icon}</span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: palier.color }}>
                      Potentiel d'action : {_dpScore}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                      background: `${palier.color}18`, color: palier.color,
                    }}>
                      {palier.label}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: P.textDim, marginTop: 2 }}>
                    Score du jour ({toD(potentielAction.score - potentielAction.delta)}) {potentielAction.delta > 0 ? 'amplifié' : 'atténué'} par tes cycles Année et Mois Personnels ({potentielAction.delta > 0 ? '+' : ''}{potentielAction.delta} pts)
                  </div>
                </div>
              </div>
            );
          })()}
          {/* Narrative Présent — intégrée dans la card */}
          <div style={{
            padding: '8px 12px', borderRadius: 8,
            background: `${P.gold}08`, borderLeft: `3px solid ${P.gold}44`,
          }}>
            <div style={{ fontSize: 10, color: P.gold, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>
              ☀️ Présent — {narrative.present.title}
            </div>
            <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.7, marginTop: 4 }}>{narrative.present.narrative}</div>
            <div style={{ fontSize: 11, color: P.textDim, marginTop: 4, fontStyle: 'italic' }}>💡 {narrative.present.insight}</div>
          </div>
        </div>

        {/* ── Forecast ── */}
        <AccordionBlock title="Prévisions" icon="🔭" color="#60a5fa" defaultOpen>
          {/* Next 7 days */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 8 }}>
              7 prochains jours
            </div>
            <div className="grid-responsive-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <div style={{ padding: '8px 10px', borderRadius: 8, background: '#4ade800a', border: '1px solid #4ade8018' }}>
                <div style={{ fontSize: 9, color: '#4ade80', textTransform: 'uppercase', letterSpacing: 1 }}>Meilleur</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#4ade80', marginTop: 2 }}>
                  {toD(forecast.next7.best.score)}
                </div>
                <div style={{ fontSize: 10, color: P.textDim }}>{fmtDate(forecast.next7.best.date)}</div>
              </div>
              <div style={{ padding: '8px 10px', borderRadius: 8, background: P.surface }}>
                <div style={{ fontSize: 9, color: P.textDim, textTransform: 'uppercase', letterSpacing: 1 }}>Moyenne</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: P.text, marginTop: 2 }}>{toD(forecast.next7.avg)}</div>
              </div>
              <div style={{ padding: '8px 10px', borderRadius: 8, background: '#ef44440a', border: '1px solid #ef444418' }}>
                <div style={{ fontSize: 9, color: '#ef4444', textTransform: 'uppercase', letterSpacing: 1 }}>Score le plus bas</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#ef4444', marginTop: 2 }}>
                  {toD(forecast.next7.worst.score)}
                </div>
                <div style={{ fontSize: 10, color: P.textDim }}>{fmtDate(forecast.next7.worst.date)}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
              {forecast.next7.goldDays > 0 && (
                <div style={{ fontSize: 11, color: P.gold, fontWeight: 600 }}>
                  ✦ {forecast.next7.goldDays} jour{forecast.next7.goldDays > 1 ? 's' : ''} Alignement fort
                </div>
              )}
              {forecastCI?.ci7 && (
                <div style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 6,
                  background: `${ciColor(forecastCI.ci7.label)}12`,
                  color: ciColor(forecastCI.ci7.label),
                  marginLeft: 'auto',
                }}>
                  Fiabilité {forecastCI.ci7.percent}% · {forecastCI.ci7.label}
                </div>
              )}
            </div>
            {/* Avertissement score élevé + fiabilité basse */}
            {forecast.next7.best.score > 90 && forecastCI?.ci7 && forecastCI.ci7.percent < 55 && (
              <div style={{ fontSize: 10, color: '#f59e0b', marginTop: 6, lineHeight: 1.5, fontStyle: 'italic' }}>
                ⚠️ Score élevé mais fiabilité instable — cette fenêtre est prometteuse, reste attentif aux variations des prochains jours.
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
                Moy. {toD(forecast.next30.avg)} · {forecast.next30.goldDays} Alignement fort
                {forecast.next30.cosmiqueDays > 0 && ` · ${forecast.next30.cosmiqueDays} Convergence rare`}
              </div>
              {forecastCI?.ci30 && (
                <div style={{ fontSize: 9, color: ciColor(forecastCI.ci30.label), fontWeight: 600, marginTop: 4 }}>
                  ◎ {forecastCI.ci30.label} ({forecastCI.ci30.percent}%)
                </div>
              )}
            </div>
            <div style={{ padding: '10px 12px', borderRadius: 8, background: P.surface }}>
              <div style={{ fontSize: 9, color: P.textDim, textTransform: 'uppercase', letterSpacing: 1 }}>90 jours</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: P.text, marginTop: 4 }}>
                Moy. {toD(forecast.next90.avg)}
              </div>
              <div style={{ fontSize: 10, color: P.textDim, marginTop: 2 }}>
                {forecast.next90.goldDays} Alignement fort · {forecast.next90.majorEvents.length} Convergence rare
              </div>
              {forecastCI?.ci90 && (
                <div style={{ fontSize: 9, color: ciColor(forecastCI.ci90.label), fontWeight: 600, marginTop: 4 }}>
                  ◎ {forecastCI.ci90.label} ({forecastCI.ci90.percent}%)
                </div>
              )}
            </div>
          </div>
          {/* Forecast narrative */}
          {foreNarr && (
            <>
              <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.6, marginBottom: 6 }}>{foreNarr.narratif}</div>
              <div style={{ fontSize: 11, color: '#60a5fa', fontWeight: 600 }}>→ {foreNarr.conseil}</div>
            </>
          )}
          {/* Zone de Mutation — quand la fiabilité chute sous 40% */}
          {forecastCI && (forecastCI.ci7.isZoneMutation || forecastCI.ci30.isZoneMutation || forecastCI.ci90.isZoneMutation) && (
            <div style={{
              marginTop: 12, padding: '10px 14px', borderRadius: 8,
              background: '#a855f70a', border: '1px solid #a855f720',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#a855f7', marginBottom: 4 }}>
                🔮 Zone de Mutation
              </div>
              <div style={{ fontSize: 11, color: P.textMid, lineHeight: 1.6 }}>
                {forecastCI.ci7.isZoneMutation
                  ? 'La fiabilité à court terme est faible — cette période présente une forte variabilité. Tes choix auront un poids supérieur à la moyenne : ton libre arbitre définit cet horizon.'
                  : forecastCI.ci30.isZoneMutation
                  ? 'La fiabilité à 30 jours est incertaine — les tendances peuvent se retourner. Reste flexible et ajuste ta stratégie au fil des jours.'
                  : 'L\'horizon 90 jours est en phase de transition — les prévisions longues sont moins fiables. Concentre-toi sur les fenêtres proches.'}
              </div>
            </div>
          )}
          {/* Narrative — Futur (dispersé depuis Narrative Temporelle) */}
          <div style={{
            marginTop: 12, padding: '10px 14px', borderRadius: 8,
            background: '#4ade8006', borderLeft: '3px solid #4ade8044',
          }}>
            <div style={{ fontSize: 10, color: '#4ade80', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>🔭 Futur — {narrative.future.title}</div>
            <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.7, marginTop: 4 }}>{narrative.future.narrative}</div>
            <div style={{ fontSize: 11, color: P.textDim, marginTop: 4, fontStyle: 'italic' }}>💡 {narrative.future.insight}</div>
          </div>
        </AccordionBlock>

        {/* ── Fenêtres d'Action ── (P2-1 : masqué en mode Essentiel) */}
        {viewMode === 'complet' && <AccordionBlock title={`Fenêtres d'action (${forecast.windows.length})`} icon="🎯" color={P.gold}>
          {forecast.windows.length === 0 ? (
            <div style={{ fontSize: 11, color: P.textDim, lineHeight: 1.5, fontStyle: 'italic' }}>
              Aucune fenêtre d'action détectée sur les 90 prochains jours. Les scores restent sous le seuil de 72.
            </div>
          ) : (
            <>
            <div style={{ fontSize: 11, color: P.textDim, marginBottom: 10, lineHeight: 1.5 }}>
              Clusters de jours consécutifs à score ≥72 — les meilleurs moments pour lancer des initiatives.
            </div>
            {forecast.windows.slice(0, showAllWindows ? forecast.windows.length : 3).map((w, i) => (
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
                    {w.days} jour{w.days > 1 ? 's' : ''} · Moy. {toD(w.avg)}
                  </div>
                </div>
                <div style={{
                  padding: '4px 10px', borderRadius: 6,
                  background: `${P.gold}18`, color: P.gold,
                  fontSize: 10, fontWeight: 700,
                }}>{toD(w.avg)}</div>
              </div>
            ))}
            {forecast.windows.length > 3 && !showAllWindows && (
              <div
                onClick={() => setShowAllWindows(true)}
                style={{
                  textAlign: 'center', padding: '8px 0', cursor: 'pointer',
                  fontSize: 11, color: P.gold, fontWeight: 600,
                  borderTop: `1px solid ${P.gold}18`, marginTop: 4,
                }}
              >
                Voir les {forecast.windows.length - 3} autres fenêtres ▾
              </div>
            )}
            {showAllWindows && forecast.windows.length > 3 && (
              <div
                onClick={() => setShowAllWindows(false)}
                style={{
                  textAlign: 'center', padding: '8px 0', cursor: 'pointer',
                  fontSize: 11, color: P.textDim, fontWeight: 600,
                  marginTop: 4,
                }}
              >
                Réduire ▴
              </div>
            )}
            </>
          )}
        </AccordionBlock>}

        {/* ── Événements à venir (triés par chronologie) ── (P2-1 : masqué en mode Essentiel) */}
        {viewMode === 'complet' && <AccordionBlock title="Événements à venir" icon="📡" color="#a78bfa">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(() => {
              // Construire un tableau unifié de tous les événements, triés par daysUntil
              const events: { key: string; daysUntil: number; el: React.ReactNode }[] = [];

              // Transition Alerts (LP change, PY9→1, etc.)
              if (transitionAlerts) {
                transitionAlerts.forEach((alert, i) => {
                  events.push({
                    key: `ta-${i}`,
                    daysUntil: alert.monthsAway * 30,
                    el: (
                      <ExpandableEvent
                        icon={alert.urgency.icon}
                        title={alert.label}
                        subtitle={`${alert.urgency.category} · ${fmtDaysUntil(alert.monthsAway * 30)}`}
                        color={alert.urgency.color}
                        detail={alert.template}
                      />
                    ),
                  });
                });
              }

              // PY Transition
              if (forecast.nextPYTransition) {
                const t = forecast.nextPYTransition;
                events.push({
                  key: 'py',
                  daysUntil: t.daysUntil,
                  el: (
                    <ExpandableEvent
                      icon="🔄"
                      title={`Transition Année ${t.fromPY} → ${t.toPY}`}
                      subtitle={`${fmtDate(t.date)} · ${fmtDaysUntil(t.daysUntil)}`}
                      color="#a78bfa"
                      detail={EVENT_DETAILS.pyTransition(t.fromPY, t.toPY)}
                    />
                  ),
                });
              }

              // Pinnacle Transition
              if (forecast.nextPinnacleTransition) {
                const p = forecast.nextPinnacleTransition;
                events.push({
                  key: 'pinnacle',
                  daysUntil: p.daysUntil,
                  el: (
                    <ExpandableEvent
                      icon="🏔️"
                      title={`Changement de phase de vie → âge ${p.transitionAge}`}
                      subtitle={fmtDaysUntil(p.daysUntil)}
                      color="#a78bfa"
                      detail={EVENT_DETAILS.pinnacle(p.transitionAge)}
                    />
                  ),
                });
              }

              // Next Retrograde
              if (forecast.nextRetrograde) {
                const r = forecast.nextRetrograde;
                events.push({
                  key: 'retro',
                  daysUntil: r.daysUntil,
                  el: (
                    <ExpandableEvent
                      icon="☿"
                      title={`${r.planet} — ${r.type === 'retro_end' ? 'fin rétro' : 'début rétro'}`}
                      subtitle={`${fmtDate(r.type === 'retro_end' ? r.endDate : r.startDate)} · ${fmtDaysUntil(r.daysUntil)}`}
                      color="#f97316"
                      detail={EVENT_DETAILS.retrograde(r.planet, r.type === 'retro_end')}
                    />
                  ),
                });
              }

              // Next Eclipse
              if (forecast.nextEclipse) {
                const e = forecast.nextEclipse;
                events.push({
                  key: 'eclipse',
                  daysUntil: e.daysUntil,
                  el: (
                    <ExpandableEvent
                      icon="🌑"
                      title={`Éclipse ${e.type}`}
                      subtitle={`${fmtDate(e.date)} · ${fmtDaysUntil(e.daysUntil)}`}
                      color="#ef4444"
                      detail={EVENT_DETAILS.eclipse(e.type)}
                    />
                  ),
                });
              }

              // Tri chronologique (le plus proche en premier)
              events.sort((a, b) => a.daysUntil - b.daysUntil);

              return events.map(ev => <div key={ev.key}>{ev.el}</div>);
            })()}
          </div>
        </AccordionBlock>}

        {/* Narrative Temporelle supprimée — dispersée dans Momentum (Passé), Potentiel (Présent), Prévisions (Futur) */}

        {/* ── Position dans les cycles ── (P2-1 : masqué en mode Essentiel) */}
        {viewMode === 'complet' && <AccordionBlock title="Position dans les cycles" icon="🧭" color="#60a5fa">
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
              <div style={{ fontSize: 10, color: P.textDim, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>Sommet actif</div>
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
        </AccordionBlock>}
        {/* ── Résonance Périodique PSI (V4.9 Sprint E3) ── (P2-1 : masqué en mode Essentiel) */}
        {viewMode === 'complet' && psi && (psi.resonanceLabel === 'forte' || psi.resonanceLabel === 'modérée') && (() => {
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
                      // Raison contextuelle du match — en langage humain
                      const cycleDays = [7, 14, 28, 30, 60, 90, 180, 365];
                      const nearCycle = cycleDays.find(c => Math.abs(ago - c) <= 2);
                      const matchReason = nearCycle
                        ? nearCycle === 7 ? 'il y a exactement une semaine'
                        : nearCycle === 14 ? 'il y a 2 semaines'
                        : nearCycle === 28 || nearCycle === 30 ? 'il y a un mois'
                        : nearCycle === 60 ? 'il y a 2 mois'
                        : nearCycle === 90 ? 'il y a 3 mois'
                        : nearCycle === 180 ? 'il y a 6 mois'
                        : 'il y a un an'
                        : ago < 10 ? 'récemment — motif qui se répète'
                        : ago % 30 < 3 ? 'motif mensuel'
                        : 'motif récurrent';
                      const resonanceHuman = m.resonanceLabel === 'forte' ? 'très proche' : m.resonanceLabel === 'modérée' ? 'proche' : 'assez proche';
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
                              {resonanceHuman} · {matchReason}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            {m.score != null && (() => {
                              const _ds = toD(m.score);
                              return <div style={{ fontSize: 14, fontWeight: 800, color: _ds >= 65 ? '#4ade80' : _ds >= 45 ? P.gold : '#ef4444' }}>
                                {_ds}%
                              </div>;
                            })()}
                            {/* resonanceLabel supprimé — redondant avec resonanceHuman affiché en description */}
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
                        Dans {inDays} jour{inDays > 1 ? 's' : ''} · {distanceLabel(psi.nextOccurrence.distance)}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </AccordionBlock>
          );
        })()}
        {/* PSI empty state — quand pas de résonance significative (P2-1 : masqué en mode Essentiel) */}
        {viewMode === 'complet' && (!psi || (psi.resonanceLabel !== 'forte' && psi.resonanceLabel !== 'modérée')) && (
          <AccordionBlock title="Résonance Périodique" icon="🔄" color={P.textDim}>
            <div style={{ fontSize: 11, color: P.textDim, lineHeight: 1.5, fontStyle: 'italic' }}>
              {!psi
                ? 'Données de résonance indisponibles — le moteur PSI nécessite un historique suffisant.'
                : 'Aucune résonance significative détectée — cette configuration est peu commune dans ton cycle. Les patterns habituels ne s\'appliquent pas aujourd\'hui.'}
            </div>
          </AccordionBlock>
        )}

      </Sec>
    </div>
  );
}
