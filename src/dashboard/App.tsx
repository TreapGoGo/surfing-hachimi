import Sidebar from './components/Sidebar';
import Waterfall from './components/Waterfall';
import TimeCapsule from './components/TimeCapsule';
import DeletePanel from './components/DeletePanel';
import SettingsPage from './components/SettingsPage';
import ResonanceLab from './pages/ResonanceLab';
import Toast, { ToastType } from '@/shared/components/Toast';
import { Search, Filter, Loader2, Trash2, ListChecks, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getAllItems, clearAllItems, deleteItemsBefore, deleteMultipleItems } from '@/shared/db';
import { getSettings, applySettingsToDOM } from '@/shared/utils/settings';
import { formatContentForCopy } from '@/shared/utils/format';
import type { ContentItem } from '@/shared/types';

export default function App() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeletePanel, setShowDeletePanel] = useState(false);
  const [isDisintegrating, setIsDisintegrating] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [toast, setToast] = useState<{ isVisible: boolean; message: string; type: ToastType }>({
    isVisible: false,
    message: '',
    type: 'success'
  });
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    return ['home', 'settings', 'search', 'archive', 'lab'].includes(hash) ? hash : 'home';
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
    
    // 监听 Toast 事件
    const handleToastEvent = (e: any) => {
      const { message, type = 'success' } = e.detail;
      showToast(message, type);
    };
    window.addEventListener('hachimi-toast' as any, handleToastEvent);

    return () => {
      window.removeEventListener('hachimi-settings-updated' as any, handleSettingsUpdate);
      window.removeEventListener('hachimi-toast' as any, handleToastEvent);
    };
  }, []);

  const handleClearAll = async () => {
    try {
      setIsDisintegrating(true);
      // Wait for animation to play out (1.5s total duration, we wait 1.2s to start clearing)
      await new Promise(resolve => setTimeout(resolve, 1200));
      await clearAllItems();
      setItems([]);
      setShowDeletePanel(false);
      showToast('所有记录已清空', 'success');
    } catch (e) {
      console.error('Failed to clear data', e);
      showToast('清空失败', 'error');
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
      showToast('历史记录已清理', 'success');
    } catch (e) {
      console.error('Failed to clear data', e);
      showToast('清理失败', 'error');
    } finally {
      setIsDisintegrating(false);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    
    try {
      setIsDisintegrating(true);
      // 等待消散动画
      await new Promise(resolve => setTimeout(resolve, 1200));
      await deleteMultipleItems(selectedIds);
      await loadData();
      setSelectedIds([]);
      setIsSelectMode(false);
      showToast(`已成功删除 ${selectedIds.length} 项内容`, 'success');
    } catch (e) {
      console.error('Failed to delete items', e);
      showToast('删除失败', 'error');
    } finally {
      setIsDisintegrating(false);
    }
  };

  const showToast = (message: string, type: ToastType = 'success') => {
    setToast({ isVisible: true, message, type });
  };

  const handleBatchCopy = async () => {
    if (selectedIds.length === 0) return;
    
    const selectedItems = selectedIds
      .map(id => items.find(item => item.id === id))
      .filter((item): item is ContentItem => !!item);
    
    const text = selectedItems.map((item, index) => {
      return formatContentForCopy(item, index + 1);
    }).join('\n\n\n');

    try {
      await navigator.clipboard.writeText(text);
      showToast(`已复制 ${selectedItems.length} 条内容`, 'success');
      setIsSelectMode(false);
      setSelectedIds([]);
    } catch (err) {
      console.error('Failed to copy: ', err);
      showToast('复制失败', 'error');
    }
  };

  const handleCancelSelect = () => {
    setIsSelectMode(false);
    setSelectedIds([]);
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
                  {isSelectMode ? (
                    <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100 animate-in fade-in slide-in-from-right-4">
                      <span className="text-sm font-medium text-blue-600 mr-2">已选中 {selectedIds.length} 项</span>
                      <button 
                        onClick={handleBatchCopy}
                        disabled={selectedIds.length === 0}
                        className="px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors shadow-sm"
                      >
                        批量复制
                      </button>
                      <button 
                        onClick={handleBatchDelete}
                        disabled={selectedIds.length === 0 || isDisintegrating}
                        className="px-3 py-1 bg-rose-500 text-white text-xs font-bold rounded-lg hover:bg-rose-600 disabled:opacity-50 transition-colors shadow-sm"
                      >
                        批量删除
                      </button>
                      <button 
                        onClick={handleCancelSelect}
                        className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setIsSelectMode(true)}
                      className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm group"
                      title="开启多选模式"
                    >
                      <ListChecks size={18} className="group-active:scale-90 transition-transform" />
                    </button>
                  )}

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
                  <Waterfall 
                    items={items} 
                    isSelectMode={isSelectMode}
                    selectedIds={selectedIds}
                    onToggleSelect={handleToggleSelect}
                    isDisintegrating={isDisintegrating} 
                  />
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
        ) : activeTab === 'lab' ? (
          <div className="flex-1 w-full">
            <ResonanceLab />
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

      <Toast 
        {...toast} 
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} 
      />

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
