import React, { useState, useMemo, useEffect } from 'react';
import { type MonthForecast, type LifeDomain, COSMIC_THRESHOLD, DOMAIN_META, getDomainLabel, getDomainIcon } from '../engines/convergence';
import { calcTemporalLayers, calcCI } from '../engines/temporal-layers';
import { getCalibOffset } from '../engines/calibration'; // V4.5 — GAP=0 liveScore pour forecast
import { getAllHistoricalScores } from '../engines/score-history';
import { type SoulData } from '../App';
import { Cd, P, a11yClick } from './ui';
import { useForecastWorker } from '../hooks/useForecastWorker';

// ══════════════════════════════════════════════════════════════════
// ═══ HORIZON 36 MOIS — V4.5 MOMENTUM ═══
// Graphique divergent centré sur la normale personnelle.
// Zéro chiffre absolu — labels catégoriels + rang relatif.
// Spec arbitrée Gemini + GPT + Grok — 23/02/2026
// ══════════════════════════════════════════════════════════════════

// DOMAIN_META, getDomainLabel, getDomainIcon importés de convergence.ts (source unique)
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
    icon: '🔥', label: 'Phase d\'Élan',
    color: '#FFD700', bg: '#FFD70012', border: '#FFD70035',
    advice: 'Une concentration rare de signaux positifs. C\'est le moment de passer à l\'action sur tes projets les plus ambitieux — le vent est dans ton dos.',
  },
  elan: {
    icon: '↗', label: 'Élan modéré',
    color: '#4ade80', bg: '#4ade8012', border: '#4ade8030',
    advice: 'Dynamique favorable — une belle fenêtre pour avancer sur ce qui compte. Profite de cette période porteuse.',
  },
  continuite: {
    icon: '→', label: 'Consolidation',
    color: '#71717a', bg: '#71717a10', border: '#71717a25',
    advice: 'Rythme de croisière — période idéale pour stabiliser tes acquis, structurer et poser des bases solides.',
  },
  repli: {
    icon: '↘', label: 'Préparation',
    color: '#a78bfa', bg: '#a78bfa0c', border: '#a78bfa25',
    advice: 'Les cycles t\'invitent à lever le pied. Excellente période pour planifier, te reposer ou clôturer des dossiers en cours.',
  },
  protection: {
    icon: '🛡', label: 'Retour à soi',
    color: '#3b82f6', bg: '#3b82f60c', border: '#3b82f625',
    advice: 'Phase de recharge. Protège tes acquis, économise ton énergie. Les phases calmes préparent les prochains élans.',
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

function phaseText(tier: MomentumTier): string {
  switch (tier) {
    case 'acceleration': return 'Fenêtre particulièrement porteuse';
    case 'elan': return 'Période favorable — le vent dans le dos';
    case 'continuite': return 'Rythme de croisière — bon pour structurer';
    case 'repli': return 'Période calme — idéale pour planifier';
    case 'protection': return 'Phase de recharge — chaque cycle a son rôle';
  }
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

export default function ForecastTab({ data, bd, bt }: { data: SoulData; bd: string; bt?: string }) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [hasInitSelected, setHasInitSelected] = useState(false);

  // Sprint AH — Web Worker pour calcul lourd (1080 calcDayPreview).
  // Fallback automatique sur main thread si Worker indisponible.
  // ═══ FIX COHÉRENCE — Même terrain que Calendrier/Pilotage ═══
  // ═══ V4.5 GAP=0 : on passe le score LIVE arrondi pour que le forecast connaisse le score réel d'aujourd'hui ═══
  const _liveScore = Math.max(0, Math.min(100, Math.round(data.conv.score + getCalibOffset())));
  // ═══ V4.5 : scores LIVE passés pour que les fenêtres d'action du mois en cours soient cohérentes ═══
  const _histScores = useMemo(() => getAllHistoricalScores(bd), [bd]);
  const { forecast, loading: forecastLoading, durationMs, workerUsed } = useForecastWorker(
    bd, data.num, data.cz, data.astro, 0,
    data.conv.ctxMult ?? 1.0, data.conv.dashaMult ?? 1.0, data.conv.shadowBaseSignal ?? 0, bt, _liveScore, _histScores,
  );

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

  // Enrichir les scores mensuels avec les vrais scores live (localStorage)
  // Pour les mois passés et le mois en cours : moyenne hybride (live pour jours passés, preview pour jours futurs)
  const enrichedForecast = useMemo(() => {
    if (!forecast.length) return forecast;
    const history = getAllHistoricalScores(bd);
    const histKeys = Object.keys(history);
    if (histKeys.length === 0) return forecast.map(f => ({ ...f, _liveCount: 0, _daysInMonth: new Date(f.year, f.month, 0).getDate() }));
    const todayStr = new Date().toISOString().slice(0, 10);
    return forecast.map(f => {
      const daysInMonth = new Date(f.year, f.month, 0).getDate();
      let liveSum = 0, liveCount = 0, previewEstimate = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        const ds = `${f.year}-${String(f.month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const hist = history[ds];
        if (hist !== undefined && ds <= todayStr) {
          liveSum += hist;
          liveCount++;
        }
      }
      if (liveCount === 0) return { ...f, _liveCount: 0, _daysInMonth: daysInMonth }; // mois futur : pas de données live
      if (liveCount >= daysInMonth) {
        // Mois entièrement passé : moyenne pure des scores live
        previewEstimate = Math.round(liveSum / liveCount);
      } else {
        // Mois en cours : hybride live (jours passés) + score forecast proportionnel (jours futurs)
        const futureDays = daysInMonth - liveCount;
        const forecastDailyAvg = f.stats?.avg ?? f.score;
        previewEstimate = Math.round((liveSum + forecastDailyAvg * futureDays) / daysInMonth);
      }
      return { ...f, score: previewEstimate, _liveCount: liveCount, _daysInMonth: daysInMonth };
    });
  }, [forecast]);

  const momentums = useMemo(() => {
    if (!enrichedForecast.length) return [];
    return calcMomentum(enrichedForecast.map(f => f.score));
  }, [enrichedForecast]);

  // Auto-sélectionner le mois en cours au 1er chargement
  const now = new Date();
  const curIdx = Math.max(0, forecast.length > 0 ? forecast.findIndex(
    f => f.year === now.getFullYear() && f.month === now.getMonth() + 1
  ) : 0);

  useEffect(() => {
    if (!hasInitSelected && forecast.length > 0) {
      setSelectedIdx(curIdx);
      setHasInitSelected(true);
    }
  }, [forecast, curIdx, hasInitSelected]);

  if (forecastLoading) {
    return (
      <Cd>
        <div style={{ textAlign: 'center', color: P.textDim, padding: 40 }}>
          Calcul de tes phases d'énergie…
        </div>
      </Cd>
    );
  }

  if (forecast.length === 0 || momentums.length === 0) {
    return (
      <Cd>
        <div style={{ textAlign: 'center', color: P.textDim, padding: 40 }}>
          Impossible de calculer les tendances. Vérifie ta date de naissance.
        </div>
      </Cd>
    );
  }

  const selected = enrichedForecast[selectedIdx];
  const selMom = momentums[selectedIdx];
  const curMom = momentums[curIdx];
  const years = [...new Set(forecast.map(f => f.year))];

  const nextElanIdx  = momentums.findIndex((m, i) => i > curIdx && (m.tier === 'acceleration' || m.tier === 'elan'));
  // Compteurs de phases pour la 3e carte
  const phaseCounts = {
    elan: momentums.filter(m => m.tier === 'acceleration' || m.tier === 'elan').length,
    consolidation: momentums.filter(m => m.tier === 'continuite').length,
    calme: momentums.filter(m => m.tier === 'repli' || m.tier === 'protection').length,
  };

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
          🔭 Tes phases d'énergie — 36 mois
        </div>
        <div style={{ fontSize: 11, color: P.textMid, marginTop: 4, lineHeight: 1.6 }}>
          Tes <b style={{ color: P.text }}>phases d'énergie sur 3 ans</b> — quand le vent souffle dans ton sens, quand il invite au repos.
          Chaque période a son rôle : certaines pour accélérer, d'autres pour structurer.
        </div>
      </div>

      {/* ═══ CARDS RÉSUMÉ ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>

        {/* Ce mois */}
        {(() => {
          const curLc = (enrichedForecast[curIdx] as any)?._liveCount ?? 0;
          const curDim = (enrichedForecast[curIdx] as any)?._daysInMonth ?? 30;
          const curUnconfirmed = curLc < 8;
          return (
            <div {...a11yClick(() => setSelectedIdx(curIdx))} aria-label="Voir le mois en cours" style={{ padding: '10px 8px', borderRadius: 10, textAlign: 'center', cursor: 'pointer', background: TIER_CONFIG[curMom.tier].bg, border: `1px solid ${TIER_CONFIG[curMom.tier].border}` }}>
              <div style={{ fontSize: 9, color: P.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                Ce mois{curUnconfirmed ? ' · en cours' : ''}
              </div>
              <div style={{ fontSize: 24 }}>{TIER_CONFIG[curMom.tier].icon}</div>
              <div style={{ fontSize: 11, color: TIER_CONFIG[curMom.tier].color, fontWeight: 700, marginTop: 2 }}>
                {curUnconfirmed && <span style={{ fontSize: 9, color: P.textDim, fontWeight: 400 }}>Tendance : </span>}
                {TIER_CONFIG[curMom.tier].label}
              </div>
              <div style={{ fontSize: 9, color: P.textDim, marginTop: 3, lineHeight: 1.4 }}>{curLc}/{curDim} jours réels</div>
            </div>
          );
        })()}

        {/* Prochain élan */}
        {nextElanIdx >= 0 ? (
          <div {...a11yClick(() => setSelectedIdx(nextElanIdx))} aria-label="Voir le prochain élan" style={{ padding: '10px 8px', borderRadius: 10, textAlign: 'center', background: '#4ade8010', border: '1px solid #4ade8025', cursor: 'pointer' }}>
            <div style={{ fontSize: 9, color: P.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
              Prochain élan
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#4ade80' }}>
              {MONTH_SHORT[enrichedForecast[nextElanIdx].month]} {enrichedForecast[nextElanIdx].year}
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
              {phaseCounts.elan}
            </div>
            <div style={{ fontSize: 10, color: P.textDim, marginTop: 2 }}>sur 36 mois</div>
          </div>
        )}

        {/* 3e carte : Répartition des phases sur 36 mois */}
        <div style={{ padding: '10px 8px', borderRadius: 10, textAlign: 'center', background: P.surface, border: `1px solid ${P.cardBdr}` }}>
          <div style={{ fontSize: 9, color: P.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Tes 36 mois</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
            <div style={{ fontSize: 10 }}><span style={{ color: '#FFD700', fontWeight: 700 }}>{phaseCounts.elan}</span> <span style={{ color: P.textDim }}>mois d'élan</span></div>
            <div style={{ fontSize: 10 }}><span style={{ color: '#71717a', fontWeight: 700 }}>{phaseCounts.consolidation}</span> <span style={{ color: P.textDim }}>consolidation</span></div>
            <div style={{ fontSize: 10 }}><span style={{ color: '#a78bfa', fontWeight: 700 }}>{phaseCounts.calme}</span> <span style={{ color: P.textDim }}>préparation</span></div>
          </div>
        </div>
      </div>

      {/* ═══ GRAPHIQUE DIVERGENT ═══ */}
      <div style={{ padding: '14px 10px', borderRadius: 12, background: P.surface, border: `1px solid ${P.cardBdr}`, marginBottom: 16 }}>

        {/* ═══ ZONE LABELS : Focale / Macro ═══ */}
        <div style={{ display: 'flex', marginBottom: 2 }}>
          <div style={{ flex: 12, textAlign: 'center', fontSize: 9, color: P.gold, fontWeight: 700, letterSpacing: 0.5 }}>
            Les 12 prochains mois
          </div>
          <div style={{ width: 1 }} />
          <div style={{ flex: 24, textAlign: 'center', fontSize: 9, color: '#a78bfa', fontWeight: 600, letterSpacing: 0.5 }}>
            Tendances longues
          </div>
        </div>

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
            const opacity = i >= 12 ? mutationOpacity(i) * 0.7 : mutationOpacity(i);
            const isMut = i >= MUTATION_START;
            const isMacro = i >= 12;
            return (
              <React.Fragment key={i}>
                {i === 12 && <div style={{ width: 2, background: `linear-gradient(to bottom, transparent, ${P.cardBdr}, transparent)`, margin: '0 1px', flexShrink: 0 }} />}
                <div {...a11yClick(() => setSelectedIdx(i))} aria-label={`Voir ${MONTH_SHORT[enrichedForecast[i]?.month] || ''} ${enrichedForecast[i]?.year || ''}`}
                  style={{ flex: 1, height: 54, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', cursor: 'pointer', alignItems: 'center' }}>
                  {isCur && !isSel && <div style={{ width: 3, height: 3, borderRadius: '50%', background: P.gold, marginBottom: 1 }} />}
                  {h > 0 && (
                    <div style={{
                      width: isSel ? '100%' : isMacro ? '68%' : '78%', height: isMacro ? h * 0.75 : h, borderRadius: '2px 2px 0 0',
                      background: isMut
                        ? `repeating-linear-gradient(45deg,${col}55,${col}55 2px,transparent 2px,transparent 5px)`
                        : isMacro
                        ? `repeating-linear-gradient(45deg,${col}44,${col}44 2px,transparent 2px,transparent 4px)`
                        : col + (isSel ? 'dd' : '88'),
                      border: isSel ? `1px solid ${col}` : 'none',
                      boxShadow: isSel ? `0 0 8px ${col}55` : 'none',
                      opacity, transition: 'all 0.15s',
                    }} />
                  )}
                </div>
              </React.Fragment>
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
            const opacity = i >= 12 ? mutationOpacity(i) * 0.7 : mutationOpacity(i);
            const isMut = i >= MUTATION_START;
            const isMacro = i >= 12;
            return (
              <React.Fragment key={i}>
                {i === 12 && <div style={{ width: 2, margin: '0 1px', flexShrink: 0 }} />}
                <div {...a11yClick(() => setSelectedIdx(i))} aria-label={`Détails ${MONTH_SHORT[enrichedForecast[i]?.month] || ''} ${enrichedForecast[i]?.year || ''}`}
                  style={{ flex: 1, height: 54, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', cursor: 'pointer', alignItems: 'center' }}>
                  {h > 0 && (
                    <div style={{
                      width: isSel ? '100%' : isMacro ? '68%' : '78%', height: isMacro ? h * 0.75 : h, borderRadius: '0 0 2px 2px',
                      background: isMut
                        ? `repeating-linear-gradient(45deg,${col}55,${col}55 2px,transparent 2px,transparent 5px)`
                        : isMacro
                        ? `repeating-linear-gradient(45deg,${col}44,${col}44 2px,transparent 2px,transparent 4px)`
                        : col + (isSel ? 'dd' : '88'),
                      border: isSel ? `1px solid ${col}` : 'none',
                      boxShadow: isSel ? `0 0 8px ${col}55` : 'none',
                      opacity, transition: 'all 0.15s',
                    }} />
                  )}
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Labels mois */}
        <div style={{ display: 'flex', gap: 1, marginTop: 4 }}>
          {forecast.map((f, i) => (
            <React.Fragment key={i}>
              {i === 12 && <div style={{ width: 2, margin: '0 1px', flexShrink: 0 }} />}
              <div style={{
                flex: 1, textAlign: 'center', fontSize: 7,
                color: i === selectedIdx ? P.text : i === curIdx ? P.gold : P.textDim,
                fontWeight: i === selectedIdx || i === curIdx ? 700 : 400,
              }}>
                {i % 6 === 0 || i === selectedIdx || i === curIdx ? MONTH_SHORT[f.month]?.slice(0, 1) : ''}
              </div>
            </React.Fragment>
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

        {/* Explication des 2 zones */}
        <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
          <div style={{ flex: 1, padding: '6px 8px', borderRadius: 6, background: `${P.gold}08`, border: `1px solid ${P.gold}20`, fontSize: 9, color: P.textDim, lineHeight: 1.5 }}>
            <b style={{ color: P.gold }}>Barres pleines</b> — Vision détaillée sur 12 mois. Précision élevée.
          </div>
          <div style={{ flex: 1, padding: '6px 8px', borderRadius: 6, background: '#4B008218', border: '1px solid #7B52AB30', fontSize: 9, color: P.textDim, lineHeight: 1.5 }}>
            <b style={{ color: '#a78bfa' }}>Barres hachurées</b> — Tendances longues basées sur tes cycles de fond. Direction générale, pas un agenda précis.
          </div>
        </div>
      </div>

      {/* ═══ NAVIGATION RAPIDE ═══ */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={() => setSelectedIdx(curIdx)} style={{ padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', background: selectedIdx === curIdx ? `${P.gold}18` : 'transparent', border: `1px solid ${P.gold}30`, color: P.gold, fontSize: 10, fontWeight: 600 }}>📍 Ce mois</button>
        {nextElanIdx >= 0 && (
          <button onClick={() => setSelectedIdx(nextElanIdx)} style={{ padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', background: 'transparent', border: '1px solid #4ade8030', color: '#4ade80', fontSize: 10, fontWeight: 600 }}>↗ Prochain élan</button>
        )}
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
          {(() => {
            const lc = (selected as any)._liveCount ?? 0;
            const dim = (selected as any)._daysInMonth ?? 30;
            const isCurrentMonth = selectedIdx === curIdx;
            const isUnconfirmed = isCurrentMonth && lc < 8;
            return (
              <>
                <div style={{ fontSize: 20, fontWeight: 800, color: TIER_CONFIG[selMom.tier].color, marginTop: 6, letterSpacing: 1 }}>
                  {isUnconfirmed && <span style={{ fontSize: 12, fontWeight: 600, color: P.textDim, marginRight: 6 }}>Tendance :</span>}
                  {TIER_CONFIG[selMom.tier].label}
                </div>
                <div style={{ marginTop: 10, padding: '5px 14px', borderRadius: 20, display: 'inline-block', background: TIER_CONFIG[selMom.tier].color + '18', border: `1px solid ${TIER_CONFIG[selMom.tier].color}35` }}>
                  <span style={{ fontSize: 11, color: TIER_CONFIG[selMom.tier].color, fontWeight: 600 }}>
                    {phaseText(selMom.tier)}
                  </span>
                </div>

                {/* ═══ MATURITÉ PROGRESSIVE — Ronde #23 ═══ */}
                {isCurrentMonth && lc < dim && (
                  <div style={{ marginTop: 12, maxWidth: 280, margin: '12px auto 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <div style={{ fontSize: 10, color: P.textDim, whiteSpace: 'nowrap' }}>
                        Données réelles : <b style={{ color: P.text }}>{lc}/{dim}</b> jours
                      </div>
                      <div style={{ flex: 1, height: 5, background: '#27272a', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.round((lc / dim) * 100)}%`, background: lc >= 20 ? '#4ade80' : lc >= 8 ? P.gold : '#f59e0b', borderRadius: 3, transition: 'width 0.3s' }} />
                      </div>
                    </div>
                    <div style={{ fontSize: 9, color: P.textDim, lineHeight: 1.4, textAlign: 'center' }}>
                      {lc < 8
                        ? 'Lecture prévisionnelle — se précise chaque jour.'
                        : lc < 20
                        ? 'Lecture hybride — mi-réel, mi-projection.'
                        : 'Lecture stabilisée — basée majoritairement sur du réel.'}
                    </div>
                  </div>
                )}

                {/* Mois futur : pas de données réelles */}
                {!isCurrentMonth && lc === 0 && selectedIdx < MUTATION_START && (
                  <div style={{ marginTop: 8, fontSize: 9, color: P.textDim, fontStyle: 'italic' }}>
                    Projection basée sur tes cycles — se confirmera le moment venu.
                  </div>
                )}

                {selMom.tier === 'acceleration' && (
                  <div style={{ marginTop: 8, fontSize: 10, color: P.textDim, lineHeight: 1.5, maxWidth: 280, margin: '8px auto 0' }}>
                    Le momentum mesure la qualité moyenne de tes jours, pas le nombre de jours exceptionnels. Un bon momentum = moins de creux, plus de régularité.
                  </div>
                )}
                {selectedIdx >= MUTATION_START && (
                  <div style={{ marginTop: 8, fontSize: 10, color: '#a78bfa', fontStyle: 'italic' }}>
                    🌀 Tendance à long terme — se précisera avec le temps
                  </div>
                )}
              </>
            );
          })()}
        </div>

        {/* Conseil */}
        <div style={{ padding: '12px 14px', borderRadius: 10, background: TIER_CONFIG[selMom.tier].bg, border: `1px solid ${TIER_CONFIG[selMom.tier].border}` }}>
          <div style={{ fontSize: 10, color: TIER_CONFIG[selMom.tier].color, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 6 }}>
            Que faire en {MONTH_FULL[selected.month]} ?
          </div>
          <div style={{ fontSize: 13, color: P.text, lineHeight: 1.7 }}>
            {selMom.tier === 'acceleration'
              ? (() => {
                  // ═══ RONDE #23 — Narratif cyclique (plus de classement "meilleur mois") ═══
                  const isIntrospective = selected.climateLabel === 'Intériorité' || selected.climateLabel === 'Structure';
                  return isIntrospective
                    ? 'Une concentration rare de signaux positifs. Même en cycle d\'intériorité, les conditions sont alignées — avance sur tes priorités profondes, mais respecte ton rythme.'
                    : 'Une concentration rare de signaux positifs. C\'est le moment de passer à l\'action sur tes projets les plus ambitieux — profite de cette fenêtre porteuse.';
                })()
              : TIER_CONFIG[selMom.tier].advice}
          </div>
          {selected.narrative && (
            <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.7, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${P.cardBdr}` }}>
              {selected.narrative}
            </div>
          )}
        </div>

        {/* Fiabilité */}
        {selCI && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: P.surface, border: `1px solid ${P.cardBdr}` }}>
            <div style={{ fontSize: 11, color: P.textDim, whiteSpace: 'nowrap' }}>Précision de la prévision :</div>
            <div style={{ flex: 1, height: 6, background: '#27272a', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${selCI.percent}%`, background: selCI.isZoneMutation ? '#7B52AB' : selCI.percent >= 70 ? '#4ade80' : selCI.percent >= 50 ? '#60a5fa' : '#f59e0b', borderRadius: 3 }} />
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: selCI.isZoneMutation ? '#a78bfa' : P.text, minWidth: 36, textAlign: 'right' }}>
              {selCI.percent}%
            </div>
          </div>
        )}
        {selCI && (
          <div style={{ fontSize: 9, color: P.textDim, lineHeight: 1.4, paddingLeft: 12, marginTop: -4, marginBottom: 4 }}>
            {selCI.percent >= 80
              ? 'Prévision très précise — basée sur des cycles longs et stables.'
              : selCI.percent >= 60
              ? 'Bonne précision — quelques variables peuvent encore évoluer.'
              : 'Précision modérée — plus on s\'éloigne dans le temps, moins le calcul est fiable.'}
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
                    {getDomainIcon(d)} {getDomainLabel(d)}{i === 0 && <span style={{ fontSize: 9, marginLeft: 4, opacity: 0.7 }}>★ principal</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ V4.5 : Jours Cosmiques OU top 3 jours d'action ═══ */}
        {selected.topDays && (() => {
          const cosmics = selected.topDays.filter(d => d.score >= COSMIC_THRESHOLD);
          if (cosmics.length > 0) return true;
          return selected.topDays.filter(d => d.dayType !== 'retrait' && d.score >= 75).length > 0;
        })() ? (
          <div style={{ padding: '10px 12px', borderRadius: 8, background: selected.topDays.some(d => d.score >= COSMIC_THRESHOLD) ? '#E0B0FF08' : '#4ade8008', border: `1px solid ${selected.topDays.some(d => d.score >= COSMIC_THRESHOLD) ? '#E0B0FF18' : '#4ade8018'}` }}>
            <div style={{ fontSize: 10, color: selected.topDays.some(d => d.score >= COSMIC_THRESHOLD) ? '#E0B0FF' : '#4ade80', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontWeight: 600 }}>
              {selected.topDays.some(d => d.score >= COSMIC_THRESHOLD) ? '✦ Convergence rare' : '🎯 Jours porteurs d\'action'}
            </div>
            <div style={{ display: 'grid', gap: 5 }}>
              {(() => {
                const cosmics = selected.topDays.filter(d => d.score >= COSMIC_THRESHOLD);
                return cosmics.length > 0 ? cosmics : selected.topDays.filter(d => d.dayType !== 'retrait' && d.score >= 75).slice(0, 3);
              })().map((day, i) => {
                const d = parseInt(day.date.split('-')[2]);
                const isCosmic = day.score >= COSMIC_THRESHOLD;
                const dtLabel = isCosmic
                  ? (day.dayType === 'decision' ? 'Décision majeure' : day.dayType === 'communication' ? 'Connexion forte' : day.dayType === 'expansion' ? 'Expansion puissante' : day.dayType === 'observation' ? 'Vision claire' : 'Introspection profonde')
                  : (day.dayType === 'decision' ? 'Décision' : day.dayType === 'communication' ? 'Communication' : day.dayType === 'expansion' ? 'Expansion' : day.dayType === 'observation' ? 'Observation' : 'Retrait');
                const dtIcon = day.dayType === 'decision' ? '🌟' : day.dayType === 'communication' ? '💬' : day.dayType === 'expansion' ? '🚀' : day.dayType === 'observation' ? '🔭' : '🧘';
                const sc = day.score;
                const c = isCosmic ? '#E0B0FF' : sc >= 80 ? '#4ade80' : sc >= 70 ? P.gold : P.textMid;
                return (
                  <div key={i} style={{ padding: '7px 10px', borderRadius: 7, background: isCosmic ? '#E0B0FF08' : P.surface, border: `1px solid ${isCosmic ? '#E0B0FF30' : P.cardBdr}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: 14 }}>{isCosmic ? '✦' : dtIcon}</span>
                      <span style={{ fontSize: 12, color: c, fontWeight: 700, marginLeft: 6 }}>
                        {d} {MONTH_FULL[selected.month]}
                      </span>
                      {isCosmic && <span style={{ fontSize: 9, color: '#E0B0FF', marginLeft: 6, fontWeight: 600 }}>✦ CONVERGENCE RARE</span>}
                      <div style={{ fontSize: 10, color: isCosmic ? '#E0B0FFaa' : P.textDim, marginTop: 1 }}>
                        Journée {dtLabel}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3px 10px', borderRadius: 6, background: c + '12', border: `1px solid ${c}30`, whiteSpace: 'nowrap' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: c }}>{sc}</div>
                      <div style={{ fontSize: 8, color: c, opacity: 0.6 }}>/100</div>
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
                ? 'Mois calme — conserve ton énergie, observe, prépare. Le rebond vient après.'
                : selMom.tier === 'repli'
                ? 'Bon moment pour réfléchir, planifier, et poser les bases des prochains mois porteurs.'
                : 'Avance régulièrement sur tes projets en cours.'}
            </div>
          </div>
        )}


      </div>
    </Cd>
  );
}
