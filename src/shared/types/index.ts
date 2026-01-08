export type Platform = 'zhihu' | 'bilibili';

export type ActionType = 
  | 'view' 
  | 'read_30s' 
  | 'play_50' 
  | 'play_90' 
  | 'upvote'    // 赞同
  | 'unvote'    // 取消赞同
  | 'like'      // 喜欢
  | 'unlike'    // 取消喜欢
  | 'favorite'  // 收藏
  | 'star'      // 收藏 (保留兼容)
  | 'coin' 
  | 'share' 
  | 'comment' 
  | 'open_comment'
  | 'danmaku' 
  | 'triple' 
  | 'manual_score'
  | 'copy'; // 复制内容

export interface UserAction {
  type: ActionType;
  timestamp: number;
  payload?: any; // e.g., manual score value
}

export interface Author {
  name: string;
  url?: string;
  id?: string;
  avatar?: string;
  followers?: number;
  title?: string; // For Zhihu author title
}

export interface ContentMetadata {
  duration?: number; // video duration
  userReadDuration?: number; // user read/watch duration in seconds (accumulated)
  views?: number;
  voteCount?: number; // upvotes / likes
  commentCount?: number;
  publishTime?: number;
  score: number; // calculated signal score
  manualScore?: number; // 10, 12, 14, 16
  tags?: string[];
  category?: string;
  
  // Time Capsule Stats
  lastShownAt?: number; // 上次在胶囊露脸时间
  capsuleShowCount?: number; // 胶囊露脸总次数
  capsuleHoverCount?: number; // 胶囊内悬浮次数
  capsuleClickCount?: number; // 胶囊内点击/复制次数
}

export interface ContentItem {
  id: string; // answer_id or video_id (unique per platform)
  platform: Platform;
  title: string;
  url: string;
  cover?: string; // Bilibili cover
  author: Author;
  contentExcerpt: string; // Text excerpt
  fullContent?: string;   // Full plain text content
  metadata: ContentMetadata;
  actions: UserAction[];
  lastUpdated: number;
  firstSeen: number;
}

export interface AppSettings {
  fontSize: 'small' | 'medium' | 'large';
  theme?: 'light' | 'dark' | 'auto';
}
