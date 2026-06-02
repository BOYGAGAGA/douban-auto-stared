const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getClipboardImage: () => ipcRenderer.invoke('get-clipboard-image'),
  getClipboardText: () => ipcRenderer.invoke('get-clipboard-text'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  onTriggerScreenshot: (callback) => ipcRenderer.on('trigger-screenshot', callback),
});
