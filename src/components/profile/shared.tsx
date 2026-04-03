import { P } from '../ui';

/* ── style helpers ── */
export const intro: React.CSSProperties = {
  fontSize: 12, color: P.textDim, lineHeight: 1.7, marginBottom: 14, fontStyle: 'italic'
};

export const gold12: React.CSSProperties = {
  fontSize: 12, color: P.gold, lineHeight: 1.6
};

/* ── Badge Component ── */
export const Badge = ({ type }: { type: 'fixe' | 'cycle' | 'decennal' }) => {
  const cfg = {
    fixe:     { bg: '#60a5fa15', color: '#60a5fa', icon: '⚓', text: 'ANCRÉ — énergie de fond permanente' },
    cycle:    { bg: '#f59e0b15', color: '#f59e0b', icon: '🔄', text: 'CYCLE — change chaque année/mois/jour' },
    decennal: { bg: '#c084fc15', color: '#c084fc', icon: '📍', text: 'DÉCENNAL — change tous les 10 ans' },
  }[type];
  return <span style={{ background: cfg.bg, color: cfg.color, padding: '2px 8px', borderRadius: 4, fontWeight: 600, fontSize: 9, marginLeft: 6, whiteSpace: 'nowrap' }}>{cfg.icon} {cfg.text}</span>;
};
