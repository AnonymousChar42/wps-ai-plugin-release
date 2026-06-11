/**
 * PPT 智能体模块 — 统一导出
 *
 * 外部只需从此文件导入即可使用全部智能体功能。
 *
 * 使用示例：
 * ```typescript
 * import { PptAgentLoop, WpsSlideAdapter, BrowserSlideAdapter, buildToolSchemas } from './agent'
 * ```
 */

// 核心智能体循环
export { PptAgentLoop } from './agent-loop'

// 工具系统
export { buildToolSchemas, executeTool } from './tools'

// 提示词
export { buildSystemPrompt, buildUserMessage } from './prompts'

// 适配器
export { WpsSlideAdapter } from './adapters/wps-slide-adapter'
export { BrowserSlideAdapter } from './adapters/browser-slide-adapter'

// 排版规范
export * as LayoutRules from './layout-rules'

// 主题
export { THEMES, DEFAULT_THEME, getTheme, themeToPrompt } from '@wpsai/shared/agent/themes'
export type { Theme } from '@wpsai/shared/agent/themes'

// Composables
export { createAgentState } from './composables/useAgent'
export type { AgentStateManager } from './composables/useAgent'
export type { AgentState as AgentRunState } from './composables/useAgent'

// 类型（重新导出常用类型）
export type {
  SlideToolAdapter,
  SlideInfo,
  CreateSlideParams,
  AddTextBoxParams
} from './slide-tool-adapter'

export type {
  AgentStep,
  AgentResult,
  PptToolResult,
  AgentConfig,
  AgentPaneProps
} from '@wpsai/shared/types/agent'

export type {
  ChatMessage,
  ToolSchema,
  AgentState,
  AgentRunOptions
} from './types'
