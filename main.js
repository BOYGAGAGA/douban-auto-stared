const { app, BrowserWindow, ipcMain, globalShortcut, clipboard, nativeImage } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: '豆瓣自动标记',
    backgroundColor: '#ffffff',
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

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

ipcMain.handle('get-clipboard-image', () => {
  const image = clipboard.readImage();
  if (image.isEmpty()) return null;
  return image.toPNG().toString('base64');
});

ipcMain.handle('get-platform', () => {
  return process.platform;
});
