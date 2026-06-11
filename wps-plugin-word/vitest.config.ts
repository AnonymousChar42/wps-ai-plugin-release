import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@wpsai/shared': resolve(__dirname, '../shared'),
    },
  },
  test: {
    environment: 'node',
  },
})
