<template>
  <div class="api-config-form">
    <a-form :model="formState" layout="vertical">
      <a-form-item label="Base URL" name="baseURL" :rules="[{ required: true, message: '请输入 Base URL' }]">
        <a-input
          v-model:value="formState.baseURL"
          placeholder="https://api.deepseek.com/v1/chat/completions"
          :disabled="isUrlLocked"
        />
      </a-form-item>

      <a-form-item label="Model" name="model" :rules="[{ required: true, message: '请输入 Model' }]">
        <a-input
          v-model:value="formState.model"
          placeholder="deepseek-v4-flash"
        />
      </a-form-item>

      <a-form-item label="API Key" name="apiKey" :rules="[{ required: true, message: '请输入 API Key' }]" v-if="!isUrlLocked">
        <a-input-password
          v-model:value="formState.apiKey"
          placeholder="sk-..."
        />
      </a-form-item>
    </a-form>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch, computed, onMounted } from 'vue'
import {
  Form as AForm,
  FormItem as AFormItem,
  InputPassword as AInputPassword,
  Input as AInput,
} from 'ant-design-vue'
import type { AIRequestConfig, UrlLocked, ApiConfigFormProps } from '@wpsai/shared/types'

const STORAGE_KEY = 'wpsai-api-config'

const props = defineProps<Required<ApiConfigFormProps>>()

const emit = defineEmits<{
  'update:modelValue': [value: AIRequestConfig]
}>()

// 表单状态
const formState = reactive<AIRequestConfig>({
  baseURL: props.modelValue?.baseURL || '',
  model: props.modelValue?.model || '',
  apiKey: props.modelValue?.apiKey || ''
})

// 计算 URL 是否锁定
const isUrlLocked = computed<boolean>(() => {
  if (typeof props.urlLocked === 'boolean') {
    return props.urlLocked
  }
  return (props.urlLocked as UrlLocked)?.baseURL || false
})

// ===== localStorage 持久化 =====

// 从 localStorage 读取已保存的配置（优先级高于 env 默认值）
function loadFromStorage(): AIRequestConfig | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored) as AIRequestConfig
    }
  } catch {
    // 解析失败则忽略
  }
  return null
}

// 保存到 localStorage
function saveToStorage(config: AIRequestConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch {
    // localStorage 不可用则静默
  }
}

// 挂载时：localStorage 有值则覆盖初始值
onMounted(() => {
  const saved = loadFromStorage()
  if (saved) {
    // 保留 env 锁定的字段
    if (isUrlLocked.value && props.modelValue?.baseURL) {
      saved.baseURL = props.modelValue.baseURL
    }
    formState.baseURL = saved.baseURL || formState.baseURL
    formState.model = saved.model || formState.model
    formState.apiKey = saved.apiKey || formState.apiKey
    emit('update:modelValue', { ...formState })
  }
})

// 监听表单变化 → emit 给父组件 + 保存到 localStorage
watch(formState, (newVal) => {
  emit('update:modelValue', { ...newVal })
  saveToStorage({ ...newVal })
}, { deep: true })

</script>

<style scoped>
.ant-form-item {
  margin-bottom: 10px;
}
</style>
