import { useEffect, useState } from 'react';
import { getAllItems } from '@/shared/db';
import type { ContentItem } from '@/shared/types';
import Card from '@/shared/components/Card';
import { Search, ExternalLink, Download, Loader2, Settings } from 'lucide-react';
import { getSettings, applySettingsToDOM } from '@/shared/utils/settings';

export default function Panel() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getAllItems();
        // Sort by score desc as per PRD
        const sorted = data.sort((a, b) => (b.metadata?.score || 0) - (a.metadata?.score || 0));
        setItems(sorted);
      } catch (e) {
        console.error('Failed to load sidepanel data', e);
      } finally {
        setLoading(false);
      }
    };
    loadData();

    // 初始化设置
    getSettings().then(settings => {
      applySettingsToDOM(settings);
    });

    // 监听设置更新（在 Chrome 扩展中，storage.onChanged 是更好的跨页面同步方式）
    const handleStorageChange = (changes: any) => {
      if (changes.app_settings) {
        applySettingsToDOM(changes.app_settings.newValue);
      }
    };
    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  const filteredItems = items.filter(item => {
    const query = searchQuery.toLowerCase();
    const titleMatch = (item.title || '').toLowerCase().includes(query);
    const authorMatch = (item.author?.name || '').toLowerCase().includes(query);
    return titleMatch || authorMatch;
  });

  return (
    <div className="w-full min-h-screen bg-slate-50 flex flex-col font-sans text-[var(--hachimi-base-font-size)]">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            🏄 哈基米冲浪助手
          </h1>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                const url = chrome.runtime.getURL('dashboard.html#settings');
                chrome.tabs.create({ url });
              }}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="设置"
            >
              <Settings size={16} />
            </button>
            <div className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
              {loading ? '...' : `记录: ${items.length}`}
            </div>
          </div>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索足迹..." 
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-100 border-none text-xs focus:ring-2 focus:ring-blue-100 transition-shadow outline-none"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="animate-spin mb-2" size={24} />
            <p className="text-xs">加载中...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs">
            {searchQuery ? '未找到匹配足迹' : '暂无足迹，快去冲浪吧！'}
          </div>
        ) : (
          filteredItems.map(item => (
            <Card key={item.id} item={item} className="shadow-sm border-slate-200" />
          ))
        )}
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
