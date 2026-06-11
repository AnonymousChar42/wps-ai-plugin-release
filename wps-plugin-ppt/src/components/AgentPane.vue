<template>
  <!-- PPT 智能体面板 — 薄封装，通过 prop 注入 createPptAgent 工厂函数 -->
  <SharedAgentPane
    title="AI 生成 PPT"
    empty-hint="在此粘贴文本内容，AI 将自动分析并创建 PPT 幻灯片..."
    :create-agent="createPptAgent"
  />
</template>

<script setup lang="ts">
import SharedAgentPane from '@wpsai/shared/components/AgentPane.vue'
import { createAgentState, WpsSlideAdapter, BrowserSlideAdapter } from '@/agent'
import type { AIRequestConfig } from '@wpsai/shared/types'

/**
 * PPT 插件 agent 工厂函数
 * 检测环境（WPS vs 浏览器），创建对应的适配器和 agent 实例。
 */
function createPptAgent(aiConfig: AIRequestConfig) {
  const isWps = WpsSlideAdapter.isAvailable()
  const adapter = isWps
    ? new WpsSlideAdapter()
    : new BrowserSlideAdapter()
  return createAgentState(adapter, aiConfig)
}
</script>
