<template>
  <div class="ai-chat-container">
    <div class="ai-chat-header">
      <Popover placement="bottomRight" trigger="click">
        <template #content>
          <ApiConfigForm v-model="aiRequestConfig" :url-locked="urlLocked" />
        </template>
        <template #title>
          <span>API配置</span>
        </template>
        <Button :icon="h(SettingOutlined)" />
      </Popover>
      <Popover placement="bottomRight" trigger="click">
        <template #content>
          <CustomAgents :agents="customAgents" @update:agents="updateCustomAgents" />
        </template>
        <!-- <Button :icon="h(RobotOutlined)" /> -->
      </Popover>
      <Button :icon="h(ClearOutlined)" @click="reload" />
    </div>
    <div class="content-wrapper">
      <ChatBox :aiRequestConfig="aiRequestConfig" :agents="mergedAgents" :key="chatBoxKey" class="chat-box" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, h, watch, computed, onMounted, Ref } from 'vue'
import { Button, Popover } from 'ant-design-vue'
import ApiConfigForm from './ApiConfigForm.vue'
import ChatBox from './ChatBox.vue'
import CustomAgents from './CustomAgents.vue'
import {
  SettingOutlined,
  ClearOutlined,
} from '@ant-design/icons-vue'
import type { Agent, AIRequestConfig, UrlLocked, AiPaneProps } from '@wpsai/shared/types'

const props = defineProps<AiPaneProps>()

const aiRequestConfig = ref<AIRequestConfig>({
  baseURL: (import.meta.env.VITE_AI_BASE_URL as string) || '',
  model: (import.meta.env.VITE_AI_MODEL as string) || '',
  apiKey: (import.meta.env.VITE_AI_API_KEY as string) || '',
})

// 计算属性，用于确定哪些字段被锁定
const urlLocked = computed<UrlLocked>(() => ({
  baseURL: import.meta.env.VITE_AI_BASE_URL_LOCKED === 'true'
}))

// 自定义 agents
const customAgents: Ref<Agent[]> = ref([])

// 从 localStorage 加载自定义 agents
const loadCustomAgents = (): void => {
  try {
    const stored = localStorage.getItem(props.storageKey)
    if (stored) {
      customAgents.value = JSON.parse(stored)
    }
  } catch (error) {
    console.error('Failed to load custom agents:', error)
  }
}

// 组件挂载时加载数据
onMounted(() => {
  loadCustomAgents()
})

// 监听其他标签页的 localStorage 变化
window.addEventListener('storage', (e: StorageEvent) => {
  if (e.key === props.storageKey) {
    loadCustomAgents()
  }
})

// 合并默认和自定义 agents
const mergedAgents = computed<Agent[]>(() => [...props.defaultAgents, ...customAgents.value])

const chatBoxKey: Ref<number> = ref(0)

// 监听配置变化，重新渲染组件
watch(() => aiRequestConfig.value, () => {
  chatBoxKey.value += 1
})

const updateCustomAgents = (newAgents: Agent[]): void => {
  customAgents.value = newAgents
  // 保存到 localStorage
  try {
    localStorage.setItem(props.storageKey, JSON.stringify(newAgents))
  } catch (error) {
    console.error('Failed to save custom agents:', error)
  }
}

const reload = (): void => location.reload()
</script>

<style scoped>
.ai-chat-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 70px);
  min-height: 0;
}

.content-wrapper {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.chat-box {
  flex: 1;
}

.ai-chat-header .ant-btn {
  margin-left: 10px;
  float: right;
}
</style>
