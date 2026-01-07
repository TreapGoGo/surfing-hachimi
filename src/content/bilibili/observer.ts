import { BilibiliCollector } from './collector';
import type { ContentItem, ActionType } from '@/shared/types';
import { logger } from '@/shared/utils/logger';

export class BilibiliObserver {
  collector: BilibiliCollector;

  private processedIds: Set<string> = new Set();

  constructor() {
    this.collector = new BilibiliCollector();
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
        if (progress > 50 && !video.dataset.hachimiHalfway) {
          video.dataset.hachimiHalfway = 'true';
          logger.success('Video milestone: 50% played');
          this.saveAction('read_30s'); // Reusing type for progress
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
        this.saveAction(type, true);
      } else {
        // New view, log it
        logger.success('[Bilibili] view', item);
        this.saveAction(type);
      }
    });
  }

  handleInteraction(e: MouseEvent) {
    const target = e.target as HTMLElement;
    
    // Bilibili buttons often have specific classes or text
    if (target.closest('.video-like') || target.closest('.like')) {
      logger.success('Action detected: Like');
      this.saveAction('like');
    }
    if (target.closest('.video-coin') || target.closest('.coin')) {
      logger.success('Action detected: Coin');
      this.saveAction('coin');
    }
    if (target.closest('.video-fav') || target.closest('.collect')) {
      logger.success('Action detected: Star');
      this.saveAction('star');
    }
    if (target.closest('.video-share') || target.closest('.share')) {
      logger.success('Action detected: Share');
      this.saveAction('share');
    }
  }

  saveAction(type: ActionType, silent = false) {
    const item = this.collector.collect();
    if (item) {
      if (!silent) {
        item.actions = [{ type, timestamp: Date.now() }];
      }
      const video = document.querySelector('video');
      if (video && video.duration) {
         item.metadata.duration = video.duration;
         item.metadata.userReadDuration = video.currentTime;
      }
      if (!silent) {
        logger.info(`Saving action: ${type}`, { id: item.id, title: item.title });
      }
      this.sendMessage(item);
    } else {
      logger.warn('Failed to collect video metadata');
    }
  }

  sendMessage(item: ContentItem) {
    try {
      chrome.runtime.sendMessage({ type: 'SAVE_ITEM', payload: item }, (response) => {
        if (chrome.runtime.lastError) {
          logger.error('Message failed (Runtime Error)', chrome.runtime.lastError);
        } else if (response?.success) {
          logger.success('Item saved to DB');
        } else {
          logger.error('Background failed to save item', response?.error);
        }
      });
    } catch (e) {
      logger.error('Failed to send message', e);
    }
  }
}
