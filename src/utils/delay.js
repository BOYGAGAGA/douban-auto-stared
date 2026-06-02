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
