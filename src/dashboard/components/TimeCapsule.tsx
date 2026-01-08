import type { ContentItem } from '@/shared/types';
import { getActionElements } from '@/shared/components/Card';
import { RefreshCw, ThumbsUp, Clock, Zap, Copy, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/shared/utils/cn';
import { getLevel } from '@/shared/utils/score';
import { getResonanceCandidates, updateItemStats } from '@/shared/db';
import { selectCapsuleItems } from '../utils/algorithm';

// Remove items prop, TimeCapsule handles its own data
interface TimeCapsuleProps {}

function CapsuleCard({ item }: { item: ContentItem }) {
  const [copied, setCopied] = useState(false);
  const isBilibili = item.platform === 'bilibili';
  const score = item.metadata?.score || 0;
  const level = getLevel(score);
  
  // Track hover duration/frequency
  const handleMouseEnter = () => {
    updateItemStats(item.id, {
      capsuleHoverCount: (item.metadata.capsuleHoverCount || 0) + 1
    });
  };

  // Track click interaction (open link)
  const handleLinkClick = () => {
    updateItemStats(item.id, {
      lastShownAt: Date.now(), // Refresh cooling
      capsuleClickCount: (item.metadata.capsuleClickCount || 0) + 1
    });
  };
  
  const scoreColor = {
    1: 'text-slate-500',
    2: 'text-blue-500',
    3: 'text-purple-500',
    4: 'text-yellow-500',
  }[level];
  
  // 格式化时间
  const formatDate = (ts: number) => {
    const now = Date.now();
    const diff = now - ts;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return new Date(ts).toLocaleDateString();
  };

  const authorName = item.author?.name || '未知作者';
  const displayContent = item.platform === 'zhihu' ? (item.contentExcerpt || item.content) : item.content;

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Track copy interaction (high value)
    updateItemStats(item.id, {
      lastShownAt: Date.now(),
      capsuleClickCount: (item.metadata.capsuleClickCount || 0) + 1
    });
    
    const text = `问题：${item.title}\n链接：${item.url}\n作者：${authorName}\n\n正文：\n${item.fullContent || displayContent}`;
    
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div 
      className="bg-white rounded-2xl p-4 shadow-xl shadow-indigo-100/50 border border-white ring-4 ring-white/50 flex flex-col gap-3 group transition-all hover:ring-indigo-100/50"
      onMouseEnter={handleMouseEnter}
    >
      {/* Top Info */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          {score > 0 && (
            <span className={cn("font-bold flex items-center gap-0.5", scoreColor)}>
              <Zap size={12} fill="currentColor" />
              {score}分
            </span>
          )}
          <span className="text-slate-300">·</span>
          <span className={cn("font-medium", isBilibili ? "text-pink-500" : "text-blue-500")}>
            {isBilibili ? 'Bilibili' : '知乎'}
          </span>
        </div>
        
        <div className="flex items-center gap-3 text-slate-400">
          {item.metadata?.voteCount !== undefined && item.metadata.voteCount > 0 && (
            <div className="flex items-center gap-0.5">
              <ThumbsUp size={10} />
              <span>{item.metadata.voteCount > 10000 ? `${(item.metadata.voteCount / 10000).toFixed(1)}万` : item.metadata.voteCount}</span>
            </div>
          )}
          <div className="flex items-center gap-0.5">
            <Clock size={10} />
            <span>{formatDate(item.lastUpdated)}</span>
          </div>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-sm font-bold text-slate-800 leading-snug line-clamp-2 transition-colors">
        <a 
          href={item.url} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="hover:text-indigo-600"
          onClick={handleLinkClick}
        >
          {item.title}
        </a>
      </h3>

      {/* Content Preview */}
      {displayContent && (
        <div className="text-xs text-slate-600 leading-relaxed overflow-hidden">
          <p className="line-clamp-3">
            {item.author?.url ? (
              <a 
                href={item.author.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="font-bold text-slate-800 hover:text-blue-600 transition-colors cursor-pointer"
              >
                @{authorName}
              </a>
            ) : (
              <span className="font-bold text-slate-800">@{authorName}</span>
            )}
            <a 
              href={item.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-slate-900 transition-colors cursor-pointer"
              onClick={handleLinkClick}
            >
              <span className="text-slate-800 font-medium ml-1"> 的{isBilibili ? '视频' : '回答'}：</span>
              {displayContent}
            </a>
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between mt-1">
        <div className="flex flex-wrap gap-1.5">
          {getActionElements(item)}
        </div>

        {/* Copy Button */}
        {!isBilibili && (
          <button
            onClick={handleCopy}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-md text-[0.7rem] font-medium transition-all duration-200 shrink-0",
              copied 
                ? "bg-green-50 text-green-600 border border-green-200" 
                : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100"
            )}
            title="复制内容"
          >
            {copied ? (
              <>
                <Check size={12} className="animate-in zoom-in duration-300" />
                <span>已复制</span>
              </>
            ) : (
              <>
                <Copy size={12} className="group-hover:scale-110 transition-transform" />
                <span>复制</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export default function TimeCapsule({}: TimeCapsuleProps) {
  const [randomItems, setRandomItems] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [seed, setSeed] = useState(0);

  const refreshItems = async () => {
    setIsLoading(true);
    try {
      // 1. Get candidates (Stratified Sampling)
      const candidates = await getResonanceCandidates();
      
      // 2. Select Items (Weighted Random)
      const selected = selectCapsuleItems(candidates, 3);
      setRandomItems(selected);
      
      // 3. Update stats for selected items (Silent update)
      // Mark them as "shown" so cooling can start
      selected.forEach(item => {
        updateItemStats(item.id, {
          lastShownAt: Date.now(),
          capsuleShowCount: (item.metadata.capsuleShowCount || 0) + 1
        });
      });
    } catch (e) {
      console.error("TimeCapsule refresh failed", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshItems();
  }, [seed]);

  return (
    <div className="w-[320px] border-l border-indigo-100 hidden xl:flex flex-col bg-gradient-to-b from-indigo-50/50 via-purple-50/30 to-white sticky top-0 h-screen overflow-y-auto shrink-0">
      {/* Header Area */}
      <div className="p-6 pb-4 flex items-center justify-between">
        <h2 className="font-bold text-indigo-900 flex items-center gap-2 text-lg">
          🎲 时光胶囊
        </h2>
        <button 
          type="button"
          onClick={() => setSeed(s => s + 1)}
          disabled={isLoading}
          className={cn(
            "text-indigo-400 hover:text-indigo-600 transition-colors p-2 rounded-full hover:bg-white shadow-sm border border-transparent hover:border-indigo-100 bg-white/50",
            isLoading && "opacity-50 cursor-not-allowed"
          )}
          title="换一批"
        >
          <RefreshCw size={18} className={cn(isLoading && "animate-spin")} />
        </button>
      </div>

      {/* Content Area */}
      <div className="px-6 flex-1 flex flex-col">
        <div className="mt-2 mb-6">
          <p className="text-xs text-indigo-400 leading-relaxed">
            为您随机挑选了 {randomItems.length} 条曾经打动过您的足迹
          </p>
        </div>

        {randomItems.length > 0 ? (
          <div className="flex flex-col gap-6">
            {randomItems.map((item) => (
              <div key={item.id} className="animate-in fade-in zoom-in-95 duration-500">
                <CapsuleCard item={item} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center py-12 text-indigo-300 text-sm italic bg-white/40 rounded-3xl border border-dashed border-indigo-100 px-8">
              {isLoading ? "正在共鸣..." : "暂无高价值回忆"}
            </div>
          </div>
        )}

        <div className="mt-auto py-12 text-center">
          <div className="inline-block p-4 rounded-3xl bg-white/40 border border-indigo-50 backdrop-blur-sm">
            <p className="text-xs text-indigo-400 leading-relaxed">
              让“收藏夹吃灰”的内容重见天日<br/>
              再次偶遇那些曾让你心动的瞬间
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
