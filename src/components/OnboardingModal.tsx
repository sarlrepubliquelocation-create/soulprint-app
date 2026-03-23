// ═══ ONBOARDING MODAL — V9 Sprint 7c ═══
// 3 écrans d'introduction au 1er lancement
// Storage : localStorage 'kaironaute_onboarding_done' → jamais re-montré
// Protocole : zéro régression App.tsx — composant autonome
import { useState } from 'react';
import { P } from './ui';

const LS_KEY = 'kaironaute_onboarding_done';

export function isOnboardingDone(): boolean {
  try { return !!localStorage.getItem(LS_KEY); } catch { return false; }
}

export function markOnboardingDone(): void {
  try { localStorage.setItem(LS_KEY, '1'); } catch { /* silent */ }
}

interface Props {
  onClose: () => void;
}

const STEPS = [
  {
    icon: '✦',
    title: 'Bienvenue dans Kaironaute',
    subtitle: 'Maîtrise tes cycles. Optimise tes décisions.',
    body: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ textAlign: 'center', margin: '8px 0' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 80, height: 80, borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,215,0,0.05))',
            border: '2px solid rgba(255,215,0,0.35)',
            fontSize: 36,
          }}>72</div>
          <div style={{ fontSize: 11, color: 'rgba(255,215,0,0.7)', marginTop: 6, letterSpacing: 1.5, fontWeight: 600 }}>TON SCORE DU JOUR</div>
        </div>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, margin: 0, textAlign: 'center' }}>
          Kaironaute calcule chaque jour un score personnalisé basé sur tes cycles astrologiques, numériques et cosmiques.
        </p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, margin: 0, textAlign: 'center', fontStyle: 'italic' }}>
          Pas une prédiction — un miroir de tes rythmes intérieurs.
        </p>
      </div>
    ),
  },
  {
    icon: '🔮',
    title: '5 traditions, 1 outil',
    subtitle: 'Une convergence inédite de systèmes millénaires',
    body: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { icon: '⭐', label: 'Astrologie occidentale', detail: 'Transits, Dasha (astrologie indienne), Retours solaires' },
          { icon: '🀄', label: 'BaZi & Zodiaque chinois', detail: '4 Piliers du Destin, 12 Officers, NaYin' },
          { icon: '☯️', label: 'Yi King', detail: '64 hexagrammes, Mei Hua, Tirage conscient' },
          { icon: '🔢', label: 'Numérologie Pythagoricienne', detail: 'Chemin de vie, Pinnacles, Inclusion' },
          { icon: '🃏', label: 'Tarot des Arcanes Majeurs', detail: 'Miroir archétypal jungien — pas oracle' },
        ].map(({ icon, label, detail }) => (
          <div key={label} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '10px 12px', borderRadius: 10,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <span style={{ fontSize: 20, width: 28, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{label}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{detail}</div>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: '🚀',
    title: 'Activez ton profil complet',
    subtitle: 'Tes données restent sur ton appareil — jamais partagées',
    body: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, margin: 0, textAlign: 'center' }}>
          Pour un score précis, renseigne ton <strong style={{ color: P.gold }}>prénom, nom de naissance</strong> et <strong style={{ color: P.gold }}>date de naissance</strong>.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { icon: '🔓', text: 'Chemin de vie + Pinnacles' },
            { icon: '🔓', text: 'Carte Natale Tarot' },
            { icon: '🔓', text: 'ADN Numérologique complet' },
            { icon: '🔓', text: 'Portrait Astral par IA' },
          ].map(({ icon, text }) => (
            <div key={text} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              fontSize: 13, color: 'rgba(255,255,255,0.65)',
            }}>
              <span>{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6, margin: 0, textAlign: 'center', fontStyle: 'italic' }}>
          Heure et lieu de naissance optionnels — améliorent la précision astrologique.
        </p>
      </div>
    ),
  },
];

export default function OnboardingModal({ onClose }: Props) {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const s = STEPS[step];

  const handleNext = () => {
    if (isLast) {
      markOnboardingDone();
      onClose();
    } else {
      setStep(prev => prev + 1);
    }
  };

  const handleSkip = () => {
    markOnboardingDone();
    onClose();
  };

  return (
    /* Overlay */
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px 16px',
    }}>
      {/* Modal */}
      <div style={{
        width: '100%', maxWidth: 420,
        background: 'linear-gradient(160deg, #13131f 0%, #1a1535 100%)',
        border: '1px solid rgba(255,215,0,0.2)',
        borderRadius: 20, padding: '28px 24px 24px',
        position: 'relative',
      }}>
        {/* Skip */}
        <button onClick={handleSkip} style={{
          position: 'absolute', top: 14, right: 16,
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: 1,
          padding: '4px 8px',
        }}>PASSER</button>

        {/* Progression dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 24 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 20 : 6, height: 6,
              borderRadius: 3, transition: 'all 0.3s ease',
              background: i === step ? P.gold : 'rgba(255,255,255,0.15)',
            }} />
          ))}
        </div>

        {/* Icon */}
        <div style={{ textAlign: 'center', fontSize: 36, marginBottom: 12 }}>{s.icon}</div>

        {/* Title */}
        <div style={{
          textAlign: 'center', fontSize: 20, fontWeight: 700, marginBottom: 6,
          background: `linear-gradient(135deg, #e4e4e7, ${P.gold})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>{s.title}</div>

        {/* Subtitle */}
        <div style={{
          textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.4)',
          letterSpacing: 0.5, marginBottom: 22, fontStyle: 'italic',
        }}>{s.subtitle}</div>

        {/* Body */}
        <div style={{ marginBottom: 28 }}>{s.body}</div>

        {/* CTA */}
        <button onClick={handleNext} style={{
          width: '100%', padding: '14px 0', borderRadius: 12,
          background: 'linear-gradient(135deg, #B8860B, #FFD700, #B8860B)',
          border: 'none', cursor: 'pointer',
          fontSize: 15, fontWeight: 700, color: '#0d0d1a',
          letterSpacing: 0.5,
        }}>
          {isLast ? '✦ Commencer' : 'Suivant →'}
        </button>
      </div>
    </div>
  );
}
