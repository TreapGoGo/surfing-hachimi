import { Zap } from 'lucide-react';
import { useState, useEffect } from 'react';
import FeedbackPanel from './FeedbackPanel';
import { logger } from '@/shared/utils/logger';

export default function FloatingBall() {
  const [showFeedback, setShowFeedback] = useState(false);
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);

  useEffect(() => {
    const handleShowFeedback = (e: CustomEvent) => {
      // 只有在没有显示的时候才弹出，避免频繁打扰
      // 或者：每次都重置计时器？这里简单处理，如果已经显示了就不管了，或者替换ID
      const { id } = e.detail || {};
      if (id) {
        setCurrentItemId(id);
        setShowFeedback(true);
      }
    };

    window.addEventListener('SURFING_HACHIMI_SHOW_FEEDBACK' as any, handleShowFeedback);
    return () => {
      window.removeEventListener('SURFING_HACHIMI_SHOW_FEEDBACK' as any, handleShowFeedback);
    };
  }, []);

  const handleManualScore = (score: number) => {
    if (!currentItemId) return;

    logger.info(`[FloatingBall] Manual score ${score} for item ${currentItemId}`);
    
    const event = new CustomEvent('SURFING_HACHIMI_MANUAL_SCORE', {
      detail: { id: currentItemId, score }
    });
    window.dispatchEvent(event);
  };

  const handleExempt = () => {
    if (!currentItemId) return;

    logger.info(`[FloatingBall] Exempting item ${currentItemId}`);
    
    const event = new CustomEvent('SURFING_HACHIMI_EXEMPT', {
      detail: { id: currentItemId }
    });
    window.dispatchEvent(event);
  };

  return (
    <div className="fixed right-4 bottom-20 z-[9999] font-sans group">
      {showFeedback && (
        <FeedbackPanel 
          onScore={handleManualScore} 
          onExempt={handleExempt}
          onClose={() => setShowFeedback(false)} 
        />
      )}
      
      <button 
        type="button"
        onClick={() => {
           // Send message to background to open side panel
           // Note: chrome.sidePanel.open requires user gesture, 
           // but messaging background might lose that context in some versions.
           // However, clicking this button IS a user gesture.
           chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' });
        }}
        className="w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 transition-all hover:scale-110 active:scale-95"
        title="哈基米冲浪助手"
      >
        <Zap size={24} />
      </button>
      
      {/* Tooltip/Label on hover */}
      <div className="absolute right-14 top-1/2 -translate-y-1/2 bg-black/70 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        查看足迹
      </div>
    </div>
  );
}
