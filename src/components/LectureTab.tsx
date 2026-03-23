import { useState, useMemo, useEffect, useRef } from 'react';
import { type SoulData } from '../App';
import { generateStrategicReading, type StrategicReading, type ReadingInsight, type Crossing, type ActionItem, type Contradiction, type MicroDetail } from '../engines/strategic-reading';
import { getCalibOffset } from '../engines/calibration';
import { Cd, P } from './ui';

interface Props {
  data: SoulData;
  bd: string;
  narr: string;
  narrLoad: boolean;
  genNarr: () => void;
}

// ── V5.4: Micro-validation "ça me parle" (Point 4) ──
interface ResonanceEntry {
  date: string;
  category: 'micro-detail' | 'undercurrent' | 'contradiction';
  snippet: string;       // Extrait de texte (~60 chars) pour identifier l'insight
  sources: string[];     // Systèmes impliqués (ex: ['Numérologie', 'I Ching'])
}

const RESONANCE_KEY = 'k_resonance_log';
const MAX_RESONANCE_ENTRIES = 200;

function logResonance(entry: Omit<ResonanceEntry, 'date'>) {
  try {
    const stored = localStorage.getItem(RESONANCE_KEY);
    const log: ResonanceEntry[] = stored ? JSON.parse(stored) : [];
    log.push({ ...entry, date: (() => { const _d = new Date(); return `${_d.getFullYear()}-${String(_d.getMonth()+1).padStart(2,'0')}-${String(_d.getDate()).padStart(2,'0')}`; })() });
    localStorage.setItem(RESONANCE_KEY, JSON.stringify(log.slice(-MAX_RESONANCE_ENTRIES)));
    // V5.5 fix: notifier ResonanceNarrative pour recalcul
    window.dispatchEvent(new Event('resonance-updated'));
  } catch { /* localStorage indisponible */ }
}

function ResonanceButton({ category, snippet, sources }: {
  category: ResonanceEntry['category'];
  snippet: string;
  sources: string[];
}) {
  const [clicked, setClicked] = useState(false);
  if (clicked) {
    return (
      <span style={{
        fontSize: 10, color: P.gold, fontWeight: 600,
        opacity: 0.9, userSelect: 'none',
      }}>
        ✓ noté
      </span>
    );
  }
  return (
    <button
      onClick={() => {
        logResonance({ category, snippet: snippet.slice(0, 60), sources });
        setClicked(true);
      }}
      style={{
        background: 'none', border: `1px solid ${P.cardBdr}`,
        borderRadius: 6, padding: '2px 8px',
        fontSize: 10, color: P.textDim, cursor: 'pointer',
        fontFamily: 'inherit', transition: 'all 0.2s',
        opacity: 0.7,
      }}
      onMouseOver={e => { e.currentTarget.style.borderColor = P.gold; e.currentTarget.style.color = P.gold; e.currentTarget.style.opacity = '1'; }}
      onMouseOut={e => { e.currentTarget.style.borderColor = P.cardBdr; e.currentTarget.style.color = P.textDim; e.currentTarget.style.opacity = '0.7'; }}
    >
      ça me parle
    </button>
  );
}

// ── Couleurs par intensité ──
const INTENSITY_STYLE: Record<string, { bg: string; border: string; glow: string }> = {
  forte:   { bg: '#D4A01715', border: '#D4A01735', glow: '0 0 12px #D4A01712' },
  moyenne: { bg: '#60a5fa08', border: '#60a5fa20', glow: 'none' },
  subtile: { bg: '#27272a', border: '#3f3f46', glow: 'none' },
};

// ── Tags techniques → labels user-friendly ──
const TAG_FRIENDLY: Record<string, string> = {
  // ── Numérologie ──
  'Personal Day': 'Jour personnel',
  'Type de Jour': 'Type de jour',
  'Pinnacle actif': 'Phase de vie',
  'Pinnacle (Numérologie)': 'Phase de vie',
  'Pinnacles (Numérologie)': 'Phases de vie',
  'Challenge actif': 'Défi de vie',
  'Nombres maîtres': 'Nombres maîtres',
  'Année personnelle 1': 'Année perso 1',
  'Cycle 1-9': 'Cycle de 9 ans',
  'Lo Shu': 'Grille de naissance',
  'Leçons karmiques': 'Qualités à développer',
  'Transition PY': 'Changement de cycle',
  'Portail annuel': 'Portail annuel',
  'Nombre de Maturité': 'Maturité',
  'Chemin de vie': 'Chemin de vie',
  'Expression': 'Potentiel inné',
  'Essence = CdV': 'Essence = Chemin de vie',
  'Essence = Soul': 'Essence = Désir profond',
  '10 Gods créativité': 'Archétype créatif',
  '10 Gods 食神': 'Archétype Créateur',
  // ── Oracle chinois (Yi King) ──
  'Yi King': 'Yi King',
  'Yi King du jour': 'Yi King',
  'Yi King natal': 'Yi King natal',
  'Hexagramme Nucléaire': 'Courant profond',
  'Ligne mutante': 'Message clé',
  // ── Astrologie chinoise (BaZi) ──
  'BaZi Day Master': 'Énergie du jour',
  'Éléments chinois': 'Éléments',
  'Luck Pillar (BaZi)': 'Cycle de 10 ans',
  'Luck Pillars (BaZi)': 'Cycles de 10 ans',
  'Quatre Piliers (八字)': 'Thème chinois',
  'Hour Pillar (時柱)': 'Pilier horaire',
  '10 Gods 正印': 'Archétype Mentor',
  '10 Gods 比肩': 'Archétype Identité',
  '10 Gods 七殺': 'Archétype Combattant',
  '10 Gods 傷官': 'Archétype Provocateur',
  '10 Gods 正財': 'Archétype Prospérité',
  '10 Gods 偏財': 'Archétype Opportuniste',
  '10 Gods 劫財': 'Archétype Rival',
  '10 Gods 正官': 'Archétype Organisateur',
  'BaZi same element': 'Même élément',
  'BaZi same': 'Même énergie',
  // ── Astrologie occidentale ──
  'Transits astrologiques': 'Transits planétaires',
  'Transits universels': 'Transits planétaires',
  'Phase lunaire': 'Lune',
  'Nœuds Lunaires': 'Direction de vie',
  'Axe karmique': 'Axe de vie',
  'Nœud Sud': 'Acquis passés',
  'Mission karmique': 'Mission de vie',
  'Transit nodal': 'Transit de vie',
  'Transit exact': 'Transit exact',
  'Direction karmique': 'Direction de vie',
  'Rétrogrades': 'Planètes rétrogrades',
  'Aspects lunaires': 'Aspects lunaires',
  'Lune Hors Cours': 'Lune en pause',
  'Éléments natal': 'Thème natal',
  'Lune croissante': 'Lune croissante',
  // ── Score & analyse ──
  'Convergence (14+ systèmes)': 'Score global',
  'Convergence scoring': 'Score global',
  'Confiance temporelle': 'Fiabilité',
  'Cycles longs': 'Cycles longs',
  'Forecast 36 mois': 'Prévision 36 mois',
  'Monte Carlo': 'Simulation statistique',
  'Pattern Detection': 'Schéma détecté',
  'Profil multi-facettes sans dominance unique': 'Profil multi-facettes',
  'Analyse cyclique 20+ ans': 'Analyse des cycles',
  // ── Zodiaque & biorythmes ──
  'Zodiaque chinois V3': 'Zodiaque chinois',
  'Biorhythmes': 'Biorythmes',
  'Biorhythmes triple pic': 'Biorythmes (pic)',
  'Pinnacle = Expression': 'Phase de vie = Potentiel',
};

function friendlyTag(tag: string): string {
  if (TAG_FRIENDLY[tag]) return TAG_FRIENDLY[tag];
  // Tags dynamiques
  if (tag.startsWith('Ligne mutante ')) return tag.replace('Ligne mutante ', 'Message clé ');
  if (tag.startsWith('Leçon karmique ')) return tag.replace('Leçon karmique ', 'Qualité ');
  if (tag.startsWith('Leçon ')) return tag.replace('Leçon ', 'Qualité ');
  if (tag.startsWith('PD ')) return tag.replace('PD ', 'Jour ');
  if (tag.startsWith('PD = CdV')) return 'Jour = Chemin de vie';
  if (tag.startsWith('PY ')) return tag.replace('PY ', 'Année ');
  if (tag.startsWith('CdV ')) return tag.replace('CdV ', 'Chemin ');
  if (tag.startsWith('Challenge ')) return tag.replace('Challenge ', 'Défi ');
  if (tag.startsWith('Luck Pillar')) return tag.replace('Luck Pillar', 'Cycle 10 ans');
  if (tag.startsWith('Transition Pinnacle')) return tag.replace('Transition Pinnacle', 'Changement de phase');
  if (tag.includes('Pinnacle Shift')) return tag.replace('Pinnacle Shift', 'Changement de phase');
  if (tag.startsWith('Transit Saturne')) return tag;
  if (tag.startsWith('Pinnacle')) return tag.replace('Pinnacle', 'Phase de vie');
  if (tag.startsWith('10 Gods')) return 'Archétype du jour';
  if (tag === 'Business' || tag === 'BUSINESS') return 'Affaires';
  if (tag.startsWith('Yi King')) return tag;
  if (tag.startsWith('PD maître')) return tag.replace('PD maître', 'Jour maître');
  if (tag.startsWith('AP ')) return tag.replace('AP ', 'Année perso ');
  if (tag.startsWith('Essence ')) return tag.replace('Essence ', 'Énergie ');
  return tag;
}

// ── Composant Insight ──
function InsightCard({ insight }: { insight: ReadingInsight }) {
  const style = INTENSITY_STYLE[insight.intensity] || INTENSITY_STYLE.subtile;
  return (
    <div style={{
      padding: '12px 14px', borderRadius: 10,
      background: style.bg, border: `1px solid ${style.border}`,
      boxShadow: style.glow, marginBottom: 10,
    }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{insight.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: P.text, lineHeight: 1.7, marginBottom: 6 }}>
            {insight.text}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {insight.sources.map((s, i) => (
              <span key={i} style={{
                fontSize: 9, padding: '2px 7px', borderRadius: 4,
                background: insight.intensity === 'forte' ? '#D4A01718' : '#27272a',
                color: insight.intensity === 'forte' ? P.gold : P.textDim,
                fontWeight: 600, letterSpacing: 0.5,
              }}>{friendlyTag(s)}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Composant Convergence ──
function CrossingCard({ crossing }: { crossing: Crossing }) {
  const barWidth = Math.min(100, (crossing.strength / 8) * 100);
  return (
    <div style={{
      padding: '12px 14px', borderRadius: 10,
      background: crossing.strength >= 5 ? '#D4A01712' : '#60a5fa08',
      border: `1px solid ${crossing.strength >= 5 ? '#D4A01730' : '#60a5fa18'}`,
      marginBottom: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 22 }}>{crossing.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: P.text }}>{crossing.theme}</span>
            <span style={{
              fontSize: 10, padding: '2px 8px', borderRadius: 10,
              background: crossing.strength >= 5 ? P.gold : '#60a5fa',
              color: '#09090b', fontWeight: 700,
            }}>{crossing.strength} systèmes</span>
          </div>
        </div>
      </div>
      {/* Barre de force */}
      <div style={{ height: 4, background: '#27272a', borderRadius: 2, marginBottom: 8, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 2,
          background: crossing.strength >= 5
            ? `linear-gradient(90deg, ${P.gold}88, ${P.gold})`
            : `linear-gradient(90deg, #60a5fa66, #60a5fa)`,
          width: `${barWidth}%`,
          transition: 'width 0.5s ease',
        }} />
      </div>
      <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.6 }}>
        {crossing.description}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 6 }}>
        {crossing.systems.map((s, i) => (
          <span key={i} style={{
            fontSize: 9, padding: '2px 6px', borderRadius: 3,
            background: '#27272a', color: P.textDim, fontWeight: 500,
          }}>{friendlyTag(s)}</span>
        ))}
      </div>
    </div>
  );
}

// ── V5.0: Composant Tension du jour (contradiction visible) ──
function TensionCard({ contradiction, idx }: { contradiction: Contradiction; idx: number }) {
  return (
    <div style={{
      padding: '12px 14px', borderRadius: 10,
      background: idx === 0 ? '#D4A01710' : '#60a5fa08',
      border: `1px solid ${idx === 0 ? '#D4A01730' : '#60a5fa18'}`,
      marginBottom: 8,
    }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 18, flexShrink: 0, marginTop: 2 }}>⚡</span>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: idx === 0 ? P.gold : '#60a5fa',
            textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4,
          }}>
            {contradiction.type}
          </div>
          <div style={{ fontSize: 13, color: P.text, lineHeight: 1.7, marginBottom: 6 }}>
            {contradiction.description}
          </div>
          <div style={{
            fontSize: 12, color: P.textMid, lineHeight: 1.6,
            paddingLeft: 10, borderLeft: `2px solid ${idx === 0 ? P.gold : '#60a5fa'}40`,
            fontStyle: 'italic',
          }}>
            {contradiction.conseil}
          </div>
          <div style={{ marginTop: 6, textAlign: 'right' }}>
            <ResonanceButton category="contradiction" snippet={contradiction.description} sources={[contradiction.type]} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── V5.0: Composant Action refondé (Do/Don't/Timing/Why) ──
// V5.5 fix: labels basés sur item.role (sémantique) au lieu de l'index (position)
const ROLE_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  focus:   { icon: '🟢', label: 'FOCUS', color: '#22c55e' },
  avoid:   { icon: '🔴', label: 'À ÉVITER', color: '#ef4444' },
  timing:  { icon: '⏱️', label: 'TIMING', color: '#D4A017' },
  conseil: { icon: '👁️', label: 'CONSEIL', color: '#60a5fa' },
};

function ActionCardV5({ item, idx }: { item: ActionItem; idx: number }) {
  const cfg = ROLE_CONFIG[item.role || ''] || { icon: '📌', label: 'ACTION', color: '#D4A017' };
  const icon = cfg.icon;
  const label = cfg.label;
  const color = cfg.color;

  return (
    <div style={{
      padding: '12px 14px', borderRadius: 10,
      background: `${color}08`,
      border: `1px solid ${color}20`,
      marginBottom: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{
          fontSize: 10, fontWeight: 700, color: color,
          textTransform: 'uppercase', letterSpacing: 1,
        }}>{label}</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: P.text, lineHeight: 1.6, marginBottom: 4, marginLeft: 28 }}>
        {item.action}
      </div>
      <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.6, marginLeft: 28 }}>
        {item.why}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 6, marginLeft: 28 }}>
        {item.sources.map((s, i) => (
          <span key={i} style={{
            fontSize: 9, padding: '2px 6px', borderRadius: 3,
            background: '#27272a', color: P.textDim, fontWeight: 500,
          }}>{friendlyTag(s)}</span>
        ))}
      </div>
    </div>
  );
}

// ── V5.0: Composant Micro-détail (cold reading visible) ──
function MicroDetailCard({ detail }: { detail: MicroDetail }) {
  const reliabilityColor = detail.reliability === 'cycle' ? P.gold
    : detail.reliability === 'resonance' ? '#60a5fa' : P.textDim;
  return (
    <div style={{
      padding: '8px 12px', borderRadius: 8,
      background: '#27272a', border: `1px solid #3f3f46`,
      marginBottom: 6,
    }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>🎯</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: P.text, lineHeight: 1.6 }}>
            {detail.text}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4, alignItems: 'center' }}>
            {detail.sources.map((s, i) => (
              <span key={i} style={{
                fontSize: 9, padding: '2px 6px', borderRadius: 3,
                background: `${reliabilityColor}15`, color: reliabilityColor, fontWeight: 500,
              }}>{friendlyTag(s)}</span>
            ))}
            <span style={{ marginLeft: 'auto' }}>
              <ResonanceButton category="micro-detail" snippet={detail.text} sources={detail.sources} />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Priorité d'affichage des insights ──
const INTENSITY_ORDER: Record<string, number> = { forte: 0, moyenne: 1, subtile: 2 };
const MAX_VISIBLE_PRESENT = 5; // V5.0: Ronde consensus → 3-5 max (was 6)
const MAX_VISIBLE = 6;

// ── Bloc accordéon (Passé / Présent / Futur) avec hiérarchisation ──
function ReadingBlockUI({ block, defaultOpen, maxVisible }: { block: { title: string; period: string; insights: ReadingInsight[]; summary: string }; defaultOpen?: boolean; maxVisible?: number }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const [showAll, setShowAll] = useState(false);
  const limit = maxVisible ?? MAX_VISIBLE;

  // Trier par intensité (forte en premier) et limiter
  const sorted = [...block.insights].sort((a, b) => (INTENSITY_ORDER[a.intensity] ?? 2) - (INTENSITY_ORDER[b.intensity] ?? 2));
  const hasMore = sorted.length > limit;
  const visible = showAll ? sorted : sorted.slice(0, limit);
  const hiddenCount = sorted.length - limit;

  return (
    <div style={{
      marginBottom: 14, borderRadius: 12, overflow: 'hidden',
      border: `1px solid ${P.cardBdr}`, background: P.surface,
    }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          padding: '14px 16px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: open ? `${P.gold}08` : 'transparent',
          transition: 'background 0.2s',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: P.text }}>{block.title}</span>
            <span style={{ fontSize: 10, color: P.textDim, background: '#27272a', padding: '2px 7px', borderRadius: 8, fontWeight: 600 }}>
              {block.insights.length}
            </span>
          </div>
          <div style={{ fontSize: 11, color: P.textDim, marginTop: 2 }}>{block.period}</div>
        </div>
        <span style={{
          fontSize: 18, color: P.textDim,
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
        }}>▾</span>
      </div>
      {open && (
        <div style={{ padding: '4px 14px 14px' }}>
          {visible.map((ins, i) => <InsightCard key={i} insight={ins} />)}
          {hasMore && !showAll && (
            <button
              onClick={() => setShowAll(true)}
              style={{
                width: '100%', padding: '8px', background: '#27272a', border: `1px solid ${P.cardBdr}`,
                borderRadius: 8, color: P.textDim, fontSize: 11, cursor: 'pointer',
                fontFamily: 'inherit', fontWeight: 600, marginBottom: 10,
              }}
            >
              Voir l'analyse complète ({hiddenCount} signal{hiddenCount > 1 ? 'ux' : ''} de plus) ▾
            </button>
          )}
          {hasMore && showAll && (
            <button
              onClick={() => setShowAll(false)}
              style={{
                width: '100%', padding: '8px', background: 'transparent', border: `1px solid ${P.cardBdr}`,
                borderRadius: 8, color: P.textDim, fontSize: 11, cursor: 'pointer',
                fontFamily: 'inherit', fontWeight: 500, marginBottom: 10,
              }}
            >
              Réduire ▴
            </button>
          )}
          <div style={{
            marginTop: 4, padding: '8px 12px', borderRadius: 8,
            background: '#27272a', fontSize: 11, color: P.textDim,
            fontWeight: 500, lineHeight: 1.5,
          }}>
            📌 {block.summary}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Portrait structuré (3 premiers paragraphes visibles, le reste en "Lire la suite") ──
const PORTRAIT_VISIBLE = 3;

// V5.5: Résonance diégétique — formulation narrative des préférences (Ronde #5 — Prop 4)
// Seuil : ≥12 validations. Intégré au portrait, pas en bloc séparé.
function getResonanceNarrative(): string | null {
  try {
    const stored = localStorage.getItem('k_resonance_log');
    if (!stored) return null;
    const log: ResonanceEntry[] = JSON.parse(stored);
    const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
    const recent = log.filter(e => new Date(e.date).getTime() > cutoff);
    if (recent.length < 12) return null; // seuil minimum (Ronde #5 consensus)

    // Top systèmes
    const sysCount: Record<string, number> = {};
    for (const e of recent) {
      for (const s of e.sources) sysCount[s] = (sysCount[s] || 0) + 1;
    }
    const top = Object.entries(sysCount)
      .sort((a, b) => b[1] - a[1])
      .filter(([, c]) => c >= 3)
      .slice(0, 2)
      .map(([s]) => s);

    if (top.length === 0) return null;

    // Formulation diégétique (Gemini : "ne pas briser le 4ème mur")
    const CANAL_LABELS: Record<string, string> = {
      'Numérologie': 'la Numérologie',
      'I Ching': 'le Yi King',
      'Yi King nucléaire': 'le Yi King nucléaire',
      'Transits': 'les Transits planétaires',
      'Pinnacles': 'les Phases de vie',
      'Nakshatras': 'les Nakshatras',
      'BaZi': 'les Quatre Piliers',
      'Astrologie': 'l\'Astrologie',
      'Cycles': 'les Cycles',
    };

    const labels = top.map(s => CANAL_LABELS[s] || s);

    if (labels.length === 1) {
      return `Ton canal d'intuition le plus ouvert en ce moment : ${labels[0]}.`;
    }
    return `Tes canaux d'intuition les plus ouverts en ce moment : ${labels[0]} et ${labels[1]}.`;
  } catch { return null; }
}

function ResonanceNarrative() {
  // V5.5 fix: recalculer quand l'utilisateur clique "ça me parle"
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const handler = () => setTick(t => t + 1);
    window.addEventListener('resonance-updated', handler);
    return () => window.removeEventListener('resonance-updated', handler);
  }, []);
  const narrative = useMemo(() => getResonanceNarrative(), [tick]);
  if (!narrative) return null;
  return (
    <div style={{
      fontSize: 11.5, color: P.textMid, lineHeight: 1.5,
      marginBottom: 10, fontStyle: 'italic', opacity: 0.85,
      paddingLeft: 10, borderLeft: `2px solid ${P.gold}30`,
    }}>
      {narrative}
    </div>
  );
}

function PortraitSection({ text, overlay }: { text: string; overlay: string }) {
  const paragraphs = text.split('\n').filter(p => p.trim().length > 0);
  const [expanded, setExpanded] = useState(false);
  const hasMore = paragraphs.length > PORTRAIT_VISIBLE;
  const visible = expanded ? paragraphs : paragraphs.slice(0, PORTRAIT_VISIBLE);

  return (
    <div style={{
      marginBottom: 20, padding: '12px 16px', borderRadius: 10,
      background: P.surface, border: `1px solid ${P.cardBdr}`,
    }}>
      <div style={{ fontSize: 10, color: P.textDim, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 10 }}>
        Ton profil
      </div>
      {/* V5.0: Bandeau portrait contextualisé au jour */}
      <div style={{
        fontSize: 12, color: P.gold, lineHeight: 1.6,
        padding: '8px 12px', borderRadius: 8,
        background: `${P.gold}08`, border: `1px solid ${P.gold}20`,
        marginBottom: 12, fontWeight: 500, fontStyle: 'italic',
      }}>
        {overlay}
      </div>
      {/* V5.5: Résonance diégétique (Ronde #5 — Prop 4) */}
      <ResonanceNarrative />
      {visible.map((p, i) => (
        <div key={i} style={{
          fontSize: 13, color: P.textMid, lineHeight: 1.7,
          marginBottom: i < visible.length - 1 ? 10 : 0,
          paddingLeft: 10, borderLeft: i === 0 ? `2px solid ${P.gold}40` : `2px solid ${P.cardBdr}`,
        }}>
          {p}
        </div>
      ))}
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            marginTop: 10, padding: '6px 12px', background: 'transparent',
            border: `1px solid ${P.cardBdr}`, borderRadius: 6, color: P.textDim,
            fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500,
          }}
        >
          {expanded ? 'Réduire ▴' : `Lire la suite (${paragraphs.length - PORTRAIT_VISIBLE} de plus) ▾`}
        </button>
      )}
    </div>
  );
}

// ── V5.0 Sprint 3: Effet typewriter (Gemini Ronde — wow factor Dark Luxe) ──
// Affiche le texte caractère par caractère, style terminal haut de gamme.
// Vitesse rapide (15ms) pour ne pas frustrer, mais assez lent pour créer la magie.

function TypewriterText({ text, speed = 12 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const idx = useRef(0);
  const prevText = useRef('');

  useEffect(() => {
    // Si le texte change (nouveau narr), reset
    if (text !== prevText.current) {
      prevText.current = text;
      idx.current = 0;
      setDisplayed('');
      setDone(false);
    }
    if (done) return;
    const timer = setInterval(() => {
      idx.current += 1;
      if (idx.current >= text.length) {
        setDisplayed(text);
        setDone(true);
        clearInterval(timer);
      } else {
        // Avancer par mots entiers pour plus de fluidité
        let end = idx.current;
        // Si on est au milieu d'un mot, avancer jusqu'à la fin du mot
        while (end < text.length && text[end] !== ' ' && text[end] !== '\n') end++;
        idx.current = end;
        setDisplayed(text.slice(0, end));
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed, done]);

  return (
    <div style={{ fontSize: 14, color: P.textMid, lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>
      {displayed}
      {!done && <span style={{ opacity: 0.6, animation: 'pulse 1s infinite' }}>▊</span>}
    </div>
  );
}

// ── V5.5: Sparkline abstraite "vague d'énergie" (Ronde #5 — Prop 1, 3/3 modifié) ──
// Courbe de Bézier lissée, sans axes ni labels. Esthétique "rythme vital".
function EnergyWave({ scores }: { scores: number[] }) {
  if (scores.length < 5) return null;
  const recent = scores.slice(-7);
  const n = recent.length;
  const w = 180, h = 28;
  const pad = 4;

  const min = Math.min(...recent);
  const max = Math.max(...recent);
  const range = max - min || 1;

  // Points normalisés
  const pts = recent.map((s, i) => ({
    x: pad + (i / (n - 1)) * (w - 2 * pad),
    y: pad + (1 - (s - min) / range) * (h - 2 * pad),
  }));

  // Bézier lissé via catmull-rom → cubic
  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[Math.min(i + 1, pts.length - 1)];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }

  // Label tendance (V5.5 fix: "en mouvement" pour volatilité moyenne, seuil irrégulier relevé)
  const avgFirst = recent.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
  const avgLast = recent.slice(-3).reduce((a, b) => a + b, 0) / 3;
  const delta = avgLast - avgFirst;
  const volatility = Math.max(...recent) - Math.min(...recent);
  const label = volatility > 30 ? 'irrégulier' : delta > 6 ? 'en montée' : delta < -6 ? 'en descente' : volatility < 10 ? 'stable' : volatility < 20 ? 'en mouvement' : 'irrégulier';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginTop: 8, opacity: 0.7 }}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="waveGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#D4A017" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#D4A017" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        <path d={d} fill="none" stroke="url(#waveGrad)" strokeWidth="1.5" strokeLinecap="round" />
        {/* Point actuel (dernier) */}
        <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="2.5" fill="#D4A017" opacity="0.9" />
      </svg>
      <span style={{ fontSize: 10, color: '#D4A017', fontWeight: 500, letterSpacing: 0.3, whiteSpace: 'nowrap' }}>
        7j : {label}
      </span>
    </div>
  );
}

// ── V5.0 Sprint 3: Snippet de la veille (Gemini Ronde — mémoire Cold Reading) ──
// Stocke le score du jour dans localStorage, récupère celui d'hier pour contextualiser.

// V5.2: Mémoire enrichie entre les jours (Ronde #2 backlog → implémenté)
interface DailyMemory {
  date: string;
  score: number;
  undercurrentName?: string;  // ex: "Chaudron"
  feeling?: string;           // ex: "Tu te sens brûler de créer sans le montrer."
  hexName?: string;           // ex: "Le Patient"
  dayType?: string;           // ex: "Décision"
}

function saveDailyMemory(data: DailyMemory): void {
  try {
    const key = 'k_daily_memory';
    const stored = localStorage.getItem(key);
    let history: DailyMemory[] = stored ? JSON.parse(stored) : [];
    // Écraser si même date, sinon ajouter
    history = history.filter(h => h.date !== data.date);
    history.push(data);
    // Garder 14 jours max
    if (history.length > 14) history = history.slice(-14);
    localStorage.setItem(key, JSON.stringify(history));
  } catch { /* */ }
}

// V5.5: Transition qualitative sur fenêtre glissante 3-4 jours (Ronde #5 — Prop 5, unanime 3/3)
type TrendPhase = 'montée' | 'respiration' | 'stabilisation' | 'tension' | 'reprise' | 'plateau' | 'bascule';

const TREND_LABELS: Record<TrendPhase, string> = {
  montée:         'Phase de montée — l\'énergie s\'accumule.',
  respiration:    'Journée de respiration après une montée.',
  stabilisation:  'Phase de stabilisation — le rythme se pose.',
  tension:        'Tension croissante — quelque chose cherche une sortie.',
  reprise:        'Reprise mesurée après des jours plus denses.',
  plateau:        'Plateau — tu tiens un cap régulier.',
  bascule:        'Bascule en cours — le climat change.',
};

function inferTrendPhase(scores: number[]): TrendPhase | null {
  if (scores.length < 3) return null;
  const recent = scores.slice(-4); // 3-4 derniers jours
  const diffs = recent.slice(1).map((s, i) => s - recent[i]);
  const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  const range = Math.max(...recent) - Math.min(...recent);

  // Seuils minimaux pour éviter sur-interprétation du bruit
  if (range < 8) return 'plateau'; // variation < 8 pts = pas de signal

  const allUp = diffs.every(d => d > 2);
  const allDown = diffs.every(d => d < -2);
  const lastUp = diffs[diffs.length - 1] > 5;
  const lastDown = diffs[diffs.length - 1] < -5;
  const prevUp = diffs.length >= 2 && diffs[diffs.length - 2] > 5;
  const prevDown = diffs.length >= 2 && diffs[diffs.length - 2] < -5;

  if (allUp && avg > 5) return 'montée';
  if (allDown && avg < -5) return 'tension';
  if (prevUp && lastDown) return 'respiration';
  if (prevDown && lastUp) return 'reprise';
  if (lastUp && !allUp) return 'bascule';
  if (lastDown && !allDown) return 'bascule';
  if (Math.abs(avg) < 3) return 'stabilisation';

  return null;
}

function getYesterdaySnippet(todayScore: number, todayUndercurrent?: string, todayHex?: string, calibOffset = 0): string | null {
  const today = (() => { const _d = new Date(); return `${_d.getFullYear()}-${String(_d.getMonth()+1).padStart(2,'0')}-${String(_d.getDate()).padStart(2,'0')}`; })();
  // V5.5 fix: appliquer le calibrage à l'affichage (scores stockés en brut)
  const calib = (s: number) => Math.max(0, Math.min(100, Math.round(s + calibOffset)));

  try {
    const key = 'k_daily_memory';
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    const history: DailyMemory[] = JSON.parse(stored);
    // Trouver la dernière entrée qui n'est PAS aujourd'hui
    const yesterday = [...history].reverse().find(h => h.date !== today);
    if (!yesterday) return null;

    const diff = todayScore - yesterday.score; // diff sur scores bruts (correct)
    const yesterdayDisplay = calib(yesterday.score);
    const parts: string[] = [];

    // Partie 1: Comparaison du score (affichage calibré, comparaison brute)
    if (diff >= 25) parts.push(`Hier (${yesterdayDisplay}%) était tendu — aujourd'hui l'énergie se libère.`);
    else if (diff >= 10) parts.push(`En hausse par rapport à hier (${yesterdayDisplay}%).`);
    else if (diff <= -25) parts.push(`Après l'expansion d'hier (${yesterdayDisplay}%), l'énergie se contracte.`);
    else if (diff <= -10) parts.push(`En baisse par rapport à hier (${yesterdayDisplay}%) — recalibrage.`);
    else if (Math.abs(diff) <= 5) parts.push(`Même climat qu'hier (${yesterdayDisplay}%).`);

    // Partie 2: Changement de courant caché (undercurrent)
    if (yesterday.undercurrentName && todayUndercurrent && yesterday.undercurrentName !== todayUndercurrent) {
      parts.push(`Ton courant caché a changé : hier ${yesterday.undercurrentName}, aujourd'hui ${todayUndercurrent}.`);
    }

    // Partie 3: Changement d'hexagramme du jour
    if (yesterday.hexName && todayHex && yesterday.hexName !== todayHex) {
      parts.push(`L'oracle est passé de ${yesterday.hexName} à ${todayHex}.`);
    }

    // Partie 4: Transition qualitative sur fenêtre glissante (Ronde #5)
    const recentScores = history
      .filter(h => h.date !== today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-3)
      .map(h => h.score);
    recentScores.push(todayScore); // ajouter aujourd'hui à la fenêtre

    const phase = inferTrendPhase(recentScores);
    if (phase) {
      parts.push(TREND_LABELS[phase]);
    }

    return parts.length > 0 ? parts.join(' ') : null;
  } catch {
    return null;
  }
}

// ══════════════════════════════════════
// ═══ LECTURE TAB PRINCIPALE V5.0 ═══
// ═══ Ronde Lecture — ordre optimisé ═══
// ══════════════════════════════════════
// Nouvel ordre (Ronde consensus 3/3):
// 1. Phrase-miroir (levier émotionnel)
// 2. Verdict personnalisé
// 3. Tensions du jour (contradictions visibles)
// 4. Plan d'action (Do/Don't/Timing/Conseil)
// 5. Bouton IA + teaser
// 6. Narration IA
// 7. Ce qui te ressemble (micro-détails)
// 8. Présent (3-5 insights)
// 9. Convergences
// 10. Futur / Passé (accordéons)
// 11. Portrait permanent contextualisé

export default function LectureTab({ data, bd, narr, narrLoad, genNarr }: Props) {
  const reading = useMemo<StrategicReading>(
    () => generateStrategicReading(data, bd),
    [data, bd]
  );

  // GAP=0 : calibrer le score brut partout (identique Pilotage/Calendrier/Astro)
  const calibOff = getCalibOffset();
  const displayScore = Math.max(0, Math.min(100, Math.round(data.conv.score + calibOff)));
  const rawScore = data.conv.score;
  const ct = (t: string) => calibOff !== 0 ? t.split(`${rawScore}%`).join(`${displayScore}%`) : t;
  const calibInsight = (ins: ReadingInsight): ReadingInsight => calibOff !== 0 ? { ...ins, text: ct(ins.text), sources: ins.sources.map(ct) } : ins;
  // Pré-calibrer les blocs Passé/Présent/Futur (textes contenant le score brut)
  const calibBlock = (blk: typeof reading.past) => calibOff !== 0
    ? { ...blk, insights: blk.insights.map(calibInsight), summary: ct(blk.summary) }
    : blk;
  const past = calibBlock(reading.past);
  const present = calibBlock(reading.present);
  const future = calibBlock(reading.future);
  // Calibrer aussi crossings et actionPlan (peuvent contenir le score brut)
  const crossings = reading.crossings.map(c => calibOff !== 0
    ? { ...c, description: ct(c.description), systems: c.systems.map(ct) } : c);
  const actionPlan = reading.actionPlan.map(a => calibOff !== 0
    ? { ...a, why: ct(a.why), sources: a.sources.map(ct) } : a);

  // V5.0: Micro-détails visibles (top 3-5, triés par fiabilité)
  const reliabilityOrder = { cycle: 0, resonance: 1, suggestif: 2 };
  const topMicroDetails = [...reading.microDetails]
    .sort((a, b) => (reliabilityOrder[a.reliability] ?? 2) - (reliabilityOrder[b.reliability] ?? 2))
    .slice(0, 4);

  // V5.0: Teaser pour bouton IA
  const tensionCount = reading.contradictions.length;
  const microCount = reading.microDetails.length;
  const teaserParts: string[] = [];
  if (tensionCount > 0) teaserParts.push(`${tensionCount} tension${tensionCount > 1 ? 's' : ''} forte${tensionCount > 1 ? 's' : ''}`);
  if (microCount > 0) teaserParts.push(`${Math.min(microCount, 5)} détail${microCount > 1 ? 's' : ''} rare${microCount > 1 ? 's' : ''}`);
  if (crossings.length > 0) teaserParts.push(`${crossings.length} convergence${crossings.length > 1 ? 's' : ''}`);
  const teaser = teaserParts.join(' · ');

  // V5.2: Mémoire enrichie entre les jours
  const todayUndercurrentName = reading.undercurrent?.name || undefined;
  const todayHexName = data.iching?.name || undefined;
  const todayDayType = data.conv?.dayType?.label || undefined;
  const yesterdaySnippet = useMemo(() => {
    // Sauvegarder les données du jour pour demain
    saveDailyMemory({
      date: (() => { const _d = new Date(); return `${_d.getFullYear()}-${String(_d.getMonth()+1).padStart(2,'0')}-${String(_d.getDate()).padStart(2,'0')}`; })(),
      score: rawScore,  // V5.5 fix: stocker le score BRUT, calibrage appliqué à la lecture
      undercurrentName: todayUndercurrentName,
      feeling: reading.probableFeeling || undefined,
      hexName: todayHexName,
      dayType: todayDayType,
    });
    return getYesterdaySnippet(rawScore, todayUndercurrentName, todayHexName, calibOff);
  }, [rawScore, calibOff, todayUndercurrentName, todayHexName, todayDayType, reading.probableFeeling]);

  // V5.5: Scores récents pour sparkline "vague d'énergie" (Ronde #5 — Prop 1)
  const recentScores = useMemo(() => {
    try {
      const stored = localStorage.getItem('k_daily_memory');
      if (!stored) return [];
      const history: DailyMemory[] = JSON.parse(stored);
      const today = (() => { const _d = new Date(); return `${_d.getFullYear()}-${String(_d.getMonth()+1).padStart(2,'0')}-${String(_d.getDate()).padStart(2,'0')}`; })();
      // V5.5 fix: scores stockés en brut, calibrer à la lecture
      const scores = history
        .filter(h => h.date !== today)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(h => Math.max(0, Math.min(100, Math.round(h.score + calibOff))));
      scores.push(displayScore);
      return scores;
    } catch { return []; }
  }, [displayScore, calibOff]);

  return (
    <div>
      {/* ── 0. EN 20 SECONDES (V5.6 — résumé ultra-court mobile-first) ── */}
      <div style={{
        marginBottom: 10, padding: '8px 14px', borderRadius: 8,
        background: `${P.gold}06`, border: `1px solid ${P.gold}15`,
        fontSize: 12, color: P.textMid, lineHeight: 1.6,
        letterSpacing: 0.2,
      }}>
        <span style={{ fontSize: 10, color: P.gold, fontWeight: 700, letterSpacing: 1.2, marginRight: 8 }}>
          EN 20 SEC
        </span>
        {ct(reading.quickSummary)}
      </div>

      {/* ── 1. PHRASE-MIROIR (V5.0 — levier émotionnel #1) ── */}
      <div style={{
        marginBottom: 14, padding: '14px 16px', borderRadius: 10,
        background: 'transparent',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: 15, color: P.text, lineHeight: 1.7,
          fontWeight: 500, fontStyle: 'italic',
          letterSpacing: 0.3,
        }}>
          « {ct(reading.mirrorPhrase)} »
        </div>
        {/* V5.2: Ressenti probable — ligne ultra-courte (Ronde #3) */}
        {reading.probableFeeling && (
          <div style={{
            marginTop: 6, fontSize: 12, color: P.textDim,
            fontStyle: 'italic', lineHeight: 1.5, letterSpacing: 0.2,
          }}>
            {reading.probableFeeling}
          </div>
        )}
        {/* V5.3: Ressenti somatique — ligne corporelle optionnelle (Ronde #4) */}
        {reading.somaticFeeling && (
          <div style={{
            marginTop: 4, fontSize: 11.5, color: P.textDim,
            fontStyle: 'italic', lineHeight: 1.4, letterSpacing: 0.15,
            opacity: 0.85,
          }}>
            {reading.somaticFeeling}
          </div>
        )}
      </div>

      {/* ── 1b. SOUS LA SURFACE — Hu Gua promu (V5.2 Ronde #3) ── */}
      {reading.undercurrent && (
        <div style={{
          marginBottom: 14, padding: '12px 16px', borderRadius: 10,
          background: '#18181b', border: `1px solid #3f3f4680`,
        }}>
          <div style={{
            fontSize: 10, color: P.textDim, textTransform: 'uppercase',
            letterSpacing: 1.5, fontWeight: 700, marginBottom: 6,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ fontSize: 14 }}>⚛</span> Sous la surface
          </div>
          <div style={{
            fontSize: 13, color: P.textMid, lineHeight: 1.7, fontStyle: 'italic',
          }}>
            {reading.undercurrent.text}
          </div>
          <div style={{
            marginTop: 6, fontSize: 9, color: P.textDim, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span>{reading.undercurrent.name} · Yi King nucléaire n°{reading.undercurrent.hexNum}</span>
            <ResonanceButton category="undercurrent" snippet={reading.undercurrent.text} sources={['Yi King nucléaire']} />
          </div>
        </div>
      )}

      {/* ── 2. VERDICT DU JOUR / FENÊTRE MAJEURE (Ronde #5 — Prop 3) ── */}
      {reading.majorWindow && reading.majorWindow.strength >= 5 && reading.contradictions.length === 0 ? (
        /* V5.5: Fenêtre Majeure théâtrale — remplace le verdict (Ronde #5, 2/3 majorité) */
        <div style={{
          marginBottom: 16, padding: '18px 20px', borderRadius: 14,
          background: `linear-gradient(135deg, ${P.gold}18, #1a170a, ${P.gold}08)`,
          border: `1.5px solid ${P.gold}50`,
          boxShadow: `0 4px 30px ${P.gold}15, inset 0 1px 0 ${P.gold}20`,
        }}>
          <div style={{
            fontSize: 11, color: P.gold, textTransform: 'uppercase',
            letterSpacing: 2.5, fontWeight: 700, marginBottom: 10,
            textAlign: 'center',
          }}>
            ✦✦ Fenêtre majeure ✦✦
          </div>
          <div style={{
            fontSize: 10, color: P.textDim, textAlign: 'center',
            marginBottom: 10, letterSpacing: 0.5,
          }}>
            {reading.majorWindow.strength} systèmes ouvrent la même porte · {reading.majorWindow.rarity}
          </div>
          <div style={{
            fontSize: 15, color: P.text, lineHeight: 1.8, fontWeight: 500,
            textAlign: 'center', fontStyle: 'italic',
          }}>
            {ct(reading.majorWindow.narrative)}
          </div>
          {reading.majorWindow.actions.length > 0 && (
            <div style={{
              marginTop: 12, paddingTop: 10, borderTop: `1px solid ${P.gold}25`,
              display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              {reading.majorWindow.actions.map((a, i) => (
                <div key={i} style={{ fontSize: 12, color: P.gold, lineHeight: 1.6 }}>
                  ✦ {a}
                </div>
              ))}
            </div>
          )}
          {/* Snippet veille toujours visible */}
          {yesterdaySnippet && (
            <div style={{
              marginTop: 10, fontSize: 12, color: P.textDim,
              fontStyle: 'italic', lineHeight: 1.5,
              paddingTop: 8, borderTop: `1px solid ${P.cardBdr}`,
            }}>
              ↕ {yesterdaySnippet}
            </div>
          )}
          {/* V5.5: Vague d'énergie (Ronde #5 — Prop 1) */}
          <EnergyWave scores={recentScores} />
        </div>
      ) : (
        /* Verdict standard */
        <div style={{
          marginBottom: 16, padding: '16px 18px', borderRadius: 12,
          background: `linear-gradient(135deg, ${P.gold}10, ${P.gold}05)`,
          border: `1px solid ${P.gold}25`,
          boxShadow: `0 2px 20px ${P.gold}08`,
        }}>
          <div style={{ fontSize: 10, color: P.gold, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700, marginBottom: 8 }}>
            ✦ Verdict du jour
          </div>
          <div style={{ fontSize: 14, color: P.text, lineHeight: 1.7, fontWeight: 500 }}>
            {ct(reading.todayVerdict)}
          </div>
          {/* V5.0: Snippet de la veille — mémoire Cold Reading */}
          {yesterdaySnippet && (
            <div style={{
              marginTop: 8, fontSize: 12, color: P.textDim,
              fontStyle: 'italic', lineHeight: 1.5,
              paddingTop: 8, borderTop: `1px solid ${P.cardBdr}`,
            }}>
              ↕ {yesterdaySnippet}
            </div>
          )}
          {/* V5.5: Vague d'énergie (Ronde #5 — Prop 1) */}
          <EnergyWave scores={recentScores} />
        </div>
      )}

      {/* ── 3. TENSIONS DU JOUR (V5.0 — contradictions visibles) ── */}
      {reading.contradictions.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontSize: 11, color: P.gold, textTransform: 'uppercase',
            letterSpacing: 1.5, fontWeight: 700, marginBottom: 8,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span>⚡</span> Tes tensions du jour
          </div>
          <div style={{ fontSize: 12, color: P.textDim, marginBottom: 10, lineHeight: 1.5 }}>
            Quand tes systèmes se contredisent, c'est souvent là que tu te reconnais le plus.
          </div>
          {reading.contradictions.slice(0, 2).map((c, i) => (
            <TensionCard key={i} contradiction={c} idx={i} />
          ))}
        </div>
      )}

      {/* ── 4. PLAN D'ACTION (V5.0 — Do/Don't/Timing/Conseil) ── */}
      {actionPlan.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontSize: 11, color: P.gold, textTransform: 'uppercase',
            letterSpacing: 1.5, fontWeight: 700, marginBottom: 8,
          }}>
            📋 Ton plan d'action
          </div>
          <div style={{ fontSize: 12, color: P.textDim, marginBottom: 10, lineHeight: 1.5 }}>
            Basé sur tes convergences les plus fortes, adapté à ton profil.
          </div>
          {actionPlan.map((a, i) => <ActionCardV5 key={i} item={a} idx={i} />)}
        </div>
      )}

      {/* ── 5. NARRATION IA (bouton + teaser) ── */}
      <Cd>
        {!narr && !narrLoad && (
          <div style={{ textAlign: 'center', padding: 20 }}>
            {teaser && (
              <div style={{
                fontSize: 12, color: P.gold, marginBottom: 12, lineHeight: 1.5,
                fontWeight: 500,
              }}>
                {teaser}
              </div>
            )}
            <button onClick={genNarr} style={{
              padding: '12px 32px', background: `linear-gradient(135deg,${P.gold},#C9A84C)`,
              border: 'none', borderRadius: 10, color: '#09090b', fontSize: 15, fontWeight: 700,
              cursor: 'pointer', letterSpacing: 1, fontFamily: 'inherit',
              boxShadow: `0 4px 16px ${P.goldGlow}`
            }}>
              ✦ Voir ma lecture approfondie
            </button>
          </div>
        )}
        {narrLoad && (
          <div style={{ textAlign: 'center', padding: 30 }}>
            <div style={{ fontSize: 30, animation: 'pulse 1.5s infinite' }}>🔮</div>
            <div style={{ fontSize: 13, color: P.gold, marginTop: 10 }}>L'oracle consulte les astres...</div>
          </div>
        )}
        {narr && (
          <TypewriterText text={narr} speed={12} />
        )}
        {narr && (
          <button onClick={genNarr} style={{
            marginTop: 18, padding: '9px 22px', background: P.surface,
            border: `1px solid ${P.cardBdr}`, borderRadius: 8, color: P.gold,
            fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600
          }}>
            ↻ Régénérer
          </button>
        )}
      </Cd>

      {/* ── 6. CE QUI TE RESSEMBLE AUJOURD'HUI (V5.0 — micro-détails visibles) ── */}
      {topMicroDetails.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontSize: 11, color: P.gold, textTransform: 'uppercase',
            letterSpacing: 1.5, fontWeight: 700, marginBottom: 8,
          }}>
            🎯 Ce qui te ressemble aujourd'hui
          </div>
          <div style={{ fontSize: 12, color: P.textDim, marginBottom: 10, lineHeight: 1.5 }}>
            Les signaux les plus spécifiques à ton profil, ce jour précis.
          </div>
          {topMicroDetails.map((d, i) => <MicroDetailCard key={i} detail={d} />)}
        </div>
      )}

      {/* ── 7. PRÉSENT (V5.0: réduit à 5 insights, "voir l'analyse complète") ── */}
      <ReadingBlockUI block={present} defaultOpen={true} maxVisible={MAX_VISIBLE_PRESENT} />

      {/* ── 8. CONVERGENCES ── */}
      {crossings.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: P.gold, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 12 }}>
            🔗 Convergences détectées
          </div>
          <div style={{ fontSize: 12, color: P.textDim, marginBottom: 10, lineHeight: 1.5 }}>
            Quand 3 systèmes ou plus pointent dans la même direction, le signal est puissant.
          </div>
          {crossings.map((c, i) => <CrossingCard key={i} crossing={c} />)}
        </div>
      )}

      {/* ── 9. FUTUR / PASSÉ (accordéons) ── */}
      <ReadingBlockUI block={future} />
      <ReadingBlockUI block={past} />

      {/* ── 10. PORTRAIT PERMANENT CONTEXTUALISÉ (V5.0: relégué en bas avec overlay) ── */}
      <PortraitSection text={reading.portrait} overlay={reading.portraitOverlay} />
    </div>
  );
}
