import { useState, useEffect } from 'react';
import { type User } from 'firebase/auth';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

// French error message mapping
const errorMessages: Record<string, string> = {
  'auth/email-already-in-use': 'Cet email est déjà utilisé',
  'auth/weak-password': 'Le mot de passe doit avoir au moins 6 caractères',
  'auth/invalid-email': 'Email invalide',
  'auth/user-disabled': 'Ce compte a été désactivé',
  'auth/user-not-found': 'Utilisateur non trouvé',
  'auth/wrong-password': 'Mot de passe incorrect',
  'auth/too-many-requests': 'Trop de tentatives, réessaie plus tard',
  'auth/network-request-failed': 'Erreur réseau, vérifie ta connexion',
};

function getErrorMessage(code: string): string {
  return errorMessages[code] || 'Une erreur est survenue, réessaie';
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signUpEmail: (email: string, password: string) => Promise<void>;
  signInEmail: (email: string, password: string) => Promise<void>;
  signInGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

export function useAuth(): AuthContextType {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signUpEmail = async (email: string, password: string) => {
    setError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code || '';
      setError(getErrorMessage(code));
      throw err;
    }
  };

  const signInEmail = async (email: string, password: string) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code || '';
      setError(getErrorMessage(code));
      throw err;
    }
  };

  const signInGoogle = async () => {
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code || '';
      if (code !== 'auth/popup-closed-by-user') {
        setError(getErrorMessage(code));
      }
      throw err;
    }
  };

  const signOut = async () => {
    setError(null);
    try {
      await firebaseSignOut(auth);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code || '';
      setError(getErrorMessage(code));
      throw err;
    }
  };

  const resetPassword = async (email: string) => {
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code || '';
      setError(getErrorMessage(code));
      throw err;
    }
  };

  return {
    user,
    loading,
    error,
    signUpEmail,
    signInEmail,
    signInGoogle,
    signOut,
    resetPassword,
  };
}
