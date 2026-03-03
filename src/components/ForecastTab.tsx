import { useState, useMemo } from 'react';
import { generateForecast36Months, type MonthForecast, type LifeDomain } from '../engines/convergence';
import { calcTemporalLayers, calcCI } from '../engines/temporal-layers';
import { type SoulData } from '../App';
import { Cd, P } from './ui';

// ══════════════════════════════════════════════════════════════════
// ═══ HORIZON 36 MOIS — V4.5 MOMENTUM ═══
// Graphique divergent centré sur la normale personnelle.
// Zéro chiffre absolu — labels catégoriels + rang relatif.
// Spec arbitrée Gemini + GPT + Grok — 23/02/2026
// ══════════════════════════════════════════════════════════════════

const DOMAIN_ICONS: Record<LifeDomain, string> = {
  BUSINESS: '💼', AMOUR: '❤️', RELATIONS: '🤝',
  CREATIVITE: '✨', INTROSPECTION: '🧘', VITALITE: '⚡',
};
const DOMAIN_LABELS: Record<LifeDomain, string> = {
  BUSINESS: 'Business', AMOUR: 'Amour', RELATIONS: 'Relations',
  CREATIVITE: 'Créativité', INTROSPECTION: 'Introspection', VITALITE: 'Vitalité',
};
const MONTH_FULL = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const MONTH_SHORT = ['', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun',
  'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

// ── Tiers de momentum ──
type MomentumTier = 'acceleration' | 'elan' | 'continuite' | 'repli' | 'protection';

interface MomentumData {
  value: number;      // -10 à +10
  tier: MomentumTier;
  rank: number;       // 1 = meilleur
  percentile: number; // 0-100
}

const TIER_CONFIG: Record<MomentumTier, {
  icon: string; label: string; color: string; bg: string; border: string; advice: string;
}> = {
  acceleration: {
    icon: '🚀', label: 'Accélération',
    color: '#FFD700', bg: '#FFD70012', border: '#FFD70035',
    advice: 'Période rare et puissante. Lancez vos projets, signez, décidez. Le vent souffle fort dans votre sens.',
  },
  elan: {
    icon: '✅', label: 'Élan',
    color: '#4ade80', bg: '#4ade8012', border: '#4ade8030',
    advice: 'Bonne dynamique. Avancez sur vos objectifs prioritaires et profitez des fenêtres d\'action du mois.',
  },
  continuite: {
    icon: '➡', label: 'Continuité',
    color: '#71717a', bg: '#71717a10', border: '#71717a25',
    advice: 'Période normale — c\'est la majorité du temps. Avancez régulièrement, sans forcer ni ralentir.',
  },
  repli: {
    icon: '⏸', label: 'Repli',
    color: '#a78bfa', bg: '#a78bfa0c', border: '#a78bfa25',
    advice: 'Période de consolidation. Préparez le terrain, réfléchissez stratégiquement. Reportez les grandes décisions.',
  },
  protection: {
    icon: '🛡', label: 'Protection',
    color: '#3b82f6', bg: '#3b82f60c', border: '#3b82f625',
    advice: 'Période de friction. Protégez vos acquis, économisez votre énergie. Les phases basses préparent les rebonds.',
  },
};

function momentumColor(m: number): string {
  if (m >= 8)  return '#FFD700';
  if (m >= 3)  return '#4ade80';
  if (m >= -2) return '#71717a';
  if (m >= -7) return '#a78bfa';
  return '#3b82f6';
}

// ── Calcul momentum (formule asymétrique Gemini) ──
function calcMomentum(scores: number[]): MomentumData[] {
  const n = scores.length;
  const sorted = [...scores].sort((a, b) => a - b);
  const median = sorted[Math.floor(n / 2)];
  const max = sorted[n - 1];
  const min = sorted[0];

  const getPercentile = (score: number) => {
    const below = sorted.filter(s => s < score).length;
    return Math.round((below / Math.max(n - 1, 1)) * 100);
  };

  const getTier = (pct: number): MomentumTier => {
    if (pct >= 90) return 'acceleration';
    if (pct >= 75) return 'elan';
    if (pct >= 25) return 'continuite';
    if (pct >= 10) return 'repli';
    return 'protection';
  };

  return scores.map(score => {
    let value: number;
    if (score > median && max !== median) {
      value = ((score - median) / (max - median)) * 10;
    } else if (score < median && median !== min) {
      value = ((score - median) / (median - min)) * 10;
    } else {
      value = 0;
    }
    value = Math.max(-10, Math.min(10, value));
    const percentile = getPercentile(score);
    const rank = [...sorted].reverse().findIndex(s => s === score) + 1;
    return { value, tier: getTier(percentile), rank, percentile };
  });
}

function rankText(rank: number, total: number): string {
  const pct = Math.round(((total - rank) / (total - 1)) * 100);
  if (rank === 1) return '✦ Votre meilleur mois des 3 ans';
  if (rank === 2) return '✦ 2ᵉ meilleur mois des 3 ans';
  if (rank === 3) return '✦ 3ᵉ meilleur mois des 3 ans';
  if (pct >= 90) return 'Parmi vos meilleurs mois';
  if (pct >= 75) return 'Bien au-dessus de votre normale';
  if (pct >= 50) return 'Au-dessus de votre normale';
  if (pct >= 25) return 'Dans votre normale';
  if (pct >= 10) return 'En dessous de votre normale';
  return 'Parmi vos mois les plus calmes';
}

// Zone de Mutation : dégradé opacité mois 19 → 36
const MUTATION_START = 18;
function mutationOpacity(idx: number): number {
  if (idx < MUTATION_START) return 1;
  const progress = (idx - MUTATION_START) / (35 - MUTATION_START);
  return Math.max(0.35, 0.65 - progress * 0.30);
}

// ══════════════════════════════════════
// ═══ COMPOSANT PRINCIPAL ═══
// ══════════════════════════════════════

export default function ForecastTab({ data, bd }: { data: SoulData; bd: string }) {
  const [selectedIdx, setSelectedIdx] = useState(0);

  const forecast = useMemo(() => {
    try { return generateForecast36Months(bd, data.num, data.cz, new Date(), 0, data.astro); }
    catch (e) { console.error('Horizon error:', e); return []; }
  }, [bd, data.num, data.cz, data.astro]);

  const temporalCtx = useMemo(() => {
    try {
      return calcTemporalLayers({
        luckPillars: data.luckPillars,
        num: data.num,
        currentScore: data.conv.score,
        birthDate: new Date(bd + 'T00:00:00'),
      });
    } catch { return null; }
  }, [data, bd]);

  const momentums = useMemo(() => {
    if (!forecast.length) return [];
    return calcMomentum(forecast.map(f => f.score));
  }, [forecast]);

  if (forecast.length === 0 || momentums.length === 0) {
    return (
      <Cd>
        <div style={{ textAlign: 'center', color: P.textDim, padding: 40 }}>
          Impossible de calculer les tendances. Vérifiez votre date de naissance.
        </div>
      </Cd>
    );
  }

  const now = new Date();
  const curIdx = Math.max(0, forecast.findIndex(
    f => f.year === now.getFullYear() && f.month === now.getMonth() + 1
  ));

  const selected = forecast[selectedIdx];
  const selMom = momentums[selectedIdx];
  const curMom = momentums[curIdx];
  const years = [...new Set(forecast.map(f => f.year))];

  const nextElanIdx  = momentums.findIndex((m, i) => i > curIdx && (m.tier === 'acceleration' || m.tier === 'elan'));
  const nextAccelIdx = momentums.findIndex((m, i) => i > curIdx && m.tier === 'acceleration');
  const bestIdx = momentums.reduce((bi, m, i) => m.value > momentums[bi].value ? i : bi, 0);

  const selCI = (() => {
    if (!temporalCtx) return null;
    try { return calcCI(Math.max(0, (selectedIdx - curIdx) * 30), temporalCtx.coherenceRatio, temporalCtx.sigma7j); }
    catch { return null; }
  })();

  return (
    <Cd>

      {/* ═══ HEADER ═══ */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: P.gold, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700 }}>
          🔭 Horizon 36 mois — Momentum
        </div>
        <div style={{ fontSize: 11, color: P.textMid, marginTop: 4, lineHeight: 1.6 }}>
          La <b style={{ color: P.text }}>forme de vos 3 prochaines années</b> — quand le vent souffle dans votre sens, quand il ralentit.
          Les barres indiquent votre position <b style={{ color: P.text }}>par rapport à votre propre normale</b>, pas à une échelle universelle.
        </div>
      </div>

      {/* ═══ CARDS RÉSUMÉ ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>

        {/* Ce mois */}
        <div style={{ padding: '10px 8px', borderRadius: 10, textAlign: 'center', background: TIER_CONFIG[curMom.tier].bg, border: `1px solid ${TIER_CONFIG[curMom.tier].border}` }}>
          <div style={{ fontSize: 9, color: P.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Ce mois</div>
          <div style={{ fontSize: 24 }}>{TIER_CONFIG[curMom.tier].icon}</div>
          <div style={{ fontSize: 11, color: TIER_CONFIG[curMom.tier].color, fontWeight: 700, marginTop: 2 }}>
            {TIER_CONFIG[curMom.tier].label}
          </div>
          <div style={{ fontSize: 9, color: P.textDim, marginTop: 3, lineHeight: 1.4 }}>{rankText(curMom.rank, 36)}</div>
        </div>

        {/* Prochain élan */}
        {nextElanIdx >= 0 ? (
          <div onClick={() => setSelectedIdx(nextElanIdx)} style={{ padding: '10px 8px', borderRadius: 10, textAlign: 'center', background: '#4ade8010', border: '1px solid #4ade8025', cursor: 'pointer' }}>
            <div style={{ fontSize: 9, color: P.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
              {nextAccelIdx >= 0 ? 'Prochain 🚀' : 'Prochain ✅'}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#4ade80' }}>
              {MONTH_SHORT[forecast[nextElanIdx].month]} {forecast[nextElanIdx].year}
            </div>
            <div style={{ fontSize: 10, color: '#4ade80', marginTop: 2 }}>
              {TIER_CONFIG[momentums[nextElanIdx].tier].label}
            </div>
            <div style={{ fontSize: 9, color: P.textDim, marginTop: 2 }}>dans {nextElanIdx - curIdx} mois</div>
          </div>
        ) : (
          <div style={{ padding: '10px 8px', borderRadius: 10, textAlign: 'center', background: P.surface, border: `1px solid ${P.cardBdr}` }}>
            <div style={{ fontSize: 9, color: P.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Mois porteurs</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: P.text }}>
              {momentums.filter(m => m.tier === 'acceleration' || m.tier === 'elan').length}
            </div>
            <div style={{ fontSize: 10, color: P.textDim, marginTop: 2 }}>sur 36 mois</div>
          </div>
        )}

        {/* Meilleur mois */}
        <div onClick={() => setSelectedIdx(bestIdx)} style={{ padding: '10px 8px', borderRadius: 10, textAlign: 'center', background: '#FFD70010', border: '1px solid #FFD70025', cursor: 'pointer' }}>
          <div style={{ fontSize: 9, color: P.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Meilleur</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#FFD700' }}>
            {MONTH_SHORT[forecast[bestIdx].month]} {forecast[bestIdx].year}
          </div>
          <div style={{ fontSize: 10, color: '#FFD700', marginTop: 2 }}>🚀 Accélération</div>
          <div style={{ fontSize: 9, color: P.textDim, marginTop: 2 }}>Tap pour détails</div>
        </div>
      </div>

      {/* ═══ GRAPHIQUE DIVERGENT ═══ */}
      <div style={{ padding: '14px 10px', borderRadius: 12, background: P.surface, border: `1px solid ${P.cardBdr}`, marginBottom: 16 }}>

        {/* Labels années */}
        <div style={{ display: 'flex', marginBottom: 6 }}>
          {years.map(y => {
            const n = forecast.filter(f => f.year === y).length;
            return <div key={y} style={{ flex: n, textAlign: 'center', fontSize: 10, color: P.textDim, fontWeight: 700 }}>{y}</div>;
          })}
        </div>

        {/* Zone haute — barres positives */}
        <div style={{ display: 'flex', gap: 1, alignItems: 'flex-end', height: 54 }}>
          {momentums.map((m, i) => {
            const isSel = i === selectedIdx;
            const isCur = i === curIdx;
            const col = momentumColor(m.value);
            const h = m.value > 0 ? Math.max(2, (m.value / 10) * 50) : 0;
            const opacity = mutationOpacity(i);
            const isMut = i >= MUTATION_START;
            return (
              <div key={i} onClick={() => setSelectedIdx(i)}
                style={{ flex: 1, height: 54, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', cursor: 'pointer', alignItems: 'center' }}>
                {isCur && !isSel && <div style={{ width: 3, height: 3, borderRadius: '50%', background: P.gold, marginBottom: 1 }} />}
                {h > 0 && (
                  <div style={{
                    width: isSel ? '100%' : '78%', height: h, borderRadius: '2px 2px 0 0',
                    background: isMut
                      ? `repeating-linear-gradient(45deg,${col}55,${col}55 2px,transparent 2px,transparent 5px)`
                      : col + (isSel ? 'dd' : '88'),
                    border: isSel ? `1px solid ${col}` : 'none',
                    boxShadow: isSel ? `0 0 8px ${col}55` : 'none',
                    opacity, transition: 'all 0.15s',
                  }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Ligne zéro — ligne de flottaison */}
        <div style={{ position: 'relative', height: 18 }}>
          <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: P.cardBdr }} />
          {/* Point mois actuel */}
          <div style={{
            position: 'absolute', top: '50%', left: `${(curIdx / 35) * 100}%`,
            transform: 'translateX(-50%) translateY(-50%)',
          }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: P.gold, boxShadow: `0 0 6px ${P.gold}` }} />
          </div>
          {/* Point mois sélectionné */}
          {selectedIdx !== curIdx && (
            <div style={{
              position: 'absolute', top: '50%', left: `${(selectedIdx / 35) * 100}%`,
              transform: 'translateX(-50%) translateY(-50%)',
            }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: TIER_CONFIG[selMom.tier].color, boxShadow: `0 0 5px ${TIER_CONFIG[selMom.tier].color}` }} />
            </div>
          )}
          <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', fontSize: 7.5, color: P.textDim, paddingRight: 2 }}>
            ↑ porteur · ↓ calme
          </div>
        </div>

        {/* Zone basse — barres négatives */}
        <div style={{ display: 'flex', gap: 1, alignItems: 'flex-start', height: 54 }}>
          {momentums.map((m, i) => {
            const isSel = i === selectedIdx;
            const col = momentumColor(m.value);
            const h = m.value < 0 ? Math.max(2, (Math.abs(m.value) / 10) * 40) : 0;
            const opacity = mutationOpacity(i);
            const isMut = i >= MUTATION_START;
            return (
              <div key={i} onClick={() => setSelectedIdx(i)}
                style={{ flex: 1, height: 54, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', cursor: 'pointer', alignItems: 'center' }}>
                {h > 0 && (
                  <div style={{
                    width: isSel ? '100%' : '78%', height: h, borderRadius: '0 0 2px 2px',
                    background: isMut
                      ? `repeating-linear-gradient(45deg,${col}55,${col}55 2px,transparent 2px,transparent 5px)`
                      : col + (isSel ? 'dd' : '88'),
                    border: isSel ? `1px solid ${col}` : 'none',
                    boxShadow: isSel ? `0 0 8px ${col}55` : 'none',
                    opacity, transition: 'all 0.15s',
                  }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Labels mois */}
        <div style={{ display: 'flex', gap: 1, marginTop: 4 }}>
          {forecast.map((f, i) => (
            <div key={i} style={{
              flex: 1, textAlign: 'center', fontSize: 7,
              color: i === selectedIdx ? P.text : i === curIdx ? P.gold : P.textDim,
              fontWeight: i === selectedIdx || i === curIdx ? 700 : 400,
            }}>
              {i % 6 === 0 || i === selectedIdx || i === curIdx ? MONTH_SHORT[f.month]?.slice(0, 1) : ''}
            </div>
          ))}
        </div>

        {/* Légende */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 10, flexWrap: 'wrap' }}>
          {(['acceleration', 'elan', 'continuite', 'repli', 'protection'] as MomentumTier[]).map(t => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: TIER_CONFIG[t].color }} />
              <span style={{ fontSize: 9, color: P.textDim }}>{TIER_CONFIG[t].icon} {TIER_CONFIG[t].label}</span>
            </div>
          ))}
        </div>

        {/* Zone de Mutation */}
        <div style={{ marginTop: 10, padding: '6px 10px', borderRadius: 6, background: '#4B008218', border: '1px solid #7B52AB30', fontSize: 10, color: '#a78bfa', lineHeight: 1.5 }}>
          <b>Barres hachurées</b> (à partir du 19ᵉ mois) — Projection à faible stabilité statistique. Les dynamiques peuvent évoluer.
        </div>
      </div>

      {/* ═══ NAVIGATION RAPIDE ═══ */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={() => setSelectedIdx(curIdx)} style={{ padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', background: selectedIdx === curIdx ? `${P.gold}18` : 'transparent', border: `1px solid ${P.gold}30`, color: P.gold, fontSize: 10, fontWeight: 600 }}>📍 Ce mois</button>
        {nextElanIdx >= 0 && (
          <button onClick={() => setSelectedIdx(nextElanIdx)} style={{ padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', background: 'transparent', border: '1px solid #4ade8030', color: '#4ade80', fontSize: 10, fontWeight: 600 }}>↗ Prochain élan</button>
        )}
        {nextAccelIdx >= 0 && (
          <button onClick={() => setSelectedIdx(nextAccelIdx)} style={{ padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', background: 'transparent', border: '1px solid #FFD70030', color: '#FFD700', fontSize: 10, fontWeight: 600 }}>🚀 Prochaine accélération</button>
        )}
        <button onClick={() => setSelectedIdx(bestIdx)} style={{ padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', background: 'transparent', border: '1px solid #FFD70020', color: P.textDim, fontSize: 10 }}>✦ Meilleur mois</button>
      </div>

      {/* ═══ DÉTAIL DU MOIS SÉLECTIONNÉ ═══ */}
      <div style={{ display: 'grid', gap: 10 }}>

        {/* En-tête */}
        <div style={{ padding: '16px', borderRadius: 12, textAlign: 'center', background: TIER_CONFIG[selMom.tier].bg, border: `1.5px solid ${TIER_CONFIG[selMom.tier].border}` }}>
          <div style={{ fontSize: 13, color: P.textMid, fontWeight: 600, marginBottom: 6 }}>
            {MONTH_FULL[selected.month]} {selected.year}
            {selectedIdx === curIdx && <span style={{ fontSize: 10, color: P.gold, marginLeft: 8 }}>● Ce mois</span>}
          </div>
          <div style={{ fontSize: 44 }}>{TIER_CONFIG[selMom.tier].icon}</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: TIER_CONFIG[selMom.tier].color, marginTop: 6, letterSpacing: 1 }}>
            {TIER_CONFIG[selMom.tier].label}
          </div>
          <div style={{ marginTop: 10, padding: '5px 14px', borderRadius: 20, display: 'inline-block', background: TIER_CONFIG[selMom.tier].color + '18', border: `1px solid ${TIER_CONFIG[selMom.tier].color}35` }}>
            <span style={{ fontSize: 11, color: TIER_CONFIG[selMom.tier].color, fontWeight: 600 }}>
              {rankText(selMom.rank, 36)}
            </span>
          </div>
          {selectedIdx >= MUTATION_START && (
            <div style={{ marginTop: 8, fontSize: 10, color: '#a78bfa', fontStyle: 'italic' }}>
              🌀 Projection à faible stabilité statistique — les dynamiques peuvent évoluer
            </div>
          )}
        </div>

        {/* Conseil */}
        <div style={{ padding: '12px 14px', borderRadius: 10, background: TIER_CONFIG[selMom.tier].bg, border: `1px solid ${TIER_CONFIG[selMom.tier].border}` }}>
          <div style={{ fontSize: 10, color: TIER_CONFIG[selMom.tier].color, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 6 }}>
            Que faire en {MONTH_FULL[selected.month]} ?
          </div>
          <div style={{ fontSize: 13, color: P.text, lineHeight: 1.7 }}>
            {TIER_CONFIG[selMom.tier].advice}
            {selected.dominantDomains?.[0] && (
              <span style={{ color: P.textMid }}> Domaine porteur : {DOMAIN_ICONS[selected.dominantDomains[0]]} {DOMAIN_LABELS[selected.dominantDomains[0]]}.</span>
            )}
          </div>
        </div>

        {/* Fiabilité */}
        {selCI && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: P.surface, border: `1px solid ${P.cardBdr}` }}>
            <div style={{ fontSize: 11, color: P.textDim, whiteSpace: 'nowrap' }}>Fiabilité :</div>
            <div style={{ flex: 1, height: 6, background: '#27272a', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${selCI.percent}%`, background: selCI.isZoneMutation ? '#7B52AB' : selCI.percent >= 70 ? '#4ade80' : selCI.percent >= 50 ? '#60a5fa' : '#f59e0b', borderRadius: 3 }} />
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: selCI.isZoneMutation ? '#a78bfa' : P.text, minWidth: 36, textAlign: 'right' }}>
              {selCI.percent}%
            </div>
          </div>
        )}

        {/* Domaines */}
        {selected.dominantDomains && selected.dominantDomains.length > 0 && (
          <div style={{ padding: '10px 12px', borderRadius: 8, background: P.surface, border: `1px solid ${P.cardBdr}` }}>
            <div style={{ fontSize: 10, color: P.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontWeight: 600 }}>Domaines favorisés</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {selected.dominantDomains.slice(0, 3).map((d, i) => {
                const col = TIER_CONFIG[selMom.tier].color;
                return (
                  <div key={i} style={{ padding: '5px 12px', borderRadius: 20, background: i === 0 ? col + '15' : col + '08', border: `1px solid ${i === 0 ? col + '35' : col + '18'}`, fontSize: 12, color: i === 0 ? col : P.textMid, fontWeight: i === 0 ? 700 : 400 }}>
                    {DOMAIN_ICONS[d]} {DOMAIN_LABELS[d]}{i === 0 && <span style={{ fontSize: 9, marginLeft: 4, opacity: 0.7 }}>★</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Fenêtres d'action */}
        {selected.windows && selected.windows.length > 0 ? (
          <div style={{ padding: '10px 12px', borderRadius: 8, background: '#4ade8008', border: '1px solid #4ade8018' }}>
            <div style={{ fontSize: 10, color: '#4ade80', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontWeight: 600 }}>
              🎯 Meilleurs moments dans le mois
            </div>
            <div style={{ display: 'grid', gap: 5 }}>
              {selected.windows.slice(0, 3).map((w, i) => {
                const sd = parseInt(w.startDate.split('-')[2]);
                const ed = parseInt(w.endDate.split('-')[2]);
                return (
                  <div key={i} style={{ padding: '7px 10px', borderRadius: 7, background: P.surface, border: `1px solid ${P.cardBdr}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: 14 }}>{DOMAIN_ICONS[w.domain]}</span>
                      <span style={{ fontSize: 12, color: '#4ade80', fontWeight: 600, marginLeft: 6 }}>{w.label}</span>
                      <div style={{ fontSize: 10, color: P.textDim, marginTop: 1 }}>
                        {sd}–{ed} {MONTH_FULL[selected.month]} · {w.days} jours
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: TIER_CONFIG[selMom.tier].color, fontWeight: 700, padding: '3px 10px', borderRadius: 6, background: TIER_CONFIG[selMom.tier].bg, border: `1px solid ${TIER_CONFIG[selMom.tier].border}`, whiteSpace: 'nowrap' }}>
                      {TIER_CONFIG[selMom.tier].label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{ padding: '12px 14px', borderRadius: 8, background: P.surface, border: `1px solid ${P.cardBdr}` }}>
            <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.7 }}>
              {selMom.tier === 'protection'
                ? 'Mois calme — pas de fenêtre d\'action identifiée. Conservez votre énergie, observez, préparez. Le rebond vient après.'
                : selMom.tier === 'repli'
                ? 'Pas de fenêtre d\'action ce mois-ci. Bon moment pour réfléchir, planifier, et poser les bases des prochains mois porteurs.'
                : 'Pas de fenêtre d\'action spécifique — avancez régulièrement sur vos projets en cours.'}
            </div>
          </div>
        )}


      </div>
    </Cd>
  );
}
