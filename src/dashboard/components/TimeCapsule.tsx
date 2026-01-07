import type { ContentItem } from '@/shared/types';
import Card from '@/shared/components/Card';
import { RefreshCw } from 'lucide-react';
import { useState } from 'react';

interface TimeCapsuleProps {
  items: ContentItem[]; // Source pool
}

export default function TimeCapsule({ items }: TimeCapsuleProps) {
  // Filter high score items
  const pool = items.filter(i => i.metadata.score >= 7);
  
  const [, setSeed] = useState(0);
  
  // Simple random pick based on seed
  const getRandomItem = () => {
     if (pool.length === 0) return null;
     const idx = Math.floor(Math.random() * pool.length);
     return pool[idx];
  };

  const randomItem = getRandomItem();

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100 sticky top-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-indigo-900 flex items-center gap-2">
          🎲 时光胶囊
        </h2>
        <button 
          onClick={() => setSeed(s => s + 1)}
          className="text-indigo-400 hover:text-indigo-600 transition-colors p-1 rounded-full hover:bg-indigo-100"
        >
          <RefreshCw size={16} />
        </button>
      </div>
      
      {randomItem ? (
        <Card item={randomItem} />
      ) : (
        <div className="text-center py-8 text-indigo-300 text-sm">
          暂无高价值回忆
        </div>
      )}
      
      <p className="text-xs text-indigo-400 mt-4 text-center">
        让“收藏夹吃灰”的内容重见天日
      </p>
    </div>
  );
}
