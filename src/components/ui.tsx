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
  textDim:  '#71717a',
  green:    '#4ade80',
  orange:   '#f97316',
  red:      '#ef4444',
  blue:     '#60a5fa',
};

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
        {im && <div style={{ position: 'absolute', top: -9, fontSize: 9, fontWeight: 700, color: P.gold, letterSpacing: 3 }}>MAÎTRE</div>}
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
