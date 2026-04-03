import { useState, useMemo, useEffect, useCallback } from 'react';
import { type SoulData } from '../App';
import { calcMonthPreviews, estimateSlowTransitBonus, applySoftShiftBlend, assignAnnualLabels, COSMIC_THRESHOLD, DOMAIN_META, type DayPreview, type LifeDomain } from '../engines/convergence';
import ForecastTab from './ForecastTab';
import { calcTemporalLayers, calcCI } from '../engines/temporal-layers';
import { getNumberInfo } from '../engines/numerology';
import { getHexProfile } from '../engines/iching';
import { Sec, Cd, P } from './ui';
import FeedbackWidget from './FeedbackWidget';
import { getDayFeedback, saveDayFeedback, loadDeltas } from '../engines/validation-tracker'; // AD
import { getCalibOffset } from '../engines/calibration'; // GAP=0 — même calibOffset que Pilotage
import { getAllHistoricalScores } from '../engines/score-history'; // Scores LIVE historiques

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MOIS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const MOIS_SHORT = ['', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

// Inject twinkle animation (once)
if (typeof document !== 'undefined' && !document.getElementById('sp-twinkle')) {
  const style = document.createElement('style');
  style.id = 'sp-twinkle';
  style.textContent = `
    @keyframes sp-twinkle {
      0%, 100% { opacity: 1; transform: scale(1); filter: drop-shadow(0 0 2px #E0B0FF88); }
      50% { opacity: 0.4; transform: scale(0.7); filter: drop-shadow(0 0 6px #E0B0FFcc); }
    }
    @keyframes sp-glow {
      0%, 100% { box-shadow: 0 0 4px 2px #E0B0FF88; background: #E0B0FF; }
      50% { box-shadow: 0 0 10px 3px #E0B0FFcc, 0 0 4px #E0B0FF; background: #c880ff; }
    }
    .sp-star { animation: sp-twinkle 1.8s ease-in-out infinite; }
    .sp-glow { animation: sp-glow 2s ease-in-out infinite; position: relative; z-index: 2; overflow: visible; }
  `;
  document.head.appendChild(style);
}

const TYPE_LEGEND: { type: string; label: string; icon: string; color: string }[] = [
  { type: 'decision',      label: 'Décision',      icon: '🌟', color: '#FFD700' },
  { type: 'communication', label: 'Communication', icon: '🤝', color: '#4ade80' },
  { type: 'expansion',     label: 'Expansion',     icon: '🚀', color: '#FF69B4' },
  { type: 'observation',   label: 'Observation',   icon: '🔍', color: '#60a5fa' },
  { type: 'retrait',       label: 'Retrait',       icon: '🧘', color: '#9370DB' },
];

// Simple SVG Sparkline (zero deps)
function Sparkline({ data, height = 50 }: { data: number[]; height?: number }) {
  if (data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const w = 100, h = height;
  const pad = 4;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = pad + (1 - (v - min) / range) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const areaPoints = `0,${h} ${points} ${w},${h}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height, display: 'block' }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFD700" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#FFD700" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#sparkGrad)" />
      <polyline points={points} fill="none" stroke="#FFD700" strokeWidth="1.5" strokeLinejoin="round" />
      {data.map((v, i) => v === max ? (
        <circle key={i} cx={(i / (data.length - 1)) * w} cy={pad + (1 - (v - min) / range) * (h - pad * 2)} r="2.5" fill="#FFD700" />
      ) : null)}
    </svg>
  );
}

// GitHub-style heatmap color scale — seuils V8.1 (Cosmique ≥86, Or ≥80)
function heatColor(s: number): string {
  if (s >= COSMIC_THRESHOLD) return '#E0B0FF';  // Cosmique V8 (était 90)
  if (s >= 75) return '#FFD700';  // Gold
  if (s >= 65) return '#26a641';  // Bright green
  if (s >= 55) return '#0e5a32';  // Medium green
  if (s >= 45) return '#0e3429';  // Dark green
  if (s >= 35) return '#2a2a2e';  // Dark grey
  return '#4a1c1c';              // Dark red
}

export default function CalendarTab({ data, bd, bt, yearPreviews }: { data: SoulData; bd: string; bt?: string; yearPreviews: DayPreview[] | null }) {
  const { num, cz, astro } = data;
  const [calView, setCalView] = useState<'calendar' | 'horizon'>('calendar');
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [selected, setSelected] = useState<DayPreview | null>(null);
  const [pendingDay, setPendingDay] = useState<number | null>(null);
  const [domainFilter, setDomainFilter] = useState<string | null>(null);

  // ═══ FIX FÉVRIER — Forcer le mois courant au montage ═══
  // Garantit que le calendrier s'ouvre toujours sur le mois actuel,
  // même si un état React résiduel (HMR, Suspense) a conservé un ancien mois.
  useEffect(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    if (year !== currentYear || month !== currentMonth) {
      setYear(currentYear);
      setMonth(currentMonth);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── V4.3: Blind Check-in ──
  // Si hier n'a pas de feedback slider → overlay plein écran AVANT de voir les scores
  const [blindMode, setBlindMode] = useState<'ask' | 'result' | null>(null);
  const [blindRating, setBlindRating] = useState<number>(3);
  const [blindYesterday, setBlindYesterday] = useState<string>('');
  const [blindPredicted, setBlindPredicted] = useState<number>(0);
  const [blindLabel, setBlindLabel] = useState<string>('');

  const submitBlindRating = useCallback(() => {
    if (!blindYesterday) return;
    // Convertir slider 1-5 en rating legacy pour rétrocompat
    const legacyRating: 'good' | 'neutral' | 'bad' = blindRating >= 4 ? 'good' : blindRating <= 2 ? 'bad' : 'neutral';
    // AD — récupérer les deltas d'hier stockés au chargement de la veille
    const yDeltas = loadDeltas(blindYesterday);
    saveDayFeedback(
      blindYesterday, blindPredicted, blindLabel, legacyRating,
      undefined, undefined, blindRating,
      undefined, undefined,
      yDeltas?.luneDelta, yDeltas?.ephemDelta, yDeltas?.baziDelta, yDeltas?.scoreBrut
    );
    setBlindMode('result');
    // Auto-dismiss après 4 secondes
    setTimeout(() => setBlindMode(null), 4000);
  }, [blindYesterday, blindRating, blindPredicted, blindLabel]);

  const STAR_LABELS = ['', 'Difficile', 'Mitigé', 'Correct', 'Bon', 'Excellent'];

  // V4.0: Affinité type de jour × domaine. +1 = très favorable, 0 = neutre, -1 = défavorable
  const DAYTYPE_DOMAIN: Record<string, Record<string, number>> = {
    decision:      { BUSINESS: 1,  AMOUR: -0.5, RELATIONS: 0.3,  CREATIVITE: 0,   INTROSPECTION: -0.5, VITALITE: 0.8 },
    expansion:     { BUSINESS: 0.7, AMOUR: 0.2,  RELATIONS: 0.5,  CREATIVITE: 0.8, INTROSPECTION: -0.3, VITALITE: 0.6 },
    communication: { BUSINESS: 0.3, AMOUR: 0.7,  RELATIONS: 1,    CREATIVITE: 0.4, INTROSPECTION: 0,    VITALITE: 0.2 },
    observation:   { BUSINESS: -0.3, AMOUR: 0.3, RELATIONS: 0.2,  CREATIVITE: 0.6, INTROSPECTION: 0.9,  VITALITE: -0.2 },
    retrait:       { BUSINESS: -0.5, AMOUR: 0.5, RELATIONS: -0.3, CREATIVITE: 0.2, INTROSPECTION: 1,    VITALITE: -0.5 },
  };
  // Dérivé de DOMAIN_META (source unique convergence.ts)
  const DOMAIN_OPTS = (Object.keys(DOMAIN_META) as LifeDomain[]).map(id => ({
    id, ...DOMAIN_META[id],
  }));
  // Score domaine estimé pour un jour: score global pondéré par affinité dayType
  const getDomainScore = (p: DayPreview, domain: string): number => {
    const aff = DAYTYPE_DOMAIN[p.dayType.type]?.[domain] ?? 0;
    return Math.max(5, Math.min(97, Math.round(p.score + aff * 15)));
  };

  // Slow transit bonus (Neptune, Saturn, etc. — barely move month to month)
  const trBonus = useMemo(() => estimateSlowTransitBonus(astro ?? null), [astro]);

  const previews = useMemo(() => calcMonthPreviews(bd, num, cz, year, month, trBonus, astro ?? null, data.conv.ctxMult ?? 1.0, data.conv.dashaMult ?? 1.0, data.conv.shadowBaseSignal ?? 0, bt), [bd, num, cz, year, month, trBonus, astro, data.conv.ctxMult, data.conv.dashaMult, data.conv.shadowBaseSignal, bt]);

  const temporalCtx = useMemo(() => {
    try { return calcTemporalLayers({ luckPillars: data.luckPillars, num, currentScore: data.conv.score, birthDate: new Date(bd + 'T00:00:00') }); }
    catch { return null; }
  }, [data, bd, num]);

  // Auto-select: moved after annotatedPreviews (see below)

  const firstDow = (() => {
    const d = new Date(year, month - 1, 1).getDay();
    return d === 0 ? 6 : d - 1;
  })();

  // GAP=0 fix : date locale (pas UTC) — cohérent avec getTodayStr() du moteur
  const todayStr = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();

  // Year heatmap — all 365 days organized by week (GitHub-style)
  // NOTE: yearHeatmap MUST be defined before stats (stats depends on yearHeatmap.allPreviews)
  const currentYear = new Date().getFullYear();
  const yearHeatmap = useMemo(() => {
    // Phase 3a fix : yearPreviews (prop) = année courante uniquement.
    // Pour les autres années, recalculer localement (comme avant Phase 3a).
    let allPreviews: DayPreview[];
    if (year === currentYear && yearPreviews) {
      allPreviews = yearPreviews.map(p => ({ ...p }));
    } else {
      // Recalcul local pour année non-courante
      const _tb = estimateSlowTransitBonus(astro ?? null);
      const _allRaw: DayPreview[] = [];
      for (let m = 1; m <= 12; m++) {
        const mp = calcMonthPreviews(
          bd, num, cz, year, m, _tb,
          astro ?? null, data.conv.ctxMult ?? 1.0, data.conv.dashaMult ?? 1.0,
          data.conv.shadowBaseSignal ?? 0, bt,
        );
        _allRaw.push(...mp.map(p => ({ ...p })));
      }
      applySoftShiftBlend(_allRaw);
      allPreviews = _allRaw;
    }
    const days: { score: number; month: number; day: number; date: string; isAnnualPeak?: boolean; isCosmicCapped?: boolean }[] = [];
    let peakScore = 0, peakMonth = 1;

    // ═══ FIX GAP=0 yearHeatmap : forcer le score LIVE pour aujourd'hui ═══
    // applySoftShiftBlend a un guard pour today, mais calcDayPreview est une
    // approximation rapide. On écrase avec data.conv.score + calibOffset (= Pilotage exact).
    const _calibOff = getCalibOffset();
    const _liveScore = Math.max(0, Math.min(100, Math.round(data.conv.score + _calibOff)));
    const _todayP = allPreviews.find(p => p.date === todayStr);
    if (_todayP) {
      _todayP.score = _liveScore;
      _todayP.lCol = _liveScore >= COSMIC_THRESHOLD ? '#E0B0FF' : _liveScore >= 80 ? '#FFD700' : _liveScore >= 65 ? '#4ade80' : _liveScore >= 40 ? '#60a5fa' : _liveScore >= 25 ? '#9890aa' : '#ef4444';
    }

    // ═══ Scores historiques : écraser les jours passés avec le score LIVE enregistré ═══
    // Évite la divergence entre Pilotage (calcMainScore) et Calendrier (scoreFromGroups/L2-lite).
    const _history = getAllHistoricalScores(bd);
    const _scoreLCol = (s: number) => s >= COSMIC_THRESHOLD ? '#E0B0FF' : s >= 80 ? '#FFD700' : s >= 65 ? '#4ade80' : s >= 40 ? '#60a5fa' : s >= 25 ? '#9890aa' : '#ef4444';
    for (const p of allPreviews) {
      if (p.date >= todayStr) continue; // ne toucher que les jours passés
      const hist = _history[p.date];
      if (hist !== undefined) {
        p.score = hist;
        p.lCol = _scoreLCol(hist);
      }
    }

    // Post-traitement annuel : plancher 3 "Pic de l'année" + plafond Cosmiques
    assignAnnualLabels(allPreviews);

    // Construire le tableau days avec les labels annuels
    allPreviews.forEach(p => {
      const m = parseInt(p.date.split('-')[1]);
      days.push({
        score: p.score, month: m, day: p.day, date: p.date,
        isAnnualPeak: p.isAnnualPeak, isCosmicCapped: p.isCosmicCapped,
      });
      if (p.score > peakScore) { peakScore = p.score; peakMonth = m; }
    });

    // Comptages avec labels annuels
    const cosmiqueTotal = days.filter(d => d.score >= COSMIC_THRESHOLD && !d.isCosmicCapped).length;
    const goldTotal = days.filter(d => d.score >= 80 && d.score < COSMIC_THRESHOLD && !d.isAnnualPeak).length;
    const annualPeakTotal = days.filter(d => d.isAnnualPeak).length;




    // Week grid: columns = weeks, rows = Mon(0)..Sun(6)
    const jan1Dow = (() => { const d = new Date(year, 0, 1).getDay(); return d === 0 ? 6 : d - 1; })();
    const numWeeks = Math.ceil((jan1Dow + days.length) / 7);
    const grid: (typeof days[0] | null)[][] = Array.from({ length: numWeeks }, () => Array(7).fill(null));

    days.forEach((d, i) => {
      const slot = jan1Dow + i;
      grid[Math.floor(slot / 7)][slot % 7] = d;
    });

    // Month label positions
    const monthStarts: { label: string; weekIdx: number }[] = [];
    days.forEach((d, i) => {
      if (d.day === 1) {
        monthStarts.push({ label: MOIS_FR[d.month - 1].slice(0, 3), weekIdx: Math.floor((jan1Dow + i) / 7) });
      }
    });

    // Month boundary week indices (for visual separators)
    const monthBoundaryWeeks = new Set(monthStarts.filter((_, i) => i > 0).map(ms => ms.weekIdx));

    return { grid, goldTotal, cosmiqueTotal, annualPeakTotal, peakScore, peakMonth, monthStarts, monthBoundaryWeeks, numWeeks, allPreviews };
  }, [yearPreviews, year, data.conv.score, todayStr, bd, num, cz, astro, bt, data.conv.ctxMult, data.conv.dashaMult, data.conv.shadowBaseSignal]);

  // ── V4.3: Blind Check-in — Score prédit d'hier (APRÈS yearHeatmap pour cohérence soft-shift) ──
  useEffect(() => {
    if (!yearHeatmap) return;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,'0')}-${String(yesterday.getDate()).padStart(2,'0')}`;
    const existing = getDayFeedback(yStr);
    // Montrer le blind check-in si hier n'a PAS de feedback slider (userScore)
    if (!existing?.userScore) {
      setBlindYesterday(yStr);
      setBlindMode('ask');
      // ═══ FIX COHÉRENCE — Score prédit d'hier via yearHeatmap (même pipeline soft-shifted) ═══
      // yearHeatmap.allPreviews contient les scores soft-shifted + historiques = source de vérité.
      // Fallback sur calcMonthPreviews brut si hier n'est pas dans l'année courante.
      const yFromHeatmap = yearHeatmap.allPreviews.find(p => p.date === yStr);
      if (yFromHeatmap) {
        setBlindPredicted(yFromHeatmap.score);
        setBlindLabel(yFromHeatmap.dayType.type);
      } else {
        // Fallback : hier est dans l'année précédente (1er janvier)
        const yMonth = yesterday.getMonth() + 1;
        const yYear = yesterday.getFullYear();
        const yPreviews = calcMonthPreviews(bd, num, cz, yYear, yMonth, trBonus, astro ?? null, data.conv.ctxMult ?? 1.0, data.conv.dashaMult ?? 1.0, data.conv.shadowBaseSignal ?? 0, bt);
        const yDay = yPreviews.find(p => p.date === yStr);
        if (yDay) {
          setBlindPredicted(yDay.score);
          setBlindLabel(yDay.dayType.type);
        }
      }
    }
  }, [yearHeatmap]); // eslint-disable-line react-hooks/exhaustive-deps

  // Month stats — Gold & Cosmique Days (Ronde Cosmique : respecte labels annuels)
  const stats = useMemo(() => {
    // Utiliser les previews annotées par assignAnnualLabels (via yearHeatmap)
    const monthStr = String(month).padStart(2, '0');
    const annotated = yearHeatmap ? yearHeatmap.allPreviews.filter(p => p.date.slice(5, 7) === monthStr) : [];
    const src = annotated.length > 0 ? annotated : previews;

    const typeCounts: Record<string, number> = {};
    let bestDay: DayPreview | null = null;
    let bestScore = 0;
    const goldDays: DayPreview[] = [];
    const cosmiqueDays: DayPreview[] = [];
    const annualPeakDays: DayPreview[] = [];
    const topDays: DayPreview[] = [];
    const weakDays: DayPreview[] = [];

    src.forEach(p => {
      typeCounts[p.dayType.type] = (typeCounts[p.dayType.type] || 0) + 1;
      if (p.score > bestScore) { bestScore = p.score; bestDay = p; }
      // Ronde Cosmique : Cosmique = score ≥ 88 ET pas plafonné
      if (p.score >= COSMIC_THRESHOLD && !p.isCosmicCapped) cosmiqueDays.push(p);
      else if (p.isAnnualPeak) annualPeakDays.push(p);
      else if (p.score >= 80) goldDays.push(p);
      if (p.score >= 70) topDays.push(p);
      if (p.score <= 40) weakDays.push(p);
    });

    return { typeCounts, bestDay, goldDays, cosmiqueDays, annualPeakDays, topDays, weakDays };
  }, [previews, month, yearHeatmap]);

  // Annotated previews for monthly card view (with annual labels from yearHeatmap)
  const annotatedPreviews = useMemo(() => {
    const monthStr = String(month).padStart(2, '0');
    const ann = yearHeatmap ? yearHeatmap.allPreviews.filter(p => p.date.slice(5, 7) === monthStr) : [];
    const base = ann.length > 0 ? ann : previews;
    // ═══ FIX GAP=0 : aujourd'hui = score Pilotage exact (cv.score + calibOffset) ═══
    // GAP=0 fix : date locale (pas UTC) — cohérent avec getTodayStr() du moteur
    const calibOff = getCalibOffset();
    const liveScore = Math.max(0, Math.min(100, Math.round(data.conv.score + calibOff)));
    // Recalcul lCol cohérent avec scoreLevelColor (convergence.ts, non-exportée)
    const _lCol = liveScore >= COSMIC_THRESHOLD ? '#E0B0FF' : liveScore >= 80 ? '#FFD700' : liveScore >= 65 ? '#4ade80' : liveScore >= 40 ? '#60a5fa' : liveScore >= 25 ? '#9890aa' : '#ef4444';
    return base.map(p => p.date === todayStr ? { ...p, score: liveScore, lCol: _lCol } : p);
  }, [previews, month, yearHeatmap, data.conv.score]);

  // Auto-select day when navigated from heatmap click (uses annotatedPreviews = GAP=0 corrigé)
  useEffect(() => {
    if (pendingDay !== null) {
      const match = annotatedPreviews.find(p => p.day === pendingDay);
      if (match) setSelected(match);
      setPendingDay(null);
    }
  }, [annotatedPreviews, pendingDay]);

  // Auto-select today on first load — le détail du jour est visible immédiatement
  const _isCurrentMonth = year === new Date().getFullYear() && month === new Date().getMonth() + 1;
  const [hasAutoSelected, setHasAutoSelected] = useState(false);
  useEffect(() => {
    if (!hasAutoSelected && annotatedPreviews.length > 0 && _isCurrentMonth) {
      const todayP = annotatedPreviews.find(p => p.date === todayStr);
      if (todayP) { setSelected(todayP); setHasAutoSelected(true); }
    }
  }, [annotatedPreviews, hasAutoSelected, _isCurrentMonth]); // eslint-disable-line react-hooks/exhaustive-deps

  // Action windows (clusters of 2+ consecutive days ≥72)
  // V4.5 : utilise `annotatedPreviews` (post-blend + LIVE historique + labels annuels)
  // afin que les fenêtres d'action reflètent exactement les scores affichés dans les cellules.
  // Le seuil 72 (vs 75 dans Horizon) est volontairement plus bas car la vue mensuelle est plus
  // détaillée que la projection 36 mois — l'utilisateur veut voir toutes les bonnes fenêtres.
  const actionWindows = useMemo(() => {
    const windows: { start: number; end: number; avg: number }[] = [];
    let cur: number[] = [];
    let scores: number[] = [];
    annotatedPreviews.forEach(p => {
      if (p.score >= 72) { cur.push(p.day); scores.push(p.score); }
      else {
        if (cur.length >= 2) windows.push({ start: cur[0], end: cur[cur.length - 1], avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) });
        cur = []; scores = [];
      }
    });
    if (cur.length >= 2) windows.push({ start: cur[0], end: cur[cur.length - 1], avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) });
    return windows;
  }, [annotatedPreviews]);

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); setSelected(null); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); setSelected(null); };
  const goToday = () => { const d = new Date(); setYear(d.getFullYear()); setMonth(d.getMonth() + 1); setSelected(null); setPendingDay(d.getDate()); };
  const isCurrentMonth = year === new Date().getFullYear() && month === new Date().getMonth() + 1;

  const selProfile = selected ? getHexProfile(selected.hexNum) : null;

  return (
    <div>
      {/* ── V4.3: Blind Check-in Overlay ── */}
      {blindMode === 'ask' && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(10,10,18,0.95)', backdropFilter: 'blur(12px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: 24, animation: 'fadeIn 0.4s ease'
        }}>
          <div style={{ fontSize: 13, color: P.textDim, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>
            ✦ Check-in aveugle
          </div>
          <div style={{ fontSize: 22, color: P.text, fontWeight: 700, marginBottom: 6, textAlign: 'center' }}>
            Comment était ta journée d'hier ?
          </div>
          <div style={{ fontSize: 13, color: P.textDim, marginBottom: 28, textAlign: 'center' }}>
            {new Date(blindYesterday + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            <br /><span style={{ fontSize: 11, opacity: 0.6 }}>Note AVANT de voir le score — ça calibre le moteur</span>
          </div>

          {/* 5 étoiles */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            {[1, 2, 3, 4, 5].map(s => (
              <button key={s} onClick={() => setBlindRating(s)} style={{
                background: 'none', border: 'none', cursor: 'pointer', fontSize: 36,
                filter: s <= blindRating ? 'none' : 'grayscale(1) opacity(0.3)',
                transform: s <= blindRating ? 'scale(1.1)' : 'scale(0.9)',
                transition: 'all 0.2s ease'
              }}>⭐</button>
            ))}
          </div>
          <div style={{ fontSize: 14, color: P.gold, fontWeight: 600, marginBottom: 28, minHeight: 20 }}>
            {STAR_LABELS[blindRating]}
          </div>

          {/* Boutons */}
          <button onClick={submitBlindRating} style={{
            background: `linear-gradient(135deg, ${P.gold}, #f59e0b)`, color: '#000',
            border: 'none', borderRadius: 12, padding: '12px 40px', fontSize: 15,
            fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 16,
            boxShadow: `0 4px 20px ${P.gold}40`
          }}>
            Valider ma note
          </button>
          <button onClick={() => setBlindMode(null)} style={{
            background: 'none', border: 'none', color: P.textDim, cursor: 'pointer',
            fontSize: 12, fontFamily: 'inherit', opacity: 0.5
          }}>
            Passer (fausse la calibration)
          </button>
        </div>
      )}

      {/* ── V4.3: Blind Result — comparaison score ── */}
      {blindMode === 'result' && blindPredicted > 0 && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(10,10,18,0.95)', backdropFilter: 'blur(12px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: 24, animation: 'fadeIn 0.4s ease'
        }}>
          <div style={{ fontSize: 13, color: P.textDim, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 }}>
            ✦ Comparaison
          </div>
          <div style={{ display: 'flex', gap: 32, alignItems: 'center', marginBottom: 20 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: P.textDim, marginBottom: 4 }}>Ton vécu</div>
              <div style={{ fontSize: 36 }}>{'⭐'.repeat(blindRating)}</div>
              <div style={{ fontSize: 13, color: P.gold, fontWeight: 600 }}>{STAR_LABELS[blindRating]}</div>
            </div>
            <div style={{ fontSize: 20, color: P.textDim }}>vs</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: P.textDim, marginBottom: 4 }}>Score prédit</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: blindPredicted >= 65 ? '#4ade80' : blindPredicted >= 40 ? '#60a5fa' : '#ef4444' }}>
                {blindPredicted}%
              </div>
              <div style={{ fontSize: 13, color: P.textDim }}>{blindLabel}</div>
            </div>
          </div>
          {(() => {
            // Concordance check: slider 1-5 mapped to score brackets
            const expectedBracket = blindRating >= 4 ? 'high' : blindRating <= 2 ? 'low' : 'mid';
            const actualBracket = blindPredicted >= 65 ? 'high' : blindPredicted < 40 ? 'low' : 'mid';
            const match = expectedBracket === actualBracket;
            return (
              <div style={{
                fontSize: 14, fontWeight: 600, padding: '8px 20px', borderRadius: 8,
                background: match ? '#4ade8015' : '#f59e0b15',
                color: match ? '#4ade80' : '#f59e0b',
                border: `1px solid ${match ? '#4ade8030' : '#f59e0b30'}`
              }}>
                {match ? '✓ Concordant — le moteur capte ton énergie' : '≠ Décalage — chaque feedback affine la précision'}
              </div>
            );
          })()}
          <button onClick={() => setBlindMode(null)} style={{
            background: 'none', border: 'none', color: P.textDim, cursor: 'pointer',
            fontSize: 12, fontFamily: 'inherit', marginTop: 20, opacity: 0.6
          }}>
            Voir le calendrier →
          </button>
        </div>
      )}

      <Sec icon="📅" title="Calendrier Stratégique">

        {/* ══ Toggle Calendrier / Horizon ══ */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {([
            { id: 'calendar', icon: '📅', label: 'Calendrier' },
            { id: 'horizon',  icon: '🔭', label: 'Horizon & Phases' },
          ] as const).map(v => (
            <button key={v.id} onClick={() => setCalView(v.id)} style={{
              flex: 1, padding: '9px 0', borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit',
              background: calView === v.id ? '#E0B0FF12' : P.surface,
              border: `1.5px solid ${calView === v.id ? '#E0B0FF40' : P.cardBdr}`,
              color: calView === v.id ? '#E0B0FF' : P.textDim,
              fontSize: 13, fontWeight: calView === v.id ? 700 : 400,
            }}>{v.icon} {v.label}</button>
          ))}
        </div>

        {/* ══════════════════════════════════════
            VUE HORIZON 36 MOIS
        ══════════════════════════════════════ */}
        {calView === 'horizon' && <ForecastTab data={data} bd={bd} bt={bt} />}

        {/* ══════════════════════════════════════
            VUE CALENDRIER (originale)
        ══════════════════════════════════════ */}


        {/* ══════════════════════════════════════
            VUE CALENDRIER (originale)
        ══════════════════════════════════════ */}
        {calView === 'calendar' && (!yearHeatmap ? (
          <Cd><div style={{ textAlign: 'center', color: P.textDim, padding: 28, fontSize: 14 }}>Chargement heatmap…</div></Cd>
        ) : (<>
        <Cd>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: P.gold, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>
              ✦ Heatmap {year}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button onClick={() => { setYear(y => y - 1); setSelected(null); }} aria-label="Année précédente" style={{ background: 'none', border: 'none', color: P.textDim, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', padding: '2px 6px' }}>◀</button>
              <span style={{ fontSize: 13, color: P.text, fontWeight: 700 }}>{year}</span>
              <button onClick={() => { setYear(y => y + 1); setSelected(null); }} aria-label="Année suivante" style={{ background: 'none', border: 'none', color: P.textDim, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', padding: '2px 6px' }}>▶</button>
            </div>
          </div>

          {/* Gold + Cosmique + Pic summary — Ronde Cosmique */}
          <div style={{ fontSize: 11, color: P.textDim, marginBottom: 6 }}>
            {yearHeatmap.cosmiqueTotal > 0 && <><span style={{ color: '#E0B0FF', fontWeight: 700 }}>{yearHeatmap.cosmiqueTotal}</span> <span title="Convergence rare : tous les systèmes s'alignent simultanément (score ≥86)">Convergence rare ✦</span> · </>}
            {yearHeatmap.annualPeakTotal > 0 && <><span style={{ color: '#00CED1', fontWeight: 700 }}>{yearHeatmap.annualPeakTotal}</span> Fenêtre clé · </>}
            <span style={{ color: P.gold, fontWeight: 700 }}>{yearHeatmap.goldTotal}</span> Alignement fort · Score max <span style={{ color: yearHeatmap.peakScore >= COSMIC_THRESHOLD ? '#E0B0FF' : P.gold, fontWeight: 700 }}>{yearHeatmap.peakScore}%</span> en {MOIS_FR[yearHeatmap.peakMonth - 1]}
          </div>

          {/* Month labels */}
          <div style={{ position: 'relative', height: 16, marginLeft: 24, marginBottom: 2 }}>
            {yearHeatmap.monthStarts.map((ms, i) => (
              <span key={i} style={{
                position: 'absolute',
                left: ms.weekIdx * 10,
                fontSize: 9, color: P.textDim, fontWeight: 600
              }}>{ms.label}</span>
            ))}
          </div>

          {/* Heatmap grid */}
          <div style={{ display: 'flex', gap: 0 }}>
            {/* Day-of-week labels */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginRight: 4, paddingTop: 8 }}>
              {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                <div key={i} style={{ height: 9, fontSize: 7, color: P.textDim, lineHeight: '9px', textAlign: 'right', width: 14 }}>{d}</div>
              ))}
            </div>

            {/* Grid cells */}
            <div style={{ padding: '4px 4px', overflow: 'visible' }}>
            <div style={{
              display: 'grid',
              gridTemplateRows: 'repeat(7, 9px)',
              gridAutoFlow: 'column',
              gridAutoColumns: '9px',
              gap: 1,
              padding: '8px 6px 10px 6px',
            }}>
              {yearHeatmap.grid.flatMap((week, wIdx) =>
                week.map((cell, dow) => {
                  const isMonthBoundary = yearHeatmap.monthBoundaryWeeks.has(wIdx);
                  // Ronde Cosmique : Cosmique = score ≥86 ET non-capped
                  const isCosm = cell && cell.score >= COSMIC_THRESHOLD && !cell.isCosmicCapped;
                  const isPeak = cell?.isAnnualPeak ?? false;
                  const isGold = cell && cell.score >= 80 && !isCosm && !isPeak;
                  return (
                  <div key={`${wIdx}-${dow}`}
                    className={isCosm ? 'sp-glow' : undefined}
                    onClick={() => {
                      if (cell) {
                        setMonth(cell.month);
                        setPendingDay(cell.day);
                        setSelected(null);
                      }
                    }}
                    style={{
                      width: 9, height: 9,
                      borderRadius: 2,
                      boxSizing: 'border-box' as const,
                      background: isCosm ? undefined : cell ? heatColor(cell.score) : '#1a1a1e',
                      cursor: cell ? 'pointer' : 'default',
                      boxShadow: isCosm ? undefined : isPeak ? '0 0 4px #00CED166' : isGold ? '0 0 4px #FFD70066' : 'none',
                      outline: isCosm ? '1px solid #E0B0FFaa' : isPeak ? '1px solid #00CED1aa' : 'none',
                      borderLeft: isMonthBoundary ? '2px solid rgba(255,255,255,0.15)' : 'none',
                    }}
                    title={cell ? `${cell.day} ${MOIS_FR[cell.month - 1]} — ${cell.score}%${isPeak ? ' ★ Fenêtre clé' : ''}${cell.isCosmicCapped ? ' (plafonné)' : ''}` : ''}
                  />
                  );
                })
              )}
            </div>
            </div>
          </div>

          {/* Color legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 8, justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 9, color: P.textDim }}>Faible</span>
            {[20, 38, 48, 58, 68, 78].map(s => (
              <div key={s} style={{ width: 10, height: 10, borderRadius: 2, background: heatColor(s) }} />
            ))}
            <span style={{ fontSize: 9, color: P.gold, fontWeight: 700 }}>Alignement fort</span>
            <span className="sp-star" style={{ fontSize: 10, color: '#E0B0FF' }}>✦</span>
            <span style={{ fontSize: 9, color: '#E0B0FF', fontWeight: 700 }}>Convergence rare</span>
          </div>
        </Cd>

        {/* Month Nav + Sparkline */}
        <Cd sx={{ marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <button onClick={prevMonth} aria-label="Mois précédent" style={{ background: P.surface, border: `1px solid ${P.cardBdr}`, borderRadius: 8, padding: '8px 14px', cursor: 'pointer', color: P.text, fontSize: 16, fontFamily: 'inherit' }}>◀</button>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: P.text, letterSpacing: 1 }}>{MOIS_FR[month - 1]} {year}</div>
              <div style={{ fontSize: 11, color: P.textDim, marginTop: 3 }}>
                {stats.cosmiqueDays.length > 0 && <><span style={{ color: '#E0B0FF', fontWeight: 700 }}>{stats.cosmiqueDays.length}</span> <span title="Convergence rare : tous les systèmes s'alignent (score ≥86)">Convergence rare ✦</span> · </>}
                {stats.annualPeakDays.length > 0 && <><span style={{ color: '#00CED1', fontWeight: 700 }}>{stats.annualPeakDays.length}</span> Fenêtre clé · </>}
                <span style={{ color: P.gold, fontWeight: 700 }}>{stats.goldDays.length}</span> Alignement fort
                {stats.bestDay && <> · Jour fort : <span style={{ color: P.gold, fontWeight: 700 }}>le {(stats.bestDay as DayPreview).day}</span> (<span style={{ color: P.gold }}>{(stats.bestDay as DayPreview).score}%</span>)</>}
              </div>
            </div>
            <button onClick={nextMonth} aria-label="Mois suivant" style={{ background: P.surface, border: `1px solid ${P.cardBdr}`, borderRadius: 8, padding: '8px 14px', cursor: 'pointer', color: P.text, fontSize: 16, fontFamily: 'inherit' }}>▶</button>
          </div>

          {/* Bouton Aujourd'hui — visible quand on n'est pas sur le mois courant */}
          {!isCurrentMonth && (
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <button onClick={goToday} aria-label="Retourner au mois actuel" style={{ background: `${P.gold}15`, border: `1px solid ${P.gold}30`, borderRadius: 20, padding: '5px 16px', cursor: 'pointer', color: P.gold, fontSize: 11, fontWeight: 600, fontFamily: 'inherit', letterSpacing: 0.5 }}>
                ● Aujourd'hui
              </button>
            </div>
          )}

          {/* Sparkline */}
          <div style={{ margin: '4px 0 12px', padding: '0 4px' }}>
            <Sparkline data={previews.map(p => p.score)} height={45} />
          </div>

          {/* Action Windows */}
          {actionWindows.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14, padding: '0 4px' }}>
              {actionWindows.map((w, i) => (
                <div key={i} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, background: `${P.gold}12`, border: `1px solid ${P.gold}25`, color: P.gold, fontWeight: 600 }}>
                  🎯 {w.start}–{w.end} {MOIS_FR[month - 1].slice(0, 3)} · {w.avg}%
                </div>
              ))}
              <div style={{ fontSize: 9, color: P.textDim, alignSelf: 'center' }}>Fenêtres d'action</div>
            </div>
          )}

          {/* Day headers */}
          {/* V4.0: Filtre par domaine */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 10, overflowX: 'auto', paddingBottom: 2 }}>
            <button onClick={() => setDomainFilter(null)} aria-label="Afficher tous les domaines" style={{
              padding: '5px 8px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', fontSize: 10, whiteSpace: 'nowrap',
              background: !domainFilter ? '#ffffff12' : 'transparent', border: `1px solid ${!domainFilter ? '#ffffff20' : P.cardBdr}`,
              color: !domainFilter ? P.text : P.textDim, fontWeight: !domainFilter ? 700 : 400,
            }}>🌐 Global</button>
            {DOMAIN_OPTS.map(d => (
              <button key={d.id} onClick={() => setDomainFilter(domainFilter === d.id ? null : d.id)} aria-label={`Filtrer par domaine: ${d.label}`} style={{
                padding: '5px 8px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', fontSize: 10, whiteSpace: 'nowrap',
                background: domainFilter === d.id ? `${d.color}15` : 'transparent',
                border: `1px solid ${domainFilter === d.id ? d.color + '40' : P.cardBdr}`,
                color: domainFilter === d.id ? d.color : P.textDim, fontWeight: domainFilter === d.id ? 700 : 400,
              }}>{d.icon}</button>
            ))}
          </div>
          {domainFilter && (() => {
            const dInfo = DOMAIN_OPTS.find(d => d.id === domainFilter)!;
            const ranked = [...previews].sort((a, b) => getDomainScore(b, domainFilter) - getDomainScore(a, domainFilter));
            const top3 = ranked.slice(0, 3);
            return (
              <div style={{ fontSize: 11, color: dInfo.color, marginBottom: 8, padding: '5px 8px', background: `${dInfo.color}08`, borderRadius: 6, border: `1px solid ${dInfo.color}15` }}>
                {dInfo.icon} Jours porteurs {dInfo.label} : <strong>{top3.map(p => p.day).join(', ')}</strong> {MOIS_FR[month - 1].slice(0, 3)}
              </div>
            );
          })()}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 4 }}>
            {JOURS.map(j => (
              <div key={j} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: P.textDim, textTransform: 'uppercase', letterSpacing: 1, padding: '4px 0' }}>{j}</div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
            {Array.from({ length: firstDow }, (_, i) => (
              <div key={`e${i}`} style={{ aspectRatio: '1', borderRadius: 6 }} />
            ))}
            {/* ═══ FIX GAP=0 FINAL — score LIVE forcé dans le rendu (belt-and-suspenders) ═══ */}
            {(() => {
              const _calibOff2 = getCalibOffset();
              const _liveToday = Math.max(0, Math.min(100, Math.round(data.conv.score + _calibOff2)));
              return annotatedPreviews.map(p => {
              const isToday = p.date === todayStr;
              // Belt-and-suspenders : forcer le score LIVE pour today, même si annotatedPreviews n'a pas appliqué l'override
              const _score = isToday ? _liveToday : p.score;
              const _lCol = isToday ? (_liveToday >= COSMIC_THRESHOLD ? '#E0B0FF' : _liveToday >= 80 ? '#FFD700' : _liveToday >= 65 ? '#4ade80' : _liveToday >= 40 ? '#60a5fa' : _liveToday >= 25 ? '#9890aa' : '#ef4444') : p.lCol;
              const isSel = selected?.date === p.date;
              const isCosmique = _score >= COSMIC_THRESHOLD && !p.isCosmicCapped;
              const isPeak = !!p.isAnnualPeak;
              const isGold = _score >= 80 && !isCosmique && !isPeak;
              const tierCol = isCosmique ? '#E0B0FF' : isPeak ? '#00CED1' : P.gold;
              const dtColor = p.dayType.color;
              // V4.0: Domain filter
              const domScore = domainFilter ? getDomainScore(p, domainFilter) : null;
              const domColor = domainFilter ? (DOMAIN_OPTS.find(d => d.id === domainFilter)?.color || P.textDim) : '';
              const isDomTop = domScore !== null && domScore >= 80;
              return (
                <button key={p.day}
                  onClick={() => setSelected(isSel ? null : p)}
                  style={{
                    aspectRatio: '1',
                    background: domainFilter && isDomTop ? `${domColor}18` : isCosmique ? '#E0B0FF18' : isPeak ? '#00CED118' : isGold ? `${P.gold}18` : isSel ? `${dtColor}25` : `${dtColor}18`,
                    border: domainFilter && isDomTop ? `2px solid ${domColor}60` : (isGold || isPeak) ? `2px solid ${tierCol}` : isToday ? `2px solid ${P.gold}88` : isSel ? `2px solid ${dtColor}` : `1px solid ${dtColor}18`,
                    borderRadius: 8, cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    padding: 2, position: 'relative', transition: 'all 0.15s ease',
                    boxShadow: isCosmique && !domainFilter ? `0 0 14px #E0B0FF50, inset 0 0 10px #E0B0FF20` : isPeak && !domainFilter ? `0 0 10px #00CED140, inset 0 0 6px #00CED115` : isGold && !domainFilter ? `0 0 12px ${P.gold}40, inset 0 0 8px ${P.gold}15` : isDomTop ? `0 0 10px ${domColor}40` : 'none'
                  }}>
                  {!domainFilter && isGold && !isCosmique && !isPeak && <div style={{ position: 'absolute', top: 1, left: 2, fontSize: 7, color: P.gold }}>✦</div>}
                  {!domainFilter && isCosmique && <div className="sp-star" style={{ position: 'absolute', top: 0, left: 1, fontSize: 9, color: '#E0B0FF', lineHeight: 1 }}>✦</div>}
                  {!domainFilter && isPeak && <div style={{ position: 'absolute', top: 0, left: 1, fontSize: 8, color: '#00CED1', lineHeight: 1 }}>★</div>}
                  <div style={{ fontSize: 14, fontWeight: 700, color: isDomTop ? domColor : isGold && !domainFilter ? tierCol : isToday ? P.gold : P.text, lineHeight: 1 }}>{p.day}</div>
                  <div style={{ fontSize: 9, fontWeight: 600, color: domainFilter ? domColor : _lCol, marginTop: 1, opacity: domainFilter ? (isDomTop ? 1 : 0.5) : 1 }}>{domScore ?? _score}</div>
                  {isToday
                    ? <div style={{ fontSize: 7, fontWeight: 800, color: P.gold, marginTop: 1, letterSpacing: 0.5, textTransform: 'uppercase', lineHeight: 1 }}>Auj.</div>
                    : <div style={{ width: 8, height: 8, borderRadius: '50%', background: dtColor, marginTop: 1, boxShadow: `0 0 4px ${dtColor}55` }} />
                  }
                  {isToday && <div style={{ position: 'absolute', top: 2, right: 3, fontSize: 7, color: P.gold, fontWeight: 700 }}>●</div>}
                  {/* V4.3b: Outlier flag */}
                  {!domainFilter && p.outlier?.isOutlier && (
                    <div style={{ position: 'absolute', bottom: 1, right: 2, fontSize: 7, color: p.outlier.direction === 'high' ? '#E0B0FF' : '#ef4444', lineHeight: 1 }}>
                      {p.outlier.direction === 'high' ? '▲' : '▼'}
                    </div>
                  )}
                  {/* V4.3b: Turbulence warning */}
                  {!domainFilter && p.turbulence && (p.turbulence.level === 'agité' || p.turbulence.level === 'extrême') && (
                    <div style={{ position: 'absolute', bottom: 1, left: 2, fontSize: 6, color: p.turbulence.level === 'extrême' ? '#ef4444' : '#f59e0b', lineHeight: 1 }}>〰</div>
                  )}
                </button>
              );
            });
            })()}
          </div>

          {/* Légende types — compacte, inline sous la grille */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10, paddingTop: 8, borderTop: `1px solid ${P.cardBdr}` }}>
            {TYPE_LEGEND.map(t => (
              <div key={t.type} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                <span style={{ fontSize: 10, color: P.textDim }}>{t.icon} {t.label}</span>
              </div>
            ))}
          </div>
        </Cd>

        {/* Selected Day Detail */}
        {selected && (
          <Cd sx={{ marginTop: 12 }}>
            {/* Gold / Cosmique / Fenêtre clé Day Banner */}
            {selected.score >= 80 && (() => {
              const isCosm = selected.score >= COSMIC_THRESHOLD && !selected.isCosmicCapped;
              const isPeak = !!selected.isAnnualPeak;
              const col = isCosm ? '#E0B0FF' : isPeak ? '#00CED1' : P.gold;
              return (
                <div style={{
                  padding: '10px 14px', marginBottom: 14, textAlign: 'center',
                  background: isCosm
                    ? 'linear-gradient(135deg, #E0B0FF15, #9333ea20, #E0B0FF15)'
                    : isPeak
                    ? 'linear-gradient(135deg, #00CED115, #00808020, #00CED115)'
                    : 'linear-gradient(135deg, #FFD70015, #C9A84C20, #FFD70015)',
                  border: `1.5px solid ${col}40`, borderRadius: 10, boxShadow: `0 0 20px ${col}20`
                }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: col, letterSpacing: 2 }}>
                    {isCosm
                      ? <><span className="sp-star" style={{ fontSize: 16 }}>✦</span> CONVERGENCE RARE</>
                      : isPeak
                      ? '★ FENÊTRE CLÉ'
                      : '🌟 ALIGNEMENT FORT'}
                  </div>
                  <div style={{ fontSize: 11, color: col, opacity: 0.8, marginTop: 4 }}>
                    {isCosm ? 'Tous tes systèmes convergent simultanément — c\'est extrêmement rare'
                      : isPeak ? 'Potentiel élevé — un moment à saisir pleinement'
                      : 'Alignement rare — toutes les conditions sont réunies'}
                  </div>
                </div>
              );
            })()}

            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14,
              padding: '10px 14px', background: `${selected.dayType.color}12`,
              borderRadius: 10, border: `1.5px solid ${selected.dayType.color}30`
            }}>
              <span style={{ fontSize: 28 }}>{selected.dayType.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: selected.dayType.color }}>
                  {selected.day} {MOIS_FR[month - 1]} — Journée {(selected.score >= COSMIC_THRESHOLD && !selected.isCosmicCapped)
                    ? (selected.dayType.type === 'decision' ? 'Décision majeure' : selected.dayType.type === 'communication' ? 'Connexion forte' : selected.dayType.type === 'expansion' ? 'Expansion puissante' : selected.dayType.type === 'observation' ? 'Vision claire' : 'Introspection profonde')
                    : selected.dayType.label}
                </div>
                <div style={{ fontSize: 12, color: P.textMid, marginTop: 2 }}>{(selected.score >= COSMIC_THRESHOLD && !selected.isCosmicCapped)
                  ? (selected.dayType.type === 'decision' ? 'Journée idéale pour trancher et s\'engager' : selected.dayType.type === 'communication' ? 'Tes échanges portent loin aujourd\'hui' : selected.dayType.type === 'expansion' ? 'Le terrain est grand ouvert — avance' : selected.dayType.type === 'observation' ? 'Lucidité exceptionnelle — tranche avec précision' : 'Connexion intérieure puissante — profites-en')
                  : selected.dayType.desc}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: selected.lCol, ...(selected.score >= 75 ? { textShadow: `0 0 12px ${P.gold}66` } : {}) }}>{selected.score}</div>
                <div style={{ fontSize: 9, color: selected.lCol + 'aa' }}>%</div>
              </div>
            </div>

            {/* V4.3b: Turbulence + Outlier badges */}
            {(selected.turbulence || selected.outlier?.isOutlier) && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                {selected.turbulence && selected.turbulence.level !== 'calme' && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20,
                    background: selected.turbulence.level === 'extrême' ? '#ef44440c' : selected.turbulence.level === 'agité' ? '#f59e0b0c' : `${P.gold}08`,
                    border: `1px solid ${selected.turbulence.level === 'extrême' ? '#ef444430' : selected.turbulence.level === 'agité' ? '#f59e0b30' : P.gold + '20'}`,
                  }}>
                    <span style={{ fontSize: 11 }}>〰️</span>
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      color: selected.turbulence.level === 'extrême' ? '#ef4444' : selected.turbulence.level === 'agité' ? '#f59e0b' : P.textMid,
                    }}>
                      {selected.turbulence.label}
                    </span>
                    <span style={{ fontSize: 10, color: P.textDim }}>écart ~{selected.turbulence.sigma} pts entre les jours</span>
                  </div>
                )}
                {selected.outlier?.isOutlier && (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20,
                    background: selected.outlier.direction === 'high' ? '#E0B0FF0c' : '#ef44440c',
                    border: `1px solid ${selected.outlier.direction === 'high' ? '#E0B0FF30' : '#ef444430'}`,
                  }}>
                    <span style={{ fontSize: 11 }}>{selected.outlier.direction === 'high' ? '▲' : '▼'}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      color: selected.outlier.direction === 'high' ? '#E0B0FF' : '#ef4444',
                    }}>
                      {selected.outlier.direction === 'high' ? 'Pic exceptionnel' : 'Creux inhabituel'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Conseil */}
            <div style={{ padding: '12px 14px', marginBottom: 14, background: `${P.gold}08`, borderRadius: 10, border: `1px solid ${P.gold}20` }}>
              <div style={{ fontSize: 10, color: P.gold, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 6 }}>✦ Conseil du jour</div>
              <div style={{ fontSize: 13, color: P.textMid, lineHeight: 1.7 }}>{selected.conseil}</div>
            </div>

            {/* Yi King Narration */}
            {selProfile && (
              <div style={{ padding: 14, marginBottom: 14, background: '#1a1a2e', borderRadius: 10, border: `1px solid ${P.gold}18` }}>
                <div style={{ fontSize: 10, color: P.gold, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 10 }}>
                  ☰ Yi King #{selected.hexNum} — {selected.hexName}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ padding: '3px 10px', borderRadius: 4, background: `${P.gold}15`, fontSize: 12, fontWeight: 700, color: P.gold }}>{selProfile.archetype}</div>
                </div>
                <div style={{ fontSize: 13, color: P.textMid, lineHeight: 1.7, marginBottom: 8 }}>{selProfile.judgment}</div>
                <div style={{ fontSize: 12, color: P.textDim, fontStyle: 'italic', lineHeight: 1.6, marginBottom: 10 }}>« {selProfile.image} »</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                  <div style={{ padding: '8px 10px', borderRadius: 6, background: '#4ade800a', borderLeft: '2px solid #4ade8044' }}>
                    <div style={{ fontSize: 9, color: '#4ade80', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Opportunité</div>
                    <div style={{ fontSize: 11, color: P.textMid, marginTop: 3 }}>{selProfile.opportunity}</div>
                  </div>
                  <div style={{ padding: '8px 10px', borderRadius: 6, background: '#ef44440a', borderLeft: '2px solid #ef444444' }}>
                    <div style={{ fontSize: 9, color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Risque</div>
                    <div style={{ fontSize: 11, color: P.textMid, marginTop: 3 }}>{selProfile.risk}</div>
                  </div>
                </div>
                <div style={{ padding: '10px 12px', borderRadius: 8, background: `${P.gold}0c`, border: `1px solid ${P.gold}20` }}>
                  <div style={{ fontSize: 9, color: P.gold, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Action stratégique</div>
                  <div style={{ fontSize: 13, color: P.gold, fontWeight: 600, marginTop: 4, lineHeight: 1.5 }}>{selProfile.action}</div>
                </div>
              </div>
            )}

            {/* Systèmes */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: P.textMid, padding: '8px 10px', background: P.bg, borderRadius: 8, border: `1px solid ${P.cardBdr}` }}>
                ✦ Jour personnel <b style={{ color: getNumberInfo(selected.pdv).c }}>{selected.pdv}</b> {getNumberInfo(selected.pdv).k}
              </div>
              <div style={{ fontSize: 12, color: P.textMid, padding: '8px 10px', background: P.bg, borderRadius: 8, border: `1px solid ${P.cardBdr}` }}>
                ☰ Yi King <b style={{ color: P.gold }}>#{selected.hexNum}</b> {selected.hexName}
              </div>
            </div>

            {/* Reasons — Progressive Disclosure L1 (humain) + L2 (technique collapsible) */}
            {selected.reasons.length > 0 && (() => {
              // Humanisation : séparer signaux humains (L1) et techniques (L2)
              const humanize = (r: string): { human: string; isNeg: boolean; source: string } => {
                const isNeg = r.includes('friction') || r.includes('tension') || r.includes('difficile') || r.includes('(-') || r.includes('→ -') || r.includes('résistance');
                // Nettoyer les scores bruts (+2), (-1), → +3 etc.
                const cleaned = r.replace(/\s*\(\+?\-?\d+\)\s*/g, '').replace(/\s*→\s*[\+\-]?\d+\s*$/, '').trim();
                // Détecter la source
                let source = '';
                if (/nakshatra|mrigashira|lord mars|tarabala|tithi|yoga |karana|gochara|ashtakavarga/i.test(r)) source = 'cycles profonds';
                else if (/rigel|sirius|canopus|aldebaran|spica|regulus|antares|fomalhaut|vega|arcturus/i.test(r)) source = 'étoile fixe';
                else if (/transit|aspect|saturne|jupiter|mars|vénus|mercure|neptune|uranus|pluton/i.test(r)) source = 'transit';
                else if (/bazi|jour maître|10 dieux|étoile chinoise|calendrier chinois|shen sha|kong wang|jian chu/i.test(r)) source = 'chinois';
                else if (/lune|croissant|éclipse|VoC/i.test(r)) source = 'lune';
                else if (/yi jing|yi king|oracle|hexagramme/i.test(r)) source = 'yi king';
                else if (/mercure.*ombre|rétrograde/i.test(r)) source = 'transit';
                return { human: cleaned, isNeg, source };
              };
              const items = selected.reasons.map(humanize);
              const positives = items.filter(i => !i.isNeg);
              const negatives = items.filter(i => i.isNeg);
              return (
              <div>
                {/* L1 — Résumé humain (toujours visible) */}
                <div style={{ fontSize: 10, color: P.textDim, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 8 }}>Signaux du jour</div>
                <div style={{ fontSize: 12, color: P.textMid, padding: '8px 12px', background: '#4ade800a', borderRadius: 8, borderLeft: '2px solid #4ade8044', marginBottom: 6, lineHeight: 1.7 }}>
                  <span style={{ fontWeight: 600, color: '#4ade80' }}>{positives.length} signa{positives.length > 1 ? 'ux' : 'l'} favorable{positives.length > 1 ? 's' : ''}</span>
                  {positives.length > 0 && <span style={{ color: P.textDim }}> — {[...new Set(positives.map(p => p.source).filter(Boolean))].join(', ') || 'multi-sources'}</span>}
                </div>
                {negatives.length > 0 && (
                  <div style={{ fontSize: 12, color: P.textMid, padding: '8px 12px', background: '#ef44440a', borderRadius: 8, borderLeft: '2px solid #ef444444', marginBottom: 6, lineHeight: 1.7 }}>
                    <span style={{ fontWeight: 600, color: '#ef4444' }}>{negatives.length} point{negatives.length > 1 ? 's' : ''} de vigilance</span>
                    {negatives.length > 0 && <span style={{ color: P.textDim }}> — {[...new Set(negatives.map(p => p.source).filter(Boolean))].join(', ') || 'multi-sources'}</span>}
                  </div>
                )}

                {/* L2 — Détail technique (collapsible) */}
                <details style={{ marginTop: 8 }}>
                  <summary style={{ fontSize: 10, color: P.textDim, cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, padding: '4px 0', userSelect: 'none' }}>
                    Détail technique ({selected.reasons.length} signaux)
                  </summary>
                  <div style={{ marginTop: 6 }}>
                    {selected.reasons.map((r, i) => {
                      const isNeg = r.includes('friction') || r.includes('tension') || r.includes('difficile') || r.includes('(-') || r.includes('→ -') || r.includes('résistance');
                      const isConv = r.includes('CONVERGENCE');
                      return (
                        <div key={i} style={{
                          fontSize: 11, color: P.textMid, padding: '4px 10px', marginBottom: 2,
                          background: isConv ? `${P.gold}0c` : isNeg ? '#ef44440a' : '#4ade800a',
                          borderRadius: 5, borderLeft: `2px solid ${isConv ? P.gold : isNeg ? '#ef4444' : '#4ade80'}44`, lineHeight: 1.5
                        }}>{r}</div>
                      );
                    })}
                  </div>
                </details>
              </div>
              );
            })()}

            {/* Feedback — bloqué pour les jours futurs */}
            <div style={{ marginTop: 14 }}>
              {selected.date > todayStr ? (
                <div style={{ padding: '10px 12px', borderRadius: 8, background: P.surface, border: `1px solid ${P.cardBdr}`, fontSize: 11, color: P.textDim, textAlign: 'center', fontStyle: 'italic' }}>
                  La notation n'est disponible que pour les jours passés.
                </div>
              ) : (
                <FeedbackWidget
                  date={selected.date} score={selected.score} dayType={selected.dayType.type}
                  breakdown={selected.date === todayStr ? data.conv.breakdown?.map(b => ({ system: b.system, points: b.points })) : undefined}
                />
              )}
            </div>

            {selected.date === todayStr && (
              <div style={{ marginTop: 10, padding: '8px 12px', background: `${P.gold}10`, borderRadius: 8, border: `1px solid ${P.gold}25`, fontSize: 12, color: P.gold, fontWeight: 600, textAlign: 'center' }}>● Aujourd'hui</div>
            )}
          </Cd>
        )}

        {/* Month Summary */}
        <Cd sx={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, color: P.gold, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 10 }}>✦ Synthèse du mois</div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
            {TYPE_LEGEND.map(t => {
              const count = stats.typeCounts[t.type] || 0;
              return count > 0 ? <div key={t.type} style={{ flex: count, height: 8, borderRadius: 4, background: t.color, opacity: 0.7, minWidth: 4 }} title={`${t.label}: ${count}j`} /> : null;
            })}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            {TYPE_LEGEND.map(t => {
              const count = stats.typeCounts[t.type] || 0;
              return count > 0 ? <span key={t.type} style={{ fontSize: 11, color: P.textDim }}><span style={{ color: t.color, fontWeight: 700 }}>{count}</span>j {t.label}</span> : null;
            })}
          </div>
          {(stats.goldDays.length > 0 || stats.cosmiqueDays.length > 0 || stats.annualPeakDays.length > 0) && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: P.gold, fontWeight: 600, marginBottom: 6 }}>🔥 Jours Alignement fort & 🌟 Convergence rare (≥80)</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[
                  ...stats.cosmiqueDays.map(p => ({ ...p, _tier: 'cosm' as const })),
                  ...stats.annualPeakDays.map(p => ({ ...p, _tier: 'peak' as const })),
                  ...stats.goldDays.map(p => ({ ...p, _tier: 'gold' as const })),
                ].sort((a, b) => a.day - b.day).map(p => {
                  const isCosm = p._tier === 'cosm';
                  const isPeak = p._tier === 'peak';
                  const col = isCosm ? '#E0B0FF' : isPeak ? '#00CED1' : P.gold;
                  return (
                  <button key={p.day} onClick={() => setSelected(p)} style={{ background: `${col}18`, border: `1px solid ${col}35`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, color: col, fontFamily: 'inherit', fontWeight: 600 }}>
                    {isCosm && <span className="sp-star" style={{ fontSize: 8, marginRight: 3 }}>✦</span>}
                    {isPeak && <span style={{ fontSize: 8, marginRight: 3 }}>★</span>}
                    <b>{p.day}</b> {p.score}% {p.dayType.icon}
                  </button>
                  );
                })}
              </div>
            </div>
          )}
          {stats.topDays.filter(d => d.score < 80).length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: P.green, fontWeight: 600, marginBottom: 6 }}>✦ Jours forts (≥70)</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {stats.topDays.filter(d => d.score < 80).sort((a, b) => a.day - b.day).slice(0, 8).map(p => (
                  <button key={p.day} onClick={() => setSelected(p)} style={{ background: `${p.dayType.color}15`, border: `1px solid ${p.dayType.color}30`, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, color: P.text, fontFamily: 'inherit' }}>
                    <b>{p.day}</b> <span style={{ color: p.lCol, fontSize: 10 }}>{p.score}%</span> {p.dayType.icon}
                  </button>
                ))}
              </div>
            </div>
          )}
          {stats.weakDays.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: '#9370DB', fontWeight: 600, marginBottom: 6 }}>🌙 Jours de retrait ({stats.weakDays.length})</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {stats.weakDays.sort((a, b) => a.day - b.day).map(p => (
                  <button key={p.day} onClick={() => setSelected(p)} style={{ background: '#9370DB0c', border: '1px solid #9370DB25', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, color: '#9370DB', fontFamily: 'inherit', opacity: 0.85 }}>
                    {p.day} · {p.score}%
                  </button>
                ))}
              </div>
            </div>
          )}
        </Cd>
        </>))}
      </Sec>
    </div>
  );
}
