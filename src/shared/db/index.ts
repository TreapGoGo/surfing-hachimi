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

export async function mergeAndSaveItem(newItem: Partial<ContentItem> & { id: string }) {
  const db = await initDB();
  const tx = db.transaction('items', 'readwrite');
  const store = tx.objectStore('items');
  
  const existingItem = await store.get(newItem.id);
  
  if (existingItem) {
    // 构造合并后的对象，以 existingItem 为底色
    const mergedItem: ContentItem = {
      ...existingItem,
      // 只有 newItem 中确实存在的顶级字段才覆盖
      ...(newItem.title ? { title: newItem.title } : {}),
      ...(newItem.url ? { url: newItem.url } : {}),
      ...(newItem.cover ? { cover: newItem.cover } : {}),
      ...(newItem.author ? { author: { ...existingItem.author, ...newItem.author } } : {}),
      ...(newItem.contentExcerpt && newItem.contentExcerpt !== 'no excerpt' ? { contentExcerpt: newItem.contentExcerpt } : {}),
      
      metadata: {
        ...existingItem.metadata,
        ...(newItem.metadata || {}),
        // 特殊处理：阅读时长累加
        userReadDuration: (existingItem.metadata.userReadDuration || 0) + (newItem.metadata?.userReadDuration || 0),
        // 特殊处理：手动分值覆盖
        manualScore: newItem.metadata?.manualScore ?? existingItem.metadata.manualScore
      },
      
      // 行为累加
      actions: [
        ...(existingItem.actions || []),
        ...(newItem.actions || [])
      ],
      
      lastUpdated: Date.now()
    };

    // 重新计算总分
    mergedItem.metadata.score = calculateScore(mergedItem);
    
    await store.put(mergedItem);
  } else {
    // 如果是新条目，确保基础字段完整
    const itemToSave = {
      ...newItem,
      firstSeen: newItem.firstSeen || Date.now(),
      lastUpdated: Date.now(),
      actions: newItem.actions || [{ type: 'view', timestamp: Date.now() }],
      metadata: {
        ...newItem.metadata,
        score: 0 // Initial
      }
    } as ContentItem;
    
    itemToSave.metadata.score = calculateScore(itemToSave);
    await store.put(itemToSave);
  }
  
  await tx.done;
}

export async function deleteItem(id: string) {
  const db = await initDB();
  return db.delete('items', id);
}
