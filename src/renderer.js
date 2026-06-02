/**
 * 渲染进程主逻辑
 */

import { initInput } from './components/input.js';
import { initTabs } from './components/tabs.js';
import { initModal, showToast } from './components/modal.js';
import { renderDoubanCard, renderResourceCard } from './components/result-card.js';
import { searchDouban } from './services/douban.js';
import { searchResource } from './services/resource.js';

let searchHistory = JSON.parse(localStorage.getItem('douban-history') || '[]');

document.addEventListener('DOMContentLoaded', () => {
  const tabs = initTabs();
  const modal = initModal((item, action) => {
    addHistory(`✓ ${item.title} (${actionLabels[action] || action})`);
    showToast(`${item.title} 标记成功！`, 'success');
  });

  const actionLabels = { wish: '想看', done: '看过', do: '在看' };

  const input = initInput({
    onTextSearch: (text) => performSearch(text),
    onImageRecognized: (text, source, detail) => {
      showRecognized(text, source, detail);
      performSearch(text);
    },
    onStatusChange: (msg) => updateStatus(msg),
  });

  renderHistory();
  document.getElementById('clearHistory').addEventListener('click', () => {
    searchHistory = [];
    localStorage.setItem('douban-history', '[]');
    renderHistory();
  });

  async function performSearch(keyword) {
    if (!keyword) return;

    document.getElementById('statusModule').style.display = 'block';
    document.getElementById('resultModule').style.display = 'block';

    addHistory(keyword);
    document.getElementById('searchInput').value = keyword;

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

    renderDoubanResults(doubanResults);
    setDoubanStatus('done', `找到 ${doubanResults.length} 条`);

    renderResourceResults(resourceResults);
    setResourceStatus('done', `找到 ${resourceResults.length} 条`);

    updateStatus('搜索完成');
    document.getElementById('resultCount').textContent = `共 ${doubanResults.length + resourceResults.length} 条`;

    if (doubanResults.length > 0) {
      tabs.switchTo('douban');
    } else if (resourceResults.length > 0) {
      tabs.switchTo('resource');
    }
  }

  function renderDoubanResults(results) {
    const list = document.getElementById('doubanList');

    if (results.length === 0) {
      list.innerHTML = '<p class="empty-hint">未找到豆瓣结果</p>';
      return;
    }

    list.innerHTML = results.map(item => renderDoubanCard(item)).join('');

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

  function renderResourceResults(results) {
    const list = document.getElementById('resourceList');

    if (results.length === 0) {
      list.innerHTML = '<p class="empty-hint">未找到资源</p>';
      return;
    }

    list.innerHTML = results.map(item => renderResourceCard(item)).join('');
  }

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
