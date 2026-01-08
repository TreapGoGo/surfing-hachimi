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

      // Views (try to find element)
      let views = 0;
      const viewEl = document.querySelector('.view-text') || document.querySelector('.view');
      if (viewEl && viewEl.textContent) {
        views = parseInt(viewEl.textContent.replace(/[^0-9]/g, '')) || 0;
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
        },
        actions: [],
        lastUpdated: Date.now(),
        firstSeen: Date.now(),
      };
    } catch (e) {
      return null;
    }
  }
}
