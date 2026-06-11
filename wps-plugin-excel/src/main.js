import 'core-js'
import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(router)

app.mount('#app')


// import VConsole from 'vconsole';
// import VConsoleOutputlogPlugin from 'vconsole-outputlog-plugin';
import eruda from 'eruda';
if (['localhost', '127.0.0.1'].includes(location.hostname)) {
  // vConsole 在 WPS 中有兼容性问题（icon 白、点击无效）
  // const vConsole = new VConsole();
  // vConsole.addPlugin(new VConsoleOutputlogPlugin());
  eruda.init();
}

// 在前端添加错误监控和自动刷新
let hasShownResourceErrorAlert = false;
window.addEventListener('error', function (e) {
  if (e.target && (e.target.tagName === 'SCRIPT' || e.target.tagName === 'LINK')) {
    const errorUrl = e.target.src || e.target.href;
    if (errorUrl.includes('/assets/') && !hasShownResourceErrorAlert) {
      console.warn('资源加载失败，尝试刷新页面获取新版本');
      hasShownResourceErrorAlert = true;
      const shouldRefresh = window.confirm('检测到页面资源加载失败，是否重新加载页面以获取最新版本？');
      if (!shouldRefresh) return
      setTimeout(() => window.location.reload(true), 2000);
    }
  }
}, true);