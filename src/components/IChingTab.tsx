import { useState, useEffect } from 'react';
import { sto } from '../engines/storage';
import { type SoulData } from '../App';
import { getNumberInfo } from '../engines/numerology';
import { SIGN_FR, SIGN_SYM, PLANET_SYM } from '../engines/astrology';
import { TRIGRAM_NAMES, TRIGRAM_SENSE, TRIGRAM_HUMAN, HEX_NAMES, getHexProfile, calcConsciousIChing, calcNatalIChing, getHexArchetypeGendered, type ConsciousIChing } from '../engines/iching';
import { getNuclearHexNum } from '../engines/iching-yao';
import { Sec, Cd, P, a11yClick } from './ui';
import { drawConsciousTarot, drawConscious3Cards, loadTarotHistory, saveTarotDraw, deleteTarotDraw, loadTarot3CardHistory, saveTarot3CardDraw, deleteTarot3CardDraw, getArcana, calcBirthCard, calcBirthCardConstellation, calcTarotDayNumber, calcPersonalDayCard, getConseilReverseText, loadJournalNote, saveJournalNote, deleteJournalNote, DASHA_ARCANA_MAP, TAROT_ONBOARDING, TAROT_3CARD_POSITIONS, type TarotDraw, type TarotDrawRecord, type Tarot3CardDraw, type Tarot3CardRecord } from '../engines/tarot';

// ── Journal personnel — mini-composant réutilisable ──
function JournalNote({ drawId }: { drawId: string }) {
  const [note, setNote] = useState(() => loadJournalNote(drawId));
  const [saved, setSaved] = useState(true);
  const handleSave = () => {
    saveJournalNote(drawId, note);
    setSaved(true);
  };
  return (
    <div style={{ marginTop: 10, padding: '8px 10px', background: `${P.gold}04`, borderRadius: 8, border: `1px solid ${P.gold}10` }}>
      <div style={{ fontSize: 9, color: P.gold, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600, marginBottom: 6 }}>📝 Journal personnel</div>
      <textarea
        value={note}
        onChange={e => { setNote(e.target.value); setSaved(false); }}
        onBlur={handleSave}
        placeholder="Note ton ressenti, le contexte, ce que tu retiens de ce tirage…"
        maxLength={500}
        rows={2}
        style={{ width: '100%', background: P.surface, border: `1px solid ${P.cardBdr}`, borderRadius: 6, padding: '6px 10px', color: P.text, fontSize: 11, resize: 'vertical', lineHeight: 1.6, boxSizing: 'border-box', fontFamily: 'inherit' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <div style={{ fontSize: 9, color: P.textDim }}>{note.length}/500</div>
        <div style={{ fontSize: 9, color: saved ? '#4ade80' : P.gold }}>{saved ? (note.trim() ? '✓ Sauvegardé' : '') : '● Non sauvegardé'}</div>
      </div>
    </div>
  );
}

// ── Tirage conscient : historique localStorage ──
const LS_KEY = 'kaironaute_conscious_draws';
interface DrawRecord { id: string; question: string; hexNum: number; hexName: string; keyword: string; movingCount: number; transformedHexNum?: number; transformedName?: string; }
function loadHistory(): DrawRecord[] {
  try { return sto.get<DrawRecord[]>(LS_KEY) || []; } catch { return []; }
}
function saveHistory(rec: DrawRecord) {
  const arr = loadHistory();
  arr.unshift(rec);
  sto.set(LS_KEY, arr.slice(0, 10));
}
function deleteConsciousDraw(id: string) {
  const arr = loadHistory().filter(r => r.id !== id);
  sto.set(LS_KEY, arr);
}

// ── Helper : renvoie l'archétype au bon genre (source : iching.ts) ──
function getArchetype(archetype: string, isF: boolean): string {
  return getHexArchetypeGendered(archetype, isF ? 'F' : 'M');
}

export default function IChingTab({ data, bd, gender }: { data: SoulData; bd: string; gender?: string }) {
  const isF = gender === 'F';
  const { num, astro, cz, iching } = data;
  const prof = getHexProfile(iching.hexNum);

  // ── Toggle mode Tirage Conscient : Yi King | Tarot ──
  const [tirageMode, setTirageMode] = useState<'iching' | 'tarot'>('iching');

  // ── Tirage conscient Yi King ──
  const [phase, setPhase]         = useState<'idle' | 'throwing' | 'result'>('idle');
  const [question, setQuestion]   = useState('');
  const [conscious, setConscious] = useState<ConsciousIChing | null>(null);
  const [history, setHistory]     = useState<DrawRecord[]>([]);
  const [expandedIChingId, setExpandedIChingId] = useState<string | null>(null);
  const [expandedTarotId, setExpandedTarotId]   = useState<string | null>(null);
  const [expanded3CardId, setExpanded3CardId]    = useState<string | null>(null);

  useEffect(() => { setHistory(loadHistory()); }, []);

  // ── Tirage conscient Tarot ──
  const [tarotPhase, setTarotPhase]       = useState<'idle' | 'drawing' | 'result'>('idle');
  const [tarotQuestion, setTarotQuestion] = useState('');
  const [tarotDraw, setTarotDraw]         = useState<TarotDraw | null>(null);
  const [tarotHistory, setTarotHistory]   = useState<TarotDrawRecord[]>([]);
  // ── Tirage 3 cartes Tarot — Ronde S3 ──
  const [tarotCardMode, setTarotCardMode] = useState<'1card' | '3cards'>('1card');
  const [tarot3Phase, setTarot3Phase]     = useState<'idle' | 'drawing' | 'result'>('idle');
  const [tarot3Draw, setTarot3Draw]       = useState<Tarot3CardDraw | null>(null);
  const [tarot3History, setTarot3History] = useState<Tarot3CardRecord[]>([]);

  useEffect(() => { setTarotHistory(loadTarotHistory()); setTarot3History(loadTarot3CardHistory()); }, []);

  function handleTirer() {
    if (!question.trim() || phase === 'throwing') return;
    setPhase('throwing');
    setTimeout(() => {
      const result = calcConsciousIChing(question.trim());
      setConscious(result);
      setPhase('result');
      const rec: DrawRecord = {
        id: String(result.timestamp),
        question: result.question,
        hexNum: result.reading.hexNum,
        hexName: result.reading.name,
        keyword: result.reading.keyword,
        movingCount: result.movingLines.length,
        transformedHexNum: result.transformed?.hexNum,
        transformedName: result.transformed?.name,
      };
      saveHistory(rec);
      setHistory(loadHistory());
    }, 1600);
  }

  function handleTarotTirer() {
    if (!tarotQuestion.trim() || tarotPhase === 'drawing') return;
    setTarotPhase('drawing');
    setTimeout(() => {
      const result = drawConsciousTarot(tarotQuestion.trim());
      setTarotDraw(result);
      setTarotPhase('result');
      const rec: TarotDrawRecord = {
        id: String(result.timestamp),
        question: result.question,
        arcanaNum: result.arcana.num,
        arcanaName: result.arcana.name_fr,
        isReversed: result.isReversed,
      };
      saveTarotDraw(rec);
      setTarotHistory(loadTarotHistory());
    }, 1600);
  }

  function handleTarot3Tirer() {
    if (!tarotQuestion.trim() || tarot3Phase === 'drawing') return;
    setTarot3Phase('drawing');
    setTimeout(() => {
      const result = drawConscious3Cards(tarotQuestion.trim());
      setTarot3Draw(result);
      setTarot3Phase('result');
      const rec: Tarot3CardRecord = {
        id: String(result.timestamp),
        question: result.question,
        cards: result.cards.map(c => ({ arcanaNum: c.arcana.num, arcanaName: c.arcana.name_fr, isReversed: c.isReversed, positionKey: c.position.key })),
      };
      saveTarot3CardDraw(rec);
      setTarot3History(loadTarot3CardHistory());
    }, 2000);
  }

  // Arcane du jour (déterministe) — date LOCALE (pas UTC) pour cohérence avec Pilotage
  const todayStr = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
  const arcaneJour = getArcana(calcPersonalDayCard(bd, todayStr));

  // Explication du lien astro Golden Dawn pour chaque arcane
  const ASTRO_EXPLAIN: Record<number, string> = {
    0:  'Uranus : l\'éveil soudain, la liberté radicale — comme le saut du Mat dans l\'inconnu.',
    1:  'Mercure : la communication, l\'habileté, l\'intelligence pratique — les outils du Bateleur.',
    2:  'Lune : l\'intuition, le mystère, les cycles cachés — le voile de la Papesse.',
    3:  'Vénus : la beauté, la fertilité, la création — l\'abondance de l\'Impératrice.',
    4:  'Bélier : l\'initiative, l\'autorité, la conquête — l\'énergie de l\'Empereur.',
    5:  'Taureau : la tradition, la stabilité, les valeurs profondes — l\'ancrage du Pape.',
    6:  'Gémeaux : la dualité, le choix, la communication du cœur — le dilemme de l\'Amoureux.',
    7:  'Cancer : la protection, l\'avancée émotionnelle, porter son monde en avançant — la carapace du Chariot.',
    8:  'Balance : l\'équilibre, la pesée, l\'harmonie entre les forces — la balance de la Justice.',
    9:  'Vierge : l\'analyse, le discernement, la sagesse patiente — la lanterne de l\'Ermite.',
    10: 'Jupiter : l\'expansion, la chance, les grands cycles — la roue qui tourne.',
    11: 'Lion : le courage, la noblesse, la maîtrise douce des instincts — dompter le lion intérieur.',
    12: 'Neptune : la dissolution, le lâcher-prise, voir au-delà des apparences — la suspension du Pendu.',
    13: 'Scorpion : la transformation radicale, la mort et la renaissance — le passage obligé.',
    14: 'Sagittaire : la quête de sens, le voyage, la fusion des contraires — l\'alchimie de Tempérance.',
    15: 'Capricorne : l\'ambition, les attachements matériels, le défi qui forge — les liens du Diable.',
    16: 'Mars : l\'énergie de rupture et de libération, l\'éclair qui révèle — la foudre de la Tour.',
    17: 'Verseau : l\'espoir, la vision, la connexion universelle — la lumière de l\'Étoile.',
    18: 'Poissons : l\'imaginaire, les profondeurs, le rêve éveillé — les eaux profondes de la Lune.',
    19: 'Soleil : la vitalité, la clarté, le rayonnement — la joie pure du Soleil.',
    20: 'Pluton : la transformation profonde, l\'appel irrésistible — la résurrection du Jugement.',
    21: 'Saturne : la structure, l\'accomplissement, le cycle complet — la totalité du Monde.',
  };

  // Mood + énergie de chaque grande période planétaire (Vimshottari)
  const DASHA_MOOD: Record<string, { emoji: string; mood: string; energie: string; conseil: string }> = {
    Soleil:  { emoji: '☀', mood: 'Rayonnement et affirmation de soi', energie: 'Confiance, autorité, visibilité', conseil: 'Période pour briller, prendre ta place et exprimer qui tu es vraiment.' },
    Lune:    { emoji: '☽', mood: 'Émotions, intuition et famille', energie: 'Sensibilité, introspection, vie intérieure', conseil: 'Période pour écouter tes ressentis, nourrir tes liens proches et ton monde intérieur.' },
    Mars:    { emoji: '♂', mood: 'Action, conquête et énergie brute', energie: 'Détermination, ambition, passage à l\'acte', conseil: 'Période pour agir vite, relever des défis et avancer avec détermination.' },
    Rahu:    { emoji: '☊', mood: 'Ambition, intensité et changements profonds', energie: 'Désir intense, tournants, nouveaux territoires', conseil: 'Période de montée en puissance — fascinante mais déstabilisante. Garde le cap.' },
    Jupiter: { emoji: '♃', mood: 'Expansion, chance et sagesse', energie: 'Optimisme, croissance, bonnes opportunités', conseil: 'Période faste pour apprendre, voyager, faire grandir tes projets et ta vision.' },
    Saturne: { emoji: '♄', mood: 'Discipline, exigence et maturation', energie: 'Rigueur, responsabilité, travail de fond', conseil: 'Période exigeante mais structurante — ce que tu construis ici dure.' },
    Mercure: { emoji: '☿', mood: 'Intellect, communication et adaptabilité', energie: 'Vivacité d\'esprit, échanges, apprentissages', conseil: 'Période pour apprendre, communiquer, négocier et multiplier les connexions.' },
    Ketu:    { emoji: '☋', mood: 'Lâcher-prise, spiritualité et détachement', energie: 'Dissolution, intériorisation, sagesse ancienne', conseil: 'Période de retrait intérieur — ce qui ne sert plus part, laissant place à l\'essentiel.' },
    Vénus:   { emoji: '♀', mood: 'Amour, plaisir et créativité', energie: 'Harmonie, beauté, relations, abondance', conseil: 'Période pour les relations, les arts, le confort et tout ce qui nourrit ta joie de vivre.' },
  };

  // Humanized Dasha lord names (Vedic terminology → French user-facing)
  const DASHA_LORD_NAMES: Record<string, string> = {
    Soleil: 'Soleil',
    Lune: 'Lune',
    Mars: 'Mars',
    Rahu: 'Nœud Nord lunaire',
    Jupiter: 'Jupiter',
    Saturne: 'Saturne',
    Mercure: 'Mercure',
    Ketu: 'Nœud Sud lunaire',
    Vénus: 'Vénus',
  };

  // Carte Natale (Birth Card — méthode Greer, fixe à vie)
  const birthCardNum = bd ? calcBirthCard(bd) : null;
  const birthCard = birthCardNum !== null ? getArcana(birthCardNum) : null;

  // Constellation Greer : Personnalité + Âme (+ Essence si 3 cartes) — Ronde R2
  const birthConstellation = bd ? calcBirthCardConstellation(bd) : null;
  const soulCard = birthConstellation && birthConstellation.soul !== birthConstellation.personality
    ? getArcana(birthConstellation.soul) : null;
  const essenceCard = birthConstellation?.essence !== undefined
    ? getArcana(birthConstellation.essence) : null;

  // Hexagramme Natal (fixe à vie — Ronde 2026-03-21 unanime 3/3)
  const natalHex = bd ? calcNatalIChing(bd) : null;
  const natalProf = natalHex ? getHexProfile(natalHex.hexNum) : null;

  // ── Cold Start : maintenir le bouton 3s avant tirage (Ronde Gemini — perception authenticité) ──
  const [holdProgress, setHoldProgress] = useState(0); // 0-100
  const [holdTarget, setHoldTarget] = useState<'iching' | 'tarot1' | 'tarot3' | null>(null);
  const holdDuration = 3000; // 3 secondes

  useEffect(() => {
    if (!holdTarget) { setHoldProgress(0); return; }
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / holdDuration) * 100);
      setHoldProgress(pct);
      if (pct >= 100) {
        clearInterval(interval);
        setHoldTarget(null);
        setHoldProgress(0);
        if (holdTarget === 'iching') handleTirer();
        else if (holdTarget === 'tarot1') handleTarotTirer();
        else if (holdTarget === 'tarot3') handleTarot3Tirer();
      }
    }, 50);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdTarget]);

  // Synthèse Yi King + Tarot du jour — basée sur le sens réel
  const synthese = (() => {
    // Catégorisation sémantique des hexagrammes par keyword
    const hexIntent: Record<string, string> = {
      // Action / initiative — hex qui poussent à agir, avancer, décider
      'Crée': 'action', 'Avance': 'action', 'Organise': 'action', 'Ose': 'action',
      'Persévère': 'action', 'Secoue': 'action', 'Fonce': 'action', 'Décide': 'action',
      'Progresse': 'action', 'Tranche': 'action', 'Monte': 'action', 'Inspire': 'action',
      'Rayonne': 'action', 'Célèbre': 'action', 'Prépare': 'action', 'Recommence': 'action',
      // Patience / réflexion — hex qui invitent à observer, attendre, intérioriser
      'Discipline': 'patience', 'Attends': 'patience', 'Observe': 'patience', 'Recule': 'patience',
      'Accepte': 'patience', 'Apprends': 'patience', 'Arrête-toi': 'patience', 'Patiente': 'patience',
      'Accumule': 'patience', 'Endure': 'patience', 'Puise': 'patience', 'Prudence': 'patience',
      'Protège-toi': 'patience', 'Limite': 'patience', 'Nourris-toi': 'patience', 'Sois humble': 'patience',
      'Sois pur': 'patience', 'Embellis': 'patience', 'Cultive': 'patience',
      'Persiste': 'patience', 'Éclaire': 'action',
      // Transformation / passage — hex de mutation, lâcher, changement profond
      'Transforme': 'transformation', 'Libère': 'transformation', 'Lâche prise': 'transformation',
      'Dissous': 'transformation', 'Explore': 'transformation', 'Plonge': 'transformation',
      'Corrige': 'transformation', 'Grandis': 'transformation', 'Pénètre': 'transformation',
      'Adapte-toi': 'transformation', 'Approche': 'transformation', 'Sacrifie': 'transformation',
      'Contourne': 'transformation',
      // Relation / connexion — hex de lien, fédération, échange
      'Rassemble': 'relation', 'Harmonise': 'relation', 'Accueille': 'relation', 'Partage': 'relation',
      'Unis-toi': 'relation', 'Réunis': 'relation', 'Rencontre': 'relation', 'Ressens': 'relation',
      'Reçois': 'relation', 'Réjouis-toi': 'relation', 'Fais confiance': 'relation',
      'Suis le flux': 'relation', 'Négocie': 'relation',
    };
    // Catégorisation sémantique des arcanes par thème
    const tarotIntent: Record<string, string> = {
      'Saut dans l\'inconnu': 'action', 'Maîtrise de l\'action': 'action', 'Maîtrise du mouvement': 'action',
      'Autorité et structure': 'action', 'Effondrement libérateur': 'transformation',
      'Connaissance intérieure': 'patience', 'Sagesse en solitude': 'patience', 'Suspension volontaire': 'patience',
      'Illusion et profondeur': 'patience', 'Cycles et retournements': 'transformation',
      'Transformation radicale': 'transformation', 'Face aux attachements intérieurs': 'transformation',
      'L\'appel à être soi': 'transformation',
      'Abondance et création': 'relation', 'Choix du cœur': 'relation', 'Tradition et sagesse transmise': 'relation',
      'Accomplissement et totalité': 'action', 'Espoir et renouveau': 'patience',
      'Douceur qui dompte': 'patience', 'Alchimie intérieure': 'patience',
      'Équilibre et vérité': 'patience', 'Rayonnement et joie': 'action',
    };

    const hIntent = hexIntent[iching.keyword] || 'patience';
    const tIntent = tarotIntent[arcaneJour.theme] || 'patience';

    if (hIntent === tIntent) {
      const convergeMsgs: Record<string, string> = {
        action: `Les deux systèmes convergent : c'est une journée d'action. « ${iching.keyword} » (Yi King) et « ${arcaneJour.theme} » (Tarot) pointent dans la même direction — avance avec confiance.`,
        patience: `Les deux systèmes convergent : c'est une journée de recul et de maturation. « ${iching.keyword} » (Yi King) et « ${arcaneJour.theme} » (Tarot) t'invitent à prendre du temps avant d'agir.`,
        transformation: `Les deux systèmes convergent : c'est un jour de passage. « ${iching.keyword} » (Yi King) et « ${arcaneJour.theme} » (Tarot) signalent une mutation en cours — lâche ce qui ne sert plus.`,
        relation: `Les deux systèmes convergent : c'est une journée de lien. « ${iching.keyword} » (Yi King) et « ${arcaneJour.theme} » (Tarot) mettent les relations au centre — connecte-toi aux autres.`,
      };
      return { type: 'convergence' as const, msg: convergeMsgs[hIntent] || convergeMsgs.patience };
    } else {
      return {
        type: 'complementaire' as const,
        msg: `Le Yi King dit « ${iching.keyword} » (${hIntent === 'action' ? 'agir' : hIntent === 'patience' ? 'observer' : hIntent === 'transformation' ? 'transformer' : 'relier'}), le Tarot dit « ${arcaneJour.theme} » (${tIntent === 'action' ? 'agir' : tIntent === 'patience' ? 'observer' : tIntent === 'transformation' ? 'transformer' : 'relier'}) — les deux éclairages se complètent. Intègre les deux : ${
          hIntent === 'action' && tIntent === 'patience' ? 'avance, mais avec discernement.' :
          hIntent === 'patience' && tIntent === 'action' ? 'le moment de réfléchir touche à sa fin — prépare-toi à bouger.' :
          hIntent === 'action' && tIntent === 'transformation' ? 'agis, mais en acceptant que ça change en route.' :
          hIntent === 'transformation' && tIntent === 'action' ? 'laisse la mutation opérer, puis passe à l\'action.' :
          hIntent === 'patience' && tIntent === 'transformation' ? 'observe ce qui mûrit — la transformation vient d\'elle-même.' :
          hIntent === 'transformation' && tIntent === 'patience' ? 'transforme-toi, mais sans forcer — laisse le temps faire.' :
          hIntent === 'relation' && tIntent === 'action' ? 'connecte-toi aux autres, puis agis ensemble.' :
          hIntent === 'action' && tIntent === 'relation' ? 'avance, mais pas seul — implique ceux qui comptent.' :
          hIntent === 'relation' && tIntent === 'patience' ? 'nourris tes liens, sans attente immédiate.' :
          hIntent === 'patience' && tIntent === 'relation' ? 'prends du recul, mais reste connecté à ceux qui comptent.' :
          hIntent === 'relation' && tIntent === 'transformation' ? 'tes liens évoluent — accepte le changement dans tes relations.' :
          hIntent === 'transformation' && tIntent === 'relation' ? 'ta transformation passe par les autres — ouvre-toi.' :
          'utilise chaque perspective pour éclairer l\'autre.'
        }`,
      };
    }
  })();

  function renderLines(lines: number[], movingLines: number[]) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center' }}>
        {[...lines].reverse().map((l, ri) => {
          const lineIdx = 5 - ri;
          const isMoving = movingLines.includes(lineIdx);
          const color = isMoving ? P.gold : P.gold + '88';
          return (
            <div key={ri} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {l === 1
                ? <div style={{ width: 64, height: 7, background: color, borderRadius: 3, boxShadow: isMoving ? `0 0 10px ${P.goldGlow}` : 'none' }} />
                : <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ width: 26, height: 7, background: color, borderRadius: 3 }} />
                    <div style={{ width: 26, height: 7, background: color, borderRadius: 3 }} />
                  </div>
              }
              {isMoving && <span style={{ fontSize: 9, color: P.gold }}>◀ transformation</span>}
            </div>
          );
        })}
      </div>
    );
  }

  // Helper : affiche "Nom (Keyword)" seulement si différents — évite "Approche (Approche)"
  const hexLabel = (name: string, keyword: string) =>
    name.toLowerCase() === keyword.toLowerCase() ? name : `${name} (${keyword})`;

  // ── Header synthèse : 1 insight / 1 conseil / 1 vigilance (Ronde GPT) ──
  const headerInsight = `${hexLabel(iching.name, iching.keyword)} + ${arcaneJour.name_fr} (${arcaneJour.theme})`;
  const headerConseil = prof.action;
  const headerVigilance = prof.risk;

  return (
    <div>
      {/* ══ HEADER SYNTHÈSE — "En un coup d'œil" ══ */}
      <div style={{ marginBottom: 12, padding: '12px 14px', background: `${P.gold}0a`, borderRadius: 12, border: `1px solid ${P.gold}20` }}>
        <div style={{ fontSize: 10, color: P.gold, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700, marginBottom: 10 }}>☰🎴 Ta journée en un coup d'œil</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.6 }}>
            <span style={{ color: P.gold, fontWeight: 700 }}>✦ Énergie :</span> {headerInsight}
          </div>
          <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.6 }}>
            <span style={{ color: P.green, fontWeight: 700 }}>→ Conseil :</span> {headerConseil}
          </div>
          <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.6 }}>
            <span style={{ color: '#ef4444', fontWeight: 700 }}>⚡ Vigilance :</span> {headerVigilance}
          </div>
        </div>
      </div>

      <Sec icon="☰" title={`Ton énergie Yi King du jour — ${iching.name}`}>
        <Cd>
          <div style={{ fontSize: 12, color: P.textDim, lineHeight: 1.7, marginBottom: 16, fontStyle: 'italic' }}>
            Le Yi King (易經) est le plus ancien système de sagesse stratégique connu — plus de 3000 ans d'observation des forces en jeu.
          </div>
          <div style={{ fontSize: 11, color: P.textMid, lineHeight: 1.6, marginBottom: 16, padding: '8px 12px', background: `${P.gold}08`, borderRadius: 8, border: `1px solid ${P.gold}15` }}>
            📅 <b style={{ color: P.gold }}>Calculé automatiquement</b> à partir de ta date de naissance et de la date du jour (méthode Kaironaute, inspirée de la Fleur de Prunier (Mei Hua) de Shao Yong, mathématicien et philosophe chinois du XIe siècle). Cet hexagramme change chaque jour, mais il est le même toute la journée. Ce n'est pas une prédiction, c'est une lecture des forces en jeu.<br />
            <span style={{ color: P.textDim }}>Pour poser une question précise, utilise la section « Pose ta question » plus bas.</span>
          </div>

          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            {/* Hexagram lines */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center' }}>
              {[...iching.lines].reverse().map((l, i) => {
                const lineIdx = 5 - i;
                const isChanging = lineIdx === iching.changing;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {l === 1
                      ? <div style={{ width: 64, height: 7, background: isChanging ? P.gold : P.gold + '88', borderRadius: 3, boxShadow: isChanging ? `0 0 10px ${P.goldGlow}` : 'none' }} />
                      : <div style={{ display: 'flex', gap: 10 }}>
                          <div style={{ width: 26, height: 7, background: isChanging ? P.gold : P.gold + '88', borderRadius: 3 }} />
                          <div style={{ width: 26, height: 7, background: isChanging ? P.gold : P.gold + '88', borderRadius: 3 }} />
                        </div>
                    }
                    {isChanging && <span style={{ fontSize: 9, color: P.gold }}>◀</span>}
                  </div>
                );
              })}
              <div style={{ fontSize: 10, color: P.textDim, marginTop: 6 }}>
                {TRIGRAM_NAMES[iching.upper]} ({TRIGRAM_HUMAN[iching.upper]}) / {TRIGRAM_NAMES[iching.lower]} ({TRIGRAM_HUMAN[iching.lower]})
              </div>
            </div>

            {/* Details */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: P.text }}>{iching.name}</div>
              <div style={{ fontSize: 15, color: P.gold, fontWeight: 600, marginTop: 4 }}>→ {iching.keyword}</div>
              <div style={{ marginTop: 10, fontSize: 13, color: P.textMid, lineHeight: 1.8 }}>
                {iching.desc}
              </div>
              <div style={{ marginTop: 12, fontSize: 13, color: P.textMid, lineHeight: 1.7 }}>
                Moitié basse (ton énergie intérieure) : <b style={{ color: P.gold }}>{TRIGRAM_NAMES[iching.lower]}</b><span style={{ fontSize: 11, color: P.textDim }}> — {TRIGRAM_HUMAN[iching.lower]}</span><br />
                Moitié haute (l'énergie du jour) : <b style={{ color: P.blue }}>{TRIGRAM_NAMES[iching.upper]}</b><span style={{ fontSize: 11, color: P.textDim }}> — {TRIGRAM_HUMAN[iching.upper]}</span><br />
                Ligne active : <b style={{ color: P.gold }}>{iching.changing + 1}</b> sur 6 — le point précis où l'énergie se transforme aujourd'hui
              </div>
            </div>
          </div>

          {/* Wisdom - Yi King traditionnel */}
          <div style={{ marginTop: 18, padding: '14px 16px', background: `${P.gold}06`, borderRadius: 10, border: `1px solid ${P.gold}12`, borderLeft: `3px solid ${P.gold}44` }}>
            <div style={{ fontSize: 10, color: P.gold, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700, marginBottom: 8 }}>☰ Sagesse du Yi King</div>
            <div style={{ fontSize: 13, color: P.textMid, lineHeight: 1.8, fontStyle: 'italic' }}>
              « {prof.wisdom} »
            </div>
          </div>

          {/* Strategic profile */}
          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <div style={{ padding: '8px 10px', background: `${P.green}0a`, borderRadius: 6, border: `1px solid ${P.green}18` }}>
              <div style={{ fontSize: 9, color: P.green, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>✦ Opportunité</div>
              <div style={{ fontSize: 12, color: P.green, marginTop: 3, lineHeight: 1.5 }}>{prof.opportunity}</div>
            </div>
            <div style={{ padding: '8px 10px', background: `${P.red}0a`, borderRadius: 6, border: `1px solid ${P.red}18` }}>
              <div style={{ fontSize: 9, color: P.red, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>⚡ Risque</div>
              <div style={{ fontSize: 12, color: P.red, marginTop: 3, lineHeight: 1.5 }}>{prof.risk}</div>
            </div>
          </div>

          {/* Action */}
          <div style={{ marginTop: 8, padding: '8px 12px', background: `${P.gold}0a`, borderRadius: 6, border: `1px solid ${P.gold}18` }}>
            <div style={{ fontSize: 9, color: P.gold, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>☰ Ton mouvement du jour</div>
            <div style={{ fontSize: 12, color: P.gold, lineHeight: 1.6 }}>{prof.action}</div>
          </div>

          {/* Hu Gua — Dynamique cachée — Ronde 2026-03-21 S1 unanime 3/3 */}
          {(() => {
            const nucNum = getNuclearHexNum(iching.hexNum);
            const nucProf = nucNum > 0 ? getHexProfile(nucNum) : null;
            const nucName = nucNum > 0 ? (HEX_NAMES[nucNum] || `Hexagramme ${nucNum}`) : null;
            if (!nucProf || nucNum === iching.hexNum) return null; // pas de Hu Gua ou identique
            return (
              <div style={{ marginTop: 14, padding: '10px 14px', background: '#a78bfa08', borderRadius: 10, border: '1px solid #a78bfa18', borderLeft: '3px solid #a78bfa44' }}>
                <div style={{ fontSize: 10, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700, marginBottom: 6 }}>☯ Ce qui mûrit en toi</div>
                <div style={{ fontSize: 11, color: P.textDim, lineHeight: 1.6, marginBottom: 8, fontStyle: 'italic' }}>
                  Derrière l'hexagramme visible se cache une énergie plus profonde — ce qui mûrit en toi avant même que ça se voie.
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: P.text }}>Hexagramme {nucNum} — {nucName}</div>
                <div style={{ fontSize: 12, color: '#a78bfa', fontWeight: 600, marginTop: 3 }}>→ {nucProf.action}</div>
              </div>
            );
          })()}

          {/* Convergence box */}
          {(() => {
            // Catégoriser chaque système en énergie dominante
            const numEnergy: Record<string, string> = {
              'Créateur': 'action', 'Guerrier': 'action', 'Stratège': 'action', 'Maître Bâtisseur': 'action',
              'Médiateur': 'relation', 'Harmoniseur': 'relation', 'Humaniste': 'relation', 'Maître Guérisseur': 'relation',
              'Communicant': 'relation', 'Visionnaire': 'transformation',
              'Bâtisseur': 'patience', 'Chercheur': 'patience', 'Explorateur': 'transformation',
            };
            const hexEnergy: Record<string, string> = {
              // Action
              'Crée': 'action', 'Avance': 'action', 'Organise': 'action', 'Ose': 'action',
              'Persévère': 'action', 'Secoue': 'action', 'Fonce': 'action', 'Décide': 'action',
              'Progresse': 'action', 'Tranche': 'action', 'Monte': 'action', 'Inspire': 'action',
              'Rayonne': 'action', 'Célèbre': 'action', 'Prépare': 'action', 'Recommence': 'action',
              // Patience
              'Discipline': 'patience', 'Attends': 'patience', 'Observe': 'patience', 'Recule': 'patience',
              'Accepte': 'patience', 'Apprends': 'patience', 'Arrête-toi': 'patience', 'Patiente': 'patience',
              'Accumule': 'patience', 'Endure': 'patience', 'Puise': 'patience', 'Prudence': 'patience',
              'Protège-toi': 'patience', 'Limite': 'patience', 'Nourris-toi': 'patience', 'Sois humble': 'patience',
              'Sois pur': 'patience', 'Embellis': 'patience', 'Cultive': 'patience',
              'Persiste': 'patience', 'Éclaire': 'action',
              // Transformation
              'Transforme': 'transformation', 'Libère': 'transformation', 'Lâche prise': 'transformation',
              'Dissous': 'transformation', 'Explore': 'transformation', 'Plonge': 'transformation',
              'Corrige': 'transformation', 'Grandis': 'transformation', 'Pénètre': 'transformation',
              'Adapte-toi': 'transformation', 'Approche': 'transformation', 'Sacrifie': 'transformation',
              'Contourne': 'transformation',
              // Relation
              'Rassemble': 'relation', 'Harmonise': 'relation', 'Accueille': 'relation', 'Partage': 'relation',
              'Unis-toi': 'relation', 'Réunis': 'relation', 'Rencontre': 'relation', 'Ressens': 'relation',
              'Reçois': 'relation', 'Réjouis-toi': 'relation', 'Fais confiance': 'relation',
              'Suis le flux': 'relation', 'Négocie': 'relation',
            };
            const signEnergy: Record<string, string> = {
              'Bélier': 'action', 'Lion': 'action', 'Sagittaire': 'action',
              'Taureau': 'patience', 'Vierge': 'patience', 'Capricorne': 'patience',
              'Gémeaux': 'relation', 'Balance': 'relation', 'Verseau': 'relation',
              'Cancer': 'transformation', 'Scorpion': 'transformation', 'Poissons': 'transformation',
            };
            const animalEnergy: Record<string, string> = {
              'Rat': 'action', 'Tigre': 'action', 'Dragon': 'action', 'Cheval': 'action',
              'Bœuf': 'patience', 'Serpent': 'patience', 'Chèvre': 'patience', 'Chien': 'patience',
              'Lapin': 'relation', 'Singe': 'transformation', 'Coq': 'patience', 'Cochon': 'relation',
            };

            const energies: string[] = [];
            const nk = getNumberInfo(num.ppd.v).k;
            energies.push(numEnergy[nk] || 'patience');
            energies.push(hexEnergy[iching.keyword] || 'patience');
            if (astro) energies.push(signEnergy[SIGN_FR[astro.b3.sun]] || 'patience');
            energies.push(animalEnergy[cz.animal] || 'patience');

            // Compter la fréquence de l'énergie dominante
            const freq: Record<string, number> = {};
            energies.forEach(e => { freq[e] = (freq[e] || 0) + 1; });
            const maxFreq = Math.max(...Object.values(freq));
            const dominant = Object.keys(freq).find(k => freq[k] === maxFreq) || 'patience';
            const total = energies.length;

            const energyLabels: Record<string, string> = {
              action: 'Agir', patience: 'Observer', transformation: 'Transformer', relation: 'Relier',
            };
            const energyColors: Record<string, string> = {
              action: '#ef4444', patience: '#60a5fa', transformation: '#a78bfa', relation: '#4ade80',
            };
            const ratio = maxFreq / total;
            let level: string, levelColor: string, levelMsg: string;
            if (ratio >= 0.75) {
              level = 'Forte convergence'; levelColor = P.green;
              levelMsg = `Signal clair — l'énergie du jour est alignée vers « ${energyLabels[dominant]} ».`;
            } else if (ratio > 0.5) {
              // R30 fix : ratio > 0.5 strict (majorité réelle, pas égalité)
              level = 'Convergence partielle'; levelColor = P.gold;
              levelMsg = `Tendance vers « ${energyLabels[dominant]} », mais des voix dissidentes apportent de la nuance.`;
            } else if (ratio === 0.5) {
              // R30 fix : split exact (ex: 2-2) — on n'invente pas de tendance
              level = 'Signal partagé'; levelColor = P.blue;
              levelMsg = `Les systèmes se répartissent équitablement — pas de direction dominante. Laisse ton intuition trancher.`;
            } else {
              level = 'Tensions créatives'; levelColor = P.blue;
              levelMsg = 'Les systèmes pointent dans des directions différentes — c\'est une richesse. Les tensions créatives ouvrent des voies inattendues.';
            }

            // Données pour affichage détaillé par système
            const numKey = getNumberInfo(num.ppd.v).k;
            const systems = [
              { label: `Jour Personnel ${num.ppd.v}`, detail: numKey, energy: numEnergy[numKey] || 'patience' },
              { label: `Hexagramme ${iching.hexNum}`, detail: iching.keyword, energy: hexEnergy[iching.keyword] || 'patience' },
              ...(astro ? [{ label: `${SIGN_SYM[astro.b3.sun]} ${SIGN_FR[astro.b3.sun]}`, detail: 'Signe solaire', energy: signEnergy[SIGN_FR[astro.b3.sun]] || 'patience' }] : []),
              { label: `${cz.sym} ${cz.animal}`, detail: 'Zodiaque chinois', energy: animalEnergy[cz.animal] || 'patience' },
            ];

            return (
              <div style={{ marginTop: 18, padding: 14, background: `${P.gold}08`, borderRadius: 10, border: `1px solid ${P.gold}18` }}>
                <div style={{ fontSize: 11, color: P.gold, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 10 }}>✦ Convergence du jour</div>

                {/* Chaque système avec son tag énergie */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                  {systems.map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, fontSize: 12, color: P.textMid }}>
                        <b>{s.label}</b> <span style={{ color: P.textDim }}>({s.detail})</span>
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: energyColors[s.energy], padding: '2px 8px', background: `${energyColors[s.energy]}15`, borderRadius: 10, whiteSpace: 'nowrap' }}>
                        {energyLabels[s.energy]}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Verdict */}
                <div style={{ padding: '8px 12px', background: `${levelColor}0a`, borderRadius: 8, border: `1px solid ${levelColor}20`, borderLeft: `3px solid ${levelColor}55` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: levelColor, marginBottom: 4 }}>
                    {ratio >= 0.75 ? '🔗' : ratio >= 0.5 ? '⚖' : '🌀'} {level} <span style={{ fontWeight: 400, fontSize: 10, opacity: 0.8 }}>({maxFreq} système{maxFreq > 1 ? 's' : ''} sur {total} convergent)</span>
                  </div>
                  <div style={{ fontSize: 11, color: P.textMid, lineHeight: 1.6 }}>{levelMsg}</div>
                </div>
              </div>
            );
          })()}
        </Cd>
      </Sec>

      {/* ══════════════════════════════════════════════ */}
      {/* ══  TON TAROT DU JOUR — Section info        ══ */}
      {/* ══════════════════════════════════════════════ */}
      <Sec icon="🎴" title={`Ton Tarot du jour — ${arcaneJour.name_fr}`}>
        <Cd>
            {/* Arcane du jour (déterministe) */}
            <div style={{ marginBottom: 16, padding: '12px 14px', background: `${P.gold}0a`, borderRadius: 10, border: `1px solid ${P.gold}20` }}>
              <div style={{ fontSize: 10, color: P.gold, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700, marginBottom: 4 }}>🎴 Ton Arcane du jour</div>
              <div style={{ fontSize: 10, color: P.textDim, lineHeight: 1.5, marginBottom: 8 }}>
                📅 Calculé automatiquement à partir de la date du jour (jour + mois + année). Change chaque jour.
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 54, height: 86, borderRadius: 6, border: `2px solid ${P.gold}44`, overflow: 'hidden', flexShrink: 0, background: `${P.gold}08` }}>
                  <img src={arcaneJour.image} alt={arcaneJour.name_fr} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: P.text }}>{arcaneJour.name_fr}</div>
                  <div style={{ fontSize: 11, color: P.gold, fontWeight: 600, marginTop: 2 }}>Arcane {arcaneJour.num} · {arcaneJour.theme}</div>
                  <div style={{ fontSize: 10, color: '#a78bfa', marginTop: 3, lineHeight: 1.5 }}>
                    {(() => { const PLANET_SYM_FR: Record<string, string> = { 'Uranus':'♅','Mercure':'☿','Lune':'☽','Vénus':'♀','Jupiter':'♃','Neptune':'♆','Pluton':'♇','Mars':'♂','Soleil':'☉','Saturne':'♄' }; return arcaneJour.astroType === 'sign' ? (SIGN_SYM[arcaneJour.astroValue] || '◉') : (PLANET_SYM_FR[arcaneJour.astroValue] || '☿'); })()} {ASTRO_EXPLAIN[arcaneJour.num] || arcaneJour.astroValue}
                  </div>
                  <div style={{ fontSize: 11, color: P.textMid, marginTop: 4, lineHeight: 1.5 }}>✦ {arcaneJour.light}</div>
                </div>
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: P.textMid, lineHeight: 1.7, fontStyle: 'italic', padding: '8px 10px', background: `${P.gold}06`, borderRadius: 8, borderLeft: `2px solid ${P.gold}44` }}>
                {arcaneJour.narrative}
              </div>
            </div>

            {/* Synthèse Yi King + Tarot du jour — remontée ici pour lier les 2 modules */}
            <div style={{ marginBottom: 16, padding: '12px 14px', background: synthese.type === 'convergence' ? `${P.green}08` : `${P.blue}08`, borderRadius: 10, border: `1px solid ${synthese.type === 'convergence' ? P.green + '20' : P.blue + '20'}`, borderLeft: `3px solid ${synthese.type === 'convergence' ? P.green + '55' : P.blue + '55'}` }}>
              <div style={{ fontSize: 10, color: synthese.type === 'convergence' ? P.green : P.blue, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700, marginBottom: 6 }}>
                {synthese.type === 'convergence' ? '🔗 Convergence Yi King + Tarot' : '⚖ Complémentarité Yi King + Tarot'}
              </div>
              <div style={{ fontSize: 11, color: P.textDim, lineHeight: 1.5, marginBottom: 8 }}>
                <b style={{ color: P.gold }}>{iching.name}</b>{iching.name.toLowerCase() !== iching.keyword.toLowerCase() && <> ({iching.keyword})</>} + <b style={{ color: P.gold }}>{arcaneJour.name_fr}</b> ({arcaneJour.theme})
              </div>
              <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.7, fontStyle: 'italic' }}>
                {synthese.msg}
              </div>
            </div>

            {/* Carte Natale (Birth Card) — fixe à vie */}
            {birthCard && (
              <div style={{ marginBottom: 16, padding: '10px 14px', background: '#a78bfa08', borderRadius: 10, border: '1px solid #a78bfa18', borderLeft: '3px solid #a78bfa44' }}>
                <div style={{ fontSize: 10, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700, marginBottom: 8 }}>🪞 Ton archétype profond — Carte Natale</div>
                <div style={{ fontSize: 10, color: P.textDim, lineHeight: 1.5, marginBottom: 8 }}>
                  Calculée une fois pour toutes à partir de ta date de naissance. C'est ton miroir permanent — les forces profondes qui te caractérisent indépendamment du jour.
                </div>
                {/* Constellation Greer : Personnalité + Âme + Essence */}
                <div className="flex-wrap-mobile" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {/* Carte de Personnalité */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 200 }}>
                    <div style={{ width: 42, height: 66, borderRadius: 5, border: '2px solid #a78bfa44', overflow: 'hidden', flexShrink: 0, background: '#a78bfa08' }}>
                      <img src={birthCard.image} alt={birthCard.name_fr} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                    </div>
                    <div>
                      <div style={{ fontSize: 9, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600, marginBottom: 1 }}>Personnalité</div>
                      <div style={{ fontSize: 8, color: P.textDim, marginBottom: 3, lineHeight: 1.3 }}>comment tu te manifestes dans le monde</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: P.text }}>{birthCard.name_fr}</div>
                      <div style={{ fontSize: 11, color: '#a78bfa', fontWeight: 600, marginTop: 2 }}>Arcane {birthCard.num} · {birthCard.theme}</div>
                      <div style={{ fontSize: 10, color: '#a78bfa', marginTop: 2, lineHeight: 1.5 }}>
                        {(() => { const PLANET_SYM_FR: Record<string, string> = { 'Uranus':'♅','Mercure':'☿','Lune':'☽','Vénus':'♀','Jupiter':'♃','Neptune':'♆','Pluton':'♇','Mars':'♂','Soleil':'☉','Saturne':'♄' }; return birthCard.astroType === 'sign' ? (SIGN_SYM[birthCard.astroValue] || '◉') : (PLANET_SYM_FR[birthCard.astroValue] || '☿'); })()} {ASTRO_EXPLAIN[birthCard.num] || birthCard.astroValue}
                      </div>
                    </div>
                  </div>

                  {/* Miroir Intérieur (si différent de Personnalité) */}
                  {soulCard && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 200 }}>
                      <div style={{ width: 42, height: 66, borderRadius: 5, border: '2px solid #c084fc44', overflow: 'hidden', flexShrink: 0, background: '#c084fc08' }}>
                        <img src={soulCard.image} alt={soulCard.name_fr} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                      </div>
                      <div>
                        <div style={{ fontSize: 9, color: '#c084fc', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600, marginBottom: 1 }}>Ton Miroir Intérieur</div>
                        <div style={{ fontSize: 8, color: P.textDim, marginBottom: 3, lineHeight: 1.3 }}>ce qui te guide en profondeur, souvent sans que tu le saches</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: P.text }}>{soulCard.name_fr}</div>
                        <div style={{ fontSize: 10, color: '#c084fc', fontWeight: 600, marginTop: 2 }}>Arcane {soulCard.num} · {soulCard.theme}</div>
                        <div style={{ fontSize: 10, color: P.textDim, marginTop: 3, lineHeight: 1.5 }}>{soulCard.narrative}</div>
                      </div>
                    </div>
                  )}

                  {/* Carte d'Essence (cas spécial 19→10→1) */}
                  {essenceCard && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 200 }}>
                      <div style={{ width: 42, height: 66, borderRadius: 5, border: '2px solid #e879f944', overflow: 'hidden', flexShrink: 0, background: '#e879f908' }}>
                        <img src={essenceCard.image} alt={essenceCard.name_fr} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                      </div>
                      <div>
                        <div style={{ fontSize: 9, color: '#e879f9', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600, marginBottom: 1 }}>Ton Noyau Profond</div>
                        <div style={{ fontSize: 8, color: P.textDim, marginBottom: 3, lineHeight: 1.3 }}>qui tu es au-delà de tout rôle — ta nature première</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: P.text }}>{essenceCard.name_fr}</div>
                        <div style={{ fontSize: 10, color: '#e879f9', fontWeight: 600, marginTop: 2 }}>Arcane {essenceCard.num} · {essenceCard.theme}</div>
                        <div style={{ fontSize: 10, color: P.textDim, marginTop: 3, lineHeight: 1.5 }}>{essenceCard.narrative}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Synthèse de la constellation (ou narrative seule si 1 carte) */}
                <div style={{ marginTop: 10, fontSize: 11, color: P.textMid, lineHeight: 1.7, fontStyle: 'italic', padding: '6px 10px', background: '#a78bfa06', borderRadius: 8, borderLeft: '2px solid #a78bfa33' }}>
                  {soulCard
                    ? `En surface, tu exprimes ${birthCard.name_fr} (${birthCard.theme.toLowerCase()}) — c'est ta manière d'agir au quotidien. En profondeur, ton âme vibre sur ${soulCard.name_fr} (${soulCard.theme.toLowerCase()}) — c'est ce qui te guide sans que tu le saches.${essenceCard ? ` Et au cœur de tout, ${essenceCard.name_fr} (${essenceCard.theme.toLowerCase()}) est ton noyau irréductible.` : ''}`
                    : birthCard.narrative
                  }
                </div>
              </div>
            )}

            {/* Hexagramme Natal (fixe à vie) — Ronde 2026-03-21 unanime 3/3 */}
            {natalHex && natalProf && (
              <div style={{ marginBottom: 16, padding: '10px 14px', background: '#a78bfa08', borderRadius: 10, border: '1px solid #a78bfa18', borderLeft: '3px solid #a78bfa44' }}>
                <div style={{ fontSize: 10, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700, marginBottom: 8 }}>☰ Ton hexagramme de naissance</div>
                <div style={{ fontSize: 10, color: P.textDim, lineHeight: 1.5, marginBottom: 8 }}>
                  Calculé une fois pour toutes à partir de ta date de naissance (méthode Kaironaute). C'est ta signature Yi King permanente.
                </div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  {/* Mini hexagramme natal */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
                    {[...natalHex.lines].reverse().map((l, i) => (
                      <div key={i}>
                        {l === 1
                          ? <div style={{ width: 36, height: 5, background: '#a78bfa88', borderRadius: 2 }} />
                          : <div style={{ display: 'flex', gap: 6 }}>
                              <div style={{ width: 14, height: 5, background: '#a78bfa88', borderRadius: 2 }} />
                              <div style={{ width: 14, height: 5, background: '#a78bfa88', borderRadius: 2 }} />
                            </div>
                        }
                      </div>
                    ))}
                    <div style={{ fontSize: 8, color: '#a78bfa', marginTop: 3, opacity: 0.7, textAlign: 'center', lineHeight: 1.4 }}>
                      <div>{TRIGRAM_NAMES[natalHex.upper]}</div>
                      <div style={{ opacity: 0.5, fontSize: 7 }}>{TRIGRAM_HUMAN[natalHex.upper]}</div>
                      <div style={{ opacity: 0.5, marginTop: 1 }}>sur</div>
                      <div>{TRIGRAM_NAMES[natalHex.lower]}</div>
                      <div style={{ opacity: 0.5, fontSize: 7 }}>{TRIGRAM_HUMAN[natalHex.lower]}</div>
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: P.text }}>Hexagramme {natalHex.hexNum} — {natalHex.name}</div>
                    <div style={{ fontSize: 12, color: '#a78bfa', fontWeight: 600, marginTop: 2 }}>→ {natalHex.keyword}</div>
                    <div style={{ fontSize: 10, color: P.textDim, marginTop: 4, lineHeight: 1.5 }}>
                      <span style={{ color: P.blue }}>{TRIGRAM_NAMES[natalHex.upper]}</span><span style={{ color: P.textDim, fontSize: 9 }}> ({TRIGRAM_HUMAN[natalHex.upper]})</span> rencontre <span style={{ color: P.gold }}>{TRIGRAM_NAMES[natalHex.lower]}</span><span style={{ color: P.textDim, fontSize: 9 }}> ({TRIGRAM_HUMAN[natalHex.lower]})</span>
                    </div>
                    <div style={{ fontSize: 11, color: P.textMid, marginTop: 4, lineHeight: 1.5 }}>Tu incarnes : {getArchetype(natalProf.archetype, isF)}</div>
                    <div style={{ fontSize: 10, color: P.textDim, marginTop: 4, lineHeight: 1.6, fontStyle: 'italic' }}>
                      « {natalProf.wisdom} »
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Pont Dasha → Arcane — Ronde 2026-03-21 Q8 P3 (3/3) */}
            {data.dasha && (() => {
              const mahaLord = data.dasha.maha.lord;
              const antarLord = data.dasha.antar.lord;
              const mahaArcanaNum = DASHA_ARCANA_MAP[mahaLord];
              const antarArcanaNum = DASHA_ARCANA_MAP[antarLord];
              const mahaArcana = mahaArcanaNum !== undefined ? getArcana(mahaArcanaNum) : null;
              const antarArcana = antarArcanaNum !== undefined ? getArcana(antarArcanaNum) : null;
              if (!mahaArcana) return null;
              // Formater les dates de début/fin pour les rendre lisibles
              const fmtDate = (d: Date) => d.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
              const mahaStart = fmtDate(data.dasha.maha.startDate);
              const mahaEnd = fmtDate(data.dasha.maha.endDate);
              const antarStart = fmtDate(data.dasha.antar.startDate);
              const antarEnd = fmtDate(data.dasha.antar.endDate);
              const mahaPct = Math.round(data.dasha.maha.progressRatio * 100);
              const antarPct = Math.round(data.dasha.antar.progressRatio * 100);
              return (
                <div style={{ marginBottom: 16, padding: '10px 14px', background: '#f59e0b08', borderRadius: 10, border: '1px solid #f59e0b18', borderLeft: '3px solid #f59e0b44' }}>
                  <div style={{ fontSize: 10, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700, marginBottom: 8 }}>🌉 Pont période planétaire → Tarot</div>
                  <div style={{ fontSize: 10, color: P.textDim, lineHeight: 1.6, marginBottom: 10 }}>
                    En astrologie des cycles de vie (védique), tu traverses de grandes périodes planétaires qui colorent ta vie pendant plusieurs années. Chaque planète correspond à une carte du Tarot — c'est le thème de fond de ta période actuelle.
                  </div>

                  {/* Mahadasha → Arcane */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: antarArcana ? 10 : 0 }}>
                    <div style={{ width: 38, height: 60, borderRadius: 5, border: '2px solid #f59e0b44', overflow: 'hidden', flexShrink: 0, background: '#f59e0b08' }}>
                      <img src={mahaArcana.image} alt={mahaArcana.name_fr} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 9, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600 }}>Grande période · {DASHA_LORD_NAMES[mahaLord] || mahaLord}</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: P.text, marginTop: 2 }}>{mahaArcana.name_fr}</div>
                      <div style={{ fontSize: 10, color: '#f59e0b', fontWeight: 600, marginTop: 1 }}>{mahaArcana.theme}</div>
                      <div style={{ fontSize: 10, color: P.textDim, marginTop: 3, lineHeight: 1.5 }}>
                        {mahaStart} → {mahaEnd} · {mahaPct >= 90 ? `${mahaPct}% — bientôt terminée` : mahaPct <= 10 ? `${mahaPct}% — tout juste commencée` : `${mahaPct}% parcouru`}
                      </div>
                      {/* Mini barre de progression */}
                      <div style={{ marginTop: 4, height: 3, background: '#f59e0b15', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${mahaPct}%`, height: '100%', background: '#f59e0b66', borderRadius: 2 }} />
                      </div>
                      {/* Mood de la période */}
                      {DASHA_MOOD[mahaLord] && (
                        <div style={{ marginTop: 6, padding: '5px 8px', background: '#f59e0b08', borderRadius: 6, borderLeft: '2px solid #f59e0b33' }}>
                          <div style={{ fontSize: 10, color: '#f59e0b', fontWeight: 600 }}>{DASHA_MOOD[mahaLord].emoji} {DASHA_MOOD[mahaLord].mood}</div>
                          <div style={{ fontSize: 9, color: P.textDim, marginTop: 2, lineHeight: 1.4 }}>{DASHA_MOOD[mahaLord].conseil}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Antardasha → Arcane */}
                  {antarArcana && antarArcanaNum !== mahaArcanaNum && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0 0', borderTop: `1px dashed #f59e0b18` }}>
                      <div style={{ width: 32, height: 50, borderRadius: 4, border: '1px solid #f59e0b33', overflow: 'hidden', flexShrink: 0, background: '#f59e0b06' }}>
                        <img src={antarArcana.image} alt={antarArcana.name_fr} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 9, color: '#d97706', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600 }}>Cycle en cours · {DASHA_LORD_NAMES[antarLord] || antarLord}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: P.text, marginTop: 1 }}>{antarArcana.name_fr}</div>
                        <div style={{ fontSize: 10, color: '#d97706', fontWeight: 600 }}>{antarArcana.theme}</div>
                        <div style={{ fontSize: 10, color: P.textDim, marginTop: 2, lineHeight: 1.5 }}>
                          {antarStart} → {antarEnd} · {antarPct >= 90 ? `${antarPct}% — bientôt terminée` : antarPct <= 10 ? `${antarPct}% — tout juste commencée` : `${antarPct}% parcouru`}
                        </div>
                        <div style={{ marginTop: 3, height: 2, background: '#d9770615', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ width: `${antarPct}%`, height: '100%', background: '#d9770655', borderRadius: 2 }} />
                        </div>
                        {/* Mood de la sous-période */}
                        {DASHA_MOOD[antarLord] && (
                          <div style={{ marginTop: 5, padding: '4px 7px', background: '#d9770608', borderRadius: 5, borderLeft: '2px solid #d9770630' }}>
                            <div style={{ fontSize: 9, color: '#d97706', fontWeight: 600 }}>{DASHA_MOOD[antarLord].emoji} {DASHA_MOOD[antarLord].energie}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Prochaine grande période */}
                  {data.dasha.nextMaha && (() => {
                    const nextLord = data.dasha.nextMaha.lord;
                    const nextArcanaNum = DASHA_ARCANA_MAP[nextLord];
                    const nextArcana = nextArcanaNum !== undefined ? getArcana(nextArcanaNum) : null;
                    const nextStart = fmtDate(data.dasha.nextMaha.startDate);
                    const nextEnd = fmtDate(data.dasha.nextMaha.endDate);
                    const nextMood = DASHA_MOOD[nextLord];
                    return (
                      <div style={{ marginTop: 10, padding: '8px 10px', background: '#60a5fa08', borderRadius: 8, border: '1px dashed #60a5fa25' }}>
                        <div style={{ fontSize: 9, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 6 }}>→ Prochaine grande période · {DASHA_LORD_NAMES[nextLord] || nextLord}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          {nextArcana && (
                            <div style={{ width: 28, height: 44, borderRadius: 4, border: '1px solid #60a5fa33', overflow: 'hidden', flexShrink: 0, background: '#60a5fa08' }}>
                              <img src={nextArcana.image} alt={nextArcana.name_fr} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                            </div>
                          )}
                          <div style={{ flex: 1 }}>
                            {nextArcana && <div style={{ fontSize: 12, fontWeight: 700, color: P.text }}>{nextArcana.name_fr} <span style={{ fontSize: 10, color: '#60a5fa', fontWeight: 600 }}>· {nextArcana.theme}</span></div>}
                            <div style={{ fontSize: 10, color: P.textDim, marginTop: 2 }}>À partir de {nextStart} · jusqu'à {nextEnd}</div>
                            {nextMood && (
                              <div style={{ marginTop: 4, fontSize: 10, color: '#60a5fa', lineHeight: 1.4 }}>
                                {nextMood.emoji} <b>{nextMood.mood}</b>
                                <div style={{ fontSize: 9, color: P.textDim, marginTop: 2 }}>{nextMood.conseil}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })()}

        </Cd>
      </Sec>

      {/* ══════════════════════════════════════════════ */}
      {/* ══  TIRAGE CONSCIENT — V9 Sprint 4 + 6    ══ */}
      {/* ══════════════════════════════════════════════ */}
      <Sec icon="🎯" title={tirageMode === 'iching' ? 'Pose ta question — Yi King' : 'Pose ta question — Tarot'}>
        <Cd>
          {/* ── Toggle Yi King / Tarot ── */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderRadius: 8, overflow: 'hidden', border: `1px solid ${P.cardBdr}`, width: 'fit-content' }}>
            {(['iching', 'tarot'] as const).map(m => (
              <button key={m} onClick={() => setTirageMode(m)} aria-label={`Mode ${m === 'iching' ? 'Yi King' : 'Tarot'}`} style={{
                padding: '7px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                background: tirageMode === m ? `${P.gold}18` : P.surface,
                color: tirageMode === m ? P.gold : P.textDim,
                border: 'none', borderRight: m === 'iching' ? `1px solid ${P.cardBdr}` : 'none',
                transition: 'all 0.2s', fontFamily: 'inherit',
              }}>
                {m === 'iching' ? '☰ Yi King' : '🃏 Tarot'}
              </button>
            ))}
          </div>

          {/* ══ Mode YI KING ══ */}
          {tirageMode === 'iching' && (
          <div>
          <div style={{ fontSize: 12, color: P.textDim, lineHeight: 1.7, marginBottom: 14, fontStyle: 'italic' }}>
            Pose une intention précise. L'instant exact de ta consultation génère un tirage unique — chaque consultation est différente, même avec la même question.
          </div>

          {/* ── Zone de saisie (visible sauf en mode résultat) ── */}
          {phase !== 'result' && (
            <>
              <textarea
                value={question}
                onChange={e => setQuestion(e.target.value)}
                placeholder="Ex: Dois-je lancer ce projet maintenant ? Que révèle cette rencontre ?"
                maxLength={200} rows={2}
                style={{ width: '100%', background: P.surface, border: `1px solid ${P.cardBdr}`, borderRadius: 8, padding: '10px 12px', color: P.text, fontSize: 12, resize: 'none', lineHeight: 1.6, boxSizing: 'border-box' }}
              />
              <div style={{ fontSize: 10, color: P.textDim, textAlign: 'right', marginTop: 3 }}>{question.length}/200</div>
              <div style={{ position: 'relative', marginTop: 10 }}>
                <button
                  onMouseDown={() => question.trim() && phase !== 'throwing' && setHoldTarget('iching')}
                  onMouseUp={() => holdTarget === 'iching' && setHoldTarget(null)}
                  onMouseLeave={() => holdTarget === 'iching' && setHoldTarget(null)}
                  onTouchStart={() => question.trim() && phase !== 'throwing' && setHoldTarget('iching')}
                  onTouchEnd={() => holdTarget === 'iching' && setHoldTarget(null)}
                  disabled={!question.trim() || phase === 'throwing'}
                  aria-label="Consulter le Yi King"
                  style={{ width: '100%', padding: 14, background: question.trim() ? `linear-gradient(135deg, ${P.gold}22, ${P.gold}0D)` : `${P.gold}0A`, border: `1px solid ${question.trim() ? P.gold + '66' : P.gold + '25'}`, borderRadius: 10, color: question.trim() ? P.gold : P.gold + '88', fontSize: 13, fontWeight: 700, cursor: question.trim() && phase !== 'throwing' ? 'pointer' : 'default', letterSpacing: 1, transition: 'all 0.3s', position: 'relative', overflow: 'hidden' }}
                >
                  {holdTarget === 'iching' && <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${holdProgress}%`, background: `${P.gold}30`, transition: 'width 0.05s linear', borderRadius: 10 }} />}
                  <span style={{ position: 'relative', zIndex: 1 }}>
                    {phase === 'throwing' ? '☰  Tirage en cours…' : holdTarget === 'iching' ? '☰  Concentre-toi sur ta question…' : '☰  Maintiens 3s pour consulter'}
                  </span>
                </button>
              </div>
            </>
          )}

          {/* ── Résultat ── */}
          {phase === 'result' && conscious && (() => {
            const prof2   = getHexProfile(conscious.reading.hexNum);
            const profT   = conscious.transformed ? getHexProfile(conscious.transformed.hexNum) : null;
            const hasMove = conscious.movingLines.length > 0;
            // Labels des valeurs de tirage
            const throwLabel: Record<number, string> = { 6: 'Yin mobile', 7: 'Yang stable', 8: 'Yin stable', 9: 'Yang mobile' };
            const throwColor: Record<number, string> = { 6: P.gold, 7: P.text, 8: P.textDim, 9: P.gold };
            return (
              <div>
                {/* Question */}
                <div style={{ marginBottom: 14, padding: '8px 12px', background: `${P.gold}08`, borderRadius: 8, border: `1px solid ${P.gold}18` }}>
                  <div style={{ fontSize: 10, color: P.gold, fontWeight: 700, marginBottom: 4 }}>✦ Ta question</div>
                  <div style={{ fontSize: 12, color: P.textMid, fontStyle: 'italic' }}>« {conscious.question} »</div>
                </div>

                {/* Hexagramme principal */}
                <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 14 }}>
                  {renderLines(conscious.reading.lines, conscious.movingLines)}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: P.textDim, marginBottom: 4 }}>Hexagramme {conscious.reading.hexNum}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: P.text }}>{conscious.reading.name}</div>
                    <div style={{ fontSize: 14, color: P.gold, fontWeight: 600, marginTop: 3 }}>→ {conscious.reading.keyword}</div>
                    {hasMove && <div style={{ fontSize: 10, color: P.gold, marginTop: 4 }}>⬤ {conscious.movingLines.length} point{conscious.movingLines.length > 1 ? 's' : ''} de transformation ({conscious.movingLines.map(i => ['Fondation', 'Terre', 'Transition', 'Cœur', 'Ciel', 'Sommet'][i]).join(', ')})</div>}
                  </div>
                </div>

                {/* Valeurs des lancers */}
                <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 14 }}>
                  {conscious.throws.map((t, i) => (
                    <div key={i} style={{ textAlign: 'center', padding: '4px 6px', borderRadius: 6, background: (t === 6 || t === 9) ? `${P.gold}0f` : P.surface, border: `1px solid ${(t === 6 || t === 9) ? P.gold + '33' : P.cardBdr}` }}>
                      <div style={{ fontSize: 8, color: P.textDim }}>{['Base', 'Terre', 'Pivot', 'Cœur', 'Ciel', 'Sommet'][i]}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: throwColor[t] }}>{throwLabel[t]}</div>
                      <div style={{ fontSize: 8, color: throwColor[t], opacity: 0.7 }}>{t}</div>
                    </div>
                  ))}
                </div>

                {/* Conseil */}
                <div style={{ marginBottom: 14, padding: '10px 12px', background: `${P.gold}06`, borderRadius: 8, border: `1px solid ${P.gold}12`, borderLeft: `3px solid ${P.gold}44` }}>
                  <div style={{ fontSize: 10, color: P.gold, fontWeight: 700, marginBottom: 6 }}>☰ Conseil de l'hexagramme</div>
                  <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.7 }}>{prof2.action}</div>
                </div>

                {/* Hexagramme transformé */}
                {conscious.transformed && profT && (
                  <div style={{ marginBottom: 14, padding: 12, background: '#60a5fa08', borderRadius: 8, border: '1px solid #60a5fa20' }}>
                    <div style={{ fontSize: 10, color: '#60a5fa', fontWeight: 700, marginBottom: 8 }}>↗ Ce qui en émerge — l'évolution en cours</div>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      {renderLines(conscious.transformed.lines, [])}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, color: P.textDim }}>Hexagramme {conscious.transformed.hexNum}</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: P.text, marginTop: 2 }}>{conscious.transformed.name}</div>
                        <div style={{ fontSize: 13, color: '#60a5fa', fontWeight: 600, marginTop: 2 }}>→ {conscious.transformed.keyword}</div>
                        <div style={{ fontSize: 11, color: P.textDim, marginTop: 6, lineHeight: 1.6 }}>{profT.action}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Synthèse de lecture */}
                {conscious.transformed && profT && (
                  <div style={{ marginBottom: 14, padding: '12px 14px', background: `linear-gradient(135deg, ${P.gold}08, #60a5fa08)`, borderRadius: 10, border: `1px solid ${P.gold}18` }}>
                    <div style={{ fontSize: 10, color: P.gold, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>📖 Synthèse de ta lecture</div>
                    <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.7 }}>
                      Ta situation actuelle est celle de <strong style={{ color: P.text }}>{conscious.reading.name}</strong> ({conscious.reading.keyword.toLowerCase()}).{' '}
                      Mais une transformation est en cours : elle t'amène vers <strong style={{ color: P.text }}>{conscious.transformed.name}</strong> ({conscious.transformed.keyword.toLowerCase()}).
                    </div>
                    <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.7, marginTop: 8 }}>
                      <strong style={{ color: P.gold }}>En pratique :</strong> {prof2.action}{' '}
                      Pour la suite : {profT.action}
                    </div>
                    {prof2.risk && (
                      <div style={{ fontSize: 11, color: P.textDim, lineHeight: 1.5, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${P.cardBdr}` }}>
                        <span style={{ color: '#f59e0b' }}>⚡ Vigilance :</span> {prof2.risk}
                      </div>
                    )}
                  </div>
                )}

                {/* Journal personnel — Ronde Q8 P2 */}
                <JournalNote drawId={`iching-${conscious.timestamp}`} />

                {/* Bouton nouveau tirage */}
                <button
                  onClick={() => { setPhase('idle'); setConscious(null); setQuestion(''); }}
                  style={{ width: '100%', padding: '10px', background: P.surface, border: `1px solid ${P.cardBdr}`, borderRadius: 8, color: P.textMid, fontSize: 12, cursor: 'pointer', marginBottom: 4, marginTop: 10 }}
                >
                  ↩ Nouveau tirage
                </button>
              </div>
            );
          })()}

          {/* ── Historique des 5 derniers tirages ── */}
          {history.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: 10, color: P.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Tirages précédents</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {history.slice(0, 5).map(h => {
                  const isExpanded = expandedIChingId === h.id;
                  const hProf = getHexProfile(h.hexNum);
                  const hProfT = h.transformedHexNum ? getHexProfile(h.transformedHexNum) : null;
                  // Résoudre les noms depuis HEX_NAMES (pas les strings stockés) pour refléter les renommages
                  const currentName = HEX_NAMES[h.hexNum] || h.hexName;
                  const currentTransName = h.transformedHexNum ? (HEX_NAMES[h.transformedHexNum] || h.transformedName) : h.transformedName;
                  return (
                    <div key={h.id}>
                      <div style={{ padding: '8px 12px', borderRadius: isExpanded ? '8px 8px 0 0' : 8, background: P.surface, border: `1px solid ${P.cardBdr}`, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', transition: 'background 0.2s' }}
                        {...a11yClick(() => setExpandedIChingId(isExpanded ? null : h.id))} aria-label={`Détails du tirage Yi King #${h.hexNum}`} aria-expanded={isExpanded}>
                        <div style={{ fontSize: 11, color: P.gold, fontWeight: 700, minWidth: 28 }}>#{h.hexNum}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, color: P.textMid, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>« {h.question} »</div>
                          <div style={{ fontSize: 10, color: P.textDim, marginTop: 2 }}>
                            {hexLabel(currentName, h.keyword)}
                            {h.transformedHexNum && <span style={{ color: '#60a5fa' }}> ↗ {currentTransName}</span>}
                          </div>
                        </div>
                        {h.movingCount > 0 && <div style={{ fontSize: 9, color: P.gold }}>⬤{h.movingCount}</div>}
                        <div style={{ fontSize: 12, color: P.gold, opacity: 0.7, padding: '2px 6px', background: `${P.gold}10`, borderRadius: 4 }}>{isExpanded ? '▲' : '▼'}</div>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteConsciousDraw(h.id); setHistory(loadHistory()); setExpandedIChingId(null); }}
                          style={{ flexShrink: 0, width: 24, height: 24, borderRadius: 6, border: 'none', background: '#ef444415', color: '#ef4444', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}
                          title="Supprimer ce tirage"
                        >✕</button>
                      </div>
                      {isExpanded && (
                        <div style={{ padding: '10px 14px', background: `${P.surface}cc`, border: `1px solid ${P.cardBdr}`, borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
                          <div style={{ fontSize: 12, color: P.textMid, fontStyle: 'italic', marginBottom: 8 }}>« {h.question} »</div>
                          <div style={{ fontSize: 15, fontWeight: 700, color: P.text, marginBottom: 2 }}>{currentName}</div>
                          {currentName.toLowerCase() !== h.keyword.toLowerCase() && (
                            <div style={{ fontSize: 13, color: P.gold, fontWeight: 600, marginBottom: 8 }}>→ {h.keyword}</div>
                          )}
                          <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.7, marginBottom: 10, padding: '8px 10px', background: `${P.gold}06`, borderRadius: 8, borderLeft: `3px solid ${P.gold}44` }}>
                            <div style={{ fontSize: 10, color: P.gold, fontWeight: 700, marginBottom: 4 }}>☰ Conseil</div>
                            {hProf.action}
                          </div>
                          {h.movingCount > 0 && <div style={{ fontSize: 10, color: P.gold, marginBottom: 6 }}>⬤ {h.movingCount} point{h.movingCount > 1 ? 's' : ''} de transformation</div>}
                          {h.transformedHexNum && hProfT && (
                            <div style={{ padding: '8px 10px', background: '#60a5fa08', borderRadius: 8, border: '1px solid #60a5fa20' }}>
                              <div style={{ fontSize: 10, color: '#60a5fa', fontWeight: 700, marginBottom: 4 }}>↗ Ce qui en émerge — l'évolution en cours</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: P.text }}>{currentTransName}</div>
                              <div style={{ fontSize: 11, color: '#60a5fa', fontWeight: 600, marginTop: 2 }}>→ {getArchetype(hProfT.archetype, isF)}</div>
                              <div style={{ fontSize: 11, color: P.textDim, marginTop: 4, lineHeight: 1.6 }}>{hProfT.action}</div>
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
          )}

          {/* ══ Mode TAROT ══ */}
          {tirageMode === 'tarot' && (
          <div>
            {/* Onboarding */}
            <div style={{ fontSize: 11, color: P.textDim, lineHeight: 1.7, marginBottom: 14, fontStyle: 'italic', padding: '8px 10px', background: P.surface, borderRadius: 8, border: `1px solid ${P.cardBdr}` }}>
              {TAROT_ONBOARDING}
            </div>

            {/* Toggle 1 carte / 3 cartes — Ronde S3 */}
            {tarotPhase !== 'result' && tarot3Phase !== 'result' && (
              <div style={{ display: 'flex', gap: 0, marginBottom: 12, borderRadius: 8, overflow: 'hidden', border: `1px solid ${P.cardBdr}`, width: 'fit-content' }}>
                {([['1card', '🎴 1 carte'], ['3cards', '🎴 3 cartes']] as const).map(([k, label]) => (
                  <button key={k} onClick={() => setTarotCardMode(k)} aria-label={`Mode Tarot: ${k === '1card' ? '1 carte' : '3 cartes'}`} style={{
                    padding: '6px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    background: tarotCardMode === k ? `${P.gold}18` : P.surface,
                    color: tarotCardMode === k ? P.gold : P.textDim,
                    border: 'none', borderRight: k === '1card' ? `1px solid ${P.cardBdr}` : 'none',
                    transition: 'all 0.2s', fontFamily: 'inherit',
                  }}>{label}</button>
                ))}
              </div>
            )}

            {/* Zone de saisie — 1 carte */}
            {tarotCardMode === '1card' && tarotPhase !== 'result' && (
              <>
                <textarea
                  value={tarotQuestion}
                  onChange={e => setTarotQuestion(e.target.value)}
                  placeholder="Ex: Quel regard porter sur cette situation ? Qu'est-ce que mon inconscient met en avant ?"
                  maxLength={200} rows={2}
                  style={{ width: '100%', background: P.surface, border: `1px solid ${P.cardBdr}`, borderRadius: 8, padding: '10px 12px', color: P.text, fontSize: 12, resize: 'none', lineHeight: 1.6, boxSizing: 'border-box' }}
                />
                <div style={{ fontSize: 10, color: P.textDim, textAlign: 'right', marginTop: 3 }}>{tarotQuestion.length}/200</div>
                <div style={{ position: 'relative', marginTop: 10 }}>
                  <button
                    onMouseDown={() => tarotQuestion.trim() && tarotPhase !== 'drawing' && setHoldTarget('tarot1')}
                    onMouseUp={() => holdTarget === 'tarot1' && setHoldTarget(null)}
                    onMouseLeave={() => holdTarget === 'tarot1' && setHoldTarget(null)}
                    onTouchStart={() => tarotQuestion.trim() && tarotPhase !== 'drawing' && setHoldTarget('tarot1')}
                    onTouchEnd={() => holdTarget === 'tarot1' && setHoldTarget(null)}
                    disabled={!tarotQuestion.trim() || tarotPhase === 'drawing'}
                    aria-label="Tirer une carte de Tarot"
                    style={{ width: '100%', padding: 12, background: tarotQuestion.trim() ? `${P.gold}15` : P.surface, border: `1px solid ${tarotQuestion.trim() ? P.gold + '44' : P.cardBdr}`, borderRadius: 8, color: tarotQuestion.trim() ? P.gold : P.textDim, fontSize: 13, fontWeight: 700, cursor: tarotQuestion.trim() && tarotPhase !== 'drawing' ? 'pointer' : 'not-allowed', letterSpacing: 1, transition: 'all 0.2s', fontFamily: 'inherit', position: 'relative', overflow: 'hidden' }}
                  >
                    {holdTarget === 'tarot1' && <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${holdProgress}%`, background: `${P.gold}20`, transition: 'width 0.05s linear', borderRadius: 8 }} />}
                    <span style={{ position: 'relative', zIndex: 1 }}>
                      {tarotPhase === 'drawing' ? '🎴  Tirage en cours…' : holdTarget === 'tarot1' ? '🎴  Concentre-toi sur ta question…' : '🎴  Maintiens 3s pour tirer'}
                    </span>
                  </button>
                </div>
              </>
            )}

            {/* Zone de saisie — 3 cartes */}
            {tarotCardMode === '3cards' && tarot3Phase !== 'result' && (
              <>
                <div style={{ fontSize: 11, color: P.textDim, lineHeight: 1.6, marginBottom: 8, fontStyle: 'italic' }}>
                  Tirage approfondi — 3 Arcanes pour éclairer ta question sous 3 angles : ce qui se joue, ce qui te met à l'épreuve, et le conseil du moment.
                </div>
                <textarea
                  value={tarotQuestion}
                  onChange={e => setTarotQuestion(e.target.value)}
                  placeholder="Ex: Comment aborder cette transition ? Que dois-je comprendre de cette situation ?"
                  maxLength={200} rows={2}
                  style={{ width: '100%', background: P.surface, border: `1px solid ${P.cardBdr}`, borderRadius: 8, padding: '10px 12px', color: P.text, fontSize: 12, resize: 'none', lineHeight: 1.6, boxSizing: 'border-box' }}
                />
                <div style={{ fontSize: 10, color: P.textDim, textAlign: 'right', marginTop: 3 }}>{tarotQuestion.length}/200</div>
                <div style={{ position: 'relative', marginTop: 10 }}>
                  <button
                    onMouseDown={() => tarotQuestion.trim() && tarot3Phase !== 'drawing' && setHoldTarget('tarot3')}
                    onMouseUp={() => holdTarget === 'tarot3' && setHoldTarget(null)}
                    onMouseLeave={() => holdTarget === 'tarot3' && setHoldTarget(null)}
                    onTouchStart={() => tarotQuestion.trim() && tarot3Phase !== 'drawing' && setHoldTarget('tarot3')}
                    onTouchEnd={() => holdTarget === 'tarot3' && setHoldTarget(null)}
                    disabled={!tarotQuestion.trim() || tarot3Phase === 'drawing'}
                    aria-label="Tirer trois cartes de Tarot"
                    style={{ width: '100%', padding: 12, background: tarotQuestion.trim() ? `${P.gold}15` : P.surface, border: `1px solid ${tarotQuestion.trim() ? P.gold + '44' : P.cardBdr}`, borderRadius: 8, color: tarotQuestion.trim() ? P.gold : P.textDim, fontSize: 13, fontWeight: 700, cursor: tarotQuestion.trim() && tarot3Phase !== 'drawing' ? 'pointer' : 'not-allowed', letterSpacing: 1, transition: 'all 0.2s', fontFamily: 'inherit', position: 'relative', overflow: 'hidden' }}
                  >
                    {holdTarget === 'tarot3' && <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${holdProgress}%`, background: `${P.gold}20`, transition: 'width 0.05s linear', borderRadius: 8 }} />}
                    <span style={{ position: 'relative', zIndex: 1 }}>
                      {tarot3Phase === 'drawing' ? '🎴  Tirage en cours…' : holdTarget === 'tarot3' ? '🎴  Concentre-toi sur ta question…' : '🎴  Maintiens 3s pour tirer'}
                    </span>
                  </button>
                </div>
              </>
            )}

            {/* Résultat tirage Tarot */}
            {tarotPhase === 'result' && tarotDraw && (
              <div>
                {/* Question */}
                <div style={{ marginBottom: 14, padding: '8px 12px', background: `${P.gold}08`, borderRadius: 8, border: `1px solid ${P.gold}18` }}>
                  <div style={{ fontSize: 10, color: P.gold, fontWeight: 700, marginBottom: 4 }}>🎴 Ta question</div>
                  <div style={{ fontSize: 12, color: P.textMid, fontStyle: 'italic' }}>« {tarotDraw.question} »</div>
                </div>

                {/* Carte tirée */}
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 14 }}>
                  <div style={{
                    width: 64, height: 100, borderRadius: 8,
                    border: `2px solid ${P.gold}55`, overflow: 'hidden', flexShrink: 0,
                    transform: tarotDraw.isReversed ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.3s', background: `${P.gold}08`,
                  }}>
                    <img src={tarotDraw.arcana.image} alt={tarotDraw.arcana.name_fr} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: P.textDim }}>Arcane {tarotDraw.arcana.num}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: P.text }}>{tarotDraw.arcana.name_fr}</div>
                    <div style={{ fontSize: 12, color: P.gold, fontWeight: 600, marginTop: 3 }}>{tarotDraw.arcana.theme}</div>
                    {tarotDraw.isReversed && (
                      <div style={{ fontSize: 10, color: '#ef4444', marginTop: 4, padding: '2px 8px', background: '#ef444415', borderRadius: 10, display: 'inline-block' }}>
                        ↕ Renversé
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: P.textMid, marginTop: 6, lineHeight: 1.5 }}>
                      {tarotDraw.isReversed
                        ? <span>⚠ <b style={{ color: '#f87171' }}>Ombre :</b> {tarotDraw.arcana.shadow}</span>
                        : <span>✦ <b style={{ color: '#4ade80' }}>Lumière :</b> {tarotDraw.arcana.light}</span>
                      }
                    </div>
                  </div>
                </div>

                {/* Narration */}
                <div style={{ marginBottom: 14, padding: '10px 12px', background: `${P.gold}06`, borderRadius: 8, border: `1px solid ${P.gold}12`, borderLeft: `3px solid ${P.gold}44` }}>
                  <div style={{ fontSize: 10, color: P.gold, fontWeight: 700, marginBottom: 6 }}>🎴 Miroir du moment</div>
                  <div style={{ fontSize: 13, color: P.textMid, lineHeight: 1.8, fontStyle: 'italic' }}>
                    {tarotDraw.arcana.narrative}
                  </div>
                </div>

                {/* Journal personnel — Ronde Q8 P2 */}
                <JournalNote drawId={`tarot1-${tarotDraw.timestamp}`} />

                {/* Bouton nouveau tirage */}
                <button
                  onClick={() => { setTarotPhase('idle'); setTarotDraw(null); setTarotQuestion(''); }}
                  style={{ width: '100%', padding: '10px', background: P.surface, border: `1px solid ${P.cardBdr}`, borderRadius: 8, color: P.textMid, fontSize: 12, cursor: 'pointer', marginBottom: 4, marginTop: 10, fontFamily: 'inherit' }}
                >
                  ↩ Nouveau tirage
                </button>
              </div>
            )}

            {/* ── Résultat tirage 3 cartes — Ronde S3 ── */}
            {tarot3Phase === 'result' && tarot3Draw && (
              <div>
                {/* Question */}
                <div style={{ marginBottom: 14, padding: '8px 12px', background: `${P.gold}08`, borderRadius: 8, border: `1px solid ${P.gold}18` }}>
                  <div style={{ fontSize: 10, color: P.gold, fontWeight: 700, marginBottom: 4 }}>🎴 Ta question — Tirage 3 cartes</div>
                  <div style={{ fontSize: 12, color: P.textMid, fontStyle: 'italic' }}>« {tarot3Draw.question} »</div>
                </div>

                {/* 3 cartes côte à côte */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                  {tarot3Draw.cards.map((card, i) => (
                    <div key={i} style={{ flex: 1, padding: '10px 8px', background: P.surface, borderRadius: 10, border: `1px solid ${P.cardBdr}`, textAlign: 'center' }}>
                      {/* Position label */}
                      <div style={{ fontSize: 10, color: P.gold, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                        {card.position.icon} {card.position.label}
                      </div>
                      {/* Image */}
                      <div style={{
                        width: 54, height: 86, borderRadius: 6, margin: '0 auto 8px',
                        border: `2px solid ${P.gold}44`, overflow: 'hidden',
                        transform: card.isReversed ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.3s', background: `${P.gold}08`,
                      }}>
                        <img src={card.arcana.image} alt={card.arcana.name_fr} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                      </div>
                      {/* Nom & thème */}
                      <div style={{ fontSize: 13, fontWeight: 700, color: P.text }}>{card.arcana.name_fr}</div>
                      <div style={{ fontSize: 10, color: P.gold, fontWeight: 600, marginTop: 2 }}>{card.arcana.theme}</div>
                      {card.isReversed && (
                        <div style={{ fontSize: 9, color: '#ef4444', marginTop: 4, padding: '1px 6px', background: '#ef444415', borderRadius: 8, display: 'inline-block' }}>↕ Renversé</div>
                      )}
                      {/* Light / Shadow — position Conseil renversée = message constructif */}
                      <div style={{ fontSize: 10, color: P.textMid, marginTop: 6, lineHeight: 1.5, textAlign: 'left' }}>
                        {card.isReversed
                          ? (card.position.key === 'conseil'
                            ? <span>🔓 <b style={{ color: '#fbbf24' }}>Libère-toi :</b> {getConseilReverseText(card.arcana.num)}</span>
                            : <span>⚠ <b style={{ color: '#f87171' }}>Ombre :</b> {card.arcana.shadow}</span>)
                          : <span>✦ <b style={{ color: '#4ade80' }}>Lumière :</b> {card.arcana.light}</span>
                        }
                      </div>
                    </div>
                  ))}
                </div>

                {/* Narrations des 3 cartes */}
                {tarot3Draw.cards.map((card, i) => (
                  <div key={i} style={{ marginBottom: 10, padding: '8px 12px', background: `${P.gold}06`, borderRadius: 8, border: `1px solid ${P.gold}12`, borderLeft: `3px solid ${P.gold}44` }}>
                    <div style={{ fontSize: 10, color: P.gold, fontWeight: 700, marginBottom: 4 }}>{card.position.icon} {card.position.label} — {card.arcana.name_fr}</div>
                    <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.7, fontStyle: 'italic' }}>{card.arcana.narrative}</div>
                  </div>
                ))}

                {/* Journal personnel — Ronde Q8 P2 */}
                <JournalNote drawId={`tarot3-${tarot3Draw.timestamp}`} />

                {/* Bouton nouveau tirage */}
                <button
                  onClick={() => { setTarot3Phase('idle'); setTarot3Draw(null); setTarotQuestion(''); }}
                  style={{ width: '100%', padding: '10px', background: P.surface, border: `1px solid ${P.cardBdr}`, borderRadius: 8, color: P.textMid, fontSize: 12, cursor: 'pointer', marginBottom: 4, marginTop: 10, fontFamily: 'inherit' }}
                >
                  ↩ Nouveau tirage
                </button>
              </div>
            )}

            {/* Historique Tarot 1 carte */}
            {tarotHistory.length > 0 && (
              <div style={{ marginTop: 18 }}>
                <div style={{ fontSize: 10, color: P.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Tirages précédents</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {tarotHistory.slice(0, 5).map(h => {
                    const isExp = expandedTarotId === h.id;
                    const arc = getArcana(h.arcanaNum);
                    return (
                      <div key={h.id}>
                        <div style={{ padding: '8px 12px', borderRadius: isExp ? '8px 8px 0 0' : 8, background: P.surface, border: `1px solid ${P.cardBdr}`, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                          {...a11yClick(() => setExpandedTarotId(isExp ? null : h.id))} aria-label={`Détails du tirage Tarot ${h.arcanaName}`} aria-expanded={isExp}>
                          <div style={{ width: 28, height: 44, borderRadius: 4, overflow: 'hidden', flexShrink: 0, border: `1px solid ${P.gold}30` }}>
                            <img src={arc.image} alt={h.arcanaName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 11, color: P.textMid, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>« {h.question} »</div>
                            <div style={{ fontSize: 10, color: P.textDim, marginTop: 2 }}>
                              Arcane {h.arcanaNum} · {h.arcanaName}
                              {h.isReversed && <span style={{ color: '#f87171' }}> ↕ renversé</span>}
                            </div>
                          </div>
                          <div style={{ fontSize: 12, color: P.gold, opacity: 0.7, padding: '2px 6px', background: `${P.gold}10`, borderRadius: 4 }}>{isExp ? '▲' : '▼'}</div>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteTarotDraw(h.id); setTarotHistory(loadTarotHistory()); setExpandedTarotId(null); }}
                            style={{ flexShrink: 0, width: 24, height: 24, borderRadius: 6, border: 'none', background: '#ef444415', color: '#ef4444', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}
                            title="Supprimer ce tirage"
                          >✕</button>
                        </div>
                        {isExp && (
                          <div style={{ padding: '12px 14px', background: `${P.surface}cc`, border: `1px solid ${P.cardBdr}`, borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
                            <div style={{ fontSize: 12, color: P.textMid, fontStyle: 'italic', marginBottom: 10 }}>« {h.question} »</div>
                            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 10 }}>
                              <div style={{
                                width: 54, height: 86, borderRadius: 6, border: `2px solid ${P.gold}44`, overflow: 'hidden', flexShrink: 0,
                                transform: h.isReversed ? 'rotate(180deg)' : 'none', background: `${P.gold}08`,
                              }}>
                                <img src={arc.image} alt={arc.name_fr} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                              </div>
                              <div>
                                <div style={{ fontSize: 16, fontWeight: 700, color: P.text }}>{arc.name_fr}</div>
                                <div style={{ fontSize: 11, color: P.gold, fontWeight: 600, marginTop: 2 }}>{arc.theme}</div>
                                {h.isReversed && <div style={{ fontSize: 9, color: '#ef4444', marginTop: 4, padding: '1px 6px', background: '#ef444415', borderRadius: 8, display: 'inline-block' }}>↕ Renversé</div>}
                                <div style={{ fontSize: 11, color: P.textMid, marginTop: 6, lineHeight: 1.5 }}>
                                  {h.isReversed
                                    ? <span>⚠ <b style={{ color: '#f87171' }}>Ombre :</b> {arc.shadow}</span>
                                    : <span>✦ <b style={{ color: '#4ade80' }}>Lumière :</b> {arc.light}</span>
                                  }
                                </div>
                              </div>
                            </div>
                            <div style={{ padding: '8px 10px', background: `${P.gold}06`, borderRadius: 8, borderLeft: `3px solid ${P.gold}44` }}>
                              <div style={{ fontSize: 10, color: P.gold, fontWeight: 700, marginBottom: 4 }}>🎴 Miroir du moment</div>
                              <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.7, fontStyle: 'italic' }}>{arc.narrative}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Historique Tarot 3 cartes */}
            {tarot3History.length > 0 && (
              <div style={{ marginTop: 18 }}>
                <div style={{ fontSize: 10, color: P.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Tirages 3 cartes précédents</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {tarot3History.slice(0, 5).map(h => {
                    const isExp = expanded3CardId === h.id;
                    return (
                      <div key={h.id}>
                        <div style={{ padding: '8px 12px', borderRadius: isExp ? '8px 8px 0 0' : 8, background: P.surface, border: `1px solid ${P.cardBdr}`, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                          {...a11yClick(() => setExpanded3CardId(isExp ? null : h.id))} aria-label="Détails du tirage 3 cartes" aria-expanded={isExp}>
                          <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                            {h.cards.map((c, ci) => (
                              <div key={ci} style={{ width: 20, height: 32, borderRadius: 3, overflow: 'hidden', border: `1px solid ${P.gold}30` }}>
                                <img src={getArcana(c.arcanaNum).image} alt={c.arcanaName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                              </div>
                            ))}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 11, color: P.textMid, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>« {h.question} »</div>
                            <div style={{ fontSize: 10, color: P.textDim, marginTop: 2 }}>
                              {h.cards.map(c => c.arcanaName).join(' · ')}
                            </div>
                          </div>
                          <div style={{ fontSize: 12, color: P.gold, opacity: 0.7, padding: '2px 6px', background: `${P.gold}10`, borderRadius: 4 }}>{isExp ? '▲' : '▼'}</div>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteTarot3CardDraw(h.id); setTarot3History(loadTarot3CardHistory()); setExpanded3CardId(null); }}
                            style={{ flexShrink: 0, width: 24, height: 24, borderRadius: 6, border: 'none', background: '#ef444415', color: '#ef4444', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}
                            title="Supprimer ce tirage"
                          >✕</button>
                        </div>
                        {isExp && (
                          <div style={{ padding: '12px 14px', background: `${P.surface}cc`, border: `1px solid ${P.cardBdr}`, borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
                            <div style={{ fontSize: 12, color: P.textMid, fontStyle: 'italic', marginBottom: 10 }}>« {h.question} »</div>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                              {h.cards.map((c, ci) => {
                                const arc = getArcana(c.arcanaNum);
                                const pos = TAROT_3CARD_POSITIONS.find(p => p.key === c.positionKey) || TAROT_3CARD_POSITIONS[ci];
                                return (
                                  <div key={ci} style={{ flex: 1, textAlign: 'center', padding: '8px 6px', background: `${P.gold}06`, borderRadius: 8, border: `1px solid ${P.cardBdr}` }}>
                                    <div style={{ fontSize: 9, color: P.gold, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{pos.icon} {pos.label}</div>
                                    <div style={{
                                      width: 42, height: 66, borderRadius: 5, margin: '0 auto 6px', border: `1px solid ${P.gold}44`, overflow: 'hidden',
                                      transform: c.isReversed ? 'rotate(180deg)' : 'none', background: `${P.gold}08`,
                                    }}>
                                      <img src={arc.image} alt={arc.name_fr} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                                    </div>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: P.text }}>{arc.name_fr}</div>
                                    <div style={{ fontSize: 9, color: P.gold }}>{arc.theme}</div>
                                    {c.isReversed && <div style={{ fontSize: 8, color: '#ef4444', marginTop: 2 }}>↕ Renversé</div>}
                                    <div style={{ fontSize: 9, color: P.textMid, marginTop: 4, lineHeight: 1.4, textAlign: 'left' }}>
                                      {c.isReversed
                                        ? (c.positionKey === 'conseil' ? `🔓 ${getConseilReverseText(arc.num)}` : `⚠ ${arc.shadow}`)
                                        : `✦ ${arc.light}`}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          )}

        </Cd>
      </Sec>
    </div>
  );
}
