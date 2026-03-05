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
| Y5 | Bascule production (tanh réel + base_signal actif + terrain_sq) | `convergence.ts`, `convergence-slow.ts` |
