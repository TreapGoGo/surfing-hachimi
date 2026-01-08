import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface FeedbackPanelProps {
  onScore: (score: number) => void;
  onExempt: () => void;
  onClose: () => void;
}

export default function FeedbackPanel({ onScore, onExempt, onClose }: FeedbackPanelProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // 动画入场
    requestAnimationFrame(() => setVisible(true));
    
    // 8秒后自动关闭（稍微延长一点，因为增加了选项）
    const timer = setTimeout(() => {
      handleClose();
    }, 8000);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    e?.preventDefault();
    setVisible(false);
    setTimeout(onClose, 300); // 等待动画结束
  };

  const handleScore = (e: React.MouseEvent, score: number) => {
    e.stopPropagation();
    e.preventDefault();
    onScore(score);
    handleClose();
  };

  const handleExempt = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onExempt();
    handleClose();
  };

  return (
    <div 
      className={`fixed right-20 bottom-24 z-[9999] transition-all duration-300 ease-out transform ${
        visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'
      }`}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 flex flex-col gap-3 w-72">
        <div className="flex justify-between items-center px-1">
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">快速标记</span>
          <button type="button" onClick={(e) => handleClose(e)} className="text-slate-300 hover:text-slate-500 transition-colors">
            <X size={16} />
          </button>
        </div>
        
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: '还行', score: 5, color: 'bg-slate-50 text-slate-600 hover:bg-slate-100' },
            { label: '不错', score: 7, color: 'bg-blue-50 text-blue-600 hover:bg-blue-100' },
            { label: '很棒', score: 9, color: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' },
            { label: '必看', score: 11, color: 'bg-orange-50 text-orange-600 hover:bg-orange-100' }
          ].map((item) => (
            <button
              key={item.score}
              type="button"
              onClick={(e) => handleScore(e, item.score)}
              className={`flex flex-col items-center justify-center py-2.5 rounded-xl transition-all active:scale-95 ${item.color}`}
            >
              <span className="text-xs font-bold mb-0.5">{item.label}</span>
              <span className="text-[10px] font-medium opacity-60">+{item.score}</span>
            </button>
          ))}
        </div>

        <button 
          type="button"
          onClick={(e) => handleExempt(e)}
          className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-100 text-slate-400 text-xs font-bold hover:border-slate-200 hover:text-slate-500 transition-all flex items-center justify-center gap-2"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
          不记录此内容
        </button>
      </div>
      
      {/* 装饰性小三角指向悬浮球 */}
      <div className="absolute -right-2 bottom-6 w-0 h-0 border-t-[8px] border-t-transparent border-l-[12px] border-l-white border-b-[8px] border-b-transparent drop-shadow-sm transform rotate-12"></div>
    </div>
  );
}
