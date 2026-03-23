# MEMO Y0 — Paramètres calibrés du Cœur Unifié
> Produit par scripts/calibrate.ts — N=50 000 jours — seed=10908
> Ces valeurs sont les références pour tous les sprints Y suivants.

---

## Caps P95 par module (normalisation x_i)

| Module | cap_théorique | cap_P95 | ratio |
|--------|--------------|---------|-------|
| C_BAZI | 15 | 11 | 0.73 |
| C_LUNE | 16 | 12 | 0.75 |
| C_EPHEM | 14 | 10 | 0.71 |
| SCIS | 2 | 1 | 0.50 |
| R27 | 2 | 1 | 0.50 |
| R29 | 3 | 2 | 0.67 |
| Panchanga | 4 | 3 | 0.75 |
| EtoilesFixes | 5 | 4 | 0.80 |

```typescript
// Normalisation dans le nouveau moteur
x_i = clamp(d_i / cap_P95_i, -1, +1)
```

---

## Paramètres formule unifiée tanh

```typescript
// ── Ronde 29 V3 (remplace anciens A=36, k=0.840) ──
A    = 44.0      // amplitude delta (Ronde 29 V3)
k    = 0.65      // pente tanh (Ronde 29 V3)
bias = 0         // supprimé (P50 = 50 exact)

X_core      = clamp(XL + XE + XB + XI, -2.80, +2.80)   // ex ±1.6
X           = clamp(X_core + C4, -3.15, +3.15)          // ex ±2.0
X_total     = X + β × baseSignal
eff_terrain = exp(tanh(X_total / 0.35) × ln(terrain_sq)) // lissage Vasquez C¹
score       = clamp(round(50 + A × tanh(k × X_total × eff_terrain)), 0, 100)
```

### Distribution résultante (N=50 000)
| Percentile | Valeur | Cible |
|-----------|--------|-------|
| P5 | 26.5 | ≈ 30 |
| P50 | 55.3 | ≈ 55 ✅ |
| P95 | 83.5 | ≈ 82 ✅ |
| Cosmique (≥88) | 3 jours/an | ≤ 7 ✅ |

---

## Terrain squashé (1 multiplicateur unique)

```typescript
terrain_squashé = 1 + 0.25 × tanh((terrain_brut − 1) / 0.35)
// Plage réelle : [0.85, 1.15] en régime normal, [0.75, 1.25] en extrême
// Remplace : ctxMult × dashaMult (ancien système 2 couches)
```

---

## Caps de groupe (gCap en espace normalisé)

```typescript
G_CAP_BAZI  = 0.85   // clamp(Σ x_i_bazi × w_i)
G_CAP_LUNE  = 0.90
G_CAP_EPHEM = 0.80
G_CAP_SLOW  = 0.60   // SCIS + R27 + R29 + Panchanga + Étoiles
```

---

## Noyau védique pur (base_signal)

```typescript
base_signal = clamp(
  0.55 × S_dasha + 0.40 × S_nak + 0.05 × S_tithi,
  -1, +1
)
β = 0.8   // poids dans X_total

X_total = X + β × base_signal
```

### Calcul S_tithi (table Grok Ronde 3)
```typescript
const tithiIndex = Math.floor(((moonLon - sunLon + 360) % 360) / 12) + 1;
// 1=Pratipada(+0.6) 2=Dwitiya(+0.4) 3=Tritiya(+0.8) 4=Chaturthi(-0.9)
// 5=Panchami(+0.7)  6=Shashthi(+0.5) 7=Saptami(+0.4) 8=Ashtami(+0.3)
// 9=Navami(-1.0)   10=Dashami(+0.8) 11=Ekadashi(+0.9) 12=Dwadashi(+0.6)
// 13=Trayodashi(+0.7) 14=Chaturdashi(-0.7) 15=Purnima(+1.0)
// 16-30 = miroir Krishna (signe inversé)
```

---

## SCIS — Nouveau seuil (Ronde 3 GPT)

```typescript
// Activation : 4/4 groupes alignés + magnitude minimale
const scisActive =
  groupsAligned === 4 &&
  countAbove(groups, 0.35 * gCap) >= 3;

// Effect : offset sur X_total (pas delta brut)
if (scisActive) X_total += 0.10 × sign(sumGroups);
// Fréquence cible : ~15-18 jours/an
```

---

## R32 — Retour Nakshatra natal (Ronde 3 Grok)

```typescript
if (transitNakshatraIndex === natalNakshatraIndex && !isAbhijit) {
  delta_lune += tarabalaDelta >= 2 ? 1.5 : 3.0;
}
// Fréquence : ~13 jours/an
```

---

## Réconciliation BaZi × Védique

```typescript
// Wu Xing → Tattwa : Bois=Vayu · Feu=Agni · Terre=Prithvi · Métal=Akasha · Eau=Jala
// Lords Nakshatra → Tattwa :
//   Ketu/Sol/Mars = Agni · Lune/Vénus = Jala
//   Rahu/Sat = Vayu · Jupiter = Akasha · Mercure = Prithvi
const harmony = dmTattwa === nakLordTattwa ? +1.5 : -1.0;
delta_final += harmony;
```

---

## Ordre d'implémentation (Sprint Y)

| Sprint | Contenu | Fichier principal |
|--------|---------|-------------------|
| Y0 ✅ | Calibration (ce fichier) | `scripts/calibrate.ts` |
| Y1 ✅ | S_tithi + base_signal en shadow | `convergence-slow.ts` |
| Y2 ✅ | Formule tanh unifiée en shadow | `convergence-daily.ts`, `convergence.ts` |
| Y3 ✅ | R32 + Réconciliation BaZi×Védique + SCIS seuil 4/4 | `convergence-daily.ts`, `interactions.ts` |
| Y4 ✅ | UX (Posture + IMPACT/RÉSONANCE/ANCRAGE + feedback shadowScore) | `ConvergenceTab.tsx`, `FeedbackWidget.tsx` |
| Y5 ✅ | Bascule production (tanh réel + base_signal actif + terrain_sq) | `convergence.ts`, `convergence-slow.ts` |
| Z1 ✅ | Nettoyage prod (console.debug, TODOs, FeedbackWidget shadow) | `convergence.ts`, `FeedbackWidget.tsx` |
| Z2-B ✅ | Observabilité groupes (baziGroupDelta / luneGroupDelta / ephemGroupDelta) | `convergence.types.ts`, `convergence-daily.ts`, `convergence.ts` |
| AA ✅ | Sprint AA — Ronde 2 consensus (R33 Métal=Vayu + garde S_nak + β_eff + Courant de Fond + Paradoxe) | `convergence-daily.ts`, `convergence-slow.ts`, `convergence.ts`, `convergence.types.ts`, `ConvergenceTab.tsx` |
| AB ✅ | Sprint AB — Rondes 3+4 (AC-R2 nuance Bois/Métal R33 · AB-R1 dashaLord×nakLord boost · AB-R2 pondération 0.55/0.30/0.15 · AB-G1 αG hiérarchisés + X_core ±1.6 · AB-M1 Bannière Paradoxe + slider · AB-M2 masque Mer d'huile + icône 🌊) | `convergence-daily.ts`, `convergence-slow.ts`, `convergence.ts`, `ConvergenceTab.tsx` |
| AC ✅ | Sprint AC — user_calibration_offset (EMA α=0.22 · bornes ±8 dur · cap 2pts/j · profils Fluide/Équilibré/Exigeant · overlay matin · pause 7j si 3 skips · displayScore post-tanh) | `calibration.ts` (nouveau), `ConvergenceTab.tsx` |
| AD ✅ | Sprint AD — Observabilité αG (Kendall τ-b par groupe · stockage deltas quotidiens · 3 paliers · Règle réversion · UI observabilité expert panel) | `validation-tracker.ts`, `ConvergenceTab.tsx`, `CalendarTab.tsx` |
| AE ✅ | Sprint AE — Calibration automatique αG Phase 2 (moteur `runWeeklyAlphaGUpdate` · singleton `getAdaptedAlphaG` · persistance `kairo_alphag_v1` · renorm Algo B · bornes [0.50,2.00] · UI αG actuels dans expert panel) | `alpha-calibration.ts` (nouveau), `convergence.ts`, `ConvergenceTab.tsx` |
| AF ✅ | Sprint AF — Validation prédictive scientifique (Rondes 11-12 · hybride fréquentiste+bayésien · circular-shift permutation · DOW centering · Holm-Bonferroni · tables exactes τ-b n≤9 · Null Model baseline naïve · Beta-Binomial accumulateur · évaluation préquentielle · UI confiance scientifique + lift vs baseline) | `predictive-validation.ts` (nouveau), `ConvergenceTab.tsx` |
| AG ✅ | Sprint AG — Cas limites & robustesse (19 vulnérabilités corrigées · `safe-utils.ts` utilitaire central · div/0 guards moon+vimshottari · NaN guards convergence pipeline · date validation safeParseDateLocal · parseInt radix 10 · array bounds check · numerology parseDate robuste) | `safe-utils.ts` (nouveau), `moon.ts`, `vimshottari.ts`, `convergence.ts`, `convergence-daily.ts`, `convergence-slow.ts`, `numerology.ts` |
| AH ✅ | Sprint AH — Performance (3 phases · LRU cache getMoonPhase 500 entrées · cache inter-render calcDayPreview 1200 entrées · setTimeout(0) déféré ForecastTab pour libérer premier paint · message chargement UX) | `moon.ts`, `convergence.ts`, `ForecastTab.tsx` |
| AI ✅ | Sprint AI — DM Strength / Force du Maître du Jour (Chantier 5 · consensus 3/3 IAs GPT+Grok+Gemini R2 · 5 facteurs : YueLing(30)+Tonggen(20)+SupportRatio(30)+Changsheng(10)+Debuffs(10) · indice 0-100 · classes Faible/Moyen/Fort · modulation ±20% 10 Gods via s=clamp((DM-50)/20,-1,+1) · sans heure 0.65×DM_3p+0.35×50) | `dm-strength.ts` (nouveau), `convergence-daily.ts` |
| AJ ✅ | Sprint AJ — Shen Sha complets + scoring actif (Chantier 5 · 10 nouvelles étoiles : YangRen KongWang TaoHua TianXi JieSha ZaiSha GuChen GuaSu XueRen FuXing · anti-stack poids [1,0.6,0.4,0.3,0.25,0.2] cap ±4 · interaction DM×ShenSha : négatives ×(1+0.25×(-s)), protectrices ×(1+0.20×(-s)) · intégré dans C_BAZI ±15) | `bazi.ts`, `convergence-daily.ts` |
| AK ✅ | Sprint AK — SAV Ashtakavarga hybride (Chantier 5 · buildSAV somme 7 BAV par signe · deltaSAV=clamp((SAV-28)×0.22,-2.8,+2.8) · hybride Moon BAV+SAV : clamp(Lune_BAV×0.75 + SAV_delta, -5, +5) · remplace ancien Moon BAV pur ±2) | `ashtakavarga.ts`, `convergence-daily.ts` |
| AL ✅ | Sprint AL — Kinetic Shocks (Chantier 5 Sprint 2 · consensus 3/3 IAs R4 confrontation · Ingress Soleil -1 jour J · Ingress Mars -2 jour J · Station D↔R Mercure/Vénus/Mars -2 additif + BAV×1.40 jour J seul · pas de rétro continu ni shadow · dans C_EPHEM ±14) | `kinetic-shocks.ts` (nouveau), `convergence-daily.ts` |
| AM-AX ✅ | Sprints AM→AX — Consolidation UX + Shapley + Rondes 13→19 (vectorEngine, pattern-detection, strategic-reading, shapley contributions, momentum, rarity index, etc.) | Multiples |
| AY ✅ | Sprint AY — Ronde 20 UX (3 postures AGIR/AJUSTER/RALENTIR · Triade FORCE/ALIGNEMENT/VIGILANCE · moonPhaseAction · Shapley bars · Compact blocks · FeedbackWidget repositionné) | `convergence.ts`, `ConvergenceTab.tsx` |
| R21B ✅ | Ronde 21-bis — Consensus 3 IAs (2 écrans + tiroir "Explorer le détail" · Override moteur : 4 signaux pause ≥3 → force AGIR→AJUSTER · Micro-ligne "Score élevé — contexte prudent" · dayTypeHuman() J+1 · moonPhaseAction() tiroir · tenGodHuman() 10 Dieux BaZi · H8/12→Cycle diurne/nocturne · Heure Planétaire enrichie (horaire en cours, conseil contextuel, tri chronologique) · "Précision 0%"→"Calibration en apprentissage" · "Vimshottari/jyotish" supprimé · Arcane de Saison→Arcane de Cycle de Vie · Shapley élargi + sous-labels (BaZi=Astrologie chinoise) · "Pics de fluidité"→"Meilleurs créneaux" · Bug "Dans -12 jour"→"Depuis 12 jours" · %→/100 dans conseils domaines · Tarot narrative 160 chars) | `convergence.ts`, `ConvergenceTab.tsx`, `FeedbackWidget.tsx`, `validation-tracker.ts`, `planetary-hours.ts` |
| R22 ✅ | Ronde 22/22b/22c — Fix Cosmic/Gold calendrier · R22 consensus 3/3 : Option A (terrain_sq) — insuffisant seul car ctxMult clampé [0.95,1.05] · R22b consensus 3/3 : time-decay D3 cosinus · R22c consensus 3/3 : Option G (baseSignal) — insuffisant car baseSignal ≈ 0 pour certains profils | `convergence.ts`, `CalendarTab.tsx` |
| R23 ⚠️ | Ronde 23 — Fusion H+K (intermédiaire, remplacée par R24) · Ratio adaptatif live/preview — fonctionnel MAIS instable : calendrier fluctuait selon le jour de connexion | `convergence.ts`, `CalendarTab.tsx` |
| R24 ⚠️ | Ronde 24/24bis — K-signal symétrique (intermédiaire, remplacée par R25) · K_STRUCT multiplicatif alignait les pics mais pas les jours moyens · Écart 7 pts entre calendrier et pilotage pour le jour J | `convergence.ts` |
| R25 ⚠️ | Ronde 25 — **L-lite : unification formules** (consensus 3/3 GPT+Grok+Gemini) · `scoreFromGroups()` partagée live/preview · Formule unifiée MAIS preview avait ~60% moins de signal (3 modules vs ~20 dans le live) → scores effondrés, 0 Cosmique · **Bug 2 fix** : CalendarTab initialisé au mois courant | `convergence.ts`, `CalendarTab.tsx` |
| R26 ⚠️ | Ronde 26 — **Réactivation modules preview** (consensus 2/3 GPT+Gemini) · Réactivé 9 modules manuellement · Insuffisant : écart 5pts (77 vs 82) · Bug découvert R27 : pdPts/moonScore/mercPts ajoutés aux groupes alors qu'ils sont narratifs-only dans le live | `convergence.ts` |
| R27 ✅ | Ronde 27 — **Single Source of Truth** (consensus 3/3 GPT+Gemini+Grok) · **calcDayPreview appelle désormais calcDailyModules** — plus de pipeline séparé · Supprimé ~200 lignes de calcul dupliqué · Les 4 group deltas viennent directement du moteur live · Fix bug R25 : ordre paramètres scoreFromGroups (bazi↔lune inversés) · Fix bug R26 : pdPts/moonScore/mercPts retirés des groupes · Bundle -4 KB · **GAP=0 confirmé par diagnostic** (scoreMainScore ≡ scoreSfG pour le jour J) | `convergence.ts` |
| R28 ✅ | Ronde 28 — **L2-lite : dashaMult + baseSignal par jour** (consensus 3/3 GPT+Gemini+Grok) · Cause racine "0 Cosmic" identifiée : dashaMult=0.8 fixe → plafond théorique ~81 · `buildNatalDashaCtx()` construit le contexte natal UNE FOIS · `calcDashaMultLite()` recalcule dashaMult par jour (arithmétique Vimshottari pure ≈ 0.01ms) · `calcBaseSignalLite()` recalcule baseSignal par jour · ctxMult reste fixe (quasi-constant sur 1 an) · **Garde GAP=0** : si targetDate === today → terrain live inchangé · CalendarTab passe `bt` pour heure naissance · Bundle +1 KB | `convergence-slow.ts`, `convergence.ts`, `CalendarTab.tsx`, `App.tsx` |
| R29 ✅ | Ronde 29 (5 sous-rondes : 29/29bis/29ter/29-final/29-ultime) — **Recalibration formule V3** (consensus 2/3→3/3) · **2 verrous structurels** : X_core cap ±1.6 jetait 51% du signal + terrain_sq multiplicatif HORS tanh = plafond absolu · **V3 finale** : A=36→44 · k=0.840→0.65 · X_core ±1.6→±2.80 · X ±2.0→±3.15 · terrain DANS tanh avec lissage Vasquez `eff_terrain=exp(tanh(X_total/0.35)×ln(terrain_sq))` — C¹ continu, asymétrique (bon terrain amplifie jours+, amortit jours−) · **Experts** : GPT (Dr. Vasquez maths), Grok (Pr. Yamamoto systèmes), Gemini (Pr. Sharma stats) · Faille "Double Peine Inversée" trouvée en 29ter et corrigée · 3 fonctions modifiées : `scoreFromGroups`, `calcMainScore`, `computeShapley4` · Diagnostics R28-AUDIT supprimés | `convergence.ts` |
| R30 ✅ | Ronde 30 (3 sous-rondes : 30/30bis/30ter) — **Déblocage dashaMult plancher** (consensus 3/3) · **Verrou** : dashaMult=0.80 (hard-clamp) identique 5 ans (2026-2030), Antardasha invisible · **Formule B'** : poids 50/50 (ex 65/35) · clamp dur → smooth `tanh(z/0.25)` · `core=1+0.225t` · certainty shrink vers 1.0 (ex multiplicatif) · Range [0.775, 1.225] asymptotique · Cas critique M=-4/A=+2 : 0.80→**0.858** (+0.058) · Faille "saturation z/0.14" trouvée en 30bis (unanime 3/3) et corrigée (diviseur 0.25) · `composeDashaMultipliers` + `calcSandhiSmoothing` + `calcDashaMultLite` modifiés | `vimshottari.ts`, `convergence-slow.ts` |
| R31 ❌ | Ronde 31 — **Orthogonalisation S_dasha** — **REVERT** · Tentative d'éliminer la double peine (dashaTotal dans dashaMult ET S_dasha) · Résultat : supprimait trop de différenciation inter-années · Inflation massive bonnes années (2037: 80 Cosmic) · 2030 toujours 0 Cosmic · Cause : résidu ≈ pratyantar seul → S_dasha quasi-identique toutes années | REVERT complet |
| R31bis ❌ | Ronde 31bis — **Soft-sign asymétrique** — **REVERT** · Pente soft-sign à l'origine (1/6) > linéaire (1/9) → régression 2026/2027 pour dashaTotal entre -1 et -3 | REVERT |
| R32 ❌ | Ronde 32 — **Raccord C1 Rationnel S_dasha** (consensus Gemini) · Formule trop conservatrice : d=-7 → S_dasha=-0.568, impact score +0.7pt seulement · 2030 Pic=87% → toujours 0 Cosmique · Remplacé par R33 | `convergence-slow.ts` |
| R33 ❌ | Ronde 33 — **Atténuation linéaire facteur 0.25** · 2030 passe à 1 Cosmique (Pic 88%) mais déséquilibre global persiste : 2035=0 Cosmic vs 2037=104 · Ne traitait que S_dasha, pas dashaMult · Remplacé par R34 | `convergence-slow.ts` |
| R34 ❌ | Ronde 34 — **Équilibrage global double peine** (synthèse Gemini) · dashaMult asymétrique 0.15/0.225 + S_dasha=`8d/(63+9|d|)` · 2037 descend 104→74 Cosmic ✓ mais 2035 reste à 0 Cosmic ❌ · Amplitude négative 0.225 inchangée → dashaMult mauvaises années pas aidé · Remplacé par R35 | `vimshottari.ts`, `convergence-slow.ts` |
| R35 ❌ | Ronde 35 — **Amplitude (0.12/0.18)** (consensus Grok) · 2037 72 Cosmiques (ex 74, -2 seulement) · 2035 toujours 0 Cosmique (Pic 87%) · Insuffisant, remplacé par R36 | `vimshottari.ts` |
| R36 ❌ | Ronde 36 — **Synthèse GPT×Gemini** · amplitude (0.06/0.15) + S_dasha=`d/(6+3|d|)` · 2032: 0→3 Cosmiques ✓ · 2037: 72→55 ✓ · Mais 2035 reste 0 Cosmique (Pic 87% inchangé) · Gain S_dasha d=-3 insuffisant (+0.067 → +0.6pt seulement) · Remplacé par R37 | `vimshottari.ts`, `convergence-slow.ts` |
| R37 ✅ | Ronde 37 (2 sous-rondes : analyse + confrontation) — **Bump local d=-3** (consensus GPT, Grok trop grossier, Gemini collatéraux d=-5/-7) · Correction C¹ à support compact centrée d=-3, rayon 1.25 : `u=(d+3)/1.25; bump=max(0,1-u²); S_dasha += 0.12×bump²` · d=-3→-0.080 (ex -0.200, gain +0.120 → ~+1pt score) · d=-1→-0.111 exact (bump=0) · d=-5→inchangé (bump=0) · d=-9→inchangé (bump=0) · Amplitude R36 inchangée (0.06/0.15) | `convergence-slow.ts` (2 sites) |

---

## Sprint AD — Calibration automatique αG (Observabilité Phase 1)

### Décisions architecture (Rondes 5→9)

```
MÉTRIQUE     : Kendall τ-b (consensus 2/3 Ronde 5)
ANTI-LEAKAGE : corrélation sur scoreBrut uniquement (jamais displayScore) — 3/3
NORMALISATION: somme αG = 3.30 (GPT+Gemini Ronde 6 · Grok rejeté sum=3.0)
CAP HEBDO    : ±0.05 / groupe / semaine (verrouillé)
```

### Règle 3 paliers (post-Ronde 9)

```typescript
// Palier 1 : N < 21
//   → Collecte seulement. Pas de calcul τ-b.

// Palier 2 : 21 ≤ N < 60  (Fast-Track / shadow)
//   → τ-b calculé. αG adaptés SEULEMENT si :
//       |τ-b| ≥ 0.30
//       ET critères qualité : ≥ 3 valeurs distinctes, aucune note > 65%
//       ET N_eff ≥ 10  (jours où |luneDelta| ≥ P60 de la fenêtre)
//       ET std(luneDelta) ≥ 2.5
//   Trigger réversion : |τ-b| < 0.15 × 2 fenêtres consécutives

// Palier 3 : N ≥ 60
//   → Application normale si critères qualité OK.
//   Trigger réversion : |τ-b| < 0.20 × 2 fenêtres consécutives
```

### Règle réversion αG (décision finale Ronde 9 — hybride Grok+GPT)

```typescript
// Trigger :
//   Palier 3 (N≥60)  : |τ-b| < 0.20 × 2 fenêtres hebdo consécutives  [p≈0.024, σ=0.089]
//   Palier 2 (N<60)  : |τ-b| < 0.15 × 2 fenêtres consécutives         [σ plus grand]
//   Conditions additionnelles : N_eff ≥ 10 ET std(luneDelta) ≥ 2.5

// Mécanisme :
//   α_G ← (1 − λ) × α_G + λ × α_G_init   avec λ = 0.15/semaine
//   Clampé à ±0.05/groupe/semaine (cap hebdo absolu)
//   Renormalisé : α *= 3.30 / sum(α)

// Annulation :
//   |τ-b| ≥ 0.27 sur 1 fenêtre → stopper réversion, reprendre mode normal
```

### Données stockées (DayFeedback — Sprint AD)

```typescript
// Champs ajoutés à DayFeedback (validation-tracker.ts) :
luneDelta?  : number   // luneGroupDelta brut [-16, +16]
ephemDelta? : number   // ephemGroupDelta brut [-14, +14]
baziDelta?  : number   // baziGroupDelta brut [-15, +15]
scoreBrut?  : number   // cv.score post-tanh, pré-calibOffset (anti-leakage)

// Stockage intermédiaire (localStorage 'kairo_deltas_v1') :
// storeTodayDeltas(date, lune, ephem, bazi, scoreBrut) appelé à chaque chargement
// loadDeltas(date) → récupéré au moment du blind check-in du lendemain
```

### σ Kendall τ-b (correction Grok Ronde 9)

```typescript
// σ = sqrt(2 × (2N + 5) / (9 × N × (N − 1)))
// À N=60 : σ ≈ 0.0886  (GPT avait utilisé 0.129 à tort)
// À N=21 : σ ≈ 0.1577
// Donc τ-b=0.20 à N=60 → p ≈ 0.024 ✅ statistiquement significatif
```

---

## Sprint AE — Calibration automatique αG (Phase 2 — Moteur)

### Décisions architecture (Ronde 10)

```
Persistance  : localStorage 'kairo_alphag_v1' — structure AlphaGState (version 1)
Singleton    : getAdaptedAlphaG() — cache module-level, 1 lecture localStorage/session
               runWeeklyAlphaGUpdate() met _cachedState à jour directement
Integration  : calcShadowScore() lit getAdaptedAlphaG().current (fallback init si vide)
Fenêtre      : 7j glissants — winCur [D-6,D], winPrev [D-13,D-7] (Grok Ronde 10)
Renorm       : Algo B multiplication uniforme α *= 3.30/sum (Gemini Ronde 10)
Bornes abs   : [0.50, 2.00] par groupe (Gemini Ronde 10)
Affichage    : αG actuels dans panneau Mode Expert (Gemini Ronde 10)
```

### Structure AlphaGState

```typescript
interface AlphaGState {
  version: 1;
  current:  AlphaGTriple;          // αG en cours (modifiés par calibration)
  init:     AlphaGTriple;          // αG initiaux fixes (référence réversion)
  lastUpdatedWeek: string;         // ISO week "YYYY-Www"
  lowTauConsecutive: AlphaGTriple; // fenêtres consécutives |τ-b| < seuil, par groupe (0-2)
  lastTauB?: AlphaGTriple;         // τ-b dernier calcul (audit)
  lastTier?: 1 | 2 | 3;           // palier appliqué (audit)
}
// Valeurs initiales : lune=1.20 / ephem=1.10 / bazi=1.00 / somme=3.30
// reversionActive supprimé (dérivable de lowTauConsecutive ≥ 2) — Gemini Ronde 10
```

### Constantes moteur (gravées Rondes 5→10)

```typescript
ALPHAG_MIN   = 0.50    // borne absolue inférieure par groupe
ALPHAG_MAX   = 2.00    // borne absolue supérieure par groupe
CAP_WEEKLY   = 0.05    // ±0.05 / groupe / semaine
LAMBDA_REV   = 0.15    // taux réversion exponentielle
TAU_APPLY    = 0.30    // seuil application mise à jour
TAU_REV_P3   = 0.20    // trigger réversion palier 3 (σ=0.089 → p≈0.024)
TAU_REV_P2   = 0.15    // trigger réversion palier 2
TAU_CANCEL   = 0.27    // annulation réversion
MIN_WIN_FBKS = 3       // feedbacks min par fenêtre 7j
NEFF_MIN     = 10      // N_eff min (calculé sur historique complet, pas fenêtre)
STD_MIN      = 2.5     // std(delta) min
```

### Garde-fous rollback

```
1. isValidAlphaG() : NaN/Inf → rollback ; bornes [0.50-ε, 2.00+ε] ; |sum-3.30| > 1e-3 → rollback
2. No-collapse : std < 0.001 ET écart > 0.05 vs init → rollback
3. Palier 1 (N<21) : aucune modification αG — collecte seule
4. winCur.length < 3 → skip (semaine insuffisante)
```

### Déclenchement

```typescript
// ConvergenceTab.tsx — useEffect mount (idempotent : 1×/semaine ISO max)
useEffect(() => { runWeeklyAlphaGUpdate(new Date()); }, []);
```

---

## Sprint AF — Validation prédictive scientifique (Rondes 11-12)

### Consensus 3 IAs (GPT / Grok / Gemini)

```
Architecture : HYBRIDE fréquentiste (moteur) + bayésien (accumulateur confiance)
Évaluation   : Préquentielle (test-then-train) — αG gelés à t-1, prédiction évaluée à t
Autocorrélation : Circular-shift permutation test (préserve AR(1), pas de shuffle)
Confondants  : DOW centering (soustraire moyenne historique par jour de semaine)
Multiples    : Holm-Bonferroni sur 3 groupes (lune, ephem, bazi)
Densité      : Fenêtre rejetée si < 6/7 feedbacks
Accumulateur : Beta-Binomial Beta(α,β) — prior uniforme Beta(1,1) — update hebdo
Stockage     : localStorage 'kairo_predictive_v1' — max 52 records (1 an)
Module       : LECTURE SEULE — n'écrit rien dans le moteur de scoring
```

### Constantes du protocole (gelées — pré-enregistrement)

```typescript
TAU_SUCCESS_THRESHOLD = 0.10   // τ-b > 0.10 = signal détecté
P_VALUE_THRESHOLD     = 0.05   // significance
MIN_WINDOW_DENSITY    = 6      // feedbacks min sur 7 jours
WINDOW_DAYS           = 7      // fenêtre glissante
N_PERMUTATIONS        = 999    // circular-shift (impair pour p exact)
ALPHA_GLOBAL          = 0.05   // α familial Holm-Bonferroni
BETA_PRIOR            = (1, 1) // prior non-informatif (uniforme)
```

### Pipeline hebdomadaire

```
1. Charger feedbacks (avec deltas + userScore)
2. Filtre densité ≥ 6/7 jours
3. DOW centering (globalMean + moyennes par jour)
4. Pour chaque groupe (lune, ephem, bazi) :
   a. Kendall τ-b sur fenêtre 7j (deltas vs userScore centré)
   b. Circular-shift permutation test (999 shifts)
5. Holm-Bonferroni sur les 3 p-values
6. Succès global = au moins 1 groupe avec τ > 0.10 ET pAdjusted < 0.05
7. Beta update : α++ si succès, β++ si échec
8. Confiance = α / (α + β) × 100
```

### Tables exactes Kendall τ-b (n ≤ 9)

```
Consensus 3/3 Ronde 11 : approximation z imprécise pour petits échantillons
Source : Best & Gipps (1974) — one-tailed α = 0.05
n=5: τ_crit=0.800 | n=6: 0.600 | n=7: 0.524 | n=8: 0.429 | n=9: 0.389
Intégré dans circularShiftPermTest : p-value = max(pPerm, pExact) — conservateur
```

### Null Model — Baseline naïve (persistence forecast)

```
Consensus Gemini + GPT : comparer Kaironaute vs prédiction triviale
Baseline naïve : "demain = feedback d'aujourd'hui" (τ-b sur paires décalées)
tauKairo = meilleur τ-b parmi les 3 groupes
lift = tauKairo - tauNaive (> 0 = Kaironaute fait mieux que le hasard informé)
Verdict : kairo_better (lift > 5%) | naive_better (lift < -5%) | inconclusive
Affiché dans UI : "vs baseline naïve : +X% de signal"
```

### UI — Panneau expert

```
Affiche "Confiance scientifique · X sem." avec :
- % global (Beta accumulateur)
- Label user-friendly (Signal fort / modéré / en cours / faible)
- Mini-barres par groupe (lune/ephem/bazi)
- Lift vs baseline naïve (si verdict non-inconclusif)
Visible uniquement après la première évaluation (nWeeks > 0)
```

### Déclenchement

```typescript
// ConvergenceTab.tsx — useEffect mount (idempotent : 1×/semaine ISO max)
useEffect(() => { runWeeklyPredictiveValidation(new Date()); }, []);
```
