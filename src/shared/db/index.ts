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
      ...(newItem.fullContent ? { fullContent: newItem.fullContent } : {}),
      
      metadata: {
        ...existingItem.metadata,
        ...(newItem.metadata || {}),
        // 特殊处理：阅读时长累加
        userReadDuration: (existingItem.metadata.userReadDuration || 0) + (newItem.metadata?.userReadDuration || 0),
        // 特殊处理：手动分值覆盖
        manualScore: newItem.metadata?.manualScore ?? existingItem.metadata.manualScore,
        // 特殊处理：胶囊统计数据保留（优先使用 existing，除非 newItem 显式更新）
        lastShownAt: newItem.metadata?.lastShownAt ?? existingItem.metadata.lastShownAt,
        capsuleShowCount: newItem.metadata?.capsuleShowCount ?? existingItem.metadata.capsuleShowCount,
        capsuleHoverCount: newItem.metadata?.capsuleHoverCount ?? existingItem.metadata.capsuleHoverCount,
        capsuleClickCount: newItem.metadata?.capsuleClickCount ?? existingItem.metadata.capsuleClickCount
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

/**
 * 分层采样获取共鸣候选集
 * High Pool: score >= 7 (随机取50个)
 * Normal Pool: score < 7 (随机取50个)
 */
export async function getResonanceCandidates(): Promise<ContentItem[]> {
  const db = await initDB();
  const tx = db.transaction('items', 'readonly');
  const index = tx.store.index('by-score');
  
  // 1. 获取两个池子的所有 Keys
  // IDBKeyRange.lowerBound(7) -> [7, Infinity]
  const highKeys = await index.getAllKeys(IDBKeyRange.lowerBound(7));
  // IDBKeyRange.upperBound(7, true) -> (-Infinity, 7)
  const normalKeys = await index.getAllKeys(IDBKeyRange.upperBound(7, true));
  
  // 2. 随机采样 Keys
  const sampleSize = 50;
  
  const sampleKeys = (keys: IDBValidKey[], count: number) => {
    if (keys.length <= count) return keys;
    // Fisher-Yates shuffle partial
    const result: IDBValidKey[] = [];
    const len = keys.length;
    const taken = new Set<number>();
    
    while (result.length < count) {
      const idx = Math.floor(Math.random() * len);
      if (!taken.has(idx)) {
        taken.add(idx);
        result.push(keys[idx]);
      }
    }
    return result;
  };

  const selectedHighKeys = sampleKeys(highKeys, sampleSize);
  const selectedNormalKeys = sampleKeys(normalKeys, sampleSize);
  
  // 3. 批量获取完整对象
  const allSelectedKeys = [...selectedHighKeys, ...selectedNormalKeys];
  
  // 并行获取
  const items = await Promise.all(
    allSelectedKeys.map(key => db.get('items', key as string))
  );

  // 过滤掉可能的 undefined
  return items.filter((i): i is ContentItem => !!i);
}

/**
 * 更新条目的统计数据 (轻量更新，不走全量 merge)
 */
export async function updateItemStats(id: string, updates: {
  lastShownAt?: number;
  capsuleShowCount?: number;
  capsuleHoverCount?: number;
  capsuleClickCount?: number;
}) {
  const db = await initDB();
  const tx = db.transaction('items', 'readwrite');
  const store = tx.objectStore('items');
  
  const item = await store.get(id);
  if (item) {
    item.metadata = {
      ...item.metadata,
      ...updates
    };
    await store.put(item);
  }
  
  await tx.done;
}
