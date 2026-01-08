import React, { useState, useRef, useEffect } from 'react';
import { Trash2, AlertTriangle, X, ChevronDown, Clock } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

interface DeletePanelProps {
  onDeleteAll: () => Promise<void>;
  onDeleteRange: (timestamp: number) => Promise<void>;
  onClose: () => void;
  isDisintegrating?: boolean;
}

const TIME_RANGES = [
  { label: '1天前', value: 24 * 60 * 60 * 1000 },
  { label: '3天前', value: 3 * 24 * 60 * 60 * 1000 },
  { label: '1周前', value: 7 * 24 * 60 * 60 * 1000 },
  { label: '1月前', value: 30 * 24 * 60 * 60 * 1000 },
  { label: '3月前', value: 90 * 24 * 60 * 60 * 1000 },
  { label: '1年前', value: 365 * 24 * 60 * 60 * 1000 },
];

export default function DeletePanel({ onDeleteAll, onDeleteRange, onClose, isDisintegrating }: DeletePanelProps) {
  const [selectedRange, setSelectedRange] = useState(TIME_RANGES[0]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isPressing, setIsPressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const PRESS_DURATION = 3000;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const startPress = (e: React.MouseEvent | React.TouchEvent) => {
    if (isDeleting) return;
    e.preventDefault();
    setIsPressing(true);
    setProgress(0);
    startTimeRef.current = Date.now();
    
    const updateProgress = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const newProgress = Math.min((elapsed / PRESS_DURATION) * 100, 100);
      setProgress(newProgress);
      
      if (newProgress < 100) {
        timerRef.current = requestAnimationFrame(updateProgress);
      } else {
        handleConfirmDeleteAll();
      }
    };
    
    timerRef.current = requestAnimationFrame(updateProgress);
  };

  const endPress = () => {
    setIsPressing(false);
    if (timerRef.current) {
      cancelAnimationFrame(timerRef.current);
      timerRef.current = null;
    }
    if (progress < 100) {
      setProgress(0);
    }
  };

  const handleConfirmDeleteAll = async () => {
    setIsDeleting(true);
    await onDeleteAll();
    setIsDeleting(false);
    setProgress(0);
  };

  const handleRangeDelete = async () => {
    const cutoff = Date.now() - selectedRange.value;
    setIsDeleting(true);
    await onDeleteRange(cutoff);
    setIsDeleting(false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) cancelAnimationFrame(timerRef.current);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className={cn(
          "absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity duration-500",
          isDisintegrating ? "opacity-0" : "opacity-100"
        )} 
        onClick={!isDisintegrating ? onClose : undefined} 
      />
      
      {/* Panel */}
      <div 
        className={cn(
          "bg-white rounded-[24px] shadow-2xl w-full max-w-md border border-slate-200 relative transition-all duration-300",
          isDisintegrating ? "disintegrate-item" : "scale-100 opacity-100 animate-in zoom-in-95 duration-300"
        )}
        style={isDisintegrating ? {
          '--dx': '0px',
          '--dy': '100px',
          '--dr': '10deg',
        } as React.CSSProperties : undefined}
      >
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between rounded-t-[24px] overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
              <AlertTriangle size={22} />
            </div>
            <div>
              <h2 className="text-slate-900 font-bold text-lg">清理足迹</h2>
              <p className="text-slate-400 text-xs font-medium">请谨慎操作，数据清理后无法恢复</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-full transition-colors text-slate-400"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-8">
          {/* Range Delete Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-700">按时间段删除</label>
              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-wider">精准清理</span>
            </div>
            
            <div className="flex gap-3 relative">
              <div className="flex-1 relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDropdownOpen(!isDropdownOpen);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium transition-all hover:border-slate-300",
                    isDropdownOpen && "ring-2 ring-slate-100 border-slate-400"
                  )}
                >
                  <div className="flex items-center gap-2 text-slate-700">
                    <Clock size={16} className="text-slate-400" />
                    {selectedRange.label}
                  </div>
                  <ChevronDown size={18} className={cn("text-slate-400 transition-transform duration-200", isDropdownOpen && "rotate-180")} />
                </button>

                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 py-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 animate-in slide-in-from-top-2 duration-200 max-h-60 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                    {TIME_RANGES.map((range) => (
                      <button
                        key={range.label}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRange(range);
                          setIsDropdownOpen(false);
                        }}
                        className={cn(
                          "w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center justify-between",
                          selectedRange.label === range.label 
                            ? "bg-blue-50 text-blue-600 font-bold" 
                            : "text-slate-600 hover:bg-slate-50"
                        )}
                      >
                        {range.label}
                        {selectedRange.label === range.label && <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRangeDelete();
                }}
                disabled={isDeleting}
                className="px-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-50 shadow-lg shadow-slate-200"
              >
                删除
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-[0.2em]">
              <span className="bg-white px-4 text-slate-300 font-bold">OR</span>
            </div>
          </div>

          {/* All Delete Section */}
          <div className="space-y-4">
            <button
              type="button"
              onMouseDown={startPress}
              onMouseUp={endPress}
              onMouseLeave={endPress}
              onTouchStart={startPress}
              onTouchEnd={endPress}
              disabled={isDeleting}
              className={cn(
                "relative w-full py-4 rounded-xl border-2 border-rose-500 text-rose-500 font-black overflow-hidden transition-all select-none group",
                isPressing && "scale-[0.98] shadow-inner",
                isDeleting && "opacity-50 cursor-not-allowed"
              )}
            >
              {/* Progress Bar Background Layer */}
              <div 
                className="absolute inset-0 bg-rose-500 opacity-0 transition-opacity duration-300 pointer-events-none"
                style={{ opacity: isPressing ? 0.05 : 0 }}
              />
              
              {/* Primary Progress Bar - Darker and more visible */}
              <div 
                className="absolute left-0 top-0 bottom-0 bg-rose-500/30 pointer-events-none z-0"
                style={{ width: `${progress}%` }}
              />

              {/* Bottom Progress Accent Line - Thicker */}
              <div 
                className="absolute left-0 bottom-0 h-2 bg-rose-600 pointer-events-none z-10"
                style={{ width: `${progress}%` }}
              />

              {/* Scanning Glow Effect */}
              {isPressing && (
                <div 
                  className="absolute top-0 bottom-0 w-32 bg-gradient-to-r from-transparent via-white/40 to-transparent pointer-events-none z-5"
                  style={{ animation: 'scan 1.5s infinite' }}
                />
              )}

              {/* Text with shake effect */}
              <span className={cn(
                "relative z-20 flex flex-col items-center justify-center gap-1 text-xs uppercase tracking-widest transition-transform",
                isPressing && "text-rose-700 font-bold"
              )}
              style={isPressing ? { animation: 'shake 0.1s infinite' } : {}}>
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Trash2 size={18} />
                  {isPressing ? '正在确认删除...' : '长按 5 秒清空全部记录'}
                </div>
                {isPressing && (
                  <span className="text-[10px] font-mono opacity-80">
                    进度: {Math.floor(progress)}%
                  </span>
                )}
              </span>
            </button>
            
            <p className="text-[10px] text-center text-slate-400">
              提示：长按过程中请勿松手，进度条满后将永久抹除所有冲浪数据
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          from { transform: translateX(-100%) skewX(-20deg); }
          to { transform: translateX(500%) skewX(-20deg); }
        }
        @keyframes shake {
          0% { transform: translate(1px, 1px) rotate(0deg); }
          10% { transform: translate(-1px, -2px) rotate(-1deg); }
          20% { transform: translate(-3px, 0px) rotate(1deg); }
          30% { transform: translate(3px, 2px) rotate(0deg); }
          40% { transform: translate(1px, -1px) rotate(1deg); }
          50% { transform: translate(-1px, 2px) rotate(-1deg); }
          60% { transform: translate(-3px, 1px) rotate(0deg); }
          70% { transform: translate(3px, 1px) rotate(-1deg); }
          80% { transform: translate(-1px, -1px) rotate(1deg); }
          90% { transform: translate(1px, 2px) rotate(0deg); }
          100% { transform: translate(1px, -2px) rotate(-1deg); }
        }
      `}</style>
    </div>
  );
}
