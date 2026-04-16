import { useCallback, useState, useEffect } from 'react';
import { doc, setDoc, getDoc, collection, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';

export const MAX_PROFILES = 5;

export interface UserProfile {
  id: string;          // auto-generated or assigned
  label: string;       // "Mon profil", "Conjoint", "Enfant 1", etc.
  fn: string;
  mn: string;
  ln: string;
  bd: string;
  bt: string;
  bp: string;
  gn: 'M' | 'F';
  tz: number;
  isMain: boolean;     // true for the primary profile
  createdAt: number;
  updatedAt: number;
  /** R34 — Toggle profil bi-actif (59+). null = défaut (label "Réalisations"). */
  lifeMode?: 'still_active' | null;
}

/**
 * Load all profiles for a user from Firestore.
 * Path: users/{uid}/profiles/{profileId}
 */
export async function loadProfiles(uid: string): Promise<UserProfile[]> {
  try {
    const profilesRef = collection(db, 'users', uid, 'profiles');
    const querySnapshot = await getDocs(profilesRef);
    const profiles: UserProfile[] = [];

    querySnapshot.forEach((docSnap) => {
      profiles.push({
        id: docSnap.id,
        ...docSnap.data(),
      } as UserProfile);
    });

    // Sort by createdAt ascending (oldest first), then by isMain (main first)
    profiles.sort((a, b) => {
      if (a.isMain) return -1;
      if (b.isMain) return 1;
      return a.createdAt - b.createdAt;
    });

    return profiles;
  } catch (err) {
    console.warn('[useProfiles] loadProfiles failed:', err);
    throw err;
  }
}

/**
 * Save or update a profile in Firestore.
 * If profile.id is not set, it will be generated.
 */
export async function saveProfile(uid: string, profile: UserProfile): Promise<string> {
  try {
    const profileId = profile.id || `profile_${Date.now()}`;
    const docRef = doc(db, 'users', uid, 'profiles', profileId);

    const profileToSave: UserProfile = {
      ...profile,
      id: profileId,
      updatedAt: Date.now(),
    };

    await setDoc(docRef, profileToSave, { merge: true });
    return profileId;
  } catch (err) {
    console.warn('[useProfiles] saveProfile failed:', err);
    throw err;
  }
}

/**
 * Delete a profile from Firestore.
 * The main profile cannot be deleted.
 */
export async function deleteProfile(uid: string, profileId: string): Promise<void> {
  try {
    const docRef = doc(db, 'users', uid, 'profiles', profileId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('[useProfiles] deleteProfile failed:', err);
    throw err;
  }
}

/**
 * React hook to manage profiles.
 * Provides load, save, delete, and set-main functionality.
 */
export function useProfiles(uid: string | null) {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load profiles on uid change
  useEffect(() => {
    if (!uid) {
      setProfiles([]);
      return;
    }

    setLoading(true);
    setError(null);

    loadProfiles(uid)
      .then((loaded) => {
        setProfiles(loaded);
        setError(null);
      })
      .catch((err) => {
        console.error('[useProfiles] Failed to load profiles:', err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [uid]);

  const addProfile = useCallback(
    async (profileData: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (!uid) throw new Error('User not authenticated');

      const newProfile: UserProfile = {
        ...profileData,
        id: `profile_${Date.now()}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const profileId = await saveProfile(uid, newProfile);
      newProfile.id = profileId;

      setProfiles((prev) => [...prev, newProfile].sort((a, b) => {
        if (a.isMain) return -1;
        if (b.isMain) return 1;
        return a.createdAt - b.createdAt;
      }));

      return newProfile;
    },
    [uid]
  );

  const updateProfile = useCallback(
    async (profileId: string, updates: Partial<UserProfile>) => {
      if (!uid) throw new Error('User not authenticated');

      const existing = profiles.find((p) => p.id === profileId);
      if (!existing) throw new Error('Profile not found');

      const updated: UserProfile = {
        ...existing,
        ...updates,
        id: profileId,
        createdAt: existing.createdAt,
      };

      await saveProfile(uid, updated);

      setProfiles((prev) =>
        prev.map((p) => (p.id === profileId ? updated : p))
      );

      return updated;
    },
    [uid, profiles]
  );

  const removeProfile = useCallback(
    async (profileId: string) => {
      if (!uid) throw new Error('User not authenticated');

      const profile = profiles.find((p) => p.id === profileId);
      if (!profile) throw new Error('Profile not found');
      if (profile.isMain) throw new Error('Cannot delete main profile');

      await deleteProfile(uid, profileId);
      setProfiles((prev) => prev.filter((p) => p.id !== profileId));
    },
    [uid, profiles]
  );

  const setMainProfile = useCallback(
    async (profileId: string) => {
      if (!uid) throw new Error('User not authenticated');

      const batch = writeBatch(db);
      const updated: UserProfile[] = [];

      for (const profile of profiles) {
        const wasMain = profile.isMain;
        const shouldBeMain = profile.id === profileId;

        if (wasMain !== shouldBeMain) {
          const docRef = doc(db, 'users', uid, 'profiles', profile.id);
          const updatedProfile: UserProfile = {
            ...profile,
            isMain: shouldBeMain,
            updatedAt: Date.now(),
          };
          batch.update(docRef, { isMain: shouldBeMain, updatedAt: Date.now() });
          updated.push(updatedProfile);
        } else {
          updated.push(profile);
        }
      }

      await batch.commit();
      setProfiles(updated.sort((a, b) => {
        if (a.isMain) return -1;
        if (b.isMain) return 1;
        return a.createdAt - b.createdAt;
      }));
    },
    [uid, profiles]
  );

  return {
    profiles,
    loading,
    error,
    addProfile,
    updateProfile,
    removeProfile,
    setMainProfile,
  };
}
