<template>
  <!--
    通用 AI 智能体面板
    通过 prop 注入 createAgent 工厂函数，适配不同 WPS 插件（PPT/Excel/Word）。
    模板和样式完全复用，只通过 title + createAgent + emptyHint 三个 prop 区分。
  -->
  <div class="agent-pane">
    <!-- 顶部标题栏 -->
    <div class="agent-header">
      <span class="agent-title">{{ title }}</span>
      <div class="agent-header-actions">
        <Popover placement="bottomRight" trigger="click">
          <template #content>
            <ApiConfigForm v-model="aiConfig" :url-locked="urlLocked" />
          </template>
          <template #title>
            <span>API配置</span>
          </template>
          <Button :icon="h(SettingOutlined)" />
        </Popover>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="agent-input-area">
      <Input.TextArea
        v-model:value="inputText"
        :auto-size="{ minRows: 5, maxRows: 12 }"
        :placeholder="emptyHint"
        :disabled="agentState.isRunning"
      />
      <Button
        type="primary"
        :loading="agentState.isRunning"
        :disabled="!inputText.trim()"
        @click="handleGenerate"
        class="generate-btn"
      >
        {{ agentState.isRunning ? '正在生成...' : '生成' }}
      </Button>
      <Button
        v-if="agentState.isRunning"
        danger
        @click="handleStop"
        class="stop-btn"
      >
        停止
      </Button>
    </div>

    <!-- 步骤进度 -->
    <StepProgress :steps="agentState.steps" :empty-text="emptyHint" />

    <!-- 最终结果 -->
    <div
      v-if="agentState.result && !agentState.isRunning"
      class="agent-result"
      :class="agentState.success ? 'success' : 'error'"
    >
      <div class="result-text" v-html="renderedResult" />
    </div>

    <!-- 错误提示 -->
    <div v-if="agentState.error && agentState.steps.length === 0" class="agent-error">
      {{ agentState.error }}
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * AgentPane — 通用 AI 智能体面板
 *
 * 通过 prop 注入 createAgent 工厂函数，实现与具体 WPS 插件（PPT/Excel/Word）的解耦。
 *
 * Props:
 *   title       — 面板标题（如 "AI 生成 PPT"）
 *   emptyHint   — 输入框占位文案
 *   createAgent — 插件提供的 agent 工厂函数
 */
import { ref, reactive, computed, watch, h } from 'vue'
import { Input, Button, Popover } from 'ant-design-vue'
import { SettingOutlined } from '@ant-design/icons-vue'
import StepProgress from './StepProgress.vue'
import ApiConfigForm from './ApiConfigForm.vue'
import type { AIRequestConfig, UrlLocked } from '@wpsai/shared/types'
import type { AgentStep } from '@wpsai/shared/types/agent'
import markdownit from 'markdown-it'

// ===== AgentStateManager 接口（内联，避免与 useAgent.ts 的循环依赖） =====
// 在 Phase 08 T8 完成后再统一提取到 shared/agent/

interface AgentRunState {
  steps: AgentStep[]
  isRunning: boolean
  result: string
  error: string | null
  success: boolean
}

/** 智能体状态管理器 */
interface AgentStateManager {
  readonly state: Readonly<AgentRunState>
  onUpdate: ((state: Readonly<AgentRunState>) => void) | null
  run: (inputText: string) => Promise<void>
  stop: () => void
  reset: () => void
}

// ===== Props =====
const props = defineProps<{
  /** 面板标题 */
  title: string
  /** 输入框占位文案 */
  emptyHint?: string
  /** 插件提供的 agent 工厂函数 */
  createAgent: (aiConfig: AIRequestConfig) => AgentStateManager
}>()

// ===== AI 配置（从环境变量初始化，用户可通过 UI 修改） =====
const aiConfig = ref<AIRequestConfig>({
  baseURL: (import.meta.env.VITE_AI_BASE_URL as string) || '',
  model: (import.meta.env.VITE_AI_MODEL as string) || '',
  apiKey: (import.meta.env.VITE_AI_API_KEY as string) || '',
})

// ===== URL 锁定（环境变量控制是否允许修改 baseURL） =====
const urlLocked = computed<UrlLocked>(() => ({
  baseURL: import.meta.env.VITE_AI_BASE_URL_LOCKED === 'true'
}))

// ===== 智能体状态管理（随配置变化自动重建） =====
const agent = ref<AgentStateManager>(props.createAgent(aiConfig.value))

const agentState = reactive<AgentRunState>({
  steps: [],
  isRunning: false,
  result: '',
  error: null,
  success: false
})

function bindAgent(a: AgentStateManager): void {
  a.onUpdate = (newState) => {
    agentState.steps = newState.steps
    agentState.isRunning = newState.isRunning
    agentState.result = newState.result
    agentState.error = newState.error
    agentState.success = newState.success
  }
}

bindAgent(agent.value)

// 配置变更时重建 agent
watch(aiConfig, (newConfig) => {
  const newAgent = props.createAgent({ ...newConfig })
  bindAgent(newAgent)
  agent.value = newAgent
  // 重置界面状态
  agentState.steps = []
  agentState.result = ''
  agentState.error = null
  agentState.success = false
}, { deep: true })

// ===== 用户输入 =====
const inputText = ref('')

// ===== Markdown 渲染 =====
const md = new markdownit({ html: false, breaks: true })
const renderedResult = computed(() => md.render(agentState.result))

function handleStop(): void {
  agent.value.stop()
}

async function handleGenerate(): Promise<void> {
  const text = inputText.value.trim()
  if (!text || agentState.isRunning) return

  agentState.steps = []
  agentState.result = ''
  agentState.error = null
  agentState.success = false

  if (!aiConfig.value.apiKey || !aiConfig.value.baseURL || !aiConfig.value.model) {
    agentState.error = '请先在 API 配置中设置 Base URL、Model 和 API Key'
    agentState.success = false
    return
  }

  await agent.value.run(text)

  // 播放简短提示音
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = agentState.success ? 800 : 400
    osc.type = 'sine'
    gain.gain.value = 0.15
    osc.start()
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    osc.stop(ctx.currentTime + 0.3)
  } catch {
    // 音频不可用则静默
  }
}
</script>

<style scoped>
.agent-pane {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 70px);
  min-height: 0;
  padding: 16px;
  gap: 12px;
  background: #ffffff;
  color: #333333;
}

.agent-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.agent-title {
  font-size: 16px;
  font-weight: 600;
  color: #333333;
}

.agent-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.agent-input-area {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.generate-btn {
  align-self: flex-start;
}

.agent-result {
  padding: 12px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.6;
}

.agent-result.success {
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  color: #389e0d;
}

.agent-result.error {
  background: #fff2f0;
  border: 1px solid #ffccc7;
  color: #cf1322;
}

.stop-btn {
  align-self: flex-start;
  margin-left: 8px;
}

.agent-error {
  padding: 10px 12px;
  background: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 6px;
  color: #cf1322;
  font-size: 13px;
}

/* ===== Markdown 渲染内容样式 ===== */
.result-text {
  font-family: "Microsoft YaHei", "微软雅黑", "PingFang SC", "Hiragino Sans GB", sans-serif;
  font-size: 14px;
  line-height: 1.8;
  color: #333333;
}

.result-text :deep(h1) {
  font-size: 22px;
  font-weight: 600;
  margin: 16px 0 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e8e8e8;
}

.result-text :deep(h2) {
  font-size: 18px;
  font-weight: 600;
  margin: 14px 0 6px;
}

.result-text :deep(h3) {
  font-size: 16px;
  font-weight: 600;
  margin: 12px 0 4px;
}

.result-text :deep(p) {
  margin: 8px 0;
}

.result-text :deep(ul),
.result-text :deep(ol) {
  padding-left: 24px;
  margin: 8px 0;
}

.result-text :deep(li) {
  margin: 4px 0;
}

.result-text :deep(strong) {
  font-weight: 600;
  color: #1a1a1a;
}

.result-text :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
  font-size: 13px;
}

.result-text :deep(th) {
  background: #fafafa;
  border: 1px solid #e8e8e8;
  padding: 8px 12px;
  text-align: left;
  font-weight: 600;
  white-space: nowrap;
}

.result-text :deep(td) {
  border: 1px solid #e8e8e8;
  padding: 6px 12px;
}

.result-text :deep(tr:nth-child(even)) {
  background: #fafafa;
}

.result-text :deep(code) {
  background: #f5f5f5;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: "Consolas", "Courier New", monospace;
  font-size: 13px;
}

.result-text :deep(blockquote) {
  border-left: 3px solid #1890ff;
  padding: 8px 16px;
  margin: 12px 0;
  background: #f0f7ff;
  color: #555;
}
</style>
