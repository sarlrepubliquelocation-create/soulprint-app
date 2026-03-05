# RONDE 3 — AFFINAGE DU CŒUR
## Objectif : Répondre aux questions non résolues · Descendre au niveau opérationnel
> Ronde 1 = audit · Ronde 2 = plan · Ronde 3 = spécifications techniques prêtes à coder

---

# ═══ PROMPT GPT (Calibration empirique + Protocole shadow) ═══

```
Tu es architecte senior sur Kaironaute V10.9 (Rondes 1 et 2 effectuées).
Tu as identifié 4 points non résolus. Cette ronde les résout complètement.
Tu es en MODE SPÉCIFICATION : tu produis des formules et tableaux exploitables,
pas des orientations générales.

══════════════════════════════════════
RAPPEL — CE QUI A ÉTÉ DÉCIDÉ
══════════════════════════════════════

Architecture Cœur validée :
  x_i = clamp(d_i / cap_i_P95, −1, +1)          ← normalisation par quantile empirique
  X_group = clamp(Σ x_i × w_i, −gCap, +gCap)    ← caps de groupe conservés
  X = Σ X_group
  X_total = X + β × base_signal   (β ≈ 0.8)
  Δ = A × tanh(k × X_total)
  score = clamp(50 + Δ × terrain_squashé, 0, 100)
  terrain_squashé = 1 + 0.25 × tanh((terrain_brut − 1) / 0.35)

Noyau : base_signal = 0.55 × S_dasha + 0.40 × S_nak + 0.05 × S_tithi
  (BaZi DM sorti du noyau → L1 secondaire)

Cible distribution :
  médiane ≈ 55 · P5 ≈ 30 · P95 ≈ 82 · "Cosmique" (≥88) ≤ 7 jours/an

══════════════════════════════════════
TES 4 SPÉCIFICATIONS OBLIGATOIRES
══════════════════════════════════════

1. PROTOCOLE DE CALIBRATION EMPIRIQUE (cap_i_P95)
   On n'a pas 365 jours de logs réels. On doit simuler.
   Donne le protocole exact :
   a) Comment générer une distribution réaliste de d_i pour chaque module ?
      (paramètres de la distribution, hypothèses, bornes à respecter)
   b) Combien de jours simuler ? Quelle seed/reproductibilité ?
   c) Comment calculer P95 de |d_i| de façon robuste (méthode exacte) ?
   d) Livrer un tableau des cap_i_P95 estimés pour les modules actuels :
      C_BAZI (±15), C_LUNE (±16), C_EPHEM (±14), SCIS (±2),
      R27 (±2), R29 (±3), Panchanga (±4), Étoiles fixes (±5)
      → Pour chaque : cap_théorique actuel / cap_P95 estimé / ratio

2. CALIBRATION A ET K (formules exactes)
   Cible : P95(score) ≈ 82, "Cosmique" ≤ 7 jours/an
   Donne la procédure de calibration pas à pas :
   a) Étape 1 : calculer Q95(X_total) depuis la simulation
   b) Étape 2 : choisir k depuis Q95(X_total) et P95 cible
      → formule exacte de k en fonction de Q95 et P95_cible
   c) Étape 3 : choisir A depuis k et P95_score cible
      → formule exacte de A
   d) Fournir les valeurs numériques estimées (k ≈ ?, A ≈ ?) pour notre cas

3. PROTOCOLE SHADOW MODE (non-régression)
   L'ancien moteur et le nouveau doivent tourner en parallèle.
   Donne un protocole opérationnel :
   a) Quelle structure de données pour stocker les 2 scores en parallèle ?
   b) Quels 5 indicateurs surveiller pour valider que le nouveau moteur
      ne régresse pas (distributional drift, oracle failures, etc.) ?
   c) Critère de bascule : à quel seuil passe-t-on du shadow au moteur principal ?
   d) Plan de rollback si régression détectée

4. SCIS — NOUVEAU SEUIL
   SCIS actuel : 3/4 groupes alignés → ±2 pts (actif 62.5% du temps)
   Cible : 15-20 jours/an actif
   a) Avec 4 groupes (NUM/BaZi/Lune/Éphem), quel seuil exact ?
      (4/4 alignés seulement ? ou 4/4 + magnitude minimale ?)
   b) Faut-il ajouter une condition de magnitude minimale sur chaque groupe ?
      Si oui : quelle valeur seuil par groupe ?
   c) L'effet ±2 pts est-il encore pertinent dans la nouvelle formule
      (maintenant normalisé et passé par tanh) ?

FORMAT OBLIGATOIRE :
  ## 1. Protocole calibration (a/b/c/d avec tableau)
  ## 2. Calibration A et k (a/b/c/d avec valeurs numériques)
  ## 3. Shadow mode (a/b/c/d)
  ## 4. SCIS nouveau seuil (a/b/c)
  Zéro blabla. Tableaux et formules. Max 1000 mots.
```

---

# ═══ PROMPT GROK (Spécification Tithi + R32 technique) ═══

```
Tu es expert Jyotish et BaZi sur Kaironaute V10.9 (Rondes 1 et 2 effectuées).
Tu passes en MODE SPÉCIFICATION TECHNIQUE.
Tu fournis des formules, des tables et des règles précises, codables directement.

══════════════════════════════════════
RAPPEL — CE QUI A ÉTÉ DÉCIDÉ
══════════════════════════════════════

Noyau védique pur validé :
  base_signal = 0.55 × S_dasha + 0.40 × S_nakshatra + 0.05 × S_tithi

Tu as identifié :
  - Tithi obligatoire dans le noyau (rythme lunaire vrai)
  - R32 (retour Nakshatra natal) la plus urgente → +3 pts LUNE
  - R31 redondante avec Dasha → supprimée
  - Règle de réconciliation BaZi × Védique à spécifier

Kaironaute a déjà :
  - calcTarabala / calcChandrabala / calcPanchanga (panchanga.ts)
  - getTithiLord + calcTithiLordGochara (déjà importés)
  - Nakshatra composite dans nakshatras.ts
  - Vimshottari Dasha dans vimshottari.ts (score [-X, +X])

══════════════════════════════════════
TES 4 SPÉCIFICATIONS OBLIGATOIRES
══════════════════════════════════════

1. TITHI DANS LE NOYAU — SPÉCIFICATION COMPLÈTE
   S_tithi doit être un scalaire ∈ [−1, +1]
   Les 30 Tithis (15 croissants + 15 décroissants) ont des qualités différentes.
   a) Fournir la table complète des 30 Tithis avec leur score ∈ [−1, +1] :
      - Nom du Tithi (1=Pratipada...15=Purnima, 16-30 côté décroissant)
      - Qualité védique (Nanda/Bhadra/Jaya/Rikta/Purna)
      - Score proposé (ex: Purnima = +1.0, Amavasya = −0.8, etc.)
   b) Comment calculer S_tithi depuis le Tithi actif ?
      (formule + gestion du changement de Tithi en milieu de journée)
   c) Poids 0.05 dans le noyau : est-ce suffisant ou faut-il ajuster ?

2. R32 — SPÉCIFICATION TECHNIQUE COMPLÈTE
   Condition : Transit Nakshatra du jour = Nakshatra natal de l'utilisateur
   Tu avais dit : +3 pts, domaine LUNE uniquement
   a) Condition exacte : même Nakshatra exact (1/27) ou Nakshatra ±1 aussi ?
   b) Fréquence attendue : combien de jours/an s'active-t-elle ?
      (27 Nakshatras, la Lune en change tous les ~13 jours → ?)
   c) Doit-elle inclure aussi le Nakshatra de la Lune natale
      en transit ? Ou Nakshatra ascendant natal ? Ou les deux ?
   d) Interaction avec les modules déjà existants :
      - Risque de double-comptage avec Tarabala (déjà lunaire) ?
      - Guard nécessaire ?
   e) Livrer la règle sous forme de code-spec :
      IF transitNakshatra === natalNakshatra THEN delta_lune += X
      (avec toutes les conditions et gardes)

3. RÉCONCILIATION BaZi × VÉDIQUE — RÈGLE CODABLE
   Tu avais proposé :
   "Si élément DM et Nakshatra lord en harmonie (même élément) → +1.5,
    sinon malus −1"
   Mais les éléments ne sont pas directement comparables (Wu Xing 5 vs Tattwas).
   a) Fournir la table de correspondance Wu Xing → Tattwas :
      (Bois/Feu/Terre/Métal/Eau → Akasha/Vayu/Agni/Prithvi/Jala)
   b) Quels Nakshatra lords correspondent à quels éléments védiques ?
      (9 lords : Su Ma Bu Me Gu Ve Sa Ra Ke + leurs éléments)
   c) Règle finale codable : condition exacte + impact ± chiffré

4. CALENDRIER D'IMPLÉMENTATION (ordre de priorité)
   Parmi les modules suivants, donne l'ordre optimal d'implémentation
   dans la nouvelle architecture (du plus fondamental au plus optionnel) :
   a) Tithi dans le noyau (S_tithi)
   b) R32 (retour Nakshatra)
   c) Réconciliation BaZi × Védique
   d) R33 (Tithi Nanda/Purna + Jian Chu Sheng)
   e) Saturation Saturne × Lune natale en Dasha Saturne
   Justification pour chaque ordre.

FORMAT :
  ## 1. Tithi (tables + formule)
  ## 2. R32 (specs techniques + code-spec)
  ## 3. Réconciliation (tables de correspondance + règle)
  ## 4. Calendrier
  Tables obligatoires. Max 900 mots.
```

---

# ═══ PROMPT GEMINI (UX Spécification finale) ═══

```
Tu es expert UX et psychologie comportementale sur Kaironaute (Rondes 1 et 2 effectuées).
Tu passes en MODE LIVRABLE : tu produis des spécifications UX directement codables.
Pas d'orientations générales — des textes, des flux, des critères d'acceptance.

══════════════════════════════════════
RAPPEL — CE QUI A ÉTÉ DÉCIDÉ
══════════════════════════════════════

Output du Cœur validé :
  1. Posture du Jour (TRANCHEZ / DÉPLOYEZ / RÉSONNEZ / DÉCRYPTEZ / PRÉSERVEZ)
  2. Labels renommés : IMPACT / RÉSONANCE / ANCRAGE
     → sous-titres anciens (Faire/Lier/Être) pendant 30 jours
  3. Architecture "pelure d'oignon" :
     Écran 1 = Posture (épuré) → swipe up = scores détaillés
  4. Feedback loop redesigné :
     - Scores floutés à l'ouverture
     - Tap 1 : polarité (Fluide / Mixte / Exigeant)
     - Tap 2 : dimension (Action / Lien / Intériorité)
     - Scores dévoilés avec message "effet Miroir"
  5. Timing : 21h30 OU matin suivant (à décider)
  6. Message de transition : "Symbiose"

══════════════════════════════════════
TES 4 LIVRABLES OBLIGATOIRES
══════════════════════════════════════

1. COPYWRITING COMPLET — POSTURE DU JOUR (5 types)
   Pour chaque type de journée (Décision / Expansion / Communication /
   Observation / Retrait) :
   a) Le verbe principal (1 mot, impératif)
   b) La phrase de permission (15-25 mots max, ton apaisant)
   c) La sous-phrase contextualisée si l'utilisateur "doit quand même agir"
      (ex : "Si vous devez performer aujourd'hui, faites X, laissez Y")
   d) La couleur/ambiance du halo (description : teinte, intensité, rythme)
   Format : tableau à 4 colonnes × 5 lignes

2. MESSAGE DE TRANSITION "SYMBIOSE"
   L'utilisateur ouvre l'app après la mise à jour.
   Livrer le texte exact de l'onboarding en 3 écrans max :
   Écran 1 : Le titre accrocheur (5 mots max)
   Écran 2 : L'explication (50 mots max, le "pourquoi ça change")
   Écran 3 : Le call-to-action (1 bouton, 3 mots max)
   → Ton : mystique mais rassurant, pas corporate

3. FEEDBACK LOOP — SPÉCIFICATION COMPLÈTE
   a) Timing final : 21h30 ou matin suivant ?
      Argumenter pour UN seul choix (pas les deux).
   b) Texte exact des 3 options Tap 1 (polarité) :
      - 🌊 [label] + [sous-texte 8 mots max]
      - ⚖️ [label] + [sous-texte 8 mots max]
      - ⛰️ [label] + [sous-texte 8 mots max]
   c) Texte exact des 3 options Tap 2 (dimension) :
      - ⚡ [label] + [sous-texte 8 mots max]
      - 🤝 [label] + [sous-texte 8 mots max]
      - 🧘 [label] + [sous-texte 8 mots max]
   d) Message "effet Miroir" après les 2 taps :
      Template exact (avec variables [RESSENTI] et [PRÉDIT]) :
      Cas 1 : concordance (ressenti ≈ prédit)
      Cas 2 : divergence (ressenti ≠ prédit)
      Cas 3 : neutre/mixte

4. CRITÈRES D'ACCEPTANCE UX
   Pour que la nouvelle UX soit considérée "validée", donne :
   a) 5 critères comportementaux mesurables
      (ex : taux complétion feedback ≥ X%, temps sur Posture ≥ Xs...)
   b) 3 signaux d'alerte (si on les voit, la transition a échoué)
   c) Définition du "test utilisateur minimal viable" avec 1 seul utilisateur
      avant le déploiement général

FORMAT :
  ## 1. Posture du Jour (tableau 4×5)
  ## 2. Message Symbiose (3 écrans)
  ## 3. Feedback loop (a/b/c/d avec textes exacts)
  ## 4. Critères d'acceptance (a/b/c)
  Textes EXACTS obligatoires. Max 900 mots.
```

---

## APRÈS RONDE 3 → ON CODE

Quand les 3 réponses sont reçues, coller ici.
Le plan de code sera :
  Y0 — Tableau caps_i_P95 + valeurs A/k/β → définitifs
  Y1 — base_signal (Dasha + Nakshatra + Tithi) en shadow
  Y2 — Formule unifiée tanh en shadow
  Y3 — Migration terrain squashé
  Y4 — R32 + réconciliation BaZi×Védique
  Y5 — Output (Posture + labels + feedback)
