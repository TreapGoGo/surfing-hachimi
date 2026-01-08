import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { ContentItem } from '../types';
import { calculateScore } from '../utils/score';

interface SurfingHachimiDB extends DBSchema {
  items: {
    key: string; // id
    value: ContentItem;
    indexes: {
      'by-platform': string;
      'by-score': number;
      'by-lastUpdated': number;
    };
  };
}

const DB_NAME = 'surfing-hachimi-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<SurfingHachimiDB>>;

export function initDB() {
  if (!dbPromise) {
    dbPromise = openDB<SurfingHachimiDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const itemStore = db.createObjectStore('items', { keyPath: 'id' });
        itemStore.createIndex('by-platform', 'platform');
        itemStore.createIndex('by-score', 'metadata.score');
        itemStore.createIndex('by-lastUpdated', 'lastUpdated');
      },
    });
  }
  return dbPromise;
}

export async function getItem(id: string) {
  const db = await initDB();
  return db.get('items', id);
}

export async function getAllItems() {
  const db = await initDB();
  return db.getAll('items');
}

export async function clearAllItems() {
  const db = await initDB();
  const tx = db.transaction('items', 'readwrite');
  await tx.objectStore('items').clear();
  await tx.done;
}

export async function deleteItemsBefore(timestamp: number) {
  const db = await initDB();
  const tx = db.transaction('items', 'readwrite');
  const store = tx.objectStore('items');
  const index = store.index('by-lastUpdated');
  
  let cursor = await index.openCursor(IDBKeyRange.upperBound(timestamp));
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

export async function getRecentItems(limit = 50) {
  const db = await initDB();
  const index = db.transaction('items').store.index('by-lastUpdated');
  const items: ContentItem[] = [];
  let cursor = await index.openCursor(null, 'prev');
  while (cursor && items.length < limit) {
    items.push(cursor.value);
    cursor = await cursor.continue();
  }
  return items;
}

export async function mergeAndSaveItem(newItem: ContentItem) {
  const db = await initDB();
  const tx = db.transaction('items', 'readwrite');
  const store = tx.objectStore('items');
  
  const existingItem = await store.get(newItem.id);
  
  if (existingItem) {
    // 1. Accumulate read duration
    const existingDuration = existingItem.metadata.userReadDuration || 0;
    const newDuration = newItem.metadata.userReadDuration || 0;
    newItem.metadata.userReadDuration = existingDuration + newDuration;

    // 2. Actions union
    // We append new actions. Score calculation will handle deduplication of types if needed.
    const existingActions = existingItem.actions || [];
    const newActions = newItem.actions || [];
    newItem.actions = [...existingActions, ...newActions];
    
    // 3. Merge manual score (preserve existing if new is missing, or overwrite?)
    // Usually latest manual score wins if provided, else keep existing.
    if (!newItem.metadata.manualScore && existingItem.metadata.manualScore) {
      newItem.metadata.manualScore = existingItem.metadata.manualScore;
    }
    
    // 4. Preserve firstSeen
    newItem.firstSeen = existingItem.firstSeen;
    
    // 5. Update lastUpdated to now
    newItem.lastUpdated = Date.now();
    
    // 6. Recalculate score
    newItem.metadata.score = calculateScore(newItem);
    
    await store.put(newItem);
  } else {
    // New item
    if (!newItem.firstSeen) newItem.firstSeen = Date.now();
    if (!newItem.lastUpdated) newItem.lastUpdated = Date.now();
    newItem.metadata.score = calculateScore(newItem);
    await store.put(newItem);
  }
  
  await tx.done;
}

export async function deleteItem(id: string) {
  const db = await initDB();
  return db.delete('items', id);
}
