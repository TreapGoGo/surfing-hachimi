import type { ContentItem } from '@/shared/types';
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
  const level = getLevel(item.metadata.score);
  
  const scoreColor = {
    1: 'text-slate-500',
    2: 'text-blue-500',
    3: 'text-purple-500',
    4: 'text-yellow-500',
  }[level];

  const formattedTime = formatDistanceToNow(item.lastUpdated, { addSuffix: true, locale: zhCN });

  return (
    <div className={cn("bg-white rounded-lg shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow", className)}>
      {/* Bilibili Cover */}
      {isBilibili && item.cover && (
        <div className="relative aspect-video bg-slate-100">
          <img src={item.cover} alt={item.title} className="w-full h-full object-cover" />
          {item.metadata.duration && (
            <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1 rounded">
              {formatDuration(item.metadata.duration)}
            </div>
          )}
        </div>
      )}

      <div className="p-3 space-y-2">
        {/* Header: Score + Platform + Time */}
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <span className={cn("font-bold flex items-center gap-0.5", scoreColor)}>
              <Zap size={12} fill="currentColor" />
              {item.metadata.score}分
            </span>
            <span>·</span>
            <span className={isBilibili ? "text-pink-500" : "text-blue-500"}>
              {isBilibili ? 'B站' : '知乎'}
            </span>
          </div>
          <span>{formattedTime}</span>
        </div>

        {/* Title */}
        <h3 className="font-medium text-slate-800 line-clamp-2 text-sm leading-snug">
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">
            {item.title}
          </a>
        </h3>

        {/* Author */}
        <div className="flex items-center text-xs text-slate-500">
          <span>@{item.author.name}</span>
          {isBilibili && item.metadata.views && (
            <>
              <span className="mx-1">·</span>
              <span>{formatNumber(item.metadata.views)}播放</span>
            </>
          )}
          {!isBilibili && item.author.followers && (
            <>
              <span className="mx-1">·</span>
              <span>粉丝 {formatNumber(item.author.followers)}</span>
            </>
          )}
        </div>

        {/* Excerpt (Zhihu only) */}
        {!isBilibili && item.contentExcerpt && (
          <p className="text-xs text-slate-600 line-clamp-3 bg-slate-50 p-2 rounded">
            {item.contentExcerpt}
          </p>
        )}

        {/* Action Badges */}
        <div className="flex items-center gap-2 pt-1">
          {item.actions.some(a => a.type === 'like') && <Badge icon={ThumbsUp} />}
          {item.actions.some(a => a.type === 'coin') && <Badge icon={Coins} />}
          {item.actions.some(a => a.type === 'star') && <Badge icon={Star} />}
          {item.actions.some(a => a.type === 'comment') && <Badge icon={MessageSquare} />}
        </div>
      </div>
    </div>
  );
}

function Badge({ icon: Icon }: { icon: any }) {
  return (
    <div className="p-1 rounded bg-slate-100 text-slate-500">
      <Icon size={12} />
    </div>
  );
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatNumber(num: number) {
  if (num >= 10000) return (num / 10000).toFixed(1) + '万';
  return num.toString();
}
