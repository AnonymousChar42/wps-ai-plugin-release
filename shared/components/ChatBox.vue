<template>
  <div class="ai-chat-box">
    <!-- 模板编辑按钮（调试用） -->
    <div class="template-editor-buttons" v-if="promptTemplates.visible">
      <Popover placement="bottomRight" trigger="click" v-for="key in ['msgTemplate', 'btnTemplate']" :key="key">
        <template #content>
          <div class="template-editor">
            <Textarea v-model:value="promptTemplates[key]" :autoSize="{ minRows: 10 }" />
          </div>
        </template>
        <Button type="default">编辑 {{ key }}</Button>
      </Popover>
    </div>
    <!-- 对话框区域 -->
    <div class="chat-messages">
      <Bubble.List :items="chatItems" :roles="roles" auto-scroll style="height: 100%;">
        <!-- 自定义 AI 消息的渲染 -->
        <template #message="{ item }">
          <div v-if="item.role === 'assistant'">
            <div v-if="typeof item.content === 'string'">
              <div v-html="item.renderedHtml || item.content"></div>
            </div>
            <div v-else>
              <component :is="item.content" />
            </div>
          </div>
          <div v-else>
            {{ item.showedContent || item.content }}
          </div>
        </template>

        <!-- AI 消息的底部操作 -->
        <template #footer="{ item }">
          <div v-if="item.role === 'assistant' && item.key !== 'welcome'" class="message-actions">
            <Space :size="4">
              <Button type="text" size="small" :icon="h(ReloadOutlined)" @click="regenerateResponse(item)" />
              <Button type="text" size="small" :icon="h(CopyOutlined)" @click="copyMessage(item.content)" />
            </Space>
          </div>
        </template>
      </Bubble.List>
    </div>

    <!-- 输入框区域 -->
    <div class="chat-input">
      <div class="quick-actions">
        <Button v-for="item, index in quickActions" :key="index" @click="() => item.onClick?.(item)" type="primary">
          {{ item.label }}
        </Button>
      </div>
      <Sender v-model:value="inputValue" :loading="isLoading" :auto-size="{ minRows: 2, maxRows: 6 }"
        submit-type="enter" placeholder="请输入您的问题..." @submit="handleSendMessage" @cancel="handleCancelSend">
      </Sender>
    </div>

    <!-- 消息提示 -->
    <message-holder />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, h, onUnmounted, computed, inject, Ref } from 'vue'
import { message, Button, Space, Popover, Textarea } from 'ant-design-vue'
import {
  Bubble,
  Sender,
  XRequest
} from 'ant-design-x-vue'
import {
  UserOutlined,
  RobotOutlined,
  CopyOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue'
import markdownit from 'markdown-it'
import MermaidIt from '../js/mermaid-it-markdown'
import useSvgImageCopy from '../js/useSvgImageCopy'
import type {
  Agent,
  ChatItem,
  TemplatesByProject,
  Roles,
  PromptTemplates,
  ChatBoxProps
} from '@wpsai/shared/types'

const props = defineProps<Required<ChatBoxProps>>()

// 响应式数据
const inputValue: Ref<string> = ref('')
const isLoading: Ref<boolean> = ref(false)
const chatItems: Ref<ChatItem[]> = ref([])
const [messageApi, messageHolder] = message.useMessage() as any
const svgImageCopy = useSvgImageCopy({ selector: 'svg[id^="mermaid-svg-"]' })

// 注入 util 和项目类型
const util = inject('wpsUtil') as any
const projectType = inject('projectType', 'excel') as string

// 根据项目类型定义模板
const templatesByProject: TemplatesByProject = {
  excel: {
    msgTemplate: `
#角色
你是一个专业的航空公司的表格处理专家。
#任务
请基于输入的[选中内容]，根据[用户指令]完成任务；
用户指令：{message}
#输入
选中内容：{selection}
选中范围：{selectionAddress}
#输出
请按要求输出结果。
#约束
1、如果[用户指令]与[选中内容]相关，请基于[选中内容]进行分析；
2、如果不相关，请忽略[选中内容]。`,
    btnTemplate: `
#角色
你是一个专业的航空公司的表格办公专家。
#任务
用户指令：{extraPrompt}
#输入
选中内容：{selection}
选中范围：{selectionAddress}
#输出
请按要求输出结果。`
  },
  ppt: {
    msgTemplate: `
#角色
你是一个专业的演讲稿撰写专家，擅长将信息转换为清晰、有吸引力的演讲内容。
#任务
请基于输入的[选中内容]，根据[用户指令]完成任务；
用户指令：{message}
#输入
选中内容：{selection}
选中范围：{selectionAddress}
#输出
请按要求输出结果。
#约束
1、如果[用户指令]与[选中内容]相关，请基于[选中内容]进行分析；
2、如果不相关，请忽略[选中内容]。`,
    btnTemplate: `
#角色
你是一个专业的演讲稿撰写专家，擅长将信息转换为清晰、有吸引力的演讲内容。
#任务
用户指令：{extraPrompt}
#输入
选中内容：{selection}
选中范围：{selectionAddress}
#输出
请按要求输出结果。`
  },
  word: {
    msgTemplate: `
#角色
你是一个专业的文档撰写专家，擅长整理、分析和改进文档内容。
#任务
请基于输入的[选中内容]，根据[用户指令]完成任务；
用户指令：{message}
#输入
选中内容：{selection}
选中范围：{selectionAddress}
#输出
请按要求输出结果。
#约束
1、如果[用户指令]与[选中内容]相关，请基于[选中内容]进行分析；
2、如果不相关，请忽略[选中内容]。`,
    btnTemplate: `
#角色
你是一个专业的文档撰写专家，擅长整理、分析和改进文档内容。
#任务
用户指令：{extraPrompt}
#输入
选中内容：{selection}
选中范围：{selectionAddress}
#输出
请按要求输出结果。`
  }
}

// 添加模板配置的响应式引用
const promptTemplates = reactive<PromptTemplates>({
  visible: false,
  msgTemplate: templatesByProject[projectType]?.msgTemplate || '',
  btnTemplate: templatesByProject[projectType]?.btnTemplate || ''
})

// 配置 markdown 渲染器
const md = new markdownit({
  html: true,
  breaks: true,
  linkify: true
})
  .use(MermaidIt)

const aiRequest = XRequest({
  ...props.aiRequestConfig,
  dangerouslyApiKey: 'Bearer ' + props.aiRequestConfig.apiKey
})

// 角色配置
const roles = reactive<Roles>({
  user: {
    placement: 'end',
    avatar: { icon: h(UserOutlined) },
    variant: 'filled',
    shape: 'round'
  },
  ai: {
    placement: 'start',
    avatar: { icon: h(RobotOutlined) },
    variant: 'outlined',
    shape: 'round'
  }
})

const copyMessage = async (content: string | ChatItem): Promise<void> => {
  try {
    const text = typeof content === 'string' ? content : JSON.stringify(content)

    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    textArea.style.opacity = '0'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()

    const success = document.execCommand('copy')
    document.body.removeChild(textArea)

    if (success) {
      messageApi.success('已复制到剪贴板')
    } else {
      messageApi.warning('复制失败')
    }
  } catch (err) {
    messageApi.error('复制失败')
  }
}

const regenerateResponse = async (item: ChatItem): Promise<void> => {
  const index = chatItems.value.findIndex(chatItem => chatItem.key === item.key)
  if (index !== -1) {
    chatItems.value.splice(index, 1)
    const previousContent = chatItems.value[index - 1]?.content
    if (previousContent) {
      await generateAIResponse(previousContent)
    }
  }
}

const handleAnalyzeSelection = async (item: Agent): Promise<void> => {
  try {
    const { showedContent, extraPrompt } = item || {}
    const selectionAdress = util.GetSelectionAddress()
    const selection = util.GetSelectionValue()

    if (!selection) {
      messageApi.warning('没有选中任何数据')
      return
    }

    const contentTemplate = promptTemplates.btnTemplate
    const userContent = contentTemplate
      .replace('{extraPrompt}', extraPrompt || '')
      .replace('{selectionAddress}', selectionAdress)
      .replace('{selection}', selection)

    const userMessage: ChatItem = {
      key: Date.now().toString(),
      role: 'user',
      showedContent: `${showedContent}：\n\n${selectionAdress}`,
      content: userContent
    }

    chatItems.value.push(userMessage)
    await generateAIResponse(userMessage.content)

  } catch (error: any) {
    messageApi.error('获取选中数据失败: ' + error.message)
  }
}

// 计算快速操作列表，包含默认和自定义的 agents
const quickActions = computed<Agent[]>(() => {
  return props.agents.map(agent => ({
    ...agent,
    onClick: (item: Agent) => {
      handleAnalyzeSelection(item)
    }
  }))
})

const handleSendMessage = async (): Promise<void> => {
  const messageText = inputValue.value.trim()
  if (!messageText) return

  if (!props.aiRequestConfig.apiKey || !props.aiRequestConfig.model || !props.aiRequestConfig.baseURL) {
    messageApi.error('请配置 API Key、模型和 API 地址')
    return
  }

  const selectionAddress = util.GetSelectionAddress()
  const selection = util.GetSelectionValue()

  let userContent = messageText

  if (selection) {
    userContent = promptTemplates.msgTemplate
      .replace('{message}', messageText)
      .replace('{selectionAddress}', selectionAddress)
      .replace('{selection}', selection)
  }

  const userMessage: ChatItem = {
    key: Date.now().toString(),
    role: 'user',
    showedContent: messageText,
    content: userContent
  }

  chatItems.value.push(userMessage)
  inputValue.value = ''

  await generateAIResponse(userContent)
}

const handleCancelSend = (): void => {
  isLoading.value = false
  messageApi.info('已取消发送')
}

const generateAIResponse = async (userContent?: string): Promise<void> => {
  isLoading.value = true

  const aiMessage: ChatItem = {
    key: (Date.now() + 1).toString(),
    role: 'assistant',
    content: '',
    loading: true
  }

  chatItems.value.push(aiMessage)

  try {
    (window as any).sensorTrack('ai_chat_request_sent')
  } catch (error) {
    console.error(error)
  }

  try {
    const messages = chatItems.value
      .filter(item => (item.role === 'user' || (item.role === 'assistant' && item.content)))
      .map(item => ({
        role: item.role,
        content: item.content
      }))

    await aiRequest.value.create(
      {
        messages,
        stream: true,
        enable_thinking: false,
      },
      {
        onSuccess: (messagesData: any) => {
          console.log('onSuccess', messagesData)

          const index = chatItems.value.findIndex(item => item.key === aiMessage.key)
          if (index !== -1) {
            const finalContent = chatItems.value[index].content
            chatItems.value[index].renderedHtml = md.render(finalContent, { finished: true })
            chatItems.value[index].finished = true
          }
        },
        onError: (error: any) => {
          messageApi.error('生成回复时出错: ' + error.message)
          const index = chatItems.value.findIndex(item => item.key === aiMessage.key)
          if (index !== -1) {
            chatItems.value.splice(index, 1)
          }
        },
        onUpdate: (msg: any) => {
          if (msg.data.endsWith('[DONE]')) return
          const data = JSON.parse(msg.data)
          if (!data || !data.choices || !data.choices.length) return
          const deltaContent = data.choices[0].delta.content
          if (!deltaContent || deltaContent === 'null') return

          const index = chatItems.value.findIndex(item => item.key === aiMessage.key)
          if (index !== -1) {
            const content = chatItems.value[index].content ?? ''
            const newContent = content + (deltaContent ?? '')

            const renderedHtml = md.render(newContent, { finished: false })

            chatItems.value[index] = {
              ...aiMessage,
              content: newContent,
              renderedHtml: renderedHtml,
              loading: false,
              finished: false,
            }
          }
        },
      },
    )
  } catch (error: any) {
    messageApi.error('生成回复时出错')
    const index = chatItems.value.findIndex(item => item.key === aiMessage.key)
    if (index !== -1) {
      chatItems.value.splice(index, 1)
    }
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  const welcomeMessage: ChatItem = {
    key: 'welcome',
    role: 'assistant',
    content: '您好！我是AI助手，很高兴为您服务。请问有什么可以帮助您的吗？',
    typing: { step: 2, interval: 30 }
  }
  chatItems.value.push(welcomeMessage)
  svgImageCopy.install()
})

onUnmounted(() => {
  svgImageCopy.uninstall()
})

// 在组件挂载时将promptTest添加到window全局对象
onMounted(() => {
  if (['localhost', '127.0.0.1'].includes(location.hostname)) {
    (window as any).testPrompt = () => (promptTemplates.visible = true)
  }
})

</script>

<style scoped>
.ai-chat-box {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}

.chat-messages {
  flex: 1;
  min-height: 0;
  padding: 20px;
  padding-bottom: 0px;
}

:deep(.ant-bubble):last-child {
  margin-bottom: 40px;
}

.chat-input {
  position: relative;
}

.quick-actions {
  margin-top: 12px;
  position: absolute;
  top: -50px;
  overflow-x: auto;
  white-space: nowrap;
  width: 100%;
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.2) rgba(0, 0, 0, 0.05);
}

.quick-actions::-webkit-scrollbar {
  height: 6px;
}

.quick-actions::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 3px;
}

.quick-actions::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.quick-actions::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}

.quick-actions .ant-btn {
  margin-right: 8px;
}
</style>
