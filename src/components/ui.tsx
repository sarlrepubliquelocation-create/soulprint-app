import React from 'react';
import { getNumberInfo, isMaster } from '../engines/numerology';

// === ORB (number visualization) ===
export function Orb({ v, sz = 64, lb, sub, gl }: { v: number; sz?: number; lb?: string; sub?: string; gl?: boolean }) {
  const i = getNumberInfo(v);
  const im = isMaster(v);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{
        width: sz, height: sz, borderRadius: '50%',
        background: `radial-gradient(circle at 35% 35%,${i.c}44,${i.c}08)`,
        border: `2px solid ${i.c}${im ? 'cc' : '55'}`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        boxShadow: gl ? `0 0 24px ${i.c}44` : `0 0 10px ${i.c}15`,
        position: 'relative'
      }}>
        {im && <div style={{ position: 'absolute', top: -8, fontSize: 8, color: i.c, letterSpacing: 3 }}>MAÎTRE</div>}
        <span style={{ fontSize: sz * .44, fontWeight: 700, color: i.c }}>{v}</span>
        <span style={{ fontSize: sz * .15, color: i.c + '88', marginTop: -2 }}>{i.s}</span>
      </div>
      {lb && <span style={{ fontSize: 9, color: '#9890aa', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 1.5 }}>{lb}</span>}
      {sub && <span style={{ fontSize: 10, color: i.c + 'cc', maxWidth: 90, textAlign: 'center', fontWeight: 600 }}>{sub}</span>}
    </div>
  );
}

// === SECTION HEADER ===
export function Sec({ children, icon, title }: { children: React.ReactNode; icon: string; title: string }) {
  return (
    <div style={{ marginTop: 24 }} className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: '#e8e0f0', letterSpacing: 2, textTransform: 'uppercase', margin: 0 }}>{title}</h2>
        <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg,#3a3060,transparent)' }} />
      </div>
      {children}
    </div>
  );
}

// === CARD ===
export function Cd({ children, sx }: { children: React.ReactNode; sx?: React.CSSProperties }) {
  return (
    <div style={{ background: '#0f0d1a', borderRadius: 12, padding: 16, border: '1px solid #1e1a30', ...sx }}>
      {children}
    </div>
  );
}
