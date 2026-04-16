/**
 * annual-card.ts — Phase 3b : extraction de generateAnnualCard() depuis ProfileTab
 *
 * Génère un PNG 540×960 "Carte Annuelle" partageable (Instagram, WhatsApp, Telegram).
 * Canvas 2D natif — zéro dépendance externe.
 */

import { getNumberInfo, calcPersonalYear, type NumerologyProfile } from './numerology';
import { type ChineseZodiac } from './chinese-zodiac';
import { type IChingReading } from './iching';
import { type DayPreview } from './convergence';

interface AnnualCardParams {
  bd: string;
  fn: string;
  num: NumerologyProfile;
  cz: ChineseZodiac;
  natal: IChingReading;
  yearPreviews: DayPreview[];
}

export async function generateAnnualCard(
  params: AnnualCardParams,
  onStart?: () => void,
  onEnd?: () => void,
): Promise<void> {
  const { bd, fn, num, cz, natal, yearPreviews } = params;

  onStart?.();
  await new Promise(r => setTimeout(r, 60)); // laisser le DOM se rafraîchir

  try {
    const year = new Date().getFullYear();
    const MOIS = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

    // Calculer les moyennes mensuelles sur les scores soft-shifted
    const monthAvg: { month: number; avg: number }[] = [];
    for (let m = 1; m <= 12; m++) {
      const monthStr = String(m).padStart(2, '0');
      const monthDays = yearPreviews.filter(p => p.date.slice(5, 7) === monthStr);
      const avg = monthDays.length > 0
        ? Math.round(monthDays.reduce((s, p) => s + p.score, 0) / monthDays.length)
        : 50;
      monthAvg.push({ month: m, avg });
    }
    monthAvg.sort((a, b) => b.avg - a.avg);
    const top3 = monthAvg.slice(0, 3);

    // ── Canvas setup ──
    const W = 540, H = 960;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d')!;

    // ── Helper : rectangle arrondi ──
    function rr(x: number, y: number, w: number, h: number, r: number) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    const GOLD = '#C9A84C'; const GOLD_L = '#E8C97A';
    const TEXT = '#e8e8f0'; const DIM = '#777788';

    // ── Fond dégradé sombre ──
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0a0a0f'); bg.addColorStop(0.5, '#12121a'); bg.addColorStop(1, '#0d0d14');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // ── Étoiles (entropie fixe via seed simple) ──
    ctx.fillStyle = 'rgba(201,168,76,0.25)';
    const seed = bd.split('').reduce((h, c) => h * 31 + c.charCodeAt(0), 0);
    for (let i = 0; i < 70; i++) {
      const t = (seed * (i + 1) * 2654435761) >>> 0;
      const x = (t % W); const y = ((t >> 10) % H);
      const r = ((t >> 20) % 3 === 0) ? 1.5 : 0.8;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }

    ctx.textAlign = 'center';

    // ── HEADER ──
    const hGrad = ctx.createLinearGradient(0, 0, W, 0);
    hGrad.addColorStop(0, 'rgba(201,168,76,0.0)');
    hGrad.addColorStop(0.5, 'rgba(201,168,76,0.14)');
    hGrad.addColorStop(1, 'rgba(201,168,76,0.0)');
    ctx.fillStyle = hGrad; ctx.fillRect(0, 0, W, 85);

    ctx.font = 'bold 22px Georgia,serif'; ctx.fillStyle = GOLD;
    ctx.fillText('✦  KAIRONAUTE  ✦', W / 2, 46);
    ctx.font = '12px Georgia,serif'; ctx.fillStyle = DIM;
    ctx.fillText('Guide de Synchronicité Personnelle', W / 2, 66);

    ctx.strokeStyle = GOLD + '38'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(40, 82); ctx.lineTo(W - 40, 82); ctx.stroke();

    // ── Prénom + Zodiaque ──
    const nameStr = fn.trim() ? `${fn.trim()}  ·  ${cz.sym} ${cz.animal}` : `${cz.sym} ${cz.animal}`;
    ctx.font = '17px Georgia,serif'; ctx.fillStyle = TEXT;
    ctx.fillText(nameStr, W / 2, 112);

    // ── ANNÉE PERSONNELLE ──
    ctx.font = '11px Arial,sans-serif'; ctx.fillStyle = GOLD;
    ctx.fillText('ANNÉE PERSONNELLE', W / 2, 146);

    // Halo doré derrière le chiffre
    const halo = ctx.createRadialGradient(W / 2, 225, 15, W / 2, 225, 105);
    halo.addColorStop(0, 'rgba(201,168,76,0.18)'); halo.addColorStop(1, 'rgba(201,168,76,0)');
    ctx.fillStyle = halo; ctx.fillRect(W / 2 - 110, 145, 220, 165);

    ctx.font = 'bold 118px Georgia,serif'; ctx.fillStyle = GOLD_L;
    ctx.fillText(String(num.py.v), W / 2, 272);

    const pyInfo = getNumberInfo(num.py.v);
    ctx.font = 'italic 18px Georgia,serif'; ctx.fillStyle = TEXT;
    ctx.fillText(`«  ${pyInfo.k}  »`, W / 2, 310);

    ctx.strokeStyle = GOLD + '28'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(60, 330); ctx.lineTo(W - 60, 330); ctx.stroke();

    // ── TOP 3 FENÊTRES COSMIQUES ──
    ctx.font = '11px Arial,sans-serif'; ctx.fillStyle = GOLD;
    ctx.fillText(`TES FENÊTRES COSMIQUES  ${year}`, W / 2, 358);

    const BX = 80, BW = W - BX - 80, BH = 20, BY0 = 376;
    top3.forEach(({ month, avg }, i) => {
      const y = BY0 + i * 62;
      const barLen = (avg / 100) * BW;
      const alpha = i === 0 ? 'ff' : i === 1 ? 'bb' : '88';

      ctx.font = `bold 15px Georgia,serif`; ctx.fillStyle = TEXT; ctx.textAlign = 'left';
      ctx.fillText(MOIS[month], BX, y + 14);
      ctx.font = '12px Arial,sans-serif'; ctx.fillStyle = GOLD + alpha; ctx.textAlign = 'right';
      ctx.fillText(`${avg}%`, W - BX, y + 14);

      // Track
      ctx.fillStyle = 'rgba(255,255,255,0.04)'; rr(BX, y + 20, BW, BH, 4); ctx.fill();
      // Fill
      const barG = ctx.createLinearGradient(BX, 0, BX + barLen, 0);
      barG.addColorStop(0, GOLD + alpha); barG.addColorStop(1, GOLD_L + alpha);
      ctx.fillStyle = barG; rr(BX, y + 20, barLen, BH, 4); ctx.fill();

      ctx.textAlign = 'center';
    });

    const sepY = BY0 + 3 * 62 + BH + 28;
    ctx.strokeStyle = GOLD + '28'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(60, sepY); ctx.lineTo(W - 60, sepY); ctx.stroke();

    // ── HEXAGRAMME NATAL ──
    ctx.font = '11px Arial,sans-serif'; ctx.fillStyle = GOLD;
    ctx.fillText('HEXAGRAMME NATAL', W / 2, sepY + 30);
    ctx.font = 'bold 16px Georgia,serif'; ctx.fillStyle = TEXT;
    ctx.fillText(`☰  #${natal.hexNum}  —  ${natal.name}`, W / 2, sepY + 58);
    ctx.font = 'italic 14px Georgia,serif'; ctx.fillStyle = GOLD;
    ctx.fillText(`→  ${natal.keyword}`, W / 2, sepY + 82);

    // ── FOOTER ──
    const fGrad = ctx.createLinearGradient(0, H - 80, 0, H);
    fGrad.addColorStop(0, 'rgba(201,168,76,0)'); fGrad.addColorStop(1, 'rgba(201,168,76,0.09)');
    ctx.fillStyle = fGrad; ctx.fillRect(0, H - 80, W, 80);
    ctx.strokeStyle = GOLD + '28'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(40, H - 65); ctx.lineTo(W - 40, H - 65); ctx.stroke();
    ctx.font = '11px Arial,sans-serif'; ctx.fillStyle = DIM;
    ctx.fillText(`kaironaute.app  •  ${year}`, W / 2, H - 35);

    // ── EXPORT ──
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const filename = `kaironaute-${year}.png`;
      const file = new File([blob], filename, { type: 'image/png' });
      try {
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: `Ma Carte Kaironaute ${year}` });
        } else { throw new Error('fallback'); }
      } catch {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }
    }, 'image/png');

  } finally { onEnd?.(); }
}
