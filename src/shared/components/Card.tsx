import type { ContentItem, ActionType } from '@/shared/types';
import { getLevel } from '@/shared/utils/score';
import { cn } from '@/shared/utils/cn';
import { MessageSquare, ThumbsUp, Star, Coins, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface CardProps {
  item: ContentItem;
  className?: string;
}

export default function Card({ item, className }: CardProps) {
  const isBilibili = item.platform === 'bilibili';
  const score = item.metadata?.score || 0;
  const level = getLevel(score);
  
  const scoreColor = {
    1: 'text-slate-500',
    2: 'text-blue-500',
    3: 'text-purple-500',
    4: 'text-yellow-500',
  }[level];

  const formattedTime = formatDistanceToNow(item.lastUpdated || Date.now(), { addSuffix: true, locale: zhCN });

  return (
    <div className={cn("bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow", className)}>
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
          </div>
          <span className="shrink-0 ml-2">{formattedTime}</span>
        </div>

        {/* Title */}
        <h3 className="font-medium text-slate-800 line-clamp-2 text-sm leading-snug">
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">
            {item.title}
          </a>
        </h3>

        {/* Bilibili Author (Original Style) */}
        {isBilibili && (
           <div className="flex items-center text-xs text-slate-500">
            {item.author.url ? (
              <a href={item.author.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors text-slate-700">
                @{item.author.name || '未知作者'}
              </a>
            ) : (
              <span>@{item.author?.name || '未知作者'}</span>
            )}
             {item.metadata?.views && (
              <>
                <span className="mx-1">·</span>
                <span>{formatNumber(item.metadata.views)}播放</span>
              </>
            )}
           </div>
        )}

        {/* Excerpt (Zhihu only) */}
        {!isBilibili && item.contentExcerpt && (
          <p className="text-xs text-slate-600 line-clamp-3 bg-slate-50 p-2 rounded">
            {item.contentExcerpt}
          </p>
        )}

        {/* User Actions Description */}
        <div className="text-xs pt-1 flex flex-wrap gap-x-2 gap-y-1">
           {getActionElements(item)}
        </div>

        {/* Footer: Meta Stats (Votes/Comments) */}
        {!isBilibili && (
          <div className="flex items-center gap-3 text-xs text-slate-400 pt-1">
            {item.metadata?.voteCount !== undefined && item.metadata.voteCount > 0 && (
              <div className="flex items-center gap-1">
                <ThumbsUp size={12} />
                <span>{formatNumber(item.metadata.voteCount)}</span>
              </div>
            )}
            {item.metadata?.commentCount !== undefined && item.metadata.commentCount > 0 && (
              <div className="flex items-center gap-1">
                <MessageSquare size={12} />
                <span>{formatNumber(item.metadata.commentCount)}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function getActionElements(item: ContentItem) {
  const elements: React.ReactNode[] = [];
  const actions = new Set(item.actions.map(a => a.type));

  // 1. Manual Score
  if (item.metadata?.manualScore) {
    const scoreMap: Record<number, string> = {
      5: '还行',
      7: '不错',
      9: '很棒',
      11: '必看'
    };
    const label = scoreMap[item.metadata.manualScore] || `${item.metadata.manualScore}分`;
    
    elements.push(
      <span key="manual" className="font-bold text-orange-500">
        标记为{label}
      </span>
    );
  }

  // 2. Read duration
  if (actions.has('read_30s')) {
    elements.push(<span key="read" className="text-slate-500">读了很久</span>);
  } else if (item.metadata?.userReadDuration && item.metadata.userReadDuration > 10) {
    // Fallback if no action but has duration
    elements.push(<span key="read_dur" className="text-slate-500">已阅</span>);
  }

  // 3. Interactions
  if (actions.has('upvote')) elements.push(<span key="upvote" className="text-slate-500">赞过</span>);
  if (actions.has('like')) elements.push(<span key="like" className="text-slate-500">已喜欢</span>);
  if (actions.has('favorite') || actions.has('star')) elements.push(<span key="fav" className="text-slate-500">已收藏</span>);
  if (actions.has('share')) elements.push(<span key="share" className="text-slate-500">已分享</span>);
  if (actions.has('comment')) elements.push(<span key="comment" className="text-slate-500">已评论</span>);
  if (actions.has('open_comment') && !actions.has('comment')) elements.push(<span key="open_comment" className="text-slate-500">看过评论区</span>);

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
