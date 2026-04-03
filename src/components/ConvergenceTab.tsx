import { useState, useMemo, useEffect, useCallback } from 'react';
import { sto } from '../engines/storage';
import { type SoulData } from '../App';
import { getHexProfile } from '../engines/iching';
import { getMoonPhase, getLunarEvents } from '../engines/moon';
import { Sec, Cd, P, a11yClick } from './ui';
import FeedbackWidget from './FeedbackWidget';
import { getInteractionsSummary, type InteractionResult } from '../engines/interactions';
import { type PSIResult } from '../engines/temporal';
import { DASHA_NARRATIVES, PRATYANTAR_NARRATIVES } from '../engines/vimshottari'; // V5.2
import { calcDayPreview, estimateSlowTransitBonus, COSMIC_THRESHOLD, type DayPreview } from '../engines/convergence'; // V8 J+1 + momentum + soft-shift align
// buildNatalDashaCtx plus nécessaire ici — calcMonthPreviews le construit en interne
import { calcTemporalLayers } from '../engines/temporal-layers'; // Oracle split — temporal context
import { calcAlignment, buildSynthesisPhrase } from '../engines/alignment'; // Oracle split — alignment badge
import { getDayFeedback, saveDayFeedback, storeTodayDeltas, loadDeltas, getAlphaGObservability } from '../engines/validation-tracker'; // V9.0 P5 + AD
import { calcVectorMomentum } from '../engines/vectorEngine'; // V8 momentum EMA
import { getCurrentPlanetaryHour, getBestHoursToday, planetFr } from '../engines/planetary-hours'; // V9 Sprint 4
import { INCLUSION_DOMAIN_MAP } from '../engines/numerology'; // V9 Sprint 5 — badge inclusion
import { getArcana, calcTarotDayNumber, calcPersonalDayCard, DASHA_ARCANA_MAP } from '../engines/tarot'; // V9 Sprint 6 + 8a + Ronde3
import { getCalibOffset, getCalibState, setCalibProfile, recordCalibSkip, shouldShowCalibOverlay, PROFILE_LABELS, type CalibProfile } from '../engines/calibration'; // Sprint AC — user_calibration_offset
// Phase 3c — runWeeklyAlphaGUpdate/runWeeklyPredictiveValidation centralisés dans App.tsx

// V4.0: Couleurs des 6 domaines contextuels
const DOMAIN_COLORS: Record<string, string> = {
  BUSINESS: '#4ade80', AMOUR: '#f472b6', RELATIONS: '#60a5fa', CREATIVITE: '#f59e0b', INTROSPECTION: '#c084fc', VITALITE: '#fb923c',
};

// ── Couleurs Alignement (from Oracle temporal context) ──
const ALIGNMENT_BADGE_BG: Record<string, string> = {
  autoroute_cosmique:  '#00CED115', effort_recompense:   '#FFA50015',
  illusion_fluidite:   '#6699CC15', tempete_cosmique:    '#4B008215',
  faux_pas_passager:   '#90EE9015', percee_lumineuse:    '#0080FF15',
  oasis_ephemere:      '#FF00FF15', tension_de_surface:  '#CC884415',
};
const ALIGNMENT_BADGE_BDR: Record<string, string> = {
  autoroute_cosmique:  '#00CED150', effort_recompense:   '#FFA50050',
  illusion_fluidite:   '#6699CC50', tempete_cosmique:    '#4B008250',
  faux_pas_passager:   '#90EE9050', percee_lumineuse:    '#0080FF50',
  oasis_ephemere:      '#FF00FF50', tension_de_surface:  '#CC884450',
};

// Phrase explicative par niveau de score
function getLevelDesc(score: number, confidence?: number): string {
  const lowConf = confidence !== undefined && confidence < 60;
  if (score >= COSMIC_THRESHOLD) return lowConf ? 'Score très élevé, mais les indicateurs ne sont pas tous d\'accord — reste vigilant' : 'Alignement exceptionnel — fenêtre cosmique rare, saisis-la';
  if (score >= 85) return lowConf ? 'Bon potentiel, mais certains signaux invitent à la prudence' : 'Toutes les conditions sont réunies pour agir';
  if (score >= 70) return lowConf ? 'Énergie positive avec quelques réserves — avance sélectivement' : 'Énergie porteuse — avance avec confiance';
  if (score >= 55) return 'Contexte positif — reste attentif aux signaux';
  if (score >= 40) return 'Phase de préparation — consolide tes acquis';
  return 'Journée de recul — observe avant d\'agir';
}

// V3.2.1: Phrase de confiance humaine (remplace le % ambigu)

// Génère le Brief du Jour
function buildBrief(data: SoulData, rarity?: { icon: string; label: string; rank: number; percentage: number } | null): string {
  const { conv, num, iching } = data;
  const dt = conv.dayType;
  const cl = conv.climate;
  const ar = conv.actionReco;
  const moon = getMoonPhase();
  const qualBrief = (s: number) => s >= 80 ? 'très porteur' : s >= 65 ? 'porteur' : s >= 45 ? 'modéré' : 'en retrait';
  // ═══ FIX BRIEF — Utiliser le même score affiché (avec calibOffset) ═══
  const _briefScore = Math.max(0, Math.min(100, Math.round(conv.score + getCalibOffset())));
  const line1 = `📊 Score du jour : ${_briefScore}/100 — ${conv.level.replace(/^[^\s]+ /, '')}`;
  const lineNarr = conv.scoreLevel?.narrative ? `💬 ${conv.scoreLevel.narrative}` : '';
  const _isCosmic = _briefScore >= COSMIC_THRESHOLD;
  const _cosmicLabel = _isCosmic
    ? (dt.type === 'decision' ? 'Décision majeure' : dt.type === 'communication' ? 'Connexion forte' : dt.type === 'expansion' ? 'Expansion puissante' : dt.type === 'observation' ? 'Vision claire' : 'Introspection profonde')
    : dt.label;
  // FIX: Si Mercure négatif, nuancer la desc Décision (cohérence avec narrative somatique "gorge bloque")
  const _mercNeg = conv.scoreLevel?.narrative?.includes('gorge bloque') || conv.scoreLevel?.narrative?.includes('silence');
  const _cosmicDesc = _isCosmic
    ? (dt.type === 'decision' ? (_mercNeg ? 'Décide avec force, mais valide en silence avant d\'agir' : 'Journée idéale pour trancher et s\'engager') : dt.type === 'communication' ? 'Tes échanges portent loin aujourd\'hui' : dt.type === 'expansion' ? 'Le terrain est grand ouvert — avance' : dt.type === 'observation' ? 'Lucidité exceptionnelle — tranche avec précision' : 'Connexion intérieure puissante — profites-en')
    : dt.desc;
  const line2 = `${dt.icon} Journée ${_cosmicLabel} · ${_cosmicDesc}`;
  const lineAR = ar ? `${ar.icon} Action : ${ar.label} — ${ar.conseil}` : '';
  // Lune modulée par score (même fonction que l'UI — cohérence garantie)
  // moonPhaseAction retourne "Phase — action", on extrait juste l'action pour éviter de doubler le nom
  const moonAction = moonPhaseAction(moon.name, conv.score).split(' — ').slice(1).join(' — ') || moonPhaseAction(moon.name, conv.score);
  const lineMoon = `${moon.emoji} ${moon.name} (${moon.illumination}%) — ${moonAction}`;
  const line3 = `📈 Semaine ${cl.week.label} · Mois ${cl.month.label} · Année ${cl.year.label}`;
  const line4 = `☰ Yi King #${iching.hexNum} ${iching.name} → ${iching.keyword}`;
  // ═══ FIX RARITY BRIEF — Utiliser la rareté corrigée (baseline année réelle) ═══
  // Ronde #26 (3/3) : rang ordinal supprimé — remplacé par "Fenêtre de levier" pour les jours rares.
  // Le rang brut ("2e meilleur jour") crée une pression de performance toxique (Yerkes-Dodson).
  const _r = rarity ?? conv.rarityIndex;
  const lineRarity = _r
    ? (_r.percentage <= 5 ? `${_r.icon} ${_r.label} — Fenêtre de levier (≈ 12 fois/an)` : `${_r.icon} ${_r.label}`)
    : '';
  const lineBaZi = conv.baziDaily ? `☯ Énergie du jour : ${conv.baziDaily.dailyStem.element} — ${conv.baziDaily.interaction.dynamique.split('.')[0]}` : '';
  // ═══ FIX COHÉRENCE BRIEF↔PILOTAGE — Mêmes qualificateurs que les cartes Force/Vigilance ═══
  // Pilotage utilise forceQual (top domain) et vigilQual (worst domain) avec des labels différents :
  //   forceQual: Très porteur / Porteur / Modéré / Discret
  //   vigilQual: Sous contrôle / À surveiller / Fragile / En tension
  // Le Brief doit utiliser les MÊMES qualificateurs pour éviter la dissonance 🔴 + "modéré".
  const forceQualBrief = (s: number) => s >= 80 ? 'très porteur' : s >= 65 ? 'porteur' : s >= 45 ? 'modéré' : 'discret';
  const vigilQualBrief = (s: number) => s >= 65 ? 'sous contrôle' : s >= 45 ? 'à surveiller' : s >= 30 ? 'fragile' : 'en tension';
  const lineCtx = conv.contextualScores ? (() => {
    const domains = conv.contextualScores!.domains;
    const worstDomain = conv.contextualScores!.worstDomain;
    const sorted = [...domains].sort((a, b) => b.score - a.score);
    const top2Ids = new Set(sorted.slice(0, 2).map(d => d.domain));
    return domains.map(d => {
      // Qualifier adapté au rôle du domaine (même grille que les cartes Pilotage)
      // FIX: Si le worstDomain a un score ≥65, utiliser forceQualBrief (cohérence avec carte Pilotage)
      const qual = top2Ids.has(d.domain) ? forceQualBrief(d.score)
                 : d.domain === worstDomain ? (d.score >= 65 ? forceQualBrief(d.score) : vigilQualBrief(d.score))
                 : qualBrief(d.score);
      // Top 2 domaines = favorisés (même logique que le bloc "Domaines favorisés" du Pilotage)
      // FIX: Si le worstDomain a un score ≥65, pas de 🔴 (score élevé = pas vraiment une alerte)
      const prefix = top2Ids.has(d.domain) ? '🟢' : d.domain === worstDomain ? (d.score >= 65 ? '🟡' : '🔴') : ' ';
      return `  ${prefix} ${d.icon} ${d.label} ${qual} — ${d.directive || ''}`;
    }).join('\n');
  })() : '';
  const line10Gods = conv.tenGods?.dominant ? `✦ ${tenGodHuman(conv.tenGods.dominant.label)}` : '';
  return [
    `🔮 Kaironaute — Brief du ${new Date().toLocaleDateString('fr-FR')}`,
    '', line1, lineNarr, line2, lineAR, lineMoon, lineBaZi, line10Gods,
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

// Noms fonctionnels courts des lords Dasha (évite "Rahu", "Saturne" en brut)
const DASHA_LORD_LABEL: Record<string, string> = {
  Ketu:    'Élagage',
  Vénus:   'Attraction',
  Soleil:  'Autorité',
  Lune:    'Intuition',
  Mars:    'Action',
  Rahu:    'Ambition',
  Jupiter: 'Expansion',
  Saturne: 'Structure',
  Mercure: 'Adaptation',
};

// V5.2 — Couleur tonale par seigneur
const DASHA_COLOR: Record<string, string> = {
  Ketu:    '#a78bfa', Vénus:   '#f472b6', Soleil:  '#fbbf24',
  Lune:    '#60a5fa', Mars:    '#f87171', Rahu:    '#c084fc',
  Jupiter: '#4ade80', Saturne: '#94a3b8', Mercure: '#38bdf8',
};

// Ronde 20 — Posture du Jour (3 postures claires : AGIR / AJUSTER / RALENTIR)
interface PostureResult {
  label: string;
  icon: string;
  color: string;
  tagline: string;
}
function getPosture(_score: number, verb: string): PostureResult {
  if (verb === 'agir')     return { label: 'AGIR',     icon: '🚀', color: '#4ade80', tagline: 'Le contexte est favorable — avance' };
  if (verb === 'ajuster')  return { label: 'AJUSTER',  icon: '🌟', color: '#f59e0b', tagline: 'Avance avec discernement' };
  return                          { label: 'RALENTIR', icon: '🛡', color: '#ef4444', tagline: 'Protège tes acquis' };
}

// AA-4 — "Courant de Fond" : 3 états sémantiques sans jargon indien (Gemini M3 Ronde 2)
// Seuils : [-1, -0.22[ = En tension / [-0.22, +0.22] = Neutre / ]+0.22, +1] = Porteuse
// Zéro mot technique : utilisateur comprend en 2 secondes si c'est bon ou mauvais pour lui aujourd'hui.
function getVedicReadout(sig: number | undefined): { label: string; icon: string; color: string; hint: string } {
  if (sig === undefined) return { label: 'Non évalué',       icon: '○',  color: '#4b5563', hint: '' };
  // Ronde Pilotage P7 : seuil abaissé 0.30→0.22 (0.28 = signal védique fort, pas "Neutre")
  if (sig >=  0.22) return      { label: 'Porteuse',     icon: '🌬️', color: '#4ade80', hint: 'Tes cycles profonds sont bien synchronisés' };
  if (sig >= -0.22) return      { label: 'Neutre',       icon: '〰️', color: '#94a3b8', hint: 'Ni frein ni élan — fond stable' };
  return                        { label: 'En tension',   icon: '🌊', color: '#f59e0b', hint: 'Prends ton temps, les courants de fond freinent' };
}

// Ronde 21-bis — Traduction phases lunaires en langage action (jargon interdit en surface)
function dayTypeHuman(label: string): string {
  switch (label.toLowerCase()) {
    case 'décision': return 'Jour d\'action';
    case 'decision': return 'Jour d\'action';
    case 'observation': return 'Jour d\'observation';
    case 'communication': return 'Jour d\'échanges';
    case 'retrait': return 'Journée d\'intériorité';
    case 'expansion': return 'Jour d\'expansion';
    default: return label;
  }
}
function dayTypeHint(label: string, score?: number): string {
  const low = score !== undefined && score < 65;
  switch (label.toLowerCase()) {
    case 'décision': case 'decision': return low ? 'prépare tes décisions avec prudence' : 'lance, signe, décide';
    case 'observation': return low ? 'observe, analyse, prends du recul' : 'lucidité aiguisée — agis avec précision sur tes vraies priorités';
    case 'communication': return low ? 'échange en douceur, écoute plus que tu ne parles' : 'échange, rencontre, communique';
    case 'retrait': return low ? 'repose-toi, digère, lâche prise' : 'intériorité puissante — médite, clarifie, ancre tes intentions';
    case 'expansion': return low ? 'explore à ton rythme, sans forcer' : 'explore, ose, élargis ton champ';
    default: return '';
  }
}

/** Ronde 21-bis — Traduction des 10 Dieux BaZi en langage compréhensible */
function tenGodHuman(label: string): string {
  const l = label.replace(/^[\u4e00-\u9fff\s]+/, '').trim().toLowerCase();
  if (l.includes('compagnon'))          return 'Énergie de coopération — appuie-toi sur tes alliés';
  if (l.includes('concurrent'))         return 'Énergie de compétition — dépasse-toi avec audace';
  if (l.includes('expression'))         return 'Énergie d\'expression — communique, partage tes idées';
  if (l.includes('création brute'))     return 'Énergie créative brute — innove, bouscule les codes';
  if (l.includes('richesse directe'))   return 'Énergie de gain stable — sécurise tes acquis';
  if (l.includes('richesse indirecte')) return 'Énergie d\'opportunité — saisis les chances imprévues';
  if (l.includes('autorité'))           return 'Énergie de structure — organise, cadre, décide';
  if (l.includes('pouvoir'))            return 'Énergie de transformation — affronte les défis de front';
  if (l.includes('soutien'))            return 'Énergie de sagesse — apprends, transmets, consolide';
  if (l.includes('intuition'))          return 'Énergie intuitive — fie-toi à ton instinct';
  return label;
}

function moonPhaseAction(name: string, score?: number): string {
  const n = name.toLowerCase();
  // Score bas (< 65) → tempérer les conseils d'action, garder les conseils de recul tels quels
  const low = score !== undefined && score < 65;
  if (n.includes('nouvelle'))           return 'Nouvelle Lune — pose tes intentions';
  if (n.includes('croissant') && n.includes('premier')) return low ? 'Premier Croissant — prépare tes projets en douceur' : 'Premier Croissant — lance tes projets';
  if (n.includes('premier quartier'))   return low ? 'Premier Quartier — réfléchis avant d\'engager' : 'Premier Quartier — décide et engage';
  if (n.includes('gibbeuse croissante')) return low ? 'Phase d\'accélération — peaufine sans forcer' : 'Phase d\'accélération — peaufine avant le pic';
  if (n.includes('pleine'))             return low ? 'Pleine Lune — observe et prends du recul' : 'Pleine Lune — récolte et célèbre';
  if (n.includes('gibbeuse décroissante') || n.includes('gibbeuse d')) return 'Phase de finalisation — partage et transmets';
  if (n.includes('dernier quartier'))   return 'Dernier Quartier — fais le tri';
  if (n.includes('décroissant'))        return 'Lune descendante — lâche prise et prépare';
  return name;
}

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

export default function ConvergenceTab({ data, psi, bd, bt, yearPreviews }: { data: SoulData; psi?: PSIResult | null; bd: string; bt?: string; yearPreviews: DayPreview[] | null }) {
  const { num, iching, conv } = data;
  const cv = conv;
  const dt = cv.dayType;
  const cl = cv.climate;
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // Ronde 20 — Accordéon helper (Progressive Disclosure)
  const toggleSection = useCallback((key: string) => {
    setExpanded(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }, []);
  const isOpen = useCallback((key: string) => expanded.has(key), [expanded]);
  const [expertMode, setExpertMode] = useState(false);
  const [paradoxSlider, setParadoxSlider] = useState(50); // AB-M1 — Slider Logique↔Instinct (Sprint AC connectera au calibration offset)
  // Sprint AC — Overlay calibration matin (Fluide / Équilibré / Exigeant)
  const [calibMode, setCalibMode] = useState<'ask' | null>(null);

  // V9.0 P5 — Blind Check-in : note hier AVANT de voir les scores d'aujourd'hui
  const [blindMode, setBlindMode] = useState<'ask' | 'result' | null>(null);
  const [blindRating, setBlindRating] = useState<number>(3);
  const [blindYesterday, setBlindYesterday] = useState<string>('');
  const [blindPredicted, setBlindPredicted] = useState<number>(0);
  const [blindLabel, setBlindLabel] = useState<string>('');
  const STAR_LABELS = ['', 'Difficile', 'Mitigé', 'Correct', 'Bon', 'Excellent'];

  // Ronde Pilotage P10 : helper date locale (pas UTC — évite décalage tarot après minuit)
  const localDateStr = (d: Date = new Date()) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // V9 Sprint 5 — Badge inclusion : Jour Personnel = leçon karmique
  const todayStr = localDateStr();
  const [inclBadgeDismissed, setInclBadgeDismissed] = useState<boolean>(
    () => sto.getRaw(`inclusionBadgeDismissed_${todayStr}`) === 'true'
  );
  // Trouve le manque karmique actif aujourd'hui (Jour Personnel ∈ kl[])
  const activeLack: number | null = (() => {
    const pdv = num.ppd?.v ?? 0;
    if (!num.kl || num.kl.length === 0) return null;
    if (num.kl.includes(pdv)) return pdv;
    return null;
  })();

  // Sprint AC — Overlay calibration : s'affiche après le blind check-in (ou directement si absent)
  useEffect(() => {
    if (blindMode === null && shouldShowCalibOverlay(todayStr)) {
      setCalibMode('ask');
    }
  }, [blindMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // AD — Stocker les deltas du jour pour blind check-in de demain (anti-leakage : scoreBrut = cv.score)
  useEffect(() => {
    if (cv.luneGroupDelta !== undefined) {
      storeTodayDeltas(
        todayStr,
        cv.luneGroupDelta ?? 0,
        cv.ephemGroupDelta ?? 0,
        cv.baziGroupDelta ?? 0,
        cv.score
      );
    }
  }, [todayStr]); // eslint-disable-line react-hooks/exhaustive-deps

  // Phase 3c — runWeeklyAlphaGUpdate + runWeeklyPredictiveValidation centralisés dans App.tsx

  // ── Oracle split — Contexte temporel (Cycle de fond + Alignement + Potentiel) ──
  const temporalCtx = useMemo(() => {
    try {
      const layers = calcTemporalLayers({
        luckPillars: data.luckPillars,
        num: data.num,
        currentScore: data.conv.score,
        birthDate: new Date(bd + 'T00:00:00'),
      });
      const alignment = calcAlignment({
        score: data.conv.score,
        tendanceScore: layers.tendance.score,
        fondLabel: layers.fond.label,
        tendanceLabel: layers.tendance.label,
        lpTransitionInMonths: layers.fond.pillarYearsLeft < 1
          ? Math.round(layers.fond.pillarYearsLeft * 12)
          : undefined,
      });
      const synthesisPhrase = buildSynthesisPhrase(alignment, {
        lpTransitionMonths: layers.fond.pillarYearsLeft < 0.67
          ? Math.round(layers.fond.pillarYearsLeft * 12)
          : undefined,
        ciZoneMutation: layers.ci.at6months.isZoneMutation,
      });
      return { layers, alignment, synthesisPhrase };
    } catch { return null; }
  }, [data, bd]);

  const submitBlindRating = useCallback(() => {
    if (!blindYesterday) return;
    const legacyRating: 'good' | 'neutral' | 'bad' = blindRating >= 4 ? 'good' : blindRating <= 2 ? 'bad' : 'neutral';
    // AD — récupérer les deltas d'hier stockés au chargement de la veille
    const yDeltas = loadDeltas(blindYesterday);
    saveDayFeedback(
      blindYesterday, blindPredicted, blindLabel, legacyRating,
      undefined, undefined, blindRating,
      undefined, undefined,
      yDeltas?.luneDelta, yDeltas?.ephemDelta, yDeltas?.baziDelta, yDeltas?.scoreBrut
    );
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
      ctx.fillText(String(displayScore), 270, 500); // AC-2
      // Level
      ctx.font = '700 24px system-ui,sans-serif';
      ctx.fillStyle = cv.lCol || '#FFD700';
      ctx.fillText(cv.level.replace(/^[^\s]+ /, '').toUpperCase(), 270, 555);
      // Arcane
      const arcDay = getArcana(calcPersonalDayCard(bd, todayStr));
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
          await navigator.share({ files: [file], title: `Mon Score du Jour — ${displayScore}%` }); // AC-2
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
  const isCosmique = cv.score >= COSMIC_THRESHOLD;
  // Sprint AC — score affiché avec offset de calibration (logique inchangée : cv.score brut)
  const calibOffset  = getCalibOffset();
  const displayScore = Math.max(0, Math.min(100, Math.round(cv.score + calibOffset)));
  const moon = getMoonPhase();
  const lunarEvents = getLunarEvents();

  // V8+V11.2 — Volatilité basée sur les 4 groupes Shapley (Lune, Astro, BaZi, Profil)
  // Comptage précis : combien de systèmes sur 4 sont d'accord (même direction)
  const volatility = useMemo(() => {
    const sh = cv.shapley;
    let vals: { label: string; v: number }[];
    if (sh) {
      vals = [
        { label: 'Cycles lunaires', v: sh.lune },
        { label: 'Transits planétaires', v: sh.ephem },
        { label: 'Astrologie chinoise', v: sh.bazi },
        { label: 'Thème personnel', v: sh.indiv },
      ];
    } else {
      // Fallback sur breakdown si Shapley indisponible
      const get = (sys: string) => cv.breakdown?.find(b => b.system === sys)?.points ?? 0;
      vals = [
        { label: 'Cycles lunaires', v: get('Nakshatra') },
        { label: 'Transits planétaires', v: get('Transit') },
        { label: 'Astrologie chinoise', v: get('BaZi') + get('10 Archétypes') },
        { label: 'Thème personnel', v: get('Numérologie') },
      ];
    }

    // Compter positifs / négatifs (seuil ±1 pour ignorer le bruit)
    const pos = vals.filter(v => v.v >= 1);
    const neg = vals.filter(v => v.v <= -1);
    const total = 4;
    const agree = Math.max(pos.length, neg.length);
    const disagree = Math.min(pos.length, neg.length);

    // Meilleur et pire système pour l'explication
    const sorted = [...vals].sort((a, b) => b.v - a.v);
    const bestSys = sorted[0].v >= 1 ? sorted[0].label : null;
    const worstSys = sorted[sorted.length - 1].v <= -1 ? sorted[sorted.length - 1].label : null;

    let explanation = '';
    if (bestSys && worstSys) {
      explanation = `${bestSys} sont favorables, ${worstSys} invitent à la prudence`;
    } else if (bestSys) {
      explanation = `${bestSys} sont particulièrement favorables aujourd'hui`;
    } else if (worstSys) {
      explanation = `${worstSys} invitent à ralentir`;
    }

    if (disagree === 0) return { index: 0, label: 'Signaux convergents', icon: '✓', color: '#4ade80', level: `${total} sur ${total} alignés`, explanation: 'Tous les systèmes pointent dans la même direction' };
    if (disagree === 1) return { index: 0.45, label: 'Quasi-alignement', icon: '◐', color: '#f59e0b', level: `${agree} signaux sur ${total} alignés`, explanation };
    if (disagree === 2) return { index: 0.65, label: 'Signaux partagés', icon: '⚠️', color: '#ef4444', level: `${agree} sur ${total} alignés`, explanation };
    return { index: 0.85, label: 'Signaux en tension', icon: '⚠️', color: '#ef4444', level: `${disagree} sur ${total} en opposition`, explanation };
  }, [cv.breakdown, cv.shapley]);

  // ═══ FIX COHÉRENCE PILOTAGE↔CALENDRIER — Même pipeline soft-shift ═══
  // yearPreviews est calculé en amont et passé comme prop (12 mois + soft-shift blend appliqué).
  // Pilotage utilise le même pipeline que le Calendrier pour que DEMAIN affiche le même score.
  const _yearSoftShifted = yearPreviews;

  // ── Blind Check-in : score prédit d'hier (APRÈS _yearSoftShifted pour cohérence) ──
  useEffect(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = localDateStr(yesterday);
    const existing = getDayFeedback(yStr);
    if (!existing?.userScore) {
      setBlindYesterday(yStr);
      setBlindMode('ask');
      // ═══ FIX COHÉRENCE — Score prédit d'hier via _yearSoftShifted (même pipeline) ═══
      // Fallback sur calcDayPreview brut si _yearSoftShifted pas encore dispo.
      try {
        const yFromYear = _yearSoftShifted?.find(p => p.date === yStr);
        if (yFromYear) {
          setBlindPredicted(yFromYear.score);
          setBlindLabel(yFromYear.dayType.type);
        } else {
          const tb = estimateSlowTransitBonus(data.astro ?? null);
          const preview = calcDayPreview(bd, data.num, data.cz, yStr, tb);
          if (preview) {
            setBlindPredicted(preview.score);
            setBlindLabel(preview.dayType.type);
          }
        }
      } catch { /* fail silently — modal reste fonctionnel sans score */ }
    }
  }, [_yearSoftShifted]); // eslint-disable-line react-hooks/exhaustive-deps

  // ═══ FIX RARITY — Recalcul depuis les vrais scores soft-shiftés de l'année ═══
  // La baseline MC du moteur est L1-only (BaZi+Nakshatra), biaisée par rapport au score LIVE.
  // Ici on compare le score d'aujourd'hui aux 365 scores réels du même pipeline → pommes vs pommes.
  const correctedRarity = useMemo(() => {
    if (!_yearSoftShifted || _yearSoftShifted.length < 100) return cv.rarityIndex;
    const yearScores = _yearSoftShifted.map(p => p.score);
    const higherOrEqual = yearScores.filter(s => s >= displayScore).length;
    const percentage = Math.max(0.1, (higherOrEqual / yearScores.length) * 100);
    const rank = yearScores.filter(s => s > displayScore).length + 1;
    let label: string, icon: string;
    if (percentage <= 1) { label = 'Extrêmement rare'; icon = '💎'; }
    else if (percentage <= 5) { label = 'Rare'; icon = '🌟'; }
    else if (percentage <= 15) { label = 'Peu commun'; icon = '✦'; }
    else if (percentage <= 50) { label = 'Modéré'; icon = '◆'; }
    else { label = 'Courant'; icon = '○'; }
    return { ...cv.rarityIndex, percentage: Math.round(percentage * 10) / 10, label, icon, rank };
  }, [_yearSoftShifted, displayScore, cv.rarityIndex]);

  // V8 — Score J+1 (même score que le Calendrier — soft-shift appliqué)
  const tomorrowPreview = useMemo(() => {
    if (!_yearSoftShifted) return null;
    const d = new Date(); d.setDate(d.getDate() + 1);
    const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    return _yearSoftShifted.find(p => p.date === ds) ?? null;
  }, [_yearSoftShifted]);

  // Ronde #26 — Prochaine Convergence rare (dopamine anticipatoire, Zeigarnik effect)
  const nextCosmicPreview = useMemo(() => {
    if (!_yearSoftShifted) return null;
    const todayStr = new Date().toISOString().slice(0, 10);
    const future = _yearSoftShifted
      .filter(p => p.date > todayStr && p.score >= COSMIC_THRESHOLD)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (future.length === 0) return null;
    const next = future[0];
    const daysUntil = Math.round((new Date(next.date + 'T12:00:00').getTime() - new Date(todayStr + 'T12:00:00').getTime()) / 86400000);
    return { date: next.date, score: next.score, daysUntil };
  }, [_yearSoftShifted]);

  // V8 — Momentum EMA 7 jours (soft-shift appliqué pour cohérence)
  const scoreMomentum = useMemo(() => {
    if (!_yearSoftShifted) return null;
    try {
      const scores: number[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        const p = _yearSoftShifted.find(pp => pp.date === ds);
        scores.push(p ? p.score : 50);  // fallback 50 si hors année courante
      }
      return calcVectorMomentum(scores);
    } catch { return null; }
  }, [_yearSoftShifted]);

  const handleBrief = async () => {
    const text = buildBrief(data, correctedRarity);
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
          <div style={{ fontSize: 13, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>
            ✦ Check-in aveugle
          </div>
          <div style={{ fontSize: 22, color: '#f1f5f9', fontWeight: 700, marginBottom: 6, textAlign: 'center' }}>
            Comment était ta journée d'hier ?
          </div>
          <div style={{ fontSize: 13, color: '#a1a1aa', marginBottom: 28, textAlign: 'center' }}>
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
            background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer',
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
          <div style={{ fontSize: 13, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 }}>
            ✦ Comparaison
          </div>
          {blindPredicted > 0 && (
            <div style={{ display: 'flex', gap: 32, alignItems: 'center', marginBottom: 20 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#a1a1aa', marginBottom: 4 }}>Ton vécu</div>
                <div style={{ fontSize: 36 }}>{'⭐'.repeat(blindRating)}</div>
                <div style={{ fontSize: 13, color: '#C9A84C', fontWeight: 600 }}>{STAR_LABELS[blindRating]}</div>
              </div>
              <div style={{ fontSize: 20, color: '#a1a1aa' }}>vs</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#a1a1aa', marginBottom: 4 }}>Score prédit</div>
                <div style={{ fontSize: 36, fontWeight: 800, color: blindPredicted >= 65 ? '#4ade80' : blindPredicted >= 40 ? '#60a5fa' : '#ef4444' }}>
                  {blindPredicted}%
                </div>
                <div style={{ fontSize: 13, color: '#a1a1aa' }}>{blindLabel}</div>
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
            background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer',
            fontSize: 12, fontFamily: 'inherit', marginTop: 20, opacity: 0.6
          }}>
            Voir aujourd'hui →
          </button>
        </div>
      )}

      {/* AC-4 ═══ Overlay Calibration Matin ═══ */}
      {/* 1 fois/jour — pause 7j si ignoré 3j consécutifs (recordCalibSkip) */}
      {calibMode === 'ask' && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(10,10,18,0.96)', backdropFilter: 'blur(14px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: 24, animation: 'fadeIn 0.3s ease',
        }}>
          <div style={{ fontSize: 13, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>
            ✦ Calibration du jour
          </div>
          <div style={{ fontSize: 21, color: '#f1f5f9', fontWeight: 700, marginBottom: 6, textAlign: 'center' }}>
            Comment abordez-toi cette journée ?
          </div>
          <div style={{ fontSize: 12, color: '#a1a1aa', marginBottom: 32, textAlign: 'center', lineHeight: 1.5 }}>
            Ce réglage ajuste ton score en fonction de ton profil du moment
          </div>
          <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 360 }}>
            {(['fluide', 'equilibre', 'exigeant'] as CalibProfile[]).map(p => {
              const pl = PROFILE_LABELS[p];
              return (
                <button
                  key={p}
                  onClick={() => { setCalibProfile(p, todayStr); setCalibMode(null); }}
                  style={{
                    flex: 1, padding: '16px 8px', borderRadius: 14, cursor: 'pointer',
                    fontFamily: 'inherit', background: `${pl.color}12`,
                    border: `1px solid ${pl.color}40`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    transition: 'all 0.18s ease',
                  }}
                >
                  <span style={{ fontSize: 24 }}>{pl.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: pl.color }}>{pl.label}</span>
                  <span style={{ fontSize: 10, color: '#a1a1aa', textAlign: 'center', lineHeight: 1.3 }}>{pl.desc}</span>
                </button>
              );
            })}
          </div>
          <button
            onClick={() => { recordCalibSkip(todayStr); setCalibMode(null); }}
            style={{
              marginTop: 24, background: 'none', border: 'none',
              color: '#a1a1aa', cursor: 'pointer', fontSize: 12,
              fontFamily: 'inherit', opacity: 0.5,
            }}
          >
            Passer pour aujourd'hui
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
                <span style={{ fontSize: 16 }}>{info.icon}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#ef4444' }}>
                  {info.bannerTitle}
                </span>
              </div>
              <div style={{ fontSize: 11, color: P.textMid, lineHeight: 1.5, marginBottom: 3 }}>{info.activationText}</div>
              <div style={{ fontSize: 10, color: P.textDim, lineHeight: 1.4 }}>
                Le chiffre {activeLack} est absent de ton profil numérologique — quand il apparaît dans ta journée, c'est l'occasion de développer ce qu'il représente.
              </div>
              <div style={{ fontSize: 9, color: P.textDim, marginTop: 4, opacity: 0.7 }}>
                Domaine : {info.domain} · Jour Personnel {activeLack}
              </div>
            </div>
            <button
              onClick={() => {
                sto.set(`inclusionBadgeDismissed_${todayStr}`, 'true');
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
            // Ronde Pilotage P6b : score ≥ 90 → jamais "mitigé" ; score ≥ 85 → seuil 35% (quelques systèmes forts suffisent)
            const lowConfThreshold = cv.score >= COSMIC_THRESHOLD ? 0 : cv.score >= 85 ? 35 : 60;
            const isLowConf = confRatio < lowConfThreshold;
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
                  ? '🌟 POTENTIEL FORT — SIGNAUX MITIGÉS'
                  : isCosmique ? '🌟 CONVERGENCE RARE' : '🌟 ALIGNEMENT FORT'}
              </div>
              <div style={{ fontSize: 12, color: isLowConf ? '#f59e0b' : isCosmique ? '#E0B0FF' : P.gold, opacity: 0.8, marginTop: 5 }}>
                {isLowConf
                  ? `Score élevé mais les systèmes ne sont pas unanimes. Avance avec prudence.`
                  : isCosmique
                  ? `Convergence exceptionnelle de tous les systèmes — Fenêtre de levier (≈ 12 fois/an)`
                  : `Alignement rare — toutes les conditions sont réunies`}
              </div>
            </div>
            );
          })()}

          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: P.gold, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700, marginBottom: 14 }}>
              Score du Jour
            </div>
            <div className="score-wheel" style={{ position: 'relative', width: 170, height: 170, margin: '0 auto' }}>
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
                  strokeDasharray={2 * Math.PI * 72} strokeDashoffset={2 * Math.PI * 72 * (1 - displayScore / 100)}
                  strokeLinecap="round" transform="rotate(-90 85 85)"
                  style={{ filter: `drop-shadow(0 0 ${isGold ? '14' : '10'}px ${cv.lCol}${isGold ? '88' : '55'})`, transition: 'stroke-dashoffset 1s ease' }} />
              </svg>
              <div role="status" aria-live="polite" aria-label={`Score du jour : ${displayScore} sur 100`} style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 46, fontWeight: 700, color: cv.lCol }}>{displayScore}</span>{/* AC-2 — displayScore = cv.score + calibOffset */}
                <span aria-hidden="true" style={{ fontSize: 12, color: cv.lCol + '88' }}>/ 100</span>
                {/* V8.9+V11.1 — Plage [low–high] avec label explicite */}
                {cv.ci && cv.ci.margin >= 4 && cv.ci.lower !== cv.ci.upper && (
                  <span title="Fourchette estimée du score" style={{ fontSize: 10, color: P.textDim, opacity: 0.7, marginTop: 2, letterSpacing: 0.5 }}>
                    entre {cv.ci.lower} et {cv.ci.upper}
                  </span>
                )}
              </div>
            </div>
            <div style={{ fontSize: 17, fontWeight: 700, color: cv.lCol, marginTop: 14 }}>{cv.level}</div>
            <div style={{ fontSize: 13, color: P.textMid, marginTop: 6, fontStyle: 'italic' }}>
              {cv.scoreLevel?.narrative || getLevelDesc(cv.score, cv.temporalConfidence?.agreementRatio)}
            </div>
            <div style={{ fontSize: 12, color: P.textDim, marginTop: 8 }}>
              {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} · Couleur du jour en numérologie : {cv.theme}
            </div>

            {/* Sprint AX P2 — Shapley contributions UI (Ronde 19 consensus P0) */}
            {cv.shapley && (() => {
              const labels = [
                { key: 'lune' as const,  label: 'Lune',   sub: 'Cycles lunaires',        icon: '🌙', color: '#a78bfa' },
                { key: 'ephem' as const, label: 'Astro',  sub: 'Transits planétaires',    icon: '✦',  color: '#60a5fa' },
                { key: 'bazi' as const,  label: 'Cycles chinois', sub: 'Astrologie chinoise', icon: '☯',  color: '#f59e0b' },
                { key: 'indiv' as const, label: 'Profil', sub: 'Ton thème personnel',   icon: '🧬', color: '#4ade80' },
              ];
              const vals = labels.map(l => ({ ...l, val: cv.shapley![l.key] }));
              const maxAbs = Math.max(...vals.map(v => Math.abs(v.val)), 1);
              const hasSignificant = vals.some(v => Math.abs(v.val) >= 1);
              if (!hasSignificant) return null;
              return (
                <div style={{ marginTop: 14, padding: '10px 16px', background: '#27272a33', borderRadius: 12, border: `1px solid ${P.cardBdr}`, maxWidth: 400, margin: '14px auto 0' }}>
                  {vals.map(v => (
                    <div key={v.key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <div style={{ width: 90, textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 11, color: P.textMid }}>{v.icon} {v.label}</div>
                        <div style={{ fontSize: 8, color: P.textDim, marginTop: 1 }}>{Math.round(v.val) === 0 ? 'Ni frein ni élan — fond stable' : v.sub}</div>
                      </div>
                      <div style={{ flex: 1, height: 12, background: '#18181b', borderRadius: 6, position: 'relative', overflow: 'hidden' }}>
                        {/* Axe central */}
                        <div style={{ position: 'absolute', left: '50%', top: 0, width: 1, height: '100%', background: P.textDim + '40' }} />
                        {/* Barre — masquée si arrondi = 0 */}
                        {Math.round(v.val) !== 0 && (
                        <div style={{
                          position: 'absolute',
                          top: 1, height: 10, borderRadius: 5,
                          background: v.val >= 0 ? v.color : '#ef4444',
                          opacity: 0.85,
                          ...(v.val >= 0
                            ? { left: '50%', width: `${Math.min(50, (Math.abs(v.val) / maxAbs) * 48)}%` }
                            : { right: '50%', width: `${Math.min(50, (Math.abs(v.val) / maxAbs) * 48)}%` }),
                          transition: 'width 0.5s ease',
                        }} />
                        )}
                      </div>
                      <span style={{ fontSize: 11, width: 36, textAlign: 'left', fontWeight: 600, color: Math.round(v.val) === 0 ? P.textDim : v.val > 0 ? v.color : '#ef4444' }}>
                        {Math.round(v.val) === 0 ? '—' : (v.val >= 0 ? '+' : '') + Math.round(v.val)}
                      </span>
                    </div>
                  ))}
                  <div style={{ fontSize: 9, color: P.textDim, textAlign: 'center', marginTop: 6, opacity: 0.7 }}>
                    Influence de chaque système sur ton score du jour
                  </div>
                </div>
              );
            })()}

            {correctedRarity && cv.score >= 85 && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                marginTop: 10, padding: '6px 14px',
                background: correctedRarity.percentage <= 3 ? '#E0B0FF0c' : correctedRarity.percentage <= 8 ? `${P.gold}0c` : '#27272a44',
                border: `1px solid ${correctedRarity.percentage <= 3 ? '#E0B0FF25' : correctedRarity.percentage <= 8 ? P.gold + '25' : P.cardBdr}`,
                borderRadius: 20,
              }}>
                <span style={{ fontSize: 14 }}>{correctedRarity.icon}</span>
                <span style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
                  color: correctedRarity.percentage <= 3 ? '#E0B0FF' : correctedRarity.percentage <= 8 ? P.gold : P.textMid,
                }}>
                  {correctedRarity.label}
                </span>
                <span style={{ fontSize: 10, color: P.textDim }}>
                  {correctedRarity.percentage <= 5
                    ? `≈ 12 fois/an`
                    : `${correctedRarity.percentage.toFixed(1)}%`
                  }
                </span>
              </div>
            )}
            {/* Ronde #26 — Prochaine Convergence rare (dopamine anticipatoire) */}
            {/* Affiché uniquement si aujourd'hui n'est pas déjà une Convergence rare */}
            {nextCosmicPreview && displayScore < COSMIC_THRESHOLD && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                marginTop: 8, padding: '5px 12px',
                background: '#E0B0FF08', border: '1px solid #E0B0FF25',
                borderRadius: 20,
              }}>
                <span style={{ fontSize: 12 }}>✦</span>
                <span style={{ fontSize: 11, color: '#E0B0FF99', fontWeight: 600 }}>
                  {nextCosmicPreview.daysUntil === 1
                    ? 'Convergence rare demain'
                    : `Prochaine Convergence rare dans ${nextCosmicPreview.daysUntil} jours`}
                </span>
              </div>
            )}
            {/* Sprint AR P5 : badge Trinity supprimé — toujours false (Ronde 11 consensus 2/3) */}
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

            {/* V8+V11.1 — Badge Volatilité — affiché dès contradiction légère */}
            {volatility && volatility.index >= 0.35 && (
              <div style={{
                display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                marginTop: 8, marginLeft: 6, padding: '6px 14px',
                background: `${volatility.color}0c`,
                border: `1px solid ${volatility.color}30`,
                borderRadius: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12 }}>{volatility.icon}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: volatility.color }}>
                    {volatility.label}
                    {volatility.level && <span style={{ fontWeight: 400, opacity: 0.8 }}>{' '}({volatility.level})</span>}
                  </span>
                </div>
                {volatility.explanation && (
                  <span style={{ fontSize: 9, color: volatility.color, opacity: 0.7, textAlign: 'center', lineHeight: 1.3 }}>
                    {volatility.explanation}
                  </span>
                )}
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
                  {cv.dashaCertainty.certaintyLevel === 'LOW' ? 'Période en mutation' : 'Changement de grande période'}
                </span>
                {cv.dashaCertainty.warning && (
                  <span style={{ fontSize: 10, color: cv.dashaCertainty.certaintyLevel === 'LOW' ? '#ef4444aa' : '#f59e0baa' }}>
                    — les prévisions gagnent en précision avec une heure de naissance exacte
                  </span>
                )}
              </div>
            )}

            {/* V8 — Momentum EMA 7j */}
            {scoreMomentum && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 }}>
                <span style={{ fontSize: 10, color: P.textDim, textTransform: 'uppercase', letterSpacing: 1 }}>Tendance sur 7 jours</span>
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
                    {tomorrowPreview.score}<span style={{ fontSize: 11, fontWeight: 400, opacity: 0.6 }}>/100</span>
                  </span>
                  <span style={{ fontSize: 11, color: P.textDim }}>{tomorrowPreview.dayType.icon} {dayTypeHuman(tomorrowPreview.dayType.label)}{dayTypeHint(tomorrowPreview.dayType.label, tomorrowPreview.score) ? ` — ${dayTypeHint(tomorrowPreview.dayType.label, tomorrowPreview.score)}` : ''}</span>
                  {cv.score !== 0 && (
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      color: tomorrowPreview.score > cv.score ? '#4ade80' : tomorrowPreview.score < cv.score ? '#ef4444' : P.textDim,
                    }}>
                      {tomorrowPreview.score > cv.score
                        ? '↗ en hausse'
                        : tomorrowPreview.score < cv.score
                        ? '↘ en baisse'
                        : '→ stable'}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ═══ 2b. CONTEXTE TEMPOREL — Cycle de fond + Alignement + Potentiel (ex-Oracle) ═══ */}
          {temporalCtx && (() => {
            const { layers, alignment, synthesisPhrase } = temporalCtx;
            const { state } = alignment;
            const bgBadge = ALIGNMENT_BADGE_BG[state.name] ?? '#ffffff08';
            const bdrBadge = ALIGNMENT_BADGE_BDR[state.name] ?? '#ffffff20';
            const { display: dsp } = alignment;

            return (
              <div style={{ marginBottom: 20, display: 'grid', gap: 10 }}>

                {/* Ligne : Fond + Badge Alignement + Potentiel */}
                <div className="temporal-grid" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'stretch' }}>

                  {/* FOND */}
                  <div style={{ padding: '10px 12px', borderRadius: 9, background: P.surface, border: `1px solid ${P.cardBdr}` }}>
                    <div style={{ fontSize: 10, color: P.textDim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Cycle de fond</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: alignment.fondPolarity === '+' ? '#4ade80' : '#f87171' }}>
                      {layers.fond.label}
                    </div>
                    <div style={{ fontSize: 10, color: P.textDim, marginTop: 2 }}>
                      Énergie {layers.fond.dominantElement} · {Math.round(layers.fond.pillarYearsLeft * 12)} mois restants
                    </div>
                    <div style={{ fontSize: 9, color: P.textDim, marginTop: 4, lineHeight: 1.4, opacity: 0.7 }}>
                      Cycle de vie long terme
                    </div>
                  </div>

                  {/* BADGE ALIGNEMENT — centré */}
                  <div style={{
                    padding: '10px 14px', borderRadius: 9, textAlign: 'center',
                    background: bgBadge, border: `1.5px solid ${bdrBadge}`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{ fontSize: 18, marginBottom: 2 }}>{state.icon}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: state.colorHex, whiteSpace: 'nowrap' }}>
                      {(dsp.label === 'Tes 3 cycles alignés' && cv.shadowBaseSignal !== undefined && cv.shadowBaseSignal < -0.22)
                        ? '2 cycles sur 3 alignés'
                        : dsp.label}
                    </div>
                    <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
                      {(['Cycle long', 'Année', 'Jour'] as const).map((ch, i) => {
                        // "Jour" intègre aussi la résonance védique : si cycles profonds en tension → ✗
                        const basePol = i === 0 ? alignment.fondPolarity : i === 1 ? alignment.tendancePolarity : alignment.signalPolarity;
                        const pol = (i === 2 && cv.shadowBaseSignal !== undefined && cv.shadowBaseSignal < -0.22) ? '-' as const : basePol;
                        return (
                          <span key={ch} style={{
                            fontSize: 9, fontWeight: 700, padding: '1px 4px', borderRadius: 3,
                            background: pol === '+' ? '#4ade8020' : '#f8717120',
                            color: pol === '+' ? '#4ade80' : '#f87171',
                          }}>{ch} {pol === '+' ? '✓' : '✗'}</span>
                        );
                      })}
                    </div>
                    <div style={{ fontSize: 8, color: P.textDim, marginTop: 4, lineHeight: 1.3, opacity: 0.7 }}>
                      Cycle décennal (fond de vie) · Année personnelle · Score du jour
                    </div>
                  </div>

                  {/* POTENTIEL D'ACTION */}
                  {/* FIX R18-audit : delta recalculé vs displayScore (inclut calibOffset)
                      Avant : delta = potentiel.score - score_brut → incohérent avec le cercle affiché
                      Après : delta = potentiel.score - displayScore → cohérent visuellement */}
                  <div style={{ padding: '10px 12px', borderRadius: 9, background: P.surface, border: `1px solid ${P.cardBdr}`, textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: P.textDim, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>Score en contexte</div>
                    {/* FIX delta-calibOffset : potentiel.score vient du score brut (sans calibOffset).
                        On applique le même calibOffset pour cohérence avec le cercle principal. */}
                    <div style={{ fontSize: 22, fontWeight: 800, color: state.colorHex }}>
                      {Math.round(Math.max(0, Math.min(100, layers.potentiel.score + calibOffset)))}
                      <span style={{ fontSize: 11, opacity: 0.5 }}>/100</span>
                    </div>
                    {(() => { const _potentielDisplay = Math.round(Math.max(0, Math.min(100, layers.potentiel.score + calibOffset))); const _dv = _potentielDisplay - displayScore; return (
                    <div style={{ fontSize: 10, color: _dv > 0 ? '#4ade80' : _dv < 0 ? '#f87171' : P.textDim, marginTop: 2 }}>
                      {_dv > 0 ? `+${_dv} grâce à ton cycle de vie favorable` : _dv < 0 ? `${_dv} dû à un cycle de vie exigeant` : 'Cycle de vie neutre'}
                    </div>
                    ); })()}
                    <div style={{ fontSize: 9, color: P.textDim, marginTop: 4, lineHeight: 1.4, opacity: 0.7 }}>
                      Score du jour ajusté selon ta trajectoire personnelle (cycle décennal + année)
                    </div>
                  </div>
                </div>

                {/* Phrase synthèse */}
                <div style={{ padding: '12px 14px', borderRadius: 9, background: `${state.colorHex}08`, border: `1px solid ${state.colorHex}25` }}>
                  <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.65, fontStyle: 'italic' }}>
                    {(() => {
                      const vedicTense = cv.shadowBaseSignal !== undefined && cv.shadowBaseSignal < -0.22;
                      // Si résonance en tension, surcharger "Tes 3 cycles sont alignés"
                      if (vedicTense && synthesisPhrase.includes('cycles sont alignés')) {
                        return synthesisPhrase.replace(
                          /Tes 3 cycles sont alignés, mais/,
                          'Tes cycles de fond sont porteurs, mais des courants profonds freinent et'
                        );
                      }
                      return (dsp.uxText !== state.uxText)
                        ? `${synthesisPhrase.split('—')[0]}— ${dsp.uxText}`
                        : synthesisPhrase;
                    })()}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 11, color: state.colorHex, fontWeight: 600 }}>
                    → {(cv.shadowBaseSignal !== undefined && cv.shadowBaseSignal < -0.22 && dsp.action.includes('confiance'))
                      ? 'Avance avec méthode — priorise et ajuste au fil de la journée.'
                      : dsp.action}
                  </div>
                </div>

                {/* Pattern de contradiction si actif */}
                {alignment.activePattern && alignment.patternText && (
                  <div style={{ padding: '8px 12px', borderRadius: 8, background: '#f59e0b08', border: '1px solid #f59e0b20' }}>
                    <div style={{ fontSize: 10, color: '#f59e0b', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
                      ⚡ {alignment.activePattern.label}
                    </div>
                    <div style={{ fontSize: 11, color: P.textMid, lineHeight: 1.5 }}>{alignment.patternText}</div>
                  </div>
                )}

                {/* Alertes de transition */}
                {layers.transitions.length > 0 && layers.transitions.map((tr, i) => (
                  <div key={i} style={{
                    padding: '8px 12px', borderRadius: 8,
                    background: tr.urgency.color + '10',
                    border: `1px solid ${tr.urgency.color}30`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontSize: 11, color: tr.urgency.color, fontWeight: 700 }}>
                        {tr.urgency.icon} {tr.label}
                      </div>
                      <div style={{ fontSize: 11, color: P.textMid, marginTop: 2, lineHeight: 1.4 }}>{tr.template}</div>
                    </div>
                    <div style={{ fontSize: 10, color: tr.urgency.color, fontWeight: 700, whiteSpace: 'nowrap', marginLeft: 8 }}>
                      {tr.urgency.category}
                    </div>
                  </div>
                ))}
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
              {/* Y4 — Posture du Jour (badge au-dessus de l'action) */}
              {(() => {
                const posture = getPosture(cv.score, cv.actionReco.verb);
                return (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ fontSize: 15 }}>{posture.icon}</span>
                      <span style={{
                        fontSize: 13, fontWeight: 800, letterSpacing: 2,
                        color: posture.color, textTransform: 'uppercase',
                      }}>{posture.label}</span>
                    </div>
                    <span style={{ fontSize: 11, color: P.textDim, fontStyle: 'italic' }}>{posture.tagline}</span>
                  </div>
                );
              })()}
              {/* V11.1 UX — Supprimé le label AGIR en double, gardé seulement l'icône + conseil */}
              {cv.score >= 65 && cv.actionReco.verb !== 'agir' && (
                <div style={{ fontSize: 10, color: P.gold, marginBottom: 4, fontStyle: 'italic' }}>
                  L'énergie est là — le contexte du moment invite à avancer avec mesure plutôt qu'à fond
                </div>
              )}
              <div style={{ fontSize: 12, color: P.textMid, marginTop: 8, lineHeight: 1.5 }}>
                {cv.actionReco.conseil}
              </div>
            </div>
          )}

          {/* Y4b — Triade IMPACT / RÉSONANCE / ANCRAGE — V11.1 UX simplifié */}
          {cv.contextualScores && (() => {
            const best  = cv.contextualScores.domains.find(d => d.domain === cv.contextualScores!.bestDomain);
            const worst = cv.contextualScores.domains.find(d => d.domain === cv.contextualScores!.worstDomain);
            const topSignal = cv.signals?.find(s => s.length > 5) ?? null;
            const topAlert  = cv.alerts?.find(a => a.length > 5)  ?? null;
            const topRichSig = cv.richSignals?.[0] ?? null;
            const topRichAlt = cv.richAlerts?.[0] ?? null;
            const vedic = getVedicReadout(cv.shadowBaseSignal);
            // V11.1 — Helper : qualificatif humain au lieu de /100
            const scoreQual = (s: number) => s >= 80 ? 'Excellent' : s >= 65 ? 'Favorable' : s >= 45 ? 'Modéré' : 'Faible';
            // Labels contextuels pour FORCE (positif) et VIGILANCE (négatif)
            const forceQual = (s: number) => s >= 80 ? 'Très porteur' : s >= 65 ? 'Porteur' : s >= 45 ? 'Modéré' : 'Discret';
            const vigilQual = (s: number) => s >= 65 ? 'Sous contrôle' : s >= 45 ? 'À surveiller' : s >= 30 ? 'Fragile' : 'En tension';
            return (
              <div className="grid-responsive-3" style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                gap: 8, marginBottom: 20,
              }}>
                {/* Ronde 20 : IMPACT → FORCE DU JOUR */}
                <div style={{
                  padding: '12px 10px', borderRadius: 10,
                  background: '#4ade8010', border: '1px solid #4ade8028',
                  display: 'flex', flexDirection: 'column', gap: 4,
                }}>
                  <div style={{ fontSize: 9, color: '#4ade80', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>
                    FORCE DU JOUR
                  </div>
                  <div style={{ fontSize: 9, color: P.textDim, lineHeight: 1.3, marginBottom: 2 }}>Ton domaine le plus porteur</div>
                  {best && (
                    <>
                      <div style={{ fontSize: 13, fontWeight: 800, color: DOMAIN_COLORS[best.domain] ?? '#4ade80' }}>
                        {best.icon} {forceQual(best.score)}
                      </div>
                      <div style={{ fontSize: 10, color: P.textMid, lineHeight: 1.3 }}>{best.label}</div>
                    </>
                  )}
                  {topRichSig ? (
                    <div style={{ fontSize: 9, color: '#4ade80aa', lineHeight: 1.3, marginTop: 2, fontStyle: 'italic' }}>
                      {topRichSig.human}
                    </div>
                  ) : topSignal ? (
                    <div style={{ fontSize: 9, color: '#4ade80aa', lineHeight: 1.3, marginTop: 2, fontStyle: 'italic' }}>
                      {topSignal.replace(/^[^\s]+\s/, '').slice(0, 52)}
                    </div>
                  ) : null}
                </div>

                {/* Ronde 20 : RÉSONANCE → ALIGNEMENT */}
                <div style={{
                  padding: '12px 10px', borderRadius: 10,
                  background: '#a78bfa10', border: '1px solid #a78bfa28',
                  display: 'flex', flexDirection: 'column', gap: 4,
                }}>
                  <div style={{ fontSize: 9, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>
                    RÉSONANCE
                  </div>
                  <div style={{ fontSize: 9, color: P.textDim, lineHeight: 1.3, marginBottom: 2 }}>Tes cycles profonds</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: vedic.color }}>
                    {vedic.icon} {cv.shadowBaseSignal !== undefined ? vedic.label : '—'}
                  </div>
                  {cv.shadowBaseSignal !== undefined && vedic.hint && (
                    <div style={{ fontSize: 9, color: vedic.color + 'aa', lineHeight: 1.3, marginTop: 2, fontStyle: 'italic' }}>
                      {vedic.hint}
                    </div>
                  )}
                </div>

                {/* Ronde 20 : ANCRAGE → VIGILANCE (adaptatif si score élevé) */}
                {(() => {
                  // FIX: Si le pire domaine est quand même bon (≥65), on passe en mode "attention douce" (ambre)
                  const worstIsGood = worst && worst.score >= 65;
                  const vigilColor = worstIsGood ? '#f59e0b' : '#ef4444'; // ambre vs rouge
                  const vigilTitle = worstIsGood ? 'ATTENTION DOUCE' : 'VIGILANCE';
                  const vigilSub = worstIsGood ? 'Domaine le moins fort (mais porteur)' : 'Point d\'attention du jour';
                  return (
                    <div style={{
                      padding: '12px 10px', borderRadius: 10,
                      background: vigilColor + '10', border: `1px solid ${vigilColor}28`,
                      display: 'flex', flexDirection: 'column', gap: 4,
                    }}>
                      <div style={{ fontSize: 9, color: vigilColor, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>
                        {vigilTitle}
                      </div>
                      <div style={{ fontSize: 9, color: P.textDim, lineHeight: 1.3, marginBottom: 2 }}>{vigilSub}</div>
                      {worst && (
                        <>
                          <div style={{ fontSize: 13, fontWeight: 800, color: DOMAIN_COLORS[worst.domain] ?? vigilColor }}>
                            {worst.icon} {worstIsGood ? forceQual(worst.score) : vigilQual(worst.score)}
                          </div>
                          <div style={{ fontSize: 10, color: P.textMid, lineHeight: 1.3 }}>{worst.label}</div>
                        </>
                      )}
                      {topRichAlt ? (
                        <div style={{ fontSize: 9, color: vigilColor + 'aa', lineHeight: 1.3, marginTop: 2, fontStyle: 'italic' }}>
                          {topRichAlt.human}
                        </div>
                      ) : topAlert ? (
                        <div style={{ fontSize: 9, color: vigilColor + 'aa', lineHeight: 1.3, marginTop: 2, fontStyle: 'italic' }}>
                          {topAlert.replace(/^[^\s]+\s/, '').slice(0, 52)}
                        </div>
                      ) : null}
                    </div>
                  );
                })()}
              </div>
            );
          })()}

          {/* ════════ ÉCRAN 2 — CONTEXTE & ACTION COMPACTE ════════ */}

          {/* Bloc: Top 2 Domaines favorisés */}
          {cv.contextualScores && (() => {
            const sorted = [...cv.contextualScores.domains].sort((a, b) => b.score - a.score);
            const top2 = sorted.slice(0, 2);
            return (
              <div style={{ marginBottom: 12, padding: '10px 14px', background: P.bg, borderRadius: 10, border: `1px solid ${P.cardBdr}` }}>
                <div style={{ fontSize: 9, color: P.gold, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 8 }}>
                  🎯 Domaines favorisés
                </div>
                {top2.map((d, i) => (
                  <div key={d.domain} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 14 }}>{d.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: d.color }}>{d.label}</span>
                    <span style={{ fontSize: 11, color: P.textMid, flex: 1 }}>{d.directive?.split('.')[0]}</span>
                  </div>
                ))}
                {/* Créneaux favorables (ex "Pics de fluidité" — reformulé) */}
                {(() => {
                  const bestH = getBestHoursToday(new Date(), 2, data.astro?.b3?.asc);
                  if (bestH.length === 0) return null;
                  const hText = bestH.map(h => {
                    const hh = new Date(h.startMs).getHours().toString().padStart(2, '0');
                    const mm = new Date(h.startMs).getMinutes().toString().padStart(2, '0');
                    return `${hh}h${mm}`;
                  }).join(' et ');
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, paddingTop: 6, borderTop: `1px solid ${P.cardBdr}` }}>
                      <span style={{ fontSize: 14 }}>⏱</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#60a5fa' }}>Meilleurs créneaux</span>
                      <span style={{ fontSize: 11, color: P.textMid, flex: 1 }}>Agis vers {hText}</span>
                    </div>
                  );
                })()}
              </div>
            );
          })()}

          {/* Bloc: À Surveiller (Mercury + Moon + Hours) */}
          {(() => {
            const items: Array<{ icon: string; text: string; color: string }> = [];
            // Mercury retro
            if (lunarEvents.some(ev => ev.name.toLowerCase().includes('mercure'))) {
              const merc = lunarEvents.find(ev => ev.name.toLowerCase().includes('mercure'))!;
              items.push({ icon: '⚠️', text: `Mercure Rétro : ${merc.effect.split('.')[0]}`, color: '#fca5a5' });
            }
            // Moon phase
            const moon = getMoonPhase();
            items.push({ icon: moon.emoji, text: moonPhaseAction(moon.name, cv.score), color: '#a5b4fc' });
            // Best hours — déplacés hors de "À surveiller" (Ronde 21-bis : pas un avertissement)
            if (items.length === 0) return null;
            return (
              <div style={{ marginBottom: 12, padding: '10px 14px', background: P.bg, borderRadius: 10, border: `1px solid ${P.cardBdr}` }}>
                <div style={{ fontSize: 9, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 8 }}>
                  ✦ Influences du jour
                </div>
                {items.map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: i < items.length - 1 ? 5 : 0 }}>
                    <span style={{ fontSize: 12, flexShrink: 0 }}>{item.icon}</span>
                    <span style={{ fontSize: 11, color: item.color, lineHeight: 1.4 }}>{item.text}</span>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Bloc: Arcane du Jour (compact avec image + thème) */}
          {(() => {
            const todayStr3 = localDateStr();
            const arcane = getArcana(calcPersonalDayCard(bd, todayStr3));
            // Ronde Pilotage P4 : note contextuelle si arcane exigeant + score élevé
            const CHALLENGING_ARCANA = [13, 15, 16, 18]; // Mort, Diable, Maison Dieu, Lune
            const isChallenging = CHALLENGING_ARCANA.includes(arcane.num);
            const contextNote = (isChallenging && cv.score >= 80)
              ? `${arcane.light} — l'énergie du jour transcende ce défi.`
              : (isChallenging && cv.score <= 35)
              ? `${arcane.shadow} — reste vigilant aujourd'hui.`
              : null;
            return (
              <div style={{ marginBottom: 12, padding: '12px 14px', background: P.bg, borderRadius: 10, border: `1px solid ${P.cardBdr}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                {arcane.image ? (
                  <img
                    src={arcane.image}
                    alt={arcane.name_fr}
                    style={{
                      width: 44, height: 70, objectFit: 'cover',
                      borderRadius: 5, border: `1px solid ${P.gold}44`,
                      flexShrink: 0, background: '#1a1a2e',
                    }}
                    loading="lazy"
                  />
                ) : (
                  <div style={{ width: 44, height: 70, background: `${P.gold}12`, borderRadius: 5, border: `1px solid ${P.gold}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 20 }}>🃏</span>
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: P.text }}>{arcane.name_fr}</div>
                  <div style={{ fontSize: 11, color: P.gold, fontWeight: 600, marginTop: 2 }}>{arcane.theme}</div>
                  <div style={{ fontSize: 10, color: P.textMid, marginTop: 3, lineHeight: 1.4 }}>
                    ✦ {arcane.narrative.length > 160 ? arcane.narrative.slice(0, 160) + '…' : arcane.narrative}
                  </div>
                  {contextNote && (
                    <div style={{ fontSize: 10, color: cv.score >= 80 ? '#4ade80' : '#ef4444', marginTop: 3, fontStyle: 'italic', lineHeight: 1.4 }}>
                      ↳ {contextNote}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Bloc: Contexte de fond (1 ligne) */}
          {(() => {
            const cl = cv.climate;
            if (!cl) return null;
            return (
              <div style={{ marginBottom: 16, padding: '10px 14px', background: P.bg, borderRadius: 10, border: `1px solid ${P.cardBdr}`, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 9, color: P.gold, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 700 }}>Contexte</span>
                <span style={{ fontSize: 11, color: cl.week.color }}>{cl.week.icon} Semaine {cl.week.label}</span>
                <span style={{ fontSize: 10, color: P.textDim }}>·</span>
                <span style={{ fontSize: 11, color: cl.month.color }}>{cl.month.icon} Mois {cl.month.label}</span>
                <span style={{ fontSize: 10, color: P.textDim }}>·</span>
                <span style={{ fontSize: 11, color: cl.year.color }}>{cl.year.icon} Année {cl.year.label}</span>
              </div>
            );
          })()}

          {/* FeedbackWidget — moved up from bottom */}
          <div style={{ marginBottom: 16 }}>
            <FeedbackWidget
              date={localDateStr()}
              score={cv.score}
              dayType={dt.type}
              breakdown={cv.breakdown?.map(b => ({ system: b.system, points: b.points }))}
              shadowScore={cv.shadowScore}
            />
          </div>

          {/* ════════ TIROIR EXPERT — "Explorer le détail" ════════ */}
          <div style={{ marginTop: 4 }}>
            <button
              onClick={() => setExpertMode(prev => !prev)}
              aria-label={expertMode ? 'Masquer l\'analyse complète' : 'Explorer le détail et l\'analyse complète'}
              style={{
                width: '100%', padding: '10px 14px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: P.bg, border: `1px solid ${P.cardBdr}`,
                borderRadius: expertMode ? '10px 10px 0 0' : 10,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <span style={{ fontSize: 11, color: P.textDim, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>
                🔬 Explorer le détail — Analyse complète
              </span>
              <span style={{ fontSize: 12, color: P.textDim, transform: expertMode ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
            </button>
            {expertMode && (
            <div style={{ padding: 14, background: P.bg, borderRadius: '0 0 10px 10px', border: `1px solid ${P.cardBdr}`, borderTop: 'none' }}>

          {/* ═══ Ronde 20 — Décomposition (accordéon) ═══ */}
          {cv.rawFinal !== undefined && cv.ctxMult !== undefined && cv.dashaMult !== undefined && (() => {
            // Signal = score sans les multiplicateurs de terrain
            const terrainMult = cv.ctxMult * cv.dashaMult;
            const signalDelta = terrainMult > 0 ? cv.rawFinal / terrainMult : cv.rawFinal;
            const signalScore = Math.max(5, Math.min(97, Math.round(50 + 45 * Math.sign(signalDelta) * Math.pow(Math.min(Math.abs(signalDelta) / 18, 1), 1.05))));
            const terrainPts  = cv.score - signalScore;
            // Sprint AS P4 : elanBonus retiré (toujours 0 depuis Sprint AR P3 — widget mort)
            const terrainPct  = Math.round(terrainMult * 100) / 100;
            const terrainPos  = terrainPts >= 0;
            return (
              <div style={{
                marginBottom: 12, background: P.surface, border: `1px solid ${P.cardBdr}`, borderRadius: 10, overflow: 'hidden',
              }}>
                <div {...a11yClick(() => toggleSection('decomp'))} aria-label="Afficher la décomposition du score" aria-expanded={isOpen('decomp')} style={{ padding: '10px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 9, color: P.textDim, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 600 }}>
                    Comment est calculé ce score
                  </span>
                  <span style={{ fontSize: 11, color: P.textDim }}>{isOpen('decomp') ? '▼' : '▶'}</span>
                </div>
                {isOpen('decomp') && (
                  <div style={{ padding: '0 16px 10px' }}>
                    <div style={{ fontSize: 10, color: P.textDim, marginBottom: 8, lineHeight: 1.4 }}>
                      Signal = potentiel brut du jour. Contexte de fond = amplificateur lié à ton cycle de vie. Score = Signal × Contexte.
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 70 }}>
                        <div style={{ fontSize: 9, color: P.textDim, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 }}>Signal</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: signalScore >= 65 ? P.gold : signalScore >= 45 ? P.textMid : '#ef4444' }}>
                          {signalScore}
                        </div>
                      </div>
                      <div style={{ color: P.textDim, fontSize: 16, opacity: 0.3, padding: '0 4px' }}>×</div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 80 }}>
                        <div style={{ fontSize: 9, color: P.textDim, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 }}>Contexte</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: terrainPos ? '#4ade80' : '#ef4444' }}>
                          {terrainPts >= 0 ? `+${terrainPts}` : terrainPts} pts
                        </div>
                      </div>
                      <div style={{ color: P.textDim, fontSize: 16, opacity: 0.3, padding: '0 4px' }}>=</div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 60 }}>
                        <div style={{ fontSize: 9, color: P.textDim, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 }}>Score</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: cv.lCol }}>{displayScore}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* AB-M1 ═══ BANNIÈRE JOURNÉE PARADOXE ═══ */}
          {/* Déclenche si isParadox=true ET score<=65 (Gemini Ronde 3 : condition score pour éviter confusion sur jours forts) */}
          {cv.isParadox && cv.score !== undefined && cv.score <= 65 && (() => {
            const _vrd = getVedicReadout(cv.shadowBaseSignal);
            const _msg =
              _vrd.label === 'Porteuse'
                ? "Tes élans s'opposent mais l'énergie te porte. Tranche, l'action sera favorisée."
                : _vrd.label === 'En tension'
                ? "Tiraillé(e) entre l'action et le recul. Le climat général freine : privilégie la prudence."
                : "Ta logique et ton instinct s'affrontent aujourd'hui. C'est à toi de choisir la direction.";
            return (
              <div style={{
                marginBottom: 20,
                background: 'linear-gradient(135deg, #f59e0b12 0%, #a78bfa12 100%)',
                border: '1px solid #f59e0b40',
                borderRadius: 12,
                padding: '14px 16px',
              }}>
                {/* En-tête */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 15 }}>🌟</span>
                  <span style={{
                    fontSize: 10, fontWeight: 800, letterSpacing: 2,
                    textTransform: 'uppercase', color: '#f59e0b',
                  }}>Journée Paradoxe</span>
                  <span style={{
                    fontSize: 9, color: '#a78bfa', marginLeft: 'auto', fontStyle: 'italic',
                  }}>{_vrd.icon} {_vrd.label !== 'Neutre' ? _vrd.label : ''}</span>
                </div>
                {/* Message contextuel */}
                <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.5, marginBottom: 12 }}>
                  {_msg}
                </div>
                {/* Slider Logique↔Instinct */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 10, color: '#60a5fa', fontWeight: 700 }}>🧠 Logique</span>
                    <span style={{ fontSize: 10, color: '#f472b6', fontWeight: 700 }}>💫 Instinct</span>
                  </div>
                  <input
                    type="range" min={0} max={100} value={paradoxSlider}
                    onChange={e => setParadoxSlider(Number(e.target.value))}
                    style={{
                      width: '100%', cursor: 'pointer',
                      accentColor: paradoxSlider < 40 ? '#60a5fa' : paradoxSlider > 60 ? '#f472b6' : '#a78bfa',
                    }}
                  />
                  <div style={{ fontSize: 9, color: P.textDim, textAlign: 'center', fontStyle: 'italic' }}>
                    {paradoxSlider < 40
                      ? 'Tu choisis la raison'
                      : paradoxSlider > 60
                      ? 'Tu choisis le ressenti'
                      : 'Position équilibrée'}
                  </div>
                </div>
              </div>
            );
          })()}

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
                    Forces principales alignées
                  </div>
                  <div style={{ fontSize: 11, color: P.textDim, lineHeight: 1.4 }}>
                    Plusieurs de tes cycles pointent dans la même direction aujourd'hui — c'est rare. Quand tes différents rythmes s'alignent, ton potentiel est amplifié.
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
            const talent = ELEM_TEXT[activeGT.element?.toLowerCase()] || 'tes forces naturelles';
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
                  Ton don naturel pour la <strong style={{ color: col }}>{talent}</strong> est particulièrement réceptif aujourd'hui. Fais confiance à tes facilités innées.
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
              venus: 'La douceur et la diplomatie sont tes leviers du jour.',
              mars: 'Ose poser une action courageuse, même petite.',
              jupiter: 'Garde une vision large — ne te perds pas dans les détails.',
              saturn: 'La rigueur et la patience sont tes alliées.',
              moon: 'Accueille tes émotions sans chercher à les rationaliser.',
              sun: 'Reste centré sur ton intention principale.',
              uranus: 'L\'inattendu peut être une porte de sortie.',
              neptune: 'Fais confiance à ton intuition plus qu\'à la logique.',
              pluto: 'Une transformation profonde est à l\'oeuvre — laisse partir.',
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
                  Un défi structurel familier se présente — ta force intérieure est mise à contribution.
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
            const calcMeta = (a: number, b: number) => Math.round((a + b) / 2); // Sprint V — moyenne réelle (était max+15%min → gonflait piliers)

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
            // Normalisation : avg = 1.0 — Sprint X (Option A) : clamp [0.93, 1.07] (était [0.87, 1.20])
            // Réduit l'amplitude max de ±13% à ±7% → piliers restent dans ±5 pts des domaines
            const nF = Math.max(0.93, Math.min(1.07, (wF / wTotal) * 3));
            const nL = Math.max(0.93, Math.min(1.07, (wL / wTotal) * 3));
            const nE = Math.max(0.93, Math.min(1.07, (wE / wTotal) * 3));
            const metaScore = (base: number, w: number) => Math.min(100, Math.max(0, Math.round(base * w)));

            const meta = [
              { key: 'FAIRE', icon: '🌟', label: 'Agir & Créer',    color: '#f59e0b', val: metaScore(calcMeta(domScore('BUSINESS'), domScore('CREATIVITE')), nF), sub: 'Affaires · Créativité' },
              { key: 'LIER',  icon: '🤝', label: 'Relier',        color: '#c084fc', val: metaScore(calcMeta(domScore('AMOUR'), domScore('RELATIONS')), nL),     sub: 'Amour · Relations'    },
              { key: 'ETRE',  icon: '🧘', label: 'Équilibre',     color: '#4ade80', val: metaScore(calcMeta(domScore('VITALITE'), domScore('INTROSPECTION')), nE), sub: 'Vitalité · Intro'   },
            ];
            return (
              <div className="grid-responsive-3" style={{ marginBottom: 12, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {meta.map(m => (
                  <div key={m.key} style={{
                    padding: '10px 8px', borderRadius: 10, textAlign: 'center',
                    background: `${m.color}0a`, border: `1px solid ${m.color}25`,
                  }}>
                    <div style={{ fontSize: 18, marginBottom: 3 }}>{m.icon}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: m.color, textTransform: 'uppercase', letterSpacing: 0.8 }}>{m.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, margin: '4px 0',
                      color: m.val >= 70 ? m.color : m.val >= 45 ? P.textMid : '#ef4444' }}>
                      {m.val}<span style={{ fontSize: 10, fontWeight: 400, opacity: 0.6 }}>/100</span>
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
                Comment l'énergie du jour se répartit dans les 6 domaines de ta vie.
              </div>

              <div style={{ display: 'grid', gap: 10 }}>
                {cv.contextualScores.domains.map(d => {
                  // Ronde Pilotage P9 : pct = d.score (engine) — DOIT être cohérent avec d.directive
                  // Sprint W adjustDomain retiré car il créait un décalage score/directive
                  // (ex: d.score=73 → directive "bon", mais pct=78 affiché → utilisateur voit 78 + "bon")
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
                          {pct}<span style={{ fontSize: 11, fontWeight: 400, opacity: 0.6 }}>/100</span>
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
                            Stimulé par ton secteur personnel
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
            const best = getBestHoursToday(new Date(), 3, data.astro?.b3?.asc);
            if (!ph) return null;
            const qualColor = ph.quality === 'favorable' ? '#4ade80' : ph.quality === 'challenging' ? '#ef4444' : P.textMid;
            const qualLabel = ph.quality === 'favorable' ? 'Favorable' : ph.quality === 'challenging' ? 'Tendu' : 'Neutre';
            return (
              <div style={{ marginBottom: 20, padding: 14, background: P.bg, borderRadius: 10, border: `1px solid ${P.cardBdr}` }}>
                <div style={{ fontSize: 11, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 4 }}>
                  ⏱ Heure Planétaire
                </div>
                <div style={{ fontSize: 10, color: P.textDim, marginBottom: 10, lineHeight: 1.4 }}>
                  Chaque heure de la journée est gouvernée par une planète. Certaines sont favorables à l'action, d'autres invitent au recul. Ce bloc se met à jour automatiquement — reviens plus tard pour voir l'heure suivante.
                </div>

                {/* Heure courante */}
                {(() => {
                  const sH = new Date(ph.startMs).getHours().toString().padStart(2, '0');
                  const sM = new Date(ph.startMs).getMinutes().toString().padStart(2, '0');
                  const eH = new Date(ph.endMs).getHours().toString().padStart(2, '0');
                  const eM = new Date(ph.endMs).getMinutes().toString().padStart(2, '0');
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4, padding: '10px 12px',
                      background: `${qualColor}08`, borderRadius: 8, border: `1px solid ${qualColor}20` }}>
                      <div style={{ fontSize: 28 }}>{ph.icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: P.text }}>{ph.label}</div>
                        <div style={{ fontSize: 10, color: P.textDim, marginTop: 2 }}>
                          En cours : {sH}h{sM} → {eH}h{eM}
                        </div>
                        <div style={{ fontSize: 11, color: P.textDim, marginTop: 2 }}>{ph.keywords.join(' · ')}</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        <div style={{ padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 700,
                          color: qualColor, background: `${qualColor}15`, border: `1px solid ${qualColor}30` }}>
                          {qualLabel}
                        </div>
                      </div>
                    </div>
                  );
                })()}
                <div style={{ fontSize: 10, color: qualColor, marginBottom: best.length > 0 ? 10 : 0, padding: '0 12px', lineHeight: 1.4, fontStyle: 'italic' }}>
                  {ph.quality === 'favorable'
                    ? '→ Bon créneau pour agir, décider, communiquer.'
                    : ph.quality === 'challenging'
                    ? '→ Heure de ralentissement — évite les décisions importantes, préfère la réflexion.'
                    : '→ Créneau neutre — pas d\'élan particulier, reste sur tes tâches en cours.'}
                </div>

                {/* Prochaines heures favorables */}
                {best.length > 0 && (
                  <>
                    <div style={{ fontSize: 10, color: P.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                      Prochains créneaux favorables
                    </div>
                    <div style={{ fontSize: 9, color: P.textDim, marginBottom: 6, lineHeight: 1.3 }}>
                      Moments où l'énergie planétaire soutient tes actions — idéal pour décider ou lancer.
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {best.map((h, i) => {
                        const start = new Date(h.startMs);
                        const hh = start.getHours().toString().padStart(2, '0');
                        const mm = start.getMinutes().toString().padStart(2, '0');
                        return (
                          <div key={i} style={{ flex: 1, padding: '8px 8px', borderRadius: 8,
                            background: '#4ade8008', border: '1px solid #4ade8020', textAlign: 'center' }}>
                            <div style={{ fontSize: 18 }}>{h.icon}</div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#4ade80', marginTop: 2 }}>
                              {planetFr(h.planet)}
                            </div>
                            <div style={{ fontSize: 10, color: P.textMid, marginTop: 1 }}>{hh}h{mm}</div>
                            <div style={{ fontSize: 8, color: P.textDim, marginTop: 2 }}>{h.keywords?.slice(0, 2).join(' · ') ?? ''}</div>
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
            const todayStr2 = localDateStr();
            const arcane = getArcana(calcPersonalDayCard(bd, todayStr2));
            // Ronde Pilotage P4 (miroir) : note contextuelle pour vue détaillée
            const CHALLENGING_ARCANA_D = [13, 15, 16, 18];
            const isChallengingD = CHALLENGING_ARCANA_D.includes(arcane.num);
            const contextNoteD = (isChallengingD && cv.score >= 80)
              ? `${arcane.light} — l'énergie du jour transcende ce défi.`
              : (isChallengingD && cv.score <= 35)
              ? `${arcane.shadow} — reste vigilant aujourd'hui.`
              : null;
            return (
              <div style={{ marginBottom: 20, padding: 14, background: P.bg, borderRadius: 10, border: `1px solid ${P.cardBdr}` }}>
                <div style={{ fontSize: 11, color: P.gold, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 4 }}>
                  🃏 Arcane du Jour
                </div>
                <div style={{ fontSize: 10, color: P.textDim, marginBottom: 8, lineHeight: 1.4 }}>
                  Tirée des 22 Arcanes Majeurs du Tarot de Marseille. Le calcul combine ton date de naissance et la date du jour — cette carte change chaque jour (contrairement à l'Arcane de Cycle de Vie, plus bas, qui reste fixe pendant plusieurs années).
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  {arcane.image ? (
                    <img
                      src={arcane.image}
                      alt={arcane.name_fr}
                      style={{
                        width: 56, height: 90, objectFit: 'cover',
                        borderRadius: 6, border: `1px solid ${P.gold}44`,
                        flexShrink: 0, background: '#1a1a2e',
                      }}
                      loading="lazy"
                    />
                  ) : (
                    <div style={{ width: 56, height: 90, background: `${P.gold}12`, borderRadius: 6, border: `1px solid ${P.gold}33`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 24 }}>🃏</span>
                      <span style={{ fontSize: 8, color: P.gold, fontWeight: 700, marginTop: 2 }}>{arcane.num}</span>
                    </div>
                  )}
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
                {contextNoteD && (
                  <div style={{ marginTop: 6, padding: '6px 10px', background: cv.score >= 80 ? '#4ade8010' : '#ef444410', borderRadius: 8, borderLeft: `2px solid ${cv.score >= 80 ? '#4ade80' : '#ef4444'}44` }}>
                    <div style={{ fontSize: 11, color: cv.score >= 80 ? '#4ade80' : '#ef4444', lineHeight: 1.5, fontStyle: 'italic' }}>
                      ↳ {contextNoteD}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Sprint AR P3 : bloc Synergies Actives supprimé — cv.interactions retiré (Ronde 11 consensus 3/3) */}

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
                  ? 'Une éclipse lunaire amplifie les émotions et pousse au changement. C\'est un moment de bilan intérieur — ce qui ne te sert plus tend à partir naturellement.'
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
                          ? '🌟 AUJOURD\'HUI — phénomène en cours'
                          : (ev.status === 'past' || ev.daysUntil < 0)
                          ? `Depuis ${Math.abs(ev.daysUntil)} jour${Math.abs(ev.daysUntil) > 1 ? 's' : ''} — ${new Date(ev.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
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
            <div style={{ fontSize: 11, color: P.gold, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 4 }}>✦ Climat Stratégique</div>
            <div style={{ fontSize: 10, color: P.textDim, marginBottom: 10, lineHeight: 1.4 }}>
              L'ambiance générale à 3 échelles de temps, basée sur tes cycles numériques personnels (chemin de vie + année/mois/semaine universels). Chaque période a sa propre dynamique.
            </div>
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
                Identifie la force du calendrier chinois qui influence tes actions et relations aujourd'hui.
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
                        {/* Ronde 21-bis: Label FR lisible (sans caractères chinois) */}
                        <div style={{ fontSize: 13, fontWeight: 800, color: dom.isZheng ? '#4ade80' : '#f59e0b', textAlign: 'center' }}>
                          {dom.label.replace(/^[\u4e00-\u9fff\s]+/, '').trim()}
                        </div>
                        <div style={{ fontSize: 8, color: P.textDim, textAlign: 'center', marginTop: 2 }}>
                          {dom.isZheng ? 'Énergie stable' : 'Énergie intense'}
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.5 }}>
                          {tenGodHuman(dom.label)}
                        </div>
                        <div style={{ fontSize: 11, color: dom.isZheng ? '#4ade80' : '#f59e0b', marginTop: 4, fontWeight: 600 }}>
                          Impact : {tg.totalScore > 0 ? '+' : ''}{tg.totalScore} sur ton journée
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      {[
                        { label: 'Affaires', pts: tg.businessPts, icon: '💼', color: '#4ade80' },
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
                  {moonPhaseAction(moon.name, cv.score)}
                </div>
                <div style={{ fontSize: 10, color: P.textDim, marginTop: 2 }}>
                  {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} · {moon.illumination}% de la surface éclairée{moon.illumination >= 97 ? ' (pleine)' : moon.illumination <= 3 ? ' (nouvelle)' : ''}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 10, color: P.textDim, marginTop: 8, lineHeight: 1.4 }}>
              La Lune influence l'énergie émotionnelle et l'intuition. Chaque phase favorise un type d'action différent — la pleine lune amplifie les résultats, la nouvelle lune invite au recul.
            </div>
            <div style={{ fontSize: 12, color: P.textMid, marginTop: 6, lineHeight: 1.6 }}>
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
                    <div style={{ fontSize: 10, color: P.textDim, marginTop: 2, lineHeight: 1.4 }}>
                      Cycle védique (Vimshottari Dasha) — complémentaire du Cycle de fond chinois ci-dessus. Chaque « saison » de 6 à 20 ans, gouvernée par une planète, colore les grandes tendances de ta vie.
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color, marginTop: 6 }}>
                      {saison}
                      {isSandhi && <span style={{ fontSize: 11, color: '#fbbf24', marginLeft: 8, fontWeight: 600 }}>⚠ Changement de saison proche</span>}
                    </div>
                  </div>
                  <div style={{
                    padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                    color, background: `${color}12`, border: `1px solid ${color}30`,
                    textAlign: 'right',
                  }}>
                    <div>{DASHA_LORD_LABEL[mahaLord] ?? mahaLord}</div>
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
                    <span>PÉRIODE MAJEURE {mahaLord.toUpperCase()}</span>
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
                    <div style={{ fontSize: 9, color: P.textDim, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>Période secondaire</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color, marginTop: 2 }}>{DASHA_LORD_LABEL[antarLord] ?? antarLord}</div>
                    <div style={{ fontSize: 10, color: P.textDim, marginTop: 2 }}>encore {antarRemain}</div>
                  </div>
                  {/* Pratyantar — tooltip hover */}
                  <div
                    title={pratNarr}
                    style={{ padding: '8px 10px', borderRadius: 8, background: `${color}06`, border: `1px solid ${color}14`, cursor: 'help' }}
                  >
                    <div style={{ fontSize: 9, color: P.textDim, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>Micro-cycle actuel</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: P.textMid, marginTop: 2 }}>{DASHA_LORD_LABEL[pratLord] ?? pratLord}</div>
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
                      {/* Image Arcane de Saison */}
                      {arcana.image ? (
                        <img
                          src={arcana.image}
                          alt={arcana.name_fr}
                          style={{
                            width: 34, height: 54, objectFit: 'cover',
                            borderRadius: 4, border: `1px solid ${color}35`,
                            flexShrink: 0, background: '#1a1a2e',
                          }}
                          loading="lazy"
                        />
                      ) : (
                        <div style={{
                          width: 34, height: 34, borderRadius: 6, flexShrink: 0,
                          background: `${color}15`, border: `1px solid ${color}35`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 800, color, fontFamily: 'serif',
                        }}>
                          {ROMAN_ARCANA[arcana.num] ?? arcana.num}
                        </div>
                      )}
                      {/* Texte */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 9, color: P.textDim, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 600 }}>
                          🎴 Arcane de Cycle de Vie
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color, marginTop: 1 }}>
                          {arcana.name_fr}
                        </div>
                        <div style={{ fontSize: 10, color: P.textMid, marginTop: 1, fontStyle: 'italic' }}>
                          {arcana.theme}
                        </div>
                        <div style={{ fontSize: 9, color: P.textDim, marginTop: 3, lineHeight: 1.3 }}>
                          Cette carte ne change pas chaque jour — elle accompagne ton cycle de vie actuel (plusieurs années).
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })()}

            </div>
            )}
            </div>

          {/* ════════ BOTTOM: SHARE + BRIEF + CALIBRATION ════════ */}

          {/* V9 Sprint 7d — Bouton Carte du Jour */}
          <div style={{ marginTop: 18, marginBottom: 12 }}>
            <button
              onClick={generateDayCard}
              disabled={isSharingDay}
              aria-label={isSharingDay ? 'Génération en cours' : 'Partager le score du jour'}
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

          {/* Brief copy button */}
          <div style={{ marginBottom: 16, textAlign: 'center' }}>
            <button onClick={handleBrief} aria-label={copied ? 'Brief du jour copié' : 'Copier mon brief du jour'} style={{
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

          {/* AC-3 ═══ Calibration Fluide / Équilibré / Exigeant ═══ */}
          {(() => {
            const profiles: CalibProfile[] = ['fluide', 'equilibre', 'exigeant'];
            const calibState = getCalibState();
            return (
              <div style={{ marginTop: 16, padding: '10px 12px', background: '#ffffff06', borderRadius: 10, border: '1px solid #ffffff10' }}>
                <div style={{ fontSize: 9, color: P.textDim, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>
                  Ton niveau d'exigence
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {profiles.map(p => {
                    const pl   = PROFILE_LABELS[p];
                    const isSel = calibState.profile === p;
                    return (
                      <button
                        key={p}
                        onClick={() => { setCalibProfile(p, todayStr); setCalibMode(null); }}
                        style={{
                          flex: 1, padding: '7px 4px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                          background: isSel ? `${pl.color}22` : 'transparent',
                          border: `1px solid ${isSel ? pl.color + '60' : '#ffffff18'}`,
                          color: isSel ? pl.color : P.textMid,
                          fontSize: 10, fontWeight: isSel ? 700 : 400,
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span style={{ fontSize: 14 }}>{pl.icon}</span>
                        <span>{pl.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Calibration Firebase — T6 — V11.1 UX : masqué si accuracy < 60 */}
                {cv.calibration && cv.calibration.recentVotes >= 5 && cv.calibration.accuracy >= 60 && (
                  <div style={{
                    marginTop: 10, padding: '10px 12px',
                    background: cv.calibration.accuracy >= 75 ? '#4ade800a' : '#D4AF370a',
                    borderRadius: 8,
                    border: `1px solid ${cv.calibration.accuracy >= 75 ? '#4ade8025' : '#D4AF3725'}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 12 }}>{cv.calibration.accuracy >= 80 ? '🎯' : '📊'}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: cv.calibration.accuracy >= 75 ? '#4ade80' : '#D4AF37' }}>
                        {cv.calibration.accuracy >= 80
                          ? 'Calcul bien adapté à ton profil'
                          : 'Le calcul s\'adapte à toi'}
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: P.textDim, lineHeight: 1.3 }}>
                      {cv.calibration.accuracy >= 80
                        ? 'Tes retours confirment la fiabilité des prédictions.'
                        : 'Continue à noter tes journées pour affiner les prédictions.'}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </Cd>
      </Sec>
    </div>
  );
}
