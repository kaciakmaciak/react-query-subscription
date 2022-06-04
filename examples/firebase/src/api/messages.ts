import {
  collection,
  query,
  orderBy,
  doc,
  addDoc,
  limit,
  startAfter,
  endAt,
} from 'firebase/firestore';
import { collectionData } from 'rxfire/firestore';
import { map } from 'rxjs/operators';

import type { Observable } from 'rxjs';
import type {
  DocumentData,
  QueryDocumentSnapshot,
  SnapshotOptions,
  QueryConstraint,
} from 'firebase/firestore';

import { db } from '../firebase';

import type { Message } from '../types/message';
import type { InfiniteData } from '../types/infinite-data';

export interface MessageDocument {
  id: string;
  userId: string;
  message: string;
  sentAt: number;
}

const messageConverter = {
  toFirestore(message: Message): DocumentData {
    return message;
  },
  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): Message {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      userId: data.userId,
      message: data.message,
      sentAt: data.sentAt,
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

export type LiveMessagesCursor = { after: number };
export type PreviousMessagesCursor = { before: number; limit: number };
export type MessagesCursor = LiveMessagesCursor | PreviousMessagesCursor;

function isLiveMessagesCursor(
  cursor: MessagesCursor
): cursor is LiveMessagesCursor {
  return 'after' in cursor;
}

export function getMessages$(
  chatId: string,
  cursor: MessagesCursor
): Observable<InfiniteData<Message[], number>> {
  const constraints: QueryConstraint[] = isLiveMessagesCursor(cursor)
    ? [orderBy('sentAt', 'desc'), endAt(cursor.after)]
    : [orderBy('sentAt', 'desc'), startAfter(cursor.before), limit(5)];

  const messagesRef = query(
    collection(doc(db, 'messages', chatId), 'messages').withConverter(
      messageConverter
    ),
    ...constraints
  );
  return collectionData(messagesRef, { idField: 'id' }).pipe(
    map((data) => ({
      data,
      nextCursor: isLiveMessagesCursor(cursor)
        ? cursor.after
        : data[data.length - 1]?.sentAt,
    }))
  );
}
