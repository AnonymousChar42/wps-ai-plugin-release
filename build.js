// build.js — 自动化构建 WPS 插件
//
// 用法: node build.js
// 需要先安装 wpsjs CLI: npm install -g wpsjs
//
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
process.chdir(scriptDir);

const plugins = ['excel', 'word', 'ppt'];

for (const plugin of plugins) {
  console.log('==================================================');
  console.log(`开始处理 ${plugin} 插件...`);
  console.log('==================================================');

  const pluginDir = `wps-plugin-${plugin}`;

  if (!fs.existsSync(pluginDir)) {
    console.log(`目录 ${pluginDir} 不存在，跳过处理`);
    continue;
  }

  const pluginPath = path.join(scriptDir, pluginDir);
  process.chdir(pluginPath);

  // 1. 清理旧的构建目录
  console.log('1. 清理旧的构建目录...');
  const buildDir = 'wps-addon-build';
  if (fs.existsSync(buildDir)) {
    fs.rmSync(buildDir, { recursive: true });
    console.log('   已删除旧的 wps-addon-build 目录');
  }
  fs.mkdirSync(buildDir, { recursive: true });
  console.log('   已创建新的 wps-addon-build 目录');

  // 2. 安装依赖
  console.log('2. 安装项目依赖...');
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('   依赖安装成功');
  } catch (error) {
    console.error('npm install 失败，请检查错误信息。');
    process.exit(1);
  }

  // 3. 构建
  console.log('3. 开始构建 WPS 加载项...');
  try {
    execSync('echo "在线插件" | wpsjs build', { stdio: 'inherit' });
    console.log('   构建成功');
  } catch (error) {
    console.error('构建失败，请检查错误信息。');
    process.exit(1);
  }

  console.log(`${plugin} 插件自动化构建流程完成！`);

  process.chdir(scriptDir);
}
