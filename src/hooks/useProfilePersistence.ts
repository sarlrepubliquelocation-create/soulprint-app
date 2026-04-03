import { doc, setDoc, getDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';

export interface ProfileData {
  fn: string;
  mn: string;
  ln: string;
  bd: string;
  bt: string;
  bp: string;
  gn: 'M' | 'F';
  tz: number;
  updatedAt?: number;
}

/**
 * Save profile to Firestore at users/{uid}/settings/profile
 */
export async function saveProfile(uid: string, profileData: ProfileData): Promise<void> {
  try {
    const docRef = doc(db, 'users', uid, 'settings', 'profile');
    await setDoc(
      docRef,
      {
        ...profileData,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('[useProfilePersistence] saveProfile failed:', err);
    throw err;
  }
}

/**
 * Load profile from Firestore at users/{uid}/settings/profile
 */
export async function loadProfile(uid: string): Promise<ProfileData | null> {
  try {
    const docRef = doc(db, 'users', uid, 'settings', 'profile');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as ProfileData;
    }
    return null;
  } catch (err) {
    console.warn('[useProfilePersistence] loadProfile failed:', err);
    return null;
  }
}

/**
 * Migrate anonymous data (history subcollection) from old uid to new uid
 * Called after successful login to transfer local user's data
 */
export async function migrateAnonymousData(oldUid: string, newUid: string): Promise<void> {
  try {
    // Get all history documents from old uid
    const oldHistoryRef = collection(db, 'users', oldUid, 'history');
    const oldDocs = await getDocs(oldHistoryRef);

    if (oldDocs.empty) {
      console.debug('[useProfilePersistence] No history to migrate');
      return;
    }

    // Use batch write for atomic migration
    const batch = writeBatch(db);

    oldDocs.forEach((docSnap) => {
      const newDocRef = doc(db, 'users', newUid, 'history', docSnap.id);
      batch.set(newDocRef, docSnap.data(), { merge: true });
    });

    await batch.commit();
    console.debug(`[useProfilePersistence] Migrated ${oldDocs.size} history documents from ${oldUid} to ${newUid}`);
  } catch (err) {
    console.warn('[useProfilePersistence] migrateAnonymousData failed:', err);
    // Don't rethrow — migration failure shouldn't block login
  }
}
