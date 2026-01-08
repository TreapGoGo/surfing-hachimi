import { useEffect } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { cn } from '../utils/cn';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ 
  message, 
  type = 'success', 
  isVisible, 
  onClose, 
  duration = 3000 
}: ToastProps) {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  const icons = {
    success: <CheckCircle2 className="text-emerald-500" size={18} />,
    error: <XCircle className="text-rose-500" size={18} />,
    info: <Info className="text-blue-500" size={18} />
  };

  const bgColors = {
    success: 'bg-emerald-50 border-emerald-100',
    error: 'bg-rose-50 border-rose-100',
    info: 'bg-blue-50 border-blue-100'
  };

  return (
    <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
      <div className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-lg min-w-[300px]",
        bgColors[type]
      )}>
        <span className="shrink-0">{icons[type]}</span>
        <p className="text-sm font-medium text-slate-700 flex-1">{message}</p>
        <button 
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 transition-colors p-0.5"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
