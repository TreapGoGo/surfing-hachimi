import { createRoot } from 'react-dom/client';
import { StrictMode } from 'react';
import FloatingBall from './components/FloatingBall';
import DebugLogger from './components/DebugLogger';
import { logger } from '@/shared/utils/logger';
import '@/styles/globals.css';

const hostname = window.location.hostname;

// 防止多次初始化
if ((window as any).__HACHIMI_INITIALIZED__) {
  logger.info('Surfing Hachimi already initialized, skipping...');
} else {
  (window as any).__HACHIMI_INITIALIZED__ = true;

  logger.info('🚀 Surfing Hachimi Activated', {
    platform: hostname.includes('zhihu.com') ? 'Zhihu' : 'Bilibili',
    time: new Date().toLocaleTimeString()
  });

  // 使用异步导入，彻底切断初始化阶段的依赖循环
  async function initObserver() {
    if (hostname.includes('zhihu.com')) {
      const { ZhihuObserver } = await import('./zhihu/observer');
      const observer = new ZhihuObserver();
      observer.init();
    } else if (hostname.includes('bilibili.com')) {
      const { BilibiliObserver } = await import('./bilibili/observer');
      const observer = new BilibiliObserver();
      observer.init();
    }
  }

  // 延迟启动业务逻辑
  setTimeout(initObserver, 500);

  // Inject UI with Shadow DOM to avoid style conflicts
  const initUI = () => {
    // Only inject in actual webpages, not side panel or other extension pages
    if (!window.location.protocol.startsWith('http')) {
      return;
    }

    const container = document.createElement('div');
    container.id = 'surfing-hachimi-container';
    // Use a very high z-index and fixed position to stay on top
    Object.assign(container.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '0',
      height: '0',
      zIndex: '2147483647',
      pointerEvents: 'none'
    });
    
    // Append to documentElement to avoid body style issues
    document.documentElement.appendChild(container);

    const shadow = container.attachShadow({ mode: 'open' });
    const root = document.createElement('div');
    root.id = 'surfing-hachimi-root';
    root.style.pointerEvents = 'auto'; // Re-enable pointer events for the UI
    shadow.appendChild(root);

    // Load Tailwind styles into Shadow DOM
    const styleLink = document.createElement('link');
    styleLink.rel = 'stylesheet';
    styleLink.href = chrome.runtime.getURL('assets/style.css');
    shadow.appendChild(styleLink);

    createRoot(root).render(
      <StrictMode>
        <FloatingBall />
        <DebugLogger />
      </StrictMode>
    );
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUI);
  } else {
    initUI();
  }
}
