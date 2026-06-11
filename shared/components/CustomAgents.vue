<template>
  <div class="custom-agents-container">
    <div class="agents-header">
      <h3>自定义 Agent</h3>
      <Button type="primary" size="small" :icon="h(PlusOutlined)" @click="showAddModal">
        新增
      </Button>
    </div>

    <!-- Agents 列表 -->
    <div class="agents-list">
      <Empty v-if="localAgents.length === 0" description="暂无自定义 Agent" />
      <div v-else class="agents-items">
        <div v-for="(agent, index) in localAgents" :key="index" class="agent-item">
          <div class="agent-content">
            <div class="agent-label">{{ agent.label }}</div>
            <div class="agent-preview">{{ agent.showedContent }}</div>
          </div>
          <div class="agent-actions">
            <Button type="text" size="small" :icon="h(EditOutlined)" @click="editAgent(index)" />
            <Button type="text" size="small" danger :icon="h(DeleteOutlined)" @click="deleteAgent(index)" />
          </div>
        </div>
      </div>
    </div>

    <!-- 添加/编辑 Modal -->
    <Modal
      v-model:open="modalVisible"
      :title="isEditing ? '编辑 Agent' : '新增 Agent'"
      @ok="handleSave"
      ok-text="保存"
      cancel-text="取消"
      wrap-class-name="custom-agents-modal"
    >
      <Form layout="vertical">
        <FormItem label="Agent 名称" required>
          <Input
            v-model:value="formData.label"
            placeholder="例如：数据分析、生成图表等"
            @blur="validateLabel"
          />
          <div v-if="errors.label" class="error-text">{{ errors.label }}</div>
        </FormItem>

        <FormItem label="显示文本" required>
          <Input
            v-model:value="formData.showedContent"
            placeholder="用户点击时显示的文本"
            @blur="validateShowedContent"
          />
          <div v-if="errors.showedContent" class="error-text">{{ errors.showedContent }}</div>
        </FormItem>

        <FormItem label="提示词" required>
          <Textarea
            v-model:value="formData.extraPrompt"
            placeholder="输入详细的提示词/指令"
            :rows="6"
            @blur="validateExtraPrompt"
          />
          <div v-if="errors.extraPrompt" class="error-text">{{ errors.extraPrompt }}</div>
        </FormItem>
      </Form>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, h, Ref } from 'vue'
import { Button, Modal, Form, FormItem, Input, Textarea, Empty, message } from 'ant-design-vue'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import type { Agent, CustomAgentFormData, FormErrors, CustomAgentsProps } from '@wpsai/shared/types'

const props = defineProps<Required<CustomAgentsProps>>()

const emit = defineEmits<{
  'update:agents': [agents: Agent[]]
}>()

const modalVisible: Ref<boolean> = ref(false)
const isEditing: Ref<boolean> = ref(false)
const editingIndex: Ref<number> = ref(-1)
const localAgents: Ref<Agent[]> = ref([])

const formData = reactive<CustomAgentFormData>({
  label: '',
  showedContent: '',
  extraPrompt: '',
})

const errors = reactive<FormErrors>({
  label: '',
  showedContent: '',
  extraPrompt: ''
})

// 监听 props.agents 的变化
watch(() => props.agents, (newVal) => {
  localAgents.value = newVal
}, { immediate: true })

const resetFormData = (): void => {
  formData.label = ''
  formData.showedContent = ''
  formData.extraPrompt = ''
  Object.keys(errors).forEach(key => {
    errors[key as keyof FormErrors] = ''
  })
}

const validateLabel = (): void => {
  if (!formData.label.trim()) {
    errors.label = 'Agent 名称不能为空'
  } else if (formData.label.trim().length > 20) {
    errors.label = 'Agent 名称不能超过 20 个字符'
  } else {
    errors.label = ''
  }
}

const validateShowedContent = (): void => {
  if (!formData.showedContent.trim()) {
    errors.showedContent = '显示文本不能为空'
  } else if (formData.showedContent.trim().length > 50) {
    errors.showedContent = '显示文本不能超过 50 个字符'
  } else {
    errors.showedContent = ''
  }
}

const validateExtraPrompt = (): void => {
  if (!formData.extraPrompt.trim()) {
    errors.extraPrompt = '提示词不能为空'
  } else {
    errors.extraPrompt = ''
  }
}

const validateForm = (): boolean => {
  validateLabel()
  validateShowedContent()
  validateExtraPrompt()
  return !errors.label && !errors.showedContent && !errors.extraPrompt
}

const showAddModal = (): void => {
  isEditing.value = false
  editingIndex.value = -1
  resetFormData()
  modalVisible.value = true
}

const editAgent = (index: number): void => {
  isEditing.value = true
  editingIndex.value = index
  const agent = localAgents.value[index]
  formData.label = agent.label
  formData.showedContent = agent.showedContent
  formData.extraPrompt = agent.extraPrompt
  Object.keys(errors).forEach(key => {
    errors[key as keyof FormErrors] = ''
  })
  modalVisible.value = true
}

const deleteAgent = (index: number): void => {
  const newAgents = localAgents.value.filter((_, i) => i !== index)
  emit('update:agents', newAgents)
  message.success('已删除')
}

const handleSave = (): void => {
  if (!validateForm()) {
    message.error('请填写所有必填项')
    return
  }

  const newAgent: Agent = {
    label: formData.label.trim(),
    showedContent: formData.showedContent.trim(),
    extraPrompt: formData.extraPrompt.trim(),
    onClick: null
  }

  let agents: Agent[] = []

  if (isEditing.value) {
    agents = [...localAgents.value]
    agents[editingIndex.value] = newAgent
  } else {
    agents = [...localAgents.value, newAgent]
  }

  emit('update:agents', agents)
  modalVisible.value = false
  resetFormData()
  message.success(isEditing.value ? '更新成功' : '新增成功')
}

</script>

<style scoped>
.custom-agents-container {
  padding: 12px;
  width: 350px;
  max-height: 400px;
  background-color: #ffffff;
}

.agents-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.agents-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
}

.agents-list {
  max-height: 320px;
  overflow-y: auto;
}

.agents-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.agent-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: #fafafa;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
}

.agent-content {
  flex: 1;
  min-width: 0;
}

.agent-label {
  font-weight: 500;
  font-size: 13px;
  margin-bottom: 4px;
  color: #262626;
}

.agent-preview {
  font-size: 12px;
  color: #8c8c8c;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.agent-actions {
  display: flex;
  gap: 4px;
  margin-left: 8px;
}

.error-text {
  color: #ff4d4f;
  font-size: 12px;
  margin-top: 4px;
}

.checkbox-hint {
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 4px;
  margin-left: 24px;
}

:global(.custom-agents-modal) {
  z-index: 1050 !important;
}

:global(.custom-agents-modal .ant-modal) {
  z-index: 1050 !important;
}
</style>
