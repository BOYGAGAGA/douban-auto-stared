/**
 * 从Edge浏览器读取指定域名的Cookie
 */

const EDGE_COOKIE_PATHS = [
  `${process.env.LOCALAPPDATA}/Microsoft/Edge/User Data/Default/Cookies`,
  `${process.env.LOCALAPPDATA}/Microsoft/Edge/User Data/Profile 1/Cookies`,
];

/**
 * 解析Edge Cookie文件获取指定域名的Cookie
 * @param {string} domain - 域名（如 .douban.com）
 * @returns {Promise<string>} Cookie字符串
 */
export async function getEdgeCookies(domain) {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const os = await import('os');

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
