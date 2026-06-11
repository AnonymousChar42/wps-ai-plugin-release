/**
 * PPT 智能体内部类型定义
 *
 * 包含智能体循环运行时状态、消息格式、
 * LLM 工具调用等内部类型。
 * 通用类型（ChatMessage, ToolSchema 等）已迁移到 @wpsai/shared/agent。
 */

import type { AIRequestConfig } from '@wpsai/shared/types'
import type { AgentStep, AgentResult } from '@wpsai/shared/types/agent'
import type { SlideToolAdapter } from './slide-tool-adapter'

// 重新导出共享类型，方便外部统一从本文件引入
export type { AgentStep, AgentResult }
export type { SlideToolAdapter }

// 从 shared/agent 重新导出通用类型
export type {
  MessageRole,
  ToolCall,
  ChatMessage,
  ToolParameterProperty,
  ToolSchema,
  StreamDelta,
  StreamChoice,
  StreamResponse,
} from '@wpsai/shared/agent/types'

// ============ 智能体内部状态 ============

/** 智能体运行时状态 */
export interface AgentState {
  /** 是否正在运行 */
  isRunning: boolean
  /** 执行步骤列表 */
  steps: AgentStep[]
  /** 当前迭代次数 */
  iteration: number
  /** 对话历史 */
  messages: import('@wpsai/shared/agent/types').ChatMessage[]
  /** 适配器实例 */
  adapter: SlideToolAdapter
  /** AI 配置 */
  aiConfig: AIRequestConfig
}

/** 智能体运行选项 */
export interface AgentRunOptions {
  /** 用户输入的文本内容 */
  inputText: string
  /** 步骤更新回调，每次步骤状态变化时触发 */
  onStepUpdate: (steps: AgentStep[]) => void
  /** 最大迭代次数，默认 999 */
  maxSteps?: number
  /** 取消信号，用户点击停止时触发 */
  abortSignal?: AbortSignal
}
