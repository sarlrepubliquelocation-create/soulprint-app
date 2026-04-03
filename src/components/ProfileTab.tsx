import { useState, useMemo } from 'react';
import { type SoulData } from '../App';
import { P } from './ui';
import { type DayPreview } from '../engines/convergence';
import { buildProfileData, type ProfileData } from '../engines/orchestrator';
import { generateAnnualCard } from '../engines/annual-card';

import NumerologySection from './profile/NumerologySection';
import BaZiSection from './profile/BaZiSection';
import AstroSpiritSection from './profile/AstroSpiritSection';
import SynthesisSection from './profile/SynthesisSection';

export default function ProfileTab({ data, bd, bt, gender = 'M', fn = '', yearPreviews = null }: { data: SoulData; bd: string; bt?: string; gender?: 'M' | 'F'; fn?: string; yearPreviews?: DayPreview[] | null }) {
  const { num, astro, cz } = data;
  const [isGenerating, setIsGenerating] = useState(false);

  const pd = useMemo(() => buildProfileData(data, bd, bt, gender, fn), [data, bd, bt, gender, fn]);

  async function handleGenerateAnnualCard() {
    if (!yearPreviews) return;
    await generateAnnualCard(
      { bd, fn, num, cz, natal: pd.natal, yearPreviews },
      () => setIsGenerating(true),
      () => setIsGenerating(false),
    );
  }

  return (
    <div>
      {/* ══ INTRO BANNER ══ */}
      <div style={{ padding: '10px 14px', marginBottom: 12, background: `${P.gold}06`, borderRadius: 10, border: `1px solid ${P.gold}18` }}>
        <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.7 }}>
          <span style={{ color: P.gold, fontWeight: 700 }}>☸ Ton ADN Kaironaute</span> — Ce profil rassemble toutes les données issues de ta naissance (numérologie, astrologie chinoise, Yi King, Tarot…). Ce sont ces éléments qui alimentent <b style={{ color: P.gold }}>chaque jour</b> le calcul de ton score de convergence dans les onglets Calendrier et Pilotage.
        </div>
      </div>

      {/* ══ SECTIONS ══ */}
      <NumerologySection pd={pd} num={num} fn={fn} />

      <BaZiSection pd={pd} cz={cz} gender={gender} num={num} />

      {pd.natal && pd.natalProf && (
        <AstroSpiritSection
          pd={pd}
          num={num}
          astro={astro}
          cz={cz}
          natal={pd.natal}
          natalProf={pd.natalProf}
          yearPreviews={yearPreviews}
          bd={bd}
          fn={fn}
          isGenerating={isGenerating}
          onGenerateCard={handleGenerateAnnualCard}
        />
      )}

      <SynthesisSection pd={pd} num={num} astro={astro} cz={cz} natal={pd.natal} natalProf={pd.natalProf} />
    </div>
  );
}
