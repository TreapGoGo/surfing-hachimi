import type { AppSettings } from '../types';

const DEFAULT_SETTINGS: AppSettings = {
  fontSize: 'medium',
  theme: 'light'
};

export async function getSettings(): Promise<AppSettings> {
  if (typeof chrome === 'undefined' || !chrome.storage) {
    return DEFAULT_SETTINGS;
  }
  
  return new Promise((resolve) => {
    chrome.storage.local.get(['app_settings'], (result) => {
      resolve(result.app_settings || DEFAULT_SETTINGS);
    });
  });
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.storage) {
    return;
  }
  
  return new Promise((resolve) => {
    chrome.storage.local.set({ app_settings: settings }, () => {
      resolve();
      // 广播设置更新
      window.dispatchEvent(new CustomEvent('hachimi-settings-updated', { detail: settings }));
    });
  });
}

// 获取字体大小对应的像素值或缩放比例
export function getFontSizeClass(size: AppSettings['fontSize']): string {
  switch (size) {
    case 'small': return 'text-[0.9em]';
    case 'large': return 'text-[1.1em]';
    default: return 'text-base';
  }
}

// 应用设置到 body 的 CSS 变量
export function applySettingsToDOM(settings: AppSettings) {
  const root = document.documentElement;
  
  // 处理字体大小
  const sizeMap = {
    small: '14px',
    medium: '16px',
    large: '18px'
  };
  
  // 直接设置根元素的字体大小，这样 rem 单位就会自动缩放
  root.style.fontSize = sizeMap[settings.fontSize] || '16px';
  root.style.setProperty('--hachimi-base-font-size', sizeMap[settings.fontSize] || '16px');
}
