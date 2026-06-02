/**
 * 豆瓣搜索 + 标记服务
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
    const results = await Promise.all([
      searchMovie(keyword),
      searchBook(keyword),
    ]);

    const all = [...results[0], ...results[1]];
    const seen = new Set();
    return all.filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  } catch (err) {
    console.error('豆瓣搜索失败:', err);
    return await searchDoubanWeb(keyword);
  }
}

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

    const ratingEl = doc.querySelector('.rating_num, .rating_self strong');
    const rating = ratingEl?.textContent?.trim() || '';

    const summaryEl = doc.querySelector('#link-report .intro, #content .intro');
    const summary = summaryEl?.textContent?.trim() || '';

    const tagEls = doc.querySelectorAll('.tags-body a, .tag');
    const tags = Array.from(tagEls).map(t => t.textContent.trim()).slice(0, 10);

    const infoEl = doc.querySelector('#info');
    const meta = infoEl?.textContent?.trim() || '';

    return { rating, summary, tags, meta };
  } catch (err) {
    console.error('获取详情失败:', err);
    return { rating: '', summary: '', tags: [], meta: '' };
  }
}

export async function markItem(id, type, action) {
  await randomDelay();

  const cookie = await getEdgeCookies('douban.com');
  if (!cookie) {
    return { success: false, message: '未找到豆瓣Cookie，请先在Edge浏览器中登录豆瓣' };
  }

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

export async function loginAndGetCookies() {
  try {
    const { chromium } = await import('playwright');

    const browser = await chromium.launch({
      channel: 'msedge',
      headless: false,
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('https://www.douban.com/');
    console.log('请在打开的浏览器中登录豆瓣...');

    await page.waitForURL('**/douban.com/**', { timeout: 300000 });

    const cookies = await context.cookies();

    const { saveCookies } = await import('../utils/cookie.js');
    await saveCookies(cookies);

    await browser.close();
    return true;
  } catch (err) {
    console.error('登录获取Cookie失败:', err);
    return false;
  }
}
