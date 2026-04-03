// ══════════════════════════════════════
// ═══ FIREBASE — Initialisation V8 ═══
// À placer dans src/firebase.ts
// ══════════════════════════════════════
//
// SETUP :
//   1. npm install firebase
//   2. Créer un projet Firebase (console.firebase.google.com)
//   3. Activer Firestore (mode test pendant développement)
//   4. Remplacer les valeurs VITE_FIREBASE_* dans .env.local
//
// .env.local (ne jamais committer) :
//   VITE_FIREBASE_API_KEY=...
//   VITE_FIREBASE_AUTH_DOMAIN=...
//   VITE_FIREBASE_PROJECT_ID=...
//   VITE_FIREBASE_APP_ID=...
//
// Règles Firestore (mode développement — à restreindre en prod) :
//   rules_version = '2';
//   service cloud.firestore {
//     match /databases/{database}/documents {
//       match /users/{uid}/{document=**} {
//         allow read, write: if true; // ← restreindre en prod
//       }
//     }
//   }

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence, type Firestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { sto } from './engines/storage';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

// Évite double-initialisation en HMR (Vite hot reload)
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

export const db: Firestore = getFirestore(app);
export const auth: Auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Persistence offline (PWA — ne rate aucune donnée si l'utilisateur est hors ligne)
enableIndexedDbPersistence(db).catch(err => {
  if (err.code === 'failed-precondition') {
    // Plusieurs onglets ouverts — persistence disponible dans un seul onglet
    console.warn('[Firebase] Persistence multi-onglet non supportée');
  } else if (err.code === 'unimplemented') {
    // Navigateur non compatible
    console.warn('[Firebase] Persistence offline non supportée sur ce navigateur');
  }
});

// ══════════════════════════════════════
// ═══ USER ID ANONYME ═══
// Pas de Firebase Auth — UUID local persisté en localStorage.
// Stable pour l'utilisateur sur l'appareil, sans login.
// ══════════════════════════════════════

const UID_KEY = 'kaironaute_uid';

export function getAnonymousUid(): string {
  let uid = sto.getRaw(UID_KEY);
  if (!uid) {
    uid = crypto.randomUUID();
    sto.set(UID_KEY, uid);
  }
  return uid;
}

// Remplacement de getAnonymousUid — utilise l'uid Firebase Auth si connecté, sinon UUID local
export function getCurrentUid(): string {
  const user = auth.currentUser;
  if (user) return user.uid;
  return getAnonymousUid();
}
