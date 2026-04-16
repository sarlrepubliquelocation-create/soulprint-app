// ═══ LIFE STAGE MODAL — Phase 6 (Ronde #34) ═══
// Pop-up bascule à 59 ans : invite l'utilisateur à choisir son lifeMode
// Storage : localStorage 'kaironaute_lifestage_seen_<bd>' → jamais re-montré (par profil)
// Toggle reste dispo dans ProfileTab pour changer ultérieurement.
import { sto } from '../engines/storage';
import { P } from './ui';
import type { LifeMode } from '../engines/life-stages';

const LS_KEY_PREFIX = 'kaironaute_lifestage_seen_';

export function isLifeStageSeen(bd: string): boolean {
  try { return !!sto.getRaw(LS_KEY_PREFIX + bd); } catch { return false; }
}

export function markLifeStageSeen(bd: string): void {
  try { sto.set(LS_KEY_PREFIX + bd, '1'); } catch { /* silent */ }
}

interface Props {
  bd: string;
  gn?: 'M' | 'F';
  onChoose: (mode: LifeMode) => void;  // null | 'still_active'
  onLater: () => void;                  // user dismisses without choosing
}

export default function LifeStageModal({ bd, gn, onChoose, onLater }: Props) {
  const handleChoose = (mode: LifeMode) => {
    markLifeStageSeen(bd);
    onChoose(mode);
  };
  const handleLater = () => {
    markLifeStageSeen(bd);
    onLater();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lifestage-title"
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 16,
      }}
    >
      <div style={{
        maxWidth: 480, width: '100%', background: P.bg,
        border: `1px solid ${P.gold}40`, borderRadius: 16, padding: 24,
      }}>
        <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 12 }}>🌿</div>
        <h2 id="lifestage-title" style={{
          fontSize: 18, fontWeight: 700, color: P.gold, textAlign: 'center',
          margin: '0 0 12px 0',
        }}>
          Tu es {gn === 'F' ? 'entrée' : 'entré'} dans la phase de Transmission
        </h2>
        <p style={{ fontSize: 13, color: P.textMid, lineHeight: 1.7, textAlign: 'center', margin: '0 0 20px 0' }}>
          À partir de 59 ans, l'astrologie reconnaît une nouvelle saison : celle où l'accent passe
          de la conquête à la transmission, de l'extérieur à l'intériorité.
          <br /><br />
          Comment vis-tu cette période ?
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
          <button
            onClick={() => handleChoose(null)}
            style={{
              padding: '12px 16px', borderRadius: 10, fontSize: 14, fontWeight: 600,
              cursor: 'pointer', border: `1px solid ${P.gold}66`,
              background: `${P.gold}12`, color: P.gold,
              fontFamily: 'inherit', textAlign: 'left',
            }}
            aria-label="Choisir le mode Transmission"
          >
            🌾 Transmission <span style={{ fontWeight: 400, color: P.textMid, fontSize: 12 }}>— focus sur ce que je transmets et ce que je vis intérieurement</span>
          </button>
          <button
            onClick={() => handleChoose('still_active')}
            style={{
              padding: '12px 16px', borderRadius: 10, fontSize: 14, fontWeight: 600,
              cursor: 'pointer', border: `1px solid ${P.textDim}40`,
              background: 'transparent', color: P.text,
              fontFamily: 'inherit', textAlign: 'left',
            }}
            aria-label="Choisir le mode Toujours en activité"
          >
            💼 Toujours en activité <span style={{ fontWeight: 400, color: P.textMid, fontSize: 12 }}>— je pilote encore des projets professionnels</span>
          </button>
        </div>
        <button
          onClick={handleLater}
          style={{
            width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 12,
            cursor: 'pointer', border: 'none', background: 'transparent',
            color: P.textDim, fontFamily: 'inherit',
          }}
          aria-label="Décider plus tard"
        >
          Plus tard (je le réglerai dans Profil)
        </button>
        <p style={{ fontSize: 11, color: P.textDim, textAlign: 'center', marginTop: 12, fontStyle: 'italic' }}>
          Tu pourras toujours changer ce choix dans l'onglet Profil.
        </p>
      </div>
    </div>
  );
}
