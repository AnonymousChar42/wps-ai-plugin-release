<template>
  <div class="api-config-form">
    <a-form :model="formState" layout="vertical">
      <a-form-item label="Base URL" name="baseURL" :rules="[{ required: true, message: '请输入 Base URL' }]">
        <a-input v-model:value="formState.baseURL" placeholder="请输入 Base URL" :disabled="isUrlLocked" />
      </a-form-item>

      <a-form-item label="Model" name="model" :rules="[{ required: true, message: '请输入 Model' }]">
        <a-input v-model:value="formState.model" placeholder="请输入 Model" />
      </a-form-item>

      <a-form-item label="API Key" name="apiKey" :rules="[{ required: true, message: '请输入 API Key' }]" v-if="!isUrlLocked">
        <a-input-password v-model:value="formState.apiKey" placeholder="请输入 API Key" />
      </a-form-item>
    </a-form>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch, computed } from 'vue'
import {
  Form as AForm,
  FormItem as AFormItem,
  InputPassword as AInputPassword,
  Input as AInput,
} from 'ant-design-vue'
import type { AIRequestConfig, UrlLocked, ApiConfigFormProps } from '@wpsai/shared/types'

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

// 监听表单变化并更新父组件
watch(formState, (newVal) => {
  emit('update:modelValue', { ...newVal })
}, { deep: true })

</script>

<style scoped>
.ant-form-item {
  margin-bottom: 10px;
}
</style>
