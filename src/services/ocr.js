/**
 * Tesseract.js OCR 服务
 * 本地运行，无需网络
 */

let worker = null;

/**
 * 初始化OCR引擎（懒加载）
 */
async function initWorker() {
  if (worker) return worker;

  const Tesseract = await import('tesseract.js');
  worker = await Tesseract.createWorker('chi_sim+eng', 1, {
    logger: m => {
      if (m.status === 'recognizing text') {
        const progress = Math.round(m.progress * 100);
        window.dispatchEvent(new CustomEvent('ocr-progress', { detail: progress }));
      }
    }
  });

  return worker;
}

/**
 * 对图片进行OCR识别
 * @param {string|Blob} image - 图片的base64字符串、URL或Blob
 * @returns {Promise<{text: string, confidence: number}>}
 */
export async function recognizeText(image) {
  try {
    const w = await initWorker();

    let input = image;
    if (typeof image === 'string' && image.startsWith('data:')) {
      input = image;
    } else if (typeof image === 'string') {
      input = `data:image/png;base64,${image}`;
    }

    const result = await w.recognize(input);

    return {
      text: result.data.text.trim(),
      confidence: result.data.confidence,
    };
  } catch (err) {
    console.error('OCR识别失败:', err);
    return { text: '', confidence: 0 };
  }
}

/**
 * 清理OCR结果，提取可能的搜索关键词
 * @param {string} text - OCR原始文本
 * @returns {string} 清理后的关键词
 */
export function cleanOCRText(text) {
  if (!text) return '';

  let cleaned = text.replace(/\s+/g, ' ').trim();
  cleaned = cleaned.replace(/[「」『』【】《》（）\(\)\[\]\{\}]/g, ' ');

  if (cleaned.length > 100) {
    cleaned = cleaned.substring(0, 100);
  }

  return cleaned.trim();
}

/**
 * 销毁OCR Worker释放资源
 */
export async function destroyOCR() {
  if (worker) {
    await worker.terminate();
    worker = null;
  }
}
