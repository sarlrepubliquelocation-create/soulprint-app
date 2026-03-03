// ═══ FEEDBACK WIDGET V5.0 ═══
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
  date: string;       // YYYY-MM-DD
  score: number;      // Score Kaironaute du jour (blendé)
  dayType: string;    // Type de jour (label)
  breakdown?: Array<{ system: string; points: number }>; // pour personnalisation
}

type Note = -1 | 0 | 1;

const NOTE_CONFIG: { note: Note; icon: string; label: string; color: string }[] = [
  { note: -1, icon: '✕', label: 'Difficile', color: '#ef4444' },
  { note:  0, icon: '~', label: 'Neutre',    color: '#a1a1aa' },
  { note:  1, icon: '✦', label: 'Ressenti',  color: '#4ade80' },
];

export default function FeedbackWidget({ date, score, dayType, breakdown }: FeedbackWidgetProps) {
  const [note, setNote]             = useState<Note | null>(null);
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [stats, setStats]           = useState<ValidationStats | null>(null);
  const [onboardMsg, setOnboardMsg] = useState<string | null>(null);
  const [flatlineMsg, setFlatlineMsg] = useState<string | null>(null);

  useEffect(() => {
    // Rétrocompat : lire le feedback localStorage si existant, convertir étoiles → note
    const existing = getDayFeedback(date);
    if (existing) {
      const stars = existing.userScore ?? (existing.userRating === 'good' ? 4 : existing.userRating === 'bad' ? 2 : 3);
      setNote(stars >= 4 ? 1 : stars <= 2 ? -1 : 0);
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

  const handleNote = useCallback(async (n: Note) => {
    if (saving) return;
    setNote(n);
    setSaving(true);
    try {
      await submitFeedback(date, n);
      setSaved(true);
      const s = getValidationStats();
      setStats(s);
      const weights = loadPersonalWeights();
      setOnboardMsg(getOnboardingMessage(s.totalFeedbacks, weights));
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

      {/* 3 boutons -1 / 0 / +1 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        {NOTE_CONFIG.map(({ note: n, icon, label, color }) => {
          const active = note === n;
          return (
            <button
              key={n}
              onClick={() => handleNote(n)}
              disabled={saving}
              style={{
                flex: 1, padding: '9px 0', borderRadius: 8,
                border: `1.5px solid ${active ? color + 'cc' : P.cardBdr}`,
                background: active ? color + '18' : P.surface,
                cursor: saving ? 'wait' : 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                transition: 'all 0.15s ease',
                opacity: saving ? 0.6 : 1,
                fontFamily: 'inherit',
              }}
            >
              <span style={{ fontSize: 20, color: active ? color : P.textDim }}>{icon}</span>
              <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: 0.8, textTransform: 'uppercase', color: active ? color : P.textDim }}>
                {label}
              </span>
            </button>
          );
        })}

        {saved && (
          <span style={{ fontSize: 11, color: '#4ade80', marginLeft: 4, fontWeight: 600, whiteSpace: 'nowrap' }}>
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

    </div>
  );
}
