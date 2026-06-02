const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  openSearch: (url) => ipcRenderer.invoke('open-search', url),
  getClipboardImage: () => ipcRenderer.invoke('get-clipboard-image'),
  getClipboardText: () => ipcRenderer.invoke('get-clipboard-text'),
});
