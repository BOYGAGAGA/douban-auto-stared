# 豆瓣自动标记软件 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个Electron桌面应用，输入文字或图片后自动搜索豆瓣和资源站，确认后自动完成豆瓣标记。

**Architecture:** Electron主进程管理窗口和系统交互，渲染进程负责UI展示和用户交互。通过preload脚本安全桥接。OCR用Tesseract.js本地处理，图像识别用Claude Vision API。豆瓣操作复用Edge Cookie。

**Tech Stack:** Electron, HTML/CSS/JS, Tesseract.js, Claude Vision API, Playwright

---

## 文件结构

```
douban-auto-stared/
├── package.json                 # 项目配置和依赖
├── main.js                      # Electron主进程
├── preload.js                   # 预加载脚本（安全桥接）
├── src/
│   ├── index.html               # 主页面结构
│   ├── styles/
│   │   └── douban.css           # 豆瓣旧版UI完整样式
│   ├── renderer.js              # 渲染进程主逻辑
│   ├── services/
│   │   ├── ocr.js               # Tesseract.js OCR服务
│   │   ├── vision.js            # Claude Vision API服务
│   │   ├── douban.js            # 豆瓣搜索+标记API
│   │   └── resource.js          # 资源站搜索
│   ├── components/
│   │   ├── input.js             # 输入组件（文字+图片）
│   │   ├── tabs.js              # 标签页切换组件
│   │   ├── modal.js             # 确认弹窗组件
│   │   └── result-card.js       # 结果卡片组件
│   └── utils/
│       ├── cookie.js            # Edge Cookie读取
│       └── delay.js             # 延迟工具
└── docs/
```

---

## Task 1: 项目初始化

**Files:**
- Create: `package.json`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "douban-auto-stared",
  "version": "1.0.0",
  "description": "豆瓣自动标记工具 - 输入文字或图片，自动搜索并标记豆瓣条目",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "dev": "electron . --dev"
  },
  "dependencies": {
    "electron": "^28.0.0",
    "tesseract.js": "^5.0.0",
    "cheerio": "^1.0.0-rc.12"
  },
  "devDependencies": {},
  "author": "BOYGAGA",
  "license": "MIT"
}
```

- [ ] **Step 2: 安装依赖**

```bash
cd "I:/vs code project/douban auto-stared"
npm install
```

---

## Task 2: Electron 主进程

**Files:**
- Create: `main.js`
- Create: `preload.js`

- [ ] **Step 1: 创建 main.js**

```javascript
const { app, BrowserWindow, ipcMain, globalShortcut, clipboard, nativeImage } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: '豆瓣自动标记',
    backgroundColor: '#ffffff',
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  // 开发模式下打开DevTools
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  createWindow();

  // 注册全局快捷键 Ctrl+Shift+S 截图
  globalShortcut.register('CommandOrControl+Shift+S', () => {
    if (mainWindow) {
      mainWindow.webContents.send('trigger-screenshot');
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  if (process.platform !== 'darwin') app.quit();
});

// IPC: 读取剪贴板图片
ipcMain.handle('get-clipboard-image', () => {
  const image = clipboard.readImage();
  if (image.isEmpty()) return null;
  return image.toPNG().toString('base64');
});

// IPC: 获取系统平台信息
ipcMain.handle('get-platform', () => {
  return process.platform;
});
```

- [ ] **Step 2: 创建 preload.js**

```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getClipboardImage: () => ipcRenderer.invoke('get-clipboard-image'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  onTriggerScreenshot: (callback) => ipcRenderer.on('trigger-screenshot', callback),
});
```

---

## Task 3: 主页面 HTML 结构

**Files:**
- Create: `src/index.html`

- [ ] **Step 1: 创建 index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>豆瓣自动标记</title>
  <link rel="stylesheet" href="styles/douban.css">
</head>
<body>
  <!-- 全局顶栏 -->
  <div class="top-bar">
    <div class="top-bar-inner">
      <div class="top-bar-left">
        <span class="top-link active">首页</span>
        <span class="top-link">电影</span>
        <span class="top-link">读书</span>
        <span class="top-link">音乐</span>
        <span class="top-link">游戏</span>
      </div>
      <div class="top-bar-right">
        <span class="top-link" id="historyBtn">历史记录</span>
      </div>
    </div>
  </div>

  <!-- 页面导航 -->
  <div class="nav-bar">
    <div class="nav-bar-inner">
      <div class="nav-left">
        <span class="logo">豆瓣自动标记</span>
        <span class="nav-link active">搜索</span>
        <span class="nav-link">设置</span>
      </div>
      <div class="nav-right">
        <div class="search-box">
          <input type="text" id="searchInput" placeholder="输入名称搜索..." />
          <button id="searchBtn" class="search-btn">搜索</button>
        </div>
      </div>
    </div>
  </div>

  <!-- 主内容区 -->
  <div class="main-wrapper">
    <div class="main-content">
      <!-- 左侧主区域 -->
      <div class="content-left">
        <!-- 图片输入区 -->
        <div class="module" id="imageInputModule">
          <div class="module-title">
            <span class="title-text">图片输入</span>
            <span class="title-dots">······</span>
            <span class="title-extra">拖拽 / 粘贴 / 选择文件 / 截图</span>
          </div>
          <div class="drop-zone" id="dropZone">
            <div class="drop-zone-content">
              <div class="drop-icon">📷</div>
              <p>拖拽图片到此处，或 <label class="file-label" for="fileInput">选择文件</label></p>
              <p class="drop-hint">支持 Ctrl+V 粘贴 | Ctrl+Shift+S 截图</p>
              <input type="file" id="fileInput" accept="image/*" style="display:none" />
            </div>
            <div class="drop-zone-preview" id="previewArea" style="display:none">
              <img id="previewImage" />
              <button class="btn-clear" id="clearImage">✕ 清除</button>
            </div>
          </div>
        </div>

        <!-- 搜索状态 -->
        <div class="module" id="statusModule" style="display:none">
          <div class="module-title">
            <span class="title-text">搜索状态</span>
            <span class="title-dots">······</span>
            <span class="title-extra" id="statusText">准备中</span>
          </div>
          <div class="status-bar">
            <div class="status-item">
              <span class="status-label">OCR识别：</span>
              <span class="status-value" id="ocrStatus">-</span>
            </div>
            <div class="status-item">
              <span class="status-label">AI识别：</span>
              <span class="status-value" id="aiStatus">-</span>
            </div>
            <div class="status-item">
              <span class="status-label">豆瓣搜索：</span>
              <span class="status-value" id="doubanStatus">-</span>
            </div>
            <div class="status-item">
              <span class="status-label">资源搜索：</span>
              <span class="status-value" id="resourceStatus">-</span>
            </div>
          </div>
        </div>

        <!-- 结果标签页 -->
        <div class="module" id="resultModule" style="display:none">
          <div class="module-title">
            <span class="title-text">搜索结果</span>
            <span class="title-dots">······</span>
            <span class="title-extra" id="resultCount">共 0 条</span>
          </div>
          <div class="tabs">
            <button class="tab active" data-tab="douban">豆瓣结果</button>
            <button class="tab" data-tab="resource">资源站结果</button>
          </div>
          <div class="tab-content active" id="doubanResults">
            <div class="result-list" id="doubanList"></div>
          </div>
          <div class="tab-content" id="resourceResults">
            <div class="result-list" id="resourceList"></div>
          </div>
        </div>
      </div>

      <!-- 右侧边栏 -->
      <div class="content-right">
        <!-- 使用说明 -->
        <div class="module">
          <div class="module-title">
            <span class="title-text">使用说明</span>
            <span class="title-dots">······</span>
          </div>
          <div class="help-content">
            <p>1. 在上方输入框输入文字搜索</p>
            <p>2. 或拖拽/粘贴图片进行识别</p>
            <p>3. 点击豆瓣结果查看详情</p>
            <p>4. 确认后自动标记到豆瓣</p>
          </div>
        </div>

        <!-- 识别结果 -->
        <div class="module" id="recognizedModule" style="display:none">
          <div class="module-title">
            <span class="title-text">识别结果</span>
            <span class="title-dots">······</span>
          </div>
          <div class="recognized-content" id="recognizedText"></div>
        </div>

        <!-- 历史记录 -->
        <div class="module" id="historyModule">
          <div class="module-title">
            <span class="title-text">最近搜索</span>
            <span class="title-dots">······</span>
            <span class="title-extra" id="clearHistory">清空</span>
          </div>
          <div class="history-list" id="historyList">
            <p class="empty-hint">暂无搜索记录</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 确认弹窗 -->
  <div class="modal-overlay" id="modalOverlay" style="display:none">
    <div class="modal" id="confirmModal">
      <div class="modal-header">
        <span class="modal-title">确认标记</span>
        <button class="modal-close" id="modalClose">✕</button>
      </div>
      <div class="modal-body">
        <div class="modal-info">
          <img class="modal-cover" id="modalCover" />
          <div class="modal-details">
            <h3 id="modalTitle"></h3>
            <div class="modal-rating" id="modalRating"></div>
            <div class="modal-meta" id="modalMeta"></div>
            <div class="modal-summary" id="modalSummary"></div>
            <div class="modal-tags" id="modalTags"></div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <div class="mark-buttons" id="markButtons"></div>
        <button class="btn-cancel" id="modalCancel">取消</button>
      </div>
    </div>
  </div>

  <!-- Toast 提示 -->
  <div class="toast" id="toast" style="display:none"></div>

  <script src="renderer.js" type="module"></script>
</body>
</html>
```

---

## Task 4: 豆瓣旧版UI样式

**Files:**
- Create: `src/styles/douban.css`

- [ ] **Step 1: 创建 douban.css**

```css
/* ===== 豆瓣旧版UI复刻样式 ===== */

/* Reset */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: "Helvetica Neue", Helvetica, Arial, "PingFang SC", "Microsoft YaHei", sans-serif;
  font-size: 13px;
  color: #666666;
  background: #ffffff;
  line-height: 1.6;
}

a {
  color: #2777bb;
  text-decoration: none;
}
a:hover {
  text-decoration: underline;
}

/* ===== 全局顶栏 ===== */
.top-bar {
  background: #333333;
  height: 30px;
  width: 100%;
  position: sticky;
  top: 0;
  z-index: 100;
}
.top-bar-inner {
  max-width: 1000px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
  padding: 0 10px;
}
.top-bar-left, .top-bar-right {
  display: flex;
  align-items: center;
  gap: 15px;
}
.top-link {
  color: #cccccc;
  font-size: 12px;
  cursor: pointer;
  padding: 2px 0;
}
.top-link:hover, .top-link.active {
  color: #ffffff;
}

/* ===== 页面导航 ===== */
.nav-bar {
  background: #f0f5e9;
  height: 40px;
  width: 100%;
  border-bottom: 1px solid #e0e0e0;
  position: sticky;
  top: 30px;
  z-index: 99;
}
.nav-bar-inner {
  max-width: 1000px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
  padding: 0 10px;
}
.nav-left {
  display: flex;
  align-items: center;
  gap: 20px;
}
.logo {
  color: #218c38;
  font-size: 16px;
  font-weight: bold;
  letter-spacing: 1px;
}
.nav-link {
  color: #333333;
  font-size: 13px;
  cursor: pointer;
  padding: 2px 0;
}
.nav-link:hover, .nav-link.active {
  color: #218c38;
}
.nav-right {
  display: flex;
  align-items: center;
}
.search-box {
  display: flex;
  align-items: center;
}
.search-box input {
  width: 220px;
  height: 26px;
  border: 1px solid #cccccc;
  border-radius: 13px;
  padding: 0 12px;
  font-size: 12px;
  outline: none;
  color: #333333;
}
.search-box input::placeholder {
  color: #999999;
}
.search-box input:focus {
  border-color: #218c38;
}
.search-btn {
  height: 26px;
  padding: 0 14px;
  background: #218c38;
  color: #ffffff;
  border: none;
  border-radius: 13px;
  font-size: 12px;
  cursor: pointer;
  margin-left: 6px;
}
.search-btn:hover {
  background: #1a7030;
}

/* ===== 主内容布局 ===== */
.main-wrapper {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px 10px;
}
.main-content {
  display: flex;
  gap: 20px;
}
.content-left {
  flex: 7;
  min-width: 0;
}
.content-right {
  flex: 3;
  min-width: 200px;
}

/* ===== 模块通用 ===== */
.module {
  margin-bottom: 20px;
  background: #ffffff;
}
.module-title {
  display: flex;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #eeeeee;
  margin-bottom: 12px;
}
.title-text {
  color: #218c38;
  font-size: 15px;
  font-weight: bold;
}
.title-dots {
  color: #999999;
  font-size: 15px;
  margin: 0 8px;
  letter-spacing: 2px;
  flex: 1;
}
.title-extra {
  color: #999999;
  font-size: 12px;
}

/* ===== 图片输入区 ===== */
.drop-zone {
  border: 2px dashed #dddddd;
  border-radius: 4px;
  padding: 30px 20px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  position: relative;
  min-height: 150px;
}
.drop-zone:hover, .drop-zone.drag-over {
  border-color: #218c38;
  background: #f9fef6;
}
.drop-zone-content p {
  margin: 8px 0;
  color: #666666;
  font-size: 13px;
}
.drop-icon {
  font-size: 36px;
  margin-bottom: 8px;
}
.drop-hint {
  color: #999999 !important;
  font-size: 12px !important;
}
.file-label {
  color: #2777bb;
  cursor: pointer;
  text-decoration: underline;
}
.drop-zone-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
.drop-zone-preview img {
  max-width: 100%;
  max-height: 200px;
  border: 1px solid #eeeeee;
  border-radius: 2px;
}
.btn-clear {
  background: none;
  border: 1px solid #cccccc;
  color: #999999;
  padding: 4px 12px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
}
.btn-clear:hover {
  color: #333333;
  border-color: #999999;
}

/* ===== 状态栏 ===== */
.status-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 8px 0;
}
.status-item {
  display: flex;
  align-items: center;
  font-size: 12px;
}
.status-label {
  color: #999999;
}
.status-value {
  color: #333333;
  font-weight: 500;
}
.status-value.pending { color: #999999; }
.status-value.running { color: #2d78b5; }
.status-value.done { color: #218c38; }
.status-value.error { color: #cc3333; }

/* ===== 标签页 ===== */
.tabs {
  display: flex;
  border-bottom: 2px solid #eeeeee;
  margin-bottom: 12px;
}
.tab {
  padding: 8px 20px;
  background: none;
  border: none;
  font-size: 13px;
  color: #666666;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: color 0.2s;
}
.tab:hover {
  color: #333333;
}
.tab.active {
  color: #218c38;
  border-bottom-color: #218c38;
  font-weight: bold;
}
.tab-content {
  display: none;
}
.tab-content.active {
  display: block;
}

/* ===== 结果卡片 ===== */
.result-list {
  display: flex;
  flex-direction: column;
}
.result-card {
  display: flex;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #eeeeee;
  cursor: pointer;
  transition: background 0.15s;
}
.result-card:hover {
  background: #fafafa;
}
.result-card:last-child {
  border-bottom: none;
}
.result-cover {
  width: 75px;
  height: 100px;
  object-fit: cover;
  border: 1px solid #eeeeee;
  flex-shrink: 0;
  background: #f5f5f5;
}
.result-info {
  flex: 1;
  min-width: 0;
}
.result-title {
  font-size: 14px;
  font-weight: bold;
  color: #2777bb;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.result-title:hover {
  text-decoration: underline;
}
.result-meta {
  font-size: 12px;
  color: #999999;
  margin-bottom: 4px;
}
.result-rating {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
}
.star {
  color: #e09015;
  font-size: 12px;
}
.star.empty {
  color: #cccccc;
}
.rating-score {
  font-size: 12px;
  color: #e09015;
  margin-left: 4px;
}
.result-type {
  display: inline-block;
  background: #f0f5e9;
  color: #218c38;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 2px;
  margin-right: 6px;
}
.result-summary {
  font-size: 12px;
  color: #666666;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 资源站结果卡片 */
.resource-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #eeeeee;
}
.resource-card:last-child {
  border-bottom: none;
}
.resource-name {
  font-size: 13px;
  color: #333333;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.resource-type-tag {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 2px;
  margin: 0 8px;
  flex-shrink: 0;
}
.resource-type-tag.cloud {
  background: #e8f2f8;
  color: #2d78b5;
}
.resource-type-tag.torrent {
  background: #fef5e7;
  color: #e09015;
}
.resource-type-tag.online {
  background: #f0f5e9;
  color: #218c38;
}
.resource-link {
  font-size: 12px;
  color: #2777bb;
  flex-shrink: 0;
}

/* ===== 侧边栏 ===== */
.help-content {
  font-size: 12px;
  color: #666666;
  line-height: 2;
}
.help-content p {
  padding-left: 8px;
}
.recognized-content {
  font-size: 13px;
  color: #333333;
  background: #f9f9f9;
  padding: 10px;
  border-radius: 3px;
  line-height: 1.6;
  word-break: break-all;
}
.history-list {
  max-height: 300px;
  overflow-y: auto;
}
.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid #f5f5f5;
  font-size: 12px;
  cursor: pointer;
}
.history-item:hover {
  background: #fafafa;
}
.history-text {
  color: #2777bb;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}
.history-time {
  color: #999999;
  font-size: 11px;
  margin-left: 8px;
  flex-shrink: 0;
}
.empty-hint {
  color: #999999;
  font-size: 12px;
  text-align: center;
  padding: 20px 0;
}
#clearHistory {
  cursor: pointer;
}
#clearHistory:hover {
  color: #2777bb;
}

/* ===== 确认弹窗 ===== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal {
  background: #ffffff;
  border-radius: 4px;
  width: 520px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  border-bottom: 1px solid #eeeeee;
}
.modal-title {
  font-size: 15px;
  font-weight: bold;
  color: #333333;
}
.modal-close {
  background: none;
  border: none;
  font-size: 18px;
  color: #999999;
  cursor: pointer;
  padding: 0 4px;
}
.modal-close:hover {
  color: #333333;
}
.modal-body {
  padding: 20px;
}
.modal-info {
  display: flex;
  gap: 16px;
}
.modal-cover {
  width: 120px;
  height: 160px;
  object-fit: cover;
  border: 1px solid #eeeeee;
  flex-shrink: 0;
  background: #f5f5f5;
}
.modal-details {
  flex: 1;
  min-width: 0;
}
.modal-details h3 {
  font-size: 16px;
  color: #333333;
  margin-bottom: 8px;
}
.modal-rating {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
}
.modal-meta {
  font-size: 12px;
  color: #999999;
  margin-bottom: 8px;
  line-height: 1.8;
}
.modal-summary {
  font-size: 12px;
  color: #666666;
  line-height: 1.6;
  margin-bottom: 10px;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.modal-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.modal-tag {
  background: #f0f5e9;
  color: #218c38;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 2px;
}
.modal-footer {
  padding: 14px 20px;
  border-top: 1px solid #eeeeee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.mark-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.btn-mark {
  padding: 6px 16px;
  border: 1px solid #218c38;
  background: #ffffff;
  color: #218c38;
  border-radius: 3px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-mark:hover {
  background: #218c38;
  color: #ffffff;
}
.btn-mark.primary {
  background: #218c38;
  color: #ffffff;
}
.btn-mark.primary:hover {
  background: #1a7030;
}
.btn-cancel {
  padding: 6px 16px;
  border: 1px solid #cccccc;
  background: #ffffff;
  color: #666666;
  border-radius: 3px;
  font-size: 13px;
  cursor: pointer;
}
.btn-cancel:hover {
  border-color: #999999;
  color: #333333;
}

/* ===== Toast ===== */
.toast {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: #333333;
  color: #ffffff;
  padding: 10px 24px;
  border-radius: 4px;
  font-size: 13px;
  z-index: 300;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  animation: toast-in 0.3s ease;
}
.toast.success { background: #218c38; }
.toast.error { background: #cc3333; }
@keyframes toast-in {
  from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

/* ===== 加载动画 ===== */
.loading-dots {
  display: inline-flex;
  gap: 4px;
}
.loading-dots span {
  width: 6px;
  height: 6px;
  background: #218c38;
  border-radius: 50%;
  animation: dot-bounce 1.2s infinite;
}
.loading-dots span:nth-child(2) { animation-delay: 0.2s; }
.loading-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes dot-bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1); opacity: 1; }
}

/* ===== 滚动条 ===== */
::-webkit-scrollbar {
  width: 8px;
}
::-webkit-scrollbar-track {
  background: #f5f5f5;
}
::-webkit-scrollbar-thumb {
  background: #cccccc;
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: #999999;
}
```

---

## Task 5: 工具函数

**Files:**
- Create: `src/utils/delay.js`
- Create: `src/utils/cookie.js`

- [ ] **Step 1: 创建 delay.js**

```javascript
/**
 * 延迟指定毫秒
 * @param {number} ms - 毫秒数
 * @returns {Promise<void>}
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 随机延迟 2-5 秒（防封用）
 * @returns {Promise<void>}
 */
export function randomDelay() {
  const ms = 2000 + Math.random() * 3000;
  return delay(ms);
}
```

- [ ] **Step 2: 创建 cookie.js**

```javascript
/**
 * 从Edge浏览器读取指定域名的Cookie
 * 使用Windows的Cookie存储路径
 */

const EDGE_COOKIE_PATHS = [
  // Windows Edge Chromium Cookie 路径
  `${process.env.LOCALAPPDATA}/Microsoft/Edge/User Data/Default/Cookies`,
  `${process.env.LOCALAPPDATA}/Microsoft/Edge/User Data/Profile 1/Cookies`,
];

/**
 * 解析Edge Cookie文件（SQLite格式）获取指定域名的Cookie
 * 注意：Edge运行时Cookie文件被锁定，需要复制后再读取
 * @param {string} domain - 域名（如 .douban.com）
 * @returns {Promise<string>} Cookie字符串
 */
export async function getEdgeCookies(domain) {
  try {
    // 方法1: 通过Edge的命令行参数启动获取（推荐）
    // 方法2: 从Edge的Cookie导出功能获取
    // 这里使用最稳定的方式：让用户手动导出或通过Playwright获取

    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');

    // 检查Cookie导出文件是否存在
    const exportPath = path.join(os.homedir(), '.douban-auto-stared', 'cookies.json');

    if (fs.existsSync(exportPath)) {
      const data = JSON.parse(fs.readFileSync(exportPath, 'utf-8'));
      const cookies = data.filter(c =>
        c.domain && c.domain.includes(domain.replace('.', ''))
      );
      return cookies.map(c => `${c.name}=${c.value}`).join('; ');
    }

    return '';
  } catch (err) {
    console.error('读取Cookie失败:', err);
    return '';
  }
}

/**
 * 保存Cookie到文件
 * @param {Array} cookies - Cookie数组
 */
export async function saveCookies(cookies) {
  const fs = await import('fs');
  const path = await import('path');
  const os = await import('os');

  const dir = path.join(os.homedir(), '.douban-auto-stared');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(dir, 'cookies.json'),
    JSON.stringify(cookies, null, 2)
  );
}
```

---

## Task 6: OCR 服务

**Files:**
- Create: `src/services/ocr.js`

- [ ] **Step 1: 创建 ocr.js**

```javascript
/**
 * Tesseract.js OCR 服务
 * 本地运行，无需网络
 */

let worker = null;

/**
 * 初始化OCR引擎（懒加载）
 */
async function initWorker() {
  if (worker) return worker;

  // 动态导入tesseract.js（在渲染进程中使用）
  const Tesseract = await import('tesseract.js');
  worker = await Tesseract.createWorker('chi_sim+eng', 1, {
    logger: m => {
      if (m.status === 'recognizing text') {
        const progress = Math.round(m.progress * 100);
        window.dispatchEvent(new CustomEvent('ocr-progress', { detail: progress }));
      }
    }
  });

  return worker;
}

/**
 * 对图片进行OCR识别
 * @param {string|Blob} image - 图片的base64字符串、URL或Blob
 * @returns {Promise<{text: string, confidence: number}>}
 */
export async function recognizeText(image) {
  try {
    const w = await initWorker();

    let input = image;
    // 如果是base64，转换为可用格式
    if (typeof image === 'string' && image.startsWith('data:')) {
      input = image;
    } else if (typeof image === 'string') {
      // 假设是base64不带前缀
      input = `data:image/png;base64,${image}`;
    }

    const result = await w.recognize(input);

    return {
      text: result.data.text.trim(),
      confidence: result.data.confidence,
    };
  } catch (err) {
    console.error('OCR识别失败:', err);
    return { text: '', confidence: 0 };
  }
}

/**
 * 清理OCR结果，提取可能的搜索关键词
 * @param {string} text - OCR原始文本
 * @returns {string} 清理后的关键词
 */
export function cleanOCRText(text) {
  if (!text) return '';

  // 移除多余空白
  let cleaned = text.replace(/\s+/g, ' ').trim();

  // 移除常见无用字符
  cleaned = cleaned.replace(/[「」『』【】《》（）\(\)\[\]\{\}]/g, ' ');

  // 如果文本太长，只取前100字符
  if (cleaned.length > 100) {
    cleaned = cleaned.substring(0, 100);
  }

  return cleaned.trim();
}

/**
 * 销毁OCR Worker释放资源
 */
export async function destroyOCR() {
  if (worker) {
    await worker.terminate();
    worker = null;
  }
}
```

---

## Task 7: Claude Vision API 服务

**Files:**
- Create: `src/services/vision.js`

- [ ] **Step 1: 创建 vision.js**

```javascript
/**
 * Claude Vision API 图像识别服务
 * 用于OCR置信度低时的备选方案
 */

// API配置 - 用户需要在此填入自己的API Key
let API_KEY = '';
let API_BASE = 'https://api.anthropic.com';

/**
 * 设置API配置
 * @param {object} config
 */
export function setVisionConfig(config) {
  if (config.apiKey) API_KEY = config.apiKey;
  if (config.apiBase) API_BASE = config.apiBase;
}

/**
 * 使用Claude Vision识别图片内容
 * @param {string} imageBase64 - 图片的base64字符串（不含前缀）
 * @param {string} mimeType - 图片MIME类型
 * @returns {Promise<{title: string, type: string, keywords: string}>}
 */
export async function identifyImage(imageBase64, mimeType = 'image/png') {
  if (!API_KEY) {
    throw new Error('未配置Claude API Key，请在设置中配置');
  }

  const prompt = `请识别这张图片中的内容，它可能是一部电影海报、书籍封面、音乐专辑或游戏封面。
请返回以下JSON格式（不要返回其他内容）：
{
  "title": "识别出的名称",
  "type": "类型(movie/book/music/game)",
  "keywords": "用于搜索的关键词",
  "description": "简短描述"
}

如果无法识别，返回：
{
  "title": "",
  "type": "unknown",
  "keywords": "",
  "description": "无法识别图片内容"
}`;

  try {
    const response = await fetch(`${API_BASE}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data: imageBase64,
              }
            },
            {
              type: 'text',
              text: prompt,
            }
          ]
        }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`API请求失败: ${response.status} ${err}`);
    }

    const data = await response.json();
    const text = data.content[0].text;

    // 尝试解析JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return { title: '', type: 'unknown', keywords: '', description: '无法解析识别结果' };
  } catch (err) {
    console.error('Vision API识别失败:', err);
    throw err;
  }
}

/**
 * 将图片文件转为base64
 * @param {File|Blob} file
 * @returns {Promise<{base64: string, mimeType: string}>}
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = result.split(',')[1];
      resolve({ base64, mimeType: file.type || 'image/png' });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
```

---

## Task 8: 豆瓣搜索服务

**Files:**
- Create: `src/services/douban.js`

- [ ] **Step 1: 创建 douban.js**

```javascript
/**
 * 豆瓣搜索 + 标记服务
 * 通过豆瓣搜索接口获取条目，通过API完成标记
 */

import { getEdgeCookies } from '../utils/cookie.js';
import { randomDelay } from '../utils/delay.js';

const DOUBAN_SEARCH_URL = 'https://www.douban.com/search';
const DOUBAN_BOOK_SEARCH = 'https://book.douban.com/j/subject_suggest';
const DOUBAN_MOVIE_SEARCH = 'https://movie.douban.com/j/subject_suggest';

/**
 * 搜索豆瓣条目
 * @param {string} keyword - 搜索关键词
 * @returns {Promise<Array>} 搜索结果列表
 */
export async function searchDouban(keyword) {
  if (!keyword) return [];

  try {
    // 使用豆瓣的suggest API（JSON接口，更稳定）
    const results = await Promise.all([
      searchMovie(keyword),
      searchBook(keyword),
    ]);

    // 合并并去重
    const all = [...results[0], ...results[1]];
    const seen = new Set();
    return all.filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  } catch (err) {
    console.error('豆瓣搜索失败:', err);
    // 降级到网页搜索
    return await searchDoubanWeb(keyword);
  }
}

/**
 * 搜索电影
 */
async function searchMovie(keyword) {
  try {
    const url = `${DOUBAN_MOVIE_SEARCH}?q=${encodeURIComponent(keyword)}`;
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        'Referer': 'https://movie.douban.com/',
      }
    });

    if (!resp.ok) return [];
    const data = await resp.json();

    return data.map(item => ({
      id: item.id,
      title: item.title,
      year: item.year || '',
      cover: item.img || item.cover_url || '',
      url: item.url || `https://movie.douban.com/subject/${item.id}/`,
      type: 'movie',
      subType: item.sub_type || 'movie',
    }));
  } catch {
    return [];
  }
}

/**
 * 搜索书籍
 */
async function searchBook(keyword) {
  try {
    const url = `${DOUBAN_BOOK_SEARCH}?q=${encodeURIComponent(keyword)}`;
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        'Referer': 'https://book.douban.com/',
      }
    });

    if (!resp.ok) return [];
    const data = await resp.json();

    return data.map(item => ({
      id: item.id,
      title: item.title,
      year: item.year || '',
      cover: item.img || item.cover_url || '',
      url: item.url || `https://book.douban.com/subject/${item.id}/`,
      type: 'book',
    }));
  } catch {
    return [];
  }
}

/**
 * 网页搜索降级方案
 */
async function searchDoubanWeb(keyword) {
  try {
    const url = `${DOUBAN_SEARCH_URL}?q=${encodeURIComponent(keyword)}`;
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
      }
    });

    if (!resp.ok) return [];
    const html = await resp.text();

    // 简单解析搜索结果页面
    const results = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const items = doc.querySelectorAll('.result');

    items.forEach(item => {
      const titleEl = item.querySelector('.title a');
      const imgEl = item.querySelector('.result img');
      if (titleEl) {
        results.push({
          id: titleEl.href.match(/subject\/(\d+)/)?.[1] || Date.now().toString(),
          title: titleEl.textContent.trim(),
          cover: imgEl?.src || '',
          url: titleEl.href,
          type: 'unknown',
          year: '',
        });
      }
    });

    return results;
  } catch {
    return [];
  }
}

/**
 * 获取条目详情
 * @param {string} url - 条目URL
 * @returns {Promise<object>} 详细信息
 */
export async function getDetail(url) {
  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
      }
    });

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const html = await resp.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 提取评分
    const ratingEl = doc.querySelector('.rating_num, .rating_self strong');
    const rating = ratingEl?.textContent?.trim() || '';

    // 提取简介
    const summaryEl = doc.querySelector('#link-report .intro, #content .intro');
    const summary = summaryEl?.textContent?.trim() || '';

    // 提取标签
    const tagEls = doc.querySelectorAll('.tags-body a, .tag');
    const tags = Array.from(tagEls).map(t => t.textContent.trim()).slice(0, 10);

    // 提取元信息
    const infoEl = doc.querySelector('#info');
    const meta = infoEl?.textContent?.trim() || '';

    return { rating, summary, tags, meta };
  } catch (err) {
    console.error('获取详情失败:', err);
    return { rating: '', summary: '', tags: [], meta: '' };
  }
}

/**
 * 标记条目（想看/看过等）
 * @param {string} id - 条目ID
 * @param {string} type - 条目类型 movie/book/music/game
 * @param {string} action - 标记动作 wish/do/collect
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function markItem(id, type, action) {
  await randomDelay(); // 防封延迟

  const cookie = await getEdgeCookies('douban.com');
  if (!cookie) {
    return { success: false, message: '未找到豆瓣Cookie，请先在Edge浏览器中登录豆瓣' };
  }

  // 根据类型和动作确定API端点
  const apis = {
    movie: {
      wish: `https://movie.douban.com/j/subject/${id}/interest?wish=想看`,
      do: `https://movie.douban.com/j/subject/${id}/interest?do=在看`,
      done: `https://movie.douban.com/j/subject/${id}/interest?done=看过`,
    },
    book: {
      wish: `https://book.douban.com/j/subject/${id}/interest?wish=想读`,
      do: `https://book.douban.com/j/subject/${id}/interest?do=在读`,
      done: `https://book.douban.com/j/subject/${id}/interest?done=读过`,
    },
    music: {
      wish: `https://music.douban.com/j/subject/${id}/interest?wish=想听`,
      do: `https://music.douban.com/j/subject/${id}/interest?do=在听`,
      done: `https://music.douban.com/j/subject/${id}/interest?done=听过`,
    },
    game: {
      wish: `https://www.douban.com/j/subject/${id}/interest?wish=想玩`,
      do: `https://www.douban.com/j/subject/${id}/interest?do=在玩`,
      done: `https://www.douban.com/j/subject/${id}/interest?done=玩过`,
    },
  };

  const api = apis[type]?.[action];
  if (!api) {
    return { success: false, message: `不支持的标记类型: ${type}/${action}` };
  }

  try {
    const resp = await fetch(api, {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        'Cookie': cookie,
        'Referer': `https://${type === 'movie' ? 'movie' : type === 'book' ? 'book' : type === 'music' ? 'music' : 'www'}.douban.com/`,
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    });

    if (resp.ok) {
      return { success: true, message: '标记成功！' };
    } else {
      return { success: false, message: `标记失败: HTTP ${resp.status}` };
    }
  } catch (err) {
    return { success: false, message: `标记失败: ${err.message}` };
  }
}

/**
 * 通过Playwright获取Cookie（首次使用时）
 * @returns {Promise<boolean>}
 */
export async function loginAndGetCookies() {
  try {
    const { chromium } = await import('playwright');

    const browser = await chromium.launch({
      channel: 'msedge',
      headless: false, // 需要显示浏览器让用户登录
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('https://www.douban.com/');

    // 等待用户登录（检测登录状态）
    console.log('请在打开的浏览器中登录豆瓣...');

    // 等待直到检测到用户已登录（URL变化或页面元素变化）
    await page.waitForURL('**/douban.com/**', { timeout: 300000 }); // 5分钟超时

    // 获取所有Cookie
    const cookies = await context.cookies();

    // 保存Cookie
    const { saveCookies } = await import('../utils/cookie.js');
    await saveCookies(cookies);

    await browser.close();
    return true;
  } catch (err) {
    console.error('登录获取Cookie失败:', err);
    return false;
  }
}
```

---

## Task 9: 资源站搜索服务

**Files:**
- Create: `src/services/resource.js`

- [ ] **Step 1: 创建 resource.js**

```javascript
/**
 * 资源站搜索服务
 * 搜索 https://www.xn--wcv59z.com/ 的资源
 */

const RESOURCE_SITE_URL = 'https://www.xn--wcv59z.com/';

/**
 * 搜索资源站
 * @param {string} keyword - 搜索关键词
 * @returns {Promise<Array>} 资源列表
 */
export async function searchResource(keyword) {
  if (!keyword) return [];

  try {
    // 构建搜索URL（根据资源站的实际URL格式调整）
    const searchUrl = `${RESOURCE_SITE_URL}?s=${encodeURIComponent(keyword)}`;

    const resp = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      }
    });

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }

    const html = await resp.text();
    return parseResourceResults(html);
  } catch (err) {
    console.error('资源站搜索失败:', err);
    return [];
  }
}

/**
 * 解析资源站搜索结果HTML
 * 注意：此函数需要根据资源站的实际HTML结构调整选择器
 * @param {string} html
 * @returns {Array}
 */
function parseResourceResults(html) {
  const results = [];

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 通用解析策略：查找常见的结果列表结构
    // 需要根据实际网站结构调整以下选择器
    const selectors = [
      '.search-results li',
      '.result-list .item',
      '.content-list .entry',
      'article',
      '.post',
      '.search-item',
    ];

    let items = [];
    for (const selector of selectors) {
      items = doc.querySelectorAll(selector);
      if (items.length > 0) break;
    }

    items.forEach(item => {
      const titleEl = item.querySelector('h2 a, h3 a, .title a, a.title');
      const linkEl = item.querySelector('a[href]');

      if (titleEl || linkEl) {
        const title = (titleEl || linkEl).textContent.trim();
        const href = (titleEl || linkEl).getAttribute('href') || '';

        // 判断资源类型
        let resourceType = 'unknown';
        const text = item.textContent.toLowerCase();
        if (text.includes('网盘') || text.includes('百度') || text.includes('阿里') || text.includes('夸克')) {
          resourceType = 'cloud';
        } else if (text.includes('磁力') || text.includes('torrent') || text.includes('种子')) {
          resourceType = 'torrent';
        } else if (text.includes('在线') || text.includes('观看') || text.includes('播放')) {
          resourceType = 'online';
        }

        // 提取链接
        const links = [];
        const allLinks = item.querySelectorAll('a[href]');
        allLinks.forEach(a => {
          const url = a.getAttribute('href');
          if (url && (url.includes('pan.baidu') || url.includes('alipan') || url.includes('quark') ||
              url.includes('magnet:') || url.includes('torrent') || url.includes('ed2k'))) {
            links.push({ url, text: a.textContent.trim() });
          }
        });

        results.push({
          title,
          url: href.startsWith('http') ? href : (href.startsWith('/') ? RESOURCE_SITE_URL + href : ''),
          type: resourceType,
          links,
        });
      }
    });
  } catch (err) {
    console.error('解析资源结果失败:', err);
  }

  return results;
}

/**
 * 打开资源链接
 * @param {string} url
 */
export function openResource(url) {
  if (url) {
    window.open(url, '_blank');
  }
}
```

---

## Task 10: 输入组件

**Files:**
- Create: `src/components/input.js`

- [ ] **Step 1: 创建 input.js**

```javascript
/**
 * 输入组件
 * 处理文字输入和图片输入（拖拽、粘贴、选择文件）
 */

import { recognizeText, cleanOCRText } from '../services/ocr.js';
import { identifyImage, fileToBase64 } from '../services/vision.js';

/**
 * 初始化输入组件
 * @param {object} callbacks - 回调函数集合
 * @param {Function} callbacks.onTextSearch - 文字搜索回调
 * @param {Function} callbacks.onImageRecognized - 图片识别完成回调
 * @param {Function} callbacks.onStatusChange - 状态变化回调
 */
export function initInput(callbacks) {
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const previewArea = document.getElementById('previewArea');
  const previewImage = document.getElementById('previewImage');
  const clearImage = document.getElementById('clearImage');

  let currentImageFile = null;

  // 文字搜索
  searchBtn.addEventListener('click', () => {
    const text = searchInput.value.trim();
    if (text) callbacks.onTextSearch(text);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const text = searchInput.value.trim();
      if (text) callbacks.onTextSearch(text);
    }
  });

  // 拖拽处理
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      handleImageFile(files[0]);
    }
  });

  // 点击选择文件
  dropZone.addEventListener('click', (e) => {
    if (e.target.classList.contains('file-label') || e.target.closest('.file-label')) return;
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleImageFile(e.target.files[0]);
    }
  });

  // 粘贴处理
  document.addEventListener('paste', async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) handleImageFile(file);
        break;
      }
    }
  });

  // Ctrl+V 粘贴图片（从剪贴板）
  document.addEventListener('keydown', async (e) => {
    if (e.ctrlKey && e.key === 'v') {
      // Electron的clipboard API
      if (window.electronAPI) {
        try {
          const base64 = await window.electronAPI.getClipboardImage();
          if (base64) {
            const blob = base64ToBlob(base64, 'image/png');
            handleImageFile(blob);
          }
        } catch {
          // 降级到标准粘贴
        }
      }
    }
  });

  // 清除图片
  clearImage.addEventListener('click', (e) => {
    e.stopPropagation();
    clearImagePreview();
  });

  // 截图触发（来自main进程的快捷键）
  if (window.electronAPI) {
    window.electronAPI.onTriggerScreenshot(() => {
      // 截图功能需要额外实现，这里先提示
      callbacks.onStatusChange('截图功能开发中，请使用系统截图工具后粘贴');
    });
  }

  /**
   * 处理图片文件
   */
  async function handleImageFile(file) {
    currentImageFile = file;

    // 显示预览
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImage.src = e.target.result;
      previewArea.style.display = 'flex';
      document.querySelector('.drop-zone-content').style.display = 'none';
    };
    reader.readAsDataURL(file);

    // 开始识别
    callbacks.onStatusChange('正在OCR识别...');
    const { base64, mimeType } = await fileToBase64(file);

    // Step 1: OCR
    const ocrResult = await recognizeText(`data:${mimeType};base64,${base64}`);
    const cleanedText = cleanOCRText(ocrResult.text);

    if (ocrResult.confidence >= 70 && cleanedText.length > 2) {
      // OCR置信度高，直接使用
      callbacks.onStatusChange(`OCR识别完成 (置信度: ${ocrResult.confidence}%)`);
      callbacks.onImageRecognized(cleanedText, 'ocr');
    } else {
      // OCR置信度低，使用AI识别
      callbacks.onStatusChange('OCR置信度较低，正在使用AI识别...');

      try {
        const aiResult = await identifyImage(base64, mimeType);
        if (aiResult.title || aiResult.keywords) {
          const searchText = aiResult.keywords || aiResult.title;
          callbacks.onStatusChange(`AI识别完成: ${aiResult.title || '未识别'}`);
          callbacks.onImageRecognized(searchText, 'ai', aiResult);
        } else {
          // 两者都失败，使用OCR结果
          if (cleanedText) {
            callbacks.onStatusChange('AI识别失败，使用OCR结果');
            callbacks.onImageRecognized(cleanedText, 'ocr');
          } else {
            callbacks.onStatusChange('无法识别图片内容');
          }
        }
      } catch (err) {
        // AI识别出错，降级到OCR
        if (cleanedText) {
          callbacks.onStatusChange(`AI识别失败(${err.message})，使用OCR结果`);
          callbacks.onImageRecognized(cleanedText, 'ocr');
        } else {
          callbacks.onStatusChange(`识别失败: ${err.message}`);
        }
      }
    }
  }

  /**
   * 清除图片预览
   */
  function clearImagePreview() {
    currentImageFile = null;
    previewArea.style.display = 'none';
    document.querySelector('.drop-zone-content').style.display = 'block';
    previewImage.src = '';
    fileInput.value = '';
  }

  /**
   * base64转Blob
   */
  function base64ToBlob(base64, mimeType) {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  return {
    clearImage: clearImagePreview,
    setSearchText: (text) => { searchInput.value = text; },
  };
}
```

---

## Task 11: 标签页和结果卡片组件

**Files:**
- Create: `src/components/tabs.js`
- Create: `src/components/result-card.js`

- [ ] **Step 1: 创建 tabs.js**

```javascript
/**
 * 标签页切换组件
 */

export function initTabs() {
  const tabs = document.querySelectorAll('.tab');
  const contents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;

      // 切换标签高亮
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // 切换内容显示
      contents.forEach(c => c.classList.remove('active'));
      document.getElementById(`${target}Results`).classList.add('active');
    });
  });

  return {
    switchTo: (name) => {
      const tab = document.querySelector(`.tab[data-tab="${name}"]`);
      if (tab) tab.click();
    }
  };
}
```

- [ ] **Step 2: 创建 result-card.js**

```javascript
/**
 * 结果卡片组件
 * 生成豆瓣结果和资源站结果的HTML
 */

/**
 * 生成星级评分HTML
 * @param {number} score - 0-10的评分
 * @returns {string}
 */
function renderStars(score) {
  if (!score) return '<span class="rating-score">暂无评分</span>';

  const starCount = Math.round(score / 2);
  let html = '';
  for (let i = 0; i < 5; i++) {
    html += `<span class="star${i < starCount ? '' : ' empty'}">★</span>`;
  }
  html += `<span class="rating-score">${score}</span>`;
  return html;
}

/**
 * 生成类型标签
 * @param {string} type
 * @returns {string}
 */
function typeLabel(type) {
  const labels = {
    movie: '电影',
    book: '图书',
    music: '音乐',
    game: '游戏',
    tv: '电视剧',
  };
  return labels[type] || type || '未知';
}

/**
 * 生成豆瓣结果卡片HTML
 * @param {object} item
 * @returns {string}
 */
export function renderDoubanCard(item) {
  const cover = item.cover
    ? `<img class="result-cover" src="${item.cover}" alt="${item.title}" onerror="this.style.display='none'" />`
    : '<div class="result-cover" style="background:#f5f5f5;display:flex;align-items:center;justify-content:center;color:#ccc;font-size:24px;">🎬</div>';

  return `
    <div class="result-card" data-id="${item.id}" data-type="${item.type}" data-url="${item.url}" data-title="${item.title}">
      ${cover}
      <div class="result-info">
        <div class="result-title">${item.title}</div>
        <div class="result-meta">${typeLabel(item.type)} ${item.year ? '/ ' + item.year : ''}</div>
        <div class="result-rating">${renderStars(item.rating)}</div>
        ${item.summary ? `<div class="result-summary">${item.summary}</div>` : ''}
      </div>
    </div>
  `;
}

/**
 * 生成资源站结果卡片HTML
 * @param {object} item
 * @returns {string}
 */
export function renderResourceCard(item) {
  const typeTag = {
    cloud: { class: 'cloud', text: '网盘' },
    torrent: { class: 'torrent', text: '种子' },
    online: { class: 'online', text: '在线' },
  };

  const tag = typeTag[item.type] || { class: 'cloud', text: '资源' };

  const linksHtml = item.links && item.links.length > 0
    ? item.links.map(l => `<a class="resource-link" href="${l.url}" target="_blank">${l.text || '获取'}</a>`).join(' ')
    : (item.url ? `<a class="resource-link" href="${item.url}" target="_blank">查看</a>` : '');

  return `
    <div class="resource-card">
      <span class="resource-name">${item.title}</span>
      <span class="resource-type-tag ${tag.class}">${tag.text}</span>
      ${linksHtml}
    </div>
  `;
}
```

---

## Task 12: 确认弹窗组件

**Files:**
- Create: `src/components/modal.js`

- [ ] **Step 1: 创建 modal.js**

```javascript
/**
 * 确认弹窗组件
 * 显示条目详情，提供标记操作
 */

import { getDetail, markItem } from '../services/douban.js';
import { randomDelay } from '../utils/delay.js';

/**
 * 初始化弹窗
 * @param {Function} onMarkComplete - 标记完成回调
 */
export function initModal(onMarkComplete) {
  const overlay = document.getElementById('modalOverlay');
  const modalClose = document.getElementById('modalClose');
  const modalCancel = document.getElementById('modalCancel');
  const markButtons = document.getElementById('markButtons');

  // 关闭弹窗
  modalClose.addEventListener('click', closeModal);
  modalCancel.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // ESC关闭
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  function closeModal() {
    overlay.style.display = 'none';
  }

  /**
   * 打开确认弹窗
   * @param {object} item - 豆瓣条目信息
   */
  async function openModal(item) {
    overlay.style.display = 'flex';

    // 填充基础信息
    document.getElementById('modalTitle').textContent = item.title;
    document.getElementById('modalCover').src = item.cover || '';
    document.getElementById('modalCover').style.display = item.cover ? 'block' : 'none';
    document.getElementById('modalRating').innerHTML = item.rating ? renderStars(item.rating) : '暂无评分';
    document.getElementById('modalMeta').textContent = item.year ? `${typeLabel(item.type)} / ${item.year}` : typeLabel(item.type);
    document.getElementById('modalSummary').textContent = '加载中...';
    document.getElementById('modalTags').innerHTML = '';

    // 生成标记按钮
    renderMarkButtons(item);

    // 异步加载详情
    if (item.url) {
      try {
        const detail = await getDetail(item.url);
        if (detail.rating && !item.rating) {
          document.getElementById('modalRating').innerHTML = renderStars(detail.rating);
        }
        document.getElementById('modalSummary').textContent = detail.summary || '暂无简介';
        document.getElementById('modalMeta').textContent = detail.meta || document.getElementById('modalMeta').textContent;

        if (detail.tags && detail.tags.length > 0) {
          document.getElementById('modalTags').innerHTML =
            detail.tags.map(t => `<span class="modal-tag">${t}</span>`).join('');
        }
      } catch {
        document.getElementById('modalSummary').textContent = '无法加载详情';
      }
    }
  }

  /**
   * 渲染标记按钮
   */
  function renderMarkButtons(item) {
    const actions = getActionsByType(item.type);

    markButtons.innerHTML = actions.map(a =>
      `<button class="btn-mark${a.primary ? ' primary' : ''}" data-action="${a.action}">${a.label}</button>`
    ).join('');

    // 绑定点击事件
    markButtons.querySelectorAll('.btn-mark').forEach(btn => {
      btn.addEventListener('click', async () => {
        const action = btn.dataset.action;
        btn.disabled = true;
        btn.textContent = '标记中...';

        const result = await markItem(item.id, item.type, action);

        if (result.success) {
          showToast(result.message, 'success');
          closeModal();
          if (onMarkComplete) onMarkComplete(item, action);
        } else {
          showToast(result.message, 'error');
          btn.disabled = false;
          btn.textContent = getActionsByType(item.type).find(a => a.action === action)?.label || '重试';
        }
      });
    });
  }

  /**
   * 根据类型获取标记动作
   */
  function getActionsByType(type) {
    const actions = {
      movie: [
        { label: '想看', action: 'wish', primary: true },
        { label: '看过', action: 'done' },
      ],
      book: [
        { label: '想读', action: 'wish', primary: true },
        { label: '读过', action: 'done' },
      ],
      music: [
        { label: '想听', action: 'wish', primary: true },
        { label: '听过', action: 'done' },
      ],
      game: [
        { label: '想玩', action: 'wish', primary: true },
        { label: '玩过', action: 'done' },
      ],
    };
    return actions[type] || actions.movie;
  }

  /**
   * 星级评分渲染
   */
  function renderStars(score) {
    if (!score) return '<span class="rating-score">暂无评分</span>';
    const starCount = Math.round(parseFloat(score) / 2);
    let html = '';
    for (let i = 0; i < 5; i++) {
      html += `<span class="star${i < starCount ? '' : ' empty'}">★</span>`;
    }
    html += `<span class="rating-score">${score}</span>`;
    return html;
  }

  function typeLabel(type) {
    const labels = { movie: '电影', book: '图书', music: '音乐', game: '游戏' };
    return labels[type] || type || '未知';
  }

  return { openModal, closeModal };
}

/**
 * 显示Toast提示
 */
export function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.style.display = 'block';

  setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}
```

---

## Task 13: 渲染进程主逻辑

**Files:**
- Create: `src/renderer.js`

- [ ] **Step 1: 创建 renderer.js**

```javascript
/**
 * 渲染进程主逻辑
 * 协调各组件和服务的工作
 */

import { initInput } from './components/input.js';
import { initTabs } from './components/tabs.js';
import { initModal, showToast } from './components/modal.js';
import { renderDoubanCard, renderResourceCard } from './components/result-card.js';
import { searchDouban } from './services/douban.js';
import { searchResource } from './services/resource.js';

// 搜索历史
let searchHistory = JSON.parse(localStorage.getItem('douban-history') || '[]');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  const tabs = initTabs();
  const modal = initModal((item, action) => {
    // 标记完成回调
    addHistory(`✓ ${item.title} (${actionLabels[action] || action})`);
    showToast(`${item.title} 标记成功！`, 'success');
  });

  const actionLabels = { wish: '想看', done: '看过', do: '在看' };

  // 输入组件
  const input = initInput({
    onTextSearch: (text) => performSearch(text),
    onImageRecognized: (text, source, detail) => {
      // 显示识别结果
      showRecognized(text, source, detail);
      performSearch(text);
    },
    onStatusChange: (msg) => updateStatus(msg),
  });

  // 历史记录
  renderHistory();
  document.getElementById('clearHistory').addEventListener('click', () => {
    searchHistory = [];
    localStorage.setItem('douban-history', '[]');
    renderHistory();
  });

  /**
   * 执行搜索
   */
  async function performSearch(keyword) {
    if (!keyword) return;

    // 显示状态区
    document.getElementById('statusModule').style.display = 'block';
    document.getElementById('resultModule').style.display = 'block';

    // 添加到历史
    addHistory(keyword);
    document.getElementById('searchInput').value = keyword;

    // 并行搜索
    updateStatus('搜索中...');
    setDoubanStatus('running', '搜索中...');
    setResourceStatus('running', '搜索中...');

    const [doubanResults, resourceResults] = await Promise.all([
      searchDouban(keyword).catch(err => {
        console.error('豆瓣搜索出错:', err);
        setDoubanStatus('error', '搜索失败');
        return [];
      }),
      searchResource(keyword).catch(err => {
        console.error('资源站搜索出错:', err);
        setResourceStatus('error', '搜索失败');
        return [];
      }),
    ]);

    // 更新豆瓣结果
    renderDoubanResults(doubanResults);
    setDoubanStatus('done', `找到 ${doubanResults.length} 条`);

    // 更新资源站结果
    renderResourceResults(resourceResults);
    setResourceStatus('done', `找到 ${resourceResults.length} 条`);

    updateStatus('搜索完成');
    document.getElementById('resultCount').textContent = `共 ${doubanResults.length + resourceResults.length} 条`;

    // 自动切换到有结果的标签
    if (doubanResults.length > 0) {
      tabs.switchTo('douban');
    } else if (resourceResults.length > 0) {
      tabs.switchTo('resource');
    }
  }

  /**
   * 渲染豆瓣结果
   */
  function renderDoubanResults(results) {
    const list = document.getElementById('doubanList');

    if (results.length === 0) {
      list.innerHTML = '<p class="empty-hint">未找到豆瓣结果</p>';
      return;
    }

    list.innerHTML = results.map(item => renderDoubanCard(item)).join('');

    // 绑定点击事件
    list.querySelectorAll('.result-card').forEach(card => {
      card.addEventListener('click', () => {
        const item = {
          id: card.dataset.id,
          type: card.dataset.type,
          url: card.dataset.url,
          title: card.dataset.title,
          cover: card.querySelector('.result-cover')?.src || '',
          rating: card.querySelector('.rating-score')?.textContent || '',
          year: card.querySelector('.result-meta')?.textContent?.match(/\d{4}/)?.[0] || '',
        };
        modal.openModal(item);
      });
    });
  }

  /**
   * 渲染资源站结果
   */
  function renderResourceResults(results) {
    const list = document.getElementById('resourceList');

    if (results.length === 0) {
      list.innerHTML = '<p class="empty-hint">未找到资源</p>';
      return;
    }

    list.innerHTML = results.map(item => renderResourceCard(item)).join('');
  }

  /**
   * 显示识别结果
   */
  function showRecognized(text, source, detail) {
    const module = document.getElementById('recognizedModule');
    const content = document.getElementById('recognizedText');
    module.style.display = 'block';

    let html = `<p><strong>识别方式:</strong> ${source === 'ocr' ? 'OCR' : 'AI视觉'}</p>`;
    html += `<p><strong>识别内容:</strong> ${text}</p>`;
    if (detail && detail.title) {
      html += `<p><strong>识别标题:</strong> ${detail.title}</p>`;
    }
    if (detail && detail.type && detail.type !== 'unknown') {
      html += `<p><strong>识别类型:</strong> ${detail.type}</p>`;
    }

    content.innerHTML = html;
  }

  /**
   * 更新状态
   */
  function updateStatus(msg) {
    document.getElementById('statusText').textContent = msg;
  }

  function setDoubanStatus(state, text) {
    const el = document.getElementById('doubanStatus');
    el.textContent = text;
    el.className = `status-value ${state}`;
  }

  function setResourceStatus(state, text) {
    const el = document.getElementById('resourceStatus');
    el.textContent = text;
    el.className = `status-value ${state}`;
  }

  /**
   * 历史记录
   */
  function addHistory(text) {
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    searchHistory.unshift({ text, time });
    if (searchHistory.length > 20) searchHistory.pop();

    localStorage.setItem('douban-history', JSON.stringify(searchHistory));
    renderHistory();
  }

  function renderHistory() {
    const list = document.getElementById('historyList');

    if (searchHistory.length === 0) {
      list.innerHTML = '<p class="empty-hint">暂无搜索记录</p>';
      return;
    }

    list.innerHTML = searchHistory.map(item =>
      `<div class="history-item" data-text="${item.text}">
        <span class="history-text">${item.text}</span>
        <span class="history-time">${item.time}</span>
      </div>`
    ).join('');

    // 点击历史项重新搜索
    list.querySelectorAll('.history-item').forEach(el => {
      el.addEventListener('click', () => {
        const text = el.dataset.text;
        if (text && !text.startsWith('✓')) {
          input.setSearchText(text);
          performSearch(text);
        }
      });
    });
  }
});
```

---

## Task 14: 首次运行配置

**Files:**
- Create: `src/config.js`

- [ ] **Step 1: 创建配置文件**

```javascript
/**
 * 应用配置
 * 用户首次运行时需要配置的内容
 */

const CONFIG_KEY = 'douban-auto-stared-config';

const defaultConfig = {
  // Claude Vision API 配置
  visionApiKey: '',
  visionApiBase: 'https://api.anthropic.com',

  // 搜索配置
  maxResults: 20,

  // 防封配置
  minDelay: 2000,
  maxDelay: 5000,
  dailyLimit: 50,
};

/**
 * 加载配置
 */
export function loadConfig() {
  try {
    const saved = localStorage.getItem(CONFIG_KEY);
    if (saved) {
      return { ...defaultConfig, ...JSON.parse(saved) };
    }
  } catch {}
  return { ...defaultConfig };
}

/**
 * 保存配置
 */
export function saveConfig(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

/**
 * 检查是否已配置
 */
export function isConfigured() {
  const config = loadConfig();
  return !!config.visionApiKey;
}
```

---

## 任务执行说明

以上14个Task构成完整实现。执行顺序：

1. **Task 1-2**: 项目初始化 + Electron主进程 → 可运行空白窗口
2. **Task 3-4**: HTML结构 + CSS样式 → 看到完整UI
3. **Task 5**: 工具函数 → 基础设施就绪
4. **Task 6-7**: OCR + Vision服务 → 图片识别能力
5. **Task 8-9**: 豆瓣 + 资源站搜索 → 搜索能力
6. **Task 10-12**: 输入 + 标签页 + 弹窗组件 → 交互能力
7. **Task 13**: 渲染主逻辑 → 所有组件串联
8. **Task 14**: 配置文件 → 完整应用

每完成一个Task即可运行测试当前功能。
