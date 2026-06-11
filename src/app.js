// ===== 状态 =====
const state = {
  keyword: '',
  history: JSON.parse(localStorage.getItem('douban-history') || '[]'),
  targets: JSON.parse(localStorage.getItem('douban-targets') || '{"douban":true,"resource":false}'),
  tencentId: localStorage.getItem('tencent-secret-id') || '',
  tencentKey: localStorage.getItem('tencent-secret-key') || ''
};

// ===== DOM =====
const $ = id => document.getElementById(id);
const el = {
  searchInput: $('searchInput'), searchBtn: $('searchBtn'),
  dropZone: $('dropZone'), dropContent: $('dropContent'),
  fileInput: $('fileInput'), previewArea: $('previewArea'),
  previewImage: $('previewImage'), ocrResult: $('ocrResult'),
  clearImage: $('clearImage'), targetDouban: $('targetDouban'),
  targetResource: $('targetResource'), historyList: $('historyList'),
  clearHistory: $('clearHistory'), settingsBtn: $('settingsBtn'),
  settingsModal: $('settingsModal'), closeSettings: $('closeSettings'),
  inputSecretId: $('inputSecretId'), inputSecretKey: $('inputSecretKey'),
  saveSettings: $('saveSettings')
};

// ===== 初始化 =====
el.targetDouban.checked = state.targets.douban;
el.targetResource.checked = state.targets.resource;
el.inputSecretId.value = state.tencentId;
el.inputSecretKey.value = state.tencentKey;
renderHistory();

// ===== 清理关键词（去括号和年份） =====
function cleanKeyword(text) {
  return text
    .replace(/[《》\(\)\（\）\[\]\{\}「」『』【】]/g, '')
    .replace(/\d{4}年?/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ===== 解析多个关键词 =====
function parseKeywords(text) {
  if (!text) return [];
  return text.split(/[,，、;；\r\n\t]+/)
    .map(s => cleanKeyword(s.trim()))
    .filter(s => s.length > 0);
}

// ===== 打开URL =====
async function openUrl(url) {
  try {
    if (window.ewvjs && window.ewvjs.api) {
      await window.ewvjs.api.openExternal(url);
    } else if (window.electronAPI) {
      await window.electronAPI.openExternal(url);
    } else {
      window.open(url, '_blank');
    }
  } catch (e) { console.error(e); }
}

// ===== 搜索 =====
function doSearch(text) {
  text = (text || '').trim();
  if (!text) return;
  const keywords = parseKeywords(text);
  if (keywords.length === 0) return;

  const urls = [];
  keywords.forEach(keyword => {
    state.keyword = keyword;
    addHistory(keyword);
    if (el.targetDouban.checked) {
      urls.push('https://www.douban.com/search?q=' + encodeURIComponent(keyword));
    }
    if (el.targetResource.checked) {
      urls.push('https://www.xn--wcv59z.com/search?q=' + encodeURIComponent(keyword) + '&type=&mode=1');
    }
  });

  el.searchInput.value = keywords.join(', ');

  // 直接打开标签页，扩展自动检测并分组
  urls.forEach(function(url) { openUrl(url); });
}

// ===== 搜索按钮/回车 =====
el.searchBtn.addEventListener('click', function() { doSearch(el.searchInput.value); });
el.searchInput.addEventListener('keydown', function(e) {
  if (e.key === 'Enter') { e.preventDefault(); doSearch(el.searchInput.value); }
});

// ===== 设置弹窗 =====
el.settingsBtn.addEventListener('click', function() { el.settingsModal.style.display = 'flex'; });
el.closeSettings.addEventListener('click', function() { el.settingsModal.style.display = 'none'; });
el.settingsModal.addEventListener('click', function(e) { if (e.target === el.settingsModal) el.settingsModal.style.display = 'none'; });
el.saveSettings.addEventListener('click', function() {
  state.tencentId = el.inputSecretId.value.trim();
  state.tencentKey = el.inputSecretKey.value.trim();
  localStorage.setItem('tencent-secret-id', state.tencentId);
  localStorage.setItem('tencent-secret-key', state.tencentKey);
  el.settingsModal.style.display = 'none';
  alert('设置已保存');
});
document.querySelectorAll('.setting-input').forEach(function(input) {
  input.addEventListener('keydown', function(e) { e.stopPropagation(); });
});

// ===== 目标选择 =====
function saveTargets() {
  state.targets = { douban: el.targetDouban.checked, resource: el.targetResource.checked };
  localStorage.setItem('douban-targets', JSON.stringify(state.targets));
}
el.targetDouban.addEventListener('change', saveTargets);
el.targetResource.addEventListener('change', saveTargets);

// ===== 图片处理 =====
el.dropZone.addEventListener('dragover', function(e) { e.preventDefault(); el.dropZone.classList.add('drag-over'); });
el.dropZone.addEventListener('dragleave', function() { el.dropZone.classList.remove('drag-over'); });
el.dropZone.addEventListener('drop', function(e) {
  e.preventDefault(); el.dropZone.classList.remove('drag-over');
  if (e.dataTransfer.files.length > 0 && e.dataTransfer.files[0].type.startsWith('image/')) handleImage(e.dataTransfer.files[0]);
});
el.dropZone.addEventListener('click', function(e) {
  if (e.target.classList.contains('file-label') || e.target.closest('.file-label')) return;
  if (e.target.classList.contains('btn-clear') || e.target.closest('.btn-clear')) return;
  el.fileInput.click();
});
el.fileInput.addEventListener('change', function(e) { if (e.target.files.length > 0) handleImage(e.target.files[0]); });

// ===== 粘贴 =====
document.addEventListener('paste', function(e) {
  if (el.settingsModal.style.display === 'flex') return;
  if (document.activeElement === el.searchInput) return;
  var items = e.clipboardData && e.clipboardData.items;
  if (!items) return;
  for (var i = 0; i < items.length; i++) {
    if (items[i].type.startsWith('image/')) {
      e.preventDefault();
      var file = items[i].getAsFile();
      if (file) handleImage(file);
      return;
    }
  }
  var text = e.clipboardData.getData('text/plain');
  if (text && text.trim()) doSearch(text.trim());
});

// ===== 截图快捷键 =====
document.addEventListener('keydown', function(e) {
  if (e.ctrlKey && e.key === 'v') {
    // 标准粘贴处理已在paste事件中
  }
});

el.clearImage.addEventListener('click', function(e) {
  e.stopPropagation();
  el.previewArea.style.display = 'none';
  el.dropContent.style.display = 'block';
  el.previewImage.src = '';
  el.ocrResult.textContent = '';
  el.fileInput.value = '';
});

async function handleImage(file) {
  var reader = new FileReader();
  reader.onload = function(e) {
    el.previewImage.src = e.target.result;
    el.previewArea.style.display = 'flex';
    el.dropContent.style.display = 'none';
  };
  reader.readAsDataURL(file);

  el.ocrResult.textContent = '识别中...';
  try {
    var base64 = await fileToBase64(file);
    var text = await doOCR(base64, file.type);
    if (text && text.trim().length > 1) {
      // 按行拆分，每行一个关键词
      var lines = text.split(/[\r\n]+/)
        .map(function(s) { return s.replace(/[「」『』【】《》\[\]\{\}]/g, '').replace(/\s+/g, ' ').trim(); })
        .filter(function(s) { return s.length > 1; });
      if (lines.length > 0) {
        el.ocrResult.textContent = '识别结果: ' + lines.join(', ');
        el.searchInput.value = lines.join(', ');
        doSearch(lines.join(', '));
      } else {
        el.ocrResult.textContent = '未能识别';
      }
    } else {
      el.ocrResult.textContent = '未能识别';
    }
  } catch (err) {
    el.ocrResult.textContent = '识别失败: ' + err.message;
  }
}

function fileToBase64(file) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onload = function() { resolve(reader.result.split(',')[1]); };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ===== 腾讯云OCR =====
async function callTencentOCR(imgBase64) {
  if (!state.tencentId || !state.tencentKey) throw new Error('请先配置腾讯云API密钥');

  var action = 'GeneralBasicOCR';
  var host = 'ocr.tencentcloudapi.com';
  var body = JSON.stringify({ ImageBase64: imgBase64 });
  var timestamp = Math.floor(Date.now() / 1000);
  var date = new Date(timestamp * 1000).toISOString().split('T')[0];

  async function hmac256(key, msg) {
    var enc = new TextEncoder();
    var k = typeof key === 'string' ? enc.encode(key) : key;
    var cryptoKey = await crypto.subtle.importKey('raw', k, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(msg)));
  }

  async function sha256(msg) {
    var hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg));
    return Array.from(new Uint8Array(hash)).map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
  }

  var ct = 'application/json; charset=utf-8';
  var ch = 'content-type:' + ct + '\nhost:' + host + '\nx-tc-action:' + action.toLowerCase() + '\n';
  var sh = 'content-type;host;x-tc-action';
  var cr = 'POST\n/\n\n' + ch + '\n' + sh + '\n' + await sha256(body);
  var cs = date + '/ocr/tc3_request';
  var sts = 'TC3-HMAC-SHA256\n' + timestamp + '\n' + cs + '\n' + await sha256(cr);

  var sd = await hmac256('TC3' + state.tencentKey, date);
  var ss = await hmac256(sd, 'ocr');
  var sk = await hmac256(ss, 'tc3_request');
  var sigBytes = await hmac256(sk, sts);
  var signature = Array.from(sigBytes).map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');

  var resp = await fetch('https://' + host, {
    method: 'POST',
    headers: {
      'Authorization': 'TC3-HMAC-SHA256 Credential=' + state.tencentId + '/' + cs + ', SignedHeaders=' + sh + ', Signature=' + signature,
      'Content-Type': ct,
      'Host': host,
      'X-TC-Action': action,
      'X-TC-Version': '2018-11-19',
      'X-TC-Timestamp': String(timestamp),
      'X-TC-Region': 'ap-beijing'
    },
    body: body
  });

  var result = await resp.json();
  var detections = (result.Response && result.Response.TextDetections) || [];
  return detections.map(function(i) { return i.DetectedText; }).join(' ');
}

async function doOCR(base64, mimeType) {
  // 优先使用腾讯云OCR
  if (state.tencentId && state.tencentKey) {
    try { return await callTencentOCR(base64); } catch (e) { console.error('Tencent OCR failed:', e); }
  }
  // 兜底：使用Tesseract.js（纯前端OCR）
  var worker = null;
  try {
    worker = await Tesseract.createWorker('chi_sim+eng', 1, {
      logger: function(m) { console.log('OCR:', m.status, Math.round((m.progress || 0) * 100) + '%'); }
    });
    var dataUrl = 'data:' + mimeType + ';base64,' + base64;
    var result = await worker.recognize(dataUrl);
    return result.data.text;
  } catch (e) {
    console.error('Tesseract OCR failed:', e);
    throw new Error('OCR识别失败，请检查网络或配置腾讯云API');
  } finally {
    if (worker) await worker.terminate();
  }
}

function cleanText(text) {
  return text.replace(/\s+/g, ' ').replace(/[「」『』【】《》\[\]\{\}]/g, '').trim().substring(0, 100);
}

// ===== 历史记录 =====
function addHistory(text) {
  var now = new Date();
  var time = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
  state.history.unshift({ text: text, time: time });
  if (state.history.length > 20) state.history.pop();
  localStorage.setItem('douban-history', JSON.stringify(state.history));
  renderHistory();
}

function deleteHistory(index) {
  state.history.splice(index, 1);
  localStorage.setItem('douban-history', JSON.stringify(state.history));
  renderHistory();
}

function renderHistory() {
  if (state.history.length === 0) {
    el.historyList.innerHTML = '<p class="empty-hint">暂无记录</p>';
    return;
  }
  el.historyList.innerHTML = state.history.map(function(item, i) {
    return '<div class="history-item">' +
      '<span class="history-text" onclick="doSearch(\'' + item.text.replace(/'/g, "\\'") + '\')">' + item.text + '</span>' +
      '<span class="history-time">' + item.time + '</span>' +
      '<span class="history-delete" onclick="deleteHistory(' + i + ')" title="删除">✕</span>' +
      '</div>';
  }).join('');
}

el.clearHistory.addEventListener('click', function() {
  state.history = [];
  localStorage.setItem('douban-history', '[]');
  renderHistory();
});
