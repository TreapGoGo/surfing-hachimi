import type { ContentItem } from '../types';

/**
 * 统一的内容复制格式化工具
 * @param item 内容项
 * @param index 可选的序号（用于批量复制）
 */
export function formatContentForCopy(item: ContentItem, index?: number): string {
  const authorName = item.author?.name || '未知作者';
  const content = item.fullContent || item.contentExcerpt || '无正文内容';
  const prefix = index !== undefined ? `[${index}] ` : '';
  
  return `${prefix}问题：${item.title}
链接：${item.url}
作者：${authorName}

正文：
${content}`;
}
