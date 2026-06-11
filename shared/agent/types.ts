/**
 * 通用 Agent 类型定义
 *
 * 包含 OpenAI 兼容的消息格式、工具 Schema、流式响应类型。
 * 这些类型不依赖任何 WPS 插件（PPT/Excel/Word），可被所有插件复用。
 */

// ============ 消息相关类型（OpenAI 格式） ============

/** 消息角色 */
export type MessageRole = 'system' | 'user' | 'assistant' | 'tool'

/** 工具调用 */
export interface ToolCall {
  /** 工具调用 ID */
  id: string
  /** 固定为 'function' */
  type: 'function'
  /** 函数调用详情 */
  function: {
    /** 工具名称 */
    name: string
    /** JSON 字符串形式的参数 */
    arguments: string
  }
}

/** 对话消息 */
export interface ChatMessage {
  role: MessageRole
  content?: string | null
  tool_calls?: ToolCall[]
  tool_call_id?: string
  name?: string
  /** DeepSeek thinking 模式要求原样传回 */
  reasoning_content?: string
}

// ============ 工具 Schema 相关类型（OpenAI 格式） ============

/** 工具参数属性定义 */
export interface ToolParameterProperty {
  type: string
  description: string
  enum?: string[]
  /** 嵌套数组/对象的 items 定义 */
  items?: Record<string, unknown>
  /** 嵌套对象的 properties 定义 */
  properties?: Record<string, ToolParameterProperty>
  /** 嵌套对象的 required 字段 */
  required?: string[]
}

/** 工具 Schema 定义 */
export interface ToolSchema {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, ToolParameterProperty>
      required: string[]
    }
  }
}

// ============ LLM 响应相关类型 ============

/** LLM 流式响应增量 */
export interface StreamDelta {
  content?: string
  tool_calls?: Array<{
    index: number
    id?: string
    function?: {
      name?: string
      arguments?: string
    }
  }>
}

/** LLM 流式响应选项 */
export interface StreamChoice {
  index: number
  delta: StreamDelta
  finish_reason: string | null
}

/** LLM 流式响应数据 */
export interface StreamResponse {
  choices: StreamChoice[]
}
