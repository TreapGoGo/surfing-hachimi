import { BarChart, Search, FileText, Settings, Download, Upload } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className }: SidebarProps) {
  const menuItems = [
    { icon: BarChart, label: '首页', active: true },
    { icon: Search, label: '搜索' },
    { icon: FileText, label: '归档' },
    { icon: Settings, label: '设置' },
  ];

  const bottomItems = [
    { icon: Upload, label: '导入' },
    { icon: Download, label: '导出' },
  ];

  return (
    <div className={cn("w-[60px] flex flex-col items-center py-6 bg-white border-r border-slate-200 h-screen fixed left-0 top-0 z-10", className)}>
      <div className="text-2xl mb-8 select-none">🏄</div>
      
      <div className="flex-1 flex flex-col gap-6">
        {menuItems.map((item) => (
          <button 
            key={item.label}
            className={cn(
              "p-2 rounded-xl transition-colors",
              item.active ? "bg-blue-50 text-blue-600" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
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
