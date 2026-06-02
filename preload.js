const { contextBridge, ipcRenderer, shell } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openExternal: (url) => shell.openExternal(url),
  getClipboardImage: () => ipcRenderer.invoke('get-clipboard-image'),
  getClipboardText: () => ipcRenderer.invoke('get-clipboard-text'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  onTriggerScreenshot: (callback) => ipcRenderer.on('trigger-screenshot', callback),
});
