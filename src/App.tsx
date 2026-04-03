import { useState, useMemo, useCallback, useEffect, useRef, lazy, Suspense } from 'react';
// Phase 1 Architecture 3 couches — imports centralisés via orchestrator
import { buildSoulData, buildTemporalData, buildPSIData, buildYearPreviews, type SoulData, type DayPreview } from './engines/orchestrator';
import { clearRarityCache, clearDayPreviewCache } from './engines/convergence';
import { findCity, isFranceDST } from './engines/astrology';
import { generateStrategicReading } from './engines/strategic-reading';
import { sto } from './engines/storage';
import { runWeeklyAlphaGUpdate } from './engines/alpha-calibration'; // Phase 3c — centralisé
import { runWeeklyPredictiveValidation } from './engines/predictive-validation'; // Phase 3c — centralisé
import { useSyncDailyVector } from './engines/useSyncDailyVector';
import type { PSIResult } from './engines/temporal';
// Phase 1 Firebase Auth
import { useAuth } from './hooks/useAuth';
import AuthModal from './components/AuthModal';
import { loadProfile, saveProfile, migrateAnonymousData } from './hooks/useProfilePersistence';
import { getCurrentUid, getAnonymousUid } from './firebase';
import { useNotifications } from './hooks/useNotifications';
// Multi-profile system
import { useProfiles, MAX_PROFILES, type UserProfile } from './hooks/useProfiles';
import ProfileSwitcher from './components/ProfileSwitcher';
// Lazy-loaded tabs — code-split pour réduire le bundle initial
const ConvergenceTab = lazy(() => import('./components/ConvergenceTab'));
const ProfileTab     = lazy(() => import('./components/ProfileTab'));
const AstroTab       = lazy(() => import('./components/AstroTab'));
const IChingTab      = lazy(() => import('./components/IChingTab'));
const LectureTab     = lazy(() => import('./components/LectureTab'));
const CalendarTab    = lazy(() => import('./components/CalendarTab'));
const TemporalTab    = lazy(() => import('./components/TemporalTab'));
const BondTab        = lazy(() => import('./components/BondTab'));
import { type TemporalData } from './components/TemporalTab';
import { Cd, P, FocusVisibleStyle } from './components/ui';
import OnboardingModal, { isOnboardingDone } from './components/OnboardingModal'; // V9 Sprint 7c

// Inject custom scrollbar for tabs (once)
if (typeof document !== 'undefined' && !document.getElementById('sp-tabs-scroll')) {
  const s = document.createElement('style');
  s.id = 'sp-tabs-scroll';
  s.textContent = `
    .sp-tabs-bar::-webkit-scrollbar { height: 6px; }
    .sp-tabs-bar::-webkit-scrollbar-track { background: #18181b; border-radius: 3px; }
    .sp-tabs-bar::-webkit-scrollbar-thumb { background: #FFD70066; border-radius: 3px; min-width: 40px; }
    .sp-tabs-bar::-webkit-scrollbar-thumb:hover { background: #FFD700aa; }
    .sp-tabs-bar { scrollbar-width: thin; scrollbar-color: #FFD70066 #18181b; }
  `;
  document.head.appendChild(s);
}

// SoulData est maintenant définie dans engines/orchestrator.ts — re-export pour compatibilité
export type { SoulData } from './engines/orchestrator';

const tabs = [
  { id: 'convergence', l: 'Pilotage',    i: '⭐' },
  { id: 'calendar',    l: 'Calendrier',  i: '📅' },
  { id: 'profile',     l: 'Profil',      i: '✦' },
  { id: 'bond',        l: 'Affinité',    i: '✨' },
  { id: 'astro',       l: 'Astro',       i: '🌙' },
  { id: 'iching',      l: 'Yi King · Tarot', i: '☰🎴' },
  { id: 'insights',     l: 'Lecture',      i: '📖' },
];

export default function App() {
  // ── Firebase Auth — Phase 1 ──
  const { user, loading: authLoading, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(true);

  // ── PWA Install Prompt ──
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);
  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setShowInstallBanner(false);
      setDeferredPrompt(null);
    }
  };

  // ── Notifications ──
  const { showBanner: showNotifBanner, enabled: notifEnabled, requestPermission, dismissBanner: dismissNotifBanner, toggleNotifications, notifyDailyScore, permission: notifPermission } = useNotifications();

  // ── Onboarding — V9 Sprint 7c ──
  const [showOnboarding, setShowOnboarding] = useState(() => !isOnboardingDone());

  const [fn, setFn] = useState('');
  const [mn, setMn] = useState('');
  const [ln, setLn] = useState('');
  const [bd, setBd] = useState('');
  const [bt, setBt] = useState('');
  const [bp, setBp] = useState('');
  const [gn, setGn] = useState<'M' | 'F'>('M');
  const [tz, setTz] = useState(Math.round(-new Date().getTimezoneOffset() / 60));
  const [tab, setTab] = useState('convergence');
  const [lock, setLock] = useState({ fn: '', mn: '', ln: '', bd: '', bt: '', bp: '', gn: 'M' as 'M' | 'F', tz: Math.round(-new Date().getTimezoneOffset() / 60) });

  // ── Multi-profile system ──
  const { profiles, loading: profilesLoading, addProfile, updateProfile, removeProfile, setMainProfile } = useProfiles(user?.uid ?? null);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  // Guard anti-écrasement : true pendant un switch de profil → bloque le useEffect de sauvegarde
  // Évite la race condition React où lock est mis à jour avant activeProfileId
  const isSwitchingProfileRef = useRef(false);
  const [showAddProfileForm, setShowAddProfileForm] = useState(false);
  const [newProfileLabel, setNewProfileLabel] = useState('');

  const dirty = fn !== lock.fn || mn !== lock.mn || ln !== lock.ln || bd !== lock.bd || bt !== lock.bt || bp !== lock.bp || gn !== lock.gn || tz !== lock.tz;
  const canCalc = !!(fn.trim() && ln.trim() && bd);

  const [narr, setNarr] = useState('');
  const [narrLoad, setNarrLoad] = useState(false);

  // Cleanup localStorage stale keys on mount
  useEffect(() => { sto.cleanup(); }, []);

  // ── Load profile when user logs in (Phase 1 Firebase Auth) ──
  useEffect(() => {
    if (!user || authLoading) return;

    const loadAndPopulateProfile = async () => {
      const profile = await loadProfile(user.uid);
      if (profile) {
        setFn(profile.fn);
        setMn(profile.mn);
        setLn(profile.ln);
        setBd(profile.bd);
        setBt(profile.bt);
        setBp(profile.bp);
        setGn(profile.gn);
        setTz(profile.tz);
        setLock({ fn: profile.fn, mn: profile.mn, ln: profile.ln, bd: profile.bd, bt: profile.bt, bp: profile.bp, gn: profile.gn, tz: profile.tz });
      }
    };

    loadAndPopulateProfile();

    // Close auth modal when user logs in
    setShowAuthModal(false);
  }, [user, authLoading]);

  // ── Set active profile to main when profiles load ──
  // Auto-create main profile if user is logged in, has data, but no profiles exist
  // Bug fix Ronde #3 : ne PAS re-sélectionner le main si un profil est déjà actif
  // (sinon lock.bd change → activeProfileId revient au main → écrase le main avec les données secondaires)
  useEffect(() => {
    if (profiles.length > 0) {
      // Seulement sélectionner si aucun profil actif, ou si l'actif n'existe plus
      const activeStillExists = activeProfileId && profiles.some(p => p.id === activeProfileId);
      if (!activeStillExists) {
        const mainProfile = profiles.find((p) => p.isMain);
        if (mainProfile) {
          setActiveProfileId(mainProfile.id);
        } else {
          setActiveProfileId(profiles[0].id);
        }
      }
    } else if (user && !profilesLoading && lock.bd) {
      // Auto-create the main profile from current form data
      addProfile({
        label: 'Mon profil',
        fn: lock.fn, mn: lock.mn, ln: lock.ln,
        bd: lock.bd, bt: lock.bt, bp: lock.bp,
        gn: lock.gn, tz: lock.tz,
        isMain: true,
      }).then(p => setActiveProfileId(p.id)).catch(() => {});
    } else {
      setActiveProfileId(null);
    }
  }, [profiles, user, profilesLoading, lock.bd]);

  // ── Save/update active profile to Firestore when locked (Phase 1 Firebase Auth) ──
  useEffect(() => {
    if (!user || authLoading || !lock.bd) return;

    // Guard : si on vient de switcher de profil, on ne sauvegarde pas
    // (évite la race condition lock-avant-activeProfileId qui écrase l'ancien profil)
    if (isSwitchingProfileRef.current) {
      isSwitchingProfileRef.current = false;
      return;
    }

    // Vérification supplémentaire : le profil actif doit correspondre aux données de lock
    // (double guard au cas où le ref ne suffit pas sur des renders multiples)
    const activeProfile = profiles.find(p => p.id === activeProfileId);
    if (activeProfile && activeProfile.bd && activeProfile.bd !== lock.bd) {
      // lock et activeProfile ne correspondent pas encore → ne pas sauvegarder
      return;
    }

    // Update the active profile in the multi-profile collection
    if (activeProfileId && profiles.length > 0) {
      updateProfile(activeProfileId, {
        fn: lock.fn, mn: lock.mn, ln: lock.ln,
        bd: lock.bd, bt: lock.bt, bp: lock.bp,
        gn: lock.gn, tz: lock.tz,
      }).catch(() => {});
    }

    // Also save to old settings/profile path for backward compat
    saveProfile(user.uid, {
      fn: lock.fn, mn: lock.mn, ln: lock.ln,
      bd: lock.bd, bt: lock.bt, bp: lock.bp,
      gn: lock.gn, tz: lock.tz,
    });
  }, [user, authLoading, lock]);

  // ── Handle profile switching ──
  const handleSwitchProfile = (profile: UserProfile) => {
    // Armer le guard avant tout setState pour éviter la race condition de sauvegarde
    isSwitchingProfileRef.current = true;
    setActiveProfileId(profile.id);
    setFn(profile.fn);
    setMn(profile.mn);
    setLn(profile.ln);
    setBd(profile.bd);
    setBt(profile.bt);
    setBp(profile.bp);
    setGn(profile.gn);
    setTz(profile.tz);
    setLock({ fn: profile.fn, mn: profile.mn, ln: profile.ln, bd: profile.bd, bt: profile.bt, bp: profile.bp, gn: profile.gn, tz: profile.tz });
    clearRarityCache();
    clearDayPreviewCache();
    setNarr('');
  };

  // ── Handle adding a new profile ──
  const handleAddProfile = async () => {
    setShowAddProfileForm(true);
  };

  const handleCreateProfile = async () => {
    if (!newProfileLabel.trim() || !user) {
      alert('Veuillez entrer un nom pour le profil');
      return;
    }

    try {
      const newProfile = await addProfile({
        label: newProfileLabel.trim(),
        fn: '',
        mn: '',
        ln: '',
        bd: '',
        bt: '',
        bp: '',
        gn: 'M',
        tz: Math.round(-new Date().getTimezoneOffset() / 60),
        isMain: false,
      });

      setNewProfileLabel('');
      setShowAddProfileForm(false);
      handleSwitchProfile(newProfile);
    } catch (err) {
      console.error('[App] Failed to create profile:', err);
      alert('Impossible de créer le profil. Veuillez réessayer.');
    }
  };

  // ── Handle deleting a profile ──
  const handleDeleteProfile = async (profileId: string) => {
    try {
      await removeProfile(profileId);
      if (activeProfileId === profileId && profiles.length > 0) {
        const nextProfile = profiles.find((p) => p.id !== profileId && p.isMain) || profiles.find((p) => p.id !== profileId);
        if (nextProfile) {
          handleSwitchProfile(nextProfile);
        }
      }
    } catch (err) {
      console.error('[App] Failed to delete profile:', err);
      alert('Impossible de supprimer le profil. Veuillez réessayer.');
    }
  };

  // Phase 3c — Effets hebdomadaires centralisés (idempotents, 1×/semaine max)
  useEffect(() => { runWeeklyAlphaGUpdate(new Date()); }, []);
  useEffect(() => { runWeeklyPredictiveValidation(new Date()); }, []);

  // Load Puter.js (free GPT-4o-mini proxy)
  useEffect(() => {
    if ((window as unknown as { puter?: unknown }).puter) return;
    const s = document.createElement('script');
    s.src = 'https://js.puter.com/v2/';
    document.head.appendChild(s);
  }, []);

  const doVal = async () => {
    // V2 : purge des caches profil-dépendants si le profil change (date de naissance)
    if (lock.bd && bd !== lock.bd) {
      const PROFILE_CACHES = [
        'kairo_calib_v1', 'kairo_predictive_v1', 'kairo_alphag_v1',
        'kairo_deltas_v1', 'kn_personal_weights', 'kn_breakdown_history',
        'sp_validation_feedback', 'k_daily_memory', 'k_resonance_log',
        'k_undercurrent_history', 'k_feeling_history', 'k_somatic_history',
      ];
      PROFILE_CACHES.forEach(k => { try { sto.remove(k); } catch { /* */ } });
    }

    // Save to Firestore if user is logged in and we have an active profile
    if (user && activeProfileId && profiles.length > 0) {
      const activeProfile = profiles.find((p) => p.id === activeProfileId);
      if (activeProfile) {
        try {
          await updateProfile(activeProfileId, {
            ...activeProfile,
            fn,
            mn,
            ln,
            bd,
            bt,
            bp,
            gn,
            tz,
          });
        } catch (err) {
          console.error('[App] Failed to save profile:', err);
        }
      }
    }

    clearRarityCache(); clearDayPreviewCache(); setLock({ fn, mn, ln, bd, bt, bp, gn, tz }); setTab('convergence'); setNarr('');
  };

  // Phase 1 : calcul SoulData délégué à orchestrator.ts
  const data = useMemo<SoulData | null>(() => buildSoulData(lock), [lock]);

  // V8 Option C — Collecte silencieuse quotidienne (fire-and-forget)
  useSyncDailyVector(data, lock.bd);

  // ── Bridge Temporal — Phase 1 : délégué à orchestrator.ts ──
  const temporal = useMemo(() => {
    if (!data) return null;
    return buildTemporalData(data, lock.bd);
  }, [data, lock.bd]);


  // ── Phase 3a : Year Previews mutualisé (365 jours + soft-shift) ──
  // Partagé entre ConvergenceTab, CalendarTab, ProfileTab, LectureTab
  const yearPreviews = useMemo<DayPreview[] | null>(() => {
    if (!data) return null;
    return buildYearPreviews(
      lock.bd, data.num, data.cz, data.astro ?? null,
      data.conv.ctxMult ?? 1.0, data.conv.dashaMult ?? 1.0,
      data.conv.shadowBaseSignal ?? 0, lock.bt || undefined,
    );
  }, [data, lock.bd, lock.bt]);

  // ── PSI — Phase 1 : délégué à orchestrator.ts ──
  // P1.1 : Lazy load — calcul uniquement si l'onglet convergence ou insights est actif
  const psiData = useMemo<PSIResult | null>(() => {
    if (!data) return null;
    if (tab !== 'convergence' && tab !== 'insights') return null;
    return buildPSIData(data, lock.bd);
  }, [data, lock.bd, tab]);

  // ── Notification quotidienne — déclenchée quand le score est prêt ──
  useEffect(() => {
    if (!data) return;
    const s = data.conv.score;
    const dt = data.conv.dayType;
    const hint = s >= 65
      ? (dt.type === 'observation' ? 'lucidité aiguisée — agis avec précision sur tes vraies priorités' : dt.type === 'retrait' ? 'intériorité puissante — médite, clarifie' : dt.desc)
      : dt.desc;
    notifyDailyScore(s, dt.label, hint);
  }, [data, notifyDailyScore]);

  // V5.4: Micro-validation → fragment prompt GPT (pondération par résonance utilisateur)
  const getResonancePromptFragment = (): string => {
    try {
      const stored = sto.getRaw('k_resonance_log');
      if (!stored) return '';
      const log: { date: string; category: string; snippet: string; sources: string[] }[] = JSON.parse(stored);
      // Ne considérer que les 30 derniers jours
      const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
      const recent = log.filter(e => new Date(e.date).getTime() > cutoff);
      if (recent.length < 5) return ''; // Pas assez de données pour pondérer

      // Compter par système
      const sysCount: Record<string, number> = {};
      for (const e of recent) {
        for (const s of e.sources) sysCount[s] = (sysCount[s] || 0) + 1;
      }
      const topSystems = Object.entries(sysCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .filter(([, c]) => c >= 2)
        .map(([s]) => s);

      if (topSystems.length === 0) return '';

      // Compter par catégorie
      const catCount: Record<string, number> = {};
      for (const e of recent) catCount[e.category] = (catCount[e.category] || 0) + 1;
      const topCat = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0]?.[0];

      const catLabel: Record<string, string> = {
        'micro-detail': 'les micro-détails spécifiques',
        'undercurrent': 'les courants souterrains (Hu Gua)',
        'contradiction': 'les tensions et contradictions',
      };

      return `\nPERSONNALISATION (basée sur ${recent.length} retours utilisateur):\n` +
        `- L'utilisateur réagit le plus à ${catLabel[topCat || ''] || 'les insights'}. Insiste sur ce type de contenu.\n` +
        `- Systèmes préférés : ${topSystems.join(', ')}. Donne-leur plus de place dans ta narration.\n`;
    } catch { return ''; }
  };

  const genNarr = useCallback(async () => {
    if (!data) return;
    setNarrLoad(true);
    setNarr('');

    // Générer la lecture structurée comme contexte pour l'IA
    const birthHour = lock.bt ? parseInt(lock.bt.split(':')[0]) : undefined;
    const reading = generateStrategicReading(data, lock.bd, undefined, 'M', birthHour);

    // Sérialiser les données clés pour le prompt structuré
    const pastInsights = reading.past.insights.map(i => `- ${i.icon} ${i.text}`).join('\n');
    const presentInsights = reading.present.insights.map(i => `- ${i.icon} ${i.text}`).join('\n');
    const futureInsights = reading.future.insights.map(i => `- ${i.icon} ${i.text}`).join('\n');
    const crossingsText = reading.crossings.map(c => `- ${c.icon} ${c.theme} (${c.strength} systèmes: ${c.systems.join(', ')}): ${c.description}`).join('\n');
    const actionsText = reading.actionPlan.map((a, i) => `${i + 1}. ${a.action} — ${a.why}`).join('\n');
    const microText = reading.microDetails?.map(m => `- ${m.text} [${m.sources.join('+')}]`).join('\n') || '';
    const windowText = reading.majorWindow ? `FENÊTRE: ${reading.majorWindow.narrative}` : '';

    // ═══ PROMPT V2.6 — 10 ÉTAPES NARRATIVES (consensus Grok×Gemini×GPT) ═══
    // Méthode : 10 phrases ordonnées, chaque étape croise 2-3 systèmes minimum
    // Ton : "Dark Luxe" — chirurgical, souverain, business. Pas de new-age.
    // Ratio : 70% plausible + 30% spécifique = cold reading optimal (Grok)

    let pr = `Tu es un conseiller stratégique d'élite. Tu lis les cycles de vie comme un analyste lit un bilan : avec précision, sans complaisance, orienté action.\n\n`;
    pr += `STYLE: Tutoiement. Phrases courtes. Vocabulaire business (flux, trajectoire, pivot, levier, audit). Zéro jargon ésotérique. Zéro "l'univers te dit". Tu parles comme un mentor CEO, pas un astrologue.\n\n`;

    pr += `PRÉNOM: ${lock.fn}\n`;
    pr += `PORTRAIT: ${reading.portrait}\n`;
    pr += `VERDICT: ${reading.todayVerdict}\n`;
    pr += `${windowText}\n\n`;

    pr += `═══ DONNÉES BRUTES ═══\n`;
    pr += `PASSÉ (${reading.past.period}):\n${pastInsights}\n\n`;
    pr += `PRÉSENT (${reading.present.period}):\n${presentInsights}\n\n`;
    pr += `FUTUR (${reading.future.period}):\n${futureInsights}\n\n`;
    pr += `CONVERGENCES (${reading.crossings.length}):\n${crossingsText}\n\n`;
    pr += `MICRO-DÉTAILS:\n${microText}\n\n`;
    pr += `PLAN D'ACTION:\n${actionsText}\n\n`;

    // V5.4: Injecter les préférences utilisateur si disponibles
    const resonanceFrag = getResonancePromptFragment();
    if (resonanceFrag) pr += resonanceFrag + '\n';

    pr += `═══ CONSIGNE — NARRATION EN 10 ÉTAPES (600 mots max) ═══\n`;
    pr += `Écris une narration fluide et continue. Chaque étape = 2-3 phrases. Utilise les données brutes, ne les répète pas mot pour mot — reformule avec ta voix.\n\n`;

    pr += `1. 🔥 PARADOXE — Ouvre avec la tension centrale du profil. Croise Chemin de Vie + Expression + Âme. "Tu es à la fois X et Y — cette dualité est ton arme."\n`;
    pr += `2. 🎯 MISSION — Sa raison d'être. Croise CdV + Yi King natal + signe solaire. Pas "ta mission spirituelle" mais "ton positionnement stratégique de fond."\n`;
    pr += `3. 📚 LEÇONS — Ce qu'il évite et qui le rattrape. Qualités à développer + Lo Shu + Challenge actif. Ton direct, pas moralisateur.\n`;
    pr += `4. 🌱 FONDATION (0-25 ans) — 1re grande phase de vie + contexte enfance/jeunesse. Ce qui a été semé. 1-2 phrases max.\n`;
    pr += `5. 🔥 ÉMERGENCE (25-35) — 2e grande phase de vie + Retour de Saturne + mutations. Le premier vrai test.\n`;
    pr += `6. 🏔️ POUVOIR (35-45) — 3e grande phase de vie + montée en puissance. Ce qui a été construit.\n`;
    pr += `7. 🌳 MATURITÉ (45+) — 4e grande phase de vie + nombre de Maturité. Synthèse de tout. Si <45 ans : ce vers quoi il évolue.\n`;
    pr += `8. 🌟 AUJOURD'HUI — Le plus important. Croise TOUTES les convergences actives. Quand plusieurs systèmes disent la même chose, martèle-le. Intègre les micro-détails naturellement. Score, type de jour, transit lunaire, synergies.\n`;
    pr += `9. 🗺️ DIRECTION — Prochain PY + prochaine grande phase de vie + Nœuds Lunaires. Pas de prédiction, mais une trajectoire claire.\n`;
    pr += `10. ✦ VERDICT FINAL — 1 phrase percutante qui résume tout. Action concrète + horizon temporel. Termine fort.\n\n`;

    pr += `RÈGLES:\n`;
    pr += `- Si une convergence montre 5+ systèmes alignés, c'est LE message du jour — insiste lourdement\n`;
    pr += `- Intègre le plan d'action dans les étapes 8-10, pas en liste séparée\n`;
    pr += `- Les micro-détails servent d'accroches "c'est exactement moi" — glisse-les aux étapes 1, 3, 8\n`;
    pr += `- Pas de titres numérotés visibles — la narration doit couler naturellement avec juste les emojis comme repères\n`;
    pr += `- Quand tu mentionnes un hexagramme Yi King (natal ou du jour), donne son nom précis suivi de "(Yi King natal)" ou "(Yi King du jour)" entre parenthèses. Ex: "En tant que Suiveur (Yi King natal n°17)"\n`;
    pr += `- Termine par une phrase lumineuse et souveraine, pas une formule de politesse\n\n`;
    pr += `TON & STYLE (OBLIGATOIRE):\n`;
    pr += `- Sois DIRECT, mystique mais pragmatique. Parle comme un stratège, pas comme un horoscope\n`;
    pr += `- INTERDICTION ABSOLUE de métaphores clichées : voyage, boussole, navire, tempête, phare, chemin, vague, étoile guide, vent dans les voiles. Utilise des images concrètes et modernes\n`;
    pr += `- Technique "cold reading" : sois SPÉCIFIQUE dans les mots mais universel dans le sens. Ex: "cette sensation de frein interne quand tout devrait avancer" plutôt que "tu traverses une période de doute"\n`;
    pr += `- Si le score est bas (<45%), sois légèrement provocateur et cash — NE SOIS PAS toxiquement positif. Ex: "Aujourd'hui n'est pas ton jour pour briller — et c'est OK. Protège tes arrières." PAS: "Même si l'énergie est basse, chaque jour est une opportunité"\n`;
    pr += `- Utilise des verbes d'état intérieurs (serrer, retenir, repousser, anticiper, encaisser, filtrer, surpiloter) plutôt que des concepts abstraits\n`;
    pr += `- JAMAIS DE PASSÉ dans le bloc Passé qui affirme un fait externe ("tu as changé de travail"). Toujours des dynamiques internes ("tes fondations ont été testées", "un réalignement profond s'est opéré")\n`;
    pr += `- Pour le futur, toujours relier à un écho du passé : "Comme lors de [période passée], mais cette fois avec [différence]"\n`;
    pr += `- Maximum 1 question rhétorique par narration. Pas de "N'est-ce pas ?", "Tu le sens ?".\n`;
    pr += `- Si l'hexagramme nucléaire (Hu Gua) apparaît dans les données, mets-le en valeur comme "ce qui travaille sous la surface" — c'est l'arme miroir la plus puissante\n`;
    pr += `- INTERDICTION de conclure par un résumé ou un conseil générique ("en résumé", "reste concentré", "affûte ta stratégie", "sois prêt", "les résultats suivront"). Termine par une IMAGE CONCRÈTE ou un SILENCE ("...et c'est exactement là que tu en es.")\n`;
    pr += `- INTERDICTION de phrases fourre-tout : "les énergies sont alignées", "tout est connecté", "le meilleur reste à venir", "écoute ton intuition", "fais confiance au processus". Ce sont des phrases mortes.\n`;
    pr += `- Chaque paragraphe doit contenir AU MOINS 1 donnée spécifique du profil (nombre, hexagramme, transit, score). Jamais de paragraphe 100% atmosphère sans ancrage.`;

    try {
      const puter = (window as unknown as { puter?: { ai: { chat: (prompt: string, opts: { model: string }) => Promise<string | { message?: { content?: string }; text?: string }> } } }).puter;
      if (!puter) { setNarr('⚠ Puter.js en cours de chargement, réessaie dans 2 secondes.'); setNarrLoad(false); return; }
      const r = await puter.ai.chat(pr, { model: 'gpt-4o-mini' });
      const txt = typeof r === 'string' ? r : r?.message?.content || r?.text || JSON.stringify(r);
      setNarr(txt);
    } catch (e: unknown) { setNarr('⚠ Erreur: ' + (e instanceof Error ? e.message : String(e))); }
    setNarrLoad(false);
  }, [data, lock]);

  const inp: React.CSSProperties = {
    background: P.bg, border: `1.5px solid ${P.cardBdr}`, borderRadius: 8,
    padding: '10px 12px', color: P.text, fontSize: 14, outline: 'none',
    width: '100%', boxSizing: 'border-box', fontFamily: 'inherit'
  };

  return (
    <div style={{ minHeight: '100vh', background: P.bg, color: P.text, position: 'relative' }}>
      <FocusVisibleStyle />
      {/* ── Auth Modal — Phase 1 Firebase Auth ── */}
      <AuthModal
        open={showAuthModal && !user && !authLoading}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => setShowAuthModal(false)}
      />

      {/* ── Onboarding modal — V9 Sprint 7c ── */}
      {showOnboarding && <OnboardingModal onClose={() => setShowOnboarding(false)} />}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at 15% 10%,#1a170a,transparent 55%),radial-gradient(ellipse at 85% 90%,#0a0f1a,transparent 50%)' }} />
      <main className="app-container" role="main" style={{ position: 'relative', maxWidth: 640, margin: '0 auto', padding: '24px 16px' }}>
        {/* Header with Auth Info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <h1 className="app-title" style={{ fontSize: 46, fontWeight: 300, margin: 0, letterSpacing: 6, background: `linear-gradient(135deg,#e4e4e7,${P.gold} 60%,#C9A84C)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Kaironaute</h1>
            <div style={{ fontSize: 12, color: P.textMid, letterSpacing: 1, marginTop: 8, fontWeight: 400, fontStyle: 'italic' }}>Maîtrise tes cycles. Optimise tes décisions.</div>
            <div style={{ fontSize: 10, color: P.textDim, letterSpacing: 3, marginTop: 4, fontWeight: 500 }}>NUMÉROLOGIE · ASTROLOGIE · YI KING · ZODIAQUE CHINOIS · IA</div>
            {/* Profile Switcher + Add button (if logged in) */}
            {user && !profilesLoading && profiles.length > 0 && (
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <ProfileSwitcher
                  profiles={profiles}
                  activeProfileId={activeProfileId}
                  onSwitch={handleSwitchProfile}
                  onAddProfile={handleAddProfile}
                  onDeleteProfile={handleDeleteProfile}
                  maxProfiles={MAX_PROFILES}
                />
                {profiles.length < MAX_PROFILES && (
                  <button
                    onClick={handleAddProfile}
                    title="Ajouter un profil"
                    style={{
                      background: `${P.gold}15`, border: `1px solid ${P.gold}44`,
                      borderRadius: '50%', width: 36, height: 36,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', color: P.gold, fontSize: 20, fontWeight: 700,
                      fontFamily: 'inherit', flexShrink: 0,
                    }}
                  >+</button>
                )}
              </div>
            )}
          </div>
          <div className="header-auth-info" style={{ fontSize: 11, color: P.textDim, textAlign: 'right', minWidth: 120 }}>
            {user ? (
              <>
                <div style={{ marginBottom: 8, color: P.green }}>✓ Connecté</div>
                <div style={{ fontSize: 9, marginBottom: 8, wordBreak: 'break-all' }}>{user.email}</div>
                {notifPermission === 'granted' && (
                  <button
                    onClick={toggleNotifications}
                    style={{
                      background: 'none', border: 'none',
                      color: notifEnabled ? P.gold : P.textDim,
                      cursor: 'pointer', fontSize: 10,
                      fontFamily: 'inherit', marginBottom: 6,
                      display: 'block',
                    }}
                    title={notifEnabled ? 'Désactiver les notifications' : 'Activer les notifications'}
                  >
                    {notifEnabled ? '🔔 Notifs actives' : '🔕 Notifs désactivées'}
                  </button>
                )}
                <button
                  onClick={() => {
                    signOut().catch(() => {});
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: P.red,
                    cursor: 'pointer',
                    fontSize: 10,
                    textDecoration: 'underline',
                    fontFamily: 'inherit',
                  }}
                >
                  Se déconnecter
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                style={{
                  background: `${P.gold}22`,
                  border: `1px solid ${P.gold}44`,
                  borderRadius: 6,
                  padding: '6px 10px',
                  color: P.gold,
                  cursor: 'pointer',
                  fontSize: 10,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                }}
              >
                Se connecter
              </button>
            )}
          </div>
        </div>

        {/* PWA Install Banner */}
        {showInstallBanner && (
          <div className="banner-responsive" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', marginBottom: 16, borderRadius: 12,
            background: `linear-gradient(135deg, ${P.gold}15, ${P.gold}08)`,
            border: `1px solid ${P.gold}33`,
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: P.gold }}>Installer Kaironaute</div>
              <div style={{ fontSize: 11, color: P.textMid, marginTop: 2 }}>Accès rapide depuis ton écran d'accueil</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={handleInstall} style={{
                background: `linear-gradient(135deg, #B8860B, ${P.gold})`,
                border: 'none', borderRadius: 8, padding: '8px 16px',
                color: '#0d0d1a', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}>Installer</button>
              <button onClick={() => setShowInstallBanner(false)} style={{
                background: 'none', border: 'none', color: P.textDim,
                cursor: 'pointer', fontSize: 16, padding: '4px',
              }}>✕</button>
            </div>
          </div>
        )}

        {/* Notification Permission Banner */}
        {showNotifBanner && (
          <div className="banner-responsive" style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', marginBottom: 16, borderRadius: 12,
            background: 'linear-gradient(135deg, rgba(96,165,250,0.12), rgba(96,165,250,0.04))',
            border: '1px solid rgba(96,165,250,0.25)',
          }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#60a5fa' }}>Recevoir ton score chaque matin</div>
              <div style={{ fontSize: 11, color: P.textMid, marginTop: 2 }}>Une notification par jour avec ton score personnalisé</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={requestPermission} style={{
                background: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
                border: 'none', borderRadius: 8, padding: '8px 16px',
                color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}>Activer</button>
              <button onClick={dismissNotifBanner} style={{
                background: 'none', border: 'none', color: P.textDim,
                cursor: 'pointer', fontSize: 16, padding: '4px',
              }}>✕</button>
            </div>
          </div>
        )}

        {/* Add Profile Form */}
        {showAddProfileForm && user && (
          <Cd sx={{ marginBottom: 24, border: `2px solid ${P.gold}44`, background: `${P.gold}08` }}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 10, letterSpacing: 2, color: P.textDim, textTransform: 'uppercase', display: 'block', marginBottom: 8, fontWeight: 600 }}>Nom du profil</label>
              <input
                value={newProfileLabel}
                onChange={(e) => setNewProfileLabel(e.target.value)}
                placeholder="Ex: Conjoint, Enfant 1, etc."
                style={inp}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateProfile();
                  }
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowAddProfileForm(false);
                  setNewProfileLabel('');
                }}
                style={{
                  padding: '8px 16px',
                  background: P.surface,
                  border: `1px solid ${P.cardBdr}`,
                  borderRadius: 8,
                  color: P.text,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleCreateProfile}
                style={{
                  padding: '8px 16px',
                  background: `linear-gradient(135deg,${P.gold},#C9A84C)`,
                  border: 'none',
                  borderRadius: 8,
                  color: '#09090b',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: 'inherit',
                }}
              >
                Créer le profil
              </button>
            </div>
          </Cd>
        )}

        {/* Form */}
        <Cd sx={{ marginBottom: 24 }}>
          <div className="grid-responsive-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
            {([['Prénom', fn, setFn], ['2e Prénom', mn, setMn], ['Nom naissance', ln, setLn]] as const).map(([l, v, s]) => (
              <div key={l}>
                <label style={{ fontSize: 10, letterSpacing: 2, color: P.textDim, textTransform: 'uppercase', display: 'block', marginBottom: 4, fontWeight: 600 }}>{l}</label>
                <input value={v} onChange={e => s(e.target.value)} style={inp} />
              </div>
            ))}
          </div>
          <div className="grid-responsive-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 10, letterSpacing: 2, color: P.textDim, textTransform: 'uppercase', display: 'block', marginBottom: 4, fontWeight: 600 }}>Date naissance</label>
              <input type="date" value={bd} onChange={e => setBd(e.target.value)} style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 10, letterSpacing: 2, color: P.textDim, textTransform: 'uppercase', display: 'block', marginBottom: 4, fontWeight: 600 }}>Heure naissance</label>
              <div style={{ display: 'flex', gap: 4 }}>
                <input type="time" value={bt} onChange={e => setBt(e.target.value)} placeholder="12:00" style={{ ...inp, flex: 1, opacity: bt ? 1 : .5 }} />
                <button onClick={() => setBt('')} title={bt ? 'Marquer heure inconnue (calcul à midi)' : 'Heure inconnue — calcul à midi par convention'} style={{ background: bt ? P.surface : `${P.gold}15`, border: `1px solid ${bt ? P.cardBdr : P.gold + '33'}`, borderRadius: 8, padding: '0 10px', cursor: 'pointer', color: bt ? P.textDim : P.gold, fontSize: 10, fontWeight: 700 }}>?</button>
              </div>
            </div>
            <div>
              <label style={{ fontSize: 10, letterSpacing: 2, color: P.textDim, textTransform: 'uppercase', display: 'block', marginBottom: 4, fontWeight: 600 }}>Lieu naissance</label>
              <input value={bp} onChange={e => setBp(e.target.value)} style={inp} placeholder="Ville" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto auto 1fr auto', gap: 10, marginTop: 10, alignItems: 'end' }}>

            {/* Genre */}
            <div>
              <label style={{ fontSize: 10, letterSpacing: 2, color: P.textDim, textTransform: 'uppercase', display: 'block', marginBottom: 4, fontWeight: 600 }}>Genre</label>
              <div style={{ display: 'flex', gap: 4 }}>
                {(['M', 'F'] as const).map(g => (
                  <button key={g} onClick={() => setGn(g)} style={{
                    padding: '9px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: gn === g ? 700 : 400,
                    background: gn === g ? (g === 'M' ? '#60a5fa18' : '#f472b618') : P.surface,
                    border: `1px solid ${gn === g ? (g === 'M' ? '#60a5fa50' : '#f472b650') : P.cardBdr}`,
                    color: gn === g ? (g === 'M' ? '#60a5fa' : '#f472b6') : P.textDim,
                  }}>{g === 'M' ? '♂' : '♀'}</button>
                ))}
              </div>
            </div>

            {/* UTC */}
            <div>
              <label style={{ fontSize: 10, letterSpacing: 2, color: P.textDim, textTransform: 'uppercase', display: 'block', marginBottom: 4, fontWeight: 600 }}>UTC offset</label>
              <select value={tz} onChange={e => setTz(+e.target.value)} style={{ ...inp, cursor: 'pointer' }}>
                {[-5,-4,-3,-2,-1,0,1,2,3,4,5,6,8,10,12].map(v => <option key={v} value={v}>UTC{v >= 0 ? '+' : ''}{v}</option>)}
              </select>
            </div>

            {/* Bouton Calculer */}
            <div style={{ display: 'flex', alignItems: 'end', gap: 10 }}>
              <button onClick={doVal} disabled={!canCalc || (!dirty && !!data)} style={{ padding: '10px 24px', background: canCalc && (dirty || !data) ? `linear-gradient(135deg,${P.gold},#C9A84C)` : P.surface, border: 'none', borderRadius: 8, color: canCalc && (dirty || !data) ? '#09090b' : P.textDim, fontSize: 14, fontWeight: 700, cursor: canCalc && (dirty || !data) ? 'pointer' : 'default', letterSpacing: 1, opacity: canCalc && (dirty || !data) ? 1 : .5, fontFamily: 'inherit' }}>
                {data ? '✦ Recalculer' : '✦ Calculer'}
              </button>
              {dirty && canCalc && <span style={{ fontSize: 12, color: P.gold, fontWeight: 600 }}>Modifications non validées</span>}
              {dirty && !canCalc && <span style={{ fontSize: 12, color: '#ef4444', fontWeight: 600 }}>Prénom, Nom et Date requis</span>}
              {!dirty && data && <span style={{ fontSize: 12, color: P.green, fontWeight: 600 }}>✔ Profil calculé</span>}
            </div>

            {/* Spacer */}
            <div />
          </div>
          {bp && <div style={{ marginTop: 8, fontSize: 11, fontWeight: 600, color: findCity(bp) ? P.green : P.red }}>{findCity(bp) ? '✔ ' + bp + ' trouvé' : '✗ Ville non trouvée'}</div>}
          {/* ── Sprint 8d — Badge DST auto-correction ── */}
          {data?.astro?.tzSuggested != null && data.astro.tzSuggested !== lock.tz && (
            <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, flexWrap: 'wrap' }}>
              <span style={{ background: `${P.gold}20`, border: `1px solid ${P.gold}44`, borderRadius: 10, padding: '2px 8px', color: P.gold, fontWeight: 700 }}>
                ⚡ Fuseau détecté : UTC+{data.astro.tzSuggested} ({(() => { const [y, m, d] = (lock.bd || '').split('-').map(Number); return y ? (isFranceDST(y, m, d) ? 'heure d\'été' : 'heure d\'hiver') : ''; })()})
              </span>
              <span style={{ color: P.textDim, fontSize: 10 }}>sélecteur : UTC+{lock.tz}</span>
              <button
                onClick={() => setTz(data.astro!.tzSuggested!)}
                style={{ background: `${P.gold}25`, border: `1px solid ${P.gold}55`, borderRadius: 8, padding: '2px 10px', color: P.gold, fontWeight: 700, fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Appliquer UTC+{data.astro.tzSuggested} →
              </button>
            </div>
          )}
        </Cd>

        {/* Tabs */}
        <div className="sp-tabs-bar" role="tablist" aria-label="Navigation Kaironaute" style={{ display: 'flex', gap: 4, marginBottom: 22, overflowX: 'auto', paddingBottom: 8 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              role="tab" aria-selected={tab === t.id} aria-label={`Onglet ${t.l}`}
              style={{
                background: tab === t.id ? P.surface : 'transparent',
                border: `1px solid ${tab === t.id ? P.cardBdr : 'transparent'}`,
                borderRadius: 8, padding: '8px 10px', cursor: 'pointer',
                color: tab === t.id ? P.text : P.textDim,
                fontSize: 12, fontWeight: tab === t.id ? 700 : 400, whiteSpace: 'nowrap',
                fontFamily: 'inherit'
              }}
            >{t.i} {t.l}</button>
          ))}
        </div>

        {/* Content */}
        {!data && <Cd><div style={{ textAlign: 'center', color: P.textDim, padding: 28, fontSize: 14 }}>Entre tes informations ci-dessus et clique ✦ Calculer</div></Cd>}
        {data && (
          <Suspense fallback={<Cd><div role="status" aria-live="polite" aria-busy="true" style={{ textAlign: 'center', color: P.textDim, padding: 28, fontSize: 14 }}>Chargement…</div></Cd>}>
            {tab === 'convergence' && <ConvergenceTab data={data} psi={psiData} bd={lock.bd} bt={lock.bt} yearPreviews={yearPreviews} />}
            {tab === 'calendar' && <CalendarTab data={data} bd={lock.bd} bt={lock.bt} yearPreviews={yearPreviews} />}
            {tab === 'profile' && <ProfileTab data={data} bd={lock.bd} bt={lock.bt} gender={lock.gn} fn={lock.fn} yearPreviews={yearPreviews} />}
            {tab === 'bond' && <BondTab data={data} bd={lock.bd} />}
            {tab === 'astro' && <AstroTab data={data} bd={lock.bd} bt={lock.bt} bp={lock.bp} />}
            {tab === 'iching' && <IChingTab data={data} bd={lock.bd} />}
            {tab === 'insights' && (<>
              <LectureTab data={data} bd={lock.bd} bt={lock.bt} narr={narr} narrLoad={narrLoad} genNarr={genNarr} yearPreviews={yearPreviews} />
              {temporal && <TemporalTab data={temporal} psi={psiData} />}
            </>)}
          </Suspense>
        )}

        <div style={{ textAlign: 'center', marginTop: 48, fontSize: 9, color: '#27272a', letterSpacing: 3, fontWeight: 500 }}>KAIRONAUTE v4.5 © 2026</div>
      </main>
    </div>
  );
}
