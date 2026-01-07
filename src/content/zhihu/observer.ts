import { ZhihuCollector } from './collector';
import { logger } from '../../shared/utils/logger';
import { ContentItem } from '../../shared/types';

export class ZhihuObserver {
  private observer: IntersectionObserver | null = null;
  private collector: ZhihuCollector;
  private viewTimerMap: Map<string, number> = new Map();
  private observedElements: WeakSet<Element> = new WeakSet();
  private processedIds: Set<string> = new Set(); // 记录当前会话已处理的 ID

  constructor() {
    this.collector = new ZhihuCollector();
  }

  public init() {
    this.setupIntersectionObserver();
    this.startMutationObserver();
    this.setupClickListeners(); // 新增：点击事件监听
    
    // 针对回答直达页的主动检查
    this.checkMainAnswerOnLoad();
  }

  private setupClickListeners() {
    // 使用事件委托处理展开行为
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      
      // 1. 寻找是否点击了“阅读全文”或类似的展开按钮
      const expandBtn = target.closest('.ContentItem-more, .ContentItem-expandButton, .QuestionMainAction');
      if (expandBtn) {
        const itemEl = expandBtn.closest('.ContentItem, .ArticleItem, .PinItem, .ZVideoItem, .QuestionAnswer-content');
        if (itemEl) {
          // 点击展开后，稍等片刻待内容加载后再记录
          setTimeout(() => this.handleExpansion(itemEl as HTMLElement), 500);
        }
        return;
      }

      // 2. 某些情况下点击卡片本身也会展开（比如首页卡片）
      const cardEl = target.closest('.ContentItem, .ArticleItem');
      if (cardEl && !this.checkExpansionStandard(cardEl as HTMLElement)) {
        // 如果点击了卡片且当前是折叠状态，可能触发了展开
        setTimeout(() => this.handleExpansion(cardEl as HTMLElement), 1000);
      }
    }, true);
  }

  private handleExpansion(el: HTMLElement) {
    const item = this.collector.collect(el);
    if (!item || this.processedIds.has(item.id)) return;

    // 只要触发了展开，且没被记录过，就直接记录
    this.recordView(el, item);
  }

  private recordView(el: HTMLElement, item: ContentItem) {
    if (this.processedIds.has(item.id)) return;
    this.processedIds.add(item.id);

    // 无论数据库是否已有，只要是本页面第一次抓到，就正常显示 success 日志
    logger.success('[Zhihu] view', item);
    
    // 发送给后台存储，后台会自动处理 merge
    this.sendMessage(item);
  }

  private sendMessage(item: ContentItem, silent = false) {
    // 增加一个 view action
    if (!silent) {
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
      logger.debug('[ZhihuObserver] Collector returned null or empty id for element:', el);
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
        // 1. 如果是主回答，默认就是展开的
        isExpanded = true;
        waitTime = 500;
      } else {
        // 2. 如果是后续回答，检查是否已展开或本身就很短
        isExpanded = this.checkExpansionStandard(el);
        waitTime = 1000;
      }
    } else if (isHomePage) {
      // 首页卡片：必须是展开状态才算 view
      isExpanded = this.checkExpansionStandard(el);
      waitTime = 1500;
    } else {
      // 其他页面（问题页列表）：标准模式
      isExpanded = this.checkExpansionStandard(el);
      waitTime = 1000;
    }

    if (isExpanded) {
      if (this.viewTimerMap.has(item.id)) {
        logger.debug(`[ZhihuObserver] Timer already exists for id: ${item.id}`);
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
    
    // 如果离开视口，清除计时器
    if (this.viewTimerMap.has(item.id)) {
      clearTimeout(this.viewTimerMap.get(item.id));
      this.viewTimerMap.delete(item.id);
    }
  }

  /**
   * 严格模式（首页）：宁可漏杀，不可误杀
   * 只有探测到明确的“收起”按钮，才视为展开
   */
  private checkExpansionStrict(el: HTMLElement): boolean {
    // 1. 检查是否有“收起”按钮 (Text content check)
    // 这是一个非常重的检查，所以我们在前面尽量过滤
    const buttons = Array.from(el.querySelectorAll('button'));
    const hasCollapseBtn = buttons.some(b => {
      return b.innerText.includes('收起') && this.isElementVisible(b);
    });

    if (hasCollapseBtn) return true;

    // 2. 反向检查：如果有“阅读全文”，那肯定是折叠的
    const hasReadMore = buttons.some(b => {
      return (b.innerText.includes('阅读全文') || b.classList.contains('ContentItem-more')) && this.isElementVisible(b);
    });
    
    if (hasReadMore) return false;

    // 3. 既没有收起也没有阅读全文？
    // 可能是短内容（Pin/Video）。
    // 为了安全，我们假设它是折叠的，除非它是特定的短内容类型且高度很小
    // 但鉴于用户痛恨误报，我们这里直接返回 false
    return false;
  }

  /**
   * 标准模式（问题页）：默认宽容
   */
  private checkExpansionStandard(el: HTMLElement): boolean {
    // 1. 如果有“阅读全文”按钮且可见，说明没展开
    const moreBtn = el.querySelector('.ContentItem-more, .ContentItem-expandButton');
    if (moreBtn && (moreBtn as HTMLElement).offsetParent !== null) {
      return false;
    }

    // 2. 检查是否有折叠样式
    const richContent = el.querySelector('.RichContent');
    if (richContent && (richContent.classList.contains('RichContent--collapsed') || richContent.classList.contains('is-collapsed'))) {
      return false;
    }

    // 3. 如果以上都没有，或者内容已经完整显示（RichContent-inner 可见且无截断），判定为展开
    return true;
  }

  private isElementVisible(el: HTMLElement): boolean {
    return el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0;
  }

  private checkVisibility(el: HTMLElement): boolean {
    const rect = el.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    
    // 只要还在视口内（有一部分可见）
    return (
      rect.top <= windowHeight &&
      rect.bottom >= 0 &&
      rect.height > 0 &&
      rect.width > 0
    );
  }
}
