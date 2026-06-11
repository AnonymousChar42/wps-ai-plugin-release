import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@wpsai/shared': fileURLToPath(new URL('../shared', import.meta.url))
    }
  },
  test: {
    // 使用 jsdom 模拟浏览器环境
    environment: 'jsdom',
    // 测试文件匹配模式
    include: ['src/**/*.test.ts'],
    // 全局配置
    globals: true
  }
})
