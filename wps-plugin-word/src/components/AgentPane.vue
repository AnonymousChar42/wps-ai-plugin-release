<template>
  <!-- Word 智能体面板 — 薄封装 -->
  <SharedAgentPane
    title="AI 排版助手"
    empty-hint="在此描述你想要的操作：排版文档、调整格式、创建表格、查找替换..."
    :create-agent="createWordAgent"
  />
</template>

<script setup lang="ts">
import SharedAgentPane from '@wpsai/shared/components/AgentPane.vue'
import { createAgentState, WpsWordAdapter, BrowserWordAdapter } from '@/agent'
import type { AIRequestConfig } from '@wpsai/shared/types'

function createWordAgent(aiConfig: AIRequestConfig) {
  const isWps = WpsWordAdapter.isAvailable()
  const adapter = isWps
    ? new WpsWordAdapter()
    : new BrowserWordAdapter()
  return createAgentState(adapter, aiConfig)
}
</script>
