import { BilibiliCollector } from './collector';
import type { ContentItem, ActionType } from '@/shared/types';
import { logger } from '@/shared/utils/logger';

export class BilibiliObserver {
  collector: BilibiliCollector;

  private processedIds: Set<string> = new Set();

  constructor() {
    this.collector = new BilibiliCollector();

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

  private handleManualScore(id: string, score: number) {
    const action = { type: 'manual_score' as ActionType, timestamp: Date.now(), payload: score };
    
    const updateItem = {
      id,
      platform: 'bilibili',
      actions: [action],
      metadata: { manualScore: score }
    } as any;

    this.sendMessage(updateItem);
  }

  private handleExempt(id: string) {
    logger.info(`[Bilibili] User exempt item: ${id}`);
    
    // 通知后台删除该记录
    chrome.runtime.sendMessage({ type: 'DELETE_ITEM', payload: { id } }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[Hachimi] Delete failed:', chrome.runtime.lastError);
      } else {
        logger.success(`[Bilibili] Item ${id} has been exempted and deleted from database`);
      }
    });
  }

  private triggerFeedback(id: string) {
    window.dispatchEvent(new CustomEvent('SURFING_HACHIMI_SHOW_FEEDBACK', {
      detail: { id }
    }));
  }

  init() {
    logger.info('BilibiliObserver init: monitoring video player...');
    this.observeVideo();
    // Re-check on URL change (SPA)
    let lastUrl = location.href;
    const mo = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        logger.info('Bilibili URL changed, re-initializing player observer');
        this.observeVideo();
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
    
    document.body.addEventListener('click', this.handleInteraction.bind(this));
    
    // 监听弹幕发送
    this.setupDanmakuObserver();
  }

  private setupDanmakuObserver() {
    // 监听弹幕发送按钮点击
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('.bili-dm-btn-send') || target.innerText === '发送') {
        const input = document.querySelector('.bili-dm-input') as HTMLInputElement;
        if (input && input.value.trim()) {
          logger.success('Action detected: Danmaku');
          this.saveAction('danmaku');
          const item = this.collector.collect();
          if (item) {
            this.triggerFeedback(item.id);
          }
        }
      }
    }, true);
  }

  private observeVideo() {
    const video = document.querySelector('video');
    if (video && !video.dataset.hachimiObserved) {
      video.dataset.hachimiObserved = 'true';
      logger.success('Bilibili video player found');

      video.addEventListener('play', () => {
        logger.info('Video play detected');
        this.recordView('view');
      });

      video.addEventListener('timeupdate', () => {
        const progress = (video.currentTime / video.duration) * 100;
        
        // 50% 进度
        if (progress > 50 && !video.dataset.hachimiHalfway) {
          video.dataset.hachimiHalfway = 'true';
          logger.success('Video milestone: 50% played');
          this.saveAction('play_50', true);
        }

        // 90% 进度
        if (progress > 90 && !video.dataset.hachimiFinished) {
          video.dataset.hachimiFinished = 'true';
          logger.success('Video milestone: 90% played (Finished)');
          this.saveAction('play_90', true);
        }
      });
    }
  }

  private recordView(type: ActionType) {
    const item = this.collector.collect();
    if (!item) return;

    if (this.processedIds.has(item.id)) return;
    this.processedIds.add(item.id);

    chrome.runtime.sendMessage({ type: 'CHECK_EXISTENCE', payload: { id: item.id } }, (response) => {
      if (response && response.exists) {
        // Already exists, save silently
        this.saveAction(type, true, item);
      } else {
        // New view, log it
        logger.success('[Bilibili] view', item);
        this.saveAction(type, false, item);
      }
    });
  }

  handleInteraction(e: MouseEvent) {
    const target = e.target as HTMLElement;
    
    const likeBtn = target.closest('.video-like, .like');
    if (likeBtn) {
      logger.success('Action detected: Like');
      this.saveAction('like');
      const item = this.collector.collect();
      if (item) this.triggerFeedback(item.id);
      
      setTimeout(() => {
        if (likeBtn.classList.contains('on') || likeBtn.querySelector('.on')) {
          const coinBtn = document.querySelector('.video-coin, .coin');
          const favBtn = document.querySelector('.video-fav, .collect');
          if (coinBtn?.classList.contains('on') && favBtn?.classList.contains('on')) {
            logger.success('Action detected: TRIPLE COMBO!');
            this.saveAction('triple');
          }
        }
      }, 2000);
    }

    if (target.closest('.video-coin, .coin')) {
      logger.success('Action detected: Coin');
      this.saveAction('coin');
      const item = this.collector.collect();
      if (item) this.triggerFeedback(item.id);
    }
    if (target.closest('.video-fav, .collect')) {
      logger.success('Action detected: Star');
      this.saveAction('favorite');
      const item = this.collector.collect();
      if (item) this.triggerFeedback(item.id);
    }
    if (target.closest('.video-share, .share')) {
      logger.success('Action detected: Share');
      this.saveAction('share');
      const item = this.collector.collect();
      if (item) this.triggerFeedback(item.id);
    }
    if (target.closest('.reply-box-send, .send-button')) {
      logger.success('Action detected: Comment');
      this.saveAction('comment');
      const item = this.collector.collect();
      if (item) this.triggerFeedback(item.id);
    }
  }

  saveAction(type: ActionType, silent = false, existingItem?: ContentItem) {
    const item = existingItem || this.collector.collect();
    if (item) {
      item.actions = [{ type, timestamp: Date.now() }];
      const video = document.querySelector('video');
      if (video && video.duration) {
         item.metadata.duration = video.duration;
         item.metadata.userReadDuration = video.currentTime;
      }
      this.sendMessage(item, silent);
    } else {
      logger.warn('Failed to collect video metadata');
    }
  }

  sendMessage(item: ContentItem, silent = false) {
    try {
      if (!silent) {
        logger.success(`[Bilibili] Message sent: ${item.actions?.[0]?.type || 'update'}`, item);
      }
      chrome.runtime.sendMessage({ type: 'SAVE_ITEM', payload: item }, (response) => {
        if (chrome.runtime.lastError) {
          logger.error('Message failed (Runtime Error)', chrome.runtime.lastError);
        } else if (response?.success) {
          if (!silent) logger.success('Item saved to DB');
        } else {
          logger.error('Background failed to save item', response?.error);
        }
      });
    } catch (e) {
      logger.error('Failed to send message', e);
    }
  }
}
