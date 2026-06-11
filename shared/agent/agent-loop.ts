/**
 * 通用 Agent 循环核心
 *
 * 通过依赖注入解耦具体的 WPS 插件（PPT/Excel/Word）。
 * 所有插件共享同一套消息管理、LLM 调用、上下文压缩逻辑。
 *
 * 设计原则：构造函数接受 AgentLoopConfig，不 import 任何插件专用模块。
 */

import type { AIRequestConfig } from '@wpsai/shared/types'
import type { AgentStep, AgentResult } from '@wpsai/shared/types/agent'
import type { ToolAdapter, ToolResult, DocumentInfo } from './tool-adapter'
import type { ChatMessage, ToolSchema } from './types'
import { StepHistory } from './step-history'
import { getTheme, type Theme } from './themes'

// ========== 默认常量 ==========

/** 默认最大迭代次数 */
const DEFAULT_MAX_STEPS = 999

/** 消息窗口：超过此数触发压缩 */
const MSG_WINDOW = 24

/** 压缩后保留的尾部消息数（assistant+tool 对） */
const KEEP_TAIL = 14

/** 生成唯一步骤 ID */
let stepCounter = 0
function nextStepId(): string {
  return `step_${Date.now()}_${++stepCounter}`
}

// ========== AgentLoop 配置 ==========

/** Agent 运行选项 */
export interface AgentRunOptions {
  /** 用户输入的文本内容 */
  inputText: string
  /** 步骤更新回调 */
  onStepUpdate: (steps: AgentStep[]) => void
  /** 最大迭代次数 */
  maxSteps?: number
  /** 取消信号 */
  abortSignal?: AbortSignal
}

/** AgentLoop 构造函数配置（依赖注入） */
export interface AgentLoopConfig {
  /** 工具适配器 */
  adapter: ToolAdapter
  /** AI API 配置 */
  aiConfig: AIRequestConfig
  /** 主题 key */
  themeKey: string
  /** 构建核心 system prompt */
  buildCorePrompt: (theme: Theme) => string
  /** 构建参考速查表 */
  buildReferenceSummary: (theme: Theme) => string
  /** 构建完整参考（仅首轮注入） */
  buildReferencePrompt: (theme: Theme) => string
  /** 构建工具 schema 列表 */
  buildToolSchemas: () => ToolSchema[]
  /** 执行工具调用 */
  executeTool: (name: string, args: Record<string, unknown>) => Promise<ToolResult>
  /** 生成文档状态摘要字符串（用于初始消息和压缩） */
  buildDocumentSummary: (info: DocumentInfo) => string
  /** 生成工具操作的可读描述 */
  describeAction: (toolName: string, args: Record<string, unknown>) => string
}

// ========== AgentLoop 类 ==========

export class AgentLoop {
  protected config: AgentLoopConfig
  protected messages: ChatMessage[] = []
  protected steps: AgentStep[] = []
  protected toolSchemas: ToolSchema[]
  protected stepHistory: StepHistory
  protected isFirstCall: boolean
  protected cachedCorePrompt: string
  protected cachedRefSummary: string
  protected cachedRefPrompt: string
  protected doneMessage: string | null = null

  constructor(config: AgentLoopConfig) {
    this.config = config
    this.toolSchemas = config.buildToolSchemas()
    this.stepHistory = new StepHistory()
    this.isFirstCall = true

    const theme = getTheme(config.themeKey)
    this.cachedCorePrompt = config.buildCorePrompt(theme)
    this.cachedRefSummary = config.buildReferenceSummary(theme)
    this.cachedRefPrompt = config.buildReferencePrompt(theme)
  }

  // ========== 主循环 ==========

  async run(options: AgentRunOptions): Promise<AgentResult> {
    const abortSignal = options.abortSignal
    const {
      inputText,
      onStepUpdate,
      maxSteps = DEFAULT_MAX_STEPS
    } = options

    // 重置
    this.messages = []
    this.steps = []
    this.stepHistory.reset()
    this.isFirstCall = true
    this.doneMessage = null

    // 获取文档状态
    const info = await this.config.adapter.getDocumentInfo()
    const docSummary = this.config.buildDocumentSummary(info)

    // 构建初始消息
    let sysContent = this.cachedCorePrompt + '\n\n' + this.cachedRefSummary
    if (this.isFirstCall) {
      sysContent += '\n\n' + this.cachedRefPrompt
    }
    this.messages.push({ role: 'system', content: sysContent })
    this.messages.push({
      role: 'user',
      content: `## 任务\n${inputText}\n\n## 当前文档状态\n${docSummary}`
    })

    this.addStep('正在分析输入内容，规划结构...', 'running')
    this.notify(onStepUpdate)

    let firstToolExecuted = false

    // 主循环
    for (let i = 0; i < maxSteps; i++) {
      if (abortSignal?.aborted) {
        this.addStep('用户手动停止', 'error')
        this.notify(onStepUpdate)
        return this.buildResult()
      }

      // 窗口压缩
      this.maybeCompress()

      // 调用 LLM
      const response = await this.callLLM(abortSignal)

      if (!firstToolExecuted && response.toolCalls.length > 0) {
        this.updateFirstStep('done')
        firstToolExecuted = true
        this.notify(onStepUpdate)
      }

      // 构建 assistant 消息
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: null,
        tool_calls: response.toolCalls.map((tc, j) => ({
          id: `call_${i}_${j}`,
          type: 'function' as const,
          function: {
            name: tc.toolName,
            arguments: JSON.stringify(tc.toolArgs)
          }
        }))
      }
      if (response.reasoningContent !== undefined) {
        assistantMsg.reasoning_content = response.reasoningContent
      }
      this.messages.push(assistantMsg)

      // 批量执行工具调用
      const stepToolNames: string[] = []
      const stepResults: string[] = []
      let allSuccess = true

      for (let j = 0; j < response.toolCalls.length; j++) {
        const tc = response.toolCalls[j]

        if (tc.toolName === 'done') {
          this.updateFirstStep('done')
          await this.handleDone(tc.toolArgs)
          this.notify(onStepUpdate)
          return this.buildResult()
        }

        const stepDesc = this.config.describeAction(tc.toolName, tc.toolArgs)
        this.addStep(stepDesc, 'running')
        this.notify(onStepUpdate)

        const result = await this.config.executeTool(tc.toolName, tc.toolArgs)
        stepToolNames.push(tc.toolName)
        stepResults.push(result.message)
        if (!result.success) allSuccess = false

        // 打印喂给 LLM 的完整 tool 消息内容
        const toolMsg = result.message.length > 500
          ? result.message.slice(0, 500) + `...(${result.message.length}字)`
          : result.message
        console.log(`[AgentLoop] → LLM tool消息 [${tc.toolName}]:\n${toolMsg}`)

        this.messages.push({
          role: 'tool',
          content: result.message,
          tool_call_id: `call_${i}_${j}`
        })

        this.updateLastStep(stepDesc, result.success ? 'done' : 'error', result.success ? undefined : result.message)
        this.notify(onStepUpdate)
      }

      // 记录到 StepHistory
      this.stepHistory.push({
        index: this.stepHistory.count + 1,
        description: stepToolNames.length === 1
          ? stepToolNames[0]
          : `${stepToolNames.length}个工具`,
        toolNames: stepToolNames,
        resultSummary: stepResults.join('; ').slice(0, 100),
        success: allSuccess
      })

      this.isFirstCall = false
    }

    this.addStep('已达到最大执行步骤，任务中止。', 'error')
    this.notify(onStepUpdate)
    return this.buildResult()
  }

  // ========== 窗口压缩 ==========

  protected async maybeCompress(): Promise<void> {
    if (this.messages.length <= MSG_WINDOW) return

    const info = await this.config.adapter.getDocumentInfo()
    const docSummary = this.config.buildDocumentSummary(info)

    let tailStart = this.messages.length - KEEP_TAIL
    if (tailStart < 2) tailStart = 2

    while (tailStart > 2 && this.messages[tailStart]?.role === 'tool') {
      tailStart--
    }
    while (tailStart > 2 && this.messages[tailStart]?.role !== 'assistant') {
      tailStart--
    }

    const tail = this.messages.slice(tailStart)
    const removed = tailStart - 2

    let sysContent = this.cachedCorePrompt + '\n\n' + this.cachedRefSummary
    if (this.isFirstCall) {
      sysContent += '\n\n' + this.cachedRefPrompt
    }

    const compressed: ChatMessage[] = [
      { role: 'system', content: sysContent },
      this.messages[1],
      {
        role: 'system',
        content: `[上下文压缩] 以上 ${removed} 条历史工具调用已省略。` +
          `当前文档状态：${docSummary}\n` +
          this.stepHistory.toPrompt(6)
      },
      ...tail
    ]

    this.messages = compressed
  }

  // ========== LLM 调用 ==========

  protected async callLLM(
    abortSignal?: AbortSignal
  ): Promise<{ toolCalls: Array<{ toolName: string; toolArgs: Record<string, unknown> }>; reasoningContent?: string }> {
    const config = this.config.aiConfig
    const baseUrl = config.baseURL.replace(/\/+$/, '')
    const url = baseUrl.endsWith('/chat/completions')
      ? baseUrl
      : `${baseUrl}/chat/completions`

    const requestBody: Record<string, unknown> = {
      model: config.model,
      messages: this.messages.map(m => {
        const msg: Record<string, unknown> = { role: m.role }
        if (m.content !== undefined && m.content !== null) msg.content = m.content
        if (m.reasoning_content !== undefined) msg.reasoning_content = m.reasoning_content
        if (m.tool_calls) msg.tool_calls = m.tool_calls
        if (m.tool_call_id) msg.tool_call_id = m.tool_call_id
        return msg
      }),
      tools: this.toolSchemas,
      tool_choice: 'auto',
      temperature: 0.3,
      stream: false,
      enable_thinking: false
    }

    const response = await fetch(url, {
      method: 'POST',
      signal: abortSignal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => '未知错误')
      throw new Error(`LLM API 调用失败 (${response.status}): ${errorText}`)
    }

    const data = await response.json() as any
    const choice = data.choices?.[0]
    if (!choice) throw new Error('LLM 返回了空的响应')

    const reasoningContent = choice.message?.reasoning_content ?? undefined
    const toolCalls = choice.message?.tool_calls
    if (toolCalls && toolCalls.length > 0) {
      return {
        toolCalls: toolCalls.map((tc: any) => ({
          toolName: tc.function.name,
          toolArgs: (() => { try { return JSON.parse(tc.function.arguments) } catch { return {} } })()
        })),
        reasoningContent
      }
    }

    return {
      toolCalls: [{ toolName: 'done', toolArgs: { message: choice.message?.content || '完成', success: true } }],
      reasoningContent
    }
  }

  // ========== 辅助方法 ==========

  protected async handleDone(args: Record<string, unknown>): Promise<void> {
    const message = args.message as string || '任务完成'
    const success = args.success !== false
    this.addStep(success ? '✅ 生成完成' : '❌ 生成中止', success ? 'done' : 'error')
    this.doneMessage = message
  }

  protected updateFirstStep(status: AgentStep['status']): void {
    const first = this.steps[0]
    if (first && first.status === 'running') first.status = status
  }

  protected addStep(description: string, status: AgentStep['status']): void {
    this.steps.push({ id: nextStepId(), description, status })
  }

  protected updateLastStep(description: string, status: AgentStep['status'], error?: string): void {
    const last = this.steps[this.steps.length - 1]
    if (last) { last.description = description; last.status = status; if (error) last.error = error }
  }

  protected notify(onStepUpdate: (steps: AgentStep[]) => void): void {
    onStepUpdate([...this.steps])
  }

  protected buildResult(): AgentResult {
    const summary = this.doneMessage
      || this.steps.find(s => s.description.startsWith('✅') || s.description.startsWith('❌'))?.description
      || '任务结束'
    return { summary, success: this.steps.every(s => s.status !== 'error'), steps: [...this.steps], slideCount: 0 }
  }
}
