// ═══ NOTIFICATIONS — Hook pour permissions + notification quotidienne ═══
// Couche 1 : Notification locale quand l'app s'ouvre (score du jour)
// Couche 2 : Infrastructure prête pour push serveur (FCM token stocké)

import { useState, useEffect, useCallback } from 'react';
import { sto } from '../engines/storage';
import { COSMIC_THRESHOLD } from '../engines/convergence';

const PERM_KEY = 'kaironaute_notif_perm'; // 'granted' | 'denied' | 'dismissed'
const LAST_NOTIF_KEY = 'kaironaute_last_notif_date';
const MUTED_KEY = 'kaironaute_notif_muted'; // '1' = muted

export type NotifPermission = 'default' | 'granted' | 'denied' | 'unsupported';

interface UseNotificationsResult {
  permission: NotifPermission;
  /** true si on doit afficher la bannière de demande */
  showBanner: boolean;
  /** true si les notifications sont activées et non mutées */
  enabled: boolean;
  /** Demander la permission au navigateur */
  requestPermission: () => Promise<void>;
  /** L'utilisateur a fermé la bannière sans répondre */
  dismissBanner: () => void;
  /** Activer/désactiver les notifications (toggle) */
  toggleNotifications: () => void;
  /** Envoyer une notification locale avec le score du jour */
  notifyDailyScore: (score: number, dayType: string, hint: string) => void;
}

export function useNotifications(): UseNotificationsResult {
  const [permission, setPermission] = useState<NotifPermission>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission as NotifPermission;
  });

  const [showBanner, setShowBanner] = useState(false);
  const [muted, setMuted] = useState(() => sto.getRaw(MUTED_KEY) === '1');

  // Afficher la bannière si : notifications supportées + pas encore décidé + pas dismissed récemment
  useEffect(() => {
    if (permission === 'unsupported' || permission === 'granted' || permission === 'denied') {
      setShowBanner(false);
      return;
    }
    // Vérifier si l'utilisateur a déjà dismissé
    const dismissed = sto.getRaw(PERM_KEY);
    if (dismissed === 'dismissed') {
      // Re-montrer après 7 jours
      const dismissedAt = sto.getRaw(PERM_KEY + '_at');
      if (dismissedAt) {
        const daysSince = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
        if (daysSince < 7) {
          setShowBanner(false);
          return;
        }
      }
    }
    // Montrer la bannière après un délai (pas immédiatement au chargement)
    const timer = setTimeout(() => setShowBanner(true), 5000);
    return () => clearTimeout(timer);
  }, [permission]);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return;
    try {
      const result = await Notification.requestPermission();
      setPermission(result as NotifPermission);
      sto.set(PERM_KEY, result);
      setShowBanner(false);
    } catch {
      setPermission('denied');
    }
  }, []);

  const dismissBanner = useCallback(() => {
    setShowBanner(false);
    sto.set(PERM_KEY, 'dismissed');
    sto.set(PERM_KEY + '_at', Date.now().toString());
  }, []);

  const toggleNotifications = useCallback(() => {
    setMuted(prev => {
      const next = !prev;
      sto.set(MUTED_KEY, next ? '1' : '');
      return next;
    });
  }, []);

  const enabled = permission === 'granted' && !muted;

  const notifyDailyScore = useCallback((score: number, dayType: string, hint: string) => {
    if (permission !== 'granted' || muted) return;

    // Ne notifier qu'une fois par jour
    const today = new Date().toISOString().slice(0, 10);
    const lastNotif = sto.getRaw(LAST_NOTIF_KEY);
    if (lastNotif === today) return;
    sto.set(LAST_NOTIF_KEY, today);

    // Construire le message
    const emoji = score >= COSMIC_THRESHOLD ? '🌟' : score >= 80 ? '✨' : score >= 65 ? '👍' : '📊';
    const title = `${emoji} Score du jour : ${score}/100`;
    const body = `${dayType} — ${hint}`;

    // Essayer via Service Worker (persiste même si l'onglet se ferme)
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.ready.then(reg => {
        reg.showNotification(title, {
          body,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: 'daily-score', // remplace la notif précédente
          data: { url: '/' },
        } as NotificationOptions);
      }).catch(() => {
        // Fallback : notification classique
        new Notification(title, { body, icon: '/icon-192.png' });
      });
    } else {
      new Notification(title, { body, icon: '/icon-192.png' });
    }
  }, [permission]);

  return { permission, showBanner, enabled, requestPermission, dismissBanner, toggleNotifications, notifyDailyScore };
}
