import Sidebar from './components/Sidebar';
import Waterfall from './components/Waterfall';
import TimeCapsule from './components/TimeCapsule';
import { mockItems } from './mockData';
import { Search, Filter, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getAllItems } from '@/shared/db';
import type { ContentItem } from '@/shared/types';

export default function App() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getAllItems();
        // 如果数据库为空，使用 mock 数据作为占位（可选，或者直接显示为空）
        setItems(data.length > 0 ? data : []);
      } catch (e) {
        console.error('Failed to load data', e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar />
      
      <main className="flex-1 ml-[60px] flex">
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
              <button className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors">
                <Filter size={18} />
              </button>
            </div>
          </div>

          <div className="max-w-5xl mx-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Loader2 className="animate-spin mb-4" size={32} />
                <p>正在同步您的冲浪足迹...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                <p className="text-slate-400">暂无真实记录，快去知乎或 B 站转转吧！</p>
              </div>
            ) : (
              <Waterfall items={items} />
            )}
          </div>
        </div>

        {/* Right Sidebar: Time Capsule */}
        <div className="w-[320px] p-6 border-l border-slate-200 hidden xl:block bg-white/50 backdrop-blur-sm sticky top-0 h-screen overflow-y-auto">
          <TimeCapsule items={items} />
        </div>
      </main>
    </div>
  )
}
