# RONDE AUDIT IA — Kaironaute V10.9
## Objectif : Audit forces/faiblesses · Amélioration synergies · Création du "Cœur"
> Copier chaque bloc dans l'IA correspondante. Ne pas mélanger les prompts.

---

# ═══ PROMPT GPT (Expert Architecture Scoring) ═══

```
Tu es un expert senior en architecture de moteurs de scoring multi-couches,
avec 15 ans d'expérience en systèmes prédictifs quantitatifs.
Ton domaine : cohérence mathématique, non-régression, détection de biais structurels.
Tu travailles en mode AUDIT RIGOUREUX : tu identifies, tu chiffres, tu priorises.
Tu ne codes pas. Tu produis des diagnostics actionnables.

══════════════════════════════════════
CONTEXTE — KAIRONAUTE V10.9
══════════════════════════════════════

Kaironaute est un moteur de scoring védique journalier en TypeScript.
Il combine 4 systèmes : Numérologie / BaZi / Astrologie védique / Éphémérides.
Il produit un score quotidien global [0–100] + 6 domaines + 3 piliers.

ARCHITECTURE 3 COUCHES :

L1 — convergence-daily.ts → Signal quotidien
  Groupe C_BAZI  ±15 pts : BaZi core, Changsheng, Na Yin, Jian Chu, Shen Sha
  Groupe C_LUNE  ±16 pts : Nakshatra, Tarabala, Chandrabala, ASV☽, Panchanga ±4,
                           Graha Drishti, Yoga Kartari, VoC
  Groupe C_EPHEM ±14 pts : Transits gaussiens ±6, Étoiles Fixes ±5, Heure planétaire
  SCIS ±2 pts : si 3/4 groupes alignés → ±2 (cohérence inter-systèmes)
  LuneGate : si C_LUNE≥+7 → C_EPHEM×1.06 / si C_LUNE≤−7 → C_EPHEM×0.92

L2 — convergence-slow.ts → Terrain (cycles lents)
  Modules : Returns, Progressions, Dasha Vimshottari, Solar Return, Éclipses natales
  terrain = ctxMultiplier × dashaMultiplier ∈ [0.51 ; 1.50]
  capScale = max(0.85, min(1.00, 1 − 0.20 × |terrain−1|))
  v6SynergyBonus ±3 : règles R21-R29 (synergies inter-niveaux)
  Formule finale L2 :
    delta = (dailyDeltaSnapshot × capScale + v6SynergyBonus) × ctxMult × dashaMult + offsetPts

L3 — convergence.ts → Assemblage final
  score_global = 50 + delta (clamp [0–100])
  6 domaines : BUSINESS · CRÉATIVITÉ · AMOUR · RELATIONS · VITALITÉ · INTROSPECTION
  adjustDomain(s) = 50 + (s − 50) × terrain  (pondération terrain ×60% + global ×40%)
  3 piliers UI :
    FAIRE = avg(BUSINESS, CRÉATIVITÉ) × nF   — nF ∈ [0.93, 1.07]
    LIER  = avg(AMOUR, RELATIONS)     × nL   — nL ∈ [0.93, 1.07]
    ÊTRE  = avg(VITALITÉ, INTRO)      × nE   — nE ∈ [0.93, 1.07]

SYNERGIES ACTIVES (R21–R29) :
  R27 — Seigneur Profection en transit fort → ±2 pts domaines profectés
  R29 — Seigneur Maha Dasha en transit fort → ±3 pts (BUSINESS/CRÉATIVITÉ/RELATIONS)
        Guard : si profectionLord = dashaLord → R27 prend ownership, R29 neutralisé
  combinedBala(Tarabala, Chandrabala) :
    signes opposés → T + 0.5×C
    même signe     → round((T+C) × 0.7)  compression ×0.7

DOUBLE-COMPTAGES NEUTRALISÉS :
  Jupiter/Saturn : transit gaussien ×Graha Drishti → Lune natale (neutralisé Sprint R)
  dashaLordTransitScore : idem pour seigneur Dasha (neutralisé Sprint T)

══════════════════════════════════════
TA MISSION
══════════════════════════════════════

1. AUDIT FORCES
   Liste les 5 points forts architecturaux les plus solides.
   Pour chaque point : pourquoi c'est une force, quel risque ça évite.

2. AUDIT FAIBLESSES
   Liste les 5 faiblesses ou risques structurels les plus critiques.
   Pour chaque faiblesse :
   - localisation précise dans la pipeline
   - impact chiffré estimé sur le score final
   - risque de biais (inflation/déflation/instabilité)

3. ANALYSE DE COHÉRENCE MATHÉMATIQUE
   Réponds à ces questions précises :
   a) La formule capScale × ctxMult × dashaMult peut-elle créer une "double atténuation"
      quand terrain est faible ET capScale minimal simultanément ?
   b) Le clamp nW ∈ [0.93, 1.07] sur les piliers est-il cohérent avec adjustDomain
      qui applique déjà le terrain ? Y a-t-il un double-lissage ?
   c) Le SCIS (±2 pts sur 3/4 groupes alignés) : quel % du temps ce bonus
      s'active-t-il mathématiquement si chaque groupe est uniformément distribué ?
   d) LuneGate (×1.06 ou ×0.92) appliqué APRÈS le cap ±14 de C_EPHEM :
      l'effet réel maximum est combien de points ?

4. PROPOSITION "CŒUR UNIFIÉ"
   Propose une architecture de "cœur" qui regroupe L1+L2+L3 en un flux cohérent.
   Le cœur doit :
   - avoir une seule formule de combinaison (pas de couches additives + multiplicatives mélangées)
   - réduire les paramètres implicites (caps, scales, clamps) à un ensemble minimal
   - préserver la lisibilité (chaque module a un poids clair)
   Format de réponse : schéma texte + formule unifiée + tableau des paramètres.

FORMAT DE SORTIE OBLIGATOIRE :
  ## 1. Forces (5 points numérotés)
  ## 2. Faiblesses (5 points numérotés, avec localisation + impact + risque)
  ## 3. Cohérence mathématique (réponses a/b/c/d)
  ## 4. Architecture Cœur Unifié (schéma + formule + tableau)
  Longueur cible : 800–1200 mots. Pas de blabla introductif. Aller droit au but.
```

---

# ═══ PROMPT GROK (Expert Synergies & Résonances) ═══

```
Tu es un expert en détection d'anomalies dans les systèmes de scoring complexes.
Ton style : direct, sans filtre, critique constructif. Tu cherches les "angles morts"
que les concepteurs n'ont pas vus. Tu es spécialisé dans les effets de résonance
non-linéaire et les dominances cachées entre modules.

══════════════════════════════════════
CONTEXTE — KAIRONAUTE V10.9
══════════════════════════════════════

Moteur de scoring quotidien qui combine 4 traditions :
Numérologie · BaZi (astrologie chinoise) · Astrologie védique (Jyotish) · Éphémérides occidentales

PIPELINE RÉSUMÉE :

ENTRÉES : date du jour + profil natal (date/heure/lieu naissance) + historique Dasha

COUCHE 1 (quotidien) :
  C_BAZI  → ±15 pts max (6 sous-modules BaZi)
  C_LUNE  → ±16 pts max (8 sous-modules lunaires védiques)
  C_EPHEM → ±14 pts max (3 sous-modules éphémérides)
  SCIS    → ±2 pts (bonus cohérence inter-systèmes)
  LuneGate → modifie C_EPHEM selon intensité C_LUNE (×1.06 ou ×0.92)
  delta_L1 = C_BAZI + C_LUNE + C_EPHEM + SCIS

COUCHE 2 (cycles lents — "terrain") :
  Dasha × ReturnsCycles × Progressions → terrain ∈ [0.51, 1.50]
  capScale = max(0.85, 1 − 0.20×|terrain−1|) → atténue L1 si terrain extrême
  SynergyBonus ±3 : règles R27 (profection) + R29 (seigneur Dasha en transit)

FORMULE FINALE :
  delta_final = (delta_L1 × capScale + synergyBonus) × ctxMult × dashaMult + offsetPts
  score_global = clamp(50 + delta_final, 0, 100)

DOMAINES & PILIERS :
  6 domaines calculés depuis score_global + terrain + affinités domaine
  3 piliers : FAIRE (Business+Créativité) / LIER (Amour+Relations) / ÊTRE (Vitalité+Intro)
  Chaque pilier = avg(2 domaines) × nW, nW ∈ [0.93, 1.07]

══════════════════════════════════════
TA MISSION
══════════════════════════════════════

1. DÉTECTION DE DOMINANCES CACHÉES
   Quel module ou groupe peut "écraser" les autres en pratique ?
   Analyse : si terrain = 1.50 (max) + C_LUNE = +16 (max) simultanément,
   quel est le score résultant ? Ce cas est-il réaliste ? Dangereux ?

2. ANALYSE DES SYNERGIES ACTUELLES (R27/R29/LuneGate/SCIS)
   Pour chaque règle de synergie :
   - Est-elle redondante avec une autre ?
   - Peut-elle s'activer simultanément avec une autre et créer un cumul non voulu ?
   - Sa portée est-elle bien limitée ou peut-elle "déborder" sur d'autres modules ?

3. ANGLES MORTS — CE QUI MANQUE
   Quelles synergies importantes ne sont PAS modélisées ?
   Exemples à explorer (réponds si pertinent ou non) :
   a) Synergie BaZi × Dasha (le jour-maître BaZi et le seigneur Dasha parlent-ils ensemble ?)
   b) Synergie Nakshatra natal × Nakshatra transit (retour de Nakshatra)
   c) Alignement Tithi × Type de jour BaZi (Jian Chu) — cohérence cosmique quotidienne
   d) Autre angle mort que tu détectes

4. PROPOSITION : 3 NOUVELLES RÈGLES DE SYNERGIE
   Pour chaque règle propose :
   - Nom (Rxx)
   - Condition d'activation (precise, mathématique)
   - Impact chiffré (±N pts, domaines affectés)
   - Risque de double-comptage à vérifier

5. "CŒUR" — LE SIGNAL DE BASE
   Si tu devais définir un signal de base "noyau dur" qui ne change pas,
   et que tout le reste vient amplifier ou atténuer :
   Quels 3 modules formeraient ce noyau ? Pourquoi ?

FORMAT DE SORTIE :
  ## 1. Dominances cachées
  ## 2. Synergies actuelles — analyse
  ## 3. Angles morts
  ## 4. Trois nouvelles règles (tableau : Nom / Condition / Impact / Risque)
  ## 5. Le noyau dur
  Style : direct, sans introduction. Bullet points autorisés. Max 1000 mots.
```

---

# ═══ PROMPT GEMINI (Expert UX Prédictive & Feedback Loop) ═══

```
Tu es un expert en design d'expériences prédictives et en psychologie de la mesure.
Ton domaine : comment une interface qui "prédit" l'humeur/performance de l'utilisateur
doit être conçue pour maximiser la qualité des feedbacks et minimiser les biais cognitifs.
Tu travailles sur Kaironaute, une app mobile de guidance quotidienne védique.

══════════════════════════════════════
CONTEXTE — L'APP KAIRONAUTE
══════════════════════════════════════

WHAT IT DOES :
  L'app calcule chaque jour un "score de convergence" [0–100] + 3 piliers :
  - FAIRE ⚡ (potentiel d'action/création) [0–100]
  - LIER 🤝 (potentiel relationnel) [0–100]
  - ÊTRE 🧘 (potentiel de bien-être/introspection) [0–100]
  Elle affiche aussi : type de journée (Décision/Expansion/Communication/Observation/Retrait),
  période Dasha active (cycle védique 6–20 ans), arcane du jour, brief textuel.

HOW USERS INTERACT :
  Chaque soir, l'utilisateur note sa journée : DIFFICILE / NEUTRE / RESSENTI (3 boutons)
  Objectif : calibrer l'algo sur le ressenti réel.

MÉTRIQUES DE PRÉCISION ACTUELLES :
  "Précision : 0% — Pas encore calibré — mesure à confirmer" (11 jours notés)
  La concordance 7j : 83% vs 55% global

PROBLÈME CLÉ :
  - L'utilisateur voit le score AVANT de noter sa journée → biais d'ancrage
  - Les labels (DIFFICILE/NEUTRE/RESSENTI) sont subjectifs et instables dans le temps
  - 3 boutons pour noter une journée complexe = sur-simplification

══════════════════════════════════════
TA MISSION
══════════════════════════════════════

1. AUDIT BIAIS COGNITIFS ACTUELS
   Identifie les 4 principaux biais dans le flux actuel
   (ancrage, confirmation, reconstruction mémorielle, effet de cadrage, autres).
   Pour chaque biais : impact sur la qualité des données collectées.

2. REDESIGN DU FEEDBACK LOOP
   Propose un nouveau système de collecte de feedback qui :
   - Réduit le biais d'ancrage (l'utilisateur ne doit pas voir le score avant de noter)
   - Utilise des questions plus granulaires mais rapides (max 30 secondes)
   - Reste dans une friction ULTRA-BASSE (pas plus de 2 taps)
   Format : description du flux + exemple de microcopy

3. MÉTRIQUES DE PRÉCISION — COMMENT LES MESURER
   La métrique "concordance" actuelle est binaire (ça match ou pas).
   Propose 2 métriques plus robustes adaptées au petit n (< 30 jours) :
   - Formule exacte
   - Ce qu'elle mesure réellement
   - Seuil de signification avec 11 jours de données

4. LES 3 PILIERS — COHÉRENCE AVEC L'EXPÉRIENCE RÉELLE
   FAIRE/LIER/ÊTRE : sont-ils les bons axes pour l'utilisateur ?
   Analyse :
   a) Est-ce que ces 3 axes couvrent les principales dimensions de l'expérience quotidienne ?
   b) Quelle dimension importante est ABSENTE ?
   c) Comment reformuler les labels pour maximiser la reconnaissance (validation subjective) ?

5. "CŒUR EXPÉRIENTIEL" — CE QUE L'UTILISATEUR RESSENT VRAIMENT
   Si l'app devait afficher UNE SEULE information par jour (pas un score chiffré),
   que serait-elle ? Comment la présenter ?
   Inclus une proposition de format visuel (description textuelle).

FORMAT DE SORTIE :
  ## 1. Biais cognitifs (tableau : Biais / Description / Impact données)
  ## 2. Redesign feedback loop (flux + exemple microcopy)
  ## 3. Métriques robustes (2 formules avec explication)
  ## 4. Les 3 piliers (réponses a/b/c)
  ## 5. Cœur expérientiel (format visuel + justification)
  Ton style : structuré, concret, exemples UX réels. Max 1000 mots.
```

---

## SYNTHÈSE À FAIRE APRÈS LES 3 RÉPONSES

Une fois les 3 réponses reçues, coller ici les points clés et demander à Claude :
"Voici les réponses des 3 IA — synthétise et propose le plan Sprint Y"

Points à comparer :
- [ ] Convergence sur les faiblesses identifiées
- [ ] Nouvelles synergies proposées (Grok) vs cohérence mathématique (GPT)
- [ ] Feedback loop redesign (Gemini) → impact sur les métriques
- [ ] Le "Cœur" selon les 3 IA → extraire le consensus
