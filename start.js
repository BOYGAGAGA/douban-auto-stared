/**
 * 启动脚本 - 解决 ELECTRON_RUN_AS_NODE 环境变量问题
 * 该环境变量会导致 Electron 以普通 Node.js 模式运行，无法使用 Electron API
 */
const { spawn } = require('child_process');
const path = require('path');

// 获取 electron 可执行文件路径
const electronPath = require('electron');

// 清除 ELECTRON_RUN_AS_NODE 环境变量
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

// 获取参数（排除前两个 node 和 start.js）
const args = process.argv.slice(2);

// 启动 Electron 应用
const child = spawn(electronPath, [path.join(__dirname), ...args], {
  env,
  stdio: 'inherit',
  windowsHide: false,
});

child.on('close', (code) => {
  process.exit(code || 0);
});
