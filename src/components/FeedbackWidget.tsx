// ═══ FEEDBACK WIDGET V5.1 ═══
// V5.1 : UI 5 étoiles (UX universelle) · storage -1/0/+1 inchangé
//        1-2★ → -1 (difficile) · 3★ → 0 (neutre) · 4-5★ → +1 (positif)
// V5.0 : Migration 3 boutons (-1/0/+1) Firestore via submitFeedback() (useSyncDailyVector)
//        Dépréciation étoiles 1-5 localStorage (validation-tracker.ts)
//        Rétrocompat : stats localStorage affichées si disponibles pendant la migration
// V4.4 : Onboarding messages, flatline alert, shadow testing
// V4.3 : Étoiles 1-5 + Spearman

import { useState, useEffect, useCallback } from 'react';
import { submitFeedback } from '../engines/useSyncDailyVector';
import { getDayFeedback, getValidationStats, type ValidationStats, saveBreakdownForDate } from '../engines/validation-tracker';
import { getOnboardingMessage, getFlatlineAlert, loadPersonalWeights } from '../engines/personalization';
import { P } from './ui';

interface FeedbackWidgetProps {
  date: string;          // YYYY-MM-DD
  score: number;         // Score Kaironaute du jour (blendé)
  dayType: string;       // Type de jour (label)
  breakdown?: Array<{ system: string; points: number }>; // pour personnalisation
  shadowScore?: number;  // Y2 shadow — score moteur Cœur Unifié candidat [0-100]
}

type Note = -1 | 0 | 1;

// Conversion étoiles (UI) ↔ note interne (storage)
function starToNote(s: number): Note {
  if (s <= 2) return -1;
  if (s === 3) return 0;
  return 1;
}
function noteToStar(n: Note): number {
  if (n === -1) return 1;
  if (n === 0)  return 3;
  return 5;
}

export default function FeedbackWidget({ date, score, dayType, breakdown, shadowScore }: FeedbackWidgetProps) {
  const [note, setNote]             = useState<Note | null>(null);
  const [stars, setStars]           = useState<number | null>(null);
  const [hoverStar, setHoverStar]   = useState<number>(0);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [stats, setStats]           = useState<ValidationStats | null>(null);
  const [onboardMsg, setOnboardMsg] = useState<string | null>(null);
  const [flatlineMsg, setFlatlineMsg] = useState<string | null>(null);

  useEffect(() => {
    // Rétrocompat : lire le feedback localStorage si existant, convertir étoiles → note
    const existing = getDayFeedback(date);
    if (existing) {
      const s = existing.userScore ?? (existing.userRating === 'good' ? 4 : existing.userRating === 'bad' ? 2 : 3);
      const n: Note = s >= 4 ? 1 : s <= 2 ? -1 : 0;
      setNote(n);
      setStars(noteToStar(n));
      setSaved(true);
    } else {
      setNote(null);
      setSaved(false);
    }

    if (breakdown && breakdown.length > 0) saveBreakdownForDate(date, breakdown);

    const s = getValidationStats();
    setStats(s);
    const weights = loadPersonalWeights();
    setOnboardMsg(getOnboardingMessage(s.totalFeedbacks, weights));
    const feedbacks = JSON.parse(localStorage.getItem('sp_validation_feedback') || '[]');
    setFlatlineMsg(getFlatlineAlert(feedbacks));
  }, [date]);

  const handleStar = useCallback(async (s: number) => {
    if (saving) return;
    const n = starToNote(s);
    setStars(s);
    setNote(n);
    setSaving(true);
    try {
      await submitFeedback(date, n);
      setSaved(true);
      const st = getValidationStats();
      setStats(st);
      const weights = loadPersonalWeights();
      setOnboardMsg(getOnboardingMessage(st.totalFeedbacks, weights));
    } catch {
      setSaved(true); // optimiste — submitFeedback fail silently
    } finally {
      setSaving(false);
    }
  }, [date, saving]);

  return (
    <div style={{ marginTop: 14 }}>

      <div style={{ fontSize: 11, color: P.textDim, marginBottom: 8, fontWeight: 600, letterSpacing: 1 }}>
        COMMENT S'EST PASSÉE TA JOURNÉE ?
      </div>

      {/* 5 étoiles */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 6 }}>
        {[1, 2, 3, 4, 5].map(s => {
          const filled = hoverStar > 0 ? s <= hoverStar : (stars !== null && s <= stars);
          const starColor = filled ? '#facc15' : P.textDim;
          return (
            <button
              key={s}
              onClick={() => handleStar(s)}
              onMouseEnter={() => !saving && setHoverStar(s)}
              onMouseLeave={() => setHoverStar(0)}
              disabled={saving}
              style={{
                background: 'none', border: 'none',
                cursor: saving ? 'wait' : 'pointer',
                padding: '2px 4px', fontSize: 30,
                color: starColor,
                transition: 'color 0.1s ease',
                opacity: saving ? 0.5 : 1,
                fontFamily: 'inherit', lineHeight: 1,
              }}
            >
              {filled ? '★' : '☆'}
            </button>
          );
        })}

        {saved && (
          <span style={{ fontSize: 11, color: '#4ade80', marginLeft: 6, fontWeight: 600, whiteSpace: 'nowrap' }}>
            ✔ Noté
          </span>
        )}
      </div>

      {/* Stats localStorage (rétrocompat, pendant migration vers Firestore) */}
      {stats && stats.totalFeedbacks >= 3 && (
        <div style={{
          padding: '10px 14px', borderRadius: 10, marginTop: 4,
          background: stats.concordanceRate >= 70 ? '#4ade8010' : stats.concordanceRate >= 50 ? `${P.gold}10` : '#ef444410',
          border: `1px solid ${stats.concordanceRate >= 70 ? '#4ade8025' : stats.concordanceRate >= 50 ? `${P.gold}25` : '#ef444425'}`,
          fontSize: 11, color: P.textMid, lineHeight: 1.6,
        }}>
          {stats.spearman && stats.spearman.n >= 10 ? (
            <div style={{ fontWeight: 700, marginBottom: 4, color: P.text }}>
              {stats.spearman.icon} Précision : {stats.spearman.precision}% — {stats.spearman.label}
              <span style={{ fontWeight: 400, fontSize: 10, color: P.textDim, marginLeft: 6 }}>
                ({stats.spearman.n} jours{stats.spearman.significant ? ' · ✓ fiable' : ''})
              </span>
            </div>
          ) : (
            <div style={{ fontWeight: 700, marginBottom: 4, color: P.text }}>
              🎯 Concordance : {stats.concordanceRate}% — {stats.label}
            </div>
          )}
          <div>
            {stats.totalFeedbacks} jours notés
            {stats.streak >= 3 && ` · 🔥 ${stats.streak}j consécutifs`}
            {stats.last7Days > 0 && ` · 7j: ${stats.last7Days}%`}
          </div>
          {stats.spearman && stats.spearman.n > 0 && stats.spearman.n < 10 && (
            <div style={{ marginTop: 4, fontSize: 10, color: P.textDim }}>
              📊 Encore {10 - stats.spearman.n} notation{10 - stats.spearman.n > 1 ? 's' : ''} pour mesurer la précision
            </div>
          )}
          {stats.insights.length > 0 && (
            <div style={{ marginTop: 4, fontSize: 10, color: P.textDim, fontStyle: 'italic' }}>
              {stats.insights[0]}
            </div>
          )}
        </div>
      )}

      {stats && stats.totalFeedbacks > 0 && stats.totalFeedbacks < 3 && (
        <div style={{ fontSize: 10, color: P.textDim, fontStyle: 'italic', marginTop: 4 }}>
          Encore {3 - stats.totalFeedbacks} jour{3 - stats.totalFeedbacks > 1 ? 's' : ''} pour les premières stats…
        </div>
      )}

      {onboardMsg && saved && (
        <div style={{
          marginTop: 10, padding: '10px 14px', borderRadius: 10,
          background: '#a78bfa0c', border: '1px solid #a78bfa25',
          fontSize: 12, color: '#c4b5fd', lineHeight: 1.6, fontWeight: 500,
        }}>
          {onboardMsg}
        </div>
      )}

      {flatlineMsg && (
        <div style={{
          marginTop: 10, padding: '10px 14px', borderRadius: 10,
          background: '#f59e0b08', border: '1px solid #f59e0b20',
          fontSize: 11, color: '#fbbf24', lineHeight: 1.6,
        }}>
          ⚡ {flatlineMsg}
        </div>
      )}

      {stats?.shadow && stats.shadow.n >= 15 && (
        <div style={{
          marginTop: 10, padding: '8px 12px', borderRadius: 8,
          background: stats.shadow.personalizationWins ? '#4ade800a' : '#60a5fa0a',
          border: `1px solid ${stats.shadow.personalizationWins ? '#4ade8020' : '#60a5fa20'}`,
          fontSize: 10, color: P.textDim, lineHeight: 1.5,
        }}>
          {stats.shadow.personalizationWins ? '🧬' : '📊'} {stats.shadow.label}
          <span style={{ marginLeft: 6, fontSize: 9, opacity: 0.7 }}>({stats.shadow.n} jours comparés)</span>
        </div>
      )}

      {/* Y2 shadow — comparaison moteur candidat Cœur Unifié (discret, pour calibration) */}
      {shadowScore !== undefined && (
        <div style={{
          marginTop: 8, padding: '6px 10px', borderRadius: 7,
          background: '#a78bfa08', border: '1px solid #a78bfa18',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 10, color: P.textDim,
        }}>
          <span>🧪 Moteur Cœur (candidat)</span>
          <span style={{
            fontWeight: 700,
            color: Math.abs(shadowScore - score) <= 5
              ? '#4ade80aa'
              : Math.abs(shadowScore - score) <= 12
              ? '#f59e0baa'
              : '#ef4444aa',
          }}>
            {shadowScore}%
            {Math.abs(shadowScore - score) > 0 && (
              <span style={{ fontWeight: 400, marginLeft: 4, opacity: 0.6 }}>
                ({shadowScore > score ? '+' : ''}{shadowScore - score})
              </span>
            )}
          </span>
        </div>
      )}

    </div>
  );
}
