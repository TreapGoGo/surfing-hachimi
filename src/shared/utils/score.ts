import type { ContentItem, ActionType } from '../types';

const ZHIHU_SCORES: Partial<Record<ActionType, number>> = {
  view: 1,
  read_30s: 1,
  like: 2,
  star: 2,
  comment: 3,
  open_comment: 1,
  share: 3,
};

const BILIBILI_SCORES: Partial<Record<ActionType, number>> = {
  view: 1,
  play_50: 1,
  play_90: 2,
  like: 2,
  coin: 3,
  star: 2,
  triple: 6,
  danmaku: 2,
  comment: 3,
  share: 3,
};

export function calculateScore(item: ContentItem): number {
  let score = 0;
  
  const platformScores = item.platform === 'zhihu' ? ZHIHU_SCORES : BILIBILI_SCORES;
  
  // Deduplicate actions by type to prevent score inflation (e.g. multiple views shouldn't skyrocket score)
  const seenTypes = new Set<ActionType>();
  
  item.actions.forEach(action => {
    if (action.type === 'manual_score') return; // Handled via metadata
    
    if (!seenTypes.has(action.type)) {
      score += platformScores[action.type] || 0;
      seenTypes.add(action.type);
    }
  });

  // Add manual score if present (Highest priority, additive as per table examples)
  // +10/12/14/16
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
