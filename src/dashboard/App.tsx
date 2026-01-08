import Sidebar from './components/Sidebar';
import Waterfall from './components/Waterfall';
import TimeCapsule from './components/TimeCapsule';
import DeletePanel from './components/DeletePanel';
import SettingsPage from './components/SettingsPage';
import ResonanceLab from './pages/ResonanceLab';
import Toast from '@/shared/components/Toast';
import type { ToastType } from '@/shared/components/Toast';
import { cn } from '@/shared/utils/cn';
import { Search, Filter, Loader2, Trash2, ListChecks, X, ChevronDown, Clock, ChevronRight, Check, RotateCcw, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

const INTERACTION_OPTIONS = [
  // 评分标签 (现更名为评价)
  { label: '评价为必看', value: 'score_11', category: '评价' },
  { label: '评价为很棒', value: 'score_9', category: '评价' },
  { label: '评价为不错', value: 'score_7', category: '评价' },
  { label: '评价为还行', value: 'score_5', category: '评价' },
  // 阅读标签
  { label: '读了很久', value: 'read_30s', category: '阅读' },
  { label: '已阅', value: 'read_seen', category: '阅读' },
  // 交互标签
  { label: '赞过', value: 'upvote', category: '交互' },
  { label: '已喜欢', value: 'like', category: '交互' },
  { label: '已收藏', value: 'favorite', category: '交互' },
  { label: '已分享', value: 'share', category: '交互' },
  { label: '已评论', value: 'comment', category: '交互' },
  { label: '看过评论区', value: 'open_comment', category: '交互' },
  { label: '发过弹幕', value: 'danmaku', category: '交互' },
  { label: '一键三连', value: 'triple', category: '交互' },
];

const PLATFORM_OPTIONS = [
  { label: '知乎', value: 'zhihu' },
  { label: 'B站', value: 'bilibili' },
];
import { useEffect, useState, useRef } from 'react';
import { getAllItems, clearAllItems, deleteItemsBefore, deleteMultipleItems } from '@/shared/db';
import { getSettings, applySettingsToDOM } from '@/shared/utils/settings';
import { formatContentForCopy } from '@/shared/utils/format';
import type { ContentItem } from '@/shared/types';

const FILTER_OPTIONS = [
  { label: '最近1小时', value: '1h', ms: 1 * 60 * 60 * 1000 },
  { label: '最近4小时', value: '4h', ms: 4 * 60 * 60 * 1000 },
  { label: '最近12小时', value: '12h', ms: 12 * 60 * 60 * 1000 },
  { label: '最近1天', value: '1d', ms: 24 * 60 * 60 * 1000 },
  { label: '最近1周', value: '1w', ms: 7 * 24 * 60 * 60 * 1000 },
  { label: '最近1月', value: '1m', ms: 30 * 24 * 60 * 60 * 1000 },
  { label: '全部内容', value: 'all', ms: Infinity },
];

export default function App() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeletePanel, setShowDeletePanel] = useState(false);
  const [isDisintegrating, setIsDisintegrating] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [timeFilter, setTimeFilter] = useState(FILTER_OPTIONS[1]); // Default to 4h
  const [isTimeFilterOpen, setIsTimeFilterOpen] = useState(false);
  const timeFilterRef = useRef<HTMLDivElement>(null);

  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [activeSubMenu, setActiveSubMenu] = useState<'points' | 'evaluation' | 'read' | 'interaction' | 'platform' | null>(null);
  const [scoreRange, setScoreRange] = useState<[number, number]>([0, 20]);
  const [selectedInteractions, setSelectedInteractions] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const [toast, setToast] = useState<{ isVisible: boolean; message: string; type: ToastType }>({
    isVisible: false,
    message: '',
    type: 'success'
  });
  
  // 排序状态
  const [sortField, setSortField] = useState<'time' | 'score'>('time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);

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

    // 监听外部点击以关闭筛选器
    const handleClickOutside = (e: MouseEvent) => {
      if (timeFilterRef.current && !timeFilterRef.current.contains(e.target as Node)) {
        setIsTimeFilterOpen(false);
      }
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target as Node)) {
        setIsFilterMenuOpen(false);
        setActiveSubMenu(null);
      }
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setIsSortMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('hachimi-settings-updated' as any, handleSettingsUpdate);
      window.removeEventListener('hachimi-toast' as any, handleToastEvent);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const filteredItems = items.filter(item => {
    // 1. Time Filter
    let timeMatch = true;
    if (timeFilter.value !== 'all') {
      const now = Date.now();
      const itemTime = item.lastUpdated || 0;
      timeMatch = (now - itemTime) <= timeFilter.ms;
    }
    if (!timeMatch) return false;

    // 2. Score Range Filter
    const itemScore = item.metadata?.score || 0;
    if (itemScore < scoreRange[0] || itemScore > scoreRange[1]) return false;

    // 3. Interaction Filter (Evaluation, Read, Interaction)
    if (selectedInteractions.length > 0) {
      const hasMatch = selectedInteractions.some(val => {
        const actions = new Set(item.actions.map(a => a.type));
        
        switch(val) {
          case 'score_11': return item.metadata?.manualScore === 11;
          case 'score_9': return item.metadata?.manualScore === 9;
          case 'score_7': return item.metadata?.manualScore === 7;
          case 'score_5': return item.metadata?.manualScore === 5;
          case 'read_30s': return actions.has('read_30s');
          case 'read_seen': return !actions.has('read_30s') && (item.metadata?.userReadDuration || 0) > 10;
          case 'upvote': return actions.has('upvote');
          case 'like': return actions.has('like');
          case 'favorite': return actions.has('favorite') || actions.has('star');
          case 'share': return actions.has('share');
          case 'comment': return actions.has('comment');
          case 'open_comment': return actions.has('open_comment');
          case 'danmaku': return actions.has('danmaku');
          case 'triple': return actions.has('triple');
          default: return false;
        }
      });
      if (!hasMatch) return false;
    }

    // 4. Platform Filter
    if (selectedPlatforms.length > 0) {
      if (!selectedPlatforms.includes(item.platform)) return false;
    }

    return true;
  });

  // 5. Sorting Logic
  const sortedItems = [...filteredItems].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'time') {
      comparison = (a.lastUpdated || 0) - (b.lastUpdated || 0);
    } else if (sortField === 'score') {
      comparison = (a.metadata?.score || 0) - (b.metadata?.score || 0);
    }
    return sortOrder === 'desc' ? -comparison : comparison;
  });

  const toggleInteraction = (value: string) => {
    setSelectedInteractions(prev => 
      prev.includes(value) 
        ? prev.filter(v => v !== value) 
        : [...prev, value]
    );
  };

  const togglePlatform = (value: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(value) 
        ? prev.filter(v => v !== value) 
        : [...prev, value]
    );
  };

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

  const handleToggleSelectAll = () => {
    if (selectedIds.length === sortedItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sortedItems.map(item => item.id));
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
                    {loading ? '正在加载...' : `${filteredItems.length} 条内容`}
                    {timeFilter.value !== 'all' && items.length > filteredItems.length && (
                      <span className="ml-2 text-slate-400 font-normal">
                        (从 {items.length} 条中筛选)
                      </span>
                    )}
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  {!isSelectMode && (
                    <>
                      {/* 新增复合筛选工具 */}
                      <div className="relative" ref={filterMenuRef}>
                        <button 
                      onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 bg-white border rounded-lg transition-all shadow-sm hover:bg-slate-50",
                        (isFilterMenuOpen || selectedInteractions.length > 0 || selectedPlatforms.length > 0) ? "border-blue-200 text-blue-600" : "border-slate-200 text-slate-500"
                      )}
                    >
                      <Filter size={16} />
                      <span className="text-sm font-medium">高级筛选</span>
                    </button>

                    {isFilterMenuOpen && (
                      <div className="absolute top-full mt-2 left-0 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-[60] py-1 animate-in fade-in zoom-in-95 duration-200">
                        {[
                          { id: 'points', label: '按分数' },
                          { id: 'evaluation', label: '按评价', category: '评价' },
                          { id: 'read', label: '按阅读', category: '阅读' },
                          { id: 'interaction', label: '按交互', category: '交互' },
                          { id: 'platform', label: '按平台', category: '平台' },
                        ].map((menuItem) => (
                          <div 
                            key={menuItem.id}
                            className={cn(
                              "px-4 py-2 text-sm transition-colors flex items-center justify-between cursor-pointer group relative",
                              activeSubMenu === menuItem.id ? "bg-slate-50 text-blue-600" : "text-slate-600 hover:bg-slate-50"
                            )}
                            onMouseEnter={() => setActiveSubMenu(menuItem.id as any)}
                          >
                            <span className="font-medium">{menuItem.label}</span>
                            <ChevronRight size={14} className={cn(activeSubMenu === menuItem.id ? "text-blue-400" : "text-slate-400")} />

                                {/* 二级菜单 */}
                                {activeSubMenu === menuItem.id && (
                                  <div 
                                    className="absolute left-full top-0 ml-1 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-[70] py-1 animate-in fade-in slide-in-from-left-2 duration-200 before:absolute before:content-[''] before:-left-2 before:top-0 before:bottom-0 before:w-2"
                                    onMouseLeave={() => setActiveSubMenu(null)}
                                  >
                                    {menuItem.id === 'points' ? (
                                      <div className="px-4 py-4 space-y-4">
                                        <style>{`
                                          .range-slider::-webkit-slider-thumb {
                                            pointer-events: auto;
                                            appearance: none;
                                            width: 16px;
                                            height: 24px;
                                            cursor: grab;
                                          }
                                          .range-slider::-webkit-slider-thumb:active {
                                            cursor: grabbing;
                                          }
                                          .range-slider::-moz-range-thumb {
                                            pointer-events: auto;
                                            width: 16px;
                                            height: 24px;
                                            cursor: grab;
                                            border: none;
                                            background: transparent;
                                          }
                                        `}</style>
                                        <div className="flex flex-col gap-3">
                                          <div className="flex items-center justify-between gap-2">
                                            <div className="flex flex-col gap-1">
                                              <span className="text-[10px] text-slate-400 font-medium">最小值</span>
                                              <input 
                                                type="number" 
                                                min="0" 
                                                max="20" 
                                                value={scoreRange[0]}
                                                onChange={(e) => {
                                                  const val = Math.min(20, Math.max(0, parseInt(e.target.value) || 0));
                                                  setScoreRange([Math.min(val, scoreRange[1]), scoreRange[1]]);
                                                }}
                                                className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-blue-600 focus:outline-none focus:border-blue-300"
                                              />
                                            </div>
                                            <div className="flex flex-col gap-1 items-end">
                                              <span className="text-[10px] text-slate-400 font-medium">最大值</span>
                                              <input 
                                                type="number" 
                                                min="0" 
                                                max="20" 
                                                value={scoreRange[1]}
                                                onChange={(e) => {
                                                  const val = Math.min(20, Math.max(0, parseInt(e.target.value) || 0));
                                                  setScoreRange([scoreRange[0], Math.max(val, scoreRange[0])]);
                                                }}
                                                className="w-16 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-blue-600 focus:outline-none focus:border-blue-300 text-right"
                                              />
                                            </div>
                                          </div>

                                          <div className="px-1.5 pt-2 pb-1">
                                            <div className="relative h-2 bg-slate-100 rounded-sm border border-slate-200 group/track">
                                              {/* Track highlight */}
                                              <div 
                                                className="absolute h-full bg-blue-500/20 pointer-events-none"
                                                style={{ 
                                                  left: `${(scoreRange[0] / 20) * 100}%`, 
                                                  right: `${100 - (scoreRange[1] / 20) * 100}%` 
                                                }}
                                              />
                                              
                                              {/* Real Inputs (Invisible, only thumbs are clickable) */}
                                              <input 
                                                type="range" 
                                                min="0" 
                                                max="20" 
                                                value={scoreRange[0]} 
                                                onChange={(e) => {
                                                  const val = parseInt(e.target.value);
                                                  setScoreRange([Math.min(val, scoreRange[1]), scoreRange[1]]);
                                                }}
                                                className="range-slider absolute inset-y-0 -left-1.5 -right-1.5 w-[calc(100%+12px)] appearance-none bg-transparent pointer-events-none z-30"
                                              />
                                              <input 
                                                type="range" 
                                                min="0" 
                                                max="20" 
                                                value={scoreRange[1]} 
                                                onChange={(e) => {
                                                  const val = parseInt(e.target.value);
                                                  setScoreRange([scoreRange[0], Math.max(val, scoreRange[0])]);
                                                }}
                                                className="range-slider absolute inset-y-0 -left-1.5 -right-1.5 w-[calc(100%+12px)] appearance-none bg-transparent pointer-events-none z-20"
                                                style={{ 
                                                  zIndex: scoreRange[1] === scoreRange[0] && scoreRange[1] < 10 ? 31 : 20 
                                                }}
                                              />

                                              {/* Visual Thumbs */}
                                              <div 
                                                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-5 bg-white border-2 border-blue-500 rounded-sm shadow-md flex items-center justify-center pointer-events-none z-40"
                                                style={{ left: `${(scoreRange[0] / 20) * 100}%` }}
                                              >
                                                <div className="w-0.5 h-2 bg-blue-100 rounded-full" />
                                              </div>
                                              <div 
                                                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-5 bg-white border-2 border-blue-500 rounded-sm shadow-md flex items-center justify-center pointer-events-none z-40"
                                                style={{ left: `${(scoreRange[1] / 20) * 100}%` }}
                                              >
                                                <div className="w-0.5 h-2 bg-blue-100 rounded-full" />
                                              </div>
                                            </div>
                                          </div>

                                          <div className="pt-2 border-t border-slate-100">
                                            <button 
                                              onClick={() => setScoreRange([0, 20])}
                                              className="w-full py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors flex items-center justify-center gap-1.5"
                                            >
                                              <RotateCcw size={12} />
                                              恢复默认
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    ) : menuItem.id === 'platform' ? (
                                      PLATFORM_OPTIONS.map(opt => (
                                        <div 
                                          key={opt.value}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            togglePlatform(opt.value);
                                          }}
                                          className="px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer"
                                        >
                                          <span>{opt.label}</span>
                                          <div className={cn(
                                            "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                            selectedPlatforms.includes(opt.value) ? "bg-blue-500 border-blue-500" : "border-slate-300"
                                          )}>
                                            {selectedPlatforms.includes(opt.value) && <Check size={12} className="text-white" />}
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      INTERACTION_OPTIONS.filter(opt => opt.category === menuItem.category).map(opt => (
                                        <div 
                                          key={opt.value}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleInteraction(opt.value);
                                          }}
                                          className="px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer"
                                        >
                                          <span>{opt.label}</span>
                                          <div className={cn(
                                            "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                            selectedInteractions.includes(opt.value) ? "bg-blue-500 border-blue-500" : "border-slate-300"
                                          )}>
                                            {selectedInteractions.includes(opt.value) && <Check size={12} className="text-white" />}
                                          </div>
                                        </div>
                                      ))
                                    )}
                                    
                                    {/* 重置按钮 (针对交互类) */}
                                    {menuItem.id !== 'platform' && menuItem.id !== 'points' && selectedInteractions.some(val => 
                                      INTERACTION_OPTIONS.find(opt => opt.value === val)?.category === menuItem.category
                                    ) && (
                                      <div className="border-t border-slate-100 mt-1 pt-1">
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const categoryValues = INTERACTION_OPTIONS
                                              .filter(opt => opt.category === menuItem.category)
                                              .map(opt => opt.value);
                                            setSelectedInteractions(prev => prev.filter(v => !categoryValues.includes(v)));
                                          }}
                                          className="w-full px-4 py-2 text-left text-xs text-blue-500 hover:bg-blue-50 font-medium"
                                        >
                                          重置当前分类
                                        </button>
                                      </div>
                                    )}
                                    {/* 重置按钮 (针对平台) */}
                                    {menuItem.id === 'platform' && selectedPlatforms.length > 0 && (
                                      <div className="border-t border-slate-100 mt-1 pt-1">
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedPlatforms([]);
                                          }}
                                          className="w-full px-4 py-2 text-left text-xs text-blue-500 hover:bg-blue-50 font-medium"
                                        >
                                          重置平台筛选
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                          </div>
                        ))}
                      </div>
                    )}
                      </div>

                      {/* 时间筛选工具 */}
                      <div className="relative" ref={timeFilterRef}>
                        <button 
                          onClick={() => setIsTimeFilterOpen(!isTimeFilterOpen)}
                          className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
                        >
                          <Clock size={16} className={cn(timeFilter.value !== 'all' ? "text-blue-500" : "text-slate-400")} />
                          <span className="text-sm font-medium">{timeFilter.label}</span>
                          <ChevronDown size={14} className={cn("transition-transform duration-200", isTimeFilterOpen ? "rotate-180" : "")} />
                        </button>

                        {isTimeFilterOpen && (
                          <div className="absolute top-full mt-2 left-0 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-[60] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="py-1">
                              {FILTER_OPTIONS.map(option => (
                                <button
                                  key={option.value}
                                  onClick={() => {
                                    setTimeFilter(option);
                                    setIsTimeFilterOpen(false);
                                  }}
                                  className={cn(
                                    "w-full px-4 py-2 text-left text-sm transition-colors flex items-center justify-between",
                                    timeFilter.value === option.value 
                                      ? "bg-blue-50 text-blue-600 font-medium" 
                                      : "text-slate-600 hover:bg-slate-50"
                                  )}
                                >
                                  {option.label}
                                  {timeFilter.value === option.value && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                    )}

                    {!isSelectMode && (
                      /* 排序规则工具 */
                      <div className="relative" ref={sortMenuRef}>
                        <button 
                          onClick={() => setIsSortMenuOpen(!isSortMenuOpen)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 bg-white border rounded-lg transition-all shadow-sm hover:bg-slate-50",
                            isSortMenuOpen ? "border-blue-200 text-blue-600" : "border-slate-200 text-slate-500"
                          )}
                        >
                          <ArrowUpDown size={16} />
                          <span className="text-sm font-medium">排序规则</span>
                        </button>

                        {isSortMenuOpen && (
                          <div className="absolute top-full mt-2 right-0 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-[60] py-1 animate-in fade-in zoom-in-95 duration-200">
                            <div className="px-2 py-1.5 border-b border-slate-100 mb-1">
                              <div className="flex bg-slate-100 p-1 rounded-lg">
                                <button 
                                  onClick={() => setSortOrder('desc')}
                                  className={cn(
                                    "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-bold transition-all",
                                    sortOrder === 'desc' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                  )}
                                >
                                  <ArrowDown size={14} />
                                  降序
                                </button>
                                <button 
                                  onClick={() => setSortOrder('asc')}
                                  className={cn(
                                    "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-bold transition-all",
                                    sortOrder === 'asc' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                  )}
                                >
                                  <ArrowUp size={14} />
                                  升序
                                </button>
                              </div>
                            </div>
                            {[
                              { id: 'time', label: '按浏览时间' },
                              { id: 'score', label: '按分数' },
                            ].map((option) => (
                              <button
                                key={option.id}
                                onClick={() => {
                                  setSortField(option.id as any);
                                  setIsSortMenuOpen(false);
                                }}
                                className={cn(
                                  "w-full px-4 py-2 text-left text-sm transition-colors flex items-center justify-between",
                                  sortField === option.id 
                                    ? "bg-blue-50 text-blue-600 font-bold" 
                                    : "text-slate-600 hover:bg-slate-50 font-medium"
                                )}
                              >
                                {option.label}
                                {sortField === option.id && <Check size={14} />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                      {isSelectMode ? (
                    <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100 animate-in fade-in slide-in-from-right-4">
                      <span className="text-sm font-medium text-blue-600 mr-2">已选中 {selectedIds.length} 项</span>
                      <button 
                        onClick={handleToggleSelectAll}
                        className="px-3 py-1 bg-white border border-blue-200 text-blue-600 text-xs font-bold rounded-lg hover:bg-blue-50 transition-colors shadow-sm"
                      >
                        {selectedIds.length === sortedItems.length ? '全不选' : '全选'}
                      </button>
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
                      className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm group"
                      title="开启多选模式"
                    >
                      <ListChecks size={16} className="group-active:scale-90 transition-transform" />
                      <span className="text-sm font-medium">批量操作</span>
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
                </div>
              </div>

              <div className="max-w-5xl mx-auto">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-32 text-slate-400 gap-4">
                    <Loader2 className="animate-spin" size={32} />
                    <p className="text-sm font-medium">正在读取本地数据库...</p>
                  </div>
                ) : sortedItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-32 text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl">
                    <p className="text-sm">
                      {timeFilter.value === 'all' 
                        ? '暂无记录，快去知乎或B站逛逛吧 🏄' 
                        : `该时间段 (${timeFilter.label}) 内暂无记录`}
                    </p>
                    {timeFilter.value !== 'all' && (
                      <button 
                        onClick={() => setTimeFilter(FILTER_OPTIONS.find(o => o.value === 'all')!)}
                        className="mt-4 text-blue-500 hover:text-blue-600 text-sm font-medium"
                      >
                        查看全部内容
                      </button>
                    )}
                  </div>
                ) : (
                  <Waterfall 
                    items={sortedItems} 
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
