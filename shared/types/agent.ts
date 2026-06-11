/**
 * PPT 智能体相关的类型定义
 * 扩展 shared/types/index.ts 中已有的基础类型
 */
import type { Agent, AIRequestConfig } from '@wpsai/shared/types'

// ============ 工具相关类型 ============

/** PPT 智能体可调用的工具定义 */
export interface PptTool {
  /** 工具名称，LLM 据此选择调用 */
  name: string
  /** 工具功能描述，LLM 据此判断何时使用 */
  description: string
  /** JSON Schema 参数定义 */
  parameters: Record<string, unknown>
  /** 执行工具，调用对应的适配器方法 */
  execute: (args: Record<string, unknown>) => Promise<PptToolResult>
}

/** 工具执行结果 */
export interface PptToolResult {
  /** 是否执行成功 */
  success: boolean
  /** 给 LLM 看的结果描述消息 */
  message: string
  /** 可选的附加数据 */
  data?: unknown
}

// ============ 智能体步骤相关类型 ============

/** 智能体进度展示中的单个步骤 */
export interface AgentStep {
  /** 步骤唯一标识 */
  id: string
  /** 步骤描述文本，展示给用户 */
  description: string
  /** 步骤当前状态 */
  status: 'pending' | 'running' | 'done' | 'error'
  /** 错误信息（仅 status 为 error 时有值） */
  error?: string
}

// ============ 智能体配置相关类型 ============

/** AgentPane 组件的 props */
export interface AgentPaneProps {
  /** 运行模式：browser（内存 mock）或 wps（真实 WPSJS） */
  mode?: 'browser' | 'wps'
}

/** 智能体运行配置 */
export interface AgentConfig {
  /** AI API 请求配置 */
  aiConfig: AIRequestConfig
  /** 最大迭代次数，默认 20 */
  maxSteps?: number
}

/** 智能体运行结果 */
export interface AgentResult {
  /** 最终摘要文本 */
  summary: string
  /** 是否成功完成 */
  success: boolean
  /** 执行的全部步骤记录 */
  steps: AgentStep[]
  /** 创建的幻灯片数量 */
  slideCount: number
}
