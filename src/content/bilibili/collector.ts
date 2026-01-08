import type { ContentItem } from '@/shared/types';

export class BilibiliCollector {
  collect(): ContentItem | null {
    try {
      // Get BV ID from URL
      const match = window.location.pathname.match(/\/(BV\w+)/);
      if (!match) return null;
      const bvid = match[1];

      const title = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || document.title;
      const cover = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
      const url = document.querySelector('meta[property="og:url"]')?.getAttribute('content') || window.location.href;
      const authorName = document.querySelector('meta[name="author"]')?.getAttribute('content') || '';
      let authorUrl = '';
      const upLink = document.querySelector('.up-name, .name-text, a[href*="space.bilibili.com"]') as HTMLAnchorElement;
      if (upLink) {
        authorUrl = upLink.href;
        if (authorUrl && authorUrl.startsWith('//')) {
          authorUrl = 'https:' + authorUrl;
        }
      }
      
      const desc = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';

      // Views & Likes (try to find elements)
      let views = 0;
      let voteCount = 0;
      
      const viewEl = document.querySelector('.view-text') || document.querySelector('.view-count') || document.querySelector('.video-info-detail-list-item:first-child');
      if (viewEl && viewEl.textContent) {
        const viewText = viewEl.textContent.replace(/[^0-9万\.]/g, '');
        views = this.parseCount(viewText);
      }

      const likeEl = document.querySelector('.video-like-info') || document.querySelector('.like-text') || document.querySelector('.video-toolbar-left-item.like .info-text');
      if (likeEl && likeEl.textContent) {
        const likeText = likeEl.textContent.replace(/[^0-9万\.]/g, '');
        voteCount = this.parseCount(likeText);
      }

      let commentCount = 0;
      const commentEl = document.querySelector('.reply-navigation .nav-bar .nav-title-text') || document.querySelector('.total-reply');
      if (commentEl && commentEl.textContent) {
        const commentText = commentEl.textContent.replace(/[^0-9]/g, '');
        commentCount = parseInt(commentText, 10) || 0;
      }

      return {
        id: bvid,
        platform: 'bilibili',
        title: title.replace('_哔哩哔哩_bilibili', '').trim(),
        url,
        cover: cover.replace('http:', 'https:'),
        author: {
          name: authorName,
          url: authorUrl
        },
        contentExcerpt: desc.slice(0, 150),
        metadata: {
          score: 0,
          views,
          voteCount,
          commentCount
        },
        actions: [],
        lastUpdated: Date.now(),
        firstSeen: Date.now(),
      };
    } catch (e) {
      return null;
    }
  }

  private parseCount(str: string): number {
    if (!str) return 0;
    if (str.includes('万')) {
      return Math.round(parseFloat(str.replace('万', '')) * 10000);
    }
    return parseInt(str.replace(/[^0-9]/g, ''), 10) || 0;
  }
}
