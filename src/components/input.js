/**
 * 输入组件
 * 处理文字输入和图片输入（拖拽、粘贴、选择文件）
 * 支持同时粘贴文字和图片
 */

import { recognizeText, cleanOCRText } from '../services/ocr.js';
import { identifyImage, fileToBase64 } from '../services/vision.js';

/**
 * 初始化输入组件
 * @param {object} callbacks
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
  const pasteArea = document.getElementById('pasteArea');

  let currentImageFile = null;

  // 文字搜索
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

  // 拖拽处理
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
    if (files.length > 0) {
      if (files[0].type.startsWith('image/')) {
        handleImageFile(files[0]);
      }
    }
    // 检查是否有文字
    const text = e.dataTransfer.getData('text');
    if (text && text.trim()) {
      searchInput.value = text.trim();
      callbacks.onTextSearch(text.trim());
    }
  });

  // 点击选择文件
  dropZone.addEventListener('click', (e) => {
    if (e.target.classList.contains('file-label') || e.target.closest('.file-label')) return;
    if (e.target.classList.contains('btn-clear') || e.target.closest('.btn-clear')) return;
    if (e.target.tagName === 'TEXTAREA') return;
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleImageFile(e.target.files[0]);
    }
  });

  // 粘贴处理 - 同时支持文字和图片
  document.addEventListener('paste', async (e) => {
    // 如果焦点在搜索框，让搜索框自己处理粘贴
    if (document.activeElement === searchInput) return;

    const items = e.clipboardData?.items;
    if (!items) return;

    let hasImage = false;
    let hasText = false;

    // 先检查是否有图片
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        hasImage = true;
        const file = item.getAsFile();
        if (file) handleImageFile(file);
        break;
      }
    }

    // 检查是否有文字
    const text = e.clipboardData.getData('text/plain');
    if (text && text.trim()) {
      hasText = true;
      if (!hasImage) {
        // 只有文字，直接搜索
        searchInput.value = text.trim();
        callbacks.onTextSearch(text.trim());
      }
    }
  });

  // 全局 Ctrl+V 处理
  document.addEventListener('keydown', async (e) => {
    if (e.ctrlKey && e.key === 'v') {
      // 如果焦点在搜索框，让搜索框自己处理
      if (document.activeElement === searchInput) return;

      if (window.electronAPI) {
        try {
          // 先检查剪贴板是否有图片
          const base64 = await window.electronAPI.getClipboardImage();
          if (base64) {
            const blob = base64ToBlob(base64, 'image/png');
            handleImageFile(blob);
            return;
          }
          // 如果没有图片，检查文字
          const text = await window.electronAPI.getClipboardText();
          if (text && text.trim()) {
            searchInput.value = text.trim();
            callbacks.onTextSearch(text.trim());
          }
        } catch {
          // 降级到标准粘贴
        }
      }
    }
  });

  // 清除图片
  clearImage.addEventListener('click', (e) => {
    e.stopPropagation();
    clearImagePreview();
  });

  // 截图触发
  if (window.electronAPI) {
    window.electronAPI.onTriggerScreenshot(() => {
      callbacks.onStatusChange('截图功能开发中，请使用系统截图工具后粘贴');
    });
  }

  /**
   * 处理图片文件
   */
  async function handleImageFile(file) {
    currentImageFile = file;

    // 显示预览
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImage.src = e.target.result;
      previewArea.style.display = 'flex';
      document.querySelector('.drop-zone-content').style.display = 'none';
    };
    reader.readAsDataURL(file);

    // 开始识别
    callbacks.onStatusChange('正在OCR识别...');
    const { base64, mimeType } = await fileToBase64(file);

    // Step 1: OCR
    const ocrResult = await recognizeText(`data:${mimeType};base64,${base64}`);
    const cleanedText = cleanOCRText(ocrResult.text);

    if (ocrResult.confidence >= 70 && cleanedText.length > 2) {
      callbacks.onStatusChange(`OCR识别完成 (置信度: ${ocrResult.confidence}%)`);
      callbacks.onImageRecognized(cleanedText, 'ocr');
      // 同时在搜索框显示识别结果
      searchInput.value = cleanedText;
    } else {
      // OCR置信度低，使用AI识别
      callbacks.onStatusChange('OCR置信度较低，正在使用AI识别...');

      try {
        const aiResult = await identifyImage(base64, mimeType);
        if (aiResult.title || aiResult.keywords) {
          const searchText = aiResult.keywords || aiResult.title;
          callbacks.onStatusChange(`AI识别完成: ${aiResult.title || '未识别'}`);
          callbacks.onImageRecognized(searchText, 'ai', aiResult);
          searchInput.value = searchText;
        } else {
          if (cleanedText) {
            callbacks.onStatusChange('AI识别失败，使用OCR结果');
            callbacks.onImageRecognized(cleanedText, 'ocr');
            searchInput.value = cleanedText;
          } else {
            callbacks.onStatusChange('无法识别图片内容');
          }
        }
      } catch (err) {
        if (cleanedText) {
          callbacks.onStatusChange(`AI识别失败(${err.message})，使用OCR结果`);
          callbacks.onImageRecognized(cleanedText, 'ocr');
          searchInput.value = cleanedText;
        } else {
          callbacks.onStatusChange(`识别失败: ${err.message}`);
        }
      }
    }
  }

  /**
   * 清除图片预览
   */
  function clearImagePreview() {
    currentImageFile = null;
    previewArea.style.display = 'none';
    document.querySelector('.drop-zone-content').style.display = 'block';
    previewImage.src = '';
    fileInput.value = '';
  }

  /**
   * base64转Blob
   */
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
