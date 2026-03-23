import React from 'react';
import { getNumberInfo, isMaster } from '../engines/numerology';

// === COLOR PALETTE ===
export const P = {
  bg:       '#09090b',
  card:     '#111113',
  cardBdr:  '#1f1f23',
  surface:  '#18181b',
  gold:     '#D4AF37',
  goldDim:  '#A08828',
  goldGlow: '#D4AF3744',
  text:     '#e4e4e7',
  textMid:  '#a1a1aa',
  textDim:  '#8B8B94',  // was #71717a — WCAG AA fix (ratio ~4.5:1 sur #09090b, distinct de textMid)
  green:    '#4ade80',
  orange:   '#f97316',
  red:      '#ef4444',
  blue:     '#60a5fa',
  purple:   '#a78bfa',   // Nœuds lunaires, vibration âme
  cosmic:   '#E0B0FF',   // Jours Cosmiques (label couleur)
  amber:    '#fbbf24',   // Réaction instinctive, avertissements doux
};

// === TYPOGRAPHY SCALE ===
// Convention fontSize pour cohérence visuelle :
//   T.xs=9  — micro-notes, metadata
//   T.sm=10 — labels uppercase, sous-titres techniques
//   T.md=11 — texte secondaire, badges
//   T.base=12 — texte courant, descriptions
//   T.lg=13 — titres de carte, valeurs importantes
//   T.xl=15 — titres de section (Sec)
//   T.xxl=22 — scores principaux
//   T.hero=36 — score hero (ConvergenceTab)
export const T = {
  xs: 9, sm: 10, md: 11, base: 12, lg: 13, xl: 15, xxl: 22, hero: 36,
};

// === SHARED STATES ===
export function EmptyState({ icon = '📭', message = 'Aucune donnée disponible' }: { icon?: string; message?: string }) {
  return (
    <div style={{ padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: T.base, color: P.textDim }}>{message}</div>
    </div>
  );
}
export function ErrorState({ message }: { message: string }) {
  return (
    <div style={{ padding: 16, borderRadius: 8, background: '#ef444410', border: '1px solid #ef444425', textAlign: 'center' }}>
      <div style={{ fontSize: T.base, color: '#ef4444' }}>⚠ {message}</div>
    </div>
  );
}
export function LoadingState({ text = 'Chargement...' }: { text?: string }) {
  return (
    <div style={{ padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 20, marginBottom: 8, animation: 'pulse 1.5s infinite' }}>✦</div>
      <div style={{ fontSize: T.md, color: P.textDim }}>{text}</div>
    </div>
  );
}

// === ORB (number visualization) ===
export function Orb({ v, sz = 64, lb, sub, gl }: { v: number; sz?: number; lb?: string; sub?: string; gl?: boolean }) {
  const i = getNumberInfo(v);
  const im = isMaster(v);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
      <div style={{
        width: sz, height: sz, borderRadius: '50%',
        background: `radial-gradient(circle at 35% 35%,${i.c}33,${i.c}08)`,
        border: `2px solid ${i.c}${im ? 'bb' : '44'}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        boxShadow: gl ? `0 0 20px ${i.c}33` : `0 0 8px ${i.c}10`,
        position: 'relative'
      }}>
        {im && <div style={{ position: 'absolute', top: -14, fontSize: 8, fontWeight: 800, color: '#1a1a2e', letterSpacing: 1.5, background: `linear-gradient(135deg, ${P.gold}, #f5c842)`, padding: '1px 8px', borderRadius: 10, boxShadow: `0 2px 8px ${P.gold}44`, textTransform: 'uppercase' }}>Maître</div>}
        <span style={{ fontSize: sz * .42, fontWeight: 700, color: i.c }}>{v}</span>
        <span style={{ fontSize: sz * .16, color: i.c + '88', marginTop: -2 }}>{i.s}</span>
      </div>
      {lb && <span style={{ fontSize: 11, color: P.textDim, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.5 }}>{lb}</span>}
      {sub && <span style={{ fontSize: 12, color: i.c + 'cc', maxWidth: 100, textAlign: 'center', fontWeight: 600 }}>{sub}</span>}
    </div>
  );
}

// === SECTION HEADER ===
export function Sec({ children, icon, title }: { children: React.ReactNode; icon: string; title: string }) {
  return (
    <div style={{ marginTop: 28 }} className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: P.text, letterSpacing: 2, textTransform: 'uppercase', margin: 0 }}>{title}</h2>
        <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg,${P.cardBdr},transparent)` }} />
      </div>
      {children}
    </div>
  );
}

// === CARD ===
export function Cd({ children, sx }: { children: React.ReactNode; sx?: React.CSSProperties }) {
  return (
    <div style={{ background: P.card, borderRadius: 12, padding: 18, border: `1px solid ${P.cardBdr}`, ...sx }}>
      {children}
    </div>
  );
}

// === SECTION GROUP (collapsible) — R27 ===
export function SectionGroup({ icon, title, defaultOpen = true, count, children }: {
  icon: string; title: string; defaultOpen?: boolean; count?: number; children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div style={{ marginTop: 28 }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
          padding: '10px 0',
        }}
      >
        <span style={{ fontSize: 20 }}>{icon}</span>
        <h2 style={{
          fontSize: 16, fontWeight: 800, color: P.gold, letterSpacing: 1.5,
          textTransform: 'uppercase', margin: 0, flex: 1,
        }}>{title}</h2>
        {count !== undefined && count > 0 && (
          <span style={{ fontSize: 10, color: P.gold, background: P.gold + '18', padding: '2px 8px', borderRadius: 10, fontWeight: 600 }}>
            {count}
          </span>
        )}
        <span style={{ fontSize: 13, color: P.textDim, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
      </div>
      <div style={{ height: 1, background: `linear-gradient(90deg,${P.gold}40,transparent)`, marginBottom: 4 }} />
      {open && children}
      {!open && (
        <div
          onClick={() => setOpen(true)}
          style={{ padding: '12px 0', fontSize: 12, color: P.textDim, textAlign: 'center', cursor: 'pointer' }}
        >
          Appuie pour voir cette section
        </div>
      )}
    </div>
  );
}
