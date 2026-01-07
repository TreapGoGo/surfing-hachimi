import { mockItems } from '@/dashboard/mockData';
import Card from '@/shared/components/Card';
import { Search, ExternalLink, Download } from 'lucide-react';

export default function Panel() {
  // Sort by score desc as per PRD
  const items = [...mockItems].sort((a, b) => b.metadata.score - a.metadata.score);

  return (
    <div className="w-full min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            🏄 冲浪哈基米
          </h1>
          <div className="text-xs text-slate-500">近 24h: {items.length} 条</div>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input 
            type="text" 
            placeholder="搜索..." 
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-100 border-none text-xs focus:ring-2 focus:ring-blue-100 transition-shadow outline-none"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {items.map(item => (
          <Card key={item.id} item={item} className="shadow-sm border-slate-200" />
        ))}
      </div>

      {/* Footer Actions */}
      <div className="p-3 border-t border-slate-200 bg-white grid grid-cols-2 gap-2 sticky bottom-0 z-10">
        <button className="flex items-center justify-center gap-2 py-2 text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors">
          <Download size={14} />
          一键导出
        </button>
        <button 
          onClick={() => {
            if (chrome && chrome.tabs) {
              chrome.tabs.create({ url: 'dashboard.html' });
            } else {
              window.open('dashboard.html', '_blank');
            }
          }}
          className="flex items-center justify-center gap-2 py-2 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
        >
          <ExternalLink size={14} />
          打开 Dashboard
        </button>
      </div>
    </div>
  )
}
