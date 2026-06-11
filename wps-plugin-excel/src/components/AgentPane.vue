<template>
  <!-- Excel 智能体面板 — 薄封装 -->
  <SharedAgentPane
    title="AI 生成表格"
    empty-hint="在此描述你想要的操作：排查公式问题、生成表格、格式化数据..."
    :create-agent="createExcelAgent"
  />
</template>

<script setup lang="ts">
import SharedAgentPane from '@wpsai/shared/components/AgentPane.vue'
import { createAgentState, WpsExcelAdapter, BrowserExcelAdapter } from '@/agent'
import type { AIRequestConfig } from '@wpsai/shared/types'

function createExcelAgent(aiConfig: AIRequestConfig) {
  const isWps = WpsExcelAdapter.isAvailable()
  const adapter = isWps
    ? new WpsExcelAdapter()
    : new BrowserExcelAdapter()
  return createAgentState(adapter, aiConfig)
}
</script>
