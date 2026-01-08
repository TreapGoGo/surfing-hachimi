import type { ContentItem, ActionType } from '@/shared/types';
import { getLevel } from '@/shared/utils/score';
import { cn } from '@/shared/utils/cn';
import { formatContentForCopy } from '@/shared/utils/format';
import { MessageSquare, ThumbsUp, Star, Coins, Zap, Clock, Copy, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useState } from 'react';

interface CardProps {
  item: ContentItem;
  className?: string;
  isSelectMode?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
}

export default function Card({ item, className, isSelectMode, isSelected, onSelect }: CardProps) {
  const [copied, setCopied] = useState(false);
  const isBilibili = item.platform === 'bilibili';
  const score = item.metadata?.score || 0;
  const level = getLevel(score);
  
  const scoreColor = {
    1: 'text-slate-500',
    2: 'text-blue-500',
    3: 'text-purple-500',
    4: 'text-yellow-500',
  }[level];

  const formattedTime = formatDistanceToNow(item.lastUpdated || Date.now(), { addSuffix: true, locale: zhCN }).replace('大约 ', '');

  const handleClick = (e: React.MouseEvent) => {
    if (isSelectMode) {
      e.preventDefault();
      e.stopPropagation();
      onSelect?.();
    }
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const text = formatContentForCopy(item);
    
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
      onClick={handleClick}
      className={cn(
        "bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-all cursor-pointer relative",
        isSelectMode ? "ring-2 ring-transparent" : "",
        isSelected ? "ring-blue-500 border-blue-500 shadow-lg shadow-blue-100/50" : "border-slate-100",
        className
      )}
    >
      {/* Bilibili Cover */}
      {isBilibili && item.cover && (
        <div className="relative aspect-video bg-slate-100">
          <img src={item.cover} alt={item.title} className="w-full h-full object-cover" />
          {item.metadata?.duration && (
            <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1 rounded">
              {formatDuration(item.metadata.duration)}
            </div>
          )}
        </div>
      )}

      <div className="p-3 space-y-2">
        {/* Header: Score + Platform + Author + Time */}
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1 overflow-hidden">
            <span className={cn("font-bold flex items-center gap-0.5 shrink-0", scoreColor)}>
              <Zap size={12} fill="currentColor" />
              {score}分
            </span>
            <span className="shrink-0">·</span>
            <span className={cn("shrink-0", isBilibili ? "text-pink-500" : "text-blue-500")}>
              {isBilibili ? 'B站' : '知乎'}
            </span>
            
            {/* Author (Zhihu) */}
            {!isBilibili && item.author?.name && (
              <span className="text-slate-800 ml-1 truncate">
                {item.author.url ? (
                  <a href={item.author.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">
                    @{item.author.name}
                  </a>
                ) : (
                  `@${item.author.name}`
                )} 的回答
              </span>
            )}

            {/* Author (Bilibili) - Moved up */}
            {isBilibili && (
              <span className="text-slate-800 ml-1 truncate">
                {item.author.url ? (
                  <a href={item.author.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">
                    @{item.author.name || '未知作者'}
                  </a>
                ) : (
                  `@${item.author.name || '未知作者'}`
                )}
              </span>
            )}

            {/* Stats (Upvotes/Comments/Views) */}
            <div className="flex items-center gap-3 ml-4 shrink-0">
              {item.metadata?.voteCount !== undefined && item.metadata.voteCount > 0 && (
                <div className="flex items-center gap-0.5" title={isBilibili ? "点赞数" : "赞同数"}>
                  <ThumbsUp size={10} className="text-slate-400" />
                  <span className="text-slate-500">{formatNumber(item.metadata.voteCount)}</span>
                </div>
              )}
              {item.metadata?.commentCount !== undefined && item.metadata.commentCount > 0 && (
                <div className="flex items-center gap-0.5" title="评论数">
                  <MessageSquare size={10} className="text-slate-400" />
                  <span className="text-slate-500">{formatNumber(item.metadata.commentCount)}</span>
                </div>
              )}
              {isBilibili && item.metadata?.views !== undefined && item.metadata.views > 0 && (
                <div className="flex items-center gap-0.5" title="播放量">
                  <Zap size={10} className="text-slate-400 rotate-12" />
                  <span className="text-slate-500">{formatNumber(item.metadata.views)}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            <Clock size={10} />
            <span>{formattedTime}</span>
          </div>
        </div>

        {/* Title */}
        <h3 className="font-bold text-slate-800 line-clamp-2 text-sm leading-snug">
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">
            {item.title}
          </a>
        </h3>

        {/* Bilibili Author Section - Removed since it's moved to header */}

        {/* Excerpt (Zhihu only) */}
        {!isBilibili && item.contentExcerpt && (
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="block group/excerpt">
            <p className="text-xs text-slate-600 line-clamp-3 bg-slate-50 p-2 rounded group-hover/excerpt:text-slate-900 transition-colors cursor-pointer">
              {item.contentExcerpt}
            </p>
          </a>
        )}

        {/* User Actions Description */}
        <div className="text-xs pt-1 flex items-center justify-between">
           <div className="flex flex-wrap gap-x-2 gap-y-1">
            {getActionElements(item)}
           </div>
           
           {/* Copy Button */}
           {!isBilibili && (
             <button
               onClick={handleCopy}
               className={cn(
                 "flex items-center gap-1 px-2 py-1 rounded-md text-[0.7rem] font-medium transition-all duration-200",
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
    </div>
  );
}

export function getActionElements(item: ContentItem) {
  const elements: React.ReactNode[] = [];
  const actions = new Set(item.actions.map(a => a.type));
  
  // 胶囊基础样式
  const baseClass = "px-2 py-0.5 rounded-full text-[0.7rem] font-medium text-white shadow-sm shrink-0 transition-transform hover:scale-105";
  
  const getCapsule = (key: string, label: string, colorClass: string) => (
    <span key={key} className={cn(baseClass, colorClass)}>
      {label}
    </span>
  );

  // 1. Manual Score (橙色)
  if (item.metadata?.manualScore) {
    const scoreMap: Record<number, string> = {
      5: '还行',
      7: '不错',
      9: '很棒',
      11: '必看'
    };
    const label = scoreMap[item.metadata.manualScore] || `${item.metadata.manualScore}分`;
    elements.push(getCapsule("manual", `评价为${label}`, "bg-orange-500 font-bold"));
  }

  // 2. Read duration (蓝色)
  if (actions.has('read_30s')) {
    elements.push(getCapsule("read", "读了很久", "bg-blue-500"));
  } else if (item.metadata?.userReadDuration && item.metadata.userReadDuration > 10) {
    elements.push(getCapsule("read_dur", "已阅", "bg-sky-500"));
  }

  // 3. Interactions
  // 赞同/点赞 (靛蓝色/粉色)
  if (actions.has('upvote')) elements.push(getCapsule("upvote", "赞过", "bg-indigo-500"));
  if (actions.has('like')) elements.push(getCapsule("like", "已喜欢", "bg-pink-500"));
  
  // 收藏 (琥珀色)
  if (actions.has('favorite') || actions.has('star')) {
    elements.push(getCapsule("fav", "已收藏", "bg-amber-500"));
  }
  
  // 分享 (翡翠绿)
  if (actions.has('share')) elements.push(getCapsule("share", "已分享", "bg-emerald-500"));
  
  // 评论 (青色/蓝灰色)
  if (actions.has('comment')) {
    elements.push(getCapsule("comment", "已评论", "bg-cyan-500"));
  } else if (actions.has('open_comment')) {
    elements.push(getCapsule("open_comment", "看过评论区", "bg-slate-500"));
  }
  
  // B站特有行为 (紫罗兰/玫瑰色)
  if (actions.has('danmaku')) elements.push(getCapsule("danmaku", "发过弹幕", "bg-rose-500"));
  if (actions.has('triple')) elements.push(getCapsule("triple", "一键三连", "bg-violet-600 font-bold"));

  return elements;
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatNumber(num: number) {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万';
  }
  return num.toString();
}

function Badge({ icon: Icon }: { icon: any }) {
  return (
    <div className="p-1 bg-slate-100 rounded text-slate-500">
      <Icon size={12} />
    </div>
  );
}
