import Sidebar from './components/Sidebar';
import Waterfall from './components/Waterfall';
import TimeCapsule from './components/TimeCapsule';
import DeletePanel from './components/DeletePanel';
import SettingsPage from './components/SettingsPage';
import { Search, Filter, Loader2, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getAllItems, clearAllItems, deleteItemsBefore } from '@/shared/db';
import { getSettings, applySettingsToDOM } from '@/shared/utils/settings';
import type { ContentItem } from '@/shared/types';

export default function App() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeletePanel, setShowDeletePanel] = useState(false);
  const [isDisintegrating, setIsDisintegrating] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    return ['home', 'settings', 'search', 'archive'].includes(hash) ? hash : 'home';
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getAllItems();
      setItems(data.length > 0 ? data : []);
    } catch (e) {
      console.error('Failed to load data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    
    // 初始化设置
    getSettings().then(settings => {
      applySettingsToDOM(settings);
    });

    // 监听设置更新
    const handleSettingsUpdate = (e: any) => {
      applySettingsToDOM(e.detail);
    };
    window.addEventListener('hachimi-settings-updated' as any, handleSettingsUpdate);
    return () => window.removeEventListener('hachimi-settings-updated' as any, handleSettingsUpdate);
  }, []);

  const handleClearAll = async () => {
    try {
      setIsDisintegrating(true);
      // Wait for animation to play out (1.5s total duration, we wait 1.2s to start clearing)
      await new Promise(resolve => setTimeout(resolve, 1200));
      await clearAllItems();
      setItems([]);
      setShowDeletePanel(false);
    } catch (e) {
      console.error('Failed to clear data', e);
    } finally {
      setIsDisintegrating(false);
    }
  };

  const handleClearRange = async (timestamp: number) => {
    try {
      setIsDisintegrating(true);
      await new Promise(resolve => setTimeout(resolve, 1200));
      await deleteItemsBefore(timestamp);
      await loadData();
      setShowDeletePanel(false);
    } catch (e) {
      console.error('Failed to clear data', e);
    } finally {
      setIsDisintegrating(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      
      <main className="flex-1 ml-[60px] flex">
        {activeTab === 'home' ? (
          <>
            {/* Main Content Area: Waterfall */}
            <div className="flex-1 p-8 w-full">
              {/* Header */}
              <div className="flex items-center justify-between mb-8 max-w-5xl mx-auto">
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">哈基米冲浪助手</h1>
                  <p className="text-slate-500 text-sm mt-1">
                    {loading ? '正在加载...' : `${items.length} 条真实足迹`}
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="搜索..." 
                      className="pl-9 pr-4 py-2 rounded-full bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 w-64 transition-shadow"
                    />
                  </div>
                  <button 
                    type="button"
                    onClick={() => setShowDeletePanel(true)}
                    className="p-2 bg-white border border-slate-200 rounded-lg text-rose-500 hover:bg-rose-50 hover:border-rose-100 transition-colors"
                    title="清空记录"
                  >
                    <Trash2 size={18} />
                  </button>
                  <button type="button" className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors">
                    <Filter size={18} />
                  </button>
                </div>
              </div>

              <div className="max-w-5xl mx-auto">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-32 text-slate-400 gap-4">
                    <Loader2 className="animate-spin" size={32} />
                    <p className="text-sm font-medium">正在读取本地数据库...</p>
                  </div>
                ) : items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-32 text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl">
                    <p className="text-sm">暂无记录，快去知乎或B站逛逛吧 🏄</p>
                  </div>
                ) : (
                  <Waterfall items={items} isDisintegrating={isDisintegrating} />
                )}
              </div>
            </div>

            {/* Right Sidebar: Timeline */}
            <TimeCapsule items={items} />
          </>
        ) : activeTab === 'settings' ? (
          <div className="flex-1 w-full">
            <SettingsPage />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            页面建设中...
          </div>
        )}
      </main>

      {showDeletePanel && (
        <DeletePanel 
          onDeleteAll={handleClearAll} 
          onDeleteRange={handleClearRange} 
          onClose={() => setShowDeletePanel(false)} 
          isDisintegrating={isDisintegrating}
        />
      )}

      {/* Disintegration Animation CSS */}
      <style>{`
        @keyframes disintegrate {
          0% {
            opacity: 1;
            transform: translate(0, 0) scale(1) rotate(0deg);
            filter: blur(0px);
          }
          20% {
            filter: blur(1px) contrast(120%);
          }
          100% {
            opacity: 0;
            transform: translate(var(--dx), var(--dy)) scale(0.8) rotate(var(--dr));
            filter: blur(8px) brightness(1.5);
          }
        }
        .disintegrate-item {
          animation: disintegrate 1s forwards cubic-bezier(0.4, 0, 0.2, 1);
          pointer-events: none;
        }
      `}</style>
    </div>
  )
}
