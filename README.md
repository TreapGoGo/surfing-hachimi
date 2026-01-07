# 冲浪哈基米 (Surfing Hachimi)

浏览器插件，自动捕获用户在知乎/B站的浏览足迹与互动行为，沉淀为可检索、可导出的个人知识资产。

## ✨ 功能特性

- **无感采集**：自动记录浏览过的知乎回答和 B 站视频。
- **信号分级**：基于浏览时长、点赞、收藏等互动行为计算内容价值分。
- **本地存储**：所有数据存储在本地 IndexedDB，隐私安全。
- **可视化仪表盘**：提供瀑布流回顾、时光胶囊随机推荐。

## 🚀 安装说明

1. **构建项目**：
   确保已安装 Node.js，然后在项目根目录运行：
   ```bash
   npm install
   npm run build
   ```
   构建完成后，会生成 `dist` 目录。

2. **加载插件**：
   - 打开 Chrome 浏览器，在地址栏输入 `chrome://extensions/` 并回车。
   - 开启右上角的 **"开发者模式" (Developer mode)** 开关。
   - 点击左上角的 **"加载已解压的扩展程序" (Load unpacked)** 按钮。
   - 选择本项目下的 `dist` 目录。

3. **开始使用**：
   - 访问 [知乎](https://www.zhihu.com) 或 [Bilibili](https://www.bilibili.com)。
   - 浏览内容时，插件会自动记录。
   - 页面右下角会出现悬浮球，点击可查看侧边栏。
   - 点击插件图标或悬浮球中的"打开 Dashboard"可进入管理界面。

## 🛠️ 开发指南

- **启动 UI 开发服务器**：
  ```bash
  npm run dev
  ```
  注意：`npm run dev` 仅用于开发 Dashboard 和 Panel 的 UI，无法测试 Content Script 和 Chrome API。

- **预览构建产物**：
  ```bash
  npm run preview
  ```
  访问 `http://localhost:4173/dashboard.html` 查看仪表盘。

## 📁 目录结构

- `src/background`: Service Worker，负责数据存储与消息协调。
- `src/content`: Content Scripts，负责页面 DOM 监听与采集。
  - `zhihu`: 知乎采集逻辑。
  - `bilibili`: B站采集逻辑。
- `src/dashboard`: 独立 Dashboard 页面 (React)。
- `src/panel`: 侧边栏页面 (React)。
- `src/shared`: 共享类型、组件、数据库封装。
