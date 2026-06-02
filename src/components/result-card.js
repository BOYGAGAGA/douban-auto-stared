/**
 * 结果卡片组件
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
