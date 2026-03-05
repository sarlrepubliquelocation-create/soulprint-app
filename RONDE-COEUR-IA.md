# RONDE 2 — VALIDATION DU CŒUR UNIFIÉ
## Objectif : Challenger et améliorer le plan avant tout code
> Copier chaque bloc dans l'IA correspondante.

---

# ═══ PROMPT GPT (Valide la formule unifiée) ═══

```
Tu es expert en architecture de moteurs de scoring multi-couches.
Tu as déjà audité Kaironaute V10.9 (Ronde 1).
Cette fois tu joues le rôle de l'architecte critique : tu cherches les failles
dans le plan proposé AVANT qu'on écrive la moindre ligne de code.

══════════════════════════════════════
RAPPEL ARCHITECTURE ACTUELLE (à remplacer)
══════════════════════════════════════

7 couches imbriquées :
  Module A + B + C → cap groupe → × LuneGate → × capScale →
  × ctxMult → × dashaMult → adjustDomain (60/40) → × nW piliers

Problèmes identifiés Ronde 1 :
  - Double atténuation capScale × terrain (jusqu'à -15% non voulu)
  - C_LUNE domine : 18-25 jours "Cosmique"/an au lieu de 4-7
  - SCIS actif 62.5% du temps (seuil trop bas)
  - 7 paramètres multiplicatifs → non auditable

══════════════════════════════════════
PLAN DU CŒUR PROPOSÉ
══════════════════════════════════════

ÉTAPE 1 — NOYAU DUR (3 signaux immuables)
  Signal 1 : BaZi DayMaster → identité fixe de l'utilisateur
  Signal 2 : Nakshatra du jour → qualité de l'énergie cosmique du jour
  Signal 3 : Vimshottari Dasha → contexte de vie (phase longue 6-20 ans)
  Output noyau : base_signal ∈ [-1, +1]

ÉTAPE 2 — NORMALISATION DES MODULES
  Chaque module i produit un delta brut d_i (unités actuelles)
  Normalisation : x_i = clamp(d_i / cap_i, -1, 1)
  Tous les modules sont ramenés à la même échelle [-1, +1]

ÉTAPE 3 — AGRÉGATION PONDÉRÉE
  X = Σ w_i × x_i   (w_i = poids de chaque module, à calibrer)
  Plus de caps par groupe : les poids w_i gouvernent la dominance

ÉTAPE 4 — UNE SEULE NON-LINÉARITÉ
  Δ = A × tanh(k × X)   (A ≈ 30, k ≈ 1.0 → calibré sur distribution cible)
  Remplace : tanh actuel L1 + capScale + LuneGate + nW piliers

ÉTAPE 5 — UN SEUL TERRAIN
  score_final = clamp(50 + Δ × terrain, 0, 100)
  terrain ∈ [0.75, 1.25]   (actuellement [0.51, 1.50] → trop large ?)
  Remplace : ctxMult × dashaMult + adjustDomain 60/40

ÉTAPE 6 — DOMAINES & PILIERS
  Chaque domaine = routing des x_i via DOMAIN_AFFINITY (poids domaine)
  Piliers = avg(domaines associés) — sans nW multiplicatif supplémentaire
  Nommés : IMPACT / RÉSONANCE / ANCRAGE

══════════════════════════════════════
TES 4 QUESTIONS OBLIGATOIRES
══════════════════════════════════════

1. FAILLES DU PLAN
   Quelles sont les 3 failles les plus graves dans ce plan ?
   Pour chaque faille : impact précis + comment la corriger.

2. PARAMÈTRES CRITIQUES
   A (amplitude), k (pente tanh), terrain [min, max] :
   a) Comment calibrer A pour obtenir la distribution cible
      (médiane ≈55, P5≈30, P95≈82, jours "Cosmique" max 7/an) ?
   b) Quelle plage terrain est réaliste pour rester non-déformant ?
   c) Comment gérer la transition : anciens dashaMult/ctxMult ∈ [0.51,1.50]
      vers nouveau terrain ∈ [0.75, 1.25] ?

3. LE NOYAU DUR
   Les 3 signaux (BaZi DM + Nakshatra + Dasha) comme base_signal :
   a) Comment les combiner en un seul scalaire [-1,+1] ?
   b) Quel est le risque si Nakshatra change en milieu de journée ?
   c) Le noyau doit-il être additif ou multiplicatif avec X ?

4. CE QU'ON N'A PAS VU
   Qu'est-ce que ce plan ne résout PAS et qui devrait être résolu
   avant de commencer à coder ?

FORMAT :
  ## 1. Failles (3 points précis)
  ## 2. Paramètres (réponses a/b/c)
  ## 3. Noyau dur (réponses a/b/c)
  ## 4. Ce qu'on n'a pas vu
  Max 900 mots. Direct et technique.
```

---

# ═══ PROMPT GROK (Valide la sémantique du Noyau) ═══

```
Tu es expert en cohérence sémantique des systèmes védiques et BaZi.
Tu as audité Kaironaute V10.9 en Ronde 1. Cette fois, tu dois valider
si le "Noyau Dur" proposé est sémantiquement juste selon les traditions.
Tu es brutal et direct si quelque chose ne tient pas.

══════════════════════════════════════
LE NOYAU DUR PROPOSÉ
══════════════════════════════════════

Le moteur Kaironaute va être refondé autour d'un "Cœur" à 3 signaux :

Signal 1 — BaZi DayMaster (Jour-Maître)
  Ce que c'est : l'élément dominant de l'utilisateur (Bois Yang, Feu Yin, etc.)
  Rôle proposé : identité fixe → module pondérateur du score
  Question : est-ce que le DM est vraiment "immuable" ou varie-t-il selon la journée ?

Signal 2 — Nakshatra du jour (lunaire védique)
  Ce que c'est : la "maison lunaire" du jour parmi les 27 Nakshatras
  Rôle proposé : qualité de l'énergie cosmique du jour → signal de base quotidien
  Question : est-ce suffisant comme signal quotidien ou faut-il aussi le Tithi ?

Signal 3 — Vimshottari Dasha (période planétaire)
  Ce que c'est : la grande période planétaire active (6 à 20 ans)
  Rôle proposé : contexte de vie → pondérateur long terme
  Question : Mahadasha seule ou faut-il inclure l'Antardasha (sous-période) ?

Plan : ces 3 signaux forment un "base_signal" auquel s'ajoutent
tous les autres modules (BaZi quotidien, transits, panchanga, etc.)

══════════════════════════════════════
TES 4 QUESTIONS OBLIGATOIRES
══════════════════════════════════════

1. LE NOYAU EST-IL JUSTE ?
   Ces 3 signaux représentent-ils vraiment les 3 dimensions temporelles
   fondamentales des traditions védiques/BaZi ?
   a) Y a-t-il un signal manquant dans ce noyau ?
   b) Y a-t-il un signal qui ne devrait PAS être dans le noyau ?
   c) L'ordre de priorité (BaZi DM > Nakshatra > Dasha) est-il correct ?

2. LES 3 NOUVELLES RÈGLES (R31/R32/R33) PROPOSÉES EN RONDE 1
   Tu avais proposé :
   - R31 : DashaLord = NakshatraLord → +2.5 pts
   - R32 : Transit Nakshatra = natal Nakshatra → +3 pts (LUNE)
   - R33 : Tithi Nanda/Purna + Jian Chu Sheng → +1.5 pts
   Maintenant qu'on refond le Cœur :
   a) Ces règles s'intègrent-elles proprement dans la nouvelle architecture ?
   b) R31 ne crée-t-elle pas une redondance avec le noyau (Dasha déjà dedans) ?
   c) Quelle est la règle la plus urgente à implémenter en premier ?

3. COMPATIBILITÉ BaZi × VÉDIQUE
   Le moteur mélange 2 traditions qui ont des cosmologies différentes.
   a) Y a-t-il des conflits fondamentaux entre les 2 systèmes dans le noyau ?
   b) Comment s'assurer que BaZi DM et Nakshatra ne se "contredisent" pas
      (ex : BaZi dit "journée de métal" mais Nakshatra dit "journée d'eau") ?
   c) Proposer une règle de réconciliation si conflit.

4. CE QUI MANQUE DANS LE NOYAU
   D'après la tradition védique pure :
   Quels sont les 2 signaux les plus importants qu'on n'utilise pas
   encore et qui devraient être dans le cœur à terme ?

FORMAT :
  ## 1. Validité du noyau (a/b/c)
  ## 2. R31/R32/R33 dans la nouvelle archi (a/b/c)
  ## 3. Compatibilité BaZi × Védique (a/b/c)
  ## 4. Ce qui manque
  Direct. Max 800 mots.
```

---

# ═══ PROMPT GEMINI (Valide l'output expérientiel) ═══

```
Tu es expert en design d'expériences prédictives et en psychologie du changement.
Tu as audité Kaironaute en Ronde 1. Cette fois tu valides le plan de refonte
de l'output utilisateur qui découle du nouveau Cœur.
Tu penses en termes d'adoption, de rétention et de valeur perçue.

══════════════════════════════════════
CE QUI CHANGE DANS L'OUTPUT
══════════════════════════════════════

Le nouveau Cœur produit un signal plus propre et plus lisible.
On veut en profiter pour revoir TOTALEMENT l'output utilisateur.

CHANGEMENTS PRÉVUS :

1. RENOMMAGE DES PILIERS
   Actuel  : FAIRE / LIER / ÊTRE
   Nouveau : IMPACT / RÉSONANCE / ANCRAGE
   Raison  : termes qui "valident" plutôt que "prescrivent"

2. POSTURE DU JOUR (nouveau concept)
   Au lieu d'un tableau de bord analytique,
   l'écran d'accueil affiche une "Posture" :
   - Un verbe d'action (OBSERVEZ / LANCEZ / CONNECTEZ / REPOSEZ / CRÉEZ)
   - Une phrase de "permission" (ex: "L'énergie du jour favorise le retrait...")
   - Un halo chromatique respirant (animation CSS selon type de journée)

3. FEEDBACK LOOP REDESIGNÉ
   Avant : score visible → noter sa journée (biais d'ancrage)
   Après :
     - 20h00 : push notification "Votre bilan est prêt"
     - Scores floutés à l'ouverture
     - Tap 1 : choisir polarité (Fluide / Mixte / Exigeant)
     - Tap 2 : choisir dimension (Action / Lien / Intériorité)
     - Scores dévoilés

4. MÉTRIQUES DE PRÉCISION
   Remplace "Concordance X%" (trop vague) par :
   - MAE (Erreur Absolue Moyenne) — seuil signif. < 15 pts
   - Spearman ρ — seuil signif. > 0.60 (n=11 jours minimum)

══════════════════════════════════════
TES 4 QUESTIONS OBLIGATOIRES
══════════════════════════════════════

1. ADOPTION — CE QUI VA BLOQUER
   Quels sont les 3 freins à l'adoption de ces changements ?
   (Changements de labels, nouveau flux feedback, Posture du Jour...)
   Pour chaque frein : comment le mitiger sans renoncer au changement.

2. LA POSTURE DU JOUR — RISQUES
   Ce concept est puissant mais risqué. Identifie :
   a) Le risque de "fausse prescription" (l'app dit "Reposez" mais
      l'utilisateur a une réunion importante — il se sent coupable)
   b) Comment formuler les Postures pour qu'elles soient
      des permissions, pas des injonctions ?
   c) Propose 5 formulations de Postures (une par type de journée :
      Décision / Expansion / Communication / Observation / Retrait)

3. FEEDBACK LOOP — FAILLES
   Dans le nouveau flux (2 taps, scores masqués) :
   a) Quelle est la principale raison pour laquelle l'utilisateur
      ne va PAS compléter le feedback du soir ?
   b) Comment la neutraliser (récompense, habitude, design) ?
   c) Le moment 20h00 est-il optimal ou y a-t-il mieux ?

4. TRANSITION
   On passe de l'ancienne UI à la nouvelle. L'utilisateur a ses repères.
   a) Quel changement est le plus risqué (perte d'utilisateurs) ?
   b) Proposer un plan de transition en 2 phases (doux puis complet)
   c) Comment expliquer à l'utilisateur le changement sans l'angoisser ?

FORMAT :
  ## 1. Freins à l'adoption (3 points)
  ## 2. Posture du Jour (a/b/c + 5 formulations)
  ## 3. Feedback loop (a/b/c)
  ## 4. Transition (a/b/c)
  Max 900 mots. Exemples concrets obligatoires.
```

---

## APRÈS LES 3 RÉPONSES → Plan de code Sprint Y

Une fois les réponses reçues, revenir ici et coller tout.
Je ferai la synthèse finale et on commencera le code étape par étape :
1. Oracles d'abord
2. Shadow mode (ancien + nouveau en parallèle)
3. Migration couche par couche
