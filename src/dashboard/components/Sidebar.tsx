import { BarChart, Search, FileText, Settings, Download, Upload, FlaskConical } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

interface SidebarProps {
  className?: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Sidebar({ className, activeTab, onTabChange }: SidebarProps) {
  const menuItems = [
    { id: 'home', icon: BarChart, label: '首页' },
    { id: 'search', icon: Search, label: '搜索' },
    { id: 'archive', icon: FileText, label: '归档' },
    { id: 'lab', icon: FlaskConical, label: '实验室' },
    { id: 'settings', icon: Settings, label: '设置' },
  ];

  const bottomItems = [
    { id: 'import', icon: Upload, label: '导入' },
    { id: 'export', icon: Download, label: '导出' },
  ];

  return (
    <div className={cn("w-[60px] flex flex-col items-center py-6 bg-white border-r border-slate-200 h-screen fixed left-0 top-0 z-10", className)}>
      <div className="mb-8 select-none cursor-pointer hover:scale-110 transition-transform" onClick={() => onTabChange('home')}>
        <img src="/logo.png" alt="logo" className="w-8 h-8 rounded-lg shadow-sm" />
      </div>
      
      <div className="flex-1 flex flex-col gap-6">
        {menuItems.map((item) => (
          <button 
            key={item.id}
            type="button"
            onClick={() => onTabChange(item.id)}
            className={cn(
              "p-2 rounded-xl transition-colors",
              activeTab === item.id ? "bg-blue-50 text-blue-600" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            )}
            title={item.label}
          >
            <item.icon size={20} />
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-6">
        {bottomItems.map((item) => (
          <button 
            key={item.label}
            type="button"
            className="text-slate-400 hover:text-slate-600 p-2 transition-colors"
            title={item.label}
          >
            <item.icon size={20} />
          </button>
        ))}
      </div>
    </div>
  );
}
