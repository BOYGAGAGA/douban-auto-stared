/**
 * 输入组件
 * 处理文字输入和图片输入（拖拽、粘贴、选择文件）
 */

import { recognizeText, cleanOCRText } from '../services/ocr.js';
import { identifyImage, fileToBase64 } from '../services/vision.js';

/**
 * 初始化输入组件
 * @param {object} callbacks - 回调函数集合
 * @param {Function} callbacks.onTextSearch - 文字搜索回调
 * @param {Function} callbacks.onImageRecognized - 图片识别完成回调
 * @param {Function} callbacks.onStatusChange - 状态变化回调
 */
export function initInput(callbacks) {
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const previewArea = document.getElementById('previewArea');
  const previewImage = document.getElementById('previewImage');
  const clearImage = document.getElementById('clearImage');

  let currentImageFile = null;

  searchBtn.addEventListener('click', () => {
    const text = searchInput.value.trim();
    if (text) callbacks.onTextSearch(text);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const text = searchInput.value.trim();
      if (text) callbacks.onTextSearch(text);
    }
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      handleImageFile(files[0]);
    }
  });

  dropZone.addEventListener('click', (e) => {
    if (e.target.classList.contains('file-label') || e.target.closest('.file-label')) return;
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleImageFile(e.target.files[0]);
    }
  });

  document.addEventListener('paste', async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) handleImageFile(file);
        break;
      }
    }
  });

  document.addEventListener('keydown', async (e) => {
    if (e.ctrlKey && e.key === 'v') {
      if (window.electronAPI) {
        try {
          const base64 = await window.electronAPI.getClipboardImage();
          if (base64) {
            const blob = base64ToBlob(base64, 'image/png');
            handleImageFile(blob);
          }
        } catch {
          // 降级到标准粘贴
        }
      }
    }
  });

  clearImage.addEventListener('click', (e) => {
    e.stopPropagation();
    clearImagePreview();
  });

  if (window.electronAPI) {
    window.electronAPI.onTriggerScreenshot(() => {
      callbacks.onStatusChange('截图功能开发中，请使用系统截图工具后粘贴');
    });
  }

  async function handleImageFile(file) {
    currentImageFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
      previewImage.src = e.target.result;
      previewArea.style.display = 'flex';
      document.querySelector('.drop-zone-content').style.display = 'none';
    };
    reader.readAsDataURL(file);

    callbacks.onStatusChange('正在OCR识别...');
    const { base64, mimeType } = await fileToBase64(file);

    const ocrResult = await recognizeText(`data:${mimeType};base64,${base64}`);
    const cleanedText = cleanOCRText(ocrResult.text);

    if (ocrResult.confidence >= 70 && cleanedText.length > 2) {
      callbacks.onStatusChange(`OCR识别完成 (置信度: ${ocrResult.confidence}%)`);
      callbacks.onImageRecognized(cleanedText, 'ocr');
    } else {
      callbacks.onStatusChange('OCR置信度较低，正在使用AI识别...');

      try {
        const aiResult = await identifyImage(base64, mimeType);
        if (aiResult.title || aiResult.keywords) {
          const searchText = aiResult.keywords || aiResult.title;
          callbacks.onStatusChange(`AI识别完成: ${aiResult.title || '未识别'}`);
          callbacks.onImageRecognized(searchText, 'ai', aiResult);
        } else {
          if (cleanedText) {
            callbacks.onStatusChange('AI识别失败，使用OCR结果');
            callbacks.onImageRecognized(cleanedText, 'ocr');
          } else {
            callbacks.onStatusChange('无法识别图片内容');
          }
        }
      } catch (err) {
        if (cleanedText) {
          callbacks.onStatusChange(`AI识别失败(${err.message})，使用OCR结果`);
          callbacks.onImageRecognized(cleanedText, 'ocr');
        } else {
          callbacks.onStatusChange(`识别失败: ${err.message}`);
        }
      }
    }
  }

  function clearImagePreview() {
    currentImageFile = null;
    previewArea.style.display = 'none';
    document.querySelector('.drop-zone-content').style.display = 'block';
    previewImage.src = '';
    fileInput.value = '';
  }

  function base64ToBlob(base64, mimeType) {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  return {
    clearImage: clearImagePreview,
    setSearchText: (text) => { searchInput.value = text; },
  };
}
