import { useState, useMemo, useEffect, useCallback } from 'react';
import { type SoulData } from '../App';
import { getHexProfile } from '../engines/iching';
import { getMoonPhase, getLunarEvents } from '../engines/moon';
import { Sec, Cd, P } from './ui';
import FeedbackWidget from './FeedbackWidget';
import { getInteractionsSummary, type InteractionResult } from '../engines/interactions';
import { type PSIResult } from '../engines/temporal';
import { DASHA_NARRATIVES, PRATYANTAR_NARRATIVES } from '../engines/vimshottari'; // V5.2
import { calcDayPreview, estimateSlowTransitBonus } from '../engines/convergence'; // V8 J+1 + momentum
import { getDayFeedback, saveDayFeedback } from '../engines/validation-tracker'; // V9.0 P5
import { calcMomentum } from '../engines/vectorEngine'; // V8 momentum EMA
import { getCurrentPlanetaryHour, getBestHoursToday, planetFr } from '../engines/planetary-hours'; // V9 Sprint 4
import { INCLUSION_DOMAIN_MAP } from '../engines/numerology'; // V9 Sprint 5 — badge inclusion
import { getArcana, calcTarotDayNumber, DASHA_ARCANA_MAP } from '../engines/tarot'; // V9 Sprint 6 + 8a

// V4.0: Couleurs des 6 domaines contextuels
const DOMAIN_COLORS: Record<string, string> = {
  BUSINESS: '#4ade80', AMOUR: '#f472b6', RELATIONS: '#60a5fa', CREATIVITE: '#f59e0b', INTROSPECTION: '#c084fc', VITALITE: '#fb923c',
};

// Phrase explicative par niveau de score
function getLevelDesc(score: number, confidence?: number): string {
  const lowConf = confidence !== undefined && confidence < 60;
  if (score >= 90) return lowConf ? 'Score très élevé, mais les indicateurs ne sont pas tous d\'accord — restez vigilant' : 'Alignement exceptionnel — fenêtre cosmique rare, saisissez-la';
  if (score >= 85) return lowConf ? 'Bon potentiel, mais certains signaux invitent à la prudence' : 'Toutes les conditions sont réunies pour agir';
  if (score >= 70) return lowConf ? 'Énergie positive avec quelques réserves — avancez sélectivement' : 'Énergie porteuse — avancez avec confiance';
  if (score >= 55) return 'Contexte positif — restez attentif aux signaux';
  if (score >= 40) return 'Phase de préparation — consolidez vos acquis';
  return 'Journée de recul — observez avant d\'agir';
}

// V3.2.1: Phrase de confiance humaine (remplace le % ambigu)

// Génère le Brief du Jour
function buildBrief(data: SoulData): string {
  const { conv, num, iching } = data;
  const dt = conv.dayType;
  const cl = conv.climate;
  const ar = conv.actionReco;
  const moon = getMoonPhase();
  const line1 = `📊 Potentiel Stratégique : ${conv.score}% — ${conv.level.replace(/^[^\s]+ /, '')}`;
  const lineNarr = conv.scoreLevel?.narrative ? `💬 ${conv.scoreLevel.narrative}` : '';
  const line2 = `${dt.icon} Journée ${dt.label} · ${dt.desc}`;
  const lineAR = ar ? `${ar.icon} Action : ${ar.label} — ${ar.conseil}` : '';
  const lineMoon = `${moon.emoji} ${moon.name} (${moon.illumination}%) — ${moon.tactical.split('.')[0]}.`;
  const line3 = `📈 Semaine ${cl.week.label} · Mois ${cl.month.label} · Année ${cl.year.label}`;
  const line4 = `☰ I Ching #${iching.hexNum} ${iching.name} → ${iching.keyword}`;
  const lineRarity = conv.rarityIndex?.rank ? `${conv.rarityIndex.icon} ${conv.rarityIndex.label} — ${conv.rarityIndex.rank}${conv.rarityIndex.rank === 1 ? 'er' : 'ème'} meilleur jour / 365` : '';
  const lineBaZi = conv.baziDaily ? `☯ ${conv.baziDaily.dailyStem.chinese} ${conv.baziDaily.dailyStem.pinyin} (${conv.baziDaily.dailyStem.element}) → ${conv.baziDaily.interaction.dynamique.split('.')[0]}` : '';
  const lineTrinity = conv.trinity ? `🔱 TRINITY — BaZi + Numérologie + I Ching convergent` : '';
  const lineCtx = conv.contextualScores ? conv.contextualScores.domains.map(d => `  ${d.icon} ${d.label} ${d.score}% — ${d.directive || ''}`).join('\n') : '';
  const line10Gods = conv.tenGods?.dominant ? `✦ ${conv.tenGods.dominant.label} (${conv.tenGods.dominant.isZheng ? 'stable' : 'intense'})` : '';
  return [
    `🔮 SoulPrint Oracle — Brief du ${new Date().toLocaleDateString('fr-FR')}`,
    '', line1, lineNarr, line2, lineAR, lineMoon, lineBaZi, line10Gods, lineTrinity,
    '', '🎯 Domaines :', lineCtx,
    '', lineRarity, line3, line4, '', 'Bonne journée ! ✦'
  ].filter(l => l !== undefined).join('\n');
}

// V5.2 — Titres "Saison de vie" par seigneur Mahadasha
const DASHA_SAISON: Record<string, string> = {
  Ketu:    "Saison d'Élagage",
  Vénus:   "Saison d'Attraction",
  Soleil:  "Saison d'Autorité",
  Lune:    "Saison d'Intuition",
  Mars:    "Saison d'Action",
  Rahu:    "Saison d'Ambition",
  Jupiter: "Saison d'Expansion",
  Saturne: "Saison de Consolidation",
  Mercure: "Saison d'Adaptation",
};

// V5.2 — Couleur tonale par seigneur
const DASHA_COLOR: Record<string, string> = {
  Ketu:    '#a78bfa', Vénus:   '#f472b6', Soleil:  '#fbbf24',
  Lune:    '#60a5fa', Mars:    '#f87171', Rahu:    '#c084fc',
  Jupiter: '#4ade80', Saturne: '#94a3b8', Mercure: '#38bdf8',
};

// V9 Sprint 8a — Chiffres romains pour les 22 Arcanes Majeurs
const ROMAN_ARCANA: Record<number, string> = {
  0: '0',   1: 'I',    2: 'II',   3: 'III',  4: 'IV',    5: 'V',
  6: 'VI',  7: 'VII',  8: 'VIII', 9: 'IX',  10: 'X',    11: 'XI',
  12: 'XII', 13: 'XIII', 14: 'XIV', 15: 'XV', 16: 'XVI', 17: 'XVII',
  18: 'XVIII', 19: 'XIX', 20: 'XX', 21: 'XXI',
};

// V5.2 — Durée restante lisible
function formatDashaRemaining(endDate: Date): string {
  const diffMs = endDate.getTime() - Date.now();
  if (diffMs <= 0) return '—';
  const days = Math.floor(diffMs / 86400000);
  if (days > 365) {
    const years  = Math.floor(days / 365.25);
    const months = Math.floor((days % 365.25) / 30.44);
    return months > 0 ? `${years} ans ${months} mois` : `${years} ans`;
  }
  const months = Math.floor(days / 30.44);
  const rem    = Math.floor(days % 30.44);
  return months > 0 ? `${months} mois ${rem} j` : `${days} j`;
}

export default function ConvergenceTab({ data, psi, bd }: { data: SoulData; psi?: PSIResult | null; bd: string }) {
  const { num, iching, conv } = data;
  const cv = conv;
  const dt = cv.dayType;
  const cl = cv.climate;
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [expertMode, setExpertMode] = useState(false);

  // V9.0 P5 — Blind Check-in : note hier AVANT de voir les scores d'aujourd'hui
  const [blindMode, setBlindMode] = useState<'ask' | 'result' | null>(null);
  const [blindRating, setBlindRating] = useState<number>(3);
  const [blindYesterday, setBlindYesterday] = useState<string>('');
  const [blindPredicted, setBlindPredicted] = useState<number>(0);
  const [blindLabel, setBlindLabel] = useState<string>('');
  const STAR_LABELS = ['', 'Difficile', 'Mitigé', 'Correct', 'Bon', 'Excellent'];

  // V9 Sprint 5 — Badge inclusion : Jour Personnel = leçon karmique
  const todayStr = new Date().toISOString().slice(0, 10);
  const [inclBadgeDismissed, setInclBadgeDismissed] = useState<boolean>(
    () => localStorage.getItem(`inclusionBadgeDismissed_${todayStr}`) === 'true'
  );
  // Trouve le manque karmique actif aujourd'hui (Jour Personnel ∈ kl[])
  const activeLack: number | null = (() => {
    const pdv = num.ppd?.v ?? 0;
    if (!num.kl || num.kl.length === 0) return null;
    if (num.kl.includes(pdv)) return pdv;
    return null;
  })();

  useEffect(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().slice(0, 10);
    const existing = getDayFeedback(yStr);
    if (!existing?.userScore) {
      setBlindYesterday(yStr);
      setBlindMode('ask');
      // Calcul du score prédit d'hier via calcDayPreview
      try {
        const tb = estimateSlowTransitBonus(data.astro ?? null);
        const preview = calcDayPreview(bd, data.num, data.cz, yStr, tb);
        if (preview) {
          setBlindPredicted(preview.score);
          setBlindLabel(preview.dayType.type);
        }
      } catch { /* fail silently — modal reste fonctionnel sans score */ }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submitBlindRating = useCallback(() => {
    if (!blindYesterday) return;
    const legacyRating: 'good' | 'neutral' | 'bad' = blindRating >= 4 ? 'good' : blindRating <= 2 ? 'bad' : 'neutral';
    saveDayFeedback(blindYesterday, blindPredicted, blindLabel, legacyRating, undefined, undefined, blindRating);
    setBlindMode('result');
    setTimeout(() => setBlindMode(null), 4500);
  }, [blindYesterday, blindRating, blindPredicted, blindLabel]);

  const [isSharingDay, setIsSharingDay] = useState(false); // V9 Sprint 7d — déclaré AVANT generateDayCard

  // ── V9 Sprint 7d — Carte du Jour partageable ──
  const generateDayCard = useCallback(async () => {
    setIsSharingDay(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 540; canvas.height = 960;
      const ctx = canvas.getContext('2d')!;
      // Background
      const bg = ctx.createLinearGradient(0, 0, 540, 960);
      bg.addColorStop(0, '#0d0d1a'); bg.addColorStop(0.5, '#1a1040'); bg.addColorStop(1, '#0d0d1a');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, 540, 960);
      // Étoiles déterministes (seed = date)
      let seed = parseInt(todayStr.replace(/-/g, '')) & 0xffffffff;
      const rng = () => { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 0xffffffff; };
      for (let i = 0; i < 45; i++) {
        ctx.beginPath(); ctx.arc(rng() * 540, rng() * 960, rng() * 1.5 + 0.3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,215,0,${0.15 + rng() * 0.55})`; ctx.fill();
      }
      // Bordure
      ctx.strokeStyle = 'rgba(255,215,0,0.32)'; ctx.lineWidth = 2;
      ctx.strokeRect(14, 14, 512, 932);
      ctx.textAlign = 'center';
      // Header
      ctx.font = '600 17px system-ui,sans-serif'; ctx.fillStyle = 'rgba(255,215,0,0.82)';
      ctx.fillText('✦  KAIRONAUTE  ✦', 270, 72);
      // Date
      const dateLabel = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      ctx.font = '400 17px system-ui,sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillText(dateLabel, 270, 110);
      // Nom
      if (num.full) {
        ctx.font = '500 21px system-ui,sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.72)';
        ctx.fillText(num.full, 270, 152);
      }
      // Score géant
      const sg = ctx.createLinearGradient(170, 320, 370, 510);
      sg.addColorStop(0, '#FFD700'); sg.addColorStop(0.5, '#FFA500'); sg.addColorStop(1, '#FFD700');
      ctx.fillStyle = sg;
      ctx.font = '900 190px system-ui,sans-serif';
      ctx.fillText(String(cv.score), 270, 500);
      // Level
      ctx.font = '700 24px system-ui,sans-serif';
      ctx.fillStyle = cv.lCol || '#FFD700';
      ctx.fillText(cv.level.replace(/^[^\s]+ /, '').toUpperCase(), 270, 555);
      // Arcane
      const arcDay = getArcana(calcTarotDayNumber(todayStr));
      ctx.font = '500 18px system-ui,sans-serif'; ctx.fillStyle = 'rgba(255,215,0,0.65)';
      ctx.fillText(`🃏  ${arcDay.name_fr}  ·  ${arcDay.theme}`, 270, 618);
      // Narratif (72 chars)
      const snip = arcDay.narrative.length > 72 ? arcDay.narrative.slice(0, 72) + '…' : arcDay.narrative;
      ctx.font = 'italic 14px system-ui,sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.38)';
      ctx.fillText(snip, 270, 658);
      // Footer
      ctx.font = '400 13px system-ui,sans-serif'; ctx.fillStyle = 'rgba(255,215,0,0.38)';
      ctx.fillText('kaironaute.app', 270, 924);
      // Partage
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `kaironaute-${todayStr}.png`, { type: 'image/png' });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: `Mon Score du Jour — ${cv.score}%` });
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url; a.download = file.name; a.click();
          URL.revokeObjectURL(url);
        }
      }, 'image/png');
    } catch (e) { console.error('dayCard error', e); }
    finally { setIsSharingDay(false); }
  }, [cv, num, todayStr]); // eslint-disable-line react-hooks/exhaustive-deps
  const [showMercuryInfo, setShowMercuryInfo] = useState(false);
  const [showEclipseInfo, setShowEclipseInfo] = useState(false);
  const hexProfile = getHexProfile(iching.hexNum);
  const isGold = cv.score >= 85;
  const isCosmique = cv.score >= 90;
  const moon = getMoonPhase();
  const lunarEvents = getLunarEvents();

  // V8 — Volatilité : écart-type des 3 modules actifs (BaZi DM, 10 Gods, Nakshatra)
  const volatility = useMemo(() => {
    const get = (sys: string) => cv.breakdown?.find(b => b.system === sys)?.points ?? 0;
    const clampV = (v: number) => Math.max(-1, Math.min(1, isFinite(v) ? v : 0));
    const modules = [clampV(get('BaZi') / 6), clampV(get('10 Gods') / 6), clampV(get('Nakshatra') / 7)];
    const mean = modules.reduce((a, b) => a + b, 0) / 3;
    const stdDev = Math.sqrt(modules.reduce((s, v) => s + (v - mean) ** 2, 0) / 3);
    const index = Math.min(1, stdDev / 1.1);
    if (index < 0.35) return { index, label: 'Signaux convergents', icon: '✓', color: '#4ade80' };
    if (index < 0.65) return { index, label: 'Signaux mixtes', icon: '◐', color: '#f59e0b' };
    return { index, label: 'Signaux contradictoires', icon: '⚠️', color: '#ef4444' };
  }, [cv.breakdown]);

  // V8 — Score J+1
  const tomorrowPreview = useMemo(() => {
    if (!bd) return null;
    try {
      const d = new Date(); d.setDate(d.getDate() + 1);
      const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const tb = estimateSlowTransitBonus(data.astro);
      return calcDayPreview(bd, data.num, data.cz, ds, tb);
    } catch { return null; }
  }, [bd, data]);

  // V8 — Momentum EMA 7 jours
  const scoreMomentum = useMemo(() => {
    if (!bd) return null;
    try {
      const tb = estimateSlowTransitBonus(data.astro);
      const scores: number[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        scores.push(calcDayPreview(bd, data.num, data.cz, ds, tb).score);
      }
      return calcMomentum(scores);
    } catch { return null; }
  }, [bd, data]);

  const handleBrief = async () => {
    const text = buildBrief(data);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const subject = encodeURIComponent(`SoulPrint Brief — ${new Date().toLocaleDateString('fr-FR')}`);
      const body = encodeURIComponent(text);
      window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
    }
  };

  return (
    <div>

      {/* ══ V9.0 P5 — Blind Check-in : rating AVANT affichage score ══ */}
      {blindMode === 'ask' && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(10,10,18,0.95)', backdropFilter: 'blur(12px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: 24, animation: 'fadeIn 0.4s ease'
        }}>
          <div style={{ fontSize: 13, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>
            ✦ Check-in aveugle
          </div>
          <div style={{ fontSize: 22, color: '#f1f5f9', fontWeight: 700, marginBottom: 6, textAlign: 'center' }}>
            Comment était ta journée d'hier ?
          </div>
          <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 28, textAlign: 'center' }}>
            {blindYesterday ? new Date(blindYesterday + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}
            <br /><span style={{ fontSize: 11, opacity: 0.6 }}>Note AVANT de voir le score — ça calibre le moteur</span>
          </div>
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
          <div style={{ fontSize: 14, color: '#C9A84C', fontWeight: 600, marginBottom: 28, minHeight: 20 }}>
            {STAR_LABELS[blindRating]}
          </div>
          <button onClick={submitBlindRating} style={{
            background: 'linear-gradient(135deg, #C9A84C, #f59e0b)', color: '#000',
            border: 'none', borderRadius: 12, padding: '12px 40px', fontSize: 15,
            fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 16,
            boxShadow: '0 4px 20px #C9A84C40'
          }}>
            Valider ma note
          </button>
          <button onClick={() => setBlindMode(null)} style={{
            background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer',
            fontSize: 12, fontFamily: 'inherit', opacity: 0.5
          }}>
            Passer (fausse la calibration)
          </button>
        </div>
      )}

      {/* ══ V9.0 P5 — Blind Result : comparaison vécu vs prédit ══ */}
      {blindMode === 'result' && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(10,10,18,0.95)', backdropFilter: 'blur(12px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: 24, animation: 'fadeIn 0.4s ease'
        }}>
          <div style={{ fontSize: 13, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 }}>
            ✦ Comparaison
          </div>
          {blindPredicted > 0 && (
            <div style={{ display: 'flex', gap: 32, alignItems: 'center', marginBottom: 20 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>Ton vécu</div>
                <div style={{ fontSize: 36 }}>{'⭐'.repeat(blindRating)}</div>
                <div style={{ fontSize: 13, color: '#C9A84C', fontWeight: 600 }}>{STAR_LABELS[blindRating]}</div>
              </div>
              <div style={{ fontSize: 20, color: '#9ca3af' }}>vs</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>Score prédit</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: blindPredicted >= 65 ? '#4ade80' : blindPredicted >= 40 ? '#60a5fa' : '#ef4444' }}>
                  {blindPredicted}%
                </div>
                <div style={{ fontSize: 13, color: '#9ca3af' }}>{blindLabel}</div>
              </div>
            </div>
          )}
          {(() => {
            const expectedBracket = blindRating >= 4 ? 'high' : blindRating <= 2 ? 'low' : 'mid';
            const predictedBracket = blindPredicted >= 65 ? 'high' : blindPredicted >= 40 ? 'mid' : 'low';
            const match = expectedBracket === predictedBracket;
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
            background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer',
            fontSize: 12, fontFamily: 'inherit', marginTop: 20, opacity: 0.6
          }}>
            Voir aujourd'hui →
          </button>
        </div>
      )}

      {/* ═══ V9 Sprint 5 — Badge Inclusion : Jour Personnel = leçon karmique ═══ */}
      {!inclBadgeDismissed && activeLack !== null && (() => {
        const info = INCLUSION_DOMAIN_MAP[activeLack];
        return (
          <div style={{
            margin: '0 0 12px 0', padding: '12px 14px',
            background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 16 }}>🧬</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#ef4444' }}>
                  Jour Personnel {activeLack} · Leçon karmique en lumière
                </span>
              </div>
              <div style={{ fontSize: 11, color: P.textMid, lineHeight: 1.5 }}>{info.activationText}</div>
              <div style={{ fontSize: 10, color: P.textDim, marginTop: 4 }}>
                Axe {info.icon} {info.domain} · {info.lesson}
              </div>
            </div>
            <button
              onClick={() => {
                localStorage.setItem(`inclusionBadgeDismissed_${todayStr}`, 'true');
                setInclBadgeDismissed(true);
              }}
              style={{
                background: 'none', border: 'none', color: P.textDim,
                cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '2px 4px', flexShrink: 0,
              }}
              aria-label="Fermer"
            >✕</button>
          </div>
        );
      })()}

      <Sec icon="⭐" title="Pilotage Stratégique">
        <Cd>

          {/* ═══ 1. SCORE — la première chose que le client voit ═══ */}

          {/* Gold / Cosmique Day Banner (only for 85+) */}
          {isGold && (() => {
            const confRatio = cv.temporalConfidence?.agreementRatio ?? 100;
            const isLowConf = confRatio < 60;
            return (
            <div style={{
              padding: '12px 16px', marginBottom: 16, textAlign: 'center',
              background: isCosmique && !isLowConf
                ? 'linear-gradient(135deg, #E0B0FF12, #9333ea1a, #E0B0FF12)'
                : isLowConf
                ? 'linear-gradient(135deg, #f59e0b08, #f59e0b0a, #f59e0b08)'
                : 'linear-gradient(135deg, #FFD70012, #C9A84C1a, #FFD70012)',
              border: `1.5px solid ${isCosmique && !isLowConf ? '#E0B0FF40' : isLowConf ? '#f59e0b30' : P.gold + '40'}`, borderRadius: 10,
              boxShadow: isLowConf ? 'none' : `0 0 24px ${isCosmique ? '#E0B0FF20' : P.gold + '18'}`
            }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: isLowConf ? '#f59e0b' : isCosmique ? '#E0B0FF' : P.gold, letterSpacing: 2 }}>
                {isLowConf
                  ? '⚡ POTENTIEL FORT — SIGNAUX MITIGÉS'
                  : isCosmique ? '⚡ CONVERGENCE RARE' : '⚡ ALIGNEMENT FORT'}
              </div>
              <div style={{ fontSize: 12, color: isLowConf ? '#f59e0b' : isCosmique ? '#E0B0FF' : P.gold, opacity: 0.8, marginTop: 5 }}>
                {isLowConf
                  ? `Score élevé mais les systèmes ne sont pas unanimes. Avancez avec prudence.`
                  : isCosmique
                  ? `Convergence exceptionnelle de tous les systèmes${cv.rarityIndex?.rank ? ` — ${cv.rarityIndex.rank}${cv.rarityIndex.rank === 1 ? 'er' : 'ème'} meilleur jour de l'année` : ''}`
                  : `Alignement rare${cv.rarityIndex?.rank ? ` — Top ${cv.rarityIndex.rank} sur 365 jours` : ''} — toutes les conditions sont réunies`}
              </div>
            </div>
            );
          })()}

          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: P.gold, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700, marginBottom: 14 }}>
              Potentiel Stratégique du Jour
            </div>
            <div style={{ position: 'relative', width: 170, height: 170, margin: '0 auto' }}>
              <svg width="170" height="170" viewBox="0 0 170 170">
                {/* V8 — Halo CI : blur proportionnel à l'incertitude (margin > 3) */}
                {cv.ci && cv.ci.margin > 3 && (
                  <circle cx="85" cy="85" r="72" fill="none"
                    stroke={cv.lCol} strokeWidth={10 + cv.ci.margin} opacity="0.18"
                    style={{ filter: `blur(${Math.max(0, (cv.ci.margin - 3) * 0.8).toFixed(1)}px)`, transition: 'all 0.5s ease-out' }} />
                )}
                {isGold && <circle cx="85" cy="85" r="78" fill="none" stroke={isCosmique ? '#E0B0FF' : P.gold} strokeWidth="1" opacity="0.3" />}
                <circle cx="85" cy="85" r="72" fill="none" stroke={P.cardBdr} strokeWidth="10" />
                <circle cx="85" cy="85" r="72" fill="none" stroke={cv.lCol} strokeWidth="10"
                  strokeDasharray={2 * Math.PI * 72} strokeDashoffset={2 * Math.PI * 72 * (1 - cv.score / 100)}
                  strokeLinecap="round" transform="rotate(-90 85 85)"
                  style={{ filter: `drop-shadow(0 0 ${isGold ? '14' : '10'}px ${cv.lCol}${isGold ? '88' : '55'})`, transition: 'stroke-dashoffset 1s ease' }} />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 46, fontWeight: 700, color: cv.lCol }}>{cv.score}</span>
                <span style={{ fontSize: 14, color: cv.lCol + 'aa' }}>%</span>
                {/* V8.9 — Plage [low–high] (Grok Q1 + GPT Q4) — affichée si margin >= 4 */}
                {cv.ci && cv.ci.margin >= 4 && cv.ci.lower !== cv.ci.upper && (
                  <span style={{ fontSize: 10, color: P.textDim, opacity: 0.7, marginTop: 2, letterSpacing: 0.5 }}>
                    {cv.ci.lower}–{cv.ci.upper}
                  </span>
                )}
              </div>
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: cv.lCol, marginTop: 14 }}>{cv.level}</div>
            <div style={{ fontSize: 13, color: P.textMid, marginTop: 6, fontStyle: 'italic' }}>
              {cv.scoreLevel?.narrative || getLevelDesc(cv.score, cv.temporalConfidence?.agreementRatio)}
            </div>
            <div style={{ fontSize: 12, color: P.textDim, marginTop: 8 }}>
              {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} · Thème : {cv.theme}
            </div>
            {cv.rarityIndex && cv.score >= 85 && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                marginTop: 10, padding: '6px 14px',
                background: cv.rarityIndex.percentage <= 3 ? '#E0B0FF0c' : cv.rarityIndex.percentage <= 8 ? `${P.gold}0c` : '#27272a44',
                border: `1px solid ${cv.rarityIndex.percentage <= 3 ? '#E0B0FF25' : cv.rarityIndex.percentage <= 8 ? P.gold + '25' : P.cardBdr}`,
                borderRadius: 20,
              }}>
                <span style={{ fontSize: 14 }}>{cv.rarityIndex.icon}</span>
                <span style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
                  color: cv.rarityIndex.percentage <= 3 ? '#E0B0FF' : cv.rarityIndex.percentage <= 8 ? P.gold : P.textMid,
                }}>
                  {cv.rarityIndex.label}
                </span>
                <span style={{ fontSize: 10, color: P.textDim }}>
                  {cv.rarityIndex.rank
                    ? `${cv.rarityIndex.rank}${cv.rarityIndex.rank === 1 ? 'er' : 'ème'} / 365j`
                    : `${cv.rarityIndex.percentage.toFixed(1)}%`
                  }
                </span>
              </div>
            )}
            {cv.trinity && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                marginTop: 8, marginLeft: 6, padding: '5px 12px',
                background: '#E0B0FF0c', border: '1px solid #E0B0FF30', borderRadius: 20,
              }}>
                <span style={{ fontSize: 13 }}>🔱</span>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: '#E0B0FF' }}>TRINITY</span>
                <span style={{ fontSize: 10, color: '#E0B0FFaa' }}>BaZi + Num + I Ching convergent</span>
              </div>
            )}
            {/* V4.3b: Badge consensus — affiché seulement si systèmes divisés */}
            {cv.ci && cv.ci.margin > 8 && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                marginTop: 8, marginLeft: 6, padding: '5px 12px',
                background: cv.ci.margin <= 4 ? '#4ade800c' : cv.ci.margin <= 8 ? `${P.gold}0c` : '#ef44440c',
                border: `1px solid ${cv.ci.margin <= 4 ? '#4ade8030' : cv.ci.margin <= 8 ? P.gold + '30' : '#ef444430'}`,
                borderRadius: 20,
              }}>
                <span style={{ fontSize: 12 }}>{cv.ci.margin <= 4 ? '🎯' : cv.ci.margin <= 8 ? '📊' : '⚖️'}</span>
                <span style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
                  color: cv.ci.margin <= 4 ? '#4ade80' : cv.ci.margin <= 8 ? P.gold : '#ef4444',
                }}>
                  {cv.ci.label === 'Serré' ? 'Consensus fort' : cv.ci.label === 'Modéré' ? 'Consensus modéré' : 'Systèmes divisés'}
                </span>
                <span style={{ fontSize: 10, color: P.textDim }}>{cv.ci.lower}–{cv.ci.upper}%</span>
              </div>
            )}

            {/* V8 — Badge Volatilité — affiché seulement si signaux contradictoires */}
            {volatility && volatility.index >= 0.65 && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                marginTop: 8, marginLeft: 6, padding: '5px 12px',
                background: `${volatility.color}0c`,
                border: `1px solid ${volatility.color}30`,
                borderRadius: 20,
              }}>
                <span style={{ fontSize: 12 }}>{volatility.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: volatility.color }}>
                  {volatility.label}
                </span>
              </div>
            )}

            {/* V8.9 — Badge Dasha incertitude (Grok Q2) — masqué si HIGH */}
            {cv.dashaCertainty && cv.dashaCertainty.certaintyLevel !== 'HIGH' && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                marginTop: 8, marginLeft: 6, padding: '5px 12px',
                background: cv.dashaCertainty.certaintyLevel === 'LOW' ? '#ef44440c' : '#f59e0b0c',
                border: `1px solid ${cv.dashaCertainty.certaintyLevel === 'LOW' ? '#ef444430' : '#f59e0b30'}`,
                borderRadius: 20,
              }}>
                <span style={{ fontSize: 12 }}>🌙</span>
                <span style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
                  color: cv.dashaCertainty.certaintyLevel === 'LOW' ? '#ef4444' : '#f59e0b',
                }}>
                  {cv.dashaCertainty.certaintyLevel === 'LOW' ? 'Lune instable' : 'Transition Dasha'}
                </span>
                {cv.dashaCertainty.warning && (
                  <span style={{ fontSize: 10, color: cv.dashaCertainty.certaintyLevel === 'LOW' ? '#ef4444aa' : '#f59e0baa' }}>
                    — recul conseillé
                  </span>
                )}
              </div>
            )}

            {/* V8 — Momentum EMA 7j */}
            {scoreMomentum && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 }}>
                <span style={{ fontSize: 10, color: P.textDim, textTransform: 'uppercase', letterSpacing: 1 }}>Tendance 7j</span>
                <span style={{
                  fontSize: 13, fontWeight: 800,
                  color: scoreMomentum.trend === 'rising' ? '#4ade80' : scoreMomentum.trend === 'falling' ? '#ef4444' : P.textDim,
                }}>
                  {scoreMomentum.trend === 'rising' ? '↗' : scoreMomentum.trend === 'falling' ? '↘' : '→'}
                  {' '}{scoreMomentum.trend === 'rising' ? 'Montée' : scoreMomentum.trend === 'falling' ? 'Descente' : 'Stable'}
                </span>
              </div>
            )}

            {/* V8 — Aperçu J+1 */}
            {tomorrowPreview && (
              <div style={{
                marginTop: 12, padding: '10px 16px',
                background: P.surface, border: `1px solid ${P.cardBdr}`, borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              }}>
                <div style={{ fontSize: 11, color: P.textDim }}>
                  {new Date(Date.now() + 86400000).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, color: P.textDim, textTransform: 'uppercase', letterSpacing: 1 }}>Demain</span>
                  <span style={{
                    fontSize: 20, fontWeight: 800,
                    color: tomorrowPreview.score >= 85 ? '#E0B0FF' : tomorrowPreview.score >= 70 ? P.gold : tomorrowPreview.score >= 50 ? P.textMid : '#ef4444',
                  }}>
                    {tomorrowPreview.score}<span style={{ fontSize: 11, fontWeight: 400, opacity: 0.6 }}>%</span>
                  </span>
                  <span style={{ fontSize: 11, color: P.textDim }}>{tomorrowPreview.dayType.icon} {tomorrowPreview.dayType.label}</span>
                  {cv.score !== 0 && (
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      color: tomorrowPreview.score > cv.score ? '#4ade80' : tomorrowPreview.score < cv.score ? '#ef4444' : P.textDim,
                    }}>
                      {tomorrowPreview.score > cv.score
                        ? `+${tomorrowPreview.score - cv.score}`
                        : tomorrowPreview.score < cv.score
                        ? `${tomorrowPreview.score - cv.score}`
                        : '='}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* ── V9 Sprint 7d — Bouton Carte du Jour ── */}
            <div style={{ marginTop: 18 }}>
              <button
                onClick={generateDayCard}
                disabled={isSharingDay}
                style={{
                  width: '100%', padding: '13px 0', borderRadius: 12,
                  background: isSharingDay
                    ? 'rgba(255,215,0,0.15)'
                    : 'linear-gradient(135deg, #B8860B, #FFD700, #B8860B)',
                  border: 'none', cursor: isSharingDay ? 'not-allowed' : 'pointer',
                  fontSize: 14, fontWeight: 700,
                  color: isSharingDay ? 'rgba(255,215,0,0.5)' : '#0d0d1a',
                  letterSpacing: 0.3,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {isSharingDay ? '⏳ Génération…' : '📲 Partager le Score du Jour'}
              </button>
            </div>
          </div>

          {/* ═══ V8 — Décomposition Signal · Terrain · Élan ═══ */}
          {cv.rawFinal !== undefined && cv.ctxMult !== undefined && cv.dashaMult !== undefined && (() => {
            // Signal = score sans les multiplicateurs de terrain
            const terrainMult = cv.ctxMult * cv.dashaMult;
            const signalDelta = terrainMult > 0 ? cv.rawFinal / terrainMult : cv.rawFinal;
            const signalScore = Math.max(5, Math.min(97, Math.round(50 + 45 * Math.sign(signalDelta) * Math.pow(Math.min(Math.abs(signalDelta) / 18, 1), 1.05))));
            const terrainPts  = cv.score - signalScore;
            const elanBonus   = cv.interactions?.totalBonus ?? 0;
            const terrainPct  = Math.round(terrainMult * 100) / 100;
            const terrainPos  = terrainPts >= 0;
            return (
              <div style={{
                marginTop: 12, padding: '10px 16px',
                background: P.surface, border: `1px solid ${P.cardBdr}`, borderRadius: 10,
              }}>
                <div style={{ fontSize: 9, color: P.textDim, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 600, marginBottom: 8 }}>
                  Décomposition du score
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap' }}>
                  {/* Signal */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 70 }}>
                    <div style={{ fontSize: 9, color: P.textDim, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 }}>Signal</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: signalScore >= 65 ? P.gold : signalScore >= 45 ? P.textMid : '#ef4444' }}>
                      {signalScore}
                    </div>
                    <div style={{ fontSize: 9, color: P.textDim, marginTop: 1 }}>BaZi · Nak</div>
                  </div>
                  {/* Séparateur */}
                  <div style={{ color: P.textDim, fontSize: 16, opacity: 0.3, padding: '0 4px' }}>·</div>
                  {/* Terrain */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 80 }}>
                    <div style={{ fontSize: 9, color: P.textDim, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 }}>Terrain</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: terrainPos ? '#4ade80' : '#ef4444' }}>
                      ×{terrainPct.toFixed(2)}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: terrainPos ? '#4ade80' : '#ef4444', marginTop: 1 }}>
                      {terrainPts >= 0 ? `+${terrainPts}` : terrainPts} pts
                    </div>
                  </div>
                  {/* Séparateur */}
                  <div style={{ color: P.textDim, fontSize: 16, opacity: 0.3, padding: '0 4px' }}>·</div>
                  {/* Élan */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 70 }}>
                    <div style={{ fontSize: 9, color: P.textDim, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 }}>Élan</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: elanBonus > 0 ? '#4ade80' : elanBonus < 0 ? '#ef4444' : P.textDim }}>
                      {elanBonus > 0 ? `+${elanBonus}` : elanBonus === 0 ? '—' : elanBonus}
                    </div>
                    <div style={{ fontSize: 9, color: P.textDim, marginTop: 1 }}>Synergies</div>
                  </div>
                  {/* Séparateur */}
                  <div style={{ color: P.textDim, fontSize: 16, opacity: 0.3, padding: '0 4px' }}>=</div>
                  {/* Score final */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 60 }}>
                    <div style={{ fontSize: 9, color: P.textDim, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 }}>Score</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: cv.lCol }}>{cv.score}</div>
                    <div style={{ fontSize: 9, color: P.textDim, marginTop: 1 }}>Total</div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ═══ 3. ACTION DU JOUR — quoi faire ═══ */}
          {cv.actionReco && (
            <div style={{
              padding: '14px 18px', marginBottom: 20,
              background: `${cv.actionReco.color}10`,
              border: `2px solid ${cv.actionReco.color}35`,
              borderRadius: 12,
              boxShadow: `0 0 20px ${cv.actionReco.color}10`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 34, flexShrink: 0 }}>{cv.actionReco.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: P.textDim, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600 }}>
                    Action du jour · {dt.icon} Journée {dt.label}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: cv.actionReco.color, letterSpacing: 2, marginTop: 2 }}>
                    {cv.actionReco.label}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: P.textMid, marginTop: 8, lineHeight: 1.5 }}>
                {cv.actionReco.conseil}
              </div>
            </div>
          )}

          {/* ═══ 4. POTENTIEL PAR DOMAINE — où agir ═══ */}

          {/* V8.4 — Carte Stellium actif (conditionnel — transit lent sur planète de stellium natal) */}
          {(() => {
            if (!data.astro?.stelliums?.length || !data.astro?.tr?.length) return null;
            const SLOW = new Set(['jupiter', 'saturn', 'uranus', 'neptune', 'pluto']);
            const activeStelliums = data.astro.stelliums.filter(s =>
              s.type === 'sign' && s.planets.length >= 3 &&
              s.planets.some(p => data.astro!.tr.some(t => t.np === p && SLOW.has(t.tp) && t.o <= 3))
            );
            if (!activeStelliums.length) return null;
            const firstSign = data.astro.pl.find(p => p.k === activeStelliums[0].planets[0])?.s || 'Aries';
            const ELEM_COL_MAP: Record<string, string> = { fire: '#ff6b35', earth: '#8b7355', air: '#60a5fa', water: '#00CED1' };
            const SIGN_ELEM_MAP: Record<string, string> = { Aries: 'fire', Leo: 'fire', Sagittarius: 'fire', Taurus: 'earth', Virgo: 'earth', Capricorn: 'earth', Gemini: 'air', Libra: 'air', Aquarius: 'air', Cancer: 'water', Scorpio: 'water', Pisces: 'water' };
            const col = ELEM_COL_MAP[SIGN_ELEM_MAP[firstSign]] || '#FFD700';
            return (
              <div style={{
                marginBottom: 16,
                background: `linear-gradient(145deg, ${col}10 0%, #0a0a0f 100%)`,
                border: `1px solid ${col}35`,
                borderRadius: 12,
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: `${col}18`,
                  display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0,
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={col} strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <circle cx="12" cy="12" r="4"/>
                    <line x1="12" y1="2" x2="12" y2="6"/>
                    <line x1="12" y1="18" x2="12" y2="22"/>
                    <line x1="2" y1="12" x2="6" y2="12"/>
                    <line x1="18" y1="12" x2="22" y2="12"/>
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: P.text, marginBottom: 3 }}>
                    Pic d'intensité personnelle
                  </div>
                  <div style={{ fontSize: 11, color: P.textDim, lineHeight: 1.4 }}>
                    Plusieurs de vos forces innées agissent en synergie aujourd'hui — une concentration rare de vos potentiels est stimulée.
                  </div>
                </div>
              </div>
            );
          })()}

          {/* V8 — Méta-domaines Couche 1 : FAIRE / LIER / ÊTRE */}
          {/* V8.5 P6.1 — Carte Grand Trigone actif (conditionnel — transit lent ≤0.8° sur sommet) */}
          {(() => {
            if (!data.astro?.grandTrines?.length || !data.astro?.tr?.length) return null;
            const SLOW = new Set(['jupiter', 'saturn', 'uranus', 'neptune', 'pluto']);
            const ELEM_COL_MAP: Record<string, string> = { fire: '#ff6b35', earth: '#8b7355', air: '#60a5fa', water: '#00CED1' };
            const ELEM_TEXT: Record<string, string> = { fire: 'créativité et leadership', earth: 'réalisme et construction', air: 'communication et intellect', water: 'empathie et intuition' };
            const activeGT = data.astro.grandTrines.find(gt =>
              gt.planets.some(p =>
                data.astro!.tr.some(t =>
                  t.np === p && SLOW.has(t.tp) &&
                  (t.t === 'trine' || t.t === 'sextile') &&
                  t.o <= 0.8
                )
              )
            );
            if (!activeGT) return null;
            const col = ELEM_COL_MAP[activeGT.element?.toLowerCase()] || '#FFD700';
            const talent = ELEM_TEXT[activeGT.element?.toLowerCase()] || 'vos forces naturelles';
            return (
              <div style={{
                marginBottom: 16, position: 'relative', overflow: 'hidden',
                background: '#0a0a0f', border: `1px solid ${col}40`,
                borderRadius: 16, padding: '18px 16px',
                boxShadow: `0 4px 20px ${col}18`,
              }}>
                <div style={{
                  position: 'absolute', top: '-40%', left: '-5%',
                  width: '110%', height: '180%',
                  background: `radial-gradient(circle, ${col}12 0%, transparent 60%)`,
                  pointerEvents: 'none',
                }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, position: 'relative' }}>
                  <span style={{ color: col, fontSize: 16 }}>✦</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: P.text }}>Signature Personnelle Amplifiée</span>
                </div>
                <div style={{ fontSize: 12, color: '#d1d5db', lineHeight: 1.5, position: 'relative' }}>
                  Votre don naturel pour la <strong style={{ color: col }}>{talent}</strong> est particulièrement réceptif aujourd'hui. Faites confiance à vos facilités innées.
                </div>
              </div>
            );
          })()}

          {/* V8.5 P6.2 — Carte T-Carré actif (conditionnel — transit lent ≤1.5° sur apex ou pôles) */}
          {(() => {
            if (!data.astro?.tSquares?.length || !data.astro?.tr?.length) return null;
            const SLOW = new Set(['jupiter', 'saturn', 'uranus', 'neptune', 'pluto']);
            const APEX_TEXT: Record<string, string> = {
              mercury: 'Communiquer clairement peut dénouer la tension.',
              venus: 'La douceur et la diplomatie sont vos leviers du jour.',
              mars: 'Osez poser une action courageuse, même petite.',
              jupiter: 'Gardez une vision large — ne vous perdez pas dans les détails.',
              saturn: 'La rigueur et la patience sont vos alliées.',
              moon: 'Accueillez vos émotions sans chercher à les rationaliser.',
              sun: 'Restez centré sur votre intention principale.',
              uranus: 'L\'inattendu peut être une porte de sortie.',
              neptune: 'Faites confiance à votre intuition plus qu\'à la logique.',
              pluto: 'Une transformation profonde est à l\'oeuvre — laissez partir.',
            };
            const PLANET_FR_MAP: Record<string, string> = {
              mercury: 'Mercure', venus: 'Vénus', mars: 'Mars', jupiter: 'Jupiter',
              saturn: 'Saturne', moon: 'Lune', sun: 'Soleil', uranus: 'Uranus',
              neptune: 'Neptune', pluto: 'Pluton',
            };
            const activeTS = data.astro.tSquares.find(ts => {
              const pts = [ts.apex, ...ts.opposition];
              return pts.some(p =>
                data.astro!.tr.some(t =>
                  t.np === p && SLOW.has(t.tp) &&
                  (t.t === 'square' || t.t === 'opposition' || t.t === 'conjunction') &&
                  t.o <= 1.5
                )
              );
            });
            if (!activeTS) return null;
            const apexKey = activeTS.apex?.toLowerCase() || '';
            const apexLabel = APEX_TEXT[apexKey] || 'Un défi structurel se présente comme opportunité.';
            return (
              <div style={{
                marginBottom: 16, padding: '14px 16px',
                background: '#0a0a0f', borderRadius: 12,
                border: '1px solid #f59e0b30',
                boxShadow: '0 2px 12px rgba(245,158,11,0.08)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 14 }}>◈</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: P.text }}>Moteur de Croissance Activé</span>
                </div>
                <div style={{ fontSize: 12, color: '#d1d5db', lineHeight: 1.5, marginBottom: 8 }}>
                  Un défi structurel familier se présente — votre force intérieure est mise à contribution.
                </div>
                <div style={{
                  fontSize: 11, color: '#f59e0b', background: '#f59e0b10',
                  borderRadius: 6, padding: '6px 10px',
                  display: 'flex', alignItems: 'flex-start', gap: 6,
                }}>
                  <span style={{ flexShrink: 0 }}>🔑</span>
                  <span>
                    <strong>Clé {PLANET_FR_MAP[apexKey] ? `— ${PLANET_FR_MAP[apexKey]}` : ''} :</strong> {apexLabel}
                  </span>
                </div>
              </div>
            );
          })()}

          {cv.contextualScores && (() => {
            // Option A : Terrain multiplier + ré-ancrage au score global — Sprint O — V10.8
            const terrain = (cv.ctxMult ?? 1.0) * (cv.dashaMult ?? 1.0);
            const globalScore = cv.score ?? 50;
            // Étape 1 : terrain compresse l'écart à 50 | Étape 2 : ancrage 40% au score global
            const adjustDomain = (s: number) => {
              const t1 = 50 + (s - 50) * terrain;
              return Math.round(t1 * 0.60 + globalScore * 0.40);
            };
            const domScore = (name: string) => adjustDomain(cv.contextualScores!.domains.find(d => d.domain === name)?.score ?? 50);
            const calcMeta = (a: number, b: number) => Math.min(100, Math.round(Math.max(a, b) + Math.min(a, b) * 0.15));

            // Sprint Q — DOMAIN_AFFINITY dynamique : routing Dasha lord + Année personnelle (Gemini Ronde 14)
            // Agit uniquement sur l'amplitude des piliers affichés — pas sur le score global
            const mahaLord = data.dasha?.maha.lord ?? '';
            const pyVal    = data.num?.py?.v ?? 0;
            let wF = 1.0, wL = 1.0, wE = 1.0;
            if ([1, 8, 10].includes(pyVal))           wF += 0.35;
            else if ([2, 6].includes(pyVal))           wL += 0.35;
            else if ([7, 9, 11, 22].includes(pyVal))  wE += 0.35;
            const DASHA_ROUTING: Record<string, 'F'|'L'|'E'> = {
              'Soleil': 'F', 'Mars': 'F', 'Rahu': 'F',
              'Vénus': 'L', 'Lune': 'L',
              'Saturne': 'E', 'Jupiter': 'E', 'Ketu': 'E', 'Mercure': 'E',
            };
            const dr = DASHA_ROUTING[mahaLord];
            if (dr === 'F') wF += 0.25; else if (dr === 'L') wL += 0.25; else if (dr === 'E') wE += 0.25;
            const wTotal = wF + wL + wE;
            // Normalisation : avg = 1.0, max ≈ 1.20, min ≈ 0.87 — fail safe clamp
            const nF = Math.max(0.87, Math.min(1.20, (wF / wTotal) * 3));
            const nL = Math.max(0.87, Math.min(1.20, (wL / wTotal) * 3));
            const nE = Math.max(0.87, Math.min(1.20, (wE / wTotal) * 3));
            const metaScore = (base: number, w: number) => Math.min(100, Math.max(0, Math.round(base * w)));

            const meta = [
              { key: 'FAIRE', icon: '⚡', label: 'Faire', color: '#f59e0b', val: metaScore(calcMeta(domScore('BUSINESS'), domScore('CREATIVITE')), nF), sub: 'Business · Créativité' },
              { key: 'LIER',  icon: '🤝', label: 'Lier',  color: '#c084fc', val: metaScore(calcMeta(domScore('AMOUR'), domScore('RELATIONS')), nL),     sub: 'Amour · Relations'    },
              { key: 'ETRE',  icon: '🧘', label: 'Être',  color: '#4ade80', val: metaScore(calcMeta(domScore('VITALITE'), domScore('INTROSPECTION')), nE), sub: 'Vitalité · Intro'   },
            ];
            return (
              <div style={{ marginBottom: 12, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {meta.map(m => (
                  <div key={m.key} style={{
                    padding: '10px 8px', borderRadius: 10, textAlign: 'center',
                    background: `${m.color}0a`, border: `1px solid ${m.color}25`,
                  }}>
                    <div style={{ fontSize: 18, marginBottom: 3 }}>{m.icon}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: m.color, textTransform: 'uppercase', letterSpacing: 0.8 }}>{m.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, margin: '4px 0',
                      color: m.val >= 70 ? m.color : m.val >= 45 ? P.textMid : '#ef4444' }}>
                      {m.val}<span style={{ fontSize: 10, fontWeight: 400, opacity: 0.6 }}>%</span>
                    </div>
                    <div style={{ height: 3, background: '#27272a', borderRadius: 2, overflow: 'hidden', marginBottom: 5 }}>
                      <div style={{ height: '100%', width: `${m.val}%`, background: m.color, opacity: 0.7, transition: 'width 0.8s ease', borderRadius: 2 }} />
                    </div>
                    <div style={{ fontSize: 9, color: P.textDim }}>{m.sub}</div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Domaines détaillés (Couche 2) */}
          {cv.contextualScores && (
            <div style={{ marginBottom: 20, padding: 14, background: P.bg, borderRadius: 10, border: `1px solid ${P.cardBdr}` }}>
              <div style={{ fontSize: 11, color: P.gold, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 4 }}>
                ✦ Potentiel par Domaine
              </div>
              <div style={{ fontSize: 11, color: P.textDim, marginBottom: 12, lineHeight: 1.4 }}>
                Comment l'énergie du jour se répartit dans les 6 domaines de votre vie.
              </div>

              <div style={{ display: 'grid', gap: 10 }}>
                {cv.contextualScores.domains.map(d => {
                  const pct = d.score;
                  const isBest = d.domain === cv.contextualScores!.bestDomain;
                  const isWorst = d.domain === cv.contextualScores!.worstDomain;
                  const barColor = d.color;
                  // V8.4 : indicateur maison active — transit lent sur point natal de cette maison ?
                  const SLOW = new Set(['jupiter', 'saturn', 'uranus', 'neptune', 'pluto']);
                  const HOUSE_DOM: Partial<Record<number, string>> = { 1:'VITALITE',2:'BUSINESS',3:'RELATIONS',4:'INTROSPECTION',5:'CREATIVITE',6:'VITALITE',7:'AMOUR',8:'INTROSPECTION',9:'CREATIVITE',10:'BUSINESS',11:'RELATIONS',12:'INTROSPECTION' };
                  const houseActive = data.astro?.pl.some(pl =>
                    HOUSE_DOM[pl.h] === d.domain &&
                    data.astro!.tr.some(t => t.np === pl.k && SLOW.has(t.tp) && t.o <= 3)
                  ) ?? false;
                  return (
                    <div key={d.domain} style={{
                      padding: '10px 12px', borderRadius: 8,
                      background: isBest ? `${barColor}08` : isWorst ? '#ef444406' : P.surface,
                      border: `1px solid ${isBest ? barColor + '25' : isWorst ? '#ef444418' : P.cardBdr}`,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: P.text }}>
                          {d.icon} {d.label}
                        </span>
                        <span style={{
                          fontSize: 16, fontWeight: 800,
                          color: pct >= 70 ? barColor : pct >= 45 ? P.textMid : '#ef4444',
                        }}>
                          {pct}<span style={{ fontSize: 11, fontWeight: 400, opacity: 0.6 }}>%</span>
                        </span>
                      </div>
                      <div style={{ height: 6, background: '#27272a', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 3,
                          width: `${pct}%`,
                          background: `linear-gradient(90deg, ${barColor}66, ${barColor})`,
                          boxShadow: pct >= 70 ? `0 0 8px ${barColor}44` : 'none',
                          transition: 'width 0.8s ease',
                        }} />
                      </div>
                      {d.directive && (
                        <div style={{ fontSize: 11, color: P.textMid, marginTop: 6, lineHeight: 1.4, fontStyle: 'italic' }}>
                          {d.directive}
                        </div>
                      )}
                      {houseActive && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2.5"><path d="M12 2L2 12h3v8h14v-8h3L12 2z"/></svg>
                          <span style={{ fontSize: 10, color: '#a78bfa', letterSpacing: 0.4 }}>
                            Stimulé par votre secteur personnel
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{
                marginTop: 10, padding: '8px 12px', borderRadius: 6,
                background: `${DOMAIN_COLORS[cv.contextualScores.bestDomain]}08`,
                border: `1px solid ${DOMAIN_COLORS[cv.contextualScores.bestDomain]}18`,
              }}>
                <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.5 }}>
                  {cv.contextualScores.conseil}
                </div>
              </div>
            </div>
          )}

          {/* ═══ 4b. HEURE PLANÉTAIRE CHALDÉENNE — V9 Sprint 4 ═══ */}
          {(() => {
            const ph   = getCurrentPlanetaryHour();
            const best = getBestHoursToday(new Date(), 3);
            if (!ph) return null;
            const qualColor = ph.quality === 'favorable' ? '#4ade80' : ph.quality === 'challenging' ? '#ef4444' : P.textMid;
            const qualLabel = ph.quality === 'favorable' ? 'Favorable' : ph.quality === 'challenging' ? 'Tendu' : 'Neutre';
            return (
              <div style={{ marginBottom: 20, padding: 14, background: P.bg, borderRadius: 10, border: `1px solid ${P.cardBdr}` }}>
                <div style={{ fontSize: 11, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 10 }}>
                  ⏱ Heure Planétaire
                </div>

                {/* Heure courante */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: best.length > 0 ? 12 : 0, padding: '10px 12px',
                  background: `${qualColor}08`, borderRadius: 8, border: `1px solid ${qualColor}20` }}>
                  <div style={{ fontSize: 28 }}>{ph.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: P.text }}>{ph.label}</div>
                    <div style={{ fontSize: 11, color: P.textDim, marginTop: 2 }}>{ph.keywords.join(' · ')}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <div style={{ padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                      color: qualColor, background: `${qualColor}15`, border: `1px solid ${qualColor}30` }}>
                      {qualLabel}
                    </div>
                    <div style={{ fontSize: 10, color: P.textDim }}>
                      {ph.isDayHour ? '☀️' : '🌙'} H{ph.hourIndex}/12
                    </div>
                  </div>
                </div>

                {/* Prochaines heures favorables */}
                {best.length > 0 && (
                  <>
                    <div style={{ fontSize: 10, color: P.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                      Prochaines heures favorables
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {best.map((h, i) => {
                        const start = new Date(h.startMs);
                        const hh = start.getHours().toString().padStart(2, '0');
                        const mm = start.getMinutes().toString().padStart(2, '0');
                        return (
                          <div key={i} style={{ flex: 1, padding: '6px 8px', borderRadius: 8,
                            background: '#4ade8008', border: '1px solid #4ade8020', textAlign: 'center' }}>
                            <div style={{ fontSize: 18 }}>{h.icon}</div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#4ade80', marginTop: 2 }}>
                              {planetFr(h.planet)}
                            </div>
                            <div style={{ fontSize: 9, color: P.textDim }}>{hh}:{mm}</div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })()}

          {/* ═══ 4c. ARCANE DU JOUR — V9 Sprint 6 ═══ */}
          {(() => {
            const todayStr2 = new Date().toISOString().slice(0, 10);
            const arcane = getArcana(calcTarotDayNumber(todayStr2));
            return (
              <div style={{ marginBottom: 20, padding: 14, background: P.bg, borderRadius: 10, border: `1px solid ${P.cardBdr}` }}>
                <div style={{ fontSize: 11, color: P.gold, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 10 }}>
                  🃏 Arcane du Jour
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 40, height: 64, background: `${P.gold}12`, borderRadius: 6, border: `1px solid ${P.gold}33`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 20 }}>🃏</span>
                    <span style={{ fontSize: 8, color: P.gold, fontWeight: 700, marginTop: 2 }}>{arcane.num}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: P.text }}>{arcane.name_fr}</div>
                    <div style={{ fontSize: 11, color: P.gold, fontWeight: 600, marginTop: 2 }}>{arcane.theme}</div>
                    <div style={{ fontSize: 11, color: P.textMid, marginTop: 4, lineHeight: 1.5 }}>✦ {arcane.light}</div>
                  </div>
                </div>
                <div style={{ marginTop: 10, padding: '8px 10px', background: `${P.gold}06`, borderRadius: 8, borderLeft: `2px solid ${P.gold}44` }}>
                  <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.7, fontStyle: 'italic' }}>
                    {arcane.narrative}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ═══ 4d. SYNERGIES ACTIVES (V4.4 — Niveau 2) ═══ */}
          {cv.interactions && cv.interactions.active?.length > 0 && (() => {
            const inter = cv.interactions;
            const lines = getInteractionsSummary(inter);
            const positive = inter.active.filter(a => a.bonus > 0);
            const negative = inter.active.filter(a => a.bonus < 0);
            return (
              <div style={{ marginBottom: 20, padding: 14, background: P.bg, borderRadius: 10, border: `1px solid ${P.cardBdr}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <div style={{ fontSize: 11, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>
                    ⚡ Synergies du Jour
                  </div>
                  <div style={{
                    padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700,
                    color: inter.totalBonus > 0 ? '#4ade80' : inter.totalBonus < 0 ? '#ef4444' : P.textDim,
                    background: inter.totalBonus > 0 ? '#4ade800c' : inter.totalBonus < 0 ? '#ef44440c' : P.surface,
                    border: `1px solid ${inter.totalBonus > 0 ? '#4ade8025' : inter.totalBonus < 0 ? '#ef444425' : P.cardBdr}`,
                  }}>
                    {inter.totalBonus > 0 ? '+' : ''}{inter.totalBonus} pts
                    {inter.uncapped !== inter.totalBonus && (
                      <span style={{ fontSize: 9, color: P.textDim, marginLeft: 4 }}>(brut: {inter.uncapped > 0 ? '+' : ''}{inter.uncapped})</span>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: P.textDim, marginBottom: 12, lineHeight: 1.4 }}>
                  Interactions détectées entre vos systèmes. Quand BaZi, Numérologie, I Ching et la Lune s'alignent, l'effet est amplifié.
                </div>

                <div style={{ display: 'grid', gap: 6 }}>
                  {positive.length > 0 && positive.map((a, i) => (
                    <div key={`p${i}`} style={{
                      padding: '8px 12px', borderRadius: 8,
                      background: '#4ade8006', borderLeft: '3px solid #4ade8044',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <span style={{ fontSize: 12, color: P.textMid, lineHeight: 1.5 }}>✨ {a.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#4ade80', flexShrink: 0, marginLeft: 8 }}>+{a.bonus}</span>
                    </div>
                  ))}
                  {negative.length > 0 && negative.map((a, i) => (
                    <div key={`n${i}`} style={{
                      padding: '8px 12px', borderRadius: 8,
                      background: '#ef44440a', borderLeft: '3px solid #ef444444',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <span style={{ fontSize: 12, color: P.textMid, lineHeight: 1.5 }}>⚠️ {a.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', flexShrink: 0, marginLeft: 8 }}>{a.bonus}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* ═══ 5. ALERTES — Mercure, Éclipses, compactes ═══ */}
          {lunarEvents.length > 0 && (
            <div style={{ marginBottom: 20, display: 'grid', gap: 8 }}>
              {lunarEvents.map((ev, i) => {
                const isMercury = ev.name.toLowerCase().includes('mercure');
                const isEclipse = ev.name.toLowerCase().includes('clipse');
                const showInfo = isMercury ? showMercuryInfo : isEclipse ? showEclipseInfo : false;
                const toggleInfo = isMercury
                  ? () => setShowMercuryInfo(p => !p)
                  : isEclipse
                  ? () => setShowEclipseInfo(p => !p)
                  : undefined;
                const simpleExplain = isMercury
                  ? 'Mercure rétrograde, c\'est quand la planète semble reculer dans le ciel. En astrologie, ça perturbe la communication : mails perdus, malentendus, contrats flous, pannes techniques. Ce n\'est pas le moment de signer ou lancer du neuf — c\'est le moment de relire, corriger et recontacter.'
                  : isEclipse
                  ? 'Une éclipse lunaire amplifie les émotions et pousse au changement. C\'est un moment de bilan intérieur — ce qui ne vous sert plus tend à partir naturellement.'
                  : null;
                const intensityFR = ev.intensity === 'forte' ? 'Impact fort' : ev.intensity === 'modérée' ? 'Impact modéré' : 'Impact léger';
                return (
                <div key={i} style={{
                  padding: '12px 14px', borderRadius: 10,
                  background: ev.status === 'today'
                    ? `linear-gradient(135deg, ${ev.intensity === 'forte' ? '#dc262612' : '#f59e0b08'}, transparent)`
                    : ev.intensity === 'forte' ? '#dc262608' : '#f59e0b06',
                  border: `1px solid ${ev.status === 'today'
                    ? (ev.intensity === 'forte' ? '#dc262640' : '#f59e0b35')
                    : (ev.intensity === 'forte' ? '#dc262620' : '#f59e0b15')}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 20 }}>{ev.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: ev.status === 'today' ? '#fca5a5' : P.text }}>
                        {ev.name}
                      </div>
                      <div style={{ fontSize: 10, color: P.textDim }}>
                        {ev.status === 'today'
                          ? '⚡ AUJOURD\'HUI — phénomène en cours'
                          : ev.status === 'past'
                          ? `Il y a ${Math.abs(ev.daysUntil)} jour${Math.abs(ev.daysUntil) > 1 ? 's' : ''} — effets encore actifs`
                          : `Dans ${ev.daysUntil} jour${ev.daysUntil > 1 ? 's' : ''} — ${new Date(ev.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`}
                        {' '}· {intensityFR}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: ev.intensity === 'forte' ? '#fca5a5' : '#fbbf24', lineHeight: 1.6, fontWeight: 500 }}>
                    {ev.effect}
                  </div>
                  {/* En savoir plus — toggle */}
                  {simpleExplain && (
                    <div style={{ marginTop: 6 }}>
                      <button onClick={toggleInfo} style={{
                        background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontFamily: 'inherit',
                        fontSize: 11, color: '#f59e0b88', textDecoration: 'underline', textUnderlineOffset: 2,
                      }}>
                        {showInfo ? '▾ Masquer l\'explication' : '▸ C\'est quoi exactement ?'}
                      </button>
                      {showInfo && (
                        <div style={{ fontSize: 11, color: P.textMid, lineHeight: 1.6, marginTop: 6, padding: '8px 10px', background: '#ffffff04', borderRadius: 6, borderLeft: '2px solid #f59e0b20' }}>
                          💡 {simpleExplain}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          )}


          {/* ═══ 7. CLIMAT STRATÉGIQUE ═══ */}
          <div style={{ marginBottom: 20, padding: 14, background: P.bg, borderRadius: 10, border: `1px solid ${P.cardBdr}` }}>
            <div style={{ fontSize: 11, color: P.gold, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 12 }}>✦ Climat Stratégique</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {([
                ['Semaine', cl.week],
                ['Mois', cl.month],
                ['Année', cl.year],
              ] as const).map(([period, scale]) => (
                <div key={period} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', background: `${scale.color}08`,
                  borderRadius: 8, border: `1px solid ${scale.color}20`
                }}>
                  <span style={{ fontSize: 20 }}>{scale.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: P.textDim, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, width: 60 }}>{period}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: scale.color }}>{scale.label}</span>
                    </div>
                    <div style={{ fontSize: 12, color: P.textMid, marginTop: 3 }}>{scale.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ═══ 8. ÉNERGIE DU JOUR (10 Gods) — simplifié ═══ */}
          {cv.tenGods && cv.tenGods.dominant && (
            <div style={{ marginBottom: 20, padding: 14, background: P.bg, borderRadius: 10, border: `1px solid ${P.cardBdr}` }}>
              <div style={{ fontSize: 11, color: '#c084fc', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 4 }}>
                ✦ Énergie Dominante du Jour
              </div>
              <div style={{ fontSize: 11, color: P.textDim, marginBottom: 12, lineHeight: 1.4 }}>
                Identifie la force du calendrier chinois qui influence vos actions et relations aujourd'hui.
              </div>
              {(() => {
                const tg = cv.tenGods;
                const dom = tg.dominant;
                if (!dom) return null;
                return (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                      <div style={{
                        padding: '8px 14px', borderRadius: 8,
                        background: dom.isZheng ? '#4ade800c' : '#f59e0b0c',
                        border: `1.5px solid ${dom.isZheng ? '#4ade8030' : '#f59e0b30'}`,
                      }}>
                        {/* V3.2.1: Label en gros, chinois en petit */}
                        <div style={{ fontSize: 13, fontWeight: 800, color: dom.isZheng ? '#4ade80' : '#f59e0b', textAlign: 'center' }}>
                          {dom.label}
                        </div>
                        <div style={{ fontSize: 9, color: P.textDim, textAlign: 'center', marginTop: 2 }}>
                          {dom.label.split(' ')[0]} · {dom.isZheng ? 'Stable' : 'Intense'}
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.5 }}>
                          {dom.isZheng ? 'Force constructive et régulière — favorise la stabilité et les gains prévisibles.' : 'Force créative et imprévisible — favorise les idées neuves et les tournants.'}
                        </div>
                        <div style={{ fontSize: 11, color: dom.isZheng ? '#4ade80' : '#f59e0b', marginTop: 4, fontWeight: 600 }}>
                          Impact : {tg.totalScore > 0 ? '+' : ''}{tg.totalScore} sur votre journée
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      {[
                        { label: 'Business', pts: tg.businessPts, icon: '💼', color: '#4ade80' },
                        { label: 'Relations', pts: tg.relationsPts, icon: '🤝', color: '#60a5fa' },
                        { label: 'Créativité', pts: tg.creativityPts, icon: '✨', color: '#f59e0b' },
                        { label: 'Introspection', pts: 0, icon: '🔮', color: '#c084fc' },
                      ].map(d => (
                        <div key={d.label} style={{
                          padding: '6px 8px', borderRadius: 6,
                          background: `${d.color}06`, borderLeft: `2px solid ${d.color}33`,
                        }}>
                          <div style={{ fontSize: 10, color: d.color, fontWeight: 600 }}>{d.icon} {d.label}</div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: d.pts > 0 ? d.color : P.textDim, marginTop: 2 }}>
                            {d.pts > 0 ? '+' : ''}{d.pts}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ═══ 9. PHASE LUNAIRE ═══ */}
          <div style={{
            padding: '14px 16px', marginBottom: 20,
            background: 'linear-gradient(135deg, #1e1b4b08, #31274808)',
            border: `1px solid #6366f125`, borderRadius: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 38, flexShrink: 0, filter: 'drop-shadow(0 0 8px #6366f155)' }}>{moon.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600 }}>
                  Phase lunaire
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: P.text, marginTop: 2 }}>
                  {moon.name}
                </div>
                <div style={{ fontSize: 10, color: P.textDim, marginTop: 2 }}>
                  {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} · Illumination {moon.illumination}%
                </div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: P.textMid, marginTop: 10, lineHeight: 1.6 }}>
              {moon.tactical}
            </div>
          </div>


          {/* ═══ 10. RÉSONANCE PSI — déplacé en Mode Expert (V8 nettoyage) ═══ */}

          {/* ═══ 10b. SAISON DE VIE — Vimshottari Dasha (V5.2) ═══ */}
          {data.dasha && (() => {
            const dasha     = data.dasha!;
            const mahaLord  = dasha.maha.lord;
            const antarLord = dasha.antar.lord;
            const pratLord  = dasha.pratyantar.lord;
            const color     = DASHA_COLOR[mahaLord] ?? P.gold;
            const saison    = DASHA_SAISON[mahaLord] ?? mahaLord;
            const narrative = DASHA_NARRATIVES[mahaLord] ?? '';
            const pratNarr  = PRATYANTAR_NARRATIVES[pratLord] ?? '';

            // Barre Maha — progression globale
            const mahaPct   = Math.round(dasha.maha.progressRatio * 100);

            // Segment Antar dans la barre Maha
            const antarLeft  = ((dasha.antar.startDate.getTime() - dasha.maha.startDate.getTime()) / dasha.maha.durationMs) * 100;
            const antarWidth = (dasha.antar.durationMs / dasha.maha.durationMs) * 100;

            const mahaRemain = formatDashaRemaining(dasha.maha.endDate);
            const antarRemain = formatDashaRemaining(dasha.antar.endDate);
            const pratRemain  = formatDashaRemaining(dasha.pratyantar.endDate);

            const isSandhi = dasha.maha.isTransition;

            return (
              <div style={{
                marginBottom: 20, padding: 14,
                background: `${color}08`,
                borderRadius: 10, border: `1px solid ${color}25`,
              }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, color, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>
                      🕉 Saison de Vie
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color, marginTop: 2 }}>
                      {saison}
                      {isSandhi && <span style={{ fontSize: 11, color: '#fbbf24', marginLeft: 8, fontWeight: 600 }}>⚠ Transition</span>}
                    </div>
                  </div>
                  <div style={{
                    padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                    color, background: `${color}12`, border: `1px solid ${color}30`,
                    textAlign: 'right',
                  }}>
                    <div>{mahaLord}</div>
                    <div style={{ fontSize: 9, color: P.textDim, fontWeight: 400, marginTop: 1 }}>encore {mahaRemain}</div>
                  </div>
                </div>

                {/* Narrative Maha */}
                {narrative && (
                  <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.6, marginBottom: 12, fontStyle: 'italic' }}>
                    {narrative}
                  </div>
                )}

                {/* Barre temporelle */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: P.textDim, marginBottom: 4 }}>
                    <span>MAHADASHA {mahaLord.toUpperCase()}</span>
                    <span>{mahaPct}% écoulé</span>
                  </div>
                  {/* Barre Maha */}
                  <div style={{ position: 'relative', height: 8, background: `${color}18`, borderRadius: 4, overflow: 'hidden' }}>
                    {/* Progression Maha */}
                    <div style={{
                      position: 'absolute', left: 0, top: 0, bottom: 0,
                      width: `${mahaPct}%`,
                      background: `${color}30`, borderRadius: 4,
                    }} />
                    {/* Segment Antar */}
                    <div style={{
                      position: 'absolute', top: 1, bottom: 1,
                      left: `${Math.max(0, Math.min(100, antarLeft))}%`,
                      width: `${Math.max(1, Math.min(100 - antarLeft, antarWidth))}%`,
                      background: color, borderRadius: 3, opacity: 0.85,
                    }} />
                    {/* Curseur aujourd'hui */}
                    <div style={{
                      position: 'absolute', top: -1, bottom: -1,
                      left: `${mahaPct}%`, width: 2,
                      background: '#ffffff80', borderRadius: 1,
                    }} />
                  </div>
                </div>

                {/* Antar + Pratyantar */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {/* Antardasha */}
                  <div style={{ padding: '8px 10px', borderRadius: 8, background: `${color}0c`, border: `1px solid ${color}20` }}>
                    <div style={{ fontSize: 9, color: P.textDim, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>Période</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color, marginTop: 2 }}>{antarLord}</div>
                    <div style={{ fontSize: 10, color: P.textDim, marginTop: 2 }}>encore {antarRemain}</div>
                  </div>
                  {/* Pratyantar — tooltip hover */}
                  <div
                    title={pratNarr}
                    style={{ padding: '8px 10px', borderRadius: 8, background: `${color}06`, border: `1px solid ${color}14`, cursor: 'help' }}
                  >
                    <div style={{ fontSize: 9, color: P.textDim, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>Cette semaine</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: P.textMid, marginTop: 2 }}>{pratLord}</div>
                    <div style={{ fontSize: 10, color: P.textDim, marginTop: 2 }}>encore {pratRemain}</div>
                  </div>
                </div>

                {/* Narrative Pratyantar */}
                {pratNarr && (
                  <div style={{ fontSize: 11, color: P.textDim, lineHeight: 1.5, marginTop: 10, padding: '7px 10px', background: `${color}06`, borderRadius: 6, borderLeft: `2px solid ${color}30` }}>
                    {pratNarr}
                  </div>
                )}

                {/* ── Sprint 8a — Arcane de Saison : résonance Dasha↔Tarot ── */}
                {(() => {
                  const arcanaNum = DASHA_ARCANA_MAP[mahaLord];
                  if (arcanaNum === undefined) return null;
                  const arcana = getArcana(arcanaNum);
                  return (
                    <div style={{
                      marginTop: 10, padding: '8px 12px',
                      background: `${color}08`, borderRadius: 8,
                      border: `1px solid ${color}20`,
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                      {/* Badge chiffre romain */}
                      <div style={{
                        width: 34, height: 34, borderRadius: 6, flexShrink: 0,
                        background: `${color}15`, border: `1px solid ${color}35`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 800, color, fontFamily: 'serif',
                        letterSpacing: -0.5,
                      }}>
                        {ROMAN_ARCANA[arcana.num] ?? arcana.num}
                      </div>
                      {/* Texte */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 9, color: P.textDim, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 600 }}>
                          🎴 Arcane de Saison
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color, marginTop: 1 }}>
                          {arcana.name_fr}
                        </div>
                        <div style={{ fontSize: 10, color: P.textMid, marginTop: 1, fontStyle: 'italic' }}>
                          {arcana.theme}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })()}

          {/* ═══ 11. MODE EXPERT ═══ */}
          <div style={{ marginTop: 4 }}>
            <button
              onClick={() => setExpertMode(prev => !prev)}
              style={{
                width: '100%', padding: '10px 14px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: P.bg, border: `1px solid ${P.cardBdr}`,
                borderRadius: expertMode ? '10px 10px 0 0' : 10,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <span style={{ fontSize: 11, color: P.textDim, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>
                🔬 Mode Expert — Détail des systèmes
              </span>
              <span style={{ fontSize: 12, color: P.textDim, transform: expertMode ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
            </button>
            {expertMode && (
            <div style={{ padding: 14, background: P.bg, borderRadius: '0 0 10px 10px', border: `1px solid ${P.cardBdr}`, borderTop: 'none' }}>

            {/* PSI — déplacé de Couche 1 (V8 nettoyage) */}
            {psi && (psi.resonanceLabel === 'forte' || psi.resonanceLabel === 'modérée') && (() => {
              const isFort = psi.resonanceLabel === 'forte';
              const psiColor = isFort ? '#f59e0b' : '#60a5fa';
              const top = psi.pastMatches[0];
              const daysAgo = top ? Math.round((Date.now() - new Date(top.date).getTime()) / 86400000) : null;
              const scoreInfo = top?.score != null ? ` · Score ${top.score}% ce jour-là` : '';
              return (
                <div style={{ marginBottom: 16, padding: 12, background: `${psiColor}06`, borderRadius: 8, border: `1px solid ${psiColor}22` }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ fontSize: 11, color: psiColor, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>🔄 Résonance Périodique</div>
                    <div style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, color: psiColor, background: `${psiColor}12`, border: `1px solid ${psiColor}25` }}>
                      {isFort ? 'Forte' : 'Modérée'} · {psi.resonanceScore}%
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.6 }}>{psi.narrative}</div>
                  {daysAgo != null && (
                    <div style={{ fontSize: 11, color: P.textDim, marginTop: 4 }}>
                      Écho il y a {daysAgo} jour{daysAgo > 1 ? 's' : ''}{scoreInfo}
                      {psi.nextOccurrence && (() => { const d = Math.round((new Date(psi.nextOccurrence!.date).getTime() - Date.now()) / 86400000); return ` · prochain écho dans ${d}j`; })()}
                    </div>
                  )}
                  {psi.conseil && <div style={{ fontSize: 11, color: psiColor, fontWeight: 600, marginTop: 4 }}>→ {psi.conseil}</div>}
                </div>
              );
            })()}

            <div style={{ fontSize: 11, color: P.gold, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 12 }}>
              ✦ Analyse des Systèmes ({cv.score}% = 50 base + bonus)
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              {cv.breakdown?.map((b, i) => {
                const isPos = b.points > 0;
                const isNeg = b.points < 0;
                const ptColor = isPos ? '#4ade80' : isNeg ? '#ef4444' : P.textDim;
                const isOpen = expanded.has(b.system);
                const hasContent = (b.signals?.length || 0) + (b.alerts?.length || 0) > 0 || b.system === 'I Ching' || b.system === 'BaZi' || b.system === 'Hex Nucléaire';
                const toggle = () => {
                  if (!hasContent) return;
                  setExpanded(prev => {
                    const next = new Set(prev);
                    next.has(b.system) ? next.delete(b.system) : next.add(b.system);
                    return next;
                  });
                };
                return (
                  <div key={i}>
                    <div
                      onClick={toggle}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 12px', borderRadius: isOpen ? '8px 8px 0 0' : 8,
                        background: isPos ? '#4ade8006' : isNeg ? '#ef44440a' : P.surface,
                        border: `1px solid ${isPos ? '#4ade8020' : isNeg ? '#ef444420' : P.cardBdr}`,
                        borderBottom: isOpen ? 'none' : undefined,
                        cursor: hasContent ? 'pointer' : 'default',
                        transition: 'all 0.15s ease',
                      }}>
                      <span style={{ fontSize: 18, width: 24, textAlign: 'center', flexShrink: 0 }}>{b.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: P.text }}>{b.system}</span>
                          <span style={{ fontSize: 11, color: P.textDim }}>{b.value}</span>
                        </div>
                        <div style={{ fontSize: 10, color: P.textDim, marginTop: 2 }}>{b.detail}</div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: ptColor, flexShrink: 0, minWidth: 42, textAlign: 'right' }}>
                        {b.points > 0 ? `+${b.points}` : b.points === 0 ? '—' : b.points}
                      </div>
                      {hasContent && (
                        <span style={{ fontSize: 10, color: P.textDim, transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
                      )}
                    </div>

                    {isOpen && (
                      <div style={{
                        padding: '10px 12px', borderRadius: '0 0 8px 8px',
                        background: isPos ? '#4ade8004' : isNeg ? '#ef444406' : `${P.surface}88`,
                        border: `1px solid ${isPos ? '#4ade8020' : isNeg ? '#ef444420' : P.cardBdr}`,
                        borderTop: 'none',
                      }}>
                        {b.signals?.map((s, si) => (
                          <div key={`s${si}`} style={{ fontSize: 12, color: P.textMid, padding: '5px 10px', marginBottom: 3, background: '#4ade800a', borderRadius: 6, borderLeft: '2px solid #4ade8044', lineHeight: 1.6 }}>{s}</div>
                        ))}
                        {b.alerts?.map((a, ai) => (
                          <div key={`a${ai}`} style={{ fontSize: 12, color: P.textMid, padding: '5px 10px', marginBottom: 3, background: '#f973160a', borderRadius: 6, borderLeft: '2px solid #f9731644', lineHeight: 1.6 }}>{a}</div>
                        ))}
                        {b.system === 'I Ching' && hexProfile && (
                          <div style={{ marginTop: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                              <div style={{ padding: '3px 10px', borderRadius: 4, background: `${P.gold}15`, fontSize: 11, fontWeight: 700, color: P.gold }}>{hexProfile.archetype}</div>
                              <div style={{ fontSize: 10, color: P.textDim }}>Ligne mutante {iching.changing + 1}</div>
                            </div>
                            <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.7, marginBottom: 6 }}>{hexProfile.judgment}</div>
                            <div style={{ fontSize: 11, color: P.textDim, fontStyle: 'italic', lineHeight: 1.5, marginBottom: 8 }}>« {hexProfile.image} »</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
                              <div style={{ padding: '6px 8px', borderRadius: 6, background: '#4ade800a', borderLeft: '2px solid #4ade8044' }}>
                                <div style={{ fontSize: 8, color: '#4ade80', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Opportunité</div>
                                <div style={{ fontSize: 10, color: P.textMid, marginTop: 2 }}>{hexProfile.opportunity}</div>
                              </div>
                              <div style={{ padding: '6px 8px', borderRadius: 6, background: '#ef44440a', borderLeft: '2px solid #ef444444' }}>
                                <div style={{ fontSize: 8, color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Risque</div>
                                <div style={{ fontSize: 10, color: P.textMid, marginTop: 2 }}>{hexProfile.risk}</div>
                              </div>
                            </div>
                            <div style={{ padding: '8px 10px', borderRadius: 6, background: `${P.gold}0c`, border: `1px solid ${P.gold}20` }}>
                              <div style={{ fontSize: 8, color: P.gold, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Action stratégique</div>
                              <div style={{ fontSize: 12, color: P.gold, fontWeight: 600, marginTop: 3, lineHeight: 1.5 }}>{hexProfile.action}</div>
                            </div>
                          </div>
                        )}
                        {b.system === 'BaZi' && cv.baziDaily && (
                          <div style={{ marginTop: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                              <div style={{ padding: '3px 10px', borderRadius: 4, background: '#c084fc15', fontSize: 11, fontWeight: 700, color: '#c084fc' }}>
                                {cv.baziDaily.dailyStem.chinese} {cv.baziDaily.dailyStem.pinyin}
                              </div>
                              <div style={{ fontSize: 10, color: P.textDim }}>{cv.baziDaily.dailyStem.archetype}</div>
                            </div>
                            <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.7, marginBottom: 8 }}>
                              {cv.baziDaily.interaction.dynamique}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
                              <div style={{ padding: '6px 8px', borderRadius: 6, background: '#c084fc08', borderLeft: '2px solid #c084fc44' }}>
                                <div style={{ fontSize: 8, color: '#c084fc', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Élément du jour</div>
                                <div style={{ fontSize: 10, color: P.textMid, marginTop: 2 }}>{cv.baziDaily.dailyStem.element} ({cv.baziDaily.dailyStem.yinYang})</div>
                              </div>
                              <div style={{ padding: '6px 8px', borderRadius: 6, background: '#c084fc08', borderLeft: '2px solid #c084fc44' }}>
                                <div style={{ fontSize: 8, color: '#c084fc', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Relation</div>
                                <div style={{ fontSize: 10, color: P.textMid, marginTop: 2 }}>{cv.baziDaily.relation === 'same' ? 'Renforcement' : cv.baziDaily.relation === 'produced_by' ? 'Soutien' : cv.baziDaily.relation === 'produces' ? 'Créativité' : cv.baziDaily.relation === 'destroyed_by' ? 'Pression' : 'Conflit'}</div>
                              </div>
                            </div>
                            <div style={{ padding: '8px 10px', borderRadius: 6, background: '#c084fc0c', border: '1px solid #c084fc20' }}>
                              <div style={{ fontSize: 8, color: '#c084fc', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Conseil</div>
                              <div style={{ fontSize: 12, color: '#c084fc', fontWeight: 600, marginTop: 3, lineHeight: 1.5 }}>{cv.baziDaily.interaction.conseil}</div>
                            </div>
                          </div>
                        )}
                        {b.system === 'Hex Nucléaire' && cv.nuclearHex && (
                          <div style={{ marginTop: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                              <div style={{ padding: '3px 10px', borderRadius: 4, background: '#38bdf815', fontSize: 11, fontWeight: 700, color: '#38bdf8' }}>
                                #{cv.nuclearHex.crossKey}
                              </div>
                              <div style={{ fontSize: 10, color: P.textDim }}>Surface {cv.nuclearHex.mainTier} → Profondeur {cv.nuclearHex.nuclearTier}</div>
                            </div>
                            <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.7, marginBottom: 6 }}>
                              Ce que le Yi King montre en surface ({cv.nuclearHex.mainTier}-tier) cache une dynamique {cv.nuclearHex.nuclearTier}-tier ({cv.nuclearHex.nuclearName}) en profondeur.
                            </div>
                            <div style={{ padding: '8px 10px', borderRadius: 6, background: '#38bdf80c', border: '1px solid #38bdf820' }}>
                              <div style={{ fontSize: 8, color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Dynamique cachée</div>
                              <div style={{ fontSize: 12, color: '#38bdf8', fontWeight: 600, marginTop: 3, lineHeight: 1.5 }}>
                                {cv.nuclearHex.mainTier === cv.nuclearHex.nuclearTier ? 'Alignement total — ce que tu vois est ce que tu es.' :
                                 cv.nuclearHex.points > 0 ? 'Fondations solides — la profondeur soutient la surface.' :
                                 cv.nuclearHex.points < 0 ? 'Vigilance — des tensions sous-jacentes demandent attention.' :
                                 'Stabilité neutre — pas de dissonance majeure.'}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          )}
          </div>

          {/* ═══ 12. BRIEF + FEEDBACK ═══ */}
          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <button onClick={handleBrief} style={{
              padding: '10px 24px',
              background: copied ? `${P.green}18` : P.surface,
              border: `1px solid ${copied ? P.green + '44' : P.cardBdr}`,
              borderRadius: 8, cursor: 'pointer',
              color: copied ? P.green : P.gold,
              fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
              letterSpacing: 0.5,
              transition: 'all 0.3s ease'
            }}>
              {copied ? '✔ Brief copié !' : '📋 Copier mon Brief du Jour'}
            </button>
            <div style={{ fontSize: 10, color: P.textDim, marginTop: 6 }}>
              À partager par email ou message
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            {/* ── Calibration Firebase — T6 (déverrouillé quand Firestore actif) ── */}
            {(cv as any).calibration && (cv as any).calibration.recentVotes >= 3 && (
              <div style={{
                marginBottom: 12, padding: '10px 14px',
                background: (cv as any).calibration.accuracy >= 70 ? '#4ade800a' : '#D4AF370a',
                borderRadius: 8,
                border: `1px solid ${(cv as any).calibration.accuracy >= 70 ? '#4ade8025' : '#D4AF3725'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 14 }}>{(cv as any).calibration.accuracy >= 80 ? '🎯' : (cv as any).calibration.accuracy >= 60 ? '📊' : '🔄'}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: (cv as any).calibration.accuracy >= 70 ? '#4ade80' : '#D4AF37' }}>
                    Précision perçue : {(cv as any).calibration.accuracy}%
                  </span>
                  <span style={{ fontSize: 10, color: P.textDim, marginLeft: 'auto' }}>
                    {(cv as any).calibration.recentVotes} votes / 30j
                  </span>
                </div>
                <div style={{ fontSize: 11, color: P.textDim, lineHeight: 1.4 }}>
                  {(cv as any).calibration.accuracy >= 80
                    ? 'L\'Oracle est bien calibré à votre profil — continuez à voter !'
                    : (cv as any).calibration.accuracy >= 60
                    ? 'Calibration en cours — chaque vote améliore la précision.'
                    : 'Vos retours ajustent le scoring — le système apprend de vous.'
                  }
                  {(cv as any).calibration.globalOffset !== 0 && (
                    <span style={{ color: P.textDim }}> (calibration : {(cv as any).calibration.globalOffset > 0 ? '+' : ''}{(cv as any).calibration.globalOffset})</span>
                  )}
                </div>
              </div>
            )}

            <FeedbackWidget
              date={new Date().toISOString().slice(0, 10)}
              score={cv.score}
              dayType={dt.type}
              breakdown={cv.breakdown?.map(b => ({ system: b.system, points: b.points }))}
            />
          </div>
        </Cd>
      </Sec>
    </div>
  );
}
