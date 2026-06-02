/**
 * 确认弹窗组件
 */

import { getDetail, markItem } from '../services/douban.js';
import { randomDelay } from '../utils/delay.js';

export function initModal(onMarkComplete) {
  const overlay = document.getElementById('modalOverlay');
  const modalClose = document.getElementById('modalClose');
  const modalCancel = document.getElementById('modalCancel');
  const markButtons = document.getElementById('markButtons');

  modalClose.addEventListener('click', closeModal);
  modalCancel.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  function closeModal() {
    overlay.style.display = 'none';
  }

  async function openModal(item) {
    overlay.style.display = 'flex';

    document.getElementById('modalTitle').textContent = item.title;
    document.getElementById('modalCover').src = item.cover || '';
    document.getElementById('modalCover').style.display = item.cover ? 'block' : 'none';
    document.getElementById('modalRating').innerHTML = item.rating ? renderStars(item.rating) : '暂无评分';
    document.getElementById('modalMeta').textContent = item.year ? `${typeLabel(item.type)} / ${item.year}` : typeLabel(item.type);
    document.getElementById('modalSummary').textContent = '加载中...';
    document.getElementById('modalTags').innerHTML = '';

    renderMarkButtons(item);

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

  function renderMarkButtons(item) {
    const actions = getActionsByType(item.type);

    markButtons.innerHTML = actions.map(a =>
      `<button class="btn-mark${a.primary ? ' primary' : ''}" data-action="${a.action}">${a.label}</button>`
    ).join('');

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

export function showToast(message, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.style.display = 'block';

  setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}
