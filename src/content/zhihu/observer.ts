import { ZhihuCollector } from './collector';
import { logger } from '../../shared/utils/logger';
import type { ContentItem, ActionType } from '../../shared/types';

export class ZhihuObserver {
  private observer: IntersectionObserver | null = null;
  private collector: ZhihuCollector;
  private viewTimerMap: Map<string, number> = new Map();
  private readDurationTimers: Map<string, NodeJS.Timeout> = new Map(); // 30s 阅读计时器
  private observedElements: WeakSet<Element> = new WeakSet();
  private processedIds: Set<string> = new Set(); // 记录当前会话已处理的 ID

  constructor() {
    this.collector = new ZhihuCollector();
    
    // 监听主动评分事件
    window.addEventListener('SURFING_HACHIMI_MANUAL_SCORE', ((e: CustomEvent) => {
      const { id, score } = e.detail;
      this.handleManualScore(id, score);
    }) as EventListener);

    // 监听不记录事件
    window.addEventListener('SURFING_HACHIMI_EXEMPT', ((e: CustomEvent) => {
      const { id } = e.detail;
      this.handleExempt(id);
    }) as EventListener);
  }

  public init() {
    this.setupIntersectionObserver();
    this.startMutationObserver();
    this.setupClickListeners(); // 包含展开和互动监听
    
    // 针对回答直达页的主动检查
    this.checkMainAnswerOnLoad();
  }

  private setupClickListeners() {
    // 使用事件委托处理所有点击行为
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      
      // --- 1. 展开行为监测 ---
      const expandBtn = target.closest('.ContentItem-more, .ContentItem-expandButton, .QuestionMainAction');
      if (expandBtn) {
        const itemEl = expandBtn.closest('.ContentItem, .ArticleItem, .PinItem, .ZVideoItem, .QuestionAnswer-content');
        if (itemEl) {
          setTimeout(() => this.handleExpansion(itemEl as HTMLElement), 500);
        }
        // 不 return，继续检查是否也是互动行为（虽然不太可能重叠）
      }

      const cardEl = target.closest('.ContentItem, .ArticleItem');
      if (cardEl && !this.checkExpansionStandard(cardEl as HTMLElement)) {
        setTimeout(() => this.handleExpansion(cardEl as HTMLElement), 1000);
      }

      // --- 2. 互动行为监测 ---
      // 必须在卡片内部
      const contentItemEl = target.closest('.ContentItem, .ArticleItem, .PinItem, .ZVideoItem, .QuestionAnswer-content');
      if (!contentItemEl) return;

      const item = this.collector.collect(contentItemEl as HTMLElement);
      if (!item) return;

      // 向上查找按钮
      const btn = target.closest('button');
      if (!btn) return;

      this.handleInteractionClick(btn as HTMLElement, item);

    }, true);
  }

  private handleInteractionClick(btn: HTMLElement, item: ContentItem) {
    let actionType: ActionType | null = null;
    let scoreDelta = 0;
    const text = btn.innerText || '';

    // 赞同 (VoteButton)
    if (btn.classList.contains('VoteButton') || text.includes('赞同')) {
      // 检查是否是取消赞同（假设点击前是 active，点击后变成 inactive，或者反之）
      const isActive = btn.classList.contains('is-active');
      if (isActive) {
        actionType = 'unvote'; // 取消赞同
      } else {
        actionType = 'upvote';
        scoreDelta = 2;
      }
    }
    // 收藏
    else if (text.includes('收藏')) {
       actionType = 'favorite';
       scoreDelta = 2;
    }
    // 喜欢
    else if (text.includes('喜欢')) {
      actionType = 'like';
      scoreDelta = 2;
    }
    // 分享
    else if (text.includes('分享')) {
      actionType = 'share';
      scoreDelta = 3;
    }
    // 打开评论区
    else if (text.includes('评论')) {
      actionType = 'open_comment'; 
      scoreDelta = 1;
    }
    // 发送评论
    else if (text.includes('发布')) {
      actionType = 'comment';
      scoreDelta = 3;
    }

    if (actionType) {
      // 记录行为
      this.recordAction(item, actionType, scoreDelta, { source: 'click' });
      
      // 触发评分框 (仅针对正向高价值行为)
      if (['upvote', 'favorite', 'like', 'share', 'comment'].includes(actionType) && scoreDelta > 0) {
        this.triggerFeedback(item.id);
      }
    }
  }

  private recordAction(item: ContentItem, type: ActionType, scoreAdd: number = 0, payload: any = {}) {
    logger.success(`[Zhihu] Action: ${type}`, { ...item, excerpt: item.contentExcerpt });
    
    const action = {
      type,
      timestamp: Date.now(),
      payload
    };

    // 构造更新用的 Item
    const updateItem = {
      ...item,
      actions: [action]
    };

    this.sendMessage(updateItem, true); // silent=true, 避免重复打印 view 日志
  }

  private handleManualScore(id: string, score: number) {
    const action = { type: 'manual_score' as ActionType, timestamp: Date.now(), metadata: { score } };
    
    // 构造一个最小的 ContentItem 用于更新
    const updateItem = {
      id,
      platform: 'zhihu',
      actions: [action],
      metadata: { manualScore: score }
    } as any; 

    this.sendMessage(updateItem, true);
  }

  private handleExempt(id: string) {
    logger.info(`[Zhihu] User exempt item: ${id}`);
    
    // 1. 从已处理集合中移除，允许以后再次记录（如果用户改变主意或刷新）
    this.processedIds.delete(id);
    
    // 2. 清除相关的阅读计时器
    this.clearReadTimer(id);
    
    // 3. 通知后台删除该记录
    chrome.runtime.sendMessage({ type: 'DELETE_ITEM', payload: { id } }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[Hachimi] Delete failed:', chrome.runtime.lastError);
      } else {
        logger.success(`[Zhihu] Item ${id} has been exempted and deleted from database`);
      }
    });
  }

  private triggerFeedback(id: string) {
    window.dispatchEvent(new CustomEvent('SURFING_HACHIMI_SHOW_FEEDBACK', {
      detail: { id }
    }));
  }

  private handleExpansion(el: HTMLElement) {
    const item = this.collector.collect(el);
    if (!item || this.processedIds.has(item.id)) return;
    this.recordView(el, item);
  }

  private recordView(el: HTMLElement, item: ContentItem) {
    if (this.processedIds.has(item.id)) return;
    this.processedIds.add(item.id);

    logger.success('[Zhihu] view', item);
    this.sendMessage(item);
    
    // 触发阅读计时
    this.startReadTimer(item.id, el);
  }

  private startReadTimer(id: string, el: HTMLElement) {
    if (this.readDurationTimers.has(id)) return;

    const timer = setTimeout(() => {
      logger.success('[Zhihu] Read > 30s', { id });
      
      // 尝试重新收集以获取最新状态，如果失败则构建最小对象
      let item = this.collector.collect(el);
      if (!item) {
          item = { id, platform: 'zhihu', title: 'Unknown' } as any;
      }
      
      if (item) {
          this.recordAction(item, 'read_30s', 1);
          this.triggerFeedback(id);
      }
      
      this.readDurationTimers.delete(id);
    }, 30000); // 30s

    this.readDurationTimers.set(id, timer);
  }

  private clearReadTimer(id: string) {
    const timer = this.readDurationTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.readDurationTimers.delete(id);
    }
  }

  private sendMessage(item: ContentItem, silent = false) {
    if (!silent && !item.actions) {
      item.actions = [{ type: 'view', timestamp: Date.now() }];
    }
    
    chrome.runtime.sendMessage({ type: 'SAVE_ITEM', payload: item }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[Hachimi] Save failed:', chrome.runtime.lastError);
      }
    });
  }

  private setupIntersectionObserver() {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.handleIntersection(entry.target as HTMLElement);
        } else {
          this.handleExit(entry.target as HTMLElement);
        }
      });
    }, {
      threshold: [0, 0.1]
    });
  }

  private startMutationObserver() {
    const observer = new MutationObserver((mutations) => {
      let shouldScan = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          shouldScan = true;
          break;
        }
      }
      if (shouldScan) {
        this.scanElements();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  private checkMainAnswerOnLoad() {
    if (window.location.href.includes('/answer/')) {
      let retryCount = 0;
      const interval = setInterval(() => {
        // 主回答可能在 .QuestionAnswer-content 或 .AnswerCard 中
        const mainAnswer = document.querySelector('.QuestionAnswer-content, .AnswerCard');
        if (mainAnswer) {
          logger.info('Main answer container found, triggering check...');
          this.handleIntersection(mainAnswer as HTMLElement);
          clearInterval(interval);
        }
        if (++retryCount > 20) clearInterval(interval); // 最多等 10s
      }, 500);
    }
  }

  private scanElements() {
    // 增加对 QuestionAnswer-content 的扫描
    const elements = document.querySelectorAll('.ContentItem, .ArticleItem, .PinItem, .ZVideoItem, .QuestionAnswer-content');
    elements.forEach(el => {
      if (!this.observedElements.has(el)) {
        this.observer?.observe(el);
        this.observedElements.add(el);
      }
    });
  }

  private handleIntersection(el: HTMLElement) {
    const item = this.collector.collect(el);
    if (!item || !item.id) {
      // logger.debug('[ZhihuObserver] Collector returned null or empty id for element:', el);
      return;
    }

    const url = window.location.href;
    const isHomePage = url === 'https://www.zhihu.com/' || url.includes('zhihu.com/hot') || url.includes('zhihu.com/follow');
    const isAnswerPage = /\/question\/\d+\/answer\/\d+/.test(url);
    
    let isExpanded = false;
    let waitTime = 1000;

    if (isAnswerPage) {
      const match = url.match(/\/answer\/(\d+)/);
      const mainAnswerId = match ? match[1] : null;
      
      if (item.id === mainAnswerId) {
        isExpanded = true;
        waitTime = 500;
      } else {
        isExpanded = this.checkExpansionStandard(el);
        waitTime = 1000;
      }
    } else if (isHomePage) {
      isExpanded = this.checkExpansionStandard(el);
      waitTime = 1500;
    } else {
      isExpanded = this.checkExpansionStandard(el);
      waitTime = 1000;
    }

    if (isExpanded) {
      // 如果已经在 view 计时中，不管
      if (this.viewTimerMap.has(item.id)) return;
      
      // 如果已经记录过 view，这里主要负责恢复 readTimer (如果需要累计时长)
      // 目前策略：已记录过 view，则重新启动 readTimer (30s 倒计时)
      // 这样用户划走再回来，会重新开始 30s 计时。符合“单次连续阅读 > 30s”
      if (this.processedIds.has(item.id)) {
        this.startReadTimer(item.id, el);
        return; 
      }

      const timer = window.setTimeout(() => {
        const isVisible = this.checkVisibility(el);
        if (isVisible) {
          this.recordView(el, item);
        }
        this.viewTimerMap.delete(item.id);
      }, waitTime);

      this.viewTimerMap.set(item.id, timer as unknown as number);
    }
  }

  private handleExit(el: HTMLElement) {
    const item = this.collector.collect(el);
    if (!item) return;
    
    // 如果离开视口，清除 view 计时器
    if (this.viewTimerMap.has(item.id)) {
      clearTimeout(this.viewTimerMap.get(item.id));
      this.viewTimerMap.delete(item.id);
    }
    
    // 清除 read 计时器
    this.clearReadTimer(item.id);
  }

  private checkExpansionStrict(el: HTMLElement): boolean {
    const buttons = Array.from(el.querySelectorAll('button'));
    const hasCollapseBtn = buttons.some(b => {
      return b.innerText.includes('收起') && this.isElementVisible(b);
    });

    if (hasCollapseBtn) return true;

    const hasReadMore = buttons.some(b => {
      return (b.innerText.includes('阅读全文') || b.classList.contains('ContentItem-more')) && this.isElementVisible(b);
    });
    
    if (hasReadMore) return false;

    return false;
  }

  private checkExpansionStandard(el: HTMLElement): boolean {
    const moreBtn = el.querySelector('.ContentItem-more, .ContentItem-expandButton');
    if (moreBtn && (moreBtn as HTMLElement).offsetParent !== null) {
      return false;
    }

    const richContent = el.querySelector('.RichContent');
    if (richContent && (richContent.classList.contains('RichContent--collapsed') || richContent.classList.contains('is-collapsed'))) {
      return false;
    }

    return true;
  }

  private isElementVisible(el: HTMLElement): boolean {
    return el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0;
  }

  private checkVisibility(el: HTMLElement): boolean {
    const rect = el.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    
    return (
      rect.top <= windowHeight &&
      rect.bottom >= 0 &&
      rect.height > 0 &&
      rect.width > 0
    );
  }
}
