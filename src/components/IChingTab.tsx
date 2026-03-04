import { useState, useEffect } from 'react';
import { type SoulData } from '../App';
import { getNumberInfo } from '../engines/numerology';
import { SIGN_FR, SIGN_SYM } from '../engines/astrology';
import { TRIGRAM_NAMES, getHexProfile, calcConsciousIChing, type ConsciousIChing } from '../engines/iching';
import { Sec, Cd, P } from './ui';
import { drawConsciousTarot, loadTarotHistory, saveTarotDraw, getArcana, calcTarotDayNumber, TAROT_ONBOARDING, type TarotDraw, type TarotDrawRecord } from '../engines/tarot'; // V9 Sprint 6 — Tarot

// ── Tirage conscient : historique localStorage ──
const LS_KEY = 'kaironaute_conscious_draws';
interface DrawRecord { id: string; question: string; hexNum: number; hexName: string; keyword: string; movingCount: number; transformedHexNum?: number; transformedName?: string; }
function loadHistory(): DrawRecord[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
}
function saveHistory(rec: DrawRecord) {
  const arr = loadHistory();
  arr.unshift(rec);
  localStorage.setItem(LS_KEY, JSON.stringify(arr.slice(0, 10)));
}

export default function IChingTab({ data }: { data: SoulData }) {
  const { num, astro, cz, iching } = data;
  const prof = getHexProfile(iching.hexNum);

  // ── Toggle mode Tirage Conscient : Yi King | Tarot ──
  const [tirageMode, setTirageMode] = useState<'iching' | 'tarot'>('iching');

  // ── Tirage conscient I Ching ──
  const [phase, setPhase]         = useState<'idle' | 'throwing' | 'result'>('idle');
  const [question, setQuestion]   = useState('');
  const [conscious, setConscious] = useState<ConsciousIChing | null>(null);
  const [history, setHistory]     = useState<DrawRecord[]>([]);

  useEffect(() => { setHistory(loadHistory()); }, []);

  // ── Tirage conscient Tarot ──
  const [tarotPhase, setTarotPhase]       = useState<'idle' | 'drawing' | 'result'>('idle');
  const [tarotQuestion, setTarotQuestion] = useState('');
  const [tarotDraw, setTarotDraw]         = useState<TarotDraw | null>(null);
  const [tarotHistory, setTarotHistory]   = useState<TarotDrawRecord[]>([]);

  useEffect(() => { setTarotHistory(loadTarotHistory()); }, []);

  function handleTirer() {
    if (!question.trim() || phase === 'throwing') return;
    setPhase('throwing');
    setTimeout(() => {
      const result = calcConsciousIChing(question.trim());
      setConscious(result);
      setPhase('result');
      const rec: DrawRecord = {
        id: String(result.timestamp),
        question: result.question,
        hexNum: result.reading.hexNum,
        hexName: result.reading.name,
        keyword: result.reading.keyword,
        movingCount: result.movingLines.length,
        transformedHexNum: result.transformed?.hexNum,
        transformedName: result.transformed?.name,
      };
      saveHistory(rec);
      setHistory(loadHistory());
    }, 1600);
  }

  function handleTarotTirer() {
    if (!tarotQuestion.trim() || tarotPhase === 'drawing') return;
    setTarotPhase('drawing');
    setTimeout(() => {
      const result = drawConsciousTarot(tarotQuestion.trim());
      setTarotDraw(result);
      setTarotPhase('result');
      const rec: TarotDrawRecord = {
        id: String(result.timestamp),
        question: result.question,
        arcanaNum: result.arcana.num,
        arcanaName: result.arcana.name_fr,
        isReversed: result.isReversed,
      };
      saveTarotDraw(rec);
      setTarotHistory(loadTarotHistory());
    }, 1600);
  }

  // Arcane du jour (déterministe)
  const todayStr = new Date().toISOString().slice(0, 10);
  const arcaneJour = getArcana(calcTarotDayNumber(todayStr));

  function renderLines(lines: number[], movingLines: number[]) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center' }}>
        {[...lines].reverse().map((l, ri) => {
          const lineIdx = 5 - ri;
          const isMoving = movingLines.includes(lineIdx);
          const color = isMoving ? P.gold : P.gold + '88';
          return (
            <div key={ri} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {l === 1
                ? <div style={{ width: 64, height: 7, background: color, borderRadius: 3, boxShadow: isMoving ? `0 0 10px ${P.goldGlow}` : 'none' }} />
                : <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ width: 26, height: 7, background: color, borderRadius: 3 }} />
                    <div style={{ width: 26, height: 7, background: color, borderRadius: 3 }} />
                  </div>
              }
              {isMoving && <span style={{ fontSize: 9, color: P.gold }}>◀ mobile</span>}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      <Sec icon="☰" title={`Hexagramme ${iching.hexNum} — ${iching.name}`}>
        <Cd>
          <div style={{ fontSize: 12, color: P.textDim, lineHeight: 1.7, marginBottom: 16, fontStyle: 'italic' }}>
            Le Yi King (易經) est le plus ancien oracle connu — plus de 3000 ans de sagesse stratégique. Chaque jour, un hexagramme se forme au croisement de votre date de naissance et de l'énergie du moment. Ce n'est pas une prédiction, c'est une lecture des forces en jeu.
          </div>

          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            {/* Hexagram lines */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'center' }}>
              {[...iching.lines].reverse().map((l, i) => {
                const lineIdx = 5 - i;
                const isChanging = lineIdx === iching.changing;
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {l === 1
                      ? <div style={{ width: 64, height: 7, background: isChanging ? P.gold : P.gold + '88', borderRadius: 3, boxShadow: isChanging ? `0 0 10px ${P.goldGlow}` : 'none' }} />
                      : <div style={{ display: 'flex', gap: 10 }}>
                          <div style={{ width: 26, height: 7, background: isChanging ? P.gold : P.gold + '88', borderRadius: 3 }} />
                          <div style={{ width: 26, height: 7, background: isChanging ? P.gold : P.gold + '88', borderRadius: 3 }} />
                        </div>
                    }
                    {isChanging && <span style={{ fontSize: 9, color: P.gold }}>◀</span>}
                  </div>
                );
              })}
              <div style={{ fontSize: 10, color: P.textDim, marginTop: 6 }}>
                {TRIGRAM_NAMES[iching.upper]} / {TRIGRAM_NAMES[iching.lower]}
              </div>
            </div>

            {/* Details */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: P.text }}>{iching.name}</div>
              <div style={{ fontSize: 15, color: P.gold, fontWeight: 600, marginTop: 4 }}>→ {iching.keyword}</div>
              <div style={{ marginTop: 10, fontSize: 13, color: P.textMid, lineHeight: 1.8 }}>
                {iching.desc}
              </div>
              <div style={{ marginTop: 12, fontSize: 13, color: P.textMid, lineHeight: 1.7 }}>
                Trigramme intérieur : <b style={{ color: P.gold }}>{TRIGRAM_NAMES[iching.lower]}</b> (ton énergie profonde)<br />
                Trigramme extérieur : <b style={{ color: P.blue }}>{TRIGRAM_NAMES[iching.upper]}</b> (l'énergie du jour)<br />
                Ligne mutante : <b style={{ color: P.gold }}>{iching.changing + 1}</b>/6 (point de transformation)
              </div>
            </div>
          </div>

          {/* Wisdom - Yi King traditionnel */}
          <div style={{ marginTop: 18, padding: '14px 16px', background: `${P.gold}06`, borderRadius: 10, border: `1px solid ${P.gold}12`, borderLeft: `3px solid ${P.gold}44` }}>
            <div style={{ fontSize: 10, color: P.gold, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700, marginBottom: 8 }}>☰ Sagesse du Yi King</div>
            <div style={{ fontSize: 13, color: P.textMid, lineHeight: 1.8, fontStyle: 'italic' }}>
              « {prof.wisdom} »
            </div>
          </div>

          {/* Strategic profile */}
          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            <div style={{ padding: '8px 10px', background: `${P.green}0a`, borderRadius: 6, border: `1px solid ${P.green}18` }}>
              <div style={{ fontSize: 9, color: P.green, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>✦ Opportunité</div>
              <div style={{ fontSize: 12, color: P.green, marginTop: 3, lineHeight: 1.5 }}>{prof.opportunity}</div>
            </div>
            <div style={{ padding: '8px 10px', background: `${P.red}0a`, borderRadius: 6, border: `1px solid ${P.red}18` }}>
              <div style={{ fontSize: 9, color: P.red, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>⚡ Risque</div>
              <div style={{ fontSize: 12, color: P.red, marginTop: 3, lineHeight: 1.5 }}>{prof.risk}</div>
            </div>
          </div>

          {/* Action */}
          <div style={{ marginTop: 8, padding: '8px 12px', background: `${P.gold}0a`, borderRadius: 6, border: `1px solid ${P.gold}18` }}>
            <div style={{ fontSize: 9, color: P.gold, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>☰ Action stratégique du jour</div>
            <div style={{ fontSize: 12, color: P.gold, lineHeight: 1.6 }}>{prof.action}</div>
          </div>

          {/* Convergence box */}
          <div style={{ marginTop: 18, padding: 14, background: `${P.gold}08`, borderRadius: 10, border: `1px solid ${P.gold}18` }}>
            <div style={{ fontSize: 11, color: P.gold, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700, marginBottom: 6 }}>✦ Convergence du jour</div>
            <div style={{ fontSize: 11, color: P.textDim, lineHeight: 1.6, marginBottom: 10, fontStyle: 'italic' }}>
              Croisement des 4 systèmes actifs aujourd'hui — plus ils convergent, plus l'énergie est forte.
            </div>
            <div style={{ fontSize: 13, color: P.textMid, lineHeight: 1.8 }}>
              Jour Personnel <b style={{ color: getNumberInfo(num.ppd.v).c }}>{num.ppd.v}</b> ({getNumberInfo(num.ppd.v).k})
              {' + '}Hexagramme <b style={{ color: P.gold }}>{iching.hexNum}</b> ({iching.name})
              {astro && <>{' + '}{SIGN_SYM[astro.b3.sun]} {SIGN_FR[astro.b3.sun]}</>}
              {' + '}{cz.sym} {cz.animal}
            </div>
          </div>
        </Cd>
      </Sec>

      {/* ══════════════════════════════════════════════ */}
      {/* ══  TIRAGE CONSCIENT — V9 Sprint 4 + 6    ══ */}
      {/* ══════════════════════════════════════════════ */}
      <Sec icon="🎯" title={tirageMode === 'iching' ? 'Tirage Conscient — Yi King' : 'Tirage Conscient — Tarot'}>
        <Cd>
          {/* ── Toggle Yi King / Tarot ── */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderRadius: 8, overflow: 'hidden', border: `1px solid ${P.cardBdr}`, width: 'fit-content' }}>
            {(['iching', 'tarot'] as const).map(m => (
              <button key={m} onClick={() => setTirageMode(m)} style={{
                padding: '7px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                background: tirageMode === m ? `${P.gold}18` : P.surface,
                color: tirageMode === m ? P.gold : P.textDim,
                border: 'none', borderRight: m === 'iching' ? `1px solid ${P.cardBdr}` : 'none',
                transition: 'all 0.2s', fontFamily: 'inherit',
              }}>
                {m === 'iching' ? '☰ Yi King' : '🃏 Tarot'}
              </button>
            ))}
          </div>

          {/* ══ Mode I CHING ══ */}
          {tirageMode === 'iching' && (
          <div>
          <div style={{ fontSize: 12, color: P.textDim, lineHeight: 1.7, marginBottom: 14, fontStyle: 'italic' }}>
            Posez une intention précise. L'entropie cryptographique du moment génère un tirage unique — chaque consultation est différente, même avec la même question.
          </div>

          {/* ── Zone de saisie (visible sauf en mode résultat) ── */}
          {phase !== 'result' && (
            <>
              <textarea
                value={question}
                onChange={e => setQuestion(e.target.value)}
                placeholder="Ex: Dois-je lancer ce projet maintenant ? Que révèle cette rencontre ?"
                maxLength={200} rows={2}
                style={{ width: '100%', background: P.surface, border: `1px solid ${P.cardBdr}`, borderRadius: 8, padding: '10px 12px', color: P.text, fontSize: 12, resize: 'none', lineHeight: 1.6, boxSizing: 'border-box' }}
              />
              <div style={{ fontSize: 10, color: P.textDim, textAlign: 'right', marginTop: 3 }}>{question.length}/200</div>
              <button
                onClick={handleTirer}
                disabled={!question.trim() || phase === 'throwing'}
                style={{ marginTop: 10, width: '100%', padding: 12, background: question.trim() ? `${P.gold}15` : P.surface, border: `1px solid ${question.trim() ? P.gold + '44' : P.cardBdr}`, borderRadius: 8, color: question.trim() ? P.gold : P.textDim, fontSize: 13, fontWeight: 700, cursor: question.trim() && phase !== 'throwing' ? 'pointer' : 'not-allowed', letterSpacing: 1, transition: 'all 0.2s' }}
              >
                {phase === 'throwing' ? '☰  Lancer les pièces…' : '☰  Tirer les 3 pièces × 6 lignes'}
              </button>
            </>
          )}

          {/* ── Résultat ── */}
          {phase === 'result' && conscious && (() => {
            const prof2   = getHexProfile(conscious.reading.hexNum);
            const profT   = conscious.transformed ? getHexProfile(conscious.transformed.hexNum) : null;
            const hasMove = conscious.movingLines.length > 0;
            // Labels des valeurs de tirage
            const throwLabel: Record<number, string> = { 6: 'yin⊙', 7: 'yang—', 8: 'yin—', 9: 'yang⊗' };
            const throwColor: Record<number, string> = { 6: P.gold, 7: P.text, 8: P.textDim, 9: P.gold };
            return (
              <div>
                {/* Question */}
                <div style={{ marginBottom: 14, padding: '8px 12px', background: `${P.gold}08`, borderRadius: 8, border: `1px solid ${P.gold}18` }}>
                  <div style={{ fontSize: 10, color: P.gold, fontWeight: 700, marginBottom: 4 }}>✦ Votre question</div>
                  <div style={{ fontSize: 12, color: P.textMid, fontStyle: 'italic' }}>« {conscious.question} »</div>
                </div>

                {/* Hexagramme principal */}
                <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 14 }}>
                  {renderLines(conscious.reading.lines, conscious.movingLines)}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: P.textDim, marginBottom: 4 }}>Hexagramme {conscious.reading.hexNum}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: P.text }}>{conscious.reading.name}</div>
                    <div style={{ fontSize: 14, color: P.gold, fontWeight: 600, marginTop: 3 }}>→ {conscious.reading.keyword}</div>
                    {hasMove && <div style={{ fontSize: 10, color: P.gold, marginTop: 4 }}>⬤ {conscious.movingLines.length} ligne{conscious.movingLines.length > 1 ? 's' : ''} mobile{conscious.movingLines.length > 1 ? 's' : ''} (L{conscious.movingLines.map(i => i + 1).join(', L')})</div>}
                  </div>
                </div>

                {/* Valeurs des lancers */}
                <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 14 }}>
                  {conscious.throws.map((t, i) => (
                    <div key={i} style={{ textAlign: 'center', padding: '4px 6px', borderRadius: 6, background: (t === 6 || t === 9) ? `${P.gold}0f` : P.surface, border: `1px solid ${(t === 6 || t === 9) ? P.gold + '33' : P.cardBdr}` }}>
                      <div style={{ fontSize: 8, color: P.textDim }}>L{i + 1}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: throwColor[t] }}>{throwLabel[t]}</div>
                      <div style={{ fontSize: 8, color: throwColor[t], opacity: 0.7 }}>{t}</div>
                    </div>
                  ))}
                </div>

                {/* Conseil */}
                <div style={{ marginBottom: 14, padding: '10px 12px', background: `${P.gold}06`, borderRadius: 8, border: `1px solid ${P.gold}12`, borderLeft: `3px solid ${P.gold}44` }}>
                  <div style={{ fontSize: 10, color: P.gold, fontWeight: 700, marginBottom: 6 }}>☰ Conseil de l'hexagramme</div>
                  <div style={{ fontSize: 12, color: P.textMid, lineHeight: 1.7 }}>{prof2.action}</div>
                </div>

                {/* Hexagramme transformé */}
                {conscious.transformed && profT && (
                  <div style={{ marginBottom: 14, padding: 12, background: '#60a5fa08', borderRadius: 8, border: '1px solid #60a5fa20' }}>
                    <div style={{ fontSize: 10, color: '#60a5fa', fontWeight: 700, marginBottom: 8 }}>↗ Se transforme en — devenir</div>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      {renderLines(conscious.transformed.lines, [])}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, color: P.textDim }}>Hexagramme {conscious.transformed.hexNum}</div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: P.text, marginTop: 2 }}>{conscious.transformed.name}</div>
                        <div style={{ fontSize: 13, color: '#60a5fa', fontWeight: 600, marginTop: 2 }}>→ {conscious.transformed.keyword}</div>
                        <div style={{ fontSize: 11, color: P.textDim, marginTop: 6, lineHeight: 1.6 }}>{profT.action}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bouton nouveau tirage */}
                <button
                  onClick={() => { setPhase('idle'); setConscious(null); setQuestion(''); }}
                  style={{ width: '100%', padding: '10px', background: P.surface, border: `1px solid ${P.cardBdr}`, borderRadius: 8, color: P.textMid, fontSize: 12, cursor: 'pointer', marginBottom: 4 }}
                >
                  ↩ Nouveau tirage
                </button>
              </div>
            );
          })()}

          {/* ── Historique des 5 derniers tirages ── */}
          {history.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: 10, color: P.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Tirages précédents</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {history.slice(0, 5).map(h => (
                  <div key={h.id} style={{ padding: '8px 12px', borderRadius: 8, background: P.surface, border: `1px solid ${P.cardBdr}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontSize: 11, color: P.gold, fontWeight: 700, minWidth: 28 }}>#{h.hexNum}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: P.textMid, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>« {h.question} »</div>
                      <div style={{ fontSize: 10, color: P.textDim, marginTop: 2 }}>
                        {h.hexName} → {h.keyword}
                        {h.transformedHexNum && <span style={{ color: '#60a5fa' }}> ↗ {h.transformedName}</span>}
                      </div>
                    </div>
                    {h.movingCount > 0 && <div style={{ fontSize: 9, color: P.gold }}>⬤{h.movingCount}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>
          )}

          {/* ══ Mode TAROT ══ */}
          {tirageMode === 'tarot' && (
          <div>
            {/* Arcane du jour (déterministe) */}
            <div style={{ marginBottom: 16, padding: '12px 14px', background: `${P.gold}0a`, borderRadius: 10, border: `1px solid ${P.gold}20` }}>
              <div style={{ fontSize: 10, color: P.gold, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700, marginBottom: 8 }}>🃏 Arcane du Jour</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 72, background: `${P.gold}15`, borderRadius: 6, border: `2px solid ${P.gold}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 22 }}>🃏</span>
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: P.text }}>{arcaneJour.name_fr}</div>
                  <div style={{ fontSize: 11, color: P.gold, fontWeight: 600, marginTop: 2 }}>Arcane {arcaneJour.num} · {arcaneJour.theme}</div>
                  <div style={{ fontSize: 11, color: P.textMid, marginTop: 4, lineHeight: 1.5 }}>✦ {arcaneJour.light}</div>
                </div>
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: P.textMid, lineHeight: 1.7, fontStyle: 'italic', padding: '8px 10px', background: `${P.gold}06`, borderRadius: 8, borderLeft: `2px solid ${P.gold}44` }}>
                {arcaneJour.narrative}
              </div>
            </div>

            {/* Onboarding */}
            <div style={{ fontSize: 11, color: P.textDim, lineHeight: 1.7, marginBottom: 14, fontStyle: 'italic', padding: '8px 10px', background: P.surface, borderRadius: 8, border: `1px solid ${P.cardBdr}` }}>
              {TAROT_ONBOARDING}
            </div>

            {/* Zone de saisie */}
            {tarotPhase !== 'result' && (
              <>
                <textarea
                  value={tarotQuestion}
                  onChange={e => setTarotQuestion(e.target.value)}
                  placeholder="Ex: Quel regard porter sur cette situation ? Qu'est-ce que mon inconscient met en avant ?"
                  maxLength={200} rows={2}
                  style={{ width: '100%', background: P.surface, border: `1px solid ${P.cardBdr}`, borderRadius: 8, padding: '10px 12px', color: P.text, fontSize: 12, resize: 'none', lineHeight: 1.6, boxSizing: 'border-box' }}
                />
                <div style={{ fontSize: 10, color: P.textDim, textAlign: 'right', marginTop: 3 }}>{tarotQuestion.length}/200</div>
                <button
                  onClick={handleTarotTirer}
                  disabled={!tarotQuestion.trim() || tarotPhase === 'drawing'}
                  style={{ marginTop: 10, width: '100%', padding: 12, background: tarotQuestion.trim() ? `${P.gold}15` : P.surface, border: `1px solid ${tarotQuestion.trim() ? P.gold + '44' : P.cardBdr}`, borderRadius: 8, color: tarotQuestion.trim() ? P.gold : P.textDim, fontSize: 13, fontWeight: 700, cursor: tarotQuestion.trim() && tarotPhase !== 'drawing' ? 'pointer' : 'not-allowed', letterSpacing: 1, transition: 'all 0.2s', fontFamily: 'inherit' }}
                >
                  {tarotPhase === 'drawing' ? '🃏  Tirage en cours…' : '🃏  Tirer un Arcane Majeur'}
                </button>
              </>
            )}

            {/* Résultat tirage Tarot */}
            {tarotPhase === 'result' && tarotDraw && (
              <div>
                {/* Question */}
                <div style={{ marginBottom: 14, padding: '8px 12px', background: `${P.gold}08`, borderRadius: 8, border: `1px solid ${P.gold}18` }}>
                  <div style={{ fontSize: 10, color: P.gold, fontWeight: 700, marginBottom: 4 }}>🃏 Votre question</div>
                  <div style={{ fontSize: 12, color: P.textMid, fontStyle: 'italic' }}>« {tarotDraw.question} »</div>
                </div>

                {/* Carte tirée */}
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 14 }}>
                  <div style={{
                    width: 52, height: 86, background: `${P.gold}15`, borderRadius: 8,
                    border: `2px solid ${P.gold}55`, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexShrink: 0, flexDirection: 'column',
                    transform: tarotDraw.isReversed ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.3s',
                  }}>
                    <span style={{ fontSize: 28 }}>🃏</span>
                    <span style={{ fontSize: 9, color: P.gold, fontWeight: 700 }}>{tarotDraw.arcana.num}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: P.textDim }}>Arcane {tarotDraw.arcana.num}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: P.text }}>{tarotDraw.arcana.name_fr}</div>
                    <div style={{ fontSize: 12, color: P.gold, fontWeight: 600, marginTop: 3 }}>{tarotDraw.arcana.theme}</div>
                    {tarotDraw.isReversed && (
                      <div style={{ fontSize: 10, color: '#ef4444', marginTop: 4, padding: '2px 8px', background: '#ef444415', borderRadius: 10, display: 'inline-block' }}>
                        ↕ Renversé
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: P.textMid, marginTop: 6, lineHeight: 1.5 }}>
                      {tarotDraw.isReversed
                        ? <span>⚠ <b style={{ color: '#f87171' }}>Ombre :</b> {tarotDraw.arcana.shadow}</span>
                        : <span>✦ <b style={{ color: '#4ade80' }}>Lumière :</b> {tarotDraw.arcana.light}</span>
                      }
                    </div>
                  </div>
                </div>

                {/* Narration */}
                <div style={{ marginBottom: 14, padding: '10px 12px', background: `${P.gold}06`, borderRadius: 8, border: `1px solid ${P.gold}12`, borderLeft: `3px solid ${P.gold}44` }}>
                  <div style={{ fontSize: 10, color: P.gold, fontWeight: 700, marginBottom: 6 }}>🃏 Miroir du moment</div>
                  <div style={{ fontSize: 13, color: P.textMid, lineHeight: 1.8, fontStyle: 'italic' }}>
                    {tarotDraw.arcana.narrative}
                  </div>
                </div>

                {/* Bouton nouveau tirage */}
                <button
                  onClick={() => { setTarotPhase('idle'); setTarotDraw(null); setTarotQuestion(''); }}
                  style={{ width: '100%', padding: '10px', background: P.surface, border: `1px solid ${P.cardBdr}`, borderRadius: 8, color: P.textMid, fontSize: 12, cursor: 'pointer', marginBottom: 4, fontFamily: 'inherit' }}
                >
                  ↩ Nouveau tirage
                </button>
              </div>
            )}

            {/* Historique Tarot */}
            {tarotHistory.length > 0 && (
              <div style={{ marginTop: 18 }}>
                <div style={{ fontSize: 10, color: P.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Tirages précédents</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {tarotHistory.slice(0, 5).map(h => (
                    <div key={h.id} style={{ padding: '8px 12px', borderRadius: 8, background: P.surface, border: `1px solid ${P.cardBdr}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ fontSize: 13, color: P.gold, fontWeight: 700, minWidth: 24 }}>🃏</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, color: P.textMid, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>« {h.question} »</div>
                        <div style={{ fontSize: 10, color: P.textDim, marginTop: 2 }}>
                          {h.arcanaNum} — {h.arcanaName}
                          {h.isReversed && <span style={{ color: '#f87171' }}> ↕ renversé</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          )}

        </Cd>
      </Sec>
    </div>
  );
}
