/**
 * Claude Vision API 图像识别服务
 * 用于OCR置信度低时的备选方案
 */

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
