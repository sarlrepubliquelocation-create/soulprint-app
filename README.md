# SoulPrint Oracle 🔮

L'oracle de poche le plus précis du marché 2026.  
Croisement algorithmique de 5 systèmes : Numérologie · Astrologie · I Ching · Zodiaque Chinois · IA

## Stack

- React 18 + TypeScript
- Vite 6
- API Anthropic (Lecture IA)

## Setup local

```bash
npm install
npm run dev
```

→ http://localhost:3000

## Deploy Netlify

1. Créer un repo GitHub : `soulprint-app`
2. Push le code :
```bash
git init
git add .
git commit -m "🔮 SoulPrint v1.0 — 5 systèmes"
git branch -M main
git remote add origin https://github.com/TON-USERNAME/soulprint-app.git
git push -u origin main
```
3. Sur Netlify → New site → Import from GitHub → soulprint-app
4. Build settings auto-détectés via `netlify.toml`

## Structure

```
src/
├── engines/           # Moteurs de calcul (0 dépendance UI)
│   ├── numerology.ts  # Pythagore + Chaldéen + Lo Shu + Cycles
│   ├── astrology.ts   # 10 planètes + aspects + transits + éléments
│   ├── chinese-zodiac.ts  # 12 animaux + 5 éléments + compatibilités
│   ├── iching.ts      # 64 hexagrammes King Wen déterministes
│   └── convergence.ts # Score 0-100% croisant les 5 systèmes
├── components/        # UI React
│   ├── ConvergenceTab.tsx  # ⭐ Killer feature — score quotidien
│   ├── ProfileTab.tsx      # Nombres + Lo Shu + Synthèse
│   ├── AstroTab.tsx        # Big Three + Planètes + Aspects + Transits
│   ├── IChingTab.tsx       # Hexagramme visuel + convergence
│   ├── LectureTab.tsx      # Lecture IA narrative (API Anthropic)
│   ├── KarmaTab.tsx        # Inclusion + Leçons + Passions + Pinnacles
│   └── ui.tsx              # Composants partagés (Orb, Sec, Cd)
├── styles/
│   └── global.css
├── App.tsx
└── main.tsx
```

## Features restaurées (vs artifact)

- ✅ Planètes (10 positions détaillées)
- ✅ Barres Éléments (Feu/Terre/Air/Eau)
- ✅ Lo Shu Grid (plans + driver/conductor)
- ✅ Passions Cachées
- ✅ Pinnacles & Challenges
- ✅ Grille compatibilités zodiac chinois complète
- ✅ + de villes (20+)
