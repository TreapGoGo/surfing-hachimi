import type { ContentItem, ActionType } from '@/shared/types';

/**
 * 能量权重配置
 */
const ENERGY_WEIGHTS: Record<string, number> = {
  // 高能互动
  copy: 5,
  share: 15,
  triple: 15,
  coin: 5,
  
  // 中能互动
  favorite: 8,
  star: 8,
  comment: 8,
  danmaku: 8,
  open_comment: 4,
  
  // 基础互动
  upvote: 5,
  like: 3,
  
  // 消费行为
  read_30s: 5,
  play_90: 8,
  play_50: 3,
};

/**
 * 计算内容的“共鸣权重”
 * Hachimi Resonance Algorithm v1.0
 */
export function calculateResonanceWeight(item: ContentItem): number {
  // 1. 能量积累 (Energy)
  let energy = 1; // 基础分
  
  // 意志分 (Manual Score)
  if (item.metadata.manualScore) {
    energy += (item.metadata.manualScore - 5) * 5;
  }
  
  // 行为分 (Interaction + Consumption)
  const actionTypes = new Set(item.actions.map(a => a.type));
  
  // Copy 行为特殊处理：由于 copy 可能不在 actions 数组里（如果还没迁移数据），
  // 但我们这里假设 copy 会作为 action 记录。
  // 注意：copy 权重仅计算一次，去重
  actionTypes.forEach(type => {
    if (ENERGY_WEIGHTS[type]) {
      energy += ENERGY_WEIGHTS[type];
    }
  });
  
  // 2. 时间衰变 (Decay / Cooling)
  let coolingFactor = 1;
  if (item.metadata.lastShownAt) {
    const gap = Date.now() - item.metadata.lastShownAt;
    // K = 24h / E. 能量越高，K越小，冷却越快
    // 限制 E 最小为 1，防止除零
    const effectiveEnergy = Math.max(1, energy);
    const K = (24 * 60 * 60 * 1000) / effectiveEnergy;
    coolingFactor = 1 - Math.exp(-gap / K);
  }
  
  // 3. 反馈调节 (Immunity)
  const showCount = item.metadata.capsuleShowCount || 0;
  const clickCount = item.metadata.capsuleClickCount || 0;
  
  // 每次露脸，分母+1；每次点击，分母-3 (大幅奖励)
  // Math.max(0.1, ...) 保证分母不为负或零
  const immunityDenominator = Math.max(0.1, 1 + (showCount - clickCount * 3));
  const immunityFactor = 1 / immunityDenominator;
  
  return energy * coolingFactor * immunityFactor;
}

/**
 * 加权随机选择
 */
export function selectCapsuleItems(items: ContentItem[], count: number): ContentItem[] {
  if (items.length <= count) return items;
  
  // 计算所有项的权重
  const weightedItems = items.map(item => ({
    item,
    weight: calculateResonanceWeight(item)
  }));
  
  const selected: ContentItem[] = [];
  const taken = new Set<string>();
  
  for (let i = 0; i < count; i++) {
    // 计算当前总权重
    let totalWeight = 0;
    const candidates = weightedItems.filter(wi => !taken.has(wi.item.id));
    
    if (candidates.length === 0) break;
    
    candidates.forEach(wi => totalWeight += wi.weight);
    
    // 随机点
    let random = Math.random() * totalWeight;
    
    // 寻找命中项
    for (const candidate of candidates) {
      random -= candidate.weight;
      if (random <= 0) {
        selected.push(candidate.item);
        taken.add(candidate.item.id);
        break;
      }
    }
  }
  
  return selected;
}