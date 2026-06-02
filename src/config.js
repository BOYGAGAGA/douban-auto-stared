/**
 * 应用配置
 */

const CONFIG_KEY = 'douban-auto-stared-config';

const defaultConfig = {
  visionApiKey: '',
  visionApiBase: 'https://api.anthropic.com',
  maxResults: 20,
  minDelay: 2000,
  maxDelay: 5000,
  dailyLimit: 50,
};

export function loadConfig() {
  try {
    const saved = localStorage.getItem(CONFIG_KEY);
    if (saved) {
      return { ...defaultConfig, ...JSON.parse(saved) };
    }
  } catch {}
  return { ...defaultConfig };
}

export function saveConfig(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function isConfigured() {
  const config = loadConfig();
  return !!config.visionApiKey;
}
