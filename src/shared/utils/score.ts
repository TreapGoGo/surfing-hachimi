import type { ContentItem, ActionType } from '../types';

const ZHIHU_SCORES: Partial<Record<ActionType, number>> = {
  view: 1,
  read_30s: 1,      // 阅读时长 > 30s
  open_comment: 1,  // 打开评论区
  upvote: 2,        // 赞同
  favorite: 2,      // 收藏
  star: 2,          // 收藏 (别名)
  like: 2,          // 喜欢
  comment: 3,       // 评论
  share: 3,         // 分享
};

const BILIBILI_SCORES: Partial<Record<ActionType, number>> = {
  view: 1,
  play_50: 1,       // 播放进度 > 50%
  play_90: 2,       // 播放进度 > 90%
  like: 2,          // 点赞
  coin: 3,          // 投币
  favorite: 2,      // 收藏
  star: 2,          // 收藏 (别名)
  triple: 6,        // 一键三连 (点赞+投币+收藏，额外 bonus)
  danmaku: 2,       // 弹幕
  comment: 3,       // 评论
  share: 3,         // 分享
};

export function calculateScore(item: ContentItem): number {
  let score = 0;
  
  const platformScores = item.platform === 'zhihu' ? ZHIHU_SCORES : BILIBILI_SCORES;
  
  // Deduplicate actions by type to prevent score inflation
  const seenTypes = new Set<ActionType>();
  
  // 基础信号分
  if (item.actions && item.actions.length > 0) {
    item.actions.forEach(action => {
      if (action.type === 'manual_score') return;
      
      if (!seenTypes.has(action.type)) {
        score += platformScores[action.type] || 0;
        seenTypes.add(action.type);
      }
    });
  } else {
    // 如果没有任何 action 但被记录了，至少给 1 分基础浏览分
    score = 1;
  }

  // 确保至少有 1 分（只要被记录了）
  score = Math.max(score, 1);

  // 主动评分 (最高优先级，直接累加)
  // +5/7/9/11
  if (item.metadata.manualScore) {
    score += item.metadata.manualScore;
  }

  return score;
}

export function getLevel(score: number): 1 | 2 | 3 | 4 {
  if (score >= 10) return 4; // 🌟 Active / High Value
  if (score >= 7) return 3;  // ⭐⭐⭐ Strong Interaction
  if (score >= 3) return 2;  // ⭐⭐ Interaction
  return 1;                  // ⭐ Viewed
}
