import { Zap } from 'lucide-react';

export default function FloatingBall() {
  return (
    <div className="fixed right-4 bottom-20 z-[9999] font-sans group">
      <button 
        onClick={() => {
           // Send message to background to open side panel
           // Note: chrome.sidePanel.open requires user gesture, 
           // but messaging background might lose that context in some versions.
           // However, clicking this button IS a user gesture.
           chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' });
        }}
        className="w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 transition-all hover:scale-110 active:scale-95"
        title="冲浪哈基米"
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
