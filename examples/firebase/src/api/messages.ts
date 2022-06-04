import {
  collection,
  query,
  where,
  orderBy,
  doc,
  addDoc,
} from 'firebase/firestore';
import { collectionData } from 'rxfire/firestore';
import { startOfDay, addDays } from 'date-fns';

import type { Observable } from 'rxjs';
import type {
  DocumentData,
  QueryDocumentSnapshot,
  SnapshotOptions,
} from 'firebase/firestore';

import { db } from '../firebase';

import type { Message } from '../types/message';

export interface MessageDocument {
  id: string;
  userId: string;
  message: string;
  sentAt: Date;
}

const messageConverter = {
  toFirestore(message: Message): DocumentData {
    return message;
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): Message {
    const data = snapshot.data(options)!;
    return {
      id: snapshot.id,
      userId: data.userId,
      message: data.message,
      sentAt: data.sentAt?.toDate(),
    };
  },
};

export async function addMessage(
  chatId: string,
  message: Omit<Message, 'id'>
): Promise<Message> {
  const messagesRef = collection(
    doc(db, 'messages', chatId),
    'messages'
  ).withConverter(messageConverter);
  const ref = await addDoc(messagesRef, message);
  return {
    ...message,
    id: ref.id,
  };
}

export function getMessages$(chatId: string): Observable<Message[]> {
  const messagesRef = query(
    collection(doc(db, 'messages', chatId), 'messages').withConverter(
      messageConverter
    ),
    orderBy('sentAt', 'asc'),
    where('sentAt', '>=', addDays(startOfDay(new Date()), -1))
  );
  return collectionData(messagesRef, { idField: 'id' });
}
