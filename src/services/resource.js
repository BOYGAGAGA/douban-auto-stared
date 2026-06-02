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

function parseResourceResults(html) {
  const results = [];

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

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

        let resourceType = 'unknown';
        const text = item.textContent.toLowerCase();
        if (text.includes('网盘') || text.includes('百度') || text.includes('阿里') || text.includes('夸克')) {
          resourceType = 'cloud';
        } else if (text.includes('磁力') || text.includes('torrent') || text.includes('种子')) {
          resourceType = 'torrent';
        } else if (text.includes('在线') || text.includes('观看') || text.includes('播放')) {
          resourceType = 'online';
        }

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

export function openResource(url) {
  if (url) {
    window.open(url, '_blank');
  }
}
