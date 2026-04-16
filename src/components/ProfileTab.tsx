import { useState, useMemo } from 'react';
import { type SoulData } from '../App';
import { P } from './ui';
import { type DayPreview } from '../engines/convergence';
import { buildProfileData, type ProfileData } from '../engines/orchestrator';
import { generateAnnualCard } from '../engines/annual-card';
// R34 — couche affichage planète × tranche d'âge
import { getLifeBracketFromBd, type LifeMode } from '../engines/life-stages';

import NumerologySection from './profile/NumerologySection';
import BaZiSection from './profile/BaZiSection';
import AstroSpiritSection from './profile/AstroSpiritSection';
import SynthesisSection from './profile/SynthesisSection';

export default function ProfileTab({
  data, bd, bt, gender = 'M', fn = '', yearPreviews = null,
  lifeMode = null, onLifeModeChange,
}: {
  data: SoulData; bd: string; bt?: string; gender?: 'M' | 'F'; fn?: string;
  yearPreviews?: DayPreview[] | null;
  lifeMode?: LifeMode;                          // R34 — toggle bi-actif (59+)
  onLifeModeChange?: (mode: LifeMode) => void;  // R34 — callback persistance
}) {
  const { num, astro, cz } = data;
  const [isGenerating, setIsGenerating] = useState(false);
  // R34 — tranche d'âge (toggle visible uniquement à 59+)
  const _bracket = useMemo(() => getLifeBracketFromBd(bd), [bd]);

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

      {/* R34 — Toggle Phase de vie (visible uniquement pour bracket 59+) */}
      {_bracket === '59+' && onLifeModeChange && (
        <div style={{ padding: '12px 14px', marginBottom: 12, background: P.bg, borderRadius: 10, border: `1px solid ${P.textDim}20` }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: P.text, marginBottom: 6 }}>
            🌿 Phase de vie
          </div>
          <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.6, marginBottom: 10 }}>
            Tu es {gender === 'F' ? 'entrée' : 'entré'} dans la phase de Transmission. Comment vis-tu cette période ?
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={() => onLifeModeChange(null)}
              style={{
                padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: lifeMode === null ? `1px solid ${P.gold}` : `1px solid ${P.textDim}30`,
                background: lifeMode === null ? `${P.gold}18` : 'transparent',
                color: lifeMode === null ? P.gold : P.textMid,
                fontFamily: 'inherit', transition: 'all 0.2s ease',
              }}
              aria-pressed={lifeMode === null}
              aria-label="Mode Transmission : focus sur la transmission, l'héritage et la vie intérieure"
            >
              Transmission (par défaut)
            </button>
            <button
              onClick={() => onLifeModeChange('still_active')}
              style={{
                padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: lifeMode === 'still_active' ? `1px solid ${P.gold}` : `1px solid ${P.textDim}30`,
                background: lifeMode === 'still_active' ? `${P.gold}18` : 'transparent',
                color: lifeMode === 'still_active' ? P.gold : P.textMid,
                fontFamily: 'inherit', transition: 'all 0.2s ease',
              }}
              aria-pressed={lifeMode === 'still_active'}
              aria-label="Mode Toujours en activité : tu pilotes encore des projets professionnels"
            >
              Toujours en activité
            </button>
          </div>
          <div style={{ fontSize: 11, color: P.textDim, marginTop: 8, fontStyle: 'italic' }}>
            {lifeMode === 'still_active'
              ? 'Le domaine "Affaires" reste affiché tel quel.'
              : 'Le domaine "Affaires" devient "Réalisations" — l\'accent passe sur ce que tu accomplis et transmets.'}
          </div>
        </div>
      )}

      {/* ══ SECTIONS ══ */}
      <NumerologySection pd={pd} num={num} fn={fn} gender={gender} />

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
