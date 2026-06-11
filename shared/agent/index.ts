/**
 * @wpsai/shared/agent — 通用 Agent 核心
 *
 * 所有 WPS 插件（PPT/Excel/Word）共享的 agent 基础设施。
 */

// 类型
export type {
  MessageRole,
  ToolCall,
  ChatMessage,
  ToolParameterProperty,
  ToolSchema,
  StreamDelta,
  StreamChoice,
  StreamResponse,
} from './types'

// 工具适配器
export type { ToolAdapter, ToolResult, DocumentInfo } from './tool-adapter'

// 步骤历史
export type { StepRecord } from './step-history'
export { StepHistory } from './step-history'

// 主题
export type { Theme } from './themes'
export { THEMES, DEFAULT_THEME, getTheme, themeToPrompt } from './themes'

// 工具函数
export { clampMsg, MAX_MSG_LENGTH } from './tool-utils'

// Agent 循环
export type { AgentLoopConfig, AgentRunOptions } from './agent-loop'
export { AgentLoop } from './agent-loop'
