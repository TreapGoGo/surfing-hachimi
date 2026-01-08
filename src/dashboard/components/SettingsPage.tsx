import { useState, useEffect } from 'react';
import { Type, Moon, Sun, Monitor, Save, RotateCcw } from 'lucide-react';
import { getSettings, saveSettings } from '@/shared/utils/settings';
import type { AppSettings } from '@/shared/types';

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const handleSave = async (newSettings: AppSettings) => {
    setSaving(true);
    await saveSettings(newSettings);
    setSettings(newSettings);
    setSaving(false);
    setMessage('设置已保存');
    setTimeout(() => setMessage(''), 3000);
  };

  if (!settings) return null;

  return (
    <div className="max-w-2xl mx-auto p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800">偏好设置</h2>
        <p className="text-slate-500 mt-1">自定义您的浏览与管理体验</p>
      </div>

      <div className="space-y-8">
        {/* Font Size */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Type size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">字体大小</h3>
              <p className="text-xs text-slate-500">调整 Dashboard 与侧边栏的文字显示大小</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {(['small', 'medium', 'large'] as const).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => handleSave({ ...settings, fontSize: size })}
                className={`py-3 px-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                  settings.fontSize === size
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-slate-200'
                }`}
              >
                <span className={size === 'small' ? 'text-xs' : size === 'large' ? 'text-lg' : 'text-base'}>
                  Aa
                </span>
                <span className="text-xs font-medium">
                  {size === 'small' ? '较小' : size === 'large' ? '较大' : '标准'}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Theme - Coming Soon */}
        <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm opacity-60">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Sun size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">外观主题</h3>
              <p className="text-xs text-slate-500">深色模式正在开发中</p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1 p-3 rounded-xl border-2 border-slate-100 bg-slate-50 flex items-center justify-center gap-2 text-slate-400">
              <Sun size={16} /> <span className="text-xs">浅色</span>
            </div>
            <div className="flex-1 p-3 rounded-xl border-2 border-slate-100 bg-slate-50 flex items-center justify-center gap-2 text-slate-400">
              <Moon size={16} /> <span className="text-xs">深色</span>
            </div>
            <div className="flex-1 p-3 rounded-xl border-2 border-slate-100 bg-slate-50 flex items-center justify-center gap-2 text-slate-400">
              <Monitor size={16} /> <span className="text-xs">系统</span>
            </div>
          </div>
        </section>
      </div>

      {message && (
        <div className="fixed bottom-8 right-8 bg-slate-800 text-white px-4 py-2 rounded-lg shadow-lg text-sm animate-in fade-in slide-in-from-right-4">
          {message}
        </div>
      )}
    </div>
  );
}
