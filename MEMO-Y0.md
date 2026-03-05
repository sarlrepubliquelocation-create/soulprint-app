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
A    = 36.0      // amplitude delta
k    = 0.840     // pente tanh
bias = +5        // offset positif (P50 cible = 55, pas 50)

Δ     = A × tanh(k × X_total)
score = clamp(50 + Δ × terrain + bias, 0, 100)
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
