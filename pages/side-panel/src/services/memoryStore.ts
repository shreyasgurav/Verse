/* eslint-disable import/named */
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { firestore } from './firebase';

export async function saveUserMemory(userId: string, content: string) {
  if (!userId || !content.trim()) {
    return;
  }

  const memoryCollection = collection(firestore, 'memories');

  await addDoc(memoryCollection, {
    userId,
    content: content.trim(),
    createdAt: serverTimestamp(),
  });
}
