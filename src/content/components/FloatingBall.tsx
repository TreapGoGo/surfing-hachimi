import { useState, useEffect } from 'react';
import FeedbackPanel from './FeedbackPanel';
import { logger } from '@/shared/utils/logger';

export default function FloatingBall() {
  const [showFeedback, setShowFeedback] = useState(false);
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);

  // 辅助函数：检查插件上下文是否有效
  const isContextValid = () => {
    return typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id;
  };

  useEffect(() => {
    const handleShowFeedback = (e: CustomEvent) => {
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

  const handleButtonClick = () => {
    if (!isContextValid()) {
      console.warn('[Hachimi] 插件上下文已失效，请刷新页面以恢复功能。');
      return;
    }

    try {
      // 发送切换侧边栏的消息
      chrome.runtime.sendMessage({ type: 'TOGGLE_SIDE_PANEL' }).catch(err => {
        console.warn('[Hachimi] 发送消息失败，可能插件已更新:', err);
      });
    } catch (e) {
      console.error('[Hachimi] 发送消息异常:', e);
    }
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
        onClick={handleButtonClick}
        className="w-12 h-12 bg-white text-blue-600 rounded-full shadow-lg flex items-center justify-center hover:bg-slate-50 transition-all hover:scale-110 active:scale-95 border-2 border-blue-500/10"
        title="哈基米冲浪助手 (点击开关侧边栏)"
      >
        <img 
          src={isContextValid() ? chrome.runtime.getURL('logo.png') : ''} 
          alt="Hachimi" 
          className="w-8 h-8 object-contain opacity-90"
          style={{ filter: !isContextValid() ? 'grayscale(100%)' : 'none' }}
        />
      </button>
      
      {/* Tooltip/Label on hover */}
      <div className="absolute right-14 top-1/2 -translate-y-1/2 bg-black/70 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        查看足迹
      </div>
    </div>
  );
}
