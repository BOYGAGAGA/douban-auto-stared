const { app, BrowserWindow, ipcMain, globalShortcut, clipboard, nativeImage } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    show: false, // 先隐藏，加载完成后再显示
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: '豆瓣自动标记',
    backgroundColor: '#ffffff',
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  // 页面加载完成后显示窗口
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  createWindow();

  globalShortcut.register('CommandOrControl+Shift+S', () => {
    if (mainWindow) {
      mainWindow.webContents.send('trigger-screenshot');
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  if (process.platform !== 'darwin') app.quit();
});

// IPC: 读取剪贴板图片
ipcMain.handle('get-clipboard-image', () => {
  const image = clipboard.readImage();
  if (image.isEmpty()) return null;
  return image.toPNG().toString('base64');
});

// IPC: 读取剪贴板文字
ipcMain.handle('get-clipboard-text', () => {
  return clipboard.readText();
});

// IPC: 获取系统平台信息
ipcMain.handle('get-platform', () => {
  return process.platform;
});
