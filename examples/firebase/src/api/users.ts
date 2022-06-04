import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { collectionData } from 'rxfire/firestore';

import type { Observable } from 'rxjs';
import type {
  DocumentData,
  QueryDocumentSnapshot,
  SnapshotOptions,
} from 'firebase/firestore';

import { db } from '../firebase';

import type { User } from '../types/user';

export interface UserDocument {
  id: string;
  fingerprint: string;
  username?: string;
  isOnline?: boolean;
}

const userConverter = {
  toFirestore(user: User): DocumentData {
    return user;
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): User {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      fingerprint: data.fingerprint,
      username: data.username,
      isRandomName: Boolean(data.isRandomName),
    };
  },
};

export async function findUser(fingerprint: string): Promise<User | undefined> {
  const usersRef = query(
    collection(db, 'users').withConverter(userConverter),
    where('fingerprint', '==', fingerprint)
  );
  const usersDocs = await getDocs(usersRef);
  if (usersDocs.empty) {
    return undefined;
  }
  if (usersDocs.size > 1) {
    throw new Error('Multiple users with same fingerprint');
  }
  return usersDocs.docs[0].data() ?? undefined;
}

export async function addUser(user: Omit<User, 'id'>): Promise<User> {
  const ref = await addDoc(collection(db, 'users'), user);
  return {
    ...user,
    id: ref.id,
  };
}

export function getUsers$(): Observable<User[]> {
  const usersRef = collection(db, 'users').withConverter(userConverter);
  return collectionData(usersRef, { idField: 'id' });
}
