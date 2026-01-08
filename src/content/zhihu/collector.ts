import type { ContentItem } from '../../shared/types';

export class ZhihuCollector {
  /**
   * 从 DOM 元素中提取内容元数据
   * @param element 可能是 .ContentItem, .AnswerCard, .ArticleItem, .PinItem 等
   */
  collect(element: HTMLElement): ContentItem | null {
    if (!element) return null;

    try {
      // 如果当前元素不是内容节点，尝试在子元素中找内容节点
      let targetEl = element;
      if (!element.getAttribute('data-zop') && !element.classList.contains('ContentItem')) {
        const innerItem = element.querySelector('.ContentItem, [data-zop]');
        if (innerItem) targetEl = innerItem as HTMLElement;
      }

      // 1. 尝试从 data-zop 属性提取 (最准确)
      const dataZop = targetEl.getAttribute('data-zop');
      let zopData: any = {};
      if (dataZop) {
        try {
          zopData = JSON.parse(dataZop);
        } catch (e) {
          // ignore
        }
      }

      // 2. 确定类型
      let type: 'answer' | 'article' | 'pin' | 'video' = 'answer';
      if (zopData.type) {
        type = zopData.type;
      } else if (targetEl.classList.contains('ArticleItem')) {
        type = 'article';
      } else if (targetEl.classList.contains('PinItem')) {
        type = 'pin';
      } else if (targetEl.classList.contains('ZVideoItem')) {
        type = 'video';
      }

      // 3. 确定 ID
      let id = '';
      
      // 优先级 A: 如果是回答页，且当前元素是主回答容器，直接从 URL 提取
      if (window.location.href.includes('/answer/')) {
        const urlMatch = window.location.href.match(/\/answer\/(\d+)/);
        if (urlMatch) {
          const isMainContainer = targetEl.classList.contains('QuestionAnswer-content') || 
                                targetEl.querySelector('.QuestionAnswer-content') ||
                                targetEl.closest('.QuestionAnswer-content') ||
                                targetEl.classList.contains('AnswerCard');
          if (isMainContainer) {
            id = urlMatch[1];
          }
        }
      }

      // 优先级 B: 从 data-zop 提取
      if (!id && zopData.itemId) {
        id = String(zopData.itemId);
      }

      // 优先级 C: 从 meta 标签提取
      if (!id) {
        const urlMeta = targetEl.querySelector('meta[itemprop="url"]');
        if (urlMeta) {
          const content = urlMeta.getAttribute('content');
          const match = content?.match(/\/(answer|p|pin|video)\/(\d+)/);
          if (match) id = match[2];
        }
      }
      
      // 优先级 D: 从链接提取
      if (!id) {
        const titleLink = targetEl.querySelector('h2.ContentItem-title a, .ContentItem-title a, a[data-za-detail-view-element_name="Title"]') as HTMLAnchorElement;
        if (titleLink) {
          const match = titleLink.href.match(/\/(answer|p|pin|video)\/(\d+)/);
          if (match) id = match[2];
        }
      }

      if (!id) {
        logger.debug('[ZhihuCollector] Failed to find ID for element:', targetEl);
        return null;
      }

      // 4. 提取标题
      let title = zopData.title || '';
      if (!title) {
        const titleEl = targetEl.querySelector('.ContentItem-title');
        if (titleEl) title = titleEl.textContent?.trim() || '';
      }
      // 如果还没有标题，尝试从上下文找
      if (!title) {
        const questionTitle = document.querySelector('.QuestionHeader-title, .QuestionMainAction, .QuestionHeader-main .QuestionHeader-title');
        if (questionTitle) title = questionTitle.textContent?.trim() || '';
      }

      // 5. 提取作者
      let author = zopData.authorName || '';
      if (!author) {
        const authorEl = targetEl.querySelector('.UserLink-link, .AuthorInfo-name');
        if (authorEl) author = authorEl.textContent?.trim() || '';
      }

      // 6. 提取摘要
      let excerpt = '';
      // 增加对更多内容容器的支持，尤其是主回答
      const richContent = targetEl.querySelector('.RichContent-inner, .RichText, .Post-RichTextContainer, .zm-editable-content');
      if (richContent) {
        // 过滤掉不可见的元素和按钮文本
        const text = richContent.textContent || '';
        excerpt = text.replace(/展开阅读全文|收起/g, '').trim().slice(0, 100);
        if (excerpt) excerpt += '...';
      }

      const contentItem: ContentItem = {
        id,
        platform: 'zhihu',
        title,
        url: `https://www.zhihu.com/${type === 'answer' ? 'answer' : 'p'}/${id}`,
        author: {
          name: author
        },
        contentExcerpt: excerpt,
        metadata: {
          score: 0,
          category: type
        },
        actions: [],
        lastUpdated: Date.now(),
        firstSeen: Date.now()
      };

      return contentItem;

    } catch (error) {
      console.error('[Hachimi] Collector error:', error);
      return null;
    }
  }
}
