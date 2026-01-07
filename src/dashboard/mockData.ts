import type { ContentItem } from '@/shared/types';

export const mockItems: ContentItem[] = [
  {
    id: '1',
    platform: 'zhihu',
    title: '如何评价 2024 年的 AI 发展？',
    url: 'https://zhihu.com/question/123',
    author: {
      name: '张三',
      title: 'AI 研究员',
      followers: 12000
    },
    contentExcerpt: '这个问题其实可以从三个角度来分析，首先是模型规模的增长，我们看到 GPT-5 的参数量级...',
    metadata: {
      score: 16,
      manualScore: 16,
      publishTime: Date.now() - 3600000,
    },
    actions: [
      { type: 'view', timestamp: Date.now() },
      { type: 'like', timestamp: Date.now() },
      { type: 'star', timestamp: Date.now() }
    ],
    lastUpdated: Date.now() - 3600000,
    firstSeen: Date.now() - 3600000
  },
  {
    id: '2',
    platform: 'bilibili',
    title: '【硬核】手把手教你写浏览器插件',
    url: 'https://bilibili.com/video/BV123',
    cover: 'https://placehold.co/600x400/223344/ffffff?text=Bilibili+Video',
    author: {
      name: '极客小明',
      followers: 50000
    },
    contentExcerpt: '今天给大家讲一个非常有意思的项目，如何从零开发一个 Chrome Extension...',
    metadata: {
      score: 8,
      duration: 1200,
      views: 100000,
      publishTime: Date.now() - 86400000,
    },
    actions: [
      { type: 'view', timestamp: Date.now() },
      { type: 'play_50', timestamp: Date.now() },
      { type: 'coin', timestamp: Date.now() }
    ],
    lastUpdated: Date.now() - 86400000,
    firstSeen: Date.now() - 86400000
  },
  {
    id: '3',
    platform: 'zhihu',
    title: '为什么现在的年轻人都不愿意结婚了？',
    url: 'https://zhihu.com/question/456',
    author: {
      name: '社会观察家',
      followers: 500
    },
    contentExcerpt: '经济压力是一个方面，但更深层次的原因在于自我意识的觉醒...',
    metadata: {
      score: 5,
      publishTime: Date.now() - 7200000,
    },
    actions: [
      { type: 'view', timestamp: Date.now() },
      { type: 'read_30s', timestamp: Date.now() }
    ],
    lastUpdated: Date.now() - 7200000,
    firstSeen: Date.now() - 7200000
  },
  {
    id: '4',
    platform: 'bilibili',
    title: '原神：4.2版本前瞻直播',
    url: 'https://bilibili.com/video/BV789',
    cover: 'https://placehold.co/600x400/556677/ffffff?text=Genshin',
    author: {
      name: '原神',
      followers: 10000000
    },
    contentExcerpt: '旅行者们大家好，欢迎来到4.2版本前瞻特别节目...',
    metadata: {
      score: 14,
      duration: 3600,
      manualScore: 14,
    },
    actions: [
      { type: 'view', timestamp: Date.now() },
      { type: 'play_90', timestamp: Date.now() },
      { type: 'like', timestamp: Date.now() },
      { type: 'coin', timestamp: Date.now() }
    ],
    lastUpdated: Date.now() - 120000,
    firstSeen: Date.now() - 120000
  },
  {
    id: '5',
    platform: 'zhihu',
    title: '如何看待 SpaceX 第四次星舰发射？',
    url: 'https://zhihu.com/question/789',
    author: {
      name: 'SpaceFan',
      followers: 3000
    },
    contentExcerpt: '这次发射虽然由于助推器故障失败了，但是数据收集非常成功...',
    metadata: {
      score: 3,
      publishTime: Date.now() - 100000,
    },
    actions: [
      { type: 'view', timestamp: Date.now() }
    ],
    lastUpdated: Date.now() - 100000,
    firstSeen: Date.now() - 100000
  }
];
