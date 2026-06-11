// publish.js — 生成 WPS 插件发布页面
//
// 用法:
//   node publish.js                  → 交互式提示输入 URL
//   node publish.js --url https://example.com/wpsai/   → 直接指定 base URL
//   node publish.js --url http://localhost:5500/        → 本地开发
//
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
process.chdir(scriptDir);

function getBaseUrl() {
  const args = process.argv.slice(2);
  const urlIdx = args.indexOf('--url');
  if (urlIdx !== -1 && args[urlIdx + 1]) {
    return args[urlIdx + 1].replace(/\/?$/, '/');
  }
  return null;
}

async function main() {
  let baseUrl = getBaseUrl();

  if (!baseUrl) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    baseUrl = await new Promise((resolve) => {
      rl.question('请输入插件部署的基础 URL（例如 http://localhost:5500/）: ', (answer) => {
        rl.close();
        resolve(answer.trim().replace(/\/?$/, '/') || 'http://localhost:5500/');
      });
    });
  }

  console.log(`正在使用 base URL: ${baseUrl}`);

  const templatePath = path.join(scriptDir, 'publish-template.html');
  if (!fs.existsSync(templatePath)) {
    throw new Error(`找不到模板文件: ${templatePath}`);
  }

  let templateContent = fs.readFileSync(templatePath, 'utf8');

  const curList = [
    {
      name: "wps-assistant",
      addonType: "et",
      online: "true",
      multiUser: "false",
      url: baseUrl + 'wps-plugin-excel/'
    },
    {
      name: "wps-plugin-word",
      addonType: "wps",
      online: "true",
      multiUser: "false",
      url: baseUrl + 'wps-plugin-word/'
    },
    {
      name: "wps-plugin-ppt",
      addonType: "wpp",
      online: "true",
      multiUser: "false",
      url: baseUrl + 'wps-plugin-ppt/'
    }
  ];

  const updatedContent = templateContent.replace(
    `var curList = []; // CUR_LIST_PLACEHOLDER`,
    `var curList = ${JSON.stringify(curList)};`
  );

  const outputPath = path.join(scriptDir, 'publish.html');
  fs.writeFileSync(outputPath, updatedContent);

  console.log(`已生成 publish.html（base URL: ${baseUrl}）`);
  console.log(`输出位置: ${outputPath}`);
}

main().catch((error) => {
  console.error('执行出错:', error.message);
  process.exit(1);
});
