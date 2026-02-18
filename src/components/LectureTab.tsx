import { type SoulData } from '../App';
import { Sec, Cd } from './ui';

interface Props {
  data: SoulData;
  narr: string;
  narrLoad: boolean;
  genNarr: () => void;
}

export default function LectureTab({ data, narr, narrLoad, genNarr }: Props) {
  return (
    <div>
      <Sec icon="🔮" title="Lecture IA Narrative">
        <Cd>
          {!narr && !narrLoad && (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <div style={{ fontSize: 12, color: '#5a5270', marginBottom: 14 }}>
                L'IA croise tes 5 systèmes pour une lecture unique.
              </div>
              <button onClick={genNarr} style={{
                padding: '12px 32px', background: 'linear-gradient(135deg,#9370DB,#FF69B4)',
                border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700,
                cursor: 'pointer', letterSpacing: 1, fontFamily: 'inherit',
                boxShadow: '0 4px 16px #9370DB44'
              }}>
                ✦ Générer ma Lecture
              </button>
            </div>
          )}
          {narrLoad && (
            <div style={{ textAlign: 'center', padding: 32 }}>
              <div style={{ fontSize: 28, animation: 'pulse 1.5s infinite' }}>🔮</div>
              <div style={{ fontSize: 11, color: '#9370DB', marginTop: 8 }}>L'oracle consulte les astres...</div>
            </div>
          )}
          {narr && (
            <div style={{ fontSize: 13, color: '#d0c8e4', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
              {narr}
            </div>
          )}
          {narr && (
            <button onClick={genNarr} style={{
              marginTop: 16, padding: '8px 20px', background: '#1e1a30',
              border: '1px solid #3a3060', borderRadius: 8, color: '#9370DB',
              fontSize: 11, cursor: 'pointer', fontFamily: 'inherit'
            }}>
              ↻ Regénérer
            </button>
          )}
        </Cd>
      </Sec>
    </div>
  );
}
