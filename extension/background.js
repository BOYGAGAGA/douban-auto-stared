// 待分组的标签页队列
let pendingTabs = [];
let groupTimer = null;

// 匹配的 URL 模式
const PATTERNS = [
  /^https:\/\/www\.douban\.com\/search/,
  /^https:\/\/www\.xn--wcv59z\.com\/search/
];

function isSearchUrl(url) {
  return PATTERNS.some(p => p.test(url));
}

// 收集标签页，延迟后统一分组
chrome.tabs.onCreated.addListener((tab) => {
  if (!tab.url || !isSearchUrl(tab.url)) return;

  pendingTabs.push(tab.id);

  // 每次新标签页重置计时器，等所有标签页都创建完
  if (groupTimer) clearTimeout(groupTimer);
  groupTimer = setTimeout(groupPendingTabs, 800);
});

// 也监听 URL 更新（有些标签页创建时 url 为空，稍后才加载）
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url && isSearchUrl(changeInfo.url)) {
    if (!pendingTabs.includes(tabId)) {
      pendingTabs.push(tabId);
      if (groupTimer) clearTimeout(groupTimer);
      groupTimer = setTimeout(groupPendingTabs, 800);
    }
  }
});

async function groupPendingTabs() {
  const tabIds = [...pendingTabs];
  pendingTabs = [];
  groupTimer = null;

  if (tabIds.length < 2) {
    // 单个标签页不需要分组
    return;
  }

  // 过滤掉已关闭的标签页
  const validTabs = [];
  for (const id of tabIds) {
    try {
      const tab = await chrome.tabs.get(id);
      if (tab) validTabs.push(id);
    } catch (e) { /* 标签页已关闭 */ }
  }

  if (validTabs.length < 2) return;

  const title = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

  try {
    const groupId = await chrome.tabs.group({ tabIds: validTabs });
    await chrome.tabGroups.update(groupId, {
      title: title,
      color: 'blue',
      collapsed: false
    });
  } catch (e) {
    console.error('分组失败:', e);
  }
}