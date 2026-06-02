const { app, BrowserWindow, ipcMain, shell, clipboard } = require('electron');
const path = require('path');

let mainWindow;
const searchWindows = []; // 存储搜索窗口

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    minWidth: 700,
    minHeight: 500,
    show: false,
    frame: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    title: '豆瓣自动标记',
    backgroundColor: '#ffffff',
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.setMenu(null);

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC: 打开搜索页面（在新窗口中，可检测无结果并关闭）
ipcMain.handle('open-search', async (event, url) => {
  try {
    const win = new BrowserWindow({
      width: 1000,
      height: 700,
      show: true,
      title: '豆瓣搜索',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      }
    });

    win.setMenu(null);
    win.loadURL(url);
    searchWindows.push(win);

    // 页面加载完成后检测是否无结果
    win.webContents.on('did-finish-load', async () => {
      try {
        const content = await win.webContents.executeJavaScript('document.body.innerText');
        // 检测"没有找到"关键词
        if (content && (content.includes('没有找到') || content.includes('没有结果') || content.includes('no result'))) {
          // 延迟1秒后关闭（让用户看到提示）
          setTimeout(() => {
            if (!win.isDestroyed()) {
              win.close();
            }
          }, 1500);
        }
      } catch (e) {
        // 忽略跨域错误
      }
    });

    win.on('closed', () => {
      const idx = searchWindows.indexOf(win);
      if (idx >= 0) searchWindows.splice(idx, 1);
    });

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: 打开外部链接
ipcMain.handle('open-external', async (event, url) => {
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
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
