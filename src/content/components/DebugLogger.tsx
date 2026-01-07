import React, { useEffect, useState, useRef } from 'react';
import { logger, type LogEntry } from '@/shared/utils/logger';
import { X, Trash2, ChevronDown, ChevronUp, Terminal, Copy, Check } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DebugLogger: React.FC = () => {
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  const copyLogs = (e: React.MouseEvent) => {
    e.stopPropagation();
    const logText = logEntries.map(log => {
      const time = new Date(log.timestamp).toLocaleTimeString();
      const meta = log.metadata ? ` ${JSON.stringify(log.metadata)}` : '';
      const excerpt = log.excerpt ? ` [Excerpt: ${log.excerpt}]` : '';
      return `[${time}] ${log.type.toUpperCase()} ${log.message}${meta}${excerpt}`;
    }).join('\n');
    
    navigator.clipboard.writeText(logText).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  // 订阅状态更新 UI
  useEffect(() => {
    const unsub = logger.subscribe((newLogs) => {
      // 确保日志是按时间升序排列的（旧在前，新在后）
      const sortedLogs = [...newLogs].sort((a, b) => a.timestamp - b.timestamp);
      setLogEntries(sortedLogs);
    });
    return unsub;
  }, []);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollContainerRef.current && !isMinimized) {
      const container = scrollContainerRef.current;
      // 使用 requestAnimationFrame 确保在 DOM 渲染完成后滚动
      requestAnimationFrame(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      });
    }
  }, [logEntries, isMinimized]);

  const onDragStart = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    const startX = e.clientX - pos.x;
    const startY = e.clientY - pos.y;

    const onDragMove = (moveEvent: MouseEvent) => {
      setPos({
        x: moveEvent.clientX - startX,
        y: moveEvent.clientY - startY
      });
    };

    const onDragEnd = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', onDragMove);
      document.removeEventListener('mouseup', onDragEnd);
    };

    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);
  };

  if (!isVisible) return null;

  return (
    <div 
      className={cn(
        "fixed z-[2147483647] flex flex-col bg-slate-900/95 text-white rounded-lg shadow-2xl border border-slate-700 backdrop-blur-md overflow-hidden",
        !isDragging && "transition-all duration-300",
        isMinimized ? "h-10 w-56" : "h-[500px] w-[450px] md:w-[500px] resize both min-w-[300px] min-h-[40px]"
      )}
      style={{
        bottom: 80 - pos.y,
        right: 16 - pos.x,
        pointerEvents: 'auto'
      }}
    >
      {/* Header */}
      <div 
        ref={headerRef}
        onMouseDown={onDragStart}
        className="flex items-center justify-between px-3 py-2 border-b border-slate-700 cursor-move hover:bg-slate-800/50 select-none shrink-0"
      >
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-blue-400" />
          <span className="text-xs font-bold font-mono tracking-tight">Hachimi Debug</span>
          <span className="bg-blue-500/20 text-blue-400 text-[10px] px-1.5 py-0.5 rounded-full border border-blue-500/30">{logEntries.length}</span>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={copyLogs}
            className="p-1.5 hover:bg-slate-700 rounded-md text-slate-400 hover:text-white transition-colors"
            title="Copy Logs"
          >
            {isCopied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); logger.clear(); }}
            className="p-1.5 hover:bg-slate-700 rounded-md text-slate-400 hover:text-white transition-colors"
            title="Clear Logs"
          >
            <Trash2 size={14} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
            className="p-1.5 hover:bg-slate-700 rounded-md text-slate-400 hover:text-white transition-colors"
            title={isMinimized ? "Expand" : "Collapse"}
          >
            {isMinimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); setIsVisible(false); }}
            className="p-1.5 hover:bg-red-500/20 rounded-md text-slate-400 hover:text-red-400 transition-colors"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Log List */}
      {!isMinimized && (
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-3 space-y-2 font-mono text-[11px] leading-relaxed scrollbar-thin scrollbar-thumb-slate-700"
        >
          {logEntries.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500 italic">
              No logs yet...
            </div>
          ) : (
            logEntries.map((entry) => (
               <div key={entry.id} className={cn(
                  "group relative p-2.5 rounded-md border-l-4 transition-all hover:bg-slate-800/80 mb-2 last:mb-0",
                  entry.level === 'info' && "bg-blue-500/5 border-blue-500/40 text-blue-100",
                  entry.level === 'success' && "bg-emerald-500/5 border-emerald-500/40 text-emerald-100",
                  entry.level === 'warn' && "bg-amber-500/5 border-amber-500/40 text-amber-100",
                  entry.level === 'error' && "bg-rose-500/5 border-rose-500/40 text-rose-100",
                )}>
                  <div className="flex w-full min-h-[40px]">
                    {/* 左侧：核心信息 */}
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[9px] opacity-40 shrink-0">
                          {new Date(entry.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <span className={cn(
                          "font-bold uppercase text-[8px] tracking-tighter px-1 rounded-sm",
                          entry.level === 'success' && "bg-emerald-500/20 text-emerald-400",
                          entry.level === 'info' && "bg-blue-500/20 text-blue-400",
                          entry.level === 'warn' && "bg-amber-500/20 text-amber-400",
                          entry.level === 'error' && "bg-rose-500/20 text-rose-400",
                        )}>
                          {entry.level}
                        </span>
                      </div>
                      <div className="break-words font-medium text-[11px] leading-snug">
                        {entry.message}
                      </div>
                    </div>

                    {/* 右侧：内容摘要切片 (占 40% 宽度，背景稍亮) */}
                    {entry.excerpt ? (
                      <div className="w-[40%] shrink-0 pl-3 border-l border-white/10 flex items-center bg-white/5 -my-2.5 -mr-2.5 rounded-r-md">
                        <div className="text-[10px] text-slate-400 line-clamp-3 leading-tight pr-2">
                          {entry.excerpt}
                        </div>
                      </div>
                    ) : (
                      <div className="w-[40%] shrink-0 pl-3 border-l border-white/5 opacity-10 flex items-center text-[9px]">
                        no excerpt
                      </div>
                    )}
                  </div>
                </div>
             ))
          )}
        </div>
      )}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(71, 85, 105, 0.4);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(71, 85, 105, 0.8);
        }
      `}</style>
    </div>
  );
};

export default DebugLogger;
